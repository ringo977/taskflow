/**
 * TaskFlow — Supabase data layer (public schema, org_id column)
 */
import { supabase } from './supabase'

// ── Shape adapters ─────────────────────────────────────────────
const toPortfolio = r => ({
  id: r.id, name: r.name, color: r.color, desc: r.description ?? '',
  status: r.status ?? 'active',
})

const toProject = (r, memberNames) => ({
  id: r.id, name: r.name, color: r.color,
  status: r.status, statusLabel: r.status_label,
  portfolio: r.portfolio_id ?? null,
  description: r.description ?? '',
  resources: r.resources ?? [],
  members: memberNames ?? [],
  customFields: r.custom_fields ?? [],
})

const toTask = (r, secName, subs, cmts, deps) => ({
  id: r.id, pid: r.project_id,
  sec: secName ?? '',
  title: r.title, desc: r.description ?? '',
  who: r.assignee_name ?? '',
  pri: r.priority,
  startDate: r.start_date ?? null,
  due: r.due_date ?? null,
  done: r.done,
  recurrence: r.recurrence ?? null,
  attachments: r.attachments ?? [],
  tags: r.tags ?? [],
  activity: r.activity ?? [],
  position: r.position ?? 0,
  customValues: r.custom_values ?? {},
  subs: subs ?? [],
  cmts: cmts ?? [],
  deps: deps ?? [],
})

// ── Portfolios ─────────────────────────────────────────────────
export async function fetchPortfolios(orgId) {
  const { data, error } = await supabase
    .from('portfolios').select('*')
    .eq('org_id', orgId).order('name')
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

// ── Projects ───────────────────────────────────────────────────
export async function fetchProjects(orgId) {
  const [{ data, error }, { data: taskRows }] = await Promise.all([
    supabase.from('projects').select('*').eq('org_id', orgId).order('name'),
    supabase.from('tasks').select('project_id, assignee_name').eq('org_id', orgId),
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

// ── Sections ───────────────────────────────────────────────────
export async function fetchSectionRows(orgId) {
  const { data, error } = await supabase
    .from('sections').select('*')
    .eq('org_id', orgId).order('project_id').order('position')
  if (error) throw error
  return data ?? []
}

export async function fetchSections(orgId) {
  const rows = await fetchSectionRows(orgId)
  const map = {}
  for (const r of rows) {
    map[r.project_id] = map[r.project_id] ?? []
    map[r.project_id].push(r.name)
  }
  return map
}

export async function upsertSections(orgId, projectId, names) {
  await supabase.from('sections').delete()
    .eq('org_id', orgId).eq('project_id', projectId)
  if (!names.length) return
  const { error } = await supabase.from('sections').insert(
    names.map((name, i) => ({
      id: `${projectId}_s${i}`, org_id: orgId,
      project_id: projectId, name, position: i,
    }))
  )
  if (error) throw error
}

// ── Tasks ──────────────────────────────────────────────────────
export async function fetchTasks(orgId) {
  const [
    { data: tasks, error: te },
    { data: subtasks, error: se },
    { data: comments, error: ce },
    { data: depRows, error: de },
    secRows,
  ] = await Promise.all([
    supabase.from('tasks').select('*').eq('org_id', orgId).order('position').order('created_at'),
    supabase.from('subtasks').select('*').eq('org_id', orgId).order('position'),
    supabase.from('comments').select('*').eq('org_id', orgId).order('created_at'),
    supabase.from('task_dependencies').select('*').eq('org_id', orgId).then(r => r).catch(() => ({ data: [], error: null })),
    fetchSectionRows(orgId),
  ])
  if (te) throw te
  if (se) throw se
  if (ce) throw ce

  const secMap = {}
  for (const s of secRows) secMap[s.id] = s.name

  const subMap = {}
  for (const s of subtasks ?? []) {
    subMap[s.task_id] = subMap[s.task_id] ?? []
    subMap[s.task_id].push({ id: s.id, t: s.title, done: s.done })
  }
  const cmtMap = {}
  for (const c of comments ?? []) {
    cmtMap[c.task_id] = cmtMap[c.task_id] ?? []
    cmtMap[c.task_id].push({ id: c.id, who: c.author_name, txt: c.body, d: c.created_at?.slice(0, 10) })
  }
  const depMap = {}
  for (const d of depRows ?? []) {
    depMap[d.task_id] = depMap[d.task_id] ?? []
    depMap[d.task_id].push(d.depends_on_id)
  }

  return (tasks ?? []).map(r => toTask(r, secMap[r.section_id], subMap[r.id], cmtMap[r.id], depMap[r.id]))
}

export async function upsertTask(orgId, task, sectionRows) {
  const secRow = sectionRows?.find(s => s.project_id === task.pid && s.name === task.sec)
  const { error } = await supabase.from('tasks').upsert({
    id: task.id, org_id: orgId, project_id: task.pid,
    section_id: secRow?.id ?? null,
    title: task.title, description: task.desc ?? '',
    assignee_name: task.who ?? '',
    priority: task.pri ?? 'medium',
    start_date: task.startDate ?? null,
    due_date: task.due ?? null,
    done: task.done ?? false,
    attachments: task.attachments ?? [],
    tags: task.tags ?? [],
    activity: task.activity ?? [],
    position: task.position ?? 0,
    custom_values: task.customValues ?? {},
    updated_at: new Date().toISOString(),
  })
  if (error) throw error

  if (task.subs?.length) {
    const keepIds = task.subs.map(s => s.id)
    await supabase.from('subtasks').delete()
      .eq('task_id', task.id).not('id', 'in', `(${keepIds.map(id => `"${id}"`).join(',')})`)
    const { error: se } = await supabase.from('subtasks').upsert(
      task.subs.map((s, i) => ({ id: s.id, org_id: orgId, task_id: task.id, title: s.t, done: s.done, position: i }))
    )
    if (se) throw se
  } else {
    await supabase.from('subtasks').delete().eq('task_id', task.id)
  }

  if (task.cmts?.length) {
    const keepIds = task.cmts.map(c => c.id)
    await supabase.from('comments').delete()
      .eq('task_id', task.id).not('id', 'in', `(${keepIds.map(id => `"${id}"`).join(',')})`)
    const { error: ce } = await supabase.from('comments').upsert(
      task.cmts.map(c => ({ id: c.id, org_id: orgId, task_id: task.id, author_name: c.who, body: c.txt, created_at: c.d ? `${c.d}T00:00:00Z` : new Date().toISOString() }))
    )
    if (ce) throw ce
  } else {
    await supabase.from('comments').delete().eq('task_id', task.id)
  }
}

export async function updateTaskField(orgId, taskId, patch) {
  const db = { updated_at: new Date().toISOString() }
  if ('done'      in patch) db.done          = patch.done
  if ('title'     in patch) db.title         = patch.title
  if ('desc'      in patch) db.description   = patch.desc
  if ('pri'       in patch) db.priority      = patch.pri
  if ('startDate' in patch) db.start_date    = patch.startDate
  if ('due'       in patch) db.due_date      = patch.due
  if ('who'       in patch) db.assignee_name = patch.who
  if ('recurrence' in patch) db.recurrence  = patch.recurrence
  if ('tags'       in patch) db.tags        = patch.tags ?? []
  if ('activity'   in patch) db.activity    = patch.activity ?? []
  if ('position'   in patch) db.position       = patch.position ?? 0
  if ('customValues' in patch) db.custom_values = patch.customValues ?? {}
  const { error } = await supabase.from('tasks').update(db).eq('id', taskId)
  if (error) throw error

  if ('subs' in patch && patch.subs) {
    const keepIds = patch.subs.map(s => s.id)
    if (keepIds.length) {
      await supabase.from('subtasks').delete()
        .eq('task_id', taskId).not('id', 'in', `(${keepIds.map(id => `"${id}"`).join(',')})`)
    } else {
      await supabase.from('subtasks').delete().eq('task_id', taskId)
    }
    if (patch.subs.length) {
      await supabase.from('subtasks').upsert(
        patch.subs.map((s, i) => ({ id: s.id, org_id: orgId, task_id: taskId, title: s.t, done: s.done, position: i }))
      )
    }
  }

  if ('cmts' in patch && patch.cmts) {
    const keepIds = patch.cmts.map(c => c.id)
    if (keepIds.length) {
      await supabase.from('comments').delete()
        .eq('task_id', taskId).not('id', 'in', `(${keepIds.map(id => `"${id}"`).join(',')})`)
    } else {
      await supabase.from('comments').delete().eq('task_id', taskId)
    }
    if (patch.cmts.length) {
      await supabase.from('comments').upsert(
        patch.cmts.map(c => ({ id: c.id, org_id: orgId, task_id: taskId, author_name: c.who, body: c.txt, created_at: c.d ? `${c.d}T00:00:00Z` : new Date().toISOString() }))
      )
    }
  }

  if ('attachments' in patch) {
    await supabase.from('tasks').update({ attachments: patch.attachments ?? [] }).eq('id', taskId)
  }
}

export async function updateTaskDeps(orgId, taskId, depIds) {
  await supabase.from('task_dependencies').delete().eq('task_id', taskId)
  if (depIds.length) {
    const { error } = await supabase.from('task_dependencies').insert(
      depIds.map(depId => ({ org_id: orgId, task_id: taskId, depends_on_id: depId }))
    )
    if (error) throw error
  }
}

export async function moveTaskToSection(orgId, taskId, secName, projectId, sectionRows) {
  const secRow = sectionRows?.find(s => s.project_id === projectId && s.name === secName)
  await supabase.from('tasks').update({
    section_id: secRow?.id ?? null, updated_at: new Date().toISOString(),
  }).eq('id', taskId)
}

export async function updateTaskPositions(updates) {
  const now = new Date().toISOString()
  await Promise.all(updates.map(({ id, position }) =>
    supabase.from('tasks').update({ position, updated_at: now }).eq('id', id)
  ))
}

// ── Attachments (Supabase Storage) ──────────────────────────────
export async function uploadAttachment(orgId, taskId, file) {
  const ext = file.name.split('.').pop()
  const path = `${orgId}/${taskId}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`
  const { error } = await supabase.storage.from('attachments').upload(path, file)
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(path)
  return { path, url: publicUrl }
}

export async function deleteAttachment(storagePath) {
  if (!storagePath) return
  await supabase.storage.from('attachments').remove([storagePath])
}

// ── Seed ───────────────────────────────────────────────────────
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

  // Fetch section rows for task mapping
  const { data: allSecRows } = await supabase.from('sections').select('*').eq('org_id', orgId)

  // Bulk insert tasks
  if (tasks.length) {
    await supabase.from('tasks').upsert(tasks.map(task => {
      const secRow = (allSecRows ?? []).find(s => s.project_id === task.pid && s.name === task.sec)
      return {
        id: task.id, org_id: orgId, project_id: task.pid,
        section_id: secRow?.id ?? null,
        title: task.title, description: task.desc ?? '',
        assignee_name: task.who ?? '',
        priority: task.pri ?? 'medium',
        start_date: task.startDate ?? null,
        due_date: task.due ?? null,
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

// ── Org directory (People, assignees) — org_members + profiles ──
export async function fetchOrgDirectory(orgId) {
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

// ── Org membership ──────────────────────────────────────────────
export async function fetchMyMemberships() {
  const { data, error } = await supabase.rpc('get_my_memberships')
  if (!error && data) return data
  const { data: fallback, error: e2 } = await supabase.from('org_members').select('org_id, role')
  if (e2) throw e2
  return fallback ?? []
}

export async function fetchUserOrgIds() {
  return fetchMyMemberships()
}

export async function ensureOrgMembership(userId) {
  const memberships = await fetchUserOrgIds()
  if (memberships.length > 0) return memberships
  const signupOrg = localStorage.getItem('taskflow-signup-org')
  const orgId = signupOrg || 'polimi'
  if (signupOrg) localStorage.removeItem('taskflow-signup-org')
  const { error } = await supabase.from('org_members').insert({
    org_id: orgId, user_id: userId, role: 'member',
  })
  if (error && error.code !== '23505') throw error
  return [{ org_id: orgId, role: 'member' }]
}

export async function addOrgMember(orgId, email, role = 'member') {
  const { error } = await supabase.rpc('add_org_member_by_email', {
    p_org_id: orgId, p_email: email, p_role: role,
  })
  if (error) {
    if (error.message?.includes('USER_NOT_FOUND')) throw new Error('USER_NOT_FOUND')
    if (error.message?.includes('ALREADY_MEMBER')) throw new Error('ALREADY_MEMBER')
    throw error
  }
}

export async function removeOrgMember(orgId, userId) {
  const { error } = await supabase.rpc('remove_org_member', {
    p_org_id: orgId, p_user_id: userId,
  })
  if (error) throw error
}

export async function updateOrgMemberRole(orgId, userId, role) {
  const { error } = await supabase.rpc('update_org_member_role', {
    p_org_id: orgId, p_user_id: userId, p_role: role,
  })
  if (error) throw error
}

// ── Join requests ──────────────────────────────────────────────
export async function requestJoinOrg(orgId) {
  const { error } = await supabase.rpc('request_join_org', { p_org_id: orgId })
  if (error) {
    if (error.message?.includes('ALREADY_MEMBER')) throw new Error('ALREADY_MEMBER')
    if (error.message?.includes('ALREADY_REQUESTED')) throw new Error('ALREADY_REQUESTED')
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

// ── Project members ────────────────────────────────────────────
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

// ── Delete operations ──────────────────────────────────────────
export async function deleteTask(orgId, taskId) {
  await supabase.from('subtasks').delete().eq('task_id', taskId)
  await supabase.from('comments').delete().eq('task_id', taskId)
  await supabase.from('task_dependencies').delete().or(`task_id.eq.${taskId},depends_on.eq.${taskId}`)
  const { error } = await supabase.from('tasks').delete().eq('id', taskId).eq('org_id', orgId)
  if (error) throw error
}

export async function deleteProject(orgId, projectId) {
  const { data: taskRows } = await supabase.from('tasks').select('id').eq('org_id', orgId).eq('project_id', projectId)
  const taskIds = (taskRows ?? []).map(t => t.id)
  if (taskIds.length) {
    await supabase.from('subtasks').delete().in('task_id', taskIds)
    await supabase.from('comments').delete().in('task_id', taskIds)
    await supabase.from('task_dependencies').delete().or(taskIds.map(id => `task_id.eq.${id}`).join(','))
    await supabase.from('tasks').delete().eq('org_id', orgId).eq('project_id', projectId)
  }
  await supabase.from('sections').delete().eq('org_id', orgId).eq('project_id', projectId)
  await supabase.from('project_members').delete().eq('project_id', projectId).then(() => {}).catch(() => {})
  const { error } = await supabase.from('projects').delete().eq('id', projectId).eq('org_id', orgId)
  if (error) throw error
}

export async function deletePortfolio(orgId, portfolioId) {
  await supabase.from('projects').update({ portfolio_id: null }).eq('org_id', orgId).eq('portfolio_id', portfolioId)
  const { error } = await supabase.from('portfolios').delete().eq('id', portfolioId).eq('org_id', orgId)
  if (error) throw error
}

// ── Fetch all ──────────────────────────────────────────────────
export async function fetchOrgData(orgId) {
  const [ports, projs, secs, tasks, accessibleIds, myProjectRoles] = await Promise.all([
    fetchPortfolios(orgId),
    fetchProjects(orgId),
    fetchSections(orgId),
    fetchTasks(orgId),
    fetchMyProjectIds(orgId),
    fetchMyProjectRoles(orgId),
  ])
  if (accessibleIds === null) return { ports, projs, secs, tasks, myProjectRoles }
  const idSet = new Set(accessibleIds)
  return {
    ports,
    projs: projs.filter(p => idSet.has(p.id)),
    secs: Object.fromEntries(Object.entries(secs).filter(([pid]) => idSet.has(pid))),
    tasks: tasks.filter(t => idSet.has(t.pid)),
    myProjectRoles,
  }
}
