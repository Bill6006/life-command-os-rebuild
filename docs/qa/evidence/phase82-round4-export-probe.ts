/**
 * Independent, read-only Phase 82 Round 4 evidence.
 * Run: npx vite-node docs/qa/evidence/phase82-round4-export-probe.ts
 * Exit 1 means an export acceptance assertion failed; no data is written.
 */
import assert from 'node:assert/strict'
import { CONCEPT } from '../../../src/domain/concepts'
import { newRecordId } from '../../../src/domain/ids'
import { instant } from '../../../src/domain/time'
import { recordToWire } from '../../../src/domain/wire'
import { composeExport, type ExportApp } from '../../../src/features/export/compose'
import { SELECT_ALL, type ExportSectionId } from '../../../src/features/export/sections'
import { assembleTimeline } from '../../../src/features/timeline/timelineEntries'
import { decide } from '../../../src/intelligence/engine'
import { insightsFor } from '../../../src/intelligence/insights'
import { assembleSituation } from '../../../src/intelligence/situation'
import { snapshotFromWire } from '../../../src/memory/snapshot'
import type { StoreSnapshot } from '../../../src/memory/store'
import { buildView } from '../../../src/memory/view'
import { SCENARIOS } from '../../../src/synthetic/scenarios'

const app: ExportApp = {
  commitShort: 'da31c6d',
  commitSha: 'da31c6dd80c3f40dd5ae51541b7a05a9018bfad3',
  target: 'preview',
  buildTime: '2026-08-25T20:50:40.023Z',
  phaseNumber: 8,
  phaseTitle: 'Legacy migration',
  phaseSummary: 'Independent synthetic QA export probe',
}

function context(id: string, hours = 0) {
  const scenario = SCENARIOS.find((candidate) => candidate.id === id)
  assert.ok(scenario, id)
  const loaded = snapshotFromWire(scenario.build())
  assert.equal(loaded.loaded, true)
  return {
    snapshot: loaded.snapshot,
    moment: {
      now: instant(scenario.now + hours * 3_600_000),
      zone: scenario.zone,
      weekStartsOn: scenario.weekStartsOn ?? (1 as const),
    },
  }
}

function compose(
  snapshot: StoreSnapshot,
  moment: ReturnType<typeof context>['moment'],
  sections: readonly ExportSectionId[] = SELECT_ALL,
) {
  const view = buildView(snapshot, moment)
  const situation = assembleSituation(view, moment)
  return {
    view,
    situation,
    export: composeExport({
      sections,
      situation,
      decision: decide(view, moment),
      insights: insightsFor(situation),
      timeline: assembleTimeline(situation),
      source: 'laboratory',
      app,
      composedAt: { at: instant(Date.parse('2026-08-25T23:00:00Z')), zone: moment.zone },
    }),
  }
}

const privateUnknownLeaks: string[] = []
const reasonLosses: string[] = []
for (const scenario of SCENARIOS) {
  const { snapshot, moment } = context(scenario.id)
  const result = compose(snapshot, moment)
  for (const definition of result.situation.concepts.all()) {
    if (definition.derived) {
      assert.equal(result.view.facts.get(definition.id), undefined)
      assert.equal(
        result.situation.coverage.domains.some((domain) =>
          domain.concepts.some((row) => row.concept === definition.id),
        ),
        false,
      )
    } else {
      assert.ok(result.view.facts.get(definition.id), `${scenario.id}: missing ordinary concept`)
    }
  }
  for (const entry of result.view.facts.inState('unknown')) {
    const falseLine = `- ${entry.definition.label} — never answered`
    if (entry.definition.privacy === 'private' && result.export.text.includes(falseLine)) {
      privateUnknownLeaks.push(`${scenario.id}: ${falseLine}`)
    }
    if (
      entry.knowledge.state === 'unknown' &&
      entry.knowledge.reason !== 'never-observed' &&
      result.export.text.includes(falseLine)
    ) {
      reasonLosses.push(`${scenario.id}: ${entry.definition.label}: ${entry.knowledge.reason}`)
    }
  }
}
console.log(
  `PASS: raw derived exclusion, ordinary concept completeness and coverage: ${SCENARIOS.length} scenarios`,
)

const school = context('school-morning', 2)
const schoolResult = compose(school.snapshot, school.moment)
assert.match(
  schoolResult.export.text,
  /Child here right now — No — Adaya’s school day is on until 15:00/,
)
assert.doesNotMatch(schoolResult.export.text, /Child here right now — never answered/)
console.log('PASS: school 10:20 derived reading retained without the Round 3 contradiction')
console.log('School unknown count:', schoolResult.view.facts.inState('unknown').length)

const thin = context('mostly-unknown')
const thinResult = compose(thin.snapshot, thin.moment)
assert.equal(
  thinResult.situation.considered.some((fact) => fact.concept === CONCEPT.childHere),
  false,
)
assert.ok(thinResult.view.facts.questions.some((entry) => entry.concept === CONCEPT.childPresent))
console.log('PASS: no-child history has no derived row and care-arrangement remains askable')

// Exercise the sibling reasons through real record resolution, not an injected
// FactState. A reason is evidence; none of these histories was never answered.
const soreness = thin.snapshot.records.find(
  (record) => record.kind === 'observation' && record.concept === CONCEPT.soreness,
)
assert.ok(soreness && soreness.kind === 'observation')
const conflicting: StoreSnapshot = {
  ...thin.snapshot,
  records: [
    soreness,
    {
      ...soreness,
      id: newRecordId((count) => new Uint8Array(count).fill(1)),
      value: { type: 'scale', value: 2, of: 5 },
    },
  ],
}
const lapsed: StoreSnapshot = {
  ...thin.snapshot,
  records: [
    {
      ...soreness,
      kind: 'context',
      durability: 'situational',
      validFrom: soreness.occurredAt,
      validUntil: instant(thin.moment.now - 60_000),
    },
  ],
}
const thinScenario = SCENARIOS.find((scenario) => scenario.id === 'mostly-unknown')!
const malformed = snapshotFromWire({
  ...thinScenario.build(),
  records: [{ ...recordToWire(soreness), value: { type: 'not-a-value' } }],
})
assert.equal(malformed.loaded, true)
assert.equal(malformed.snapshot.malformed.length, 1)
for (const [reason, snapshot] of [
  ['contradicted', conflicting],
  ['lapsed', lapsed],
  ['malformed', malformed.snapshot],
] as const) {
  const result = compose(snapshot, thin.moment)
  const knowledge = result.view.facts.knowledgeFor(CONCEPT.soreness)
  assert.equal(knowledge.state, 'unknown')
  assert.ok(knowledge.state === 'unknown' && knowledge.reason === reason)
  if (result.export.text.includes('- Soreness or pain — never answered')) {
    reasonLosses.push(`constructed ${reason}: Soreness or pain: ${reason}`)
  }
}

const ordinary = context('quiet-fortnight')
const withPrivate = compose(ordinary.snapshot, ordinary.moment)
const removed = ordinary.snapshot.records.filter((record) => record.privacy === 'private')
assert.equal(removed.length, 1, 'paired histories must differ by exactly one private record')
const withoutPrivate = compose(
  {
    ...ordinary.snapshot,
    records: ordinary.snapshot.records.filter((record) => record.privacy !== 'private'),
  },
  ordinary.moment,
)
const left = withPrivate.export.text.split('\n')
const right = withoutPrivate.export.text.split('\n')
console.log('Private-OFF paired histories; only the private record differs:')
console.log(
  JSON.stringify(
    {
      onlyWithPrivateRecord: left.filter((line) => !right.includes(line)),
      onlyWithoutPrivateRecord: right.filter((line) => !left.includes(line)),
    },
    null,
    2,
  ),
)

const enabled = compose(ordinary.snapshot, ordinary.moment, [...SELECT_ALL, 'private'])
assert.match(enabled.export.text, /late scrolling again/)
assert.doesNotMatch(withPrivate.export.text, /late scrolling again/)
console.log('PASS: private detail still appears only with explicit opt-in')
console.log('Private unknown-state leaks:', JSON.stringify(privateUnknownLeaks, null, 2))
console.log('Unknown reasons relabelled never answered:', JSON.stringify(reasonLosses, null, 2))

const failures = [
  [
    'QA-82-007: private exclusion covers diagnostic labels and metadata',
    privateUnknownLeaks.length === 0 && withPrivate.export.text === withoutPrivate.export.text,
  ],
  ['QA-82-008: unknown reasons are not rewritten as never answered', reasonLosses.length === 0],
] as const
for (const [name, passed] of failures) console.log(`${passed ? 'PASS' : 'FAIL'}: ${name}`)
if (failures.some(([, passed]) => !passed)) process.exitCode = 1
