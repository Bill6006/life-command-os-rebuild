import { currentConcept, type ConceptDefinition, type ConceptRegistry } from '../domain/concepts'
import type { RecordId } from '../domain/ids'
import {
  applyFreshness,
  confidence,
  explicit,
  inferred,
  shouldAsk,
  unknown,
  type Knowledge,
  type KnowledgeState,
} from '../domain/knowledge'
import {
  bearsConcept,
  evidenceSourceOf,
  factValuesEqual,
  type CanonicalRecord,
  type ConceptBearingRecord,
  type ContextRecord,
  type FactValue,
} from '../domain/records'
import type { Instant, TimeZoneId } from '../domain/time'
import { isPlainObject, type MalformedRow } from '../domain/validation'
import type { ConceptId } from '../domain/windows'
import type { ResolvedHistory } from './resolve'

/**
 * Resolving what is known right now (canonical plan sections 12, 17.1 and 63).
 *
 * Three ideas decide every answer here.
 *
 * **Narrower scope wins.** A statement about tonight beats a temporary
 * arrangement, which beats a standing one. That single rule is what makes
 * scenario G-002 work: full custody is a durable context that answers "is she
 * with you" indefinitely, travel is a situational context that overrides it for
 * a window, and tonight's explicit answer overrides both — without any of them
 * erasing the others.
 *
 * **A context's currency is its validity window, not a clock.** Durable context
 * does not go stale with age, which is why the app does not re-ask about a
 * settled arrangement every evening. Point-in-time evidence does age, against
 * the concept's own freshness.
 *
 * **Not knowing is an answer.** Every concept resolves to a `Knowledge`, and a
 * concept nobody has spoken to resolves to `unknown` with a reason — never to a
 * zero, an average or a default (G-009).
 */

export interface FactEntry {
  readonly concept: ConceptId
  readonly definition: ConceptDefinition
  readonly knowledge: Knowledge<FactValue>
  /** Every record that was looked at, for the inspector's reasoning trace. */
  readonly considered: readonly RecordId[]
  /** Whether the system should spend a question on this now. */
  readonly worthAsking: boolean
}

export interface FactState {
  readonly at: Instant
  readonly zone: TimeZoneId
  readonly entries: readonly FactEntry[]
  get(concept: ConceptId): FactEntry | undefined
  knowledgeFor(concept: ConceptId): Knowledge<FactValue>
  inState(state: KnowledgeState): readonly FactEntry[]
  /** Concepts a guide could usefully ask about, most material first. */
  readonly questions: readonly FactEntry[]
}

export interface FactResolutionInput {
  readonly history: ResolvedHistory
  readonly malformed: readonly MalformedRow[]
  readonly now: Instant
  readonly zone: TimeZoneId
  readonly concepts: ConceptRegistry
}

function isContext(record: ConceptBearingRecord): record is ContextRecord {
  return record.kind === 'context'
}

function contextInForce(record: ContextRecord, now: Instant): boolean {
  if (record.validFrom > now) return false
  return record.validUntil === undefined || now < record.validUntil
}

/** Higher wins. A statement about now outranks a window, which outranks forever. */
function scopeTier(record: ConceptBearingRecord): number {
  if (!isContext(record)) return 3
  return record.durability === 'situational' ? 2 : 1
}

function laterOf(a: ConceptBearingRecord, b: ConceptBearingRecord): ConceptBearingRecord {
  if (a.occurredAt !== b.occurredAt) return a.occurredAt > b.occurredAt ? a : b
  if (a.recordedAt !== b.recordedAt) return a.recordedAt > b.recordedAt ? a : b
  return a.id > b.id ? a : b
}

function sameMoment(a: ConceptBearingRecord, b: ConceptBearingRecord): boolean {
  return a.occurredAt === b.occurredAt && a.recordedAt === b.recordedAt
}

/**
 * Sources whose readings are conclusions rather than observations.
 *
 * A device reading is deliberately not here, and never was: a watch measuring
 * hours slept observed something, and treating it as second-hand would be the
 * source hierarchy D-059 rejects. What separates these three is not how much
 * they can be trusted — that is `reliability`, below, and a derived reading of
 * sleep hours outranks a device reading of soreness — but that **something
 * worked them out**, which the four knowledge states exist to keep visible.
 */
const CONCLUDED: readonly string[] = ['derived', 'model', 'legacy-import']

/**
 * What one record says, and in which of the four states (D-014, D-059).
 *
 * Two independent questions, and keeping them apart is the whole of this
 * function. **Which state** depends only on whether a person observed the thing
 * or something concluded it — a derived reading is `inferred` however good it
 * is, so no amount of reliability lets an inference be read as a stated fact.
 * **How much confidence** the inference carries is a property of the pair: this
 * source, measuring this concept.
 *
 * The flat 0.6 that used to sit here was the thing D-059 replaces. It said a
 * derived reading of a night's sleep and a model's guess at the owner's mood
 * were worth the same, which is the mistake section 8 already forbids one layer
 * down.
 */
function knowledgeFromRecord(
  record: ConceptBearingRecord,
  concepts: ConceptRegistry,
): Knowledge<FactValue> {
  const source = evidenceSourceOf(record)
  if (CONCLUDED.includes(source)) {
    const howSure = concepts.reliabilityFor(record.concept, source)
    return inferred(record.value, record.occurredAt, confidence(howSure), [record.id])
  }
  return explicit(record.value, record.occurredAt, record.id)
}

/** A malformed row we can at least tell which concept it was about. */
function conceptOfMalformed(row: MalformedRow): ConceptId | undefined {
  if (!isPlainObject(row.raw)) return undefined
  const concept = row.raw['concept']
  return typeof concept === 'string' ? (concept as ConceptId) : undefined
}

interface ConceptEvidence {
  readonly applicable: ConceptBearingRecord[]
  readonly staleOnes: ConceptBearingRecord[]
  readonly lapsedContexts: ConceptBearingRecord[]
  readonly future: ConceptBearingRecord[]
  readonly considered: RecordId[]
}

export function resolveFacts(input: FactResolutionInput): FactState {
  const { history, now, zone, concepts, malformed } = input

  const evidence = new Map<ConceptId, ConceptEvidence>()
  const bucketFor = (concept: ConceptId): ConceptEvidence => {
    const existing = evidence.get(concept)
    if (existing) return existing
    const created: ConceptEvidence = {
      applicable: [],
      staleOnes: [],
      lapsedContexts: [],
      future: [],
      considered: [],
    }
    evidence.set(concept, created)
    return created
  }

  for (const record of history.effective) {
    if (!bearsConcept(record)) continue
    /*
     * Through the alias table — AUD-0006's migration rule.
     *
     * A record keeps the id it was written with, because nothing rewrites
     * history. What resolves is the concept it is *about*, so an answer given
     * under `career.usable-time-tonight` and one given under `time.free-now` are
     * one belief with one freshness window rather than two half-empty ones.
     */
    const concept = currentConcept(record.concept)
    const bucket = bucketFor(concept)
    bucket.considered.push(record.id)

    if (record.occurredAt > now) {
      bucket.future.push(record)
      continue
    }

    if (isContext(record)) {
      if (contextInForce(record, now)) bucket.applicable.push(record)
      else bucket.lapsedContexts.push(record)
      continue
    }

    const window = concepts.freshnessFor(concept)
    const aged = applyFreshness(knowledgeFromRecord(record, concepts), now, window, zone)
    if (aged.state === 'stale') bucket.staleOnes.push(record)
    else bucket.applicable.push(record)
  }

  // Records that were retracted still tell us something: that we deliberately
  // stopped believing them.
  const retractedConcepts = new Set<ConceptId>()
  for (const record of history.displaced) {
    if (!bearsConcept(record)) continue
    bucketFor(record.concept).considered.push(record.id)
    if (history.retractedBy.has(record.id)) retractedConcepts.add(record.concept)
  }

  const malformedConcepts = new Set<ConceptId>()
  for (const row of malformed) {
    const concept = conceptOfMalformed(row)
    if (concept !== undefined) malformedConcepts.add(concept)
  }

  /*
   * Every concept the owner could answer, plus anything a record mentions.
   *
   * The registry is seeded in so that a concept nothing has ever been said
   * about still resolves to a **known** unknown — that is what lets the guide
   * ask about it and the export say the app has not heard.
   *
   * **A derived concept is excluded, and this is the boundary QA-82-005 is
   * about.** No record can ever carry one: the app works it out from concepts
   * that are recorded. Seeding it here manufactured a permanent `unknown` for
   * something the owner has no way to answer, and every surface that reads raw
   * fact state then repeated it — the review export said *"Child here right now
   * — never answered"* in the same document that had already printed *"Child
   * here right now — No — Adaya's school day is on until 15:00"* two sections
   * above.
   *
   * Excluding it here rather than in each of those surfaces is deliberate.
   * `coverage.ts` had its own exclusion and the export did not, which is the
   * shape of a defect that comes back: the next surface to walk this list will
   * not know it needs one either. The one place that knows a concept cannot be
   * recorded is the layer that resolves records.
   *
   * `evidence.keys()` still wins if a record somehow mentions one, because a
   * fact the store actually holds is more real than the registry's opinion
   * about it — and it would be a defect worth seeing rather than hiding.
   */
  const conceptIds = new Set<ConceptId>([
    ...concepts
      .all()
      .filter((definition) => definition.derived !== true)
      .map((definition) => definition.id),
    ...evidence.keys(),
    ...malformedConcepts,
  ])

  const entries: FactEntry[] = []
  for (const concept of conceptIds) {
    const definition = concepts.definitionFor(concept)
    const bucket = evidence.get(concept)
    const knowledge = resolveOne(bucket, {
      concept,
      now,
      zone,
      concepts,
      retracted: retractedConcepts.has(concept),
      malformedOnly: bucket === undefined && malformedConcepts.has(concept),
    })

    entries.push({
      concept,
      definition,
      knowledge,
      considered: bucket?.considered ?? [],
      worthAsking: shouldAsk(knowledge, definition.ask),
    })
  }

  entries.sort((a, b) => (a.concept < b.concept ? -1 : a.concept > b.concept ? 1 : 0))
  const byConcept = new Map(entries.map((entry) => [entry.concept, entry]))

  return {
    at: now,
    zone,
    entries,
    get: (concept) => byConcept.get(concept),
    knowledgeFor: (concept) => byConcept.get(concept)?.knowledge ?? unknown('never-observed'),
    inState: (state) => entries.filter((entry) => entry.knowledge.state === state),
    questions: entries.filter((entry) => entry.worthAsking),
  }
}

interface ResolveOneContext {
  readonly concept: ConceptId
  readonly now: Instant
  readonly zone: TimeZoneId
  readonly concepts: ConceptRegistry
  readonly retracted: boolean
  readonly malformedOnly: boolean
}

function resolveOne(
  bucket: ConceptEvidence | undefined,
  context: ResolveOneContext,
): Knowledge<FactValue> {
  if (bucket === undefined) {
    if (context.malformedOnly) {
      return unknown('malformed', 'the only rows mentioning this could not be read')
    }
    return unknown('never-observed')
  }

  const pool = highestTier(bucket.applicable)
  if (pool.length === 0) {
    if (bucket.staleOnes.length > 0) {
      // We knew this once. Say so, rather than pretending we never did.
      const latest = bucket.staleOnes.reduce(laterOf)
      const window = context.concepts.freshnessFor(context.concept)
      return applyFreshness(
        knowledgeFromRecord(latest, context.concepts),
        context.now,
        window,
        context.zone,
      )
    }
    if (context.retracted) return unknown('retracted')
    if (bucket.lapsedContexts.length > 0) return unknown('lapsed')
    if (bucket.future.length > 0) {
      return unknown('never-observed', 'the only records for this are in the future')
    }
    return unknown('never-observed')
  }

  const latest = pool.reduce(laterOf)
  const rivals = pool.filter(
    (record) =>
      record !== latest &&
      sameMoment(record, latest) &&
      !factValuesEqual(record.value, latest.value),
  )

  /*
   * Two readings of the same thing at the same instant — D-059.
   *
   * The old answer was `contradicted` for every such pair, which is honest and
   * throws away a real distinction: a watch and a morning recollection
   * disagreeing about last night are not two equally good guesses, and neither
   * are a bank feed and an estimate of a balance. So the more reliable source
   * **for this concept** wins, and the pair only goes unresolved when nothing
   * separates them.
   *
   * Note how narrow this is. It settles a genuine draw and nothing else: two
   * records at different moments are still ordered by D-012's rule, because a
   * later statement about the same night is a correction rather than a rival,
   * and reliability has no business overruling one.
   */
  let winner = latest
  if (rivals.length > 0) {
    const ranked = [latest, ...rivals]
      .map((record) => ({ record, worth: reliabilityOfRecord(record, context.concepts) }))
      .sort((a, b) => b.worth - a.worth)
    const best = ranked[0]
    const runnerUp = ranked[1]
    if (best === undefined || runnerUp === undefined || best.worth <= runnerUp.worth) {
      return unknown('contradicted', `${rivals.length + 1} records disagree at the same moment`)
    }
    winner = best.record
  }

  // Contexts are current because their window says so, not because a clock
  // has not run out yet.
  if (isContext(winner)) return explicit(winner.value, winner.occurredAt, winner.id)
  return knowledgeFromRecord(winner, context.concepts)
}

function reliabilityOfRecord(record: ConceptBearingRecord, concepts: ConceptRegistry): number {
  return concepts.reliabilityFor(record.concept, evidenceSourceOf(record))
}

function highestTier(records: readonly ConceptBearingRecord[]): readonly ConceptBearingRecord[] {
  let best = 0
  for (const record of records) best = Math.max(best, scopeTier(record))
  return records.filter((record) => scopeTier(record) === best)
}

export function conceptsMentionedBy(records: readonly CanonicalRecord[]): readonly ConceptId[] {
  const found = new Set<ConceptId>()
  for (const record of records) if (bearsConcept(record)) found.add(record.concept)
  return [...found]
}
