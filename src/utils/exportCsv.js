import { applyVisibilityFilter } from '@/utils/filters'

/**
 * Export an array of tasks to a CSV file and trigger download.
 */

export function exportTasksCsv(tasks, projectName, customFields = [], project = null, userName = null, partnerMap = {}) {
  // Apply visibility filter if project and user are provided
  if (project && userName) {
    tasks = applyVisibilityFilter(tasks, project, userName)
  }
  const baseCols = ['Title', 'Section', 'Assignee', 'Priority', 'Start Date', 'Due Date', 'Done', 'Tags', 'Partner', 'Description']
  const cfCols = customFields.map(f => f.name)
  const header = [...baseCols, ...cfCols]

  const esc = (v) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }

  const rows = tasks.map(t => {
    const base = [
      t.title,
      t.sec,
      Array.isArray(t.who) ? t.who.join('; ') : t.who,
      t.pri,
      t.startDate ?? '',
      t.due ?? '',
      t.done ? 'Yes' : 'No',
      (t.tags ?? []).map(tg => tg.name).join('; '),
      partnerMap[t.partnerId]?.name ?? '',
      t.desc,
    ]
    const cf = customFields.map(f => (t.customValues ?? {})[f.id] ?? '')
    return [...base, ...cf].map(esc).join(',')
  })

  const csv = [header.map(esc).join(','), ...rows].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${projectName ?? 'tasks'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
