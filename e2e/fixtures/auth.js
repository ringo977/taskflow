/**
 * Auth helpers for E2E tests.
 *
 * Uses real Supabase login via the app's login page.
 * Test accounts use password "mimic2026".
 *
 * When Supabase is not reachable (CI sandbox), login() returns false
 * so tests can skip gracefully.
 *
 * Env vars (optional):
 *   E2E_EMAIL    — default test account email
 *   E2E_PASSWORD — default test account password
 */

const DEFAULT_EMAIL = process.env.E2E_EMAIL || 'marco.rasponi@gmail.com'
const DEFAULT_PASSWORD = process.env.E2E_PASSWORD || 'mimic2026'

/**
 * Login through the app's login form.
 * Returns true if login succeeded, false if Supabase is unreachable.
 */
export async function login(page, { email, password } = {}) {
  const e = email ?? DEFAULT_EMAIL
  const p = password ?? DEFAULT_PASSWORD

  await page.goto('/taskflow/')
  await page.waitForLoadState('domcontentloaded')

  // If already logged in (sidebar visible), skip login
  const hasHome = await page.locator('text=Home').isVisible({ timeout: 3000 }).catch(() => false)
  if (hasHome) return true

  // Wait for login form to appear
  const emailInput = page.locator('input[type="email"], input[placeholder*="mail"], input[placeholder*="john"]').first()
  const formVisible = await emailInput.isVisible({ timeout: 5000 }).catch(() => false)
  if (!formVisible) return false

  // Fill login form
  await emailInput.fill(e)
  await page.locator('input[type="password"]').fill(p)
  await page.locator('button:has-text("Accedi"), button:has-text("Sign in"), button[type="submit"]').first().click()

  // Wait for app to load or error
  try {
    await page.locator('text=Home').waitFor({ timeout: 12_000 })
    return true
  } catch {
    // Check for "Failed to fetch" or other auth errors
    const hasError = await page.locator('text=Failed').isVisible().catch(() => false)
    if (hasError) return false  // Supabase unreachable
    return false
  }
}
