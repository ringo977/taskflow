/**
 * ProjectSupervisionPage — wrapper that renders the supervision view
 * with two sub-tabs: Cockpit and Deliverables Register.
 */
import { useState } from 'react'
import { useLang } from '@/i18n'
import { useDeliverables } from '@/supervision/hooks/useDeliverables'
import DeadlinesCockpit from '@/supervision/components/DeadlinesCockpit'
import DeliverablesRegister from '@/supervision/components/DeliverablesRegister'

const SUB_TABS = ['cockpit', 'deliverables']

export default function ProjectSupervisionPage({ project, tasks, orgId, onOpenTask, lang }) {
  const t = useLang()
  const [subTab, setSubTab] = useState('cockpit')

  const { deliverables, loading, save, remove } = useDeliverables(orgId, project?.id)

  const tabLabels = { cockpit: t.supCockpit, deliverables: t.supDeliverables }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid var(--bd3)' }}>
        {SUB_TABS.map(tab => (
          <button key={tab} onClick={() => setSubTab(tab)}
            style={{
              padding: '8px 18px', fontSize: 13, fontWeight: subTab === tab ? 600 : 400,
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: subTab === tab ? 'var(--tx1)' : 'var(--tx3)',
              borderBottom: subTab === tab ? '2px solid var(--c-brand)' : '2px solid transparent',
              marginBottom: -2,
            }}>
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Content */}
      {subTab === 'cockpit' && (
        <DeadlinesCockpit
          tasks={tasks}
          deliverables={deliverables}
          onOpenTask={onOpenTask}
          lang={lang}
        />
      )}
      {subTab === 'deliverables' && (
        <DeliverablesRegister
          deliverables={deliverables}
          loading={loading}
          onSave={save}
          onDelete={remove}
          onOpen={onOpenTask}
          lang={lang}
        />
      )}
    </div>
  )
}
