import { supabase } from '../supabase'
import { validate, SectionNameSchema } from './schemas'
import { writeAuditSoft } from './audit'

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
  if (!names.length) {
    await supabase.from('sections').delete().eq('org_id', orgId).eq('project_id', projectId)
    return
  }
  // Validate each section name
  const validNames = names.map(n => validate(SectionNameSchema, n))
  const rows = validNames.map((name, i) => ({
    id: `${projectId}_s${i}`, org_id: orgId,
    project_id: projectId, name, position: i,
  }))
  const { error } = await supabase.from('sections').upsert(rows, { onConflict: 'id' })
  if (error) throw error
  // Remove stale sections beyond the new list
  const keepIds = new Set(rows.map(r => r.id))
  const { data: existing } = await supabase.from('sections').select('id')
    .eq('org_id', orgId).eq('project_id', projectId)
  const stale = (existing ?? []).filter(r => !keepIds.has(r.id)).map(r => r.id)
  if (stale.length) await supabase.from('sections').delete().in('id', stale)
  await writeAuditSoft(orgId, {
    action: 'section_updated', entityType: 'section', entityId: projectId,
    diff: { sections: validNames },
  })
}
