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
})

export const toTask = (r, secName, subs, cmts, deps) => ({
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
