/**
 * useDeliverables — state + CRUD for project deliverables.
 *
 * Fetches deliverables on mount (when projectId changes) and exposes
 * actions that update both the DB and local state optimistically.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  fetchDeliverables, upsertDeliverable, deleteDeliverable,
  linkTask, unlinkTask,
} from '@/lib/db/deliverables'
import { logger } from '@/utils/logger'

const log = logger('useDeliverables')

export function useDeliverables(orgId, projectId) {
  const [deliverables, setDeliverables] = useState([])
  const [loading, setLoading] = useState(true)

  // ── Fetch on mount / projectId change ─────────────────────────
  const reload = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await fetchDeliverables(projectId)
      setDeliverables(data)
    } catch (err) {
      log.error('Failed to fetch deliverables:', err.message ?? err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { reload() }, [reload])

  // ── CRUD actions ──────────────────────────────────────────────
  const save = useCallback(async (deliverable) => {
    try {
      const saved = await upsertDeliverable(orgId, projectId, deliverable)
      setDeliverables(prev => {
        const idx = prev.findIndex(d => d.id === saved.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = { ...saved, linkedTaskIds: prev[idx].linkedTaskIds }
          return next
        }
        return [...prev, saved]
      })
      return saved
    } catch (err) {
      log.error('Failed to save deliverable:', err.message ?? err)
      throw err
    }
  }, [orgId, projectId])

  const remove = useCallback(async (id, label) => {
    try {
      await deleteDeliverable(orgId, id, label)
      setDeliverables(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      log.error('Failed to delete deliverable:', err.message ?? err)
      throw err
    }
  }, [orgId])

  const addTaskLink = useCallback(async (deliverableId, taskId) => {
    try {
      await linkTask(orgId, deliverableId, taskId)
      setDeliverables(prev => prev.map(d =>
        d.id === deliverableId
          ? { ...d, linkedTaskIds: [...new Set([...d.linkedTaskIds, taskId])] }
          : d,
      ))
    } catch (err) {
      log.error('Failed to link task:', err.message ?? err)
      throw err
    }
  }, [orgId])

  const removeTaskLink = useCallback(async (deliverableId, taskId) => {
    try {
      await unlinkTask(deliverableId, taskId)
      setDeliverables(prev => prev.map(d =>
        d.id === deliverableId
          ? { ...d, linkedTaskIds: d.linkedTaskIds.filter(id => id !== taskId) }
          : d,
      ))
    } catch (err) {
      log.error('Failed to unlink task:', err.message ?? err)
      throw err
    }
  }, [])

  return { deliverables, loading, reload, save, remove, addTaskLink, removeTaskLink }
}
