import { lazy, Suspense } from 'react'
import { PROJECT_TEMPLATES } from '@/constants'

const TaskPanel = lazy(() => import('@/pages/TaskPanel'))
const AddModal = lazy(() => import('@/pages/AddModal'))
const CommandPalette = lazy(() => import('@/components/CommandPalette'))
const NewProjectModal = lazy(() => import('@/components/NewProjectModal'))
const FormSubmitModal = lazy(() => import('@/components/FormSubmitModal'))

const ChunkFallback = () => (
  <div style={{ padding: 24, color: 'var(--tx3)', fontSize: 13 }}>Loading...</div>
)

/**
 * ModalLayer — all floating panels, modals, and command palette.
 * Rendered at the top level of the app shell.
 */
export default function ModalLayer({
  selTask, tasks, projs, ports, pSecs, proj, user, activeOrgId, myProjectRoles, lang,
  actions, ui,
}) {
  const { updTask, delTask, genSubs, addTask, addProject } = actions
  const {
    setSelId, showAdd, setShowAdd, addDue, setAddDue,
    aiLoad, showCmdK, setShowCmdK, showNewProj, setShowNewProj,
    activeForm, setActiveForm, selProj, goNav,
  } = ui

  return (
    <Suspense fallback={<ChunkFallback />}>
      {selTask && (
        <TaskPanel task={selTask} projects={projs} allTasks={tasks}
          currentUser={user} orgId={activeOrgId} myProjectRoles={myProjectRoles}
          onClose={() => setSelId(null)} onUpd={updTask} onDelete={delTask}
          onGenSubs={genSubs} aiLoad={aiLoad} lang={lang} />
      )}
      {showAdd && (
        <AddModal secs={pSecs} templates={proj?.taskTemplates ?? []}
          onAdd={addTask} onClose={() => { setShowAdd(false); setAddDue('') }}
          aiLoad={aiLoad} onAICreate={ui.aiCreate} currentUser={user} defaultDue={addDue}
          project={proj} orgId={activeOrgId} />
      )}
      {showCmdK && (
        <CommandPalette tasks={tasks} projects={projs}
          onOpenTask={id => setSelId(id)} onOpenProject={id => selProj(id)}
          onNavigate={n => goNav(n)} onClose={() => setShowCmdK(false)} />
      )}
      {showNewProj && (
        <NewProjectModal templates={PROJECT_TEMPLATES} portfolios={ports}
          onAdd={(name, color, portfolio, tpl) => { addProject(name, color, portfolio, tpl); setShowNewProj(false) }}
          onClose={() => setShowNewProj(false)} lang={lang} />
      )}
      {activeForm && (
        <FormSubmitModal form={activeForm} sections={pSecs}
          onClose={() => setActiveForm(null)}
          onSubmit={(task) => { addTask({ ...task, startDate: null }); setActiveForm(null) }} />
      )}
    </Suspense>
  )
}
