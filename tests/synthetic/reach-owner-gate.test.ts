import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { isUsable } from '../../src/domain/knowledge'
import { openJourney, type JourneyApp } from './journey'

/**
 * Routing 92's ordinary-owner contract, run the way an owner would run it.
 *
 * §6.4 lists five things a person with a fresh store and two domains has to be
 * able to see across simulated days. Three of them live here — the supervision
 * blocker, the movement routine that is not a walk, and the fact list changing
 * when a previously inert concept starts reaching a decision. The other two are
 * in `reach-dimensions.test.ts` (two of six known, four unknown, nothing
 * aggregating) and in the guide gate that this phase did not raise.
 *
 * Every step is a control the owner can actually press: `journey.ts` builds the
 * records the surfaces build and nothing here writes a record kind no
 * owner-facing control emits.
 */

/** The first evening, answered the way an evening opens. */
async function eveningIn(): Promise<JourneyApp> {
  const app = await openJourney('the-first-evening')
  await answerCapacity(app)
  return app
}

/**
 * The capacity questions, answered.
 *
 * Called again after a day moves, because a day moving is what makes them
 * stale: energy goes in six hours and soreness in twelve, by design (D-061), so
 * a fresh evening is a fresh evening and the app asks again. That is the
 * product working; it is only worth saying here because a test that travelled
 * and did not answer would be reading a history with no capacity in it.
 */
async function answerCapacity(app: JourneyApp): Promise<void> {
  for (let taps = 0; taps < 3; taps += 1) {
    const step = app.guide()
    if (step.kind !== 'question' || step.question === undefined) break
    await app.answerGuide(
      step.question.spec.concept === CONCEPT.energy
        ? 'ok'
        : step.question.spec.concept === CONCEPT.soreness
          ? 'none'
          : undefined,
    )
  }
}

function sentence(app: JourneyApp): string {
  const decision = app.decision()
  return decision.explanation?.rendered.sentence ?? decision.noAction?.headline ?? 'nothing'
}

describe('a supervision blocker takes the walk off Now, and lifting it puts it back — C21', () => {
  it('stops re-offering a move that means leaving, while the constraint stands', async () => {
    /*
     * The owner's own case, from the deployed build: Now offered a walk while
     * his daughter was asleep upstairs and there was nobody else to watch her.
     * Routing 84 gave him somewhere to say so and D-187 was explicit that
     * **nothing acted on it** — `applyConstraints` never read
     * `situation.constraints`, and the concept the constraint named was one the
     * registry had never heard of.
     *
     * Both halves exist now: `context.must-stay` has a registry home, and the
     * candidate says whether it means going out.
     */
    const app = await eveningIn()
    expect(sentence(app), 'the fixture should be offering a walk').toContain('walk')

    await app.act('unable-now')
    const said = await app.sayWhatBlocked('must-stay')
    expect(said.done, said.note).toBe(true)

    // The reading the app now holds, worked out from the constraint in force.
    const mustStay = app.situation().mustStay
    expect(isUsable(mustStay) && mustStay.value, 'the app does not know he cannot leave').toBe(true)

    // And the next day is a fresh evening rather than the same one.
    app.travelDays(1)
    await answerCapacity(app)
    const rejected = app
      .decision()
      .trace.rejected.filter((entry) => entry.reason === 'cannot-leave')
    expect(rejected.length, 'the walk is still being offered').toBeGreaterThan(0)
    expect(sentence(app), 'a move that means leaving is still on screen').not.toContain('a walk')
  })

  it('offers it again once he says it is not true any more', async () => {
    const app = await eveningIn()
    await app.act('unable-now')
    await app.sayWhatBlocked('must-stay')
    app.travelDays(1)
    await answerCapacity(app)
    expect(sentence(app)).not.toContain('a walk')

    const standing = app.situation().constraints.find((entry) => entry.concept === CONCEPT.mustStay)
    expect(standing, 'nothing durable was written').toBeDefined()
    const lifted = await app.withdraw(standing!.source, 'Not true any more')
    expect(lifted.done, lifted.note).toBe(true)

    expect(isUsable(app.situation().mustStay), 'the app still thinks he cannot leave').toBe(false)
    /*
     * The constraint stops removing it, which is the whole of what lifting
     * does. Winning the ranking is a separate question and stays the arbiter's:
     * a move he could not do yesterday is worth less today, and it would be
     * wrong for a lifted constraint to override that.
     */
    expect(
      app.decision().trace.rejected.filter((entry) => entry.reason === 'cannot-leave'),
      'the walk is still being removed for a fact he has taken back',
    ).toEqual([])
    expect(
      app.decision().trace.proposed.map((entry) => entry.id),
      'the walk is not even proposed',
    ).toContain('health/move/routine:a-walk')
  })

  it('bounds it to tonight when that is the answer he gave', async () => {
    /*
     * S2 Tier 1's bounded `until`, which §5.2 records as having no
     * representation at all: *"While she is asleep"* had nowhere to live and no
     * blocker path ever set `ConstraintRecord.until`. It is a second button
     * rather than a second question, so the bound travels with the answer.
     */
    const app = await eveningIn()
    await app.act('unable-now')
    const said = await app.sayWhatBlocked('must-stay-tonight')
    expect(said.done, said.note).toBe(true)
    expect(isUsable(app.situation().mustStay)).toBe(true)

    // It ends with the day it was said on, without him having to do anything.
    app.travelDays(1)
    await answerCapacity(app)
    expect(isUsable(app.situation().mustStay), 'tonight became forever').toBe(false)
  })

  it('says nothing about indoor moves, which is why the pairing is needed', async () => {
    // A man who cannot leave the house can still wind down in it. The
    // constraint is matched against what the move requires rather than against
    // every move he has ever been offered — which is the difference between a
    // constraint and blocker enforcement, and the reason 93 owns the second.
    const app = await eveningIn()
    await app.act('unable-now')
    await app.sayWhatBlocked('must-stay')
    app.travelDays(1)
    await answerCapacity(app)
    const rejected = app.decision().trace.rejected
    for (const entry of rejected.filter((row) => row.reason === 'cannot-leave')) {
      expect(entry.candidate, 'an indoor move was removed for a fact about going out').toContain(
        'a-walk',
      )
    }
  })
})

describe('a movement routine other than a walk — AUD-0045, C20, F12', () => {
  it('suggests the one he named, in his own words, at the size he gave', async () => {
    /*
     * The purest available form of section 64's failure: every owner, on every
     * good day, forever, got *"Move for 25 minutes: a walk."* The entity kind
     * `routine` was declared in Phase 1 and no surface created one.
     */
    const app = await eveningIn()
    expect(sentence(app)).toContain('a walk')

    const made = await app.introduce({
      kind: 'routine',
      name: 'swimming',
      domain: DOMAIN.health,
      minutes: 45,
      requiresLeaving: true,
    })
    expect(made.done, made.note).toBe(true)

    const after = sentence(app)
    expect(after, 'the routine he named is not what is suggested').toContain('swimming')
    expect(after, 'and it is not the walk any more').not.toContain('a walk')
    expect(after, 'the size he gave is not the size it is suggested at').toContain('45')
  })

  it('keeps the walk for an owner who has named nothing', async () => {
    // The fallback is unchanged, which is what makes this an addition rather
    // than a replacement: every history that shipped before this phase has no
    // routines in it and behaves exactly as it did.
    const app = await eveningIn()
    expect(app.situation().routines).toEqual([])
    expect(sentence(app)).toContain('a walk')
  })

  it('suggests it without a length when he did not give one', async () => {
    // F36's rule: the app has no idea how long his swim takes, so it says so by
    // saying nothing rather than by inventing twenty-five minutes.
    const app = await eveningIn()
    const made = await app.introduce({
      kind: 'routine',
      name: 'the rowing machine',
      domain: DOMAIN.health,
    })
    expect(made.done, made.note).toBe(true)
    const after = sentence(app)
    expect(after).toContain('the rowing machine')
    expect(after, 'a duration was invented for it').not.toMatch(/\d+ minutes/)
  })

  it('scores a long routine as a long routine — the audit’s precondition', async () => {
    /*
     * The bulk of AUD-0045, and the reason it waited: `profileFor` had to
     * become keyed on **(verb, object)**. A 45-minute swim and a 25-minute walk
     * sharing one profile would make `no-time`, `too-strained`, `friction`,
     * `time-fit`, `opportunity-cost` and `capacity-fit` all wrong for the
     * heavier one.
     */
    const app = await eveningIn()
    await app.introduce({
      kind: 'routine',
      name: 'the gym',
      domain: DOMAIN.health,
      minutes: 90,
      requiresLeaving: true,
    })
    const chosen = app.decision().trace.ranking.find((row) => row.id.includes('the-gym'))
    expect(chosen, 'the routine was not even ranked').toBeDefined()
    expect(chosen?.minutes, 'it was scored at the walk’s size').toBe(90)
  })

  it('lets a supervision constraint reach the routine he named, not only the walk', async () => {
    // The two halves of C21 meeting on an object the owner created: he said the
    // gym means going out, and he said he cannot leave.
    const app = await eveningIn()
    await app.introduce({
      kind: 'routine',
      name: 'the gym',
      domain: DOMAIN.health,
      minutes: 60,
      requiresLeaving: true,
    })
    expect(sentence(app)).toContain('the gym')

    await app.act('unable-now')
    await app.sayWhatBlocked('must-stay')
    expect(
      app
        .decision()
        .trace.rejected.filter((entry) => entry.reason === 'cannot-leave')
        .map((entry) => entry.candidate),
      'the gym is still being offered to a man who cannot leave',
    ).toContain('health/move/routine:the-gym')
  })

  it('leaves an indoor routine alone when he cannot leave', async () => {
    /*
     * The pairing doing its job on two routines he named himself. Press-ups
     * first, the gym second — the most recently named is the one proposed — so
     * when he says he cannot leave, the gym goes and what he can do at home is
     * what is left. That is the difference between a constraint and a veto: it
     * removes what does not fit and leaves everything that does.
     */
    const app = await eveningIn()
    await app.introduce({
      kind: 'routine',
      name: 'press-ups',
      domain: DOMAIN.health,
      minutes: 15,
      requiresLeaving: false,
    })
    await app.introduce({
      kind: 'routine',
      name: 'the gym',
      domain: DOMAIN.health,
      minutes: 60,
      requiresLeaving: true,
    })
    // Both are proposed — the engine offers what he named and the arbiter picks.
    const proposed = app.decision().trace.proposed.map((entry) => entry.id)
    expect(proposed).toContain('health/move/routine:the-gym')
    expect(proposed).toContain('health/move/routine:press-ups')

    await app.act('unable-now')
    await app.sayWhatBlocked('must-stay')
    const rejected = app.decision().trace.rejected
    expect(
      rejected.filter((entry) => entry.reason === 'cannot-leave').map((entry) => entry.candidate),
      'the gym is still being offered to a man who cannot leave',
    ).toContain('health/move/routine:the-gym')
    expect(
      rejected.filter((entry) => entry.candidate.includes('press-ups')),
      'something he can do at home was removed',
    ).toEqual([])
  })
})
