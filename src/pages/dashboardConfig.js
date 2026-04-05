/**
 * Dashboard widget registry and default layout — shared by
 * HomeDashboard (layout state) and DashboardWidgetGrid (rendering).
 *
 * Extracted to its own module so the static import doesn't pull
 * DashboardWidgetGrid into the HomeDashboard chunk.
 */

export const WIDGET_REGISTRY = [
  { id: 'deadlines', label: { it: 'Scadenze in arrivo', en: 'Upcoming deadlines' }, defaultSize: 'half' },
  { id: 'activity', label: { it: 'Attività recente', en: 'Recent activity' }, defaultSize: 'half' },
  { id: 'health', label: { it: 'Salute progetti', en: 'Project health' }, defaultSize: 'full' },
  { id: 'tasksPerson', label: { it: 'Task per persona', en: 'Tasks per person' }, defaultSize: 'half' },
  { id: 'byPriority', label: { it: 'Per priorità', en: 'By priority' }, defaultSize: 'half' },
  { id: 'activityChart', label: { it: 'Attività 2 settimane', en: 'Activity 2 weeks' }, defaultSize: 'full' },
  { id: 'progress', label: { it: 'Progresso progetti', en: 'Project progress' }, defaultSize: 'full' },
  { id: 'burndown', label: { it: 'Burndown', en: 'Burndown' }, defaultSize: 'full' },
  { id: 'statusDist', label: { it: 'Per stato', en: 'By status' }, defaultSize: 'half' },
  { id: 'velocity', label: { it: 'Velocità', en: 'Velocity' }, defaultSize: 'half' },
  { id: 'overdueProj', label: { it: 'Scaduti per progetto', en: 'Overdue by project' }, defaultSize: 'half' },
  { id: 'workload', label: { it: 'Carico lavoro', en: 'Workload' }, defaultSize: 'half' },
  { id: 'sectionCompletion', label: { it: 'Completamento sezioni', en: 'Section completion' }, defaultSize: 'half' },
  { id: 'tasksPartner', label: { it: 'Task per partner', en: 'Tasks per partner' }, defaultSize: 'half' },
  { id: 'tasksWorkpackage', label: { it: 'Task per workpackage', en: 'Tasks per workpackage' }, defaultSize: 'half' },
  { id: 'tasksMilestone', label: { it: 'Task per milestone', en: 'Tasks per milestone' }, defaultSize: 'half' },
  { id: 'upcomingMilestones', label: { it: 'Milestone imminenti', en: 'Upcoming milestones' }, defaultSize: 'full' },
]

export const DEFAULT_LAYOUT = WIDGET_REGISTRY.map(w => ({ id: w.id, visible: true, size: w.defaultSize }))
