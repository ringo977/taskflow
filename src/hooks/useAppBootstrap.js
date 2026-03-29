import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { logger } from '@/utils/logger'
import { storage, seedStorage } from '@/utils/storage'
import { supabase } from '@/lib/supabase'
import { getMfaLevel, getFactors } from '@/lib/auth'
import {
  fetchOrgData, fetchSectionRows,
  ensureOrgMembership, fetchUserOrgIds,
  seedOrg,
} from '@/lib/db'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { useLocalStorageSync } from '@/hooks/useLocalStorageSync'
import { INITIAL_ORGS } from '@/data/orgs'
import { seedFor, oget } from '@/constants'
import { deferAuthWork } from '@/utils/routing'

const log = logger('Bootstrap')

/**
 * useAppBootstrap
 *
 * Top-level hook that manages all auth, org initialization, org switching,
 * and realtime sync logic. Extracted from App.jsx to reduce complexity.
 *
 * Returns an object with all state and functions needed for the rest of the app.
 */
export function useAppBootstrap() {
  // ── Auth & loading state ──────────────────────────────────────
  const [user, setUser] = useState(null)
  const [needsMfa, setNeedsMfa] = useState(false)
  const [appLoading, setAppLoading] = useState(true)
  const [orgLoading, setOrgLoading] = useState(false)
  const [dbStatus, setDbStatus] = useState('local')

  // ── Org & data state ──────────────────────────────────────────
  const [lang, setLang] = useState(() => storage.get('lang', 'it'))
  const [theme, setTheme] = useState(() => storage.get('theme', 'auto'))
  const [orgs, setOrgs] = useState(() => storage.get('orgs', INITIAL_ORGS))
  const [activeOrgId, setActiveOrgId] = useState(() => storage.get('activeOrgId', 'polimi'))

  const [projs, setProjs] = useState(() => oget(activeOrgId, 'projs', seedFor(activeOrgId).projs))
  const [ports, setPorts] = useState(() => oget(activeOrgId, 'ports', seedFor(activeOrgId).ports))
  const [secs, setSecs] = useState(() => oget(activeOrgId, 'secs', seedFor(activeOrgId).secs))
  const [tasks, setTasks] = useState(() => oget(activeOrgId, 'tasks', seedFor(activeOrgId).tasks))
  const [myProjectRoles, setMyProjectRoles] = useState({})

  // ── Refs ──────────────────────────────────────────────────────
  const secRowsRef = useRef([])
  const activeOrgIdRef = useRef(activeOrgId)
  useEffect(() => { activeOrgIdRef.current = activeOrgId }, [activeOrgId])

  // ── Batched localStorage sync (replaces 8 separate effects) ────
  const globalSync = useMemo(() => ({ lang, theme, orgs, activeOrgId }), [lang, theme, orgs, activeOrgId])
  const orgSync = useMemo(() => ({ projs, ports, secs, tasks }), [projs, ports, secs, tasks])
  useLocalStorageSync(globalSync, orgSync, activeOrgId)

  // ── Load org data from Supabase ──────────────────────────────
  const loadOrgData = useCallback(async (orgId) => {
    setOrgLoading(true)
    setDbStatus('syncing')
    try {
      const data = await fetchOrgData(orgId)
      if (data.projs.length === 0 && !seedStorage.isDone(orgId)) {
        const seed = seedFor(orgId)
        await seedOrg(orgId, seed)
        seedStorage.markDone(orgId)
        const seeded = await fetchOrgData(orgId)
        setProjs(seeded.projs); setPorts(seeded.ports)
        setSecs(seeded.secs);   setTasks(seeded.tasks)
        setMyProjectRoles(seeded.myProjectRoles ?? {})
      } else {
        seedStorage.markDone(orgId)
        setProjs(data.projs); setPorts(data.ports)
        setSecs(data.secs);   setTasks(data.tasks)
        setMyProjectRoles(data.myProjectRoles ?? {})
      }
      // Cache section rows for mutations
      secRowsRef.current = await fetchSectionRows(orgId)
      setDbStatus('supabase')
    } catch (e) {
      log.error('loadOrgData failed:', e)
      setDbStatus('error')
      // Fallback to localStorage
    }
    setOrgLoading(false)
  }, [])

  // ── Org initialization (shared by auth listener + MFA completion) ──
  const initOrgs = useCallback(async (userId) => {
    let signupOrg = null
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      signupOrg = u?.user_metadata?.signup_org || null
    } catch {}

    let memberships = []
    try { memberships = await ensureOrgMembership(userId) } catch {}
    if (!memberships.length) {
      try { memberships = await fetchUserOrgIds() } catch {}
    }
    if (!memberships.length && signupOrg) {
      memberships = [{ org_id: signupOrg, role: 'member' }]
    }
    const memberOrgIds = memberships.map(m => m.org_id)
    const allOrgs = storage.get('orgs', INITIAL_ORGS)
    const visibleOrgs = allOrgs.filter(o => memberOrgIds.includes(o.id))
    if (visibleOrgs.length) {
      setOrgs(visibleOrgs)
      // Prefer org chosen at signup when user belongs to several (e.g. polimi + biomimx)
      let next = activeOrgIdRef.current
      if (signupOrg && memberOrgIds.includes(signupOrg)) {
        next = signupOrg
      } else if (!memberOrgIds.includes(next)) {
        next = visibleOrgs[0].id
      }
      if (next !== activeOrgIdRef.current) {
        setActiveOrgId(next)
        activeOrgIdRef.current = next
      }
    }
    await loadOrgData(activeOrgIdRef.current)
  }, [loadOrgData])

  // ── Sync org context from DB ──────────────────────────────────
  /** Re-read org_members (no ensureOrgMembership) and fix active org + sidebar when admin removes user from an org while session is open. */
  const syncOrgContextFromDb = useCallback(async () => {
    let memberships = []
    try { memberships = await fetchUserOrgIds() } catch (e) {
      log.warn('syncOrgContextFromDb failed:', e.message)
      return
    }
    const memberOrgIds = memberships.map(m => m.org_id)
    const allOrgs = storage.get('orgs', INITIAL_ORGS)
    const visibleOrgs = allOrgs.filter(o => memberOrgIds.includes(o.id))
    setOrgs(visibleOrgs)

    let signupOrg = null
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      signupOrg = u?.user_metadata?.signup_org || null
    } catch {}

    let next = activeOrgIdRef.current
    if (memberOrgIds.length) {
      if (!next || !memberOrgIds.includes(next)) {
        next = (signupOrg && memberOrgIds.includes(signupOrg)) ? signupOrg : (visibleOrgs[0]?.id ?? memberOrgIds[0])
        setActiveOrgId(next)
        activeOrgIdRef.current = next
      }
      await loadOrgData(activeOrgIdRef.current)
    } else {
      setDbStatus('error')
    }
  }, [loadOrgData])

  // ── org_members realtime subscription (lines 464-492) ──────────
  useEffect(() => {
    if (!user?.id) return
    const ch = supabase
      .channel(`org-memberships-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'org_members', filter: `user_id=eq.${user.id}` },
        () => { syncOrgContextFromDb() },
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user?.id, syncOrgContextFromDb])

  useEffect(() => {
    if (!user?.id) return
    let t
    const onFocusOrVisible = () => {
      if (document.visibilityState === 'hidden') return
      clearTimeout(t)
      t = setTimeout(() => { syncOrgContextFromDb() }, 400)
    }
    window.addEventListener('focus', onFocusOrVisible)
    document.addEventListener('visibilitychange', onFocusOrVisible)
    return () => {
      clearTimeout(t)
      window.removeEventListener('focus', onFocusOrVisible)
      document.removeEventListener('visibilitychange', onFocusOrVisible)
    }
  }, [user?.id, syncOrgContextFromDb])

  // ── Auth listener (lines 494-552) ─────────────────────────────
  useEffect(() => {
    let cancelled = false
    const safetyTimer = setTimeout(() => {
      if (!cancelled) setAppLoading(false)
    }, 8000)

    const finishBoot = () => {
      if (!cancelled) {
        clearTimeout(safetyTimer)
        setAppLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      deferAuthWork(async () => {
        if (cancelled) return
        try {
          if (event === 'SIGNED_OUT') {
            setUser(null); setNeedsMfa(false)
            finishBoot(); return
          }
          if (!session?.user) { setUser(null); return }

          const u = session.user
          const userObj = { id: u.id, name: u.user_metadata?.full_name ?? u.email?.split('@')[0], email: u.email, color: '#378ADD' }

          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            // 1. Ensure org membership before anything else
            try { await ensureOrgMembership(u.id) } catch (e) { log.error('ensureOrgMembership failed:', e) }

            // 2. Check MFA — don't set user until we know MFA status
            try {
              const [mfaData, factors] = await Promise.all([getMfaLevel(), getFactors()])
              const hasVerifiedFactor = factors.some(f => f.status === 'verified')
              if (!hasVerifiedFactor || (mfaData.nextLevel === 'aal2' && mfaData.currentLevel !== 'aal2')) {
                setNeedsMfa(true)
                setUser(userObj)
                return
              }
            } catch (e) { log.warn('MFA check failed:', e.message) }

            // 3. MFA passed — load everything
            setUser(userObj)
            try { await initOrgs(u.id) } catch (e) { log.error('initOrgs failed:', e) }
          } else {
            setUser(userObj)
          }
        } finally {
          finishBoot()
        }
      })
    })
    return () => {
      cancelled = true
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [initOrgs])

  // ── Realtime sync (targeted patches + full reload fallback) ────
  const realtimeReload = useCallback(() => {
    if (dbStatus === 'supabase') loadOrgData(activeOrgIdRef.current)
  }, [dbStatus, loadOrgData])
  useRealtimeSync(activeOrgId, {
    onFullReload: realtimeReload,
    setTasks,
    setProjs,
    secRowsRef,
  })

  // ── Org switching (lines 561-576) ─────────────────────────────
  const switchOrg = async (newOrgId) => {
    setActiveOrgId(newOrgId)
    // Load from localStorage immediately for snappy UX
    setProjs(oget(newOrgId, 'projs', seedFor(newOrgId).projs))
    setPorts(oget(newOrgId, 'ports', seedFor(newOrgId).ports))
    setSecs(oget(newOrgId, 'secs', seedFor(newOrgId).secs))
    setTasks(oget(newOrgId, 'tasks', seedFor(newOrgId).tasks))
    setMyProjectRoles({})
    // Then sync from Supabase
    await loadOrgData(newOrgId)
  }

  const addOrg = (orgDef) => {
    setOrgs(o => [...o, orgDef])
    switchOrg(orgDef.id)
  }

  // ── Return everything the rest of App needs ───────────────────
  return {
    // Auth state
    user, setUser, needsMfa, setNeedsMfa, appLoading, orgLoading,
    // Org state
    orgs, setOrgs, activeOrgId, dbStatus,
    // Data
    projs, setProjs, ports, setPorts, secs, setSecs, tasks, setTasks,
    myProjectRoles, setMyProjectRoles, secRowsRef,
    // Org actions
    switchOrg, addOrg, loadOrgData, initOrgs,
    // Settings
    lang, setLang, theme, setTheme,
  }
}
