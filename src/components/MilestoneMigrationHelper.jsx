/**
 * MilestoneMigrationHelper — one-time helper panel for converting
 * legacy boolean milestone tasks to structured milestones.
 *
 * Visible ONLY if there are tasks with _legacyMilestone = true.
 * Allows creating milestones inline and re-associating tasks.
 * Hides automatically when no legacy tasks remain (or dismissed).
 *
 * DEBITO CON SCADENZA: this component becomes dead code once
 * _legacy_milestone column is dropped from the tasks table.
 */
import { useState, useMemo } from 'react'
import { useLang } from '@/i18n'

export default function MilestoneMigrationHelper({
  tasks = [], milestones = [],
  onAssign, onCreateMs, onDismiss,
}) {
  const t = useLang()
  const [dismissed, setDismissed] = useState(false)
  const [quickCode, setQuickCode] = useState('')
  const [quickName, setQuickName] = useState('')

  // Tasks that had the old milestone boolean flag
  const legacyTasks = useMemo(
    () => tasks.filter(tk => tk._legacyMilestone && !tk.milestoneId),
    [tasks],
  )

  // Nothing to show
  if (dismissed || legacyTasks.length === 0) return null

  const handleQuickCreate = async () => {
    if (!quickCode.trim() || !quickName.trim()) return
    try {
      const created = await onCreateMs({ code: quickCode.trim(), name: quickName.trim(), status: 'pending' })
      setQuickCode('')
      setQuickName('')
      return created
    } catch { /* handled by hook */ }
  }

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  const inputStyle = {
    fontSize: 12, padding: '4px 8px', boxSizing: 'border-box',
    border: '1px solid var(--bd3)', borderRadius: 'var(--r1)',
    background: 'var(--bg2)', color: 'var(--tx1)',
  }

  return (
    <div style={{
      background: 'color-mix(in srgb, var(--c-warning) 6%, var(--bg1))',
      borderRadius: 'var(--r2)',
      border: '1px solid color-mix(in srgb, var(--c-warning) 30%, var(--bd3))',
      padding: '14px 16px',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-warning)' }}>
          {t.migrationHelperTitle ?? 'Milestone migration'} — {legacyTasks.length} {t.migrationHelperCount ?? 'tasks to convert'}
        </div>
        <button onClick={handleDismiss}
          style={{ fontSize: 11, padding: '2px 8px', background: 'transparent', border: '1px solid var(--bd3)', borderRadius: 'var(--r1)', color: 'var(--tx3)', cursor: 'pointer' }}>
          {t.dismiss ?? 'Dismiss'}
        </button>
      </div>

      <div style={{ fontSize: 11, color: 'var(--tx2)', marginBottom: 10, lineHeight: 1.5 }}>
        {t.migrationHelperDesc ?? 'These tasks had the old milestone flag. Create structured milestones and re-associate them.'}
      </div>

      {/* Quick-create milestone */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input value={quickCode} onChange={e => setQuickCode(e.target.value)}
          placeholder={t.msCode ?? 'Code'} style={{ ...inputStyle, width: 70, flex: 'none' }} />
        <input value={quickName} onChange={e => setQuickName(e.target.value)}
          placeholder={t.msName ?? 'Name'} style={{ ...inputStyle, flex: 1 }} />
        <button onClick={handleQuickCreate}
          style={{ fontSize: 11, padding: '4px 10px', background: 'var(--c-success, #4CAF50)', color: '#fff', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
          + {t.addMilestone ?? 'Add MS'}
        </button>
      </div>

      {/* Legacy task list with assign-to-milestone selector */}
      {legacyTasks.map(tk => (
        <div key={tk.id} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
          borderBottom: '1px solid var(--bd3)', fontSize: 12,
        }}>
          <span style={{ fontSize: 11, color: 'var(--c-warning)' }}>◆</span>
          <span style={{ flex: 1, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tk.title}
          </span>
          <select
            onChange={e => { if (e.target.value) onAssign(tk.id, e.target.value) }}
            defaultValue=""
            style={{ ...inputStyle, width: 'auto', minWidth: 120 }}
          >
            <option value="">{t.selectMilestone ?? 'Assign to MS…'}</option>
            {milestones.filter(m => m.isActive).map(m => (
              <option key={m.id} value={m.id}>{m.code} — {m.name}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}
