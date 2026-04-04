/**
 * PartnersPanel — org-level partner/team management + project linking.
 *
 * Renders in ProjectOverview right sidebar, below ProjectMembersPanel.
 * Two modes: (1) project partners list with link/unlink,
 *            (2) inline form to create a new org-level partner.
 */
import { useState } from 'react'
import { useLang } from '@/i18n'
import Badge from '@/components/Badge'

const TYPE_COLORS = {
  team:       'var(--c-brand)',
  partner:    'var(--c-success)',
  vendor:     'var(--c-warning)',
  lab:        '#9C27B0',
  department: 'var(--tx2)',
  client:     '#FF5722',
}

const PARTNER_TYPES = ['team', 'partner', 'vendor', 'lab', 'department', 'client']

export default function PartnersPanel({
  orgPartners = [], projectPartners = [], loading,
  onSave, onRemove: _onRemove, onLink, onUnlink,
  projectId, canManage = false, sectionTitleStyle = {},
  partnerSuggestions = [], onDismissSuggestion,
}) {
  const t = useLang()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'partner', contactName: '', contactEmail: '', notes: '' })
  const [editId, setEditId] = useState(null)

  const linkedIds = new Set(projectPartners.map(pp => pp.partnerId))
  const unlinked = orgPartners.filter(p => !linkedIds.has(p.id) && p.isActive)

  const resetForm = () => {
    setForm({ name: '', type: 'partner', contactName: '', contactEmail: '', notes: '' })
    setEditId(null)
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    try {
      const saved = await onSave(editId ? { ...form, id: editId } : form)
      // Auto-link to project if it's a new partner
      if (!editId && saved?.id) await onLink(projectId, saved.id)
      resetForm()
    } catch { /* handled by hook */ }
  }

  const startEdit = (partner) => {
    setForm({
      name: partner.name,
      type: partner.type,
      contactName: partner.contactName ?? '',
      contactEmail: partner.contactEmail ?? '',
      notes: partner.notes ?? '',
    })
    setEditId(partner.id)
    setShowForm(true)
  }

  const inputStyle = {
    width: '100%', fontSize: 12, padding: '6px 8px', boxSizing: 'border-box',
    border: '1px solid var(--bd3)', borderRadius: 'var(--r1)',
    background: 'var(--bg2)', color: 'var(--tx1)',
  }

  return (
    <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ ...sectionTitleStyle, marginBottom: 10 }}>
        {t.partners ?? 'Partners / Teams'}
      </div>

      {/* Template partner suggestions banner */}
      {canManage && partnerSuggestions.length > 0 && (
        <div style={{ marginBottom: 10, padding: '8px 10px', background: 'var(--c-brand-bg, #e8f0fe)', borderRadius: 'var(--r1)', border: '1px solid var(--c-brand-border, #c5d9f7)' }}>
          <div style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 600, marginBottom: 6 }}>
            {t.suggestedPartners ?? 'Suggested from template'}
          </div>
          {partnerSuggestions.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Badge text={t[`type_${s.type}`] ?? s.type} color={TYPE_COLORS[s.type] ?? 'var(--tx3)'} />
              <span style={{ flex: 1, fontSize: 12, color: 'var(--tx1)' }}>{s.name}</span>
              {s.roleLabel && <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{s.roleLabel}</span>}
              <button
                onClick={async () => {
                  try {
                    const saved = await onSave({ name: s.name, type: s.type })
                    if (saved?.id) await onLink(projectId, saved.id, s.roleLabel ?? null)
                    if (onDismissSuggestion) onDismissSuggestion(i)
                  } catch { /* handled by hook */ }
                }}
                style={{ fontSize: 11, padding: '2px 8px', background: 'var(--c-brand)', color: '#fff', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer', fontWeight: 600 }}
              >
                {t.createAndLink ?? 'Create & Link'}
              </button>
              <button
                onClick={() => onDismissSuggestion?.(i)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--tx3)', fontSize: 12, padding: '2px 4px' }}
                title={t.dismiss ?? 'Dismiss'}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Project partners list */}
      {projectPartners.length === 0 && !loading && (
        <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 8 }}>
          {t.noPartners ?? 'No partners linked'}
        </div>
      )}
      {projectPartners.map(pp => {
        const p = pp.partner
        if (!p) return null
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--bd3)' }}>
            <Badge text={t[`type_${p.type}`] ?? p.type} color={TYPE_COLORS[p.type] ?? 'var(--tx3)'} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--tx1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
              {p.contactName && <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{p.contactName}</div>}
            </div>
            {pp.roleLabel && <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{pp.roleLabel}</span>}
            {canManage && (
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => startEdit(p)} title={t.edit ?? 'Edit'}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--tx3)', fontSize: 12, padding: '2px 4px' }}>✎</button>
                <button onClick={() => onUnlink(projectId, p.id)} title={t.unlinkPartner ?? 'Unlink'}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--c-danger)', fontSize: 12, padding: '2px 4px' }}>✕</button>
              </div>
            )}
          </div>
        )
      })}

      {/* Link existing partner */}
      {canManage && unlinked.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <select
            value=""
            onChange={e => { if (e.target.value) onLink(projectId, e.target.value) }}
            style={{ ...inputStyle, color: 'var(--tx3)' }}
          >
            <option value="">{t.linkPartner ?? '+ Link existing partner…'}</option>
            {unlinked.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({t[`type_${p.type}`] ?? p.type})</option>
            ))}
          </select>
        </div>
      )}

      {/* Create / edit form */}
      {canManage && !showForm && (
        <button onClick={() => setShowForm(true)}
          style={{ fontSize: 12, color: 'var(--c-brand)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 0', marginTop: 6 }}>
          + {t.addPartner ?? 'New partner'}
        </button>
      )}

      {showForm && (
        <div style={{ marginTop: 10, padding: 10, border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', background: 'var(--bg2)' }}>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder={t.partnerName ?? 'Name'} style={{ ...inputStyle, marginBottom: 6 }} autoFocus />
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            style={{ ...inputStyle, marginBottom: 6 }}>
            {PARTNER_TYPES.map(tp => (
              <option key={tp} value={tp}>{t[`type_${tp}`] ?? tp}</option>
            ))}
          </select>
          <input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
            placeholder={t.contactName ?? 'Contact name'} style={{ ...inputStyle, marginBottom: 6 }} />
          <input value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
            placeholder={t.contactEmail ?? 'Contact email'} style={{ ...inputStyle, marginBottom: 6 }} />
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder={t.partnerNotes ?? 'Notes'} rows={2}
            style={{ ...inputStyle, marginBottom: 8, resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button onClick={resetForm}
              style={{ fontSize: 12, padding: '4px 10px', background: 'transparent', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', color: 'var(--tx3)', cursor: 'pointer' }}>
              {t.cancel}
            </button>
            <button onClick={handleSave}
              style={{ fontSize: 12, padding: '4px 10px', background: 'var(--c-brand)', color: '#fff', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer', fontWeight: 600 }}>
              {editId ? (t.save ?? 'Save') : (t.addPartner ?? 'Add')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
