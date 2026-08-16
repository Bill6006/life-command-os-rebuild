import { createRecordFactory } from '../domain/build'
import { newRecordId, type RecordId } from '../domain/ids'
import { verbLabel, type ActionVerb } from '../domain/recommendation'
import type { BeliefCorrectionRecord } from '../domain/records'
import type { Instant, TimeZoneId } from '../domain/time'
import { parseBeliefKey } from './learning'

/**
 * The owner disagreeing with something the app worked out (section 62).
 *
 * The write side of `learning.ts`, and its own file for a reason the boundary
 * cares about: a surface is allowed to record what the owner did and is not
 * allowed to read how a move is ranked. Recording a correction is the first
 * thing; the belief it corrects is the second. Keeping them apart is what lets
 * Now offer the button without being able to reach the arithmetic behind it.
 *
 * Section 62 lists what must be correctable — facts, context, inferred
 * patterns, goals, direction, coverage interpretation, domain status, learned
 * preference. What this phase can honestly offer is the last two categories: a
 * learned effect and a learned preference, both visible on Now at the moment
 * they influence a decision, because a belief the owner cannot see is a belief
 * they cannot correct.
 */

export interface CorrectionMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  /** The real clock, distinct from the moment being reasoned about (D-037). */
  readonly recordedAt?: Instant
}

/**
 * A correction, as a canonical record.
 *
 * Like everything else it lands as an appended record and is read back through
 * the same history fold. There is deliberately no separate table of things the
 * owner has vetoed — a second store of truth is how a correction gets quietly
 * lost in a restore, which is the failure section 29 exists to prevent.
 */
export function beliefCorrectionRecord(
  belief: string,
  stance: 'reject' | 'restore',
  reason: string,
  moment: CorrectionMoment,
  id: RecordId = newRecordId(),
): BeliefCorrectionRecord {
  const build = createRecordFactory({
    zone: moment.zone,
    provenance: { source: 'owner', writtenBy: 'now' },
  })
  return build(
    'belief-correction',
    {
      occurredAt: moment.now,
      ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
      id,
    },
    { belief, stance, reason },
  )
}

/**
 * What to call a belief out loud, so a correction says what it is about.
 *
 * D-039's rule, applied to a third kind of owner-facing sentence: a question
 * names what it is about, and so must a button that withdraws something. "That
 * is not right" on its own could be about anything on the screen.
 */
export function describeBelief(key: string): string {
  const parsed = parseBeliefKey(key)
  if (parsed === undefined) return key
  const move = verbLabel(parsed.verb as ActionVerb).toLowerCase()
  switch (parsed.aspect) {
    case 'effect':
      return `what ${move} does for you`
    case 'follow-through':
      return `whether ${move} tends to happen`
    case 'appetite':
      return `whether you want ${move}`
  }
}
