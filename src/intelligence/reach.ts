import type { ConceptDefinition } from '../domain/concepts'
import type { Situation } from './situation'
import type { ConceptId } from '../domain/windows'
import { QUESTIONS } from './questions'

/**
 * Which concepts have somewhere for an answer to land — AUD-0041, §13B.
 *
 * ## The declaration this exists beside
 *
 * `ask.materialToDecision` is a boolean on every concept saying *not knowing
 * this could change a decision*. Nothing checked it, and the audit found it
 * **wrong in four of fifteen cases in both directions**: `emotionalState` was
 * `true` and read by nothing, while `cashBuffer`, `socialEnergy` and
 * `homeFriction` were `false` and all three decided. That is DEF-0056's exact
 * class in the sibling field DEF-0056 did not sweep.
 *
 * **The flag is verified by measurement, not by this file.**
 * `tests/synthetic/reach-material.test.ts` re-runs the decision under two
 * different readings of each concept across the whole scenario library and
 * fails the build where the flag and the measurement disagree. The audit is
 * explicit about why that separation matters: *"assert the guard reads the real
 * decision path rather than a hand-maintained list, or it becomes the same
 * unverifiable claim one level up."*
 *
 * ## So what this file is for
 *
 * One thing, and it is a performance requirement rather than a truth claim
 * (§13B): **which consumers could be live in the situation the app is standing
 * in.** The guide probes a question by re-running the whole decision under
 * every possible answer, and the verified cost is about 21 full `buildView +
 * decide` evaluations per render today and about 50 under the Tier 1 + Tier 2
 * expansion — with the worst case being the common case, because `shouldAsk`
 * returns true when a reading is unknown and an emotional reading is unknown
 * almost always by design.
 *
 * A pre-filter is allowed to skip a probe **only where no consumer of that
 * concept could fire in this situation at all**, and it must not change what
 * the guide would have selected. `tests/synthetic/reach-material.test.ts`
 * proves that too, by running the selection with the pre-filter off and
 * comparing, on every history and every block: *"these optimizations must not
 * alter selection semantics."*
 *
 * A consumer that is wrong here therefore costs performance or costs a skipped
 * probe — and the skipped-probe case is caught by that equivalence test rather
 * than by anybody reading this list.
 */

/** A named place in the decision path that consults a reading. */
export interface ConceptConsumer {
  /** Where it is, as a reader would look for it. */
  readonly site: string
  /** What the reading does there, in one clause. */
  readonly what: string
  /**
   * Whether this consumer could fire at all in this situation.
   *
   * Deliberately generous: `true` means *maybe*, and the only cost of a false
   * `true` is a probe that was going to happen anyway. A false `false` skips a
   * probe that mattered, which is why the equivalence test exists.
   */
  applies(situation: Situation): boolean
}

/** Always live. The reading is consulted wherever the decision is made. */
const ALWAYS: ConceptConsumer['applies'] = () => true

export interface ConceptReach {
  readonly concept: ConceptId
  readonly consumers: readonly ConceptConsumer[]
}

/**
 * Concepts whose consumers are situational, and what makes each live.
 *
 * Absent from this table means *"assume a consumer could fire"*, which is the
 * safe direction: a concept nobody has thought about is probed exactly as it
 * was before this file existed.
 */
const SITUATIONAL: ReadonlyMap<string, readonly ConceptConsumer[]> = new Map()

export function consumersFor(definition: ConceptDefinition): readonly ConceptConsumer[] {
  const named = SITUATIONAL.get(definition.id)
  if (named !== undefined) return named
  return [
    { site: 'the decision path', what: 'read wherever the decision is made', applies: ALWAYS },
  ]
}

/**
 * Whether probing this concept could change anything in this situation.
 *
 * The guide's pre-filter, and the one place the answer is decided. It is
 * conservative by construction — a concept with no entry in the table above is
 * always probed — so turning the filter off can only ever add work, never
 * change an answer.
 */
export function couldMatterNow(definition: ConceptDefinition, situation: Situation): boolean {
  return consumersFor(definition).some((consumer) => consumer.applies(situation))
}

/**
 * Concepts the guide has a question for.
 *
 * The other half of the `emotionalState` failure, and the half a registry flag
 * cannot see: a concept may declare itself material, declare itself worth
 * re-asking, and still have **no reachable owner-facing question**, because
 * `guide.ts` can only ask what the catalogue holds. Both halves have to be true
 * before the app can be said to be able to learn about something by asking.
 */
export function askableConcepts(): ReadonlySet<ConceptId> {
  return new Set(QUESTIONS.map((question) => question.concept))
}
