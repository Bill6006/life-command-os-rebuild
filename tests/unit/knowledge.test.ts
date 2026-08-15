import { describe, expect, it } from 'vitest'
import {
  applyFreshness,
  averageOfUsable,
  basisOf,
  countUsable,
  explicit,
  inferred,
  isUsable,
  lastKnownValue,
  latestUsable,
  mapKnowledge,
  matchKnowledge,
  shouldAsk,
  sumOfUsable,
  unknown,
  valueIfUsable,
  confidence,
  type Knowledge,
} from '../../src/domain/knowledge'
import { sequentialRecordIds } from '../../src/domain/ids'
import { instant, timeZone, type Instant } from '../../src/domain/time'
import { conceptId, freshnessWindow } from '../../src/domain/windows'

const NEW_YORK = timeZone('America/New_York')
const nextId = sequentialRecordIds('KNOW')
const SLEEP = conceptId('sleep.hours-last-night')

function at(iso: string): Instant {
  return instant(Date.parse(iso))
}

describe('unknown stays unknown', () => {
  it('has no way to ask for a default', () => {
    const nothing = unknown('never-observed')
    expect(valueIfUsable(nothing)).toBeUndefined()
    expect(lastKnownValue(nothing)).toBeUndefined()
    expect(isUsable(nothing)).toBe(false)
    expect(basisOf(nothing)).toEqual([])
    // There is deliberately no valueOr / getOrElse / withDefault in the module.
    expect(Object.keys(nothing)).toEqual(['state', 'reason'])
  })

  it('averages nothing into unknown rather than into zero', () => {
    const average = averageOfUsable([])
    expect(average.state).toBe('unknown')
    expect(valueIfUsable(average)).toBeUndefined()
  })

  it('sums nothing into unknown rather than into zero', () => {
    const total = sumOfUsable([unknown('never-observed'), unknown('retracted')])
    expect(total.state).toBe('unknown')
  })

  it('counts nothing as zero, because that is a true answer', () => {
    expect(countUsable([unknown('never-observed')])).toBe(0)
  })

  it('ignores unknowns inside an aggregate instead of scoring them zero', () => {
    const values: Knowledge<number>[] = [
      explicit(8, at('2026-03-01T12:00:00Z'), nextId()),
      unknown('never-observed'),
      explicit(6, at('2026-03-02T12:00:00Z'), nextId()),
    ]
    const average = averageOfUsable(values)
    expect(average.state).toBe('inferred')
    // 7, not 4.67 — an absent night is not a night of no sleep.
    expect(valueIfUsable(average)).toBe(7)
    expect(basisOf(average)).toHaveLength(2)
  })

  it('keeps an aggregate inferred even when every input was explicit', () => {
    const average = averageOfUsable([
      explicit(8, at('2026-03-01T12:00:00Z'), nextId()),
      explicit(6, at('2026-03-02T12:00:00Z'), nextId()),
    ])
    expect(average.state).toBe('inferred')
    if (average.state === 'inferred') {
      expect(average.confidence).toBeLessThan(1)
      // The aggregate is as recent as its most recent input.
      expect(average.observedAt).toBe(at('2026-03-02T12:00:00Z'))
    }
  })

  it('stays unknown through a transformation', () => {
    const mapped = mapKnowledge(unknown('contradicted'), (value: number) => value * 2)
    expect(mapped.state).toBe('unknown')
    if (mapped.state === 'unknown') expect(mapped.reason).toBe('contradicted')
  })

  it('reports the latest of nothing as unknown', () => {
    expect(latestUsable([unknown('malformed')]).state).toBe('unknown')
  })
})

describe('matching', () => {
  it('forces every state to be handled', () => {
    const describeIt = (knowledge: Knowledge<number>): string =>
      matchKnowledge(knowledge, {
        explicit: (known) => `you said ${known.value}`,
        inferred: (known) => `probably ${known.value}`,
        stale: (known) => `${known.value}, but that was a while ago`,
        unknown: (known) => `not known (${known.reason})`,
      })

    expect(describeIt(explicit(7, at('2026-03-01T12:00:00Z'), nextId()))).toBe('you said 7')
    expect(describeIt(inferred(7, at('2026-03-01T12:00:00Z'), confidence(0.5), [nextId()]))).toBe(
      'probably 7',
    )
    expect(describeIt(unknown('never-observed'))).toBe('not known (never-observed)')
  })
})

describe('freshness', () => {
  const window = freshnessWindow(SLEEP, { unit: 'local-days', days: 1 })

  it('leaves knowledge alone inside its window', () => {
    const known = explicit(7, at('2026-06-01T12:00:00Z'), nextId())
    const aged = applyFreshness(known, at('2026-06-02T11:00:00Z'), window, NEW_YORK)
    expect(aged.state).toBe('explicit')
  })

  it('turns it stale rather than deleting it', () => {
    const known = explicit(7, at('2026-06-01T12:00:00Z'), nextId())
    const aged = applyFreshness(known, at('2026-06-03T12:00:00Z'), window, NEW_YORK)
    expect(aged.state).toBe('stale')
    // The value survives so the app can say what it used to think…
    expect(lastKnownValue(aged)).toBe(7)
    // …but it is not something to reason from now.
    expect(valueIfUsable(aged)).toBeUndefined()
    expect(isUsable(aged)).toBe(false)
  })

  it('measures a calendar horizon in calendar days, not in 24-hour blocks', () => {
    // 20:00 the evening before New York springs forward. That local day is 23
    // hours long, so a one-local-day horizon expires an hour sooner than a
    // 24-hour horizon would.
    const observed = at('2026-03-08T01:00:00Z') // 2026-03-07 20:00 EST
    const known = explicit(7, observed, nextId())

    const at22h = instant(observed + 22 * 3_600_000)
    const at23h = instant(observed + 23 * 3_600_000)
    expect(applyFreshness(known, at22h, window, NEW_YORK).state).toBe('explicit')
    expect(applyFreshness(known, at23h, window, NEW_YORK).state).toBe('stale')
  })

  it('never ages durable knowledge', () => {
    const durable = freshnessWindow(conceptId('family.child-present'), { unit: 'durable' })
    const known = explicit('with me', at('2024-01-01T12:00:00Z'), nextId())
    const aged = applyFreshness(known, at('2029-01-01T12:00:00Z'), durable, NEW_YORK)
    expect(aged.state).toBe('explicit')
  })

  it('leaves an unknown unknown rather than making it stale', () => {
    const aged = applyFreshness(
      unknown('never-observed'),
      at('2026-06-03T12:00:00Z'),
      window,
      NEW_YORK,
    )
    expect(aged.state).toBe('unknown')
  })
})

describe('deciding whether to ask', () => {
  const material = { materialToDecision: true, askWhenStale: true }

  it('never re-asks something already known', () => {
    expect(shouldAsk(explicit(7, at('2026-06-01T12:00:00Z'), nextId()), material)).toBe(false)
    expect(
      shouldAsk(inferred(7, at('2026-06-01T12:00:00Z'), confidence(0.4), [nextId()]), material),
    ).toBe(false)
  })

  it('asks about an unknown only when the answer could change something', () => {
    expect(shouldAsk(unknown('never-observed'), material)).toBe(true)
    expect(
      shouldAsk(unknown('never-observed'), { materialToDecision: false, askWhenStale: true }),
    ).toBe(false)
  })

  it('does not ask about something that does not apply', () => {
    expect(shouldAsk(unknown('not-applicable'), material)).toBe(false)
  })

  it('leaves a durable fact alone once it has lapsed policy turned off', () => {
    const window = freshnessWindow(SLEEP, { unit: 'elapsed', ms: 1 })
    const lapsed = applyFreshness(
      explicit(7, at('2026-06-01T12:00:00Z'), nextId()),
      at('2026-06-02T12:00:00Z'),
      window,
      NEW_YORK,
    )
    expect(lapsed.state).toBe('stale')
    expect(shouldAsk(lapsed, { materialToDecision: true, askWhenStale: false })).toBe(false)
    expect(shouldAsk(lapsed, { materialToDecision: true, askWhenStale: true })).toBe(true)
  })
})
