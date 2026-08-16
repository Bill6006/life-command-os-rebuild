import { describe, expect, it } from 'vitest'
import { isUsable } from '../../src/domain/knowledge'
import { generateCandidates } from '../../src/intelligence/candidates'
import { assembleSituation } from '../../src/intelligence/situation'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { loadScenario } from './harness'

/**
 * A move proposed to resolve an unknown may not be penalised for that unknown.
 *
 * P4-1, found on a phone. The coverage generator proposes recalling subnetting
 * **because** nothing has come in about the studying for seven weeks, and the
 * `uncertainty` dimension then marked it down **because** nothing has come in
 * about the studying. Same fact, twice, in opposite directions, and the penalty
 * was the larger of the two:
 *
 * | move                    | uncertainty | score |
 * | ----------------------- | ----------- | ----- |
 * | a 25-minute walk        | +0.40       | 0.166 |
 * | recalling subnetting    | −1.00       | 0.139 |
 *
 * The score gap was 0.027 and the uncertainty differential was 0.054 — exactly
 * twice the margin. Section 8's third refresh route was being cancelled by the
 * staleness that created it, and the screen read as circular reasoning: nothing
 * has come in about your studying, so here is a walk, because it is better
 * supported by what is known.
 *
 * ## The class, not the case
 *
 * This is not about career. It is about **any** move whose reason for existing
 * is an unknown, and the fix is a property of the candidate rather than a
 * special case in the scorer: a candidate declares which concepts it exists to
 * resolve, and `uncertainty` has nothing to say about those. The invariant at
 * the bottom of this file is what stops a future generator forgetting.
 *
 * What it deliberately does **not** do is hand such a move a reward. Abstaining
 * is not the same as approving, and the distinction is D-048's.
 */

const ZONE_OPTIONS = { weekStartsOn: 1 } as const

function situationFor(id: string) {
  const scenario = loadScenario(id)
  return assembleSituation(scenario.view(), {
    now: scenario.scenario.now,
    zone: scenario.scenario.zone,
    ...ZONE_OPTIONS,
  })
}

function dimension(id: string, candidate: string, name: string) {
  const decision = loadScenario(id).decision()
  const row = decision.trace.ranking.find((entry) => entry.id === candidate)
  expect(row, `${candidate} did not survive on ${id}`).toBeDefined()
  const found = row?.dimensions.find((entry) => entry.name === name)
  expect(found, `${candidate} has no ${name}`).toBeDefined()
  return found!
}

// ---------------------------------------------------------------------------

describe('a move that exists to resolve an unknown is not marked down for it', () => {
  const COVERAGE_MOVE = 'coverage/recall-practice/learning-topic:subnetting'

  it('says nothing at all about the unknown it was proposed to settle', () => {
    const uncertainty = dimension('career-gone-quiet', COVERAGE_MOVE, 'uncertainty')
    expect(uncertainty.value, 'the staleness must not count against the refresh').toBe(0)
    expect(uncertainty.weight, 'and must not cost weight either — D-048').toBe(0)
  })

  it('hands it no reward for the same silence', () => {
    // Abstaining is not approving. A move that resolves everything it rests on
    // must not come out ahead of one that genuinely rests on known facts.
    const uncertainty = dimension('career-gone-quiet', COVERAGE_MOVE, 'uncertainty')
    expect(uncertainty.value).not.toBeGreaterThan(0)
  })

  it('lets the refresh win the evening it was created for', () => {
    const decision = loadScenario('career-gone-quiet').decision()
    expect(decision.evaluation?.candidate.generator).toBe('coverage')
    expect(decision.explanation?.rendered.sentence.toLowerCase()).toContain('subnetting')
  })

  it('no longer explains the choice by the very gap that raised it', () => {
    // The circular screen: "nothing has come in about your studying" above,
    // "better supported by what is known" below, both about the same fact.
    const decision = loadScenario('career-gone-quiet').decision()
    expect(decision.explanation?.insteadBecause).not.toBe('Better supported by what is known.')
  })
})

describe('uncertainty still works normally everywhere else', () => {
  it('still marks down an ordinary move resting on something unknown', () => {
    /*
     * The control, and it has to be a history where the penalty genuinely
     * applies or the test proves nothing. On "A topic that keeps slipping" the
     * career moves rest on the learning topic (known) and on how much time
     * there is tonight (never answered), so uncertainty must still bite — and
     * none of those moves resolves anything.
     */
    const decision = loadScenario('subnetting-struggle').decision()
    const penalised = decision.trace.ranking.filter((row) =>
      row.dimensions.some((entry) => entry.name === 'uncertainty' && entry.value < 0),
    )
    expect(penalised.length, 'no move was marked down for an unknown').toBeGreaterThan(0)
    for (const row of penalised) {
      const entry = row.dimensions.find((one) => one.name === 'uncertainty')
      expect(entry?.weight, 'a penalty that costs no weight is not a penalty').toBeGreaterThan(0)
      expect(entry?.note).toContain('unknown')
    }
  })

  it('still rewards a move whose evidence is all in', () => {
    const uncertainty = dimension('career-gone-quiet', 'health/move/routine:a-walk', 'uncertainty')
    expect(uncertainty.value).toBeGreaterThan(0)
    expect(uncertainty.note).toContain('known')
  })

  it('leaves every ordinary generator resolving nothing', () => {
    for (const entry of SCENARIOS) {
      const situation = situationFor(entry.id)
      for (const candidate of generateCandidates(situation)) {
        if (candidate.generator === 'coverage') continue
        if (candidate.semantics.whyNow.trigger === 'stale-evidence') continue
        expect(
          candidate.resolves,
          `${entry.id}: ${candidate.id} claims to resolve something`,
        ).toEqual([])
      }
    }
  })
})

describe('the invariant, so a future generator cannot forget', () => {
  /**
   * The rule in one sentence, swept across every candidate the library can
   * produce: **if a move is proposed because evidence has gone stale, it may
   * not then be scored down for that evidence being stale.**
   *
   * Expressed structurally: a `stale-evidence` candidate must declare, among
   * the concepts it rests on, every one that is not currently usable. A
   * generator that adds a new refresh move and forgets fails here rather than
   * quietly cancelling itself in the ranking.
   */
  it('has every stale-evidence move declare the unknowns that prompted it', () => {
    let seen = 0
    for (const entry of SCENARIOS) {
      const situation = situationFor(entry.id)
      for (const candidate of generateCandidates(situation)) {
        if (candidate.semantics.whyNow.trigger !== 'stale-evidence') continue
        seen += 1
        const unknown = candidate.leansOn.filter(
          (concept) => !isUsable(situation.view.facts.knowledgeFor(concept)),
        )
        for (const concept of unknown) {
          expect(
            candidate.resolves,
            `${entry.id}: ${candidate.id} is proposed on stale ${concept} and does not declare it`,
          ).toContain(concept)
        }
      }
    }
    expect(seen, 'no stale-evidence candidate was reached — the sweep is vacuous').toBeGreaterThan(
      0,
    )
  })

  it('never lets a move claim to resolve something it does not rest on', () => {
    for (const entry of SCENARIOS) {
      const situation = situationFor(entry.id)
      for (const candidate of generateCandidates(situation)) {
        for (const concept of candidate.resolves) {
          expect(
            candidate.leansOn,
            `${entry.id}: ${candidate.id} resolves ${concept} without resting on it`,
          ).toContain(concept)
        }
      }
    }
  })
})
