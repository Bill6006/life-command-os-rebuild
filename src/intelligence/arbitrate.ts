import { profileFor } from './moves'
import { blockNoun } from './vocabulary'
import type { Evaluation } from './evaluate'
import type { Situation } from './situation'

/**
 * Global arbitration (canonical plan section 17.1 step 8, and 17.2).
 *
 * **This is the only place in the system that chooses.** Generators propose,
 * constraints remove, the evaluator ranks — and exactly one function decides
 * which move reaches the owner, or that none should. Section 17.2 forbids a
 * domain module presenting a competing final recommendation, and the way to
 * make that structural rather than aspirational is for there to be one
 * function, in one file, that anything else has to go through.
 * `tests/unit/architecture-guards.test.ts` fails the build if a feature reaches
 * around it.
 *
 * Doing nothing is a real outcome here, not a failure state. Section 19: a
 * valid decision may be wait, rest, continue, stop, or no additional move. The
 * bar is a positive score — a move has to be worth making, not merely be the
 * least bad thing that survived the filter.
 */

export type NoActionReason =
  /** Nothing was proposed at all — the history is too thin to suggest from. */
  | 'nothing-proposed'
  /** Everything proposed was ruled out by the situation. */
  | 'everything-ruled-out'
  /** Things survived, and none of them was worth doing. */
  | 'nothing-worth-doing'

/**
 * Close enough to be worth saying so in the trace.
 *
 * Only a note. An earlier version used a window like this in the comparator
 * itself, treating anything inside it as a tie to be settled on friction — and
 * that comparator was not transitive: with three moves two hundredths apart,
 * the first could tie the second and the second tie the third while the first
 * beat the third outright, which leaves the sort order up to the engine's
 * implementation. A reproducible trace cannot be built on that, and friction is
 * already one of the dimensions, so counting it twice was wrong anyway.
 */
export const CLOSE_ENOUGH_TO_MENTION = 0.02

/** A move has to be worth making. Anything at or below this is not. */
export const WORTH_DOING = 0.05

export interface Selection {
  readonly chosen: Evaluation | undefined
  /** Everything that survived, best first. */
  readonly ranked: readonly Evaluation[]
  readonly noAction: NoActionReason | undefined
  /**
   * How far ahead the winner finished, when there was a runner-up — AUD-0033.
   *
   * Structured rather than prose, because the margin was already computed here
   * and put only into `notes`: a 0.002 gap and a 0.2 gap produced identical
   * screens, so the app presented a near-tie with exactly the confidence of a
   * clear win. Undefined when nothing else survived, which is a different state
   * from a wide margin and reads differently on Now.
   */
  readonly margin: number | undefined
  /** How the choice was settled, in the trace's words. */
  readonly notes: readonly string[]
}

/** Strictly by score, and the rest only decides an exact draw. */
function compare(a: Evaluation, b: Evaluation, situation: Situation): number {
  if (a.score !== b.score) return b.score - a.score

  const frictionA = profileFor(a.candidate.semantics.target.verb).friction
  const frictionB = profileFor(b.candidate.semantics.target.verb).friction
  if (frictionA !== frictionB) return frictionA - frictionB

  const limiterDomain = situation.limiter?.domain
  if (limiterDomain !== undefined) {
    const aFits = a.candidate.semantics.domain === limiterDomain ? 0 : 1
    const bFits = b.candidate.semantics.domain === limiterDomain ? 0 : 1
    if (aFits !== bFits) return aFits - bFits
  }

  // Last resort, and it carries no meaning: it exists so that the same history
  // ranks the same way on every device and in every replay.
  return a.candidate.id < b.candidate.id ? -1 : a.candidate.id > b.candidate.id ? 1 : 0
}

export function arbitrate(
  evaluations: readonly Evaluation[],
  situation: Situation,
  ruledOut: number,
): Selection {
  const ranked = [...evaluations].sort((a, b) => compare(a, b, situation))
  const best = ranked[0]

  if (best === undefined) {
    return {
      chosen: undefined,
      ranked,
      margin: undefined,
      noAction: ruledOut > 0 ? 'everything-ruled-out' : 'nothing-proposed',
      notes:
        ruledOut > 0
          ? [
              `${ruledOut} move(s) were proposed and none of them fitted ${blockNoun(situation.block)}`,
            ]
          : ['nothing in this history suggests a move'],
    }
  }

  if (best.score <= WORTH_DOING) {
    return {
      chosen: undefined,
      ranked,
      margin: undefined,
      noAction: 'nothing-worth-doing',
      notes: [
        `the best of ${ranked.length} came out at ${best.score.toFixed(2)}, which is not worth asking for`,
      ],
    }
  }

  const runnerUp = ranked[1]
  const notes = [`chosen at ${best.score.toFixed(3)} from ${ranked.length} that fitted`]
  if (runnerUp !== undefined && best.score - runnerUp.score <= CLOSE_ENOUGH_TO_MENTION) {
    notes.push(
      `close — ${runnerUp.candidate.id} came in at ${runnerUp.score.toFixed(3)}, ${(best.score - runnerUp.score).toFixed(3)} behind`,
    )
  }

  return {
    chosen: best,
    ranked,
    margin: runnerUp === undefined ? undefined : best.score - runnerUp.score,
    noAction: undefined,
    notes,
  }
}
