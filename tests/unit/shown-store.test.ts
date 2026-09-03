import { describe, expect, it } from 'vitest'
import { parseLocalDayId, type Instant, type LocalDayId } from '../../src/domain/time'
import {
  forgetfulShownStore,
  openShownStore,
  type ShownStore,
} from '../../src/features/memory/shownStore'
import type { ShownMove } from '../../src/intelligence/situation'

/**
 * AUD-0025's durable half, on a store rather than on a promise.
 *
 * Routing 81 built the count and kept it in a React ref, which closed the
 * within-render case and left the one an owner actually lives: a phone picked up
 * at half past six, put down, and picked up again at seven is **two sessions**,
 * and the second had never heard of the first — so the app went back to
 * repeating itself across exactly the gap the finding is about.
 *
 * The behaviour a real IndexedDB gives it is proved in the browser matrix, where
 * a reload is a reload. What is proved here is the logic that would be wrong in
 * any implementation: an upsert rather than an append, only today, and a
 * fallback that degrades to the old behaviour rather than to an error.
 */

// ---------------------------------------------------------------------------
// A fake IndexedDB, small enough to read
// ---------------------------------------------------------------------------

/**
 * Just the surface `openShownStore` uses.
 *
 * Hand-written rather than a library, because what has to be trustworthy here is
 * *this* test: a fake that silently accepted a second `put` on one key as two
 * rows would let an append pass as an upsert, which is the one property the
 * audit names as a hard requirement.
 */
function fakeIndexedDb(): {
  readonly factory: IDBFactory
  rows(): readonly unknown[]
  put(row: unknown): void
} {
  const data = new Map<string, unknown>()

  /**
   * A handler slot that fires even when it is attached after the event.
   *
   * The real IndexedDB dispatches on a task, and the code under test attaches
   * `oncomplete` **after** awaiting a request inside the same transaction — so a
   * fake that fired eagerly would deadlock on a handler nobody had set yet, and
   * a fake that fired late would hide an ordering bug. Remembering that it
   * happened is what makes it neither.
   */
  function slot() {
    let fired = false
    let handler: (() => void) | null = null
    return {
      fire() {
        fired = true
        handler?.()
      },
      get(): (() => void) | null {
        return handler
      },
      set(next: (() => void) | null) {
        handler = next
        if (fired) next?.()
      },
    }
  }

  function finish<T>(result: T): IDBRequest<T> {
    const success = slot()
    const request = { result } as Record<string, unknown>
    Object.defineProperty(request, 'onsuccess', { get: success.get, set: success.set })
    Object.defineProperty(request, 'onerror', { value: null, writable: true })
    queueMicrotask(() => success.fire())
    return request as unknown as IDBRequest<T>
  }

  const store = {
    getAll: () => finish([...data.values()]),
    put(row: { key: string }) {
      data.set(row.key, row)
      return finish(undefined)
    },
    delete(key: string) {
      data.delete(key)
      return finish(undefined)
    },
    clear() {
      data.clear()
      return finish(undefined)
    },
  }

  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => store,
    transaction() {
      const complete = slot()
      const transaction = { objectStore: () => store } as Record<string, unknown>
      Object.defineProperty(transaction, 'oncomplete', { get: complete.get, set: complete.set })
      for (const name of ['onabort', 'onerror']) {
        Object.defineProperty(transaction, name, { value: null, writable: true })
      }
      // Two turns, so every request queued inside it has resolved first.
      queueMicrotask(() => queueMicrotask(() => complete.fire()))
      return transaction as unknown as IDBTransaction
    },
    close: () => undefined,
  }

  const factory = {
    open() {
      const success = slot()
      const upgrade = slot()
      const request = { result: db } as Record<string, unknown>
      Object.defineProperty(request, 'onsuccess', { get: success.get, set: success.set })
      Object.defineProperty(request, 'onupgradeneeded', { get: upgrade.get, set: upgrade.set })
      Object.defineProperty(request, 'onerror', { value: null, writable: true })
      queueMicrotask(() => {
        upgrade.fire()
        success.fire()
      })
      return request as unknown as IDBOpenDBRequest
    },
  } as unknown as IDBFactory

  return {
    factory,
    rows: () => [...data.values()],
    put: (row) => data.set((row as { key: string }).key, row),
  }
}

const TODAY = parseLocalDayId('2026-05-12') as LocalDayId
const YESTERDAY = parseLocalDayId('2026-05-11') as LocalDayId

function showing(move: string, dayId: LocalDayId, count: number, at = 1_000): ShownMove {
  return { move, dayId, at: at as Instant, count }
}

async function opened(): Promise<{
  store: ShownStore
  rows: () => readonly unknown[]
  put: (row: unknown) => void
}> {
  const fake = fakeIndexedDb()
  const store = await openShownStore({ name: 'test', factory: fake.factory })
  return { store, rows: fake.rows, put: fake.put }
}

// ---------------------------------------------------------------------------

describe('the shown ledger survives the session — AUD-0025', () => {
  it('reads back what it was told', async () => {
    const { store } = await opened()
    await store.note(showing('home/reset-space/place:the-kitchen', TODAY, 1))
    const read = await store.read(TODAY)

    expect(read).toEqual([showing('home/reset-space/place:the-kitchen', TODAY, 1)])
    expect(store.durable, 'a store that opened says it did not').toBe(true)
  })

  it('upserts on the move and the day, and never appends', async () => {
    /*
     * The audit's own hard condition: *"a write-amplification concern on
     * IndexedDB — an upsert per render is fine, an append is not."* Three
     * showings of one move on one day are **one** row carrying a count of three,
     * so a day of opening the app costs a row per move rather than a row per
     * look.
     */
    const { store, rows } = await opened()
    for (const count of [1, 2, 3]) {
      await store.note(showing('a', TODAY, count))
    }
    expect(rows().length, 'three showings became three rows').toBe(1)
    expect(await store.read(TODAY)).toEqual([showing('a', TODAY, 3)])
  })

  it('keeps two different moves apart on the same day', async () => {
    const { store, rows } = await opened()
    await store.note(showing('a', TODAY, 1))
    await store.note(showing('b', TODAY, 1))
    expect(rows().length).toBe(2)
    expect((await store.read(TODAY)).map((entry) => entry.move).sort()).toEqual(['a', 'b'])
  })

  it('drops anything from another day as it reads', async () => {
    /*
     * The count is about within-day repetition and nothing else, so a row from
     * yesterday is not stale data to be aged out — it is data about a question
     * nobody is asking. Dropping it on read bounds the store at a day's worth of
     * moves without a second mechanism, and means a stale row can never reach a
     * decision even if one somehow survived.
     */
    const { store, rows } = await opened()
    await store.note(showing('a', YESTERDAY, 4))
    await store.note(showing('b', TODAY, 1))

    expect(await store.read(TODAY)).toEqual([showing('b', TODAY, 1)])
    expect(rows().length, 'yesterday was read past rather than deleted').toBe(1)
  })

  it('forgets everything when the history on screen changes', async () => {
    // The laboratory case. A count is about a history; swap the history and the
    // count is about nothing, and a move could arrive already used up.
    const { store, rows } = await opened()
    await store.note(showing('a', TODAY, 2))
    await store.clear()
    expect(rows()).toEqual([])
    expect(await store.read(TODAY)).toEqual([])
  })

  it('drops a row it cannot read rather than failing on it', async () => {
    // It is a convenience rather than history: there is nothing to inspect
    // later and nothing an owner could correct, so the honest answer to an
    // unreadable row is to drop it and carry on.
    const { store, put, rows } = await opened()
    await store.note(showing('a', TODAY, 1))
    // A row from a future shape, or one that came back corrupted.
    put({ key: 'broken', nonsense: true })

    expect(await store.read(TODAY)).toEqual([showing('a', TODAY, 1)])
    expect(rows().length, 'the unreadable row was kept').toBe(1)
  })
})

describe('a browser that will not store it gets the old behaviour — AUD-0025', () => {
  it('remembers nothing, and says so', async () => {
    const store = forgetfulShownStore()
    await store.note(showing('a', TODAY, 1))
    expect(await store.read(TODAY)).toEqual([])
    expect(store.durable).toBe(false)
  })

  it('falls back rather than throwing when there is no IndexedDB at all', async () => {
    const store = await openShownStore({ name: 'test', factory: undefined as never })
    expect(store.durable).toBe(false)
    expect(await store.read(TODAY)).toEqual([])
  })

  it('falls back rather than throwing when opening fails', async () => {
    /*
     * A private window, a browser with site data blocked, a quota refusal. A
     * duplication check is not worth an error dialog, and the app behaves
     * exactly as it did before this existed — the session's own count still
     * works within one visit.
     */
    const refusing = {
      open() {
        throw new Error('no')
      },
    } as unknown as IDBFactory
    const store = await openShownStore({ name: 'test', factory: refusing })
    expect(store.durable).toBe(false)
    await expect(store.note(showing('a', TODAY, 1))).resolves.toBeUndefined()
  })
})
