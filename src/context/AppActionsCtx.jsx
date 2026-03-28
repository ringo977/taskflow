import { createContext, useContext } from 'react'

const AppActionsCtx = createContext(null)

/** Provides all domain actions (task, project, section, AI) to the tree. */
export function AppActionsProvider({ actions, children }) {
  return <AppActionsCtx.Provider value={actions}>{children}</AppActionsCtx.Provider>
}

/** Consume the nearest AppActionsProvider. */
export function useAppActionsCtx() {
  const ctx = useContext(AppActionsCtx)
  if (!ctx) throw new Error('useAppActionsCtx must be used within AppActionsProvider')
  return ctx
}
