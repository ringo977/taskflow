import { describe, it, expect } from 'vitest'
import {
  validate,
  TaskUpsertSchema,
  TaskPatchSchema,
  ProjectUpsertSchema,
  PortfolioUpsertSchema,
  SectionNameSchema,
  OrgRoleSchema,
  ProjectRoleSchema,
} from './schemas'

// ── Helper: minimal valid objects ──────────────────────────────

const validTask = {
  id: '00000000-0000-0000-0000-000000000001',
  title: 'Test task',
  pid: 'proj-1',
}

const validProject = {
  id: '00000000-0000-0000-0000-000000000002',
  name: 'My project',
  color: '#FF0000',
}

const validPortfolio = {
  id: '00000000-0000-0000-0000-000000000003',
  name: 'Portfolio A',
  color: '#00FF00',
}

// ── TaskUpsertSchema ───────────────────────────────────────────

describe('TaskUpsertSchema', () => {
  it('accepts minimal valid task and fills defaults', () => {
    const t = validate(TaskUpsertSchema, validTask)
    expect(t.title).toBe('Test task')
    expect(t.pri).toBe('medium')       // default
    expect(t.done).toBe(false)          // default
    expect(t.visibility).toBe('all')    // default
    expect(t.tags).toEqual([])          // default
    expect(t.position).toBe(0)          // default
  })

  it('trims title whitespace', () => {
    const t = validate(TaskUpsertSchema, { ...validTask, title: '  padded  ' })
    expect(t.title).toBe('padded')
  })

  it('rejects empty title', () => {
    expect(() => validate(TaskUpsertSchema, { ...validTask, title: '' }))
      .toThrow(/Validation failed/)
  })

  it('rejects title longer than 500 chars', () => {
    expect(() => validate(TaskUpsertSchema, { ...validTask, title: 'x'.repeat(501) }))
      .toThrow(/Validation failed/)
  })

  it('rejects empty id', () => {
    expect(() => validate(TaskUpsertSchema, { ...validTask, id: '' }))
      .toThrow(/Validation failed/)
  })

  it('coerces invalid priority to medium', () => {
    const t = validate(TaskUpsertSchema, { ...validTask, pri: 'critical' })
    expect(t.pri).toBe('medium')
  })

  it('coerces empty date string to null', () => {
    const t = validate(TaskUpsertSchema, { ...validTask, due: '' })
    expect(t.due).toBeNull()
  })

  it('accepts valid ISO date', () => {
    const t = validate(TaskUpsertSchema, { ...validTask, due: '2026-04-03' })
    expect(t.due).toBe('2026-04-03')
  })

  it('rejects malformed date', () => {
    expect(() => validate(TaskUpsertSchema, { ...validTask, due: 'next week' }))
      .toThrow(/Validation failed/)
  })

  it('validates subtask titles', () => {
    const t = validate(TaskUpsertSchema, {
      ...validTask,
      subs: [{ id: 'sub-1', t: 'Do thing', done: false }],
    })
    expect(t.subs[0].t).toBe('Do thing')
  })

  it('rejects empty subtask title', () => {
    expect(() => validate(TaskUpsertSchema, {
      ...validTask,
      subs: [{ id: 'sub-1', t: '', done: false }],
    })).toThrow(/Validation failed/)
  })
})

// ── TaskPatchSchema ────────────────────────────────────────────

describe('TaskPatchSchema', () => {
  it('accepts partial updates', () => {
    const p = validate(TaskPatchSchema, { done: true })
    expect(p.done).toBe(true)
  })

  it('validates title if present', () => {
    expect(() => validate(TaskPatchSchema, { title: '' }))
      .toThrow(/Validation failed/)
  })

  it('passes through unknown fields (passthrough)', () => {
    const p = validate(TaskPatchSchema, { done: true, extraField: 123 })
    expect(p.extraField).toBe(123)
  })
})

// ── ProjectUpsertSchema ────────────────────────────────────────

describe('ProjectUpsertSchema', () => {
  it('accepts minimal valid project and fills defaults', () => {
    const p = validate(ProjectUpsertSchema, validProject)
    expect(p.name).toBe('My project')
    expect(p.status).toBe('active')
    expect(p.visibility).toBe('all')
    expect(p.forms).toEqual([])
  })

  it('rejects empty name', () => {
    expect(() => validate(ProjectUpsertSchema, { ...validProject, name: '' }))
      .toThrow(/Validation failed/)
  })

  it('coerces invalid color to default', () => {
    const p = validate(ProjectUpsertSchema, { ...validProject, color: 'red' })
    expect(p.color).toBe('#378ADD')
  })

  it('accepts valid hex color', () => {
    const p = validate(ProjectUpsertSchema, { ...validProject, color: '#AABBCC' })
    expect(p.color).toBe('#AABBCC')
  })
})

// ── PortfolioUpsertSchema ──────────────────────────────────────

describe('PortfolioUpsertSchema', () => {
  it('accepts valid portfolio', () => {
    const p = validate(PortfolioUpsertSchema, validPortfolio)
    expect(p.name).toBe('Portfolio A')
    expect(p.status).toBe('active')
  })

  it('rejects name over 255 chars', () => {
    expect(() => validate(PortfolioUpsertSchema, { ...validPortfolio, name: 'x'.repeat(256) }))
      .toThrow(/Validation failed/)
  })
})

// ── SectionNameSchema ──────────────────────────────────────────

describe('SectionNameSchema', () => {
  it('accepts valid section name', () => {
    expect(validate(SectionNameSchema, 'To Do')).toBe('To Do')
  })

  it('trims whitespace', () => {
    expect(validate(SectionNameSchema, '  In Progress  ')).toBe('In Progress')
  })

  it('rejects empty name', () => {
    expect(() => validate(SectionNameSchema, '')).toThrow(/Validation failed/)
  })
})

// ── Role schemas ───────────────────────────────────────────────

describe('OrgRoleSchema', () => {
  it.each(['admin', 'manager', 'member', 'guest'])('accepts %s', (role) => {
    expect(validate(OrgRoleSchema, role)).toBe(role)
  })

  it('rejects invalid role', () => {
    expect(() => validate(OrgRoleSchema, 'superadmin')).toThrow(/Validation failed/)
  })
})

describe('ProjectRoleSchema', () => {
  it.each(['admin', 'manager', 'member', 'viewer'])('accepts %s', (role) => {
    expect(validate(ProjectRoleSchema, role)).toBe(role)
  })

  it('rejects invalid role', () => {
    expect(() => validate(ProjectRoleSchema, 'owner')).toThrow(/Validation failed/)
  })
})
