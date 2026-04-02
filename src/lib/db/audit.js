/**
 * Audit log writer.
 *
 * All writes are fire-and-forget: a failure never blocks the main
 * operation. The audit log is best-effort for UX purposes; it is
 * NOT a substitute for database-level triggers for strict compliance.
 *
 * Actions:
 *   task_created        task_updated      task_deleted
 *   task_completed      task_assigned
 *   comment_added       comment_deleted
 *   member_role_changed
 */

import { supabase } from '../supabase'
import { logger } from '@/utils/logger'

const log = logger('Audit')

/**
 * Write a single audit entry. Never throws — errors are logged only.
 *
 * @param {string} orgId
 * @param {{ action, entityType, entityId, entityName?, diff? }} entry
 */
export async function writeAudit(orgId, { action, entityType, entityId, entityName, diff }) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('audit_log').insert({
      org_id:      orgId,
      user_id:     user?.id ?? null,
      action,
      entity_type: entityType,
      entity_id:   String(entityId),
      entity_name: entityName ?? null,
      diff:        diff ?? null,
    })
    if (error) log.warn('audit write failed:', error.message)
  } catch (err) {
    log.warn('audit write error:', err.message ?? err)
  }
}

/**
 * Fetch recent audit entries for an org, newest first.
 *
 * @param {string} orgId
 * @param {{ limit?, entityType?, entityId?, userId? }} opts
 */
export async function fetchAuditLog(orgId, { limit = 100, entityType, entityId, userId } = {}) {
  let q = supabase
    .from('audit_log')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (entityType) q = q.eq('entity_type', entityType)
  if (entityId)   q = q.eq('entity_id', String(entityId))
  if (userId)     q = q.eq('user_id', userId)

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}
