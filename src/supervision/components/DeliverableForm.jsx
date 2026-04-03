/**
 * DeliverableForm — inline form for creating/editing a deliverable.
 */
import { useState } from 'react'
import { useLang } from '@/i18n'

const STATUSES = ['draft', 'in_progress', 'internal_review', 'submitted', 'accepted', 'delayed']
const STATUS_KEYS = {
  draft: 'supDraft', in_progress: 'supInProgress', internal_review: 'supInternalReview',
  submitted: 'supSubmitted', accepted: 'supAccepted', delayed: 'supDelayed',
}

export default function DeliverableForm({ deliverable, onSave, onCancel }) {
  const t = useLang()
  const isNew = !deliverable

  const [code, setCode] = useState(deliverable?.code ?? '')
  const [title, setTitle] = useState(deliverable?.title ?? '')
  const [owner, setOwner] = useState(deliverable?.owner ?? '')
  const [dueDate, setDueDate] = useState(deliverable?.dueDate ?? '')
  const [status, setStatus] = useState(deliverable?.status ?? 'draft')
  const [notes, setNotes] = useState(deliverable?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const canSave = code.trim() && title.trim()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSave || saving) return
    setSaving(true)
    try {
      await onSave({
        ...(deliverable?.id ? { id: deliverable.id } : {}),
        code: code.trim(), title: title.trim(),
        owner: owner.trim() || null,
        dueDate: dueDate || null, status,
        notes: notes.trim() || null,
        linkedMilestoneRef: deliverable?.linkedMilestoneRef ?? null,
      })
    } finally {
      setSaving(false)
    }
  }

  const fieldStyle = { padding: '6px 10px', fontSize: 13, border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', background: 'var(--bg1)', color: 'var(--tx1)' }

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--bg2)', border: '1px solid var(--bd3)', borderRadius: 'var(--r2)', padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 140px 140px', gap: 8, marginBottom: 8 }}>
        <input placeholder={t.supCode} value={code} onChange={e => setCode(e.target.value)} style={fieldStyle} required />
        <input placeholder={t.title} value={title} onChange={e => setTitle(e.target.value)} style={fieldStyle} required />
        <input placeholder={t.supOwner} value={owner} onChange={e => setOwner(e.target.value)} style={fieldStyle} />
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={fieldStyle} />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...fieldStyle, width: 160 }}>
          {STATUSES.map(s => <option key={s} value={s}>{t[STATUS_KEYS[s]] ?? s}</option>)}
        </select>
        <input placeholder={t.supNotes} value={notes} onChange={e => setNotes(e.target.value)} style={{ ...fieldStyle, flex: 1 }} />
        <button type="submit" disabled={!canSave || saving}
          style={{ padding: '6px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 'var(--r1)', background: canSave ? 'var(--c-brand)' : 'var(--bd3)', color: '#fff', cursor: canSave ? 'pointer' : 'default' }}>
          {saving ? '…' : isNew ? t.supAdd : t.supEdit}
        </button>
        <button type="button" onClick={onCancel}
          style={{ padding: '6px 12px', fontSize: 13, border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', background: 'transparent', color: 'var(--tx2)', cursor: 'pointer' }}>
          ✕
        </button>
      </div>
    </form>
  )
}
