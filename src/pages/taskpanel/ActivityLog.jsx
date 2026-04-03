import { useState } from 'react'

const FIELD_LABELS = {
  title: 'title', desc: 'description', who: 'assignee', pri: 'priority',
  due: 'due date', startDate: 'start date', sec: 'section', tags: 'tags',
  done: 'status', recurrence: 'recurrence',
}

export default function ActivityLog({ activity, sectionTitle, t }) {
  const [expanded, setExpanded] = useState(false)
  if (!activity.length) return null
  const shown = expanded ? activity : activity.slice(-3)
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ ...sectionTitle, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        {t.activityLog ?? 'Activity'}
        <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 400 }}>({activity.length})</span>
      </div>
      {activity.length > 3 && (
        <button onClick={() => setExpanded(!expanded)} style={{ fontSize: 11, color: 'var(--c-brand)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 6, padding: 0 }}>
          {expanded ? (t.showLess ?? 'Show less') : (typeof t.showAll === 'function' ? t.showAll(activity.length) : `Show all (${activity.length})`)}
        </button>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {shown.map((entry, i) => {
          const label = FIELD_LABELS[entry.field] ?? entry.field
          const fmtVal = v => v === true ? '✓' : v === false ? '✗' : v || '—'
          const d = new Date(entry.ts)
          const time = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          return (
            <div key={i} style={{ fontSize: 12, color: 'var(--tx3)', padding: '3px 0', borderBottom: '1px solid var(--bd3)' }}>
              <span style={{ color: 'var(--tx2)', fontWeight: 500 }}>{entry.who}</span>
              {' '}{t.changed ?? 'changed'} <strong>{label}</strong>
              {' '}{fmtVal(entry.from)} → {fmtVal(entry.to)}
              <span style={{ float: 'right', fontSize: 11 }}>{time}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
