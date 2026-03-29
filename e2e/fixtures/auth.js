/**
 * Auth helpers for E2E tests — UI-based login with automatic TOTP.
 *
 * Flow:
 *   1. Navigate to /taskflow/ → login page appears
 *   2. Fill email + password, click "Accedi" / "Sign in"
 *   3. If MFA page appears, generate TOTP code from E2E_TOTP_SECRET
 *      and enter it in the 6-digit input
 *   4. Wait for the main app ("Home" in sidebar)
 *
 * Env vars (or in .env.e2e):
 *   E2E_EMAIL        — test account email        (required)
 *   E2E_PASSWORD     — test account password      (required)
 *   E2E_TOTP_SECRET  — base32 TOTP secret for 2FA (only if MFA enrolled)
 */

import { TOTP } from 'otpauth'

/**
 * Login via the real app UI.
 * Returns true on success, false if unreachable or credentials missing.
 */
export async function login(page, { email, password, totpSecret } = {}) {
  const e = email ?? process.env.E2E_EMAIL
  const p = password ?? process.env.E2E_PASSWORD
  const secret = totpSecret ?? process.env.E2E_TOTP_SECRET

  if (!e || !p) {
    console.warn('[e2e/auth] E2E_EMAIL or E2E_PASSWORD not set — skipping login')
    return false
  }

  try {
    // ── 1. Navigate to app ────────────────────────────────────
    await page.goto('/taskflow/')
    await page.waitForLoadState('domcontentloaded')

    // Wait for the app to finish its loading screen (up to 10s)
    // then check: already logged in, or login form?
    const homeLocatorEarly = page.locator('text=Home')
    const emailInput = page.locator('input[type="email"]')

    // Race: either the user is already logged in or the login form appears
    const initial = await Promise.race([
      homeLocatorEarly.waitFor({ timeout: 20_000 }).then(() => 'home').catch(() => null),
      emailInput.waitFor({ timeout: 20_000 }).then(() => 'login').catch(() => null),
    ])

    if (initial === 'home') return true
    if (initial !== 'login') {
      console.warn('[e2e/auth] Neither Home nor login form appeared within 20s')
      return false
    }

    await emailInput.fill(e)
    await page.locator('input[type="password"]').first().fill(p)

    // Click "Accedi" or "Sign in" submit button
    await page.locator('button:has-text("Accedi"), button:has-text("Sign in")').first().click()

    // ── 3. Wait for either Home (no MFA) or MFA prompt ───────
    const homeLocator = page.locator('text=Home')
    const mfaInputLocator = page.locator('input[placeholder="000 000"]')

    // Race: main app vs MFA screen
    const winner = await Promise.race([
      homeLocator.waitFor({ timeout: 15_000 }).then(() => 'home').catch(() => null),
      mfaInputLocator.waitFor({ timeout: 15_000 }).then(() => 'mfa').catch(() => null),
    ])

    if (winner === 'home') return true

    if (winner === 'mfa') {
      // ── 4. Handle MFA ────────────────────────────────────────
      if (!secret) {
        console.warn('[e2e/auth] MFA screen appeared but E2E_TOTP_SECRET not set')
        return false
      }

      const totp = new TOTP({ secret, digits: 6, period: 30 })
      const code = totp.generate()

      await mfaInputLocator.fill(code)

      // Click "Verifica" / "Verify" / "Conferma e accedi" / "Confirm & continue"
      await page.locator('button:has-text("Verifica"), button:has-text("Verify"), button:has-text("Conferma"), button:has-text("Confirm")').first().click()

      // Wait for main app after MFA
      try {
        await homeLocator.waitFor({ timeout: 15_000 })
        return true
      } catch {
        console.warn('[e2e/auth] App did not render after MFA verification')
        return false
      }
    }

    // Neither home nor MFA appeared
    console.warn('[e2e/auth] Neither main app nor MFA screen appeared after login')
    return false
  } catch (err) {
    console.warn('[e2e/auth] Login error:', err.message ?? err)
    return false
  }
}
