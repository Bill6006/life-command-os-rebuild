import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { CanonicalRecord } from '../../domain/records'
import {
  instant,
  systemClock,
  DEFAULT_WEEK_START,
  type Instant,
  type TimeZoneId,
  type WeekStartDay,
} from '../../domain/time'
import type { ValidationIssue } from '../../domain/validation'
import { indexedDbAvailable, openIndexedDbStore } from '../../memory/indexedDbStore'
import { createMemoryStore } from '../../memory/memoryStore'
import {
  snapshotFromJson,
  snapshotToJson,
  snapshotToWire,
  type SnapshotLoad,
} from '../../memory/snapshot'
import {
  stableStringify,
  type CanonicalStore,
  type StoreBackend,
  type StoreSnapshot,
} from '../../memory/store'
import { buildView, type MemoryView } from '../../memory/view'
import { runningBuild } from '../../platform/buildInfo'

/**
 * One store and one clock, for every surface (canonical plan sections 14 and 31).
 *
 * Phase 1 gave the QA laboratory its own connection to IndexedDB because it was
 * the only screen that needed one. Now has an engine behind it, so it needs the
 * same history — and two connections to one database would drift the moment
 * either wrote to it.
 *
 * The clock lives here for a related reason. Time travel is a QA control, but
 * it has to reach the engine rather than stopping at the screen that offers it:
 * loading a scenario and then walking to Now should show what the engine makes
 * of that evening. Since nothing below the UI reads a wall clock, moving the
 * moment here moves it everywhere.
 *
 * The synthetic scenario library is deliberately not imported by this file. It
 * lives in the QA chunk, and a document arrives here as text — the same text a
 * pasted file would be — so a production build never downloads a fixture.
 */

export interface StorageCheck {
  readonly ok: boolean
  readonly detail: string
}

export interface MemoryContextValue {
  readonly ready: boolean
  readonly busy: boolean
  readonly backend: StoreBackend | 'opening'
  readonly durable: boolean
  readonly snapshot: StoreSnapshot
  readonly view: MemoryView
  readonly issues: readonly ValidationIssue[]
  readonly loadedLabel: string | undefined
  readonly error: string | undefined
  readonly storageCheck: StorageCheck | undefined

  loadDocument(json: string, label?: string): Promise<void>
  append(records: readonly CanonicalRecord[]): Promise<void>
  clear(): Promise<void>
  verifyStorage(): Promise<void>
  documentJson(): string

  readonly now: Instant
  readonly zone: TimeZoneId
  readonly weekStartsOn: WeekStartDay
  /** Whether the clock has been moved off the real one. */
  readonly travelled: boolean
  travelTo(at: Instant): void
  setZone(zone: TimeZoneId): void
  setWeekStartsOn(day: WeekStartDay): void
  returnToNow(): void
}

const EMPTY: StoreSnapshot = { schemaVersion: 1, records: [], entities: [], malformed: [] }

const DB_NAME = `life-command-os:${runningBuild.target}`

const MemoryContext = createContext<MemoryContextValue | undefined>(undefined)

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function openStore(): Promise<CanonicalStore> {
  if (!indexedDbAvailable()) return createMemoryStore()
  try {
    return await openIndexedDbStore({ name: DB_NAME })
  } catch {
    // Private browsing, a blocked upgrade, a quota refusal. Keep working, and
    // let the surface report that nothing is being kept.
    return createMemoryStore()
  }
}

function contentOf(snapshot: StoreSnapshot): string {
  const wire = snapshotToWire(snapshot, instant(0))
  return stableStringify({
    records: wire.records,
    entities: wire.entities,
    malformed: snapshot.malformed.length,
  })
}

export function MemoryProvider({ children }: { children: ReactNode }) {
  const store = useRef<CanonicalStore | undefined>(undefined)
  const clock = useMemo(() => systemClock(), [])

  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [backend, setBackend] = useState<StoreBackend | 'opening'>('opening')
  const [durable, setDurable] = useState(false)
  const [snapshot, setSnapshot] = useState<StoreSnapshot>(EMPTY)
  const [issues, setIssues] = useState<readonly ValidationIssue[]>([])
  const [loadedLabel, setLoadedLabel] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [storageCheck, setStorageCheck] = useState<StorageCheck | undefined>(undefined)

  const [now, setNow] = useState<Instant>(() => clock.now())
  const [zone, setZone] = useState<TimeZoneId>(clock.zone())
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStartDay>(DEFAULT_WEEK_START)
  const [travelled, setTravelled] = useState(false)

  useEffect(() => {
    let live = true

    void (async () => {
      const opened = await openStore()
      if (!live) {
        opened.close()
        return
      }
      store.current = opened
      setBackend(opened.backend)
      setDurable(opened.durable)

      try {
        // Whatever was left here last time is still here. That is the point of
        // a durable store, and it is the first thing the owner should see.
        setSnapshot(await opened.snapshot())
      } catch (caught) {
        setError(describe(caught))
      }
      setReady(true)
    })()

    return () => {
      live = false
      store.current?.close()
      store.current = undefined
    }
  }, [])

  const apply = useCallback(async (load: SnapshotLoad, label: string | undefined) => {
    const current = store.current
    if (current === undefined) return

    setBusy(true)
    setError(undefined)
    setStorageCheck(undefined)
    try {
      if (load.loaded) {
        await current.replaceAll(load.snapshot)
        setSnapshot(await current.snapshot())
        setLoadedLabel(label)
      }
      setIssues(load.issues)
    } catch (caught) {
      setError(describe(caught))
    } finally {
      setBusy(false)
    }
  }, [])

  const loadDocument = useCallback(
    async (json: string, label?: string) => {
      await apply(snapshotFromJson(json), label)
    },
    [apply],
  )

  const append = useCallback(async (records: readonly CanonicalRecord[]) => {
    const current = store.current
    if (current === undefined || records.length === 0) return

    setBusy(true)
    setError(undefined)
    try {
      const result = await current.append(records)
      if (result.rejected.length > 0) {
        setError(result.rejected.map((rejection) => rejection.problem).join('; '))
      }
      setSnapshot(await current.snapshot())
    } catch (caught) {
      setError(describe(caught))
    } finally {
      setBusy(false)
    }
  }, [])

  const clear = useCallback(async () => {
    const current = store.current
    if (current === undefined) return
    setBusy(true)
    try {
      await current.clear()
      setSnapshot(await current.snapshot())
      setIssues([])
      setLoadedLabel(undefined)
      setStorageCheck(undefined)
    } catch (caught) {
      setError(describe(caught))
    } finally {
      setBusy(false)
    }
  }, [])

  const verifyStorage = useCallback(async () => {
    setBusy(true)
    try {
      // Close the connection and open a new one. Reading back through the same
      // handle would prove very little; this proves the bytes are on disk.
      store.current?.close()
      const reopened = await openStore()
      store.current = reopened
      setBackend(reopened.backend)
      setDurable(reopened.durable)

      const fromDisk = await reopened.snapshot()
      const same = contentOf(fromDisk) === contentOf(snapshot)
      setSnapshot(fromDisk)
      setStorageCheck({
        ok: same,
        detail: same
          ? `${fromDisk.records.length} records and ${fromDisk.entities.length} entities came back identical`
          : `what came back differs — ${fromDisk.records.length} records against ${snapshot.records.length} in memory`,
      })
    } catch (caught) {
      setStorageCheck({ ok: false, detail: describe(caught) })
    } finally {
      setBusy(false)
    }
  }, [snapshot])

  const travelTo = useCallback((at: Instant) => {
    setNow(at)
    setTravelled(true)
  }, [])

  const returnToNow = useCallback(() => {
    setNow(clock.now())
    setZone(clock.zone())
    setTravelled(false)
  }, [clock])

  const view = useMemo(
    () => buildView(snapshot, { now, zone, weekStartsOn }),
    [snapshot, now, zone, weekStartsOn],
  )

  const value: MemoryContextValue = {
    ready,
    busy,
    backend,
    durable,
    snapshot,
    view,
    issues,
    loadedLabel,
    error,
    storageCheck,
    loadDocument,
    append,
    clear,
    verifyStorage,
    documentJson: () => snapshotToJson(snapshot, now),
    now,
    zone,
    weekStartsOn,
    travelled,
    travelTo,
    setZone,
    setWeekStartsOn,
    returnToNow,
  }

  return <MemoryContext.Provider value={value}>{children}</MemoryContext.Provider>
}

export function useMemory(): MemoryContextValue {
  const value = useContext(MemoryContext)
  if (value === undefined) throw new Error('useMemory must be used inside a MemoryProvider')
  return value
}
