import { supabase } from '../supabase'
import { toPortfolio, toProject } from './adapters'

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
  const [{ data, error }, { data: taskRows }] = await Promise.all([
    supabase.from('projects').select('*').eq('org_id', orgId).is('deleted_at', null).order('name'),
    supabase.from('tasks').select('project_id, assignee_name').eq('org_id', orgId).is('deleted_at', null),
  ])
  if (error) throw error
  const membersByPid = {}
  for (const t of taskRows ?? []) {
    if (!t.assignee_name) continue
    membersByPid[t.project_id] = membersByPid[t.project_id] ?? new Set()
    membersByPid[t.project_id].add(t.assignee_name)
  }
  return (data ?? []).map(r => toProject(r, [...(membersByPid[r.id] ?? [])]))
}

export async function upsertProject(orgId, p) {
  const { error } = await supabase.from('projects').upsert({
    id: p.id, org_id: orgId, name: p.name, color: p.color,
    status: p.status ?? 'active',
    status_label: p.statusLabel ?? 'on_track',
    portfolio_id: p.portfolio ?? null,
    description: p.description ?? '',
    resources: p.resources ?? [],
    custom_fields: p.customFields ?? [],
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}
