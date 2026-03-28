import { useState, useRef } from 'react'
import { useLang } from '@/i18n'
import { isOverdue } from '@/utils/filters'
import { fmtDate } from '@/utils/format'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import { uploadAttachment, deleteAttachment } from '@/lib/db'
import Avatar from '@/components/Avatar'
import Badge from '@/components/Badge'
import ConfirmModal from '@/components/ConfirmModal'
import Checkbox from '@/components/Checkbox'
import TimeTracker from '@/components/TimeTracker'
import ApprovalSection from '@/components/ApprovalSection'

export default function TaskPanel({ task, projects, allTasks = [], currentUser, orgId, myProjectRoles = {}, onClose, onUpd, onDelete, onGenSubs, aiLoad, lang }) {
  const t    = useLang()
  const orgUsers = useOrgUsers()
  const [nc, setNc] = useState('')
  const [ns, setNs] = useState('')
  const [depSearch, setDepSearch] = useState('')
  const [showDepPicker, setShowDepPicker] = useState(false)
  const [mentionQuery, setMentionQuery] = useState(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const commentRef = useRef(null)
  const proj = projects.find(p => p.id === task.pid)
  const me = orgUsers.find(u => u.email === currentUser?.email)
  const isAdmin = me?.role === 'admin'
  const isManager = me?.role === 'manager'
  const canDelete = isAdmin || (isManager && myProjectRoles[task.pid] === 'owner')
  const ov   = isOverdue(task.due) && !task.done

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
        <Badge pri={task.pri} />
        <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--tx3)', padding: '4px 6px', lineHeight: 1, borderRadius: 'var(--r1)' }}>✕</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '18px 20px' }}>
        {/* Title */}
        <div contentEditable suppressContentEditableWarning
          style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx1)', marginBottom: 16, outline: 'none', lineHeight: 1.5, letterSpacing: '-0.01em' }}
          onBlur={e => onUpd(task.id, { title: e.target.innerText.trim() })}>
          {task.title}
        </div>

        {/* Meta */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 14px', fontSize: 13, marginBottom: 20, alignItems: 'center' }}>
          <span style={{ color: 'var(--tx3)' }}>{t.assigned}</span>
          <Avatar name={task.who} size={20} showName />

          <span style={{ color: 'var(--tx3)' }}>{t.startDate}</span>
          <input type="date" value={task.startDate ?? ''} onChange={e => onUpd(task.id, { startDate: e.target.value || null })}
            style={{ fontSize: 13, padding: '4px 8px', width: 'auto' }} />

          <span style={{ color: 'var(--tx3)' }}>{t.dueDate}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="date" value={task.due ?? ''} onChange={e => onUpd(task.id, { due: e.target.value || null })}
              style={{ fontSize: 13, padding: '4px 8px', width: 'auto', color: ov ? 'var(--c-danger)' : 'var(--tx1)' }} />
            {ov && <span style={{ fontSize: 13, color: 'var(--c-danger)' }}>⚠</span>}
          </div>

          <span style={{ color: 'var(--tx3)' }}>{t.recurrence}</span>
          <select value={task.recurrence ?? 'none'} onChange={e => onUpd(task.id, { recurrence: e.target.value === 'none' ? null : e.target.value })}
            style={{ fontSize: 13, padding: '4px 8px' }}>
            <option value="none">{t.recNone}</option>
            <option value="daily">{t.recDaily}</option>
            <option value="weekly">{t.recWeekly}</option>
            <option value="monthly">{t.recMonthly}</option>
          </select>

          <span style={{ color: 'var(--tx3)' }}>{t.section}</span>
          <span style={{ color: 'var(--tx2)' }}>{task.sec}</span>
        </div>

        {/* Tags */}
        <TagsSection task={task} allTasks={allTasks} onUpd={onUpd} sectionTitle={sectionTitle} t={t} />

        {/* Custom fields */}
        <CustomFieldsSection task={task} project={proj} onUpd={onUpd} sectionTitle={sectionTitle} t={t} />

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
          <div contentEditable suppressContentEditableWarning
            style={{ fontSize: 14, color: task.desc ? 'var(--tx2)' : 'var(--tx3)', outline: 'none', lineHeight: 1.65, minHeight: 32 }}
            onBlur={e => onUpd(task.id, { desc: e.target.innerText })}>
            {task.desc || t.addDesc}
          </div>
        </div>

        {/* Attachments */}
        <AttachmentsSection task={task} orgId={orgId} onUpd={onUpd} sectionTitle={sectionTitle} t={t} />

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
            <input value={ns} onChange={e => setNs(e.target.value)} placeholder={t.addSub}
              style={{ flex: 1, fontSize: 13 }} onKeyDown={e => e.key === 'Enter' && addSub()} />
            <button onClick={addSub} style={{ fontSize: 13, padding: '5px 10px' }}>+</button>
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
                style={{ flex: 1, fontSize: 13 }}
                onKeyDown={e => {
                  if (mentionQuery !== null && e.key === 'Escape') { setMentionQuery(null); return }
                  if (e.key === 'Enter' && mentionQuery === null) addCmt()
                }} />
              <button onClick={addCmt} style={{ fontSize: 13, padding: '5px 12px' }}>{t.send}</button>
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

function AttachmentsSection({ task, orgId, onUpd, sectionTitle, t }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const attachments = task.attachments ?? []

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    try {
      const newAttachments = await Promise.all(files.map(async f => {
        try {
          const { url, path } = await uploadAttachment(orgId, task.id, f)
          return { id: `att${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: f.name, size: f.size, type: f.type, addedAt: new Date().toISOString().slice(0, 10), url, storagePath: path }
        } catch {
          return { id: `att${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: f.name, size: f.size, type: f.type, addedAt: new Date().toISOString().slice(0, 10), url: URL.createObjectURL(f) }
        }
      }))
      onUpd(task.id, { attachments: [...attachments, ...newAttachments] })
    } finally { setUploading(false) }
    e.target.value = ''
  }

  const removeAtt = async (attId) => {
    const att = attachments.find(a => a.id === attId)
    if (att?.storagePath) {
      try { await deleteAttachment(att.storagePath) } catch {}
    }
    onUpd(task.id, { attachments: attachments.filter(a => a.id !== attId) })
  }

  const fmtSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const iconForType = (type) => {
    if (type?.startsWith('image/')) return '🖼'
    if (type?.includes('pdf')) return '📄'
    if (type?.includes('spreadsheet') || type?.includes('excel') || type?.includes('csv')) return '📊'
    if (type?.includes('document') || type?.includes('word')) return '📝'
    return '📎'
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={sectionTitle}>{t.attachments}{attachments.length > 0 ? ` (${attachments.length})` : ''}</div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ fontSize: 12, padding: '5px 10px', color: 'var(--c-brand)', borderColor: 'var(--c-brand)', opacity: uploading ? 0.5 : 1 }}>
          {uploading ? '…' : `+ ${t.addAttachment}`}
        </button>
        <input ref={fileRef} type="file" multiple onChange={handleFiles} style={{ display: 'none' }} />
      </div>

      {attachments.length === 0 && <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{t.noAttachments}</div>}

      {attachments.map(att => (
        <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--bd3)' }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{iconForType(att.type)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</div>
            <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{fmtSize(att.size)}</div>
          </div>
          {att.url && (
            <a href={att.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: 'var(--c-brand)', textDecoration: 'none', flexShrink: 0 }}>↓</a>
          )}
          <button onClick={() => removeAtt(att.id)} style={{ border: 'none', background: 'transparent', color: 'var(--tx3)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>
      ))}
    </div>
  )
}

function CustomFieldsSection({ task, project, onUpd, sectionTitle, t }) {
  const fields = project?.customFields ?? []
  const values = task.customValues ?? {}
  if (!fields.length) return null

  const setVal = (fieldId, val) => {
    onUpd(task.id, { customValues: { ...values, [fieldId]: val } })
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ ...sectionTitle, marginBottom: 8 }}>{t.customFields ?? 'Custom fields'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 13 }}>
        {fields.map(f => (
          <div key={f.id} style={{ display: 'contents' }}>
            <span style={{ color: 'var(--tx3)', alignSelf: 'center' }}>{f.name}</span>
            {f.type === 'text' && (
              <input value={values[f.id] ?? ''} onChange={e => setVal(f.id, e.target.value)}
                style={{ fontSize: 12, padding: '4px 8px' }} />
            )}
            {f.type === 'number' && (
              <input type="number" value={values[f.id] ?? ''} onChange={e => setVal(f.id, e.target.value)}
                style={{ fontSize: 12, padding: '4px 8px', width: 100 }} />
            )}
            {f.type === 'select' && (
              <select value={values[f.id] ?? ''} onChange={e => setVal(f.id, e.target.value)}
                style={{ fontSize: 12, padding: '4px 8px' }}>
                <option value="">—</option>
                {(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const FIELD_LABELS = {
  title: 'title', desc: 'description', who: 'assignee', pri: 'priority',
  due: 'due date', startDate: 'start date', sec: 'section', tags: 'tags',
  done: 'status', recurrence: 'recurrence',
}

function ActivityLog({ activity, sectionTitle, t }) {
  const [expanded, setExpanded] = useState(false)
  if (!activity.length) return null
  const shown = expanded ? activity : activity.slice(-3)
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ ...sectionTitle, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        {t.activityLog ?? 'Activity'}
        <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 400 }}>({activity.length})</span>
      </div>
      {activity.length > 3 && (
        <button onClick={() => setExpanded(!expanded)} style={{ fontSize: 11, color: 'var(--c-brand)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 6, padding: 0 }}>
          {expanded ? (t.showLess ?? 'Show less') : (typeof t.showAll === 'function' ? t.showAll(activity.length) : `Show all (${activity.length})`)}
        </button>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {shown.map((entry, i) => {
          const label = FIELD_LABELS[entry.field] ?? entry.field
          const fmtVal = v => v === true ? '✓' : v === false ? '✗' : v || '—'
          const d = new Date(entry.ts)
          const time = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          return (
            <div key={i} style={{ fontSize: 12, color: 'var(--tx3)', padding: '3px 0', borderBottom: '1px solid var(--bd3)' }}>
              <span style={{ color: 'var(--tx2)', fontWeight: 500 }}>{entry.who}</span>
              {' '}{t.changed ?? 'changed'} <strong>{label}</strong>
              {' '}{fmtVal(entry.from)} → {fmtVal(entry.to)}
              <span style={{ float: 'right', fontSize: 11 }}>{time}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const TAG_COLORS = ['#378ADD','#D85A30','#1D9E75','#7F77DD','#EF9F27','#639922','#D4537E','#2AA198','#CB4B16','#6C71C4']

function TagsSection({ task, allTasks, onUpd, sectionTitle, t }) {
  const [input, setInput] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const tags = task.tags ?? []

  const allKnownTags = [...new Map(
    allTasks.flatMap(tk => tk.tags ?? []).map(tg => [tg.name, tg])
  ).values()]

  const suggestions = allKnownTags.filter(tg =>
    !tags.some(x => x.name === tg.name) &&
    (!input || tg.name.toLowerCase().includes(input.toLowerCase()))
  ).slice(0, 8)

  const addTag = (tg) => {
    if (tags.some(x => x.name === tg.name)) return
    onUpd(task.id, { tags: [...tags, tg] })
    setInput('')
    setShowPicker(false)
  }

  const createTag = () => {
    const name = input.trim()
    if (!name || tags.some(x => x.name === name)) return
    const existing = allKnownTags.find(tg => tg.name.toLowerCase() === name.toLowerCase())
    if (existing) { addTag(existing); return }
    const color = TAG_COLORS[allKnownTags.length % TAG_COLORS.length]
    addTag({ name, color })
  }

  const removeTag = (name) => {
    onUpd(task.id, { tags: tags.filter(tg => tg.name !== name) })
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ ...sectionTitle, marginBottom: 8 }}>{t.tags ?? 'Tags'}</div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
        {tags.map(tg => (
          <span key={tg.name} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 12, padding: '2px 8px', borderRadius: 'var(--r1)',
            background: (tg.color ?? 'var(--tx3)') + '20', color: tg.color ?? 'var(--tx3)', fontWeight: 500,
          }}>
            {tg.name}
            <span onClick={() => removeTag(tg.name)} style={{ cursor: 'pointer', fontSize: 13, lineHeight: 1, opacity: 0.6 }}>✕</span>
          </span>
        ))}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setShowPicker(true) }}
          onFocus={() => setShowPicker(true)}
          placeholder={t.addTag ?? 'Add tag…'}
          style={{ width: '100%', fontSize: 13 }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createTag() } }}
        />
        {showPicker && (input || suggestions.length > 0) && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: 'var(--bg1)', border: '1px solid var(--bd2)', borderRadius: 'var(--r1)', boxShadow: 'var(--shadow-md)', zIndex: 10, maxHeight: 200, overflow: 'auto' }}>
            {suggestions.map(tg => (
              <div key={tg.name} onClick={() => addTag(tg)} className="row-interactive"
                style={{ padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: tg.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--tx1)' }}>{tg.name}</span>
              </div>
            ))}
            {input.trim() && !allKnownTags.some(tg => tg.name.toLowerCase() === input.trim().toLowerCase()) && (
              <div onClick={createTag} className="row-interactive"
                style={{ padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, borderTop: suggestions.length ? '1px solid var(--bd3)' : 'none' }}>
                <span style={{ fontSize: 14, color: 'var(--c-success)', fontWeight: 500 }}>+</span>
                <span style={{ fontSize: 12, color: 'var(--tx2)' }}>{t.createTag ?? 'Create'} "<strong>{input.trim()}</strong>"</span>
              </div>
            )}
          </div>
        )}
        {showPicker && <div onClick={() => { setShowPicker(false); setInput('') }} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />}
      </div>
    </div>
  )
}

function renderMentions(text) {
  if (!text) return text
  const parts = text.split(/(@\w+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return <span key={i} style={{ color: 'var(--c-brand)', fontWeight: 500, cursor: 'pointer' }}>{part}</span>
    }
    return part
  })
}

function MentionPopup({ query, users, onSelect, onClose }) {
  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 6)

  if (filtered.length === 0) return null

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 19 }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: '100%', marginBottom: 4,
        background: 'var(--bg1)', border: '1px solid var(--bd2)', borderRadius: 'var(--r1)',
        boxShadow: 'var(--shadow-md)', zIndex: 20, maxHeight: 180, overflow: 'auto',
      }}>
        {filtered.map(u => (
          <div key={u.id ?? u.name} onClick={() => onSelect(u.name)} className="row-interactive"
            style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: u.color ?? 'var(--c-brand)', color: '#fff', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {u.name.slice(0, 1).toUpperCase()}
            </div>
            <span style={{ fontSize: 13, color: 'var(--tx1)' }}>{u.name}</span>
            {u.role && <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{u.role}</span>}
          </div>
        ))}
      </div>
    </>
  )
}
