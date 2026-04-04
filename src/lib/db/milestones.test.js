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
  MilestoneUpsertSchema: {},
}))

import { supabase } from '../supabase'
import { writeAuditSoft } from './audit'

beforeEach(() => {
  vi.clearAllMocks()
  _result = { data: null, error: null }
  supabase.from.mockImplementation(() => chain())
})

const sampleRow = {
  id: 'ms-uuid-1', project_id: 'proj1', org_id: 'org1',
  workpackage_id: null,
  code: 'MS1', name: 'Prototype review', description: 'Means of verification',
  owner_user_id: null, owner_partner_id: null,
  target_date: '2026-06-15', status: 'pending', position: 0,
  is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01',
}

describe('milestones adapter', () => {
  describe('fetchMilestones', () => {
    it('queries by project_id and transforms rows', async () => {
      _result = { data: [sampleRow], error: null }

      const { fetchMilestones } = await import('./milestones')
      const result = await fetchMilestones('proj1')

      expect(supabase.from).toHaveBeenCalledWith('project_milestones')
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('MS1')
      expect(result[0].projectId).toBe('proj1')
      expect(result[0].targetDate).toBe('2026-06-15')
      expect(result[0].isActive).toBe(true)
    })

    it('throws on supabase error', async () => {
      _result = { data: null, error: new Error('db down') }

      const { fetchMilestones } = await import('./milestones')
      await expect(fetchMilestones('proj1')).rejects.toThrow('db down')
    })
  })

  describe('fetchOrgMilestones', () => {
    it('queries by org_id and returns transformed rows', async () => {
      _result = { data: [sampleRow], error: null }

      const { fetchOrgMilestones } = await import('./milestones')
      const result = await fetchOrgMilestones('org1')

      expect(supabase.from).toHaveBeenCalledWith('project_milestones')
      expect(result).toHaveLength(1)
      expect(result[0].orgId).toBe('org1')
    })

    it('throws on supabase error', async () => {
      _result = { data: null, error: new Error('org err') }

      const { fetchOrgMilestones } = await import('./milestones')
      await expect(fetchOrgMilestones('org1')).rejects.toThrow('org err')
    })
  })

  describe('upsertMilestone', () => {
    it('creates new milestone and writes audit', async () => {
      const saved = { ...sampleRow, id: 'ms-new' }
      mockSingle.mockResolvedValueOnce({ data: saved, error: null })

      const { upsertMilestone } = await import('./milestones')
      const result = await upsertMilestone('org1', 'proj1', { code: 'MS1', name: 'Prototype review', status: 'pending' })

      expect(result.code).toBe('MS1')
      expect(result.id).toBe('ms-new')
      expect(writeAuditSoft).toHaveBeenCalledWith('org1', expect.objectContaining({
        action: 'milestone_created',
        entityType: 'milestone',
      }))
    })

    it('updates existing milestone with correct audit action', async () => {
      const saved = { ...sampleRow }
      mockSingle.mockResolvedValueOnce({ data: saved, error: null })

      const { upsertMilestone } = await import('./milestones')
      await upsertMilestone('org1', 'proj1', { id: 'ms-uuid-1', code: 'MS1', name: 'Prototype review v2', status: 'achieved' })

      expect(writeAuditSoft).toHaveBeenCalledWith('org1', expect.objectContaining({
        action: 'milestone_updated',
      }))
    })
  })

  describe('deleteMilestone', () => {
    it('deletes milestone and writes audit', async () => {
      _result = { error: null }

      const { deleteMilestone } = await import('./milestones')
      await deleteMilestone('org1', 'ms-uuid-1', 'MS1 Prototype review')

      expect(supabase.from).toHaveBeenCalledWith('project_milestones')
      expect(writeAuditSoft).toHaveBeenCalledWith('org1', expect.objectContaining({
        action: 'milestone_deleted',
        entityId: 'ms-uuid-1',
        entityName: 'MS1 Prototype review',
      }))
    })
  })

  describe('reorderMilestones', () => {
    it('bulk-updates positions and writes audit', async () => {
      supabase.from.mockImplementation(() => chain())
      _result = { error: null }

      const { reorderMilestones } = await import('./milestones')
      await reorderMilestones('org1', 'proj1', ['ms-a', 'ms-b', 'ms-c'])

      expect(supabase.from).toHaveBeenCalledTimes(3)
      expect(writeAuditSoft).toHaveBeenCalledWith('org1', expect.objectContaining({
        action: 'milestones_reordered',
        entityId: 'proj1',
      }))
    })
  })
})
