import { useOrgUsers } from '@/context/OrgUsersCtx'
import { getInitials } from '@/utils/initials'

export default function Avatar({ name, size = 26, showName = false }) {
  const users = useOrgUsers()
  const user = users.find(u => u.name === name)
  const color = user?.color ?? '#888'
  const initials = getInitials(name)

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
      {showName && <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{name}</span>}
    </div>
  )
}
