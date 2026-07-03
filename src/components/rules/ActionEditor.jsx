import { ACTIONS, PRI_OPTIONS } from '@/hooks/ruleEngineConfig'

// ── Single action editor row ────────────────────────────────

export default function ActionEditor({ action, idx: _idx, sections, t, actLabels, inputStyle, selectStyle, labelStyle, USERS, onUpdate, onRemove }) {
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
