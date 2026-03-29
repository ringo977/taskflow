// @ts-check
import { test, expect } from '@playwright/test'

/**
 * E2E: Manual page — theme toggle + navigation
 *
 * The manual page is public (no auth needed), making it the simplest
 * E2E to verify rendering, theme persistence, and TOC navigation.
 */

test.describe('Manual page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/taskflow/manual')
    await page.locator('h1').filter({ hasText: /Manuale TaskFlow|TaskFlow Manual/ }).waitFor({ timeout: 15_000 })
  })

  test('renders title and TOC', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: /Manuale/ })).toBeVisible()

    // TOC sidebar has sections
    const toc = page.locator('text=Per iniziare').or(page.locator('text=Getting Started'))
    await expect(toc.first()).toBeVisible()
  })

  test('theme toggle cycles through dark → light → auto', async ({ page }) => {
    const themeBtn = page.locator('button').filter({ hasText: /🌙|☀️|⚙️/ }).first()
    await expect(themeBtn).toBeVisible()

    const initial = await themeBtn.textContent()
    await themeBtn.click()
    const second = await themeBtn.textContent()
    expect(second).not.toBe(initial)

    await themeBtn.click()
    const third = await themeBtn.textContent()
    expect(third).not.toBe(second)

    await themeBtn.click()
    const fourth = await themeBtn.textContent()
    expect(fourth).toBe(initial)
  })

  test('theme persists in localStorage as tf_theme', async ({ page }) => {
    const themeBtn = page.locator('button').filter({ hasText: /🌙|☀️|⚙️/ }).first()
    await themeBtn.click()

    const stored = await page.evaluate(() => localStorage.getItem('tf_theme'))
    expect(stored).toBeTruthy()
    expect(['dark', 'light', 'auto']).toContain(stored)
  })

  test('language toggle switches IT ↔ EN', async ({ page }) => {
    const langBtn = page.locator('button').filter({ hasText: /^EN$|^IT$/ }).first()
    await expect(langBtn).toBeVisible()

    const wasIt = await page.locator('text=Per iniziare').first().isVisible().catch(() => false)
    await langBtn.click()
    await page.waitForTimeout(300)

    if (wasIt) {
      await expect(page.locator('text=Getting Started').first()).toBeVisible()
    } else {
      await expect(page.locator('text=Per iniziare').first()).toBeVisible()
    }
  })

  test('TOC click scrolls to section', async ({ page }) => {
    const tocItem = page.locator('a[href="#tasks"]').first()
    await tocItem.click()
    await page.waitForTimeout(500)

    const section = page.locator('#tasks')
    await expect(section).toBeInViewport()
  })

  test('back to app link exists', async ({ page }) => {
    const backLink = page.locator('a').filter({ hasText: /Torna|Back/ }).first()
    await expect(backLink).toBeVisible()
  })

  test('data-theme attribute changes with toggle', async ({ page }) => {
    const themeBtn = page.locator('button').filter({ hasText: /🌙|☀️|⚙️/ }).first()

    const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
    await themeBtn.click()
    await page.waitForTimeout(200)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))

    expect(after).not.toBe(before)
  })
})
