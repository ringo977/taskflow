// ── Shared components ────────────────────────────────────────────
export const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)', marginBottom: 12 }}>{children}</div>
)

export const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg1)', border: '1px solid var(--bd2)', borderRadius: 'var(--r1)', padding: '7px 12px', fontSize: 12, color: 'var(--tx1)', boxShadow: 'var(--shadow-sm)' }}>
      {label && <div style={{ fontWeight: 500, marginBottom: 4 }}>{label}</div>}
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill ?? p.color }} />
          <span style={{ color: 'var(--tx2)' }}>{p.name}: </span>
          <span style={{ fontWeight: 500 }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}
