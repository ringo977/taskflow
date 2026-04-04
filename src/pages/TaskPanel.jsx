import { useState, useRef } from 'react'
import { useLang } from '@/i18n'
import { isOverdue } from '@/utils/filters'
import { fmtDate } from '@/utils/format'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import { getProjectRole, canEditTasks } from '@/utils/permissions'
import Avatar from '@/components/Avatar'
// eslint-disable-next-line no-unused-vars
import AvatarGroup from '@/components/AvatarGroup'
import Badge from '@/components/Badge'
import ConfirmModal from '@/components/ConfirmModal'
import Checkbox from '@/components/Checkbox'
import TimeTracker from '@/components/TimeTracker'
import ApprovalSection from '@/components/ApprovalSection'

import { usePartners } from '@/hooks/usePartners'
import { useWorkpackages } from '@/hooks/useWorkpackages'
import { useMilestones } from '@/hooks/useMilestones'
import AttachmentsSection from './taskpanel/AttachmentsSection'
import CustomFieldsSection from './taskpanel/CustomFieldsSection'
import ActivityLog from './taskpanel/ActivityLog'
import TagsSection from './taskpanel/TagsSection'
import MentionPopup, { renderMentions } from './taskpanel/MentionPopup'

export default function TaskPanel({ task, projects, allTasks = [], currentUser, orgId, myProjectRoles = {}, onClose, onUpd, onDelete, onGenSubs, aiLoad, lang }) {
  const t    = useLang()
  const orgUsers = useOrgUsers()
  const [nc, setNc] = useState('')
  const [ns, setNs] = useState('')
  const [depSearch, setDepSearch] = useState('')
  const [showDepPicker, setShowDepPicker] = useState(false)
  const [mentionQuery, setMentionQuery] = useState(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const { orgPartners } = usePartners(orgId, task?.pid)
  const { workpackages } = useWorkpackages(orgId, task?.pid)
  const { milestones } = useMilestones(orgId, task?.pid)
  const commentRef = useRef(null)
  const proj = projects.find(p => p.id === task.pid)
  const me = orgUsers.find(u => u.email === currentUser?.email)
  const isAdmin = me?.role === 'admin'
  const isManager = me?.role === 'manager'
  const projectRole = getProjectRole(currentUser, proj, orgUsers, myProjectRoles)
  const canDelete = isAdmin || (isManager && projectRole === 'owner')
  const ov   = isOverdue(task.due) && !task.done
  const readOnly = !canEditTasks(projectRole)

  const deps = (task.deps ?? []).map(id => allTasks.find(t => t.id === id)).filter(Boolean)
  const blockers = allTasks.filter(t => (t.deps ?? []).includes(task.id))
  const isBlocked = deps.some(d => !d.done)

  const depCandidates = allTasks.filter(t =>
    t.id !== task.id &&
    !(task.deps ?? []).includes(t.id) &&
    (!depSearch || t.title.toLowerCase().includes(depSearch.toLowerCase()))
  ).slice(0, 8)

  const addDep = (depId) => {
    onUpd(task.id, { deps: [...(task.deps ?? []), depId] })
    setDepSearch('')
    setShowDepPicker(false)
  }
  const removeDep = (depId) => {
    onUpd(task.id, { deps: (task.deps ?? []).filter(id => id !== depId) })
  }

  const addSub = () => {
    if (!ns.trim()) return
    onUpd(task.id, { subs: [...task.subs, { id: `s${Date.now()}`, t: ns.trim(), done: false }] })
    setNs('')
  }
  const addCmt = () => {
    if (!nc.trim()) return
    onUpd(task.id, { cmts: [...task.cmts, { id: `c${Date.now()}`, who: currentUser?.name ?? 'User', txt: nc.trim(), d: new Date().toISOString().slice(0, 10) }] })
    setNc('')
    setMentionQuery(null)
  }

  const handleMentionInput = (value, cursorPos) => {
    const before = value.slice(0, cursorPos)
    const match = before.match(/@(\w*)$/)
    if (match) {
      setMentionQuery({ text: match[1], start: match.index })
    } else {
      setMentionQuery(null)
    }
  }

  const insertMention = (name) => {
    if (mentionQuery === null) return
    const before = nc.slice(0, mentionQuery.start)
    const after = nc.slice(mentionQuery.start + mentionQuery.text.length + 1)
    const newValue = `${before}@${name} ${after}`
    setNc(newValue)
    setMentionQuery(null)
    commentRef.current?.focus()
  }

  const sectionTitle = { fontSize: 11, fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em' }

  return (
    <div className="task-panel" style={{ width: 'min(440px, 100vw - 40px)', maxWidth: 440, background: 'var(--bg1)', borderLeft: '1px solid var(--bd3)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--bd3)', display: 'flex', alignItems: 'center', gap: 8 }}>
        {proj && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: proj.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--tx3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj.name}</span>
          </div>
        )}
        {isBlocked && (
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-danger)', background: 'color-mix(in srgb, var(--c-danger) 12%, transparent)', padding: '2px 8px', borderRadius: 'var(--r1)' }}>
            {t.blocked}
          </span>
        )}
        {readOnly && (
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx3)', background: 'color-mix(in srgb, var(--tx3) 12%, transparent)', padding: '2px 8px', borderRadius: 'var(--r1)' }}>
            View only
          </span>
        )}
        <Badge pri={task.pri} />
        <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--tx3)', padding: '4px 6px', lineHeight: 1, borderRadius: 'var(--r1)' }}>✕</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '18px 20px' }}>
        {/* Title */}
        <div contentEditable={!readOnly} suppressContentEditableWarning
          style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx1)', marginBottom: 16, outline: 'none', lineHeight: 1.5, letterSpacing: '-0.01em', opacity: readOnly ? 0.7 : 1 }}
          onBlur={e => onUpd(task.id, { title: e.target.innerText.trim() })}>
          {task.title}
        </div>

        {/* Meta */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 14px', fontSize: 13, marginBottom: 20, alignItems: 'start' }}>
          <span style={{ color: 'var(--tx3)' }}>{t.assigned}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {(Array.isArray(task.who) ? task.who : task.who ? [task.who] : []).map(name => (
              <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--bg2)', padding: '2px 8px 2px 4px', borderRadius: 'var(--r1)', fontSize: 12 }}>
                <Avatar name={name} size={16} />
                <span style={{ color: 'var(--tx2)' }}>{name}</span>
                <button onClick={() => {
                  const arr = Array.isArray(task.who) ? task.who : task.who ? [task.who] : []
                  onUpd(task.id, { who: arr.filter(n => n !== name) })
                }} disabled={readOnly} style={{ border: 'none', background: 'transparent', color: readOnly ? 'var(--tx3)' : 'var(--tx3)', cursor: readOnly ? 'default' : 'pointer', fontSize: 12, padding: '0 2px', lineHeight: 1, opacity: readOnly ? 0.5 : 1 }}>✕</button>
              </span>
            ))}
            <select
              value=""
              onChange={e => {
                if (!e.target.value) return
                const arr = Array.isArray(task.who) ? task.who : task.who ? [task.who] : []
                if (!arr.includes(e.target.value)) onUpd(task.id, { who: [...arr, e.target.value] })
                e.target.value = ''
              }}
              disabled={readOnly}
              style={{ fontSize: 12, padding: '3px 6px', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', background: 'transparent', color: 'var(--tx2)', cursor: readOnly ? 'default' : 'pointer', opacity: readOnly ? 0.5 : 1 }}
            >
              <option value="">+</option>
              {orgUsers.filter(u => !(Array.isArray(task.who) ? task.who : task.who ? [task.who] : []).includes(u.name)).map(u => (
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

        {/* Tags */}
        <TagsSection task={task} allTasks={allTasks} onUpd={onUpd} sectionTitle={sectionTitle} t={t} />

        {/* Custom fields */}
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

          {/* Add dependency */}
          <div style={{ position: 'relative', marginTop: 6 }}>
            <input
              value={depSearch}
              onChange={e => { setDepSearch(e.target.value); setShowDepPicker(true) }}
              onFocus={() => setShowDepPicker(true)}
              placeholder={t.addDep}
              style={{ width: '100%', fontSize: 13 }}
            />
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

        {/* Attachments */}
        <AttachmentsSection task={task} orgId={orgId} onUpd={onUpd} sectionTitle={sectionTitle} t={t} readOnly={readOnly} />

        {/* Activity log */}
        <ActivityLog activity={task.activity ?? []} sectionTitle={sectionTitle} t={t} />

        {/* Time tracking */}
        <TimeTracker task={task} currentUser={currentUser} onUpd={onUpd} sectionTitle={sectionTitle} />

        {/* Approval */}
        <ApprovalSection task={task} currentUser={currentUser} onUpd={onUpd} sectionTitle={sectionTitle} />

        {/* Subtasks */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={sectionTitle}>
              {t.subtasks}{task.subs.length > 0 ? ` (${task.subs.filter(s => s.done).length}/${task.subs.length})` : ''}
            </div>
            <button onClick={() => onGenSubs(task)} disabled={aiLoad}
              style={{ fontSize: 12, padding: '5px 10px', cursor: aiLoad ? 'wait' : 'pointer', opacity: aiLoad ? 0.5 : 1, color: 'var(--c-success)', borderColor: 'var(--c-success)' }}>
              {aiLoad ? t.generating : '✦ AI'}
            </button>
          </div>
          {task.subs.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0', borderBottom: '1px solid var(--bd3)' }}>
              <Checkbox done={s.done} size={16} onToggle={() => onUpd(task.id, { subs: task.subs.map(x => x.id === s.id ? { ...x, done: !x.done } : x) })} />
              <span style={{ fontSize: 13, flex: 1, color: s.done ? 'var(--tx3)' : 'var(--tx2)', textDecoration: s.done ? 'line-through' : 'none' }}>{s.t}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input value={ns} onChange={e => setNs(e.target.value)} placeholder={t.addSub} disabled={readOnly}
              style={{ flex: 1, fontSize: 13, opacity: readOnly ? 0.5 : 1 }} onKeyDown={e => e.key === 'Enter' && addSub()} />
            <button onClick={addSub} disabled={readOnly} style={{ fontSize: 13, padding: '5px 10px', opacity: readOnly ? 0.5 : 1 }}>+</button>
          </div>
        </div>

        {/* Comments */}
        <div>
          <div style={{ ...sectionTitle, marginBottom: 10 }}>{t.comments}</div>
          {task.cmts.map(c => (
            <div key={c.id} style={{ padding: '10px 12px', background: 'var(--bg2)', borderRadius: 'var(--r1)', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <Avatar name={c.who} size={18} />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx2)' }}>{c.who}</span>
                <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{fmtDate(c.d, lang)}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.6 }}>{renderMentions(c.txt)}</p>
            </div>
          ))}
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input ref={commentRef} value={nc}
                onChange={e => { setNc(e.target.value); handleMentionInput(e.target.value, e.target.selectionStart) }}
                placeholder={`${t.addComment} (@${t.mention})`}
                disabled={readOnly}
                style={{ flex: 1, fontSize: 13, opacity: readOnly ? 0.5 : 1 }}
                onKeyDown={e => {
                  if (mentionQuery !== null && e.key === 'Escape') { setMentionQuery(null); return }
                  if (e.key === 'Enter' && mentionQuery === null) addCmt()
                }} />
              <button onClick={addCmt} disabled={readOnly} style={{ fontSize: 13, padding: '5px 12px', opacity: readOnly ? 0.5 : 1 }}>{t.send}</button>
            </div>
            {mentionQuery !== null && (
              <MentionPopup query={mentionQuery.text} users={orgUsers} onSelect={name => insertMention(name)} onClose={() => setMentionQuery(null)} />
            )}
          </div>
        </div>

        {/* Delete (admin or project owner) */}
        {onDelete && canDelete && (
          <div style={{ borderTop: '1px solid var(--bd3)', padding: '14px 0 0', marginTop: 8 }}>
            <button onClick={() => setConfirmDel(true)}
              style={{ fontSize: 12, padding: '6px 14px', borderRadius: 'var(--r1)', border: '1px solid var(--c-danger)', background: 'transparent', color: 'var(--c-danger)', cursor: 'pointer' }}>
              {t.deleteTask}
            </button>
          </div>
        )}

        {confirmDel && (
          <ConfirmModal
            message={t.confirmDeleteTask(task.title)}
            onConfirm={() => { setConfirmDel(false); onDelete(task.id) }}
            onCancel={() => setConfirmDel(false)}
          />
        )}
      </div>
    </div>
  )
}
