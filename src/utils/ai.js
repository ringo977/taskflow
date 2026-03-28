/**
 * AI utility — thin client for the Supabase Edge Function proxy.
 *
 * All AI calls go through VITE_AI_PROXY_URL, which points to the
 * `ai-proxy` Edge Function. No API keys are stored or sent from the browser.
 *
 * If the proxy is not configured (VITE_AI_PROXY_URL is empty), every
 * function returns a graceful fallback so the UI never breaks.
 */

const AI_PROXY_URL = import.meta.env.VITE_AI_PROXY_URL || ''

// ── Error classification ────────────────────────────────────────

/**
 * Structured AI error with a machine-readable `code` for UI branching.
 *
 * Codes:
 *   NOT_CONFIGURED  - proxy URL is empty / missing
 *   NETWORK         - fetch threw (offline, DNS, CORS)
 *   TIMEOUT         - 408 or proxy 504/Gateway Timeout
 *   RATE_LIMIT      - 429 Too Many Requests
 *   AUTH            - 401/403 from proxy or provider
 *   PROVIDER        - 5xx from the upstream AI provider
 *   PARSE           - response body was not valid JSON
 *   UNKNOWN         - anything else
 */
export class AIError extends Error {
  /** @param {string} message @param {string} code @param {number|null} status */
  constructor(message, code, status = null) {
    super(message)
    this.name = 'AIError'
    this.code = code
    this.status = status
  }
}

function classifyStatus(status, serverMsg) {
  if (status === 408 || status === 504) return 'TIMEOUT'
  if (status === 429) return 'RATE_LIMIT'
  if (status === 401 || status === 403) return 'AUTH'
  if (status >= 500) return 'PROVIDER'
  return 'UNKNOWN'
}

// ── Public helpers ──────────────────────────────────────────────

/** True when the AI proxy is configured and available */
export const isAIEnabled = () => Boolean(AI_PROXY_URL)

/** User-friendly message keyed by error code (IT). */
export const AI_ERROR_MESSAGES = {
  NOT_CONFIGURED: 'Le funzioni AI non sono disponibili — proxy non configurato.',
  NETWORK: 'Impossibile raggiungere il servizio AI. Controlla la connessione.',
  TIMEOUT: 'La richiesta AI è scaduta — riprova tra qualche secondo.',
  RATE_LIMIT: 'Troppe richieste AI — attendi un momento e riprova.',
  AUTH: 'Errore di autenticazione con il servizio AI.',
  PROVIDER: 'Il provider AI ha restituito un errore — riprova più tardi.',
  PARSE: 'Risposta AI non valida — riprova.',
  UNKNOWN: 'Errore AI imprevisto.',
}

/**
 * Call the AI proxy with structured error handling.
 * @param {string} system  System prompt
 * @param {string} user    User message
 * @param {number} maxTokens
 * @returns {Promise<string>} The assistant's text response
 * @throws {AIError} with a categorised `code`
 */
export async function callAI(system, user, maxTokens = 1000) {
  if (!AI_PROXY_URL) {
    throw new AIError(AI_ERROR_MESSAGES.NOT_CONFIGURED, 'NOT_CONFIGURED')
  }

  let response
  try {
    response = await fetch(AI_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, user, maxTokens }),
    })
  } catch (_err) {
    throw new AIError(AI_ERROR_MESSAGES.NETWORK, 'NETWORK')
  }

  if (!response.ok) {
    let serverMsg = ''
    try {
      const body = await response.json()
      if (body.error) serverMsg = body.error
    } catch { /* ignore parse errors */ }

    const code = classifyStatus(response.status, serverMsg)
    const friendlyMsg = AI_ERROR_MESSAGES[code] || serverMsg || `AI request failed (${response.status})`
    throw new AIError(friendlyMsg, code, response.status)
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new AIError(AI_ERROR_MESSAGES.PARSE, 'PARSE')
  }

  return data.text ?? ''
}

// ── Domain helpers ──────────────────────────────────────────────

/** Generate 3-5 subtasks for a given task */
export async function generateSubtasks(task) {
  const raw = await callAI(
    'Return ONLY a JSON array of 3-5 short subtask strings. No markdown, no explanation.',
    `Generate subtasks for: "${task.title}". Context: ${task.desc || 'none'}`
  )
  try {
    return JSON.parse(raw.trim())
  } catch {
    throw new AIError(AI_ERROR_MESSAGES.PARSE, 'PARSE')
  }
}

/** Create a task object from a natural-language description */
export async function createTaskFromText(input) {
  const raw = await callAI(
    'Extract task info. Return ONLY JSON: {"title":"...","desc":"...","pri":"high|medium|low","subs":[]}. No markdown.',
    `Extract task from: "${input}"`
  )
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    throw new AIError(AI_ERROR_MESSAGES.PARSE, 'PARSE')
  }
}

/** Summarise the status of a project's tasks */
export async function summariseProject(projectName, tasks, lang = 'it') {
  const list = tasks
    .map(t => `- ${t.title} [${t.sec}] ${t.done ? '✓' : '○'} pri:${t.pri} due:${t.due || 'n/a'}`)
    .join('\n')

  const system = lang === 'en'
    ? 'You are a PM assistant. Write a concise project status summary in English (3-4 sentences). Highlight high priority items, upcoming deadlines, and next actions.'
    : 'Sei un PM assistant. Scrivi un riepilogo conciso in italiano (3-4 frasi). Evidenzia priorità alta, scadenze imminenti e prossime azioni.'

  return callAI(system, `Project: ${projectName}\nToday: ${new Date().toISOString().slice(0, 10)}\n${list}`)
}
