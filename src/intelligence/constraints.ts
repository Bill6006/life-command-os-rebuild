import type { EntityRef } from '../domain/entities'
import type { RecordId } from '../domain/ids'
import { basisOf, isUsable } from '../domain/knowledge'
import { renderRecommendation } from '../domain/recommendation'
import { addLocalDays } from '../domain/time'
import { blockNoun, horizonWord } from './vocabulary'
import type { Candidate } from './candidates'
import { profileFor } from './moves'
import type { Situation } from './situation'

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
  }
  return undefined
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

    // Only a known absence removes a move about someone. Not knowing whether
    // she is here is a question to ask, not a reason to rule the evening out.
    const needsChild =
      proposed.generator === 'fatherhood' && isUsable(situation.childPresent)
        ? !situation.childPresent.value
        : false
    if (needsChild) {
      reject(
        proposed,
        'subject-not-available',
        `she is not here ${horizonWord(situation.block)}`,
        basisOf(situation.childPresent),
      )
      continue
    }

    const settled = settledRecently(proposed, situation)
    if (settled !== undefined) {
      reject(proposed, 'just-covered', 'this one was already settled today', [settled])
      continue
    }

    kept.push(proposed)
  }

  return { kept, rejected }
}
