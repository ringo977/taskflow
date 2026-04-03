/**
 * DB adapter — Recurring Governance Controls CRUD.
 *
 * Part of the Project Supervision layer. Controls are periodic checks
 * that either create a task or show a reminder when next_due_date <= today.
 *
 * V1: evaluation is client-side only (no server-side cron).
 */
import { supabase } from '../supabase'
import { validate, RecurringControlUpsertSchema } from './schemas'
import { writeAuditSoft } from './audit'
import { logger } from '@/utils/logger'

const log = logger('DB:RecurringControls')

// ── Adapter ──────────────────────────────────────────────────────

const toControl = (r) => ({
  id: r.id,
  projectId: r.project_id,
  title: r.title,
  description: r.description ?? '',
  frequency: r.frequency,
  customInterval: r.custom_interval ?? null,
  nextDueDate: r.next_due_date ?? null,
  actionType: r.action_type,
  templateTaskData: r.template_task_data ?? null,
  active: r.active,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

// ── Read ─────────────────────────────────────────────────────────

export async function fetchRecurringControls(projectId) {
  const { data, error } = await supabase
    .from('project_recurring_controls')
    .select('*')
    .eq('project_id', projectId)
    .order('next_due_date', { nullsFirst: false })
  if (error) throw error
  return (data ?? []).map(toControl)
}

// ── Write ────────────────────────────────────────────────────────

export async function upsertRecurringControl(orgId, projectId, control) {
  const c = validate(RecurringControlUpsertSchema, control)
  const row = {
    id: c.id ?? undefined,
    project_id: projectId,
    org_id: orgId,
    title: c.title,
    description: c.description ?? null,
    frequency: c.frequency,
    custom_interval: c.customInterval ?? null,
    next_due_date: c.nextDueDate ?? null,
    action_type: c.actionType,
    template_task_data: c.templateTaskData ?? null,
    active: c.active,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('project_recurring_controls')
    .upsert(row)
    .select()
    .single()
  if (error) throw error

  await writeAuditSoft(orgId, {
    action: c.id ? 'recurring_control_updated' : 'recurring_control_created',
    entityType: 'recurring_control',
    entityId: data.id,
    entityName: c.title,
  })

  return toControl(data)
}

export async function deleteRecurringControl(orgId, controlId, label) {
  const { error } = await supabase
    .from('project_recurring_controls')
    .delete()
    .eq('id', controlId)
  if (error) throw error

  await writeAuditSoft(orgId, {
    action: 'recurring_control_deleted',
    entityType: 'recurring_control',
    entityId: controlId,
    entityName: label ?? controlId,
  })
}

// ── Due-date advancement ─────────────────────────────────────────

/**
 * Advance next_due_date based on frequency after a control has been evaluated.
 * Returns the updated control.
 */
export async function advanceControlDueDate(orgId, control) {
  const today = new Date()
  let next

  if (control.frequency === 'weekly') {
    next = new Date(today)
    next.setDate(next.getDate() + 7)
  } else if (control.frequency === 'monthly') {
    next = new Date(today)
    next.setMonth(next.getMonth() + 1)
  } else if (control.frequency === 'custom' && control.customInterval) {
    next = new Date(today)
    next.setDate(next.getDate() + control.customInterval)
  } else {
    log.warn('Cannot advance due date: unknown frequency or missing interval', control.frequency)
    return control
  }

  const nextISO = next.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('project_recurring_controls')
    .update({ next_due_date: nextISO, updated_at: new Date().toISOString() })
    .eq('id', control.id)
    .select()
    .single()
  if (error) throw error

  await writeAuditSoft(orgId, {
    action: 'recurring_control_advanced',
    entityType: 'recurring_control',
    entityId: control.id,
    entityName: `${control.title} → ${nextISO}`,
  })

  return toControl(data)
}
