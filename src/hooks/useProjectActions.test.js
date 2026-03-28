import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProjectActions } from './useProjectActions'

// ── Mock @/lib/db ────────────────────────────────────────────
vi.mock('@/lib/db', () => ({
  upsertProject: vi.fn().mockResolvedValue(),
  upsertPortfolio: vi.fn().mockResolvedValue(),
  upsertSections: vi.fn().mockResolvedValue(),
  fetchSectionRows: vi.fn().mockResolvedValue([{ id: 's1', name: 'To Do' }]),
  deleteProject: vi.fn().mockResolvedValue(),
  deletePortfolio: vi.fn().mockResolvedValue(),
  addProjectMember: vi.fn().mockResolvedValue(),
  upsertTask: vi.fn().mockResolvedValue(),
}))

vi.mock('@/constants', () => ({
  PROJECT_TEMPLATES: [
    {
      id: 'kanban',
      name: 'Kanban',
      sections: ['Backlog', 'To Do', 'In Progress', 'Done'],
      description: 'Kanban board',
      tasks: [
        { title: 'Define scope', sec: 'To Do', pri: 'high', desc: 'Outline goals.' },
      ],
    },
  ],
}))

import {
  upsertProject,
  upsertPortfolio,
  upsertSections,
  deleteProject as dbDeleteProject,
  deletePortfolio as dbDeletePortfolio,
  addProjectMember,
  upsertTask,
} from '@/lib/db'

// ── Helpers ──────────────────────────────────────────────────

const PROJ_A = {
  id: 'p1', name: 'Alpha', color: '#f00', members: ['Marco'],
  status: 'active', statusLabel: 'on_track', portfolio: null,
  description: '', resources: [],
}

const PORT_A = {
  id: 'po1', name: 'Portfolio A', color: '#0f0', desc: '', status: 'active',
}

function makeParams({
  projs = [PROJ_A],
  ports = [PORT_A],
  tasks = [],
  secs = { p1: ['To Do', 'Done'] },
  pid = 'p1',
} = {}) {
  const state = { projs: [...projs], ports: [...ports], tasks: [...tasks], secs: { ...secs } }

  const setProjs = vi.fn((u) => { state.projs = typeof u === 'function' ? u(state.projs) : u })
  const setPorts = vi.fn((u) => { state.ports = typeof u === 'function' ? u(state.ports) : u })
  const setTasks = vi.fn((u) => { state.tasks = typeof u === 'function' ? u(state.tasks) : u })
  const setSecs = vi.fn((u) => { state.secs = typeof u === 'function' ? u(state.secs) : u })
  const setPid = vi.fn()
  const setNav = vi.fn()
  const setSelId = vi.fn()
  const setMyProjectRoles = vi.fn()
  const toast = vi.fn()
  const inbox = { push: vi.fn() }
  const secRowsRef = { current: [{ id: 's1', name: 'To Do' }] }
  const user = { id: 'u1', name: 'Marco' }
  const tr = {
    msgSaveError: 'Save error',
    msgProjectCreated: (n) => `Created ${n}`,
    msgPortfolioCreated: (n) => `Portfolio ${n}`,
    msgDeleted: (n) => `Deleted ${n}`,
    msgArchived: (n) => `Archived ${n}`,
    msgUnarchived: (n) => `Unarchived ${n}`,
    msgDidCreateProject: (n) => `did create ${n}`,
  }
  const myProjectRoles = { p1: 'owner' }

  return {
    get projs() { return state.projs },
    setProjs,
    get ports() { return state.ports },
    setPorts,
    get tasks() { return state.tasks },
    setTasks,
    get secs() { return state.secs },
    setSecs,
    activeOrgId: 'org1',
    secRowsRef,
    user,
    pid,
    setPid,
    setNav,
    setSelId,
    myProjectRoles,
    setMyProjectRoles,
    toast,
    tr,
    inbox,
    _state: state,
  }
}

// ── Tests ────────────────────────────────────────────────────

describe('useProjectActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── addProject ─────────────────────────────────────────

  describe('addProject', () => {
    it('creates project with default sections and persists', async () => {
      const params = makeParams({ projs: [] })
      const { result } = renderHook(() => useProjectActions(params))

      await act(async () => {
        await result.current.addProject('Beta', '#00f', null, null)
      })

      // Optimistic add
      expect(params.setProjs).toHaveBeenCalled()
      expect(params.setSecs).toHaveBeenCalled()
      expect(params.setPid).toHaveBeenCalled()
      expect(params.setNav).toHaveBeenCalledWith('projects')

      // DB calls
      expect(upsertProject).toHaveBeenCalledWith('org1', expect.objectContaining({ name: 'Beta' }))
      expect(addProjectMember).toHaveBeenCalled()
      expect(upsertSections).toHaveBeenCalledWith('org1', expect.any(String), ['To Do', 'In Progress', 'Done'])

      // Toast + inbox
      expect(params.toast).toHaveBeenCalledWith('Created Beta', 'success')
      expect(params.inbox.push).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'project_created' })
      )
    })

    it('applies template sections and tasks when template is provided', async () => {
      const params = makeParams({ projs: [] })
      const { result } = renderHook(() => useProjectActions(params))

      await act(async () => {
        await result.current.addProject('Kanban Proj', '#0f0', null, 'kanban')
      })

      // Template sections
      expect(upsertSections).toHaveBeenCalledWith(
        'org1', expect.any(String),
        ['Backlog', 'To Do', 'In Progress', 'Done']
      )

      // Template tasks persisted
      expect(upsertTask).toHaveBeenCalled()
      expect(params.setTasks).toHaveBeenCalled()
    })

    it('reverts all state on DB error', async () => {
      upsertProject.mockRejectedValueOnce(new Error('fail'))
      const params = makeParams({ projs: [] })
      const { result } = renderHook(() => useProjectActions(params))

      await act(async () => {
        await result.current.addProject('Fail', '#000', null, null)
      })

      // setProjs called twice: optimistic add + revert
      expect(params.setProjs).toHaveBeenCalledTimes(2)
      expect(params.setSecs).toHaveBeenCalledTimes(2)
      expect(params.toast).toHaveBeenCalledWith('Save error', 'error')
    })
  })

  // ── addPortfolio ───────────────────────────────────────

  describe('addPortfolio', () => {
    it('adds portfolio optimistically and persists', async () => {
      const params = makeParams({ ports: [] })
      const { result } = renderHook(() => useProjectActions(params))

      await act(async () => {
        await result.current.addPortfolio('New Port', '#f0f', 'Description')
      })

      expect(params.setPorts).toHaveBeenCalled()
      expect(upsertPortfolio).toHaveBeenCalledWith('org1', expect.objectContaining({ name: 'New Port' }))
      expect(params.toast).toHaveBeenCalledWith('Portfolio New Port', 'success')
    })

    it('shows error toast on failure', async () => {
      upsertPortfolio.mockRejectedValueOnce(new Error('fail'))
      const params = makeParams()
      const { result } = renderHook(() => useProjectActions(params))

      await act(async () => {
        await result.current.addPortfolio('Fail', '#000', '')
      })

      expect(params.toast).toHaveBeenCalledWith('Save error', 'error')
    })
  })

  // ── delProject ─────────────────────────────────────────

  describe('delProject', () => {
    it('removes project, its tasks and sections optimistically', async () => {
      const task = { id: 't1', pid: 'p1', title: 'X' }
      const params = makeParams({ tasks: [task] })
      const { result } = renderHook(() => useProjectActions(params))

      await act(async () => {
        await result.current.delProject('p1')
      })

      // Optimistic removals
      expect(params.setProjs).toHaveBeenCalled()
      expect(params.setTasks).toHaveBeenCalled()
      expect(params.setSecs).toHaveBeenCalled()

      // DB call
      expect(dbDeleteProject).toHaveBeenCalledWith('org1', 'p1')
      expect(params.toast).toHaveBeenCalledWith('Deleted Alpha', 'success')

      // Clears selection when deleting active project
      expect(params.setPid).toHaveBeenCalledWith(null)
      expect(params.setSelId).toHaveBeenCalledWith(null)
    })

    it('reverts all state on DB error', async () => {
      dbDeleteProject.mockRejectedValueOnce(new Error('fail'))
      const task = { id: 't1', pid: 'p1', title: 'X' }
      const params = makeParams({ tasks: [task] })
      const { result } = renderHook(() => useProjectActions(params))

      await act(async () => {
        await result.current.delProject('p1')
      })

      // optimistic + revert for projs, tasks, secs
      expect(params.setProjs).toHaveBeenCalledTimes(2)
      expect(params.setTasks).toHaveBeenCalledTimes(2)
      expect(params.setSecs).toHaveBeenCalledTimes(2)
      expect(params.toast).toHaveBeenCalledWith('Save error', 'error')
    })
  })

  // ── delPortfolio ───────────────────────────────────────

  describe('delPortfolio', () => {
    it('removes portfolio and unlinks projects optimistically', async () => {
      const proj = { ...PROJ_A, portfolio: 'po1' }
      const params = makeParams({ projs: [proj] })
      const { result } = renderHook(() => useProjectActions(params))

      await act(async () => {
        await result.current.delPortfolio('po1')
      })

      // Portfolio removed
      expect(params.setPorts).toHaveBeenCalled()
      // Projects unlinked
      expect(params.setProjs).toHaveBeenCalled()
      const projUpdater = params.setProjs.mock.calls[0][0]
      const patched = projUpdater([proj])
      expect(patched[0].portfolio).toBeNull()

      expect(dbDeletePortfolio).toHaveBeenCalledWith('org1', 'po1')
    })

    it('reverts on DB error', async () => {
      dbDeletePortfolio.mockRejectedValueOnce(new Error('fail'))
      const params = makeParams()
      const { result } = renderHook(() => useProjectActions(params))

      await act(async () => {
        await result.current.delPortfolio('po1')
      })

      expect(params.setPorts).toHaveBeenCalledTimes(2)
      expect(params.toast).toHaveBeenCalledWith('Save error', 'error')
    })
  })

  // ── updProj ────────────────────────────────────────────

  describe('updProj', () => {
    it('patches project optimistically and persists', async () => {
      const params = makeParams()
      const { result } = renderHook(() => useProjectActions(params))

      await act(async () => {
        await result.current.updProj('p1', { name: 'Alpha v2' })
      })

      const updater = params.setProjs.mock.calls[0][0]
      const patched = updater([PROJ_A])
      expect(patched[0].name).toBe('Alpha v2')

      expect(upsertProject).toHaveBeenCalledWith('org1', expect.objectContaining({ name: 'Alpha v2' }))
    })

    it('reverts on DB error', async () => {
      upsertProject.mockRejectedValueOnce(new Error('fail'))
      const params = makeParams()
      const { result } = renderHook(() => useProjectActions(params))

      await act(async () => {
        await result.current.updProj('p1', { name: 'Fail' })
      })

      expect(params.setProjs).toHaveBeenCalledTimes(2)
      expect(params.toast).toHaveBeenCalledWith('Save error', 'error')
    })
  })

  // ── archivePortfolio ───────────────────────────────────

  describe('archivePortfolio', () => {
    it('toggles portfolio status to archived', async () => {
      const params = makeParams()
      const { result } = renderHook(() => useProjectActions(params))

      await act(async () => {
        await result.current.archivePortfolio('po1')
      })

      expect(params.setPorts).toHaveBeenCalled()
      expect(upsertPortfolio).toHaveBeenCalledWith(
        'org1',
        expect.objectContaining({ status: 'archived' })
      )
      expect(params.toast).toHaveBeenCalledWith('Archived Portfolio A', 'success')
    })
  })
})
