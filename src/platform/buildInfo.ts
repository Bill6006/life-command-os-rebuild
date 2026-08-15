/**
 * Build identity.
 *
 * Canonical plan section 33 requires the commit SHA and build time to be
 * visible on the phone, and every phase handoff to prove that the deployed
 * Preview SHA matches the verified checkpoint SHA. The same values are compiled
 * into the bundle and emitted to build-info.json so they can be checked either
 * from inside the app or with a plain HTTP request.
 */

export type DeployTarget = 'preview' | 'production' | 'development'

export interface BuildInfo {
  commitSha: string
  commitShort: string
  branch: string
  target: DeployTarget
  buildTime: string
}

/** Identity of the bundle currently running in this tab. */
export const runningBuild: BuildInfo = {
  commitSha: __LCOS_COMMIT_SHA__,
  commitShort: __LCOS_COMMIT_SHORT__,
  branch: __LCOS_BRANCH__,
  target: __LCOS_TARGET__,
  buildTime: __LCOS_BUILD_TIME__,
}

export const isPreview = runningBuild.target === 'preview'
export const isProduction = runningBuild.target === 'production'

function isDeployTarget(value: unknown): value is DeployTarget {
  return value === 'preview' || value === 'production' || value === 'development'
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

/**
 * Reads build-info.json from the deployed site.
 *
 * Asset filenames are content-hashed, so the only file that can be served stale
 * is index.html. This read deliberately bypasses every cache layer so the
 * answer reflects what is actually deployed right now.
 *
 * Returns null when the check cannot be completed — an offline phone must not
 * be told its build is stale.
 */
export async function fetchDeployedBuild(signal?: AbortSignal): Promise<BuildInfo | null> {
  const url = `${import.meta.env.BASE_URL}build-info.json?t=${Date.now()}`

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache' },
      ...(signal ? { signal } : {}),
    })
    if (!response.ok) return null

    const raw: unknown = await response.json()
    if (typeof raw !== 'object' || raw === null) return null

    const record = raw as Record<string, unknown>
    const commitSha = asString(record.commitSha, '')
    if (!commitSha) return null

    return {
      commitSha,
      commitShort: asString(record.commitShort, commitSha.slice(0, 7)),
      branch: asString(record.branch, 'unknown'),
      target: isDeployTarget(record.target) ? record.target : 'preview',
      buildTime: asString(record.buildTime, 'unknown'),
    }
  } catch {
    return null
  }
}

/** Owner-local, human-readable build time. */
export function formatBuildTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'unknown'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
