/**
 * Permission utilities for TaskFlow.
 * Provides role-based and visibility checks at project, section, and task level.
 */

/** Project-level role hierarchy: owner > editor > viewer */
const ROLE_LEVEL = { owner: 3, editor: 2, viewer: 1 }

/**
 * Get the effective role for a user in a project.
 * Org admins are always treated as project owners.
 */
export function getProjectRole(user, project, orgUsers, myProjectRoles) {
  const orgUser = orgUsers?.find(u => u.name === user?.name || u.email === user?.email)
  if (orgUser?.role === 'admin') return 'owner'
  return myProjectRoles?.[project?.id] ?? 'viewer'
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

export const ROLES = [
  { id: 'owner', label: { it: 'Owner', en: 'Owner' }, color: 'var(--c-brand)' },
  { id: 'editor', label: { it: 'Editor', en: 'Editor' }, color: 'var(--c-success)' },
  { id: 'viewer', label: { it: 'Viewer', en: 'Viewer' }, color: 'var(--tx3)' },
]
