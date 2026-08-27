import { describe, expect, it } from 'vitest'
import {
  civilDateFromDayId,
  DAY_BLOCKS,
  instantAtLocal,
  localDayIdAt,
  type DayBlock,
  type Instant,
} from '../../src/domain/time'
import {
  assembleTimeline,
  describeExtent,
  TIMELINE_LEDE,
} from '../../src/features/timeline/timelineEntries'
import type { NoActionReason } from '../../src/intelligence/arbitrate'
import { decide, noActionCopy } from '../../src/intelligence/engine'
import { assembleSituation, type Situation } from '../../src/intelligence/situation'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { FOUR_RECORDS_ID, FIRST_EVENING_ID } from '../../src/synthetic/journeys'
import { SCENARIOS, scenarioById } from '../../src/synthetic/scenarios'

/**
 * F39, D-153 — no owner-visible sentence asserts a quantity of history the app
 * did not count.
 *
 * ## Why this file is not covered by the catalogue that already exists
 *
 * `no-action-copy.test.ts` renders every no-action reason at every part of the
 * day, and it was written because a sweep that asks *which words appear* can
 * only see the states the scenario library happens to reach. It found two
 * defects on its first run. It did not find this one, and the reason is
 * instructive: it renders the catalogue against **one** history — a man three
 * nights short of sleep — and on that history `nothing-proposed` always has a
 * recovery limiter, so it always takes the limiter branch. The sentence
 * underneath, the one that said **"There is plenty of history here"**, was
 * never rendered by the instrument built to render every sentence.
 *
 * So the catalogue has a second axis: **how much history there is**. Four
 * sizes, from a store of one record to a long run, and both four-record
 * histories, because four is the size an independent reader was standing on
 * when he read "plenty".
 *
 * ## And the same axis over Timeline
 *
 * The class is a sentence about a quantity of history, not a sentence inside
 * `engine.ts`. Timeline claimed to hold *everything that happened* on a page
 * holding what it had been told, and said *"that is the whole record"* while
 * counting only the part of it dated at or before the moment on screen. Both
 * are here, at every size, for the same reason.
 */

/** An hour that is unambiguously inside each block, in the owner's own zone. */
const HOUR_IN: Record<DayBlock, number> = {
  'early-morning': 5,
  morning: 9,
  afternoon: 15,
  evening: 20,
  'late-night': 23,
}

const REASONS: readonly NoActionReason[] = [
  'nothing-proposed',
  'nothing-in-reach',
  'everything-ruled-out',
  'nothing-worth-doing',
  'not-landing',
  'enough-for-now',
]

/**
 * The sizes the catalogue is rendered at.
 *
 * `records` is what `snapshotFromWire` produced, checked here rather than
 * described, so a fixture that grows fails this file instead of quietly
 * widening the sweep's blind spot.
 */
const SIZES: readonly { readonly id: string; readonly records: number }[] = [
  { id: FIRST_EVENING_ID, records: 1 },
  { id: 'mostly-unknown', records: 4 },
  { id: FOUR_RECORDS_ID, records: 4 },
  { id: 'long-run', records: 129 },
]

function situationsFor(scenarioId: string): Map<DayBlock, Situation> {
  const scenario = scenarioById(scenarioId)
  if (scenario === undefined) throw new Error(`no scenario "${scenarioId}"`)
  const loaded = snapshotFromWire(scenario.build())
  expect(loaded.loaded, `${scenarioId} should load`).toBe(true)

  const date = civilDateFromDayId(localDayIdAt(scenario.now, scenario.zone))
  const byBlock = new Map<DayBlock, Situation>()
  for (const block of DAY_BLOCKS) {
    const now = instantAtLocal(
      { ...date, hour: HOUR_IN[block], minute: 0, second: 0 },
      scenario.zone,
    )
    const moment = { now, zone: scenario.zone, weekStartsOn: 1 as const }
    byBlock.set(block, assembleSituation(buildView(loaded.snapshot, moment), moment))
  }
  return byBlock
}

/**
 * Words that assert a size of the record without measuring one.
 *
 * Deliberately not a list of every quantity word in English: `RESULT` answers
 * say "a few words", learning says "several times" over a count it took, and
 * both are sizes of things the app did count. These are the ones that can only
 * be about *how much history there is*, and every one of them is unmeasurable
 * — there is no threshold at which a life record becomes "plenty".
 */
const UNMEASURED = [
  'plenty of history',
  'plenty of it',
  'lots of history',
  'a lot of history',
  'not much history',
  'little history',
  'everything that happened',
  'all of your history',
  'your whole life',
]

function unmeasuredIn(sentence: string): readonly string[] {
  const lowered = sentence.toLowerCase()
  return UNMEASURED.filter((phrase) => lowered.includes(phrase))
}

describe('F39 — the no-action catalogue, at every history size', () => {
  it('renders every reason at every block on every size, and never asserts an unmeasured quantity', () => {
    for (const size of SIZES) {
      const scenario = scenarioById(size.id)!
      const loaded = snapshotFromWire(scenario.build())
      expect(loaded.snapshot.records.length, `${size.id} changed size`).toBe(size.records)

      const byBlock = situationsFor(size.id)
      for (const block of DAY_BLOCKS) {
        for (const reason of REASONS) {
          const copy = noActionCopy(reason, byBlock.get(block)!)
          const spoken = `${copy.headline} ${copy.detail}`
          expect(unmeasuredIn(spoken), `${size.id} / ${block} / ${reason} — "${spoken}"`).toEqual(
            [],
          )
        }
      }
    }
  })

  it('says the same thing about the record at one entry and at a hundred and twenty-nine', () => {
    /*
     * The assertion the old sentence could not pass.
     *
     * "There is history here" is checked by the branch directly above it —
     * `history.all.length === 0` has already been handled — so it reads the
     * same at every size, which is what makes it true at every size. A
     * sentence whose truth depends on a number nobody counted is the defect.
     */
    const spoken = SIZES.map((size) => {
      const situation = situationsFor(size.id).get('evening')!
      return noActionCopy('nothing-proposed', situation).detail
    })

    for (const detail of spoken) {
      expect(detail).toContain('There is history here')
      expect(detail).not.toContain('plenty')
    }
    expect(new Set(spoken).size, 'one sentence, at every size').toBe(1)
  })

  it('still says there is nothing at all when there is nothing at all', () => {
    /*
     * The guard against over-correcting. "There is no history here at all" is
     * an absolute and it stays, because on an empty store it is true and it is
     * what tells the owner the silence is about the record rather than about
     * the hour — D-153's own condition for when an absolute may stand.
     */
    const scenario = scenarioById(FIRST_EVENING_ID)!
    const empty = { ...snapshotFromWire(scenario.build()).snapshot, records: [] }
    const moment = { now: scenario.now, zone: scenario.zone, weekStartsOn: 1 as const }
    const situation = assembleSituation(buildView(empty, moment), moment)

    expect(noActionCopy('nothing-proposed', situation)).toEqual({
      headline: 'Not enough to go on yet.',
      detail: 'There is no history here at all, so anything said now would be invented.',
    })
  })
})

describe('F39 — Timeline’s own claims about the record', () => {
  it('describes itself as what is recorded rather than as what happened', () => {
    expect(TIMELINE_LEDE).toBe('Everything recorded here, in the order it happened.')
    expect(unmeasuredIn(TIMELINE_LEDE)).toEqual([])
  })

  it('does not call part of the record the whole of it when entries are dated later', () => {
    /*
     * `mostly-unknown` is the reproduction and it has been in the library since
     * Phase 1: four records, one of them dated the following day. The page
     * rendered three rows and told the owner that was the whole record.
     */
    const scenario = scenarioById('mostly-unknown')!
    const loaded = snapshotFromWire(scenario.build())
    const moment = { now: scenario.now, zone: scenario.zone, weekStartsOn: 1 as const }
    const data = assembleTimeline(assembleSituation(buildView(loaded.snapshot, moment), moment))

    expect(data.later, 'the fixture must still hold something dated later').toBeGreaterThan(0)
    expect(data.total, 'and something at or before the moment').toBeGreaterThan(0)

    const sentence = describeExtent(data)
    expect(sentence).not.toContain('the whole record')
    expect(sentence).toContain(`${data.total} ${data.total === 1 ? 'entry' : 'entries'}`)
    expect(sentence).toContain(`${data.later} `)
  })

  it('keeps the absolute where the page really is holding all of it', () => {
    const scenario = scenarioById(FOUR_RECORDS_ID)!
    const loaded = snapshotFromWire(scenario.build())
    const moment = { now: scenario.now, zone: scenario.zone, weekStartsOn: 1 as const }
    const data = assembleTimeline(assembleSituation(buildView(loaded.snapshot, moment), moment))

    expect(data.later).toBe(0)
    expect(describeExtent(data)).toBe(`That is the whole record — ${data.total} entries.`)
  })

  it('never calls part of the record the whole of it, on any history at any hour', () => {
    /*
     * The class, swept the way the block sweep sweeps blocks.
     *
     * Every history in the library, at every part of the day: whenever the page
     * is holding everything it can show, the sentence it prints agrees with
     * what `later` says. This is the assertion that would have caught the
     * instance above without anybody thinking of `mostly-unknown`.
     */
    for (const scenario of SCENARIOS) {
      const loaded = snapshotFromWire(scenario.build())
      const date = civilDateFromDayId(localDayIdAt(scenario.now, scenario.zone))
      for (const block of DAY_BLOCKS) {
        const now: Instant = instantAtLocal(
          { ...date, hour: HOUR_IN[block], minute: 0, second: 0 },
          scenario.zone,
        )
        const moment = { now, zone: scenario.zone, weekStartsOn: 1 as const }
        const situation = assembleSituation(buildView(loaded.snapshot, moment), moment)
        const data = assembleTimeline(situation)
        // The screen renders this only when there are rows on the page; with
        // none it has three other things to say (`onlyLater`, nothing yet,
        // nothing readable). Asserting a sentence that is never shown would be
        // this file making up a state to be right about.
        if (data.total === 0) continue
        const sentence = describeExtent(data)
        const where = `${scenario.id} at ${block}`

        if (data.later > 0) {
          expect(sentence, where).not.toContain('the whole record')
        } else {
          expect(sentence, where).toContain('the whole record')
        }
        expect(unmeasuredIn(sentence), where).toEqual([])
      }
    }
  })

  it('never lets a decision sentence assert an unmeasured quantity, on any history at any hour', () => {
    for (const scenario of SCENARIOS) {
      const loaded = snapshotFromWire(scenario.build())
      const date = civilDateFromDayId(localDayIdAt(scenario.now, scenario.zone))
      for (const block of DAY_BLOCKS) {
        const now: Instant = instantAtLocal(
          { ...date, hour: HOUR_IN[block], minute: 0, second: 0 },
          scenario.zone,
        )
        const moment = { now, zone: scenario.zone, weekStartsOn: 1 as const }
        const decision = decide(buildView(loaded.snapshot, moment), moment)
        const spoken = [
          decision.noAction?.headline,
          decision.noAction?.detail,
          decision.explanation?.rendered.sentence,
          decision.explanation?.rendered.reason,
        ]
          .filter((line): line is string => line !== undefined)
          .join(' ')
        expect(unmeasuredIn(spoken), `${scenario.id} at ${block} — "${spoken}"`).toEqual([])
      }
    }
  })
})
