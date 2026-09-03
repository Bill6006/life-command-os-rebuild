import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { isUsable } from '../../src/domain/knowledge'
import type { CanonicalRecord, DecisionContext } from '../../src/domain/records'
import { instantToIso, type Instant } from '../../src/domain/time'
import { assembleSituation } from '../../src/intelligence/situation'
import { RECOGNISABLE, similarity } from '../../src/intelligence/learning'
import { describeWeekLoad, readWeekLoad, type LoadEvidence } from '../../src/intelligence/rhythm'
import { collectEpisodes } from '../../src/intelligence/lifecycle'
import { insightsFor } from '../../src/intelligence/insights'
import { createKit, pastEpisodeRecords, type PastEpisode } from '../../src/synthetic/kit'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { entityId, sequentialRecordIds } from '../../src/domain/ids'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { evening, loadScenario } from './harness'

/**
 * AUD-0007 — a Tuesday is not a Saturday, and a heavy week is a heavy week.
 *
 * The finding is two features missing from one comparison, and its risk is that
 * adding them narrows the comparable set to nothing. So the tests come in three
 * groups, matching the three things the audit asks for by name:
 *
 * 1. **A Tuesday ranks a past Tuesday above a past Saturday, all else equal.**
 * 2. **A record written before the change contributes as unknown rather than as
 *    agreement.**
 * 3. **Comparable-set sizes do not fall on the nine-month history.**
 *
 * Plus the half the audit only implies: the three load levels are reachable, and
 * each is reached by a history built to land on it rather than by whichever
 * fixture happened to. A classifier whose middle band is never exercised is a
 * classifier nobody has checked.
 */

// ---------------------------------------------------------------------------
// The comparison
// ---------------------------------------------------------------------------

describe('a Tuesday resembles a Tuesday — AUD-0007', () => {
  it('ranks a past Tuesday above a past Saturday, all else equal', () => {
    /*
     * The audit's own acceptance item, stated as a comparison rather than as a
     * ranking, because `similarity` is what the ranking is built out of and a
     * scenario that happened to come out right would prove less.
     *
     * `weekend` differs between the two, as it must — a Saturday *is* a weekend
     * — so this is the pair as the record would actually hold it.
     */
    const tuesday = evening({ dayOfWeek: 2, load: 'ordinary' })
    const anotherTuesday = evening({ dayOfWeek: 2, load: 'ordinary' })
    const saturday = evening({ dayOfWeek: 6, weekend: true, load: 'ordinary' })

    expect(similarity(tuesday, anotherTuesday)).toBeGreaterThan(similarity(tuesday, saturday))
  })

  it('separates a Tuesday from a Thursday, which the weekend boolean could not', () => {
    /*
     * The half `weekend` never reached: five working evenings collapsed into
     * each other. Both of these are working evenings, so `weekend` agrees on
     * them and the whole of the difference is the new feature.
     */
    const tuesday = evening({ dayOfWeek: 2 })
    const thursday = evening({ dayOfWeek: 4 })
    const anotherTuesday = evening({ dayOfWeek: 2 })

    expect(similarity(tuesday, anotherTuesday)).toBeGreaterThan(similarity(tuesday, thursday))
    // And a working evening is still more like another working evening than it
    // is like a Sunday. The weekday feature has three rungs, not two.
    const sunday = evening({ dayOfWeek: 7, weekend: true })
    expect(similarity(tuesday, thursday)).toBeGreaterThan(similarity(tuesday, sunday))
  })

  it('treats a heavy week as nearer an ordinary one than a light one', () => {
    const heavy = evening({ dayOfWeek: 3, load: 'heavy' })
    const ordinary = evening({ dayOfWeek: 3, load: 'ordinary' })
    const light = evening({ dayOfWeek: 3, load: 'light' })

    expect(similarity(heavy, ordinary)).toBeGreaterThan(similarity(heavy, light))
  })

  it('counts a record written before this phase as unknown, never as agreement', () => {
    /*
     * G-009 applied to comparison, and the reason this feature could be added
     * to a shipped history at all. A recommendation from March carries neither
     * field. It must not resemble a Tuesday more than a Saturday does, and it
     * must not resemble either *less* than a recorded mismatch would.
     */
    const tuesday = evening({ dayOfWeek: 2, load: 'heavy' })
    const older: DecisionContext = evening()
    const recordedMismatch = evening({ dayOfWeek: 6, weekend: true, load: 'light' })
    const recordedMatch = evening({ dayOfWeek: 2, load: 'heavy' })

    expect(similarity(tuesday, older)).toBeLessThan(similarity(tuesday, recordedMatch))
    expect(similarity(tuesday, older)).toBeGreaterThan(similarity(tuesday, recordedMismatch))
  })

  it('cannot narrow an evening out of recognition on its own', () => {
    /*
     * The bound on the risk, asserted where the arithmetic is. Two evenings that
     * agree on everything the app knew before this phase, and disagree on both
     * new features as hard as they can, must still be recognisably alike — or
     * the feature has stopped being a tiebreak and started being a filter.
     */
    const one = evening({ dayOfWeek: 2, load: 'heavy' })
    const other = evening({ dayOfWeek: 7, load: 'light' })
    expect(similarity(one, other)).toBeGreaterThan(RECOGNISABLE)
  })
})

// ---------------------------------------------------------------------------
// The risk the audit names: a comparable set that collapses
// ---------------------------------------------------------------------------

describe('the comparable set does not collapse — AUD-0007’s stated risk', () => {
  /*
   * *"Every added feature narrows the comparable set, and the set is already
   * often empty."* The nine-month history is the one the audit names, and the
   * property is measured across the whole library rather than on one history,
   * because a feature that only spared `long-run` would still have broken the
   * rest.
   */
  function comparableCounts(): readonly { readonly id: string; readonly samples: number }[] {
    return SCENARIOS.map((scenario) => {
      const decision = loadScenario(scenario.id).decision({ probe: false })
      const samples = decision.trace.learning.reduce((total, row) => total + row.samples, 0)
      return { id: scenario.id, samples }
    })
  }

  it('still finds comparable evenings in the nine-month history', () => {
    const rows = comparableCounts()
    const longRun = rows.find((row) => row.id === 'long-run')
    expect(longRun, 'the nine-month history is gone').toBeDefined()
    expect(longRun?.samples, 'the comparable set collapsed on the long history').toBeGreaterThan(0)
  })

  it('leaves more than one history with something to compare against', () => {
    const withEvidence = comparableCounts().filter((row) => row.samples > 0)
    expect(
      withEvidence.length,
      `only ${withEvidence.length} histories can compare anything`,
    ).toBeGreaterThan(2)
  })
})

// ---------------------------------------------------------------------------
// The three levels, each reached by a history built to reach it
// ---------------------------------------------------------------------------

const NOW = '2026-06-18'

const SUBNETTING = {
  kind: 'learning-topic',
  id: entityId('learning-topic', 'Subnetting'),
} as const

interface WeekShape {
  /** Hours slept, one entry per day back from `NOW`. */
  readonly nights: readonly number[]
  readonly episodes: readonly PastEpisode[]
}

/**
 * A week with a shape, loaded the long way round.
 *
 * Through `snapshotFromWire` like every other fixture, so a history that lands
 * on a band cannot be one the parser would have refused.
 */
function weekOf(shape: WeekShape): {
  readonly load: ReturnType<typeof readWeekLoad>
  readonly evidence: LoadEvidence
  readonly at: Instant
} {
  const kit = createKit('RHY', 'Europe/London', '2026-01-01T00:00:00Z')
  const nextId = sequentialRecordIds('RHYE')
  const records: CanonicalRecord[] = []

  const day = (back: number): string => {
    const base = Date.UTC(2026, 5, 18) - back * 86_400_000
    return instantToIso(base as Instant).slice(0, 10)
  }

  shape.nights.forEach((hours, index) => {
    records.push(
      kit.record(
        'observation',
        { occurredAt: kit.local(day(index + 1), '07:00'), domains: [DOMAIN.sleep] },
        {
          concept: CONCEPT.sleepHours,
          value: { type: 'number', value: hours, unit: 'hours' },
          method: 'self-report',
        },
      ),
    )
  })

  const topic = kit.entity({
    id: SUBNETTING.id,
    kind: 'learning-topic',
    label: 'Subnetting',
    domain: DOMAIN.career,
    privacy: 'normal',
  })
  records.push(...pastEpisodeRecords(kit, shape.episodes, nextId))

  const at = kit.local(NOW, '19:30')
  const document = kit.document({ records, entities: [topic], exportedAt: at })
  const loaded = snapshotFromWire(document)
  expect(loaded.loaded, 'the week should load').toBe(true)
  if (!loaded.loaded) throw new Error('unreachable')

  const moment = { now: at, zone: kit.zone }
  const view = buildView(loaded.snapshot, moment)
  const episodes = collectEpisodes(view, kit.zone)
  const nights = shape.nights
  const reading = readWeekLoad(
    {
      shortfallHours: nights.reduce((total, hours) => total + Math.max(0, 7.5 - hours), 0),
      nightsSeen: nights.length,
      basis: [],
    },
    episodes,
    moment,
  )
  return { load: reading, evidence: reading.evidence, at }
}

const LAB: Omit<PastEpisode, 'on'> = {
  verb: 'hands-on-lab',
  object: SUBNETTING,
  domain: DOMAIN.career,
  context: evening({ block: 'afternoon' }),
  ending: 'completed',
  result: 'all',
}

describe('the three levels are each reached by a week built to reach it', () => {
  it('says nothing at all about a week the record is silent on', () => {
    const week = weekOf({ nights: [], episodes: [] })
    expect(isUsable(week.load.load), 'an empty week became a reading').toBe(false)
    // And an empty week is not a light one, which is the G-009 half.
    expect(week.load.load.state).toBe('unknown')
  })

  it('reads a week of full nights and nothing refused as light', () => {
    const week = weekOf({ nights: [8, 8, 7.5, 8, 7.5, 8, 8], episodes: [] })
    expect(isUsable(week.load.load)).toBe(true)
    expect(isUsable(week.load.load) ? week.load.load.value : undefined).toBe('light')
  })

  it('reads a week a little short as ordinary', () => {
    // Three hours down across seven nights: real, and not the week AUD-0007's
    // sentence is for. The band between the two has to be reachable or the
    // reading is a boolean wearing three names.
    const week = weekOf({ nights: [7, 7, 7, 7, 7, 7, 7], episodes: [] })
    expect(isUsable(week.load.load) ? week.load.load.value : undefined).toBe('ordinary')
    expect(describeWeekLoad('ordinary', week.evidence), 'an ordinary week spoke').toBeUndefined()
  })

  it('reads a week of short nights as heavy, from rest alone', () => {
    const week = weekOf({ nights: [5, 5.5, 6, 5, 6, 6.5, 6], episodes: [] })
    expect(isUsable(week.load.load) ? week.load.load.value : undefined).toBe('heavy')
    expect(describeWeekLoad('heavy', week.evidence)).toContain('short of rest')
  })

  it('reads a rested week with three refusals as heavy, from refusals alone', () => {
    /*
     * The arm the shipped library never reaches, which is exactly why it is
     * built here. Every night is full, so the sleep arm cannot be what fires.
     */
    const week = weekOf({
      nights: [8, 8, 8, 8, 8, 8, 8],
      episodes: [
        { ...LAB, on: day(2), ending: 'unable-now' },
        { ...LAB, on: day(3), ending: 'unable-now' },
        { ...LAB, on: day(4), ending: 'unable-now' },
      ],
    })
    expect(isUsable(week.load.load) ? week.load.load.value : undefined).toBe('heavy')
    expect(week.evidence.couldNot).toBe(3)
    expect(week.evidence.sleepShortfallHours).toBe(0)
    expect(describeWeekLoad('heavy', week.evidence)).toContain('times you could not')
  })

  it('reads a rested week of five demanding things as heavy, from effort alone', () => {
    /*
     * The third arm, and the one worth defending: a week with five labs and no
     * sleep debt is still a heavy week. Treating "heavy" as a synonym for "slept
     * badly" would collapse the reading into `strain`, which already exists.
     */
    const week = weekOf({
      nights: [8, 8, 8, 8, 8, 8, 8],
      episodes: [1, 2, 3, 4, 5].map((back) => ({ ...LAB, on: day(back) })),
    })
    expect(isUsable(week.load.load) ? week.load.load.value : undefined).toBe('heavy')
    expect(week.evidence.effortfulDone).toBe(5)
    expect(week.evidence.couldNot).toBe(0)
    expect(week.evidence.sleepShortfallHours).toBe(0)
  })

  it('counts only what happened inside the seven days', () => {
    // A fortnight-old lab is not this week's. The window is what makes the
    // reading about a week rather than about a life.
    const week = weekOf({
      nights: [8, 8, 8, 8, 8, 8, 8],
      episodes: [9, 10, 11, 12, 13].map((back) => ({ ...LAB, on: day(back) })),
    })
    expect(week.evidence.effortfulDone).toBe(0)
    expect(isUsable(week.load.load) ? week.load.load.value : undefined).toBe('light')
  })

  it('counts a light move as a move done and never as a demanding one', () => {
    // `effortfulDone` is a count of what the week *asked* of him, which is what
    // makes five of them a heavy week. Five ten-minute recall sessions are not.
    const week = weekOf({
      nights: [8, 8, 8, 8, 8, 8, 8],
      episodes: [1, 2, 3, 4, 5].map((back) => ({
        ...LAB,
        verb: 'recall-practice' as const,
        on: day(back),
      })),
    })
    expect(week.evidence.effortfulDone).toBe(0)
    expect(isUsable(week.load.load) ? week.load.load.value : undefined).toBe('light')
  })
})

function day(back: number): string {
  const base = Date.UTC(2026, 5, 18) - back * 86_400_000
  return instantToIso(base as Instant).slice(0, 10)
}

// ---------------------------------------------------------------------------
// What the owner actually reads
// ---------------------------------------------------------------------------

describe('the sentence the app could not say', () => {
  it('says a heavy week is heavy, and cites what it counted', () => {
    const scenario = SCENARIOS.find((entry) => entry.id === 'running-on-empty')
    expect(scenario, 'the fixture moved').toBeDefined()
    if (scenario === undefined) throw new Error('unreachable')

    const situation = loadScenario(scenario.id).decision({ probe: false }).situation
    const card = insightsFor(situation).insights.find((insight) => insight.id === 'week-load')

    expect(card, 'nine hours short of rest and the app says nothing').toBeDefined()
    expect(card?.headline).toContain('heavy')
    expect(card?.detail).toContain('nights of sleep recorded')
    // A reading, not a conclusion: nothing to be confident about and nothing to
    // disagree with, which is what a trajectory card does with the same shape.
    expect(card?.confidence).toBeUndefined()
    expect(card?.belief).toBeUndefined()
    // And it names where its evidence came from, or an imported week would read
    // as one the owner told this app about.
    expect(card?.sources.length, 'the card claims no origin at all').toBeGreaterThan(0)
  })

  it('says nothing on a history whose week was ordinary', () => {
    let quiet = 0
    for (const scenario of SCENARIOS) {
      const situation = loadScenario(scenario.id).decision({ probe: false }).situation
      const card = insightsFor(situation).insights.find((insight) => insight.id === 'week-load')
      if (card === undefined) quiet += 1
      else expect(card.headline, `${scenario.id}`).toContain('heavy')
    }
    expect(quiet, 'every history in the library calls its week heavy').toBeGreaterThan(20)
  })

  it('never renders a load the app does not know', () => {
    /*
     * The card is the only thing that speaks, and it speaks only from a usable
     * reading. A history with nothing in the last seven days must produce no
     * sentence at all rather than "the week has been an ordinary one".
     */
    const kit = createKit('RHYQ', 'Europe/London', '2026-01-01T00:00:00Z')
    const at = kit.local(NOW, '19:30')
    const document = kit.document({ records: [], entities: [], exportedAt: at })
    const loaded = snapshotFromWire(document)
    if (!loaded.loaded) throw new Error('unreachable')
    const moment = { now: at, zone: kit.zone, weekStartsOn: 1 as const }
    const situation = assembleSituation(buildView(loaded.snapshot, moment), moment)

    expect(isUsable(situation.weekLoad)).toBe(false)
    expect(
      insightsFor(situation).insights.find((insight) => insight.id === 'week-load'),
    ).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// And what goes onto the record
// ---------------------------------------------------------------------------

describe('what a decision writes down about its own week', () => {
  it('stamps the weekday on every context it writes', () => {
    for (const scenario of SCENARIOS) {
      const situation = loadScenario(scenario.id).decision({ probe: false }).situation
      expect(
        situation.context.dayOfWeek,
        `${scenario.id}: a decision was made on no particular day`,
      ).toBeGreaterThanOrEqual(1)
      expect(situation.context.dayOfWeek).toBeLessThanOrEqual(7)
    }
  })

  it('leaves the load off the record when it does not know one', () => {
    /*
     * The unknown case reaches the record as an **absent field**, not as
     * "ordinary". A week nothing was recorded in is not an ordinary week, and
     * writing one down would make every future comparison against it a false
     * match that nothing could ever undo.
     */
    const kit = createKit('RHYU', 'Europe/London', '2026-01-01T00:00:00Z')
    const at = kit.local(NOW, '19:30')
    const document = kit.document({ records: [], entities: [], exportedAt: at })
    const loaded = snapshotFromWire(document)
    if (!loaded.loaded) throw new Error('unreachable')
    const moment = { now: at, zone: kit.zone, weekStartsOn: 1 as const }
    const situation = assembleSituation(buildView(loaded.snapshot, moment), moment)

    expect(situation.context.load).toBeUndefined()
    expect(Object.hasOwn(situation.context, 'load')).toBe(false)
  })

  it('agrees with the reading it carries', () => {
    for (const scenario of SCENARIOS) {
      const situation = loadScenario(scenario.id).decision({ probe: false }).situation
      const expected = isUsable(situation.weekLoad) ? situation.weekLoad.value : undefined
      expect(situation.context.load, `${scenario.id}`).toBe(expected)
    }
  })
})
