import { useLang } from '@/i18n'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import { isOverdue } from '@/utils/filters'
import Avatar from '@/components/Avatar'

export default function PeopleView({ tasks, projects }) {
  const t = useLang()
  const USERS = useOrgUsers()

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--tx1)', marginBottom: 4 }}>{t.people}</div>
      <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 20 }}>{t.teamMembers(USERS.length)}</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {USERS.map(u => {
          const userTasks = tasks.filter(task => task.who === u.name)
          const open      = userTasks.filter(task => !task.done)
          const od        = open.filter(task => isOverdue(task.due))
          const userProjs = [...new Set(userTasks.map(task => task.pid))]
            .map(id => projects.find(p => p.id === id))
            .filter(Boolean)

          return (
            <div key={u.id} style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', boxShadow: 'var(--shadow-sm)', padding: 16 }}>
              {/* User header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: u.color + '28', color: u.color, fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {u.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--tx1)' }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{u.email}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--tx3)', background: 'var(--bg2)', padding: '2px 7px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)' }}>{u.role}</span>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
                {[
                  [t.openTasks,    open.length,                          'var(--tx2)'],
                  [t.overdueLabel, od.length,                            od.length ? 'var(--c-danger)' : 'var(--tx3)'],
                  [t.completed,    userTasks.filter(task => task.done).length, 'var(--c-success)'],
                ].map(([label, value, color]) => (
                  <div key={label} style={{ background: 'var(--bg2)', borderRadius: 'var(--r1)', padding: '6px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 500, color, lineHeight: 1, marginBottom: 2 }}>{value}</div>
                    <div style={{ fontSize: 10, color: 'var(--tx3)' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Projects */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.projects}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {userProjs.map(p => (
                    <span key={p.id} style={{ fontSize: 11, color: p.color, background: p.color + '18', padding: '2px 6px', borderRadius: 'var(--r1)', fontWeight: 500 }}>{p.name}</span>
                  ))}
                  {userProjs.length === 0 && <span style={{ fontSize: 12, color: 'var(--tx3)' }}>—</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
