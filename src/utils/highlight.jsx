/**
 * Highlight occurrences of `query` inside `text`.
 * Returns a React fragment with <mark> elements, or plain text if no match.
 *
 * Lives in a .jsx file because it returns JSX.
 */
export function highlight(text, query) {
  if (!query || !text) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}
