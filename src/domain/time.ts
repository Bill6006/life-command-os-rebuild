import type { Branded } from './branded'

/**
 * Owner-local time semantics (canonical plan section 15).
 *
 * These are different types, not different names for one number. The plan is
 * explicit that a real instant, an owner-local date, an owner-local time, a
 * local day identifier and a local week identifier must not be treated as
 * interchangeable, and that a week identifier is never an instant.
 *
 * Branding enforces that at compile time. `LocalWeekId` is a string that no
 * arithmetic will accept, and turning one into instants requires
 * `localWeekRange(weekId, zone)` — you cannot get there without naming a
 * timezone, which is precisely the point: the same week identifier begins at
 * different instants in different places.
 *
 * Calendar arithmetic here runs on civil dates (year/month/day triples), never
 * on milliseconds. Adding a day by adding 86,400,000 is the defect that makes a
 * DST week silently 23 or 25 hours long; adding a day to a civil date cannot
 * have that bug.
 */

export type Instant = Branded<number, 'Instant'>
export type TimeZoneId = Branded<string, 'TimeZoneId'>
/** `YYYY-MM-DD` in the owner's timezone. */
export type LocalDayId = Branded<string, 'LocalDayId'>
/** `YYYY-Www`. Not an instant, and not comparable to one. */
export type LocalWeekId = Branded<string, 'LocalWeekId'>
/** `HH:mm` on a 24-hour clock, owner-local. */
export type LocalTimeOfDay = Branded<string, 'LocalTimeOfDay'>

/** ISO-8601 weekday numbering: 1 = Monday … 7 = Sunday. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type WeekStartDay = IsoWeekday

/** The seven, as values, so a reader can check one came off the wire intact. */
export const ISO_WEEKDAYS: readonly IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7]

export function isIsoWeekday(value: unknown): value is IsoWeekday {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 7
}

/** ISO-8601 weeks start on Monday. The owner may prefer otherwise. */
export const DEFAULT_WEEK_START: WeekStartDay = 1

const MS_PER_MINUTE = 60_000
const MS_PER_DAY = 86_400_000

const DAY_ID_PATTERN = /^(-?\d{4,6})-(\d{2})-(\d{2})$/
const WEEK_ID_PATTERN = /^(-?\d{4,6})-W(\d{2})$/
const TIME_OF_DAY_PATTERN = /^(\d{2}):(\d{2})$/

// ---------------------------------------------------------------------------
// Instants
// ---------------------------------------------------------------------------

export function instant(epochMs: number): Instant {
  if (!Number.isFinite(epochMs)) {
    throw new RangeError(`An instant must be a finite epoch millisecond value, got ${epochMs}`)
  }
  return Math.trunc(epochMs) as Instant
}

export function parseInstant(value: unknown): Instant | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? instant(value) : undefined
  if (typeof value !== 'string') return undefined
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? undefined : instant(parsed)
}

/**
 * Instants serialise as ISO-8601 UTC strings rather than numbers.
 *
 * Synthetic fixtures are meant to be read and hand-edited in the QA editor, and
 * `1772668800000` tells a reviewer nothing about whether a scenario is set on
 * the right evening.
 */
export function instantToIso(value: Instant): string {
  return new Date(value).toISOString()
}

export function compareInstants(a: Instant, b: Instant): number {
  return a - b
}

// ---------------------------------------------------------------------------
// Timezones
// ---------------------------------------------------------------------------

export function isValidTimeZone(id: string): boolean {
  if (id === '') return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: id })
    return true
  } catch {
    return false
  }
}

/** Throws on an invalid zone. For literals in code and tests. */
export function timeZone(id: string): TimeZoneId {
  if (!isValidTimeZone(id)) throw new RangeError(`Unknown timezone "${id}"`)
  return id as TimeZoneId
}

/** Returns undefined on an invalid zone. For data arriving from outside. */
export function parseTimeZone(value: unknown): TimeZoneId | undefined {
  if (typeof value !== 'string' || !isValidTimeZone(value)) return undefined
  return value as TimeZoneId
}

export function systemTimeZone(): TimeZoneId {
  const resolved = new Intl.DateTimeFormat().resolvedOptions().timeZone
  return (parseTimeZone(resolved) ?? 'UTC') as TimeZoneId
}

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatterFor(zone: TimeZoneId): Intl.DateTimeFormat {
  const cached = formatters.get(zone)
  if (cached) return cached
  const created = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  formatters.set(zone, created)
  return created
}

// ---------------------------------------------------------------------------
// Civil dates — calendar arithmetic that DST cannot reach
// ---------------------------------------------------------------------------

export interface CivilDate {
  readonly year: number
  /** 1–12. */
  readonly month: number
  /** 1–31. */
  readonly day: number
}

export interface CivilDateTime extends CivilDate {
  readonly hour: number
  readonly minute: number
  readonly second: number
}

/** Days since 1970-01-01. Howard Hinnant's days_from_civil. */
export function daysFromCivil(date: CivilDate): number {
  const y = date.year - (date.month <= 2 ? 1 : 0)
  const era = Math.floor(y / 400)
  const yoe = y - era * 400
  const mp = date.month + (date.month > 2 ? -3 : 9)
  const doy = Math.floor((153 * mp + 2) / 5) + date.day - 1
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy
  return era * 146097 + doe - 719468
}

/** The inverse of `daysFromCivil`. */
export function civilFromDays(days: number): CivilDate {
  const z = days + 719468
  const era = Math.floor(z / 146097)
  const doe = z - era * 146097
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  )
  const y = yoe + era * 400
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100))
  const mp = Math.floor((5 * doy + 2) / 153)
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1
  const month = mp + (mp < 10 ? 3 : -9)
  return { year: y + (month <= 2 ? 1 : 0), month, day }
}

/** 1 = Monday … 7 = Sunday. 1970-01-01 was a Thursday. */
export function isoWeekdayOfDays(days: number): IsoWeekday {
  return ((((days % 7) + 7 + 3) % 7) + 1) as IsoWeekday
}

// ---------------------------------------------------------------------------
// Local day, time of day
// ---------------------------------------------------------------------------

function pad2(value: number): string {
  return String(Math.abs(value)).padStart(2, '0')
}

function padYear(year: number): string {
  const body = String(Math.abs(year)).padStart(4, '0')
  return year < 0 ? `-${body}` : body
}

export function localDayId(date: CivilDate): LocalDayId {
  return `${padYear(date.year)}-${pad2(date.month)}-${pad2(date.day)}` as LocalDayId
}

export function parseLocalDayId(value: unknown): LocalDayId | undefined {
  if (typeof value !== 'string') return undefined
  const match = DAY_ID_PATTERN.exec(value)
  if (!match) return undefined
  const date = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
  if (date.month < 1 || date.month > 12 || date.day < 1 || date.day > 31) return undefined
  // Reject 2026-02-30 and friends by round-tripping through the calendar.
  if (localDayId(civilFromDays(daysFromCivil(date))) !== value) return undefined
  return value as LocalDayId
}

export function civilDateFromDayId(dayId: LocalDayId): CivilDate {
  const match = DAY_ID_PATTERN.exec(dayId)
  if (!match) throw new RangeError(`Malformed local day id "${dayId}"`)
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

export function localTimeOfDay(hour: number, minute: number): LocalTimeOfDay {
  return `${pad2(hour)}:${pad2(minute)}` as LocalTimeOfDay
}

export function parseLocalTimeOfDay(value: unknown): LocalTimeOfDay | undefined {
  if (typeof value !== 'string') return undefined
  const match = TIME_OF_DAY_PATTERN.exec(value)
  if (!match) return undefined
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return undefined
  return value as LocalTimeOfDay
}

/** Minutes since local midnight. Only meaningful alongside a day and a zone. */
export function minutesIntoDay(time: LocalTimeOfDay): number {
  const match = TIME_OF_DAY_PATTERN.exec(time)
  if (!match) throw new RangeError(`Malformed local time of day "${time}"`)
  return Number(match[1]) * 60 + Number(match[2])
}

// ---------------------------------------------------------------------------
// Instant <-> owner-local
// ---------------------------------------------------------------------------

export interface OwnerLocalDateTime extends CivilDateTime {
  readonly zone: TimeZoneId
  readonly dayId: LocalDayId
  readonly timeOfDay: LocalTimeOfDay
  readonly isoWeekday: IsoWeekday
}

function partsAt(at: number, zone: TimeZoneId): CivilDateTime {
  const parts = formatterFor(zone).formatToParts(new Date(at))
  let year = 0
  let month = 1
  let day = 1
  let hour = 0
  let minute = 0
  let second = 0
  let era = 'AD'

  for (const part of parts) {
    switch (part.type) {
      case 'year':
        year = Number(part.value)
        break
      case 'month':
        month = Number(part.value)
        break
      case 'day':
        day = Number(part.value)
        break
      case 'hour':
        // Some ICU builds render midnight as hour 24 under h23; normalise so
        // that a local midnight never reads as the end of the previous day.
        hour = Number(part.value) % 24
        break
      case 'minute':
        minute = Number(part.value)
        break
      case 'second':
        second = Number(part.value)
        break
      case 'era':
        era = part.value
        break
      default:
        break
    }
  }

  if (era.startsWith('B')) year = 1 - year
  return { year, month, day, hour, minute, second }
}

export function localDateTimeAt(at: Instant, zone: TimeZoneId): OwnerLocalDateTime {
  const parts = partsAt(at, zone)
  const dayId = localDayId(parts)
  return {
    ...parts,
    zone,
    dayId,
    timeOfDay: localTimeOfDay(parts.hour, parts.minute),
    isoWeekday: isoWeekdayOfDays(daysFromCivil(parts)),
  }
}

export function localDayIdAt(at: Instant, zone: TimeZoneId): LocalDayId {
  return localDayId(partsAt(at, zone))
}

export function localTimeOfDayAt(at: Instant, zone: TimeZoneId): LocalTimeOfDay {
  const parts = partsAt(at, zone)
  return localTimeOfDay(parts.hour, parts.minute)
}

/** The zone's offset from UTC at a given instant, in milliseconds. */
export function zoneOffsetMsAt(at: Instant, zone: TimeZoneId): number {
  const whole = Math.floor(at / 1000) * 1000
  const parts = partsAt(whole, zone)
  return utcMsFromCivil(parts) - whole
}

function utcMsFromCivil(value: CivilDateTime): number {
  const days = daysFromCivil(value)
  return (
    days * MS_PER_DAY + value.hour * 3_600_000 + value.minute * MS_PER_MINUTE + value.second * 1000
  )
}

/**
 * What happened to a wall-clock time when it was placed on the real timeline.
 *
 * DST makes some local times impossible and others ambiguous. Silently picking
 * one and moving on is how a "Sunday 02:30" observation ends up an hour away
 * from where the owner meant it, so the resolution is reported rather than
 * hidden, and the QA inspector can show it.
 */
export type LocalResolution = 'exact' | 'gap' | 'ambiguous'

export interface ResolvedLocal {
  readonly at: Instant
  readonly resolution: LocalResolution
}

export function resolveLocal(local: CivilDateTime, zone: TimeZoneId): ResolvedLocal {
  const wall = utcMsFromCivil(local)
  const offsetBefore = zoneOffsetMsAt(instant(wall - MS_PER_DAY), zone)
  const offsetAfter = zoneOffsetMsAt(instant(wall + MS_PER_DAY), zone)

  const candidateA = wall - offsetBefore
  const candidateB = wall - offsetAfter
  const validA = utcMsFromCivil(partsAt(candidateA, zone)) === wall
  const validB = utcMsFromCivil(partsAt(candidateB, zone)) === wall

  if (validA && validB) {
    if (candidateA === candidateB) return { at: instant(candidateA), resolution: 'exact' }
    // A repeated hour: take the first occurrence, which is what a person means
    // by "01:30" on the morning the clocks go back.
    return { at: instant(Math.min(candidateA, candidateB)), resolution: 'ambiguous' }
  }
  if (validA) return { at: instant(candidateA), resolution: 'exact' }
  if (validB) return { at: instant(candidateB), resolution: 'exact' }
  // The wall time does not exist. Land just after the gap rather than before
  // it, so a skipped 02:30 becomes 03:30 and not 01:30.
  return { at: instant(Math.max(candidateA, candidateB)), resolution: 'gap' }
}

export function instantAtLocal(local: CivilDateTime, zone: TimeZoneId): Instant {
  return resolveLocal(local, zone).at
}

export function startOfLocalDay(dayId: LocalDayId, zone: TimeZoneId): Instant {
  const date = civilDateFromDayId(dayId)
  return instantAtLocal({ ...date, hour: 0, minute: 0, second: 0 }, zone)
}

/** Exclusive: the first instant of the following local day. */
export function endOfLocalDay(dayId: LocalDayId, zone: TimeZoneId): Instant {
  return startOfLocalDay(addLocalDaysToDayId(dayId, 1), zone)
}

export function addLocalDaysToDayId(dayId: LocalDayId, days: number): LocalDayId {
  return localDayId(civilFromDays(daysFromCivil(civilDateFromDayId(dayId)) + days))
}

/**
 * Move an instant by whole owner-local days, keeping the wall-clock time.
 *
 * Across a DST boundary this is not the same as adding 24 hours, and the
 * difference is the whole point: "same time tomorrow" is a calendar statement.
 */
export function addLocalDays(at: Instant, days: number, zone: TimeZoneId): Instant {
  const local = localDateTimeAt(at, zone)
  const moved = civilFromDays(daysFromCivil(local) + days)
  return instantAtLocal(
    { ...moved, hour: local.hour, minute: local.minute, second: local.second },
    zone,
  )
}

/**
 * Which day of the week an owner-local day is, from the identifier alone.
 *
 * No clock and no timezone: a day id already fixes a calendar date, and the
 * weekday of a calendar date is arithmetic. That is what lets `occursOn` answer
 * "is the school run today" inside the engine, which may not read a clock
 * (`docs/ARCHITECTURE_BOUNDARIES.md`).
 */
export function isoWeekdayOfDayId(dayId: LocalDayId): IsoWeekday {
  return isoWeekdayOfDays(daysFromCivil(civilDateFromDayId(dayId)))
}

export function localDaysBetween(a: LocalDayId, b: LocalDayId): number {
  return daysFromCivil(civilDateFromDayId(b)) - daysFromCivil(civilDateFromDayId(a))
}

// ---------------------------------------------------------------------------
// Parts of the day
// ---------------------------------------------------------------------------

/**
 * Which part of the owner's day an instant falls in.
 *
 * This lives with the other owner-local time semantics rather than in the
 * engine, because two layers now need the same answer to mean the same thing: a
 * decision is made in a block, and the record of that decision remembers which
 * block it was made in so a later one can ask whether tonight is like it. Two
 * definitions of "evening" would make that comparison quietly wrong.
 *
 * The boundaries are decision boundaries, not vocabulary. The evening begins at
 * 18:00 for every purpose the engine has — which moves are eligible, which suit
 * the hour, what protects tomorrow — and what the last hour before it is
 * *called* is a separate question, answered where the words are written.
 */
export const DAY_BLOCKS = [
  'early-morning',
  'morning',
  'afternoon',
  'evening',
  'late-night',
] as const

export type DayBlock = (typeof DAY_BLOCKS)[number]

export function isDayBlock(value: unknown): value is DayBlock {
  return typeof value === 'string' && (DAY_BLOCKS as readonly string[]).includes(value)
}

export function blockOfLocalTime(time: LocalTimeOfDay): DayBlock {
  const minutes = minutesIntoDay(time)
  if (minutes < 4 * 60) return 'late-night'
  if (minutes < 7 * 60) return 'early-morning'
  if (minutes < 12 * 60) return 'morning'
  if (minutes < 18 * 60) return 'afternoon'
  if (minutes < 22 * 60) return 'evening'
  return 'late-night'
}

export function blockOf(at: Instant, zone: TimeZoneId): DayBlock {
  return blockOfLocalTime(localDateTimeAt(at, zone).timeOfDay)
}

// ---------------------------------------------------------------------------
// Local weeks
// ---------------------------------------------------------------------------

function weekStartDays(days: number, weekStartsOn: WeekStartDay): number {
  const weekday = isoWeekdayOfDays(days)
  return days - ((weekday - weekStartsOn + 7) % 7)
}

/**
 * The day that decides which year a week belongs to.
 *
 * ISO-8601 uses the Thursday of a Monday-start week — the week's midpoint. The
 * same midpoint rule generalises to any week start, and reduces exactly to
 * ISO-8601 when the week starts on Monday.
 */
function weekAnchorDays(days: number, weekStartsOn: WeekStartDay): number {
  return weekStartDays(days, weekStartsOn) + 3
}

function firstAnchorOfYear(year: number, weekStartsOn: WeekStartDay): number {
  const jan1 = daysFromCivil({ year, month: 1, day: 1 })
  const anchor = weekAnchorDays(jan1, weekStartsOn)
  return anchor >= jan1 ? anchor : anchor + 7
}

export function localWeekIdFromDayId(
  dayId: LocalDayId,
  weekStartsOn: WeekStartDay = DEFAULT_WEEK_START,
): LocalWeekId {
  const days = daysFromCivil(civilDateFromDayId(dayId))
  const anchor = weekAnchorDays(days, weekStartsOn)
  const year = civilFromDays(anchor).year
  const week = (anchor - firstAnchorOfYear(year, weekStartsOn)) / 7 + 1
  return `${padYear(year)}-W${pad2(week)}` as LocalWeekId
}

export function localWeekIdAt(
  at: Instant,
  zone: TimeZoneId,
  weekStartsOn: WeekStartDay = DEFAULT_WEEK_START,
): LocalWeekId {
  return localWeekIdFromDayId(localDayIdAt(at, zone), weekStartsOn)
}

export function parseLocalWeekId(value: unknown): LocalWeekId | undefined {
  if (typeof value !== 'string') return undefined
  const match = WEEK_ID_PATTERN.exec(value)
  if (!match) return undefined
  const week = Number(match[2])
  if (week < 1 || week > 53) return undefined
  return value as LocalWeekId
}

export function weekStartDayId(
  weekId: LocalWeekId,
  weekStartsOn: WeekStartDay = DEFAULT_WEEK_START,
): LocalDayId {
  const match = WEEK_ID_PATTERN.exec(weekId)
  if (!match) throw new RangeError(`Malformed local week id "${weekId}"`)
  const year = Number(match[1])
  const week = Number(match[2])
  const anchor = firstAnchorOfYear(year, weekStartsOn) + (week - 1) * 7
  return localDayId(civilFromDays(anchor - 3))
}

/**
 * A week identifier becomes instants only once a timezone is named.
 *
 * The same `2026-W11` starts at a different moment in Denver than in Auckland,
 * which is exactly why a week identifier cannot be an instant.
 */
export function localWeekRange(
  weekId: LocalWeekId,
  zone: TimeZoneId,
  weekStartsOn: WeekStartDay = DEFAULT_WEEK_START,
): { readonly start: Instant; readonly end: Instant } {
  const startDay = weekStartDayId(weekId, weekStartsOn)
  return {
    start: startOfLocalDay(startDay, zone),
    end: startOfLocalDay(addLocalDaysToDayId(startDay, 7), zone),
  }
}

export function isSameLocalWeek(
  a: Instant,
  b: Instant,
  zone: TimeZoneId,
  weekStartsOn: WeekStartDay = DEFAULT_WEEK_START,
): boolean {
  return localWeekIdAt(a, zone, weekStartsOn) === localWeekIdAt(b, zone, weekStartsOn)
}

// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------

/**
 * Nothing below the UI reads the wall clock directly.
 *
 * Every "now" arrives through a clock so the QA lab can travel in time and so
 * a test can pin an instant. `tests/unit/architecture-guards.test.ts` fails the
 * build if `Date.now()` reappears inside the meaning or memory layers.
 */
export interface Clock {
  now(): Instant
  zone(): TimeZoneId
  weekStartsOn(): WeekStartDay
}

export function systemClock(
  zone: TimeZoneId = systemTimeZone(),
  weekStartsOn: WeekStartDay = DEFAULT_WEEK_START,
): Clock {
  return {
    now: () => instant(Date.now()),
    zone: () => zone,
    weekStartsOn: () => weekStartsOn,
  }
}

export function fixedClock(
  at: Instant,
  zone: TimeZoneId,
  weekStartsOn: WeekStartDay = DEFAULT_WEEK_START,
): Clock {
  return {
    now: () => at,
    zone: () => zone,
    weekStartsOn: () => weekStartsOn,
  }
}
