import { useLang } from '@/i18n'
import { isOverdue } from '@/utils/filters'
import { fmtDate } from '@/utils/format'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import Avatar from '@/components/Avatar'
import Badge from '@/components/Badge'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  AreaChart, Area, CartesianGrid,
} from 'recharts'

// ── Custom tooltip ────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
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

export default function HomeDashboard({ tasks, projects, currentUser, onOpen, onNav, lang }) {
  const t = useLang()
  const USERS = useOrgUsers()
  const now    = new Date()
  const ts     = now.toISOString().slice(0, 10)
  const weEnd  = new Date(now); weEnd.setDate(now.getDate() + 7)
  const weStr  = weEnd.toISOString().slice(0, 10)
  const greeting = now.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const mine     = tasks.filter(task => task.who === currentUser.name && !task.done)
  const overdue  = mine.filter(task => isOverdue(task.due))
  const dueToday = mine.filter(task => task.due === ts)
  const dueWeek  = mine.filter(task => task.due && task.due > ts && task.due <= weStr)

  // ── Chart data ────────────────────────────────────────────────

  // 1. Bar: tasks per person (open vs done)
  const barData = USERS.map(u => ({
    name: u.name.split(' ')[0],
    open: tasks.filter(task => task.who === u.name && !task.done).length,
    done: tasks.filter(task => task.who === u.name && task.done).length,
    color: u.color,
  })).filter(d => d.open + d.done > 0)

  // 2. Donut: tasks by priority
  const priColors = { high: 'var(--c-danger)', medium: 'var(--c-warning)', low: 'var(--c-lime)' }
  const priLabels = { high: t.high, medium: t.medium, low: t.low }
  const donutData = ['high', 'medium', 'low'].map(p => ({
    name: priLabels[p],
    value: tasks.filter(task => task.pri === p && !task.done).length,
    color: priColors[p],
  })).filter(d => d.value > 0)

  // 3. Area: completions over last 14 days (approximate: done tasks whose due date falls in range)
  const areaData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - (13 - i))
    const ds = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { day: 'numeric', month: 'short' })
    const completed = tasks.filter(task => task.done && task.due === ds).length
    const created = tasks.filter(task => {
      if (!task.id) return false
      const idTs = parseInt(task.id.replace(/^t/, ''), 10)
      if (isNaN(idTs)) return false
      return new Date(idTs).toISOString().slice(0, 10) === ds
    }).length
    return { date: label, [t.chartCompleted]: completed, [t.chartCreated]: created }
  })

  // 4. Project progress table
  const projStats = projects.map(p => {
    const pt   = tasks.filter(task => task.pid === p.id)
    const done = pt.filter(task => task.done).length
    return { ...p, total: pt.length, done, pct: pt.length ? Math.round(done / pt.length * 100) : 0 }
  })

  const StatCard = ({ label, value, color, onClick }) => (
    <div onClick={onClick} className="row-interactive"
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, borderRadius: 'var(--r2)', border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, padding: '18px 18px', cursor: 'pointer' }}>
      <div style={{ fontSize: 12, color, marginBottom: 7, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 500, color, lineHeight: 1 }}>{value}</div>
    </div>
  )

  const SectionTitle = ({ children }) => (
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)', marginBottom: 12 }}>{children}</div>
  )

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
      {/* Greeting */}
      <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--tx1)', marginBottom: 3 }}>{(() => {
        const h = now.getHours()
        if (h < 12) return t.goodMorning
        if (h < 18) return t.goodAfternoon ?? t.goodMorning
        return t.goodEvening ?? t.goodMorning
      })()}, {currentUser.name} 👋</div>
      <div style={{ fontSize: 13, color: 'var(--tx3)', marginBottom: 22 }}>{greeting}</div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 22 }}>
        <StatCard label={t.overdue}        value={overdue.length}                   color="var(--c-danger)" onClick={() => onNav('mytasks')} />
        <StatCard label={t.dueToday}       value={dueToday.length}                  color="var(--c-warning)" onClick={() => onNav('mytasks')} />
        <StatCard label={t.thisWeek}       value={dueWeek.length}                   color="var(--c-brand)" onClick={() => onNav('mytasks')} />
        <StatCard label={t.completedTotal} value={tasks.filter(t => t.done).length} color="var(--c-success)" onClick={() => {}} />
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Bar: tasks per person */}
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px' }}>
          <SectionTitle>{t.chartTasksPerPerson}</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} barSize={14} barGap={3}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} allowDecimals={false} width={20} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg2)' }} />
              <Bar dataKey="open" name={t.chartOpenLabel} radius={[3,3,0,0]}>
                {barData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.8} />)}
              </Bar>
              <Bar dataKey="done" name={t.chartDoneLabel} radius={[3,3,0,0]}>
                {barData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.3} />)}
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

        {/* Donut: priority breakdown */}
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px' }}>
          <SectionTitle>{t.chartByPriority}</SectionTitle>
          {donutData.length === 0
            ? <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--tx3)' }}>🎉 {t.noOpenTasks}</div>
            : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={donutData} cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75}
                    paddingAngle={3} dataKey="value"
                  >
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
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
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Area: activity last 14 days */}
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px' }}>
          <SectionTitle>{t.chartActivity}</SectionTitle>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={areaData}>
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

        {/* Project progress */}
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <SectionTitle>{t.projectProgress}</SectionTitle>
            <button onClick={() => onNav('projects')} style={{ fontSize: 12, color: 'var(--tx-info)', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>{t.seeAll}</button>
          </div>
          {projStats.map(p => (
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
      </div>

      {/* Bottom row: my tasks + team */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* My open tasks */}
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <SectionTitle>{t.myOpenTasks}</SectionTitle>
            <button onClick={() => onNav('mytasks')} style={{ fontSize: 12, color: 'var(--tx-info)', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>{t.seeAll}</button>
          </div>
          {mine.length === 0 && <div style={{ fontSize: 13, color: 'var(--tx3)' }}>🎉 {t.noOpenTasks}</div>}
          {mine.slice(0, 6).map(task => {
            const p  = projects.find(x => x.id === task.pid)
            const ov = isOverdue(task.due)
            return (
              <div key={task.id} onClick={() => onOpen(task.id)} className="row-interactive"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--bd3)', cursor: 'pointer' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: p?.color ?? '#888', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                <Badge pri={task.pri} />
                {task.due && <span style={{ fontSize: 12, color: ov ? 'var(--c-danger)' : 'var(--tx3)', flexShrink: 0 }}>{fmtDate(task.due, lang)}</span>}
              </div>
            )
          })}
        </div>

        {/* Team overview */}
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px' }}>
          <SectionTitle>{t.team}</SectionTitle>
          {USERS.map(u => {
            const open    = tasks.filter(task => task.who === u.name && !task.done).length
            const od      = tasks.filter(task => task.who === u.name && !task.done && isOverdue(task.due)).length
            const pct     = tasks.filter(task => task.who === u.name).length
              ? Math.round(tasks.filter(task => task.who === u.name && task.done).length / tasks.filter(task => task.who === u.name).length * 100)
              : 0
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: '1px solid var(--bd3)' }}>
                <Avatar name={u.name} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx1)' }}>{u.name}</div>
                  <div style={{ height: 3, background: 'var(--bg2)', borderRadius: 'var(--r1)', marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: u.color, borderRadius: 'var(--r1)' }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--tx2)' }}>{open} {t.open}</div>
                  {od > 0 && <div style={{ fontSize: 12, color: 'var(--c-danger)' }}>{od} {t.expired}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
