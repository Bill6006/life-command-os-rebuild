import { describe, expect, it } from 'vitest'
import {
  civilDateFromDayId,
  DAY_BLOCKS,
  instantAtLocal,
  localDayIdAt,
  type DayBlock,
} from '../../src/domain/time'
import { decide, type Decision } from '../../src/intelligence/engine'
import { evidenceForDecision } from '../../src/intelligence/insights'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { SCENARIOS, scenarioById } from '../../src/synthetic/scenarios'
import { THREE_DAYS_SINCE_ID } from '../../src/synthetic/journeys'

/**
 * QA-83-001 — a quantity in a sentence agrees with the count behind it.
 *
 * ## Why this file exists and `history-size-copy.test.ts` was not enough
 *
 * Routing 83's own round-1 QA found _"The last few times made little
 * difference"_ on a history whose evidence panel, one tap lower, said _"One
 * occasion in the record"_ and _"1 occasion."_ A plural over a count of one, in
 * the phase whose second acceptance item is that no owner-visible sentence
 * asserts a quantity the app did not count.
 *
 * The guard written for that item **could not have caught it**, and the reason
 * is the lesson. It holds a list of unmeasurable phrases — "plenty of history",
 * "everything that happened" — and checks that none of them appears. A list of
 * known-bad phrases only ever finds the phrases somebody already thought of.
 * *"The last few times"* is not unmeasurable at all: it is perfectly
 * measurable, it was simply never measured.
 *
 * So this file does the other thing. It reads the number the sentence's own
 * source used, reads the quantity the sentence states, and **compares them**.
 * A phrase nobody has thought of yet fails here the moment it disagrees with
 * its count; a phrase that agrees passes without anybody adding it to a list.
 *
 * ## What counts as "the count behind it"
 *
 * Two different numbers, and keeping them apart is the point. The reason clause
 * and the learned statement are built from `effectFor(verb, context).samples` —
 * the comparable episodes with an answered result. The evidence panel's own
 * lines are built from the comparable-episode count. A sweep that held both to
 * one number would be inventing an agreement the app never claimed.
 */

/** An hour that is unambiguously inside each block, in the owner's own zone. */
const HOUR_IN: Record<DayBlock, number> = {
  'early-morning': 5,
  morning: 9,
  afternoon: 15,
  evening: 20,
  'late-night': 23,
}

/**
 * Quantity expressions, and the counts each one is true of.
 *
 * Deliberately a table of **predicates over a number**, not a table of
 * forbidden strings. Adding a phrase here says what it means; it does not say
 * whether it is allowed.
 */
const QUANTITIES: readonly {
  readonly says: RegExp
  readonly meaning: string
  readonly trueOf: (count: number) => boolean
}[] = [
  { says: /\bthe one time before\b/i, meaning: 'exactly one', trueOf: (n) => n === 1 },
  { says: /\bthe one time\b/i, meaning: 'exactly one', trueOf: (n) => n === 1 },
  { says: /\bonce\b/i, meaning: 'exactly one', trueOf: (n) => n === 1 },
  { says: /\btwice\b/i, meaning: 'exactly two', trueOf: (n) => n === 2 },
  {
    says: /\bthe last few times\b/i,
    meaning: 'more than one, fewer than four',
    trueOf: (n) => n >= 2 && n < 4,
  },
  {
    says: /\ba few times\b/i,
    meaning: 'more than one, fewer than four',
    trueOf: (n) => n >= 2 && n < 4,
  },
  { says: /\bthe last several times\b/i, meaning: 'four or more', trueOf: (n) => n >= 4 },
  { says: /\bseveral times\b/i, meaning: 'four or more', trueOf: (n) => n >= 4 },
]

/** Every quantity expression a sentence states, with what it would have to be true of. */
function quantitiesIn(sentence: string): readonly (typeof QUANTITIES)[number][] {
  const found: (typeof QUANTITIES)[number][] = []
  for (const quantity of QUANTITIES) {
    if (!quantity.says.test(sentence)) continue
    // "the last few times" also matches "a few times"; the longer, more
    // specific reading is the one the sentence actually makes.
    if (found.some((held) => held.meaning === quantity.meaning)) continue
    found.push(quantity)
  }
  return found
}

/**
 * A count written as a numeral, and whether its noun agrees with it.
 *
 * The other half of the same rule and the cheaper half: "1 occasions" is a
 * disagreement a reader sees instantly. `scripts/android-gate.mjs` sweeps the
 * deployed screens for it; this sweeps the sentences before they reach one.
 */
const NUMBERED = /\b(\d+)\s+(occasions?|times?|entries|entry|nights?|days?)\b/gi

function numberDisagreements(sentence: string): readonly string[] {
  const out: string[] = []
  for (const match of sentence.matchAll(NUMBERED)) {
    const count = Number(match[1])
    const noun = (match[2] ?? '').toLowerCase()
    const plural = noun.endsWith('s') && noun !== 'entries' ? true : noun === 'entries'
    if (count === 1 && plural) out.push(match[0])
    if (count !== 1 && !plural) out.push(match[0])
  }
  return out
}

interface Spoken {
  readonly where: string
  readonly sentence: string
  /** The number this sentence's own source counted. */
  readonly count: number
  /** Everything the owner has written down, so a quotation can be recognised. */
  readonly recorded: string
}

/**
 * Whether the app is repeating a quantity it was told rather than stating one.
 *
 * The weak-topic reason reads _"the /26 boundaries went wrong twice"_, and the
 * "twice" is the owner's, recorded verbatim in an outcome. Holding that against
 * the effect belief's sample count would be this sweep comparing two unrelated
 * numbers and calling the app wrong.
 *
 * **This is a check rather than an exemption, and the difference matters.** The
 * phrase has to appear, word for word, in a record the history actually holds.
 * The app cannot escape the count rule by choosing careful words; it can only
 * escape it by quoting, which is the one case where the quantity is not its
 * claim to make.
 */
function quotedFromTheRecord(phrase: string, recorded: string): boolean {
  return recorded.toLowerCase().includes(phrase.toLowerCase())
}

/** The owner's own words, as one searchable body of text. */
function everythingRecorded(decision: Decision): string {
  return decision.situation.view.history.effective.map((record) => JSON.stringify(record)).join(' ')
}

/**
 * Every owner-visible sentence a decision produces that could state a quantity,
 * paired with the number its own source used.
 */
function spokenBy(decision: Decision, at: string): readonly Spoken[] {
  const out: Spoken[] = []
  const recorded = everythingRecorded(decision)
  const explanation = decision.explanation
  const target = decision.evaluation?.candidate.semantics.target

  if (explanation !== undefined && target !== undefined) {
    // The reason clause and the learned statement are both built from the
    // effect belief's own sample count.
    const samples = decision.situation.learning.effectFor(
      target.verb,
      decision.situation.context,
    ).samples
    out.push({
      where: `${at} · reason`,
      sentence: explanation.rendered.reason,
      count: samples,
      recorded,
    })
    if (explanation.restsOn !== undefined) {
      out.push({
        where: `${at} · rests on`,
        sentence: explanation.restsOn,
        count: samples,
        recorded,
      })
    }
  }

  const evidence = evidenceForDecision(decision)
  if (evidence !== undefined) {
    // The panel's own lines are counted over comparable episodes, which is a
    // different number and is allowed to be.
    const comparable = evidence.confidence.comparable
    out.push({
      where: `${at} · comparable`,
      sentence: evidence.comparable,
      count: comparable,
      recorded,
    })
    out.push({
      where: `${at} · confidence`,
      sentence: `${evidence.confidence.word} ${evidence.confidence.because}`,
      count: comparable,
      recorded,
    })
    if (evidence.concluded !== undefined) {
      out.push({
        where: `${at} · concluded`,
        sentence: evidence.concluded,
        count: comparable,
        recorded,
      })
    }
    if (evidence.observed !== undefined) {
      out.push({
        where: `${at} · observed`,
        sentence: evidence.observed,
        count: comparable,
        recorded,
      })
    }
  }

  if (decision.noAction !== undefined) {
    // Nothing here counts occasions, so any quantity expression at all would
    // be an assertion from nowhere. Held to zero, which no phrase is true of.
    out.push({
      where: `${at} · no-action`,
      sentence: `${decision.noAction.headline} ${decision.noAction.detail}`,
      count: 0,
      recorded,
    })
  }

  return out
}

function everySpokenSentence(): readonly Spoken[] {
  const out: Spoken[] = []
  for (const scenario of SCENARIOS) {
    const loaded = snapshotFromWire(scenario.build())
    expect(loaded.loaded, `${scenario.id} should load`).toBe(true)
    const date = civilDateFromDayId(localDayIdAt(scenario.now, scenario.zone))

    for (const block of DAY_BLOCKS) {
      const now = instantAtLocal(
        { ...date, hour: HOUR_IN[block], minute: 0, second: 0 },
        scenario.zone,
      )
      const moment = { now, zone: scenario.zone, weekStartsOn: 1 as const }
      const decision = decide(buildView(loaded.snapshot, moment), moment)
      out.push(...spokenBy(decision, `${scenario.id} at ${block}`))
    }
  }
  return out
}

describe('QA-83-001 — a stated quantity agrees with the count behind it', () => {
  it('reproduces on the fixture it was reported on, and no longer disagrees', () => {
    const scenario = scenarioById(THREE_DAYS_SINCE_ID)!
    const loaded = snapshotFromWire(scenario.build())
    const moment = { now: scenario.now, zone: scenario.zone, weekStartsOn: 1 as const }
    const decision = decide(buildView(loaded.snapshot, moment), moment)

    const evidence = evidenceForDecision(decision)
    expect(evidence?.confidence.comparable, 'one comparable occasion, as QA read it').toBe(1)

    const reason = decision.explanation?.rendered.reason ?? ''
    expect(reason, 'the plural over one occasion is gone').not.toMatch(/the last few times/i)
    expect(reason).toMatch(/the one time before/i)
  })

  it('holds every sentence, on every history, at every hour, against its own count', () => {
    const offenders: string[] = []
    for (const spoken of everySpokenSentence()) {
      for (const quantity of quantitiesIn(spoken.sentence)) {
        if (quantity.trueOf(spoken.count)) continue
        const said = spoken.sentence.match(quantity.says)?.[0] ?? ''
        if (quotedFromTheRecord(said, spoken.recorded)) continue
        offenders.push(
          `${spoken.where}: says ${quantity.meaning} over ${spoken.count} — "${spoken.sentence}"`,
        )
      }
    }
    expect(offenders).toEqual([])
  })

  it('never writes a numeral against a noun that disagrees with it', () => {
    const offenders: string[] = []
    for (const spoken of everySpokenSentence()) {
      for (const disagreement of numberDisagreements(spoken.sentence)) {
        offenders.push(`${spoken.where}: "${disagreement}" in "${spoken.sentence}"`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('actually reaches sentences that state a quantity, so the sweep is not vacuous', () => {
    /*
     * The failure mode of a sweep like this is passing because it found nothing
     * to check. `no-action-copy.test.ts` passed for two phases over a branch it
     * never rendered; this says out loud how many quantity expressions the
     * library actually reaches.
     */
    const stated = everySpokenSentence().filter(
      (spoken) => quantitiesIn(spoken.sentence).length > 0,
    )
    expect(stated.length, 'the library must reach sentences that state a quantity').toBeGreaterThan(
      3,
    )

    // And it reaches both ends of the table, not only the singular one the
    // reported defect happened to be about.
    const meanings = new Set(
      stated.flatMap((spoken) => quantitiesIn(spoken.sentence).map((q) => q.meaning)),
    )
    expect(meanings.size, `only reached: ${[...meanings].join(', ')}`).toBeGreaterThan(1)
  })
})
