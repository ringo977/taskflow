import { WidgetErrorBoundary } from '@/components/ErrorBoundary'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { CARD_STYLE } from './shared'
import { SectionTitle, ChartTooltip } from './primitives'

// ── Widget: OverdueWidget ────────────────────────────────────
export const OverdueWidget = ({ data, t }) => (
  <WidgetErrorBoundary name="Overdue by Project">
    <div style={CARD_STYLE}>
      <SectionTitle>{t.chartOverdueByProject}</SectionTitle>
      {data.length === 0
        ? <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--tx3)' }}>🎉 {t.noOpenTasks}</div>
        : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data} layout="vertical" barSize={14}>
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--tx2)' }} axisLine={false} tickLine={false} width={90} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="overdue" name={t.overdue} radius={[0, 4, 4, 0]}>
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      }
    </div>
  </WidgetErrorBoundary>
)
