import { execSync } from 'node:child_process'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * Deployment targets (canonical plan section 33 — production separation).
 *
 *   preview     -> https://bill6006.github.io/life-command-os-rebuild/preview/
 *   production  -> https://bill6006.github.io/life-command-os-rebuild/
 *   development -> http://localhost:5173/
 *
 * Preview and production are separate paths on the gh-pages branch and are
 * published by separate workflows, so a preview deploy can never move
 * production.
 */
export type DeployTarget = 'preview' | 'production' | 'development'

const REPO_PATH = '/life-command-os-rebuild/'

function resolveTarget(mode: string): DeployTarget {
  const raw = process.env.LCOS_TARGET
  if (raw === 'preview' || raw === 'production' || raw === 'development') return raw
  return mode === 'production' ? 'preview' : 'development'
}

function resolveBase(target: DeployTarget): string {
  if (target === 'preview') return `${REPO_PATH}preview/`
  if (target === 'production') return REPO_PATH
  return '/'
}

function gitValue(args: string, fallback: string): string {
  try {
    return execSync(`git ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return fallback
  }
}

function resolveBuildInfo(target: DeployTarget) {
  // CI provides the exact SHA of the checked-out commit; locally we ask git.
  const commitSha = process.env.GITHUB_SHA ?? gitValue('rev-parse HEAD', 'unknown')
  const branch = process.env.GITHUB_REF_NAME ?? gitValue('rev-parse --abbrev-ref HEAD', 'unknown')

  return {
    commitSha,
    commitShort: commitSha === 'unknown' ? 'unknown' : commitSha.slice(0, 7),
    branch,
    target,
    buildTime: new Date().toISOString(),
  }
}

/**
 * Writes build-info.json next to index.html.
 *
 * This exists so the deployed Preview SHA can be read without opening the app —
 * every phase handoff has to prove that the deployed Preview SHA matches the
 * verified checkpoint SHA, and the running app polls it to detect a stale build.
 */
function buildInfoPlugin(info: ReturnType<typeof resolveBuildInfo>): Plugin {
  return {
    name: 'lcos-build-info',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'build-info.json',
        source: `${JSON.stringify(info, null, 2)}\n`,
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const target = resolveTarget(mode)
  const info = resolveBuildInfo(target)

  return {
    base: resolveBase(target),
    plugins: [react(), buildInfoPlugin(info)],
    define: {
      __LCOS_COMMIT_SHA__: JSON.stringify(info.commitSha),
      __LCOS_COMMIT_SHORT__: JSON.stringify(info.commitShort),
      __LCOS_BRANCH__: JSON.stringify(info.branch),
      __LCOS_BUILD_TIME__: JSON.stringify(info.buildTime),
      __LCOS_TARGET__: JSON.stringify(info.target),
    },
    build: {
      // Hashed filenames make asset caching safe; only index.html can go stale,
      // which the in-app build check covers.
      sourcemap: true,
    },
    test: {
      /*
       * Node, not jsdom.
       *
       * The Phase 1 gate asks for the meaning layer to be testable without the
       * app shell. Running it in an environment that has no DOM at all is a
       * stronger way to hold that than promising not to reach for one — a
       * `document` reference below the UI fails here rather than passing
       * quietly. The two suites that genuinely exercise browser APIs opt into
       * jsdom with a `@vitest-environment` docblock.
       */
      environment: 'node',
      globals: true,
      setupFiles: ['./tests/unit/setup.ts'],
      // Test layers from canonical plan section 41. Browser tests run under
      // Playwright and are deliberately not in this list.
      include: ['tests/{unit,contract,synthetic,adversarial}/**/*.test.{ts,tsx}'],
      /*
       * Long enough that a library sweep is never the thing that fails.
       *
       * Several tests decide every scenario in the library, some of them at
       * five hours of the day and some of them several rounds deep, so their
       * cost grows with the library rather than with what they assert. Phase 82
       * added three scenarios and two of those sweeps crossed the five-second
       * default — under parallel load only, which is the worst way for a gate
       * to fail: green on a rerun, and telling nobody anything.
       *
       * The number is not a licence for slow tests. It is the recognition that
       * a sweep over every history is the shape this repository's strongest
       * guards take, and that a timeout tuned to today's library is a guard
       * that gets weaker every time a scenario is added.
       *
       * ## Thirty seconds stopped being that number — DEF-0169, routing 94
       *
       * **The paragraph above predicted this and it happened again.** At
       * `61bb033`, before routing 94 changed a line, `npm run test` was **red**
       * on this machine on two runs of two: `block-sweep`'s guide sweep and
       * `reach-gate`'s speaking count, both at *"Test timed out in 30000ms"*,
       * both green in isolation. Measured solo they cost **5.0s** and **8.0s**;
       * under a full parallel run on a fourteen-core box they cross thirty. CI
       * was green on the same commit, so the failure is contention rather than
       * the product — which is exactly the shape that teaches everybody to rerun
       * until it passes.
       *
       * **A hundred and twenty is not four times more patience with slow
       * tests.** What a timeout is for is catching a sweep that will never
       * finish; policing how long a CPU-bound sweep takes while thirteen others
       * share the cores is a job it cannot do, and every version of it that has
       * tried has produced a false red. At twenty-four times the slowest sweep's
       * solo cost, a failure here is a hang again rather than a busy laptop.
       *
       * **The cause is not fixed and this does not claim to fix it.** The real
       * one is that a dozen library-wide sweeps run concurrently and each is
       * single-threaded, so the honest repairs are fewer workers or fewer
       * whole-library sweeps, and both are their own piece of work. DEF-0169
       * carries that; this stops the gate lying in the meantime.
       */
      testTimeout: 120_000,
    },
  }
})
