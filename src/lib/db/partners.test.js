import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock supabase ────────────────────────────────────────────────
// Every chain method returns the same thenable object.
// Tests set `_result` before calling the adapter to control what the chain resolves to.
// `single()` is special: it returns a separate promise (for upsert flows).

let _result = { data: null, error: null }
const mockSingle = vi.fn()

const chain = () => {
  const obj = {
    select:  () => obj,
    eq:      () => obj,
    order:   () => obj,
    upsert:  () => obj,
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
  PartnerUpsertSchema: {},
}))

import { supabase } from '../supabase'
import { writeAuditSoft } from './audit'

beforeEach(() => {
  vi.clearAllMocks()
  _result = { data: null, error: null }
  supabase.from.mockImplementation(() => chain())
})

describe('partners adapter', () => {
  describe('fetchOrgPartners', () => {
    it('queries partners table filtered by org_id', async () => {
      const data = [
        { id: 'pt1', org_id: 'org1', name: 'Acme', type: 'vendor', is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' },
      ]
      _result = { data, error: null }

      const { fetchOrgPartners } = await import('./partners')
      const result = await fetchOrgPartners('org1')

      expect(supabase.from).toHaveBeenCalledWith('partners')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Acme')
      expect(result[0].orgId).toBe('org1')
    })

    it('throws on supabase error', async () => {
      _result = { data: null, error: new Error('db down') }

      const { fetchOrgPartners } = await import('./partners')
      await expect(fetchOrgPartners('org1')).rejects.toThrow('db down')
    })
  })

  describe('upsertPartner', () => {
    it('inserts new partner and writes audit', async () => {
      const saved = { id: 'pt99', org_id: 'org1', name: 'NewCo', type: 'partner', is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01' }
      mockSingle.mockResolvedValueOnce({ data: saved, error: null })

      const { upsertPartner } = await import('./partners')
      const result = await upsertPartner('org1', { name: 'NewCo', type: 'partner' })

      expect(result.name).toBe('NewCo')
      expect(result.id).toBe('pt99')
      expect(writeAuditSoft).toHaveBeenCalledWith('org1', expect.objectContaining({
        action: 'partner_created',
        entityType: 'partner',
      }))
    })
  })

  describe('deletePartner', () => {
    it('deletes partner and writes audit', async () => {
      _result = { error: null }

      const { deletePartner } = await import('./partners')
      await deletePartner('org1', 'pt1', 'Acme')

      expect(supabase.from).toHaveBeenCalledWith('partners')
      expect(writeAuditSoft).toHaveBeenCalledWith('org1', expect.objectContaining({
        action: 'partner_deleted',
        entityId: 'pt1',
        entityName: 'Acme',
      }))
    })
  })

  describe('linkPartnerToProject', () => {
    it('upserts into project_partners junction', async () => {
      _result = { error: null }

      const { linkPartnerToProject } = await import('./partners')
      await linkPartnerToProject('org1', 'proj1', 'pt1', 'Lead')

      expect(supabase.from).toHaveBeenCalledWith('project_partners')
      expect(writeAuditSoft).toHaveBeenCalledWith('org1', expect.objectContaining({
        action: 'partner_linked',
      }))
    })
  })

  describe('unlinkPartnerFromProject', () => {
    it('deletes from project_partners junction', async () => {
      _result = { error: null }

      const { unlinkPartnerFromProject } = await import('./partners')
      await unlinkPartnerFromProject('org1', 'proj1', 'pt1')

      expect(supabase.from).toHaveBeenCalledWith('project_partners')
      expect(writeAuditSoft).toHaveBeenCalledWith('org1', expect.objectContaining({
        action: 'partner_unlinked',
      }))
    })
  })
})
