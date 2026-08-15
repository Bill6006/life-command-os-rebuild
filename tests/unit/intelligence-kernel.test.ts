import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { coreDomains, DOMAIN } from '../../src/domain/domains'
import { explicit, inferred, confidence, unknown } from '../../src/domain/knowledge'
import type { FactValue } from '../../src/domain/records'
import { ACTION_VERBS } from '../../src/domain/recommendation'
import { instant, timeZone } from '../../src/domain/time'
import { arbitrate, WORTH_DOING } from '../../src/intelligence/arbitrate'
import { generateCandidates } from '../../src/intelligence/candidates'
import { domainFromText } from '../../src/intelligence/direction'
import { MOVE_PROFILES } from '../../src/intelligence/moves'
import { QUESTIONS } from '../../src/intelligence/questions'
import { blockOf, describeHours } from '../../src/intelligence/situation'
import {
  booleanValue,
  entityValue,
  hoursValue,
  minutesValue,
  narrowKnowledge,
  ratioValue,
  textValue,
} from '../../src/intelligence/values'
import { STANDING_ENTITIES } from '../../src/intelligence/vocabulary'
import { loadScenario } from '../synthetic/harness'

/**
 * The kernel's own pieces, tested where they can be tested alone.
 *
 * The scenario suites in `tests/synthetic` prove that the engine reaches the
 * right decisions. These prove that the parts it is built from behave as
 * described when nothing else is in the room — particularly the ones whose job
 * is to refuse: readers that will not turn the wrong shape into a number, and a
 * direction resolver that will not turn a phrase into a life area.
 */

const DENVER = timeZone('America/Denver')

describe('reading a stored value as the shape a rule needs', () => {
  it('reads hours from hours, and from a duration', () => {
    expect(hoursValue({ type: 'number', value: 6.5, unit: 'hours' })).toBe(6.5)
    expect(hoursValue({ type: 'number', value: 6.5 })).toBe(6.5)
    expect(hoursValue({ type: 'duration', minutes: 90 })).toBe(1.5)
    expect(hoursValue({ type: 'number', value: 90, unit: 'minutes' })).toBe(1.5)
  })

  it('refuses to read a rating as a quantity', () => {
    // The failure this prevents: 4-out-of-5 energy silently becoming "4 hours".
    expect(hoursValue({ type: 'scale', value: 4, of: 5 })).toBeUndefined()
    expect(hoursValue({ type: 'text', value: 'not much' })).toBeUndefined()
    expect(minutesValue({ type: 'number', value: 30 })).toBeUndefined()
  })

  it('reads a rating against its own top', () => {
    expect(ratioValue({ type: 'scale', value: 4, of: 5 })).toBe(0.8)
    expect(ratioValue({ type: 'scale', value: 8, of: 10 })).toBe(0.8)
    expect(ratioValue({ type: 'scale', value: 1, of: 0 })).toBeUndefined()
    // A bare 7 could mean anything, so it means nothing.
    expect(ratioValue({ type: 'number', value: 7 })).toBeUndefined()
  })

  it('reads the plain shapes plainly', () => {
    expect(booleanValue({ type: 'boolean', value: true })).toBe(true)
    expect(textValue({ type: 'text', value: 'kitchen' })).toBe('kitchen')
    expect(entityValue({ type: 'text', value: 'kitchen' })).toBeUndefined()
    expect(
      entityValue({ type: 'entity', value: { id: 'place:kitchen' as never, kind: 'place' } })?.kind,
    ).toBe('place')
  })

  it('turns a shape mismatch into not knowing, never into zero', () => {
    const rating: FactValue = { type: 'scale', value: 4, of: 5 }
    const read = narrowKnowledge(explicit(rating, instant(0), 'R' as never), hoursValue)

    expect(read.state).toBe('unknown')
    expect(read.state === 'unknown' ? read.reason : '').toBe('not-applicable')
  })

  it('leaves not knowing alone', () => {
    const read = narrowKnowledge(unknown('never-observed'), hoursValue)
    expect(read.state).toBe('unknown')
    expect(read.state === 'unknown' ? read.reason : '').toBe('never-observed')
  })

  it('keeps how well a value was known while changing what it is', () => {
    const read = narrowKnowledge(
      inferred({ type: 'duration', minutes: 45 }, instant(10), confidence(0.4), ['R' as never]),
      minutesValue,
    )
    expect(read.state).toBe('inferred')
    expect(read.state === 'inferred' ? read.value : 0).toBe(45)
    expect(read.state === 'inferred' ? read.confidence : 0).toBe(0.4)
  })
})

describe('reading a direction written as text', () => {
  it('accepts the name of a life area', () => {
    expect(domainFromText('home', coreDomains)).toBe(DOMAIN.home)
    expect(domainFromText('  Career ', coreDomains)).toBe(DOMAIN.career)
    expect(domainFromText('Money & Financial Resilience', coreDomains)).toBe(DOMAIN.money)
  })

  it('refuses anything else rather than choosing the nearest', () => {
    // A near miss returning "career" is the exact defect G-008 is about.
    for (const phrase of ['work', 'get out more', 'Adaya', 'careers', '', '  ']) {
      expect(domainFromText(phrase, coreDomains), phrase).toBeUndefined()
    }
  })
})

describe('the owner-local part of the day', () => {
  const at = (local: string) => instant(Date.parse(local))

  it('splits a day where a person would', () => {
    expect(blockOf(at('2026-09-15T09:00:00-06:00'), DENVER)).toBe('morning')
    expect(blockOf(at('2026-09-15T14:00:00-06:00'), DENVER)).toBe('afternoon')
    expect(blockOf(at('2026-09-15T19:30:00-06:00'), DENVER)).toBe('evening')
    expect(blockOf(at('2026-09-15T23:30:00-06:00'), DENVER)).toBe('late-night')
    expect(blockOf(at('2026-09-15T02:30:00-06:00'), DENVER)).toBe('late-night')
    expect(blockOf(at('2026-09-15T05:30:00-06:00'), DENVER)).toBe('early-morning')
  })

  it('reads the same instant differently from somewhere else', () => {
    const evening = at('2026-09-16T02:00:00Z')
    expect(blockOf(evening, DENVER)).toBe('evening')
    expect(blockOf(evening, timeZone('UTC'))).toBe('late-night')
  })
})

describe('saying a length of time out loud', () => {
  it('rounds to something a person would say', () => {
    expect(describeHours(0.4)).toBe('under an hour')
    expect(describeHours(1)).toBe('an hour')
    expect(describeHours(2.3)).toBe('2.5 hours')
    expect(describeHours(8.8)).toBe('9 hours')
  })
})

describe('the move catalogue', () => {
  it('has a profile for every verb the renderer can render', () => {
    // A verb without a profile would be a move the evaluator cannot judge.
    for (const verb of ACTION_VERBS) {
      expect(MOVE_PROFILES[verb], verb).toBeDefined()
    }
    expect(Object.keys(MOVE_PROFILES).sort()).toEqual([...ACTION_VERBS].sort())
  })

  it('never both suits and refuses the same part of the day', () => {
    for (const [verb, profile] of Object.entries(MOVE_PROFILES)) {
      for (const block of profile.suits) {
        expect(profile.refuses, verb).not.toContain(block)
      }
    }
  })

  it('keeps its numbers inside the range the evaluator assumes', () => {
    for (const [verb, profile] of Object.entries(MOVE_PROFILES)) {
      for (const [name, value] of Object.entries({
        now: profile.now,
        tomorrow: profile.tomorrow,
        friction: profile.friction,
      })) {
        expect(value, `${verb}.${name}`).toBeGreaterThanOrEqual(0)
        expect(value, `${verb}.${name}`).toBeLessThanOrEqual(1)
      }
      if (profile.size !== undefined) expect(profile.size, verb).toBeGreaterThan(0)
    }
  })
})

describe('the engine’s own vocabulary', () => {
  it('names only its own routines', () => {
    /*
     * The line that keeps section 64 from being defeated quietly.
     *
     * If the engine could invent subjects, it could always produce a
     * well-formed, entirely generic sentence about a life it knows nothing
     * about. These three are its own routines and the idea of sleep. Everything
     * else a recommendation can be about has to come from the owner's history.
     */
    expect(STANDING_ENTITIES.map((entity) => entity.id).sort()).toEqual([
      'life-domain:sleep',
      'routine:a-walk',
      'routine:winding-down',
    ])
  })

  it('gives each of them a plain lower-case name that reads inside a sentence', () => {
    for (const entity of STANDING_ENTITIES) {
      expect(entity.label, entity.id).toBe(entity.label.toLowerCase())
      expect(entity.label.length, entity.id).toBeGreaterThan(0)
    }
  })
})

describe('the questions it is allowed to ask', () => {
  it('offers real choices, not a free-text box', () => {
    for (const question of QUESTIONS) {
      expect(question.options.length, question.concept).toBeGreaterThanOrEqual(2)
      expect(question.options.length, question.concept).toBeLessThanOrEqual(4)
    }
  })

  it('gives every option a distinct answer', () => {
    for (const question of QUESTIONS) {
      const ids = question.options.map((option) => option.id)
      expect(new Set(ids).size, question.concept).toBe(ids.length)
      const values = question.options.map((option) => JSON.stringify(option.value))
      expect(new Set(values).size, question.concept).toBe(values.length)
    }
  })

  it('asks about each thing exactly once', () => {
    const concepts = QUESTIONS.map((question) => question.concept)
    expect(new Set(concepts).size).toBe(concepts.length)
  })

  it('names what it is asking about — DEF-0011', () => {
    /*
     * "How much have you got left?" was asking about energy, and said so
     * nowhere. The owner had to ask what it meant, which is the evidence: with
     * every content word removed the sentence could have been about time,
     * sleep, patience or money.
     *
     * Section 3's rule is that the app never loses the noun when it knows it,
     * and the registry has always called this concept "Current energy". G-001
     * sweeps the recommendation catalogue for exactly this failure; nothing
     * swept the questions.
     *
     * The check: strip the interrogative frame, and something has to be left.
     */
    const FRAME = new Set([
      'how',
      'much',
      'many',
      'have',
      'has',
      'you',
      'your',
      'got',
      'left',
      'what',
      'is',
      'are',
      'was',
      'were',
      'do',
      'did',
      'does',
      'get',
      'anything',
      'any',
      'the',
      'a',
      'an',
      'or',
      'and',
      'with',
      'for',
      'up',
      'in',
      'on',
      'at',
      'to',
      'of',
      'right',
      'now',
      'today',
      'tonight',
      'actually',
      'still',
      'back',
      'there',
      'it',
      'this',
      'that',
    ])

    const situation = loadScenario('durable-custody').decision().situation

    for (const question of QUESTIONS) {
      const prompt = question.prompt(situation)
      const content = (prompt.toLowerCase().match(/[a-z']+/g) ?? []).filter(
        (word) => !FRAME.has(word),
      )
      expect(content, `"${prompt}" names nothing`).not.toEqual([])
    }
  })

  it('names energy in the question about energy', () => {
    const situation = loadScenario('durable-custody').decision().situation
    const energy = QUESTIONS.find((question) => question.concept === CONCEPT.energy)
    expect(energy?.prompt(situation).toLowerCase()).toContain('energy')
  })
})

describe('the bar a move has to clear', () => {
  it('is a positive number, so surviving the filter is not enough', () => {
    // Section 19 — no additional move is a valid decision. A threshold of zero
    // would mean the least bad survivor always wins.
    expect(WORTH_DOING).toBeGreaterThan(0)
  })
})

describe('the ranking is a real order — DEF-0004', () => {
  /*
   * The regression for a comparator that treated near-ties as ties.
   *
   * The scores below sit 0.015 apart, inside the window that version used, and
   * the highest-scoring move is deliberately not the lowest-friction one. Under
   * the old rule the second-placed move would come first; worse, with three
   * moves spaced this way the comparison was not transitive — the first could
   * tie the second and the second tie the third while the first beat the third
   * outright, which leaves the sort order up to the engine's implementation and
   * a "reproducible" trace reproducing nothing.
   */
  const situation = loadScenario('week-pointed-at-home').decision().situation
  const candidates = [...generateCandidates(situation)]

  const scored = (scores: readonly number[]) =>
    candidates.slice(0, scores.length).map((candidate, index) => ({
      candidate,
      dimensions: [],
      score: scores[index] ?? 0,
      confidence: confidence(0.5),
      cautions: [],
    }))

  it('has enough moves in this history to be worth ordering', () => {
    expect(candidates.length).toBeGreaterThanOrEqual(3)
  })

  it('puts the highest score first even when something cheaper is close behind', () => {
    const ranked = arbitrate(scored([0.3, 0.285, 0.27]), situation, 0).ranked
    expect(ranked.map((entry) => entry.score)).toEqual([0.3, 0.285, 0.27])
  })

  it('reaches the same order however the moves arrived', () => {
    const scores = [0.3, 0.285, 0.27]
    const forwards = arbitrate(scored(scores), situation, 0).ranked
    const backwards = arbitrate([...scored(scores)].reverse(), situation, 0).ranked

    expect(backwards.map((entry) => entry.candidate.id)).toEqual(
      forwards.map((entry) => entry.candidate.id),
    )
  })

  it('still settles an exact draw the same way every time', () => {
    const drawn = scored([0.2, 0.2, 0.2])
    const first = arbitrate(drawn, situation, 0).ranked.map((entry) => entry.candidate.id)
    const second = arbitrate([...drawn].reverse(), situation, 0).ranked.map(
      (entry) => entry.candidate.id,
    )
    expect(second).toEqual(first)
  })
})
