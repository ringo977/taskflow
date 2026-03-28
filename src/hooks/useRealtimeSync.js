import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toTask, toProject } from '@/lib/db/adapters'

/**
 * useRealtimeSync
 *
 * Subscribe to realtime changes for an org's tasks, projects, and comments.
 * Applies targeted patches when possible (UPDATE/DELETE), and falls back
 * to a full org reload for INSERTs or when data can't be reconstructed
 * from the payload alone.
 *
 * @param {string} orgId - current org
 * @param {Object} opts
 * @param {Function} opts.onFullReload - callback for full data reload (fallback)
 * @param {Function} opts.setTasks - task state setter
 * @param {Function} opts.setProjs - project state setter
 * @param {Object}   opts.secRowsRef - ref to cached section rows
 */
export function useRealtimeSync(orgId, { onFullReload, setTasks, setProjs, secRowsRef }) {
  const timer = useRef(null)

  const debouncedFullReload = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onFullReload?.(), 800)
  }, [onFullReload])

  useEffect(() => {
    if (!orgId) return

    // ── Task handler: patch for UPDATE/DELETE, reload for INSERT ──
    const handleTask = (payload) => {
      const { eventType, new: row, old } = payload

      if (eventType === 'DELETE' && old?.id) {
        setTasks?.(prev => prev.filter(t => t.id !== old.id))
        return
      }

      if (eventType === 'UPDATE' && row) {
        const secRows = secRowsRef?.current ?? []
        const secName = secRows.find(s => s.id === row.section_id)?.name ?? ''
        setTasks?.(prev => prev.map(t => {
          if (t.id !== row.id) return t
          // Merge DB scalars from payload, preserve local subs/cmts/deps
          const patched = toTask(row, secName, t.subs, t.cmts, t.deps)
          return patched
        }))
        return
      }

      // INSERT or unrecognized — full reload to get related data
      debouncedFullReload()
    }

    // ── Project handler ─────────────────────────────────────────
    const handleProject = (payload) => {
      const { eventType, new: row, old } = payload

      if (eventType === 'DELETE' && old?.id) {
        setProjs?.(prev => prev.filter(p => p.id !== old.id))
        return
      }

      if (eventType === 'UPDATE' && row) {
        setProjs?.(prev => prev.map(p => {
          if (p.id !== row.id) return p
          return toProject(row, p.members) // keep existing member list
        }))
        return
      }

      debouncedFullReload()
    }

    // ── Comment handler: always reload to update task.cmts ──────
    const handleComment = () => {
      debouncedFullReload()
    }

    const channel = supabase
      .channel(`org-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `org_id=eq.${orgId}` }, handleTask)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `org_id=eq.${orgId}` }, handleProject)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `org_id=eq.${orgId}` }, handleComment)
      .subscribe()

    return () => {
      clearTimeout(timer.current)
      supabase.removeChannel(channel)
    }
  }, [orgId, setTasks, setProjs, secRowsRef, debouncedFullReload])
}
