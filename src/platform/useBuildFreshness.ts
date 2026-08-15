import { useCallback, useEffect, useState } from 'react'
import { fetchDeployedBuild, runningBuild, type BuildInfo } from './buildInfo'

export interface BuildFreshness {
  /** The deployed build differs from the one running in this tab. */
  isStale: boolean
  /** What the server is currently serving, when it could be read. */
  deployed: BuildInfo | null
  /** True while a check is in flight. */
  checking: boolean
  /** Re-read build-info.json now. */
  check: () => void
}

/**
 * Detects that a newer build has been deployed than the one running.
 *
 * Canonical plan section 33: "The owner should never have to wonder whether the
 * phone is showing stale code." GitHub Pages may serve a cached index.html for
 * a few minutes, so a refresh alone is not proof. This checks on mount, when
 * the tab becomes visible again, and on demand.
 *
 * A failed check is never reported as stale — offline is not staleness.
 */
export function useBuildFreshness(): BuildFreshness {
  const [deployed, setDeployed] = useState<BuildInfo | null>(null)
  const [checking, setChecking] = useState(false)
  const [nonce, setNonce] = useState(0)

  const check = useCallback(() => {
    setNonce((value) => value + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    setChecking(true)
    void fetchDeployedBuild(controller.signal).then((info) => {
      if (!active) return
      setChecking(false)
      if (info) setDeployed(info)
    })

    return () => {
      active = false
      controller.abort()
    }
  }, [nonce])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', check)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', check)
    }
  }, [check])

  // An unknown local SHA (a local dev build) can never be meaningfully compared.
  const comparable = runningBuild.commitSha !== 'unknown' && deployed !== null
  const isStale = comparable && deployed.commitSha !== runningBuild.commitSha

  return { isStale, deployed, checking, check }
}
