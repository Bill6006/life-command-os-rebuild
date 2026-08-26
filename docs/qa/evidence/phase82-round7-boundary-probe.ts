/** Independent Round 7 evidence. Synthetic input only; never writes a store. */
import assert from 'node:assert/strict'
import { instant } from '../../../src/domain/time'
import { recordToWire } from '../../../src/domain/wire'
import { composeExport } from '../../../src/features/export/compose'
import { isWithheldRecord } from '../../../src/features/export/scope'
import {
  DEFAULT_SELECTION,
  SELECT_ALL,
  type ExportSectionId,
} from '../../../src/features/export/sections'
import { assembleTimeline } from '../../../src/features/timeline/timelineEntries'
import { decide } from '../../../src/intelligence/engine'
import { insightsFor } from '../../../src/intelligence/insights'
import { assembleSituation } from '../../../src/intelligence/situation'
import { snapshotFromWire, snapshotToWire, type SnapshotWire } from '../../../src/memory/snapshot'
import { buildView } from '../../../src/memory/view'
import { scenarioById } from '../../../src/synthetic/scenarios'

const fixture = scenarioById('quiet-fortnight')!
assert.ok(fixture)
const original = fixture.build()
const parsed = snapshotFromWire(original)
assert.ok(parsed.loaded)
const publicRecords = parsed.snapshot.records
  .filter((record) => !isWithheldRecord(record))
  .map(recordToWire)
const privateRecords = parsed.snapshot.records.filter(isWithheldRecord).map(recordToWire)
assert.ok(privateRecords.length > 0)
const failures: string[] = []
let passed = 0

function check(name: string, operation: () => void) {
  try {
    operation()
    passed += 1
    console.log(`PASS: ${name}`)
  } catch (error) {
    failures.push(name)
    console.log(
      `FAIL: ${name}: ${(error instanceof Error ? error.message : String(error)).split('\n')[0]}`,
    )
  }
}

function render(wire: SnapshotWire, sections: readonly ExportSectionId[] = SELECT_ALL) {
  const loaded = snapshotFromWire(wire)
  assert.ok(loaded.loaded)
  const before = JSON.stringify(loaded.snapshot)
  const moment = { now: fixture.now, zone: fixture.zone, weekStartsOn: 1 as const }
  const view = buildView(loaded.snapshot, moment)
  const situation = assembleSituation(view, moment)
  const timeline = assembleTimeline(situation)
  const text = composeExport({
    sections,
    situation,
    decision: decide(view, moment),
    insights: insightsFor(situation),
    timeline,
    source: 'laboratory',
    app: {
      commitShort: '4403a3f',
      commitSha: '4403a3f9d9106d1c09a439e9c4d7b23292b3ea1e',
      target: 'preview',
      buildTime: '2026-08-26T15:59:14.360Z',
      phaseNumber: 8,
      phaseTitle: 'Legacy migration',
      phaseSummary: 'Independent synthetic Round 7 evidence',
    },
    composedAt: { at: instant(Date.parse('2026-08-26T17:00:00Z')), zone: fixture.zone },
  }).text
  assert.equal(JSON.stringify(loaded.snapshot), before, 'composition mutated the source')
  return { text, timeline, snapshot: loaded.snapshot }
}

const damagedRecord = { id: 'readable-id-not-exported', value: 42 }
const damagedEntity = { label: 'Unclassified broken entity' }
const publicWire: SnapshotWire = {
  ...original,
  records: [...publicRecords, damagedRecord, null, { id: 'another-damaged-record' }],
  entities: [...original.entities, damagedEntity, null],
  malformed: [],
}
const baseline = render(publicWire)
check('five public faults retain count and distinguish record/entity', () => {
  assert.match(baseline.text, /5 unreadable rows/)
  assert.equal((baseline.text.match(/^- A record — could not be read/gm) ?? []).length, 3)
  assert.equal((baseline.text.match(/^- An entity — could not be read/gm) ?? []).length, 2)
})

for (const insertion of ['before', 'interleaved', 'after'] as const) {
  check(
    `100 private record faults and 75 private entity faults ${insertion}: exact whole-document equality`,
    () => {
      const privateBrokenRecords = Array.from({ length: 100 }, (_, i) => ({
        id: `private-broken-${i}`,
        ...(i % 2 ? { privacy: 'private' } : { domains: ['private-health'] }),
      }))
      const privateBrokenEntities = Array.from({ length: 75 }, (_, i) => ({
        id: `private-entity-${i}`,
        domain: 'private-health',
      }))
      const mix = (rows: readonly unknown[], withheld: readonly unknown[]) =>
        insertion === 'before'
          ? [...withheld, ...rows]
          : insertion === 'after'
            ? [...rows, ...withheld]
            : [
                ...rows.slice(0, 1),
                ...withheld.slice(0, 40),
                ...rows.slice(1, 3),
                ...withheld.slice(40),
                ...rows.slice(3),
              ]
      const found = render({
        ...publicWire,
        records: mix(publicWire.records, [...privateRecords, ...privateBrokenRecords]),
        entities: mix(publicWire.entities, privateBrokenEntities),
      })
      assert.equal(found.text, baseline.text)
      assert.equal(
        found.snapshot.malformed.length,
        180,
        'the raw source really holds the private faults',
      )
    },
  )
}

check(
  'record input permutation leaves timeline days, ranking and the complete document unchanged',
  () => {
    const reordered = render({
      ...publicWire,
      records: [...publicRecords].reverse().concat(publicWire.records.slice(publicRecords.length)),
    })
    assert.equal(reordered.text, baseline.text)
  },
)

check(
  'carried readable ids, path indices and historical positions never enter either export',
  () => {
    const make = (position: number, id: string): SnapshotWire => ({
      ...original,
      records: publicRecords,
      malformed: [
        {
          id,
          index: position,
          raw: { value: 42 },
          issues: [{ path: `records[${position}].value`, problem: 'sentinel-validation-problem' }],
        },
        {
          id: `${id}-entity`,
          index: position + 9,
          raw: { label: 'broken' },
          issues: [{ path: `entities[${position + 9}].kind`, problem: 'sentinel-entity-problem' }],
        },
      ],
    })
    const a = make(900, 'SENTINEL-ROW-ID-A')
    const b = make(1900, 'SENTINEL-ROW-ID-B')
    for (const sections of [SELECT_ALL, [...SELECT_ALL, 'private'] as const]) {
      assert.equal(render(a, sections).text, render(b, sections).text)
      assert.doesNotMatch(
        render(a, sections).text,
        /SENTINEL|sentinel-|records\[|entities\[|(?:Record|Entity) row \d+/,
      )
    }
    const beforeBackup = render(a)
    const afterBackup = render(snapshotToWire(beforeBackup.snapshot, fixture.now))
    assert.equal(afterBackup.text, beforeBackup.text)
    assert.equal(afterBackup.timeline.unreadable[0]?.where, 'Record row 901')
    assert.equal(afterBackup.timeline.unreadable[1]?.where, 'Entity row 910')
  },
)

const brokenOnly: SnapshotWire = {
  ...original,
  records: [damagedRecord],
  entities: [damagedEntity],
  malformed: [],
}
for (const [name, wire] of [
  ['damaged-only store', brokenOnly],
  ['all readable entries withheld', { ...brokenOnly, records: [...privateRecords, damagedRecord] }],
  [
    'readable entries only in the future',
    {
      ...brokenOnly,
      records: [
        ...publicRecords.map((row) => ({
          ...row,
          occurredAt: '2030-01-01T00:00:00Z',
          recordedAt: '2030-01-01T00:00:00Z',
        })),
        damagedRecord,
      ],
    },
  ],
] as const) {
  const all = render(wire)
  check(`${name}: fault count remains true in selected Diagnostics`, () => {
    assert.match(all.text, /2 unreadable rows/)
    assert.equal(all.snapshot.malformed.length, 2)
  })
  for (const [selectionName, sections] of [
    ['Select all', SELECT_ALL],
    ['default selection', DEFAULT_SELECTION],
  ] as const) {
    check(`${name}, ${selectionName}: retained faults must still be described`, () => {
      const found = render(wire, sections)
      assert.match(found.text, /- A record — could not be read/)
      assert.match(found.text, /- An entity — could not be read/)
      assert.match(found.text, /Where each one sits in the file is on the owner’s own screen/)
    })
  }
  console.log(
    `${name}: Recent record = ${all.text.split('## Recent record\n')[1]?.split('\n## ')[0]?.trim()}`,
  )
}
check('damaged-only store, private explicitly on: faults must still be described', () => {
  assert.match(
    render(brokenOnly, [...SELECT_ALL, 'private']).text,
    /- A record — could not be read/,
  )
})
check('adding one readable public entry exposes the same two faults (negative control)', () => {
  const found = render({ ...brokenOnly, records: [publicRecords[0], damagedRecord] })
  assert.match(found.text, /- A record — could not be read/)
  assert.match(found.text, /- An entity — could not be read/)
})
console.log(JSON.stringify({ passed, failed: failures, count: failures.length }, null, 2))
if (failures.length > 0) process.exitCode = 1
