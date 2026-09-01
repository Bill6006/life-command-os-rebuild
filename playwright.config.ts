import { defineConfig, devices } from '@playwright/test'

/**
 * Canonical plan section 37 — cover representative mobile widths and a desktop
 * width. Physical-phone validation remains mandatory and is not replaced by
 * these projects.
 */
/**
 * The preview port, overridable so a matrix can run beside another project.
 *
 * Default 4173 and unchanged: CI sets nothing and behaves exactly as it did.
 * What this buys is a local run that does not collide with whatever else is
 * already bound to that port — a collision that is not a product signal and,
 * on one run of routing 91's round 2 gate, produced 686 failures of which 679
 * were `ERR_CONNECTION_REFUSED`. A gate that cannot be told apart from a busy
 * machine is a gate nobody can read.
 */
const PREVIEW_PORT = Number(process.env.LCOS_PREVIEW_PORT ?? 4173)
const PREVIEW_ORIGIN = `http://127.0.0.1:${PREVIEW_PORT}`

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  /*
   * One `vite preview` process serves every worker, and it starts dropping
   * connections above a handful of concurrent Chromium instances. Two workers
   * was fine until a screen arrived in its own chunk: a lazily loaded route
   * adds a mid-test request, and under concurrency that request is the one
   * that stalls — which reads as a hung screen rather than as a busy server.
   *
   * One worker everywhere. Slower, and the same locally as in CI, which is
   * worth more than the seconds: section 60 records that failures which merely
   * look like product failures cost real time.
   */
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    // 127.0.0.1 rather than localhost: on Windows, localhost resolves to both
    // ::1 and 127.0.0.1, and parallel workers hitting the dual-stack name drop
    // connections (ERR_ABORTED / navigation timeouts) that look like product
    // failures but are not.
    baseURL: PREVIEW_ORIGIN,
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
    command: `npm run preview -- --host 127.0.0.1 --port ${PREVIEW_PORT} --strictPort`,
    url: `${PREVIEW_ORIGIN}/life-command-os-rebuild/preview/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { LCOS_TARGET: 'preview' },
  },
})
