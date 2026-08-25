import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { isUsable } from '../../src/domain/knowledge'
import { DAY_BLOCKS } from '../../src/domain/time'
import { renderRecommendation, WHY_NOW_TRIGGERS } from '../../src/domain/recommendation'
import { AHEAD_BECAUSE } from '../../src/intelligence/explain'
import { profileFor } from '../../src/intelligence/moves'
import { decide, type Decision } from '../../src/intelligence/engine'
import { nextGuideStep } from '../../src/intelligence/guide'
import { answerRecord } from '../../src/intelligence/questions'
import { buildView } from '../../src/memory/view'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { orphanPronounsIn } from './harness'

/**
 * Section 64 — the no-hidden-genericity rule, and section 61's copy rules.
 *
 * > If two substantially different synthetic people repeatedly receive the same
 * > recommendation wording and reasoning despite materially different data,
 * > treat that as a possible intelligence defect. Personalisation must affect
 * > substance, not just names.
 *
 * This is the test that would catch the most embarrassing possible outcome of
 * this phase: a well-engineered pipeline that always says something pleasant
 * and never says anything specific. It runs every scenario the owner can tap on
 * the phone, and it fails on repetition rather than waiting for someone to
 * notice.
 *
 * The second half enforces section 61 on everything the engine can put in front
 * of the owner. Those rules are easy to hold when writing one sentence by hand
 * and easy to lose when sentences are composed — so they are checked over the
 * whole output rather than over a sample.
 */

interface Spoken {
  readonly id: string
  readonly decision: Decision
  readonly lines: readonly { readonly what: string; readonly text: string }[]
}

function linesOf(decision: Decision): readonly { what: string; text: string }[] {
  const lines: { what: string; text: string }[] = []
  if (decision.explanation !== undefined) {
    const shown = decision.explanation
    lines.push({ what: 'sentence', text: shown.rendered.sentence })
    lines.push({ what: 'reason', text: shown.rendered.reason })
    lines.push({ what: 'follow-up', text: shown.rendered.followUp })
    lines.push({ what: 'premise', text: shown.premise })
    if (shown.limiter !== undefined) {
      // Both halves are owner-facing, so both go through every copy sweep.
      lines.push({ what: 'limiter', text: shown.limiter.summary })
      lines.push({ what: 'limiter-label', text: shown.limiter.label })
    }
    if (shown.instead !== undefined) lines.push({ what: 'instead', text: shown.instead })
    if (shown.insteadBecause !== undefined) {
      lines.push({ what: 'instead-because', text: shown.insteadBecause })
    }
  }
  if (decision.noAction !== undefined) {
    lines.push({ what: 'headline', text: decision.noAction.headline })
    lines.push({ what: 'detail', text: decision.noAction.detail })
  }
  return lines
}

function speak(): readonly Spoken[] {
  return SCENARIOS.map((scenario) => {
    const loaded = snapshotFromWire(scenario.build())
    const at = { now: scenario.now, zone: scenario.zone }
    const decision = decide(buildView(loaded.snapshot, at), at)
    return { id: scenario.id, decision, lines: linesOf(decision) }
  })
}

const spoken = speak()

/**
 * The same again, after one answer.
 *
 * Several of the reason generator's branches are only reachable once the owner
 * has told the app something — the walk's explanation among them, which is how
 * a check on "nothing more pressing to spend it on" came to pass while the
 * clause was still there. Deciding only at the opening moment tests the half of
 * the engine the owner sees first and none of what happens when they tap.
 */
function speakAfterOneAnswer(): readonly Spoken[] {
  const out: Spoken[] = []

  for (const scenario of SCENARIOS) {
    const loaded = snapshotFromWire(scenario.build())
    const at = { now: scenario.now, zone: scenario.zone }
    const step = nextGuideStep(buildView(loaded.snapshot, at), at)
    if (step.kind !== 'question' || step.question === undefined) continue

    for (const option of step.question.options) {
      const snapshot = {
        ...loaded.snapshot,
        records: [...loaded.snapshot.records, answerRecord(step.question.spec, option, at)],
      }
      const decision = decide(buildView(snapshot, at), at)
      out.push({
        id: `${scenario.id} after “${option.label}”`,
        decision,
        lines: linesOf(decision),
      })
    }
  }

  return out
}

const everythingSpoken = [...spoken, ...speakAfterOneAnswer()]

/**
 * Lives that differ in what actually drives a decision.
 *
 * Not every scenario qualifies: three of the Phase 1 fixtures are the same
 * shape of history — a fortnight of sleep readings and nothing else — because
 * they were built to exercise corrections, damaged rows and plain accumulation
 * rather than to be different people. Section 64 is about substantially
 * different data, so this is the set it is asked about.
 */
const SUBSTANTIALLY_DIFFERENT = [
  'running-on-empty',
  'rested-and-behind',
  'week-pointed-at-home',
  'subnetting-struggle',
  'durable-custody',
] as const

describe('section 64 — different lives, different advice', () => {
  it('gives every one of them a move', () => {
    for (const id of SUBSTANTIALLY_DIFFERENT) {
      const found = spoken.find((entry) => entry.id === id)
      expect(found?.decision.kind, id).toBe('move')
    }
  })

  it('never gives two of them the same reason', () => {
    const reasons = SUBSTANTIALLY_DIFFERENT.map(
      (id) => spoken.find((entry) => entry.id === id)?.decision.explanation?.rendered.reason,
    )
    expect(new Set(reasons).size).toBe(SUBSTANTIALLY_DIFFERENT.length)
  })

  it('describes their situations differently too', () => {
    const premises = SUBSTANTIALLY_DIFFERENT.map(
      (id) => spoken.find((entry) => entry.id === id)?.decision.explanation?.premise,
    )
    expect(new Set(premises).size).toBe(SUBSTANTIALLY_DIFFERENT.length)
  })

  it('does not repeat a whole answer anywhere in the library', () => {
    /*
     * Section 64's actual rule: the same wording *and* the same reasoning.
     *
     * The conjunction is deliberate and worth keeping. Two people who are both
     * stuck on the same topic with an evening free should get the same move —
     * that is the engine being right, and demanding different words for it
     * would be theatre. What must not happen is two different lives receiving
     * the same move for the same stated reason, which is what this checks
     * across every scenario, including the ones deliberately built alike.
     */
    const answers = spoken
      .filter((entry) => entry.decision.explanation !== undefined)
      .map((entry) =>
        [
          entry.decision.explanation?.rendered.sentence,
          entry.decision.explanation?.rendered.reason,
          // The premise counts. Two histories can differ in a great deal and
          // agree on everything the engine can currently see — a month of
          // expired readings on top of a settled custody arrangement leaves
          // the same one usable fact as a history with nothing but the
          // arrangement, and the same move for the same reason is then
          // correct rather than generic. What still has to differ is what the
          // owner reads, and the line above the decision is part of that.
          entry.decision.explanation?.premise,
        ].join('//'),
      )
    expect(new Set(answers).size).toBe(answers.length)
  })

  it('reaches its answers through materially different reasoning', () => {
    // Personalisation "affects substance, not just names": the moves that were
    // even considered differ, not only the words chosen at the end.
    const shapes = SUBSTANTIALLY_DIFFERENT.map((id) => {
      const entry = spoken.find((found) => found.id === id)
      return (entry?.decision.trace.proposed ?? [])
        .map((row) => row.id)
        .sort()
        .join(',')
    })
    expect(new Set(shapes).size).toBe(SUBSTANTIALLY_DIFFERENT.length)
  })
})

// ---------------------------------------------------------------------------
// Section 61
// ---------------------------------------------------------------------------

/** Words from inside the machine. None of them belongs on an owner surface. */
const INTERNAL_VOCABULARY = [
  'candidate',
  'arbitration',
  'evaluator',
  'projection',
  'canonical',
  'schema',
  'dimension',
  'concept',
  'entity',
  'trace',
  'domain',
  'inferred',
  'explicit-fact',
  'undefined',
  'null',
  'nan',
  'confidence',
  'score',
]

describe('section 61 — how it is allowed to talk', () => {
  it('says something for every scenario', () => {
    for (const entry of everythingSpoken) {
      expect(entry.lines.length, entry.id).toBeGreaterThan(0)
    }
  })

  it('uses no words from inside the machine', () => {
    for (const entry of everythingSpoken) {
      for (const line of entry.lines) {
        const lowered = line.text.toLowerCase()
        for (const word of INTERNAL_VOCABULARY) {
          expect(lowered, `${entry.id} ${line.what}: ${line.text}`).not.toContain(word)
        }
      }
    }
  })

  it('quotes no arithmetic about how sure it is', () => {
    // Section 61: no excessive confidence math. "Moderate evidence · 7
    // comparable observations" is the anti-example the plan gives by name.
    for (const entry of everythingSpoken) {
      for (const line of entry.lines) {
        expect(line.text, `${entry.id} ${line.what}`).not.toMatch(/\d\s*%/)
        expect(line.text, `${entry.id} ${line.what}`).not.toMatch(/0\.\d{2,}/)
      }
    }
  })

  it('writes finished sentences', () => {
    for (const entry of spoken) {
      for (const line of entry.lines) {
        /*
         * A column heading is not a sentence and must not be held to be one.
         *
         * "Out of date" sits beside "Chosen over" and "Why this one" — they
         * name the row rather than saying something, and a full stop on any of
         * them would be wrong. Everything below still applies to it: it is
         * swept for pronouns, for internal vocabulary and for genericity like
         * every other line the owner reads.
         */
        if (line.what.endsWith('-label')) continue
        const text = line.text
        expect(text.trim(), `${entry.id} ${line.what}`).toBe(text)
        expect(text, `${entry.id} ${line.what}`).not.toContain('  ')
        expect(text, `${entry.id} ${line.what}`).toMatch(/[.?!]$/)
        expect(text.charAt(0), `${entry.id} ${line.what}: ${text}`).toBe(
          text.charAt(0).toUpperCase(),
        )
        expect(text.length, `${entry.id} ${line.what}`).toBeLessThan(200)
      }
    }
  })

  it('never loses the noun', () => {
    /*
     * DEF-0001's rule, applied to composed copy rather than to templates.
     *
     * The move sentence itself carries the strict form: it names the thing and
     * contains no pronoun at all, which is what `renderRecommendation`
     * guarantees and G-001 already sweeps. A reason may run to two sentences
     * and may legitimately say "it" once the subject has been named — what it
     * may never do is contain a pronoun and never say what the pronoun is
     * about. That is the failure section 3 describes, and it is the one worth
     * testing for rather than banning a word list outright.
     */
    for (const entry of spoken) {
      if (entry.decision.explanation === undefined) continue
      const semantics = entry.decision.explanation.semantics
      const index = entry.decision.situation.entities
      const object = index.labelFor(semantics.target.object) ?? ''
      const subject = index.labelFor(semantics.subject) ?? ''

      const sentence = entry.decision.explanation.rendered.sentence
      expect(sentence.toLowerCase(), entry.id).toContain(object.toLowerCase())
      expect(orphanPronounsIn(sentence), `${entry.id}: ${sentence}`).toEqual([])

      for (const line of entry.lines) {
        if (orphanPronounsIn(line.text).length === 0) continue
        const lowered = line.text.toLowerCase()
        const namesIt =
          lowered.includes(object.toLowerCase()) || lowered.includes(subject.toLowerCase())
        expect(namesIt, `${entry.id} ${line.what}: ${line.text}`).toBe(true)
      }
    }
  })

  it('renders every ranked move it could have chosen, not just the winner', () => {
    // A move that survives the filter and cannot be put into words is a defect
    // waiting for a different evening to surface it.
    for (const entry of spoken) {
      for (const row of entry.decision.trace.ranking) {
        const evaluation = entry.decision.trace.ranking.find((found) => found.id === row.id)
        expect(evaluation?.sentence, `${entry.id} ${row.id}`).not.toBe(
          'could not be put into words',
        )
      }
      expect(
        entry.decision.trace.rejected.filter((row) => row.reason === 'cannot-be-said'),
        entry.id,
      ).toEqual([])
    }
  })

  it('renders every proposed move, including the ones the situation ruled out', () => {
    for (const entry of spoken) {
      for (const candidateId of entry.decision.trace.proposed.map((row) => row.id)) {
        const wasRuledOutForWords = entry.decision.trace.rejected.some(
          (row) => row.candidate === candidateId && row.reason === 'cannot-be-said',
        )
        expect(wasRuledOutForWords, `${entry.id} ${candidateId}`).toBe(false)
      }
    }
  })
})

describe('the reason only cites what the decision leaned on — DEF-0006', () => {
  /*
   * The class the owner's phone test found, and the sharpest thing they said
   * about it: "whether the explanation is faithfully derived from the
   * arbitration rather than rationalizing the winner afterward."
   *
   * It was not. A walk was winning on an ordinary morning and being explained
   * as "you are an hour and a half down, which is not enough to sit still for"
   * — a sleep figure, on a move whose evidence is energy and soreness, where
   * the shortfall contributed nothing and would if anything argue against
   * going out. The sentence sounded like reasoning, and reading it as reasoning
   * would have been a mistake.
   *
   * The rule now: a reason may only cite evidence the winning move actually
   * leaned on. The premise is deliberately exempt — "Monday morning, an hour
   * short on sleep" is a true statement about the situation rather than a claim
   * about why anything won.
   */
  it('cites a sleep figure only when the move rests on sleep', () => {
    for (const entry of spoken) {
      if (entry.decision.explanation === undefined) continue
      const reason = entry.decision.explanation.rendered.reason
      const mentionsSleep = /\bhours? down\b|\bshort on sleep\b|\bbehind you\b/i.test(reason)
      if (!mentionsSleep) continue

      const leansOn = entry.decision.evaluation?.candidate.leansOn ?? []
      expect(leansOn as readonly string[], `${entry.id}: ${reason}`).toContain(CONCEPT.sleepHours)
    }
  })

  it('never argues from a shortfall for a move that spends energy', () => {
    // The exact sentence, and the shape of it: a restorative move may cite the
    // deficit, because relieving it is the point. An effortful one may not,
    // because the deficit is an argument against it.
    for (const entry of spoken) {
      const evaluation = entry.decision.evaluation
      if (evaluation === undefined || entry.decision.explanation === undefined) continue
      if (profileFor(evaluation.candidate.semantics.target.verb).demand !== 'effortful') continue

      const reason = entry.decision.explanation.rendered.reason
      expect(reason, `${entry.id}: ${reason}`).not.toMatch(/not enough to sit still for/i)
      expect(reason, `${entry.id}: ${reason}`).not.toMatch(/\bhours? down\b/i)
    }
  })

  it('proposes no movement at all without a reading of how the body is', () => {
    // The root cause rather than the sentence: strain can be worked out from
    // sleep alone, which was enough to fire the movement generator on a history
    // that knew nothing about energy or soreness.
    for (const entry of spoken) {
      const walk = entry.decision.trace.proposed.find((row) => row.verb === 'move')
      if (walk === undefined) continue

      const capacity = entry.decision.situation.capacity
      const known = isUsable(capacity.energy) || isUsable(capacity.soreness)
      expect(known, `${entry.id} proposed a walk on no capacity reading`).toBe(true)
    }
  })

  it('claims nothing about what it could not see — DEF-0012', () => {
    /*
     * "Nothing more pressing to spend it on" was the subtler sibling of the
     * walk's sleep figure. It reads as a finding about the owner's life; it was
     * a statement about how little the engine could see. On the evening it was
     * caught there was exactly one candidate and everything else was unknown or
     * months stale, so the absence it reported was its own.
     *
     * The rule this leaves: an absence may not be asserted from ignorance.
     */
    for (const entry of everythingSpoken) {
      for (const line of entry.lines) {
        expect(line.text, `${entry.id} ${line.what}`).not.toMatch(/nothing more pressing/i)
        expect(line.text, `${entry.id} ${line.what}`).not.toMatch(/nothing else is pressing/i)
      }
    }
  })

  it('names which why-now triggers the library actually reaches — DEF-0012', () => {
    /*
     * The check the sweep above was missing, and Phase 82 is how it was found.
     *
     * `nothing-better` rendered *"Nothing else is pressing, and X pays back
     * tomorrow"* for three phases. It is the same absence-from-ignorance the
     * two assertions above forbid by name, in the same file those two were
     * repaired in — and every run passed, because no history in the library
     * reached the branch. The first scenario with a career move and no career
     * goal printed it immediately.
     *
     * So the sweep now says out loud what it covers. A trigger nothing reaches
     * is not a trigger that is fine; it is a sentence nobody has read. Adding a
     * scenario that reaches one moves it out of the unreached list, and adding
     * a trigger the library cannot reach fails here rather than shipping
     * unexamined copy — which is D-108's first check applied to a set the tests
     * had been quietly sampling.
     */
    const reached = new Set<string>()
    for (const entry of everythingSpoken) {
      const trigger = entry.decision.evaluation?.candidate.semantics.whyNow.trigger
      if (trigger !== undefined) reached.add(trigger)
    }

    /*
     * The one the library does not put in front of the owner, and where it is
     * covered instead.
     *
     * `goal-behind` needs a goal carrying both a date and named pieces that
     * actually measure behind (AUD-0046), and the only history with one is
     * `week-pointed-at-home`, whose evening is decided by the weekly direction
     * rather than by the career move. Its sentence is not unread —
     * `tests/synthetic/goal-horizon-and-parts.test.ts` renders it across four
     * combinations of horizon and pieces and holds it to the same rule as
     * everything here — but it is not read *from this library*, and that is a
     * different statement worth writing down rather than leaving to be assumed.
     */
    const NOT_REACHED: readonly string[] = ['goal-behind']

    const unexpected = [...reached].filter((trigger) => NOT_REACHED.includes(trigger))
    const missing = NOT_REACHED.filter((trigger) => !reached.has(trigger))

    expect(
      unexpected,
      'a trigger listed as unreached is now reached — take it off the list',
    ).toEqual([])
    expect(missing, 'the list of unreached triggers is out of date').toEqual(NOT_REACHED)

    // And the positive half: everything not on that list is genuinely read by
    // somebody, so the two assertions above are sweeping real sentences.
    for (const trigger of WHY_NOW_TRIGGERS) {
      if (NOT_REACHED.includes(trigger)) continue
      expect([...reached], `no scenario reaches "${trigger}"`).toContain(trigger)
    }
  })

  it('says what it was chosen over, and why, whenever there was a contest', () => {
    // Section 6's relevant tradeoff, and the owner's version of it: if walking
    // beats studying, the reason should make that understandable.
    for (const entry of spoken) {
      const explanation = entry.decision.explanation
      if (explanation === undefined) continue
      const hadRival = entry.decision.trace.ranking.length > 1
      if (!hadRival) continue
      /*
       * A deferral has no "chosen over" row, and the absence is copy rather
       * than an oversight — AUD-0024. "Chosen over" is true of a move that was
       * picked; nothing was picked here, so a row saying otherwise would
       * describe a contest that did not happen. The whole ranking is still in
       * the trace.
       */
      if (entry.decision.kind === 'hold') continue

      expect(
        explanation.instead,
        `${entry.id} had a runner-up and said nothing about it`,
      ).toBeDefined()
      expect(explanation.insteadBecause, `${entry.id} said what, and not why`).toBeDefined()
    }
  })

  it('takes that why from the arbitration rather than from the winner', () => {
    // Every phrase it can use corresponds to a dimension the ranking actually
    // computed, so the explanation cannot invent a reason the engine never had.
    // Every phrase the table can produce, at every hour — three of them read
    // the block now (AUD-0002), so enumerating one block's worth would let the
    // other four say anything.
    const phrases = new Set<string>(['Asks less of what is short right now.'])
    for (const block of DAY_BLOCKS) {
      for (const phrase of Object.values(AHEAD_BECAUSE)) phrases.add(phrase(block))
    }

    for (const entry of spoken) {
      const because = entry.decision.explanation?.insteadBecause
      if (because === undefined) continue
      expect(phrases.has(because), `${entry.id}: ${because}`).toBe(true)
    }
  })
})

describe('the renderer stays the only way words are made', () => {
  it('produces the same sentence from the semantics the decision carries', () => {
    for (const entry of spoken) {
      if (entry.decision.explanation === undefined) continue
      const again = renderRecommendation(
        entry.decision.explanation.semantics,
        entry.decision.situation.entities,
        /*
         * The block is part of the input now (AUD-0002), so re-rendering the
         * same semantics at the same hour has to be given the same hour.
         *
         * A deferral is the one case where the hour in the sentence is not the
         * hour being decided in — `hold` names the block it is being held
         * **for** — so the re-render is given the block the decision itself
         * used. The invariant is unchanged and is the one that matters: the
         * sentence on screen came out of the renderer and can be produced again
         * from what the decision carries.
         */
        entry.decision.heldUntil ?? entry.decision.situation.block,
      )
      expect(again.ok, entry.id).toBe(true)
      if (!again.ok) continue
      expect(again.rendered.sentence).toBe(entry.decision.explanation.rendered.sentence)
      // And the reason the owner reads is the one stored in the semantics, so a
      // recommendation written to history explains itself the same way later.
      expect(again.rendered.reason).toBe(entry.decision.explanation.rendered.reason)
    }
  })
})
