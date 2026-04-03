import { useLang } from '@/i18n'
import { isOverdue } from '@/utils/filters'
import { fmtDate } from '@/utils/format'
import {
  buildUserTaskMap, buildProjectById, filterMyOpen, filterOverdue,
  filterDueOn, filterDueInRange,
} from '@/utils/selectors'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import Avatar from '@/components/Avatar'
import Badge from '@/components/Badge'
import { SectionTitle } from '@/components/DashboardWidgets'
import { useState, useMemo, useEffect, lazy, Suspense } from 'react'
import { WIDGET_REGISTRY, DEFAULT_LAYOUT } from './dashboardConfig'

const DashboardWidgetGrid = lazy(() => import('./DashboardWidgetGrid'))

export default function HomeDashboard({ tasks, projects, currentUser, onOpen, onNav, lang, orgId }) {
  const t = useLang()
  const USERS = useOrgUsers()

  // ── Dashboard layout state ─────────────────────────────────
  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem('tf_dashboard_layout')
      if (saved) {
        const parsed = JSON.parse(saved)
        const ids = new Set(parsed.map(w => w.id))
        const merged = [...parsed, ...WIDGET_REGISTRY.filter(w => !ids.has(w.id)).map(w => ({ id: w.id, visible: true, size: w.defaultSize }))]
        return merged
      }
    } catch {}
    return DEFAULT_LAYOUT
  })
  const [editing, setEditing] = useState(false)

  // Tick every 15s so relative timestamps stay fresh
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 15_000)
    return () => clearInterval(id)
  }, [])

  // Save layout to localStorage on change
  useEffect(() => {
    localStorage.setItem('tf_dashboard_layout', JSON.stringify(layout))
  }, [layout])

  const resetLayout = () => setLayout(DEFAULT_LAYOUT)

  const todayKey = new Date().toISOString().slice(0, 10)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now    = useMemo(() => new Date(), [todayKey])
  const ts     = todayKey
  const weEnd  = new Date(now); weEnd.setDate(now.getDate() + 7)
  const weStr  = weEnd.toISOString().slice(0, 10)
  const greeting = now.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const mine     = useMemo(() => filterMyOpen(tasks, currentUser.name), [tasks, currentUser.name])
  const overdue  = useMemo(() => filterOverdue(mine), [mine])
  const dueToday = useMemo(() => filterDueOn(mine, ts), [mine, ts])
  const dueWeek  = useMemo(() => filterDueInRange(mine, ts, weStr), [mine, ts, weStr])
  const completedCount = useMemo(() => tasks.filter(task => task.done).length, [tasks])

  // Shared lookups for team section
  const userTaskMap = useMemo(() => buildUserTaskMap(tasks, USERS), [tasks, USERS])
  const projectById = useMemo(() => buildProjectById(projects), [projects])

  const StatCard = ({ label, value, color, onClick }) => (
    <div onClick={onClick} className="row-interactive"
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, borderRadius: 'var(--r2)', border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, padding: '18px 18px', cursor: 'pointer' }}>
      <div style={{ fontSize: 12, color, marginBottom: 7, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 500, color, lineHeight: 1 }}>{value}</div>
    </div>
  )

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
      {/* Greeting & Controls */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--tx1)', marginBottom: 3 }}>{(() => {
            const h = now.getHours()
            if (h < 12) return t.goodMorning
            if (h < 18) return t.goodAfternoon ?? t.goodMorning
            return t.goodEvening ?? t.goodMorning
          })()}, {currentUser.name} 👋</div>
          <div style={{ fontSize: 13, color: 'var(--tx3)' }}>{greeting}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {editing && (
            <button onClick={resetLayout}
              style={{ fontSize: 11, color: 'var(--tx3)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
              {t.resetLayout ?? 'Reset layout'}
            </button>
          )}
          <button data-testid="btn-customize" onClick={() => setEditing(e => !e)}
            style={{ fontSize: 12, padding: '4px 12px', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)',
              background: editing ? 'var(--c-brand)' : 'transparent',
              color: editing ? '#fff' : 'var(--tx3)', cursor: 'pointer' }}>
            {editing ? (t.doneEditing ?? '✓ Done') : (t.editDashboard ?? '⚙ Customize')}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="dash-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 22 }}>
        <StatCard label={t.overdue}        value={overdue.length}    color="var(--c-danger)"  onClick={() => onNav('mytasks')} />
        <StatCard label={t.dueToday}       value={dueToday.length}   color="var(--c-warning)" onClick={() => onNav('mytasks')} />
        <StatCard label={t.thisWeek}       value={dueWeek.length}    color="var(--c-brand)"   onClick={() => onNav('mytasks')} />
        <StatCard label={t.completedTotal} value={completedCount}    color="var(--c-success)"  onClick={() => {}} />
      </div>

      {/* Dynamic widgets grid — lazy-loaded chunk */}
      <Suspense fallback={<div style={{ padding: 24, color: 'var(--tx3)', fontSize: 13 }}>Loading widgets…</div>}>
        <DashboardWidgetGrid
          tasks={tasks} projects={projects} layout={layout} setLayout={setLayout}
          editing={editing} onOpen={onOpen} onNav={onNav} lang={lang}
          now={now} ts={ts} weStr={weStr} orgId={orgId}
        />
      </Suspense>

      {/* My open tasks */}
      <div style={{ marginTop: 16, background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <SectionTitle>{t.myOpenTasks}</SectionTitle>
          <button onClick={() => onNav('mytasks')} style={{ fontSize: 12, color: 'var(--tx-info)', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>{t.seeAll}</button>
        </div>
        {mine.length === 0 && <div style={{ fontSize: 13, color: 'var(--tx3)' }}>🎉 {t.noOpenTasks}</div>}
        {mine.slice(0, 6).map(task => {
          const p  = projectById[task.pid]
          const ov = isOverdue(task.due)
          return (
            <div key={task.id} onClick={() => onOpen(task.id)} className="row-interactive"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--bd3)', cursor: 'pointer' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: p?.color ?? '#888', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
              <Badge pri={task.pri} />
              {task.due && <span style={{ fontSize: 12, color: ov ? 'var(--c-danger)' : 'var(--tx3)', flexShrink: 0 }}>{fmtDate(task.due, lang)}</span>}
            </div>
          )
        })}
      </div>

      {/* Team overview */}
      <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px' }}>
        <SectionTitle>{t.team}</SectionTitle>
        {USERS.map(u => {
          const uTasks  = userTaskMap[u.name] ?? []
          const open    = uTasks.filter(task => !task.done).length
          const od      = uTasks.filter(task => !task.done && isOverdue(task.due)).length
          const total   = uTasks.length
          const pct     = total ? Math.round(uTasks.filter(task => task.done).length / total * 100) : 0
          return (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: '1px solid var(--bd3)' }}>
              <Avatar name={u.name} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx1)' }}>{u.name}</div>
                <div style={{ height: 3, background: 'var(--bg2)', borderRadius: 'var(--r1)', marginTop: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: u.color, borderRadius: 'var(--r1)' }} />
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--tx2)' }}>{open} {t.open}</div>
                {od > 0 && <div style={{ fontSize: 12, color: 'var(--c-danger)' }}>{od} {t.expired}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
