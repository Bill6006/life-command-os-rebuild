import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { coreDomains, DOMAIN } from '../../src/domain/domains'
import { instant } from '../../src/domain/time'
import { entityToWire, recordToWire } from '../../src/domain/wire'
import { composeExport } from '../../src/features/export/compose'
import { isWithheldRecord } from '../../src/features/export/scope'
import { SELECT_ALL, type ExportSectionId } from '../../src/features/export/sections'
import { assembleTimeline } from '../../src/features/timeline/timelineEntries'
import { decide } from '../../src/intelligence/engine'
import { insightsFor } from '../../src/intelligence/insights'
import { assembleSituation } from '../../src/intelligence/situation'
import { snapshotFromWire, type SnapshotWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { createKit } from '../../src/synthetic/kit'
import { scenarioById } from '../../src/synthetic/scenarios'
import { COMPOSED_AT, COMPOSED_ZONE, TEST_APP } from './exportHarness'

/**
 * Phase 82, round 6 — what a retained row brings with it.
 *
 * Round 5 moved the boundary to the store the document is composed from, and
 * that held: every count, conclusion and sentence became a fact about the
 * record the owner chose to share. What it could not reach is metadata a
 * **retained** row carries. A malformed row keeps its own `index`, and the
 * export printed it as `Record row 19`. Put one private record ahead of that
 * broken row and the same line reads `Record row 20`; put three and it reads
 * `Record row 22`. The text names nothing private, and the number is a count
 * of what was withheld.
 *
 * ## Why the survivors are not renumbered
 *
 * Because the number is not always today's. `snapshotFromWire` carries a
 * malformed row's `index` through a backup verbatim — a restored row's position
 * refers to the array of whatever file it came out of — so subtracting today's
 * removals from it would produce a number that means nothing rather than a
 * safer one. That is asserted below rather than argued, because it is the whole
 * reason the repair is a boundary and not an arithmetic fix.
 *
 * So the coordinate stays on the owner's own Timeline, where the file is, and
 * the export names the row by what it is. Same data, different promise,
 * different answer — D-098's own shape, one field further in.
 *
 * ## What these assert
 *
 * A **sweep**, not the two positions the finding happened to use: a private
 * thing is inserted at every index of the record array and of the entity array,
 * with an unreadable public row present, and the private-off document must be
 * identical every time. Position-independence is the property; before-and-after
 * are two of its cases.
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

function composeText(
  wire: SnapshotWire,
  scenarioId = 'quiet-fortnight',
  sections: readonly ExportSectionId[] = SELECT_ALL,
): string {
  const scenario = fixture(scenarioId)
  const moment = {
    now: scenario.now,
    zone: scenario.zone,
    weekStartsOn: 1 as const,
    domains: coreDomains,
  }
  const view = buildView(parse(wire), moment)
  const situation = assembleSituation(view, moment)
  return composeExport({
    sections,
    situation,
    decision: decide(view, moment),
    insights: insightsFor(situation),
    timeline: assembleTimeline(situation),
    source: 'laboratory',
    app: TEST_APP,
    composedAt: { at: COMPOSED_AT, zone: COMPOSED_ZONE },
  }).text
}

function difference(left: string, right: string): readonly string[] {
  const a = left.split(NEWLINE)
  const b = right.split(NEWLINE)
  return [
    ...a.filter((line) => !b.includes(line)).map((line) => `only with: ${line}`),
    ...b.filter((line) => !a.includes(line)).map((line) => `only without: ${line}`),
  ]
}

const base = fixture('quiet-fortnight')
const kit = createKit('qa82r6', base.zone, '2026-01-01T00:00:00Z')
const at = instant(base.now - 60_000)
const original = base.build()

/** The fixture with its one private record taken out, so the test owns what is private. */
const publicRows = parse(original)
  .records.filter((record) => !isWithheldRecord(record))
  .map(recordToWire)

/** A broken row nobody can place in an area, which is the one that is kept. */
const BROKEN_RECORD = { id: 'broken-public', value: 42 }
const BROKEN_ENTITY = { label: 'Unknown damaged subject' }

const privateRecord = () =>
  recordToWire(
    kit.record(
      'observation',
      { occurredAt: at, domains: [DOMAIN.privateHealth], privacy: 'private' },
      {
        concept: CONCEPT.privatePattern,
        method: 'self-report',
        value: { type: 'text', value: 'something' },
      },
    ),
  )

const privateEntity = () =>
  entityToWire(
    kit.entity({
      kind: 'goal',
      label: 'Private appointment follow-up',
      domain: DOMAIN.privateHealth,
      privacy: 'private',
    }),
  )

describe('QA-82-007 — a withheld row leaves no coordinate behind it', () => {
  const withoutPrivate: SnapshotWire = {
    ...original,
    records: [...publicRows, BROKEN_RECORD],
  }
  const bare = composeText(withoutPrivate)

  it('keeps the unreadable row, and says what it is', () => {
    // The half an over-broad fix would break: the storage fault is still
    // reported, and it is still described.
    expect(bare).toContain('Rows that could not be read, kept rather than dropped')
    expect(bare).toContain('- A record — could not be read')
    expect(bare).toContain('1 unreadable row')
  })

  it('says why it does not say where the row was', () => {
    // D-091: an abstention is written down rather than left out. A reader who
    // is not told simply sees a list with a coordinate missing.
    expect(bare).toContain('Where each one sits in the file is on the owner’s own screen')
  })

  it('is unchanged wherever a private record is inserted among the public ones', () => {
    /*
     * The sweep. The finding used one position and then three; this walks every
     * index of the array, so "before" and "after" the broken row are two of the
     * cases rather than the whole test.
     */
    const offenders: string[] = []
    const all = [...publicRows, BROKEN_RECORD]
    for (let at_ = 0; at_ <= all.length; at_ += 1) {
      const records = [...all.slice(0, at_), privateRecord(), ...all.slice(at_)]
      const found = difference(composeText({ ...original, records }), bare)
      for (const line of found) offenders.push(`inserted at ${at_}: ${line}`)
    }
    expect(offenders, 'where a withheld record sat is readable from the document').toEqual([])
  })

  it('is unchanged wherever a private entity is inserted among the public ones', () => {
    const withEntityFault: SnapshotWire = {
      ...original,
      records: publicRows,
      entities: [...original.entities, BROKEN_ENTITY],
    }
    const plain = composeText(withEntityFault)
    const offenders: string[] = []
    const all = [...original.entities, BROKEN_ENTITY]
    for (let at_ = 0; at_ <= all.length; at_ += 1) {
      const entities = [...all.slice(0, at_), privateEntity(), ...all.slice(at_)]
      const found = difference(composeText({ ...withEntityFault, entities }), plain)
      for (const line of found) offenders.push(`inserted at ${at_}: ${line}`)
    }
    expect(offenders, 'where a withheld subject sat is readable from the document').toEqual([])
  })

  it('is unchanged when the thing inserted is itself an unreadable private row', () => {
    /*
     * The variant that reaches the same channel by a different route: the
     * withheld row is one nobody could parse, so it is dropped by its own
     * claim, and the survivor after it must not shift.
     */
    const all = [...publicRows, BROKEN_RECORD]
    for (let at_ = 0; at_ <= all.length; at_ += 1) {
      const records = [
        ...all.slice(0, at_),
        { id: 'broken-private', privacy: 'private' },
        ...all.slice(at_),
      ]
      expect(
        difference(composeText({ ...original, records }), bare),
        `an unreadable withheld row at ${at_} moved the one after it`,
      ).toEqual([])
    }
  })

  it('is unchanged for a malformed row whose position came out of a backup', () => {
    /*
     * And the case that decides the repair rather than merely testing it.
     *
     * `snapshotFromWire` carries a malformed row's own `index` through a
     * backup, so a restored row's position is the array position of whatever
     * file it came from — 900 here, and nothing in this store has 900 rows.
     * Renumbering the survivors by today's removals would turn a meaningless
     * number into a different meaningless number.
     */
    const carried = { index: 900, issues: [{ path: 'records[900]', problem: 'unreadable' }] }
    const withCarried: SnapshotWire = {
      ...original,
      records: publicRows,
      malformed: [carried],
    }
    const snapshot = parse(withCarried)
    expect(
      snapshot.malformed.map((row) => row.index),
      'the carried position should survive the parser exactly',
    ).toEqual([900])

    const plain = composeText(withCarried)
    expect(plain).toContain('- A record — could not be read')
    expect(plain, 'a position out of another file reached the document').not.toContain('row 901')

    const withPrivateFirst: SnapshotWire = {
      ...withCarried,
      records: [privateRecord(), ...publicRows],
    }
    expect(difference(composeText(withPrivateFirst), plain)).toEqual([])
  })

  it('leaves the coordinate on the owner’s own screen, where the file is', () => {
    /*
     * The other half, and the one QA told the builder not to break: Timeline is
     * his own record on his own device, and a row he cannot find is no use to
     * him. The export withholds rows; his screen does not.
     */
    const scenario = fixture('quiet-fortnight')
    const moment = { now: scenario.now, zone: scenario.zone, weekStartsOn: 1 as const }
    const view = buildView(parse({ ...original, records: [...publicRows, BROKEN_RECORD] }), moment)
    const timeline = assembleTimeline(assembleSituation(view, moment))
    expect(timeline.unreadable).toHaveLength(1)
    expect(timeline.unreadable[0]!.where).toMatch(/^Record row \d+$/)
    expect(timeline.unreadable[0]!.kind).toBe('record')
  })

  it('still tells the two lists apart', () => {
    // A record and a subject are different things to have failed to read, and
    // dropping the position must not drop that.
    const both: SnapshotWire = {
      ...original,
      records: [...publicRows, BROKEN_RECORD],
      entities: [...original.entities, BROKEN_ENTITY],
    }
    const text = composeText(both)
    expect(text).toContain('- A record — could not be read')
    expect(text).toContain('- An entity — could not be read')
    expect(text).toContain('2 unreadable rows')
  })

  it('gives the whole file back when the owner asks for the private area', () => {
    const records = [privateRecord(), ...publicRows, BROKEN_RECORD]
    const on = composeText({ ...original, records }, 'quiet-fortnight', [...SELECT_ALL, 'private'])
    expect(on).toContain('## Private / Sexual Health')
    expect(on).toContain('- A record — could not be read')
    // The opt-in document describes the whole file, and still does not number
    // into it — one rule, both ways round, so there is nothing to get wrong.
    expect(on).not.toMatch(/- Record row \d+ —/)
  })
})
