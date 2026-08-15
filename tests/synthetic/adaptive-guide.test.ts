import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { decide } from '../../src/intelligence/engine'
import { answeredToday, nextGuideStep, QUESTIONS_PER_DAY } from '../../src/intelligence/guide'
import { answerRecord, questionFor } from '../../src/intelligence/questions'
import { DOMAIN } from '../../src/domain/domains'
import { entityRef } from '../../src/domain/entities'
import { instant, type Instant, type TimeZoneId } from '../../src/domain/time'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { createKit } from '../../src/synthetic/kit'
import type { StoreSnapshot } from '../../src/memory/store'
import { buildView } from '../../src/memory/view'
import { SCENARIOS, scenarioById } from '../../src/synthetic/scenarios'

/**
 * The adaptive guide (canonical plan section 12).
 *
 * > open the guide; show one question; record the answer; recompute
 * > immediately; determine whether another answer could materially change the
 * > recommendation; ask another question only if needed; stop when enough is
 * > known.
 *
 * Two of those steps are the ones that separate this from a questionnaire with
 * better manners, and they are what this file is about: recomputing between
 * questions, and stopping. A guide that always asks its list is not adaptive
 * even if the list is short, and a guide that asks nothing is not a guide.
 */

function open(id: string) {
  const scenario = scenarioById(id)
  if (scenario === undefined) throw new Error(`no scenario "${id}"`)
  const loaded = snapshotFromWire(scenario.build())
  return { scenario, snapshot: loaded.snapshot }
}

function moment(scenario: { now: Instant; zone: TimeZoneId }) {
  return { now: scenario.now, zone: scenario.zone }
}

function countGuideAnswers(snapshot: StoreSnapshot): number {
  return snapshot.records.filter((record) => record.provenance.writtenBy === 'guide').length
}

function stepOn(snapshot: StoreSnapshot, at: ReturnType<typeof moment>) {
  return nextGuideStep(buildView(snapshot, at), at)
}

/** Answer whatever the guide asks, and hand back the history with it in. */
function answer(
  snapshot: StoreSnapshot,
  at: ReturnType<typeof moment>,
  choose: (labels: readonly string[]) => number = () => 0,
): { readonly snapshot: StoreSnapshot; readonly asked: string } {
  const step = stepOn(snapshot, at)
  if (step.kind !== 'question' || step.question === undefined) {
    throw new Error('the guide had nothing to ask')
  }
  const index = choose(step.question.options.map((option) => option.label))
  const option = step.question.options[index]
  if (option === undefined) throw new Error('no such option')

  // Answers are about the same moment and written down a minute apart, which
  // is what a person tapping through actually produces.
  const written = instant(at.now + (countGuideAnswers(snapshot) + 1) * 60_000)
  const record = answerRecord(step.question.spec, option, { ...at, recordedAt: written })
  return {
    snapshot: { ...snapshot, records: [...snapshot.records, record] },
    asked: step.question.prompt,
  }
}

describe('the guide asks when an answer would change something', () => {
  const { scenario, snapshot } = open('quiet-fortnight')
  const at = moment(scenario)

  it('asks one question, not a list of them', () => {
    const step = stepOn(snapshot, at)
    expect(step.kind).toBe('question')
    expect(step.question?.prompt.length ?? 0).toBeGreaterThan(0)
  })

  it('can say where each answer would land, because it has been there', () => {
    const step = stepOn(snapshot, at)
    const outcomes = step.question?.outcomes ?? []
    expect(outcomes.length).toBeGreaterThan(1)
    // Measured, not asserted: if every answer led to the same place, this
    // question would not have been asked at all.
    expect(new Set(outcomes.map((outcome) => outcome.wouldChoose)).size).toBeGreaterThan(1)
  })

  it('recomputes between questions rather than collecting answers first', () => {
    const before = decide(buildView(snapshot, at), at)
    const { snapshot: after } = answer(snapshot, at)
    const later = decide(buildView(after, at), at)

    // Section 60: "guide answers must land in the state the decision engine
    // reads". They land as canonical records, through the fact layer, like
    // everything else — there is no path from the guide to the engine that
    // goes around the memory.
    expect(after.records.length).toBe(snapshot.records.length + 1)
    expect(later.evaluation?.candidate.id ?? later.noAction?.reason).not.toBe(
      before.evaluation?.candidate.id ?? before.noAction?.reason,
    )
  })

  it('stops once nothing further would change the answer', () => {
    let current = snapshot
    const asked: string[] = []

    for (let round = 0; round < 8; round += 1) {
      const step = stepOn(current, at)
      if (step.kind === 'settled') break
      const result = answer(current, at)
      asked.push(result.asked)
      current = result.snapshot
    }

    const final = stepOn(current, at)
    expect(final.kind).toBe('settled')
    expect(asked.length).toBeGreaterThan(0)
    expect(asked.length).toBeLessThanOrEqual(QUESTIONS_PER_DAY)
    // Never the same question twice — an answered concept is no longer worth
    // asking about, which the fact layer decides rather than the guide.
    expect(new Set(asked).size).toBe(asked.length)
  })

  it('never says nothing would change the answer while the trace says otherwise', () => {
    /*
     * The inspector was reporting four questions as changing the answer and,
     * directly beneath, giving "none of them would change the answer" as the
     * reason for stopping — both from the same run. Two different reasons for
     * stopping had been sharing one sentence.
     */
    for (const scenario of SCENARIOS) {
      const loaded = snapshotFromWire(scenario.build())
      const at = moment(scenario)
      const view = buildView(loaded.snapshot, at)
      const step = nextGuideStep(view, at)
      if (step.kind !== 'settled') continue

      const movable = decide(view, at, { probe: true }).trace.wouldChange.filter(
        (swing) => swing.changesTheAnswer,
      ).length
      if (movable === 0) continue

      expect(step.because, `${scenario.id}: ${movable} would change it`).not.toContain(
        'none of them would change the answer',
      )
    }
  })

  it('gives a reason for stopping that is not just “done”', () => {
    let current = snapshot
    for (let round = 0; round < 8; round += 1) {
      const step = stepOn(current, at)
      if (step.kind === 'settled') {
        expect(step.because.length).toBeGreaterThan(10)
        return
      }
      current = answer(current, at).snapshot
    }
    throw new Error('the guide never settled')
  })
})

describe('the guide asks nothing when it already knows enough', () => {
  it('opens straight onto the recommendation for a full history', () => {
    // Section 12: "A guide should sometimes ask zero questions if the engine
    // already has enough evidence." This history has three nights of sleep, an
    // energy reading, a time budget, a direction and a durable custody
    // arrangement — there is nothing left that would move the answer.
    const { scenario, snapshot } = open('week-pointed-at-home')
    const at = moment(scenario)
    const step = stepOn(snapshot, at)

    expect(step.kind).toBe('settled')
    expect(step.question).toBeUndefined()
    expect(step.decision.kind).toBe('move')
  })

  it('does not ask about something a durable arrangement already answers', () => {
    // G-002, reached from the other direction: the guide's question list
    // contains "is she with you tonight", and this history means it never
    // comes up.
    const { scenario, snapshot } = open('durable-custody')
    const at = moment(scenario)
    const view = buildView(snapshot, at)

    expect(view.facts.get(CONCEPT.childPresent)?.worthAsking).toBe(false)

    let current = snapshot
    const prompts: string[] = []
    for (let round = 0; round < 6; round += 1) {
      const step = stepOn(current, at)
      if (step.kind === 'settled') break
      const result = answer(current, at)
      prompts.push(result.asked)
      current = result.snapshot
    }

    for (const prompt of prompts) expect(prompt).not.toContain('Adaya')
  })
})

describe('the guide has a floor under the owner’s patience', () => {
  it('stops after a day’s worth of questions however much is unknown', () => {
    const { scenario, snapshot } = open('across-timezones')
    const at = moment(scenario)

    let current = snapshot
    for (let round = 0; round < QUESTIONS_PER_DAY + 3; round += 1) {
      const step = stepOn(current, at)
      if (step.kind === 'settled') break
      current = answer(current, at).snapshot
    }

    expect(answeredToday(buildView(current, at), at)).toBeLessThanOrEqual(QUESTIONS_PER_DAY)
    expect(stepOn(current, at).kind).toBe('settled')
  })

  it('counts only what the guide itself wrote down', () => {
    const { scenario, snapshot } = open('quiet-fortnight')
    const at = moment(scenario)
    // A fortnight of self-reported sleep, none of it from the guide.
    expect(answeredToday(buildView(snapshot, at), at)).toBe(0)
  })
})

describe('it never asks for something it already knows — DEF-0005', () => {
  /*
   * The class the owner's phone test found.
   *
   * What they saw was Now stating a number of minutes while the guide asked how
   * much time they had. The number turned out to be the move's own length under
   * a row labelled "Time", so the app was not in fact asking twice — but from
   * the outside there is no difference between a screen that contradicts itself
   * and one that has forgotten what it was told, and the owner is right that
   * neither should be possible.
   *
   * So this holds the whole class rather than the row: whatever the guide is
   * asking about must be genuinely unknown, and nothing visible on Now may
   * answer the question being asked underneath it.
   */
  for (const scenario of SCENARIOS) {
    it(`never asks about something already known — ${scenario.id}`, () => {
      const loaded = snapshotFromWire(scenario.build())
      const at = moment(scenario)
      let current: StoreSnapshot = loaded.snapshot

      for (let round = 0; round < 6; round += 1) {
        const view = buildView(current, at)
        const step = nextGuideStep(view, at)
        if (step.kind === 'settled' || step.question === undefined) break

        const asked = step.question.spec.concept
        const known = view.facts.knowledgeFor(asked)
        expect(known.state, `${scenario.id} asked about ${asked}`).not.toBe('explicit')
        expect(known.state, `${scenario.id} asked about ${asked}`).not.toBe('inferred')

        current = answer(current, at).snapshot
      }
    })
  }

  it('shows no length of time on Now while asking how much time there is', () => {
    // The specific shape of it: a "Time" row carrying the move's own duration,
    // which reads as the answer to the question below it. The duration is in
    // the sentence where it belongs, so the row is gone.
    for (const scenario of SCENARIOS) {
      const loaded = snapshotFromWire(scenario.build())
      const at = moment(scenario)
      const view = buildView(loaded.snapshot, at)
      const step = nextGuideStep(view, at)
      if (step.kind !== 'question' || step.question === undefined) continue
      if (step.question.spec.concept !== CONCEPT.usableTimeTonight) continue

      const decision = decide(view, at)
      const shown = [
        decision.explanation?.premise,
        decision.explanation?.limiter,
        decision.explanation?.insteadBecause,
      ]
        .filter((line): line is string => line !== undefined)
        .join(' ')

      expect(shown, `${scenario.id} states a duration while asking for one`).not.toMatch(
        /\d+\s*minutes/,
      )
    }
  })
})

describe('it stops when asking stops helping — DEF-0008', () => {
  it('asks at most two questions on any scenario in the library', () => {
    // Section 47 fails the phase on "too many questions", and a run of
    // individually justified ones is still a run of questions.
    for (const scenario of SCENARIOS) {
      const loaded = snapshotFromWire(scenario.build())
      const at = moment(scenario)
      let current: StoreSnapshot = loaded.snapshot
      let asked = 0

      for (let round = 0; round < 8; round += 1) {
        const step = stepOn(current, at)
        if (step.kind === 'settled') break
        current = answer(current, at).snapshot
        asked += 1
      }

      expect(asked, `${scenario.id} asked ${asked} questions`).toBeLessThanOrEqual(2)
    }
  })

  it('stops once an answer changes nothing', () => {
    /*
     * The guide asks its best question first, so an answer that moves nothing
     * is evidence about the questions behind it too — they were ranked lower.
     * Carrying on regardless is exactly how the owner ended up being asked four
     * times while the recommendation sat still.
     */
    const { scenario, snapshot } = open('subnetting-struggle')
    const at = moment(scenario)

    // "The evening is clear" — an answer that leaves the move exactly where it
    // was. A shorter evening would genuinely change it, which is why the
    // question was worth asking in the first place.
    const before = decide(buildView(snapshot, at), at)
    const answered = answer(snapshot, at, (labels) => labels.length - 1).snapshot
    const after = decide(buildView(answered, at), at)

    expect(after.evaluation?.candidate.id).toBe(before.evaluation?.candidate.id)
    const next = stepOn(answered, at)
    expect(next.kind).toBe('settled')
    expect(next.because).toContain('did not move it')
  })

  it('keeps going while the answers are still moving it', () => {
    const { scenario, snapshot } = open('quiet-fortnight')
    const at = moment(scenario)

    const before = decide(buildView(snapshot, at), at)
    const answered = answer(snapshot, at, (labels) => labels.length - 1).snapshot
    const after = decide(buildView(answered, at), at)

    expect(after.kind).not.toBe(before.kind)
    expect(stepOn(answered, at).kind).toBe('question')
  })
})

/**
 * A history from before the app was told the arrangement.
 *
 * Built here rather than added to the scenario library on purpose. The rule
 * under test needs a history where the child question is genuinely open, and
 * the only way to get that is to leave out the durable custody context — which
 * is fine as a moment in time, since there is one before the owner has told the
 * app anything, and wrong as something to hand them on a phone. `gone-quiet`
 * was doing this job and reading, to the owner, as though the app had forgotten
 * a settled full-custody arrangement. It has the arrangement now; this does
 * not, and nobody is shown it.
 */
function beforeTheArrangementIsKnown() {
  const kit = createKit('TB', 'America/Denver', '2026-03-01T12:00:00Z')
  const adaya = entityRef('person', 'Adaya')
  const now = kit.local('2026-04-18', '16:30')

  const child = kit.entity({
    kind: 'person',
    label: 'Adaya',
    domain: DOMAIN.fatherhood,
    privacy: 'child-family-sensitive',
  })

  const nights = [16, 17, 18].map((day) =>
    kit.record(
      'observation',
      { occurredAt: kit.local(`2026-03-${day}`, '07:00'), domains: [DOMAIN.sleep] },
      {
        concept: CONCEPT.sleepHours,
        value: { type: 'number', value: 7, unit: 'hours' },
        method: 'self-report',
      },
    ),
  )

  const evening = kit.record(
    'relationship-event',
    {
      occurredAt: kit.local('2026-03-20', '19:30'),
      domains: [DOMAIN.fatherhood],
      entities: [adaya],
    },
    { withEntity: adaya, nature: 'Made pancakes', quality: 'positive' },
  )

  const loaded = snapshotFromWire(
    kit.document({ entities: [child], records: [...nights, evening], exportedAt: now }),
  )
  return { snapshot: loaded.snapshot, at: { now, zone: kit.zone } }
}

describe('a two-option question can still be asked — DEF-0009', () => {
  /*
   * The defect the repair for DEF-0008 introduced.
   *
   * Requiring two answers to lead somewhere else made every binary question
   * unaskable, because one of a binary question's two answers is almost always
   * the situation the engine is already standing in. "Is she with you tonight?"
   * sat at 1-of-2 in every scenario in the library and was never asked — while
   * answering yes turns a solo walk into an afternoon with his daughter. The
   * bar is now a share rather than a count, and half of two is one.
   */
  it('asks about the child when the answer would change the move', () => {
    const { snapshot, at } = beforeTheArrangementIsKnown()

    // One answer to get past "nothing to suggest", then the binary question.
    const withEnergy = answer(snapshot, at, (labels) => labels.length - 2).snapshot
    const step = stepOn(withEnergy, at)

    expect(step.kind).toBe('question')
    expect(step.question?.prompt).toContain('Adaya')
  })

  it('turns the walk into time with her when the answer is yes', () => {
    const { snapshot, at } = beforeTheArrangementIsKnown()

    const withEnergy = answer(snapshot, at, (labels) => labels.length - 2).snapshot
    const solo = decide(buildView(withEnergy, at), at)
    expect(solo.evaluation?.candidate.semantics.target.verb).toBe('move')

    const withChild = answer(withEnergy, at, () => 0).snapshot
    const together = decide(buildView(withChild, at), at)

    expect(together.evaluation?.candidate.semantics.target.verb).toBe('time-with')
    expect(together.explanation?.rendered.sentence).toContain('Adaya')
    // And it says what it displaced.
    expect(together.explanation?.instead).toContain('walk')
  })

  it('still refuses a question only one answer in four would move', () => {
    // The half rule has to keep doing DEF-0008's job. Sleep in this history
    // moves the answer on one option of four; it is not asked.
    const { scenario, snapshot } = open('durable-custody')
    const at = moment(scenario)
    expect(stepOn(snapshot, at).kind).toBe('settled')
  })
})

describe('the guide can tell which answer was the last one — DEF-0010', () => {
  /*
   * Every answer in a session is about the same moment, so `occurredAt` cannot
   * separate them, and canonical order then falls through to the record id —
   * which is opaque by design. "The answer you gave last" was therefore
   * whichever id happened to sort last, and the rule that stops asking once an
   * answer changes nothing was removing an arbitrary one.
   */
  it('writes each answer down at a distinct moment', () => {
    const { scenario, snapshot } = open('quiet-fortnight')
    const at = moment(scenario)

    // "Enough" rather than "Running on empty": the latter settles the screen in
    // one answer, and this needs two of them to compare.
    const one = answer(snapshot, at, (labels) => labels.length - 2).snapshot
    const two = answer(one, at, (labels) => labels.length - 2).snapshot
    const written = two.records
      .filter((record) => record.provenance.writtenBy === 'guide')
      .map((record) => record.recordedAt)

    expect(written).toHaveLength(2)
    expect(new Set(written).size).toBe(2)
    // …and all of them are about the moment being asked about.
    for (const record of two.records.filter((r) => r.provenance.writtenBy === 'guide')) {
      expect(record.occurredAt).toBe(scenario.now)
    }
  })

  it('stops after the answer that changed nothing, not before it', () => {
    // Two questions here: energy transforms the screen, sleep does not, and the
    // guide stops on the second rather than carrying on to a third.
    const { scenario, snapshot } = open('quiet-fortnight')
    const at = moment(scenario)

    let current = snapshot
    const asked: string[] = []
    for (let round = 0; round < 6; round += 1) {
      const step = stepOn(current, at)
      if (step.kind === 'settled') break
      const result = answer(current, at, (labels) => labels.length - 2)
      asked.push(result.asked)
      current = result.snapshot
    }

    expect(asked).toHaveLength(2)
    expect(stepOn(current, at).because).toContain('did not move it')
  })
})

describe('an answer is an ordinary canonical record', () => {
  it('is written with the concept’s own privacy, not the question’s', () => {
    const spec = questionFor(CONCEPT.childPresent)
    if (spec === undefined) throw new Error('no question about that')
    const option = spec.options[0]
    if (option === undefined) throw new Error('no options')

    const { scenario } = open('durable-custody')
    const record = answerRecord(spec, option, moment(scenario))

    expect(record.kind).toBe('observation')
    expect(record.method).toBe('self-report')
    expect(record.provenance.source).toBe('owner')
    expect(record.privacy).toBe('child-family-sensitive')
  })
})
