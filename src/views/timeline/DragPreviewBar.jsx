import { ROW_H, BAR_H, daysBetween } from './timelineUtils'

export default function DragPreviewBar({ dragState, rowLayout, startStr, dw }) {
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
}
