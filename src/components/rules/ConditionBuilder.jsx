import { CONDITION_FIELDS, PRI_OPTIONS, conditionFieldLabel } from '@/hooks/ruleEngineConfig'

// ── Condition builder ("Only if..." filters) ────────────────

export default function ConditionBuilder({ conditions, sections, t, USERS, inputStyle, selectStyle, labelStyle, sectionStyle, onAdd, onUpdate, onRemove }) {
  return (
    <div style={sectionStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>{t.ruleConditions ?? 'Only if...'}</label>
        <button onClick={onAdd}
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
            onChange={e => onUpdate(idx, { field: e.target.value, value: '' })}
            style={{ ...selectStyle, width: 'auto', flex: '0 0 110px' }}>
            {CONDITION_FIELDS.map(cf => (
              <option key={cf.id} value={cf.id}>{cf.icon} {conditionFieldLabel(t)[cf.id]}</option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: 'var(--tx3)' }}>=</span>
          {cond.field === 'priority' ? (
            <select value={cond.value} onChange={e => onUpdate(idx, { value: e.target.value })} style={selectStyle}>
              <option value="">—</option>
              {PRI_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          ) : cond.field === 'assignee' ? (
            <select value={cond.value} onChange={e => onUpdate(idx, { value: e.target.value })} style={selectStyle}>
              <option value="">—</option>
              {USERS.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          ) : cond.field === 'section' ? (
            <select value={cond.value} onChange={e => onUpdate(idx, { value: e.target.value })} style={selectStyle}>
              <option value="">—</option>
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <input value={cond.value} onChange={e => onUpdate(idx, { value: e.target.value })}
              placeholder="value…" style={inputStyle} />
          )}
          <button onClick={() => onRemove(idx)}
            style={{ fontSize: 14, color: 'var(--c-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>×</button>
        </div>
      ))}
    </div>
  )
}
