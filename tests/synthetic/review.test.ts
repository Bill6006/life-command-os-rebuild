import { describe, expect, it } from 'vitest'
import { DOMAIN } from '../../src/domain/domains'
import { entityId, sequentialRecordIds } from '../../src/domain/ids'
import type { CanonicalRecord } from '../../src/domain/records'
import { BLOCKER_OPTIONS } from '../../src/intelligence/blockers'
import { insightsFor } from '../../src/intelligence/insights'
import { collectEpisodes } from '../../src/intelligence/lifecycle'
import {
  A_PATTERN_OF_BLOCKERS,
  burdenOver,
  describeBurden,
  recurringBlockers,
  STALLED_AFTER_DAYS,
  stalledStrategies,
} from '../../src/intelligence/review'
import { assembleSituation, type Situation } from '../../src/intelligence/situation'
import { buildView } from '../../src/memory/view'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { createKit, pastEpisodeRecords, type PastEpisode } from '../../src/synthetic/kit'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { evening, loadScenario, orphanPronounsIn } from './harness'

/**
 * What the record says about how it is going — F03, F08, F31, F34, F44.
 *
 * Each of these is the same shape of gap in a different place: the app records
 * something faithfully and never reads it back at the scale it matters. **None
 * of them fires on any history in the shipped library**, which is stated first
 * because it is the reason every acceptance case below is built by hand: a
 * reading nothing exercises is a reading nobody has checked, and this phase has
 * needed that sentence four times.
 */

const SUBNETTING = { kind: 'learning-topic', id: entityId('learning-topic', 'subnetting') } as const
const CCNA = { kind: 'destination', id: entityId('destination', 'a career that pays') } as const
const STEP = { kind: 'goal', id: entityId('goal', 'pass the CCNA') } as const
const A_WALK = { kind: 'routine', id: entityId('routine', 'a walk') } as const

const TODAY = '2026-06-10'

interface Built {
  readonly situation: Situation
}

/**
 * A destination, a next step, and whatever happened afterwards.
 *
 * `workedAtDaysAgo` is the last day anything was recorded in the area, or
 * nothing at all — which is the case F03 is really about: a milestone set and
 * never worked at is not a strategy that stalled, it is one that never started.
 */
function anAim(options: {
  readonly setDaysAgo: number
  readonly workedAtDaysAgo?: number
  readonly reached?: boolean
}): Built {
  const kit = createKit('REV', 'Europe/London', '2025-01-01T00:00:00Z')
  const nextId = sequentialRecordIds('REVE')
  const now = kit.local(TODAY, '19:00')

  const destination = kit.entity({
    id: CCNA.id,
    kind: 'destination',
    label: 'a career that pays',
    domain: DOMAIN.career,
    privacy: 'normal',
  })
  const step = kit.entity({
    id: STEP.id,
    kind: 'goal',
    label: 'pass the CCNA',
    domain: DOMAIN.career,
    privacy: 'normal',
  })
  const topic = kit.entity({
    id: SUBNETTING.id,
    kind: 'learning-topic',
    label: 'subnetting',
    domain: DOMAIN.career,
    privacy: 'normal',
  })

  const setOn = dayBefore(options.setDaysAgo)
  const records: CanonicalRecord[] = [
    kit.record(
      'destination',
      {
        occurredAt: kit.local(setOn, '20:00'),
        domains: [DOMAIN.career],
        entities: [CCNA],
      },
      { destination: CCNA, aim: 'a career that pays', state: 'active' },
    ),
    kit.record(
      'goal',
      { occurredAt: kit.local(setOn, '20:05'), domains: [DOMAIN.career], entities: [STEP] },
      {
        goal: STEP,
        statement: 'pass the CCNA',
        status: options.reached === true ? 'achieved' : 'active',
        milestoneOf: CCNA,
      },
    ),
  ]

  if (options.workedAtDaysAgo !== undefined) {
    const session: PastEpisode = {
      verb: 'recall-practice',
      object: SUBNETTING,
      domain: DOMAIN.career,
      on: dayBefore(options.workedAtDaysAgo),
      at: '20:00',
      context: evening({ dayOfWeek: 3 }),
      ending: 'completed',
    }
    records.push(...pastEpisodeRecords(kit, [session], nextId))
  }

  return { situation: situationOf(kit, [destination, step, topic], records, now) }
}

/**
 * A run of "I could not", with a cause and however many different moves.
 *
 * The variable is **how many different things one answer stopped**: one move
 * blocked three times is already `blockerQuestionFor`'s case, and what makes it
 * a pattern rather than a repetition is that it is beating more than one.
 */
function aRunOfBlockers(options: { readonly times: number; readonly acrossMoves: number }): Built {
  const kit = createKit('REVB', 'Europe/London', '2025-01-01T00:00:00Z')
  const nextId = sequentialRecordIds('REVBE')
  const now = kit.local(TODAY, '19:00')

  const walk = kit.entity({
    id: A_WALK.id,
    kind: 'routine',
    label: 'a walk',
    domain: DOMAIN.health,
    privacy: 'normal',
  })
  const topic = kit.entity({
    id: SUBNETTING.id,
    kind: 'learning-topic',
    label: 'subnetting',
    domain: DOMAIN.career,
    privacy: 'normal',
  })

  const records: CanonicalRecord[] = []
  for (let index = 0; index < options.times; index += 1) {
    const second = options.acrossMoves > 1 && index % 2 === 1
    const seed: PastEpisode = {
      verb: second ? 'recall-practice' : 'move',
      object: second ? SUBNETTING : A_WALK,
      domain: second ? DOMAIN.career : DOMAIN.health,
      on: dayBefore(index + 1),
      at: '19:00',
      context: evening({ dayOfWeek: 3 }),
      ending: 'unable-now',
    }
    const built = pastEpisodeRecords(kit, [seed], nextId)
    /*
     * And what he said was in the way, written onto the `action-unable-now`
     * record the way `NowScreen` writes it.
     *
     * `pastEpisodeRecords` builds the episode and stops there: `blocker` is the
     * field routing 83 found *"plumbed and written by no surface"*, and it is
     * written by one now. The statement is the closed list's own sentence, which
     * is what `causeOf` matches against — a fixture inventing its own wording
     * would be a fixture the aggregation could never see.
     */
    for (const record of built) {
      if (record.kind !== 'action-unable-now') {
        records.push(record)
        continue
      }
      records.push({
        ...record,
        blocker: BLOCKER_OPTIONS['no-kit'].statement(second ? 'Recall practice' : 'A walk'),
      })
    }
  }

  return { situation: situationOf(kit, [walk, topic], records, now) }
}

function situationOf(
  kit: ReturnType<typeof createKit>,
  entities: readonly ReturnType<ReturnType<typeof createKit>['entity']>[],
  records: readonly CanonicalRecord[],
  now: ReturnType<ReturnType<typeof createKit>['local']>,
): Situation {
  const loaded = snapshotFromWire(
    kit.document({ entities: [...entities], records, exportedAt: now }),
  )
  expect(loaded.loaded, 'the history should load').toBe(true)
  if (!loaded.loaded) throw new Error('unreachable')
  const moment = { now, zone: kit.zone, weekStartsOn: 1 as const }
  return assembleSituation(buildView(loaded.snapshot, moment), moment)
}

function dayBefore(days: number): string {
  const at = Date.UTC(2026, 5, 10) - days * 86_400_000
  return new Date(at).toISOString().slice(0, 10)
}

function stallsOn(built: Built) {
  return stalledStrategies(
    built.situation.direction.destinations,
    collectEpisodes(built.situation.view, built.situation.zone),
    built.situation.dayId,
  )
}

// ---------------------------------------------------------------------------
// F03 — a strategy that can fail
// ---------------------------------------------------------------------------

describe('the app can say a strategy is not moving — F03', () => {
  it('says nothing about a step set last week', () => {
    // The control. A rule that fired on every destination would pass every
    // assertion below and mean nothing.
    expect(stallsOn(anAim({ setDaysAgo: 5 })), 'a step set five days ago read as stalled').toEqual(
      [],
    )
  })

  it('says so once a fortnight has gone with nothing recorded', () => {
    /*
     * The ordinary-owner item, in its own words: *"set a milestone, work at it
     * for two weeks, then stop; confirm the app can say the strategy is not
     * moving."*
     */
    const stalled = stallsOn(anAim({ setDaysAgo: STALLED_AFTER_DAYS + 7 }))
    expect(stalled.length, 'three weeks of silence changed nothing').toBe(1)
    expect(stalled[0]?.attempts, 'occasions were counted that never happened').toBe(0)
    expect(stalled[0]?.quietFor).toBeGreaterThanOrEqual(STALLED_AFTER_DAYS)
  })

  it('counts from the last thing that happened, not from the day it was set', () => {
    // He worked at it and then stopped, which is the case the finding describes:
    // a plausible action repeated faithfully and then abandoned.
    const worked = anAim({ setDaysAgo: 40, workedAtDaysAgo: 20 })
    const stalled = stallsOn(worked)
    expect(stalled.length).toBe(1)
    expect(stalled[0]?.quietFor, 'the silence was measured from the wrong day').toBe(20)
    expect(stalled[0]?.attempts).toBe(1)
  })

  it('goes quiet again the moment something happens', () => {
    expect(stallsOn(anAim({ setDaysAgo: 40, workedAtDaysAgo: 2 }))).toEqual([])
  })

  it('never calls a milestone he has reached a stalled one', () => {
    // He has already said what he thinks of it, whatever the dates say.
    expect(stallsOn(anAim({ setDaysAgo: 60, reached: true }))).toEqual([])
  })

  it('reports two facts and passes no verdict', () => {
    /*
     * *"Nothing has moved on this in twenty-one days"* is the record.
     * *"You are falling behind"* is a verdict on a man, and section 4.4 forbids
     * it. The card is also checked for a bare pronoun, because it is composed
     * from his own words and read on its own.
     */
    const built = anAim({ setDaysAgo: 30 })
    const card = insightsFor(built.situation).insights.find((insight) =>
      insight.id.startsWith('stalled:'),
    )
    expect(card, 'the reading never reached a screen').toBeDefined()
    expect(card?.detail).toMatch(/\d+ days since/)
    expect(card?.headline, card?.headline).not.toMatch(
      /behind|failing|should|need to|not good enough|slipping/i,
    )
    expect(card?.detail).not.toMatch(/behind|failing|should|need to|slipping/i)
    expect(orphanPronounsIn(card?.headline ?? '')).toEqual([])
    // And it proposes nothing: replacing a strategy is routing 95's.
    expect(card?.detail).not.toMatch(/try|instead|different approach|change/i)
  })
})

// ---------------------------------------------------------------------------
// F08 — the same obstacle, across different moves
// ---------------------------------------------------------------------------

describe('one obstacle defeating several moves — F08', () => {
  it('says nothing about one move blocked three times', () => {
    /*
     * The bound that makes this a **pattern** rather than a repetition. One move
     * blocked over and over is `blockerQuestionFor`'s case and it already asks
     * about it; saying it again here would be the app making the same
     * observation twice.
     */
    expect(recurringBlockers(aRunOfBlockers({ times: 4, acrossMoves: 1 }).situation)).toEqual([])
  })

  it('says nothing until the same answer has come up enough times', () => {
    expect(
      recurringBlockers(
        aRunOfBlockers({ times: A_PATTERN_OF_BLOCKERS - 1, acrossMoves: 2 }).situation,
      ),
    ).toEqual([])
  })

  it('names it once the same answer has stopped two different things', () => {
    const found = recurringBlockers(
      aRunOfBlockers({ times: A_PATTERN_OF_BLOCKERS + 1, acrossMoves: 2 }).situation,
    )
    expect(found.length, 'the same obstacle across two moves went unnoticed').toBe(1)
    expect(found[0]?.moves).toBe(2)
    expect(found[0]?.times).toBeGreaterThanOrEqual(A_PATTERN_OF_BLOCKERS)
  })

  it('says what happened and nothing about him', () => {
    /*
     * F08's own bound: *"aggregate blocker patterns without treating inability
     * as character"*, and D-045 keeps inability separate from decline and from
     * effect. Three times not having the kit is a fact about his equipment.
     */
    const built = aRunOfBlockers({ times: 4, acrossMoves: 2 })
    const card = insightsFor(built.situation).insights.find((insight) =>
      insight.id.startsWith('recurring-blocker:'),
    )
    expect(card, 'the reading never reached a screen').toBeDefined()
    expect(card?.headline).toMatch(/\d+ different moves/)
    expect(card?.detail).toContain('never read as unwillingness')
    expect(card?.headline).not.toMatch(
      /you always|you never|you keep|lazy|excuse|unwilling|commitment/i,
    )
    // And it proposes no changed setup: that is a strategy revision, routing 95's.
    expect(card?.detail).not.toMatch(/try|instead|smaller|different window|change the/i)
  })
})

// ---------------------------------------------------------------------------
// F31 — what the app is still holding him to
// ---------------------------------------------------------------------------

describe('the constraints still in force are readable — F31', () => {
  it('lists them once they exist, and says how to take one back', () => {
    /*
     * C21's own safety net, and the reason F31 matters more after this phase
     * than before it: until enforcement landed a standing constraint was shown
     * and never acted on, so a stale one cost nothing. It costs a move now.
     */
    const kit = createKit('REVC', 'Europe/London', '2025-01-01T00:00:00Z')
    const now = kit.local(TODAY, '19:00')
    const walk = kit.entity({
      id: A_WALK.id,
      kind: 'routine',
      label: 'a walk',
      domain: DOMAIN.health,
      privacy: 'normal',
    })
    const records: CanonicalRecord[] = [
      kit.record(
        'constraint',
        {
          occurredAt: kit.local(dayBefore(3), '20:00'),
          domains: [DOMAIN.health],
          entities: [A_WALK],
        },
        {
          concept: 'blocker.no-kit.routine:a-walk' as never,
          description: 'A walk needs something I have not got.',
        },
      ),
    ]
    const situation = situationOf(kit, [walk], records, now)
    const card = insightsFor(situation).insights.find(
      (insight) => insight.id === 'standing-constraints',
    )

    expect(card, 'nothing tells him what the app is still holding him to').toBeDefined()
    expect(card?.headline).toContain('still stopping')
    expect(card?.detail).toContain('A walk needs something I have not got.')
    expect(card?.detail).toContain('taken back')
  })

  it('says nothing where he has told the app nothing', () => {
    for (const scenario of SCENARIOS) {
      const situation = loadScenario(scenario.id).decision({ probe: false }).situation
      if (situation.constraints.some((entry) => String(entry.concept).startsWith('blocker.'))) {
        continue
      }
      expect(
        insightsFor(situation).insights.find((insight) => insight.id === 'standing-constraints'),
        scenario.id,
      ).toBeUndefined()
    }
  })
})

// ---------------------------------------------------------------------------
// F44 — the measurable half, and where it is not
// ---------------------------------------------------------------------------

describe('what the app cost him is counted and never scored — F44', () => {
  it('counts three separate things', () => {
    const built = anAim({ setDaysAgo: 20, workedAtDaysAgo: 3 })
    const burden = burdenOver(built.situation)
    expect(burden.acted, 'a completed move counted as nothing').toBeGreaterThan(0)
    expect(burden.overDays).toBeGreaterThan(0)
  })

  it('divides nothing by anything', () => {
    /*
     * §6.5 scopes F44 to the measurable half only, and F44's own warning is the
     * reason: a ratio of taps to actions is an engagement metric with a humane
     * name, and one number for all three is the Life Score it refuses outright.
     */
    const said = describeBurden(burdenOver(anAim({ setDaysAgo: 20, workedAtDaysAgo: 3 }).situation))
    expect(said).toMatch(/questions answered/)
    expect(said).toMatch(/things corrected/)
    expect(said).toMatch(/moves acted on/)
    expect(said, 'a rate appeared').not.toMatch(/%|per |ratio|score|out of/i)
  })

  it('is not a card, and appears on no screen the owner reads daily', () => {
    /*
     * D-279. A first draft put the three counts on Insights and it fired on nine
     * histories at every hour — forty-seven more times the app opens its mouth
     * for a reading that does not change from one day to the next. An app that
     * reports on its own use every morning is the system optimising compliance
     * with itself, which is the whole of what F44 warns against.
     */
    for (const scenario of SCENARIOS) {
      const situation = loadScenario(scenario.id).decision({ probe: false }).situation
      expect(
        insightsFor(situation).insights.some((insight) => insight.id === 'burden'),
        `${scenario.id}: the burden count became a daily card`,
      ).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// And the sentence this phase owes about all of them
// ---------------------------------------------------------------------------

describe('none of these fires on a shipped history — and that is said out loud', () => {
  it('is silent across the whole library', () => {
    /*
     * Stated rather than left to be discovered. Every history the library ships
     * either has no destination with a next step, no run of blockers across two
     * moves, or nothing the app is holding him to — so all four acceptance cases
     * above are built by hand, and this is the assertion that goes red the day
     * one of them starts firing on a fixture nobody meant it to.
     */
    for (const scenario of SCENARIOS) {
      const situation = loadScenario(scenario.id).decision({ probe: false }).situation
      const cards = insightsFor(situation).insights.filter(
        (insight) =>
          insight.id.startsWith('stalled:') ||
          insight.id.startsWith('recurring-blocker:') ||
          insight.id === 'standing-constraints',
      )
      expect(
        cards.map((card) => card.id),
        scenario.id,
      ).toEqual([])
    }
  })
})
