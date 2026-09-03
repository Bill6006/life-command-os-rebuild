import { CONCEPT } from '../domain/concepts'
import { DOMAIN, type LifeDomainId } from '../domain/domains'
import { entityRef, type SemanticEntity } from '../domain/entities'
import { sequentialRecordIds } from '../domain/ids'
import type { CanonicalRecord, DecisionContext, ThreadState } from '../domain/records'
import { addLocalDaysToDayId, localDayId, timeZone } from '../domain/time'
import { dueWindow } from '../domain/windows'
import type { SnapshotWire } from '../memory/snapshot'
import { JOURNEY_SCENARIOS } from './journeys'
import { createKit, pastEpisodeRecords, type Scenario } from './kit'

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
          aspect: 'effect',
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
          aspect: 'effect',
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
          concept: CONCEPT.freeNow,
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
  /**
   * What the CCNA goal actually carries — AUD-0046, AUD-0021.
   *
   * Four combinations from one history, which is the same instrument G-008
   * already uses for the direction: hold the evening still and change exactly
   * one thing. `winter` is the date the owner's own statement names; `soon` is
   * a week out, which is what makes the horizon change the ranking rather than
   * merely being present; `none` is the state every goal was in before this
   * phase and the state most goals will stay in.
   */
  readonly goalHorizon?: 'winter' | 'soon' | 'none'
  /**
   * Whether the certification is broken into its named topics, and whether one
   * of them has already been sat with.
   *
   * `one-done` is what makes coverage of the pieces observable rather than
   * merely stored: with a finished session about subnetting in the record, the
   * piece the move is about stops being the untouched one.
   */
  readonly goalParts?: 'named' | 'one-done' | 'none'
}

export function weekPointedAt(options: WeekDirectionOptions = {}): SnapshotWire {
  const kit = createKit('GN', 'America/Denver', '2026-04-01T12:00:00Z')
  const adaya = entityRef('person', 'Adaya')
  const kitchen = entityRef('place', 'the kitchen')
  const subnetting = entityRef('learning-topic', 'subnetting')
  const vlans = entityRef('learning-topic', 'VLAN trunking')
  const ospf = entityRef('learning-topic', 'OSPF areas')
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

  /*
   * The winter, as a date the app can actually see — AUD-0046, AUD-0021.
   *
   * "Pass the CCNA before the winter" carried its deadline inside the owner's
   * own wording while `GoalRecord.targetWindow` sat empty two layers down, and
   * the career generator raised `goal-behind` on the strength of the goal
   * merely existing. This fixture is where that reads as an evening: the exam
   * is a real date, the certification has named topics, and none of them has
   * had a session — so the career move is behind by something measured rather
   * than by something assumed, and the three non-career directions below have
   * a real winner to overturn.
   */
  const horizonDay =
    options.goalHorizon === 'none'
      ? undefined
      : options.goalHorizon === 'soon'
        ? '2026-09-22'
        : '2026-11-30'

  const goalRecord = kit.record(
    'goal',
    { occurredAt: kit.local('2026-04-01', '09:00'), domains: [DOMAIN.career], entities: [ccna] },
    {
      goal: ccna,
      statement: 'Pass the CCNA before the winter',
      status: 'active',
      ...(horizonDay === undefined
        ? {}
        : {
            targetWindow: dueWindow(kit.local(horizonDay, '00:00'), kit.local(horizonDay, '23:59')),
          }),
      ...(options.goalParts === 'none' ? {} : { parts: [subnetting, vlans, ospf] }),
    },
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
      concept: CONCEPT.freeNow,
      value: { type: 'duration', minutes: 60 },
      method: 'self-report',
    },
  )

  // The other two named pieces of the certification. They exist as entities
  // rather than as bare references so the goal's parts point at real things —
  // and they are added after `topic` so the topic the owner is actually on
  // stays the first learning topic in the index.
  const otherTopics = [vlans, ospf].map((ref) =>
    kit.entity({
      kind: 'learning-topic',
      label: ref.id.slice(ref.id.indexOf(':') + 1),
      domain: DOMAIN.career,
      privacy: 'normal',
      links: [{ relation: 'supports-goal', target: ccna.id }],
      id: ref.id,
    }),
  )

  const entities: SemanticEntity[] = [child, place, topic, goal, ...otherTopics]
  const records: CanonicalRecord[] = [
    goalRecord,
    custody,
    studying,
    friction,
    ...nights,
    energy,
    time,
  ]

  // A finished session about one of the pieces, a fortnight back — far enough
  // that the duplication check has nothing to say about it, so what changes is
  // the goal's own coverage and nothing else.
  if (options.goalParts === 'one-done') {
    const nextId = sequentialRecordIds('GNS')
    records.push(
      ...pastEpisodeRecords(
        kit,
        [
          {
            verb: 'recall-practice',
            object: subnetting,
            domain: DOMAIN.career,
            on: '2026-09-01',
            at: '20:00',
            context: { block: 'evening', weekend: false, strain: 'none', usableMinutes: 60 },
            ending: 'completed',
            effect: 'some',
          },
        ],
        nextId,
      ),
    )
  }

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

// ---------------------------------------------------------------------------
// A history read long after it was written
// ---------------------------------------------------------------------------

/**
 * Three weeks of nothing, on top of a month that had plenty in it.
 *
 * This is the state the owner actually met on a phone, and no fixture covered
 * it: a history loaded in an earlier session, still sitting in the browser
 * database, read at today's real clock. Every fact in it had aged out — sleep
 * stale, the week's direction belonging to a week long gone, the topic and the
 * cluttered kitchen both past their horizons — while the records themselves
 * were all still there.
 *
 * It is not a contrived case. It is what happens after a few days away, and it
 * is the one where the temptation to say something anyway is strongest: there
 * is a great deal of history on the screen and none of it is about tonight. The
 * right answer is to say so and ask one question, which is what the app does.
 */
function goneQuiet(): Scenario {
  const kit = createKit('GQ', 'America/Denver', '2026-03-01T12:00:00Z')
  const adaya = entityRef('person', 'Adaya')
  const custody = entityRef('relationship', 'Full custody')
  const subnetting = entityRef('learning-topic', 'subnetting')
  // Three weeks after the last thing anyone wrote down.
  const now = kit.local('2026-04-18', '16:30')

  return {
    id: 'gone-quiet',
    title: 'A month of history, three weeks ago',
    summary: 'Every reading is weeks old. The custody arrangement is not, and does not expire.',
    proves: 'Stale evidence expires; durable context does not, and is never re-asked.',
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
      const topic = kit.entity({
        kind: 'learning-topic',
        label: 'subnetting',
        domain: DOMAIN.career,
        privacy: 'normal',
      })
      const kitchen = kit.entity({
        kind: 'place',
        label: 'the kitchen',
        domain: DOMAIN.home,
        privacy: 'normal',
      })

      /*
       * The arrangement, which does not go quiet with everything else.
       *
       * This scenario is meant to be the owner's own history after a few days
       * away, and the first version of it left this out — so the app appeared
       * to have forgotten a settled full-custody arrangement and asked whether
       * his daughter was with him. It had not forgotten anything; there was
       * nothing there to forget. A fixture that misrepresents the owner's life
       * makes correct behaviour look broken, which is section 60's warning read
       * from the other side.
       *
       * Durable context does not age (D-012), so these two stay authoritative
       * while every point-in-time reading around them expires.
       */
      const standing = kit.record(
        'context',
        {
          occurredAt: kit.local('2026-03-01', '09:00'),
          domains: [DOMAIN.fatherhood],
          entities: [adaya, custody],
        },
        {
          concept: CONCEPT.custodyArrangement,
          value: { type: 'text', value: 'full custody' },
          durability: 'durable',
          validFrom: kit.local('2026-03-01', '09:00'),
        },
      )

      const present = kit.record(
        'context',
        {
          occurredAt: kit.local('2026-03-01', '09:00'),
          domains: [DOMAIN.fatherhood],
          entities: [adaya],
        },
        {
          concept: CONCEPT.childPresent,
          value: { type: 'boolean', value: true },
          durability: 'durable',
          validFrom: kit.local('2026-03-01', '09:00'),
        },
      )

      const nights = Array.from({ length: 10 }, (_, offset) => {
        const day = String(18 + offset).padStart(2, '0')
        return kit.record(
          'observation',
          { occurredAt: kit.local(`2026-03-${day}`, '07:00'), domains: [DOMAIN.sleep] },
          {
            concept: CONCEPT.sleepHours,
            value: { type: 'number', value: 6.5 + ((offset * 3) % 4) / 4, unit: 'hours' },
            method: 'self-report',
          },
        )
      })

      const evenings = [20, 24, 27].map((day) =>
        kit.record(
          'relationship-event',
          {
            occurredAt: kit.local(`2026-03-${day}`, '19:30'),
            domains: [DOMAIN.fatherhood],
            entities: [adaya],
          },
          { withEntity: adaya, nature: 'Made pancakes', quality: 'positive' },
        ),
      )

      const studying = kit.record(
        'observation',
        {
          occurredAt: kit.local('2026-03-22', '20:00'),
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
        {
          occurredAt: kit.local('2026-03-25', '18:00'),
          domains: [DOMAIN.home],
          entities: [entityRef('place', 'the kitchen')],
        },
        {
          concept: CONCEPT.homeFriction,
          value: { type: 'text', value: 'the kitchen table is buried again' },
          method: 'self-report',
        },
      )

      const direction = kit.record(
        'explicit-fact',
        { occurredAt: kit.local('2026-03-23', '08:00'), domains: [DOMAIN.direction] },
        { concept: CONCEPT.weeklyFocus, value: { type: 'text', value: 'home' } },
      )

      return kit.document({
        entities: [child, arrangement, topic, kitchen],
        records: [standing, present, ...nights, ...evenings, studying, friction, direction],
        exportedAt: now,
      })
    },
  }
}

// ---------------------------------------------------------------------------
// G-004 — a social opportunity
// ---------------------------------------------------------------------------

/**
 * Good energy, somewhere to be, and a reason to want it.
 *
 * G-004 asks for a specific natural social move to be able to win — a
 * conversation started, a genuine compliment — with no quota and no
 * gamification, and for the outcome to record comfort as well as result.
 *
 * The last part is why this scenario is worth having rather than just testing:
 * section 10 is the domain most easily got wrong. "Approach 3/3 today" is what
 * an app produces when it counts social contact instead of understanding it,
 * and there is nothing in the engine that counts — the move is here because a
 * stated goal, a place the owner goes and a reading of how sociable they feel
 * all point the same way this afternoon.
 */
function socialOpportunity(): Scenario {
  const kit = createKit('GS', 'America/Denver', '2026-06-01T12:00:00Z')
  const easier = entityRef('goal', 'talking to people I do not know')
  const now = kit.local('2026-07-11', '15:30')

  return {
    id: 'social-opening',
    title: 'A Saturday with people in it',
    summary: 'Rested, sociable, a place he actually goes, and a goal he set himself.',
    proves: 'G-004 — a specific social move can win, with no quota anywhere near it.',
    zone: kit.zone,
    now,
    build() {
      const place = kit.entity({
        kind: 'place',
        label: 'the climbing gym',
        domain: DOMAIN.social,
        privacy: 'normal',
      })
      const goal = kit.entity({
        kind: 'goal',
        label: 'talking to people I do not know',
        domain: DOMAIN.social,
        privacy: 'normal',
      })

      const goalRecord = kit.record(
        'goal',
        {
          occurredAt: kit.local('2026-06-01', '09:00'),
          domains: [DOMAIN.social],
          entities: [easier],
        },
        {
          goal: easier,
          statement: 'Get easier with people I do not know',
          status: 'active',
        },
      )

      const nights = [7.5, 8, 7.75].map((value, offset) =>
        kit.record(
          'observation',
          {
            occurredAt: kit.local(`2026-07-${String(9 + offset).padStart(2, '0')}`, '07:00'),
            domains: [DOMAIN.sleep],
          },
          {
            concept: CONCEPT.sleepHours,
            value: { type: 'number', value, unit: 'hours' },
            method: 'self-report',
          },
        ),
      )

      const energy = kit.record(
        'observation',
        { occurredAt: kit.local('2026-07-11', '14:00'), domains: [DOMAIN.health] },
        {
          concept: CONCEPT.energy,
          value: { type: 'scale', value: 4, of: 5 },
          method: 'self-report',
        },
      )

      const sociable = kit.record(
        'observation',
        { occurredAt: kit.local('2026-07-11', '14:00'), domains: [DOMAIN.social] },
        {
          concept: CONCEPT.socialEnergy,
          value: { type: 'scale', value: 4, of: 5 },
          method: 'self-report',
        },
      )

      const time = kit.record(
        'observation',
        { occurredAt: kit.local('2026-07-11', '15:00'), domains: [DOMAIN.direction] },
        {
          concept: CONCEPT.freeNow,
          value: { type: 'duration', minutes: 120 },
          method: 'self-report',
        },
      )

      const weekly = kit.record(
        'explicit-fact',
        {
          occurredAt: kit.local('2026-07-06', '08:00'),
          domains: [DOMAIN.direction],
          entities: [entityRef('life-domain', 'getting out more')],
        },
        {
          concept: CONCEPT.weeklyFocus,
          value: { type: 'entity', value: entityRef('life-domain', 'getting out more') },
        },
      )

      const direction = kit.entity({
        kind: 'life-domain',
        label: 'getting out more',
        domain: DOMAIN.social,
        privacy: 'normal',
      })

      return kit.document({
        entities: [place, goal, direction],
        records: [goalRecord, ...nights, energy, sociable, time, weekly],
        exportedAt: now,
      })
    },
  }
}

// ---------------------------------------------------------------------------
// G-014 — no action is a real answer
// ---------------------------------------------------------------------------

/**
 * A Thursday where the honest answer is that nothing needs to happen.
 *
 * G-014 asks for a stable state in which no move has positive net value, and
 * the trap is producing one by starving the engine — a history with nothing in
 * it says nothing for a much less interesting reason. So this one knows plenty:
 * three good nights, energy, a body that is a little stiff, and exactly how
 * much of the evening is left. It has walked twice already this week and
 * neither walk did much. There are fifteen minutes.
 *
 * Everything the app can see says the same thing, which is that the owner is
 * fine and a fifteen-minute version of something already tried twice is not
 * worth the asking. Section 19: a valid decision may be wait, rest, continue,
 * stop, or no additional move.
 */
function settledEvening(): Scenario {
  const kit = createKit('GV', 'America/Denver', '2026-03-01T12:00:00Z')
  const nextId = sequentialRecordIds('GVE')
  const walk = entityRef('routine', 'a walk')
  const now = kit.local('2026-03-19', '20:30')

  return {
    id: 'settled-evening',
    title: 'A Thursday with nothing needing doing',
    summary:
      'Slept well, a bit stiff, a quarter of an hour free, and two walks this week that did nothing.',
    proves:
      'G-014 — no action is a real answer, reached from a full picture rather than an empty one.',
    zone: kit.zone,
    now,
    build() {
      const nights = [7.75, 8, 7.5].map((value, offset) =>
        kit.record(
          'observation',
          { occurredAt: kit.local(`2026-03-${17 + offset}`, '07:00'), domains: [DOMAIN.sleep] },
          {
            concept: CONCEPT.sleepHours,
            value: { type: 'number', value, unit: 'hours' },
            method: 'self-report',
          },
        ),
      )

      const energy = kit.record(
        'observation',
        { occurredAt: kit.local('2026-03-19', '19:00'), domains: [DOMAIN.health] },
        {
          concept: CONCEPT.energy,
          value: { type: 'scale', value: 3, of: 5 },
          method: 'self-report',
        },
      )

      // Stiff rather than sore: not enough to be what is in the way — the
      // fifteen minutes are that — and enough that a third walk this week is
      // not the thing to spend them on.
      const soreness = kit.record(
        'observation',
        { occurredAt: kit.local('2026-03-19', '19:00'), domains: [DOMAIN.health] },
        {
          concept: CONCEPT.soreness,
          value: { type: 'scale', value: 3, of: 5 },
          method: 'self-report',
        },
      )

      const time = kit.record(
        'observation',
        { occurredAt: kit.local('2026-03-19', '20:15'), domains: [DOMAIN.direction] },
        {
          concept: CONCEPT.freeNow,
          value: { type: 'duration', minutes: 15 },
          method: 'self-report',
        },
      )

      // Two walks earlier in the week, both of which changed nothing. Old
      // enough that the same-day guard does not catch them, recent enough that
      // offering a third is repetition rather than a fresh idea.
      const walks = pastEpisodeRecords(
        kit,
        [17, 18].map((day) => ({
          verb: 'move' as const,
          object: walk,
          domain: DOMAIN.health,
          on: `2026-03-${day}`,
          at: '19:00',
          context: {
            block: 'evening' as const,
            weekend: false,
            strain: 'none' as const,
            usableMinutes: 45,
          },
          ending: 'completed' as const,
          effect: 'little' as const,
        })),
        nextId,
      )

      return kit.document({
        entities: [],
        records: [...nights, energy, soreness, time, ...walks],
        exportedAt: now,
      })
    },
  }
}

// ---------------------------------------------------------------------------
// What a month of outcomes changes
// ---------------------------------------------------------------------------

/**
 * The same evening the engine has always been able to reason about, with a
 * month behind it of what actually happened.
 *
 * This is the phase, on one screen. Clearing the kitchen has helped four times
 * in evenings like this one and the app says so out loud, in a line the owner
 * can disagree with. Walking has been tried twice and did nothing much.
 * Studying keeps getting started and interrupted — which is a fact about his
 * evenings, not about studying, and lands where facts about evenings land.
 *
 * Nothing in it is a special case. Take the outcomes away and the same history
 * produces a different answer, which is the whole point.
 */
function whatWorked(): Scenario {
  const kit = createKit('GW', 'America/Denver', '2026-01-05T12:00:00Z')
  const nextId = sequentialRecordIds('GWE')
  const kitchen = entityRef('place', 'the kitchen')
  const walk = entityRef('routine', 'a walk')
  const subnetting = entityRef('learning-topic', 'subnetting')
  const now = kit.local('2026-02-19', '19:30')

  const anEvening = {
    block: 'evening' as const,
    weekend: false,
    strain: 'none' as const,
    usableMinutes: 60,
  }

  return {
    id: 'what-worked',
    title: 'A month of what actually worked',
    summary:
      'Four evenings clearing the kitchen that helped, two walks that did not, and a lab that keeps getting interrupted.',
    proves:
      'Outcomes change the answer, the app says what it is resting on, and the owner can disagree.',
    zone: kit.zone,
    now,
    build() {
      const place = kit.entity({
        kind: 'place',
        label: 'the kitchen',
        domain: DOMAIN.home,
        privacy: 'normal',
      })
      /*
       * A topic, deliberately with no goal behind it.
       *
       * A live CCNA goal would put a thumb on the scale for studying, and this
       * scenario is about what a month of outcomes does rather than about a
       * goal outrunning them. The two career histories carry that contest
       * already.
       */
      const topic = kit.entity({
        kind: 'learning-topic',
        label: 'subnetting',
        domain: DOMAIN.career,
        privacy: 'normal',
      })

      const studying = kit.record(
        'observation',
        {
          occurredAt: kit.local('2026-02-09', '20:00'),
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
        {
          occurredAt: kit.local('2026-02-18', '18:00'),
          domains: [DOMAIN.home],
          entities: [kitchen],
        },
        {
          concept: CONCEPT.homeFriction,
          value: { type: 'text', value: 'the kitchen table is buried again' },
          method: 'self-report',
        },
      )

      const nights = [7.5, 7.75, 8].map((value, offset) =>
        kit.record(
          'observation',
          { occurredAt: kit.local(`2026-02-${17 + offset}`, '07:00'), domains: [DOMAIN.sleep] },
          {
            concept: CONCEPT.sleepHours,
            value: { type: 'number', value, unit: 'hours' },
            method: 'self-report',
          },
        ),
      )

      const energy = kit.record(
        'observation',
        { occurredAt: kit.local('2026-02-19', '18:30'), domains: [DOMAIN.health] },
        {
          concept: CONCEPT.energy,
          value: { type: 'scale', value: 3, of: 5 },
          method: 'self-report',
        },
      )

      const time = kit.record(
        'observation',
        { occurredAt: kit.local('2026-02-19', '19:00'), domains: [DOMAIN.direction] },
        {
          concept: CONCEPT.freeNow,
          value: { type: 'duration', minutes: 60 },
          method: 'self-report',
        },
      )

      const past = pastEpisodeRecords(
        kit,
        [
          // Four evenings clearing the kitchen, all of which helped.
          ...[2, 6, 10, 14].map((day) => ({
            verb: 'reset-space' as const,
            object: kitchen,
            domain: DOMAIN.home,
            on: `2026-02-${String(day).padStart(2, '0')}`,
            context: anEvening,
            ending: 'completed' as const,
            effect: 'real' as const,
          })),
          // Two walks that did nothing much.
          ...[4, 11].map((day) => ({
            verb: 'move' as const,
            object: walk,
            domain: DOMAIN.health,
            on: `2026-02-${String(day).padStart(2, '0')}`,
            context: anEvening,
            ending: 'completed' as const,
            effect: 'little' as const,
          })),
          // A lab twice interrupted. Evidence about his evenings rather than
          // about labs, and it lands there.
          ...[5, 12].map((day) => ({
            verb: 'hands-on-lab' as const,
            object: subnetting,
            domain: DOMAIN.career,
            on: `2026-02-${String(day).padStart(2, '0')}`,
            at: '17:00',
            context: { ...anEvening, block: 'afternoon' as const },
            ending: 'unable-now' as const,
          })),
        ],
        nextId,
      )

      return kit.document({
        entities: [place, topic],
        records: [studying, friction, ...nights, energy, time, ...past],
        exportedAt: now,
      })
    },
  }
}

// ---------------------------------------------------------------------------
// G-003 — a growth area, and evidence that it has moved on
// ---------------------------------------------------------------------------

/**
 * Ordering her own food, three times running.
 *
 * G-003 asks for four things: a natural practice opportunity can be suggested,
 * the outcome updates the evidence, repeated evidence can produce a suggested
 * growth-status update, and no stage jump comes from one event. The history is
 * built so all four are visible on one screen — three occasions spread over
 * three weeks in June, each finished and each answered "all the way", nothing
 * since, and then a Saturday in July with her in the house.
 *
 * The gap is G-003's stated input: "a child growth skill has stale/limited
 * evidence". Section 8 gives the same example in its own words — a child's
 * developmental skill may need periodic evidence — so three weeks of silence is
 * why this is being suggested at all, and the trigger says so.
 *
 * The spacing is not decoration. Three evenings in a row would be caught by the
 * duplication dimension and would also be a worse claim: section 9's rule is
 * that a growth-stage change is not invented from one event, and evidence
 * gathered across three weeks of ordinary life is what makes the suggestion
 * worth putting in front of him.
 */
function growthEvidence(): Scenario {
  const kit = createKit('GG', 'America/Denver', '2026-06-01T12:00:00Z')
  const nextId = sequentialRecordIds('GGX')
  const adaya = entityRef('person', 'Adaya')
  const custody = entityRef('relationship', 'Full custody')
  const ordering = entityRef('development-skill', 'ordering her own food')
  const now = kit.local('2026-07-11', '17:00')

  return {
    id: 'growth-evidence',
    title: 'Three times running, and the app noticed',
    summary: 'Three good occasions in June, nothing since, and a change worth asking about.',
    proves: 'G-003 — repeated evidence proposes a growth update, and one event never could.',
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
      // The link is what makes the skill hers rather than a floating noun. The
      // renderer walks it, and so does the suggestion below — "she" has to be
      // somebody.
      const skill = kit.entity({
        kind: 'development-skill',
        label: 'ordering her own food',
        domain: DOMAIN.fatherhood,
        privacy: 'child-family-sensitive',
        links: [{ relation: 'about-person', target: adaya.id }],
      })

      const standing = kit.record(
        'context',
        {
          occurredAt: kit.local('2026-01-01', '09:00'),
          domains: [DOMAIN.fatherhood],
          entities: [adaya, custody],
        },
        {
          concept: CONCEPT.custodyArrangement,
          value: { type: 'text', value: 'full custody' },
          durability: 'durable',
          validFrom: kit.local('2026-01-01', '09:00'),
        },
      )

      const present = kit.record(
        'context',
        {
          occurredAt: kit.local('2026-01-01', '09:00'),
          domains: [DOMAIN.fatherhood],
          entities: [adaya],
        },
        {
          concept: CONCEPT.childPresent,
          value: { type: 'boolean', value: true },
          durability: 'durable',
          validFrom: kit.local('2026-01-01', '09:00'),
        },
      )

      const nights = ['09', '10', '11'].map((day) =>
        kit.record(
          'observation',
          { occurredAt: kit.local(`2026-07-${day}`, '07:00'), domains: [DOMAIN.sleep] },
          {
            concept: CONCEPT.sleepHours,
            value: { type: 'number', value: 7.75, unit: 'hours' },
            method: 'self-report',
          },
        ),
      )

      const energy = kit.record(
        'observation',
        { occurredAt: kit.local('2026-07-11', '15:00'), domains: [DOMAIN.health] },
        {
          concept: CONCEPT.energy,
          value: { type: 'scale', value: 3, of: 5 },
          method: 'self-report',
        },
      )

      const time = kit.record(
        'observation',
        { occurredAt: kit.local('2026-07-11', '16:00'), domains: [DOMAIN.direction] },
        {
          concept: CONCEPT.freeNow,
          value: { type: 'duration', minutes: 120 },
          method: 'self-report',
        },
      )

      const anAfternoon = {
        block: 'afternoon' as const,
        weekend: true,
        strain: 'none' as const,
        childPresent: true,
        usableMinutes: 120,
      }

      /*
       * Three occasions across two settings — AUD-0017.
       *
       * The spread is what turns three good goes into a claim about
       * generalisation rather than about repetition. Three times three weeks
       * apart at the same restaurant with her father at the table supports "she
       * can do this here, with me"; twice somewhere new is what the app may
       * call settled (Stokes & Baer, 1977).
       *
       * `tests/synthetic/g003-growth-evidence.test.ts` runs the same history
       * with all three in one place and asserts the app says so instead.
       */
      const past = pastEpisodeRecords(
        kit,
        (
          [
            ['2026-06-06', 'somewhere-familiar'],
            ['2026-06-13', 'somewhere-new'],
            ['2026-06-20', 'somewhere-new'],
          ] as const
        ).map(([on, setting]) => ({
          verb: 'growth-opportunity' as const,
          object: ordering,
          subject: ordering,
          domain: DOMAIN.fatherhood,
          on,
          at: '12:30',
          context: anAfternoon,
          ending: 'completed' as const,
          result: 'all' as const,
          setting,
        })),
        nextId,
      )

      return kit.document({
        entities: [child, arrangement, skill],
        records: [standing, present, ...nights, energy, time, ...past],
        exportedAt: now,
      })
    },
  }
}

// ---------------------------------------------------------------------------
// G-007 — coverage freshness
// ---------------------------------------------------------------------------

/**
 * Seven weeks since anything about the studying.
 *
 * G-007's input is "the owner has not manually opened a domain for weeks", and
 * the expectation is that the app works out whether what it knows is still
 * enough, creates a natural refresh path if it is not, and does not leave the
 * domain silently frozen.
 *
 * The shape of this history is what makes it a test rather than a demo:
 * **everything else is current.** Sleep is answered, energy is answered, the
 * evening is known. Only career has gone quiet, and it is a domain the owner
 * has plainly not abandoned — the CCNA goal is live and the exam is still
 * coming. An app that says nothing here is doing exactly what section 63
 * forbids: carrying on as though a seven-week-old picture were today's.
 */
function careerGoneQuiet(): Scenario {
  const kit = createKit('GQ', 'America/Denver', '2026-05-01T12:00:00Z')
  const subnetting = entityRef('learning-topic', 'subnetting')
  const ccna = entityRef('goal', 'pass the CCNA')
  const now = kit.local('2026-07-14', '19:30')

  return {
    id: 'career-gone-quiet',
    title: 'Everything current except the studying',
    summary: 'Sleep and energy are answered today. Nothing about the CCNA since late May.',
    proves: 'G-007 — a quiet domain is noticed, and given a way back rather than left frozen.',
    zone: kit.zone,
    now,
    build() {
      const topic = kit.entity({
        kind: 'learning-topic',
        label: 'subnetting',
        domain: DOMAIN.career,
        privacy: 'normal',
      })
      const goal = kit.entity({
        kind: 'goal',
        label: 'pass the CCNA',
        domain: DOMAIN.career,
        privacy: 'normal',
      })

      // The goal is live and says so. This is what makes the silence matter:
      // coverage reads importance off the owner's own commitments, so a domain
      // he has walked away from stays quiet and one he is still aiming at does
      // not.
      const goalRecord = kit.record(
        'goal',
        {
          occurredAt: kit.local('2026-05-02', '09:00'),
          domains: [DOMAIN.career],
          entities: [ccna],
        },
        { goal: ccna, statement: 'Pass the CCNA', status: 'active' },
      )

      const lastMention = kit.record(
        'observation',
        {
          occurredAt: kit.local('2026-05-26', '20:00'),
          domains: [DOMAIN.career],
          entities: [subnetting],
        },
        {
          concept: CONCEPT.learningTopic,
          value: { type: 'entity', value: subnetting },
          method: 'self-report',
        },
      )

      const nights = ['11', '12', '13', '14'].map((day) =>
        kit.record(
          'observation',
          { occurredAt: kit.local(`2026-07-${day}`, '07:00'), domains: [DOMAIN.sleep] },
          {
            concept: CONCEPT.sleepHours,
            value: { type: 'number', value: 7.5, unit: 'hours' },
            method: 'self-report',
          },
        ),
      )

      const energy = kit.record(
        'observation',
        { occurredAt: kit.local('2026-07-14', '18:00'), domains: [DOMAIN.health] },
        {
          concept: CONCEPT.energy,
          value: { type: 'scale', value: 3, of: 5 },
          method: 'self-report',
        },
      )

      const soreness = kit.record(
        'observation',
        { occurredAt: kit.local('2026-07-14', '18:00'), domains: [DOMAIN.health] },
        {
          concept: CONCEPT.soreness,
          value: { type: 'scale', value: 1, of: 5 },
          method: 'self-report',
        },
      )

      const time = kit.record(
        'observation',
        { occurredAt: kit.local('2026-07-14', '19:00'), domains: [DOMAIN.direction] },
        {
          concept: CONCEPT.freeNow,
          value: { type: 'duration', minutes: 60 },
          method: 'self-report',
        },
      )

      return kit.document({
        entities: [topic, goal],
        records: [goalRecord, lastMention, ...nights, energy, soreness, time],
        exportedAt: now,
      })
    },
  }
}

// ---------------------------------------------------------------------------
// Section 51 — a long history, where context and later evidence change the story
// ---------------------------------------------------------------------------

/**
 * Nine months of evenings, and three different things the record says.
 *
 * Phase 6's gate asks for a synthetic history long enough to prove two claims a
 * month of evidence cannot: *context and combinations can change a pattern's
 * interpretation*, and *counterexamples and later contradictory evidence can
 * weaken or reverse an earlier learned pattern*. Both need a run with two
 * distinguishable halves in it, so this history is built around three
 * deliberately different shapes.
 *
 * **Clearing the kitchen splits on the evening rather than on the move.** Six
 * weekday evenings alone, every one of which helped; six weekend evenings with
 * his daughter in the house, four of which did not. The flat average across all
 * twelve — two thirds — is true, and is the least informative reading
 * available: it describes an evening that never happened. Both halves clear the
 * minimum denominator on their own, which is what makes the split sayable
 * rather than a story about one good week.
 *
 * **Walking reverses.** Six through the spring, every one of which made a
 * difference; four through the autumn, one of which he said backfired. Nothing
 * about the move changed. What the app believes about it has to be able to move
 * back, and the same arithmetic that built the belief is what pulls it down —
 * section 20's "learned effects should be reversible when later evidence
 * contradicts them", with enough on both sides to tell a reversal from a bad
 * week.
 *
 * **Labs are not a question about labs.** Four of six could not be done at all.
 * That is evidence about his afternoons, and it lands on follow-through where
 * section 20 puts it, never on whether a lab is worth doing.
 *
 * **Reaching out answers two questions at once.** It is the only history in the
 * library where a result and a comfort are both recorded for the same episodes,
 * and they deliberately disagree: the easiest one to make was the one that got
 * nothing back. A single "success" figure would have to pick one of those and
 * call it the answer, which is the collapse DEF-0020 exists to prevent.
 *
 * The sleep readings run the whole span so a trajectory has something real to
 * describe, and the custody arrangement is written as durable context partway
 * through so a life season has a start date the owner actually recorded rather
 * than one the app inferred.
 */
function aLongRun(): Scenario {
  const kit = createKit('GQ', 'America/Denver', '2026-01-02T12:00:00Z')
  const nextId = sequentialRecordIds('GQX')
  const kitchen = entityRef('place', 'the kitchen')
  const subnetting = entityRef('learning-topic', 'subnetting')
  const walk = entityRef('routine', 'a walk')
  const sister = entityRef('person', 'your sister')
  const adaya = entityRef('person', 'Adaya')
  const now = kit.local('2026-11-14', '19:30')

  const weekdayAlone: DecisionContext = {
    block: 'evening',
    weekend: false,
    strain: 'none',
    childPresent: false,
    usableMinutes: 60,
  }
  const weekendWithHer: DecisionContext = {
    block: 'evening',
    weekend: true,
    strain: 'none',
    childPresent: true,
    usableMinutes: 60,
  }

  return {
    id: 'long-run',
    title: 'Nine months of evenings',
    summary:
      'Twelve evenings clearing the kitchen, ten walks that stopped working, and six labs that mostly did not happen.',
    proves:
      'Section 51 — context changes what a pattern means, and later evidence can reverse an earlier one.',
    zone: kit.zone,
    now,
    build() {
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
      })
      const child = kit.entity({
        kind: 'person',
        label: 'Adaya',
        domain: DOMAIN.fatherhood,
        privacy: 'child-family-sensitive',
      })
      const person = kit.entity({
        kind: 'person',
        label: 'your sister',
        domain: DOMAIN.social,
        privacy: 'normal',
      })

      /*
       * A standing arrangement with a date on it.
       *
       * Written as durable context rather than as a fact, for the reason D-081
       * gives: a fact would outrank every context record for this concept
       * forever, and the mechanism that lets a week away override a settled
       * arrangement depends on the override arriving as context.
       */
      const custody = kit.record(
        'context',
        {
          occurredAt: kit.local('2026-05-01', '09:00'),
          domains: [DOMAIN.fatherhood],
          entities: [adaya],
          privacy: 'child-family-sensitive',
        },
        {
          concept: CONCEPT.custodyArrangement,
          value: { type: 'text', value: 'full custody' },
          durability: 'durable',
          validFrom: kit.local('2026-05-01', '09:00'),
        },
      )

      /*
       * Sleep across the whole span: short through the winter, better since.
       *
       * Deterministic rather than random. A fixture that changes between runs
       * is a fixture nobody can reason about, and section 60 warns that a
       * fixture can quietly make wrong logic look correct.
       */
      const nights: readonly (readonly [string, number])[] = [
        ['2026-01-08', 6],
        ['2026-01-22', 6.25],
        ['2026-02-05', 5.75],
        ['2026-02-19', 6.5],
        ['2026-03-05', 6],
        ['2026-03-19', 6.25],
        ['2026-06-04', 7.5],
        ['2026-07-02', 7.75],
        ['2026-08-06', 7.25],
        ['2026-09-03', 7.75],
        ['2026-10-08', 8],
        ['2026-11-12', 7.5],
      ]

      const sleep = nights.map(([day, hours]) =>
        kit.record(
          'observation',
          { occurredAt: kit.local(day, '07:00'), domains: [DOMAIN.sleep] },
          {
            concept: CONCEPT.sleepHours,
            value: { type: 'number', value: hours, unit: 'hours' },
            method: 'self-report',
          },
        ),
      )

      const friction = kit.record(
        'observation',
        {
          occurredAt: kit.local('2026-11-14', '18:00'),
          domains: [DOMAIN.home],
          entities: [kitchen],
        },
        {
          concept: CONCEPT.homeFriction,
          value: { type: 'text', value: 'the kitchen table is buried again' },
          method: 'self-report',
        },
      )

      const studying = kit.record(
        'observation',
        {
          occurredAt: kit.local('2026-11-10', '20:00'),
          domains: [DOMAIN.career],
          entities: [subnetting],
        },
        {
          concept: CONCEPT.learningTopic,
          value: { type: 'entity', value: subnetting },
          method: 'self-report',
        },
      )

      const energy = kit.record(
        'observation',
        { occurredAt: kit.local('2026-11-14', '18:30'), domains: [DOMAIN.health] },
        {
          concept: CONCEPT.energy,
          value: { type: 'scale', value: 4, of: 5 },
          method: 'self-report',
        },
      )

      const time = kit.record(
        'observation',
        { occurredAt: kit.local('2026-11-14', '19:00'), domains: [DOMAIN.direction] },
        {
          concept: CONCEPT.freeNow,
          value: { type: 'duration', minutes: 60 },
          method: 'self-report',
        },
      )

      const past = pastEpisodeRecords(
        kit,
        [
          // Weekday evenings alone: clearing the kitchen helped, every time.
          ...[
            '2026-03-03',
            '2026-04-07',
            '2026-05-12',
            '2026-06-16',
            '2026-08-11',
            '2026-09-15',
          ].map((on) => ({
            verb: 'reset-space' as const,
            object: kitchen,
            domain: DOMAIN.home,
            on,
            context: weekdayAlone,
            ending: 'completed' as const,
            result: 'all' as const,
            effect: 'real' as const,
          })),
          // Weekend evenings with her in the house: mostly it did not.
          ...['2026-03-07', '2026-04-11', '2026-05-16', '2026-06-20'].map((on) => ({
            verb: 'reset-space' as const,
            object: kitchen,
            domain: DOMAIN.home,
            on,
            context: weekendWithHer,
            ending: 'completed' as const,
            result: 'part' as const,
            effect: 'little' as const,
          })),
          ...['2026-08-15', '2026-09-19'].map((on) => ({
            verb: 'reset-space' as const,
            object: kitchen,
            domain: DOMAIN.home,
            on,
            context: weekendWithHer,
            ending: 'completed' as const,
            result: 'all' as const,
            effect: 'some' as const,
          })),
          // Six walks through the spring, all of which did something.
          ...[
            '2026-01-14',
            '2026-02-04',
            '2026-02-25',
            '2026-03-18',
            '2026-04-15',
            '2026-05-06',
          ].map((on) => ({
            verb: 'move' as const,
            object: walk,
            domain: DOMAIN.health,
            on,
            context: weekdayAlone,
            ending: 'completed' as const,
            effect: 'real' as const,
          })),
          // Four through the autumn that did not, one of them badly.
          {
            verb: 'move' as const,
            object: walk,
            domain: DOMAIN.health,
            on: '2026-09-09',
            context: weekdayAlone,
            ending: 'completed' as const,
            effect: 'some' as const,
          },
          ...['2026-10-07', '2026-10-28'].map((on) => ({
            verb: 'move' as const,
            object: walk,
            domain: DOMAIN.health,
            on,
            context: weekdayAlone,
            ending: 'completed' as const,
            effect: 'little' as const,
          })),
          {
            verb: 'move' as const,
            object: walk,
            domain: DOMAIN.health,
            on: '2026-11-04',
            context: weekdayAlone,
            ending: 'completed' as const,
            effect: 'harm' as const,
          },
          // Labs: four of six never happened at all.
          ...['2026-04-01', '2026-05-20', '2026-07-08', '2026-10-14'].map((on) => ({
            verb: 'hands-on-lab' as const,
            object: subnetting,
            domain: DOMAIN.career,
            on,
            at: '17:00',
            context: { ...weekdayAlone, block: 'afternoon' as const },
            ending: 'unable-now' as const,
          })),
          ...['2026-06-10', '2026-09-23'].map((on) => ({
            verb: 'hands-on-lab' as const,
            object: subnetting,
            domain: DOMAIN.career,
            on,
            at: '17:00',
            context: { ...weekdayAlone, block: 'afternoon' as const },
            ending: 'completed' as const,
            result: 'part' as const,
          })),
          // Reaching out, where the result and the comfort disagree.
          ...['2026-06-02', '2026-07-14'].map((on) => ({
            verb: 'reach-out' as const,
            object: sister,
            domain: DOMAIN.social,
            on,
            context: weekdayAlone,
            ending: 'completed' as const,
            result: 'all' as const,
            comfort: 'hard' as const,
          })),
          ...['2026-08-18', '2026-09-29'].map((on) => ({
            verb: 'reach-out' as const,
            object: sister,
            domain: DOMAIN.social,
            on,
            context: weekdayAlone,
            ending: 'completed' as const,
            result: 'part' as const,
            comfort: 'awkward' as const,
          })),
          {
            verb: 'reach-out' as const,
            object: sister,
            domain: DOMAIN.social,
            on: '2026-10-20',
            context: weekdayAlone,
            ending: 'completed' as const,
            result: 'none' as const,
            comfort: 'easy' as const,
          },
        ],
        nextId,
      )

      return kit.document({
        entities: [place, topic, child, person],
        records: [custody, ...sleep, friction, studying, energy, time, ...past],
        exportedAt: now,
      })
    },
  }
}

// ---------------------------------------------------------------------------
// D-089 — a relationship the app can observe, and a comparison group
// ---------------------------------------------------------------------------

/**
 * Two months of evenings where the app took the readings itself.
 *
 * This is the history QA-A1 said the library did not have, and could not have
 * had: on every other scenario, every figure Insights prints is a tally of
 * something the owner was asked to judge. Nothing here asks him to judge
 * anything. He answers *how much energy have you got left* — a fact only he
 * holds — twice on an ordinary evening, and the app works out the rest.
 *
 * **Fourteen evenings with a walk and fourteen without**, built to the same
 * shape: a reading around six, and another around half past eight. What differs
 * is whether a walk was completed in between. On ten of the fourteen walk
 * evenings the later reading is higher; on four of the fourteen without, it is.
 * That is a real comparison and it is the only kind of thing this app may call
 * a relationship — never *walking gives you energy*, only *energy has more
 * often been higher afterwards than without it*.
 *
 * Three deliberate complications, because a history that only demonstrates the
 * happy path proves the happy path:
 *
 * - **two evenings where something else also happened.** A walk *and* fifteen
 *   minutes clearing the kitchen fall between the two readings, so neither
 *   evening is evidence about walks and neither is a clean evening without one.
 *   They are discarded, counted as discarded, and said out loud on the card.
 * - **a run of soreness readings** that go up and down with no move between
 *   them at all, so a second dimension exists that produces no finding — the
 *   comparison group is everything and one dimension moving is not a pattern.
 * - **not one `effect` answer anywhere in the file.** The engine has to learn
 *   from this history without a single causal judgment, which is the case
 *   whose absence let QA-A1 through.
 */
function observedEvenings(): Scenario {
  const kit = createKit('GR', 'America/Denver', '2026-03-01T12:00:00Z')
  const nextId = sequentialRecordIds('GRX')
  const walk = entityRef('routine', 'a walk')
  const kitchen = entityRef('place', 'the kitchen')
  const now = kit.local('2026-05-02', '18:10')

  const anEvening: DecisionContext = {
    block: 'evening',
    weekend: false,
    strain: 'none',
    childPresent: false,
    usableMinutes: 60,
  }

  /** An energy reading, on the 0–5 scale the guide's own question writes. */
  const energyAt = (day: string, time: string, step: number) =>
    kit.record(
      'observation',
      { occurredAt: kit.local(day, time), domains: [DOMAIN.health] },
      {
        concept: CONCEPT.energy,
        value: { type: 'scale', value: step, of: 5 },
        method: 'self-report',
      },
    )

  return {
    id: 'observed-evenings',
    title: 'Two months of readings, and nothing graded',
    summary:
      'Energy before and after, on fourteen evenings with a walk, fourteen where it was turned down, and three nobody asked about. No causal question anywhere.',
    proves:
      'D-089 — the app works out what follows an action, against a comparison group, without asking the owner to.',
    zone: kit.zone,
    now,
    build() {
      const place = kit.entity({
        kind: 'place',
        label: 'the kitchen',
        domain: DOMAIN.home,
        privacy: 'normal',
      })

      /*
       * Evenings with a walk. `rose` says whether the later reading is higher —
       * ten of the fourteen — and the pair is deliberately not always the same
       * two steps, so nothing here turns on one arithmetic coincidence.
       */
      const withWalk: readonly (readonly [string, number, number])[] = [
        ['2026-03-03', 2, 4],
        ['2026-03-05', 2, 3],
        ['2026-03-09', 3, 4],
        ['2026-03-11', 1, 3],
        ['2026-03-16', 2, 4],
        ['2026-03-18', 3, 3],
        ['2026-03-23', 2, 3],
        ['2026-03-25', 1, 2],
        ['2026-03-30', 3, 4],
        ['2026-04-01', 2, 2],
        ['2026-04-06', 2, 4],
        ['2026-04-08', 3, 4],
        ['2026-04-13', 2, 1],
        ['2026-04-15', 2, 3],
      ]

      /*
       * Evenings without one, on the same clock, from the same question. Four
       * of fourteen higher — an ordinary evening drifts down, which is the
       * whole point of having a comparison group rather than a figure.
       *
       * Each of these carries a **declined** walk, below, and that is not
       * decoration. An evening the app never asked about is an evening the
       * record cannot place: it does not say a walk happened and it does not
       * say one did not. Counting those as "without" is how a comparison group
       * fills up with evenings nobody knows anything about (DEF-0048). Here
       * the record genuinely says no, so the group is genuinely a group.
       */
      const withoutWalk: readonly (readonly [string, number, number])[] = [
        ['2026-03-04', 3, 2],
        ['2026-03-06', 2, 2],
        ['2026-03-10', 3, 3],
        ['2026-03-12', 2, 1],
        ['2026-03-17', 3, 4],
        ['2026-03-19', 2, 2],
        ['2026-03-24', 3, 2],
        ['2026-03-26', 2, 3],
        ['2026-03-31', 3, 3],
        ['2026-04-02', 2, 1],
        ['2026-04-07', 3, 4],
        ['2026-04-09', 2, 2],
        ['2026-04-14', 3, 2],
        ['2026-04-16', 2, 3],
      ]

      /*
       * Two evenings with a walk *and* something else in between. Neither is
       * evidence about walks; neither is a clean evening without one. The app
       * discards both and says so rather than absorbing them into whichever
       * group would have been kinder.
       */
      const confounded: readonly (readonly [string, number, number])[] = [
        ['2026-04-20', 2, 4],
        ['2026-04-22', 2, 4],
      ]

      /*
       * And three evenings nobody asked about, with readings on both sides.
       *
       * They exist to be *left out*. Nothing here says a walk happened and
       * nothing says one did not, so they are evidence about neither side —
       * and the app reports how many there are rather than quietly rounding
       * them into whichever group would make the finding look better.
       */
      const unplaced: readonly (readonly [string, number, number])[] = [
        ['2026-04-27', 2, 4],
        ['2026-04-28', 2, 4],
        ['2026-04-29', 2, 4],
      ]

      const readings = [...withWalk, ...withoutWalk, ...confounded, ...unplaced].flatMap(
        ([day, before, after]) => [energyAt(day, '18:00', before), energyAt(day, '20:30', after)],
      )

      // A second dimension that moves on its own, with no action anywhere near
      // it. Nothing should be concluded from it.
      const soreness = [
        ['2026-03-07', 1],
        ['2026-03-14', 3],
        ['2026-03-21', 2],
        ['2026-03-28', 3],
        ['2026-04-04', 1],
        ['2026-04-11', 2],
        ['2026-04-18', 3],
        ['2026-04-25', 1],
      ].map(([day, step]) =>
        kit.record(
          'observation',
          { occurredAt: kit.local(String(day), '19:00'), domains: [DOMAIN.health] },
          {
            concept: CONCEPT.soreness,
            value: { type: 'scale', value: Number(step), of: 5 },
            method: 'self-report',
          },
        ),
      )

      /*
       * Tonight, so the history reaches a real decision rather than a shrug.
       *
       * Without a current reading the evening has nothing to go on and the
       * ranking never runs — which would leave the observed relationship
       * visible on Insights and invisible to the thing that decides, and the
       * whole point of the dimension is that it reaches both.
       */
      const tonight = [
        kit.record(
          'observation',
          { occurredAt: kit.local('2026-05-02', '17:50'), domains: [DOMAIN.health] },
          {
            concept: CONCEPT.energy,
            value: { type: 'scale', value: 3, of: 5 },
            method: 'self-report',
          },
        ),
        kit.record(
          'observation',
          { occurredAt: kit.local('2026-05-02', '17:50'), domains: [DOMAIN.health] },
          {
            concept: CONCEPT.soreness,
            value: { type: 'scale', value: 1, of: 5 },
            method: 'self-report',
          },
        ),
        kit.record(
          'observation',
          { occurredAt: kit.local('2026-05-02', '07:00'), domains: [DOMAIN.sleep] },
          {
            concept: CONCEPT.sleepHours,
            value: { type: 'number', value: 7.5, unit: 'hours' },
            method: 'self-report',
          },
        ),
      ]

      const time = kit.record(
        'observation',
        { occurredAt: kit.local('2026-05-02', '18:00'), domains: [DOMAIN.direction] },
        {
          concept: CONCEPT.freeNow,
          value: { type: 'duration', minutes: 60 },
          method: 'self-report',
        },
      )

      const walks = pastEpisodeRecords(
        kit,
        [...withWalk, ...confounded].map(([day]) => ({
          verb: 'move' as const,
          object: walk,
          domain: DOMAIN.health,
          on: day,
          at: '19:00',
          context: anEvening,
          ending: 'completed' as const,
          // No effect answer. Nothing in this history grades anything.
        })),
        nextId,
      )

      /*
       * The same walk, offered and turned down. This is what makes an evening
       * a *known* evening without one.
       */
      const declined = pastEpisodeRecords(
        kit,
        withoutWalk.map(([day]) => ({
          verb: 'move' as const,
          object: walk,
          domain: DOMAIN.health,
          on: day,
          at: '19:00',
          context: anEvening,
          ending: 'declined' as const,
        })),
        nextId,
      )

      const alsoCleared = pastEpisodeRecords(
        kit,
        confounded.map(([day]) => ({
          verb: 'reset-space' as const,
          object: kitchen,
          domain: DOMAIN.home,
          on: day,
          at: '19:40',
          context: anEvening,
          ending: 'completed' as const,
        })),
        nextId,
      )

      return kit.document({
        entities: [place],
        records: [
          ...readings,
          ...soreness,
          ...tonight,
          time,
          ...walks,
          ...declined,
          ...alsoCleared,
        ],
        exportedAt: now,
      })
    },
  }
}

// ---------------------------------------------------------------------------
// AUD-0008 — the instrument can see before noon
// ---------------------------------------------------------------------------

/**
 * A morning with something to decide.
 *
 * The library was thirteen evenings, one late night, three afternoons and one
 * morning — and that one morning is the near-empty history, which produces no
 * move at all. So no fixture ever asked the engine to decide before noon, and
 * every temporal defect in the whole-app audit survived 1,199 passing
 * assertions because the instrument could not see half the day.
 *
 * This is the reproduction from AUD-0003, written down as a fixture: three
 * broken nights, a live career goal, a topic that went badly, his daughter in
 * the house, and the clock at ten in the morning. The deployed build answered
 * it with a study session, directly underneath a line saying he was nine hours
 * short of rest.
 */
function morningAfterBadNights(): Scenario {
  const kit = createKit('GM', 'America/Denver', '2026-08-01T12:00:00Z')
  const adaya = entityRef('person', 'Adaya')
  const subnetting = entityRef('learning-topic', 'subnetting')
  const ccna = entityRef('goal', 'the CCNA')
  const career = entityRef('life-domain', 'the CCNA push')
  const now = kit.local('2026-09-15', '10:00')

  return {
    id: 'morning-after-bad-nights',
    title: 'A morning after three bad nights',
    summary: 'Ten in the morning, three four-hour nights behind him, and a deadline in front.',
    proves: 'AUD-0003 — a named recovery limiter has somewhere to go before noon.',
    zone: kit.zone,
    now,
    build() {
      const child = kit.entity({
        kind: 'person',
        label: 'Adaya',
        domain: DOMAIN.fatherhood,
        privacy: 'child-family-sensitive',
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

      const custody = kit.record(
        'context',
        {
          occurredAt: kit.local('2026-08-01', '09:00'),
          domains: [DOMAIN.fatherhood],
          entities: [adaya],
        },
        {
          concept: CONCEPT.childPresent,
          value: { type: 'boolean', value: true },
          durability: 'durable',
          validFrom: kit.local('2026-08-01', '09:00'),
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

      const struggle = kit.record(
        'outcome',
        {
          occurredAt: kit.local('2026-09-14', '21:00'),
          domains: [DOMAIN.career],
          entities: [subnetting],
        },
        {
          about: studying.id,
          aspect: 'effect',
          observation: { type: 'text', value: 'The /26 boundaries went wrong twice' },
          sentiment: 'worse',
        },
      )

      /*
       * Three nights at about four hours, the last of them recorded at seven
       * this morning — which is the reading AUD-0005 is about. It describes the
       * night that has just ended, and it has to still be true at ten.
       */
      const nights = [4.5, 4.25, 5].map((value, offset) =>
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
        { occurredAt: kit.local('2026-09-15', '07:30'), domains: [DOMAIN.health] },
        {
          concept: CONCEPT.energy,
          value: { type: 'scale', value: 2, of: 5 },
          method: 'self-report',
        },
      )

      const time = kit.record(
        'observation',
        { occurredAt: kit.local('2026-09-15', '09:40'), domains: [DOMAIN.direction] },
        {
          concept: CONCEPT.freeNow,
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
        entities: [child, topic, goal, direction],
        records: [goalRecord, custody, studying, struggle, ...nights, energy, time, weekly],
        exportedAt: now,
      })
    },
  }
}

/**
 * The other end of the morning, and the block nothing in the library sat in.
 *
 * Twenty to seven on a Saturday is a real hour in this house — she is up, the
 * day has not been spent yet, and he is properly rested. It is the counterpart
 * to the scenario above for the same reason G-005 is built in pairs: a morning
 * fixture where recovery wins proves nothing on its own.
 */
function saturdayMorningOpen(): Scenario {
  const kit = createKit('GT', 'America/Denver', '2026-08-01T12:00:00Z')
  const adaya = entityRef('person', 'Adaya')
  const kitchen = entityRef('place', 'the kitchen')
  const subnetting = entityRef('learning-topic', 'subnetting')
  const now = kit.local('2026-09-19', '06:40')

  return {
    id: 'saturday-morning-open',
    title: 'A Saturday morning with the day open',
    summary: 'Twenty to seven, properly slept, his daughter here and nothing booked.',
    proves: 'AUD-0008 — the early morning is a block the library can decide in.',
    zone: kit.zone,
    now,
    build() {
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
      })

      const custody = kit.record(
        'context',
        {
          occurredAt: kit.local('2026-08-01', '09:00'),
          domains: [DOMAIN.fatherhood],
          entities: [adaya],
        },
        {
          concept: CONCEPT.childPresent,
          value: { type: 'boolean', value: true },
          durability: 'durable',
          validFrom: kit.local('2026-08-01', '09:00'),
        },
      )

      const studying = kit.record(
        'observation',
        {
          occurredAt: kit.local('2026-09-12', '20:00'),
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
        {
          occurredAt: kit.local('2026-09-18', '18:00'),
          domains: [DOMAIN.home],
          entities: [kitchen],
        },
        {
          concept: CONCEPT.homeFriction,
          value: { type: 'text', value: 'the kitchen table is buried again' },
          method: 'self-report',
        },
      )

      const nights = [7.5, 8, 8.25].map((value, offset) =>
        kit.record(
          'observation',
          { occurredAt: kit.local(`2026-09-${17 + offset}`, '06:30'), domains: [DOMAIN.sleep] },
          {
            concept: CONCEPT.sleepHours,
            value: { type: 'number', value, unit: 'hours' },
            method: 'self-report',
          },
        ),
      )

      const energy = kit.record(
        'observation',
        { occurredAt: kit.local('2026-09-19', '06:35'), domains: [DOMAIN.health] },
        {
          concept: CONCEPT.energy,
          value: { type: 'scale', value: 4, of: 5 },
          method: 'self-report',
        },
      )

      const time = kit.record(
        'observation',
        { occurredAt: kit.local('2026-09-19', '06:35'), domains: [DOMAIN.direction] },
        {
          concept: CONCEPT.freeNow,
          value: { type: 'duration', minutes: 120 },
          method: 'self-report',
        },
      )

      return kit.document({
        entities: [child, place, topic],
        records: [custody, studying, friction, ...nights, energy, time],
        exportedAt: now,
      })
    },
  }
}

// ---------------------------------------------------------------------------
// AUD-0048 / D-112 — a growth history that does not go one way
// ---------------------------------------------------------------------------

/**
 * Six chances, three managed, and never twice in a row.
 *
 * No scenario in the library contained a failed or partial growth occasion, so
 * nothing ever asked what the app says about a child whose record alternates.
 * The deployed build said "Adaya has handled ordering her own food 3 times
 * running" — from three non-consecutive occasions, with the three that needed
 * help filtered out of the count, and the most recent of the six being one of
 * them.
 *
 * The occasions alternate on purpose and the last one is a partial on purpose.
 *
 * A second skill runs alongside it, and the pair is the test — the same reason
 * G-005 is built in pairs. Shoes went badly twice and then well three times
 * running: the app may say so, and must say how many earlier goes needed a
 * hand. Ordering never went well twice in a row: the app may say nothing at
 * all. One history, both halves of D-112, and neither reading is reachable by a
 * rule that only counts the occasions that went well.
 */
function growthMixedEvidence(): Scenario {
  const kit = createKit('GU', 'America/Denver', '2026-05-01T12:00:00Z')
  const nextId = sequentialRecordIds('GUX')
  const adaya = entityRef('person', 'Adaya')
  const ordering = entityRef('development-skill', 'ordering her own food')
  const shoes = entityRef('development-skill', 'getting her shoes on')
  const now = kit.local('2026-06-25', '18:20')

  return {
    id: 'growth-mixed-evidence',
    title: 'Six chances, three managed',
    summary:
      'One skill that alternates, one that turned a corner, and the difference said out loud.',
    proves: 'D-112 — the app reads the sequence rather than the survivors.',
    zone: kit.zone,
    now,
    build() {
      const child = kit.entity({
        kind: 'person',
        label: 'Adaya',
        domain: DOMAIN.fatherhood,
        privacy: 'child-family-sensitive',
      })
      const skill = kit.entity({
        kind: 'development-skill',
        label: 'ordering her own food',
        domain: DOMAIN.fatherhood,
        privacy: 'child-family-sensitive',
        links: [{ relation: 'about-person', target: adaya.id }],
      })
      const secondSkill = kit.entity({
        kind: 'development-skill',
        label: 'getting her shoes on',
        domain: DOMAIN.fatherhood,
        privacy: 'child-family-sensitive',
        links: [{ relation: 'about-person', target: adaya.id }],
      })

      const present = kit.record(
        'context',
        {
          occurredAt: kit.local('2026-05-01', '09:00'),
          domains: [DOMAIN.fatherhood],
          entities: [adaya],
        },
        {
          concept: CONCEPT.childPresent,
          value: { type: 'boolean', value: true },
          durability: 'durable',
          validFrom: kit.local('2026-05-01', '09:00'),
        },
      )

      const nights = ['23', '24', '25'].map((day) =>
        kit.record(
          'observation',
          { occurredAt: kit.local(`2026-06-${day}`, '07:00'), domains: [DOMAIN.sleep] },
          {
            concept: CONCEPT.sleepHours,
            value: { type: 'number', value: 7.25, unit: 'hours' },
            method: 'self-report',
          },
        ),
      )

      const energy = kit.record(
        'observation',
        { occurredAt: kit.local('2026-06-25', '17:00'), domains: [DOMAIN.health] },
        {
          concept: CONCEPT.energy,
          value: { type: 'scale', value: 3, of: 5 },
          method: 'self-report',
        },
      )

      const time = kit.record(
        'observation',
        { occurredAt: kit.local('2026-06-25', '18:00'), domains: [DOMAIN.direction] },
        {
          concept: CONCEPT.freeNow,
          value: { type: 'duration', minutes: 90 },
          method: 'self-report',
        },
      )

      const anAfternoon = {
        block: 'afternoon' as const,
        weekend: false,
        strain: 'none' as const,
        childPresent: true,
        usableMinutes: 120,
      }

      const occasions = [
        { on: '2026-06-06', result: 'all' as const },
        { on: '2026-06-09', result: 'part' as const },
        { on: '2026-06-13', result: 'all' as const },
        { on: '2026-06-16', result: 'part' as const },
        { on: '2026-06-20', result: 'all' as const },
        { on: '2026-06-23', result: 'part' as const },
      ]

      // Two bad goes, then three in a row. The run is real, and so are the
      // two that came before it.
      const shoeOccasions = [
        { on: '2026-06-05', result: 'part' as const },
        { on: '2026-06-08', result: 'part' as const },
        { on: '2026-06-12', result: 'all' as const },
        { on: '2026-06-17', result: 'all' as const },
        { on: '2026-06-22', result: 'all' as const },
      ]

      const past = pastEpisodeRecords(
        kit,
        [
          ...occasions.map(({ on, result }) => ({
            subject: ordering,
            object: ordering,
            on,
            result,
          })),
          ...shoeOccasions.map(({ on, result }) => ({ subject: shoes, object: shoes, on, result })),
        ].map(({ subject, object, on, result }) => ({
          verb: 'growth-opportunity' as const,
          object,
          subject,
          domain: DOMAIN.fatherhood,
          on,
          at: '12:30',
          context: anAfternoon,
          ending: 'completed' as const,
          result,
        })),
        nextId,
      )

      return kit.document({
        entities: [child, skill, secondSkill],
        records: [present, ...nights, energy, time, ...past],
        exportedAt: now,
      })
    },
  }
}

// ---------------------------------------------------------------------------
// A school morning — AUD-0004
// ---------------------------------------------------------------------------

export const SCHOOL_MORNING_ZONE = timeZone('America/Denver')

/**
 * Twenty past eight on a Wednesday, and ten o'clock on the same Wednesday.
 *
 * The adversarial history AUD-0004 asks for: *"a school-morning history where
 * the same move is right at 10:00 and wrong at 07:15."* Both hours are the same
 * `morning` block, both read the same rested body and the same live topic, and
 * before this phase the engine could not tell them apart — five fixed blocks
 * from wall-clock minutes model the shape of a day and nothing about this
 * owner's day.
 *
 * The one thing that separates them is a `commitment-window`: her school day
 * runs 08:30 to 15:00 on weekdays. At twenty past eight that is ten minutes
 * away; at ten
 * o'clock the next edge is three in the afternoon and the house is quiet, which
 * is the freest stretch of the week for a father with full custody.
 *
 * **Note what the window is not.** It is `whose: 'theirs'` — hers. If the app
 * read it as time *he* is busy it would go silent for the five hours he is
 * most able to do something, which is the opposite of the finding.
 */
export const SCHOOL_MORNING_NOW = createKit('SM', 'America/Denver', '2026-06-01T12:00:00Z').local(
  '2026-09-16',
  '08:20',
)

/** The same Wednesday, once the house is quiet. */
export const SCHOOL_MORNING_LATER = createKit('SM', 'America/Denver', '2026-06-01T12:00:00Z').local(
  '2026-09-16',
  '10:00',
)

/** And the same Wednesday before any of it — AUD-0024's hour. */
export const SCHOOL_MORNING_EARLY = createKit('SM', 'America/Denver', '2026-06-01T12:00:00Z').local(
  '2026-09-16',
  '05:30',
)

export function schoolMorning(): SnapshotWire {
  const kit = createKit('SM', 'America/Denver', '2026-06-01T12:00:00Z')
  const adaya = entityRef('person', 'Adaya')
  const subnetting = entityRef('learning-topic', 'subnetting')

  const child = kit.entity({
    kind: 'person',
    label: 'Adaya',
    domain: DOMAIN.fatherhood,
    privacy: 'child-family-sensitive',
  })
  const topic = kit.entity({
    kind: 'learning-topic',
    label: 'subnetting',
    domain: DOMAIN.career,
    privacy: 'normal',
  })

  const custody = kit.record(
    'context',
    {
      occurredAt: kit.local('2026-06-01', '09:00'),
      domains: [DOMAIN.fatherhood],
      entities: [adaya],
    },
    {
      concept: CONCEPT.childPresent,
      value: { type: 'boolean', value: true },
      durability: 'durable',
      validFrom: kit.local('2026-06-01', '09:00'),
    },
  )

  const school = kit.record(
    'commitment-window',
    {
      occurredAt: kit.local('2026-09-01', '19:00'),
      domains: [DOMAIN.fatherhood],
      entities: [adaya],
    },
    {
      label: 'Adaya’s school day',
      startsAt: 8 * 60 + 30,
      endsAt: 15 * 60,
      recurrence: { kind: 'weekly', days: [1, 2, 3, 4, 5] },
      whose: 'theirs',
      knownFrom: 'recurring',
    },
  )

  const studying = kit.record(
    'observation',
    {
      occurredAt: kit.local('2026-09-14', '20:00'),
      domains: [DOMAIN.career],
      entities: [subnetting],
    },
    {
      concept: CONCEPT.learningTopic,
      value: { type: 'entity', value: subnetting },
      method: 'self-report',
    },
  )

  // Three full nights, so nothing about the body is in the way and the only
  // thing that can separate the two hours is the shape of the day.
  const nights = [8, 8.25, 8].map((value, offset) =>
    kit.record(
      'observation',
      { occurredAt: kit.local(`2026-09-${14 + offset}`, '07:00'), domains: [DOMAIN.sleep] },
      {
        concept: CONCEPT.sleepHours,
        value: { type: 'number', value, unit: 'hours' },
        method: 'self-report',
      },
    ),
  )

  const energy = kit.record(
    'observation',
    { occurredAt: kit.local('2026-09-16', '07:30'), domains: [DOMAIN.health] },
    { concept: CONCEPT.energy, value: { type: 'scale', value: 4, of: 5 }, method: 'self-report' },
  )

  return kit.document({
    entities: [child, topic],
    records: [custody, school, studying, ...nights, energy],
    exportedAt: SCHOOL_MORNING_NOW,
  })
}

function schoolMorningScenario(): Scenario {
  return {
    id: 'school-morning',
    title: 'A school morning',
    summary:
      'Twenty past eight on a Wednesday, with her school day starting at half past. The same history reads very differently at ten, when the house is quiet.',
    proves:
      'AUD-0004 — the day is more than clock arithmetic. Twenty minutes before the school run and two hours into a quiet house are the same block, and no longer the same answer.',
    zone: SCHOOL_MORNING_ZONE,
    now: SCHOOL_MORNING_NOW,
    build: schoolMorning,
  }
}

// ---------------------------------------------------------------------------
// A course under way — AUD-0020
// ---------------------------------------------------------------------------

export const THREAD_ZONE = timeZone('America/Denver')

/** A Wednesday evening, two sessions into a three-session push. */
export const THREAD_NOW = createKit('TH', 'America/Denver', '2026-06-01T12:00:00Z').local(
  '2026-09-16',
  '20:00',
)

export interface ThreadScenarioOptions {
  /** How many of the three sessions the record shows were actually finished. */
  readonly sessionsDone?: number
  /** Whether the body has anything in the way. `severe` is the gate's case. */
  readonly strain?: 'none' | 'severe'
  readonly state?: ThreadState
  /** Owner-local days before the evening that the course was started. */
  readonly startedDaysAgo?: number
  /** Days from the start before it stops applying. The shape's own figure by default. */
  readonly lastsDays?: number
}

/**
 * One evening, two sessions into a push, with everything else held still.
 *
 * The instrument for AUD-0020, and the same one G-008 uses for direction: a
 * fixed history with exactly one thing varying. What changes here is the course
 * — how far into it, what state it is in, whether it has run out — and, for the
 * gate's second item, whether the owner's body has something to say.
 */
export function runningThread(options: ThreadScenarioOptions = {}): SnapshotWire {
  const kit = createKit('TH', 'America/Denver', '2026-06-01T12:00:00Z')
  const nextId = sequentialRecordIds('THS')
  const subnetting = entityRef('learning-topic', 'subnetting')
  const startedDaysAgo = options.startedDaysAgo ?? 10
  const startedOn = addLocalDaysToDayId(
    localDayId({ year: 2026, month: 9, day: 16 }),
    -startedDaysAgo,
  )
  const lasts = options.lastsDays ?? 28
  const sessionsDone = options.sessionsDone ?? 2
  const strained = options.strain === 'severe'

  const topic = kit.entity({
    kind: 'learning-topic',
    label: 'subnetting',
    domain: DOMAIN.career,
    privacy: 'normal',
  })

  const thread = kit.record(
    'thread',
    {
      occurredAt: kit.local(startedOn, '20:00'),
      domains: [DOMAIN.career],
      entities: [subnetting],
    },
    {
      thread: 'study-schedule',
      subject: subnetting,
      intent: 'Three sessions on subnetting',
      steps: 3,
      moves: ['recall-practice', 'review-weak-topic', 'hands-on-lab'],
      state: options.state ?? 'running',
      expiresOn: addLocalDaysToDayId(startedOn, lasts),
    },
  )

  const studying = kit.record(
    'observation',
    {
      occurredAt: kit.local('2026-09-14', '20:00'),
      domains: [DOMAIN.career],
      entities: [subnetting],
    },
    {
      concept: CONCEPT.learningTopic,
      value: { type: 'entity', value: subnetting },
      method: 'self-report',
    },
  )

  // Far enough back that the three-day duplication window has nothing to say,
  // so what moves the ranking is the course rather than the calendar.
  const SESSION_DAYS = ['2026-09-08', '2026-09-10', '2026-09-12']
  const sessions = pastEpisodeRecords(
    kit,
    SESSION_DAYS.slice(0, Math.max(0, Math.min(3, sessionsDone))).map((on) => ({
      verb: 'recall-practice' as const,
      object: subnetting,
      domain: DOMAIN.career,
      on,
      at: '20:00',
      context: {
        block: 'evening' as const,
        weekend: false,
        strain: 'none' as const,
        usableMinutes: 60,
      },
      ending: 'completed' as const,
      effect: 'some' as const,
    })),
    nextId,
  )

  const hours = strained ? [4, 4.25, 4] : [8, 8.25, 8]
  const nights = hours.map((value, offset) =>
    kit.record(
      'observation',
      { occurredAt: kit.local(`2026-09-${14 + offset}`, '07:00'), domains: [DOMAIN.sleep] },
      {
        concept: CONCEPT.sleepHours,
        value: { type: 'number', value, unit: 'hours' },
        method: 'self-report',
      },
    ),
  )

  const energy = kit.record(
    'observation',
    { occurredAt: kit.local('2026-09-16', '18:00'), domains: [DOMAIN.health] },
    {
      concept: CONCEPT.energy,
      value: { type: 'scale', value: strained ? 1 : 4, of: 5 },
      method: 'self-report',
    },
  )

  const time = kit.record(
    'observation',
    { occurredAt: kit.local('2026-09-16', '19:30'), domains: [DOMAIN.direction] },
    {
      concept: CONCEPT.freeNow,
      value: { type: 'duration', minutes: 60 },
      method: 'self-report',
    },
  )

  return kit.document({
    entities: [topic],
    records: [thread, studying, ...sessions, ...nights, energy, time],
    exportedAt: THREAD_NOW,
  })
}

function studyThreadScenario(): Scenario {
  return {
    id: 'study-thread',
    title: 'Two sessions in',
    summary:
      'A Wednesday evening, ten days into a three-session push on subnetting, with two of them behind him.',
    proves:
      'AUD-0020 — a recommendation is a move in a plan rather than a fresh guess. The card says which course it belongs to and where in it, and Life can stop the whole thing in one tap.',
    zone: THREAD_ZONE,
    now: THREAD_NOW,
    build: () => runningThread(),
  }
}

/**
 * Half past five, and the answer that is neither do-this nor do-nothing.
 *
 * The fifth Now state — AUD-0024. `hold` has been in the vocabulary with a full
 * move profile and its own templates since Phase 1 and no generator produced
 * it, because deferring needs a model of later blocks and there was not one.
 * There is now, so this history has an hour where the honest answer is that the
 * move is right and the hour is not.
 *
 * It is the same Wednesday as `school-morning`, three hours earlier. Holding
 * the day still and moving only the clock is what makes the state legible: the
 * identical history gives a hold at half past five, a squeezed morning at
 * twenty past eight, and an open house at ten.
 */
function beforeTheHouseIsUp(): Scenario {
  return {
    id: 'before-the-house-is-up',
    title: 'Before the house is up',
    summary: 'Half past five on a Wednesday, rested, with the whole day still ahead.',
    proves:
      'AUD-0024 — the app can say "not this, because it will go better later" and name a real later block, rather than only "do this" or "nothing to suggest".',
    zone: SCHOOL_MORNING_ZONE,
    now: SCHOOL_MORNING_EARLY,
    build: schoolMorning,
  }
}

// ---------------------------------------------------------------------------
// AUD-0013 + AUD-0047 — a friendship the record has stopped hearing about
// ---------------------------------------------------------------------------

/**
 * Five months since anyone heard from him, and nobody has said he feels
 * sociable.
 *
 * This is the history the social domain could not read. `socialCandidates`
 * returned nothing unless social energy already read high, and social energy is
 * only ever set by *"Up for people tonight?"* — so the one genuinely useful
 * thing the domain could do, noticing a friendship going quiet, was
 * unreachable. AUD-0013 calls that **unknown means no**, which is G-009's error
 * living inside a generator.
 *
 * Two people are in it and only one of them is a candidate, which is the point.
 * Both have gone quiet by the same amount. The last recorded contact with one
 * of them went badly, and AUD-0047's rule is that quality **suppresses and
 * never ranks** — so he is passed over in silence, is not ordered below the
 * other, is not labelled, and appears in no sentence. Without the field the app
 * would nudge a man toward somebody he has deliberately stepped back from.
 *
 * `emotional.need-for-company` is answered here and `social.energy` is not, and
 * that gap is the whole of what D-166's dimension buys: a person can want
 * company about without feeling like it.
 */
function friendshipGoneQuiet(): Scenario {
  const kit = createKit('FQ', 'Europe/London', '2026-01-05T09:00:00Z')
  const now = kit.local('2026-06-13', '16:00')

  return {
    id: 'friendship-gone-quiet',
    title: 'Nobody has heard from him since January',
    summary:
      'A Saturday afternoon, nothing pressing, and two friendships the record has not heard about in five months.',
    proves:
      'AUD-0013 and AUD-0047 — unknown social energy is unknown rather than no, the reach-out names a real person with a real contact record behind them, and the relationship whose last contact went badly is passed over silently. Nothing about how he feels is pre-answered, so the whole path is visible: the app asks whether company would help, and the answer is what puts a person on the screen.',
    zone: kit.zone,
    now,
    build() {
      const sister = kit.entity({
        kind: 'person',
        label: 'Rachel',
        domain: DOMAIN.social,
        privacy: 'normal',
      })
      const oldFriend = kit.entity({
        kind: 'person',
        label: 'Dan',
        domain: DOMAIN.social,
        privacy: 'normal',
      })
      /*
       * And somewhere he goes, so the history holds both halves of the social
       * domain rather than only the new one. It is what makes *"up for people
       * this afternoon?"* a question worth a tap here: one answer opens a
       * conversation somewhere he actually goes, another leaves the quiet
       * friendship as the only thing on offer, and a third closes the domain
       * altogether. Without it the library had no history where that question
       * could earn its place, which is a gap in the library rather than a fact
       * about the concept.
       */
      const gym = kit.entity({
        kind: 'place',
        label: 'the climbing gym',
        domain: DOMAIN.social,
        privacy: 'normal',
      })

      const sisterRef = entityRef('person', 'Rachel')
      const danRef = entityRef('person', 'Dan')

      // Both quiet since January, and by the same amount.
      const lastWithSister = kit.record(
        'relationship-event',
        {
          occurredAt: kit.local('2026-01-11', '15:00'),
          domains: [DOMAIN.social],
          entities: [sisterRef],
        },
        { withEntity: sisterRef, nature: 'A long walk and a coffee', quality: 'positive' },
      )
      const lastWithDan = kit.record(
        'relationship-event',
        {
          occurredAt: kit.local('2026-01-11', '19:00'),
          domains: [DOMAIN.social],
          entities: [danRef],
        },
        /*
         * The one thing `quality` is for. Recency alone would put this
         * friendship at the top of the list beside the other; what the record
         * actually holds is that the last time went badly, and the app's answer
         * to that is silence rather than a smaller number.
         */
        { withEntity: danRef, nature: 'An argument neither of us wanted', quality: 'strained' },
      )

      const nights = [7.5, 7.75, 8].map((value, offset) =>
        kit.record(
          'observation',
          {
            occurredAt: kit.local(`2026-06-${String(11 + offset).padStart(2, '0')}`, '07:00'),
            domains: [DOMAIN.sleep],
          },
          {
            concept: CONCEPT.sleepHours,
            value: { type: 'number', value, unit: 'hours' },
            method: 'self-report',
          },
        ),
      )

      const energy = kit.record(
        'observation',
        { occurredAt: kit.local('2026-06-13', '15:30'), domains: [DOMAIN.health] },
        {
          concept: CONCEPT.energy,
          value: { type: 'scale', value: 3, of: 5 },
          method: 'self-report',
        },
      )

      const time = kit.record(
        'observation',
        { occurredAt: kit.local('2026-06-13', '15:45'), domains: [DOMAIN.career] },
        {
          concept: CONCEPT.freeNow,
          value: { type: 'duration', minutes: 120 },
          method: 'self-report',
        },
      )

      /*
       * And he has already been out once today — S2 Tier 2's
       * `health.trained-today`, observed rather than asked.
       *
       * It is in this history because it is what makes the afternoon honest.
       * With a walk already finished, the app has no business proposing another
       * one, and what is left is the thing it has never been able to say: that
       * nobody has heard from his sister since January. The reading costs him
       * no tap — the app watched him finish it.
       */
      const walk = entityRef('routine', 'a walk')
      const offered = kit.record(
        'action-recommendation',
        {
          occurredAt: kit.local('2026-06-13', '10:00'),
          domains: [DOMAIN.health],
          entities: [walk],
        },
        {
          recommendation: {
            subject: walk,
            domain: DOMAIN.health,
            target: { verb: 'move', object: walk, minutes: 25 },
            whyNow: { trigger: 'good-conditions', summary: '', evidence: [] },
            evidence: [],
          },
        },
      )
      const went = kit.record(
        'action-completion',
        {
          occurredAt: kit.local('2026-06-13', '10:40'),
          domains: [DOMAIN.health],
          entities: [walk],
        },
        { recommendation: offered.id },
      )

      return kit.document({
        entities: [sister, oldFriend, gym],
        records: [lastWithSister, lastWithDan, ...nights, energy, time, offered, went],
        exportedAt: now,
      })
    },
  }
}

// ---------------------------------------------------------------------------
// AUD-0012 — the domain that existed only as a page
// ---------------------------------------------------------------------------

/**
 * An open money item, and an area that has genuinely run out of routes.
 *
 * ## What this history is for
 *
 * The audit's finding is that money is *effectively dormant and no scenario
 * exercises it*. `moneyCandidates` needs a `financial-goal` to exist, no guide
 * question touched money, and **no history in the library held a financial goal
 * at all** — so the Money page said *"Cash buffer — Not known yet — Add this"*
 * and that was the entire product surface for financial resilience. The QA
 * laboratory could not even show that it could not.
 *
 * So this is the history where money is live: an item he is carrying — the car
 * insurance — with a date on it, and a cash-buffer reading old enough to be
 * worth re-asking. Both halves matter: the goal is what lets the generator
 * speak, and the ageing reading is what makes the question worth a tap.
 *
 * ## And the second thing it carries, which is a different finding
 *
 * A faith reading from months ago. Faith has no refreshing move and no question
 * — both correct, and D-170 records its passivity as interim — so it is the one
 * area in the library that can go stale with nothing the app can do about it.
 * That is what `needs-review` is for, and the sentence *"Nothing the app can do
 * on its own will bring these back"* had no reachable case after AUD-0041
 * corrected the social declaration. Shipped copy with no history behind it is
 * copy nobody has read.
 */
function moneyItemDue(): Scenario {
  const kit = createKit('MN', 'Europe/London', '2026-02-01T09:00:00Z')
  const now = kit.local('2026-04-14', '10:30')
  const item = entityRef('financial-goal', 'the car insurance')

  return {
    id: 'money-item-due',
    title: 'The car insurance, still not dealt with',
    summary:
      'A Tuesday morning with one money item carried forward, a cash-buffer reading two months old, and a faith practice nothing can bring back.',
    proves:
      'AUD-0012 — money can reach a decision at all: an item that exists, a question the answer to which changes something, and a recommendation that names the item rather than a generic "check your budget".',
    zone: kit.zone,
    now,
    build() {
      const insurance = kit.entity({
        kind: 'financial-goal',
        label: 'the car insurance',
        domain: DOMAIN.money,
        privacy: 'sensitive',
      })

      const goal = kit.record(
        'goal',
        {
          occurredAt: kit.local('2026-03-02', '20:00'),
          domains: [DOMAIN.money],
          entities: [item],
        },
        {
          goal: item,
          statement: 'Sort out the car insurance',
          status: 'active',
          targetWindow: {
            kind: 'due',
            earliest: kit.local('2026-04-18', '00:00'),
            latest: kit.local('2026-04-18', '23:59'),
          },
        },
      )

      // Two months old, which is past the concept's own thirty-day horizon.
      const buffer = kit.record(
        'observation',
        { occurredAt: kit.local('2026-02-10', '19:00'), domains: [DOMAIN.money] },
        {
          concept: CONCEPT.cashBuffer,
          value: { type: 'number', value: 400, unit: 'pounds' },
          method: 'self-report',
        },
      )

      const nights = [7.5, 7.25, 8].map((value, offset) =>
        kit.record(
          'observation',
          {
            occurredAt: kit.local(`2026-04-${String(12 + offset).padStart(2, '0')}`, '07:00'),
            domains: [DOMAIN.sleep],
          },
          {
            concept: CONCEPT.sleepHours,
            value: { type: 'number', value, unit: 'hours' },
            method: 'self-report',
          },
        ),
      )

      const energy = kit.record(
        'observation',
        { occurredAt: kit.local('2026-04-14', '09:00'), domains: [DOMAIN.health] },
        {
          concept: CONCEPT.energy,
          value: { type: 'scale', value: 3, of: 5 },
          method: 'self-report',
        },
      )

      /*
       * Answered, because this history is about money.
       *
       * Without it the app opens on *"anything sore?"* — D-111's exception,
       * correctly, because it is about to suggest something effortful — and the
       * fixture demonstrates the exception rather than the domain it was built
       * for. A morning where he has already said how he is is the ordinary
       * case, and it is the one that leaves money on the screen.
       */
      const sore = kit.record(
        'observation',
        { occurredAt: kit.local('2026-04-14', '09:00'), domains: [DOMAIN.health] },
        {
          concept: CONCEPT.soreness,
          value: { type: 'scale', value: 0, of: 5 },
          method: 'self-report',
        },
      )

      const time = kit.record(
        'observation',
        { occurredAt: kit.local('2026-04-14', '09:00'), domains: [DOMAIN.career] },
        {
          concept: CONCEPT.freeNow,
          value: { type: 'duration', minutes: 60 },
          method: 'self-report',
        },
      )

      /*
       * And the area with no way back. Faith's own freshness is a week, so a
       * reading from February is long stale here — and there is no refreshing
       * move for the domain and no question in the catalogue, which together
       * are exactly what `needs-review` means.
       */
      const faith = kit.record(
        'observation',
        { occurredAt: kit.local('2026-02-08', '11:00'), domains: [DOMAIN.faith] },
        {
          concept: CONCEPT.faithPractice,
          value: { type: 'text', value: 'went most Sundays over the winter' },
          method: 'self-report',
        },
      )

      return kit.document({
        entities: [insurance],
        records: [goal, buffer, ...nights, energy, sore, time, faith],
        exportedAt: now,
      })
    },
  }
}

export const SCENARIOS: readonly Scenario[] = [
  /*
   * The near-empty histories first, because that is the order D-161 puts them
   * in: a capability is accepted when an ordinary owner can reach it from a
   * near-empty store, so the store an owner actually starts from is the first
   * thing the laboratory offers rather than the twenty-fourth.
   */
  ...JOURNEY_SCENARIOS,
  beforeTheHouseIsUp(),
  studyThreadScenario(),
  schoolMorningScenario(),
  subnettingStruggle(),
  sleepDeficitAgainstCareer(),
  restedAgainstCareer(),
  weekPointedAtHome(),
  whatWorked(),
  socialOpportunity(),
  settledEvening(),
  durableCustody(),
  mostlyUnknown(),
  acrossTimezones(),
  correctionsAndSupersession(),
  malformedHistory(),
  quietFortnight(),
  goneQuiet(),
  growthEvidence(),
  careerGoneQuiet(),
  aLongRun(),
  observedEvenings(),
  morningAfterBadNights(),
  saturdayMorningOpen(),
  growthMixedEvidence(),
  friendshipGoneQuiet(),
  moneyItemDue(),
]

export function scenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id)
}

export const DEFAULT_SCENARIO_ID = 'subnetting-struggle'
