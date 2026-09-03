import { describe, expect, it } from 'vitest'
import { createRecordFactory, SYNTHETIC_PROVENANCE } from '../../src/domain/build'
import {
  coreConcepts,
  createConceptRegistry,
  type ConceptDefinition,
  type ConceptRegistry,
} from '../../src/domain/concepts'
import { derivedRecordId } from '../../src/domain/ids'
import { bearsConcept, type FactValue } from '../../src/domain/records'
import type { Instant, TimeZoneId } from '../../src/domain/time'
import { conceptId, type ConceptId } from '../../src/domain/windows'
import { decide, type Decision } from '../../src/intelligence/engine'
import { questionFor } from '../../src/intelligence/questions'
import { askableConcepts } from '../../src/intelligence/reach'
import { buildView } from '../../src/memory/view'
import type { StoreSnapshot } from '../../src/memory/store'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { loadScenario } from './harness'

/**
 * Routing 92, package 92.2 — `materialToDecision` is measured, not asserted.
 *
 * ## The declaration, and DEF-0056's class in the field DEF-0056 did not sweep
 *
 * Every concept carries `ask: { materialToDecision, askWhenStale }`. Nothing
 * checked the first against what the decision path actually reads, and the
 * audit enumerated the registry by hand and found it **wrong in four of fifteen
 * cases, in both directions**. DEF-0056 had already fixed the identical shape
 * three lines away: `tracked` was a bare boolean asserting a concept could be
 * learned from, so the repair made it name *how* a reading becomes a number and
 * the build now fails on a mismatch. `materialToDecision` was left a bare
 * boolean nobody checked.
 *
 * ## What is measured
 *
 * The decision is re-run under two different readings of the concept, on every
 * history in the library, and the concept **reaches a decision** if any pair of
 * readings lands the app somewhere different — a different move, a different
 * refusal, a different limiter, a different sentence, or a different caution.
 * That is the real decision path rather than a hand-maintained list of readers,
 * which is the audit's own condition: a list would be the same unverifiable
 * claim one level up.
 *
 * The values probed are the ones the owner can actually give. Where a question
 * exists they are its own options; where none does they are two readings of the
 * shape the registry declares, which is the most a concept with no question can
 * honestly be probed with.
 */

const PROBE_A = derivedRecordId('probe-reach', 'a')
const PROBE_B = derivedRecordId('probe-reach', 'b')

/**
 * Everything the decision path computed, in one comparable string.
 *
 * The audit's criterion is *"read by `assembleSituation`, gating a generator,
 * or **read by a dimension**"*, and the third of those does not always reach
 * the chosen move — a dimension can move a score without changing the winner.
 * So the ranking's own numbers are in here beside the outcome: a concept that
 * moves a weight is reaching the decision even on an evening where the answer
 * would have been the same anyway.
 *
 * After AUD-0040 the first of the three is universal — every registered concept
 * is read — so it carries no information and is deliberately not part of this.
 * What is left is the part that was always the real question.
 */
function fingerprint(decision: Decision): string {
  /*
   * Which move, or none. **Not which flavour of none**, and that exclusion is
   * the same argument as the one about coverage: `nothing-proposed` becomes
   * `nothing-in-reach` the moment a thin history holds one usable reading of
   * anything at all, so every registered concept moves it identically and it
   * discriminates nothing. It is a statement about how much the app knows,
   * which is a real and useful thing to say to the owner and is not evidence
   * that this concept decides.
   */
  const coverageChose = isCoverage(decision.evaluation?.candidate.id)
  const chosen = coverageChose ? 'a refresh' : (decision.evaluation?.candidate.id ?? 'nothing')
  const rejected = [...decision.trace.rejected]
    .filter((rejection) => !isCoverage(rejection.candidate))
    .map((rejection) => `${rejection.candidate}:${rejection.reason}`)
    .sort()
    .join('|')
  const quiet = decision.situation.limiter?.kind === 'coverage'
  const ranked = [...decision.trace.ranking]
    .filter((row) => !isCoverage(row.id))
    .map(
      (row) =>
        `${row.id}@${row.score.toFixed(6)}/${row.confidence.toFixed(4)}#${row.dimensions
          .filter((dimension) => !(quiet && dimension.name === 'bottleneck-fit'))
          .map((dimension) => `${dimension.name}=${dimension.value.toFixed(6)}`)
          .join(',')}!${[...row.cautions].sort().join(';')}`,
    )
    .sort()
    .join('|')
  return [
    chosen,
    rejected,
    ranked,
    quiet ? 'quiet' : (decision.situation.limiter?.kind ?? 'none'),
    coverageChose ? '' : (decision.explanation?.rendered.sentence ?? ''),
    coverageChose ? '' : (decision.explanation?.premise ?? ''),
  ].join('§')
}

/**
 * Whether this move exists because an area has gone quiet.
 *
 * Section 8's third refresh route, and the reason it is held out: coverage is
 * fed by `standing`, a different flag, so **every** standing concept moves the
 * coverage limiter and the coverage generator by construction — simply by
 * having records that are older or newer. A measurement that counted it would
 * call the custody arrangement and the faith practice decisional, when
 * AUD-0011(d) records both as correctly non-decisional, and would call the
 * private pattern decisional, which section 11 forbids outright.
 */
function isCoverage(id: string | undefined): boolean {
  return id !== undefined && id.startsWith('coverage/')
}

/**
 * Two readings of a concept, in the shapes the owner could actually supply.
 *
 * A question's own options first, because those are literally what he can tap.
 * Failing that, the shape the registry declares — a tracked dimension names how
 * a reading becomes a number, so two ends of its scale are honest probes. A
 * concept with neither is free text, and two different sentences are the whole
 * of what can be tried.
 */
function probeValues(definition: ConceptDefinition, at: Instant): readonly FactValue[] {
  const spec = questionFor(definition.id)
  if (spec !== undefined) {
    // Options are written from the situation only for their wording; the values
    // are fixed, so any situation gives the same set.
    return spec.options({ block: 'evening' } as never).map((option) => option.value)
  }
  /*
   * Failing a question, the readings the library itself holds — and this is
   * the part that stops the measurement being unfairly harsh. `learningTopic`
   * and `weeklyFocus` are **entity** readings: the career generator resolves
   * the reference to a topic the owner named, and a probe made of invented
   * text resolves to nothing, so both concepts measured as deciding nothing
   * while both plainly decide. What the owner actually says about a concept is
   * in the histories; this reads them rather than guessing at the shape.
   */
  void at
  return [...observedValues(definition.id), ...shapedValues(definition)]
}

/** Two readings of whatever shape the registry says this concept holds. */
function shapedValues(definition: ConceptDefinition): readonly FactValue[] {
  switch (definition.tracked) {
    case 'scale':
      return [
        { type: 'scale', value: 0, of: 5 },
        { type: 'scale', value: 5, of: 5 },
      ]
    case 'number':
      return [
        { type: 'number', value: 1 },
        { type: 'number', value: 9 },
      ]
    case 'duration':
      return [
        { type: 'duration', minutes: 5 },
        { type: 'duration', minutes: 180 },
      ]
    default:
      return [
        { type: 'text', value: 'one thing' },
        { type: 'text', value: 'quite another thing' },
      ]
  }
}

function withReading(
  snapshot: StoreSnapshot,
  definition: ConceptDefinition,
  value: FactValue,
  moment: { readonly now: Instant; readonly zone: TimeZoneId },
  id: typeof PROBE_A,
): StoreSnapshot {
  const build = createRecordFactory({ zone: moment.zone, provenance: SYNTHETIC_PROVENANCE })
  const record = build(
    'observation',
    {
      id,
      occurredAt: moment.now,
      domains: [definition.domain],
      privacy: definition.privacy,
    },
    { concept: definition.id, value, method: 'self-report' },
  )
  return { ...snapshot, records: [...snapshot.records, record] }
}

/**
 * Whether any reading of this concept lands the app somewhere different.
 *
 * Short-circuits on the first history that proves it, which is why a registry
 * of sixteen concepts against a library of thirty-odd histories costs what it
 * costs: the concepts that decide are proved in one or two scenarios, and only
 * the ones that reach nothing are swept in full.
 */
function reachesADecision(definition: ConceptDefinition): boolean {
  for (const scenario of SCENARIOS) {
    const loaded = loadScenario(scenario.id)
    const moment = { now: scenario.now, zone: scenario.zone }
    /*
     * The baseline is **not knowing**, because that is the claim.
     * `materialToDecision` says *"whether not knowing this could actually
     * change a decision"*, so comparing one reading against another answers a
     * different question and answers it too kindly: a generator gated on
     * whether the app knows at all fires identically under two known values.
     * Every record bearing the concept comes out, and each candidate reading
     * goes in against that.
     */
    const bare = withoutConcept(loaded.snapshot, definition.id)
    /*
     * Coverage is held out of the comparison, and the reason is that it cannot
     * discriminate. Section 8's engine is fed by `standing`, a different flag —
     * so **every** standing concept moves the coverage limiter and the coverage
     * generator by construction, simply by having records that are older or
     * newer. A measurement that counted that would call the custody
     * arrangement and the faith practice decisional, when AUD-0011(d) records
     * both as correctly non-decisional, and would call the private pattern
     * decisional, which section 11 forbids outright.
     *
     * So the probed concept is made non-standing on both sides. It is still
     * read, still ranked, still explained; it is simply invisible to the one
     * mechanism that reacts to every concept alike.
     */
    const probeMoment = { ...moment, concepts: withoutStanding(definition.id) }
    const base = fingerprint(decide(buildView(bare, moment), probeMoment, { probe: false }))

    /*
     * The control, and it earns its cost. `malformed-history` is a fixture
     * whose whole point is that almost nothing in it parses, so **any** extra
     * record moves it from "nothing was proposed" to "nothing was in reach" —
     * and a measurement without this said the custody arrangement, the cash
     * buffer and the faith practice all decide something, when what actually
     * decided was that the history went from empty to not empty.
     *
     * A record bearing a concept nobody registered is the null probe: one more
     * row, saying nothing this app knows about. Where that alone changes the
     * decision, the history cannot tell us anything about a concept and is
     * skipped for this one.
     */
    const control = withReading(bare, controlConcept(definition), CONTROL_VALUE, moment, PROBE_A)
    if (fingerprint(decide(buildView(control, moment), probeMoment, { probe: false })) !== base) {
      continue
    }

    const values = probeValues(definition, scenario.now)
    for (const [index, value] of values.entries()) {
      const snapshot = withReading(bare, definition, value, moment, index === 0 ? PROBE_A : PROBE_B)
      const view = buildView(snapshot, moment)
      if (fingerprint(decide(view, probeMoment, { probe: false })) !== base) return true
    }
  }
  return false
}

/** Distinct readings of this concept anywhere in the shipped library. */
function observedValues(concept: ConceptId): readonly FactValue[] {
  const seen = new Map<string, FactValue>()
  for (const scenario of SCENARIOS) {
    for (const record of loadScenario(scenario.id).snapshot.records) {
      if (!bearsConcept(record) || record.concept !== concept) continue
      seen.set(JSON.stringify(record.value), record.value)
      if (seen.size >= 4) return [...seen.values()]
    }
  }
  return [...seen.values()]
}

/** One more record, in the same area, saying nothing the app has a use for. */
const CONTROL_VALUE: FactValue = { type: 'text', value: 'nothing this version understands' }

function controlConcept(like: ConceptDefinition): ConceptDefinition {
  return coreConcepts.definitionFor(conceptId(`control.${like.domain}.says-nothing`))
}

/** The registry with this one concept invisible to the coverage engine. */
function withoutStanding(concept: ConceptId): ConceptRegistry {
  return createConceptRegistry(
    coreConcepts
      .all()
      .map((definition) =>
        definition.id === concept ? { ...definition, standing: false } : definition,
      ),
  )
}

/** The same history with nothing in it that speaks to this concept. */
function withoutConcept(snapshot: StoreSnapshot, concept: ConceptId): StoreSnapshot {
  return {
    ...snapshot,
    records: snapshot.records.filter(
      (record) => !bearsConcept(record) || record.concept !== concept,
    ),
  }
}

/**
 * Concepts that decide something the ordinary library never puts in front of
 * them — §13B's closed exemption discipline.
 *
 * **STARVED and LEGITIMATELY RARE are different things**, and the owner's rule
 * is that the second is available only through a named, exhaustive registry
 * carrying the concept, a written reason, the circumstance that makes it
 * decision-relevant, and **a dedicated test proving that circumstance can
 * actually make it win**. An exemption is not a generic escape hatch, and a
 * concept with no consumer may never use it.
 *
 * Empty, and the emptiness is the finding rather than an oversight: every
 * concept declaring itself material is proved to reach a decision on a history
 * that ships.
 */
const RARE_BUT_REAL: readonly {
  readonly concept: ConceptId
  readonly why: string
  readonly when: string
  readonly provenBy: string
}[] = []

describe('a concept that says it matters is one a reading of moves — AUD-0041', () => {
  const measured = new Map<ConceptId, boolean>()
  for (const definition of coreConcepts.all()) {
    if (definition.derived === true) continue
    measured.set(definition.id, reachesADecision(definition))
  }

  it('declares itself material only where a reading actually changes something', () => {
    const wrong: string[] = []
    for (const definition of coreConcepts.all()) {
      if (definition.derived === true) continue
      const reaches = measured.get(definition.id) === true
      const exempt = RARE_BUT_REAL.some((entry) => entry.concept === definition.id)
      const declared = definition.ask.materialToDecision
      if (declared && !reaches && !exempt) {
        wrong.push(`${definition.id}: says it is material and no reading of it moves anything`)
      }
      if (!declared && reaches) {
        wrong.push(`${definition.id}: decides something and says it does not`)
      }
    }
    expect(wrong, 'the registry disagrees with the decision path').toEqual([])
  })

  it('never asks the owner to answer the app’s own conclusion', () => {
    // A derived concept has no question spec and must not claim to want one:
    // the owner does not answer a reading the app worked out for itself.
    for (const definition of coreConcepts.all()) {
      if (definition.derived !== true) continue
      expect(definition.ask.materialToDecision, `${definition.id}: derived and asked`).toBe(false)
      expect(definition.ask.askWhenStale, `${definition.id}: derived and re-asked`).toBe(false)
      expect(
        questionFor(definition.id),
        `${definition.id}: derived and has a question`,
      ).toBeUndefined()
    }
  })

  it('asks only about concepts an answer to would change something — §13B', () => {
    /*
     * The owner's rule, in his own words: *"a concept may ship as askable only
     * when an actual consumer exists that makes at least one possible answer
     * capable of materially changing a decision. Do not ship
     * declared-but-unreachable concepts."*
     *
     * This is the direction that matters. The other direction — a concept that
     * decides and has no question — is not a defect: a learning topic and a
     * week's direction are named on their own pages, because neither is a
     * multiple-choice answer. What was a defect is the app *reporting* those as
     * things it would ask about, and that is the QA screen's two lists.
     */
    const dead: string[] = []
    for (const concept of askableConcepts()) {
      const definition = coreConcepts.get(concept)
      if (definition === undefined) {
        dead.push(`${concept}: a question about a concept nobody registered`)
        continue
      }
      if (!definition.ask.materialToDecision) {
        dead.push(`${concept}: a question the registry says could change nothing`)
      }
      if (measured.get(concept) !== true) {
        dead.push(`${concept}: a question no answer to which moves anything`)
      }
    }
    expect(dead, 'the guide holds a question that cannot earn its tap').toEqual([])
  })

  it('spends an exemption only with a circumstance and a test behind it', () => {
    for (const entry of RARE_BUT_REAL) {
      expect(entry.why.length, `${entry.concept}: exempt with no reason`).toBeGreaterThan(20)
      expect(entry.when.length, `${entry.concept}: exempt with no circumstance`).toBeGreaterThan(20)
      expect(entry.provenBy.length, `${entry.concept}: exempt with no test`).toBeGreaterThan(5)
      // A concept with no consumer may never use the rare-concept exemption.
      expect(
        coreConcepts.get(entry.concept)?.ask.materialToDecision,
        `${entry.concept}: exempt and not even declared material`,
      ).toBe(true)
    }
  })

  it('is a measurement that can come out either way', () => {
    // The guard's own reintroduction proof, standing rather than performed
    // once: if the probe had stopped distinguishing anything, every concept
    // would measure unreachable and the first assertion would pass only because
    // the registry happened to agree. Something has to measure true.
    const reaching = [...measured.values()].filter(Boolean).length
    expect(
      reaching,
      'nothing at all reaches a decision — the probe is measuring nothing',
    ).toBeGreaterThan(0)
    expect(
      reaching,
      'everything reaches a decision — the probe cannot tell them apart',
    ).toBeLessThan(measured.size)
  })
})
