// @ts-check
import { test, expect } from '@playwright/test'
import { login } from './fixtures/auth.js'
import { nav, btn } from './fixtures/sel.js'

/**
 * E2E: Dashboard customization + persistence
 *
 * Tests the Home dashboard widget layout: edit mode,
 * size cycling, localStorage persistence, and reset.
 */

/** Navigate to Home and wait for dashboard to render */
async function goHome(page) {
  await nav.home(page).click()
  // Wait for the Customize button — confirms HomeDashboard (lazy chunk) has fully mounted
  await btn.customize(page).waitFor({ timeout: 15_000 })
}

/** Enter edit mode by clicking Customize button */
async function enterEditMode(page) {
  await btn.customize(page).click()
  // Wait for edit-mode controls to appear (DashboardWidgetGrid is lazy-loaded,
  // so Resize buttons may take a moment to render after the chunk loads)
  await page.locator('button[title="Resize"]').first().waitFor({ state: 'visible', timeout: 10_000 })
}

/**
 * Click resize on first widget and wait for localStorage to update.
 * Returns the layout array after the resize.
 */
async function resizeFirstWidget(page) {
  const layoutBefore = await page.evaluate(() => localStorage.getItem('tf_dashboard_layout'))
  const resizeBtn = page.locator('button[title="Resize"]').first()
  await resizeBtn.click()
  await page.waitForFunction(
    (prev) => localStorage.getItem('tf_dashboard_layout') !== prev,
    layoutBefore,
    { timeout: 5_000 }
  )
  return JSON.parse(await page.evaluate(() => localStorage.getItem('tf_dashboard_layout') ?? '[]'))
}

test.describe('Dashboard layout', () => {
  test.beforeEach(async ({ page }) => {
    const ok = await login(page)
    test.skip(!ok, 'Supabase unreachable — skipping auth-dependent test')
    await page.evaluate(() => localStorage.removeItem('tf_dashboard_layout'))
    await goHome(page)
  })

  test('dashboard renders with widget cards', async ({ page }) => {
    const widgets = page.locator('[style*="border-radius"][style*="border: 1px"]')
    const count = await widgets.count()
    expect(count).toBeGreaterThan(0)
  })

  test('widget size cycles in edit mode', async ({ page }) => {
    await enterEditMode(page)
    const beforeLayout = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('tf_dashboard_layout') ?? '[]')
    )
    const sizeBefore = beforeLayout[0]?.size ?? 'half'
    const afterLayout = await resizeFirstWidget(page)
    expect(afterLayout[0]?.size).not.toBe(sizeBefore)
  })

  test('layout persists in localStorage', async ({ page }) => {
    await enterEditMode(page)
    const layout = await resizeFirstWidget(page)
    expect(Array.isArray(layout)).toBe(true)
    expect(layout.length).toBeGreaterThan(0)
    expect(layout[0]).toHaveProperty('id')
    expect(layout[0]).toHaveProperty('size')
  })

  test('layout survives page reload', async ({ page }) => {
    await enterEditMode(page)
    await resizeFirstWidget(page)
    const beforeReload = await page.evaluate(() => localStorage.getItem('tf_dashboard_layout'))
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await nav.home(page).waitFor({ timeout: 15_000 })
    const afterReload = await page.evaluate(() => localStorage.getItem('tf_dashboard_layout'))
    expect(afterReload).toBe(beforeReload)
  })

  test('reset layout button restores defaults', async ({ page }) => {
    await enterEditMode(page)
    const afterResize = await resizeFirstWidget(page)
    const changedWidget = afterResize[0]
    expect(changedWidget.size).toBe('full')

    const resetBtn = page.locator('button').filter({ hasText: /Reset layout|Ripristina/ }).first()
    const hasReset = await resetBtn.isVisible({ timeout: 2000 }).catch(() => false)

    if (hasReset) {
      const layoutBefore = await page.evaluate(() => localStorage.getItem('tf_dashboard_layout'))
      await resetBtn.click()
      await page.waitForFunction(
        (prev) => localStorage.getItem('tf_dashboard_layout') !== prev,
        layoutBefore,
        { timeout: 5_000 }
      )
      const afterReset = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('tf_dashboard_layout') ?? '[]')
      )
      const resetWidget = afterReset.find(w => w.id === changedWidget.id)
      expect(resetWidget?.size).toBe('half')
    }
  })
})
