/**
 * ActivityTab — "what's happening?" section of TaskPanel.
 *
 * Owns the activity log, subtasks (incl. AI generate), and comments
 * with @mentions. Comment input state (including the mention query)
 * is local to this component.
 *
 * Split from TaskPanel during UX simplification (F3.5a).
 */
import { useRef, useState } from 'react'
import Avatar from '@/components/Avatar'
import Checkbox from '@/components/Checkbox'
import { fmtDate } from '@/utils/format'
import ActivityLog from './ActivityLog'
import MentionPopup, { renderMentions } from './MentionPopup'

export default function ActivityTab({
  task, currentUser, orgUsers, onUpd, onGenSubs, aiLoad,
  readOnly, sectionTitle, t, lang,
}) {
  const [ns, setNs] = useState('')
  const [nc, setNc] = useState('')
  const [mentionQuery, setMentionQuery] = useState(null)
  const commentRef = useRef(null)

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
    setMentionQuery(match ? { text: match[1], start: match.index } : null)
  }

  const insertMention = (name) => {
    if (mentionQuery === null) return
    const before = nc.slice(0, mentionQuery.start)
    const after = nc.slice(mentionQuery.start + mentionQuery.text.length + 1)
    setNc(`${before}@${name} ${after}`)
    setMentionQuery(null)
    commentRef.current?.focus()
  }

  return (
    <>
      <ActivityLog activity={task.activity ?? []} sectionTitle={sectionTitle} t={t} />

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
    </>
  )
}
