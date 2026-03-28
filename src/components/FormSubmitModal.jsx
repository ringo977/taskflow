import { useState } from 'react'
import { useLang } from '@/i18n'

/**
 * FormSubmitModal — renders a project form for submission.
 * On submit, creates a task with mapped fields.
 */
export default function FormSubmitModal({ form, sections, onSubmit, onClose }) {
  const t = useLang()
  const [values, setValues] = useState(() => {
    const init = {}
    for (const f of form.fields ?? []) init[f.id] = ''
    return init
  })
  const [errors, setErrors] = useState({})

  const setValue = (fid, val) => {
    setValues(v => ({ ...v, [fid]: val }))
    setErrors(e => ({ ...e, [fid]: undefined }))
  }

  const handleSubmit = () => {
    // Validate required fields
    const errs = {}
    for (const f of form.fields ?? []) {
      if (f.required && !values[f.id]?.trim()) errs[f.id] = true
    }
    if (Object.keys(errs).length) { setErrors(errs); return }

    // Build task from mapped fields
    const task = {
      title: '',
      desc: '',
      who: '',
      due: '',
      pri: 'medium',
      sec: form.defaultSection || sections?.[0] || 'To Do',
    }

    const extraLines = []

    for (const f of form.fields ?? []) {
      const val = values[f.id]?.trim() ?? ''
      if (!val) continue
      switch (f.mapsTo) {
        case 'title': task.title = val; break
        case 'desc': task.desc = val; break
        case 'who': task.who = val; break
        case 'due': task.due = val; break
        case 'pri': task.pri = val; break
        default: extraLines.push(`**${f.label}**: ${val}`)
      }
    }

    // Append unmapped fields to description
    if (extraLines.length) {
      task.desc = [task.desc, ...extraLines].filter(Boolean).join('\n')
    }

    // Fallback title
    if (!task.title) task.title = `${form.name} — ${new Date().toLocaleDateString()}`

    onSubmit(task)
  }

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 120,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
  const modalStyle = {
    background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)',
    padding: '24px', width: 440, maxHeight: '80vh', overflow: 'auto',
    boxShadow: 'var(--shadow-lg)',
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx1)', marginBottom: 4 }}>{form.name}</div>
        {form.description && (
          <div style={{ fontSize: 13, color: 'var(--tx3)', marginBottom: 14 }}>{form.description}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(form.fields ?? []).map(field => (
            <div key={field.id}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx2)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                {field.label}
                {field.required && <span style={{ color: 'var(--c-danger)' }}>*</span>}
              </label>

              {field.type === 'text' && (
                <input
                  value={values[field.id] ?? ''}
                  onChange={e => setValue(field.id, e.target.value)}
                  style={{ fontSize: 13, padding: '7px 10px', borderRadius: 'var(--r1)', border: `1px solid ${errors[field.id] ? 'var(--c-danger)' : 'var(--bd3)'}`, background: 'var(--bg2)', color: 'var(--tx1)', width: '100%' }}
                />
              )}

              {field.type === 'textarea' && (
                <textarea
                  value={values[field.id] ?? ''}
                  onChange={e => setValue(field.id, e.target.value)}
                  rows={3}
                  style={{ fontSize: 13, padding: '7px 10px', borderRadius: 'var(--r1)', border: `1px solid ${errors[field.id] ? 'var(--c-danger)' : 'var(--bd3)'}`, background: 'var(--bg2)', color: 'var(--tx1)', width: '100%', resize: 'vertical' }}
                />
              )}

              {field.type === 'select' && (
                <select
                  value={values[field.id] ?? ''}
                  onChange={e => setValue(field.id, e.target.value)}
                  style={{ fontSize: 13, padding: '7px 10px', borderRadius: 'var(--r1)', border: `1px solid ${errors[field.id] ? 'var(--c-danger)' : 'var(--bd3)'}`, background: 'var(--bg2)', color: 'var(--tx1)', width: '100%', cursor: 'pointer' }}
                >
                  <option value="">{t.formSelectOption ?? 'Select...'}</option>
                  {(typeof field.options === 'string' ? field.options.split(',') : field.options ?? [])
                    .map(o => o.trim()).filter(Boolean)
                    .map(o => <option key={o} value={o}>{o}</option>)
                  }
                </select>
              )}

              {field.type === 'date' && (
                <input
                  type="date"
                  value={values[field.id] ?? ''}
                  onChange={e => setValue(field.id, e.target.value)}
                  style={{ fontSize: 13, padding: '7px 10px', borderRadius: 'var(--r1)', border: `1px solid ${errors[field.id] ? 'var(--c-danger)' : 'var(--bd3)'}`, background: 'var(--bg2)', color: 'var(--tx1)', width: '100%' }}
                />
              )}

              {errors[field.id] && (
                <div style={{ fontSize: 11, color: 'var(--c-danger)', marginTop: 2 }}>{t.formFieldRequired ?? 'This field is required'}</div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button onClick={handleSubmit}
            style={{ fontSize: 13, padding: '8px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer', fontWeight: 500 }}>
            {t.formSubmit ?? 'Submit'}
          </button>
          <button onClick={onClose}
            style={{ fontSize: 13, padding: '8px 16px', borderRadius: 'var(--r1)' }}>
            {t.cancel ?? 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}
