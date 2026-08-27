import { describe, expect, it } from 'vitest'
import { systemClock } from '../../src/domain/time'
import type { ThreadRecord } from '../../src/domain/records'
import { beliefCorrectionRecord } from '../../src/intelligence/corrections'
import { describePremise } from '../../src/intelligence/explain'
import { evidenceForDecision } from '../../src/intelligence/insights'
import { setThreadStateRecord } from '../../src/intelligence/threads'
import { openJourney } from './journey'

/**
 * F41 — the preview-state observations, re-run against the repaired build.
 *
 * The owner-use review recorded three interactions it could not isolate (E22,
 * E32, E34) and classified the finding **provisional**, with its own rule
 * attached: _"Isolated reproduction is required before attributing these
 * anomalies to product memory, correction, or shared preview behavior."_ The
 * adjudication carried that rule forward — some of F41 is plausibly F43 seen
 * from another angle, and D-160's repair is the first build on which the
 * question can be asked cleanly.
 *
 * So each observation is reproduced here as literally as a headless run can,
 * through the same controls, and the result is recorded either way.
 *
 * **What this file may not do is name a cause for an observation that does not
 * reproduce.** That is the review's rule and it is the whole reason F41 is
 * provisional. Where the interaction does not reproduce, the assertion says
 * what the app actually does and stops there.
 */

describe('F41 / E22 — “Not how it went” and what it changes', () => {
  it('does not remove the recommendation, and does not disturb the rest of the screen', async () => {
    /*
     * The observation: _"'Not how it went' immediately removed the
     * recommendation. In the ensuing preview state, Insights and other
     * displayed material changed markedly, including a much smaller set
     * centered on a CCNA goal."_
     *
     * **It does not reproduce.** The correction lands, the same move stays on
     * screen with the same evidence, and nothing else on the situation moves.
     * The history the observation was taken on has no CCNA goal in it at all,
     * and the one that does is a different scenario — which is consistent with
     * what the review itself said it could not rule out, and is why no cause is
     * named here.
     */
    const app = await openJourney('what-worked')
    const before = app.decision()
    const belief = before.explanation?.restsOnBelief
    expect(belief, 'the fixture must reach a move that rests on something learned').toBeDefined()

    const evidenceBefore = evidenceForDecision(before)
    const goalsBefore = before.situation.direction.goals.length

    const written = await app.append([
      beliefCorrectionRecord(belief!, 'reject', 'The owner said this is not right', {
        now: app.now(),
        zone: app.zone,
        recordedAt: systemClock().now(),
      }),
    ])
    expect(written.done).toBe(true)

    const after = app.decision()
    expect(after.kind, 'the app still has something to say').toBe('move')
    expect(after.explanation?.rendered.sentence).toBe(before.explanation?.rendered.sentence)
    expect(evidenceForDecision(after)?.conditions.length).toBe(evidenceBefore?.conditions.length)
    expect(describePremise(after.situation)).toBe(describePremise(before.situation))
    expect(after.situation.direction.goals.length).toBe(goalsBefore)
  })

  it('acts the moment it is tapped, with nothing said about scope and nothing to undo it', async () => {
    /*
     * The half of E22 that **does** survive, and it is a product observation
     * rather than a defect: _"The interaction did not first explain correction
     * scope or show an obvious undo at that moment."_
     *
     * True, and structural: `NowScreen`'s control calls `onCorrect(belief)`
     * directly and the record is appended in the same tick. This is D-165's
     * subject — _a correction states its consequence before it acts_ — and
     * D-165 is routing 84's, so this test records the current behaviour rather
     * than changing it.
     */
    const app = await openJourney('what-worked')
    const belief = app.decision().explanation?.restsOnBelief
    const before = app.records()

    await app.append([
      beliefCorrectionRecord(belief!, 'reject', 'The owner said this is not right', {
        now: app.now(),
        zone: app.zone,
        recordedAt: systemClock().now(),
      }),
    ])

    expect(app.records(), 'one tap, one record, no confirmation between them').toBe(before + 1)
    const rejected = app.decision().situation.learning.rejected
    expect(rejected.has(belief!), 'and the belief is already rejected').toBe(true)
  })
})

describe('F41 / E32 — what a completion asks for afterwards', () => {
  it('asks a named result question on the weak-topic history, and keeps asking for a day', async () => {
    /*
     * The observation: _"Done produced Nothing new for today. No result
     * question appeared immediately or after leaving and returning… On the
     * weak-subnetting history, Done did not ask whether /26 boundaries were now
     * correct."_
     *
     * **The first half does not reproduce and the second is not a defect.** A
     * result question exists, it names its own subject, and it stays available
     * through the following day. What the review is describing in the second
     * half is a *more specific* question than the app asks — a wish, recorded
     * as F11 and F33, and not something routing 83 adds.
     *
     * The "immediately" half is real and is by design: `SOON` opens the window
     * twenty minutes after the completion, because a question about how
     * something went, asked in the second it finishes, has no answer yet.
     */
    const app = await openJourney('subnetting-struggle')
    expect((await app.act('start')).done).toBe(true)
    expect((await app.act('complete')).done).toBe(true)

    expect(app.pendingOutcome(), 'nothing is asked in the same minute').toBeUndefined()

    app.travelMinutes(25)
    const soon = app.pendingOutcome()
    expect(soon?.questions.map((question) => question.prompt)).toEqual([
      'How much did going back over subnetting help?',
    ])

    app.travelMinutes(24 * 60)
    expect(app.pendingOutcome()?.questions.length, 'and it is still there the next evening').toBe(1)
  })

  it('asks for a reading rather than a grade where it can take one', async () => {
    /*
     * And the other shape of the same step, on the near-empty history — which
     * is where the review actually recorded it. A walk declares an observable
     * state dimension, so D-089 says the app reads the state instead of asking
     * the owner to grade the walk. One question either way; a different one.
     */
    const app = await openJourney('the-first-evening')
    await app.answerGuide('ok')
    await app.answerGuide('none')
    await app.act('start')
    await app.act('complete')

    app.travelMinutes(40)
    const pending = app.pendingOutcome()
    expect(pending?.reading, 'a reading, not a judgement').toBe('energy.current')
    expect(pending?.questions, 'and no grade is asked for beside it').toEqual([])
  })
})

describe('F41 / E34 — alternatives, and a course that was stopped', () => {
  it('keeps what the owner just told it after “Something else”', async () => {
    /*
     * The observation: _"Something else returned to 'Nothing to suggest just
     * yet', said today's state was unknown, and asked energy despite a recent
     * Enough answer."_
     *
     * **The state-loss half does not reproduce.** The premise still names what
     * was answered, the guide does not ask energy again, and the reading is
     * still in the situation.
     *
     * What is real is the other half: on a history this thin, asking for
     * something else exhausts the day. That is the same shape as the
     * interruption stop the journey instrument records, and it belongs to the
     * state vocabulary routing 84 and routing 90 design (F10, F11, F13).
     */
    const app = await openJourney('mostly-unknown')
    expect((await app.answerGuide('ok')).done).toBe(true)

    const before = app.decision()
    const premiseBefore = describePremise(before.situation)
    expect(before.kind).toBe('move')

    expect((await app.act('try-another')).done).toBe(true)
    const after = app.decision()

    expect(describePremise(after.situation), 'the premise survives the refusal').toBe(premiseBefore)
    expect(
      app.guide().question?.spec.concept,
      'and the answer just given is not asked for again',
    ).not.toBe('energy.current')

    // The half that is real, stated rather than repaired.
    expect(after.kind).toBe('no-action')
    expect(after.noAction?.headline).toBe('Nothing new for today.')
  })

  it('leaves exactly one entry for a course that was stopped, with one reason on it', async () => {
    /*
     * The observation: _"After stopping a three-session course, Life displayed
     * two identically titled entries, one 'Ran out of time on its own' and one
     * 'Stopped.'"_
     *
     * **It does not reproduce.** Stopping supersedes the running record, so
     * `history.effective` holds one thread and Life lists one entry. Whether
     * the two entries the review saw were two courses, duplicate fixture
     * history or a presentation problem is exactly what it said it could not
     * tell, and nothing here can tell it either.
     */
    const app = await openJourney('study-thread')
    const situation = app.situation()
    const thread = situation.threads[0]
    expect(thread, 'the fixture must have a course running').toBeDefined()

    const previous = situation.view.history.byId(thread!.source)
    expect(previous?.kind).toBe('thread')

    await app.append([
      setThreadStateRecord(thread!, 'abandoned', previous as ThreadRecord, {
        now: app.now(),
        zone: app.zone,
        recordedAt: systemClock().now(),
      }),
    ])

    const after = app.situation().threads
    expect(after.length, 'one course, not two').toBe(1)
    expect(after[0]!.intent).toBe(thread!.intent)
    expect(after[0]!.state).toBe('abandoned')
    expect(after[0]!.live).toBe(false)
    expect(after[0]!.expired, 'and it did not also run out of time').toBe(false)
  })
})
