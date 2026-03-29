/**
 * Apply filter state to a task array.
 * filters: { q, pri, who, due, done }
 */
export function applyFilters(tasks, filters = {}) {
  return tasks.filter(task => {
    // Full-text search on title + description
    if (filters.q) {
      const q = filters.q.toLowerCase()
      const match = task.title.toLowerCase().includes(q) ||
                    (task.desc || '').toLowerCase().includes(q) ||
                    (task.tags ?? []).some(tg => tg.name.toLowerCase().includes(q))
      if (!match) return false
    }

    // Priority filter
    if (filters.pri && filters.pri !== 'all' && task.pri !== filters.pri) return false

    // Assignee filter
    if (filters.who && filters.who !== 'all' && !(Array.isArray(task.who) ? task.who : [task.who]).includes(filters.who)) return false

    // Tag filter
    if (filters.tag && filters.tag !== 'all') {
      if (!(task.tags ?? []).some(tg => tg.name === filters.tag)) return false
    }

    // Done/open filter
    if (filters.done === 'open' && task.done) return false
    if (filters.done === 'done' && !task.done) return false

    // Due date filter
    if (filters.due && filters.due !== 'all') {
      const now = new Date()
      const todayStr = now.toISOString().slice(0, 10)
      const weekEnd = new Date(now)
      weekEnd.setDate(now.getDate() + 7)
      const weekStr = weekEnd.toISOString().slice(0, 10)

      if (!task.due) return false

      if (filters.due === 'overdue' && !isOverdue(task.due)) return false
      if (filters.due === 'today'   && task.due !== todayStr) return false
      if (filters.due === 'week'    && (task.due < todayStr || task.due > weekStr)) return false
    }

    return true
  })
}

/** Returns true if the due date is in the past */
export function isOverdue(due) {
  if (!due) return false
  return new Date(due + 'T23:59:59') < new Date()
}

/**
 * Filter tasks by visibility based on project roles and task/section settings.
 * Returns only tasks the user should see.
 */
export function applyVisibilityFilter(tasks, project, userName) {
  if (!project || !userName) return tasks

  const ROLE_LEVEL = { owner: 3, editor: 2, viewer: 1 }
  const member = (project.members ?? []).find(m => m.name === userName)
  const role = member?.role ?? 'viewer'
  const level = ROLE_LEVEL[role] ?? 1

  return tasks.filter(task => {
    // Task visibility: assignees only
    if (task.visibility === 'assignees') {
      const who = Array.isArray(task.who) ? task.who : task.who ? [task.who] : []
      if (!who.includes(userName)) return false
    }

    // Section access: editors only
    if (project.sectionAccess && task.sec) {
      const access = project.sectionAccess[task.sec]
      if (access === 'editors' && level < 2) return false
    }

    return true
  })
}
