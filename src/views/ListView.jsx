import { useState, useMemo } from 'react'
import { useLang } from '@/i18n'
import { applyFilters, isOverdue } from '@/utils/filters'
import { highlight } from '@/utils/highlight'
import { fmtDate } from '@/utils/format'
import Avatar from '@/components/Avatar'
import Badge from '@/components/Badge'
import Checkbox from '@/components/Checkbox'

const SORT_OPTIONS = [
  { id: 'none', label: { it: 'Predefinito', en: 'Default' } },
  { id: 'due-asc', label: { it: 'Scadenza ↑', en: 'Due date ↑' } },
  { id: 'due-desc', label: { it: 'Scadenza ↓', en: 'Due date ↓' } },
  { id: 'pri-desc', label: { it: 'Priorità ↓', en: 'Priority ↓' } },
  { id: 'name-asc', label: { it: 'Nome A→Z', en: 'Name A→Z' } },
]

const PRI_ORDER = { high: 0, medium: 1, low: 2 }

function sortTasks(tasks, sortId) {
  if (sortId === 'none') return tasks
  const sorted = [...tasks]
  if (sortId === 'due-asc') return sorted.sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))
  if (sortId === 'due-desc') return sorted.sort((a, b) => (b.due ?? '').localeCompare(a.due ?? ''))
  if (sortId === 'pri-desc') return sorted.sort((a, b) => (PRI_ORDER[a.pri] ?? 1) - (PRI_ORDER[b.pri] ?? 1))
  if (sortId === 'name-asc') return sorted.sort((a, b) => a.title.localeCompare(b.title))
  return sorted
}

export default function ListView({ tasks, secs, project, onOpen, onToggle, onMove, onAddTask, filters, lang }) {
  const t = useLang()
  const [addIn, setAddIn] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [collapsed, setCollapsed] = useState({})
  const [sortBy, setSortBy] = useState('none')
  const [selected, setSelected] = useState(new Set())
  const q = filters.q

  const commitAdd = (sec) => {
    if (newTitle.trim()) { onAddTask(newTitle.trim(), sec); setNewTitle(''); setAddIn(null) }
  }

  const toggleSel = (id, e) => {
    e.stopPropagation()
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const clearSel = () => setSelected(new Set())

  const bulkDone = () => { selected.forEach(id => onToggle(id)); clearSel() }
  const bulkMove = (sec) => { if (onMove) selected.forEach(id => onMove(id, sec)); clearSel() }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '14px 22px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{t.sort}</span>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ fontSize: 12, padding: '4px 8px' }}>
          {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label[lang] ?? o.label.en}</option>)}
        </select>

        {selected.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', background: 'var(--bg2)', padding: '4px 12px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)' }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx1)' }}>{selected.size} {t.nSelected}</span>
            <button onClick={bulkDone} style={{ fontSize: 12, padding: '3px 8px', color: 'var(--c-success)', borderColor: 'var(--c-success)' }}>✓ Toggle</button>
            {secs.map(s => (
              <button key={s} onClick={() => bulkMove(s)} style={{ fontSize: 11, padding: '3px 8px' }}>→ {s}</button>
            ))}
            <button onClick={clearSel} style={{ fontSize: 12, padding: '3px 8px', color: 'var(--tx3)' }}>✕</button>
          </div>
        )}
      </div>

      {secs.map(sec => {
        const all      = tasks.filter(task => task.sec === sec)
        const filtered = sortTasks(applyFilters(all, filters), sortBy)
        const isC      = collapsed[sec]

        return (
          <div key={sec} style={{ marginBottom: 16 }}>
            <div onClick={() => setCollapsed(c => ({ ...c, [sec]: !c[sec] }))}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 0', borderBottom: '1px solid var(--bd3)', marginBottom: 4, cursor: 'pointer' }}>
              <span style={{ fontSize: 12, color: 'var(--tx3)', display: 'inline-block', transform: isC ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 0.12s' }}>▼</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx1)' }}>{sec}</span>
              <span style={{ fontSize: 13, color: 'var(--tx3)' }}>{q ? `${filtered.length}/${all.length}` : all.length}</span>
            </div>

            {!isC && (
              <>
                {filtered.map(task => {
                  const ov = isOverdue(task.due) && !task.done
                  const isBlocked = (task.deps ?? []).some(depId => tasks.find(t => t.id === depId && !t.done))
                  const isSel = selected.has(task.id)
                  return (
                    <div key={task.id} onClick={() => onOpen(task.id)}
                      className="row-interactive"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                        borderRadius: 'var(--r1)', borderBottom: '1px solid var(--bd3)',
                        background: isSel ? 'color-mix(in srgb, var(--c-brand) 8%, transparent)' : undefined,
                      }}>
                      <input type="checkbox" checked={isSel} onChange={e => toggleSel(task.id, e)}
                        onClick={e => e.stopPropagation()}
                        style={{ width: 14, height: 14, accentColor: 'var(--c-brand)', cursor: 'pointer', flexShrink: 0 }} />
                      <Checkbox done={task.done} onToggle={(e) => { e?.stopPropagation?.(); onToggle(task.id) }} size={15} />
                      <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: task.done ? 'var(--tx3)' : 'var(--tx1)', textDecoration: task.done ? 'line-through' : 'none' }}>
                        {highlight(task.title, q)}
                        {isBlocked && <span style={{ color: 'var(--c-warning)', fontSize: 12 }}>⊘</span>}
                      </span>
                      {(task.tags ?? []).map(tg => (
                        <span key={tg.name} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 'var(--r1)', background: (tg.color ?? 'var(--tx3)') + '20', color: tg.color ?? 'var(--tx3)', fontWeight: 500, flexShrink: 0 }}>{tg.name}</span>
                      ))}
                      <Badge pri={task.pri} />
                      {task.due && <span style={{ fontSize: 13, color: ov ? 'var(--c-danger)' : 'var(--tx3)', flexShrink: 0 }}>{fmtDate(task.due, lang)}</span>}
                      <Avatar name={task.who} size={20} />
                      {(project?.customFields ?? []).map(f => {
                        const v = (task.customValues ?? {})[f.id]
                        return v ? <span key={f.id} style={{ fontSize: 11, color: 'var(--tx3)', flexShrink: 0, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${f.name}: ${v}`}>{v}</span> : null
                      })}
                    </div>
                  )
                })}

                {filtered.length === 0 && !q && (
                  <div style={{ padding: '12px 10px', color: 'var(--tx3)', fontSize: 12, fontStyle: 'italic' }}>{t.emptySection ?? 'No tasks yet'}</div>
                )}

                {addIn === sec ? (
                  <div style={{ padding: '6px 10px', display: 'flex', gap: 5 }}>
                    <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={t.addTaskTitle}
                      style={{ flex: 1, fontSize: 14 }} autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') commitAdd(sec); if (e.key === 'Escape') { setAddIn(null); setNewTitle('') } }} />
                    <button onClick={() => commitAdd(sec)} style={{ fontSize: 13, padding: '6px 10px' }}>OK</button>
                    <button onClick={() => { setAddIn(null); setNewTitle('') }} style={{ fontSize: 13, padding: '6px 10px' }}>✕</button>
                  </div>
                ) : (
                  <div onClick={() => setAddIn(sec)}
                    className="row-interactive"
                    style={{ padding: '6px 10px', color: 'var(--tx3)', fontSize: 14 }}>
                    + {t.add}
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
