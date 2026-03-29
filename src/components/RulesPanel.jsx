import { useState } from 'react'
import { useLang } from '@/i18n'
import { useOrgUsers } from '@/context/OrgUsersCtx'

// ── Trigger / Action definitions ─────────────────────────────

const TRIGGERS = [
  { id: 'section_change',       icon: '→',  color: 'var(--c-brand)' },
  { id: 'deadline_approaching', icon: '⏰', color: 'var(--c-warning)' },
  { id: 'subtasks_completed',   icon: '✓',  color: 'var(--c-success)' },
  { id: 'task_assigned',        icon: '👤', color: 'var(--c-purple)' },
  { id: 'priority_changed',     icon: '⚡', color: 'var(--c-danger)' },
  { id: 'comment_added',        icon: '💬', color: 'var(--tx3)' },
  { id: 'task_completed',       icon: '✅', color: 'var(--c-success)' },
  { id: 'tag_added',            icon: '🏷', color: 'var(--c-lime)' },
]

const ACTIONS = [
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

const PRI_OPTIONS = ['low', 'medium', 'high']

const CONDITION_FIELDS = [
  { id: 'priority', icon: '⚡' },
  { id: 'assignee', icon: '👤' },
  { id: 'tag',      icon: '🏷' },
  { id: 'section',  icon: '→' },
]

// ── Helpers ──────────────────────────────────────────────────

const triggerLabelMap = (t) => ({
  section_change:       t.ruleTrigSectionChange ?? 'Task moves to section',
  deadline_approaching: t.ruleTrigDeadline ?? 'Deadline approaching',
  subtasks_completed:   t.ruleTrigSubtasksDone ?? 'All subtasks completed',
  task_assigned:        t.ruleTrigAssigned ?? 'Task is assigned',
  priority_changed:     t.ruleTrigPriorityChanged ?? 'Priority changed',
  comment_added:        t.ruleTrigCommentAdded ?? 'Comment added',
  task_completed:       t.ruleTrigTaskCompleted ?? 'Task completed',
  tag_added:            t.ruleTrigTagAdded ?? 'Tag added',
})

const actionLabelMap = (t) => ({
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

const conditionFieldLabel = (t) => ({
  priority: t.priority ?? 'Priority',
  assignee: t.assigned ?? 'Assigned',
  tag:      t.tags ?? 'Tag',
  section:  t.section ?? 'Section',
})

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

// ── Main component ───────────────────────────────────────────

export default function RulesPanel({ project, sections = [], onUpdProj, sectionTitleStyle }) {
  const t = useLang()
  const rules = project?.rules ?? []
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)

  const saveRule = (rule) => {
    const exists = rules.find(r => r.id === rule.id)
    const next = exists
      ? rules.map(r => r.id === rule.id ? rule : r)
      : [...rules, rule]
    onUpdProj(project.id, { rules: next })
    setAdding(false)
    setEditId(null)
  }

  const deleteRule = (id) => {
    onUpdProj(project.id, { rules: rules.filter(r => r.id !== id) })
    setEditId(null)
  }

  const toggleRule = (id) => {
    onUpdProj(project.id, {
      rules: rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r),
    })
  }

  return (
    <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={sectionTitleStyle}>{t.rules ?? 'Rules'}</div>
        {!adding && (
          <button onClick={() => { setAdding(true); setEditId(null) }}
            style={{ fontSize: 11, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 'var(--r1)', padding: '4px 10px', cursor: 'pointer', fontWeight: 500 }}>
            + {t.add ?? 'Add'}
          </button>
        )}
      </div>

      {/* Rule cards */}
      {rules.map(rule => (
        editId === rule.id ? (
          <RuleEditor
            key={rule.id} rule={rule} sections={sections} t={t}
            onSave={saveRule} onCancel={() => setEditId(null)} onDelete={() => deleteRule(rule.id)}
          />
        ) : (
          <RuleCard key={rule.id} rule={rule} t={t}
            onToggle={() => toggleRule(rule.id)}
            onEdit={() => setEditId(rule.id)}
          />
        )
      ))}

      {rules.length === 0 && !adding && (
        <div style={{ fontSize: 12, color: 'var(--tx3)', fontStyle: 'italic', padding: '8px 0' }}>
          {t.noRules ?? 'No rules yet. Add one to automate your workflow.'}
        </div>
      )}

      {adding && (
        <RuleEditor rule={null} sections={sections} t={t}
          onSave={saveRule} onCancel={() => setAdding(false)}
        />
      )}
    </div>
  )
}

// ── Rule card (read-only view) ──────────────────────────────

function RuleCard({ rule, t, onToggle, onEdit }) {
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

// ── Rule editor (create/edit form) ──────────────────────────

function RuleEditor({ rule, sections, t, onSave, onCancel, onDelete }) {
  const USERS = useOrgUsers()
  const [name, setName] = useState(rule?.name ?? '')
  const [trigType, setTrigType] = useState(rule?.trigger?.type ?? 'section_change')
  const [trigConfig, setTrigConfig] = useState(rule?.trigger?.config ?? {})
  const [actions, setActions] = useState(
    rule?.actions ?? (rule?.action ? [rule.action] : [{ type: 'notify', config: {} }])
  )
  const [conditions, setConditions] = useState(rule?.conditions ?? [])

  const handleSave = () => {
    if (!name.trim()) return
    onSave({
      id: rule?.id ?? `rule_${Date.now()}`,
      name: name.trim(),
      enabled: rule?.enabled ?? true,
      trigger: { type: trigType, config: trigConfig },
      actions,
      conditions: conditions.filter(c => c.value),
    })
  }

  const updateAction = (idx, patch) => {
    setActions(prev => prev.map((a, i) => i === idx ? { ...a, ...patch } : a))
  }

  const removeAction = (idx) => {
    setActions(prev => prev.filter((_, i) => i !== idx))
  }

  const addAction = () => {
    setActions(prev => [...prev, { type: 'notify', config: {} }])
  }

  const updateCondition = (idx, patch) => {
    setConditions(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c))
  }

  const removeCondition = (idx) => {
    setConditions(prev => prev.filter((_, i) => i !== idx))
  }

  const addCondition = () => {
    setConditions(prev => [...prev, { field: 'priority', value: '' }])
  }

  const inputStyle = { fontSize: 12, padding: '6px 9px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg1)', color: 'var(--tx1)', width: '100%' }
  const selectStyle = { ...inputStyle, cursor: 'pointer' }
  const labelStyle = { fontSize: 11, color: 'var(--tx3)', marginBottom: 3, display: 'block', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }
  const sectionStyle = { padding: '10px 12px', background: 'var(--bg1)', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)' }

  const trigLabels = triggerLabelMap(t)
  const actLabels = actionLabelMap(t)

  return (
    <div style={{ padding: '14px', background: 'var(--bg2)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Name */}
      <div>
        <label style={labelStyle}>{t.ruleName ?? 'Rule name'}</label>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder={t.ruleNamePlaceholder ?? 'e.g. Auto-close completed tasks'}
          style={{ ...inputStyle, fontWeight: 500, fontSize: 13 }} autoFocus />
      </div>

      {/* Trigger */}
      <div style={sectionStyle}>
        <label style={labelStyle}>{t.ruleWhen ?? 'When...'}</label>
        <select value={trigType} onChange={e => { setTrigType(e.target.value); setTrigConfig({}) }} style={selectStyle}>
          {TRIGGERS.map(tr => (
            <option key={tr.id} value={tr.id}>{tr.icon} {trigLabels[tr.id]}</option>
          ))}
        </select>

        {/* Trigger-specific config */}
        {trigType === 'section_change' && (
          <div style={{ marginTop: 6 }}>
            <label style={labelStyle}>{t.ruleSection ?? 'Target section'}</label>
            <select value={trigConfig.section ?? ''} onChange={e => setTrigConfig({ section: e.target.value })} style={selectStyle}>
              <option value="">{t.ruleAnySection ?? 'Any section'}</option>
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
        {trigType === 'deadline_approaching' && (
          <div style={{ marginTop: 6 }}>
            <label style={labelStyle}>{t.ruleDays ?? 'Days before deadline'}</label>
            <input type="number" min={0} max={30} value={trigConfig.days ?? 1}
              onChange={e => setTrigConfig({ days: parseInt(e.target.value) || 1 })} style={inputStyle} />
          </div>
        )}
        {trigType === 'priority_changed' && (
          <div style={{ marginTop: 6 }}>
            <label style={labelStyle}>{t.ruleTargetPriority ?? 'To value'}</label>
            <select value={trigConfig.priority ?? ''} onChange={e => setTrigConfig({ priority: e.target.value })} style={selectStyle}>
              <option value="">{t.ruleAnySection ?? 'Any'}</option>
              {PRI_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}
        {trigType === 'tag_added' && (
          <div style={{ marginTop: 6 }}>
            <label style={labelStyle}>{t.tags ?? 'Tag'}</label>
            <input value={trigConfig.tag ?? ''} onChange={e => setTrigConfig({ tag: e.target.value })}
              placeholder={t.ruleAnyTag ?? 'Any tag (leave empty)'} style={inputStyle} />
          </div>
        )}
      </div>

      {/* Actions (multi-action) */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>{t.ruleThen ?? 'Then...'}</label>
          <button onClick={addAction}
            style={{ fontSize: 10, color: 'var(--accent)', background: 'none', border: '1px solid var(--accent)40', borderRadius: 'var(--r1)', padding: '1px 6px', cursor: 'pointer' }}>
            + {t.ruleAddAction ?? 'Action'}
          </button>
        </div>

        {actions.map((action, idx) => (
          <ActionEditor key={idx} action={action} idx={idx} sections={sections} t={t}
            actLabels={actLabels} inputStyle={inputStyle} selectStyle={selectStyle} labelStyle={labelStyle}
            USERS={USERS}
            onUpdate={(patch) => updateAction(idx, patch)}
            onRemove={actions.length > 1 ? () => removeAction(idx) : null}
          />
        ))}
      </div>

      {/* Conditions */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>{t.ruleConditions ?? 'Only if...'}</label>
          <button onClick={addCondition}
            style={{ fontSize: 10, color: 'var(--accent)', background: 'none', border: '1px solid var(--accent)40', borderRadius: 'var(--r1)', padding: '1px 6px', cursor: 'pointer' }}>
            + {t.ruleAddCondition ?? 'Filter'}
          </button>
        </div>

        {conditions.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--tx3)', fontStyle: 'italic' }}>
            {t.ruleNoConditions ?? 'No conditions — rule applies to all tasks.'}
          </div>
        )}

        {conditions.map((cond, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
            <select value={cond.field}
              onChange={e => updateCondition(idx, { field: e.target.value, value: '' })}
              style={{ ...selectStyle, width: 'auto', flex: '0 0 110px' }}>
              {CONDITION_FIELDS.map(cf => (
                <option key={cf.id} value={cf.id}>{cf.icon} {conditionFieldLabel(t)[cf.id]}</option>
              ))}
            </select>
            <span style={{ fontSize: 11, color: 'var(--tx3)' }}>=</span>
            {cond.field === 'priority' ? (
              <select value={cond.value} onChange={e => updateCondition(idx, { value: e.target.value })} style={selectStyle}>
                <option value="">—</option>
                {PRI_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            ) : cond.field === 'assignee' ? (
              <select value={cond.value} onChange={e => updateCondition(idx, { value: e.target.value })} style={selectStyle}>
                <option value="">—</option>
                {USERS.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            ) : cond.field === 'section' ? (
              <select value={cond.value} onChange={e => updateCondition(idx, { value: e.target.value })} style={selectStyle}>
                <option value="">—</option>
                {sections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input value={cond.value} onChange={e => updateCondition(idx, { value: e.target.value })}
                placeholder="value…" style={inputStyle} />
            )}
            <button onClick={() => removeCondition(idx)}
              style={{ fontSize: 14, color: 'var(--c-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>×</button>
          </div>
        ))}
      </div>

      {/* Save / Cancel / Delete */}
      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        <button onClick={handleSave}
          style={{ fontSize: 12, padding: '5px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer', fontWeight: 500 }}>
          {rule ? (t.save ?? 'Save') : (t.add ?? 'Add')}
        </button>
        <button onClick={onCancel}
          style={{ fontSize: 12, padding: '5px 14px', background: 'var(--bg1)', color: 'var(--tx2)', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', cursor: 'pointer' }}>
          {t.cancel ?? 'Cancel'}
        </button>
        {rule && onDelete && (
          <button onClick={onDelete}
            style={{ fontSize: 12, padding: '5px 14px', color: 'var(--c-danger)', marginLeft: 'auto', background: 'none', border: '1px solid var(--c-danger)40', borderRadius: 'var(--r1)', cursor: 'pointer' }}>
            {t.delete ?? 'Delete'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Single action editor row ────────────────────────────────

function ActionEditor({ action, idx: _idx, sections, t, actLabels, inputStyle, selectStyle, labelStyle, USERS, onUpdate, onRemove }) {
  return (
    <div style={{ padding: '8px', background: 'var(--bg2)', borderRadius: 'var(--r1)', marginBottom: 4, border: '1px solid var(--bd3)' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <select value={action.type}
          onChange={e => onUpdate({ type: e.target.value, config: {} })}
          style={{ ...selectStyle, flex: 1 }}>
          {ACTIONS.map(ac => (
            <option key={ac.id} value={ac.id}>{ac.icon} {actLabels[ac.id]}</option>
          ))}
        </select>
        {onRemove && (
          <button onClick={onRemove}
            style={{ fontSize: 14, color: 'var(--c-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>×</button>
        )}
      </div>

      {/* Action-specific config */}
      {action.type === 'move_to_section' && (
        <div style={{ marginTop: 6 }}>
          <label style={labelStyle}>{t.ruleTargetSection ?? 'Move to'}</label>
          <select value={action.config?.section ?? ''}
            onChange={e => onUpdate({ config: { section: e.target.value } })} style={selectStyle}>
            <option value="" disabled>{t.ruleSelectSection ?? 'Select section...'}</option>
            {sections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}
      {action.type === 'set_priority' && (
        <div style={{ marginTop: 6 }}>
          <label style={labelStyle}>{t.ruleTargetPriority ?? 'Set to'}</label>
          <select value={action.config?.priority ?? 'high'}
            onChange={e => onUpdate({ config: { priority: e.target.value } })} style={selectStyle}>
            {PRI_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      )}
      {action.type === 'notify' && (
        <div style={{ marginTop: 6 }}>
          <label style={labelStyle}>{t.ruleMessage ?? 'Message'}</label>
          <input value={action.config?.message ?? ''}
            onChange={e => onUpdate({ config: { message: e.target.value } })}
            placeholder={t.ruleMessagePlaceholder ?? 'Notification text...'} style={inputStyle} />
        </div>
      )}
      {action.type === 'assign_to' && (
        <div style={{ marginTop: 6 }}>
          <label style={labelStyle}>{t.ruleAssignTo ?? 'Assign to'}</label>
          <select value={action.config?.who ?? ''}
            onChange={e => onUpdate({ config: { who: e.target.value } })} style={selectStyle}>
            <option value="" disabled>{t.ruleSelectSection ?? 'Select...'}</option>
            {USERS.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
          </select>
        </div>
      )}
      {action.type === 'add_tag' && (
        <div style={{ marginTop: 6 }}>
          <label style={labelStyle}>{t.tags ?? 'Tag'}</label>
          <input value={action.config?.tag ?? ''}
            onChange={e => onUpdate({ config: { tag: e.target.value } })}
            placeholder={t.ruleTagPlaceholder ?? 'Tag name…'} style={inputStyle} />
        </div>
      )}
      {action.type === 'set_due_date' && (
        <div style={{ marginTop: 6 }}>
          <label style={labelStyle}>{t.ruleOffsetDays ?? 'Days from now'}</label>
          <input type="number" min={0} max={365} value={action.config?.offsetDays ?? 7}
            onChange={e => onUpdate({ config: { offsetDays: parseInt(e.target.value) || 0 } })} style={inputStyle} />
        </div>
      )}
      {action.type === 'create_subtask' && (
        <div style={{ marginTop: 6 }}>
          <label style={labelStyle}>{t.ruleSubtaskTitle ?? 'Subtask title'}</label>
          <input value={action.config?.subtaskTitle ?? ''}
            onChange={e => onUpdate({ config: { subtaskTitle: e.target.value } })}
            placeholder={t.ruleSubtaskPlaceholder ?? 'Review task…'} style={inputStyle} />
        </div>
      )}
      {action.type === 'webhook' && (
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div>
            <label style={labelStyle}>{t.ruleWebhookUrl ?? 'Webhook URL'}</label>
            <input value={action.config?.url ?? ''}
              onChange={e => onUpdate({ config: { ...action.config, url: e.target.value } })}
              placeholder="https://hooks.example.com/..." style={inputStyle} />
            {action.config?.url && /^https?:\/\/(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(action.config.url) && (
              <div style={{ fontSize: 10, color: 'var(--c-warning)', marginTop: 2 }}>
                ⚠ {t.ruleWebhookLocalWarning ?? 'Warning: URL points to a local/private address'}
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>{t.ruleWebhookSecret ?? 'Secret header (optional)'}</label>
            <input value={action.config?.headers?.['X-Webhook-Secret'] ?? ''}
              onChange={e => onUpdate({ config: { ...action.config, headers: { ...(action.config?.headers ?? {}), 'X-Webhook-Secret': e.target.value } } })}
              placeholder="Bearer token or secret…" style={inputStyle} />
          </div>
        </div>
      )}
      {action.type === 'send_email' && (
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div>
            <label style={labelStyle}>{t.ruleEmailTo ?? 'Recipient email'}</label>
            <input type="email" value={action.config?.to ?? ''}
              onChange={e => onUpdate({ config: { ...action.config, to: e.target.value } })}
              placeholder="team@example.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t.ruleEmailSubject ?? 'Subject'}</label>
            <input value={action.config?.subject ?? ''}
              onChange={e => onUpdate({ config: { ...action.config, subject: e.target.value } })}
              placeholder={'TaskFlow: {task}'} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t.ruleEmailBody ?? 'Body'}</label>
            <input value={action.config?.body ?? ''}
              onChange={e => onUpdate({ config: { ...action.config, body: e.target.value } })}
              placeholder={'{task} assigned to {who}, due {due}'} style={inputStyle} />
          </div>
        </div>
      )}
    </div>
  )
}
