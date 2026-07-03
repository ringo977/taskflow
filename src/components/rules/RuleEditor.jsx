import { useState } from 'react'
import { useOrgUsers } from '@/context/OrgUsersCtx'
import { TRIGGERS, PRI_OPTIONS, triggerLabelMap, actionLabelMap } from '@/hooks/ruleEngineConfig'
import ActionEditor from './ActionEditor'
import ConditionBuilder from './ConditionBuilder'

// ── Rule editor (create/edit form) ──────────────────────────

export default function RuleEditor({ rule, sections, t, onSave, onCancel, onDelete }) {
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
      <ConditionBuilder
        conditions={conditions} sections={sections} t={t} USERS={USERS}
        inputStyle={inputStyle} selectStyle={selectStyle} labelStyle={labelStyle} sectionStyle={sectionStyle}
        onAdd={addCondition} onUpdate={updateCondition} onRemove={removeCondition}
      />

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
