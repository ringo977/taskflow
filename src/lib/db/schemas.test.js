import { describe, it, expect } from 'vitest'
import {
  validate,
  TaskUpsertSchema,
  TaskPatchSchema,
  ProjectUpsertSchema,
  PortfolioUpsertSchema,
  PartnerUpsertSchema,
  WorkpackageUpsertSchema,
  MilestoneUpsertSchema,
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

  it('accepts optional partnerId', () => {
    const t = validate(TaskUpsertSchema, { ...validTask, partnerId: 'pt-1' })
    expect(t.partnerId).toBe('pt-1')
  })

  it('accepts null partnerId', () => {
    const t = validate(TaskUpsertSchema, { ...validTask, partnerId: null })
    expect(t.partnerId).toBeNull()
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

// ── PartnerUpsertSchema ───────────────────────────────────────

describe('PartnerUpsertSchema', () => {
  const validPartner = { name: 'Acme Corp', type: 'vendor' }

  it('accepts minimal valid partner and fills defaults', () => {
    const p = validate(PartnerUpsertSchema, validPartner)
    expect(p.name).toBe('Acme Corp')
    expect(p.type).toBe('vendor')
    expect(p.isActive).toBe(true)
  })

  it('rejects empty name', () => {
    expect(() => validate(PartnerUpsertSchema, { ...validPartner, name: '' }))
      .toThrow(/Validation failed/)
  })

  it('rejects name over 255 chars', () => {
    expect(() => validate(PartnerUpsertSchema, { ...validPartner, name: 'x'.repeat(256) }))
      .toThrow(/Validation failed/)
  })

  it.each(['team', 'partner', 'vendor', 'lab', 'department', 'client'])('accepts type %s', (type) => {
    const p = validate(PartnerUpsertSchema, { ...validPartner, type })
    expect(p.type).toBe(type)
  })

  it('coerces invalid type to partner', () => {
    const p = validate(PartnerUpsertSchema, { ...validPartner, type: 'unknown' })
    expect(p.type).toBe('partner')
  })

  it('accepts optional contact fields', () => {
    const p = validate(PartnerUpsertSchema, {
      ...validPartner,
      contactName: 'John Doe',
      contactEmail: 'john@example.com',
      notes: 'Important partner',
    })
    expect(p.contactName).toBe('John Doe')
    expect(p.contactEmail).toBe('john@example.com')
    expect(p.notes).toBe('Important partner')
  })

  it('coerces empty contact strings to null', () => {
    const p = validate(PartnerUpsertSchema, {
      ...validPartner,
      contactName: '',
      contactEmail: '',
      notes: '',
    })
    expect(p.contactName).toBeNull()
    expect(p.contactEmail).toBeNull()
    expect(p.notes).toBeNull()
  })

  it('accepts isActive false', () => {
    const p = validate(PartnerUpsertSchema, { ...validPartner, isActive: false })
    expect(p.isActive).toBe(false)
  })
})

// ── WorkpackageUpsertSchema ───────────────────────────────────

describe('WorkpackageUpsertSchema', () => {
  const validWp = { projectId: 'proj1', code: 'WP1', name: 'Analysis', status: 'active' }

  it('accepts valid workpackage', () => {
    const wp = validate(WorkpackageUpsertSchema, validWp)
    expect(wp.code).toBe('WP1')
    expect(wp.name).toBe('Analysis')
    expect(wp.status).toBe('active')
  })

  it('rejects empty code', () => {
    expect(() => validate(WorkpackageUpsertSchema, { ...validWp, code: '' }))
      .toThrow()
  })

  it('rejects empty name', () => {
    expect(() => validate(WorkpackageUpsertSchema, { ...validWp, name: '' }))
      .toThrow()
  })

  it('accepts all valid statuses', () => {
    for (const status of ['draft', 'active', 'review', 'complete', 'delayed']) {
      const wp = validate(WorkpackageUpsertSchema, { ...validWp, status })
      expect(wp.status).toBe(status)
    }
  })

  it('defaults invalid status to draft', () => {
    const wp = validate(WorkpackageUpsertSchema, { ...validWp, status: 'bogus' })
    expect(wp.status).toBe('draft')
  })

  it('accepts ownerUserId only', () => {
    const wp = validate(WorkpackageUpsertSchema, { ...validWp, ownerUserId: '550e8400-e29b-41d4-a716-446655440000' })
    expect(wp.ownerUserId).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(wp.ownerPartnerId).toBeFalsy()
  })

  it('accepts ownerPartnerId only', () => {
    const wp = validate(WorkpackageUpsertSchema, { ...validWp, ownerPartnerId: 'pt1' })
    expect(wp.ownerPartnerId).toBe('pt1')
    expect(wp.ownerUserId).toBeFalsy()
  })

  it('rejects both ownerUserId and ownerPartnerId', () => {
    expect(() => validate(WorkpackageUpsertSchema, {
      ...validWp,
      ownerUserId: '550e8400-e29b-41d4-a716-446655440000',
      ownerPartnerId: 'pt1',
    })).toThrow(/owner/)
  })

  it('defaults position to 0', () => {
    const wp = validate(WorkpackageUpsertSchema, validWp)
    expect(wp.position).toBe(0)
  })

  it('defaults isActive to true', () => {
    const wp = validate(WorkpackageUpsertSchema, validWp)
    expect(wp.isActive).toBe(true)
  })
})

// ── MilestoneUpsertSchema ─────────────────────────────────────

describe('MilestoneUpsertSchema', () => {
  const validMs = { projectId: 'proj1', code: 'MS1', name: 'Prototype review', status: 'pending' }

  it('validates a valid milestone', () => {
    const ms = validate(MilestoneUpsertSchema, validMs)
    expect(ms.code).toBe('MS1')
    expect(ms.name).toBe('Prototype review')
    expect(ms.status).toBe('pending')
  })

  it('rejects empty code', () => {
    expect(() => validate(MilestoneUpsertSchema, { ...validMs, code: '' }))
      .toThrow()
  })

  it('rejects empty name', () => {
    expect(() => validate(MilestoneUpsertSchema, { ...validMs, name: '' }))
      .toThrow()
  })

  it('accepts all valid statuses', () => {
    for (const status of ['draft', 'pending', 'achieved', 'missed']) {
      const ms = validate(MilestoneUpsertSchema, { ...validMs, status })
      expect(ms.status).toBe(status)
    }
  })

  it('defaults invalid status to draft', () => {
    const ms = validate(MilestoneUpsertSchema, { ...validMs, status: 'bogus' })
    expect(ms.status).toBe('draft')
  })

  it('accepts ownerUserId only', () => {
    const ms = validate(MilestoneUpsertSchema, { ...validMs, ownerUserId: '550e8400-e29b-41d4-a716-446655440000' })
    expect(ms.ownerUserId).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(ms.ownerPartnerId).toBeFalsy()
  })

  it('accepts ownerPartnerId only', () => {
    const ms = validate(MilestoneUpsertSchema, { ...validMs, ownerPartnerId: 'pt1' })
    expect(ms.ownerPartnerId).toBe('pt1')
    expect(ms.ownerUserId).toBeFalsy()
  })

  it('rejects both owners set', () => {
    expect(() => validate(MilestoneUpsertSchema, {
      ...validMs,
      ownerUserId: '550e8400-e29b-41d4-a716-446655440000',
      ownerPartnerId: 'pt1',
    })).toThrow()
  })

  it('defaults position to 0', () => {
    const ms = validate(MilestoneUpsertSchema, validMs)
    expect(ms.position).toBe(0)
  })

  it('defaults isActive to true', () => {
    const ms = validate(MilestoneUpsertSchema, validMs)
    expect(ms.isActive).toBe(true)
  })

  it('accepts workpackageId (nullable UUID)', () => {
    const ms = validate(MilestoneUpsertSchema, { ...validMs, workpackageId: '550e8400-e29b-41d4-a716-446655440000' })
    expect(ms.workpackageId).toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('accepts null workpackageId', () => {
    const ms = validate(MilestoneUpsertSchema, { ...validMs, workpackageId: null })
    expect(ms.workpackageId).toBeNull()
  })
})
