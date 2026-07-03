import { useState, useRef, useEffect, useCallback } from 'react'
import { dateToMs, addDays, EDGE_ZONE } from './timelineUtils'

export function useTimelineDrag({ onUpd, dw }) {
  // Drag state
  const [dragState, setDragState] = useState(null)
  // { taskId, type: 'move'|'resizeStart'|'resizeEnd', origStartDate, origDue, startPx, previewStart, previewDue }
  const dragRef = useRef(null) // mirror for mousemove handler

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

  return { dragState, dragRef, handleBarMouseDown, getBarCursor, getBarDragType }
}
