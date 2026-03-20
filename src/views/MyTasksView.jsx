import { useState } from 'react'
import { useLang } from '@/i18n'
import { applyFilters, isOverdue } from '@/utils/filters'
import { highlight } from '@/utils/highlight'
import { fmtDate } from '@/utils/format'
import Badge from '@/components/Badge'
import Checkbox from '@/components/Checkbox'

export default function MyTasksView({ tasks, projects, currentUser, filters, onOpen, onToggle, lang }) {
  const t = useLang()
  const [collapsed, setCollapsed] = useState({ done: true })

  const now   = new Date()
  const ts    = now.toISOString().slice(0, 10)
  const weEnd = new Date(now); weEnd.setDate(now.getDate() + 7)
  const weStr = weEnd.toISOString().slice(0, 10)

  const mine     = applyFilters(tasks.filter(task => task.who === currentUser.name), filters)
  const openMine = mine.filter(task => !task.done)

  const groups = [
    { key: 'overdue', label: t.overdueGroup, color: 'var(--c-danger)',  items: mine.filter(task => !task.done && isOverdue(task.due)) },
    { key: 'today',   label: t.todayGroup,   color: 'var(--c-warning)', items: mine.filter(task => !task.done && task.due === ts) },
    { key: 'week',    label: t.weekGroup,    color: 'var(--c-brand)',   items: mine.filter(task => !task.done && task.due && task.due > ts && task.due <= weStr) },
    { key: 'later',   label: t.laterGroup,   color: 'var(--c-success)', items: mine.filter(task => !task.done && (!task.due || task.due > weStr)) },
    { key: 'done',    label: t.doneGroup,    color: 'var(--tx3)',       items: mine.filter(task => task.done) },
  ].filter(g => g.items.length > 0)

  const q = filters.q

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 26px' }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--tx1)', marginBottom: 6, letterSpacing: '-0.01em' }}>{t.myTasks}</div>
      <div style={{ fontSize: 13, color: 'var(--tx3)', marginBottom: 20 }}>{t.myTasksOpen(openMine.length)}</div>

      {mine.length === 0 && <div style={{ fontSize: 14, color: 'var(--tx3)' }}>{t.noTasks(q)}</div>}

      {groups.map(g => (
        <div key={g.key} style={{ marginBottom: 20 }}>
          <div onClick={() => setCollapsed(c => ({ ...c, [g.key]: !c[g.key] }))}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: `1px solid color-mix(in srgb, ${g.color} 30%, transparent)`, marginBottom: 6, cursor: 'pointer' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: g.key === 'overdue' ? 'var(--c-danger)' : 'var(--tx2)' }}>{g.label}</span>
            <span style={{ fontSize: 13, color: 'var(--tx3)' }}>{g.items.length}</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--tx3)', display: 'inline-block', transform: collapsed[g.key] ? 'rotate(-90deg)' : 'none', transition: 'transform var(--duration-fast) var(--ease)' }}>▼</span>
          </div>

          {!collapsed[g.key] && g.items.map(task => {
            const p  = projects.find(x => x.id === task.pid)
            const ov = isOverdue(task.due) && !task.done
            const isBlocked = (task.deps ?? []).some(depId => tasks.find(t => t.id === depId && !t.done))
            return (
              <div key={task.id} onClick={() => onOpen(task.id)}
                className="row-interactive"
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--r1)', cursor: 'pointer', borderBottom: '1px solid var(--bd3)' }}>
                <Checkbox done={task.done} onToggle={() => onToggle(task.id)} size={18} />
                <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: task.done ? 'var(--tx3)' : 'var(--tx1)', textDecoration: task.done ? 'line-through' : 'none' }}>
                  {highlight(task.title, q)}
                  {isBlocked && <span style={{ color: 'var(--c-warning)', fontSize: 12 }}>⊘</span>}
                </span>
                {p && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--tx3)' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.color }} />
                    {p.name}
                  </div>
                )}
                <Badge pri={task.pri} />
                {task.due && <span style={{ fontSize: 12, color: ov ? 'var(--c-danger)' : 'var(--tx3)', flexShrink: 0 }}>{fmtDate(task.due, lang)}</span>}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
