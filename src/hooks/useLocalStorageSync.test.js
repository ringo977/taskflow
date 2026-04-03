import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorageSync } from './useLocalStorageSync'

// ── Mock @/utils/storage ──────────────────────────────────────
vi.mock('@/utils/storage', () => ({
  storage: {
    set: vi.fn(),
  },
}))

// ── Mock @/constants ──────────────────────────────────────────
vi.mock('@/constants', () => ({
  oset: vi.fn(),
}))

import { storage } from '@/utils/storage'
import { oset } from '@/constants'

// ── Test Helpers ──────────────────────────────────────────────

function makeGlobal({
  lang = 'en',
  theme = 'light',
  orgs = [{ id: 'org1', name: 'Org 1' }],
  activeOrgId = 'org1',
} = {}) {
  return { lang, theme, orgs, activeOrgId }
}

function makeOrgData({
  projs = [{ id: 'p1', name: 'Project 1' }],
  ports = [{ id: 'po1', name: 'Portfolio 1' }],
  secs = { p1: ['To Do', 'Done'] },
  tasks = [{ id: 't1', title: 'Task 1' }],
} = {}) {
  return { projs, ports, secs, tasks }
}

// ── Tests ─────────────────────────────────────────────────────

describe('useLocalStorageSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Setup jsdom document.documentElement
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme')
  })

  // ── Global state writes ────────────────────────────────────

  describe('global state writes', () => {
    it('writes global keys to storage on mount', async () => {
      const global = makeGlobal({ lang: 'it', theme: 'dark' })
      const orgData = makeOrgData()

      renderHook(() => useLocalStorageSync(global, orgData, 'org1'))

      // Advance microtask queue to flush batch
      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })

      expect(storage.set).toHaveBeenCalledWith('lang', 'it')
      expect(storage.set).toHaveBeenCalledWith('theme', 'dark')
      expect(storage.set).toHaveBeenCalledWith('orgs', global.orgs)
      expect(storage.set).toHaveBeenCalledWith('activeOrgId', 'org1')
    })

    it('writes global keys when lang changes', async () => {
      const orgData = makeOrgData()
      const global1 = makeGlobal({ lang: 'en' })

      const { rerender } = renderHook(
        ({ g }) => useLocalStorageSync(g, orgData, 'org1'),
        { initialProps: { g: global1 } }
      )

      // Clear calls from initial mount
      vi.clearAllMocks()

      // Change lang
      const global2 = makeGlobal({ lang: 'fr' })
      rerender({ g: global2 })

      // Flush batch
      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })

      expect(storage.set).toHaveBeenCalledWith('lang', 'fr')
    })

    it('writes global keys when theme changes', async () => {
      const orgData = makeOrgData()
      const global1 = makeGlobal({ theme: 'light' })

      const { rerender } = renderHook(
        ({ g }) => useLocalStorageSync(g, orgData, 'org1'),
        { initialProps: { g: global1 } }
      )

      vi.clearAllMocks()

      const global2 = makeGlobal({ theme: 'dark' })
      rerender({ g: global2 })

      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })

      expect(storage.set).toHaveBeenCalledWith('theme', 'dark')
    })

    it('writes global keys when orgs array changes', async () => {
      const orgData = makeOrgData()
      const global1 = makeGlobal({ orgs: [{ id: 'org1' }] })

      const { rerender } = renderHook(
        ({ g }) => useLocalStorageSync(g, orgData, 'org1'),
        { initialProps: { g: global1 } }
      )

      vi.clearAllMocks()

      const newOrgs = [{ id: 'org1' }, { id: 'org2' }]
      const global2 = makeGlobal({ orgs: newOrgs })
      rerender({ g: global2 })

      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })

      expect(storage.set).toHaveBeenCalledWith('orgs', newOrgs)
    })

    it('writes global keys when activeOrgId changes', async () => {
      const orgData = makeOrgData()
      const global1 = makeGlobal({ activeOrgId: 'org1' })

      const { rerender } = renderHook(
        ({ g }) => useLocalStorageSync(g, orgData, 'org1'),
        { initialProps: { g: global1 } }
      )

      vi.clearAllMocks()

      const global2 = makeGlobal({ activeOrgId: 'org2' })
      rerender({ g: global2 })

      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })

      expect(storage.set).toHaveBeenCalledWith('activeOrgId', 'org2')
    })
  })

  // ── Org-namespaced writes ──────────────────────────────────

  describe('org-namespaced writes (oset)', () => {
    it('writes org-namespaced keys when orgId is present', async () => {
      const global = makeGlobal()
      const orgData = makeOrgData({
        projs: [{ id: 'p1' }],
        ports: [{ id: 'po1' }],
        secs: { p1: ['To Do'] },
        tasks: [{ id: 't1' }],
      })

      renderHook(() => useLocalStorageSync(global, orgData, 'org1'))

      // Clear mount calls and flush
      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })
      vi.clearAllMocks()

      // Trigger re-render to ensure org data is written
      const { rerender } = renderHook(
        ({ g, od, oid }) => useLocalStorageSync(g, od, oid),
        { initialProps: { g: global, od: orgData, oid: 'org1' } }
      )
      rerender({ g: global, od: orgData, oid: 'org1' })

      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })

      expect(oset).toHaveBeenCalledWith('org1', 'projs', orgData.projs)
      expect(oset).toHaveBeenCalledWith('org1', 'ports', orgData.ports)
      expect(oset).toHaveBeenCalledWith('org1', 'secs', orgData.secs)
      expect(oset).toHaveBeenCalledWith('org1', 'tasks', orgData.tasks)
    })

    it('does NOT write org-namespaced keys when orgId is null', async () => {
      const global = makeGlobal()
      const orgData = makeOrgData()

      renderHook(() => useLocalStorageSync(global, orgData, null))

      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })

      // oset should not be called
      expect(oset).not.toHaveBeenCalled()
    })

    it('does NOT write org-namespaced keys when orgId is undefined', async () => {
      const global = makeGlobal()
      const orgData = makeOrgData()

      renderHook(() => useLocalStorageSync(global, orgData, undefined))

      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })

      expect(oset).not.toHaveBeenCalled()
    })

    it('writes org-namespaced keys when projs changes', async () => {
      const global = makeGlobal()
      const orgData1 = makeOrgData({ projs: [{ id: 'p1' }] })

      const { rerender } = renderHook(
        ({ g, od, oid }) => useLocalStorageSync(g, od, oid),
        { initialProps: { g: global, od: orgData1, oid: 'org1' } }
      )

      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })
      vi.clearAllMocks()

      // Change projs
      const orgData2 = makeOrgData({ projs: [{ id: 'p1' }, { id: 'p2' }] })
      rerender({ g: global, od: orgData2, oid: 'org1' })

      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })

      expect(oset).toHaveBeenCalledWith('org1', 'projs', orgData2.projs)
    })

    it('writes org-namespaced keys when ports changes', async () => {
      const global = makeGlobal()
      const orgData1 = makeOrgData({ ports: [{ id: 'po1' }] })

      const { rerender } = renderHook(
        ({ g, od, oid }) => useLocalStorageSync(g, od, oid),
        { initialProps: { g: global, od: orgData1, oid: 'org1' } }
      )

      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })
      vi.clearAllMocks()

      const orgData2 = makeOrgData({ ports: [{ id: 'po1' }, { id: 'po2' }] })
      rerender({ g: global, od: orgData2, oid: 'org1' })

      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })

      expect(oset).toHaveBeenCalledWith('org1', 'ports', orgData2.ports)
    })

    it('writes org-namespaced keys when secs changes', async () => {
      const global = makeGlobal()
      const orgData1 = makeOrgData({ secs: { p1: ['To Do'] } })

      const { rerender } = renderHook(
        ({ g, od, oid }) => useLocalStorageSync(g, od, oid),
        { initialProps: { g: global, od: orgData1, oid: 'org1' } }
      )

      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })
      vi.clearAllMocks()

      const orgData2 = makeOrgData({ secs: { p1: ['To Do', 'Done'] } })
      rerender({ g: global, od: orgData2, oid: 'org1' })

      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })

      expect(oset).toHaveBeenCalledWith('org1', 'secs', orgData2.secs)
    })

    it('writes org-namespaced keys when tasks changes', async () => {
      const global = makeGlobal()
      const orgData1 = makeOrgData({ tasks: [{ id: 't1' }] })

      const { rerender } = renderHook(
        ({ g, od, oid }) => useLocalStorageSync(g, od, oid),
        { initialProps: { g: global, od: orgData1, oid: 'org1' } }
      )

      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })
      vi.clearAllMocks()

      const orgData2 = makeOrgData({ tasks: [{ id: 't1' }, { id: 't2' }] })
      rerender({ g: global, od: orgData2, oid: 'org1' })

      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })

      expect(oset).toHaveBeenCalledWith('org1', 'tasks', orgData2.tasks)
    })
  })

  // ── Theme side-effect (data-theme attribute) ──────────────

  describe('theme side-effect (data-theme attribute)', () => {
    it('sets data-theme attribute to light', () => {
      const global = makeGlobal({ theme: 'light' })
      const orgData = makeOrgData()

      renderHook(() => useLocalStorageSync(global, orgData, 'org1'))

      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })

    it('sets data-theme attribute to dark', () => {
      const global = makeGlobal({ theme: 'dark' })
      const orgData = makeOrgData()

      renderHook(() => useLocalStorageSync(global, orgData, 'org1'))

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })

    it('removes data-theme attribute when theme is auto', () => {
      const global = makeGlobal({ theme: 'auto' })
      const orgData = makeOrgData()

      renderHook(() => useLocalStorageSync(global, orgData, 'org1'))

      expect(document.documentElement.getAttribute('data-theme')).toBeNull()
    })

    it('updates data-theme when theme changes from light to dark', () => {
      const global1 = makeGlobal({ theme: 'light' })
      const orgData = makeOrgData()

      const { rerender } = renderHook(
        ({ g }) => useLocalStorageSync(g, orgData, 'org1'),
        { initialProps: { g: global1 } }
      )

      expect(document.documentElement.getAttribute('data-theme')).toBe('light')

      const global2 = makeGlobal({ theme: 'dark' })
      rerender({ g: global2 })

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })

    it('removes data-theme when theme changes from light to auto', () => {
      const global1 = makeGlobal({ theme: 'light' })
      const orgData = makeOrgData()

      const { rerender } = renderHook(
        ({ g }) => useLocalStorageSync(g, orgData, 'org1'),
        { initialProps: { g: global1 } }
      )

      expect(document.documentElement.getAttribute('data-theme')).toBe('light')

      const global2 = makeGlobal({ theme: 'auto' })
      rerender({ g: global2 })

      expect(document.documentElement.getAttribute('data-theme')).toBeNull()
    })

    it('sets data-theme when theme changes from auto to dark', () => {
      const global1 = makeGlobal({ theme: 'auto' })
      const orgData = makeOrgData()

      const { rerender } = renderHook(
        ({ g }) => useLocalStorageSync(g, orgData, 'org1'),
        { initialProps: { g: global1 } }
      )

      expect(document.documentElement.getAttribute('data-theme')).toBeNull()

      const global2 = makeGlobal({ theme: 'dark' })
      rerender({ g: global2 })

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })
  })

  // ── Batching behavior ──────────────────────────────────────

  describe('batching behavior', () => {
    it('batches multiple global updates in a single microtask', async () => {
      const global = makeGlobal()
      const orgData = makeOrgData()

      const { rerender } = renderHook(
        ({ g }) => useLocalStorageSync(g, orgData, 'org1'),
        { initialProps: { g: global } }
      )

      // Flush mount microtask before clearing mocks
      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })
      vi.clearAllMocks()

      // Trigger all global dependencies to change (simulating simultaneous updates)
      const global2 = makeGlobal({
        lang: 'fr',
        theme: 'dark',
        orgs: [{ id: 'org2' }],
        activeOrgId: 'org2',
      })
      rerender({ g: global2 })

      // Before microtask, no calls should have been made
      expect(storage.set).not.toHaveBeenCalled()

      // Flush microtask
      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })

      // Now all storage.set calls should be batched in one microtask
      expect(storage.set).toHaveBeenCalledWith('lang', 'fr')
      expect(storage.set).toHaveBeenCalledWith('theme', 'dark')
      expect(storage.set).toHaveBeenCalledWith('orgs', expect.any(Array))
      expect(storage.set).toHaveBeenCalledWith('activeOrgId', 'org2')

      // Verify all calls happened (in a batch)
      expect(storage.set).toHaveBeenCalledTimes(4)
    })

    it('batches multiple org updates in a single microtask', async () => {
      const global = makeGlobal()
      const orgData1 = makeOrgData()

      const { rerender } = renderHook(
        ({ g, od, oid }) => useLocalStorageSync(g, od, oid),
        { initialProps: { g: global, od: orgData1, oid: 'org1' } }
      )

      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })
      vi.clearAllMocks()

      // Change all org data dependencies
      const orgData2 = makeOrgData({
        projs: [{ id: 'new-p' }],
        ports: [{ id: 'new-po' }],
        secs: { new: ['s1'] },
        tasks: [{ id: 'new-t' }],
      })
      rerender({ g: global, od: orgData2, oid: 'org1' })

      // Before flush, no calls
      expect(oset).not.toHaveBeenCalled()

      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })

      // All oset calls batched
      expect(oset).toHaveBeenCalledWith('org1', 'projs', expect.any(Array))
      expect(oset).toHaveBeenCalledWith('org1', 'ports', expect.any(Array))
      expect(oset).toHaveBeenCalledWith('org1', 'secs', expect.any(Object))
      expect(oset).toHaveBeenCalledWith('org1', 'tasks', expect.any(Array))
      expect(oset).toHaveBeenCalledTimes(4)
    })
  })

  // ── Edge cases ────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles orgId changing from one value to another', async () => {
      const global = makeGlobal()
      const orgData = makeOrgData()

      const { rerender } = renderHook(
        ({ g, od, oid }) => useLocalStorageSync(g, od, oid),
        { initialProps: { g: global, od: orgData, oid: 'org1' } }
      )

      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })
      vi.clearAllMocks()

      // Change orgId to a different value
      rerender({ g: global, od: orgData, oid: 'org2' })

      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })

      // oset should be called with new orgId
      expect(oset).toHaveBeenCalledWith('org2', 'projs', expect.any(Array))
      expect(oset).toHaveBeenCalledWith('org2', 'ports', expect.any(Array))
      expect(oset).toHaveBeenCalledWith('org2', 'secs', expect.any(Object))
      expect(oset).toHaveBeenCalledWith('org2', 'tasks', expect.any(Array))
    })

    it('handles orgId changing from a value to null', async () => {
      const global = makeGlobal()
      const orgData = makeOrgData()

      const { rerender } = renderHook(
        ({ g, od, oid }) => useLocalStorageSync(g, od, oid),
        { initialProps: { g: global, od: orgData, oid: 'org1' } }
      )

      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })
      vi.clearAllMocks()

      // Change orgId to null
      rerender({ g: global, od: orgData, oid: null })

      await act(async () => {
        await new Promise((resolve) => queueMicrotask(resolve))
      })

      // oset should not be called when orgId becomes null
      expect(oset).not.toHaveBeenCalled()
    })

    it('does not batch theme updates with storage writes', async () => {
      const global = makeGlobal({ theme: 'light' })
      const orgData = makeOrgData()

      renderHook(() => useLocalStorageSync(global, orgData, 'org1'))

      // Theme update happens in its own effect, not batched with storage.set
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })
  })
})
