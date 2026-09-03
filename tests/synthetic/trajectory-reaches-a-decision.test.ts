import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { CONCEPT, coreConcepts } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { entityId } from '../../src/domain/ids'
import type { CanonicalRecord } from '../../src/domain/records'
import type { Instant } from '../../src/domain/time'
import { decide, type Decision } from '../../src/intelligence/engine'
import { insightsFor } from '../../src/intelligence/insights'
import { assembleSituation } from '../../src/intelligence/situation'
import {
  readTrajectories,
  TRAJECTORY_READINGS,
  TRAJECTORY_SHIFT,
} from '../../src/intelligence/trajectory'
import { NO_PERMISSIONS } from '../../src/domain/privacy'
import { buildView } from '../../src/memory/view'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { createKit } from '../../src/synthetic/kit'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { loadScenario } from './harness'

/**
 * AUD-0029 / S1b — a six-week reading reaches a decision.
 *
 * The app's longest reasoning horizon was one night. `insights.ts` had computed
 * a trajectory since Phase 6 and no decision could read it. This phase moved the
 * arithmetic to `trajectory.ts`, put the reading on the situation, and gave the
 * evaluator one dimension that consults it.
 *
 * The audit names two acceptance items and both are here:
 *
 * 1. **Byte-identical insight cards before and after the extraction.**
 * 2. **A downward trajectory in a domain changes the chosen move in an
 *    otherwise-identical history.**
 *
 * The second is the one that could not be written before this phase, and it is
 * written as a **counterfactual with one variable**: two histories whose current
 * readings are identical to the last decimal, differing only in what the months
 * behind them did.
 */

// ---------------------------------------------------------------------------
// 1 — the extraction changed no card
// ---------------------------------------------------------------------------

describe('the arithmetic moved and the card did not — AUD-0029', () => {
  /**
   * Every trajectory card the shipped library produces, hashed.
   *
   * **Taken at `355bd22`, the commit immediately before the extraction**, by
   * running this exact function in a worktree at that commit — not recomputed
   * here and not read off the diff. That is the difference between a pin that
   * proves the move was clean and one that records whatever the move produced.
   *
   * If this fails, something about a card moved. That is not automatically
   * wrong, but it is never something to update without reading what moved and
   * saying so in the record.
   */
  const BEFORE_EXTRACTION = 'be79ad8b440f441ceead51ce1034e9cdcdc0bb643720d1754a68489c7cb67036'

  function cardPrint(): { readonly digest: string; readonly cards: number } {
    const rows: string[] = []
    for (const scenario of SCENARIOS) {
      const situation = loadScenario(scenario.id).decision({ probe: false }).situation
      for (const insight of insightsFor(situation).insights) {
        if (!insight.id.startsWith('trajectory:')) continue
        rows.push(`${scenario.id}|${JSON.stringify(insight)}`)
      }
    }
    return {
      digest: createHash('sha256').update(rows.sort().join('\n')).digest('hex'),
      cards: rows.length,
    }
  }

  it('produces the identical cards it produced before the computation moved', () => {
    expect(cardPrint().digest, 'a trajectory card moved when the arithmetic did').toBe(
      BEFORE_EXTRACTION,
    )
  })

  it('is a digest over cards that exist, so a passing run means something', () => {
    // A digest of an empty sweep is a constant, and a constant passes forever.
    expect(cardPrint().cards, 'the sweep found no trajectory cards at all').toBeGreaterThan(3)
  })

  it('reads the card off the same computation the decision reads', () => {
    /*
     * The half that makes one name for a thing true rather than intended. Every
     * card the library renders corresponds to a row in `situation.trajectories`,
     * so the screen and the ranking cannot come to disagree about what the
     * record has been doing.
     */
    for (const scenario of SCENARIOS) {
      const situation = loadScenario(scenario.id).decision({ probe: false }).situation
      const cards = insightsFor(situation)
        .insights.filter((insight) => insight.id.startsWith('trajectory:'))
        .map((insight) => insight.id.slice('trajectory:'.length))
      for (const concept of cards) {
        expect(
          situation.trajectories.has(concept as never),
          `${scenario.id}: a card the decision could not see`,
        ).toBe(true)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// 2 — the counterfactual the audit asks for
// ---------------------------------------------------------------------------

const INSURANCE = {
  kind: 'financial-goal',
  id: entityId('financial-goal', 'the car insurance'),
} as const
const KITCHEN = { kind: 'place', id: entityId('place', 'the kitchen') } as const

/**
 * One Tuesday morning, built twice.
 *
 * Everything either history says about **now** is identical: the same current
 * energy reading, the same three nights, the same soreness, the same minutes,
 * the same buried kitchen table, the same insurance goal falling due in a week.
 * The same three moves are proposed in both.
 *
 * What differs is the fortnight behind the energy readings — eight of them
 * holding flat, or eight sliding from four-of-five to two. That is the only
 * variable, and it is what makes the assertion below a measurement rather than a
 * coincidence.
 *
 * The audit's own example, deliberately: *"it cannot notice that his energy has
 * been trending down since June."*
 */
function aMorningWith(energy: readonly number[]): Decision {
  const kit = createKit('TRJ', 'Europe/London', '2025-06-01T00:00:00Z')

  const insurance = kit.entity({
    id: INSURANCE.id,
    kind: 'financial-goal',
    label: 'the car insurance',
    domain: DOMAIN.money,
    privacy: 'sensitive',
  })
  const kitchen = kit.entity({
    id: KITCHEN.id,
    kind: 'place',
    label: 'the kitchen',
    domain: DOMAIN.home,
    privacy: 'normal',
  })

  const records: CanonicalRecord[] = [
    kit.record(
      'goal',
      {
        occurredAt: kit.local('2026-01-05', '20:00'),
        domains: [DOMAIN.money],
        entities: [INSURANCE],
      },
      {
        goal: INSURANCE,
        statement: 'Sort out the car insurance',
        status: 'active',
        /*
         * Due in a week, so that the morning has a real competitor.
         *
         * Without it the counterfactual would turn on a margin of about a
         * thousandth, and a test resting on a near-tie is a test reporting which
         * way the arithmetic rounded — AUD-0035's own lesson, applied to a test
         * instead of to the instrument. This is identical in both histories and
         * is what puts a defensible gap on each side of the comparison.
         */
        targetWindow: {
          kind: 'due',
          earliest: kit.local('2026-03-10', '00:00'),
          latest: kit.local('2026-03-10', '23:59'),
        },
      },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-03-01', '19:00'), domains: [DOMAIN.money] },
      {
        concept: CONCEPT.cashBuffer,
        value: { type: 'number', value: 400, unit: 'pounds' },
        method: 'self-report',
      },
    ),
  ]

  /*
   * Eight readings across a fortnight, which is what `energy.current` needs.
   *
   * Concept-relative, deliberately: its own freshness window is six hours, so a
   * trajectory over it wants a week rather than the six months a cash buffer
   * would want. Six days of nightly sleep readings is a fortnight's worth of
   * evidence about sleep; six days of cash readings is one afternoon's worth
   * about money.
   *
   * **The last of the eight is this morning's, and it is the same value in
   * both** — so every reading the app holds about right now agrees, and only the
   * run behind it differs.
   */
  const DAYS = [
    '2026-02-16',
    '2026-02-19',
    '2026-02-22',
    '2026-02-24',
    '2026-02-26',
    '2026-02-28',
    '2026-03-02',
    '2026-03-03',
  ]
  energy.forEach((value, index) => {
    const on = DAYS[index]
    if (on === undefined) throw new Error('more readings than days')
    records.push(
      kit.record(
        'observation',
        {
          occurredAt: kit.local(on, index === DAYS.length - 1 ? '09:00' : '19:00'),
          domains: [DOMAIN.health],
        },
        {
          concept: CONCEPT.energy,
          value: { type: 'scale', value, of: 5 },
          method: 'self-report',
        },
      ),
    )
  })

  // Everything about the morning itself, identical in both histories.
  records.push(
    ...[7.5, 7.25, 8].map((value, offset) =>
      kit.record(
        'observation',
        {
          occurredAt: kit.local(`2026-03-${String(1 + offset).padStart(2, '0')}`, '07:00'),
          domains: [DOMAIN.sleep],
        },
        {
          concept: CONCEPT.sleepHours,
          value: { type: 'number', value, unit: 'hours' },
          method: 'self-report',
        },
      ),
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-03-03', '09:00'), domains: [DOMAIN.health] },
      {
        concept: CONCEPT.soreness,
        value: { type: 'scale', value: 0, of: 5 },
        method: 'self-report',
      },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-03-03', '09:00'), domains: [DOMAIN.direction] },
      {
        concept: CONCEPT.freeNow,
        value: { type: 'duration', minutes: 60 },
        method: 'self-report',
      },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-03-03', '08:00'), domains: [DOMAIN.home] },
      {
        concept: CONCEPT.homeFriction,
        value: { type: 'text', value: 'the kitchen table is buried again' },
        method: 'self-report',
      },
    ),
  )

  const now = kit.local('2026-03-03', '09:30')
  const loaded = snapshotFromWire(
    kit.document({ entities: [insurance, kitchen], records, exportedAt: now }),
  )
  expect(loaded.loaded, 'the history should load').toBe(true)
  if (!loaded.loaded) throw new Error('unreachable')

  const moment = { now, zone: kit.zone, weekStartsOn: 1 as const }
  return decide(buildView(loaded.snapshot, moment), moment, { probe: false })
}

/** Eight readings holding flat, and eight sliding to the same figure. */
const STEADY = [2, 2, 2, 2, 2, 2, 2, 2]
const SLIDING = [4, 4, 4, 3, 3, 2, 2, 2]

describe('a downward trajectory changes the chosen move — AUD-0029', () => {
  const steady = aMorningWith(STEADY)
  const sliding = aMorningWith(SLIDING)

  it('reads the same thing about right now in both histories', () => {
    /*
     * The control, and it has to come first. An assertion that the chosen move
     * differs proves nothing at all unless the two histories agree about
     * everything the app can see *now* — and this morning's energy reading is
     * two-of-five in both, so the current reading, the strain, the time and the
     * limiter are the same facts.
     */
    expect(sliding.situation.capacity.energy).toEqual(steady.situation.capacity.energy)
    expect(sliding.situation.readings.get(CONCEPT.energy)).toEqual(
      steady.situation.readings.get(CONCEPT.energy),
    )
    expect(sliding.situation.capacity.strain).toEqual(steady.situation.capacity.strain)
    expect(sliding.situation.limiter).toEqual(steady.situation.limiter)
    expect(sliding.trace.proposed.map((move) => move.id).sort()).toEqual(
      steady.trace.proposed.map((move) => move.id).sort(),
    )
    // And the same three moves really were on the table, or "the chosen one
    // changed" would be a statement about which candidates existed.
    expect(steady.trace.proposed.length).toBeGreaterThan(2)
  })

  it('sees a drift in the one history and not in the other', () => {
    const flat = steady.situation.trajectories.get(CONCEPT.energy)
    const down = sliding.situation.trajectories.get(CONCEPT.energy)

    expect(flat?.direction, 'a flat run of readings claimed a direction').toBe('steady')
    expect(down?.direction, 'a slide from four of five to two read as steady').toBe('down')
    expect(down?.readings.length, 'the run is not the fortnight it was built as').toBe(
      SLIDING.length,
    )
  })

  it('speaks in the sliding history and abstains in the steady one', () => {
    const spoke = (decision: Decision): readonly number[] =>
      decision.trace.ranking
        .flatMap((row) => row.dimensions)
        .filter((dimension) => dimension.name === 'trajectory-fit' && dimension.weight > 0)
        .map((dimension) => dimension.value)

    expect(spoke(steady), 'a flat run of readings raised something').toEqual([])
    expect(spoke(sliding).length, 'a fortnight of sliding raised nothing').toBeGreaterThan(0)
    for (const value of spoke(sliding)) expect(value).toBeGreaterThan(0)
  })

  it('changes which move the owner is offered', () => {
    /*
     * **The audit's own acceptance item, and the whole of the phase's claim
     * about horizons.** The two mornings are the same morning. One of them has a
     * fortnight behind it that says his energy is going one way, and the app now
     * answers differently because of it.
     *
     * Both winners are named rather than only their difference asserted, so a
     * change that made *both* mornings choose some third thing fails here
     * instead of passing on an inequality that had stopped meaning anything.
     */
    expect(steady.evaluation?.candidate.semantics.domain, 'the steady morning moved').toBe(
      DOMAIN.money,
    )
    expect(sliding.evaluation?.candidate.semantics.domain, 'the sliding morning did not').toBe(
      DOMAIN.health,
    )
    expect(
      sliding.evaluation?.candidate.id,
      'a fortnight of sliding changed nothing the owner would see',
    ).not.toBe(steady.evaluation?.candidate.id)
  })

  it('changes it by a margin that is not rounding', () => {
    /*
     * AUD-0035's lesson applied to this test rather than to the instrument: an
     * observed evening once ranked 0.137 / 0.135 / 0.134, and a test turning on
     * that would be reporting which way the arithmetic rounded. Both decisions
     * here clear their runner-up by more than a fiftieth.
     */
    const margin = (decision: Decision): number =>
      (decision.trace.ranking[0]?.score ?? 0) - (decision.trace.ranking[1]?.score ?? 0)
    expect(margin(steady), 'the steady morning is a near-tie').toBeGreaterThan(0.015)
    expect(margin(sliding), 'the sliding morning is a near-tie').toBeGreaterThan(0.015)
  })

  it('says why, in a sentence about the record rather than about a remedy', () => {
    const dimension = sliding.trace.ranking
      .flatMap((row) => row.dimensions)
      .find((entry) => entry.name === 'trajectory-fit' && entry.weight > 0)

    expect(dimension?.note).toContain('going the other way')
    // Never causal: nothing claims the move would turn it around, which is a
    // claim a run of numbers cannot support (section 68).
    expect(dimension?.note).not.toMatch(/\bbecause\b|\bcaused?\b|\bwill\b|\bfix/i)
    expect(dimension?.phrase).not.toMatch(/\bbecause\b|\bcaused?\b|\bwill\b|\bfix/i)
  })
})

// ---------------------------------------------------------------------------
// 3 — a direction is not a valence
// ---------------------------------------------------------------------------

describe('which way is the good way is declared, never guessed', () => {
  it('never raises an area whose readings are drifting the good way', () => {
    /*
     * The failure this would have had if the dimension read the direction alone:
     * falling soreness is a shoulder getting better, and the app would have
     * raised the urgency of every area the owner was recovering in.
     *
     * `observed-evenings` is the history that has it — soreness down across the
     * record — and it must produce no `trajectory-fit` weight anywhere.
     */
    const scenario = SCENARIOS.find((entry) => entry.id === 'observed-evenings')
    expect(scenario, 'the fixture moved').toBeDefined()
    if (scenario === undefined) throw new Error('unreachable')

    const decision = loadScenario(scenario.id).decision({ probe: false })
    const soreness = decision.situation.trajectories.get(CONCEPT.soreness)
    expect(soreness?.direction, 'the history no longer holds a falling soreness run').toBe('down')
    expect(coreConcepts.definitionFor(CONCEPT.soreness).sense).toBe('higher-is-worse')

    for (const row of decision.trace.ranking) {
      for (const dimension of row.dimensions) {
        if (dimension.name !== 'trajectory-fit') continue
        expect(dimension.weight, `${row.id}: a shoulder getting better raised the area`).toBe(0)
      }
    }
  })

  it('abstains across the whole shipped library, because nothing in it is sliding', () => {
    /*
     * The other half of the counterfactual above, and the reason it had to be
     * built by hand: **no history in the library reaches this dimension.** Said
     * out loud rather than left to be discovered, because a dimension nothing
     * exercises is one nobody has checked — and it is why the sliding history
     * exists in this file at all.
     */
    for (const scenario of SCENARIOS) {
      const decision = loadScenario(scenario.id).decision({ probe: false })
      for (const row of decision.trace.ranking) {
        for (const dimension of row.dimensions) {
          if (dimension.name !== 'trajectory-fit') continue
          expect(dimension.weight, `${scenario.id} / ${row.id}`).toBe(0)
          expect(dimension.value, `${scenario.id} / ${row.id}`).toBe(0)
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------
// 4 — the bounds on the reading itself
// ---------------------------------------------------------------------------

describe('what the reading refuses to conclude', () => {
  function readingsOf(count: number, spacingDays: number, values: readonly number[]) {
    const kit = createKit('TRB', 'Europe/London', '2025-01-01T00:00:00Z')
    const records: CanonicalRecord[] = []
    for (let index = 0; index < count; index += 1) {
      const at = (kit.local('2026-03-01', '19:00') -
        (count - index) * spacingDays * 86_400_000) as Instant
      records.push(
        kit.record(
          'observation',
          { occurredAt: at, domains: [DOMAIN.money] },
          {
            concept: CONCEPT.cashBuffer,
            value: { type: 'number', value: values[index] ?? 100, unit: 'pounds' },
            method: 'self-report',
          },
        ),
      )
    }
    const now = kit.local('2026-03-01', '20:00')
    const loaded = snapshotFromWire(kit.document({ entities: [], records, exportedAt: now }))
    if (!loaded.loaded) throw new Error('unreachable')
    const moment = { now, zone: kit.zone, weekStartsOn: 1 as const }
    return readTrajectories(
      buildView(loaded.snapshot, moment),
      coreConcepts,
      NO_PERMISSIONS,
      moment,
    )
  }

  it('says nothing from fewer readings than it needs', () => {
    const values = [600, 500, 400, 300, 200]
    expect(values.length).toBeLessThan(TRAJECTORY_READINGS)
    expect(readingsOf(values.length, 40, values).size, 'five readings claimed a direction').toBe(0)
  })

  it('says nothing from enough readings over too short a span', () => {
    // Six readings taken in a fortnight are six readings about a fortnight, and
    // a cash buffer's own window is thirty days. Concept-relative, so this is a
    // real refusal rather than a fixed number that is wrong for something.
    const values = [600, 500, 400, 300, 250, 200]
    expect(readingsOf(values.length, 2, values).size, 'a fortnight became a season').toBe(0)
  })

  it('calls a run inside the threshold steady rather than picking a side', () => {
    const values = [200, 204, 198, 202, 199, 203]
    const found = readingsOf(values.length, 40, values).get(CONCEPT.cashBuffer)
    expect(found?.direction).toBe('steady')
    expect(Math.abs(found?.shift ?? 1)).toBeLessThan(TRAJECTORY_SHIFT)
  })

  it('never reads a concept the owner has not allowed it to reason from', () => {
    /*
     * D-167, on the reading rather than on the card. The private class is the
     * one that waits for the owner's word, and a trajectory over it is not
     * computed-then-ignored: a reading that exists inside the engine is a
     * reading something will eventually consult.
     *
     * Held as a property of the registry rather than by building a private
     * history, because what has to be true is that **no** private concept can
     * reach the map — not that one particular one does not.
     */
    for (const concept of coreConcepts.all()) {
      if (concept.privacy !== 'private') continue
      for (const scenario of SCENARIOS) {
        const situation = loadScenario(scenario.id).decision({ probe: false }).situation
        expect(
          situation.trajectories.has(concept.id),
          `${scenario.id}: ${concept.id} reached the engine unasked`,
        ).toBe(false)
      }
    }
  })

  it('keeps the card’s question and the engine’s question apart', () => {
    /*
     * `mayRaiseUnasked` and `mayReasonFrom` are different questions and neither
     * may stand in for the other (D-167). The reading carries the first as a
     * flag so the card can ask it, and is gated on the second — so a concept the
     * engine may reason from but may not raise is representable rather than
     * impossible.
     */
    const kit = createKit('TRP', 'Europe/London', '2025-01-01T00:00:00Z')
    const now = kit.local('2026-03-01', '20:00')
    const moment = { now, zone: kit.zone, weekStartsOn: 1 as const }
    const loaded = snapshotFromWire(kit.document({ entities: [], records: [], exportedAt: now }))
    if (!loaded.loaded) throw new Error('unreachable')
    const situation = assembleSituation(buildView(loaded.snapshot, moment), moment)
    expect(situation.trajectories.size).toBe(0)

    for (const scenario of SCENARIOS) {
      const found = loadScenario(scenario.id).decision({ probe: false }).situation.trajectories
      for (const trajectory of found.values()) {
        expect(
          typeof trajectory.mayRaise,
          `${scenario.id}: ${trajectory.concept} carries no answer about being raised`,
        ).toBe('boolean')
      }
    }
  })
})
