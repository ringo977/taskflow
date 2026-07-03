import { WidgetErrorBoundary } from '@/components/ErrorBoundary'
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { CARD_STYLE } from './shared'
import { SectionTitle, ChartTooltip } from './primitives'

// ── Widget: ActivityChartWidget ────────────────────────────────────
export const ActivityChartWidget = ({ data, t }) => (
  <WidgetErrorBoundary name="Activity Chart">
    <div style={CARD_STYLE}>
      <SectionTitle>{t.chartActivity}</SectionTitle>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--c-success)" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="var(--c-success)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--bd3)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--tx3)' }} axisLine={false} tickLine={false}
            interval={2} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} allowDecimals={false} width={20} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey={t.chartCompleted} name={t.chartCompleted}
            stroke="var(--c-success)" strokeWidth={2} fill="url(#gc)" />
          <Area type="monotone" dataKey={t.chartCreated} name={t.chartCreated}
            stroke="var(--c-brand)" strokeWidth={1.5} fill="none" strokeDasharray="4 3" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </WidgetErrorBoundary>
)
