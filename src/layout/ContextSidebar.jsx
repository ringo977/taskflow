import { useLang } from '@/i18n'

export default function ContextSidebar({ navId, projects, portfolios, selPid, onSelProj, onAddProject }) {
  const t = useLang()
  if (!['projects', 'portfolios'].includes(navId)) return null

  const SidebarItem = ({ project, selected }) => (
    <div
      onClick={() => onSelProj(project.id)}
      className="row-interactive"
      style={{
        padding: '8px 12px', borderRadius: 'var(--r1)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 9, fontSize: 13,
        background: selected ? 'var(--bg1)' : 'transparent',
        color: selected ? 'var(--tx1)' : 'var(--tx2)',
        fontWeight: selected ? 500 : 400,
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: project.color, flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
    </div>
  )

  return (
    <div style={{
      width: 240, background: 'var(--bg2)', borderRight: '1px solid var(--bd3)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--bd3)', fontSize: 13, fontWeight: 600, color: 'var(--tx2)', letterSpacing: '-0.01em' }}>
        {navId === 'portfolios' ? t.portfolios : t.projects}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 8px' }}>
        {navId === 'portfolios'
          ? portfolios.map(po => {
              const children = projects.filter(p => p.portfolio === po.id)
              return (
                <div key={po.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', marginBottom: 3 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: po.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)', letterSpacing: '-0.01em' }}>{po.name}</span>
                  </div>
                  {children.map(p => (
                    <div key={p.id} style={{ paddingLeft: 16 }}>
                      <SidebarItem project={p} selected={selPid === p.id} />
                    </div>
                  ))}
                </div>
              )
            })
          : projects.map(p => <SidebarItem key={p.id} project={p} selected={selPid === p.id} />)
        }
        {onAddProject && navId === 'projects' && (
          <div onClick={onAddProject} className="row-interactive"
            style={{ padding: '8px 12px', borderRadius: 'var(--r1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--tx3)', marginTop: 4 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> {t.newProject ?? 'New project'}
          </div>
        )}
      </div>
    </div>
  )
}
