import { WidgetErrorBoundary } from '@/components/ErrorBoundary'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { CARD_STYLE } from './shared'
import { SectionTitle, ChartTooltip } from './primitives'

// ── Widget: TasksPerMilestoneWidget ─────────────────────────────────────
export const TasksPerMilestoneWidget = ({ data, t }) => (
  <WidgetErrorBoundary name="Tasks per milestone">
    <div style={CARD_STYLE}>
      <SectionTitle>{t.chartTasksPerMs ?? 'Tasks per milestone'}</SectionTitle>
      {data.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--tx3)', padding: '12px 0' }}>{t.noMilestones ?? 'No milestones'}</div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} barSize={14} barGap={3}>
            <XAxis dataKey="code" tick={{ fontSize: 11, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} allowDecimals={false} width={20} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg2)' }} />
            <Bar dataKey="open" name={t.chartOpenLabel} fill="var(--c-success, #4CAF50)" fillOpacity={0.8} radius={[3,3,0,0]} />
            <Bar dataKey="done" name={t.chartDoneLabel} fill="var(--c-success, #4CAF50)" fillOpacity={0.3} radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
      {data.length > 0 && (
        <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--tx3)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 'var(--r1)', background: 'var(--c-success, #4CAF50)', opacity: 0.8 }} />
            {t.chartOpenLabel}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--tx3)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 'var(--r1)', background: 'var(--c-success, #4CAF50)', opacity: 0.3 }} />
            {t.chartDoneLabel}
          </div>
        </div>
      )}
    </div>
  </WidgetErrorBoundary>
)
