import { describe, expect, it } from 'vitest'
import { CONCEPT, coreConcepts } from '../../src/domain/concepts'
import { isUsable } from '../../src/domain/knowledge'
import { mayReasonFrom } from '../../src/domain/privacy'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { loadScenario } from './harness'

/**
 * Routing 92, package 92.1 — the situation reads the registry (AUD-0040).
 *
 * The finding is an asymmetry rather than a bug: adding a concept to the
 * registry, giving it a domain page and giving it a coverage entry were all
 * registry-driven and cheap, and giving it a **read** meant editing
 * `assembleSituation`, `Situation`'s interface and every consumer. So the cheap
 * half tracked eleven domains and the expensive half stopped at seven, and the
 * QA laboratory reported *"Facts considered: 9"* against *"What the system
 * believes: 15"*.
 *
 * These are the audit's own acceptance items, and the first of them is the one
 * that matters: **the fact list is the true set**, measured against the
 * registry on every history in the library rather than against a number
 * somebody wrote down.
 */

describe('the decision reads every concept the registry knows — AUD-0040', () => {
  it('considers each readable concept exactly once, on every history', () => {
    for (const scenario of SCENARIOS) {
      const loaded = loadScenario(scenario.id)
      const situation = loaded.decision().situation

      const listed = situation.considered.map((fact) => fact.concept)
      expect(
        new Set(listed).size,
        `${scenario.id}: a concept is listed twice among the facts considered`,
      ).toBe(listed.length)

      /*
       * Every registered concept, except the ones the decision structurally
       * could not see. A private concept resolves to `withheld` while the
       * owner has not granted the permission, and a reading the decision could
       * not see is not a fact it considered — see `createFactReader`.
       */
      const expected = coreConcepts
        .all()
        .filter((definition) => mayReasonFrom(definition.privacy, situation.permissions))
        .map((definition) => definition.id)

      for (const concept of expected) {
        /*
         * A derived concept is written back only where its basis exists —
         * "is she in the room" needs a child to be about. Everything else is
         * read unconditionally.
         */
        const definition = coreConcepts.definitionFor(concept)
        if (definition.derived === true) continue
        expect(listed, `${scenario.id}: ${concept} was never read`).toContain(concept)
      }

      for (const concept of listed) {
        expect(
          expected,
          `${scenario.id}: ${concept} was considered and the owner never allowed it`,
        ).toContain(concept)
      }
    }
  })

  it('gives the money generator its reading through the situation, not around it', () => {
    /*
     * The audit's own owner-facing example. `candidates.ts` resolved
     * `cashBuffer` from `view.facts` itself, so the money generator could
     * decide on a fact the trace did not list — and the trace is the only
     * account the owner gets of what the decision rested on.
     */
    for (const scenario of SCENARIOS) {
      const loaded = loadScenario(scenario.id)
      const situation = loaded.decision().situation
      const listed = situation.considered.map((fact) => fact.concept)
      expect(listed, `${scenario.id}: the cash buffer was not among the facts read`).toContain(
        CONCEPT.cashBuffer,
      )
      expect(situation.readings.get(CONCEPT.cashBuffer).state).toBe(
        situation.view.facts.knowledgeFor(CONCEPT.cashBuffer).state,
      )
    }
  })

  it('says what each reading was for, in words that name a use', () => {
    const loaded = loadScenario(SCENARIOS[0]!.id)
    for (const fact of loaded.decision().situation.considered) {
      expect(fact.usedFor.length, `${fact.concept}: no stated use`).toBeGreaterThan(0)
      for (const use of fact.usedFor) {
        expect(use.length, `${fact.concept}: an empty use`).toBeGreaterThan(0)
        expect(use, `${fact.concept}: an unsubstituted placeholder`).not.toContain('{')
        expect(
          use.toLowerCase(),
          `${fact.concept}: the use is the label again, which says nothing`,
        ).not.toBe(fact.label.toLowerCase())
      }
    }
  })

  it('names the stretch of day in a use that names one', () => {
    /*
     * AUD-0002's rule, arriving in the one owner-facing string that was exempt
     * from it because nobody thought of it as one. The fact ledger prints
     * "… — for whether she is in your care tonight" and it has to be tonight.
     */
    const loaded = loadScenario('school-morning')
    const morning = loaded
      .decision()
      .situation.considered.find((fact) => fact.concept === CONCEPT.childPresent)
    expect(morning?.usedFor.join(' ')).toContain('today')
  })

  it('carries the app’s own reading of a derived concept, not a permanent blank', () => {
    // No record carries a derived concept, so a registry sweep that read it
    // from the store would put an `unknown` row about her presence into every
    // decision — a fact the app is actively deciding on, reported as unknown.
    const loaded = loadScenario('school-morning')
    const situation = loaded.decision().situation
    const here = situation.readings.get(CONCEPT.childHere)
    expect(isUsable(here) || here.state === 'unknown').toBe(true)
    const row = situation.considered.find((fact) => fact.concept === CONCEPT.childHere)
    expect(row?.reading, 'the derived reading is not the raw value').toBeDefined()
  })
})
