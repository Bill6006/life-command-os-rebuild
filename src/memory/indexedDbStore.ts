import type { SemanticEntity } from '../domain/entities'
import type { RecordId } from '../domain/ids'
import { sortRecords, type CanonicalRecord } from '../domain/records'
import type { MalformedRow } from '../domain/validation'
import {
  entityToWire,
  parseEntity,
  parseRecord,
  recordToWire,
  type RecordParseResult,
} from '../domain/wire'
import { planAppend } from './append'
import {
  recordFingerprint,
  type AppendResult,
  type CanonicalStore,
  type StoreSnapshot,
} from './store'

/**
 * The durable canonical store (canonical plan section 13.1).
 *
 * Records are held in their wire form — the same JSON an export produces —
 * and parsed on the way out. That has a specific consequence worth stating: a
 * row that has become unreadable on disk comes back as an inspectable
 * malformed row rather than as an exception, so corruption costs one entry
 * instead of the whole history.
 *
 * Every write runs inside a single transaction that either commits whole or
 * aborts whole.
 */

const RECORDS = 'records'
const ENTITIES = 'entities'
const MALFORMED = 'malformed'
const META = 'meta'
const DB_VERSION = 1
const SCHEMA_KEY = 'schemaVersion'
const UNREADABLE = '<unreadable>'
const NOTHING_APPENDED = { appended: 0, skipped: 0, rejected: [] } as const

export interface IndexedDbStoreOptions {
  /**
   * The database name.
   *
   * IndexedDB is scoped to an origin, not to a path, and Preview and
   * production are two paths on one github.io origin. Without a name per
   * target they would share one database, and synthetic QA data would land in
   * the same place as real history — exactly the separation section 33
   * requires.
   */
  readonly name: string
  readonly factory?: IDBFactory
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () =>
      reject(transaction.error ?? new DOMException('Transaction aborted', 'AbortError'))
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed'))
  })
}

export function indexedDbAvailable(
  factory: IDBFactory | undefined = globalThis.indexedDB,
): boolean {
  return factory !== undefined && factory !== null
}

export async function openIndexedDbStore(options: IndexedDbStoreOptions): Promise<CanonicalStore> {
  const factory = options.factory ?? globalThis.indexedDB
  if (!indexedDbAvailable(factory)) throw new Error('IndexedDB is not available')

  const open = factory.open(options.name, DB_VERSION)
  open.onupgradeneeded = () => {
    const db = open.result
    if (!db.objectStoreNames.contains(RECORDS)) db.createObjectStore(RECORDS, { keyPath: 'id' })
    if (!db.objectStoreNames.contains(ENTITIES)) db.createObjectStore(ENTITIES, { keyPath: 'id' })
    if (!db.objectStoreNames.contains(MALFORMED)) {
      db.createObjectStore(MALFORMED, { autoIncrement: true })
    }
    if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'key' })
  }

  const db = await requestToPromise(open)

  const readRecords = async (): Promise<{
    records: CanonicalRecord[]
    malformed: MalformedRow[]
  }> => {
    const transaction = db.transaction([RECORDS], 'readonly')
    const rows = await requestToPromise<unknown[]>(transaction.objectStore(RECORDS).getAll())

    const records: CanonicalRecord[] = []
    const unreadable: MalformedRow[] = []
    for (const [index, row] of rows.entries()) {
      const parsed: RecordParseResult = parseRecord(row, index)
      if (parsed.ok) records.push(parsed.record)
      else unreadable.push(parsed.row)
    }
    return { records: sortRecords(records) as CanonicalRecord[], malformed: unreadable }
  }

  return {
    backend: 'indexeddb',
    durable: true,

    append(incoming: readonly CanonicalRecord[]): Promise<AppendResult> {
      if (incoming.length === 0) return Promise.resolve(NOTHING_APPENDED)

      // Deliberately callback-driven rather than awaited between steps: an
      // IndexedDB transaction goes inactive as soon as control returns to the
      // event loop, and "read the ids, then decide, then write" has to happen
      // inside one transaction for the batch to be all-or-nothing.
      return new Promise<AppendResult>((resolve, reject) => {
        const transaction = db.transaction([RECORDS], 'readwrite')
        const store = transaction.objectStore(RECORDS)
        const ids = [...new Set(incoming.map((record) => record.id))]
        const existing = new Map<RecordId, string>()

        let outstanding = ids.length
        let result: AppendResult | undefined
        let abortedOnPurpose = false

        const decide = (): void => {
          const plan = planAppend(existing, incoming)
          result = plan.result
          if (plan.result.rejected.length > 0) {
            abortedOnPurpose = true
            transaction.abort()
            return
          }
          for (const record of plan.toWrite) store.put(recordToWire(record))
        }

        for (const id of ids) {
          const request = store.get(id)
          request.onsuccess = () => {
            const found: unknown = request.result
            if (found !== undefined) {
              const parsed = parseRecord(found, 0)
              // An unreadable row still occupies its id. Treating it as taken
              // stops a new record quietly overwriting something we could not
              // read and would therefore never miss.
              existing.set(id, parsed.ok ? recordFingerprint(parsed.record) : UNREADABLE)
            }
            outstanding -= 1
            if (outstanding === 0) decide()
          }
        }

        transaction.oncomplete = () => resolve(result ?? NOTHING_APPENDED)
        transaction.onabort = () => {
          if (abortedOnPurpose && result) resolve(result)
          else reject(transaction.error ?? new DOMException('Transaction aborted', 'AbortError'))
        }
        transaction.onerror = () => {
          if (!abortedOnPurpose) {
            reject(transaction.error ?? new Error('IndexedDB transaction failed'))
          }
        }
      })
    },

    async putEntities(incoming: readonly SemanticEntity[]): Promise<void> {
      if (incoming.length === 0) return
      const transaction = db.transaction([ENTITIES], 'readwrite')
      const store = transaction.objectStore(ENTITIES)
      for (const entity of incoming) store.put(entityToWire(entity))
      await transactionDone(transaction)
    },

    async putMalformed(rows: readonly MalformedRow[]): Promise<void> {
      if (rows.length === 0) return
      const transaction = db.transaction([MALFORMED], 'readwrite')
      const store = transaction.objectStore(MALFORMED)
      for (const row of rows) store.put(structuredClone(row))
      await transactionDone(transaction)
    },

    async snapshot(): Promise<StoreSnapshot> {
      const fromRecords = await readRecords()

      const transaction = db.transaction([ENTITIES, MALFORMED, META], 'readonly')
      const [entityRows, malformedRows, metaRows] = await Promise.all([
        requestToPromise<unknown[]>(transaction.objectStore(ENTITIES).getAll()),
        requestToPromise<unknown[]>(transaction.objectStore(MALFORMED).getAll()),
        requestToPromise<unknown[]>(transaction.objectStore(META).getAll()),
      ])

      const entities: SemanticEntity[] = []
      const malformed: MalformedRow[] = [...fromRecords.malformed]
      for (const [index, row] of entityRows.entries()) {
        const parsed = parseEntity(row, index)
        if (parsed.ok) entities.push(parsed.entity)
        else malformed.push(parsed.row)
      }
      for (const row of malformedRows) malformed.push(row as MalformedRow)

      const versionRow = metaRows.find(
        (row): row is { key: string; value: number } =>
          typeof row === 'object' && row !== null && (row as { key?: unknown }).key === SCHEMA_KEY,
      )

      return {
        schemaVersion: versionRow?.value ?? 1,
        records: fromRecords.records,
        entities,
        malformed,
      }
    },

    async replaceAll(snapshot: StoreSnapshot): Promise<void> {
      const transaction = db.transaction([RECORDS, ENTITIES, MALFORMED, META], 'readwrite')
      const records = transaction.objectStore(RECORDS)
      const entities = transaction.objectStore(ENTITIES)
      const malformed = transaction.objectStore(MALFORMED)
      const meta = transaction.objectStore(META)

      records.clear()
      entities.clear()
      malformed.clear()
      meta.clear()

      for (const record of snapshot.records) records.put(recordToWire(record))
      for (const entity of snapshot.entities) entities.put(entityToWire(entity))
      for (const row of snapshot.malformed) malformed.put(structuredClone(row))
      meta.put({ key: SCHEMA_KEY, value: snapshot.schemaVersion })

      await transactionDone(transaction)
    },

    async clear(): Promise<void> {
      const transaction = db.transaction([RECORDS, ENTITIES, MALFORMED, META], 'readwrite')
      for (const name of [RECORDS, ENTITIES, MALFORMED, META]) {
        transaction.objectStore(name).clear()
      }
      await transactionDone(transaction)
    },

    close(): void {
      db.close()
    },
  }
}
