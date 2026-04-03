import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useUIState } from './useUIState'

// ── Mock react-router-dom ─────────────────────────────────────
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(),
    useLocation: vi.fn(),
  }
})

// ── Mock @/utils/routing ──────────────────────────────────────
vi.mock('@/utils/routing', () => ({
  parseRoute: vi.fn((pathname) => {
    if (pathname === '/projects/p1/board') {
      return { nav: 'projects', pid: 'p1', view: 'board', taskId: null }
    }
    if (pathname === '/projects/p1/board/task123') {
      return { nav: 'projects', pid: 'p1', view: 'board', taskId: 'task123' }
    }
    if (pathname === '/home') {
      return { nav: 'home', pid: null, view: null, taskId: null }
    }
    // default parsing
    const s = pathname.split('/').filter(Boolean)
    return { nav: s[0] || 'home', pid: s[1] || null, view: s[2] || null, taskId: s[3] || null }
  }),
  buildPath: vi.fn((nav, pid, view, taskId) => {
    if (nav === 'home') return taskId ? `/home/-/-/${taskId}` : '/'
    if ((nav === 'projects' || nav === 'portfolios') && pid) {
      let p = `/${nav}/${pid}`
      if (view) p += `/${view}`
      if (taskId) p += `/${taskId}`
      return p
    }
    return taskId ? `/${nav}/-/-/${taskId}` : `/${nav}`
  }),
}))

// ── Mock @/constants ──────────────────────────────────────────
vi.mock('@/constants', () => ({
  EMPTY_FILTERS: { q: '', pri: 'all', who: 'all', due: 'all', done: 'all', tag: 'all' },
  seedFor: vi.fn((orgId) => ({ projs: [] })),
  oget: vi.fn((obj, key, fallback) => fallback),
}))

import { useNavigate, useLocation } from 'react-router-dom'
import { parseRoute, buildPath } from '@/utils/routing'
import { EMPTY_FILTERS, seedFor, oget } from '@/constants'

// ── Setup ─────────────────────────────────────────────────────
function setupMocks(initialPathname = '/projects/p1/board') {
  const navigateMock = vi.fn()
  useNavigate.mockReturnValue(navigateMock)

  useLocation.mockReturnValue({
    pathname: initialPathname,
    search: '',
    hash: '',
    state: null,
  })

  return { navigateMock }
}

function renderUIStateHook(activeOrgId = { id: 'org1' }, initialPathname = '/projects/p1/board') {
  setupMocks(initialPathname)

  const wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>

  return renderHook(() => useUIState({ activeOrgId }), { wrapper })
}

// ── Tests ─────────────────────────────────────────────────────

describe('useUIState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Test 1: Initial state from parsed route
  describe('Initial state from parsed route', () => {
    it('should initialize state from parsed route', () => {
      const { result } = renderUIStateHook(undefined, '/projects/p1/board')

      expect(result.current.nav).toBe('projects')
      expect(result.current.pid).toBe('p1')
      expect(result.current.view).toBe('board')
      expect(result.current.selId).toBe(null)
    })

    it('should initialize with default values for missing route params', () => {
      const { result } = renderUIStateHook(undefined, '/home')

      expect(result.current.nav).toBe('home')
      expect(result.current.pid).toBe('') // defaults to empty string
      expect(result.current.view).toBe('board') // default view
      expect(result.current.selId).toBe(null)
    })

    it('should initialize selId from route taskId', () => {
      const { result } = renderUIStateHook(undefined, '/projects/p1/board/task123')

      expect(result.current.selId).toBe('task123')
    })

    it('should initialize all UI states to defaults', () => {
      const { result } = renderUIStateHook()

      expect(result.current.showAdd).toBe(false)
      expect(result.current.addDue).toBe('')
      expect(result.current.aiLoad).toBe(false)
      expect(result.current.summary).toBe(null)
      expect(result.current.showSum).toBe(false)
      expect(result.current.filters).toEqual(EMPTY_FILTERS)
      expect(result.current.showCmdK).toBe(false)
      expect(result.current.mobileSidebar).toBe(false)
      expect(result.current.showNewProj).toBe(false)
    })
  })

  // Test 2: selProj(id) sets pid, nav to 'projects', clears selId
  describe('selProj helper', () => {
    it('should set pid, nav to projects, and clear selId', () => {
      const { result } = renderUIStateHook()

      act(() => {
        result.current.selProj('p2')
      })

      expect(result.current.pid).toBe('p2')
      expect(result.current.nav).toBe('projects')
      expect(result.current.selId).toBe(null)
    })

    it('should work multiple times with different project IDs', () => {
      const { result } = renderUIStateHook()

      act(() => {
        result.current.selProj('p1')
      })
      expect(result.current.pid).toBe('p1')

      act(() => {
        result.current.selProj('p2')
      })
      expect(result.current.pid).toBe('p2')
      expect(result.current.nav).toBe('projects')
    })
  })

  // Test 3: goNav(n) sets nav, clears selId
  describe('goNav helper', () => {
    it('should set nav and clear selId', () => {
      const { result } = renderUIStateHook()

      act(() => {
        result.current.setSelId('task1')
      })
      expect(result.current.selId).toBe('task1')

      act(() => {
        result.current.goNav('home')
      })

      expect(result.current.nav).toBe('home')
      expect(result.current.selId).toBe(null)
    })

    it('should navigate to different sections', () => {
      const { result } = renderUIStateHook()

      act(() => {
        result.current.goNav('portfolios')
      })
      expect(result.current.nav).toBe('portfolios')

      act(() => {
        result.current.goNav('settings')
      })
      expect(result.current.nav).toBe('settings')
    })
  })

  // Test 4: openAddOnDate(ds) sets addDue, opens showAdd
  describe('openAddOnDate helper', () => {
    it('should set addDue and open showAdd', () => {
      const { result } = renderUIStateHook()

      expect(result.current.showAdd).toBe(false)
      expect(result.current.addDue).toBe('')

      act(() => {
        result.current.openAddOnDate('2026-04-05')
      })

      expect(result.current.addDue).toBe('2026-04-05')
      expect(result.current.showAdd).toBe(true)
    })

    it('should handle multiple date changes', () => {
      const { result } = renderUIStateHook()

      act(() => {
        result.current.openAddOnDate('2026-04-05')
      })
      expect(result.current.addDue).toBe('2026-04-05')

      act(() => {
        result.current.openAddOnDate('2026-04-10')
      })
      expect(result.current.addDue).toBe('2026-04-10')
      expect(result.current.showAdd).toBe(true)
    })
  })

  // Test 5: Keyboard 'n' opens add modal
  describe('Keyboard shortcuts - n key', () => {
    it('should open add modal when n is pressed', () => {
      const { result } = renderUIStateHook()

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'n' })
        window.dispatchEvent(event)
      })

      expect(result.current.showAdd).toBe(true)
      expect(result.current.addDue).toBe('')
    })

    it('should not open add if Cmd+n is pressed', () => {
      const { result } = renderUIStateHook()

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'n',
          metaKey: true,
        })
        window.dispatchEvent(event)
      })

      // metaKey press should be ignored for 'n' shortcut
      expect(result.current.showAdd).toBe(false)
    })

    it('should not open add if typing in input', () => {
      const { result } = renderUIStateHook()

      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'n' })
        input.dispatchEvent(event)
      })

      expect(result.current.showAdd).toBe(false)
      document.body.removeChild(input)
    })
  })

  // Test 6: Keyboard 'h' navigates home
  describe('Keyboard shortcuts - h key', () => {
    it('should navigate to home when h is pressed', () => {
      const { result } = renderUIStateHook()

      act(() => {
        result.current.setPid('p1')
        result.current.setNav('projects')
        result.current.setSelId('task1')
      })

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'h' })
        window.dispatchEvent(event)
      })

      expect(result.current.nav).toBe('home')
      expect(result.current.selId).toBe(null)
    })

    it('should not navigate home if typing in input', () => {
      const { result } = renderUIStateHook()

      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()

      act(() => {
        result.current.setNav('projects')
      })

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'h' })
        input.dispatchEvent(event)
      })

      expect(result.current.nav).toBe('projects')
      document.body.removeChild(input)
    })
  })

  // Test 7: Keyboard '1'-'4' switches view
  describe('Keyboard shortcuts - view switching 1-4', () => {
    it('should switch to board view with 1', () => {
      const { result } = renderUIStateHook()

      act(() => {
        result.current.setView('lista')
      })
      expect(result.current.view).toBe('lista')

      act(() => {
        const event = new KeyboardEvent('keydown', { key: '1' })
        window.dispatchEvent(event)
      })

      expect(result.current.view).toBe('board')
    })

    it('should switch to lista view with 2', () => {
      const { result } = renderUIStateHook()

      act(() => {
        const event = new KeyboardEvent('keydown', { key: '2' })
        window.dispatchEvent(event)
      })

      expect(result.current.view).toBe('lista')
    })

    it('should switch to timeline view with 3', () => {
      const { result } = renderUIStateHook()

      act(() => {
        const event = new KeyboardEvent('keydown', { key: '3' })
        window.dispatchEvent(event)
      })

      expect(result.current.view).toBe('timeline')
    })

    it('should switch to calendario view with 4', () => {
      const { result } = renderUIStateHook()

      act(() => {
        const event = new KeyboardEvent('keydown', { key: '4' })
        window.dispatchEvent(event)
      })

      expect(result.current.view).toBe('calendario')
    })

    it('should not switch view if typing in textarea', () => {
      const { result } = renderUIStateHook()

      const textarea = document.createElement('textarea')
      document.body.appendChild(textarea)
      textarea.focus()

      act(() => {
        result.current.setView('board')
      })

      act(() => {
        const event = new KeyboardEvent('keydown', { key: '1' })
        textarea.dispatchEvent(event)
      })

      expect(result.current.view).toBe('board')
      document.body.removeChild(textarea)
    })
  })

  // Test 8: Keyboard Escape closes modals in priority order
  describe('Keyboard shortcuts - Escape key', () => {
    it('should close command palette first', () => {
      const { result } = renderUIStateHook()

      act(() => {
        result.current.setShowCmdK(true)
        result.current.setSelId('task1')
        result.current.setShowAdd(true)
      })

      expect(result.current.showCmdK).toBe(true)
      expect(result.current.selId).toBe('task1')
      expect(result.current.showAdd).toBe(true)

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' })
        window.dispatchEvent(event)
      })

      expect(result.current.showCmdK).toBe(false)
      expect(result.current.selId).toBe('task1')
      expect(result.current.showAdd).toBe(true)
    })

    it('should close task detail second', () => {
      const { result } = renderUIStateHook()

      act(() => {
        result.current.setSelId('task1')
        result.current.setShowAdd(true)
      })

      expect(result.current.selId).toBe('task1')
      expect(result.current.showAdd).toBe(true)

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' })
        window.dispatchEvent(event)
      })

      expect(result.current.selId).toBe(null)
      expect(result.current.showAdd).toBe(true)
    })

    it('should close add modal third and reset addDue', () => {
      const { result } = renderUIStateHook()

      act(() => {
        result.current.setShowAdd(true)
        result.current.setAddDue('2026-04-05')
      })

      expect(result.current.showAdd).toBe(true)
      expect(result.current.addDue).toBe('2026-04-05')

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' })
        window.dispatchEvent(event)
      })

      expect(result.current.showAdd).toBe(false)
      expect(result.current.addDue).toBe('')
    })

    it('should close nothing if no modals are open', () => {
      const { result } = renderUIStateHook()

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' })
        window.dispatchEvent(event)
      })

      expect(result.current.showCmdK).toBe(false)
      expect(result.current.selId).toBe(null)
      expect(result.current.showAdd).toBe(false)
    })
  })

  // Test 9: Cmd+K toggles command palette
  describe('Keyboard shortcuts - Cmd+K', () => {
    it('should toggle command palette with Cmd+K on Mac', () => {
      const { result } = renderUIStateHook()

      expect(result.current.showCmdK).toBe(false)

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true })
        window.dispatchEvent(event)
      })

      expect(result.current.showCmdK).toBe(true)

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true })
        window.dispatchEvent(event)
      })

      expect(result.current.showCmdK).toBe(false)
    })

    it('should toggle command palette with Ctrl+K on Windows/Linux', () => {
      const { result } = renderUIStateHook()

      expect(result.current.showCmdK).toBe(false)

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })
        window.dispatchEvent(event)
      })

      expect(result.current.showCmdK).toBe(true)

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })
        window.dispatchEvent(event)
      })

      expect(result.current.showCmdK).toBe(false)
    })

    it('should work when typing in input (Cmd+K should bypass input check)', () => {
      const { result } = renderUIStateHook()

      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true })
        window.dispatchEvent(event)
      })

      expect(result.current.showCmdK).toBe(true)
      document.body.removeChild(input)
    })
  })

  // Test 10: Shortcuts don't fire when target is input/textarea
  describe('Input/textarea protection', () => {
    it('should not trigger n shortcut in input', () => {
      const { result } = renderUIStateHook()

      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'n' })
        input.dispatchEvent(event)
      })

      expect(result.current.showAdd).toBe(false)
      document.body.removeChild(input)
    })

    it('should not trigger h shortcut in textarea', () => {
      const { result } = renderUIStateHook()

      const textarea = document.createElement('textarea')
      document.body.appendChild(textarea)
      textarea.focus()

      act(() => {
        result.current.setNav('projects')
      })

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'h' })
        textarea.dispatchEvent(event)
      })

      expect(result.current.nav).toBe('projects')
      document.body.removeChild(textarea)
    })

    it('should not trigger view shortcuts in select element', () => {
      const { result } = renderUIStateHook()

      const select = document.createElement('select')
      document.body.appendChild(select)
      select.focus()

      act(() => {
        result.current.setView('lista')
      })

      act(() => {
        const event = new KeyboardEvent('keydown', { key: '1' })
        select.dispatchEvent(event)
      })

      expect(result.current.view).toBe('lista')
      document.body.removeChild(select)
    })

    it('should not trigger shortcuts in contentEditable elements', () => {
      const { result } = renderUIStateHook()

      const editable = document.createElement('div')
      editable.contentEditable = 'true'
      document.body.appendChild(editable)
      editable.focus()

      act(() => {
        result.current.setView('board')
      })

      act(() => {
        const event = new KeyboardEvent('keydown', { key: '2' })
        editable.dispatchEvent(event)
      })

      expect(result.current.view).toBe('board')
      document.body.removeChild(editable)
    })

    it('should allow Escape in input fields', () => {
      const { result } = renderUIStateHook()

      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()

      act(() => {
        result.current.setShowAdd(true)
      })

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' })
        window.dispatchEvent(event)
      })

      // Escape should work even in input
      expect(result.current.showAdd).toBe(false)
      document.body.removeChild(input)
    })
  })

  // Additional tests for state setters
  describe('State setters', () => {
    it('should update view directly with setView', () => {
      const { result } = renderUIStateHook()

      act(() => {
        result.current.setView('lista')
      })
      expect(result.current.view).toBe('lista')

      act(() => {
        result.current.setView('timeline')
      })
      expect(result.current.view).toBe('timeline')
    })

    it('should update filters with setFilters', () => {
      const { result } = renderUIStateHook()

      const newFilters = { q: 'test', pri: 'high', who: 'me', due: 'today', done: 'all', tag: 'all' }

      act(() => {
        result.current.setFilters(newFilters)
      })

      expect(result.current.filters).toEqual(newFilters)
    })

    it('should update AI state', () => {
      const { result } = renderUIStateHook()

      act(() => {
        result.current.setAiLoad(true)
      })
      expect(result.current.aiLoad).toBe(true)

      act(() => {
        result.current.setSummary('Generated summary')
      })
      expect(result.current.summary).toBe('Generated summary')

      act(() => {
        result.current.setShowSum(true)
      })
      expect(result.current.showSum).toBe(true)
    })

    it('should update mobile sidebar state', () => {
      const { result } = renderUIStateHook()

      act(() => {
        result.current.setMobileSidebar(true)
      })
      expect(result.current.mobileSidebar).toBe(true)

      act(() => {
        result.current.setMobileSidebar(false)
      })
      expect(result.current.mobileSidebar).toBe(false)
    })

    it('should update new project modal state', () => {
      const { result } = renderUIStateHook()

      act(() => {
        result.current.setShowNewProj(true)
      })
      expect(result.current.showNewProj).toBe(true)

      act(() => {
        result.current.setShowNewProj(false)
      })
      expect(result.current.showNewProj).toBe(false)
    })
  })
})
