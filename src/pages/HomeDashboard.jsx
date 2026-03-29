import { useLang } from '@/i18n'
import { isOverdue } from '@/utils/filters'
import { fmtDate } from '@/utils/format'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import Avatar from '@/components/Avatar'
import Badge from '@/components/Badge'
import { WidgetErrorBoundary } from '@/components/ErrorBoundary'
import { useState, useMemo, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  AreaChart, Area, CartesianGrid,
  LineChart, Line,
} from 'recharts'

// ── Custom tooltip ────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg1)', border: '1px solid var(--bd2)', borderRadius: 'var(--r1)', padding: '7px 12px', fontSize: 12, color: 'var(--tx1)', boxShadow: 'var(--shadow-sm)' }}>
      {label && <div style={{ fontWeight: 500, marginBottom: 4 }}>{label}</div>}
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill ?? p.color }} />
          <span style={{ color: 'var(--tx2)' }}>{p.name}: </span>
          <span style={{ fontWeight: 500 }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

/** Format a timestamp as relative time (e.g. "2h ago", "3d ago") */
function formatTimeAgo(ts, _t) {
  const diff = Date.now() - ts
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

export default function HomeDashboard({ tasks, projects, secs: _secs = {}, currentUser, onOpen, onNav, lang }) {
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

  const mine     = tasks.filter(task => (Array.isArray(task.who) ? task.who.includes(currentUser.name) : task.who === currentUser.name) && !task.done)
  const overdue  = mine.filter(task => isOverdue(task.due))
  const dueToday = mine.filter(task => task.due === ts)
  const dueWeek  = mine.filter(task => task.due && task.due > ts && task.due <= weStr)

  // ── New widget data ─────────────────────────────────────────

  // Upcoming deadlines: all open tasks due within next 7 days, sorted by date
  const upcomingDeadlines = useMemo(() => {
    return tasks
      .filter(task => !task.done && task.due && task.due >= ts && task.due <= weStr)
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, 8)
  }, [tasks, ts, weStr])

  // Recent activity: derive from task ids (creation timestamp) + done status + comments
  const recentActivity = useMemo(() => {
    const acts = []
    for (const task of tasks) {
      // creation event
      const idTs = parseInt(task.id?.replace(/^t/, ''), 10)
      if (!isNaN(idTs) && idTs > Date.now() - 7 * 86400000) {
        acts.push({ type: 'created', task, time: idTs })
      }
      // completion event (approximate: if done and due is recent, treat due as completion date)
      if (task.done && task.due) {
        const dueTs = new Date(task.due + 'T12:00:00').getTime()
        if (dueTs > Date.now() - 7 * 86400000) {
          acts.push({ type: 'completed', task, time: dueTs })
        }
      }
      // comments
      if (task.comments?.length) {
        for (const c of task.comments.slice(-2)) {
          const cTs = new Date(c.date).getTime()
          if (cTs > Date.now() - 7 * 86400000) {
            acts.push({ type: 'commented', task, time: cTs, who: c.user })
          }
        }
      }
    }
    return acts.sort((a, b) => b.time - a.time).slice(0, 8)
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

  // 1. Bar: tasks per person (open vs done)
  const barData = USERS.map(u => ({
    name: u.name.split(' ')[0],
    open: tasks.filter(task => (Array.isArray(task.who) ? task.who.includes(u.name) : task.who === u.name) && !task.done).length,
    done: tasks.filter(task => (Array.isArray(task.who) ? task.who.includes(u.name) : task.who === u.name) && task.done).length,
    color: u.color,
  })).filter(d => d.open + d.done > 0)

  // 2. Donut: tasks by priority
  const priColors = { high: 'var(--c-danger)', medium: 'var(--c-warning)', low: 'var(--c-lime)' }
  const priLabels = { high: t.high, medium: t.medium, low: t.low }
  const donutData = ['high', 'medium', 'low'].map(p => ({
    name: priLabels[p],
    value: tasks.filter(task => task.pri === p && !task.done).length,
    color: priColors[p],
  })).filter(d => d.value > 0)

  // 3. Area: completions over last 14 days (approximate: done tasks whose due date falls in range)
  const areaData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - (13 - i))
    const ds = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { day: 'numeric', month: 'short' })
    const completed = tasks.filter(task => task.done && task.due === ds).length
    const created = tasks.filter(task => {
      if (!task.id) return false
      const idTs = parseInt(task.id.replace(/^t/, ''), 10)
      if (isNaN(idTs)) return false
      return new Date(idTs).toISOString().slice(0, 10) === ds
    }).length
    return { date: label, [t.chartCompleted]: completed, [t.chartCreated]: created }
  })

  // 4. Project progress table
  const projStats = projects.map(p => {
    const pt   = tasks.filter(task => task.pid === p.id)
    const done = pt.filter(task => task.done).length
    return { ...p, total: pt.length, done, pct: pt.length ? Math.round(done / pt.length * 100) : 0 }
  })

  // 5. Burndown chart: remaining open tasks over last 30 days
  const burndownData = useMemo(() => {
    const scope = burndownPid === '__all__' ? tasks : tasks.filter(tk => tk.pid === burndownPid)
    const total = scope.length
    const points = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const ds = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { day: 'numeric', month: 'short' })
      const doneByDate = scope.filter(tk => tk.done && tk.due && tk.due <= ds).length
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
      const count = tasks.filter(tk => tk.done && tk.due && tk.due >= ws && tk.due <= we).length
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
      const open = tasks.filter(tk => (Array.isArray(tk.who) ? tk.who.includes(u.name) : tk.who === u.name) && !tk.done).length
      const level = open > WORKLOAD_THRESHOLD ? 'overloaded' : open > WORKLOAD_THRESHOLD / 2 ? 'balanced' : 'light'
      return { name: u.name.split(' ')[0], open, color: u.color, level }
    }).filter(d => d.open > 0).sort((a, b) => b.open - a.open)
  }, [tasks, USERS])

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

  // Widget content renderers
  const renderWidgetContent = (widgetId) => {
    switch (widgetId) {
      case 'deadlines': return (
        <WidgetErrorBoundary name="Deadlines">
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <SectionTitle>{t.upcomingDeadlines ?? 'Upcoming deadlines'}</SectionTitle>
            <span style={{ fontSize: 11, color: 'var(--tx3)' }}>7 {t.days ?? 'days'}</span>
          </div>
          {upcomingDeadlines.length === 0
            ? <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--tx3)' }}>🎉 {t.noUpcoming ?? 'No deadlines this week'}</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {upcomingDeadlines.map(task => {
                  const p = projects.find(x => x.id === task.pid)
                  const daysUntil = Math.round((new Date(task.due + 'T00:00:00') - new Date(ts + 'T00:00:00')) / 86400000)
                  const urgencyColor = daysUntil === 0 ? 'var(--c-danger)' : daysUntil === 1 ? 'var(--c-warning)' : 'var(--tx3)'
                  const urgencyLabel = daysUntil === 0 ? t.today : daysUntil === 1 ? (t.dueTomorrow ?? 'Tomorrow') : (t.daysLeft ?? (n => `${n}d left`))(daysUntil)
                  return (
                    <div key={task.id} onClick={() => onOpen(task.id)} className="row-interactive"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--bd3)', cursor: 'pointer' }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: p?.color ?? '#888', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                      <Badge pri={task.pri} />
                      <span style={{ fontSize: 11, color: urgencyColor, flexShrink: 0, fontWeight: 500, minWidth: 50, textAlign: 'right' }}>{urgencyLabel}</span>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>
        </WidgetErrorBoundary>
      )

      case 'activity': return (
        <WidgetErrorBoundary name="Activity">
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px' }}>
          <SectionTitle>{t.recentActivityFeed ?? 'Recent activity'}</SectionTitle>
          {recentActivity.length === 0
            ? <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--tx3)' }}>{t.noRecentActivity ?? 'No recent activity'}</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recentActivity.map((act, i) => {
                  const p = projects.find(x => x.id === act.task.pid)
                  const ago = formatTimeAgo(act.time, t)
                  const typeColor = act.type === 'completed' ? 'var(--c-success)' : act.type === 'created' ? 'var(--c-brand)' : 'var(--tx3)'
                  const typeIcon = act.type === 'completed' ? '✓' : act.type === 'created' ? '+' : '💬'
                  const typeLabel = act.type === 'created' ? (t.actCreated ?? 'created')
                    : act.type === 'completed' ? (t.actCompleted ?? 'completed')
                    : (t.actCommented ?? 'commented on')
                  const who = act.who ?? act.task.who ?? ''
                  return (
                    <div key={`${act.task.id}-${act.type}-${i}`} onClick={() => onOpen(act.task.id)}
                      className="row-interactive"
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0', borderBottom: '1px solid var(--bd3)', cursor: 'pointer' }}>
                      <span style={{ fontSize: 11, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: `color-mix(in srgb, ${typeColor} 15%, transparent)`, color: typeColor, flexShrink: 0 }}>{typeIcon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 500 }}>{who ? (Array.isArray(who) ? who[0] : who).split(' ')[0] : ''}</span>{' '}
                          <span style={{ color: 'var(--tx3)' }}>{typeLabel}</span>{' '}
                          {act.task.title}
                        </div>
                      </div>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: p?.color ?? '#888', flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: 'var(--tx3)', flexShrink: 0 }}>{ago}</span>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>
        </WidgetErrorBoundary>
      )

      case 'health': return (
        projects.length > 0 && (
          <WidgetErrorBoundary name="Project health">
          <div style={{ marginBottom: 0 }}>
            <SectionTitle>{t.projectHealth ?? 'Project health'}</SectionTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {projectHealthData.map(p => {
                const healthColor = p.health === 'critical' ? 'var(--c-danger)' : p.health === 'warning' ? 'var(--c-warning)' : 'var(--c-success)'
                const healthLabel = p.health === 'critical' ? (t.healthCritical ?? 'Off track')
                  : p.health === 'warning' ? (t.healthWarning ?? 'At risk')
                  : (t.healthGood ?? 'On track')
                return (
                  <div key={p.id} onClick={() => onNav('projects', p.id)}
                    className="row-interactive"
                    style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '14px 16px', cursor: 'pointer', flex: '1 1 calc(33.33% - 8px)', minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 22, fontWeight: 500, color: 'var(--tx1)' }}>{p.pct}%</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: healthColor, padding: '2px 8px', borderRadius: 'var(--r1)', background: `color-mix(in srgb, ${healthColor} 12%, transparent)` }}>{healthLabel}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--bg2)', borderRadius: 'var(--r1)', overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${p.pct}%`, background: p.color, borderRadius: 'var(--r1)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--tx3)' }}>
                      <span>{p.done}/{p.total} {t.tasksLabel ?? 'tasks'}</span>
                      {p.overdue > 0 && <span style={{ color: 'var(--c-danger)' }}>{p.overdue} {t.overdue?.toLowerCase?.() ?? 'overdue'}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          </WidgetErrorBoundary>
        )
      )

      case 'tasksPerson': return (
        <WidgetErrorBoundary name="Tasks per person">
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px' }}>
          <SectionTitle>{t.chartTasksPerPerson}</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} barSize={14} barGap={3}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} allowDecimals={false} width={20} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg2)' }} />
              <Bar dataKey="open" name={t.chartOpenLabel} radius={[3,3,0,0]}>
                {barData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.8} />)}
              </Bar>
              <Bar dataKey="done" name={t.chartDoneLabel} radius={[3,3,0,0]}>
                {barData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.3} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--tx3)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 'var(--r1)', background: 'var(--c-brand)', opacity: 0.8 }} />
              {t.chartOpenLabel}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--tx3)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 'var(--r1)', background: 'var(--c-brand)', opacity: 0.3 }} />
              {t.chartDoneLabel}
            </div>
          </div>
        </div>
        </WidgetErrorBoundary>
      )

      case 'byPriority': return (
        <WidgetErrorBoundary name="Priority">
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px' }}>
          <SectionTitle>{t.chartByPriority}</SectionTitle>
          {donutData.length === 0
            ? <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--tx3)' }}>🎉 {t.noOpenTasks}</div>
            : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={donutData} cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75}
                    paddingAngle={3} dataKey="value"
                  >
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    iconType="circle" iconSize={8}
                    formatter={(v) => <span style={{ fontSize: 12, color: 'var(--tx2)' }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )
          }
        </div>
        </WidgetErrorBoundary>
      )

      case 'activityChart': return (
        <WidgetErrorBoundary name="Activity Chart">
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px' }}>
          <SectionTitle>{t.chartActivity}</SectionTitle>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--c-success)" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="var(--c-success)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bd3)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--tx3)' }} axisLine={false} tickLine={false}
                interval={2} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} allowDecimals={false} width={20} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey={t.chartCompleted} name={t.chartCompleted}
                stroke="var(--c-success)" strokeWidth={2} fill="url(#gc)" />
              <Area type="monotone" dataKey={t.chartCreated} name={t.chartCreated}
                stroke="var(--c-brand)" strokeWidth={1.5} fill="none" strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        </WidgetErrorBoundary>
      )

      case 'progress': return (
        <WidgetErrorBoundary name="Project Progress">
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <SectionTitle>{t.projectProgress}</SectionTitle>
            <button onClick={() => onNav('projects')} style={{ fontSize: 12, color: 'var(--tx-info)', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>{t.seeAll}</button>
          </div>
          {projStats.map(p => (
            <div key={p.id} style={{ marginBottom: 11 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.color }} />
                  <span style={{ fontSize: 12, color: 'var(--tx1)' }}>{p.name}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{p.done}/{p.total}</span>
              </div>
              <div style={{ height: 5, background: 'var(--bg2)', borderRadius: 'var(--r1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${p.pct}%`, background: p.color, borderRadius: 'var(--r1)', transition: 'width 0.4s' }} />
              </div>
            </div>
          ))}
        </div>
        </WidgetErrorBoundary>
      )

      case 'burndown': return (
        <WidgetErrorBoundary name="Burndown">
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <SectionTitle>{t.chartBurndown}</SectionTitle>
            <select value={burndownPid} onChange={e => setBurndownPid(e.target.value)}
              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx2)', cursor: 'pointer' }}>
              <option value="__all__">{t.chartAllProjects}</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={burndownData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bd3)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} interval={5} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey={t.chartIdeal} stroke="var(--tx3)" strokeWidth={1} strokeDasharray="5 3" dot={false} />
              <Line type="monotone" dataKey={t.chartRemaining} stroke="var(--c-danger)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--tx3)' }}>
              <div style={{ width: 16, height: 2, background: 'var(--c-danger)' }} />
              {t.chartRemaining}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--tx3)' }}>
              <div style={{ width: 16, height: 0, borderTop: '2px dashed var(--tx3)' }} />
              {t.chartIdeal}
            </div>
          </div>
        </div>
        </WidgetErrorBoundary>
      )

      case 'statusDist': return (
        <WidgetErrorBoundary name="Status Distribution">
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px' }}>
          <SectionTitle>{t.chartByStatus}</SectionTitle>
          {statusData.length === 0
            ? <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--tx3)' }}>—</div>
            : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value">
                    {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: 'var(--tx2)' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )
          }
        </div>
        </WidgetErrorBoundary>
      )

      case 'velocity': return (
        <WidgetErrorBoundary name="Velocity">
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px' }}>
          <SectionTitle>{t.chartVelocity}</SectionTitle>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={velocityData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bd3)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} allowDecimals={false} width={20} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey={t.chartCompleted} fill="var(--c-success)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        </WidgetErrorBoundary>
      )

      case 'overdueProj': return (
        <WidgetErrorBoundary name="Overdue by Project">
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px' }}>
          <SectionTitle>{t.chartOverdueByProject}</SectionTitle>
          {overdueByProj.length === 0
            ? <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--tx3)' }}>🎉 {t.noOpenTasks}</div>
            : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={overdueByProj} layout="vertical" barSize={14}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--tx2)' }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="overdue" name={t.overdue} radius={[0, 4, 4, 0]}>
                    {overdueByProj.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>
        </WidgetErrorBoundary>
      )

      case 'workload': return (
        <WidgetErrorBoundary name="Workload">
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px' }}>
          <SectionTitle>{t.chartWorkload ?? 'Workload'}</SectionTitle>
          {workloadData.length === 0
            ? <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--tx3)' }}>—</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {workloadData.map(d => {
                  const levelColor = d.level === 'overloaded' ? 'var(--c-danger)' : d.level === 'balanced' ? 'var(--c-warning)' : 'var(--c-success)'
                  const levelLabel = d.level === 'overloaded' ? (t.overloaded ?? 'Overloaded') : d.level === 'balanced' ? (t.balanced ?? 'Balanced') : (t.light ?? 'Light')
                  const pct = Math.min(100, Math.round((d.open / WORKLOAD_THRESHOLD) * 100))
                  return (
                    <div key={d.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, color: 'var(--tx1)', fontWeight: 500 }}>{d.name}</span>
                        <span style={{ fontSize: 11, color: levelColor, fontWeight: 500 }}>{d.open} task — {levelLabel}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg2)', borderRadius: 'var(--r1)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: levelColor, borderRadius: 'var(--r1)', transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  )
                })}
                <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 2 }}>
                  {t.workloadCapacity ?? 'Capacity'}: {WORKLOAD_THRESHOLD} task / {t.team?.toLowerCase?.() ?? 'person'}
                </div>
              </div>
            )
          }
        </div>
        </WidgetErrorBoundary>
      )

      case 'sectionCompletion': return (
        <WidgetErrorBoundary name="Section Completion">
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px' }}>
          <SectionTitle>{t.chartSectionCompletion ?? 'Completion by section'}</SectionTitle>
          {sectionCompletionData.length === 0
            ? <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--tx3)' }}>—</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sectionCompletionData.map(({ project: p, sections: secCounts }) => (
                  <div key={p.id}>
                    <div style={{ fontSize: 12, color: 'var(--tx1)', fontWeight: 500, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color }} />
                      {p.name}
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {Object.entries(secCounts).map(([sec, { total, done }]) => {
                        const pct = total ? Math.round(done / total * 100) : 0
                        return (
                          <div key={sec} style={{ flex: total, minWidth: 0 }} title={`${sec}: ${done}/${total} (${pct}%)`}>
                            <div style={{ height: 14, background: 'var(--bg2)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: p.color, opacity: 0.7, borderRadius: 2 }} />
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--tx3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sec}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
        </WidgetErrorBoundary>
      )

      default: return null
    }
  }

  const SectionTitle = ({ children }) => (
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)', marginBottom: 12 }}>{children}</div>
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
        <StatCard label={t.completedTotal} value={tasks.filter(t => t.done).length} color="var(--c-success)" onClick={() => {}} />
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
          const p  = projects.find(x => x.id === task.pid)
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
          const whoMatch = task => Array.isArray(task.who) ? task.who.includes(u.name) : task.who === u.name
          const open    = tasks.filter(task => whoMatch(task) && !task.done).length
          const od      = tasks.filter(task => whoMatch(task) && !task.done && isOverdue(task.due)).length
          const pct     = tasks.filter(task => whoMatch(task)).length
            ? Math.round(tasks.filter(task => whoMatch(task) && task.done).length / tasks.filter(task => whoMatch(task)).length * 100)
            : 0
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
