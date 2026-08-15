import type { ConceptRegistry } from '../domain/concepts'
import { createEntityIndex, type EntityIndex } from '../domain/entities'
import {
  DEFAULT_WEEK_START,
  type Instant,
  type TimeZoneId,
  type WeekStartDay,
} from '../domain/time'
import type { FactState } from './facts'
import {
  createProjectionInput,
  factsProjection,
  historySummaryProjection,
  relationshipsProjection,
  type HistorySummary,
  type ProjectionCache,
  type ProjectionInput,
  type RelationshipGraph,
} from './projections'
import { resolveHistory, type ResolvedHistory } from './resolve'
import type { StoreSnapshot } from './store'

/**
 * Everything the system understands, as of one moment.
 *
 * Synchronous and pure: a snapshot plus a moment in, a view out. That is what
 * lets the whole meaning layer be tested without a browser, a database or the
 * app shell — a Phase 1 gate requirement — and it is what makes date and time
 * travel a matter of passing a different instant rather than a mode the rest
 * of the system has to know about.
 */

export interface ViewMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  readonly weekStartsOn?: WeekStartDay
  readonly concepts?: ConceptRegistry
}

export interface MemoryView {
  readonly snapshot: StoreSnapshot
  readonly input: ProjectionInput
  readonly history: ResolvedHistory
  readonly entities: EntityIndex
  readonly facts: FactState
  readonly relationships: RelationshipGraph
  readonly summary: HistorySummary
}

export function buildView(
  snapshot: StoreSnapshot,
  moment: ViewMoment,
  cache?: ProjectionCache,
): MemoryView {
  const history = resolveHistory(snapshot.records)
  const entities = createEntityIndex(snapshot.entities)

  const input = createProjectionInput({
    history,
    entities,
    malformed: snapshot.malformed,
    now: moment.now,
    zone: moment.zone,
    weekStartsOn: moment.weekStartsOn ?? DEFAULT_WEEK_START,
    ...(moment.concepts === undefined ? {} : { concepts: moment.concepts }),
  })

  const build = <T>(projection: {
    name: string
    version: number
    build(input: ProjectionInput): T
  }): T => (cache === undefined ? projection.build(input) : cache.get(projection, input))

  return {
    snapshot,
    input,
    history,
    entities,
    facts: build(factsProjection),
    relationships: build(relationshipsProjection),
    summary: build(historySummaryProjection),
  }
}
