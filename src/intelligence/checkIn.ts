import { createRecordFactory } from '../domain/build'
import {
  CHECK_IN_OPENS_AT,
  CHECK_IN_SLOT_LABEL,
  DEFAULT_CHECK_IN_SETTINGS,
  isCheckInDepth,
  isCheckInFrequency,
  readingsAt,
  slotAtMinute,
  SLOTS_AT_FREQUENCY,
  type CheckInSettings,
  type CheckInSlot,
} from '../domain/checkIn'
import { coreConcepts } from '../domain/concepts'
import { newRecordId, type RecordId } from '../domain/ids'
import type { CheckInSettingRecord, ObservationRecord, Provenance } from '../domain/records'
import {
  localDayIdAt,
  localDateTimeAt,
  minutesIntoDay,
  type Instant,
  type TimeZoneId,
} from '../domain/time'
import type { ConceptId } from '../domain/windows'
import type { MemoryView } from '../memory/view'
import { readingFor, type ReadingAnchor, type ReadingSpec } from './readings'

/**
 * The check-in ritual — routing 94, D-285 / D-286 / D-293.
 *
 * ## What it is, and what it is not
 *
 * A **fixed, scheduled, bounded, skippable** set of readings at three known
 * moments. Not the guide, which asks what would change tonight's answer, and
 * **never counted with it**.
 *
 * D-286's decision is two budgets with two rules, *"never one pooled count, or
 * the ritual eats the useful questions or the reverse."* That separation is
 * structural here rather than promised: a check-in answer is written by
 * {@link CHECK_IN_PROVENANCE} and the guide's own counter matches on
 * `writtenBy`, so a day of check-ins cannot consume `QUESTIONS_PER_DAY` and a
 * day of guide questions cannot close the ritual. Two counters, two `writtenBy`
 * values, and no arithmetic joining them anywhere.
 *
 * ## Why a ritual is allowed to ask what the guide is not
 *
 * §13B's rule is that a concept ships askable only where a consumer exists that
 * some possible answer could move, and by that rule a state reading can never
 * qualify — its value is that it makes *tomorrow's* pattern match possible, and
 * `probeSwings` measures today. D-293 satisfies the rule from the other side:
 * **the consumer of every check-in reading is the state score and the history
 * the forecast will be built on.**
 *
 * §13B's real protection — an app that interrogates its owner daily — is not
 * repealed and is held somewhere better. A fixed set at three known moments is
 * a ritual, bounded and anticipated; three scattered unpredictable questions
 * cannot be planned around and can cost more. D-285's words: *the budget was
 * measured on the wrong axis.*
 *
 * ## And what it must not become
 *
 * The owner's previous app *"asked but never learned"* — 7 to 19 questions a
 * block, data piling up, nothing coming back. **Dense sampling alone reproduces
 * that failure with better typography.** This phase cannot deliver the learning
 * that answers it; what it can do is refuse to make the asking feel free, which
 * is why finishing a check-in shows him what he just answered and what it makes,
 * on the same screen, immediately.
 */

/**
 * The owner said it, and the check-in is what wrote it down.
 *
 * The whole of D-286's separation, in one field. `GUIDE_PROVENANCE.writtenBy` is
 * `'guide'` and `answeredToday` counts on it; this is `'check-in'` and
 * {@link answeredInCheckIns} counts on that. Neither counter can see the other's
 * rows, so there is no pooled total for anybody to accidentally create later.
 */
export const CHECK_IN_PROVENANCE: Provenance = { source: 'owner', writtenBy: 'check-in' }

/** And the one the settings control writes under, so a setting is not a reading. */
export const CHECK_IN_SETTINGS_PROVENANCE: Provenance = { source: 'owner', writtenBy: 'settings' }

export interface CheckInMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  /** When the answer was written down, if that differs from what it is about. */
  readonly recordedAt?: Instant
}

/**
 * What the owner has set the check-in to, or the shipped default.
 *
 * **No record at all reads as the default rather than as nothing.** D-285 is
 * explicit that the default is the real decision — *"most people never open
 * settings"* — so an owner who has never opened this screen is on D-293's `full`
 * and `three`, not on an empty setting the code has to guess about.
 *
 * An unrecognised level also falls back to the default, and that is the second
 * half of the wire's decision not to validate the strings it reads: a record
 * written by a build that knew more keeps its words in history, and the running
 * build behaves as though the setting had not been touched rather than refusing
 * to start.
 */
export function checkInSettings(view: MemoryView): CheckInSettings {
  let latest: CheckInSettings | undefined
  for (const record of view.history.effective) {
    if (record.kind !== 'check-in-setting') continue
    if (!isCheckInDepth(record.depth) || !isCheckInFrequency(record.frequency)) continue
    // `effective` is in canonical order, so the last one that parses is the
    // latest one the owner actually set.
    latest = { depth: record.depth, frequency: record.frequency }
  }
  return latest ?? DEFAULT_CHECK_IN_SETTINGS
}

export interface CheckInReading {
  readonly spec: ReadingSpec
  /** Already answered in this check-in — shown as done rather than hidden. */
  readonly answered: boolean
}

export interface DueCheckIn {
  readonly slot: CheckInSlot
  readonly label: string
  readonly settings: CheckInSettings
  /** Every reading this check-in asks for, in the ritual's fixed order. */
  readonly readings: readonly CheckInReading[]
  /** The next one he has not answered, or `undefined` when it is finished. */
  readonly next: ReadingSpec | undefined
  readonly answeredCount: number
  readonly totalCount: number
}

/**
 * Which check-in is open right now, and how far through it he is.
 *
 * `undefined` before the first one opens and outside every window — the app has
 * nothing to ask at half past six in the morning and does not invent a reason
 * to. A finished check-in is still returned, with `next` undefined, so the
 * screen can say what he answered rather than going blank the moment he lands
 * on the last one.
 */
export function dueCheckIn(view: MemoryView, moment: CheckInMoment): DueCheckIn | undefined {
  const settings = checkInSettings(view)
  const minute = minutesIntoDay(localDateTimeAt(moment.now, moment.zone).timeOfDay)
  const slot = slotAtMinute(minute, settings.frequency)
  if (slot === undefined) return undefined

  const answered = answeredInSlot(view, moment, slot)
  const readings: CheckInReading[] = []
  for (const concept of readingsAt(slot, settings.depth)) {
    const spec = readingFor(concept)
    if (spec === undefined) continue
    readings.push({ spec, answered: answered.has(concept) })
  }

  return {
    slot,
    label: CHECK_IN_SLOT_LABEL[slot],
    settings,
    readings,
    next: readings.find((reading) => !reading.answered)?.spec,
    answeredCount: readings.filter((reading) => reading.answered).length,
    totalCount: readings.length,
  }
}

/**
 * Which concepts he has already answered inside this check-in's own window.
 *
 * Scoped to the window rather than to the day, because the same concept is read
 * three times a day on purpose and a morning answer must not make the evening
 * one look already given. **And scoped to the check-in's own rows**: a reading
 * the guide asked for, or one he corrected on a domain page, is a real reading
 * of the same concept and is not this check-in's answer to it.
 *
 * Nothing is inferred from an unanswered one. A skipped reading stays unknown,
 * is not carried over from the last check-in, and is not filled in later from
 * the readings either side of it — G-009, and the owner's own rule that the
 * forecast is the only place the app may assume.
 */
export function answeredInSlot(
  view: MemoryView,
  moment: CheckInMoment,
  slot: CheckInSlot,
): ReadonlySet<ConceptId> {
  const today = localDayIdAt(moment.now, moment.zone)
  const settings = checkInSettings(view)
  const answered = new Set<ConceptId>()

  for (const record of view.history.effective) {
    if (record.kind !== 'observation') continue
    if (record.provenance.writtenBy !== CHECK_IN_PROVENANCE.writtenBy) continue
    if (localDayIdAt(record.occurredAt, moment.zone) !== today) continue
    const at = minutesIntoDay(localDateTimeAt(record.occurredAt, moment.zone).timeOfDay)
    if (slotAtMinute(at, settings.frequency) !== slot) continue
    answered.add(record.concept)
  }

  return answered
}

/**
 * How many readings the check-in has taken today — D-286's second budget.
 *
 * It exists to be **reported separately**, and the separation is the decision
 * rather than the number. `answeredToday` in `guide.ts` is the first budget and
 * counts the guide's rows; this counts the ritual's; and nothing adds them.
 * A caller wanting one total is a caller about to re-create the pooled count
 * D-286 forbids, so there is no function here that produces one.
 */
export function answeredInCheckIns(view: MemoryView, moment: CheckInMoment): number {
  const today = localDayIdAt(moment.now, moment.zone)
  let count = 0
  for (const record of view.history.effective) {
    if (record.provenance.writtenBy !== CHECK_IN_PROVENANCE.writtenBy) continue
    if (localDayIdAt(record.occurredAt, moment.zone) !== today) continue
    count += 1
  }
  return count
}

/**
 * How many readings a whole day at this setting would come to, and how many
 * have been given.
 *
 * The pair the check-in screen shows so the ritual is bounded **visibly** — a
 * fixed set with an end he can see is what makes it a ritual rather than a
 * questionnaire that stops when the app has had enough.
 */
export function checkInBudget(
  view: MemoryView,
  moment: CheckInMoment,
): { readonly answered: number; readonly perDay: number } {
  const settings = checkInSettings(view)
  const perDay = SLOTS_AT_FREQUENCY[settings.frequency].reduce(
    (total, slot) => total + readingsAt(slot, settings.depth).length,
    0,
  )
  return { answered: answeredInCheckIns(view, moment), perDay }
}

/**
 * When the next check-in opens, as minutes into the owner's day.
 *
 * Used by the reminder and by the screen's own *nothing until…* line. It reads
 * a minute rather than an instant because that is what a schedule is; turning it
 * into a wall-clock delay is the shell's job and is the only place a clock is
 * allowed.
 */
export function nextCheckInOpensAt(view: MemoryView, moment: CheckInMoment): number | undefined {
  const settings = checkInSettings(view)
  const minute = minutesIntoDay(localDateTimeAt(moment.now, moment.zone).timeOfDay)
  for (const slot of SLOTS_AT_FREQUENCY[settings.frequency]) {
    const opens = CHECK_IN_OPENS_AT[slot]
    if (opens > minute) return opens
  }
  return undefined
}

/**
 * A tapped anchor, as a canonical record.
 *
 * The same shape and the same route as a guide answer — an appended
 * `observation`, resolved by the same fact layer as everything else. D-293's
 * *"stored as ordinary observation records"* is not a simplification for this
 * phase; it is what makes a check-in reading visible to the situation, the fact
 * ledger, the export, the backup and every later phase, without one line of new
 * schema.
 *
 * The only thing that distinguishes it from a guide answer is who wrote it, and
 * that is exactly the distinction D-286 asks for.
 */
export function checkInRecord(
  spec: ReadingSpec,
  anchor: ReadingAnchor,
  moment: CheckInMoment,
  id: RecordId = newRecordId(),
): ObservationRecord {
  const build = createRecordFactory({ zone: moment.zone, provenance: CHECK_IN_PROVENANCE })
  // The concept decides the domain and how discreetly the row is held, exactly
  // as it does for a guide answer — a reading about how he feels is sensitive
  // whether or not whoever wrote the anchor remembered that.
  const definition = coreConcepts.definitionFor(spec.concept)
  return build(
    'observation',
    {
      occurredAt: moment.now,
      ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
      id,
      domains: [definition.domain],
      privacy: definition.privacy,
    },
    { concept: spec.concept, value: anchor.value, method: 'self-report' },
  )
}

/**
 * The owner changing how much he is asked, as a canonical record.
 *
 * `statement` is the words the control was showing when he pressed it, kept
 * beside the choice. A year later `fewest` and `one` mean nothing on their own,
 * and Timeline is meant to be an account of what he did rather than a log of the
 * app's own vocabulary — the same discipline `PermissionRecord.statement`
 * follows, for the same reason.
 */
export function checkInSettingRecord(
  settings: CheckInSettings,
  statement: string,
  moment: CheckInMoment,
  id: RecordId = newRecordId(),
): CheckInSettingRecord {
  const build = createRecordFactory({
    zone: moment.zone,
    provenance: CHECK_IN_SETTINGS_PROVENANCE,
  })
  return build(
    'check-in-setting',
    {
      occurredAt: moment.now,
      ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
      id,
    },
    { depth: settings.depth, frequency: settings.frequency, statement },
  )
}
