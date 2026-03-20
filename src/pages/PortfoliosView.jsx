import { useState } from 'react'
import { useLang } from '@/i18n'
import { PROJECT_COLORS } from '@/data/initialData'
import { isOverdue } from '@/utils/filters'
import AvatarGroup from '@/components/AvatarGroup'

export default function PortfoliosView({ portfolios, projects, tasks, onSelProj, onAddPortfolio }) {
  const t = useLang()
  const [adding, setAdding] = useState(false)
  const [nm, setNm]   = useState('')
  const [desc, setDesc] = useState('')
  const [ci, setCi]   = useState(0)

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--tx1)', marginBottom: 2 }}>{t.portfolios}</div>
          <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{t.portfolios_count(portfolios.length)}</div>
        </div>
        <button onClick={() => setAdding(true)} style={{ padding: '7px 14px', background: 'var(--tx1)', color: 'var(--bg1)', border: 'none', borderRadius: 'var(--r1)', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
          {t.newPortfolio}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {portfolios.map(po => {
          const pps   = projects.filter(p => p.portfolio === po.id)
          const allT  = tasks.filter(task => pps.find(p => p.id === task.pid))
          const doneT = allT.filter(task => task.done).length
          const pct   = allT.length ? Math.round(doneT / allT.length * 100) : 0
          const od    = allT.filter(task => !task.done && isOverdue(task.due)).length

          return (
            <div key={po.id} style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', boxShadow: 'var(--shadow-sm)', padding: 16 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 'var(--r1)', background: po.color }} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--tx1)' }}>{po.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--tx3)', paddingLeft: 17 }}>{po.desc}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: po.color, background: po.color + '18', padding: '2px 8px', borderRadius: 'var(--r1)' }}>
                  {pps.length} {t.projects}
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{t.progress}</span>
                  <span style={{ fontSize: 12, color: 'var(--tx2)' }}>{doneT}/{allT.length} · {pct}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg2)', borderRadius: 'var(--r1)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: po.color, borderRadius: 'var(--r1)', transition: 'width 0.4s' }} />
                </div>
              </div>

              {od > 0 && <div style={{ fontSize: 12, color: 'var(--c-danger)', marginBottom: 10 }}>{t.overdueCount(od)}</div>}

              {/* Project list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {pps.map(p => {
                  const pt   = tasks.filter(task => task.pid === p.id)
                  const ppct = pt.length ? Math.round(pt.filter(task => task.done).length / pt.length * 100) : 0
                  return (
                    <div key={p.id} onClick={() => onSelProj(p.id)}
                      className="row-interactive"
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: 14, borderRadius: 'var(--r1)', cursor: 'pointer', border: '1px solid var(--bd3)' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--tx1)', flex: 1 }}>{p.name}</span>
                      <AvatarGroup names={p.members ?? []} size={32} />
                      <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{ppct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add portfolio modal */}
      {adding && (
        <div onClick={() => setAdding(false)} role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', padding: 22, width: 360, border: '1px solid var(--bd2)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{t.newPortfolioTitle}</span>
              <button onClick={() => setAdding(false)} style={{ background: 'transparent', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--tx3)', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.portfolioName ?? 'Portfolio name'}</label>
              <input value={nm} onChange={e => setNm(e.target.value)} placeholder={(t.portfolioName ?? 'Portfolio name') + '…'} style={{ width: '100%' }} autoFocus />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.description}</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} placeholder={t.briefDesc} style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.color ?? t.projectColor}</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PROJECT_COLORS.map((c, i) => <div key={c} onClick={() => setCi(i)} style={{ width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer', outline: ci === i ? `2.5px solid ${c}` : 'none', outlineOffset: 2 }} />)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setAdding(false)} style={{ fontSize: 12, padding: '5px 14px' }}>{t.cancel}</button>
              <button onClick={() => { if (nm.trim()) { onAddPortfolio(nm.trim(), PROJECT_COLORS[ci], desc.trim()); setNm(''); setDesc(''); setAdding(false) } }}
                style={{ fontSize: 12, padding: '5px 14px', background: 'var(--tx1)', color: 'var(--bg1)', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer', fontWeight: 500 }}>
                {t.create}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
