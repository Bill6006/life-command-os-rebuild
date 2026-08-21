import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN, type LifeDomainId } from '../../src/domain/domains'
import { entityRef } from '../../src/domain/entities'
import { valueIfUsable } from '../../src/domain/knowledge'
import type { FactValue, GoalRecord } from '../../src/domain/records'
import { addLocalDays, type Instant } from '../../src/domain/time'
import type { ConceptId } from '../../src/domain/windows'
import {
  contextCorrectionRecord,
  coverageInterpretationRecord,
  domainStatusCorrectionRecord,
  factCorrectionRecord,
  goalCorrectionRecord,
} from '../../src/intelligence/corrections'
import { assembleSituation } from '../../src/intelligence/situation'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { createKit } from '../../src/synthetic/kit'

/**
 * Section 62's other six correction kinds, and the Phase 5 gate's own claim
 * about them: "a correction made on a domain page demonstrably changes later
 * reasoning." Each block below builds the smallest history where the claim
 * being corrected is actually load-bearing, appends the correction, and reads
 * the same situation back at the same moment — proving the change rather than
 * asserting that the record merely exists.
 *
 * `beliefCorrectionRecord` (inferred patterns, learned preference) already has
 * coverage from Phase 3/4's outcome-learning suites; this file is the other
 * six from section 62's list.
 */

const kit = createKit('dc', 'America/Denver', '2026-01-01T00:00:00Z')
const NOW = kit.local('2026-07-14', '19:00')

function situationAt(records: Parameters<typeof kit.document>[0]['records'], at: Instant = NOW) {
  const loaded = snapshotFromWire(kit.document({ records, entities: [], exportedAt: at }))
  expect(loaded.loaded, 'the document should load').toBe(true)
  const view = buildView(loaded.snapshot, { now: at, zone: kit.zone })
  return assembleSituation(view, { now: at, zone: kit.zone, weekStartsOn: 1 })
}

describe('facts — the corrected value is what the app reads next', () => {
  it('replaces a stale learning topic and clears the neglect it caused', () => {
    const goal = entityRef('goal', 'pass the CCNA')
    const oldTopic = entityRef('learning-topic', 'subnetting')
    const newTopic = entityRef('learning-topic', 'VLANs')

    const before = [
      kit.record(
        'goal',
        {
          occurredAt: kit.local('2026-05-02', '09:00'),
          domains: [DOMAIN.career],
          entities: [goal],
        },
        { goal, statement: 'Pass the CCNA', status: 'active' },
      ),
      kit.record(
        'observation',
        {
          occurredAt: kit.local('2026-05-26', '20:00'),
          domains: [DOMAIN.career],
          entities: [oldTopic],
        },
        {
          concept: CONCEPT.learningTopic,
          value: { type: 'entity', value: oldTopic },
          method: 'self-report',
        },
      ),
    ]

    const priorSituation = situationAt(before)
    const career = priorSituation.coverage.get(DOMAIN.career)
    expect(career?.status).toBe('stale')
    const topicRow = career?.concepts.find((entry) => entry.concept === CONCEPT.learningTopic)
    expect(topicRow?.neglected).toBe(true)

    const correction = factCorrectionRecord(
      CONCEPT.learningTopic,
      { type: 'entity', value: newTopic },
      { now: NOW, zone: kit.zone },
    )
    const after = situationAt([...before, correction])

    expect(valueIfUsable(after.learningTopic)).toEqual({ type: 'entity', value: newTopic })
    const careerAfter = after.coverage.get(DOMAIN.career)
    expect(careerAfter?.status).toBe('current')
    const topicRowAfter = careerAfter?.concepts.find(
      (entry) => entry.concept === CONCEPT.learningTopic,
    )
    expect(topicRowAfter?.neglected).toBe(false)
  })
})

describe('direction — a weekly focus is corrected the same way a fact is', () => {
  it('replaces an uncategorised direction with one the registry recognises', () => {
    // A minute apart, deliberately: a correction is written later than the
    // fact it replaces, and two records claiming the same instant are a
    // contradiction rather than a correction (D-059) — the same reason
    // `NowScreen` always gives an answer its own `recordedAt`.
    const correctedAt = (NOW + 60_000) as Instant
    const before = [
      kit.record(
        'observation',
        { occurredAt: NOW, domains: [DOMAIN.direction] },
        {
          concept: CONCEPT.weeklyFocus,
          value: { type: 'text', value: 'get sorted' },
          method: 'self-report',
        },
      ),
    ]

    const priorSituation = situationAt(before)
    expect(priorSituation.direction.weekly.state).toBe('uncategorised')

    const correction = factCorrectionRecord(
      CONCEPT.weeklyFocus,
      { type: 'text', value: 'home' },
      { now: correctedAt, zone: kit.zone },
    )
    const after = situationAt([...before, correction], correctedAt)

    expect(after.direction.weekly.state).toBe('set')
    expect(after.direction.weekly.state === 'set' && after.direction.weekly.category).toBe(
      DOMAIN.home,
    )
  })
})

describe('context — a situational correction wins while it lasts, and only then', () => {
  it('overrides a durable arrangement for a window without erasing it', () => {
    const durable = kit.record(
      'context',
      { occurredAt: kit.local('2025-01-10', '09:00'), domains: [DOMAIN.fatherhood] },
      {
        concept: CONCEPT.childPresent,
        value: { type: 'boolean', value: true },
        durability: 'durable',
        validFrom: kit.local('2025-01-10', '09:00'),
      },
    )

    const validUntil = addLocalDays(NOW, 3, kit.zone)
    const correction = contextCorrectionRecord(
      {
        concept: CONCEPT.childPresent,
        value: { type: 'boolean', value: false },
        durability: 'situational',
        validUntil,
      },
      { now: NOW, zone: kit.zone },
    )

    const during = situationAt([durable, correction], NOW)
    // `situation.childPresent` is narrowed to a plain boolean (`narrowKnowledge`
    // in situation.ts), not the wrapped `FactValue` the record carries.
    expect(valueIfUsable(during.childPresent)).toBe(false)

    const after = situationAt([durable, correction], addLocalDays(NOW, 5, kit.zone))
    expect(valueIfUsable(after.childPresent)).toBe(true)
  })
})

describe('goals — a correction supersedes the record it replaces', () => {
  it('takes an achieved goal out of the active list without editing history', () => {
    const goal = entityRef('goal', 'pass the CCNA')
    const record = kit.record(
      'goal',
      { occurredAt: kit.local('2026-05-02', '09:00'), domains: [DOMAIN.career], entities: [goal] },
      { goal, statement: 'Pass the CCNA', status: 'active' },
    ) as GoalRecord

    const before = situationAt([record])
    expect(before.direction.goals.some((entry) => entry.goal.id === goal.id)).toBe(true)

    const correction = goalCorrectionRecord(
      { previous: record, statement: 'Pass the CCNA', status: 'achieved' },
      { now: NOW, zone: kit.zone },
    )
    const after = situationAt([record, correction])

    expect(after.direction.goals.some((entry) => entry.goal.id === goal.id)).toBe(false)
    // The original statement is still there, exactly as written — only displaced.
    expect(after.view.history.effective.some((entry) => entry.id === record.id)).toBe(false)
    expect(after.view.history.all.some((entry) => entry.id === record.id)).toBe(true)
  })
})

/*
 * Coverage interpretation and domain status — QA-B2.
 *
 * Both write a non-concept-bearing record (`coverage-update` / `domain-update`)
 * that `evidenceByDomain` folds into `heardAt` and `meaningful` — real
 * evidence that the domain, as a whole, has just been looked at. Neither
 * carries a `concept` to resolve against, so neither can move
 * `ConceptCoverage.neglected`, which is computed per standing concept from
 * that concept's own `knowledge.observedAt` (`coverage.ts`, `assembleCoverage`).
 *
 * The two blocks below are deliberately in tension, and both are correct:
 *
 * - On a domain with **no** standing concept (Social, Emotional — the only
 *   two in the starting registry), staleness can only ever come from
 *   `goneQuiet`, which these corrections do clear. `status` genuinely
 *   becomes `current`.
 * - On a domain **with** a standing concept that is itself neglected (seven
 *   of the other eight — Sleep, Career, Money, Home, Private, Direction,
 *   Faith; Fatherhood's only standing concept, the custody arrangement, is
 *   durable and can never be neglected at all, D-061), `status` correctly
 *   **stays** `stale` and `coverage.weakest` correctly **stays** defined,
 *   because the app genuinely does not know whether the specific fact these
 *   corrections say nothing about is still true. Manufacturing `current`
 *   here would be inventing freshness for a reading nobody reported.
 *
 * `tests/synthetic/domain-corrections.test.ts` (this file) is the test
 * DEF-0028-era coverage from the same suite gave false confidence on: its
 * two fixtures were both built on Social/Emotional, the only two domains
 * where the second case above is structurally unreachable, so nothing here
 * ever exercised it.
 */
describe('coverage interpretation — the owner reviewing an area is evidence about it', () => {
  it('turns a stale, silent area current without a new fact to report — no standing concept in the way', () => {
    const stated = kit.record(
      'preference',
      {
        occurredAt: addLocalDays(NOW, -40, kit.zone),
        domains: [DOMAIN.social],
      },
      { about: entityRef('person', 'placeholder'), stance: 'prefers', statement: 'small groups' },
    )

    const before = situationAt([stated])
    expect(before.coverage.get(DOMAIN.social)?.status).toBe('stale')
    // Social has no standing concept at all, so nothing here *can* be neglected.
    expect(before.coverage.get(DOMAIN.social)?.weakest).toBeUndefined()

    const correction = coverageInterpretationRecord(DOMAIN.social, 'moderate', {
      now: NOW,
      zone: kit.zone,
    })
    const after = situationAt([stated, correction])

    expect(after.coverage.get(DOMAIN.social)?.status).toBe('current')
  })

  it('does not manufacture freshness for a neglected standing concept it says nothing about', () => {
    const homeFriction = kit.record(
      'observation',
      { occurredAt: addLocalDays(NOW, -25, kit.zone), domains: [DOMAIN.home] },
      {
        concept: CONCEPT.homeFriction,
        value: { type: 'text', value: 'kitchen counter' },
        method: 'self-report',
      },
    )
    const matters = kit.record(
      'preference',
      { occurredAt: addLocalDays(NOW, -25, kit.zone), domains: [DOMAIN.home] },
      { about: entityRef('place', 'the kitchen'), stance: 'prefers', statement: 'a clear counter' },
    )

    const before = situationAt([homeFriction, matters])
    const homeBefore = before.coverage.get(DOMAIN.home)
    expect(homeBefore?.status).toBe('stale')
    expect(homeBefore?.weakest?.concept).toBe(CONCEPT.homeFriction)

    const correction = coverageInterpretationRecord(DOMAIN.home, 'moderate', {
      now: NOW,
      zone: kit.zone,
    })
    const after = situationAt([homeFriction, matters, correction])
    const homeAfter = after.coverage.get(DOMAIN.home)

    // The write is real evidence and is read: "heard from" resets to today.
    expect(homeAfter?.daysSinceHeard).toBe(0)
    // But the specific overdue fact is untouched, so the honest answer is
    // still stale, with the same concept still named as the cause.
    expect(homeAfter?.status).toBe('stale')
    expect(homeAfter?.weakest?.concept).toBe(CONCEPT.homeFriction)
    expect(homeAfter?.weakest?.neglected).toBe(true)
  })
})

describe('domain status — a corrected summary is meaningful evidence too', () => {
  it('turns a stale, silent area current with the owner’s own sentence — no standing concept in the way', () => {
    const stated = kit.record(
      'preference',
      { occurredAt: addLocalDays(NOW, -40, kit.zone), domains: [DOMAIN.emotional] },
      { about: entityRef('person', 'placeholder'), stance: 'prefers', statement: 'journalling' },
    )

    const before = situationAt([stated])
    expect(before.coverage.get(DOMAIN.emotional)?.status).toBe('stale')
    expect(before.coverage.get(DOMAIN.emotional)?.weakest).toBeUndefined()

    const correction = domainStatusCorrectionRecord(
      DOMAIN.emotional,
      'Feeling steadier since starting therapy in June.',
      { now: NOW, zone: kit.zone },
    )
    const after = situationAt([stated, correction])

    const emotional = after.coverage.get(DOMAIN.emotional)
    expect(emotional?.status).toBe('current')
  })

  it('does not manufacture freshness for a neglected standing concept it says nothing about', () => {
    const homeFriction = kit.record(
      'observation',
      { occurredAt: addLocalDays(NOW, -25, kit.zone), domains: [DOMAIN.home] },
      {
        concept: CONCEPT.homeFriction,
        value: { type: 'text', value: 'kitchen counter' },
        method: 'self-report',
      },
    )
    const matters = kit.record(
      'preference',
      { occurredAt: addLocalDays(NOW, -25, kit.zone), domains: [DOMAIN.home] },
      { about: entityRef('place', 'the kitchen'), stance: 'prefers', statement: 'a clear counter' },
    )

    const before = situationAt([homeFriction, matters])
    expect(before.coverage.get(DOMAIN.home)?.weakest?.concept).toBe(CONCEPT.homeFriction)

    const correction = domainStatusCorrectionRecord(
      DOMAIN.home,
      'Cleared the table and put the mail away.',
      { now: NOW, zone: kit.zone },
    )
    const after = situationAt([homeFriction, matters, correction])
    const homeAfter = after.coverage.get(DOMAIN.home)

    expect(homeAfter?.daysSinceHeard).toBe(0)
    expect(homeAfter?.status).toBe('stale')
    expect(homeAfter?.weakest?.concept).toBe(CONCEPT.homeFriction)
  })
})

/**
 * The same invariant, swept across every domain it actually applies to —
 * not only Home. Fatherhood is deliberately excluded: its only standing
 * concept, the custody arrangement, is durable and D-061 already makes a
 * durable concept un-neglectable, so it cannot reach this case at all.
 */
describe('coverage interpretation and domain status — swept across every domain with a neglectable standing concept', () => {
  const cases: readonly {
    readonly domain: LifeDomainId
    readonly concept: ConceptId
    readonly value: FactValue
  }[] = [
    {
      domain: DOMAIN.sleep,
      concept: CONCEPT.sleepHours,
      value: { type: 'number', value: 7, unit: 'hours' },
    },
    {
      domain: DOMAIN.career,
      concept: CONCEPT.learningTopic,
      value: { type: 'entity', value: entityRef('learning-topic', 'subnetting') },
    },
    {
      domain: DOMAIN.money,
      concept: CONCEPT.cashBuffer,
      value: { type: 'text', value: 'about three months' },
    },
    {
      domain: DOMAIN.home,
      concept: CONCEPT.homeFriction,
      value: { type: 'text', value: 'kitchen counter' },
    },
    {
      domain: DOMAIN.privateHealth,
      concept: CONCEPT.privatePattern,
      value: { type: 'text', value: 'late scrolling' },
    },
    {
      domain: DOMAIN.direction,
      concept: CONCEPT.weeklyFocus,
      value: { type: 'text', value: 'career' },
    },
    {
      domain: DOMAIN.faith,
      concept: CONCEPT.faithPractice,
      value: { type: 'text', value: 'quiet time' },
    },
  ]

  for (const { domain, concept, value } of cases) {
    it(`${domain}: neither correction moves the neglected reading of ${concept}`, () => {
      const reading = kit.record(
        'observation',
        // 100 days safely exceeds every concept's own neglect threshold in
        // this sweep — cashBuffer's is the largest, at 90 days (localDays(30)
        // freshness × NEGLECT_MULTIPLE 3).
        { occurredAt: addLocalDays(NOW, -100, kit.zone), domains: [domain] },
        { concept, value, method: 'self-report' },
      )
      const matters = kit.record(
        'preference',
        // 100 days safely exceeds every concept's own neglect threshold in
        // this sweep — cashBuffer's is the largest, at 90 days (localDays(30)
        // freshness × NEGLECT_MULTIPLE 3).
        { occurredAt: addLocalDays(NOW, -100, kit.zone), domains: [domain] },
        { about: entityRef('place', 'placeholder'), stance: 'prefers', statement: 'placeholder' },
      )

      const before = situationAt([reading, matters])
      const beforeCoverage = before.coverage.get(domain)
      expect(beforeCoverage?.status, domain).toBe('stale')
      expect(beforeCoverage?.weakest?.concept, domain).toBe(concept)

      const reviewed = coverageInterpretationRecord(domain, 'moderate', {
        now: NOW,
        zone: kit.zone,
      })
      const statusRecord = domainStatusCorrectionRecord(domain, 'Reviewed it.', {
        now: (NOW + 60_000) as Instant,
        zone: kit.zone,
      })

      for (const correction of [reviewed, statusRecord]) {
        const after = situationAt([reading, matters, correction])
        const afterCoverage = after.coverage.get(domain)
        expect(afterCoverage?.status, `${domain} after ${correction.kind}`).toBe('stale')
        expect(afterCoverage?.weakest?.concept, `${domain} after ${correction.kind}`).toBe(concept)
      }
    })
  }
})
