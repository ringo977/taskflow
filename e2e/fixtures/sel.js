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
  overview:   (page) => tid(page, 'tab-overview'),
  list:       (page) => tid(page, 'tab-lista'),
  board:      (page) => tid(page, 'tab-board'),
  timeline:   (page) => tid(page, 'tab-timeline'),
  calendar:   (page) => tid(page, 'tab-calendario'),
}

export const btn = {
  addTask:    (page) => tid(page, 'btn-add-task'),
  customize:  (page) => tid(page, 'btn-customize'),
  theme:      (page) => tid(page, 'btn-theme'),
  lang:       (page) => tid(page, 'btn-lang'),
  manual:     (page) => tid(page, 'btn-manual'),
  user:       (page) => tid(page, 'btn-user'),
}
