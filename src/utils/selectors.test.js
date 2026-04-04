import { describe, it, expect } from 'vitest'
import {
  buildUserTaskMap, buildProjectById,
  filterMyOpen, filterOverdue, filterDueOn, filterDueInRange,
  filterOwnerless, filterUpcomingDeadlines,
  computeProjectHealth, computeProjectStats, computeOverdueByProject,
  computeWorkload, computeTasksPerPerson,
  computeStatusDistribution, computeSectionCompletion,
  computeTasksPerPartner,
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
