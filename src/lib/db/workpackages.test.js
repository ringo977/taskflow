import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock supabase ────────────────────────────────────────────────
// Self-referencing chain object. Tests set `_result` to control resolution.

let _result = { data: null, error: null }
const mockSingle = vi.fn()

const chain = () => {
  const obj = {
    select:  () => obj,
    eq:      () => obj,
    order:   () => obj,
    upsert:  () => obj,
    update:  () => obj,
    delete:  () => obj,
    single:  mockSingle,
    then:    (resolve, reject) => Promise.resolve(_result).then(resolve, reject),
  }
  return obj
}

vi.mock('../supabase', () => ({
  supabase: { from: vi.fn(() => chain()) },
}))

vi.mock('./audit', () => ({
  writeAuditSoft: vi.fn(),
}))

vi.mock('./schemas', () => ({
  validate: (_schema, data) => data,
  WorkpackageUpsertSchema: {},
}))

import { supabase } from '../supabase'
import { writeAuditSoft } from './audit'

beforeEach(() => {
  vi.clearAllMocks()
  _result = { data: null, error: null }
  supabase.from.mockImplementation(() => chain())
})

const sampleRow = {
  id: 'wp-uuid-1', project_id: 'proj1', org_id: 'org1',
  code: 'WP1', name: 'Analysis', description: 'Desc',
  owner_user_id: null, owner_partner_id: null,
  due_date: '2026-06-01', status: 'active', position: 0,
  is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01',
}

describe('workpackages adapter', () => {
  describe('fetchWorkpackages', () => {
    it('queries by project_id and transforms rows', async () => {
      _result = { data: [sampleRow], error: null }

      const { fetchWorkpackages } = await import('./workpackages')
      const result = await fetchWorkpackages('proj1')

      expect(supabase.from).toHaveBeenCalledWith('project_workpackages')
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('WP1')
      expect(result[0].projectId).toBe('proj1')
      expect(result[0].isActive).toBe(true)
    })

    it('throws on supabase error', async () => {
      _result = { data: null, error: new Error('db down') }

      const { fetchWorkpackages } = await import('./workpackages')
      await expect(fetchWorkpackages('proj1')).rejects.toThrow('db down')
    })
  })

  describe('fetchOrgWorkpackages', () => {
    it('queries by org_id and returns transformed rows', async () => {
      _result = { data: [sampleRow], error: null }

      const { fetchOrgWorkpackages } = await import('./workpackages')
      const result = await fetchOrgWorkpackages('org1')

      expect(supabase.from).toHaveBeenCalledWith('project_workpackages')
      expect(result).toHaveLength(1)
      expect(result[0].orgId).toBe('org1')
    })

    it('throws on supabase error', async () => {
      _result = { data: null, error: new Error('org err') }

      const { fetchOrgWorkpackages } = await import('./workpackages')
      await expect(fetchOrgWorkpackages('org1')).rejects.toThrow('org err')
    })
  })

  describe('upsertWorkpackage', () => {
    it('creates new workpackage and writes audit', async () => {
      const saved = { ...sampleRow, id: 'wp-new' }
      mockSingle.mockResolvedValueOnce({ data: saved, error: null })

      const { upsertWorkpackage } = await import('./workpackages')
      const result = await upsertWorkpackage('org1', 'proj1', { code: 'WP1', name: 'Analysis', status: 'active' })

      expect(result.code).toBe('WP1')
      expect(result.id).toBe('wp-new')
      expect(writeAuditSoft).toHaveBeenCalledWith('org1', expect.objectContaining({
        action: 'workpackage_created',
        entityType: 'workpackage',
      }))
    })

    it('updates existing workpackage with correct audit action', async () => {
      const saved = { ...sampleRow }
      mockSingle.mockResolvedValueOnce({ data: saved, error: null })

      const { upsertWorkpackage } = await import('./workpackages')
      await upsertWorkpackage('org1', 'proj1', { id: 'wp-uuid-1', code: 'WP1', name: 'Analysis v2', status: 'active' })

      expect(writeAuditSoft).toHaveBeenCalledWith('org1', expect.objectContaining({
        action: 'workpackage_updated',
      }))
    })
  })

  describe('deleteWorkpackage', () => {
    it('deletes workpackage and writes audit', async () => {
      _result = { error: null }

      const { deleteWorkpackage } = await import('./workpackages')
      await deleteWorkpackage('org1', 'wp-uuid-1', 'WP1 Analysis')

      expect(supabase.from).toHaveBeenCalledWith('project_workpackages')
      expect(writeAuditSoft).toHaveBeenCalledWith('org1', expect.objectContaining({
        action: 'workpackage_deleted',
        entityId: 'wp-uuid-1',
        entityName: 'WP1 Analysis',
      }))
    })
  })

  describe('reorderWorkpackages', () => {
    it('bulk-updates positions and writes audit', async () => {
      // Each update call returns { error: null }
      supabase.from.mockImplementation(() => chain())
      _result = { error: null }

      const { reorderWorkpackages } = await import('./workpackages')
      await reorderWorkpackages('org1', 'proj1', ['wp-a', 'wp-b', 'wp-c'])

      // 3 update calls + 1 audit
      expect(supabase.from).toHaveBeenCalledTimes(3)
      expect(writeAuditSoft).toHaveBeenCalledWith('org1', expect.objectContaining({
        action: 'workpackages_reordered',
        entityId: 'proj1',
      }))
    })
  })
})
