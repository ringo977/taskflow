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

  it('template WPs have unique codes within template', () => {
    for (const tpl of PROJECT_TEMPLATES) {
      const codes = (tpl.workpackages ?? []).map(wp => wp.code)
      expect(new Set(codes).size).toBe(codes.length)
    }
  })

  it('template MSs have unique codes within template', () => {
    for (const tpl of PROJECT_TEMPLATES) {
      const codes = (tpl.milestones ?? []).map(ms => ms.code)
      expect(new Set(codes).size).toBe(codes.length)
    }
  })

  it('template MS wpCode references an existing WP code', () => {
    for (const tpl of PROJECT_TEMPLATES) {
      const wpCodes = new Set((tpl.workpackages ?? []).map(wp => wp.code))
      for (const ms of tpl.milestones ?? []) {
        if (ms.wpCode) expect(wpCodes.has(ms.wpCode)).toBe(true)
      }
    }
  })

  it('template task wpCode/msCode reference existing WP/MS codes', () => {
    for (const tpl of PROJECT_TEMPLATES) {
      const wpCodes = new Set((tpl.workpackages ?? []).map(wp => wp.code))
      const msCodes = new Set((tpl.milestones ?? []).map(ms => ms.code))
      for (const task of tpl.tasks ?? []) {
        if (task.wpCode) expect(wpCodes.has(task.wpCode)).toBe(true)
        if (task.msCode) expect(msCodes.has(task.msCode)).toBe(true)
      }
    }
  })

  it('partnerSuggestions have name and type when present', () => {
    for (const tpl of PROJECT_TEMPLATES) {
      for (const s of tpl.partnerSuggestions ?? []) {
        expect(s.name).toBeTruthy()
        expect(s.type).toBeTruthy()
      }
    }
  })

  it('research and launch templates include WPs and MSs', () => {
    const research = PROJECT_TEMPLATES.find(t => t.id === 'research')
    const launch = PROJECT_TEMPLATES.find(t => t.id === 'launch')
    expect(research.workpackages.length).toBeGreaterThanOrEqual(2)
    expect(research.milestones.length).toBeGreaterThanOrEqual(2)
    expect(launch.workpackages.length).toBeGreaterThanOrEqual(2)
    expect(launch.milestones.length).toBeGreaterThanOrEqual(2)
  })

  it('deadline_approaching rules are disabled (V1.5)', () => {
    for (const tpl of PROJECT_TEMPLATES) {
      for (const rule of tpl.rules ?? []) {
        if (rule.trigger === 'deadline_approaching') {
          expect(rule.enabled).toBe(false)
        }
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
