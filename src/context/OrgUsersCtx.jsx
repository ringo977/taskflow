import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getUsersForOrg } from '@/data/users'
import { fetchOrgDirectory, fetchMyMemberships } from '@/lib/db'
import { supabase } from '@/lib/supabase'

const OrgUsersCtx = createContext(null)
const RefreshCtx = createContext(() => {})

export function OrgUsersProvider({ orgId, children }) {
  const [users, setUsers] = useState(() => getUsersForOrg(orgId))
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(n => n + 1), [])

  useEffect(() => {
    let cancelled = false
    fetchOrgDirectory(orgId)
      .then(rows => {
        if (cancelled) return
        if (rows?.length) {
          setUsers(rows)
        } else {
          injectCurrentUser(orgId).then(fallback => !cancelled && setUsers(fallback))
        }
      })
      .catch(() => {
        if (cancelled) return
        injectCurrentUser(orgId).then(fallback => !cancelled && setUsers(fallback))
      })
    return () => { cancelled = true }
  }, [orgId, tick])

  return (
    <RefreshCtx.Provider value={refresh}>
      <OrgUsersCtx.Provider value={users}>{children}</OrgUsersCtx.Provider>
    </RefreshCtx.Provider>
  )
}

async function injectCurrentUser(orgId) {
  const fallback = getUsersForOrg(orgId)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fallback
    const memberships = await fetchMyMemberships()
    const membership = memberships.find(m => m.org_id === orgId)
    const me = {
      id: user.id,
      name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
      email: user.email ?? '',
      role: membership?.role ?? 'member',
      color: '#378ADD',
    }
    const existing = fallback.find(u => u.email === me.email)
    if (existing) {
      return fallback.map(u => u.email === me.email ? { ...u, id: me.id, role: me.role } : u)
    }
    return [me, ...fallback]
  } catch {
    return fallback
  }
}

export function useOrgUsers() {
  const users = useContext(OrgUsersCtx)
  return users ?? []
}

export function useRefreshOrgUsers() {
  return useContext(RefreshCtx)
}
