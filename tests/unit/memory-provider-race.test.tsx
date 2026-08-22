/**
 * @vitest-environment jsdom
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanonicalRecord } from '../../src/domain/records'
import type { AppendResult, CanonicalStore, StoreSnapshot } from '../../src/memory/store'

/**
 * R4-B1 — the provider actually asks before it publishes.
 *
 * `projection.ts` holds the rule and `memory-projection.test.ts` proves the
 * rule. This proves the wiring: that the operation which caused the defect —
 * an append against the laboratory, finishing after the owner has gone back to
 * his own history — really does consult it.
 *
 * It exists because a browser test cannot hold this honestly. Round 4's failed
 * three-for-three focused and passed three-hundred-for-three-hundred in the
 * full suite on identical code, because it could only *hope* the two
 * operations overlapped. Here the overlap is constructed: the laboratory's
 * snapshot read is held open until the test lets it go, so the stale publish
 * happens on every run, in order, or the guard stops it.
 */

const held: { release: (() => void) | undefined } = { release: undefined }

function fakeStore(name: string, initial: readonly CanonicalRecord[]): CanonicalStore {
  let records = [...initial]
  const snapshotOf = (): StoreSnapshot => ({
    schemaVersion: 1,
    records: [...records],
    entities: [],
    malformed: [],
  })

  return {
    backend: 'indexeddb',
    durable: true,
    append: (incoming): Promise<AppendResult> => {
      records = [...records, ...incoming]
      return Promise.resolve({ appended: incoming.length, skipped: 0, rejected: [] })
    },
    putEntities: () => Promise.resolve(),
    putMalformed: () => Promise.resolve(),
    snapshot: (): Promise<StoreSnapshot> => {
      /*
       * The laboratory's read is the slow one, and holding it open is the whole
       * point: it is what turns "these two might overlap" into "these two do
       * overlap", every run.
       */
      if (gate.hold === name && held.release === undefined) {
        return new Promise<StoreSnapshot>((resolve) => {
          held.release = () => resolve(snapshotOf())
        })
      }
      return Promise.resolve(snapshotOf())
    },
    replaceAll: (snapshot) => {
      records = [...snapshot.records]
      return Promise.resolve()
    },
    clear: () => {
      records = []
      return Promise.resolve()
    },
    close: () => {},
  }
}

/** Which store's read to hold open, so an overlap is built rather than hoped for. */
const gate: { hold: 'owner' | ':laboratory' | undefined } = { hold: undefined }

const stores = new Map<string, CanonicalStore>()

/*
 * Keyed off the `:laboratory` suffix rather than the whole database name: the
 * prefix carries the build target, which is not `preview` under vitest, and
 * the test has no business knowing it. What it does need to know is which of
 * the two stores it is being handed, and the suffix is the thing that says so.
 */
vi.mock('../../src/memory/indexedDbStore', () => ({
  indexedDbAvailable: () => true,
  openIndexedDbStore: ({ name }: { name: string }) => {
    const key = name.endsWith(':laboratory') ? 'laboratory' : 'owner'
    const found = stores.get(key)
    if (found === undefined) throw new Error(`no fake store for ${key}`)
    return Promise.resolve(found)
  },
}))

function record(id: string, text: string): CanonicalRecord {
  return {
    id,
    schemaVersion: 1,
    kind: 'observation',
    occurredAt: 1_777_000_000_000,
    recordedAt: 1_777_000_000_000,
    zone: 'America/Denver',
    domains: ['home'],
    entities: [],
    privacy: 'normal',
    provenance: { source: 'owner', writtenBy: 'life' },
    concept: 'home.friction',
    value: { type: 'text', value: text },
    method: 'self-report',
  } as unknown as CanonicalRecord
}

const HIS = record('01JQWNSEED0000000000000000', 'weekly review on Sunday')
const FIXTURE = record('01JQWNFIXTURE00000000000AA', 'invented evening')

let root: Root | undefined
let container: HTMLDivElement | undefined
let seen: {
  snapshot: StoreSnapshot
  source: string
  append: (r: CanonicalRecord[]) => void
  clear: () => void
}

beforeEach(() => {
  gate.hold = undefined
  held.release = undefined
  stores.clear()
  stores.set('owner', fakeStore('owner', [HIS]))
  stores.set('laboratory', fakeStore(':laboratory', [FIXTURE]))
})

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  container?.remove()
  container = undefined
})

async function mount() {
  const { MemoryProvider } = await import('../../src/features/memory/MemoryProvider')
  const { useMemory } = await import('../../src/features/memory/memoryContext')

  function Probe() {
    const memory = useMemory()
    seen = {
      snapshot: memory.snapshot,
      source: memory.source,
      append: (r) => void memory.append(r),
      clear: () => void memory.clear(),
    }
    return null
  }

  container = document.createElement('div')
  document.body.append(container)
  await act(async () => {
    root = createRoot(container as HTMLDivElement)
    root.render(
      <MemoryProvider>
        <Probe />
      </MemoryProvider>,
    )
  })
}

describe('the provider consults the rule before it publishes', () => {
  it('opens on the laboratory when it is holding a fixture', async () => {
    await mount()
    expect(seen.source).toBe('laboratory')
    expect(seen.snapshot.records.map((r) => r.id)).toEqual([FIXTURE.id])
  })

  it('does not publish a laboratory read that lands after the owner has gone back', async () => {
    /*
     * The reported defect, constructed rather than waited for:
     *
     *   1. an append is running against the laboratory;
     *   2. the owner presses Show mine, so the laboratory is emptied and his
     *      own history published;
     *   3. the append's read of the laboratory finally lands — of a store that
     *      is now empty.
     *
     * Step 3 must reach nothing. With the guard removed, it publishes the
     * empty laboratory and Timeline says "Nothing here yet" until a reload.
     */
    await mount()
    expect(seen.source).toBe('laboratory')

    gate.hold = ':laboratory'
    await act(async () => {
      seen.append([record('01JQWNDERIVED0000000000AA', 'derived outcome')])
      await Promise.resolve()
    })
    expect(held.release, 'the laboratory read was never held open').toBeDefined()

    // The owner goes back to his own history while that read is still open.
    await act(async () => {
      seen.clear()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(seen.source).toBe('owner')
    expect(seen.snapshot.records.map((r) => r.id)).toEqual([HIS.id])

    // Now the laboratory read lands. It read an emptied store.
    await act(async () => {
      held.release?.()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(seen.source, 'a stale read moved the owner back into the laboratory').toBe('owner')
    expect(
      seen.snapshot.records.map((r) => r.id),
      'the stale laboratory read reached the screen and blanked his history',
    ).toEqual([HIS.id])
  })

  it('does not let a return that was overtaken publish over the newer work', () => {
    /*
     * The other direction, and the reason the return asks before it switches.
     *
     * A return is slow too — it empties the laboratory and then reads the
     * owner's store. If something newer is asked for while it is doing that,
     * the return must not arrive afterwards and move the screen back. Nobody
     * would see a wrong *history* here, but they would see the app answer a
     * question they had already replaced, which is the same rule and the same
     * reason.
     */
    return (async () => {
      await mount()
      expect(seen.source).toBe('laboratory')

      // Hold the owner's read, so the return cannot finish yet.
      gate.hold = 'owner'
      await act(async () => {
        seen.clear()
        await Promise.resolve()
      })
      expect(held.release, 'the owner read was never held open').toBeDefined()

      // Newer work, while the return is still in the air.
      await act(async () => {
        seen.append([record('01JQWNNEWER00000000000000A', 'something since')])
        await Promise.resolve()
        await Promise.resolve()
      })

      // The return finally lands. It has been overtaken.
      await act(async () => {
        held.release?.()
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(seen.source, 'an overtaken return moved the screen anyway').toBe('laboratory')
    })()
  })
})
