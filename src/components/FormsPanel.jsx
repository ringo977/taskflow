import { useState } from 'react'
import { useLang } from '@/i18n'
import { useOrgUsers } from '@/context/OrgUsersCtx'

/**
 * FormsPanel — per-project visual form builder (displayed in ProjectOverview).
 * Forms are stored in project.forms JSONB. When submitted, each form
 * creates a task with pre-filled fields.
 *
 * Field types: text, textarea, select, date, number, checkbox, url, email
 * Features: move up/down reorder, live preview, placeholder & default values
 */

const FIELD_TYPES = [
  { id: 'text',     label: 'Text',     icon: 'Aa' },
  { id: 'textarea', label: 'Long text', icon: '¶' },
  { id: 'select',   label: 'Select',   icon: '▾' },
  { id: 'date',     label: 'Date',     icon: '📅' },
  { id: 'number',   label: 'Number',   icon: '#' },
  { id: 'checkbox', label: 'Checkbox', icon: '☑' },
  { id: 'url',      label: 'URL',      icon: '🔗' },
  { id: 'email',    label: 'Email',    icon: '✉' },
]

const TASK_MAPPINGS = [
  { id: 'title', label: 'Title' },
  { id: 'desc',  label: 'Description' },
  { id: 'who',   label: 'Assignee' },
  { id: 'due',   label: 'Due date' },
  { id: 'pri',   label: 'Priority' },
  { id: 'none',  label: '— (extra info)' },
]

// ── Main component ───────────────────────────────────────────

export default function FormsPanel({ project, sections = [], onUpdProj, sectionTitleStyle }) {
  const t = useLang()
  const forms = project?.forms ?? []
  const [editId, setEditId] = useState(null)
  const [adding, setAdding] = useState(false)

  const saveForm = (form) => {
    const exists = forms.find(f => f.id === form.id)
    const next = exists ? forms.map(f => f.id === form.id ? form : f) : [...forms, form]
    onUpdProj(project.id, { forms: next })
    setAdding(false)
    setEditId(null)
  }

  const deleteForm = (id) => {
    onUpdProj(project.id, { forms: forms.filter(f => f.id !== id) })
    setEditId(null)
  }

  return (
    <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={sectionTitleStyle}>{t.forms ?? 'Forms'}</div>
        {!adding && (
          <button onClick={() => { setAdding(true); setEditId(null) }}
            style={{ fontSize: 11, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 'var(--r1)', padding: '4px 10px', cursor: 'pointer', fontWeight: 500 }}>
            + {t.add ?? 'Add'}
          </button>
        )}
      </div>

      {forms.map(form => (
        editId === form.id ? (
          <FormEditor key={form.id} form={form} sections={sections} t={t}
            onSave={saveForm} onCancel={() => setEditId(null)} onDelete={() => deleteForm(form.id)} />
        ) : (
          <FormCard key={form.id} form={form} t={t} sections={sections}
            onEdit={() => setEditId(form.id)} />
        )
      ))}

      {forms.length === 0 && !adding && (
        <div style={{ fontSize: 12, color: 'var(--tx3)', fontStyle: 'italic', padding: '8px 0' }}>
          {t.noForms ?? 'No forms yet. Create one to standardize task requests.'}
        </div>
      )}

      {adding && (
        <FormEditor form={null} sections={sections} t={t}
          onSave={saveForm} onCancel={() => setAdding(false)} />
      )}
    </div>
  )
}

// ── Form card (read-only view) ──────────────────────────────

function FormCard({ form, t, sections, onEdit }) {
  const fieldCount = form.fields?.length ?? 0
  const requiredCount = (form.fields ?? []).filter(f => f.required).length

  return (
    <div onClick={onEdit} className="row-interactive"
      style={{
        padding: '12px 14px', marginBottom: 8,
        background: 'var(--bg2)', borderRadius: 'var(--r2)',
        border: '1px solid var(--bd3)', cursor: 'pointer',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>📋</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx1)' }}>{form.name}</div>
          {form.description && (
            <div style={{ fontSize: 11, color: 'var(--tx3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.description}</div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
        <span style={{ color: 'var(--tx3)', background: 'var(--bg1)', padding: '1px 6px', borderRadius: 8 }}>
          {fieldCount} {t.formFields ?? 'fields'}
        </span>
        {requiredCount > 0 && (
          <span style={{ color: 'var(--c-danger)', background: 'color-mix(in srgb, var(--c-danger) 10%, transparent)', padding: '1px 6px', borderRadius: 8 }}>
            {requiredCount} {t.formRequired ?? 'req'}
          </span>
        )}
        <span style={{ color: 'var(--c-brand)', background: 'color-mix(in srgb, var(--c-brand) 10%, transparent)', padding: '1px 6px', borderRadius: 8 }}>
          → {form.defaultSection || sections[0] || 'To Do'}
        </span>
      </div>
    </div>
  )
}

// ── Form editor (create/edit) ───────────────────────────────

function FormEditor({ form, sections, t, onSave, onCancel, onDelete }) {
  const USERS = useOrgUsers()
  const [name, setName] = useState(form?.name ?? '')
  const [desc, setDesc] = useState(form?.description ?? '')
  const [defaultSection, setDefaultSection] = useState(form?.defaultSection ?? sections[0] ?? '')
  const [fields, setFields] = useState(form?.fields ?? [])
  const [showPreview, setShowPreview] = useState(false)

  const inputStyle = { fontSize: 12, padding: '6px 9px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg1)', color: 'var(--tx1)', width: '100%' }
  const selectStyle = { ...inputStyle, cursor: 'pointer' }
  const labelStyle = { fontSize: 11, color: 'var(--tx3)', marginBottom: 3, display: 'block', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }
  const sectionStyle = { padding: '10px 12px', background: 'var(--bg1)', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)' }

  const addField = () => {
    setFields([...fields, {
      id: `ff_${Date.now()}`, label: '', type: 'text', mapsTo: 'none',
      required: false, options: '', placeholder: '', defaultValue: '',
    }])
  }

  const updateField = (idx, patch) => {
    setFields(fields.map((f, i) => i === idx ? { ...f, ...patch } : f))
  }

  const removeField = (idx) => {
    setFields(fields.filter((_, i) => i !== idx))
  }

  const moveField = (idx, dir) => {
    const target = idx + dir
    if (target < 0 || target >= fields.length) return
    const next = [...fields]
    const tmp = next[idx]
    next[idx] = next[target]
    next[target] = tmp
    setFields(next)
  }

  const handleSave = () => {
    if (!name.trim()) return
    const hasTitle = fields.some(f => f.mapsTo === 'title')
    const finalFields = hasTitle ? fields : [
      { id: `ff_${Date.now()}`, label: t.formTitleField ?? 'Title', type: 'text', mapsTo: 'title', required: true, options: '', placeholder: '', defaultValue: '' },
      ...fields,
    ]
    onSave({
      id: form?.id ?? `form_${Date.now()}`,
      name: name.trim(),
      description: desc.trim(),
      defaultSection,
      fields: finalFields.map(f => ({
        ...f,
        options: typeof f.options === 'string' ? f.options : (f.options ?? []).join(', '),
      })),
    })
  }

  return (
    <div style={{ padding: '14px', background: 'var(--bg2)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Name & description */}
      <div>
        <label style={labelStyle}>{t.formName ?? 'Form name'}</label>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder={t.formNamePlaceholder ?? 'e.g. Bug Report'} style={{ ...inputStyle, fontWeight: 500, fontSize: 13 }} autoFocus />
      </div>
      <div>
        <label style={labelStyle}>{t.formDesc ?? 'Description'}</label>
        <input value={desc} onChange={e => setDesc(e.target.value)}
          placeholder={t.formDescPlaceholder ?? 'Form description (optional)'} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>{t.formDefaultSection ?? 'Default section'}</label>
        <select value={defaultSection} onChange={e => setDefaultSection(e.target.value)} style={selectStyle}>
          {sections.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Fields builder */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>{t.formFields ?? 'Fields'}</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setShowPreview(!showPreview)}
              style={{ fontSize: 10, color: showPreview ? '#fff' : 'var(--accent)', background: showPreview ? 'var(--accent)' : 'none', border: '1px solid var(--accent)40', borderRadius: 'var(--r1)', padding: '1px 6px', cursor: 'pointer' }}>
              {t.formPreview ?? 'Preview'}
            </button>
            <button onClick={addField}
              style={{ fontSize: 10, color: 'var(--accent)', background: 'none', border: '1px solid var(--accent)40', borderRadius: 'var(--r1)', padding: '1px 6px', cursor: 'pointer' }}>
              + {t.formAddField ?? 'Add field'}
            </button>
          </div>
        </div>

        {fields.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--tx3)', fontStyle: 'italic', padding: '4px 0' }}>
            {t.formNoFields ?? 'No fields yet. Add one to get started.'}
          </div>
        )}

        {fields.map((field, idx) => (
          <FieldEditor key={field.id} field={field} idx={idx} total={fields.length}
            t={t} USERS={USERS} inputStyle={inputStyle} selectStyle={selectStyle} labelStyle={labelStyle}
            onUpdate={(patch) => updateField(idx, patch)}
            onRemove={() => removeField(idx)}
            onMove={(dir) => moveField(idx, dir)}
          />
        ))}
      </div>

      {/* Live preview */}
      {showPreview && fields.length > 0 && (
        <div style={sectionStyle}>
          <label style={{ ...labelStyle, marginBottom: 8 }}>{t.formPreview ?? 'Preview'}</label>
          <FormPreview name={name} description={desc} fields={fields} t={t} />
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        <button onClick={handleSave}
          style={{ fontSize: 12, padding: '5px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer', fontWeight: 500 }}>
          {form ? (t.save ?? 'Save') : (t.add ?? 'Add')}
        </button>
        <button onClick={onCancel}
          style={{ fontSize: 12, padding: '5px 14px', background: 'var(--bg1)', color: 'var(--tx2)', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', cursor: 'pointer' }}>
          {t.cancel ?? 'Cancel'}
        </button>
        {form && onDelete && (
          <button onClick={onDelete}
            style={{ fontSize: 12, padding: '5px 14px', color: 'var(--c-danger)', marginLeft: 'auto', background: 'none', border: '1px solid var(--c-danger)40', borderRadius: 'var(--r1)', cursor: 'pointer' }}>
            {t.delete ?? 'Delete'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Single field editor row ─────────────────────────────────

function FieldEditor({ field, idx, total, t, USERS: _USERS, inputStyle, selectStyle, labelStyle, onUpdate, onRemove, onMove }) {
  const [expanded, setExpanded] = useState(!field.label)
  const ftDef = FIELD_TYPES.find(ft => ft.id === field.type)

  return (
    <div style={{
      padding: '8px 10px', background: 'var(--bg2)', borderRadius: 'var(--r1)',
      marginBottom: 4, border: '1px solid var(--bd3)',
    }}>
      {/* Compact header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Move arrows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flexShrink: 0 }}>
          <button onClick={() => onMove(-1)} disabled={idx === 0} aria-label="Move field up"
            style={{ fontSize: 9, color: idx === 0 ? 'var(--bd3)' : 'var(--tx3)', background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', padding: 0, lineHeight: 1 }}>▲</button>
          <button onClick={() => onMove(1)} disabled={idx === total - 1} aria-label="Move field down"
            style={{ fontSize: 9, color: idx === total - 1 ? 'var(--bd3)' : 'var(--tx3)', background: 'none', border: 'none', cursor: idx === total - 1 ? 'default' : 'pointer', padding: 0, lineHeight: 1 }}>▼</button>
        </div>

        {/* Type icon */}
        <span style={{ fontSize: 12, color: 'var(--tx3)', width: 18, textAlign: 'center', flexShrink: 0 }}>{ftDef?.icon ?? '?'}</span>

        {/* Label input */}
        <input value={field.label} onChange={e => onUpdate({ label: e.target.value })}
          placeholder={t.formFieldLabel ?? 'Field label'}
          style={{ ...inputStyle, flex: 1, fontWeight: 500, border: 'none', background: 'transparent', padding: '2px 4px' }} />

        {/* Required toggle */}
        <label style={{ fontSize: 10, color: field.required ? 'var(--c-danger)' : 'var(--tx3)', display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', flexShrink: 0 }}>
          <input type="checkbox" checked={field.required} onChange={e => onUpdate({ required: e.target.checked })}
            style={{ width: 12, height: 12 }} />
          {t.formRequired ?? 'Req'}
        </label>

        {/* Expand toggle */}
        <button onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Collapse field' : 'Expand field'}
          style={{ fontSize: 10, color: 'var(--tx3)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>
          {expanded ? '▾' : '▸'}
        </button>

        {/* Delete */}
        <button onClick={onRemove} aria-label="Delete field"
          style={{ fontSize: 14, color: 'var(--c-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1, opacity: 0.6 }}>×</button>
      </div>

      {/* Expanded config */}
      {expanded && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 24 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t.formFieldType ?? 'Type'}</label>
              <select value={field.type} onChange={e => onUpdate({ type: e.target.value })} style={selectStyle}>
                {FIELD_TYPES.map(ft => <option key={ft.id} value={ft.id}>{ft.icon} {ft.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t.formFieldMapsTo ?? 'Maps to'}</label>
              <select value={field.mapsTo} onChange={e => onUpdate({ mapsTo: e.target.value })} style={selectStyle}>
                {TASK_MAPPINGS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
          </div>

          {/* Placeholder */}
          <div>
            <label style={labelStyle}>{t.formPlaceholder ?? 'Placeholder'}</label>
            <input value={field.placeholder ?? ''} onChange={e => onUpdate({ placeholder: e.target.value })}
              placeholder={t.formPlaceholderHint ?? 'Hint text shown in empty field…'} style={inputStyle} />
          </div>

          {/* Default value */}
          {field.type !== 'checkbox' && (
            <div>
              <label style={labelStyle}>{t.formDefaultValue ?? 'Default value'}</label>
              <input value={field.defaultValue ?? ''} onChange={e => onUpdate({ defaultValue: e.target.value })}
                placeholder={t.formDefaultValueHint ?? 'Pre-filled value (optional)'} style={inputStyle} />
            </div>
          )}

          {/* Options for select */}
          {field.type === 'select' && (
            <div>
              <label style={labelStyle}>{t.formFieldOptions ?? 'Options (comma separated)'}</label>
              <input value={field.options ?? ''} onChange={e => onUpdate({ options: e.target.value })}
                placeholder="Option 1, Option 2, Option 3" style={inputStyle} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Live form preview ───────────────────────────────────────

function FormPreview({ name, description, fields, t }) {
  const previewInputStyle = {
    fontSize: 13, padding: '7px 10px', borderRadius: 'var(--r1)',
    border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx1)', width: '100%',
  }

  return (
    <div style={{ background: 'var(--bg2)', borderRadius: 'var(--r1)', padding: '14px', border: '1px dashed var(--bd3)' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx1)', marginBottom: 2 }}>{name || (t.formName ?? 'Form name')}</div>
      {description && <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 10 }}>{description}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {fields.map(field => (
          <div key={field.id}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx2)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
              {field.label || '(untitled)'}
              {field.required && <span style={{ color: 'var(--c-danger)' }}>*</span>}
            </label>

            {field.type === 'text' && (
              <input disabled placeholder={field.placeholder || ''} defaultValue={field.defaultValue || ''} style={previewInputStyle} />
            )}
            {field.type === 'textarea' && (
              <textarea disabled rows={2} placeholder={field.placeholder || ''} defaultValue={field.defaultValue || ''} style={{ ...previewInputStyle, resize: 'none' }} />
            )}
            {field.type === 'select' && (
              <select disabled style={{ ...previewInputStyle, cursor: 'default' }}>
                <option>{t.formSelectOption ?? 'Select...'}</option>
                {(typeof field.options === 'string' ? field.options.split(',') : field.options ?? [])
                  .map(o => o.trim()).filter(Boolean)
                  .map(o => <option key={o}>{o}</option>)
                }
              </select>
            )}
            {field.type === 'date' && (
              <input type="date" disabled defaultValue={field.defaultValue || ''} style={previewInputStyle} />
            )}
            {field.type === 'number' && (
              <input type="number" disabled placeholder={field.placeholder || ''} defaultValue={field.defaultValue || ''} style={previewInputStyle} />
            )}
            {field.type === 'checkbox' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--tx2)' }}>
                <input type="checkbox" disabled /> {field.placeholder || field.label || 'Check'}
              </label>
            )}
            {field.type === 'url' && (
              <input type="url" disabled placeholder={field.placeholder || 'https://…'} defaultValue={field.defaultValue || ''} style={previewInputStyle} />
            )}
            {field.type === 'email' && (
              <input type="email" disabled placeholder={field.placeholder || 'user@example.com'} defaultValue={field.defaultValue || ''} style={previewInputStyle} />
            )}
          </div>
        ))}
      </div>

      <button disabled style={{ marginTop: 12, fontSize: 12, padding: '6px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r1)', opacity: 0.6 }}>
        {t.formSubmit ?? 'Submit'}
      </button>
    </div>
  )
}
