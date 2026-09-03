import { createRecordFactory } from '../domain/build'
import { DOMAIN, type LifeDomainId } from '../domain/domains'
import type { EntityRef } from '../domain/entities'
import { newRecordId, type RecordId } from '../domain/ids'
import type { ActionVerb } from '../domain/recommendation'
import type { Provenance, ThreadKind, ThreadRecord, ThreadState } from '../domain/records'
import {
  addLocalDaysToDayId,
  localDayIdAt,
  localDaysBetween,
  type Instant,
  type LocalDayId,
  type TimeZoneId,
} from '../domain/time'
import type { MemoryView } from '../memory/view'
import type { Episode } from './lifecycle'
import { describeNights, describeRecoveryOffer } from './recovery'

/**
 * Threads — the smallest structure that lets one day know about the last
 * (canonical plan sections 17.1 and 21, AUD-0020).
 *
 * `decide()` is a pure function of the situation. Continuity existed in exactly
 * three narrow places — a three-day duplication penalty, an accumulating count
 * of refusals, and learned per-verb priors — and none of them is a plan.
 * Nothing could express *this, then that*, *we are three weeks into a push*, or
 * *this approach is not working*. The audit's judgement is that six of its own
 * findings are that one missing structure wearing different clothes.
 *
 * ## What a thread is allowed to be
 *
 * **It never decides.** A thread is one more input to the pipeline that already
 * exists: a candidate belonging to a running thread gains a `thread-fit`
 * dimension and `explain.ts` gains one clause. There is no path from a thread
 * to a chosen move that does not go through `arbitrate.ts`, and
 * `tests/unit/architecture-guards.test.ts` fails the build if one appears.
 * That is canonical plan section 17.2, made structural rather than promised.
 *
 * **It never beats what is in the way.** `thread-fit` is weighted below
 * `bottleneck-fit`, so a plan cannot out-argue a body that needs rest. AUD-0020
 * names this as the first mitigation and the gate asserts it directly.
 *
 * **It expires on its own, and any decline can stop it.** A plan that outlives
 * its usefulness becomes nagging, and this app's whole personality depends on
 * not nagging. Every thread carries the owner-local day it stops applying, set
 * when it starts and never extended.
 *
 * **It is never a hidden reason.** A thread is visible on Life with a one-tap
 * stop, and Now says which thread a move belongs to whenever one does. A hidden
 * plan is worse than no plan.
 *
 * ## Why exactly three kinds
 *
 * This is a strategic skeleton, not a project-management subsystem, and the
 * bound is what keeps it one. There is no generic thread-creation control: each
 * of the three is offered in the one situation it answers, beside the move it
 * belongs to, and the owner starts it with a tap or ignores it.
 */

export const THREAD_PROVENANCE: Provenance = { source: 'owner', writtenBy: 'now' }

/**
 * What each kind is made of: which moves count, how many, and how long it has.
 *
 * The values are written onto the record when a thread starts, so this table
 * decides what a *new* thread means and never re-scopes an existing one. A
 * course the owner agreed to must go on meaning what it meant when he agreed.
 */
export interface ThreadShape {
  readonly kind: ThreadKind
  readonly domain: LifeDomainId
  /**
   * Every move that counts toward it. Anything else is not part of this thread.
   *
   * A set rather than a sequence, and the choice is deliberate. AUD-0020
   * describes "a small ordered set of expected moves", and for a study schedule
   * an order is at least arguable — recall, then review, then a lab. For a
   * recovery run it is not: which recovery verb is right depends entirely on
   * the hour (DEF-0016 gave the afternoon its own, AUD-0003 gave the morning
   * one), so a run that insisted on a fixed order would stall on the day the
   * owner recovered at three in the afternoon.
   *
   * Rather than have two kinds mean two things by the same field, the plan
   * counts **occasions** and the sequence lives in the sentence the owner
   * reads. Insisting on recall-then-review-then-lab would also be a claim about
   * how studying works that this app has no evidence for.
   */
  readonly moves: readonly ActionVerb[]
  /**
   * How many occasions the plan expects, where the kind fixes it.
   *
   * A recovery run does not: AUD-0009's span comes from the owner's own
   * shortfall, so `ThreadOffer.steps` carries the number and this is the
   * fallback for a kind that has one of its own. See {@link ThreadOffer.steps}.
   */
  readonly steps: number
  /** How long it has before it stops applying, whatever has happened. */
  readonly lastsDays: number
  /** What the owner is offered, in his register. */
  readonly offer: string
  /** What it is for, written onto the record and read back on Life. */
  intent(subject: string): string
  /**
   * Whether an occasion has to be about the course's own subject — DEF-0166.
   *
   * True for two of the three, and the difference is what the course is *of*. A
   * study schedule is three sessions **on subnetting**, and a session on
   * something else is not one of them; a growth ladder is three goes **at
   * ordering her own food**. A recovery run is three quiet **nights**, and which
   * noun the app attached to the evening is its own business rather than his:
   * DEF-0016 and AUD-0003 between them give the morning, the afternoon and the
   * evening different recovery verbs with different objects, so a run pinned to
   * the object of its first evening cannot be advanced by the second.
   *
   * That was not a hypothesis. A run started on *"take tonight as recovery — no
   * subnetting session"* takes `learning-topic:subnetting` as its subject, and
   * two evenings later the right recovery move is `protect-sleep` on
   * `routine:winding-down` — which counted for nothing, so the run stalled at
   * two of three and was never finished, never asked about, and never expired
   * as anything but abandoned. DEF-0166.
   */
  readonly aboutTheSubject: boolean
}

export const THREAD_SHAPES: readonly ThreadShape[] = [
  {
    kind: 'recovery-run',
    domain: DOMAIN.sleep,
    /*
     * Every recovery verb, because which one is right depends on the hour —
     * DEF-0016 and AUD-0003 between them gave the morning, the afternoon and
     * the evening different sentences for the same intention. A run that only
     * counted the evening's verb would stall on a day the owner recovered in
     * the afternoon.
     */
    moves: ['protect-sleep', 'wind-down', 'recover', 'ease-off', 'lighten-the-day'],
    /*
     * Three, because recovery is not one night. After chronic restriction,
     * deficits accumulate and recovery takes several unrestricted nights (Van
     * Dongen et al., *Sleep* 26(2):117–126, 2003) — which is exactly the
     * finding AUD-0009 raises and exactly what the app could not express.
     */
    steps: 3,
    lastsDays: 10,
    /*
     * Both replaced when the offer is made — AUD-0009.
     *
     * *"Make this a run of recovery nights?"* is a course of unstated length,
     * which is the one thing a plan may not be if the owner is meant to agree to
     * it knowing what he agreed to. The span comes from his own shortfall, and
     * `threadOfferFor` fills both of these in from it. These stay as the honest
     * fallback for a run offered where no shortfall can be read — which is a
     * case `threadOfferFor` declines rather than reaches.
     */
    offer: 'Make this a run of recovery nights?',
    intent: () => 'Three recovery nights in a row',
    // A run is three quiet nights, not three quiet nights *about* anything.
    aboutTheSubject: false,
  },
  {
    kind: 'study-schedule',
    domain: DOMAIN.career,
    moves: ['recall-practice', 'review-weak-topic', 'hands-on-lab'],
    steps: 3,
    lastsDays: 28,
    offer: 'Put this on a schedule?',
    intent: (subject) => `Three sessions on ${subject}`,
    // Three sessions **on subnetting**. A session on something else is not one.
    aboutTheSubject: true,
  },
  {
    kind: 'growth-ladder',
    domain: DOMAIN.fatherhood,
    moves: ['growth-opportunity'],
    /*
     * Three, and it is D-070's number rather than a new one: a growth-stage
     * change is proposed after three occasions, so a ladder that expected any
     * other count would be a second answer to the same question.
     */
    steps: 3,
    lastsDays: 42,
    offer: 'Work up to this over the next few weeks?',
    intent: (subject) => `Three goes at ${subject}`,
    /*
     * Three goes **at that one skill**, and §13E.1's bound rests on it: at most
     * one growth-ladder thread per `development-skill` for that skill's
     * lifetime. Nothing here loosens it, and the probe regression asserts it.
     */
    aboutTheSubject: true,
  },
]

export function shapeFor(kind: ThreadKind): ThreadShape {
  const found = THREAD_SHAPES.find((shape) => shape.kind === kind)
  // Unreachable through the type system; thrown rather than defaulted, because
  // a thread quietly given the wrong shape is a plan the owner never agreed to.
  if (found === undefined) throw new Error(`no shape for thread kind "${kind}"`)
  return found
}

// ---------------------------------------------------------------------------
// Reading them back
// ---------------------------------------------------------------------------

export interface ActiveThread {
  readonly kind: ThreadKind
  readonly subject: EntityRef
  readonly intent: string
  readonly steps: number
  readonly moves: readonly ActionVerb[]
  readonly state: ThreadState
  readonly startedOn: LocalDayId
  readonly expiresOn: LocalDayId
  readonly source: RecordId
  /** How many of the expected occasions the record shows actually happened. */
  readonly done: number
  /** Past its own date. Kept visible, no longer in force. */
  readonly expired: boolean
  /**
   * Whether the plan actually happened — routing 84.
   *
   * A course that expected three occasions and had three is **finished**,
   * whatever its record still says. Nothing writes `state: 'done'`: the Life
   * panel offers **Stop this** and **Pick this up again**, so the only states
   * an owner can write are `abandoned` and `running`, and a run that simply
   * completed stays `running` with `live: false`.
   *
   * That mattered the moment something wanted to ask a question **about a
   * finished course** (F05's retained-capability rung). A reader that keyed on
   * `state === 'done'` would have been a question nothing could ever reach —
   * complete plumbing with no control, which is AUD-0050's pattern and the one
   * this phase exists to stop repeating.
   *
   * Abandoned is not finished, and neither is paused. He said so.
   */
  readonly finished: boolean
  /** Whether it still pulls on a decision: running, unexpired and unfinished. */
  readonly live: boolean
}

export interface ThreadMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
}

/**
 * How many of a thread's occasions have actually happened.
 *
 * A **completed** episode about the thread's subject, using one of its moves,
 * on or after the day it started. Not a shown one and not a declined one: a
 * plan advances when something was done, and counting anything else would let
 * a thread report progress the owner never made — which is DEF-0006's family,
 * a claim wider than its evidence.
 *
 * Capped at the number of steps, so a fourth good night reads as a finished run
 * rather than as "four of three".
 */
function occasionsDone(
  record: ThreadRecord,
  startedOn: LocalDayId,
  episodes: readonly Episode[],
  at: Instant,
): number {
  /*
   * Whether the occasion has to be about the course's own subject — DEF-0166.
   *
   * Read off the kind rather than assumed, because it is false for exactly one
   * of the three and the consequence of assuming it was a run that could not
   * advance past its first object. See {@link ThreadShape.aboutTheSubject}.
   */
  const aboutSubject = shapeFor(record.thread).aboutTheSubject
  let count = 0
  for (const episode of episodes) {
    if (episode.state !== 'completed') continue
    if (episode.shownAt > at) continue
    if (localDaysBetween(startedOn, episode.dayId) < 0) continue
    if (aboutSubject && episode.semantics.target.object.id !== record.subject.id) continue
    if (!record.moves.includes(episode.semantics.target.verb)) continue
    count += 1
  }
  return Math.min(count, record.steps)
}

/**
 * Every thread in the record, as it stands at this moment.
 *
 * Read from `history.effective`, so a stop or a pause supersedes the running
 * row rather than sitting beside it. Threads written after the moment being
 * decided are excluded, which is what lets a scenario be replayed at an earlier
 * hour without a plan appearing before it was started.
 */
export function activeThreads(
  view: MemoryView,
  episodes: readonly Episode[],
  moment: ThreadMoment,
): readonly ActiveThread[] {
  const today = localDayIdAt(moment.now, moment.zone)
  const out: ActiveThread[] = []

  for (const record of view.history.effective) {
    if (record.kind !== 'thread') continue
    if (record.occurredAt > moment.now) continue

    const startedOn = localDayIdAt(record.occurredAt, moment.zone)
    const done = occasionsDone(record, startedOn, episodes, moment.now)
    const expired = localDaysBetween(today, record.expiresOn) < 0

    out.push({
      kind: record.thread,
      subject: record.subject,
      intent: record.intent,
      steps: record.steps,
      moves: record.moves,
      state: record.state,
      startedOn,
      expiresOn: record.expiresOn,
      source: record.id,
      done,
      expired,
      finished: record.state === 'done' || (record.state === 'running' && done >= record.steps),
      live: record.state === 'running' && !expired && done < record.steps,
    })
  }

  return out
}

/**
 * The thread a move belongs to, if any — and only a live one.
 *
 * A paused, finished, abandoned or expired thread is still visible on Life and
 * still part of the record; what it must not do is go on pulling. That is the
 * whole of AUD-0020's anti-nagging mitigation, in one condition.
 */
export function threadFor(
  threads: readonly ActiveThread[],
  target: { readonly verb: ActionVerb; readonly object: EntityRef },
): ActiveThread | undefined {
  return threads.find(
    (thread) =>
      thread.live &&
      thread.moves.includes(target.verb) &&
      // DEF-0166: a run is about its nights and not about the noun the app
      // happened to attach to the first of them. See `ThreadShape`.
      (!shapeFor(thread.kind).aboutTheSubject || thread.subject.id === target.object.id),
  )
}

/**
 * Where a move sits in its thread, as a person would say it — AUD-0020.
 *
 * The audit's own example is *"Third of four. Two to go."* This is the clause,
 * and it is the reason a thread is never a hidden reason: the owner reads which
 * course a suggestion belongs to at the moment he is deciding whether to do it.
 *
 * Counts of occasions, which is what they are. No share and no percentage —
 * "67% through your recovery run" is a score about the owner's week wearing a
 * progress bar (section 22).
 */
export function describeThreadPosition(thread: ActiveThread): string {
  const at = Math.min(thread.done + 1, thread.steps)
  const left = thread.steps - at
  const place = `${ordinal(at)} of ${cardinal(thread.steps)}.`
  if (left <= 0) return `${place} The last one.`
  return `${place} ${capitalise(cardinal(left))} to go.`
}

// Words rather than digits, because these are small counts inside a sentence
// and "Third of 3" reads as a form field. Section 4.6 — ordinary language.
function ordinal(value: number): string {
  switch (value) {
    case 1:
      return 'First'
    case 2:
      return 'Second'
    case 3:
      return 'Third'
    case 4:
      return 'Fourth'
    default:
      return `Number ${value}`
  }
}

function cardinal(value: number): string {
  switch (value) {
    case 1:
      return 'one'
    case 2:
      return 'two'
    case 3:
      return 'three'
    case 4:
      return 'four'
    default:
      return String(value)
  }
}

function capitalise(text: string): string {
  return text.length === 0 ? text : `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

/** One thread as a line on Timeline, saying what it is and where it stands. */
export function describeThreadRecord(record: ThreadRecord): string {
  switch (record.state) {
    case 'running':
      return `Started: ${record.intent}`
    case 'paused':
      return `Paused: ${record.intent}`
    case 'done':
      return `Finished: ${record.intent}`
    case 'abandoned':
      return `Stopped: ${record.intent}`
  }
}

// ---------------------------------------------------------------------------
// Writing them
// ---------------------------------------------------------------------------

export interface StartThreadInput {
  readonly kind: ThreadKind
  readonly subject: EntityRef
  /** The subject's own label, for the intent sentence. Never a paraphrase. */
  readonly subjectLabel: string
  readonly domain: LifeDomainId
  /**
   * How many occasions this particular course expects — AUD-0009.
   *
   * Absent means the kind's own number. Present only where the span is a
   * reading of the owner's record rather than a property of the kind, which is
   * true of exactly one kind: a recovery run is as long as his shortfall says,
   * and a study schedule is three sessions because three sessions is what a
   * study schedule is.
   *
   * It is written onto the record, so a course the owner agreed to keeps the
   * length he agreed to even if the reading behind it moves the next evening.
   */
  readonly steps?: number
  /** The same, for the sentence Life reads back. Absent means the kind's own. */
  readonly intent?: string
}

export interface ThreadWriteMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  /** The real clock, distinct from the moment being reasoned about (D-037). */
  readonly recordedAt?: Instant
}

export function startThreadRecord(
  input: StartThreadInput,
  moment: ThreadWriteMoment,
  id: RecordId = newRecordId(),
): ThreadRecord {
  const shape = shapeFor(input.kind)
  const build = createRecordFactory({ zone: moment.zone, provenance: THREAD_PROVENANCE })
  return build(
    'thread',
    {
      occurredAt: moment.now,
      ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
      id,
      domains: [input.domain],
      entities: [input.subject],
    },
    {
      thread: input.kind,
      subject: input.subject,
      intent: input.intent ?? shape.intent(input.subjectLabel),
      steps: input.steps ?? shape.steps,
      moves: shape.moves,
      state: 'running',
      // Set once, here, and never extended. See `ThreadRecord.expiresOn`.
      expiresOn: addLocalDaysToDayId(localDayIdAt(moment.now, moment.zone), shape.lastsDays),
    },
  )
}

/**
 * Stopping, pausing or finishing one — a new record, never an edit.
 *
 * `supersedes` is what makes the change take effect: `history.effective` stops
 * counting the running row the moment this is appended, and the course the
 * owner set out on stays exactly as he agreed to it.
 */
export function setThreadStateRecord(
  thread: ActiveThread,
  state: ThreadState,
  previous: ThreadRecord,
  moment: ThreadWriteMoment,
  id: RecordId = newRecordId(),
): ThreadRecord {
  const build = createRecordFactory({ zone: moment.zone, provenance: THREAD_PROVENANCE })
  return build(
    'thread',
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
      thread: thread.kind,
      subject: thread.subject,
      intent: thread.intent,
      steps: thread.steps,
      moves: thread.moves,
      state,
      expiresOn: thread.expiresOn,
    },
  )
}

// ---------------------------------------------------------------------------
// Starting one, and the three places it is offered
// ---------------------------------------------------------------------------

export interface ThreadOffer {
  readonly kind: ThreadKind
  readonly subject: EntityRef
  readonly subjectLabel: string
  readonly domain: LifeDomainId
  /** The question, in the owner's register. */
  readonly offer: string
  /** What would be written down if he says yes. */
  readonly intent: string
  /**
   * How many occasions this offer is for — AUD-0009.
   *
   * On the offer rather than only on the shape, because the owner is agreeing
   * to a length and has to be able to read it before he taps. For every kind but
   * a recovery run it is the shape's own number; for a recovery run it is what
   * his own shortfall implies.
   */
  readonly steps: number
}

/**
 * Whether a course is worth offering beside this move — AUD-0020.
 *
 * **There is no generic thread-creation control**, and this function is what
 * takes its place: each of the three kinds is offered in the one situation it
 * answers, beside the move it would be the first step of, and the owner starts
 * it with a tap or ignores it. A screen where he could invent a plan about
 * anything is the project-management subsystem the finding is explicit about
 * not building.
 *
 * It offers nothing when a live thread already covers this subject — the app
 * asking twice about a course it is already running is the nagging the whole
 * structure is fenced against.
 *
 * **It proposes and never decides.** Starting a thread writes a record; what
 * that record does to a decision happens later, through `thread-fit`, in the
 * ranking, like everything else.
 */
export function threadOfferFor(
  threads: readonly ActiveThread[],
  target: { readonly verb: ActionVerb; readonly object: EntityRef },
  subjectLabel: string,
  /**
   * How many quiet nights the record implies — AUD-0009, and only for a run.
   *
   * `undefined` means the app cannot read a shortfall worth a plan, and a
   * recovery run is then **not offered at all**. That is the honest arm rather
   * than the missing one: a course of unstated length, offered because a
   * recovery move happened to be on screen, is a plan the owner would be
   * agreeing to without knowing what it was.
   */
  recoveryNights?: number,
): ThreadOffer | undefined {
  if (threadFor(threads, target) !== undefined) return undefined

  const shape = THREAD_SHAPES.find((entry) => entry.moves.includes(target.verb))
  if (shape === undefined) return undefined

  /*
   * A course that has been stopped, finished or run out is not offered again on
   * the strength of the same subject. He has already answered this.
   *
   * **For a recovery run the bound is its own expiry instead** — DEF-0166.
   * A run is not about a subject, so there is no subject to have answered about;
   * and recovery genuinely recurs, so a rule that blocked one forever would mean
   * a man who took three quiet nights in March could never be offered them again
   * in July. What it must not do is ask again while the last answer still
   * stands, so an unexpired run of any state — running, paused, finished or
   * abandoned — blocks a new offer, and once its own date has passed a fresh
   * shortfall may be offered a fresh run.
   *
   * Nothing here loosens §13E.1's growth-ladder bound: `aboutTheSubject` is true
   * for a ladder, so its re-offer is still blocked permanently on the same
   * `development-skill`, which is what the probe regression asserts.
   */
  const answered = shape.aboutTheSubject
    ? threads.some((thread) => thread.kind === shape.kind && thread.subject.id === target.object.id)
    : threads.some((thread) => thread.kind === shape.kind && !thread.expired)
  if (answered) return undefined

  if (shape.kind !== 'recovery-run') {
    return {
      kind: shape.kind,
      subject: target.object,
      subjectLabel,
      domain: shape.domain,
      offer: shape.offer,
      intent: shape.intent(subjectLabel),
      steps: shape.steps,
    }
  }

  if (recoveryNights === undefined) return undefined
  return {
    kind: shape.kind,
    subject: target.object,
    subjectLabel,
    domain: shape.domain,
    offer: describeRecoveryOffer(recoveryNights),
    intent: `${capitalise(describeNights(recoveryNights))} in a row`,
    steps: recoveryNights,
  }
}
