import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTaskActions } from './useTaskActions'

// ── Mock @/lib/db ────────────────────────────────────────────
vi.mock('@/lib/db', () => ({
  upsertTask: vi.fn().mockResolvedValue(),
  updateTaskField: vi.fn().mockResolvedValue(),
  moveTaskToSection: vi.fn().mockResolvedValue(),
  updateTaskDeps: vi.fn().mockResolvedValue(),
  updateTaskPositions: vi.fn().mockResolvedValue(),
  deleteTask: vi.fn().mockResolvedValue(),
  addProjectMember: vi.fn().mockResolvedValue(),
}))

// ── Mock @/lib/supabase ──────────────────────────────────────
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
  upsertTask,
  updateTaskField,
  moveTaskToSection,
  deleteTask as dbDeleteTask,
} from '@/lib/db'

// ── Helpers ──────────────────────────────────────────────────

const TASK_A = {
  id: 't1', pid: 'p1', title: 'Task A', sec: 'To Do', who: 'Alice',
  done: false, pri: 'medium', desc: '', subs: [], cmts: [], deps: [],
  tags: [], activity: [],
}

const TASK_B = {
  id: 't2', pid: 'p1', title: 'Task B', sec: 'To Do', who: 'Bob',
  done: false, pri: 'high', desc: '', subs: [], cmts: [], deps: [],
  tags: [], activity: [],
}

function makeParams(tasksInit = [TASK_A, TASK_B]) {
  // Use a mutable ref so setTasks can be tracked
  const state = { tasks: [...tasksInit] }
  const setTasks = vi.fn((updater) => {
    state.tasks = typeof updater === 'function' ? updater(state.tasks) : updater
  })
  const toast = vi.fn()
  const pushUndo = vi.fn()
  const inbox = { push: vi.fn() }
  const secRowsRef = { current: [{ id: 's1', name: 'To Do' }, { id: 's2', name: 'Done' }] }
  const tr = {
    msgSaveError: 'Save error',
    msgTaskCreated: (t) => `Created ${t}`,
    msgTaskCompleted: (t) => `Completed ${t}`,
    msgTaskReopened: (t) => `Reopened ${t}`,
    msgTaskMoved: (t, s) => `Moved ${t} to ${s}`,
    msgDeleted: (t) => `Deleted ${t}`,
    msgDidComplete: (t) => `did complete ${t}`,
    msgDidReopen: (t) => `did reopen ${t}`,
    msgDidCreate: (t) => `did create ${t}`,
  }
  const user = { id: 'u1', name: 'Marco' }

  return {
    get tasks() { return state.tasks },
    setTasks,
    activeOrgId: 'org1',
    secRowsRef,
    user,
    pid: 'p1',
    toast,
    tr,
    inbox,
    pushUndo,
    // expose state for assertions
    _state: state,
  }
}

// ── Tests ────────────────────────────────────────────────────

describe('useTaskActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── updTask ──────────────────────────────────────────────

  describe('updTask', () => {
    it('applies optimistic update and persists via updateTaskField', async () => {
      const params = makeParams()
      const { result } = renderHook(() => useTaskActions(params))

      await act(async () => {
        await result.current.updTask('t1', { title: 'Updated' })
      })

      // setTasks called with optimistic patch
      expect(params.setTasks).toHaveBeenCalled()
      const updater = params.setTasks.mock.calls[0][0]
      const patched = updater([TASK_A, TASK_B])
      expect(patched[0].title).toBe('Updated')
      expect(patched[1]).toEqual(TASK_B)

      // DB persistence called
      expect(updateTaskField).toHaveBeenCalledWith('org1', 't1', expect.objectContaining({ title: 'Updated' }))
    })

    it('tracks activity entries for changed fields', async () => {
      const params = makeParams()
      const { result } = renderHook(() => useTaskActions(params))

      await act(async () => {
        await result.current.updTask('t1', { pri: 'high' })
      })

      const updater = params.setTasks.mock.calls[0][0]
      const patched = updater([TASK_A])
      // Should have activity entry tracking pri change
      expect(patched[0].activity.length).toBe(1)
      expect(patched[0].activity[0].field).toBe('pri')
      expect(patched[0].activity[0].from).toBe('medium')
      expect(patched[0].activity[0].to).toBe('high')
    })

    it('reverts on DB error and shows toast', async () => {
      updateTaskField.mockRejectedValueOnce(new Error('DB down'))
      const params = makeParams()
      const { result } = renderHook(() => useTaskActions(params))

      await act(async () => {
        await result.current.updTask('t1', { title: 'Fail' })
      })

      // Two setTasks calls: optimistic + revert
      expect(params.setTasks).toHaveBeenCalledTimes(2)
      // Toast shows error
      expect(params.toast).toHaveBeenCalledWith('Save error', 'error')
    })

    it('uses updateTaskDeps when deps are in patch', async () => {
      const { updateTaskDeps } = await import('@/lib/db')
      const params = makeParams()
      const { result } = renderHook(() => useTaskActions(params))

      await act(async () => {
        await result.current.updTask('t1', { deps: ['t2'] })
      })

      expect(updateTaskDeps).toHaveBeenCalledWith('org1', 't1', ['t2'])
    })
  })

  // ── togTask ──────────────────────────────────────────────

  describe('togTask', () => {
    it('toggles done state optimistically and persists', async () => {
      const params = makeParams()
      const { result } = renderHook(() => useTaskActions(params))

      await act(async () => {
        await result.current.togTask('t1')
      })

      // Optimistic: done flipped to true
      const updater = params.setTasks.mock.calls[0][0]
      const patched = updater([TASK_A])
      expect(patched[0].done).toBe(true)

      // Persisted
      expect(updateTaskField).toHaveBeenCalledWith('org1', 't1', { done: true })

      // Undo registered
      expect(params.pushUndo).toHaveBeenCalled()

      // Inbox notified
      expect(params.inbox.push).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'task_completed', taskId: 't1' })
      )
    })

    it('reverts on DB error', async () => {
      updateTaskField.mockRejectedValueOnce(new Error('fail'))
      const params = makeParams()
      const { result } = renderHook(() => useTaskActions(params))

      await act(async () => {
        await result.current.togTask('t1')
      })

      // optimistic + revert = 2 calls
      expect(params.setTasks).toHaveBeenCalledTimes(2)
      expect(params.toast).toHaveBeenCalledWith('Save error', 'error')
    })

    it('does nothing for unknown task ID', async () => {
      const params = makeParams()
      const { result } = renderHook(() => useTaskActions(params))

      await act(async () => {
        await result.current.togTask('nonexistent')
      })

      expect(params.setTasks).not.toHaveBeenCalled()
      expect(updateTaskField).not.toHaveBeenCalled()
    })
  })

  // ── moveTask ──────────────────────────────────────────────

  describe('moveTask', () => {
    it('moves task to new section optimistically and persists', async () => {
      const params = makeParams()
      const { result } = renderHook(() => useTaskActions(params))

      await act(async () => {
        await result.current.moveTask('t1', 'Done')
      })

      const updater = params.setTasks.mock.calls[0][0]
      const patched = updater([TASK_A])
      expect(patched[0].sec).toBe('Done')

      expect(moveTaskToSection).toHaveBeenCalledWith('org1', 't1', 'Done', 'p1', expect.any(Array))
      expect(params.pushUndo).toHaveBeenCalled()
    })

    it('skips if task already in target section', async () => {
      const params = makeParams()
      const { result } = renderHook(() => useTaskActions(params))

      await act(async () => {
        await result.current.moveTask('t1', 'To Do') // same section
      })

      expect(params.setTasks).not.toHaveBeenCalled()
      expect(moveTaskToSection).not.toHaveBeenCalled()
    })

    it('reverts on DB error', async () => {
      moveTaskToSection.mockRejectedValueOnce(new Error('fail'))
      const params = makeParams()
      const { result } = renderHook(() => useTaskActions(params))

      await act(async () => {
        await result.current.moveTask('t1', 'Done')
      })

      expect(params.setTasks).toHaveBeenCalledTimes(2) // optimistic + revert
      expect(params.toast).toHaveBeenCalledWith('Save error', 'error')
    })
  })

  // ── addTask ──────────────────────────────────────────────

  describe('addTask', () => {
    it('adds task optimistically, persists, and notifies', async () => {
      const params = makeParams([])
      const { result } = renderHook(() => useTaskActions(params))

      await act(async () => {
        await result.current.addTask({
          title: 'New Task', sec: 'To Do', who: 'Marco',
          startDate: null, due: '2026-04-01', pri: 'high',
        })
      })

      // Optimistic add
      const updater = params.setTasks.mock.calls[0][0]
      const patched = updater([])
      expect(patched).toHaveLength(1)
      expect(patched[0].title).toBe('New Task')
      expect(patched[0].pid).toBe('p1')

      // Persisted
      expect(upsertTask).toHaveBeenCalledWith('org1', expect.objectContaining({ title: 'New Task' }), expect.any(Array))

      // Toast + inbox
      expect(params.toast).toHaveBeenCalledWith('Created New Task', 'success')
      expect(params.inbox.push).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'task_created' })
      )
    })

    it('reverts on DB error', async () => {
      upsertTask.mockRejectedValueOnce(new Error('fail'))
      const params = makeParams([])
      const { result } = renderHook(() => useTaskActions(params))

      await act(async () => {
        await result.current.addTask({
          title: 'Fail Task', sec: 'To Do', who: 'Marco',
          startDate: null, due: '', pri: 'medium',
        })
      })

      // optimistic add + revert remove
      expect(params.setTasks).toHaveBeenCalledTimes(2)
      expect(params.toast).toHaveBeenCalledWith('Save error', 'error')
    })
  })

  // ── delTask ──────────────────────────────────────────────

  describe('delTask', () => {
    it('removes task optimistically, persists, and shows toast', async () => {
      const params = makeParams()
      const { result } = renderHook(() => useTaskActions(params))

      await act(async () => {
        await result.current.delTask('t1')
      })

      // Optimistic remove
      const updater = params.setTasks.mock.calls[0][0]
      const patched = updater([TASK_A, TASK_B])
      expect(patched).toHaveLength(1)
      expect(patched[0].id).toBe('t2')

      expect(dbDeleteTask).toHaveBeenCalledWith('org1', 't1')
      expect(params.toast).toHaveBeenCalledWith('Deleted Task A', 'success')
    })

    it('reverts on DB error', async () => {
      dbDeleteTask.mockRejectedValueOnce(new Error('fail'))
      const params = makeParams()
      const { result } = renderHook(() => useTaskActions(params))

      await act(async () => {
        await result.current.delTask('t1')
      })

      expect(params.setTasks).toHaveBeenCalledTimes(2)
      expect(params.toast).toHaveBeenCalledWith('Save error', 'error')
    })
  })

  // ── reorderTask ──────────────────────────────────────────

  describe('reorderTask', () => {
    it('reorders tasks within a section and persists positions', async () => {
      const { updateTaskPositions } = await import('@/lib/db')
      const params = makeParams()
      const { result } = renderHook(() => useTaskActions(params))

      act(() => {
        result.current.reorderTask('t2', 'To Do', 0)
      })

      expect(params.setTasks).toHaveBeenCalled()
      // updateTaskPositions called with new positions
      expect(updateTaskPositions).toHaveBeenCalled()
    })
  })
})
