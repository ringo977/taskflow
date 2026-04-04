import { useState, useEffect } from 'react'
import { useLang } from '@/i18n'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import { getProjectRole, canEditTasks } from '@/utils/permissions'
import { usePartners } from '@/hooks/usePartners'
import { useWorkpackages } from '@/hooks/useWorkpackages'

export default function AddModal({ secs, onAdd, onClose, aiLoad, onAICreate, currentUser, defaultDue, templates = [], project, myProjectRoles = {}, orgId }) {
  const t = useLang()
  const orgUsers = useOrgUsers()
  const memberNames = orgUsers.map(u => u.name)
  const projectRole = getProjectRole(currentUser, project, orgUsers, myProjectRoles)
  const canCreate = canEditTasks(projectRole)
  const [title,     setTitle]     = useState('')
  const [sec,       setSec]       = useState(secs[0] ?? '')
  const [who,       setWho]       = useState(() =>
    memberNames.includes(currentUser.name) ? currentUser.name : (memberNames[0] ?? ''))
  useEffect(() => {
    const names = orgUsers.map(u => u.name)
    setWho(w => {
      if (names.includes(w)) return w
      if (names.includes(currentUser.name)) return currentUser.name
      return names[0] ?? ''
    })
  }, [orgUsers, currentUser.name])
  const [startDate, setStartDate] = useState('')
  const [due,       setDue]       = useState(defaultDue ?? '')
  const [pri,       setPri]       = useState('medium')
  const [aiTxt,     setAiTxt]     = useState('')
  const [showAI,    setShowAI]    = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [partnerId, setPartnerId] = useState('')
  const [workpackageId, setWorkpackageId] = useState('')
  const { orgPartners } = usePartners(orgId, project?.id)
  const { workpackages } = useWorkpackages(orgId, project?.id)

  const applyTemplate = (template) => {
    setTitle(template.title || '')
    setPri(template.pri || 'medium')
    // Apply description if available
    // Note: No description state in AddModal, would need to be added if needed
    // Clear dates between templates
    setStartDate('')
    setDue('')
    // Note: Subtasks not supported in AddModal form
    setSelectedTemplate(template.id)
  }

  const commit = () => {
    if (title.trim()) { onAdd({ title, sec, who, startDate: startDate || null, due, pri, partnerId: partnerId || null, workpackageId: workpackageId || null }); onClose() }
  }

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={e => e.stopPropagation()} className="modal-content" style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', padding: 24, width: 420, border: '1px solid var(--bd2)', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: 17 }}>{t.newTask}</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--tx3)', fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>

        {templates.length > 0 && (
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 3, letterSpacing: '0.05em' }}>{t.fromTemplate}</label>
            <select value={selectedTemplate} onChange={e => {
              const tpl = templates.find(t => t.id === e.target.value)
              if (tpl) applyTemplate(tpl)
            }} style={{ width: '100%', fontSize: 13, padding: '8px 12px', boxSizing: 'border-box', marginBottom: 8 }}>
              <option value="">{t.selectTemplate}</option>
              {templates.map(tpl => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
            </select>
          </div>
        )}

        <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t.taskTitle}
          style={{ width: '100%', fontSize: 13, padding: '8px 12px', boxSizing: 'border-box' }} autoFocus
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onClose() }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            [t.sectionLabel,   <select value={sec} onChange={e => setSec(e.target.value)} style={{ width: '100%', fontSize: 13, padding: '8px 12px', boxSizing: 'border-box' }}>{secs.map(s => <option key={s}>{s}</option>)}</select>],
            [t.priorityLabel,  <select value={pri} onChange={e => setPri(e.target.value)} style={{ width: '100%', fontSize: 13, padding: '8px 12px', boxSizing: 'border-box' }}><option value="high">{t.high}</option><option value="medium">{t.medium}</option><option value="low">{t.low}</option></select>],
            [t.assignedLabel,  <select value={who} onChange={e => setWho(e.target.value)} style={{ width: '100%', fontSize: 13, padding: '8px 12px', boxSizing: 'border-box' }}>{memberNames.map(m => <option key={m}>{m}</option>)}</select>],
            [t.startDateLabel, <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', fontSize: 13, padding: '8px 12px', boxSizing: 'border-box' }} />],
            [t.dueDateLabel,   <input type="date" value={due} onChange={e => setDue(e.target.value)} style={{ width: '100%', fontSize: 13, padding: '8px 12px', boxSizing: 'border-box' }} />],
            [t.partnerTeam ?? 'Partner/Team', <select value={partnerId} onChange={e => setPartnerId(e.target.value)} style={{ width: '100%', fontSize: 13, padding: '8px 12px', boxSizing: 'border-box' }}><option value="">{t.noPartner ?? '—'}</option>{orgPartners.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>],
            ...(workpackages.length > 0 ? [[t.workpackage ?? 'Workpackage', <select value={workpackageId} onChange={e => setWorkpackageId(e.target.value)} style={{ width: '100%', fontSize: 13, padding: '8px 12px', boxSizing: 'border-box' }}><option value="">{t.noWp ?? '—'}</option>{workpackages.filter(w => w.isActive).map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}</select>]] : []),
          ].map(([lb, el]) => (
            <div key={lb}>
              <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 3, letterSpacing: '0.05em' }}>{lb}</label>
              {el}
            </div>
          ))}
        </div>

        {/* AI create */}
        <div style={{ borderTop: '1px solid var(--bd3)', paddingTop: 10 }}>
          <div onClick={() => setShowAI(!showAI)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--c-success)', fontSize: 13 }}>
            <span>✦</span>{t.createWithAI}
            <span style={{ marginLeft: 'auto', color: 'var(--tx3)', fontSize: 12 }}>{showAI ? '▲' : '▼'}</span>
          </div>
          {showAI && (
            <div style={{ marginTop: 8 }}>
              <input value={aiTxt} onChange={e => setAiTxt(e.target.value)} placeholder={t.describeTask}
                style={{ width: '100%', fontSize: 13, padding: '8px 12px', boxSizing: 'border-box', marginBottom: 6 }}
                onKeyDown={e => { if (e.key === 'Enter' && aiTxt.trim()) onAICreate(aiTxt, sec, who, startDate, due) }} />
              <button onClick={() => { if (aiTxt.trim()) onAICreate(aiTxt, sec, who, startDate, due) }} disabled={aiLoad}
                style={{ fontSize: 13, padding: '8px 12px', color: 'var(--c-success)', borderColor: 'var(--c-success)', borderRadius: 'var(--r1)', opacity: aiLoad ? 0.5 : 1 }}>
                {aiLoad ? t.generating : t.generate}
              </button>
            </div>
          )}
        </div>

        {!canCreate && (
          <div style={{ padding: '10px 12px', background: 'color-mix(in srgb, var(--c-warning) 12%, transparent)', borderRadius: 'var(--r1)', border: '1px solid var(--c-warning)', color: 'var(--c-warning)', fontSize: 12 }}>
            You don't have permission to create tasks in this project.
          </div>
        )}

        <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ fontSize: 13, padding: '5px 14px' }}>{t.cancel}</button>
          <button onClick={commit} disabled={!canCreate} style={{ fontSize: 13, padding: '8px 18px', background: canCreate ? 'var(--tx1)' : 'var(--tx3)', color: 'var(--bg1)', border: 'none', borderRadius: 'var(--r1)', cursor: canCreate ? 'pointer' : 'default', fontWeight: 600, opacity: canCreate ? 1 : 0.5 }}>
            {t.add}
          </button>
        </div>
      </div>
    </div>
  )
}
