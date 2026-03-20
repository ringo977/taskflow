import { useState, useRef } from 'react'
import { useLang } from '@/i18n'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import ConfirmModal from '@/components/ConfirmModal'

const COLLAPSE_KEY = 'taskflow-sidebar-collapsed'

function loadCollapsed() {
  try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? '{}') } catch { return {} }
}

export default function ContextSidebar({
  navId, projects, portfolios, selPid,
  onSelProj, onAddProject, currentUser, myProjectRoles = {},
  onDeleteProject, onArchiveProject,
  onDeletePortfolio, onArchivePortfolio,
}) {
  const t = useLang()
  const orgUsers = useOrgUsers()
  const me = orgUsers.find(u => u.email === currentUser?.email)
  const isAdmin = me?.role === 'admin'
  const isManager = me?.role === 'manager'
  const canManageProject = (projectId) => isAdmin || (isManager && myProjectRoles[projectId] === 'owner')
  const [collapsed, setCollapsed] = useState(loadCollapsed)
  const [showArchived, setShowArchived] = useState(false)
  const [actionMenu, setActionMenu] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  const menuRef = useRef(null)

  if (!['projects', 'portfolios'].includes(navId)) return null

  const toggleCollapse = key => {
    setCollapsed(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next))
      return next
    })
  }

  const hasArchived = projects.some(p => p.status === 'archived') || portfolios.some(p => p.status === 'archived')

  const visibleProjects = showArchived ? projects : projects.filter(p => p.status !== 'archived')
  const visiblePortfolios = showArchived ? portfolios : portfolios.filter(p => p.status !== 'archived')

  const closeMenu = () => setActionMenu(null)

  const openContextMenu = (e, type, item) => {
    e.preventDefault()
    e.stopPropagation()
    setActionMenu({ type, item, x: e.clientX, y: e.clientY })
  }

  const SidebarItem = ({ project, selected }) => (
    <div
      onClick={() => onSelProj(project.id)}
      onContextMenu={canManageProject(project.id) ? e => openContextMenu(e, 'project', project) : undefined}
      className="row-interactive"
      style={{
        padding: '8px 12px', borderRadius: 'var(--r1)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 9, fontSize: 13,
        background: selected ? 'var(--bg1)' : 'transparent',
        color: selected ? 'var(--tx1)' : 'var(--tx2)',
        fontWeight: selected ? 500 : 400,
        opacity: project.status === 'archived' ? 0.5 : 1,
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: project.color, flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{project.name}</span>
      {project.status === 'archived' && <span style={{ fontSize: 10, color: 'var(--tx3)' }}>{t.archived}</span>}
      {canManageProject(project.id) && (
        <button onClick={e => openContextMenu(e, 'project', project)}
          style={{ background: 'transparent', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1, flexShrink: 0, opacity: 0.4 }}>
          ⋯
        </button>
      )}
    </div>
  )

  const SectionHeader = ({ label, collapseKey }) => (
    <div onClick={() => toggleCollapse(collapseKey)}
      style={{
        padding: '16px 16px 12px', borderBottom: '1px solid var(--bd3)',
        fontSize: 13, fontWeight: 600, color: 'var(--tx2)', letterSpacing: '-0.01em',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none',
      }}>
      <span>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--tx3)', transform: collapsed[collapseKey] ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>▾</span>
    </div>
  )

  return (
    <div style={{
      width: 240, background: 'var(--bg2)', borderRight: '1px solid var(--bd3)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
    }}>
      <SectionHeader label={navId === 'portfolios' ? t.portfolios : t.projects} collapseKey={navId} />

      {!collapsed[navId] && (
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 8px' }}>
          {navId === 'portfolios'
            ? visiblePortfolios.map(po => {
                const children = visibleProjects.filter(p => p.portfolio === po.id)
                return (
                  <div key={po.id} style={{ marginBottom: 14 }}>
                    <div
                      onContextMenu={isAdmin ? e => openContextMenu(e, 'portfolio', po) : undefined}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', marginBottom: 3, cursor: 'default' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: po.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)', letterSpacing: '-0.01em', flex: 1, opacity: po.status === 'archived' ? 0.5 : 1 }}>{po.name}</span>
                      {po.status === 'archived' && <span style={{ fontSize: 10, color: 'var(--tx3)' }}>{t.archived}</span>}
                      {isAdmin && (
                        <button onClick={e => openContextMenu(e, 'portfolio', po)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1, opacity: 0.4 }}>
                          ⋯
                        </button>
                      )}
                    </div>
                    {children.map(p => (
                      <div key={p.id} style={{ paddingLeft: 16 }}>
                        <SidebarItem project={p} selected={selPid === p.id} />
                      </div>
                    ))}
                  </div>
                )
              })
            : visibleProjects.map(p => <SidebarItem key={p.id} project={p} selected={selPid === p.id} />)
          }
          {onAddProject && navId === 'projects' && (
            <div onClick={onAddProject} className="row-interactive"
              style={{ padding: '8px 12px', borderRadius: 'var(--r1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--tx3)', marginTop: 4 }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> {t.newProject ?? 'New project'}
            </div>
          )}
        </div>
      )}

      {hasArchived && (
        <div style={{ borderTop: '1px solid var(--bd3)', padding: '8px 12px' }}>
          <button onClick={() => setShowArchived(!showArchived)}
            style={{ fontSize: 11, color: 'var(--tx3)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
            {showArchived ? t.hideArchived : t.showArchived}
          </button>
        </div>
      )}

      {/* Context action menu */}
      {actionMenu && (
        <>
          <div onClick={closeMenu} style={{ position: 'fixed', inset: 0, zIndex: 500 }} />
          <div ref={menuRef} style={{
            position: 'fixed', left: actionMenu.x, top: actionMenu.y, zIndex: 501,
            background: 'var(--bg1)', border: '1px solid var(--bd2)', borderRadius: 'var(--r1)',
            boxShadow: 'var(--shadow-md)', padding: '4px 0', minWidth: 140,
          }}>
            {actionMenu.type === 'project' && onArchiveProject && (
              <div onClick={() => { onArchiveProject(actionMenu.item.id); closeMenu() }}
                className="row-interactive" style={{ padding: '7px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--tx1)' }}>
                {actionMenu.item.status === 'archived' ? t.unarchive : t.archive}
              </div>
            )}
            {actionMenu.type === 'project' && onDeleteProject && (
              <div onClick={() => { closeMenu(); setConfirmModal({ type: 'project', item: actionMenu.item }) }}
                className="row-interactive" style={{ padding: '7px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--c-danger)' }}>
                {t.deleteProject}
              </div>
            )}
            {actionMenu.type === 'portfolio' && onArchivePortfolio && (
              <div onClick={() => { onArchivePortfolio(actionMenu.item.id); closeMenu() }}
                className="row-interactive" style={{ padding: '7px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--tx1)' }}>
                {actionMenu.item.status === 'archived' ? t.unarchive : t.archive}
              </div>
            )}
            {actionMenu.type === 'portfolio' && onDeletePortfolio && (
              <div onClick={() => { closeMenu(); setConfirmModal({ type: 'portfolio', item: actionMenu.item }) }}
                className="row-interactive" style={{ padding: '7px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--c-danger)' }}>
                {t.deletePortfolio}
              </div>
            )}
          </div>
        </>
      )}

      {/* Confirm modals */}
      {confirmModal?.type === 'project' && (
        <ConfirmModal
          message={t.confirmDeleteProject(confirmModal.item.name)}
          onConfirm={() => { onDeleteProject(confirmModal.item.id); setConfirmModal(null) }}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      {confirmModal?.type === 'portfolio' && (
        <ConfirmModal
          message={t.confirmDeletePortfolio(confirmModal.item.name)}
          onConfirm={() => { onDeletePortfolio(confirmModal.item.id); setConfirmModal(null) }}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  )
}
