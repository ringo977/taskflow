import { useCallback } from 'react'
import { logger } from '@/utils/logger'
import {
  upsertProject,
  upsertPortfolio,
  upsertSections,
  fetchSectionRows,
  deleteProject as dbDeleteProject,
  deletePortfolio as dbDeletePortfolio,
  addProjectMember,
  upsertTask
} from '@/lib/db'
import { upsertWorkpackage } from '@/lib/db/workpackages'
import { upsertMilestone } from '@/lib/db/milestones'
import { PROJECT_TEMPLATES } from '@/constants'

const log = logger('ProjectActions')

export const useProjectActions = ({
  projs,
  setProjs,
  ports,
  setPorts,
  secs,
  setSecs,
  tasks,
  setTasks,
  activeOrgId,
  secRowsRef,
  user,
  pid,
  setPid,
  setNav,
  setSelId,
  myProjectRoles,
  setMyProjectRoles,
  toast,
  tr,
  inbox
}) => {
  const addProject = useCallback(
    async (name, color, portfolio, template) => {
      const id = `p${Date.now()}`
      const tpl = template ? PROJECT_TEMPLATES.find(t => t.id === template) : null
      const secNames = tpl?.sections ?? ['To Do', 'In Progress', 'Done']
      const newProj = {
        id,
        name,
        color,
        members: [user.name],
        status: 'active',
        statusLabel: 'on_track',
        portfolio,
        description: tpl?.description ?? '',
        resources: [],
        customFields: tpl?.customFields ?? [],
        rules: tpl?.rules ?? [],
        forms: tpl?.forms ?? [],
        goals: tpl?.goals ?? [],
        partnerSuggestions: tpl?.partnerSuggestions ?? [],
      }
      setProjs(p => [...p, newProj])
      setSecs(s => ({ ...s, [id]: secNames }))
      const tplTasks = (tpl?.tasks ?? []).map((t, i) => ({
        id: `t${Date.now()}${i}`,
        pid: id,
        title: t.title,
        sec: t.sec,
        who: user.name,
        startDate: null,
        due: '',
        pri: t.pri ?? 'medium',
        desc: t.desc ?? '',
        done: false,
        subs: [],
        cmts: [],
        deps: [],
        tags: [],
        attachments: [],
        activity: [],
        position: i
      }))
      if (tplTasks.length) setTasks(prev => [...prev, ...tplTasks])
      setPid(id)
      setNav('projects')
      try {
        await upsertProject(activeOrgId, newProj)
        await addProjectMember(id, user.id, 'owner').catch(e => log.warn('Auto-add owner failed:', e.message))
        setMyProjectRoles(prev => ({ ...prev, [id]: 'owner' }))
        await upsertSections(activeOrgId, id, secNames)
        secRowsRef.current = await fetchSectionRows(activeOrgId)
        for (const tk of tplTasks) await upsertTask(activeOrgId, tk, secRowsRef.current)

        // ── Seed WP and MS from template ──────────────────────────
        const wpCodeToId = {}
        for (const [i, wpDef] of (tpl?.workpackages ?? []).entries()) {
          const wp = await upsertWorkpackage(activeOrgId, id, {
            code: wpDef.code, name: wpDef.name, status: wpDef.status ?? 'draft',
            description: wpDef.description ?? '', position: i,
          })
          if (wp?.id) wpCodeToId[wpDef.code] = wp.id
        }
        const msCodeToId = {}
        for (const [i, msDef] of (tpl?.milestones ?? []).entries()) {
          const ms = await upsertMilestone(activeOrgId, id, {
            code: msDef.code, name: msDef.name, status: msDef.status ?? 'draft',
            description: msDef.description ?? '', position: i,
            workpackageId: msDef.wpCode ? (wpCodeToId[msDef.wpCode] ?? null) : null,
          })
          if (ms?.id) msCodeToId[msDef.code] = ms.id
        }

        // ── Link template tasks to WP/MS via code lookup ──────────
        if (Object.keys(wpCodeToId).length || Object.keys(msCodeToId).length) {
          const { updateTaskField } = await import('@/lib/db/tasks')
          for (const tk of tplTasks) {
            const tDef = tpl.tasks.find(t => t.title === tk.title)
            const wpId = tDef?.wpCode ? (wpCodeToId[tDef.wpCode] ?? null) : null
            const msId = tDef?.msCode ? (msCodeToId[tDef.msCode] ?? null) : null
            if (wpId || msId) {
              const patch = {}
              if (wpId) patch.workpackageId = wpId
              if (msId) patch.milestoneId = msId
              await updateTaskField(activeOrgId, tk.id, patch).catch(e =>
                log.warn('Template task link failed:', tk.title, e.message))
            }
          }
        }

        toast(tr.msgProjectCreated(name), 'success')
        inbox.push({
          type: 'project_created',
          actor: user.name,
          message: tr.msgDidCreateProject(name)
        })
      } catch (e) {
        log.error('addProject failed:', e)
        // Revert optimistic add
        setProjs(p => p.filter(proj => proj.id !== id))
        setSecs(s => { const n = { ...s }; delete n[id]; return n })
        if (tplTasks.length) setTasks(prev => prev.filter(t => t.pid !== id))
        toast(tr.msgSaveError, 'error')
      }
    },
    // Deps are manually managed: ESLint wants db functions (upsertProject,
    // addProjectMember, etc.) which are stable module imports. Listing them
    // would add noise without changing behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      projs,
      setProjs,
      secs,
      setSecs,
      tasks,
      setTasks,
      activeOrgId,
      secRowsRef,
      user,
      setPid,
      setNav,
      myProjectRoles,
      setMyProjectRoles,
      toast,
      tr,
      inbox
    ]
  )

  const addPortfolio = useCallback(
    async (name, color, desc) => {
      const newPort = { id: `po${Date.now()}`, name, color, desc }
      setPorts(p => [...p, newPort])
      try {
        await upsertPortfolio(activeOrgId, newPort)
        toast(tr.msgPortfolioCreated(name), 'success')
      } catch (e) {
        log.error('addPortfolio failed:', e)
        toast(tr.msgSaveError, 'error')
      }
    },
    [activeOrgId, setPorts, toast, tr]
  )

  const delProject = useCallback(
    async (id) => {
      const p = projs.find(proj => proj.id === id)
      const prevTasks = tasks.filter(t => t.pid === id)
      const prevSecs = secs[id]
      setProjs(prev => prev.filter(proj => proj.id !== id))
      setTasks(prev => prev.filter(t => t.pid !== id))
      setSecs(prev => { const n = { ...prev }; delete n[id]; return n })
      if (pid === id) { setPid(null); setSelId(null) }
      try {
        await dbDeleteProject(activeOrgId, id)
        toast(tr.msgDeleted(p?.name ?? 'Project'), 'success')
      } catch (e) {
        log.error('delProject failed:', e)
        // Revert optimistic delete
        if (p) setProjs(prev => [...prev, p])
        if (prevTasks.length) setTasks(prev => [...prev, ...prevTasks])
        if (prevSecs) setSecs(prev => ({ ...prev, [id]: prevSecs }))
        toast(tr.msgSaveError, 'error')
      }
    },
    [projs, tasks, secs, setProjs, setTasks, setSecs, pid, setPid, setSelId, activeOrgId, toast, tr]
  )

  const delPortfolio = useCallback(
    async (id) => {
      const po = ports.find(p => p.id === id)
      const prevProjs = projs.filter(p => p.portfolio === id)
      setPorts(prev => prev.filter(p => p.id !== id))
      setProjs(prev =>
        prev.map(p => (p.portfolio === id ? { ...p, portfolio: null } : p))
      )
      try {
        await dbDeletePortfolio(activeOrgId, id)
        toast(tr.msgDeleted(po?.name ?? 'Portfolio'), 'success')
      } catch (e) {
        log.error('delPortfolio failed:', e)
        // Revert optimistic delete
        if (po) setPorts(prev => [...prev, po])
        if (prevProjs.length) setProjs(prev => prev.map(p => {
          const orig = prevProjs.find(pp => pp.id === p.id)
          return orig ? { ...p, portfolio: id } : p
        }))
        toast(tr.msgSaveError, 'error')
      }
    },
    [projs, ports, setPorts, setProjs, activeOrgId, toast, tr]
  )

  const updProj = useCallback(
    async (id, patch) => {
      const prev = projs.find(p => p.id === id)
      setProjs(p => p.map(proj => (proj.id === id ? { ...proj, ...patch } : proj)))
      try {
        if (prev) await upsertProject(activeOrgId, { ...prev, ...patch })
      } catch (e) {
        log.error('updProj failed:', e)
        // Revert optimistic update
        if (prev) setProjs(p => p.map(proj => (proj.id === id ? prev : proj)))
        toast(tr.msgSaveError, 'error')
      }
    },
    [projs, setProjs, activeOrgId, toast, tr]
  )

  const archiveProject = useCallback(
    async (id) => {
      const p = projs.find(p => p.id === id)
      const newStatus = p?.status === 'archived' ? 'active' : 'archived'
      updProj(id, { status: newStatus })
      toast(
        newStatus === 'archived'
          ? tr.msgArchived(p?.name)
          : tr.msgUnarchived(p?.name),
        'success'
      )
    },
    [projs, toast, tr, updProj]
  )

  const archivePortfolio = useCallback(
    async (id) => {
      const po = ports.find(p => p.id === id)
      const newStatus = po?.status === 'archived' ? 'active' : 'archived'
      setPorts(prev =>
        prev.map(p => (p.id === id ? { ...p, status: newStatus } : p))
      )
      try {
        await upsertPortfolio(activeOrgId, { ...po, status: newStatus })
        toast(
          newStatus === 'archived'
            ? tr.msgArchived(po?.name)
            : tr.msgUnarchived(po?.name),
          'success'
        )
      } catch (e) {
        log.error('archivePortfolio failed:', e)
      }
    },
    [ports, setPorts, activeOrgId, toast, tr]
  )

  return {
    addProject,
    addPortfolio,
    delProject,
    delPortfolio,
    archiveProject,
    archivePortfolio,
    updProj
  }
}
