import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { useLang } from '@/i18n'
import { isOverdue, applyFilters, applyVisibilityFilter } from '@/utils/filters'
import { fmtDate } from '@/utils/format'
import Avatar from '@/components/Avatar'
import AvatarGroup from '@/components/AvatarGroup'

const BASE_DAY_W = 28
const ROW_H = 44
const BAR_H = 24
const LABEL_W = 210
const HEADER_H = 34
const SEC_H = 28
const ZOOM_STEPS = [0.35, 0.5, 0.75, 1, 1.5, 2, 3]
const EDGE_ZONE = 8  // px from bar edge to trigger resize

function dateToMs(str) { return str ? new Date(str + 'T12:00:00').getTime() : null }
function msToDs(ms) { return new Date(ms).toISOString().slice(0, 10) }
function daysBetween(a, b) { return Math.round((dateToMs(b) - dateToMs(a)) / 86400000) }
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function TimelineView({ tasks, secs, projects, project, currentUser, myProjectRoles: _myProjectRoles = {}, onOpen, onUpd, filters, lang }) {
  const t = useLang()
  const scrollRef = useRef(null)
  const [zoomIdx, setZoomIdx] = useState(ZOOM_STEPS.indexOf(1))

  // Drag state
  const [dragState, setDragState] = useState(null)
  // { taskId, type: 'move'|'resizeStart'|'resizeEnd', origStartDate, origDue, startPx, previewStart, previewDue }
  const dragRef = useRef(null) // mirror for mousemove handler

  // Hover tooltip
  const [hoverTask, setHoverTask] = useState(null)
  const [hoverPos, setHoverPos] = useState(null)
  const hoverTimer = useRef(null)

  // Dependency arrow hover
  const [hoverDep, setHoverDep] = useState(null)

  const dw = Math.round(BASE_DAY_W * ZOOM_STEPS[zoomIdx])

  // Apply visibility and filters
  const visibleTasks = applyVisibilityFilter(tasks, project, currentUser?.name)
  const filtered = useMemo(() => filters ? applyFilters(visibleTasks, filters) : visibleTasks, [visibleTasks, filters])
  const hasDates = filtered.filter(task => task.due)

  const allDates = hasDates.flatMap(task => [task.startDate, task.due].filter(Boolean))
  const minMs = allDates.length ? Math.min(...allDates.map(dateToMs)) - 7 * 86400000 : 0
  const maxMs = allDates.length ? Math.max(...allDates.map(dateToMs)) + 14 * 86400000 : 0
  const startStr = allDates.length ? msToDs(minMs) : ''
  const totalDays = allDates.length ? Math.ceil((maxMs - minMs) / 86400000) : 0
  const totalW = totalDays * dw

  const today = new Date().toISOString().slice(0, 10)
  const todayPx = startStr ? Math.max(0, daysBetween(startStr, today)) * dw : 0

  const months = useMemo(() => {
    if (!allDates.length) return []
    const arr = []
    const cur = new Date(minMs)
    cur.setDate(1)
    while (cur.getTime() < maxMs) {
      const label = t.monthsShort[cur.getMonth()] + ' ' + cur.getFullYear()
      const off = Math.max(0, daysBetween(startStr, cur.toISOString().slice(0, 10))) * dw
      arr.push({ label, offset: off })
      cur.setMonth(cur.getMonth() + 1)
    }
    return arr
  }, [minMs, maxMs, dw, startStr, t.monthsShort, allDates.length])

  const activeSecs = secs.filter(s => hasDates.some(task => task.sec === s))

  const rowLayout = useMemo(() => {
    if (!hasDates.length) return {}
    const layout = {}
    let y = HEADER_H
    for (const sec of activeSecs) {
      const secTasks = hasDates.filter(task => task.sec === sec)
      if (!secTasks.length) continue
      y += SEC_H
      for (const task of secTasks) {
        const sd = task.startDate ?? task.due
        const startPx = Math.max(0, daysBetween(startStr, sd)) * dw
        const endPx = Math.max(0, daysBetween(startStr, task.due)) * dw + dw
        const barW = Math.max(dw, endPx - startPx)
        layout[task.id] = { y, startX: startPx + 2, endX: startPx + barW - 2, midY: y + ROW_H / 2 }
        y += ROW_H
      }
    }
    return layout
  }, [hasDates, activeSecs, dw, startStr])

  const depArrows = useMemo(() => {
    if (!hasDates.length) return []
    const arrows = []
    for (const task of hasDates) {
      if (!task.deps?.length) continue
      const to = rowLayout[task.id]
      if (!to) continue
      for (const depId of task.deps) {
        const from = rowLayout[depId]
        if (!from) continue
        arrows.push({ x1: from.endX, y1: from.midY - HEADER_H, x2: to.startX, y2: to.midY - HEADER_H, fromId: depId, toId: task.id })
      }
    }
    return arrows
  }, [hasDates, rowLayout])

  // ── Drag handlers ─────────────────────────────────────────

  const handleBarMouseDown = useCallback((e, task, type) => {
    if (!onUpd) return
    e.preventDefault()
    e.stopPropagation()
    const state = {
      taskId: task.id,
      type,
      origStartDate: task.startDate ?? task.due,
      origDue: task.due,
      startPx: e.clientX,
      previewStart: null,
      previewDue: null,
    }
    setDragState(state)
    dragRef.current = state
  }, [onUpd])

  const handleMouseMove = useCallback((e) => {
    const ds = dragRef.current
    if (!ds) return
    const delta = e.clientX - ds.startPx
    const dayDelta = Math.round(delta / dw)
    if (dayDelta === 0 && !ds.previewStart) return

    let ps, pd
    if (ds.type === 'move') {
      ps = addDays(ds.origStartDate, dayDelta)
      pd = addDays(ds.origDue, dayDelta)
    } else if (ds.type === 'resizeStart') {
      ps = addDays(ds.origStartDate, dayDelta)
      pd = ds.origDue
      if (dateToMs(ps) > dateToMs(pd)) ps = pd // don't cross
    } else {
      ps = ds.origStartDate
      pd = addDays(ds.origDue, dayDelta)
      if (dateToMs(pd) < dateToMs(ps)) pd = ps
    }

    const updated = { ...ds, previewStart: ps, previewDue: pd }
    dragRef.current = updated
    setDragState(updated)
  }, [dw])

  const handleMouseUp = useCallback(() => {
    const ds = dragRef.current
    if (!ds || !onUpd) {
      setDragState(null)
      dragRef.current = null
      return
    }

    if (ds.previewStart && ds.previewDue) {
      const patch = {}
      if (ds.previewStart !== ds.origStartDate) patch.startDate = ds.previewStart
      if (ds.previewDue !== ds.origDue) patch.due = ds.previewDue
      if (Object.keys(patch).length) onUpd(ds.taskId, patch)
    }

    setDragState(null)
    dragRef.current = null
  }, [onUpd])

  useEffect(() => {
    if (!dragState) return
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, handleMouseMove, handleMouseUp])

  // Escape to cancel drag
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape' && dragRef.current) { setDragState(null); dragRef.current = null } }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [])

  // ── Hover tooltip ─────────────────────────────────────────

  const showHover = useCallback((task, e) => {
    if (dragRef.current) return
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => {
      setHoverTask(task)
      setHoverPos({ x: e.clientX, y: e.clientY })
    }, 350)
  }, [])

  const hideHover = useCallback(() => {
    clearTimeout(hoverTimer.current)
    setHoverTask(null)
    setHoverPos(null)
  }, [])

  // ── Cursor based on mouse position over bar ───────────────

  const getBarCursor = useCallback((e, barEl) => {
    if (!onUpd) return 'pointer'
    const rect = barEl.getBoundingClientRect()
    const x = e.clientX - rect.left
    if (x <= EDGE_ZONE) return 'col-resize'
    if (x >= rect.width - EDGE_ZONE) return 'col-resize'
    return 'grab'
  }, [onUpd])

  const getBarDragType = useCallback((e, barEl) => {
    const rect = barEl.getBoundingClientRect()
    const x = e.clientX - rect.left
    if (x <= EDGE_ZONE) return 'resizeStart'
    if (x >= rect.width - EDGE_ZONE) return 'resizeEnd'
    return 'move'
  }, [])

  // Early return AFTER all hooks
  if (hasDates.length === 0) {
    return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx3)', fontSize: 14 }}>{t.timelineEmpty}</div>
  }

  const chartH = HEADER_H + activeSecs.length * SEC_H + hasDates.length * ROW_H
  const getProj = pid => projects.find(p => p.id === pid)
  const zoomLabel = `${ZOOM_STEPS[zoomIdx]}×`

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--bd3)', background: 'var(--bg1)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: 'var(--tx3)' }}>Zoom</span>
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', overflow: 'hidden' }}>
          <button disabled={zoomIdx === 0} onClick={() => setZoomIdx(i => Math.max(0, i - 1))}
            style={{ padding: '4px 10px', fontSize: 13, border: 'none', borderRight: '1px solid var(--bd3)', background: 'transparent', cursor: zoomIdx === 0 ? 'default' : 'pointer', color: zoomIdx === 0 ? 'var(--tx3)' : 'var(--tx1)', opacity: zoomIdx === 0 ? 0.4 : 1 }}>−</button>
          <span style={{ padding: '4px 10px', fontSize: 12, fontWeight: 500, color: 'var(--tx2)', minWidth: 32, textAlign: 'center', userSelect: 'none' }}>{zoomLabel}</span>
          <button disabled={zoomIdx === ZOOM_STEPS.length - 1} onClick={() => setZoomIdx(i => Math.min(ZOOM_STEPS.length - 1, i + 1))}
            style={{ padding: '4px 10px', fontSize: 13, border: 'none', borderLeft: '1px solid var(--bd3)', background: 'transparent', cursor: zoomIdx === ZOOM_STEPS.length - 1 ? 'default' : 'pointer', color: zoomIdx === ZOOM_STEPS.length - 1 ? 'var(--tx3)' : 'var(--tx1)', opacity: zoomIdx === ZOOM_STEPS.length - 1 ? 0.4 : 1 }}>+</button>
        </div>
        <span style={{ fontSize: 12, color: 'var(--tx3)', marginLeft: 8 }}>
          {hasDates.length} task · {msToDs(minMs + 7 * 86400000)} → {msToDs(maxMs - 14 * 86400000)}
        </span>
        {depArrows.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--c-warning)', background: 'color-mix(in srgb, var(--c-warning) 12%, transparent)', padding: '2px 8px', borderRadius: 'var(--r1)' }}>
            {depArrows.length} dep
          </span>
        )}
        <button onClick={() => { if (scrollRef.current) scrollRef.current.scrollLeft = todayPx - 120 }}
          style={{ marginLeft: 'auto', fontSize: 12, padding: '4px 12px', color: 'var(--c-brand)', borderColor: 'var(--c-brand)' }}>
          {t.today ?? 'Today'}
        </button>
      </div>

      {/* Main scrollable area */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', display: 'flex', cursor: dragState ? (dragState.type === 'move' ? 'grabbing' : 'col-resize') : undefined }}>
        {/* Left: labels */}
        <div style={{ width: LABEL_W, flexShrink: 0, borderRight: '1px solid var(--bd3)', background: 'var(--bg1)', position: 'sticky', left: 0, zIndex: 10 }}>
          <div style={{ height: HEADER_H, borderBottom: '1px solid var(--bd3)', background: 'var(--bg2)' }} />
          {activeSecs.map(sec => {
            const secTasks = hasDates.filter(task => task.sec === sec)
            return (
              <div key={sec}>
                <div style={{ height: SEC_H, display: 'flex', alignItems: 'center', padding: '0 12px', background: 'var(--bg2)', borderBottom: '1px solid var(--bd3)', fontSize: 11, fontWeight: 600, color: 'var(--tx2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{sec}</div>
                {secTasks.map(task => {
                  const p = getProj(task.pid)
                  const ov = isOverdue(task.due) && !task.done
                  const isBlocked = (task.deps ?? []).some(depId => tasks.find(x => x.id === depId && !x.done))
                  return (
                    <div key={task.id} onClick={() => onOpen(task.id)} className="row-interactive"
                      style={{ height: ROW_H, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderBottom: '1px solid var(--bd3)', cursor: 'pointer' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: task.done ? 'var(--tx3)' : (p?.color ?? '#888'), flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: task.done ? 'var(--tx3)' : ov ? 'var(--c-danger)' : 'var(--tx1)', textDecoration: task.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{task.title}</span>
                      {task.milestone && <span style={{ fontSize: 10, color: p?.color ?? '#888' }}>◆</span>}
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
          })}
        </div>

        {/* Right: chart */}
        <div style={{ position: 'relative', minWidth: totalW, flexShrink: 0, minHeight: chartH }}>
          {/* Month header */}
          <div style={{ height: HEADER_H, borderBottom: '1px solid var(--bd3)', background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 5 }}>
            {months.map((m, i) => (
              <div key={i} style={{ position: 'absolute', left: m.offset, height: '100%', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 12, fontWeight: 500, color: 'var(--tx2)', whiteSpace: 'nowrap', borderLeft: i > 0 ? '1px solid var(--bd3)' : 'none' }}>
                {m.label}
              </div>
            ))}
          </div>

          {/* Today line */}
          <div style={{ position: 'absolute', left: todayPx, top: 0, bottom: 0, width: 1.5, background: 'var(--c-danger)', opacity: 0.5, zIndex: 4, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: todayPx - 16, top: HEADER_H + 2, fontSize: 10, color: 'var(--c-danger)', fontWeight: 500, padding: '1px 4px', background: 'color-mix(in srgb, var(--c-danger) 12%, transparent)', borderRadius: 'var(--r1)', zIndex: 4, pointerEvents: 'none' }}>
            {t.today ?? 'Today'}
          </div>

          {/* Dependency arrows */}
          {depArrows.length > 0 && (
            <svg style={{ position: 'absolute', top: HEADER_H, left: 0, width: totalW, height: chartH - HEADER_H, pointerEvents: 'none', zIndex: 3 }}>
              <defs>
                <marker id="dep-arrow" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                  <path d="M0 0L8 3L0 6z" fill="var(--c-warning)" />
                </marker>
                <marker id="dep-arrow-hl" viewBox="0 0 8 6" refX="7" refY="3" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                  <path d="M0 0L8 3L0 6z" fill="var(--c-brand)" />
                </marker>
              </defs>
              {depArrows.map((a, i) => {
                const midX = (a.x1 + a.x2) / 2
                const hl = hoverDep === i || (hoverTask && (hoverTask.id === a.fromId || hoverTask.id === a.toId))
                return (
                  <path key={i}
                    d={`M${a.x1},${a.y1} C${midX},${a.y1} ${midX},${a.y2} ${a.x2},${a.y2}`}
                    fill="none" stroke={hl ? 'var(--c-brand)' : 'var(--c-warning)'}
                    strokeWidth={hl ? 2.5 : 1.5} strokeDasharray={hl ? 'none' : '4 3'}
                    markerEnd={hl ? 'url(#dep-arrow-hl)' : 'url(#dep-arrow)'} opacity={hl ? 1 : 0.7}
                    style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                    onMouseEnter={() => setHoverDep(i)}
                    onMouseLeave={() => setHoverDep(null)}
                  />
                )
              })}
            </svg>
          )}

          {/* Drag preview bar */}
          {dragState?.previewStart && dragState?.previewDue && (() => {
            const prevStartPx = Math.max(0, daysBetween(startStr, dragState.previewStart)) * dw
            const prevEndPx = Math.max(0, daysBetween(startStr, dragState.previewDue)) * dw + dw
            const prevBarW = Math.max(dw, prevEndPx - prevStartPx)
            const layout = rowLayout[dragState.taskId]
            if (!layout) return null
            return (
              <div style={{
                position: 'absolute', left: prevStartPx + 2, top: layout.y + (ROW_H - BAR_H) / 2,
                width: prevBarW - 4, height: BAR_H,
                borderRadius: 'var(--r1)', background: 'var(--c-brand)', opacity: 0.25,
                border: '2px dashed var(--c-brand)', pointerEvents: 'none', zIndex: 6,
              }}>
                <span style={{ fontSize: 10, color: 'var(--c-brand)', fontWeight: 600, padding: '0 6px', whiteSpace: 'nowrap' }}>
                  {dragState.previewStart} → {dragState.previewDue}
                </span>
              </div>
            )
          })()}

          {/* Chart rows */}
          {activeSecs.map(sec => {
            const secTasks = hasDates.filter(task => task.sec === sec)
            return (
              <div key={sec}>
                <div style={{ height: SEC_H, borderBottom: '1px solid var(--bd3)', background: 'var(--bg2)' }} />
                {secTasks.map(task => {
                  const p = getProj(task.pid)
                  const ov = isOverdue(task.due) && !task.done
                  const hex = p?.color ?? '#888'
                  const isBlocked = (task.deps ?? []).some(depId => tasks.find(x => x.id === depId && !x.done))
                  const isDragging = dragState?.taskId === task.id

                  let barBg, barBorder
                  if (isBlocked)    { barBorder = 'var(--c-warning)'; barBg = 'color-mix(in srgb, var(--c-warning) 30%, transparent)' }
                  else if (ov)      { barBorder = 'var(--c-danger)';  barBg = 'color-mix(in srgb, var(--c-danger) 80%, transparent)' }
                  else if (task.done) { barBorder = 'var(--tx3)'; barBg = 'color-mix(in srgb, var(--tx3) 50%, transparent)' }
                  else { barBorder = hex; barBg = hex + 'cc' }

                  const sd = task.startDate ?? task.due
                  const startPx = Math.max(0, daysBetween(startStr, sd)) * dw
                  const endPx = Math.max(0, daysBetween(startStr, task.due)) * dw + dw
                  const barW = Math.max(dw, endPx - startPx)

                  return (
                    <div key={task.id} style={{ height: ROW_H, borderBottom: '1px solid var(--bd3)', position: 'relative' }}>
                      {task.milestone ? (
                        <div
                          onClick={() => { if (!isDragging) onOpen(task.id) }}
                          onMouseDown={(e) => handleBarMouseDown(e, task, 'move')}
                          onMouseEnter={(e) => showHover(task, e)}
                          onMouseLeave={hideHover}
                          style={{
                            position: 'absolute',
                            left: startPx + (dw / 2) - 10,
                            top: (ROW_H - 20) / 2,
                            width: 20, height: 20,
                            transform: 'rotate(45deg)',
                            background: task.done ? 'var(--tx3)' : hex,
                            border: `2px solid ${task.done ? 'var(--tx3)' : hex}`,
                            cursor: onUpd ? 'grab' : 'pointer',
                            opacity: isDragging ? 0.5 : 1,
                            zIndex: 2,
                          }}
                        />
                      ) : (
                        <div
                          onClick={() => { if (!isDragging) onOpen(task.id) }}
                          onMouseDown={(e) => handleBarMouseDown(e, task, getBarDragType(e, e.currentTarget))}
                          onMouseMove={(e) => {
                            if (!dragState) e.currentTarget.style.cursor = getBarCursor(e, e.currentTarget)
                          }}
                          onMouseEnter={(e) => showHover(task, e)}
                          onMouseLeave={hideHover}
                          style={{
                            position: 'absolute', left: startPx + 2, top: (ROW_H - BAR_H) / 2,
                            width: barW - 4, height: BAR_H,
                            borderRadius: 'var(--r1)', background: barBg,
                            border: `1px ${isBlocked ? 'dashed' : 'solid'} ${barBorder}`,
                            display: 'flex', alignItems: 'center', padding: '0 8px', overflow: 'hidden',
                            opacity: isDragging ? 0.5 : 1,
                            transition: isDragging ? 'none' : 'opacity 0.15s',
                            userSelect: 'none',
                          }}>
                          {isBlocked && <span style={{ fontSize: 11, marginRight: 4 }}>⊘</span>}
                          <span style={{ fontSize: 12, color: isBlocked ? 'var(--c-warning)' : 'var(--bg1)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: task.done ? 'line-through' : 'none' }}>
                            {task.title}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Hover tooltip */}
      {hoverTask && hoverPos && !dragState && (
        <div style={{
          position: 'fixed', left: Math.min(hoverPos.x + 12, window.innerWidth - 260), top: hoverPos.y + 16,
          background: 'var(--bg1)', border: '1px solid var(--bd3)', borderRadius: 'var(--r2)',
          padding: '10px 14px', fontSize: 12, zIndex: 100, pointerEvents: 'none',
          boxShadow: 'var(--shadow-md)', maxWidth: 250, animation: 'fadeIn 0.15s ease both',
        }}>
          <div style={{ fontWeight: 600, color: 'var(--tx1)', marginBottom: 4, lineHeight: 1.4 }}>{hoverTask.title}</div>
          <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 4 }}>
            {fmtDate(hoverTask.startDate ?? hoverTask.due, lang)} → {fmtDate(hoverTask.due, lang)}
            {hoverTask.startDate && hoverTask.due && (
              <span style={{ marginLeft: 6, color: 'var(--tx2)' }}>({daysBetween(hoverTask.startDate, hoverTask.due) + 1}d)</span>
            )}
          </div>
          {hoverTask.who?.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              {(Array.isArray(hoverTask.who) ? hoverTask.who : [hoverTask.who]).map(name => (
                <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Avatar name={name} size={14} />
                  <span style={{ fontSize: 11, color: 'var(--tx2)' }}>{name}</span>
                </span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--tx3)' }}>
            {hoverTask.pri && <span style={{ textTransform: 'capitalize' }}>{hoverTask.pri}</span>}
            {hoverTask.subs?.length > 0 && <span>{hoverTask.subs.filter(s => s.done).length}/{hoverTask.subs.length} sub</span>}
            {hoverTask.deps?.length > 0 && <span>{hoverTask.deps.length} dep</span>}
          </div>
          {onUpd && <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 6, fontStyle: 'italic' }}>{t.dragToMove ?? 'Drag to move · edges to resize'}</div>}
        </div>
      )}
    </div>
  )
}
