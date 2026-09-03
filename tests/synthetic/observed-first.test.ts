import { describe, expect, it } from 'vitest'
import { CONCEPT, coreConcepts, reliabilityOf } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { entityId, sequentialRecordIds } from '../../src/domain/ids'
import type { CanonicalRecord } from '../../src/domain/records'
import { evidenceSourceOf } from '../../src/domain/records'
import {
  deriveOutcomes,
  deriveReadingOutcomes,
  DERIVED_READING_PROVENANCE,
  DERIVED_SLEEP_PROVENANCE,
} from '../../src/intelligence/derived'
import { MOVE_PROFILES, profileFor } from '../../src/intelligence/moves'
import { buildView } from '../../src/memory/view'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { createKit, pastEpisodeRecords, type PastEpisode } from '../../src/synthetic/kit'
import { decide } from '../../src/intelligence/engine'
import { evening, loadScenario } from './harness'

/**
 * AUD-0042 — the observe-first path reached three verbs of fifteen.
 *
 * ## The finding
 *
 * `derived.ts` closes an outcome loop from a reading the owner already gave
 * rather than asking him to grade something, and it was gated on
 * `outcome.when === 'next-morning'`. That condition was doing two jobs: *"this
 * outcome is judged in the morning"* and *"this outcome can be observed rather
 * than asked"* became one condition, and they are not the same.
 *
 * So for twelve verbs of fifteen the `effect` belief could only be built from
 * answers the owner tapped, which is the opposite of D-089 — **his own decision
 * that the system performs the causal inference**. The audit's worked example is
 * a history with fourteen observed pairs where Insights says *"current energy
 * has more often been higher after a walk than without one"* while the walk's
 * learned `Worth tonight` reads 0.50 → 0.50 with *"Comparable results: none"*.
 *
 * ## The four things the audit asks be asserted
 *
 * 1. a walk followed by an energy reading in the same block produces a derived
 *    `effect` outcome, **and the belief moves**;
 * 2. the derived record is distinguishable from an owner answer on every
 *    surface that shows evidence mix;
 * 3. D-064's four sleep conditions are untouched;
 * 4. and the third of those is proved on a history that actually reaches them —
 *    which is DEF-0167, and is the reason this file builds one.
 */

// ---------------------------------------------------------------------------
// 1 — the walk, and the belief that could not move
// ---------------------------------------------------------------------------

describe('a reading taken after a move closes its loop — AUD-0042', () => {
  const scenario = 'observed-evenings'

  function derivedOn() {
    const loaded = loadScenario(scenario)
    const moment = { now: loaded.scenario.now, zone: loaded.scenario.zone }
    return deriveReadingOutcomes(loaded.viewAt(moment.now, moment.zone), moment, coreConcepts)
  }

  /**
   * What the app believes about walking, with and without the derived rows.
   *
   * `loadScenario` reads a document; the running app appends what the history
   * implies before it decides (`MemoryProvider`, D-015). This does the same, so
   * the comparison is between two states the product actually reaches rather
   * than between the product and a function.
   */
  function walkBelief(withDerived: boolean) {
    const loaded = loadScenario(scenario)
    const moment = { now: loaded.scenario.now, zone: loaded.scenario.zone }
    const snapshot = withDerived
      ? {
          ...loaded.snapshot,
          records: [
            ...loaded.snapshot.records,
            ...deriveReadingOutcomes(
              loaded.viewAt(moment.now, moment.zone),
              moment,
              coreConcepts,
            ).map((entry) => entry.record),
          ],
        }
      : loaded.snapshot
    const view = buildView(snapshot, moment)
    return decide(view, moment, { probe: false }).trace.learning.find((row) => row.verb === 'move')
  }

  it('derives an effect for the walks the history already observed', () => {
    /*
     * The audit's own scenario, built to prove the observed path works — and the
     * one where the per-verb belief learned nothing from it.
     */
    const derived = derivedOn()
    expect(derived.length, 'fourteen observed pairs and nothing derived').toBeGreaterThan(5)
    for (const entry of derived) {
      expect(entry.record.kind).toBe('outcome')
      expect(entry.record.aspect).toBe('effect')
      expect(entry.episode.semantics.target.verb).toBe('move')
    }
  })

  it('moves the belief the audit found stuck at its prior', () => {
    /*
     * The half that matters. A derived record nothing reads would be the
     * inert-declaration defect one layer down, so this compares the learning
     * index **with the derived rows appended and without them** — which is what
     * the running app does through `MemoryProvider`, and is the difference the
     * audit measured: fourteen observed pairs, and a per-verb belief that had
     * learned nothing from any of them.
     */
    const before = walkBelief(false)
    const after = walkBelief(true)

    expect(before, 'no walk was ranked on the history built to observe walks').toBeDefined()
    expect(before?.samples, 'the walk already had comparable results').toBe(0)
    expect(after?.samples, 'the derived rows taught the walk nothing').toBeGreaterThan(0)
    expect(after?.evidence.length ?? 0).toBeGreaterThan(0)
    // And the belief itself moved off the prior it was stuck on.
    expect(after?.landedAt.now, 'the belief is where it was').not.toBe(before?.landedAt.now)
  })

  it('never concludes that a move backfired', () => {
    /*
     * The same rule the sleep matcher keeps, and for the same reason: the effect
     * scale has four levels and this matcher can produce three. A low reading
     * after a walk is a low reading; it is not evidence that the walk **made
     * things worse**, which is a claim about causation only the owner can make
     * (D-038).
     */
    for (const entry of derivedOn()) {
      const observation = entry.record.observation
      expect(observation.type).toBe('scale')
      if (observation.type !== 'scale') continue
      expect(observation.value, 'a derived reading concluded harm').toBeGreaterThan(0)
    }
  })

  it('produces the identical row twice, so re-running it is a no-op', () => {
    // D-015, and the property the whole append path rests on.
    const first = JSON.stringify(derivedOn().map((entry) => entry.record))
    const second = JSON.stringify(derivedOn().map((entry) => entry.record))
    expect(second).toBe(first)
  })

  it('reads it off a reading taken after the move and never before it', () => {
    for (const entry of derivedOn()) {
      const settled = entry.episode.settledAt
      expect(settled, 'derived from an episode that never settled').toBeDefined()
      expect(entry.record.occurredAt, 'a before was read as an after').toBeGreaterThan(settled!)
    }
  })
})

// ---------------------------------------------------------------------------
// 2 — telling a derived answer from a tapped one
// ---------------------------------------------------------------------------

describe('a derived answer stays legible as one — D-014, D-067', () => {
  it('says where it came from, on the record itself', () => {
    const loaded = loadScenario('observed-evenings')
    const moment = { now: loaded.scenario.now, zone: loaded.scenario.zone }
    const derived = deriveReadingOutcomes(
      loaded.viewAt(moment.now, moment.zone),
      moment,
      coreConcepts,
    )

    for (const entry of derived) {
      expect(evidenceSourceOf(entry.record)).toBe('derived')
      expect(entry.record.provenance.writtenBy).toBe('reading-outcome')
      expect(entry.record.provenance.note).toContain('rather than asked for')
    }
  })

  it('keeps the two derivations apart, so a reader can tell which is which', () => {
    // Two derived paths with one `writtenBy` would be one paragraph in the
    // evidence panel standing for two different assumptions.
    expect(DERIVED_SLEEP_PROVENANCE.writtenBy).not.toBe(DERIVED_READING_PROVENANCE.writtenBy)
    expect(DERIVED_SLEEP_PROVENANCE.source).toBe('derived')
    expect(DERIVED_READING_PROVENANCE.source).toBe('derived')
  })

  it('counts as derived rather than as his own, in the evidence mix', () => {
    const loaded = loadScenario('observed-evenings')
    const moment = { now: loaded.scenario.now, zone: loaded.scenario.zone }
    const derived = deriveReadingOutcomes(
      loaded.viewAt(moment.now, moment.zone),
      moment,
      coreConcepts,
    ).map((entry) => entry.record)
    const view = buildView(
      { ...loaded.snapshot, records: [...loaded.snapshot.records, ...derived] },
      moment,
    )
    const walking = decide(view, moment, { probe: false }).trace.learning.find(
      (row) => row.verb === 'move',
    )

    expect(walking?.evidence.length ?? 0).toBeGreaterThan(0)
    let fromDerivation = 0
    for (const piece of walking?.evidence ?? []) {
      if (piece.source !== 'derived') continue
      fromDerivation += 1
      expect(piece.fromOwner, 'a derived row was counted as something he said').toBe(false)
    }
    expect(fromDerivation, 'no derived evidence reached the belief').toBeGreaterThan(0)
    expect(walking?.evidenceMix, 'the mix says nothing about where it came from').toBeDefined()
    expect(walking?.evidenceMix).toMatch(/worked out|derived/i)
  })

  it('is worth less than a derived reading of a night’s sleep — D-059', () => {
    /*
     * The audit's real risk, and where the answer to it already lived.
     * *"A same-block reading is closer in time to the move and therefore more
     * likely to be confounded by it — he may report higher energy because he just
     * did the thing, which is mood rather than effect."*
     *
     * Reliability is a property of **a source and a concept together**, so no
     * second mechanism was needed: the registry already says a derived reading of
     * sleep hours is worth 0.8 and a derived reading of current energy is worth
     * 0.4, in as many words — *"the same source is worth half as much"*.
     */
    const sleep = reliabilityOf(coreConcepts.definitionFor(CONCEPT.sleepHours), 'derived')
    const energy = reliabilityOf(coreConcepts.definitionFor(CONCEPT.energy), 'derived')
    const social = reliabilityOf(coreConcepts.definitionFor(CONCEPT.socialEnergy), 'derived')

    expect(energy, 'a derived energy reading outweighs a derived night').toBeLessThan(sleep)
    expect(social).toBeLessThan(sleep)
    // And neither outweighs the owner's own answer, whatever the concept.
    expect(energy).toBeLessThan(reliabilityOf(coreConcepts.definitionFor(CONCEPT.energy), 'owner'))
  })
})

// ---------------------------------------------------------------------------
// 3 — which verbs it reaches, and which it deliberately does not
// ---------------------------------------------------------------------------

describe('three verbs of fifteen became seven — AUD-0042', () => {
  /** Whether the same-block derivation could ever fire for this verb. */
  function reachable(verb: keyof typeof MOVE_PROFILES): boolean {
    const profile = profileFor(verb)
    if (profile.measures === undefined) return false
    if (profile.measures === CONCEPT.sleepHours) return false
    if (!profile.aspects.includes('effect')) return false
    return coreConcepts.definitionFor(profile.measures).tracked === 'scale'
  }

  it('reaches the three the scale can honestly be read on', () => {
    /*
     * **The audit's own list is not quite right, and the difference is here
     * rather than absorbed quietly.** It names `move`, `reset-space`,
     * `reach-out` and `start-conversation`. What is actually reachable is
     * `move`, `ease-off` and `lighten-the-day` — so the observe-first path goes
     * from three verbs of fifteen to **six**, not to seven.
     *
     * The three the audit names and this does not reach are named in their own
     * test below, with the reason for each.
     */
    const reached = (Object.keys(MOVE_PROFILES) as (keyof typeof MOVE_PROFILES)[]).filter(reachable)
    expect([...reached].sort()).toEqual(['ease-off', 'lighten-the-day', 'move'])
  })

  it('leaves the morning three exactly where they were', () => {
    // The other half of the count. Three verbs reached the observe-first path
    // before this phase and the same three reach the morning one now.
    const morning = (Object.keys(MOVE_PROFILES) as (keyof typeof MOVE_PROFILES)[]).filter(
      (verb) => {
        const profile = profileFor(verb)
        return (
          profile.measures === CONCEPT.sleepHours &&
          profile.outcome.when === 'next-morning' &&
          profile.aspects.includes('effect')
        )
      },
    )
    expect([...morning].sort()).toEqual(['protect-sleep', 'recover', 'wind-down'])
  })

  it('does not reach a quantity with no top to read it against', () => {
    /*
     * The bound the audit's own list does not carry, and it is the honest one.
     * An absolute level only means something on a scale that carries its own
     * top: *"three of five"* is a third of the way up, and *"£400"* is not
     * anything of the way up anything.
     *
     * So the audit lists `reset-space` (home friction) as reached and it is not:
     * home friction is free text. `handle-money-item` measures a cash balance and
     * is not reached either. Named rather than left implicit, because a reader
     * comparing the audit's list to this one deserves to find the difference
     * written down.
     */
    expect(reachable('reset-space'), 'home friction has no scale').toBe(false)
    expect(reachable('handle-money-item'), 'a cash balance has no top').toBe(false)
    expect(reachable('recall-practice'), 'a learning topic is an entity').toBe(false)
    /*
     * And the two the audit names that are out for a different reason again:
     * both measure social energy, which **is** a scale, and neither produces an
     * `effect` at all. `reach-out` and `start-conversation` answer `result` and
     * `comfort` — did it happen, and how did it feel — so there is no belief
     * here for a reading to close, and giving them one would be adding a
     * question rather than removing one.
     */
    expect(profileFor('reach-out').aspects).not.toContain('effect')
    expect(profileFor('start-conversation').aspects).not.toContain('effect')
    expect(reachable('reach-out')).toBe(false)
    expect(reachable('start-conversation')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 4 — D-064's four conditions, proved on a history that reaches them
// ---------------------------------------------------------------------------

const WINDING_DOWN = { kind: 'routine', id: entityId('routine', 'winding down') } as const

/**
 * An early night, and the morning that judges it — DEF-0167.
 *
 * **No history in the shipped library reaches the sleep derivation at any hour**,
 * so `reach-horizon.test.ts`'s pinned digest was hashing an empty list for the
 * half of it that carries §5.1's claim. This is the history that reaches it, and
 * it exists so that *"D-064's four conditions produce byte-identical output"*
 * is a statement about rows rather than about spelling.
 */
function anEarlyNight(options: { readonly hours?: number; readonly completed?: boolean } = {}) {
  const kit = createKit('OBF', 'Europe/London', '2026-01-01T00:00:00Z')
  const nextId = sequentialRecordIds('OBFE')
  const records: CanonicalRecord[] = []

  const routine = kit.entity({
    id: WINDING_DOWN.id,
    kind: 'routine',
    label: 'winding down',
    domain: DOMAIN.sleep,
    privacy: 'normal',
  })

  const episode: PastEpisode = {
    verb: 'wind-down',
    object: WINDING_DOWN,
    domain: DOMAIN.sleep,
    on: '2026-03-02',
    at: '22:00',
    context: evening({ dayOfWeek: 1 }),
    ending: options.completed === false ? 'started' : 'completed',
  }
  records.push(...pastEpisodeRecords(kit, [episode], nextId))

  // The morning that judges it, inside the window `outcomeWindowFor` opens.
  records.push(
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-03-03', '07:00'), domains: [DOMAIN.sleep] },
      {
        concept: CONCEPT.sleepHours,
        value: { type: 'number', value: options.hours ?? 8, unit: 'hours' },
        method: 'self-report',
      },
    ),
  )

  const now = kit.local('2026-03-03', '09:00')
  const loaded = snapshotFromWire(kit.document({ entities: [routine], records, exportedAt: now }))
  expect(loaded.loaded, 'the early night should load').toBe(true)
  if (!loaded.loaded) throw new Error('unreachable')
  const moment = { now, zone: kit.zone }
  return { view: buildView(loaded.snapshot, moment), moment }
}

describe('D-064’s four conditions still fire, on a history that reaches them — DEF-0167', () => {
  it('derives a morning outcome from a completed early night', () => {
    const { view, moment } = anEarlyNight({ hours: 8 })
    const derived = deriveOutcomes(view, moment)
    expect(derived.length, 'the sleep derivation reaches nothing even here').toBe(1)
    expect(derived[0]?.record.aspect).toBe('effect')
    expect(evidenceSourceOf(derived[0]!.record)).toBe('derived')
    expect(derived[0]?.record.provenance.writtenBy).toBe('sleep-outcome')
    expect(derived[0]?.because).toContain('8 hours of sleep the next morning')
  })

  it('reads the night as the level it was, against the working baseline', () => {
    // The three steps the matcher can produce, and the fourth it may not.
    for (const [hours, step] of [
      [8, 3],
      [7, 2],
      [4, 1],
    ] as const) {
      const { view, moment } = anEarlyNight({ hours })
      const observation = deriveOutcomes(view, moment)[0]?.record.observation
      expect(observation?.type).toBe('scale')
      if (observation?.type !== 'scale') continue
      expect(observation.value, `${hours} hours`).toBe(step)
      expect(observation.value, 'a short night was read as harm').toBeGreaterThan(0)
    }
  })

  it('never opens a loop, only closes one', () => {
    /*
     * D-064's first condition, and the one that is a claim about the owner
     * rather than about a window. A wind-down that was started and never marked
     * done, followed by eight hours of sleep, produces nothing at all: **the app
     * does not know he did it**, and a later result is not evidence that an
     * earlier action occurred.
     */
    const { view, moment } = anEarlyNight({ hours: 8, completed: false })
    expect(deriveOutcomes(view, moment)).toEqual([])
  })

  it('leaves the same-block sibling out of it entirely', () => {
    // The two paths are disjoint by construction — one wants `next-morning` and
    // the other wants `same-block` — and this is where that stops being a
    // reading of the source.
    const { view, moment } = anEarlyNight({ hours: 8 })
    expect(deriveReadingOutcomes(view, moment, coreConcepts)).toEqual([])
  })
})
