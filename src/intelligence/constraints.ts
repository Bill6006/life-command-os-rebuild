import type { EntityRef } from '../domain/entities'
import type { RecordId } from '../domain/ids'
import { basisOf, isUsable } from '../domain/knowledge'
import { renderRecommendation } from '../domain/recommendation'
import { addLocalDays, blockOf, localDayIdAt, type Instant } from '../domain/time'
import { blockNoun, horizonWord } from './vocabulary'
import type { Candidate } from './candidates'
import { profileFor } from './moves'
import { answersLimiter, endsAtClock, type PriorMove, type Situation } from './situation'

/**
 * The constraint filter (canonical plan section 17.1, step 6).
 *
 * "Removes actions that do not fit current reality" — and records why, because
 * a rejection nobody can see is indistinguishable from a candidate that was
 * never thought of (section 35).
 *
 * One rule governs the whole file: **a constraint only bites on knowledge that
 * is actually usable.** If the system does not know how much time is left, a
 * forty-minute move is not removed for not fitting — it is kept, scored with
 * the uncertainty it carries, and becomes a reason the guide might ask one
 * question. Filtering on an unknown would be exactly the false-zero failure
 * G-009 exists to prevent, wearing a different hat.
 *
 * Constraint *records* are handled differently from these hard filters. A
 * constraint the owner wrote is free text — "no gym until the shoulder settles"
 * — and guessing which candidates it forbids would be inventing a rule the
 * owner did not state. They are attached as cautions and shown, not enforced.
 */

export type RejectionReason =
  /** The sentence could not be composed. A defect, not a preference — D-018. */
  | 'cannot-be-said'
  /** The owner has explicitly forbidden this family (section 4.3). */
  | 'forbidden'
  /** It does not fit the time that is known to be left. */
  | 'no-time'
  /** It is the wrong thing for this part of the day. */
  | 'wrong-time-of-day'
  /** The body is not up to it, on the evidence. */
  | 'too-strained'
  /** The subject is not here to do it with. */
  | 'subject-not-available'
  /** Offered and settled recently enough that offering it again is noise. */
  | 'just-covered'
  /**
   * It would have taken the place of the one move that answers the
   * limiter — QA-81-006.
   *
   * Not a judgement about the move. It is the app declining to change its mind
   * about what the owner needs because of a fact about what it has already put
   * on a screen.
   */
  | 'not-instead-of-that'

export interface Rejection {
  readonly candidate: string
  readonly reason: RejectionReason
  /** Ordinary language. This appears in the QA trace, not on Now. */
  readonly explanation: string
  readonly evidence: readonly RecordId[]
}

export interface FilterResult {
  readonly kept: readonly Candidate[]
  readonly rejected: readonly Rejection[]
}

function vetoFor(candidate: Candidate, situation: Situation): RecordId | undefined {
  const refs: readonly EntityRef[] = [
    candidate.semantics.subject,
    candidate.semantics.target.object,
  ]
  for (const preference of situation.preferences) {
    if (preference.stance !== 'forbids') continue
    if (refs.some((ref) => ref.id === preference.about.id)) return preference.source
    // A forbidden domain forbids the family, which is what section 4.3 means by
    // "explicitly forbid a recommendation family" rather than one sentence.
    const about = situation.entities.resolve(preference.about)
    if (about?.kind === 'life-domain' && about.domain === candidate.semantics.domain) {
      return preference.source
    }
    /*
     * And when the area is not an entity anybody has written down — AUD-0050.
     *
     * The enforcement above needs a resolvable `life-domain` entity, and the
     * only one that has ever existed is sleep: the engine deliberately names
     * its own routines and never the owner's life (D-021), so there is no
     * entity for "Health & Physical Capacity" and there should not be one just
     * to hold a veto. The record already says which areas it was filed under,
     * which is the same fact without the invented noun.
     */
    if (
      preference.about.kind === 'life-domain' &&
      preference.domains.includes(candidate.semantics.domain)
    ) {
      return preference.source
    }
  }
  return undefined
}

function settledRecently(candidate: Candidate, situation: Situation): RecordId | undefined {
  const since = addLocalDays(situation.at, -1, situation.zone)
  for (const prior of situation.recentMoves) {
    if (prior.at < since) continue
    if (prior.semantics.target.verb !== candidate.semantics.target.verb) continue
    if (prior.semantics.target.object.id !== candidate.semantics.target.object.id) continue
    // A decline is disagreement, not proof the move is useless (section 20) —
    // but repeating it the same evening is not listening either.
    if (prior.state === 'completed' || prior.state === 'declined') return prior.source
    /*
     * And "can't right now" holds for the block it was said in — AUD-0023.
     *
     * It was not held at all, which is what jammed the decline loop. Three
     * presses of **Can't right now** on a Saturday afternoon rotated through
     * three candidates and then came back to the first, badged "You said not
     * right now", and a fourth press changed nothing at all: the only move on
     * offer was one the owner had explicitly declined, and no button did
     * anything.
     *
     * A block rather than a day, because it is a statement about now rather
     * than a verdict — "I can't do that at four" says nothing about eight.
     */
    if (prior.state === 'unable-now' && refusedInThisBlock(prior, situation)) return prior.source
  }
  return undefined
}

function refusedInThisBlock(prior: PriorMove, situation: Situation): boolean {
  if (localDayIdAt(prior.at, situation.zone) !== situation.dayId) return false
  return blockOf(prior.at, situation.zone) === situation.block
}

/**
 * How many separate times a move may be put on screen and left before it stops
 * being put there — QA-81-003.
 *
 * Twice is a coincidence. A third is the app not listening: the audit's own
 * reproduction is the identical kitchen sentence at 06:30, 10:30, 14:30 and
 * 19:30 of one day, on a history where nothing was pressed.
 *
 * The score penalty in `recent-duplication` is the gentler half of this and
 * stays: it is what makes the second showing cheaper than the first. What it
 * cannot do is guarantee an outcome, because a move whose lead is wider than
 * that dimension's whole range at its current weight simply keeps winning — and
 * re-cutting the weights is AUD-0035's job, not this phase's. So the promise
 * the audit actually made is kept here, in the filter, where a bounded rule can
 * keep it without touching the scoring model.
 */
export const SHOWN_ENOUGH_TIMES_TODAY = 2

/**
 * A move already put in front of the owner enough times today.
 *
 * The ledger is the surface's session note (D-118), not history: it holds only
 * today, only moves that were actually rendered, and it is never evidence about
 * whether a move works. This reads it for one purpose — deciding whether saying
 * the same sentence again is listening or repeating.
 */
function shownEnoughToday(candidate: Candidate, situation: Situation): boolean {
  const seen = (situation.shown ?? []).find((entry) => entry.move === candidate.id)
  return (seen?.count ?? 0) >= SHOWN_ENOUGH_TIMES_TODAY
}

/**
 * How many times the owner has said no in this block — AUD-0023.
 *
 * Three refusals in a row is the clearest signal a person can send without
 * typing, and the correct reading of it is not "here is a fourth suggestion".
 * Counted here rather than in `arbitrate` because it is a reading of the
 * situation, and counted per block rather than per day because it is about the
 * stretch of time he is in.
 */
export function refusalsInBlock(situation: Situation): number {
  let refusals = 0
  for (const prior of situation.recentMoves) {
    if (prior.state !== 'declined' && prior.state !== 'unable-now') continue
    if (!refusedInThisBlock(prior, situation)) continue
    refusals += 1
  }
  return refusals
}

/**
 * When the owner last said no in this block — QA-81-004.
 *
 * The engine needs the moment, not the count, to tell a reply from a record
 * that happened to be written earlier in the same evening.
 */
export function lastRefusalInBlock(situation: Situation): Instant | undefined {
  let latest: Instant | undefined
  for (const prior of situation.recentMoves) {
    if (prior.state !== 'declined' && prior.state !== 'unable-now') continue
    if (!refusedInThisBlock(prior, situation)) continue
    if (latest === undefined || prior.at > latest) latest = prior.at
  }
  return latest
}

export function applyConstraints(
  candidates: readonly Candidate[],
  situation: Situation,
): FilterResult {
  const kept: Candidate[] = []
  const rejected: Rejection[] = []

  const reject = (
    candidate: Candidate,
    reason: RejectionReason,
    explanation: string,
    evidence: readonly RecordId[] = [],
  ): void => {
    rejected.push({ candidate: candidate.id, reason, explanation, evidence })
  }

  const strain = situation.capacity.strain
  const usable = situation.usableMinutes
  /** Which candidates went for having been read already, rather than settled. */
  const repetition: Candidate[] = []

  for (const proposed of candidates) {
    const profile = profileFor(proposed.semantics.target.verb)

    const rendered = renderRecommendation(proposed.semantics, situation.entities, situation.block)
    if (!rendered.ok) {
      reject(
        proposed,
        'cannot-be-said',
        `nothing to call it — ${rendered.issues.map((issue) => issue.problem).join(', ')}`,
      )
      continue
    }

    const veto = vetoFor(proposed, situation)
    if (veto !== undefined) {
      reject(proposed, 'forbidden', 'the owner has ruled this out', [veto])
      continue
    }

    if (profile.refuses.includes(situation.block)) {
      reject(proposed, 'wrong-time-of-day', `not a ${situation.block.replace('-', ' ')} move`)
      continue
    }

    const minutes = proposed.semantics.target.minutes
    if (minutes !== undefined && isUsable(usable) && minutes > usable.value) {
      reject(
        proposed,
        'no-time',
        `needs ${minutes} minutes and there are about ${Math.round(usable.value)}`,
        basisOf(usable),
      )
      continue
    }

    if (isUsable(strain) && strain.value === 'severe' && profile.demand === 'effortful') {
      reject(
        proposed,
        'too-strained',
        `too much to ask of ${blockNoun(situation.block)}`,
        basisOf(strain),
      )
      continue
    }

    /*
     * Only a known absence removes a move about someone. Not knowing whether
     * she is here is a question to ask, not a reason to rule the evening out.
     *
     * `childHere` rather than `childPresent` — QA-82-001. The standing
     * arrangement answers whose week this is; her own school day answers
     * whether she is in the room, and the two disagree for six and a half hours
     * of every weekday. The reason names the span rather than the arrangement,
     * because the span is what actually decided it.
     */
    const here = situation.childHere
    const needsChild = proposed.generator === 'fatherhood' && isUsable(here) ? !here.value : false
    if (needsChild) {
      const elsewhere = situation.childElsewhere
      reject(
        proposed,
        'subject-not-available',
        elsewhere === undefined
          ? `she is not here ${horizonWord(situation.block)}`
          : `${elsewhere.label} is on until ${endsAtClock(elsewhere, situation.zone)}`,
        basisOf(here),
      )
      continue
    }

    const settled = settledRecently(proposed, situation)
    if (settled !== undefined) {
      reject(proposed, 'just-covered', 'this one was already settled today', [settled])
      continue
    }

    if (shownEnoughToday(proposed, situation)) {
      repetition.push(proposed)
      reject(
        proposed,
        'just-covered',
        `already on screen ${SHOWN_ENOUGH_TIMES_TODAY} times today and left`,
      )
      continue
    }

    kept.push(proposed)
  }

  /*
   * A rule about listening does not get to change the app's mind — QA-81-006.
   *
   * The repetition rule (D-124) exists so the app stops saying the same thing
   * at four hours of one day. It removes a candidate from the running, and the
   * ranking is then computed over what is left — so on "A morning after three
   * bad nights", once the recovery move had been read twice, the runner-up won:
   * at 23:00, nine hours short of sleep, the app recommended ten minutes of
   * subnetting recall. That is the exact advice the whole of AUD-0003 exists to
   * prevent, and it is the advice the app had spent the day declining, in a
   * sentence that names it — "no subnetting session". Nothing about his sleep
   * had changed. Only the app's record of what it had already displayed.
   *
   * So the two rules are ordered rather than left to compete. Withholding an
   * answer may make the app stop speaking; it may not promote something the
   * situation argues against into the answer's place. What is left when that
   * happens is a real no-action state, and `noActionCopy` says why it is one.
   *
   * Nothing fires here unless every answer to the limiter is gone AND at least
   * one of them went for repetition — a history that simply has no restorative
   * move is the invariant's business (QA-81-001), not this rule's.
   */
  const answered = (candidate: Candidate): boolean =>
    answersLimiter(situation.limiter, profileFor(candidate.semantics.target.verb))

  if (repetition.some(answered) && !kept.some(answered)) {
    const displaced = [...kept]
    kept.length = 0
    for (const candidate of displaced) {
      reject(
        candidate,
        'not-instead-of-that',
        'what is in the way still stands, and this does not answer it',
      )
    }
  }

  return { kept, rejected }
}
