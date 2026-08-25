import { describe, expect, it } from 'vitest'
import { DOMAIN } from '../../src/domain/domains'
import {
  localAdvisor,
  MAX_NUDGE,
  nudgeBoundFor,
  validateAdvice,
  type AdvisorReply,
  type SemanticAdvisor,
} from '../../src/intelligence/advisor'
import { chosenDomain, chosenId, loadScenario } from './harness'

/**
 * Section 18's guardrails, tested against an advisor that tries to break them.
 *
 * > A model must not: silently write canonical facts without validation or
 * > provenance; invent user decisions; override explicit owner facts; bypass
 * > privacy policy; bypass hard safety constraints; turn low confidence into
 * > confident language.
 *
 * Every one of those is a thing a real model will eventually attempt, usually
 * by accident and usually in a reply that looks perfectly well formed. So the
 * fence is tested by pushing on it: the advisor below names moves that were
 * never proposed, asks for adjustments ten times the cap, speaks with certainty
 * it has not earned, and throws. None of it gets through, and the decision that
 * comes out the other side is the one the deterministic layer would have made.
 */

const tired = loadScenario('running-on-empty')

/** An advisor doing everything section 18 forbids, as convincingly as it can. */
const adversarialAdvisor: SemanticAdvisor = {
  id: 'adversarial',
  advise: (request) => {
    const real = request.candidates.map((candidate) => candidate.id)
    return {
      nudges: [
        // Overturn the decision outright.
        { candidate: real[0] ?? '', adjustment: -50, because: 'rest is overrated' },
        {
          candidate: real[1] ?? '',
          adjustment: 50,
          because: 'this will definitely work, it always does',
        },
        // Introduce a move nobody proposed.
        {
          candidate: 'career/hands-on-lab/learning-topic:quantum',
          adjustment: 1,
          because: 'why not',
        },
        // Say the same thing twice, to see if it counts twice.
        { candidate: real[0] ?? '', adjustment: -50, because: 'again' },
        // Structurally wrong in three different ways.
        { candidate: real[0] ?? '', adjustment: Number.NaN, because: 'hmm' },
        { candidate: real[0] ?? '', adjustment: 0.01, because: '' },
        { candidate: real[0] ?? '', adjustment: 0.01, because: 'x'.repeat(400) },
      ],
    } as AdvisorReply
  },
}

const brokenAdvisor: SemanticAdvisor = {
  id: 'broken',
  advise: () => {
    throw new Error('inference unavailable')
  },
}

const lyingAdvisor: SemanticAdvisor = {
  id: 'lying',
  advise: () => ({ nudges: 'not a list' }) as unknown as AdvisorReply,
}

describe('validation refuses what it cannot check', () => {
  const candidates = tired.decision().trace.ranking.map((row) => ({ id: row.id }) as never)

  it('drops a nudge that names a move nobody proposed', () => {
    const { nudges, refused } = validateAdvice(
      { nudges: [{ candidate: 'made/up/move', adjustment: 0.01, because: 'because' }] },
      candidates,
    )
    expect(nudges).toEqual([])
    expect(refused[0]?.problem).toContain('nobody proposed')
  })

  it('drops a nudge with no reason, and one with a suspiciously long one', () => {
    const real = tired.decision().evaluation?.candidate.id ?? ''
    const { nudges, refused } = validateAdvice(
      {
        nudges: [
          { candidate: real, adjustment: 0.01, because: '   ' },
          { candidate: real, adjustment: 0.01, because: 'y'.repeat(500) },
        ],
      },
      candidates,
    )
    expect(nudges).toEqual([])
    expect(refused).toHaveLength(2)
  })

  it('drops a nudge that speaks with more certainty than it has earned', () => {
    const real = tired.decision().evaluation?.candidate.id ?? ''
    const { nudges, refused } = validateAdvice(
      { nudges: [{ candidate: real, adjustment: 0.01, because: 'this always works, guaranteed' }] },
      candidates,
    )
    expect(nudges).toEqual([])
    expect(refused[0]?.problem).toContain('certainty')
  })

  it('caps an adjustment rather than obeying it', () => {
    const real = tired.decision().evaluation?.candidate.id ?? ''
    const { nudges } = validateAdvice(
      { nudges: [{ candidate: real, adjustment: 999, because: 'strongly held' }] },
      candidates,
    )
    expect(nudges[0]?.adjustment).toBe(MAX_NUDGE)
  })

  it('treats a reply that is not the agreed shape as no reply', () => {
    const { nudges, refused } = validateAdvice(
      { nudges: 'not a list' } as unknown as AdvisorReply,
      candidates,
    )
    expect(nudges).toEqual([])
    expect(refused).toHaveLength(1)
  })

  it('treats no reply at all as no reply', () => {
    expect(validateAdvice(undefined, candidates)).toEqual({ nudges: [], refused: [] })
  })
})

describe('an advisor cannot overturn a decision', () => {
  const deterministic = tired.decision()
  const attacked = tired.decision({ architecture: 'hybrid', advisor: adversarialAdvisor })

  it('leaves the chosen move exactly where it was', () => {
    // The gap between recovery and the career rep on this evening is wider than
    // anything an advisor is allowed to move. That is the point of the cap.
    expect(chosenId(attacked)).toBe(chosenId(deterministic))
    expect(chosenDomain(attacked)).toBe(DOMAIN.sleep)
  })

  it('proposes and rules out exactly the same moves', () => {
    // No candidate invented, none removed. The advisor sits between ranking and
    // choosing and can reach neither end of the pipeline.
    expect(attacked.trace.proposed).toEqual(deterministic.trace.proposed)
    expect(attacked.trace.rejected).toEqual(deterministic.trace.rejected)
  })

  it('writes nothing to history', () => {
    expect(attacked.situation.view.snapshot.records.length).toBe(
      deterministic.situation.view.snapshot.records.length,
    )
    for (const record of attacked.situation.view.snapshot.records) {
      expect(record.provenance.source).not.toBe('model')
    }
  })

  it('changes nothing the owner said', () => {
    const readings = (decision: typeof deterministic) =>
      decision.trace.facts.map((fact) => `${fact.concept}=${fact.state}:${fact.reading}`)
    expect(readings(attacked)).toEqual(readings(deterministic))
  })

  it('never gets a word onto an owner surface', () => {
    /*
     * The strongest of the guardrails, and the reason it is structural rather
     * than checked: the advisor's interface has no field the owner can read. It
     * can hold an opinion about a margin; it cannot phrase anything. So "turn
     * low confidence into confident language" is not a rule it obeys — it is a
     * thing it has no way to attempt.
     */
    const spoken = [
      attacked.explanation?.rendered.sentence,
      attacked.explanation?.rendered.reason,
      attacked.explanation?.rendered.followUp,
      attacked.explanation?.premise,
    ].join(' ')

    expect(spoken).not.toContain('rest is overrated')
    expect(spoken).not.toContain('definitely')
    expect(spoken.toLowerCase()).not.toContain('adversarial')
  })

  it('says in the trace what it refused and why', () => {
    // Only the first nudge for a given move is considered, so the later ones
    // are reported as duplicates rather than for whatever else is wrong with
    // them. The shape checks themselves are covered above, one at a time.
    const notes = attacked.trace.notes.join('\n')
    expect(notes).toContain('nobody proposed')
    expect(notes).toContain('certainty')
    expect(notes).toContain('named twice')
  })

  it('records the adjustment it was actually allowed, not the one it asked for', () => {
    /*
     * The bound is the field's now, not a constant — AUD-0039.
     *
     * `MAX_NUDGE` was chosen against an assumed score range, and on the range
     * the evaluator actually produced it would have reversed most rankings the
     * audit observed. What is allowed on this decision is a quarter of this
     * decision's own spread, capped at the old absolute — so the number in the
     * trace is derived rather than fixed, and what is asserted is the property:
     * the advisor asked for −50 and was allowed a fraction of the field.
     */
    const applied = attacked.trace.notes.find((note) => note.includes('moved'))
    expect(applied).not.toContain('-50')

    const scores = attacked.trace.ranking.map((row) => row.score)
    const bound = nudgeBoundFor(scores)
    expect(bound).toBeGreaterThan(0)
    expect(bound).toBeLessThanOrEqual(MAX_NUDGE)
    expect(applied).toContain(`-${bound.toFixed(2)}`)
  })

  it('cannot turn over a contest wider than half the field — AUD-0039', () => {
    /*
     * The sentence the old comment made, now a property rather than a hope.
     *
     * A nudge reaches a quarter of the spread, so two candidates can be moved
     * past each other only if they were inside **half** the spread to begin
     * with — one lifted a quarter and the other dropped a quarter. Asserted on
     * the arithmetic rather than on a scenario, because it is a claim about
     * every possible field and not about the ones the library happens to hold.
     */
    for (const spread of [0.01, 0.05, 0.1, 0.3, 1, 2]) {
      const bound = nudgeBoundFor([spread, 0])
      expect(2 * bound, `spread ${spread}`).toBeLessThanOrEqual(spread / 2 + 1e-9)
    }
  })

  it('has nothing to reach with when there is no contest at all', () => {
    // One candidate is not a close call, it is the only call — and an opinion
    // about a margin that does not exist is an opinion about nothing.
    expect(nudgeBoundFor([0.4])).toBe(0)
    expect(nudgeBoundFor([])).toBe(0)
  })
})

describe('an advisor that fails is an advisor that is ignored', () => {
  it('still produces the deterministic decision when inference throws', () => {
    const deterministic = tired.decision()
    const withBroken = tired.decision({ architecture: 'hybrid', advisor: brokenAdvisor })

    expect(withBroken.kind).toBe('move')
    expect(chosenId(withBroken)).toBe(chosenId(deterministic))
    expect(withBroken.trace.notes.join('\n')).toContain('inference unavailable')
  })

  it('still produces one when the reply is nonsense', () => {
    const withLying = tired.decision({ architecture: 'hybrid', advisor: lyingAdvisor })
    expect(withLying.kind).toBe('move')
    expect(chosenDomain(withLying)).toBe(DOMAIN.sleep)
  })
})

describe('the local advisor stays inside the same fence', () => {
  it('only ever proposes bounded nudges with reasons', () => {
    const decision = tired.decision({ architecture: 'hybrid', advisor: localAdvisor })
    const reply = localAdvisor.advise({
      block: 'evening',
      limiter: undefined,
      notes: ['the /26 boundaries went wrong twice'],
      candidates: decision.trace.ranking.map((row) => ({
        id: row.id,
        verb: 'review-weak-topic' as const,
        domain: DOMAIN.career,
        subject: 'subnetting',
        score: row.score,
      })),
    })

    for (const nudge of reply?.nudges ?? []) {
      expect(Math.abs(nudge.adjustment)).toBeLessThanOrEqual(MAX_NUDGE)
      expect(nudge.because.length).toBeGreaterThan(0)
    }
  })

  it('has nothing to say when there is no free text to read', () => {
    const reply = localAdvisor.advise({
      block: 'evening',
      limiter: undefined,
      notes: [],
      candidates: [],
    })
    expect(reply?.nudges).toEqual([])
  })
})
