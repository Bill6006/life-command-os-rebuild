import type { Branded } from './branded'
import {
  addLocalDaysToDayId,
  civilDateFromDayId,
  instantAtLocal,
  localDateTimeAt,
  type Instant,
  type TimeZoneId,
} from './time'

/**
 * Windows (canonical plan section 15).
 *
 * An observation window, a due window and a freshness window are three
 * different ideas that all look like "a bit of time" if you let them:
 *
 *   - an observation window is when evidence was gathered — sleep between
 *     23:10 and 06:40 last night;
 *   - a due window is when an action should happen — before bed tonight;
 *   - a freshness window is how long a kind of knowledge stays believable —
 *     current sleep goes stale in a day, a custody arrangement does not go
 *     stale at all.
 *
 * They are separate types with different field names, so passing one where
 * another belongs does not compile.
 */

export type ConceptId = Branded<string, 'ConceptId'>

export function conceptId(value: string): ConceptId {
  return value as ConceptId
}

export interface ObservationWindow {
  readonly kind: 'observation'
  readonly from: Instant
  readonly to: Instant
}

export interface DueWindow {
  readonly kind: 'due'
  readonly earliest: Instant
  readonly latest: Instant
}

/**
 * How long knowledge of a concept stays believable.
 *
 * `local-days` is not `elapsed` with the multiplication done for you: across a
 * DST boundary "two days old" and "48 hours old" are different instants, and
 * "is yesterday's answer still good?" is a calendar question.
 *
 * `durable` is the case section 8 calls out directly — a custody arrangement
 * does not need re-asking every day. Durable knowledge is displaced by a
 * correction or an exception, never by the passage of time.
 */
export type FreshnessHorizon =
  | { readonly unit: 'elapsed'; readonly ms: number }
  | { readonly unit: 'local-days'; readonly days: number }
  | { readonly unit: 'durable' }

export interface FreshnessWindow {
  readonly kind: 'freshness'
  readonly concept: ConceptId
  readonly horizon: FreshnessHorizon
}

export function observationWindow(from: Instant, to: Instant): ObservationWindow {
  return { kind: 'observation', from, to }
}

export function dueWindow(earliest: Instant, latest: Instant): DueWindow {
  return { kind: 'due', earliest, latest }
}

export function freshnessWindow(concept: ConceptId, horizon: FreshnessHorizon): FreshnessWindow {
  return { kind: 'freshness', concept, horizon }
}

export function coversInstant(window: ObservationWindow, at: Instant): boolean {
  return at >= window.from && at <= window.to
}

export function isDueAt(window: DueWindow, at: Instant): boolean {
  return at >= window.earliest && at <= window.latest
}

export function isOverdueAt(window: DueWindow, at: Instant): boolean {
  return at > window.latest
}

/**
 * The instant at which knowledge observed at `observedAt` stops being fresh.
 *
 * Undefined means it never does — which is a different statement from "it is
 * fresh right now", and callers have to handle it as such.
 */
export function freshUntil(
  observedAt: Instant,
  window: FreshnessWindow,
  zone: TimeZoneId,
): Instant | undefined {
  const horizon = window.horizon
  if (horizon.unit === 'durable') return undefined
  if (horizon.unit === 'elapsed') return (observedAt + horizon.ms) as Instant

  // Calendar days: keep the wall-clock time and move the date, so a horizon
  // that spans a clock change still lands at the same time of day.
  const local = localDateTimeAt(observedAt, zone)
  const movedDay = addLocalDaysToDayId(local.dayId, horizon.days)
  return instantAtLocal(
    {
      ...civilDateFromDayId(movedDay),
      hour: local.hour,
      minute: local.minute,
      second: local.second,
    },
    zone,
  )
}

export function isFreshAt(
  observedAt: Instant,
  now: Instant,
  window: FreshnessWindow,
  zone: TimeZoneId,
): boolean {
  const deadline = freshUntil(observedAt, window, zone)
  if (deadline === undefined) return true
  return now < deadline
}
