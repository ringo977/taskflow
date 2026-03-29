import { useState, useRef, useCallback } from 'react'
import { useLang } from '@/i18n'
import { applyFilters, applyVisibilityFilter } from '@/utils/filters'
import { getProjectRole, canEditTasks } from '@/utils/permissions'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import TaskCard from '@/components/TaskCard'

export default function BoardView({ tasks, secs, project, currentUser, myProjectRoles = {}, onOpen, onToggle, onMove, onReorder, onAddTask, onUpdateSecs, filters, lang }) {
  const t = useLang()
  const orgUsers = useOrgUsers()
  const projectRole = getProjectRole(currentUser, project, orgUsers, myProjectRoles)
  const readOnly = !canEditTasks(projectRole)
  const [drag, setDrag] = useState(null)
  const [over, setOver] = useState(null)
  const [dropIdx, setDropIdx] = useState(null)
  const [addIn, setAddIn] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [addingSec, setAddingSec] = useState(false)
  const [newSecName, setNewSecName] = useState('')
  const [editingSec, setEditingSec] = useState(null)
  const [editSecName, setEditSecName] = useState('')
  const q = filters.q
  const cardRefs = useRef({})

  const commitAdd = (sec) => {
    if (newTitle.trim()) { onAddTask(newTitle.trim(), sec); setNewTitle(''); setAddIn(null) }
  }

  const commitAddSec = () => {
    const name = newSecName.trim()
    if (name && !secs.includes(name) && onUpdateSecs) {
      onUpdateSecs([...secs, name])
    }
    setNewSecName('')
    setAddingSec(false)
  }

  const renameSec = (oldName) => {
    const name = editSecName.trim()
    if (name && name !== oldName && !secs.includes(name) && onUpdateSecs) {
      onUpdateSecs(secs.map(s => s === oldName ? name : s))
      tasks.filter(t => t.sec === oldName).forEach(t => onMove(t.id, name))
    }
    setEditingSec(null)
    setEditSecName('')
  }

  const deleteSec = (secName) => {
    if (!onUpdateSecs) return
    const secTasks = tasks.filter(t => t.sec === secName)
    if (secTasks.length > 0) {
      const target = secs.find(s => s !== secName) ?? 'To Do'
      secTasks.forEach(t => onMove(t.id, target))
    }
    onUpdateSecs(secs.filter(s => s !== secName))
  }

  const getDropIndex = useCallback((sec, clientY) => {
    const refs = cardRefs.current[sec]
    if (!refs?.length) return 0
    for (let i = 0; i < refs.length; i++) {
      const el = refs[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) return i
    }
    return refs.length
  }, [])

  const visibleTasks = applyVisibilityFilter(tasks, project, currentUser?.name)

  const handleDrop = (sec, e) => {
    e.preventDefault()
    if (!drag || readOnly) return
    const dragTask = visibleTasks.find(t => t.id === drag)
    if (!dragTask) return

    const _filtered = applyFilters(visibleTasks.filter(t => t.sec === sec), filters)
    const idx = getDropIndex(sec, e.clientY)

    if (dragTask.sec !== sec) {
      onMove(drag, sec)
      if (onReorder) {
        setTimeout(() => onReorder(drag, sec, idx), 0)
      }
    } else if (onReorder) {
      onReorder(drag, sec, idx)
    }

    setDrag(null)
    setOver(null)
    setDropIdx(null)
  }

  return (
    <>
    <style>{`
      @keyframes cardSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      .board-card { animation: cardSlideIn 0.2s var(--ease) both; }
      .board-card[draggable]:hover { box-shadow: 0 2px 8px rgba(0,0,0,.08); }
      .board-col { transition: background 0.15s var(--ease), border-color 0.15s var(--ease); }
    `}</style>
    <div className="board-container" style={{ display: 'flex', gap: 14, padding: 18, overflow: 'auto', flex: 1, alignItems: 'flex-start' }}>
      {secs.map(sec => {
        const filtered = applyFilters(visibleTasks.filter(t => t.sec === sec), filters)
        const total    = visibleTasks.filter(t => t.sec === sec).length
        const isOver   = over === sec

        cardRefs.current[sec] = []

        return (
          <div
            key={sec}
            onDragOver={e => {
              e.preventDefault()
              setOver(sec)
              setDropIdx(getDropIndex(sec, e.clientY))
            }}
            onDragLeave={() => { setOver(null); setDropIdx(null) }}
            onDrop={e => handleDrop(sec, e)}
            className="board-col"
            style={{
              minWidth: 280, width: 280, flexShrink: 0, padding: 10,
              background: isOver ? 'var(--bg-info)' : 'var(--bg2)',
              borderRadius: 'var(--r2)',
              border: `1px solid ${isOver ? 'var(--bd-info)' : 'var(--bd3)'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              {editingSec === sec ? (
                <input value={editSecName} onChange={e => setEditSecName(e.target.value)} autoFocus disabled={readOnly}
                  style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1, padding: '2px 4px' }}
                  onKeyDown={e => { if (e.key === 'Enter') renameSec(sec); if (e.key === 'Escape') setEditingSec(null) }}
                  onBlur={() => renameSec(sec)} />
              ) : (
                <span onDoubleClick={() => { if (!readOnly) { setEditingSec(sec); setEditSecName(sec) } }}
                  style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx2)', textTransform: 'uppercase', letterSpacing: '0.06em', cursor: readOnly ? 'default' : 'default', flex: 1 }}
                  title={readOnly ? '' : t.dblClickRename}>
                  {sec}
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--tx3)', background: 'var(--bg1)', padding: '1px 6px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)' }}>
                  {q ? `${filtered.length}/${total}` : total}
                </span>
                {secs.length > 1 && (
                  <button aria-label="Delete section" onClick={() => deleteSec(sec)} disabled={readOnly} title={readOnly ? '' : t.deleteSection}
                    style={{ border: 'none', background: 'transparent', color: readOnly ? 'var(--tx3)' : 'var(--tx3)', cursor: readOnly ? 'default' : 'pointer', fontSize: 13, padding: '2px 4px', lineHeight: 1, opacity: readOnly ? 0.3 : 0.5 }}>✕</button>
                )}
              </div>
            </div>

            {filtered.map((task, i) => (
              <div key={task.id}>
                {isOver && dropIdx === i && drag !== task.id && (
                  <div style={{ height: 3, background: 'var(--c-brand)', borderRadius: 2, margin: '2px 0', transition: 'all 0.1s' }} />
                )}
                <div ref={el => { if (el) cardRefs.current[sec][i] = el }}
                  className="board-card"
                  draggable={!readOnly} onDragStart={() => setDrag(task.id)} onDragEnd={() => { setDrag(null); setOver(null); setDropIdx(null) }}
                  style={{ opacity: drag === task.id ? 0.4 : 1, cursor: readOnly ? 'default' : 'grab', animationDelay: `${i * 30}ms` }}>
                  <TaskCard
                    task={task}
                    onOpen={onOpen}
                    onToggle={onToggle}
                    q={q}
                    lang={lang}
                    blocked={(task.deps ?? []).some(depId => tasks.find(t => t.id === depId && !t.done))}
                  />
                </div>
              </div>
            ))}
            {isOver && dropIdx === filtered.length && (
              <div style={{ height: 3, background: 'var(--c-brand)', borderRadius: 2, margin: '2px 0' }} />
            )}

            {filtered.length === 0 && !q && (
              <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--tx3)', fontSize: 12, fontStyle: 'italic', lineHeight: 1.6 }}>
                {t.emptySection ?? 'No tasks yet'}
              </div>
            )}

            {addIn === sec && !readOnly ? (
              <div style={{ marginTop: 4 }}>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={t.addTaskTitle}
                  style={{ width: '100%', fontSize: 14, marginBottom: 5 }} autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') commitAdd(sec); if (e.key === 'Escape') { setAddIn(null); setNewTitle('') } }} />
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => commitAdd(sec)} style={{ fontSize: 13, padding: '6px 10px' }}>OK</button>
                  <button aria-label="Cancel" onClick={() => { setAddIn(null); setNewTitle('') }} style={{ fontSize: 13, padding: '6px 10px' }}>✕</button>
                </div>
              </div>
            ) : !readOnly && (
              <div className="row-interactive" onClick={() => setAddIn(sec)}
                style={{ padding: '6px 10px', borderRadius: 'var(--r1)', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--tx3)', fontSize: 14 }}>
                <span style={{ fontSize: 17, lineHeight: 1 }}>+</span>{t.add}
              </div>
            )}
          </div>
        )
      })}

      {/* Add section column */}
      {!readOnly && (addingSec ? (
        <div style={{ minWidth: 280, width: 280, flexShrink: 0, padding: 10, background: 'var(--bg2)', borderRadius: 'var(--r2)', border: '1px dashed var(--bd3)' }}>
          <input value={newSecName} onChange={e => setNewSecName(e.target.value)} autoFocus
            placeholder={t.sectionNamePlaceholder}
            style={{ width: '100%', fontSize: 13, marginBottom: 6 }}
            onKeyDown={e => { if (e.key === 'Enter') commitAddSec(); if (e.key === 'Escape') { setAddingSec(false); setNewSecName('') } }} />
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={commitAddSec} style={{ fontSize: 13, padding: '6px 10px' }}>OK</button>
            <button aria-label="Cancel" onClick={() => { setAddingSec(false); setNewSecName('') }} style={{ fontSize: 13, padding: '6px 10px' }}>✕</button>
          </div>
        </div>
      ) : (
        <div onClick={() => setAddingSec(true)}
          className="row-interactive"
          style={{ minWidth: 280, width: 280, flexShrink: 0, padding: '14px 10px', borderRadius: 'var(--r2)', border: '1px dashed var(--bd3)', textAlign: 'center', color: 'var(--tx3)', fontSize: 14, cursor: 'pointer' }}>
          + {t.addSectionLabel}
        </div>
      ))}
    </div>
    </>
  )
}
