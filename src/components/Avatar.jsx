import { useOrgUsers } from '@/context/OrgUsersCtx'
import { getInitials } from '@/utils/initials'

export default function Avatar({ name, size = 26, showName = false }) {
  const users = useOrgUsers()
  // task.who can be string | null | undefined | string[] depending on source
  // (Supabase persistence vs. seed data). Normalise to a single string, and
  // render nothing when there is no actual assignee — callers that want an
  // explicit empty-state (e.g. a neutral dot in Recent Activity widgets)
  // should handle the falsy case themselves with a ternary.
  const resolvedName = Array.isArray(name) ? name[0] : name
  if (!resolvedName || typeof resolvedName !== 'string') return null
  const user = users.find(u => u.name === resolvedName)
  const color = user?.color ?? '#888'
  const initials = getInitials(resolvedName)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: color + '22', color,
        fontSize: size * (initials.length > 2 ? 0.32 : 0.38), fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, letterSpacing: '-0.02em',
      }}>
        {initials}
      </div>
      {showName && <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{resolvedName}</span>}
    </div>
  )
}
