import { WidgetErrorBoundary } from '@/components/ErrorBoundary'
import { CARD_STYLE } from './shared'
import { SectionTitle } from './primitives'

// ── Widget: ProgressWidget ────────────────────────────────────
export const ProgressWidget = ({ data, t, onNav }) => (
  <WidgetErrorBoundary name="Project Progress">
    <div style={CARD_STYLE}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <SectionTitle>{t.projectProgress}</SectionTitle>
        <button onClick={() => onNav('projects')} style={{ fontSize: 12, color: 'var(--tx-info)', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>{t.seeAll}</button>
      </div>
      {data.map(p => (
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
