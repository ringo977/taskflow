import { supabase } from '../supabase'
import { toPortfolio, toProject } from './adapters'
import { logger } from '@/utils/logger'

const log = logger('DB:Projects')

// ── Portfolios ──────────────────────────────────────────────────

export async function fetchPortfolios(orgId) {
  const { data, error } = await supabase
    .from('portfolios').select('*')
    .eq('org_id', orgId).is('deleted_at', null).order('name')
  if (error) throw error
  return (data ?? []).map(toPortfolio)
}

export async function upsertPortfolio(orgId, p) {
  const { error } = await supabase.from('portfolios').upsert({
    id: p.id, org_id: orgId, name: p.name, color: p.color,
    description: p.desc ?? '', status: p.status ?? 'active',
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

// ── Projects ────────────────────────────────────────────────────

export async function fetchProjects(orgId) {
  const [{ data, error }, { data: taskRows }, { data: pmRows }] = await Promise.all([
    supabase.from('projects').select('*').eq('org_id', orgId).is('deleted_at', null).order('name'),
    supabase.from('tasks').select('project_id, assignee_name').eq('org_id', orgId).is('deleted_at', null),
    supabase.rpc('get_all_project_members').then(r => r).catch(() => ({ data: null })),
  ])
  if (error) throw error
  const membersByPid = {}
  // Add names from task assignees
  for (const t of taskRows ?? []) {
    if (!t.assignee_name) continue
    membersByPid[t.project_id] = membersByPid[t.project_id] ?? new Set()
    membersByPid[t.project_id].add(t.assignee_name)
  }
  // Merge names from project_members (via SECURITY DEFINER RPC — bypasses RLS)
  for (const pm of pmRows ?? []) {
    if (!pm.user_name || !pm.project_id) continue
    membersByPid[pm.project_id] = membersByPid[pm.project_id] ?? new Set()
    membersByPid[pm.project_id].add(pm.user_name)
  }
  return (data ?? []).map(r => toProject(r, [...(membersByPid[r.id] ?? [])]))
}

export async function upsertProject(orgId, p) {
  const core = {
    id: p.id, org_id: orgId, name: p.name, color: p.color,
    status: p.status ?? 'active',
    status_label: p.statusLabel ?? 'on_track',
    portfolio_id: p.portfolio ?? null,
    description: p.description ?? '',
    resources: p.resources ?? [],
    custom_fields: p.customFields ?? [],
    updated_at: new Date().toISOString(),
  }
  // Extended columns (require migration 020)
  const extended = {
    task_templates: p.taskTemplates ?? [],
    visibility: p.visibility ?? 'all',
    section_access: p.sectionAccess ?? {},
    forms: p.forms ?? [],
    rules: p.rules ?? [],
    goals: p.goals ?? [],
  }
  // Try full payload first; fall back to core if extended columns don't exist yet
  const { error } = await supabase.from('projects').upsert({ ...core, ...extended })
  if (error) {
    const msg = error.message ?? ''
    if (msg.includes('column') && (msg.includes('does not exist') || msg.includes('task_templates') || msg.includes('visibility') || msg.includes('section_access') || msg.includes('forms'))) {
      log.warn('Extended columns missing — falling back to core-only upsert. Run migration 020_project_extended_fields.sql to fix.')
      const { error: coreErr } = await supabase.from('projects').upsert(core)
      if (coreErr) throw coreErr
      return
    }
    throw error
  }
}
