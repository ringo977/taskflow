import { supabase } from '../supabase'

export async function seedOrg(orgId, { projs, ports, secs, tasks }) {
  // Bulk insert portfolios
  if (ports.length) {
    await supabase.from('portfolios').upsert(ports.map(p => ({
      id: p.id, org_id: orgId, name: p.name, color: p.color,
      description: p.desc ?? '',
    })))
  }

  // Bulk insert projects
  if (projs.length) {
    await supabase.from('projects').upsert(projs.map(p => ({
      id: p.id, org_id: orgId, name: p.name, color: p.color,
      status: p.status ?? 'active',
      status_label: p.statusLabel ?? 'on_track',
      portfolio_id: p.portfolio ?? null,
      description: p.description ?? '',
      resources: p.resources ?? [],
    })))
  }

  // Bulk insert sections
  const secRows = []
  for (const [pid, names] of Object.entries(secs)) {
    names.forEach((name, i) => secRows.push({
      id: `${pid}_s${i}`, org_id: orgId,
      project_id: pid, name, position: i,
    }))
  }
  if (secRows.length) await supabase.from('sections').upsert(secRows)

  // Fetch section rows + profiles for task mapping
  const [{ data: allSecRows }, { data: profileRows }] = await Promise.all([
    supabase.from('sections').select('*').eq('org_id', orgId),
    supabase.from('profiles').select('id, display_name'),
  ])
  const profileByName = {}
  for (const p of profileRows ?? []) profileByName[p.display_name] = p.id

  // Bulk insert tasks
  if (tasks.length) {
    await supabase.from('tasks').upsert(tasks.map(task => {
      const secRow = (allSecRows ?? []).find(s => s.project_id === task.pid && s.name === task.sec)
      const names = Array.isArray(task.who) ? task.who : task.who ? [task.who] : []
      return {
        id: task.id, org_id: orgId, project_id: task.pid,
        section_id: secRow?.id ?? null,
        title: task.title, description: task.desc ?? '',
        assignee_ids: names.map(n => profileByName[n]).filter(Boolean),
        priority: task.pri ?? 'medium',
        start_date: task.startDate || null,
        due_date: task.due || null,
        done: task.done ?? false,
      }
    }))
  }

  // Bulk insert subtasks
  const allSubs = tasks.flatMap(task =>
    (task.subs ?? []).map((s, i) => ({
      id: s.id, org_id: orgId, task_id: task.id,
      title: s.t, done: s.done, position: i,
    }))
  )
  if (allSubs.length) await supabase.from('subtasks').upsert(allSubs)
}
