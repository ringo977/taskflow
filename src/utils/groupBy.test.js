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

// ── Branch edge cases ────────────────────────────────────────

describe('groupTasks — unresolvable ids fall into the no-group bucket', () => {
  it('WP id not present in wpById lands in __none__', () => {
    const stale = [{ id: 't1', workpackageId: 'wp-deleted', who: null, pri: null }]
    const groups = groupTasks(stale, 'wp', lookups)
    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('__none__')
    expect(groups[0].label).toBe('No WP')
    expect(groups[0].tasks).toHaveLength(1)
  })

  it('milestone id not present in msById lands in __none__', () => {
    const stale = [{ id: 't1', milestoneId: 'ms-deleted', who: null, pri: null }]
    const groups = groupTasks(stale, 'milestone', lookups)
    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('__none__')
    expect(groups[0].label).toBe('No milestone')
  })

  it('partner id not present in partnerById lands in __none__', () => {
    const stale = [{ id: 't1', partnerId: 'pa-deleted', who: null, pri: null }]
    const groups = groupTasks(stale, 'partner', lookups)
    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('__none__')
    expect(groups[0].label).toBe('No partner')
  })
})

describe('groupTasks — no fallback group when everything resolves', () => {
  it('omits __none__ when every task has a known WP', () => {
    const all = [
      { id: 't1', workpackageId: 'wp1' },
      { id: 't2', workpackageId: 'wp2' },
    ]
    const groups = groupTasks(all, 'wp', lookups)
    expect(groups.map(g => g.key)).toEqual(['wp1', 'wp2'])
  })

  it('omits the unassigned group when every task has an assignee', () => {
    const all = [
      { id: 't1', who: ['Alice'] },
      { id: 't2', who: 'Bob' }, // legacy string shape
    ]
    const groups = groupTasks(all, 'assignee', lookups)
    expect(groups.map(g => g.key)).toEqual(['Alice', 'Bob'])
  })

  it('omits the no-priority group when every task has a valid priority', () => {
    const all = [
      { id: 't1', pri: 'high' },
      { id: 't2', pri: 'low' },
    ]
    const groups = groupTasks(all, 'priority', lookups)
    expect(groups.map(g => g.key)).toEqual(['high', 'low'])
  })
})

describe('groupTasks — i18n label overrides', () => {
  const it_t = {
    noWorkpackage: 'Nessun WP', noMilestone: 'Nessuna milestone',
    unassigned: 'Non assegnato', noPriority: 'Nessuna priorità', high: 'Alta',
  }
  const itLookups = { ...lookups, t: it_t }

  it('uses translated fallback labels when provided', () => {
    const bare = [{ id: 't1', who: undefined, pri: 'unknown-pri' }]
    expect(groupTasks(bare, 'wp', itLookups)[0].label).toBe('Nessun WP')
    expect(groupTasks(bare, 'milestone', itLookups)[0].label).toBe('Nessuna milestone')
    expect(groupTasks(bare, 'assignee', itLookups)[0].label).toBe('Non assegnato')
    expect(groupTasks(bare, 'priority', itLookups)[0].label).toBe('Nessuna priorità')
  })

  it('uses translated priority labels when provided', () => {
    const groups = groupTasks([{ id: 't1', pri: 'high' }], 'priority', itLookups)
    expect(groups[0].label).toBe('Alta')
  })
})

describe('groupTasks — defaults', () => {
  it('works without a lookups argument (defaults)', () => {
    const groups = groupTasks([{ id: 't1', sec: 'Loose' }], 'section')
    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('__orphan__')
  })

  it('unknown groupKey falls back to section grouping', () => {
    const groups = groupTasks(tasks, 'bogus-key', lookups)
    expect(groups.map(g => g.key)).toEqual(['Todo', 'Done'])
  })
})
