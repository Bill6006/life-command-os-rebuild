import { describe, expect, it } from 'vitest'
import { CONCEPT, coreConcepts } from '../../src/domain/concepts'
import {
  averageOfUsable,
  countUsable,
  lastKnownValue,
  sumOfUsable,
  valueIfUsable,
  type Knowledge,
} from '../../src/domain/knowledge'
import type { FactValue } from '../../src/domain/records'
import { instant, type Instant } from '../../src/domain/time'
import { loadScenario } from './harness'

/**
 * G-009 — unknown is unknown.
 *
 * Input: a field has never been answered. Expected: no false zero, average or
 * default, and a question only when the answer could change something.
 *
 * The scenario answers one thing, withdraws another, and dates a third
 * tomorrow. Everything else has never been touched.
 */

function numberIn(knowledge: Knowledge<FactValue>): number | undefined {
  const value = valueIfUsable(knowledge)
  if (value === undefined) return undefined
  return value.type === 'number' ? value.value : undefined
}

describe('G-009 — nothing becomes a number nobody gave', () => {
  const loaded = loadScenario('mostly-unknown')
  const view = loaded.view()

  it('answers the one thing it was told', () => {
    const sleep = view.facts.knowledgeFor(CONCEPT.sleepHours)
    expect(sleep.state).toBe('explicit')
    expect(numberIn(sleep)).toBe(6.5)
  })

  it('says it does not know, rather than saying zero', () => {
    for (const concept of [CONCEPT.energy, CONCEPT.usableTimeTonight, CONCEPT.socialEnergy]) {
      const knowledge = view.facts.knowledgeFor(concept)
      expect(knowledge.state, concept).toBe('unknown')
      expect(valueIfUsable(knowledge), concept).toBeUndefined()
      expect(numberIn(knowledge), concept).not.toBe(0)
    }
  })

  it('never returns a value for any concept it was not told about', () => {
    const answered = new Set([CONCEPT.sleepHours])
    for (const definition of coreConcepts.all()) {
      if (answered.has(definition.id)) continue
      const knowledge = view.facts.knowledgeFor(definition.id)
      expect(valueIfUsable(knowledge), definition.id).toBeUndefined()
    }
  })

  it('resolves a concept nobody has ever mentioned without inventing one', () => {
    const invented = coreConcepts.definitionFor(CONCEPT.faithPractice)
    const knowledge = view.facts.knowledgeFor(invented.id)
    expect(knowledge.state).toBe('unknown')
    if (knowledge.state === 'unknown') expect(knowledge.reason).toBe('never-observed')
  })

  it('leaves a withdrawn answer blank rather than falling back to zero', () => {
    const soreness = view.facts.knowledgeFor(CONCEPT.soreness)
    expect(soreness.state).toBe('unknown')
    if (soreness.state === 'unknown') expect(soreness.reason).toBe('retracted')
    // Not "no soreness" — no answer.
    expect(valueIfUsable(soreness)).toBeUndefined()
    expect(lastKnownValue(soreness)).toBeUndefined()
  })

  it('does not treat tomorrow’s entry as today’s knowledge', () => {
    const cash = view.facts.knowledgeFor(CONCEPT.cashBuffer)
    expect(cash.state).toBe('unknown')
    if (cash.state === 'unknown') expect(cash.note).toContain('future')

    // …and it becomes knowledge once the moment arrives.
    const tomorrow = loaded.viewAt(instant(loaded.scenario.now + 86_400_000))
    expect(tomorrow.facts.knowledgeFor(CONCEPT.cashBuffer).state).toBe('explicit')
  })

  it('ages an answer into stale rather than into zero', () => {
    const nextWeek: Instant = instant(loaded.scenario.now + 7 * 86_400_000)
    const sleep = loaded.viewAt(nextWeek).facts.knowledgeFor(CONCEPT.sleepHours)

    expect(sleep.state).toBe('stale')
    expect(valueIfUsable(sleep)).toBeUndefined()
    // We still know what we used to think, which is not the same as knowing it.
    expect(lastKnownValue(sleep)).toEqual({ type: 'number', value: 6.5, unit: 'hours' })
  })
})

describe('G-009 — arithmetic over nothing stays nothing', () => {
  const view = loadScenario('mostly-unknown').view()

  it('averages an empty week into unknown', () => {
    const unanswered = [CONCEPT.energy, CONCEPT.usableTimeTonight, CONCEPT.socialEnergy].map(
      (concept) => view.facts.knowledgeFor(concept),
    )

    const numbers = unanswered.map((knowledge) => ({
      ...knowledge,
      value: 0,
    })) as Knowledge<number>[]
    // Every one of those is unknown, so the shape above cannot smuggle a value
    // in: the aggregate is still unknown, not zero.
    expect(averageOfUsable(numbers).state).toBe('unknown')
    expect(sumOfUsable(numbers).state).toBe('unknown')
    expect(countUsable(numbers)).toBe(0)
  })
})

describe('G-009 — a question only when it would change something', () => {
  const view = loadScenario('mostly-unknown').view()

  it('asks about the unknowns that matter', () => {
    const asked = view.facts.questions.map((entry) => entry.concept)
    expect(asked).toContain(CONCEPT.energy)
    expect(asked).toContain(CONCEPT.freeNow)
    /*
     * And how the night went — DEF-0156's reader, arriving where the registry
     * said it would (AUD-0009, D-271).
     *
     * It sat on the other list for a phase, with a note saying its reader
     * belonged with routing 93's recovery work and that the flag would have to
     * change back when it landed. `assessStrain` now reads it as the fourth
     * signal under the rule energy and work strain already follow, so an answer
     * changes what the app believes is in the way — which is the whole of what
     * this list means.
     */
    expect(asked).toContain(CONCEPT.sleepQuality)
  })

  it('does not ask about the unknowns that do not', () => {
    /*
     * Two of the three this used to name have moved, and the move is AUD-0041
     * rather than a relaxation.
     *
     * `socialEnergy` gates the social generator outright and `homeFriction`
     * gates the home generator and writes the sentence a home move is explained
     * with — so not knowing either silences a whole area, which is the
     * definition of a reading that changes something. Both were declared
     * `materialToDecision: false`, which is the registry saying the opposite of
     * what the code does, and this test was reading the declaration back.
     * `tests/synthetic/reach-material.test.ts` now measures it instead.
     *
     * The cash buffer moved too, in the same commit that gave money a history.
     * It gates the money generator, the generator needs a goal, and **no
     * shipped history held one** — so until AUD-0012 there was genuinely
     * nothing an answer about it could change and the measurement said so. Now
     * there is, and the measurement says that instead.
     *
     * `sleepQuality` moved as well, and it moved **onto the other list** — the
     * one above. The note beside it in the registry said in as many words that
     * its reader belonged with AUD-0009's recovery work and that the flag would
     * have to change back when that landed. It has landed (D-271), so the claim
     * this test was making about it is no longer true and is not asserted here
     * any more.
     *
     * What is left is the one that genuinely changes nothing: a free-text
     * emotional reading nothing reads, kept exactly as the owner types it and
     * shown back to him on his own page. Held on its own rather than deleted,
     * because a list with nothing on it proves nothing — this is the assertion
     * that the guide can still decline to ask.
     */
    const asked = view.facts.questions.map((entry) => entry.concept)
    expect(asked).not.toContain(CONCEPT.emotionalState)
    // And the list is not empty of things it could have asked about, or the
    // assertion above would pass on a history where nothing is asked at all.
    expect(asked.length, 'nothing is asked here, so declining to ask says nothing').toBeGreaterThan(
      2,
    )
  })

  it('never opens with an unsolicited private question', () => {
    const asked = view.facts.questions.map((entry) => entry.concept)
    expect(asked).not.toContain(CONCEPT.privatePattern)
  })

  it('does not re-ask the one thing it already knows', () => {
    expect(view.facts.questions.map((entry) => entry.concept)).not.toContain(CONCEPT.sleepHours)
  })
})
