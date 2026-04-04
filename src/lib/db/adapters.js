/**
 * Shape adapters — map Supabase rows to in-memory objects.
 *
 * Every adapter uses short property names to keep React state small
 * and match the rest of the codebase conventions.
 */

export const toPortfolio = r => ({
  id: r.id, name: r.name, color: r.color, desc: r.description ?? '',
  status: r.status ?? 'active',
})

export const toProject = (r, memberNames) => ({
  id: r.id, name: r.name, color: r.color,
  status: r.status, statusLabel: r.status_label,
  portfolio: r.portfolio_id ?? null,
  description: r.description ?? '',
  resources: r.resources ?? [],
  members: memberNames ?? [],
  customFields: r.custom_fields ?? [],
  taskTemplates: r.task_templates ?? [],
  visibility: r.visibility ?? 'all',
  sectionAccess: r.section_access ?? {},
  project_type: r.project_type ?? 'standard',
  startDate: r.start_date ?? null,
  endDate: r.end_date ?? null,
  partnerSuggestions: r.partner_suggestions ?? [],
})

export const toTask = (r, secName, subs, cmts, deps, profileById = {}) => {
  // assignee_ids is the sole source of truth (assignee_name dropped in migration 027)
  const ids = Array.isArray(r.assignee_ids) ? r.assignee_ids : []
  const who = ids.map(id => profileById[id]).filter(Boolean)
  return {
  id: r.id, pid: r.project_id,
  sec: secName ?? '',
  title: r.title, desc: r.description ?? '',
  who,
  whoIds: ids,
  pri: r.priority,
  startDate: r.start_date ?? null,
  due: r.due_date ?? null,
  done: r.done,
  milestoneId: r.milestone_id ?? null,
  _legacyMilestone: r._legacy_milestone ?? false,
  recurrence: r.recurrence ?? null,
  attachments: r.attachments ?? [],
  tags: r.tags ?? [],
  activity: r.activity ?? [],
  position: r.position ?? 0,
  customValues: r.custom_values ?? {},
  visibility: r.visibility ?? 'all',
  createdAt: r.created_at ?? null,
  updatedAt: r.updated_at ?? null,
  subs: subs ?? [],
  cmts: cmts ?? [],
  partnerId: r.partner_id ?? null,
  workpackageId: r.workpackage_id ?? null,
  deps: deps ?? [],
  }
}
