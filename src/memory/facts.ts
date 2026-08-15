import type { ConceptDefinition, ConceptRegistry } from '../domain/concepts'
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

function knowledgeFromRecord(record: ConceptBearingRecord): Knowledge<FactValue> {
  // A derived observation is something we worked out; a self-report or a
  // device reading is something we observed. Neither is a guess, and the
  // difference is exactly what the inspector has to be able to show.
  if (record.kind === 'observation' && record.method === 'derived') {
    return inferred(record.value, record.occurredAt, confidence(0.6), [record.id])
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
    const bucket = bucketFor(record.concept)
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

    const window = concepts.freshnessFor(record.concept)
    const aged = applyFreshness(knowledgeFromRecord(record), now, window, zone)
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

  const conceptIds = new Set<ConceptId>([
    ...concepts.all().map((definition) => definition.id),
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
      return applyFreshness(knowledgeFromRecord(latest), context.now, window, context.zone)
    }
    if (context.retracted) return unknown('retracted')
    if (bucket.lapsedContexts.length > 0) return unknown('lapsed')
    if (bucket.future.length > 0) {
      return unknown('never-observed', 'the only records for this are in the future')
    }
    return unknown('never-observed')
  }

  const winner = pool.reduce(laterOf)
  const rivals = pool.filter(
    (record) =>
      record !== winner &&
      sameMoment(record, winner) &&
      !factValuesEqual(record.value, winner.value),
  )
  if (rivals.length > 0) {
    return unknown('contradicted', `${rivals.length + 1} records disagree at the same moment`)
  }

  // Contexts are current because their window says so, not because a clock
  // has not run out yet.
  if (isContext(winner)) return explicit(winner.value, winner.occurredAt, winner.id)
  return knowledgeFromRecord(winner)
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
