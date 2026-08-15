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
    },
  }
})
