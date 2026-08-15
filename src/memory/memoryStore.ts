import type { SemanticEntity } from '../domain/entities'
import type { EntityId, RecordId } from '../domain/ids'
import { sortRecords, type CanonicalRecord } from '../domain/records'
import type { MalformedRow } from '../domain/validation'
import { planAppend } from './append'
import {
  recordFingerprint,
  type AppendResult,
  type CanonicalStore,
  type StoreSnapshot,
} from './store'

/**
 * An in-memory canonical store.
 *
 * Two jobs. It is what the unit and synthetic suites run against, so the
 * meaning layer is testable with no browser and no app shell — a Phase 1 gate
 * requirement. And it is the fallback when IndexedDB is unavailable, which
 * happens in some private-browsing modes; in that case `durable` is false and
 * the QA surface says so rather than letting the owner assume their history is
 * being kept.
 */
export function createMemoryStore(initial?: StoreSnapshot): CanonicalStore {
  let records = new Map<RecordId, CanonicalRecord>()
  let entities = new Map<EntityId, SemanticEntity>()
  let malformed: MalformedRow[] = []
  let schemaVersion = initial?.schemaVersion ?? 1

  const load = (snapshot: StoreSnapshot): void => {
    records = new Map(snapshot.records.map((record) => [record.id, record]))
    entities = new Map(snapshot.entities.map((entity) => [entity.id, entity]))
    malformed = [...snapshot.malformed]
    schemaVersion = snapshot.schemaVersion
  }

  if (initial) load(initial)

  return {
    backend: 'memory',
    durable: false,

    append(incoming: readonly CanonicalRecord[]): Promise<AppendResult> {
      const fingerprints = new Map<RecordId, string>()
      for (const [id, record] of records) fingerprints.set(id, recordFingerprint(record))

      const plan = planAppend(fingerprints, incoming)
      // Nothing is written unless the whole batch is acceptable.
      for (const record of plan.toWrite) records.set(record.id, record)
      return Promise.resolve(plan.result)
    },

    putEntities(incoming: readonly SemanticEntity[]): Promise<void> {
      for (const entity of incoming) entities.set(entity.id, entity)
      return Promise.resolve()
    },

    putMalformed(rows: readonly MalformedRow[]): Promise<void> {
      malformed = [...malformed, ...rows]
      return Promise.resolve()
    },

    snapshot(): Promise<StoreSnapshot> {
      return Promise.resolve({
        schemaVersion,
        records: sortRecords([...records.values()]),
        entities: [...entities.values()],
        malformed: [...malformed],
      })
    },

    replaceAll(snapshot: StoreSnapshot): Promise<void> {
      load(snapshot)
      return Promise.resolve()
    },

    clear(): Promise<void> {
      records = new Map()
      entities = new Map()
      malformed = []
      return Promise.resolve()
    },

    close(): void {
      // Nothing to release.
    },
  }
}
