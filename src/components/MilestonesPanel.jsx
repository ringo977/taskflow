/**
 * MilestonesPanel — project-level structured milestone management.
 *
 * Renders in ProjectOverview main area, after WorkpackagesPanel.
 * Shows milestone list with progress bars (from linked tasks),
 * inline create/edit form, and status color coding.
 *
 * Milestones are first-class entities — tasks are LINKED TO them,
 * not "are" them. Each milestone has a single target_date (point),
 * typed owner, and means of verification (description).
 */
import { useState, useMemo } from 'react'
import { useLang } from '@/i18n'
import { useOrgUsers } from '@/context/OrgUsersCtx'

const STATUS_COLORS = {
  draft:    'var(--tx3)',
  pending:  'var(--c-brand)',
  achieved: 'var(--c-success)',
  missed:   'var(--c-danger)',
}

const STATUS_KEYS = ['draft', 'pending', 'achieved', 'missed']

export default function MilestonesPanel({
  milestones = [], tasks = [], workpackages = [], projectPartners = [],
  onSave, onRemove, loading,
  canManage = false, sectionTitleStyle = {},
}) {
  const t = useLang()
  const users = useOrgUsers()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [form, setForm] = useState({
    code: '', name: '', description: '',
    ownerUserId: null, ownerPartnerId: null,
    workpackageId: null, targetDate: '', status: 'draft',
  })

  // Build owner lookup maps
  const ownerOptions = useMemo(() => {
    const members = users.filter(u => u.name).map(u => ({ type: 'user', id: u.id, label: u.name }))
    const partners = (projectPartners ?? []).filter(pp => pp.partner?.isActive).map(pp => ({ type: 'partner', id: pp.partner.id, label: pp.partner.name }))
    return { members, partners }
  }, [users, projectPartners])

  const resolveOwnerLabel = (ms) => {
    if (ms.ownerUserId) {
      const u = users.find(u => u.id === ms.ownerUserId)
      return u?.name ?? '?'
    }
    if (ms.ownerPartnerId) {
      const pp = (projectPartners ?? []).find(pp => pp.partnerId === ms.ownerPartnerId)
      return pp?.partner?.name ?? '?'
    }
    return null
  }

  // Task stats per milestone
  const msStats = useMemo(() => {
    const map = {}
    for (const ms of milestones) {
      const msTasks = tasks.filter(tk => tk.milestoneId === ms.id)
      const done = msTasks.filter(tk => tk.done).length
      map[ms.id] = { total: msTasks.length, done, pct: msTasks.length ? Math.round(done / msTasks.length * 100) : 0, tasks: msTasks }
    }
    return map
  }, [milestones, tasks])

  const resetForm = () => {
    setForm({
      code: '', name: '', description: '',
      ownerUserId: null, ownerPartnerId: null,
      workpackageId: null, targetDate: '', status: 'draft',
    })
    setEditId(null)
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) return
    try {
      await onSave(editId ? { ...form, id: editId } : form)
      resetForm()
    } catch { /* handled by hook */ }
  }

  const startEdit = (ms) => {
    setForm({
      code: ms.code,
      name: ms.name,
      description: ms.description ?? '',
      ownerUserId: ms.ownerUserId ?? null,
      ownerPartnerId: ms.ownerPartnerId ?? null,
      workpackageId: ms.workpackageId ?? null,
      targetDate: ms.targetDate ?? '',
      status: ms.status,
    })
    setEditId(ms.id)
    setShowForm(true)
  }

  const handleOwnerChange = (value) => {
    if (!value) {
      setForm(f => ({ ...f, ownerUserId: null, ownerPartnerId: null }))
    } else if (value.startsWith('user:')) {
      setForm(f => ({ ...f, ownerUserId: value.slice(5), ownerPartnerId: null }))
    } else if (value.startsWith('partner:')) {
      setForm(f => ({ ...f, ownerUserId: null, ownerPartnerId: value.slice(8) }))
    }
  }

  const currentOwnerValue = form.ownerUserId
    ? `user:${form.ownerUserId}`
    : form.ownerPartnerId
      ? `partner:${form.ownerPartnerId}`
      : ''

  const inputStyle = {
    width: '100%', fontSize: 12, padding: '6px 8px', boxSizing: 'border-box',
    border: '1px solid var(--bd3)', borderRadius: 'var(--r1)',
    background: 'var(--bg2)', color: 'var(--tx1)',
  }

  const statusLabel = (s) => t[`msStatus${s.charAt(0).toUpperCase() + s.slice(1)}`] ?? s

  // Resolve WP code for display
  const resolveWpLabel = (wpId) => {
    if (!wpId) return null
    const wp = workpackages.find(w => w.id === wpId)
    return wp ? wp.code : null
  }

  return (
    <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ ...sectionTitleStyle }}>{t.milestones ?? 'Milestones'}</div>
        {canManage && !showForm && (
          <button onClick={() => setShowForm(true)}
            style={{ fontSize: 12, padding: '3px 10px', background: 'var(--c-success, #4CAF50)', color: '#fff', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer', fontWeight: 600 }}>
            + {t.addMilestone ?? 'Add MS'}
          </button>
        )}
      </div>

      {/* Milestone list */}
      {milestones.length === 0 && !loading && !showForm && (
        <div style={{ fontSize: 12, color: 'var(--tx3)', fontStyle: 'italic' }}>
          {t.noMilestones ?? 'No milestones'}
        </div>
      )}

      {milestones.map(ms => {
        const stats = msStats[ms.id] ?? { total: 0, done: 0, pct: 0, tasks: [] }
        const isExpanded = expandedId === ms.id
        const ownerLabel = resolveOwnerLabel(ms)
        const color = STATUS_COLORS[ms.status] ?? 'var(--tx3)'
        const wpLabel = resolveWpLabel(ms.workpackageId)

        return (
          <div key={ms.id} style={{ marginBottom: 8, border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', overflow: 'hidden' }}>
            {/* Header row */}
            <div onClick={() => setExpandedId(isExpanded ? null : ms.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer', background: isExpanded ? 'var(--bg2)' : 'transparent' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color, background: color + '18', padding: '2px 6px', borderRadius: 3, flexShrink: 0 }}>
                {ms.code}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ms.name}
              </span>
              {wpLabel && (
                <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 'var(--r1)', background: 'color-mix(in srgb, var(--c-purple, #9C27B0) 12%, transparent)', color: 'var(--c-purple, #9C27B0)', fontWeight: 600, flexShrink: 0 }}>{wpLabel}</span>
              )}
              {ownerLabel && (
                <span style={{ fontSize: 11, color: 'var(--tx3)', flexShrink: 0 }}>{ownerLabel}</span>
              )}
              {stats.total > 0 && (
                <span style={{ fontSize: 11, color: 'var(--tx3)', flexShrink: 0 }}>{stats.done}/{stats.total}</span>
              )}
              <span style={{ fontSize: 11, color, fontWeight: 500, flexShrink: 0 }}>{statusLabel(ms.status)}</span>
              {canManage && (
                <button onClick={e => { e.stopPropagation(); startEdit(ms) }} title={t.editMs ?? 'Edit'}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--tx3)', fontSize: 12, padding: '2px 4px' }}>✎</button>
              )}
            </div>

            {/* Progress bar */}
            {stats.total > 0 && (
              <div style={{ height: 3, background: 'var(--bg2)' }}>
                <div style={{ height: '100%', width: `${stats.pct}%`, background: color, transition: 'width 0.3s' }} />
              </div>
            )}

            {/* Expanded details */}
            {isExpanded && (
              <div style={{ padding: '10px 12px', background: 'var(--bg2)', borderTop: '1px solid var(--bd3)' }}>
                {ms.description && (
                  <div style={{ fontSize: 12, color: 'var(--tx2)', marginBottom: 8, lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600, color: 'var(--tx3)', fontSize: 10, textTransform: 'uppercase' }}>{t.msMeansOfVerification ?? 'Means of verification'}</span><br />
                    {ms.description}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--tx3)', marginBottom: 8, flexWrap: 'wrap' }}>
                  {ms.targetDate && <span>{t.msTargetDate ?? 'Target'}: {ms.targetDate}</span>}
                  {ownerLabel && <span>{t.msOwner ?? 'Owner'}: {ownerLabel}</span>}
                  {wpLabel && <span>{t.msWorkpackage ?? 'WP'}: {wpLabel}</span>}
                </div>
                {stats.tasks.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx3)', marginBottom: 4 }}>{t.msTasks ?? 'Linked tasks'} ({stats.total})</div>
                    {stats.tasks.slice(0, 8).map(tk => (
                      <div key={tk.id} style={{ fontSize: 12, color: tk.done ? 'var(--c-success)' : 'var(--tx2)', padding: '2px 0' }}>
                        {tk.done ? '✓' : '○'} {tk.title}
                      </div>
                    ))}
                    {stats.tasks.length > 8 && (
                      <div style={{ fontSize: 11, color: 'var(--tx3)', padding: '2px 0' }}>… +{stats.tasks.length - 8}</div>
                    )}
                  </div>
                )}
                {canManage && (
                  <button onClick={() => onRemove(ms.id, `${ms.code} ${ms.name}`)}
                    style={{ fontSize: 11, color: 'var(--c-danger)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 0 0', marginTop: 4 }}>
                    {t.deleteMs ?? 'Delete MS'}
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Create / edit form */}
      {showForm && (
        <div style={{ marginTop: 10, padding: 12, border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', background: 'var(--bg2)' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              placeholder={t.msCode ?? 'Code (e.g. MS1)'} style={{ ...inputStyle, width: 90, flex: 'none' }} autoFocus />
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={t.msName ?? 'Name'} style={{ ...inputStyle, flex: 1 }} />
          </div>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder={t.msDescription ?? 'Means of verification'} rows={2}
            style={{ ...inputStyle, marginBottom: 6, resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              style={{ ...inputStyle, flex: 1 }}>
              {STATUS_KEYS.map(s => (
                <option key={s} value={s}>{statusLabel(s)}</option>
              ))}
            </select>
            <input type="date" value={form.targetDate ?? ''} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value || null }))}
              placeholder={t.msTargetDate ?? 'Target date'} title={t.msTargetDate ?? 'Target date'}
              style={{ ...inputStyle, flex: 1 }} />
          </div>
          {/* WP selector (optional scoping) */}
          {workpackages.length > 0 && (
            <select value={form.workpackageId ?? ''} onChange={e => setForm(f => ({ ...f, workpackageId: e.target.value || null }))}
              style={{ ...inputStyle, marginBottom: 6, color: form.workpackageId ? 'var(--tx1)' : 'var(--tx3)' }}>
              <option value="">{t.msWorkpackage ?? 'WP (optional)'}</option>
              {workpackages.filter(w => w.isActive).map(w => (
                <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
              ))}
            </select>
          )}
          {/* Owner selector (unified: members + partners) */}
          <select value={currentOwnerValue} onChange={e => handleOwnerChange(e.target.value)}
            style={{ ...inputStyle, marginBottom: 8, color: currentOwnerValue ? 'var(--tx1)' : 'var(--tx3)' }}>
            <option value="">{t.selectOwner ?? 'Select owner…'}</option>
            {ownerOptions.members.length > 0 && (
              <optgroup label={t.ownerMember ?? 'Members'}>
                {ownerOptions.members.map(m => (
                  <option key={`user:${m.id}`} value={`user:${m.id}`}>{m.label}</option>
                ))}
              </optgroup>
            )}
            {ownerOptions.partners.length > 0 && (
              <optgroup label={t.ownerPartner ?? 'Partners'}>
                {ownerOptions.partners.map(p => (
                  <option key={`partner:${p.id}`} value={`partner:${p.id}`}>{p.label}</option>
                ))}
              </optgroup>
            )}
          </select>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button onClick={resetForm}
              style={{ fontSize: 12, padding: '4px 10px', background: 'transparent', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', color: 'var(--tx3)', cursor: 'pointer' }}>
              {t.cancel}
            </button>
            <button onClick={handleSave}
              style={{ fontSize: 12, padding: '4px 10px', background: 'var(--c-success, #4CAF50)', color: '#fff', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer', fontWeight: 600 }}>
              {editId ? (t.save ?? 'Save') : (t.addMilestone ?? 'Add MS')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
