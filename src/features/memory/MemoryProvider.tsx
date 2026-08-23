import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { countOf } from '../../domain/counts'
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
import { derivedOutcomeRecords } from '../../intelligence/derived'
import { nextOutcomeDueAt } from '../../intelligence/outcomes'
import { indexedDbAvailable, openIndexedDbStore } from '../../memory/indexedDbStore'
import { createMemoryStore } from '../../memory/memoryStore'
import { fingerprint } from '../../memory/backup'
import {
  notAttempted,
  restoreInto,
  type RestoreOutcome,
  type RestorePlan,
} from '../../memory/restore'
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
import { buildView } from '../../memory/view'
import { runningBuild } from '../../platform/buildInfo'
import { MemoryContext, type MemoryContextValue, type StorageCheck } from './memoryContext'
import { createProjection, type HistorySource } from './projection'

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

const EMPTY: StoreSnapshot = { schemaVersion: 1, records: [], entities: [], malformed: [] }

/**
 * Two databases: the owner's, and the laboratory's (R3-B1).
 *
 * The separation this file already drew was between **targets** — Preview and
 * production are two paths on one github.io origin, so without a name apiece
 * they would share a database and synthetic data would land where real history
 * lives. That is section 33's rule, and it was applied to one axis and not to
 * the other axis it exists to protect: within a single target, the QA
 * laboratory and the owner's own app were still one store, and loading a
 * fixture called `replaceAll`, which clears every object store before writing.
 * Seven records of the owner's evening, gone, with no warning and no undo.
 *
 * A fixture is not a version of his life. It gets its own database, and nothing
 * the laboratory does can reach his.
 */
const OWNER_DB = `life-command-os:${runningBuild.target}`
const LABORATORY_DB = `${OWNER_DB}:laboratory`

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function openStore(name: string): Promise<CanonicalStore> {
  if (!indexedDbAvailable()) return createMemoryStore()
  try {
    return await openIndexedDbStore({ name })
  } catch {
    // Private browsing, a blocked upgrade, a quota refusal. Keep working, and
    // let the surface report that nothing is being kept.
    return createMemoryStore()
  }
}

function holdsAnything(snapshot: StoreSnapshot): boolean {
  return (
    snapshot.records.length > 0 || snapshot.entities.length > 0 || snapshot.malformed.length > 0
  )
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
  /*
   * Both stores stay open, and which one is *active* is derived from whether
   * the laboratory is holding anything.
   *
   * Derived rather than remembered in a flag, because a flag is a second place
   * for the truth to live and this one would be read on every surface. An empty
   * laboratory is a laboratory that is not in use; putting a fixture away is
   * emptying it. Nothing can drift, nothing needs migrating, and a reload lands
   * exactly where it left off — which is the behaviour `qa-lab.spec.ts` already
   * requires.
   */
  const stores = useRef<{ owner?: CanonicalStore; laboratory?: CanonicalStore }>({})
  const [source, setSource] = useState<HistorySource>('owner')
  const clock = useMemo(() => systemClock(), [])

  /**
   * Which history is on screen, and which work may still say so (R4-B1).
   *
   * The rule and its reasoning live in `projection.ts`, where they can be
   * tested in order rather than by hoping two operations overlap. Everything
   * below follows one shape: begin a job, do the slow thing, and then ask the
   * job whether the owner still wants to hear about it.
   */
  const projection = useRef(createProjection('owner')).current

  const storeFor = useCallback(
    (which: HistorySource): CanonicalStore | undefined =>
      which === 'laboratory' ? stores.current.laboratory : stores.current.owner,
    [],
  )

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

    const opening = projection.beginHere()

    void (async () => {
      const owner = await openStore(OWNER_DB)
      const laboratory = await openStore(LABORATORY_DB)
      if (!live) {
        owner.close()
        laboratory.close()
        return
      }
      stores.current = { owner, laboratory }
      setBackend(owner.backend)
      setDurable(owner.durable)

      try {
        // Whatever was left here last time is still here. That is the point of
        // a durable store, and it is the first thing the owner should see.
        const fixture = await laboratory.snapshot()
        const inLaboratory = holdsAnything(fixture)
        const first = inLaboratory ? fixture : await owner.snapshot()
        // Opening is work like any other: if the owner has already asked for
        // something else, that answer is the newer one.
        const showing: HistorySource = inLaboratory ? 'laboratory' : 'owner'
        if (projection.show(showing, opening)) {
          setSource(showing)
          setSnapshot(first)
        }
      } catch (caught) {
        if (opening.isCurrent()) setError(describe(caught))
      }
      setReady(true)
    })()

    return () => {
      live = false
      stores.current.owner?.close()
      stores.current.laboratory?.close()
      stores.current = {}
    }
  }, [projection])

  /*
   * A loaded document always lands in the laboratory, never in the owner's
   * store, and `replaceAll` is therefore only ever destructive to a fixture.
   */
  const apply = useCallback(
    async (load: SnapshotLoad, label: string | undefined) => {
      const job = projection.begin('laboratory')
      const laboratory = stores.current.laboratory
      if (laboratory === undefined) return

      setBusy(true)
      setError(undefined)
      setStorageCheck(undefined)
      try {
        if (load.loaded) {
          await laboratory.replaceAll(load.snapshot)
          const fixture = await laboratory.snapshot()
          // A load the owner has already walked away from does not get to pull
          // him back into the laboratory he has just left.
          if (!projection.show('laboratory', job)) return
          setSource('laboratory')
          setSnapshot(fixture)
          setLoadedLabel(label)
        }
        if (job.isCurrent()) setIssues(load.issues)
      } catch (caught) {
        if (job.isCurrent()) setError(describe(caught))
      } finally {
        if (job.isCurrent()) setBusy(false)
      }
    },
    [projection],
  )

  const loadDocument = useCallback(
    async (json: string, label?: string) => {
      await apply(snapshotFromJson(json), label)
    },
    [apply],
  )

  /*
   * Answers go wherever the owner is currently looking.
   *
   * Answering a question while a fixture is on screen writes to the fixture,
   * which is right: it is the fixture's evening being answered about, and his
   * own history must come back untouched when the fixture is put away.
   */
  const append = useCallback(
    async (records: readonly CanonicalRecord[]) => {
      const job = projection.beginHere()
      const current = storeFor(job.against)
      if (current === undefined || records.length === 0) return

      setBusy(true)
      setError(undefined)
      try {
        const result = await current.append(records)
        const after = await current.snapshot()
        /*
         * The defect, in one condition. This snapshot is of the store this
         * append was asked to write to; if the owner has since switched away
         * from it, publishing it would show him a history that is not the one
         * he asked for — and if he switched *to* the owner while the
         * laboratory was being cleared, it would show him an empty one.
         */
        if (!job.mayPublish()) return
        if (result.rejected.length > 0) {
          setError(result.rejected.map((rejection) => rejection.problem).join('; '))
        }
        setSnapshot(after)
      } catch (caught) {
        if (job.isCurrent()) setError(describe(caught))
      } finally {
        if (job.isCurrent()) setBusy(false)
      }
    },
    [projection, storeFor],
  )

  /*
   * Put the laboratory away, and hand the owner his own history back.
   *
   * This used to clear whatever store was open, which on a shared store meant
   * his records. It cannot reach them now: it empties the laboratory database
   * and switches back, and his history returns exactly as he left it because it
   * was never touched.
   */
  const clear = useCallback(async () => {
    const job = projection.begin('laboratory')
    const { owner, laboratory } = stores.current
    if (owner === undefined || laboratory === undefined) return
    setBusy(true)
    try {
      await laboratory.clear()
      const his = await owner.snapshot()
      if (!projection.show('owner', job)) return
      /*
       * The whole visible context, published together in one continuation, so
       * React renders it in a single pass.
       *
       * **What a reader sees is not the store alone (R5-B1).** It is
       * `buildView(snapshot, { now, zone, weekStartsOn })` — so the clock is
       * half of it, and returning his records under the laboratory's clock is
       * not returning his history. Loading a scenario sets the zone, the week
       * start and the moment; this used to give back the store and leave all
       * three behind, so a February fixture followed by a return showed his
       * August records as things that had not happened yet. Timeline said
       * "Nothing here yet" with the notice gone, which is the screen asserting
       * that an empty history is his.
       *
       * The owner's frame is the real one — the system clock, the system zone,
       * the default week start, not travelled. It is restored rather than
       * remembered because nothing outside the laboratory can change it: the
       * clock, zone and week-start controls are QA's. If that ever stops being
       * true, this becomes a stash taken when the laboratory takes over, and
       * the test below is what will say so.
       */
      setSource('owner')
      setSnapshot(his)
      setNow(clock.now())
      setZone(clock.zone())
      setWeekStartsOn(DEFAULT_WEEK_START)
      setTravelled(false)
      setIssues([])
      setLoadedLabel(undefined)
      setStorageCheck(undefined)
    } catch (caught) {
      if (job.isCurrent()) setError(describe(caught))
    } finally {
      if (job.isCurrent()) setBusy(false)
    }
  }, [clock, projection])

  /**
   * His own records, read from his own store, whatever is on screen.
   *
   * See `ownerSnapshot` in `memoryContext.ts` for why this cannot be the
   * `snapshot` state.
   */
  const ownerSnapshot = useCallback(async (): Promise<StoreSnapshot> => {
    const owner = stores.current.owner
    if (owner === undefined) throw new Error('The store is still opening.')
    return await owner.snapshot()
  }, [])

  /*
   * Putting a backup back (canonical plan section 29).
   *
   * Three things happen here beyond `restoreInto`, and each is the provider's
   * job rather than the memory layer's.
   *
   * **It writes to the owner's store and to nothing else.** Not "the active
   * store" — D-091's eighth invariant, and a restore is the one operation
   * where getting it wrong is unrecoverable rather than confusing.
   *
   * **It publishes the whole visible context together** (R5-B1). A restored
   * history read under a clock the QA laboratory moved would hide every record
   * dated after that instant — DEF-0058's exact symptom, on a surface where it
   * would read as "the restore lost half my life". A restore says nothing
   * about what time it is, so the real clock is what it is read under, and the
   * snapshot and the clock are published in one continuation so React renders
   * them in a single pass.
   *
   * **It then reopens the database and reads it again.** `restoreInto` already
   * verified through the open connection, which proves the write landed in the
   * store; this proves it landed on disk, which is the claim a backup is for.
   */
  const restoreOwner = useCallback(
    async (plan: RestorePlan): Promise<RestoreOutcome> => {
      const owner = stores.current.owner
      if (owner === undefined) return notAttempted('The store is still opening. Try again.')
      /*
       * Checked before a job is claimed, so a declined restore does not make
       * work already in flight stale. Nothing is read and nothing is written.
       */
      if (projection.source !== 'owner') {
        return notAttempted(
          'A test history is on screen. Put it away first, so there is no doubt whose history is being replaced.',
        )
      }
      const job = projection.begin('owner')

      setBusy(true)
      setError(undefined)
      setStorageCheck(undefined)
      try {
        const outcome = await restoreInto(owner, plan)
        if (!outcome.ok) {
          // The store holds the old history again, and the screen must show
          // that rather than the picture it had before the attempt.
          const back = await owner.snapshot()
          if (projection.show('owner', job)) setSnapshot(back)
          return outcome
        }

        if (projection.show('owner', job)) {
          setSource('owner')
          setSnapshot(outcome.snapshot)
          setNow(clock.now())
          setZone(clock.zone())
          setWeekStartsOn(DEFAULT_WEEK_START)
          setTravelled(false)
          setIssues([])
          setLoadedLabel(undefined)
        }

        /*
         * And once more, through a connection that did not exist when the
         * write happened.
         *
         * `restoreInto` read the store back and matched the fingerprint, which
         * proves the transaction committed. This proves the bytes survive the
         * database being closed and opened — the thing a backup actually
         * promises, and the thing a browser under storage pressure is entitled
         * to break. It runs after the screen has already been given the
         * restored history, so a slow reopen never leaves the owner looking at
         * the old one.
         */
        stores.current.owner?.close()
        stores.current.laboratory?.close()
        const reopenedOwner = await openStore(OWNER_DB)
        const reopenedLaboratory = await openStore(LABORATORY_DB)
        stores.current = { owner: reopenedOwner, laboratory: reopenedLaboratory }
        setBackend(reopenedOwner.backend)
        setDurable(reopenedOwner.durable)
        const fromDisk = await reopenedOwner.snapshot()
        const same = fingerprint(fromDisk) === plan.expected
        if (job.mayPublish()) {
          setSnapshot(fromDisk)
          setStorageCheck({
            ok: same,
            detail: same
              ? `reopened the database and read back ${countOf(fromDisk.records.length, 'record', 'records')}, identical`
              : 'what came back after reopening the database is not what was restored',
          })
        }
        return outcome
      } catch (caught) {
        if (job.isCurrent()) setError(describe(caught))
        return notAttempted(describe(caught))
      } finally {
        if (job.isCurrent()) setBusy(false)
      }
    },
    [clock, projection],
  )

  const verifyStorage = useCallback(async () => {
    const job = projection.beginHere()
    setBusy(true)
    try {
      // Close the connections and open new ones. Reading back through the same
      // handle would prove very little; this proves the bytes are on disk.
      stores.current.owner?.close()
      stores.current.laboratory?.close()
      const owner = await openStore(OWNER_DB)
      const laboratory = await openStore(LABORATORY_DB)
      stores.current = { owner, laboratory }
      setBackend(owner.backend)
      setDurable(owner.durable)

      const reopened = job.against === 'laboratory' ? laboratory : owner
      const fromDisk = await reopened.snapshot()
      const same = contentOf(fromDisk) === contentOf(snapshot)
      if (!job.mayPublish()) return
      setSnapshot(fromDisk)
      setStorageCheck({
        ok: same,
        detail: same
          ? `${countOf(fromDisk.records.length, 'record', 'records')} and ${countOf(fromDisk.entities.length, 'entity', 'entities')} came back identical`
          : `what came back differs — ${countOf(fromDisk.records.length, 'record', 'records')} against ${snapshot.records.length} in memory`,
      })
    } catch (caught) {
      if (job.isCurrent()) setStorageCheck({ ok: false, detail: describe(caught) })
    } finally {
      if (job.isCurrent()) setBusy(false)
    }
  }, [projection, snapshot])

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

  /*
   * The clock advances when the app is looked at, and once more when something
   * is waiting for it.
   *
   * Phase 2 captured the moment at mount and never moved it, and nothing needed
   * more: every decision is a pure function of the moment it is given, so a tab
   * left open across the evening boundary was simply answering the question it
   * had been asked. Outcome windows are the first thing that cares — a result
   * due at ten past eight would never become due on a screen frozen at half
   * past seven.
   *
   * Two triggers, and deliberately no polling. Coming back to the tab is when a
   * phone is actually read, and the engine can say when the next window opens,
   * so a single timer is set for exactly that instant rather than a heartbeat
   * asking whether anything has happened yet.
   *
   * Note where the clock is: here, in the surface. `nextOutcomeDueAt` computes
   * an instant and compares it to nothing — the kernel stays clock-free, and
   * the guard in `tests/unit/architecture-guards.test.ts` still holds.
   */
  useEffect(() => {
    if (travelled) return

    const catchUp = () => {
      if (document.visibilityState === 'visible') setNow(clock.now())
    }
    document.addEventListener('visibilitychange', catchUp)
    return () => document.removeEventListener('visibilitychange', catchUp)
  }, [clock, travelled])

  /*
   * Outcomes the history already implies, written down once.
   *
   * Section 8 prefers evidence normal life is already producing over asking for
   * it, and the morning sleep reading after an early night *is* the answer to
   * the question the app would otherwise ask. `deriveOutcomes` is pure and
   * returns records; this is the one place with a store to put them in.
   *
   * There is a real tension with D-043 — nothing is written because a screen
   * rendered — and it resolves rather than being ignored. D-043's objection is
   * that a history growing a row per render is unreadable within a week. These
   * ids are derived from the episode, so there is at most **one** derived row
   * per episode ever, whatever happens afterwards: the filter below skips what
   * is already there, and even without it the store would treat the second
   * append as a no-op (D-015). The loop terminates for the same reason.
   */
  useEffect(() => {
    if (!ready) return
    const known = new Set(snapshot.records.map((record) => record.id))
    const fresh = derivedOutcomeRecords(view, { now, zone }).filter(
      (record) => !known.has(record.id),
    )
    if (fresh.length === 0) return
    void append(fresh)
  }, [ready, snapshot, view, now, zone, append])

  useEffect(() => {
    if (travelled) return
    const dueAt = nextOutcomeDueAt(view, { now, zone }, view.entities)
    if (dueAt === undefined) return

    const wait = dueAt - clock.now()
    // A window already open needs no timer; the current render has it.
    if (wait <= 0) return
    // setTimeout saturates past a 32-bit millisecond count and fires at once.
    if (wait > 2_147_483_000) return

    const timer = setTimeout(() => setNow(clock.now()), wait + 1_000)
    return () => clearTimeout(timer)
  }, [view, now, zone, clock, travelled])

  const value: MemoryContextValue = {
    ready,
    busy,
    backend,
    durable,
    snapshot,
    view,
    issues,
    loadedLabel,
    source,
    error,
    storageCheck,
    loadDocument,
    append,
    clear,
    verifyStorage,
    documentJson: () => snapshotToJson(snapshot, now),
    ownerSnapshot,
    canRestore: source === 'owner',
    restoreOwner,
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
