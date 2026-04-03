/**
 * usePartners — state + CRUD for org-level partners/teams.
 *
 * Fetches all org partners on mount (when orgId changes) and exposes
 * actions that update both DB and local state.
 * Also provides project-partner linking via junction table.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  fetchOrgPartners, fetchProjectPartners,
  upsertPartner, deletePartner,
  linkPartnerToProject, unlinkPartnerFromProject,
} from '@/lib/db/partners'
import { logger } from '@/utils/logger'

const log = logger('usePartners')

export function usePartners(orgId, projectId) {
  const [orgPartners, setOrgPartners] = useState([])
  const [projectPartners, setProjectPartners] = useState([])
  const [loading, setLoading] = useState(true)

  // ── Fetch on mount / orgId+projectId change ───────────────────
  const reload = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [org, proj] = await Promise.all([
        fetchOrgPartners(orgId),
        projectId ? fetchProjectPartners(projectId) : Promise.resolve([]),
      ])
      setOrgPartners(org)
      setProjectPartners(proj)
    } catch (err) {
      log.error('Failed to fetch partners:', err.message ?? err)
    } finally {
      setLoading(false)
    }
  }, [orgId, projectId])

  useEffect(() => { reload() }, [reload])

  // ── CRUD: org-level partner ───────────────────────────────────
  const save = useCallback(async (partner) => {
    try {
      const saved = await upsertPartner(orgId, partner)
      setOrgPartners(prev => {
        const idx = prev.findIndex(p => p.id === saved.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = saved
          return next
        }
        return [...prev, saved]
      })
      return saved
    } catch (err) {
      log.error('Failed to save partner:', err.message ?? err)
      throw err
    }
  }, [orgId])

  const remove = useCallback(async (partnerId, label) => {
    try {
      await deletePartner(orgId, partnerId, label)
      setOrgPartners(prev => prev.filter(p => p.id !== partnerId))
      setProjectPartners(prev => prev.filter(pp => pp.partnerId !== partnerId))
    } catch (err) {
      log.error('Failed to delete partner:', err.message ?? err)
      throw err
    }
  }, [orgId])

  // ── Junction: project ↔ partner ───────────────────────────────
  const link = useCallback(async (pid, partnerId, roleLabel) => {
    try {
      await linkPartnerToProject(orgId, pid, partnerId, roleLabel)
      // Re-fetch project partners to get enriched data
      if (pid === projectId) {
        const proj = await fetchProjectPartners(pid)
        setProjectPartners(proj)
      }
    } catch (err) {
      log.error('Failed to link partner:', err.message ?? err)
      throw err
    }
  }, [orgId, projectId])

  const unlink = useCallback(async (pid, partnerId) => {
    try {
      await unlinkPartnerFromProject(orgId, pid, partnerId)
      if (pid === projectId) {
        setProjectPartners(prev => prev.filter(pp => pp.partnerId !== partnerId))
      }
    } catch (err) {
      log.error('Failed to unlink partner:', err.message ?? err)
      throw err
    }
  }, [orgId, projectId])

  return { orgPartners, projectPartners, loading, reload, save, remove, link, unlink }
}
