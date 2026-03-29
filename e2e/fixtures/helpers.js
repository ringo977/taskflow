/**
 * Shared E2E helpers and selectors.
 */

/** Navigate to a sidebar section by label text */
export async function navTo(page, label) {
  await page.locator(`nav >> text=${label}, [class*="sidebar"] >> text=${label}`).first().click()
  await page.waitForTimeout(500)
}

/** Click a project in the project list */
export async function openProject(page, name) {
  await navTo(page, 'Progetti')
  await page.locator(`text=${name}`).first().click()
  await page.waitForTimeout(500)
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
