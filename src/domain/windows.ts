import type { Branded } from './branded'
import {
  addLocalDaysToDayId,
  civilDateFromDayId,
  instantAtLocal,
  localDateTimeAt,
  minutesIntoDay,
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
 *
 * ## Validity, not a countdown — AUD-0005
 *
 * The first three units are all *elapsed-time* measures, and the audit found
 * what that costs. "Hours slept last night" carried `local-days: 1`, so a
 * reading taken at 06:30 was `known` at 06:30 and `stale` at 10:00 the same
 * morning — the same value, about the same night, on the same day. The app lost
 * its best morning fact at the exact hour it most needed it, which is half of
 * why it had nothing to say before noon.
 *
 * Some facts are not perishable goods with a shelf life. They are true *of
 * something* and stop being true when that something ends:
 *
 * - `this-local-day` — true for the owner-local day it was recorded on. Last
 *   night's sleep does not become less true at ten in the morning; it stops
 *   being the answer to "how did you sleep last night" when the next night has
 *   happened, and the next night is on the other side of midnight.
 * - `this-block` — true within the part of the day it was recorded in. How much
 *   time there is is a fact about *this* evening or *this* morning, and it
 *   expires at the boundary rather than four hours after it was said.
 *
 * Neither is a widening. `this-local-day` is shorter than `local-days: 1` for
 * every reading taken after midday and longer for every reading taken before
 * it, which is the point: it follows the thing being described instead of the
 * clock that happened to be running.
 */
export type FreshnessHorizon =
  | { readonly unit: 'elapsed'; readonly ms: number }
  | { readonly unit: 'local-days'; readonly days: number }
  | { readonly unit: 'this-local-day' }
  | { readonly unit: 'this-block' }
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
  if (horizon.unit === 'this-local-day') return startOfNextLocalDay(observedAt, zone)
  if (horizon.unit === 'this-block') return endOfBlockAt(observedAt, zone)

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

/** Midnight at the end of the owner-local day this instant falls in. */
function startOfNextLocalDay(at: Instant, zone: TimeZoneId): Instant {
  const local = localDateTimeAt(at, zone)
  return instantAtLocal(
    { ...civilDateFromDayId(addLocalDaysToDayId(local.dayId, 1)), hour: 0, minute: 0, second: 0 },
    zone,
  )
}

/**
 * When the part of the day this instant falls in is over.
 *
 * The boundaries are `blockOfLocalTime`'s own, read from one table rather than
 * written out a second time — a second copy of the day's shape is a second
 * answer to what time it is, which is the class this whole change is about.
 * Late night spans both ends of the day, so a reading taken at eleven expires
 * at four the next morning rather than at midnight.
 */
function endOfBlockAt(at: Instant, zone: TimeZoneId): Instant {
  const local = localDateTimeAt(at, zone)
  const minutes = minutesIntoDay(local.timeOfDay)
  const ends = BLOCK_ENDS_AT.find((boundary) => minutes < boundary)
  const day = ends === undefined ? addLocalDaysToDayId(local.dayId, 1) : local.dayId
  const endMinutes = ends ?? END_OF_LATE_NIGHT
  return instantAtLocal(
    {
      ...civilDateFromDayId(day),
      hour: Math.floor(endMinutes / 60),
      minute: endMinutes % 60,
      second: 0,
    },
    zone,
  )
}

/** The same cuts `blockOfLocalTime` makes, in minutes into the local day. */
const END_OF_LATE_NIGHT = 4 * 60
const BLOCK_ENDS_AT: readonly number[] = [END_OF_LATE_NIGHT, 7 * 60, 12 * 60, 18 * 60, 22 * 60]

/**
 * The horizon as a rough duration, for the readers that need a number.
 *
 * `association.ts` uses it to decide how far apart two readings may be and
 * still describe the same occasion; `coverage.ts` and `insights.ts` use it to
 * work out when an area has gone quiet. None of them wants the exact instant a
 * particular reading expires — they want the shape of the concept — and all
 * three had their own `unit === 'local-days' ? … : …` line, which is three
 * places to forget a new unit in.
 *
 * `undefined` means durable, which is not a long duration: it is the absence of
 * one, and every caller has to say what it does about that.
 */
export function approximateHorizonMs(horizon: FreshnessHorizon): number | undefined {
  switch (horizon.unit) {
    case 'durable':
      return undefined
    case 'elapsed':
      return horizon.ms
    case 'local-days':
      return horizon.days * MS_PER_DAY
    case 'this-local-day':
      return MS_PER_DAY
    case 'this-block':
      // The longest block there is — noon to six. A shorter figure would make
      // the readers above treat a fact that lasts all afternoon as one that
      // lasts an hour.
      return 6 * 60 * 60 * 1000
  }
}

const MS_PER_DAY = 86_400_000

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
