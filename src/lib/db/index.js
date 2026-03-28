/**
 * TaskFlow — Supabase data layer
 *
 * Barrel re-export so every existing `import { … } from '@/lib/db'`
 * continues to work unchanged after the split into modules.
 */

// ── Re-exports (grouped by domain) ─────────────────────────────

export { toPortfolio, toProject, toTask } from './adapters'

export { fetchPortfolios, upsertPortfolio, fetchProjects, upsertProject } from './projects'

export { fetchSectionRows, fetchSections, upsertSections } from './sections'

export {
  fetchTasks, upsertTask, updateTaskField,
  updateTaskDeps, moveTaskToSection, updateTaskPositions,
} from './tasks'

export { uploadAttachment, deleteAttachment } from './attachments'

export { seedOrg } from './seed'

export {
  fetchOrgDirectory,
  fetchMyMemberships, fetchUserOrgIds, ensureOrgMembership,
  addOrgMember, removeOrgMember, updateOrgMemberRole,
  fetchPendingSignups, confirmUserEmail, deleteUserAccount,
  requestJoinOrg, fetchPendingJoinRequests, approveJoinRequest, rejectJoinRequest,
  fetchMyProjectIds, fetchProjectMembers, addProjectMember, removeProjectMember,
  fetchMyProjectRoles,
} from './org'

export {
  deleteTask, deleteProject, deletePortfolio,
  fetchTrash, restoreItem, permanentlyDelete,
} from './trash'

// ── Aggregate fetch ─────────────────────────────────────────────

import { fetchPortfolios } from './projects'
import { fetchProjects } from './projects'
import { fetchSections } from './sections'
import { fetchTasks } from './tasks'
import { fetchMyProjectIds, fetchMyProjectRoles } from './org'

export async function fetchOrgData(orgId) {
  const [ports, projs, secs, tasks, accessibleIds, myProjectRoles] = await Promise.all([
    fetchPortfolios(orgId),
    fetchProjects(orgId),
    fetchSections(orgId),
    fetchTasks(orgId),
    fetchMyProjectIds(orgId),
    fetchMyProjectRoles(orgId),
  ])
  if (accessibleIds === null) return { ports, projs, secs, tasks, myProjectRoles }
  const idSet = new Set(accessibleIds)
  return {
    ports,
    projs: projs.filter(p => idSet.has(p.id)),
    secs: Object.fromEntries(Object.entries(secs).filter(([pid]) => idSet.has(pid))),
    tasks: tasks.filter(t => idSet.has(t.pid)),
    myProjectRoles,
  }
}
