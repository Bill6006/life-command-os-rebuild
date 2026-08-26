/**
 * Independent Round 6 evidence; synthetic inputs only, no product/store writes.
 * Run: npx vite-node docs/qa/evidence/phase82-round6-privacy-probe.ts
 * Exit 1 means a paired-document acceptance failure, not a harness failure.
 */
import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { CONCEPT } from '../../../src/domain/concepts'
import { DOMAIN } from '../../../src/domain/domains'
import type { CanonicalRecord } from '../../../src/domain/records'
import { instant } from '../../../src/domain/time'
import { entityToWire, recordToWire } from '../../../src/domain/wire'
import { composeExport } from '../../../src/features/export/compose'
import { SELECT_ALL } from '../../../src/features/export/sections'
import { assembleTimeline } from '../../../src/features/timeline/timelineEntries'
import { decide } from '../../../src/intelligence/engine'
import { insightsFor } from '../../../src/intelligence/insights'
import { assembleSituation } from '../../../src/intelligence/situation'
import { snapshotFromWire, type SnapshotWire } from '../../../src/memory/snapshot'
import { buildView } from '../../../src/memory/view'
import { createKit } from '../../../src/synthetic/kit'
import { scenarioById } from '../../../src/synthetic/scenarios'

const failures: string[] = []
function fixture(id: string) {
  const found = scenarioById(id)
  assert.ok(found, id)
  return found
}
function render(wire: SnapshotWire, id: string, privateOn = false) {
  const scenario = fixture(id)
  const parsed = snapshotFromWire(wire)
  assert.ok(parsed.loaded)
  const before = JSON.stringify(parsed.snapshot)
  const moment = { now: scenario.now, zone: scenario.zone, weekStartsOn: 1 as const }
  const view = buildView(parsed.snapshot, moment)
  const situation = assembleSituation(view, moment)
  const decision = decide(view, moment)
  const started = performance.now()
  const text = composeExport({
    sections: privateOn ? [...SELECT_ALL, 'private'] : SELECT_ALL,
    situation,
    decision,
    insights: insightsFor(situation),
    timeline: assembleTimeline(situation),
    source: 'laboratory',
    app: {
      commitShort: 'c583a91',
      commitSha: 'c583a91af126bd9a6e8c273d0fd978372b22c50c',
      target: 'preview',
      buildTime: '2026-08-26T12:48:53.753Z',
      phaseNumber: 8,
      phaseTitle: 'Legacy migration',
      phaseSummary: 'Independent synthetic Round 6 evidence',
    },
    composedAt: { at: instant(Date.parse('2026-08-26T13:00:00Z')), zone: scenario.zone },
  }).text
  const elapsed = performance.now() - started
  assert.equal(JSON.stringify(parsed.snapshot), before, 'composition must not mutate source')
  return { text, situation, decision, snapshot: parsed.snapshot, elapsed }
}
function paired(name: string, withPrivate: SnapshotWire, withoutPrivate: SnapshotWire, id: string) {
  const a = render(withPrivate, id)
  const b = render(withoutPrivate, id)
  if (a.text !== b.text) {
    failures.push(name)
    console.log(`FAIL: ${name}`)
    console.log(
      JSON.stringify(
        {
          onlyWithPrivate: a.text.split('\n').filter((line) => !b.text.split('\n').includes(line)),
          onlyWithoutPrivate: b.text
            .split('\n')
            .filter((line) => !a.text.split('\n').includes(line)),
        },
        null,
        2,
      ),
    )
  } else console.log(`PASS: ${name}`)
  return { a, b }
}
function markAndRemove(id: string, select: (record: CanonicalRecord) => boolean) {
  const wire = fixture(id).build()
  const parsed = snapshotFromWire(wire)
  assert.equal(parsed.snapshot.malformed.length, 0)
  const records = parsed.snapshot.records
  assert.ok(records.some(select), `${id}: the selected evidence must exist`)
  return {
    withPrivate: {
      ...wire,
      records: records.map((record) =>
        recordToWire(select(record) ? { ...record, privacy: 'private' } : record),
      ),
    },
    withoutPrivate: {
      ...wire,
      records: records.filter((record) => !select(record)).map(recordToWire),
    },
  }
}

const noAction = markAndRemove('settled-evening', (record) => record.kind === 'outcome')
const noActionPair = paired(
  'private outcomes behind no-action',
  noAction.withPrivate,
  noAction.withoutPrivate,
  'settled-evening',
)
assert.ok(noActionPair.a.decision.noAction, 'must really exercise no-action')
assert.notDeepEqual(
  noActionPair.a.decision.trace.ranking,
  noActionPair.b.decision.trace.ranking,
  'private outcomes must affect ranking',
)
console.log(
  `No-action reach: ${noActionPair.a.decision.kind} / ${noActionPair.b.decision.kind}; ranking differs`,
)

const hold = markAndRemove(
  'before-the-house-is-up',
  (record) => record.kind === 'context' && record.concept === CONCEPT.childPresent,
)
const holdPair = paired(
  'private care context behind deferral',
  hold.withPrivate,
  hold.withoutPrivate,
  'before-the-house-is-up',
)
assert.equal(holdPair.a.decision.kind, 'hold')
assert.notDeepEqual(
  holdPair.a.decision.explanation,
  holdPair.b.decision.explanation,
  'private care evidence must change the deferral',
)
console.log(
  `Deferral reach: ${holdPair.a.decision.explanation?.rendered.sentence} / ${holdPair.b.decision.explanation?.rendered.sentence}`,
)

const thread = markAndRemove('study-thread', (record) => record.kind === 'thread')
const threadPair = paired(
  'private running thread',
  thread.withPrivate,
  thread.withoutPrivate,
  'study-thread',
)
assert.equal(threadPair.a.situation.threads.filter((item) => item.live).length, 1)
assert.equal(threadPair.b.situation.threads.length, 0)
const parsedThread = snapshotFromWire(thread.withPrivate).snapshot.records.find(
  (record) => record.kind === 'thread',
)
assert.ok(parsedThread?.kind === 'thread')
const threadKit = createKit('QA6T', fixture('study-thread').zone, '2026-01-01T00:00:00Z')
const stopped = threadKit.record(
  'thread',
  {
    occurredAt: instant(fixture('study-thread').now - 1000),
    domains: parsedThread.domains,
    privacy: 'private',
    supersedes: parsedThread.id,
  },
  {
    thread: parsedThread.thread,
    subject: parsedThread.subject,
    intent: parsedThread.intent,
    steps: parsedThread.steps,
    moves: parsedThread.moves,
    state: 'abandoned',
    expiresOn: parsedThread.expiresOn,
  },
)
const stoppedWire = {
  ...thread.withPrivate,
  records: [...thread.withPrivate.records, recordToWire(stopped)],
}
const stoppedPair = paired(
  'private stopped thread and its supersession',
  stoppedWire,
  thread.withoutPrivate,
  'study-thread',
)
assert.equal(stoppedPair.a.situation.threads.filter((item) => item.live).length, 0)

const obligation = markAndRemove('school-morning', (record) => record.kind === 'commitment-window')
const obligationPair = paired(
  'private recurring school obligation',
  obligation.withPrivate,
  obligation.withoutPrivate,
  'school-morning',
)
assert.equal(obligationPair.a.situation.commitments.length, 1)
assert.equal(obligationPair.b.situation.commitments.length, 0)
assert.notDeepEqual(obligationPair.a.situation.inHand, obligationPair.b.situation.inHand)
assert.match(render(obligation.withPrivate, 'school-morning', true).text, /Adaya’s school day/)

const growth = markAndRemove(
  'growth-evidence',
  (record) => record.kind === 'outcome' && record.aspect === 'result',
)
const growthPair = paired(
  'private growth results',
  growth.withPrivate,
  growth.withoutPrivate,
  'growth-evidence',
)
assert.equal(growthPair.a.decision.growth.length, 1)
assert.equal(growthPair.b.decision.growth.length, 0)

const base = fixture('quiet-fortnight').build()
const parsed = snapshotFromWire(base).snapshot
const donor = parsed.records.find((record) => record.privacy === 'private')
assert.ok(donor)
const publicWire: SnapshotWire = {
  ...base,
  records: parsed.records.filter((record) => record.privacy !== 'private').map(recordToWire),
}
const brokenRecord = { value: 42 }
const unknownRecord: SnapshotWire = {
  ...publicWire,
  records: [...publicWire.records, brokenRecord],
}
assert.match(render(unknownRecord, 'quiet-fortnight').text, /1 unreadable row/)
for (const [name, privateRows] of [
  ['one valid private record', [recordToWire(donor)]],
  [
    'three private records',
    [
      recordToWire(donor),
      recordToWire({
        ...donor,
        id: threadKit.record(
          'observation',
          { occurredAt: donor.occurredAt, domains: [DOMAIN.privateHealth] },
          {
            concept: CONCEPT.privatePattern,
            method: 'self-report',
            value: { type: 'text', value: 'synthetic private two' },
          },
        ).id,
      }),
      recordToWire({
        ...donor,
        id: threadKit.record(
          'observation',
          { occurredAt: donor.occurredAt, domains: [DOMAIN.privateHealth] },
          {
            concept: CONCEPT.privatePattern,
            method: 'self-report',
            value: { type: 'text', value: 'synthetic private three' },
          },
        ).id,
      }),
    ],
  ],
  ['one unreadable private record', [{ privacy: 'private', value: 42 }]],
] as const) {
  paired(
    `${name} before an unclassified unreadable record`,
    { ...publicWire, records: [...privateRows, ...publicWire.records, brokenRecord] },
    unknownRecord,
    'quiet-fortnight',
  )
}
paired(
  'private record after an unclassified unreadable record (negative control)',
  { ...unknownRecord, records: [...unknownRecord.records, recordToWire(donor)] },
  unknownRecord,
  'quiet-fortnight',
)

const privateEntity = threadKit.entity({
  kind: 'goal',
  label: 'Synthetic private subject',
  domain: DOMAIN.privateHealth,
  privacy: 'private',
})
const brokenEntity = { label: 'Unknown damaged subject' }
const unknownEntity: SnapshotWire = {
  ...publicWire,
  entities: [...publicWire.entities, brokenEntity],
}
for (const [name, row] of [
  ['valid private entity', entityToWire(privateEntity)],
  [
    'unreadable private entity',
    { domain: DOMAIN.privateHealth, label: 'Synthetic private damaged subject' },
  ],
] as const) {
  paired(
    `${name} before an unclassified unreadable entity`,
    { ...publicWire, entities: [row, ...publicWire.entities, brokenEntity] },
    unknownEntity,
    'quiet-fortnight',
  )
}

const opted = render(base, 'quiet-fortnight', true)
assert.match(opted.text, /late scrolling again/)
assert.match(opted.text, /Store: 19 records/)
assert.match(render(base, 'quiet-fortnight').text, /Store: 18 records/)
assert.match(
  render(publicWire, 'quiet-fortnight').text,
  /Everything below is worked out from the part of the record/,
)
assert.match(
  render(publicWire, 'quiet-fortnight').text,
  /nothing below is worked out from it either/i,
)
console.log(
  'PASS: opt-in restores detail/counts; no-private disclosure is unconditional; every composition preserves its source snapshot',
)

// Bounded synthetic scale check, not a claim about any real owner's history.
const largeKit = createKit('QA6L', fixture('quiet-fortnight').zone, '2026-01-01T00:00:00Z')
const largeRecords = Array.from({ length: 2000 }, (_, index) =>
  largeKit.record(
    'observation',
    {
      occurredAt: instant(fixture('quiet-fortnight').now - (index + 1) * 3600000),
      domains: [DOMAIN.sleep],
      privacy: index % 10 === 0 ? 'private' : 'normal',
    },
    {
      concept: CONCEPT.sleepHours,
      method: 'self-report',
      value: { type: 'number', value: 7, unit: 'hours' },
    },
  ),
)
const large = { ...publicWire, records: largeRecords.map(recordToWire) }
const times = Array.from({ length: 3 }, () => render(large, 'quiet-fortnight').elapsed)
console.log(
  `Synthetic 2000-row composition milliseconds (includes insights/timeline arguments): ${times.map((value) => value.toFixed(1)).join(', ')}`,
)
console.log(JSON.stringify({ failed: failures, count: failures.length }, null, 2))
if (failures.length > 0) process.exitCode = 1
