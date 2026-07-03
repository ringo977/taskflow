import { useState, useRef, useMemo, useCallback } from 'react'
import { useLang } from '@/i18n'
import { applyFilters, applyVisibilityFilter } from '@/utils/filters'
import { usePartners } from '@/hooks/usePartners'
import { useWorkpackages } from '@/hooks/useWorkpackages'
import { useMilestones } from '@/hooks/useMilestones'
import { groupTasks } from '@/utils/groupBy'
import { BASE_DAY_W, ROW_H, LABEL_W, HEADER_H, SEC_H, ZOOM_STEPS, dateToMs, msToDs, daysBetween } from '@/views/timeline/timelineUtils'
import { useTimelineDrag } from '@/views/timeline/useTimelineDrag'
import TimelineToolbar from '@/views/timeline/TimelineToolbar'
import TimelineLaneLabels from '@/views/timeline/TimelineLaneLabels'
import TimelineLane from '@/views/timeline/TimelineLane'
import DependencyArrows from '@/views/timeline/DependencyArrows'
import DragPreviewBar from '@/views/timeline/DragPreviewBar'
import TimelineTooltip from '@/views/timeline/TimelineTooltip'

export default function TimelineView({ tasks, secs, projects, project, currentUser, myProjectRoles: _myProjectRoles = {}, onOpen, onUpd, filters, lang, orgId, projectId, groupBy = 'section' }) {
  const t = useLang()
  const scrollRef = useRef(null)
  const [zoomIdx, setZoomIdx] = useState(ZOOM_STEPS.indexOf(1))

  // Hover tooltip
  const [hoverTask, setHoverTask] = useState(null)
  const [hoverPos, setHoverPos] = useState(null)
  const hoverTimer = useRef(null)

  // Dependency arrow hover
  const [hoverDep, setHoverDep] = useState(null)

  const dw = Math.round(BASE_DAY_W * ZOOM_STEPS[zoomIdx])

  // Drag state + handlers
  const { dragState, dragRef, handleBarMouseDown, getBarCursor, getBarDragType } = useTimelineDrag({ onUpd, dw })

  // Lookups for groupBy
  const { orgPartners } = usePartners(orgId, projectId)
  const { workpackages } = useWorkpackages(orgId, projectId)
  const { milestones } = useMilestones(orgId, projectId)
  const wpById = useMemo(() => Object.fromEntries(workpackages.map(w => [w.id, w])), [workpackages])
  const msById = useMemo(() => Object.fromEntries(milestones.map(m => [m.id, m])), [milestones])
  const partnerById = useMemo(() => Object.fromEntries(orgPartners.map(p => [p.id, p])), [orgPartners])

  // Apply visibility and filters
  const visibleTasks = applyVisibilityFilter(tasks, project, currentUser?.name)
  const filtered = useMemo(() => filters ? applyFilters(visibleTasks, filters) : visibleTasks, [visibleTasks, filters])
  const hasDates = filtered.filter(task => task.due)

  const isGrouped = groupBy && groupBy !== 'section'
  const groups = useMemo(() => {
    if (!isGrouped) return null
    const dated = hasDates
    return groupTasks(dated, groupBy, { sections: secs, wpById, msById, partnerById, t })
  }, [isGrouped, hasDates, groupBy, secs, wpById, msById, partnerById, t])

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

  // Unified section list for layout: either grouped or by section
  const renderGroups = useMemo(() => {
    if (isGrouped && groups) {
      return groups.filter(g => g.tasks.length > 0).map(g => ({
        key: g.key, label: g.label, color: g.color, tasks: g.tasks,
      }))
    }
    return activeSecs.filter(s => hasDates.some(tk => tk.sec === s)).map(sec => ({
      key: sec, label: sec, color: undefined, tasks: hasDates.filter(tk => tk.sec === sec),
    }))
  }, [isGrouped, groups, activeSecs, hasDates])

  const rowLayout = useMemo(() => {
    if (!hasDates.length) return {}
    const layout = {}
    let y = HEADER_H
    for (const grp of renderGroups) {
      if (!grp.tasks.length) continue
      y += SEC_H
      for (const task of grp.tasks) {
        const sd = task.startDate ?? task.due
        const startPx = Math.max(0, daysBetween(startStr, sd)) * dw
        const endPx = Math.max(0, daysBetween(startStr, task.due)) * dw + dw
        const barW = Math.max(dw, endPx - startPx)
        layout[task.id] = { y, startX: startPx + 2, endX: startPx + barW - 2, midY: y + ROW_H / 2 }
        y += ROW_H
      }
    }
    return layout
  }, [hasDates, renderGroups, dw, startStr])

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

  // ── Hover tooltip ─────────────────────────────────────────

  const showHover = useCallback((task, e) => {
    if (dragRef.current) return
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => {
      setHoverTask(task)
      setHoverPos({ x: e.clientX, y: e.clientY })
    }, 350)
  }, [dragRef])

  const hideHover = useCallback(() => {
    clearTimeout(hoverTimer.current)
    setHoverTask(null)
    setHoverPos(null)
  }, [])

  // Early return AFTER all hooks
  if (hasDates.length === 0) {
    return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx3)', fontSize: 14 }}>{t.timelineEmpty}</div>
  }

  const chartH = HEADER_H + renderGroups.length * SEC_H + hasDates.length * ROW_H
  const getProj = pid => projects.find(p => p.id === pid)

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <TimelineToolbar
        zoomIdx={zoomIdx}
        setZoomIdx={setZoomIdx}
        taskCount={hasDates.length}
        minMs={minMs}
        maxMs={maxMs}
        depCount={depArrows.length}
        onTodayClick={() => { if (scrollRef.current) scrollRef.current.scrollLeft = todayPx - 120 }}
      />

      {/* Main scrollable area */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', display: 'flex', cursor: dragState ? (dragState.type === 'move' ? 'grabbing' : 'col-resize') : undefined }}>
        {/* Left: labels */}
        <div style={{ width: LABEL_W, flexShrink: 0, borderRight: '1px solid var(--bd3)', background: 'var(--bg1)', position: 'sticky', left: 0, zIndex: 10 }}>
          <div style={{ height: HEADER_H, borderBottom: '1px solid var(--bd3)', background: 'var(--bg2)' }} />
          {renderGroups.map(grp => (
            <TimelineLaneLabels key={grp.key} grp={grp} tasks={tasks} getProj={getProj} onOpen={onOpen} />
          ))}
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
            <DependencyArrows depArrows={depArrows} totalW={totalW} chartH={chartH} hoverDep={hoverDep} setHoverDep={setHoverDep} hoverTask={hoverTask} />
          )}

          {/* Drag preview bar */}
          {dragState?.previewStart && dragState?.previewDue && (
            <DragPreviewBar dragState={dragState} rowLayout={rowLayout} startStr={startStr} dw={dw} />
          )}

          {/* Chart rows */}
          {renderGroups.map(grp => (
            <TimelineLane
              key={grp.key}
              grp={grp}
              tasks={tasks}
              getProj={getProj}
              startStr={startStr}
              dw={dw}
              dragState={dragState}
              onOpen={onOpen}
              onUpd={onUpd}
              handleBarMouseDown={handleBarMouseDown}
              getBarCursor={getBarCursor}
              getBarDragType={getBarDragType}
              showHover={showHover}
              hideHover={hideHover}
            />
          ))}
        </div>
      </div>

      {/* Hover tooltip */}
      {hoverTask && hoverPos && !dragState && (
        <TimelineTooltip hoverTask={hoverTask} hoverPos={hoverPos} lang={lang} onUpd={onUpd} />
      )}
    </div>
  )
}
