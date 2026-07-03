import { WidgetErrorBoundary } from '@/components/ErrorBoundary'
import { CARD_STYLE } from './shared'
import { SectionTitle } from './primitives'

// ── Widget: SectionCompletionWidget ────────────────────────────────────
export const SectionCompletionWidget = ({ data, t }) => (
  <WidgetErrorBoundary name="Section Completion">
    <div style={CARD_STYLE}>
      <SectionTitle>{t.chartSectionCompletion ?? 'Completion by section'}</SectionTitle>
      {data.length === 0
        ? <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--tx3)' }}>—</div>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.map(({ project: p, sections: secCounts }) => (
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
