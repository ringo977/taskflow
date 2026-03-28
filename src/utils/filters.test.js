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
