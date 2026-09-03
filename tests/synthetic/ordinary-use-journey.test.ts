import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import type { RecordKind } from '../../src/domain/records'
import { threadOfferFor } from '../../src/intelligence/threads'
import {
  everyBuilderReachedFromAFeature,
  JOURNEY_STEPS,
  NOT_A_CONTROL,
  OWNER_ROUTES,
  openJourney,
  reachableRecordKinds,
  recordKindsWithNoOwnerRoute,
  type JourneyApp,
  type JourneyStop,
} from './journey'

/**
 * The ordinary-use journey, from a near-empty store — D-161, and routing 84's
 * acceptance.
 *
 * ## What changed, and why this file is the record of it
 *
 * Routing 83 built this instrument and ran it. It got past three of its eight
 * steps and the five it stopped at became routing 84's brief — *"that list is
 * the deliverable"*. This is the same walk, on the same near-empty store,
 * through the same rule: **every gesture is the surface's own call, with the
 * surface's own arguments**. Nothing here reaches for a record builder no
 * control emits.
 *
 * The eight steps now run. That is the phase's claim and this file is where it
 * is either true or false; the two outputs are the same two they always were.
 *
 * 1. **The journey runs.** Eight steps, from one answer on a first evening to a
 *    recommendation that changed because of something the owner said.
 * 2. **What is still open is enumerated.** Where the journey now goes on but
 *    something further is missing, the step says so, and the table below is
 *    routing 90's and routing 91's to read.
 *
 * ## What it still deliberately does not do
 *
 * Repair anything it finds. What is left over is a visual phase's or a later
 * intelligence phase's, and closing one here would make routing 84 the
 * mega-phase the adjudication refused twice.
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
  // The owner has opened the app on his first evening and wants to say what he
  // is trying to become. Routing 83 found no concept in the registry about
  // anything he is aiming at, and the longest-horizon thing he could state was
  // this week's focus. He types one sentence.
  const named = await app.nameDestination({
    aim: 'Working as a cloud engineer',
    domain: DOMAIN.career,
    milestone: 'Get through the networking basics',
  })
  const destinations = app.situation().direction.destinations
  const aimed = destinations[0]
  stops.push({
    step: 'unknown-aspiration',
    trying: 'say what he is trying to become, before he knows how to name it',
    proceeded: named.done && aimed !== undefined,
    note:
      named.done && aimed !== undefined
        ? `"${aimed.aim}" is held as a destination in ${aimed.domain}, with "${aimed.next?.goal.statement ?? ''}" named on the way to it — described, with no number on any of it`
        : `nothing holds an aspiration — ${named.note}`,
  })

  // --- 2. discovery ---------------------------------------------------------
  //
  // The guide's whole catalogue is six readings of today's capacity and D-036
  // caps it at three a day, and that is unchanged and correct. The question is
  // whether anything else asks about the rest of a life.
  const agenda = app.agenda()
  const asked = agenda.prompt
  stops.push({
    step: 'discovery',
    trying: 'be asked something that would surface what matters to him',
    proceeded: asked !== undefined,
    note:
      asked === undefined
        ? `the second agenda has nothing to ask — ${agenda.because}`
        : `the second agenda asks "${asked.prompt}" — ${agenda.outstanding.length} thing(s) outstanding, ${agenda.budget} a week, and the guide's three-a-day cap is untouched`,
  })

  // --- 3. object creation ---------------------------------------------------
  //
  // The stop routing 83 found, said precisely: he could state a current-topic
  // fact and it created no entity, so nothing could refer to it. The walk in
  // `journey.ts` answers this from the controls rather than from a belief.
  const unreachable = recordKindsWithNoOwnerRoute()
  const introduced = await app.introduce({
    kind: 'place',
    name: 'The library',
    domain: DOMAIN.career,
  })
  const places = app.situation().entities.byKind('place').length
  const topics = app.situation().entities.byKind('learning-topic').length
  stops.push({
    step: 'object-creation',
    trying: 'name something the rest of the app can then refer to',
    proceeded: introduced.done && places > 0 && topics > 0,
    note:
      introduced.done && places > 0
        ? `an owner control creates a semantic entity: ${places} place(s) and ${topics} learning topic(s) exist that no file put there, and ${unreachable.length === 0 ? 'every record kind now has an owner route' : `${unreachable.join(', ')} still have none`}`
        : `nothing could be introduced — ${introduced.note}`,
  })

  // --- 4. real action -------------------------------------------------------
  await app.answerGuide('ok')
  await app.answerGuide('none')
  const beforeAction = app.decision()
  const started = await app.act('start')
  stops.push({
    step: 'real-action',
    trying: 'get a concrete thing to do, and do it',
    proceeded: started.done && beforeAction.kind === 'move',
    note: started.done
      ? `Now proposed "${beforeAction.explanation?.rendered.sentence ?? ''}" and Start it recorded it`
      : `no move reached the screen — ${started.note}`,
  })

  // --- 5. interruption ------------------------------------------------------
  //
  // He starts, is interrupted, says so, is asked one optional question about
  // what was in the way, and then wants to come back to it. Routing 83 found
  // the move leaving the screen with `TRANSITIONS` allowing the return and no
  // surface offering it, and the reason neither asked for nor stored.
  const interrupted = await app.act('unable-now')
  const question = app.blockerFor()
  const said = await app.sayWhatBlocked('no-kit')
  const offered = app.resumable()
  const cameBack = await app.resume('start')
  stops.push({
    step: 'interruption',
    trying: 'say he was interrupted, say what was in the way, and pick it back up',
    proceeded: interrupted.done && said.done && cameBack.done,
    note:
      interrupted.done && said.done && cameBack.done
        ? `Can't right now was recorded, the app asked once (${question?.ask === true ? question.because : 'and did not'}), the reason is stored as "${offered?.blocker ?? ''}" and kept as a standing constraint, and the move was offered back and picked up`
        : `${interrupted.note}; ${said.note}; ${cameBack.note}`,
  })

  // --- 6. concrete outcome --------------------------------------------------
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
  //
  // Two different gestures, and the step is only past when both work: a fact
  // corrects from its own row, **and** something the app recorded can be
  // withdrawn or moved to the day it happened.
  const beforeCorrection = second.decision()
  const corrected = await second.correctFact(CONCEPT.energy, { type: 'scale', value: 1, of: 5 })
  const completion = second.snapshot().records.find((record) => record.kind === 'action-completion')
  const withdrawn =
    completion === undefined
      ? { done: false, note: 'nothing to withdraw', written: 0 }
      : await second.withdraw(completion.id, 'This did not happen')
  const stillThere = second.snapshot().records.some((record) => record.id === completion?.id)
  const gone =
    completion === undefined
      ? false
      : !second.view().history.effective.some((record) => record.id === completion.id)
  stops.push({
    step: 'correction',
    trying: 'correct what the app now believes, and correct what it recorded',
    proceeded: corrected.done && withdrawn.done && gone,
    note:
      corrected.done && withdrawn.done
        ? `a fact corrects from its own row, and a completion can be withdrawn: it stops counting (${gone}) and stays in the record (${stillThere}), which is D-047's watershed rather than a deletion`
        : `${corrected.note}; ${withdrawn.note}`,
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
 * The record kinds nothing an owner can tap will produce.
 *
 * **Empty since routing 84**, and it is empty because controls were built for
 * the four that had none — `constraint` from the blocker question, `goal` and
 * `commitment` from the authoring control, `relationship-event` from the people
 * panel — rather than because anything moved onto `NOT_OWNER_AUTHORED`.
 *
 * Written out rather than derived from the same walk that computes it, so a
 * control quietly disappearing widens this and fails, and a control arriving
 * narrows it and fails. Either way somebody reads it.
 */
const NO_OWNER_ROUTE: readonly RecordKind[] = []

/** Which steps an ordinary journey gets past, and which it does not. */
const PROCEEDS: Record<(typeof JOURNEY_STEPS)[number], boolean> = {
  'unknown-aspiration': true,
  discovery: true,
  'object-creation': true,
  'real-action': true,
  interruption: true,
  'concrete-outcome': true,
  correction: true,
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

  it('gets past all eight steps, which is routing 84', async () => {
    /*
     * The phase's own claim, and the one line of this file that would have been
     * false before it. Five of these were stops, each with a reason, and the
     * reasons were the six work packages.
     */
    const { stops } = await walkTheJourney()
    for (const stop of stops) {
      expect(stop.proceeded, `${stop.step} — ${stop.note}`).toBe(PROCEEDS[stop.step])
    }
  })

  it('reaches a real action, a real outcome and a changed mind from one answer', async () => {
    /*
     * The half of D-161 that is not a complaint, unchanged from routing 83.
     * Three of the eight steps worked from a near-empty store before this phase
     * and they still do — a run that only recorded what it added would be as
     * unfaithful as the fixtures it replaces.
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
     * move, and a recovery move needs only short nights.
     *
     * The other two were unreachable in routing 83 because the moves that carry
     * them need an entity nothing could create. That is no longer why they are
     * hard to reach, and the assertion here is deliberately unchanged: what it
     * pins is that `thread` is reachable at all, and it still is by this route.
     */
    const app = await openJourney('the-first-evening')
    expect((await app.answerGuide('empty')).done).toBe(true)

    /*
     * And a night short enough to be worth a plan — AUD-0009.
     *
     * The claim this test pins is unchanged: a course is reachable from
     * observations alone, which is what the route table says `thread-start`
     * needs. What changed is which observation. A recovery run's span is read
     * off the owner's own shortfall, so a run is offered where there is one to
     * repay and not merely where a recovery move happens to be on screen — a
     * plan of unstated length, offered for one low-energy evening, is a course
     * the owner would be agreeing to without knowing what it was.
     *
     * Both gestures here write an `observation`, which is exactly what the
     * route table requires, so the reachability claim is the same claim.
     */
    expect(
      (await app.correctFact(CONCEPT.sleepHours, { type: 'number', value: 4, unit: 'hours' })).done,
    ).toBe(true)

    const decision = app.decision()
    const target = decision.explanation?.semantics.target
    expect(target, 'a recovery move should be on screen').toBeDefined()

    const offer = threadOfferFor(
      decision.situation.threads,
      target!,
      decision.situation.entities.labelFor(target!.object) ?? '',
      decision.situation.capacity.recoveryNights,
    )
    expect(offer?.kind).toBe('recovery-run')
    // And it names the span it is for, rather than asking him to agree to a
    // course of unstated length.
    expect(offer?.steps, 'the run has no length').toBeGreaterThan(1)
    expect(offer?.offer).toContain('quiet nights')
    expect(reachableRecordKinds().has('thread')).toBe(true)
  })

  it('offers no course at all where there is no shortfall to repay — AUD-0009', async () => {
    /*
     * The other arm, and the one that makes the arm above mean something. The
     * same evening and the same recovery move, and no plan — because a single
     * low-energy evening with a full night behind it is not two nights of
     * anything, and the app declines rather than inventing a length.
     */
    const app = await openJourney('the-first-evening')
    expect((await app.answerGuide('empty')).done).toBe(true)

    const decision = app.decision()
    const target = decision.explanation?.semantics.target
    expect(target, 'a recovery move should still be on screen').toBeDefined()
    expect(decision.situation.capacity.recoveryNights, 'a full night implied a run').toBeUndefined()

    expect(
      threadOfferFor(
        decision.situation.threads,
        target!,
        decision.situation.entities.labelFor(target!.object) ?? '',
        decision.situation.capacity.recoveryNights,
      ),
      'a course was offered with no shortfall behind it',
    ).toBeUndefined()
  })
})

describe('D-161 — what an owner has no route to', () => {
  it('names the record kinds no control can produce', () => {
    expect([...recordKindsWithNoOwnerRoute()].sort()).toEqual([...NO_OWNER_ROUTE].sort())
  })

  it('has an authoring control that creates a semantic entity', () => {
    /*
     * The structural half of "object creation", inverted — routing 84.
     *
     * Routing 83 asserted that **no** file under `src/features` called
     * `createEntity`, and that assertion was the finding. The claim now is the
     * opposite one and it is held just as tightly: a control exists, it is on a
     * screen, and it is the only path — every entity in a running store arrived
     * either through this, through the QA laboratory's `replaceAll`, through
     * the legacy importer, or through restore.
     *
     * It asks for the **handler**, not the import: a file that imported the
     * builder and never called it would pass a check for the symbol.
     */
    const callers: string[] = []
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) {
          walk(full)
          continue
        }
        if (!name.endsWith('.ts') && !name.endsWith('.tsx')) continue
        const text = readFileSync(full, 'utf8')
        // Across a line break, because that is how it is formatted: the call
        // sits inside `void memory` … `.create(`, and a regex that assumed one
        // line would report the control missing rather than the formatting.
        if (/\bmemory\s*\n?\s*\.create\(/.test(text)) callers.push(name)
      }
    }
    walk(join(ROOT, 'src', 'features'))
    expect(callers.sort(), 'no screen can bring an entity into being').toEqual([
      'Discovery.tsx',
      'DomainPage.tsx',
    ])
  })

  it('lists every control on every screen that writes a record', () => {
    /*
     * The guard QA-83-003 asked for, unchanged and now covering eleven more
     * controls than it did.
     *
     * **It asks per screen, not per builder.** Routing 84 adds two cases of
     * exactly the shape that made that necessary: `destinationRecords` and
     * `authoringRecords` are each called from a domain page and from Life, and
     * a check that only asked whether the symbol appeared anywhere in the table
     * would be blind to one of the two.
     */
    const missing = everyBuilderReachedFromAFeature().filter((reached) => {
      if (reached.surface === 'not-a-control') return !NOT_A_CONTROL.includes(reached.builder)
      return !OWNER_ROUTES.some(
        (route) => route.surface === reached.surface && route.builder.includes(reached.builder),
      )
    })

    expect(
      missing.map((reached) => `${reached.file} calls ${reached.builder} (${reached.surface})`),
      'a screen writes a record through a control no route names',
    ).toEqual([])
  })

  it('bites when a control is taken out of the table', () => {
    /*
     * The guard proves nothing unless it can fail, and the shape it has to fail
     * on is the one that was in the tree: a real handler, in a real file,
     * absent from the table — including one whose builder another screen also
     * calls.
     *
     * Routing 84's own pair is checked alongside routing 83's, because it is
     * the same trap one phase later: `destinationRecords` is a control on a
     * domain page and a different control on Life.
     */
    const reached = everyBuilderReachedFromAFeature()
    const named = (id: string) => OWNER_ROUTES.filter((route) => route.id !== id)

    for (const [id, builder, surface] of [
      ['thread-state', 'setThreadStateRecord', 'life'],
      ['insights-belief-correction', 'beliefCorrectionRecord', 'insights'],
      ['destination', 'destinationRecords', 'domain-page'],
      ['discovery-answer', 'destinationRecords', 'insights'],
    ] as const) {
      const found = reached.find((entry) => entry.builder === builder && entry.surface === surface)
      expect(found, `the reader must find ${builder} on ${surface}`).toBeDefined()

      const without = named(id)
      const stillCovered = without.some(
        (route) => route.surface === surface && route.builder.includes(builder),
      )
      expect(stillCovered, `removing ${id} should leave ${builder} unlisted`).toBe(false)
    }
  })

  it('keeps the route table honest about which screen and builder each control names', () => {
    const ids = new Set<string>()
    for (const route of OWNER_ROUTES) {
      expect(ids.has(route.id), `${route.id} is listed twice`).toBe(false)
      ids.add(route.id)
      expect(route.writes.length, `${route.id} writes nothing`).toBeGreaterThan(0)
      expect(route.builder).toMatch(/\./)
    }
  })
})

// ---------------------------------------------------------------------------
// What routing 84 did not close, enumerated — the same discipline as its brief
// ---------------------------------------------------------------------------

/**
 * Where an ordinary journey now goes on, and something is still missing.
 *
 * Routing 83's list was five stops. This is what is left after them, and it is
 * deliberately shorter and deliberately not empty: a phase that reported no
 * open items would be the one thing routing 83's own record warns about.
 *
 * Each line names where it belongs, and none of them is this phase's.
 */
describe('what an ordinary journey still cannot do', () => {
  it('cannot author an entry for something that was never recorded', async () => {
    /*
     * The third of F32's three, and it is deferred by decision rather than
     * missed. D-165: *"authoring or backfilling a historical event... stays in
     * the later Reach package. The grammar precedes the authoring surface; it
     * does not wait for it."*
     *
     * Withdrawing works and re-dating works — both are proved in the journey
     * above. What has no route is writing down something that happened on
     * Tuesday and was never entered, and the route table is where that shows.
     */
    const backfill = OWNER_ROUTES.filter((route) => route.id.includes('backfill'))
    expect(backfill, 'a backfill control arrived without D-165 being amended').toEqual([])
  })

  it('can be told a routine and then be offered it — Reach walked the route', async () => {
    /*
     * **This test's name and its assertion both flipped, and that is the
     * finding rather than a regression.** It was written at routing 84 to hold
     * a deferral honestly: *"No owner routines library. This phase builds the
     * route; Reach walks it."* A route with nothing walking it is exactly the
     * shape that reads as finished from the outside, so the limitation was
     * asserted rather than left to a comment.
     *
     * Routing 92 is Reach. AUD-0045's precondition — `profileFor` keyed on
     * (verb, object) — is built, so a second routine can participate without
     * being scored as a 25-minute walk, and the health generator prefers what
     * the owner named.
     *
     * D-021 is untouched and is what the last assertion is about: the engine
     * still invents no subjects. What is on the screen is his sentence.
     */
    const app = await openJourney('the-first-evening')
    const made = await app.introduce({
      kind: 'routine',
      name: 'Lifting on a Tuesday',
      domain: DOMAIN.health,
    })
    expect(made.done, 'the route exists').toBe(true)
    expect(
      app
        .situation()
        .entities.byKind('routine')
        .some((e) => e.label === 'Lifting on a Tuesday'),
    ).toBe(true)

    await app.answerGuide('ok')
    await app.answerGuide('none')
    const decision = app.decision()
    const object = decision.explanation?.semantics.target.object.id ?? ''
    expect(
      object.startsWith('routine:lifting'),
      'the routine he named is not what the app offered',
    ).toBe(true)
    // And the app still invents nothing: the subject on the screen is an entity
    // he created, exactly as a learning topic or a place is (D-021).
    expect(decision.explanation?.rendered.sentence).toContain('Lifting on a Tuesday')
  })

  it('has no verdict on whether a strategy is working', () => {
    /*
     * F03, and it is Validity's rather than this phase's — *"a strategy can
     * only fail against a destination that must exist first"*. The destination
     * exists now, which is the precondition; the verdict is not built and must
     * not be.
     */
    const source = readFileSync(join(ROOT, 'src/intelligence/destinations.ts'), 'utf8')
    for (const forbidden of ['working', 'failing', 'on track', 'off track']) {
      expect(
        source.toLowerCase().includes(`'${forbidden}`),
        `a destination reading states a verdict: ${forbidden}`,
      ).toBe(false)
    }
  })
})
