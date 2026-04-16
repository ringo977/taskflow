import { useState } from 'react'
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
 * Composition shell around three sibling tab components (DetailTab,
 * ActivityTab, FilesTimeTab). This parent owns only the header chrome
 * (project chip, flags, close), the editable title, and the delete
 * action. F3.5a extracted the tabs; F3.5b will add the visible tab
 * switcher + sticky header.
 */
export default function TaskPanel({ task, projects, allTasks = [], currentUser, orgId, myProjectRoles = {}, onClose, onUpd, onDelete, onGenSubs, aiLoad, lang }) {
  const t = useLang()
  const orgUsers = useOrgUsers()
  const [confirmDel, setConfirmDel] = useState(false)
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
  const wpLocked = !readOnly ? false : canEditTasks(projectRole) // user CAN edit at project level but WP blocks it

  const isBlocked = (task.deps ?? [])
    .map(id => allTasks.find(t => t.id === id))
    .some(d => d && !d.done)

  const sectionTitle = { fontSize: 11, fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em' }

  return (
    <div className="task-panel" style={{ width: '100%', background: 'var(--bg1)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--bd3)', display: 'flex', alignItems: 'center', gap: 8 }}>
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
        <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--tx3)', padding: '4px 6px', lineHeight: 1, borderRadius: 'var(--r1)' }}>✕</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '18px 20px' }}>
        {/* WP lock banner */}
        {wpLocked && taskWp && (
          <div style={{ fontSize: 12, color: 'var(--c-warning)', background: 'var(--c-warning)11', border: '1px solid var(--c-warning)33', borderRadius: 'var(--r1)', padding: '6px 10px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            🔒 {t.wpAccessEditors ?? 'Restricted'} — {taskWp.code} {taskWp.name}
          </div>
        )}

        {/* Title — stays in the shell; it's the canonical heading of the whole panel, not a tab */}
        <div contentEditable={!readOnly} suppressContentEditableWarning
          style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx1)', marginBottom: 16, outline: 'none', lineHeight: 1.5, letterSpacing: '-0.01em', opacity: readOnly ? 0.7 : 1 }}
          onBlur={e => onUpd(task.id, { title: e.target.innerText.trim() })}>
          {task.title}
        </div>

        <DetailTab
          task={task} proj={proj} projects={projects} allTasks={allTasks}
          orgUsers={orgUsers} orgPartners={orgPartners}
          workpackages={workpackages} milestones={milestones}
          onUpd={onUpd} readOnly={readOnly} ov={ov}
          sectionTitle={sectionTitle} t={t}
        />

        <FilesTimeTab
          task={task} currentUser={currentUser} orgId={orgId} onUpd={onUpd}
          readOnly={readOnly} sectionTitle={sectionTitle} t={t}
        />

        <ActivityTab
          task={task} currentUser={currentUser} orgUsers={orgUsers}
          onUpd={onUpd} onGenSubs={onGenSubs} aiLoad={aiLoad}
          readOnly={readOnly} sectionTitle={sectionTitle} t={t} lang={lang}
        />

        {/* Delete (admin or project owner) */}
        {onDelete && canDelete && (
          <div style={{ borderTop: '1px solid var(--bd3)', padding: '14px 0 0', marginTop: 8 }}>
            <button onClick={() => setConfirmDel(true)}
              style={{ fontSize: 12, padding: '6px 14px', borderRadius: 'var(--r1)', border: '1px solid var(--c-danger)', background: 'transparent', color: 'var(--c-danger)', cursor: 'pointer' }}>
              {t.deleteTask}
            </button>
          </div>
        )}

        {confirmDel && (
          <ConfirmModal
            message={t.confirmDeleteTask(task.title)}
            onConfirm={() => { setConfirmDel(false); onDelete(task.id) }}
            onCancel={() => setConfirmDel(false)}
          />
        )}
      </div>
    </div>
  )
}
