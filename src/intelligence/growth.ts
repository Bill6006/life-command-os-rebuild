import { createRecordFactory } from '../domain/build'
import type { LifeDomainId } from '../domain/domains'
import type { EntityRef } from '../domain/entities'
import { newRecordId, type RecordId } from '../domain/ids'
import type {
  CanonicalRecord,
  CoverageUpdateRecord,
  DomainUpdateRecord,
  Provenance,
} from '../domain/records'
import type { Instant, TimeZoneId } from '../domain/time'
import { localDaysBetween, localDayIdAt } from '../domain/time'
import type { Episode } from './lifecycle'
import { resultReached } from './outcomes'
import type { Situation } from './situation'

/**
 * Growth evidence, and when it is worth proposing a change (section 9).
 *
 * Section 9 sets out the whole loop and then puts one sentence under it as a
 * rule:
 *
 * > Meaningful growth-stage changes should not be silently invented from one
 * > event.
 *
 * So this proposes and never decides. Three things have to be true before the
 * app will even ask: enough separate occasions, all of them going well, and
 * nothing the owner has already said about it since. He confirms, rejects, or
 * corrects — section 9's own list — and either answer is recorded, because a
 * question that changes nothing is D-029's complaint with a different label.
 *
 * **Why three occasions.** `PATIENCE` is 3 in `learning.ts` for the same reason
 * and it is the same claim: one evening is an anecdote. A child who orders her
 * own food once has had a good day. A child who does it three times running has
 * changed, and the app may say so out loud — as a question.
 */

export const GROWTH_OCCASIONS = 3

/** How well it has to have gone. `all the way`, not `part of the way`. */
const GROWTH_CLEARLY = 0.9

/**
 * How long a development skill goes before its evidence is worth refreshing.
 *
 * Section 8's own example: "a child's developmental skill may need periodic
 * evidence". A fortnight is periodic without being a schedule, and the number
 * is here rather than in the concept registry because the thing that ages is
 * the skill rather than any concept — there is no `ordering-her-own-food`
 * concept and there should not be one.
 */
export const GROWTH_EVIDENCE_AGES_AFTER_DAYS = 14

export const GROWTH_PROVENANCE: Provenance = { source: 'owner', writtenBy: 'now' }

export interface GrowthSuggestion {
  readonly skill: EntityRef
  /** The life area the update belongs to, taken from the skill itself. */
  readonly domain: LifeDomainId
  readonly person: EntityRef | undefined
  /** What the app noticed, in ordinary words, naming her and the skill. */
  readonly headline: string
  /** What would be written down if he agrees. */
  readonly statement: string
  readonly occasions: number
  readonly evidence: readonly RecordId[]
}

/** Episodes of practice at one growth skill, most recent last. */
function occasionsFor(situation: Situation, skill: EntityRef): readonly Episode[] {
  return situation.learning.episodes
    .filter(
      (episode) =>
        episode.semantics.target.verb === 'growth-opportunity' &&
        episode.semantics.target.object.id === skill.id &&
        episode.shownAt <= situation.at,
    )
    .sort((a, b) => a.shownAt - b.shownAt)
}

/**
 * When this skill was last practised, in owner-local days.
 *
 * Undefined when it never has been, which is a different thing and is treated
 * as one: a skill with no history at all is not stale evidence, it is no
 * evidence, and G-009's distinction holds here as everywhere else.
 */
export function daysSincePractice(situation: Situation, skill: EntityRef): number | undefined {
  const past = occasionsFor(situation, skill)
  const last = past[past.length - 1]
  if (last === undefined) return undefined
  return Math.max(0, localDaysBetween(last.dayId, localDayIdAt(situation.at, situation.zone)))
}

/** Whether a practice opportunity here is about refreshing what is known. */
export function practiceEvidenceHasAged(situation: Situation, skill: EntityRef): boolean {
  const days = daysSincePractice(situation, skill)
  return days === undefined || days >= GROWTH_EVIDENCE_AGES_AFTER_DAYS
}

/**
 * Whether the owner has already answered a suggestion about this skill.
 *
 * Both answers count, and both are records: agreeing writes a `domain-update`
 * saying what changed, and "not yet" writes a `coverage-update` saying the area
 * was looked at. Either way the app has been told, and asking again on the
 * strength of the same evidence would be nagging.
 *
 * It is a watershed rather than a mute button (D-047): what suppresses the
 * suggestion is an answer given *after* the evidence that raised it, so a
 * fourth good occasion after a "not yet" is genuinely new and may raise it
 * again.
 */
function answeredSince(situation: Situation, skill: EntityRef, since: Instant): boolean {
  for (const record of situation.view.history.effective) {
    if (record.kind !== 'domain-update' && record.kind !== 'coverage-update') continue
    if (record.occurredAt <= since) continue
    if (record.occurredAt > situation.at) continue
    if (record.entities.some((ref) => ref.id === skill.id)) return true
    if (record.kind === 'coverage-update' && record.subArea === skill.id) return true
  }
  return false
}

/**
 * Growth areas the evidence says have moved on, as questions.
 *
 * Nothing here writes anything and nothing here changes a decision. It is a
 * reading of what already happened, offered beside the move it belongs to —
 * the same place, and for the same reason, as the belief correction in
 * `explain.ts`: a finding the owner cannot see is one he cannot correct.
 */
export function growthSuggestions(situation: Situation): readonly GrowthSuggestion[] {
  const out: GrowthSuggestion[] = []

  for (const skill of situation.entities.byKind('development-skill')) {
    const ref: EntityRef = { id: skill.id, kind: skill.kind }
    const past = occasionsFor(situation, ref)

    const cleared: Episode[] = []
    for (const episode of past) {
      if (episode.state !== 'completed') continue
      const reached = resultReached(episode)
      if (reached === undefined || reached < GROWTH_CLEARLY) continue
      cleared.push(episode)
    }

    // Section 9's rule, and the whole of it: not from one event, and not from
    // two. Three separate occasions that all went the same way.
    if (cleared.length < GROWTH_OCCASIONS) continue

    const latest = cleared[cleared.length - 1]
    if (latest === undefined) continue
    if (answeredSince(situation, ref, latest.shownAt)) continue

    const person = situation.entities.linked(skill.id, 'about-person')
    const who = person?.label ?? 'she'
    out.push({
      skill: ref,
      domain: skill.domain,
      person: person === undefined ? undefined : { id: person.id, kind: person.kind },
      headline: `${who} has managed ${skill.label} on her own ${cleared.length} times running.`,
      statement: `${who} does ${skill.label} independently now.`,
      occasions: cleared.length,
      evidence: cleared.map((episode) => episode.recommendation),
    })
  }

  return out
}

export interface GrowthAnswerMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  readonly recordedAt?: Instant
}

/**
 * The owner's answer, as a canonical record.
 *
 * Agreeing is a `domain-update`: the app's understanding of that area changed,
 * and the sentence is what changed. "Not yet" is a `coverage-update`: nothing
 * about the skill changed, and the area has nonetheless just been reviewed by
 * the person who would know — which is real coverage, and the coverage engine
 * reads it as such rather than continuing to call the area quiet.
 *
 * Both are read. That is the point of choosing these two kinds over a flag.
 */
export function growthAnswerRecord(
  suggestion: GrowthSuggestion,
  agreed: boolean,
  moment: GrowthAnswerMoment,
  id: RecordId = newRecordId(),
): DomainUpdateRecord | CoverageUpdateRecord {
  const build = createRecordFactory({ zone: moment.zone, provenance: GROWTH_PROVENANCE })
  const domain = suggestion.domain
  const entities = [
    suggestion.skill,
    ...(suggestion.person === undefined ? [] : [suggestion.person]),
  ]
  const envelope = {
    occurredAt: moment.now,
    ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
    id,
    domains: [domain],
    entities,
  }

  return agreed
    ? build('domain-update', envelope, { domain, summary: suggestion.statement })
    : build('coverage-update', envelope, {
        domain,
        evidenceStrength: 'moderate',
        subArea: suggestion.skill.id,
      })
}

/** Just the record, for a surface that only wants to append it. */
export function growthAnswerRecords(
  suggestion: GrowthSuggestion,
  agreed: boolean,
  moment: GrowthAnswerMoment,
): readonly CanonicalRecord[] {
  return [growthAnswerRecord(suggestion, agreed, moment)]
}
