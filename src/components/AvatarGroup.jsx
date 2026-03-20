import { useOrgUsers } from '@/context/OrgUsersCtx'

export default function AvatarGroup({ names = [], size = 24 }) {
  const users = useOrgUsers()
  return (
    <div style={{ display: 'flex' }}>
      {names.slice(0, 4).map((name, i) => {
        const color = users.find(u => u.name === name)?.color ?? '#888'
        return (
          <div key={name} title={name} style={{ marginLeft: i ? -7 : 0, zIndex: names.length - i }}>
            <div style={{
              width: size, height: size, borderRadius: '50%',
              background: color + '22', color,
              fontSize: size * 0.38, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--bg1)',
            }}>
              {name.slice(0, 2).toUpperCase()}
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
