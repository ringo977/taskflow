import { WidgetErrorBoundary } from '@/components/ErrorBoundary'
import { CARD_STYLE } from './shared'
import { SectionTitle } from './primitives'

// ── Widget: ActivityWidget ────────────────────────────────────
export const ActivityWidget = ({ activities, projects, t, onOpen, formatTimeAgo }) => (
  <WidgetErrorBoundary name="Activity">
    <div style={CARD_STYLE}>
      <SectionTitle>{t.recentActivityFeed ?? 'Recent activity'}</SectionTitle>
      {activities.length === 0
        ? <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--tx3)' }}>{t.noRecentActivity ?? 'No recent activity'}</div>
        : (
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {activities.map((act, i) => {
              const p = projects.find(x => x.id === act.task.pid)
              const ago = formatTimeAgo(act.time, t)
              const typeColor = act.type === 'completed' ? 'var(--c-success)'
                : act.type === 'created' ? 'var(--c-brand)'
                : act.type === 'assigned' ? 'var(--c-warning, #e9a820)'
                : act.type === 'moved' ? 'var(--c-info, #4a90d9)'
                : 'var(--tx3)'
              const typeIcon = act.type === 'completed' ? '✓'
                : act.type === 'created' ? '+'
                : act.type === 'assigned' ? '→'
                : act.type === 'moved' ? '↦'
                : '💬'
              const typeLabel = act.type === 'created' ? (t.actCreated ?? 'created')
                : act.type === 'completed' ? (t.actCompleted ?? 'completed')
                : act.type === 'assigned' ? (t.actAssigned ?? 'assigned')
                : act.type === 'moved' ? (t.actMoved ?? 'moved')
                : (t.actCommented ?? 'commented on')
              const who = act.who ?? act.task.who ?? ''
              return (
                <div key={`${act.task.id}-${act.type}-${i}`} onClick={() => onOpen(act.task.id)}
                  className="row-interactive"
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0', borderBottom: '1px solid var(--bd3)', cursor: 'pointer' }}>
                  <span style={{ fontSize: 11, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: `color-mix(in srgb, ${typeColor} 15%, transparent)`, color: typeColor, flexShrink: 0 }}>{typeIcon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 500 }}>{(Array.isArray(who) ? who[0] : who)?.split(' ')[0] ?? ''}</span>{' '}
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
