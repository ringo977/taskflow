/**
 * DeadlinesCockpit — at-a-glance supervision panel showing upcoming
 * milestones, upcoming deliverables, overdue tasks, ownerless tasks,
 * and delayed deliverables.
 *
 * Relies on shared selectors (Phase 0) for task-level data and
 * useDeliverables (Phase 1) for deliverable-level data.
 */
import { useState, useMemo } from 'react'
import { useLang } from '@/i18n'
import { fmtDate } from '@/utils/format'
import { isOverdue } from '@/utils/filters'
import {
  filterOverdue,
  filterOwnerless,
} from '@/utils/selectors'

const WINDOWS = [7, 14, 30]

// ── Small card widget ──────────────────────────────────────────────
function CockpitCard({ title, count, color, children }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--bd3)',
      borderRadius: 'var(--r2)', padding: 14, minWidth: 0,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </span>
        <span style={{
          fontSize: 18, fontWeight: 700, color,
          lineHeight: 1,
        }}>
          {count}
        </span>
      </div>
      <div style={{ maxHeight: 180, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

function ItemRow({ label, sub, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '4px 0', fontSize: 12, cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span style={{ color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>
        {label}
      </span>
      {sub && <span style={{ color: color ?? 'var(--tx3)', fontSize: 11, flexShrink: 0 }}>{sub}</span>}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────
export default function DeadlinesCockpit({ tasks, deliverables, onOpenTask, lang }) {
  const t = useLang()
  const [window, setWindow] = useState(14)

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const horizon = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + window)
    return d.toISOString().slice(0, 10)
  }, [window])

  // ── Task-level data (shared selectors) ───────────────
  const overdueTasks = useMemo(() => filterOverdue(tasks), [tasks])
  const ownerlessTasks = useMemo(() => filterOwnerless(tasks), [tasks])

  // ── Deliverable-level data ───────────────────────────
  const upcomingDeliverables = useMemo(
    () => deliverables
      .filter(d => d.status !== 'accepted' && d.dueDate && d.dueDate >= today && d.dueDate <= horizon)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [deliverables, today, horizon],
  )

  const delayedDeliverables = useMemo(
    () => deliverables.filter(d => d.status === 'delayed' || (d.status !== 'accepted' && d.dueDate && isOverdue(d.dueDate))),
    [deliverables],
  )

  // Milestones = tasks flagged as milestone (t.milestone === true)
  const upcomingMilestones = useMemo(
    () => tasks
      .filter(t => t.milestone && !t.done && t.due && t.due >= today && t.due <= horizon)
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, 15),
    [tasks, today, horizon],
  )

  const noItems = t.supNoItems

  return (
    <div>
      {/* Window selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{t.supWindow}:</span>
        {WINDOWS.map(w => (
          <button key={w} onClick={() => setWindow(w)}
            style={{
              padding: '3px 10px', fontSize: 12, border: '1px solid var(--bd3)',
              borderRadius: 'var(--r1)', cursor: 'pointer',
              background: window === w ? 'var(--tx1)' : 'transparent',
              color: window === w ? 'var(--bg1)' : 'var(--tx2)',
              fontWeight: window === w ? 600 : 400,
            }}>
            {w} {t.supDays}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>

        {/* Upcoming milestones */}
        <CockpitCard title={t.supMilestonesUpcoming} count={upcomingMilestones.length} color="var(--c-purple)">
          {upcomingMilestones.length === 0
            ? <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{noItems}</span>
            : upcomingMilestones.map(m => (
              <ItemRow key={m.id} label={m.title} sub={fmtDate(m.due, lang)}
                color="var(--c-purple)" onClick={() => onOpenTask?.(m.id)} />
            ))}
        </CockpitCard>

        {/* Upcoming deliverables */}
        <CockpitCard title={t.supDeliverablesUpcoming} count={upcomingDeliverables.length} color="var(--c-brand)">
          {upcomingDeliverables.length === 0
            ? <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{noItems}</span>
            : upcomingDeliverables.map(d => (
              <ItemRow key={d.id} label={`${d.code} — ${d.title}`} sub={fmtDate(d.dueDate, lang)}
                color="var(--c-brand)" />
            ))}
        </CockpitCard>

        {/* Overdue tasks */}
        <CockpitCard title={t.supTasksOverdue} count={overdueTasks.length} color="var(--c-danger)">
          {overdueTasks.length === 0
            ? <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{noItems}</span>
            : overdueTasks.slice(0, 15).map(tk => (
              <ItemRow key={tk.id} label={tk.title} sub={fmtDate(tk.due, lang)}
                color="var(--c-danger)" onClick={() => onOpenTask?.(tk.id)} />
            ))}
        </CockpitCard>

        {/* Ownerless tasks */}
        <CockpitCard title={t.supTasksNoOwner} count={ownerlessTasks.length} color="var(--c-warning)">
          {ownerlessTasks.length === 0
            ? <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{noItems}</span>
            : ownerlessTasks.slice(0, 15).map(tk => (
              <ItemRow key={tk.id} label={tk.title} sub={tk.sec ?? ''}
                color="var(--c-warning)" onClick={() => onOpenTask?.(tk.id)} />
            ))}
        </CockpitCard>

        {/* Delayed deliverables */}
        <CockpitCard title={t.supDeliverablesDelayed} count={delayedDeliverables.length} color="var(--c-danger)">
          {delayedDeliverables.length === 0
            ? <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{noItems}</span>
            : delayedDeliverables.map(d => (
              <ItemRow key={d.id} label={`${d.code} — ${d.title}`}
                sub={d.dueDate ? fmtDate(d.dueDate, lang) : '—'}
                color="var(--c-danger)" />
            ))}
        </CockpitCard>

      </div>
    </div>
  )
}
