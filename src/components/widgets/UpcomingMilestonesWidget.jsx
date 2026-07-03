import { WidgetErrorBoundary } from '@/components/ErrorBoundary'
import { CARD_STYLE } from './shared'
import { SectionTitle } from './primitives'

// ── Widget: Upcoming milestones (cross-project) ─────────────
export const UpcomingMilestonesWidget = ({ data, t }) => (
  <WidgetErrorBoundary name="Upcoming milestones">
    <div style={CARD_STYLE}>
      <SectionTitle>{t.upcomingMilestones ?? 'Upcoming milestones'}</SectionTitle>
      {data.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--tx3)', padding: '12px 0' }}>{t.noMilestones ?? 'No milestones'}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {data.map(ms => (
            <div key={ms.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--bd3)' }}>
              <div style={{ width: 4, height: 32, borderRadius: 2, background: ms.projectColor, flexShrink: 0 }} />
              <span style={{ fontSize: 14, flexShrink: 0 }}>◆</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ms.code} {ms.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>
                  {ms.projectName} · {ms.dueDate ?? '—'} · {ms.done}/{ms.total} {t.completedLower ?? 'completed'}
                </div>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${ms.pct >= 100 ? 'var(--c-success)' : ms.projectColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx2)' }}>{ms.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </WidgetErrorBoundary>
)
