import { useState, useMemo } from 'react'
import { useLang } from '@/i18n'

/**
 * GoalsPanel — per-project goals with automatic roll-up from linked tasks.
 * Goals are stored in project.goals JSONB.
 *
 * Goal shape: { id, name, target, unit, subGoals: [{ id, name, target, linkedTaskIds }] }
 * Progress is computed from linked tasks' done status.
 */
export default function GoalsPanel({ project, tasks = [], onUpdProj, sectionTitleStyle }) {
  const t = useLang()
  const goals = project?.goals ?? []
  const [editId, setEditId] = useState(null)
  const [adding, setAdding] = useState(false)

  const pTasks = useMemo(() => tasks.filter(tk => tk.pid === project?.id), [tasks, project?.id])

  const saveGoal = (goal) => {
    const exists = goals.find(g => g.id === goal.id)
    const next = exists ? goals.map(g => g.id === goal.id ? goal : g) : [...goals, goal]
    onUpdProj(project.id, { goals: next })
    setAdding(false)
    setEditId(null)
  }

  const deleteGoal = (id) => {
    onUpdProj(project.id, { goals: goals.filter(g => g.id !== id) })
    setEditId(null)
  }

  // ── Compute progress ────────────────────────────────────

  const computeProgress = (goal) => {
    const subs = goal.subGoals ?? []
    if (subs.length === 0) {
      // Goal without sub-goals: compute from its own linkedTaskIds
      const linked = goal.linkedTaskIds ?? []
      if (linked.length === 0) return { done: 0, total: goal.target || 1, pct: 0 }
      const done = linked.filter(id => pTasks.find(tk => tk.id === id && tk.done)).length
      return { done, total: linked.length, pct: linked.length ? Math.round(done / linked.length * 100) : 0 }
    }
    // Roll up from sub-goals
    let totalDone = 0, totalAll = 0
    for (const sub of subs) {
      const linked = sub.linkedTaskIds ?? []
      const done = linked.filter(id => pTasks.find(tk => tk.id === id && tk.done)).length
      totalDone += done
      totalAll += linked.length || (sub.target || 1)
    }
    return { done: totalDone, total: totalAll, pct: totalAll ? Math.round(totalDone / totalAll * 100) : 0 }
  }

  return (
    <div style={{ background: 'var(--bg1)', borderRadius: 'var(--r2)', border: '1px solid var(--bd3)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={sectionTitleStyle}>{t.goals ?? 'Goals'}</div>
        {!adding && (
          <button onClick={() => { setAdding(true); setEditId(null) }}
            style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: '1px solid var(--accent)40', borderRadius: 'var(--r1)', padding: '2px 7px', cursor: 'pointer' }}>
            +
          </button>
        )}
      </div>

      {goals.map(goal => {
        if (editId === goal.id) {
          return <GoalEditor key={goal.id} goal={goal} pTasks={pTasks} t={t}
            onSave={saveGoal} onCancel={() => setEditId(null)} onDelete={() => deleteGoal(goal.id)} />
        }
        const { done, total, pct } = computeProgress(goal)
        const subs = goal.subGoals ?? []
        return (
          <div key={goal.id} style={{ padding: '8px 10px', background: 'var(--bg2)', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setEditId(goal.id)}>
              <span style={{ fontSize: 14 }}>🎯</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx1)' }}>{goal.name}</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: pct >= 100 ? 'var(--c-success)' : pct > 50 ? 'var(--c-warning)' : 'var(--tx3)' }}>
                {pct}%
              </span>
            </div>
            <div style={{ height: 5, background: 'var(--bg1)', borderRadius: 'var(--r1)', overflow: 'hidden', marginTop: 6 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--c-success)' : project?.color ?? 'var(--accent)', borderRadius: 'var(--r1)', transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 3 }}>{done}/{total} {t.goalTasks ?? 'tasks'}</div>
            {subs.length > 0 && (
              <div style={{ marginTop: 6, paddingLeft: 16 }}>
                {subs.map(sub => {
                  const linked = sub.linkedTaskIds ?? []
                  const subDone = linked.filter(id => pTasks.find(tk => tk.id === id && tk.done)).length
                  const subPct = linked.length ? Math.round(subDone / linked.length * 100) : 0
                  return (
                    <div key={sub.id} style={{ marginBottom: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--tx2)' }}>{sub.name}</span>
                        <span style={{ color: 'var(--tx3)' }}>{subDone}/{linked.length}</span>
                      </div>
                      <div style={{ height: 3, background: 'var(--bg1)', borderRadius: 2, overflow: 'hidden', marginTop: 2 }}>
                        <div style={{ height: '100%', width: `${subPct}%`, background: project?.color ?? 'var(--accent)', borderRadius: 2 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {goals.length === 0 && !adding && (
        <div style={{ fontSize: 12, color: 'var(--tx3)', fontStyle: 'italic' }}>
          {t.noGoals ?? 'No goals yet. Add one to track project milestones.'}
        </div>
      )}

      {adding && <GoalEditor goal={null} pTasks={pTasks} t={t} onSave={saveGoal} onCancel={() => setAdding(false)} />}
    </div>
  )
}

// ── Goal editor ──────────────────────────────────────────────

function GoalEditor({ goal, pTasks, t, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(goal?.name ?? '')
  const [linkedIds, setLinkedIds] = useState(goal?.linkedTaskIds ?? [])
  const [subGoals, setSubGoals] = useState(goal?.subGoals ?? [])

  const inputStyle = { fontSize: 12, padding: '5px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', background: 'var(--bg2)', color: 'var(--tx1)', width: '100%' }
  const labelStyle = { fontSize: 11, color: 'var(--tx3)', marginBottom: 3, display: 'block' }

  const toggleTask = (taskId) => {
    setLinkedIds(prev => prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId])
  }

  const addSubGoal = () => {
    setSubGoals([...subGoals, { id: `sg_${Date.now()}`, name: '', linkedTaskIds: [] }])
  }

  const updateSubGoal = (idx, patch) => {
    setSubGoals(subGoals.map((sg, i) => i === idx ? { ...sg, ...patch } : sg))
  }

  const removeSubGoal = (idx) => {
    setSubGoals(subGoals.filter((_, i) => i !== idx))
  }

  const toggleSubTask = (idx, taskId) => {
    updateSubGoal(idx, {
      linkedTaskIds: subGoals[idx].linkedTaskIds.includes(taskId)
        ? subGoals[idx].linkedTaskIds.filter(id => id !== taskId)
        : [...subGoals[idx].linkedTaskIds, taskId]
    })
  }

  const handleSave = () => {
    if (!name.trim()) return
    onSave({
      id: goal?.id ?? `goal_${Date.now()}`,
      name: name.trim(),
      linkedTaskIds: subGoals.length === 0 ? linkedIds : [],
      subGoals: subGoals.map(sg => ({ ...sg, name: sg.name.trim() })).filter(sg => sg.name),
    })
  }

  const openTasks = pTasks.filter(tk => !tk.done)

  return (
    <div style={{ padding: '10px', background: 'var(--bg2)', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)', marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div>
        <label style={labelStyle}>{t.goalName ?? 'Goal name'}</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder={t.goalNamePlaceholder ?? 'e.g. Complete Phase 1'} style={inputStyle} autoFocus />
      </div>

      {/* Sub-goals */}
      <div>
        <label style={labelStyle}>{t.goalSubGoals ?? 'Key results (sub-goals)'}</label>
        {subGoals.map((sg, idx) => (
          <div key={sg.id} style={{ marginBottom: 6, padding: '6px 8px', background: 'var(--bg1)', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)' }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <input value={sg.name} onChange={e => updateSubGoal(idx, { name: e.target.value })}
                placeholder={t.goalSubName ?? 'Key result name'} style={{ ...inputStyle, flex: 1 }} />
              <button onClick={() => removeSubGoal(idx)} style={{ background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            <div style={{ maxHeight: 80, overflow: 'auto' }}>
              {openTasks.map(tk => (
                <label key={tk.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--tx2)', padding: '2px 0', cursor: 'pointer' }}>
                  <input type="checkbox" checked={sg.linkedTaskIds.includes(tk.id)} onChange={() => toggleSubTask(idx, tk.id)} />
                  {tk.title}
                </label>
              ))}
            </div>
          </div>
        ))}
        <button onClick={addSubGoal} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: '1px solid var(--accent)40', borderRadius: 'var(--r1)', padding: '2px 8px', cursor: 'pointer' }}>
          + {t.goalAddSub ?? 'Add key result'}
        </button>
      </div>

      {/* Direct task links (only if no sub-goals) */}
      {subGoals.length === 0 && (
        <div>
          <label style={labelStyle}>{t.goalLinkedTasks ?? 'Linked tasks'}</label>
          <div style={{ maxHeight: 100, overflow: 'auto', padding: '4px', background: 'var(--bg1)', borderRadius: 'var(--r1)', border: '1px solid var(--bd3)' }}>
            {openTasks.map(tk => (
              <label key={tk.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--tx2)', padding: '2px 0', cursor: 'pointer' }}>
                <input type="checkbox" checked={linkedIds.includes(tk.id)} onChange={() => toggleTask(tk.id)} />
                {tk.title}
              </label>
            ))}
            {openTasks.length === 0 && <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{t.noOpenTasks ?? 'No open tasks'}</div>}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        <button onClick={handleSave} style={{ fontSize: 12, padding: '4px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r1)', cursor: 'pointer' }}>
          {goal ? (t.save ?? 'Save') : (t.add ?? 'Add')}
        </button>
        <button onClick={onCancel} style={{ fontSize: 12, padding: '4px 12px' }}>{t.cancel ?? 'Cancel'}</button>
        {goal && onDelete && (
          <button onClick={onDelete} style={{ fontSize: 12, padding: '4px 12px', color: 'var(--c-danger)', marginLeft: 'auto', background: 'none', border: '1px solid var(--c-danger)40', borderRadius: 'var(--r1)', cursor: 'pointer' }}>
            {t.delete ?? 'Delete'}
          </button>
        )}
      </div>
    </div>
  )
}
