import { describe, expect, it } from 'vitest'
import { createEntity, createEntityIndex, entityRef } from '../../src/domain/entities'
import { DOMAIN } from '../../src/domain/domains'
import { ACTION_VERBS, type ActionVerb } from '../../src/domain/recommendation'
import { OUTCOME_ASPECTS, type OutcomeAspect } from '../../src/domain/records'
import { instant, type Instant } from '../../src/domain/time'
import {
  COMFORT_FRICTION,
  COMFORT_STEPS,
  EFFECT_STEPS,
  EFFECT_VALUE,
  RESULT_STEPS,
  RESULT_VALUE,
  comfortFrictionOf,
  effectValueOf,
  everyOutcomeQuestion,
  outcomeQuestionsFor,
  resultValueOf,
} from '../../src/intelligence/outcomes'
import { MOVE_PROFILES, profileFor } from '../../src/intelligence/moves'
import type { Episode } from '../../src/intelligence/lifecycle'
import { orphanPronounsIn } from './harness'

/**
 * DEF-0020 — a question its own answers cannot answer.
 *
 * The reported symptom: "Did the kitchen get cleared?" offered against *Better
 * than usual · About the same · Worse*. Underneath it, a collapse — completion,
 * direct result, downstream effect and comfort are four different facts, and
 * one better/same/worse judgement was standing in for all of them.
 *
 * What let it ship was that nothing anywhere required a prompt and its answers
 * to be about the same thing. The tests asserted the exact broken strings,
 * which proves a string is stable rather than right. So the checks below are
 * **class-wide**: they walk every verb and every aspect in the catalogue, and a
 * sixteenth verb is covered the moment it exists.
 */

const T: Instant = instant(Date.parse('2026-05-19T02:30:00Z'))

/**
 * Deliberately pronoun-free labels, so anything found came from a prompt.
 *
 * The development skill links to a person, because the growth question reaches
 * through it to name her — the same walk `renderRecommendation` does.
 */
function fixtureEntities() {
  const child = createEntity({
    kind: 'person',
    label: 'Adaya',
    domain: DOMAIN.fatherhood,
    privacy: 'child-family-sensitive',
    createdAt: T,
  })
  return createEntityIndex([
    child,
    createEntity({
      kind: 'development-skill',
      label: 'ordering food independently',
      domain: DOMAIN.fatherhood,
      privacy: 'child-family-sensitive',
      createdAt: T,
      links: [{ relation: 'about-person', target: child.id }],
    }),
  ])
}

/** One episode per verb, completed, so every aspect is asked. */
function episodeFor(verb: ActionVerb): Episode {
  const subject = entityRef('development-skill', 'ordering food independently')
  return {
    recommendation: 'X' as never,
    semantics: {
      subject,
      domain: DOMAIN.fatherhood,
      target: { verb, object: subject },
      whyNow: { trigger: 'good-conditions', summary: '', evidence: [] },
      evidence: [],
    },
    context: undefined,
    dayId: '2026-05-19' as never,
    shownAt: T,
    state: 'completed',
    startedAt: undefined,
    settledAt: T,
    declineReason: undefined,
    blocker: undefined,
    outcomes: [],
    wantedAnother: false,
  }
}

const CATALOGUE = everyOutcomeQuestion()

describe('the catalogue is real, and is what the engine reads', () => {
  it('has a question for every aspect a move declares, and no others', () => {
    // Two tables that must agree: the profile says which evidence a move can
    // produce, this one says what to ask for it. Either drifting alone is a
    // move that asks nothing or asks something it never uses.
    const declared = new Set<string>()
    for (const verb of ACTION_VERBS) {
      for (const aspect of profileFor(verb).aspects) declared.add(`${verb}/${aspect}`)
    }
    const written = new Set(CATALOGUE.map((entry) => `${entry.verb}/${entry.aspect}`))

    expect([...written].sort()).toEqual([...declared].sort())
  })

  it('covers enough of the catalogue to mean something', () => {
    expect(CATALOGUE.length).toBeGreaterThan(10)
    expect(ACTION_VERBS.length).toBeGreaterThan(10)
  })

  it('asks at most two things about any one move', () => {
    // Section 4.5 — do not collect data because a field exists. Two taps is the
    // most a follow-up may cost.
    for (const verb of ACTION_VERBS) {
      expect(profileFor(verb).aspects.length, verb).toBeLessThanOrEqual(2)
    }
  })

  it('keeps hands-on-lab to the one aspect it was given', () => {
    // An owner decision, recorded here so widening it is deliberate rather than
    // a side effect of the architecture supporting more.
    expect(profileFor('hands-on-lab').aspects).toEqual(['result'])
  })
})

describe('every outcome question is answerable by its own answers', () => {
  /*
   * The defect, as a class.
   *
   * Every answer set here is graded — three or four levels — so a yes/no
   * question cannot be answered by any of them. "Did the kitchen get cleared?"
   * fails this; "How much of the kitchen got cleared?" passes it. The check is
   * mechanical on purpose: it needs no judgement and it holds for a verb nobody
   * has written yet.
   */
  const YES_NO = /^(did|do|does|is|are|was|were|will|have|has|had|can|could|should|would)\b/i

  it('asks nothing that wants a yes or a no', () => {
    const offenders: string[] = []
    const entities = fixtureEntities()

    for (const verb of ACTION_VERBS) {
      for (const question of outcomeQuestionsFor(episodeFor(verb), entities)) {
        if (YES_NO.test(question.prompt)) {
          offenders.push(`${verb}/${question.aspect}: ${question.prompt}`)
        }
      }
    }

    expect(offenders, 'a graded answer set cannot answer a yes/no question').toEqual([])
  })

  it('names what it is asking about', () => {
    // D-039's rule, which G-001 applies to recommendations and which nothing
    // applied to outcome questions until this defect.
    const entities = fixtureEntities()
    for (const verb of ACTION_VERBS) {
      for (const question of outcomeQuestionsFor(episodeFor(verb), entities)) {
        expect(question.prompt.toLowerCase(), `${verb}/${question.aspect}`).toContain(
          'ordering food independently',
        )
        expect(orphanPronounsIn(question.prompt), question.prompt).toEqual([])
      }
    }
  })

  it('writes finished sentences, on every one of them', () => {
    const entities = fixtureEntities()
    for (const verb of ACTION_VERBS) {
      for (const question of outcomeQuestionsFor(episodeFor(verb), entities)) {
        const prompt = question.prompt
        expect(prompt.trim(), verb).toBe(prompt)
        expect(prompt, verb).not.toContain('  ')
        expect(prompt, verb).toMatch(/\?$/)
        expect(prompt.charAt(0), prompt).toBe(prompt.charAt(0).toUpperCase())
        expect(prompt.length, prompt).toBeLessThan(120)
      }
    }
  })

  it('offers answers that are plain, distinct and few', () => {
    for (const { verb, aspect, question } of CATALOGUE) {
      const labels = question.answers.map((answer) => answer.label)
      expect(new Set(labels).size, `${verb}/${aspect}`).toBe(labels.length)
      expect(labels.length, `${verb}/${aspect}`).toBeGreaterThanOrEqual(3)
      expect(labels.length, `${verb}/${aspect}`).toBeLessThanOrEqual(4)
      for (const label of labels) {
        expect(orphanPronounsIn(label), `${verb}/${aspect}: ${label}`).toEqual([])
        expect(label.length, label).toBeLessThan(24)
      }
    }
  })

  it('never labels an effect in words the engine uses for something else', () => {
    /*
     * The sensitivity check found this before it shipped: `describeLevel` calls
     * 0.45–0.70 "a fair amount" and anything below "a little", so an answer
     * labelled "A little" worth 0.50 would be reported back in the ranking as
     * "a fair amount". The words on the button and the words in the trace have
     * to mean the same thing.
     */
    const ENGINE_WORDS = ['a lot', 'a fair amount', 'a little']
    for (const { verb, aspect, question } of CATALOGUE) {
      if (aspect !== 'effect') continue
      for (const answer of question.answers) {
        expect(ENGINE_WORDS, `${verb}: ${answer.label}`).not.toContain(answer.label.toLowerCase())
      }
    }
  })
})

describe('an aspect carries the evidence it is meant to carry', () => {
  it('gives a result question achievement-shaped answers', () => {
    for (const { verb, aspect, question } of CATALOGUE) {
      if (aspect !== 'result') continue
      const values = question.answers.map((answer) => resultValueOf(answer.observation))
      expect(values, verb).toEqual([...RESULT_VALUE].reverse())
    }
  })

  it('gives an effect question worth-shaped answers, harm included', () => {
    for (const { verb, aspect, question } of CATALOGUE) {
      if (aspect !== 'effect') continue
      const values = question.answers.map((answer) => effectValueOf(answer.observation))
      expect(values, verb).toEqual([...EFFECT_VALUE].reverse())
    }
  })

  it('gives a comfort question ease-shaped answers', () => {
    for (const { verb, aspect, question } of CATALOGUE) {
      if (aspect !== 'comfort') continue
      const values = question.answers.map((answer) => comfortFrictionOf(answer.observation))
      expect(values, verb).toEqual([...COMFORT_FRICTION].reverse())
    }
  })

  it('lets only an effect answer carry a sentiment', () => {
    /*
     * Load-bearing rather than tidy. `roughOutcomesFor` reads a `worse`
     * sentiment as "this topic went badly" and fires the weak-topic generator
     * from it, so a *result* of "not at all" wearing that flag would produce a
     * study recommendation off an evening that says nothing about studying.
     */
    for (const { verb, aspect, question } of CATALOGUE) {
      for (const answer of question.answers) {
        if (aspect === 'effect') continue
        expect(answer.sentiment, `${verb}/${aspect}: ${answer.label}`).toBeUndefined()
      }
    }
  })

  it('summarises an effect answer honestly in three', () => {
    // "Not much" means no change, which is exactly `same`. Calling it `worse`
    // would make every flat evening look like a bad one.
    for (const { aspect, question } of CATALOGUE) {
      if (aspect !== 'effect') continue
      expect(question.answers.map((answer) => answer.sentiment)).toEqual([
        'better',
        'better',
        'same',
        'worse',
      ])
    }
  })

  it('can tell harm from no help', () => {
    // A walk that aggravated soreness and a walk that did nothing much are not
    // the same evidence, and a three-level scale could not say so.
    const worst = EFFECT_VALUE[0]
    const nothingMuch = EFFECT_VALUE[1]
    expect(worst).toBeLessThan(nothingMuch ?? 0)
    expect(EFFECT_VALUE).toHaveLength(EFFECT_STEPS + 1)
    expect(RESULT_VALUE).toHaveLength(RESULT_STEPS + 1)
    expect(COMFORT_FRICTION).toHaveLength(COMFORT_STEPS + 1)
  })

  it('reads nothing from an observation of the wrong shape', () => {
    // A comfort reading must not be legible as an effect, or the aspects would
    // be separated by convention rather than by the data.
    const comfort = { type: 'scale' as const, value: 2, of: COMFORT_STEPS }
    expect(effectValueOf(comfort)).toBeUndefined()
    expect(comfortFrictionOf({ type: 'scale', value: 3, of: EFFECT_STEPS })).toBeUndefined()
    expect(resultValueOf({ type: 'text', value: 'went fine' })).toBeUndefined()
  })

  it('knows only the aspects it declares, and no move profile asks for the two course-scale ones', () => {
    /*
     * Five since routing 84, and the split is the point — F05.
     *
     * `retained` and `transfer` are about a **course**, days after it finished.
     * No `MoveProfile` names either of them and none may: an episode is one
     * occasion on one day, and asking at the end of a session whether the
     * session stuck is asking whether the session happened. They are reached
     * only through `dueCourseReflections`, which is keyed on a finished thread.
     */
    expect([...OUTCOME_ASPECTS].sort()).toEqual([
      'comfort',
      'effect',
      'result',
      'retained',
      'transfer',
    ])
    const used = new Set<OutcomeAspect>()
    for (const profile of Object.values(MOVE_PROFILES)) {
      for (const aspect of profile.aspects) used.add(aspect)
    }
    for (const aspect of used) expect(OUTCOME_ASPECTS).toContain(aspect)
    expect([...used].sort(), 'a move profile reached a course-scale aspect').toEqual([
      'comfort',
      'effect',
      'result',
    ])
  })
})
