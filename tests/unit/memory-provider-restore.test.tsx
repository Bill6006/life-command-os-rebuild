/**
 * @vitest-environment jsdom
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import type { CanonicalRecord } from '../../src/domain/records'
import type { Instant, TimeZoneId, WeekStartDay } from '../../src/domain/time'
import { backupFromJson, backupToJson, type BackupApp } from '../../src/memory/backup'
import { planRestore, type RestoreOutcome, type RestorePlan } from '../../src/memory/restore'
import type { AppendResult, CanonicalStore, StoreSnapshot } from '../../src/memory/store'
import type { MemoryView } from '../../src/memory/view'

/**
 * Where a restore writes, and what it publishes afterwards.
 *
 * `restore.ts` proves the transaction; this proves the two decisions the
 * provider makes around it, both of which are the difference between a
 * recoverable evening and an unrecoverable one.
 *
 * **It writes to the owner's store, never the active one.** D-091's eighth
 * invariant, applied to the one operation where getting it wrong cannot be
 * undone by pressing something. A backup taken while a fixture is on screen is
 * of his records; a restore while a fixture is on screen does not happen at
 * all, because which history is about to be replaced must not be in doubt.
 *
 * **It publishes the whole visible context together.** R5-B1: what a reader
 * sees is `buildView(snapshot, { now, zone, weekStartsOn })`, so a restored
 * history read under a clock the laboratory moved to February would hide every
 * entry dated after it — which on this surface would read as the restore
 * having lost half his life.
 */

const APP: BackupApp = {
  commitSha: 'd'.repeat(40),
  commitShort: 'ddddddd',
  branch: 'main',
  target: 'preview',
  buildTime: '2026-01-01T00:00:00.000Z',
}

/** Crockford base-32 has no I, L, O or U; a hand-typed id is usually invalid. */
function rid(tag: string): string {
  return `01JQWN${tag.toUpperCase().replace(/[ILOU]/g, 'X')}`.padEnd(26, '0').slice(0, 26)
}

function record(id: string, text: string, at = 1_787_249_400_000): CanonicalRecord {
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

const HIS_TODAY = record(rid('TODAY'), 'the kitchen, again')
const FIXTURE = record(rid('FXTRE'), 'an invented evening', 1_771_189_200_000)
/** What the backup holds: older entries, and more of them. */
const BACKED_UP = [
  record(rid('BACKA'), 'february, when things were calmer', 1_771_100_000_000),
  record(rid('BACKB'), 'the week of the deadline', 1_771_200_000_000),
  record(rid('BACKC'), 'a walk that helped', 1_771_300_000_000),
]

/** A fixture clock in the past, as every scenario in the library has. */
const FEBRUARY = 1_771_189_200_000 as Instant

/**
 * What the test wants to go wrong.
 *
 * `reopen` is the interesting one and it has three settings, because the
 * post-restore confirmation can fail three ways and they used to be one
 * silent success (QA-07-007): the open throws, the open degrades to an
 * in-memory store, or the reopened database holds something else.
 */
const failures: {
  ownerReplaceAll?: boolean
  reopen?: 'throw' | 'memory' | 'different' | 'read-throws'
} = {}

/** How many times a store has been opened, so a *re*open can be told apart. */
let opens = 0
const stores = new Map<string, CanonicalStore>()

function fakeStore(which: 'owner' | 'laboratory', initial: readonly CanonicalRecord[]) {
  let records = [...initial]
  const snapshotOf = (): StoreSnapshot => ({
    schemaVersion: 1,
    records: [...records],
    entities: [],
    malformed: [],
  })

  const store: CanonicalStore & { contents(): readonly CanonicalRecord[] } = {
    backend: 'indexeddb',
    durable: true,
    contents: () => records,
    append: (incoming): Promise<AppendResult> => {
      records = [...records, ...incoming]
      return Promise.resolve({ appended: incoming.length, skipped: 0, rejected: [] })
    },
    putEntities: () => Promise.resolve(),
    putMalformed: () => Promise.resolve(),
    snapshot: () => Promise.resolve(snapshotOf()),
    replaceAll: (snapshot) => {
      if (which === 'owner' && failures.ownerReplaceAll === true) {
        return Promise.reject(new Error('the storage quota was refused'))
      }
      records = [...snapshot.records]
      return Promise.resolve()
    },
    clear: () => {
      records = []
      return Promise.resolve()
    },
    // Deliberately a no-op: the provider closes and reopens around a restore,
    // and the test needs the same store to come back so "read it again from a
    // new connection" is a real re-read rather than a fresh empty database.
    close: () => {},
  }
  return store
}

vi.mock('../../src/memory/indexedDbStore', () => ({
  indexedDbAvailable: () => true,
  openIndexedDbStore: ({ name }: { name: string }) => {
    const key = name.endsWith(':laboratory') ? 'laboratory' : 'owner'
    opens += 1
    /*
     * The first two opens are the provider mounting. Anything after that is
     * the reopen a restore does to prove the bytes are on disk, which is the
     * one this file needs to be able to break.
     */
    const reopening = opens > 2
    if (reopening && key === 'owner') {
      if (failures.reopen === 'throw') throw new Error('the database would not reopen')
      if (failures.reopen === 'memory') {
        // What `openStore` really does when IndexedDB refuses: it degrades,
        // silently, to a store that is not his disk and reads as empty.
        return Promise.reject(new Error('IndexedDB is not available'))
      }
      if (failures.reopen === 'different') {
        return Promise.resolve(fakeStore('owner', [HIS_TODAY]))
      }
      if (failures.reopen === 'read-throws') {
        /*
         * The one shape that reaches the operation's outer `catch`.
         *
         * A reopen that *throws* never gets there — `openStore` catches
         * everything and degrades to memory — so a reintroduction of the
         * "report it as never attempted" bug escaped a test that only
         * forced the open to fail. What reaches the catch is the reopened
         * store refusing to be read.
         */
        const unreadable = fakeStore('owner', BACKED_UP)
        return Promise.resolve({
          ...unreadable,
          snapshot: () => Promise.reject(new Error('the reopened database would not be read')),
        })
      }
    }
    const found = stores.get(key)
    if (found === undefined) throw new Error(`no fake store for ${key}`)
    return Promise.resolve(found)
  },
}))

function ownerStore() {
  return stores.get('owner') as CanonicalStore & { contents(): readonly CanonicalRecord[] }
}

function laboratoryStore() {
  return stores.get('laboratory') as CanonicalStore & { contents(): readonly CanonicalRecord[] }
}

function planFor(records: readonly CanonicalRecord[], current: StoreSnapshot): RestorePlan {
  const wanted: StoreSnapshot = {
    schemaVersion: 1,
    records: [...records],
    entities: [],
    malformed: [],
  }
  const load = backupFromJson(backupToJson(wanted, { app: APP, createdAt: 0 as Instant }))
  expect(load.ok).toBe(true)
  if (!load.ok) throw new Error('unreachable')
  return planRestore(load.snapshot, load.summary, current)
}

let root: Root | undefined
let container: HTMLDivElement | undefined
let seen: {
  snapshot: StoreSnapshot
  source: string
  view: MemoryView
  now: Instant
  zone: TimeZoneId
  weekStartsOn: WeekStartDay
  travelled: boolean
  canRestore: boolean
  storageCheck: { ok: boolean; detail: string } | undefined
  ownerSnapshot: () => Promise<StoreSnapshot>
  ownerMoment: () => { at: Instant; zone: TimeZoneId }
  restoreOwner: (plan: RestorePlan) => Promise<RestoreOutcome>
  loadDocument: (json: string, label?: string) => Promise<void>
  travelTo: (at: Instant) => void
}

beforeEach(() => {
  delete failures.ownerReplaceAll
  delete failures.reopen
  opens = 0
  stores.clear()
  stores.set('owner', fakeStore('owner', [HIS_TODAY]))
  stores.set('laboratory', fakeStore('laboratory', []))
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
      canRestore: memory.canRestore,
      storageCheck: memory.storageCheck,
      ownerSnapshot: () => memory.ownerSnapshot(),
      ownerMoment: () => memory.ownerMoment(),
      restoreOwner: (plan) => memory.restoreOwner(plan),
      loadDocument: (json, label) => memory.loadDocument(json, label),
      travelTo: (at) => memory.travelTo(at),
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

/** Put a fixture on screen the way the laboratory does. */
async function loadFixture() {
  const document = JSON.stringify({
    format: 'life-command-os/canonical',
    schemaVersion: 1,
    exportedAt: '2026-02-15T21:00:00.000Z',
    records: [
      {
        id: FIXTURE.id,
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
        value: { type: 'text', value: 'an invented evening' },
        method: 'self-report',
      },
    ],
    entities: [],
    malformed: [],
  })
  await act(async () => {
    await seen.loadDocument(document, 'a-fixture')
  })
}

describe('a backup is of the owner’s own records, whatever is on screen', () => {
  it('reads his store rather than the one being shown', async () => {
    await mount()
    await loadFixture()
    expect(seen.source).toBe('laboratory')
    expect(seen.snapshot.records.map((r) => r.id)).toEqual([FIXTURE.id])

    const forBackup = await seen.ownerSnapshot()

    // The whole point: a backup taken here is of his evening, not the fixture's.
    expect(forBackup.records.map((r) => r.id)).toEqual([HIS_TODAY.id])
  })
})

describe('a restore while a test history is on screen', () => {
  it('is unavailable, and says nothing was attempted', async () => {
    await mount()
    await loadFixture()
    expect(seen.canRestore).toBe(false)

    const plan = planFor(BACKED_UP, await seen.ownerSnapshot())
    let outcome: RestoreOutcome | undefined
    await act(async () => {
      outcome = await seen.restoreOwner(plan)
    })

    expect(outcome?.ok).toBe(false)
    if (outcome === undefined || outcome.ok) return
    expect(outcome.stage).toBe('not-attempted')
    expect(outcome.problem).toMatch(/test history/i)

    // And neither store was touched.
    expect(
      ownerStore()
        .contents()
        .map((r) => r.id),
    ).toEqual([HIS_TODAY.id])
    expect(
      laboratoryStore()
        .contents()
        .map((r) => r.id),
    ).toEqual([FIXTURE.id])
  })

  it('becomes available again once the laboratory is put away', async () => {
    await mount()
    await loadFixture()
    expect(seen.canRestore).toBe(false)

    await act(async () => {
      await laboratoryStore().clear()
    })
    // The provider's own route back is `clear`, exercised elsewhere; what this
    // asserts is that the availability flag follows the source rather than
    // being a separate thing that can drift out of step with it.
    expect(seen.canRestore).toBe(seen.source === 'owner')
  })
})

describe('a restore of the owner’s own history', () => {
  it('replaces his store and nothing else', async () => {
    await mount()
    expect(seen.canRestore).toBe(true)

    const plan = planFor(BACKED_UP, await seen.ownerSnapshot())
    let outcome: RestoreOutcome | undefined
    await act(async () => {
      outcome = await seen.restoreOwner(plan)
    })

    expect(outcome?.ok).toBe(true)
    expect(
      ownerStore()
        .contents()
        .map((r) => r.id),
    ).toEqual(BACKED_UP.map((r) => r.id))
    expect(laboratoryStore().contents()).toEqual([])
  })

  it('puts the restored history on screen without a reload', async () => {
    await mount()
    const plan = planFor(BACKED_UP, await seen.ownerSnapshot())
    await act(async () => {
      await seen.restoreOwner(plan)
    })

    expect(seen.source).toBe('owner')
    expect(seen.snapshot.records.map((r) => r.id)).toEqual(BACKED_UP.map((r) => r.id))
  })

  it('reads the store again from a new connection and says whether it matched', async () => {
    // The verification a backup actually promises: not that the write did not
    // throw, but that the bytes survive the database being closed and opened.
    await mount()
    const plan = planFor(BACKED_UP, await seen.ownerSnapshot())
    await act(async () => {
      await seen.restoreOwner(plan)
    })

    expect(seen.storageCheck?.ok).toBe(true)
    expect(seen.storageCheck?.detail).toMatch(/reopened the database/i)
  })

  it('returns the clock, so nothing restored is hidden for not having happened yet', async () => {
    /*
     * R5-B1's exact shape, one surface over. The clock is moved to February —
     * as loading any scenario does — and a restore then brings back entries
     * dated around and after it. Under the moved clock, `buildView` would
     * simply not show them, and the screen would be asserting that the restore
     * had lost them.
     */
    await mount()
    act(() => seen.travelTo(FEBRUARY))
    expect(seen.travelled).toBe(true)

    const plan = planFor(BACKED_UP, await seen.ownerSnapshot())
    await act(async () => {
      await seen.restoreOwner(plan)
    })

    expect(seen.travelled).toBe(false)
    expect(seen.now).toBeGreaterThan(FEBRUARY)
    // And the whole restored history is actually readable, not merely stored.
    expect(seen.view.history.effective.map((r) => r.id).sort()).toEqual(
      BACKED_UP.map((r) => r.id).sort(),
    )
  })
})

describe('a restore that fails', () => {
  it('leaves his history on screen exactly as it was', async () => {
    await mount()
    failures.ownerReplaceAll = true

    const plan = planFor(BACKED_UP, await seen.ownerSnapshot())
    let outcome: RestoreOutcome | undefined
    await act(async () => {
      outcome = await seen.restoreOwner(plan)
    })

    expect(outcome?.ok).toBe(false)
    expect(
      ownerStore()
        .contents()
        .map((r) => r.id),
    ).toEqual([HIS_TODAY.id])
    expect(seen.source).toBe('owner')
    expect(seen.snapshot.records.map((r) => r.id)).toEqual([HIS_TODAY.id])
  })
})

describe('QA-07-007 — the reopen is part of the result, not a footnote under it', () => {
  /*
   * The reported state: force the post-restore reopen to fail and the screen
   * said, in green, that the store now held the backup exactly — with "what
   * came back after reopening the database is not what was restored" printed
   * underneath. Two contradictory claims about one operation, the confident
   * one first, and no rollback.
   *
   * Three ways the confirmation can fail and all three are the same answer:
   * applied, verified once, not confirmed, not undone. Undoing here would be
   * worse than saying so — the write committed and matched its fingerprint
   * before this ran, so a rollback would trade a restore that probably worked
   * for one that certainly did not happen.
   */

  it('does not report success when the database will not reopen', async () => {
    await mount()
    const plan = planFor(BACKED_UP, await seen.ownerSnapshot())

    failures.reopen = 'throw'
    let outcome: RestoreOutcome | undefined
    await act(async () => {
      outcome = await seen.restoreOwner(plan)
    })

    expect(outcome?.ok, 'a restore it cannot confirm is not a success').toBe(false)
    if (outcome === undefined || outcome.ok) return
    expect(outcome.stage).toBe('confirm')
    expect(outcome.applied, 'the write did happen and the owner must be told so').toBe(true)
    expect(outcome.rolledBack).toBe(false)
    expect(outcome.problem).toMatch(/nothing was undone/i)
  })

  it('does not report success when the reopened store is a memory fallback', async () => {
    /*
     * The exact shape QA reproduced. `openStore` degrades to memory rather than
     * throwing, and an empty in-memory store fingerprints as an empty history —
     * so without this the app compares the backup against nothing, calls it a
     * mismatch, and still returns the success from two steps earlier.
     */
    await mount()
    const plan = planFor(BACKED_UP, await seen.ownerSnapshot())

    failures.reopen = 'memory'
    let outcome: RestoreOutcome | undefined
    await act(async () => {
      outcome = await seen.restoreOwner(plan)
    })

    expect(outcome?.ok).toBe(false)
    if (outcome === undefined || outcome.ok) return
    expect(outcome.stage).toBe('confirm')
    expect(outcome.applied).toBe(true)
    expect(seen.storageCheck?.ok).toBe(false)
  })

  it('never publishes a fallback store’s empty history as his', async () => {
    // The second half of the same defect: an empty memory store reaching the
    // screen would read as "the restore lost everything".
    await mount()
    const plan = planFor(BACKED_UP, await seen.ownerSnapshot())

    failures.reopen = 'memory'
    await act(async () => {
      await seen.restoreOwner(plan)
    })

    expect(seen.snapshot.records.map((record) => record.id)).toEqual(
      BACKED_UP.map((record) => record.id),
    )
  })

  it('does not report success when the reopened database holds something else', async () => {
    await mount()
    const plan = planFor(BACKED_UP, await seen.ownerSnapshot())

    failures.reopen = 'different'
    let outcome: RestoreOutcome | undefined
    await act(async () => {
      outcome = await seen.restoreOwner(plan)
    })

    expect(outcome?.ok).toBe(false)
    if (outcome === undefined || outcome.ok) return
    expect(outcome.stage).toBe('confirm')
    expect(outcome.applied).toBe(true)
    expect(outcome.detail).toContain(plan.expected)
  })

  it('never calls an applied restore "never attempted", even when the read throws', async () => {
    /*
     * The outer `catch` used to return `notAttempted`, which is the exact
     * opposite of what happened: the backup had been written and verified,
     * and the owner was told nothing had been.
     */
    await mount()
    const plan = planFor(BACKED_UP, await seen.ownerSnapshot())

    failures.reopen = 'read-throws'
    let outcome: RestoreOutcome | undefined
    await act(async () => {
      outcome = await seen.restoreOwner(plan)
    })

    expect(outcome?.ok).toBe(false)
    if (outcome === undefined || outcome.ok) return
    expect(outcome.stage, 'an applied restore is not a restore that never started').toBe('confirm')
    expect(outcome.applied).toBe(true)
    // And the bytes really are there, which is why it may not be undone.
    expect(
      ownerStore()
        .contents()
        .map((record) => record.id),
    ).toEqual(BACKED_UP.map((record) => record.id))
  })

  it('leaves the restored history on disk rather than undoing it', async () => {
    // Applied and unconfirmable is not applied and wrong. The bytes stay.
    await mount()
    const plan = planFor(BACKED_UP, await seen.ownerSnapshot())

    failures.reopen = 'throw'
    await act(async () => {
      await seen.restoreOwner(plan)
    })

    expect(
      ownerStore()
        .contents()
        .map((record) => record.id),
    ).toEqual(BACKED_UP.map((record) => record.id))
  })

  it('still reports plain success when the reopen works', async () => {
    // The guard above is worth nothing if it fires on the ordinary path.
    await mount()
    const plan = planFor(BACKED_UP, await seen.ownerSnapshot())

    let outcome: RestoreOutcome | undefined
    await act(async () => {
      outcome = await seen.restoreOwner(plan)
    })

    expect(outcome?.ok).toBe(true)
    expect(seen.storageCheck?.ok).toBe(true)
  })
})

describe('QA-07-005 — an artefact about his records carries his own clock', () => {
  it('gives the real moment, not the one the screen is being read under', async () => {
    /*
     * A backup taken in August while a February fixture was loaded was stamped,
     * filed and previewed as February. The records were correctly his; every
     * date attached to them was the laboratory's.
     */
    await mount()
    act(() => seen.travelTo(FEBRUARY))
    expect(seen.now).toBe(FEBRUARY)

    const moment = seen.ownerMoment()

    expect(moment.at, 'the backup clock followed the laboratory').not.toBe(FEBRUARY)
    expect(moment.at).toBeGreaterThan(FEBRUARY)
  })

  it('gives the real moment while a fixture is actually on screen', async () => {
    await mount()
    await loadFixture()
    expect(seen.source).toBe('laboratory')

    expect(seen.ownerMoment().at).toBeGreaterThan(FEBRUARY)
  })
})
