import { useCallback } from 'react'
import { generateSubtasks, createTaskFromText, summariseProject, AI_ERROR_MESSAGES } from '@/utils/ai'

/**
 * useAIActions
 *
 * Encapsulates all AI-driven operations: subtask generation,
 * natural-language task creation, and project summary.
 *
 * Extracted from App.jsx to keep the orchestrator free of business logic.
 *
 * @param {Object} params
 * @param {Function} params.setAiLoad - AI loading state setter
 * @param {Function} params.setSummary - summary text setter
 * @param {Function} params.setShowSum - summary panel visibility setter
 * @param {Function} params.setShowAdd - add-task modal visibility setter
 * @param {Function} params.updTask - task update action
 * @param {Function} params.addTask - task creation action
 * @param {Function} params.toast - toast notification
 * @param {Object}   params.tr - translation strings
 * @param {string}   params.lang - current language
 */
export function useAIActions({
  setAiLoad, setSummary, setShowSum, setShowAdd,
  updTask, addTask, toast, tr, lang,
}) {
  /** Generate 3-5 AI subtasks and append to the task's existing list. */
  const genSubs = useCallback(async (task) => {
    setAiLoad(true)
    try {
      const arr = await generateSubtasks(task)
      const newSubs = [
        ...task.subs,
        ...arr.map((text, i) => ({ id: `ai${Date.now()}${i}`, t: text, done: false })),
      ]
      await updTask(task.id, { subs: newSubs })
      toast(tr.msgSubsGenerated(arr.length), 'success')
    } catch (e) {
      console.error('genSubs:', e)
      toast(e.code ? (AI_ERROR_MESSAGES[e.code] ?? tr.msgAIError) : tr.msgAIError, 'error')
    }
    setAiLoad(false)
  }, [setAiLoad, updTask, toast, tr])

  /** Extract task info from natural-language input and create a task. */
  const aiCreate = useCallback(async (input, sec, who, startDate, due) => {
    setAiLoad(true)
    try {
      const info = await createTaskFromText(input)
      await addTask({
        title: info.title, sec, who,
        startDate: startDate || null, due,
        pri: info.pri ?? 'medium',
      })
      setShowAdd(false)
    } catch (e) {
      console.error('aiCreate:', e)
      toast(e.code ? (AI_ERROR_MESSAGES[e.code] ?? tr.msgAIError) : tr.msgAIError, 'error')
    }
    setAiLoad(false)
  }, [setAiLoad, setShowAdd, addTask, toast, tr])

  /** Generate an AI summary for a project's task list. */
  const getSum = useCallback(async (projectName, projectTasks) => {
    setShowSum(true)
    setSummary(null)
    setAiLoad(true)
    try {
      setSummary(await summariseProject(projectName, projectTasks, lang))
    } catch {
      setSummary('Error.')
    }
    setAiLoad(false)
  }, [setAiLoad, setSummary, setShowSum, lang])

  return { genSubs, aiCreate, getSum }
}
