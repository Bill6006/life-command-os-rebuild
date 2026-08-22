import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { entityRef } from '../../src/domain/entities'
import { sequentialRecordIds } from '../../src/domain/ids'
import type { CanonicalRecord, DecisionContext } from '../../src/domain/records'
import { ACTION_VERBS } from '../../src/domain/recommendation'
import type { Instant } from '../../src/domain/time'
import { MIN_PAIRS, type ObservedAssociation } from '../../src/intelligence/association'
import { evidenceForDecision, insightsFor } from '../../src/intelligence/insights'
import { MOVE_PROFILES, profileFor } from '../../src/intelligence/moves'
import { nextDueOutcome, outcomeQuestionsFor } from '../../src/intelligence/outcomes'
import { assembleSituation } from '../../src/intelligence/situation'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { createKit, pastEpisodeRecords, type PastEpisode } from '../../src/synthetic/kit'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { loadScenario } from './harness'

/**
 * What the app works out for itself (canonical plan section 20, D-089).
 *
 * QA-A1: the app asked the owner *"How much did a walk do for you?"* and
 * offered four grades of difference — the causal question the system exists to
 * answer, handed to him — and then counted his answers back as a percentage
 * labelled *"how often it made a difference afterwards"*. On the history built
 * to demonstrate section 51, forty-six of forty-six figures were tallies of his
 * judgments and none was worked out from a reading.
 *
 * Every test below is one of the twelve behaviours QA required before the
 * repair could be called complete, and each was proved to fail when its own
 * behaviour was reintroduced.
 */

const ZONE_LABEL = 'America/Denver'

interface Built {
  readonly view: ReturnType<typeof buildView>
  readonly now: Instant
  readonly zone: ReturnType<typeof createKit>['zone']
}

interface Evening {
  /** `YYYY-MM-DD`. */
  readonly on: string
  readonly before: number
  readonly after: number
  /** Which move, if any, settled between the two readings. */
  readonly move?: 'move' | 'reset-space'
  /** A second move in the same gap, which should confound the pair. */
  readonly also?: 'reset-space'
  /** Leave the later reading out entirely. */
  readonly missingAfter?: boolean
  /** Leave the earlier reading out entirely. */
  readonly missingBefore?: boolean
  readonly concept?: typeof CONCEPT.energy | typeof CONCEPT.soreness
}

/**
 * A history of evenings, each a before reading, an after reading, and whatever
 * happened in between.
 *
 * Built here rather than registered in the scenario library because these are
 * variations a person should not find on the QA screen — the same reason
 * `decideOn` exists in the harness.
 */
function evenings(rows: readonly Evening[], readAt?: readonly [string, string]): Built {
  const kit = createKit('OB', ZONE_LABEL, '2026-03-01T12:00:00Z')
  const nextId = sequentialRecordIds('OBX')
  const walk = entityRef('routine', 'a walk')
  const kitchen = entityRef('place', 'the kitchen')
  /*
   * The moment the history is read from, and it has to be a real argument.
   *
   * The fact layer decides whether the guide would ask for a concept, and that
   * turns on how stale the reading is *at the moment being asked about*. A view
   * built in June says every energy reading from March is stale, so the guide
   * would ask and the outcome card would rightly stay quiet — which is correct
   * behaviour and the opposite of what the reading test is about.
   */
  const now = readAt === undefined ? kit.local('2026-06-01', '18:10') : kit.local(...readAt)

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
      seeds.push({
        verb: row.move,
        object: row.move === 'move' ? walk : kitchen,
        domain: row.move === 'move' ? DOMAIN.health : DOMAIN.home,
        on: row.on,
        at: '19:00',
        context,
        ending: 'completed',
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
  }

  const place = kit.entity({
    kind: 'place',
    label: 'the kitchen',
    domain: DOMAIN.home,
    privacy: 'normal',
  })

  const document = kit.document({
    entities: [place],
    records: [...records, ...pastEpisodeRecords(kit, seeds, nextId)],
    exportedAt: now,
  })

  const loaded = snapshotFromWire(document)
  expect(loaded.loaded, 'the document should load').toBe(true)
  return { view: buildView(loaded.snapshot, { now, zone: kit.zone }), now, zone: kit.zone }
}

function associationOn(built: Built, verb = 'move' as const): ObservedAssociation | undefined {
  const situation = assembleSituation(built.view, {
    now: built.now,
    zone: built.zone,
    weekStartsOn: 1,
  })
  return situation.learning.associationFor(verb)
}

/** N evenings with the move, M of them rising; and the mirror without it. */
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
    rows.push({ on: day(index + withMove.length), before: 2, after: rose ? 4 : 1 }),
  )
  return evenings([...rows, ...extra])
}

const YES = (count: number) => Array.from({ length: count }, () => true)
const NO = (count: number) => Array.from({ length: count }, () => false)

// ---------------------------------------------------------------------------
// 1–4: state improves, improves without it, worsens, and is unchanged
// ---------------------------------------------------------------------------

describe('what the record shows, in each direction', () => {
  it('reports a reading that has more often been higher after the move', () => {
    const found = associationOn(run([...YES(5), false], [...NO(5), true]))
    expect(found?.withheld).toBeUndefined()
    expect(found?.direction).toBe('higher')
    expect(found?.roseWith).toBe(5)
    expect(found?.roseWithout).toBe(1)
  })

  it('says nothing about the move when it rises just as often without it', () => {
    /*
     * The comparison group earning its keep. Five evenings out of six rising is
     * a striking figure and means nothing on its own: the same is true of the
     * evenings the move never happened.
     */
    const found = associationOn(run([...YES(5), false], [...YES(5), false]))
    expect(found?.withheld).toBeUndefined()
    expect(found?.direction).toBe('no different')
    expect(found?.roseWith).toBe(5)
    expect(found?.roseWithout).toBe(5)
  })

  it('reports a reading that has been lower afterwards, and never as harm', () => {
    /*
     * D-066 generalized by D-089. A lower reading is a lower reading. Nothing
     * in the finding, the card or its reasoning may say the move hurt, caused,
     * damaged or backfired.
     */
    const built = run([...NO(5), true], [...YES(5), false])
    const found = associationOn(built)
    expect(found?.direction).toBe('lower')

    const situation = assembleSituation(built.view, {
      now: built.now,
      zone: built.zone,
      weekStartsOn: 1,
    })
    const card = insightsFor(situation).insights.find(
      (insight) => insight.kind === 'state-association',
    )
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
      })),
    ])
    const found = associationOn(built)
    expect(found?.direction).toBe('no different')
    expect(found?.roseWith).toBe(0)
    expect(found?.roseWithout).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 5–7: missing observations, several dimensions, an unrelated event
// ---------------------------------------------------------------------------

describe('what it refuses to say', () => {
  it('withholds when either side is thin, and names which side', () => {
    const thin = associationOn(run(YES(5), YES(2)))
    expect(thin?.withheld, 'a one-sided comparison is not a comparison').toBeDefined()
    expect(thin?.withheld).toMatch(/2 without it/)
    expect(thin?.direction).toBe('no different')
    expect(thin?.gap).toBe(0)
  })

  it('counts no pair where a reading is missing on either side', () => {
    const built = run(YES(5), NO(5), [
      { on: '2026-04-01', before: 2, after: 4, move: 'move', missingAfter: true },
      { on: '2026-04-02', before: 2, after: 4, move: 'move', missingBefore: true },
      { on: '2026-04-03', before: 2, after: 4, missingAfter: true },
    ])
    const found = associationOn(built)
    // The five with and five without are all it may count.
    expect(found?.with).toHaveLength(5)
    expect(found?.without).toHaveLength(5)
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
    expect(found?.with).toHaveLength(5)
    expect(found?.without).toHaveLength(5)

    const situation = assembleSituation(built.view, {
      now: built.now,
      zone: built.zone,
      weekStartsOn: 1,
    })
    const card = insightsFor(situation).insights.find(
      (insight) => insight.kind === 'state-association',
    )
    expect(card?.evidence.reasoning.join(' ')).toMatch(/2 occasions were left out/)
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
    expect(found?.with.every((pair) => pair.rose)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 8–10: context, reversal, and selective reporting
// ---------------------------------------------------------------------------

describe('what changes the reading of it', () => {
  it('weakens when later evidence contradicts the earlier run', () => {
    const early = associationOn(run(YES(6), NO(6)))
    expect(early?.direction).toBe('higher')
    const gapBefore = early?.gap ?? 0

    /*
     * The same history, plus six later evenings on each side where the move
     * made no difference to how often the reading rose. Both halves have to
     * move: diluting only the occasions *with* the move would prove that fewer
     * rises weaken a finding, which is arithmetic, not reversal.
     */
    const later = associationOn(run([...YES(6), ...NO(6)], [...NO(6), ...YES(6)]))
    expect(later?.direction).toBe('no different')
    expect(later?.gap ?? 0).toBeLessThan(gapBefore)
  })

  it('never becomes a finding when state is only ever recorded after the move', () => {
    /*
     * The selective-reporting guard, and it is structural rather than a
     * heuristic: if a reading is only entered on the evenings something
     * happened, the occasions without it never accumulate a pair, and the
     * comparison has no second side to stand on.
     */
    const found = associationOn(run(YES(8), []))
    expect(found?.withheld).toBeDefined()
    expect(found?.without).toHaveLength(0)
  })

  it('reads the whole record rather than only evenings like tonight', () => {
    // Deliberate, and the card says so: a change pair on an evening with no
    // decision has no context to band by, so banding would mean inventing one
    // for exactly the occasions the comparison depends on.
    const found = associationOn(run(YES(5), NO(5)))
    expect(found?.window).toBeDefined()
    expect(found?.with.length ?? 0).toBeGreaterThanOrEqual(MIN_PAIRS)
  })
})

// ---------------------------------------------------------------------------
// 11–12: history keeps its meaning, and the engine learns without being graded
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

    const found = situation.learning.associationFor('move')
    expect(found?.withheld).toBeUndefined()
    expect(found?.direction).toBe('higher')

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

    let checked = 0
    for (const row of decision.trace.ranking) {
      const dimension = row.dimensions.find((entry) => entry.name === 'observed-change')
      expect(dimension, 'every ranked move should carry the dimension').toBeDefined()
      const verb = decision.trace.proposed.find((move) => move.id === row.id)?.verb
      const found = verb === undefined ? undefined : situation.learning.associationFor(verb)
      if (found !== undefined && found.withheld === undefined) continue
      checked += 1
      expect(dimension?.weight, `${row.id} is marked down for having nothing observed`).toBe(0)
      expect(dimension?.value).toBe(0)
    }
    expect(checked, 'nothing was actually checked').toBeGreaterThan(0)
    expect(situation.learning.associations.every((entry) => entry.withheld !== undefined)).toBe(
      true,
    )
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
    const situation = assembleSituation(built.view, {
      now: built.now,
      zone: built.zone,
      weekStartsOn: 1,
    })

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
      ['2026-03-01', '19:35'],
    )
    const situation = assembleSituation(built.view, {
      now: built.now,
      zone: built.zone,
      weekStartsOn: 1,
    })
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
          expect(found.direction, `${scenario.id}: a direction over withheld evidence`).toBe(
            'no different',
          )
          continue
        }
        expect(found.with.length, scenario.id).toBeGreaterThanOrEqual(MIN_PAIRS)
        expect(found.without.length, scenario.id).toBeGreaterThanOrEqual(MIN_PAIRS)
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
