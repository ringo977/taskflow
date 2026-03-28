import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toTask, toProject } from '@/lib/db/adapters'

/**
 * useRealtimeSync
 *
 * Subscribe to realtime changes for an org's tasks, projects, and comments.
 *
 * Strategy:
 *   UPDATE  → targeted in-place patch via toTask/toProject adapters
 *   DELETE  → remove from state directly
 *   INSERT  → fetch the single new record (with relations) and append to state
 *   Comment → fetch updated comment list for the parent task
 *
 * Full reload is the last-resort fallback for any unrecoverable case.
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

    // ── Helpers ──────────────────────────────────────────────────

    /** Fetch a single task by ID with subtasks, comments, and deps. */
    const fetchSingleTask = async (taskId) => {
      const [
        { data: row },
        { data: subs },
        { data: cmts },
        { data: depRows },
      ] = await Promise.all([
        supabase.from('tasks').select('*').eq('id', taskId).maybeSingle(),
        supabase.from('subtasks').select('*').eq('task_id', taskId).order('position'),
        supabase.from('comments').select('*').eq('task_id', taskId).order('created_at'),
        supabase.from('task_dependencies').select('depends_on_id').eq('task_id', taskId),
      ])
      if (!row) return null
      const secRows = secRowsRef?.current ?? []
      const secName = secRows.find(s => s.id === row.section_id)?.name ?? ''
      const mappedSubs = (subs ?? []).map(s => ({ id: s.id, t: s.title, done: s.done }))
      const mappedCmts = (cmts ?? []).map(c => ({
        id: c.id, who: c.author_name, txt: c.body, d: c.created_at?.slice(0, 10),
      }))
      const mappedDeps = (depRows ?? []).map(d => d.depends_on_id)
      return toTask(row, secName, mappedSubs, mappedCmts, mappedDeps)
    }

    /** Fetch a single project by ID with member names. */
    const fetchSingleProject = async (projectId) => {
      const [{ data: row }, { data: taskRows }] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
        supabase.from('tasks').select('assignee_name').eq('project_id', projectId).is('deleted_at', null),
      ])
      if (!row) return null
      const members = [...new Set((taskRows ?? []).map(t => t.assignee_name).filter(Boolean))]
      return toProject(row, members)
    }

    // ── Task handler ────────────────────────────────────────────
    const handleTask = async (payload) => {
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
          return toTask(row, secName, t.subs, t.cmts, t.deps)
        }))
        return
      }

      if (eventType === 'INSERT' && row?.id) {
        try {
          const task = await fetchSingleTask(row.id)
          if (task) {
            setTasks?.(prev => {
              // Guard against duplicates (e.g. optimistic local add)
              if (prev.some(t => t.id === task.id)) return prev
              return [...prev, task]
            })
            return
          }
        } catch (e) {
          console.warn('realtime INSERT task fetch failed, falling back to reload:', e)
        }
      }

      // Unrecoverable — full reload
      debouncedFullReload()
    }

    // ── Project handler ─────────────────────────────────────────
    const handleProject = async (payload) => {
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

      if (eventType === 'INSERT' && row?.id) {
        try {
          const proj = await fetchSingleProject(row.id)
          if (proj) {
            setProjs?.(prev => {
              if (prev.some(p => p.id === proj.id)) return prev
              return [...prev, proj]
            })
            return
          }
        } catch (e) {
          console.warn('realtime INSERT project fetch failed, falling back to reload:', e)
        }
      }

      debouncedFullReload()
    }

    // ── Comment handler: targeted patch for parent task ──────────
    const handleComment = async (payload) => {
      const { new: row, old } = payload
      const taskId = row?.task_id ?? old?.task_id
      if (taskId) {
        try {
          const { data: cmts } = await supabase
            .from('comments').select('*')
            .eq('task_id', taskId).order('created_at')
          const mappedCmts = (cmts ?? []).map(c => ({
            id: c.id, who: c.author_name, txt: c.body, d: c.created_at?.slice(0, 10),
          }))
          setTasks?.(prev => prev.map(t => {
            if (t.id !== taskId) return t
            return { ...t, cmts: mappedCmts }
          }))
          return
        } catch (e) {
          console.warn('realtime comment fetch failed, falling back to reload:', e)
        }
      }
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
