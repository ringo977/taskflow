/**
 * useMilestones — state + CRUD for project-level structured milestones.
 *
 * Fetches milestones for the given project on mount (when projectId changes)
 * and exposes actions that update both DB and local state.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  fetchMilestones, upsertMilestone,
  deleteMilestone, reorderMilestones,
} from '@/lib/db/milestones'
import { logger } from '@/utils/logger'

const log = logger('useMilestones')

export function useMilestones(orgId, projectId) {
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(true)

  // ── Fetch on mount / projectId change ────────────────────────
  const reload = useCallback(async () => {
    if (!projectId) { setMilestones([]); setLoading(false); return }
    setLoading(true)
    try {
      const mss = await fetchMilestones(projectId)
      setMilestones(mss)
    } catch (err) {
      log.error('Failed to fetch milestones:', err.message ?? err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { reload() }, [reload])

  // ── CRUD ─────────────────────────────────────────────────────
  const save = useCallback(async (ms) => {
    if (!orgId || !projectId) return
    try {
      const saved = await upsertMilestone(orgId, projectId, ms)
      setMilestones(prev => {
        const idx = prev.findIndex(m => m.id === saved.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = saved
          return next
        }
        return [...prev, saved]
      })
      return saved
    } catch (err) {
      log.error('Failed to save milestone:', err.message ?? err)
      throw err
    }
  }, [orgId, projectId])

  const remove = useCallback(async (msId, label) => {
    if (!orgId) return
    try {
      await deleteMilestone(orgId, msId, label)
      setMilestones(prev => prev.filter(m => m.id !== msId))
    } catch (err) {
      log.error('Failed to delete milestone:', err.message ?? err)
      throw err
    }
  }, [orgId])

  const reorder = useCallback(async (orderedIds) => {
    if (!orgId || !projectId) return
    try {
      await reorderMilestones(orgId, projectId, orderedIds)
      setMilestones(prev => {
        const byId = Object.fromEntries(prev.map(m => [m.id, m]))
        return orderedIds.map((id, i) => ({ ...byId[id], position: i })).filter(Boolean)
      })
    } catch (err) {
      log.error('Failed to reorder milestones:', err.message ?? err)
      throw err
    }
  }, [orgId, projectId])

  return { milestones, loading, reload, save, remove, reorder }
}
