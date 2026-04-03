import Badge from '@/components/Badge'
import { WidgetErrorBoundary } from '@/components/ErrorBoundary'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  AreaChart, Area, CartesianGrid,
  LineChart, Line,
} from 'recharts'

// ── Shared styles and components ────────────────────────────────
const CARD_STYLE = {
  background: 'var(--bg1)',
  borderRadius: 'var(--r2)',
  border: '1px solid var(--bd3)',
  padding: '16px 18px',
}

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

// ── Widget: DeadlinesWidget ────────────────────────────────────
export const DeadlinesWidget = ({ deadlines, projects, ts, t, onOpen }) => (
  <WidgetErrorBoundary name="Deadlines">
    <div style={CARD_STYLE}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <SectionTitle>{t.upcomingDeadlines ?? 'Upcoming deadlines'}</SectionTitle>
        <span style={{ fontSize: 11, color: 'var(--tx3)' }}>7 {t.days ?? 'days'}</span>
      </div>
      {deadlines.length === 0
        ? <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--tx3)' }}>🎉 {t.noUpcoming ?? 'No deadlines this week'}</div>
        : (
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {deadlines.map(task => {
              const p = projects.find(x => x.id === task.pid)
              const daysUntil = Math.round((new Date(task.due + 'T00:00:00') - new Date(ts + 'T00:00:00')) / 86400000)
              const urgencyColor = daysUntil === 0 ? 'var(--c-danger)' : daysUntil === 1 ? 'var(--c-warning)' : 'var(--tx3)'
              const urgencyLabel = daysUntil === 0 ? t.today : daysUntil === 1 ? (t.dueTomorrow ?? 'Tomorrow') : (t.daysLeft ?? (n => `${n}d left`))(daysUntil)
              return (
                <div key={task.id} onClick={() => onOpen(task.id)} className="row-interactive"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--bd3)', cursor: 'pointer' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: p?.color ?? '#888', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                  <Badge pri={task.pri} />
                  <span style={{ fontSize: 11, color: urgencyColor, flexShrink: 0, fontWeight: 500, minWidth: 50, textAlign: 'right' }}>{urgencyLabel}</span>
                </div>
              )
            })}
          </div>
        )
      }
    </div>
  </WidgetErrorBoundary>
)

// ── Widget: ActivityWidget ────────────────────────────────────
export const ActivityWidget = ({ activities, projects, t, onOpen, formatTimeAgo }) => (
  <WidgetErrorBoundary name="Activity">
    <div style={CARD_STYLE}>
      <SectionTitle>{t.recentActivityFeed ?? 'Recent activity'}</SectionTitle>
      {activities.length === 0
        ? <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--tx3)' }}>{t.noRecentActivity ?? 'No recent activity'}</div>
        : (
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {activities.map((act, i) => {
              const p = projects.find(x => x.id === act.task.pid)
              const ago = formatTimeAgo(act.time, t)
              const typeColor = act.type === 'completed' ? 'var(--c-success)'
                : act.type === 'created' ? 'var(--c-brand)'
                : act.type === 'assigned' ? 'var(--c-warning, #e9a820)'
                : act.type === 'moved' ? 'var(--c-info, #4a90d9)'
                : 'var(--tx3)'
              const typeIcon = act.type === 'completed' ? '✓'
                : act.type === 'created' ? '+'
                : act.type === 'assigned' ? '→'
                : act.type === 'moved' ? '↦'
                : '💬'
              const typeLabel = act.type === 'created' ? (t.actCreated ?? 'created')
                : act.type === 'completed' ? (t.actCompleted ?? 'completed')
                : act.type === 'assigned' ? (t.actAssigned ?? 'assigned')
                : act.type === 'moved' ? (t.actMoved ?? 'moved')
                : (t.actCommented ?? 'commented on')
              const who = act.who ?? act.task.who ?? ''
              return (
                <div key={`${act.task.id}-${act.type}-${i}`} onClick={() => onOpen(act.task.id)}
                  className="row-interactive"
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0', borderBottom: '1px solid var(--bd3)', cursor: 'pointer' }}>
                  <span style={{ fontSize: 11, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: `color-mix(in srgb, ${typeColor} 15%, transparent)`, color: typeColor, flexShrink: 0 }}>{typeIcon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 500 }}>{(Array.isArray(who) ? who[0] : who)?.split(' ')[0] ?? ''}</span>{' '}
                      <span style={{ color: 'var(--tx3)' }}>{typeLabel}</span>{' '}
                      {act.task.title}
                    </div>
                  </div>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: p?.color ?? '#888', flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: 'var(--tx3)', flexShrink: 0 }}>{ago}</span>
                </div>
              )
            })}
          </div>
        )
      }
    </div>
  </WidgetErrorBoundary>
)

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

// ── Widget: TasksPerPersonWidget ────────────────────────────────────
export const TasksPerPersonWidget = ({ data, t }) => (
  <WidgetErrorBoundary name="Tasks per person">
    <div style={CARD_STYLE}>
      <SectionTitle>{t.chartTasksPerPerson}</SectionTitle>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barSize={14} barGap={3}>
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} allowDecimals={false} width={20} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg2)' }} />
          <Bar dataKey="open" name={t.chartOpenLabel} radius={[3,3,0,0]}>
            {data.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.8} />)}
          </Bar>
          <Bar dataKey="done" name={t.chartDoneLabel} radius={[3,3,0,0]}>
            {data.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.3} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--tx3)' }}>
          <div style={{ width: 10, height: 10, borderRadius: 'var(--r1)', background: 'var(--c-brand)', opacity: 0.8 }} />
          {t.chartOpenLabel}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--tx3)' }}>
          <div style={{ width: 10, height: 10, borderRadius: 'var(--r1)', background: 'var(--c-brand)', opacity: 0.3 }} />
          {t.chartDoneLabel}
        </div>
      </div>
    </div>
  </WidgetErrorBoundary>
)

// ── Widget: PriorityWidget ────────────────────────────────────
export const PriorityWidget = ({ data, t }) => (
  <WidgetErrorBoundary name="Priority">
    <div style={CARD_STYLE}>
      <SectionTitle>{t.chartByPriority}</SectionTitle>
      {data.length === 0
        ? <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--tx3)' }}>🎉 {t.noOpenTasks}</div>
        : (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={data} cx="50%" cy="50%"
                innerRadius="40%" outerRadius="60%"
                paddingAngle={3} dataKey="value"
              >
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend
                iconType="circle" iconSize={8}
                formatter={(v) => <span style={{ fontSize: 12, color: 'var(--tx2)' }}>{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )
      }
    </div>
  </WidgetErrorBoundary>
)

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

// ── Widget: SectionCompletionWidget ────────────────────────────────────
export const SectionCompletionWidget = ({ data, t }) => (
  <WidgetErrorBoundary name="Section Completion">
    <div style={CARD_STYLE}>
      <SectionTitle>{t.chartSectionCompletion ?? 'Completion by section'}</SectionTitle>
      {data.length === 0
        ? <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--tx3)' }}>—</div>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.map(({ project: p, sections: secCounts }) => (
              <div key={p.id}>
                <div style={{ fontSize: 12, color: 'var(--tx1)', fontWeight: 500, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color }} />
                  {p.name}
                </div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {Object.entries(secCounts).map(([sec, { total, done }]) => {
                    const pct = total ? Math.round(done / total * 100) : 0
                    return (
                      <div key={sec} style={{ flex: total, minWidth: 0 }} title={`${sec}: ${done}/${total} (${pct}%)`}>
                        <div style={{ height: 14, background: 'var(--bg2)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: p.color, opacity: 0.7, borderRadius: 2 }} />
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--tx3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sec}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  </WidgetErrorBoundary>
)
