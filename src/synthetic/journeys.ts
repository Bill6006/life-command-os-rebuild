import { CONCEPT } from '../domain/concepts'
import { DOMAIN } from '../domain/domains'
import { entityRef } from '../domain/entities'
import { sequentialRecordIds } from '../domain/ids'
import { createKit, pastEpisodeRecords, type Scenario } from './kit'

/**
 * The near-empty histories routing 83 is accepted against — D-161, F38.
 *
 * Every other history in this library was written to make one capability
 * legible: a course of action two sessions in, a week pointed at the house,
 * three broken nights against a deadline. Each of them starts with the objects
 * the capability needs already in it, because that is the only way to put the
 * capability on a screen.
 *
 * That is exactly what D-161 says is no longer sufficient. An independent
 * reader with a browser found forty-four things that 1,332 unit tests, 501
 * browser assertions, a 93-check Android gate and twelve rounds of independent
 * QA did not, and the largest class of them was **objects that are easy to
 * encounter in a fixture and impossible to introduce as an owner**. A fixture
 * that hands the engine a goal, a topic and a child cannot see that, because
 * the question it is answering starts after the part that fails.
 *
 * So these three start before it. They hold almost nothing, and what the app
 * can do with them is whatever an ordinary owner could actually reach through
 * ordinary use. `tests/synthetic/journey.ts` walks them through the same
 * functions the surfaces call, and `ordinary-use-journey.test.ts` records the
 * points where an ordinary journey cannot proceed.
 *
 * They are in the shipped library rather than in the test tree on purpose: the
 * QA laboratory loads this list, so the same three histories the suite walks
 * are three the owner can tap through on a phone. An instrument only the suite
 * can reach would be one more builder-written fixture.
 */

// ---------------------------------------------------------------------------
// F38 — the first evening
// ---------------------------------------------------------------------------

/**
 * One answer, on the evening the app was opened.
 *
 * Deliberately one record rather than none. A store with nothing in it renders
 * `EmptyNow` — "There is no history here yet" — which is a real state and not
 * the one this is about: the journey starts at the moment the owner has told
 * the app something and is waiting to find out what it can do with it.
 *
 * Nothing here names a goal, a topic, a person, a place or a skill, because an
 * owner on his first evening has no way to name one. That absence is the
 * fixture's whole content.
 */
function theFirstEvening(): Scenario {
  const kit = createKit('JA', 'America/Denver', '2026-05-04T12:00:00Z')
  const now = kit.local('2026-05-06', '19:30')

  return {
    id: 'the-first-evening',
    title: 'The first evening',
    summary: 'One answer given, and nothing else in the store at all.',
    proves:
      'D-161 — what an ordinary owner can reach from a near-empty store, and where the ordinary journey stops.',
    zone: kit.zone,
    now,
    build() {
      const sleep = kit.record(
        'observation',
        { occurredAt: kit.local('2026-05-06', '07:10'), domains: [DOMAIN.sleep] },
        {
          concept: CONCEPT.sleepHours,
          value: { type: 'number', value: 7, unit: 'hours' },
          method: 'self-report',
        },
      )

      return kit.document({ entities: [], records: [sleep], exportedAt: now })
    },
  }
}

// ---------------------------------------------------------------------------
// F39 — four records, and a sentence about the size of the record
// ---------------------------------------------------------------------------

/**
 * A store of four records — the size the review read "plenty of history" on.
 *
 * E17 read that sentence on `mostly-unknown`, whose four records are three
 * observations and a retraction. This is the same size from the other
 * direction: four records the owner actually gave, none withdrawn, spread over
 * three days, so the count is unambiguous and the sentence has nothing to hide
 * behind. `no-action-copy.test.ts` renders the catalogue against both.
 *
 * Four is not a magic number and nothing in the repair keys on it. It is the
 * size the review happened to be standing at, and the point of writing it down
 * is that the copy catalogue is now rendered at a size the library reaches
 * rather than only at the sizes it happened to reach.
 */
function fourRecords(): Scenario {
  const kit = createKit('JB', 'America/Denver', '2026-05-04T12:00:00Z')
  const now = kit.local('2026-05-08', '20:30')

  return {
    id: 'four-records',
    title: 'Four things, over three days',
    summary: 'Four answers and nothing else — the history size the review read "plenty" on.',
    proves:
      'F39 / D-153 — a sentence about how much history there is is checked against how much there is.',
    zone: kit.zone,
    now,
    build() {
      const firstNight = kit.record(
        'observation',
        { occurredAt: kit.local('2026-05-06', '07:05'), domains: [DOMAIN.sleep] },
        {
          concept: CONCEPT.sleepHours,
          value: { type: 'number', value: 7, unit: 'hours' },
          method: 'self-report',
        },
      )

      const secondNight = kit.record(
        'observation',
        { occurredAt: kit.local('2026-05-07', '07:05'), domains: [DOMAIN.sleep] },
        {
          concept: CONCEPT.sleepHours,
          value: { type: 'number', value: 6.5, unit: 'hours' },
          method: 'self-report',
        },
      )

      const energy = kit.record(
        'observation',
        { occurredAt: kit.local('2026-05-07', '18:40'), domains: [DOMAIN.health] },
        {
          concept: CONCEPT.energy,
          value: { type: 'scale', value: 3, of: 5 },
          method: 'self-report',
        },
      )

      const friction = kit.record(
        'observation',
        { occurredAt: kit.local('2026-05-08', '09:15'), domains: [DOMAIN.home] },
        {
          concept: CONCEPT.homeFriction,
          value: { type: 'text', value: 'The hallway is full of boxes' },
          method: 'self-report',
        },
      )

      return kit.document({
        entities: [],
        records: [firstNight, secondNight, energy, friction],
        exportedAt: now,
      })
    },
  }
}

// ---------------------------------------------------------------------------
// F43 — a completion exactly three days back
// ---------------------------------------------------------------------------

/**
 * The history the review was standing on when Now went inert — D-160.
 *
 * A walk, suggested and completed on the 22nd. Read on the 25th, with today's
 * own answers given and no move settled today. `recentMoves` is a three-day
 * window, so the 22nd's completed episode is inside it and the 25th's freshly
 * generated walk used to resolve its state through it: **"Where this stands —
 * Done"**, with all five controls inert, on a suggestion the owner had never
 * seen.
 *
 * Exactly three days, because the boundary is where the defect lives. Two days
 * would prove the same thing with slack in it; four would fall outside the
 * window and prove nothing at all.
 *
 * **The clock times are load-bearing and this says so out loud.** The window is
 * `addLocalDays(now, -3)`, an instant rather than a day boundary, so the 22nd's
 * episode is inside it only because 20:00 is later in the evening than 18:45.
 * `occurrence-identity.test.ts` asserts the episode is still in `recentMoves`
 * on the read, which is what stops this fixture quietly falling out of the
 * window and passing for the wrong reason.
 */
function threeDaysSinceThatWalk(): Scenario {
  const kit = createKit('JC', 'America/Denver', '2026-05-04T12:00:00Z')
  const nextId = sequentialRecordIds('JCE')
  const now = kit.local('2026-05-25', '18:45')
  const walk = entityRef('routine', 'a walk')

  return {
    id: 'three-days-since',
    title: 'Three days since that walk',
    summary: 'A walk finished on the 22nd, read on the 25th, with today’s answers already given.',
    proves:
      'D-160 — a settled occurrence from an earlier day does not settle today’s recommendation or disable its controls.',
    zone: kit.zone,
    now,
    build() {
      const past = pastEpisodeRecords(
        kit,
        [
          {
            verb: 'move',
            object: walk,
            domain: DOMAIN.health,
            on: '2026-05-22',
            at: '20:00',
            context: { block: 'evening', weekend: false, strain: 'none', usableMinutes: 60 },
            ending: 'completed',
            result: 'all',
            effect: 'some',
          },
        ],
        nextId,
      )

      // Today's own answers, so the walk is generated again on the 25th rather
      // than only remembered from the 22nd. Both are needed: `healthCandidates`
      // wants no strain and a real capacity reading.
      const sleptOn22nd = kit.record(
        'observation',
        { occurredAt: kit.local('2026-05-22', '07:00'), domains: [DOMAIN.sleep] },
        {
          concept: CONCEPT.sleepHours,
          value: { type: 'number', value: 7.5, unit: 'hours' },
          method: 'self-report',
        },
      )

      const sleptLastNight = kit.record(
        'observation',
        { occurredAt: kit.local('2026-05-25', '07:00'), domains: [DOMAIN.sleep] },
        {
          concept: CONCEPT.sleepHours,
          value: { type: 'number', value: 7.5, unit: 'hours' },
          method: 'self-report',
        },
      )

      const energy = kit.record(
        'observation',
        { occurredAt: kit.local('2026-05-25', '18:20'), domains: [DOMAIN.health] },
        {
          concept: CONCEPT.energy,
          value: { type: 'scale', value: 4, of: 5 },
          method: 'self-report',
        },
      )

      const soreness = kit.record(
        'observation',
        { occurredAt: kit.local('2026-05-25', '18:21'), domains: [DOMAIN.health] },
        {
          concept: CONCEPT.soreness,
          value: { type: 'scale', value: 0, of: 5 },
          method: 'self-report',
        },
      )

      const time = kit.record(
        'observation',
        { occurredAt: kit.local('2026-05-25', '18:22'), domains: [DOMAIN.career] },
        {
          concept: CONCEPT.freeNow,
          value: { type: 'duration', minutes: 60 },
          method: 'self-report',
        },
      )

      return kit.document({
        entities: [],
        records: [sleptOn22nd, ...past, sleptLastNight, energy, soreness, time],
        exportedAt: now,
      })
    },
  }
}

export const JOURNEY_SCENARIOS: readonly Scenario[] = [
  theFirstEvening(),
  fourRecords(),
  threeDaysSinceThatWalk(),
]

export const FIRST_EVENING_ID = 'the-first-evening'
export const FOUR_RECORDS_ID = 'four-records'
export const THREE_DAYS_SINCE_ID = 'three-days-since'
