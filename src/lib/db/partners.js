/**
 * DB adapter — Partners / Teams CRUD.
 *
 * Org-level entities for tracking external partners, teams, vendors, etc.
 * Linked to projects via junction table `project_partners`.
 * Tasks get an optional `partner_id` FK (one-to-one).
 */
import { supabase } from '../supabase'
import { validate, PartnerUpsertSchema } from './schemas'
import { writeAuditSoft } from './audit'
import { logger } from '@/utils/logger'

// eslint-disable-next-line no-unused-vars
const log = logger('DB:Partners')

// ── Adapter ──────────────────────────────────────────────────────

const toPartner = (r) => ({
  id: r.id,
  orgId: r.org_id,
  name: r.name,
  type: r.type ?? 'partner',
  contactName: r.contact_name ?? '',
  contactEmail: r.contact_email ?? '',
  notes: r.notes ?? '',
  isActive: r.is_active ?? true,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

// ── Read ─────────────────────────────────────────────────────────

/** All partners belonging to the organisation */
export async function fetchOrgPartners(orgId) {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('org_id', orgId)
    .order('name')
  if (error) throw error
  return (data ?? []).map(toPartner)
}

/** Partners linked to a specific project (via junction), enriched with partner data */
export async function fetchProjectPartners(projectId) {
  const { data: links, error: linkErr } = await supabase
    .from('project_partners')
    .select('*, partners(*)')
    .eq('project_id', projectId)
  if (linkErr) throw linkErr

  return (links ?? []).map(r => ({
    projectId: r.project_id,
    partnerId: r.partner_id,
    roleLabel: r.role_label ?? '',
    createdAt: r.created_at,
    partner: r.partners ? toPartner(r.partners) : null,
  }))
}

// ── Write ────────────────────────────────────────────────────────

export async function upsertPartner(orgId, partner) {
  const p = validate(PartnerUpsertSchema, partner)
  const row = {
    ...(p.id ? { id: p.id } : {}),
    org_id: orgId,
    name: p.name,
    type: p.type,
    contact_name: p.contactName ?? null,
    contact_email: p.contactEmail ?? null,
    notes: p.notes ?? null,
    is_active: p.isActive ?? true,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('partners')
    .upsert(row)
    .select()
    .single()
  if (error) throw error

  await writeAuditSoft(orgId, {
    action: p.id ? 'partner_updated' : 'partner_created',
    entityType: 'partner',
    entityId: data.id,
    entityName: p.name,
  })

  return toPartner(data)
}

export async function deletePartner(orgId, partnerId, label) {
  const { error } = await supabase
    .from('partners')
    .delete()
    .eq('id', partnerId)
  if (error) throw error

  await writeAuditSoft(orgId, {
    action: 'partner_deleted',
    entityType: 'partner',
    entityId: partnerId,
    entityName: label ?? partnerId,
  })
}

// ── Junction: project ↔ partner ──────────────────────────────────

export async function linkPartnerToProject(orgId, projectId, partnerId, roleLabel = null) {
  const { error } = await supabase
    .from('project_partners')
    .upsert({
      project_id: projectId,
      partner_id: partnerId,
      org_id: orgId,
      role_label: roleLabel,
    })
  if (error) throw error

  await writeAuditSoft(orgId, {
    action: 'partner_linked',
    entityType: 'project_partner',
    entityId: `${projectId}:${partnerId}`,
    entityName: roleLabel ?? partnerId,
  })
}

export async function unlinkPartnerFromProject(orgId, projectId, partnerId) {
  const { error } = await supabase
    .from('project_partners')
    .delete()
    .eq('project_id', projectId)
    .eq('partner_id', partnerId)
  if (error) throw error

  await writeAuditSoft(orgId, {
    action: 'partner_unlinked',
    entityType: 'project_partner',
    entityId: `${projectId}:${partnerId}`,
  })
}
