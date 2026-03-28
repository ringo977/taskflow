import { supabase } from '../supabase'

const NOW = () => new Date().toISOString()

// ── Soft delete ─────────────────────────────────────────────────

export async function deleteTask(orgId, taskId) {
  const { error } = await supabase.from('tasks').update({ deleted_at: NOW() }).eq('id', taskId).eq('org_id', orgId)
  if (error) throw error
}

export async function deleteProject(orgId, projectId) {
  await supabase.from('tasks').update({ deleted_at: NOW() }).eq('org_id', orgId).eq('project_id', projectId)
  const { error } = await supabase.from('projects').update({ deleted_at: NOW() }).eq('id', projectId).eq('org_id', orgId)
  if (error) throw error
}

export async function deletePortfolio(orgId, portfolioId) {
  const { error } = await supabase.from('portfolios').update({ deleted_at: NOW() }).eq('id', portfolioId).eq('org_id', orgId)
  if (error) throw error
}

// ── Trash view ──────────────────────────────────────────────────

export async function fetchTrash(orgId) {
  const [{ data: tasks }, { data: projects }, { data: portfolios }] = await Promise.all([
    supabase.from('tasks').select('id, title, deleted_at, project_id').eq('org_id', orgId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
    supabase.from('projects').select('id, name, color, deleted_at').eq('org_id', orgId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
    supabase.from('portfolios').select('id, name, color, deleted_at').eq('org_id', orgId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
  ])
  return { tasks: tasks ?? [], projects: projects ?? [], portfolios: portfolios ?? [] }
}

// ── Restore & permanent delete ──────────────────────────────────

export async function restoreItem(table, id) {
  const { error } = await supabase.from(table).update({ deleted_at: null }).eq('id', id)
  if (error) throw error
}

export async function permanentlyDelete(table, id, orgId) {
  if (table === 'tasks') {
    await supabase.from('subtasks').delete().eq('task_id', id)
    await supabase.from('comments').delete().eq('task_id', id)
    await supabase.from('task_dependencies').delete().or(`task_id.eq.${id},depends_on.eq.${id}`)
  }
  if (table === 'projects') {
    const { data: taskRows } = await supabase.from('tasks').select('id').eq('org_id', orgId).eq('project_id', id)
    for (const t of taskRows ?? []) await permanentlyDelete('tasks', t.id, orgId)
    await supabase.from('sections').delete().eq('org_id', orgId).eq('project_id', id)
    await supabase.from('project_members').delete().eq('project_id', id).then(() => {}).catch(() => {})
  }
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}
