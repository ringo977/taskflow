import { LangCtx, translations } from '@/i18n'
import { exportTasksCsv as exportCsv } from '@/utils/exportCsv'
import { signOut } from '@/lib/auth'
import { INITIAL_ORGS } from '@/data/orgs'
import { PROJECT_TEMPLATES } from '@/constants'

// Hooks
import { useAppBootstrap } from '@/hooks/useAppBootstrap'
import { useTaskActions } from '@/hooks/useTaskActions'
import { useProjectActions } from '@/hooks/useProjectActions'
import { useUIState } from '@/hooks/useUIState'
import { useAIActions } from '@/hooks/useAIActions'
import { useSectionActions } from '@/hooks/useSectionActions'

// Components
import LoadingScreen from '@/components/LoadingScreen'
import NewProjectModal from '@/components/NewProjectModal'
import ProjectHeader from '@/components/ProjectHeader'
import SummaryPanel from '@/components/SummaryPanel'

// Pages & Views
import LoginPage from '@/pages/LoginPage'
import MfaPage from '@/pages/MfaPage'
import HomeDashboard from '@/pages/HomeDashboard'
import PortfoliosView from '@/pages/PortfoliosView'
import PeopleView from '@/pages/PeopleView'
import TaskPanel from '@/pages/TaskPanel'
import AddModal from '@/pages/AddModal'
import MyTasksView from '@/views/MyTasksView'
import InboxView from '@/pages/InboxView'
import TrashView from '@/pages/TrashView'
import BoardView from '@/views/BoardView'
import ListView from '@/views/ListView'
import CalendarView from '@/views/CalendarView'
import TimelineView from '@/views/TimelineView'
import ProjectOverview from '@/views/ProjectOverview'
import FilterBar from '@/components/FilterBar'
import CommandPalette from '@/components/CommandPalette'
import IconSidebar from '@/layout/IconSidebar'
import ContextSidebar from '@/layout/ContextSidebar'
import { OrgUsersProvider } from '@/context/OrgUsersCtx'
import { ToastProvider, useToast } from '@/context/ToastCtx'
import { InboxProvider, useInbox } from '@/context/InboxCtx'
import { UndoProvider, useUndo } from '@/context/UndoCtx'

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

// ── App (orchestrator) ───────────────────────────────────────
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

  // ── UI state: navigation, routing, modals, filters ─────────
  const ui = useUIState({ activeOrgId })
  const {
    nav, setNav, pid, setPid, view, setView,
    selId, setSelId,
    showAdd, setShowAdd, addDue, setAddDue,
    aiLoad, setAiLoad, summary, setSummary, showSum, setShowSum,
    filters, setFilters,
    showCmdK, setShowCmdK,
    mobileSidebar, setMobileSidebar,
    showNewProj, setShowNewProj,
    selProj, goNav, openAddOnDate,
  } = ui

  // ── Task actions ───────────────────────────────────────────
  const { updTask, togTask, moveTask, reorderTask, addTask, delTask } =
    useTaskActions({ tasks, setTasks, activeOrgId, secRowsRef, user, pid, toast, tr, inbox, pushUndo })

  // ── Project & portfolio actions ────────────────────────────
  const { addProject, addPortfolio, delProject, delPortfolio, archiveProject, archivePortfolio, updProj } =
    useProjectActions({ projs, setProjs, ports, setPorts, secs, setSecs, tasks, setTasks, activeOrgId, secRowsRef, user, pid, setPid, setNav, setSelId, myProjectRoles, setMyProjectRoles, toast, tr, inbox })

  // ── Section actions ────────────────────────────────────────
  const { handleUpdateSecs } = useSectionActions({ setSecs, pid, activeOrgId, secRowsRef })

  // ── AI actions ─────────────────────────────────────────────
  const { genSubs, aiCreate, getSum } = useAIActions({
    setAiLoad, setSummary, setShowSum, setShowAdd,
    updTask, addTask, toast, tr, lang,
  })

  // ── Derived data ───────────────────────────────────────────
  const proj = projs.find(p => p.id === pid)
  const pSecs = secs[pid] ?? ['To Do', 'In Progress', 'Done']
  const pTasks = tasks.filter(t => t.pid === pid)
  const selTask = tasks.find(t => t.id === selId)
  const showCtx = ['projects', 'portfolios'].includes(nav)

  // ── Auth gates ─────────────────────────────────────────────
  if (appLoading) return <LangCtx.Provider value={lang}><LoadingScreen message={tr.loadingMsg} /></LangCtx.Provider>
  if (!user) return <LangCtx.Provider value={lang}><LoginPage lang={lang} setLang={setLang} /></LangCtx.Provider>
  if (needsMfa) return <LangCtx.Provider value={lang}><MfaPage onComplete={async () => {
    try { await initOrgs(user.id) } catch (e) { console.error('post-MFA init:', e) }
    setNeedsMfa(false)
  }} lang={lang} /></LangCtx.Provider>

  // ── Project content (shared between projects & portfolios) ─
  const projectContent = (
    <>
      <ProjectHeader proj={proj} view={view} setView={setView} tasks={pTasks}
        onAddTask={() => { setAddDue(''); setShowAdd(true) }}
        onSummary={() => getSum(proj?.name, pTasks)}
        onExport={() => exportCsv(pTasks, proj?.name, proj?.customFields)} portfolios={ports} />
      {view !== 'overview' && view !== 'timeline' && <FilterBar filters={filters} setFilters={setFilters} tasks={pTasks} />}
      {orgLoading && <div style={{ padding: '8px 18px', fontSize: 12, color: 'var(--tx3)', borderBottom: '0.5px solid var(--bd3)' }}>⟳ {tr.syncing}</div>}
      {view === 'overview' && <ProjectOverview project={proj} tasks={tasks} onUpdProj={updProj} onOpen={setSelId} lang={lang} currentUser={user} myProjectRoles={myProjectRoles} onDeleteProject={delProject} onArchiveProject={archiveProject} />}
      {view === 'board' && <BoardView tasks={pTasks} secs={pSecs} onOpen={setSelId} onToggle={togTask} onMove={moveTask} onReorder={reorderTask} onAddTask={(tl, s) => addTask({ title: tl, sec: s, who: user.name, startDate: null, due: '', pri: 'medium' })} onUpdateSecs={handleUpdateSecs} filters={filters} lang={lang} />}
      {view === 'lista' && <ListView tasks={pTasks} secs={pSecs} project={proj} onOpen={setSelId} onToggle={togTask} onMove={moveTask} onAddTask={(tl, s) => addTask({ title: tl, sec: s, who: user.name, startDate: null, due: '', pri: 'medium' })} filters={filters} lang={lang} />}
      {view === 'timeline' && <TimelineView tasks={pTasks} secs={pSecs} projects={projs} onOpen={setSelId} lang={lang} />}
      {view === 'calendario' && <CalendarView tasks={tasks} projects={projs} onOpen={setSelId} onAddTaskOnDate={openAddOnDate} filters={filters} lang={lang} />}
    </>
  )

  // ── Render ─────────────────────────────────────────────────
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
            currentUser={user} onLogout={async () => {
              await signOut()
              setUser(null)
              setOrgs(INITIAL_ORGS)
            }}
            lang={lang} setLang={setLang} theme={theme} setTheme={setTheme}
            orgs={orgs} activeOrgId={activeOrgId}
            onSwitchOrg={(id) => { switchOrg(id); setMobileSidebar(false) }} onAddOrg={addOrg}
            onSetup2FA={() => setNeedsMfa(true)}
          />
        </div>
        {mobileSidebar && <div onClick={() => setMobileSidebar(false)} style={{ position: 'absolute', inset: 0, zIndex: 49, background: 'var(--overlay)' }} />}

        {showCtx && <div className={`context-sidebar${mobileSidebar ? ' mobile-open' : ''}`}><ContextSidebar navId={nav} projects={projs} portfolios={ports} selPid={pid} onSelProj={(id) => { selProj(id); setMobileSidebar(false) }} onAddProject={() => { setShowNewProj(true); setMobileSidebar(false) }} currentUser={user} myProjectRoles={myProjectRoles} onDeleteProject={delProject} onArchiveProject={archiveProject} onDeletePortfolio={delPortfolio} onArchivePortfolio={archivePortfolio} /></div>}

        <div className="mobile-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, position: 'relative' }}>
          {nav === 'home' && <HomeDashboard tasks={tasks} projects={projs} secs={secs} currentUser={user} onOpen={setSelId} onNav={goNav} lang={lang} />}
          {nav === 'projects' && projectContent}
          {nav === 'portfolios' && (proj && projs.find(p => p.id === pid)
            ? projectContent
            : <PortfoliosView portfolios={ports} projects={projs} tasks={tasks} onSelProj={selProj} onAddPortfolio={addPortfolio} onDeletePortfolio={delPortfolio} onArchivePortfolio={archivePortfolio} currentUser={user} />
          )}
          {nav === 'mytasks' && <><FilterBar filters={filters} setFilters={setFilters} tasks={tasks} /><MyTasksView tasks={tasks} projects={projs} currentUser={user} filters={filters} onOpen={setSelId} onToggle={togTask} lang={lang} /></>}
          {nav === 'people' && <PeopleView tasks={tasks} projects={projs} currentUser={user} activeOrgId={activeOrgId} />}
          {nav === 'inbox' && <InboxView onOpenTask={(id) => { setSelId(id) }} lang={lang} />}
          {nav === 'trash' && <TrashView orgId={activeOrgId} onReload={() => loadOrgData(activeOrgId)} />}

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
