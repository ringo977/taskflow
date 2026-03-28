import { useCallback } from 'react'
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
import { PROJECT_TEMPLATES } from '@/constants'

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
        resources: []
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
        await addProjectMember(id, user.id, 'owner').catch(() => {})
        setMyProjectRoles(prev => ({ ...prev, [id]: 'owner' }))
        await upsertSections(activeOrgId, id, secNames)
        secRowsRef.current = await fetchSectionRows(activeOrgId)
        for (const tk of tplTasks) await upsertTask(activeOrgId, tk, secRowsRef.current)
        toast(tr.msgProjectCreated(name), 'success')
        inbox.push({
          type: 'project_created',
          actor: user.name,
          message: tr.msgDidCreateProject(name)
        })
      } catch (e) {
        console.error('addProject:', e)
        toast(tr.msgSaveError, 'error')
      }
    },
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
        console.error('addPortfolio:', e)
        toast(tr.msgSaveError, 'error')
      }
    },
    [activeOrgId, setPorts, toast, tr]
  )

  const delProject = useCallback(
    async (id) => {
      const p = projs.find(p => p.id === id)
      setProjs(prev => prev.filter(p => p.id !== id))
      setTasks(prev => prev.filter(t => t.pid !== id))
      setSecs(prev => {
        const n = { ...prev }
        delete n[id]
        return n
      })
      if (pid === id) {
        setPid(null)
        setSelId(null)
      }
      try {
        await dbDeleteProject(activeOrgId, id)
        toast(tr.msgDeleted(p?.name ?? 'Project'), 'success')
      } catch (e) {
        console.error('delProject:', e)
        toast(tr.msgSaveError, 'error')
      }
    },
    [projs, setProjs, setTasks, setSecs, pid, setPid, setSelId, activeOrgId, toast, tr]
  )

  const delPortfolio = useCallback(
    async (id) => {
      const po = ports.find(p => p.id === id)
      setPorts(prev => prev.filter(p => p.id !== id))
      setProjs(prev =>
        prev.map(p => (p.portfolio === id ? { ...p, portfolio: null } : p))
      )
      try {
        await dbDeletePortfolio(activeOrgId, id)
        toast(tr.msgDeleted(po?.name ?? 'Portfolio'), 'success')
      } catch (e) {
        console.error('delPortfolio:', e)
        toast(tr.msgSaveError, 'error')
      }
    },
    [ports, setPorts, setProjs, activeOrgId, toast, tr]
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
    [projs, toast, tr]
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
        console.error('archivePortfolio:', e)
      }
    },
    [ports, setPorts, activeOrgId, toast, tr]
  )

  const updProj = useCallback(
    async (id, patch) => {
      setProjs(p => p.map(proj => (proj.id === id ? { ...proj, ...patch } : proj)))
      try {
        const updated = projs.find(p => p.id === id)
        if (updated) await upsertProject(activeOrgId, { ...updated, ...patch })
      } catch (e) {
        console.error('updProj:', e)
      }
    },
    [projs, setProjs, activeOrgId]
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
