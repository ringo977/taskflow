import { describe, it, expect } from 'vitest'
import { applyFilters, isOverdue, applyVisibilityFilter } from './filters'

/**
 * Resilience tests for filter utilities.
 *
 * Cover: milestones without due dates, multi-assignee null/empty,
 * edge-case filter combinations, and visibility filter robustness.
 */

// ── Helpers ──────────────────────────────────────────────────

const makeTask = (overrides = {}) => ({
  id: 't1', pid: 'p1', title: 'Task', desc: '', who: ['Alice'],
  pri: 'medium', done: false, due: '2026-04-01', sec: 'To Do',
  tags: [], milestoneId: null, visibility: 'all',
  ...overrides,
})

// ── Milestone without due date ───────────────────────────────

describe('milestones in filters', () => {
  it('milestone without due date excluded by "overdue" filter', () => {
    const tasks = [makeTask({ milestoneId: 'ms-1', due: null })]
    const result = applyFilters(tasks, { due: 'overdue' })
    expect(result).toHaveLength(0)
  })

  it('milestone without due date excluded by "today" filter', () => {
    const tasks = [makeTask({ milestoneId: 'ms-1', due: null })]
    const result = applyFilters(tasks, { due: 'today' })
    expect(result).toHaveLength(0)
  })

  it('milestone without due date excluded by "week" filter', () => {
    const tasks = [makeTask({ milestoneId: 'ms-1', due: null })]
    const result = applyFilters(tasks, { due: 'week' })
    expect(result).toHaveLength(0)
  })

  it('milestone without due date passes through with due=all', () => {
    const tasks = [makeTask({ milestoneId: 'ms-1', due: null })]
    const result = applyFilters(tasks, { due: 'all' })
    expect(result).toHaveLength(1)
  })

  it('milestone without due date passes through with no due filter', () => {
    const tasks = [makeTask({ milestoneId: 'ms-1', due: null })]
    const result = applyFilters(tasks, {})
    expect(result).toHaveLength(1)
  })
})

// ── Multi-assignee filter edge cases ─────────────────────────

describe('multi-assignee filter edge cases', () => {
  it('filters by assignee when who is null', () => {
    const tasks = [makeTask({ who: null })]
    const result = applyFilters(tasks, { who: 'Alice' })
    expect(result).toHaveLength(0)
  })

  it('filters by assignee when who is empty array', () => {
    const tasks = [makeTask({ who: [] })]
    const result = applyFilters(tasks, { who: 'Alice' })
    expect(result).toHaveLength(0)
  })

  it('filters by assignee when who is string (not array)', () => {
    const tasks = [makeTask({ who: 'Bob' })]
    const result = applyFilters(tasks, { who: 'Bob' })
    expect(result).toHaveLength(1)
  })

  it('who="all" matches everyone', () => {
    const tasks = [
      makeTask({ who: ['Alice'] }),
      makeTask({ id: 't2', who: null }),
      makeTask({ id: 't3', who: 'Bob' }),
    ]
    const result = applyFilters(tasks, { who: 'all' })
    expect(result).toHaveLength(3)
  })

  it('multi-assignee array matches any member', () => {
    const tasks = [makeTask({ who: ['Alice', 'Bob', 'Charlie'] })]
    expect(applyFilters(tasks, { who: 'Bob' })).toHaveLength(1)
    expect(applyFilters(tasks, { who: 'Dave' })).toHaveLength(0)
  })
})

// ── isOverdue edge cases ─────────────────────────────────────

describe('isOverdue edge cases', () => {
  it('returns false for null', () => {
    expect(isOverdue(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isOverdue(undefined)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isOverdue('')).toBe(false)
  })

  it('returns true for date far in the past', () => {
    expect(isOverdue('2020-01-01')).toBe(true)
  })

  it('returns false for date far in the future', () => {
    expect(isOverdue('2099-12-31')).toBe(false)
  })

  it('handles invalid date string gracefully', () => {
    // new Date('not-a-date') → Invalid Date → comparison returns false
    expect(isOverdue('not-a-date')).toBe(false)
  })
})

// ── Filter combination edge cases ────────────────────────────

describe('filter combination edge cases', () => {
  it('empty filter object returns all tasks', () => {
    const tasks = [makeTask(), makeTask({ id: 't2' })]
    expect(applyFilters(tasks, {})).toHaveLength(2)
  })

  it('undefined filter returns all tasks', () => {
    const tasks = [makeTask()]
    expect(applyFilters(tasks)).toHaveLength(1)
  })

  it('all filters set to "all" returns all tasks', () => {
    const tasks = [makeTask(), makeTask({ id: 't2', done: true })]
    expect(applyFilters(tasks, { pri: 'all', who: 'all', due: 'all', tag: 'all' })).toHaveLength(2)
  })

  it('search query matches tags', () => {
    const tasks = [makeTask({ tags: [{ name: 'urgent' }] })]
    expect(applyFilters(tasks, { q: 'urgent' })).toHaveLength(1)
  })

  it('search query is case-insensitive', () => {
    const tasks = [makeTask({ title: 'Deploy Frontend' })]
    expect(applyFilters(tasks, { q: 'DEPLOY' })).toHaveLength(1)
  })

  it('search query matches description', () => {
    const tasks = [makeTask({ desc: 'Fix the critical bug in production' })]
    expect(applyFilters(tasks, { q: 'critical' })).toHaveLength(1)
  })

  it('done filter "open" excludes completed tasks', () => {
    const tasks = [makeTask({ done: false }), makeTask({ id: 't2', done: true })]
    expect(applyFilters(tasks, { done: 'open' })).toHaveLength(1)
  })

  it('done filter "done" excludes open tasks', () => {
    const tasks = [makeTask({ done: false }), makeTask({ id: 't2', done: true })]
    expect(applyFilters(tasks, { done: 'done' })).toHaveLength(1)
  })

  it('combined filters narrow results (AND logic)', () => {
    const tasks = [
      makeTask({ pri: 'high', who: ['Alice'], done: false }),
      makeTask({ id: 't2', pri: 'high', who: ['Bob'], done: false }),
      makeTask({ id: 't3', pri: 'low', who: ['Alice'], done: false }),
    ]
    const result = applyFilters(tasks, { pri: 'high', who: 'Alice' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('t1')
  })

  it('handles tasks with no tags when tag filter is active', () => {
    const tasks = [makeTask({ tags: [] }), makeTask({ id: 't2', tags: undefined })]
    expect(applyFilters(tasks, { tag: 'bug' })).toHaveLength(0)
  })
})

// ── Visibility filter resilience ─────────────────────────────

describe('applyVisibilityFilter resilience', () => {
  const project = {
    members: [
      { name: 'Alice', role: 'owner' },
      { name: 'Bob', role: 'viewer' },
      { name: 'Charlie', role: 'editor' },
    ],
    sectionAccess: {
      'Private': 'editors',
    },
  }

  it('returns all tasks when project is null', () => {
    const tasks = [makeTask()]
    expect(applyVisibilityFilter(tasks, null, 'Alice')).toEqual(tasks)
  })

  it('returns all tasks when userName is null', () => {
    const tasks = [makeTask()]
    expect(applyVisibilityFilter(tasks, project, null)).toEqual(tasks)
  })

  it('returns all tasks when userName is empty', () => {
    const tasks = [makeTask()]
    expect(applyVisibilityFilter(tasks, project, '')).toEqual(tasks)
  })

  it('assignees-only task visible to assigned user', () => {
    const tasks = [makeTask({ visibility: 'assignees', who: ['Bob'] })]
    expect(applyVisibilityFilter(tasks, project, 'Bob')).toHaveLength(1)
  })

  it('assignees-only task hidden from non-assigned user', () => {
    const tasks = [makeTask({ visibility: 'assignees', who: ['Alice'] })]
    expect(applyVisibilityFilter(tasks, project, 'Bob')).toHaveLength(0)
  })

  it('assignees-only with who as string (not array)', () => {
    const tasks = [makeTask({ visibility: 'assignees', who: 'Bob' })]
    expect(applyVisibilityFilter(tasks, project, 'Bob')).toHaveLength(1)
  })

  it('assignees-only with who as null hides task', () => {
    const tasks = [makeTask({ visibility: 'assignees', who: null })]
    expect(applyVisibilityFilter(tasks, project, 'Bob')).toHaveLength(0)
  })

  it('editors-only section hidden from viewer', () => {
    const tasks = [makeTask({ sec: 'Private' })]
    expect(applyVisibilityFilter(tasks, project, 'Bob')).toHaveLength(0) // Bob is viewer
  })

  it('editors-only section visible to editor', () => {
    const tasks = [makeTask({ sec: 'Private' })]
    expect(applyVisibilityFilter(tasks, project, 'Charlie')).toHaveLength(1) // Charlie is editor
  })

  it('editors-only section visible to owner', () => {
    const tasks = [makeTask({ sec: 'Private' })]
    expect(applyVisibilityFilter(tasks, project, 'Alice')).toHaveLength(1) // Alice is owner (level 3)
  })

  it('unknown user defaults to viewer role', () => {
    const tasks = [makeTask({ sec: 'Private' })]
    expect(applyVisibilityFilter(tasks, project, 'Unknown')).toHaveLength(0) // defaults to viewer
  })

  it('project with no members treats everyone as viewer', () => {
    const proj = { members: [], sectionAccess: { 'Private': 'editors' } }
    const tasks = [makeTask({ sec: 'Private' })]
    expect(applyVisibilityFilter(tasks, proj, 'Alice')).toHaveLength(0)
  })

  it('project with undefined sectionAccess allows all sections', () => {
    const proj = { members: [{ name: 'Bob', role: 'viewer' }] }
    const tasks = [makeTask({ sec: 'Any Section' })]
    expect(applyVisibilityFilter(tasks, proj, 'Bob')).toHaveLength(1)
  })
})
