import { describe, expect, it } from 'vitest'
import { DOMAIN } from '../../src/domain/domains'
import { entityRef } from '../../src/domain/entities'
import { sequentialRecordIds } from '../../src/domain/ids'
import { timeZone } from '../../src/domain/time'
import { decide, type Decision } from '../../src/intelligence/engine'
import {
  GROWTH_OCCASIONS,
  growthAnswerRecord,
  growthSuggestions,
} from '../../src/intelligence/growth'
import { assembleSituation } from '../../src/intelligence/situation'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { createKit } from '../../src/synthetic/kit'
import { scenarioById } from '../../src/synthetic/scenarios'
import { loadScenario, orphanPronounsIn, pastEpisodeRecords, sentenceOf } from './harness'

/**
 * G-003 — Adaya growth evidence.
 *
 * > Input: a child growth skill has stale/limited evidence.
 * > Expected: the system can suggest a natural practice opportunity; outcome
 * > updates evidence; repeated evidence can produce a suggested growth-status
 * > update; no stage jump from one event.
 *
 * Four claims, and the fourth is the one with teeth. Section 9 states it
 * separately from the rest — "meaningful growth-stage changes should not be
 * silently invented from one event" — so the counterexamples below run the same
 * history with one occasion and with two, and both must produce nothing.
 */

const ZONE = timeZone('America/Denver')
const ORDERING = entityRef('development-skill', 'ordering her own food')
const ADAYA = entityRef('person', 'Adaya')

const scenario = loadScenario('growth-evidence')
const decision = scenario.decision()

function situationOf(view = scenario.view()) {
  return assembleSituation(view, {
    now: scenario.scenario.now,
    zone: ZONE,
    weekStartsOn: 1,
  })
}

// ---------------------------------------------------------------------------

describe('G-003 — a natural practice opportunity can be suggested', () => {
  it('proposes practising the growth area she is actually working on', () => {
    const proposed = decision.trace.proposed.filter((move) => move.verb === 'growth-opportunity')
    expect(proposed).toHaveLength(1)
    expect(proposed[0]?.subject).toBe('ordering her own food')
    expect(proposed[0]?.domain).toBe(DOMAIN.fatherhood)
  })

  it('names her and the skill, never a pronoun standing in for either', () => {
    const rendered = decision.trace.ranking.find((row) => row.id.includes('growth-opportunity'))
    expect(rendered).toBeDefined()
    expect(orphanPronounsIn(rendered?.sentence ?? '')).toEqual([])
    expect(rendered?.sentence.toLowerCase()).toContain('ordering her own food')
  })

  it('says the reason is that the evidence has aged, once a fortnight has passed', () => {
    // The last occasion was 2026-06-20 and the scenario stands on 2026-07-11.
    const proposed = decision.trace.proposed.find((move) => move.verb === 'growth-opportunity')
    expect(proposed?.because).toContain('for a while')
  })

  it('calls it an open opportunity instead when she practised it this week', () => {
    const recent = decideWithOccasions(['2026-07-04', '2026-07-08', '2026-07-10'], 'all')
    const proposed = recent.trace.proposed.find((move) => move.verb === 'growth-opportunity')
    expect(proposed?.because).not.toContain('for a while')
  })
})

describe('G-003 — the outcome updates the evidence', () => {
  it('holds three answered occasions, all of them finished', () => {
    const episodes = decision.trace.episodes.filter((episode) =>
      episode.sentence.toLowerCase().includes('ordering her own food'),
    )
    expect(episodes).toHaveLength(3)
    for (const episode of episodes) {
      expect(episode.state).toBe('completed')
      expect(episode.outcome).toContain('answer')
    }
  })

  it('reads them as results rather than as how the evening felt', () => {
    const situation = situationOf()
    const learned = situation.learning.resultFor('growth-opportunity', situation.context)
    expect(learned.samples).toBe(3)
    // Every one went all the way, so the belief sits at its prior and the
    // dimension says nothing — D-055's penalty-only rule, seen from the good
    // side. Evidence being present is not the same as evidence speaking.
    expect(learned.reached).toBe(1)
  })
})

describe('G-003 — repeated evidence proposes a growth-status update', () => {
  it('offers one, and names her and the skill in it', () => {
    expect(decision.growth).toHaveLength(1)
    const suggestion = decision.growth[0]
    expect(suggestion?.headline).toContain('Adaya')
    expect(suggestion?.headline).toContain('ordering her own food')
    expect(suggestion?.occasions).toBe(3)
  })

  it('points at the skill and at the person it belongs to', () => {
    const suggestion = decision.growth[0]
    expect(suggestion?.skill.id).toBe(ORDERING.id)
    expect(suggestion?.person?.id).toBe(ADAYA.id)
  })

  it('cites the occasions it was drawn from', () => {
    expect(decision.growth[0]?.evidence).toHaveLength(3)
  })

  it('does not put the suggestion in place of the recommendation', () => {
    // It sits beside the decision. The evening still gets a move, and the
    // suggestion is not one — section 6 gives Now one primary move.
    expect(decision.kind).toBe('move')
    expect(sentenceOf(decision)).toBeDefined()
  })
})

describe('G-003 — no stage jump from one event', () => {
  it('proposes nothing from a single good occasion', () => {
    expect(decideWithOccasions(['2026-07-04'], 'all').growth).toHaveLength(0)
  })

  it('proposes nothing from two', () => {
    expect(decideWithOccasions(['2026-06-27', '2026-07-04'], 'all').growth).toHaveLength(0)
  })

  it('needs the third before it will say anything', () => {
    expect(
      decideWithOccasions(['2026-06-20', '2026-06-27', '2026-07-04'], 'all').growth,
    ).toHaveLength(1)
  })

  it('is the same threshold learning uses, rather than a second number', () => {
    expect(GROWTH_OCCASIONS).toBe(3)
  })

  it('proposes nothing when the occasions only went part of the way', () => {
    expect(
      decideWithOccasions(['2026-06-20', '2026-06-27', '2026-07-04'], 'part').growth,
    ).toHaveLength(0)
  })

  it('proposes nothing from three occasions that were never finished', () => {
    expect(
      decideWithOccasions(['2026-06-20', '2026-06-27', '2026-07-04'], 'all', 'started').growth,
    ).toHaveLength(0)
  })
})

describe('G-003 — the owner has the last word, and it is recorded', () => {
  it('stops suggesting once he has agreed', () => {
    const suggestion = decision.growth[0]
    expect(suggestion).toBeDefined()
    const answer = growthAnswerRecord(
      suggestion!,
      true,
      { now: scenario.scenario.now, zone: ZONE },
      sequentialRecordIds('ANS')(),
    )
    const after = buildView(
      { ...scenario.snapshot, records: [...scenario.snapshot.records, answer] },
      { now: scenario.scenario.now, zone: ZONE },
    )
    expect(growthSuggestions(situationOf(after))).toHaveLength(0)
  })

  it('stops suggesting when he says not yet, and records that he was asked', () => {
    const suggestion = decision.growth[0]
    const answer = growthAnswerRecord(
      suggestion!,
      false,
      { now: scenario.scenario.now, zone: ZONE },
      sequentialRecordIds('ANS')(),
    )
    expect(answer.kind).toBe('coverage-update')
    const after = buildView(
      { ...scenario.snapshot, records: [...scenario.snapshot.records, answer] },
      { now: scenario.scenario.now, zone: ZONE },
    )
    expect(growthSuggestions(situationOf(after))).toHaveLength(0)
  })

  it('writes what changed rather than a flag, when he agrees', () => {
    const answer = growthAnswerRecord(
      decision.growth[0]!,
      true,
      { now: scenario.scenario.now, zone: ZONE },
      sequentialRecordIds('ANS')(),
    )
    expect(answer.kind).toBe('domain-update')
    expect(answer.kind === 'domain-update' ? answer.summary : '').toContain('ordering her own food')
  })

  it('counts either answer as evidence about that area', () => {
    const answer = growthAnswerRecord(
      decision.growth[0]!,
      false,
      { now: scenario.scenario.now, zone: ZONE },
      sequentialRecordIds('ANS')(),
    )
    const after = buildView(
      { ...scenario.snapshot, records: [...scenario.snapshot.records, answer] },
      { now: scenario.scenario.now, zone: ZONE },
    )
    const coverage = situationOf(after).coverage.get(DOMAIN.fatherhood)
    expect(coverage?.daysSinceEvidence).toBe(0)
  })
})

describe('G-003 — the scenario the owner is handed is a life he recognises', () => {
  it('carries the custody arrangement, as his own does', () => {
    // D-041. A fixture that leaves out something the owner actually has makes
    // correct behaviour look broken, and costs more than the reverse.
    const situation = situationOf()
    expect(situation.childPresent.state).toBe('explicit')
  })

  it('never asks whether his daughter is with him', () => {
    const entry = scenario.view().facts.get(situationOf().concepts.all()[0]!.id)
    expect(entry).toBeDefined()
    const childEntry = scenario
      .view()
      .facts.entries.find((row) => row.definition.domain === DOMAIN.fatherhood)
    expect(childEntry?.worthAsking).toBe(false)
  })

  it('is on the QA screen for the owner to open', () => {
    expect(scenarioById('growth-evidence')).toBeDefined()
  })
})

// ---------------------------------------------------------------------------

/**
 * The same Saturday, with a different number of occasions behind it.
 *
 * Everything else is held still — same child, same arrangement, same sleep,
 * same evening — so whatever changes between two of these is doing the work.
 */
function decideWithOccasions(
  days: readonly string[],
  result: 'all' | 'part',
  ending: 'completed' | 'started' = 'completed',
): Decision {
  const kit = createKit('GV', 'America/Denver', '2026-06-01T12:00:00Z')
  const nextId = sequentialRecordIds('GVX')
  const now = kit.local('2026-07-11', '17:00')

  const child = kit.entity({
    kind: 'person',
    label: 'Adaya',
    domain: DOMAIN.fatherhood,
    privacy: 'child-family-sensitive',
  })
  const skill = kit.entity({
    kind: 'development-skill',
    label: 'ordering her own food',
    domain: DOMAIN.fatherhood,
    privacy: 'child-family-sensitive',
    links: [{ relation: 'about-person', target: ADAYA.id }],
  })

  const present = kit.record(
    'context',
    {
      occurredAt: kit.local('2026-01-01', '09:00'),
      domains: [DOMAIN.fatherhood],
      entities: [ADAYA],
    },
    {
      concept: 'family.child-present' as never,
      value: { type: 'boolean', value: true },
      durability: 'durable',
      validFrom: kit.local('2026-01-01', '09:00'),
    },
  )

  const anAfternoon = {
    block: 'afternoon' as const,
    weekend: true,
    strain: 'none' as const,
    childPresent: true,
    usableMinutes: 120,
  }

  const past = pastEpisodeRecords(
    kit,
    days.map((on) => ({
      verb: 'growth-opportunity' as const,
      object: entityRef('development-skill', 'ordering her own food'),
      subject: entityRef('development-skill', 'ordering her own food'),
      domain: DOMAIN.fatherhood,
      on,
      at: '12:30',
      context: anAfternoon,
      ending,
      ...(ending === 'completed' ? { result } : {}),
    })),
    nextId,
  )

  const loaded = snapshotFromWire(
    kit.document({ entities: [child, skill], records: [present, ...past], exportedAt: now }),
  )
  expect(loaded.loaded, 'the variant should load').toBe(true)
  return decide(buildView(loaded.snapshot, { now, zone: ZONE }), { now, zone: ZONE })
}
