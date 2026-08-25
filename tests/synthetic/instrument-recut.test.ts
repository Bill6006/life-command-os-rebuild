import { describe, expect, it } from 'vitest'
import { DOMAIN } from '../../src/domain/domains'
import { CLOSE_ENOUGH_TO_MENTION, WORTH_DOING } from '../../src/intelligence/arbitrate'
import { decide, type Decision } from '../../src/intelligence/engine'
import type { Dimension } from '../../src/intelligence/evaluate'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import {
  SCENARIOS,
  weekPointedAt,
  WEEK_POINTED_AT_NOW,
  WEEK_POINTED_AT_ZONE,
} from '../../src/synthetic/scenarios'
import { loadScenario } from './harness'

/**
 * AUD-0035 — the instrument, re-cut once and deliberately.
 *
 * `bottleneck-fit` (weight 2.5), `direction-fit` (1.8) and `goal-fit` (1)
 * returned `value: 0` **at full weight** when there was no limiter, no weekly
 * direction and no goal. That is 5.3 of about 15.8 weight units of dead zero on
 * an ordinary evening, dividing every candidate's score by roughly one and a
 * half — and the consequences were live rather than theoretical. An observed
 * evening ranked 0.137 / 0.135 / 0.134: three candidates inside three
 * thousandths, and the owner shown a confident recommendation decided by
 * rounding.
 *
 * D-048 had already established the rule for `follow-through` and recorded, in
 * as many words, that the older dimensions were left alone because re-cutting
 * them means re-running section 18's tournament — "which belongs to a phase
 * that can". This is that phase, and this file is what it re-cut and why.
 */

const ALL = SCENARIOS.map((scenario) => ({
  id: scenario.id,
  decision: loadScenario(scenario.id).decision(),
}))

function dimensionsOf(decision: Decision): readonly { row: string; dimension: Dimension }[] {
  return decision.trace.ranking.flatMap((row) =>
    row.dimensions.map((dimension) => ({ row: row.id, dimension })),
  )
}

// ---------------------------------------------------------------------------
// The three that were re-cut
// ---------------------------------------------------------------------------

describe('a dimension with nothing to say carries no weight — D-048, applied', () => {
  const ABSTAINING: readonly { readonly name: string; readonly note: string }[] = [
    { name: 'bottleneck-fit', note: 'nothing in particular is in the way' },
    { name: 'bottleneck-fit', note: 'nothing is in the way — an area has just gone quiet' },
    { name: 'direction-fit', note: 'no direction set for this week' },
    { name: 'goal-fit', note: 'no active goal in this area' },
  ]

  for (const { name, note } of ABSTAINING) {
    it(`carries no weight when ${name} says "${note}"`, () => {
      /*
       * Enumerated by name rather than counted — D-108. "The three older
       * dimensions abstain" is four separate branches, and a sweep that
       * happened to cover one of them would be a smaller claim wearing the
       * same title.
       */
      const found = ALL.flatMap((entry) => dimensionsOf(entry.decision))
        .map((entry) => entry.dimension)
        .filter((dimension) => dimension.name === name && dimension.note === note)

      expect(found.length, `no history in the library reaches "${note}"`).toBeGreaterThan(0)
      for (const dimension of found) {
        expect(dimension.value, note).toBe(0)
        expect(dimension.weight, note).toBe(0)
      }
    })
  }

  it('still speaks when it has something to say', () => {
    // The other half, so the four above are not passing because the dimensions
    // stopped contributing at all.
    const speaking = ALL.flatMap((entry) => dimensionsOf(entry.decision))
      .map((entry) => entry.dimension)
      .filter(
        (dimension) =>
          ['bottleneck-fit', 'direction-fit', 'goal-fit'].includes(dimension.name) &&
          dimension.weight > 0,
      )
    expect(speaking.length, 'the three re-cut dimensions never speak any more').toBeGreaterThan(5)
    for (const dimension of speaking) {
      expect(dimension.value, dimension.note).not.toBe(0)
    }
  })
})

describe('what still scores zero at full weight, and why each one may', () => {
  /*
   * AUD-0035 asks for "a guard that every dimension returning `value: 0` for an
   * 'unknown/absent' reason also returns `weight: 0`", and the honest way to
   * hold that is to enumerate what is left rather than to assert a rule the
   * code does not follow.
   *
   * Three of these are the same wart, and the re-cut deliberately did not reach
   * them: the finding scopes itself to "the three older dimensions", and each
   * further one is a separate judgement about a differently shaped scale.
   * They are named here so the next phase inherits a list rather than a search,
   * and so a **fourth** one appearing fails the build.
   */
  const ALLOWED: readonly { readonly what: string; readonly because: string }[] = [
    {
      what: 'capacity-fit :: nothing recent about sleep or energy',
      because:
        'The same wart, on a signed dimension. Abstaining would be correct and is out of this ' +
        'finding’s stated scope.',
    },
    {
      what: 'opportunity-cost :: how much time there is is unknown',
      because: 'The same wart, on a signed dimension. Out of scope for the same reason.',
    },
    {
      what: 'time-fit :: how much time there is is unknown',
      because:
        'The same wart, and the least safe of the three to change: `time-fit` runs 0…1, so ' +
        'abstaining would reward a move for the app not knowing how long the evening is.',
    },
    {
      what: 'opportunity-cost :: takes no fixed block of time',
      because:
        'A judgement rather than an absence. A move with no natural size genuinely costs no ' +
        'fixed block of the evening.',
    },
    {
      what: 'owner-preference :: no stated preference either way',
      because:
        'The neutral point of a signed dimension running −0.7 to +0.6. Zero is what "he has ' +
        'said nothing and turned nothing down" means, not a gap.',
    },
    {
      what: 'protection :: costs no other area anything',
      because: 'A judgement. The move was examined and found not to borrow against tomorrow.',
    },
    {
      what: 'urgency :: raised by nothing better',
      because:
        'The bottom of a positive-only scale. Abstaining would *reward* a move nothing raised, ' +
        'because every rival keeps its positive urgency in the mean.',
    },
    /*
     * Both of these were the old third band, and both changed wording and
     * meaning in the QA-82-003 repair. `time-fit` now has four bands: the
     * bottom one is −0.5 and is a move that does not fit at all, so it is no
     * longer zero and no longer appears here. What is left at zero is the band
     * either side of the line — a move that uses everything there is and no
     * more.
     */
    {
      what: 'time-fit :: would use all the time before Adaya’s school day',
      because:
        'The bottom of the fitting range, and a real finding about the hour: it fits, with ' +
        'nothing to spare. Not an absence, and no longer the same score as a move that ' +
        'overruns the school run.',
    },
    {
      what: 'time-fit :: would use the rest of the evening',
      because: 'The same reading with no obligation to name — it fits, and uses all of it.',
    },
    {
      what: 'immediate-benefit',
      because:
        'A learned belief sitting exactly at the middle of its range is a reading, not a gap. ' +
        'Matched on the name, because the note carries the sample count.',
    },
    {
      what: 'next-day-effect',
      because:
        'The same reading, about tomorrow rather than about tonight. A prior that has not been ' +
        'moved is a belief the app holds, not one it is missing.',
    },
  ]

  it('is exactly the list above, and nothing has been added to it quietly', () => {
    const seen = new Set<string>()
    for (const entry of ALL) {
      for (const { dimension } of dimensionsOf(entry.decision)) {
        if (dimension.value !== 0 || dimension.weight === 0) continue
        const full = `${dimension.name} :: ${dimension.note}`
        const matched = ALLOWED.find(
          (allowed) => allowed.what === full || allowed.what === dimension.name,
        )
        seen.add(matched?.what ?? `UNLISTED — ${full} (${entry.id})`)
      }
    }

    const unlisted = [...seen].filter((entry) => entry.startsWith('UNLISTED'))
    expect(unlisted, 'a new dimension scores zero at full weight — decide about it').toEqual([])
    // And the reverse: an entry nothing reaches is an entry nobody has checked.
    const unreached = ALLOWED.filter((allowed) => !seen.has(allowed.what))
    expect(
      unreached.map((entry) => entry.what),
      'the list has gone stale',
    ).toEqual([])
  })

  it('gives every entry a reason somebody wrote', () => {
    for (const allowed of ALLOWED) {
      expect(allowed.because.length, allowed.what).toBeGreaterThan(40)
    }
  })
})

// ---------------------------------------------------------------------------
// The bar, and the property the old one could not have
// ---------------------------------------------------------------------------

describe('the bar means the same thing however much context there is', () => {
  /*
   * AUD-0035's first consequence, and the test it asks for: "assert
   * `WORTH_DOING` behaviour is stable across a directed and an undirected
   * evening with otherwise identical facts."
   *
   * The old instrument could not pass this. `direction-fit` returned zero at
   * weight 1.8 with no direction set, so the undirected evening's whole field
   * was divided by a larger number and the same absolute bar was a harder bar —
   * "nothing worth doing" was systematically more likely exactly when the app
   * had least context.
   */
  function decideWith(direction: boolean): Decision {
    const document = direction
      ? weekPointedAt({ direction: { named: DOMAIN.home, wording: 'a calmer house' } })
      : weekPointedAt({})
    const loaded = snapshotFromWire(document)
    const moment = { now: WEEK_POINTED_AT_NOW, zone: WEEK_POINTED_AT_ZONE }
    return decide(buildView(loaded.snapshot, moment), moment)
  }

  const directed = decideWith(true)
  const undirected = decideWith(false)

  it('offers a move on both, from the same facts', () => {
    expect(directed.kind).toBe('move')
    expect(undirected.kind).toBe('move')
  })

  it('clears the bar by a comparable margin on both', () => {
    /*
     * The precise claim. Every candidate on the undirected evening used to be
     * dragged toward zero by 1.8 units of forced zero it had done nothing to
     * deserve; the two fields now sit at the same altitude, so the bar is one
     * bar rather than two.
     */
    const topOf = (decision: Decision): number => decision.trace.ranking[0]?.score ?? 0
    const overBar = (decision: Decision): number => topOf(decision) - WORTH_DOING

    expect(overBar(directed)).toBeGreaterThan(0)
    expect(overBar(undirected)).toBeGreaterThan(0)
    // Within a quarter of each other, on a history where the only difference is
    // whether the owner happened to write a sentence about his week.
    const ratio = overBar(undirected) / overBar(directed)
    expect(ratio, `${overBar(undirected)} against ${overBar(directed)}`).toBeGreaterThan(0.75)
    expect(ratio).toBeLessThan(1.34)
  })

  it('never marks a move down for a direction the owner did not set', () => {
    for (const row of undirected.trace.ranking) {
      const fit = row.dimensions.find((dimension) => dimension.name === 'direction-fit')
      expect(fit?.weight, `${row.id} paid for an unset direction`).toBe(0)
    }
  })
})

describe('the closeness threshold is half the bar', () => {
  it('is derived from it rather than chosen beside it', () => {
    // A gap smaller than half of what a move needs in order to be worth doing
    // at all is not a difference the app should present as a decision.
    expect(CLOSE_ENOUGH_TO_MENTION).toBe(WORTH_DOING / 2)
  })

  it('fires on the near-ties and on nothing else', () => {
    /*
     * AUD-0033 warns that saying "close call" often would undermine confidence,
     * and that if it fires on most evenings that is evidence for AUD-0035
     * rather than a reason to suppress the clause. So the rate is the
     * assertion: a minority of the histories that reach a contest.
     */
    const contested = ALL.filter((entry) => entry.decision.trace.ranking.length > 1)
    const close = contested.filter((entry) => entry.decision.explanation?.closeCall !== undefined)
    expect(contested.length).toBeGreaterThan(8)
    expect(close.length, 'nothing is ever close, so the clause is unread').toBeGreaterThan(0)
    expect(
      close.length * 2,
      `close on ${close.length} of ${contested.length} — the field is still compressed`,
    ).toBeLessThan(contested.length)
  })
})

// ---------------------------------------------------------------------------
// And the thing the re-cut was for
// ---------------------------------------------------------------------------

describe('the field is no longer decided by rounding', () => {
  it('spreads an ordinary evening further than the old instrument did', () => {
    /*
     * The audit's own worked example: "Nine months of evenings", Saturday
     * 19:30, four candidates, winner 0.137 and runner-up 0.135, with
     * `bottleneck-fit`, `direction-fit` and `goal-fit` all at +0.00.
     *
     * The winner is not asserted — three of that field are genuinely within a
     * hundredth of each other and which one wins is a judgement the evidence
     * does not settle. What is asserted is the altitude: the same evening is
     * now read on a scale roughly half again as tall, and the app says out loud
     * that it was close.
     */
    const longRun = ALL.find((entry) => entry.id === 'long-run')
    expect(longRun, 'the nine-month history is gone').toBeDefined()
    if (longRun === undefined) return

    const top = longRun.decision.trace.ranking[0]?.score ?? 0
    expect(top, 'the field is as compressed as it was').toBeGreaterThan(0.18)

    for (const dimension of dimensionsOf(longRun.decision).map((entry) => entry.dimension)) {
      if (dimension.name !== 'bottleneck-fit' && dimension.name !== 'direction-fit') continue
      if (dimension.value !== 0) continue
      expect(dimension.weight, `${dimension.name} is still dead weight`).toBe(0)
    }

    expect(
      longRun.decision.explanation?.closeCall,
      'a two-thousandth gap read as a clear win',
    ).toBeDefined()
  })
})
