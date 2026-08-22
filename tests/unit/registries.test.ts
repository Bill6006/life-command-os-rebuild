import { describe, expect, it } from 'vitest'
import {
  entityId,
  entityIdKind,
  isEntityId,
  isRecordId,
  newRecordId,
  slugify,
} from '../../src/domain/ids'
import {
  CORE_LIFE_DOMAINS,
  coreDomains,
  createDomainRegistry,
  DOMAIN,
} from '../../src/domain/domains'
import {
  CONCEPT,
  coreConcepts,
  createConceptRegistry,
  type TrackedReading,
} from '../../src/domain/concepts'
import { entityRef } from '../../src/domain/entities'
import type { FactValue } from '../../src/domain/records'
import { numericValue } from '../../src/intelligence/association'
import {
  DISCREET_PRIMARY,
  FULL_EXPORT,
  isPrivacyClass,
  mayShowDetail,
  mostSensitive,
  PRIVACY_CLASSES,
} from '../../src/domain/privacy'
import { conceptId } from '../../src/domain/windows'

describe('identifiers', () => {
  it('makes the same entity id for the same subject every time', () => {
    expect(entityId('learning-topic', 'Subnetting')).toBe('learning-topic:subnetting')
    expect(entityId('learning-topic', 'subnetting')).toBe('learning-topic:subnetting')
    expect(entityId('LearningTopic', 'Subnetting  ')).toBe('learningtopic:subnetting')
    expect(entityId('learning-topic', 'VLAN trunking')).toBe('learning-topic:vlan-trunking')
  })

  it('carries the kind inside the id so a bad reference is readable', () => {
    expect(entityIdKind(entityId('person', 'Adaya'))).toBe('person')
    expect(isEntityId('person:adaya')).toBe(true)
    expect(isEntityId('person:')).toBe(false)
    expect(isEntityId('Person:Adaya')).toBe(false)
  })

  it('refuses to build an entity id from nothing', () => {
    expect(() => entityId('person', '   ')).toThrow()
  })

  it('folds accents rather than dropping the letter', () => {
    expect(slugify('Café résumé')).toBe('cafe-resume')
  })

  it('makes record ids that look like record ids and do not repeat', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newRecordId()))
    expect(ids.size).toBe(500)
    for (const id of ids) expect(isRecordId(id)).toBe(true)
    expect(isRecordId('short')).toBe(false)
    expect(isRecordId(42)).toBe(false)
  })
})

describe('life domains', () => {
  it('carries every core domain from section 4.1', () => {
    expect(coreDomains.all()).toHaveLength(11)
    expect(coreDomains.labelFor(DOMAIN.privateHealth)).toBe('Private / Sexual Health')
    expect(coreDomains.labelFor(DOMAIN.fatherhood)).toBe('Fatherhood / Family')
  })

  it('has no way to switch a domain off', () => {
    for (const domain of CORE_LIFE_DOMAINS) {
      expect(Object.keys(domain).sort()).toEqual(['defaultPrivacy', 'id', 'label'])
    }
  })

  it('defaults the private and family domains to a discreet class', () => {
    expect(coreDomains.defaultPrivacyFor(DOMAIN.privateHealth)).toBe('private')
    expect(coreDomains.defaultPrivacyFor(DOMAIN.fatherhood)).toBe('child-family-sensitive')
    expect(coreDomains.defaultPrivacyFor(DOMAIN.home)).toBe('normal')
  })

  it('extends without mutating the registry it came from', () => {
    const extra = { id: DOMAIN.health, label: 'Renamed', defaultPrivacy: 'sensitive' } as const
    const extended = coreDomains.extendedWith([extra])
    expect(extended.labelFor(DOMAIN.health)).toBe('Renamed')
    expect(coreDomains.labelFor(DOMAIN.health)).toBe('Health & Physical Capacity')
  })

  it('shows an unregistered domain as itself rather than as a blank', () => {
    const empty = createDomainRegistry([])
    expect(empty.labelFor(DOMAIN.health)).toBe('health')
  })
})

describe('concepts', () => {
  it('gives each concept its own freshness rather than one global number', () => {
    // A settled arrangement does not expire…
    expect(coreConcepts.definitionFor(CONCEPT.custodyArrangement).freshness).toEqual({
      unit: 'durable',
    })
    // …but a one-off answer about tonight is only good for tonight. The
    // standing answer comes from a context record's validity window, not from
    // stretching a concept's clock to forever.
    expect(coreConcepts.definitionFor(CONCEPT.childPresent).freshness).toEqual({
      unit: 'local-days',
      days: 1,
    })
    expect(coreConcepts.definitionFor(CONCEPT.sleepHours).freshness).toEqual({
      unit: 'local-days',
      days: 1,
    })
    expect(coreConcepts.definitionFor(CONCEPT.energy).freshness).toEqual({
      unit: 'elapsed',
      ms: 6 * 3_600_000,
    })
  })

  it('does not spend a question on the private domain unprompted', () => {
    expect(coreConcepts.definitionFor(CONCEPT.privatePattern).ask).toEqual({
      materialToDecision: false,
      askWhenStale: false,
    })
  })

  it('covers every core domain', () => {
    const covered = new Set(coreConcepts.all().map((concept) => concept.domain))
    for (const domain of CORE_LIFE_DOMAINS) {
      expect(covered.has(domain.id)).toBe(true)
    }
  })

  it('treats an unregistered concept cautiously instead of refusing it', () => {
    const invented = conceptId('made.up.by.a.fixture')
    const definition = coreConcepts.definitionFor(invented)
    expect(definition.id).toBe(invented)
    expect(definition.privacy).toBe('sensitive')
    expect(definition.ask.materialToDecision).toBe(false)
    expect(coreConcepts.get(invented)).toBeUndefined()
  })

  it('extends without mutating', () => {
    const invented = conceptId('made.up')
    const extended = createConceptRegistry().extendedWith([
      {
        id: invented,
        label: 'Made up',
        domain: DOMAIN.home,
        freshness: { unit: 'durable' },
        privacy: 'normal',
        ask: { materialToDecision: false, askWhenStale: false },
      },
    ])
    expect(extended.get(invented)?.label).toBe('Made up')
    expect(coreConcepts.get(invented)).toBeUndefined()
  })
})

describe('privacy', () => {
  it('recognises the four classes the plan requires', () => {
    expect([...PRIVACY_CLASSES]).toEqual([
      'normal',
      'sensitive',
      'private',
      'child-family-sensitive',
    ])
    expect(isPrivacyClass('private')).toBe(true)
    expect(isPrivacyClass('secret')).toBe(false)
  })

  it('takes the most discreet class when several apply', () => {
    expect(mostSensitive(['normal', 'sensitive'])).toBe('sensitive')
    expect(mostSensitive(['normal', 'child-family-sensitive', 'sensitive'])).toBe(
      'child-family-sensitive',
    )
    expect(mostSensitive(['private', 'child-family-sensitive'])).toBe('private')
    expect(mostSensitive([])).toBe('normal')
  })

  it('keeps explicit private detail off an ordinary surface until asked', () => {
    expect(mayShowDetail('private', DISCREET_PRIMARY)).toBe(false)
    expect(mayShowDetail('private', { surface: 'primary', revealPrivate: true })).toBe(true)
    expect(mayShowDetail('sensitive', DISCREET_PRIMARY)).toBe(true)
    expect(mayShowDetail('child-family-sensitive', DISCREET_PRIMARY)).toBe(true)
  })

  it('never makes the private domain impossible to export', () => {
    for (const privacy of PRIVACY_CLASSES) {
      expect(mayShowDetail(privacy, FULL_EXPORT)).toBe(true)
      expect(mayShowDetail(privacy, { surface: 'export', revealPrivate: false })).toBe(true)
    }
  })
})

/**
 * What a tracked dimension means, and what it must not become (D-091).
 *
 * `tracked` says a concept is worth reading as a trend and learning from. The
 * invariant underneath it is that such a dimension has a **stable construct, a
 * stable scale and a stable direction** — and that separate dimensions stay
 * separate. Mood, stress, confidence and motivation are four things; one
 * generic emotional quantity standing in for all four is the wellness score the
 * owner rules out, and it is how a system starts telling somebody their life is
 * a 7.
 *
 * Which dimensions exist is the owner's to decide, so nothing here invents a
 * taxonomy. What it does enforce is that the registry cannot drift into an
 * aggregate: a tracked concept must be a reading of one thing, on a scale that
 * can be read as a number, in a window that expects it to change.
 */
describe('a tracked dimension is one thing, on one scale', () => {
  const tracked = coreConcepts.all().filter((concept) => concept.tracked !== undefined)

  it('has some, or the trend machinery is reading nothing', () => {
    expect(tracked.length).toBeGreaterThan(3)
  })

  it('can actually be read as a number by the path that tracks it', () => {
    /*
     * R3-B3, and the assertion whose absence let it through. `emotionalState`
     * was declared tracked and said to participate; its readings are free text,
     * which `numericValue` discards before any scale, direction, trajectory or
     * before-and-after comparison exists. The registry made a claim and nothing
     * checked that the machinery could honour it.
     *
     * This runs the declared shape through the real function rather than
     * trusting the label on it, so the two cannot drift apart.
     */
    const sample: Partial<Record<TrackedReading, FactValue>> = {
      scale: { type: 'scale', value: 3, of: 5 },
      number: { type: 'number', value: 7.5, unit: 'hours' },
      duration: { type: 'duration', minutes: 45 },
    }

    for (const concept of tracked) {
      const shape = concept.tracked
      if (shape === undefined) continue
      const reading = sample[shape]
      // Named rather than indexed blindly, so a shape nobody has a sample for
      // fails with a sentence instead of a null dereference.
      expect(
        reading,
        `${concept.id} declares "${shape}", which is not a reading shape`,
      ).toBeDefined()
      expect(
        reading === undefined ? undefined : numericValue(reading),
        `${concept.id} declares ${shape}, which the tracking path cannot read as a number`,
      ).toBeTypeOf('number')
    }
  })

  it('never declares a shape the tracking path would throw away', () => {
    /*
     * The other direction, and the one that matters for the next concept
     * somebody adds. Text and an entity reference are real things the owner
     * says; they are not dimensions with a scale and a direction, and a
     * concept holding one of those may not be marked tracked.
     */
    for (const value of [
      { type: 'text', value: 'flat' },
      { type: 'entity', value: entityRef('routine', 'a walk') },
    ] as readonly FactValue[]) {
      expect(
        numericValue(value),
        `${value.type} is not a quantity, so no tracked concept may hold it`,
      ).toBeUndefined()
    }
  })

  it('leaves the emotional taxonomy open rather than inventing one', () => {
    /*
     * D-091 invariant 6, as a standing decision rather than as today's state.
     * The repair for R3-B3 is *not* giving emotional state a scale — mood,
     * stress, confidence and motivation are four things, and one number for all
     * four is the wellness score the owner rules out. It stays what it is until
     * he says otherwise, and it stays asked for.
     */
    const emotional = coreConcepts.definitionFor(CONCEPT.emotionalState)
    expect(emotional.tracked, 'a scale was invented for how he feels').toBeUndefined()
    expect(emotional.ask.materialToDecision, 'it still matters to a decision').toBe(true)
    expect(emotional.privacy).toBe('sensitive')
  })

  it('expects to change, so it is never durable', () => {
    for (const concept of tracked) {
      expect(
        concept.freshness.unit,
        `${concept.id}: a durable fact is not a dimension to track`,
      ).not.toBe('durable')
    }
  })

  it('never becomes an aggregate score of several constructs', () => {
    /*
     * The names a wellness score arrives under. This is a guard on drift rather
     * than on today's registry: every one of these words describes a number
     * standing in for several separate things, which is exactly what a tracked
     * dimension may not be.
     */
    const aggregate =
      /overall|wellness|wellbeing|well-being|composite|\bscore\b|\bindex\b|readiness/i
    for (const concept of tracked) {
      expect(aggregate.test(concept.id), `${concept.id}: reads as an aggregate`).toBe(false)
      expect(
        aggregate.test(concept.label),
        `${concept.label}: reads as an aggregate of several things`,
      ).toBe(false)
    }
  })

  it('says who is most worth believing about it, per concept', () => {
    // D-059's rule, and the reason a tracked dimension can be compared at all:
    // two readings of one concept mean the same thing whoever supplied them.
    for (const concept of tracked) {
      expect(concept.reliability, `${concept.id}: no reliability`).toBeDefined()
      expect(concept.reliability?.owner, `${concept.id}: no owner reliability`).toBeGreaterThan(0)
    }
  })
})
