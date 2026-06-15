/**
 * Supabase Edge Function — AI proxy for Anthropic Claude API.
 *
 * Keeps the API key server-side and adds authentication, rate limiting,
 * input validation, and standardised error responses.
 *
 * Deploy (JWT verification ON — do NOT use --no-verify-jwt):
 *   supabase functions deploy ai-proxy
 *
 * NB: Supabase's gateway "verify_jwt" only checks that the token is validly
 * signed — the anon key is itself a valid JWT, so it would pass. To require a
 * real *user* we additionally verify the bearer token against /auth/v1/user
 * below and reject anon / missing tokens. This is what stops anonymous abuse
 * of the (paid) Anthropic key.
 *
 * Secrets:
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 *   # optional, comma-separated allowlist of browser origins (CORS):
 *   supabase secrets set ALLOWED_ORIGINS=https://<user>.github.io
 *
 * SUPABASE_URL and SUPABASE_ANON_KEY are injected automatically.
 *
 * The function expects a JSON body with:
 *   { system: string, user: string, maxTokens?: number }
 * and returns:
 *   { text: string }
 */

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS_LIMIT = 4096
const MAX_INPUT_LENGTH = 10_000

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

// CORS: reflect the request origin only if it is in the allowlist.
// If ALLOWED_ORIGINS is unset we fall back to '*' (backward compatible) but
// you should set it to your app origin in production.
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',').map(s => s.trim()).filter(Boolean)

function corsHeaders(origin: string | null): Record<string, string> {
  let allowOrigin = '*'
  if (ALLOWED_ORIGINS.length > 0) {
    allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  }
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

/** Simple in-memory rate limiter (per-function instance, keyed by user id).
 *  NB: state is per-instance and resets on cold start — for hard guarantees
 *  back this with a durable store (Postgres/Upstash). */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 20

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  entry.count++
  return entry.count <= RATE_LIMIT_MAX
}

/** Resolve the authenticated user from the Authorization bearer token.
 *  Returns the user id, or null if the token is missing / anon / invalid. */
async function getUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  if (!token || token === SUPABASE_ANON_KEY) return null   // reject the anon key
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    })
    if (!res.ok) return null
    const u = await res.json()
    return u?.id ?? null
  } catch {
    return null
  }
}

function jsonResponse(body: Record<string, unknown>, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('origin'))

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, cors)
  }

  // ── Require an authenticated user ──
  const userId = await getUserId(req.headers.get('authorization'))
  if (!userId) {
    return jsonResponse({ error: 'Unauthorized' }, 401, cors)
  }

  // Rate limit per authenticated user
  if (!checkRateLimit(userId)) {
    return jsonResponse({ error: 'Rate limit exceeded. Try again in a minute.' }, 429, cors)
  }

  // Validate API key is configured
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set')
    return jsonResponse({ error: 'AI service is not configured' }, 503, cors)
  }

  // Parse and validate input
  let body: { system?: string; user?: string; maxTokens?: number }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, cors)
  }

  const { system, user, maxTokens } = body

  if (!system || typeof system !== 'string') {
    return jsonResponse({ error: 'Missing or invalid "system" field' }, 400, cors)
  }
  if (!user || typeof user !== 'string') {
    return jsonResponse({ error: 'Missing or invalid "user" field' }, 400, cors)
  }
  if (system.length > MAX_INPUT_LENGTH || user.length > MAX_INPUT_LENGTH) {
    return jsonResponse({ error: `Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters` }, 400, cors)
  }

  const resolvedMaxTokens = Math.min(
    typeof maxTokens === 'number' && maxTokens > 0 ? maxTokens : 1000,
    MAX_TOKENS_LIMIT
  )

  // Call Anthropic API
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: resolvedMaxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const errText = await response.text()
      console.error(`Anthropic API error ${response.status}: ${errText}`)

      // Don't leak Anthropic error details to the client
      const clientMessage = response.status === 429
        ? 'AI service is temporarily overloaded. Please try again.'
        : 'AI request failed. Please try again later.'

      return jsonResponse({ error: clientMessage }, 502, cors)
    }

    const data = await response.json()
    const text = data.content?.[0]?.text ?? ''

    return jsonResponse({ text }, 200, cors)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error('Anthropic API request timed out')
      return jsonResponse({ error: 'AI request timed out. Please try again.' }, 504, cors)
    }
    console.error('Unexpected AI proxy error:', err)
    return jsonResponse({ error: 'Internal server error' }, 500, cors)
  }
})
