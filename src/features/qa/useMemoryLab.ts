import { useCallback, useEffect, useRef, useState } from 'react'
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
import { instant, type Instant } from '../../domain/time'
import { runningBuild } from '../../platform/buildInfo'
import { scenarioById } from '../../synthetic/scenarios'

/**
 * The QA lab's connection to the canonical store (canonical plan section 31).
 *
 * QA is a first-class product surface here, not a hidden hatch, so this owns a
 * real store rather than a mock: what the owner loads on their phone goes
 * through IndexedDB and comes back out through the same parser a backup would
 * use. If IndexedDB is unavailable the lab falls back to memory and says so —
 * an owner should never be left assuming their history is being kept when it
 * is not.
 */

const DB_NAME = `life-command-os:${runningBuild.target}`

export interface StorageCheck {
  readonly ok: boolean
  readonly detail: string
}

export interface MemoryLab {
  readonly ready: boolean
  readonly busy: boolean
  readonly backend: StoreBackend | 'opening'
  readonly durable: boolean
  readonly snapshot: StoreSnapshot
  readonly issues: readonly ValidationIssue[]
  readonly loadedScenarioId: string | undefined
  readonly error: string | undefined
  readonly storageCheck: StorageCheck | undefined
  loadScenario(id: string): Promise<void>
  loadJson(text: string): Promise<void>
  clear(): Promise<void>
  /** Reopen the database and compare what comes back with what is in memory. */
  verifyStorage(): Promise<void>
  documentJson(at: Instant): string
}

const EMPTY: StoreSnapshot = { schemaVersion: 1, records: [], entities: [], malformed: [] }

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
  return stableStringify({
    records: snapshotToWire(snapshot, instant(0)).records,
    entities: snapshotToWire(snapshot, instant(0)).entities,
    malformed: snapshot.malformed.length,
  })
}

export function useMemoryLab(): MemoryLab {
  const store = useRef<CanonicalStore | undefined>(undefined)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [backend, setBackend] = useState<StoreBackend | 'opening'>('opening')
  const [durable, setDurable] = useState(false)
  const [snapshot, setSnapshot] = useState<StoreSnapshot>(EMPTY)
  const [issues, setIssues] = useState<readonly ValidationIssue[]>([])
  const [loadedScenarioId, setLoadedScenarioId] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [storageCheck, setStorageCheck] = useState<StorageCheck | undefined>(undefined)

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

  const apply = useCallback(async (load: SnapshotLoad, scenarioId: string | undefined) => {
    const current = store.current
    if (current === undefined) return

    setBusy(true)
    setError(undefined)
    setStorageCheck(undefined)
    try {
      if (load.loaded) {
        await current.replaceAll(load.snapshot)
        setSnapshot(await current.snapshot())
        setLoadedScenarioId(scenarioId)
      }
      setIssues(load.issues)
    } catch (caught) {
      setError(describe(caught))
    } finally {
      setBusy(false)
    }
  }, [])

  const loadScenario = useCallback(
    async (id: string) => {
      const scenario = scenarioById(id)
      if (scenario === undefined) {
        setError(`No synthetic scenario called "${id}"`)
        return
      }
      await apply(snapshotFromJson(JSON.stringify(scenario.build())), id)
    },
    [apply],
  )

  const loadJson = useCallback(
    async (text: string) => {
      await apply(snapshotFromJson(text), undefined)
    },
    [apply],
  )

  const clear = useCallback(async () => {
    const current = store.current
    if (current === undefined) return
    setBusy(true)
    try {
      await current.clear()
      setSnapshot(await current.snapshot())
      setIssues([])
      setLoadedScenarioId(undefined)
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

  const documentJson = useCallback((at: Instant) => snapshotToJson(snapshot, at), [snapshot])

  return {
    ready,
    busy,
    backend,
    durable,
    snapshot,
    issues,
    loadedScenarioId,
    error,
    storageCheck,
    loadScenario,
    loadJson,
    clear,
    verifyStorage,
    documentJson,
  }
}
