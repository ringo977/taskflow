import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRuleEngine, MAX_RULE_DEPTH, MAX_FIRES_PER_TICK } from './useRuleEngine'

// ── Helpers ──────────────────────────────────────────────────

const TASK = {
  id: 't1', pid: 'p1', title: 'Test Task', sec: 'To Do', who: ['Alice'],
  done: false, pri: 'medium', desc: '', subs: [], comments: [],
  tags: [], due: '2026-04-01',
}

const makeRule = (trigger, actions, opts = {}) => ({
  id: opts.id ?? `rule_${Date.now()}_${Math.random()}`,
  name: opts.name ?? 'Test rule',
  enabled: opts.enabled ?? true,
  trigger: typeof trigger === 'string' ? { type: trigger, config: {} } : trigger,
  actions: Array.isArray(actions) ? actions : [actions],
  conditions: opts.conditions ?? [],
})

const act1 = (type, config = {}) => ({ type, config })

const setup = (rules = [], tasks = [TASK]) => {
  const updTask = vi.fn()
  const moveTask = vi.fn()
  const toast = vi.fn()
  const inbox = { push: vi.fn() }
  const _tr = {}

  const projects = [{ id: 'p1', name: 'Proj', rules }]

  const { result } = renderHook(() =>
    useRuleEngine({ projects, tasks, updTask, toast, inbox, _tr, moveTask })
  )

  return { result, updTask, moveTask, toast, inbox }
}

// ── Tests ────────────────────────────────────────────────────

describe('useRuleEngine', () => {

  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  // ── Trigger: section_change ──

  describe('section_change trigger', () => {
    it('fires on section change', () => {
      const rule = makeRule('section_change', act1('notify', { message: 'Moved!' }))
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(toast).toHaveBeenCalledWith('Moved!', 'info')
    })

    it('fires only when target section matches', () => {
      const rule = makeRule(
        { type: 'section_change', config: { section: 'Done' } },
        act1('notify', { message: 'Done!' })
      )
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'In Progress' }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(toast).not.toHaveBeenCalled()

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(toast).toHaveBeenCalledWith('Done!', 'info')
    })

    it('does not fire when section unchanged', () => {
      const rule = makeRule('section_change', act1('notify', { message: 'Moved!' }))
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'To Do' }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(toast).not.toHaveBeenCalled()
    })
  })

  // ── Trigger: task_assigned ──

  describe('task_assigned trigger', () => {
    it('fires on assignment change', () => {
      const rule = makeRule('task_assigned', act1('notify', { message: 'Assigned to {who}' }))
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { who: 'Bob' }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(toast).toHaveBeenCalledWith('Assigned to Bob', 'info')
    })

    it('does not fire on empty assignment', () => {
      const rule = makeRule('task_assigned', act1('notify'))
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { who: '' }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(toast).not.toHaveBeenCalled()
    })
  })

  // ── Trigger: priority_changed ──

  describe('priority_changed trigger', () => {
    it('fires on any priority change', () => {
      const rule = makeRule('priority_changed', act1('notify', { message: 'Pri changed' }))
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { pri: 'high' }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(toast).toHaveBeenCalled()
    })

    it('fires only for specific target priority', () => {
      const rule = makeRule(
        { type: 'priority_changed', config: { priority: 'high' } },
        act1('notify', { message: 'Now high!' })
      )
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { pri: 'low' }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(toast).not.toHaveBeenCalled()

      act(() => {
        result.current.evaluateTaskChange('t1', { pri: 'high' }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(toast).toHaveBeenCalledWith('Now high!', 'info')
    })
  })

  // ── Trigger: task_completed ──

  describe('task_completed trigger', () => {
    it('fires when task marked done', () => {
      const rule = makeRule('task_completed', act1('notify', { message: 'Done!' }))
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { done: true }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(toast).toHaveBeenCalledWith('Done!', 'info')
    })

    it('does not fire when already done', () => {
      const rule = makeRule('task_completed', act1('notify'))
      const doneTask = { ...TASK, done: true }
      const { result, toast } = setup([rule], [doneTask])

      act(() => {
        result.current.evaluateTaskChange('t1', { done: true }, doneTask)
        vi.advanceTimersByTime(100)
      })
      expect(toast).not.toHaveBeenCalled()
    })
  })

  // ── Trigger: comment_added ──

  describe('comment_added trigger', () => {
    it('fires when comments array grows', () => {
      const rule = makeRule('comment_added', act1('notify', { message: 'New comment' }))
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', {
          comments: [{ user: 'Bob', text: 'Hi', date: new Date().toISOString() }]
        }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(toast).toHaveBeenCalled()
    })
  })

  // ── Trigger: tag_added ──

  describe('tag_added trigger', () => {
    it('fires on new tag', () => {
      const rule = makeRule('tag_added', act1('notify', { message: 'Tagged!' }))
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { tags: ['urgent'] }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(toast).toHaveBeenCalled()
    })

    it('filters by specific tag', () => {
      const rule = makeRule(
        { type: 'tag_added', config: { tag: 'critical' } },
        act1('notify', { message: 'Critical!' })
      )
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { tags: ['minor'] }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(toast).not.toHaveBeenCalled()

      act(() => {
        result.current.evaluateTaskChange('t1', { tags: ['critical'] }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(toast).toHaveBeenCalledWith('Critical!', 'info')
    })
  })

  // ── Trigger: subtasks_completed ──

  describe('subtasks_completed trigger', () => {
    it('fires when all subs are done', () => {
      const rule = makeRule('subtasks_completed', act1('complete_task'))
      const { result, updTask } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', {
          subs: [{ id: 's1', done: true }, { id: 's2', done: true }]
        }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(updTask).toHaveBeenCalledWith('t1', { done: true })
    })

    it('does not fire if some subs incomplete', () => {
      const rule = makeRule('subtasks_completed', act1('complete_task'))
      const { result, updTask } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', {
          subs: [{ id: 's1', done: true }, { id: 's2', done: false }]
        }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(updTask).not.toHaveBeenCalled()
    })
  })

  // ── Actions ──

  describe('actions', () => {
    it('move_to_section calls moveTask', () => {
      const rule = makeRule('task_completed', act1('move_to_section', { section: 'Archive' }))
      const { result, moveTask } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { done: true }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(moveTask).toHaveBeenCalledWith('t1', 'Archive')
    })

    it('set_priority calls updTask', () => {
      const rule = makeRule('section_change', act1('set_priority', { priority: 'high' }))
      const { result, updTask } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Urgent' }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(updTask).toHaveBeenCalledWith('t1', { pri: 'high' })
    })

    it('assign_to calls updTask', () => {
      const rule = makeRule('section_change', act1('assign_to', { who: 'Charlie' }))
      const { result, updTask } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Review' }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(updTask).toHaveBeenCalledWith('t1', { who: ['Alice', 'Charlie'] })
    })

    it('add_tag appends to tags', () => {
      const rule = makeRule('task_completed', act1('add_tag', { tag: 'archived' }))
      const { result, updTask } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { done: true }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(updTask).toHaveBeenCalledWith('t1', { tags: ['archived'] })
    })

    it('set_due_date sets relative date', () => {
      const rule = makeRule('task_assigned', act1('set_due_date', { offsetDays: 7 }))
      const { result, updTask } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { who: 'Bob' }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(updTask).toHaveBeenCalledWith('t1', expect.objectContaining({
        due: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }))
    })

    it('create_subtask adds to subs', () => {
      const rule = makeRule('section_change', act1('create_subtask', { subtaskTitle: 'Review code' }))
      const { result, updTask } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Review' }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(updTask).toHaveBeenCalledWith('t1', expect.objectContaining({
        subs: expect.arrayContaining([
          expect.objectContaining({ title: 'Review code', done: false }),
        ]),
      }))
    })
  })

  // ── Multi-action ──

  describe('multi-action', () => {
    it('executes multiple actions in sequence', () => {
      const rule = makeRule('section_change', [
        act1('set_priority', { priority: 'high' }),
        act1('notify', { message: 'Escalated' }),
        act1('assign_to', { who: 'Lead' }),
      ])
      const { result, updTask, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Escalated' }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(updTask).toHaveBeenCalledWith('t1', { pri: 'high' })
      expect(updTask).toHaveBeenCalledWith('t1', { who: ['Alice', 'Lead'] })
      expect(toast).toHaveBeenCalledWith('Escalated', 'info')
    })
  })

  // ── Conditions ──

  describe('conditions', () => {
    it('blocks rule when priority condition fails', () => {
      const rule = makeRule('section_change', act1('notify', { message: 'Hi' }), {
        conditions: [{ field: 'priority', value: 'high' }],
      })
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK) // pri=medium
        vi.advanceTimersByTime(100)
      })
      expect(toast).not.toHaveBeenCalled()
    })

    it('allows rule when condition matches', () => {
      const highTask = { ...TASK, pri: 'high' }
      const rule = makeRule('section_change', act1('notify', { message: 'High done!' }), {
        conditions: [{ field: 'priority', value: 'high' }],
      })
      const { result, toast } = setup([rule], [highTask])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, highTask)
        vi.advanceTimersByTime(100)
      })
      expect(toast).toHaveBeenCalledWith('High done!', 'info')
    })

    it('checks assignee condition', () => {
      const rule = makeRule('task_completed', act1('notify', { message: 'Done' }), {
        conditions: [{ field: 'assignee', value: 'Bob' }],
      })
      const { result, toast } = setup([rule]) // TASK.who = 'Alice'

      act(() => {
        result.current.evaluateTaskChange('t1', { done: true }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(toast).not.toHaveBeenCalled()
    })

    it('checks tag condition', () => {
      const taggedTask = { ...TASK, tags: ['vip'] }
      const rule = makeRule('section_change', act1('notify', { message: 'VIP moved' }), {
        conditions: [{ field: 'tag', value: 'vip' }],
      })
      const { result, toast } = setup([rule], [taggedTask])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, taggedTask)
        vi.advanceTimersByTime(100)
      })
      expect(toast).toHaveBeenCalled()
    })
  })

  // ── Disabled rules ──

  describe('disabled rules', () => {
    it('skips disabled rules', () => {
      const rule = makeRule('section_change', act1('notify'), { enabled: false })
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(toast).not.toHaveBeenCalled()
    })
  })

  // ── Loop guard ──

  describe('loop guard', () => {
    it('exports expected constants', () => {
      expect(MAX_RULE_DEPTH).toBe(3)
      expect(MAX_FIRES_PER_TICK).toBe(20)
    })

    it('deduplicates rapid same-rule same-task fires', () => {
      const rule = makeRule('section_change', act1('notify', { message: 'X' }), { id: 'r1' })
      const { result, toast } = setup([rule])

      act(() => {
        // Fire same rule+task twice quickly
        result.current.evaluateTaskChange('t1', { sec: 'A' }, TASK)
        result.current.evaluateTaskChange('t1', { sec: 'B' }, { ...TASK, sec: 'A' })
        vi.advanceTimersByTime(100)
      })

      // Should only fire once due to dedup window
      expect(toast).toHaveBeenCalledTimes(1)
    })

    it('respects circuit breaker limit', () => {
      // Create more rules than MAX_FIRES_PER_TICK
      const rules = Array.from({ length: 25 }, (_, i) =>
        makeRule('section_change', act1('notify', { message: `Rule ${i}` }), { id: `r_${i}` })
      )
      const { result, toast } = setup(rules)

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'X' }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(toast.mock.calls.length).toBeLessThanOrEqual(MAX_FIRES_PER_TICK)
    })
  })

  // ── Null / edge cases ──

  describe('edge cases', () => {
    it('handles null prevTask gracefully', () => {
      const rule = makeRule('section_change', act1('notify'))
      const { result } = setup([rule])

      expect(() => {
        act(() => {
          result.current.evaluateTaskChange('t1', { sec: 'Done' }, null)
          vi.advanceTimersByTime(100)
        })
      }).not.toThrow()
    })

    it('handles project with no rules', () => {
      const { result, toast } = setup([])

      expect(() => {
        act(() => {
          result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
          vi.advanceTimersByTime(100)
        })
      }).not.toThrow()
      expect(toast).not.toHaveBeenCalled()
    })

    it('handles legacy single-action format', () => {
      // Old format: rule.action instead of rule.actions
      const rule = {
        id: 'r_legacy', name: 'Legacy', enabled: true,
        trigger: { type: 'section_change', config: {} },
        action: { type: 'notify', config: { message: 'Legacy works' } },
      }
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })
      expect(toast).toHaveBeenCalledWith('Legacy works', 'info')
    })
  })
})
