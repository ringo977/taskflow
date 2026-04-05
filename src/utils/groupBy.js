/**
 * groupBy — shared task grouping logic for Board and List views (F2.1).
 *
 * Takes a list of tasks and a groupBy key, returns an array of groups:
 *   [{ key: string, label: string, color?: string, tasks: Task[] }]
 *
 * Supported groupBy keys:
 *   - 'section'    (default) — group by task.sec
 *   - 'wp'         — group by task.workpackageId
 *   - 'milestone'  — group by task.milestoneId
 *   - 'assignee'   — group by task.who (first assignee)
 *   - 'priority'   — group by task.pri
 *   - 'partner'    — group by task.partnerId
 */

const PRIORITY_ORDER = ['high', 'medium', 'low']
const PRIORITY_COLORS = {
  high:   'var(--c-danger)',
  medium: 'var(--c-warning)',
  low:    'var(--c-success)',
}

export const GROUP_BY_OPTIONS = ['section', 'wp', 'milestone', 'assignee', 'priority', 'partner']

/**
 * @param {Array} tasks - filtered tasks
 * @param {string} groupKey - one of GROUP_BY_OPTIONS
 * @param {Object} lookups - { sections, wpById, msById, partnerById, t }
 * @returns {Array<{ key: string, label: string, color?: string, tasks: Task[] }>}
 */
export function groupTasks(tasks, groupKey, lookups = {}) {
  const { sections = [], wpById = {}, msById = {}, partnerById = {}, t = {} } = lookups

  switch (groupKey) {
    case 'wp':
      return groupByField(tasks, 'workpackageId', id => {
        const wp = wpById[id]
        return wp ? { label: `${wp.code} ${wp.name}`, color: 'var(--c-purple, #9C27B0)' } : null
      }, t.noWorkpackage ?? 'No WP')

    case 'milestone':
      return groupByField(tasks, 'milestoneId', id => {
        const ms = msById[id]
        return ms ? { label: `◆ ${ms.code} ${ms.name}`, color: 'var(--c-success, #4CAF50)' } : null
      }, t.noMilestone ?? 'No milestone')

    case 'assignee':
      return groupByAssignee(tasks, t.unassigned ?? 'Unassigned')

    case 'priority':
      return groupByPriority(tasks, t)

    case 'partner':
      return groupByField(tasks, 'partnerId', id => {
        const p = partnerById[id]
        return p ? { label: p.name, color: 'var(--c-brand)' } : null
      }, t.noPartnerGroup ?? 'No partner')

    case 'section':
    default:
      return groupBySection(tasks, sections)
  }
}

// ── Internal helpers ────────────────────────────────────────

function groupBySection(tasks, sections) {
  const groups = sections.map(sec => ({
    key: sec,
    label: sec,
    tasks: tasks.filter(tk => tk.sec === sec),
  }))
  // Include tasks whose section doesn't match any known section
  const knownSecs = new Set(sections)
  const orphans = tasks.filter(tk => !knownSecs.has(tk.sec))
  if (orphans.length > 0) {
    groups.push({ key: '__orphan__', label: 'Other', tasks: orphans })
  }
  return groups
}

function groupByField(tasks, field, resolve, noLabel) {
  const map = new Map()
  const noGroup = []

  for (const task of tasks) {
    const val = task[field]
    if (!val) { noGroup.push(task); continue }
    if (!map.has(val)) map.set(val, [])
    map.get(val).push(task)
  }

  const groups = []
  for (const [id, grpTasks] of map) {
    const info = resolve(id)
    if (info) {
      groups.push({ key: id, label: info.label, color: info.color, tasks: grpTasks })
    } else {
      noGroup.push(...grpTasks)
    }
  }

  if (noGroup.length > 0) {
    groups.push({ key: '__none__', label: noLabel, tasks: noGroup })
  }

  return groups
}

function groupByAssignee(tasks, unassignedLabel) {
  const map = new Map()
  const noAssignee = []

  for (const task of tasks) {
    const who = Array.isArray(task.who) ? task.who[0] : task.who
    if (!who) { noAssignee.push(task); continue }
    if (!map.has(who)) map.set(who, [])
    map.get(who).push(task)
  }

  const groups = [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, grpTasks]) => ({ key: name, label: name, tasks: grpTasks }))

  if (noAssignee.length > 0) {
    groups.push({ key: '__none__', label: unassignedLabel, tasks: noAssignee })
  }

  return groups
}

function groupByPriority(tasks, t) {
  const map = { high: [], medium: [], low: [] }
  const noPri = []

  for (const task of tasks) {
    if (task.pri && map[task.pri]) {
      map[task.pri].push(task)
    } else {
      noPri.push(task)
    }
  }

  const groups = PRIORITY_ORDER
    .filter(p => map[p].length > 0)
    .map(p => ({
      key: p,
      label: t[p] ?? p.charAt(0).toUpperCase() + p.slice(1),
      color: PRIORITY_COLORS[p],
      tasks: map[p],
    }))

  if (noPri.length > 0) {
    groups.push({ key: '__none__', label: t.noPriority ?? 'No priority', tasks: noPri })
  }

  return groups
}
