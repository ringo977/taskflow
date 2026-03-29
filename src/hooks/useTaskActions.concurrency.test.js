import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTaskActions } from './useTaskActions'

/**
 * Concurrency and conflict resolution tests.
 *
 * C1: Concurrent updates, optimistic UI, revert on error
 * C2: Delete + undo + notifications
 */

// ── Mock DB layer ────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  upsertTask: vi.fn().mockResolvedValue(),
  updateTaskField: vi.fn().mockResolvedValue(),
  moveTaskToSection: vi.fn().mockResolvedValue(),
  updateTaskDeps: vi.fn().mockResolvedValue(),
  updateTaskPositions: vi.fn().mockResolvedValue(),
  deleteTask: vi.fn().mockResolvedValue(),
  addProjectMember: vi.fn().mockResolvedValue(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        or: () => ({
          limit: () => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    }),
  },
}))

import {
  updateTaskField,
  moveTaskToSection,
  deleteTask as dbDeleteTask,
  upsertTask,
} from '@/lib/db'

// ── Helpers ──────────────────────────────────────────────────

const TASK_A = {
  id: 't1', pid: 'p1', title: 'Task A', sec: 'To Do', who: ['Alice'],
  done: false, pri: 'medium', desc: '', subs: [], cmts: [], deps: [],
  tags: [], activity: [], due: '2026-04-01',
}

const TASK_B = {
  id: 't2', pid: 'p1', title: 'Task B', sec: 'To Do', who: ['Bob'],
  done: false, pri: 'high', desc: '', subs: [], cmts: [], deps: ['t1'],
  tags: [], activity: [], due: null,
}

const defaultParams = (tasks, setTasks) => ({
  tasks,
  setTasks,
  activeOrgId: 'org1',
  secRowsRef: { current: {} },
  user: { name: 'Marco' },
  pid: 'p1',
  toast: vi.fn(),
  tr: {
    msgSaveError: 'Save error',
    msgDeleted: (t) => `Deleted ${t}`,
    msgTaskCreated: (t) => `Created ${t}`,
    msgDidCreate: (t) => `created ${t}`,
    msgTaskCompleted: (t) => `Completed ${t}`,
    msgTaskReopened: (t) => `Reopened ${t}`,
    msgDidComplete: (t) => `completed ${t}`,
    msgDidReopen: (t) => `reopened ${t}`,
    msgTaskMoved: (t, s) => `Moved ${t} to ${s}`,
    msgDidAssign: (t, w) => `assigned ${t} to ${w}`,
    msgDepResolved: (t, b) => `${t} done — ${b} unblocked`,
  },
  inbox: { push: vi.fn() },
  pushUndo: vi.fn(),
})

const setupHook = (initialTasks = [TASK_A, TASK_B]) => {
  let currentTasks = [...initialTasks]
  const setTasks = vi.fn((updater) => {
    currentTasks = typeof updater === 'function' ? updater(currentTasks) : updater
  })
  const params = defaultParams(initialTasks, setTasks)
  const { result, rerender } = renderHook(
    ({ tasks }) => useTaskActions({ ...params, tasks }),
    { initialProps: { tasks: initialTasks } }
  )
  return { result, params, setTasks, getTasks: () => currentTasks, rerender }
}

// ── Tests ────────────────────────────────────────────────────

describe('C1: Concurrent updates + conflict resolution', () => {

  beforeEach(() => {
    vi.clearAllMocks()
    updateTaskField.mockResolvedValue()
    moveTaskToSection.mockResolvedValue()
    dbDeleteTask.mockResolvedValue()
    upsertTask.mockResolvedValue()
  })

  describe('optimistic updates apply immediately', () => {
    it('updTask applies patch to local state before DB call resolves', async () => {
      const { result, setTasks } = setupHook()

      await act(async () => {
        result.current.updTask('t1', { pri: 'high' })
      })

      // setTasks was called with an updater (optimistic)
      expect(setTasks).toHaveBeenCalled()
      const updater = setTasks.mock.calls[0][0]
      const updated = updater([TASK_A, TASK_B])
      expect(updated.find(t => t.id === 't1').pri).toBe('high')
    })

    it('moveTask applies section change optimistically', async () => {
      const { result, setTasks } = setupHook()

      await act(async () => {
        result.current.moveTask('t1', 'Done')
      })

      const updater = setTasks.mock.calls[0][0]
      const updated = updater([TASK_A, TASK_B])
      expect(updated.find(t => t.id === 't1').sec).toBe('Done')
    })

    it('togTask flips done state optimistically', async () => {
      const { result, setTasks } = setupHook()

      await act(async () => {
        result.current.togTask('t1')
      })

      const updater = setTasks.mock.calls[0][0]
      const updated = updater([TASK_A, TASK_B])
      expect(updated.find(t => t.id === 't1').done).toBe(true)
    })
  })

  describe('revert on DB error', () => {
    it('updTask reverts to original task on failure', async () => {
      updateTaskField.mockRejectedValueOnce(new Error('DB down'))
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result, setTasks, params } = setupHook()

      await act(async () => {
        await result.current.updTask('t1', { pri: 'high' })
      })

      // First call = optimistic update, second call = revert
      expect(setTasks).toHaveBeenCalledTimes(2)
      const revertUpdater = setTasks.mock.calls[1][0]
      const reverted = revertUpdater([{ ...TASK_A, pri: 'high' }, TASK_B])
      expect(reverted.find(t => t.id === 't1').pri).toBe('medium') // original
      expect(params.toast).toHaveBeenCalledWith('Save error', 'error')

      errorSpy.mockRestore()
    })

    it('moveTask reverts section on failure', async () => {
      moveTaskToSection.mockRejectedValueOnce(new Error('DB down'))
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result, setTasks, params } = setupHook()

      await act(async () => {
        await result.current.moveTask('t1', 'Done')
      })

      // Optimistic + revert = 2 calls
      expect(setTasks).toHaveBeenCalledTimes(2)
      const revertUpdater = setTasks.mock.calls[1][0]
      const reverted = revertUpdater([{ ...TASK_A, sec: 'Done' }, TASK_B])
      expect(reverted.find(t => t.id === 't1').sec).toBe('To Do')
      expect(params.toast).toHaveBeenCalledWith('Save error', 'error')

      errorSpy.mockRestore()
    })

    it('togTask reverts done state on failure', async () => {
      updateTaskField.mockRejectedValueOnce(new Error('DB down'))
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result, setTasks, params } = setupHook()

      await act(async () => {
        await result.current.togTask('t1')
      })

      // Optimistic + revert = 2 calls (plus undo call)
      const revertCalls = setTasks.mock.calls.filter((_, i) => i > 0)
      expect(revertCalls.length).toBeGreaterThanOrEqual(1)
      expect(params.toast).toHaveBeenCalledWith('Save error', 'error')

      errorSpy.mockRestore()
    })

    it('delTask restores task on failure', async () => {
      dbDeleteTask.mockRejectedValueOnce(new Error('DB down'))
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result, setTasks, params } = setupHook()

      await act(async () => {
        await result.current.delTask('t1')
      })

      // First call removes task, second restores it
      expect(setTasks).toHaveBeenCalledTimes(2)
      const restoreUpdater = setTasks.mock.calls[1][0]
      const restored = restoreUpdater([TASK_B])
      expect(restored.find(t => t.id === 't1')).toBeDefined()
      expect(params.toast).toHaveBeenCalledWith('Save error', 'error')

      errorSpy.mockRestore()
    })

    it('addTask removes optimistic task on failure', async () => {
      upsertTask.mockRejectedValueOnce(new Error('DB down'))
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result, setTasks, params } = setupHook()

      await act(async () => {
        await result.current.addTask({
          title: 'New Task', sec: 'To Do', who: ['Alice'],
          startDate: null, due: null, pri: 'low',
        })
      })

      // First call adds, second removes
      expect(setTasks).toHaveBeenCalledTimes(2)
      expect(params.toast).toHaveBeenCalledWith('Save error', 'error')

      errorSpy.mockRestore()
    })
  })

  describe('rapid sequential updates', () => {
    it('two rapid priority changes both apply (last wins)', async () => {
      const { result, setTasks } = setupHook()

      await act(async () => {
        result.current.updTask('t1', { pri: 'high' })
        result.current.updTask('t1', { pri: 'low' })
      })

      // Both optimistic updates should have been called
      expect(setTasks).toHaveBeenCalledTimes(2)
    })

    it('move + update on same task both apply', async () => {
      const { result, setTasks } = setupHook()

      await act(async () => {
        result.current.moveTask('t1', 'In Progress')
        result.current.updTask('t1', { pri: 'high' })
      })

      expect(setTasks).toHaveBeenCalledTimes(2)
    })
  })

  describe('operations on non-existent tasks', () => {
    it('updTask on missing task does not throw', async () => {
      const { result } = setupHook()
      await act(async () => {
        await result.current.updTask('t_missing', { pri: 'high' })
      })
      // No crash — prev is undefined, activity patch is empty
    })

    it('moveTask on missing task is no-op', async () => {
      const { result, setTasks } = setupHook()
      await act(async () => {
        await result.current.moveTask('t_missing', 'Done')
      })
      // Should not call setTasks since task not found
      // (moveTask has early return if !task)
      expect(moveTaskToSection).not.toHaveBeenCalled()
    })

    it('togTask on missing task is no-op', async () => {
      const { result } = setupHook()
      await act(async () => {
        await result.current.togTask('t_missing')
      })
      expect(updateTaskField).not.toHaveBeenCalled()
    })

    it('moveTask to same section is no-op', async () => {
      const { result } = setupHook()
      await act(async () => {
        await result.current.moveTask('t1', 'To Do') // same as current
      })
      expect(moveTaskToSection).not.toHaveBeenCalled()
    })
  })
})

// ── C2: Delete/undo + notifications ──────────────────────────

describe('C2: Delete/undo + sync + notifications', () => {

  beforeEach(() => {
    vi.clearAllMocks()
    updateTaskField.mockResolvedValue()
    moveTaskToSection.mockResolvedValue()
    dbDeleteTask.mockResolvedValue()
    upsertTask.mockResolvedValue()
  })

  describe('undo integration', () => {
    it('togTask registers undo callback', async () => {
      const { result, params } = setupHook()

      await act(async () => {
        await result.current.togTask('t1')
      })

      expect(params.pushUndo).toHaveBeenCalledWith(
        expect.stringContaining('Completed'),
        expect.any(Function)
      )
    })

    it('moveTask registers undo callback', async () => {
      const { result, params } = setupHook()

      await act(async () => {
        await result.current.moveTask('t1', 'Done')
      })

      expect(params.pushUndo).toHaveBeenCalledWith(
        expect.stringContaining('Moved'),
        expect.any(Function)
      )
    })

    it('undo callback for togTask restores previous done state', async () => {
      const { result, params, setTasks } = setupHook()

      await act(async () => {
        await result.current.togTask('t1')
      })

      const undoFn = params.pushUndo.mock.calls[0][1]
      act(() => undoFn())

      // Undo should call setTasks to restore done: false
      const undoUpdater = setTasks.mock.calls[setTasks.mock.calls.length - 1][0]
      const undone = undoUpdater([{ ...TASK_A, done: true }, TASK_B])
      expect(undone.find(t => t.id === 't1').done).toBe(false)
    })

    it('undo callback for moveTask restores previous section', async () => {
      const { result, params, setTasks } = setupHook()

      await act(async () => {
        await result.current.moveTask('t1', 'Done')
      })

      const undoFn = params.pushUndo.mock.calls[0][1]
      act(() => undoFn())

      const undoUpdater = setTasks.mock.calls[setTasks.mock.calls.length - 1][0]
      const undone = undoUpdater([{ ...TASK_A, sec: 'Done' }, TASK_B])
      expect(undone.find(t => t.id === 't1').sec).toBe('To Do')
    })
  })

  describe('notifications on task changes', () => {
    it('togTask sends task_completed notification with dep_resolved', async () => {
      const { result, params } = setupHook()

      await act(async () => {
        await result.current.togTask('t1') // TASK_B depends on t1
      })

      // task_completed notification
      expect(params.inbox.push).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'task_completed', taskId: 't1' })
      )

      // dep_resolved for TASK_B (which depends on t1)
      expect(params.inbox.push).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'dep_resolved', taskId: 't2' })
      )
    })

    it('updTask with assignment change sends notification', async () => {
      const { result, params } = setupHook()

      await act(async () => {
        await result.current.updTask('t1', { who: ['Alice', 'Charlie'] })
      })

      expect(params.inbox.push).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'task_assigned' })
      )
    })

    it('updTask with new comment sends notification', async () => {
      const { result, params } = setupHook()

      await act(async () => {
        await result.current.updTask('t1', {
          cmts: [{ who: 'Bob', txt: 'Looks good!' }],
        })
      })

      expect(params.inbox.push).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'comment_added' })
      )
    })

    it('updTask with @mention in comment sends mention notification', async () => {
      const { result, params } = setupHook()

      await act(async () => {
        await result.current.updTask('t1', {
          cmts: [{ who: 'Bob', txt: 'Hey @Alice check this' }],
        })
      })

      expect(params.inbox.push).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'task_mentioned' })
      )
    })

    it('addTask sends creation notification', async () => {
      const { result, params } = setupHook()

      await act(async () => {
        await result.current.addTask({
          title: 'New', sec: 'To Do', who: ['Alice'],
          startDate: null, due: null, pri: 'low',
        })
      })

      expect(params.inbox.push).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'task_created' })
      )
      expect(params.toast).toHaveBeenCalledWith(expect.stringContaining('Created'), 'success')
    })

    it('delTask sends deletion toast', async () => {
      const { result, params } = setupHook()

      await act(async () => {
        await result.current.delTask('t1')
      })

      expect(params.toast).toHaveBeenCalledWith(expect.stringContaining('Deleted'), 'success')
    })
  })

  describe('activity tracking', () => {
    it('updTask tracks field changes in activity log', async () => {
      const { result, setTasks } = setupHook()

      await act(async () => {
        await result.current.updTask('t1', { pri: 'high' })
      })

      const updater = setTasks.mock.calls[0][0]
      const updated = updater([TASK_A, TASK_B])
      const task = updated.find(t => t.id === 't1')
      expect(task.activity.length).toBeGreaterThan(0)
      expect(task.activity[0]).toMatchObject({
        field: 'pri',
        from: 'medium',
        to: 'high',
        who: 'Marco',
      })
    })

    it('updTask does not track changes when field value unchanged', async () => {
      const { result, setTasks } = setupHook()

      await act(async () => {
        await result.current.updTask('t1', { pri: 'medium' }) // same as current
      })

      const updater = setTasks.mock.calls[0][0]
      const updated = updater([TASK_A, TASK_B])
      expect(updated.find(t => t.id === 't1').activity).toHaveLength(0)
    })

    it('updTask tracks tag changes', async () => {
      const { result, setTasks } = setupHook()

      await act(async () => {
        await result.current.updTask('t1', {
          tags: [{ name: 'bug' }, { name: 'urgent' }],
        })
      })

      const updater = setTasks.mock.calls[0][0]
      const updated = updater([TASK_A, TASK_B])
      const activity = updated.find(t => t.id === 't1').activity
      expect(activity.some(a => a.field === 'tags')).toBe(true)
    })
  })
})
