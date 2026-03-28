import { describe, it, expect } from 'vitest'
import { applyFilters, isOverdue } from './filters'

const makeTasks = () => [
  { id: '1', title: 'Design landing page', desc: 'Figma mockup', pri: 'high', who: 'alice', done: false, due: '2026-01-10', sec: 'To Do', tags: [{ name: 'design' }] },
  { id: '2', title: 'Setup CI pipeline', desc: '', pri: 'medium', who: 'bob', done: true, due: '2026-03-01', sec: 'Done', tags: [] },
  { id: '3', title: 'Write unit tests', desc: 'Vitest coverage', pri: 'low', who: 'alice', done: false, due: null, sec: 'In Progress', tags: [{ name: 'dev' }] },
]

describe('applyFilters', () => {
  it('returns all tasks with empty filters', () => {
    const tasks = makeTasks()
    expect(applyFilters(tasks, {})).toHaveLength(3)
  })

  it('filters by text query on title', () => {
    expect(applyFilters(makeTasks(), { q: 'landing' })).toHaveLength(1)
  })

  it('filters by text query on description', () => {
    expect(applyFilters(makeTasks(), { q: 'figma' })).toHaveLength(1)
  })

  it('filters by text query on tags', () => {
    expect(applyFilters(makeTasks(), { q: 'design' })).toHaveLength(1)
  })

  it('filters by priority', () => {
    expect(applyFilters(makeTasks(), { pri: 'high' })).toHaveLength(1)
    expect(applyFilters(makeTasks(), { pri: 'all' })).toHaveLength(3)
  })

  it('filters by assignee', () => {
    expect(applyFilters(makeTasks(), { who: 'alice' })).toHaveLength(2)
    expect(applyFilters(makeTasks(), { who: 'all' })).toHaveLength(3)
  })

  it('filters by done/open status', () => {
    expect(applyFilters(makeTasks(), { done: 'open' })).toHaveLength(2)
    expect(applyFilters(makeTasks(), { done: 'done' })).toHaveLength(1)
  })

  it('filters by tag', () => {
    expect(applyFilters(makeTasks(), { tag: 'dev' })).toHaveLength(1)
    expect(applyFilters(makeTasks(), { tag: 'all' })).toHaveLength(3)
  })

  it('filters by due=overdue', () => {
    // Task 1 has due 2026-01-10 which is overdue by now (we're in March 2026)
    const result = applyFilters(makeTasks(), { due: 'overdue' })
    expect(result.length).toBeGreaterThanOrEqual(1)
    result.forEach(t => expect(t.due).toBeTruthy())
  })

  it('filters by due=today', () => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const tasks = [
      ...makeTasks(),
      { id: '4', title: 'Today task', desc: '', pri: 'low', who: 'bob', done: false, due: todayStr, sec: 'To Do', tags: [] },
    ]
    const result = applyFilters(tasks, { due: 'today' })
    expect(result).toHaveLength(1)
    expect(result[0].due).toBe(todayStr)
  })

  it('filters by due=week', () => {
    const now = new Date()
    const inThreeDays = new Date(now)
    inThreeDays.setDate(now.getDate() + 3)
    const dueStr = inThreeDays.toISOString().slice(0, 10)
    const tasks = [
      { id: '1', title: 'Soon', desc: '', pri: 'low', who: 'alice', done: false, due: dueStr, sec: 'To Do', tags: [] },
      { id: '2', title: 'Far', desc: '', pri: 'low', who: 'alice', done: false, due: '2099-01-01', sec: 'To Do', tags: [] },
    ]
    const result = applyFilters(tasks, { due: 'week' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Soon')
  })

  it('filters by due excludes tasks with no due date', () => {
    const tasks = [
      { id: '1', title: 'No due', desc: '', pri: 'low', who: 'alice', done: false, due: null, sec: 'To Do', tags: [] },
    ]
    expect(applyFilters(tasks, { due: 'overdue' })).toHaveLength(0)
    expect(applyFilters(tasks, { due: 'today' })).toHaveLength(0)
    expect(applyFilters(tasks, { due: 'week' })).toHaveLength(0)
  })

  it('due=all passes all tasks', () => {
    expect(applyFilters(makeTasks(), { due: 'all' })).toHaveLength(3)
  })

  it('combines multiple filters', () => {
    const result = applyFilters(makeTasks(), { who: 'alice', done: 'open' })
    expect(result).toHaveLength(2)
    expect(result.every((t) => t.who === 'alice' && !t.done)).toBe(true)
  })
})

describe('isOverdue', () => {
  it('returns false for null/undefined due', () => {
    expect(isOverdue(null)).toBe(false)
    expect(isOverdue(undefined)).toBe(false)
  })

  it('returns true for past dates', () => {
    expect(isOverdue('2020-01-01')).toBe(true)
  })

  it('returns false for far future dates', () => {
    expect(isOverdue('2099-12-31')).toBe(false)
  })
})
