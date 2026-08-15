import { useEffect, useState } from 'react'
import { isProduction } from './buildInfo'

/**
 * Primary navigation (canonical plan section 5).
 *
 * Four primary destinations. Data, exports, settings, privacy and QA live
 * behind `more` rather than consuming a permanent primary slot.
 */
export const PRIMARY_DESTINATIONS = ['now', 'life', 'timeline', 'insights'] as const

/** What the bottom navigation shows. */
export const DESTINATIONS = [...PRIMARY_DESTINATIONS, 'more'] as const

/**
 * Reachable, but not worth a permanent slot.
 *
 * Section 5 keeps QA behind a secondary destination rather than letting
 * developer surfaces consume one of five places on a phone's navigation.
 */
export const SECONDARY_DESTINATIONS = ['qa'] as const

export const ALL_DESTINATIONS = [...DESTINATIONS, ...SECONDARY_DESTINATIONS] as const

export type Destination = (typeof ALL_DESTINATIONS)[number]

export const DEFAULT_DESTINATION: Destination = 'now'

/**
 * The QA laboratory exists everywhere except production.
 *
 * Section 31 — test-only actions must be unavailable in production. The route
 * resolves to Now there, and the screen's code is never downloaded.
 */
export const QA_AVAILABLE = !isProduction

export function isDestination(value: string): value is Destination {
  return (ALL_DESTINATIONS as readonly string[]).includes(value)
}

export function isReachable(destination: Destination): boolean {
  return destination === 'qa' ? QA_AVAILABLE : true
}

/**
 * Hash routing.
 *
 * The site is served from a sub-path on GitHub Pages with no server-side
 * rewrite available, so hash routes are the option that is deep-linkable,
 * back-button correct and impossible to get wrong on a phone bookmark.
 * Revisit if a rewrite-capable host is ever adopted.
 */
export function destinationFromHash(hash: string): Destination {
  const value = hash.replace(/^#\/?/, '').split(/[/?]/)[0]?.toLowerCase() ?? ''
  if (!isDestination(value) || !isReachable(value)) return DEFAULT_DESTINATION
  return value
}

export function hashForDestination(destination: Destination): string {
  return `#/${destination}`
}

export function useDestination(): [Destination, (next: Destination) => void] {
  const [destination, setDestination] = useState<Destination>(() =>
    destinationFromHash(window.location.hash),
  )

  useEffect(() => {
    const onHashChange = () => setDestination(destinationFromHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (next: Destination) => {
    window.location.hash = hashForDestination(next)
  }

  return [destination, navigate]
}
