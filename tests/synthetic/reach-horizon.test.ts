import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { addLocalDaysToDayId, localDayIdAt, type Instant } from '../../src/domain/time'
import { decide, type Decision } from '../../src/intelligence/engine'
import {
  MOVE_PROFILES,
  OUTCOME_HORIZONS,
  profileFor,
  type MoveProfile,
  type OutcomeHorizon,
} from '../../src/intelligence/moves'
import { collectEpisodes } from '../../src/intelligence/lifecycle'
import { dueOutcomes, outcomeWindowFor, windowForTiming } from '../../src/intelligence/outcomes'
import {
  deriveOutcomes,
  deriveReadingOutcomes,
  derivedOutcomeRecords,
} from '../../src/intelligence/derived'
import { coreConcepts } from '../../src/domain/concepts'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { loadScenario } from './harness'

/**
 * S1a — the outcome-judgement horizon.
 *
 * *When can the effect of this move honestly be judged?* The union was
 * `same-block | next-morning` and eight call sites read it. Widening it is a
 * small change with one real risk, and §5.1 names the risk exactly: **a wider
 * horizon must not silently invalidate conclusions drawn at the narrow one.**
 *
 * So the acceptance item is not that the wider enum works. It is that the
 * narrower one is untouched — proved by replaying the whole shipped scenario
 * library and comparing byte for byte, rather than by reading the diff.
 */

const ROOT = join(import.meta.dirname, '..', '..')

/** Everything a decision produced, flattened so two runs can be compared exactly. */
function replay(decision: Decision): string {
  return JSON.stringify({
    chosen: decision.evaluation?.candidate.id ?? null,
    kind: decision.kind,
    noAction: decision.noAction ?? null,
    heldUntil: decision.heldUntil ?? null,
    sentence: decision.explanation?.rendered.sentence ?? null,
    reason: decision.explanation?.rendered.reason ?? null,
    premise: decision.explanation?.premise ?? null,
    limiter: decision.situation.limiter ?? null,
    facts: decision.trace.facts,
    rejected: decision.trace.rejected,
    ranking: decision.trace.ranking,
    learning: decision.trace.learning,
    episodes: decision.trace.episodes,
  })
}

const HOURS = [-9, -3, 0, 4, 8] as const
const HOUR = 3_600_000

describe('a wider horizon changes nothing that was decided at the narrow one — S1a', () => {
  /**
   * What the horizon decides, across the whole shipped library.
   *
   * Every outcome window, for every episode in every history, plus every record
   * the sleep derivation writes. Those two are exactly what §5.1 says a wider
   * horizon must not disturb, and they are narrow enough that this digest does
   * not move when something unrelated to horizons changes — which is what keeps
   * it a guard rather than a chore.
   */
  function horizonPrint(): string {
    const rows: string[] = []
    for (const scenario of SCENARIOS) {
      const loaded = loadScenario(scenario.id)
      const view = loaded.viewAt(scenario.now, scenario.zone)
      for (const episode of collectEpisodes(view, scenario.zone)) {
        rows.push(
          `${scenario.id}|${episode.recommendation}|${episode.semantics.target.verb}|${JSON.stringify(
            outcomeWindowFor(episode, scenario.zone) ?? null,
          )}`,
        )
      }
      /*
       * **The sleep derivation on its own** — AUD-0042, routing 93.
       *
       * §5.1's claim is about D-064's four conditions for the *morning* reading
       * producing byte-identical output, and this digested everything
       * `derivedOutcomeRecords` returned because for one phase that was the same
       * set. Routing 93 gave the observe-first path a same-block sibling
       * (`deriveReadingOutcomes`), and a digest over both would have moved for a
       * reason that has nothing to do with a horizon — which would have made the
       * pin either a false alarm or, worse, a number somebody updated.
       *
       * So this digests what the claim is actually about. The value below is
       * therefore **unchanged**: before routing 93 every derived row was a sleep
       * row, so the filtered list is the same list, and the pin still proves the
       * thing it was written to prove. The new rows are counted in the test
       * below, so nothing is hidden by the narrowing.
       */
      for (const derived of deriveOutcomes(view, {
        now: scenario.now,
        zone: scenario.zone,
      })) {
        rows.push(`${scenario.id}|derived|${JSON.stringify(derived.record)}`)
      }
    }
    return createHash('sha256').update(rows.sort().join('\n')).digest('hex')
  }

  /**
   * The library's horizon behaviour as it stood when S1a landed.
   *
   * Pinned rather than recomputed, because the claim is about *before and
   * after* and a same-run comparison cannot make it. Taken at `eee7eb5`, the
   * commit immediately before the union was widened, over 94 rows.
   *
   * **If this fails, a horizon change moved something that was already
   * decided.** That is not automatically wrong — AUD-0009 at routing 93 is
   * expected to move it deliberately — but it is never something to update
   * without reading what moved and saying so.
   */
  const BEFORE_S1A = 'be1a41c2f959640ace8ab7747c37188bac380ea5a11d96139ff024a4c01e3cc4'

  it('replays the whole library byte for byte, against the digest from before', () => {
    expect(horizonPrint(), 'widening the horizon changed something already decided').toBe(
      BEFORE_S1A,
    )
  })

  it('is a digest over something, so a passing run means something', () => {
    // A digest of an empty sweep is a constant, and a constant passes forever.
    const rows = SCENARIOS.flatMap((scenario) =>
      collectEpisodes(loadScenario(scenario.id).viewAt(scenario.now, scenario.zone), scenario.zone),
    )
    expect(rows.length, 'the sweep found no episodes at all').toBeGreaterThan(20)
  })

  it('digests a derivation that no history in the library reaches — DEF-0167', () => {
    /*
     * **The pin above has two halves and one of them has always been empty.**
     *
     * §5.1's acceptance for S1a is that *"D-064's four conditions for the
     * morning reading produce byte-identical output before and after"*, and this
     * file digested `derivedOutcomeRecords` to prove it. Across the whole
     * shipped library, at every hour, that function returned **nothing** from
     * the sleep path: no scenario holds a completed `next-morning` sleep episode
     * with a morning reading after it, so the half of the digest that carries
     * the claim was a hash of an empty list.
     *
     * The digest is not vacuous — the windows half is real and covers every
     * episode in the library — but a guard that quietly covers less than it
     * claims is worse than no guard, because the passing result is read as
     * evidence. That is this repository's own words about
     * `stringLiterals`, arriving in a second place.
     *
     * So the emptiness is asserted rather than left to be discovered, and
     * `tests/synthetic/observed-first.test.ts` builds the history that reaches
     * the sleep path — which is where D-064's conditions are actually proved to
     * fire rather than merely to be spelled the same.
     */
    let sleep = 0
    let reading = 0
    let both = 0
    for (const scenario of SCENARIOS) {
      const moment = { now: scenario.now, zone: scenario.zone }
      const view = loadScenario(scenario.id).viewAt(moment.now, moment.zone)
      sleep += deriveOutcomes(view, moment).length
      reading += deriveReadingOutcomes(view, moment, coreConcepts).length
      both += derivedOutcomeRecords(view, moment).length
    }

    expect(sleep, 'the library now reaches the sleep derivation — re-pin the digest').toBe(0)
    expect(reading, 'the same-block derivation reaches nothing in the library').toBeGreaterThan(0)
    expect(both, 'the two paths and their sum disagree').toBe(sleep + reading)
  })

  it('leaves every shipped move at the horizon it already declared', () => {
    // What makes the replay above a replay of the same thing: nothing in the
    // catalogue moved to a wider horizon in the commit that widened the union.
    for (const [verb, profile] of Object.entries(MOVE_PROFILES)) {
      expect(
        ['same-block', 'next-morning'].includes(profile.outcome.when),
        `${verb}: a shipped move was moved to a wider horizon`,
      ).toBe(true)
    }
  })

  it('replays the whole library’s decisions without throwing on a widened union', () => {
    const prints: string[] = []
    for (const scenario of SCENARIOS) {
      const loaded = loadScenario(scenario.id)
      for (const offset of HOURS) {
        const now = (scenario.now + offset * HOUR) as Instant
        const moment = {
          now,
          zone: scenario.zone,
          weekStartsOn: scenario.weekStartsOn ?? (1 as const),
        }
        prints.push(replay(decide(loaded.viewAt(now, moment.zone), moment, { probe: false })))
      }
    }
    expect(prints.length).toBe(SCENARIOS.length * HOURS.length)
    expect(new Set(prints).size, 'every history decided the same thing').toBeGreaterThan(1)
  })

  it('leaves D-064’s four conditions exactly as they were', () => {
    /*
     * The sleep derivation is the one place a horizon decides whether the app
     * writes a record on the owner's behalf, so §5.1 names it directly: the
     * four conditions must produce byte-identical output before and after.
     *
     * They are read off the profile rather than a list of verbs, which is what
     * makes them survive a widened union: `measures === sleepHours`,
     * `outcome.when === 'next-morning'`, `aspects` includes `effect`, and the
     * effect is not already answered.
     */
    const source = readFileSync(join(ROOT, 'src', 'intelligence', 'derived.ts'), 'utf8')
    expect(source).toContain("profile.outcome.when !== 'next-morning'")
    expect(source).toContain('profile.measures !== CONCEPT.sleepHours')
    expect(source).toContain("profile.aspects.includes('effect')")

    for (const scenario of SCENARIOS) {
      const loaded = loadScenario(scenario.id)
      const moment = { now: scenario.now, zone: scenario.zone }
      const view = loaded.viewAt(moment.now, moment.zone)
      const written = derivedOutcomeRecords(view, moment)
      // Deriving twice produces the identical row, whichever day it happens on
      // — the property D-015 rests on, re-asserted because a widened horizon is
      // exactly the kind of change that could break it.
      expect(JSON.stringify(derivedOutcomeRecords(view, moment))).toBe(JSON.stringify(written))
      for (const record of written) {
        expect(record.kind).toBe('outcome')
      }
    }
  })
})

describe('the horizon is readable by every consumer that reads one', () => {
  /*
   * The inert-declaration defect this phase exists to remove, checked against
   * the vocabulary this phase adds. `multi-day` and `weekly` have no profile
   * yet — their consumer is AUD-0009, which is routing 93's — so what has to be
   * true now is that they are *readable*: a consumer that fell through on one
   * of them would be a silent gap the moment 93 lands.
   */
  function at(horizon: OutcomeHorizon, afterDays?: number): MoveProfile {
    return {
      ...profileFor('move'),
      outcome: { when: horizon, after: 20, ...(afterDays === undefined ? {} : { afterDays }) },
    }
  }

  it('gives every horizon a window that opens after the move and closes later', () => {
    const scenario = SCENARIOS[0]
    if (scenario === undefined) throw new Error('unreachable')
    const settled = scenario.now
    for (const horizon of OUTCOME_HORIZONS) {
      const profile = at(horizon, horizon === 'multi-day' ? 3 : undefined)
      const window = windowForTiming(settled, profile.outcome, scenario.zone)
      expect(window.earliest, `${horizon}: judged before it happened`).toBeGreaterThan(settled)
      expect(window.latest, `${horizon}: closes before it opens`).toBeGreaterThan(window.earliest)
    }
  })

  it('opens a multi-day window on the day it names, and a weekly one a week out', () => {
    const scenario = SCENARIOS[0]
    if (scenario === undefined) throw new Error('unreachable')
    const settled = scenario.now
    const zone = scenario.zone
    const day = localDayIdAt(settled, zone)

    const three = windowForTiming(settled, at('multi-day', 3).outcome, zone)
    const week = windowForTiming(settled, at('weekly').outcome, zone)

    expect(localDayIdAt(three.earliest, zone), 'three days is not three days').toBe(
      addLocalDaysToDayId(day, 3),
    )
    expect(localDayIdAt(week.earliest, zone), 'a week is not seven days').toBe(
      addLocalDaysToDayId(day, 7),
    )
    /*
     * And each stays open the same week a course reflection does, which is the
     * mechanism S1a generalises rather than a second one beside it. `latest` is
     * exclusive — the first instant of the following local day — so the last
     * day it covers is the one before it.
     */
    expect(localDayIdAt((three.latest - 1) as typeof three.latest, zone)).toBe(
      addLocalDaysToDayId(day, 10),
    )
    expect(localDayIdAt((week.latest - 1) as typeof week.latest, zone)).toBe(
      addLocalDaysToDayId(day, 14),
    )
  })

  it('defaults a multi-day horizon that names no count to a week', () => {
    // An honest default rather than a throw: a profile that says "judge this
    // over several days" without saying how many is under-specified, and the
    // longest horizon the bound allows is the safe reading of it.
    const scenario = SCENARIOS[0]
    if (scenario === undefined) throw new Error('unreachable')
    const zone = scenario.zone
    const unspecified = windowForTiming(scenario.now, at('multi-day').outcome, zone)
    const week = windowForTiming(scenario.now, at('weekly').outcome, zone)
    expect(unspecified.earliest).toBe(week.earliest)
  })

  it('refuses monthly and seasonal, which is the whole of the bound', () => {
    /*
     * §5.1's refusal, held as something that can fail. A move whose effect can
     * only be judged in a month cannot be settled by a lifecycle keyed to a day
     * — `openEpisode` keys on `(target, dayId)` — and at six tracked concepts
     * and one derived path a monthly outcome is a question asked into silence.
     *
     * Monthly and seasonal belong to **reading the record** (S1b, AUD-0029),
     * not to **judging a move**, and this is where that stops being a paragraph
     * in a document.
     */
    for (const horizon of OUTCOME_HORIZONS) {
      expect(horizon, 'a horizon §5.1 refuses was added to the union').not.toMatch(
        /month|season|quarter|year/i,
      )
    }
    expect(OUTCOME_HORIZONS).toEqual(['same-block', 'next-morning', 'multi-day', 'weekly'])
  })

  it('asks nothing extra of the owner for a horizon nothing uses yet', () => {
    // The other half of not being an inert declaration: adding the vocabulary
    // must not have added a question, a card or a prompt anywhere.
    for (const scenario of SCENARIOS) {
      const loaded = loadScenario(scenario.id)
      const moment = { now: scenario.now, zone: scenario.zone }
      const view = loaded.viewAt(moment.now, moment.zone)
      const situation = decide(view, moment, { probe: false }).situation
      for (const pending of dueOutcomes(view, moment, situation.entities)) {
        const horizon = profileFor(pending.episode.semantics.target.verb).outcome.when
        expect(
          ['same-block', 'next-morning'].includes(horizon),
          `${scenario.id}: something is being asked at a horizon no profile declares`,
        ).toBe(true)
      }
    }
  })
})

describe('what the horizon feeds, and what it does not', () => {
  it('sends every judgement but a same-block one to the belief about afterwards', () => {
    /*
     * `learning.ts` reads the horizon to decide which belief an outcome moves.
     * The widening is one word — it was *"next-morning means tomorrow"* and is
     * now *"only same-block means now"* — and the difference matters the moment
     * a profile declares a longer one: a judgement made in three days is
     * plainly about afterwards, and the old form would have filed it as a
     * statement about the block the move happened in.
     */
    const source = readFileSync(join(ROOT, 'src', 'intelligence', 'learning.ts'), 'utf8')
    expect(source).toContain("profile.outcome.when === 'same-block' ? 'now' : 'tomorrow'")
  })
})
