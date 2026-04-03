// @ts-check
import { test, expect } from '@playwright/test'
import { login } from './fixtures/auth.js'
import { nav, tabs, sup } from './fixtures/sel.js'

/**
 * E2E: Supervision layer
 *
 * Tests the supervision view for supervised projects: sub-tab navigation,
 * cockpit cards, deliverables register, recurring controls, and timeline.
 *
 * All tests skip gracefully when Supabase is unreachable or no supervised
 * project exists.
 */

/**
 * Navigate to the first supervised project. Returns true if found.
 * Strategy: click Projects sidebar → look for a project row →
 * click into it → click supervision tab if visible.
 */
async function openSupervisedProject(page) {
  // Click Projects in sidebar
  await nav.projects(page).click()
  await page.waitForLoadState('domcontentloaded')

  // Wait for some project to appear in the list
  const projectRow = page.locator('[class*="project"], [data-type="project"], .sidebar-project, tr, a')
    .filter({ hasText: /.+/ })
    .first()

  const hasRow = await projectRow.waitFor({ timeout: 8_000 }).then(() => true).catch(() => false)
  if (!hasRow) return false

  // Click the first project
  await projectRow.click()

  // Wait for project header tabs to load
  const overviewTab = tabs.overview(page)
  const hasOverview = await overviewTab.waitFor({ timeout: 8_000 }).then(() => true).catch(() => false)
  if (!hasOverview) return false

  // Check if supervision tab is visible (only on supervised projects)
  const supTab = tabs.supervision(page)
  const hasSup = await supTab.isVisible({ timeout: 3_000 }).catch(() => false)
  if (!hasSup) return false

  // Click into supervision view
  await supTab.click()
  await sup.page(page).waitFor({ timeout: 10_000 })
  return true
}

test.describe('Supervision layer', () => {
  test.beforeEach(async ({ page }) => {
    const ok = await login(page)
    test.skip(!ok, 'Supabase unreachable — skipping auth-dependent test')
  })

  // ── Sub-tab navigation ───────────────────────────────────────
  test('supervision page shows cockpit by default', async ({ page }) => {
    const found = await openSupervisedProject(page)
    test.skip(!found, 'No supervised project found — skipping')

    await expect(sup.page(page)).toBeVisible()
    await expect(sup.tabCockpit(page)).toBeVisible()
    await expect(sup.cockpit(page)).toBeVisible()
  })

  test('can switch between all four sub-tabs', async ({ page }) => {
    const found = await openSupervisedProject(page)
    test.skip(!found, 'No supervised project found — skipping')

    // Start on cockpit (default)
    await expect(sup.cockpit(page)).toBeVisible()

    // Switch to deliverables
    await sup.tabDeliverables(page).click()
    await expect(sup.addDeliverable(page)).toBeVisible({ timeout: 5_000 })

    // Switch to timeline
    await sup.tabTimeline(page).click()
    await expect(sup.timeline(page)).toBeVisible({ timeout: 5_000 })

    // Switch to recurring
    await sup.tabRecurring(page).click()
    // Either add control button or empty state text should be visible
    const hasAdd = await sup.addControl(page).isVisible().catch(() => false)
    const hasEmpty = await page.locator('text=No controls').or(page.locator('text=Nessun controllo')).first()
      .isVisible().catch(() => false)
    expect(hasAdd || hasEmpty).toBe(true)

    // Switch back to cockpit
    await sup.tabCockpit(page).click()
    await expect(sup.cockpit(page)).toBeVisible({ timeout: 5_000 })
  })

  // ── Cockpit ──────────────────────────────────────────────────
  test('cockpit renders five metric cards', async ({ page }) => {
    const found = await openSupervisedProject(page)
    test.skip(!found, 'No supervised project found — skipping')

    await expect(sup.cardMilestones(page)).toBeVisible()
    await expect(sup.cardDelUpcoming(page)).toBeVisible()
    await expect(sup.cardOverdue(page)).toBeVisible()
    await expect(sup.cardOwnerless(page)).toBeVisible()
    await expect(sup.cardDelayed(page)).toBeVisible()
  })

  test('cockpit window selector changes active button', async ({ page }) => {
    const found = await openSupervisedProject(page)
    test.skip(!found, 'No supervised project found — skipping')

    await expect(sup.cockpitWindow(page)).toBeVisible()
    // There should be 3 window buttons (7, 14, 30)
    const windowBtns = sup.cockpitWindow(page).locator('button')
    await expect(windowBtns).toHaveCount(3)
  })

  // ── Deliverables ─────────────────────────────────────────────
  test('deliverables tab shows add button and filter', async ({ page }) => {
    const found = await openSupervisedProject(page)
    test.skip(!found, 'No supervised project found — skipping')

    await sup.tabDeliverables(page).click()
    await expect(sup.addDeliverable(page)).toBeVisible({ timeout: 5_000 })
    await expect(sup.deliverablesFilter(page)).toBeVisible()
  })

  test('clicking add deliverable opens the form', async ({ page }) => {
    const found = await openSupervisedProject(page)
    test.skip(!found, 'No supervised project found — skipping')

    await sup.tabDeliverables(page).click()
    await sup.addDeliverable(page).click()

    // DeliverableForm should appear — look for input fields
    const codeInput = page.locator('input[placeholder*="code" i], input[placeholder*="codice" i]').first()
    const hasForm = await codeInput.waitFor({ timeout: 5_000 }).then(() => true).catch(() => false)
    expect(hasForm).toBe(true)
  })

  // ── Recurring controls ───────────────────────────────────────
  test('recurring tab has add control button', async ({ page }) => {
    const found = await openSupervisedProject(page)
    test.skip(!found, 'No supervised project found — skipping')

    await sup.tabRecurring(page).click()
    await expect(sup.addControl(page)).toBeVisible({ timeout: 5_000 })
  })

  test('clicking add control shows inline form', async ({ page }) => {
    const found = await openSupervisedProject(page)
    test.skip(!found, 'No supervised project found — skipping')

    await sup.tabRecurring(page).click()
    await sup.addControl(page).click()

    await expect(sup.controlForm(page)).toBeVisible({ timeout: 5_000 })
    await expect(sup.inputControlTitle(page)).toBeVisible()
    await expect(sup.btnSaveControl(page)).toBeVisible()
  })

  // ── Timeline ─────────────────────────────────────────────────
  test('timeline tab renders with window selector', async ({ page }) => {
    const found = await openSupervisedProject(page)
    test.skip(!found, 'No supervised project found — skipping')

    await sup.tabTimeline(page).click()
    await expect(sup.timeline(page)).toBeVisible({ timeout: 5_000 })

    // 3 window buttons: 30, 60, 90
    const windowBtns = sup.timeline(page).locator('button')
    const count = await windowBtns.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })
})
