/**
 * Date and string utilities — pure JS, no JSX.
 * highlight() (which uses JSX) lives in highlight.jsx
 */

/**
 * Format a YYYY-MM-DD string to a human-readable date.
 */
export function fmtDate(dateStr, lang = 'it') {
  if (!dateStr) return ''
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(
    lang === 'en' ? 'en-GB' : 'it-IT',
    { day: '2-digit', month: 'short' }
  )
}

/** Today as YYYY-MM-DD */
export const todayStr = () => new Date().toISOString().slice(0, 10)

/** YYYY-MM-DD of today + n days */
export const futureDateStr = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
