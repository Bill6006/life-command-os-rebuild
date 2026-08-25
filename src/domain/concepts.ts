import { DOMAIN, type LifeDomainId } from './domains'
import type { AskPolicy } from './knowledge'
import type { PrivacyClass } from './privacy'
import type { ProvenanceSource } from './records'
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

/**
 * How much a reading of this concept, from this source, is worth (D-059).
 *
 * 0–1, and it is one number answering one question: **how far should a reading
 * from here move what we believe about this?** The fact layer spends it as the
 * confidence of an inference; `learning.ts` spends it as a term in the weight
 * of an outcome. Both are the same question, so both read the same table.
 *
 * The owner's decision is that there is **no standing hierarchy of sources**. A
 * watch measuring hours slept may beat his recollection of hours slept; a
 * financial record of a balance may beat his estimate of it; a model's guess at
 * how he feels should be weaker than him saying how he feels. Ranking by source
 * alone is the mistake section 8 already forbids one layer down — "freshness is
 * concept-specific, not one universal number of days" is the identical argument
 * about a different property.
 *
 * **What this never decides.** Reliability governs how far a reading moves a
 * belief. It never governs whether the reading may pass itself off as something
 * it is not: a derived or model reading resolves to `inferred` however reliable
 * it is, and its provenance stays visible everywhere it surfaces (D-014).
 */
export type SourceReliability = Partial<Record<ProvenanceSource, number>>

/**
 * What a source is worth when a concept has nothing particular to say.
 *
 * Deliberately conservative, and deliberately not a ranking anyone should read
 * meaning into: it is the fallback for concepts nobody has thought about yet,
 * and any concept with a reason may override any entry.
 *
 * `synthetic` sits with the owner because a fixture stands in for whatever it
 * describes. Discounting it would make every scenario in the laboratory learn
 * more slowly than the running app, so the QA lab would stop demonstrating the
 * product. `legacy-import` is low for a different reason: section 30 keeps
 * imported history from silently driving decisions, and this is the second
 * fence rather than the first.
 */
export const DEFAULT_SOURCE_RELIABILITY: Record<ProvenanceSource, number> = {
  owner: 1,
  synthetic: 1,
  device: 0.8,
  derived: 0.6,
  model: 0.35,
  'legacy-import': 0.5,
}

export interface ConceptDefinition {
  readonly id: ConceptId
  readonly label: string
  readonly domain: LifeDomainId
  readonly freshness: FreshnessHorizon
  readonly privacy: PrivacyClass
  readonly ask: AskPolicy
  /**
   * Whether losing this reading means the area is less understood (section 8).
   *
   * The coverage engine tracks "meaningful sub-areas", and most of what the
   * guide asks about is not one. "How much time have you got tonight?" goes
   * stale every four hours by design and says nothing whatever about the
   * owner's career; a week of not answering it is not neglect, it is Tuesday.
   * Counting it would put every domain permanently in the red and teach the
   * owner to ignore the one signal section 63 exists to give him.
   *
   * A standing concept is one where a gap is a gap: what he is studying, what
   * the house is like, what the money situation is, how he has been sleeping.
   *
   * **The default is false**, so a new concept contributes nothing to coverage
   * until somebody decides it should — section 4.5, applied to the registry
   * itself.
   */
  readonly standing?: boolean
  /**
   * Whether a run of readings of this is worth reporting over time (D-089).
   *
   * **A different question from `standing`, and conflating them was QA-A1's
   * smaller half.** `standing` asks whether a gap here is a gap in the app's
   * understanding of an area, and it is deliberately false for everything the
   * owner reports about right now: energy goes stale in six hours by design,
   * and counting it as coverage would put every domain permanently in the red
   * (D-061). Insights' trajectory card then gated on `standing`, which meant
   * **no subjective dimension the owner can actually report could produce a
   * trend or be learned from at all** — they were collected, spent as
   * similarity features, and never read as evidence.
   *
   * So this asks the question that was actually being asked: is a series of
   * these readings a thing worth showing the owner, and worth comparing before
   * and after an action? True for how he feels and how he slept; false for how
   * much time he has tonight, which is noise with a timestamp.
   *
   * **It names the shape, because it is a claim that has to be satisfiable
   * (R3-B3).** It was a boolean, and `emotionalState` carried it while its
   * readings are free text — which `numericValue` discards before any scale,
   * direction, trajectory or before-and-after comparison exists. So the concept
   * was declared tracked, said to participate, and could not: nothing checked
   * that the machinery could read what the concept actually holds.
   *
   * Saying *how* a reading becomes a number is what makes the claim checkable.
   * A concept whose values cannot be read as a number is not a dimension that
   * can be tracked, whatever anyone writes in the registry, and
   * `tests/unit/registries.test.ts` now fails the build for the mismatch.
   *
   * Absent, for the same reason `standing`'s default is false: a new concept
   * earns a place on a surface by somebody deciding it should have one.
   */
  readonly tracked?: TrackedReading
  /**
   * Where this concept disagrees with the default table, and why.
   *
   * Absent means the defaults are fine. An entry here is a claim about this
   * concept that somebody had to defend, which is the point of putting it
   * beside `freshness` rather than in a global ladder.
   */
  readonly reliability?: SourceReliability
}

/**
 * How a reading of a tracked concept becomes a number.
 *
 * Exactly the value shapes `numericValue` can read. A scale carries its own
 * top, so 4-of-5 and 8-of-10 are the same reading; a number and a duration are
 * already quantities. Text and an entity reference are neither, and a concept
 * that holds one of those is not a dimension with a scale and a direction — it
 * is something the owner says, which is a different and equally real thing.
 */
export type TrackedReading = 'scale' | 'number' | 'duration'

const HOURS = 3_600_000

function elapsedHours(hours: number): FreshnessHorizon {
  return { unit: 'elapsed', ms: hours * HOURS }
}

function localDays(days: number): FreshnessHorizon {
  return { unit: 'local-days', days }
}

const DURABLE: FreshnessHorizon = { unit: 'durable' }

/**
 * True of the local day it was recorded on, rather than for N hours — AUD-0005.
 *
 * The night that has just ended is the same night at ten in the morning as it
 * was at half past six. It stops being the answer when the next night has
 * happened, and the next night is on the other side of midnight.
 */
const THIS_LOCAL_DAY: FreshnessHorizon = { unit: 'this-local-day' }

/** True of the part of the day it was recorded in, and gone at its boundary. */
const THIS_BLOCK: FreshnessHorizon = { unit: 'this-block' }

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
    /*
     * AUD-0005, and the reproduction that named it: at 06:30 the situation line
     * read "Wednesday early morning, 8 hours of sleep"; at 10:00 the same day it
     * read "Wednesday morning". Same value, same night, and the app had lost its
     * best morning fact at the hour it most needed it — which is what left the
     * morning with a named recovery limiter and no recovery move (AUD-0003).
     *
     * `local-days: 1` counted forward from whenever the reading happened to be
     * taken. This is true of the day it describes, which is what the concept
     * actually is.
     */
    freshness: THIS_LOCAL_DAY,
    standing: true,
    tracked: 'number',
    privacy: 'normal',
    ask: { materialToDecision: true, askWhenStale: true },
    /*
     * The case D-059 is named for, and the one place the owner is outranked.
     *
     * A watch measures a duration. A person estimates the moment they fell
     * asleep, which is by definition the one moment of the night they were not
     * awake for — so a morning recollection is a reconstruction of a boundary
     * rather than a reading of a quantity. It is still good evidence, and it is
     * not the better of the two.
     *
     * `derived` is high here because deriving a night's sleep is arithmetic
     * over a measured quantity rather than a guess about a person. That is the
     * number the morning-after sleep matcher spends, and it is high for that
     * reason and not because derived evidence is generally trustworthy — see
     * `energy` immediately below, where the same source is worth half as much.
     */
    reliability: { device: 1, owner: 0.85, derived: 0.8, model: 0.3 },
  },
  {
    id: CONCEPT.sleepQuality,
    label: 'Sleep quality last night',
    domain: DOMAIN.sleep,
    // The same night, and therefore the same window as the hours it describes.
    freshness: THIS_LOCAL_DAY,
    tracked: 'scale',
    privacy: 'normal',
    ask: { materialToDecision: true, askWhenStale: true },
    // How a night *felt* is the owner's to report. A watch scoring it is
    // inferring an experience from movement, which is the weaker claim — the
    // opposite ordering to hours slept, on the same device, in the same domain.
    reliability: { owner: 1, device: 0.6, derived: 0.45, model: 0.25 },
  },
  {
    id: CONCEPT.energy,
    label: 'Current energy',
    domain: DOMAIN.health,
    freshness: elapsedHours(6),
    tracked: 'scale',
    privacy: 'normal',
    ask: { materialToDecision: true, askWhenStale: true },
    // "A model's inference about how he feels should generally be weaker than
    // him saying how he feels" — D-059, almost word for word. A readiness score
    // is a proxy for a thing the owner can simply be asked.
    reliability: { owner: 1, device: 0.5, derived: 0.4, model: 0.2 },
  },
  {
    id: CONCEPT.soreness,
    label: 'Soreness or pain',
    domain: DOMAIN.health,
    freshness: elapsedHours(12),
    tracked: 'scale',
    privacy: 'normal',
    ask: { materialToDecision: true, askWhenStale: true },
    // Nothing measures whether a shoulder hurts.
    reliability: { owner: 1, device: 0.35, derived: 0.3, model: 0.2 },
  },
  {
    id: CONCEPT.childPresent,
    label: 'Child with the owner',
    domain: DOMAIN.fatherhood,
    // A one-off observation of tonight is good for tonight. The standing
    // answer comes from a durable context record, whose currency is its own
    // validity window rather than a clock — which is what stops the app asking
    // about a settled arrangement every evening (G-002).
    freshness: localDays(1),
    privacy: 'child-family-sensitive',
    ask: { materialToDecision: true, askWhenStale: true },
    reliability: { owner: 1, device: 0.4, derived: 0.5, model: 0.15 },
  },
  {
    id: CONCEPT.custodyArrangement,
    label: 'Custody arrangement',
    domain: DOMAIN.fatherhood,
    freshness: DURABLE,
    standing: true,
    privacy: 'child-family-sensitive',
    ask: { materialToDecision: false, askWhenStale: false },
    // An arrangement is a thing the owner knows and nothing else does.
    reliability: { owner: 1, derived: 0.25, device: 0.15, model: 0.1 },
  },
  {
    id: CONCEPT.learningTopic,
    label: 'Current learning topic',
    domain: DOMAIN.career,
    freshness: localDays(14),
    standing: true,
    privacy: 'normal',
    ask: { materialToDecision: true, askWhenStale: true },
    reliability: { owner: 1, derived: 0.7, device: 0.5, model: 0.45 },
  },
  {
    id: CONCEPT.usableTimeTonight,
    /*
     * The label, and only the label — AUD-0002.
     *
     * The stored id stays `career.usable-time-tonight`, because renaming a
     * concept id is a migration and belongs with AUD-0006 rather than in a copy
     * pass. What was owner-visible was the label, on the evidence panel and on
     * the Career page, and it named an evening at every hour of the day.
     */
    label: 'Usable time now',
    domain: DOMAIN.career,
    /*
     * Free minutes in *this* part of the day, so it expires with the part of
     * the day rather than four hours after it was said — AUD-0005. An answer
     * given at half past five about the evening is not still an answer at ten,
     * and an answer given at ten in the morning has nothing to say about the
     * afternoon.
     */
    freshness: THIS_BLOCK,
    privacy: 'normal',
    ask: { materialToDecision: true, askWhenStale: true },
    // A calendar is genuinely good at this, and is still not the whole evening.
    reliability: { owner: 1, device: 0.75, derived: 0.75, model: 0.3 },
  },
  {
    id: CONCEPT.cashBuffer,
    label: 'Cash buffer',
    domain: DOMAIN.money,
    freshness: localDays(30),
    standing: true,
    tracked: 'number',
    privacy: 'sensitive',
    ask: { materialToDecision: false, askWhenStale: true },
    // The second case D-059 names: a financial record of a balance beats an
    // estimate of it, and this is the only concept in the registry where the
    // owner sits below three other sources.
    reliability: { device: 0.95, derived: 0.9, owner: 0.6, model: 0.35 },
  },
  {
    id: CONCEPT.socialEnergy,
    label: 'Social energy',
    domain: DOMAIN.social,
    freshness: elapsedHours(8),
    tracked: 'scale',
    privacy: 'normal',
    ask: { materialToDecision: false, askWhenStale: true },
    reliability: { owner: 1, device: 0.35, derived: 0.3, model: 0.2 },
  },
  {
    id: CONCEPT.homeFriction,
    label: 'Home friction',
    domain: DOMAIN.home,
    /*
     * Three days, not seven — AUD-0005, and the other half of the pair.
     *
     * The audit put these two side by side: last night's sleep expired
     * mid-morning while "the kitchen table is buried again" stayed current for
     * a week. The second is the more perishable of the two by a long way — he
     * clears the table without telling the app — and it was the one that
     * persisted, so the app was asserting a state of a room from a reading old
     * enough to be about a different week.
     *
     * Three days rather than a number nearer zero because friction in a house
     * is a standing condition rather than an event: a table that was buried on
     * Monday is usually still buried on Tuesday, and asking every evening is
     * section 4.5's failure in the other direction. What goes is the fourth day
     * onwards, where the honest state is "ask" rather than "assert".
     *
     * The audit's other option — retiring it on a completed `reset-space` —
     * is the better mechanism and is deliberately not done here: it needs the
     * app to write a derived fact about a room from an outcome answer, which is
     * new behaviour rather than a corrected claim.
     */
    freshness: localDays(3),
    standing: true,
    privacy: 'normal',
    ask: { materialToDecision: false, askWhenStale: true },
    reliability: { owner: 1, derived: 0.45, device: 0.3, model: 0.25 },
  },
  {
    id: CONCEPT.privatePattern,
    label: 'Recent private pattern',
    domain: DOMAIN.privateHealth,
    freshness: localDays(7),
    standing: true,
    privacy: 'private',
    // Section 11: the owner navigates here deliberately. The app does not open
    // a check-in with an unsolicited private question.
    ask: { materialToDecision: false, askWhenStale: false },
    // Section 11 also forbids the app deciding what any of this means. A model
    // concluding something here would be doing exactly that.
    reliability: { owner: 1, derived: 0.4, device: 0.2, model: 0.15 },
  },
  {
    id: CONCEPT.weeklyFocus,
    label: 'Weekly direction',
    domain: DOMAIN.direction,
    freshness: localDays(7),
    standing: true,
    privacy: 'normal',
    ask: { materialToDecision: true, askWhenStale: true },
    // A direction is something the owner sets. Nothing else gets to set it.
    reliability: { owner: 1, derived: 0.3, device: 0.2, model: 0.2 },
  },
  {
    id: CONCEPT.emotionalState,
    label: 'Current emotional state',
    domain: DOMAIN.emotional,
    freshness: elapsedHours(8),
    /*
     * Deliberately **not** tracked, and that is the honest state of it (R3-B3,
     * D-091 invariant 6).
     *
     * Its readings are free text — "flat" — so there is no scale, no direction
     * and nothing two of them can be compared along. Marking it tracked did not
     * give it those; it only made the app claim a participation the machinery
     * discarded one line later, in `numericValue`.
     *
     * The answer is not to invent a scale for it. Mood, stress, confidence and
     * motivation are four different things, and one number standing in for all
     * four is the wellness score the owner rules out. Which dimensions exist
     * here is his to say, and until he says, this stays what it actually is: a
     * sensitive thing he tells the app, asked for when it matters, shown as he
     * said it, and not pretended to be a trend.
     *
     * Open question for the owner. Nothing else about this concept changes.
     */
    privacy: 'sensitive',
    ask: { materialToDecision: true, askWhenStale: true },
    reliability: { owner: 1, device: 0.4, derived: 0.35, model: 0.2 },
  },
  {
    id: CONCEPT.faithPractice,
    label: 'Recent faith practice',
    domain: DOMAIN.faith,
    freshness: localDays(7),
    standing: true,
    privacy: 'sensitive',
    ask: { materialToDecision: false, askWhenStale: true },
    reliability: { owner: 1, derived: 0.5, device: 0.35, model: 0.2 },
  },
]

export interface ConceptRegistry {
  all(): readonly ConceptDefinition[]
  get(concept: ConceptId): ConceptDefinition | undefined
  definitionFor(concept: ConceptId): ConceptDefinition
  freshnessFor(concept: ConceptId): FreshnessWindow
  /** How far a reading of this concept from this source may move a belief. */
  reliabilityFor(concept: ConceptId, source: ProvenanceSource): number
  extendedWith(extra: readonly ConceptDefinition[]): ConceptRegistry
}

/** The same lookup, for callers holding a definition rather than a registry. */
export function reliabilityOf(definition: ConceptDefinition, source: ProvenanceSource): number {
  return definition.reliability?.[source] ?? DEFAULT_SOURCE_RELIABILITY[source]
}

/**
 * A concept nobody registered is still a concept.
 *
 * Synthetic fixtures invent concepts on purpose, and a legacy import will
 * eventually bring in ones this version has never heard of. Refusing to resolve
 * them would make an inspectable oddity into a crash, so an unregistered
 * concept gets a cautious definition instead: a short horizon, no question
 * budget, the more discreet privacy class, and no reliability opinion at all —
 * which leaves the conservative defaults, because nobody has argued otherwise.
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
    reliabilityFor: (concept, source) => reliabilityOf(definitionFor(concept), source),
    extendedWith: (extra) => createConceptRegistry([...ordered, ...extra]),
  }
}

export const coreConcepts: ConceptRegistry = createConceptRegistry()
