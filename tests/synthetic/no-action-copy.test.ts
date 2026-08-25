import { describe, expect, it } from 'vitest'
import { blockNoun, hereNowWord } from '../../src/domain/horizon'
import {
  civilDateFromDayId,
  DAY_BLOCKS,
  instantAtLocal,
  localDayIdAt,
  type DayBlock,
} from '../../src/domain/time'
import type { NoActionReason } from '../../src/intelligence/arbitrate'
import type { Rejection } from '../../src/intelligence/constraints'
import { decide, noActionCopy } from '../../src/intelligence/engine'
import type { Situation } from '../../src/intelligence/situation'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { SCENARIOS } from '../../src/synthetic/scenarios'

/**
 * Every sentence the app can say when it has nothing to say — QA-81-007.
 *
 * Independent QA found this at half past eleven at night, on a screen that
 * read: _"Nothing on the list is worth night it would cost."_ Broken English, in
 * the phase whose entire subject is what the app says and whether it is true,
 * with 1,321 unit tests and 495 browser cases green over the top of it.
 *
 * **Why they were all green.** Every existing sweep over this copy asks which
 * words appear — is "tonight" absent before the evening, does a forbidden term
 * show up — and a sweep like that can only see the states the scenario library
 * happens to reach. The no-action branches are reached in ones and twos, at
 * whichever hour a fixture is set to. Nothing rendered the catalogue.
 *
 * So this file renders it: every reason, at every block, as a finished
 * sentence, held against the exact words. It is a deliberately blunt
 * instrument. A table of expected strings is annoying to update and impossible
 * to satisfy without reading what it is asserting, which is the point — this is
 * copy the owner reads on the screens that have least on them, and someone has
 * to have read it too.
 *
 * Rendering it once immediately turned up two more of the same class beyond the
 * one QA reported. Both are fixed and both are in the table below.
 */

/** An hour that is unambiguously inside each block, in the owner's own zone. */
const HOUR_IN: Record<DayBlock, number> = {
  'early-morning': 5,
  morning: 9,
  afternoon: 15,
  evening: 20,
  'late-night': 23,
}

/** A real situation at each block, from a real history decided at that hour. */
function situationsByBlock(): Map<DayBlock, Situation> {
  const scenario = SCENARIOS.find((entry) => entry.id === 'morning-after-bad-nights')
  expect(scenario, 'the history this renders against is gone').toBeDefined()

  const loaded = snapshotFromWire(scenario!.build())
  const date = civilDateFromDayId(localDayIdAt(scenario!.now, scenario!.zone))
  const byBlock = new Map<DayBlock, Situation>()

  for (const block of DAY_BLOCKS) {
    const now = instantAtLocal(
      { ...date, hour: HOUR_IN[block], minute: 0, second: 0 },
      scenario!.zone,
    )
    const moment = { now, zone: scenario!.zone, weekStartsOn: 1 as const }
    const situation = decide(buildView(loaded.snapshot, moment), moment).situation
    expect(situation.block, `${block} is not reached at ${HOUR_IN[block]}:00`).toBe(block)
    byBlock.set(block, situation)
  }
  return byBlock
}

/** The four shapes of rejection list the `everything-ruled-out` copy reads. */
const REJECTIONS: Record<string, readonly Rejection[]> = {
  none: [],
  'all-read': [{ candidate: 'a', reason: 'just-covered', explanation: '', evidence: [] }],
  /*
   * Something withheld for having been seen, on an hour that also ruled things
   * out — Phase 82.
   *
   * The `all-read` branch above required *every* rejection to be repetition,
   * and that `every` was the fragile part: one more move refusing the late
   * night was enough to send this state to "none of them suit where you
   * actually are", which is the falsehood QA-81-006 repaired. This shape is
   * that state, so the sentence has a reader.
   */
  mixed: [
    { candidate: 'a', reason: 'just-covered', explanation: '', evidence: [] },
    { candidate: 'b', reason: 'wrong-time-of-day', explanation: '', evidence: [] },
  ],
  displaced: [
    { candidate: 'a', reason: 'wrong-time-of-day', explanation: '', evidence: [] },
    { candidate: 'b', reason: 'not-instead-of-that', explanation: '', evidence: [] },
  ],
}

/** What the mixed shape says, per block. Bare nouns, and never the evening. */
const MIXED: Record<string, { readonly headline: string; readonly detail: string }> = {
  'early-morning': {
    headline: 'Nothing new today.',
    detail:
      'What would have helped has already been in front of you today, and the rest is wrong for the early morning.',
  },
  morning: {
    headline: 'Nothing new today.',
    detail:
      'What would have helped has already been in front of you today, and the rest is wrong for the morning.',
  },
  afternoon: {
    headline: 'Nothing new today.',
    detail:
      'What would have helped has already been in front of you today, and the rest is wrong for the afternoon.',
  },
  evening: {
    headline: 'Nothing new tonight.',
    detail:
      'What would have helped has already been in front of you today, and the rest is wrong for the evening.',
  },
  'late-night': {
    headline: 'Nothing new tonight.',
    detail:
      'What would have helped has already been in front of you today, and the rest is wrong for the night.',
  },
}

interface Row {
  readonly block: DayBlock
  readonly reason: NoActionReason
  readonly rejections: keyof typeof REJECTIONS
  readonly headline: string
  readonly detail: string
}

const NOTHING_IN_REACH = (word: string) =>
  `The picture is current. None of the areas this app can act in has anything in it right now, which is about its reach rather than about ${word}.`
const NOT_LANDING =
  'Twice now, so the next thing worth doing is not another suggestion. Nothing further until this part of the day is over.'
const ENOUGH =
  'Three passes in a row is an answer. Nothing more will be put in front of you until this part of the day is over.'
const RULED_OUT = 'There were things worth doing and none of them suit where you actually are.'
const ALL_READ =
  'Everything this history has to suggest has already been in front of you today, and tomorrow starts again.'
const DISPLACED =
  'What is short has one answer here, and it has already been in front of you today. Everything else here works against it.'

/**
 * Every branch, at every block, as the owner would read it.
 *
 * Written out rather than generated. A generated expectation is the
 * implementation restated, and this file exists because the implementation was
 * wrong in a way only a reader could see.
 */
const EXPECTED: readonly Row[] = [
  // --- early morning -------------------------------------------------------
  {
    block: 'early-morning',
    reason: 'nothing-proposed',
    rejections: 'none',
    headline: 'Nothing worth starting right now.',
    detail: 'Nothing here would help much until you can actually rest.',
  },
  {
    block: 'early-morning',
    reason: 'nothing-in-reach',
    rejections: 'none',
    headline: 'Nothing here to push you toward.',
    detail: NOTHING_IN_REACH('this morning'),
  },
  {
    block: 'early-morning',
    reason: 'everything-ruled-out',
    rejections: 'none',
    headline: 'Nothing fits today.',
    detail: RULED_OUT,
  },
  {
    block: 'early-morning',
    reason: 'everything-ruled-out',
    rejections: 'all-read',
    headline: 'Nothing new for today.',
    detail: ALL_READ,
  },
  {
    block: 'early-morning',
    reason: 'everything-ruled-out',
    rejections: 'mixed',
    headline: MIXED['early-morning']!.headline,
    detail: MIXED['early-morning']!.detail,
  },
  {
    block: 'early-morning',
    reason: 'everything-ruled-out',
    rejections: 'displaced',
    headline: 'Nothing to add today.',
    detail: DISPLACED,
  },
  {
    block: 'early-morning',
    reason: 'nothing-worth-doing',
    rejections: 'none',
    headline: 'Nothing needs to move today.',
    detail: 'Nothing on the list is worth the early morning it would cost. That is a real answer.',
  },
  {
    block: 'early-morning',
    reason: 'not-landing',
    rejections: 'none',
    headline: 'This is not landing.',
    detail: NOT_LANDING,
  },
  {
    block: 'early-morning',
    reason: 'enough-for-now',
    rejections: 'none',
    headline: 'Nothing then.',
    detail: ENOUGH,
  },

  // --- morning -------------------------------------------------------------
  {
    block: 'morning',
    reason: 'nothing-proposed',
    rejections: 'none',
    headline: 'Nothing worth starting right now.',
    detail: 'Nothing here would help much until you can actually rest.',
  },
  {
    block: 'morning',
    reason: 'nothing-in-reach',
    rejections: 'none',
    headline: 'Nothing here to push you toward.',
    detail: NOTHING_IN_REACH('this morning'),
  },
  {
    block: 'morning',
    reason: 'everything-ruled-out',
    rejections: 'none',
    headline: 'Nothing fits today.',
    detail: RULED_OUT,
  },
  {
    block: 'morning',
    reason: 'everything-ruled-out',
    rejections: 'all-read',
    headline: 'Nothing new for today.',
    detail: ALL_READ,
  },
  {
    block: 'morning',
    reason: 'everything-ruled-out',
    rejections: 'mixed',
    headline: MIXED['morning']!.headline,
    detail: MIXED['morning']!.detail,
  },
  {
    block: 'morning',
    reason: 'everything-ruled-out',
    rejections: 'displaced',
    headline: 'Nothing to add today.',
    detail: DISPLACED,
  },
  {
    block: 'morning',
    reason: 'nothing-worth-doing',
    rejections: 'none',
    headline: 'Nothing needs to move today.',
    detail: 'Nothing on the list is worth the morning it would cost. That is a real answer.',
  },
  {
    block: 'morning',
    reason: 'not-landing',
    rejections: 'none',
    headline: 'This is not landing.',
    detail: NOT_LANDING,
  },
  {
    block: 'morning',
    reason: 'enough-for-now',
    rejections: 'none',
    headline: 'Nothing then.',
    detail: ENOUGH,
  },

  // --- afternoon -----------------------------------------------------------
  {
    block: 'afternoon',
    reason: 'nothing-proposed',
    rejections: 'none',
    headline: 'Nothing worth starting right now.',
    detail: 'Nothing here would help much until you can actually rest.',
  },
  {
    block: 'afternoon',
    reason: 'nothing-in-reach',
    rejections: 'none',
    headline: 'Nothing here to push you toward.',
    detail: NOTHING_IN_REACH('this afternoon'),
  },
  {
    block: 'afternoon',
    reason: 'everything-ruled-out',
    rejections: 'none',
    headline: 'Nothing fits today.',
    detail: RULED_OUT,
  },
  {
    block: 'afternoon',
    reason: 'everything-ruled-out',
    rejections: 'all-read',
    headline: 'Nothing new for today.',
    detail: ALL_READ,
  },
  {
    block: 'afternoon',
    reason: 'everything-ruled-out',
    rejections: 'mixed',
    headline: MIXED['afternoon']!.headline,
    detail: MIXED['afternoon']!.detail,
  },
  {
    block: 'afternoon',
    reason: 'everything-ruled-out',
    rejections: 'displaced',
    headline: 'Nothing to add today.',
    detail: DISPLACED,
  },
  {
    block: 'afternoon',
    reason: 'nothing-worth-doing',
    rejections: 'none',
    headline: 'Nothing needs to move today.',
    detail: 'Nothing on the list is worth the afternoon it would cost. That is a real answer.',
  },
  {
    block: 'afternoon',
    reason: 'not-landing',
    rejections: 'none',
    headline: 'This is not landing.',
    detail: NOT_LANDING,
  },
  {
    block: 'afternoon',
    reason: 'enough-for-now',
    rejections: 'none',
    headline: 'Nothing then.',
    detail: ENOUGH,
  },

  // --- evening -------------------------------------------------------------
  {
    block: 'evening',
    reason: 'nothing-proposed',
    rejections: 'none',
    headline: 'Nothing worth starting right now.',
    detail: 'Nothing here would help much before the morning.',
  },
  {
    block: 'evening',
    reason: 'nothing-in-reach',
    rejections: 'none',
    headline: 'Nothing here to push you toward.',
    detail: NOTHING_IN_REACH('this evening'),
  },
  {
    block: 'evening',
    reason: 'everything-ruled-out',
    rejections: 'none',
    headline: 'Nothing fits tonight.',
    detail: RULED_OUT,
  },
  {
    block: 'evening',
    reason: 'everything-ruled-out',
    rejections: 'all-read',
    headline: 'Nothing new for today.',
    detail: ALL_READ,
  },
  {
    block: 'evening',
    reason: 'everything-ruled-out',
    rejections: 'mixed',
    headline: MIXED['evening']!.headline,
    detail: MIXED['evening']!.detail,
  },
  {
    block: 'evening',
    reason: 'everything-ruled-out',
    rejections: 'displaced',
    headline: 'Nothing to add tonight.',
    detail: DISPLACED,
  },
  {
    block: 'evening',
    reason: 'nothing-worth-doing',
    rejections: 'none',
    headline: 'Nothing needs to move tonight.',
    detail: 'Nothing on the list is worth the evening it would cost. That is a real answer.',
  },
  {
    block: 'evening',
    reason: 'not-landing',
    rejections: 'none',
    headline: 'This is not landing.',
    detail: NOT_LANDING,
  },
  {
    block: 'evening',
    reason: 'enough-for-now',
    rejections: 'none',
    headline: 'Nothing then.',
    detail: ENOUGH,
  },

  // --- late night ----------------------------------------------------------
  {
    block: 'late-night',
    reason: 'nothing-proposed',
    rejections: 'none',
    headline: 'Nothing worth starting right now.',
    detail: 'Nothing here would help much before the morning.',
  },
  {
    block: 'late-night',
    reason: 'nothing-in-reach',
    rejections: 'none',
    headline: 'Nothing here to push you toward.',
    detail: NOTHING_IN_REACH('tonight'),
  },
  {
    block: 'late-night',
    reason: 'everything-ruled-out',
    rejections: 'none',
    headline: 'Nothing fits tonight.',
    detail: RULED_OUT,
  },
  {
    block: 'late-night',
    reason: 'everything-ruled-out',
    rejections: 'all-read',
    headline: 'Nothing new for today.',
    detail: ALL_READ,
  },
  {
    block: 'late-night',
    reason: 'everything-ruled-out',
    rejections: 'mixed',
    headline: MIXED['late-night']!.headline,
    detail: MIXED['late-night']!.detail,
  },
  {
    block: 'late-night',
    reason: 'everything-ruled-out',
    rejections: 'displaced',
    headline: 'Nothing to add tonight.',
    detail: DISPLACED,
  },
  {
    block: 'late-night',
    reason: 'nothing-worth-doing',
    rejections: 'none',
    // The reported sentence. It read "worth tonight it would cost" — QA-81-007.
    headline: 'Nothing needs to move tonight.',
    detail: 'Nothing on the list is worth the night it would cost. That is a real answer.',
  },
  {
    block: 'late-night',
    reason: 'not-landing',
    rejections: 'none',
    headline: 'This is not landing.',
    detail: NOT_LANDING,
  },
  {
    block: 'late-night',
    reason: 'enough-for-now',
    rejections: 'none',
    headline: 'Nothing then.',
    detail: ENOUGH,
  },
]

describe('QA-81-007 — every no-action sentence, at every part of the day', () => {
  it('says what the table says, word for word', () => {
    const byBlock = situationsByBlock()

    for (const row of EXPECTED) {
      const situation = byBlock.get(row.block)
      const copy = noActionCopy(row.reason, situation!, REJECTIONS[row.rejections])
      const where = `${row.block} / ${row.reason} / ${row.rejections}`
      expect(copy.headline, where).toBe(row.headline)
      expect(copy.detail, where).toBe(row.detail)
    }
  })

  it('covers every reason and every block, so the table cannot quietly shrink', () => {
    // The two halves of "every". A table missing a row is a branch nobody read.
    const reasons: readonly NoActionReason[] = [
      'nothing-proposed',
      'nothing-in-reach',
      'everything-ruled-out',
      'nothing-worth-doing',
      'not-landing',
      'enough-for-now',
    ]

    for (const block of DAY_BLOCKS) {
      for (const reason of reasons) {
        const rows = EXPECTED.filter((row) => row.block === block && row.reason === reason)
        expect(rows.length, `${block} / ${reason} is not in the table`).toBeGreaterThan(0)
      }
    }
    for (const shape of Object.keys(REJECTIONS)) {
      const rows = EXPECTED.filter((row) => row.rejections === shape)
      expect(rows.length, `no row renders the ${shape} rejection list`).toBeGreaterThan(0)
    }
  })

  it('never calls an hour the evening when it is not — gate item 1', () => {
    /*
     * The other defect this file found on its first run.
     *
     * `nothing-in-reach` was written to stop the app calling the evening quiet,
     * and ended its own sentence with "rather than about your evening" — at
     * every block, including nine in the morning. Gate item 1 of this very
     * phase forbids exactly that, `block-sweep.test.ts` sweeps for exactly
     * that, and it passed, because the state is not reached before the evening
     * on any history in the library.
     */
    const byBlock = situationsByBlock()

    for (const row of EXPECTED) {
      if (row.block === 'evening' || row.block === 'late-night') continue
      const situation = byBlock.get(row.block)
      const copy = noActionCopy(row.reason, situation!, REJECTIONS[row.rejections])
      const spoken = `${copy.headline} ${copy.detail}`
      expect(spoken, `${row.block} / ${row.reason}`).not.toMatch(
        /tonight|this evening|your evening/i,
      )
    }
  })
})

describe('QA-81-007 — the horizon fragments keep the shape their callers assume', () => {
  it('gives a bare noun phrase for every block', () => {
    /*
     * The root, rather than the sentence. `blockNoun` is documented as "a plain
     * noun phrase, for a sentence that needs one", and every caller drops it
     * into a frame that takes a bare noun: "worth ⟨this⟩ it would cost", "most
     * of ⟨this⟩", "before ⟨this⟩ gets away", "⟨This⟩ is limited".
     *
     * Two arms broke that contract. `late-night` returned "tonight", an adverb.
     * The fallback returned "the time you have", which is a noun phrase already
     * carrying a relative clause, so the same frame produced "worth the time you
     * have it would cost". Neither was reachable by a test that asks which words
     * appear.
     *
     * A determiner and at most two words. Anything longer is a phrase with
     * structure in it, and structure is what breaks the frames.
     */
    for (const block of [...DAY_BLOCKS, undefined]) {
      const noun = blockNoun(block)
      expect(noun, `${block} is not a bare noun phrase`).toMatch(/^the [a-z]+( [a-z]+)?$/)
      // And it survives the frames, which is the property the shape is for.
      expect(`Nothing on the list is worth ${noun} it would cost.`).toMatch(/worth the [a-z ]+ it/)
      expect(`${noun.charAt(0).toUpperCase()}${noun.slice(1)} is limited.`).toMatch(
        /^The [a-z ]+ is/,
      )
    }
  })

  it('keeps the adverb where an adverb belongs', () => {
    // The counterpart. `hereNowWord` is the one that may say "tonight", and it
    // is where a caller should go when the frame wants an adverb rather than a
    // noun — which is what the `nothing-in-reach` repair reaches for.
    expect(hereNowWord('late-night')).toBe('tonight')
    expect(hereNowWord('morning')).toBe('this morning')
    for (const block of [...DAY_BLOCKS, undefined]) {
      expect(hereNowWord(block), `${block}`).not.toMatch(/^the /)
    }
  })
})
