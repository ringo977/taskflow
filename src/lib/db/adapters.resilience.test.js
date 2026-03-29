import { describe, it, expect } from 'vitest'
import { toPortfolio, toProject, toTask } from './adapters'

/**
 * Resilience tests for DB adapters.
 *
 * Cover: legacy/incomplete JSONB, null/undefined fields,
 * parseWho edge cases, milestone without due date,
 * multi-assignee null/empty arrays, and forward-compat
 * with unknown fields.
 */

// ── parseWho edge cases (tested indirectly through toTask) ────

describe('parseWho (via toTask)', () => {
  const base = {
    id: 't1', project_id: 'p1', title: 'T', description: '',
    priority: 'medium', done: false, milestone: false,
    position: 0,
  }

  it('returns empty array for null assignee_name', () => {
    const t = toTask({ ...base, assignee_name: null })
    expect(t.who).toEqual([])
  })

  it('returns empty array for undefined assignee_name', () => {
    const t = toTask({ ...base, assignee_name: undefined })
    expect(t.who).toEqual([])
  })

  it('returns empty array for empty string assignee_name', () => {
    const t = toTask({ ...base, assignee_name: '' })
    expect(t.who).toEqual([])
  })

  it('wraps plain string in array', () => {
    const t = toTask({ ...base, assignee_name: 'Alice' })
    expect(t.who).toEqual(['Alice'])
  })

  it('passes through array directly', () => {
    const t = toTask({ ...base, assignee_name: ['Alice', 'Bob'] })
    expect(t.who).toEqual(['Alice', 'Bob'])
  })

  it('parses JSON array string', () => {
    const t = toTask({ ...base, assignee_name: '["Alice","Bob"]' })
    expect(t.who).toEqual(['Alice', 'Bob'])
  })

  it('wraps JSON non-array string in array', () => {
    // JSON.parse('"Alice"') returns "Alice" (a string, not array)
    const t = toTask({ ...base, assignee_name: '"Alice"' })
    expect(t.who).toEqual(['"Alice"']) // wraps the raw string since parsed is not array
  })

  it('wraps invalid JSON string in array', () => {
    const t = toTask({ ...base, assignee_name: '{not valid json}' })
    expect(t.who).toEqual(['{not valid json}'])
  })

  it('handles JSON object string (not array)', () => {
    const t = toTask({ ...base, assignee_name: '{"name":"Alice"}' })
    expect(t.who).toEqual(['{"name":"Alice"}'])
  })

  it('returns empty array for false (boolean)', () => {
    const t = toTask({ ...base, assignee_name: false })
    expect(t.who).toEqual([])
  })

  it('returns empty array for 0 (number)', () => {
    const t = toTask({ ...base, assignee_name: 0 })
    expect(t.who).toEqual([])
  })

  it('handles array with null/empty elements', () => {
    const t = toTask({ ...base, assignee_name: ['Alice', null, '', 'Bob'] })
    expect(t.who).toEqual(['Alice', null, '', 'Bob'])
  })

  it('handles JSON array string with spaces', () => {
    const t = toTask({ ...base, assignee_name: '[ "Alice" , "Bob" ]' })
    expect(t.who).toEqual(['Alice', 'Bob'])
  })

  it('handles empty JSON array string', () => {
    const t = toTask({ ...base, assignee_name: '[]' })
    expect(t.who).toEqual([])
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

// ── Multi-assignee edge cases in filters/transforms ──────────

describe('multi-assignee edge cases', () => {
  const base = {
    id: 't1', project_id: 'p1', title: 'T',
    priority: 'medium', done: false, position: 0,
  }

  it('null assignee_name → who=[]', () => {
    expect(toTask({ ...base, assignee_name: null }).who).toEqual([])
  })

  it('empty array assignee_name → who=[]', () => {
    expect(toTask({ ...base, assignee_name: [] }).who).toEqual([])
  })

  it('single string → who=[string]', () => {
    expect(toTask({ ...base, assignee_name: 'Solo' }).who).toEqual(['Solo'])
  })

  it('array with one element', () => {
    expect(toTask({ ...base, assignee_name: ['Solo'] }).who).toEqual(['Solo'])
  })

  it('large team (10+ members)', () => {
    const team = Array.from({ length: 15 }, (_, i) => `User${i}`)
    expect(toTask({ ...base, assignee_name: team }).who).toHaveLength(15)
  })

  it('JSON string of large team', () => {
    const team = Array.from({ length: 10 }, (_, i) => `User${i}`)
    const t = toTask({ ...base, assignee_name: JSON.stringify(team) })
    expect(t.who).toHaveLength(10)
  })

  it('assignee with special chars (unicode, commas)', () => {
    const t = toTask({ ...base, assignee_name: ['María García', 'O\'Brien', 'Jean-Pierre'] })
    expect(t.who).toEqual(['María García', 'O\'Brien', 'Jean-Pierre'])
  })
})
