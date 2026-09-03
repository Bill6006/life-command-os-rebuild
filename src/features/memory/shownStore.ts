import type { LocalDayId } from '../../domain/time'
import type { ShownMove } from '../../intelligence/situation'

/**
 * What has been put in front of the owner today, kept across a session —
 * AUD-0025's durable half.
 *
 * ## The finding, and the half routing 81 already built
 *
 * D-043 settled that nothing is written when a screen renders, and every reason
 * it gives still holds: a row per render would be unreadable within a week,
 * would poison the duplication check, and would become learning evidence about
 * an evening nothing happened in. What was missing was **cheaper**: ignoring a
 * suggestion is a response, and the most common one, and the app could not count
 * it at all — so it repeated itself. The audit's reproduction is the identical
 * kitchen sentence at 06:30, 10:00, 14:00 and 19:00 of one day.
 *
 * Routing 81 built the count and kept it in a React ref. That closed the
 * within-render case and left the one an owner actually lives: **a phone picked
 * up at half past six, put down, and picked up again at seven in the evening is
 * two sessions**, and the second one had never heard of the first. The app went
 * back to repeating itself across exactly the gap the finding is about.
 *
 * ## What this is, and every way it is not history
 *
 * A **separate database**, holding one row per (move, owner-local day), upserted.
 * The audit's own list of what it must never be, each held by construction here
 * rather than by discipline elsewhere:
 *
 * - **Never a canonical record.** It is a different IndexedDB database from the
 *   owner's and the laboratory's, so nothing that walks the record log can see
 *   it, `replaceAll` cannot touch it, and a restore cannot bring it back.
 * - **Never in a backup or a fingerprint.** D-107's rule is that nothing about
 *   the transport may enter the identity of the thing transported. This is a
 *   fact about *screens*; a backup carrying it would make one owner's two
 *   sessions produce two different backups of one history.
 * - **Never evidence.** `tests/unit/architecture-guards.test.ts` fails the build
 *   if `learning.ts`, `insights.ts`, `association.ts` or any Timeline surface
 *   names `ShownMove` or `situation.shown`. The one reader is
 *   `recent-duplication`.
 * - **Never an append.** Every write is a `put` on a fixed key, so a day of
 *   opening the app costs one row per move rather than one row per look. The
 *   audit names write amplification directly: *"an upsert per render is fine, an
 *   append is not."*
 *
 * ## And it only ever holds today
 *
 * The count is about within-day repetition and nothing else, so anything from a
 * previous owner-local day is dropped the moment the store is opened. That is
 * cheaper than a sweep, it bounds the store at the number of moves the app can
 * propose in a day, and it means a stale row can never reach a decision even if
 * one somehow survived.
 *
 * ## Degrading, rather than failing
 *
 * A browser with IndexedDB unavailable or refusing to open gets a store that
 * remembers nothing, and the app behaves exactly as it did before this existed:
 * the session-scoped count still works within one visit. A duplication check is
 * not worth an error dialog.
 */

const DB_VERSION = 1
const ROWS = 'shown'

export interface ShownStore {
  /** Whether the count will actually survive this session. */
  readonly durable: boolean
  /** Everything recorded for this owner-local day. */
  read(dayId: LocalDayId): Promise<readonly ShownMove[]>
  /** Record one showing. Upsert on (move, day) — never an append. */
  note(entry: ShownMove): Promise<void>
  /** Forget everything, because the history on screen changed. */
  clear(): Promise<void>
  close(): void
}

/** The key, and it is the whole of why this is an upsert. */
function keyFor(move: string, dayId: LocalDayId): string {
  return `${dayId}|${move}`
}

interface Row {
  readonly key: string
  readonly move: string
  readonly dayId: string
  readonly at: number
  readonly count: number
}

function isRow(value: unknown): value is Row {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Partial<Row>
  return (
    typeof row.key === 'string' &&
    typeof row.move === 'string' &&
    typeof row.dayId === 'string' &&
    typeof row.at === 'number' &&
    typeof row.count === 'number'
  )
}

/** A store that remembers nothing, for a browser that will not give us one. */
export function forgetfulShownStore(): ShownStore {
  return {
    durable: false,
    read: () => Promise.resolve([]),
    note: () => Promise.resolve(),
    clear: () => Promise.resolve(),
    close: () => undefined,
  }
}

function request<T>(from: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    from.onsuccess = () => resolve(from.result)
    from.onerror = () => reject(from.error ?? new Error('the shown ledger would not read'))
  })
}

function settled(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('aborted'))
    transaction.onerror = () => reject(transaction.error ?? new Error('failed'))
  })
}

export interface ShownStoreOptions {
  readonly name: string
  readonly factory?: IDBFactory
}

/**
 * Open it, or fall back to remembering nothing.
 *
 * Never throws. The count is a convenience the duplication check reads, and a
 * browser that will not store it is a browser where the app behaves as it did
 * before this existed — which is a worse app and a working one.
 */
export async function openShownStore(options: ShownStoreOptions): Promise<ShownStore> {
  const factory = options.factory ?? globalThis.indexedDB
  if (factory === undefined || factory === null) return forgetfulShownStore()

  let db: IDBDatabase
  try {
    const open = factory.open(options.name, DB_VERSION)
    open.onupgradeneeded = () => {
      const upgrading = open.result
      if (!upgrading.objectStoreNames.contains(ROWS)) {
        upgrading.createObjectStore(ROWS, { keyPath: 'key' })
      }
    }
    db = await request(open)
  } catch {
    return forgetfulShownStore()
  }

  const safely = async <T>(work: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await work()
    } catch {
      return fallback
    }
  }

  return {
    durable: true,

    read: (dayId) =>
      safely(async () => {
        const transaction = db.transaction([ROWS], 'readwrite')
        const store = transaction.objectStore(ROWS)
        const rows = await request<unknown[]>(store.getAll())
        const out: ShownMove[] = []
        for (const raw of rows) {
          if (!isRow(raw)) {
            // Unreadable, and there is nothing to inspect later: this is a
            // convenience rather than history, so the honest thing is to drop it.
            if (typeof (raw as { key?: unknown } | null)?.key === 'string') {
              store.delete((raw as { key: string }).key)
            }
            continue
          }
          /*
           * Anything from another day goes, here rather than in a sweep.
           *
           * The count is about within-day repetition and nothing else, so a row
           * from last Tuesday is not stale data to be aged out — it is data
           * about a question nobody is asking. Dropping it on read bounds the
           * store at a day's worth of moves without a second mechanism.
           */
          if (raw.dayId !== dayId) {
            store.delete(raw.key)
            continue
          }
          out.push({
            move: raw.move,
            dayId: raw.dayId as LocalDayId,
            at: raw.at as ShownMove['at'],
            count: raw.count,
          })
        }
        await settled(transaction)
        return out
      }, []),

    note: (entry) =>
      safely(async () => {
        const transaction = db.transaction([ROWS], 'readwrite')
        transaction.objectStore(ROWS).put({
          key: keyFor(entry.move, entry.dayId),
          move: entry.move,
          dayId: entry.dayId,
          at: entry.at,
          count: entry.count,
        } satisfies Row)
        await settled(transaction)
      }, undefined),

    clear: () =>
      safely(async () => {
        const transaction = db.transaction([ROWS], 'readwrite')
        transaction.objectStore(ROWS).clear()
        await settled(transaction)
      }, undefined),

    close: () => db.close(),
  }
}
