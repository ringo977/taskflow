/**
 * FilesTimeTab — "ops/compliance" section of TaskPanel.
 *
 * Owns attachments, time tracking, and approval. These sections all
 * already live in their own stateful child components — this file is
 * a thin composition shell kept alongside DetailTab/ActivityTab for
 * symmetry (and so the F3.5b tab bar has three equal children).
 *
 * Split from TaskPanel during UX simplification (F3.5a).
 */
import TimeTracker from '@/components/TimeTracker'
import ApprovalSection from '@/components/ApprovalSection'
import AttachmentsSection from './AttachmentsSection'

export default function FilesTimeTab({
  task, currentUser, orgId, onUpd,
  readOnly, sectionTitle, t,
}) {
  return (
    <>
      <AttachmentsSection task={task} orgId={orgId} onUpd={onUpd} sectionTitle={sectionTitle} t={t} readOnly={readOnly} />
      <TimeTracker task={task} currentUser={currentUser} onUpd={onUpd} sectionTitle={sectionTitle} />
      <ApprovalSection task={task} currentUser={currentUser} onUpd={onUpd} sectionTitle={sectionTitle} />
    </>
  )
}
