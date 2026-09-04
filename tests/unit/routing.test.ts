/**
 * @vitest-environment jsdom
 *
 * This suite is about browser behaviour — a hash, a location, a fetch — so it
 * asks for a DOM. Everything below the UI runs in plain Node.
 */
import { describe, expect, it } from 'vitest'
import {
  ALL_DESTINATIONS,
  DEFAULT_DESTINATION,
  DESTINATIONS,
  destinationFromHash,
  hashForDestination,
  hashForLifePage,
  isDestination,
  isReachable,
  lifePageSlugFromHash,
  PRIMARY_DESTINATIONS,
  QA_AVAILABLE,
  SECONDARY_DESTINATIONS,
} from '../../src/platform/routing'

describe('destinationFromHash', () => {
  it('defaults to Now for an empty or missing hash', () => {
    expect(destinationFromHash('')).toBe('now')
    expect(destinationFromHash('#')).toBe('now')
    expect(destinationFromHash('#/')).toBe('now')
    expect(DEFAULT_DESTINATION).toBe('now')
  })

  it('resolves every destination from its own hash', () => {
    for (const destination of DESTINATIONS) {
      expect(destinationFromHash(hashForDestination(destination))).toBe(destination)
    }
  })

  it('accepts a hash without the leading slash', () => {
    expect(destinationFromHash('#life')).toBe('life')
  })

  it('is case insensitive', () => {
    expect(destinationFromHash('#/Timeline')).toBe('timeline')
  })

  it('ignores trailing segments and query strings', () => {
    expect(destinationFromHash('#/insights/detail')).toBe('insights')
    expect(destinationFromHash('#/more?panel=build')).toBe('more')
  })

  it('falls back to Now rather than rendering nothing for an unknown route', () => {
    expect(destinationFromHash('#/nonsense')).toBe('now')
    expect(destinationFromHash('#/../../etc')).toBe('now')
  })
})

describe('isDestination', () => {
  it('rejects values outside the destination list', () => {
    expect(isDestination('now')).toBe(true)
    expect(isDestination('health')).toBe(false)
    expect(isDestination('')).toBe(false)
  })
})

describe('primary navigation shape', () => {
  it('has exactly the four primary destinations and nothing else', () => {
    // Section 5 fixes the conceptual structure: Now, Life, Timeline, Insights.
    // A fifth tab is a fifth primary destination whatever its label says, so
    // this asserts the whole list rather than only that QA is absent.
    expect(DESTINATIONS).toEqual(['now', 'life', 'timeline', 'insights'])
    expect(PRIMARY_DESTINATIONS).toEqual(DESTINATIONS)
    expect(DESTINATIONS).toHaveLength(4)
  })

  it('keeps More, Data and QA reachable without giving any of them a slot in the bar', () => {
    expect(SECONDARY_DESTINATIONS).toEqual(['more', 'data', 'check-in', 'qa'])
    for (const secondary of SECONDARY_DESTINATIONS) {
      expect(DESTINATIONS as readonly string[]).not.toContain(secondary)
      expect(ALL_DESTINATIONS as readonly string[]).toContain(secondary)
      expect(isDestination(secondary)).toBe(true)
    }
  })

  it('still resolves a secondary destination from its own hash', () => {
    for (const secondary of SECONDARY_DESTINATIONS) {
      expect(destinationFromHash(hashForDestination(secondary))).toBe(secondary)
    }
  })

  it('resolves Data in every build, including production', () => {
    // Section 29 and G-012: backup and restore have to stay reachable, and a
    // route that resolves from a typed hash is reachable when the screen it is
    // normally reached from is having trouble.
    expect(destinationFromHash('#/data')).toBe('data')
    expect(isReachable('data')).toBe(true)
  })

  it('resolves the QA route in a non-production build', () => {
    // Tests run against the development target, where the laboratory exists.
    expect(QA_AVAILABLE).toBe(true)
    expect(destinationFromHash('#/qa')).toBe('qa')
    expect(isReachable('qa')).toBe(true)
  })
})

describe('lifePageSlugFromHash — a domain page is a second segment under Life', () => {
  it('reads the slug from a Life sub-route', () => {
    expect(lifePageSlugFromHash('#/life/health-recovery')).toBe('health-recovery')
    expect(lifePageSlugFromHash(hashForLifePage('fatherhood'))).toBe('fatherhood')
  })

  it('is undefined on the bare Life route, and on every other destination', () => {
    expect(lifePageSlugFromHash('#/life')).toBeUndefined()
    expect(lifePageSlugFromHash('#/life/')).toBeUndefined()
    expect(lifePageSlugFromHash('#/now')).toBeUndefined()
    expect(lifePageSlugFromHash('#/now/health-recovery')).toBeUndefined()
    expect(lifePageSlugFromHash('')).toBeUndefined()
  })

  it('does not decide whether the slug is a real page', () => {
    // Syntactic only, on purpose — src/platform does not know the page list.
    expect(lifePageSlugFromHash('#/life/nonsense')).toBe('nonsense')
  })

  it('ignores a trailing query string', () => {
    expect(lifePageSlugFromHash('#/life/money?from=insights')).toBe('money')
  })

  it('is case insensitive, like every other route in this file', () => {
    expect(lifePageSlugFromHash('#/Life/Health-Recovery')).toBe('health-recovery')
  })

  it('still resolves the primary destination to Life on a sub-route', () => {
    // Section 5's four primary destinations must not gain a fifth just
    // because a domain page exists underneath one of them.
    expect(destinationFromHash('#/life/health-recovery')).toBe('life')
  })
})
