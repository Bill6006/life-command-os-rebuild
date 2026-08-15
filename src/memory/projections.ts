import type { ConceptRegistry } from '../domain/concepts'
import { coreConcepts } from '../domain/concepts'
import type { LifeDomainId } from '../domain/domains'
import type { EntityId, RecordId } from '../domain/ids'
import type { EntityIndex, EntityRelation, SemanticEntity } from '../domain/entities'
import type { RecordKind } from '../domain/records'
import {
  DEFAULT_WEEK_START,
  localDayIdAt,
  localWeekIdAt,
  type Instant,
  type LocalDayId,
  type LocalWeekId,
  type TimeZoneId,
  type WeekStartDay,
} from '../domain/time'
import type { MalformedRow } from '../domain/validation'
import { resolveFacts, type FactState } from './facts'
import type { ResolvedHistory } from './resolve'
import { hashString } from './store'

/**
 * Derived state (canonical plan section 14).
 *
 * "Derived state must be rebuildable from canonical records. A corrupted cache
 * must not corrupt lifetime history."
 *
 * Both halves are structural here rather than promised. A projection is a pure
 * function of canonical records plus a moment in time, so it can always be
 * rebuilt from scratch. And the cache is read-through only — nothing in this
 * file can write to the store, so the worst a bad cache entry can do is be
 * thrown away and recomputed.
 *
 * Every entry is stamped with a fingerprint of the input it was built from. On
 * the way out, a fingerprint that does not match is discarded rather than
 * trusted, which is what makes a stale or tampered entry a non-event.
 */

export interface ProjectionInput {
  readonly history: ResolvedHistory
  readonly entities: EntityIndex
  readonly malformed: readonly MalformedRow[]
  readonly now: Instant
  readonly zone: TimeZoneId
  readonly weekStartsOn: WeekStartDay
  readonly concepts: ConceptRegistry
  /** Computed once, when the input is assembled. */
  readonly fingerprint: string
}

export interface ProjectionInputParts {
  readonly history: ResolvedHistory
  readonly entities: EntityIndex
  readonly malformed: readonly MalformedRow[]
  readonly now: Instant
  readonly zone: TimeZoneId
  readonly weekStartsOn?: WeekStartDay
  readonly concepts?: ConceptRegistry
}

export function createProjectionInput(parts: ProjectionInputParts): ProjectionInput {
  const weekStartsOn = parts.weekStartsOn ?? DEFAULT_WEEK_START
  const concepts = parts.concepts ?? coreConcepts

  // Record ids are immutable and unique, so the id list plus the moment being
  // asked about identifies the inputs completely.
  const material = [
    parts.history.all.map((record) => record.id).join('|'),
    parts.entities
      .all()
      .map((entity) => entity.id)
      .join('|'),
    String(parts.malformed.length),
    String(parts.now),
    parts.zone,
    String(weekStartsOn),
  ].join('#')

  return {
    history: parts.history,
    entities: parts.entities,
    malformed: parts.malformed,
    now: parts.now,
    zone: parts.zone,
    weekStartsOn,
    concepts,
    fingerprint: `${hashString(material)}.${parts.history.all.length}`,
  }
}

export interface Projection<T> {
  readonly name: string
  readonly version: number
  build(input: ProjectionInput): T
}

export interface CacheEntry {
  readonly fingerprint: string
  readonly value: unknown
}

export interface ProjectionCacheStats {
  readonly hits: number
  readonly rebuilds: number
  /** Entries thrown away because their fingerprint did not match. */
  readonly discarded: number
}

export interface ProjectionCache {
  get<T>(projection: Projection<T>, input: ProjectionInput): T
  /** Rebuild regardless, and say whether the cache agreed. */
  verify<T>(
    projection: Projection<T>,
    input: ProjectionInput,
  ): { readonly rebuilt: T; readonly wasCached: boolean; readonly agreed: boolean }
  clear(): void
  readonly stats: ProjectionCacheStats
}

/**
 * @param backing Supply one to persist or to poison it. The cache never reads
 * anything it has not fingerprint-checked, so an untrusted backing store is a
 * performance risk and nothing more.
 */
export function createProjectionCache(
  backing: Map<string, CacheEntry> = new Map(),
): ProjectionCache {
  let hits = 0
  let rebuilds = 0
  let discarded = 0

  const keyFor = (projection: Projection<unknown>): string =>
    `${projection.name}@${projection.version}`

  return {
    get<T>(projection: Projection<T>, input: ProjectionInput): T {
      const key = keyFor(projection)
      const entry = backing.get(key)

      if (entry !== undefined) {
        if (entry.fingerprint === input.fingerprint) {
          hits += 1
          return entry.value as T
        }
        discarded += 1
        backing.delete(key)
      }

      const value = projection.build(input)
      rebuilds += 1
      backing.set(key, { fingerprint: input.fingerprint, value })
      return value
    },

    verify<T>(projection: Projection<T>, input: ProjectionInput) {
      const key = keyFor(projection)
      const entry = backing.get(key)
      const rebuilt = projection.build(input)
      const wasCached = entry !== undefined && entry.fingerprint === input.fingerprint
      return {
        rebuilt,
        wasCached,
        agreed: wasCached && JSON.stringify(entry?.value) === JSON.stringify(rebuilt),
      }
    },

    clear(): void {
      backing.clear()
    },

    get stats(): ProjectionCacheStats {
      return { hits, rebuilds, discarded }
    },
  }
}

// ---------------------------------------------------------------------------
// The projections themselves
// ---------------------------------------------------------------------------

export const factsProjection: Projection<FactState> = {
  name: 'facts',
  version: 1,
  build: (input) =>
    resolveFacts({
      history: input.history,
      malformed: input.malformed,
      now: input.now,
      zone: input.zone,
      concepts: input.concepts,
    }),
}

export interface GraphEdge {
  readonly from: EntityId
  readonly to: EntityId
  readonly relation: EntityRelation
}

export interface RelationshipEvent {
  readonly entity: EntityId
  readonly nature: string
  readonly at: Instant
  readonly source: RecordId
  readonly quality: 'positive' | 'neutral' | 'strained' | undefined
}

export interface RelationshipGraph {
  readonly nodes: readonly SemanticEntity[]
  readonly edges: readonly GraphEdge[]
  readonly events: readonly RelationshipEvent[]
  /** Edges pointing at an entity nobody defined. Visible, not silently dropped. */
  readonly dangling: readonly GraphEdge[]
  neighbours(id: EntityId): readonly GraphEdge[]
  eventsFor(id: EntityId): readonly RelationshipEvent[]
}

export const relationshipsProjection: Projection<RelationshipGraph> = {
  name: 'relationships',
  version: 1,
  build: (input) => {
    const nodes = input.entities.all()
    const edges: GraphEdge[] = []
    const dangling: GraphEdge[] = []

    for (const entity of nodes) {
      for (const link of entity.links) {
        const edge: GraphEdge = { from: entity.id, to: link.target, relation: link.relation }
        if (input.entities.get(link.target) === undefined) dangling.push(edge)
        else edges.push(edge)
      }
    }

    const events: RelationshipEvent[] = []
    for (const record of input.history.effective) {
      if (record.kind !== 'relationship-event') continue
      events.push({
        entity: record.withEntity.id,
        nature: record.nature,
        at: record.occurredAt,
        source: record.id,
        quality: record.quality,
      })
    }

    return {
      nodes,
      edges,
      events,
      dangling,
      neighbours: (id) => edges.filter((edge) => edge.from === id || edge.to === id),
      eventsFor: (id) => events.filter((event) => event.entity === id),
    }
  },
}

export interface HistorySummary {
  readonly total: number
  readonly effective: number
  readonly displaced: number
  readonly malformed: number
  readonly byKind: ReadonlyMap<RecordKind, number>
  readonly byDomain: ReadonlyMap<LifeDomainId, number>
  /**
   * Grouped in the timezone being viewed from, not the one each record was
   * written in — "my Tuesday" means the reader's Tuesday (section 15).
   */
  readonly byLocalDay: ReadonlyMap<LocalDayId, number>
  readonly byLocalWeek: ReadonlyMap<LocalWeekId, number>
  readonly firstAt: Instant | undefined
  readonly lastAt: Instant | undefined
}

function bump<K>(counts: Map<K, number>, key: K): void {
  counts.set(key, (counts.get(key) ?? 0) + 1)
}

export const historySummaryProjection: Projection<HistorySummary> = {
  name: 'history-summary',
  version: 1,
  build: (input) => {
    const byKind = new Map<RecordKind, number>()
    const byDomain = new Map<LifeDomainId, number>()
    const byLocalDay = new Map<LocalDayId, number>()
    const byLocalWeek = new Map<LocalWeekId, number>()

    for (const record of input.history.all) {
      bump(byKind, record.kind)
      for (const domain of record.domains) bump(byDomain, domain)
      bump(byLocalDay, localDayIdAt(record.occurredAt, input.zone))
      bump(byLocalWeek, localWeekIdAt(record.occurredAt, input.zone, input.weekStartsOn))
    }

    const first = input.history.all[0]
    const last = input.history.all[input.history.all.length - 1]

    return {
      total: input.history.all.length,
      effective: input.history.effective.length,
      displaced: input.history.displaced.length,
      malformed: input.malformed.length,
      byKind,
      byDomain,
      byLocalDay,
      byLocalWeek,
      firstAt: first?.occurredAt,
      lastAt: last?.occurredAt,
    }
  },
}

export const ALL_PROJECTIONS: readonly Projection<unknown>[] = [
  factsProjection,
  relationshipsProjection,
  historySummaryProjection,
]
