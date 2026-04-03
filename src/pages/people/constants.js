export const ROLES = ['admin', 'manager', 'member', 'guest']

export const ROLE_COLORS = {
  admin: 'var(--c-danger)',
  manager: 'var(--c-warning)',
  member: 'var(--accent)',
  guest: 'var(--tx3)',
}

export const isUUID = id =>
  typeof id === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

export const SORT_ARROW = { asc: '▲', desc: '▼' }

/** Split "First Last" → { first, last }. Last word = last name. */
export function splitName(fullName) {
  const parts = (fullName ?? '').trim().split(/\s+/)
  if (parts.length <= 1) return { first: parts[0] || '', last: '' }
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] }
}
