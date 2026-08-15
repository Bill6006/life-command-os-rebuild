import { describe, expect, it } from 'vitest'
import { createRecordFactory, SYNTHETIC_PROVENANCE } from '../../src/domain/build'
import { DOMAIN } from '../../src/domain/domains'
import { createEntity, entityRef, type SemanticEntity } from '../../src/domain/entities'
import { sequentialRecordIds, type RecordId } from '../../src/domain/ids'
import {
  RECORD_KINDS,
  sortRecords,
  type CanonicalRecord,
  type RecordKind,
} from '../../src/domain/records'
import { instant, timeZone, type Instant } from '../../src/domain/time'
import { entityToWire, parseEntities, parseRecords, recordToWire } from '../../src/domain/wire'
import { conceptId } from '../../src/domain/windows'

const ZONE = timeZone('America/Denver')
const nextId = sequentialRecordIds('RT')
const record = createRecordFactory({ zone: ZONE, provenance: SYNTHETIC_PROVENANCE, nextId })

function at(iso: string): Instant {
  return instant(Date.parse(iso))
}

const T = at('2026-03-10T02:30:00Z')
const LATER = at('2026-03-10T04:00:00Z')

const subnetting = entityRef('learning-topic', 'Subnetting')
const ccnaGoal = entityRef('goal', 'Pass the CCNA')
const adaya = entityRef('person', 'Adaya')
const bedtime = entityRef('routine', 'Bedtime')
const kitchen = entityRef('place', 'Kitchen counter')
const cardDebt = entityRef('financial-goal', 'Clear the card balance')

const recommendationRecord = record(
  'action-recommendation',
  { occurredAt: T, domains: [DOMAIN.career], entities: [subnetting] },
  {
    recommendation: {
      subject: subnetting,
      domain: DOMAIN.career,
      target: { verb: 'recall-practice', object: subnetting, minutes: 10 },
      whyNow: {
        trigger: 'recent-struggle',
        summary: 'Yesterday the subnet masks did not come back.',
        evidence: [],
      },
      relatedGoal: ccnaGoal,
      evidence: [],
    },
  },
)

const recommendationId: RecordId = recommendationRecord.id

/**
 * One record of every kind, twice: once with only the required fields and once
 * with every optional one filled in. If a payload field is ever added without a
 * matching line in `recordToWire`, this is what notices.
 */
const minimal: Record<RecordKind, CanonicalRecord> = {
  observation: record(
    'observation',
    { occurredAt: T },
    {
      concept: conceptId('sleep.hours-last-night'),
      value: { type: 'number', value: 6 },
      method: 'self-report',
    },
  ),
  'explicit-fact': record(
    'explicit-fact',
    { occurredAt: T },
    {
      concept: conceptId('career.current-learning-topic'),
      value: { type: 'entity', value: subnetting },
    },
  ),
  context: record(
    'context',
    { occurredAt: T },
    {
      concept: conceptId('family.child-present'),
      value: { type: 'boolean', value: true },
      durability: 'durable',
      validFrom: T,
    },
  ),
  constraint: record(
    'constraint',
    { occurredAt: T },
    { concept: conceptId('career.usable-time-tonight'), description: 'On call until 21:00' },
  ),
  goal: record(
    'goal',
    { occurredAt: T },
    { goal: ccnaGoal, statement: 'Pass the CCNA', status: 'active' },
  ),
  commitment: record(
    'commitment',
    { occurredAt: T },
    { statement: 'School pickup', due: { kind: 'due', earliest: T, latest: LATER } },
  ),
  preference: record(
    'preference',
    { occurredAt: T },
    { about: subnetting, stance: 'prefers', statement: 'Recall before rereading' },
  ),
  decision: record(
    'decision',
    { occurredAt: T },
    { statement: 'Study route', chosen: 'Labs over videos', rejected: [] },
  ),
  'action-recommendation': recommendationRecord,
  'action-start': record('action-start', { occurredAt: T }, { recommendation: recommendationId }),
  'action-completion': record(
    'action-completion',
    { occurredAt: T },
    { recommendation: recommendationId },
  ),
  'action-decline': record(
    'action-decline',
    { occurredAt: T },
    { recommendation: recommendationId },
  ),
  'action-unable-now': record(
    'action-unable-now',
    { occurredAt: T },
    { recommendation: recommendationId },
  ),
  outcome: record(
    'outcome',
    { occurredAt: T },
    { about: recommendationId, observation: { type: 'scale', value: 4, of: 5 } },
  ),
  correction: record(
    'correction',
    { occurredAt: T },
    { corrects: recommendationId, reason: 'Logged against the wrong evening' },
  ),
  'relationship-event': record(
    'relationship-event',
    { occurredAt: T },
    { withEntity: adaya, nature: 'Read together before bed' },
  ),
  'domain-update': record(
    'domain-update',
    { occurredAt: T },
    { domain: DOMAIN.home, summary: 'Kitchen reset' },
  ),
  'coverage-update': record(
    'coverage-update',
    { occurredAt: T },
    { domain: DOMAIN.faith, evidenceStrength: 'weak' },
  ),
  'imported-legacy-record': record(
    'imported-legacy-record',
    { occurredAt: T },
    { legacyFormat: 'lcos-v3-export', raw: { anything: ['at', 'all'], n: 1 } },
  ),
}

const full: Record<RecordKind, CanonicalRecord> = {
  observation: record(
    'observation',
    {
      occurredAt: T,
      recordedAt: LATER,
      domains: [DOMAIN.sleep],
      entities: [bedtime],
      privacy: 'sensitive',
      provenance: { source: 'device', writtenBy: 'watch', note: 'nightly sync' },
    },
    {
      concept: conceptId('sleep.hours-last-night'),
      value: { type: 'number', value: 6.5, unit: 'hours' },
      method: 'device',
      window: { kind: 'observation', from: T, to: LATER },
    },
  ),
  'explicit-fact': record(
    'explicit-fact',
    {
      occurredAt: T,
      domains: [DOMAIN.career],
      entities: [subnetting],
      supersedes: recommendationId,
    },
    {
      concept: conceptId('career.current-learning-topic'),
      value: { type: 'text', value: 'Subnetting' },
    },
  ),
  context: record(
    'context',
    { occurredAt: T, domains: [DOMAIN.fatherhood], entities: [adaya] },
    {
      concept: conceptId('family.child-present'),
      value: { type: 'text', value: 'with me' },
      durability: 'situational',
      validFrom: T,
      validUntil: LATER,
    },
  ),
  constraint: record(
    'constraint',
    { occurredAt: T, domains: [DOMAIN.career] },
    {
      concept: conceptId('career.usable-time-tonight'),
      description: 'On call',
      until: LATER,
    },
  ),
  goal: record(
    'goal',
    { occurredAt: T, domains: [DOMAIN.career], entities: [ccnaGoal] },
    {
      goal: ccnaGoal,
      statement: 'Pass the CCNA',
      status: 'paused',
      targetWindow: { kind: 'due', earliest: T, latest: LATER },
    },
  ),
  commitment: record(
    'commitment',
    { occurredAt: T, domains: [DOMAIN.fatherhood] },
    {
      statement: 'School pickup',
      due: { kind: 'due', earliest: T, latest: LATER },
      to: adaya,
    },
  ),
  preference: record(
    'preference',
    { occurredAt: T, domains: [DOMAIN.privateHealth] },
    { about: subnetting, stance: 'forbids', statement: 'Never suggest this after 22:00' },
  ),
  decision: record(
    'decision',
    { occurredAt: T, domains: [DOMAIN.direction] },
    { statement: 'Study route', chosen: 'Labs', rejected: ['Videos', 'Rereading'] },
  ),
  'action-recommendation': record(
    'action-recommendation',
    { occurredAt: T, domains: [DOMAIN.fatherhood], entities: [adaya] },
    {
      recommendation: {
        subject: entityRef('development-skill', 'Ordering food independently'),
        domain: DOMAIN.fatherhood,
        target: {
          verb: 'growth-opportunity',
          object: entityRef('development-skill', 'Ordering food independently'),
        },
        whyNow: { trigger: 'opportunity-window', summary: '', evidence: [recommendationId] },
        evidence: [recommendationId],
      },
    },
  ),
  'action-start': record(
    'action-start',
    { occurredAt: T, domains: [DOMAIN.career] },
    { recommendation: recommendationId },
  ),
  'action-completion': record(
    'action-completion',
    { occurredAt: T },
    { recommendation: recommendationId, note: 'Got through the /26 cases' },
  ),
  'action-decline': record(
    'action-decline',
    { occurredAt: T },
    { recommendation: recommendationId, reason: 'Not tonight' },
  ),
  'action-unable-now': record(
    'action-unable-now',
    { occurredAt: T },
    { recommendation: recommendationId, blocker: 'Adaya still awake' },
  ),
  outcome: record(
    'outcome',
    { occurredAt: T },
    {
      about: recommendationId,
      observation: { type: 'duration', minutes: 12 },
      sentiment: 'better',
      window: { kind: 'observation', from: T, to: LATER },
    },
  ),
  correction: record(
    'correction',
    { occurredAt: T },
    { corrects: recommendationId, reason: 'Wrong evening', replacedBy: recommendationId },
  ),
  'relationship-event': record(
    'relationship-event',
    { occurredAt: T, domains: [DOMAIN.social] },
    { withEntity: adaya, nature: 'Long call', quality: 'positive' },
  ),
  'domain-update': record(
    'domain-update',
    { occurredAt: T, domains: [DOMAIN.home], entities: [kitchen] },
    { domain: DOMAIN.home, summary: 'Kitchen reset' },
  ),
  'coverage-update': record(
    'coverage-update',
    { occurredAt: T, domains: [DOMAIN.money], entities: [cardDebt] },
    { domain: DOMAIN.money, evidenceStrength: 'moderate', subArea: 'card balance' },
  ),
  'imported-legacy-record': record(
    'imported-legacy-record',
    { occurredAt: T, provenance: { source: 'legacy-import', writtenBy: 'importer' } },
    { legacyFormat: 'lcos-v3-export', raw: { nested: { deep: [1, 2, { three: true }] } } },
  ),
}

const everyRecord = [...Object.values(minimal), ...Object.values(full)]

function throughJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown
}

describe('canonical records round-trip without loss', () => {
  it('covers every record kind the plan lists', () => {
    expect(RECORD_KINDS).toHaveLength(19)
    expect(Object.keys(minimal).sort()).toEqual([...RECORD_KINDS].sort())
    expect(Object.keys(full).sort()).toEqual([...RECORD_KINDS].sort())
  })

  it('survives a trip through JSON and back, for every kind', () => {
    for (const original of everyRecord) {
      const wire = throughJson(recordToWire(original))
      const parsed = parseRecords([wire])
      expect(parsed.malformed, `${original.kind} produced issues`).toEqual([])
      expect(parsed.records[0], `${original.kind} did not round-trip`).toEqual(original)
    }
  })

  it('survives the whole set at once, in order', () => {
    const wire = throughJson(everyRecord.map(recordToWire))
    const parsed = parseRecords(wire)
    expect(parsed.malformed).toEqual([])
    expect(parsed.records).toHaveLength(everyRecord.length)
    expect(sortRecords(parsed.records)).toEqual(sortRecords(everyRecord))
  })

  it('is stable: a second trip changes nothing', () => {
    const once = throughJson(everyRecord.map(recordToWire))
    const parsed = parseRecords(once)
    const twice = throughJson(parsed.records.map(recordToWire))
    expect(twice).toEqual(once)
  })

  it('carries fields this version has never heard of', () => {
    const withFuture = {
      ...recordToWire(minimal.observation),
      futureField: { added: 'by a later schema', keep: [1, 2, 3] },
      anotherOne: 'kept',
    }
    const parsed = parseRecords([throughJson(withFuture)])
    expect(parsed.malformed).toEqual([])

    const first = parsed.records[0]
    expect(first?.unrecognized).toEqual({
      futureField: { added: 'by a later schema', keep: [1, 2, 3] },
      anotherOne: 'kept',
    })
    // …and puts them back exactly where they were.
    expect(first === undefined ? undefined : throughJson(recordToWire(first))).toEqual(
      throughJson(withFuture),
    )
  })

  it('keeps a legacy payload byte-for-byte', () => {
    const original = full['imported-legacy-record']
    const parsed = parseRecords([throughJson(recordToWire(original))])
    expect(parsed.records[0]).toEqual(original)
  })
})

describe('entities round-trip without loss', () => {
  const entities: readonly SemanticEntity[] = [
    createEntity({
      kind: 'learning-topic',
      label: 'Subnetting',
      domain: DOMAIN.career,
      privacy: 'normal',
      createdAt: T,
      aliases: ['subnets', 'VLSM'],
      links: [{ relation: 'supports-goal', target: ccnaGoal.id }],
      note: 'The masks are the part that slips',
    }),
    createEntity({
      kind: 'goal',
      label: 'Pass the CCNA',
      domain: DOMAIN.career,
      privacy: 'normal',
      createdAt: T,
    }),
  ]

  it('survives a trip through JSON and back', () => {
    const parsed = parseEntities(throughJson(entities.map(entityToWire)))
    expect(parsed.malformed).toEqual([])
    expect(parsed.entities).toEqual(entities)
  })

  it('rejects a field nobody defined rather than dropping it', () => {
    const wire = { ...entityToWire(entities[0]!), mystery: 'value' }
    const parsed = parseEntities(throughJson([wire]))
    expect(parsed.entities).toEqual([])
    expect(parsed.malformed[0]?.issues[0]?.problem).toContain('unexpected field')
    // The row is still readable in full.
    expect(parsed.malformed[0]?.raw).toEqual(wire)
  })
})
