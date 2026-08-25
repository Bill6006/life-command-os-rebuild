import type { CommitmentRecurrence, CommitmentWindowRecord } from './records'
import { isoWeekdayOfDayId, type IsoWeekday, type LocalDayId } from './time'

/**
 * Reading an obligation out loud, and working out whether it is today
 * (canonical plan section 15, AUD-0004).
 *
 * It lives in `domain/` for the same structural reason `horizon.ts` does: the
 * words and the arithmetic are both about what a `commitment-window` record
 * *means*, and both are needed above and below the intelligence layer — the
 * situation assembles today's obligations, Timeline and the Life panel print
 * them, and `src/features/` may not reach into the engine for a sentence.
 *
 * **One definition of "is this today".** A weekly rhythm and a one-off are
 * answered by the same function, so a Life panel showing the school run and the
 * engine deciding there are twenty minutes before it can never disagree about
 * which days it happens on.
 */

/** Minutes into the owner-local day, as a clock reads it. */
export function dayMinuteLabel(minutes: number): string {
  const whole = Math.max(0, Math.min(1440, Math.round(minutes)))
  const hour = Math.floor(whole / 60) % 24
  const minute = whole % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

const WEEKDAY_WORDS: Record<IsoWeekday, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
}

const WEEKDAYS: readonly IsoWeekday[] = [1, 2, 3, 4, 5]

function sameDays(a: readonly IsoWeekday[], b: readonly IsoWeekday[]): boolean {
  if (a.length !== b.length) return false
  const held = new Set(a)
  return b.every((day) => held.has(day))
}

/**
 * How often this happens, in the words a person uses.
 *
 * "Weekdays" rather than "Monday, Tuesday, Wednesday, Thursday and Friday",
 * because that is what a school term is and printing the long form would make
 * the one obligation the owner is most likely to enter the least readable line
 * on the screen.
 */
export function describeRecurrence(recurrence: CommitmentRecurrence): string {
  if (recurrence.kind === 'one-off') return `on ${recurrence.on}`
  const days = recurrence.days
  if (days.length === 0) return 'never'
  if (days.length === 7) return 'every day'
  if (sameDays(days, WEEKDAYS)) return 'weekdays'
  if (sameDays(days, [6, 7])) return 'weekends'
  const ordered = [...days].sort((a, b) => a - b).map((day) => `${WEEKDAY_WORDS[day]}s`)
  const last = ordered.pop()
  return ordered.length === 0 ? (last ?? '') : `${ordered.join(', ')} and ${last}`
}

/** The whole obligation as one line: what it is, when, and how often. */
export function describeCommitmentWindow(record: CommitmentWindowRecord): string {
  return `${record.label}, ${dayMinuteLabel(record.startsAt)} to ${dayMinuteLabel(
    record.endsAt,
  )}, ${describeRecurrence(record.recurrence)}`
}

/**
 * Whether this obligation falls on a given owner-local day.
 *
 * The day identifier carries its own weekday, so nothing here needs a clock or
 * a timezone — which is what lets the engine answer this while staying
 * clock-free (`docs/ARCHITECTURE_BOUNDARIES.md`).
 */
export function occursOn(recurrence: CommitmentRecurrence, dayId: LocalDayId): boolean {
  if (recurrence.kind === 'one-off') return recurrence.on === dayId
  return recurrence.days.includes(isoWeekdayOfDayId(dayId))
}
