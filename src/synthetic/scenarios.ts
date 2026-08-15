import { CONCEPT } from '../domain/concepts'
import { DOMAIN } from '../domain/domains'
import { entityRef } from '../domain/entities'
import { timeZone } from '../domain/time'
import { createKit, type Scenario } from './kit'

/**
 * The starting synthetic histories (canonical plan sections 31, 32 and 67).
 *
 * Each one exists to make a specific claim checkable by hand on a phone and
 * automatically in the suite. The golden scenarios in `tests/synthetic` load
 * these same documents, so what the owner taps through is what the gate runs.
 */

// ---------------------------------------------------------------------------
// G-001 — the subject survives
// ---------------------------------------------------------------------------

function subnettingStruggle(): Scenario {
  const kit = createKit('GA', 'America/Denver', '2026-01-05T12:00:00Z')
  const subnetting = entityRef('learning-topic', 'subnetting')
  const ccna = entityRef('goal', 'the CCNA')
  const now = kit.local('2026-03-10', '19:30')

  return {
    id: 'subnetting-struggle',
    title: 'A topic that keeps slipping',
    summary: 'A study goal, a topic that went badly yesterday, and tonight’s move.',
    proves: 'G-001 — the recommendation and its follow-up both name subnetting.',
    zone: kit.zone,
    now,
    build() {
      const topic = kit.entity({
        kind: 'learning-topic',
        label: 'subnetting',
        domain: DOMAIN.career,
        privacy: 'normal',
        aliases: ['subnets', 'VLSM'],
        links: [{ relation: 'supports-goal', target: ccna.id }],
      })
      const goal = kit.entity({
        kind: 'goal',
        label: 'the CCNA',
        domain: DOMAIN.career,
        privacy: 'normal',
      })

      const goalRecord = kit.record(
        'goal',
        {
          occurredAt: kit.local('2026-01-05', '09:00'),
          domains: [DOMAIN.career],
          entities: [ccna],
        },
        { goal: ccna, statement: 'Pass the CCNA before the summer', status: 'active' },
      )

      const topicRecord = kit.record(
        'observation',
        {
          occurredAt: kit.local('2026-03-02', '20:00'),
          domains: [DOMAIN.career],
          entities: [subnetting],
        },
        {
          concept: CONCEPT.learningTopic,
          value: { type: 'entity', value: subnetting },
          method: 'self-report',
        },
      )

      const struggle = kit.record(
        'outcome',
        {
          occurredAt: kit.local('2026-03-09', '21:10'),
          domains: [DOMAIN.career],
          entities: [subnetting],
        },
        {
          about: topicRecord.id,
          observation: { type: 'text', value: 'The /26 boundaries went wrong twice' },
          sentiment: 'worse',
        },
      )

      const tonight = kit.record(
        'action-recommendation',
        { occurredAt: now, domains: [DOMAIN.career], entities: [subnetting, ccna] },
        {
          recommendation: {
            subject: subnetting,
            domain: DOMAIN.career,
            target: { verb: 'recall-practice', object: subnetting, minutes: 10 },
            whyNow: { trigger: 'recent-struggle', summary: '', evidence: [struggle.id] },
            relatedGoal: ccna,
            evidence: [struggle.id, topicRecord.id],
          },
        },
      )

      return kit.document({
        entities: [topic, goal],
        records: [goalRecord, topicRecord, struggle, tonight],
        exportedAt: now,
      })
    },
  }
}

// ---------------------------------------------------------------------------
// G-002 — durable family context, and a temporary exception
// ---------------------------------------------------------------------------

function durableCustody(): Scenario {
  const kit = createKit('GB', 'America/Denver', '2025-01-01T12:00:00Z')
  const adaya = entityRef('person', 'Adaya')
  const custody = entityRef('relationship', 'Full custody')
  const now = kit.local('2026-06-15', '18:00')

  return {
    id: 'durable-custody',
    title: 'A settled arrangement, and one week away',
    summary: 'Full custody as standing context, plus a trip that changes three evenings.',
    proves: 'G-002 — the app stops asking, and a temporary exception still wins while it lasts.',
    zone: kit.zone,
    now,
    build() {
      const child = kit.entity({
        kind: 'person',
        label: 'Adaya',
        domain: DOMAIN.fatherhood,
        privacy: 'child-family-sensitive',
      })
      const arrangement = kit.entity({
        kind: 'relationship',
        label: 'Full custody',
        domain: DOMAIN.fatherhood,
        privacy: 'child-family-sensitive',
        links: [{ relation: 'party', target: adaya.id }],
      })

      const standing = kit.record(
        'context',
        {
          occurredAt: kit.local('2025-01-01', '09:00'),
          domains: [DOMAIN.fatherhood],
          entities: [adaya, custody],
        },
        {
          concept: CONCEPT.custodyArrangement,
          value: { type: 'text', value: 'full custody' },
          durability: 'durable',
          validFrom: kit.local('2025-01-01', '09:00'),
        },
      )

      const present = kit.record(
        'context',
        {
          occurredAt: kit.local('2025-01-01', '09:00'),
          domains: [DOMAIN.fatherhood],
          entities: [adaya],
        },
        {
          concept: CONCEPT.childPresent,
          value: { type: 'boolean', value: true },
          durability: 'durable',
          validFrom: kit.local('2025-01-01', '09:00'),
        },
      )

      // Three evenings away with her grandmother. Narrower than the standing
      // arrangement, so it wins while it lasts and then stops mattering.
      const trip = kit.record(
        'context',
        {
          occurredAt: kit.local('2026-06-14', '11:00'),
          domains: [DOMAIN.fatherhood],
          entities: [adaya],
        },
        {
          concept: CONCEPT.childPresent,
          value: { type: 'boolean', value: false },
          durability: 'situational',
          validFrom: kit.local('2026-06-20', '08:00'),
          validUntil: kit.local('2026-06-23', '18:00'),
        },
      )

      const evening = kit.record(
        'relationship-event',
        {
          occurredAt: kit.local('2026-06-14', '20:15'),
          domains: [DOMAIN.fatherhood],
          entities: [adaya],
        },
        { withEntity: adaya, nature: 'Read two chapters before bed', quality: 'positive' },
      )

      return kit.document({
        entities: [child, arrangement],
        records: [standing, present, trip, evening],
        exportedAt: now,
      })
    },
  }
}

// ---------------------------------------------------------------------------
// G-009 — unknown stays unknown
// ---------------------------------------------------------------------------

function mostlyUnknown(): Scenario {
  const kit = createKit('GC', 'America/Denver', '2026-06-10T12:00:00Z')
  const now = kit.local('2026-06-15', '07:00')

  return {
    id: 'mostly-unknown',
    title: 'One answer, and a lot of silence',
    summary: 'Almost nothing has been answered. A retraction leaves one thing deliberately blank.',
    proves: 'G-009 — nothing becomes a zero, an average or a default.',
    zone: kit.zone,
    now,
    build() {
      const sleep = kit.record(
        'observation',
        { occurredAt: kit.local('2026-06-15', '06:40'), domains: [DOMAIN.sleep] },
        {
          concept: CONCEPT.sleepHours,
          value: { type: 'number', value: 6.5, unit: 'hours' },
          method: 'self-report',
        },
      )

      const soreness = kit.record(
        'observation',
        { occurredAt: kit.local('2026-06-15', '06:41'), domains: [DOMAIN.health] },
        {
          concept: CONCEPT.soreness,
          value: { type: 'scale', value: 4, of: 5 },
          method: 'self-report',
        },
      )

      // The owner says that one was wrong, and offers nothing in its place.
      // The right answer afterwards is "we do not know", not "no soreness".
      const retraction = kit.record(
        'correction',
        { occurredAt: kit.local('2026-06-15', '06:55'), domains: [DOMAIN.health] },
        { corrects: soreness.id, reason: 'Tapped the wrong row' },
      )

      // Dated tomorrow: real, but not yet knowledge.
      const planned = kit.record(
        'observation',
        { occurredAt: kit.local('2026-06-16', '07:00'), domains: [DOMAIN.money] },
        {
          concept: CONCEPT.cashBuffer,
          value: { type: 'text', value: 'after payday' },
          method: 'self-report',
        },
      )

      return kit.document({
        entities: [],
        records: [sleep, soreness, retraction, planned],
        exportedAt: now,
      })
    },
  }
}

// ---------------------------------------------------------------------------
// G-011 — timezones, week boundaries and DST
// ---------------------------------------------------------------------------

function acrossTimezones(): Scenario {
  const kit = createKit('GD', 'America/Denver', '2026-01-01T12:00:00Z')
  const now = kit.at('2026-11-01T05:30:00Z')

  return {
    id: 'across-timezones',
    title: 'The same evenings, read from four places',
    summary: 'Entries sitting on a week boundary and on both clock changes.',
    proves: 'G-011 — local day and week hold across timezones and DST.',
    zone: kit.zone,
    now,
    alternateZones: [
      timeZone('Pacific/Auckland'),
      timeZone('UTC'),
      timeZone('America/New_York'),
      timeZone('Australia/Sydney'),
    ],
    build() {
      const weekEdge = kit.record(
        'observation',
        { occurredAt: kit.at('2026-01-04T12:00:00Z'), domains: [DOMAIN.sleep] },
        {
          concept: CONCEPT.sleepHours,
          value: { type: 'number', value: 7, unit: 'hours' },
          method: 'self-report',
        },
      )

      // The instant New York's clocks jump from 02:00 to 03:00.
      const springForward = kit.record(
        'observation',
        { occurredAt: kit.at('2026-03-08T07:30:00Z'), domains: [DOMAIN.sleep] },
        {
          concept: CONCEPT.sleepQuality,
          value: { type: 'scale', value: 3, of: 5 },
          method: 'self-report',
        },
      )

      // The first pass through a repeated 01:30 in New York.
      const fallBack = kit.record(
        'observation',
        { occurredAt: kit.at('2026-11-01T05:30:00Z'), domains: [DOMAIN.sleep] },
        {
          concept: CONCEPT.sleepQuality,
          value: { type: 'scale', value: 4, of: 5 },
          method: 'self-report',
        },
      )

      const direction = kit.record(
        'explicit-fact',
        { occurredAt: kit.at('2026-10-26T15:00:00Z'), domains: [DOMAIN.direction] },
        { concept: CONCEPT.weeklyFocus, value: { type: 'text', value: 'home' } },
      )

      return kit.document({
        entities: [],
        records: [weekEdge, springForward, fallBack, direction],
        exportedAt: now,
      })
    },
  }
}

// ---------------------------------------------------------------------------
// Corrections and supersession
// ---------------------------------------------------------------------------

function correctionsAndSupersession(): Scenario {
  const kit = createKit('GF', 'America/Denver', '2026-05-01T12:00:00Z')
  const now = kit.local('2026-05-04', '20:00')

  return {
    id: 'corrections',
    title: 'Second thoughts, kept honestly',
    summary: 'A number replaced by a better one, and an entry withdrawn outright.',
    proves: 'A correction changes what is believed without editing what was written.',
    zone: kit.zone,
    now,
    build() {
      const firstGuess = kit.record(
        'observation',
        { occurredAt: kit.local('2026-05-04', '07:00'), domains: [DOMAIN.sleep] },
        {
          concept: CONCEPT.sleepHours,
          value: { type: 'number', value: 5, unit: 'hours' },
          method: 'self-report',
        },
      )

      const better = kit.record(
        'observation',
        {
          occurredAt: kit.local('2026-05-04', '07:00'),
          recordedAt: kit.local('2026-05-04', '09:30'),
          domains: [DOMAIN.sleep],
          supersedes: firstGuess.id,
        },
        {
          concept: CONCEPT.sleepHours,
          value: { type: 'number', value: 6.75, unit: 'hours' },
          method: 'self-report',
        },
      )

      const mood = kit.record(
        'observation',
        { occurredAt: kit.local('2026-05-04', '12:00'), domains: [DOMAIN.emotional] },
        {
          concept: CONCEPT.emotionalState,
          value: { type: 'text', value: 'flat' },
          method: 'self-report',
        },
      )

      const withdrawn = kit.record(
        'correction',
        { occurredAt: kit.local('2026-05-04', '12:30'), domains: [DOMAIN.emotional] },
        { corrects: mood.id, reason: 'That was about yesterday, not today' },
      )

      return kit.document({
        entities: [],
        records: [firstGuess, better, mood, withdrawn],
        exportedAt: now,
      })
    },
  }
}

// ---------------------------------------------------------------------------
// Malformed rows beside good ones
// ---------------------------------------------------------------------------

function malformedHistory(): Scenario {
  const kit = createKit('GE', 'America/Denver', '2026-04-01T12:00:00Z')
  const now = kit.local('2026-04-08', '19:00')

  return {
    id: 'malformed-history',
    title: 'A file with damage in it',
    summary: 'Readable entries either side of rows that cannot be parsed.',
    proves: 'A malformed record is inspectable, and cannot blank a surface.',
    zone: kit.zone,
    now,
    build() {
      const good = [1, 2, 3].map((day) =>
        kit.record(
          'observation',
          { occurredAt: kit.local(`2026-04-0${day + 4}`, '07:00'), domains: [DOMAIN.sleep] },
          {
            concept: CONCEPT.sleepHours,
            value: { type: 'number', value: 6 + day * 0.25, unit: 'hours' },
            method: 'self-report',
          },
        ),
      )

      const home = kit.record(
        'observation',
        { occurredAt: kit.local('2026-04-07', '18:00'), domains: [DOMAIN.home] },
        {
          concept: CONCEPT.homeFriction,
          value: { type: 'text', value: 'kitchen counter' },
          method: 'self-report',
        },
      )

      return kit.document({
        entities: [],
        records: [...good, home],
        brokenRecordRows: [
          'this row is a string',
          { kind: 'observation', concept: 'sleep.hours-last-night' },
          { ...JSON.parse(JSON.stringify(good[0])), occurredAt: 'the other night' },
          null,
          { id: 'NOTANID', kind: 'telepathy' },
        ],
        brokenEntityRows: [{ id: 'person:ghost', kind: 'person' }],
        exportedAt: now,
      })
    },
  }
}

// ---------------------------------------------------------------------------
// A plain, stable history
// ---------------------------------------------------------------------------

function quietFortnight(): Scenario {
  const kit = createKit('GH', 'America/Denver', '2026-02-01T12:00:00Z')
  const adaya = entityRef('person', 'Adaya')
  const now = kit.local('2026-02-15', '21:00')

  return {
    id: 'quiet-fortnight',
    title: 'Two ordinary weeks',
    summary: 'Nothing dramatic: sleep, a few evenings, a direction for the week.',
    proves: 'The everyday case — history accumulates and stays readable.',
    zone: kit.zone,
    now,
    build() {
      const child = kit.entity({
        kind: 'person',
        label: 'Adaya',
        domain: DOMAIN.fatherhood,
        privacy: 'child-family-sensitive',
      })

      const nights = Array.from({ length: 14 }, (_, offset) => {
        const day = 1 + offset
        const dayId = `2026-02-${String(day).padStart(2, '0')}`
        return kit.record(
          'observation',
          { occurredAt: kit.local(dayId, '07:00'), domains: [DOMAIN.sleep] },
          {
            concept: CONCEPT.sleepHours,
            value: { type: 'number', value: 6 + ((offset * 7) % 5) / 4, unit: 'hours' },
            method: 'self-report',
          },
        )
      })

      const evenings = [4, 9, 13].map((offset) =>
        kit.record(
          'relationship-event',
          {
            occurredAt: kit.local(`2026-02-${String(1 + offset).padStart(2, '0')}`, '19:45'),
            domains: [DOMAIN.fatherhood],
            entities: [adaya],
          },
          { withEntity: adaya, nature: 'Cooked together', quality: 'positive' },
        ),
      )

      const direction = kit.record(
        'explicit-fact',
        { occurredAt: kit.local('2026-02-09', '08:00'), domains: [DOMAIN.direction] },
        { concept: CONCEPT.weeklyFocus, value: { type: 'text', value: 'home' } },
      )

      const privateNote = kit.record(
        'observation',
        { occurredAt: kit.local('2026-02-12', '23:40'), domains: [DOMAIN.privateHealth] },
        {
          concept: CONCEPT.privatePattern,
          value: { type: 'text', value: 'late scrolling again' },
          method: 'self-report',
        },
      )

      return kit.document({
        entities: [child],
        records: [...nights, ...evenings, direction, privateNote],
        exportedAt: now,
      })
    },
  }
}

export const SCENARIOS: readonly Scenario[] = [
  subnettingStruggle(),
  durableCustody(),
  mostlyUnknown(),
  acrossTimezones(),
  correctionsAndSupersession(),
  malformedHistory(),
  quietFortnight(),
]

export function scenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id)
}

export const DEFAULT_SCENARIO_ID = 'subnetting-struggle'
