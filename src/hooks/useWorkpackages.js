/**
 * useWorkpackages — state + CRUD for project-level workpackages.
 *
 * Fetches WPs for the given project on mount (when projectId changes)
 * and exposes actions that update both DB and local state.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  fetchWorkpackages, upsertWorkpackage,
  deleteWorkpackage, reorderWorkpackages,
} from '@/lib/db/workpackages'
import { logger } from '@/utils/logger'

const log = logger('useWorkpackages')

export function useWorkpackages(orgId, projectId) {
  const [workpackages, setWorkpackages] = useState([])
  const [loading, setLoading] = useState(true)

  // ── Fetch on mount / projectId change ────────────────────────
  const reload = useCallback(async () => {
    if (!projectId) { setWorkpackages([]); setLoading(false); return }
    setLoading(true)
    try {
      const wps = await fetchWorkpackages(projectId)
      setWorkpackages(wps)
    } catch (err) {
      log.error('Failed to fetch workpackages:', err.message ?? err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { reload() }, [reload])

  // ── CRUD ─────────────────────────────────────────────────────
  const save = useCallback(async (wp) => {
    if (!orgId || !projectId) return
    try {
      const saved = await upsertWorkpackage(orgId, projectId, wp)
      setWorkpackages(prev => {
        const idx = prev.findIndex(w => w.id === saved.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = saved
          return next
        }
        return [...prev, saved]
      })
      return saved
    } catch (err) {
      log.error('Failed to save workpackage:', err.message ?? err)
      throw err
    }
  }, [orgId, projectId])

  const remove = useCallback(async (wpId, label) => {
    if (!orgId) return
    try {
      await deleteWorkpackage(orgId, wpId, label)
      setWorkpackages(prev => prev.filter(w => w.id !== wpId))
    } catch (err) {
      log.error('Failed to delete workpackage:', err.message ?? err)
      throw err
    }
  }, [orgId])

  const reorder = useCallback(async (orderedIds) => {
    if (!orgId || !projectId) return
    try {
      await reorderWorkpackages(orgId, projectId, orderedIds)
      setWorkpackages(prev => {
        const byId = Object.fromEntries(prev.map(w => [w.id, w]))
        return orderedIds.map((id, i) => ({ ...byId[id], position: i })).filter(Boolean)
      })
    } catch (err) {
      log.error('Failed to reorder workpackages:', err.message ?? err)
      throw err
    }
  }, [orgId, projectId])

  return { workpackages, loading, reload, save, remove, reorder }
}
