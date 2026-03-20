import { createContext, useContext, useState, useEffect } from 'react'
import { getUsersForOrg } from '@/data/users'
import { fetchOrgDirectory } from '@/lib/db'

const OrgUsersCtx = createContext(null)

export function OrgUsersProvider({ orgId, children }) {
  const [users, setUsers] = useState(() => getUsersForOrg(orgId))

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
  }, [orgId])

  return <OrgUsersCtx.Provider value={users}>{children}</OrgUsersCtx.Provider>
}

/** Team for the active org: loaded from Supabase (org_members + profiles), fallback to static seed in data/users.js */
export function useOrgUsers() {
  const users = useContext(OrgUsersCtx)
  return users ?? []
}
