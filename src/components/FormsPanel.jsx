import { useState } from 'react'
import { useLang } from '@/i18n'

/**
 * FormsPanel — per-project form builder (displayed in ProjectOverview).
 * Forms are stored in project.forms JSONB. When submitted, each form
 * creates a task with pre-filled fields.
 */

const FIELD_TYPES = [
  { id: 'text', label: 'Text', icon: 'Aa' },
  { id: 'textarea', label: 'Long text', icon: '¶' },
  { id: 'select', label: 'Select', icon: '▾' },
  { id: 'date', label: 'Date', icon: '📅' },
]

const TASK_MAPPINGS = [
  { id: 'title', label: 'Title' },
  { id: 'desc', label: 'Description' },
  { id: 'who', label: 'Assignee' },
  { id: 'due', label: 'Due date' },
  { id: 'pri', label: 'Priority' },
  { id: 'none', label: '— (extra info)' },
]

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={sectionTitleStyle}>{t.forms ?? 'Forms'}</div>
        {!adding && (
          <button onClick={() => { setAdding(true); setEditId(null) }}
            style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: '1px solid var(--accent)40', borderRadius: 'var(--r1)', padding: '2px 7px', cursor: 'pointer' }}>
            +
          </button>
        )}
      </div>

      {forms.map(form => (
        editId === form.id ? (
          <FormEditor key={form.id} form={form} sections={sections} t={t}
            onSave={saveForm} onCancel={() => setEditId(null)} onDelete={() => deleteForm(form.id)} />
        ) : (
          <div key={form.id} onClick={() => setEditId(form.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg2)', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', marginBottom: 6, cursor: 'pointer' }}>
            <span style={{ fontSize: 14 }}>📋</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx1)' }}>{form.name}</div>
              <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
                {form.fields?.length ?? 0} {t.formFields ?? 'fields'} → {form.defaultSection || sections[0] || 'To Do'}
              </div>
            </div>
          </div>
        )
      ))}

      {forms.length === 0 && !adding && (
        <div style={{ fontSize: 12, color: 'var(--tx3)', fontStyle: 'italic' }}>
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

// ── Form editor ──────────────────────────────────────────────

function FormEditor({ form, sections, t, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(form?.name ?? '')
  const [desc, setDesc] = useState(form?.description ?? '')
  const [defaultSection, setDefaultSection] = useState(form?.defaultSection ?? sections[0] ?? '')
  const [fields, setFields] = useState(form?.fields ?? [])

  const inputStyle = { fontSize: 12, padding: '5px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx1)', width: '100%' }
  const selectStyle = { ...inputStyle, cursor: 'pointer' }
  const labelStyle = { fontSize: 11, color: 'var(--tx3)', marginBottom: 3, display: 'block' }

  const addField = () => {
    setFields([...fields, { id: `ff_${Date.now()}`, label: '', type: 'text', mapsTo: 'none', required: false, options: '' }])
  }

  const updateField = (idx, patch) => {
    setFields(fields.map((f, i) => i === idx ? { ...f, ...patch } : f))
  }

  const removeField = (idx) => {
    setFields(fields.filter((_, i) => i !== idx))
  }

  const handleSave = () => {
    if (!name.trim()) return
    // Ensure at least one field maps to title
    const hasTitle = fields.some(f => f.mapsTo === 'title')
    const finalFields = hasTitle ? fields : [
      { id: `ff_${Date.now()}`, label: t.formTitleField ?? 'Title', type: 'text', mapsTo: 'title', required: true, options: '' },
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
    <div style={{ padding: '10px', background: 'var(--bg2)', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div>
        <label style={labelStyle}>{t.formName ?? 'Form name'}</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder={t.formNamePlaceholder ?? 'e.g. Bug report, Experiment request'} style={inputStyle} autoFocus />
      </div>
      <div>
        <label style={labelStyle}>{t.formDescription ?? 'Description (shown to submitter)'}</label>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder={t.formDescPlaceholder ?? 'What is this form for?'} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>{t.formDefaultSection ?? 'Create task in section'}</label>
        <select value={defaultSection} onChange={e => setDefaultSection(e.target.value)} style={selectStyle}>
          {sections.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Fields */}
      <div>
        <label style={labelStyle}>{t.formFields ?? 'Fields'}</label>
        {fields.map((field, idx) => (
          <div key={field.id} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
            <input value={field.label} onChange={e => updateField(idx, { label: e.target.value })}
              placeholder={t.formFieldLabel ?? 'Label'} style={{ ...inputStyle, flex: 2 }} />
            <select value={field.type} onChange={e => updateField(idx, { type: e.target.value })}
              style={{ ...selectStyle, flex: 1 }}>
              {FIELD_TYPES.map(ft => <option key={ft.id} value={ft.id}>{ft.icon} {ft.label}</option>)}
            </select>
            <select value={field.mapsTo} onChange={e => updateField(idx, { mapsTo: e.target.value })}
              style={{ ...selectStyle, flex: 1 }}>
              {TASK_MAPPINGS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'flex', alignItems: 'center', gap: 2, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={field.required} onChange={e => updateField(idx, { required: e.target.checked })} />
              {t.formRequired ?? 'Req'}
            </label>
            {field.type === 'select' && (
              <input value={field.options} onChange={e => updateField(idx, { options: e.target.value })}
                placeholder={t.formOptions ?? 'Options (comma-sep)'} style={{ ...inputStyle, flex: 2 }} />
            )}
            <button onClick={() => removeField(idx)} style={{ background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 14, padding: '0 2px' }}>✕</button>
          </div>
        ))}
        <button onClick={addField} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: '1px solid var(--accent)40', borderRadius: 'var(--r1)', padding: '2px 8px', cursor: 'pointer', marginTop: 2 }}>
          + {t.formAddField ?? 'Add field'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        <button onClick={handleSave} style={{ fontSize: 12, padding: '4px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer' }}>
          {form ? (t.save ?? 'Save') : (t.add ?? 'Add')}
        </button>
        <button onClick={onCancel} style={{ fontSize: 12, padding: '4px 12px' }}>{t.cancel ?? 'Cancel'}</button>
        {form && onDelete && (
          <button onClick={onDelete} style={{ fontSize: 12, padding: '4px 12px', color: 'var(--c-danger)', marginLeft: 'auto', background: 'none', border: '1px solid var(--c-danger)40', borderRadius: 'var(--r1)', cursor: 'pointer' }}>
            {t.delete ?? 'Delete'}
          </button>
        )}
      </div>
    </div>
  )
}
