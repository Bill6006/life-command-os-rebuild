import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { evidenceForDecision, MIN_FOR_A_RATE } from '../../src/intelligence/insights'
import { createKit } from '../../src/synthetic/kit'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { decideOn, loadScenario, ORPHAN_PRONOUNS } from './harness'

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

// ---------------------------------------------------------------------------
// 81.4 — honest sentences
// ---------------------------------------------------------------------------

/** Every sentence the reason and its clauses can put on Now, per scenario. */
function reasonsAcrossTheLibrary(): readonly { id: string; reason: string }[] {
  return SCENARIOS.map((scenario) => ({
    id: scenario.id,
    reason: loadScenario(scenario.id).decision().explanation?.rendered.reason ?? '',
  })).filter((entry) => entry.reason !== '')
}

describe('AUD-0027 — the app says the best thing it knows about his own life', () => {
  it('puts the observed relationship on Now, not only in the probe', () => {
    /*
     * "Two months of readings, and nothing graded", Saturday 18:10. Now said
     * *"Move for 25 minutes: a walk. / There is enough in the tank for a walk,
     * and the evening suits it."* while the ranking carried, one layer down,
     * *"+0.50 — current energy rose 11 of 14 times with it and 4 of 14 without,
     * across the record."* Section 4.6 asks for the specific ordinary sentence
     * over the elegant generic one, and the specific one already existed.
     */
    const reason = loadScenario('observed-evenings').decision().explanation?.rendered.reason ?? ''
    expect(reason.toLowerCase()).toContain('more often been')
    expect(reason.toLowerCase()).toContain('a walk')
    expect(reason.toLowerCase()).toContain('than without')
  })

  it('states an association and never a cause — D-089, D-066', () => {
    // "Has more often been higher afterwards" is a statement about the record.
    // "Does you good" would be a claim about the world that a comparison of two
    // proportions cannot carry, in either direction.
    for (const { id, reason } of reasonsAcrossTheLibrary()) {
      expect(reason, id).not.toMatch(/\bcauses?\b|\bcaused\b|\bimproves?\b|\bboosts?\b/i)
      expect(reason, id).not.toMatch(/\bmakes? you\b|\bcosts you\b|\bleads to\b/i)
    }
  })

  it('never ships the inspector’s register to the owner — DEF-0040', () => {
    /*
     * The dimension's `note` is diagnostics copy: it names dimensions, quotes
     * both sides of a comparison and says "across the record". `ConsideredFact.reading`
     * was written that way, reused verbatim on the evidence panel, and shipped
     * "not known — never-observed" to the owner. A `phrase` exists precisely so
     * the two registers cannot be confused.
     */
    for (const { id, reason } of reasonsAcrossTheLibrary()) {
      expect(reason, id).not.toMatch(/%/)
      expect(reason, id).not.toMatch(/observed-change|bottleneck-fit|direction-fit|context-fit/)
      expect(reason, id).not.toMatch(/across the record|\bpull\b|\bsamples?\b|\bweight\b/i)
      expect(reason, id).not.toMatch(/\brose \d+ of \d+/i)
    }
  })

  it('keeps D-031 unwidened, so a dimension may only speak from what was leaned on', () => {
    /*
     * The half of AUD-0027 that is **not** shipped, asserted rather than left
     * implicit (D-114). Surfacing "you have passed on this fourteen times"
     * needs the DEF-0006 rule widened from *concepts in `leansOn`* to *concepts
     * in `leansOn` plus dimensions that materially moved the score* — an
     * amendment to a Blocker's fix — and the audit calls that the riskiest copy
     * it proposes with no wording it is willing to endorse.
     */
    for (const { id, reason } of reasonsAcrossTheLibrary()) {
      expect(reason, id).not.toMatch(/passed on|turned .* down|said no to/i)
    }
  })
})

describe('AUD-0032 — a guess is spoken as a guess', () => {
  /**
   * The same Monday afternoon, with energy known or worked out.
   *
   * A `derived` reading resolves to `inferred` and takes the concept's own
   * reliability as its confidence (D-014, D-059), which for energy is 0.4 —
   * below the bar. An owner-reported one is `explicit` and stands on its own.
   */
  function afternoonWithEnergy(from: 'owner' | 'derived') {
    const kit = createKit(
      from === 'owner' ? 'HE1' : 'HE2',
      'America/Denver',
      '2026-05-01T12:00:00Z',
    )
    const walkable = kit.record(
      'observation',
      { occurredAt: kit.local('2026-05-11', '14:00'), domains: [DOMAIN.health] },
      { concept: CONCEPT.energy, value: { type: 'scale', value: 2, of: 5 }, method: 'self-report' },
    )
    const sore = kit.record(
      'observation',
      { occurredAt: kit.local('2026-05-11', '14:00'), domains: [DOMAIN.health] },
      {
        concept: CONCEPT.soreness,
        value: { type: 'scale', value: 0, of: 5 },
        method: 'self-report',
      },
    )
    const nights = [7.5, 7.75, 8].map((value, offset) =>
      kit.record(
        'observation',
        {
          occurredAt: kit.local(`2026-05-${String(9 + offset).padStart(2, '0')}`, '07:00'),
          domains: [DOMAIN.sleep],
        },
        {
          concept: CONCEPT.sleepHours,
          value: { type: 'number', value, unit: 'hours' },
          method: 'self-report',
        },
      ),
    )

    const energy =
      from === 'owner'
        ? walkable
        : { ...walkable, provenance: { source: 'derived' as const, writtenBy: 'derived' } }

    return kit.document({
      entities: [],
      records: [energy, sore, ...nights],
      exportedAt: kit.local('2026-05-11', '15:05'),
    })
  }

  const at = createKit('HE0', 'America/Denver', '2026-05-01T12:00:00Z').local('2026-05-11', '15:05')
  const zone = createKit('HE0', 'America/Denver', '2026-05-01T12:00:00Z').zone

  it('hedges a low-confidence inference and names what it rests on', () => {
    const decision = decideOn(afternoonWithEnergy('derived'), at, zone)
    expect(decision.situation.capacity.energy.state, 'the fixture should infer').toBe('inferred')
    const reason = decision.explanation?.rendered.reason ?? ''
    expect(reason).toMatch(/going on how the last few days have gone/i)
  })

  it('does not hedge a reading the owner actually gave', () => {
    // The opposite failure is real: over-hedging every sentence would be worse
    // than the defect, so the bar is a stated one rather than a mood.
    const decision = decideOn(afternoonWithEnergy('owner'), at, zone)
    expect(decision.situation.capacity.energy.state).toBe('explicit')
    const reason = decision.explanation?.rendered.reason ?? ''
    expect(reason).not.toMatch(/going on how the last few days have gone/i)
    expect(reason).toMatch(/there is enough in the tank|energy is good|nothing is sore/i)
  })

  it('makes no flat assertion from a sub-threshold inference, anywhere in the library', () => {
    for (const scenario of SCENARIOS) {
      const decision = loadScenario(scenario.id).decision()
      const energy = decision.situation.capacity.energy
      if (energy.state !== 'inferred' || energy.confidence >= 0.7) continue
      const reason = decision.explanation?.rendered.reason ?? ''
      if (reason === '') continue
      expect(reason, scenario.id).not.toMatch(/^there is enough in the tank/i)
      expect(reason, scenario.id).not.toMatch(/^energy is good/i)
    }
  })
})

describe('AUD-0028 — two lines about one move that a reader can reconcile', () => {
  it('makes one month and nine months say materially different things', () => {
    /*
     * Section 64, run properly. Both histories produced byte-identical
     * recommendation *and* explanation — *"The kitchen table is buried again —
     * and it costs you the start of every evening. / Why this one: Pays back
     * more tomorrow."* — with the only difference one advisory line below,
     * which said the move had made little difference while the reason asserted
     * what it cost him.
     */
    const month = loadScenario('what-worked').decision()
    const months = loadScenario('long-run').decision()

    expect(month.explanation?.rendered.reason).toBeDefined()
    expect(months.explanation?.rendered.reason).toBeDefined()
    expect(months.explanation?.rendered.reason).not.toBe(month.explanation?.rendered.reason)
    expect(months.explanation?.rendered.reason).toMatch(/made little difference/i)
  })

  it('asserts nothing causal about his own evenings', () => {
    // The clause that went: "— and it costs you the start of every evening" is
    // a causal claim with nothing behind it, and a constant cannot be falsified
    // by evidence because no evidence reaches it (section 68, D-066, D-089).
    for (const { id, reason } of reasonsAcrossTheLibrary()) {
      expect(reason, id).not.toMatch(/costs you the start of every evening/i)
    }
  })
})

describe('AUD-0026 — the app says what the choice cost', () => {
  it('names the cost when the winner is against the week the owner set', () => {
    /*
     * "Three broken nights, and a deadline": the app chooses recovery over the
     * CCNA session in the same week the owner set the CCNA push as his
     * direction, `direction-fit` scored −0.30, and the screen said none of it.
     */
    const decision = loadScenario('running-on-empty').decision()
    const direction = decision.evaluation?.dimensions.find((d) => d.name === 'direction-fit')
    expect((direction?.value ?? 0) * (direction?.weight ?? 0)).toBeLessThan(0)
    expect(decision.explanation?.rendered.reason).toMatch(/the week is pointed at/i)
  })

  it('says nothing about a cost when the move is what the week is about', () => {
    const decision = loadScenario('rested-and-behind').decision()
    expect(decision.explanation?.rendered.reason).not.toMatch(/the week is pointed at/i)
  })

  it('reads as a considered trade rather than an apology', () => {
    for (const { id, reason } of reasonsAcrossTheLibrary()) {
      expect(reason, id).not.toMatch(/sorry|unfortunately|afraid|apolog|i know you|forgive/i)
    }
  })
})

describe('AUD-0033 — a near-tie does not read like a clear win', () => {
  it('says so when the margin is inside the arbiter’s own threshold', () => {
    /*
     * "Nine months of evenings", Saturday 19:30: the probe read *"chosen at
     * 0.137 from 4 that fitted"* and *"close — …/recall-practice came in at
     * 0.135, 0.002 behind"*, and Now showed a flat declarative recommendation.
     * A 0.002 margin and a 0.2 margin produced identical screens.
     */
    const decision = loadScenario('long-run').decision()
    const chosen = decision.evaluation?.score ?? 0
    const runnerUp = decision.trace.ranking[1]?.score ?? 0
    expect(chosen - runnerUp).toBeLessThanOrEqual(0.02)
    expect(decision.explanation?.closeCall).toBeDefined()
    expect(decision.explanation?.closeCall).toMatch(/close call/i)
  })

  it('stays quiet when the winner is clear', () => {
    const decision = loadScenario('morning-after-bad-nights').decision()
    const chosen = decision.evaluation?.score ?? 0
    const runnerUp = decision.trace.ranking[1]?.score ?? 0
    expect(chosen - runnerUp).toBeGreaterThan(0.02)
    expect(decision.explanation?.closeCall).toBeUndefined()
  })

  it('does not present a single candidate as a choice', () => {
    for (const scenario of SCENARIOS) {
      const decision = loadScenario(scenario.id).decision()
      if (decision.trace.ranking.length !== 1) continue
      expect(decision.explanation?.instead, scenario.id).toBeUndefined()
      expect(decision.explanation?.closeCall, scenario.id).toBeUndefined()
    }
  })

  it('does not fire on most evenings, which would be evidence for AUD-0035', () => {
    // The audit's own instruction: measure how often it fires before shipping
    // the clause. If it fired on most evenings that would be evidence the score
    // scale has collapsed (AUD-0035) rather than a reason to suppress it.
    const spoken = SCENARIOS.map((scenario) => loadScenario(scenario.id).decision()).filter(
      (decision) => decision.explanation !== undefined,
    )
    const close = spoken.filter((decision) => decision.explanation?.closeCall !== undefined)
    expect(close.length, 'a close call on every evening is a scale problem').toBeLessThan(
      spoken.length / 2,
    )
    expect(close.length, 'the clause never fires, so nothing is being tested').toBeGreaterThan(0)
  })
})
