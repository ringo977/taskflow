import { supabase } from '../supabase'
import { toTask } from './adapters'
import { fetchSectionRows } from './sections'
import { writeAuditSoft } from './audit'
import { validate, TaskUpsertSchema, TaskPatchSchema } from './schemas'

// ── Shared helper: persist subtasks or comments ─────────────────
// Eliminates the duplication between upsertTask and updateTaskField.
async function _persistRelated(taskId, orgId, items, table, toRow) {
  const keepIds = (items ?? []).map(i => i.id)
  if (keepIds.length) {
    await supabase.from(table).delete()
      .eq('task_id', taskId).not('id', 'in', `(${keepIds.map(id => `"${id}"`).join(',')})`)
    const { error } = await supabase.from(table).upsert(items.map(toRow))
    if (error) throw error
  } else {
    await supabase.from(table).delete().eq('task_id', taskId)
  }
}

const subToRow = (orgId, taskId) => (s, i) => ({
  id: s.id, org_id: orgId, task_id: taskId,
  title: s.t, done: s.done, position: i,
})

const cmtToRow = (orgId, taskId, userId) => c => ({
  id: c.id, org_id: orgId, task_id: taskId,
  author_name: c.who, body: c.txt,
  author_id: userId ?? null,
  created_at: c.d ? `${c.d}T00:00:00Z` : new Date().toISOString(),
})

// ── Fetch ───────────────────────────────────────────────────────

export async function fetchTasks(orgId) {
  const [
    { data: tasks, error: te },
    { data: subtasks, error: se },
    { data: comments, error: ce },
    { data: depRows },
    secRows,
    { data: profileRows },
  ] = await Promise.all([
    supabase.from('tasks').select('*').eq('org_id', orgId).is('deleted_at', null).order('position').order('created_at'),
    supabase.from('subtasks').select('*').eq('org_id', orgId).order('position'),
    supabase.from('comments').select('*').eq('org_id', orgId).order('created_at'),
    supabase.from('task_dependencies').select('*').eq('org_id', orgId).then(r => r).catch(() => ({ data: [], error: null })),
    fetchSectionRows(orgId),
    supabase.from('profiles').select('id, display_name'),
  ])

  // Build id → display name lookup for assignee resolution
  const profileById = {}
  for (const p of profileRows ?? []) profileById[p.id] = p.display_name
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

  return (tasks ?? []).map(r => toTask(r, secMap[r.section_id], subMap[r.id], cmtMap[r.id], depMap[r.id], profileById))
}

// ── Upsert (full task + related) ────────────────────────────────

export async function upsertTask(orgId, task, sectionRows) {
  const t = validate(TaskUpsertSchema, task)
  const secRow = sectionRows?.find(s => s.project_id === t.pid && s.name === t.sec)

  // Resolve assignee names → UUIDs via profiles
  const names = Array.isArray(t.who) ? t.who : t.who ? [t.who] : []
  let assigneeIds = []
  if (names.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles').select('id, display_name').in('display_name', names)
    assigneeIds = (profiles ?? []).map(p => p.id)
  }

  const { error } = await supabase.from('tasks').upsert({
    id: t.id, org_id: orgId, project_id: t.pid,
    section_id: secRow?.id ?? null,
    title: t.title, description: t.desc ?? '',
    assignee_ids: assigneeIds,
    priority: t.pri,
    start_date: t.startDate,
    due_date: t.due,
    done: t.done,
    milestone_id: t.milestoneId ?? null,
    attachments: t.attachments,
    tags: t.tags,
    activity: t.activity,
    position: t.position,
    custom_values: t.customValues,
    visibility: t.visibility,
    partner_id: t.partnerId ?? null,
    workpackage_id: t.workpackageId ?? null,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error

  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? null
  await _persistRelated(t.id, orgId, t.subs, 'subtasks', subToRow(orgId, t.id))
  await _persistRelated(t.id, orgId, t.cmts, 'comments', cmtToRow(orgId, t.id, userId))

  // Audit — distinguish create vs update by presence of createdAt
  const isNew = !t.createdAt
  await writeAuditSoft(orgId, {
    action:     isNew ? 'task_created' : 'task_updated',
    entityType: 'task',
    entityId:   t.id,
    entityName: t.title,
    diff: isNew
      ? { created: { title: t.title, who: t.who, pri: t.pri, due: t.due } }
      : { updated: { title: t.title, who: t.who, pri: t.pri, due: t.due } },
  })
}

// ── Selective field update ──────────────────────────────────────
// Maps client-side property names → DB column names, then persists
// subtasks/comments/attachments if present in the patch.

const FIELD_MAP = {
  done: 'done', title: 'title', desc: 'description',
  pri: 'priority', startDate: 'start_date', due: 'due_date',
  recurrence: 'recurrence', milestoneId: 'milestone_id',
  tags: 'tags', activity: 'activity', position: 'position',
  customValues: 'custom_values', visibility: 'visibility',
  partnerId: 'partner_id',
  workpackageId: 'workpackage_id',
}

export async function updateTaskField(orgId, taskId, patch) {
  const p = validate(TaskPatchSchema, patch)
  const db = { updated_at: new Date().toISOString() }
  for (const [client, col] of Object.entries(FIELD_MAP)) {
    if (client in p) {
      const v = p[client]
      // Empty strings are invalid for date columns — coerce to null
      if ((col === 'start_date' || col === 'due_date') && !v) { db[col] = null; continue }
      db[col] = v ?? (typeof v === 'number' ? 0 : col === 'tags' || col === 'activity' ? [] : null)
    }
  }
  // Resolve who names → UUIDs via SECURITY DEFINER RPC.
  // We call `resolve_assignees` (migration 029) instead of SELECTing from
  // `profiles` directly, because the profiles RLS policy scopes reads to
  // org mates only. Project-only collaborators (project_members who are
  // not org_members) would otherwise 403 on the direct SELECT even though
  // they legitimately appear in the assignee dropdown.
  //
  // Explicit error / length check: a silent failure here would persist
  // `assignee_ids: []` on the task and make the optimistic chip vanish on
  // the next refetch.
  if ('who' in p) {
    const names = Array.isArray(p.who) ? p.who : p.who ? [p.who] : []
    if (names.length > 0) {
      const { data: profiles, error: profilesErr } = await supabase
        .rpc('resolve_assignees', { p_names: names })
      if (profilesErr) throw profilesErr
      const resolved = profiles ?? []
      if (resolved.length !== names.length) {
        const missing = names.filter(n => !resolved.some(pr => pr.display_name === n))
        throw new Error(`Cannot resolve assignees: ${missing.join(', ')}`)
      }
      db.assignee_ids = resolved.map(pr => pr.id)
    } else {
      db.assignee_ids = []
    }
  }
  const { error } = await supabase.from('tasks').update(db).eq('id', taskId)
  if (error) throw error

  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? null
  if ('subs' in p) await _persistRelated(taskId, orgId, p.subs, 'subtasks', subToRow(orgId, taskId))
  if ('cmts' in p) await _persistRelated(taskId, orgId, p.cmts, 'comments', cmtToRow(orgId, taskId, userId))
  if ('attachments' in p) {
    await supabase.from('tasks').update({ attachments: p.attachments ?? [] }).eq('id', taskId)
  }

  // Audit — emit targeted events for the most meaningful field changes
  if ('done' in p) {
    await writeAuditSoft(orgId, {
      action: p.done ? 'task_completed' : 'task_updated',
      entityType: 'task', entityId: taskId,
      diff: { field: 'done', to: p.done },
    })
  } else if ('who' in p) {
    await writeAuditSoft(orgId, {
      action: 'task_assigned',
      entityType: 'task', entityId: taskId,
      diff: { field: 'who', to: p.who },
    })
  } else if ('title' in p || 'pri' in p || 'due' in p) {
    const changed = {}
    if ('title' in p) changed.title = p.title
    if ('pri'   in p) changed.pri   = p.pri
    if ('due'   in p) changed.due   = p.due ?? null
    await writeAuditSoft(orgId, {
      action: 'task_updated',
      entityType: 'task', entityId: taskId,
      diff: { fields: changed },
    })
  }
}

// ── Dependencies ────────────────────────────────────────────────

export async function updateTaskDeps(orgId, taskId, depIds) {
  await supabase.from('task_dependencies').delete().eq('task_id', taskId)
  if (depIds.length) {
    const { error } = await supabase.from('task_dependencies').insert(
      depIds.map(depId => ({ org_id: orgId, task_id: taskId, depends_on_id: depId }))
    )
    if (error) throw error
  }
  await writeAuditSoft(orgId, {
    action: 'task_deps_changed', entityType: 'task', entityId: taskId,
    diff: { deps: depIds },
  })
}

// ── Move & reorder ──────────────────────────────────────────────

export async function moveTaskToSection(orgId, taskId, secName, projectId, sectionRows) {
  const secRow = sectionRows?.find(s => s.project_id === projectId && s.name === secName)
  await supabase.from('tasks').update({
    section_id: secRow?.id ?? null, updated_at: new Date().toISOString(),
  }).eq('id', taskId)
  await writeAuditSoft(orgId, {
    action: 'task_moved', entityType: 'task', entityId: taskId,
    diff: { field: 'section', to: secName },
  })
}

export async function updateTaskPositions(updates) {
  const now = new Date().toISOString()
  await Promise.all(updates.map(({ id, position }) =>
    supabase.from('tasks').update({ position, updated_at: now }).eq('id', id)
  ))
}
