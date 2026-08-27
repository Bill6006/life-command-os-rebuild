import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DOMAIN } from '../../src/domain/domains'
import { entityRef } from '../../src/domain/entities'
import type { GoalRecord } from '../../src/domain/records'
import { localDayId, timeZone, type Instant, type LocalDayId } from '../../src/domain/time'
import { dueWindow } from '../../src/domain/windows'
import {
  describeGoalTrajectory,
  goalIsBehind,
  type ActiveGoal,
} from '../../src/intelligence/direction'
import { insightsFor } from '../../src/intelligence/insights'
import { assembleSituation } from '../../src/intelligence/situation'
import { backupFromJson, backupToJson } from '../../src/memory/backup'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import {
  weekPointedAt,
  WEEK_POINTED_AT_NOW,
  WEEK_POINTED_AT_ZONE,
  SCENARIOS,
  type WeekDirectionOptions,
} from '../../src/synthetic/scenarios'
import { decideOn } from './harness'

/**
 * AUD-0046 and AUD-0021 — the goal horizon, read at last, and the parts.
 *
 * `GoalRecord.targetWindow` has existed since Phase 1. It parses, it
 * serialises, `direction.ts` declares it on `ActiveGoal` and assigns it, and a
 * repository-wide sweep found no other reference: nothing read it and no
 * surface could write it. Meanwhile the career generator raised the
 * `goal-behind` trigger whenever a career goal merely existed, and
 * `evaluate.ts` pays that trigger `urgency 0.4` — so every career
 * recommendation carried an urgency premium justified by a claim nothing
 * checked.
 *
 * The instrument below is G-008's: one evening, held completely still, with one
 * thing changed at a time. Four combinations of horizon and parts over the same
 * history, so each claim is a difference rather than an observation.
 */

const ZONE = WEEK_POINTED_AT_ZONE
const SUBNETTING = entityRef('learning-topic', 'subnetting')
const CCNA = entityRef('goal', 'the CCNA')

function decideWith(options: WeekDirectionOptions) {
  return decideOn(weekPointedAt(options), WEEK_POINTED_AT_NOW, ZONE)
}

function situationWith(options: WeekDirectionOptions) {
  const loaded = snapshotFromWire(weekPointedAt(options))
  expect(loaded.loaded).toBe(true)
  return assembleSituation(buildView(loaded.snapshot, { now: WEEK_POINTED_AT_NOW, zone: ZONE }), {
    now: WEEK_POINTED_AT_NOW,
    zone: ZONE,
    weekStartsOn: 1,
  })
}

/** The `goal-fit` dimension on the recall move about the topic he is on. */
function goalFitOf(options: WeekDirectionOptions): { value: number; note: string } {
  const decision = decideWith(options)
  const row = decision.trace.ranking.find(
    (entry) => entry.id === 'career/recall-practice/' + SUBNETTING.id,
  )
  expect(row, `no recall move in the ranking for ${JSON.stringify(options)}`).toBeDefined()
  const dimension = row?.dimensions.find((entry) => entry.name === 'goal-fit')
  expect(dimension, 'no goal-fit dimension').toBeDefined()
  return { value: dimension?.value ?? Number.NaN, note: dimension?.note ?? '' }
}

/** Which trigger the career generator raised, as the proposal row records it. */
function triggersRaised(options: WeekDirectionOptions): readonly string[] {
  const decision = decideWith(options)
  return decision.trace.ranking.map(
    (row) => row.dimensions.find((entry) => entry.name === 'urgency')?.note ?? '',
  )
}

// ---------------------------------------------------------------------------
// AUD-0046 — the horizon is read
// ---------------------------------------------------------------------------

describe('AUD-0046 — a goal with a horizon is not the same goal without one', () => {
  it('leaves a goal with no date exactly where it was', () => {
    /*
     * The acceptance condition the finding states in as many words: "where it
     * is absent, behave precisely as today — an absent horizon must stay
     * unknown, never a default." 0.6 is the figure the same-area branch has
     * produced since Phase 2.
     */
    const fit = goalFitOf({ goalHorizon: 'none', goalParts: 'none' })
    expect(fit.value).toBe(1)
    expect(fit.note).toBe('serves pass the ccna before the winter')
  })

  it('pulls harder once the date the owner set is close', () => {
    const far = goalFitOf({ goalHorizon: 'winter', goalParts: 'none' })
    const near = goalFitOf({ goalHorizon: 'soon', goalParts: 'none' })

    // A date two and a half months out is not asking for this evening; a date
    // a week out is. Both differ from the goal with no date at all, which is
    // the state the app was in before this field was read.
    const dateless = goalFitOf({ goalHorizon: 'none', goalParts: 'none' })
    expect(far.value).toBeLessThan(dateless.value)
    expect(near.value).toBeGreaterThan(far.value)
    expect(far.note).toContain('still a way off')
    expect(near.note).toContain('the date is close')
  })

  it('reaches the situation as a reading rather than as a stored field', () => {
    const situation = situationWith({ goalHorizon: 'soon', goalParts: 'named' })
    const goal = situation.direction.goals.find((entry) => entry.goal.id === CCNA.id)
    expect(goal?.targetWindow, 'the field was already carried before this phase').toBeDefined()
    // The reading is the new part: a number of days, worked out against the
    // owner-local day the decision is being made in.
    expect(goal?.horizon?.daysRemaining).toBe(7)
    expect(goal?.horizon?.passed).toBe(false)
  })
})

describe('AUD-0046 — `goal-behind` needs something that measures behind', () => {
  /*
   * The whole point of the finding, and the reason it was raised from P2 to P1:
   * this is not an unused field, it is an urgency premium being paid for a
   * claim nothing checked.
   *
   * Enumerated over the three states that used to raise it and no longer may,
   * rather than over the one the fixture happens to produce — D-108's first
   * check, written out.
   */
  const cannotMeasure: readonly {
    readonly what: string
    readonly options: WeekDirectionOptions
  }[] = [
    {
      what: 'a goal with neither a date nor parts',
      options: { goalHorizon: 'none', goalParts: 'none' },
    },
    {
      what: 'a goal with a date and no parts',
      options: { goalHorizon: 'soon', goalParts: 'none' },
    },
    { what: 'a goal with parts and no date', options: { goalHorizon: 'none', goalParts: 'named' } },
  ]

  for (const { what, options } of cannotMeasure) {
    it(`says nothing about being behind on ${what}`, () => {
      for (const note of triggersRaised(options)) {
        expect(note, `${what} raised behind-ness`).not.toContain('goal behind')
      }
    })
  }

  it('does raise it when the date and the pieces actually say so', () => {
    // And the positive half, so the three assertions above are not passing
    // because the trigger became unreachable.
    const notes = triggersRaised({ goalHorizon: 'soon', goalParts: 'named' })
    expect(notes.some((note) => note.includes('goal behind'))).toBe(true)
  })

  it('is the money generator’s rule too, not only the career one', () => {
    /*
     * `candidates.ts:533` raised `goal-behind` for money whenever the cash
     * buffer was **known** — a fact about what the app has been told rather
     * than about any goal. One rule, two callers.
     */
    const source = join(import.meta.dirname, '..', '..', 'src', 'intelligence', 'candidates.ts')
    const code = readFileSync(source, 'utf8')
    const raises = [...code.matchAll(/trigger:[^,]*'goal-behind'/g)]
    expect(raises.length, 'a generator raises goal-behind from something else').toBeGreaterThan(0)
    for (const match of raises) {
      expect(match[0], 'goal-behind raised without the measurement').toMatch(/behind/)
    }
  })
})

describe('AUD-0046 — the trajectory measurement itself', () => {
  const day = (value: string): LocalDayId => {
    const parsed = localDayId({
      year: Number(value.slice(0, 4)),
      month: Number(value.slice(5, 7)),
      day: Number(value.slice(8, 10)),
    })
    return parsed
  }

  function goalWith(
    setOn: string,
    dueOn: string,
    daysRemaining: number,
    covered: number,
    total: number,
  ): ActiveGoal {
    return {
      goal: CCNA,
      statement: 'Pass the CCNA before the winter',
      domain: DOMAIN.career,
      source: 'R0000000000000000000000000' as GoalRecord['id'],
      status: 'active',
      milestoneOf: undefined,
      targetWindow: dueWindow(0 as Instant, 0 as Instant),
      setDay: day(setOn),
      horizon: {
        window: dueWindow(0 as Instant, 0 as Instant),
        dueDay: day(dueOn),
        daysRemaining,
        passed: daysRemaining < 0,
      },
      parts: Array.from({ length: total }, (_, index) => ({
        ref: entityRef('learning-topic', `piece ${index}`),
        covered: index < covered,
      })),
    }
  }

  it('calls a goal behind when less of the work has moved than of the time', () => {
    // Halfway through a hundred days, none of four pieces touched.
    expect(goalIsBehind(goalWith('2026-01-01', '2026-04-11', 50, 0, 4))).toBe(true)
  })

  it('does not call it behind when the work has kept up with the time', () => {
    // Halfway through, three of four done — ahead of the line rather than behind it.
    expect(goalIsBehind(goalWith('2026-01-01', '2026-04-11', 50, 3, 4))).toBe(false)
  })

  it('says nothing on the first day, when no time has gone at all', () => {
    expect(goalIsBehind(goalWith('2026-01-01', '2026-04-11', 100, 0, 4))).toBe(false)
  })

  it('never calls a finished goal behind, however late the date', () => {
    expect(goalIsBehind(goalWith('2026-01-01', '2026-04-11', -30, 4, 4))).toBe(false)
  })

  it('does call it behind once the date has gone and pieces remain', () => {
    expect(goalIsBehind(goalWith('2026-01-01', '2026-04-11', -30, 1, 4))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// AUD-0021 — the parts
// ---------------------------------------------------------------------------

describe('AUD-0021 — a goal with parts reaches the daily move', () => {
  it('leaves a goal with no parts exactly where it was', () => {
    // The finding's own acceptance condition: "a goal with no parts behaves
    // exactly as today." 1.0 is what the named-goal branch has scored since
    // Phase 2, and 0.6 what the same-area branch has.
    const fit = goalFitOf({ goalHorizon: 'none', goalParts: 'none' })
    expect(fit.value).toBe(1)
    expect(fit.note).toBe('serves pass the ccna before the winter')
  })

  it('scores a piece that has had no session above one that already has', () => {
    const untouched = goalFitOf({ goalHorizon: 'none', goalParts: 'named' })
    const satWith = goalFitOf({ goalHorizon: 'none', goalParts: 'one-done' })

    // The same evening, the same goal, the same move. The only difference is
    // that the record now holds a finished session about this piece — which is
    // the thing the app could not read at all before this phase.
    expect(untouched.value).toBeGreaterThan(satWith.value)
    expect(untouched.note).toContain('no session yet')
    expect(satWith.note).toContain('already had a session')
  })

  it('says which pieces have moved, in counts and never in a share', () => {
    const untouched = situationWith({ goalHorizon: 'winter', goalParts: 'named' })
    const satWith = situationWith({ goalHorizon: 'winter', goalParts: 'one-done' })

    const said = (situation: ReturnType<typeof situationWith>): string =>
      describeGoalTrajectory(
        situation.direction.goals.find((entry) => entry.goal.id === CCNA.id)!,
      ) ?? ''

    expect(said(untouched)).toContain('None of the 3 pieces has had a session yet.')
    expect(said(satWith)).toContain('1 of 3 pieces have had a session.')
  })

  it('produces a trajectory card, and produces none without the pieces', () => {
    const withParts = insightsFor(situationWith({ goalHorizon: 'winter', goalParts: 'named' }))
    const without = insightsFor(situationWith({ goalHorizon: 'none', goalParts: 'none' }))

    const card = withParts.insights.find((insight) => insight.id.startsWith('goal:'))
    expect(card, 'no trajectory card for a goal with a date and pieces').toBeDefined()
    expect(card?.headline).toBe('Pass the CCNA before the winter')
    expect(card?.detail).toContain('3 pieces')
    expect(card?.evidence.included).toHaveLength(3)

    expect(without.insights.some((insight) => insight.id.startsWith('goal:'))).toBe(false)
  })
})

describe('AUD-0021 — no percentage about the owner reaches any surface', () => {
  /*
   * The finding names the risk itself: a "4 of 9" reading is one short step
   * from a completion percentage, which is a score by another name and is what
   * section 22 forbids. So the sweep is over what the app can *say* about a
   * goal, everywhere it can say it, rather than over the one sentence this
   * fixture happens to produce.
   *
   * `counted` and `rates` are asserted directly rather than through a string,
   * because the evidence panel renders a rate as a percentage — a card that
   * carried one would print "0%" under a man's certification without any
   * sentence here containing a `%`.
   */
  const FORBIDDEN = [
    /%/,
    /\bpercent/i,
    /\bscore\b/i,
    /\bon track\b/i,
    /\bbehind schedule\b/i,
    /*
     * And DEF-0012's rule, because this is where the `goal-behind` sentence is
     * read. `no-hidden-genericity.test.ts` sweeps the scenario library and no
     * history in it puts a behind goal in front of the owner, so that sweep
     * names this trigger as one it does not reach — and points here. An absence
     * may not be asserted from ignorance on this sentence either.
     */
    /nothing (?:else|more) is pressing/i,
    /nothing more pressing/i,
  ]

  it('says counts and a date and nothing that grades him', () => {
    const offenders: string[] = []

    for (const options of [
      { goalHorizon: 'winter', goalParts: 'named' },
      { goalHorizon: 'soon', goalParts: 'named' },
      { goalHorizon: 'none', goalParts: 'named' },
      { goalHorizon: 'soon', goalParts: 'none' },
    ] as const satisfies readonly WeekDirectionOptions[]) {
      const situation = situationWith(options)
      const decision = decideWith(options)

      const lines: string[] = []
      for (const goal of situation.direction.goals) {
        const said = describeGoalTrajectory(goal)
        if (said !== undefined) lines.push(said)
      }
      for (const insight of insightsFor(situation).insights) {
        if (!insight.id.startsWith('goal:')) continue
        lines.push(insight.headline, insight.detail)
        lines.push(...insight.evidence.included.map((line) => line.text))
        expect(insight.evidence.rates, 'a goal card carried a rate').toEqual([])
        expect(insight.evidence.counted, 'a goal card carried a tally').toBeUndefined()
      }
      lines.push(
        decision.explanation?.rendered.reason ?? '',
        decision.explanation?.rendered.sentence ?? '',
      )

      for (const line of lines) {
        for (const pattern of FORBIDDEN) {
          if (pattern.test(line)) offenders.push(`${JSON.stringify(options)}: “${line}”`)
        }
      }
    }

    expect(offenders, 'a statement about a goal that reads as a mark').toEqual([])
  })

  it('sweeps the whole library too, so this is not one fixture’s good manners', () => {
    const offenders: string[] = []
    for (const entry of SCENARIOS) {
      const loaded = snapshotFromWire(entry.build())
      const moment = { now: entry.now, zone: entry.zone, weekStartsOn: entry.weekStartsOn ?? 1 }
      const situation = assembleSituation(buildView(loaded.snapshot, moment), moment)
      for (const goal of situation.direction.goals) {
        const said = describeGoalTrajectory(goal)
        if (said === undefined) continue
        for (const pattern of FORBIDDEN) {
          if (pattern.test(said)) offenders.push(`${entry.id}: “${said}”`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// The wire path AUD-0046 says nothing currently exercises
// ---------------------------------------------------------------------------

describe('a horizon and its pieces survive a backup and a restore', () => {
  it('comes back as the same date and the same three pieces', () => {
    const before = snapshotFromWire(weekPointedAt({ goalHorizon: 'winter', goalParts: 'named' }))
    expect(before.loaded).toBe(true)

    const load = backupFromJson(
      backupToJson(before.snapshot, {
        app: {
          commitSha: 'a'.repeat(40),
          commitShort: 'aaaaaaa',
          branch: 'main',
          target: 'preview',
          buildTime: '2026-01-01T00:00:00.000Z',
        },
        createdAt: WEEK_POINTED_AT_NOW,
      }),
    )
    expect(load.ok, load.ok ? '' : load.refusal.problem).toBe(true)
    if (!load.ok) return

    const goal = load.snapshot.records.find(
      (record): record is GoalRecord => record.kind === 'goal',
    )
    expect(goal?.targetWindow?.kind).toBe('due')
    // The value, not the container — D-108. A restored goal whose date came
    // back as `undefined` would satisfy `toBeDefined()` on the record.
    expect(goal?.parts?.map((part) => part.id)).toEqual([
      SUBNETTING.id,
      entityRef('learning-topic', 'VLAN trunking').id,
      entityRef('learning-topic', 'OSPF areas').id,
    ])

    const situation = assembleSituation(
      buildView(load.snapshot, { now: WEEK_POINTED_AT_NOW, zone: ZONE }),
      { now: WEEK_POINTED_AT_NOW, zone: ZONE, weekStartsOn: 1 },
    )
    const restored = situation.direction.goals.find((entry) => entry.goal.id === CCNA.id)
    expect(restored?.horizon?.daysRemaining).toBe(76)
    expect(restored?.parts).toHaveLength(3)
  })

  it('brings a goal with neither back without inventing either', () => {
    const before = snapshotFromWire(weekPointedAt({ goalHorizon: 'none', goalParts: 'none' }))
    const load = backupFromJson(
      backupToJson(before.snapshot, {
        app: {
          commitSha: 'a'.repeat(40),
          commitShort: 'aaaaaaa',
          branch: 'main',
          target: 'preview',
          buildTime: '2026-01-01T00:00:00.000Z',
        },
        createdAt: WEEK_POINTED_AT_NOW,
      }),
    )
    expect(load.ok).toBe(true)
    if (!load.ok) return
    const goal = load.snapshot.records.find(
      (record): record is GoalRecord => record.kind === 'goal',
    )
    expect(goal?.targetWindow).toBeUndefined()
    expect(goal?.parts).toBeUndefined()
  })
})

export const TEST_ZONE = timeZone('America/Denver')
