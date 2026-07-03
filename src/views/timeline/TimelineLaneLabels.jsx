import { isOverdue } from '@/utils/filters'
import Avatar from '@/components/Avatar'
import AvatarGroup from '@/components/AvatarGroup'
import { ROW_H, SEC_H } from './timelineUtils'

export default function TimelineLaneLabels({ grp, tasks, getProj, onOpen }) {
  return (
    <div>
      <div style={{ height: SEC_H, display: 'flex', alignItems: 'center', padding: '0 12px', background: 'var(--bg2)', borderBottom: grp.color ? `2px solid ${grp.color}` : '1px solid var(--bd3)', fontSize: 11, fontWeight: 600, color: grp.color ?? 'var(--tx2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{grp.label}</div>
      {grp.tasks.map(task => {
        const p = getProj(task.pid)
        const ov = isOverdue(task.due) && !task.done
        const isBlocked = (task.deps ?? []).some(depId => tasks.find(x => x.id === depId && !x.done))
        return (
          <div key={task.id} onClick={() => onOpen(task.id)} className="row-interactive"
            style={{ height: ROW_H, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderBottom: '1px solid var(--bd3)', cursor: 'pointer' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: task.done ? 'var(--tx3)' : (p?.color ?? '#888'), flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: task.done ? 'var(--tx3)' : ov ? 'var(--c-danger)' : 'var(--tx1)', textDecoration: task.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{task.title}</span>
            {task.milestoneId && <span style={{ fontSize: 10, color: p?.color ?? '#888' }}>◆</span>}
            {task.who?.length > 0 && (
              Array.isArray(task.who) && task.who.length > 1
                ? <AvatarGroup names={task.who} size={16} />
                : <Avatar name={Array.isArray(task.who) ? task.who[0] : task.who} size={16} />
            )}
            {isBlocked && <span style={{ fontSize: 10, color: 'var(--c-danger)', fontWeight: 600 }}>⊘</span>}
          </div>
        )
      })}
    </div>
  )
}
