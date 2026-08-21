import type { LifeDomainId } from '../../domain/domains'
import type { RecordId } from '../../domain/ids'
import { DISCREET_PRIMARY } from '../../domain/privacy'
import { compareRecordOrder } from '../../domain/records'
import { localDayIdAt, type Instant, type LocalDayId } from '../../domain/time'
import type { Situation } from '../../intelligence/situation'
import { describeRecord } from '../history/describe'

/**
 * Timeline — the chronological truth surface (canonical plan section 26).
 *
 * A plain feature-local module, the same shape `domainPages.ts` is: it decides
 * nothing and computes nothing the engine has not already computed. It reads
 * `situation.view.history.effective` in order and turns each row into a line.
 *
 * Section 26 states four rules and every one of them is a defect this file has
 * to be arranged against rather than merely careful about:
 *
 * 1. **Timeline should remain readable.** A lifetime of records is not a
 *    screen. Days are the unit, newest first, and the page grows on request
 *    rather than rendering everything the store holds.
 * 2. **Private detail respects the private-display policy.** `DISCREET_PRIMARY`
 *    is fixed here and there is no control that changes it: Timeline is a
 *    primary surface, and section 11 keeps explicit private detail off those.
 *    The row still appears — withholding detail is not the same as dropping
 *    history.
 * 3. **Malformed records must not crash Timeline, and unreadable rows are
 *    isolated and reported.** They arrive as `snapshot.malformed`, never having
 *    been parsed at all, and they are reported in their own place with their
 *    own words.
 * 4. **Timeline never creates a phantom actionable item from corrupt data.**
 *    Nothing on this surface is actionable. There is no button, no correction
 *    control and no lifecycle action anywhere on it — which is a stronger
 *    guarantee than checking that corrupt rows do not produce one, because
 *    there is nothing for a corrupt row to produce.
 */

export interface TimelineEntry {
  readonly id: RecordId
  readonly at: Instant
  readonly dayId: LocalDayId
  /** A short owner-facing word for the kind of entry. */
  readonly tag: string
  readonly text: string
  readonly domain: LifeDomainId | undefined
  /** True when the detail was withheld and a placeholder stands in for it. */
  readonly withheld: boolean
  /** True when this row replaced an earlier one that is still in the record. */
  readonly replacedSomething: boolean
}

export interface TimelineDay {
  readonly dayId: LocalDayId
  /** "Today", "Yesterday", or a date the owner would recognise. */
  readonly label: string
  readonly entries: readonly TimelineEntry[]
}

/**
 * A row that could not be read, kept rather than dropped.
 *
 * Deliberately not a `TimelineEntry`: it has no date, no domain and no meaning,
 * and giving it the shape of a real entry is how it would end up sorted in
 * beside real history as though the app understood it.
 */
export interface UnreadableRow {
  /** Position in the file it arrived in, so a person can find it. */
  readonly index: number
  readonly id: string | undefined
  readonly problem: string
}

export interface TimelineData {
  readonly days: readonly TimelineDay[]
  /** Entries actually rendered, after the limit. */
  readonly shown: number
  /** Entries the history holds at or before the moment being viewed. */
  readonly total: number
  readonly unreadable: readonly UnreadableRow[]
  /** Records that contradict each other about what replaces what. */
  readonly tangled: readonly UnreadableRow[]
}

/** How many entries a first view renders before the owner asks for more. */
export const TIMELINE_PAGE = 40

function labelForDay(dayId: LocalDayId, today: LocalDayId, yesterday: LocalDayId): string {
  if (dayId === today) return 'Today'
  if (dayId === yesterday) return 'Yesterday'
  const [year, month, day] = dayId.split('-')
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  const name = months[Number(month) - 1]
  if (name === undefined || day === undefined) return dayId
  return `${Number(day)} ${name} ${year}`
}

function problemOf(
  issues: readonly { readonly problem: string; readonly path?: string }[],
): string {
  const first = issues[0]
  if (first === undefined) return 'could not be read'
  const rest = issues.length - 1
  const where = first.path === undefined || first.path === '' ? '' : ` (${first.path})`
  return rest === 0
    ? `${first.problem}${where}`
    : `${first.problem}${where}, and ${rest} other problem${rest === 1 ? '' : 's'}`
}

/**
 * The whole life, in order, as far back as asked for.
 *
 * `before` is the owner-local yesterday and `limit` is how many entries to
 * render — both arguments rather than state, so the surface stays a function of
 * the situation and the same history at the same moment always reads the same.
 */
export function assembleTimeline(situation: Situation, limit = TIMELINE_PAGE): TimelineData {
  const context = {
    entities: situation.entities,
    history: situation.view.history,
    concepts: situation.concepts,
    // Fixed, and there is no control anywhere that changes it. Section 11.
    policy: DISCREET_PRIMARY,
  }

  /*
   * The canonical order, reversed — not a sort of my own.
   *
   * `compareRecordOrder` is when it happened, then when it was written down,
   * then the id (sections 13.1 and 15). Sorting on `occurredAt` alone left the
   * rest to an arbitrary tiebreak, and it showed: every event in one session
   * shares an `occurredAt`, so a day read "Done" above "Suggested" on some
   * dates and the other way round on others, from the same fixture. Reversing
   * the canonical order puts the thing written last at the top, consistently,
   * which is what a reverse-chronological list means.
   */
  const ordered = situation.view.history.effective
    .filter((record) => record.occurredAt <= situation.at)
    .slice()
    .sort((a, b) => -compareRecordOrder(a, b))

  const today = localDayIdAt(situation.at, situation.zone)
  const yesterdayAt = (situation.at - 86_400_000) as Instant
  const yesterday = localDayIdAt(yesterdayAt, situation.zone)

  const days: TimelineDay[] = []
  let current: { dayId: LocalDayId; entries: TimelineEntry[] } | undefined
  let shown = 0
  let total = 0

  for (const record of ordered) {
    const described = describeRecord(record, context)
    // A record whose subject no longer resolves produces no sentence, and
    // therefore no row. D-018 — there is no fallback wording, because a
    // fallback is how "it" reaches a screen.
    if (described === undefined) continue
    total += 1
    if (shown >= limit) continue

    const dayId = localDayIdAt(record.occurredAt, situation.zone)
    if (current === undefined || current.dayId !== dayId) {
      current = { dayId, entries: [] }
      days.push({ dayId, label: labelForDay(dayId, today, yesterday), entries: current.entries })
    }

    current.entries.push({
      id: record.id,
      at: record.occurredAt,
      dayId,
      tag: described.tag,
      text: described.text,
      domain: record.domains[0],
      withheld: described.withheld,
      replacedSomething: record.supersedes !== undefined,
    })
    shown += 1
  }

  const unreadable: UnreadableRow[] = situation.view.snapshot.malformed.map((row) => ({
    index: row.index,
    id: row.id,
    problem: problemOf(row.issues),
  }))

  /*
   * Records that disagree about what replaces what.
   *
   * A dangling `supersedes`, a correction pointing at nothing, or a cycle. The
   * rows themselves are readable; what is broken is the relationship between
   * them, and `resolveHistory` already holds every record in a cycle back from
   * reasoning rather than picking one. Reported beside the unreadable rows
   * because the owner's question is the same — *is anything in here not being
   * understood?* — and the honest answer names both kinds.
   */
  const tangled: UnreadableRow[] = situation.view.history.issues.map((issue, index) => ({
    index,
    id: issue.record,
    problem:
      issue.problem === 'supersession-cycle'
        ? `two entries each claim to replace the other (${issue.target})`
        : issue.problem === 'dangling-correction'
          ? `withdraws an entry that is not here (${issue.target})`
          : `replaces an entry that is not here (${issue.target})`,
  }))

  return { days, shown, total, unreadable, tangled }
}
