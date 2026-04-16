import { useState } from 'react'
import { useLang } from '@/i18n'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import Avatar from '@/components/Avatar'
import ProjectMembersPanel from '@/components/ProjectMembersPanel'
import PartnersPanel from '@/components/PartnersPanel'
import WorkpackagesPanel from '@/components/WorkpackagesPanel'
import MilestonesPanel from '@/components/MilestonesPanel'
import MilestoneMigrationHelper from '@/components/MilestoneMigrationHelper'
import { updateTaskField } from '@/lib/db/tasks'
import { usePartners } from '@/hooks/usePartners'
import { useWorkpackages } from '@/hooks/useWorkpackages'
import { useMilestones } from '@/hooks/useMilestones'
import GoalsPanel from '@/components/GoalsPanel'
import Badge from '@/components/Badge'
// reportPdf is loaded lazily on button click to avoid bundling jsPDF (360KB) eagerly


// ── SaveTemplateButton ──────────────────────────────────────
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
      milestoneId: task.milestoneId ?? null,
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
        style={{ width: '100%', fontSize: 12, padding: '6px 8px', marginBottom: 6, border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', background: 'var(--bg2)', color: 'var(--tx2)' }} />
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

// ── ProjectOverview ─────────────────────────────────────────
//
// Post-F1.5a: this view is now focused on project *content* (what you work
// with inside a project). Project *governance* (status, type/dates, permissions,
// custom fields, automation rules, forms, archive/delete) lives entirely in
// ProjectSettings. KPIs and progress summaries live in ProjectDashboard.
// This prevents the duplication that accumulated across the three views.
//
export default function ProjectOverview({
  project, tasks, onUpdProj, onOpen, lang: _lang, currentUser,
  myProjectRoles = {}, orgId,
}) {
  const t = useLang()
  const USERS = useOrgUsers()
  const me = USERS.find(u => u.email === currentUser?.email)
  const isAdmin = me?.role === 'admin'
  const isManager = me?.role === 'manager'
  const [addRes, setAddRes] = useState(false)
  const [resTitle, setResTitle] = useState('')
  const [resUrl, setResUrl]   = useState('')
  const canManage = isAdmin || (isManager && myProjectRoles[project?.id] === 'owner')
  const { orgPartners, projectPartners, loading: partnersLoading, save: savePartner, remove: removePartner, link: linkPartner, unlink: unlinkPartner } = usePartners(orgId, project?.id)
  const { workpackages, loading: wpLoading, save: saveWp, remove: removeWp } = useWorkpackages(orgId, project?.id)
  const { milestones, loading: msLoading, save: saveMs, remove: removeMs } = useMilestones(orgId, project?.id)

  const proj = project
  if (!proj) return null

  const pTasks = tasks.filter(task => task.pid === proj.id)
  const recent = [...pTasks].sort((a, b) => (b.id > a.id ? 1 : -1)).slice(0, 8)
  const resources = proj.resources ?? []

  const addResource = () => {
    if (!resTitle.trim()) return
    const url = resUrl.trim().startsWith('http') ? resUrl.trim() : resUrl.trim() ? 'https://' + resUrl.trim() : ''
    onUpdProj(proj.id, { resources: [...resources, { id: `r${Date.now()}`, title: resTitle.trim(), url }] })
    setResTitle(''); setResUrl(''); setAddRes(false)
  }

  const sectionTitleStyle = { fontSize: 12, fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em' }
  const CARD = { background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }
  const CARD_COMPACT = { ...CARD, padding: '16px 18px' }

  return (
    <div className="overview-layout" style={{ flex: 1, overflow: 'auto', display: 'flex', gap: 20, padding: '22px 26px', alignItems: 'flex-start' }}>

      {/* Left column — project content (the "what you work with") */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Description */}
        <div style={CARD}>
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
        <div style={CARD}>
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

        {/* Workpackages */}
        <WorkpackagesPanel
          workpackages={workpackages} tasks={pTasks} projectPartners={projectPartners}
          onSave={saveWp} onRemove={removeWp} loading={wpLoading}
          canManage={canManage} sectionTitleStyle={sectionTitleStyle}
        />

        {/* Legacy milestone migration helper (one-time; removal tracked in F1.5c) */}
        <MilestoneMigrationHelper
          tasks={pTasks} milestones={milestones}
          onAssign={(taskId, msId) => updateTaskField(orgId, taskId, { milestoneId: msId })}
          onCreateMs={saveMs}
        />

        {/* Milestones */}
        <MilestonesPanel
          milestones={milestones} tasks={pTasks} workpackages={workpackages}
          projectPartners={projectPartners}
          onSave={saveMs} onRemove={removeMs} loading={msLoading}
          canManage={canManage} sectionTitleStyle={sectionTitleStyle}
          canApprove={isAdmin || isManager || ['owner', 'editor'].includes(myProjectRoles[proj.id])}
        />

        {/* Goals */}
        <GoalsPanel project={proj} tasks={tasks} onUpdProj={onUpdProj} sectionTitleStyle={sectionTitleStyle} />

        {/* Task Templates */}
        <div style={CARD}>
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
          <SaveTemplateButton tasks={pTasks} proj={proj} onUpdProject={onUpdProj} t={t} />
        </div>
      </div>

      {/* Right column — people & quick actions */}
      <div className="overview-sidebar" style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Members */}
        <ProjectMembersPanel projectId={proj.id} orgUsers={USERS} sectionTitleStyle={sectionTitleStyle} t={t} canManage={isAdmin || (isManager && myProjectRoles[proj.id] === 'owner')} />

        {/* Partners */}
        <PartnersPanel
          orgPartners={orgPartners} projectPartners={projectPartners} loading={partnersLoading}
          onSave={savePartner} onRemove={removePartner} onLink={linkPartner} onUnlink={unlinkPartner}
          projectId={proj.id} canManage={canManage} sectionTitleStyle={sectionTitleStyle}
          partnerSuggestions={proj.partnerSuggestions ?? []}
          onDismissSuggestion={(idx) => {
            const next = (proj.partnerSuggestions ?? []).filter((_, i) => i !== idx)
            onUpdProj(proj.id, { partnerSuggestions: next })
          }}
        />

        {/* Recent activity */}
        <div style={CARD_COMPACT}>
          <div style={{ ...sectionTitleStyle, marginBottom: 10 }}>{t.recentActivity}</div>
          {recent.length === 0 && <div style={{ fontSize: 13, color: 'var(--tx3)' }}>{t.noActivity}</div>}
          {recent.map(task => (
            <div key={task.id} className="row-interactive" onClick={() => onOpen(task.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 4px', borderBottom: '1px solid var(--bd3)', borderRadius: 'var(--r1)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: task.done ? 'var(--c-success)' : proj.color, flexShrink: 0 }} />
              {task.who ? <Avatar name={task.who} size={18} /> : <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--bg3)', flexShrink: 0 }} />}
              <span style={{ fontSize: 13, color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
              {task.done && <span style={{ fontSize: 12, color: 'var(--c-success)', flexShrink: 0 }}>✓</span>}
            </div>
          ))}
        </div>

        {/* Report PDF */}
        <button
          onClick={async () => {
            const { generateProjectReport } = await import('@/utils/reportPdf')
            generateProjectReport(proj, pTasks, [], t, _lang, orgPartners, workpackages, milestones)
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
      </div>
    </div>
  )
}
