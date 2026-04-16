import { useEffect, useMemo, useState } from 'react'
import { useLang } from '@/i18n'
import AvatarGroup from '@/components/AvatarGroup'

// Views grouped under the "Work" primary tab — interchangeable
// lenses on the same task set, so they live in a secondary segmented
// control instead of cluttering the primary bar.
const WORK_VIEWS = ['lista', 'board', 'timeline', 'calendario']

export default function ProjectHeader({ proj, view, setView, tasks, onAddTask, onSummary, onExport, portfolios, onSubmitForm, forms = [] }) {
  const t  = useLang()
  const po = portfolios.find(x => x.id === proj?.portfolio)
  const done = tasks.filter(t => t.done).length
  const memberNames = useMemo(() => [...new Set(tasks.flatMap(t => Array.isArray(t.who) ? t.who : t.who ? [t.who] : []))], [tasks])

  // Remember which work-view the user last opened, so the Work primary
  // tab re-opens that view (default: List). Updates whenever `view`
  // enters the WORK_VIEWS family.
  const isWorkView = WORK_VIEWS.includes(view)
  const [lastWorkView, setLastWorkView] = useState(isWorkView ? view : 'lista')
  useEffect(() => { if (isWorkView) setLastWorkView(view) }, [view, isWorkView])

  // Primary tabs — high-level sections of the project
  const PRIMARY = [
    [t.dashboard ?? 'Dashboard', 'dashboard'],
    [t.overview ?? 'Overview', 'overview'],
    // Work is a pseudo-tab: clicking it enters the last-used work view
    [t.work ?? 'Work', 'work', true],
    [t.workpackages ?? 'WPs', 'workpackages'],
    ...(proj?.project_type && proj.project_type !== 'standard' ? [[t.supervision, 'supervision']] : []),
  ]

  // Secondary segmented control — shown only when inside the Work family
  const WORK_TABS = [
    [t.list, 'lista'],
    [t.board, 'board'],
    [t.timeline, 'timeline'],
    [t.calendar, 'calendario'],
  ]

  const primaryBtnStyle = (selected, isLast) => ({
    padding: '5px 12px', fontSize: 12, border: 'none',
    borderRight: isLast ? 'none' : '1px solid var(--bd3)',
    background: selected ? 'var(--bg2)' : 'transparent',
    color: selected ? 'var(--tx1)' : 'var(--tx2)',
    fontWeight: selected ? 500 : 400, cursor: 'pointer',
  })

  const subBtnStyle = (selected, isLast) => ({
    padding: '4px 12px', fontSize: 12, border: 'none',
    borderRight: isLast ? 'none' : '1px solid var(--bd3)',
    background: selected ? 'var(--bg1)' : 'transparent',
    color: selected ? 'var(--tx1)' : 'var(--tx2)',
    fontWeight: selected ? 500 : 400, cursor: 'pointer',
  })

  return (
    <div style={{ borderBottom: '1px solid var(--bd3)', background: 'var(--bg1)', flexShrink: 0 }}>
      <div className="project-header" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {po && <span style={{ fontSize: 12, color: po.color, background: po.color + '12', padding: '3px 10px', borderRadius: 'var(--r1)', fontWeight: 500, flexShrink: 0 }}>{po.name}</span>}
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: proj?.color, flexShrink: 0 }} />
        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{proj?.name}</span>
        <span style={{ fontSize: 13, color: 'var(--tx3)', flexShrink: 0 }}>{done}/{tasks.length}</span>
        {memberNames.length > 0 && <AvatarGroup names={memberNames} size={26} />}
        <div style={{ flex: 1 }} />
        <div className="view-tabs" role="tablist" aria-label={t.projectViews ?? 'Project views'} style={{ display: 'flex', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', overflow: 'hidden', flexShrink: 0 }}>
          {PRIMARY.map(([lb, v, isWorkTab], i, arr) => {
            // The "Work" pseudo-tab is highlighted whenever the active
            // view is any member of the work family, and routes to the
            // last-used work view on click.
            const selected = isWorkTab ? isWorkView : view === v
            const target = isWorkTab ? lastWorkView : v
            const label = isWorkTab ? `${lb} ▾` : lb
            const isLast = i === arr.length - 1
            return (
              <button key={v} role="tab" aria-selected={selected}
                data-testid={`tab-${v}`} onClick={() => setView(target)}
                style={primaryBtnStyle(selected, isLast)}>
                {label}
              </button>
            )
          })}
        </div>
        {/* Settings icon (governance) — distinct from content tabs */}
        <button
          data-testid="tab-settings"
          aria-label={t.projectSettings ?? 'Project settings'}
          title={t.projectSettings ?? 'Project settings'}
          aria-pressed={view === 'settings'}
          onClick={() => setView(view === 'settings' ? 'dashboard' : 'settings')}
          style={{
            fontSize: 14, padding: '5px 9px', borderRadius: 'var(--r1)',
            border: '1px solid var(--bd3)',
            background: view === 'settings' ? 'var(--bg2)' : 'transparent',
            color: view === 'settings' ? 'var(--tx1)' : 'var(--tx3)',
            cursor: 'pointer', lineHeight: 1, flexShrink: 0,
          }}
        >⚙</button>
        {onSubmitForm && forms.length > 0 && (
          forms.length === 1
            ? <button onClick={() => onSubmitForm(forms[0])} style={{ fontSize: 12, padding: '5px 12px', color: 'var(--c-purple, var(--accent))', borderColor: 'var(--c-purple, var(--accent))' }}>📋 {forms[0].name}</button>
            : <select onChange={e => { const f = forms.find(f => f.id === e.target.value); if (f) onSubmitForm(f); e.target.value = '' }}
                defaultValue="" style={{ fontSize: 12, padding: '5px 8px', color: 'var(--c-purple, var(--accent))', borderColor: 'var(--c-purple, var(--accent))', borderRadius: 'var(--r1)', background: 'transparent', cursor: 'pointer' }}>
                <option value="" disabled>📋 {t.formSubmit ?? 'Forms'}...</option>
                {forms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
        )}
        <button onClick={onExport} title={t.exportCsv ?? 'Export CSV'} style={{ fontSize: 12, padding: '5px 10px', color: 'var(--tx3)', borderColor: 'var(--bd3)' }}>↓ CSV</button>
        <button onClick={onSummary} style={{ fontSize: 12, padding: '5px 12px', color: 'var(--c-success)', borderColor: 'var(--c-success)' }}>{t.aiSummary}</button>
        <button data-testid="btn-add-task" onClick={onAddTask} style={{ fontSize: 13, padding: '6px 14px', background: 'var(--tx1)', color: 'var(--bg1)', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer', fontWeight: 600 }}>{t.addTask}</button>
      </div>
      {/* Secondary segmented control — List / Board / Timeline / Calendar.
          Shown only when inside the Work family, in context where it's
          useful. Keeps test IDs (tab-lista, tab-board, …) so e2e selectors
          continue to resolve. */}
      {isWorkView && (
        <div className="work-subtabs" role="tablist"
          aria-label={t.work ?? 'Work views'}
          style={{ padding: '0 20px 10px 20px', display: 'flex', gap: 0 }}>
          <div style={{ display: 'flex', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', overflow: 'hidden', background: 'var(--bg2)' }}>
            {WORK_TABS.map(([lb, v], i, arr) => (
              <button key={v} role="tab" aria-selected={view === v}
                data-testid={`tab-${v}`} onClick={() => setView(v)}
                style={subBtnStyle(view === v, i === arr.length - 1)}>
                {lb}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
