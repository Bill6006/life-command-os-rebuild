import { describe, expect, it } from 'vitest'
import { createRecordFactory } from '../../src/domain/build'
import {
  CONCEPT,
  coreConcepts,
  createConceptRegistry,
  CORE_CONCEPTS,
  DEFAULT_SOURCE_RELIABILITY,
  type ConceptDefinition,
} from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { entityRef } from '../../src/domain/entities'
import { sequentialRecordIds, type RecordId } from '../../src/domain/ids'
import { isUsable } from '../../src/domain/knowledge'
import {
  evidenceSourceOf,
  PROVENANCE_SOURCES,
  type CanonicalRecord,
  type ProvenanceSource,
} from '../../src/domain/records'
import { timeZone, type Instant } from '../../src/domain/time'
import { assembleSituation } from '../../src/intelligence/situation'
import { deriveOutcomes, DERIVED_SLEEP_PROVENANCE } from '../../src/intelligence/derived'
import { evidenceMix } from '../../src/intelligence/learning'
import { MOVE_PROFILES, profileFor } from '../../src/intelligence/moves'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView, type MemoryView } from '../../src/memory/view'
import { createKit, type ScenarioKit } from '../../src/synthetic/kit'
import { evening, pastEpisodeRecords, type PastEpisode } from './harness'

/**
 * Inferred and derived evidence — the owner's four conditions.
 *
 * Section 8 prefers evidence normal life already produces over asking for it,
 * and the clearest case was deferred to this phase: the morning after an early
 * night, the sleep reading the guide already collects **is** the answer to "how
 * much did that do for your sleep?", and asking is asking twice.
 *
 * Writing outcome records the owner never typed is a real change in what the
 * app is allowed to do, and he set four conditions before any of it shipped.
 * Each has a `describe` below, quoting the condition it holds. Two of them the
 * gate names specifically: reliability must be read per concept rather than per
 * source, and inferred evidence must never be readable as explicit.
 */

const ZONE = timeZone('America/Denver')
const WINDING_DOWN = entityRef('routine', 'winding down')
const SLEEP_SUBJECT = entityRef('life-domain', 'sleep')
const A_WALK = entityRef('routine', 'a walk')

const LAST_NIGHT = '2026-05-18'
const THIS_MORNING = '2026-05-19'

interface NightInput {
  /** How the episode ended. Only `completed` may produce derived evidence. */
  readonly ending?: PastEpisode['ending']
  /** Hours in the morning reading. Omitted means no reading at all. */
  readonly hours?: number
  readonly method?: 'self-report' | 'device'
  /** When the reading is about, if not the morning after. */
  readonly readingOn?: string
  readonly readingAt?: string
  /** An effect answer the owner already gave. */
  readonly answered?: PastEpisode['effect']
  readonly at?: string
  readonly extra?: (kit: ScenarioKit, nextId: () => RecordId) => readonly CanonicalRecord[]
}

interface Night {
  readonly view: MemoryView
  readonly now: Instant
  readonly kit: ScenarioKit
}

/**
 * One early night, and whatever the next morning did or did not record.
 *
 * Built through the same parser a pasted file uses and the same episode writer
 * the running app uses, so nothing here can pass on a path real data would
 * never take (section 60).
 */
function night(input: NightInput = {}): Night {
  const kit = createKit('IE', 'America/Denver', '2026-04-01T12:00:00Z')
  const nextId = sequentialRecordIds('IEX')
  const now = kit.local(THIS_MORNING, '09:00')

  const episode: PastEpisode = {
    verb: 'protect-sleep',
    object: WINDING_DOWN,
    subject: SLEEP_SUBJECT,
    domain: DOMAIN.sleep,
    on: LAST_NIGHT,
    at: input.at ?? '21:30',
    context: evening({ strain: 'moderate' }),
    ending: input.ending ?? 'completed',
    ...(input.answered === undefined ? {} : { effect: input.answered }),
  }

  const reading =
    input.hours === undefined
      ? []
      : [
          kit.record(
            'observation',
            {
              occurredAt: kit.local(input.readingOn ?? THIS_MORNING, input.readingAt ?? '07:00'),
              domains: [DOMAIN.sleep],
            },
            {
              concept: CONCEPT.sleepHours,
              value: { type: 'number', value: input.hours, unit: 'hours' },
              method: input.method ?? 'self-report',
            },
          ),
        ]

  const document = kit.document({
    entities: [],
    records: [
      ...pastEpisodeRecords(kit, [episode], nextId),
      ...reading,
      ...(input.extra?.(kit, nextId) ?? []),
    ],
    exportedAt: now,
  })

  const loaded = snapshotFromWire(document)
  expect(loaded.loaded, 'the history should load').toBe(true)
  return { view: buildView(loaded.snapshot, { now, zone: ZONE }), now, kit }
}

function derivedFor(input: NightInput = {}) {
  const built = night(input)
  return { ...built, derived: deriveOutcomes(built.view, { now: built.now, zone: ZONE }) }
}

/** The history with its derived outcomes folded back in, as the app does. */
function afterDeriving(input: NightInput = {}): MemoryView {
  const { view, now, derived } = derivedFor(input)
  return buildView(
    { ...view.snapshot, records: [...view.snapshot.records, ...derived.map((one) => one.record)] },
    { now, zone: ZONE },
  )
}

// ---------------------------------------------------------------------------

describe('requirement 1 — reliability depends on the source AND the concept', () => {
  /*
   * > There is no standing hierarchy in which an explicit owner report always
   * > outweighs a derived, device or model one.
   *
   * The sharpest form of this is a pair of concepts where the same two sources
   * rank in opposite orders. No table keyed on the source alone can produce
   * both, whatever numbers it holds — which is exactly why the flat 0.6 had to
   * go.
   */
  it('ranks a watch above the owner for hours slept, and below him for how he feels', () => {
    expect(coreConcepts.reliabilityFor(CONCEPT.sleepHours, 'device')).toBeGreaterThan(
      coreConcepts.reliabilityFor(CONCEPT.sleepHours, 'owner'),
    )
    expect(coreConcepts.reliabilityFor(CONCEPT.energy, 'owner')).toBeGreaterThan(
      coreConcepts.reliabilityFor(CONCEPT.energy, 'device'),
    )
  })

  it('ranks a financial record above the owner’s estimate of a balance', () => {
    expect(coreConcepts.reliabilityFor(CONCEPT.cashBuffer, 'device')).toBeGreaterThan(
      coreConcepts.reliabilityFor(CONCEPT.cashBuffer, 'owner'),
    )
  })

  it('keeps a model’s guess at how he feels below him saying how he feels', () => {
    for (const concept of [CONCEPT.energy, CONCEPT.soreness, CONCEPT.emotionalState]) {
      expect(coreConcepts.reliabilityFor(concept, 'model')).toBeLessThan(
        coreConcepts.reliabilityFor(concept, 'owner'),
      )
    }
  })

  /**
   * The behavioural half, and the regression the gate names.
   *
   * Two readings of the same thing at the same instant, disagreeing. One pair
   * is about hours slept and the other about energy; the sources are identical
   * and the winners are opposite. Reintroduce a source-only ranking and one of
   * these two must fail.
   */
  it('settles a same-instant disagreement differently for two concepts', () => {
    const contest = (
      concept: typeof CONCEPT.sleepHours,
      domain: typeof DOMAIN.sleep,
    ): number | undefined => {
      const kit = createKit('IEC', 'America/Denver', '2026-04-01T12:00:00Z')
      const at = kit.local(THIS_MORNING, '07:00')
      const now = kit.local(THIS_MORNING, '09:00')
      const make = (value: number, method: 'self-report' | 'device') =>
        kit.record(
          'observation',
          { occurredAt: at, domains: [domain] },
          { concept, value: { type: 'number', value, unit: 'hours' }, method },
        )

      const loaded = snapshotFromWire(
        kit.document({
          entities: [],
          records: [make(5, 'self-report'), make(8, 'device')],
          exportedAt: now,
        }),
      )
      expect(loaded.loaded).toBe(true)
      const knowledge = buildView(loaded.snapshot, { now, zone: ZONE }).facts.knowledgeFor(concept)
      if (!isUsable(knowledge)) return undefined
      return knowledge.value.type === 'number' ? knowledge.value.value : undefined
    }

    // The watch measured a duration, so it wins.
    expect(contest(CONCEPT.sleepHours, DOMAIN.sleep)).toBe(8)
    // He is the instrument for this one, so he wins — same two sources.
    expect(contest(CONCEPT.energy, DOMAIN.health)).toBe(5)
  })

  it('leaves a genuine draw unresolved rather than picking one', () => {
    const kit = createKit('IED', 'America/Denver', '2026-04-01T12:00:00Z')
    const at = kit.local(THIS_MORNING, '07:00')
    const now = kit.local(THIS_MORNING, '09:00')
    const make = (value: number) =>
      kit.record(
        'observation',
        { occurredAt: at, domains: [DOMAIN.sleep] },
        {
          concept: CONCEPT.sleepHours,
          value: { type: 'number', value, unit: 'hours' },
          method: 'self-report',
        },
      )
    const loaded = snapshotFromWire(
      kit.document({ entities: [], records: [make(5), make(8)], exportedAt: now }),
    )
    const knowledge = buildView(loaded.snapshot, { now, zone: ZONE }).facts.knowledgeFor(
      CONCEPT.sleepHours,
    )
    expect(knowledge.state).toBe('unknown')
    expect(knowledge.state === 'unknown' ? knowledge.reason : '').toBe('contradicted')
  })

  it('gives every source a default so an unargued concept still resolves', () => {
    for (const source of PROVENANCE_SOURCES) {
      const worth = DEFAULT_SOURCE_RELIABILITY[source]
      expect(worth, source).toBeGreaterThan(0)
      expect(worth, source).toBeLessThanOrEqual(1)
    }
  })

  it('holds every concept’s own numbers inside the same range', () => {
    for (const definition of CORE_CONCEPTS) {
      for (const [source, worth] of Object.entries(definition.reliability ?? {})) {
        expect(worth, `${definition.id} / ${source}`).toBeGreaterThan(0)
        expect(worth, `${definition.id} / ${source}`).toBeLessThanOrEqual(1)
      }
    }
  })

  /**
   * The learning half — the same term, in the weight.
   *
   * A derived outcome about sleep and a derived outcome about how the owner
   * feels are the same source and are not the same evidence, and the pull each
   * exerts says so.
   */
  it('pulls a belief further for a derived sleep reading than a derived energy one', () => {
    const pullFor = (verb: 'protect-sleep' | 'move', prefix: string): number => {
      const kit = createKit(prefix, 'America/Denver', '2026-04-01T12:00:00Z')
      const nextId = sequentialRecordIds(`${prefix}X`)
      const now = kit.local(THIS_MORNING, '20:00')
      const object = verb === 'protect-sleep' ? WINDING_DOWN : A_WALK
      const domain = verb === 'protect-sleep' ? DOMAIN.sleep : DOMAIN.health

      const records = pastEpisodeRecords(
        kit,
        [
          {
            verb,
            object,
            subject: object,
            domain,
            on: LAST_NIGHT,
            at: '19:30',
            context: evening(),
            ending: 'completed',
          },
        ],
        nextId,
      )

      // The same derived answer, hand-written so the only difference between the
      // two runs is which concept the move measures.
      const build = createRecordFactory({ zone: ZONE, provenance: DERIVED_SLEEP_PROVENANCE })
      const about = records[0]?.id
      expect(about).toBeDefined()
      const outcome = build(
        'outcome',
        {
          occurredAt: kit.local(THIS_MORNING, '07:00'),
          id: nextId(),
          domains: [domain],
          entities: [object],
        },
        {
          about: about as RecordId,
          aspect: 'effect',
          observation: { type: 'scale', value: 3, of: 3 },
          sentiment: 'better',
        },
      )

      const loaded = snapshotFromWire(
        kit.document({ entities: [], records: [...records, outcome], exportedAt: now }),
      )
      expect(loaded.loaded).toBe(true)
      const view = buildView(loaded.snapshot, { now, zone: ZONE })
      const situation = assembleSituation(view, {
        now,
        zone: ZONE,
        weekStartsOn: 1,
      })
      return situation.learning.effectFor(verb, evening()).pull
    }

    const sleep = pullFor('protect-sleep', 'IES')
    const walk = pullFor('move', 'IEM')
    expect(sleep).toBeGreaterThan(0)
    expect(walk).toBeGreaterThan(0)
    expect(sleep).toBeGreaterThan(walk)
  })

  it('names a concept for every move that produces an outcome', () => {
    for (const [verb, profile] of Object.entries(MOVE_PROFILES)) {
      if (profile.aspects.length === 0) continue
      // Not every move maps onto a registry concept, and pretending otherwise
      // would be worse than the default. What must not happen is a move
      // *claiming* a concept that does not exist.
      if (profile.measures === undefined) continue
      expect(
        coreConcepts.get(profile.measures),
        `${verb} measures an unregistered concept`,
      ).toBeDefined()
    }
  })
})

describe('requirement 1 — an inference may never read as an explicit fact', () => {
  /*
   * > Derived, inferred or model evidence must NEVER silently masquerade as
   * > explicit fact — a high-reliability inference is still an inference.
   *
   * This is the half that does not vary with reliability, so it is tested at
   * the top of the range: a concept where a derived reading is worth *one*,
   * more than the owner's own, and still resolves to `inferred`.
   */
  it('resolves a derived reading as inferred even at full reliability', () => {
    const perfect: ConceptDefinition[] = CORE_CONCEPTS.map((definition) =>
      definition.id === CONCEPT.sleepHours
        ? { ...definition, reliability: { derived: 1, owner: 0.5 } }
        : definition,
    )
    const registry = createConceptRegistry(perfect)

    const kit = createKit('IEP', 'America/Denver', '2026-04-01T12:00:00Z')
    const now = kit.local(THIS_MORNING, '09:00')
    const record = kit.record(
      'observation',
      { occurredAt: kit.local(THIS_MORNING, '07:00'), domains: [DOMAIN.sleep] },
      {
        concept: CONCEPT.sleepHours,
        value: { type: 'number', value: 8, unit: 'hours' },
        method: 'derived',
      },
    )
    const loaded = snapshotFromWire(
      kit.document({ entities: [], records: [record], exportedAt: now }),
    )
    const knowledge = buildView(loaded.snapshot, {
      now,
      zone: ZONE,
      concepts: registry,
    }).facts.knowledgeFor(CONCEPT.sleepHours)

    expect(knowledge.state).toBe('inferred')
    expect(knowledge.state === 'inferred' ? knowledge.confidence : 0).toBe(1)
  })

  it('leaves a device reading standing as explicit, which it always was', () => {
    const kit = createKit('IEV', 'America/Denver', '2026-04-01T12:00:00Z')
    const now = kit.local(THIS_MORNING, '09:00')
    const record = kit.record(
      'observation',
      { occurredAt: kit.local(THIS_MORNING, '07:00'), domains: [DOMAIN.sleep] },
      {
        concept: CONCEPT.sleepHours,
        value: { type: 'number', value: 8, unit: 'hours' },
        method: 'device',
      },
    )
    const loaded = snapshotFromWire(
      kit.document({ entities: [], records: [record], exportedAt: now }),
    )
    expect(
      buildView(loaded.snapshot, { now, zone: ZONE }).facts.knowledgeFor(CONCEPT.sleepHours).state,
    ).toBe('explicit')
  })

  it('writes a derived outcome with derived provenance and never the owner’s', () => {
    const { derived } = derivedFor({ hours: 8 })
    expect(derived).toHaveLength(1)
    const record = derived[0]?.record
    expect(record?.provenance.source).toBe('derived')
    expect(evidenceSourceOf(record as CanonicalRecord)).toBe('derived')
    expect(record?.provenance.writtenBy).toBe('sleep-outcome')
  })

  it('reports it as not the owner’s wherever a belief rests on it', () => {
    const view = afterDeriving({ hours: 8 })
    const situation = assembleSituation(view, {
      now: view.facts.at,
      zone: ZONE,
      weekStartsOn: 1,
    })
    const learned = situation.learning.effectFor('protect-sleep', evening({ strain: 'moderate' }))

    expect(learned.samples).toBe(1)
    expect(learned.evidence).toHaveLength(1)
    expect(learned.evidence[0]?.fromOwner).toBe(false)
    expect(learned.evidence[0]?.source).toBe('derived')
  })
})

describe('requirement 2 — a learning trace says where its evidence came from', () => {
  it('counts what the owner said apart from what was worked out', () => {
    const view = afterDeriving({ hours: 8 })
    const situation = assembleSituation(view, { now: view.facts.at, zone: ZONE, weekStartsOn: 1 })
    const learned = situation.learning.effectFor('protect-sleep', evening({ strain: 'moderate' }))

    expect(evidenceMix(learned.evidence)).toEqual({ stated: 0, concluded: 1 })
  })

  it('never marks a concluded piece of evidence as something the owner said', () => {
    const view = afterDeriving({ hours: 8 })
    const situation = assembleSituation(view, { now: view.facts.at, zone: ZONE, weekStartsOn: 1 })

    for (const verb of Object.keys(MOVE_PROFILES)) {
      const learned = situation.learning.effectFor(
        verb as keyof typeof MOVE_PROFILES,
        evening({ strain: 'moderate' }),
      )
      for (const ref of learned.evidence) {
        expect(ref.fromOwner, `${verb} evidence ${ref.record}`).toBe(ref.source === 'owner')
      }
    }
  })

  it('carries the reliability that was actually applied', () => {
    const view = afterDeriving({ hours: 8 })
    const situation = assembleSituation(view, { now: view.facts.at, zone: ZONE, weekStartsOn: 1 })
    const learned = situation.learning.effectFor('protect-sleep', evening({ strain: 'moderate' }))

    expect(learned.evidence[0]?.reliability).toBe(
      coreConcepts.reliabilityFor(CONCEPT.sleepHours, 'derived'),
    )
  })
})

describe('requirement 3 — one outcome shape, one learner', () => {
  /*
   * > The read path in learning.ts asks four things of a record and never once
   * > looks at provenance, so a derived record is already legible.
   *
   * The check that matters is not that the code compiles: it is that a history
   * whose *only* evidence is derived still teaches the app something. If
   * anything anywhere filtered on provenance, this would come back at zero.
   */
  it('learns from a derived outcome through the same path as a tapped one', () => {
    const view = afterDeriving({ hours: 8 })
    const situation = assembleSituation(view, { now: view.facts.at, zone: ZONE, weekStartsOn: 1 })
    const learned = situation.learning.effectFor('protect-sleep', evening({ strain: 'moderate' }))

    expect(learned.samples).toBe(1)
    expect(learned.pull).toBeGreaterThan(0)
    expect(learned.moved).toBe('tomorrow')
  })

  it('writes the ordinary outcome record and no new kind', () => {
    const { derived } = derivedFor({ hours: 8 })
    const record = derived[0]?.record
    expect(record?.kind).toBe('outcome')
    expect(record?.aspect).toBe('effect')
    expect(record?.observation).toEqual({ type: 'scale', value: 3, of: 3 })
    expect(Object.keys(record ?? {}).sort()).toEqual(
      [
        'about',
        'aspect',
        'domains',
        'entities',
        'id',
        'kind',
        'observation',
        'occurredAt',
        'privacy',
        'provenance',
        'recordedAt',
        'schemaVersion',
        'sentiment',
        'zone',
      ].sort(),
    )
  })

  it('asks nothing more once the answer has been worked out', () => {
    const view = afterDeriving({ hours: 8 })
    const situation = assembleSituation(view, { now: view.facts.at, zone: ZONE, weekStartsOn: 1 })
    const episode = situation.learning.episodes.find(
      (one) => one.semantics.target.verb === 'protect-sleep',
    )
    expect(episode?.outcomes).toHaveLength(1)
    expect(episode?.outcomes[0]?.aspect).toBe('effect')
  })

  it('leaves an answer the owner already gave exactly alone', () => {
    const { derived } = derivedFor({ hours: 8, answered: 'little' })
    expect(derived).toHaveLength(0)
  })
})

describe('requirement 4 — inference closes a loop and never opens one', () => {
  /*
   * > Do not infer that an action occurred merely because a later result
   * > exists. A wind-down that was started and never marked done, followed by
   * > eight hours of sleep, produces no evidence — the app does not know he did
   * > it.
   */
  it('derives nothing from a move that was started and never finished', () => {
    expect(derivedFor({ ending: 'started', hours: 8 }).derived).toHaveLength(0)
  })

  it('derives nothing from a move that was only ever shown', () => {
    expect(derivedFor({ ending: 'shown', hours: 8 }).derived).toHaveLength(0)
  })

  it('derives nothing from a move that was declined', () => {
    expect(derivedFor({ ending: 'declined', hours: 8 }).derived).toHaveLength(0)
  })

  it('derives nothing from a move he could not do', () => {
    expect(derivedFor({ ending: 'unable-now', hours: 8 }).derived).toHaveLength(0)
  })

  it('derives from the same night once he says he did it', () => {
    expect(derivedFor({ ending: 'completed', hours: 8 }).derived).toHaveLength(1)
  })

  it('writes outcomes and nothing else — never a start or a completion', () => {
    const { derived } = derivedFor({ hours: 8 })
    for (const one of derived) expect(one.record.kind).toBe('outcome')
  })
})

describe('the morning reading has to belong to that morning', () => {
  it('ignores a reading from the evening before', () => {
    expect(
      derivedFor({ hours: 8, readingOn: LAST_NIGHT, readingAt: '22:00' }).derived,
    ).toHaveLength(0)
  })

  it('ignores a reading from two mornings later', () => {
    expect(
      derivedFor({ hours: 8, readingOn: '2026-05-20', readingAt: '07:00' }).derived,
    ).toHaveLength(0)
  })

  it('derives nothing at all when no reading was taken', () => {
    expect(derivedFor({}).derived).toHaveLength(0)
  })
})

describe('what a night is worth, and what it may never be worth', () => {
  const steps = (hours: number): number => {
    const found = derivedFor({ hours }).derived[0]
    expect(found, `${hours} hours produced nothing`).toBeDefined()
    const observation = found?.record.observation
    return observation?.type === 'scale' ? observation.value : -1
  }

  it('reads a full night as a real difference', () => {
    expect(steps(8)).toBe(3)
    expect(steps(7.5)).toBe(3)
  })

  it('reads a nearly-full night as some difference', () => {
    expect(steps(7)).toBe(2)
    expect(steps(6.5)).toBe(2)
  })

  it('reads a short night as not much', () => {
    expect(steps(6)).toBe(1)
    expect(steps(4)).toBe(1)
  })

  /**
   * The rule that matters most, and the one an eager matcher would break.
   *
   * Harm is a claim about causation. A short night after a wind-down is a short
   * night; concluding the wind-down **backfired** from a number is exactly the
   * assertion-from-ignorance D-038 forbids, and only the owner can make it.
   */
  it('never concludes that a move backfired, at any number of hours', () => {
    for (let hours = 0; hours <= 12; hours += 0.5) {
      const found = derivedFor({ hours }).derived[0]
      const observation = found?.record.observation
      const step = observation?.type === 'scale' ? observation.value : -1
      expect(step, `${hours} hours`).toBeGreaterThan(0)
      expect(found?.record.sentiment, `${hours} hours`).not.toBe('worse')
    }
  })

  it('only ever produces an effect, never a result or a comfort answer', () => {
    for (let hours = 0; hours <= 12; hours += 1) {
      for (const one of derivedFor({ hours }).derived) expect(one.record.aspect).toBe('effect')
    }
  })
})

describe('deriving twice changes nothing', () => {
  it('produces a byte-identical record on a second pass', () => {
    const first = derivedFor({ hours: 8 }).derived[0]?.record
    const second = derivedFor({ hours: 8 }).derived[0]?.record
    expect(first).toEqual(second)
  })

  it('produces the same record whatever time it is worked out', () => {
    const built = night({ hours: 8 })
    const early = deriveOutcomes(built.view, { now: built.now, zone: ZONE })[0]?.record
    const later = deriveOutcomes(built.view, {
      now: (built.now + 40 * 3_600_000) as Instant,
      zone: ZONE,
    })[0]?.record
    expect(early).toEqual(later)
  })

  it('adds nothing on a second pass over a history that already has it', () => {
    const view = afterDeriving({ hours: 8 })
    expect(deriveOutcomes(view, { now: view.facts.at, zone: ZONE })).toHaveLength(0)
  })
})

/**
 * The scope of `deriveOutcomes`, kept deliberately — QA-A1, and read this
 * before widening it.
 *
 * Independent QA named these three assertions as tests that "pin the limitation
 * in place as intended behaviour", and warned that they "would fail if a
 * builder extended observe-first derivation to the walk". Both statements are
 * accurate. They are kept anyway, and the reasoning is the point.
 *
 * `deriveOutcomes` does not observe a relationship. It reads a sleep reading
 * and maps it onto the four-level **effect** scale against a fixed baseline —
 * eight hours becomes "a real difference" with no comparison to nights without
 * the wind-down. That is an attribution, made by the app instead of by the
 * owner, and D-064 acknowledges it only as a reliability discount. QA's own
 * question 9 says so: *"under the new principle the reading and the attribution
 * must be separate objects rather than one discounted number."*
 *
 * So the correct repair for QA-A1 was never to extend this to more verbs. That
 * would have produced more attributions, wearing the app's name instead of the
 * owner's, over more concepts. It was to stop *needing* the attribution:
 * `association.ts` compares readings before and after against a comparison
 * group and states no causal claim at all, and `MoveProfile.affects` is what
 * carries the pairing for it.
 *
 * The three sleep verbs keep this path because D-064's four owner conditions
 * still hold and because history must keep its meaning (D-089's fifth
 * consequence). What changed around them is that the effect *question* is no
 * longer asked for any verb declaring `affects` — which is all three of these —
 * so on a morning with no reading the window now closes with nothing collected
 * rather than falling back to asking him to grade it.
 *
 * These assertions therefore still describe correct behaviour. They stop being
 * correct the day somebody decides a fourth concept should be mapped onto the
 * effect scale, and on that day this comment is the argument to answer.
 */
describe('it only fires where the move profile says it can', () => {
  it('covers exactly the moves whose outcome is a morning reading of sleep', () => {
    const eligible = Object.entries(MOVE_PROFILES)
      .filter(
        ([, profile]) =>
          profile.measures === CONCEPT.sleepHours &&
          profile.outcome.when === 'next-morning' &&
          profile.aspects.includes('effect'),
      )
      .map(([verb]) => verb)
      .sort()

    expect(eligible).toEqual(['protect-sleep', 'recover', 'wind-down'])
  })

  it('is read off the profile, so a new restorative verb is covered by writing one', () => {
    // Not a list of verbs in `derived.ts` — the pairing is the profile's
    // `measures`, `outcome.when` and `aspects`, which is what makes a sixteenth
    // verb covered the moment somebody adds it.
    for (const verb of ['protect-sleep', 'recover', 'wind-down'] as const) {
      expect(profileFor(verb).measures).toBe(CONCEPT.sleepHours)
      expect(profileFor(verb).outcome.when).toBe('next-morning')
    }
  })

  it('is not the mechanism that learns a relationship, and says which is', () => {
    /*
     * The positive half of the caption above, asserted rather than trusted.
     * Every verb this derives an attribution for also declares an observable
     * dimension, so the observe-first path reaches them by the route that makes
     * no causal claim — and the one verb QA raised, the walk, is reached by
     * that route and by nothing else.
     */
    for (const verb of ['protect-sleep', 'recover', 'wind-down'] as const) {
      expect(profileFor(verb).affects).toBe(CONCEPT.sleepHours)
    }
    expect(profileFor('move').affects).toBe(CONCEPT.energy)
    expect(profileFor('move').outcome.when, 'and it is judged in the same block').toBe('same-block')
  })

  it('derives nothing about a move judged in the same block', () => {
    const built = night({ hours: 8, extra: () => [] })
    const derived = deriveOutcomes(built.view, { now: built.now, zone: ZONE })
    for (const one of derived) {
      expect(profileFor(one.episode.semantics.target.verb).outcome.when).toBe('next-morning')
    }
  })
})

describe('the reliability of a source is legible without reading code', () => {
  it('is reported per source on the concept it belongs to', () => {
    const sources: readonly ProvenanceSource[] = ['owner', 'device', 'derived', 'model']
    const table = sources.map((source) => coreConcepts.reliabilityFor(CONCEPT.sleepHours, source))
    // Every one of them is a real number in range; none is a placeholder.
    for (const worth of table) expect(worth).toBeGreaterThan(0)
    expect(new Set(table).size).toBe(sources.length)
  })
})
