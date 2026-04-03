import { describe, it, expect } from 'vitest'
import { toPortfolio, toProject, toTask } from './adapters'

/**
 * Resilience tests for DB adapters.
 *
 * Cover: assignee_ids UUID resolution, legacy/incomplete JSONB,
 * null/undefined fields, milestone without due date,
 * multi-assignee edge cases, and forward-compat with unknown fields.
 */

// ── assignee_ids resolution ─────────────────────────────────────

describe('assignee_ids resolution (via toTask)', () => {
  const base = {
    id: 't1', project_id: 'p1', title: 'T', description: '',
    priority: 'medium', done: false, milestone: false,
    position: 0,
  }

  const profiles = {
    'uuid-alice': 'Alice',
    'uuid-bob': 'Bob',
    'uuid-charlie': 'Charlie',
  }

  it('returns empty array when assignee_ids is null', () => {
    const t = toTask({ ...base, assignee_ids: null }, '', [], [], [], profiles)
    expect(t.who).toEqual([])
    expect(t.whoIds).toEqual([])
  })

  it('returns empty array when assignee_ids is undefined', () => {
    const t = toTask({ ...base }, '', [], [], [], profiles)
    expect(t.who).toEqual([])
    expect(t.whoIds).toEqual([])
  })

  it('returns empty array when assignee_ids is empty array', () => {
    const t = toTask({ ...base, assignee_ids: [] }, '', [], [], [], profiles)
    expect(t.who).toEqual([])
  })

  it('resolves single UUID to display name', () => {
    const t = toTask({ ...base, assignee_ids: ['uuid-alice'] }, '', [], [], [], profiles)
    expect(t.who).toEqual(['Alice'])
    expect(t.whoIds).toEqual(['uuid-alice'])
  })

  it('resolves multiple UUIDs to display names', () => {
    const t = toTask(
      { ...base, assignee_ids: ['uuid-alice', 'uuid-bob', 'uuid-charlie'] },
      '', [], [], [], profiles
    )
    expect(t.who).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('filters out UUIDs not found in profileById', () => {
    const t = toTask(
      { ...base, assignee_ids: ['uuid-alice', 'uuid-unknown', 'uuid-bob'] },
      '', [], [], [], profiles
    )
    expect(t.who).toEqual(['Alice', 'Bob'])
    expect(t.whoIds).toEqual(['uuid-alice', 'uuid-unknown', 'uuid-bob'])
  })

  it('returns empty names when profileById is empty', () => {
    const t = toTask(
      { ...base, assignee_ids: ['uuid-alice'] },
      '', [], [], [], {}
    )
    expect(t.who).toEqual([])
    expect(t.whoIds).toEqual(['uuid-alice'])
  })

  it('returns empty names when profileById is not provided', () => {
    const t = toTask({ ...base, assignee_ids: ['uuid-alice'] })
    expect(t.who).toEqual([])
  })

  it('handles large team (15 members)', () => {
    const bigProfiles = {}
    const ids = []
    for (let i = 0; i < 15; i++) {
      const uuid = `uuid-user-${i}`
      bigProfiles[uuid] = `User ${i}`
      ids.push(uuid)
    }
    const t = toTask({ ...base, assignee_ids: ids }, '', [], [], [], bigProfiles)
    expect(t.who).toHaveLength(15)
  })

  it('ignores legacy assignee_name field entirely', () => {
    // Even if assignee_name is somehow still present, it should be ignored
    const t = toTask(
      { ...base, assignee_name: 'Legacy Name', assignee_ids: ['uuid-alice'] },
      '', [], [], [], profiles
    )
    expect(t.who).toEqual(['Alice'])
  })
})

// ── Milestone without due date ───────────────────────────────

describe('milestone without due date', () => {
  const base = {
    id: 't_m', project_id: 'p1', title: 'Milestone',
    priority: 'high', done: false, position: 0,
  }

  it('milestone=true with no due_date → due is null', () => {
    const t = toTask({ ...base, milestone: true, due_date: null })
    expect(t.milestone).toBe(true)
    expect(t.due).toBeNull()
  })

  it('milestone=true with due_date → due is set', () => {
    const t = toTask({ ...base, milestone: true, due_date: '2026-06-01' })
    expect(t.milestone).toBe(true)
    expect(t.due).toBe('2026-06-01')
  })

  it('milestone=undefined defaults to false', () => {
    const t = toTask({ ...base, milestone: undefined })
    expect(t.milestone).toBe(false)
  })

  it('milestone=null defaults to false', () => {
    const t = toTask({ ...base, milestone: null })
    expect(t.milestone).toBe(false)
  })
})

// ── Legacy/incomplete JSONB rows ─────────────────────────────

describe('incomplete/legacy row shapes', () => {
  it('toTask with completely bare-minimum row', () => {
    const t = toTask({ id: 'x', project_id: 'p', title: 'T', priority: 'low', done: false })
    expect(t.id).toBe('x')
    expect(t.desc).toBe('')
    expect(t.who).toEqual([])
    expect(t.startDate).toBeNull()
    expect(t.due).toBeNull()
    expect(t.milestone).toBe(false)
    expect(t.recurrence).toBeNull()
    expect(t.attachments).toEqual([])
    expect(t.tags).toEqual([])
    expect(t.activity).toEqual([])
    expect(t.position).toBe(0)
    expect(t.customValues).toEqual({})
    expect(t.visibility).toBe('all')
    expect(t.subs).toEqual([])
    expect(t.cmts).toEqual([])
    expect(t.deps).toEqual([])
  })

  it('toProject with bare-minimum row', () => {
    const p = toProject({ id: 'p1', name: 'Proj', color: '#fff', status: 'active' })
    expect(p.id).toBe('p1')
    expect(p.description).toBe('')
    expect(p.resources).toEqual([])
    expect(p.members).toEqual([])
    expect(p.customFields).toEqual([])
    expect(p.taskTemplates).toEqual([])
    expect(p.visibility).toBe('all')
    expect(p.sectionAccess).toEqual({})
    expect(p.portfolio).toBeNull()
  })

  it('toPortfolio with bare-minimum row', () => {
    const pf = toPortfolio({ id: 'pf1', name: 'PF', color: '#000' })
    expect(pf.desc).toBe('')
    expect(pf.status).toBe('active')
  })

  it('toTask passes through provided subs/cmts/deps', () => {
    const subs = [{ id: 's1', title: 'Sub', done: false }]
    const cmts = [{ id: 'c1', text: 'Hi' }]
    const deps = ['t2']
    const t = toTask(
      { id: 'x', project_id: 'p', title: 'T', priority: 'low', done: false },
      'Section A', subs, cmts, deps
    )
    expect(t.sec).toBe('Section A')
    expect(t.subs).toBe(subs)
    expect(t.cmts).toBe(cmts)
    expect(t.deps).toBe(deps)
  })

  it('toProject uses provided memberNames', () => {
    const p = toProject(
      { id: 'p1', name: 'P', color: '#f00', status: 'active' },
      ['Alice', 'Bob']
    )
    expect(p.members).toEqual(['Alice', 'Bob'])
  })

  it('toTask with JSONB custom_values as object', () => {
    const t = toTask({
      id: 'x', project_id: 'p', title: 'T', priority: 'low', done: false,
      custom_values: { field1: 'val1', field2: 42 },
    })
    expect(t.customValues).toEqual({ field1: 'val1', field2: 42 })
  })

  it('toTask with JSONB tags as array of objects', () => {
    const tags = [{ name: 'bug', color: '#f00' }, { name: 'feature', color: '#0f0' }]
    const t = toTask({
      id: 'x', project_id: 'p', title: 'T', priority: 'low', done: false,
      tags,
    })
    expect(t.tags).toEqual(tags)
  })

  it('toProject with JSONB resources as array', () => {
    const resources = [{ name: 'Doc', url: 'https://example.com' }]
    const p = toProject({
      id: 'p1', name: 'P', color: '#f00', status: 'active',
      resources,
    })
    expect(p.resources).toEqual(resources)
  })

  it('toProject with JSONB section_access as object', () => {
    const p = toProject({
      id: 'p1', name: 'P', color: '#f00', status: 'active',
      section_access: { 'In Progress': 'editors', 'Done': 'all' },
    })
    expect(p.sectionAccess).toEqual({ 'In Progress': 'editors', 'Done': 'all' })
  })
})
