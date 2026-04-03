/**
 * DB adapter — Project Deliverables CRUD.
 *
 * Part of the Project Supervision layer. All operations are scoped
 * to a project (project_id) and org (org_id) for RLS compatibility.
 */
import { supabase } from '../supabase'
import { validate, DeliverableUpsertSchema } from './schemas'
import { writeAuditSoft } from './audit'
import { logger } from '@/utils/logger'

const log = logger('DB:Deliverables')

// ── Adapter ──────────────────────────────────────────────────────

const toDeliverable = (r) => ({
  id: r.id,
  projectId: r.project_id,
  code: r.code,
  title: r.title,
  description: r.description ?? '',
  owner: r.owner ?? '',
  dueDate: r.due_date ?? null,
  status: r.status,
  linkedMilestoneRef: r.linked_milestone_ref ?? null,
  notes: r.notes ?? '',
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  linkedTaskIds: [], // populated by fetchDeliverables join
})

// ── Read ─────────────────────────────────────────────────────────

export async function fetchDeliverables(projectId) {
  const [{ data, error }, { data: links, error: linkErr }] = await Promise.all([
    supabase
      .from('project_deliverables')
      .select('*')
      .eq('project_id', projectId)
      .order('code'),
    supabase
      .from('project_deliverable_tasks')
      .select('deliverable_id, task_id')
      .eq('org_id', (await supabase.from('projects').select('org_id').eq('id', projectId).single()).data?.org_id ?? ''),
  ])
  if (error) throw error
  if (linkErr) log.warn('Failed to fetch deliverable-task links:', linkErr.message)

  const linkMap = {}
  for (const l of (links ?? [])) {
    if (!linkMap[l.deliverable_id]) linkMap[l.deliverable_id] = []
    linkMap[l.deliverable_id].push(l.task_id)
  }

  return (data ?? []).map(r => ({
    ...toDeliverable(r),
    linkedTaskIds: linkMap[r.id] ?? [],
  }))
}

export async function fetchSupervisionSettings(projectId) {
  const { data, error } = await supabase
    .from('project_supervision_settings')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()
  if (error) throw error
  return data ? {
    projectId: data.project_id,
    cockpitWindowDefault: data.cockpit_window_default,
  } : null
}

// ── Write ────────────────────────────────────────────────────────

export async function upsertDeliverable(orgId, projectId, deliverable) {
  const d = validate(DeliverableUpsertSchema, deliverable)
  const row = {
    id: d.id ?? undefined,
    project_id: projectId,
    org_id: orgId,
    code: d.code,
    title: d.title,
    description: d.description ?? null,
    owner: d.owner ?? null,
    due_date: d.dueDate ?? null,
    status: d.status,
    linked_milestone_ref: d.linkedMilestoneRef ?? null,
    notes: d.notes ?? null,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('project_deliverables')
    .upsert(row)
    .select()
    .single()
  if (error) throw error

  await writeAuditSoft(orgId, {
    action: d.id ? 'deliverable_updated' : 'deliverable_created',
    entityType: 'deliverable',
    entityId: data.id,
    entityName: `${d.code} ${d.title}`,
  })

  return toDeliverable(data)
}

export async function deleteDeliverable(orgId, deliverableId, label) {
  const { error } = await supabase
    .from('project_deliverables')
    .delete()
    .eq('id', deliverableId)
  if (error) throw error

  await writeAuditSoft(orgId, {
    action: 'deliverable_deleted',
    entityType: 'deliverable',
    entityId: deliverableId,
    entityName: label ?? deliverableId,
  })
}

// ── Task linking ─────────────────────────────────────────────────

export async function linkTask(orgId, deliverableId, taskId) {
  const { error } = await supabase
    .from('project_deliverable_tasks')
    .upsert({ deliverable_id: deliverableId, task_id: taskId, org_id: orgId })
  if (error) throw error
}

export async function unlinkTask(deliverableId, taskId) {
  const { error } = await supabase
    .from('project_deliverable_tasks')
    .delete()
    .eq('deliverable_id', deliverableId)
    .eq('task_id', taskId)
  if (error) throw error
}

// ── Supervision settings ─────────────────────────────────────────

export async function upsertSupervisionSettings(orgId, projectId, settings = {}) {
  const { error } = await supabase
    .from('project_supervision_settings')
    .upsert({
      project_id: projectId,
      org_id: orgId,
      cockpit_window_default: settings.cockpitWindowDefault ?? 14,
      updated_at: new Date().toISOString(),
    })
  if (error) throw error
}
