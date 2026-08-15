import type { SemanticEntity } from '../domain/entities'
import type { RecordId } from '../domain/ids'
import type { CanonicalRecord } from '../domain/records'
import type { MalformedRow } from '../domain/validation'
import { recordToWire } from '../domain/wire'

/**
 * The canonical store (canonical plan sections 13.1 and 14).
 *
 * Canonical records are the source of truth. Everything else in the system is
 * a projection that can be thrown away and rebuilt, which is why this
 * interface has no update and no delete: history is append-first, a correction
 * is another record, and the worst a mistake can do is add a row.
 *
 * `localStorage` is explicitly not an implementation of this. Section 13.1 —
 * it is not the authoritative lifetime history store, and a synchronous
 * five-megabyte string bucket with no transactions could not honour the
 * all-or-nothing guarantee below even if it were big enough.
 */

export interface StoreSnapshot {
  readonly schemaVersion: number
  readonly records: readonly CanonicalRecord[]
  readonly entities: readonly SemanticEntity[]
  /**
   * Rows that could not be read, kept rather than dropped.
   *
   * A store that silently discards what it cannot parse tells the owner their
   * history is thinner than it is (sections 26 and 36).
   */
  readonly malformed: readonly MalformedRow[]
}

export interface AppendRejection {
  readonly id: RecordId
  readonly problem: string
}

export interface AppendResult {
  readonly appended: number
  /** Re-appending an identical record is a no-op, so an import can be re-run. */
  readonly skipped: number
  /**
   * If anything is rejected, nothing was written.
   *
   * A half-applied batch is the failure mode that makes a restore report
   * success it cannot deliver (section 29).
   */
  readonly rejected: readonly AppendRejection[]
}

export type StoreBackend = 'indexeddb' | 'memory'

export interface CanonicalStore {
  readonly backend: StoreBackend
  /** False for the in-memory fallback, so a surface can say so out loud. */
  readonly durable: boolean

  /** All-or-nothing. */
  append(records: readonly CanonicalRecord[]): Promise<AppendResult>
  putEntities(entities: readonly SemanticEntity[]): Promise<void>
  putMalformed(rows: readonly MalformedRow[]): Promise<void>
  snapshot(): Promise<StoreSnapshot>
  /** Transactional whole-store replacement, for load and restore. */
  replaceAll(snapshot: StoreSnapshot): Promise<void>
  clear(): Promise<void>
  close(): void
}

/**
 * A stable string for a record's content.
 *
 * Keys are sorted so that two records that mean the same thing hash the same
 * however their JSON happened to be ordered — which is what makes re-importing
 * the same file a no-op rather than a conflict.
 */
export function recordFingerprint(record: CanonicalRecord): string {
  return stableStringify(recordToWire(record))
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
  return `{${entries.join(',')}}`
}

/** FNV-1a. Small, fast, and good enough to notice that a cache is stale. */
export function hashString(text: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

export const EMPTY_SNAPSHOT: StoreSnapshot = {
  schemaVersion: 1,
  records: [],
  entities: [],
  malformed: [],
}
