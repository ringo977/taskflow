import { describe, it, expect, beforeEach } from 'vitest'
import { EMPTY_FILTERS, PROJECT_TEMPLATES, seedFor, oget, oset } from '../constants'

beforeEach(() => localStorage.clear())

describe('EMPTY_FILTERS', () => {
  it('has all filter keys set to neutral values', () => {
    expect(EMPTY_FILTERS).toEqual({
      q: '', pri: 'all', who: 'all', due: 'all', done: 'all', tag: 'all', ms: 'all',
    })
  })
})

describe('PROJECT_TEMPLATES', () => {
  it('contains at least 3 templates', () => {
    expect(PROJECT_TEMPLATES.length).toBeGreaterThanOrEqual(3)
  })

  it('every template has required fields', () => {
    for (const tpl of PROJECT_TEMPLATES) {
      expect(tpl).toHaveProperty('id')
      expect(tpl).toHaveProperty('name')
      expect(tpl).toHaveProperty('sections')
      expect(Array.isArray(tpl.sections)).toBe(true)
      expect(tpl.sections.length).toBeGreaterThan(0)
    }
  })

  it('template tasks reference valid sections', () => {
    for (const tpl of PROJECT_TEMPLATES) {
      for (const task of tpl.tasks ?? []) {
        expect(tpl.sections).toContain(task.sec)
      }
    }
  })
})

describe('seedFor', () => {
  it('returns polimi seed for "polimi"', () => {
    const seed = seedFor('polimi')
    expect(seed).toHaveProperty('projs')
    expect(seed).toHaveProperty('ports')
    expect(seed).toHaveProperty('secs')
    expect(seed).toHaveProperty('tasks')
  })

  it('returns empty seed for unknown org', () => {
    const seed = seedFor('unknown_org_xyz')
    expect(seed.projs).toEqual([])
    expect(seed.ports).toEqual([])
    expect(seed.tasks).toEqual([])
  })
})

describe('oget / oset', () => {
  it('round-trips org-namespaced data', () => {
    oset('org1', 'projs', [{ id: 'p1' }])
    expect(oget('org1', 'projs', [])).toEqual([{ id: 'p1' }])
  })

  it('returns fallback for missing key', () => {
    expect(oget('org1', 'missing', 'default')).toBe('default')
  })

  it('namespaces by org ID', () => {
    oset('orgA', 'tasks', [1])
    oset('orgB', 'tasks', [2])
    expect(oget('orgA', 'tasks', [])).toEqual([1])
    expect(oget('orgB', 'tasks', [])).toEqual([2])
  })
})
