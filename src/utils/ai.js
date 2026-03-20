/**
 * Thin wrapper around the Anthropic API.
 *
 * ⚠️  SECURITY NOTE
 * Calling api.anthropic.com directly from the browser exposes your API key
 * in the network tab. This is acceptable for local/offline use (python3 -m http.server)
 * but MUST be replaced with a backend proxy before any public deployment.
 *
 * TODO: replace ANTHROPIC_API_KEY with a call to your Cloudflare Worker proxy:
 *   const res = await fetch('https://your-worker.workers.dev/ai', { ... })
 */

const MODEL = 'claude-sonnet-4-20250514'

/**
 * Call the Anthropic messages API.
 * @param {string} system  System prompt
 * @param {string} user    User message
 * @param {number} maxTokens
 * @returns {Promise<string>} The assistant's text response
 */
export async function callAI(system, user, maxTokens = 1000) {
  // In production: point this to your Cloudflare Worker proxy instead
  const endpoint = 'https://api.anthropic.com/v1/messages'

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`AI API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text ?? ''
  return text
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
