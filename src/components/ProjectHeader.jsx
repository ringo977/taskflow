import { useMemo } from 'react'
import { useLang } from '@/i18n'
import AvatarGroup from '@/components/AvatarGroup'

export default function ProjectHeader({ proj, view, setView, tasks, onAddTask, onSummary, onExport, portfolios }) {
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
