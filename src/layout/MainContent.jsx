import { lazy, Suspense } from 'react'
import ErrorBoundary from '@/components/ErrorBoundary'
import FilterBar from '@/components/FilterBar'

const HomeDashboard = lazy(() => import('@/pages/HomeDashboard'))
const PortfoliosView = lazy(() => import('@/pages/PortfoliosView'))
const PeopleView = lazy(() => import('@/pages/PeopleView'))
const InboxView = lazy(() => import('@/pages/InboxView'))
const TrashView = lazy(() => import('@/pages/TrashView'))
const MyTasksView = lazy(() => import('@/views/MyTasksView'))
const BoardView = lazy(() => import('@/views/BoardView'))
const ListView = lazy(() => import('@/views/ListView'))
const CalendarView = lazy(() => import('@/views/CalendarView'))
const TimelineView = lazy(() => import('@/views/TimelineView'))
const ProjectOverview = lazy(() => import('@/views/ProjectOverview'))
const ProjectHeader = lazy(() => import('@/components/ProjectHeader'))
const ProjectSupervisionPage = lazy(() => import('@/supervision/pages/ProjectSupervisionPage'))
const SummaryPanel = lazy(() => import('@/components/SummaryPanel'))

const ChunkFallback = () => (
  <div style={{ padding: 24, color: 'var(--tx3)', fontSize: 13 }}>Loading...</div>
)

/**
 * ProjectContent — project header + active view.
 * Extracted from App.jsx to reduce render-block size.
 */
function ProjectContent({
  proj, view, setView, pTasks, pSecs, tasks, projs, ports,
  filters, setFilters, user, _orgLoading, myProjectRoles, lang, _tr,
  actions, ui,
}) {
  const {
    updTask, togTask, moveTask, reorderTask, addTask, handleUpdateSecs,
    getSum, delProject, archiveProject, updProj,
  } = actions
  const { setShowAdd, setAddDue, setSelId, openAddOnDate, setActiveForm } = ui

  return (
    <>
      <ProjectHeader
        proj={proj} view={view} setView={setView} tasks={pTasks}
        onAddTask={() => { setAddDue(''); setShowAdd(true) }}
        onSummary={() => getSum(proj?.name, pTasks)}
        onExport={() => {
          import('@/utils/exportCsv').then(m => m.exportTasksCsv(pTasks, proj?.name, proj?.customFields, proj, user?.name))
        }}
        portfolios={ports}
        onSubmitForm={proj?.forms?.length ? (form) => setActiveForm(form) : null}
        forms={proj?.forms ?? []}
      />
      {view !== 'overview' && view !== 'supervision' && <FilterBar filters={filters} setFilters={setFilters} tasks={pTasks} />}
      {view === 'overview' && (
        <ProjectOverview project={proj} tasks={tasks} sections={pSecs}
          onUpdProj={updProj} onOpen={setSelId} lang={lang} currentUser={user}
          myProjectRoles={myProjectRoles} onDeleteProject={delProject} onArchiveProject={archiveProject} />
      )}
      {view === 'board' && (
        <BoardView tasks={pTasks} secs={pSecs} project={proj} currentUser={user} myProjectRoles={myProjectRoles} onOpen={setSelId} onToggle={togTask}
          onMove={moveTask} onReorder={reorderTask}
          onAddTask={(tl, s) => addTask({ title: tl, sec: s, who: user.name, startDate: null, due: '', pri: 'medium' })}
          onUpdateSecs={handleUpdateSecs} filters={filters} lang={lang} />
      )}
      {view === 'lista' && (
        <ListView tasks={pTasks} secs={pSecs} project={proj} currentUser={user} myProjectRoles={myProjectRoles} onOpen={setSelId}
          onToggle={togTask} onMove={moveTask}
          onAddTask={(tl, s) => addTask({ title: tl, sec: s, who: user.name, startDate: null, due: '', pri: 'medium' })}
          filters={filters} lang={lang} />
      )}
      {view === 'timeline' && (
        <TimelineView tasks={pTasks} secs={pSecs} projects={projs} project={proj} currentUser={user} myProjectRoles={myProjectRoles}
          onOpen={setSelId} onUpd={updTask} filters={filters} lang={lang} />
      )}
      {view === 'calendario' && (
        <CalendarView tasks={tasks} projects={projs} project={proj} currentUser={user} myProjectRoles={myProjectRoles} onOpen={setSelId}
          onUpd={updTask} onAddTaskOnDate={openAddOnDate} filters={filters} lang={lang} />
      )}
      {view === 'supervision' && (
        <ProjectSupervisionPage project={proj} tasks={pTasks} orgId={ui.activeOrgId}
          onOpenTask={setSelId} lang={lang} />
      )}
    </>
  )
}

/**
 * MainContent — dispatches to the correct page/view based on `nav`.
 */
export default function MainContent({
  nav, proj, pid, view, setView, tasks, pTasks, pSecs, projs, ports,
  secs, filters, setFilters, user, orgLoading, myProjectRoles, lang, tr,
  actions, ui,
}) {
  const { setSelId, selProj } = ui
  const { togTask, addPortfolio, delPortfolio, archivePortfolio, loadOrgData } = actions

  const projectContent = (
    <ProjectContent
      proj={proj} view={view} setView={setView} pTasks={pTasks} pSecs={pSecs}
      tasks={tasks} projs={projs} ports={ports} filters={filters} setFilters={setFilters}
      user={user} orgLoading={orgLoading} myProjectRoles={myProjectRoles} lang={lang} tr={tr}
      actions={actions} ui={ui}
    />
  )

  return (
    <ErrorBoundary fallback={(error, reset) => (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--tx2)' }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Something went wrong</div>
        <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 16 }}>{error?.message}</div>
        <button onClick={reset} style={{ padding: '6px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer', fontSize: 12 }}>
          Reload view
        </button>
      </div>
    )}>
    <Suspense fallback={<ChunkFallback />}>
      <div className="mobile-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, position: 'relative' }}>
        {nav === 'home' && <HomeDashboard tasks={tasks} projects={projs} secs={secs} currentUser={user} onOpen={setSelId} onNav={ui.goNav} lang={lang} />}
        {nav === 'projects' && projectContent}
        {nav === 'portfolios' && (
          proj && projs.find(p => p.id === pid)
            ? projectContent
            : <PortfoliosView portfolios={ports} projects={projs} tasks={tasks} onSelProj={selProj}
                onAddPortfolio={addPortfolio} onDeletePortfolio={delPortfolio} onArchivePortfolio={archivePortfolio} currentUser={user} />
        )}
        {nav === 'mytasks' && (
          <>
            <FilterBar filters={filters} setFilters={setFilters} tasks={tasks} />
            <MyTasksView tasks={tasks} projects={projs} currentUser={user} filters={filters}
              onOpen={setSelId} onToggle={togTask} lang={lang} />
          </>
        )}
        {nav === 'people' && <PeopleView tasks={tasks} projects={projs} currentUser={user} activeOrgId={ui.activeOrgId} />}
        {nav === 'inbox' && <InboxView onOpenTask={(id) => setSelId(id)} lang={lang} />}
        {nav === 'trash' && <TrashView orgId={ui.activeOrgId} onReload={() => loadOrgData(ui.activeOrgId)} />}

        {ui.showSum && <SummaryPanel summary={ui.summary} loading={ui.aiLoad && !ui.summary} onClose={() => ui.setShowSum(false)} />}
      </div>
    </Suspense>
    </ErrorBoundary>
  )
}
