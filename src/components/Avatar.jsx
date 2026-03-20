import { useOrgUsers } from '@/context/OrgUsersCtx'

export default function Avatar({ name, size = 26, showName = false }) {
  const users = useOrgUsers()
  const user = users.find(u => u.name === name)
  const color = user?.color ?? '#888'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: color + '22', color,
        fontSize: size * 0.38, fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, letterSpacing: '-0.02em',
      }}>
        {(name ?? '?').slice(0, 2).toUpperCase()}
      </div>
      {showName && <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{name}</span>}
    </div>
  )
}
