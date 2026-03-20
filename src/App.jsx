import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LangCtx, useLang, translations } from '@/i18n'
import { storage } from '@/utils/storage'
import { generateSubtasks, createTaskFromText, summariseProject } from '@/utils/ai'
import { exportTasksCsv as exportCsv } from '@/utils/exportCsv'
import AvatarGroup from '@/components/AvatarGroup'
import { supabase } from '@/lib/supabase'
import { signOut, getUserOrgs, getMfaLevel, getFactors } from '@/lib/auth'
import {
  fetchOrgData, fetchSectionRows,
  upsertTask, updateTaskField, moveTaskToSection, updateTaskDeps,
  upsertProject, upsertPortfolio, upsertSections,
  updateTaskPositions, ensureOrgMembership, addProjectMember,
  deleteTask as dbDeleteTask, deleteProject as dbDeleteProject, deletePortfolio as dbDeletePortfolio,
  seedOrg,
} from '@/lib/db'
import { PROJECT_COLORS, INITIAL_PROJECTS, INITIAL_PORTFOLIOS, INITIAL_SECTIONS, INITIAL_TASKS } from '@/data/initialData'
import { BIOMIMX_PROJECTS, BIOMIMX_PORTFOLIOS, BIOMIMX_SECTIONS, BIOMIMX_TASKS } from '@/data/biomimxData'
import { INITIAL_ORGS } from '@/data/orgs'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

import LoginPage       from '@/pages/LoginPage'
import MfaPage         from '@/pages/MfaPage'
import HomeDashboard   from '@/pages/HomeDashboard'
import BrowseProjects  from '@/pages/BrowseProjects'
import PortfoliosView  from '@/pages/PortfoliosView'
import PeopleView      from '@/pages/PeopleView'
import TaskPanel       from '@/pages/TaskPanel'
import AddModal        from '@/pages/AddModal'
import MyTasksView     from '@/views/MyTasksView'
import InboxView       from '@/pages/InboxView'
import BoardView       from '@/views/BoardView'
import ListView        from '@/views/ListView'
import CalendarView    from '@/views/CalendarView'
import TimelineView    from '@/views/TimelineView'
import ProjectOverview from '@/views/ProjectOverview'
import FilterBar       from '@/components/FilterBar'
import CommandPalette  from '@/components/CommandPalette'
import IconSidebar     from '@/layout/IconSidebar'
import ContextSidebar  from '@/layout/ContextSidebar'
import { OrgUsersProvider } from '@/context/OrgUsersCtx'
import { ToastProvider, useToast } from '@/context/ToastCtx'
import { InboxProvider, useInbox } from '@/context/InboxCtx'
import { UndoProvider, useUndo } from '@/context/UndoCtx'

/** Defer work out of supabase.auth.onAuthStateChange — async handlers block GoTrue's lock and cause "lock was not released" timeouts */
function deferAuthWork(fn) {
  queueMicrotask(fn)
}

const EMPTY_FILTERS = { q: '', pri: 'all', who: 'all', due: 'all', done: 'all', tag: 'all' }

const PROJECT_TEMPLATES = [
  {
    id: 'kanban', name: 'Kanban', icon: '📋',
    description: 'Simple Kanban board with standard workflow columns.',
    sections: ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'],
    tasks: [
      { title: 'Define project scope', sec: 'To Do', pri: 'high', desc: 'Outline goals, deliverables, and key milestones.' },
      { title: 'Set up team communication', sec: 'To Do', pri: 'medium' },
      { title: 'Create initial backlog', sec: 'Backlog', pri: 'medium' },
    ],
  },
  {
    id: 'sprint', name: 'Sprint', icon: '🏃',
    description: 'Two-week sprint cycle with planning and review phases.',
    sections: ['Sprint Backlog', 'In Progress', 'Testing', 'Done'],
    tasks: [
      { title: 'Sprint planning meeting', sec: 'Sprint Backlog', pri: 'high' },
      { title: 'Define acceptance criteria', sec: 'Sprint Backlog', pri: 'high' },
      { title: 'Sprint retrospective', sec: 'Sprint Backlog', pri: 'medium' },
    ],
  },
  {
    id: 'research', name: 'Research', icon: '🔬',
    description: 'Research project with literature review, experiments, and publication.',
    sections: ['Literature Review', 'Experiment Design', 'Data Collection', 'Analysis', 'Writing'],
    tasks: [
      { title: 'Literature search & review', sec: 'Literature Review', pri: 'high', desc: 'Systematic search of relevant papers and prior art.' },
      { title: 'Define research questions', sec: 'Literature Review', pri: 'high' },
      { title: 'Design experimental protocol', sec: 'Experiment Design', pri: 'medium' },
      { title: 'Prepare materials & equipment', sec: 'Experiment Design', pri: 'medium' },
      { title: 'Draft manuscript outline', sec: 'Writing', pri: 'low' },
    ],
  },
  {
    id: 'launch', name: 'Product Launch', icon: '🚀',
    description: 'Go-to-market checklist for product or feature launches.',
    sections: ['Planning', 'Development', 'Marketing', 'Launch', 'Post-launch'],
    tasks: [
      { title: 'Define launch goals & KPIs', sec: 'Planning', pri: 'high' },
      { title: 'Finalize feature set', sec: 'Development', pri: 'high' },
      { title: 'Prepare marketing assets', sec: 'Marketing', pri: 'medium' },
      { title: 'Write announcement blog post', sec: 'Marketing', pri: 'medium' },
      { title: 'Go/no-go review', sec: 'Launch', pri: 'high' },
      { title: 'Collect user feedback', sec: 'Post-launch', pri: 'medium' },
    ],
  },
]

const ORG_SEEDS = {
  polimi:  { projs: INITIAL_PROJECTS,  ports: INITIAL_PORTFOLIOS,  secs: INITIAL_SECTIONS,  tasks: INITIAL_TASKS },
  biomimx: { projs: BIOMIMX_PROJECTS,  ports: BIOMIMX_PORTFOLIOS,  secs: BIOMIMX_SECTIONS,  tasks: BIOMIMX_TASKS },
  _empty:  { projs: [],                ports: [],                  secs: {},                tasks: [] },
}
const seedFor = (orgId) => ORG_SEEDS[orgId] ?? ORG_SEEDS._empty

const oget = (orgId, key, fb) => storage.get(`${orgId}_${key}`, fb)
const oset = (orgId, key, val) => storage.set(`${orgId}_${key}`, val)

// ── Loading spinner ───────────────────────────────────────────
function LoadingScreen({ message }) {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg3)', gap: 14, zIndex: 10 }}>
      <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
        <rect x="1"  y="3.5"  width="10" height="3.5" rx="1.5" fill="var(--tx1)"/>
        <rect x="4"  y="9"    width="10" height="3.5" rx="1.5" fill="var(--tx1)" opacity="0.7"/>
        <rect x="7"  y="14.5" width="9"  height="3"   rx="1.5" fill="var(--tx1)" opacity="0.45"/>
        <path d="M14 2.5L17.5 6L14 9.5" stroke="var(--tx1)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
      </svg>
      <div style={{ fontSize: 13, color: 'var(--tx3)' }}>{message}</div>
    </div>
  )
}

// ── New project modal ────────────────────────────────────────────
function NewProjectModal({ templates, portfolios, onAdd, onClose, lang }) {
  const t = useLang()
  const [nm, setNm] = useState('')
  const [ci, setCi] = useState(0)
  const [selPort, setSelPort] = useState('')
  const [selTpl, setSelTpl] = useState('')
  return (
    <div onClick={onClose} role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', padding: 22, width: 420, border: '1px solid var(--bd2)', boxShadow: 'var(--shadow-lg)', maxHeight: '80vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{t.newProject ?? 'New project'}</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--tx3)', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.projectName ?? 'Name'}</label>
          <input value={nm} onChange={e => setNm(e.target.value)} placeholder={(t.projectName ?? 'Name') + '…'} style={{ width: '100%' }} autoFocus onKeyDown={e => { if (e.key === 'Escape') onClose(); if (e.key === 'Enter' && nm.trim()) { onAdd(nm.trim(), PROJECT_COLORS[ci], selPort, selTpl || undefined) } }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.projectColor ?? 'Color'}</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PROJECT_COLORS.map((c, i) => <div key={c} onClick={() => setCi(i)} style={{ width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer', outline: ci === i ? `2.5px solid ${c}` : 'none', outlineOffset: 2 }} />)}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.portfolio ?? 'Portfolio'}</label>
          <select value={selPort} onChange={e => setSelPort(e.target.value)} style={{ width: '100%', fontSize: 12 }}>
            <option value="">{t.none ?? 'None'}</option>
            {portfolios.map(po => <option key={po.id} value={po.id}>{po.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.template ?? 'Template'}</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
            <div onClick={() => setSelTpl('')} className="row-interactive"
              style={{ padding: '8px 12px', borderRadius: 'var(--r1)', border: `1.5px solid ${!selTpl ? 'var(--c-brand)' : 'var(--bd3)'}`, cursor: 'pointer', fontSize: 12, background: !selTpl ? 'color-mix(in srgb, var(--c-brand) 8%, transparent)' : 'transparent' }}>
              <div style={{ fontWeight: 500 }}>📄 {t.blank ?? 'Blank'}</div>
              <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>To Do / In Progress / Done</div>
            </div>
            {templates.map(tpl => (
              <div key={tpl.id} onClick={() => setSelTpl(tpl.id)} className="row-interactive"
                style={{ padding: '8px 12px', borderRadius: 'var(--r1)', border: `1.5px solid ${selTpl === tpl.id ? 'var(--c-brand)' : 'var(--bd3)'}`, cursor: 'pointer', fontSize: 12, background: selTpl === tpl.id ? 'color-mix(in srgb, var(--c-brand) 8%, transparent)' : 'transparent' }}>
                <div style={{ fontWeight: 500 }}>{tpl.icon} {tpl.name}</div>
                <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.sections.join(' → ')}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ fontSize: 12, padding: '6px 14px' }}>{t.cancel ?? 'Cancel'}</button>
          <button onClick={() => { if (nm.trim()) onAdd(nm.trim(), PROJECT_COLORS[ci], selPort, selTpl || undefined) }}
            disabled={!nm.trim()}
            style={{ fontSize: 12, padding: '6px 14px', background: nm.trim() ? 'var(--tx1)' : 'var(--bd2)', color: 'var(--bg1)', border: 'none', borderRadius: 'var(--r1)', cursor: nm.trim() ? 'pointer' : 'default', fontWeight: 500 }}>
            {t.create ?? 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Project header ─────────────────────────────────────────────
function ProjectHeader({ proj, view, setView, tasks, onAddTask, onSummary, onExport, portfolios }) {
  const t  = useLang()
  const po = portfolios.find(x => x.id === proj?.portfolio)
  const done = tasks.filter(t => t.done).length
  const memberNames = useMemo(() => [...new Set(tasks.map(t => t.who).filter(Boolean))], [tasks])
  const VIEWS = [
    [t.overview, 'overview'], [t.list, 'lista'], [t.board, 'board'],
    [t.timeline, 'timeline'], [t.calendar, 'calendario'],
  ]
  return (
    <div className="project-header" style={{ padding: '12px 20px', borderBottom: '1px solid var(--bd3)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg1)', flexShrink: 0 }}>
      {po && <span style={{ fontSize: 12, color: po.color, background: po.color + '12', padding: '3px 10px', borderRadius: 'var(--r1)', fontWeight: 500, flexShrink: 0 }}>{po.name}</span>}
      <div style={{ width: 9, height: 9, borderRadius: '50%', background: proj?.color, flexShrink: 0 }} />
      <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{proj?.name}</span>
      <span style={{ fontSize: 13, color: 'var(--tx3)', flexShrink: 0 }}>{done}/{tasks.length}</span>
      {memberNames.length > 0 && <AvatarGroup names={memberNames} size={26} />}
      <div style={{ flex: 1 }} />
      <div className="view-tabs" style={{ display: 'flex', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', overflow: 'hidden' }}>
        {VIEWS.map(([lb, v], i, arr) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '5px 12px', fontSize: 12, border: 'none',
            borderRight: i < arr.length - 1 ? '1px solid var(--bd3)' : 'none',
            background: view === v ? 'var(--bg2)' : 'transparent',
            color: view === v ? 'var(--tx1)' : 'var(--tx2)',
            fontWeight: view === v ? 500 : 400, cursor: 'pointer',
          }}>{lb}</button>
        ))}
      </div>
      <button onClick={onExport} title={t.exportCsv ?? 'Export CSV'} style={{ fontSize: 12, padding: '5px 10px', color: 'var(--tx3)', borderColor: 'var(--bd3)' }}>↓ CSV</button>
      <button onClick={onSummary} style={{ fontSize: 12, padding: '5px 12px', color: 'var(--c-success)', borderColor: 'var(--c-success)' }}>{t.aiSummary}</button>
      <button onClick={onAddTask} style={{ fontSize: 13, padding: '6px 14px', background: 'var(--tx1)', color: 'var(--bg1)', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer', fontWeight: 600 }}>{t.addTask}</button>
    </div>
  )
}

function SummaryPanel({ summary, loading, onClose }) {
  const t = useLang()
  return (
    <div style={{ position: 'absolute', top: 52, right: 16, width: 340, background: 'var(--bg1)', border: '1px solid var(--bd2)', borderRadius: 'var(--r2)', padding: 16, zIndex: 100, boxShadow: 'var(--shadow-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--c-success)' }}>{t.aiSummary}</span>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--tx3)', fontSize: 14, lineHeight: 1 }}>✕</button>
      </div>
      {loading
        ? <div style={{ fontSize: 13, color: 'var(--tx3)' }}>{t.generating2}</div>
        : <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{summary}</div>
      }
    </div>
  )
}



// ── App (wrapped in ToastProvider for toast access) ──────────
export default function AppWrapper() {
  return <UndoProvider><ToastProvider><App /></ToastProvider></UndoProvider>
}

function parseRoute(pathname) {
  const s = pathname.split('/').filter(Boolean)
  return { nav: s[0] || 'home', pid: s[1] || null, view: s[2] || null, taskId: s[3] || null }
}

function buildPath(nav, pid, view, taskId) {
  if (nav === 'home') return taskId ? `/home/-/-/${taskId}` : '/'
  if ((nav === 'projects' || nav === 'portfolios') && pid) {
    let p = `/${nav}/${pid}`
    if (view) p += `/${view}`
    if (taskId) p += `/${taskId}`
    return p
  }
  return taskId ? `/${nav}/-/-/${taskId}` : `/${nav}`
}

function App() {
  const toast = useToast()
  const inbox = useInbox()
  const { pushUndo } = useUndo()
  const navigate = useNavigate()
  const location = useLocation()
  const [lang, setLang]           = useState(() => storage.get('lang', 'it'))
  const [theme, setTheme]         = useState(() => storage.get('theme', 'auto'))
  const [user, setUser]           = useState(null)
  const [needsMfa, setNeedsMfa]   = useState(false)
  const [appLoading, setAppLoading] = useState(true)
  const [orgLoading, setOrgLoading] = useState(false)
  const [dbStatus, setDbStatus]     = useState('local')
  const [orgs, setOrgs]           = useState(() => storage.get('orgs', INITIAL_ORGS))
  const [activeOrgId, setActiveOrgId] = useState(() => storage.get('activeOrgId', 'polimi'))

  const [projs, setProjs] = useState(() => oget(activeOrgId, 'projs', seedFor(activeOrgId).projs))
  const [ports, setPorts] = useState(() => oget(activeOrgId, 'ports', seedFor(activeOrgId).ports))
  const [secs,  setSecs]  = useState(() => oget(activeOrgId, 'secs',  seedFor(activeOrgId).secs))
  const [tasks, setTasks] = useState(() => oget(activeOrgId, 'tasks', seedFor(activeOrgId).tasks))
  const [myProjectRoles, setMyProjectRoles] = useState({})
  const secRowsRef = useRef([])
  const activeOrgIdRef = useRef(activeOrgId)
  useEffect(() => { activeOrgIdRef.current = activeOrgId }, [activeOrgId])

  const initRoute = useMemo(() => parseRoute(location.pathname), [])
  const [nav, setNav]           = useState(initRoute.nav)
  const [pid, setPid]           = useState(() => initRoute.pid || oget(activeOrgId, 'projs', seedFor(activeOrgId).projs)[0]?.id || '')
  const [view, setView]         = useState(initRoute.view || 'board')
  const [selId, setSelId]       = useState(initRoute.taskId)
  const [showAdd, setShowAdd]   = useState(false)
  const [addDue, setAddDue]     = useState('')
  const [aiLoad, setAiLoad]     = useState(false)
  const [summary, setSummary]   = useState(null)
  const [showSum, setShowSum]   = useState(false)
  const [filters, setFilters]   = useState(EMPTY_FILTERS)
  const [showCmdK, setShowCmdK] = useState(false)
  const [mobileSidebar, setMobileSidebar] = useState(false)
  const [showNewProj, setShowNewProj] = useState(false)
  const tr = translations[lang] ?? translations.it

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const tag = (e.target.tagName || '').toLowerCase()
      const inInput = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowCmdK(v => !v); return }
      if (e.key === 'Escape') {
        if (showCmdK) { setShowCmdK(false); return }
        if (selId)    { setSelId(null); return }
        if (showAdd)  { setShowAdd(false); setAddDue(''); return }
      }
      if (inInput) return
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setAddDue(''); setShowAdd(true) }
      if (e.key === 'h') { e.preventDefault(); goNav('home') }
      if (e.key === '1') { e.preventDefault(); setView('board') }
      if (e.key === '2') { e.preventDefault(); setView('lista') }
      if (e.key === '3') { e.preventDefault(); setView('timeline') }
      if (e.key === '4') { e.preventDefault(); setView('calendario') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showCmdK, selId, showAdd])

  // Sync theme → DOM
  useEffect(() => {
    storage.set('theme', theme)
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Sync state → URL
  const skipUrlSync = useRef(false)
  useEffect(() => {
    if (skipUrlSync.current) { skipUrlSync.current = false; return }
    const target = buildPath(nav, pid, view, selId)
    if (location.pathname !== target) navigate(target, { replace: true })
  }, [nav, pid, view, selId])

  // Sync URL → state (browser back/forward)
  useEffect(() => {
    const r = parseRoute(location.pathname)
    skipUrlSync.current = true
    if (r.nav && r.nav !== nav) setNav(r.nav)
    if (r.pid && r.pid !== pid && r.pid !== '-') setPid(r.pid)
    if (r.view && r.view !== view && r.view !== '-') setView(r.view)
    setSelId(r.taskId && r.taskId !== '-' ? r.taskId : null)
  }, [location.pathname])

  useEffect(() => storage.set('lang', lang), [lang])
  useEffect(() => storage.set('orgs', orgs), [orgs])
  useEffect(() => storage.set('activeOrgId', activeOrgId), [activeOrgId])
  useEffect(() => oset(activeOrgId, 'projs', projs), [activeOrgId, projs])
  useEffect(() => oset(activeOrgId, 'ports', ports), [activeOrgId, ports])
  useEffect(() => oset(activeOrgId, 'secs',  secs),  [activeOrgId, secs])
  useEffect(() => oset(activeOrgId, 'tasks', tasks), [activeOrgId, tasks])

  // ── Load org data from Supabase ──────────────────────────────
  const loadOrgData = useCallback(async (orgId) => {
    setOrgLoading(true)
    setDbStatus('syncing')
    try {
      const data = await fetchOrgData(orgId)
      const seededKey = `taskflow-${orgId}-seeded`
      if (data.projs.length === 0 && !localStorage.getItem(seededKey)) {
        const seed = seedFor(orgId)
        await seedOrg(orgId, seed)
        localStorage.setItem(seededKey, '1')
        const seeded = await fetchOrgData(orgId)
        setProjs(seeded.projs); setPorts(seeded.ports)
        setSecs(seeded.secs);   setTasks(seeded.tasks)
        setMyProjectRoles(seeded.myProjectRoles ?? {})
        setPid(seeded.projs[0]?.id ?? '')
      } else {
        localStorage.setItem(seededKey, '1')
        setProjs(data.projs); setPorts(data.ports)
        setSecs(data.secs);   setTasks(data.tasks)
        setMyProjectRoles(data.myProjectRoles ?? {})
        setPid(prev => data.projs.find(p => p.id === prev) ? prev : (data.projs[0]?.id ?? ''))
      }
      // Cache section rows for mutations
      secRowsRef.current = await fetchSectionRows(orgId)
      setDbStatus('supabase')
    } catch (e) {
      console.error('loadOrgData error:', e)
      setDbStatus('error')
      // Fallback to localStorage
    }
    setOrgLoading(false)
  }, [])

  // ── Auth listener ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const safetyTimer = setTimeout(() => {
      if (!cancelled) setAppLoading(false)
    }, 8000)

    const finishBoot = () => {
      if (!cancelled) {
        clearTimeout(safetyTimer)
        setAppLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      deferAuthWork(async () => {
        if (cancelled) return
        try {
          if (event === 'SIGNED_OUT') {
            setUser(null); setNeedsMfa(false)
            finishBoot(); return
          }
          if (session?.user) {
            const u = session.user
            const userObj = { id: u.id, name: u.user_metadata?.full_name ?? u.email?.split('@')[0], email: u.email, color: '#378ADD' }
            if (event === 'SIGNED_IN') {
              try {
                const [mfaData, factors] = await Promise.all([getMfaLevel(), getFactors()])
                const hasVerifiedFactor = factors.some(f => f.status === 'verified')
                if (!hasVerifiedFactor || (mfaData.nextLevel === 'aal2' && mfaData.currentLevel !== 'aal2')) {
                  setUser(userObj)
                  setNeedsMfa(true)
                  return
                }
              } catch (e) { console.warn('MFA check:', e) }
            }
            setUser(userObj)
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
              try {
                const memberships = await ensureOrgMembership(u.id)
                const memberOrgIds = memberships.map(m => m.org_id)
                const allOrgs = storage.get('orgs', INITIAL_ORGS)
                const visibleOrgs = allOrgs.filter(o => memberOrgIds.includes(o.id))
                if (visibleOrgs.length) {
                  setOrgs(visibleOrgs)
                  if (!memberOrgIds.includes(activeOrgIdRef.current)) {
                    setActiveOrgId(visibleOrgs[0].id)
                    activeOrgIdRef.current = visibleOrgs[0].id
                  }
                }
                await loadOrgData(activeOrgIdRef.current)
              } catch (e) { console.error('loadOrgData:', e) }
            }
          } else {
            setUser(null)
          }
        } finally {
          finishBoot()
        }
      })
    })
    return () => {
      cancelled = true
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [loadOrgData])

  // ── Realtime sync ──────────────────────────────────────────
  const realtimeReload = useCallback(() => {
    if (dbStatus === 'supabase') loadOrgData(activeOrgIdRef.current)
  }, [dbStatus, loadOrgData])
  useRealtimeSync(activeOrgId, realtimeReload)

  // ── Org switching ────────────────────────────────────────────
  const switchOrg = async (newOrgId) => {
    setActiveOrgId(newOrgId)
    // Load from localStorage immediately for snappy UX
    setProjs(oget(newOrgId, 'projs', seedFor(newOrgId).projs))
    setPorts(oget(newOrgId, 'ports', seedFor(newOrgId).ports))
    setSecs(oget(newOrgId,  'secs',  seedFor(newOrgId).secs))
    setTasks(oget(newOrgId, 'tasks', seedFor(newOrgId).tasks))
    setNav('home'); setSelId(null); setFilters(EMPTY_FILTERS)
    // Then sync from Supabase
    await loadOrgData(newOrgId)
  }

  const addOrg = (orgDef) => {
    setOrgs(o => [...o, orgDef])
    switchOrg(orgDef.id)
  }

  const autoAddAssigneeToProject = async (projectId, assigneeName) => {
    try {
      const { data } = await supabase.from('profiles')
        .select('id').or(`display_name.eq.${assigneeName},email.ilike.${assigneeName.split(' ')[0]}%`)
        .limit(1).maybeSingle()
      if (data) await addProjectMember(projectId, data.id).catch(() => {})
    } catch {}
  }

  // ── CRUD — optimistic + persist ──────────────────────────────
  const updTask = async (id, patch) => {
    const prev = tasks.find(t => t.id === id)
    const entries = []
    const who = user?.name ?? 'System'
    const ts = new Date().toISOString()
    if (prev) {
      const TRACK = ['title','desc','who','pri','due','startDate','sec','recurrence']
      for (const k of TRACK) {
        if (k in patch && patch[k] !== prev[k]) entries.push({ ts, who, field: k, from: prev[k], to: patch[k] })
      }
      if ('tags' in patch) {
        const oldNames = (prev.tags ?? []).map(tg => tg.name).sort().join(',')
        const newNames = (patch.tags ?? []).map(tg => tg.name).sort().join(',')
        if (oldNames !== newNames) entries.push({ ts, who, field: 'tags', from: oldNames, to: newNames })
      }
      if ('done' in patch && patch.done !== prev.done) entries.push({ ts, who, field: 'done', from: prev.done, to: patch.done })
    }
    const activityPatch = entries.length ? { activity: [...(prev?.activity ?? []), ...entries] } : {}
    const fullPatch = { ...patch, ...activityPatch }

    setTasks(p => p.map(t => t.id === id ? { ...t, ...fullPatch } : t))
    try {
      if ('deps' in patch) {
        await updateTaskDeps(activeOrgId, id, patch.deps)
      }
      if ('subs' in patch || 'cmts' in patch) {
        const updated = tasks.find(t => t.id === id)
        if (updated) await upsertTask(activeOrgId, { ...updated, ...fullPatch }, secRowsRef.current)
      } else if (!('deps' in patch && Object.keys(patch).length === 1)) {
        await updateTaskField(activeOrgId, id, fullPatch)
      }
      if ('who' in patch && patch.who && prev) {
        autoAddAssigneeToProject(prev.pid, patch.who)
      }
    } catch (e) { console.error('updTask:', e) }
  }

  const togTask = async (id) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const done = !task.done
    const prevDone = task.done
    setTasks(p => p.map(t => t.id === id ? { ...t, done } : t))
    pushUndo(
      done ? tr.msgTaskCompleted(task.title) : tr.msgTaskReopened(task.title),
      () => { setTasks(p => p.map(t => t.id === id ? { ...t, done: prevDone } : t)); updateTaskField(activeOrgId, id, { done: prevDone }).catch(e => console.error(e)) }
    )
    try {
      await updateTaskField(activeOrgId, id, { done })
      inbox.push({ type: done ? 'task_completed' : 'task_reopened', actor: user.name, message: done ? tr.msgDidComplete(task.title) : tr.msgDidReopen(task.title), taskId: id })
    } catch (e) { console.error('togTask:', e) }
  }

  const moveTask = async (id, sec) => {
    const task = tasks.find(t => t.id === id)
    if (!task || task.sec === sec) return
    const prevSec = task.sec
    setTasks(p => p.map(t => t.id === id ? { ...t, sec } : t))
    pushUndo(
      tr.msgTaskMoved(task.title, sec),
      () => { setTasks(p => p.map(t => t.id === id ? { ...t, sec: prevSec } : t)); moveTaskToSection(activeOrgId, id, prevSec, task.pid, secRowsRef.current).catch(e => console.error(e)) }
    )
    try { await moveTaskToSection(activeOrgId, id, sec, task.pid, secRowsRef.current) }
    catch (e) { console.error('moveTask:', e) }
  }

  const reorderTask = (id, sec, newIndex) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === id)
      if (!task) return prev
      const inSec = prev.filter(t => t.sec === sec && t.pid === task.pid && t.id !== id)
      const others = prev.filter(t => !(t.sec === sec && t.pid === task.pid) && t.id !== id)
      const reordered = [...inSec.slice(0, newIndex), { ...task, sec }, ...inSec.slice(newIndex)]
        .map((t, i) => ({ ...t, position: i }))
      updateTaskPositions(reordered.map(t => ({ id: t.id, position: t.position }))).catch(e => console.error('reorder:', e))
      return [...others, ...reordered]
    })
  }

  const addTask = async ({ title, sec, who, startDate, due, pri }) => {
    const newTask = {
      id: `t${Date.now()}`, pid, title, sec, who,
      startDate: startDate || null, due, pri,
      desc: '', subs: [], cmts: [], deps: [], done: false,
    }
    setTasks(p => [...p, newTask])
    try {
      await upsertTask(activeOrgId, newTask, secRowsRef.current)
      toast(tr.msgTaskCreated(title), 'success')
      inbox.push({ type: 'task_created', actor: user.name, message: tr.msgDidCreate(title), taskId: newTask.id })
    } catch (e) { console.error('addTask:', e); toast(tr.msgSaveError, 'error') }
  }

  const addProject = async (name, color, portfolio, template) => {
    const id  = `p${Date.now()}`
    const tpl = template ? PROJECT_TEMPLATES.find(t => t.id === template) : null
    const secNames = tpl?.sections ?? ['To Do', 'In Progress', 'Done']
    const newProj = { id, name, color, members: [user.name], status: 'active', statusLabel: 'on_track', portfolio, description: tpl?.description ?? '', resources: [] }
    setProjs(p => [...p, newProj])
    setSecs(s => ({ ...s, [id]: secNames }))
    const tplTasks = (tpl?.tasks ?? []).map((t, i) => ({
      id: `t${Date.now()}${i}`, pid: id, title: t.title, sec: t.sec, who: user.name,
      startDate: null, due: '', pri: t.pri ?? 'medium', desc: t.desc ?? '',
      done: false, subs: [], cmts: [], deps: [], tags: [], attachments: [], activity: [], position: i,
    }))
    if (tplTasks.length) setTasks(prev => [...prev, ...tplTasks])
    setPid(id); setNav('projects')
    try {
      await upsertProject(activeOrgId, newProj)
      await addProjectMember(id, user.id, 'owner').catch(() => {})
      setMyProjectRoles(prev => ({ ...prev, [id]: 'owner' }))
      await upsertSections(activeOrgId, id, secNames)
      secRowsRef.current = await fetchSectionRows(activeOrgId)
      for (const tk of tplTasks) await upsertTask(activeOrgId, tk, secRowsRef.current)
      toast(tr.msgProjectCreated(name), 'success')
      inbox.push({ type: 'project_created', actor: user.name, message: tr.msgDidCreateProject(name) })
    } catch (e) { console.error('addProject:', e); toast(tr.msgSaveError, 'error') }
  }

  const addPortfolio = async (name, color, desc) => {
    const newPort = { id: `po${Date.now()}`, name, color, desc }
    setPorts(p => [...p, newPort])
    try {
      await upsertPortfolio(activeOrgId, newPort)
      toast(tr.msgPortfolioCreated(name), 'success')
    } catch (e) { console.error('addPortfolio:', e); toast(tr.msgSaveError, 'error') }
  }

  const delTask = async (id) => {
    const task = tasks.find(t => t.id === id)
    setTasks(p => p.filter(t => t.id !== id))
    setSelId(null)
    try {
      await dbDeleteTask(activeOrgId, id)
      toast(tr.msgDeleted(task?.title ?? 'Task'), 'success')
    } catch (e) { console.error('delTask:', e); toast(tr.msgSaveError, 'error') }
  }

  const delProject = async (id) => {
    const p = projs.find(p => p.id === id)
    setProjs(prev => prev.filter(p => p.id !== id))
    setTasks(prev => prev.filter(t => t.pid !== id))
    setSecs(prev => { const n = { ...prev }; delete n[id]; return n })
    if (pid === id) { setPid(null); setSelId(null) }
    try {
      await dbDeleteProject(activeOrgId, id)
      toast(tr.msgDeleted(p?.name ?? 'Project'), 'success')
    } catch (e) { console.error('delProject:', e); toast(tr.msgSaveError, 'error') }
  }

  const delPortfolio = async (id) => {
    const po = ports.find(p => p.id === id)
    setPorts(prev => prev.filter(p => p.id !== id))
    setProjs(prev => prev.map(p => p.portfolio === id ? { ...p, portfolio: null } : p))
    try {
      await dbDeletePortfolio(activeOrgId, id)
      toast(tr.msgDeleted(po?.name ?? 'Portfolio'), 'success')
    } catch (e) { console.error('delPortfolio:', e); toast(tr.msgSaveError, 'error') }
  }

  const archiveProject = async (id) => {
    const p = projs.find(p => p.id === id)
    const newStatus = p?.status === 'archived' ? 'active' : 'archived'
    updProj(id, { status: newStatus })
    toast(newStatus === 'archived' ? tr.msgArchived(p?.name) : tr.msgUnarchived(p?.name), 'success')
  }

  const archivePortfolio = async (id) => {
    const po = ports.find(p => p.id === id)
    const newStatus = po?.status === 'archived' ? 'active' : 'archived'
    setPorts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p))
    try {
      await upsertPortfolio(activeOrgId, { ...po, status: newStatus })
      toast(newStatus === 'archived' ? tr.msgArchived(po?.name) : tr.msgUnarchived(po?.name), 'success')
    } catch (e) { console.error('archivePortfolio:', e) }
  }

  const updProj = async (id, patch) => {
    setProjs(p => p.map(proj => proj.id === id ? { ...proj, ...patch } : proj))
    try {
      const updated = projs.find(p => p.id === id)
      if (updated) await upsertProject(activeOrgId, { ...updated, ...patch })
    } catch (e) { console.error('updProj:', e) }
  }

  // ── AI ────────────────────────────────────────────────────────
  const genSubs = async (task) => {
    setAiLoad(true)
    try {
      const arr = await generateSubtasks(task)
      const newSubs = [...task.subs, ...arr.map((text, i) => ({ id: `ai${Date.now()}${i}`, t: text, done: false }))]
      await updTask(task.id, { subs: newSubs })
      toast(tr.msgSubsGenerated(arr.length), 'success')
    } catch (e) { console.error(e); toast(tr.msgAIError, 'error') }
    setAiLoad(false)
  }

  const aiCreate = async (input, sec, who, startDate, due) => {
    setAiLoad(true)
    try {
      const info = await createTaskFromText(input)
      await addTask({ title: info.title, sec, who, startDate: startDate || null, due, pri: info.pri ?? 'medium' })
      setShowAdd(false)
    } catch (e) { console.error(e) }
    setAiLoad(false)
  }

  const getSum = async () => {
    setShowSum(true); setSummary(null); setAiLoad(true)
    try { setSummary(await summariseProject(proj?.name, pTasks, lang)) }
    catch (e) { setSummary('Error.') }
    setAiLoad(false)
  }

  // ── Nav ───────────────────────────────────────────────────────
  const selProj = (id)     => { setPid(id); setNav('projects'); setSelId(null) }
  const goNav   = (n)      => { setNav(n); setSelId(null) }
  const openAddOnDate = (ds) => { setAddDue(ds); setShowAdd(true) }

  // ── Derived ───────────────────────────────────────────────────
  const proj    = projs.find(p => p.id === pid)
  const pSecs   = secs[pid] ?? ['To Do', 'In Progress', 'Done']
  const pTasks  = tasks.filter(t => t.pid === pid)
  const selTask = tasks.find(t => t.id === selId)
  const showCtx = ['projects', 'portfolios'].includes(nav)

  // ── Gates ─────────────────────────────────────────────────────
  if (appLoading) return <LangCtx.Provider value={lang}><LoadingScreen message={tr.loadingMsg} /></LangCtx.Provider>
  if (!user)      return <LangCtx.Provider value={lang}><LoginPage lang={lang} setLang={setLang} /></LangCtx.Provider>
  if (needsMfa)   return <LangCtx.Provider value={lang}><MfaPage onComplete={() => setNeedsMfa(false)} lang={lang} /></LangCtx.Provider>

  const projectContent = (
    <>
      <ProjectHeader proj={proj} view={view} setView={setView} tasks={pTasks} onAddTask={() => { setAddDue(''); setShowAdd(true) }} onSummary={getSum} onExport={() => exportCsv(pTasks, proj?.name, proj?.customFields)} portfolios={ports} />
      {view !== 'overview' && view !== 'timeline' && <FilterBar filters={filters} setFilters={setFilters} tasks={pTasks} />}
      {orgLoading && <div style={{ padding: '8px 18px', fontSize: 12, color: 'var(--tx3)', borderBottom: '0.5px solid var(--bd3)' }}>⟳ {tr.syncing}</div>}
      {view === 'overview'   && <ProjectOverview project={proj} tasks={tasks} onUpdProj={updProj} onOpen={setSelId} lang={lang} currentUser={user} myProjectRoles={myProjectRoles} onDeleteProject={delProject} onArchiveProject={archiveProject} />}
      {view === 'board'      && <BoardView    tasks={pTasks} secs={pSecs} onOpen={setSelId} onToggle={togTask} onMove={moveTask} onReorder={reorderTask} onAddTask={(tl, s) => addTask({ title: tl, sec: s, who: user.name, startDate: null, due: '', pri: 'medium' })} onUpdateSecs={async (names) => { setSecs(s => ({ ...s, [pid]: names })); try { await upsertSections(activeOrgId, pid, names); secRowsRef.current = await fetchSectionRows(activeOrgId) } catch(e) { console.error('updateSecs:', e) } }} filters={filters} lang={lang} />}
      {view === 'lista'      && <ListView     tasks={pTasks} secs={pSecs} project={proj} onOpen={setSelId} onToggle={togTask} onMove={moveTask} onAddTask={(tl, s) => addTask({ title: tl, sec: s, who: user.name, startDate: null, due: '', pri: 'medium' })} filters={filters} lang={lang} />}
      {view === 'timeline'   && <TimelineView tasks={pTasks} secs={pSecs} projects={projs} onOpen={setSelId} lang={lang} />}
      {view === 'calendario' && <CalendarView tasks={tasks} projects={projs} onOpen={setSelId} onAddTaskOnDate={openAddOnDate} filters={filters} lang={lang} />}
    </>
  )

  return (
    <InboxProvider orgId={activeOrgId}>
    <OrgUsersProvider orgId={activeOrgId}>
    <LangCtx.Provider value={lang}>
      <div className="app-shell" style={{ display: 'flex', height: '92vh', minHeight: 620, background: 'var(--bg3)', borderRadius: 'var(--r3)', overflow: 'hidden', border: '1px solid var(--bd3)', position: 'relative', boxShadow: 'var(--shadow-lg)' }}>

        <button className="mobile-toggle" onClick={() => setMobileSidebar(v => !v)} aria-label="Menu"
          style={{ position: 'absolute', top: 10, left: 10, zIndex: 55, width: 34, height: 34, borderRadius: 'var(--r1)', background: 'var(--bg1)', border: '1px solid var(--bd3)', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, padding: 0 }}>
          ☰
        </button>

        <div className={`icon-sidebar${mobileSidebar ? ' open' : ''}`} style={{ flexShrink: 0 }}>
          <IconSidebar dbStatus={dbStatus}
            active={nav} onNav={(n) => { goNav(n); setMobileSidebar(false) }}
            currentUser={user} onLogout={async () => { await signOut(); setUser(null) }}
            lang={lang} setLang={setLang} theme={theme} setTheme={setTheme}
            orgs={orgs} activeOrgId={activeOrgId}
            onSwitchOrg={(id) => { switchOrg(id); setMobileSidebar(false) }} onAddOrg={addOrg}
            onSetup2FA={() => setNeedsMfa(true)}
          />
        </div>
        {mobileSidebar && <div onClick={() => setMobileSidebar(false)} style={{ position: 'absolute', inset: 0, zIndex: 49, background: 'var(--overlay)' }} />}

        {showCtx && <div className={`context-sidebar${mobileSidebar ? ' mobile-open' : ''}`}><ContextSidebar navId={nav} projects={projs} portfolios={ports} selPid={pid} onSelProj={(id) => { selProj(id); setMobileSidebar(false) }} onAddProject={() => { setShowNewProj(true); setMobileSidebar(false) }} currentUser={user} myProjectRoles={myProjectRoles} onDeleteProject={delProject} onArchiveProject={archiveProject} onDeletePortfolio={delPortfolio} onArchivePortfolio={archivePortfolio} /></div>}

        <div className="mobile-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, position: 'relative' }}>
          {nav === 'home'       && <HomeDashboard  tasks={tasks} projects={projs} secs={secs} currentUser={user} onOpen={setSelId} onNav={goNav} lang={lang} />}
          {nav === 'projects'   && projectContent}
          {nav === 'portfolios' && (proj && projs.find(p => p.id === pid)
            ? projectContent
            : <PortfoliosView portfolios={ports} projects={projs} tasks={tasks} onSelProj={selProj} onAddPortfolio={addPortfolio} onDeletePortfolio={delPortfolio} onArchivePortfolio={archivePortfolio} currentUser={user} />
          )}
          {nav === 'mytasks'    && <><FilterBar filters={filters} setFilters={setFilters} tasks={tasks} /><MyTasksView tasks={tasks} projects={projs} currentUser={user} filters={filters} onOpen={setSelId} onToggle={togTask} lang={lang} /></>}
          {nav === 'people'     && <PeopleView tasks={tasks} projects={projs} currentUser={user} activeOrgId={activeOrgId} />}
          {nav === 'inbox'      && <InboxView onOpenTask={(id) => { setSelId(id) }} lang={lang} />}

          {showSum && <SummaryPanel summary={summary} loading={aiLoad && !summary} onClose={() => setShowSum(false)} />}
        </div>

        {selTask && <TaskPanel task={selTask} projects={projs} allTasks={tasks} currentUser={user} orgId={activeOrgId} myProjectRoles={myProjectRoles} onClose={() => setSelId(null)} onUpd={updTask} onDelete={delTask} onGenSubs={genSubs} aiLoad={aiLoad} lang={lang} />}
        {showAdd && <AddModal secs={pSecs} onAdd={addTask} onClose={() => { setShowAdd(false); setAddDue('') }} aiLoad={aiLoad} onAICreate={aiCreate} currentUser={user} defaultDue={addDue} />}
        {showCmdK && <CommandPalette tasks={tasks} projects={projs} onOpenTask={id => { setSelId(id) }} onOpenProject={id => { selProj(id) }} onNavigate={n => { goNav(n) }} onClose={() => setShowCmdK(false)} />}
        {showNewProj && <NewProjectModal templates={PROJECT_TEMPLATES} portfolios={ports} onAdd={(name, color, portfolio, tpl) => { addProject(name, color, portfolio, tpl); setShowNewProj(false) }} onClose={() => setShowNewProj(false)} lang={lang} />}
      </div>
    </LangCtx.Provider>
    </OrgUsersProvider>
    </InboxProvider>
  )
}
