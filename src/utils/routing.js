/**
 * Parse a pathname into routing components.
 * @param {string} pathname - The URL pathname (e.g., '/projects/123/board/task456')
 * @returns {{ nav: string, pid: string|null, view: string|null, taskId: string|null }}
 */
export function parseRoute(pathname) {
  const s = pathname.split('/').filter(Boolean)
  return { nav: s[0] || 'home', pid: s[1] || null, view: s[2] || null, taskId: s[3] || null }
}

/**
 * Build a pathname from routing components.
 * @param {string} nav - The navigation section (e.g., 'home', 'projects', 'portfolios')
 * @param {string|null} pid - The project/portfolio ID
 * @param {string|null} view - The view type (e.g., 'lista', 'board', 'overview')
 * @param {string|null} taskId - The task ID
 * @returns {string} The pathname
 */
export function buildPath(nav, pid, view, taskId) {
  if (nav === 'home') return taskId ? `/home/-/-/${taskId}` : '/'
  if ((nav === 'projects' || nav === 'portfolios') && pid) {
    let p = `/${nav}/${pid}`
    if (view) p += `/${view}`
    if (taskId) p += `/${taskId}`
    return p
  }
  return taskId ? `/${nav}/-/-/${taskId}` : `/${nav}`
}

/**
 * Defer work out of supabase.auth.onAuthStateChange — async handlers block GoTrue's lock and cause "lock was not released" timeouts
 * @param {Function} fn - The function to defer
 */
export function deferAuthWork(fn) {
  queueMicrotask(fn)
}
