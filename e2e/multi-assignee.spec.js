// @ts-check
import { test, expect } from '@playwright/test'
import { login } from './fixtures/auth.js'
import { openFirstProject } from './fixtures/helpers.js'
import { nav, btn, tabs } from './fixtures/sel.js'

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

    await nav.home(page).click()
    await btn.customize(page).waitFor({ timeout: 15_000 }).catch(() => {})

    const content = await page.content()
    expect(content).toContain('Home')
    const splitErrors = errors.filter(e => e.includes('split is not a function'))
    expect(splitErrors).toHaveLength(0)
  })

  test('My Tasks view renders without errors', async ({ page }) => {
    const ok = await login(page)
    test.skip(!ok, 'Supabase unreachable — skipping auth-dependent test')

    const errors = []
    page.on('pageerror', e => errors.push(e.message))

    await nav.myTasks(page).click()
    await page.waitForLoadState('networkidle')
    expect(errors.filter(e => e.includes('split'))).toHaveLength(0)
  })

  test('People view renders without errors', async ({ page }) => {
    const ok = await login(page)
    test.skip(!ok, 'Supabase unreachable — skipping auth-dependent test')

    const errors = []
    page.on('pageerror', e => errors.push(e.message))

    await nav.people(page).click()
    await page.waitForLoadState('networkidle')
    expect(errors.filter(e => e.includes('split') || e.includes('not a function'))).toHaveLength(0)
  })

  test('Calendar view renders without errors', async ({ page }) => {
    const ok = await login(page)
    test.skip(!ok, 'Supabase unreachable — skipping auth-dependent test')

    const errors = []
    page.on('pageerror', e => errors.push(e.message))

    const hasProject = await openFirstProject(page)
    if (!hasProject) return

    const calTab = tabs.calendar(page)
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

    const tlTab = tabs.timeline(page)
    const hasTl = await tlTab.isVisible().catch(() => false)
    if (hasTl) {
      await tlTab.scrollIntoViewIfNeeded()
      await tlTab.click({ force: true })
      await page.waitForLoadState('networkidle')
    }

    expect(errors.filter(e => e.includes('split') || e.includes('not a function'))).toHaveLength(0)
  })
})
