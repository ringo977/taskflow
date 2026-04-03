/**
 * SupervisionTimeline — simplified horizontal timeline showing
 * milestones, deliverables, and upcoming recurring controls.
 *
 * Displays items on a linear time axis sorted by date, with color-coded
 * badges by type. Overdue items are highlighted. Does not reuse
 * TimelineView (too coupled to task drag-and-drop).
 */
import { useMemo, useState } from 'react'
import { useLang } from '@/i18n'
import { fmtDate } from '@/utils/format'
import { isOverdue } from '@/utils/filters'

const WINDOWS = [30, 60, 90]

const TYPE_CFG = {
  milestone:   { color: 'var(--c-purple)',  label: 'Milestone' },
  deliverable: { color: 'var(--c-brand)',   label: 'Deliverable' },
  control:     { color: 'var(--c-warning)', label: 'Control' },
}

function buildTimelineItems(tasks, deliverables, controls, horizon) {
  const today = new Date().toISOString().slice(0, 10)
  const items = []

  // Milestones: tasks with milestone flag, not done
  for (const t of tasks) {
    if (!t.milestone || t.done || !t.due) continue
    if (t.due > horizon) continue
    items.push({
      id: t.id,
      type: 'milestone',
      label: t.title,
      date: t.due,
      overdue: isOverdue(t.due),
      status: t.done ? 'done' : 'open',
    })
  }

  // Deliverables: not accepted
  for (const d of deliverables) {
    if (d.status === 'accepted' || !d.dueDate) continue
    if (d.dueDate > horizon) continue
    items.push({
      id: d.id,
      type: 'deliverable',
      label: `${d.code} — ${d.title}`,
      date: d.dueDate,
      overdue: d.status === 'delayed' || isOverdue(d.dueDate),
      status: d.status,
    })
  }

  // Recurring controls: active with next_due_date
  for (const c of controls) {
    if (!c.active || !c.nextDueDate) continue
    if (c.nextDueDate > horizon) continue
    items.push({
      id: c.id,
      type: 'control',
      label: c.title,
      date: c.nextDueDate,
      overdue: c.nextDueDate <= today,
      status: c.nextDueDate <= today ? 'due' : 'upcoming',
    })
  }

  items.sort((a, b) => a.date.localeCompare(b.date))
  return items
}

// ── Bar item ──────────────────────────────────────────────────────
function TimelineItem({ item, minDate, dayWidth, onClick, lang }) {
  const dayOffset = Math.max(0, (new Date(item.date) - new Date(minDate)) / 86400000)
  const cfg = TYPE_CFG[item.type]

  return (
    <div
      onClick={() => onClick?.(item)}
      style={{
        position: 'absolute',
        left: dayOffset * dayWidth,
        top: 0,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
        background: item.overdue
          ? 'color-mix(in srgb, var(--c-danger) 12%, transparent)'
          : `color-mix(in srgb, ${cfg.color} 10%, transparent)`,
        border: `1px solid ${item.overdue ? 'var(--c-danger)' : cfg.color}`,
        borderRadius: 'var(--r1)', whiteSpace: 'nowrap',
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.overdue ? 'var(--c-danger)' : cfg.color, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: item.overdue ? 'var(--c-danger)' : 'var(--tx1)', fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.label}
        </span>
        <span style={{ fontSize: 10, color: 'var(--tx3)' }}>{fmtDate(item.date, lang)}</span>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function SupervisionTimeline({ tasks, deliverables, controls, onOpenTask, lang }) {
  const t = useLang()
  const [window, setWindow] = useState(60)

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const horizon = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + window)
    return d.toISOString().slice(0, 10)
  }, [window])

  const items = useMemo(
    () => buildTimelineItems(tasks, deliverables, controls, horizon),
    [tasks, deliverables, controls, horizon],
  )

  // Timeline range: from 7 days ago to horizon
  const minDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  }, [])

  const totalDays = Math.ceil((new Date(horizon) - new Date(minDate)) / 86400000) + 1
  const dayWidth = 18

  // Group items into swim lanes (stacked rows to avoid overlap)
  const lanes = useMemo(() => {
    const result = []
    for (const item of items) {
      const dayPos = Math.max(0, (new Date(item.date) - new Date(minDate)) / 86400000)
      let placed = false
      for (const lane of result) {
        const last = lane[lane.length - 1]
        const lastPos = Math.max(0, (new Date(last.date) - new Date(minDate)) / 86400000)
        if (dayPos - lastPos >= 12) { // enough gap
          lane.push(item)
          placed = true
          break
        }
      }
      if (!placed) result.push([item])
    }
    return result
  }, [items, minDate])

  const handleClick = (item) => {
    if (item.type === 'milestone') onOpenTask?.(item.id)
  }

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

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
        {Object.entries(TYPE_CFG).map(([key, cfg]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color }} />
            <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{cfg.label}</span>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--tx3)', padding: '16px 0' }}>{t.supNoItems}</div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--bd3)', borderRadius: 'var(--r2)', background: 'var(--bg2)', padding: '12px 8px' }}>
          <div style={{ position: 'relative', width: totalDays * dayWidth, minHeight: lanes.length * 32 + 24 }}>
            {/* Today marker */}
            {(() => {
              const todayOffset = Math.max(0, (new Date(today) - new Date(minDate)) / 86400000)
              return (
                <div style={{
                  position: 'absolute', left: todayOffset * dayWidth, top: 0, bottom: 0,
                  width: 1, background: 'var(--c-danger)', opacity: 0.5, zIndex: 1,
                }}>
                  <span style={{ position: 'absolute', top: -16, left: -12, fontSize: 9, color: 'var(--c-danger)', fontWeight: 600 }}>TODAY</span>
                </div>
              )
            })()}

            {/* Items per lane */}
            {lanes.map((lane, li) => (
              <div key={li} style={{ position: 'relative', height: 28, marginBottom: 4 }}>
                {lane.map(item => (
                  <TimelineItem key={item.id} item={item} minDate={minDate} dayWidth={dayWidth}
                    onClick={handleClick} lang={lang} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
