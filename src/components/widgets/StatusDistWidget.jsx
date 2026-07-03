import { WidgetErrorBoundary } from '@/components/ErrorBoundary'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { CARD_STYLE } from './shared'
import { SectionTitle, ChartTooltip } from './primitives'

// ── Widget: StatusDistWidget ────────────────────────────────────
export const StatusDistWidget = ({ data, t }) => (
  <WidgetErrorBoundary name="Status Distribution">
    <div style={CARD_STYLE}>
      <SectionTitle>{t.chartByStatus}</SectionTitle>
      {data.length === 0
        ? <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--tx3)' }}>—</div>
        : (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius="40%" outerRadius="60%" paddingAngle={2} dataKey="value">
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: 'var(--tx2)' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        )
      }
    </div>
  </WidgetErrorBoundary>
)
