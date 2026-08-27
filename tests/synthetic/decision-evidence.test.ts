import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { evidenceForDecision, MIN_FOR_A_RATE } from '../../src/intelligence/insights'
import { createKit } from '../../src/synthetic/kit'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { civilDateFromDayId, instantAtLocal, localDayIdAt, timeZone } from '../../src/domain/time'
import { decide } from '../../src/intelligence/engine'
import { nextGuideStep } from '../../src/intelligence/guide'
import { answerRecord } from '../../src/intelligence/questions'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
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
    /*
     * A deferral counts, and AUD-0024 is why — a `hold` is a real ranked move
     * with a real reason, and the app is asking the owner to wait on the
     * strength of it. If anything, it is the state he is most likely to want to
     * check: "not now" is a harder claim to take on trust than "do this".
     *
     * The two states that offer nothing are the two with nothing behind them:
     * no-action has no move to explain.
     */
    for (const scenario of SCENARIOS) {
      const { decision, evidence } = evidenceOn(scenario.id)
      expect(
        evidence !== undefined,
        `${scenario.id}: a ${decision.kind} evening with evidence ${evidence === undefined ? 'missing' : 'offered'}`,
      ).toBe(decision.kind !== 'no-action')
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

  it('answers the question the decision on screen actually raises', () => {
    /*
     * QA-82-002, and the reason the two invariants above were not enough.
     *
     * They ask whether the panel names the rendered move and cites only what
     * that move leaned on. Both are true of a `hold` and neither is the point:
     * on a hold the app is declining to offer the move, so *why this?* means
     * *why not yet?*, and a list of conditions about the move cannot answer it.
     * The panel passed every check in this file while saying nothing about the
     * only decision on the screen.
     *
     * Written as a rule about the kind rather than about a scenario, so the
     * sixth decision state fails this the day it exists.
     */
    for (const scenario of SCENARIOS) {
      const { decision, evidence } = evidenceOn(scenario.id)
      if (evidence === undefined) continue
      if (decision.kind === 'hold') {
        expect(
          evidence.deferral.length,
          `${scenario.id}: a held decision whose panel does not say why later`,
        ).toBeGreaterThan(0)
      } else {
        expect(
          evidence.deferral,
          `${scenario.id}: a ${decision.kind} explaining a deferral it did not make`,
        ).toEqual([])
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
  /*
   * The same nine months, read on the Friday and on the Saturday — AUD-0035.
   *
   * Clearing the kitchen helped on all six weekday evenings and on two of six
   * weekends, and 2026-11-14 is a Saturday. Before the re-cut the app picked
   * the kitchen on both, because 5.3 units of dead weight compressed every
   * candidate toward the middle and the ordering came out of the compression
   * rather than out of the evidence. It now picks the kitchen on the Friday and
   * something else on the Saturday — which is the app acting on the very split
   * the panel below describes, on a history built to have one.
   *
   * So the panel is read on the day it belongs to. That is not a convenience:
   * the evidence panel explains the move on screen, and on the Saturday the
   * kitchen is not the move on screen.
   */
  const kit = createKit('LRE', 'America/Denver', '2026-01-01T12:00:00Z')
  const loaded = loadScenario('long-run')
  const friday = kit.local('2026-11-13', '19:30')
  const onFriday = decide(loaded.viewAt(friday), { now: friday, zone: loaded.scenario.zone })
  const evidence = evidenceForDecision(onFriday)

  it('picks the move whose record says it works on a day like this one', () => {
    expect(onFriday.evaluation?.candidate.semantics.target.verb).toBe('reset-space')
    // And not on the Saturday, where the same record says it mostly does not.
    expect(
      loadScenario('long-run').decision().evaluation?.candidate.semantics.target.verb,
    ).not.toBe('reset-space')
  })

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
    expect(evidence?.context).toMatch(/This evening is on a weekday\./)
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

    /*
     * And the learned-band clause, read on the evening the move is on screen.
     *
     * Both histories are about clearing the kitchen, and after the re-cut the
     * nine-month one no longer offers it on a Saturday — because its own record
     * says the move mostly does not land at the weekend (AUD-0035). The clause
     * is what it always was; the evening it appears on is the weekday one.
     */
    const kit = createKit('LRC', 'America/Denver', '2026-01-01T12:00:00Z')
    const loaded = loadScenario('long-run')
    const friday = kit.local('2026-11-13', '19:30')
    const onFriday = decide(loaded.viewAt(friday), { now: friday, zone: loaded.scenario.zone })
    expect(onFriday.explanation?.rendered.reason).toMatch(/made little difference/i)
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

/**
 * Every hour of every history, not one hour of each — QA-81-002.
 *
 * The finding was reproduced at 15:00 and held at evening and late night. It
 * did not hold in the morning, which is the hour the library sweep above reads
 * for that scenario, and is why a sweep that looked like coverage saw none of
 * it.
 */
function reasonsAcrossEveryBlock(): readonly { id: string; block: string; reason: string }[] {
  const rows: { id: string; block: string; reason: string }[] = []
  for (const scenario of SCENARIOS) {
    const loaded = snapshotFromWire(scenario.build())
    const date = civilDateFromDayId(localDayIdAt(scenario.now, scenario.zone))
    for (const hour of [6, 10, 15, 20, 23]) {
      const now = instantAtLocal({ ...date, hour, minute: 0, second: 0 }, scenario.zone)
      const moment = { now, zone: scenario.zone, weekStartsOn: scenario.weekStartsOn ?? 1 }
      const decision = decide(buildView(loaded.snapshot, moment), moment)
      const reason = decision.explanation?.rendered.reason
      if (reason === undefined) continue
      rows.push({ id: scenario.id, block: decision.situation.block, reason })
    }
  }
  return rows
}

/**
 * The claims a reason is not entitled to make about anything but the move on
 * screen.
 *
 * Enumerated rather than gestured at, because "does not endorse the loser" is
 * only a test if what counts as endorsing is written down. Each of these is a
 * verdict — a statement that some option is the one to take — and the screen
 * already carries exactly one of those, in the headline.
 */
const A_VERDICT =
  /\b(the better call|the better choice|looks like the better|is the better|the right call|the best call|worth more than|makes more sense|still the one)\b/i

describe('QA-81-002 — the trade-off never endorses what was set aside', () => {
  it('does not call subnetting the better call while putting subnetting down', () => {
    /*
     * The exact reproduction. "A morning after three bad nights" at 15:00
     * America/Denver, where the app chooses recovery over the CCNA session:
     *
     * > Take the rest of the afternoon as recovery — no subnetting session.
     * > ... The week is pointed at the CCNA push, and subnetting still looks
     * > like the better call.
     *
     * `costClause` was handed the chosen move's `target.object`, and for a
     * `recover` move that object is the thing being put down. So the clause
     * recommended, in the app's own voice, the move the app had just rejected —
     * and the screen listed that same move under "Chosen over".
     */
    const scenario = SCENARIOS.find((entry) => entry.id === 'morning-after-bad-nights')
    expect(scenario, 'the reproduction history is gone').toBeDefined()
    expect(scenario!.zone, 'the reproduction moved zone').toBe(timeZone('America/Denver'))

    const loaded = snapshotFromWire(scenario!.build())
    const afternoon = instantAtLocal(
      {
        ...civilDateFromDayId(localDayIdAt(scenario!.now, scenario!.zone)),
        hour: 15,
        minute: 0,
        second: 0,
      },
      scenario!.zone,
    )
    const moment = {
      now: afternoon,
      zone: scenario!.zone,
      weekStartsOn: scenario!.weekStartsOn ?? 1,
    }
    const decision = decide(buildView(loaded.snapshot, moment), moment)

    const reason = decision.explanation?.rendered.reason ?? ''
    expect(decision.situation.block, 'the reproduction moved off its hour').toBe('afternoon')
    expect(reason, 'the trade-off clause is gone rather than fixed').toMatch(
      /the week is pointed at/i,
    )
    expect(reason, reason).not.toMatch(A_VERDICT)
  })

  it('makes no verdict about an alternative, at any hour of any history', () => {
    /*
     * The class, not the sentence. The defect was not the word "subnetting": it
     * was a composed clause completing itself with a noun it had not derived
     * from the thing the clause was about. Any such clause can name the loser,
     * so what is held here is the whole rendered reason — and it is held at
     * every block, because the finding was invisible at the one hour the
     * library sweep reads.
     */
    const rows = reasonsAcrossEveryBlock()
    expect(rows.length, 'the sweep found no reasons at all').toBeGreaterThan(20)
    for (const row of rows) {
      expect(row.reason, `${row.id} (${row.block}): ${row.reason}`).not.toMatch(A_VERDICT)
    }
  })

  it('still says what the choice cost — the clause was repaired, not deleted', () => {
    /*
     * D-108's other half. "Says nothing" passes every falsehood test ever
     * written, so the repair has to be held against the promise it was made
     * under: AUD-0026 asks the app to name the trade, and section 6 lists it
     * among the ten things Now must be able to show.
     */
    const rows = reasonsAcrossEveryBlock()
    const traded = rows.filter((row) => /the week is pointed at|the goal you set/i.test(row.reason))
    expect(traded.length, 'no history names a cost any more').toBeGreaterThan(0)

    // And the half that says what was actually short, which is the clause that
    // used to be occupied by a verdict.
    const named = traded.filter((row) =>
      /rest is what is short|the body is asking for less|there is not much of the day left|time away from it/i.test(
        row.reason,
      ),
    )
    expect(named.length, 'the cost is named with nothing on the other side of it').toBe(
      traded.length,
    )
  })

  it('names the cost even when nothing is short — AUD-0026', () => {
    /*
     * The half of this repair that the library cannot reach on its own.
     *
     * The first fix for QA-81-002 removed the noun *and* made the clause
     * conditional on a limiter, reasoning that "this is against the week you
     * set" is a complaint without something to set against it. Every unit test
     * passed, because at no hour of any history in the library is
     * `direction-fit` materially against with no limiter firing — measured, not
     * assumed: the count is zero. The only thing that caught it was a browser
     * test pressing the guide's answer, and one instrument that slow should not
     * be the only one holding a sentence.
     *
     * So the state is built here: "Two ordinary weeks", where the honest answer
     * is nothing to suggest until the owner says he has energy, and one tap
     * turns it into a walk in a fortnight pointed at the house. The walk is
     * still the right call and it still costs him the week's direction, and
     * both of those belong on the screen.
     */
    const scenario = SCENARIOS.find((entry) => entry.id === 'quiet-fortnight')
    expect(scenario, 'the history this is built on is gone').toBeDefined()

    const loaded = snapshotFromWire(scenario!.build())
    const moment = {
      now: scenario!.now,
      zone: scenario!.zone,
      weekStartsOn: scenario!.weekStartsOn ?? (1 as const),
    }

    const asked = nextGuideStep(buildView(loaded.snapshot, moment), moment)
    expect(asked.question?.spec.concept, 'the fixture no longer asks about energy').toBe(
      CONCEPT.energy,
    )
    const plenty = asked.question!.options[asked.question!.options.length - 1]!

    const answered = {
      ...loaded.snapshot,
      records: [
        ...loaded.snapshot.records,
        answerRecord(asked.question!.spec, plenty, moment, 'QA81002-1' as never),
      ],
    }
    const decision = decide(buildView(answered, moment), moment)

    expect(decision.kind, 'one answer no longer produces a move').toBe('move')
    expect(decision.situation.limiter, 'this state is supposed to have nothing short').toBe(
      undefined,
    )
    const direction = decision.evaluation?.dimensions.find((row) => row.name === 'direction-fit')
    expect(
      (direction?.value ?? 0) * (direction?.weight ?? 0),
      'the week is no longer pointed away from this',
    ).toBeLessThan(0)

    const reason = decision.explanation?.rendered.reason ?? ''
    expect(reason, reason).toMatch(/the week is pointed at/i)
    expect(reason, reason).not.toMatch(A_VERDICT)
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

describe('F33 residual / E19 — the weak-topic move, and what its evidence says', () => {
  /**
   * The acceptance case routing 83 owes F33 — and only the acceptance case.
   *
   * The capability shipped in Phase 81 as AUD-0027 and AUD-0028: the owner's
   * own specific evidence reaches the sentence he reads. The review confirmed
   * it working — _"'A topic keeps slipping' proposed going back over subnetting
   * because /26 boundaries had been wrong twice the previous day… much better
   * than generic study advice"_ — and then recorded a residual: the evidence
   * panel underneath emphasised topic and time rather than that failed
   * retrieval.
   *
   * So there is a test here and there is no repair here. What the panel shows
   * and in what order is **evidence composition**, which F33's own roadmap line
   * assigns to the visual phase, and the adjudication splits the residual
   * across routing 83 and routing 90 for exactly that reason. Routing 83's half
   * is proving the deciding evidence reaches the owner at all; routing 90's is
   * where on the screen it sits.
   *
   * The gap is written down rather than left to be rediscovered — see the
   * enumerated journey brief in `docs/PHASE_STATUS.md`.
   */
  it('names the specific failed retrieval in the sentence the owner reads', () => {
    const decision = loadScenario('subnetting-struggle').decision()
    const reason = decision.explanation?.rendered.reason ?? ''

    expect(decision.explanation?.rendered.sentence).toContain('subnetting')
    expect(reason).toContain('/26')
    expect(reason.toLowerCase()).toContain('went wrong twice')
  })

  it('cites the record that produced it, rather than only wording it', () => {
    /*
     * The difference between a sentence about the owner's record and a sentence
     * that reads like one. The candidate carries the record ids it was
     * generated from, and the outcome those ids point at is the failed
     * retrieval the reason quotes.
     */
    const decision = loadScenario('subnetting-struggle').decision()
    const cited = decision.evaluation?.candidate.semantics.evidence ?? []
    expect(cited.length, 'the move must cite something').toBeGreaterThan(0)

    const records = cited.map((id) => decision.situation.view.history.byId(id))
    const outcomes = records.filter((record) => record?.kind === 'outcome')
    expect(outcomes.length, 'and one of them is the outcome that went badly').toBeGreaterThan(0)
    expect(JSON.stringify(outcomes)).toContain('/26')
  })

  it('does not contradict that sentence one tap lower', () => {
    /*
     * The panel is allowed to say less than the reason. It is not allowed to
     * say something else — DEF-0033's class, which is what an evidence panel
     * disagreeing with the line above it always is.
     */
    const decision = loadScenario('subnetting-struggle').decision()
    const evidence = evidenceForDecision(decision)
    expect(evidence).toBeDefined()

    // Every condition on the panel is a concept the decision actually leaned
    // on, and the panel says plainly which of them are unknown.
    const leansOn = new Set(decision.evaluation?.candidate.leansOn ?? [])
    for (const condition of evidence!.conditions) {
      expect(leansOn.has(condition.concept), condition.label).toBe(true)
    }

    // And it makes no claim about how this move has gone, because nothing
    // comparable has happened yet. A panel inventing a rate here would be the
    // contradiction.
    expect(evidence!.rates).toEqual([])
    expect(evidence!.confidence.comparable).toBe(0)
    expect(evidence!.comparable).toContain('Nothing in the record is much like this')
  })
})
