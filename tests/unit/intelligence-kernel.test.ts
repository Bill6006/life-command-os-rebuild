import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { coreDomains, DOMAIN } from '../../src/domain/domains'
import { explicit, inferred, confidence, unknown } from '../../src/domain/knowledge'
import type { FactValue } from '../../src/domain/records'
import { ACTION_VERBS } from '../../src/domain/recommendation'
import {
  civilDateFromDayId,
  DAY_BLOCKS,
  instant,
  instantAtLocal,
  localDateTimeAt,
  timeZone,
  type DayBlock,
  type Instant,
  type TimeZoneId,
} from '../../src/domain/time'
import { arbitrate, WORTH_DOING } from '../../src/intelligence/arbitrate'
import { generateCandidates } from '../../src/intelligence/candidates'
import { domainFromText } from '../../src/intelligence/direction'
import { MOVE_PROFILES } from '../../src/intelligence/moves'
import { QUESTIONS, questionFor } from '../../src/intelligence/questions'
import { CHECK_IN_READINGS, ENERGY_ANCHORS } from '../../src/intelligence/readings'
import { describePremise } from '../../src/intelligence/explain'
import {
  assembleSituation,
  blockOf,
  describeHours,
  type Situation,
} from '../../src/intelligence/situation'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { scenarioById } from '../../src/synthetic/scenarios'
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

describe('the word for the hour, and the boundary it does not move', () => {
  /*
   * These are two different jobs and they have two different right answers.
   *
   * The evening begins at 18:00 for every purpose the engine has, because
   * telling someone at five to start winding down for the night is worse than
   * saying nothing. "Saturday afternoon" at a quarter to six is defensible by
   * the clock and is not what the owner read on their phone. So the word moves
   * an hour earlier and the boundary does not — and this holds them apart.
   */
  const at = (hhmm: string) => instant(Date.parse(`2026-08-15T${hhmm}:00-06:00`))

  it('keeps the decision boundary at 18:00', () => {
    expect(blockOf(at('16:59'), DENVER)).toBe('afternoon')
    expect(blockOf(at('17:00'), DENVER)).toBe('afternoon')
    expect(blockOf(at('17:59'), DENVER)).toBe('afternoon')
    expect(blockOf(at('18:00'), DENVER)).toBe('evening')
  })

  it('calls the last hour of it the late afternoon', () => {
    const premiseAt = (hhmm: string) => {
      const moment = { now: at(hhmm), zone: DENVER, weekStartsOn: 1 as const }
      const loaded = snapshotFromWire(scenarioById('gone-quiet')!.build())
      return describePremise(assembleSituation(buildView(loaded.snapshot, moment), moment))
    }

    expect(premiseAt('16:30')).toContain('Saturday afternoon')
    expect(premiseAt('16:30')).not.toContain('late afternoon')
    expect(premiseAt('17:00')).toContain('Saturday late afternoon')
    expect(premiseAt('17:45')).toContain('Saturday late afternoon')
    expect(premiseAt('18:05')).toContain('Saturday evening')
  })

  it('changes nothing about which moves are available', () => {
    // The whole point of splitting the two: renaming the hour must not make a
    // wind-down proposable an hour early.
    const loaded = snapshotFromWire(scenarioById('gone-quiet')!.build())
    const shape = (hhmm: string) => {
      const moment = { now: at(hhmm), zone: DENVER, weekStartsOn: 1 as const }
      const situation = assembleSituation(buildView(loaded.snapshot, moment), moment)
      return generateCandidates(situation)
        .map((candidate) => candidate.id)
        .sort()
        .join(',')
    }

    expect(shape('17:45')).toBe(shape('16:30'))
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
     * about. These are its own routines and the idea of sleep. Everything else
     * a recommendation can be about has to come from the owner's history.
     *
     * The list is meant to be short and to be argued over when it grows.
     * `easing off` arrived with DEF-0016's repair: the afternoon had no
     * recovery move at all, and a move needs a subject to be a sentence.
     * `a light day` arrived with AUD-0003's, for the same reason one block
     * earlier — and it is a third routine rather than a re-wording of the
     * second, because easing off lowers the bar for the hours that are left and
     * this decides what goes into a day that has not started.
     */
    expect(STANDING_ENTITIES.map((entity) => entity.id).sort()).toEqual([
      'life-domain:sleep',
      'routine:a-light-day',
      'routine:a-walk',
      'routine:easing-off',
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

/** The same history, read at a chosen part of the day. */
function situationInBlock(block: DayBlock): Situation {
  const loaded = loadScenario('durable-custody')
  const hours: Record<DayBlock, number> = {
    'late-night': 23,
    'early-morning': 5,
    morning: 9,
    afternoon: 15,
    evening: 20,
  }
  const zone = loaded.scenario.zone
  const at = movedToHour(loaded.scenario.now, hours[block], zone)
  return assembleSituation(loaded.viewAt(at), { now: at, zone, weekStartsOn: 1 })
}

function movedToHour(day: Instant, hour: number, zone: TimeZoneId): Instant {
  const local = localDateTimeAt(day, zone)
  return instantAtLocal({ ...civilDateFromDayId(local.dayId), hour, minute: 0, second: 0 }, zone)
}

describe('the questions it is allowed to ask', () => {
  /*
   * Every question, at every part of the day — AUD-0002.
   *
   * The option labels are written from the block now, because the guide was
   * offering "The evening is clear" as an answer about a morning. Sweeping the
   * blocks is what makes these claims about the whole catalogue rather than
   * about whichever hour the fixture happens to sit at: the shape of a question
   * may not change with the clock, only its words.
   */
  const atEveryBlock = (): readonly { block: DayBlock; situation: Situation }[] =>
    DAY_BLOCKS.map((block) => ({ block, situation: situationInBlock(block) }))

  /**
   * Four, and the one question that is allowed five — routing 94.
   *
   * The ceiling is §13B's *"keep new answer sets to the smallest semantically
   * honest size"*, and its reason is unchanged: this is a phone, the owner is
   * standing up, and an option set finer than its consumer can use is a longer
   * question rather than a richer one.
   *
   * **`energy.current` gained a second consumer and that is what buys the
   * fifth.** It is now read by the state score as well as by the ranking, the
   * score averages every reading against its own best, and four against five is
   * a mixed denominator — so five is the smallest honest size for this question
   * and no longer is for any other. The exception is named rather than the
   * ceiling raised, so the next question that wants a fifth answer has to come
   * and say why here.
   */
  const MAY_OFFER_FIVE = CONCEPT.energy

  it('offers real choices, not a free-text box', () => {
    for (const { block, situation } of atEveryBlock()) {
      for (const question of QUESTIONS) {
        const options = question.options(situation)
        const most = question.concept === MAY_OFFER_FIVE ? 5 : 4
        expect(options.length, `${question.concept} at ${block}`).toBeGreaterThanOrEqual(2)
        expect(options.length, `${question.concept} at ${block}`).toBeLessThanOrEqual(most)
      }
    }
  })

  it('gives the one question with five answers the consumer that earned it', () => {
    // An exception nobody checks is a ceiling nobody has. The fifth answer is
    // there because the score reads this concept, so this asserts that it is
    // one of the readings the score is over — and it fails if a later phase
    // takes it out and leaves the exception behind.
    expect(
      CHECK_IN_READINGS.some((reading) => reading.concept === MAY_OFFER_FIVE),
      'the extra answer has outlived the consumer that justified it',
    ).toBe(true)
    expect(questionFor(MAY_OFFER_FIVE)?.options(situationInBlock('evening'))).toEqual(
      ENERGY_ANCHORS,
    )
  })

  it('gives every option a distinct answer', () => {
    for (const { block, situation } of atEveryBlock()) {
      for (const question of QUESTIONS) {
        const options = question.options(situation)
        const ids = options.map((option) => option.id)
        expect(new Set(ids).size, `${question.concept} at ${block}`).toBe(ids.length)
        const values = options.map((option) => JSON.stringify(option.value))
        expect(new Set(values).size, `${question.concept} at ${block}`).toBe(values.length)
      }
    }
  })

  it('stores the same answers whatever the clock says', () => {
    // Only the words move. If a block could change which values a question can
    // record, the share rule in `guide.ts` and D-036's regression would be
    // measuring different questions at different hours.
    for (const question of QUESTIONS) {
      const shapes = DAY_BLOCKS.map((block) =>
        JSON.stringify(
          question.options(situationInBlock(block)).map((option) => [option.id, option.value]),
        ),
      )
      expect(new Set(shapes).size, question.concept).toBe(1)
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
