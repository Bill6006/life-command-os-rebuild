import { defineConfig, devices } from '@playwright/test'

/**
 * Canonical plan section 37 — cover representative mobile widths and a desktop
 * width. Physical-phone validation remains mandatory and is not replaced by
 * these projects.
 */
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  /*
   * One `vite preview` process serves every worker, and it starts dropping
   * connections above a handful of concurrent Chromium instances — the default
   * (half the CPU count) produced navigation timeouts that looked like product
   * failures. Two workers runs the whole suite in ~10s with no flake.
   */
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    // 127.0.0.1 rather than localhost: on Windows, localhost resolves to both
    // ::1 and 127.0.0.1, and parallel workers hitting the dual-stack name drop
    // connections (ERR_ABORTED / navigation timeouts) that look like product
    // failures but are not.
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile-small',
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 } },
    },
    {
      name: 'mobile-large',
      use: { ...devices['Desktop Chrome'], viewport: { width: 430, height: 932 } },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
  ],
  /*
   * Serves an already-built dist — it never builds. CI builds once, asserts the
   * bundle carries the checkout SHA, then tests and deploys those exact bytes,
   * so what reaches the phone is what the gate verified. Locally, use
   * `npm run test:browser`, which builds first.
   */
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/life-command-os-rebuild/preview/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { LCOS_TARGET: 'preview' },
  },
})
