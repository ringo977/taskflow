import { supabase } from '../supabase'
import { toTask } from './adapters'
import { fetchSectionRows } from './sections'

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

const cmtToRow = (orgId, taskId) => c => ({
  id: c.id, org_id: orgId, task_id: taskId,
  author_name: c.who, body: c.txt,
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
  ] = await Promise.all([
    supabase.from('tasks').select('*').eq('org_id', orgId).is('deleted_at', null).order('position').order('created_at'),
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

// ── Upsert (full task + related) ────────────────────────────────

export async function upsertTask(orgId, task, sectionRows) {
  const secRow = sectionRows?.find(s => s.project_id === task.pid && s.name === task.sec)
  const { error } = await supabase.from('tasks').upsert({
    id: task.id, org_id: orgId, project_id: task.pid,
    section_id: secRow?.id ?? null,
    title: task.title, description: task.desc ?? '',
    assignee_name: Array.isArray(task.who) ? JSON.stringify(task.who) : task.who ?? '',
    priority: task.pri ?? 'medium',
    start_date: task.startDate || null,
    due_date: task.due || null,
    done: task.done ?? false,
    milestone: task.milestone ?? false,
    attachments: task.attachments ?? [],
    tags: task.tags ?? [],
    activity: task.activity ?? [],
    position: task.position ?? 0,
    custom_values: task.customValues ?? {},
    visibility: task.visibility ?? 'all',
    updated_at: new Date().toISOString(),
  })
  if (error) throw error

  await _persistRelated(task.id, orgId, task.subs, 'subtasks', subToRow(orgId, task.id))
  await _persistRelated(task.id, orgId, task.cmts, 'comments', cmtToRow(orgId, task.id))
}

// ── Selective field update ──────────────────────────────────────
// Maps client-side property names → DB column names, then persists
// subtasks/comments/attachments if present in the patch.

const FIELD_MAP = {
  done: 'done', title: 'title', desc: 'description',
  pri: 'priority', startDate: 'start_date', due: 'due_date',
  recurrence: 'recurrence', milestone: 'milestone',
  tags: 'tags', activity: 'activity', position: 'position',
  customValues: 'custom_values', visibility: 'visibility',
}

export async function updateTaskField(orgId, taskId, patch) {
  const db = { updated_at: new Date().toISOString() }
  for (const [client, col] of Object.entries(FIELD_MAP)) {
    if (client in patch) {
      const v = patch[client]
      // Empty strings are invalid for date columns — coerce to null
      if ((col === 'start_date' || col === 'due_date') && !v) { db[col] = null; continue }
      db[col] = v ?? (typeof v === 'number' ? 0 : col === 'tags' || col === 'activity' ? [] : null)
    }
  }
  // Serialize who array for DB
  if ('who' in patch) db.assignee_name = Array.isArray(patch.who) ? JSON.stringify(patch.who) : patch.who ?? ''
  const { error } = await supabase.from('tasks').update(db).eq('id', taskId)
  if (error) throw error

  if ('subs' in patch) await _persistRelated(taskId, orgId, patch.subs, 'subtasks', subToRow(orgId, taskId))
  if ('cmts' in patch) await _persistRelated(taskId, orgId, patch.cmts, 'comments', cmtToRow(orgId, taskId))
  if ('attachments' in patch) {
    await supabase.from('tasks').update({ attachments: patch.attachments ?? [] }).eq('id', taskId)
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
}

// ── Move & reorder ──────────────────────────────────────────────

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
