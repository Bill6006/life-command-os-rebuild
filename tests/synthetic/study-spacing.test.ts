import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { entityId, sequentialRecordIds } from '../../src/domain/ids'
import type { CanonicalRecord } from '../../src/domain/records'
import { localDayId, parseLocalDayId, type LocalDayId } from '../../src/domain/time'
import { decide, type Decision } from '../../src/intelligence/engine'
import {
  DEFAULT_INTERVAL_DAYS,
  describeLastSession,
  intervalFor,
  LONGEST_INTERVAL_DAYS,
  SHORTEST_INTERVAL_DAYS,
  SPACING_SHARE,
} from '../../src/intelligence/spacing'
import { buildView } from '../../src/memory/view'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { startThreadRecord } from '../../src/intelligence/threads'
import { createKit, pastEpisodeRecords, type PastEpisode } from '../../src/synthetic/kit'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { evening, loadScenario } from './harness'

/**
 * AUD-0010 — career study had no schedule.
 *
 * `careerCandidates` proposed recall practice whenever a current topic existed.
 * **Nothing read when the topic was last practised and nothing read when the
 * exam was**, so the audit's reproduction is the identical sentence on a
 * Tuesday, a Saturday and a Sunday. Spacing is called *"the best-evidenced
 * lever in the whole app"* and it was unused while everything needed for it —
 * a stated goal with a horizon the owner set — was already in the record.
 *
 * Three things are asserted, and the third is the one that keeps the other two
 * honest:
 *
 * 1. the interval comes from **his** goal, or from a default that says so;
 * 2. going over a topic he did yesterday is marked down, and going over one he
 *    did a fortnight ago is not;
 * 3. it never argues with a course he agreed to.
 */

// ---------------------------------------------------------------------------
// The interval, and where it comes from
// ---------------------------------------------------------------------------

const DAY = 86_400_000

function horizonOf(daysRemaining: number, passed = false) {
  const dueDay = parseLocalDayId('2026-06-01') as LocalDayId
  return {
    window: { kind: 'due' as const, earliest: 0 as never, latest: 0 as never },
    dueDay,
    daysRemaining,
    passed,
  }
}

describe('the gap comes from the goal he set — AUD-0010', () => {
  it('takes a share of the days he actually has left', () => {
    // Eight weeks out: a share of fifty-six days. The share is the design choice
    // and the fifty-six is his.
    expect(intervalFor(horizonOf(56)).days).toBe(Math.round(56 * SPACING_SHARE))
    expect(intervalFor(horizonOf(56)).fromGoal).toBe(true)
  })

  it('falls back to a stated default when he has not said when', () => {
    /*
     * G-009's shape on an interval. No horizon is not a horizon of zero and not
     * one of a year: it is a conservative gap, and `fromGoal` carries the fact
     * so nothing downstream can present it as arithmetic over a deadline he set.
     */
    const fallback = intervalFor(undefined)
    expect(fallback.days).toBe(DEFAULT_INTERVAL_DAYS)
    expect(fallback.fromGoal).toBe(false)
  })

  it('never closes to nothing and never opens past a fortnight', () => {
    expect(intervalFor(horizonOf(1)).days).toBe(SHORTEST_INTERVAL_DAYS)
    expect(intervalFor(horizonOf(0)).days).toBe(SHORTEST_INTERVAL_DAYS)
    expect(intervalFor(horizonOf(3650)).days).toBe(LONGEST_INTERVAL_DAYS)
  })

  it('shortens rather than stretches once the date has gone by', () => {
    // A deadline that has passed is not a longer runway. Stretching the gap on
    // it would be the arithmetic deciding something the situation plainly does
    // not.
    expect(intervalFor(horizonOf(-20, true)).days).toBe(SHORTEST_INTERVAL_DAYS)
  })
})

// ---------------------------------------------------------------------------
// A history built to be inside its own gap
// ---------------------------------------------------------------------------

const SUBNETTING = { kind: 'learning-topic', id: entityId('learning-topic', 'subnetting') } as const
const CCNA = { kind: 'goal', id: entityId('goal', 'the CCNA') } as const

const NOW_DAY = '2026-04-15'

/**
 * A week studying, with the last session however many days ago.
 *
 * One variable: when he last went over the topic. Everything else — the goal,
 * its date, the nights, the energy, the minutes — is identical, so a difference
 * in what the app offers is a difference the gap made.
 */
function aStudyWeek(options: {
  readonly lastSessionDaysAgo: number | undefined
  readonly wentWell?: 'real' | 'little'
  /** A study schedule he started, covering this topic. */
  readonly withCourse?: boolean
}): Decision {
  const kit = createKit('SPC', 'Europe/London', '2026-01-01T00:00:00Z')
  const nextId = sequentialRecordIds('SPCE')

  const topic = kit.entity({
    id: SUBNETTING.id,
    kind: 'learning-topic',
    label: 'subnetting',
    domain: DOMAIN.career,
    privacy: 'normal',
  })
  const goal = kit.entity({
    id: CCNA.id,
    kind: 'goal',
    label: 'the CCNA',
    domain: DOMAIN.career,
    privacy: 'normal',
  })

  const now = kit.local(NOW_DAY, '19:30')
  const records: CanonicalRecord[] = [
    kit.record(
      'goal',
      { occurredAt: kit.local('2026-02-01', '20:00'), domains: [DOMAIN.career], entities: [CCNA] },
      {
        goal: CCNA,
        statement: 'Pass the CCNA before the winter',
        status: 'active',
        // Eight weeks out, which is the audit's own example.
        targetWindow: {
          kind: 'due',
          earliest: kit.local('2026-06-10', '00:00'),
          latest: kit.local('2026-06-10', '23:59'),
        },
      },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local(NOW_DAY, '08:00'), domains: [DOMAIN.career] },
      {
        concept: CONCEPT.learningTopic,
        value: { type: 'entity', value: SUBNETTING },
        method: 'self-report',
      },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local(NOW_DAY, '07:00'), domains: [DOMAIN.sleep] },
      {
        concept: CONCEPT.sleepHours,
        value: { type: 'number', value: 8, unit: 'hours' },
        method: 'self-report',
      },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local(NOW_DAY, '19:00'), domains: [DOMAIN.health] },
      { concept: CONCEPT.energy, value: { type: 'scale', value: 4, of: 5 }, method: 'self-report' },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local(NOW_DAY, '19:00'), domains: [DOMAIN.health] },
      {
        concept: CONCEPT.soreness,
        value: { type: 'scale', value: 0, of: 5 },
        method: 'self-report',
      },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local(NOW_DAY, '19:00'), domains: [DOMAIN.direction] },
      { concept: CONCEPT.freeNow, value: { type: 'duration', minutes: 60 }, method: 'self-report' },
    ),
  ]

  if (options.lastSessionDaysAgo !== undefined) {
    const on = localDayId(civilOf(now - options.lastSessionDaysAgo * DAY))
    const session: PastEpisode = {
      verb: 'recall-practice',
      object: SUBNETTING,
      domain: DOMAIN.career,
      on: String(on),
      at: '20:00',
      context: evening({ dayOfWeek: 3 }),
      ending: 'completed',
      effect: options.wentWell ?? 'real',
    }
    records.push(...pastEpisodeRecords(kit, [session], nextId))
  }

  if (options.withCourse === true) {
    // Written the way `startThreadRecord` writes one, from the shape's own
    // numbers, so the course in the record is a course an owner could start.
    records.push(
      startThreadRecord(
        {
          kind: 'study-schedule',
          subject: SUBNETTING,
          subjectLabel: 'subnetting',
          domain: DOMAIN.career,
        },
        { now: kit.local('2026-04-10', '20:00'), zone: kit.zone },
      ),
    )
  }

  const loaded = snapshotFromWire(
    kit.document({ entities: [topic, goal], records, exportedAt: now }),
  )
  expect(loaded.loaded, 'the study week should load').toBe(true)
  if (!loaded.loaded) throw new Error('unreachable')

  const moment = { now, zone: kit.zone, weekStartsOn: 1 as const }
  return decide(buildView(loaded.snapshot, moment), moment, { probe: false })
}

/** A civil date from an epoch, for building a day id a few days back. */
function civilOf(at: number) {
  const date = new Date(at)
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

function spacingDimension(decision: Decision) {
  return decision.trace.ranking
    .find((row) => row.id.includes('recall-practice'))
    ?.dimensions.find((dimension) => dimension.name === 'spacing-fit')
}

describe('going over it again, when it would work — AUD-0010', () => {
  it('reads the interval off the goal rather than off a default', () => {
    const decision = aStudyWeek({ lastSessionDaysAgo: 2 })
    const spacing = decision.situation.studySpacing
    expect(spacing, 'no spacing was read on a history with a current topic').toBeDefined()
    expect(spacing?.fromGoal, 'the gap ignored the date he set').toBe(true)
    expect(spacing?.daysSince).toBe(2)
    expect(spacing?.due, 'a session yesterday counted as due').toBe(false)
  })

  it('marks the move down while it is too soon, and names both numbers', () => {
    const dimension = spacingDimension(aStudyWeek({ lastSessionDaysAgo: 2 }))
    expect(dimension?.weight, 'spacing said nothing the day after a session').toBeGreaterThan(0)
    expect(dimension?.value).toBeLessThan(0)
    expect(dimension?.note).toContain('days since the last one')
    expect(dimension?.note).toContain('goal')
  })

  it('marks it down less the further into the gap he gets', () => {
    // The size of the objection is how much of the gap is left, which is the
    // difference between a spacing model and a flat penalty (AUD-0010's own
    // complaint about `recent-duplication`).
    const yesterday = spacingDimension(aStudyWeek({ lastSessionDaysAgo: 2 }))?.value ?? 0
    const nearlyThere = spacingDimension(aStudyWeek({ lastSessionDaysAgo: 10 }))?.value ?? 0
    expect(nearlyThere).toBeGreaterThan(yesterday)
    expect(nearlyThere).toBeLessThan(0)
  })

  it('says nothing at all once the gap has passed', () => {
    /*
     * Penalty-only, and this is the arm that makes it so. *"It has been long
     * enough"* is not a reason to do something, and a dimension that scored
     * positively here would be spacing **promoting** a move rather than holding
     * one back.
     */
    const decision = aStudyWeek({ lastSessionDaysAgo: 16 })
    expect(decision.situation.studySpacing?.due).toBe(true)
    const dimension = spacingDimension(decision)
    expect(dimension?.weight, 'a passed gap still argued').toBe(0)
    expect(dimension?.value).toBe(0)
  })

  it('says nothing about a topic the record has never held a session on', () => {
    const decision = aStudyWeek({ lastSessionDaysAgo: undefined })
    expect(decision.situation.studySpacing?.daysSince).toBeUndefined()
    expect(decision.situation.studySpacing?.due, 'a fresh topic was held back').toBe(true)
    expect(spacingDimension(decision)?.weight).toBe(0)
  })

  it('widens the gap after a session that went well, and not after one that did not', () => {
    /*
     * The expanding half of the spacing evidence, and it reads his own answers
     * rather than a timetable. A session he got something out of is one the next
     * gap may be longer after; one that did almost nothing is not.
     */
    const wentWell = aStudyWeek({ lastSessionDaysAgo: 2, wentWell: 'real' })
    const wentBadly = aStudyWeek({ lastSessionDaysAgo: 2, wentWell: 'little' })
    expect(wentWell.situation.studySpacing?.intervalDays).toBeGreaterThan(
      wentBadly.situation.studySpacing?.intervalDays ?? 0,
    )
  })

  it('changes what it offers, not only what it scores', () => {
    /*
     * The consequence, on the screen. The same evening twice: once the day after
     * a session and once a fortnight after one. Recall is the move on the second
     * and is beaten on the first — which is the audit's own complaint answered,
     * *"offered whenever conditions allow rather than when it would work"*.
     */
    const tooSoon = aStudyWeek({ lastSessionDaysAgo: 2 })
    const overdue = aStudyWeek({ lastSessionDaysAgo: 16 })

    expect(overdue.evaluation?.candidate.semantics.target.verb).toBe('recall-practice')
    expect(
      tooSoon.evaluation?.candidate.semantics.target.verb,
      'recall won the evening after a recall session',
    ).not.toBe('recall-practice')
  })
})

// ---------------------------------------------------------------------------
// And it never argues with a course he agreed to
// ---------------------------------------------------------------------------

describe('the app’s timing never out-argues the owner’s own plan — D-273', () => {
  it('abstains on a move a live course counts toward', () => {
    /*
     * The same week, twice: once with a study schedule he started and once
     * without. Both are two days after a session, so both are well inside the
     * gap — and the app's opinion about which day is best does not get to argue
     * with a course he agreed to.
     *
     * It is the mirror of AUD-0020's own mitigation: a plan may not out-argue
     * what is in the way tonight, and the app's preference about timing may not
     * out-argue a plan. Both are *what the owner said outranks what the app
     * worked out*, from the two directions.
     */
    const alone = aStudyWeek({ lastSessionDaysAgo: 2 })
    const onACourse = aStudyWeek({ lastSessionDaysAgo: 2, withCourse: true })

    expect(alone.situation.studySpacing?.due, 'the week is no longer inside its gap').toBe(false)
    expect(onACourse.situation.studySpacing?.due, 'the two weeks disagree about the gap').toBe(
      false,
    )
    expect(
      onACourse.situation.threads.some((thread) => thread.live),
      'no live course',
    ).toBe(true)

    expect(spacingDimension(alone)?.weight, 'spacing said nothing off a course').toBeGreaterThan(0)
    expect(spacingDimension(onACourse)?.weight, 'spacing argued with a course').toBe(0)
  })

  it('lets the course advance on a day spacing would otherwise hold back', () => {
    /*
     * The consequence, which is the whole reason the exemption is a rule rather
     * than a weight: a course that stalled on its own second session would be
     * the app enforcing a gap against a commitment the owner made with a tap.
     */
    const onACourse = aStudyWeek({ lastSessionDaysAgo: 2, withCourse: true })
    expect(onACourse.evaluation?.candidate.semantics.target.verb).toBe('recall-practice')
    expect(onACourse.explanation?.partOf, 'the course is a hidden reason').toContain('subnetting')
  })

  it('leaves the shipped library exactly where it was', () => {
    /*
     * The blast radius, stated rather than hoped. No history in the library
     * reaches this dimension: every one with a current topic either has no
     * completed session on it, or has a live course covering the move.
     *
     * So the acceptance case is the purpose-built week above — which is said out
     * loud here, because a dimension nothing exercises is a dimension nobody has
     * checked, and this is the second one in this phase to be in that position.
     */
    for (const scenario of SCENARIOS) {
      const decision = loadScenario(scenario.id).decision({ probe: false })
      for (const row of decision.trace.ranking) {
        for (const dimension of row.dimensions) {
          if (dimension.name !== 'spacing-fit') continue
          expect(dimension.weight, `${scenario.id} / ${row.id}`).toBe(0)
          expect(dimension.value, `${scenario.id} / ${row.id}`).toBe(0)
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------
// What it is allowed to say
// ---------------------------------------------------------------------------

describe('it states the record and never an instruction — AUD-0010', () => {
  it('names when he last went over it, in ordinary words', () => {
    const spacing = aStudyWeek({ lastSessionDaysAgo: 2 }).situation.studySpacing
    expect(describeLastSession(spacing!, 'subnetting')).toBe('You went over subnetting 2 days ago.')

    const yesterday = aStudyWeek({ lastSessionDaysAgo: 1 }).situation.studySpacing
    expect(describeLastSession(yesterday!, 'subnetting')).toBe(
      'You went over subnetting yesterday.',
    )

    const older = aStudyWeek({ lastSessionDaysAgo: 4 }).situation.studySpacing
    expect(describeLastSession(older!, 'subnetting')).toBe('You went over subnetting 4 days ago.')
  })

  it('says nothing where there is nothing to name', () => {
    const never = aStudyWeek({ lastSessionDaysAgo: undefined }).situation.studySpacing
    expect(describeLastSession(never!, 'subnetting')).toBeUndefined()
  })

  it('never tells him what to do with his own week', () => {
    /*
     * *"Leave it a few days"* is the app instructing a man about his own life,
     * and its opinion is already expressed by which move it put on the screen.
     * Section 4.6, and D-187's discipline of saying what is recorded rather than
     * what follows from it.
     */
    for (const days of [0, 1, 3, 9, 16]) {
      const spacing = aStudyWeek({ lastSessionDaysAgo: days }).situation.studySpacing
      const said = describeLastSession(spacing!, 'subnetting') ?? ''
      expect(said, `${days} days`).not.toMatch(/leave it|wait|should|come back|try again/i)
    }
  })
})
