import { useEffect, useState } from 'react'

/**
 * Primary navigation (canonical plan section 5).
 *
 * Four primary destinations. Data, exports, settings, privacy and QA live
 * behind `more` rather than consuming a permanent primary slot.
 */
export const PRIMARY_DESTINATIONS = ['now', 'life', 'timeline', 'insights'] as const
export const DESTINATIONS = [...PRIMARY_DESTINATIONS, 'more'] as const

export type Destination = (typeof DESTINATIONS)[number]

export const DEFAULT_DESTINATION: Destination = 'now'

export function isDestination(value: string): value is Destination {
  return (DESTINATIONS as readonly string[]).includes(value)
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
  return isDestination(value) ? value : DEFAULT_DESTINATION
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
