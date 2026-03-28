import { useState } from 'react'
import { useLang } from '@/i18n'
import { useInbox } from '@/context/InboxCtx'
import Avatar from '@/components/Avatar'

/**
 * ApprovalSection — request & resolve approvals on a task.
 * Stored in task.approval JSONB:
 *   { status, requestedBy, approver, requestedAt, resolvedAt, comment }
 *
 * Approval statuses: pending, approved, rejected, changes_requested
 */
const STATUS_STYLES = {
  pending:           { label: 'pending',           color: 'var(--c-warning)',  bg: 'color-mix(in srgb, var(--c-warning) 12%, transparent)', icon: '⏳' },
  approved:          { label: 'approved',          color: 'var(--c-success)',  bg: 'color-mix(in srgb, var(--c-success) 12%, transparent)', icon: '✓' },
  rejected:          { label: 'rejected',          color: 'var(--c-danger)',   bg: 'color-mix(in srgb, var(--c-danger) 12%, transparent)',  icon: '✕' },
  changes_requested: { label: 'changes_requested', color: 'var(--c-purple, var(--accent))', bg: 'color-mix(in srgb, var(--accent) 12%, transparent)', icon: '↻' },
}

export default function ApprovalSection({ task, currentUser, onUpd, sectionTitle }) {
  const t = useLang()
  const inbox = useInbox()
  const approval = task.approval ?? null
  const [comment, setComment] = useState('')
  const [showRequest, setShowRequest] = useState(false)

  const requestApproval = () => {
    onUpd(task.id, {
      approval: {
        status: 'pending',
        requestedBy: currentUser?.name ?? 'User',
        approver: null,
        requestedAt: new Date().toISOString(),
        resolvedAt: null,
        comment: comment.trim() || null,
      }
    })
    inbox.push({
      type: 'approval_requested',
      actor: currentUser?.name ?? 'User',
      message: t.msgDidRequestApproval?.(task.title) ?? `requested approval on "${task.title}"`,
      taskId: task.id,
    })
    setComment('')
    setShowRequest(false)
  }

  const resolve = (status) => {
    onUpd(task.id, {
      approval: {
        ...approval,
        status,
        approver: currentUser?.name ?? 'User',
        resolvedAt: new Date().toISOString(),
        comment: comment.trim() || approval?.comment || null,
      }
    })
    const statusLabels = { approved: 'approved', rejected: 'rejected', changes_requested: 'requested changes on' }
    inbox.push({
      type: 'approval_resolved',
      actor: currentUser?.name ?? 'User',
      message: t.msgDidResolveApproval?.(task.title, status) ?? `${statusLabels[status] ?? status} "${task.title}"`,
      taskId: task.id,
    })
    setComment('')
  }

  const clearApproval = () => {
    onUpd(task.id, { approval: null })
  }

  const isPending = approval?.status === 'pending'
  const isResolved = approval && ['approved', 'rejected', 'changes_requested'].includes(approval.status)
  const statusCfg = approval ? STATUS_STYLES[approval.status] ?? STATUS_STYLES.pending : null

  const btnBase = { fontSize: 11, padding: '4px 10px', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer', fontWeight: 500 }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ ...sectionTitle, marginBottom: 8 }}>{t.approvals ?? 'Approval'}</div>

      {/* No approval yet */}
      {!approval && !showRequest && (
        <button onClick={() => setShowRequest(true)}
          style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: '1px solid var(--accent)40', borderRadius: 'var(--r1)', padding: '4px 12px', cursor: 'pointer' }}>
          {t.requestApproval ?? 'Request approval'}
        </button>
      )}

      {/* Request form */}
      {!approval && showRequest && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <textarea value={comment} onChange={e => setComment(e.target.value)}
            placeholder={t.approvalNote ?? 'Add a note (optional)…'}
            rows={2}
            style={{ fontSize: 12, padding: '6px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx1)', resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={requestApproval}
              style={{ ...btnBase, background: 'var(--accent)', color: '#fff' }}>
              {t.submitForApproval ?? 'Submit'}
            </button>
            <button onClick={() => { setShowRequest(false); setComment('') }}
              style={{ ...btnBase, background: 'var(--bg2)', color: 'var(--tx2)', border: '1px solid var(--bd3)' }}>
              {t.cancel ?? 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Active approval */}
      {approval && (
        <div style={{ padding: '10px 12px', background: statusCfg.bg, borderRadius: 'var(--r1)', border: `1px solid ${statusCfg.color}30` }}>
          {/* Status badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14 }}>{statusCfg.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: statusCfg.color, textTransform: 'capitalize' }}>
              {t[`approval_${approval.status}`] ?? approval.status.replace('_', ' ')}
            </span>
          </div>

          {/* Metadata */}
          <div style={{ fontSize: 11, color: 'var(--tx3)', display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{t.requestedBy ?? 'Requested by'}:</span>
              <Avatar name={approval.requestedBy} size={14} showName />
              <span style={{ marginLeft: 'auto' }}>{new Date(approval.requestedAt).toLocaleDateString()}</span>
            </div>
            {approval.approver && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{t.resolvedBy ?? 'Resolved by'}:</span>
                <Avatar name={approval.approver} size={14} showName />
                {approval.resolvedAt && <span style={{ marginLeft: 'auto' }}>{new Date(approval.resolvedAt).toLocaleDateString()}</span>}
              </div>
            )}
          </div>

          {/* Comment */}
          {approval.comment && (
            <div style={{ fontSize: 12, color: 'var(--tx2)', fontStyle: 'italic', marginBottom: 8, lineHeight: 1.5 }}>
              "{approval.comment}"
            </div>
          )}

          {/* Action buttons for pending */}
          {isPending && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input value={comment} onChange={e => setComment(e.target.value)}
                placeholder={t.approvalComment ?? 'Comment (optional)…'}
                style={{ fontSize: 12, padding: '5px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg1)', color: 'var(--tx1)' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => resolve('approved')}
                  style={{ ...btnBase, background: 'var(--c-success)', color: '#fff' }}>
                  {t.approveApproval ?? 'Approve'}
                </button>
                <button onClick={() => resolve('changes_requested')}
                  style={{ ...btnBase, background: 'var(--c-purple, var(--accent))', color: '#fff' }}>
                  {t.requestChanges ?? 'Request changes'}
                </button>
                <button onClick={() => resolve('rejected')}
                  style={{ ...btnBase, background: 'var(--c-danger)', color: '#fff' }}>
                  {t.rejectApproval ?? 'Reject'}
                </button>
              </div>
            </div>
          )}

          {/* Re-submit or clear for resolved */}
          {isResolved && (
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              {approval.status !== 'approved' && (
                <button onClick={() => onUpd(task.id, { approval: { ...approval, status: 'pending', approver: null, resolvedAt: null } })}
                  style={{ ...btnBase, background: 'var(--accent)', color: '#fff' }}>
                  {t.resubmit ?? 'Re-submit'}
                </button>
              )}
              <button onClick={clearApproval}
                style={{ ...btnBase, background: 'var(--bg1)', color: 'var(--tx3)', border: '1px solid var(--bd3)' }}>
                {t.clearApproval ?? 'Clear'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
