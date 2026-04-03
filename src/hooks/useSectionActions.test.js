import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ── Mocks ────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  upsertSections: vi.fn().mockResolvedValue(),
  fetchSectionRows: vi.fn().mockResolvedValue([
    { id: 's1', name: 'To Do', project_id: 'p1' },
    { id: 's2', name: 'In Progress', project_id: 'p1' },
    { id: 's3', name: 'Done', project_id: 'p1' },
  ]),
}))

vi.mock('@/utils/logger', () => {
  const loggerMock = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  }
  return {
    logger: () => loggerMock,
    __loggerMock: loggerMock, // Export for test access
  }
})

import { useSectionActions } from './useSectionActions'
import { upsertSections, fetchSectionRows } from '@/lib/db'
import * as loggerModule from '@/utils/logger'

// ── Helpers ──────────────────────────────────────────────────

function makeParams({
  secs = { p1: ['To Do', 'Done'] },
  pid = 'p1',
  activeOrgId = 'org1',
} = {}) {
  const state = { secs: { ...secs } }

  const setSecs = vi.fn((u) => {
    state.secs = typeof u === 'function' ? u(state.secs) : u
  })
  const toast = vi.fn()
  const secRowsRef = { current: [] }

  return {
    get secs() { return state.secs },
    setSecs,
    pid,
    activeOrgId,
    secRowsRef,
    toast,
    _state: state,
  }
}

// ── Tests ────────────────────────────────────────────────────

describe('useSectionActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleUpdateSecs', () => {
    it('optimistically updates state via setSecs with updater function', async () => {
      const params = makeParams()
      const { result } = renderHook(() => useSectionActions(params))

      const newNames = ['Backlog', 'To Do', 'In Progress', 'Done']

      await act(async () => {
        await result.current.handleUpdateSecs(newNames)
      })

      // Verify setSecs was called
      expect(params.setSecs).toHaveBeenCalled()

      // Verify it received an updater function (not a direct value)
      const setSectionCall = params.setSecs.mock.calls[0]
      expect(typeof setSectionCall[0]).toBe('function')

      // Verify the updater function correctly merges sections
      const updater = setSectionCall[0]
      const previousState = { p1: ['To Do', 'Done'], p2: ['To Do', 'In Progress'] }
      const newState = updater(previousState)
      expect(newState).toEqual({
        p1: newNames,
        p2: ['To Do', 'In Progress'],
      })
    })

    it('calls upsertSections with correct arguments', async () => {
      const params = makeParams({ activeOrgId: 'org-test', pid: 'proj-123' })
      const { result } = renderHook(() => useSectionActions(params))

      const newNames = ['Section A', 'Section B', 'Section C']

      await act(async () => {
        await result.current.handleUpdateSecs(newNames)
      })

      expect(upsertSections).toHaveBeenCalledWith('org-test', 'proj-123', newNames)
    })

    it('calls fetchSectionRows and updates secRowsRef', async () => {
      const params = makeParams()
      const mockSectionRows = [
        { id: 's1', name: 'Backlog' },
        { id: 's2', name: 'To Do' },
        { id: 's3', name: 'Done' },
      ]
      fetchSectionRows.mockResolvedValue(mockSectionRows)

      const { result } = renderHook(() => useSectionActions(params))

      await act(async () => {
        await result.current.handleUpdateSecs(['Backlog', 'To Do', 'Done'])
      })

      expect(fetchSectionRows).toHaveBeenCalledWith('org1')
      expect(params.secRowsRef.current).toEqual(mockSectionRows)
    })

    it('calls toast with error message on DB error', async () => {
      const params = makeParams()
      const dbError = new Error('Database connection failed')
      upsertSections.mockRejectedValueOnce(dbError)

      const { result } = renderHook(() => useSectionActions(params))

      await act(async () => {
        await result.current.handleUpdateSecs(['New Section'])
      })

      expect(params.toast).toHaveBeenCalledWith('Section update failed', 'error')
    })

    it('does not throw when toast is undefined and error occurs', async () => {
      const params = makeParams({ secs: { p1: ['To Do'] } })
      params.toast = undefined

      const dbError = new Error('Network error')
      upsertSections.mockRejectedValueOnce(dbError)

      const { result } = renderHook(() => useSectionActions(params))

      // Should not throw
      await expect(
        act(async () => {
          await result.current.handleUpdateSecs(['Section 1'])
        })
      ).resolves.not.toThrow()
    })

    it('logs error when DB operation fails', async () => {
      const params = makeParams()
      const dbError = new Error('Upsert failed')
      upsertSections.mockRejectedValueOnce(dbError)

      const { result } = renderHook(() => useSectionActions(params))

      await act(async () => {
        await result.current.handleUpdateSecs(['Updated'])
      })

      // Access the logger mock through the module
      const logMock = loggerModule.__loggerMock
      expect(logMock.error).toHaveBeenCalledWith('updateSecs failed:', dbError)
    })

    it('still updates state optimistically even if DB fails', async () => {
      const params = makeParams({ secs: { p1: ['To Do', 'Done'] } })
      upsertSections.mockRejectedValueOnce(new Error('DB error'))

      const { result } = renderHook(() => useSectionActions(params))
      const newNames = ['Backlog', 'To Do', 'In Progress', 'Done']

      await act(async () => {
        await result.current.handleUpdateSecs(newNames)
      })

      // State should still be updated optimistically
      expect(params.setSecs).toHaveBeenCalled()
      expect(params._state.secs.p1).toEqual(newNames)
    })

    it('handles successful operation with all dependencies', async () => {
      const mockRows = [
        { id: 's1', name: 'Backlog' },
        { id: 's2', name: 'Done' },
      ]
      fetchSectionRows.mockResolvedValue(mockRows)

      const params = makeParams({
        activeOrgId: 'org-prod',
        pid: 'proj-456',
        secs: { 'proj-456': ['To Do'] },
      })

      const { result } = renderHook(() => useSectionActions(params))
      const newNames = ['Backlog', 'Done']

      await act(async () => {
        await result.current.handleUpdateSecs(newNames)
      })

      // All operations should complete successfully
      expect(params.setSecs).toHaveBeenCalled()
      expect(upsertSections).toHaveBeenCalledWith('org-prod', 'proj-456', newNames)
      expect(fetchSectionRows).toHaveBeenCalledWith('org-prod')
      expect(params.secRowsRef.current).toEqual(mockRows)
      expect(params.toast).not.toHaveBeenCalled() // No error toast
    })
  })

  describe('hook return value', () => {
    it('returns object with handleUpdateSecs function', () => {
      const params = makeParams()
      const { result } = renderHook(() => useSectionActions(params))

      expect(result.current).toHaveProperty('handleUpdateSecs')
      expect(typeof result.current.handleUpdateSecs).toBe('function')
    })

    it('memoizes handleUpdateSecs based on dependencies', async () => {
      const params = makeParams()
      const { result, rerender } = renderHook(
        (p) => useSectionActions(p),
        { initialProps: params }
      )

      const fn1 = result.current.handleUpdateSecs

      rerender(params)
      const fn2 = result.current.handleUpdateSecs

      // Same props should return same memoized function
      expect(fn1).toBe(fn2)
    })

    it('creates new handleUpdateSecs when dependencies change', async () => {
      const params1 = makeParams({ pid: 'p1' })
      const { result, rerender } = renderHook(
        (p) => useSectionActions(p),
        { initialProps: params1 }
      )

      const fn1 = result.current.handleUpdateSecs

      // Change a dependency (pid)
      const params2 = makeParams({ pid: 'p2' })
      rerender(params2)
      const fn2 = result.current.handleUpdateSecs

      // Different props should create new function
      expect(fn1).not.toBe(fn2)
    })
  })
})
