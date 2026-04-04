/**
 * DB adapter — Project Milestones CRUD.
 *
 * Structured milestones: Project → Milestone (optionally scoped to a WP).
 * Each milestone has a single target_date (point, not interval),
 * typed owner (user or partner, not both), and status lifecycle
 * draft → pending → achieved | missed.
 *
 * Tasks are LINKED TO milestones via tasks.milestone_id — they are not
 * milestones themselves. The milestone is the real entity.
 */
import { supabase } from '../supabase'
import { validate, MilestoneUpsertSchema } from './schemas'
import { writeAuditSoft } from './audit'
import { logger } from '@/utils/logger'

// eslint-disable-next-line no-unused-vars
const log = logger('DB:Milestones')

// ── Adapter ──────────────────────────────────────────────────────

const toMilestone = (r) => ({
  id: r.id,
  projectId: r.project_id,
  orgId: r.org_id,
  workpackageId: r.workpackage_id ?? null,
  code: r.code,
  name: r.name,
  description: r.description ?? '',
  ownerUserId: r.owner_user_id ?? null,
  ownerPartnerId: r.owner_partner_id ?? null,
  targetDate: r.target_date ?? null,
  status: r.status ?? 'draft',
  position: r.position ?? 0,
  isActive: r.is_active ?? true,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

// ── Read ─────────────────────────────────────────────────────────

/** All milestones for a project, ordered by position */
export async function fetchMilestones(projectId) {
  const { data, error } = await supabase
    .from('project_milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('position')
  if (error) throw error
  return (data ?? []).map(toMilestone)
}

/** All milestones for an org (used by dashboard widget) */
export async function fetchOrgMilestones(orgId) {
  const { data, error } = await supabase
    .from('project_milestones')
    .select('*')
    .eq('org_id', orgId)
    .order('position')
  if (error) throw error
  return (data ?? []).map(toMilestone)
}

// ── Write ────────────────────────────────────────────────────────

export async function upsertMilestone(orgId, projectId, milestone) {
  const ms = validate(MilestoneUpsertSchema, milestone)
  const row = {
    ...(ms.id ? { id: ms.id } : {}),
    project_id: projectId,
    org_id: orgId,
    workpackage_id: ms.workpackageId ?? null,
    code: ms.code,
    name: ms.name,
    description: ms.description ?? null,
    owner_user_id: ms.ownerUserId ?? null,
    owner_partner_id: ms.ownerPartnerId ?? null,
    target_date: ms.targetDate ?? null,
    status: ms.status,
    position: ms.position ?? 0,
    is_active: ms.isActive ?? true,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('project_milestones')
    .upsert(row)
    .select()
    .single()
  if (error) throw error

  await writeAuditSoft(orgId, {
    action: ms.id ? 'milestone_updated' : 'milestone_created',
    entityType: 'milestone',
    entityId: data.id,
    entityName: `${ms.code} ${ms.name}`,
  })

  return toMilestone(data)
}

export async function deleteMilestone(orgId, msId, label) {
  const { error } = await supabase
    .from('project_milestones')
    .delete()
    .eq('id', msId)
  if (error) throw error

  await writeAuditSoft(orgId, {
    action: 'milestone_deleted',
    entityType: 'milestone',
    entityId: msId,
    entityName: label ?? msId,
  })
}

/** Bulk-update positions after drag reorder */
export async function reorderMilestones(orgId, projectId, orderedIds) {
  const updates = orderedIds.map((id, i) =>
    supabase.from('project_milestones').update({ position: i, updated_at: new Date().toISOString() }).eq('id', id)
  )
  const results = await Promise.all(updates)
  const failed = results.find(r => r.error)
  if (failed) throw failed.error

  await writeAuditSoft(orgId, {
    action: 'milestones_reordered',
    entityType: 'milestone',
    entityId: projectId,
    entityName: `${orderedIds.length} milestones`,
  })
}
