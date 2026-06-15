import { useMemo } from 'react'
import { usePartners } from './usePartners'
import { useWorkpackages } from './useWorkpackages'
import { useMilestones } from './useMilestones'

/**
 * Shared project-scoped lookups for task views (Board / List / etc.).
 *
 * Loads partners, workpackages and milestones for the project and exposes
 * memoized id→entity maps. Previously each view rebuilt these maps inline on
 * every render, which both duplicated logic and invalidated downstream memos.
 */
export function useProjectLookups(orgId, projectId) {
  const { orgPartners } = usePartners(orgId, projectId)
  const { workpackages } = useWorkpackages(orgId, projectId)
  const { milestones } = useMilestones(orgId, projectId)

  const partnerById = useMemo(
    () => Object.fromEntries(orgPartners.map(p => [p.id, p])),
    [orgPartners]
  )
  const wpById = useMemo(
    () => Object.fromEntries(workpackages.map(w => [w.id, w])),
    [workpackages]
  )
  const msById = useMemo(
    () => Object.fromEntries(milestones.map(m => [m.id, m])),
    [milestones]
  )

  return { orgPartners, workpackages, milestones, partnerById, wpById, msById }
}
