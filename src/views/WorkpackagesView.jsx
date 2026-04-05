/**
 * WorkpackagesView — WP list as navigable containers (F1.3 + v0.6.1).
 *
 * Shows all workpackages with progress, status, owner, and task count.
 * Click on a WP to drill down into its tasks with a mini-tab bar
 * (List / Board / Timeline) — each view is the real component,
 * pre-filtered for the selected WP's tasks.
 */
import { useMemo, useState, lazy, Suspense } from 'react'
import { useLang } from '@/i18n'
import { useWorkpackages } from '@/hooks/useWorkpackages'
import { usePartners } from '@/hooks/usePartners'
import { useMilestones } from '@/hooks/useMilestones'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import { isOverdue } from '@/utils/filters'
import Avatar from '@/components/Avatar'
import Badge from '@/components/Badge'
import Checkbox from '@/components/Checkbox'

const BoardView = lazy(() => import('@/views/BoardView'))
const ListView = lazy(() => import('@/views/ListView'))
const TimelineView = lazy(() => import('@/views/TimelineView'))

const STATUS_COLORS = {
  draft:    'var(--tx3)',
  active:   'var(--c-brand)',
  review:   'var(--c-warning)',
  complete: 'var(--c-success)',
  delayed:  'var(--c-danger)',
}

const CARD = {
  background: 'var(--bg1)', borderRadius: 'var(--r2)',
  border: '1px solid var(--bd3)', boxShadow: 'var(--shadow-sm)',
}

const SECTION_TITLE = {
  fontSize: 12, fontWeight: 600, color: 'var(--tx3)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
}

const WP_VIEWS = [
  { id: 'list',     icon: '☰' },
  { id: 'board',    icon: '▦' },
  { id: 'timeline', icon: '▬' },
]

export default function WorkpackagesView({
  project, tasks, secs = [], projects = [],
  currentUser, myProjectRoles = {},
  onOpen, onToggle, onMove, onReorder, onAddTask, onUpdateSecs, onUpd,
  filters, orgId, lang,
}) {
  const t = useLang()
  const users = useOrgUsers()
  const { workpackages, loading } = useWorkpackages(orgId, project?.id)
  const { projectPartners } = usePartners(orgId, project?.id)
  const { milestones } = useMilestones(orgId, project?.id)

  const [selectedWpId, setSelectedWpId] = useState(null)
  const [wpView, setWpView] = useState('list')

  const pTasks = useMemo(
    () => project ? tasks.filter(tk => tk.pid === project.id) : [],
    [project, tasks],
  )

  const resolveOwnerLabel = (wp) => {
    if (wp.ownerUserId) return users.find(u => u.id === wp.ownerUserId)?.name ?? '?'
    if (wp.ownerPartnerId) {
      const pp = (projectPartners ?? []).find(pp => pp.partnerId === wp.ownerPartnerId)
      return pp?.partner?.name ?? '?'
    }
    return null
  }

  // WP stats enrichment
  const wpList = useMemo(() =>
    workpackages.map(wp => {
      const wpTasks = pTasks.filter(tk => tk.workpackageId === wp.id)
      const done = wpTasks.filter(tk => tk.done).length
      const od = wpTasks.filter(tk => !tk.done && isOverdue(tk.due)).length
      const wpMs = milestones.filter(m => m.workpackageId === wp.id)
      return {
        ...wp,
        tasks: wpTasks,
        total: wpTasks.length,
        done,
        overdue: od,
        pct: wpTasks.length ? Math.round(done / wpTasks.length * 100) : 0,
        milestones: wpMs,
      }
    }),
  [workpackages, pTasks, milestones])

  // Unassigned tasks (no WP)
  const unassigned = useMemo(
    () => pTasks.filter(tk => !tk.workpackageId),
    [pTasks],
  )

  const selectedWp = wpList.find(w => w.id === selectedWpId)

  // Sections relevant to the selected WP's tasks
  const wpSecs = useMemo(() => {
    if (!selectedWp) return secs
    const wpSecSet = new Set(selectedWp.tasks.map(tk => tk.sec))
    return secs.filter(s => wpSecSet.has(s))
  }, [selectedWp, secs])

  if (!project) return null

  // ── Detail view (drill-down into a WP) ────────────────────
  if (selectedWp) {
    return (
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Back + WP header + mini-tab bar */}
        <div style={{ padding: '14px 26px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <button onClick={() => setSelectedWpId(null)}
              style={{ fontSize: 13, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: '4px 8px' }}>
              ← {t.back ?? 'Back'}
            </button>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: STATUS_COLORS[selectedWp.status] ?? 'var(--tx3)',
              background: (STATUS_COLORS[selectedWp.status] ?? 'var(--tx3)') + '18',
              padding: '2px 8px', borderRadius: 'var(--r1)',
            }}>
              {selectedWp.code}
            </span>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx1)' }}>{selectedWp.name}</span>
            <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{selectedWp.done}/{selectedWp.total}</span>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Mini-tab bar */}
            <div style={{ display: 'flex', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', overflow: 'hidden' }}>
              {WP_VIEWS.map((v, i) => (
                <button key={v.id} onClick={() => setWpView(v.id)}
                  style={{
                    padding: '4px 12px', fontSize: 12, border: 'none',
                    borderRight: i < WP_VIEWS.length - 1 ? '1px solid var(--bd3)' : 'none',
                    background: wpView === v.id ? 'var(--c-brand)' : 'transparent',
                    color: wpView === v.id ? '#fff' : 'var(--tx2)',
                    cursor: 'pointer', fontWeight: wpView === v.id ? 600 : 400,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                  <span style={{ fontSize: 13 }}>{v.icon}</span>
                  {t[v.id] ?? v.id.charAt(0).toUpperCase() + v.id.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* WP meta row */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
            {/* Progress card */}
            <div style={{ ...CARD, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 140 }}>
              <div>
                <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--tx1)' }}>{selectedWp.pct}%</span>
                <span style={{ fontSize: 11, color: 'var(--tx3)', marginLeft: 6 }}>{selectedWp.done}/{selectedWp.total}</span>
              </div>
              <div style={{ flex: 1, height: 4, background: 'var(--bg2)', borderRadius: 'var(--r1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${selectedWp.pct}%`, background: STATUS_COLORS[selectedWp.status] ?? 'var(--c-brand)', borderRadius: 'var(--r1)', transition: 'width 0.4s' }} />
              </div>
            </div>

            {/* Meta */}
            {(resolveOwnerLabel(selectedWp) || selectedWp.dueDate) && (
              <div style={{ ...CARD, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--tx3)' }}>
                {resolveOwnerLabel(selectedWp) && <span>{t.wpOwner ?? 'Owner'}: <strong style={{ color: 'var(--tx1)' }}>{resolveOwnerLabel(selectedWp)}</strong></span>}
                {selectedWp.startDate && <span>{selectedWp.startDate}</span>}
                {selectedWp.dueDate && <span>→ {selectedWp.dueDate}</span>}
              </div>
            )}

            {/* Milestones */}
            {selectedWp.milestones.length > 0 && (
              <div style={{ ...CARD, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--tx2)' }}>
                {selectedWp.milestones.map(ms => (
                  <span key={ms.id} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    ◆ {ms.code}
                    {ms.dueDate && <span style={{ color: 'var(--tx3)', fontSize: 11 }}>{ms.dueDate}</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Embedded view */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Suspense fallback={<div style={{ padding: 24, color: 'var(--tx3)', fontSize: 13 }}>Loading...</div>}>
            {wpView === 'board' && (
              <BoardView
                tasks={selectedWp.tasks} secs={wpSecs} project={project}
                currentUser={currentUser} myProjectRoles={myProjectRoles}
                onOpen={onOpen} onToggle={onToggle} onMove={onMove} onReorder={onReorder}
                onAddTask={onAddTask} onUpdateSecs={onUpdateSecs}
                filters={filters} lang={lang} orgId={orgId}
              />
            )}
            {wpView === 'timeline' && (
              <TimelineView
                tasks={selectedWp.tasks} secs={wpSecs} projects={projects} project={project}
                currentUser={currentUser} myProjectRoles={myProjectRoles}
                onOpen={onOpen} onUpd={onUpd}
                filters={filters} lang={lang} orgId={orgId} projectId={project?.id}
              />
            )}
            {wpView === 'list' && (
              <ListView
                tasks={selectedWp.tasks} secs={wpSecs} project={project}
                currentUser={currentUser} myProjectRoles={myProjectRoles}
                onOpen={onOpen} onToggle={onToggle} onMove={onMove} onAddTask={onAddTask}
                filters={filters} lang={lang} orgId={orgId}
              />
            )}
          </Suspense>
        </div>
      </div>
    )
  }

  // ── WP list view ──────────────────────────────────────────
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '22px 26px' }}>
      {/* Summary row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ ...CARD, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--tx1)' }}>{wpList.length}</span>
          <span style={{ fontSize: 12, color: 'var(--tx3)', textTransform: 'uppercase' }}>{t.workpackages ?? 'Workpackages'}</span>
        </div>
        <div style={{ ...CARD, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--tx1)' }}>{pTasks.length}</span>
          <span style={{ fontSize: 12, color: 'var(--tx3)', textTransform: 'uppercase' }}>{t.totalTasks ?? 'Tasks'}</span>
        </div>
        {unassigned.length > 0 && (
          <div style={{ ...CARD, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--c-warning)' }}>{unassigned.length}</span>
            <span style={{ fontSize: 12, color: 'var(--tx3)', textTransform: 'uppercase' }}>{t.wpUnassigned ?? 'Unassigned'}</span>
          </div>
        )}
      </div>

      {loading && <div style={{ fontSize: 13, color: 'var(--tx3)', padding: 20 }}>Loading...</div>}

      {/* WP cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {wpList.map(wp => {
          const color = STATUS_COLORS[wp.status] ?? 'var(--tx3)'
          const ownerLabel = resolveOwnerLabel(wp)
          const statusLabel = t[`wpStatus${wp.status.charAt(0).toUpperCase() + wp.status.slice(1)}`] ?? wp.status

          return (
            <div key={wp.id} onClick={() => setSelectedWpId(wp.id)}
              className="row-interactive"
              style={{ ...CARD, padding: '14px 18px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                {/* Code badge */}
                <span style={{
                  fontSize: 11, fontWeight: 700, color,
                  background: color + '18', padding: '2px 8px', borderRadius: 'var(--r1)', flexShrink: 0,
                }}>
                  {wp.code}
                </span>
                {/* Name */}
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--tx1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {wp.name}
                </span>
                {/* Owner */}
                {ownerLabel && (
                  <span style={{ fontSize: 11, color: 'var(--tx3)', flexShrink: 0 }}>{ownerLabel}</span>
                )}
                {/* Status */}
                <span style={{ fontSize: 11, color, fontWeight: 500, flexShrink: 0 }}>{statusLabel}</span>
                {/* Counts */}
                <span style={{ fontSize: 12, color: 'var(--tx3)', flexShrink: 0 }}>{wp.done}/{wp.total}</span>
                {wp.overdue > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--c-danger)', flexShrink: 0 }}>⚠ {wp.overdue}</span>
                )}
                {/* Arrow */}
                <span style={{ fontSize: 14, color: 'var(--tx3)', flexShrink: 0 }}>›</span>
              </div>

              {/* Progress bar */}
              <div style={{ height: 4, background: 'var(--bg2)', borderRadius: 'var(--r1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${wp.pct}%`, background: color, borderRadius: 'var(--r1)', transition: 'width 0.3s' }} />
              </div>

              {/* Milestone count + dates */}
              {(wp.milestones.length > 0 || wp.dueDate) && (
                <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: 'var(--tx3)' }}>
                  {wp.milestones.length > 0 && <span>◆ {wp.milestones.length} {t.milestones?.toLowerCase?.() ?? 'milestones'}</span>}
                  {wp.startDate && <span>{t.wpStartDate ?? 'Start'}: {wp.startDate}</span>}
                  {wp.dueDate && <span>{t.wpDueDate ?? 'Due'}: {wp.dueDate}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Unassigned tasks section */}
      {unassigned.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ ...SECTION_TITLE, marginBottom: 10 }}>
            {t.wpUnassigned ?? 'Unassigned tasks'} ({unassigned.length})
          </div>
          <div style={{ ...CARD, overflow: 'hidden' }}>
            {unassigned.slice(0, 10).map(task => (
              <div key={task.id} className="row-interactive" onClick={() => onOpen(task.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid var(--bd3)', cursor: 'pointer' }}>
                <Checkbox checked={task.done} onChange={() => onToggle(task)} />
                <span style={{ fontSize: 13, color: task.done ? 'var(--tx3)' : 'var(--tx1)', flex: 1, textDecoration: task.done ? 'line-through' : 'none' }}>
                  {task.title}
                </span>
                {task.who && <Avatar name={Array.isArray(task.who) ? task.who[0] : task.who} size={20} />}
                {task.pri && <Badge pri={task.pri} />}
              </div>
            ))}
            {unassigned.length > 10 && (
              <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--tx3)', textAlign: 'center' }}>
                +{unassigned.length - 10} {t.more ?? 'more'}...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
