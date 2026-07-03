import { TRIGGERS, ACTIONS, triggerLabelMap, actionLabelMap, conditionFieldLabel } from '@/hooks/ruleEngineConfig'

// ── Helpers ──────────────────────────────────────────────────

function describeTrigger(trigger, t) {
  const labels = triggerLabelMap(t)
  let label = labels[trigger.type] ?? trigger.type
  if (trigger.type === 'section_change' && trigger.config?.section) label += ` "${trigger.config.section}"`
  if (trigger.type === 'deadline_approaching' && trigger.config?.days) label += ` (${trigger.config.days}d)`
  if (trigger.type === 'priority_changed' && trigger.config?.priority) label += ` → ${trigger.config.priority}`
  if (trigger.type === 'tag_added' && trigger.config?.tag) label += ` "${trigger.config.tag}"`
  return label
}

function describeAction(action, t) {
  const labels = actionLabelMap(t)
  let label = labels[action.type] ?? action.type
  if (action.type === 'move_to_section' && action.config?.section) label += ` "${action.config.section}"`
  if (action.type === 'set_priority' && action.config?.priority) label += ` → ${action.config.priority}`
  if (action.type === 'assign_to' && action.config?.who) label += ` → ${action.config.who}`
  if (action.type === 'add_tag' && action.config?.tag) label += ` "${action.config.tag}"`
  if (action.type === 'set_due_date' && action.config?.offsetDays != null) label += ` +${action.config.offsetDays}d`
  if (action.type === 'create_subtask' && action.config?.subtaskTitle) label += `: "${action.config.subtaskTitle}"`
  if (action.type === 'notify' && action.config?.message) {
    const msg = action.config.message
    label += `: "${msg.length > 28 ? msg.slice(0, 28) + '…' : msg}"`
  }
  if (action.type === 'webhook' && action.config?.url) {
    const url = action.config.url
    label += `: ${url.length > 30 ? url.slice(0, 30) + '…' : url}`
  }
  if (action.type === 'send_email' && action.config?.to) label += ` → ${action.config.to}`
  return label
}

// ── Shared styles ────────────────────────────────────────────

const pillStyle = (color) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  fontSize: 11, fontWeight: 500, color,
  padding: '2px 8px', borderRadius: 10,
  background: `color-mix(in srgb, ${color} 12%, transparent)`,
})

// ── Rule card (read-only view) ──────────────────────────────

export default function RuleCard({ rule, t, onToggle, onEdit }) {
  const trigDef = TRIGGERS.find(tr => tr.id === rule.trigger.type)
  const actions = rule.actions ?? (rule.action ? [rule.action] : [])
  const conditions = rule.conditions ?? []

  return (
    <div
      onClick={onEdit}
      className="row-interactive"
      style={{
        padding: '12px 14px', marginBottom: 8,
        background: rule.enabled ? 'var(--bg2)' : 'transparent',
        borderRadius: 'var(--r2)', border: '1px solid var(--bd3)',
        opacity: rule.enabled ? 1 : 0.45, cursor: 'pointer',
        transition: 'opacity 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Header: toggle + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <button
          onClick={e => { e.stopPropagation(); onToggle() }}
          style={{
            width: 18, height: 18, borderRadius: 4, flexShrink: 0,
            border: `1.5px solid ${rule.enabled ? 'var(--accent)' : 'var(--bd2)'}`,
            background: rule.enabled ? 'var(--accent)' : 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: '#fff', padding: 0, lineHeight: 1,
          }}
        >
          {rule.enabled && '✓'}
        </button>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx1)', flex: 1 }}>{rule.name}</div>
      </div>

      {/* Visual pipeline: trigger → actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={pillStyle(trigDef?.color ?? 'var(--tx3)')}>
          {trigDef?.icon} {describeTrigger(rule.trigger, t)}
        </span>
        <span style={{ fontSize: 13, color: 'var(--tx3)' }}>→</span>
        {actions.map((ac, i) => {
          const acDef = ACTIONS.find(a => a.id === ac.type)
          return (
            <span key={i} style={pillStyle(acDef?.color ?? 'var(--tx3)')}>
              {acDef?.icon} {describeAction(ac, t)}
            </span>
          )
        })}
      </div>

      {/* Conditions */}
      {conditions.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: 'var(--tx3)', fontWeight: 500 }}>IF</span>
          {conditions.map((cond, i) => (
            <span key={i} style={{ fontSize: 10, color: 'var(--tx2)', background: 'var(--bg1)', padding: '1px 6px', borderRadius: 8, border: '1px solid var(--bd3)' }}>
              {conditionFieldLabel(t)[cond.field] ?? cond.field} = {cond.value}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
