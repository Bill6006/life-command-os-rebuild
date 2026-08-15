import { describe, expect, it } from 'vitest'
import { renderRecommendation } from '../../src/domain/recommendation'
import { decide, type Decision } from '../../src/intelligence/engine'
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

function speak(): readonly Spoken[] {
  return SCENARIOS.map((scenario) => {
    const loaded = snapshotFromWire(scenario.build())
    const view = buildView(loaded.snapshot, { now: scenario.now, zone: scenario.zone })
    const decision = decide(view, { now: scenario.now, zone: scenario.zone })

    const lines: { what: string; text: string }[] = []
    if (decision.explanation !== undefined) {
      const shown = decision.explanation
      lines.push({ what: 'sentence', text: shown.rendered.sentence })
      lines.push({ what: 'reason', text: shown.rendered.reason })
      lines.push({ what: 'follow-up', text: shown.rendered.followUp })
      lines.push({ what: 'premise', text: shown.premise })
      if (shown.limiter !== undefined) lines.push({ what: 'limiter', text: shown.limiter })
      if (shown.instead !== undefined) lines.push({ what: 'instead', text: shown.instead })
    }
    if (decision.noAction !== undefined) {
      lines.push({ what: 'headline', text: decision.noAction.headline })
      lines.push({ what: 'detail', text: decision.noAction.detail })
    }

    return { id: scenario.id, decision, lines }
  })
}

const spoken = speak()

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
      .map(
        (entry) =>
          `${entry.decision.explanation?.rendered.sentence}//${entry.decision.explanation?.rendered.reason}`,
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
    for (const entry of spoken) {
      expect(entry.lines.length, entry.id).toBeGreaterThan(0)
    }
  })

  it('uses no words from inside the machine', () => {
    for (const entry of spoken) {
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
    for (const entry of spoken) {
      for (const line of entry.lines) {
        expect(line.text, `${entry.id} ${line.what}`).not.toMatch(/\d\s*%/)
        expect(line.text, `${entry.id} ${line.what}`).not.toMatch(/0\.\d{2,}/)
      }
    }
  })

  it('writes finished sentences', () => {
    for (const entry of spoken) {
      for (const line of entry.lines) {
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

describe('the renderer stays the only way words are made', () => {
  it('produces the same sentence from the semantics the decision carries', () => {
    for (const entry of spoken) {
      if (entry.decision.explanation === undefined) continue
      const again = renderRecommendation(
        entry.decision.explanation.semantics,
        entry.decision.situation.entities,
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
