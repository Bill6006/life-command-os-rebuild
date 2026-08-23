import { beforeEach, describe, expect, it } from 'vitest'
import type { CanonicalRecord } from '../../src/domain/records'
import { instant } from '../../src/domain/time'
import {
  backupFromJson,
  backupToJson,
  fingerprint,
  summaryOf,
  type BackupApp,
} from '../../src/memory/backup'
import { notAttempted, planRestore, restoreInto } from '../../src/memory/restore'
import type { AppendResult, CanonicalStore, StoreSnapshot } from '../../src/memory/store'

/**
 * The restore sequence, proved in order rather than hoped for.
 *
 * Section 29 asks for validate, preview, atomic apply, verify, rollback, and
 * no false success. Five of those six only ever run when something has gone
 * wrong, which means on a real IndexedDB they would essentially never be
 * exercised — the failure paths of a restore are exactly the code most likely
 * to be written once and never executed again until the evening it matters.
 *
 * So the store is a fake whose failures the **test** chooses: a write that
 * throws, a read that throws, a write that silently keeps the old contents,
 * and a rollback that fails on top of a failure. Each one is a real thing a
 * browser under storage pressure does, and each one has a different sentence
 * owed to the owner.
 */

const APP: BackupApp = {
  commitSha: 'c'.repeat(40),
  commitShort: 'ccccccc',
  branch: 'main',
  target: 'preview',
  buildTime: '2026-01-01T00:00:00.000Z',
}

const AT = instant(Date.parse('2026-05-01T12:00:00Z'))

/**
 * A valid record id, built rather than typed.
 *
 * Crockford base-32 has no I, L, O or U in it, so a hand-written id reading
 * "HIS" is not an id at all — it parses as a malformed row, and every
 * assertion downstream of it becomes a test of the wrong thing. Two of these
 * were written by hand before this helper existed and both were silently
 * unreadable.
 */
function rid(tag: string): string {
  return `01JQWN${tag.toUpperCase().replace(/[ILOU]/g, 'X')}`.padEnd(26, '0').slice(0, 26)
}

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

const HIS = [record(rid('MINEA'), 'the kitchen again'), record(rid('MINEB'), 'a good Sunday')]

const BACKED_UP = [
  record(rid('BACKA'), 'february, when things were calmer'),
  record(rid('BACKB'), 'the week of the deadline'),
  record(rid('BACKC'), 'a walk that helped'),
]

function snapshotOf(records: readonly CanonicalRecord[]): StoreSnapshot {
  return { schemaVersion: 1, records: [...records], entities: [], malformed: [] }
}

/**
 * A store whose failures the test chooses.
 *
 * `failures` is read on every call, so a test can arrange for the *rollback*
 * write to fail after the restore write has already succeeded — which is the
 * one state this app must never describe as merely "restore failed".
 */
interface Fake extends CanonicalStore {
  contents(): readonly CanonicalRecord[]
  readonly writes: number[]
}

const failures: {
  snapshot?: 'always' | 'first' | 'after-write'
  replaceAll?: 'always' | 'first' | 'second'
  /** The write reports success and does not actually change anything. */
  silentlyIgnoreWrite?: boolean
} = {}

function fakeStore(initial: readonly CanonicalRecord[]): Fake {
  let records = [...initial]
  let writeCount = 0
  let snapshotCount = 0
  const writes: number[] = []

  return {
    backend: 'indexeddb',
    durable: true,
    writes,
    contents: () => records,
    append: (incoming): Promise<AppendResult> => {
      records = [...records, ...incoming]
      return Promise.resolve({ appended: incoming.length, skipped: 0, rejected: [] })
    },
    putEntities: () => Promise.resolve(),
    putMalformed: () => Promise.resolve(),
    snapshot: (): Promise<StoreSnapshot> => {
      snapshotCount += 1
      if (
        failures.snapshot === 'always' ||
        (failures.snapshot === 'first' && snapshotCount === 1) ||
        (failures.snapshot === 'after-write' && writeCount > 0)
      ) {
        return Promise.reject(new Error('the database would not open for reading'))
      }
      return Promise.resolve(snapshotOf(records))
    },
    replaceAll: (snapshot): Promise<void> => {
      writeCount += 1
      writes.push(writeCount)
      if (
        failures.replaceAll === 'always' ||
        (failures.replaceAll === 'first' && writeCount === 1) ||
        (failures.replaceAll === 'second' && writeCount === 2)
      ) {
        return Promise.reject(new Error('the storage quota was refused'))
      }
      if (failures.silentlyIgnoreWrite === true) return Promise.resolve()
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

function planFor(records: readonly CanonicalRecord[], current: StoreSnapshot) {
  const wanted = snapshotOf(records)
  const load = backupFromJson(backupToJson(wanted, { app: APP, createdAt: AT }))
  expect(load.ok).toBe(true)
  if (!load.ok) throw new Error('unreachable')
  return planRestore(load.snapshot, load.summary, current)
}

beforeEach(() => {
  delete failures.snapshot
  delete failures.replaceAll
  delete failures.silentlyIgnoreWrite
})

describe('a restore that works', () => {
  it('replaces the whole history and reads it back to prove it', async () => {
    const store = fakeStore(HIS)
    const plan = planFor(BACKED_UP, snapshotOf(HIS))

    const outcome = await restoreInto(store, plan)

    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.verification.found).toBe(plan.expected)
    expect(outcome.verification.counts.records).toBe(3)
    expect(store.contents().map((r) => r.id)).toEqual(BACKED_UP.map((r) => r.id))
  })

  it('says what it replaced, not only what it wrote', async () => {
    const store = fakeStore(HIS)
    const outcome = await restoreInto(store, planFor(BACKED_UP, snapshotOf(HIS)))
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.replaced.records).toBe(HIS.length)
  })

  it('writes once — the transaction is the atomicity, not a loop', async () => {
    const store = fakeStore(HIS)
    await restoreInto(store, planFor(BACKED_UP, snapshotOf(HIS)))
    expect(store.writes).toEqual([1])
  })

  it('restores an empty backup onto a full history without refusing it', async () => {
    // An owner who deleted everything and backed that up is entitled to
    // restore it. Empty is a history, not a failure.
    const store = fakeStore(HIS)
    const outcome = await restoreInto(store, planFor([], snapshotOf(HIS)))
    expect(outcome.ok).toBe(true)
    expect(store.contents()).toEqual([])
  })
})

describe('a restore that cannot start', () => {
  it('writes nothing when the current history cannot be read', async () => {
    // Without a copy of what is there, there is no way back — so there is no
    // attempt. Section 29's rollback requirement, enforced before the fact.
    failures.snapshot = 'first'
    const store = fakeStore(HIS)

    const outcome = await restoreInto(store, planFor(BACKED_UP, snapshotOf(HIS)))

    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.stage).toBe('hold-current')
    expect(outcome.rolledBack).toBe(false)
    expect(store.writes).toEqual([])
    expect(store.contents().map((r) => r.id)).toEqual(HIS.map((r) => r.id))
  })

  it('reports a declined restore as never having been attempted', () => {
    const outcome = notAttempted('a test history is on screen')
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.stage).toBe('not-attempted')
    expect(outcome.rolledBack).toBe(false)
  })
})

describe('a restore that fails after it has started', () => {
  it('puts the old history back when the write is refused', async () => {
    failures.replaceAll = 'first'
    const store = fakeStore(HIS)

    const outcome = await restoreInto(store, planFor(BACKED_UP, snapshotOf(HIS)))

    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.stage).toBe('apply')
    expect(outcome.rolledBack).toBe(true)
    expect(outcome.rollbackVerified).toBe(true)
    expect(outcome.problem).toMatch(/exactly as it was/i)
    expect(store.contents().map((r) => r.id)).toEqual(HIS.map((r) => r.id))
  })

  it('puts the old history back when the write lands as something else', async () => {
    /*
     * The case counts would miss and the fingerprint catches: the store
     * reports success and holds the old contents. A restore that trusted the
     * absence of an exception would tell the owner his life was back while
     * showing him someone else's.
     */
    failures.silentlyIgnoreWrite = true
    const store = fakeStore(HIS)

    const outcome = await restoreInto(store, planFor(BACKED_UP, snapshotOf(HIS)))

    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.stage).toBe('verify')
    expect(outcome.detail).toContain(plainFingerprint(BACKED_UP))
    expect(outcome.rolledBack).toBe(true)
    expect(outcome.rollbackVerified).toBe(true)
  })

  it('puts the old history back when the check itself cannot run', async () => {
    failures.snapshot = 'after-write'
    const store = fakeStore(HIS)

    const outcome = await restoreInto(store, planFor(BACKED_UP, snapshotOf(HIS)))

    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.stage).toBe('verify')
    // The rollback write happened; its own check could not, and it says so
    // rather than claiming an outcome it did not observe.
    expect(outcome.rolledBack).toBe(true)
    expect(outcome.rollbackVerified).toBe(false)
  })

  it('says so loudly when the old history could not be written back', async () => {
    // The worst state available, and the one sentence that must never be
    // softened into "restore failed".
    failures.replaceAll = 'always'
    const store = fakeStore(HIS)

    const outcome = await restoreInto(store, planFor(BACKED_UP, snapshotOf(HIS)))

    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.rolledBack).toBe(false)
    expect(outcome.rollbackVerified).toBe(false)
    expect(outcome.problem).toMatch(/did not complete/i)
  })

  it('never reports success on any failure path', async () => {
    for (const arrangement of [
      { snapshot: 'first' as const },
      { snapshot: 'after-write' as const },
      { replaceAll: 'first' as const },
      { replaceAll: 'always' as const },
      { silentlyIgnoreWrite: true },
    ]) {
      delete failures.snapshot
      delete failures.replaceAll
      delete failures.silentlyIgnoreWrite
      Object.assign(failures, arrangement)

      const store = fakeStore(HIS)
      const outcome = await restoreInto(store, planFor(BACKED_UP, snapshotOf(HIS)))
      expect(outcome.ok, JSON.stringify(arrangement)).toBe(false)
    }
  })
})

describe('the same file works on a second attempt', () => {
  it('restores after a first attempt that was refused by the store', async () => {
    // Section 29 — "same-file retry works after a failed attempt". The plan is
    // not consumed, so the retry is the same call with the same argument.
    failures.replaceAll = 'first'
    const store = fakeStore(HIS)
    const plan = planFor(BACKED_UP, snapshotOf(HIS))

    const first = await restoreInto(store, plan)
    expect(first.ok).toBe(false)

    delete failures.replaceAll
    const second = await restoreInto(store, plan)

    expect(second.ok).toBe(true)
    expect(store.contents().map((r) => r.id)).toEqual(BACKED_UP.map((r) => r.id))
  })
})

describe('the preview, before anything is written', () => {
  it('says what is coming in, what is going out, and what is in the file', () => {
    const current = snapshotOf(HIS)
    const plan = planFor(BACKED_UP, current)

    expect(plan.incoming.records).toBe(3)
    expect(plan.current.records).toBe(2)
    expect(plan.expected).toBe(plainFingerprint(BACKED_UP))
    expect(plan.summary.app).toEqual(APP)
  })

  it('is a pure calculation — nothing has been touched by building it', async () => {
    const store = fakeStore(HIS)
    planFor(BACKED_UP, await store.snapshot())
    expect(store.writes).toEqual([])
    expect(store.contents().map((r) => r.id)).toEqual(HIS.map((r) => r.id))
  })

  it('summarises a snapshot the same way whether it came from a file or a store', () => {
    const snapshot = snapshotOf(BACKED_UP)
    const direct = summaryOf(snapshot, {
      createdAt: '2026-05-01T12:00:00.000Z',
      app: APP,
      integrity: {
        algorithm: 'sha-256/stable-json',
        checksum: fingerprint(snapshot),
        records: 3,
        entities: 0,
        malformed: 0,
      },
      migrationsApplied: [],
    })
    const viaFile = planFor(BACKED_UP, snapshotOf(HIS)).summary
    expect(viaFile.counts).toEqual(direct.counts)
    expect(viaFile.domains).toEqual(direct.domains)
    expect(viaFile.holdsPrivate).toBe(direct.holdsPrivate)
  })
})

function plainFingerprint(records: readonly CanonicalRecord[]): string {
  return fingerprint(snapshotOf(records))
}
