import type { DayBlock } from '../domain/time'
import { profileFor } from './moves'
import { blockNoun, describeDuration } from './vocabulary'

/** Sentence case for a phrase that is normally read mid-sentence. */
function capitaliseFirst(phrase: string): string {
  return phrase.charAt(0).toUpperCase() + phrase.slice(1)
}

/**
 * A stretch of free time, in the unit a person would use for it.
 *
 * "about 300 minutes free" is a true sentence nobody says. This used to switch
 * to hours here, privately, while the premise on Now went on saying "about 120
 * minutes free" — two renderings of one quantity, in two files, disagreeing on
 * the same evening. AUD-0038(b) is that finding; `describeDuration` is the one
 * formatter both now go through (D-178).
 */
const freeTime = describeDuration
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
  /**
   * Nothing was proposed, and the history is not the reason — AUD-0034.
   *
   * The fourth reason DEF-0017 established the need for and did not add. A
   * rested seven o'clock and every evening his daughter is away both landed on
   * `nothing-proposed`, which renders as "Nothing to suggest just yet" — the
   * app saying it is not ready, to a man who has given it plenty. The honest
   * admission is a different one and a more useful one: there is nothing *here*
   * that the app knows how to help with.
   */
  | 'nothing-in-reach'
  /** Everything proposed was ruled out by the situation. */
  | 'everything-ruled-out'
  /** Things survived, and none of them was worth doing. */
  | 'nothing-worth-doing'
  /**
   * Two refusals in this block, so the app stopped offering — AUD-0023.
   *
   * The step before `enough-for-now`, and a different claim. Three passes mean
   * the block is over. Two mean the app has been wrong twice about the same
   * hour, and a third guess from the same ranking is very unlikely to be the
   * one that lands: something it cannot see is in the way. The correct move is
   * to stop guessing and ask, which is what the guide does alongside this — and
   * when it has nothing worth asking, saying so plainly is still better than a
   * third suggestion.
   */
  | 'not-landing'
  /**
   * The owner has said no three times in this block — AUD-0023.
   *
   * Not a failure of the catalogue: things were proposed and one of them may
   * well have been worth doing. It is the app reading the room.
   */
  | 'enough-for-now'
  /**
   * He has done what there was, and the honest answer is to say so — F11, F13.
   *
   * The sixth of F13's six silences, and the one the product had no word for.
   * *"The owner wants accomplishment and direction, not a system whose
   * definition of success is another available task."* Before this, an evening
   * where he did the thing and there was nothing else read as **"Nothing new
   * for today"** — the app reporting the emptiness of its own list on an
   * evening he had actually got somewhere.
   *
   * **It is a re-labelling of a silence, never a new one.** The decision is
   * identical: no move, for exactly the reasons that already applied. What
   * changes is which sentence is true about it, and the condition is narrow —
   * everything left was withheld for having already been on screen, and at
   * least one of them was completed today.
   */
  | 'enough-done-today'

/**
 * A move has to be worth making — and the bar is re-derived, not carried across.
 *
 * ## Why it moved
 *
 * `WORTH_DOING` was 0.05 on a scale that no longer exists. Three dimensions
 * worth 5.3 of about 15.8 weight units returned zero **at full weight** on an
 * ordinary evening, dividing every candidate's score by roughly one and a half
 * — so the same absolute bar was a far harder bar on a directionless evening
 * than on a directed one, and "nothing worth doing" was systematically more
 * likely exactly when the app had least context (AUD-0035). Those three now
 * abstain, and carrying the old number across would have quietly lowered the
 * bar by the same factor.
 *
 * ## Where this one comes from
 *
 * **The behaviour the owner has already approved, re-expressed on a scale that
 * means the same thing everywhere.** A score is a weighted mean, and the old
 * one was taken over a denominator carrying between 3.5 and 5.3 units of forced
 * zero depending on how much context a history happened to have. Measured
 * across the library, the same decisions land between 1.29 and 1.51 times
 * higher once the dead weight is gone — so the old bar of 0.05 corresponds to
 * somewhere between 0.064 and 0.076, and **which of those it corresponds to
 * depends on the history**, which is the defect stated as a translation
 * problem.
 *
 * The bar is set at the bottom of that range and rounded down. Setting it at
 * the top would have raised the bar hardest for the histories with least
 * context — AUD-0035's own complaint with the sign flipped — and the app would
 * have gone quieter on exactly the evenings it was already too quiet on.
 *
 * Checked rather than assumed: `tests/synthetic/instrument-recut.test.ts` holds
 * the two properties that matter. Every history that moved before still moves,
 * and the bar behaves identically on a directed and an undirected evening with
 * otherwise identical facts — which is the thing the old bar could not do.
 */
export const WORTH_DOING = 0.06

/**
 * Close enough to be worth saying so — AUD-0033, re-derived under AUD-0035.
 *
 * **Half the bar**, and the derivation is the point: a gap smaller than half
 * of what a move needs in order to be worth doing at all is not a difference
 * the app should present as a decision. Two candidates that close are two
 * answers, and the owner is told so.
 *
 * It stays absolute, and it may now do so honestly. AUD-0033's complaint was
 * that an absolute threshold sat on a scale that moved with how many dimensions
 * happened to be inert — "it should be relative to the spread of the ranked
 * field, **or the two must be fixed together**". The two have now been fixed
 * together, so the scale means the same thing on a directed and an undirected
 * evening and a fixed figure means the same thing on both.
 *
 * `MAX_NUDGE` went the other way, and for a different reason: it is a bound on
 * an outside opinion rather than a reading of the app's own field, so it is
 * expressed against the spread it is not allowed to overturn (AUD-0039).
 *
 * Only a note in the trace and one line on Now. An earlier version used a
 * window like this in the comparator itself, treating anything inside it as a
 * tie to be settled on friction — and that comparator was not transitive: with
 * three moves two hundredths apart, the first could tie the second and the
 * second tie the third while the first beat the third outright, which leaves
 * the sort order up to the engine's implementation.
 */
export const CLOSE_ENOUGH_TO_MENTION = WORTH_DOING / 2

export interface Deferral {
  /** The move being held. It is a real ranked candidate, not a placeholder. */
  readonly evaluation: Evaluation
  /** The part of today it is being held for. Always later, always today. */
  readonly until: DayBlock
  /**
   * What made it a deferral rather than a move — QA-82-002.
   *
   * Written here because here is where the deferral is decided. The evidence
   * panel exists to answer *why this?*, and on a held decision the question it
   * has to answer is *why later rather than now?* — which the held move's own
   * `leansOn` list cannot answer, because that list is about the move and the
   * question is about the hour. It ran the panel on a move it was not offering
   * and left the actual reasoning nowhere on the screen.
   *
   * Each line is one of the conditions `heldForLater` actually tested, in the
   * order it tested them, in the owner's words rather than the profile's. The
   * panel prints them and does not recompute them: section 51 forbids a
   * parallel explanation truth, and there is nothing here to disagree with
   * because nothing here is derived twice.
   */
  readonly because: readonly string[]
}

export interface Selection {
  readonly chosen: Evaluation | undefined
  /** Everything that survived, best first. */
  readonly ranked: readonly Evaluation[]
  readonly noAction: NoActionReason | undefined
  /** Set when the best move is worth doing and worth doing later — AUD-0024. */
  readonly deferred: Deferral | undefined
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
      deferred: undefined,
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
      deferred: undefined,
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

  /*
   * Not this, because it will go better later — AUD-0024, AUD-0004.
   *
   * Bounded hard, because a deferral path is a new way for the app to say
   * nothing and "hold" must not become its comfortable answer. Three conditions
   * have to hold at once and each removes a different way of abusing it, and
   * they are checked *after* arbitration rather than instead of it, so the trace
   * still shows what would have been chosen.
   */
  const deferred = heldForLater(best, situation)
  if (deferred !== undefined) {
    return {
      chosen: undefined,
      ranked,
      margin: runnerUp === undefined ? undefined : best.score - runnerUp.score,
      deferred,
      noAction: undefined,
      notes: [
        ...notes,
        `${best.candidate.id} suits ${deferred.until} better than ${situation.block}, and there is room in it, so it was held`,
      ],
    }
  }

  return {
    chosen: best,
    ranked,
    margin: runnerUp === undefined ? undefined : best.score - runnerUp.score,
    deferred: undefined,
    noAction: undefined,
    notes,
  }
}

/**
 * How much of a later block has to be the owner's own before it can be named.
 *
 * Twenty minutes, the same figure below which the clock is what is in the way
 * (`SHORT_ENOUGH_TO_LIMIT`). Deferring something into a stretch of day he does
 * not have would be the confident wrongness AUD-0004 is about, arriving through
 * the door AUD-0004 opened.
 */
const ROOM_IN_A_LATER_BLOCK = 20

/**
 * How far off a later block has to be before deferring to it is advice.
 *
 * An hour, and the reason is what the sentence would otherwise be worth. "Leave
 * this until the morning" said at twenty to seven is not a decision the owner
 * can act on differently from "do it now" — the morning is twenty minutes away
 * and he would simply wait, which is not something the app needed to say. The
 * figure is the guide's own smallest open-ended answer ("An hour"), which is
 * the coarsest unit this app measures a stretch of free time in.
 *
 * Without it, every block boundary becomes a deferral opportunity and `hold`
 * becomes the comfortable default AUD-0024 warns about — reachable at the exact
 * moment it says least.
 */
const WORTH_WAITING_FOR_MS = 60 * 60_000

/**
 * Whether the best move is worth doing and worth doing later.
 *
 * **It has to be a real move first.** Only the candidate arbitration already
 * chose, already above the bar. Holding something not worth doing at all would
 * be `nothing-worth-doing` wearing a more confident face.
 *
 * **The gap has to be material, and "material" is not a threshold anybody
 * tuned.** `context-fit` scores a move on whether it belongs in the block it is
 * in, and the profile answers that as a yes or a no. So the condition is the
 * discrete one: this is an odd fit for now, and it genuinely suits a part of
 * today that has not happened yet.
 *
 * **The later block is the next one, and it has to be real, free and far
 * enough off to be worth saying.** Real and free
 * come from the obligations AUD-0004 added; soonest is what caps the whole
 * thing structurally — a move is held into the next block that suits it, so it
 * is offered there rather than being deferred again and again down the day.
 * There is no counter anywhere, and there does not need to be one.
 */
function heldForLater(best: Evaluation, situation: Situation): Deferral | undefined {
  const profile = profileFor(best.candidate.semantics.target.verb)
  if (profile.suits.includes(situation.block)) return undefined

  /*
   * The next part of today, and no further.
   *
   * Deferring across the whole day is not the answer AUD-0024 asks for; it is
   * the app planning the owner's Saturday. At twenty to seven with his daughter
   * up and nothing booked, "the afternoon suits this better" is worse advice
   * than simply saying it now — and holding into any later block that happened
   * to suit produced exactly that. "Not now, later" is a credible thing to say
   * about the next stretch of the day and nothing beyond it.
   *
   * It is also the second half of the cap. One candidate block, one hour of
   * lead time, and a block that has to be his: three conditions that all have
   * to line up, on a move that is already worth doing. `hold` cannot become the
   * comfortable default because there is almost never anywhere for it to go.
   */
  const next = situation.laterToday[0]
  if (next === undefined) return undefined
  if (!profile.suits.includes(next.block)) return undefined
  if (profile.refuses.includes(next.block)) return undefined
  if (next.from - situation.at < WORTH_WAITING_FOR_MS) return undefined

  const minutes = best.candidate.semantics.target.minutes
  if (next.free < Math.max(ROOM_IN_A_LATER_BLOCK, minutes ?? 0)) return undefined

  return {
    evaluation: best,
    until: next.block,
    // The three conditions above, in the order they were tested — QA-82-002.
    because: [
      `${capitaliseFirst(blockNoun(situation.block))} is not when this one goes well.`,
      `${capitaliseFirst(blockNoun(next.block))} is the next part of today that suits it.`,
      minutes === undefined
        ? `There is room for it in ${blockNoun(next.block)} — about ${freeTime(next.free)} of it is not spoken for.`
        : `There is room for it in ${blockNoun(next.block)} — about ${freeTime(next.free)} of it is not spoken for, and this takes ${minutes} minutes.`,
    ],
  }
}
