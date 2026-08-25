import { createRecordFactory } from '../domain/build'
import { DOMAIN, type LifeDomainId } from '../domain/domains'
import type { EntityRef } from '../domain/entities'
import { newRecordId, type RecordId } from '../domain/ids'
import type {
  CommitmentRecurrence,
  CommitmentWindowRecord,
  CorrectionRecord,
  Provenance,
} from '../domain/records'
import type { Instant, IsoWeekday, TimeZoneId } from '../domain/time'
import type { Situation } from './situation'

/**
 * Obligations, written down and taken back (AUD-0004).
 *
 * This file **records and never decides**, which is the line
 * `docs/ARCHITECTURE_BOUNDARIES.md` draws and the reason it may sit on the list
 * of modules a Life surface can import: it turns a tap into a canonical record
 * and answers what the panel needs to draw itself. What an obligation *means*
 * for a decision is `situation.ts`'s job and then the evaluator's, reached the
 * same way every other fact is.
 *
 * ## Why there are exactly two seeds
 *
 * Section 4.5 constrains input burden, and AUD-0004 names the risk directly:
 * this adds input burden, and the mitigation is to ask twice, durably, and
 * never re-ask — the same shape as the custody arrangement, which already
 * works. So the app knows about two obligations by name, and there is no
 * general "add an event" form: the school day and the working day are the two
 * that change what should be suggested at seven in the morning, and everything
 * else is a calendar, which is a different product.
 *
 * They are not asked on Now. They live on Life, which the owner visits when he
 * wants to look at the model, so an unanswered seed costs him nothing and
 * answering it is never something the app interrupted him for.
 */

export const COMMITMENT_PROVENANCE: Provenance = { source: 'owner', writtenBy: 'life' }

/** Monday to Friday, which is what a school term and a working week are. */
export const WEEKDAYS: readonly IsoWeekday[] = [1, 2, 3, 4, 5]

export interface CommitmentWindowInput {
  readonly label: string
  /** Minutes into the owner-local day. */
  readonly startsAt: number
  readonly endsAt: number
  readonly recurrence: CommitmentRecurrence
  readonly whose: CommitmentWindowRecord['whose']
  readonly domain: LifeDomainId
  /** How the app came to know it. See `CommitmentWindowSource`. */
  readonly knownFrom: CommitmentWindowRecord['knownFrom']
  /**
   * Whose span it is, by name — QA-82-001.
   *
   * `whose` says the span belongs to somebody other than the owner; this says
   * who. Without it a school day was a shape in the day with nobody in it, so
   * nothing downstream could work out that the person it takes away is the
   * person a move was about. Empty is allowed and means the owner named a span
   * without naming anybody in it, which stays a gap rather than a guess.
   */
  readonly about?: readonly EntityRef[]
}

export interface CommitmentMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  /** The real clock, distinct from the moment being reasoned about (D-037). */
  readonly recordedAt?: Instant
}

export function commitmentWindowRecord(
  input: CommitmentWindowInput,
  moment: CommitmentMoment,
  id: RecordId = newRecordId(),
): CommitmentWindowRecord {
  const build = createRecordFactory({ zone: moment.zone, provenance: COMMITMENT_PROVENANCE })
  return build(
    'commitment-window',
    {
      occurredAt: moment.now,
      ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
      id,
      domains: [input.domain],
      ...(input.about === undefined || input.about.length === 0 ? {} : { entities: input.about }),
    },
    {
      label: input.label,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      recurrence: input.recurrence,
      whose: input.whose,
      knownFrom: input.knownFrom,
    },
  )
}

/**
 * Taking one back.
 *
 * A retraction rather than a replacement, for the same reason lifting a veto is
 * one: the owner is saying the obligation is not there, and there is nothing to
 * put in its place. `correction` is the kind that exists for exactly that, and
 * the row he entered stays exactly as he wrote it (section 13.1).
 *
 * Changing the hours is the other case and is a different record — a new window
 * that supersedes the old one, so what he used to think is still legible.
 */
export function removeCommitmentWindowRecord(
  window: RecordId,
  moment: CommitmentMoment,
  id: RecordId = newRecordId(),
): CorrectionRecord {
  const build = createRecordFactory({ zone: moment.zone, provenance: COMMITMENT_PROVENANCE })
  return build(
    'correction',
    {
      occurredAt: moment.now,
      ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
      id,
    },
    { corrects: window, reason: 'The owner said this is not in the day' },
  )
}

/**
 * Changing the hours, which supersedes rather than retracts.
 *
 * The distinction matters to the record and not to the owner: he moved school
 * pickup, he did not decide school does not happen. `supersedes` keeps the old
 * hours legible and stops both rows counting at once, which is what
 * `history.effective` already does for every other correction.
 */
export function reviseCommitmentWindowRecord(
  previous: CommitmentWindowRecord,
  input: CommitmentWindowInput,
  moment: CommitmentMoment,
  id: RecordId = newRecordId(),
): CommitmentWindowRecord {
  const build = createRecordFactory({ zone: moment.zone, provenance: COMMITMENT_PROVENANCE })
  return build(
    'commitment-window',
    {
      occurredAt: moment.now,
      ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
      id,
      domains: previous.domains,
      entities: previous.entities,
      privacy: previous.privacy,
      supersedes: previous.id,
    },
    {
      label: input.label,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      recurrence: input.recurrence,
      whose: input.whose,
      knownFrom: input.knownFrom,
    },
  )
}

// ---------------------------------------------------------------------------
// The two seeds
// ---------------------------------------------------------------------------

export interface ScheduleSeed {
  readonly id: string
  /** The question, as AUD-0004 words it. Written fresh so it can name her. */
  prompt(situation: Situation): string
  /** What the record will be called. Also written fresh, for the same reason. */
  label(situation: Situation): string
  /**
   * What the invitation calls it, in one short phrase.
   *
   * Separate from `label` because they are read in different frames: the label
   * stands alone on the entry it names — "work, 09:00 to 17:00, weekdays" — and
   * this one sits inside a sentence. Life is a report and the one thing on it
   * the owner is invited to add has to read as an aside rather than as a form
   * (D-075).
   */
  invite(situation: Situation): string
  /**
   * Who the span takes away, when it takes somebody away — QA-82-001.
   *
   * The school day is hers, and saying so on the record is what lets the engine
   * know that a move about her cannot happen between half past eight and three.
   * The working day takes the owner, who is not an entity in his own model, so
   * that seed answers with nobody.
   */
  about(situation: Situation): readonly EntityRef[]
  readonly domain: LifeDomainId
  /** Whose time the span takes. See `CommitmentWindowRecord.whose`. */
  readonly whose: CommitmentWindowRecord['whose']
  readonly startsAt: number
  /** Where the form opens, so most owners change one number rather than four. */
  readonly endsAt: number
}

/**
 * The two questions the owner would answer once.
 *
 * Both are named in AUD-0004 in as many words. Neither has a "does not apply"
 * answer, and that absence is deliberate: an unanswered seed is already the
 * honest state — the app knows nothing about his working hours — and asking him
 * to confirm that he has none would be collecting a fact to fill a field
 * (section 4.5).
 */
export const SCHEDULE_SEEDS: readonly ScheduleSeed[] = [
  {
    id: 'school-day',
    prompt: (situation) => {
      const child = situation.entities
        .byKind('person')
        .find((entity) => entity.domain === DOMAIN.fatherhood)
      return child === undefined
        ? 'What time does the school day start and end?'
        : `What time does ${child.label}’s school day start and end?`
    },
    label: (situation) => {
      const child = situation.entities
        .byKind('person')
        .find((entity) => entity.domain === DOMAIN.fatherhood)
      return child === undefined ? 'the school day' : `${child.label}’s school day`
    },
    invite: (situation) => {
      const child = situation.entities
        .byKind('person')
        .find((entity) => entity.domain === DOMAIN.fatherhood)
      return child === undefined ? 'the school day' : `${child.label}’s school day`
    },
    about: (situation) => {
      const child = situation.entities
        .byKind('person')
        .find((entity) => entity.domain === DOMAIN.fatherhood)
      return child === undefined ? [] : [{ id: child.id, kind: child.kind }]
    },
    domain: DOMAIN.fatherhood,
    // Hers, not his. He has to be somewhere when it starts and when it ends,
    // and the hours between are the freest stretch of his week.
    whose: 'theirs',
    startsAt: 8 * 60 + 30,
    endsAt: 15 * 60,
  },
  {
    id: 'working-hours',
    prompt: () => 'What are your working hours?',
    label: () => 'work',
    invite: () => 'your working hours',
    // Nobody: it takes the owner, and the owner is not a row in his own model.
    about: () => [],
    domain: DOMAIN.career,
    whose: 'mine',
    startsAt: 9 * 60,
    endsAt: 17 * 60,
  },
]

/**
 * Which seeds the owner has not answered yet.
 *
 * Answered means a `commitment-window` exists for that seed's life area, which
 * is the honest test: he told the app about his working day, and whether he did
 * it through the seed or by revising one later is not something the panel
 * should care about.
 */
export function unansweredSeeds(situation: Situation): readonly ScheduleSeed[] {
  const answered = new Set<LifeDomainId>()
  for (const record of situation.view.history.effective) {
    if (record.kind !== 'commitment-window') continue
    for (const domain of record.domains) answered.add(domain)
  }
  return SCHEDULE_SEEDS.filter((seed) => !answered.has(seed.domain))
}

/** Every obligation the owner has entered, whichever day it falls on. */
export function standingCommitments(situation: Situation): readonly CommitmentWindowRecord[] {
  return situation.view.history.effective.filter(
    (record): record is CommitmentWindowRecord => record.kind === 'commitment-window',
  )
}
