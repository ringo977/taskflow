// @ts-check
import { test, expect } from '@playwright/test'
import { login } from './fixtures/auth.js'

/**
 * E2E: Authentication + App bootstrap
 *
 * Tests the login flow and verifies the app loads correctly.
 * Skips gracefully when Supabase is unreachable (CI sandbox).
 */

test.describe('Auth & App bootstrap', () => {
  test('login page renders with email and password fields', async ({ page }) => {
    await page.goto('/taskflow/')
    await page.waitForLoadState('domcontentloaded')

    // Should show either login form or main app
    const hasEmail = await page.locator('input[type="email"], input[placeholder*="mail"], input[placeholder*="john"]').isVisible({ timeout: 8000 }).catch(() => false)
    const hasHome = await page.locator('text=Home').isVisible({ timeout: 2000 }).catch(() => false)

    expect(hasEmail || hasHome).toBe(true)
  })

  test('successful login shows main app with sidebar', async ({ page }) => {
    const ok = await login(page)
    test.skip(!ok, 'Supabase unreachable — skipping auth-dependent test')

    await expect(page.locator('text=Home')).toBeVisible()
    await expect(page.locator('text=Progetti').or(page.locator('text=Projects'))).toBeVisible()
  })

  test('sidebar shows all main nav items after login', async ({ page }) => {
    const ok = await login(page)
    test.skip(!ok, 'Supabase unreachable — skipping auth-dependent test')

    for (const label of ['Home', 'Progetti', 'Portfolios', 'People', 'Inbox']) {
      await expect(page.locator(`text=${label}`).first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('org selector is visible', async ({ page }) => {
    const ok = await login(page)
    test.skip(!ok, 'Supabase unreachable — skipping auth-dependent test')

    const orgLabel = page.locator('text=Biom').or(page.locator('text=PoliMi')).or(page.locator('text=Polimi'))
    await expect(orgLabel.first()).toBeVisible()
  })
})
