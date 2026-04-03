/**
 * RecurringControlsPanel — CRUD list of recurring governance controls.
 *
 * Shows active/inactive controls with frequency, next due date, and
 * action type. Due controls are highlighted. Supports inline create/edit
 * via RecurringControlForm.
 */
import { useState } from 'react'
import { useLang } from '@/i18n'
import { fmtDate } from '@/utils/format'

// ── Inline form ────────────────────────────────────────────────────
function RecurringControlForm({ control, onSave, onCancel, lang: _lang }) {
  const t = useLang()
  const [title, setTitle] = useState(control?.title ?? '')
  const [description, setDescription] = useState(control?.description ?? '')
  const [frequency, setFrequency] = useState(control?.frequency ?? 'weekly')
  const [customInterval, setCustomInterval] = useState(control?.customInterval ?? 14)
  const [nextDueDate, setNextDueDate] = useState(control?.nextDueDate ?? new Date().toISOString().slice(0, 10))
  const [actionType, setActionType] = useState(control?.actionType ?? 'reminder_only')

  const submit = () => {
    if (!title.trim()) return
    onSave({
      ...(control?.id ? { id: control.id } : {}),
      title: title.trim(),
      description: description.trim() || null,
      frequency,
      customInterval: frequency === 'custom' ? customInterval : null,
      nextDueDate,
      actionType,
      active: control?.active ?? true,
    })
  }

  const fieldStyle = { fontSize: 12, padding: '6px 8px', width: '100%', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx1)' }

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t.supControlTitle}
        style={fieldStyle} autoFocus onKeyDown={e => e.key === 'Enter' && submit()} />
      <input value={description} onChange={e => setDescription(e.target.value)} placeholder={t.supControlDescription}
        style={fieldStyle} />
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, color: 'var(--tx3)', display: 'block', marginBottom: 3 }}>{t.supFrequency}</label>
          <select value={frequency} onChange={e => setFrequency(e.target.value)} style={fieldStyle}>
            <option value="weekly">{t.supFreqWeekly}</option>
            <option value="monthly">{t.supFreqMonthly}</option>
            <option value="custom">{t.supFreqCustom}</option>
          </select>
        </div>
        {frequency === 'custom' && (
          <div style={{ width: 80 }}>
            <label style={{ fontSize: 10, color: 'var(--tx3)', display: 'block', marginBottom: 3 }}>{t.supCustomDays}</label>
            <input type="number" min="1" value={customInterval} onChange={e => setCustomInterval(Number(e.target.value))}
              style={fieldStyle} />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, color: 'var(--tx3)', display: 'block', marginBottom: 3 }}>{t.supNextDue}</label>
          <input type="date" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} style={fieldStyle} />
        </div>
      </div>
      <div>
        <label style={{ fontSize: 10, color: 'var(--tx3)', display: 'block', marginBottom: 3 }}>{t.supActionType}</label>
        <select value={actionType} onChange={e => setActionType(e.target.value)} style={fieldStyle}>
          <option value="reminder_only">{t.supActionReminder}</option>
          <option value="create_task">{t.supActionCreateTask}</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ fontSize: 12, padding: '4px 12px' }}>{t.cancel}</button>
        <button onClick={submit} disabled={!title.trim()}
          style={{ fontSize: 12, padding: '4px 12px', background: title.trim() ? 'var(--tx1)' : 'var(--bd2)', color: 'var(--bg1)', border: 'none', borderRadius: 'var(--r1)', cursor: title.trim() ? 'pointer' : 'default', fontWeight: 500 }}>
          {control?.id ? t.supEdit : t.create}
        </button>
      </div>
    </div>
  )
}

// ── Row ────────────────────────────────────────────────────────────
function ControlRow({ control, isDue, onEdit, onToggle, onExecute, lang }) {
  const t = useLang()
  const freqLabels = { weekly: t.supFreqWeekly, monthly: t.supFreqMonthly, custom: `${control.customInterval} ${t.supCustomDays}` }
  const actionLabels = { create_task: t.supActionCreateTask, reminder_only: t.supActionReminder }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
      background: isDue ? 'color-mix(in srgb, var(--c-warning) 8%, transparent)' : 'transparent',
      border: isDue ? '1px solid color-mix(in srgb, var(--c-warning) 30%, transparent)' : '1px solid var(--bd3)',
      borderRadius: 'var(--r1)', opacity: control.active ? 1 : 0.5,
    }}>
      {/* Status dot */}
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: isDue ? 'var(--c-warning)' : control.active ? 'var(--c-success)' : 'var(--tx3)', flexShrink: 0 }} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {control.title}
          {isDue && <span style={{ fontSize: 11, color: 'var(--c-warning)', marginLeft: 6, fontWeight: 600 }}>● {t.supDueNow}</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>
          {freqLabels[control.frequency]} · {actionLabels[control.actionType]}
          {control.nextDueDate && <> · {fmtDate(control.nextDueDate, lang)}</>}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {isDue && control.active && (
          <button onClick={() => onExecute(control)} title={t.supExecute}
            style={{ fontSize: 11, padding: '3px 8px', background: 'var(--c-warning)', color: '#fff', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer', fontWeight: 500 }}>
            ▶
          </button>
        )}
        <button onClick={() => onEdit(control)} style={{ fontSize: 11, padding: '3px 8px', color: 'var(--tx3)', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', background: 'transparent', cursor: 'pointer' }}>
          {t.supEdit}
        </button>
        <button onClick={() => onToggle(control)} style={{ fontSize: 11, padding: '3px 8px', color: control.active ? 'var(--c-danger)' : 'var(--c-success)', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', background: 'transparent', cursor: 'pointer' }}>
          {control.active ? '⏸' : '▶'}
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function RecurringControlsPanel({ controls, dueControls, onSave, onDelete: _onDelete, onToggle, onExecute, lang }) {
  const t = useLang()
  const [editing, setEditing] = useState(null) // null | 'new' | control object
  const dueIds = new Set(dueControls.map(c => c.id))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx1)' }}>
          {t.supRecurringTitle}
          {dueControls.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--c-warning)', marginLeft: 8, fontWeight: 500 }}>
              ({dueControls.length} {t.supDueNow.toLowerCase()})
            </span>
          )}
        </span>
        {!editing && (
          <button onClick={() => setEditing('new')}
            style={{ fontSize: 12, padding: '4px 12px', background: 'var(--tx1)', color: 'var(--bg1)', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer', fontWeight: 500 }}>
            + {t.supAddControl}
          </button>
        )}
      </div>

      {editing === 'new' && (
        <div style={{ marginBottom: 10 }}>
          <RecurringControlForm
            onSave={async (c) => { await onSave(c); setEditing(null) }}
            onCancel={() => setEditing(null)}
            lang={lang}
          />
        </div>
      )}

      {controls.length === 0 && !editing && (
        <div style={{ fontSize: 13, color: 'var(--tx3)', padding: '16px 0' }}>{t.supNoControls}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {controls.map(c => (
          editing?.id === c.id ? (
            <RecurringControlForm key={c.id} control={c}
              onSave={async (updated) => { await onSave(updated); setEditing(null) }}
              onCancel={() => setEditing(null)} lang={lang} />
          ) : (
            <ControlRow key={c.id} control={c} isDue={dueIds.has(c.id)}
              onEdit={setEditing} onToggle={onToggle} onExecute={onExecute} lang={lang} />
          )
        ))}
      </div>
    </div>
  )
}
