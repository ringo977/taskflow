import { useState } from 'react'
import { useLang } from '@/i18n'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import { PROJECT_COLORS } from '@/data/initialData'
import AvatarGroup from '@/components/AvatarGroup'
import StatusDot from '@/components/StatusDot'

export default function BrowseProjects({ projects, portfolios, tasks, onSelProj, onAddProj, templates = [] }) {
  const t = useLang()
  const memberNames = useOrgUsers().map(u => u.name)
  const [q, setQ]           = useState('')
  const [fOwner, setFOwner] = useState('all')
  const [fPort, setFPort]   = useState('all')
  const [fStatus, setFStatus] = useState('all')
  const [adding, setAdding] = useState(false)
  const [nm, setNm]         = useState('')
  const [ci, setCi]         = useState(0)
  const [selPort, setSelPort] = useState('')
  const [selTpl, setSelTpl]   = useState('')

  const filtered = projects.filter(p => {
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false
    if (fOwner !== 'all' && !p.members?.includes(fOwner)) return false
    if (fPort  !== 'all' && p.portfolio !== fPort)          return false
    if (fStatus !== 'all' && p.status   !== fStatus)        return false
    return true
  })

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx1)', marginBottom: 2 }}>{t.browseProjects}</div>
          <div style={{ fontSize: 14, color: 'var(--tx3)' }}>{t.projects_count(projects.length)}</div>
        </div>
        <button onClick={() => setAdding(true)} style={{ padding: '7px 14px', background: 'var(--tx1)', color: 'var(--bg1)', border: 'none', borderRadius: 'var(--r1)', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
          {t.createProject}
        </button>
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg2)', borderRadius: 'var(--r1)', padding: '5px 10px', border: '1px solid var(--bd3)', minWidth: 200, flex: 1 }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="var(--tx3)" strokeWidth="1.4"/><path d="M10.5 10.5L14 14" stroke="var(--tx3)" strokeWidth="1.4" strokeLinecap="round"/></svg>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={t.findProject} style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 12, flex: 1, outline: 'none' }} />
        </div>
        <select value={fOwner} onChange={e => setFOwner(e.target.value)} style={{ fontSize: 12, padding: '5px 8px' }}><option value="all">{t.owner}</option>{memberNames.map(m => <option key={m}>{m}</option>)}</select>
        <select value={fPort}  onChange={e => setFPort(e.target.value)}  style={{ fontSize: 12, padding: '5px 8px' }}><option value="all">{t.portfolio}</option>{portfolios.map(po => <option key={po.id} value={po.id}>{po.name}</option>)}</select>
        <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ fontSize: 12, padding: '5px 8px' }}><option value="all">{t.status}</option><option value="active">{t.active}</option><option value="on_hold">{t.onHold}</option><option value="archived">{t.archived}</option></select>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 140px 100px 80px', padding: '8px 16px', borderBottom: '1px solid var(--bd3)', background: 'var(--bg2)' }}>
          {[t.projectName, t.people, t.portfolio, t.status, t.tasks].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
          ))}
        </div>
        {filtered.length === 0 && <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--tx3)' }}>{t.noProjects}</div>}
        {filtered.map(p => {
          const po   = portfolios.find(x => x.id === p.portfolio)
          const pt   = tasks.filter(task => task.pid === p.id)
          const done = pt.filter(task => task.done).length
          const pct  = pt.length ? Math.round(done / pt.length * 100) : 0
          return (
            <div key={p.id} onClick={() => onSelProj(p.id)}
              className="row-interactive"
              style={{ display: 'grid', gridTemplateColumns: '1fr 130px 140px 100px 80px', padding: '16px', borderBottom: '1px solid var(--bd3)', cursor: 'pointer', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx1)' }}>{p.name}</span>
              </div>
              <AvatarGroup names={p.members ?? []} size={22} />
              <div>{po ? <span style={{ fontSize: 12, background: po.color + '18', color: po.color, padding: '2px 7px', borderRadius: 'var(--r1)', fontWeight: 500 }}>{po.name}</span> : <span style={{ fontSize: 12, color: 'var(--tx3)' }}>—</span>}</div>
              <StatusDot status={p.status ?? 'active'} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ height: 4, width: 40, background: 'var(--bg2)', borderRadius: 'var(--r1)', overflow: 'hidden', border: '1px solid var(--bd3)' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: p.color, borderRadius: 'var(--r1)' }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{pct}%</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add project modal */}
      {adding && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', padding: 22, width: 380, border: '1px solid var(--bd2)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 500, fontSize: 14 }}>{t.newProject}</span>
              <button onClick={() => setAdding(false)} style={{ background: 'transparent', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--tx3)', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.projectName}</label>
              <input value={nm} onChange={e => setNm(e.target.value)} placeholder={t.projectName + '…'} style={{ width: '100%' }} autoFocus onKeyDown={e => e.key === 'Escape' && setAdding(false)} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.projectColor}</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PROJECT_COLORS.map((c, i) => <div key={c} onClick={() => setCi(i)} style={{ width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer', outline: ci === i ? `2.5px solid ${c}` : 'none', outlineOffset: 2 }} />)}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.portfolio}</label>
              <select value={selPort} onChange={e => setSelPort(e.target.value)} style={{ width: '100%', fontSize: 12 }}>
                <option value="">{t.none}</option>
                {portfolios.map(po => <option key={po.id} value={po.id}>{po.name}</option>)}
              </select>
            </div>
            {templates.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.template ?? 'Template'}</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <div onClick={() => setSelTpl('')}
                    className="row-interactive"
                    style={{ padding: '6px 12px', borderRadius: 'var(--r1)', border: `1.5px solid ${selTpl === '' ? 'var(--c-brand)' : 'var(--bd3)'}`, cursor: 'pointer', fontSize: 12, background: selTpl === '' ? 'color-mix(in srgb, var(--c-brand) 8%, transparent)' : 'transparent' }}>
                    {t.blank ?? 'Blank'}
                  </div>
                  {templates.map(tpl => (
                    <div key={tpl.id} onClick={() => setSelTpl(tpl.id)}
                      className="row-interactive"
                      title={tpl.description}
                      style={{ padding: '6px 12px', borderRadius: 'var(--r1)', border: `1.5px solid ${selTpl === tpl.id ? 'var(--c-brand)' : 'var(--bd3)'}`, cursor: 'pointer', fontSize: 12, background: selTpl === tpl.id ? 'color-mix(in srgb, var(--c-brand) 8%, transparent)' : 'transparent' }}>
                      {tpl.icon} {tpl.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setAdding(false)} style={{ fontSize: 12, padding: '5px 14px' }}>{t.cancel}</button>
              <button onClick={() => { if (nm.trim()) { onAddProj(nm.trim(), PROJECT_COLORS[ci], selPort, selTpl || undefined); setNm(''); setSelTpl(''); setAdding(false) } }} style={{ fontSize: 12, padding: '5px 14px', background: 'var(--tx1)', color: 'var(--bg1)', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer', fontWeight: 500 }}>
                {t.create}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
