export function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1].slice(0, 2)).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}
