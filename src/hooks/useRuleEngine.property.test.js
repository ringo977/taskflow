import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import fc from 'fast-check'
import { useRuleEngine, MAX_FIRES_PER_TICK, DEDUP_WINDOW_MS } from './useRuleEngine'

/**
 * Property-based tests for the rule engine.
 *
 * B1: Arbitrary trigger/action/condition combinations
 * B2: Invariants — dedup, circuit breaker, no infinite loops
 */

// ── Arbitraries ──────────────────────────────────────────────

const TRIGGER_TYPES = [
  'section_change', 'task_assigned', 'subtasks_completed',
  'priority_changed', 'comment_added', 'task_completed', 'tag_added',
]
const ACTION_TYPES = [
  'move_to_section', 'notify', 'set_priority', 'complete_task',
  'assign_to', 'add_tag', 'set_due_date', 'create_subtask',
  'webhook', 'send_email',
]
const PRIORITIES = ['low', 'medium', 'high']
const SECTIONS = ['To Do', 'In Progress', 'Done', 'Review']

const arbTriggerType = fc.constantFrom(...TRIGGER_TYPES)
const arbActionType = fc.constantFrom(...ACTION_TYPES)
const arbPriority = fc.constantFrom(...PRIORITIES)
const arbSection = fc.constantFrom(...SECTIONS)
const arbName = fc.string({ minLength: 1, maxLength: 20 })

const arbTrigger = fc.record({
  type: arbTriggerType,
  config: fc.oneof(
    fc.constant({}),
    fc.record({ section: arbSection }),
    fc.record({ priority: arbPriority }),
    fc.record({ tag: arbName }),
    fc.record({ days: fc.integer({ min: 1, max: 30 }) }),
  ),
})

const arbActionConfig = fc.oneof(
  fc.constant({}),
  fc.record({ section: arbSection }),
  fc.record({ priority: arbPriority }),
  fc.record({ message: fc.string({ maxLength: 50 }) }),
  fc.record({ who: arbName }),
  fc.record({ tag: arbName }),
  fc.record({ offsetDays: fc.integer({ min: -30, max: 30 }) }),
  fc.record({ subtaskTitle: arbName }),
  fc.record({ url: fc.webUrl() }),
)

const arbAction = fc.record({
  type: arbActionType,
  config: arbActionConfig,
})

const arbCondition = fc.record({
  field: fc.constantFrom('priority', 'assignee', 'tag', 'section'),
  value: fc.oneof(arbPriority, arbName, arbSection, fc.constant(null)),
})

const arbRule = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  enabled: fc.boolean(),
  trigger: arbTrigger,
  actions: fc.array(arbAction, { minLength: 0, maxLength: 5 }),
  conditions: fc.array(arbCondition, { minLength: 0, maxLength: 3 }),
})

const arbTask = fc.record({
  id: fc.string({ minLength: 1, maxLength: 10 }).map(s => `t${s}`),
  pid: fc.constant('p1'),
  title: fc.string({ minLength: 1, maxLength: 50 }),
  sec: arbSection,
  who: fc.oneof(
    fc.constant(null),
    fc.constant([]),
    fc.array(arbName, { minLength: 1, maxLength: 4 }),
    arbName, // string instead of array
  ),
  done: fc.boolean(),
  pri: arbPriority,
  desc: fc.string({ maxLength: 50 }),
  subs: fc.array(
    fc.record({ id: fc.uuid(), title: arbName, done: fc.boolean() }),
    { maxLength: 5 }
  ),
  comments: fc.array(
    fc.record({ text: fc.string(), user: arbName }),
    { maxLength: 3 }
  ),
  tags: fc.array(arbName, { maxLength: 5 }),
  due: fc.oneof(
    fc.constant(null),
    fc.integer({ min: 0, max: 1095 }).map(offset => {
      const d = new Date('2025-01-01')
      d.setDate(d.getDate() + offset)
      return d.toISOString().slice(0, 10)
    }),
  ),
})

// ── Patch generators (simulate task mutations) ───────────────

const arbPatch = fc.oneof(
  fc.record({ sec: arbSection }),
  fc.record({ done: fc.boolean() }),
  fc.record({ pri: arbPriority }),
  fc.record({
    who: fc.oneof(fc.constant([]), fc.array(arbName, { minLength: 1, maxLength: 3 })),
  }),
  fc.record({
    tags: fc.array(arbName, { minLength: 0, maxLength: 5 }),
  }),
  fc.record({
    subs: fc.array(
      fc.record({ id: fc.uuid(), title: arbName, done: fc.boolean() }),
      { maxLength: 5 }
    ),
  }),
  fc.record({
    comments: fc.array(
      fc.record({ text: fc.string(), user: arbName }),
      { maxLength: 5 }
    ),
  }),
)

// ── Setup helper ─────────────────────────────────────────────

const setup = (rules = [], tasks = []) => {
  const updTask = vi.fn()
  const moveTask = vi.fn()
  const toast = vi.fn()
  const inbox = { push: vi.fn() }
  const _tr = {}

  const projects = [{ id: 'p1', name: 'Proj', rules }]
  const taskList = tasks.length ? tasks : [{
    id: 't1', pid: 'p1', title: 'T', sec: 'To Do', who: ['A'],
    done: false, pri: 'medium', desc: '', subs: [], comments: [],
    tags: [], due: '2026-04-01',
  }]

  const { result } = renderHook(() =>
    useRuleEngine({ projects, tasks: taskList, updTask, toast, inbox, _tr, moveTask })
  )

  return { result, updTask, moveTask, toast, inbox }
}

// ── Tests ────────────────────────────────────────────────────

describe('useRuleEngine property-based tests', () => {

  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // ── B1: Arbitrary trigger/action/condition combos ──────────

  describe('B1: arbitrary rule + task + patch combinations never throw', () => {
    it('evaluateTaskChange never throws for any valid combo', () => {
      // Stub fetch so webhook/email actions don't hit real network
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

      fc.assert(
        fc.property(
          fc.array(arbRule, { minLength: 1, maxLength: 10 }),
          arbTask,
          arbPatch,
          (rules, task, patch) => {
            const { result } = setup(rules, [task])

            // Must not throw regardless of input shape
            act(() => {
              result.current.evaluateTaskChange(task.id, patch, task)
              vi.advanceTimersByTime(100)
            })
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ── B2: Invariant — circuit breaker ────────────────────────

  describe('B2: circuit breaker limits fires per tick', () => {
    it.each([25, 30, 35, 40])(
      `never fires more than ${MAX_FIRES_PER_TICK} rules with %i rules`,
      (ruleCount) => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

        const rules = Array.from({ length: ruleCount }, (_, i) => ({
          id: `rule_cb_${i}`,
          name: `R${i}`,
          enabled: true,
          trigger: { type: 'section_change', config: {} },
          actions: [{ type: 'notify', config: { message: `Rule ${i}` } }],
          conditions: [],
        }))

        const task = {
          id: 't_cb', pid: 'p1', title: 'T', sec: 'To Do',
          who: ['A'], done: false, pri: 'medium', desc: '',
          subs: [], comments: [], tags: [], due: null,
        }

        const { result, toast } = setup(rules, [task])

        act(() => {
          result.current.evaluateTaskChange('t_cb', { sec: 'Done' }, task)
          vi.advanceTimersByTime(100)
        })

        // Circuit breaker: no more than MAX_FIRES_PER_TICK calls
        expect(toast.mock.calls.length).toBeLessThanOrEqual(MAX_FIRES_PER_TICK)
      }
    )
  })

  // ── B2: Invariant — dedup within window ────────────────────

  describe('B2: dedup prevents duplicate fires within window', () => {
    it('same rule+task does not fire twice within DEDUP_WINDOW_MS', () => {
      const rule = {
        id: 'r_dedup', name: 'Dedup', enabled: true,
        trigger: { type: 'section_change', config: {} },
        actions: [{ type: 'notify', config: { message: 'fired' } }],
        conditions: [],
      }
      const task = {
        id: 't_dd', pid: 'p1', title: 'T', sec: 'To Do',
        who: ['A'], done: false, pri: 'medium', desc: '',
        subs: [], comments: [], tags: [], due: null,
      }

      const { result, toast } = setup([rule], [task])

      act(() => {
        result.current.evaluateTaskChange('t_dd', { sec: 'Done' }, task)
        vi.advanceTimersByTime(10) // within dedup window
      })

      act(() => {
        // Same rule+task, within window → should be deduped
        result.current.evaluateTaskChange('t_dd', { sec: 'Review' }, { ...task, sec: 'Done' })
        vi.advanceTimersByTime(10)
      })

      // Only first fire should produce a toast
      expect(toast).toHaveBeenCalledTimes(1)
    })

    it('same rule+task fires again AFTER dedup window', () => {
      const rule = {
        id: 'r_dedup2', name: 'Dedup2', enabled: true,
        trigger: { type: 'section_change', config: {} },
        actions: [{ type: 'notify', config: { message: 'fired' } }],
        conditions: [],
      }
      const task = {
        id: 't_dd2', pid: 'p1', title: 'T', sec: 'To Do',
        who: ['A'], done: false, pri: 'medium', desc: '',
        subs: [], comments: [], tags: [], due: null,
      }

      const { result, toast } = setup([rule], [task])

      act(() => {
        result.current.evaluateTaskChange('t_dd2', { sec: 'Done' }, task)
        vi.advanceTimersByTime(DEDUP_WINDOW_MS + 100) // past window
      })

      act(() => {
        result.current.evaluateTaskChange('t_dd2', { sec: 'Review' }, { ...task, sec: 'Done' })
        vi.advanceTimersByTime(100)
      })

      // Both should fire
      expect(toast).toHaveBeenCalledTimes(2)
    })
  })

  // ── B2: Invariant — disabled rules are ignored ─────────────

  describe('B2: disabled rules are never evaluated', () => {
    it('disabled rules produce no side effects', () => {
      fc.assert(
        fc.property(
          arbRule.map(r => ({ ...r, enabled: false })),
          arbTask,
          arbPatch,
          (rule, task, patch) => {
            const { result, toast, updTask, moveTask } = setup([rule], [task])

            act(() => {
              result.current.evaluateTaskChange(task.id, patch, task)
              vi.advanceTimersByTime(100)
            })

            expect(toast).not.toHaveBeenCalled()
            expect(updTask).not.toHaveBeenCalled()
            expect(moveTask).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  // ── B2: Invariant — conditions correctly narrow firing ─────

  describe('B2: conditions filter correctly', () => {
    it('impossible priority condition prevents firing', () => {
      // Rule triggers on section_change but condition requires pri=high
      const rule = {
        id: 'r_cond', name: 'Cond', enabled: true,
        trigger: { type: 'section_change', config: {} },
        actions: [{ type: 'notify', config: { message: 'yes' } }],
        conditions: [{ field: 'priority', value: 'high' }],
      }

      fc.assert(
        fc.property(
          // Generate tasks that are never high priority
          fc.constantFrom('low', 'medium'),
          (pri) => {
            const task = {
              id: 't_c', pid: 'p1', title: 'T', sec: 'To Do',
              who: ['A'], done: false, pri, desc: '',
              subs: [], comments: [], tags: [], due: null,
            }
            const { result, toast } = setup([rule], [task])

            act(() => {
              result.current.evaluateTaskChange('t_c', { sec: 'Done' }, task)
              vi.advanceTimersByTime(100)
            })

            expect(toast).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  // ── B1: filter invariant — filtered ⊆ input ───────────────

  describe('B1: applyFilters invariant', () => {
    // Import here to keep this focused on rule engine + filters
    it('is tested in filters.property.test.js', () => {
      expect(true).toBe(true) // placeholder — real tests in dedicated file
    })
  })
})
