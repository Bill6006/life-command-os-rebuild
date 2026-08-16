import { createRecordFactory } from '../domain/build'
import { derivedRecordId, newRecordId, type RecordId } from '../domain/ids'
import type { ActionTarget, RecommendationSemantics } from '../domain/recommendation'
import {
  compareRecordOrder,
  type CanonicalRecord,
  type DecisionContext,
  type OutcomeRecord,
  type Provenance,
} from '../domain/records'
import { localDayIdAt, type Instant, type LocalDayId, type TimeZoneId } from '../domain/time'
import type { MemoryView } from '../memory/view'
import type { Situation } from './situation'

/**
 * The recommendation lifecycle (canonical plan sections 20 and 48).
 *
 * Section 20 asks for shown, accepted, started, completed, abandoned, declined,
 * unable-now, replaced, outcome observed, outcome unknown. What is modelled here
 * is five states and one separate question, which is those ten with the
 * duplicates removed: "accepted" is not distinguishable from "started" by
 * anything the owner does, "abandoned" is a start that was later declined, and
 * whether an outcome has been observed is a property of the episode rather than
 * a state it is in.
 *
 * ## An episode is a thing, not a record
 *
 * The unit of the lifecycle is an **episode**: one suggestion, on one day, and
 * everything that happened to it. It is identified by what it is about — the
 * verb, the subject and the owner-local day — rather than by the record that
 * created it.
 *
 * That is the whole of the duplicate protection, and it is structural. Two taps
 * cannot produce two episodes, because two records about the same move on the
 * same day fold into the same one. Nothing has to remember not to write twice
 * for that to hold. On top of it, the recommendation record carries a
 * `derivedRecordId` built from the episode key, so the second tap writes a
 * byte-identical record and the store skips it (D-015) — belt as well as braces.
 *
 * ## Nothing is written until the owner acts
 *
 * Now does not record a recommendation because it displayed one. A history that
 * grew a row every time a screen rendered would be unreadable within a week,
 * and every one of those rows would be an episode nothing ever happened to.
 * The recommendation record is written on the first tap, together with the
 * event that prompted it — which is also the moment the decision context is
 * worth keeping, because that is the context the owner acted in.
 *
 * ## Order comes from when it was written down
 *
 * Every event in one session is about the same moment — `occurredAt` is the
 * moment being reasoned about, which under time travel is not now. So "started,
 * then changed their mind" is told from "declined, then did it anyway" by
 * `recordedAt`, exactly as D-037 does for guide answers.
 */

export type MoveState = 'shown' | 'started' | 'completed' | 'declined' | 'unable-now'

export type LifecycleAction = 'start' | 'complete' | 'decline' | 'unable-now' | 'try-another'

/**
 * What the owner may do next, from where the move currently stands.
 *
 * Only `completed` is terminal, and the rest are deliberately forgiving.
 * Saying "not tonight" and then doing it anyway is an ordinary evening, and an
 * app that refused to record the second half of it would be wrong about the
 * owner's life in order to be tidy about its own state machine.
 */
const TRANSITIONS: Record<MoveState, readonly MoveState[]> = {
  shown: ['started', 'completed', 'declined', 'unable-now'],
  started: ['completed', 'declined', 'unable-now'],
  'unable-now': ['started', 'completed', 'declined'],
  declined: ['started', 'completed'],
  completed: [],
}

const RESULTING_STATE: Record<LifecycleAction, MoveState> = {
  start: 'started',
  complete: 'completed',
  decline: 'declined',
  'unable-now': 'unable-now',
  'try-another': 'declined',
}

export const LIFECYCLE_PROVENANCE: Provenance = { source: 'owner', writtenBy: 'now' }

/** What "try another" writes down, so learning can tell it from a real refusal. */
export const WANTED_SOMETHING_ELSE = 'asked for something else'

export interface Episode {
  /** The record every event in this episode points at. */
  readonly recommendation: RecordId
  readonly semantics: RecommendationSemantics
  /** What the app could see when the owner acted. Missing on older history. */
  readonly context: DecisionContext | undefined
  readonly dayId: LocalDayId
  readonly shownAt: Instant
  readonly state: MoveState
  readonly startedAt: Instant | undefined
  /** When it reached a settled state — completed, declined or unable-now. */
  readonly settledAt: Instant | undefined
  readonly declineReason: string | undefined
  readonly blocker: string | undefined
  readonly outcomes: readonly OutcomeRecord[]
  /** True when the owner asked for a different suggestion rather than refusing. */
  readonly wantedAnother: boolean
}

export function targetKey(target: ActionTarget): string {
  return `${target.verb}/${target.object.id}`
}

export function episodeKey(target: ActionTarget, dayId: LocalDayId): string {
  return `${dayId}|${targetKey(target)}`
}

export function recommendationIdFor(target: ActionTarget, dayId: LocalDayId): RecordId {
  return derivedRecordId('recommendation', episodeKey(target, dayId))
}

// ---------------------------------------------------------------------------
// Reading episodes out of history
// ---------------------------------------------------------------------------

interface Building {
  recommendation: RecordId
  semantics: RecommendationSemantics
  context: DecisionContext | undefined
  dayId: LocalDayId
  shownAt: Instant
  state: MoveState
  startedAt: Instant | undefined
  settledAt: Instant | undefined
  declineReason: string | undefined
  blocker: string | undefined
  outcomes: OutcomeRecord[]
  wantedAnother: boolean
}

/**
 * Every episode in the history, oldest first.
 *
 * Events are applied in canonical order and an invalid transition is ignored
 * rather than obeyed: a completion followed by a decline leaves the episode
 * completed, because the completion happened and a later tap cannot un-happen
 * it. That also makes a repeated tap free — the second one asks for a state the
 * episode is already in, which is not a transition at all.
 */
export function collectEpisodes(view: MemoryView, zone: TimeZoneId): readonly Episode[] {
  const byRecommendation = new Map<RecordId, Building>()
  const ordered = [...view.history.effective].sort(compareRecordOrder)

  for (const record of ordered) {
    if (record.kind !== 'action-recommendation') continue
    const dayId = localDayIdAt(record.occurredAt, zone)
    byRecommendation.set(record.id, {
      recommendation: record.id,
      semantics: record.recommendation,
      context: record.context,
      dayId,
      shownAt: record.occurredAt,
      state: 'shown',
      startedAt: undefined,
      settledAt: undefined,
      declineReason: undefined,
      blocker: undefined,
      outcomes: [],
      wantedAnother: false,
    })
  }

  for (const record of ordered) {
    switch (record.kind) {
      case 'action-start': {
        const episode = byRecommendation.get(record.recommendation)
        if (episode === undefined) break
        if (!TRANSITIONS[episode.state].includes('started')) break
        episode.state = 'started'
        episode.startedAt = record.occurredAt
        episode.settledAt = undefined
        break
      }
      case 'action-completion': {
        const episode = byRecommendation.get(record.recommendation)
        if (episode === undefined) break
        if (!TRANSITIONS[episode.state].includes('completed')) break
        episode.state = 'completed'
        episode.settledAt = record.occurredAt
        break
      }
      case 'action-decline': {
        const episode = byRecommendation.get(record.recommendation)
        if (episode === undefined) break
        if (!TRANSITIONS[episode.state].includes('declined')) break
        episode.state = 'declined'
        episode.settledAt = record.occurredAt
        episode.declineReason = record.reason
        if (record.reason === WANTED_SOMETHING_ELSE) episode.wantedAnother = true
        break
      }
      case 'action-unable-now': {
        const episode = byRecommendation.get(record.recommendation)
        if (episode === undefined) break
        if (!TRANSITIONS[episode.state].includes('unable-now')) break
        episode.state = 'unable-now'
        episode.settledAt = record.occurredAt
        episode.blocker = record.blocker
        break
      }
      case 'outcome': {
        const episode = byRecommendation.get(record.about)
        if (episode === undefined) break
        episode.outcomes.push(record)
        break
      }
      default:
        break
    }
  }

  return [...byRecommendation.values()].map((held) => ({ ...held, outcomes: [...held.outcomes] }))
}

/** The episode for this move on this day, if the owner has already touched it. */
export function openEpisode(
  episodes: readonly Episode[],
  target: ActionTarget,
  dayId: LocalDayId,
): Episode | undefined {
  const key = episodeKey(target, dayId)
  let found: Episode | undefined
  for (const episode of episodes) {
    if (episodeKey(episode.semantics.target, episode.dayId) !== key) continue
    if (found === undefined || episode.shownAt > found.shownAt) found = episode
  }
  return found
}

// ---------------------------------------------------------------------------
// Recording what the owner did
// ---------------------------------------------------------------------------

export interface LifecycleRequest {
  readonly view: MemoryView
  readonly situation: Situation
  readonly semantics: RecommendationSemantics
  readonly action: LifecycleAction
  /**
   * The real clock, distinct from the moment being reasoned about (D-037).
   * It is what separates two events in one session.
   */
  readonly recordedAt: Instant
  /** The owner's own words, when they gave any. */
  readonly reason?: string
  readonly nextId?: () => RecordId
}

export interface LifecyclePlan {
  readonly records: readonly CanonicalRecord[]
  /** The episode this belongs to, once the records are appended. */
  readonly recommendation: RecordId
  /** Set when nothing needs writing, and why. Not an error. */
  readonly noChange: string | undefined
}

/**
 * What to append when the owner taps something.
 *
 * Pure: it reads the history and returns records. Whether they are written is
 * the surface's business, and whether they change anything is the engine's.
 */
export function planLifecycle(request: LifecycleRequest): LifecyclePlan {
  const { view, situation, semantics, action, recordedAt } = request
  const zone = situation.zone
  const dayId = situation.dayId
  const target = semantics.target

  const episodes = collectEpisodes(view, zone)
  const existing = openEpisode(episodes, target, dayId)
  const wanted = RESULTING_STATE[action]

  if (existing !== undefined && !TRANSITIONS[existing.state].includes(wanted)) {
    return {
      records: [],
      recommendation: existing.recommendation,
      noChange:
        existing.state === wanted
          ? `already ${readable(existing.state)}`
          : `cannot go from ${readable(existing.state)} to ${readable(wanted)}`,
    }
  }

  const build = createRecordFactory({
    zone,
    provenance: LIFECYCLE_PROVENANCE,
    ...(request.nextId === undefined ? {} : { nextId: request.nextId }),
  })

  const records: CanonicalRecord[] = []
  const recommendation = existing?.recommendation ?? recommendationIdFor(target, dayId)

  if (existing === undefined) {
    /*
     * The offering, written down at the moment it is acted on.
     *
     * `recordedAt` is deliberately left to default to `occurredAt` here, unlike
     * the event below it. This row is the app recording what it decided, not
     * the owner saying something, so there is nothing to separate from anything
     * — and leaving it alone is what makes two taps produce the identical
     * record the store already knows to skip.
     */
    records.push(
      build(
        'action-recommendation',
        {
          occurredAt: situation.at,
          id: recommendation,
          domains: [semantics.domain],
          entities: [semantics.subject, target.object],
        },
        { recommendation: semantics, context: situation.context },
      ),
    )
  }

  const envelope = {
    occurredAt: situation.at,
    recordedAt,
    id: request.nextId?.() ?? newRecordId(),
    domains: [semantics.domain],
    entities: [semantics.subject, target.object],
  }

  switch (action) {
    case 'start':
      records.push(build('action-start', envelope, { recommendation }))
      break
    case 'complete':
      records.push(
        build('action-completion', envelope, {
          recommendation,
          ...(request.reason === undefined ? {} : { note: request.reason }),
        }),
      )
      break
    case 'decline':
      records.push(
        build('action-decline', envelope, {
          recommendation,
          ...(request.reason === undefined ? {} : { reason: request.reason }),
        }),
      )
      break
    case 'try-another':
      // A request for a different suggestion, not a judgement on this one.
      // Learning has to be able to tell them apart (section 20).
      records.push(
        build('action-decline', envelope, { recommendation, reason: WANTED_SOMETHING_ELSE }),
      )
      break
    case 'unable-now':
      records.push(
        build('action-unable-now', envelope, {
          recommendation,
          ...(request.reason === undefined ? {} : { blocker: request.reason }),
        }),
      )
      break
  }

  return { records, recommendation, noChange: undefined }
}

export function readable(state: MoveState): string {
  switch (state) {
    case 'shown':
      return 'new'
    case 'started':
      return 'started'
    case 'completed':
      return 'done'
    case 'declined':
      return 'passed on'
    case 'unable-now':
      return 'not right now'
  }
}

/** Which lifecycle actions make sense from where a move currently stands. */
export function availableActions(state: MoveState): readonly LifecycleAction[] {
  const allowed = TRANSITIONS[state]
  const out: LifecycleAction[] = []
  for (const action of ['start', 'complete', 'decline', 'unable-now', 'try-another'] as const) {
    if (allowed.includes(RESULTING_STATE[action])) out.push(action)
  }
  return out
}
