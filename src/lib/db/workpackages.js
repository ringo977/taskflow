/**
 * DB adapter — Project Workpackages CRUD.
 *
 * Project-level structural grouping: Project → WP → Task.
 * Each WP belongs to a single project, with optional typed owner
 * (either a user or a partner, but not both).
 */
import { supabase } from '../supabase'
import { validate, WorkpackageUpsertSchema } from './schemas'
import { writeAuditSoft } from './audit'
import { logger } from '@/utils/logger'

// eslint-disable-next-line no-unused-vars
const log = logger('DB:Workpackages')

// ── Adapter ──────────────────────────────────────────────────────

const toWorkpackage = (r) => ({
  id: r.id,
  projectId: r.project_id,
  orgId: r.org_id,
  code: r.code,
  name: r.name,
  description: r.description ?? '',
  ownerUserId: r.owner_user_id ?? null,
  ownerPartnerId: r.owner_partner_id ?? null,
  startDate: r.start_date ?? null,
  dueDate: r.due_date ?? null,
  status: r.status ?? 'draft',
  position: r.position ?? 0,
  isActive: r.is_active ?? true,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

// ── Read ─────────────────────────────────────────────────────────

/** All workpackages for a project, ordered by position */
export async function fetchWorkpackages(projectId) {
  const { data, error } = await supabase
    .from('project_workpackages')
    .select('*')
    .eq('project_id', projectId)
    .order('position')
  if (error) throw error
  return (data ?? []).map(toWorkpackage)
}

/** All workpackages for an org (used by dashboard / CSV export) */
export async function fetchOrgWorkpackages(orgId) {
  const { data, error } = await supabase
    .from('project_workpackages')
    .select('*')
    .eq('org_id', orgId)
    .order('position')
  if (error) throw error
  return (data ?? []).map(toWorkpackage)
}

// ── Write ────────────────────────────────────────────────────────

export async function upsertWorkpackage(orgId, projectId, workpackage) {
  const wp = validate(WorkpackageUpsertSchema, workpackage)
  const row = {
    ...(wp.id ? { id: wp.id } : {}),
    project_id: projectId,
    org_id: orgId,
    code: wp.code,
    name: wp.name,
    description: wp.description ?? null,
    owner_user_id: wp.ownerUserId ?? null,
    owner_partner_id: wp.ownerPartnerId ?? null,
    start_date: wp.startDate ?? null,
    due_date: wp.dueDate ?? null,
    status: wp.status,
    position: wp.position ?? 0,
    is_active: wp.isActive ?? true,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('project_workpackages')
    .upsert(row)
    .select()
    .single()
  if (error) throw error

  await writeAuditSoft(orgId, {
    action: wp.id ? 'workpackage_updated' : 'workpackage_created',
    entityType: 'workpackage',
    entityId: data.id,
    entityName: `${wp.code} ${wp.name}`,
  })

  return toWorkpackage(data)
}

export async function deleteWorkpackage(orgId, wpId, label) {
  const { error } = await supabase
    .from('project_workpackages')
    .delete()
    .eq('id', wpId)
  if (error) throw error

  await writeAuditSoft(orgId, {
    action: 'workpackage_deleted',
    entityType: 'workpackage',
    entityId: wpId,
    entityName: label ?? wpId,
  })
}

/** Bulk-update positions after drag reorder */
export async function reorderWorkpackages(orgId, projectId, orderedIds) {
  const updates = orderedIds.map((id, i) =>
    supabase.from('project_workpackages').update({ position: i, updated_at: new Date().toISOString() }).eq('id', id)
  )
  const results = await Promise.all(updates)
  const failed = results.find(r => r.error)
  if (failed) throw failed.error

  await writeAuditSoft(orgId, {
    action: 'workpackages_reordered',
    entityType: 'workpackage',
    entityId: projectId,
    entityName: `${orderedIds.length} workpackages`,
  })
}
