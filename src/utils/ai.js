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

/** True when the AI proxy is configured and available */
export const isAIEnabled = () => Boolean(AI_PROXY_URL)

/**
 * Call the AI proxy.
 * @param {string} system  System prompt
 * @param {string} user    User message
 * @param {number} maxTokens
 * @returns {Promise<string>} The assistant's text response
 * @throws {Error} with a user-friendly message
 */
export async function callAI(system, user, maxTokens = 1000) {
  if (!AI_PROXY_URL) {
    throw new Error('AI features are not available — proxy is not configured.')
  }

  let response
  try {
    response = await fetch(AI_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, user, maxTokens }),
    })
  } catch (err) {
    throw new Error('Cannot reach the AI service. Check your connection and try again.')
  }

  if (!response.ok) {
    let message = `AI request failed (${response.status})`
    try {
      const body = await response.json()
      if (body.error) message = body.error
    } catch { /* ignore parse errors */ }
    throw new Error(message)
  }

  const data = await response.json()
  return data.text ?? ''
}

/** Generate 3-5 subtasks for a given task */
export async function generateSubtasks(task) {
  const raw = await callAI(
    'Return ONLY a JSON array of 3-5 short subtask strings. No markdown, no explanation.',
    `Generate subtasks for: "${task.title}". Context: ${task.desc || 'none'}`
  )
  return JSON.parse(raw.trim())
}

/** Create a task object from a natural-language description */
export async function createTaskFromText(input) {
  const raw = await callAI(
    'Extract task info. Return ONLY JSON: {"title":"...","desc":"...","pri":"high|medium|low","subs":[]}. No markdown.',
    `Extract task from: "${input}"`
  )
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
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
