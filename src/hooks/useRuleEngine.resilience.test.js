import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRuleEngine } from './useRuleEngine'

/**
 * Resilience tests for the rule engine.
 *
 * Cover: webhook timeout/failure, email proxy failures, malformed
 * rule configs, null/missing fields, invalid action types,
 * edge conditions, and guard recovery.
 */

// ── Helpers ──────────────────────────────────────────────────

const TASK = {
  id: 't1', pid: 'p1', title: 'Test Task', sec: 'To Do',
  who: ['Alice'], done: false, pri: 'medium', desc: '',
  subs: [], comments: [], tags: [], due: '2026-04-01',
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

const setup = (rules = [], tasks = [TASK], extraOpts = {}) => {
  const updTask = vi.fn()
  const moveTask = vi.fn()
  const toast = vi.fn()
  const inbox = { push: vi.fn() }
  const _tr = {}

  const projects = [{ id: 'p1', name: 'Proj', rules }]

  const { result } = renderHook(() =>
    useRuleEngine({ projects, tasks, updTask, toast, inbox, _tr, moveTask, ...extraOpts })
  )

  return { result, updTask, moveTask, toast, inbox }
}

// ── Tests ────────────────────────────────────────────────────

describe('useRuleEngine resilience', () => {

  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // ── A3: Webhook timeout/failure ──────────────────────────

  describe('webhook resilience', () => {
    it('handles webhook fetch rejection (network error)', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

      const rule = makeRule('section_change', act1('webhook', {
        url: 'https://hooks.example.com/test',
        ruleName: 'Move webhook',
      }))
      const { result } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })

      // Allow microtasks to flush (fetch rejection is async)
      await vi.advanceTimersByTimeAsync(100)

      // Should not throw — webhook failures are fire-and-forget
      expect(warnSpy).toHaveBeenCalledWith(
        '[TaskFlow:RuleEngine]',
        'Webhook failed:',
        'https://hooks.example.com/test',
        expect.any(String)
      )
      warnSpy.mockRestore()
    })

    it('handles webhook AbortError (10s timeout)', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Use a fetch that rejects with AbortError immediately
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(
        new DOMException('The operation was aborted', 'AbortError')
      ))

      const rule = makeRule('section_change', act1('webhook', {
        url: 'https://hooks.example.com/slow',
      }))
      const { result } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })

      // Allow microtasks to flush (fetch rejection is async)
      await vi.advanceTimersByTimeAsync(100)

      expect(warnSpy).toHaveBeenCalledWith(
        '[TaskFlow:RuleEngine]',
        'Webhook timeout:',
        'https://hooks.example.com/slow'
      )
      warnSpy.mockRestore()
    })

    it('handles webhook with missing URL (no fetch called)', () => {
      vi.stubGlobal('fetch', vi.fn())

      const rule = makeRule('section_change', act1('webhook', {}))
      const { result } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(fetch).not.toHaveBeenCalled()
    })

    it('handles webhook with null config', () => {
      vi.stubGlobal('fetch', vi.fn())

      const rule = makeRule('section_change', { type: 'webhook', config: null })
      const { result } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(fetch).not.toHaveBeenCalled()
    })

    it('sends correct payload shape in webhook', () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

      const rule = makeRule('task_completed', act1('webhook', {
        url: 'https://hooks.example.com/done',
        ruleName: 'Complete hook',
        headers: { 'X-Custom': 'value' },
      }))
      const { result } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { done: true }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(fetch).toHaveBeenCalledWith(
        'https://hooks.example.com/done',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom': 'value',
          }),
        })
      )

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.event).toBe('rule_triggered')
      expect(body.rule).toBe('Complete hook')
      expect(body.task.id).toBe('t1')
      expect(body.timestamp).toBeTruthy()
    })
  })

  // ── Email send resilience ──────────────────────────────────

  describe('send_email resilience', () => {
    it('does nothing when "to" is missing', () => {
      vi.stubGlobal('fetch', vi.fn())
      vi.stubEnv('VITE_AI_PROXY_URL', 'https://proxy.test/ai-proxy')

      const rule = makeRule('task_completed', act1('send_email', {
        subject: 'Done!',
        body: 'Task completed.',
      }))
      const { result } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { done: true }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(fetch).not.toHaveBeenCalled()
      vi.unstubAllEnvs()
    })

    it('does nothing when proxy URL is not set', () => {
      vi.stubGlobal('fetch', vi.fn())
      vi.stubEnv('VITE_AI_PROXY_URL', '')

      const rule = makeRule('task_completed', act1('send_email', {
        to: 'user@test.com',
        subject: 'Done!',
      }))
      const { result } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { done: true }, TASK)
        vi.advanceTimersByTime(100)
      })

      // proxyUrl is empty so email branch skips
      expect(fetch).not.toHaveBeenCalled()
      vi.unstubAllEnvs()
    })

    it('handles email fetch failure gracefully', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network fail')))
      vi.stubEnv('VITE_AI_PROXY_URL', 'https://proxy.test/ai-proxy')

      const rule = makeRule('task_completed', act1('send_email', {
        to: 'user@test.com',
        subject: '{task} done',
        body: '{task} by {who} due {due}',
      }))
      const { result } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { done: true }, TASK)
        vi.advanceTimersByTime(100)
      })

      // Allow microtasks to flush (fetch rejection is async)
      await vi.advanceTimersByTimeAsync(100)

      expect(warnSpy).toHaveBeenCalledWith(
        '[TaskFlow:RuleEngine]',
        'Email send failed:',
        'user@test.com',
        expect.any(String)
      )
      warnSpy.mockRestore()
      vi.unstubAllEnvs()
    })

    it('constructs email URL from proxy URL with path replacement', () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
      vi.stubEnv('VITE_AI_PROXY_URL', 'https://proxy.test/functions/v1/ai-proxy')

      const rule = makeRule('task_completed', act1('send_email', {
        to: 'a@b.com', subject: 'S', body: 'B',
      }))
      const { result } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { done: true }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/send-email'),
        expect.any(Object)
      )
      vi.unstubAllEnvs()
    })
  })

  // ── Malformed rule configs ─────────────────────────────────

  describe('malformed rule configs', () => {
    it('handles action with null config', () => {
      const rule = makeRule('section_change', { type: 'set_priority', config: null })
      const { result, updTask } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })

      // config?.priority is null so no-op
      expect(updTask).not.toHaveBeenCalled()
    })

    it('handles action with undefined config', () => {
      const rule = makeRule('section_change', { type: 'notify', config: undefined })
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })

      // Falls back to `Rule: ${task.title}`
      expect(toast).toHaveBeenCalledWith('Rule: Test Task', 'info')
    })

    it('handles unknown action type (no-op)', () => {
      const rule = makeRule('section_change', act1('explode_server'))
      const { result, updTask, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })

      // Unknown type hits default: break
      expect(updTask).not.toHaveBeenCalled()
      expect(toast).not.toHaveBeenCalled()
    })

    it('handles rule with empty actions array', () => {
      const rule = makeRule('section_change', [])
      const { result, updTask, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(updTask).not.toHaveBeenCalled()
      expect(toast).not.toHaveBeenCalled()
    })

    it('handles rule with no actions and no action (legacy)', () => {
      const rule = {
        id: 'r1', name: 'Empty', enabled: true,
        trigger: { type: 'section_change', config: {} },
        // no actions, no action
        conditions: [],
      }
      const { result } = setup([rule])

      // Should not throw
      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })
    })

    it('handles rule.action as single action (legacy format)', () => {
      const rule = {
        id: 'r_legacy', name: 'Legacy', enabled: true,
        trigger: { type: 'section_change', config: {} },
        action: { type: 'notify', config: { message: 'Legacy!' } },
        conditions: [],
      }
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(toast).toHaveBeenCalledWith('Legacy!', 'info')
    })
  })

  // ── Null/missing task fields ───────────────────────────────

  describe('task with missing fields', () => {
    it('handles task with who as null', () => {
      const task = { ...TASK, who: null }
      const rule = makeRule('section_change', act1('assign_to', { who: 'Bob' }))
      const { result, updTask } = setup([rule], [task])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, task)
        vi.advanceTimersByTime(100)
      })

      expect(updTask).toHaveBeenCalledWith('t1', { who: ['Bob'] })
    })

    it('handles task with who as string (not array)', () => {
      const task = { ...TASK, who: 'Charlie' }
      const rule = makeRule('section_change', act1('assign_to', { who: 'Bob' }))
      const { result, updTask } = setup([rule], [task])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, task)
        vi.advanceTimersByTime(100)
      })

      expect(updTask).toHaveBeenCalledWith('t1', { who: ['Charlie', 'Bob'] })
    })

    it('handles task with tags as undefined', () => {
      const task = { ...TASK, tags: undefined }
      const rule = makeRule('section_change', act1('add_tag', { tag: 'urgent' }))
      const { result, updTask } = setup([rule], [task])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, task)
        vi.advanceTimersByTime(100)
      })

      expect(updTask).toHaveBeenCalledWith('t1', { tags: ['urgent'] })
    })

    it('handles task with subs as undefined (create_subtask)', () => {
      const task = { ...TASK, subs: undefined }
      const rule = makeRule('section_change', act1('create_subtask', { subtaskTitle: 'Review' }))
      const { result, updTask } = setup([rule], [task])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, task)
        vi.advanceTimersByTime(100)
      })

      expect(updTask).toHaveBeenCalledWith('t1', {
        subs: expect.arrayContaining([expect.objectContaining({ title: 'Review', done: false })]),
      })
    })

    it('handles set_due_date with offsetDays=0 (today)', () => {
      const rule = makeRule('section_change', act1('set_due_date', { offsetDays: 0 }))
      const { result, updTask } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(updTask).toHaveBeenCalledWith('t1', {
        due: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      })
    })

    it('handles set_due_date with negative offset', () => {
      const rule = makeRule('section_change', act1('set_due_date', { offsetDays: -5 }))
      const { result, updTask } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(updTask).toHaveBeenCalledWith('t1', {
        due: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      })
    })

    it('skips complete_task when task is already done', () => {
      const task = { ...TASK, done: true }
      const rule = makeRule('section_change', act1('complete_task'))
      const { result, updTask } = setup([rule], [task])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, task)
        vi.advanceTimersByTime(100)
      })

      expect(updTask).not.toHaveBeenCalled()
    })

    it('skips move_to_section when already in target section', () => {
      const task = { ...TASK, sec: 'Done' }
      const rule = makeRule('priority_changed', act1('move_to_section', { section: 'Done' }))
      const { result, moveTask } = setup([rule], [task])

      act(() => {
        result.current.evaluateTaskChange('t1', { pri: 'high' }, task)
        vi.advanceTimersByTime(100)
      })

      expect(moveTask).not.toHaveBeenCalled()
    })
  })

  // ── Condition matching edge cases ──────────────────────────

  describe('condition edge cases', () => {
    it('condition with null value matches everything', () => {
      const rule = makeRule('section_change', act1('notify', { message: 'hi' }), {
        conditions: [{ field: 'priority', value: null }],
      })
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(toast).toHaveBeenCalled()
    })

    it('condition with unknown field matches (default true)', () => {
      const rule = makeRule('section_change', act1('notify', { message: 'hi' }), {
        conditions: [{ field: 'unknown_field', value: 'x' }],
      })
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(toast).toHaveBeenCalled()
    })

    it('assignee condition works with string who (not array)', () => {
      const task = { ...TASK, who: 'Alice' }
      const rule = makeRule('section_change', act1('notify', { message: 'match' }), {
        conditions: [{ field: 'assignee', value: 'Alice' }],
      })
      const { result, toast } = setup([rule], [task])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, task)
        vi.advanceTimersByTime(100)
      })

      expect(toast).toHaveBeenCalledWith('match', 'info')
    })

    it('multiple conditions all must match (AND logic)', () => {
      const rule = makeRule('section_change', act1('notify', { message: 'both' }), {
        conditions: [
          { field: 'priority', value: 'high' },    // TASK is medium → fail
          { field: 'assignee', value: 'Alice' },    // matches
        ],
      })
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(toast).not.toHaveBeenCalled()
    })

    it('tag condition with undefined task.tags', () => {
      const task = { ...TASK, tags: undefined }
      const rule = makeRule('section_change', act1('notify', { message: 'tag' }), {
        conditions: [{ field: 'tag', value: 'urgent' }],
      })
      const { result, toast } = setup([rule], [task])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, task)
        vi.advanceTimersByTime(100)
      })

      expect(toast).not.toHaveBeenCalled()
    })
  })

  // ── Trigger edge cases ─────────────────────────────────────

  describe('trigger edge cases', () => {
    it('section_change: same section (no actual change) does not fire', () => {
      const rule = makeRule('section_change', act1('notify', { message: 'moved' }))
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'To Do' }, TASK) // same as TASK.sec
        vi.advanceTimersByTime(100)
      })

      expect(toast).not.toHaveBeenCalled()
    })

    it('task_assigned: removing assignees does not fire', () => {
      const rule = makeRule('task_assigned', act1('notify', { message: 'assigned' }))
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { who: [] }, TASK) // removing Alice
        vi.advanceTimersByTime(100)
      })

      expect(toast).not.toHaveBeenCalled()
    })

    it('subtasks_completed: empty subs array does not fire', () => {
      const rule = makeRule('subtasks_completed', act1('notify', { message: 'done' }))
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { subs: [] }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(toast).not.toHaveBeenCalled()
    })

    it('subtasks_completed: partial subs done does not fire', () => {
      const rule = makeRule('subtasks_completed', act1('notify', { message: 'done' }))
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', {
          subs: [{ id: 's1', done: true }, { id: 's2', done: false }],
        }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(toast).not.toHaveBeenCalled()
    })

    it('tag_added: same tags (no new ones) does not fire', () => {
      const task = { ...TASK, tags: ['bug'] }
      const rule = makeRule(
        { type: 'tag_added', config: {} },
        act1('notify', { message: 'tagged' })
      )
      const { result, toast } = setup([rule], [task])

      act(() => {
        result.current.evaluateTaskChange('t1', { tags: ['bug'] }, task) // same
        vi.advanceTimersByTime(100)
      })

      expect(toast).not.toHaveBeenCalled()
    })

    it('comment_added: same comment count does not fire', () => {
      const task = { ...TASK, comments: [{ text: 'hi' }] }
      const rule = makeRule('comment_added', act1('notify', { message: 'comment' }))
      const { result, toast } = setup([rule], [task])

      act(() => {
        result.current.evaluateTaskChange('t1', { comments: [{ text: 'hi' }] }, task) // same count
        vi.advanceTimersByTime(100)
      })

      expect(toast).not.toHaveBeenCalled()
    })

    it('task_completed: false → false does not fire', () => {
      const rule = makeRule('task_completed', act1('notify', { message: 'done' }))
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { done: false }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(toast).not.toHaveBeenCalled()
    })

    it('prevTask is null: no-op', () => {
      const rule = makeRule('section_change', act1('notify', { message: 'moved' }))
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, null)
        vi.advanceTimersByTime(100)
      })

      expect(toast).not.toHaveBeenCalled()
    })
  })

  // ── Notify template substitution edge cases ────────────────

  describe('notify template substitution', () => {
    it('replaces {task} and {who} in message', () => {
      const rule = makeRule('section_change', act1('notify', {
        message: '{task} assigned to {who}',
      }))
      const { result, toast } = setup([rule])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, TASK)
        vi.advanceTimersByTime(100)
      })

      expect(toast).toHaveBeenCalledWith('Test Task assigned to Alice', 'info')
    })

    it('handles who as empty array in template', () => {
      const task = { ...TASK, who: [] }
      const rule = makeRule('section_change', act1('notify', {
        message: 'By {who}',
      }))
      const { result, toast } = setup([rule], [task])

      act(() => {
        result.current.evaluateTaskChange('t1', { sec: 'Done' }, task)
        vi.advanceTimersByTime(100)
      })

      expect(toast).toHaveBeenCalledWith('By ', 'info')
    })
  })
})
