import type { Branded } from './branded'
import type { PrivacyClass } from './privacy'

/**
 * Life domains (canonical plan section 4.1).
 *
 * Every core domain stays in the model. A domain may be quiet, stable, stale or
 * urgent, but it is never removed because a switch is off — so there is no
 * enabled flag here, and there is no way to express one.
 *
 * The registry is extensible, as section 4.1 requires, but extension returns a
 * new registry rather than mutating a global. A domain list that can be edited
 * at runtime from anywhere is a domain list that can be silently shortened.
 */

export type LifeDomainId = Branded<string, 'LifeDomainId'>

export interface LifeDomain {
  readonly id: LifeDomainId
  readonly label: string
  /** What a record in this domain is classified as unless it says otherwise. */
  readonly defaultPrivacy: PrivacyClass
}

function id(value: string): LifeDomainId {
  return value as LifeDomainId
}

export const DOMAIN = {
  health: id('health'),
  sleep: id('sleep'),
  fatherhood: id('fatherhood'),
  career: id('career'),
  money: id('money'),
  social: id('social'),
  emotional: id('emotional'),
  faith: id('faith'),
  home: id('home'),
  privateHealth: id('private-health'),
  direction: id('direction'),
}

export const CORE_LIFE_DOMAINS: readonly LifeDomain[] = [
  { id: DOMAIN.health, label: 'Health & Physical Capacity', defaultPrivacy: 'normal' },
  { id: DOMAIN.sleep, label: 'Sleep & Recovery', defaultPrivacy: 'normal' },
  { id: DOMAIN.fatherhood, label: 'Fatherhood / Family', defaultPrivacy: 'child-family-sensitive' },
  { id: DOMAIN.career, label: 'Career & Learning', defaultPrivacy: 'normal' },
  { id: DOMAIN.money, label: 'Money & Financial Resilience', defaultPrivacy: 'sensitive' },
  { id: DOMAIN.social, label: 'Social & Relationships', defaultPrivacy: 'normal' },
  { id: DOMAIN.emotional, label: 'Emotional Health', defaultPrivacy: 'sensitive' },
  { id: DOMAIN.faith, label: 'Faith & Meaning', defaultPrivacy: 'sensitive' },
  { id: DOMAIN.home, label: 'Home & Environment', defaultPrivacy: 'normal' },
  { id: DOMAIN.privateHealth, label: 'Private / Sexual Health', defaultPrivacy: 'private' },
  { id: DOMAIN.direction, label: 'Long-Range Direction / Identity', defaultPrivacy: 'normal' },
]

export interface DomainRegistry {
  all(): readonly LifeDomain[]
  get(domain: LifeDomainId): LifeDomain | undefined
  has(domain: LifeDomainId): boolean
  labelFor(domain: LifeDomainId): string
  defaultPrivacyFor(domain: LifeDomainId): PrivacyClass
  /** A new registry with these domains added or replaced. */
  extendedWith(extra: readonly LifeDomain[]): DomainRegistry
}

export function createDomainRegistry(
  domains: readonly LifeDomain[] = CORE_LIFE_DOMAINS,
): DomainRegistry {
  const byId = new Map<LifeDomainId, LifeDomain>(domains.map((domain) => [domain.id, domain]))
  const ordered = [...byId.values()]

  return {
    all: () => ordered,
    get: (domain) => byId.get(domain),
    has: (domain) => byId.has(domain),
    // An unregistered domain reads as itself rather than as "Unknown": an id
    // on screen is a defect someone can chase, a blank is one nobody notices.
    labelFor: (domain) => byId.get(domain)?.label ?? domain,
    defaultPrivacyFor: (domain) => byId.get(domain)?.defaultPrivacy ?? 'normal',
    extendedWith: (extra) => createDomainRegistry([...ordered, ...extra]),
  }
}

export const coreDomains: DomainRegistry = createDomainRegistry()
