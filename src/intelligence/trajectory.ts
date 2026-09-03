import type { LifeDomainId } from '../domain/domains'
import type { RecordId } from '../domain/ids'
import { mayRaiseUnasked, mayReasonFrom, type PermissionState } from '../domain/privacy'
import { bearsConcept, type FactValue } from '../domain/records'
import {
  localDayIdAt,
  localDaysBetween,
  type Instant,
  type LocalDayId,
  type TimeZoneId,
} from '../domain/time'
import { approximateHorizonMs, type ConceptId, type FreshnessHorizon } from '../domain/windows'
import type { ConceptRegistry } from '../domain/concepts'
import type { MemoryView } from '../memory/view'

/**
 * What the record has been doing over months — AUD-0029, S1b.
 *
 * ## The finding
 *
 * *"Section 16 requires reasoning up to 'all retained history' and the app's
 * longest reasoning horizon is one night."* The app could not notice that his
 * energy had been trending down since June, that he had not seen anyone since
 * the spring, or that the last three Novembers were hard. For a system built to
 * hold a life over years, that was the largest gap between the plan and the
 * product.
 *
 * And the evidence for it already existed. `insights.ts` computed a trajectory
 * card — *"Current energy: steady around 2.7 of 5. 67 readings between 3 March
 * and 2 May"* — and **no decision could read it.** The audit's own words: the
 * trajectory cards *"already produce exactly that, unconnected to any
 * decision."*
 *
 * ## What this is, and where it now lives
 *
 * The computation, moved out of the card that used to own it. The audit is
 * explicit about the method — *"do it as an extraction with the card output
 * byte-identical, verified by the existing insight copy tests"* — so this file
 * holds the arithmetic and `insights.ts` holds every word of the sentence it
 * used to render. Nothing about the card moved.
 *
 * The reading reaches the decision through `Situation.trajectories`, which is
 * the same door every other reading comes through (AUD-0040). One computation,
 * two consumers, and no way for the card and the decision to disagree about
 * what the record has been doing.
 *
 * ## What it is not, and this is the bound
 *
 * **It is not a third outcome horizon.** §5.1 refuses `monthly` and `seasonal`
 * as judgement horizons: the owner cannot answer *"how did the last six weeks
 * go"*, and a question asked into silence is worse than no question. Month and
 * season belong to **reading the record** — which is this — rather than to
 * **judging a move**, and that distinction is the whole of what S1a and S1b are
 * respectively for.
 *
 * **It is not causal.** A direction is what a run of numbers did. *"Because of
 * X"* would be an assertion the numbers cannot support, and section 68 forbids
 * it. The dimension it feeds is named `trajectory-fit` rather than anything
 * suggesting the move would fix the drift.
 *
 * ## And a private reading may reach a decision only where it is permitted
 *
 * The card is gated on `mayRaiseUnasked` — *may the app bring this up
 * unprompted* — and a decision is a different question, so this is gated on
 * `mayReasonFrom` instead (D-167). A trajectory the owner has not allowed the
 * app to reason from is not computed at all rather than computed and then
 * ignored: a reading that exists inside the engine is a reading something will
 * eventually consult.
 */

/** Readings a trajectory needs before it will describe a direction. */
export const TRAJECTORY_READINGS = 6

/**
 * How long a run of readings has to cover, in the concept's own windows.
 *
 * Concept-relative for the same reason freshness and neglect already are
 * (section 8, D-061): six days of nightly sleep readings is a fortnight's worth
 * of evidence about sleep, and six days of readings about a cash buffer is one
 * afternoon's worth of evidence about money. A fixed number of days would be
 * right for one of them and wrong for the other.
 */
export const TRAJECTORY_SPAN_WINDOWS = 6
export const TRAJECTORY_SPAN_FLOOR_DAYS = 7

/** How far the two halves must differ before a trajectory claims a direction. */
export const TRAJECTORY_SHIFT = 0.15

export type TrajectoryDirection = 'up' | 'down' | 'steady'

export interface TrajectoryReading {
  readonly at: Instant
  readonly dayId: LocalDayId
  readonly value: number
  readonly record: RecordId
}

/**
 * What a run of readings of one concept has done.
 *
 * Everything the card printed and everything a decision needs, in one object,
 * so the two cannot drift. `shift` is the proportional change between the two
 * halves and is what `direction` is derived from; both travel because the card
 * prints the halves and the dimension weighs the size of the move.
 */
export interface Trajectory {
  readonly concept: ConceptId
  readonly domain: LifeDomainId | undefined
  readonly label: string
  readonly direction: TrajectoryDirection
  /** Proportional change from the earlier half to the later one. */
  readonly shift: number
  readonly before: number
  readonly after: number
  readonly earlier: number
  readonly later: number
  readonly readings: readonly TrajectoryReading[]
  readonly first: TrajectoryReading
  readonly last: TrajectoryReading
  readonly scale: ReadingScale
  /** Whether the app may bring this up on a screen the owner did not ask for. */
  readonly mayRaise: boolean
}

/**
 * How to print a reading of this concept in the terms it was given in.
 *
 * `numericValue` turns a scale into a ratio so two readings can be compared —
 * 4-of-5 and 8-of-10 are the same reading. That is right for the arithmetic and
 * wrong for the screen: once state dimensions became trackable (D-089), the
 * trajectory card started reading **"Current energy: steady around 0.5"**, which
 * is a number the owner has never seen and could not act on. He answered
 * "Enough" and the app showed him a ratio.
 *
 * So the scale's own top travels with the series, and the reading is rendered
 * back onto it.
 */
export interface ReadingScale {
  readonly of: number | undefined
  readonly unit: string
}

export function scaleOf(value: FactValue): ReadingScale {
  if (value.type === 'scale') return { of: value.of, unit: '' }
  if (value.type === 'number' && value.unit !== undefined) {
    return { of: undefined, unit: ` ${value.unit}` }
  }
  if (value.type === 'duration') return { of: undefined, unit: ' min' }
  return { of: undefined, unit: '' }
}

export function describeReading(value: number, scale: ReadingScale): string {
  if (scale.of === undefined) return `${Math.round(value * 10) / 10}${scale.unit}`
  return `${Math.round(value * scale.of * 10) / 10} of ${scale.of}`
}

export function numericValue(value: FactValue): number | undefined {
  switch (value.type) {
    case 'number':
      return value.value
    case 'scale':
      return value.of === 0 ? undefined : value.value / value.of
    case 'duration':
      return value.minutes
    default:
      return undefined
  }
}

/** Six of this concept's own freshness windows, never under a week. */
export function spanNeededFor(horizon: FreshnessHorizon): number {
  const ms = approximateHorizonMs(horizon)
  if (ms === undefined) return Number.POSITIVE_INFINITY
  return Math.max(TRAJECTORY_SPAN_FLOOR_DAYS, (ms / 86_400_000) * TRAJECTORY_SPAN_WINDOWS)
}

export interface TrajectoryMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
}

/**
 * Every trajectory the record supports, keyed by concept.
 *
 * A `Map` rather than a list because both consumers look one up: the card
 * builder walks it, and the dimension asks for the concepts a candidate's area
 * is about. Ordered by concept id so two runs produce the same list — the card
 * order used to fall out of insertion order over `view.history.effective`, and
 * that is a property nobody wrote down and everybody depended on.
 */
export function readTrajectories(
  view: MemoryView,
  concepts: ConceptRegistry,
  permissions: PermissionState,
  moment: TrajectoryMoment,
): ReadonlyMap<ConceptId, Trajectory> {
  const byConcept = new Map<
    ConceptId,
    {
      readings: TrajectoryReading[]
      scale: ReadingScale
      label: string
      domain: LifeDomainId | undefined
      spanNeeded: number
      mayRaise: boolean
    }
  >()

  for (const record of view.history.effective) {
    if (!bearsConcept(record)) continue
    if (record.occurredAt > moment.now) continue
    const definition = concepts.definitionFor(record.concept)
    /*
     * `tracked`, not `standing` — D-089.
     *
     * This gated on `standing`, and `standing` is false for every dimension the
     * owner reports about how he is right now, deliberately and for a good
     * reason of its own (D-061). The effect was that energy, soreness, mood,
     * social energy and sleep quality could never appear here: the app
     * collected them, used them to decide which past evenings resembled
     * tonight, and never once reported what they had done over time.
     */
    if (definition.tracked === undefined) continue
    /*
     * And nothing the owner has not allowed the app to reason from — D-167.
     *
     * Stricter than the card's own gate, and deliberately so. `mayRaiseUnasked`
     * answers *may this appear on a screen he did not ask for*; this answers
     * *may a decision be made from it*, and a reading that reaches the engine at
     * all is a reading something will eventually consult. Whether the card may
     * be *shown* is a second question, answered by `mayRaise` below, so the two
     * gates stay separate rather than one standing in for the other.
     */
    if (!mayReasonFrom(definition.privacy, permissions)) continue
    const value = numericValue(record.value)
    if (value === undefined) continue

    const reading: TrajectoryReading = {
      at: record.occurredAt,
      dayId: localDayIdAt(record.occurredAt, moment.zone),
      value,
      record: record.id,
    }
    const held = byConcept.get(record.concept)
    if (held === undefined) {
      byConcept.set(record.concept, {
        readings: [reading],
        scale: scaleOf(record.value),
        label: definition.label,
        domain: definition.domain,
        spanNeeded: spanNeededFor(definition.freshness),
        mayRaise: mayRaiseUnasked(definition.privacy),
      })
    } else {
      held.readings.push(reading)
    }
  }

  const out = new Map<ConceptId, Trajectory>()

  for (const [concept, held] of [...byConcept].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (held.readings.length < TRAJECTORY_READINGS) continue
    const ordered = [...held.readings].sort((a, b) => a.at - b.at)
    const first = ordered[0]
    const last = ordered[ordered.length - 1]
    if (first === undefined || last === undefined) continue
    const span = localDaysBetween(first.dayId, last.dayId)
    if (span < held.spanNeeded) continue

    const cut = Math.floor(ordered.length / 2)
    const earlier = ordered.slice(0, cut)
    const later = ordered.slice(cut)
    const mean = (rows: readonly TrajectoryReading[]): number =>
      rows.reduce((sum, row) => sum + row.value, 0) / rows.length
    const before = mean(earlier)
    const after = mean(later)
    const shift = before === 0 ? 0 : (after - before) / Math.abs(before)
    const direction: TrajectoryDirection =
      Math.abs(shift) < TRAJECTORY_SHIFT ? 'steady' : after > before ? 'up' : 'down'

    out.set(concept, {
      concept,
      domain: held.domain,
      label: held.label,
      direction,
      shift,
      before,
      after,
      earlier: earlier.length,
      later: later.length,
      readings: ordered,
      first,
      last,
      scale: held.scale,
      mayRaise: held.mayRaise,
    })
  }

  return out
}
