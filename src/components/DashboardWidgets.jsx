/**
 * DashboardWidgets — barrel re-exporting the dashboard widgets.
 *
 * Widgets were extracted into dedicated files under ./widgets/;
 * this file preserves the original public API so existing imports
 * (`@/components/DashboardWidgets`) keep working unchanged.
 */
export { SectionTitle, ChartTooltip } from './widgets/primitives'
export { DeadlinesWidget } from './widgets/DeadlinesWidget'
export { ActivityWidget } from './widgets/ActivityWidget'
export { HealthWidget } from './widgets/HealthWidget'
export { TasksPerPartnerWidget } from './widgets/TasksPerPartnerWidget'
export { TasksPerPersonWidget } from './widgets/TasksPerPersonWidget'
export { PriorityWidget } from './widgets/PriorityWidget'
export { ActivityChartWidget } from './widgets/ActivityChartWidget'
export { ProgressWidget } from './widgets/ProgressWidget'
export { BurndownWidget } from './widgets/BurndownWidget'
export { StatusDistWidget } from './widgets/StatusDistWidget'
export { VelocityWidget } from './widgets/VelocityWidget'
export { OverdueWidget } from './widgets/OverdueWidget'
export { WorkloadWidget } from './widgets/WorkloadWidget'
export { SectionCompletionWidget } from './widgets/SectionCompletionWidget'
export { TasksPerWorkpackageWidget } from './widgets/TasksPerWorkpackageWidget'
export { TasksPerMilestoneWidget } from './widgets/TasksPerMilestoneWidget'
export { UpcomingMilestonesWidget } from './widgets/UpcomingMilestonesWidget'
