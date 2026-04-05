import { describe, it, expect } from 'vitest'
import { groupTasks, GROUP_BY_OPTIONS } from './groupBy'

// ── Fixtures ──────────────────────────────────────────────────
const tasks = [
  { id: 't1', sec: 'Todo', workpackageId: 'wp1', milestoneId: 'm1', who: ['Alice'], pri: 'high', partnerId: 'pa1' },
  { id: 't2', sec: 'Todo', workpackageId: 'wp1', milestoneId: null, who: ['Bob'],   pri: 'low',  partnerId: 'pa1' },
  { id: 't3', sec: 'Done', workpackageId: 'wp2', milestoneId: 'm1', who: ['Alice'], pri: 'medium', partnerId: null },
  { id: 't4', sec: 'Done', workpackageId: null,  milestoneId: null, who: null,       pri: null,   partnerId: null },
]

const sections = ['Todo', 'Done']
const wpById = {
  wp1: { id: 'wp1', code: 'WP1', name: 'Design' },
  wp2: { id: 'wp2', code: 'WP2', name: 'Build' },
}
const msById = {
  m1: { id: 'm1', code: 'M1', name: 'Kickoff' },
}
const partnerById = {
  pa1: { id: 'pa1', name: 'POLIMI' },
}
const t = {}
const lookups = { sections, wpById, msById, partnerById, t }

// ── Tests ────────────────────────────────────────────────────

describe('GROUP_BY_OPTIONS', () => {
  it('exports 6 options', () => {
    expect(GROUP_BY_OPTIONS).toEqual(['section', 'wp', 'milestone', 'assignee', 'priority', 'partner'])
  })
})

describe('groupTasks', () => {
  it('groups by section (default)', () => {
    const groups = groupTasks(tasks, 'section', lookups)
    expect(groups.map(g => g.key)).toEqual(['Todo', 'Done'])
    expect(groups[0].tasks).toHaveLength(2)
    expect(groups[1].tasks).toHaveLength(2)
  })

  it('groups by WP with fallback for missing WP', () => {
    const groups = groupTasks(tasks, 'wp', lookups)
    const keys = groups.map(g => g.key)
    expect(keys).toContain('wp1')
    expect(keys).toContain('wp2')
    expect(keys).toContain('__none__')
    expect(groups.find(g => g.key === 'wp1').tasks).toHaveLength(2)
    expect(groups.find(g => g.key === '__none__').tasks).toHaveLength(1) // t4
  })

  it('groups by milestone', () => {
    const groups = groupTasks(tasks, 'milestone', lookups)
    expect(groups.find(g => g.key === 'm1').tasks).toHaveLength(2)
    expect(groups.find(g => g.key === '__none__').tasks).toHaveLength(2)
  })

  it('groups by assignee alphabetically', () => {
    const groups = groupTasks(tasks, 'assignee', lookups)
    const labels = groups.map(g => g.label)
    expect(labels[0]).toBe('Alice')
    expect(labels[1]).toBe('Bob')
    expect(labels).toContain('Unassigned')
    expect(groups.find(g => g.label === 'Alice').tasks).toHaveLength(2)
  })

  it('groups by priority in order high → medium → low', () => {
    const groups = groupTasks(tasks, 'priority', lookups)
    const keys = groups.map(g => g.key)
    // high comes before medium comes before low
    expect(keys.indexOf('high')).toBeLessThan(keys.indexOf('medium'))
    expect(keys.indexOf('medium')).toBeLessThan(keys.indexOf('low'))
    // t4 has null priority → no priority group
    expect(keys).toContain('__none__')
  })

  it('groups by partner', () => {
    const groups = groupTasks(tasks, 'partner', lookups)
    expect(groups.find(g => g.key === 'pa1').tasks).toHaveLength(2)
    expect(groups.find(g => g.key === '__none__').tasks).toHaveLength(2)
  })

  it('handles orphan sections', () => {
    const orphanTasks = [...tasks, { id: 't5', sec: 'Unknown', who: null, pri: null }]
    const groups = groupTasks(orphanTasks, 'section', lookups)
    expect(groups.find(g => g.key === '__orphan__')).toBeDefined()
    expect(groups.find(g => g.key === '__orphan__').tasks).toHaveLength(1)
  })

  it('returns empty groups for empty input', () => {
    const groups = groupTasks([], 'section', lookups)
    expect(groups.every(g => g.tasks.length === 0)).toBe(true)
  })
})
