import { createContext, useContext, useState, useCallback } from 'react'
import { oget, oset } from '@/constants'

const InboxCtx = createContext(null)

const MAX_ITEMS = 100

export function InboxProvider({ orgId, children }) {
  const [items, setItems] = useState(() => oget(orgId, 'inbox', []))
  const [unread, setUnread] = useState(() => items.filter(i => !i.read).length)

  const push = useCallback((item) => {
    const entry = {
      id: `n${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
      ...item,
    }
    setItems(prev => {
      const next = [entry, ...prev].slice(0, MAX_ITEMS)
      oset(orgId, 'inbox', next)
      return next
    })
    setUnread(n => n + 1)
  }, [orgId])

  const markRead = useCallback((id) => {
    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, read: true } : i)
      oset(orgId, 'inbox', next)
      return next
    })
    setUnread(n => Math.max(0, n - 1))
  }, [orgId])

  const markAllRead = useCallback(() => {
    setItems(prev => {
      const next = prev.map(i => ({ ...i, read: true }))
      oset(orgId, 'inbox', next)
      return next
    })
    setUnread(0)
  }, [orgId])

  return (
    <InboxCtx.Provider value={{ items, unread, push, markRead, markAllRead }}>
      {children}
    </InboxCtx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useInbox() {
  return useContext(InboxCtx) ?? { items: [], unread: 0, push: () => {}, markRead: () => {}, markAllRead: () => {} }
}
