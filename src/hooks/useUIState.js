import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { parseRoute, buildPath } from '@/utils/routing'
import { EMPTY_FILTERS, seedFor, oget } from '@/constants'

/**
 * useUIState Hook
 * Extracts UI state management, routing, and keyboard shortcuts from App.jsx
 *
 * @param {Object} params
 * @param {Object} params.activeOrgId - Current organization ID
 * @returns {Object} UI state and navigation helpers
 */
export function useUIState({ activeOrgId }) {
  const navigate = useNavigate()
  const location = useLocation()

  // ── State Initialization from URL ───────────────────────────────────────
  const initRoute = useMemo(() => parseRoute(location.pathname), [])
  const [nav, setNav] = useState(initRoute.nav)
  const [pid, setPid] = useState(() =>
    initRoute.pid || oget(activeOrgId, 'projs', seedFor(activeOrgId).projs)[0]?.id || ''
  )
  const [view, setView] = useState(initRoute.view || 'board')
  const [selId, setSelId] = useState(initRoute.taskId)
  const [showAdd, setShowAdd] = useState(false)
  const [addDue, setAddDue] = useState('')
  const [aiLoad, setAiLoad] = useState(false)
  const [summary, setSummary] = useState(null)
  const [showSum, setShowSum] = useState(false)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [showCmdK, setShowCmdK] = useState(false)
  const [mobileSidebar, setMobileSidebar] = useState(false)
  const [showNewProj, setShowNewProj] = useState(false)

  // ── Global keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const tag = (e.target.tagName || '').toLowerCase()
      const inInput =
        tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable

      // Cmd+K / Ctrl+K: toggle command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowCmdK((v) => !v)
        return
      }

      // Escape: close modals in priority order
      if (e.key === 'Escape') {
        if (showCmdK) {
          setShowCmdK(false)
          return
        }
        if (selId) {
          setSelId(null)
          return
        }
        if (showAdd) {
          setShowAdd(false)
          setAddDue('')
          return
        }
      }

      // Don't process shortcuts if typing in an input
      if (inInput) return

      // n: new task
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setAddDue('')
        setShowAdd(true)
      }

      // h: go home
      if (e.key === 'h') {
        e.preventDefault()
        goNav('home')
      }

      // 1-4: switch view
      if (e.key === '1') {
        e.preventDefault()
        setView('board')
      }
      if (e.key === '2') {
        e.preventDefault()
        setView('lista')
      }
      if (e.key === '3') {
        e.preventDefault()
        setView('timeline')
      }
      if (e.key === '4') {
        e.preventDefault()
        setView('calendario')
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showCmdK, selId, showAdd])

  // ── Sync state → URL ───────────────────────────────────────────────────
  const skipUrlSync = useRef(false)
  useEffect(() => {
    if (skipUrlSync.current) {
      skipUrlSync.current = false
      return
    }
    const target = buildPath(nav, pid, view, selId)
    if (location.pathname !== target) navigate(target, { replace: true })
  }, [nav, pid, view, selId, navigate, location.pathname])

  // ── Sync URL → state (browser back/forward) ────────────────────────────
  useEffect(() => {
    const r = parseRoute(location.pathname)
    skipUrlSync.current = true
    if (r.nav && r.nav !== nav) setNav(r.nav)
    if (r.pid && r.pid !== pid && r.pid !== '-') setPid(r.pid)
    if (r.view && r.view !== view && r.view !== '-') setView(r.view)
    setSelId(r.taskId && r.taskId !== '-' ? r.taskId : null)
  }, [location.pathname])

  // ── Navigation helpers ─────────────────────────────────────────────────
  const selProj = (id) => {
    setPid(id)
    setNav('projects')
    setSelId(null)
  }

  const goNav = (n) => {
    setNav(n)
    setSelId(null)
  }

  const openAddOnDate = (ds) => {
    setAddDue(ds)
    setShowAdd(true)
  }

  // ── Return ─────────────────────────────────────────────────────────────
  return {
    // Core UI state
    nav,
    setNav,
    pid,
    setPid,
    view,
    setView,
    selId,
    setSelId,
    // Add modal
    showAdd,
    setShowAdd,
    addDue,
    setAddDue,
    // AI state
    aiLoad,
    setAiLoad,
    summary,
    setSummary,
    showSum,
    setShowSum,
    // Filters
    filters,
    setFilters,
    // Command palette
    showCmdK,
    setShowCmdK,
    // Mobile
    mobileSidebar,
    setMobileSidebar,
    // Project creation
    showNewProj,
    setShowNewProj,
    // Navigation helpers
    selProj,
    goNav,
    openAddOnDate,
  }
}
