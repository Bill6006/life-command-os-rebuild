import type { LifeDomainId } from '../domain/domains'
import type { RecordId } from '../domain/ids'
import {
  courseSentence,
  PROGRESS_EVIDENCE,
  PROGRESS_DOES_NOT_SAY,
  PROGRESS_LABEL,
  progressSentence,
  rankOf,
  RUNG_FOR_ASPECT,
  type ProgressEvidence,
} from '../domain/progress'
import { createRecordFactory } from '../domain/build'
import type { CanonicalRecord, OutcomeAspect, OutcomeRecord, Provenance } from '../domain/records'
import {
  addLocalDaysToDayId,
  localDaysBetween,
  type Instant,
  type LocalDayId,
  type TimeZoneId,
} from '../domain/time'
import type { OutcomeAnswer } from './outcomes'
import type { Situation } from './situation'
import type { ActiveThread } from './threads'

/**
 * Reading progress out of the record — F05, F11, package 2.
 *
 * One pass over the history that sorts what actually happened onto the six
 * rungs of `domain/progress.ts`, per life area. Nothing here decides that a
 * rung is reached from evidence belonging to a lower one, which is the whole
 * job: **a completed session, a completed course and a milestone are three
 * different things**, and before this phase the product had one word for the
 * first and no word at all for the other two.
 *
 * ## Where each rung comes from, and why nothing is inferred upward
 *
 * - `attempt` — an `action-start`.
 * - `completion` — an `action-completion`. Still a completion when its `extent`
 *   is `partial`: the attempt was carried out in part, which is what a
 *   completion has always claimed and no more.
 * - `quality` — an `outcome` of aspect `result`.
 * - `retained-capability` — an `outcome` of aspect `retained`, which is only
 *   ever asked about a **course**, days after it ended.
 * - `transfer` — an `outcome` of aspect `transfer`.
 * - `milestone` — a `goal` carrying `milestoneOf` whose status the **owner**
 *   set to `achieved`. Never derived from anything below it. A milestone that
 *   marked itself reached because three sessions happened would be exactly the
 *   claim F05 says the product must stop making.
 *
 * Courses are counted separately from sessions ({@link ProgressReading.courses})
 * because a finished course is a different object from the sessions inside it,
 * and a surface that showed one number for both would be the conflation the
 * finding names.
 */

export interface ProgressEntry {
  readonly kind: ProgressEvidence
  readonly at: Instant
  readonly record: RecordId
  /** What it is about, where the record names it. */
  readonly about: string | undefined
}

export interface ProgressRung {
  readonly kind: ProgressEvidence
  readonly label: string
  readonly count: number
  /** Generated from this rung's own count, and from nothing above it. */
  readonly says: string
  /** What this rung is not evidence of. */
  readonly doesNotSay: string
  readonly entries: readonly ProgressEntry[]
}

export interface ProgressReading {
  readonly domain: LifeDomainId
  /** Only the rungs with something on them, lowest first. */
  readonly rungs: readonly ProgressRung[]
  /** The highest rung the record actually supports, or nothing yet. */
  readonly strongest: ProgressEvidence | undefined
  /** Courses that finished here — a different object from the sessions in them. */
  readonly courses: readonly ProgressEntry[]
}

/**
 * Which rungs each domain's record reaches.
 *
 * One walk over the history rather than one per rung, because six passes over a
 * lifetime record to answer six halves of one question is the shape that gets
 * slower every year the owner uses the product.
 */
export function readProgress(
  situation: Situation,
  domains: readonly LifeDomainId[],
): ProgressReading {
  const found = new Map<ProgressEvidence, ProgressEntry[]>()
  const courses: ProgressEntry[] = []
  const push = (kind: ProgressEvidence, entry: ProgressEntry): void => {
    const held = found.get(kind)
    if (held === undefined) found.set(kind, [entry])
    else held.push(entry)
  }
  const nameOf = (record: CanonicalRecord): string | undefined => {
    for (const ref of record.entities) {
      const label = situation.entities.labelFor(ref)
      if (label !== undefined) return label
    }
    return undefined
  }

  for (const record of situation.view.history.effective) {
    if (record.occurredAt > situation.at) continue
    if (!record.domains.some((domain) => domains.includes(domain))) continue

    switch (record.kind) {
      case 'action-start':
        push('attempt', {
          kind: 'attempt',
          at: record.occurredAt,
          record: record.id,
          about: nameOf(record),
        })
        break
      case 'action-completion':
        push('completion', {
          kind: 'completion',
          at: record.occurredAt,
          record: record.id,
          about: nameOf(record),
        })
        break
      case 'outcome': {
        const rung = RUNG_FOR_ASPECT[record.aspect]
        if (rung === undefined) break
        push(rung, { kind: rung, at: record.occurredAt, record: record.id, about: nameOf(record) })
        break
      }
      case 'goal':
        /*
         * A milestone is reached because he said so — F05.
         *
         * `status === 'achieved'` is written by the control on the domain page
         * and by nothing else. There is no path from a run of completions to
         * this line, and there must not be one: the difference between having
         * done the sessions and having got somewhere is the finding.
         */
        if (record.milestoneOf === undefined || record.status !== 'achieved') break
        push('milestone', {
          kind: 'milestone',
          at: record.occurredAt,
          record: record.id,
          about: record.statement,
        })
        break
      case 'thread':
        if (record.state !== 'done') break
        courses.push({
          kind: 'completion',
          at: record.occurredAt,
          record: record.id,
          about: situation.entities.labelFor(record.subject) ?? record.intent,
        })
        break
      default:
        break
    }
  }

  const rungs: ProgressRung[] = []
  for (const kind of PROGRESS_EVIDENCE) {
    const entries = found.get(kind)
    if (entries === undefined || entries.length === 0) continue
    rungs.push({
      kind,
      label: PROGRESS_LABEL[kind],
      count: entries.length,
      says: progressSentence(kind, entries.length),
      doesNotSay: PROGRESS_DOES_NOT_SAY[kind],
      entries,
    })
  }

  let strongest: ProgressEvidence | undefined
  for (const rung of rungs) {
    if (strongest === undefined || rankOf(rung.kind) > rankOf(strongest)) strongest = rung.kind
  }

  return { domain: domains[0]!, rungs, strongest, courses }
}

/**
 * What a course that finished is allowed to say, said once.
 *
 * A finished course is a completion at the course scale and nothing more.
 * Whether any of it stuck is the rung above, it is a different question with a
 * different window, and the app asks it separately — see `outcomes.ts`, where
 * the retained question opens days after the course ends rather than at the end
 * of it.
 */
export function describeCourses(courses: readonly ProgressEntry[]): string {
  return courseSentence(courses.length)
}

// ---------------------------------------------------------------------------
// What is left of a course, days after it ended — F05, F11
// ---------------------------------------------------------------------------

/**
 * How long after a course finishes before the app asks what is left of it.
 *
 * Three days, and the number is the whole point of the question. Asked at the
 * end of the third session it would be asking whether the third session
 * happened, which the record already knows. Retention is a claim about **later**
 * — that is what separates rung four from rung two — so the window has to open
 * after enough later has passed to be worth reporting, and close before the
 * answer becomes a reconstruction.
 */
export const DAYS_BEFORE_ASKING_WHAT_STUCK = 3

/** And how long before asking whether it has been used anywhere real. */
export const DAYS_BEFORE_ASKING_ABOUT_USE = 10

/** How long each question stays open once it opens. */
const OPEN_FOR_DAYS = 7

/**
 * A question about a course rather than about a session.
 *
 * Deliberately not a `PendingOutcome`: that is keyed to an episode, and an
 * episode is one occasion on one day. This is about the run of them, it opens
 * days after the last one, and it is the only place in the product where the
 * app asks a question whose answer is a claim about capability.
 */
export interface CourseReflection {
  readonly thread: ActiveThread
  readonly aspect: Extract<OutcomeAspect, 'retained' | 'transfer'>
  readonly prompt: string
  /** What the app will do with the answer, in view while he answers — D-176. */
  readonly note: string
  readonly answers: readonly OutcomeAnswer[]
  readonly opensOn: LocalDayId
}

const WHAT_STUCK: readonly OutcomeAnswer[] = [
  { id: 'most', label: 'Most of it', observation: { type: 'scale', value: 2, of: 2 } },
  { id: 'some', label: 'Some of it', observation: { type: 'scale', value: 1, of: 2 } },
  { id: 'little', label: 'Almost none', observation: { type: 'scale', value: 0, of: 2 } },
]

const WHERE_USED: readonly OutcomeAnswer[] = [
  { id: 'real', label: 'Yes, for something real', observation: { type: 'scale', value: 2, of: 2 } },
  { id: 'practice', label: 'Only in practice', observation: { type: 'scale', value: 1, of: 2 } },
  { id: 'not-yet', label: 'Not yet', observation: { type: 'scale', value: 0, of: 2 } },
]

/**
 * The course questions that are open right now, oldest course first.
 *
 * A finished course, three days on, is asked what is left of it; ten days on it
 * is asked whether any of it has been used. Both are skipped once answered —
 * an outcome record whose `about` is the thread's own record id, which no
 * episode can claim because an episode is keyed by a recommendation.
 *
 * **The two questions are never both on screen.** One question at a time is the
 * same rule the guide follows and the same rule the growth panel follows, and
 * this screen is read with one thumb and a spare minute.
 */
export function dueCourseReflections(situation: Situation): readonly CourseReflection[] {
  const answered = new Map<RecordId, Set<OutcomeAspect>>()
  for (const record of situation.view.history.effective) {
    if (record.kind !== 'outcome') continue
    if (record.occurredAt > situation.at) continue
    const held = answered.get(record.about) ?? new Set<OutcomeAspect>()
    held.add(record.aspect)
    answered.set(record.about, held)
  }

  const out: CourseReflection[] = []
  for (const thread of situation.threads) {
    if (thread.state !== 'done') continue
    const subject = situation.entities.labelFor(thread.subject)
    // No subject, no sentence — D-018 at the one place a question could go
    // wrong. A course whose topic no longer resolves is not asked about.
    if (subject === undefined) continue
    const already = answered.get(thread.source) ?? new Set<OutcomeAspect>()

    for (const [aspect, after, prompt, note, answers] of [
      [
        'retained',
        DAYS_BEFORE_ASKING_WHAT_STUCK,
        `A few days on — how much of ${subject} is still there?`,
        'This is kept as what stayed with you, separately from the sessions themselves.',
        WHAT_STUCK,
      ],
      [
        'transfer',
        DAYS_BEFORE_ASKING_ABOUT_USE,
        `Have you used ${subject} for anything real yet?`,
        'This is kept as where it has actually been used — the app never assumes it from a finished course.',
        WHERE_USED,
      ],
    ] as const) {
      if (already.has(aspect)) continue
      const opensOn = addLocalDaysToDayId(thread.expiresOn, after)
      const closesOn = addLocalDaysToDayId(opensOn, OPEN_FOR_DAYS)
      const today = situation.dayId
      if (localDaysBetween(opensOn, today) < 0) continue
      if (localDaysBetween(today, closesOn) < 0) continue
      out.push({ thread, aspect, prompt, note, answers, opensOn })
      break
    }
  }

  return out.sort((a, b) => (a.opensOn < b.opensOn ? -1 : a.opensOn > b.opensOn ? 1 : 0))
}

/** The one to put on screen, or nothing. */
export function nextCourseReflection(situation: Situation): CourseReflection | undefined {
  return dueCourseReflections(situation)[0]
}

export interface CourseReflectionMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  readonly recordedAt: Instant
}

/**
 * The record a course reflection writes.
 *
 * An ordinary `outcome`, pointed at the **thread** rather than at any episode
 * inside it. That is what keeps the two scales apart in the record as well as
 * on the screen: nothing that walks episodes will ever mistake this for a
 * judgement about one evening.
 */
export function courseReflectionRecord(
  reflection: CourseReflection,
  answer: OutcomeAnswer,
  domain: LifeDomainId,
  moment: CourseReflectionMoment,
  id?: RecordId,
): OutcomeRecord {
  const build = createRecordFactory({ zone: moment.zone, provenance: COURSE_REFLECTION_PROVENANCE })
  return build(
    'outcome',
    {
      occurredAt: moment.now,
      recordedAt: moment.recordedAt,
      ...(id === undefined ? {} : { id }),
      domains: [domain],
      entities: [reflection.thread.subject],
    },
    { about: reflection.thread.source, aspect: reflection.aspect, observation: answer.observation },
  )
}

export const COURSE_REFLECTION_PROVENANCE: Provenance = { source: 'owner', writtenBy: 'life' }
