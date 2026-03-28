import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { fetchOrgDirectory, fetchMyMemberships } from '@/lib/db'
import { supabase } from '@/lib/supabase'

const OrgUsersCtx = createContext(null)
const RefreshCtx = createContext(() => {})

export function OrgUsersProvider({ orgId, children }) {
  const [users, setUsers] = useState([])
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
          currentUserFallback(orgId).then(fb => !cancelled && setUsers(fb))
        }
      })
      .catch(() => {
        if (cancelled) return
        currentUserFallback(orgId).then(fb => !cancelled && setUsers(fb))
      })
    return () => { cancelled = true }
  }, [orgId, tick])

  return (
    <RefreshCtx.Provider value={refresh}>
      <OrgUsersCtx.Provider value={users}>{children}</OrgUsersCtx.Provider>
    </RefreshCtx.Provider>
  )
}

async function currentUserFallback(orgId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const memberships = await fetchMyMemberships()
    const membership = memberships.find(m => m.org_id === orgId)
    return [{
      id: user.id,
      name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
      email: user.email ?? '',
      role: membership?.role ?? 'member',
      color: '#378ADD',
    }]
  } catch {
    return []
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOrgUsers() {
  const users = useContext(OrgUsersCtx)
  return users ?? []
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRefreshOrgUsers() {
  return useContext(RefreshCtx)
}
