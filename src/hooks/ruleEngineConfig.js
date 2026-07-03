// ── Shared rule-engine configuration ─────────────────────────
// Canonical trigger/action definitions and i18n label maps, shared by
// the rule engine (useRuleEngine) and the rules UI (components/rules).

export const TRIGGERS = [
  { id: 'section_change',       icon: '→',  color: 'var(--c-brand)' },
  { id: 'deadline_approaching', icon: '⏰', color: 'var(--c-warning)' },
  { id: 'subtasks_completed',   icon: '✓',  color: 'var(--c-success)' },
  { id: 'task_assigned',        icon: '👤', color: 'var(--c-purple)' },
  { id: 'priority_changed',     icon: '⚡', color: 'var(--c-danger)' },
  { id: 'comment_added',        icon: '💬', color: 'var(--tx3)' },
  { id: 'task_completed',       icon: '✅', color: 'var(--c-success)' },
  { id: 'tag_added',            icon: '🏷', color: 'var(--c-lime)' },
]

export const ACTIONS = [
  { id: 'move_to_section', icon: '→',  color: 'var(--c-brand)' },
  { id: 'notify',          icon: '🔔', color: 'var(--c-warning)' },
  { id: 'set_priority',    icon: '⚡', color: 'var(--c-danger)' },
  { id: 'complete_task',   icon: '✅', color: 'var(--c-success)' },
  { id: 'assign_to',       icon: '👤', color: 'var(--c-purple)' },
  { id: 'add_tag',         icon: '🏷', color: 'var(--c-lime)' },
  { id: 'set_due_date',    icon: '📅', color: 'var(--c-brand)' },
  { id: 'create_subtask',  icon: '📋', color: 'var(--tx3)' },
  { id: 'webhook',    icon: '🔗', color: 'var(--c-brand)' },
  { id: 'send_email', icon: '📧', color: 'var(--c-warning)' },
]

export const PRI_OPTIONS = ['low', 'medium', 'high']

export const CONDITION_FIELDS = [
  { id: 'priority', icon: '⚡' },
  { id: 'assignee', icon: '👤' },
  { id: 'tag',      icon: '🏷' },
  { id: 'section',  icon: '→' },
]

// ── Label maps (i18n) ────────────────────────────────────────

export const triggerLabelMap = (t) => ({
  section_change:       t.ruleTrigSectionChange ?? 'Task moves to section',
  deadline_approaching: t.ruleTrigDeadline ?? 'Deadline approaching',
  subtasks_completed:   t.ruleTrigSubtasksDone ?? 'All subtasks completed',
  task_assigned:        t.ruleTrigAssigned ?? 'Task is assigned',
  priority_changed:     t.ruleTrigPriorityChanged ?? 'Priority changed',
  comment_added:        t.ruleTrigCommentAdded ?? 'Comment added',
  task_completed:       t.ruleTrigTaskCompleted ?? 'Task completed',
  tag_added:            t.ruleTrigTagAdded ?? 'Tag added',
})

export const actionLabelMap = (t) => ({
  move_to_section: t.ruleActMove ?? 'Move to section',
  notify:          t.ruleActNotify ?? 'Send notification',
  set_priority:    t.ruleActPriority ?? 'Set priority',
  complete_task:   t.ruleActComplete ?? 'Mark as completed',
  assign_to:       t.ruleActAssign ?? 'Assign to',
  add_tag:         t.ruleActAddTag ?? 'Add tag',
  set_due_date:    t.ruleActSetDue ?? 'Set due date',
  create_subtask:  t.ruleActCreateSub ?? 'Create subtask',
  webhook:    t.ruleActWebhook ?? 'Webhook (HTTP POST)',
  send_email: t.ruleActEmail ?? 'Send email',
})

export const conditionFieldLabel = (t) => ({
  priority: t.priority ?? 'Priority',
  assignee: t.assigned ?? 'Assigned',
  tag:      t.tags ?? 'Tag',
  section:  t.section ?? 'Section',
})
