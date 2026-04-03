/**
 * Shared E2E helpers and selectors.
 */
import { nav } from './sel.js'

/** Navigate to a sidebar section by data-testid */
export async function navTo(page, id) {
  const locator = nav[id]?.(page)
  if (!locator) throw new Error(`Unknown nav id: ${id}`)
  await locator.click()
  await page.waitForLoadState('networkidle')
}

/** Click a project in the project list */
export async function openProject(page, name) {
  await navTo(page, 'projects')
  await page.locator(`text=${name}`).first().click()
  await page.waitForLoadState('networkidle')
}

/** Wait for toast message */
export async function waitForToast(page, textMatch) {
  const toast = page.locator(`[class*="toast"], [role="alert"]`).filter({ hasText: textMatch })
  await toast.waitFor({ state: 'visible', timeout: 5_000 })
  return toast
}

/** Get text content of a visible element matching selector */
export async function getText(page, selector) {
  return page.locator(selector).first().textContent()
}

/**
 * Wait for a project list to be visible after navigating to "Progetti".
 * Returns the first project locator for further interaction.
 */
export async function waitForProjectList(page) {
  const projectLink = page.locator('[class*="card"], [class*="project-row"]').first()
  await projectLink.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {})
  return projectLink
}

/**
 * Navigate to Projects, wait for list, click first project, wait for view tabs.
 * Returns true if a project was opened, false if none available.
 */
export async function openFirstProject(page) {
  await nav.projects(page).click()
  const projectLink = await waitForProjectList(page)
  const hasProject = await projectLink.isVisible().catch(() => false)
  if (!hasProject) return false

  await projectLink.click()
  await page.locator('.view-tabs, [class*="view-tabs"]').first()
    .waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {})
  return true
}
