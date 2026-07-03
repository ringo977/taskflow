import { describe, it, expect } from 'vitest'
import {
  buildUserTaskMap, buildProjectById,
  filterMyOpen, filterOverdue, filterDueOn, filterDueInRange,
  filterOwnerless, filterUpcomingDeadlines,
  computeProjectHealth, computeProjectStats, computeOverdueByProject,
  computeWorkload, computeTasksPerPerson,
  computeStatusDistribution, computeSectionCompletion,
  computeTasksPerPartner, computeTasksPerWorkpackage, computeTasksPerMilestone,
  computeUpcomingMilestones,
} from './selectors'

// ── Fixtures ──────────────────────────────────────────────────────
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
const today = new Date().toISOString().slice(0, 10)
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
const nextWeek = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10)

const tasks = [
  { id: 't1', pid: 'p1', title: 'A', who: ['Alice'], done: false, due: yesterday, pri: 'high', sec: 'Todo' },
  { id: 't2', pid: 'p1', title: 'B', who: ['Bob'],   done: false, due: today,     pri: 'low',  sec: 'Todo' },
  { id: 't3', pid: 'p1', title: 'C', who: ['Alice'], done: true,  due: yesterday, pri: 'medium', sec: 'Done' },
  { id: 't4', pid: 'p2', title: 'D', who: [],        done: false, due: tomorrow,  pri: 'high', sec: 'In Progress' },
  { id: 't5', pid: 'p2', title: 'E', who: ['Alice'], done: false, due: nextWeek,  pri: 'medium', sec: 'Todo' },
  { id: 't6', pid: 'p2', title: 'F', who: null,      done: false, due: null,      pri: 'low',  sec: 'Backlog' },
]

const users = [
  { name: 'Alice', color: '#f00' },
  { name: 'Bob',   color: '#0f0' },
  { name: 'Carol', color: '#00f' },
]

const projects = [
  { id: 'p1', name: 'Project Alpha', color: '#aaa' },
  { id: 'p2', name: 'Project Beta',  color: '#bbb' },
]

// ── Lookup maps ──────────────────────────────────────────────────

describe('buildUserTaskMap', () => {
  it('maps users to their tasks', () => {
    const map = buildUserTaskMap(tasks, users)
    expect(map['Alice']).toHaveLength(3) // t1, t3, t5
    expect(map['Bob']).toHaveLength(1)   // t2
    expect(map['Carol']).toHaveLength(0)
  })

  it('handles empty inputs', () => {
    expect(buildUserTaskMap([], users)).toEqual({ Alice: [], Bob: [], Carol: [] })
    expect(buildUserTaskMap(tasks, [])).toEqual({})
  })
})

describe('buildProjectById', () => {
  it('maps project id to project', () => {
    const map = buildProjectById(projects)
    expect(map['p1'].name).toBe('Project Alpha')
    expect(map['p2'].name).toBe('Project Beta')
  })

  it('returns empty for no projects', () => {
    expect(buildProjectById([])).toEqual({})
  })
})

// ── Filtering ────────────────────────────────────────────────────

describe('filterMyOpen', () => {
  it('returns open tasks for a user', () => {
    const result = filterMyOpen(tasks, 'Alice')
    expect(result.map(t => t.id)).toEqual(['t1', 't5'])
  })

  it('excludes done tasks', () => {
    expect(filterMyOpen(tasks, 'Alice').every(t => !t.done)).toBe(true)
  })
})

describe('filterOverdue', () => {
  it('returns open tasks past due', () => {
    const result = filterOverdue(tasks)
    expect(result.map(t => t.id)).toEqual(['t1'])
  })
})

describe('filterDueOn', () => {
  it('returns tasks due on a specific date', () => {
    const result = filterDueOn(tasks, today)
    expect(result.map(t => t.id)).toEqual(['t2'])
  })
})

describe('filterDueInRange', () => {
  it('returns tasks due between dates (exclusive from, inclusive to)', () => {
    const result = filterDueInRange(tasks, today, nextWeek)
    expect(result.map(t => t.id)).toEqual(['t4', 't5'])
  })

  it('returns empty for no matches', () => {
    expect(filterDueInRange(tasks, nextWeek, nextWeek)).toEqual([])
  })
})

describe('filterOwnerless', () => {
  it('returns open tasks with no assignee', () => {
    const result = filterOwnerless(tasks)
    expect(result.map(t => t.id)).toEqual(['t4', 't6']) // empty array and null
  })
})

describe('filterUpcomingDeadlines', () => {
  it('returns open tasks due in range, sorted by due', () => {
    const result = filterUpcomingDeadlines(tasks, today, nextWeek)
    expect(result[0].due <= result[result.length - 1].due).toBe(true)
  })

  it('respects limit', () => {
    const result = filterUpcomingDeadlines(tasks, yesterday, nextWeek, 2)
    expect(result).toHaveLength(2)
  })
})

// ── Project metrics ──────────────────────────────────────────────

describe('computeProjectHealth', () => {
  it('computes health per project', () => {
    const result = computeProjectHealth(tasks, projects)
    const p1 = result.find(r => r.id === 'p1')
    expect(p1.total).toBe(3)
    expect(p1.done).toBe(1)
    expect(p1.overdue).toBe(1)
    expect(['good', 'warning', 'critical']).toContain(p1.health)
  })

  it('returns good for projects with no tasks', () => {
    const result = computeProjectHealth([], projects)
    expect(result.every(r => r.health === 'good')).toBe(true)
  })
})

describe('computeProjectStats', () => {
  it('computes completion per project', () => {
    const result = computeProjectStats(tasks, projects)
    const p1 = result.find(r => r.id === 'p1')
    expect(p1.total).toBe(3)
    expect(p1.done).toBe(1)
    expect(p1.pct).toBe(33)
  })
})

describe('computeOverdueByProject', () => {
  it('counts overdue tasks per project', () => {
    const result = computeOverdueByProject(tasks, projects)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].overdue).toBeGreaterThan(0)
  })

  it('excludes projects with 0 overdue', () => {
    const noOverdue = tasks.map(t => ({ ...t, due: nextWeek }))
    expect(computeOverdueByProject(noOverdue, projects)).toEqual([])
  })
})

// ── User metrics ─────────────────────────────────────────────────

describe('computeWorkload', () => {
  it('computes workload level per user', () => {
    const map = buildUserTaskMap(tasks, users)
    const result = computeWorkload(map, users, 3)
    const alice = result.find(r => r.name === 'Alice'.split(' ')[0])
    expect(alice).toBeDefined()
    expect(['light', 'balanced', 'overloaded']).toContain(alice.level)
  })

  it('excludes users with 0 open tasks', () => {
    const map = buildUserTaskMap(tasks, users)
    const result = computeWorkload(map, users)
    expect(result.find(r => r.name === 'Carol')).toBeUndefined()
  })
})

describe('computeTasksPerPerson', () => {
  it('returns open/done split per user', () => {
    const map = buildUserTaskMap(tasks, users)
    const result = computeTasksPerPerson(map, users)
    const alice = result.find(r => r.name === 'Alice')
    expect(alice.open).toBe(2)
    expect(alice.done).toBe(1)
  })
})

// ── Section metrics ──────────────────────────────────────────────

describe('computeStatusDistribution', () => {
  it('counts tasks by section', () => {
    const result = computeStatusDistribution(tasks)
    const todo = result.find(r => r.name === 'Todo')
    expect(todo.value).toBe(3) // t1, t2, t5
  })

  it('handles empty tasks', () => {
    expect(computeStatusDistribution([])).toEqual([])
  })
})

describe('computeSectionCompletion', () => {
  it('computes per-project section breakdown', () => {
    const result = computeSectionCompletion(tasks, projects)
    const p1 = result.find(r => r.project.id === 'p1')
    expect(p1.sections['Todo'].total).toBe(2)
    expect(p1.sections['Done'].done).toBe(1)
  })

  it('excludes projects with 0 tasks', () => {
    const result = computeSectionCompletion([], projects)
    expect(result).toEqual([])
  })
})

// ── Partner metrics ─────────────────────────────────────────────

describe('computeTasksPerPartner', () => {
  const partners = [
    { id: 'pt1', name: 'Acme Corp', type: 'vendor', isActive: true },
    { id: 'pt2', name: 'Lab X', type: 'lab', isActive: true },
    { id: 'pt3', name: 'Inactive Co', type: 'partner', isActive: false },
  ]
  const ptTasks = [
    { id: 't1', partnerId: 'pt1', done: false, due: yesterday, pri: 'high' },
    { id: 't2', partnerId: 'pt1', done: true,  due: today,     pri: 'low' },
    { id: 't3', partnerId: 'pt2', done: false, due: tomorrow,  pri: 'medium' },
    { id: 't4', partnerId: null,  done: false, due: null,      pri: 'low' },
  ]

  it('groups open/done/overdue by active partner', () => {
    const result = computeTasksPerPartner(ptTasks, partners)
    expect(result).toHaveLength(2) // pt1 and pt2, not pt3 (inactive)
    const acme = result.find(r => r.id === 'pt1')
    expect(acme.open).toBe(1)
    expect(acme.done).toBe(1)
    expect(acme.overdue).toBe(1) // t1 due yesterday
    const lab = result.find(r => r.id === 'pt2')
    expect(lab.open).toBe(1)
    expect(lab.done).toBe(0)
  })

  it('excludes inactive partners', () => {
    const result = computeTasksPerPartner(ptTasks, partners)
    expect(result.find(r => r.id === 'pt3')).toBeUndefined()
  })

  it('excludes partners with zero tasks', () => {
    const result = computeTasksPerPartner([], partners)
    expect(result).toEqual([])
  })

  it('handles empty partners list', () => {
    expect(computeTasksPerPartner(ptTasks, [])).toEqual([])
  })
})

// ── Workpackage metrics ─────────────────────────────────────────

describe('computeTasksPerWorkpackage', () => {
  const wps = [
    { id: 'wp1', code: 'WP1', name: 'Analysis', status: 'active', isActive: true },
    { id: 'wp2', code: 'WP2', name: 'Development', status: 'draft', isActive: true },
    { id: 'wp3', code: 'WP3', name: 'Archived', status: 'complete', isActive: false },
  ]
  const wpTasks = [
    { id: 't1', workpackageId: 'wp1', done: false, due: yesterday, pri: 'high' },
    { id: 't2', workpackageId: 'wp1', done: true,  due: today,     pri: 'low' },
    { id: 't3', workpackageId: 'wp2', done: false, due: tomorrow,  pri: 'medium' },
    { id: 't4', workpackageId: null,  done: false, due: null,      pri: 'low' },
  ]

  it('groups open/done/overdue by active WP', () => {
    const result = computeTasksPerWorkpackage(wpTasks, wps)
    expect(result).toHaveLength(2) // wp1 and wp2, not wp3 (inactive)
    const wp1 = result.find(r => r.id === 'wp1')
    expect(wp1.code).toBe('WP1')
    expect(wp1.open).toBe(1)
    expect(wp1.done).toBe(1)
    expect(wp1.overdue).toBe(1) // t1 due yesterday
    const wp2 = result.find(r => r.id === 'wp2')
    expect(wp2.open).toBe(1)
    expect(wp2.done).toBe(0)
  })

  it('excludes inactive WPs', () => {
    const result = computeTasksPerWorkpackage(wpTasks, wps)
    expect(result.find(r => r.id === 'wp3')).toBeUndefined()
  })

  it('excludes WPs with zero tasks', () => {
    const result = computeTasksPerWorkpackage([], wps)
    expect(result).toEqual([])
  })

  it('handles empty workpackages list', () => {
    expect(computeTasksPerWorkpackage(wpTasks, [])).toEqual([])
  })

  it('sorts by total tasks descending', () => {
    const result = computeTasksPerWorkpackage(wpTasks, wps)
    expect(result[0].id).toBe('wp1') // 2 tasks > 1 task
    expect(result[1].id).toBe('wp2')
  })
})

// ── Milestone metrics ──────────────────────────────────────────

describe('computeTasksPerMilestone', () => {
  const milestones = [
    { id: 'ms1', code: 'MS1', name: 'Prototype review', status: 'pending', isActive: true },
    { id: 'ms2', code: 'MS2', name: 'Final delivery', status: 'achieved', isActive: true },
    { id: 'ms3', code: 'MS3', name: 'Archived gate', status: 'missed', isActive: false },
  ]
  const msTasks = [
    { id: 't1', milestoneId: 'ms1', done: false, due: yesterday, pri: 'high' },
    { id: 't2', milestoneId: 'ms1', done: true,  due: today,     pri: 'low' },
    { id: 't3', milestoneId: 'ms2', done: false, due: tomorrow,  pri: 'medium' },
    { id: 't4', milestoneId: null,  done: false, due: null,      pri: 'low' },
  ]

  it('groups open/done/overdue by active milestone', () => {
    const result = computeTasksPerMilestone(msTasks, milestones)
    expect(result).toHaveLength(2) // ms1 and ms2, not ms3 (inactive)
    const ms1 = result.find(r => r.id === 'ms1')
    expect(ms1.code).toBe('MS1')
    expect(ms1.open).toBe(1)
    expect(ms1.done).toBe(1)
    expect(ms1.overdue).toBe(1) // t1 due yesterday
    const ms2 = result.find(r => r.id === 'ms2')
    expect(ms2.open).toBe(1)
    expect(ms2.done).toBe(0)
  })

  it('excludes inactive milestones', () => {
    const result = computeTasksPerMilestone(msTasks, milestones)
    expect(result.find(r => r.id === 'ms3')).toBeUndefined()
  })

  it('excludes milestones with zero tasks', () => {
    const result = computeTasksPerMilestone([], milestones)
    expect(result).toEqual([])
  })

  it('handles empty milestones list', () => {
    expect(computeTasksPerMilestone(msTasks, [])).toEqual([])
  })

  it('sorts by total tasks descending', () => {
    const result = computeTasksPerMilestone(msTasks, milestones)
    expect(result[0].id).toBe('ms1') // 2 tasks > 1 task
    expect(result[1].id).toBe('ms2')
  })
})

// ── Upcoming milestones (cross-project) ─────────────────────────

describe('computeUpcomingMilestones', () => {
  const futureDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  const pastDate = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  const milestones = [
    { id: 'ms1', code: 'M1', name: 'Gate 1', dueDate: futureDate, status: 'pending', isActive: true, projectId: 'p1' },
    { id: 'ms2', code: 'M2', name: 'Gate 2', dueDate: pastDate, status: 'pending', isActive: true, projectId: 'p1' },
    { id: 'ms3', code: 'M3', name: 'Final', dueDate: futureDate, status: 'achieved', isActive: true, projectId: 'p2' },
    { id: 'ms4', code: 'M4', name: 'Inactive', dueDate: futureDate, status: 'pending', isActive: false, projectId: 'p2' },
  ]
  const msTasks = [
    { id: 't1', milestoneId: 'ms1', done: false, pid: 'p1' },
    { id: 't2', milestoneId: 'ms1', done: true,  pid: 'p1' },
    { id: 't3', milestoneId: 'ms2', done: false, pid: 'p1' },
  ]

  it('filters to active, non-achieved, future milestones', () => {
    const result = computeUpcomingMilestones(milestones, msTasks, projects)
    expect(result).toHaveLength(1) // only ms1 (future + active + pending)
    expect(result[0].id).toBe('ms1')
  })

  it('computes task progress per milestone', () => {
    const result = computeUpcomingMilestones(milestones, msTasks, projects)
    expect(result[0].total).toBe(2)
    expect(result[0].done).toBe(1)
    expect(result[0].pct).toBe(50)
  })

  it('attaches project info', () => {
    const result = computeUpcomingMilestones(milestones, msTasks, projects)
    expect(result[0].projectName).toBe('Project Alpha')
    expect(result[0].projectColor).toBe('#aaa')
  })

  it('returns empty for no milestones', () => {
    expect(computeUpcomingMilestones([], msTasks, projects)).toEqual([])
  })

  it('respects limit parameter', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `m${i}`, code: `M${i}`, name: `G${i}`, dueDate: futureDate,
      status: 'pending', isActive: true, projectId: 'p1',
    }))
    const result = computeUpcomingMilestones(many, [], projects, 5)
    expect(result).toHaveLength(5)
  })

  it('includes milestones with null dueDate and sorts them first', () => {
    const noDates = [
      { id: 'nd1', code: 'ND1', name: 'No date A', dueDate: null, status: 'pending', isActive: true, projectId: 'p1' },
      { id: 'nd2', code: 'ND2', name: 'No date B', dueDate: undefined, status: 'pending', isActive: true, projectId: 'p1' },
      { id: 'wd', code: 'WD', name: 'With date', dueDate: futureDate, status: 'pending', isActive: true, projectId: 'p1' },
    ]
    const result = computeUpcomingMilestones(noDates, [], projects)
    // (dueDate ?? '9') >= today keeps null-dueDate milestones in the list
    expect(result.map(m => m.id)).toContain('nd1')
    expect(result.map(m => m.id)).toContain('nd2')
    // (dueDate ?? '') sorts nullish dates before real ISO dates
    expect(result[result.length - 1].id).toBe('wd')
  })

  it('falls back to empty name and default color for unknown projectId', () => {
    const orphan = [
      { id: 'mx', code: 'MX', name: 'Orphan', dueDate: futureDate, status: 'pending', isActive: true, projectId: 'p-missing' },
    ]
    const result = computeUpcomingMilestones(orphan, [], projects)
    expect(result[0].projectName).toBe('')
    expect(result[0].projectColor).toBe('#888')
  })
})

// ── Branch edge cases ───────────────────────────────────────────

describe('computeProjectHealth — health thresholds', () => {
  const mkTasks = (pid, total, overdue) =>
    Array.from({ length: total }, (_, i) => ({
      id: `${pid}-t${i}`, pid, done: false,
      due: i < overdue ? yesterday : nextWeek,
    }))

  it('flags warning when overdue ratio is between 10% and 25%', () => {
    // 1 overdue of 8 = 12.5%
    const result = computeProjectHealth(mkTasks('p1', 8, 1), [projects[0]])
    expect(result[0].health).toBe('warning')
  })

  it('flags critical when overdue ratio exceeds 25%', () => {
    // 3 overdue of 8 = 37.5%
    const result = computeProjectHealth(mkTasks('p1', 8, 3), [projects[0]])
    expect(result[0].health).toBe('critical')
  })

  it('stays good when overdue ratio is at most 10%', () => {
    // 1 overdue of 10 = 10% (not > 0.10)
    const result = computeProjectHealth(mkTasks('p1', 10, 1), [projects[0]])
    expect(result[0].health).toBe('good')
  })
})

describe('computeProjectStats — empty project', () => {
  it('returns pct 0 for a project with no tasks', () => {
    const result = computeProjectStats(tasks, [{ id: 'p-empty', name: 'Empty' }])
    expect(result[0]).toMatchObject({ total: 0, done: 0, pct: 0 })
  })
})

describe('computeOverdueByProject — name truncation', () => {
  it('truncates project names longer than 14 chars', () => {
    const longProj = [{ id: 'p1', name: 'A very long project name', color: '#ccc' }]
    const result = computeOverdueByProject(tasks, longProj)
    expect(result[0].name).toBe('A very long pr…')
    expect(result[0].name.length).toBe(15)
  })
})

describe('computeWorkload — edge cases', () => {
  it('treats users missing from the map as having no tasks', () => {
    // Carol is a user but the map has no entry for her at all
    const result = computeWorkload({}, users)
    expect(result).toEqual([])
  })

  it('flags overloaded when open tasks exceed threshold', () => {
    const open = Array.from({ length: 4 }, (_, i) => ({ id: `t${i}`, done: false }))
    const map = { Alice: open }
    const result = computeWorkload(map, [users[0]], 3)
    expect(result[0].level).toBe('overloaded')
  })

  it('flags light when open tasks are at most half the threshold', () => {
    const map = { Alice: [{ id: 't1', done: false }] }
    const result = computeWorkload(map, [users[0]], 8)
    expect(result[0].level).toBe('light')
  })
})

describe('computeTasksPerPerson — missing map entry', () => {
  it('treats users missing from the map as having no tasks', () => {
    const result = computeTasksPerPerson({}, users)
    expect(result).toEqual([])
  })
})

describe('computeStatusDistribution — missing section', () => {
  it('buckets tasks without a section under Other', () => {
    const noSec = [{ id: 't1' }, { id: 't2', sec: null }, { id: 't3', sec: 'Todo' }]
    const result = computeStatusDistribution(noSec)
    expect(result.find(r => r.name === 'Other').value).toBe(2)
    expect(result.find(r => r.name === 'Todo').value).toBe(1)
  })
})

describe('computeSectionCompletion — missing section', () => {
  it('buckets tasks without a section under Other', () => {
    const noSec = [
      { id: 't1', pid: 'p1', done: true },
      { id: 't2', pid: 'p1', sec: undefined, done: false },
    ]
    const result = computeSectionCompletion(noSec, [projects[0]])
    expect(result[0].sections['Other']).toEqual({ total: 2, done: 1 })
  })
})

describe('name truncation for partners / WPs / milestones', () => {
  it('truncates partner names longer than 16 chars', () => {
    const partners = [{ id: 'pt1', name: 'Extremely Long Partner Name', type: 'lab', isActive: true }]
    const ptTasks = [{ id: 't1', partnerId: 'pt1', done: false, due: null }]
    const result = computeTasksPerPartner(ptTasks, partners)
    expect(result[0].name).toBe('Extremely Long P…')
  })

  it('truncates workpackage names longer than 16 chars', () => {
    const wps = [{ id: 'wp1', code: 'WP1', name: 'Extremely Long Workpackage', status: 'active', isActive: true }]
    const wpTasks = [{ id: 't1', workpackageId: 'wp1', done: false, due: null }]
    const result = computeTasksPerWorkpackage(wpTasks, wps)
    expect(result[0].name).toBe('Extremely Long W…')
  })

  it('truncates milestone names longer than 16 chars', () => {
    const ms = [{ id: 'ms1', code: 'MS1', name: 'Extremely Long Milestone Name', status: 'pending', isActive: true }]
    const msTasks2 = [{ id: 't1', milestoneId: 'ms1', done: false, due: null }]
    const result = computeTasksPerMilestone(msTasks2, ms)
    expect(result[0].name).toBe('Extremely Long M…')
  })
})
