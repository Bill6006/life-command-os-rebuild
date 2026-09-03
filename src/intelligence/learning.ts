import type { ConceptRegistry } from '../domain/concepts'
import type { RecordId } from '../domain/ids'
import type { EntityIndex, EntityRef } from '../domain/entities'
import { patternNameFor, type ActionTarget, type ActionVerb } from '../domain/recommendation'
import {
  evidenceSourceOf,
  type DecisionContext,
  type FactValue,
  type OutcomeRecord,
  type ProvenanceSource,
  type WeekLoad,
} from '../domain/records'
import {
  localDaysBetween,
  localDayIdAt,
  type DayBlock,
  type Instant,
  type IsoWeekday,
  type TimeZoneId,
} from '../domain/time'
import type { ConceptId } from '../domain/windows'
import type { MemoryView } from '../memory/view'
import { actionScopeOf, observedAssociations, type ObservedAssociation } from './association'
import { WANTED_SOMETHING_ELSE, type Episode } from './lifecycle'
import { profileFor } from './moves'
import { horizonWord } from './vocabulary'
import { comfortFrictionOf, effectValueOf, resultValueOf } from './outcomes'

/**
 * Learning from what actually happened (canonical plan section 20).
 *
 * Section 20 is six sentences long and every one of them is a defect waiting to
 * be written. They are the specification for this file, so each is named where
 * it is implemented:
 *
 * 1. **A rejection is not "ineffective."** Declines reach `appetite` and cannot
 *    reach `effect`. Not by convention — the code paths do not meet, and a test
 *    proves a history of nothing but refusals moves no effect at all.
 * 2. **Unable-now is context evidence.** It reaches `followThrough`, which is a
 *    claim about whether this can be done in situations like this one, and says
 *    nothing about whether it works when it is.
 * 3. **One success is not proof.** Every learned number is the prior pulled
 *    toward what was observed by `n / (n + PATIENCE)`. One perfect match moves
 *    it a quarter of the way. Nothing here can be converted by a single evening.
 * 4. **Context similarity matters.** More than date proximity, so similarity is
 *    the weight and recency is a gentle multiplier on it — never the reverse.
 *    Below `RECOGNISABLE` an episode is not "a situation like this one" and does
 *    not count at all, because counting everything a little is how learning
 *    becomes an average.
 * 5. **Same-block and next-day effects can differ.** They are learned from
 *    different questions asked at different times: a move judged twenty minutes
 *    later moves `now`, a move judged the next morning moves `tomorrow`, and
 *    neither speaks for the other.
 * 6. **A learned effect must be reversible.** Nothing is stored. Every number
 *    here is recomputed from the whole history on every decision, so evidence
 *    that contradicts a belief pulls it back by the same arithmetic that
 *    established it — and the owner can put a stop to a belief outright
 *    (section 62), which is the watershed below.
 */

/** How much evidence it takes before observation outweighs the prior. */
export const PATIENCE = 3

/** Below this, an episode is not a situation like this one. */
export const RECOGNISABLE = 0.4

/** A refusal counts fully; asking for something else counts for less. */
const WANTED_ANOTHER_WEIGHT = 0.5

export type BeliefAspect =
  | 'effect'
  | 'result'
  | 'follow-through'
  | 'appetite'
  | 'friction'
  /**
   * What the record shows follows an action (D-089, D-091).
   *
   * The fifth aspect is the app's own conclusion rather than a summary of the
   * owner's, and it needs a correction identity for exactly that reason: it can
   * move a recommendation, so he has to be able to say the app has read his
   * life wrong without deleting the readings it read. Preserve history, correct
   * the interpretation.
   *
   * Its payload is an **action scope** — verb and object, or an explicit family
   * — not a verb, because that is what the relationship is scoped to.
   */
  | 'association'

const BELIEF_ASPECTS: readonly BeliefAspect[] = [
  'effect',
  'result',
  'follow-through',
  'appetite',
  'friction',
  'association',
]

/**
 * What the owner is disputing when they say a belief is wrong.
 *
 * Per move rather than per context band. The bands are machinery; what the
 * owner is looking at is a sentence about clearing a space, and "that is not
 * right" is a statement about clearing a space.
 */
export function beliefKey(aspect: BeliefAspect, verb: ActionVerb): string {
  return `${aspect}:${verb}`
}

/**
 * The correction identity for a learned relationship (D-091).
 *
 * Scoped to the action rather than the verb, so rejecting what the app has
 * concluded about walking says nothing about cycling — the same identity rule
 * the relationship itself is computed under.
 */
export function associationBeliefKey(scope: string): string {
  return `association:${scope}`
}

export function parseBeliefKey(
  key: string,
): { readonly aspect: BeliefAspect; readonly verb: string } | undefined {
  const split = key.indexOf(':')
  if (split <= 0) return undefined
  const aspect = key.slice(0, split) as BeliefAspect
  if (!BELIEF_ASPECTS.includes(aspect)) return undefined
  return { aspect, verb: key.slice(split + 1) }
}

// ---------------------------------------------------------------------------
// Is this like tonight?
// ---------------------------------------------------------------------------

/** Blocks that shade into each other. Adjacency is half a match, not none. */
const NEIGHBOURS: Record<DayBlock, readonly DayBlock[]> = {
  'early-morning': ['late-night', 'morning'],
  morning: ['early-morning', 'afternoon'],
  afternoon: ['morning', 'evening'],
  evening: ['afternoon', 'late-night'],
  'late-night': ['evening', 'early-morning'],
}

const STRAIN_ORDER: Record<'severe' | 'moderate' | 'none', number> = {
  severe: 2,
  moderate: 1,
  none: 0,
}

function blockMatch(a: DayBlock, b: DayBlock): number {
  if (a === b) return 1
  return NEIGHBOURS[a].includes(b) ? 0.5 : 0
}

function strainMatch(a: DecisionContext['strain'], b: DecisionContext['strain']): number {
  // Not knowing is not a mismatch and is not a match either. Half is the honest
  // answer, and it is what stops an unrecorded context quietly resembling
  // everything (G-009's rule, applied to comparison rather than to values).
  if (a === 'unknown' || b === 'unknown') return 0.5
  if (a === b) return 1
  return Math.abs(STRAIN_ORDER[a] - STRAIN_ORDER[b]) === 1 ? 0.5 : 0
}

function knownMatch<T>(a: T | undefined, b: T | undefined): number {
  if (a === undefined || b === undefined) return 0.5
  return a === b ? 1 : 0
}

function minutesMatch(a: number | undefined, b: number | undefined): number {
  if (a === undefined || b === undefined) return 0.5
  return Math.max(0, 1 - Math.abs(a - b) / 90)
}

/**
 * How much load resembles load — AUD-0007.
 *
 * Ordinal rather than nominal, because the three levels are ordered: a heavy
 * week is more like an ordinary one than it is like a light one, and treating
 * all three as equally different would make the feature noisier than the thing
 * it measures. Adjacent levels half-match, which is `strainMatch`'s shape on a
 * scale that happens to have the same number of rungs.
 */
const LOAD_ORDER: Record<WeekLoad, number> = { light: 0, ordinary: 1, heavy: 2 }

function loadMatch(a: WeekLoad | undefined, b: WeekLoad | undefined): number {
  if (a === undefined || b === undefined) return 0.5
  if (a === b) return 1
  return Math.abs(LOAD_ORDER[a] - LOAD_ORDER[b]) === 1 ? 0.5 : 0
}

/**
 * How much one weekday resembles another — AUD-0007.
 *
 * A Tuesday is a Tuesday. What it is *not* is a scale: Monday and Sunday are
 * one day apart on a calendar and are not alike, so nothing here reaches for
 * distance. Two weekdays that are not the same day still share the shape of a
 * working evening, which is the half-match — and `weekend` above is left doing
 * exactly the job it always did rather than being replaced by this.
 */
function weekdayMatch(a: IsoWeekday | undefined, b: IsoWeekday | undefined): number {
  if (a === undefined || b === undefined) return 0.5
  if (a === b) return 1
  const working = (day: IsoWeekday): boolean => day <= 5
  return working(a) === working(b) ? 0.25 : 0
}

/**
 * How the five features are weighed, and why the two new ones are light.
 *
 * AUD-0007's own stated risk: *"every added feature narrows the comparable set,
 * and the set is already often empty."* At the weight of `block`, a weekday
 * would make "evenings like this one" mean *this evening*, and the app would go
 * back to reporting nothing comparable — the failure the finding exists to
 * repair, arriving from the other side. Half a unit each, against `block` and
 * `strain` at two, is enough to break a tie between a Tuesday and a Saturday and
 * not enough to decide anything on its own.
 */
const SIMILARITY_WEIGHTS = {
  block: 2,
  strain: 2,
  weekend: 1,
  child: 1,
  minutes: 1,
  weekday: 0.5,
  load: 0.5,
} as const

/**
 * How much one evening resembles another, 0–1.
 *
 * Deliberately a handful of coarse features rather than everything the
 * situation knows. A fingerprint fine enough to be unique matches nothing, and
 * section 22 forbids inventing precision — a similarity of 0.6 here means
 * "quite like it", not a measurement.
 *
 * **A record written before a feature existed compares as unknown on it**, which
 * is G-009 applied to comparison: not a mismatch, and not a match either. That
 * is what lets a feature be added without re-scoping every belief the app
 * already holds.
 */
export function similarity(a: DecisionContext, b: DecisionContext): number {
  const parts = [
    [blockMatch(a.block, b.block), SIMILARITY_WEIGHTS.block],
    [strainMatch(a.strain, b.strain), SIMILARITY_WEIGHTS.strain],
    [a.weekend === b.weekend ? 1 : 0, SIMILARITY_WEIGHTS.weekend],
    [knownMatch(a.childPresent, b.childPresent), SIMILARITY_WEIGHTS.child],
    [minutesMatch(a.usableMinutes, b.usableMinutes), SIMILARITY_WEIGHTS.minutes],
    [weekdayMatch(a.dayOfWeek, b.dayOfWeek), SIMILARITY_WEIGHTS.weekday],
    [loadMatch(a.load, b.load), SIMILARITY_WEIGHTS.load],
  ] as const

  const total = parts.reduce((sum, [, weight]) => sum + weight, 0)
  return parts.reduce((sum, [value, weight]) => sum + value * weight, 0) / total
}

/**
 * How much a piece of evidence fades with age.
 *
 * Never below 0.6, and that floor is the point: section 16 says old evidence
 * from another life season "remains visible but may be less predictive", not
 * that it stops counting. Recency is allowed to break a tie between two similar
 * evenings and is not allowed to outrank similarity, which is section 20's
 * "context similarity matters" read literally.
 */
export function recencyFactor(days: number): number {
  return 0.6 + 0.4 * Math.exp(-Math.max(0, days) / 60)
}

// ---------------------------------------------------------------------------
// The beliefs
// ---------------------------------------------------------------------------

export interface WeightedEpisode {
  readonly episode: Episode
  readonly similarity: number
  readonly weight: number
}

/**
 * One piece of evidence, and where it came from — the owner's requirement 2.
 *
 * This used to be a bare `RecordId`, which meant "3 comparable results" could
 * be three things the owner said, three things the app worked out, or a mix,
 * and nothing on any screen could tell him which. Once the app can write
 * outcomes he never typed, that is not a reporting gap — it is the difference
 * between a belief he can sensibly correct and one he cannot.
 *
 * So provenance travels with the evidence rather than being recoverable from
 * it. `fromOwner` is the question a reader actually has, and it is a separate
 * field from `reliability` on purpose: how far a reading moved a belief and
 * whether a person said it are different questions, and D-059 turns on not
 * letting the first answer the second (D-014).
 */
export interface EvidenceRef {
  readonly record: RecordId
  readonly source: ProvenanceSource
  /** True when the owner said it; false when something concluded it for him. */
  readonly fromOwner: boolean
  /** What this source was worth for the concept this outcome speaks to. */
  readonly reliability: number
}

/**
 * A lifecycle event is something the owner did.
 *
 * Follow-through and appetite are learned from starts, inabilities and
 * declines, and nothing in the system may write one on the owner's behalf —
 * inference can close a loop the owner opened and may never open one
 * (requirement 4). `tests/synthetic/inferred-evidence.test.ts` asserts it
 * rather than leaving it to this comment.
 */
function ownerEvidence(record: RecordId): EvidenceRef {
  return { record, source: 'owner', fromOwner: true, reliability: 1 }
}

/** How many of these the owner said, and how many something worked out. */
export function evidenceMix(evidence: readonly EvidenceRef[]): {
  readonly stated: number
  readonly concluded: number
} {
  let stated = 0
  for (const ref of evidence) if (ref.fromOwner) stated += 1
  return { stated, concluded: evidence.length - stated }
}

/**
 * The mix in one ordinary line, for a surface that has room for one.
 *
 * Never says "3 comparable results" without saying what they were, because
 * that is the sentence requirement 2 exists to prevent.
 */
export function describeEvidenceMix(evidence: readonly EvidenceRef[]): string | undefined {
  const { stated, concluded } = evidenceMix(evidence)
  if (stated + concluded === 0) return undefined
  const answered = stated === 1 ? '1 you answered' : `${stated} you answered`
  const worked = concluded === 1 ? '1 worked out' : `${concluded} worked out`
  if (concluded === 0) return answered
  if (stated === 0) return `${worked} from your own readings`
  return `${answered}, ${worked} from your own readings`
}

export interface LearnedEffect {
  /** The prior, pulled toward what was observed. */
  readonly now: number
  readonly tomorrow: number
  /** Which of the two the evidence actually speaks to. */
  readonly moved: 'now' | 'tomorrow' | 'neither'
  /** Comparable episodes with an answered result. */
  readonly samples: number
  /** How far the observation pulled the prior, 0–1. */
  readonly pull: number
  readonly evidence: readonly EvidenceRef[]
  /** Owner-facing, when there is enough to say anything. */
  readonly summary: string | undefined
  /**
   * What this belief is about, in the app's one name for an action —
   * QA-83-002.
   *
   * Present whether or not there is a `summary`, because the control that
   * corrects the belief has to name it even where the sentence is withheld.
   * Named to one object only where the pooled episodes agree on one.
   */
  readonly named: string
  readonly corrected: boolean
}

/**
 * How far this move's intended end state actually gets, in situations like this.
 *
 * **Distinct from follow-through, and the distinction is the point of
 * DEF-0020.** Follow-through asks whether the move can be done at all here —
 * evidence about the *situation*, from unable-now. This asks whether doing it
 * reaches what it was for. Clearing the kitchen every time it is suggested and
 * only ever half-clearing it is perfect follow-through and a poor result, and
 * folding the two would have the app say "something usually gets in the way" of
 * an evening where nothing did.
 *
 * The prior is 1 — a move achieves its aim. So *achieved* sits at the prior and
 * says nothing, and only *partly* and *not at all* speak. That is what stops a
 * move with two measurable aspects collecting two positive rewards where a move
 * with one collects a single one: **the result can only ever count against.**
 */
export interface LearnedResult {
  /** 0–1: how far the intended end state gets, in situations like this. */
  readonly reached: number
  readonly samples: number
  readonly pull: number
  readonly evidence: readonly EvidenceRef[]
  readonly note: string
  readonly corrected: boolean
}

/**
 * How hard this move actually feels to this owner, in situations like this.
 *
 * Section 10 asks the app to learn "how comfortable it felt" and "whether an
 * approach style was easier". Unlike result and follow-through, this is
 * **signed both ways**, and for a principled reason: their priors are ceilings,
 * so only failure is informative. Friction's prior is a middling estimate per
 * move, so "easier than we assumed" is real news about this owner.
 */
export interface LearnedFriction {
  /** 0–1, higher is harder. The move profile's friction, moved by experience. */
  readonly friction: number
  readonly samples: number
  readonly pull: number
  readonly evidence: readonly EvidenceRef[]
  readonly note: string
  readonly corrected: boolean
}

export interface LearnedFollowThrough {
  /** 0–1: how often this could actually be done in situations like this. */
  readonly rate: number
  readonly samples: number
  readonly pull: number
  readonly evidence: readonly EvidenceRef[]
  readonly note: string
  readonly corrected: boolean
}

export interface LearnedAppetite {
  /** 0–1: how often the owner passed on this in situations like this. */
  readonly turnedDown: number
  readonly samples: number
  readonly pull: number
  readonly evidence: readonly EvidenceRef[]
  readonly note: string
  readonly corrected: boolean
}

export interface LearningIndex {
  readonly episodes: readonly Episode[]
  /**
   * What has actually followed a move, observed rather than asked for (D-089).
   *
   * Deliberately beside the five learned beliefs rather than folded into
   * `effect`. Every belief above is built from a judgment somebody supplied;
   * this is built from readings the app took, against a comparison group of
   * occasions without the move. Merging them would put an opinion and an
   * observation back into one number, which is QA-A1 and, one level down,
   * DEF-0020.
   *
   * Undefined for a verb whose profile declares no observable state dimension
   * — most of them — and present-but-withheld when the record has not enough
   * of either group to compare.
   */
  associationFor(target: ActionTarget): ObservedAssociation | undefined
  readonly associations: readonly ObservedAssociation[]
  effectFor(verb: ActionVerb, context: DecisionContext): LearnedEffect
  resultFor(verb: ActionVerb, context: DecisionContext): LearnedResult
  followThroughFor(verb: ActionVerb, context: DecisionContext): LearnedFollowThrough
  appetiteFor(verb: ActionVerb, context: DecisionContext): LearnedAppetite
  frictionFor(verb: ActionVerb, context: DecisionContext): LearnedFriction
  /** Beliefs the owner has ruled out, and when. */
  readonly rejected: ReadonlyMap<string, Instant>
}

interface Moment {
  readonly now: Instant
  readonly zone: TimeZoneId
  /** Needed to read reliability per concept rather than per source (D-059). */
  readonly concepts: ConceptRegistry
  /**
   * Needed to name the action a belief is about — QA-83-002.
   *
   * The same reason `concepts` is here: a sentence this file writes for the
   * owner cannot be composed from a verb alone. It is the decision index
   * rather than the store's, because the engine's own routines — a walk,
   * winding down — are standing entities and resolve nowhere else.
   */
  readonly entities: EntityIndex
}

/**
 * The beliefs the owner has told the app to stop holding (section 62).
 *
 * The latest correction for a key wins, so a `restore` after a `reject` simply
 * removes the watershed. Append-first history needs no other undo.
 */
export function rejectedBeliefs(view: MemoryView): ReadonlyMap<string, Instant> {
  const latest = new Map<string, { at: Instant; stance: 'reject' | 'restore' }>()
  for (const record of view.history.effective) {
    if (record.kind !== 'belief-correction') continue
    const held = latest.get(record.belief)
    if (held === undefined || record.occurredAt >= held.at) {
      latest.set(record.belief, { at: record.occurredAt, stance: record.stance })
    }
  }

  const out = new Map<string, Instant>()
  for (const [key, held] of latest) {
    if (held.stance === 'reject') out.set(key, held.at)
  }
  return out
}

/**
 * Episodes of one kind of move that resemble the situation being decided.
 *
 * `after` is the watershed: when the owner has rejected a belief, everything
 * recorded up to that moment stops counting toward it and what happens
 * afterwards counts normally. Section 62 asks the app to stop reasserting a
 * corrected belief "unless new evidence genuinely supports revisiting it", and
 * that is what new evidence means here — evidence the owner has not already
 * seen and disagreed with. It needs no threshold nobody chose.
 */
export function comparableEpisodes(
  episodes: readonly Episode[],
  verb: ActionVerb,
  context: DecisionContext,
  moment: { readonly now: Instant; readonly zone: TimeZoneId },
  after?: Instant,
): readonly WeightedEpisode[] {
  const today = localDayIdAt(moment.now, moment.zone)
  const out: WeightedEpisode[] = []

  for (const episode of episodes) {
    if (episode.semantics.target.verb !== verb) continue
    if (episode.shownAt > moment.now) continue
    if (after !== undefined && episode.shownAt <= after) continue

    const theirs = episode.context
    // An episode with no context recorded cannot claim to resemble tonight. It
    // is still history; it is not evidence about a situation.
    if (theirs === undefined) continue

    const howAlike = similarity(theirs, context)
    if (howAlike < RECOGNISABLE) continue

    const days = localDaysBetween(episode.dayId, today)
    out.push({ episode, similarity: howAlike, weight: howAlike * recencyFactor(days) })
  }

  return out
}

/**
 * The same selection, under the name the rest of this file already used.
 *
 * Exported above rather than duplicated because **"a situation like this one"
 * has to mean one thing.** `insights.ts` counts raw answers over the set a
 * belief was computed from, and if it drew that set with its own filter the two
 * would eventually disagree — the card would say "4 evenings like tonight" over
 * a belief that had counted five. That is DEF-0033's shape with numbers instead
 * of sentences, so there is one definition and both read it.
 */
function comparable(
  episodes: readonly Episode[],
  verb: ActionVerb,
  context: DecisionContext,
  moment: Moment,
  after: Instant | undefined,
): readonly WeightedEpisode[] {
  return comparableEpisodes(episodes, verb, context, moment, after)
}

function shrink(prior: number, observed: number, n: number): { value: number; pull: number } {
  const pull = n / (n + PATIENCE)
  return { value: prior + (observed - prior) * pull, pull }
}

/**
 * One answered aspect of an episode, read as a number.
 *
 * Keyed on the aspect rather than on whether a sentiment happens to be present.
 * The old test — "it has a sentiment, so it is a result" — is what let four
 * kinds of evidence become one belief (DEF-0020).
 *
 * **It asks nothing about where the record came from.** Four questions decide
 * whether an outcome is legible here — it is an outcome, it is about this
 * episode, the aspect matches, the observation reads as a number — and
 * provenance is not one of them. That is the owner's requirement 3: an outcome
 * the app derived travels the same path as one the owner tapped, so there is no
 * second outcome path to keep in step with this one. What provenance decides is
 * how much the answer is *worth*, below, and never whether it is heard.
 */
function answerOf(
  episode: Episode,
  aspect: 'result' | 'effect' | 'comfort',
  read: (value: FactValue) => number | undefined,
): { value: number; record: OutcomeRecord } | undefined {
  for (const outcome of episode.outcomes) {
    if (outcome.aspect !== aspect) continue
    const value = read(outcome.observation)
    if (value === undefined) continue
    return { value, record: outcome }
  }
  return undefined
}

/**
 * What this outcome is worth, given where it came from and what it measures.
 *
 * D-059: reliability is a property of the pair. A derived reading of a night's
 * sleep and a model's guess at how somebody feels are not the same evidence,
 * and a table keyed on the source alone cannot tell them apart. `measures` on
 * the move profile is what supplies the second half of the pair.
 */
function evidenceFor(
  record: OutcomeRecord,
  measures: ConceptId | undefined,
  concepts: ConceptRegistry,
): EvidenceRef {
  const source = evidenceSourceOf(record)
  const reliability =
    measures === undefined
      ? concepts.reliabilityFor(UNREGISTERED, source)
      : concepts.reliabilityFor(measures, source)
  return { record: record.id, source, fromOwner: source === 'owner', reliability }
}

/** A concept nobody registered, so the lookup lands on the default table. */
const UNREGISTERED = 'reliability.default' as ConceptId

/**
 * What the pooled evidence is about, named the way the app names an action.
 *
 * QA-83-002. This used to be `verbLabel(verb)` — the eyebrow word on a
 * recommendation card — so a belief built entirely from walks read *"Move has
 * made little difference"* under a headline reading *"Move for 25 minutes: a
 * walk."* and beside an evidence panel already saying *"getting out for a
 * walk"*. Four registers for one thing, on one screen.
 *
 * **The object is named only where the pooled episodes agree on one**, which
 * is `patternName`'s rule in `insights.ts`, applied at the layer the belief is
 * actually written. An `effect` belief pools every episode with this verb, so
 * naming one object across a pooled walk and a pooled bike ride would state a
 * claim narrower than its own evidence — the mirror of the error D-153
 * polices, and just as wrong.
 */
function namedAction(
  verb: ActionVerb,
  objects: readonly EntityRef[],
  entities: EntityIndex,
): string {
  const distinct = new Set(objects.map((object) => object.id))
  const first = objects[0]
  const label = distinct.size === 1 && first !== undefined ? entities.labelFor(first) : undefined
  return patternNameFor(verb, label)
}

/**
 * What the app has learned, in one line the owner can disagree with.
 *
 * Section 61 gives the target almost word for word — "This has worked several
 * times in situations like tonight" — and the only change made to it is naming
 * the move, because losing the noun is the failure section 3 is about.
 */
function summarise(
  named: string,
  observed: number,
  samples: number,
  block: DayBlock,
): string | undefined {
  if (samples < 1) return undefined
  const when = horizonWord(block)
  const often = samples === 1 ? 'once' : samples < 4 ? 'a few times' : 'several times'

  if (observed >= 0.6) return `${named} has worked ${often} in situations like ${when}.`
  if (observed <= 0.3) {
    return samples === 1
      ? `${named} did not do much the one time in situations like ${when}.`
      : `${named} has not done much ${often} in situations like ${when}.`
  }
  return `${named} has made little difference in situations like ${when}.`
}

// ---------------------------------------------------------------------------

export function buildLearning(
  episodes: readonly Episode[],
  view: MemoryView,
  moment: Moment,
): LearningIndex {
  const rejected = rejectedBeliefs(view)
  const cache = new Map<string, unknown>()

  /*
   * Worked out once per history rather than per candidate: it reads every
   * reading of a concept in the record, and the ranking asks about it for each
   * of a handful of moves on every decision.
   */
  const associations = observedAssociations(
    episodes,
    view,
    { now: moment.now, zone: moment.zone, concepts: moment.concepts },
    /*
     * The watershed the owner sets, keyed by action scope.
     *
     * `rejectedBeliefs` already folds `belief-correction` records into "this
     * belief, rejected at this moment"; an association key carries an action
     * scope where the others carry a verb, so the same map serves both without
     * a second correction path.
     */
    new Map(
      [...rejected]
        .filter(([key]) => key.startsWith('association:'))
        .map(([key, at]) => [key.slice('association:'.length), at]),
    ),
  )
  const associationsByScope = new Map(associations.map((entry) => [entry.scope, entry]))

  const memo = <T>(key: string, build: () => T): T => {
    const held = cache.get(key)
    if (held !== undefined) return held as T
    const made = build()
    cache.set(key, made)
    return made
  }

  const cacheKey = (aspect: BeliefAspect, verb: ActionVerb, context: DecisionContext): string =>
    [
      aspect,
      verb,
      context.block,
      context.weekend,
      context.strain,
      context.childPresent ?? '?',
      context.usableMinutes ?? '?',
    ].join('|')

  /**
   * Answered aspects of comparable episodes, weighted.
   *
   * The weight is `similarity × recency × reliability`. Similarity dominates
   * because section 20 says context similarity matters more than date
   * proximity; recency is a gentle multiplier on it; and reliability is the
   * third term D-059 adds — how far a reading from *this* source, about *this*
   * concept, is entitled to move a belief. Adding it here rather than building
   * a parallel learner is the owner's requirement 1: one weight, one path,
   * three reasons an evening might count for less.
   */
  /**
   * One comparable episode's contribution, and what it was about.
   *
   * `object` is carried so a belief can be named under the pooled-object rule
   * — QA-83-002. Without it the set that decides whether one object may be
   * named had already been reduced to numbers.
   */
  interface Contributing {
    readonly weight: number
    readonly value: number
    readonly evidence: EvidenceRef
    readonly object: EntityRef
  }

  const gather = (
    verb: ActionVerb,
    context: DecisionContext,
    aspect: 'result' | 'effect' | 'comfort',
    read: (value: FactValue) => number | undefined,
    after: Instant | undefined,
    onlyCompleted: boolean,
  ): Contributing[] => {
    const measures = profileFor(verb).measures
    const out: Contributing[] = []
    for (const found of comparable(episodes, verb, context, moment, after)) {
      if (onlyCompleted && found.episode.state !== 'completed') continue
      const answer = answerOf(found.episode, aspect, read)
      if (answer === undefined) continue
      const evidence = evidenceFor(answer.record, measures, moment.concepts)
      out.push({
        weight: found.weight * evidence.reliability,
        value: answer.value,
        evidence,
        // Carried so a belief can name what it is about — QA-83-002. The
        // pooled set is what decides whether one object may be named, so the
        // set has to keep hold of them.
        object: found.episode.semantics.target.object,
      })
    }
    return out
  }

  const effectFor = (verb: ActionVerb, context: DecisionContext): LearnedEffect =>
    memo(cacheKey('effect', verb, context), () => {
      const profile = profileFor(verb)
      const after = rejected.get(beliefKey('effect', verb))
      const corrected = after !== undefined

      /*
       * Only completed episodes with an answered result.
       *
       * This is where section 20's first two rules are structural rather than
       * stated: a declined episode never reaches this filter, and neither does
       * an unable-now one. There is no branch here that could mistake either
       * for evidence that the move does not work, because neither is in the
       * set being looked at.
       */
      const contributing = gather(verb, context, 'effect', effectValueOf, after, true)

      const n = contributing.reduce((sum, entry) => sum + entry.weight, 0)
      if (n === 0) {
        return {
          now: profile.now,
          tomorrow: profile.tomorrow,
          moved: 'neither',
          samples: 0,
          pull: 0,
          evidence: [],
          summary: undefined,
          named: patternNameFor(verb, undefined),
          corrected,
        }
      }

      const observed = contributing.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / n
      const named = namedAction(
        verb,
        contributing.map((entry) => entry.object),
        moment.entities,
      )

      // Which number the evidence speaks to is decided by when the question was
      // asked, not by preference: a move judged twenty minutes later says
      // something about that evening, and a move judged the next morning says
      // something about the morning. Neither answers for the other.
      /*
       * Which belief an outcome moves — S1a, and the widening is one word.
       *
       * `now` is what the move was worth in the block it happened in;
       * `tomorrow` is what it was worth afterwards. A judgement made the next
       * morning is about afterwards, and so is one made in three days or in a
       * week — the horizons differ in *when the answer exists*, not in which
       * question it answers. Only `same-block` speaks to the block itself.
       */
      const speaksTo = profile.outcome.when === 'same-block' ? 'now' : 'tomorrow'
      const moved = shrink(speaksTo === 'now' ? profile.now : profile.tomorrow, observed, n)

      return {
        now: speaksTo === 'now' ? moved.value : profile.now,
        tomorrow: speaksTo === 'tomorrow' ? moved.value : profile.tomorrow,
        moved: speaksTo,
        samples: contributing.length,
        pull: moved.pull,
        evidence: contributing.map((entry) => entry.evidence),
        named,
        summary:
          moved.pull < 0.2
            ? undefined
            : summarise(named, observed, contributing.length, context.block),
        corrected,
      }
    })

  const resultFor = (verb: ActionVerb, context: DecisionContext): LearnedResult =>
    memo(cacheKey('result', verb, context), () => {
      const after = rejected.get(beliefKey('result', verb))
      const corrected = after !== undefined

      const contributing = gather(verb, context, 'result', resultValueOf, after, true)

      const n = contributing.reduce((sum, entry) => sum + entry.weight, 0)
      if (n === 0) {
        return {
          reached: 1,
          samples: 0,
          pull: 0,
          evidence: [],
          note: 'no reason yet to think this falls short',
          corrected,
        }
      }

      const observed = contributing.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / n
      // The prior is 1: a move achieves what it is for until something says
      // otherwise. Achieving it therefore moves nothing, which is what keeps a
      // two-aspect move from being rewarded twice for one good evening.
      const moved = shrink(1, observed, n)

      return {
        reached: moved.value,
        samples: contributing.length,
        pull: moved.pull,
        evidence: contributing.map((entry) => entry.evidence),
        note:
          moved.value >= 1
            ? 'no reason yet to think this falls short'
            : moved.value < 0.6
              ? 'this rarely gets all the way there'
              : 'this does not always get all the way there',
        corrected,
      }
    })

  const frictionFor = (verb: ActionVerb, context: DecisionContext): LearnedFriction =>
    memo(cacheKey('friction', verb, context), () => {
      const prior = profileFor(verb).friction
      const after = rejected.get(beliefKey('friction', verb))
      const corrected = after !== undefined

      const contributing = gather(verb, context, 'comfort', comfortFrictionOf, after, false)

      const n = contributing.reduce((sum, entry) => sum + entry.weight, 0)
      if (n === 0) {
        return {
          friction: prior,
          samples: 0,
          pull: 0,
          evidence: [],
          note: 'nothing said about how hard this is',
          corrected,
        }
      }

      const observed = contributing.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / n
      const moved = shrink(prior, observed, n)

      return {
        friction: moved.value,
        samples: contributing.length,
        pull: moved.pull,
        evidence: contributing.map((entry) => entry.evidence),
        note:
          moved.value > prior + 0.05
            ? 'harder for you than it looks'
            : moved.value < prior - 0.05
              ? 'easier for you than it looks'
              : 'about as hard as it looks',
        corrected,
      }
    })

  const followThroughFor = (verb: ActionVerb, context: DecisionContext): LearnedFollowThrough =>
    memo(cacheKey('follow-through', verb, context), () => {
      const after = rejected.get(beliefKey('follow-through', verb))
      const corrected = after !== undefined

      let managed = 0
      let blocked = 0
      const evidence: EvidenceRef[] = []

      for (const found of comparable(episodes, verb, context, moment, after)) {
        const state = found.episode.state
        if (state === 'started' || state === 'completed') {
          managed += found.weight
          evidence.push(ownerEvidence(found.episode.recommendation))
        } else if (state === 'unable-now') {
          blocked += found.weight
          evidence.push(ownerEvidence(found.episode.recommendation))
        }
      }

      const n = managed + blocked
      if (n === 0) {
        return {
          rate: 1,
          samples: 0,
          pull: 0,
          evidence: [],
          note: 'nothing has stopped this before',
          corrected,
        }
      }

      // The prior is 1: assume a move can be done until something says it could
      // not. Section 20 — unable-now is evidence about the situation, and this
      // is the only place it lands.
      const moved = shrink(1, managed / n, n)
      const sampleCount = evidence.length
      return {
        rate: moved.value,
        samples: sampleCount,
        pull: moved.pull,
        evidence,
        note:
          blocked === 0
            ? 'nothing has stopped this before'
            : moved.value < 0.6
              ? 'something usually gets in the way of this'
              : 'this has been blocked before',
        corrected,
      }
    })

  const appetiteFor = (verb: ActionVerb, context: DecisionContext): LearnedAppetite =>
    memo(cacheKey('appetite', verb, context), () => {
      const after = rejected.get(beliefKey('appetite', verb))
      const corrected = after !== undefined

      let refused = 0
      let offered = 0
      const evidence: EvidenceRef[] = []

      for (const found of comparable(episodes, verb, context, moment, after)) {
        offered += found.weight
        if (found.episode.state !== 'declined') continue
        // Asking for a different suggestion is not the same as refusing this
        // one, and counting them the same would turn "show me something else"
        // into a standing objection.
        const strength = found.episode.wantedAnother ? WANTED_ANOTHER_WEIGHT : 1
        refused += found.weight * strength
        evidence.push(ownerEvidence(found.episode.recommendation))
      }

      if (offered === 0) {
        return {
          turnedDown: 0,
          samples: 0,
          pull: 0,
          evidence: [],
          note: 'never been offered before in a situation like this',
          corrected,
        }
      }

      const moved = shrink(0, refused / offered, offered)
      return {
        turnedDown: moved.value,
        samples: evidence.length,
        pull: moved.pull,
        evidence,
        /*
         * Never "this does not work".
         *
         * Section 20's first rule. A refusal is the owner exercising the
         * sovereignty section 4.3 gives them, and reading it as a verdict on
         * the move would punish them for saying no — which is exactly the
         * mistake that makes an app feel like it is arguing with you.
         */
        note:
          evidence.length === 0
            ? 'nothing said either way'
            : evidence.length === 1
              ? 'passed on once before in a situation like this'
              : `passed on ${evidence.length} times before in situations like this`,
        corrected,
      }
    })

  return {
    episodes,
    effectFor,
    resultFor,
    followThroughFor,
    appetiteFor,
    frictionFor,
    rejected,
    associations,
    associationFor: (target) => associationsByScope.get(actionScopeOf(target)),
  }
}

/** An empty index, for a history with nothing in it. */
export function noLearning(view: MemoryView, moment: Moment): LearningIndex {
  return buildLearning([], view, moment)
}

export { WANTED_SOMETHING_ELSE }
