import { createRecordFactory } from '../domain/build'
import type { EntityRef } from '../domain/entities'
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
import { setThreadStateRecord, threadFor } from './threads'

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

/**
 * `part-done` is F10's state, and it is the one real life actually has.
 *
 * *"Real life rarely consists only of clean starts and finishes."* Fifteen of
 * the twenty-five minutes, half the kitchen, two of the three questions. Before
 * this the owner had two words for that evening — **Done**, which overstates
 * it, or nothing, which loses it — and the review found the app interpreting
 * disruption as refusal because those were the only shapes it had.
 *
 * It is a settled state that is **not terminal**. Only `completed` is terminal,
 * and part of a thing done can still be finished, put down, or interrupted
 * again.
 */
export type MoveState = 'shown' | 'started' | 'part-done' | 'completed' | 'declined' | 'unable-now'

export type LifecycleAction =
  'start' | 'complete' | 'part-done' | 'decline' | 'unable-now' | 'try-another'

/**
 * What the owner may do next, from where the move currently stands.
 *
 * Only `completed` is terminal, and the rest are deliberately forgiving.
 * Saying "not tonight" and then doing it anyway is an ordinary evening, and an
 * app that refused to record the second half of it would be wrong about the
 * owner's life in order to be tidy about its own state machine.
 */
const TRANSITIONS: Record<MoveState, readonly MoveState[]> = {
  shown: ['started', 'part-done', 'completed', 'declined', 'unable-now'],
  started: ['part-done', 'completed', 'declined', 'unable-now'],
  // Part of it happened, and none of that closes anything off: it can be
  // finished, picked up again, put down, or interrupted a second time.
  'part-done': ['started', 'completed', 'declined', 'unable-now'],
  'unable-now': ['started', 'part-done', 'completed', 'declined'],
  declined: ['started', 'part-done', 'completed'],
  completed: [],
}

const RESULTING_STATE: Record<LifecycleAction, MoveState> = {
  start: 'started',
  complete: 'completed',
  'part-done': 'part-done',
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
        /*
         * The record says how much of it happened; the state follows — F10.
         *
         * Absent `extent` means the whole of it, so every completion written
         * before this field existed still lands on `completed` and every reader
         * of the state behaves exactly as it did. A partial one lands on
         * `part-done`, which is not terminal, so the app can still ask him to
         * finish it and learning does not pool it with the evenings that went
         * the whole way.
         */
        const reached: MoveState = record.extent === 'partial' ? 'part-done' : 'completed'
        if (!TRANSITIONS[episode.state].includes(reached)) break
        episode.state = reached
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
    case 'part-done':
      /*
       * The same record, saying how much — F10.
       *
       * Not a new record kind, because the fact is the same fact: the attempt
       * was carried out. `extent` is the only thing that differs and it is the
       * only thing that should, so everything that already reads a completion
       * from the record — a goal piece having had a session, Timeline's line,
       * the export — goes on working without knowing this state exists.
       */
      records.push(
        build('action-completion', envelope, {
          recommendation,
          extent: 'partial',
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
      /*
       * And the course this move belonged to stops — AUD-0020.
       *
       * "Any decline of a thread move must be able to end the thread" is one of
       * the finding's own mitigations, and it is here rather than on the screen
       * on purpose: a surface that forgot it would leave the owner saying no to
       * the same plan every evening, which is precisely the nagging the whole
       * structure is fenced against.
       *
       * Paused rather than abandoned, because a decline is disagreement with
       * *tonight* and not a verdict on the plan (section 20, D-038). It stops
       * pulling immediately, it stays on Life, and he can pick it up again.
       *
       * `unable-now` and `try-another` deliberately do not do this. One is a
       * fact about the evening and the other is a request for a different
       * suggestion; neither is him saying the course is wrong.
       */
      records.push(...paused(situation, view, target, envelope.recordedAt, request.nextId))
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

/**
 * The record that pauses whichever course this move belonged to, if any.
 *
 * Empty for every move that belongs to no live thread, which is nearly all of
 * them — so nothing about an ordinary decline changes.
 */
function paused(
  situation: Situation,
  view: MemoryView,
  target: ActionTarget,
  recordedAt: Instant,
  nextId: (() => RecordId) | undefined,
): readonly CanonicalRecord[] {
  const thread = threadFor(situation.threads, target)
  if (thread === undefined) return []
  const previous = view.history.byId(thread.source)
  if (previous === undefined || previous.kind !== 'thread') return []
  return [
    setThreadStateRecord(
      thread,
      'paused',
      previous,
      { now: situation.at, zone: situation.zone, recordedAt },
      nextId?.(),
    ),
  ]
}

export function readable(state: MoveState): string {
  switch (state) {
    case 'shown':
      return 'new'
    case 'started':
      return 'started'
    case 'part-done':
      return 'part done'
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
  for (const action of [
    'start',
    'part-done',
    'complete',
    'decline',
    'unable-now',
    'try-another',
  ] as const) {
    if (allowed.includes(RESULTING_STATE[action])) out.push(action)
  }
  return out
}

// ---------------------------------------------------------------------------
// Picking something back up — F10, package 5
// ---------------------------------------------------------------------------

/**
 * A move today that was interrupted or part-done and can still be finished.
 *
 * Routing 83's instrument stopped here, and the stop was exact: **"Can't right
 * now" is recorded and the move then leaves the screen.** `TRANSITIONS` has
 * always allowed `unable-now → started | completed | declined`, and no surface
 * ever offered any of them again — so an interruption was indistinguishable
 * from a refusal in the only place it mattered, which is what the owner sees.
 *
 * The way back is on the surface rather than in the arbiter, and that placement
 * is deliberate. A move refused or blocked in this block is genuinely out of
 * the running for it (AUD-0023, and the duplication rules that follow from it),
 * and reaching into the ranking to bring it back would be undoing a decision
 * the app was right to make. What was missing is not a recommendation — it is
 * an **intention he already had**, which is a different thing and belongs
 * beside the day rather than inside the decision.
 *
 * Today only. An intention carried across midnight is a plan for tomorrow, and
 * D-134 is explicit that `hold` may not name tomorrow.
 */
export interface ResumableMove {
  readonly episode: Episode
  readonly semantics: RecommendationSemantics
  readonly state: MoveState
  /** What was in the way, where he said. Absent is ordinary and stays so. */
  readonly blocker: string | undefined
  /** Which actions the state machine will actually take from here. */
  readonly actions: readonly LifecycleAction[]
}

/**
 * Whether the thing a move was about is a goal the app has stopped suggesting.
 *
 * QA-91-006's class. Moving an aim between areas sets aside the next step named
 * under the old one, and the lifecycle rows from an evening it was offered on go
 * on existing — truthfully, and they should. What must not follow is the app
 * offering the move **back**: a half-finished thing it has stopped proposing is
 * not something to pick up again, and putting it on Now would be the withdrawn
 * interpretation arriving through a second door.
 *
 * Only ever true of a subject some `goal` record names, so a routine, a place or
 * a person the engine proposes is untouched by it. `history.effective` has
 * already dropped superseded rows, so there is one live goal record to read.
 */
function goalSetAside(view: MemoryView, object: EntityRef): boolean {
  let named = false
  for (const record of view.history.effective) {
    if (record.kind !== 'goal') continue
    if (record.goal.id !== object.id) continue
    named = true
    if (record.status === 'active') return false
  }
  return named
}

export function resumableToday(view: MemoryView, situation: Situation): readonly ResumableMove[] {
  const out: ResumableMove[] = []
  for (const episode of collectEpisodes(view, situation.zone)) {
    if (episode.dayId !== situation.dayId) continue
    /*
     * And one he started and never settled — F09.
     *
     * *"'Later' is useful only if it refers to a plausible opportunity and the
     * intention is not silently lost."* A move he pressed **Start** on at ten in
     * the morning and never marked finished is exactly a carried intention, and
     * it fell off Now the moment something else was chosen: `resumableToday`
     * knew about a move he could not do and a move he half-did, and not about
     * one he was in the middle of.
     *
     * It is the same shape as the other two — an episode of today with a fate
     * still open — and it needs no new record, which is what keeps D-134's bound
     * intact. The **held** case genuinely does need one, writes nothing today,
     * and stays out of this phase; D-280 records why.
     */
    if (
      episode.state !== 'unable-now' &&
      episode.state !== 'part-done' &&
      episode.state !== 'started'
    ) {
      continue
    }
    if (episode.shownAt > situation.at) continue
    if (goalSetAside(view, episode.semantics.target.object)) continue
    out.push({
      episode,
      semantics: episode.semantics,
      state: episode.state,
      blocker: episode.blocker,
      actions: availableActions(episode.state),
    })
  }
  return out.sort((a, b) => (b.episode.settledAt ?? 0) - (a.episode.settledAt ?? 0))
}

/**
 * The one to offer, or nothing.
 *
 * One at a time, for the same reason the guide asks one question at a time and
 * the growth panel raises one finding at a time: this screen is read with one
 * thumb and a spare minute, and a list of unfinished things is the nagging the
 * whole product is fenced against.
 *
 * The move currently on screen is never offered back — it is already there, and
 * showing it twice would be the app arguing with itself.
 */
export function nextResumable(
  view: MemoryView,
  situation: Situation,
  onScreen: RecommendationSemantics | undefined,
): ResumableMove | undefined {
  return resumableToday(view, situation).find(
    (move) =>
      onScreen === undefined || targetKey(move.semantics.target) !== targetKey(onScreen.target),
  )
}
