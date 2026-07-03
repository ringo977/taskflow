import { isOverdue } from '@/utils/filters'
import { ROW_H, BAR_H, daysBetween } from './timelineUtils'

export default function TimelineBar({ task, proj, tasks, startStr, dw, dragState, onOpen, onUpd, handleBarMouseDown, getBarCursor, getBarDragType, showHover, hideHover }) {
  const p = proj
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
    <div style={{ height: ROW_H, borderBottom: '1px solid var(--bd3)', position: 'relative' }}>
      {task.milestoneId ? (
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
}
