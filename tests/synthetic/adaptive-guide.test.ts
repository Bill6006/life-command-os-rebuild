import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { decide } from '../../src/intelligence/engine'
import { answeredToday, nextGuideStep, QUESTIONS_PER_DAY } from '../../src/intelligence/guide'
import { answerRecord, questionFor } from '../../src/intelligence/questions'
import { snapshotFromWire } from '../../src/memory/snapshot'
import type { StoreSnapshot } from '../../src/memory/store'
import { buildView } from '../../src/memory/view'
import { scenarioById } from '../../src/synthetic/scenarios'

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

function moment(scenario: { now: number; zone: string }) {
  return { now: scenario.now as never, zone: scenario.zone as never }
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

  const record = answerRecord(step.question.spec, option, at)
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
