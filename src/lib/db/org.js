import { supabase } from '../supabase'
import { logger } from '@/utils/logger'
import { signupOrgStorage } from '@/utils/storage'
import { writeAuditSoft } from './audit'
import { validate, OrgRoleSchema, ProjectRoleSchema } from './schemas'

const log = logger('Org')

// ── RPC-with-fallback helper ────────────────────────────────────
// Many org operations use an RPC that may not exist yet in all
// environments. This helper tries the RPC and falls back to a
// client-side alternative when the function doesn't exist (42883).

async function rpcOrFallback(name, params, fallbackFn) {
  const { data, error } = await supabase.rpc(name, params)
  if (!error) return data
  if (error.code === '42883' || error.message?.includes('not exist')) {
    return fallbackFn()
  }
  throw error
}

// ── Org directory ───────────────────────────────────────────────

export async function fetchOrgDirectory(orgId) {
  // Try RPC first (SECURITY DEFINER, bypasses RLS)
  const { data: rpcRows, error: rpcErr } = await supabase.rpc('get_org_directory', { p_org_id: orgId })
  if (!rpcErr && rpcRows?.length) {
    return rpcRows.map(r => ({
      id: r.user_id,
      name: (r.display_name?.trim()) || 'User',
      email: r.email ?? '',
      role: r.role,
      color: r.color ?? '#378ADD',
    }))
  }
  // Fallback to direct query
  const { data: members, error: e1 } = await supabase
    .from('org_members')
    .select('user_id, role')
    .eq('org_id', orgId)
  if (e1) throw e1
  if (!members?.length) return []

  const ids = [...new Set(members.map(m => m.user_id))]
  const { data: profs, error: e2 } = await supabase
    .from('profiles')
    .select('id, display_name, email, color')
    .in('id', ids)
  if (e2) throw e2

  const pmap = Object.fromEntries((profs ?? []).map(p => [p.id, p]))
  const rows = members.map(m => {
    const p = pmap[m.user_id]
    const email = p?.email ?? ''
    return {
      id: m.user_id,
      name: (p?.display_name && p.display_name.trim()) || (email ? email.split('@')[0] : '') || 'User',
      email,
      role: m.role,
      color: p?.color ?? '#378ADD',
    }
  })
  rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  return rows
}

// ── Membership ──────────────────────────────────────────────────

/** PostgREST may return one row as an object instead of a single-element array. */
function normalizeMembershipRows(data) {
  if (data == null) return []
  if (Array.isArray(data)) return data
  if (typeof data === 'object' && data !== null && 'org_id' in data) return [data]
  return []
}

export async function fetchMyMemberships() {
  const { data, error } = await supabase.rpc('get_my_memberships')
  if (!error && data != null) {
    const rows = normalizeMembershipRows(data)
    if (rows.length) return rows
  }
  const { data: fallback, error: e2 } = await supabase.from('org_members').select('org_id, role')
  if (e2) throw e2
  return normalizeMembershipRows(fallback)
}

export async function fetchUserOrgIds() {
  return fetchMyMemberships()
}

export async function ensureOrgMembership(userId) {
  // Try server-side RPC first (SECURITY DEFINER, bypasses RLS)
  const { data, error } = await supabase.rpc('ensure_org_membership')
  const rpcRows = normalizeMembershipRows(data)
  if (!error && rpcRows.length) {
    signupOrgStorage.clear()
    return rpcRows
  }
  if (error) log.warn('ensure_org_membership RPC failed:', error.message)
  // Fallback to client-side logic
  const memberships = await fetchUserOrgIds()
  if (memberships.length > 0) return memberships
  let orgId = signupOrgStorage.get()
  if (!orgId) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      orgId = user?.user_metadata?.signup_org
    } catch (e) { log.warn('getUser fallback failed:', e.message) }
  }
  orgId = orgId || 'polimi'
  signupOrgStorage.clear()
  const { error: insErr } = await supabase.from('org_members').insert({
    org_id: orgId, user_id: userId, role: 'member',
  })
  if (insErr && insErr.code !== '23505') {
    log.error('ensureOrgMembership insert failed:', insErr)
    throw insErr
  }
  return [{ org_id: orgId, role: 'member' }]
}

// ── Member CRUD ─────────────────────────────────────────────────

export async function addOrgMember(orgId, email, role = 'member') {
  validate(OrgRoleSchema, role)
  const { error } = await supabase.rpc('add_org_member_by_email', {
    p_org_id: orgId, p_email: email, p_role: role,
  })
  if (error) {
    if (error.message?.includes('USER_NOT_FOUND')) throw new Error('USER_NOT_FOUND')
    if (error.message?.includes('ALREADY_MEMBER')) throw new Error('ALREADY_MEMBER')
    throw error
  }
  await writeAuditSoft(orgId, {
    action: 'member_role_changed', entityType: 'member', entityId: email,
    diff: { action: 'added', role },
  })
}

export async function removeOrgMember(orgId, userId) {
  await rpcOrFallback('remove_org_member', { p_org_id: orgId, p_user_id: userId }, async () => {
    const { error } = await supabase.from('org_members').delete().eq('org_id', orgId).eq('user_id', userId)
    if (error) throw error
  })
  await writeAuditSoft(orgId, {
    action: 'member_role_changed', entityType: 'member', entityId: userId,
    diff: { action: 'removed' },
  })
}

export async function updateOrgMemberRole(orgId, userId, role) {
  validate(OrgRoleSchema, role)
  await rpcOrFallback('update_org_member_role', { p_org_id: orgId, p_user_id: userId, p_role: role }, async () => {
    const { error } = await supabase.from('org_members').update({ role }).eq('org_id', orgId).eq('user_id', userId)
    if (error) throw error
  })
  await writeAuditSoft(orgId, {
    action: 'member_role_changed', entityType: 'member', entityId: userId,
    diff: { action: 'role_updated', to: role },
  })
}

// ── Pending signups & admin ─────────────────────────────────────

export async function fetchPendingSignups(orgId) {
  const { data, error } = await supabase.rpc('get_pending_signups', { p_org_id: orgId })
  if (error) throw error
  return data ?? []
}

export async function confirmUserEmail(userId) {
  const { error } = await supabase.rpc('admin_confirm_user', { p_user_id: userId })
  if (error) throw error
}

export async function deleteUserAccount(userId) {
  const { error } = await supabase.rpc('admin_delete_user', { p_user_id: userId })
  if (error) throw error
}

// ── Join requests ───────────────────────────────────────────────

export async function requestJoinOrg(orgId) {
  const { error } = await supabase.rpc('request_join_org', { p_org_id: orgId })
  if (error) {
    const msg = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`
    if (msg.includes('ALREADY_MEMBER')) throw new Error('ALREADY_MEMBER')
    if (msg.includes('ALREADY_REQUESTED')) throw new Error('ALREADY_REQUESTED')
    throw error
  }
}

export async function fetchPendingJoinRequests() {
  const { data, error } = await supabase.rpc('get_pending_join_requests')
  if (error) throw error
  return data ?? []
}

export async function approveJoinRequest(requestId) {
  const { error } = await supabase.rpc('approve_join_request', { p_request_id: requestId })
  if (error) throw error
}

export async function rejectJoinRequest(requestId) {
  const { error } = await supabase.rpc('reject_join_request', { p_request_id: requestId })
  if (error) throw error
}

// ── Project members ─────────────────────────────────────────────

export async function fetchMyProjectIds(orgId) {
  const { data, error } = await supabase.rpc('get_my_project_ids', { p_org_id: orgId })
  if (error) return null // RPC not yet created — no filtering
  return data?.map(r => r.project_id) ?? null
}

export async function fetchProjectMembers(projectId) {
  const { data, error } = await supabase.rpc('get_project_members', { p_project_id: projectId })
  if (error) throw error
  return data ?? []
}

export async function addProjectMember(projectId, userId, role = 'member') {
  validate(ProjectRoleSchema, role)
  const { error } = await supabase.rpc('add_project_member', { p_project_id: projectId, p_user_id: userId, p_role: role })
  if (error) throw error
}

export async function removeProjectMember(projectId, userId) {
  const { error } = await supabase.rpc('remove_project_member', { p_project_id: projectId, p_user_id: userId })
  if (error) throw error
}

export async function fetchMyProjectRoles(orgId) {
  const { data, error } = await supabase.rpc('get_my_project_roles', { p_org_id: orgId })
  if (error) return {}
  const map = {}
  for (const r of (data ?? [])) map[r.project_id] = r.role
  return map
}
