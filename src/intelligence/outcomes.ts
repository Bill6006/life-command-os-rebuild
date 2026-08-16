import { createRecordFactory } from '../domain/build'
import type { EntityIndex } from '../domain/entities'
import { newRecordId, type RecordId } from '../domain/ids'
import type { ActionVerb } from '../domain/recommendation'
import { renderRecommendation } from '../domain/recommendation'
import type { FactValue, OutcomeRecord, Provenance } from '../domain/records'
import {
  addLocalDaysToDayId,
  civilDateFromDayId,
  endOfLocalDay,
  instantAtLocal,
  localDateTimeAt,
  type Instant,
  type TimeZoneId,
} from '../domain/time'
import type { DueWindow } from '../domain/windows'
import type { MemoryView } from '../memory/view'
import { collectEpisodes, type Episode } from './lifecycle'
import { profileFor } from './moves'

/**
 * Outcome windows and outcome capture (canonical plan section 20).
 *
 * > Sleep/recovery actions may need next-morning evaluation.
 *
 * That one line is the whole reason this file exists. Asking at 23:05 whether
 * an early night worked would collect an answer about intent, and an answer
 * about intent recorded as an outcome is worse than no answer at all — it looks
 * exactly like evidence and is not. So each kind of move says when its result
 * can honestly be judged, and the question is not asked before then.
 *
 * ## Nothing here reads a clock
 *
 * "A result is now due" is a comparison, not an event. `dueOutcomes(view,
 * moment)` is a pure function of the moment it is given, exactly like every
 * other question the engine answers, and the surface is the only thing that
 * knows what time it really is. `nextOutcomeDueAt` exists so the surface can
 * set one timer for the next opening rather than polling: the kernel works out
 * *when*, and the UI is what waits.
 *
 * That is deliberate. The alternative — a clock inside the engine that notices
 * things — would make time travel lie and would make every test that replays a
 * decision depend on when it was run.
 *
 * ## An expiry, because a stale question collects a made-up answer
 *
 * Every window closes. Asking on Thursday how Tuesday's walk went is asking
 * someone to invent something, and section 20's "outcome unknown" is a real and
 * acceptable state. A window that has closed leaves the episode completed with
 * nothing learned from it, which is the truth.
 */

export const OUTCOME_PROVENANCE: Provenance = { source: 'owner', writtenBy: 'now' }

/** When the morning after a move begins, owner-local. */
const MORNING_HOUR = 5

/** Late-night belongs to the evening before it, so its morning is the same day. */
const STILL_LAST_NIGHT_BEFORE_HOUR = 4

function atLocalHour(at: Instant, zone: TimeZoneId, addDays: number, hour: number): Instant {
  const local = localDateTimeAt(at, zone)
  const day = addLocalDaysToDayId(local.dayId, addDays)
  return instantAtLocal({ ...civilDateFromDayId(day), hour, minute: 0, second: 0 }, zone)
}

/**
 * When this episode's result can be asked about, and until when.
 *
 * Undefined when there is nothing to ask about yet: an episode is only worth a
 * question once the owner says it happened. A move that was declined has no
 * result, and one that was started and never finished is still a lifecycle
 * question rather than an outcome question — Now already has the buttons for
 * that, so asking a second time in a different shape would be nagging.
 */
export function outcomeWindowFor(episode: Episode, zone: TimeZoneId): DueWindow | undefined {
  if (episode.state !== 'completed') return undefined
  const settled = episode.settledAt
  if (settled === undefined) return undefined

  const timing = profileFor(episode.semantics.target.verb).outcome

  if (timing.when === 'next-morning') {
    const local = localDateTimeAt(settled, zone)
    // Finishing at half past midnight is finishing last night, so the morning
    // that judges it is this one rather than tomorrow's.
    const days = local.hour < STILL_LAST_NIGHT_BEFORE_HOUR ? 0 : 1
    const earliest = atLocalHour(settled, zone, days, MORNING_HOUR)
    return {
      kind: 'due',
      earliest,
      latest: endOfLocalDay(localDateTimeAt(earliest, zone).dayId, zone),
    }
  }

  const earliest = (settled + timing.after * 60_000) as Instant
  // Through the end of the following owner-local day: long enough that a phone
  // picked up the next evening still catches it, short enough that the answer
  // is still a memory rather than a reconstruction.
  const local = localDateTimeAt(earliest, zone)
  return {
    kind: 'due',
    earliest,
    latest: endOfLocalDay(addLocalDaysToDayId(local.dayId, 1), zone),
  }
}

export interface PendingOutcome {
  readonly episode: Episode
  readonly window: DueWindow
  /** The questions still unanswered, in the order they should be asked. */
  readonly questions: readonly OutcomeQuestion[]
}

/**
 * Episodes whose result is due now and has not been given, oldest first.
 *
 * Oldest first so a backlog clears in the order it happened, which is also the
 * order the owner remembers it in.
 */
export function dueOutcomes(
  view: MemoryView,
  moment: { readonly now: Instant; readonly zone: TimeZoneId },
  entities: EntityIndex,
): readonly PendingOutcome[] {
  const out: PendingOutcome[] = []

  for (const episode of collectEpisodes(view, moment.zone)) {
    const window = outcomeWindowFor(episode, moment.zone)
    if (window === undefined) continue
    if (moment.now < window.earliest || moment.now > window.latest) continue

    const questions = unansweredQuestions(episode, entities)
    if (questions.length === 0) continue
    out.push({ episode, window, questions })
  }

  return out.sort((a, b) => a.window.earliest - b.window.earliest)
}

/** The one to put on screen, or nothing. */
export function nextDueOutcome(
  view: MemoryView,
  moment: { readonly now: Instant; readonly zone: TimeZoneId },
  entities: EntityIndex,
): PendingOutcome | undefined {
  return dueOutcomes(view, moment, entities)[0]
}

/**
 * When the next window opens, for a surface that wants to wake up for it.
 *
 * The engine says when; the surface is the only thing allowed to compare that
 * to a real clock.
 */
export function nextOutcomeDueAt(
  view: MemoryView,
  moment: { readonly now: Instant; readonly zone: TimeZoneId },
  entities: EntityIndex,
): Instant | undefined {
  let soonest: Instant | undefined

  for (const episode of collectEpisodes(view, moment.zone)) {
    const window = outcomeWindowFor(episode, moment.zone)
    if (window === undefined) continue
    if (window.earliest <= moment.now) continue
    if (moment.now > window.latest) continue
    if (unansweredQuestions(episode, entities).length === 0) continue
    if (soonest === undefined || window.earliest < soonest) soonest = window.earliest
  }

  return soonest
}

// ---------------------------------------------------------------------------
// The questions
// ---------------------------------------------------------------------------

export type OutcomeAspect = 'result' | 'comfort'

export interface OutcomeAnswer {
  readonly id: string
  readonly label: string
  readonly observation: FactValue
  /**
   * Present on a result and absent on a comfort reading, and the difference is
   * load-bearing: only an answer carrying a sentiment is evidence about whether
   * the move worked. How something felt is worth knowing and is not that.
   */
  readonly sentiment?: 'better' | 'same' | 'worse'
}

export interface OutcomeQuestion {
  readonly aspect: OutcomeAspect
  readonly prompt: string
  readonly answers: readonly OutcomeAnswer[]
}

const RESULT_ANSWERS: readonly OutcomeAnswer[] = [
  {
    id: 'better',
    label: 'Better than usual',
    observation: { type: 'scale', value: 4, of: 5 },
    sentiment: 'better',
  },
  {
    id: 'same',
    label: 'About the same',
    observation: { type: 'scale', value: 2, of: 5 },
    sentiment: 'same',
  },
  {
    id: 'worse',
    label: 'Worse',
    observation: { type: 'scale', value: 0, of: 5 },
    sentiment: 'worse',
  },
]

const COMFORT_ANSWERS: readonly OutcomeAnswer[] = [
  { id: 'easy', label: 'Easy', observation: { type: 'scale', value: 4, of: 5 } },
  { id: 'awkward', label: 'A bit awkward', observation: { type: 'scale', value: 2, of: 5 } },
  { id: 'hard', label: 'Hard work', observation: { type: 'scale', value: 0, of: 5 } },
]

/**
 * Which moves are worth a second question about how they felt.
 *
 * Section 10: the app can learn "how comfortable it felt" and "whether an
 * approach style was easier". G-004 asks for comfort and result both. Nothing
 * else gets a second question — section 4.5, the app should not collect data
 * merely because a field exists, and two taps is already the most a follow-up
 * should ever cost.
 */
const COMFORT_PROMPTS: Partial<Record<ActionVerb, (object: string) => string>> = {
  'start-conversation': (object) => `How did starting a conversation at ${object} feel?`,
  'reach-out': (object) => `How did reaching out to ${object} feel?`,
  'growth-opportunity': (object) => `How did ${object} seem to go for her?`,
}

/**
 * What to ask about an episode, in order, skipping anything already answered.
 *
 * The result question is the renderer's own follow-up, which is what keeps the
 * subject attached all the way through: "How did the subnetting recall go?"
 * comes from the same template that produced "Spend 10 minutes recalling
 * subnetting". A recommendation whose subject no longer resolves produces no
 * question at all, for the same reason it produces no sentence (D-018).
 */
export function outcomeQuestionsFor(
  episode: Episode,
  entities: EntityIndex,
): readonly OutcomeQuestion[] {
  const rendered = renderRecommendation(episode.semantics, entities)
  if (!rendered.ok) return []

  const questions: OutcomeQuestion[] = [
    { aspect: 'result', prompt: rendered.rendered.followUp, answers: RESULT_ANSWERS },
  ]

  const comfort = COMFORT_PROMPTS[episode.semantics.target.verb]
  if (comfort !== undefined) {
    const object = entities.labelFor(episode.semantics.target.object)
    if (object !== undefined) {
      questions.push({ aspect: 'comfort', prompt: comfort(object), answers: COMFORT_ANSWERS })
    }
  }

  return questions
}

/** A result is answered when an outcome carries a sentiment; comfort when one does not. */
export function answeredAspects(episode: Episode): ReadonlySet<OutcomeAspect> {
  const answered = new Set<OutcomeAspect>()
  for (const outcome of episode.outcomes) {
    answered.add(outcome.sentiment === undefined ? 'comfort' : 'result')
  }
  return answered
}

function unansweredQuestions(episode: Episode, entities: EntityIndex): readonly OutcomeQuestion[] {
  const answered = answeredAspects(episode)
  return outcomeQuestionsFor(episode, entities).filter((question) => !answered.has(question.aspect))
}

export interface OutcomeMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  /** The real clock, distinct from the moment being reasoned about (D-037). */
  readonly recordedAt?: Instant
}

/**
 * An answer, as a canonical record.
 *
 * Section 60: "written data must have a read path". This lands as an outcome
 * against the recommendation it is about, resolved by the same history fold as
 * every other record, and read back by `learning.ts`. There is no side channel.
 */
export function outcomeRecord(
  episode: Episode,
  answer: OutcomeAnswer,
  moment: OutcomeMoment,
  id: RecordId = newRecordId(),
): OutcomeRecord {
  const build = createRecordFactory({ zone: moment.zone, provenance: OUTCOME_PROVENANCE })
  const semantics = episode.semantics
  return build(
    'outcome',
    {
      occurredAt: moment.now,
      ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
      id,
      domains: [semantics.domain],
      entities: [semantics.subject, semantics.target.object],
    },
    {
      about: episode.recommendation,
      observation: answer.observation,
      ...(answer.sentiment === undefined ? {} : { sentiment: answer.sentiment }),
    },
  )
}
