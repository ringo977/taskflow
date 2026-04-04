import { describe, it, expect } from 'vitest'
import {
  getProjectRole,
  canEditTasks,
  canManageProject,
  canViewProject,
  canViewSection,
  canViewTask,
  canApproveMilestone,
  canEditTaskInWp,
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

  it('org member defaults to editor when no project role set', () => {
    const orgUsers = mkOrgUsers()
    expect(getProjectRole(BOB, PROJECT, orgUsers, {})).toBe('editor')
  })

  it('org manager defaults to editor when no project role set', () => {
    const orgUsers = [{ name: 'Carol', email: 'carol@lab.it', role: 'manager' }]
    const carol = mkUser('Carol', 'carol@lab.it')
    expect(getProjectRole(carol, PROJECT, orgUsers, {})).toBe('editor')
  })

  it('org guest defaults to viewer when no project role set', () => {
    const orgUsers = [{ name: 'Guest', email: 'guest@lab.it', role: 'guest' }]
    const guest = mkUser('Guest', 'guest@lab.it')
    expect(getProjectRole(guest, PROJECT, orgUsers, {})).toBe('viewer')
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

  it('handles null project (member defaults to editor)', () => {
    expect(getProjectRole(BOB, null, mkOrgUsers(), {})).toBe('editor')
  })

  it('handles null myProjectRoles (member defaults to editor)', () => {
    expect(getProjectRole(BOB, PROJECT, mkOrgUsers(), null)).toBe('editor')
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

// ── canApproveMilestone ────────────────────────────────────

describe('canApproveMilestone', () => {
  it('owner can approve', () => expect(canApproveMilestone('owner')).toBe(true))
  it('editor can approve', () => expect(canApproveMilestone('editor')).toBe(true))
  it('viewer cannot approve', () => expect(canApproveMilestone('viewer')).toBe(false))
  it('undefined role cannot approve', () => expect(canApproveMilestone(undefined)).toBe(false))
  it('null role cannot approve', () => expect(canApproveMilestone(null)).toBe(false))
  it('bogus role cannot approve', () => expect(canApproveMilestone('superadmin')).toBe(false))
})

// ── canEditTaskInWp ────────────────────────────────────────

describe('canEditTaskInWp', () => {
  const USER_ID = '11111111-1111-1111-1111-111111111111'
  const OTHER_ID = '22222222-2222-2222-2222-222222222222'

  // No WP — falls through to canEditTasks
  it('no WP: owner can edit', () => expect(canEditTaskInWp('owner', null, USER_ID)).toBe(true))
  it('no WP: editor can edit', () => expect(canEditTaskInWp('editor', null, USER_ID)).toBe(true))
  it('no WP: viewer cannot edit', () => expect(canEditTaskInWp('viewer', null, USER_ID)).toBe(false))

  // access = 'all' — same as canEditTasks
  describe('access = all', () => {
    const wp = { access: 'all', ownerUserId: OTHER_ID }
    it('owner can edit', () => expect(canEditTaskInWp('owner', wp, USER_ID)).toBe(true))
    it('editor can edit', () => expect(canEditTaskInWp('editor', wp, USER_ID)).toBe(true))
    it('viewer cannot edit', () => expect(canEditTaskInWp('viewer', wp, USER_ID)).toBe(false))
  })

  // access = 'editors' — editor+
  describe('access = editors', () => {
    const wp = { access: 'editors', ownerUserId: OTHER_ID }
    it('owner can edit', () => expect(canEditTaskInWp('owner', wp, USER_ID)).toBe(true))
    it('editor can edit', () => expect(canEditTaskInWp('editor', wp, USER_ID)).toBe(true))
    it('viewer cannot edit', () => expect(canEditTaskInWp('viewer', wp, USER_ID)).toBe(false))
  })

  // access = 'owner_only' with user owner
  describe('access = owner_only (user owner)', () => {
    const wp = { access: 'owner_only', ownerUserId: USER_ID }
    it('WP owner can edit regardless of project role', () => {
      expect(canEditTaskInWp('viewer', wp, USER_ID)).toBe(true)
    })
    it('non-owner cannot edit even as project owner', () => {
      expect(canEditTaskInWp('owner', wp, OTHER_ID)).toBe(false)
    })
    it('non-owner editor cannot edit', () => {
      expect(canEditTaskInWp('editor', wp, OTHER_ID)).toBe(false)
    })
  })

  // access = 'owner_only' with partner owner (no ownerUserId) → fallback to editors
  describe('access = owner_only (partner owner, no user mapping)', () => {
    const wp = { access: 'owner_only', ownerUserId: null, ownerPartnerId: 'partner-1' }
    it('owner can edit (fallback to editors)', () => {
      expect(canEditTaskInWp('owner', wp, USER_ID)).toBe(true)
    })
    it('editor can edit (fallback to editors)', () => {
      expect(canEditTaskInWp('editor', wp, USER_ID)).toBe(true)
    })
    it('viewer cannot edit', () => {
      expect(canEditTaskInWp('viewer', wp, USER_ID)).toBe(false)
    })
  })

  // access = 'owner_only' with no owner at all → fallback to editors
  describe('access = owner_only (no owner set)', () => {
    const wp = { access: 'owner_only', ownerUserId: null }
    it('editor can edit (fallback)', () => {
      expect(canEditTaskInWp('editor', wp, USER_ID)).toBe(true)
    })
    it('viewer cannot edit', () => {
      expect(canEditTaskInWp('viewer', wp, USER_ID)).toBe(false)
    })
  })

  // Defaults / edge cases
  it('WP with missing access field defaults to "all"', () => {
    const wp = { ownerUserId: null }
    expect(canEditTaskInWp('editor', wp, USER_ID)).toBe(true)
    expect(canEditTaskInWp('viewer', wp, USER_ID)).toBe(false)
  })

  it('unknown access value defaults to canEditTasks', () => {
    const wp = { access: 'unknown_value', ownerUserId: null }
    expect(canEditTaskInWp('editor', wp, USER_ID)).toBe(true)
    expect(canEditTaskInWp('viewer', wp, USER_ID)).toBe(false)
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
