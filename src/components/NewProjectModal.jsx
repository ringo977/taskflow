import { useState } from 'react'
import { useLang } from '@/i18n'
import { PROJECT_COLORS } from '@/data/initialData'

export default function NewProjectModal({ templates, portfolios, onAdd, onClose, lang }) {
  const t = useLang()
  const [nm, setNm] = useState('')
  const [ci, setCi] = useState(0)
  const [selPort, setSelPort] = useState('')
  const [selTpl, setSelTpl] = useState('')
  return (
    <div onClick={onClose} role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div onClick={e => e.stopPropagation()} className="modal-content" style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', padding: 22, width: 420, border: '1px solid var(--bd2)', boxShadow: 'var(--shadow-lg)', maxHeight: '80vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{t.newProject ?? 'New project'}</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--tx3)', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.projectName ?? 'Name'}</label>
          <input value={nm} onChange={e => setNm(e.target.value)} placeholder={(t.projectName ?? 'Name') + '…'} style={{ width: '100%' }} autoFocus onKeyDown={e => { if (e.key === 'Escape') onClose(); if (e.key === 'Enter' && nm.trim()) { onAdd(nm.trim(), PROJECT_COLORS[ci], selPort, selTpl || undefined) } }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.projectColor ?? 'Color'}</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PROJECT_COLORS.map((c, i) => <div key={c} onClick={() => setCi(i)} style={{ width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer', outline: ci === i ? `2.5px solid ${c}` : 'none', outlineOffset: 2 }} />)}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.portfolio ?? 'Portfolio'}</label>
          <select value={selPort} onChange={e => setSelPort(e.target.value)} style={{ width: '100%', fontSize: 12 }}>
            <option value="">{t.none ?? 'None'}</option>
            {portfolios.map(po => <option key={po.id} value={po.id}>{po.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.template ?? 'Template'}</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
            <div onClick={() => setSelTpl('')} className="row-interactive"
              style={{ padding: '8px 12px', borderRadius: 'var(--r1)', border: `1.5px solid ${!selTpl ? 'var(--c-brand)' : 'var(--bd3)'}`, cursor: 'pointer', fontSize: 12, background: !selTpl ? 'color-mix(in srgb, var(--c-brand) 8%, transparent)' : 'transparent' }}>
              <div style={{ fontWeight: 500 }}>📄 {t.blank ?? 'Blank'}</div>
              <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>To Do / In Progress / Done</div>
            </div>
            {templates.map(tpl => (
              <div key={tpl.id} onClick={() => setSelTpl(tpl.id)} className="row-interactive"
                style={{ padding: '8px 12px', borderRadius: 'var(--r1)', border: `1.5px solid ${selTpl === tpl.id ? 'var(--c-brand)' : 'var(--bd3)'}`, cursor: 'pointer', fontSize: 12, background: selTpl === tpl.id ? 'color-mix(in srgb, var(--c-brand) 8%, transparent)' : 'transparent' }}>
                <div style={{ fontWeight: 500 }}>{tpl.icon} {tpl.name}</div>
                <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.sections.join(' → ')}</div>
                {(tpl.customFields?.length || tpl.rules?.length || tpl.forms?.length || tpl.goals?.length) ? (
                  <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 3, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {tpl.customFields?.length > 0 && <span>{tpl.customFields.length} {t.tplFields ?? 'fields'}</span>}
                    {tpl.rules?.length > 0 && <span>{tpl.rules.length} {t.tplRules ?? 'rules'}</span>}
                    {tpl.forms?.length > 0 && <span>{tpl.forms.length} {t.tplForms ?? 'forms'}</span>}
                    {tpl.goals?.length > 0 && <span>{tpl.goals.length} {t.tplGoals ?? 'goals'}</span>}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ fontSize: 12, padding: '6px 14px' }}>{t.cancel ?? 'Cancel'}</button>
          <button onClick={() => { if (nm.trim()) onAdd(nm.trim(), PROJECT_COLORS[ci], selPort, selTpl || undefined) }}
            disabled={!nm.trim()}
            style={{ fontSize: 12, padding: '6px 14px', background: nm.trim() ? 'var(--tx1)' : 'var(--bd2)', color: 'var(--bg1)', border: 'none', borderRadius: 'var(--r1)', cursor: nm.trim() ? 'pointer' : 'default', fontWeight: 500 }}>
            {t.create ?? 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
