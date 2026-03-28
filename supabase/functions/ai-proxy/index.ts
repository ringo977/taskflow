/**
 * Supabase Edge Function — AI proxy for Anthropic Claude API.
 *
 * Keeps the API key server-side and adds rate limiting, input validation,
 * and standardised error responses.
 *
 * Deploy:
 *   supabase functions deploy ai-proxy --no-verify-jwt
 *
 * Set secret:
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 *
 * The function expects a JSON body with:
 *   { system: string, user: string, maxTokens?: number }
 *
 * It returns the assistant's text response as:
 *   { text: string }
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS_LIMIT = 4096
const MAX_INPUT_LENGTH = 10_000

/** Simple in-memory rate limiter (per-function instance) */
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

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  // Rate limit by IP (falls back to 'unknown' if header missing)
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(clientIp)) {
    return jsonResponse({ error: 'Rate limit exceeded. Try again in a minute.' }, 429)
  }

  // Validate API key is configured
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set')
    return jsonResponse({ error: 'AI service is not configured' }, 503)
  }

  // Parse and validate input
  let body: { system?: string; user?: string; maxTokens?: number }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { system, user, maxTokens } = body

  if (!system || typeof system !== 'string') {
    return jsonResponse({ error: 'Missing or invalid "system" field' }, 400)
  }
  if (!user || typeof user !== 'string') {
    return jsonResponse({ error: 'Missing or invalid "user" field' }, 400)
  }
  if (system.length > MAX_INPUT_LENGTH || user.length > MAX_INPUT_LENGTH) {
    return jsonResponse({ error: `Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters` }, 400)
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

      return jsonResponse({ error: clientMessage }, 502)
    }

    const data = await response.json()
    const text = data.content?.[0]?.text ?? ''

    return jsonResponse({ text })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error('Anthropic API request timed out')
      return jsonResponse({ error: 'AI request timed out. Please try again.' }, 504)
    }
    console.error('Unexpected AI proxy error:', err)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
