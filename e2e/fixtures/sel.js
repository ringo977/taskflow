/**
 * Shared E2E selectors — single source of truth for data-testid locators.
 *
 * Prefer `tid()` over text/class selectors: test IDs survive i18n changes,
 * CSS refactors, and label rewording.
 */

/** Build a data-testid locator */
export const tid = (page, id) => page.locator(`[data-testid="${id}"]`)

// ── Sidebar navigation ─────────────────────────────────────────
export const nav = {
  home:       (page) => tid(page, 'nav-home'),
  projects:   (page) => tid(page, 'nav-projects'),
  portfolios: (page) => tid(page, 'nav-portfolios'),
  myTasks:    (page) => tid(page, 'nav-mytasks'),
  people:     (page) => tid(page, 'nav-people'),
  inbox:      (page) => tid(page, 'nav-inbox'),
  trash:      (page) => tid(page, 'nav-trash'),
}

// ── Login / MFA ────────────────────────────────────────────────
export const login = {
  email:      (page) => tid(page, 'input-email'),
  password:   (page) => tid(page, 'input-password'),
  submit:     (page) => tid(page, 'btn-submit'),
}

export const mfa = {
  input:      (page) => tid(page, 'input-mfa'),
  verify:     (page) => tid(page, 'btn-mfa-verify'),
}

// ── Project header ─────────────────────────────────────────────
export const tabs = {
  overview:    (page) => tid(page, 'tab-overview'),
  list:        (page) => tid(page, 'tab-lista'),
  board:       (page) => tid(page, 'tab-board'),
  timeline:    (page) => tid(page, 'tab-timeline'),
  calendar:    (page) => tid(page, 'tab-calendario'),
  supervision: (page) => tid(page, 'tab-supervision'),
}

// ── Supervision ───────────────────────────────────────────────
export const sup = {
  page:               (page) => tid(page, 'supervision-page'),
  tabCockpit:         (page) => tid(page, 'sup-tab-cockpit'),
  tabDeliverables:    (page) => tid(page, 'sup-tab-deliverables'),
  tabTimeline:        (page) => tid(page, 'sup-tab-timeline'),
  tabRecurring:       (page) => tid(page, 'sup-tab-recurring'),
  dueControlsBadge:   (page) => tid(page, 'due-controls-badge'),
  // cockpit
  cockpit:            (page) => tid(page, 'deadlines-cockpit'),
  cockpitWindow:      (page) => tid(page, 'cockpit-window-selector'),
  cardMilestones:     (page) => tid(page, 'card-milestones'),
  cardDelUpcoming:    (page) => tid(page, 'card-deliverables-upcoming'),
  cardOverdue:        (page) => tid(page, 'card-overdue'),
  cardOwnerless:      (page) => tid(page, 'card-ownerless'),
  cardDelayed:        (page) => tid(page, 'card-delayed'),
  // deliverables
  addDeliverable:     (page) => tid(page, 'btn-add-deliverable'),
  deliverablesFilter: (page) => tid(page, 'deliverables-filter'),
  deliverablesTable:  (page) => tid(page, 'deliverables-table'),
  // recurring
  addControl:         (page) => tid(page, 'btn-add-control'),
  controlForm:        (page) => tid(page, 'control-form'),
  inputControlTitle:  (page) => tid(page, 'input-control-title'),
  btnSaveControl:     (page) => tid(page, 'btn-save-control'),
  // timeline
  timeline:           (page) => tid(page, 'supervision-timeline'),
}

export const btn = {
  addTask:    (page) => tid(page, 'btn-add-task'),
  customize:  (page) => tid(page, 'btn-customize'),
  theme:      (page) => tid(page, 'btn-theme'),
  lang:       (page) => tid(page, 'btn-lang'),
  manual:     (page) => tid(page, 'btn-manual'),
  user:       (page) => tid(page, 'btn-user'),
}
