import { CONCEPT } from '../domain/concepts'
import { DOMAIN, type LifeDomainId } from '../domain/domains'
import { entityRef, type SemanticEntity } from '../domain/entities'
import type { CanonicalRecord } from '../domain/records'
import { timeZone } from '../domain/time'
import type { SnapshotWire } from '../memory/snapshot'
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
      const good = [1, 2, 3, 4].map((day) =>
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

// ---------------------------------------------------------------------------
// G-005 — severe sleep deficit against a career goal
// ---------------------------------------------------------------------------

/**
 * The same life, twice, differing only in how much sleep is behind it.
 *
 * G-005 asks that career must not automatically win when rest is short. A
 * scenario where recovery wins proves nothing on its own — "sleep always wins"
 * would pass it just as well, and would be a hardcode in the other direction.
 * So both nights are built from one function, and the pair is the test: three
 * broken nights or three good ones, everything else identical, including a
 * career goal, a topic that went badly, and a week explicitly pointed at
 * career. Whatever changes between them is doing the work.
 */
function nightsOfSleep(rested: boolean): Pick<Scenario, 'zone' | 'now' | 'build'> {
  const kit = createKit(rested ? 'GJ' : 'GK', 'America/Denver', '2026-08-01T12:00:00Z')
  const subnetting = entityRef('learning-topic', 'subnetting')
  const ccna = entityRef('goal', 'the CCNA')
  const career = entityRef('life-domain', 'the CCNA push')
  const now = kit.local('2026-09-15', '21:40')

  return {
    zone: kit.zone,
    now,
    build() {
      const topic = kit.entity({
        kind: 'learning-topic',
        label: 'subnetting',
        domain: DOMAIN.career,
        privacy: 'normal',
        links: [{ relation: 'supports-goal', target: ccna.id }],
      })
      const goal = kit.entity({
        kind: 'goal',
        label: 'the CCNA',
        domain: DOMAIN.career,
        privacy: 'normal',
      })
      const direction = kit.entity({
        kind: 'life-domain',
        label: 'the CCNA push',
        domain: DOMAIN.career,
        privacy: 'normal',
      })

      const goalRecord = kit.record(
        'goal',
        {
          occurredAt: kit.local('2026-08-01', '09:00'),
          domains: [DOMAIN.career],
          entities: [ccna],
        },
        { goal: ccna, statement: 'Pass the CCNA before the winter', status: 'active' },
      )

      const studying = kit.record(
        'observation',
        {
          occurredAt: kit.local('2026-09-08', '20:00'),
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
          occurredAt: kit.local('2026-09-14', '21:00'),
          domains: [DOMAIN.career],
          entities: [subnetting],
        },
        {
          about: studying.id,
          observation: { type: 'text', value: 'The /26 boundaries went wrong twice' },
          sentiment: 'worse',
        },
      )

      // The whole difference between the two scenarios.
      const hours = rested ? [7.5, 7.75, 8] : [4.5, 4.25, 5]
      const nights = hours.map((value, offset) =>
        kit.record(
          'observation',
          { occurredAt: kit.local(`2026-09-${13 + offset}`, '07:00'), domains: [DOMAIN.sleep] },
          {
            concept: CONCEPT.sleepHours,
            value: { type: 'number', value, unit: 'hours' },
            method: 'self-report',
          },
        ),
      )

      const energy = kit.record(
        'observation',
        { occurredAt: kit.local('2026-09-15', '18:00'), domains: [DOMAIN.health] },
        {
          concept: CONCEPT.energy,
          value: { type: 'scale', value: rested ? 4 : 2, of: 5 },
          method: 'self-report',
        },
      )

      const time = kit.record(
        'observation',
        { occurredAt: kit.local('2026-09-15', '21:30'), domains: [DOMAIN.career] },
        {
          concept: CONCEPT.usableTimeTonight,
          value: { type: 'duration', minutes: 60 },
          method: 'self-report',
        },
      )

      const weekly = kit.record(
        'explicit-fact',
        {
          occurredAt: kit.local('2026-09-14', '08:00'),
          domains: [DOMAIN.direction],
          entities: [career],
        },
        { concept: CONCEPT.weeklyFocus, value: { type: 'entity', value: career } },
      )

      return kit.document({
        entities: [topic, goal, direction],
        records: [goalRecord, studying, struggle, ...nights, energy, time, weekly],
        exportedAt: now,
      })
    },
  }
}

function sleepDeficitAgainstCareer(): Scenario {
  return {
    id: 'running-on-empty',
    title: 'Three broken nights, and a deadline',
    summary: 'A live career goal, a topic that went badly, and about four hours a night.',
    proves: 'G-005 — career does not win automatically when rest is what is short.',
    ...nightsOfSleep(false),
  }
}

function restedAgainstCareer(): Scenario {
  return {
    id: 'rested-and-behind',
    title: 'The same week, properly slept',
    summary: 'Identical goal, identical bad session — and three good nights instead of three bad.',
    proves: 'G-005’s other half — with rest in hand, the career move is the one that wins.',
    ...nightsOfSleep(true),
  }
}

// ---------------------------------------------------------------------------
// G-008 — a non-career weekly direction
// ---------------------------------------------------------------------------

/**
 * One evening with something worth doing in four different life areas.
 *
 * G-008 asks that a non-career weekly direction is stored with a real semantic
 * category, that arbitration uses it, and that nothing hardcodes career. The
 * way to show that is to hold everything else still: the same history, the same
 * evening, the same four live options, and only the direction changing. What
 * gets chosen follows the direction, and when the direction names no life area
 * at all the choice falls back to the same one it would make with no direction —
 * not to career.
 *
 * The direction is stored as a reference to an entity, so the category is the
 * entity's own life domain and the label is whatever the owner called their
 * week. Both halves survive, which is what section 21 asks for.
 */
export const WEEK_POINTED_AT_ZONE = timeZone('America/Denver')

/** The evening every direction variant is read from. */
export const WEEK_POINTED_AT_NOW = createKit('GN', 'America/Denver', '2026-04-01T12:00:00Z').local(
  '2026-09-15',
  '19:30',
)

export interface WeekDirectionOptions {
  /**
   * How the week's direction is stored, if at all.
   *
   * `named` is the real shape: a reference to an entity, whose life domain is
   * the semantic category and whose label is the owner's own wording. `text` is
   * the loose shape a legacy import or a hand-edited file might carry.
   */
  readonly direction?:
    { readonly named: LifeDomainId; readonly wording: string } | { readonly text: string }
  /** Set in the owner-local week before this one, to test that it expires. */
  readonly setLastWeek?: boolean
}

export function weekPointedAt(options: WeekDirectionOptions = {}): SnapshotWire {
  const kit = createKit('GN', 'America/Denver', '2026-04-01T12:00:00Z')
  const adaya = entityRef('person', 'Adaya')
  const kitchen = entityRef('place', 'the kitchen')
  const subnetting = entityRef('learning-topic', 'subnetting')
  const ccna = entityRef('goal', 'the CCNA')
  const now = WEEK_POINTED_AT_NOW

  const child = kit.entity({
    kind: 'person',
    label: 'Adaya',
    domain: DOMAIN.fatherhood,
    privacy: 'child-family-sensitive',
  })
  const place = kit.entity({
    kind: 'place',
    label: 'the kitchen',
    domain: DOMAIN.home,
    privacy: 'normal',
  })
  const topic = kit.entity({
    kind: 'learning-topic',
    label: 'subnetting',
    domain: DOMAIN.career,
    privacy: 'normal',
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
    { occurredAt: kit.local('2026-04-01', '09:00'), domains: [DOMAIN.career], entities: [ccna] },
    { goal: ccna, statement: 'Pass the CCNA before the winter', status: 'active' },
  )

  const custody = kit.record(
    'context',
    {
      occurredAt: kit.local('2026-04-01', '09:00'),
      domains: [DOMAIN.fatherhood],
      entities: [adaya],
    },
    {
      concept: CONCEPT.childPresent,
      value: { type: 'boolean', value: true },
      durability: 'durable',
      validFrom: kit.local('2026-04-01', '09:00'),
    },
  )

  const studying = kit.record(
    'observation',
    {
      occurredAt: kit.local('2026-09-08', '20:00'),
      domains: [DOMAIN.career],
      entities: [subnetting],
    },
    {
      concept: CONCEPT.learningTopic,
      value: { type: 'entity', value: subnetting },
      method: 'self-report',
    },
  )

  const friction = kit.record(
    'observation',
    { occurredAt: kit.local('2026-09-14', '18:00'), domains: [DOMAIN.home], entities: [kitchen] },
    {
      concept: CONCEPT.homeFriction,
      value: { type: 'text', value: 'the kitchen table is buried again' },
      method: 'self-report',
    },
  )

  const nights = [7.5, 7.75, 8].map((value, offset) =>
    kit.record(
      'observation',
      { occurredAt: kit.local(`2026-09-${13 + offset}`, '07:00'), domains: [DOMAIN.sleep] },
      {
        concept: CONCEPT.sleepHours,
        value: { type: 'number', value, unit: 'hours' },
        method: 'self-report',
      },
    ),
  )

  const energy = kit.record(
    'observation',
    { occurredAt: kit.local('2026-09-15', '17:30'), domains: [DOMAIN.health] },
    { concept: CONCEPT.energy, value: { type: 'scale', value: 4, of: 5 }, method: 'self-report' },
  )

  const time = kit.record(
    'observation',
    { occurredAt: kit.local('2026-09-15', '19:00'), domains: [DOMAIN.direction] },
    {
      concept: CONCEPT.usableTimeTonight,
      value: { type: 'duration', minutes: 60 },
      method: 'self-report',
    },
  )

  const entities: SemanticEntity[] = [child, place, topic, goal]
  const records: CanonicalRecord[] = [
    goalRecord,
    custody,
    studying,
    friction,
    ...nights,
    energy,
    time,
  ]

  // 14 September is the Monday of the same owner-local week as the evening
  // above; 7 September is the Monday before it.
  const setOn = options.setLastWeek ? '2026-09-07' : '2026-09-14'
  const direction = options.direction

  if (direction !== undefined) {
    const value =
      'named' in direction
        ? { type: 'entity' as const, value: entityRef('life-domain', direction.wording) }
        : { type: 'text' as const, value: direction.text }

    if ('named' in direction) {
      entities.push(
        kit.entity({
          kind: 'life-domain',
          label: direction.wording,
          domain: direction.named,
          privacy: 'normal',
        }),
      )
    }

    records.push(
      kit.record(
        'explicit-fact',
        {
          occurredAt: kit.local(setOn, '08:00'),
          domains: [DOMAIN.direction],
          entities: value.type === 'entity' ? [value.value] : [],
        },
        { concept: CONCEPT.weeklyFocus, value },
      ),
    )
  }

  return kit.document({ entities, records, exportedAt: now })
}

function weekPointedAtHome(): Scenario {
  return {
    id: 'week-pointed-at-home',
    title: 'A week pointed at the house',
    summary: 'Four live options and a direction the owner named themselves: a calmer house.',
    proves: 'G-008 — the stored category is home, and arbitration follows it.',
    zone: WEEK_POINTED_AT_ZONE,
    now: WEEK_POINTED_AT_NOW,
    build: () => weekPointedAt({ direction: { named: DOMAIN.home, wording: 'a calmer house' } }),
  }
}

export const SCENARIOS: readonly Scenario[] = [
  subnettingStruggle(),
  sleepDeficitAgainstCareer(),
  restedAgainstCareer(),
  weekPointedAtHome(),
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
