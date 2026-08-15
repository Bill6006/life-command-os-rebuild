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
import { CONCEPT, coreConcepts, createConceptRegistry } from '../../src/domain/concepts'
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
