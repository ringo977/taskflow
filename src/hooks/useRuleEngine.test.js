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

  // ── Webhook action ──

  describe('webhook action', () => {
    let fetchSpy

    beforeEach(() => {
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true })
    })
    afterEach(() => {
      fetchSpy.mockRestore()
    })

    it('sends POST with correct payload shape', () => {
      const rule = makeRule('section_change', act1('webhook', {
        url: 'https://hooks.example.com/test',
        ruleName: 'Deploy notify',
      }))
      const { result } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const [url, opts] = fetchSpy.mock.calls[0]
      expect(url).toBe('https://hooks.example.com/test')
      expect(opts.method).toBe('POST')
      expect(opts.headers['Content-Type']).toBe('application/json')

      const body = JSON.parse(opts.body)
      expect(body.event).toBe('rule_triggered')
      expect(body.rule).toBe('Deploy notify')
      expect(body.task).toEqual(expect.objectContaining({
        id: 't1', title: 'Test Task', who: ['Alice'],
      }))
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('includes custom headers when provided', () => {
      const rule = makeRule('section_change', act1('webhook', {
        url: 'https://hooks.example.com/test',
        headers: { 'X-Webhook-Secret': 's3cret' },
      }))
      const { result } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })

      const [, opts] = fetchSpy.mock.calls[0]
      expect(opts.headers['X-Webhook-Secret']).toBe('s3cret')
    })

    it('does not fetch when url is missing', () => {
      const rule = makeRule('section_change', act1('webhook', {}))
      const { result } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('catches fetch errors without throwing', () => {
      fetchSpy.mockRejectedValue(new Error('Network error'))
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const rule = makeRule('section_change', act1('webhook', {
        url: 'https://hooks.example.com/fail',
      }))
      const { result } = setup([rule])

      expect(() => {
        act(() => {
          result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
          vi.advanceTimersByTime(100)
        })
      }).not.toThrow()

      warnSpy.mockRestore()
    })

    it('handles AbortError on timeout', async () => {
      const abortErr = new DOMException('Aborted', 'AbortError')
      fetchSpy.mockRejectedValue(abortErr)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const rule = makeRule('section_change', act1('webhook', {
        url: 'https://hooks.example.com/slow',
      }))
      const { result } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })

      // Wait for the catch handler
      await vi.advanceTimersByTimeAsync(0)

      expect(warnSpy).toHaveBeenCalledWith(
        '[TaskFlow:RuleEngine]',
        'Webhook timeout:',
        expect.any(String)
      )
      warnSpy.mockRestore()
    })

    it('includes task.who as array in payload', () => {
      const multiTask = { ...TASK, who: ['Alice', 'Bob', 'Charlie'] }
      const rule = makeRule('section_change', act1('webhook', {
        url: 'https://hooks.example.com/test',
      }))
      const { result } = setup([rule], [multiTask])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, multiTask)
        vi.advanceTimersByTime(100)
      })

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
      expect(body.task.who).toEqual(['Alice', 'Bob', 'Charlie'])
    })
  })

  // ── Send email action ──

  describe('send_email action', () => {
    let fetchSpy

    beforeEach(() => {
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true })
      vi.stubEnv('VITE_AI_PROXY_URL', 'https://proxy.example.com/ai-proxy')
    })
    afterEach(() => {
      fetchSpy.mockRestore()
      vi.unstubAllEnvs()
    })

    it('sends email with correct to/subject/body', () => {
      const rule = makeRule('task_completed', act1('send_email', {
        to: 'marco@lab.it',
        subject: 'Task {task} done by {who}',
        body: 'Task {task} assigned to {who} due {due}',
      }))
      const { result } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { done: true }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const [url, opts] = fetchSpy.mock.calls[0]
      expect(url).toBe('https://proxy.example.com/send-email')

      const payload = JSON.parse(opts.body)
      expect(payload.to).toBe('marco@lab.it')
      expect(payload.subject).toBe('Task Test Task done by Alice')
      expect(payload.body).toContain('Test Task')
      expect(payload.body).toContain('Alice')
      expect(payload.body).toContain('2026-04-01')
    })

    it('uses default subject/body when not configured', () => {
      const rule = makeRule('task_completed', act1('send_email', {
        to: 'marco@lab.it',
      }))
      const { result } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { done: true }, TASK)
        vi.advanceTimersByTime(100)
      })

      const payload = JSON.parse(fetchSpy.mock.calls[0][1].body)
      expect(payload.subject).toBe('TaskFlow: Test Task')
      expect(payload.body).toContain('Test Task')
    })

    it('does not send when to is empty', () => {
      const rule = makeRule('task_completed', act1('send_email', { to: '' }))
      const { result } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { done: true }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('does not send when proxy URL is not set', () => {
      vi.stubEnv('VITE_AI_PROXY_URL', '')
      const rule = makeRule('task_completed', act1('send_email', {
        to: 'marco@lab.it',
      }))
      const { result } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { done: true }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('replaces {who} with comma-joined multi-assignees', () => {
      const multiTask = { ...TASK, who: ['Alice', 'Bob'] }
      const rule = makeRule('section_change', act1('send_email', {
        to: 'team@lab.it',
        subject: 'Assigned: {who}',
        body: 'People: {who}',
      }))
      const { result } = setup([rule], [multiTask])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, multiTask)
        vi.advanceTimersByTime(100)
      })

      const payload = JSON.parse(fetchSpy.mock.calls[0][1].body)
      expect(payload.subject).toBe('Assigned: Alice, Bob')
      expect(payload.body).toBe('People: Alice, Bob')
    })

    it('handles missing due date in placeholder', () => {
      const noDueTask = { ...TASK, due: null }
      const rule = makeRule('section_change', act1('send_email', {
        to: 'x@lab.it',
        body: 'Due: {due}',
      }))
      const { result } = setup([rule], [noDueTask])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, noDueTask)
        vi.advanceTimersByTime(100)
      })

      const payload = JSON.parse(fetchSpy.mock.calls[0][1].body)
      expect(payload.body).toBe('Due: —')
    })
  })

  // ── Flat template rule format normalization ──

  describe('flat template rule format', () => {
    it('normalizes flat trigger/action to nested format', () => {
      // This is the format used in PROJECT_TEMPLATES
      const flatRule = {
        id: 'r_flat', name: 'Flat rule', enabled: true,
        trigger: 'section_change',
        triggerConfig: { section: 'Done' },
        action: 'complete_task',
        actionConfig: {},
      }
      const { result, updTask } = setup([flatRule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(updTask).toHaveBeenCalledWith('t1', { done: true })
    })
  })

  // ── Aggregate trigger: all_tasks_done_in_wp ──

  describe('all_tasks_done_in_wp trigger', () => {
    const WP_TASK_A = { ...TASK, id: 'tA', workpackageId: 'wp1' }
    const WP_TASK_B = { ...TASK, id: 'tB', workpackageId: 'wp1', done: true }
    const WP_TASK_C = { ...TASK, id: 'tC', workpackageId: 'wp2', done: false }

    it('fires when last task in WP is completed', () => {
      const rule = makeRule('all_tasks_done_in_wp',
        act1('set_wp_status', { status: 'complete' }),
      )
      const onWpStatusChange = vi.fn()
      const updTask = vi.fn()
      const toast = vi.fn()
      const inb = { push: vi.fn() }
      const projects = [{ id: 'p1', name: 'P', rules: [rule] }]
      const allTasks = [WP_TASK_A, WP_TASK_B, WP_TASK_C]

      const { result } = renderHook(() =>
        useRuleEngine({ projects, tasks: allTasks, updTask, toast, inbox: inb, _tr: {}, moveTask: vi.fn(), onWpStatusChange })
      )

      act(() => {
        // Complete tA — now tA(done) + tB(done) = all wp1 done
        result.current.evaluateTaskChange('tA', { done: true }, WP_TASK_A)
        vi.advanceTimersByTime(100)
      })

      expect(onWpStatusChange).toHaveBeenCalledWith('wp1', 'complete')
    })

    it('does not fire when other tasks in WP are still open', () => {
      const rule = makeRule('all_tasks_done_in_wp', act1('set_wp_status', { status: 'complete' }))
      const onWpStatusChange = vi.fn()
      const updTask = vi.fn()
      const toast = vi.fn()
      const projects = [{ id: 'p1', name: 'P', rules: [rule] }]
      // Both open
      const allTasks = [
        { ...TASK, id: 'tX', workpackageId: 'wp1', done: false },
        { ...TASK, id: 'tY', workpackageId: 'wp1', done: false },
      ]

      const { result } = renderHook(() =>
        useRuleEngine({ projects, tasks: allTasks, updTask, toast, inbox: { push: vi.fn() }, _tr: {}, moveTask: vi.fn(), onWpStatusChange })
      )

      act(() => {
        result.current.evaluateTaskChange('tX', { done: true }, allTasks[0])
        vi.advanceTimersByTime(100)
      })

      // tY is still open
      expect(onWpStatusChange).not.toHaveBeenCalled()
    })
  })

  // ── Aggregate trigger: all_tasks_done_in_ms ──

  describe('all_tasks_done_in_ms trigger', () => {
    it('fires when last task linked to milestone is completed', () => {
      const rule = makeRule('all_tasks_done_in_ms',
        act1('set_ms_status', { toStatus: 'achieved' }),
      )
      const onMsStatusChange = vi.fn()
      const updTask = vi.fn()
      const toast = vi.fn()
      const projects = [{ id: 'p1', name: 'P', rules: [rule] }]
      const allTasks = [
        { ...TASK, id: 'tA', milestoneId: 'ms1', done: false },
        { ...TASK, id: 'tB', milestoneId: 'ms1', done: true },
      ]

      const { result } = renderHook(() =>
        useRuleEngine({ projects, tasks: allTasks, updTask, toast, inbox: { push: vi.fn() }, _tr: {}, moveTask: vi.fn(), onMsStatusChange })
      )

      act(() => {
        result.current.evaluateTaskChange('tA', { done: true }, allTasks[0])
        vi.advanceTimersByTime(100)
      })

      expect(onMsStatusChange).toHaveBeenCalledWith('ms1', 'achieved')
    })
  })
})
