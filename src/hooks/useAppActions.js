import { logger } from '@/utils/logger'
import { useTaskActions } from '@/hooks/useTaskActions'
import { useProjectActions } from '@/hooks/useProjectActions'
import { useSectionActions } from '@/hooks/useSectionActions'
import { useAIActions } from '@/hooks/useAIActions'
import { useRuleEngine } from '@/hooks/useRuleEngine'

const log = logger('AppActions')

/**
 * useAppActions
 * Composes all domain-action hooks into one object and wires up the
 * rule-engine wrapper so consumers get `updTask` / `moveTask` that
 * automatically trigger automation evaluation.
 */
export function useAppActions({
  tasks, setTasks, projs, setProjs, ports, setPorts, secs, setSecs,
  activeOrgId, secRowsRef, user, pid, setPid, setNav, setSelId,
  myProjectRoles, setMyProjectRoles,
  toast, tr, inbox, pushUndo, lang,
  setAiLoad, setSummary, setShowSum, setShowAdd,
}) {
  // ── Raw task actions ──────────────────────────────────────
  const {
    updTask: rawUpdTask, togTask, moveTask: rawMoveTask,
    reorderTask, addTask, delTask,
  } = useTaskActions({
    tasks, setTasks, activeOrgId, secRowsRef, user, pid, toast, tr, inbox, pushUndo,
  })

  // ── Project & portfolio actions ───────────────────────────
  const projectActions = useProjectActions({
    projs, setProjs, ports, setPorts, secs, setSecs, tasks, setTasks,
    activeOrgId, secRowsRef, user, pid, setPid, setNav, setSelId,
    myProjectRoles, setMyProjectRoles, toast, tr, inbox,
  })

  // ── Rule engine (wraps updTask / moveTask) ────────────────
  const { evaluateTaskChange } = useRuleEngine({
    projects: projs, tasks, updTask: rawUpdTask, toast, inbox, _tr: tr, moveTask: rawMoveTask,
  })

  const updTask = (id, patch) => {
    const prev = tasks.find(t => t.id === id)
    rawUpdTask(id, patch)
    try { if (prev) evaluateTaskChange(id, patch, prev) }
    catch (e) { log.error('updTask rule eval failed:', e) }
  }
  const moveTask = (id, sec) => {
    const prev = tasks.find(t => t.id === id)
    rawMoveTask(id, sec)
    try { if (prev && prev.sec !== sec) evaluateTaskChange(id, { sec }, prev) }
    catch (e) { log.error('moveTask rule eval failed:', e) }
  }

  // ── Section actions ───────────────────────────────────────
  const { handleUpdateSecs } = useSectionActions({ setSecs, pid, activeOrgId, secRowsRef, toast })

  // ── AI actions ────────────────────────────────────────────
  const { genSubs, aiCreate, getSum } = useAIActions({
    setAiLoad, setSummary, setShowSum, setShowAdd,
    updTask, addTask, toast, tr, lang,
  })

  return {
    // task
    updTask, togTask, moveTask, reorderTask, addTask, delTask,
    // project & portfolio
    ...projectActions,
    // sections
    handleUpdateSecs,
    // AI
    genSubs, aiCreate, getSum,
  }
}
