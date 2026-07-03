import { WidgetErrorBoundary } from '@/components/ErrorBoundary'
import { CARD_STYLE } from './shared'
import { SectionTitle } from './primitives'

// ── Widget: WorkloadWidget ────────────────────────────────────
export const WorkloadWidget = ({ data, threshold, t }) => (
  <WidgetErrorBoundary name="Workload">
    <div style={CARD_STYLE}>
      <SectionTitle>{t.chartWorkload ?? 'Workload'}</SectionTitle>
      {data.length === 0
        ? <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--tx3)' }}>—</div>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.map(d => {
              const levelColor = d.level === 'overloaded' ? 'var(--c-danger)' : d.level === 'balanced' ? 'var(--c-warning)' : 'var(--c-success)'
              const levelLabel = d.level === 'overloaded' ? (t.overloaded ?? 'Overloaded') : d.level === 'balanced' ? (t.balanced ?? 'Balanced') : (t.light ?? 'Light')
              const pct = Math.min(100, Math.round((d.open / threshold) * 100))
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
              {t.workloadCapacity ?? 'Capacity'}: {threshold} task / {t.team?.toLowerCase?.() ?? 'person'}
            </div>
          </div>
        )
      }
    </div>
  </WidgetErrorBoundary>
)
