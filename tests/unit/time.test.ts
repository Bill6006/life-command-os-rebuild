import { describe, expect, it } from 'vitest'
import {
  addLocalDays,
  addLocalDaysToDayId,
  civilDateFromDayId,
  civilFromDays,
  daysFromCivil,
  instant,
  instantAtLocal,
  isoWeekdayOfDays,
  localDayId,
  localDayIdAt,
  localDateTimeAt,
  localTimeOfDayAt,
  localWeekIdAt,
  localWeekIdFromDayId,
  localWeekRange,
  parseInstant,
  parseLocalDayId,
  parseLocalWeekId,
  resolveLocal,
  startOfLocalDay,
  timeZone,
  weekStartDayId,
  type Instant,
  type LocalDayId,
  type LocalWeekId,
} from '../../src/domain/time'

const UTC = timeZone('UTC')
const NEW_YORK = timeZone('America/New_York')
const LONDON = timeZone('Europe/London')
const SYDNEY = timeZone('Australia/Sydney')
const AUCKLAND = timeZone('Pacific/Auckland')

function at(iso: string): Instant {
  const parsed = parseInstant(iso)
  if (parsed === undefined) throw new Error(`bad fixture instant ${iso}`)
  return parsed
}

function day(value: string): LocalDayId {
  const parsed = parseLocalDayId(value)
  if (parsed === undefined) throw new Error(`bad fixture day ${value}`)
  return parsed
}

function week(value: string): LocalWeekId {
  const parsed = parseLocalWeekId(value)
  if (parsed === undefined) throw new Error(`bad fixture week ${value}`)
  return parsed
}

describe('civil dates', () => {
  it('round-trips every day across a multi-year span', () => {
    const start = daysFromCivil({ year: 2023, month: 1, day: 1 })
    const end = daysFromCivil({ year: 2031, month: 1, day: 1 })
    for (let days = start; days < end; days += 1) {
      expect(daysFromCivil(civilFromDays(days))).toBe(days)
    }
  })

  it('knows the weekday of reference dates', () => {
    expect(isoWeekdayOfDays(daysFromCivil({ year: 1970, month: 1, day: 1 }))).toBe(4) // Thursday
    expect(isoWeekdayOfDays(daysFromCivil({ year: 2026, month: 1, day: 1 }))).toBe(4) // Thursday
    expect(isoWeekdayOfDays(daysFromCivil({ year: 2026, month: 8, day: 16 }))).toBe(7) // Sunday
    expect(isoWeekdayOfDays(daysFromCivil({ year: 1969, month: 12, day: 24 }))).toBe(3) // Wednesday
  })

  it('handles the leap day', () => {
    expect(localDayId(civilFromDays(daysFromCivil({ year: 2028, month: 2, day: 29 })))).toBe(
      '2028-02-29',
    )
    expect(addLocalDaysToDayId(day('2028-02-28'), 1)).toBe('2028-02-29')
    expect(addLocalDaysToDayId(day('2027-02-28'), 1)).toBe('2027-03-01')
  })

  it('rejects a date the calendar does not have', () => {
    expect(parseLocalDayId('2026-02-30')).toBeUndefined()
    expect(parseLocalDayId('2026-13-01')).toBeUndefined()
    expect(parseLocalDayId('not-a-day')).toBeUndefined()
    expect(parseLocalDayId(20260101)).toBeUndefined()
    expect(parseLocalDayId('2026-02-28')).toBe('2026-02-28')
  })
})

describe('one instant, many owner-local answers', () => {
  // Sunday 12:00 UTC. Already Monday in Auckland, still Sunday morning in
  // New York — so the same moment sits in two different owner-local weeks.
  const moment = at('2026-01-04T12:00:00Z')

  it('gives a different local day depending on where the owner is', () => {
    expect(localDayIdAt(moment, AUCKLAND)).toBe('2026-01-05')
    expect(localDayIdAt(moment, UTC)).toBe('2026-01-04')
    expect(localDayIdAt(moment, NEW_YORK)).toBe('2026-01-04')
    expect(localTimeOfDayAt(moment, NEW_YORK)).toBe('07:00')
    expect(localTimeOfDayAt(moment, AUCKLAND)).toBe('01:00')
  })

  it('gives a different local week depending on where the owner is', () => {
    expect(localWeekIdAt(moment, AUCKLAND)).toBe('2026-W02')
    expect(localWeekIdAt(moment, UTC)).toBe('2026-W01')
    expect(localWeekIdAt(moment, NEW_YORK)).toBe('2026-W01')
  })

  it('reports midnight as hour zero rather than as hour 24', () => {
    const midnight = at('2026-06-15T04:00:00Z') // 00:00 in New York
    const local = localDateTimeAt(midnight, NEW_YORK)
    expect(local.hour).toBe(0)
    expect(local.timeOfDay).toBe('00:00')
    expect(local.dayId).toBe('2026-06-15')
  })
})

describe('local week identifiers', () => {
  it('matches ISO-8601 at the year boundary', () => {
    expect(localWeekIdFromDayId(day('2025-12-28'))).toBe('2025-W52')
    expect(localWeekIdFromDayId(day('2025-12-29'))).toBe('2026-W01')
    expect(localWeekIdFromDayId(day('2026-01-01'))).toBe('2026-W01')
    expect(localWeekIdFromDayId(day('2026-12-31'))).toBe('2026-W53')
    expect(localWeekIdFromDayId(day('2027-01-03'))).toBe('2026-W53')
    expect(localWeekIdFromDayId(day('2027-01-04'))).toBe('2027-W01')
  })

  it('covers every day exactly once, for every week start', () => {
    const first = daysFromCivil({ year: 2025, month: 1, day: 1 })
    const last = daysFromCivil({ year: 2029, month: 1, day: 1 })
    const failures: string[] = []

    for (const weekStartsOn of [1, 4, 7] as const) {
      for (let days = first; days < last; days += 1) {
        const dayId = localDayId(civilFromDays(days))
        const weekId = localWeekIdFromDayId(dayId, weekStartsOn)
        const openingDay = weekStartDayId(weekId, weekStartsOn)
        const offset = days - daysFromCivil(civilDateFromDayId(openingDay))

        // The day falls inside the week its identifier names, and the week's
        // own opening day agrees about which week that is. Together those two
        // make the mapping a partition: no gaps, no day in two weeks.
        if (offset < 0 || offset > 6) {
          failures.push(`${dayId} (start ${weekStartsOn}) -> ${weekId} opens ${openingDay}`)
        }
        if (localWeekIdFromDayId(openingDay, weekStartsOn) !== weekId) {
          failures.push(`${weekId} (start ${weekStartsOn}) opens on a day in another week`)
        }
      }
    }

    expect(failures).toEqual([])
  })

  it('honours a week that does not start on Monday', () => {
    // 2026-01-04 is a Sunday. Under ISO it closes 2026-W01; under a
    // Sunday-start calendar it opens the following week.
    expect(localWeekIdFromDayId(day('2026-01-04'), 1)).toBe('2026-W01')
    expect(weekStartDayId(localWeekIdFromDayId(day('2026-01-04'), 7), 7)).toBe('2026-01-04')
    expect(weekStartDayId(localWeekIdFromDayId(day('2026-01-04'), 1), 1)).toBe('2025-12-29')
  })

  it('is not an instant — the same week starts at different moments', () => {
    const weekId = week('2026-W02')
    const inAuckland = localWeekRange(weekId, AUCKLAND)
    const inUtc = localWeekRange(weekId, UTC)
    const inNewYork = localWeekRange(weekId, NEW_YORK)

    expect(inAuckland.start).not.toBe(inUtc.start)
    expect(inUtc.start).not.toBe(inNewYork.start)
    expect(inAuckland.start).toBeLessThan(inUtc.start)
    expect(inUtc.start).toBeLessThan(inNewYork.start)

    // …and every one of those instants is inside the week it came from.
    expect(localWeekIdAt(inAuckland.start, AUCKLAND)).toBe(weekId)
    expect(localWeekIdAt(inUtc.start, UTC)).toBe(weekId)
    expect(localWeekIdAt(inNewYork.start, NEW_YORK)).toBe(weekId)
  })

  it('will not let a week identifier be used as an instant', () => {
    const weekId = week('2026-W02')
    // @ts-expect-error a LocalWeekId is not an Instant — section 15
    const asInstant: Instant = weekId
    expect(typeof asInstant).toBe('string')

    const moment = at('2026-01-05T00:00:00Z')
    // @ts-expect-error and an Instant is not a LocalWeekId
    const asWeek: LocalWeekId = moment
    expect(typeof asWeek).toBe('number')
  })

  it('rejects a malformed week identifier', () => {
    expect(parseLocalWeekId('2026-W00')).toBeUndefined()
    expect(parseLocalWeekId('2026-W54')).toBeUndefined()
    expect(parseLocalWeekId('2026-02')).toBeUndefined()
    expect(parseLocalWeekId(2026)).toBeUndefined()
  })
})

describe('daylight saving', () => {
  it('resolves a wall time that does not exist to just after the gap', () => {
    // New York springs forward at 02:00 on 2026-03-08.
    const resolved = resolveLocal(
      { year: 2026, month: 3, day: 8, hour: 2, minute: 30, second: 0 },
      NEW_YORK,
    )
    expect(resolved.resolution).toBe('gap')
    expect(localTimeOfDayAt(resolved.at, NEW_YORK)).toBe('03:30')
    expect(resolved.at).toBe(at('2026-03-08T07:30:00Z'))
  })

  it('resolves a repeated wall time to its first occurrence', () => {
    // New York falls back at 02:00 on 2026-11-01, so 01:30 happens twice.
    const resolved = resolveLocal(
      { year: 2026, month: 11, day: 1, hour: 1, minute: 30, second: 0 },
      NEW_YORK,
    )
    expect(resolved.resolution).toBe('ambiguous')
    expect(resolved.at).toBe(at('2026-11-01T05:30:00Z'))
    expect(localTimeOfDayAt(resolved.at, NEW_YORK)).toBe('01:30')
  })

  it('reports an ordinary wall time as exact', () => {
    const resolved = resolveLocal(
      { year: 2026, month: 6, day: 15, hour: 21, minute: 0, second: 0 },
      NEW_YORK,
    )
    expect(resolved.resolution).toBe('exact')
    expect(resolved.at).toBe(at('2026-06-16T01:00:00Z'))
  })

  it('adds a local day as a calendar step, not as 24 hours', () => {
    // Spring forward: the day is 23 hours long, and 20:00 is still 20:00.
    const before = instantAtLocal(
      { year: 2026, month: 3, day: 7, hour: 20, minute: 0, second: 0 },
      NEW_YORK,
    )
    const after = addLocalDays(before, 1, NEW_YORK)
    expect(localDayIdAt(after, NEW_YORK)).toBe('2026-03-08')
    expect(localTimeOfDayAt(after, NEW_YORK)).toBe('20:00')
    expect(after - before).toBe(23 * 3_600_000)

    // Autumn in the southern hemisphere: the same step is 25 hours long.
    const sydneyBefore = instantAtLocal(
      { year: 2026, month: 4, day: 4, hour: 20, minute: 0, second: 0 },
      SYDNEY,
    )
    const sydneyAfter = addLocalDays(sydneyBefore, 1, SYDNEY)
    expect(localDayIdAt(sydneyAfter, SYDNEY)).toBe('2026-04-05')
    expect(localTimeOfDayAt(sydneyAfter, SYDNEY)).toBe('20:00')
    expect(sydneyAfter - sydneyBefore).toBe(25 * 3_600_000)
  })

  it('keeps a local week 7 local days long across a clock change', () => {
    for (const zone of [NEW_YORK, LONDON, SYDNEY, AUCKLAND, UTC]) {
      const weekId = localWeekIdAt(at('2026-03-10T12:00:00Z'), zone)
      const range = localWeekRange(weekId, zone)
      const startDay = localDayIdAt(range.start, zone)
      expect(addLocalDaysToDayId(startDay, 7)).toBe(localDayIdAt(range.end, zone))
      expect(localWeekIdAt(instant(range.end - 1), zone)).toBe(weekId)
    }
  })

  it('starts a local day at local midnight in every zone', () => {
    for (const zone of [NEW_YORK, LONDON, SYDNEY, AUCKLAND, UTC]) {
      for (const dayId of ['2026-03-08', '2026-04-05', '2026-10-25', '2026-11-01']) {
        const start = startOfLocalDay(day(dayId), zone)
        expect(localDayIdAt(start, zone)).toBe(dayId)
        // One millisecond earlier belongs to the day before. That is what makes
        // a day boundary a boundary.
        expect(localDayIdAt(instant(start - 1), zone)).not.toBe(dayId)
      }
    }
  })
})

describe('instants', () => {
  it('parses ISO strings and numbers, and rejects nonsense', () => {
    expect(parseInstant('2026-01-04T12:00:00Z')).toBe(1767528000000)
    expect(parseInstant(1767528000000)).toBe(1767528000000)
    expect(parseInstant('not a time')).toBeUndefined()
    expect(parseInstant(Number.NaN)).toBeUndefined()
    expect(parseInstant(null)).toBeUndefined()
  })
})
