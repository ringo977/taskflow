/**
 * DetailTab — "what is this task about?" section of TaskPanel.
 *
 * Owns the meta grid (assignee / dates / recurrence / milestone / partner /
 * workpackage / section / visibility), tags, custom fields, dependencies,
 * and description. Stateful UI lives here (dep-picker open state, search).
 *
 * Split from TaskPanel during UX simplification (F3.5a) to bring the parent
 * under the 200-LOC budget and prepare for the F3.5b tabbed layout.
 */
import { useState } from 'react'
import Avatar from '@/components/Avatar'
import Checkbox from '@/components/Checkbox'
import TagsSection from './TagsSection'
import CustomFieldsSection from './CustomFieldsSection'

export default function DetailTab({
  task, proj, projects, allTasks,
  orgUsers, orgPartners, workpackages, milestones,
  onUpd, readOnly, ov, sectionTitle, t,
}) {
  const [depSearch, setDepSearch] = useState('')
  const [showDepPicker, setShowDepPicker] = useState(false)

  const deps = (task.deps ?? []).map(id => allTasks.find(t => t.id === id)).filter(Boolean)
  const blockers = allTasks.filter(t => (t.deps ?? []).includes(task.id))
  const depCandidates = allTasks.filter(t =>
    t.id !== task.id &&
    !(task.deps ?? []).includes(t.id) &&
    (!depSearch || t.title.toLowerCase().includes(depSearch.toLowerCase()))
  ).slice(0, 8)
  const addDep    = (depId) => { onUpd(task.id, { deps: [...(task.deps ?? []), depId] }); setDepSearch(''); setShowDepPicker(false) }
  const removeDep = (depId) => onUpd(task.id, { deps: (task.deps ?? []).filter(id => id !== depId) })

  const whoArray = Array.isArray(task.who) ? task.who : task.who ? [task.who] : []

  return (
    <>
      {/* Meta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 14px', fontSize: 13, marginBottom: 20, alignItems: 'start' }}>
        <span style={{ color: 'var(--tx3)' }}>{t.assigned}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {whoArray.map(name => (
            <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--bg2)', padding: '2px 8px 2px 4px', borderRadius: 'var(--r1)', fontSize: 12 }}>
              <Avatar name={name} size={16} />
              <span style={{ color: 'var(--tx2)' }}>{name}</span>
              <button onClick={() => onUpd(task.id, { who: whoArray.filter(n => n !== name) })}
                disabled={readOnly}
                style={{ border: 'none', background: 'transparent', color: 'var(--tx3)', cursor: readOnly ? 'default' : 'pointer', fontSize: 12, padding: '0 2px', lineHeight: 1, opacity: readOnly ? 0.5 : 1 }}>✕</button>
            </span>
          ))}
          <select value=""
            onChange={e => {
              if (!e.target.value) return
              if (!whoArray.includes(e.target.value)) onUpd(task.id, { who: [...whoArray, e.target.value] })
              e.target.value = ''
            }}
            disabled={readOnly}
            style={{ fontSize: 12, padding: '3px 6px', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', background: 'transparent', color: 'var(--tx2)', cursor: readOnly ? 'default' : 'pointer', opacity: readOnly ? 0.5 : 1 }}>
            <option value="">+</option>
            {orgUsers.filter(u => !whoArray.includes(u.name)).map(u => (
              <option key={u.name} value={u.name}>{u.name}</option>
            ))}
          </select>
        </div>

        <span style={{ color: 'var(--tx3)' }}>{t.startDate}</span>
        <input type="date" value={task.startDate ?? ''} onChange={e => onUpd(task.id, { startDate: e.target.value || null })} disabled={readOnly}
          style={{ fontSize: 13, padding: '4px 8px', width: 'auto', opacity: readOnly ? 0.5 : 1 }} />

        <span style={{ color: 'var(--tx3)' }}>{t.dueDate}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="date" value={task.due ?? ''} onChange={e => onUpd(task.id, { due: e.target.value || null })} disabled={readOnly}
            style={{ fontSize: 13, padding: '4px 8px', width: 'auto', color: ov ? 'var(--c-danger)' : 'var(--tx1)', opacity: readOnly ? 0.5 : 1 }} />
          {ov && <span style={{ fontSize: 13, color: 'var(--c-danger)' }}>⚠</span>}
        </div>

        <span style={{ color: 'var(--tx3)' }}>{t.recurrence}</span>
        <select value={task.recurrence ?? 'none'} onChange={e => onUpd(task.id, { recurrence: e.target.value === 'none' ? null : e.target.value })} disabled={readOnly}
          style={{ fontSize: 13, padding: '4px 8px', opacity: readOnly ? 0.5 : 1 }}>
          <option value="none">{t.recNone}</option>
          <option value="daily">{t.recDaily}</option>
          <option value="weekly">{t.recWeekly}</option>
          <option value="monthly">{t.recMonthly}</option>
        </select>

        {milestones.length > 0 && <>
          <span style={{ color: 'var(--tx3)' }}>{t.milestone ?? 'Milestone'}</span>
          <select value={task.milestoneId ?? ''} onChange={e => onUpd(task.id, { milestoneId: e.target.value || null })} disabled={readOnly}
            style={{ fontSize: 13, padding: '4px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'transparent', color: 'var(--tx2)', opacity: readOnly ? 0.5 : 1 }}>
            <option value="">{t.noMs ?? '—'}</option>
            {milestones.filter(m => m.isActive).map(m => (
              <option key={m.id} value={m.id}>{m.code} — {m.name}</option>
            ))}
          </select>
        </>}

        <span style={{ color: 'var(--tx3)' }}>{t.partnerTeam ?? 'Partner/Team'}</span>
        <select value={task.partnerId ?? ''} onChange={e => onUpd(task.id, { partnerId: e.target.value || null })} disabled={readOnly}
          style={{ fontSize: 13, padding: '4px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'transparent', color: 'var(--tx2)', opacity: readOnly ? 0.5 : 1 }}>
          <option value="">{t.noPartner ?? '—'}</option>
          {orgPartners.filter(p => p.isActive).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {workpackages.length > 0 && <>
          <span style={{ color: 'var(--tx3)' }}>{t.workpackage ?? 'Workpackage'}</span>
          <select value={task.workpackageId ?? ''} onChange={e => onUpd(task.id, { workpackageId: e.target.value || null })} disabled={readOnly}
            style={{ fontSize: 13, padding: '4px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'transparent', color: 'var(--tx2)', opacity: readOnly ? 0.5 : 1 }}>
            <option value="">{t.noWp ?? '—'}</option>
            {workpackages.filter(w => w.isActive).map(w => (
              <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
            ))}
          </select>
        </>}

        <span style={{ color: 'var(--tx3)' }}>{t.section}</span>
        <span style={{ color: 'var(--tx2)' }}>{task.sec}</span>

        <span style={{ color: 'var(--tx3)' }}>{t.taskVisibility ?? 'Visibility'}</span>
        <select value={task.visibility ?? 'all'}
          onChange={e => onUpd(task.id, { visibility: e.target.value })} disabled={readOnly}
          style={{ fontSize: 13, padding: '4px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'transparent', color: 'var(--tx2)', opacity: readOnly ? 0.5 : 1 }}>
          <option value="all">{t.visibilityAll ?? 'Everyone'}</option>
          <option value="assignees">{t.visibilityAssignees ?? 'Assignees only'}</option>
        </select>
      </div>

      <TagsSection task={task} allTasks={allTasks} onUpd={onUpd} sectionTitle={sectionTitle} t={t} />
      <CustomFieldsSection task={task} project={proj} onUpd={onUpd} sectionTitle={sectionTitle} t={t} readOnly={readOnly} />

      {/* Dependencies */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ ...sectionTitle, marginBottom: 8 }}>{t.dependencies}</div>

        {deps.length > 0 && (
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 4 }}>{t.waitingOn}</div>
            {deps.map(dep => {
              const dp = projects.find(p => p.id === dep.pid)
              return (
                <div key={dep.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--bd3)' }}>
                  <Checkbox done={dep.done} size={14} onToggle={() => {}} />
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: dp?.color ?? 'var(--tx3)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: dep.done ? 'var(--tx3)' : 'var(--tx1)', textDecoration: dep.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {dep.title}
                  </span>
                  <button onClick={() => removeDep(dep.id)} style={{ border: 'none', background: 'transparent', color: 'var(--tx3)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', lineHeight: 1 }}>✕</button>
                </div>
              )
            })}
          </div>
        )}

        {blockers.length > 0 && (
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 4 }}>{t.blocking}</div>
            {blockers.map(bl => (
              <div key={bl.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--bd3)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 6h6M6 3v6" stroke="var(--c-warning)" strokeWidth="1.3" strokeLinecap="round"/></svg>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--tx2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bl.title}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ position: 'relative', marginTop: 6 }}>
          <input value={depSearch}
            onChange={e => { setDepSearch(e.target.value); setShowDepPicker(true) }}
            onFocus={() => setShowDepPicker(true)}
            placeholder={t.addDep}
            style={{ width: '100%', fontSize: 13 }} />
          {showDepPicker && depSearch && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: 'var(--bg1)', border: '1px solid var(--bd2)', borderRadius: 'var(--r1)', boxShadow: 'var(--shadow-md)', zIndex: 10, maxHeight: 200, overflow: 'auto' }}>
              {depCandidates.length === 0 && <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--tx3)' }}>{t.noTasks('')}</div>}
              {depCandidates.map(c => {
                const cp = projects.find(p => p.id === c.pid)
                return (
                  <div key={c.id} onClick={() => addDep(c.id)} className="row-interactive"
                    style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: cp?.color ?? 'var(--tx3)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: c.done ? 'var(--tx3)' : 'var(--tx1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: c.done ? 'line-through' : 'none' }}>{c.title}</span>
                  </div>
                )
              })}
            </div>
          )}
          {showDepPicker && <div onClick={() => { setShowDepPicker(false); setDepSearch('') }} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />}
        </div>

        {deps.length === 0 && blockers.length === 0 && !showDepPicker && (
          <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 4 }}>{t.noDeps}</div>
        )}
      </div>

      {/* Description */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ ...sectionTitle, marginBottom: 6 }}>{t.description}</div>
        <div contentEditable={!readOnly} suppressContentEditableWarning
          style={{ fontSize: 14, color: task.desc ? 'var(--tx2)' : 'var(--tx3)', outline: 'none', lineHeight: 1.65, minHeight: 32, opacity: readOnly ? 0.7 : 1 }}
          onBlur={e => onUpd(task.id, { desc: e.target.innerText })}>
          {task.desc || t.addDesc}
        </div>
      </div>
    </>
  )
}
