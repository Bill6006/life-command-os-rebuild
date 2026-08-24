import { describe, expect, it } from 'vitest'
import { createRecordFactory } from '../../src/domain/build'
import { CONCEPT, coreConcepts } from '../../src/domain/concepts'
import { coreDomains } from '../../src/domain/domains'
import { sequentialRecordIds } from '../../src/domain/ids'
import type { CanonicalRecord } from '../../src/domain/records'
import { addLocalDays, localDateTimeAt, type Instant } from '../../src/domain/time'
import { decide } from '../../src/intelligence/engine'
import { answeredToday, nextGuideStep, QUESTIONS_PER_DAY } from '../../src/intelligence/guide'
import { planLifecycle } from '../../src/intelligence/lifecycle'
import { nextDueOutcome } from '../../src/intelligence/outcomes'
import { answerRecord, QUESTIONS } from '../../src/intelligence/questions'
import type { StoreSnapshot } from '../../src/memory/store'
import { buildView, type MemoryView } from '../../src/memory/view'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { loadScenario } from './harness'

/**
 * The guide across an interruption, and the promise it must not break.
 *
 * Section 12 asks for two things this phase puts at risk. The guide "should
 * resume after interruption without restarting", and it "should sometimes ask
 * **zero** questions". A coverage engine is the most likely thing yet built to
 * break the second — DEF-0008 is the worked example of a run of individually
 * justified questions becoming "too many questions", and section 47 fails a
 * phase outright on the owner's honest verdict of it.
 *
 * ## What "resume" turns out to mean here
 *
 * The guide holds no session state, and that is the design rather than an
 * omission. Every answer is an appended record; the next step is recomputed
 * from the whole history at the moment it is asked for. So closing the app and
 * reopening it is not a special case to be handled — it is the ordinary case,
 * and the tests below check it by doing exactly what a reload does: throwing
 * the view away and rebuilding it from the store.
 *
 * That is worth asserting precisely because there is no code to point at. A
 * behaviour nothing implements is a behaviour nothing protects.
 */

const ids = sequentialRecordIds('GRS')

/** What a reload does: forget everything derived and rebuild from the store. */
function reopened(snapshot: StoreSnapshot, now: Instant, zone: string): MemoryView {
  return buildView(snapshot, { now, zone: zone as never })
}

interface Session {
  snapshot: StoreSnapshot
  readonly now: Instant
  readonly zone: string
}

function append(session: Session, records: readonly CanonicalRecord[]): Session {
  return {
    ...session,
    snapshot: { ...session.snapshot, records: [...session.snapshot.records, ...records] },
  }
}

function sessionFor(id: string): Session {
  const scenario = loadScenario(id)
  return { snapshot: scenario.snapshot, now: scenario.scenario.now, zone: scenario.scenario.zone }
}

function step(session: Session) {
  return nextGuideStep(reopened(session.snapshot, session.now, session.zone), {
    now: session.now,
    zone: session.zone as never,
  })
}

/** Answer whatever the guide is currently asking, as the surface would. */
function answerCurrent(session: Session, choice = 0): Session {
  const current = step(session)
  if (current.kind !== 'question') return session
  const option = current.question?.options[choice] ?? current.question?.options[0]
  if (option === undefined || current.question === undefined) return session
  return append(session, [
    answerRecord(
      current.question.spec,
      option,
      {
        now: session.now,
        zone: session.zone as never,
        recordedAt: (session.now + 1000) as Instant,
      },
      ids(),
    ),
  ])
}

/**
 * A finished early night, read the next morning.
 *
 * Optionally with a sleep reading already recorded at a given wall-clock time,
 * which is how the two halves of the swap are told apart: a reading inside the
 * window settles the result, and one before it is about a different night.
 */
function morningAfterAnEarlyNight(readingAt?: string): Session {
  const scenario = loadScenario('running-on-empty')
  const zone = scenario.scenario.zone
  const now = scenario.scenario.now
  const decision = scenario.decision()

  const done = planLifecycle({
    view: scenario.view(),
    situation: decision.situation,
    semantics: decision.explanation!.semantics,
    action: 'complete',
    recordedAt: now,
  })

  const morning = addLocalDays(now, 1, zone)
  const records: CanonicalRecord[] = [...scenario.snapshot.records, ...done.records]

  if (readingAt !== undefined) {
    const [hour, minute] = readingAt.split(':').map(Number)
    const at = (addLocalDays(now, 1, zone) -
      (localDateTimeAt(morning, zone).hour - (hour ?? 0)) * 3_600_000 -
      (localDateTimeAt(morning, zone).minute - (minute ?? 0)) * 60_000) as Instant
    records.push(buildRecord(zone, at, { hours: 8 }))
  }

  return { snapshot: { ...scenario.snapshot, records }, now: morning, zone }
}

function buildRecord(zone: string, at: Instant, value: { hours: number }): CanonicalRecord {
  const build = createRecordFactory({
    zone: zone as never,
    provenance: { source: 'owner', writtenBy: 'guide' },
  })
  return build(
    'observation',
    { occurredAt: at, id: ids(), domains: [coreConcepts.definitionFor(CONCEPT.sleepHours).domain] },
    {
      concept: CONCEPT.sleepHours,
      value: { type: 'number', value: value.hours, unit: 'hours' },
      method: 'self-report',
    },
  )
}

// ---------------------------------------------------------------------------

describe('the guide resumes rather than restarting', () => {
  it('never re-asks something already answered, after the app is closed and reopened', () => {
    for (const scenario of SCENARIOS) {
      let session = sessionFor(scenario.id)
      const asked: string[] = []

      for (let round = 0; round < QUESTIONS_PER_DAY + 2; round += 1) {
        const current = step(session)
        if (current.kind !== 'question') break
        const prompt = current.question?.prompt ?? ''
        expect(asked, `${scenario.id} re-asked "${prompt}"`).not.toContain(prompt)
        asked.push(prompt)
        session = answerCurrent(session)
      }
    }
  })

  it('carries on from where it stopped rather than beginning again', () => {
    // The scenario with the most to ask about, so there is a sequence to
    // interrupt in the first place.
    const first = sessionFor('quiet-fortnight')
    const opening = step(first)
    expect(opening.kind).toBe('question')

    const answered = answerCurrent(first)
    // A reload: nothing in memory survives, and the store is all there is.
    const after = step(answered)

    expect(after.question?.prompt).not.toBe(opening.question?.prompt)
    expect(
      answeredToday(reopened(answered.snapshot, answered.now, answered.zone), {
        now: answered.now,
        zone: answered.zone as never,
      }),
    ).toBe(1)
  })

  it('keeps the day’s count across a reload, so the floor still holds', () => {
    let session = sessionFor('quiet-fortnight')
    for (let round = 0; round < QUESTIONS_PER_DAY + 2; round += 1) session = answerCurrent(session)

    const view = reopened(session.snapshot, session.now, session.zone)
    const count = answeredToday(view, { now: session.now, zone: session.zone as never })
    expect(count).toBeLessThanOrEqual(QUESTIONS_PER_DAY)
    expect(step(session).kind).toBe('settled')
  })

  it('resumes an outcome sequence at the aspect that is still unanswered', () => {
    // The other kind of interruption: two questions about one episode, with the
    // app closed between them. `reset-space` is the move that produces both a
    // result and an effect.
    const scenario = loadScenario('week-pointed-at-home')
    const decision = scenario.decision()
    const zone = scenario.scenario.zone
    const now = scenario.scenario.now

    const done = planLifecycle({
      view: scenario.view(),
      situation: decision.situation,
      semantics: decision.explanation!.semantics,
      action: 'complete',
      recordedAt: now,
    })

    const later = (now + 90 * 60_000) as Instant
    let snapshot: StoreSnapshot = {
      ...scenario.snapshot,
      records: [...scenario.snapshot.records, ...done.records],
    }

    const view = buildView(snapshot, { now: later, zone })
    const pending = nextDueOutcome(
      view,
      { now: later, zone },
      decide(view, { now: later, zone }).situation.entities,
    )
    expect(pending?.questions[0]?.aspect).toBe('result')

    const answer = pending!.questions[0]!.answers[0]!
    snapshot = {
      ...snapshot,
      records: [
        ...snapshot.records,
        // Written the way Now writes it.
        {
          ...done.records[0]!,
          id: ids(),
          kind: 'outcome' as const,
          occurredAt: later,
          recordedAt: later,
          about: pending!.episode.recommendation,
          aspect: 'result' as const,
          observation: answer.observation,
        } as CanonicalRecord,
      ],
    }

    const reloaded = buildView(snapshot, { now: later, zone })
    const next = nextDueOutcome(
      reloaded,
      { now: later, zone },
      decide(reloaded, { now: later, zone }).situation.entities,
    )
    expect(next?.questions[0]?.aspect, 'it went back to the start').toBe('effect')
  })
})

describe('the guide can still ask nothing at all', () => {
  it('asks zero questions on a history that has answered enough', () => {
    // Section 12 requires this outright, and no questionnaire can do it. The
    // coverage engine is present and running on this scenario; what it must not
    // do is find something to say.
    const settled = sessionFor('settled-evening')
    expect(step(settled).kind).toBe('settled')
  })

  it('asks zero questions on the evening built around a quiet area', () => {
    // The sharpest case: a domain seven weeks silent, and still nothing worth a
    // tap. Section 8 puts an action above a question and this is what that
    // ordering costs the owner — nothing.
    expect(step(sessionFor('career-gone-quiet')).kind).toBe('settled')
  })

  it('never asks more than the day’s floor allows, on any history', () => {
    for (const scenario of SCENARIOS) {
      let session = sessionFor(scenario.id)
      let asked = 0
      for (let round = 0; round < 8; round += 1) {
        if (step(session).kind !== 'question') break
        asked += 1
        session = answerCurrent(session)
      }
      expect(asked, `${scenario.id} asked ${asked}`).toBeLessThanOrEqual(QUESTIONS_PER_DAY)
    }
  })

  it('asks about fewer things than there are life areas, and always will', () => {
    /*
     * The structural half of "no fixed ask-every-domain questionnaire".
     *
     * The catalogue is shorter than the domain registry and does not cover it:
     * there is no question about faith, about money, about the private domain
     * or about the owner's direction, and section 4.5 is why — the app does not
     * collect data because a field exists. A questionnaire would be the
     * opposite shape, and would show up here first.
     */
    const domains = coreDomains.all().length
    expect(QUESTIONS.length).toBeLessThan(domains)

    const covered = new Set(
      QUESTIONS.map((question) => coreConcepts.definitionFor(question.concept).domain),
    )
    expect(covered.size).toBeLessThan(domains)
    expect(covered.has(coreDomains.all().find((entry) => entry.id === 'faith')?.id as never)).toBe(
      false,
    )
  })

  it('lets coverage change which question is asked and never whether one is', () => {
    /*
     * The behavioural half, and the rule the coverage engine could most easily
     * break. Every question the guide asks on any history is one the swing
     * measurement already judged worth a tap — or one a due result is waiting
     * on, which replaces a card rather than adding one.
     *
     * So: whatever the guide asks, the decision would have gone somewhere else
     * under at least one of its answers. Coverage sits below that test, as a
     * tiebreak, and cannot get underneath it.
     */
    for (const scenario of SCENARIOS) {
      let session = sessionFor(scenario.id)
      for (let round = 0; round < QUESTIONS_PER_DAY; round += 1) {
        const current = step(session)
        if (current.kind !== 'question') break
        const awaited = current.because.includes('a result is waiting on')
        if (!awaited) {
          const outcomes = new Set(current.question?.outcomes.map((one) => one.wouldChoose) ?? [])
          expect(
            outcomes.size,
            `${scenario.id}: "${current.question?.prompt}" leads only one place`,
          ).toBeGreaterThan(1)
        }
        session = answerCurrent(session)
      }
    }
  })

  it('keeps the awaited reading under the day’s floor like everything else', () => {
    /*
     * The new reason to ask is still a reason to ask, and the floor is what
     * section 47 fails a phase on. Three answers already given today and a
     * result waiting on a fourth: the app waits until tomorrow, and the window
     * closing with nothing in it is section 20's "outcome unknown", which is a
     * real and acceptable state.
     */
    const session = morningAfterAnEarlyNight()
    expect(step(session).kind).toBe('question')

    const busy = append(
      session,
      QUESTIONS.slice(0, QUESTIONS_PER_DAY).map((question, index) =>
        answerRecord(
          question,
          question.options(step(session).decision.situation)[0]!,
          {
            now: session.now,
            zone: session.zone as never,
            recordedAt: (session.now + index) as Instant,
          },
          ids(),
        ),
      ),
    )

    expect(
      answeredToday(reopened(busy.snapshot, busy.now, busy.zone), {
        now: busy.now,
        zone: busy.zone as never,
      }),
    ).toBe(QUESTIONS_PER_DAY)
    expect(step(busy).kind).toBe('settled')
    expect(step(busy).because).toContain('that is enough')
  })

  it('asks for the reading itself when the guide will not ask for it', () => {
    /*
     * **Rewritten under D-089, and the old expectation is worth recording.**
     *
     * This test was written for D-069's swap: a sleep reading given at 04:30 is
     * about the night before the window opens, so it cannot settle this result,
     * and it does leave the concept currently known — so the guide will not ask
     * again. Holding the effect question back on top of that meant no reading,
     * no question, and a window closing with nothing collected. The fix at the
     * time was to let the effect question stand, and this asserted that.
     *
     * D-089 removes that fallback, because the effect question is the one the
     * app may no longer ask: "how much did winding down do for your sleep?"
     * asks the owner for the causal relationship the system exists to work out.
     * The window still must not close empty, so the honest replacement is the
     * one this now asserts — the app asks for **the reading**, which is a fact
     * only he holds and which the app can then compare for itself.
     *
     * Same gap, same window, one fewer thing asked of him.
     */
    const session = morningAfterAnEarlyNight('04:30')
    const view = reopened(session.snapshot, session.now, session.zone)
    const moment = { now: session.now, zone: session.zone as never }

    expect(step(session).question?.spec.concept, 'it should not ask for what it has').not.toBe(
      CONCEPT.sleepHours,
    )
    const due = nextDueOutcome(view, moment, decide(view, moment).situation.entities)
    expect(due, 'the window must not close with nothing asked').toBeDefined()
    expect(due?.reading, 'it should ask for the reading').toBe(CONCEPT.sleepHours)
    expect(
      due?.questions.some((question) => question.aspect === 'effect'),
      'and never for the owner’s own grade of what the move did',
    ).toBe(false)
  })

  it('never asks for a reading a result is waiting on more than once', () => {
    // The one question this phase added a second reason for. It must not become
    // a loop: once the reading is in, the reason is gone.
    const scenario = loadScenario('running-on-empty')
    const decision = scenario.decision()
    const zone = scenario.scenario.zone
    const now = scenario.scenario.now

    const done = planLifecycle({
      view: scenario.view(),
      situation: decision.situation,
      semantics: decision.explanation!.semantics,
      action: 'complete',
      recordedAt: now,
    })

    const morning = addLocalDays(now, 1, zone)
    let session: Session = {
      snapshot: { ...scenario.snapshot, records: [...scenario.snapshot.records, ...done.records] },
      now: morning,
      zone,
    }

    const first = step(session)
    expect(first.kind).toBe('question')
    expect(first.question?.spec.concept).toBe(CONCEPT.sleepHours)
    expect(first.because).toContain('a result is waiting on')

    session = answerCurrent(session)
    const second = step(session)
    expect(second.because).not.toContain('a result is waiting on')
  })
})

describe('nothing is asked twice in two shapes', () => {
  it('never puts a guide question and an outcome question about the same fact on screen together', () => {
    /*
     * The thing the held-back effect question exists to prevent.
     *
     * On the morning after an early night the app could put "how much sleep did
     * you actually get?" and "how much did skipping subnetting do for your
     * rest?" on the same screen, which is one fact asked twice — the complaint
     * that started this whole line of work.
     */
    const scenario = loadScenario('running-on-empty')
    const decision = scenario.decision()
    const zone = scenario.scenario.zone
    const now = scenario.scenario.now

    const done = planLifecycle({
      view: scenario.view(),
      situation: decision.situation,
      semantics: decision.explanation!.semantics,
      action: 'complete',
      recordedAt: now,
    })

    const morning = addLocalDays(now, 1, zone)
    const view = buildView(
      { ...scenario.snapshot, records: [...scenario.snapshot.records, ...done.records] },
      { now: morning, zone },
    )

    const guide = nextGuideStep(view, { now: morning, zone })
    const due = nextDueOutcome(
      view,
      { now: morning, zone },
      decide(view, { now: morning, zone }).situation.entities,
    )

    expect(guide.question?.spec.concept).toBe(CONCEPT.sleepHours)
    expect(due, 'the effect question should be held back while the reading is').toBeUndefined()
  })
})
