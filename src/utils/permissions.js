/**
 * Permission utilities for TaskFlow.
 * Provides role-based and visibility checks at project, section, and task level.
 */

/** Project-level role hierarchy: owner > editor > viewer */
const ROLE_LEVEL = { owner: 3, editor: 2, viewer: 1 }

/**
 * Get the effective role for a user in a project.
 *
 * Resolution order:
 *   1. Org admin  → always 'owner' (full control on every project)
 *   2. Explicit project role in project_members → as stored
 *   3. Org manager/member without explicit project role → 'editor'
 *      (can work on tasks in any visible project)
 *   4. Org guest without explicit project role → 'viewer'
 *   5. Unknown / no org role → 'viewer'
 */
export function getProjectRole(user, project, orgUsers, myProjectRoles) {
  const orgUser = orgUsers?.find(u => u.name === user?.name || u.email === user?.email)
  const orgRole = orgUser?.role // 'admin' | 'manager' | 'member' | 'guest' | undefined

  // 1. Org admins are owners everywhere
  if (orgRole === 'admin') return 'owner'

  // 2. Explicit project-level role takes precedence
  const projRole = myProjectRoles?.[project?.id]
  if (projRole) return projRole

  // 3. Managers and members default to editor (can edit tasks)
  if (orgRole === 'manager' || orgRole === 'member') return 'editor'

  // 4. Guests default to viewer
  return 'viewer'
}

/** Check if user can edit tasks in a project */
export function canEditTasks(role) {
  return (ROLE_LEVEL[role] ?? 0) >= ROLE_LEVEL.editor
}

/** Check if user can manage a project (settings, members, delete) */
export function canManageProject(role) {
  return role === 'owner'
}

/** Check if user can view a project */
export function canViewProject(user, project, orgUsers, myProjectRoles) {
  if (project.visibility !== 'members') return true
  const role = getProjectRole(user, project, orgUsers, myProjectRoles)
  return !!role && role !== 'none'
}

/** Check if user can see a section based on section access rules */
export function canViewSection(user, section, sectionAccess) {
  const access = sectionAccess?.[section]
  if (!access || access === 'all') return true
  if (Array.isArray(access)) return access.includes(user?.name)
  return true
}

/** Check if user can see a task based on task visibility */
export function canViewTask(user, task, projectRole) {
  if (task.visibility !== 'assignees') return true
  // Assignees can see
  const who = Array.isArray(task.who) ? task.who : task.who ? [task.who] : []
  if (who.includes(user?.name)) return true
  // Project owners can see everything
  if (projectRole === 'owner') return true
  return false
}

/**
 * Check if user can approve/reject a milestone (set status to achieved/missed).
 * Only project editors and owners can change milestone to terminal statuses.
 *
 * @param {string} projectRole - user's project role
 * @returns {boolean}
 */
export function canApproveMilestone(projectRole) {
  return (ROLE_LEVEL[projectRole] ?? 0) >= ROLE_LEVEL.editor
}

/**
 * Check if user can edit tasks within a workpackage based on WP access level.
 *
 * @param {string} projectRole - user's project role ('owner'|'editor'|'viewer')
 * @param {Object} wp - workpackage object with { access, ownerUserId }
 * @param {string} userId - current user's ID (UUID)
 * @returns {boolean}
 */
export function canEditTaskInWp(projectRole, wp, userId) {
  if (!wp) return canEditTasks(projectRole)
  const access = wp.access ?? 'all'

  switch (access) {
    case 'all':
      return canEditTasks(projectRole)
    case 'editors':
      return (ROLE_LEVEL[projectRole] ?? 0) >= ROLE_LEVEL.editor
    case 'owner_only':
      // If WP has a user owner, only that user can edit
      if (wp.ownerUserId) return wp.ownerUserId === userId
      // If WP owner is a partner (no user mapping), fallback to 'editors'
      return (ROLE_LEVEL[projectRole] ?? 0) >= ROLE_LEVEL.editor
    default:
      return canEditTasks(projectRole)
  }
}

export const ROLES = [
  { id: 'owner', label: { it: 'Owner', en: 'Owner' }, color: 'var(--c-brand)' },
  { id: 'editor', label: { it: 'Editor', en: 'Editor' }, color: 'var(--c-success)' },
  { id: 'viewer', label: { it: 'Viewer', en: 'Viewer' }, color: 'var(--tx3)' },
]
