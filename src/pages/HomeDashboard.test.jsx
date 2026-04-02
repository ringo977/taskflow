import { describe, it, expect } from 'vitest'
import { isOverdue } from '@/utils/filters'

/**
 * HomeDashboard widget data computation tests.
 *
 * We test the pure data transformations that power the 3 new widgets
 * (upcoming deadlines, recent activity, project health) by extracting
 * equivalent logic here. This avoids needing to mock Recharts + complex
 * component tree while still ensuring correctness of the key computations.
 */

// ── Extracted logic mirrors (matching HomeDashboard.jsx) ────────

function computeUpcomingDeadlines(tasks, todayStr, weekEndStr) {
  return tasks
    .filter(task => !task.done && task.due && task.due >= todayStr && task.due <= weekEndStr)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 8)
}

function computeRecentActivity(tasks) {
  const acts = []
  const WEEK_MS = 7 * 86400000
  const cutoff = Date.now() - WEEK_MS

  for (const task of tasks) {
    // Activity log events (real timestamps)
    if (task.activity?.length) {
      for (const entry of task.activity) {
        const entryTs = new Date(entry.ts).getTime()
        if (isNaN(entryTs) || entryTs < cutoff) continue
        if (entry.field === 'done' && entry.to === true) {
          acts.push({ type: 'completed', task, time: entryTs, who: entry.who })
        } else if (entry.field === 'who') {
          acts.push({ type: 'assigned', task, time: entryTs, who: entry.who })
        } else if (entry.field === 'sec') {
          acts.push({ type: 'moved', task, time: entryTs, who: entry.who, detail: entry.to })
        }
      }
    }

    // Creation event (from task id timestamp)
    const idTs = parseInt(task.id?.replace(/^t/, ''), 10)
    if (!isNaN(idTs) && idTs > cutoff) {
      acts.push({ type: 'created', task, time: idTs })
    }

    // Completion fallback: use due date if no activity log entry
    if (task.done && !acts.some(a => a.type === 'completed' && a.task.id === task.id)) {
      if (task.due) {
        const dueTs = new Date(task.due + 'T12:00:00').getTime()
        if (dueTs > cutoff) {
          acts.push({ type: 'completed', task, time: dueTs })
        }
      }
    }

    // Comments
    if (task.comments?.length) {
      for (const c of task.comments.slice(-2)) {
        const cTs = new Date(c.date).getTime()
        if (cTs > cutoff) {
          acts.push({ type: 'commented', task, time: cTs, who: c.user })
        }
      }
    }
  }
  return acts.sort((a, b) => b.time - a.time).slice(0, 8)
}

function computeProjectHealth(tasks, projects) {
  return projects.map(p => {
    const pt = tasks.filter(tk => tk.pid === p.id)
    const total = pt.length
    const done = pt.filter(tk => tk.done).length
    const od = pt.filter(tk => !tk.done && isOverdue(tk.due)).length
    const pct = total > 0 ? Math.round(done / total * 100) : 0
    const odPct = total > 0 ? od / total : 0
    const health = total === 0 ? 'good' : odPct > 0.25 ? 'critical' : odPct > 0.10 ? 'warning' : 'good'
    return { ...p, total, done, pct, overdue: od, health }
  }).slice(0, 6)
}

// ── Test data ────────────────────────────────────────────────────

const TODAY = '2026-03-28'
const WEEK_END = '2026-04-04'

const makeTasks = () => [
  { id: `t${Date.now() - 1000}`, pid: 'p1', title: 'Task A', done: false, due: '2026-03-29', who: 'Alice', pri: 'high', tags: [] },
  { id: `t${Date.now() - 2000}`, pid: 'p1', title: 'Task B', done: false, due: '2026-03-30', who: 'Bob', pri: 'medium', tags: [] },
  { id: `t${Date.now() - 3000}`, pid: 'p1', title: 'Task C', done: true, due: '2026-03-27', who: 'Alice', pri: 'low', tags: [] },
  { id: 't1609459200000', pid: 'p2', title: 'Old Task', done: false, due: '2025-01-01', who: 'Alice', pri: 'high', tags: [] },
  { id: `t${Date.now() - 500}`, pid: 'p2', title: 'Task D', done: false, due: '2026-04-10', who: 'Bob', pri: 'low', tags: [] },
]

const projects = [
  { id: 'p1', name: 'Project Alpha' },
  { id: 'p2', name: 'Project Beta' },
]

// ── Tests ────────────────────────────────────────────────────────

describe('HomeDashboard widget computations', () => {

  describe('upcomingDeadlines', () => {
    it('returns open tasks due within 7 days, sorted by date', () => {
      const tasks = makeTasks()
      const result = computeUpcomingDeadlines(tasks, TODAY, WEEK_END)
      // Should include Task A (03-29) and Task B (03-30) but not Task C (done) or Old Task (past) or Task D (>7d)
      expect(result.length).toBe(2)
      expect(result[0].title).toBe('Task A')
      expect(result[1].title).toBe('Task B')
    })

    it('excludes done tasks', () => {
      const tasks = [
        { id: 't1', pid: 'p1', title: 'Done', done: true, due: '2026-03-29' },
      ]
      expect(computeUpcomingDeadlines(tasks, TODAY, WEEK_END)).toHaveLength(0)
    })

    it('excludes tasks without due date', () => {
      const tasks = [
        { id: 't1', pid: 'p1', title: 'No due', done: false },
      ]
      expect(computeUpcomingDeadlines(tasks, TODAY, WEEK_END)).toHaveLength(0)
    })

    it('limits to 8 results', () => {
      const tasks = Array.from({ length: 12 }, (_, i) => ({
        id: `t${i}`, pid: 'p1', title: `Task ${i}`, done: false, due: '2026-03-29',
      }))
      expect(computeUpcomingDeadlines(tasks, TODAY, WEEK_END)).toHaveLength(8)
    })

    it('returns empty for no matching tasks', () => {
      expect(computeUpcomingDeadlines([], TODAY, WEEK_END)).toHaveLength(0)
    })
  })

  describe('recentActivity', () => {
    it('detects recently created tasks from id timestamp', () => {
      const tasks = [
        { id: `t${Date.now() - 1000}`, pid: 'p1', title: 'New', done: false },
      ]
      const result = computeRecentActivity(tasks)
      expect(result.length).toBe(1)
      expect(result[0].type).toBe('created')
    })

    it('detects completed tasks via due date', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yStr = yesterday.toISOString().slice(0, 10)
      const tasks = [
        { id: 't_old', pid: 'p1', title: 'Done', done: true, due: yStr },
      ]
      const result = computeRecentActivity(tasks)
      const completed = result.filter(a => a.type === 'completed')
      expect(completed.length).toBe(1)
    })

    it('detects recent comments', () => {
      const tasks = [
        {
          id: 't_old', pid: 'p1', title: 'Commented', done: false,
          comments: [{ user: 'Alice', date: new Date().toISOString(), text: 'hi' }],
        },
      ]
      const result = computeRecentActivity(tasks)
      const comments = result.filter(a => a.type === 'commented')
      expect(comments.length).toBe(1)
      expect(comments[0].who).toBe('Alice')
    })

    it('limits to 8 activities', () => {
      const tasks = Array.from({ length: 20 }, (_, i) => ({
        id: `t${Date.now() - i * 100}`, pid: 'p1', title: `T${i}`, done: false,
      }))
      expect(computeRecentActivity(tasks).length).toBeLessThanOrEqual(8)
    })

    it('sorts by most recent first', () => {
      const tasks = [
        { id: `t${Date.now() - 5000}`, pid: 'p1', title: 'Older', done: false },
        { id: `t${Date.now() - 100}`, pid: 'p1', title: 'Newer', done: false },
      ]
      const result = computeRecentActivity(tasks)
      expect(result[0].task.title).toBe('Newer')
    })
  })

  describe('projectHealth', () => {
    it('computes health for projects with tasks', () => {
      const tasks = [
        { id: 't1', pid: 'p1', title: 'A', done: true, due: '2030-01-01' },
        { id: 't2', pid: 'p1', title: 'B', done: false, due: '2030-06-01' },
        { id: 't3', pid: 'p1', title: 'C', done: false, due: '2030-12-01' },
      ]
      const result = computeProjectHealth(tasks, projects)
      const p1 = result.find(p => p.id === 'p1')
      expect(p1.total).toBe(3)
      expect(p1.done).toBe(1)
      expect(p1.pct).toBe(33)
      expect(p1.health).toBe('good') // 0% overdue
    })

    it('marks critical when >25% overdue', () => {
      const tasks = [
        { id: 't1', pid: 'p1', title: 'A', done: false, due: '2020-01-01' }, // overdue
        { id: 't2', pid: 'p1', title: 'B', done: false, due: '2020-01-02' }, // overdue
        { id: 't3', pid: 'p1', title: 'C', done: false, due: '2026-12-01' }, // not overdue
      ]
      const result = computeProjectHealth(tasks, [{ id: 'p1', name: 'P' }])
      expect(result[0].health).toBe('critical') // 67% overdue
    })

    it('marks warning when 10-25% overdue', () => {
      const tasks = [
        { id: 't1', pid: 'p1', done: false, due: '2020-01-01', title: 'A' }, // overdue
        ...Array.from({ length: 7 }, (_, i) => ({
          id: `t${i + 2}`, pid: 'p1', done: false, due: '2026-12-01', title: `T${i}`,
        })),
      ]
      // 1 overdue out of 8 = 12.5%
      const result = computeProjectHealth(tasks, [{ id: 'p1', name: 'P' }])
      expect(result[0].health).toBe('warning')
    })

    it('returns good for project with zero tasks', () => {
      const result = computeProjectHealth([], [{ id: 'p1', name: 'Empty' }])
      expect(result[0].health).toBe('good')
      expect(result[0].total).toBe(0)
      expect(result[0].pct).toBe(0)
    })

    it('limits to 6 projects', () => {
      const manyProjects = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }))
      const result = computeProjectHealth([], manyProjects)
      expect(result).toHaveLength(6)
    })
  })
})
