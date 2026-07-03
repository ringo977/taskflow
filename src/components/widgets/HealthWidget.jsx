import { WidgetErrorBoundary } from '@/components/ErrorBoundary'
import { SectionTitle } from './primitives'

// ── Widget: HealthWidget ────────────────────────────────────
export const HealthWidget = ({ data, t, onNav }) => {
  if (data.length === 0) return null

  return (
    <WidgetErrorBoundary name="Project health">
      <div style={{ marginBottom: 0 }}>
        <SectionTitle>{t.projectHealth ?? 'Project health'}</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {data.map(p => {
            const healthColor = p.health === 'critical' ? 'var(--c-danger)' : p.health === 'warning' ? 'var(--c-warning)' : 'var(--c-success)'
            const healthLabel = p.health === 'critical' ? (t.healthCritical ?? 'Off track')
              : p.health === 'warning' ? (t.healthWarning ?? 'At risk')
              : (t.healthGood ?? 'On track')
            return (
              <div key={p.id} onClick={() => onNav('projects', p.id)}
                className="row-interactive"
                style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '14px 16px', cursor: 'pointer', flex: '1 1 calc(33.33% - 8px)', minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 22, fontWeight: 500, color: 'var(--tx1)' }}>{p.pct}%</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: healthColor, padding: '2px 8px', borderRadius: 'var(--r1)', background: `color-mix(in srgb, ${healthColor} 12%, transparent)` }}>{healthLabel}</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg2)', borderRadius: 'var(--r1)', overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${p.pct}%`, background: p.color, borderRadius: 'var(--r1)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--tx3)' }}>
                  <span>{p.done}/{p.total} {t.tasksLabel ?? 'tasks'}</span>
                  {p.overdue > 0 && <span style={{ color: 'var(--c-danger)' }}>{p.overdue} {t.overdue?.toLowerCase?.() ?? 'overdue'}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </WidgetErrorBoundary>
  )
}
