/**
 * DeliverablesRegister — table view of project deliverables with inline CRUD.
 */
import { useState } from 'react'
import { useLang } from '@/i18n'
import { fmtDate } from '@/utils/format'
import { isOverdue } from '@/utils/filters'
import DeliverableForm from './DeliverableForm'

const STATUS_COLORS = {
  draft: 'var(--tx3)',
  in_progress: 'var(--c-brand)',
  internal_review: 'var(--c-warning)',
  submitted: 'var(--c-purple)',
  accepted: 'var(--c-success)',
  delayed: 'var(--c-danger)',
}

const STATUS_KEYS = {
  draft: 'supDraft', in_progress: 'supInProgress', internal_review: 'supInternalReview',
  submitted: 'supSubmitted', accepted: 'supAccepted', delayed: 'supDelayed',
}

export default function DeliverablesRegister({ deliverables, loading, onSave, onDelete, onOpen, lang }) {
  const t = useLang()
  const [editing, setEditing] = useState(null) // null | 'new' | deliverable object
  const [filter, setFilter] = useState('')

  const filtered = filter
    ? deliverables.filter(d =>
      d.code.toLowerCase().includes(filter.toLowerCase()) ||
      d.title.toLowerCase().includes(filter.toLowerCase()) ||
      (d.owner ?? '').toLowerCase().includes(filter.toLowerCase()))
    : deliverables

  const [saveError, setSaveError] = useState(null)

  const handleSave = async (data) => {
    try {
      setSaveError(null)
      await onSave(data)
      setEditing(null)
    } catch (err) {
      setSaveError(err.message ?? 'Save failed')
    }
  }

  if (loading) return <div style={{ padding: 24, color: 'var(--tx3)', fontSize: 13 }}>Loading…</div>

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <input
          data-testid="deliverables-filter"
          type="text" placeholder="Filter…" value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ flex: 1, maxWidth: 260, padding: '6px 10px', fontSize: 13, border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', background: 'var(--bg1)', color: 'var(--tx1)' }}
        />
        <button
          data-testid="btn-add-deliverable"
          onClick={() => setEditing('new')}
          style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500, border: '1px solid var(--c-brand)', borderRadius: 'var(--r1)', background: 'var(--c-brand)', color: '#fff', cursor: 'pointer' }}
        >
          + {t.supAdd}
        </button>
      </div>

      {/* Form (inline) */}
      {saveError && (
        <div style={{ padding: '8px 12px', marginBottom: 8, background: 'color-mix(in srgb, var(--c-danger) 10%, transparent)', border: '1px solid var(--c-danger)', borderRadius: 'var(--r1)', fontSize: 12, color: 'var(--c-danger)' }}>
          {saveError}
        </div>
      )}
      {editing && (
        <DeliverableForm
          deliverable={editing === 'new' ? null : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Table */}
      {filtered.length === 0 && !editing ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--tx3)', fontSize: 13 }}>
          {t.supNoDeliverables}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table data-testid="deliverables-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--bd3)', textAlign: 'left' }}>
                <th style={thStyle}>{t.supCode}</th>
                <th style={thStyle}>{t.title}</th>
                <th style={thStyle}>{t.supOwner}</th>
                <th style={thStyle}>{t.supDueDate}</th>
                <th style={thStyle}>{t.supStatus}</th>
                <th style={thStyle}>{t.supLinkedTasks}</th>
                <th style={{ ...thStyle, width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--bd3)' }} className="row-interactive">
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600, color: 'var(--tx1)' }}>{d.code}</span>
                  </td>
                  <td style={tdStyle}>{d.title}</td>
                  <td style={tdStyle}>
                    <span style={{ color: 'var(--tx2)' }}>{d.owner || '—'}</span>
                  </td>
                  <td style={tdStyle}>
                    {d.dueDate ? (
                      <span style={{ color: isOverdue(d.dueDate) && d.status !== 'accepted' ? 'var(--c-danger)' : 'var(--tx2)' }}>
                        {fmtDate(d.dueDate, lang)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--r1)',
                      fontSize: 11, fontWeight: 500,
                      background: `color-mix(in srgb, ${STATUS_COLORS[d.status] ?? 'var(--tx3)'} 15%, transparent)`,
                      color: STATUS_COLORS[d.status] ?? 'var(--tx3)',
                    }}>
                      {t[STATUS_KEYS[d.status]] ?? d.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {d.linkedTaskIds.length > 0 ? (
                      <button onClick={() => onOpen?.(d.linkedTaskIds[0])}
                        style={{ fontSize: 12, color: 'var(--tx-info)', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>
                        {d.linkedTaskIds.length} task{d.linkedTaskIds.length > 1 ? 's' : ''}
                      </button>
                    ) : <span style={{ color: 'var(--tx3)' }}>—</span>}
                  </td>
                  <td style={{ ...tdStyle, display: 'flex', gap: 6 }}>
                    <button onClick={() => setEditing(d)}
                      style={actionBtnStyle}>
                      {t.supEdit}
                    </button>
                    <button onClick={() => onDelete?.(d.id, `${d.code} ${d.title}`)}
                      style={{ ...actionBtnStyle, color: 'var(--c-danger)' }}>
                      {t.supDelete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const thStyle = { padding: '8px 10px', fontSize: 11, fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.04em' }
const tdStyle = { padding: '10px 10px', color: 'var(--tx1)' }
const actionBtnStyle = { fontSize: 12, color: 'var(--tx-info)', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }
