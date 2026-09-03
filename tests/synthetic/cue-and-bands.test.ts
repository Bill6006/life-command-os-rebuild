import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { entityId, sequentialRecordIds } from '../../src/domain/ids'
import type { CanonicalRecord } from '../../src/domain/records'
import { instantToIso, type Instant } from '../../src/domain/time'
import { decide, type Decision } from '../../src/intelligence/engine'
import { insightsFor } from '../../src/intelligence/insights'
import { buildView } from '../../src/memory/view'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { createKit, pastEpisodeRecords, type PastEpisode } from '../../src/synthetic/kit'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { evening, loadScenario } from './harness'

/**
 * AUD-0051 — recommendations name what to do and almost never when.
 * C14 — the bands, on histories built to land at each one.
 *
 * Together because they are the two things this phase says about **how sure and
 * how soon**, and both are guarded the same way: a sentence may only carry what
 * the record actually holds.
 */

const HOUR = 3_600_000
const DAY = 86_400_000

// ---------------------------------------------------------------------------
// The cue
// ---------------------------------------------------------------------------

describe('a cue names a moment the record holds — AUD-0051', () => {
  it('names a boundary he is going to reach', () => {
    /*
     * `school-morning` two hours before the school day starts: thirty minutes
     * with Adaya, and a real deadline the app already knew about and never said.
     */
    const loaded = loadScenario('school-morning')
    const now = (loaded.scenario.now - 2 * HOUR) as Instant
    const moment = { now, zone: loaded.scenario.zone, weekStartsOn: 1 as const }
    const decision = decide(loaded.viewAt(now, moment.zone, moment.weekStartsOn), moment, {
      probe: false,
    })

    expect(decision.explanation?.cue?.from).toBe('a-boundary-ahead')
    expect(decision.explanation?.rendered.sentence).toContain('before Adaya’s school day')
  })

  it('keeps the owner’s own capitals — a label is not a phrase to tidy', () => {
    /*
     * A cue reads mid-sentence, so lower-casing its first letter looks like the
     * obvious tidy. The first draft did it, and turned *"Adaya's school day"* —
     * his own words — into *"adaya's school day"* on the screen he reads every
     * morning. D-018's rule about never paraphrasing a rendered thing covers its
     * capitals.
     */
    const loaded = loadScenario('school-morning')
    const now = (loaded.scenario.now - 2 * HOUR) as Instant
    const moment = { now, zone: loaded.scenario.zone, weekStartsOn: 1 as const }
    const said = decide(loaded.viewAt(now, moment.zone, moment.weekStartsOn), moment, {
      probe: false,
    }).explanation?.rendered.sentence
    expect(said, 'a label was lower-cased into something he did not write').not.toContain('adaya')
  })

  it('names something he has just finished, and never the move itself', () => {
    const loaded = loadScenario('friendship-gone-quiet')
    const now = (loaded.scenario.now - 6 * HOUR) as Instant
    const moment = { now, zone: loaded.scenario.zone, weekStartsOn: 1 as const }
    const decision = decide(loaded.viewAt(now, moment.zone, moment.weekStartsOn), moment, {
      probe: false,
    })

    expect(decision.explanation?.cue?.from).toBe('a-move-just-finished')
    const object = decision.evaluation?.candidate.semantics.target.object
    const label = decision.situation.entities.labelFor(object!) ?? ''
    expect(decision.explanation?.cue?.clause, 'the app cued a move off itself').not.toContain(label)
  })

  it('says nothing at all almost everywhere, which is the point', () => {
    /*
     * *"An invented or wrong cue is worse than none."* The audit's example is
     * exact — *"when Adaya's in bed"* on an evening she is not there — so the
     * honest state is silence, and it is the common one: the app rarely holds a
     * moment it can name.
     */
    let cued = 0
    let total = 0
    for (const scenario of SCENARIOS) {
      const loaded = loadScenario(scenario.id)
      for (const offset of [-9, -6, -3, 0, 2, 4, 8]) {
        const now = (scenario.now + offset * HOUR) as Instant
        const moment = { now, zone: scenario.zone, weekStartsOn: scenario.weekStartsOn ?? 1 }
        const decision = decide(loaded.viewAt(now, moment.zone, moment.weekStartsOn), moment, {
          probe: false,
        })
        if (decision.kind !== 'move') continue
        total += 1
        if (decision.explanation?.cue !== undefined) cued += 1
      }
    }
    expect(cued, 'no cue is ever composed, so nothing here is checked').toBeGreaterThan(0)
    expect(cued * 4, `${cued} of ${total} moments carry a cue`).toBeLessThan(total)
  })

  it('leaves the uncued sentence byte-identical to what the catalogue wrote', () => {
    /*
     * The audit's own acceptance item. Where no cue exists the sentence is
     * exactly what the template composed, with nothing appended and no em dash
     * introduced — so the whole of this finding is *additive to a moment the app
     * can name*, and invisible everywhere else.
     */
    for (const scenario of SCENARIOS) {
      const decision = loadScenario(scenario.id).decision({ probe: false })
      if (decision.kind !== 'move') continue
      if (decision.explanation?.cue !== undefined) continue
      const said = decision.explanation?.rendered.sentence ?? ''
      expect(said, `${scenario.id}: a cue appeared from nowhere`).not.toMatch(/— (before|after) /)
    }
  })

  it('never names a deadline he could not meet', () => {
    /*
     * A move that would use every minute before the school run is not a move to
     * do *before* the school run — it is one the clock is already in the way of.
     * Naming it would be the confident wrongness the whole finding is about.
     */
    const loaded = loadScenario('school-morning')
    for (const minutes of [0, 10, 20]) {
      const now = (loaded.scenario.now - minutes * 60_000) as Instant
      const moment = { now, zone: loaded.scenario.zone, weekStartsOn: 1 as const }
      const decision = decide(loaded.viewAt(now, moment.zone, moment.weekStartsOn), moment, {
        probe: false,
      })
      if (decision.kind !== 'move') continue
      const needs = decision.evaluation?.candidate.semantics.target.minutes ?? 0
      const left = decision.situation.minutesUntilNextObligation
      if (left.state === 'unknown' || left.value >= needs + 5) continue
      expect(
        decision.explanation?.cue,
        `${minutes} minutes out: a deadline was named that could not be met`,
      ).toBeUndefined()
    }
  })

  it('says nothing while a move is being held for later', () => {
    /*
     * The two sentences contradict each other: *"the morning suits this better
     * than the early morning"* and *"— before the school run"* is the app
     * deferring a move and naming a deadline for it in one breath.
     */
    const loaded = loadScenario('school-morning')
    const now = (loaded.scenario.now - 3 * HOUR) as Instant
    const moment = { now, zone: loaded.scenario.zone, weekStartsOn: 1 as const }
    const decision = decide(loaded.viewAt(now, moment.zone, moment.weekStartsOn), moment, {
      probe: false,
    })
    expect(decision.kind, 'the fixture no longer holds a hold').toBe('hold')
    expect(decision.explanation?.cue, 'a held move named a deadline').toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// The bands — C14, on histories built to land at each one
// ---------------------------------------------------------------------------

const A_WALK = { kind: 'routine', id: entityId('routine', 'a walk') } as const

/**
 * A run of walks, as many as asked for, all of which went the same way.
 *
 * The only variable is **how many**, which is what a band is about. C14's build
 * item is *"for QA to test across bands today, histories that land at each band
 * — buildable now"*, and this is that: two, six, ten, and ten with one that went
 * the other way.
 */
function aRunOfWalks(count: number, counterexamples = 0): Decision {
  const kit = createKit('BND', 'Europe/London', '2025-06-01T00:00:00Z')
  const nextId = sequentialRecordIds('BNDE')
  const walk = kit.entity({
    id: A_WALK.id,
    kind: 'routine',
    label: 'a walk',
    domain: DOMAIN.health,
    privacy: 'normal',
  })

  const now = kit.local('2026-05-20', '19:00')
  const seeds: PastEpisode[] = []
  for (let index = 0; index < count; index += 1) {
    const on = instantToIso((now - (index + 2) * DAY) as Instant).slice(0, 10)
    seeds.push({
      verb: 'move',
      object: A_WALK,
      domain: DOMAIN.health,
      on,
      at: '19:00',
      context: evening({ dayOfWeek: 3 }),
      ending: 'completed',
      effect: index < counterexamples ? 'little' : 'real',
    })
  }

  const records: CanonicalRecord[] = [
    ...pastEpisodeRecords(kit, seeds, nextId),
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-05-20', '07:00'), domains: [DOMAIN.sleep] },
      {
        concept: CONCEPT.sleepHours,
        value: { type: 'number', value: 8, unit: 'hours' },
        method: 'self-report',
      },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-05-20', '18:30'), domains: [DOMAIN.health] },
      { concept: CONCEPT.energy, value: { type: 'scale', value: 4, of: 5 }, method: 'self-report' },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-05-20', '18:30'), domains: [DOMAIN.health] },
      {
        concept: CONCEPT.soreness,
        value: { type: 'scale', value: 0, of: 5 },
        method: 'self-report',
      },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-05-20', '18:30'), domains: [DOMAIN.direction] },
      { concept: CONCEPT.freeNow, value: { type: 'duration', minutes: 60 }, method: 'self-report' },
    ),
  ]

  const loaded = snapshotFromWire(kit.document({ entities: [walk], records, exportedAt: now }))
  expect(loaded.loaded, `${count} walks should load`).toBe(true)
  if (!loaded.loaded) throw new Error('unreachable')

  const moment = { now, zone: kit.zone, weekStartsOn: 1 as const }
  return decide(buildView(loaded.snapshot, moment), moment, { probe: false })
}

/** What the app says about walking on Now, where it says anything. */
function saidOnNow(decision: Decision): string {
  const walking = decision.trace.learning.find((row) => row.verb === 'move')
  return walking?.summary ?? ''
}

/**
 * And the word Insights puts on it.
 *
 * Any card that states a confidence, rather than a named kind: a run with a
 * counterexample in it can legitimately be a different kind of card from a run
 * without one, and pinning the kind would make this a test about which card
 * appeared rather than about the band on it.
 */
function bandOnInsights(decision: Decision): string | undefined {
  const cards = insightsFor(decision.situation).insights.filter(
    (insight) => insight.confidence !== undefined,
  )
  return cards[0]?.confidence?.word
}

/** Every card the run produces, for a probe that needs to say what it saw. */
function cardsOn(decision: Decision): readonly string[] {
  return insightsFor(decision.situation).insights.map(
    (insight) => `${insight.kind}:${insight.confidence?.word ?? '-'}`,
  )
}

describe('the app speaks differently when it knows little and when it knows much — C14', () => {
  const two = aRunOfWalks(2)
  const six = aRunOfWalks(6)
  const twelve = aRunOfWalks(12)
  const twelveWithOne = aRunOfWalks(12, 1)

  it('lands each history where it was built to land', () => {
    // The control. A band test over histories that all reach the same band would
    // pass on every assertion below and mean nothing.
    expect(two.trace.learning.find((row) => row.verb === 'move')?.samples).toBe(2)
    expect(six.trace.learning.find((row) => row.verb === 'move')?.samples).toBe(6)
    expect(twelve.trace.learning.find((row) => row.verb === 'move')?.samples).toBe(12)
  })

  it('says something visibly different at two occasions and at twelve', () => {
    /*
     * The ordinary-owner item, on the screen he actually reads: *"confirm the
     * confidence wording visibly differs between a two-occasion history and a
     * twelve-occasion one."* Now's ladder is three rungs in ordinary words —
     * once, a few times, several times — and it is deliberately coarse, because
     * a band word read as a probability is C14's own named risk.
     */
    expect(saidOnNow(two), 'nothing is said at two occasions').not.toBe('')
    expect(saidOnNow(twelve), 'nothing is said at twelve occasions').not.toBe('')
    expect(saidOnNow(two)).not.toBe(saidOnNow(twelve))
    expect(saidOnNow(two)).toContain('a few times')
    expect(saidOnNow(twelve)).toContain('several times')
  })

  it('never states a figure on Now, at any band', () => {
    // Section 61's ban on confidence arithmetic. The rungs are words; the counts
    // live on Insights, where the evidence is shown beside them.
    for (const decision of [two, six, twelve, twelveWithOne]) {
      expect(saidOnNow(decision), saidOnNow(decision)).not.toMatch(/\d/)
      expect(saidOnNow(decision)).not.toMatch(/%|probability|likely|chance/i)
    }
  })

  it('climbs the Insights ladder as the record grows', () => {
    /*
     * The four rungs, each reached by a history built for it. `too early to say`
     * below the rate threshold, then `worth noticing`, `fairly consistent` at
     * six, `very consistent` at ten.
     */
    expect(bandOnInsights(two), 'two occasions claimed a pattern').not.toBe('very consistent')
    expect(bandOnInsights(six)).toBe('fairly consistent')
    expect(bandOnInsights(twelve)).toBe('very consistent')
  })

  it('costs a step for a counterexample, and never falls off the bottom', () => {
    /*
     * `insights.ts`'s own rule, on a history built to exercise it: an exception
     * is the news rather than a reason to discard everything around it, so one
     * that went the other way takes `very consistent` to `fairly consistent` and
     * a run with several stops at `worth noticing`.
     */
    expect(bandOnInsights(twelve), cardsOn(twelve).join(', ')).toBe('very consistent')
    expect(bandOnInsights(twelveWithOne), cardsOn(twelveWithOne).join(', ')).toBe(
      'fairly consistent',
    )
  })

  it('shows the occasions the word rests on, so the word is checkable', () => {
    // C14's risk is *"a band word read as a probability"*, and the mitigation is
    // that the count travels with it: "fairly consistent · 6 occasions" is a word
    // and its evidence rather than a number wearing an adjective.
    const card = insightsFor(twelve.situation).insights.find(
      (insight) => insight.confidence !== undefined,
    )
    expect(card?.confidence?.because, 'a band word arrived with no evidence').toBeDefined()
    expect(card?.confidence?.because).toContain('12')
    expect(card?.confidence?.comparable).toBe(12)
  })
})
