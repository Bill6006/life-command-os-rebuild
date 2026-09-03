import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { SHOWN_ENOUGH_TIMES_TODAY } from '../../src/intelligence/constraints'
import { openJourney } from './journey'

/**
 * §6.5's ordinary-owner contract, walked through the surfaces.
 *
 * ## Why a builder runs this at all
 *
 * The contract is written for **independent QA**, and independent QA may not run
 * for this phase. That is not a reason to leave the five items unwalked: what a
 * builder can do is drive the same gestures through the same builders the
 * screens call, which is what `journey.ts` is for, and say plainly which parts
 * only a person on a phone can settle.
 *
 * **This does not pass the phase.** D-077 is unchanged and nothing here approves
 * anything. What it does is make the difference between *"the mechanism is
 * tested"* and *"the owner's own sequence produces the sentence"* smaller by
 * one step.
 *
 * ## The five items, and where each is proved
 *
 * | contract item                                    | where |
 * | ------------------------------------------------ | ----- |
 * | three poor nights differ from one, from his record | `recovery-run.test.ts`, and here |
 * | a recurring blocker stops the move being offered   | here, end to end |
 * | a milestone that stops moving is said to be        | `review.test.ts` |
 * | the same move is not offered four times in a day   | here, end to end |
 * | the confidence wording differs at two and at twelve | `cue-and-bands.test.ts` |
 *
 * Two of the five are walked here because they are the two that need a **run of
 * gestures through the surfaces**: a blocker recorded through the question path
 * and then read by the filter, and four separate visits to one day. The other
 * three need histories the shipped library does not hold, and are proved on
 * histories built for them.
 */

// ---------------------------------------------------------------------------
// Item 2 — a recurring blocker stops the move being offered, and says so
// ---------------------------------------------------------------------------

describe('he says what is in the way, and the app stops offering it — C21', () => {
  it('offers it, records why he could not, and does not offer it again', async () => {
    /*
     * The contract's own words: *"record a recurring blocker on the same move
     * three times and confirm the app stops offering it and says what it
     * learned."*
     *
     * Every gesture here is the one a screen makes: `act('unable-now')` is Now's
     * **Can't right now**, `sayWhatBlocked` is the question that follows it, and
     * the constraint it writes is read by `applyConstraints` — which is the
     * whole of C21's enforcement half arriving through the front door rather
     * than through a fixture.
     */
    const app = await openJourney('rested-and-behind')

    const offered = app.decision()
    const target = offered.explanation?.semantics.target
    expect(target, 'nothing was offered to be blocked').toBeDefined()
    const blocked = target!.object.id

    expect((await app.act('unable-now')).done, 'the move could not be refused').toBe(true)
    const said = await app.sayWhatBlocked('no-kit')
    expect(said.done, said.note).toBe(true)

    /*
     * And the same move is gone — not merely marked down. A rejection the owner
     * can see is the difference between a candidate that was removed and one
     * nobody thought of (section 35), so the trace is read as well as the
     * screen.
     */
    const after = app.decision()
    expect(
      after.evaluation?.candidate.semantics.target.object.id,
      'the app offered the thing he had just said he could not do',
    ).not.toBe(blocked)

    const rejection = after.trace.rejected.find((entry) => entry.candidate.includes(blocked))
    expect(rejection?.reason, 'it went for some other reason').toBe('blocked-before')
    expect(rejection?.explanation, 'the app did not say what it learned').toContain(
      'needs something I have not got',
    )
  })

  it('goes on saying it the next day, because he has not taken it back', async () => {
    /*
     * The half that makes it a **standing** fact rather than an evening's. A
     * blocker about the world does not expire at midnight — only `must-stay
     * tonight` carries a bound, and only because he chose one.
     */
    const app = await openJourney('rested-and-behind')
    const blocked = app.decision().explanation?.semantics.target.object.id
    expect(blocked, 'nothing was offered to be blocked').toBeDefined()
    await app.act('unable-now')
    await app.sayWhatBlocked('no-kit')

    app.travelDays(3)
    /*
     * Read off the **trace** rather than off what is proposed, because three days
     * on there may be nothing to propose — the picture has gone stale and the app
     * says so instead of guessing (G-009). What has to survive is the removal,
     * and a rejection is where a removal is visible.
     */
    const later = app.decision()
    expect(
      later.trace.rejected.some(
        (entry) => entry.candidate.includes(blocked ?? '') && entry.reason === 'blocked-before',
      ),
      'three days later the app had forgotten what he told it',
    ).toBe(true)
  })

  it('says what it learned without promising what it will do', async () => {
    /*
     * D-164's extension, on the screen: the note may now say the move stays off,
     * because it does — and it still may not promise that something better will
     * be offered instead, because nothing makes that true.
     */
    const app = await openJourney('rested-and-behind')
    await app.act('unable-now')
    const question = app.blockerFor()
    expect(question?.ask, 'no question was put at all').toBe(true)
    if (question?.ask !== true) return
    expect(question.note).toContain('keeps this move off until you take it back')
    expect(question.note, 'the app promised a replacement').not.toMatch(
      /offer something|fits next time|instead|better/i,
    )
  })

  it('does not also stop offering the move that says not to do it — DEF-0168', async () => {
    /*
     * Found by walking this contract, which is the reason to walk it.
     *
     * The blocker is scoped to the **object** and not to the move, so saying *"I
     * haven't got what I need"* about reviewing subnetting removed every move on
     * subnetting — including *"take tonight as recovery — no subnetting
     * session"*, a sleep move whose object is the career topic. The app was
     * refusing to let him rest on the grounds that he could not study.
     *
     * Proposed and not rejected is the assertion, rather than merely absent from
     * the rejections: a move nobody generated is also absent, and that would pass
     * a test while proving nothing (section 35's whole point).
     */
    const app = await openJourney('rested-and-behind')
    await app.act('unable-now')
    await app.sayWhatBlocked('no-kit')

    /*
     * Tuesday's answer, and then Friday: far enough on that resting is worth
     * proposing at all, and one answer to the question the app puts on the way
     * in. The blocker has not moved — it is standing, which is the test above,
     * and the three study moves are still off.
     */
    app.travelDays(3)
    await app.answerGuide('empty')

    const after = app.decision()
    const resting = after.trace.proposed.find((move) => move.id.startsWith('sleep/recover/'))
    expect(resting, 'the resting move was never generated, so this proves nothing').toBeDefined()
    expect(
      after.trace.rejected.some(
        (entry) => entry.candidate === resting?.id && entry.reason === 'blocked-before',
      ),
      'not being able to study stopped him being told to rest instead',
    ).toBe(false)
    expect(
      after.trace.rejected.filter((entry) => entry.reason === 'blocked-before').length,
      'the study moves he actually answered about came back',
    ).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Item 4 — four hours of one day, and not four offers
// ---------------------------------------------------------------------------

describe('the same move is not put in front of him four times in a day — AUD-0025', () => {
  it('stops offering it after the second time it has been left', async () => {
    /*
     * The audit's own reproduction: the identical kitchen sentence at 06:30,
     * 10:00, 14:00 and 19:00 of one day, on a history where nothing was pressed.
     *
     * Four **visits**, each advancing the clock, because the ledger counts a
     * move once per distinct moment — which is exactly why the app has to be
     * looked at rather than read.
     */
    const app = await openJourney('the-first-evening')
    await app.answerGuide('empty')

    const seen: (string | undefined)[] = []
    for (let visit = 0; visit < 4; visit += 1) {
      seen.push(app.visit().evaluation?.candidate.id)
      app.travelMinutes(200)
    }

    const first = seen[0]
    expect(first, 'nothing was ever offered').toBeDefined()
    const repeats = seen.filter((id) => id === first).length
    expect(
      repeats,
      `the same move was offered ${repeats} times in one day: ${seen.join(', ')}`,
    ).toBeLessThanOrEqual(SHOWN_ENOUGH_TIMES_TODAY)
  })

  it('counts a visit once however many times the screen is drawn', async () => {
    // The rule the count rests on: `shownToday` is about separate **moments**,
    // not about renders. A screen that repainted five times at one instant has
    // put the move in front of him once.
    const app = await openJourney('the-first-evening')
    await app.answerGuide('empty')
    for (let repaint = 0; repaint < 5; repaint += 1) app.visit()

    const counted = app.shown()
    expect(counted.length, 'nothing was counted at all').toBeGreaterThan(0)
    for (const entry of counted) {
      expect(entry.count, 'a repaint was counted as a separate showing').toBe(1)
    }
  })

  it('starts again the next day, because it is a rule about today', async () => {
    /*
     * The ledger holds one owner-local day and nothing else. A move he ignored
     * yesterday is not a move he has finished with — the repetition rule is
     * about the app saying the same thing four times before lunch, not about
     * retiring a suggestion.
     */
    const app = await openJourney('the-first-evening')
    await app.answerGuide('empty')
    app.visit()
    app.travelMinutes(200)
    app.visit()
    const yesterday = app.shown().map((entry) => entry.move)
    expect(yesterday.length, 'nothing was shown to be forgotten').toBeGreaterThan(0)

    app.travelDays(1)
    /*
     * The ledger is empty before he has been shown anything today, and it is
     * empty because the store drops other days on read rather than because a
     * sweep ran — so a phone left closed overnight starts the same way.
     */
    expect(app.shown(), 'yesterday came with him into today').toEqual([])

    /*
     * He is asked again, because a day's facts do not survive it: what is being
     * proved is that the **ledger** is not what withholds the move, so the
     * ordinary morning has to be walked before looking.
     */
    let asked = 0
    while (app.guide().kind === 'question' && asked < 4) {
      await app.answerGuide('empty')
      asked += 1
    }

    const today = app.visit().evaluation?.candidate.id
    expect(today, 'nothing at all was offered the next day').toBeDefined()
    expect(
      yesterday,
      `yesterday retired the move: ${today ?? 'nothing'} was not offered again`,
    ).toContain(today)
    expect(
      app.shown().map((entry) => entry.count),
      'today started part-used',
    ).toEqual([1])
  })
})

// ---------------------------------------------------------------------------
// Item 1 — three poor nights, from his record
// ---------------------------------------------------------------------------

describe('three poor nights differ from one, and the app says so from his record', () => {
  it('reads a run out of the shortfall, and names what it counted', async () => {
    /*
     * The contract asks that the guidance differ **and that the app says so from
     * his record rather than from a rule**. Both halves are read here: the span
     * comes from the hours he reported, and the sentence names them.
     */
    const one = await openJourney('the-first-evening')
    await one.answerGuide('empty')
    await one.correctFact(CONCEPT.sleepHours, { type: 'number', value: 7, unit: 'hours' })
    expect(
      one.situation().capacity.recoveryNights,
      'one ordinary night implied a run',
    ).toBeUndefined()

    const several = await openJourney('the-first-evening')
    await several.answerGuide('empty')
    await several.correctFact(CONCEPT.sleepHours, { type: 'number', value: 4, unit: 'hours' })

    expect(several.situation().capacity.recoveryNights, 'a real shortfall implied no run').toBe(2)
    const reason = several.decision().explanation?.rendered.reason ?? ''
    expect(reason, 'the app did not say how far down he is').toMatch(/\d+ hours down/)
    expect(reason).toContain("more than one night's worth")
    // From his record, not from a rule: no study is cited and no general claim
    // about people is made.
    expect(reason, 'the app cited research at the owner').not.toMatch(
      /research|study|people|usually|typically|on average/i,
    )
  })
})
