import { CONCEPT } from '../domain/concepts'
import type { EntityRef } from '../domain/entities'
import type { RecordId } from '../domain/ids'
import { basisOf, isUsable } from '../domain/knowledge'
import { renderRecommendation } from '../domain/recommendation'
import { addLocalDays, blockOf, localDayIdAt, type Instant } from '../domain/time'
import { blockNoun, horizonWord } from './vocabulary'
import type { Candidate } from './candidates'
import { standingBlockerFor } from './blockers'
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
 * ## Constraint records — and the half of that rule this phase reverses (C21)
 *
 * The rule here used to be **shown, never enforced**, for every constraint
 * record without exception. Half of it stands and half of it was too wide.
 *
 * **What stands.** A constraint the owner wrote is free text — *"no gym until
 * the shoulder settles"* — and guessing which candidates it forbids would be
 * inventing a rule he did not state. Those are still attached as cautions and
 * shown.
 *
 * **What is reversed — C21, §6.5, D-274.** Some constraint records are not free
 * text at all: the app wrote them itself, from a **closed list of causes**, at
 * the moment the owner tapped one, and each carries a structured cause and the
 * object it is about. *"A walk needs somewhere I was not"* is not a sentence
 * anybody has to interpret. Not enforcing those was the app capturing an answer
 * honestly and then throwing it away — D-187 named that as the honest state
 * *until* something could act on it, and this is that something.
 *
 * So the filter now removes a move a **structured** standing blocker is about,
 * and leaves every free-text constraint exactly where it was. `blockers.ts`
 * owns the vocabulary and `standingBlockerFor` is the single reader, so the
 * question *"is this move blocked?"* has one answer wherever it is asked.
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
  /**
   * It means going out and somebody is in his care — C21, D-187's other half.
   *
   * **Not blocker enforcement, and the distinction is the phase boundary.**
   * F08's aggregation — recorded blockers becoming standing suppression rules
   * across a family of moves — is routing 93's, and nothing here does it. This
   * is one concrete pairing of two facts the app now holds: a candidate that
   * says it requires leaving, and a supervision constraint that says he cannot.
   * A move that does not fit current reality is exactly what this filter is
   * for, and it is the same shape as `subject-not-available` — she is at
   * school, so a move about her does not fit; he cannot leave, so a move that
   * means leaving does not fit.
   */
  | 'cannot-leave'
  /** Offered and settled recently enough that offering it again is noise. */
  | 'just-covered'
  /**
   * He has already said what stops this one, and it has not been lifted — C21.
   *
   * The enforcement half of the blocker capture. Distinct from `cannot-leave`,
   * which is one concrete pairing about supervision and egress: this is the
   * general rule for every standing cause on the closed list, scoped to the
   * object each one was recorded about.
   */
  | 'blocked-before'
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

/**
 * The one thing about this filter a caller may turn off, and why it exists.
 *
 * §6.5's completion condition for C21 is *"enforcement proved by reintroduction
 * — put the non-enforcement back and watch the test fail"*. A test that could
 * only delete the constraint from the history would be proving something else:
 * that a rule needs evidence. This is the seam that lets the **old rule** be put
 * back against the **same** history, which is the proof the condition asks for.
 *
 * It is the shape `DecideOptions.probe` already establishes, and it carries the
 * same discipline: production never passes it,
 * `tests/unit/architecture-guards.test.ts` fails the build if anything outside a
 * test does, and the default is the safe answer rather than the convenient one.
 */
export interface FilterOptions {
  /** Default true. False reproduces the shown-never-enforced rule C21 reversed. */
  readonly enforceStandingBlockers?: boolean
}

const ENFORCING: Required<FilterOptions> = { enforceStandingBlockers: true }

export function applyConstraints(
  candidates: readonly Candidate[],
  situation: Situation,
  options: FilterOptions = ENFORCING,
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
  const enforcing = options.enforceStandingBlockers ?? true
  /** Which candidates went for having been read already, rather than settled. */
  const repetition: Candidate[] = []

  for (const proposed of candidates) {
    // The candidate's own profile — AUD-0045. Looking the verb up again here
    // would give a 90-minute session the size of a 25-minute walk, and this is
    // the filter that reads `size` for `no-time` and `demand` for
    // `too-strained`.
    const profile = proposed.profile

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

    /*
     * And he cannot leave — C21, and the first thing D-187's capture reaches.
     *
     * Both halves had to exist before this could be written: a concept with a
     * registry home for *"someone's in my care"*, and something on the
     * candidate distinguishing an indoor move from an outdoor one. Until this
     * phase there was neither, and `blockers.ts` said so in as many words —
     * *"nothing acts on this, deliberately"*.
     *
     * It bites on a **known** constraint only. Not having been told he must
     * stay is not being told he may leave (G-009), and the constraint expires
     * with the day it was said on unless he lifts it sooner.
     */
    const mustStay = situation.mustStay
    if (profile.requiresLeaving === true && isUsable(mustStay) && mustStay.value) {
      const said = situation.constraints.find(
        (constraint) => constraint.concept === CONCEPT.mustStay,
      )
      reject(
        proposed,
        'cannot-leave',
        said?.description ?? 'you said you could not leave',
        basisOf(mustStay),
      )
      continue
    }

    /*
     * And what he has already said stops this one — C21, D-274.
     *
     * `standingBlockerFor` is the same function `blockerQuestionFor` uses to
     * stay silent about a move it already knows the answer for, so the app
     * cannot be in the position of declining to ask because it knows, and then
     * offering the move anyway because nothing read what it knew. One reader,
     * two consumers.
     *
     * It runs **after** `cannot-leave`, which is the supervision case's own more
     * specific rejection with its own sentence about somebody being in his care.
     * A move removed for a reason the owner would recognise beats one removed
     * for a general one.
     */
    const blocked = enforcing
      ? standingBlockerFor(situation, proposed.semantics, profile)
      : undefined
    if (blocked !== undefined) {
      reject(proposed, 'blocked-before', blocked.description, [blocked.source])
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
    answersLimiter(situation.limiter, candidate.profile)

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
