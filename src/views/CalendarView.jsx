import { useState, useMemo, useCallback, useRef } from 'react'
import { useLang } from '@/i18n'
import { applyFilters, isOverdue } from '@/utils/filters'

const PRI_DOTS = { high: 'var(--c-danger)', medium: 'var(--c-warning)', low: 'var(--c-lime)' }
const PRI_LABELS = { high: '🔴', medium: '🟡', low: '🟢' }

function toDS(d) { return d.toISOString().slice(0, 10) }

function getMonday(d) {
  const copy = new Date(d)
  const day = copy.getDay()
  copy.setDate(copy.getDate() + ((day === 0 ? -6 : 1) - day))
  return copy
}

export default function CalendarView({ tasks, projects, onOpen, onMove: _onMove, onUpd, onAddTaskOnDate, filters, lang: _lang }) {
  const t = useLang()
  const today = new Date()
  const todayStr = toDS(today)
  const [viewMode, setViewMode] = useState('month')
  const [cur, setCur] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [weekStart, setWeekStart] = useState(() => getMonday(today))
  const [hover, setHover] = useState(null)       // { taskId, x, y }
  const [dragTask, setDragTask] = useState(null)  // task id being dragged
  const [dropTarget, setDropTarget] = useState(null) // date string
  const hoverTimer = useRef(null)

  const filtered = useMemo(() => applyFilters(tasks, filters), [tasks, filters])

  const byDate = useMemo(() => {
    const map = {}
    filtered.filter(task => task.due).forEach(task => {
      map[task.due] = map[task.due] ?? []
      map[task.due].push(task)
    })
    return map
  }, [filtered])

  const y = cur.getFullYear(), m = cur.getMonth()
  const getProj = pid => projects.find(p => p.id === pid)
  const overdue = filtered.filter(task => !task.done && isOverdue(task.due))

  const upcoming = useMemo(() =>
    filtered.filter(task => {
      if (task.done || !task.due) return false
      const diff = (new Date(task.due + 'T12:00:00') - today) / 864e5
      return diff >= 0 && diff <= 7
    }).sort((a, b) => a.due.localeCompare(b.due)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [filtered, todayStr])

  const upcomingByDay = useMemo(() => {
    const groups = []
    let lastDate = null
    for (const task of upcoming) {
      if (task.due !== lastDate) {
        groups.push({ date: task.due, tasks: [] })
        lastDate = task.due
      }
      groups[groups.length - 1].tasks.push(task)
    }
    return groups
  }, [upcoming])

  const monthCells = useMemo(() => {
    const firstDow = (new Date(y, m, 1).getDay() + 6) % 7
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const cells = [
      ...Array(firstDow).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [y, m])

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return { date: d, ds: toDS(d) }
    }),
  [weekStart])

  // ── Navigation ─────────────────────────────────────────
  const prevNav = () => {
    if (viewMode === 'month') setCur(new Date(y, m - 1, 1))
    else setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  }
  const nextNav = () => {
    if (viewMode === 'month') setCur(new Date(y, m + 1, 1))
    else setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
  }
  const goToday = () => {
    if (viewMode === 'month') setCur(new Date(today.getFullYear(), today.getMonth(), 1))
    else setWeekStart(getMonday(today))
  }

  const navLabel = viewMode === 'month'
    ? `${t.months[m]} ${y}`
    : (() => {
        const end = new Date(weekStart)
        end.setDate(end.getDate() + 6)
        const sameMonth = weekStart.getMonth() === end.getMonth()
        if (sameMonth) return `${weekStart.getDate()} – ${end.getDate()} ${t.months[weekStart.getMonth()]} ${weekStart.getFullYear()}`
        return `${weekStart.getDate()} ${t.monthsShort[weekStart.getMonth()]} – ${end.getDate()} ${t.monthsShort[end.getMonth()]} ${end.getFullYear()}`
      })()

  // ── Drag & drop ────────────────────────────────────────
  const handleChipDragStart = useCallback((e, taskId) => {
    setDragTask(taskId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taskId)
  }, [])

  const handleCellDragOver = useCallback((e, ds) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(ds)
  }, [])

  const handleCellDrop = useCallback((e, ds) => {
    e.preventDefault()
    if (dragTask && onUpd) {
      onUpd(dragTask, { due: ds })
    }
    setDragTask(null)
    setDropTarget(null)
  }, [dragTask, onUpd])

  const handleCellDragLeave = useCallback(() => {
    setDropTarget(null)
  }, [])

  // ── Hover preview ──────────────────────────────────────
  const showPreview = useCallback((taskId, e) => {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => {
      setHover({ taskId, x: e.clientX, y: e.clientY })
    }, 350)
  }, [])

  const hidePreview = useCallback(() => {
    clearTimeout(hoverTimer.current)
    setHover(null)
  }, [])

  // ── Day cell renderer ──────────────────────────────────
  const renderDayCell = (d, ds, isWeek) => {
    const dayTasks = byDate[ds] ?? []
    const isToday = ds === todayStr
    const isPast = ds < todayStr
    const isDrop = dropTarget === ds
    const maxChips = isWeek ? 10 : 4

    return (
      <div key={ds}
        className={`cal-cell hoverable${isToday ? ' cal-cell--today' : ''}${isDrop ? ' cal-cell--drop' : ''}`}
        style={{ minHeight: isWeek ? 320 : 108 }}
        onDragOver={e => handleCellDragOver(e, ds)}
        onDragLeave={handleCellDragLeave}
        onDrop={e => handleCellDrop(e, ds)}
      >
        {!isWeek && (
          <div className="cal-cell__head">
            <div className={`cal-cell__num${isToday ? ' cal-cell__num--today' : ''}`}
              style={{ color: isToday ? 'var(--bg1)' : isPast ? 'var(--tx3)' : 'var(--tx1)' }}>
              {d}
            </div>
            {dayTasks.length > 0 && (
              <span className="cal-cell__count">{dayTasks.length}</span>
            )}
          </div>
        )}

        <div className="cal-cell__body">
          {dayTasks.slice(0, maxChips).map(task => {
            const p = getProj(task.pid)
            const ov = isOverdue(task.due) && !task.done
            return (
              <div key={task.id}
                draggable
                onDragStart={e => handleChipDragStart(e, task.id)}
                onDragEnd={() => { setDragTask(null); setDropTarget(null) }}
                onClick={() => onOpen(task.id)}
                onMouseEnter={e => showPreview(task.id, e)}
                onMouseLeave={hidePreview}
                title={task.title}
                className="cal-chip"
                style={{
                  background: ov ? 'color-mix(in srgb, var(--c-danger) 15%, transparent)' : (p?.color ? `${p.color}20` : 'color-mix(in srgb, var(--tx3) 12%, transparent)'),
                  color: ov ? 'var(--c-danger)' : (p?.color ?? 'var(--tx2)'),
                  borderLeftColor: ov ? 'var(--c-danger)' : (p?.color ?? 'var(--tx3)'),
                  textDecoration: task.done ? 'line-through' : 'none',
                  opacity: dragTask === task.id ? 0.35 : 1,
                  cursor: 'grab',
                }}>
                {task.done && <span className="cal-chip__done">✓</span>}
                {task.milestone && <span className="cal-chip__badge" style={{ color: p?.color ?? 'var(--tx2)' }}>◆</span>}
                {task.approval?.status === 'pending' && <span className="cal-chip__badge" style={{ color: 'var(--c-warning)' }}>⏳</span>}
                {task.title}
              </div>
            )
          })}
          {dayTasks.length > maxChips && (
            <div style={{ fontSize: 11, color: 'var(--tx3)', paddingLeft: 4 }}>+{dayTasks.length - maxChips}</div>
          )}
        </div>

        {onAddTaskOnDate && (
          <div className="cal-cell__add" onClick={() => onAddTaskOnDate(ds)}>+ {isWeek ? (t.addTask ?? '').replace('+ ', '') : ''}</div>
        )}
      </div>
    )
  }

  // ── Hover preview tooltip ──────────────────────────────
  const hoverTask = hover ? tasks.find(tk => tk.id === hover.taskId) : null
  const hoverProj = hoverTask ? getProj(hoverTask.pid) : null

  const showSidebar = viewMode === 'month'

  return (
    <>
      <style>{`
        .cal-cell {
          background: var(--bg1);
          border-radius: var(--r1);
          border: 1px solid var(--bd3);
          padding: 6px 8px;
          display: flex; flex-direction: column;
          overflow: hidden;
          transition: background 0.15s var(--ease), border-color 0.15s var(--ease), box-shadow 0.15s var(--ease);
        }
        .cal-cell--today { border-color: var(--c-brand); border-left: 3px solid var(--c-brand); background: color-mix(in srgb, var(--c-brand) 6%, transparent); }
        .cal-cell--drop { border-color: var(--c-brand); background: color-mix(in srgb, var(--c-brand) 12%, transparent); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--c-brand) 30%, transparent); }
        .cal-cell.hoverable:hover { background: var(--bg2); }
        .cal-cell__head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 4px; flex-shrink: 0;
        }
        .cal-cell__num {
          font-size: 13px; width: 24px; height: 24px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .cal-cell__num--today { background: var(--c-brand); font-weight: 600; }
        .cal-cell__count {
          font-size: 10px; color: var(--tx3); background: var(--bg2);
          padding: 0 5px; border-radius: 8px; line-height: 1.6;
        }
        .cal-cell__body {
          flex: 1; display: flex; flex-direction: column; gap: 2px;
          overflow: hidden; min-height: 0;
        }
        .cal-chip {
          font-size: 12px; padding: 3px 8px; border-radius: var(--r1);
          cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          border-left: 3px solid; line-height: 1.5; flex-shrink: 0;
          transition: transform 0.12s var(--ease), opacity 0.15s var(--ease), box-shadow 0.12s var(--ease);
          display: flex; align-items: center; gap: 4px;
        }
        .cal-chip:hover { filter: brightness(0.95); transform: translateX(2px); box-shadow: 0 1px 3px rgba(0,0,0,.08); }
        .cal-chip:active { cursor: grabbing; }
        .cal-chip__done { font-size: 10px; flex-shrink: 0; }
        .cal-chip__badge { font-size: 10px; flex-shrink: 0; }
        .cal-cell__add {
          opacity: 0; pointer-events: none;
          font-size: 12px; color: var(--tx3); cursor: pointer;
          padding: 4px 4px; text-align: center;
          transition: opacity 0.15s var(--ease);
          flex-shrink: 0; margin-top: auto;
        }
        .cal-cell:hover .cal-cell__add { opacity: 1; pointer-events: auto; }
        .cal-cell__add:hover { color: var(--c-brand); }

        .cal-preview {
          position: fixed; z-index: 999; pointer-events: none;
          background: var(--bg1); border: 1px solid var(--bd2); border-radius: var(--r2);
          box-shadow: var(--shadow-lg); padding: 10px 14px; width: 220px;
          animation: calPreviewIn 0.15s var(--ease) both;
        }
        @keyframes calPreviewIn { from { opacity: 0; transform: translateY(4px) scale(0.97); } to { opacity: 1; transform: none; } }
      `}</style>
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px', display: 'flex', gap: 0 }}>

        {/* Calendar main area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Overdue banner */}
          {overdue.length > 0 && (
            <div style={{ background: 'color-mix(in srgb, var(--c-danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--c-danger) 27%, transparent)', borderRadius: 'var(--r1)', padding: '9px 14px', marginBottom: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--c-danger)', fontWeight: 500, flexShrink: 0 }}>{t.overdueHeader(overdue.length)}</span>
              {overdue.slice(0, 5).map(task => (
                <span key={task.id} onClick={() => onOpen(task.id)} className="row-interactive" style={{ fontSize: 12, color: 'var(--c-danger)', cursor: 'pointer', textDecoration: 'underline', padding: '4px 8px', borderRadius: 'var(--r1)' }}>{task.title}</span>
              ))}
            </div>
          )}

          {/* Navigation bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button aria-label="Previous" onClick={prevNav} style={{ fontSize: 16, padding: '8px 14px' }}>‹</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{navLabel}</span>
              <button onClick={goToday} style={{ fontSize: 12, padding: '5px 12px', color: 'var(--tx3)' }}>{t.today}</button>
              <div style={{ display: 'flex', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', overflow: 'hidden', marginLeft: 4 }}>
                {['month', 'week'].map(mode => (
                  <button key={mode} onClick={() => setViewMode(mode)} style={{
                    padding: '5px 12px', fontSize: 12, border: 'none',
                    borderRight: mode === 'month' ? '1px solid var(--bd3)' : 'none',
                    background: viewMode === mode ? 'var(--bg2)' : 'transparent',
                    color: viewMode === mode ? 'var(--tx1)' : 'var(--tx3)',
                    fontWeight: viewMode === mode ? 500 : 400, cursor: 'pointer',
                  }}>{mode === 'month' ? t.month : t.weekView}</button>
                ))}
              </div>
            </div>
            <button aria-label="Next" onClick={nextNav} style={{ fontSize: 16, padding: '8px 14px' }}>›</button>
          </div>

          {/* Project legend — month only */}
          {viewMode === 'month' && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              {projects.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--tx3)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />{p.name}
                </div>
              ))}
            </div>
          )}

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
            {(viewMode === 'week' ? weekDays.map(wd => {
              const isToday = wd.ds === todayStr
              const dayIdx = wd.date.getDay() === 0 ? 6 : wd.date.getDay() - 1
              return (
                <div key={wd.ds} style={{ textAlign: 'center', padding: '6px 0' }}>
                  <div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {t.wdays[dayIdx]}
                  </div>
                  <div style={{
                    fontSize: 22, fontWeight: isToday ? 700 : 400, marginTop: 2,
                    color: isToday ? 'var(--bg1)' : 'var(--tx1)',
                    width: 36, height: 36, borderRadius: '50%', margin: '0 auto',
                    background: isToday ? 'var(--c-brand)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {wd.date.getDate()}
                  </div>
                </div>
              )
            }) : t.wdays.map(d => (
              <div key={d} style={{ fontSize: 12, color: 'var(--tx3)', textAlign: 'center', padding: '5px 0', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{d}</div>
            )))}
          </div>

          {/* Grid */}
          {viewMode === 'month' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
              {monthCells.map((d, i) => {
                if (!d) return <div key={`e${i}`} style={{ minHeight: 108 }} />
                const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                return renderDayCell(d, ds, false)
              })}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
              {weekDays.map(wd => renderDayCell(wd.date.getDate(), wd.ds, true))}
            </div>
          )}
        </div>

        {/* Upcoming sidebar */}
        <div style={{ width: 220, flexShrink: 0, paddingLeft: 16, borderLeft: '1px solid var(--bd3)', marginLeft: 16 }}>
          {showSidebar ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{t.next7}</div>
              {upcoming.length === 0 && <div style={{ fontSize: 13, color: 'var(--tx3)' }}>{t.noDeadlines}</div>}
              {upcomingByDay.map(group => {
                const dayDate = new Date(group.date + 'T12:00:00')
                const isToday = group.date === todayStr
                const dayLabel = isToday
                  ? t.today
                  : `${(t.wdaysFull ?? t.wdays)[dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1]} ${dayDate.getDate()} ${t.monthsShort[dayDate.getMonth()]}`
                return (
                  <div key={group.date} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: isToday ? 'var(--c-brand)' : 'var(--tx3)', marginBottom: 4, padding: '0 2px' }}>
                      {dayLabel}
                    </div>
                    {group.tasks.map(task => {
                      const p = getProj(task.pid)
                      const priColor = PRI_DOTS[task.pri]
                      return (
                        <div key={task.id} onClick={() => onOpen(task.id)} title={p?.name}
                          className="row-interactive"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '5px 4px', borderRadius: 'var(--r1)',
                            cursor: 'pointer',
                          }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: p?.color ?? 'var(--tx3)', flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 12, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
                            {task.title}
                          </span>
                          {priColor && <div style={{ width: 5, height: 5, borderRadius: '50%', background: priColor, flexShrink: 0 }} />}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </>
          ) : (
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{t.next7}</div>
          )}
        </div>
      </div>

      {/* Hover preview tooltip */}
      {hoverTask && hover && (
        <div className="cal-preview" style={{ left: Math.min(hover.x + 12, window.innerWidth - 240), top: Math.min(hover.y - 10, window.innerHeight - 140) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            {hoverProj && <div style={{ width: 7, height: 7, borderRadius: '50%', background: hoverProj.color, flexShrink: 0 }} />}
            <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{hoverProj?.name}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx1)', marginBottom: 6, lineHeight: 1.4 }}>{hoverTask.title}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: 'var(--tx3)' }}>
            {hoverTask.pri && <span>{PRI_LABELS[hoverTask.pri] ?? ''} {hoverTask.pri}</span>}
            {hoverTask.who && <span>👤 {hoverTask.who}</span>}
            {hoverTask.subs?.length > 0 && <span>✓ {hoverTask.subs.filter(s => s.done).length}/{hoverTask.subs.length}</span>}
            {hoverTask.approval?.status && <span style={{ textTransform: 'capitalize' }}>{hoverTask.approval.status.replace('_', ' ')}</span>}
            {hoverTask.timeEntries?.length > 0 && <span>⏱ {hoverTask.timeEntries.reduce((s, e) => s + (e.duration ?? 0), 0)}m</span>}
          </div>
          {hoverTask.desc && (
            <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 6, lineHeight: 1.4, maxHeight: 32, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {hoverTask.desc.slice(0, 100)}{hoverTask.desc.length > 100 ? '…' : ''}
            </div>
          )}
        </div>
      )}
    </>
  )
}
