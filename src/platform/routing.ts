import { useEffect, useState } from 'react'
import { isProduction } from './buildInfo'

/**
 * Primary navigation (canonical plan section 5).
 *
 * Four primary destinations, and that is the whole bottom navigation. Data,
 * exports, settings, privacy and QA live behind `more`, which is reached from
 * the header rather than from a fifth tab.
 *
 * Phase 1 let More sit in the bar because there was nowhere else to put it.
 * That is exactly how a secondary surface becomes permanent: it is convenient
 * once, nobody revisits it, and the plan's four destinations quietly become
 * five. Section 5 fixes the conceptual structure, so the bar is fixed too.
 */
export const PRIMARY_DESTINATIONS = ['now', 'life', 'timeline', 'insights'] as const

/** What the bottom navigation shows. Exactly the primary four. */
export const DESTINATIONS = PRIMARY_DESTINATIONS

/**
 * Reachable, but not worth a permanent slot.
 *
 * More is a header entry; Data and QA are reached from inside More. None of
 * them takes a place on a phone's navigation bar.
 *
 * Data is deliberately a destination of its own rather than a panel inside
 * More. It carries a whole export composer, a backup and a restore, and a
 * restore has to stay reachable when the rest of the app is struggling
 * (G-012) — a route that resolves on its own is reachable from a typed hash
 * and a bookmark, where a panel three scrolls down another screen is not.
 *
 * **The check-in is one for the same structural reason and one more.** A
 * reminder has to have somewhere to send him, and a notification can only carry
 * a URL — so the ritual needs an address, and a panel inside Now has none.
 * Section 5's four are untouched: it stays off the bottom bar and is reached
 * from Now when one is open, from More the rest of the time, and from the
 * reminder itself.
 */
export const SECONDARY_DESTINATIONS = ['more', 'data', 'check-in', 'qa'] as const

export const ALL_DESTINATIONS = [...PRIMARY_DESTINATIONS, ...SECONDARY_DESTINATIONS] as const

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

/**
 * A Life domain page (canonical plan section 50) is a second hash segment
 * under `life` — `#/life/health-recovery` — rather than a destination of its
 * own. Section 5 fixes the four primary destinations; a domain page is
 * optional inspection reached *from* Life, not a fifth thing the bottom bar
 * would have to know about. `destinationFromHash` already resolves the first
 * segment to `life` for a hash like this, which is what keeps the primary nav
 * correctly highlighted on a domain page without any change there.
 *
 * This stays syntactic on purpose — it does not know which slugs are real
 * pages, so `src/platform` does not have to depend on `src/features`. The Life
 * feature decides what an unrecognised slug means.
 */
export function lifePageSlugFromHash(hash: string): string | undefined {
  const parts = hash.replace(/^#\/?/, '').split(/[/?]/)
  if ((parts[0] ?? '').toLowerCase() !== 'life') return undefined
  const slug = parts[1]
  return slug === undefined || slug === '' ? undefined : slug.toLowerCase()
}

export function hashForLifePage(slug: string): string {
  return `#/life/${slug}`
}

export function useLifePageSlug(): string | undefined {
  const [slug, setSlug] = useState<string | undefined>(() =>
    lifePageSlugFromHash(window.location.hash),
  )

  useEffect(() => {
    const onHashChange = () => setSlug(lifePageSlugFromHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return slug
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
