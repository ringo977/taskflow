/**
 * ProjectSettings — configuration/admin view for a project (F1.4).
 *
 * Groups all config panels that were previously in ProjectOverview's
 * right column and bottom area: permissions, custom fields, rules,
 * forms, project type, project dates, and project actions.
 */
import { useState, useMemo, useCallback } from 'react'
import { useLang } from '@/i18n'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import RulesPanel from '@/components/RulesPanel'
import FormsPanel from '@/components/FormsPanel'
import ConfirmModal from '@/components/ConfirmModal'

const CARD = {
  background: 'var(--bg1)', borderRadius: 'var(--r2)',
  border: '1px solid var(--bd3)', padding: '16px 18px',
  boxShadow: 'var(--shadow-sm)',
}

const SECTION_TITLE = {
  fontSize: 12, fontWeight: 600, color: 'var(--tx3)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
}

const STATUS_CFG = {
  on_track:  { color: 'var(--c-success)', bg: 'color-mix(in srgb, var(--c-success) 10%, transparent)' },
  at_risk:   { color: 'var(--c-warning)', bg: 'color-mix(in srgb, var(--c-warning) 10%, transparent)' },
  off_track: { color: 'var(--c-danger)',  bg: 'color-mix(in srgb, var(--c-danger) 10%, transparent)' },
}

const FIELD_TYPES = [
  { id: 'text', label: 'Text', icon: 'Aa' },
  { id: 'number', label: 'Number', icon: '#' },
  { id: 'select', label: 'Select', icon: '▾' },
]

// ── CustomFieldsConfig (extracted from ProjectOverview) ─────
function CustomFieldsConfig({ proj, onUpdProj, t }) {
  const fields = useMemo(() => proj.customFields ?? [], [proj.customFields])
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('text')
  const [opts, setOpts] = useState('')

  const addField = useCallback(() => {
    if (!name.trim()) return
    const newField = {
      id: `cf_${Date.now()}`,
      name: name.trim(),
      type,
      ...(type === 'select' ? { options: opts.split(',').map(o => o.trim()).filter(Boolean) } : {}),
    }
    onUpdProj(proj.id, { customFields: [...fields, newField] })
    setName(''); setType('text'); setOpts(''); setAdding(false)
  }, [name, type, opts, fields, onUpdProj, proj.id])

  const removeField = (fid) => {
    onUpdProj(proj.id, { customFields: fields.filter(f => f.id !== fid) })
  }

  return (
    <div style={CARD}>
      <div style={{ ...SECTION_TITLE, marginBottom: 10 }}>{t.customFields ?? 'Custom fields'}</div>
      {fields.map(f => (
        <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--bd3)' }}>
          <span style={{ fontSize: 12, color: 'var(--tx3)', width: 20, textAlign: 'center' }}>
            {FIELD_TYPES.find(ft => ft.id === f.type)?.icon ?? '?'}
          </span>
          <span style={{ fontSize: 13, color: 'var(--tx1)', flex: 1 }}>{f.name}</span>
          {f.type === 'select' && <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{(f.options ?? []).join(', ')}</span>}
          <button onClick={() => removeField(f.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--tx3)', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>✕</button>
        </div>
      ))}
      {adding ? (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t.fieldName ?? 'Field name'} style={{ fontSize: 12 }} autoFocus onKeyDown={e => e.key === 'Enter' && addField()} />
          <div style={{ display: 'flex', gap: 4 }}>
            {FIELD_TYPES.map(ft => (
              <button key={ft.id} onClick={() => setType(ft.id)}
                style={{ fontSize: 11, padding: '3px 8px', background: type === ft.id ? 'var(--bg2)' : 'transparent', fontWeight: type === ft.id ? 500 : 400 }}>
                {ft.icon} {ft.label}
              </button>
            ))}
          </div>
          {type === 'select' && (
            <input value={opts} onChange={e => setOpts(e.target.value)} placeholder={t.selectOptions ?? 'Options (comma separated)'} style={{ fontSize: 12 }} />
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={addField} style={{ fontSize: 12, padding: '3px 10px' }}>{t.add ?? 'Add'}</button>
            <button onClick={() => { setAdding(false); setName('') }} style={{ fontSize: 12, padding: '3px 10px' }}>{t.cancel ?? 'Cancel'}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ fontSize: 12, color: 'var(--tx3)', borderColor: 'var(--bd3)', padding: '5px 10px', marginTop: 6 }}>+ {t.addField ?? 'Add field'}</button>
      )}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────
export default function ProjectSettings({
  project, sections, onUpdProj, currentUser,
  myProjectRoles = {}, onDeleteProject, onArchiveProject,
  onNavigate,
}) {
  const t = useLang()
  const USERS = useOrgUsers()
  const me = USERS.find(u => u.email === currentUser?.email)
  const isAdmin = me?.role === 'admin'
  const isManager = me?.role === 'manager'
  const canManage = isAdmin || (isManager && myProjectRoles[project?.id] === 'owner')
  const [confirmDel, setConfirmDel] = useState(false)

  const proj = project
  if (!proj) return null

  const statusLabels = { on_track: t.onTrack, at_risk: t.atRisk, off_track: t.offTrack }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '22px 26px', maxWidth: 720 }}>
      {/* Back to dashboard */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => onNavigate?.('dashboard')}
          style={{ fontSize: 13, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: '4px 8px' }}>
          ← {t.dashboard ?? 'Dashboard'}
        </button>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx1)', margin: '8px 0 0' }}>
          {t.projectSettings ?? 'Project Settings'}
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ── Status ───────────────────────────────────────── */}
        <div style={CARD}>
          <div style={{ ...SECTION_TITLE, marginBottom: 10 }}>{t.projectStatus}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.keys(STATUS_CFG).map(key => {
              const cfg = STATUS_CFG[key]
              const active = (proj.statusLabel ?? 'on_track') === key
              return (
                <div key={key} onClick={() => onUpdProj(proj.id, { statusLabel: key })}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 'var(--r1)', cursor: 'pointer', background: active ? cfg.bg : 'transparent', border: active ? `1px solid color-mix(in srgb, ${cfg.color} 38%, transparent)` : '1px solid var(--bd3)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: active ? 500 : 400, color: active ? cfg.color : 'var(--tx2)' }}>{statusLabels[key]}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Project type ─────────────────────────────────── */}
        {canManage && (
          <div style={CARD}>
            <div style={{ ...SECTION_TITLE, marginBottom: 8 }}>{t.supProjectType ?? 'Project type'}</div>
            <select value={proj.project_type ?? 'standard'}
              onChange={e => onUpdProj(proj.id, { project_type: e.target.value })}
              style={{ fontSize: 12, padding: '6px 8px', width: '100%', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx2)' }}>
              <option value="standard">{t.supTypeStandard ?? 'Standard'}</option>
              <option value="supervised">{t.supTypeSupervised ?? 'Supervised'}</option>
            </select>
          </div>
        )}

        {/* ── Project dates (supervised) ───────────────────── */}
        {proj.project_type === 'supervised' && (
          <div style={CARD}>
            <div style={{ ...SECTION_TITLE, marginBottom: 8 }}>{t.supProjectDates ?? 'Project dates'}</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: 'var(--tx3)', display: 'block', marginBottom: 3 }}>{t.supStartDate ?? 'Start date'}</label>
                <input type="date" value={proj.startDate ?? ''}
                  onChange={e => onUpdProj(proj.id, { startDate: e.target.value || null })}
                  style={{ fontSize: 12, padding: '6px 8px', width: '100%', boxSizing: 'border-box', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx2)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: 'var(--tx3)', display: 'block', marginBottom: 3 }}>{t.supEndDate ?? 'End date'}</label>
                <input type="date" value={proj.endDate ?? ''}
                  onChange={e => onUpdProj(proj.id, { endDate: e.target.value || null })}
                  style={{ fontSize: 12, padding: '6px 8px', width: '100%', boxSizing: 'border-box', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx2)' }} />
              </div>
            </div>
          </div>
        )}

        {/* ── Visibility & Permissions ─────────────────────── */}
        {canManage && (
          <div style={CARD}>
            <div style={{ ...SECTION_TITLE, marginBottom: 10 }}>{t.projectVisibility ?? 'Permissions'}</div>

            {/* Project Visibility */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ ...SECTION_TITLE, marginBottom: 6 }}>{t.projectVisibility ?? 'Visibility'}</div>
              <select value={proj.visibility ?? 'all'}
                onChange={e => onUpdProj(proj.id, { visibility: e.target.value })}
                style={{ fontSize: 12, padding: '4px 8px', width: '100%', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx2)' }}>
                <option value="all">{t.visibilityAll ?? 'Entire organization'}</option>
                <option value="members">{t.visibilityMembers ?? 'Project members only'}</option>
              </select>
            </div>

            {/* Section Access */}
            {sections && sections.length > 0 && (
              <div>
                <div style={{ ...SECTION_TITLE, marginBottom: 6 }}>{t.sectionAccess ?? 'Section access'}</div>
                {sections.filter(s => s.project_id === proj.id).map(sec => (
                  <div key={sec.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 12 }}>
                    <span style={{ flex: 1, color: 'var(--tx2)' }}>{sec.name}</span>
                    <select value={(proj.sectionAccess ?? {})[sec.name] ?? 'all'}
                      onChange={e => {
                        const sa = { ...(proj.sectionAccess ?? {}), [sec.name]: e.target.value }
                        if (e.target.value === 'all') delete sa[sec.name]
                        onUpdProj(proj.id, { sectionAccess: sa })
                      }}
                      style={{ fontSize: 11, padding: '2px 4px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx2)' }}>
                      <option value="all">{t.accessAll ?? 'Everyone'}</option>
                      <option value="editors">{t.accessEditors ?? 'Editors & owners'}</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Custom Fields ────────────────────────────────── */}
        <CustomFieldsConfig proj={proj} onUpdProj={onUpdProj} t={t} />

        {/* ── Automation Rules ─────────────────────────────── */}
        <RulesPanel project={proj} sections={sections ?? []} onUpdProj={onUpdProj} sectionTitleStyle={SECTION_TITLE} />

        {/* ── Forms ────────────────────────────────────────── */}
        <FormsPanel project={proj} sections={sections ?? []} onUpdProj={onUpdProj} sectionTitleStyle={SECTION_TITLE} />

        {/* ── Project Actions ──────────────────────────────── */}
        {canManage && (
          <div style={CARD}>
            <div style={{ ...SECTION_TITLE, marginBottom: 10 }}>{t.actions ?? 'Actions'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {onArchiveProject && (
                <button onClick={() => onArchiveProject(proj.id)}
                  style={{ fontSize: 12, padding: '7px 12px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx2)', cursor: 'pointer', textAlign: 'left' }}>
                  {proj.status === 'archived' ? t.unarchive : t.archive}
                </button>
              )}
              {onDeleteProject && (
                <button onClick={() => setConfirmDel(true)}
                  style={{ fontSize: 12, padding: '7px 12px', borderRadius: 'var(--r1)', border: '1px solid var(--c-danger)', background: 'transparent', color: 'var(--c-danger)', cursor: 'pointer', textAlign: 'left' }}>
                  {t.deleteProject}
                </button>
              )}
            </div>
          </div>
        )}

        {confirmDel && (
          <ConfirmModal
            message={t.confirmDeleteProject(proj.name)}
            onConfirm={() => { setConfirmDel(false); onDeleteProject(proj.id) }}
            onCancel={() => setConfirmDel(false)}
          />
        )}
      </div>
    </div>
  )
}
