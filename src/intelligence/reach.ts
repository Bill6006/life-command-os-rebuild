import { CONCEPT, type ConceptDefinition } from '../domain/concepts'
import { isUsable } from '../domain/knowledge'
import type { ActionVerb } from '../domain/recommendation'
import { profileFor } from './moves'
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
   *
   * `standing` is what the app is about to suggest, where it is suggesting
   * anything. It is a verb rather than the whole decision so that this file
   * stays below the engine that calls it.
   */
  applies(situation: Situation, standing: ActionVerb | undefined): boolean
}

/** Always live. The reading is consulted wherever the decision is made. */
const ALWAYS: ConceptConsumer['applies'] = () => true

/** Whether what the app is about to suggest is something he has to start. */
function asksSomethingOfHim(standing: ActionVerb | undefined): boolean {
  return standing !== undefined && profileFor(standing).demand === 'effortful'
}

export interface ConceptReach {
  readonly concept: ConceptId
  readonly consumers: readonly ConceptConsumer[]
}

/**
 * Concepts whose consumers are situational, and what makes each live.
 *
 * ## Two roles, and they are worth telling apart
 *
 * For a concept that shipped before routing 92 there is **no entry here**, and
 * that absence is the equivalence proof: `couldMatterNow` returns true for it in
 * every situation, so the pre-filter cannot change what the guide would have
 * selected. That is §13B's requirement on the performance work — *"these
 * optimizations must not alter selection semantics"* — held structurally rather
 * than measured after the fact, and
 * `tests/synthetic/reach-questions.test.ts` proves it by running the guide with
 * the filter off across the library and comparing.
 *
 * For a concept **added by routing 92** the entry is not an optimisation. It is
 * the consumer precondition §13B requires: *"a concept may ship as askable only
 * when an actual consumer exists that makes at least one possible answer capable
 * of materially changing a decision."* Where the consumer cannot fire, the
 * question is not worth a tap, and skipping it is the rule rather than a
 * shortcut past it.
 *
 * Both roles are the same predicate because they are the same question. What
 * differs is whether an entry exists, and the entries are here rather than
 * scattered so the whole of what routing 92 narrowed can be read in one place.
 */
const SITUATIONAL: ReadonlyMap<string, readonly ConceptConsumer[]> = new Map([
  [
    CONCEPT.overwhelm,
    [
      {
        site: 'findLimiter',
        what: 'says that a full head is what is in the way',
        /*
         * Two conditions, and each is a way the answer could buy nothing.
         *
         * **Nothing already in the way.** The limiter is ordered — a body nine
         * hours short of rest outranks a full head, which outranks twenty
         * minutes — so when a harder limiter already stands, the answer cannot
         * change what the app says is in the way or what it offers instead.
         * Coverage does not count: it is the app's own blind spot rather than
         * an obstacle (D-063), and an evening with a full head is still an
         * evening with a full head.
         *
         * **Something effortful on offer.** What a limiter does is turn an
         * evening toward something restorative, so where the app is already
         * proposing something light or restful there is nothing for the answer
         * to move. This is the bound D-111 puts on its own exception, applied
         * to a consumer instead of to a share rule — and it is what stops a new
         * question displacing the more concrete ones the guide already holds.
         * A question about what is on his mind is worth a tap when the app is
         * about to ask him to start something, and is a tap spent on nothing
         * when it is not.
         */
        applies: (situation, standing) =>
          (situation.limiter === undefined || situation.limiter.kind === 'coverage') &&
          asksSomethingOfHim(standing) &&
          /*
           * And the concrete question first. A tap spent on what is on his mind
           * is a tap not spent on whether anything hurts, and *"anything sore?"*
           * is the more useful of the two while the answer is unknown: it is
           * about a thing that can be pointed at, and D-111 already marks it as
           * one the app cannot infer and must not get wrong. Once the body has
           * been answered for, the subtler obstacle is worth asking about.
           *
           * Without this the new question displaced the old one on an ordinary
           * first evening — three taps a day is the whole budget, and a
           * newcomer taking one of them from a better question is exactly the
           * added noise this phase is not allowed to introduce.
           */
          isUsable(situation.capacity.soreness),
      },
    ],
  ],
  [
    CONCEPT.workStrain,
    [
      {
        site: 'assembleCapacity',
        what: 'raises the strain assessment when the day has taken it out of him',
        /*
         * Only once there is a day to report on, and only where the answer
         * could still move the assessment.
         *
         * *"How hard has work been pulling today?"* has no answer at half past
         * six in the morning, which is AUD-0005's argument about freshness
         * applied to a question instead of a reading. And the assessment it
         * feeds is already led by sleep shortfall: where that has settled
         * strain at moderate or severe, one scale about work cannot move it —
         * the rule in `assessStrain` is that a single tap never raises the
         * level past `none`, deliberately, so there is nothing left for the
         * answer to do.
         */
        applies: (situation, standing) => {
          if (situation.block === 'early-morning' || situation.block === 'morning') return false
          if (!asksSomethingOfHim(standing)) return false
          const strain = situation.capacity.strain
          return !isUsable(strain) || strain.value === 'none'
        },
      },
    ],
  ],
])

export function consumersFor(definition: ConceptDefinition): readonly ConceptConsumer[] {
  const named = SITUATIONAL.get(definition.id)
  if (named !== undefined) return named
  return [
    { site: 'the decision path', what: 'read wherever the decision is made', applies: ALWAYS },
  ]
}

/** Concepts whose askability this file narrows. Everything else is untouched. */
export function situationallyGated(): ReadonlySet<ConceptId> {
  return new Set([...SITUATIONAL.keys()] as ConceptId[])
}

/**
 * Whether probing this concept could change anything in this situation.
 *
 * The guide's pre-filter, and the one place the answer is decided. It is
 * conservative by construction — a concept with no entry in the table above is
 * always probed — so turning the filter off can only ever add work, never
 * change an answer.
 */
export function couldMatterNow(
  definition: ConceptDefinition,
  situation: Situation,
  standing: ActionVerb | undefined,
): boolean {
  return consumersFor(definition).some((consumer) => consumer.applies(situation, standing))
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
