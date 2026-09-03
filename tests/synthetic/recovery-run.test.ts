import { describe, expect, it } from 'vitest'
import { CONCEPT, coreConcepts } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { explicit, inferred, unknown, confidence, type Knowledge } from '../../src/domain/knowledge'
import { derivedRecordId } from '../../src/domain/ids'
import { localDaysBetween, type Instant } from '../../src/domain/time'
import { DAYS_BEFORE_ASKING_WHAT_STUCK } from '../../src/intelligence/progress'
import {
  DEEP_SHORTFALL_HOURS,
  LONGEST_RUN,
  nightsToRepay,
  ONE_NIGHT_SHORT_HOURS,
  SHORTEST_RUN,
} from '../../src/intelligence/recovery'
import { threadOfferFor } from '../../src/intelligence/threads'
import { MOVE_PROFILES, OUTCOME_HORIZONS } from '../../src/intelligence/moves'
import { openJourney } from './journey'
import { loadScenario } from './harness'

/**
 * AUD-0009 / C8 — recovery is a run of nights, not a nightly re-guess.
 *
 * ## What the finding is
 *
 * With strain severe the app proposed one move for tonight and re-derived the
 * same sentence the next evening: *"the following evening the app has no memory
 * that last night was supposed to be a recovery night."* Nothing recorded that a
 * recovery had been begun and nothing tracked a multi-night deficit being
 * repaid.
 *
 * ## What is asserted here
 *
 * The audit's own required test — *"a three-bad-nights history swept across four
 * consecutive evenings, asserting the sentence changes each night and that a
 * decline on night one prevents night two's reference to a run"* — plus the two
 * things that make the span honest: it comes from **his** record rather than
 * from a study, and it is not offered at all where there is nothing to repay.
 */

// ---------------------------------------------------------------------------
// The span, and where it comes from
// ---------------------------------------------------------------------------

const AT = 1_800_000_000_000 as Instant
const SOURCE = derivedRecordId('recovery-test', 'reading')

function hours(value: number): Knowledge<number> {
  return inferred(value, AT, confidence(0.7), [SOURCE])
}

function scale(value: number): Knowledge<number> {
  return explicit(value, AT, SOURCE)
}

const NOTHING: Knowledge<number> = unknown('never-observed')

describe('how many quiet nights the record implies — AUD-0009', () => {
  it('says nothing at all where the shortfall cannot be read', () => {
    // G-009. A plan the owner is offered has to rest on something he told the
    // app, and a default span would be the app inventing one.
    expect(nightsToRepay(NOTHING, NOTHING)).toBeUndefined()
    expect(nightsToRepay(NOTHING, scale(0.1))).toBeUndefined()
  })

  it('says nothing for a single short night', () => {
    /*
     * The audit's own threshold: *"where the deficit exceeds roughly one night's
     * worth"*. Below it, one night is the honest answer and a two-night plan
     * would be the app making a course out of a Tuesday.
     */
    expect(nightsToRepay(hours(ONE_NIGHT_SHORT_HOURS - 0.5), NOTHING)).toBeUndefined()
    expect(nightsToRepay(hours(0), NOTHING)).toBeUndefined()
  })

  it('asks for the shorter run once the shortfall is more than one night’s', () => {
    expect(nightsToRepay(hours(ONE_NIGHT_SHORT_HOURS), NOTHING)).toBe(SHORTEST_RUN)
    expect(nightsToRepay(hours(DEEP_SHORTFALL_HOURS - 0.5), NOTHING)).toBe(SHORTEST_RUN)
  })

  it('asks for the longer one on a deep shortfall', () => {
    expect(nightsToRepay(hours(DEEP_SHORTFALL_HOURS), NOTHING)).toBe(LONGEST_RUN)
    expect(nightsToRepay(hours(30), NOTHING), 'a month of debt became a month of plan').toBe(
      LONGEST_RUN,
    )
  })

  it('lengthens a shallow shortfall when the nights were also bad — DEF-0156', () => {
    /*
     * The reader the registry has been carrying a note about since routing 92:
     * *"the hours are read by `assembleCapacity` and drive the whole recovery
     * model; how the night felt is collected, shown, trended on Insights, and
     * consulted by no generator, no dimension and no filter."*
     *
     * Eight hours of broken sleep is not eight hours of rest, and this is one of
     * the two places that is now true rather than said.
     */
    const shallow = hours(ONE_NIGHT_SHORT_HOURS + 1)
    expect(nightsToRepay(shallow, scale(0.8))).toBe(SHORTEST_RUN)
    expect(nightsToRepay(shallow, scale(0.2))).toBe(LONGEST_RUN)
  })

  it('never runs longer than the bound, whatever the arithmetic says', () => {
    // A shortfall of thirty hours does not imply a ten-night plan. It implies a
    // man in trouble, and a ten-night plan is the nagging AUD-0020 names as its
    // own biggest risk.
    for (const debt of [2, 4, 6, 9, 15, 40, 120]) {
      const nights = nightsToRepay(hours(debt), scale(0))
      expect(nights, `${debt} hours`).toBeGreaterThanOrEqual(SHORTEST_RUN)
      expect(nights, `${debt} hours`).toBeLessThanOrEqual(LONGEST_RUN)
    }
  })

  it('reads the registry’s own flag as material again — DEF-0156', () => {
    expect(coreConcepts.definitionFor(CONCEPT.sleepQuality).ask.materialToDecision).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Four evenings, which is the audit's own test
// ---------------------------------------------------------------------------

describe('four consecutive evenings on a three-bad-nights history — AUD-0009', () => {
  async function threeBadNights() {
    const app = await openJourney('running-on-empty')
    return app
  }

  it('reads a run out of the shortfall it already had', async () => {
    const app = await threeBadNights()
    const capacity = app.situation().capacity
    expect(capacity.sleepDebtHours.state, 'the fixture no longer holds a shortfall').not.toBe(
      'unknown',
    )
    expect(capacity.recoveryNights, 'nine hours down implied no run').toBe(LONGEST_RUN)
  })

  it('offers a course that names its own length before he agrees to it', async () => {
    const app = await threeBadNights()
    const decision = app.decision()
    const target = decision.explanation?.semantics.target
    expect(target, 'no recovery move on a nine-hour shortfall').toBeDefined()

    const offer = threadOfferFor(
      decision.situation.threads,
      target!,
      decision.situation.entities.labelFor(target!.object) ?? '',
      decision.situation.capacity.recoveryNights,
    )
    expect(offer?.kind).toBe('recovery-run')
    expect(offer?.steps).toBe(LONGEST_RUN)
    /*
     * The wording, because it is the whole of what the owner is agreeing to.
     * *"Make this a run of recovery nights?"* is a course of unstated length,
     * which is the one thing a plan may not be if he is meant to know what he
     * said yes to.
     */
    expect(offer?.offer).toBe('Make this three quiet nights in a row?')
    expect(offer?.intent).toBe('Three quiet nights in a row')
  })

  it('says something different on each of four evenings', async () => {
    /*
     * **The audit's own acceptance item.** Before this the app said the same
     * sentence every evening with no memory that the night before was supposed
     * to have been a recovery night.
     *
     * What is compared is the whole of what the owner reads — the sentence, the
     * reason, and the course row above them — because the course row is where
     * the run's position is rendered (`Explanation.partOf`, routing 84) and
     * saying it twice on one screen would be DEF-0022's class.
     */
    const app = await threeBadNights()
    await app.startCourse()

    const seen: string[] = []
    for (let evening = 0; evening < 4; evening += 1) {
      for (let asked = 0; asked < 3 && app.decision().kind !== 'move'; asked += 1) {
        const step = app.guide()
        if (step.kind !== 'question' || step.question === undefined) break
        await app.answerGuide()
      }
      const decision = app.decision()
      const shown = [
        decision.explanation?.rendered.sentence ?? decision.noAction?.headline ?? '',
        decision.explanation?.rendered.reason ?? '',
        decision.explanation?.partOf ?? '',
      ].join(' | ')
      seen.push(shown)
      if ((await app.act('start')).done) await app.act('complete')
      app.travelDays(1)
    }

    expect(seen.length).toBe(4)
    expect(new Set(seen).size, `the same screen four evenings running:\n${seen.join('\n')}`).toBe(4)
  })

  it('references the run from the second evening on, and never before it', async () => {
    const app = await threeBadNights()

    // Evening one: no course exists yet, so nothing may refer to one.
    expect(app.decision().explanation?.partOf, 'a run was named before it existed').toBeUndefined()
    /*
     * And the reason says what the offer beneath it rests on — the arithmetic
     * over his own record, never a prediction about what a run would do.
     */
    const first = app.decision().explanation?.rendered.reason ?? ''
    expect(first).toContain("more than one night's worth")
    /*
     * And it does not say what the run would do. The audit's own proposed
     * sentence is *"Two quiet nights would clear most of this"*, which is a
     * forecast about a body — D-038 refuses the claim and §6.5 puts forecasting
     * outside this phase. Matched on the shape of the promise rather than on the
     * word "will", because *"subnetting will still be there tomorrow"* is a
     * sentence about a topic and is fine.
     */
    expect(first, 'the app forecast what the run would do').not.toMatch(
      /would (clear|fix|sort|put)|will (clear|fix|sort)|back to normal|most of/i,
    )

    await app.startCourse()
    if ((await app.act('start')).done) await app.act('complete')
    /*
     * Two days on, not one, and that is the app rather than the test: a
     * recovery night is not put in front of him the evening after a recovery
     * night, which is the anti-repetition rule doing its job (QA-81-003).
     */
    app.travelDays(2)

    const second = app.decision()
    expect(second.explanation?.partOf, 'the second night forgot the run').toContain('quiet nights')
    expect(second.explanation?.partOf).toContain('second of three')
    /*
     * And the reason has gone quiet about the span, because the row above it is
     * saying it. Two true sentences about one thing on one screen is the class
     * DEF-0022, DEF-0033 and DEF-0039 all belong to.
     */
    expect(second.explanation?.rendered.reason ?? '').not.toContain("more than one night's worth")
  })

  it('never mentions a run on the second evening when the first was declined', async () => {
    /*
     * The audit's other half: *"a decline on night one prevents night two's
     * reference to a run."* Nothing is started, so there is nothing to be part
     * of — and the app does not decide on his behalf that a plan exists because
     * a recovery move was on screen.
     */
    const app = await threeBadNights()
    expect((await app.act('decline')).done, 'the move could not be declined').toBe(true)
    app.travelDays(1)

    const second = app.decision()
    expect(second.explanation?.partOf, 'a declined evening became a run').toBeUndefined()
    expect(app.situation().threads.length, 'a course was written without a tap').toBe(0)
  })
})

// ---------------------------------------------------------------------------
// The horizon the run judges itself over — S1a's acceptance case
// ---------------------------------------------------------------------------

describe('the run is judged over the run — AUD-0009, S1a', () => {
  it('asks nothing about the run while it is still running', async () => {
    const app = await openJourney('running-on-empty')
    await app.startCourse()
    expect(
      app.courseQuestion(),
      'asked in the middle of the week he is doing it in',
    ).toBeUndefined()
  })

  it('leaves every shipped move at the horizon it already declared', () => {
    /*
     * **The prediction this phase inherited, and what actually happened.**
     *
     * The dispatch expected `reach-horizon.test.ts`'s pinned digest to fail —
     * the reading being that AUD-0009 would move a recovery verb to `multi-day`.
     * It did not, and this is where that is said out loud rather than left to be
     * inferred from a passing test.
     *
     * Moving `recover` to `multi-day` would have stopped the nightly derivation
     * for it: `derived.ts` requires `next-morning`, so D-064's four conditions
     * would have gone on existing in the source while producing nothing for the
     * one verb the deficit generates. §6.5 asks for exactly the opposite —
     * *"D-064's four conditions for the morning reading survive intact"*.
     *
     * So `multi-day` got its consumer where the audit actually puts it: the
     * **run**, not the night. `dueCourseReflections` computes the run's window
     * with `windowForTiming` at `multi-day`, which is the same function every
     * episode's window comes from. The nightly reading is untouched, the digest
     * is untouched, and the horizon decides a real question.
     */
    for (const [verb, profile] of Object.entries(MOVE_PROFILES)) {
      expect(
        ['same-block', 'next-morning'].includes(profile.outcome.when),
        `${verb}: a shipped move was moved to a wider horizon`,
      ).toBe(true)
    }
    // And the union is still the one §5.1 bounded.
    expect(OUTCOME_HORIZONS).toEqual(['same-block', 'next-morning', 'multi-day', 'weekly'])
  })

  it('asks about the run rather than about a night, once it is behind him', async () => {
    const app = await openJourney('running-on-empty')
    await app.startCourse()
    const run = app.situation().threads[0]
    expect(run?.kind).toBe('recovery-run')

    /*
     * Six evenings for a three-night run, because the app declines to put a
     * recovery night in front of him the evening after one — which is the
     * anti-repetition rule doing its job rather than the test being generous.
     * The loop stops the moment the run is finished.
     */
    for (let evening = 0; evening < 8 && !app.situation().threads[0]?.finished; evening += 1) {
      for (let asked = 0; asked < 3 && app.decision().kind !== 'move'; asked += 1) {
        const step = app.guide()
        if (step.kind !== 'question' || step.question === undefined) break
        await app.answerGuide()
      }
      if ((await app.act('start')).done) await app.act('complete')
      app.travelDays(2)
    }
    expect(app.situation().threads[0]?.finished, 'the run never finished').toBe(true)

    /*
     * Counted from the plan's own end date rather than travelled a fixed number
     * of days. `expiresOn` is set when the run starts and never extended, so it
     * is the only thing that says when the question opens — and a fixed jump
     * would be a jump sized for however many evenings the loop above happened to
     * take.
     */
    const ended = app.situation().threads[0]
    app.travelDays(localDaysBetween(app.dayId(), ended!.expiresOn) + DAYS_BEFORE_ASKING_WHAT_STUCK)
    const question = app.courseQuestion()
    expect(question, 'a finished run is never asked about').toBeDefined()
    expect(question?.aspect).toBe('effect')
    expect(question?.prompt).toContain('how has the rest been')
    // Not the study-shaped questions, which are about a capability.
    expect(question?.prompt).not.toContain('still there')
    expect(question?.note).toContain('rather than about any one of them')

    const answered = await app.answerCourse(question!.answers[0]!, DOMAIN.sleep)
    expect(answered.done, answered.note).toBe(true)
    // And answering it once ends it. A run is not asked twice about itself.
    expect(app.courseQuestion(), 'asked again after it was answered').toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// And what a night that was short *and* bad does to the reading
// ---------------------------------------------------------------------------

describe('how the night went reaches a decision — DEF-0156', () => {
  it('raises the strain assessment on a full night he rated badly', async () => {
    /*
     * The reader, on a real history rather than on the function alone. The
     * fixture is rested; one answer about how the night actually went is enough
     * to move what the app believes is in the way — which is what
     * `materialToDecision: true` claims and what `reach-material.test.ts`
     * measures across the whole library.
     */
    const app = await openJourney('rested-and-behind')
    const before = app.situation().capacity.strain
    expect(before.state === 'unknown' ? undefined : before.value).toBe('none')

    expect(
      (await app.correctFact(CONCEPT.sleepQuality, { type: 'scale', value: 1, of: 5 })).done,
    ).toBe(true)

    const after = app.situation().capacity.strain
    expect(after.state === 'unknown' ? undefined : after.value, 'a bad night changed nothing').toBe(
      'moderate',
    )
  })

  it('never makes a single bad night severe on its own', async () => {
    // The ceiling energy and work strain already sit under, and the third
    // reading arrives under it rather than as an exception to it: one tap on a
    // scale is not enough to claim that much about anybody.
    const app = await openJourney('rested-and-behind')
    await app.correctFact(CONCEPT.sleepQuality, { type: 'scale', value: 0, of: 5 })
    const strain = app.situation().capacity.strain
    expect(strain.state === 'unknown' ? undefined : strain.value).not.toBe('severe')
  })

  it('is read on the shipped library rather than only on a corrected fixture', () => {
    // Somewhere in the library actually holds a reading of it, or the reader is
    // a claim about a concept nothing supplies.
    const holding = loadScenario('across-timezones').view().facts.get(CONCEPT.sleepQuality)
    expect(holding, 'nothing in the library says how a night went').toBeDefined()
  })
})
