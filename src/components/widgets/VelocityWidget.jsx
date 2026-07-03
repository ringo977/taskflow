import { WidgetErrorBoundary } from '@/components/ErrorBoundary'
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { CARD_STYLE } from './shared'
import { SectionTitle, ChartTooltip } from './primitives'

// ── Widget: VelocityWidget ────────────────────────────────────
export const VelocityWidget = ({ data, t }) => (
  <WidgetErrorBoundary name="Velocity">
    <div style={CARD_STYLE}>
      <SectionTitle>{t.chartVelocity}</SectionTitle>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barSize={20}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--bd3)" vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} allowDecimals={false} width={20} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey={t.chartCompleted} fill="var(--c-success)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </WidgetErrorBoundary>
)
