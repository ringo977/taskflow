import { useState, useRef, useMemo, useEffect } from 'react'
import { useLang } from '@/i18n'
import { isOverdue } from '@/utils/filters'
import { fmtDate } from '@/utils/format'

const BASE_DAY_W = 28
const ROW_H = 44
const BAR_H = 24
const LABEL_W = 210
const HEADER_H = 34
const SEC_H = 28
const ZOOM_STEPS = [0.35, 0.5, 0.75, 1, 1.5, 2, 3]

function dateToMs(str) { return str ? new Date(str + 'T12:00:00').getTime() : null }
function msToDs(ms) { return new Date(ms).toISOString().slice(0, 10) }
function daysBetween(a, b) { return Math.round((dateToMs(b) - dateToMs(a)) / 86400000) }

export default function TimelineView({ tasks, secs, projects, onOpen, lang }) {
  const t = useLang()
  const scrollRef = useRef(null)
  const [zoomIdx, setZoomIdx] = useState(ZOOM_STEPS.indexOf(1))

  const dw = Math.round(BASE_DAY_W * ZOOM_STEPS[zoomIdx])

  const hasDates = tasks.filter(task => task.due)
  if (hasDates.length === 0) {
    return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx3)', fontSize: 14 }}>{t.timelineEmpty}</div>
  }

  const allDates = hasDates.flatMap(task => [task.startDate, task.due].filter(Boolean))
  const minMs = Math.min(...allDates.map(dateToMs)) - 7 * 86400000
  const maxMs = Math.max(...allDates.map(dateToMs)) + 14 * 86400000
  const startStr = msToDs(minMs)
  const totalDays = Math.ceil((maxMs - minMs) / 86400000)
  const totalW = totalDays * dw

  const today = new Date().toISOString().slice(0, 10)
  const todayPx = Math.max(0, daysBetween(startStr, today)) * dw

  const months = useMemo(() => {
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
  }, [minMs, maxMs, dw, startStr, t.monthsShort])

  const activeSecs = secs.filter(s => hasDates.some(task => task.sec === s))

  const rowLayout = useMemo(() => {
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
    const arrows = []
    for (const task of hasDates) {
      if (!task.deps?.length) continue
      const to = rowLayout[task.id]
      if (!to) continue
      for (const depId of task.deps) {
        const from = rowLayout[depId]
        if (!from) continue
        arrows.push({ x1: from.endX, y1: from.midY - HEADER_H, x2: to.startX, y2: to.midY - HEADER_H })
      }
    }
    return arrows
  }, [hasDates, rowLayout])

  const chartH = HEADER_H + activeSecs.length * SEC_H + hasDates.length * ROW_H

  const getProj = pid => projects.find(p => p.id === pid)

  const zoomLabel = ZOOM_STEPS[zoomIdx] === 1 ? '1×' : ZOOM_STEPS[zoomIdx] < 1 ? `${ZOOM_STEPS[zoomIdx]}×` : `${ZOOM_STEPS[zoomIdx]}×`

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
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', display: 'flex' }}>
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
              </defs>
              {depArrows.map((a, i) => {
                const midX = (a.x1 + a.x2) / 2
                return (
                  <path key={i}
                    d={`M${a.x1},${a.y1} C${midX},${a.y1} ${midX},${a.y2} ${a.x2},${a.y2}`}
                    fill="none" stroke="var(--c-warning)" strokeWidth="1.5" strokeDasharray="4 3"
                    markerEnd="url(#dep-arrow)" opacity="0.7"
                  />
                )
              })}
            </svg>
          )}

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
                      <div onClick={() => onOpen(task.id)} className="hoverable"
                        title={`${task.title}\n${fmtDate(sd, lang)} → ${fmtDate(task.due, lang)}`}
                        style={{
                          position: 'absolute', left: startPx + 2, top: (ROW_H - BAR_H) / 2,
                          width: barW - 4, height: BAR_H,
                          borderRadius: 'var(--r1)', background: barBg,
                          border: `1px ${isBlocked ? 'dashed' : 'solid'} ${barBorder}`,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 8px', overflow: 'hidden',
                        }}>
                        {isBlocked && <span style={{ fontSize: 11, marginRight: 4 }}>⊘</span>}
                        <span style={{ fontSize: 12, color: isBlocked ? 'var(--c-warning)' : 'var(--bg1)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: task.done ? 'line-through' : 'none' }}>
                          {task.title}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
