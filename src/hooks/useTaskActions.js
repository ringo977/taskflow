import { useCallback } from 'react'
import { logger } from '@/utils/logger'
import { supabase } from '@/lib/supabase'
import {
  upsertTask,
  updateTaskField,
  moveTaskToSection as dbMoveTaskToSection,
  updateTaskDeps,
  updateTaskPositions,
  deleteTask as dbDeleteTask,
  addProjectMember,
} from '@/lib/db'

const log = logger('TaskActions')

/**
 * useTaskActions
 * Extracts all task CRUD operations from App.jsx
 *
 * @param {Object} params
 * @param {Array} params.tasks - current tasks array
 * @param {Function} params.setTasks - setter for tasks
 * @param {string} params.activeOrgId - current organization ID
 * @param {Object} params.secRowsRef - ref to cached section rows
 * @param {Object} params.user - current user object
 * @param {string} params.pid - currently selected project ID
 * @param {Function} params.toast - toast notification function
 * @param {Object} params.tr - translation object
 * @param {Object} params.inbox - inbox context with .push method
 * @param {Function} params.pushUndo - undo context push function
 *
 * @returns {Object} - { updTask, togTask, moveTask, reorderTask, addTask, delTask }
 */
export function useTaskActions({
  tasks,
  setTasks,
  activeOrgId,
  secRowsRef,
  user,
  pid,
  toast,
  tr,
  inbox,
  pushUndo,
}) {
  // ── Helper: Auto-add assignee to project if not a member ──
  const autoAddAssigneeToProject = useCallback(
    async (projectId, assigneeName) => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .or(`display_name.eq.${assigneeName},email.ilike.${assigneeName.split(' ')[0]}%`)
          .limit(1)
          .maybeSingle()
        if (data) await addProjectMember(projectId, data.id).catch(e => log.warn('Auto-add assignee failed:', e.message))
      } catch (e) { log.warn('autoAddAssigneeToProject lookup failed:', e.message) }
    },
    []
  )

  // ── CRUD — optimistic + persist ──────────────────────────────
  const updTask = useCallback(
    async (id, patch) => {
      const prev = tasks.find(t => t.id === id)
      const entries = []
      const who = user?.name ?? 'System'
      const ts = new Date().toISOString()
      if (prev) {
        const TRACK = ['title', 'desc', 'who', 'pri', 'due', 'startDate', 'sec', 'recurrence']
        for (const k of TRACK) {
          if (!(k in patch)) continue
          const same = k === 'who'
            ? JSON.stringify(patch[k] ?? []) === JSON.stringify(prev[k] ?? [])
            : patch[k] === prev[k]
          if (!same) entries.push({ ts, who, field: k, from: prev[k], to: patch[k] })
        }
        if ('tags' in patch) {
          const oldNames = (prev.tags ?? []).map(tg => tg.name).sort().join(',')
          const newNames = (patch.tags ?? []).map(tg => tg.name).sort().join(',')
          if (oldNames !== newNames)
            entries.push({ ts, who, field: 'tags', from: oldNames, to: newNames })
        }
        if ('done' in patch && patch.done !== prev.done)
          entries.push({ ts, who, field: 'done', from: prev.done, to: patch.done })
      }
      const activityPatch = entries.length ? { activity: [...(prev?.activity ?? []), ...entries] } : {}
      const fullPatch = { ...patch, ...activityPatch }

      setTasks(p => p.map(t => (t.id === id ? { ...t, ...fullPatch } : t)))
      try {
        if ('deps' in patch) {
          await updateTaskDeps(activeOrgId, id, patch.deps)
        }
        if ('subs' in patch || 'cmts' in patch) {
          const updated = tasks.find(t => t.id === id)
          if (updated) await upsertTask(activeOrgId, { ...updated, ...fullPatch }, secRowsRef.current)
        } else if (!('deps' in patch && Object.keys(patch).length === 1)) {
          await updateTaskField(activeOrgId, id, fullPatch)
        }
        if ('who' in patch && prev) {
          const newArr = Array.isArray(patch.who) ? patch.who : patch.who ? [patch.who] : []
          const oldArr = Array.isArray(prev.who) ? prev.who : prev.who ? [prev.who] : []
          const added = newArr.filter(n => !oldArr.includes(n))
          for (const name of added) {
            autoAddAssigneeToProject(prev.pid, name)
          }
          if (JSON.stringify(newArr) !== JSON.stringify(oldArr)) {
            inbox.push({
              type: 'task_assigned',
              actor: user?.name ?? 'System',
              message: tr.msgDidAssign?.(prev.title, newArr.join(', ')) ?? `assigned "${prev.title}" to ${newArr.join(', ')}`,
              taskId: id,
            })
          }
        }
        // Notification: comment with @mentions
        if ('cmts' in patch && prev) {
          const newCmts = (patch.cmts ?? []).slice((prev.cmts ?? []).length)
          for (const c of newCmts) {
            const mentions = (c.txt ?? '').match(/@(\S+)/g) ?? []
            if (mentions.length > 0) {
              inbox.push({
                type: 'task_mentioned',
                actor: c.who ?? user?.name ?? 'System',
                message: tr.msgDidMention?.(prev.title, mentions.join(', ')) ?? `mentioned ${mentions.join(', ')} in "${prev.title}"`,
                detail: c.txt?.slice(0, 80),
                taskId: id,
              })
            } else {
              inbox.push({
                type: 'comment_added',
                actor: c.who ?? user?.name ?? 'System',
                message: tr.msgDidComment?.(prev.title) ?? `commented on "${prev.title}"`,
                detail: c.txt?.slice(0, 80),
                taskId: id,
              })
            }
          }
        }
      } catch (e) {
        log.error('updTask failed:', e)
        // Revert optimistic update
        if (prev) setTasks(p => p.map(t => (t.id === id ? prev : t)))
        toast(tr.msgSaveError, 'error')
      }
    },
    [tasks, setTasks, activeOrgId, secRowsRef, user, autoAddAssigneeToProject, toast, tr, inbox]
  )

  const togTask = useCallback(
    async (id) => {
      const task = tasks.find(t => t.id === id)
      if (!task) return
      const done = !task.done
      const prevDone = task.done
      setTasks(p => p.map(t => (t.id === id ? { ...t, done } : t)))
      pushUndo(
        done ? tr.msgTaskCompleted(task.title) : tr.msgTaskReopened(task.title),
        () => {
          setTasks(p => p.map(t => (t.id === id ? { ...t, done: prevDone } : t)))
          updateTaskField(activeOrgId, id, { done: prevDone }).catch(e => log.error('Undo togTask failed:', e))
        }
      )
      try {
        await updateTaskField(activeOrgId, id, { done })
        inbox.push({
          type: done ? 'task_completed' : 'task_reopened',
          actor: user.name,
          message: done ? tr.msgDidComplete(task.title) : tr.msgDidReopen(task.title),
          taskId: id,
        })
        // Notification: dependency resolved — notify tasks blocked by this one
        if (done) {
          const blocked = tasks.filter(t => (t.deps ?? []).includes(id) && !t.done)
          for (const bt of blocked) {
            inbox.push({
              type: 'dep_resolved',
              actor: user.name,
              message: tr.msgDepResolved?.(task.title, bt.title) ?? `"${task.title}" completed — "${bt.title}" unblocked`,
              taskId: bt.id,
            })
          }
        }
      } catch (e) {
        log.error('togTask failed:', e)
        // Revert optimistic update
        setTasks(p => p.map(t => (t.id === id ? { ...t, done: prevDone } : t)))
        toast(tr.msgSaveError, 'error')
      }
    },
    [tasks, setTasks, activeOrgId, user, tr, inbox, pushUndo, toast]
  )

  const moveTask = useCallback(
    async (id, sec) => {
      const task = tasks.find(t => t.id === id)
      if (!task || task.sec === sec) return
      const prevSec = task.sec
      setTasks(p => p.map(t => (t.id === id ? { ...t, sec } : t)))
      pushUndo(
        tr.msgTaskMoved(task.title, sec),
        () => {
          setTasks(p => p.map(t => (t.id === id ? { ...t, sec: prevSec } : t)))
          dbMoveTaskToSection(activeOrgId, id, prevSec, task.pid, secRowsRef.current).catch(e =>
            log.error('Undo moveTask failed:', e)
          )
        }
      )
      try {
        await dbMoveTaskToSection(activeOrgId, id, sec, task.pid, secRowsRef.current)
      } catch (e) {
        log.error('moveTask failed:', e)
        // Revert optimistic update
        setTasks(p => p.map(t => (t.id === id ? { ...t, sec: prevSec } : t)))
        toast(tr.msgSaveError, 'error')
      }
    },
    [tasks, setTasks, activeOrgId, tr, secRowsRef, pushUndo, toast]
  )

  const reorderTask = useCallback(
    (id, sec, newIndex) => {
      setTasks(prev => {
        const task = prev.find(t => t.id === id)
        if (!task) return prev
        const inSec = prev.filter(t => t.sec === sec && t.pid === task.pid && t.id !== id)
        const others = prev.filter(t => !(t.sec === sec && t.pid === task.pid) && t.id !== id)
        const reordered = [...inSec.slice(0, newIndex), { ...task, sec }, ...inSec.slice(newIndex)]
          .map((t, i) => ({ ...t, position: i }))
        updateTaskPositions(reordered.map(t => ({ id: t.id, position: t.position }))).catch(e =>
          log.error('reorder failed:', e)
        )
        return [...others, ...reordered]
      })
    },
    [setTasks]
  )

  const addTask = useCallback(
    async ({ title, sec, who, startDate, due, pri }) => {
      const newTask = {
        id: `t${Date.now()}`,
        pid,
        title,
        sec,
        who,
        startDate: startDate || null,
        due,
        pri,
        desc: '',
        subs: [],
        cmts: [],
        deps: [],
        done: false,
      }
      setTasks(p => [...p, newTask])
      try {
        await upsertTask(activeOrgId, newTask, secRowsRef.current)
        toast(tr.msgTaskCreated(title), 'success')
        inbox.push({
          type: 'task_created',
          actor: user.name,
          message: tr.msgDidCreate(title),
          taskId: newTask.id,
        })
      } catch (e) {
        log.error('addTask failed:', e)
        // Revert optimistic add
        setTasks(p => p.filter(t => t.id !== newTask.id))
        toast(tr.msgSaveError, 'error')
      }
    },
    [pid, setTasks, activeOrgId, secRowsRef, user, toast, tr, inbox]
  )

  const delTask = useCallback(
    async (id) => {
      const task = tasks.find(t => t.id === id)
      setTasks(p => p.filter(t => t.id !== id))
      try {
        await dbDeleteTask(activeOrgId, id)
        toast(tr.msgDeleted(task?.title ?? 'Task'), 'success')
      } catch (e) {
        log.error('delTask failed:', e)
        // Revert optimistic delete
        if (task) setTasks(p => [...p, task])
        toast(tr.msgSaveError, 'error')
      }
    },
    [tasks, setTasks, activeOrgId, toast, tr]
  )

  return {
    updTask,
    togTask,
    moveTask,
    reorderTask,
    addTask,
    delTask,
  }
}
