import { useOrgUsers } from '@/context/OrgUsersCtx'
import { getInitials } from '@/utils/initials'

export default function AvatarGroup({ names = [], size = 24 }) {
  const users = useOrgUsers()
  return (
    <div style={{ display: 'flex' }}>
      {names.slice(0, 4).map((name, i) => {
        const color = users.find(u => u.name === name)?.color ?? '#888'
        const initials = getInitials(name)
        return (
          <div key={name} title={name} style={{ marginLeft: i ? -7 : 0, zIndex: names.length - i }}>
            <div style={{
              width: size, height: size, borderRadius: '50%',
              background: color + '22', color,
              fontSize: size * (initials.length > 2 ? 0.32 : 0.38), fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--bg1)',
            }}>
              {initials}
            </div>
          </div>
        )
      })}
      {names.length > 4 && (
        <div style={{
          marginLeft: -7, width: size, height: size, borderRadius: '50%',
          background: 'var(--bg2)', color: 'var(--tx3)',
          fontSize: size * 0.38, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid var(--bg1)',
        }}>
          +{names.length - 4}
        </div>
      )}
    </div>
  )
}
