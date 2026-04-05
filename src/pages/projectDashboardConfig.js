/**
 * Project-level dashboard widget registry and default layout.
 *
 * Similar to dashboardConfig.js (Home level) but scoped to a
 * single project's metrics: WP progress, milestones, partners,
 * activity, task distribution, priority, and burndown.
 */

export const PROJECT_WIDGET_REGISTRY = [
  { id: 'wpProgress',    label: { it: 'Avanzamento WP',       en: 'WP progress' },        defaultSize: 'half' },
  { id: 'milestones',    label: { it: 'Prossime milestone',    en: 'Upcoming milestones' }, defaultSize: 'half' },
  { id: 'partners',      label: { it: 'Partner engagement',    en: 'Partner engagement' },  defaultSize: 'half' },
  { id: 'activity',      label: { it: 'Attività recente',      en: 'Recent activity' },     defaultSize: 'half' },
  { id: 'statusDist',    label: { it: 'Distribuzione stato',   en: 'Status distribution' }, defaultSize: 'half' },
  { id: 'byPriority',    label: { it: 'Per priorità',          en: 'By priority' },         defaultSize: 'half' },
  { id: 'burndown',      label: { it: 'Burndown',              en: 'Burndown' },            defaultSize: 'full' },
]

export const PROJECT_DEFAULT_LAYOUT = PROJECT_WIDGET_REGISTRY.map(w => ({
  id: w.id, visible: true, size: w.defaultSize,
}))
