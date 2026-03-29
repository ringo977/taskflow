import { defineConfig, devices } from '@playwright/test'

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
