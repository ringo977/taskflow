/**
 * Shared selectors — pure functions for task/project aggregation.
 *
 * These are used by HomeDashboard, the supervision cockpit, and any
 * future view that needs the same computed data. Keep them free of
 * React imports so they can also run in tests or workers.
 */
import { isOverdue } from '@/utils/filters'

// ── Lookup maps ──────────────────────────────────────────────────

/** Map of user-name → tasks[] */
export function buildUserTaskMap(tasks, users) {
  const map = {}
  for (const u of users) {
    map[u.name] = tasks.filter(t =>
      Array.isArray(t.who) ? t.who.includes(u.name) : t.who === u.name,
    )
  }
  return map
}

/** Map of project-id → project */
export function buildProjectById(projects) {
  const map = {}
  for (const p of projects) map[p.id] = p
  return map
}

// ── Filtering ────────────────────────────────────────────────────

/** Open tasks assigned to a specific user */
export function filterMyOpen(tasks, userName) {
  return tasks.filter(t =>
    (Array.isArray(t.who) ? t.who.includes(userName) : t.who === userName) && !t.done,
  )
}

/** Overdue open tasks */
export function filterOverdue(tasks) {
  return tasks.filter(t => !t.done && isOverdue(t.due))
}

/** Tasks due on a specific ISO date string */
export function filterDueOn(tasks, isoDate) {
  return tasks.filter(t => t.due === isoDate)
}

/** Tasks due in a range (exclusive of from, inclusive of to) */
export function filterDueInRange(tasks, fromISO, toISO) {
  return tasks.filter(t => t.due && t.due > fromISO && t.due <= toISO)
}

/** Open tasks with no assignee */
export function filterOwnerless(tasks) {
  return tasks.filter(t => {
    if (t.done) return false
    if (Array.isArray(t.who)) return t.who.length === 0
    return !t.who
  })
}

/** Upcoming deadlines: open tasks due between fromISO..toISO, sorted by due */
export function filterUpcomingDeadlines(tasks, fromISO, toISO, limit = 15) {
  return tasks
    .filter(t => !t.done && t.due && t.due >= fromISO && t.due <= toISO)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, limit)
}

// ── Project-level metrics ────────────────────────────────────────

/** Health score per project: { ...project, total, done, pct, overdue, health } */
export function computeProjectHealth(tasks, projects, limit = 6) {
  return projects.map(p => {
    const pt = tasks.filter(t => t.pid === p.id)
    const total = pt.length
    const done = pt.filter(t => t.done).length
    const od = pt.filter(t => !t.done && isOverdue(t.due)).length
    const pct = total > 0 ? Math.round(done / total * 100) : 0
    const odPct = total > 0 ? od / total : 0
    const health = total === 0 ? 'good' : odPct > 0.25 ? 'critical' : odPct > 0.10 ? 'warning' : 'good'
    return { ...p, total, done, pct, overdue: od, health }
  }).slice(0, limit)
}

/** Completion stats per project: { ...project, total, done, pct } */
export function computeProjectStats(tasks, projects) {
  return projects.map(p => {
    const pt = tasks.filter(t => t.pid === p.id)
    const done = pt.filter(t => t.done).length
    return { ...p, total: pt.length, done, pct: pt.length ? Math.round(done / pt.length * 100) : 0 }
  })
}

/** Overdue count per project, sorted descending, filtered to >0 */
export function computeOverdueByProject(tasks, projects, limit = 6) {
  return projects.map(p => {
    const od = tasks.filter(t => t.pid === p.id && !t.done && isOverdue(t.due)).length
    return { name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name, overdue: od, color: p.color }
  }).filter(d => d.overdue > 0).sort((a, b) => b.overdue - a.overdue).slice(0, limit)
}

// ── User-level metrics ───────────────────────────────────────────

/** Workload per user: { name, open, color, level } */
export function computeWorkload(userTaskMap, users, threshold = 8) {
  return users.map(u => {
    const open = (userTaskMap[u.name] ?? []).filter(t => !t.done).length
    const level = open > threshold ? 'overloaded' : open > threshold / 2 ? 'balanced' : 'light'
    return { name: u.name.split(' ')[0], open, color: u.color, level }
  }).filter(d => d.open > 0).sort((a, b) => b.open - a.open)
}

/** Tasks per person (open + done): { name, open, done, color } */
export function computeTasksPerPerson(userTaskMap, users) {
  return users.map(u => {
    const ut = userTaskMap[u.name] ?? []
    return { name: u.name.split(' ')[0], open: ut.filter(t => !t.done).length, done: ut.filter(t => t.done).length, color: u.color }
  }).filter(d => d.open + d.done > 0)
}

// ── Section / status metrics ─────────────────────────────────────

/** Task count by section name: [{ name, value, color }] */
const STATUS_COLORS = ['var(--c-brand)', 'var(--c-warning)', 'var(--c-success)', 'var(--tx3)', 'var(--c-purple)', 'var(--c-lime)']

export function computeStatusDistribution(tasks) {
  const counts = {}
  for (const t of tasks) {
    const sec = t.sec ?? 'Other'
    counts[sec] = (counts[sec] ?? 0) + 1
  }
  return Object.entries(counts).map(([name, value], i) => ({
    name, value, color: STATUS_COLORS[i % STATUS_COLORS.length],
  }))
}

// ── Partner-level metrics ────────────────────────────────────────

/** Tasks per partner (open + done): [{ id, name, type, open, done, overdue }] */
export function computeTasksPerPartner(tasks, partners) {
  return partners.filter(p => p.isActive).map(p => {
    const pt = tasks.filter(t => t.partnerId === p.id)
    const open = pt.filter(t => !t.done).length
    const done = pt.filter(t => t.done).length
    const overdue = pt.filter(t => !t.done && isOverdue(t.due)).length
    return { id: p.id, name: p.name.length > 16 ? p.name.slice(0, 16) + '…' : p.name, type: p.type, open, done, overdue }
  }).filter(d => d.open + d.done > 0).sort((a, b) => (b.open + b.done) - (a.open + a.done))
}

/** Section completion per project: [{ project, sections: { [sec]: { total, done } }, total }] */
export function computeSectionCompletion(tasks, projects, limit = 6) {
  return projects.slice(0, limit).map(p => {
    const pt = tasks.filter(t => t.pid === p.id)
    const secCounts = {}
    for (const t of pt) {
      const sec = t.sec ?? 'Other'
      if (!secCounts[sec]) secCounts[sec] = { total: 0, done: 0 }
      secCounts[sec].total++
      if (t.done) secCounts[sec].done++
    }
    return { project: p, sections: secCounts, total: pt.length }
  }).filter(d => d.total > 0)
}
