import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import {
  instant,
  localDayIdAt,
  localWeekIdAt,
  timeZone,
  type Instant,
  type TimeZoneId,
} from '../../src/domain/time'
import { loadScenario } from './harness'

/**
 * G-011 — timezone and week boundary.
 *
 * Expected: local week and date semantics hold across multiple timezones and
 * DST.
 *
 * The scenario places four entries on purpose: one on a week boundary, one at
 * the instant New York's clocks jump forward, one inside the hour New York
 * repeats in autumn, and one on an ordinary Monday. Every expected value below
 * was worked out from the calendar, not read back out of the implementation.
 */

const DENVER = timeZone('America/Denver')
const AUCKLAND = timeZone('Pacific/Auckland')
const UTC = timeZone('UTC')
const NEW_YORK = timeZone('America/New_York')
const SYDNEY = timeZone('Australia/Sydney')

const WEEK_EDGE = instant(Date.parse('2026-01-04T12:00:00Z'))
const SPRING_FORWARD = instant(Date.parse('2026-03-08T07:30:00Z'))
const FALL_BACK = instant(Date.parse('2026-11-01T05:30:00Z'))
const ORDINARY_MONDAY = instant(Date.parse('2026-10-26T15:00:00Z'))

describe('G-011 — one instant, several owner-local answers', () => {
  const loaded = loadScenario('across-timezones')

  it('carries the four entries the scenario is built around', () => {
    const occurred = loaded.snapshot.records.map((record) => record.occurredAt)
    expect(occurred).toContain(WEEK_EDGE)
    expect(occurred).toContain(SPRING_FORWARD)
    expect(occurred).toContain(FALL_BACK)
    expect(occurred).toContain(ORDINARY_MONDAY)
  })

  it('puts a Sunday-noon entry in two different weeks depending on where you are', () => {
    // 12:00 UTC on Sunday 4 January. Already Monday in Auckland.
    expect(localDayIdAt(WEEK_EDGE, AUCKLAND)).toBe('2026-01-05')
    expect(localWeekIdAt(WEEK_EDGE, AUCKLAND)).toBe('2026-W02')

    for (const zone of [UTC, DENVER, NEW_YORK, SYDNEY]) {
      expect(localDayIdAt(WEEK_EDGE, zone), zone).toBe('2026-01-04')
      expect(localWeekIdAt(WEEK_EDGE, zone), zone).toBe('2026-W01')
    }
  })

  it('puts an entry either side of midnight when the clocks are changing', () => {
    // Denver is still on mountain daylight time at 05:30 UTC, which makes this
    // the evening before — a different local day from everywhere else.
    expect(localDayIdAt(FALL_BACK, DENVER)).toBe('2026-10-31')
    expect(localDayIdAt(FALL_BACK, UTC)).toBe('2026-11-01')
    expect(localDayIdAt(FALL_BACK, NEW_YORK)).toBe('2026-11-01')
    expect(localDayIdAt(FALL_BACK, AUCKLAND)).toBe('2026-11-01')

    // Same week in all of them, though — the boundary that moved was the day.
    for (const zone of [DENVER, UTC, NEW_YORK, AUCKLAND, SYDNEY]) {
      expect(localWeekIdAt(FALL_BACK, zone), zone).toBe('2026-W44')
    }
  })

  it('reads the spring-forward instant as the right local time everywhere', () => {
    // New York skips 02:00 to 03:00 at exactly this instant.
    expect(localDayIdAt(SPRING_FORWARD, NEW_YORK)).toBe('2026-03-08')
    expect(localDayIdAt(SPRING_FORWARD, DENVER)).toBe('2026-03-08')
    expect(localDayIdAt(SPRING_FORWARD, AUCKLAND)).toBe('2026-03-08')
    for (const zone of [DENVER, UTC, NEW_YORK, AUCKLAND, SYDNEY]) {
      expect(localWeekIdAt(SPRING_FORWARD, zone), zone).toBe('2026-W10')
    }
  })

  it('groups history by the week of whoever is reading it', () => {
    const inDenver = loaded.viewAt(loaded.scenario.now, DENVER)
    const inAuckland = loaded.viewAt(loaded.scenario.now, AUCKLAND)

    expect([...inDenver.summary.byLocalWeek.keys()].sort()).not.toEqual(
      [...inAuckland.summary.byLocalWeek.keys()].sort(),
    )
    expect(inAuckland.summary.byLocalWeek.get('2026-W02' as never)).toBe(1)
    expect(inDenver.summary.byLocalWeek.get('2026-W01' as never)).toBe(1)

    // Same history, same number of entries, wherever it is read from.
    for (const view of [inDenver, inAuckland]) {
      const counted = [...view.summary.byLocalWeek.values()].reduce((a, b) => a + b, 0)
      expect(counted).toBe(loaded.snapshot.records.length)
    }
  })

  it('regroups when the owner’s week does not start on Monday', () => {
    const isoWeeks = loaded.viewAt(loaded.scenario.now, UTC, 1).summary.byLocalWeek
    const sundayWeeks = loaded.viewAt(loaded.scenario.now, UTC, 7).summary.byLocalWeek

    // The ordinary Monday closes a Sunday-start week and opens an ISO one.
    expect(localWeekIdAt(ORDINARY_MONDAY, UTC, 1)).toBe('2026-W44')
    expect(localWeekIdAt(ORDINARY_MONDAY, UTC, 7)).toBe('2026-W43')
    expect(isoWeeks.has('2026-W43' as never)).toBe(false)
    expect(sundayWeeks.has('2026-W43' as never)).toBe(true)
  })
})

describe('G-011 — freshness is measured in local days, not in 24-hour blocks', () => {
  const loaded = loadScenario('across-timezones')

  it('expires an entry an hour early on the day the clocks go forward', () => {
    // The entry is 00:30 on 8 March in Denver, and that local day is 23 hours
    // long. A one-local-day horizon therefore runs out at 00:30 on the 9th,
    // which is 23 hours later — not 24.
    expect(localDayIdAt(SPRING_FORWARD, DENVER)).toBe('2026-03-08')

    const at22h: Instant = instant(SPRING_FORWARD + 22 * 3_600_000)
    const at23h: Instant = instant(SPRING_FORWARD + 23 * 3_600_000)

    expect(loaded.viewAt(at22h, DENVER).facts.knowledgeFor(CONCEPT.sleepQuality).state).toBe(
      'explicit',
    )
    expect(loaded.viewAt(at23h, DENVER).facts.knowledgeFor(CONCEPT.sleepQuality).state).toBe(
      'stale',
    )
  })

  it('expires it an hour late on the day the clocks go back', () => {
    // 31 October in Denver is 25 hours long, because the clocks go back on the
    // 1st. The same horizon runs a full hour longer.
    const at24h: Instant = instant(FALL_BACK + 24 * 3_600_000)
    const at25h: Instant = instant(FALL_BACK + 25 * 3_600_000)

    expect(loaded.viewAt(at24h, DENVER).facts.knowledgeFor(CONCEPT.sleepQuality).state).toBe(
      'explicit',
    )
    expect(loaded.viewAt(at25h, DENVER).facts.knowledgeFor(CONCEPT.sleepQuality).state).toBe(
      'stale',
    )
  })
})

describe('G-011 — a week identifier is never an instant', () => {
  const loaded = loadScenario('across-timezones')

  it('gives the same history different week labels without moving a record', () => {
    const zones: readonly TimeZoneId[] = [DENVER, AUCKLAND, UTC, NEW_YORK, SYDNEY]
    const seen = new Set<string>()
    let history: readonly Instant[] | undefined

    for (const zone of zones) {
      const view = loaded.viewAt(loaded.scenario.now, zone)
      seen.add([...view.summary.byLocalWeek.keys()].sort().join(','))

      // The records themselves are untouched by where they are read from —
      // only the labels the calendar puts on them change.
      const occurred = view.history.all.map((record) => record.occurredAt)
      if (history === undefined) history = occurred
      else expect(occurred, zone).toEqual(history)
    }

    expect(seen.size).toBeGreaterThan(1)
  })
})
