/**
 * @vitest-environment jsdom
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/*
 * React only treats `act` as real when this is set. Without it every render
 * here prints "the current testing environment is not configured to support
 * act(...)", which QA reported — and a warning that noisy makes the assertions
 * around it harder to trust than they should be.
 */
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import type { CanonicalRecord } from '../../src/domain/records'
import type { Instant, TimeZoneId, WeekStartDay } from '../../src/domain/time'
import type { AppendResult, CanonicalStore, StoreSnapshot } from '../../src/memory/store'
import type { MemoryView } from '../../src/memory/view'

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

function record(id: string, text: string, at = 1_777_000_000_000): CanonicalRecord {
  return {
    id,
    schemaVersion: 1,
    kind: 'observation',
    occurredAt: at,
    recordedAt: at,
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

/**
 * The owner's own record, dated **after** any fixture clock (R5-B1).
 *
 * QA named the hole this fills. Every earlier test here sat the owner's row one
 * day *before* the fixture's clock, so no assertion could ever notice a record
 * being hidden for not having happened yet — the tests proved the store
 * boundary and were blind to the temporal half of the same screen.
 */
const HIS_AUGUST = record('01JQWNAUGUST00000000000AA', 'august owner entry', 1_787_249_400_000)

/** A fixture clock set in the past, as the scenario library's are. */
const FEBRUARY = 1_771_189_200_000 as Instant

let root: Root | undefined
let container: HTMLDivElement | undefined
let seen: {
  snapshot: StoreSnapshot
  source: string
  /** The whole visible context, because the store is only half of it (R5-B1). */
  view: MemoryView
  now: Instant
  zone: TimeZoneId
  weekStartsOn: WeekStartDay
  travelled: boolean
  shown: readonly { move: string; count: number }[]
  noteShown: (move: string) => void
  loadDocument: (json: string, label?: string) => Promise<void>
  append: (r: CanonicalRecord[]) => void
  clear: () => void
  travelTo: (at: Instant) => void
  setZone: (zone: TimeZoneId) => void
  setWeekStartsOn: (day: WeekStartDay) => void
}

beforeEach(() => {
  gate.hold = undefined
  held.release = undefined
  stores.clear()
  stores.set('owner', fakeStore('owner', [HIS, HIS_AUGUST]))
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
      view: memory.view,
      now: memory.now,
      zone: memory.zone,
      weekStartsOn: memory.weekStartsOn,
      travelled: memory.travelled,
      shown: memory.shown,
      noteShown: (move) => memory.noteShown(move),
      loadDocument: (json, label) => memory.loadDocument(json, label),
      append: (r) => void memory.append(r),
      clear: () => void memory.clear(),
      travelTo: (at) => memory.travelTo(at),
      setZone: (z) => memory.setZone(z),
      setWeekStartsOn: (d) => memory.setWeekStartsOn(d),
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
    expect(seen.snapshot.records.map((r) => r.id)).toEqual([HIS.id, HIS_AUGUST.id])

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
    ).toEqual([HIS.id, HIS_AUGUST.id])
  })

  it('gives back his clock as well as his records', () => {
    /*
     * R5-B1, and the case the earlier tests here could not see.
     *
     * Loading a scenario sets the zone, the week start and the moment — the
     * library's fixtures are set in the past. Returning used to give back the
     * store and leave all three behind, so his August records were evaluated
     * against a February clock, had not happened yet, and vanished. The notice
     * was gone by then, so the screen was asserting that an empty history was
     * his.
     *
     * The owner's record here is dated **after** the fixture clock, which is
     * the whole point: with it dated before, as every earlier test had it, this
     * defect is invisible.
     */
    return (async () => {
      await mount()
      expect(seen.source).toBe('laboratory')
      const hisZone = seen.zone

      // The laboratory takes the clock back to February, as a scenario does.
      await act(async () => {
        seen.setZone('Europe/London' as TimeZoneId)
        seen.setWeekStartsOn(7)
        seen.travelTo(FEBRUARY)
        await Promise.resolve()
      })
      expect(seen.travelled).toBe(true)

      // His August record is genuinely in the store, and genuinely in the
      // future from where the laboratory's clock is standing.
      expect(
        seen.view.history.effective.some((r) => r.id === HIS_AUGUST.id),
        'the fixture view should not contain his records at all',
      ).toBe(false)

      await act(async () => {
        seen.clear()
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(seen.source).toBe('owner')
      expect(seen.travelled, 'the laboratory clock survived the return').toBe(false)
      expect(seen.now, 'the return left the clock in February').toBeGreaterThan(FEBRUARY)
      expect(seen.weekStartsOn, 'the fixture week start survived the return').toBe(1)
      expect(seen.zone, 'the fixture zone survived the return').toBe(hisZone)
      expect(seen.snapshot.records.map((r) => r.id)).toContain(HIS_AUGUST.id)
      expect(
        seen.view.history.effective.some((r) => r.id === HIS_AUGUST.id),
        'his August record is in the store and not on the screen — the defect exactly',
      ).toBe(true)
    })()
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

describe('QA-81-006 — what has been on screen is about the history it was on', () => {
  /*
   * The session ledger counts screens (D-118), and a screen is about a
   * history. Swapping the history leaves the counts about nothing.
   *
   * Not reachable by an owner, who has one history. Entirely reachable by an
   * auditor, who loads one fixture and then another inside a minute — and the
   * second fixture then arrives with a move already used up, on a screen
   * nobody could otherwise get to. The builder's own Android gate hit exactly
   * this and reported the wrong screen for it.
   */
  it('forgets what was on screen when the laboratory takes a different history', async () => {
    await mount()
    expect(seen.source).toBe('laboratory')

    await act(async () => {
      seen.noteShown('home/reset-space/place:the-kitchen')
      await Promise.resolve()
    })
    expect(seen.shown.map((entry) => entry.move)).toEqual(['home/reset-space/place:the-kitchen'])

    const other = JSON.stringify({
      format: 'life-command-os/canonical',
      schemaVersion: 1,
      exportedAt: '2026-02-15T21:00:00.000Z',
      records: [
        {
          id: '01JQWNXTHER000000000000000',
          schemaVersion: 1,
          kind: 'observation',
          occurredAt: '2026-02-15T21:00:00.000Z',
          recordedAt: '2026-02-15T21:00:00.000Z',
          zone: 'America/Denver',
          domains: ['home'],
          entities: [],
          privacy: 'normal',
          provenance: { source: 'synthetic', writtenBy: 'test' },
          concept: 'home.friction',
          value: { type: 'text', value: 'another invented evening' },
          method: 'self-report',
        },
      ],
      entities: [],
      malformed: [],
    })
    await act(async () => {
      await seen.loadDocument(other, 'Another history')
    })

    expect(seen.snapshot.records.map((entry) => entry.id)).toEqual(['01JQWNXTHER000000000000000'])
    expect(seen.shown, 'a move arrived already used up, from a different life').toEqual([])
  })

  it('forgets it again when he goes back to his own history', async () => {
    await mount()
    await act(async () => {
      seen.noteShown('home/reset-space/place:the-kitchen')
      await Promise.resolve()
    })
    expect(seen.shown.length).toBe(1)

    await act(async () => {
      seen.clear()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(seen.source).toBe('owner')
    expect(seen.shown, 'the laboratory followed him home').toEqual([])
  })
})
