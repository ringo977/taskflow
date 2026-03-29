import { lazy, Suspense, useState as useLocalState } from 'react'
import { logger } from '@/utils/logger'
import { LangCtx, translations } from '@/i18n'
import { signOut } from '@/lib/auth'
import { INITIAL_ORGS } from '@/data/orgs'

// Hooks
import { useAppBootstrap } from '@/hooks/useAppBootstrap'
import { useUIState } from '@/hooks/useUIState'
import { useAppActions } from '@/hooks/useAppActions'

const log = logger('App')

// Eagerly loaded layout
import AuthGate from '@/layout/AuthGate'
import IconSidebar from '@/layout/IconSidebar'
import MainContent from '@/layout/MainContent'
import ModalLayer from '@/layout/ModalLayer'

// Contexts
import { OrgUsersProvider } from '@/context/OrgUsersCtx'
import { ToastProvider, useToast } from '@/context/ToastCtx'
import { InboxProvider, useInbox } from '@/context/InboxCtx'
import { UndoProvider, useUndo } from '@/context/UndoCtx'

// Lazy: context sidebar (needs projects/portfolios loaded)
const ContextSidebar = lazy(() => import('@/layout/ContextSidebar'))
const ChunkFallback = () => (
  <div style={{ padding: 24, color: 'var(--tx3)', fontSize: 13 }}>Loading...</div>
)

// ── App wrapper (providers) ──────────────────────────────────
export default function AppWrapper() {
  return (
    <UndoProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </UndoProvider>
  )
}

// ── App (thin orchestrator) ──────────────────────────────────
function App() {
  const toast = useToast()
  const inbox = useInbox()
  const { pushUndo } = useUndo()

  // ── Bootstrap: auth, orgs, data, settings ──────────────────
  const boot = useAppBootstrap()
  const {
    user, setUser, needsMfa, setNeedsMfa, appLoading, orgLoading,
    orgs, setOrgs, activeOrgId, dbStatus,
    projs, setProjs, ports, setPorts, secs, setSecs, tasks, setTasks,
    myProjectRoles, setMyProjectRoles, secRowsRef,
    switchOrg, addOrg, loadOrgData, initOrgs,
    lang, setLang, theme, setTheme,
  } = boot

  const tr = translations[lang] ?? translations.it

  // ── UI state ──────────────────────────────────────────────
  const ui = useUIState({ activeOrgId })
  const { pid, nav, view, setView, mobileSidebar, setMobileSidebar, goNav, selProj } = ui

  // ── Form submission (local to App) ────────────────────────
  const [activeForm, setActiveForm] = useLocalState(null)

  // ── All domain actions (task, project, section, AI) ───────
  const actions = useAppActions({
    tasks, setTasks, projs, setProjs, ports, setPorts, secs, setSecs,
    activeOrgId, secRowsRef, user, pid, setPid: ui.setPid, setNav: ui.setNav, setSelId: ui.setSelId,
    myProjectRoles, setMyProjectRoles,
    toast, tr, inbox, pushUndo, lang,
    setAiLoad: ui.setAiLoad, setSummary: ui.setSummary, setShowSum: ui.setShowSum, setShowAdd: ui.setShowAdd,
  })

  // ── Derived data ──────────────────────────────────────────
  const proj = projs.find(p => p.id === pid)
  const pSecs = secs[pid] ?? ['To Do', 'In Progress', 'Done']
  const pTasks = tasks.filter(t => t.pid === pid)
  const selTask = tasks.find(t => t.id === ui.selId)
  const showCtx = ['projects', 'portfolios'].includes(nav)

  // Shared UI bag for child components
  const uiBag = {
    ...ui, activeForm, setActiveForm, activeOrgId,
    aiCreate: actions.aiCreate,
  }

  // ── Auth gate ─────────────────────────────────────────────
  return (
    <AuthGate appLoading={appLoading} user={user} needsMfa={needsMfa}
      lang={lang} setLang={setLang} tr={tr}
      onMfaComplete={async () => {
        try { await initOrgs(user.id) } catch (e) { log.error('post-MFA init failed:', e) }
        setNeedsMfa(false)
      }}>

    <InboxProvider orgId={activeOrgId}>
    <OrgUsersProvider orgId={activeOrgId}>
    <LangCtx.Provider value={lang}>
      <div className="app-shell" style={{ display: 'flex', height: '92vh', minHeight: 620, background: 'var(--bg3)', borderRadius: 'var(--r3)', overflow: 'hidden', border: '1px solid var(--bd3)', position: 'relative', boxShadow: 'var(--shadow-lg)' }}>

        {/* ── Mobile menu toggle ─────────────────────────── */}
        <button className="mobile-toggle" onClick={() => setMobileSidebar(v => !v)} aria-label="Menu"
          style={{ position: 'absolute', top: 10, left: 10, zIndex: 55, width: 34, height: 34, borderRadius: 'var(--r1)', background: 'var(--bg1)', border: '1px solid var(--bd3)', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, padding: 0 }}>
          ☰
        </button>

        {/* ── Icon sidebar ───────────────────────────────── */}
        <div className={`icon-sidebar${mobileSidebar ? ' open' : ''}`} style={{ flexShrink: 0 }}>
          <IconSidebar dbStatus={dbStatus}
            active={nav} onNav={(n) => { goNav(n); setMobileSidebar(false) }}
            currentUser={user} onLogout={async () => { await signOut(); setUser(null); setOrgs(INITIAL_ORGS) }}
            lang={lang} setLang={setLang} theme={theme} setTheme={setTheme}
            orgs={orgs} activeOrgId={activeOrgId}
            onSwitchOrg={(id) => { switchOrg(id); setMobileSidebar(false) }} onAddOrg={addOrg}
          />
        </div>
        {mobileSidebar && <div onClick={() => setMobileSidebar(false)} style={{ position: 'absolute', inset: 0, zIndex: 49, background: 'var(--overlay)' }} />}

        {/* ── Context sidebar (projects / portfolios list) ── */}
        <Suspense fallback={<ChunkFallback />}>
          {showCtx && (
            <div className={`context-sidebar${mobileSidebar ? ' mobile-open' : ''}`}>
              <ContextSidebar navId={nav} projects={projs} portfolios={ports} selPid={pid}
                onSelProj={(id) => { selProj(id); setMobileSidebar(false) }}
                onAddProject={() => { ui.setShowNewProj(true); setMobileSidebar(false) }}
                currentUser={user} myProjectRoles={myProjectRoles}
                onDeleteProject={actions.delProject} onArchiveProject={actions.archiveProject}
                onDeletePortfolio={actions.delPortfolio} onArchivePortfolio={actions.archivePortfolio} />
            </div>
          )}

          {/* ── Main content area ────────────────────────── */}
          <MainContent
            nav={nav} proj={proj} pid={pid} view={view} setView={setView}
            tasks={tasks} pTasks={pTasks} pSecs={pSecs} projs={projs} ports={ports} secs={secs}
            filters={ui.filters} setFilters={ui.setFilters}
            user={user} orgLoading={orgLoading} myProjectRoles={myProjectRoles} lang={lang} tr={tr}
            actions={{ ...actions, loadOrgData }} ui={uiBag}
          />

          {/* ── Modals & overlays ────────────────────────── */}
          <ModalLayer
            selTask={selTask} tasks={tasks} projs={projs} ports={ports} pSecs={pSecs} proj={proj}
            user={user} activeOrgId={activeOrgId} myProjectRoles={myProjectRoles} lang={lang}
            actions={actions} ui={uiBag}
          />
        </Suspense>
      </div>
    </LangCtx.Provider>
    </OrgUsersProvider>
    </InboxProvider>
    </AuthGate>
  )
}
