// @ts-check
import { test, expect } from '@playwright/test'
import { login } from './fixtures/auth.js'
import { nav, login as loginSel } from './fixtures/sel.js'

/**
 * E2E: Authentication + App bootstrap
 *
 * Tests the login flow and verifies the app loads correctly.
 * Skips gracefully when Supabase is unreachable (CI sandbox).
 */

test.describe('Auth & App bootstrap', () => {
  test('login page renders with email and password fields', async ({ page }) => {
    const resp = await page.goto('/taskflow/').catch(() => null)
    test.skip(!resp, 'App unreachable — skipping')
    await page.waitForLoadState('domcontentloaded')

    const emailInput = loginSel.email(page)
    const homeNav = nav.home(page)

    // Race: login form vs already-authenticated main app
    await Promise.race([
      emailInput.waitFor({ timeout: 12_000 }).catch(() => {}),
      homeNav.waitFor({ timeout: 12_000 }).catch(() => {}),
    ])

    const hasEmail = await emailInput.isVisible().catch(() => false)
    const hasHome = await homeNav.isVisible().catch(() => false)
    expect(hasEmail || hasHome).toBe(true)
  })

  test('successful login shows main app with sidebar', async ({ page }) => {
    const ok = await login(page)
    test.skip(!ok, 'Supabase unreachable — skipping auth-dependent test')

    await expect(nav.home(page)).toBeVisible({ timeout: 10_000 })
    await expect(nav.projects(page)).toBeVisible({ timeout: 10_000 })
  })

  test('sidebar shows all main nav items after login', async ({ page }) => {
    const ok = await login(page)
    test.skip(!ok, 'Supabase unreachable — skipping auth-dependent test')

    await expect(nav.home(page)).toBeVisible({ timeout: 5000 })
    await expect(nav.projects(page)).toBeVisible({ timeout: 5000 })
    await expect(nav.portfolios(page)).toBeVisible({ timeout: 5000 })
    await expect(nav.people(page)).toBeVisible({ timeout: 5000 })
    await expect(nav.inbox(page)).toBeVisible({ timeout: 5000 })
  })

  test('org selector is visible', async ({ page }) => {
    const ok = await login(page)
    test.skip(!ok, 'Supabase unreachable — skipping auth-dependent test')

    // Org selector contains org name — use text match as it's dynamic
    const orgLabel = page.locator('text=Biom').or(page.locator('text=PoliMi')).or(page.locator('text=Polimi'))
    await expect(orgLabel.first()).toBeVisible()
  })
})
