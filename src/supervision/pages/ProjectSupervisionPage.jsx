/**
 * ProjectSupervisionPage — wrapper that renders the supervision view
 * with four sub-tabs: Cockpit, Deliverables, Timeline, Recurring.
 */
import { useState, useCallback } from 'react'
import { useLang } from '@/i18n'
import { useDeliverables } from '@/supervision/hooks/useDeliverables'
import { useRecurringControls } from '@/supervision/hooks/useRecurringControls'
import DeadlinesCockpit from '@/supervision/components/DeadlinesCockpit'
import DeliverablesRegister from '@/supervision/components/DeliverablesRegister'
import SupervisionTimeline from '@/supervision/components/SupervisionTimeline'
import RecurringControlsPanel from '@/supervision/components/RecurringControlsPanel'

const SUB_TABS = ['cockpit', 'deliverables', 'timeline', 'recurring']

export default function ProjectSupervisionPage({ project, tasks, orgId, onOpenTask, addTask, lang }) {
  const t = useLang()
  const [subTab, setSubTab] = useState('cockpit')

  const { deliverables, loading, save, remove } = useDeliverables(orgId, project?.id)
  const {
    controls, dueControls, save: saveControl, remove: removeControl,
    toggleActive, advance,
  } = useRecurringControls(orgId, project?.id)

  const tabLabels = {
    cockpit: t.supCockpit,
    deliverables: t.supDeliverables,
    timeline: t.supTimeline,
    recurring: t.supRecurring,
  }

  // Execute a due control: advance due date, optionally create task
  const executeControl = useCallback(async (control) => {
    if (control.actionType === 'create_task' && addTask && control.templateTaskData) {
      const tpl = control.templateTaskData
      addTask({
        title: tpl.title ?? control.title,
        sec: tpl.sec ?? undefined,
        who: tpl.who ?? '',
        startDate: null,
        due: tpl.due ?? '',
        pri: tpl.pri ?? 'medium',
        desc: tpl.desc ?? `Auto-created by recurring control: ${control.title}`,
      })
    }
    await advance(control)
  }, [addTask, advance])

  return (
    <div data-testid="supervision-page" style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid var(--bd3)' }}>
        {SUB_TABS.map(tab => (
          <button key={tab} data-testid={`sup-tab-${tab}`} onClick={() => setSubTab(tab)}
            style={{
              padding: '8px 18px', fontSize: 13, fontWeight: subTab === tab ? 600 : 400,
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: subTab === tab ? 'var(--tx1)' : 'var(--tx3)',
              borderBottom: subTab === tab ? '2px solid var(--c-brand)' : '2px solid transparent',
              marginBottom: -2,
            }}>
            {tabLabels[tab]}
            {tab === 'recurring' && dueControls.length > 0 && (
              <span data-testid="due-controls-badge" style={{
                marginLeft: 6, fontSize: 10, fontWeight: 600,
                background: 'var(--c-warning)', color: '#fff',
                borderRadius: 8, padding: '1px 5px', verticalAlign: 'middle',
              }}>
                {dueControls.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {subTab === 'cockpit' && (
        <DeadlinesCockpit tasks={tasks} deliverables={deliverables}
          onOpenTask={onOpenTask} lang={lang} />
      )}
      {subTab === 'deliverables' && (
        <DeliverablesRegister deliverables={deliverables} loading={loading}
          onSave={save} onDelete={remove} onOpen={onOpenTask} lang={lang} />
      )}
      {subTab === 'timeline' && (
        <SupervisionTimeline tasks={tasks} deliverables={deliverables}
          controls={controls} onOpenTask={onOpenTask} lang={lang} />
      )}
      {subTab === 'recurring' && (
        <RecurringControlsPanel controls={controls} dueControls={dueControls}
          onSave={saveControl} onDelete={removeControl}
          onToggle={toggleActive} onExecute={executeControl} lang={lang} />
      )}
    </div>
  )
}
