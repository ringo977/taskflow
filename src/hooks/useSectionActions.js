import { useCallback } from 'react'
import { logger } from '@/utils/logger'
import { upsertSections, fetchSectionRows } from '@/lib/db'

const log = logger('SectionActions')

/**
 * useSectionActions
 *
 * Manages section (Kanban column) updates for the current project.
 * Extracted from App.jsx to keep the orchestrator free of data-layer logic.
 *
 * @param {Object} params
 * @param {Function} params.setSecs - section state setter
 * @param {string}   params.pid - current project ID
 * @param {string}   params.activeOrgId - current org ID
 * @param {Object}   params.secRowsRef - ref to cached section rows
 * @param {Function} params.toast - toast notification function
 */
export function useSectionActions({ setSecs, pid, activeOrgId, secRowsRef, toast }) {
  const handleUpdateSecs = useCallback(async (names) => {
    setSecs(s => ({ ...s, [pid]: names }))
    try {
      await upsertSections(activeOrgId, pid, names)
      secRowsRef.current = await fetchSectionRows(activeOrgId)
    } catch (e) {
      log.error('updateSecs failed:', e)
      toast?.('Section update failed', 'error')
    }
  }, [setSecs, pid, activeOrgId, secRowsRef, toast])

  return { handleUpdateSecs }
}
