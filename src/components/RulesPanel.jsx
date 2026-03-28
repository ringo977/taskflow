import { useState } from 'react'
import { useLang } from '@/i18n'

// ── Trigger / Action definitions ─────────────────────────────

const TRIGGERS = [
  { id: 'section_change', icon: '→' },
  { id: 'deadline_approaching', icon: '⏰' },
  { id: 'subtasks_completed', icon: '✓' },
  { id: 'task_assigned', icon: '👤' },
]

const ACTIONS = [
  { id: 'move_to_section', icon: '→' },
  { id: 'notify', icon: '🔔' },
  { id: 'set_priority', icon: '⚡' },
  { id: 'complete_task', icon: '✅' },
]

const PRI_OPTIONS = ['low', 'medium', 'high']

// ── Main component ───────────────────────────────────────────

export default function RulesPanel({ project, sections = [], onUpdProj, sectionTitleStyle }) {
  const t = useLang()
  const rules = project?.rules ?? []
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)

  // ── Rule CRUD helpers ──────────────────────────────────────

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

  // ── Labels ─────────────────────────────────────────────────

  const triggerLabel = (tr) => {
    const labels = {
      section_change: t.ruleTrigSectionChange ?? 'Task moves to section',
      deadline_approaching: t.ruleTrigDeadline ?? 'Deadline approaching',
      subtasks_completed: t.ruleTrigSubtasksDone ?? 'All subtasks completed',
      task_assigned: t.ruleTrigAssigned ?? 'Task is assigned',
    }
    let label = labels[tr.type] ?? tr.type
    if (tr.type === 'section_change' && tr.config?.section) label += ` "${tr.config.section}"`
    if (tr.type === 'deadline_approaching' && tr.config?.days) label += ` (${tr.config.days}d)`
    return label
  }

  const actionLabel = (ac) => {
    const labels = {
      move_to_section: t.ruleActMove ?? 'Move to section',
      notify: t.ruleActNotify ?? 'Send notification',
      set_priority: t.ruleActPriority ?? 'Set priority',
      complete_task: t.ruleActComplete ?? 'Mark as completed',
    }
    let label = labels[ac.type] ?? ac.type
    if (ac.type === 'move_to_section' && ac.config?.section) label += ` "${ac.config.section}"`
    if (ac.type === 'set_priority' && ac.config?.priority) label += ` → ${ac.config.priority}`
    if (ac.type === 'notify' && ac.config?.message) label += `: "${ac.config.message}"`
    return label
  }

  return (
    <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={sectionTitleStyle}>{t.rules ?? 'Rules'}</div>
        {!adding && (
          <button onClick={() => { setAdding(true); setEditId(null) }}
            style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: '1px solid var(--accent)40', borderRadius: 'var(--r1)', padding: '2px 7px', cursor: 'pointer' }}>
            +
          </button>
        )}
      </div>

      {/* Existing rules */}
      {rules.map(rule => (
        editId === rule.id ? (
          <RuleEditor
            key={rule.id}
            rule={rule}
            sections={sections}
            t={t}
            onSave={saveRule}
            onCancel={() => setEditId(null)}
            onDelete={() => deleteRule(rule.id)}
          />
        ) : (
          <div key={rule.id} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            background: rule.enabled ? 'var(--bg2)' : 'transparent',
            borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', marginBottom: 6,
            opacity: rule.enabled ? 1 : 0.5,
          }}>
            <button onClick={() => toggleRule(rule.id)}
              style={{ width: 16, height: 16, borderRadius: 3, border: '1.5px solid var(--bd2)', background: rule.enabled ? 'var(--accent)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', padding: 0, lineHeight: 1 }}>
              {rule.enabled && '✓'}
            </button>
            <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setEditId(rule.id)}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx1)', marginBottom: 2 }}>{rule.name}</div>
              <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
                {triggerLabel(rule.trigger)} → {actionLabel(rule.action)}
              </div>
            </div>
          </div>
        )
      ))}

      {rules.length === 0 && !adding && (
        <div style={{ fontSize: 12, color: 'var(--tx3)', fontStyle: 'italic' }}>
          {t.noRules ?? 'No rules yet. Add one to automate your workflow.'}
        </div>
      )}

      {/* Add form */}
      {adding && (
        <RuleEditor
          rule={null}
          sections={sections}
          t={t}
          onSave={saveRule}
          onCancel={() => setAdding(false)}
        />
      )}
    </div>
  )
}

// ── Rule editor ──────────────────────────────────────────────

function RuleEditor({ rule, sections, t, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(rule?.name ?? '')
  const [trigType, setTrigType] = useState(rule?.trigger?.type ?? 'section_change')
  const [trigConfig, setTrigConfig] = useState(rule?.trigger?.config ?? {})
  const [actType, setActType] = useState(rule?.action?.type ?? 'notify')
  const [actConfig, setActConfig] = useState(rule?.action?.config ?? {})

  const handleSave = () => {
    if (!name.trim()) return
    onSave({
      id: rule?.id ?? `rule_${Date.now()}`,
      name: name.trim(),
      enabled: rule?.enabled ?? true,
      trigger: { type: trigType, config: trigConfig },
      action: { type: actType, config: actConfig },
    })
  }

  const inputStyle = { fontSize: 12, padding: '5px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx1)', width: '100%' }
  const selectStyle = { ...inputStyle, cursor: 'pointer' }
  const labelStyle = { fontSize: 11, color: 'var(--tx3)', marginBottom: 3, display: 'block' }

  return (
    <div style={{ padding: '10px', background: 'var(--bg2)', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Name */}
      <div>
        <label style={labelStyle}>{t.ruleName ?? 'Rule name'}</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder={t.ruleNamePlaceholder ?? 'e.g. Auto-close completed tasks'} style={inputStyle} autoFocus />
      </div>

      {/* Trigger */}
      <div>
        <label style={labelStyle}>{t.ruleWhen ?? 'When...'}</label>
        <select value={trigType} onChange={e => { setTrigType(e.target.value); setTrigConfig({}) }} style={selectStyle}>
          {TRIGGERS.map(tr => (
            <option key={tr.id} value={tr.id}>
              {tr.icon} {({
                section_change: t.ruleTrigSectionChange ?? 'Task moves to section',
                deadline_approaching: t.ruleTrigDeadline ?? 'Deadline approaching',
                subtasks_completed: t.ruleTrigSubtasksDone ?? 'All subtasks completed',
                task_assigned: t.ruleTrigAssigned ?? 'Task is assigned',
              })[tr.id]}
            </option>
          ))}
        </select>
      </div>

      {/* Trigger config */}
      {trigType === 'section_change' && (
        <div>
          <label style={labelStyle}>{t.ruleSection ?? 'Target section'}</label>
          <select value={trigConfig.section ?? ''} onChange={e => setTrigConfig({ section: e.target.value })} style={selectStyle}>
            <option value="">{t.ruleAnySection ?? 'Any section'}</option>
            {sections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}
      {trigType === 'deadline_approaching' && (
        <div>
          <label style={labelStyle}>{t.ruleDays ?? 'Days before deadline'}</label>
          <input type="number" min={0} max={30} value={trigConfig.days ?? 1} onChange={e => setTrigConfig({ days: parseInt(e.target.value) || 1 })} style={inputStyle} />
        </div>
      )}

      {/* Action */}
      <div>
        <label style={labelStyle}>{t.ruleThen ?? 'Then...'}</label>
        <select value={actType} onChange={e => { setActType(e.target.value); setActConfig({}) }} style={selectStyle}>
          {ACTIONS.map(ac => (
            <option key={ac.id} value={ac.id}>
              {ac.icon} {({
                move_to_section: t.ruleActMove ?? 'Move to section',
                notify: t.ruleActNotify ?? 'Send notification',
                set_priority: t.ruleActPriority ?? 'Set priority',
                complete_task: t.ruleActComplete ?? 'Mark as completed',
              })[ac.id]}
            </option>
          ))}
        </select>
      </div>

      {/* Action config */}
      {actType === 'move_to_section' && (
        <div>
          <label style={labelStyle}>{t.ruleTargetSection ?? 'Move to'}</label>
          <select value={actConfig.section ?? ''} onChange={e => setActConfig({ section: e.target.value })} style={selectStyle}>
            <option value="" disabled>{t.ruleSelectSection ?? 'Select section...'}</option>
            {sections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}
      {actType === 'set_priority' && (
        <div>
          <label style={labelStyle}>{t.ruleTargetPriority ?? 'Set to'}</label>
          <select value={actConfig.priority ?? 'high'} onChange={e => setActConfig({ priority: e.target.value })} style={selectStyle}>
            {PRI_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      )}
      {actType === 'notify' && (
        <div>
          <label style={labelStyle}>{t.ruleMessage ?? 'Message'}</label>
          <input value={actConfig.message ?? ''} onChange={e => setActConfig({ message: e.target.value })} placeholder={t.ruleMessagePlaceholder ?? 'Notification text...'} style={inputStyle} />
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        <button onClick={handleSave} style={{ fontSize: 12, padding: '4px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer' }}>
          {rule ? (t.save ?? 'Save') : (t.add ?? 'Add')}
        </button>
        <button onClick={onCancel} style={{ fontSize: 12, padding: '4px 12px' }}>{t.cancel ?? 'Cancel'}</button>
        {rule && onDelete && (
          <button onClick={onDelete} style={{ fontSize: 12, padding: '4px 12px', color: 'var(--c-danger)', marginLeft: 'auto', background: 'none', border: '1px solid var(--c-danger)40', borderRadius: 'var(--r1)', cursor: 'pointer' }}>
            {t.delete ?? 'Delete'}
          </button>
        )}
      </div>
    </div>
  )
}
