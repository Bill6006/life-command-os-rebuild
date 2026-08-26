/**
 * Independent Round 5 evidence. Synthetic only; no stores or product files written.
 * Run: npx vite-node docs/qa/evidence/phase82-round5-privacy-probe.ts
 * Paired documents must be byte-identical while private is off. Exit 1 reports
 * a privacy acceptance failure, not a harness error. The Round 4 probe is unchanged.
 */
import assert from 'node:assert/strict'
import { CONCEPT } from '../../../src/domain/concepts'
import { DOMAIN } from '../../../src/domain/domains'
import { instant } from '../../../src/domain/time'
import { entityToWire, recordToWire } from '../../../src/domain/wire'
import { dueWindow } from '../../../src/domain/windows'
import { composeExport } from '../../../src/features/export/compose'
import { SELECT_ALL, type ExportSectionId } from '../../../src/features/export/sections'
import { assembleTimeline } from '../../../src/features/timeline/timelineEntries'
import { decide } from '../../../src/intelligence/engine'
import { insightsFor } from '../../../src/intelligence/insights'
import { assembleSituation } from '../../../src/intelligence/situation'
import { snapshotFromWire, type SnapshotWire } from '../../../src/memory/snapshot'
import { buildView } from '../../../src/memory/view'
import { createKit } from '../../../src/synthetic/kit'
import { scenarioById } from '../../../src/synthetic/scenarios'

const failures: string[] = []
function scenario(id: string) {
  const found = scenarioById(id)
  assert.ok(found, id)
  return found
}
function render(
  wire: SnapshotWire,
  id = 'quiet-fortnight',
  sections: readonly ExportSectionId[] = SELECT_ALL,
) {
  const fixture = scenario(id)
  const parsed = snapshotFromWire(wire)
  assert.ok(parsed.loaded)
  const moment = { now: fixture.now, zone: fixture.zone, weekStartsOn: 1 as const }
  const view = buildView(parsed.snapshot, moment)
  const situation = assembleSituation(view, moment)
  const decision = decide(view, moment)
  const text = composeExport({
    sections,
    situation,
    decision,
    insights: insightsFor(situation),
    timeline: assembleTimeline(situation),
    source: 'laboratory',
    app: {
      commitShort: 'd8ec6eb',
      commitSha: 'd8ec6eb00e43a39290a7be78fa8633fc574d4f59',
      target: 'preview',
      buildTime: '2026-08-26T05:19:26.923Z',
      phaseNumber: 8,
      phaseTitle: 'Legacy migration',
      phaseSummary: 'Independent synthetic Round 5 evidence',
    },
    composedAt: { at: instant(Date.parse('2026-08-26T12:00:00Z')), zone: fixture.zone },
  }).text
  return { text, view, situation, decision, snapshot: parsed.snapshot }
}
function paired(
  name: string,
  withPrivate: SnapshotWire,
  withoutPrivate: SnapshotWire,
  id = 'quiet-fortnight',
) {
  const a = render(withPrivate, id)
  const b = render(withoutPrivate, id)
  if (a.text === b.text) {
    console.log(`PASS: ${name}`)
    return
  }
  failures.push(name)
  console.log(`FAIL: ${name}`)
  console.log(
    JSON.stringify(
      {
        onlyWithPrivate: a.text.split('\n').filter((line) => !b.text.split('\n').includes(line)),
        onlyWithoutPrivate: b.text.split('\n').filter((line) => !a.text.split('\n').includes(line)),
      },
      null,
      2,
    ),
  )
}

const base = scenario('quiet-fortnight')
const original = base.build()
const loaded = render(original).snapshot
const donor = loaded.records.find((record) => record.privacy === 'private')
assert.ok(donor && donor.kind === 'observation')
const plain: SnapshotWire = {
  ...original,
  records: loaded.records.filter((record) => record.privacy !== 'private').map(recordToWire),
}
const kit = createKit('qa82r5', base.zone, '2026-01-01T00:00:00Z')
const at = instant(base.now - 60_000)
const subject = kit.entity({
  kind: 'goal',
  label: 'Private appointment follow-up',
  domain: DOMAIN.privateHealth,
  privacy: 'private',
})
const goal = kit.record(
  'goal',
  { occurredAt: at, domains: [DOMAIN.privateHealth], privacy: 'private' },
  {
    goal: { id: subject.id, kind: subject.kind },
    statement: 'Discuss the private appointment findings',
    status: 'active',
  },
)
const commitment = kit.record(
  'commitment',
  { occurredAt: at, domains: [DOMAIN.privateHealth], privacy: 'private' },
  {
    statement: 'Call about the private appointment results',
    due: dueWindow(at, instant(base.now + 3_600_000)),
  },
)
const privatePlans = {
  ...plain,
  entities: [...plain.entities, entityToWire(subject)],
  records: [...plain.records, recordToWire(goal), recordToWire(commitment)],
}
assert.equal(render(privatePlans).snapshot.malformed.length, 0, 'private plans must parse')
paired('private entity plus goal and commitment: no detail or participation', privatePlans, plain)
assert.match(
  render(privatePlans, 'quiet-fortnight', [...SELECT_ALL, 'private']).text,
  /Discuss the private appointment findings/,
)
assert.match(
  render(privatePlans, 'quiet-fortnight', [...SELECT_ALL, 'private']).text,
  /Call about the private appointment results/,
)
console.log('PASS: explicit private opt-in retains private plans')

const school = scenario('school-morning')
const schoolWire = school.build()
const energy = kit.record(
  'observation',
  { occurredAt: instant(school.now - 1_000), domains: [DOMAIN.health], privacy: 'private' },
  {
    concept: CONCEPT.energy,
    method: 'self-report',
    value: { type: 'scale', value: 1, of: 5 },
  },
)
const privateEnergy = { ...schoolWire, records: [...schoolWire.records, recordToWire(energy)] }
assert.equal(render(privateEnergy, 'school-morning').snapshot.malformed.length, 0)
paired(
  'private current energy cannot appear in decision or public coverage',
  privateEnergy,
  schoolWire,
  'school-morning',
)

const observed = scenario('observed-evenings')
const observations = render(observed.build(), observed.id).snapshot
const privateReadings = observations.records.map((record) =>
  record.kind === 'observation' && record.concept === CONCEPT.energy
    ? { ...record, privacy: 'private' as const }
    : record,
)
assert.ok(privateReadings.filter((record) => record.privacy === 'private').length > 20)
const learningWith = { ...observed.build(), records: privateReadings.map(recordToWire) }
const learningWithout = {
  ...observed.build(),
  records: privateReadings.filter((record) => record.privacy !== 'private').map(recordToWire),
}
assert.ok(
  render(learningWith, observed.id).situation.learning.associations.length > 0,
  'must reach learned relationship',
)
paired(
  'private evidence participating in learned relationships',
  learningWith,
  learningWithout,
  observed.id,
)

const states = [
  ['explicit', [recordToWire({ ...donor, occurredAt: at, recordedAt: at })]],
  [
    'stale',
    [
      recordToWire({
        ...donor,
        occurredAt: instant(base.now - 90 * 86_400_000),
        recordedAt: instant(base.now - 90 * 86_400_000),
      }),
    ],
  ],
  [
    'retracted',
    [
      recordToWire(donor),
      recordToWire(
        kit.record(
          'correction',
          { occurredAt: at, domains: [DOMAIN.privateHealth], privacy: 'private' },
          { corrects: donor.id, reason: 'Private correction' },
        ),
      ),
    ],
  ],
  [
    'contradicted',
    [
      recordToWire(donor),
      recordToWire({
        ...donor,
        id: kit.record(
          'observation',
          { occurredAt: at, domains: [DOMAIN.privateHealth], privacy: 'private' },
          {
            concept: CONCEPT.privatePattern,
            method: 'self-report',
            value: { type: 'text', value: 'different' },
          },
        ).id,
        value: { type: 'text' as const, value: 'different' },
      }),
    ],
  ],
  [
    'lapsed',
    [
      recordToWire(
        kit.record(
          'context',
          {
            occurredAt: instant(base.now - 3_600_000),
            domains: [DOMAIN.privateHealth],
            privacy: 'private',
          },
          {
            concept: CONCEPT.privatePattern,
            value: donor.value,
            durability: 'situational',
            validFrom: instant(base.now - 3_600_000),
            validUntil: instant(base.now - 1_000),
          },
        ),
      ),
    ],
  ],
  ['malformed', [{ ...recordToWire(donor), value: { type: 'broken' } }]],
] as const
for (const [expected, records] of states) {
  const wire = { ...plain, records: [...plain.records, ...records] }
  const knowledge = render(wire).view.facts.knowledgeFor(CONCEPT.privatePattern)
  const state = knowledge.state === 'unknown' ? knowledge.reason : knowledge.state
  assert.equal(state, expected, `constructed private ${expected} must reach that state`)
  paired(`private concept ${expected}`, wire, plain)
}
const neverObserved = render(plain)
const privateUnknown = neverObserved.view.facts.knowledgeFor(CONCEPT.privatePattern)
assert.equal(privateUnknown.state, 'unknown')
assert.equal(privateUnknown.state === 'unknown' && privateUnknown.reason, 'never-observed')
assert.doesNotMatch(neverObserved.text, /Recent private pattern/)
console.log('PASS: private concept never observed is not named in the document')
// This probe does not construct not-applicable; the exhaustive formatter test
// covers that reason. Do not claim a live history path from a formatter test.

const unreadablePrivateEntity = {
  ...plain,
  entities: [...plain.entities, { domain: DOMAIN.privateHealth, label: 'Broken private subject' }],
}
assert.equal(render(unreadablePrivateEntity).snapshot.malformed.length, 1)
paired('unreadable entity explicitly naming the private domain', unreadablePrivateEntity, plain)
assert.match(
  render({ ...plain, records: [...plain.records, { value: 42 }] }).text,
  /1 unreadable row/,
)
console.log('PASS: genuinely unclassified unreadable row remains reported')

console.log(JSON.stringify({ failed: failures, count: failures.length }, null, 2))
if (failures.length > 0) process.exitCode = 1
