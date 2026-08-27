import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONCEPT, coreConcepts } from '../../src/domain/concepts'
import type { RecordKind } from '../../src/domain/records'
import { QUESTIONS } from '../../src/intelligence/questions'
import { threadOfferFor } from '../../src/intelligence/threads'
import {
  JOURNEY_STEPS,
  OWNER_ROUTES,
  openJourney,
  reachableRecordKinds,
  recordKindsWithNoOwnerRoute,
  type JourneyApp,
  type JourneyStop,
} from './journey'

/**
 * The ordinary-use journey, from a near-empty store — routing 83, package 83.0.
 *
 * D-161: _a capability is accepted when an ordinary owner, starting from a
 * near-empty store, can reach it through normal use — and the points where an
 * ordinary journey **cannot** proceed are enumerated with reasons rather than
 * left to be discovered._
 *
 * So this file has two outputs and they are equally the deliverable.
 *
 * 1. **The journey runs.** Eight steps, from one answer on a first evening to a
 *    recommendation that changed because of something the owner said. Every
 *    gesture goes through the control the surface actually draws.
 * 2. **The stops are enumerated.** Where the journey cannot go on, the step
 *    says so and says why, and the table below is the same list routing 84 is
 *    scoped from. It is written out by hand and compared against a real run, in
 *    the discipline `no-action-copy.test.ts` established: a generated
 *    expectation is the implementation restated, and the whole reason this file
 *    exists is that the implementation was already passing every test written
 *    from inside it.
 *
 * **What this deliberately does not do is repair anything it finds.** Every
 * stop below is a routing 84 or routing 90 package in `PRODUCT_ADJUDICATION.md`
 * section 8, and fixing one here would make routing 83 the mega-phase the
 * adjudication refused.
 */

const ROOT = join(import.meta.dirname, '..', '..')

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

/**
 * The journey, walked once, recording what happened at each step.
 *
 * Nothing is asserted in here. It uses the app and writes down what it found,
 * and the assertions are below — which is what keeps the record of the journey
 * separable from the opinion about it.
 */
async function walkTheJourney(): Promise<{
  readonly stops: readonly JourneyStop[]
  readonly app: JourneyApp
}> {
  const app = await openJourney('the-first-evening')
  const stops: JourneyStop[] = []

  // --- 1. unknown aspiration ------------------------------------------------
  //
  // The owner has opened the app and wants to say what he is trying to become.
  // Every concept the app can hold is in the registry, and every one an owner
  // can answer is either in the guide's catalogue or correctable on a Life
  // page. So the question is answerable without an opinion: is any of them
  // about a destination?
  const askable = new Set(QUESTIONS.map((question) => question.concept))
  const correctable = coreConcepts
    .all()
    .filter((definition) => definition.derived !== true)
    .map((definition) => definition.id)
  const aboutADestination = [...new Set([...askable, ...correctable])].filter(
    (concept) => concept === CONCEPT.weeklyFocus,
  )
  stops.push({
    step: 'unknown-aspiration',
    trying: 'say what he is trying to become, before he knows how to name it',
    proceeded: false,
    note:
      aboutADestination.length === 0
        ? 'no concept in the registry is about anything the owner is aiming at'
        : 'the longest-horizon thing he can state is this week’s focus (direction.weekly-focus); there is no concept for a destination, a milestone or where he is starting from',
  })

  // --- 2. discovery ---------------------------------------------------------
  //
  // The guide is the app's only questioning surface. What it asks on a first
  // evening is what discovery is.
  const asked: string[] = []
  for (let taps = 0; taps < 4; taps += 1) {
    const step = app.guide()
    if (step.kind !== 'question' || step.question === undefined) break
    asked.push(step.question.spec.concept)
    const answer = step.question.spec.concept === CONCEPT.energy ? 'ok' : 'none'
    const result = await app.answerGuide(answer)
    if (!result.done) break
  }
  stops.push({
    step: 'discovery',
    trying: 'be asked something that would surface what matters to him',
    proceeded: false,
    note: `the guide asked ${asked.length} question(s) — ${asked.join(', ')} — and every one is a reading of today's capacity; it has no question that could surface an aspiration, and D-036 caps it at ${3} a day regardless`,
  })

  // --- 3. object creation ---------------------------------------------------
  //
  // The reachability walk in `journey.ts` answers this, and it answers it from
  // the controls rather than from a belief about them.
  const unreachable = recordKindsWithNoOwnerRoute()
  stops.push({
    step: 'object-creation',
    trying: 'name a goal, a topic he is studying, a person, a place or a skill',
    proceeded: false,
    note: `no control on any screen creates a semantic entity, and ${unreachable.join(', ')} have no owner route at all — a goal can be corrected once it exists and cannot be brought into being`,
  })

  // --- 4. real action -------------------------------------------------------
  const beforeAction = app.decision()
  const started = await app.act('start')
  stops.push({
    step: 'real-action',
    trying: 'get a concrete thing to do, and do it',
    proceeded: started.done && beforeAction.kind === 'move',
    note: started.done
      ? `Now proposed "${beforeAction.explanation?.rendered.sentence ?? ''}" from two answers, and Start it recorded it`
      : `no move reached the screen — ${started.note}`,
  })

  // --- 5. interruption ------------------------------------------------------
  //
  // He starts, is interrupted, says so, and then wants to come back to it. The
  // state machine allows `unable-now → started | completed | declined`; the
  // question is whether the screen ever offers them again.
  const interrupted = await app.act('unable-now')
  const afterInterruption = app.decision()
  const cameBack = afterInterruption.kind === 'move'
  stops.push({
    step: 'interruption',
    trying: 'say he was interrupted, and then pick the same thing back up',
    proceeded: interrupted.done && cameBack,
    note: interrupted.done
      ? cameBack
        ? 'Can’t right now was recorded and the move stayed reachable'
        : `Can’t right now was recorded, and the move then left the screen: Now reads "${afterInterruption.noAction?.headline ?? ''}" — TRANSITIONS allows unable-now → started, completed or declined, and no surface offers any of them. Nor is any reason for the interruption asked for or stored: planLifecycle takes one and NowScreen passes none`
      : `nothing recorded the interruption — ${interrupted.note}`,
  })

  // --- 6. concrete outcome --------------------------------------------------
  //
  // Restart the day rather than fight the block: the previous step deliberately
  // left the evening's suggestions exhausted, and what is being measured here
  // is whether a completion produces a result the app can use.
  const second = await openJourney('the-first-evening')
  await second.answerGuide('ok')
  await second.answerGuide('none')
  await second.act('start')
  const finished = await second.act('complete')
  second.travelMinutes(40)
  const pending = second.pendingOutcome()
  const answered = await second.answerReading('low')
  stops.push({
    step: 'concrete-outcome',
    trying: 'record what actually came of it',
    proceeded: finished.done && answered.done,
    note:
      finished.done && answered.done
        ? `twenty minutes after Done the app asked for a reading of ${pending?.reading ?? ''} rather than a grade (D-089), and the answer landed`
        : `${finished.note}; ${answered.note}`,
  })

  // --- 7. correction --------------------------------------------------------
  const beforeCorrection = second.decision()
  const corrected = await second.correctFact(CONCEPT.energy, { type: 'scale', value: 1, of: 5 })
  const events = second
    .snapshot()
    .records.filter((record) => record.kind === 'action-completion').length
  stops.push({
    step: 'correction',
    trying: 'correct what the app now believes, and correct what it recorded',
    // A fact can be corrected. An event cannot, and the step is only past when
    // both are — so this is deliberately a stop rather than a pass.
    proceeded: false,
    note: corrected.done
      ? `a fact corrects from its own row on the Life page (${events} completion(s) in the record stayed untouched), and there is no route to any of them: nothing withdraws a completion, moves an entry to the day it happened, or backfills one that was never recorded — liftVetoRecord is the only writer of a correction record and it corrects a veto`
      : `the fact could not be corrected — ${corrected.note}`,
  })

  // --- 8. changed recommendation --------------------------------------------
  const afterCorrection = second.decision()
  const moved =
    afterCorrection.explanation?.rendered.sentence !==
    beforeCorrection.explanation?.rendered.sentence
  stops.push({
    step: 'changed-recommendation',
    trying: 'see the app change its mind because of what he said',
    proceeded: moved && afterCorrection.kind === 'move',
    note: moved
      ? `the correction moved the recommendation to "${afterCorrection.explanation?.rendered.sentence ?? ''}"`
      : 'the correction changed nothing on screen',
  })

  return { stops, app }
}

// ---------------------------------------------------------------------------
// What the run must find
// ---------------------------------------------------------------------------

/**
 * The four record kinds nothing an owner can tap will produce.
 *
 * Written out rather than derived from the same walk that computes them, so a
 * control quietly disappearing widens this and fails, and a control arriving
 * narrows it and fails. Either way somebody reads it.
 */
const NO_OWNER_ROUTE: readonly RecordKind[] = [
  'constraint',
  'goal',
  'commitment',
  'relationship-event',
]

/** Which steps an ordinary journey gets past, and which it does not. */
const PROCEEDS: Record<(typeof JOURNEY_STEPS)[number], boolean> = {
  'unknown-aspiration': false,
  discovery: false,
  'object-creation': false,
  'real-action': true,
  interruption: false,
  'concrete-outcome': true,
  correction: false,
  'changed-recommendation': true,
}

describe('D-161 — the ordinary-use journey from a near-empty store', () => {
  it('runs every step, in order, and each one says what happened', async () => {
    const { stops } = await walkTheJourney()

    expect(stops.map((stop) => stop.step)).toEqual([...JOURNEY_STEPS])
    for (const stop of stops) {
      expect(stop.note.length, `${stop.step} has no reason on it`).toBeGreaterThan(20)
      expect(stop.trying.length, `${stop.step} does not say what was being tried`).toBeGreaterThan(
        10,
      )
    }
  })

  it('gets past the four steps the app supports, and stops at the four it does not', async () => {
    const { stops } = await walkTheJourney()
    for (const stop of stops) {
      expect(stop.proceeded, `${stop.step} — ${stop.note}`).toBe(PROCEEDS[stop.step])
    }
  })

  it('reaches a real action, a real outcome and a changed mind from one answer', async () => {
    /*
     * The half of D-161 that is not a complaint.
     *
     * Three of the eight steps do work from a near-empty store, and stating
     * that plainly is part of the instrument: the finding is that acquisition
     * is missing, not that the app does nothing. A run that only recorded
     * failures would be as unfaithful as the fixtures it replaces.
     */
    const app = await openJourney('the-first-evening')
    expect(app.records()).toBe(1)

    expect((await app.answerGuide('ok')).done).toBe(true)
    expect((await app.answerGuide('none')).done).toBe(true)
    expect(app.decision().kind).toBe('move')

    expect((await app.act('start')).done).toBe(true)
    expect(app.decision().state).toBe('started')
    expect((await app.act('complete')).done).toBe(true)

    app.travelMinutes(40)
    expect(app.pendingOutcome()?.reading).toBe(CONCEPT.energy)
    expect((await app.answerReading('low')).done).toBe(true)

    const before = app.decision()
    expect((await app.correctFact(CONCEPT.energy, { type: 'scale', value: 1, of: 5 })).done).toBe(
      true,
    )
    const after = app.decision()
    expect(after.kind).toBe('move')
    expect(after.explanation?.rendered.sentence).not.toBe(before.explanation?.rendered.sentence)
  })

  it('offers a course of action from a single answer, which is what makes `thread` reachable', async () => {
    /*
     * The route table's one non-obvious entry, checked rather than argued.
     *
     * `thread-start` claims `needs: { records: ['observation'] }` — that a
     * course can be offered from guide answers alone. It is true for exactly
     * one of the three shapes: the recovery run is offered beside a recovery
     * move, and a recovery move needs only short nights. The study schedule and
     * the growth ladder ride on moves that need an entity nothing can create,
     * so they are unreachable for the reason `object-creation` stops.
     *
     * If this ever stops being true, `reachableRecordKinds()` is wrong and the
     * enumerated brief is wrong with it.
     */
    const app = await openJourney('the-first-evening')
    expect((await app.answerGuide('empty')).done).toBe(true)

    const decision = app.decision()
    const target = decision.explanation?.semantics.target
    expect(target, 'a recovery move should be on screen').toBeDefined()

    const offer = threadOfferFor(
      decision.situation.threads,
      target!,
      decision.situation.entities.labelFor(target!.object) ?? '',
    )
    expect(offer?.kind).toBe('recovery-run')
    expect(reachableRecordKinds().has('thread')).toBe(true)
  })
})

describe('D-161 — what an owner has no route to', () => {
  it('names the record kinds no control can produce', () => {
    expect([...recordKindsWithNoOwnerRoute()].sort()).toEqual([...NO_OWNER_ROUTE].sort())
  })

  it('has no authoring control anywhere that creates a semantic entity', () => {
    /*
     * The structural half of "object creation", and the reason the table above
     * can say `goal` is unreachable without arguing about it.
     *
     * Entities reach the store through three doors and every one of them is a
     * file: the QA laboratory's `replaceAll`, the legacy importer, and restore.
     * No control on any screen calls `createEntity`, so the subject of a goal,
     * a topic, a person, a place or a child's skill cannot be named by the
     * person whose life it is.
     */
    const offenders: string[] = []
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) {
          walk(full)
          continue
        }
        if (!name.endsWith('.ts') && !name.endsWith('.tsx')) continue
        const text = readFileSync(full, 'utf8')
        if (/\bcreateEntity\s*\(/.test(text)) offenders.push(name)
      }
    }
    walk(join(ROOT, 'src', 'features'))
    expect(offenders).toEqual([])
  })

  it('keeps the route table honest about which builder each control calls', () => {
    // Every route names a real screen and a real builder, and no two claim the
    // same id. A table nobody can check is a comment.
    const ids = new Set<string>()
    for (const route of OWNER_ROUTES) {
      expect(ids.has(route.id), `${route.id} is listed twice`).toBe(false)
      ids.add(route.id)
      expect(route.writes.length, `${route.id} writes nothing`).toBeGreaterThan(0)
      expect(route.builder).toMatch(/\./)
    }
  })
})
