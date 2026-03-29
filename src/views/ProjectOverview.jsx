import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLang } from '@/i18n'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import { isOverdue } from '@/utils/filters'
// eslint-disable-next-line no-unused-vars
import { fmtDate } from '@/utils/format'
import { fetchProjectMembers, addProjectMember, removeProjectMember } from '@/lib/db'
import { getInitials } from '@/utils/initials'
import Avatar from '@/components/Avatar'
// eslint-disable-next-line no-unused-vars
import AvatarGroup from '@/components/AvatarGroup'
import ConfirmModal from '@/components/ConfirmModal'
import RulesPanel from '@/components/RulesPanel'
import FormsPanel from '@/components/FormsPanel'
import GoalsPanel from '@/components/GoalsPanel'
import Badge from '@/components/Badge'
// reportPdf is loaded lazily on button click to avoid bundling jsPDF (360KB) eagerly

const STATUS_CFG = {
  on_track:  { label: 'on_track',  color: 'var(--c-success)', bg: 'color-mix(in srgb, var(--c-success) 10%, transparent)' },
  at_risk:   { label: 'at_risk',   color: 'var(--c-warning)', bg: 'color-mix(in srgb, var(--c-warning) 10%, transparent)' },
  off_track: { label: 'off_track', color: 'var(--c-danger)', bg: 'color-mix(in srgb, var(--c-danger) 10%, transparent)' },
}

function SaveTemplateButton({ tasks, proj, onUpdProject, t }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = tasks.filter(task =>
    !search || task.title.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8)

  const saveAsTemplate = (task) => {
    const tpl = {
      id: `tpl${Date.now()}`,
      name: task.title,
      title: task.title,
      desc: task.desc ?? '',
      pri: task.pri,
      milestone: task.milestone ?? false,
      subs: (task.subs ?? []).map(s => ({ t: s.t })),
      tags: task.tags ?? [],
    }
    const updated = [...(proj.taskTemplates ?? []), tpl]
    onUpdProject(proj.id, { taskTemplates: updated })
    setOpen(false)
    setSearch('')
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ fontSize: 12, color: 'var(--c-brand)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
      + {t.saveAsTemplate ?? 'Save task as template'}
    </button>
  )

  return (
    <div style={{ border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', padding: 8, marginTop: 4 }}>
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder={t.searchTaskForTemplate ?? 'Search task...'}
        style={{ width: '100%', fontSize: 12, padding: '6px 8px', marginBottom: 6, border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', background: 'var(--bg2)', color: 'var(--tx1)' }} />
      {filtered.map(task => (
        <div key={task.id} onClick={() => saveAsTemplate(task)} className="hoverable"
          style={{ padding: '6px 8px', fontSize: 12, color: 'var(--tx2)', cursor: 'pointer', borderRadius: 'var(--r1)' }}>
          {task.title}
        </div>
      ))}
      <button onClick={() => { setOpen(false); setSearch('') }}
        style={{ fontSize: 11, color: 'var(--tx3)', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 4 }}>
        {t.cancel}
      </button>
    </div>
  )
}

export default function ProjectOverview({ project, tasks, sections, onUpdProj, onOpen, lang: _lang, currentUser, myProjectRoles = {}, onDeleteProject, onArchiveProject }) {
  const t = useLang()
  const USERS = useOrgUsers()
  const me = USERS.find(u => u.email === currentUser?.email)
  const isAdmin = me?.role === 'admin'
  const isManager = me?.role === 'manager'
  const [addRes, setAddRes] = useState(false)
  const [resTitle, setResTitle] = useState('')
  const [resUrl, setResUrl]   = useState('')
  const [confirmDel, setConfirmDel] = useState(false)
  const canManage = isAdmin || (isManager && myProjectRoles[project?.id] === 'owner')

  const proj = project
  if (!proj) return null

  const pTasks  = tasks.filter(task => task.pid === proj.id)
  const done    = pTasks.filter(task => task.done).length
  const pct     = pTasks.length ? Math.round(done / pTasks.length * 100) : 0
  const odCount = pTasks.filter(task => !task.done && isOverdue(task.due)).length
  const recent  = [...pTasks].sort((a, b) => (b.id > a.id ? 1 : -1)).slice(0, 8)

  const _status = STATUS_CFG[proj.statusLabel] ?? STATUS_CFG.on_track
  const statusLabels = { on_track: t.onTrack, at_risk: t.atRisk, off_track: t.offTrack }

  const resources = proj.resources ?? []

  const addResource = () => {
    if (!resTitle.trim()) return
    const url = resUrl.trim().startsWith('http') ? resUrl.trim() : resUrl.trim() ? 'https://' + resUrl.trim() : ''
    onUpdProj(proj.id, { resources: [...resources, { id: `r${Date.now()}`, title: resTitle.trim(), url }] })
    setResTitle(''); setResUrl(''); setAddRes(false)
  }

  const sectionTitleStyle = { fontSize: 12, fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em' }

  return (
    <div className="overview-layout" style={{ flex: 1, overflow: 'auto', display: 'flex', gap: 20, padding: '22px 26px', alignItems: 'flex-start' }}>

      {/* Left column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Description */}
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ ...sectionTitleStyle, marginBottom: 8 }}>{t.projectDescription}</div>
          <div
            contentEditable suppressContentEditableWarning
            onBlur={e => onUpdProj(proj.id, { description: e.target.innerText })}
            style={{ fontSize: 14, color: proj.description ? 'var(--tx1)' : 'var(--tx3)', outline: 'none', lineHeight: 1.7, minHeight: 60 }}
          >
            {proj.description || t.descPlaceholder}
          </div>
        </div>

        {/* Key resources */}
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ ...sectionTitleStyle, marginBottom: 10 }}>{t.keyResources}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {resources.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg2)', borderRadius: 'var(--r1)' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1v-3M9 2h5m0 0v5m0-5L7 10" stroke="var(--tx3)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {r.url
                  ? <a className="hoverable" href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--tx-info)', textDecoration: 'none', flex: 1, borderRadius: 'var(--r1)' }}>{r.title}</a>
                  : <span style={{ fontSize: 13, color: 'var(--tx2)', flex: 1 }}>{r.title}</span>
                }
                <button onClick={() => onUpdProj(proj.id, { resources: resources.filter(x => x.id !== r.id) })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--tx3)', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>✕</button>
              </div>
            ))}
            {addRes ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '8px', background: 'var(--bg2)', borderRadius: 'var(--r1)' }}>
                <input value={resTitle} onChange={e => setResTitle(e.target.value)} placeholder={t.resourceTitle} style={{ fontSize: 13 }} autoFocus />
                <input value={resUrl} onChange={e => setResUrl(e.target.value)} placeholder={t.resourceUrl + ` (${t.optional ?? 'optional'})`} style={{ fontSize: 13 }} onKeyDown={e => e.key === 'Enter' && addResource()} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={addResource} style={{ fontSize: 13, padding: '3px 10px' }}>{t.add}</button>
                  <button onClick={() => { setAddRes(false); setResTitle(''); setResUrl('') }} style={{ fontSize: 13, padding: '3px 10px' }}>{t.cancel}</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddRes(true)} style={{ fontSize: 13, color: 'var(--tx3)', borderColor: 'var(--bd3)', padding: '5px 10px', alignSelf: 'flex-start' }}>{t.addResource}</button>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ ...sectionTitleStyle, marginBottom: 10 }}>{t.recentActivity}</div>
          {recent.length === 0 && <div style={{ fontSize: 13, color: 'var(--tx3)' }}>{t.noActivity}</div>}
          {recent.map(task => (
            <div key={task.id} className="row-interactive" onClick={() => onOpen(task.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 4px', borderBottom: '1px solid var(--bd3)', borderRadius: 'var(--r1)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: task.done ? 'var(--c-success)' : proj.color, flexShrink: 0 }} />
              <Avatar name={task.who} size={18} />
              <span style={{ fontSize: 13, color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
              <span style={{ fontSize: 12, color: 'var(--tx3)', flexShrink: 0 }}>{task.sec}</span>
              {task.done && <span style={{ fontSize: 12, color: 'var(--c-success)', flexShrink: 0 }}>✓</span>}
            </div>
          ))}
        </div>

        {/* Automation rules */}
        <RulesPanel project={proj} sections={sections ?? []} onUpdProj={onUpdProj} sectionTitleStyle={sectionTitleStyle} />

        {/* Forms */}
        <FormsPanel project={proj} sections={sections ?? []} onUpdProj={onUpdProj} sectionTitleStyle={sectionTitleStyle} />

        {/* Goals */}
        <GoalsPanel project={proj} tasks={tasks} onUpdProj={onUpdProj} sectionTitleStyle={sectionTitleStyle} />

        {/* Task Templates */}
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ ...sectionTitleStyle, marginBottom: 8 }}>{t.taskTemplates ?? 'Task Templates'}</div>
          {(proj.taskTemplates ?? []).length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--tx3)', fontStyle: 'italic', marginBottom: 8 }}>{t.noTemplates ?? 'No templates. Save a task as template to reuse its structure.'}</div>
          )}
          {(proj.taskTemplates ?? []).map(tpl => (
            <div key={tpl.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg2)', borderRadius: 'var(--r1)', marginBottom: 6, border: '1px solid var(--bd3)' }}>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--tx1)' }}>{tpl.name}</span>
              {tpl.pri && <Badge pri={tpl.pri} />}
              {tpl.subs?.length > 0 && <span style={{ fontSize: 11, color: 'var(--tx3)' }}>✓ {tpl.subs.length}</span>}
              <button onClick={() => {
                const updated = (proj.taskTemplates ?? []).filter(t => t.id !== tpl.id)
                onUpdProj(proj.id, { taskTemplates: updated })
              }} aria-label="Delete template" style={{ border: 'none', background: 'transparent', color: 'var(--tx3)', cursor: 'pointer', fontSize: 13 }}>✕</button>
            </div>
          ))}
          {/* Save from existing task */}
          <SaveTemplateButton tasks={pTasks} proj={proj} onUpdProject={onUpdProj} t={t} />
        </div>
      </div>

      {/* Right column */}
      <div className="overview-sidebar" style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Status */}
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ ...sectionTitleStyle, marginBottom: 10 }}>{t.projectStatus}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {Object.keys(STATUS_CFG).map(key => {
              const cfg = STATUS_CFG[key]
              const active = (proj.statusLabel ?? 'on_track') === key
              return (
                <div key={key} onClick={() => onUpdProj(proj.id, { statusLabel: key })}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 'var(--r1)', cursor: 'pointer', background: active ? cfg.bg : 'transparent', border: active ? `1px solid color-mix(in srgb, ${cfg.color} 38%, transparent)` : '1px solid var(--bd3)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: active ? 500 : 400, color: active ? cfg.color : 'var(--tx2)' }}>{statusLabels[key]}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Progress */}
        <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ ...sectionTitleStyle }}>{t.progress}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx2)' }}>{done}/{pTasks.length}</span>
          </div>
          <div style={{ height: 6, background: 'var(--bg2)', borderRadius: 'var(--r1)', overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: proj.color, borderRadius: 'var(--r1)', transition: 'width 0.4s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--tx3)' }}>{pct}% {t.completedLower ?? 'completed'}</span>
            {odCount > 0 && <span style={{ fontSize: 13, color: 'var(--c-danger)' }}>⚠ {t.expiredCount ? t.expiredCount(odCount) : `${odCount} overdue`}</span>}
          </div>
        </div>

        {/* Report */}
        <button
          onClick={async () => {
            const { generateProjectReport } = await import('@/utils/reportPdf')
            generateProjectReport(proj, pTasks, sections, t, _lang)
          }}
          aria-label="Generate PDF report"
          style={{
            width: '100%', fontSize: 12, padding: '9px 14px', borderRadius: 'var(--r2)',
            border: '1px solid var(--bd3)', background: 'var(--bg1)', color: 'var(--accent)',
            cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            boxShadow: 'var(--shadow-sm)',
          }}>
          <span style={{ fontSize: 14 }}>📄</span> {t.generateReport ?? 'Generate Report (PDF)'}
        </button>

        {/* Members */}
        <ProjectMembersPanel projectId={proj.id} orgUsers={USERS} sectionTitleStyle={sectionTitleStyle} t={t} canManage={isAdmin || (isManager && myProjectRoles[proj.id] === 'owner')} />

        {/* Permissions */}
        {canManage && (
          <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ ...sectionTitleStyle, marginBottom: 10 }}>{t.projectVisibility ?? 'Permissions'}</div>

            {/* Project Visibility */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ ...sectionTitleStyle, marginBottom: 6 }}>{t.projectVisibility ?? 'Visibility'}</div>
              <select value={proj.visibility ?? 'all'}
                onChange={e => onUpdProj(proj.id, { visibility: e.target.value })}
                style={{ fontSize: 12, padding: '4px 8px', width: '100%', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx2)' }}>
                <option value="all">{t.visibilityAll ?? 'Entire organization'}</option>
                <option value="members">{t.visibilityMembers ?? 'Project members only'}</option>
              </select>
            </div>

            {/* Section Access */}
            {sections && sections.length > 0 && (
              <div style={{ marginBottom: 0 }}>
                <div style={{ ...sectionTitleStyle, marginBottom: 6 }}>{t.sectionAccess ?? 'Section access'}</div>
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

        {/* Custom fields config */}
        <CustomFieldsConfig proj={proj} onUpdProj={onUpdProj} sectionTitleStyle={sectionTitleStyle} t={t} />

        {/* Project actions (admin/owner only) */}
        {canManage && (
          <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ ...sectionTitleStyle, marginBottom: 10 }}>{t.actions ?? 'Actions'}</div>
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

const FIELD_TYPES = [
  { id: 'text', label: 'Text', icon: 'Aa' },
  { id: 'number', label: 'Number', icon: '#' },
  { id: 'select', label: 'Select', icon: '▾' },
]

function ProjectMembersPanel({ projectId, orgUsers, sectionTitleStyle, t, canManage = false }) {
  const [members, setMembers] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchProjectMembers(projectId)
      .then(setMembers)
      .catch(() => {})
  }, [projectId, busy])

  const nonMembers = orgUsers.filter(u => !members.some(m => m.user_id === u.id))

  const handleAdd = async (userId) => {
    setBusy(true)
    try {
      await addProjectMember(projectId, userId)
    } catch {}
    finally { setBusy(false) }
  }

  const handleRemove = async (userId) => {
    setBusy(true)
    try {
      await removeProjectMember(projectId, userId)
    } catch {}
    finally { setBusy(false) }
  }

  return (
    <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={sectionTitleStyle}>{t.projectMembers}</div>
        {canManage && (
          <button onClick={() => setShowAdd(s => !s)}
            style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: '1px solid var(--accent)40', borderRadius: 'var(--r1)', padding: '2px 7px', cursor: 'pointer' }}>
            {showAdd ? '✕' : '+'}
          </button>
        )}
      </div>

      {showAdd && nonMembers.length > 0 && (
        <div style={{ marginBottom: 10, padding: '8px', background: 'var(--bg2)', borderRadius: 'var(--r1)', maxHeight: 120, overflow: 'auto' }}>
          {nonMembers.map(u => (
            <div key={u.id} onClick={() => handleAdd(u.id)}
              className="row-interactive"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', borderRadius: 'var(--r1)', cursor: 'pointer', fontSize: 12, color: 'var(--tx2)' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: u.color + '28', color: u.color, fontSize: 8, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {getInitials(u.name)}
              </div>
              {u.name}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {members.map(m => (
          <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: (m.color ?? '#888') + '28', color: m.color ?? '#888', fontSize: 8, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {getInitials(m.user_name)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--tx1)' }}>{m.user_name}</div>
            </div>
            <select
              value={m.role ?? 'viewer'}
              onChange={async e => {
                const newRole = e.target.value
                setBusy(true)
                try {
                  await addProjectMember(projectId, m.user_id, newRole)
                } catch {}
                finally { setBusy(false) }
              }}
              disabled={!canManage || m.role === 'owner'}
              style={{ fontSize: 11, padding: '2px 4px', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', background: 'var(--bg2)', color: 'var(--tx2)', cursor: canManage && m.role !== 'owner' ? 'pointer' : 'not-allowed', opacity: canManage && m.role !== 'owner' ? 1 : 0.6 }}
            >
              <option value="owner">{t.roleOwner ?? 'Owner'}</option>
              <option value="editor">{t.roleEditor ?? 'Editor'}</option>
              <option value="viewer">{t.roleViewer ?? 'Viewer'}</option>
            </select>
            {canManage && m.role !== 'owner' && (
              <button onClick={() => handleRemove(m.user_id)}
                style={{ fontSize: 11, color: 'var(--c-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>✕</button>
            )}
          </div>
        ))}
        {members.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--tx3)', fontStyle: 'italic' }}>
            {t.noProjectMembers ?? 'No members yet'}
          </div>
        )}
      </div>
    </div>
  )
}

function CustomFieldsConfig({ proj, onUpdProj, sectionTitleStyle, t }) {
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
    <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ ...sectionTitleStyle, marginBottom: 10 }}>{t.customFields ?? 'Custom fields'}</div>
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
