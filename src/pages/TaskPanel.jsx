import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/i18n'
import { isOverdue } from '@/utils/filters'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import { getProjectRole, canEditTasks, canEditTaskInWp } from '@/utils/permissions'
import Badge from '@/components/Badge'
import ConfirmModal from '@/components/ConfirmModal'

import { usePartners } from '@/hooks/usePartners'
import { useWorkpackages } from '@/hooks/useWorkpackages'
import { useMilestones } from '@/hooks/useMilestones'
import DetailTab from './taskpanel/DetailTab'
import ActivityTab from './taskpanel/ActivityTab'
import FilesTimeTab from './taskpanel/FilesTimeTab'

/**
 * TaskPanel — detail drawer for a single task.
 *
 * Composition shell around three sibling tab components. This parent
 * owns only the header chrome (project chip, status flags, close, ⋯
 * overflow menu), the pinned title + tab switcher, and the scrollable
 * content area that renders the active tab.
 *
 * F3.5a extracted the three tabs into src/pages/taskpanel/.
 * F3.5b adds the visible tab switcher, sticky title/tabs, and a ⋯
 * menu that houses the delete action (previously inline at bottom).
 */
export default function TaskPanel({ task, projects, allTasks = [], currentUser, orgId, myProjectRoles = {}, onClose, onUpd, onDelete, onGenSubs, aiLoad, lang }) {
  const t = useLang()
  const orgUsers = useOrgUsers()
  const [confirmDel, setConfirmDel] = useState(false)
  const [tab, setTab] = useState('details')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const { orgPartners } = usePartners(orgId, task?.pid)
  const { workpackages } = useWorkpackages(orgId, task?.pid)
  const { milestones } = useMilestones(orgId, task?.pid)

  const proj = projects.find(p => p.id === task.pid)
  const me = orgUsers.find(u => u.email === currentUser?.email)
  const isAdmin = me?.role === 'admin'
  const isManager = me?.role === 'manager'
  const projectRole = getProjectRole(currentUser, proj, orgUsers, myProjectRoles)
  const canDelete = isAdmin || (isManager && projectRole === 'owner')
  const ov = isOverdue(task.due) && !task.done

  const taskWp = task.workpackageId ? workpackages.find(w => w.id === task.workpackageId) : null
  const readOnly = !canEditTaskInWp(projectRole, taskWp, me?.id)
  const wpLocked = !readOnly ? false : canEditTasks(projectRole)

  const isBlocked = (task.deps ?? [])
    .map(id => allTasks.find(t => t.id === id))
    .some(d => d && !d.done)

  // Close the overflow menu on outside click / escape
  useEffect(() => {
    if (!menuOpen) return
    const onDocClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const sectionTitle = { fontSize: 11, fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em' }

  const TABS = [
    ['details',   t.tabDetails   ?? 'Details'],
    ['activity',  t.tabActivity  ?? 'Activity'],
    ['filestime', t.tabFilesTime ?? 'Files & Time'],
  ]

  const tabBtnStyle = (selected, isLast) => ({
    padding: '6px 14px', fontSize: 12, border: 'none',
    borderRight: isLast ? 'none' : '1px solid var(--bd3)',
    background: selected ? 'var(--bg2)' : 'transparent',
    color: selected ? 'var(--tx1)' : 'var(--tx2)',
    fontWeight: selected ? 500 : 400, cursor: 'pointer',
  })

  const hasOverflow = canDelete && !!onDelete

  return (
    <div className="task-panel" style={{ width: '100%', background: 'var(--bg1)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--bd3)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {proj && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: proj.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--tx3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj.name}</span>
          </div>
        )}
        {isBlocked && (
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-danger)', background: 'color-mix(in srgb, var(--c-danger) 12%, transparent)', padding: '2px 8px', borderRadius: 'var(--r1)' }}>
            {t.blocked}
          </span>
        )}
        {readOnly && (
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx3)', background: 'color-mix(in srgb, var(--tx3) 12%, transparent)', padding: '2px 8px', borderRadius: 'var(--r1)' }}>
            View only
          </span>
        )}
        <Badge pri={task.pri} />

        {/* Overflow menu (only rendered if there's at least one action) */}
        {hasOverflow && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              data-testid="task-more-menu"
              aria-label={t.moreActions ?? 'More actions'}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(v => !v)}
              style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--tx3)', padding: '4px 6px', lineHeight: 1, borderRadius: 'var(--r1)' }}
            >⋯</button>
            {menuOpen && (
              <div role="menu" style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 4,
                background: 'var(--bg1)', border: '1px solid var(--bd2)',
                borderRadius: 'var(--r1)', boxShadow: 'var(--shadow-md)',
                minWidth: 160, zIndex: 20, padding: 4,
              }}>
                <button role="menuitem"
                  onClick={() => { setMenuOpen(false); setConfirmDel(true) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', fontSize: 12, border: 'none', background: 'transparent', color: 'var(--c-danger)', cursor: 'pointer', borderRadius: 'var(--r1)' }}>
                  {t.deleteTask}
                </button>
              </div>
            )}
          </div>
        )}

        <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--tx3)', padding: '4px 6px', lineHeight: 1, borderRadius: 'var(--r1)' }}>✕</button>
      </div>

      {/* Pinned title + tab switcher (below header, above scroll) */}
      <div style={{ padding: '16px 20px 0 20px', borderBottom: '1px solid var(--bd3)', background: 'var(--bg1)', flexShrink: 0 }}>
        {wpLocked && taskWp && (
          <div style={{ fontSize: 12, color: 'var(--c-warning)', background: 'var(--c-warning)11', border: '1px solid var(--c-warning)33', borderRadius: 'var(--r1)', padding: '6px 10px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            🔒 {t.wpAccessEditors ?? 'Restricted'} — {taskWp.code} {taskWp.name}
          </div>
        )}

        <div contentEditable={!readOnly} suppressContentEditableWarning
          style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx1)', marginBottom: 12, outline: 'none', lineHeight: 1.5, letterSpacing: '-0.01em', opacity: readOnly ? 0.7 : 1 }}
          onBlur={e => onUpd(task.id, { title: e.target.innerText.trim() })}>
          {task.title}
        </div>

        <div role="tablist" aria-label={t.taskTabs ?? 'Task sections'}
          style={{ display: 'inline-flex', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', overflow: 'hidden', marginBottom: -1 }}>
          {TABS.map(([v, lb], i, arr) => (
            <button key={v} role="tab"
              data-testid={`tab-task-${v}`}
              aria-selected={tab === v}
              onClick={() => setTab(v)}
              style={tabBtnStyle(tab === v, i === arr.length - 1)}>
              {lb}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content area — renders only the active tab */}
      <div style={{ flex: 1, overflow: 'auto', padding: '18px 20px' }}>
        {tab === 'details' && (
          <DetailTab
            task={task} proj={proj} projects={projects} allTasks={allTasks}
            orgUsers={orgUsers} orgPartners={orgPartners}
            workpackages={workpackages} milestones={milestones}
            onUpd={onUpd} readOnly={readOnly} ov={ov}
            sectionTitle={sectionTitle} t={t}
          />
        )}
        {tab === 'activity' && (
          <ActivityTab
            task={task} currentUser={currentUser} orgUsers={orgUsers}
            onUpd={onUpd} onGenSubs={onGenSubs} aiLoad={aiLoad}
            readOnly={readOnly} sectionTitle={sectionTitle} t={t} lang={lang}
          />
        )}
        {tab === 'filestime' && (
          <FilesTimeTab
            task={task} currentUser={currentUser} orgId={orgId} onUpd={onUpd}
            readOnly={readOnly} sectionTitle={sectionTitle} t={t}
          />
        )}
      </div>

      {confirmDel && (
        <ConfirmModal
          message={t.confirmDeleteTask(task.title)}
          onConfirm={() => { setConfirmDel(false); onDelete(task.id) }}
          onCancel={() => setConfirmDel(false)}
        />
      )}
    </div>
  )
}
