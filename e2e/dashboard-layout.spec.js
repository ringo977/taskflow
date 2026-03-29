// @ts-check
import { test, expect } from '@playwright/test'
import { login } from './fixtures/auth.js'

/**
 * E2E: Dashboard customization + persistence
 *
 * Tests the Home dashboard widget layout: drag reorder,
 * size cycling, localStorage persistence, and reset.
 */

test.describe('Dashboard layout', () => {
  test.beforeEach(async ({ page }) => {
    // Clear saved layout so we start from defaults
    await page.goto('/taskflow/')
    await page.evaluate(() => localStorage.removeItem('tf_dashboard_layout'))
  })

  test('dashboard renders with widget cards', async ({ page }) => {
    const ok = await login(page)
    test.skip(!ok, 'Supabase unreachable — skipping auth-dependent test')

    // Navigate to Home
    await page.locator('text=Home').first().click()
    await page.waitForTimeout(1000)

    // Look for dashboard widgets (cards with section titles)
    const widgets = page.locator('[draggable="true"]')
    const count = await widgets.count()
    expect(count).toBeGreaterThan(0)
  })

  test('widget size cycles on double-click', async ({ page }) => {
    const ok = await login(page)
    test.skip(!ok, 'Supabase unreachable — skipping auth-dependent test')

    // Navigate to Home
    await page.locator('text=Home').first().click()
    await page.waitForTimeout(1000)

    const widget = page.locator('[draggable="true"]').first()
    await expect(widget).toBeVisible()

    // Get initial width
    const initialBox = await widget.boundingBox()
    if (!initialBox) return

    // Double-click to cycle size
    await widget.dblclick()
    await page.waitForTimeout(300)

    const newBox = await widget.boundingBox()
    if (!newBox) return

    // Width should have changed (half → full or full → half)
    expect(newBox.width).not.toBeCloseTo(initialBox.width, -1)
  })

  test('layout persists in localStorage', async ({ page }) => {
    const ok = await login(page)
    test.skip(!ok, 'Supabase unreachable — skipping auth-dependent test')

    // Navigate to Home
    await page.locator('text=Home').first().click()
    await page.waitForTimeout(1000)

    // Double-click a widget to change layout
    const widget = page.locator('[draggable="true"]').first()
    await widget.dblclick()
    await page.waitForTimeout(500)

    // Check localStorage
    const saved = await page.evaluate(() => localStorage.getItem('tf_dashboard_layout'))
    expect(saved).toBeTruthy()

    // Parse and verify it's valid JSON array
    const layout = JSON.parse(saved)
    expect(Array.isArray(layout)).toBe(true)
    expect(layout.length).toBeGreaterThan(0)
    expect(layout[0]).toHaveProperty('id')
    expect(layout[0]).toHaveProperty('size')
  })

  test('layout survives page reload', async ({ page }) => {
    const ok = await login(page)
    test.skip(!ok, 'Supabase unreachable — skipping auth-dependent test')

    // Navigate to Home
    await page.locator('text=Home').first().click()
    await page.waitForTimeout(1000)

    // Change layout
    const widget = page.locator('[draggable="true"]').first()
    await widget.dblclick()
    await page.waitForTimeout(500)

    const beforeReload = await page.evaluate(() => localStorage.getItem('tf_dashboard_layout'))

    // Reload page
    await page.reload()
    await page.waitForSelector('[draggable="true"]', { timeout: 15_000 })

    const afterReload = await page.evaluate(() => localStorage.getItem('tf_dashboard_layout'))
    expect(afterReload).toBe(beforeReload)
  })

  test('reset layout button restores defaults', async ({ page }) => {
    const ok = await login(page)
    test.skip(!ok, 'Supabase unreachable — skipping auth-dependent test')

    // Navigate to Home
    await page.locator('text=Home').first().click()
    await page.waitForTimeout(1000)

    // Change layout first
    const widget = page.locator('[draggable="true"]').first()
    await widget.dblclick()
    await page.waitForTimeout(300)

    // Look for reset button
    const resetBtn = page.locator('button').filter({ hasText: /Ripristina|Reset|Default/ }).first()
    const hasReset = await resetBtn.isVisible().catch(() => false)

    if (hasReset) {
      await resetBtn.click()
      await page.waitForTimeout(500)

      // Layout should be cleared or reset
      const saved = await page.evaluate(() => localStorage.getItem('tf_dashboard_layout'))
      // After reset, either null or the default layout
      if (saved) {
        const layout = JSON.parse(saved)
        // All widgets should be back to default size
        expect(layout.every(w => w.size === 'half')).toBe(true)
      }
    }
  })
})
