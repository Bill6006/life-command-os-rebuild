import { describe, expect, it } from 'vitest'
import { DOMAIN } from '../../src/domain/domains'
import { collectEpisodes } from '../../src/intelligence/lifecycle'
import { outcomeQuestionsFor } from '../../src/intelligence/outcomes'
import { loadScenario, orphanPronounsIn } from './harness'

/**
 * G-004 — social opportunity.
 *
 * > Input: good energy, appropriate public setting, active social-growth goal,
 * > no stronger urgent bottleneck.
 * >
 * > Expected: a specific natural social move may win, such as a genuine
 * > compliment or conversation start; no quota/gamification; outcome learning
 * > records comfort/result.
 *
 * The word to hold on to is **may**. Section 10 is explicit that social action
 * must not be forced when the bottleneck is elsewhere, so the interesting half
 * of this scenario is not that a conversation wins — it is that nothing here
 * makes it win. Take the goal away, or the sociable reading, and it does not.
 */

const START_A_CONVERSATION = 'social/start-conversation/place:the-climbing-gym'

describe('G-004 — a specific social move can win', () => {
  const loaded = loadScenario('social-opening')
  const decision = loaded.decision()

  it('chooses the conversation', () => {
    expect(decision.kind).toBe('move')
    expect(decision.evaluation?.candidate.id).toBe(START_A_CONVERSATION)
    expect(decision.evaluation?.candidate.semantics.domain).toBe(DOMAIN.social)
  })

  it('names the place rather than describing a category of behaviour', () => {
    // Section 4.6 — a specific ordinary sentence beats an elegant generic one.
    const sentence = decision.explanation?.rendered.sentence ?? ''
    expect(sentence).toBe('Start one real conversation while you are at the climbing gym.')
    expect(orphanPronounsIn(sentence)).toEqual([])
  })

  it('has something else it could have done, and says so', () => {
    // A win with no rival is not a decision. The walk is live on this afternoon
    // — rested, energetic, hours free — and the conversation beats it.
    expect(decision.trace.ranking.length).toBeGreaterThan(1)
    expect(decision.explanation?.instead).toContain('walk')
    expect(decision.explanation?.insteadBecause).toBeDefined()
  })

  it('is not being driven by a bottleneck', () => {
    // "No stronger urgent bottleneck" is part of the input, so it has to be
    // true of the fixture rather than assumed about it.
    expect(decision.situation.limiter).toBeUndefined()
  })
})

describe('G-004 — no quota, and no game', () => {
  /*
   * Section 10 by name: no "compliment 1/1", no approach streaks, no treating
   * conversations as points. The engine has no counter to expose, and this is
   * the check that keeps it that way — every line this scenario can put on
   * screen, swept for the shapes a scoreboard makes.
   */
  const loaded = loadScenario('social-opening')
  const decision = loaded.decision()

  const spoken = [
    decision.explanation?.rendered.sentence,
    decision.explanation?.rendered.reason,
    decision.explanation?.rendered.followUp,
    decision.explanation?.premise,
    decision.explanation?.instead,
    decision.explanation?.insteadBecause,
    decision.explanation?.restsOn,
  ].filter((line): line is string => line !== undefined)

  it('says nothing that counts', () => {
    for (const line of spoken) {
      expect(line, line).not.toMatch(/\b\d+\s*(of|\/)\s*\d+\b/)
      expect(line, line).not.toMatch(/streak|points?\b|score|target|quota|challenge/i)
    }
  })

  it('asks for one conversation, not a number of them', () => {
    expect(decision.explanation?.rendered.sentence).toContain('one real conversation')
  })

  it('treats nobody as a target', () => {
    for (const line of spoken) {
      expect(line, line).not.toMatch(/\bapproach(es|ing)?\b/i)
      expect(line, line).not.toMatch(/\bwomen\b|\bgirls\b/i)
    }
  })
})

describe('G-004 — the outcome records comfort and result', () => {
  /*
   * Section 10's outcome list: whether the owner acted, how comfortable it
   * felt, whether an approach style was easier, whether it improved the state.
   * The two this phase can honestly collect are the result and the comfort, and
   * they are collected as separate readings on purpose — how something felt is
   * worth knowing and is not evidence about whether it worked.
   */
  const loaded = loadScenario('social-opening')
  const decision = loaded.decision()

  it('asks both, in that order', () => {
    const episode = {
      ...(collectEpisodes(loaded.view(), loaded.scenario.zone)[0] ?? {}),
      recommendation: 'X' as never,
      semantics: decision.evaluation!.candidate.semantics,
      context: undefined,
      dayId: 'x' as never,
      shownAt: loaded.scenario.now,
      state: 'completed' as const,
      startedAt: undefined,
      settledAt: loaded.scenario.now,
      declineReason: undefined,
      blocker: undefined,
      outcomes: [],
      wantedAnother: false,
    }

    const questions = outcomeQuestionsFor(episode, decision.situation.entities)
    // Whether a conversation happened is a different fact from how it felt,
    // and the order matters: the result comes first because the comfort answer
    // is about the same attempt either way (DEF-0020).
    expect(questions.map((question) => question.aspect)).toEqual(['result', 'comfort'])
    expect(questions[0]?.prompt).toBe('How much of a conversation happened at the climbing gym?')
    expect(questions[1]?.prompt).toBe('How did starting a conversation at the climbing gym feel?')
  })

  it('keeps comfort out of the evidence about whether it worked', () => {
    const episode = {
      recommendation: 'X' as never,
      semantics: decision.evaluation!.candidate.semantics,
      context: undefined,
      dayId: 'x' as never,
      shownAt: loaded.scenario.now,
      state: 'completed' as const,
      startedAt: undefined,
      settledAt: loaded.scenario.now,
      declineReason: undefined,
      blocker: undefined,
      outcomes: [],
      wantedAnother: false,
    }

    /*
     * Only an effect answer carries a sentiment, and the restriction is
     * load-bearing rather than tidy: `roughOutcomesFor` reads `worse` as "this
     * went badly", so a *result* of "none at all" wearing that flag would fire
     * the weak-topic generator on an evening that says nothing about a topic.
     */
    const [result, comfort] = outcomeQuestionsFor(episode, decision.situation.entities)
    expect(result?.answers.every((answer) => answer.sentiment === undefined)).toBe(true)
    expect(comfort?.answers.every((answer) => answer.sentiment === undefined)).toBe(true)

    // And neither is an effect question, so neither can move what the move is
    // believed to be worth.
    expect([result?.aspect, comfort?.aspect]).not.toContain('effect')
  })

  it('names the place in both questions', () => {
    const episode = {
      recommendation: 'X' as never,
      semantics: decision.evaluation!.candidate.semantics,
      context: undefined,
      dayId: 'x' as never,
      shownAt: loaded.scenario.now,
      state: 'completed' as const,
      startedAt: undefined,
      settledAt: loaded.scenario.now,
      declineReason: undefined,
      blocker: undefined,
      outcomes: [],
      wantedAnother: false,
    }

    for (const question of outcomeQuestionsFor(episode, decision.situation.entities)) {
      expect(question.prompt.toLowerCase(), question.prompt).toContain('the climbing gym')
      expect(orphanPronounsIn(question.prompt), question.prompt).toEqual([])
    }
  })
})
