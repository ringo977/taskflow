import { useLang } from '@/i18n'
import { isOverdue } from '@/utils/filters'
import { fmtDate } from '@/utils/format'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import Avatar from '@/components/Avatar'
import Badge from '@/components/Badge'
import { useState, useMemo, useEffect } from 'react'
import {
  SectionTitle,
  DeadlinesWidget, ActivityWidget, HealthWidget,
  TasksPerPersonWidget, PriorityWidget, ActivityChartWidget,
  ProgressWidget, BurndownWidget, StatusDistWidget,
  VelocityWidget, OverdueWidget, WorkloadWidget, SectionCompletionWidget,
} from '@/components/DashboardWidgets'


/** Format a timestamp as relative time (e.g. "2m", "2h", "3d") */
function formatTimeAgo(ts, _t) {
  if (!ts || !Number.isFinite(ts)) return _t.justNow ?? 'just now'
  const diff = Date.now() - ts
  if (diff < 0) return _t.justNow ?? 'just now' // future timestamp guard
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return _t.justNow ?? 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

// ── Widget Registry ────────────────────────────────────────────
const WIDGET_REGISTRY = [
  { id: 'deadlines', label: { it: 'Scadenze in arrivo', en: 'Upcoming deadlines' }, defaultSize: 'half' },
  { id: 'activity', label: { it: 'Attività recente', en: 'Recent activity' }, defaultSize: 'half' },
  { id: 'health', label: { it: 'Salute progetti', en: 'Project health' }, defaultSize: 'full' },
  { id: 'tasksPerson', label: { it: 'Task per persona', en: 'Tasks per person' }, defaultSize: 'half' },
  { id: 'byPriority', label: { it: 'Per priorità', en: 'By priority' }, defaultSize: 'half' },
  { id: 'activityChart', label: { it: 'Attività 2 settimane', en: 'Activity 2 weeks' }, defaultSize: 'full' },
  { id: 'progress', label: { it: 'Progresso progetti', en: 'Project progress' }, defaultSize: 'full' },
  { id: 'burndown', label: { it: 'Burndown', en: 'Burndown' }, defaultSize: 'full' },
  { id: 'statusDist', label: { it: 'Per stato', en: 'By status' }, defaultSize: 'half' },
  { id: 'velocity', label: { it: 'Velocità', en: 'Velocity' }, defaultSize: 'half' },
  { id: 'overdueProj', label: { it: 'Scaduti per progetto', en: 'Overdue by project' }, defaultSize: 'half' },
  { id: 'workload', label: { it: 'Carico lavoro', en: 'Workload' }, defaultSize: 'half' },
  { id: 'sectionCompletion', label: { it: 'Completamento sezioni', en: 'Section completion' }, defaultSize: 'half' },
]

const DEFAULT_LAYOUT = WIDGET_REGISTRY.map(w => ({ id: w.id, visible: true, size: w.defaultSize }))

const PRI_COLORS = { high: 'var(--c-danger)', medium: 'var(--c-warning)', low: 'var(--c-lime)' }

export default function HomeDashboard({ tasks, projects, currentUser, onOpen, onNav, lang }) {
  const t = useLang()
  const USERS = useOrgUsers()
  const [burndownPid, setBurndownPid] = useState('__all__')

  // ── Dashboard layout state ─────────────────────────────────
  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem('tf_dashboard_layout')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Merge with registry to handle new widgets
        const ids = new Set(parsed.map(w => w.id))
        const merged = [...parsed, ...WIDGET_REGISTRY.filter(w => !ids.has(w.id)).map(w => ({ id: w.id, visible: true, size: w.defaultSize }))]
        return merged
      }
    } catch {}
    return DEFAULT_LAYOUT
  })
  const [editing, setEditing] = useState(false)
  const [dragIdx, setDragIdx] = useState(null)

  // Tick every 15s so relative timestamps ("2m", "2h", "3d") stay fresh
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 15_000)
    return () => clearInterval(id)
  }, [])

  // Save layout to localStorage on change
  useEffect(() => {
    localStorage.setItem('tf_dashboard_layout', JSON.stringify(layout))
  }, [layout])

  // Drag handlers
  const handleDragStart = (idx) => {
    setDragIdx(idx)
  }

  const handleDragOver = (e, idx) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    setLayout(prev => {
      const next = [...prev]
      const [dragged] = next.splice(dragIdx, 1)
      next.splice(idx, 0, dragged)
      return next
    })
    setDragIdx(idx)
  }

  const handleDragEnd = () => {
    setDragIdx(null)
  }

  // Widget actions
  const toggleVisibility = (widgetId) => {
    setLayout(prev => prev.map(w => w.id === widgetId ? { ...w, visible: !w.visible } : w))
  }

  const cycleSize = (widgetId) => {
    const sizeOrder = ['half', 'full']
    setLayout(prev => prev.map(w => {
      if (w.id === widgetId) {
        const currentIdx = sizeOrder.indexOf(w.size)
        const nextIdx = (currentIdx + 1) % sizeOrder.length
        return { ...w, size: sizeOrder[nextIdx] }
      }
      return w
    }))
  }

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT)
  }

  const todayKey = new Date().toISOString().slice(0, 10)
  // Stable Date object that only changes when the calendar date rolls over
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now    = useMemo(() => new Date(), [todayKey])
  const ts     = todayKey
  const weEnd  = new Date(now); weEnd.setDate(now.getDate() + 7)
  const weStr  = weEnd.toISOString().slice(0, 10)
  const greeting = now.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const mine     = useMemo(() => tasks.filter(task => (Array.isArray(task.who) ? task.who.includes(currentUser.name) : task.who === currentUser.name) && !task.done), [tasks, currentUser.name])
  const overdue  = useMemo(() => mine.filter(task => isOverdue(task.due)), [mine])
  const dueToday = useMemo(() => mine.filter(task => task.due === ts), [mine, ts])
  const dueWeek       = useMemo(() => mine.filter(task => task.due && task.due > ts && task.due <= weStr), [mine, ts, weStr])
  const completedCount = useMemo(() => tasks.filter(task => task.done).length, [tasks])

  // ── New widget data ─────────────────────────────────────────

  // Upcoming deadlines: all open tasks due within next 7 days, sorted by date
  const upcomingDeadlines = useMemo(() => {
    return tasks
      .filter(task => !task.done && task.due && task.due >= ts && task.due <= weStr)
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, 15)
  }, [tasks, ts, weStr])

  // Recent activity: derive from activity log (real timestamps), task ids, and comments
  const recentActivity = useMemo(() => {
    const acts = []
    const now = Date.now()
    const WEEK_MS = 7 * 86400000
    const cutoff = now - WEEK_MS

    for (const task of tasks) {
      // ── Activity-log events (real timestamps from useTaskActions) ──
      if (task.activity?.length) {
        for (const entry of task.activity) {
          const entryTs = new Date(entry.ts).getTime()
          if (isNaN(entryTs) || entryTs < cutoff) continue

          if (entry.field === 'done' && entry.to === true) {
            acts.push({ type: 'completed', task, time: entryTs, who: entry.who })
          } else if (entry.field === 'who') {
            acts.push({ type: 'assigned', task, time: entryTs, who: entry.who })
          } else if (entry.field === 'sec') {
            acts.push({ type: 'moved', task, time: entryTs, who: entry.who, detail: entry.to })
          }
        }
      }

      // ── Creation event: prefer DB created_at, fall back to task-id timestamp ──
      const createdMs = task.createdAt ? new Date(task.createdAt).getTime() : null
      const idTs = parseInt(task.id?.replace(/^t/, ''), 10)
      const createTs = (createdMs && !isNaN(createdMs)) ? createdMs : (!isNaN(idTs) ? idTs : null)
      if (createTs && createTs > cutoff && createTs <= now) {
        acts.push({ type: 'created', task, time: createTs })
      }

      // ── Completion fallback: prefer updated_at (when it was marked done), then due date ──
      if (task.done && !acts.some(a => a.type === 'completed' && a.task.id === task.id)) {
        const updMs = task.updatedAt ? new Date(task.updatedAt).getTime() : null
        const dueMs = task.due ? new Date(task.due + 'T12:00:00').getTime() : null
        // Use updated_at as best proxy for completion time; cap to now so future dates don't show "ora"
        const compTs = (updMs && !isNaN(updMs)) ? Math.min(updMs, now)
          : (dueMs && !isNaN(dueMs)) ? Math.min(dueMs, now) : null
        if (compTs && compTs > cutoff) {
          acts.push({ type: 'completed', task, time: compTs })
        }
      }

      // ── Comments ──
      if (task.cmts?.length) {
        for (const c of task.cmts.slice(-2)) {
          const cTs = new Date(c.d).getTime()
          if (!isNaN(cTs) && cTs > cutoff) {
            acts.push({ type: 'commented', task, time: cTs, who: c.who })
          }
        }
      }
    }
    return acts.sort((a, b) => b.time - a.time).slice(0, 15)
  }, [tasks])

  // Project health scores (always show, even with 0 tasks)
  const projectHealthData = useMemo(() => {
    return projects.map(p => {
      const pt = tasks.filter(tk => tk.pid === p.id)
      const total = pt.length
      const done = pt.filter(tk => tk.done).length
      const od = pt.filter(tk => !tk.done && isOverdue(tk.due)).length
      const pct = total > 0 ? Math.round(done / total * 100) : 0
      const odPct = total > 0 ? od / total : 0
      const health = total === 0 ? 'good' : odPct > 0.25 ? 'critical' : odPct > 0.10 ? 'warning' : 'good'
      return { ...p, total, done, pct, overdue: od, health }
    }).slice(0, 6)
  }, [tasks, projects])

  // ── Chart data ────────────────────────────────────────────────

  // Shared per-user task lookup: computed once, reused by barData, workloadData, and team section
  const userTaskMap = useMemo(() => {
    const map = {}
    for (const u of USERS) {
      map[u.name] = tasks.filter(task => Array.isArray(task.who) ? task.who.includes(u.name) : task.who === u.name)
    }
    return map
  }, [tasks, USERS])

  // Shared per-project lookup: O(1) access instead of repeated .find()
  const projectById = useMemo(() => {
    const map = {}
    for (const p of projects) map[p.id] = p
    return map
  }, [projects])

  // 1. Bar: tasks per person (open vs done)
  const barData = useMemo(() => USERS.map(u => {
    const ut = userTaskMap[u.name] ?? []
    return { name: u.name.split(' ')[0], open: ut.filter(t => !t.done).length, done: ut.filter(t => t.done).length, color: u.color }
  }).filter(d => d.open + d.done > 0), [USERS, userTaskMap])

  // 2. Donut: tasks by priority
  const priLabels = useMemo(() => ({ high: t.high, medium: t.medium, low: t.low }), [t.high, t.medium, t.low])
  const donutData = useMemo(() => ['high', 'medium', 'low'].map(p => ({
    name: priLabels[p],
    value: tasks.filter(task => task.pri === p && !task.done).length,
    color: PRI_COLORS[p],
  })).filter(d => d.value > 0), [tasks, priLabels])

  // 3. Area: completions over last 14 days
  // Use activity log for real completion date; fall back to due date for legacy tasks
  const areaData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - (13 - i))
    const ds = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { day: 'numeric', month: 'short' })
    const completed = tasks.filter(task => {
      if (!task.done) return false
      // Prefer real completion timestamp from activity log
      const doneEntry = (task.activity ?? []).findLast?.(a => a.field === 'done' && a.to === true)
      if (doneEntry?.ts) return doneEntry.ts.slice(0, 10) === ds
      // Fallback: due date (legacy tasks without activity tracking)
      return task.due === ds
    }).length
    const created = tasks.filter(task => {
      if (!task.id) return false
      const idTs = parseInt(task.id.replace(/^t/, ''), 10)
      if (isNaN(idTs)) return false
      return new Date(idTs).toISOString().slice(0, 10) === ds
    }).length
    return { date: label, [t.chartCompleted]: completed, [t.chartCreated]: created }
  })

  // 4. Project progress table
  const projStats = useMemo(() => projects.map(p => {
    const pt   = tasks.filter(task => task.pid === p.id)
    const done = pt.filter(task => task.done).length
    return { ...p, total: pt.length, done, pct: pt.length ? Math.round(done / pt.length * 100) : 0 }
  }), [tasks, projects])

  // 5. Burndown chart: remaining open tasks over last 30 days
  // Use real completion date from activity log; fall back to due date for legacy tasks
  const burndownData = useMemo(() => {
    const scope = burndownPid === '__all__' ? tasks : tasks.filter(tk => tk.pid === burndownPid)
    const total = scope.length
    const points = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const ds = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { day: 'numeric', month: 'short' })
      const doneByDate = scope.filter(tk => {
        if (!tk.done) return false
        const doneEntry = (tk.activity ?? []).findLast?.(a => a.field === 'done' && a.to === true)
        const completedDate = doneEntry?.ts ? doneEntry.ts.slice(0, 10) : tk.due
        return completedDate && completedDate <= ds
      }).length
      points.push({ date: label, [t.chartRemaining]: total - doneByDate, [t.chartIdeal]: Math.round(total * (1 - (30 - i) / 30)) })
    }
    return points
  }, [tasks, burndownPid, t, lang, now])

  // 6. Status distribution: tasks by section name
  const statusData = useMemo(() => {
    const counts = {}
    const statusColors = ['var(--c-brand)', 'var(--c-warning)', 'var(--c-success)', 'var(--tx3)', 'var(--c-purple)', 'var(--c-lime)']
    for (const task of tasks) {
      const sec = task.sec ?? 'Other'
      counts[sec] = (counts[sec] ?? 0) + 1
    }
    return Object.entries(counts).map(([name, value], i) => ({
      name, value, color: statusColors[i % statusColors.length],
    }))
  }, [tasks])

  // 7. Weekly velocity: tasks completed per week (last 8 weeks)
  // Use real completion date from activity log; fall back to due date for legacy tasks
  const velocityData = useMemo(() => {
    const weeks = []
    for (let w = 7; w >= 0; w--) {
      const weekEnd = new Date(now)
      weekEnd.setDate(now.getDate() - w * 7)
      const weekStart = new Date(weekEnd)
      weekStart.setDate(weekEnd.getDate() - 6)
      const ws = weekStart.toISOString().slice(0, 10)
      const we = weekEnd.toISOString().slice(0, 10)
      const label = weekStart.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { day: 'numeric', month: 'short' })
      const count = tasks.filter(tk => {
        if (!tk.done) return false
        const doneEntry = (tk.activity ?? []).findLast?.(a => a.field === 'done' && a.to === true)
        const completedDate = doneEntry?.ts ? doneEntry.ts.slice(0, 10) : tk.due
        return completedDate && completedDate >= ws && completedDate <= we
      }).length
      weeks.push({ week: label, [t.chartCompleted]: count })
    }
    return weeks
  }, [tasks, t, lang, now])

  // 8. Overdue by project: horizontal bar
  const overdueByProj = useMemo(() => {
    return projects.map(p => {
      const od = tasks.filter(tk => tk.pid === p.id && !tk.done && isOverdue(tk.due)).length
      return { name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name, overdue: od, color: p.color }
    }).filter(d => d.overdue > 0).sort((a, b) => b.overdue - a.overdue).slice(0, 6)
  }, [tasks, projects])

  // 9. Workload capacity: open tasks per person with threshold indicator
  const WORKLOAD_THRESHOLD = 8
  const workloadData = useMemo(() => {
    return USERS.map(u => {
      const open = (userTaskMap[u.name] ?? []).filter(tk => !tk.done).length
      const level = open > WORKLOAD_THRESHOLD ? 'overloaded' : open > WORKLOAD_THRESHOLD / 2 ? 'balanced' : 'light'
      return { name: u.name.split(' ')[0], open, color: u.color, level }
    }).filter(d => d.open > 0).sort((a, b) => b.open - a.open)
  }, [USERS, userTaskMap])

  // 10. Section completion: stacked bars per project showing section distribution
  const sectionCompletionData = useMemo(() => {
    return projects.slice(0, 6).map(p => {
      const pt = tasks.filter(tk => tk.pid === p.id)
      const secCounts = {}
      for (const tk of pt) {
        const sec = tk.sec ?? 'Other'
        if (!secCounts[sec]) secCounts[sec] = { total: 0, done: 0 }
        secCounts[sec].total++
        if (tk.done) secCounts[sec].done++
      }
      return { project: p, sections: secCounts, total: pt.length }
    }).filter(d => d.total > 0)
  }, [tasks, projects])

  const StatCard = ({ label, value, color, onClick }) => (
    <div onClick={onClick} className="row-interactive"
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, borderRadius: 'var(--r2)', border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, padding: '18px 18px', cursor: 'pointer' }}>
      <div style={{ fontSize: 12, color, marginBottom: 7, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 500, color, lineHeight: 1 }}>{value}</div>
    </div>
  )

  // Widget renderer
  const renderWidget = (widgetId, idx, _isVisible) => {
    const widget = layout.find(w => w.id === widgetId)
    const reg = WIDGET_REGISTRY.find(r => r.id === widgetId)
    const width = widget?.size === 'full' ? '100%' : 'calc(50% - 6px)'
    const containerStyle = {
      width,
      opacity: widget?.visible ? 1 : 0.5,
      border: editing ? '2px dashed var(--bd3)' : 'none',
      borderRadius: 'var(--r2)',
      cursor: editing ? 'grab' : 'default',
      transition: 'opacity 0.2s, border 0.2s',
      position: 'relative',
    }

    return (
      <div key={widgetId}
        draggable={editing && widget?.visible}
        onDragStart={() => editing && handleDragStart(idx)}
        onDragOver={(e) => editing && handleDragOver(e, idx)}
        onDragEnd={editing ? handleDragEnd : undefined}
        style={containerStyle}>
        {editing && widget?.visible && (
          <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 10, display: 'flex', gap: 4 }}>
            <button onClick={() => cycleSize(widgetId)} title="Resize"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--tx3)', fontSize: 12, padding: 4 }}>
              {widget.size === 'full' ? '◫' : '◫◫'}
            </button>
            <button onClick={() => toggleVisibility(widgetId)} title={widget.visible ? 'Hide' : 'Show'}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: widget.visible ? 'var(--tx2)' : 'var(--tx3)', fontSize: 13, padding: 4 }}>
              {widget.visible ? '👁' : '⊗'}
            </button>
          </div>
        )}
        {widget?.visible ? renderWidgetContent(widgetId) : editing && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--tx3)', fontSize: 12 }}>
            {reg?.label[lang] ?? widgetId}
            <br />
            ({t.hidden ?? 'hidden'})
          </div>
        )}
      </div>
    )
  }

  // Widget content renderers — components extracted to DashboardWidgets.jsx
  const renderWidgetContent = (widgetId) => {
    switch (widgetId) {
      case 'deadlines':        return <DeadlinesWidget deadlines={upcomingDeadlines} projects={projects} ts={ts} t={t} onOpen={onOpen} />
      case 'activity':         return <ActivityWidget activities={recentActivity} projects={projects} t={t} onOpen={onOpen} formatTimeAgo={formatTimeAgo} />
      case 'health':           return projects.length > 0 ? <HealthWidget data={projectHealthData} t={t} onNav={onNav} /> : null
      case 'tasksPerson':      return <TasksPerPersonWidget data={barData} t={t} />
      case 'byPriority':       return <PriorityWidget data={donutData} t={t} />
      case 'activityChart':    return <ActivityChartWidget data={areaData} t={t} />
      case 'progress':         return <ProgressWidget data={projStats} t={t} onNav={onNav} />
      case 'burndown':         return <BurndownWidget data={burndownData} projects={projects} burndownPid={burndownPid} setBurndownPid={setBurndownPid} t={t} />
      case 'statusDist':       return <StatusDistWidget data={statusData} t={t} />
      case 'velocity':         return <VelocityWidget data={velocityData} t={t} />
      case 'overdueProj':      return <OverdueWidget data={overdueByProj} t={t} />
      case 'workload':         return <WorkloadWidget data={workloadData} threshold={WORKLOAD_THRESHOLD} t={t} />
      case 'sectionCompletion': return <SectionCompletionWidget data={sectionCompletionData} t={t} />
      default: return null
    }
  }

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
          <button onClick={() => setEditing(e => !e)}
            style={{ fontSize: 12, padding: '4px 12px', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)',
              background: editing ? 'var(--c-brand)' : 'transparent',
              color: editing ? '#fff' : 'var(--tx3)', cursor: 'pointer' }}>
            {editing ? (t.doneEditing ?? '✓ Done') : (t.editDashboard ?? '⚙ Customize')}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="dash-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 22 }}>
        <StatCard label={t.overdue}        value={overdue.length}                   color="var(--c-danger)" onClick={() => onNav('mytasks')} />
        <StatCard label={t.dueToday}       value={dueToday.length}                  color="var(--c-warning)" onClick={() => onNav('mytasks')} />
        <StatCard label={t.thisWeek}       value={dueWeek.length}                   color="var(--c-brand)" onClick={() => onNav('mytasks')} />
        <StatCard label={t.completedTotal} value={completedCount}                   color="var(--c-success)" onClick={() => {}} />
      </div>

      {/* Dynamic widgets grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 0 }}>
        {layout.map((widget, idx) => renderWidget(widget.id, idx, widget.visible))}
      </div>

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
