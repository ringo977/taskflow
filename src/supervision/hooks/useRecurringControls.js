/**
 * useRecurringControls — state + CRUD for recurring governance controls.
 *
 * On mount, fetches controls for the project and identifies which ones
 * are due (next_due_date <= today). Exposes actions for CRUD, execution,
 * and due-date advancement.
 *
 * V1: evaluation is client-side only — controls fire when the user
 * opens the Supervision page, not via server-side cron.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  fetchRecurringControls,
  upsertRecurringControl,
  deleteRecurringControl,
  advanceControlDueDate,
} from '@/lib/db/recurringControls'
import { logger } from '@/utils/logger'

const log = logger('useRecurringControls')

export function useRecurringControls(orgId, projectId) {
  const [controls, setControls] = useState([])
  const [loading, setLoading] = useState(true)

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  // ── Fetch ────────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await fetchRecurringControls(projectId)
      setControls(data)
    } catch (err) {
      log.error('Failed to fetch recurring controls:', err.message ?? err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { reload() }, [reload])

  // ── Derived: due controls ────────────────────────────────────────
  const dueControls = useMemo(
    () => controls.filter(c => c.active && c.nextDueDate && c.nextDueDate <= today),
    [controls, today],
  )

  // ── CRUD ─────────────────────────────────────────────────────────
  const save = useCallback(async (control) => {
    try {
      const saved = await upsertRecurringControl(orgId, projectId, control)
      setControls(prev => {
        const idx = prev.findIndex(c => c.id === saved.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = saved
          return next
        }
        return [...prev, saved]
      })
      return saved
    } catch (err) {
      log.error('Failed to save recurring control:', err.message ?? err)
      throw err
    }
  }, [orgId, projectId])

  const remove = useCallback(async (id, label) => {
    try {
      await deleteRecurringControl(orgId, id, label)
      setControls(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      log.error('Failed to delete recurring control:', err.message ?? err)
      throw err
    }
  }, [orgId])

  const toggleActive = useCallback(async (control) => {
    try {
      const updated = await upsertRecurringControl(orgId, projectId, {
        ...control,
        active: !control.active,
      })
      setControls(prev => prev.map(c => c.id === updated.id ? updated : c))
    } catch (err) {
      log.error('Failed to toggle control:', err.message ?? err)
      throw err
    }
  }, [orgId, projectId])

  // ── Execute: advance due date after control has been handled ────
  const advance = useCallback(async (control) => {
    try {
      const updated = await advanceControlDueDate(orgId, control)
      setControls(prev => prev.map(c => c.id === updated.id ? updated : c))
      return updated
    } catch (err) {
      log.error('Failed to advance control:', err.message ?? err)
      throw err
    }
  }, [orgId])

  return {
    controls,
    dueControls,
    loading,
    reload,
    save,
    remove,
    toggleActive,
    advance,
  }
}
