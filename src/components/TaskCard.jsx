import { highlight } from '@/utils/highlight'
import { fmtDate } from '@/utils/format'
import { isOverdue } from '@/utils/filters'
import Avatar from './Avatar'
import AvatarGroup from './AvatarGroup'
import Badge from './Badge'
import Checkbox from './Checkbox'

export default function TaskCard({ task, onOpen, onToggle, q, lang, blocked }) {
  const ov       = isOverdue(task.due) && !task.done
  const doneSubs = task.subs.filter(s => s.done).length
  return (
    <div onClick={() => onOpen(task.id)}
      className="row-interactive"
      style={{
        background: 'var(--bg1)',
        border: '1px solid var(--bd3)',
        ...(blocked ? { borderLeft: '3px solid var(--c-warning)' } : {}),
        borderRadius: 'var(--r2)',
        padding: '12px 14px',
        cursor: 'pointer',
        marginBottom: 8,
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Checkbox done={task.done} onToggle={() => onToggle(task.id)} size={18} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: task.done ? 'var(--tx3)' : 'var(--tx1)', textDecoration: task.done ? 'line-through' : 'none' }}>
            {highlight(task.title, q)}
          </div>
          {(task.tags ?? []).length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
              {task.tags.map(tg => (
                <span key={tg.name} style={{ fontSize: 11, padding: '1px 7px', borderRadius: 'var(--r1)', background: (tg.color ?? 'var(--tx3)') + '20', color: tg.color ?? 'var(--tx3)', fontWeight: 500, lineHeight: 1.6 }}>{tg.name}</span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
            <Badge pri={task.pri} />
            {task.milestone && <span style={{ fontSize: 11, color: 'var(--c-brand)' }}>◆</span>}
            {blocked && <span style={{ fontSize: 12, color: 'var(--c-warning)' }}>⊘</span>}
            {task.due && <span style={{ fontSize: 12, color: ov ? 'var(--c-danger)' : 'var(--tx3)' }}>{fmtDate(task.due, lang)}{ov ? ' ⚠' : ''}</span>}
            {task.subs.length > 0 && <span style={{ fontSize: 12, color: 'var(--tx3)' }}>✓ {doneSubs}/{task.subs.length}</span>}
            {task.cmts.length > 0 && <span style={{ fontSize: 12, color: 'var(--tx3)' }}>✉ {task.cmts.length}</span>}
            {task.approval?.status === 'pending' && <span style={{ fontSize: 11, color: 'var(--c-warning)', fontWeight: 500 }}>⏳</span>}
            {task.approval?.status === 'approved' && <span style={{ fontSize: 11, color: 'var(--c-success)', fontWeight: 500 }}>✓</span>}
            {task.approval?.status === 'rejected' && <span style={{ fontSize: 11, color: 'var(--c-danger)', fontWeight: 500 }}>✕</span>}
            {task.approval?.status === 'changes_requested' && <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>↻</span>}
            {(task.timeEntries?.length > 0) && <span style={{ fontSize: 11, color: 'var(--tx3)' }}>⏱</span>}
          </div>
        </div>
        {Array.isArray(task.who) && task.who.length > 1
          ? <AvatarGroup names={task.who} size={26} />
          : <Avatar name={Array.isArray(task.who) ? task.who[0] : task.who} size={26} />}
      </div>
    </div>
  )
}
