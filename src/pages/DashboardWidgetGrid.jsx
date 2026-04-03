/**
 * DashboardWidgetGrid — lazy-loaded widget grid for HomeDashboard.
 *
 * Extracted from HomeDashboard to split the chunk and keep the
 * initial home view lightweight. Contains: widget registry, all
 * chart-data computation, widget rendering, and drag-and-drop
 * layout editing.
 */
import { useState, useMemo } from 'react'
import { useLang } from '@/i18n'
import {
  buildUserTaskMap, filterUpcomingDeadlines,
  computeProjectHealth, computeProjectStats, computeOverdueByProject,
  computeWorkload, computeTasksPerPerson, computeStatusDistribution,
  computeSectionCompletion,
} from '@/utils/selectors'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import {
  DeadlinesWidget, ActivityWidget, HealthWidget,
  TasksPerPersonWidget, PriorityWidget, ActivityChartWidget,
  ProgressWidget, BurndownWidget, StatusDistWidget,
  VelocityWidget, OverdueWidget, WorkloadWidget, SectionCompletionWidget,
} from '@/components/DashboardWidgets'

import { WIDGET_REGISTRY } from './dashboardConfig'

const PRI_COLORS = { high: 'var(--c-danger)', medium: 'var(--c-warning)', low: 'var(--c-lime)' }

/** Format a timestamp as relative time (e.g. "2m", "2h", "3d") */
function formatTimeAgo(ts, _t) {
  if (!ts || !Number.isFinite(ts)) return _t.justNow ?? 'just now'
  const diff = Date.now() - ts
  if (diff < 0) return _t.justNow ?? 'just now'
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return _t.justNow ?? 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

export default function DashboardWidgetGrid({
  tasks, projects, layout, setLayout, editing, onOpen, onNav, lang, now, ts, weStr,
}) {
  const t = useLang()
  const USERS = useOrgUsers()
  const [burndownPid, setBurndownPid] = useState('__all__')
  const [dragIdx, setDragIdx] = useState(null)

  // ── Drag handlers ──────────────────────────────────────────────
  const handleDragStart = (idx) => setDragIdx(idx)

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

  const handleDragEnd = () => setDragIdx(null)

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

  const toggleVisibility = (widgetId) => {
    setLayout(prev => prev.map(w => w.id === widgetId ? { ...w, visible: !w.visible } : w))
  }

  // ── Data computation ───────────────────────────────────────────

  // Upcoming deadlines
  const upcomingDeadlines = useMemo(() => filterUpcomingDeadlines(tasks, ts, weStr), [tasks, ts, weStr])

  // Recent activity
  const recentActivity = useMemo(() => {
    const acts = []
    const nowMs = Date.now()
    const WEEK_MS = 7 * 86400000
    const cutoff = nowMs - WEEK_MS

    for (const task of tasks) {
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
      const createdMs = task.createdAt ? new Date(task.createdAt).getTime() : null
      const idTs = parseInt(task.id?.replace(/^t/, ''), 10)
      const createTs = (createdMs && !isNaN(createdMs)) ? createdMs : (!isNaN(idTs) ? idTs : null)
      if (createTs && createTs > cutoff && createTs <= nowMs) {
        acts.push({ type: 'created', task, time: createTs })
      }
      if (task.done && !acts.some(a => a.type === 'completed' && a.task.id === task.id)) {
        const updMs = task.updatedAt ? new Date(task.updatedAt).getTime() : null
        const dueMs = task.due ? new Date(task.due + 'T12:00:00').getTime() : null
        const compTs = (updMs && !isNaN(updMs)) ? Math.min(updMs, nowMs)
          : (dueMs && !isNaN(dueMs)) ? Math.min(dueMs, nowMs) : null
        if (compTs && compTs > cutoff) {
          acts.push({ type: 'completed', task, time: compTs })
        }
      }
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

  // Project health
  const projectHealthData = useMemo(() => computeProjectHealth(tasks, projects), [tasks, projects])

  // Shared lookups
  const userTaskMap = useMemo(() => buildUserTaskMap(tasks, USERS), [tasks, USERS])
  const barData = useMemo(() => computeTasksPerPerson(userTaskMap, USERS), [USERS, userTaskMap])

  // Priority donut
  const priLabels = useMemo(() => ({ high: t.high, medium: t.medium, low: t.low }), [t.high, t.medium, t.low])
  const donutData = useMemo(() => ['high', 'medium', 'low'].map(p => ({
    name: priLabels[p],
    value: tasks.filter(task => task.pri === p && !task.done).length,
    color: PRI_COLORS[p],
  })).filter(d => d.value > 0), [tasks, priLabels])

  // Activity chart (14 days)
  const areaData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - (13 - i))
    const ds = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { day: 'numeric', month: 'short' })
    const completed = tasks.filter(task => {
      if (!task.done) return false
      const doneEntry = (task.activity ?? []).findLast?.(a => a.field === 'done' && a.to === true)
      if (doneEntry?.ts) return doneEntry.ts.slice(0, 10) === ds
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

  // Project stats
  const projStats = useMemo(() => computeProjectStats(tasks, projects), [tasks, projects])

  // Burndown
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

  // Status distribution
  const statusData = useMemo(() => computeStatusDistribution(tasks), [tasks])

  // Velocity
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

  // Overdue by project
  const overdueByProj = useMemo(() => computeOverdueByProject(tasks, projects), [tasks, projects])

  // Workload
  const WORKLOAD_THRESHOLD = 8
  const workloadData = useMemo(() => computeWorkload(userTaskMap, USERS, WORKLOAD_THRESHOLD), [USERS, userTaskMap])

  // Section completion
  const sectionCompletionData = useMemo(() => computeSectionCompletion(tasks, projects), [tasks, projects])

  // ── Widget content renderer ────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="dash-widgets" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 0 }}>
      {layout.map((widget, idx) => {
        const reg = WIDGET_REGISTRY.find(r => r.id === widget.id)
        const width = widget.size === 'full' ? '100%' : 'calc(50% - 6px)'
        const containerStyle = {
          width,
          opacity: widget.visible ? 1 : 0.5,
          border: editing ? '2px dashed var(--bd3)' : 'none',
          borderRadius: 'var(--r2)',
          cursor: editing ? 'grab' : 'default',
          transition: 'opacity 0.2s, border 0.2s',
          position: 'relative',
        }

        return (
          <div key={widget.id}
            draggable={editing && widget.visible}
            onDragStart={() => editing && handleDragStart(idx)}
            onDragOver={(e) => editing && handleDragOver(e, idx)}
            onDragEnd={editing ? handleDragEnd : undefined}
            style={containerStyle}>
            {editing && widget.visible && (
              <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 10, display: 'flex', gap: 4 }}>
                <button onClick={() => cycleSize(widget.id)} title="Resize"
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--tx3)', fontSize: 12, padding: 4 }}>
                  {widget.size === 'full' ? '◫' : '◫◫'}
                </button>
                <button onClick={() => toggleVisibility(widget.id)} title={widget.visible ? 'Hide' : 'Show'}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: widget.visible ? 'var(--tx2)' : 'var(--tx3)', fontSize: 13, padding: 4 }}>
                  {widget.visible ? '👁' : '⊗'}
                </button>
              </div>
            )}
            {widget.visible ? renderWidgetContent(widget.id) : editing && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--tx3)', fontSize: 12 }}>
                {reg?.label[lang] ?? widget.id}
                <br />
                ({t.hidden ?? 'hidden'})
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
