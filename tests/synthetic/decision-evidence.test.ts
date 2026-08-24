import { describe, expect, it } from 'vitest'
import { evidenceForDecision, MIN_FOR_A_RATE } from '../../src/intelligence/insights'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { loadScenario, ORPHAN_PRONOUNS } from './harness'

/**
 * "See evidence" for the recommendation currently on screen
 * (canonical plan section 51).
 *
 * The plan lists what this must be able to expose — the current conditions that
 * materially influenced the choice, comparable situations, prior outcomes for
 * the move, sample size and counterexamples, confidence, and why the chosen
 * move beat the strongest credible alternative — and, in the same breath,
 * forbids the thing that makes all of that easy to produce:
 *
 * > Do not create a second analytics engine, a second recommendation brain, or
 * > a parallel explanation truth.
 *
 * So the tests that matter here are not "does it show a number". They are
 * **does every number and every sentence come from the decision itself**. A
 * panel that agrees with the decision today because both were computed
 * correctly is a panel that will disagree with it eventually; a panel that
 * *reads* the decision cannot.
 */

function evidenceOn(id: string) {
  const decision = loadScenario(id).decision()
  return { decision, evidence: evidenceForDecision(decision) }
}

describe('across every history in the library', () => {
  it('offers evidence exactly when there is a move on screen', () => {
    for (const scenario of SCENARIOS) {
      const { decision, evidence } = evidenceOn(scenario.id)
      expect(
        evidence !== undefined,
        `${scenario.id}: a ${decision.kind} evening with evidence ${evidence === undefined ? 'missing' : 'offered'}`,
      ).toBe(decision.kind === 'move')
    }
  })

  it('is the move Now is already showing, word for word', () => {
    for (const scenario of SCENARIOS) {
      const { decision, evidence } = evidenceOn(scenario.id)
      if (evidence === undefined) continue
      expect(evidence.move, scenario.id).toBe(decision.explanation?.rendered.sentence)
    }
  })

  it('cites only conditions the decision actually leaned on', () => {
    /*
     * The rule `explain.ts` already holds for the reason, applied to the
     * evidence: a panel that reached for whichever fact was nearest would
     * produce something that sounds like reasoning and is not. DEF-0006 is the
     * worked example — a sleep figure offered as the reason a walk won, on a
     * move whose evidence is energy and soreness.
     */
    for (const scenario of SCENARIOS) {
      const { decision, evidence } = evidenceOn(scenario.id)
      if (evidence === undefined || decision.evaluation === undefined) continue
      const leansOn = new Set(decision.evaluation.candidate.leansOn)
      for (const condition of evidence.conditions) {
        expect(
          leansOn.has(condition.concept),
          `${scenario.id}: cites ${condition.label}, which the choice did not rest on`,
        ).toBe(true)
      }
    }
  })

  it('states the belief in the words Now already used, never a second version', () => {
    /*
     * Found by reading the rendered panel. Now prints "Reset a space has made
     * little difference in situations like tonight" directly above a panel
     * reporting "8 of 12 made a difference afterwards" — two honest statements
     * about different quantities, with nothing on screen reconciling them.
     *
     * The fix is not to suppress one. It is that the panel carries the same
     * sentence, from the same place, so the counts underneath explain it — and
     * that `context` says which side of the split tonight falls on, which is
     * what the difference between the two numbers actually is.
     */
    for (const scenario of SCENARIOS) {
      const { decision, evidence } = evidenceOn(scenario.id)
      if (evidence === undefined) continue
      expect(evidence.concluded, scenario.id).toBe(decision.explanation?.restsOn)
    }
  })

  it('does not repeat the runner-up that Now prints two lines above it', () => {
    /*
     * Section 61's repeated boilerplate, on the screen with the least room for
     * it. "Chosen over" and "Why this one" have been in Now's first view since
     * Phase 2 and are still there; the panel deliberately carries no copy of
     * them, which is why `DecisionEvidence` has no runner-up field at all
     * rather than one nothing renders.
     */
    const fields = Object.keys(evidenceOn('what-worked').evidence ?? {})
    expect(fields).not.toContain('instead')
    expect(fields).not.toContain('limiter')
  })

  it('counts the same comparable episodes the belief was built from', () => {
    /*
     * The heart of it. `learning.ts` selects "situations like this one" and
     * `insights.ts` counts raw answers over that same selection, so the sample
     * behind the figures on this panel is the sample behind the belief the
     * ranking used. The trace's own `samples` for the chosen candidate is the
     * lower bound of that set: it counts episodes with an *answered effect*,
     * which is a subset of the comparable ones.
     */
    for (const scenario of SCENARIOS) {
      const { decision, evidence } = evidenceOn(scenario.id)
      if (evidence === undefined || decision.evaluation === undefined) continue
      const row = decision.trace.learning.find(
        (entry) => entry.candidate === decision.evaluation?.candidate.id,
      )
      if (row === undefined) continue
      expect(
        evidence.confidence.comparable,
        `${scenario.id}: fewer comparable evenings than the belief counted`,
      ).toBeGreaterThanOrEqual(row.samples)
    }
  })

  it('prints no figure without a defensible denominator and a named quantity', () => {
    for (const scenario of SCENARIOS) {
      const { evidence } = evidenceOn(scenario.id)
      if (evidence === undefined) continue
      for (const rate of evidence.rates) {
        expect(rate.measures.length, `${scenario.id}: an unlabelled figure`).toBeGreaterThan(10)
        if (rate.percent === undefined) {
          expect(rate.withheld).toBeTruthy()
          continue
        }
        expect(rate.of, `${scenario.id}: ${rate.percent}% over ${rate.of}`).toBeGreaterThanOrEqual(
          MIN_FOR_A_RATE,
        )
      }
    }
  })

  it('speaks in ordinary language, with no machinery and no lost nouns', () => {
    const machinery =
      /\bconfidence interval\b|\bp-?value\b|\bcorrelat|\bstatistical|\bsignifican|\bregression\b|\bprior\b|\bposterior\b|\bnever-observed\b|\bcontradicted\b/i
    for (const scenario of SCENARIOS) {
      const { evidence } = evidenceOn(scenario.id)
      if (evidence === undefined) continue

      const lines = [
        evidence.comparable,
        evidence.context ?? '',
        ...evidence.conditions.map((condition) => `${condition.label}: ${condition.reading}`),
        ...evidence.reasoning,
      ]
      for (const line of lines) {
        expect(machinery.test(line), `${scenario.id}: "${line}"`).toBe(false)
      }

      /*
       * DEF-0007's class. `ConsideredFact.reading` spells an absence as
       * "not known — never-observed", using the gap's own identifier — QA
       * language, and it used to reach this panel. An unknown condition still
       * appears (it is part of why the app is hedging); what it may not do is
       * arrive in the inspector's words.
       */
      for (const condition of evidence.conditions) {
        if (condition.known) continue
        expect(condition.reading, `${scenario.id}: ${condition.label}`).toBe('Not known yet')
      }
    }
  })

  it('never withholds a private reading by omitting it', () => {
    // Section 11 and `privacy.ts`'s contract: show that it exists, not what it
    // says. A condition the choice rested on that happened to be private must
    // still be listed, with a placeholder.
    for (const scenario of SCENARIOS) {
      const { decision, evidence } = evidenceOn(scenario.id)
      if (evidence === undefined || decision.evaluation === undefined) continue
      const privateFacts = decision.situation.considered.filter(
        (fact) =>
          fact.privacy === 'private' &&
          decision.evaluation?.candidate.leansOn.includes(fact.concept),
      )
      for (const fact of privateFacts) {
        const shown = evidence.conditions.find((condition) => condition.concept === fact.concept)
        expect(shown, `${scenario.id}: ${fact.label} dropped instead of withheld`).toBeDefined()
        expect(shown?.reading).toBe('Private entry')
      }
    }
  })
})

describe('an evening with nothing like it in the record', () => {
  it('says so rather than manufacturing a figure', () => {
    const { evidence } = evidenceOn('subnetting-struggle')
    expect(evidence?.comparable).toMatch(/[Nn]othing in the record is much like this evening/)
    expect(evidence?.rates).toEqual([])
    expect(evidence?.confidence.word).toBe('too early to say')
    expect(evidence?.counterexamples).toEqual([])
  })

  it('still says what the choice rested on', () => {
    // The honest version of "not enough evidence yet" is not an empty panel:
    // the conditions and the alternative are real and are what the owner asked
    // about when he tapped.
    const { decision, evidence } = evidenceOn('subnetting-struggle')
    expect(evidence?.conditions.length).toBeGreaterThan(0)
    // Nothing has been learned about this move yet, so Now states no belief and
    // neither does the panel. A line saying "this rests on nothing yet" would
    // be the app talking about itself, which DEF-0005 removed from Now once.
    expect(evidence?.concluded).toBeUndefined()
    expect(decision.explanation?.instead, 'the tradeoff is still on Now').toBeDefined()
  })
})

describe('an evening with a month behind it', () => {
  const { evidence } = evidenceOn('what-worked')

  it('counts the comparable evenings and says what happened on them', () => {
    expect(evidence?.comparable).toMatch(/4 occasions/)
    const effect = evidence?.rates.find((rate) => rate.aspect === 'downstream-effect')
    expect(effect?.hit).toBe(4)
    expect(effect?.of).toBe(4)
    expect(effect?.percent).toBe(100)
    expect(effect?.measures).toMatch(/made a difference afterwards/)
  })

  it('keeps the four quantities apart, each with its own sentence', () => {
    const measures = (evidence?.rates ?? []).map((rate) => rate.measures)
    expect(new Set(measures).size).toBe(measures.length)
    for (const line of measures) {
      expect(line, `"${line}" does not name a single quantity`).toMatch(
        /got all the way there|made a difference afterwards|felt easy|could actually be done/,
      )
    }
  })
})

describe('an evening where the same move goes differently by context', () => {
  const { evidence } = evidenceOn('long-run')

  it('says where it goes better, and says which set that figure is over', () => {
    /*
     * The two sets of counts on this panel are over different collections of
     * evenings — those like tonight, and every occasion — and a reader
     * comparing them is entitled to know that. Without the framing this is
     * DEF-0033 as two numbers instead of two sentences: Insights leading a card
     * on 6-of-6 against 2-of-6 while Now quotes 8 of 12, with nothing on either
     * screen to reconcile them.
     */
    expect(evidence?.context).toMatch(/Across every occasion, not only the ones like this evening/)
    expect(evidence?.context).toMatch(/weekday/)
    expect(evidence?.context).toMatch(/weekend/)
    // And which side tonight is on, which is the clause that makes the app's
    // own conclusion legible against the plain tally above it.
    expect(evidence?.context).toMatch(/This evening is at the weekend\./)
  })

  it('names the counterexamples rather than averaging them into the figure', () => {
    expect((evidence?.counterexamples ?? []).length).toBeGreaterThan(0)
    for (const line of evidence?.counterexamples ?? []) {
      expect(line.text).toMatch(/^\d+ [A-Z][a-z]+ — /)
      const words = line.text.toLowerCase().match(/[a-z']+/g) ?? []
      expect(words.filter((word) => (ORPHAN_PRONOUNS as readonly string[]).includes(word))).toEqual(
        [],
      )
    }
  })
})
