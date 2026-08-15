import { describe, expect, it } from 'vitest'
import {
  ALL_DESTINATIONS,
  DEFAULT_DESTINATION,
  DESTINATIONS,
  destinationFromHash,
  hashForDestination,
  isDestination,
  isReachable,
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
  it('keeps four primary destinations plus More', () => {
    expect(DESTINATIONS).toEqual(['now', 'life', 'timeline', 'insights', 'more'])
  })

  it('keeps QA reachable without giving it a slot in the navigation', () => {
    // Section 5 — developer surfaces do not consume one of five places on a
    // phone's navigation bar.
    expect(SECONDARY_DESTINATIONS).toEqual(['qa'])
    expect(DESTINATIONS).not.toContain('qa')
    expect(ALL_DESTINATIONS).toContain('qa')
    expect(isDestination('qa')).toBe(true)
  })

  it('resolves the QA route in a non-production build', () => {
    // Tests run against the development target, where the laboratory exists.
    expect(QA_AVAILABLE).toBe(true)
    expect(destinationFromHash('#/qa')).toBe('qa')
    expect(isReachable('qa')).toBe(true)
  })
})
