import { isOverdue } from '@/utils/filters'
import { getInitials } from '@/utils/initials'
import RoleBadge from './RoleBadge'

export default function MemberCard({ u, userTasks, projects, t }) {
  const open = userTasks.filter(task => !task.done)
  const od = open.filter(task => isOverdue(task.due))
  const done = userTasks.filter(task => task.done)
  const userProjs = [...new Set(userTasks.map(task => task.pid))]
    .map(id => projects.find(p => p.id === id))
    .filter(Boolean)

  return (
    <div style={{
      background: 'var(--bg1)',
      borderRadius: 'var(--r2)',
      border: '1px solid var(--bd3)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
    }}>
      <div style={{
        background: u.color + '14',
        padding: '16px 18px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: u.color,
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 6px ' + u.color + '40',
        }}>
          {getInitials(u.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--tx1)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {u.name}
          </div>
          <div style={{
            fontSize: 12,
            color: 'var(--tx3)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {u.email}
          </div>
        </div>
        <RoleBadge role={u.role} />
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 1,
        background: 'var(--bd3)',
      }}>
        {[
          [t.openTasks, open.length, 'var(--tx1)'],
          [t.overdueLabel, od.length, od.length ? 'var(--c-danger)' : 'var(--tx3)'],
          [t.completed, done.length, 'var(--c-success)'],
        ].map(([label, value, color]) => (
          <div key={label} style={{ background: 'var(--bg1)', padding: '10px 8px', textAlign: 'center' }}>
            <div style={{
              fontSize: 20,
              fontWeight: 600,
              color,
              lineHeight: 1,
              marginBottom: 3,
            }}>
              {value}
            </div>
            <div style={{
              fontSize: 10,
              color: 'var(--tx3)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '12px 18px 16px' }}>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--tx3)',
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          {t.projects}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {userProjs.map(p => (
            <span key={p.id} style={{
              fontSize: 11,
              color: p.color,
              background: p.color + '18',
              padding: '3px 8px',
              borderRadius: 'var(--r1)',
              fontWeight: 500,
            }}>
              {p.name}
            </span>
          ))}
          {userProjs.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--tx3)', fontStyle: 'italic' }}>
              {t.noResults ?? '—'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
