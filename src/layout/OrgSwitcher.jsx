import { useState } from 'react'
import { useLang } from '@/i18n'

const PROJECT_COLORS = ['#378ADD','#D85A30','#1D9E75','#7F77DD','#EF9F27','#639922','#D4537E']

export default function OrgSwitcher({ orgs, activeOrgId, onSwitch, onAddOrg }) {
  const t = useLang()
  const [open, setOpen]     = useState(false)
  const [adding, setAdding] = useState(false)
  const [nm, setNm]         = useState('')
  const [short, setShort]   = useState('')
  const [ci, setCi]         = useState(0)
  const [desc, setDesc]     = useState('')

  const activeOrg = orgs.find(o => o.id === activeOrgId) ?? orgs[0]

  const doAdd = () => {
    if (!nm.trim() || !short.trim()) return
    const id = nm.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20) + '_' + Date.now()
    onAddOrg({ id, name: nm.trim(), shortName: short.trim().slice(0, 6), color: PROJECT_COLORS[ci], description: desc.trim() })
    setNm(''); setShort(''); setDesc(''); setAdding(false); setOpen(false)
  }

  return (
    <div style={{ position: 'relative', width: '100%', padding: '6px', marginBottom: 6 }}>
      <div
        onClick={() => setOpen(o => !o)}
        title={activeOrg?.name}
        className="hoverable"
        style={{
          width: '100%', height: 40, borderRadius: 'var(--r1)', cursor: 'pointer',
          background: (activeOrg?.color ?? '#888') + '22',
          border: `1px solid ${(activeOrg?.color ?? '#888') + '44'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: activeOrg?.color ?? '#888', letterSpacing: '0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 42 }}>
          {activeOrg?.shortName ?? '??'}
        </span>
        <svg width="9" height="9" viewBox="0 0 8 8" fill="none" style={{ flexShrink: 0 }}>
          <path d="M1 2.5L4 5.5L7 2.5" stroke={activeOrg?.color ?? '#888'} strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </div>

      {open && (
        <div style={{
          position: 'absolute', left: '100%', top: 0, marginLeft: 6,
          width: 260, background: 'var(--bg1)', borderRadius: 'var(--r2)',
          border: '1px solid var(--bd2)', boxShadow: 'var(--shadow-lg)',
          zIndex: 500, padding: 10,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px', marginBottom: 6 }}>
            {t.orgLabel ?? 'Organizations'}
          </div>

          {orgs.map(org => (
            <div
              key={org.id}
              onClick={() => { onSwitch(org.id); setOpen(false) }}
              className="row-interactive"
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                borderRadius: 'var(--r1)', cursor: 'pointer',
                background: org.id === activeOrgId ? 'var(--bg2)' : 'transparent',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 'var(--r1)',
                background: org.color + '22', border: `1.5px solid ${org.color + '55'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: org.color }}>{org.shortName.slice(0, 3)}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: org.id === activeOrgId ? 600 : 400, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.name}</div>
                {org.description && <div style={{ fontSize: 12, color: 'var(--tx3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.description}</div>}
              </div>
              {org.id === activeOrgId && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7l3.5 3.5L12 3" stroke="var(--c-success)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          ))}

          <div style={{ borderTop: '1px solid var(--bd3)', marginTop: 8, paddingTop: 8 }}>
            {!adding ? (
              <div
                onClick={() => setAdding(true)}
                className="row-interactive"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 'var(--r1)', cursor: 'pointer', fontSize: 13, color: 'var(--tx3)' }}
              >
                <span style={{ fontSize: 17, lineHeight: 1 }}>+</span> {t.newOrg ?? 'New organization'}
              </div>
            ) : (
              <div style={{ padding: '6px 4px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                <input value={nm} onChange={e => setNm(e.target.value)} placeholder={t.orgNamePlaceholder ?? 'Organization name'} style={{ width: '100%', fontSize: 13 }} autoFocus />
                <input value={short} onChange={e => setShort(e.target.value)} placeholder={t.orgShortPlaceholder ?? 'Abbreviation (e.g. PoliMi)'} style={{ width: '100%', fontSize: 13 }} />
                <input value={desc} onChange={e => setDesc(e.target.value)} placeholder={t.briefDesc} style={{ width: '100%', fontSize: 13 }} onKeyDown={e => e.key === 'Enter' && doAdd()} />
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {PROJECT_COLORS.map((c, i) => (
                    <div key={c} onClick={() => setCi(i)} style={{ width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer', outline: ci === i ? `2px solid ${c}` : 'none', outlineOffset: 2 }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={doAdd} style={{ fontSize: 12, padding: '5px 12px', flex: 1 }}>{t.create}</button>
                  <button onClick={() => { setAdding(false); setNm(''); setShort('') }} style={{ fontSize: 12, padding: '5px 12px' }}>✕</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 499 }} />}
    </div>
  )
}
