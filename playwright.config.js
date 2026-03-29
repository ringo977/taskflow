import { defineConfig, devices } from '@playwright/test'
import { readFileSync } from 'fs'

/**
 * Load .env.e2e if it exists (E2E_EMAIL, E2E_PASSWORD, E2E_TOTP_SECRET).
 * This avoids requiring dotenv as a dependency.
 */
try {
  const envFile = readFileSync('.env.e2e', 'utf-8')
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
} catch {
  // .env.e2e not present — env vars must be set externally
}

/**
 * Playwright E2E configuration for TaskFlow.
 *
 * Two project tiers:
 *   smoke  — public pages, no auth needed (manual page). Always runs.
 *   auth   — requires Supabase login. Skips gracefully when backend unreachable.
 *
 * Usage:
 *   npx playwright test                          # all tests
 *   npx playwright test --project=smoke          # smoke only (CI-safe)
 *   npx playwright test --project=auth           # auth only (needs backend)
 *   npx playwright test --ui                     # interactive UI
 *
 * Auth env vars (or in .env.e2e):
 *   E2E_EMAIL        — test account email
 *   E2E_PASSWORD     — test account password
 *   E2E_TOTP_SECRET  — base32 TOTP secret (only if MFA enrolled)
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true,
  },

  projects: [
    /* ── Smoke: no auth, always green ─────────────────── */
    {
      name: 'smoke',
      testMatch: /manual-page\.spec/,
      use: { ...devices['Desktop Chrome'] },
    },

    /* ── Auth: requires Supabase backend ──────────────── */
    {
      name: 'auth',
      testMatch: /auth-app|dashboard-layout|permissions-viewer|templates|multi-assignee/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Start dev server before tests */
  webServer: {
    command: 'npx vite --port 5173',
    port: 5173,
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
