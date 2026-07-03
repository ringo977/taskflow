import { useState } from 'react'
import { useLang } from '@/i18n'
import RuleCard from './rules/RuleCard'
import RuleEditor from './rules/RuleEditor'

// ── Rules panel (container) ──────────────────────────────────
// Composes the rules UI: read-only rule cards (RuleCard) and the
// create/edit form (RuleEditor). Shared trigger/action definitions
// live in @/hooks/ruleEngineConfig.

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
