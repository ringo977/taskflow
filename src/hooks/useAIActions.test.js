import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAIActions } from './useAIActions'

// Mock dependencies
vi.mock('@/utils/logger', () => ({
  logger: vi.fn(() => ({
    error: vi.fn(),
  })),
}))

vi.mock('@/utils/ai', () => ({
  generateSubtasks: vi.fn(),
  createTaskFromText: vi.fn(),
  summariseProject: vi.fn(),
  AI_ERROR_MESSAGES: {
    'QUOTA_EXCEEDED': 'API quota exceeded',
    'INVALID_INPUT': 'Invalid input provided',
  },
}))

import * as aiUtils from '@/utils/ai'

describe('useAIActions', () => {
  let mockSetAiLoad, mockSetSummary, mockSetShowSum, mockSetShowAdd
  let mockUpdTask, mockAddTask, mockToast
  let mockTr, mockLang
  let defaultProps

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()

    // Mock state setters
    mockSetAiLoad = vi.fn()
    mockSetSummary = vi.fn()
    mockSetShowSum = vi.fn()
    mockSetShowAdd = vi.fn()

    // Mock action functions
    mockUpdTask = vi.fn().mockResolvedValue(undefined)
    mockAddTask = vi.fn().mockResolvedValue(undefined)
    mockToast = vi.fn()

    // Mock translation object
    mockTr = {
      msgSubsGenerated: vi.fn((count) => `${count} subtasks generated`),
      msgAIError: 'An error occurred with AI',
    }

    mockLang = 'en'

    defaultProps = {
      setAiLoad: mockSetAiLoad,
      setSummary: mockSetSummary,
      setShowSum: mockSetShowSum,
      setShowAdd: mockSetShowAdd,
      updTask: mockUpdTask,
      addTask: mockAddTask,
      toast: mockToast,
      tr: mockTr,
      lang: mockLang,
    }
  })

  describe('genSubs', () => {
    it('sets aiLoad true, calls generateSubtasks, appends to existing subs, calls updTask, toasts success, sets aiLoad false', async () => {
      vi.setSystemTime(new Date('2026-04-03T12:00:00Z'))

      const mockTask = {
        id: 'task1',
        subs: [
          { id: 'sub1', t: 'existing subtask', done: false },
        ],
      }

      const generatedSubs = ['New sub 1', 'New sub 2']
      vi.mocked(aiUtils.generateSubtasks).mockResolvedValue(generatedSubs)

      const { result } = renderHook(() => useAIActions(defaultProps))

      await act(async () => {
        await result.current.genSubs(mockTask)
      })

      // Verify aiLoad was set to true
      expect(mockSetAiLoad).toHaveBeenCalledWith(true)

      // Verify generateSubtasks was called with task
      expect(aiUtils.generateSubtasks).toHaveBeenCalledWith(mockTask)

      // Verify updTask was called with existing + new subs
      expect(mockUpdTask).toHaveBeenCalledWith('task1', {
        subs: expect.arrayContaining([
          { id: 'sub1', t: 'existing subtask', done: false },
          { id: expect.stringContaining('ai'), t: 'New sub 1', done: false },
          { id: expect.stringContaining('ai'), t: 'New sub 2', done: false },
        ]),
      })

      // Verify toast was called with success
      expect(mockToast).toHaveBeenCalledWith('2 subtasks generated', 'success')

      // Verify aiLoad was set to false
      expect(mockSetAiLoad).toHaveBeenCalledWith(false)
    })

    it('toasts error message and sets aiLoad false on error', async () => {
      const mockTask = { id: 'task1', subs: [] }
      const error = new Error('API failed')

      vi.mocked(aiUtils.generateSubtasks).mockRejectedValue(error)

      const { result } = renderHook(() => useAIActions(defaultProps))

      await act(async () => {
        await result.current.genSubs(mockTask)
      })

      // Verify error toast was called
      expect(mockToast).toHaveBeenCalledWith('An error occurred with AI', 'error')

      // Verify aiLoad was set to false
      expect(mockSetAiLoad).toHaveBeenLastCalledWith(false)

      // Verify updTask was not called
      expect(mockUpdTask).not.toHaveBeenCalled()
    })

    it('uses AI_ERROR_MESSAGES lookup when error has code', async () => {
      const mockTask = { id: 'task1', subs: [] }
      const error = new Error('Quota exceeded')
      error.code = 'QUOTA_EXCEEDED'

      vi.mocked(aiUtils.generateSubtasks).mockRejectedValue(error)

      const { result } = renderHook(() => useAIActions(defaultProps))

      await act(async () => {
        await result.current.genSubs(mockTask)
      })

      // Verify error toast uses AI_ERROR_MESSAGES
      expect(mockToast).toHaveBeenCalledWith('API quota exceeded', 'error')
    })
  })

  describe('aiCreate', () => {
    it('calls createTaskFromText, calls addTask with parsed info, closes modal', async () => {
      const mockInfo = {
        title: 'New Task from AI',
        pri: 'high',
      }

      vi.mocked(aiUtils.createTaskFromText).mockResolvedValue(mockInfo)

      const { result } = renderHook(() => useAIActions(defaultProps))

      await act(async () => {
        await result.current.aiCreate(
          'Buy groceries high priority',
          'shopping',
          'john',
          '2026-04-05',
          '2026-04-06'
        )
      })

      // Verify createTaskFromText was called
      expect(aiUtils.createTaskFromText).toHaveBeenCalledWith(
        'Buy groceries high priority'
      )

      // Verify addTask was called with correct params
      expect(mockAddTask).toHaveBeenCalledWith({
        title: 'New Task from AI',
        sec: 'shopping',
        who: 'john',
        startDate: '2026-04-05',
        due: '2026-04-06',
        pri: 'high',
      })

      // Verify modal was closed
      expect(mockSetShowAdd).toHaveBeenCalledWith(false)

      // Verify aiLoad was toggled
      expect(mockSetAiLoad).toHaveBeenNthCalledWith(1, true)
      expect(mockSetAiLoad).toHaveBeenNthCalledWith(2, false)
    })

    it('defaults priority to "medium" when not provided', async () => {
      const mockInfo = {
        title: 'Another Task',
        // no pri field
      }

      vi.mocked(aiUtils.createTaskFromText).mockResolvedValue(mockInfo)

      const { result } = renderHook(() => useAIActions(defaultProps))

      await act(async () => {
        await result.current.aiCreate(
          'Do something',
          'work',
          'alice',
          null,
          null
        )
      })

      // Verify addTask uses default priority
      expect(mockAddTask).toHaveBeenCalledWith(
        expect.objectContaining({
          pri: 'medium',
        })
      )
    })

    it('handles null startDate correctly', async () => {
      const mockInfo = {
        title: 'Task with no start',
        pri: 'low',
      }

      vi.mocked(aiUtils.createTaskFromText).mockResolvedValue(mockInfo)

      const { result } = renderHook(() => useAIActions(defaultProps))

      await act(async () => {
        await result.current.aiCreate(
          'Do something',
          'work',
          'alice',
          null,
          '2026-04-10'
        )
      })

      // Verify startDate is null
      expect(mockAddTask).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: null,
        })
      )
    })

    it('toasts error and sets aiLoad false on error', async () => {
      const error = new Error('AI service down')

      vi.mocked(aiUtils.createTaskFromText).mockRejectedValue(error)

      const { result } = renderHook(() => useAIActions(defaultProps))

      await act(async () => {
        await result.current.aiCreate(
          'Any text',
          'sec',
          'who',
          null,
          null
        )
      })

      // Verify error toast was called
      expect(mockToast).toHaveBeenCalledWith('An error occurred with AI', 'error')

      // Verify modal was not closed
      expect(mockSetShowAdd).not.toHaveBeenCalled()

      // Verify aiLoad was set to false
      expect(mockSetAiLoad).toHaveBeenLastCalledWith(false)
    })

    it('uses AI_ERROR_MESSAGES lookup when error has code', async () => {
      const error = new Error('Invalid input')
      error.code = 'INVALID_INPUT'

      vi.mocked(aiUtils.createTaskFromText).mockRejectedValue(error)

      const { result } = renderHook(() => useAIActions(defaultProps))

      await act(async () => {
        await result.current.aiCreate('text', 'sec', 'who', null, null)
      })

      // Verify error toast uses AI_ERROR_MESSAGES
      expect(mockToast).toHaveBeenCalledWith('Invalid input provided', 'error')
    })
  })

  describe('getSum', () => {
    it('shows panel, sets summary null, calls summariseProject, sets result', async () => {
      const mockSummaryText = 'Project summary: 5 tasks, 3 completed'
      vi.mocked(aiUtils.summariseProject).mockResolvedValue(mockSummaryText)

      const { result } = renderHook(() => useAIActions(defaultProps))

      const projectName = 'My Project'
      const projectTasks = [
        { id: '1', title: 'Task 1' },
        { id: '2', title: 'Task 2' },
      ]

      await act(async () => {
        await result.current.getSum(projectName, projectTasks)
      })

      // Verify setShowSum was called to show panel
      expect(mockSetShowSum).toHaveBeenCalledWith(true)

      // Verify setSummary was called with null initially
      expect(mockSetSummary).toHaveBeenNthCalledWith(1, null)

      // Verify summariseProject was called with correct params
      expect(aiUtils.summariseProject).toHaveBeenCalledWith(
        projectName,
        projectTasks,
        mockLang
      )

      // Verify setSummary was called with result
      expect(mockSetSummary).toHaveBeenNthCalledWith(2, mockSummaryText)

      // Verify aiLoad was set to false
      expect(mockSetAiLoad).toHaveBeenLastCalledWith(false)
    })

    it('sets summary to "Error." and sets aiLoad false on error', async () => {
      const error = new Error('Summarisation failed')
      vi.mocked(aiUtils.summariseProject).mockRejectedValue(error)

      const { result } = renderHook(() => useAIActions(defaultProps))

      await act(async () => {
        await result.current.getSum('Project', [])
      })

      // Verify setSummary was called with error message
      expect(mockSetSummary).toHaveBeenNthCalledWith(2, 'Error.')

      // Verify aiLoad was set to false
      expect(mockSetAiLoad).toHaveBeenLastCalledWith(false)

      // Verify no toast was called (error handling is silent)
      expect(mockToast).not.toHaveBeenCalled()
    })

    it('respects language parameter', async () => {
      const { result } = renderHook(() =>
        useAIActions({
          ...defaultProps,
          lang: 'it',
        })
      )

      vi.mocked(aiUtils.summariseProject).mockResolvedValue('Riassunto')

      await act(async () => {
        await result.current.getSum('Project', [])
      })

      // Verify summariseProject was called with correct language
      expect(aiUtils.summariseProject).toHaveBeenCalledWith(
        'Project',
        [],
        'it'
      )
    })
  })

  describe('hook initialization', () => {
    it('returns all three functions', () => {
      const { result } = renderHook(() => useAIActions(defaultProps))

      expect(result.current).toHaveProperty('genSubs')
      expect(result.current).toHaveProperty('aiCreate')
      expect(result.current).toHaveProperty('getSum')

      expect(typeof result.current.genSubs).toBe('function')
      expect(typeof result.current.aiCreate).toBe('function')
      expect(typeof result.current.getSum).toBe('function')
    })
  })
})
