import Badge from '@/components/Badge'
import { WidgetErrorBoundary } from '@/components/ErrorBoundary'
import { CARD_STYLE } from './shared'
import { SectionTitle } from './primitives'

// ── Widget: DeadlinesWidget ────────────────────────────────────
export const DeadlinesWidget = ({ deadlines, projects, ts, t, onOpen }) => (
  <WidgetErrorBoundary name="Deadlines">
    <div style={CARD_STYLE}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <SectionTitle>{t.upcomingDeadlines ?? 'Upcoming deadlines'}</SectionTitle>
        <span style={{ fontSize: 11, color: 'var(--tx3)' }}>7 {t.days ?? 'days'}</span>
      </div>
      {deadlines.length === 0
        ? <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--tx3)' }}>🎉 {t.noUpcoming ?? 'No deadlines this week'}</div>
        : (
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {deadlines.map(task => {
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
