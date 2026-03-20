import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Subscribe to realtime changes for an org's tasks and projects.
 * Debounces rapid bursts into a single reload.
 */
export function useRealtimeSync(orgId, onReload) {
  const timer = useRef(null)

  useEffect(() => {
    if (!orgId || !onReload) return

    const debouncedReload = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => onReload(), 800)
    }

    const channel = supabase
      .channel(`org-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `org_id=eq.${orgId}` }, debouncedReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `org_id=eq.${orgId}` }, debouncedReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `org_id=eq.${orgId}` }, debouncedReload)
      .subscribe()

    return () => {
      clearTimeout(timer.current)
      supabase.removeChannel(channel)
    }
  }, [orgId, onReload])
}
