import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { entityRef } from '../../src/domain/entities'
import { sequentialRecordIds } from '../../src/domain/ids'
import type { CanonicalRecord, DecisionContext } from '../../src/domain/records'
import { ACTION_VERBS, type ActionTarget } from '../../src/domain/recommendation'
import type { Instant } from '../../src/domain/time'
import type { ConceptId } from '../../src/domain/windows'
import {
  ACTION_FAMILIES,
  actionScopeOf,
  applicableAssociation,
  CONFOUNDING_KINDS,
  MIN_PAIRS,
  type ObservedAssociation,
} from '../../src/intelligence/association'
import { beliefCorrectionRecord } from '../../src/intelligence/corrections'
import { evidenceForDecision, insightsFor, type Insight } from '../../src/intelligence/insights'
import { associationBeliefKey } from '../../src/intelligence/learning'
import { MOVE_PROFILES, profileFor } from '../../src/intelligence/moves'
import { nextDueOutcome, outcomeQuestionsFor } from '../../src/intelligence/outcomes'
import { assembleSituation } from '../../src/intelligence/situation'
import { snapshotFromWire, type SnapshotWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { createKit, pastEpisodeRecords, type PastEpisode } from '../../src/synthetic/kit'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { assembleTimeline } from '../../src/features/timeline/timelineEntries'
import { decideOn, loadScenario } from './harness'

/**
 * What the app works out for itself (canonical plan section 20, D-089), and
 * how far it is allowed to say it (D-091).
 *
 * QA-A1: the app asked the owner *"How much did a walk do for you?"* and
 * offered four grades of difference — the causal question the system exists to
 * answer, handed to him — and then counted his answers back as a percentage
 * labelled *"how often it made a difference afterwards"*. That was repaired.
 *
 * An independent cold-use audit then reproduced five further failures in the
 * repair itself, and they are one failure wearing five hats: **a claim printed
 * wider than the evidence underneath it.** Keyed on the verb, so two different
 * things were pooled and named as one. Read across the whole record, so a
 * relationship that held on weekdays and not at weekends became a figure that
 * described neither. Silence counted as absence, so *we do not know* filled up
 * the comparison group. "Nothing else happened in between" said out loud from a
 * check of one record kind. And no way for the owner to say the app had read
 * his life wrong.
 *
 * Every test below is a behaviour QA or the audit required, and each was proved
 * to fail when its own behaviour was reintroduced.
 */

const ZONE_LABEL = 'America/Denver'

const A_WALK = entityRef('routine', 'a walk')
const A_BIKE_RIDE = entityRef('routine', 'a bike ride')

const walkTarget: ActionTarget = { verb: 'move', object: A_WALK }
const bikeTarget: ActionTarget = { verb: 'move', object: A_BIKE_RIDE }

/** A clock in the fixtures' own zone, for tests that name a moment. */
const clock = createKit('CLK', ZONE_LABEL, '2026-03-01T12:00:00Z')

interface Built {
  readonly document: SnapshotWire
  readonly view: ReturnType<typeof buildView>
  readonly now: Instant
  readonly zone: ReturnType<typeof createKit>['zone']
}

interface Evening {
  /** `YYYY-MM-DD`. */
  readonly on: string
  readonly before: number
  readonly after: number
  /** Which move, if any, was put in front of him between the two readings. */
  readonly move?: 'move' | 'reset-space'
  /**
   * Which thing was moved.
   *
   * The whole of the identity invariant lives in this field: `move` is a verb,
   * and a walk and a bike ride are not the same action just because the verb
   * fits both of them.
   */
  readonly object?: 'a walk' | 'a bike ride'
  /**
   * How it ended, and `declined` is the load-bearing one.
   *
   * An evening with no episode at all is an evening the record cannot place —
   * it does not say the move happened and does not say it did not. Only a
   * refusal makes an evening a *known* evening without it.
   */
  readonly ending?: 'completed' | 'declined' | 'unable-now'
  /** A second move in the same gap, which should confound the pair. */
  readonly also?: 'reset-space'
  /** Something else recorded in the same gap, of a kind that is not an episode. */
  readonly event?: 'relationship-event' | 'domain-update'
  /** Leave the later reading out entirely. */
  readonly missingAfter?: boolean
  /** Leave the earlier reading out entirely. */
  readonly missingBefore?: boolean
  readonly concept?: ConceptId
}

interface Options {
  /** The moment the history is read from. */
  readonly readAt?: readonly [string, string]
  /**
   * Add the facts an evening needs before the engine will decide anything, and
   * read from that moment.
   *
   * Only the tests that follow a finding all the way into a recommendation need
   * this; a comparison on its own does not need a live evening.
   */
  readonly decideAt?: readonly [string, string]
  /** The owner rejecting what the app has worked out about a thing, and when. */
  readonly reject?: {
    readonly object: 'a walk' | 'a bike ride'
    readonly at: readonly [string, string]
  }
  /**
   * Leave the routines undeclared, so nothing can name them.
   *
   * A real generator declares the entity it proposes; this exists to prove what
   * the app does when one is missing, which is the only way an action can reach
   * a card with no name the owner would recognise.
   */
  readonly declare?: boolean
}

/**
 * A history of evenings, each a before reading, an after reading, and whatever
 * happened in between.
 *
 * Built here rather than registered in the scenario library because these are
 * variations a person should not find on the QA screen — the same reason
 * `decideOn` exists in the harness.
 */
function evenings(rows: readonly Evening[], options: Options = {}): Built {
  const kit = createKit('OB', ZONE_LABEL, '2026-03-01T12:00:00Z')
  const nextId = sequentialRecordIds('OBX')
  const kitchen = entityRef('place', 'the kitchen')
  const someone = entityRef('person', 'a friend')

  /*
   * The moment the history is read from, and it has to be a real argument.
   *
   * The fact layer decides whether the guide would ask for a concept, and that
   * turns on how stale the reading is *at the moment being asked about*. A view
   * built in June says every energy reading from March is stale, so the guide
   * would ask and the outcome card would rightly stay quiet — which is correct
   * behaviour and the opposite of what the reading test is about.
   */
  const now =
    options.decideAt !== undefined
      ? kit.local(...options.decideAt)
      : options.readAt === undefined
        ? kit.local('2026-06-01', '18:10')
        : kit.local(...options.readAt)

  const context: DecisionContext = {
    block: 'evening',
    weekend: false,
    strain: 'none',
    childPresent: false,
    usableMinutes: 60,
  }

  const records: CanonicalRecord[] = []
  const seeds: PastEpisode[] = []

  for (const row of rows) {
    const concept = row.concept ?? CONCEPT.energy
    const reading = (time: string, step: number) =>
      kit.record(
        'observation',
        { occurredAt: kit.local(row.on, time), domains: [DOMAIN.health] },
        { concept, value: { type: 'scale', value: step, of: 5 }, method: 'self-report' },
      )
    if (row.missingBefore !== true) records.push(reading('18:00', row.before))
    if (row.missingAfter !== true) records.push(reading('20:30', row.after))

    if (row.move !== undefined) {
      const object =
        row.move === 'reset-space' ? kitchen : row.object === 'a bike ride' ? A_BIKE_RIDE : A_WALK
      seeds.push({
        verb: row.move,
        object,
        domain: row.move === 'move' ? DOMAIN.health : DOMAIN.home,
        on: row.on,
        at: '19:00',
        context,
        ending: row.ending ?? 'completed',
      })
    }
    if (row.also !== undefined) {
      seeds.push({
        verb: row.also,
        object: kitchen,
        domain: DOMAIN.home,
        on: row.on,
        at: '19:40',
        context,
        ending: 'completed',
      })
    }
    if (row.event === 'relationship-event') {
      records.push(
        kit.record(
          'relationship-event',
          { occurredAt: kit.local(row.on, '19:40'), domains: [DOMAIN.social] },
          { withEntity: someone, nature: 'a hard conversation', quality: 'strained' },
        ),
      )
    }
    if (row.event === 'domain-update') {
      records.push(
        kit.record(
          'domain-update',
          { occurredAt: kit.local(row.on, '19:40'), domains: [DOMAIN.home] },
          { domain: DOMAIN.home, summary: 'the boiler went' },
        ),
      )
    }
  }

  if (options.reject !== undefined) {
    const object = options.reject.object === 'a bike ride' ? A_BIKE_RIDE : A_WALK
    records.push(
      beliefCorrectionRecord(
        associationBeliefKey(actionScopeOf({ verb: 'move', object })),
        'reject',
        'that is not what is going on',
        { now: kit.local(...options.reject.at), zone: kit.zone },
        nextId(),
      ),
    )
  }

  if (options.decideAt !== undefined) {
    const [day, time] = options.decideAt
    records.push(
      kit.record(
        'observation',
        { occurredAt: kit.local(day, time), domains: [DOMAIN.health] },
        {
          concept: CONCEPT.energy,
          value: { type: 'scale', value: 3, of: 5 },
          method: 'self-report',
        },
      ),
      kit.record(
        'observation',
        { occurredAt: kit.local(day, time), domains: [DOMAIN.health] },
        {
          concept: CONCEPT.soreness,
          value: { type: 'scale', value: 1, of: 5 },
          method: 'self-report',
        },
      ),
      kit.record(
        'observation',
        { occurredAt: kit.local(day, '07:00'), domains: [DOMAIN.sleep] },
        {
          concept: CONCEPT.sleepHours,
          value: { type: 'number', value: 7.5, unit: 'hours' },
          method: 'self-report',
        },
      ),
      kit.record(
        'observation',
        { occurredAt: kit.local(day, time), domains: [DOMAIN.direction] },
        {
          concept: CONCEPT.usableTimeTonight,
          value: { type: 'duration', minutes: 60 },
          method: 'self-report',
        },
      ),
    )
  }

  const place = kit.entity({
    kind: 'place',
    label: 'the kitchen',
    domain: DOMAIN.home,
    privacy: 'normal',
  })

  /*
   * The routines, declared — because a real generator declares the thing it
   * proposes, and a card is only allowed to state a finding it can name.
   */
  const routines =
    options.declare === false
      ? []
      : (['a walk', 'a bike ride'] as const).map((label) =>
          kit.entity({ kind: 'routine', label, domain: DOMAIN.health, privacy: 'normal' }),
        )

  const document = kit.document({
    entities: [place, ...routines],
    records: [...records, ...pastEpisodeRecords(kit, seeds, nextId)],
    exportedAt: now,
  })

  const loaded = snapshotFromWire(document)
  expect(loaded.loaded, 'the document should load').toBe(true)
  return {
    document,
    view: buildView(loaded.snapshot, { now, zone: kit.zone }),
    now,
    zone: kit.zone,
  }
}

function situationOn(built: Built) {
  return assembleSituation(built.view, { now: built.now, zone: built.zone, weekStartsOn: 1 })
}

function associationOn(
  built: Built,
  target: ActionTarget = walkTarget,
): ObservedAssociation | undefined {
  return situationOn(built).learning.associationFor(target)
}

function cardOn(built: Built, object = 'a walk'): Insight | undefined {
  return insightsFor(situationOn(built)).insights.find(
    (insight) => insight.kind === 'state-association' && insight.headline.includes(object),
  )
}

/**
 * N evenings with the move, M of them rising; and the mirror without it.
 *
 * The evenings without it carry a **declined** move rather than nothing at all,
 * because that is what the comparison now requires: an evening the app never
 * asked about is an evening it knows nothing about, and the whole of the third
 * audit finding is that those must not be quietly counted as evenings without.
 */
function run(
  withMove: readonly boolean[],
  withoutMove: readonly boolean[],
  extra: readonly Evening[] = [],
): Built {
  const day = (index: number) => `2026-03-${String(index + 1).padStart(2, '0')}`
  const rows: Evening[] = []
  withMove.forEach((rose, index) =>
    rows.push({ on: day(index), before: 2, after: rose ? 4 : 1, move: 'move' }),
  )
  withoutMove.forEach((rose, index) =>
    rows.push({
      on: day(index + withMove.length),
      before: 2,
      after: rose ? 4 : 1,
      move: 'move',
      ending: 'declined',
    }),
  )
  return evenings([...rows, ...extra])
}

const YES = (count: number) => Array.from({ length: count }, () => true)
const NO = (count: number) => Array.from({ length: count }, () => false)

/** Weekdays and weekend days in March 2026, which begins on a Sunday. */
const WEEKDAYS = [
  '2026-03-02',
  '2026-03-03',
  '2026-03-04',
  '2026-03-05',
  '2026-03-06',
  '2026-03-09',
  '2026-03-10',
  '2026-03-11',
  '2026-03-12',
  '2026-03-13',
  '2026-03-16',
  '2026-03-17',
  '2026-03-18',
  '2026-03-19',
  '2026-03-20',
  '2026-03-23',
] as const

const WEEKENDS = [
  '2026-03-07',
  '2026-03-08',
  '2026-03-14',
  '2026-03-15',
  '2026-03-21',
  '2026-03-22',
  '2026-03-28',
  '2026-03-29',
] as const

// ---------------------------------------------------------------------------
// 1–4: state improves, improves without it, worsens, and is unchanged
// ---------------------------------------------------------------------------

describe('what the record shows, in each direction', () => {
  it('reports a reading that has more often been higher after the move', () => {
    const found = associationOn(run([...YES(5), false], [...NO(5), true]))
    expect(found?.withheld).toBeUndefined()
    expect(found?.overall.direction).toBe('higher')
    expect(found?.overall.rosePresent).toBe(5)
    expect(found?.overall.roseAbsent).toBe(1)
  })

  it('says nothing about the move when it rises just as often without it', () => {
    /*
     * The comparison group earning its keep. Five evenings out of six rising is
     * a striking figure and means nothing on its own: the same is true of the
     * evenings the move never happened.
     */
    const found = associationOn(run([...YES(5), false], [...YES(5), false]))
    expect(found?.withheld).toBeUndefined()
    expect(found?.overall.direction).toBe('no different')
    expect(found?.overall.rosePresent).toBe(5)
    expect(found?.overall.roseAbsent).toBe(5)
  })

  it('reports a reading that has been lower afterwards, and never as harm', () => {
    /*
     * D-066 generalized by D-089. A lower reading is a lower reading. Nothing
     * in the finding, the card or its reasoning may say the move hurt, caused,
     * damaged or backfired.
     */
    const built = run([...NO(5), true], [...YES(5), false])
    expect(associationOn(built)?.overall.direction).toBe('lower')

    const card = cardOn(built)
    expect(card).toBeDefined()
    const words = [card?.headline ?? '', card?.detail ?? '', ...(card?.evidence.reasoning ?? [])]
    for (const line of words) {
      expect(
        /\bharm|\bbackfire|\bcause[sd]?\b|\bmakes? (?:it|you) worse|\bdamag/i.test(line),
        `"${line}" reads as harm or as cause`,
      ).toBe(false)
    }
    expect(card?.headline).toMatch(/lower after/)
  })

  it('reports no direction when the reading does not move at all', () => {
    const built = evenings([
      ...Array.from({ length: 6 }, (_, index) => ({
        on: `2026-03-0${index + 1}`,
        before: 3,
        after: 3,
        move: 'move' as const,
      })),
      ...Array.from({ length: 6 }, (_, index) => ({
        on: `2026-03-1${index}`,
        before: 3,
        after: 3,
        move: 'move' as const,
        ending: 'declined' as const,
      })),
    ])
    const found = associationOn(built)
    expect(found?.overall.direction).toBe('no different')
    expect(found?.overall.rosePresent).toBe(0)
    expect(found?.overall.roseAbsent).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 5–7: missing observations, several dimensions, an unrelated event
// ---------------------------------------------------------------------------

describe('what it refuses to say', () => {
  it('withholds when either side is thin, and names which side', () => {
    const thin = associationOn(run(YES(5), YES(2)))
    expect(thin?.withheld, 'a one-sided comparison is not a comparison').toBeDefined()
    expect(thin?.withheld).toMatch(/2 recorded without it/)
    expect(thin?.overall.direction).toBe('no different')
    expect(thin?.overall.gap).toBe(0)
  })

  it('counts no pair where a reading is missing on either side', () => {
    const built = run(YES(5), NO(5), [
      { on: '2026-04-01', before: 2, after: 4, move: 'move', missingAfter: true },
      { on: '2026-04-02', before: 2, after: 4, move: 'move', missingBefore: true },
      {
        on: '2026-04-03',
        before: 2,
        after: 4,
        move: 'move',
        ending: 'declined',
        missingAfter: true,
      },
    ])
    const found = associationOn(built)
    // The five with and five without are all it may count.
    expect(found?.overall.present).toHaveLength(5)
    expect(found?.overall.absent).toHaveLength(5)
  })

  it('leaves out a pair with an unrelated action in the same gap, and says how many', () => {
    /*
     * An evening with a walk *and* fifteen minutes clearing the kitchen is
     * evidence about neither. Absorbing it into either group would be the app
     * choosing which story to tell; discarding it silently would be the same
     * choice made quietly.
     */
    const built = run(YES(5), NO(5), [
      { on: '2026-04-01', before: 2, after: 4, move: 'move', also: 'reset-space' },
      { on: '2026-04-02', before: 2, after: 4, move: 'move', also: 'reset-space' },
    ])
    const found = associationOn(built)
    expect(found?.confounded).toBe(2)
    expect(found?.overall.present).toHaveLength(5)
    expect(found?.overall.absent).toHaveLength(5)

    expect(cardOn(built)?.evidence.reasoning.join(' ')).toMatch(/2 occasions were left out/)
  })

  it('keeps two dimensions apart when they move in different directions', () => {
    /*
     * One evening can have energy up and soreness up at the same time. Nothing
     * may merge them, and a finding about one may not borrow the other's
     * readings — which is DEF-0020's rule about aspects, applied to state.
     */
    const built = evenings([
      ...Array.from({ length: 6 }, (_, index) => ({
        on: `2026-03-0${index + 1}`,
        before: 2,
        after: 4,
        move: 'move' as const,
      })),
      ...Array.from({ length: 6 }, (_, index) => ({
        on: `2026-03-1${index}`,
        before: 2,
        after: 1,
        move: 'move' as const,
        ending: 'declined' as const,
      })),
      // Soreness on the very same evenings, moving the other way.
      ...Array.from({ length: 6 }, (_, index) => ({
        on: `2026-03-0${index + 1}`,
        before: 4,
        after: 1,
        concept: CONCEPT.soreness,
      })),
    ])
    const found = associationOn(built)
    expect(found?.concept, 'the move declares energy, so energy is what is read').toBe(
      CONCEPT.energy,
    )
    expect(found?.overall.present.every((pair) => pair.rose)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// The audit's first finding: which action this is about
// ---------------------------------------------------------------------------

describe('the action a relationship is about', () => {
  /**
   * Four walks followed by higher energy, four bike rides followed by lower.
   *
   * Both are the `move` verb. Under the old rule they were one pool of eight,
   * averaged to nothing, and printed as a finding about *a walk*.
   */
  const mixed = () =>
    evenings([
      ...[0, 1, 2, 3].map((index) => ({
        on: WEEKDAYS[index] as string,
        before: 2,
        after: 4,
        move: 'move' as const,
        object: 'a walk' as const,
      })),
      ...[4, 5, 6, 7].map((index) => ({
        on: WEEKDAYS[index] as string,
        before: 2,
        after: 1,
        move: 'move' as const,
        object: 'a walk' as const,
        ending: 'declined' as const,
      })),
      ...[8, 9, 10, 11].map((index) => ({
        on: WEEKDAYS[index] as string,
        before: 2,
        after: 1,
        move: 'move' as const,
        object: 'a bike ride' as const,
      })),
      ...[12, 13, 14, 15].map((index) => ({
        on: WEEKDAYS[index] as string,
        before: 2,
        after: 4,
        move: 'move' as const,
        object: 'a bike ride' as const,
        ending: 'declined' as const,
      })),
    ])

  it('never pools two objects that happen to share a verb', () => {
    const built = mixed()
    const walk = associationOn(built, walkTarget)
    const bike = associationOn(built, bikeTarget)

    expect(walk, 'the walk has no finding of its own').toBeDefined()
    expect(bike, 'the bike ride has no finding of its own').toBeDefined()
    expect(walk?.scope).not.toBe(bike?.scope)

    // Four each, not eight pooled.
    expect(walk?.overall.present).toHaveLength(4)
    expect(walk?.overall.absent).toHaveLength(4)
    expect(bike?.overall.present).toHaveLength(4)
    expect(bike?.overall.absent).toHaveLength(4)

    // And they say opposite things, which pooling would have cancelled out.
    expect(walk?.overall.direction).toBe('higher')
    expect(bike?.overall.direction).toBe('lower')
  })

  it('names the object it actually counted, on its own card', () => {
    const built = mixed()
    const cards = insightsFor(situationOn(built)).insights.filter(
      (insight) => insight.kind === 'state-association',
    )
    expect(cards, 'one card per action, not one per verb').toHaveLength(2)

    const walkCard = cards.find((card) => card.headline.includes('a walk'))
    const bikeCard = cards.find((card) => card.headline.includes('a bike ride'))
    expect(walkCard?.headline).toMatch(/higher after a walk/)
    expect(bikeCard?.headline).toMatch(/lower after a bike ride/)

    // The one that must never happen again: a bike ride's evidence printed
    // under a walk's name.
    expect(walkCard?.evidence.counted).toMatch(/4 occasions with a walk and 4 without/)
    expect(walkCard?.evidence.counted).not.toMatch(/bike/)
    expect(walkCard?.headline).not.toMatch(/bike/)
  })

  it('counts the other object as something else that happened, not as a walk', () => {
    /*
     * The bike evenings are not evidence about walks in *either* direction: on
     * the four he rode, something else settled in the gap and the pair is
     * confounded; on the four he turned a ride down, nothing says whether he
     * walked, so the record cannot place them.
     */
    const walk = associationOn(mixed(), walkTarget)
    expect(walk?.confounded).toBe(4)
    expect(walk?.unknownExposure).toBe(4)
  })

  it('never borrows the verb’s phrase for an action it cannot name', () => {
    /*
     * Found by reading what the card actually printed, after the arithmetic was
     * right. Two objects under one verb are two findings with two sets of
     * numbers — and the card's fallback named the *verb*, so both would have
     * printed as "after getting some movement in" with different counts
     * underneath and nothing to say which was which. The pooling defect,
     * reappearing in the copy after it had been fixed in the comparison.
     */
    const built = evenings(
      [
        ...[0, 1, 2, 3].map((index) => ({
          on: WEEKDAYS[index] as string,
          before: 2,
          after: 4,
          move: 'move' as const,
          object: 'a bike ride' as const,
        })),
        ...[4, 5, 6, 7].map((index) => ({
          on: WEEKDAYS[index] as string,
          before: 2,
          after: 1,
          move: 'move' as const,
          object: 'a bike ride' as const,
          ending: 'declined' as const,
        })),
      ],
      { declare: false },
    )

    const found = associationOn(built, bikeTarget)
    expect(
      found?.withheld,
      'the comparison itself is fine — it is the name that is missing',
    ).toBeUndefined()

    const report = insightsFor(situationOn(built))
    expect(
      report.insights.filter((insight) => insight.kind === 'state-association'),
      'a finding was stated about an action the app cannot name',
    ).toHaveLength(0)

    // Not silently dropped either: it appears where nothing is claimed.
    const line = report.gathering.find((entry) => entry.needs.includes('no name'))
    expect(line, 'the finding vanished without a word').toBeDefined()
    expect(line?.occasions).toBe(8)
  })

  it('aggregates two objects only where somebody has written down why', () => {
    /*
     * The table is empty, and that is the point: pooling is a decision with a
     * name on it rather than a default. `architecture-guards` holds the rule
     * that an entry cannot exist without a reason.
     */
    expect(ACTION_FAMILIES).toHaveLength(0)
    expect(actionScopeOf(walkTarget)).not.toBe(actionScopeOf(bikeTarget))
  })
})

// ---------------------------------------------------------------------------
// The audit's second finding: context changes the relationship
// ---------------------------------------------------------------------------

describe('a relationship that depends on the kind of evening', () => {
  /**
   * Walks that helped on every weekday and on no weekend.
   *
   * Read across the whole record this is four of eight against four of eight —
   * "no different" — which describes an evening that never happened. It is
   * also, exactly, the figure that used to reach the ranking on a Tuesday.
   */
  const split = (options: Options = {}) =>
    evenings(
      [
        ...[0, 1, 2, 3].map((index) => ({
          on: WEEKDAYS[index] as string,
          before: 2,
          after: 4,
          move: 'move' as const,
        })),
        ...[4, 5, 6, 7].map((index) => ({
          on: WEEKDAYS[index] as string,
          before: 2,
          after: 1,
          move: 'move' as const,
          ending: 'declined' as const,
        })),
        ...[0, 1, 2, 3].map((index) => ({
          on: WEEKENDS[index] as string,
          before: 2,
          after: 1,
          move: 'move' as const,
        })),
        ...[4, 5, 6, 7].map((index) => ({
          on: WEEKENDS[index] as string,
          before: 2,
          after: 4,
          move: 'move' as const,
          ending: 'declined' as const,
        })),
      ],
      options,
    )

  it('finds the disagreement rather than averaging it away', () => {
    const found = associationOn(split())
    expect(found?.disagree, 'the record disagrees with itself and nothing noticed').toBe(true)
    expect(found?.overall.direction, 'the whole record collapses, as it should').toBe(
      'no different',
    )

    const banded = found?.splits.find((entry) => entry.disagree)
    expect(banded?.id).toBe('weekend')
    expect(banded?.yes.direction).toBe('lower')
    expect(banded?.no.direction).toBe('higher')
  })

  it('answers for the evening it is asked about, not for the record', () => {
    const built = split()
    const found = associationOn(built)
    expect(found).toBeDefined()

    const weekday = applicableAssociation(found as ObservedAssociation, built.now, built.zone)
    expect(weekday, 'the first of June 2026 is a Monday').toBeDefined()
    expect(weekday?.direction).toBe('higher')

    const weekend = applicableAssociation(
      found as ObservedAssociation,
      clock.local('2026-06-06', '18:10'),
      built.zone,
    )
    expect(weekend?.direction, 'the sixth of June 2026 is a Saturday').toBe('lower')
  })

  it('never prints the collapsed figure as if it described an evening', () => {
    const card = cardOn(split())
    expect(card, 'nothing was said at all').toBeDefined()
    expect(card?.headline).toMatch(/depends on when/i)
    expect(card?.headline).toMatch(/on a weekday/)
    expect(card?.headline).toMatch(/at the weekend/)
    // Four of eight is the figure that describes neither kind of evening.
    expect(card?.detail).not.toMatch(/of 8/)
    expect(card?.evidence.counted).toMatch(/4 occasions with a walk and 4 without at the weekend/)
  })

  it('keeps the collapsed figure out of a contextual recommendation', () => {
    /*
     * The finding reaching the decision, and reaching it *as the right
     * finding*. On a Tuesday the ranking may use the weekday comparison; it may
     * not use four-of-eight, and it may not use the weekend one.
     */
    const built = split({ decideAt: ['2026-03-31', '17:50'] })
    const decision = decideOn(built.document, built.now, built.zone)

    const walkRow = decision.trace.proposed.find((move) => move.verb === 'move')
    expect(walkRow, 'no walk was proposed, so nothing was tested').toBeDefined()
    const dimension = decision.trace.ranking
      .find((row) => row.id === walkRow?.id)
      ?.dimensions.find((entry) => entry.name === 'observed-change')

    expect(
      dimension?.weight,
      'the observed relationship never reached the ranking',
    ).toBeGreaterThan(0)
    expect(dimension?.value, 'a Tuesday was ranked on a figure about no evening').toBeGreaterThan(0)
    expect(dimension?.note).toMatch(/on a weekday/)
  })

  it('reads the whole record where nothing disagrees, and says so', () => {
    /*
     * The other half of the rule, and the reason this is not simply "always
     * band". Where the bands agree — or where there is not enough of one to
     * say — the whole record *is* the honest scope, and narrowing it would
     * throw away evidence for the sake of a caveat.
     */
    const built = run(YES(5), NO(5))
    const found = associationOn(built)
    expect(found?.disagree).toBe(false)
    expect(found?.splits, 'a band nothing supports is not a split').toHaveLength(0)
    expect(applicableAssociation(found as ObservedAssociation, built.now, built.zone)?.label).toBe(
      'across the record',
    )
    expect(found?.window).toBeDefined()
    expect(found?.overall.present.length ?? 0).toBeGreaterThanOrEqual(MIN_PAIRS)
  })
})

// ---------------------------------------------------------------------------
// The audit's third finding: what the record does not say
// ---------------------------------------------------------------------------

describe('evenings the record cannot place', () => {
  it('puts an evening nobody asked about in neither group', () => {
    const built = run(YES(5), NO(5), [
      { on: '2026-04-01', before: 2, after: 4 },
      { on: '2026-04-02', before: 2, after: 4 },
      { on: '2026-04-03', before: 2, after: 4 },
    ])
    const found = associationOn(built)
    expect(found?.unknownExposure, 'silence was counted as something').toBe(3)
    expect(found?.overall.absent, 'unknown evenings leaked into the comparison group').toHaveLength(
      5,
    )
    expect(found?.overall.present).toHaveLength(5)
  })

  it('abstains rather than build a comparison group out of silence', () => {
    /*
     * Eight evenings with a walk, twelve with readings and no episode at all,
     * and not one occasion the record says he did not walk. The old rule read
     * that as eight against twelve and stated a relationship. There is no
     * comparison here to state.
     */
    const built = run(
      YES(8),
      [],
      Array.from({ length: 12 }, (_, index) => ({
        on: `2026-04-${String(index + 1).padStart(2, '0')}`,
        before: 2,
        after: 4,
      })),
    )
    const found = associationOn(built)
    expect(found?.withheld, 'a comparison was stated with nothing to compare against').toBeDefined()
    expect(found?.overall.absent).toHaveLength(0)
    expect(found?.unknownExposure).toBe(12)
    expect(found?.withheld).toMatch(/nothing in the record says whether it happened/)
    expect(cardOn(built), 'a withheld finding still printed a card').toBeUndefined()
  })

  it('counts a move he could not do as a real evening without it', () => {
    /*
     * The other side of the same rule. *Unknown* is silence, not refusal — an
     * evening he was offered a walk and said he could not is an evening the
     * record genuinely places.
     */
    const built = evenings([
      ...[0, 1, 2, 3].map((index) => ({
        on: WEEKDAYS[index] as string,
        before: 2,
        after: 4,
        move: 'move' as const,
      })),
      ...[4, 5, 6, 7].map((index) => ({
        on: WEEKDAYS[index] as string,
        before: 2,
        after: 1,
        move: 'move' as const,
        ending: 'unable-now' as const,
      })),
    ])
    const found = associationOn(built)
    expect(found?.withheld).toBeUndefined()
    expect(found?.overall.absent).toHaveLength(4)
    expect(found?.unknownExposure).toBe(0)
  })

  it('says how many it could not place, on the card', () => {
    const built = run(YES(5), NO(5), [
      { on: '2026-04-01', before: 2, after: 4 },
      { on: '2026-04-02', before: 2, after: 4 },
    ])
    const reasoning = cardOn(built)?.evidence.reasoning.join(' ') ?? ''
    expect(reasoning).toMatch(/2 occasions are in neither group/)
    expect(reasoning).toMatch(/Not knowing is not the same as it not happening/)
  })
})

// ---------------------------------------------------------------------------
// The audit's fourth finding: what "nothing else happened" may mean
// ---------------------------------------------------------------------------

describe('what else the record holds about the gap', () => {
  it('discards a pair with a recorded event in between, not only another move', () => {
    /*
     * The audit's own reproduction: four relationship events recorded between a
     * walk and the later reading, a confounded count of zero, and the card
     * saying "no occasion had to be left out for something else happening in
     * between". A claim about the world, from a check of one record kind.
     */
    const built = run(YES(5), NO(5), [
      { on: '2026-04-01', before: 2, after: 4, move: 'move', event: 'relationship-event' },
      { on: '2026-04-02', before: 2, after: 4, move: 'move', event: 'relationship-event' },
      { on: '2026-04-03', before: 2, after: 4, move: 'move', event: 'relationship-event' },
      { on: '2026-04-04', before: 2, after: 4, move: 'move', event: 'relationship-event' },
    ])
    const found = associationOn(built)
    expect(found?.confounded, 'four recorded events confounded nothing').toBe(4)
    expect(found?.overall.present).toHaveLength(5)
  })

  it('treats the confounding classes as a class, not as one special case', () => {
    const built = run(YES(5), NO(5), [
      { on: '2026-04-01', before: 2, after: 4, move: 'move', event: 'domain-update' },
      { on: '2026-04-02', before: 2, after: 4, move: 'move', event: 'domain-update' },
    ])
    expect(associationOn(built)?.confounded).toBe(2)
    expect(CONFOUNDING_KINDS).toContain('relationship-event')
    expect(CONFOUNDING_KINDS).toContain('domain-update')
    expect(CONFOUNDING_KINDS.length).toBeGreaterThan(2)
  })

  it('claims only the check it actually ran', () => {
    /*
     * The copy is the defect here as much as the count. "Nothing else happened
     * in between" is a claim about his evening; what the app can say is which
     * recorded classes it looked at and found nothing in.
     */
    const clean = cardOn(run(YES(5), NO(5)))?.evidence.reasoning.join(' ') ?? ''
    expect(clean).toMatch(/No occasion had to be left out for something else recorded/)
    expect(clean).toMatch(/a change in circumstances|a constraint|noted about someone/)
    expect(
      /nothing else happened in between/i.test(clean),
      'the app claims to know what did not happen',
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// The audit's fifth finding: the owner can be right and the app wrong
// ---------------------------------------------------------------------------

describe('correcting what the app has worked out', () => {
  const rows = (): readonly Evening[] => [
    ...[0, 1, 2, 3, 4, 5].map((index) => ({
      on: WEEKDAYS[index] as string,
      before: 2,
      after: 4,
      move: 'move' as const,
    })),
    ...[6, 7, 8, 9, 10, 11].map((index) => ({
      on: WEEKDAYS[index] as string,
      before: 2,
      after: 1,
      move: 'move' as const,
      ending: 'declined' as const,
    })),
  ]

  it('offers the finding as something to disagree with', () => {
    /*
     * Every other card here summarises the owner's own opinions, and there is
     * nothing to overrule in a tally of what he said. This one is the app's own
     * conclusion about his life, which is precisely why it needs a veto.
     */
    const card = cardOn(evenings(rows()))
    expect(card?.belief, 'the app’s own conclusion cannot be disagreed with').toBeDefined()
    expect(card?.belief).toBe(associationBeliefKey(actionScopeOf(walkTarget)))
    expect(card?.beliefLabel).toMatch(/a walk/)
  })

  it('scopes the correction to the action, not to the verb', () => {
    expect(associationBeliefKey(actionScopeOf(walkTarget))).not.toBe(
      associationBeliefKey(actionScopeOf(bikeTarget)),
    )
  })

  it('stops the disputed run counting, and deletes nothing', () => {
    const before = evenings(rows())
    expect(associationOn(before)?.overall.direction).toBe('higher')

    const after = evenings(rows(), { reject: { object: 'a walk', at: ['2026-03-24', '09:00'] } })
    expect(associationOn(after)?.withheld, 'the rejected conclusion survived').toBeDefined()
    expect(cardOn(after)).toBeUndefined()

    // Preserve history. Correct future interpretation.
    const readings = (built: Built) =>
      built.view.history.effective.filter((record) => record.kind === 'observation').length
    expect(readings(after), 'a correction deleted the readings underneath it').toBe(
      readings(before),
    )
    expect(situationOn(after).learning.episodes.length).toBe(
      situationOn(before).learning.episodes.length,
    )
  })

  it('names the action in the owner’s own history, not the verb', () => {
    /*
     * R3-B2, and the assertion whose absence let it through. The key is scoped
     * to the action and the card's own control says "follows a walk" — but the
     * *stored* correction is read back by the shared history renderer months
     * later, and that path named the verb: "Told the app to stop assuming what
     * the app has worked out follows moving." A sentence that fits the bike
     * ride he never disputed, on the surface that is supposed to be the
     * canonical account of what he did.
     *
     * The identity invariant survived in the key and died on the way to the
     * screen, so this test goes through the screen.
     */
    const built = evenings(rows(), { reject: { object: 'a walk', at: ['2026-03-24', '09:00'] } })
    const entries = assembleTimeline(situationOn(built), 500).days.flatMap((day) => day.entries)

    const correction = entries.find((entry) => /stop assuming/i.test(entry.text))
    expect(correction, 'the correction never reached Timeline').toBeDefined()
    expect(correction?.text, correction?.text).toContain('a walk')
    /*
     * The verb alone would fit an action he never disputed.
     *
     * Written as substring checks rather than a word-boundary regex on
     * purpose. `\b` written through a shell heredoc has arrived in this
     * repository as a literal backspace three times now (DEF-0041), and a
     * sweep that cannot fail is worse than no sweep. There is nothing a
     * boundary buys here that these two do not.
     */
    const said = (correction?.text ?? '').toLowerCase()
    for (const verbAlone of ['follows move', 'follows moving']) {
      expect(said.includes(verbAlone), `"${said}" names the verb, which fits a bike ride too`).toBe(
        false,
      )
    }
  })

  it('lets the app conclude again from evidence he has not disputed', () => {
    /*
     * A veto is not a permanent silence — it is a watershed. Everything before
     * the moment he said so stops counting toward this conclusion, and what
     * happens afterwards counts normally, including reaching the opposite
     * conclusion.
     */
    /*
     * April weekdays, so the later run is neither disputed nor banded away
     * from the earlier one — the only thing separating them is the correction.
     */
    const later: readonly Evening[] = [
      ...['2026-04-01', '2026-04-02', '2026-04-03', '2026-04-06'].map((on) => ({
        on,
        before: 2,
        after: 1,
        move: 'move' as const,
      })),
      ...['2026-04-07', '2026-04-08', '2026-04-09', '2026-04-10'].map((on) => ({
        on,
        before: 2,
        after: 4,
        move: 'move' as const,
        ending: 'declined' as const,
      })),
    ]
    // The rejection lands after every evening in `rows()` and before April.
    const built = evenings([...rows(), ...later], {
      reject: { object: 'a walk', at: ['2026-03-20', '09:00'] },
    })
    const found = associationOn(built)
    expect(found?.withheld, 'nothing could be learned after a correction').toBeUndefined()
    expect(found?.overall.direction, 'the later evidence never got a hearing').toBe('lower')
    expect(found?.overall.present).toHaveLength(4)
  })
})

// ---------------------------------------------------------------------------
// History keeps its meaning, and the engine learns without being graded
// ---------------------------------------------------------------------------

describe('the owner’s judgments and the app’s findings stay apart', () => {
  it('keeps every existing effect record as the owner’s own judgment', () => {
    /*
     * The owner's explicit instruction: nothing already recorded is relabelled,
     * reinterpreted or deleted. `long-run` holds ten graded walks and twelve
     * graded kitchen evenings from before D-089, and they still teach exactly
     * what they taught — the new quantity is additive.
     */
    const situation = loadScenario('long-run').decision().situation
    const effect = situation.learning.effectFor('move', situation.context)
    expect(effect.samples, 'the old attributions still count').toBeGreaterThan(0)

    // And they are shown as his, not as observations.
    const cards = insightsFor(situation).insights
    for (const card of cards) {
      for (const rate of card.evidence.rates) {
        if (rate.aspect === 'follow-through') continue
        expect(rate.measures, `"${rate.measures}" reads as an observed fact`).toMatch(/you said/i)
      }
    }
  })

  it('learns a real relationship on a history with no causal answer in it', () => {
    /*
     * **The test whose absence let QA-A1 through.** "Two months of readings, and
     * nothing graded" contains not one `effect` outcome. Before this repair the
     * engine could learn nothing at all from it; Insights would have shown a
     * "still gathering" line and the ranking would have sat on its priors.
     */
    const loaded = loadScenario('observed-evenings')
    const situation = loaded.decision().situation

    const graded = situation.view.history.effective.filter(
      (record) => record.kind === 'outcome' && record.aspect === 'effect',
    )
    expect(graded, 'this history must contain no causal judgment at all').toHaveLength(0)

    const found = situation.learning.associationFor(walkTarget)
    expect(found?.withheld).toBeUndefined()
    expect(found?.overall.direction).toBe('higher')

    const card = insightsFor(situation).insights.find(
      (insight) => insight.kind === 'state-association',
    )
    expect(card, 'nothing was learned from a history with no grades in it').toBeDefined()
    expect(card?.headline).toMatch(/higher after a walk than without one/)

    // And it reaches the decision, not only the screen.
    const chosen = loaded
      .decision()
      .trace.ranking.find((row) => row.id === loaded.decision().evaluation?.candidate.id)
    const everyDimension = loaded.decision().trace.ranking.flatMap((row) => row.dimensions)
    const observed = everyDimension.filter((dimension) => dimension.name === 'observed-change')
    expect(observed.length, 'the ranking never asked about it').toBeGreaterThan(0)
    expect(chosen).toBeDefined()
  })

  it('says out loud how many evenings it could not place, on that history', () => {
    /*
     * The same scenario carries three evenings with readings and no suggestion
     * either way, and two where something else settled in the gap. Both are
     * reported rather than absorbed.
     */
    const situation = loadScenario('observed-evenings').decision().situation
    const found = situation.learning.associationFor(walkTarget)
    expect(found?.overall.present).toHaveLength(14)
    expect(found?.overall.absent).toHaveLength(14)
    expect(found?.unknownExposure).toBe(3)
    expect(found?.confounded).toBe(2)
  })

  it('costs a move nothing to have no observable dimension', () => {
    /*
     * D-048: a dimension with nothing to say must cost nothing to have. Most
     * moves declare no state dimension at all, and marking them down for it
     * would be the app penalising a move for a question nobody asked — the
     * same error `uncertainty` made about coverage gaps (DEF-0023, D-072).
     *
     * Asserted as *zero weight*, not as "zero value when the weight is zero":
     * the second is a tautology, and it is what let a −1 at full weight through
     * a reintroduction pass.
     */
    const decision = loadScenario('what-worked').decision()
    const situation = decision.situation

    expect(
      situation.learning.associations.every((entry) => entry.withheld !== undefined),
      'this scenario is meant to have nothing observed to say',
    ).toBe(true)

    let checked = 0
    for (const row of decision.trace.ranking) {
      const dimension = row.dimensions.find((entry) => entry.name === 'observed-change')
      expect(dimension, 'every ranked move should carry the dimension').toBeDefined()
      checked += 1
      expect(dimension?.weight, `${row.id} is marked down for having nothing observed`).toBe(0)
      expect(dimension?.value).toBe(0)
    }
    expect(checked, 'nothing was actually checked').toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// The asking side
// ---------------------------------------------------------------------------

describe('what the owner is asked', () => {
  it('asks no move that declares a state dimension to be graded by him', () => {
    /*
     * The class, not the walk. Every verb whose profile names an observable
     * state dimension must have had the effect question taken off it — asking
     * for the grade is the thing D-089 removes, and doing it for one verb and
     * not the others would leave the defect wearing a different name.
     */
    const observes = ACTION_VERBS.filter((verb) => profileFor(verb).affects !== undefined)
    expect(observes.length, 'no verb declares an observable dimension').toBeGreaterThan(0)

    const built = run(YES(5), NO(5))
    const situation = situationOn(built)

    for (const episode of situation.learning.episodes) {
      const verb = episode.semantics.target.verb
      if (profileFor(verb).affects === undefined) continue
      const asked = outcomeQuestionsFor(episode, situation.entities)
      // The catalogue may still hold an effect question for the verb; what must
      // not happen is that it is put in front of him.
      const due = nextDueOutcome(
        built.view,
        { now: episode.settledAt ?? built.now, zone: built.zone },
        situation.entities,
      )
      if (due?.episode.recommendation !== episode.recommendation) continue
      expect(
        due.questions.some((question) => question.aspect === 'effect'),
        `${verb} still asks the owner to grade what it did`,
      ).toBe(false)
      expect(asked.length + due.questions.length).toBeGreaterThanOrEqual(0)
    }
  })

  it('declares a state dimension only where one is honestly observable', () => {
    /*
     * The other half of section 4.5. A mapping invented to fill the field in —
     * "unhurried time with your daughter moves your emotional state" — would be
     * a relationship nobody can observe, asserted by a table.
     */
    for (const [verb, profile] of Object.entries(MOVE_PROFILES)) {
      if (profile.affects === undefined) continue
      expect(
        [CONCEPT.energy, CONCEPT.sleepHours] as readonly string[],
        `${verb} declares a dimension nothing reads numerically`,
      ).toContain(profile.affects)
    }
  })

  it('asks for the reading itself where the guide will not', () => {
    /*
     * The replacement for the grade, and it is one question rather than two.
     *
     * The evening deliberately has no later reading: that is the whole case.
     * With one already recorded there is nothing to ask for, which is the
     * behaviour the next assertion in this file covers.
     */
    const built = evenings(
      [{ on: '2026-03-01', before: 2, after: 4, move: 'move', missingAfter: true }],
      { readAt: ['2026-03-01', '19:35'] },
    )
    const situation = situationOn(built)
    const episode = situation.learning.episodes[0]
    expect(episode).toBeDefined()
    const due = nextDueOutcome(built.view, { now: built.now, zone: built.zone }, situation.entities)
    expect(due?.reading, 'the app should ask for the reading').toBe(CONCEPT.energy)
    expect(due?.questions.some((question) => question.aspect === 'effect')).toBe(false)
  })
})

describe('the panel behind the move on Now', () => {
  it('carries the observed relationship, worded as association', () => {
    /*
     * Found by reading the deployed panel. Insights led with the finding, the
     * ranking used it, and the one surface that exists to answer *why this?*
     * said nothing about it — on a history where it was the only real evidence
     * there was.
     */
    const decision = loadScenario('observed-evenings').decision()
    const evidence = evidenceForDecision(decision)
    expect(evidence?.observed, 'the panel says nothing about what follows it').toBeDefined()
    expect(evidence?.observed).toMatch(/current energy/i)
    expect(evidence?.observed).toMatch(/11 of 14 against 4 of 14/)
    expect(evidence?.observed).toMatch(/[Aa]cross the whole record/)
    // The object's own name — "with a walk than without", not the gerund.
    expect(evidence?.observed).toMatch(/with a walk than without/)
    expect(
      /\bcauses?\b|\bimproves?\b|\bbecause\b/i.test(evidence?.observed ?? ''),
      'the panel states a cause',
    ).toBe(false)
  })

  it('says nothing there where there is nothing observed to say', () => {
    // Most histories in the library have no readings on both sides of a move.
    const decision = loadScenario('what-worked').decision()
    expect(evidenceForDecision(decision)?.observed).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// And the library-wide sweep
// ---------------------------------------------------------------------------

describe('across every history in the library', () => {
  it('states a relationship only where both groups clear the threshold', () => {
    for (const scenario of SCENARIOS) {
      const situation = loadScenario(scenario.id).decision().situation
      for (const found of situation.learning.associations) {
        if (found.withheld !== undefined) {
          expect(
            found.overall.direction,
            `${scenario.id}: a direction over withheld evidence`,
          ).toBe('no different')
          continue
        }
        /*
         * Something has to be supported for anything to be stated: the whole
         * record, or the two sides of a band that disagrees with itself.
         */
        const stated = found.disagree
          ? found.splits.filter((entry) => entry.disagree).flatMap((entry) => [entry.yes, entry.no])
          : [found.overall]
        expect(stated.length, `${scenario.id}: stated with nothing behind it`).toBeGreaterThan(0)
        for (const side of stated) {
          expect(side.present.length, scenario.id).toBeGreaterThanOrEqual(MIN_PAIRS)
          expect(side.absent.length, scenario.id).toBeGreaterThanOrEqual(MIN_PAIRS)
        }
      }
    }
  })

  it('never treats an evening the record cannot place as one without the move', () => {
    for (const scenario of SCENARIOS) {
      const situation = loadScenario(scenario.id).decision().situation
      for (const found of situation.learning.associations) {
        for (const pair of [...found.overall.present, ...found.overall.absent]) {
          expect(
            pair.exposure,
            `${scenario.id}: an unplaced evening in a comparison group`,
          ).not.toBe('unknown')
        }
      }
    }
  })

  it('never says one thing caused another, anywhere', () => {
    const causal = /\bcause[sd]?\b|\bcausing\b|\bbecause of\b|\bimproves?\b|\bmakes? you\b|\bharm/i
    for (const scenario of SCENARIOS) {
      const situation = loadScenario(scenario.id).decision().situation
      for (const insight of insightsFor(situation).insights) {
        if (insight.kind !== 'state-association') continue
        const lines = [insight.headline, insight.detail, ...insight.evidence.reasoning]
        for (const line of lines) {
          expect(causal.test(line), `${scenario.id}: "${line}"`).toBe(false)
        }
      }
    }
  })

  it('leaves the decision alone where it has nothing to say', () => {
    for (const scenario of SCENARIOS) {
      const decision = loadScenario(scenario.id).decision()
      for (const row of decision.trace.ranking) {
        const dimension = row.dimensions.find((entry) => entry.name === 'observed-change')
        if (dimension === undefined) continue
        if (dimension.weight > 0) continue
        expect(dimension.value, `${scenario.id}: an abstaining dimension with a value`).toBe(0)
      }
    }
  })
})
