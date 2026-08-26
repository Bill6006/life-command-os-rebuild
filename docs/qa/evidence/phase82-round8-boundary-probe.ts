/** Independent Round 8 evidence. Synthetic input only; never writes a store. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { instant } from '../../../src/domain/time'
import { recordToWire } from '../../../src/domain/wire'
import { composeExport } from '../../../src/features/export/compose'
import { isWithheldRecord } from '../../../src/features/export/scope'
import { DEFAULT_SELECTION, SELECT_ALL } from '../../../src/features/export/sections'
import { assembleTimeline } from '../../../src/features/timeline/timelineEntries'
import { decide } from '../../../src/intelligence/engine'
import { insightsFor } from '../../../src/intelligence/insights'
import { assembleSituation } from '../../../src/intelligence/situation'
import { snapshotFromWire, type SnapshotWire } from '../../../src/memory/snapshot'
import { buildView } from '../../../src/memory/view'
import { scenarioById } from '../../../src/synthetic/scenarios'

const fixture = scenarioById('quiet-fortnight')!
assert.ok(fixture)
const original = fixture.build()
const parsed = snapshotFromWire(original)
assert.ok(parsed.loaded)

const publicRows = parsed.snapshot.records
  .filter((record) => !isWithheldRecord(record))
  .map(recordToWire)
const privateRows = parsed.snapshot.records.filter(isWithheldRecord).map(recordToWire)
assert.ok(publicRows.length >= 2)
assert.ok(privateRows.length > 0)

const first = publicRows[0] as Record<string, unknown>
const second = publicRows[1] as Record<string, unknown>
assert.equal(typeof first.id, 'string')
assert.equal(typeof second.id, 'string')

/** Two readable rows whose replacement claims form a cycle. */
const tangledOnly: SnapshotWire = {
  ...original,
  entities: [],
  records: [
    { ...first, supersedes: second.id },
    { ...second, supersedes: first.id },
  ],
}

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

function render(wire: SnapshotWire, sections = DEFAULT_SELECTION) {
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
      commitShort: 'd3df449',
      commitSha: 'd3df449dcb651250f9362573d7f0ded832258606',
      target: 'preview',
      buildTime: '2026-08-26T18:23:16.434Z',
      phaseNumber: 8,
      phaseTitle: 'Legacy migration',
      phaseSummary: 'Independent synthetic Round 8 evidence',
    },
    composedAt: { at: instant(Date.parse('2026-08-26T19:00:00Z')), zone: fixture.zone },
  }).text
  assert.equal(JSON.stringify(loaded.snapshot), before, 'composition mutated its source snapshot')
  return { text, timeline }
}

function recentRecord(text: string): string {
  const start = text.indexOf('## Recent record')
  assert.notEqual(start, -1)
  const rest = text.slice(start)
  const end = rest.indexOf('\n## ', 1)
  return end === -1 ? rest : rest.slice(0, end)
}

function namedSection(text: string, heading: string): string {
  const start = text.indexOf(`## ${heading}`)
  assert.notEqual(start, -1)
  const rest = text.slice(start)
  const end = rest.indexOf('\n## ', 1)
  return end === -1 ? rest : rest.slice(0, end)
}

check('a replacement cycle reaches an empty display with two retained relationship faults', () => {
  const found = render(tangledOnly)
  assert.equal(found.timeline.total, 0)
  assert.equal(found.timeline.later, 0)
  assert.equal(found.timeline.unreadable.length, 0)
  assert.equal(found.timeline.tangled.length, 2)
  assert.match(found.timeline.tangled[0]!.problem, /replace the other/)
})

check('the ordinary Recent record section reports every retained relationship fault', () => {
  const section = recentRecord(render(tangledOnly).text)
  console.log(`tangled-only Recent record = ${section.replaceAll('\n', ' / ')}`)
  assert.match(section, /replace the other/)
  assert.match(section, /Rows? .*problem|could not be resolved/i)
})

check('Select all does not make Diagnostics substitute for Recent record', () => {
  const section = recentRecord(render(tangledOnly, SELECT_ALL).text)
  assert.match(section, /replace the other/)
})

check('a withheld row cannot perturb the tangled empty section from a third direction', () => {
  const baseline = recentRecord(render(tangledOnly).text)
  const withPrivate = recentRecord(
    render({ ...tangledOnly, records: [...tangledOnly.records, ...privateRows] }).text,
  )
  assert.equal(withPrivate, baseline)
})

check('the later-state owner sentence cannot deny faults rendered immediately below it', () => {
  const source = readFileSync('src/features/timeline/TimelineScreen.tsx', 'utf8')
  assert.doesNotMatch(source, /Nothing has been lost and nothing is\s*\n?\s*unreadable/)
})

check('Coverage cannot call a future reading something that never came in', () => {
  const seed = publicRows.find((row) => (row as Record<string, unknown>).kind === 'observation') as
    Record<string, unknown> | undefined
  assert.ok(seed)
  const futureOnly: SnapshotWire = {
    ...original,
    entities: [],
    records: [
      {
        ...seed,
        id: `FTR${String(9_999).padStart(23, '0')}`,
        occurredAt: '2030-01-01T00:00:00.000Z',
        recordedAt: '2030-01-01T00:00:00.000Z',
      },
    ],
  }
  const text = render(futureOnly).text
  assert.match(recentRecord(text), /1 entry in the record is later than that/)
  const coverage = namedSection(text, 'How well each area is understood')
  assert.doesNotMatch(coverage, /Sleep & Recovery[^\n]*Nothing has ever come in/)
})

check('five thousand readable future entries stay linear enough for an owner surface', () => {
  const seed = publicRows.find((row) => (row as Record<string, unknown>).kind === 'observation') as
    Record<string, unknown> | undefined
  assert.ok(seed)
  const records = Array.from({ length: 5_000 }, (_, index) => ({
    ...seed,
    id: `FTR${String(index).padStart(23, '0')}`,
    occurredAt: '2030-01-01T00:00:00.000Z',
    recordedAt: '2030-01-01T00:00:00.000Z',
  }))
  const started = performance.now()
  const found = render({ ...original, entities: [], records })
  const elapsed = performance.now() - started
  console.log(
    `5,000 future-entry result: total ${found.timeline.total}, later ${found.timeline.later}, ${elapsed.toFixed(1)} ms`,
  )
  assert.equal(found.timeline.total, 0)
  assert.equal(found.timeline.later, 5_000)
  assert.ok(elapsed < 2_000, `composition took ${elapsed.toFixed(1)} ms`)
  console.log(`5,000 future-entry composition milliseconds: ${elapsed.toFixed(1)}`)
})

console.log(JSON.stringify({ passed, failed: failures, count: failures.length }, null, 2))
if (failures.length > 0) process.exitCode = 1
