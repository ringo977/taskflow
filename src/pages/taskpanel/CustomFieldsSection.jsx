export default function CustomFieldsSection({ task, project, onUpd, sectionTitle, t, readOnly }) {
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
              <input value={values[f.id] ?? ''} onChange={e => setVal(f.id, e.target.value)} disabled={readOnly}
                style={{ fontSize: 12, padding: '4px 8px', opacity: readOnly ? 0.5 : 1 }} />
            )}
            {f.type === 'number' && (
              <input type="number" value={values[f.id] ?? ''} onChange={e => setVal(f.id, e.target.value)} disabled={readOnly}
                style={{ fontSize: 12, padding: '4px 8px', width: 100, opacity: readOnly ? 0.5 : 1 }} />
            )}
            {f.type === 'select' && (
              <select value={values[f.id] ?? ''} onChange={e => setVal(f.id, e.target.value)} disabled={readOnly}
                style={{ fontSize: 12, padding: '4px 8px', opacity: readOnly ? 0.5 : 1 }}>
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
