// @ts-check
import { test, expect } from '@playwright/test'
import { login } from './fixtures/auth.js'
import { openFirstProject } from './fixtures/helpers.js'

/**
 * E2E: Multi-assignee across views
 *
 * Sentinel test: verifies that tasks with multiple assignees
 * render correctly across different views without crashing.
 * This guards against regressions like the te.split bug.
 */

test.describe('Multi-assignee rendering', () => {
  test('Home dashboard renders without split errors', async ({ page }) => {
    const ok = await login(page)
    test.skip(!ok, 'Supabase unreachable — skipping auth-dependent test')

    // Collect any JS errors (register BEFORE navigation)
    const errors = []
    page.on('pageerror', e => errors.push(e.message))

    // Home is the default view after login
    await page.locator('text=Home').first().click()
    // Wait for dashboard to fully render (Customize button = lazy chunk loaded)
    await page.locator('button').filter({ hasText: /Customize|Personalizza/ })
      .waitFor({ timeout: 15_000 }).catch(() => {})

    // Dashboard should show widgets
    const content = await page.content()
    expect(content).toContain('Home')

    // No ".split is not a function" errors
    const splitErrors = errors.filter(e => e.includes('split is not a function'))
    expect(splitErrors).toHaveLength(0)
  })

  test('My Tasks view renders without errors', async ({ page }) => {
    const ok = await login(page)
    test.skip(!ok, 'Supabase unreachable — skipping auth-dependent test')

    const errors = []
    page.on('pageerror', e => errors.push(e.message))

    await page.locator('text=I miei task').or(page.locator('text=My Tasks')).first().click()
    await page.waitForLoadState('networkidle')

    // Should show the my tasks view (possibly empty)
    expect(errors.filter(e => e.includes('split'))).toHaveLength(0)
  })

  test('People view renders without errors', async ({ page }) => {
    const ok = await login(page)
    test.skip(!ok, 'Supabase unreachable — skipping auth-dependent test')

    const errors = []
    page.on('pageerror', e => errors.push(e.message))

    await page.locator('text=People').first().click()
    await page.waitForLoadState('networkidle')

    // Should render people cards
    expect(errors.filter(e => e.includes('split') || e.includes('not a function'))).toHaveLength(0)
  })

  test('Calendar view renders without errors', async ({ page }) => {
    const ok = await login(page)
    test.skip(!ok, 'Supabase unreachable — skipping auth-dependent test')

    const errors = []
    page.on('pageerror', e => errors.push(e.message))

    const hasProject = await openFirstProject(page)
    if (!hasProject) return

    // Switch to Calendar
    const calTab = page.locator('text=Calendar, text=Calendario').first()
    const hasCal = await calTab.isVisible().catch(() => false)
    if (hasCal) {
      await calTab.click()
      await page.waitForLoadState('networkidle')
    }

    expect(errors.filter(e => e.includes('split') || e.includes('not a function'))).toHaveLength(0)
  })

  test('Timeline view renders without errors', async ({ page }) => {
    const ok = await login(page)
    test.skip(!ok, 'Supabase unreachable — skipping auth-dependent test')

    const errors = []
    page.on('pageerror', e => errors.push(e.message))

    const hasProject = await openFirstProject(page)
    if (!hasProject) return

    // Switch to Timeline — use scrollIntoViewIfNeeded + force:true because
    // the header is a crowded flex row and the tab group can be clipped by
    // sibling elements in narrow CI viewports.
    const tlTab = page.locator('.view-tabs button').filter({ hasText: /^Timeline$/ }).first()
    const hasTl = await tlTab.isVisible().catch(() => false)
    if (hasTl) {
      await tlTab.scrollIntoViewIfNeeded()
      await tlTab.click({ force: true })
      await page.waitForLoadState('networkidle')
    }

    expect(errors.filter(e => e.includes('split') || e.includes('not a function'))).toHaveLength(0)
  })
})
