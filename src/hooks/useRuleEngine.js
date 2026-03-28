import { useCallback, useRef, useEffect } from 'react'

/**
 * useRuleEngine
 *
 * Evaluates project rules after task mutations and executes matching actions.
 * Rules are stored per-project in `project.rules` JSONB.
 *
 * Supports 4 triggers:
 *   - section_change:       task.sec changed (optionally to a specific section)
 *   - deadline_approaching: task.due is within N days from now
 *   - subtasks_completed:   all subtasks of a task are done
 *   - task_assigned:        task.who changed (non-empty)
 *
 * Supports 4 actions:
 *   - move_to_section:  change task.sec
 *   - notify:           push toast + inbox notification
 *   - set_priority:     change task.pri
 *   - complete_task:    set task.done = true
 *
 * @param {Object} params
 * @param {Array} params.projects - current projects array (each may have .rules)
 * @param {Array} params.tasks - current tasks array
 * @param {Function} params.updTask - task update function (id, patch)
 * @param {Function} params.toast - toast notification function
 * @param {Object} params.inbox - inbox context with .push method
 * @param {Object} params.tr - translation object
 * @param {Function} params.moveTask - task move function (id, section)
 */
export function useRuleEngine({ projects, tasks, updTask, toast, inbox, _tr, moveTask }) {
  // Track which rules have already fired for deadline checks (avoid repeated notifications)
  const firedDeadlineRef = useRef(new Set())

  // ── Execute a single action ──────────────────────────────

  const executeAction = useCallback((action, task) => {
    if (!action || !task) return

    switch (action.type) {
      case 'move_to_section':
        if (action.config?.section && task.sec !== action.config.section) {
          moveTask(task.id, action.config.section)
        }
        break

      case 'notify': {
        const msg = action.config?.message
          ? action.config.message.replace('{task}', task.title).replace('{who}', task.who ?? '')
          : `Rule: ${task.title}`
        toast(msg, 'info')
        inbox?.push?.({
          type: 'rule_triggered',
          actor: 'System',
          message: msg,
          taskId: task.id,
        })
        break
      }

      case 'set_priority':
        if (action.config?.priority && task.pri !== action.config.priority) {
          updTask(task.id, { pri: action.config.priority })
        }
        break

      case 'complete_task':
        if (!task.done) {
          updTask(task.id, { done: true })
        }
        break

      default:
        break
    }
  }, [updTask, moveTask, toast, inbox])

  // ── Get enabled rules for a project ────────────────────

  const getProjectRules = useCallback((pid) => {
    const proj = projects.find(p => p.id === pid)
    return (proj?.rules ?? []).filter(r => r.enabled)
  }, [projects])

  // ── Evaluate rules after task field change ──────────────

  const evaluateTaskChange = useCallback((taskId, patch, prevTask) => {
    if (!prevTask) return
    const rules = getProjectRules(prevTask.pid)
    if (!rules.length) return

    const currentTask = { ...prevTask, ...patch }

    for (const rule of rules) {
      const { trigger, action } = rule
      let shouldFire = false

      switch (trigger.type) {
        case 'section_change':
          if ('sec' in patch && patch.sec !== prevTask.sec) {
            if (!trigger.config?.section || trigger.config.section === patch.sec) {
              shouldFire = true
            }
          }
          break

        case 'task_assigned':
          if ('who' in patch && patch.who && patch.who !== prevTask.who) {
            shouldFire = true
          }
          break

        case 'subtasks_completed':
          if ('subs' in patch) {
            const subs = patch.subs ?? []
            if (subs.length > 0 && subs.every(s => s.done)) {
              shouldFire = true
            }
          }
          break

        // deadline_approaching is handled by the periodic check, not by field changes
        default:
          break
      }

      if (shouldFire) {
        // Use setTimeout to avoid triggering during the current update cycle
        setTimeout(() => executeAction(action, currentTask), 0)
      }
    }
  }, [getProjectRules, executeAction])

  // ── Periodic deadline check (runs every 60s) ────────────

  useEffect(() => {
    const checkDeadlines = () => {
      const now = new Date()

      for (const task of tasks) {
        if (task.done || !task.due) continue

        // ── Global due-date-approaching notification (1 day) ──
        const dueDate = new Date(task.due + 'T23:59:59')
        const diffMs = dueDate - now
        const diffDays = diffMs / (1000 * 60 * 60 * 24)
        if (diffDays >= 0 && diffDays <= 1) {
          const globalKey = `due_soon:${task.id}`
          if (!firedDeadlineRef.current.has(globalKey)) {
            firedDeadlineRef.current.add(globalKey)
            inbox?.push?.({
              type: 'due_approaching',
              actor: 'System',
              message: _tr?.msgDueApproaching?.(task.title) ?? `"${task.title}" is due soon`,
              taskId: task.id,
            })
          }
        }

        // ── Project-level deadline rules ──
        const rules = getProjectRules(task.pid)

        for (const rule of rules) {
          if (rule.trigger.type !== 'deadline_approaching') continue

          const days = rule.trigger.config?.days ?? 1

          if (diffDays >= 0 && diffDays <= days) {
            const key = `${rule.id}:${task.id}`
            if (!firedDeadlineRef.current.has(key)) {
              firedDeadlineRef.current.add(key)
              executeAction(rule.action, task)
            }
          }
        }
      }
    }

    // Run once on mount / when tasks change
    checkDeadlines()

    // Periodic check
    const interval = setInterval(checkDeadlines, 60_000)
    return () => clearInterval(interval)
  }, [tasks, getProjectRules, executeAction, inbox, _tr])

  // ── Reset deadline tracking when rules change ──────────

  useEffect(() => {
    firedDeadlineRef.current = new Set()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.map(p => JSON.stringify(p.rules ?? [])).join()])

  return { evaluateTaskChange }
}
