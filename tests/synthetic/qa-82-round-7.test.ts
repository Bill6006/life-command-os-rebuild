import { describe, expect, it } from 'vitest'
import { coreDomains } from '../../src/domain/domains'
import { recordToWire } from '../../src/domain/wire'
import { composeExport } from '../../src/features/export/compose'
import { isWithheldRecord } from '../../src/features/export/scope'
import { assembleTimeline, type TimelineData } from '../../src/features/timeline/timelineEntries'
import {
  DEFAULT_SELECTION,
  SELECT_ALL,
  type ExportSectionId,
} from '../../src/features/export/sections'
import { decide } from '../../src/intelligence/engine'
import { insightsFor } from '../../src/intelligence/insights'
import { assembleSituation } from '../../src/intelligence/situation'
import { snapshotFromWire, type SnapshotWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { scenarioById } from '../../src/synthetic/scenarios'
import { COMPOSED_AT, COMPOSED_ZONE, TEST_APP } from './exportHarness'

/**
 * Phase 82, round 7 — an empty list has more than one reason.
 *
 * Rounds 4 to 6 made the review export tell the truth about what it was allowed
 * to describe. Round 7 found the place where it stopped describing anything at
 * all: `historySection` returned `NOTHING_HERE` the moment it had no rows to
 * render, **before** the block that reports rows the app could not read. So a
 * history with damage in it and nothing displayable said only *"Nothing in the
 * record for this"* — the opposite of true. Diagnostics still counted the
 * damaged rows, and Diagnostics is off by default, so the ordinary document
 * mentioned the fault nowhere.
 *
 * The same zero reached the owner's own screen from the other side. `total`
 * counts entries at or before the moment being viewed, so a history whose
 * entries are all *later* reports zero — and Timeline read that as *nothing
 * could be read* and told him his file was the problem. Five records had parsed
 * perfectly and were dated next week.
 *
 * ## Four empty states, and why they may not be one
 *
 * | The store | What is true |
 * | --- | --- |
 * | nothing in it | there is no history yet |
 * | only rows that could not be read | there is history and the app cannot read it |
 * | readable rows, all later than the moment | there is history and none of it has happened yet |
 * | readable rows, all withheld from this document | there is history and this document may not show it |
 *
 * The last two of those are the ones that were being called the second, and the
 * fourth is the one that must read **identically** to the second in the export:
 * the document has already promised that the excluded area is excluded down to
 * whether anything is recorded in it, and a sentence that told those two apart
 * would take that promise back. That is asserted below rather than assumed.
 */

const NEWLINE = String.fromCharCode(10)

function fixture(id: string) {
  const found = scenarioById(id)
  if (found === undefined) throw new Error(`no scenario "${id}"`)
  return found
}

function parse(wire: SnapshotWire) {
  const loaded = snapshotFromWire(wire)
  expect(loaded.loaded, 'the constructed document should load').toBe(true)
  if (!loaded.loaded) throw new Error('unreachable')
  return loaded.snapshot
}

const base = fixture('quiet-fortnight')
const original = base.build()
const MOMENT = { now: base.now, zone: base.zone, weekStartsOn: 1 as const }

/** Rows nobody can place in an area, so they are reported either way. */
const BROKEN_RECORD = { id: 'broken-public-record', value: 42 }
const BROKEN_ENTITY = { label: 'Unknown damaged subject' }

const publicRows = parse(original)
  .records.filter((record) => !isWithheldRecord(record))
  .map(recordToWire)

function view(wire: SnapshotWire) {
  return buildView(parse(wire), MOMENT)
}

function timelineOf(wire: SnapshotWire): TimelineData {
  return assembleTimeline(assembleSituation(view(wire), { ...MOMENT, domains: coreDomains }))
}

function composeText(
  wire: SnapshotWire,
  sections: readonly ExportSectionId[] = SELECT_ALL,
): string {
  const context = { ...MOMENT, domains: coreDomains }
  const built = view(wire)
  const situation = assembleSituation(built, context)
  return composeExport({
    sections,
    situation,
    decision: decide(built, context),
    insights: insightsFor(situation),
    timeline: assembleTimeline(situation),
    source: 'laboratory',
    app: TEST_APP,
    composedAt: { at: COMPOSED_AT, zone: COMPOSED_ZONE },
  }).text
}

/** The section body, so an assertion cannot be satisfied by another section. */
function recentRecord(text: string): string {
  const start = text.indexOf('## Recent record')
  if (start === -1) return ''
  const rest = text.slice(start)
  const end = rest.indexOf(`${NEWLINE}## `, 1)
  return end === -1 ? rest : rest.slice(0, end)
}

// The four stores, each reaching an empty display for a different reason.
const DAMAGED_ONLY: SnapshotWire = {
  ...original,
  records: [BROKEN_RECORD],
  entities: [BROKEN_ENTITY],
}
const ALL_WITHHELD: SnapshotWire = {
  ...original,
  records: [...parse(original).records.filter(isWithheldRecord).map(recordToWire), BROKEN_RECORD],
  entities: [BROKEN_ENTITY],
}
const ONLY_LATER: SnapshotWire = {
  ...original,
  records: [
    ...publicRows.map((row) => ({
      ...(row as Record<string, unknown>),
      occurredAt: '2030-01-01T00:00:00Z',
      recordedAt: '2030-01-01T00:00:00Z',
    })),
    BROKEN_RECORD,
  ],
  entities: [BROKEN_ENTITY],
}
const NOTHING_AT_ALL: SnapshotWire = { ...original, records: [], entities: [] }

describe('QA-82-009 — a section with no rows still reports what could not be read', () => {
  const EMPTY_DISPLAYS = [
    ['a store whose only rows are damaged', DAMAGED_ONLY],
    ['a store whose readable rows are all withheld', ALL_WITHHELD],
    ['a store whose readable rows are all later than the moment', ONLY_LATER],
  ] as const

  for (const [what, wire] of EMPTY_DISPLAYS) {
    for (const [how, sections] of [
      ['Select all', SELECT_ALL],
      ['the default selection', DEFAULT_SELECTION],
      ['a deliberate private opt-in', [...SELECT_ALL, 'private'] as const],
    ] as const) {
      it(`describes both faults on ${what}, with ${how}`, () => {
        const section = recentRecord(composeText(wire, sections))
        expect(section, 'the section rendered no rows at all').not.toBe('')
        expect(section).toContain('- A record — could not be read')
        expect(section).toContain('- An entity — could not be read')
        // And still says why the position in the file is absent, which is the
        // half D-151 added and which the early return also took down.
        expect(section).toContain('Where each one sits in the file is on the owner’s own screen')
      })
    }
  }

  it('is not satisfied by Diagnostics counting them, which is off by default', () => {
    /*
     * The finding's sharpest edge. Diagnostics reported `2 unreadable rows`
     * throughout, and it is not in the default selection — so the document the
     * owner produces without changing anything mentioned the damage nowhere.
     */
    expect(DEFAULT_SELECTION).not.toContain('diagnostics')
    const text = composeText(DAMAGED_ONLY, DEFAULT_SELECTION)
    expect(text).not.toContain('unreadable row')
    expect(recentRecord(text)).toContain('- A record — could not be read')
  })

  it('states that there is nothing to show, and claims nothing about why', () => {
    /*
     * Both halves were found by reintroduction rather than by reading.
     *
     * Emptying the sentence entirely broke nothing: every other assertion here
     * is about the fault list below it, so the section could open on a blank
     * line and still pass. And **adding** a reason broke nothing either —
     * making the private-off sentence say "some were left out of this
     * document" leaves the withheld and damaged-only histories still identical
     * to each other, because it is said in both. A paired comparison cannot see
     * a disclosure made on both sides of the pair.
     *
     * So the state has to be stated, and stated without a reason: the document
     * has already promised that the excluded area is excluded down to whether
     * anything is recorded in it.
     */
    /*
     * `ONLY_LATER` is excluded because it has its own sentence, and
     * `ALL_WITHHELD` with the private section deliberately on is excluded
     * because it is not an empty display at all — the entry comes back, which
     * is asserted as a control below.
     */
    const EMPTY_STATES = [
      ['a store whose only rows are damaged', DAMAGED_ONLY, 'Select all', SELECT_ALL],
      ['a store whose only rows are damaged', DAMAGED_ONLY, 'the default', DEFAULT_SELECTION],
      [
        'a store whose only rows are damaged',
        DAMAGED_ONLY,
        'a private opt-in',
        [...SELECT_ALL, 'private'] as const,
      ],
      ['a store whose readable rows are all withheld', ALL_WITHHELD, 'Select all', SELECT_ALL],
      [
        'a store whose readable rows are all withheld',
        ALL_WITHHELD,
        'the default',
        DEFAULT_SELECTION,
      ],
    ] as const

    for (const [what, wire, how, sections] of EMPTY_STATES) {
      {
        const section = recentRecord(composeText(wire, sections))
        const body = section
          .split(NEWLINE)
          .slice(1)
          .filter((line) => line.trim() !== '')
        expect(body[0], `${what}, ${how}: the section opens on a blank`).toBeTruthy()
        expect(body[0], `${what}, ${how}`).toMatch(/no entries to show/i)
        expect(section, `${what}, ${how}: it said why`).not.toMatch(
          /left out of this document|withheld|kept back/i,
        )
      }
    }

    // The control: turning the private section on is not an empty display,
    // because the entry that was withheld is exactly what comes back.
    const openedUp = recentRecord(composeText(ALL_WITHHELD, [...SELECT_ALL, 'private']))
    expect(openedUp).toMatch(/The most recent 1 entry, newest first/)
    expect(openedUp).toContain('- A record — could not be read')
  })

  it('says nothing at all when there is nothing at all', () => {
    // The half an over-broad fix would break: an empty store is empty, and a
    // section that warned about damage there would be inventing a fault.
    const section = recentRecord(composeText(NOTHING_AT_ALL))
    expect(section).toContain('_Nothing in the record for this._')
    expect(section).not.toContain('could not be read')
  })

  it('reads identically whether the readable rows were withheld or never existed', () => {
    /*
     * The privacy half, asserted rather than assumed. `ALL_WITHHELD` holds a
     * readable private record; `DAMAGED_ONLY` holds none. With the private
     * section off, a reader must not be able to tell those two apart from this
     * section — the document has already said the exclusion covers whether
     * anything is recorded there, and a sentence that distinguished them would
     * take that back.
     */
    expect(parse(ALL_WITHHELD).records.some(isWithheldRecord)).toBe(true)
    expect(parse(DAMAGED_ONLY).records.some(isWithheldRecord)).toBe(false)
    expect(recentRecord(composeText(ALL_WITHHELD))).toBe(recentRecord(composeText(DAMAGED_ONLY)))
  })

  it('says that later history is later rather than that nothing could be read', () => {
    const section = recentRecord(composeText(ONLY_LATER))
    expect(section).toContain('happened at or before the moment it describes')
    expect(section).toMatch(/\d+ entr(y|ies) in the record (is|are) later than that/)
    // And it is not confused with the damaged-only case, which says no such
    // thing about entries that exist.
    expect(recentRecord(composeText(DAMAGED_ONLY))).not.toContain('later than that')
  })

  it('still renders the ordinary history when there is one', () => {
    // The negative control, and the state every earlier guard was written in.
    const section = recentRecord(
      composeText({ ...original, records: [...publicRows, BROKEN_RECORD] }),
    )
    expect(section).toMatch(/The most recent \d+ entries, newest first/)
    expect(section).toContain('- A record — could not be read')
  })
})

describe('QA-82-009 — the owner’s own screen tells the four apart', () => {
  it('counts the entries that exist but have not happened yet', () => {
    const data = timelineOf(ONLY_LATER)
    expect(data.total, 'nothing at or before the moment').toBe(0)
    expect(data.later, 'and a history that is simply ahead of it').toBeGreaterThan(0)
    expect(data.unreadable.length).toBeGreaterThan(0)
  })

  it('does not count a damaged row as an entry that exists', () => {
    const data = timelineOf(DAMAGED_ONLY)
    expect(data.total).toBe(0)
    expect(data.later, 'a row that could not be read is not an entry waiting to happen').toBe(0)
  })

  it('counts nothing on an empty store', () => {
    const data = timelineOf(NOTHING_AT_ALL)
    expect(data.total).toBe(0)
    expect(data.later).toBe(0)
    expect(data.unreadable).toEqual([])
  })

  it('keeps the coordinate on the fault list in every one of them', () => {
    /*
     * D-151's other half, checked here because this round moves the code that
     * builds these rows. The owner has the file; he must still be told which
     * row to go and look at, whatever state the list above it is in.
     */
    for (const wire of [DAMAGED_ONLY, ALL_WITHHELD, ONLY_LATER]) {
      const data = timelineOf(wire)
      expect(data.unreadable.length).toBeGreaterThan(0)
      for (const row of data.unreadable) {
        expect(row.where).toMatch(/^(Record|Entity) row \d+$/)
      }
    }
  })

  it('still shows the ordinary history when the moment has some', () => {
    const data = timelineOf({ ...original, records: [...publicRows, BROKEN_RECORD] })
    expect(data.total).toBeGreaterThan(0)
    expect(data.days.length).toBeGreaterThan(0)
  })
})
