import { useCallback, useRef, useEffect, useMemo } from 'react'
import { logger } from '@/utils/logger'

const log = logger('RuleEngine')

/**
 * useRuleEngine
 *
 * Evaluates project rules after task mutations and executes matching actions.
 * Rules are stored per-project in `project.rules` JSONB.
 *
 * Triggers (8):
 *   - section_change:       task.sec changed (optionally to a specific section)
 *   - deadline_approaching: task.due is within N days from now
 *   - subtasks_completed:   all subtasks of a task are done
 *   - task_assigned:        task.who changed (non-empty)
 *   - priority_changed:     task.pri changed (optionally to a specific value)
 *   - comment_added:        a comment was added to the task
 *   - task_completed:       task.done changed to true
 *   - tag_added:            a tag was added to the task (optionally a specific tag)
 *
 * Actions (10):
 *   - move_to_section:  change task.sec
 *   - notify:           push toast + inbox notification
 *   - set_priority:     change task.pri
 *   - complete_task:    set task.done = true
 *   - assign_to:        set task.who
 *   - add_tag:          add a tag to task.tags
 *   - set_due_date:     set task.due relative to now (+N days)
 *   - create_subtask:   add a subtask to task.subs
 *   - webhook:         fire-and-forget POST to external URL
 *   - send_email:      send email via Supabase Edge Function proxy
 *
 * Multi-action:  rule.actions[] array (fallback: single rule.action)
 * Conditions:    rule.conditions[] — optional filters (priority, assignee, tag)
 */
// ── Loop guard constants (exported for testing) ───────────
export const MAX_RULE_DEPTH = 3          // max cascading rule evaluations
export const DEDUP_WINDOW_MS = 500       // ignore same rule+task within this window
export const MAX_FIRES_PER_TICK = 20     // circuit breaker: max rule fires per evaluation batch

export function useRuleEngine({ projects, tasks, updTask, toast, inbox, _tr, moveTask }) {
  const firedDeadlineRef = useRef(new Set())
  const depthRef = useRef(0)                    // current cascade depth
  const firesThisTickRef = useRef(0)            // fires in current evaluation batch
  const recentFiresRef = useRef(new Map())      // Map<"ruleId:taskId", timestamp> for dedup

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
          ? action.config.message.replace('{task}', task.title).replace('{who}', (Array.isArray(task.who) ? task.who.join(', ') : task.who) ?? '')
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

      case 'assign_to': {
        const target = action.config?.who
        if (target) {
          const arr = Array.isArray(task.who) ? task.who : task.who ? [task.who] : []
          if (!arr.includes(target)) {
            updTask(task.id, { who: [...arr, target] })
          }
        }
        break
      }

      case 'add_tag': {
        const tag = action.config?.tag
        if (tag) {
          const current = task.tags ?? []
          if (!current.includes(tag)) {
            updTask(task.id, { tags: [...current, tag] })
          }
        }
        break
      }

      case 'set_due_date': {
        const offsetDays = action.config?.offsetDays
        if (offsetDays != null) {
          const d = new Date()
          d.setDate(d.getDate() + offsetDays)
          updTask(task.id, { due: d.toISOString().slice(0, 10) })
        }
        break
      }

      case 'create_subtask': {
        const title = action.config?.subtaskTitle
        if (title) {
          const subs = [...(task.subs ?? []), { id: `s${Date.now()}`, title, done: false }]
          updTask(task.id, { subs })
        }
        break
      }

      case 'webhook': {
        const url = action.config?.url
        if (url) {
          const payload = {
            event: 'rule_triggered',
            rule: action.config?.ruleName ?? '',
            task: { id: task.id, title: task.title, who: task.who, pri: task.pri, due: task.due, done: task.done, sec: task.sec },
            timestamp: new Date().toISOString(),
          }
          const ctrl = new AbortController()
          const timer = setTimeout(() => ctrl.abort(), 10_000)
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(action.config?.headers ?? {}) },
            body: JSON.stringify(payload),
            signal: ctrl.signal,
          }).catch(err => {
            if (err.name !== 'AbortError') log.warn('Webhook failed:', url, err.message)
            else log.warn('Webhook timeout:', url)
          }).finally(() => clearTimeout(timer))
        }
        break
      }

      case 'send_email': {
        const to = action.config?.to
        const subject = action.config?.subject
          ? action.config.subject.replace('{task}', task.title).replace('{who}', (Array.isArray(task.who) ? task.who.join(', ') : task.who) ?? '')
          : `TaskFlow: ${task.title}`
        const body = action.config?.body
          ? action.config.body.replace('{task}', task.title).replace('{who}', (Array.isArray(task.who) ? task.who.join(', ') : task.who) ?? '').replace('{due}', task.due ?? '—')
          : `Task "${task.title}" triggered a rule.`
        if (to) {
          const proxyUrl = import.meta.env.VITE_AI_PROXY_URL
          if (proxyUrl) {
            let emailUrl
            try {
              const u = new URL(proxyUrl)
              u.pathname = u.pathname.replace(/\/ai-proxy\/?$/, '/send-email')
              emailUrl = u.toString()
            } catch {
              emailUrl = proxyUrl.replace(/\/ai-proxy\/?$/, '/send-email')
            }
            const ctrl = new AbortController()
            const timer = setTimeout(() => ctrl.abort(), 10_000)
            fetch(emailUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to, subject, body }),
              signal: ctrl.signal,
            }).catch(err => {
              if (err.name !== 'AbortError') log.warn('Email send failed:', to, err.message)
              else log.warn('Email send timeout:', to)
            }).finally(() => clearTimeout(timer))
          }
        }
        break
      }

      default:
        break
    }
  }, [updTask, moveTask, toast, inbox])

  // ── Execute all actions for a rule (multi-action support) ──

  const executeRuleActions = useCallback((rule, task) => {
    const actions = rule.actions ?? (rule.action ? [rule.action] : [])
    for (const action of actions) {
      executeAction(action, task)
    }
  }, [executeAction])

  // ── Check conditions (filters) ────────────────────────────

  const matchesConditions = useCallback((conditions, task) => {
    if (!conditions?.length) return true
    return conditions.every(cond => {
      switch (cond.field) {
        case 'priority':
          return cond.value ? task.pri === cond.value : true
        case 'assignee':
          return cond.value ? (Array.isArray(task.who) ? task.who.includes(cond.value) : task.who === cond.value) : true
        case 'tag':
          return cond.value ? (task.tags ?? []).includes(cond.value) : true
        case 'section':
          return cond.value ? task.sec === cond.value : true
        default:
          return true
      }
    })
  }, [])

  // ── Get enabled rules for a project ────────────────────

  const getProjectRules = useCallback((pid) => {
    const proj = projects.find(p => p.id === pid)
    return (proj?.rules ?? []).filter(r => r.enabled)
  }, [projects])

  // ── Evaluate rules after task field change ──────────────

  const evaluateTaskChange = useCallback((taskId, patch, prevTask) => {
    if (!prevTask) return

    // ── Loop guard: depth check ──
    if (depthRef.current >= MAX_RULE_DEPTH) return
    // ── Loop guard: circuit breaker ──
    if (firesThisTickRef.current >= MAX_FIRES_PER_TICK) return

    const rules = getProjectRules(prevTask.pid)
    if (!rules.length) return

    const currentTask = { ...prevTask, ...patch }

    for (const rule of rules) {
      // Circuit breaker re-check inside loop
      if (firesThisTickRef.current >= MAX_FIRES_PER_TICK) break

      const { trigger } = rule
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
          if ('who' in patch) {
            const newArr = Array.isArray(patch.who) ? patch.who : patch.who ? [patch.who] : []
            const oldArr = Array.isArray(prevTask.who) ? prevTask.who : prevTask.who ? [prevTask.who] : []
            if (newArr.length > oldArr.length || newArr.some(n => !oldArr.includes(n))) {
              shouldFire = true
            }
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

        case 'priority_changed':
          if ('pri' in patch && patch.pri !== prevTask.pri) {
            if (!trigger.config?.priority || trigger.config.priority === patch.pri) {
              shouldFire = true
            }
          }
          break

        case 'comment_added':
          if ('comments' in patch) {
            const prev = prevTask.comments?.length ?? 0
            const curr = patch.comments?.length ?? 0
            if (curr > prev) shouldFire = true
          }
          break

        case 'task_completed':
          if ('done' in patch && patch.done === true && !prevTask.done) {
            shouldFire = true
          }
          break

        case 'tag_added':
          if ('tags' in patch) {
            const prevTags = new Set(prevTask.tags ?? [])
            const newTags = (patch.tags ?? []).filter(tg => !prevTags.has(tg))
            if (newTags.length > 0) {
              if (!trigger.config?.tag || newTags.includes(trigger.config.tag)) {
                shouldFire = true
              }
            }
          }
          break

        // deadline_approaching is handled by the periodic check
        default:
          break
      }

      if (shouldFire && matchesConditions(rule.conditions, currentTask)) {
        // ── Loop guard: dedup (same rule+task within window) ──
        const dedupKey = `${rule.id}:${taskId}`
        const lastFired = recentFiresRef.current.get(dedupKey)
        if (lastFired && Date.now() - lastFired < DEDUP_WINDOW_MS) continue
        recentFiresRef.current.set(dedupKey, Date.now())

        firesThisTickRef.current++
        depthRef.current++
        setTimeout(() => {
          try {
            executeRuleActions(rule, currentTask)
          } finally {
            depthRef.current = Math.max(0, depthRef.current - 1)
          }
        }, 0)
      }
    }

    // Reset tick counter at end of synchronous evaluation
    // (next microtask will have a fresh budget via setTimeout)
    setTimeout(() => { firesThisTickRef.current = 0 }, 0)

    // Periodically clean stale dedup entries (keep map small)
    if (recentFiresRef.current.size > 100) {
      const now = Date.now()
      for (const [k, ts] of recentFiresRef.current) {
        if (now - ts > DEDUP_WINDOW_MS * 2) recentFiresRef.current.delete(k)
      }
    }
  }, [getProjectRules, executeRuleActions, matchesConditions])

  // ── Periodic deadline check (runs every 60s) ────────────

  useEffect(() => {
    const checkDeadlines = () => {
      const now = new Date()

      for (const task of tasks) {
        if (task.done || !task.due) continue

        const dueDate = new Date(task.due + 'T23:59:59')
        const diffMs = dueDate - now
        const diffDays = diffMs / (1000 * 60 * 60 * 24)

        // ── Global due-date-approaching notification (1 day) ──
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
            if (!firedDeadlineRef.current.has(key) && matchesConditions(rule.conditions, task)) {
              firedDeadlineRef.current.add(key)
              executeRuleActions(rule, task)
            }
          }
        }
      }
    }

    checkDeadlines()
    const interval = setInterval(checkDeadlines, 60_000)
    return () => clearInterval(interval)
  }, [tasks, getProjectRules, executeRuleActions, matchesConditions, inbox, _tr])

  // ── Reset deadline tracking when rules change ──────────
  const rulesFingerprint = useMemo(
    () => projects.map(p => JSON.stringify(p.rules ?? [])).join(),
    [projects]
  )

  useEffect(() => {
    firedDeadlineRef.current = new Set()
  }, [rulesFingerprint])

  return { evaluateTaskChange }
}
