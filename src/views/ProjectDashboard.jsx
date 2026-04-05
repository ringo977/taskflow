import { useMemo } from 'react'
import { useLang } from '@/i18n'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import { isOverdue } from '@/utils/filters'
import Avatar from '@/components/Avatar'
import { usePartners } from '@/hooks/usePartners'
import { useWorkpackages } from '@/hooks/useWorkpackages'
import { useMilestones } from '@/hooks/useMilestones'

const STATUS_CFG = {
  on_track:  { label: 'on_track',  color: 'var(--c-success)', bg: 'color-mix(in srgb, var(--c-success) 10%, transparent)' },
  at_risk:   { label: 'at_risk',   color: 'var(--c-warning)', bg: 'color-mix(in srgb, var(--c-warning) 10%, transparent)' },
  off_track: { label: 'off_track', color: 'var(--c-danger)',  bg: 'color-mix(in srgb, var(--c-danger) 10%, transparent)' },
}

const CARD = {
  background: 'var(--bg1)', borderRadius: 'var(--r2)',
  border: '1px solid var(--bd3)', padding: '16px 18px',
  boxShadow: 'var(--shadow-sm)',
}

const SECTION_TITLE = {
  fontSize: 12, fontWeight: 600, color: 'var(--tx3)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
}

/**
 * ProjectDashboard — lightweight strategic view.
 *
 * Shows KPIs, WP/milestone/partner progress at a glance,
 * recent activity, and quick-links to detailed sub-pages.
 * Heavy panels (rules, forms, templates, permissions, custom fields)
 * live in ProjectOverview (now the "details/settings" view).
 */
export default function ProjectDashboard({
  project, tasks, sections, onUpdProj, onOpen, lang: _lang,
  currentUser: _currentUser, myProjectRoles: _myProjectRoles, orgId, onNavigate,
}) {
  const t = useLang()
  useOrgUsers() // keep hook call order stable
  const { projectPartners } = usePartners(orgId, project?.id)
  const { workpackages } = useWorkpackages(orgId, project?.id)
  const { milestones } = useMilestones(orgId, project?.id)

  const proj = project
  const pTasks = useMemo(() => proj ? tasks.filter(tk => tk.pid === proj.id) : [], [proj, tasks])
  const done   = pTasks.filter(tk => tk.done).length
  const pct    = pTasks.length ? Math.round(done / pTasks.length * 100) : 0
  const odCount = pTasks.filter(tk => !tk.done && isOverdue(tk.due)).length
  const recent = [...pTasks].sort((a, b) => (b.id > a.id ? 1 : -1)).slice(0, 6)

  const statusLabels = { on_track: t.onTrack, at_risk: t.atRisk, off_track: t.offTrack }
  const curStatus = STATUS_CFG[proj?.statusLabel] ?? STATUS_CFG.on_track

  // Active WPs with task counts
  const wpStats = useMemo(() =>
    workpackages.filter(w => w.isActive).map(wp => {
      const wpTasks = pTasks.filter(tk => tk.workpackageId === wp.id)
      const wpDone = wpTasks.filter(tk => tk.done).length
      return { ...wp, total: wpTasks.length, done: wpDone, pct: wpTasks.length ? Math.round(wpDone / wpTasks.length * 100) : 0 }
    }),
  [workpackages, pTasks])

  // Next 3 upcoming milestones (sorted by due date)
  const upcomingMs = useMemo(() =>
    milestones
      .filter(m => m.isActive && m.status !== 'achieved')
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
      .slice(0, 3)
      .map(ms => {
        const msTasks = pTasks.filter(tk => tk.milestoneId === ms.id)
        const msDone = msTasks.filter(tk => tk.done).length
        return { ...ms, total: msTasks.length, done: msDone, pct: msTasks.length ? Math.round(msDone / msTasks.length * 100) : 0 }
      }),
  [milestones, pTasks])

  // Partner stats
  const partnerStats = useMemo(() =>
    projectPartners.map(pp => {
      const p = pp.partner
      if (!p) return null
      const ptTasks = pTasks.filter(tk => tk.partnerId === p.id)
      const ptDone = ptTasks.filter(tk => tk.done).length
      return { id: p.id, name: p.name, total: ptTasks.length, done: ptDone, pct: ptTasks.length ? Math.round(ptDone / ptTasks.length * 100) : 0 }
    }).filter(Boolean),
  [projectPartners, pTasks])

  if (!proj) return null

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '22px 26px' }}>
      {/* ── Top: status + KPI row ──────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
        {/* Status badge (clickable) */}
        <div style={{ ...CARD, display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: curStatus.color }} />
          <select
            value={proj.statusLabel ?? 'on_track'}
            onChange={e => onUpdProj(proj.id, { statusLabel: e.target.value })}
            style={{ fontSize: 13, fontWeight: 500, border: 'none', background: 'transparent', color: curStatus.color, cursor: 'pointer', outline: 'none' }}
          >
            {Object.keys(STATUS_CFG).map(k => (
              <option key={k} value={k}>{statusLabels[k]}</option>
            ))}
          </select>
        </div>

        {/* Progress KPI */}
        <div style={{ ...CARD, flex: 1, minWidth: 140 }}>
          <div style={{ ...SECTION_TITLE, marginBottom: 6 }}>{t.progress}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--tx1)' }}>{pct}%</span>
            <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{done}/{pTasks.length} {t.completedLower ?? 'completed'}</span>
          </div>
          <div style={{ height: 5, background: 'var(--bg2)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: proj.color, borderRadius: 3, transition: 'width 0.4s' }} />
          </div>
        </div>

        {/* Overdue KPI */}
        <div style={{ ...CARD, minWidth: 100, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <span style={{ fontSize: 22, fontWeight: 600, color: odCount > 0 ? 'var(--c-danger)' : 'var(--c-success)' }}>{odCount}</span>
          <span style={{ fontSize: 11, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.overdue ?? 'Overdue'}</span>
        </div>
      </div>

      {/* ── Main 2-column grid ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* WP Progress */}
        <div style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={SECTION_TITLE}>{t.wpProgressSummary ?? 'Workpackage progress'}</span>
            {onNavigate && (
              <button onClick={() => onNavigate('workpackages')} style={{ fontSize: 11, color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                {t.viewAll ?? 'View all'} →
              </button>
            )}
          </div>
          {wpStats.length === 0 && <div style={{ fontSize: 12, color: 'var(--tx3)', fontStyle: 'italic' }}>{t.noWorkpackages ?? 'No workpackages'}</div>}
          {wpStats.map(wp => (
            <div key={wp.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 12, color: 'var(--tx1)', fontWeight: 500 }}>{wp.code} {wp.name}</span>
                <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{wp.done}/{wp.total}</span>
              </div>
              <div style={{ height: 4, background: 'var(--bg2)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${wp.pct}%`, background: 'var(--c-purple, #9C27B0)', borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Milestone Timeline */}
        <div style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={SECTION_TITLE}>{t.dashMilestones ?? 'Upcoming milestones'}</span>
          </div>
          {upcomingMs.length === 0 && <div style={{ fontSize: 12, color: 'var(--tx3)', fontStyle: 'italic' }}>{t.noMilestones ?? 'No milestones'}</div>}
          {upcomingMs.map(ms => (
            <div key={ms.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--bd3)' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>◆</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ms.code} {ms.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>
                  {ms.dueDate ?? t.noDate ?? 'No date'} · {ms.done}/{ms.total} {t.completedLower ?? 'completed'}
                </div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${ms.pct >= 100 ? 'var(--c-success)' : 'var(--c-brand)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)' }}>{ms.pct}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Partner Engagement */}
        {partnerStats.length > 0 && (
          <div style={CARD}>
            <span style={{ ...SECTION_TITLE, display: 'block', marginBottom: 12 }}>{t.partnerEngagement ?? 'Partner engagement'}</span>
            {partnerStats.map(p => (
              <div key={p.id} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: 'var(--tx1)', fontWeight: 500 }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{p.done}/{p.total}</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${p.pct}%`, background: 'var(--c-brand)', borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Activity */}
        <div style={CARD}>
          <span style={{ ...SECTION_TITLE, display: 'block', marginBottom: 12 }}>{t.recentActivity}</span>
          {recent.length === 0 && <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{t.noActivity}</div>}
          {recent.map(task => (
            <div key={task.id} className="row-interactive" onClick={() => onOpen(task.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', borderBottom: '1px solid var(--bd3)', borderRadius: 'var(--r1)', cursor: 'pointer' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: task.done ? 'var(--c-success)' : proj.color, flexShrink: 0 }} />
              <Avatar name={task.who} size={18} />
              <span style={{ fontSize: 12, color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
              {task.done && <span style={{ fontSize: 12, color: 'var(--c-success)', flexShrink: 0 }}>✓</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick links row ────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
        {[
          { key: 'overview', label: t.dashDetails ?? 'Details & Settings', icon: '⚙' },
          { key: 'workpackages', label: t.workpackages ?? 'Workpackages', icon: '📦' },
        ].map(link => (
          <button key={link.key} onClick={() => onNavigate?.(link.key)}
            style={{ fontSize: 12, padding: '8px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', background: 'var(--bg1)', color: 'var(--tx2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: 'var(--shadow-sm)' }}>
            <span>{link.icon}</span> {link.label}
          </button>
        ))}
        <button
          onClick={async () => {
            const { generateProjectReport } = await import('@/utils/reportPdf')
            const { fetchOrgPartners } = await import('@/lib/db/partners')
            const orgPartners = orgId ? await fetchOrgPartners(orgId).catch(() => []) : []
            generateProjectReport(proj, pTasks, sections, t, _lang, orgPartners, workpackages, milestones)
          }}
          style={{ fontSize: 12, padding: '8px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', background: 'var(--bg1)', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: 'var(--shadow-sm)' }}>
          <span>📄</span> {t.generateReport ?? 'Generate Report'}
        </button>
      </div>
    </div>
  )
}
