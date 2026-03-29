import { describe, it, expect } from 'vitest'
import {
  getProjectRole,
  canEditTasks,
  canManageProject,
  canViewProject,
  canViewSection,
  canViewTask,
  ROLES,
} from './permissions'

// ── Fixtures ──────────────────────────────────────────────────

const mkUser = (name, email) => ({ name, email })
const ALICE = mkUser('Alice', 'alice@lab.it')
const BOB   = mkUser('Bob', 'bob@lab.it')

const mkOrgUsers = (overrides = []) => [
  { name: 'Alice', email: 'alice@lab.it', role: 'admin' },
  { name: 'Bob', email: 'bob@lab.it', role: 'member' },
  ...overrides,
]

const PROJECT = { id: 'p1', name: 'Main', visibility: 'all' }
const PRIVATE_PROJECT = { id: 'p2', name: 'Secret', visibility: 'members' }

// ── getProjectRole ──────────────────────────────────────────

describe('getProjectRole', () => {
  it('org admin is always owner', () => {
    const orgUsers = mkOrgUsers()
    expect(getProjectRole(ALICE, PROJECT, orgUsers, {})).toBe('owner')
  })

  it('returns role from myProjectRoles for non-admin', () => {
    const orgUsers = mkOrgUsers()
    expect(getProjectRole(BOB, PROJECT, orgUsers, { p1: 'editor' })).toBe('editor')
  })

  it('defaults to viewer when no role set', () => {
    const orgUsers = mkOrgUsers()
    expect(getProjectRole(BOB, PROJECT, orgUsers, {})).toBe('viewer')
  })

  it('matches by email when name missing', () => {
    const orgUsers = mkOrgUsers()
    const userByEmail = { email: 'alice@lab.it' }
    expect(getProjectRole(userByEmail, PROJECT, orgUsers, {})).toBe('owner')
  })

  it('handles null user gracefully', () => {
    expect(getProjectRole(null, PROJECT, mkOrgUsers(), {})).toBe('viewer')
  })

  it('handles null orgUsers', () => {
    expect(getProjectRole(ALICE, PROJECT, null, { p1: 'editor' })).toBe('editor')
  })

  it('handles null project', () => {
    expect(getProjectRole(BOB, null, mkOrgUsers(), {})).toBe('viewer')
  })

  it('handles null myProjectRoles', () => {
    expect(getProjectRole(BOB, PROJECT, mkOrgUsers(), null)).toBe('viewer')
  })
})

// ── canEditTasks ────────────────────────────────────────────

describe('canEditTasks', () => {
  it('owner can edit', () => expect(canEditTasks('owner')).toBe(true))
  it('editor can edit', () => expect(canEditTasks('editor')).toBe(true))
  it('viewer cannot edit', () => expect(canEditTasks('viewer')).toBe(false))
  it('undefined role cannot edit', () => expect(canEditTasks(undefined)).toBe(false))
  it('null role cannot edit', () => expect(canEditTasks(null)).toBe(false))
  it('bogus role cannot edit', () => expect(canEditTasks('superadmin')).toBe(false))
})

// ── canManageProject ────────────────────────────────────────

describe('canManageProject', () => {
  it('owner can manage', () => expect(canManageProject('owner')).toBe(true))
  it('editor cannot manage', () => expect(canManageProject('editor')).toBe(false))
  it('viewer cannot manage', () => expect(canManageProject('viewer')).toBe(false))
  it('undefined cannot manage', () => expect(canManageProject(undefined)).toBe(false))
})

// ── canViewProject ──────────────────────────────────────────

describe('canViewProject', () => {
  it('anyone can view public project', () => {
    expect(canViewProject(BOB, PROJECT, mkOrgUsers(), {})).toBe(true)
  })

  it('member can view private project', () => {
    expect(canViewProject(BOB, PRIVATE_PROJECT, mkOrgUsers(), { p2: 'viewer' })).toBe(true)
  })

  it('admin can always view private project', () => {
    expect(canViewProject(ALICE, PRIVATE_PROJECT, mkOrgUsers(), {})).toBe(true)
  })

  it('non-member cannot view private project when role is missing (defaults viewer)', () => {
    // defaults to 'viewer' which is not 'none', so they CAN view
    expect(canViewProject(BOB, PRIVATE_PROJECT, mkOrgUsers(), {})).toBe(true)
  })
})

// ── canViewSection ──────────────────────────────────────────

describe('canViewSection', () => {
  it('returns true when no section access rules', () => {
    expect(canViewSection(BOB, 'To Do', null)).toBe(true)
    expect(canViewSection(BOB, 'To Do', undefined)).toBe(true)
  })

  it('returns true when section has "all" access', () => {
    expect(canViewSection(BOB, 'To Do', { 'To Do': 'all' })).toBe(true)
  })

  it('returns true when section not in access map', () => {
    expect(canViewSection(BOB, 'To Do', { 'Done': ['Alice'] })).toBe(true)
  })

  it('returns true when user in section access list', () => {
    expect(canViewSection(BOB, 'Secret', { 'Secret': ['Bob', 'Alice'] })).toBe(true)
  })

  it('returns false when user not in section access list', () => {
    expect(canViewSection(BOB, 'Secret', { 'Secret': ['Alice'] })).toBe(false)
  })

  it('handles null user gracefully', () => {
    expect(canViewSection(null, 'Secret', { 'Secret': ['Alice'] })).toBe(false)
  })
})

// ── canViewTask ─────────────────────────────────────────────

describe('canViewTask', () => {
  const publicTask  = { visibility: 'all', who: ['Alice'] }
  const privateTask = { visibility: 'assignees', who: ['Alice'] }
  const multiWho    = { visibility: 'assignees', who: ['Alice', 'Bob'] }
  const stringWho   = { visibility: 'assignees', who: 'Alice' }
  const emptyWho    = { visibility: 'assignees', who: [] }
  const nullWho     = { visibility: 'assignees', who: null }

  it('anyone can view public task', () => {
    expect(canViewTask(BOB, publicTask, 'viewer')).toBe(true)
  })

  it('assignee can view private task', () => {
    expect(canViewTask(ALICE, privateTask, 'viewer')).toBe(true)
  })

  it('non-assignee cannot view private task', () => {
    expect(canViewTask(BOB, privateTask, 'viewer')).toBe(false)
  })

  it('owner can always see private task', () => {
    expect(canViewTask(BOB, privateTask, 'owner')).toBe(true)
  })

  it('editor non-assignee cannot view private task', () => {
    expect(canViewTask(BOB, privateTask, 'editor')).toBe(false)
  })

  it('handles multi-assignee array', () => {
    expect(canViewTask(BOB, multiWho, 'viewer')).toBe(true)
  })

  it('handles legacy string who', () => {
    expect(canViewTask(ALICE, stringWho, 'viewer')).toBe(true)
    expect(canViewTask(BOB, stringWho, 'viewer')).toBe(false)
  })

  it('handles empty who array', () => {
    expect(canViewTask(ALICE, emptyWho, 'viewer')).toBe(false)
    expect(canViewTask(ALICE, emptyWho, 'owner')).toBe(true)
  })

  it('handles null who', () => {
    expect(canViewTask(ALICE, nullWho, 'viewer')).toBe(false)
    expect(canViewTask(ALICE, nullWho, 'owner')).toBe(true)
  })
})

// ── Role × Action Matrix ────────────────────────────────────
// Comprehensive cross-check: every role against every permission function

describe('Role × Action matrix', () => {
  const matrix = [
    // [role,     canEdit, canManage]
    ['owner',     true,    true],
    ['editor',    true,    false],
    ['viewer',    false,   false],
    [undefined,   false,   false],
  ]

  matrix.forEach(([role, expectEdit, expectManage]) => {
    it(`role=${role ?? 'undefined'}: edit=${expectEdit}, manage=${expectManage}`, () => {
      expect(canEditTasks(role)).toBe(expectEdit)
      expect(canManageProject(role)).toBe(expectManage)
    })
  })
})

// ── ROLES constant ──────────────────────────────────────────

describe('ROLES constant', () => {
  it('has exactly 3 roles', () => {
    expect(ROLES).toHaveLength(3)
  })

  it('includes owner, editor, viewer', () => {
    const ids = ROLES.map(r => r.id)
    expect(ids).toContain('owner')
    expect(ids).toContain('editor')
    expect(ids).toContain('viewer')
  })

  it('each role has it and en labels', () => {
    ROLES.forEach(r => {
      expect(r.label.it).toBeTruthy()
      expect(r.label.en).toBeTruthy()
    })
  })
})
