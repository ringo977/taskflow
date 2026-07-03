import { WidgetErrorBoundary } from '@/components/ErrorBoundary'
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { CARD_STYLE } from './shared'
import { SectionTitle, ChartTooltip } from './primitives'

// ── Widget: BurndownWidget ────────────────────────────────────
export const BurndownWidget = ({ data, projects, burndownPid, setBurndownPid, t }) => (
  <WidgetErrorBoundary name="Burndown">
    <div style={CARD_STYLE}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <SectionTitle>{t.chartBurndown}</SectionTitle>
        <select value={burndownPid} onChange={e => setBurndownPid(e.target.value)}
          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx2)', cursor: 'pointer' }}>
          <option value="__all__">{t.chartAllProjects}</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--bd3)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} interval={5} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
          <Tooltip content={<ChartTooltip />} />
          <Line type="monotone" dataKey={t.chartIdeal} stroke="var(--tx3)" strokeWidth={1} strokeDasharray="5 3" dot={false} />
          <Line type="monotone" dataKey={t.chartRemaining} stroke="var(--c-danger)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--tx3)' }}>
          <div style={{ width: 16, height: 2, background: 'var(--c-danger)' }} />
          {t.chartRemaining}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--tx3)' }}>
          <div style={{ width: 16, height: 0, borderTop: '2px dashed var(--tx3)' }} />
          {t.chartIdeal}
        </div>
      </div>
    </div>
  </WidgetErrorBoundary>
)
