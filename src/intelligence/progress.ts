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
  localDayIdAt,
  localDaysBetween,
  startOfLocalDay,
  type Instant,
  type LocalDayId,
  type TimeZoneId,
} from '../domain/time'
import { EFFECT_STEPS, windowForTiming, type OutcomeAnswer } from './outcomes'
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
      case 'action-completion': {
        /*
         * The record says how much of it happened, and the rung follows —
         * QA-84-002.
         *
         * This counted every completion as a session done and never looked at
         * `extent`, so *"Only part of it"* arrived on this page as *"1 session
         * done"* — the owner's own distinction, preserved by the state machine
         * and erased by the thing that reads it. Absent means the whole of it,
         * so every completion written before the field existed still lands
         * where it always did.
         */
        const rung: ProgressEvidence = record.extent === 'partial' ? 'part-done' : 'completion'
        push(rung, {
          kind: rung,
          at: record.occurredAt,
          record: record.id,
          about: nameOf(record),
        })
        break
      }
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
        /*
         * Courses are read from the situation, not from these rows —
         * QA-84-003.
         *
         * This accepted only `state === 'done'`, and **nothing writes that
         * state**: the Life panel offers *Stop this* and *Pick this up again*,
         * so a course that runs its three occasions stays `running` with
         * `live: false`. A run completed through the ordinary controls
         * therefore never appeared as a course anywhere on this page, which is
         * DEF-0119's own class one reader further on — the same mistake, found
         * twice, because the first repair was scoped to the place it was
         * noticed.
         *
         * `ActiveThread.finished` is the one definition, and it is read below.
         */
        break
      default:
        break
    }
  }

  /*
   * Every course that actually finished, from the one place that knows —
   * QA-84-003.
   *
   * `situation.threads` is `activeThreads`, which computes `finished` from what
   * the record shows rather than from the state word nobody writes. Reading it
   * here is what makes a completed course visible at all.
   */
  for (const thread of situation.threads) {
    if (!thread.finished) continue
    if (!domains.includes(threadDomain(situation, thread))) continue
    courses.push({
      kind: 'completion',
      at: situation.view.history.byId(thread.source)?.occurredAt ?? situation.at,
      record: thread.source,
      about: situation.entities.labelFor(thread.subject) ?? thread.intent,
    })
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
 * Which life area a course belongs to.
 *
 * The record it came from carries the domains it was written with, which is
 * where a thread's area has always lived. Read through the history rather than
 * guessed from the subject, because a subject can belong to one area and a plan
 * about it be filed under another.
 */
function threadDomain(situation: Situation, thread: ActiveThread): LifeDomainId {
  const record = situation.view.history.byId(thread.source)
  return (
    record?.domains[0] ?? situation.entities.resolve(thread.subject)?.domain ?? ('' as LifeDomainId)
  )
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

/*
 * How long each question stays open once it opens.
 *
 * Not a constant here any more — AUD-0009. `REFLECTION_OPEN_FOR_DAYS` in
 * `outcomes.ts` is the same seven days and is what `windowForTiming` uses for
 * every `multi-day` window, so the reflection and the horizon now read one
 * number rather than two that happened to agree. D-178, applied to a week.
 */

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
  /**
   * What the answer is about.
   *
   * `effect` joined the two learning aspects with AUD-0009: a run of recovery
   * nights has no capability to retain and nothing to transfer, and the honest
   * question about it is how the rest has been since. The union is narrowed
   * rather than opened to every aspect, because `result` and `comfort` are
   * judgements about one occasion and this object exists to be about several.
   */
  readonly aspect: Extract<OutcomeAspect, 'retained' | 'transfer' | 'effect'>
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
 * What a run of quiet nights left behind — AUD-0009, and `multi-day`'s consumer.
 *
 * Four steps rather than three, because this is an `effect` answer and the
 * effect scale has four: `EFFECT_STEPS` is 3, so the values run 0 to 3 and mean
 * what they mean everywhere else in the product. A run-scoped answer that
 * invented its own scale would be a second meaning for one word.
 */
const HOW_THE_REST_SAT: readonly OutcomeAnswer[] = [
  {
    id: 'back',
    label: 'Back to normal',
    observation: { type: 'scale', value: 3, of: EFFECT_STEPS },
  },
  {
    id: 'better',
    label: 'Better than it was',
    observation: { type: 'scale', value: 2, of: EFFECT_STEPS },
  },
  {
    id: 'little',
    label: 'Not much different',
    observation: { type: 'scale', value: 1, of: EFFECT_STEPS },
  },
  {
    id: 'worse',
    label: 'Worse, if anything',
    observation: { type: 'scale', value: 0, of: EFFECT_STEPS },
  },
]

/**
 * What a course of this kind is asked, and in what order — AUD-0009.
 *
 * ## Why this is a table now
 *
 * The two questions were written for a study schedule and asked of **every**
 * finished course, so a run of recovery nights was asked *"how much of winding
 * down is still there?"* — retention language about a thing nobody retains. That
 * is DEF-0020's shape in a new place: one word doing service for two different
 * facts, and the copy sounding plausible enough that nothing noticed.
 *
 * So each kind names its own questions. A study schedule and a growth ladder
 * keep exactly the two they had; a recovery run gets the one the audit asks
 * for — **about the run, rather than about a night**.
 *
 * ## And this is where `multi-day` earns its place
 *
 * S1a widened the outcome horizon to `multi-day` and `weekly` in routing 92 and
 * left them without a consumer, deliberately: *"what uses them is AUD-0009 —
 * recovery is always judged as one night when the evidence says several — and
 * that is routing 93's."* This is that consumer. The run's window is computed by
 * `windowForTiming` at `multi-day`, which is the same function every episode's
 * window comes from, so the horizon decides a real question rather than being a
 * value the enum happens to hold.
 *
 * The **nightly** derivation is untouched. D-064's four conditions still read
 * `next-morning` off the profile, `recover`, `wind-down` and `protect-sleep` are
 * all still judged the morning after, and the sleep matcher still writes what it
 * always wrote. This is a question **about the run**, at the run's own scale,
 * beside them — which is the distinction AUD-0009 is making.
 */
interface ReflectionShape {
  readonly aspect: Extract<OutcomeAspect, 'retained' | 'transfer' | 'effect'>
  /** How many owner-local days after the plan's end this opens. */
  readonly afterDays: number
  prompt(subject: string): string
  readonly note: string
  readonly answers: readonly OutcomeAnswer[]
}

const LEARNING_REFLECTIONS: readonly ReflectionShape[] = [
  {
    aspect: 'retained',
    afterDays: DAYS_BEFORE_ASKING_WHAT_STUCK,
    prompt: (subject) => `A few days on — how much of ${subject} is still there?`,
    note: 'This is kept as what stayed with you, separately from the sessions themselves.',
    answers: WHAT_STUCK,
  },
  {
    aspect: 'transfer',
    afterDays: DAYS_BEFORE_ASKING_ABOUT_USE,
    prompt: (subject) => `Have you used ${subject} for anything real yet?`,
    note: 'This is kept as where it has actually been used — the app never assumes it from a finished course.',
    answers: WHERE_USED,
  },
]

/**
 * The recovery run's own question, and there is one.
 *
 * **A run has no second rung.** *"Have you used winding down for anything
 * real?"* is a question about a capability, and rest is not one — so the
 * transfer question is not asked of a run at all, rather than reworded into
 * something that would collect an answer about nothing.
 *
 * It asks how the rest has been **since**, which is a reading of a stretch of
 * days he has just lived through. It does not ask whether the run worked, which
 * is the causal question D-089 says the system exists to answer rather than to
 * put to him.
 */
const RECOVERY_REFLECTIONS: readonly ReflectionShape[] = [
  {
    aspect: 'effect',
    afterDays: DAYS_BEFORE_ASKING_WHAT_STUCK,
    prompt: () => 'Those nights are behind you — how has the rest been since?',
    note: 'This is kept about the run of nights rather than about any one of them.',
    answers: HOW_THE_REST_SAT,
  },
]

function reflectionsFor(kind: ActiveThread['kind']): readonly ReflectionShape[] {
  return kind === 'recovery-run' ? RECOVERY_REFLECTIONS : LEARNING_REFLECTIONS
}

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
    /*
     * `finished`, not `state === 'done'`.
     *
     * Nothing writes that state: the Life panel offers **Stop this** and **Pick
     * this up again**, so a course that simply ran its three occasions stays
     * `running` with `live: false`. Keying on the record's own word would have
     * made this question unreachable — a field written by nothing and read by
     * nothing, which is the pattern routing 83 found in `blocker` and the one
     * this phase is here to stop repeating.
     */
    if (!thread.finished) continue
    const subject = situation.entities.labelFor(thread.subject)
    // No subject, no sentence — D-018 at the one place a question could go
    // wrong. A course whose topic no longer resolves is not asked about.
    if (subject === undefined) continue
    const already = answered.get(thread.source) ?? new Set<OutcomeAspect>()

    for (const shape of reflectionsFor(thread.kind)) {
      if (already.has(shape.aspect)) continue
      /*
       * Counted from the plan's own end date rather than from the day the last
       * occasion happened.
       *
       * `expiresOn` is set when the course starts and never extended, and it is
       * the later of the two — so the question can only ever arrive **after**
       * the run is genuinely behind him, never in the middle of a week he is
       * still finishing it in. A course finished early waits a few days longer,
       * which is the right way round for a question about what stayed.
       *
       * The window itself comes from `windowForTiming` at the `multi-day`
       * horizon — AUD-0009, S1a. That is the same function every episode's
       * window comes from, so a course question and a move question are two
       * horizons of one mechanism rather than two mechanisms. The day the plan
       * ends is the moment it is judged from, and `afterDays` is the horizon's
       * own count.
       */
      const window = windowForTiming(
        startOfLocalDay(thread.expiresOn, situation.zone),
        { when: 'multi-day', after: 0, afterDays: shape.afterDays },
        situation.zone,
      )
      const opensOn = localDayIdAt(window.earliest, situation.zone)
      const closesOn = localDayIdAt(window.latest, situation.zone)
      const today = situation.dayId
      if (localDaysBetween(opensOn, today) < 0) continue
      if (localDaysBetween(today, closesOn) < 0) continue
      out.push({
        thread,
        aspect: shape.aspect,
        prompt: shape.prompt(subject),
        note: shape.note,
        answers: shape.answers,
        opensOn,
      })
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
