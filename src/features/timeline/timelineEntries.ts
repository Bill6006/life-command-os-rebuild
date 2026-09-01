import type { LifeDomainId } from '../../domain/domains'
import type { RecordId } from '../../domain/ids'
import { DISCREET_PRIMARY } from '../../domain/privacy'
import { compareRecordOrder } from '../../domain/records'
import { localDayIdAt, type Instant, type LocalDayId } from '../../domain/time'
import type { Situation } from '../../intelligence/situation'
import { describeRecord } from '../history/describe'
import type { RecordOrigin } from '../history/origin'

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
  /**
   * Where it came from, when the owner did not write it (QA-08-001).
   *
   * Undefined on his own entries. Timeline is the whole record in order and is
   * the surface an imported reading is most likely to be read as native on, so
   * this is not an embellishment — it is the difference between a record of
   * his life and a record of his life with somebody else's readings in it.
   */
  readonly origin: RecordOrigin | undefined
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
  /**
   * Which list it came from — QA-82-007, round 6.
   *
   * Separate from `where` because the two surfaces that render these rows are
   * allowed to say different amounts, and the one that is allowed to say less
   * needs something to say. See the note on `where`.
   */
  readonly kind: 'record' | 'entity' | 'entry'
  /**
   * Where in the file it was, in words: "Record row 6", "Entity row 1".
   *
   * **The owner's own screen only.** It is a coordinate into his file, and a
   * review export does not describe his whole file: with an area left out, the
   * difference between `Record row 19` and `Record row 22` is a count of what
   * was withheld, disclosed by a line that mentions none of it. A row number in
   * a file the reader does not have is not much use to them either.
   *
   * And the coordinate is not even always today's. `snapshotFromWire` carries a
   * malformed row's own `index` through a backup verbatim, so a restored row's
   * position refers to the array of some previous file — which is why
   * renumbering the survivors would produce a number that means nothing rather
   * than a safer one.
   *
   * `tests/unit/architecture-guards.test.ts` fails the build if anything under
   * `src/features/export/` reads this field.
   */
  readonly where: string
  /**
   * What is wrong, in ordinary language.
   *
   * Deliberately not the parser's own words. The first version printed them
   * straight — "missing a non-empty string (records[6].id), and 8 other
   * problems" — which is precisely the developer vocabulary section 36 puts
   * *behind* inspection: "errors should be visible but concise; detailed
   * technical diagnostics belong behind inspection". The QA laboratory already
   * lists every issue with its path, which is where a person who wants that
   * goes.
   */
  readonly problem: string
}

export interface TimelineData {
  readonly days: readonly TimelineDay[]
  /** Entries actually rendered, after the limit. */
  readonly shown: number
  /** Entries the history holds at or before the moment being viewed. */
  readonly total: number
  /**
   * Readable entries the history holds **after** that moment — QA-82-009.
   *
   * `total` stops at the moment being viewed, so a history whose entries are
   * all later than it reports zero — and both surfaces read that zero as
   * *nothing could be read*. Timeline told the owner his file was damaged when
   * five records had parsed perfectly and were simply dated next week, and the
   * export dropped its whole section, including the damaged rows it was meant
   * to be reporting.
   *
   * An empty list has more than one reason. This is the one the other fields
   * could not distinguish: entries exist, they are readable, and none of them
   * has happened yet.
   */
  readonly later: number
  readonly unreadable: readonly UnreadableRow[]
  /** Records that contradict each other about what replaces what. */
  readonly tangled: readonly UnreadableRow[]
}

/**
 * How many entries a first view renders before the owner asks for more.
 *
 * Round 4 gave this function a `TimelineScope`, so the review export could ask
 * for a page of what it was allowed to show rather than filter one after it
 * had been counted — a withheld record was consuming a slot and the document
 * rendered thirty-nine of forty. Round 5 moved the exclusion to the store the
 * document is composed from (D-150), which is one layer further back and
 * covers every section rather than this one, so the parameter had nothing left
 * to do and is gone. The defect it was added for is DEF-0096, and the
 * paired-document regression that catches it does not go through this file.
 */
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

/**
 * Which list a malformed row came from, in words.
 *
 * Records and entities are parsed from two arrays and each row's `index` is
 * relative to its own, so numbering them all "Row N" put a "Row 1" and a
 * "Row 6" in one list with nothing saying they were counted from different
 * places. The issue's own path is the only thing that knows which.
 */
function kindOf(issues: readonly { readonly path?: string }[]): 'record' | 'entity' {
  return (issues[0]?.path ?? '').startsWith('entities') ? 'entity' : 'record'
}

function whereItWas(index: number, kind: 'record' | 'entity'): string {
  return `${kind === 'entity' ? 'Entity' : 'Record'} row ${index + 1}`
}

function problemOf(issues: readonly { readonly problem: string }[]): string {
  if (issues.length <= 1) return 'could not be read'
  return `could not be read — ${issues.length} things wrong with it`
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
    domains: situation.domains,
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

  /*
   * Counted from the same history and described the same way, so "there are
   * entries, they are just later" is a fact rather than an inference — the
   * records that produce no row at all must not become entries that exist.
   */
  const later = situation.view.history.effective.filter(
    (record) => record.occurredAt > situation.at && describeRecord(record, context) !== undefined,
  ).length

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
      origin: described.origin,
    })
    shown += 1
  }

  const unreadable: UnreadableRow[] = situation.view.snapshot.malformed.map((row) => {
    const kind = kindOf(row.issues)
    return { kind, where: whereItWas(row.index, kind), problem: problemOf(row.issues) }
  })

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
  const tangled: UnreadableRow[] = situation.view.history.issues.map((issue) => ({
    kind: 'entry' as const,
    where: 'An entry',
    problem:
      issue.problem === 'supersession-cycle'
        ? 'and another each claim to replace the other, so neither is used'
        : issue.problem === 'dangling-correction'
          ? 'withdraws something that is not in the record'
          : 'replaces something that is not in the record',
  }))

  return { days, shown, total, later, unreadable, tangled }
}

// ---------------------------------------------------------------------------
// What the page says about how much of the record it is showing — F39
// ---------------------------------------------------------------------------

/**
 * The page's own description of itself.
 *
 * It read **"Everything that happened, in the order it happened."** The app
 * does not watch the owner's life. It holds what he told it and what it worked
 * out from that, and a page that opens by claiming to hold everything that
 * happened makes every honest *"not enough yet"* underneath it harder to
 * believe. The review put it exactly: _the distinction between "everything that
 * happened" and "everything recorded here" matters._
 *
 * Here rather than in the component so the words have one home and a test can
 * read them without a browser — the same arrangement `describeRecord` already
 * has for a row.
 */
export const TIMELINE_LEDE = 'Everything recorded here, in the order it happened.'

/**
 * How much of the record is on the page, once the page holds all of it — F39.
 *
 * This said **"That is the whole record — 3 entries"** on a history holding
 * four, one of them dated tomorrow. `total` counts entries at or before the
 * moment being read, so the sentence was asserting a size of the record from a
 * count of part of it — D-153's rule, one surface over from where round 8 found
 * it. `mostly-unknown` has had a record dated the following day since Phase 1
 * and nothing rendered this line against it.
 *
 * **Where nothing is later, the absolute stays.** There it is true, and it is
 * what tells the owner the app is not holding anything back — which is D-153's
 * own condition for when an absolute is allowed to stand.
 */
export function describeExtent(data: TimelineData): string {
  const entries = `${data.total} ${data.total === 1 ? 'entry' : 'entries'}`
  if (data.later === 0) return `That is the whole record — ${entries}.`
  const later =
    data.later === 1 ? '1 entry is dated later' : `${data.later} entries are dated later`
  const them = data.later === 1 ? 'it is' : 'they are'
  return `That is everything up to the moment on screen — ${entries}. ${later}; move forward and ${them} there.`
}
