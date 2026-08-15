import { DOMAIN, type LifeDomainId } from './domains'
import type { AskPolicy } from './knowledge'
import type { PrivacyClass } from './privacy'
import {
  conceptId,
  freshnessWindow,
  type ConceptId,
  type FreshnessHorizon,
  type FreshnessWindow,
} from './windows'

/**
 * Concepts — the things the system can know about (canonical plan section 8).
 *
 * "Freshness is concept-specific, not one universal number of days." Current
 * sleep goes stale overnight. A custody arrangement does not go stale at all.
 * Putting the horizon on the concept rather than in a global constant is what
 * makes that true, and putting the ask policy beside it is what stops the app
 * asking about something it already knows or does not need.
 *
 * This is a starting registry, not a catalogue of everything the product will
 * ever track. Section 4.5 — do not collect data merely because a field exists.
 */

export interface ConceptDefinition {
  readonly id: ConceptId
  readonly label: string
  readonly domain: LifeDomainId
  readonly freshness: FreshnessHorizon
  readonly privacy: PrivacyClass
  readonly ask: AskPolicy
}

const HOURS = 3_600_000

function elapsedHours(hours: number): FreshnessHorizon {
  return { unit: 'elapsed', ms: hours * HOURS }
}

function localDays(days: number): FreshnessHorizon {
  return { unit: 'local-days', days }
}

const DURABLE: FreshnessHorizon = { unit: 'durable' }

export const CONCEPT = {
  sleepHours: conceptId('sleep.hours-last-night'),
  sleepQuality: conceptId('sleep.quality-last-night'),
  energy: conceptId('energy.current'),
  soreness: conceptId('health.soreness'),
  /**
   * Whether a child is with the owner. Scenario G-002 lives on this concept:
   * a durable arrangement answers it indefinitely, and a temporary exception
   * such as travel overrides it for a window without erasing it.
   */
  childPresent: conceptId('family.child-present'),
  custodyArrangement: conceptId('family.custody-arrangement'),
  learningTopic: conceptId('career.current-learning-topic'),
  usableTimeTonight: conceptId('career.usable-time-tonight'),
  cashBuffer: conceptId('money.cash-buffer-state'),
  socialEnergy: conceptId('social.energy'),
  homeFriction: conceptId('home.friction'),
  privatePattern: conceptId('private-health.recent-pattern'),
  weeklyFocus: conceptId('direction.weekly-focus'),
  emotionalState: conceptId('emotional.current-state'),
  faithPractice: conceptId('faith.practice-recent'),
}

export const CORE_CONCEPTS: readonly ConceptDefinition[] = [
  {
    id: CONCEPT.sleepHours,
    label: 'Hours slept last night',
    domain: DOMAIN.sleep,
    freshness: localDays(1),
    privacy: 'normal',
    ask: { materialToDecision: true, askWhenStale: true },
  },
  {
    id: CONCEPT.sleepQuality,
    label: 'Sleep quality last night',
    domain: DOMAIN.sleep,
    freshness: localDays(1),
    privacy: 'normal',
    ask: { materialToDecision: true, askWhenStale: true },
  },
  {
    id: CONCEPT.energy,
    label: 'Current energy',
    domain: DOMAIN.health,
    freshness: elapsedHours(6),
    privacy: 'normal',
    ask: { materialToDecision: true, askWhenStale: true },
  },
  {
    id: CONCEPT.soreness,
    label: 'Soreness or pain',
    domain: DOMAIN.health,
    freshness: elapsedHours(12),
    privacy: 'normal',
    ask: { materialToDecision: true, askWhenStale: true },
  },
  {
    id: CONCEPT.childPresent,
    label: 'Child with the owner',
    domain: DOMAIN.fatherhood,
    freshness: DURABLE,
    privacy: 'child-family-sensitive',
    // Durable, so it is never re-asked on age alone. An exception record, not a
    // question, is what changes it.
    ask: { materialToDecision: true, askWhenStale: false },
  },
  {
    id: CONCEPT.custodyArrangement,
    label: 'Custody arrangement',
    domain: DOMAIN.fatherhood,
    freshness: DURABLE,
    privacy: 'child-family-sensitive',
    ask: { materialToDecision: false, askWhenStale: false },
  },
  {
    id: CONCEPT.learningTopic,
    label: 'Current learning topic',
    domain: DOMAIN.career,
    freshness: localDays(14),
    privacy: 'normal',
    ask: { materialToDecision: true, askWhenStale: true },
  },
  {
    id: CONCEPT.usableTimeTonight,
    label: 'Usable time tonight',
    domain: DOMAIN.career,
    freshness: elapsedHours(4),
    privacy: 'normal',
    ask: { materialToDecision: true, askWhenStale: true },
  },
  {
    id: CONCEPT.cashBuffer,
    label: 'Cash buffer',
    domain: DOMAIN.money,
    freshness: localDays(30),
    privacy: 'sensitive',
    ask: { materialToDecision: false, askWhenStale: true },
  },
  {
    id: CONCEPT.socialEnergy,
    label: 'Social energy',
    domain: DOMAIN.social,
    freshness: elapsedHours(8),
    privacy: 'normal',
    ask: { materialToDecision: false, askWhenStale: true },
  },
  {
    id: CONCEPT.homeFriction,
    label: 'Home friction',
    domain: DOMAIN.home,
    freshness: localDays(7),
    privacy: 'normal',
    ask: { materialToDecision: false, askWhenStale: true },
  },
  {
    id: CONCEPT.privatePattern,
    label: 'Recent private pattern',
    domain: DOMAIN.privateHealth,
    freshness: localDays(7),
    privacy: 'private',
    // Section 11: the owner navigates here deliberately. The app does not open
    // a check-in with an unsolicited private question.
    ask: { materialToDecision: false, askWhenStale: false },
  },
  {
    id: CONCEPT.weeklyFocus,
    label: 'Weekly direction',
    domain: DOMAIN.direction,
    freshness: localDays(7),
    privacy: 'normal',
    ask: { materialToDecision: true, askWhenStale: true },
  },
  {
    id: CONCEPT.emotionalState,
    label: 'Current emotional state',
    domain: DOMAIN.emotional,
    freshness: elapsedHours(8),
    privacy: 'sensitive',
    ask: { materialToDecision: true, askWhenStale: true },
  },
  {
    id: CONCEPT.faithPractice,
    label: 'Recent faith practice',
    domain: DOMAIN.faith,
    freshness: localDays(7),
    privacy: 'sensitive',
    ask: { materialToDecision: false, askWhenStale: true },
  },
]

export interface ConceptRegistry {
  all(): readonly ConceptDefinition[]
  get(concept: ConceptId): ConceptDefinition | undefined
  definitionFor(concept: ConceptId): ConceptDefinition
  freshnessFor(concept: ConceptId): FreshnessWindow
  extendedWith(extra: readonly ConceptDefinition[]): ConceptRegistry
}

/**
 * A concept nobody registered is still a concept.
 *
 * Synthetic fixtures invent concepts on purpose, and a legacy import will
 * eventually bring in ones this version has never heard of. Refusing to resolve
 * them would make an inspectable oddity into a crash, so an unregistered
 * concept gets a cautious definition instead: a short horizon, no question
 * budget, and the more discreet privacy class.
 */
export function fallbackConcept(concept: ConceptId): ConceptDefinition {
  return {
    id: concept,
    label: concept,
    domain: DOMAIN.direction,
    freshness: elapsedHours(24),
    privacy: 'sensitive',
    ask: { materialToDecision: false, askWhenStale: false },
  }
}

export function createConceptRegistry(
  concepts: readonly ConceptDefinition[] = CORE_CONCEPTS,
): ConceptRegistry {
  const byId = new Map<ConceptId, ConceptDefinition>(
    concepts.map((definition) => [definition.id, definition]),
  )
  const ordered = [...byId.values()]

  const definitionFor = (concept: ConceptId): ConceptDefinition =>
    byId.get(concept) ?? fallbackConcept(concept)

  return {
    all: () => ordered,
    get: (concept) => byId.get(concept),
    definitionFor,
    freshnessFor: (concept) => freshnessWindow(concept, definitionFor(concept).freshness),
    extendedWith: (extra) => createConceptRegistry([...ordered, ...extra]),
  }
}

export const coreConcepts: ConceptRegistry = createConceptRegistry()
