import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getUsersForOrg } from '@/data/users'
import { fetchOrgDirectory } from '@/lib/db'

const OrgUsersCtx = createContext(null)
const RefreshCtx = createContext(() => {})

export function OrgUsersProvider({ orgId, children }) {
  const [users, setUsers] = useState(() => getUsersForOrg(orgId))
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(n => n + 1), [])

  useEffect(() => {
    setUsers(getUsersForOrg(orgId))
    let cancelled = false
    fetchOrgDirectory(orgId)
      .then(rows => {
        if (cancelled) return
        if (rows?.length) setUsers(rows)
      })
      .catch(() => {
        if (cancelled) return
        setUsers(getUsersForOrg(orgId))
      })
    return () => { cancelled = true }
  }, [orgId, tick])

  return (
    <RefreshCtx.Provider value={refresh}>
      <OrgUsersCtx.Provider value={users}>{children}</OrgUsersCtx.Provider>
    </RefreshCtx.Provider>
  )
}

export function useOrgUsers() {
  const users = useContext(OrgUsersCtx)
  return users ?? []
}

export function useRefreshOrgUsers() {
  return useContext(RefreshCtx)
}
