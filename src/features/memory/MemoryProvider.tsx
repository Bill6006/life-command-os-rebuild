import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { countOf } from '../../domain/counts'
import type { CanonicalRecord } from '../../domain/records'
import {
  instant,
  localDayIdAt,
  systemClock,
  DEFAULT_WEEK_START,
  type Instant,
  type TimeZoneId,
  type WeekStartDay,
} from '../../domain/time'
import type { ValidationIssue } from '../../domain/validation'
import type { AuthoringResult } from '../../intelligence/authoring'
import { derivedOutcomeRecords } from '../../intelligence/derived'
import type { ShownMove } from '../../intelligence/situation'
import { forgetfulShownStore, openShownStore, type ShownStore } from './shownStore'
import { nextOutcomeDueAt } from '../../intelligence/outcomes'
import { indexedDbAvailable, openIndexedDbStore } from '../../memory/indexedDbStore'
import { createMemoryStore } from '../../memory/memoryStore'
import { fingerprint } from '../../memory/backup'
import {
  notAttempted,
  restoreInto,
  unconfirmed,
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
/**
 * A third database, and the separation is the design — AUD-0025.
 *
 * The shown ledger is a fact about *screens*, not about the owner's life. Keeping
 * it in its own database is what makes *"it never reaches a backup, a
 * fingerprint or an export"* a property of where it lives rather than a rule
 * somebody has to remember: nothing that walks the record log can see it,
 * `replaceAll` cannot touch it, and a restore cannot bring it back.
 */
const SHOWN_DB = `${OWNER_DB}:shown`

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
  /**
   * Whether the restore currently running has already written the backup.
   *
   * A ref rather than state: nothing renders from it, and it has to be
   * readable from the `catch` of the operation that set it (QA-07-007).
   */
  const applied = useRef(false)
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

  /*
   * Declared here rather than beside `noteShown`, because the paths that
   * replace the visible history have to be able to empty it — QA-81-006's
   * sibling.
   *
   * The ledger counts screens, and a screen is about a history. Swap the
   * history and the counts are about nothing: in the laboratory, loading one
   * fixture and then another would carry the first one's showings into the
   * second, and a move could arrive already used up. That is not a defect an
   * owner can reach — he has one history — but it is reachable by exactly the
   * sequence an auditor runs, and a QA session that suppresses a move for
   * having been seen in a different life is a session reporting on a screen
   * nobody would ever get.
   */
  const shownLedger = useRef(new Map<string, ShownMove>())
  const [shown, setShown] = useState<readonly ShownMove[]>([])
  /**
   * The durable half — AUD-0025, D-275.
   *
   * The map above is the session's own copy and stays: reading it is
   * synchronous, and a decision is recomputed on every clock tick. This is what
   * makes the same count survive the app being closed, which is the case an
   * owner actually lives — **a phone picked up at half past six and again at
   * seven in the evening is two sessions**, and the second one had never heard
   * of the first.
   */
  const shownStore = useRef<ShownStore>(forgetfulShownStore())

  /** Forget what has been on screen, because it was about a different history. */
  const forgetShown = useCallback(() => {
    // The store is cleared whether or not the session's copy holds anything: a
    // reload with a fixture loaded would otherwise inherit yesterday's owner
    // session through a map that happened to be empty.
    void shownStore.current.clear()
    if (shownLedger.current.size === 0) return
    shownLedger.current = new Map()
    setShown([])
  }, [])

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
      const seen = await openShownStore({ name: SHOWN_DB })
      if (!live) {
        owner.close()
        laboratory.close()
        seen.close()
        return
      }
      stores.current = { owner, laboratory }
      shownStore.current = seen
      setBackend(owner.backend)
      setDurable(owner.durable)

      /*
       * What was already put in front of him today — AUD-0025.
       *
       * Read once, on open, into the session's own map. The store keeps only the
       * current owner-local day and drops anything else as it reads, so this is
       * bounded by the number of moves the app can propose in a day and cannot
       * carry a stale count into a decision.
       */
      const already = await seen.read(localDayIdAt(clock.now(), clock.zone()))
      if (live && already.length > 0) {
        shownLedger.current = new Map(
          already.map((entry) => [`${entry.move}|${entry.dayId}`, entry]),
        )
        setShown(already)
      }

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
      shownStore.current.close()
      stores.current.owner?.close()
      stores.current.laboratory?.close()
      stores.current = {}
    }
    /*
     * `clock` is a memo with no inputs, so it is the same object for the life of
     * the provider and listing it changes nothing — but listing it is what makes
     * that a fact the linter checks rather than one a reader has to verify. The
     * open effect reads it once, for the owner-local day the shown ledger is
     * about (AUD-0025).
     */
  }, [projection, clock])

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
          forgetShown()
        }
        if (job.isCurrent()) setIssues(load.issues)
      } catch (caught) {
        if (job.isCurrent()) setError(describe(caught))
      } finally {
        if (job.isCurrent()) setBusy(false)
      }
    },
    [projection, forgetShown],
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

  /**
   * Introduce something, entities first — F04.
   *
   * Same store selection as `append`, for the same reason: what the owner is
   * looking at is what he is adding to. The two writes are sequential rather
   * than transactional because they cannot fail halfway in a way that matters —
   * `putEntities` is a put keyed by id, so an entity written with no record
   * behind it is inert and invisible, and a repeat of the same gesture writes
   * the identical entity over the top of it.
   *
   * The reverse order is the one that could go wrong: a record naming an entity
   * the index does not have is a dangling reference, and every renderer is
   * built to refuse to speak rather than reach for "it" (D-018).
   */
  const create = useCallback(
    async (authored: AuthoringResult) => {
      const job = projection.beginHere()
      const current = storeFor(job.against)
      if (current === undefined) return
      if (authored.entities.length === 0 && authored.records.length === 0) return

      setBusy(true)
      setError(undefined)
      try {
        if (authored.entities.length > 0) await current.putEntities(authored.entities)
        const result =
          authored.records.length === 0
            ? { appended: 0, skipped: 0, rejected: [] }
            : await current.append(authored.records)
        const after = await current.snapshot()
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
      forgetShown()
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
  }, [clock, projection, forgetShown])

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
  /** The real clock, for artefacts about his own records (QA-07-005). */
  const ownerMoment = useCallback(() => ({ at: clock.now(), zone: clock.zone() }), [clock])

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

        applied.current = true

        if (projection.show('owner', job)) {
          setSource('owner')
          setSnapshot(outcome.snapshot)
          forgetShown()
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
         * to break.
         *
         * **It is part of the result, not a footnote under it (QA-07-007).**
         * This used to return `outcome` — the success from two steps earlier —
         * whatever happened here, and merely set a `storageCheck` line beside
         * it. Force the reopen to fail and the screen said, in green, that the
         * store now held the backup exactly, with "what came back after
         * reopening the database is not what was restored" printed underneath:
         * two contradictory claims about one operation, the confident one
         * first. Section 29 forbids a false success and does not stop
         * forbidding it because a caveat follows.
         *
         * Three ways it can fail, and all three get the same answer: the
         * reopen threw, the reopen fell back to an in-memory store (which
         * reads as an empty history and is not his disk at all), or the
         * reopened contents do not match. None is rolled back — see the
         * `confirm` stage in `restore.ts` for why undoing here would be worse
         * than saying so.
         */
        stores.current.owner?.close()
        stores.current.laboratory?.close()
        const reopenedOwner = await openStore(OWNER_DB)
        const reopenedLaboratory = await openStore(LABORATORY_DB)
        stores.current = { owner: reopenedOwner, laboratory: reopenedLaboratory }
        setBackend(reopenedOwner.backend)
        setDurable(reopenedOwner.durable)

        /*
         * A fallback store is not evidence about the owner's disk.
         *
         * `openStore` degrades to memory when IndexedDB will not open, and an
         * empty in-memory store fingerprints as an empty history — which would
         * read here as "the restore lost everything", and would be published
         * to the screen as his.
         */
        if (!reopenedOwner.durable && owner.durable) {
          if (job.mayPublish()) {
            setStorageCheck({
              ok: false,
              detail: 'the database would not reopen, so what is on disk could not be read back',
            })
          }
          return unconfirmed(
            'The restore was written and checked, and then the database would not reopen — so the app cannot confirm what is on disk. Nothing was undone.',
            'the reopened store fell back to memory; the restored history was verified once through the original connection',
          )
        }

        const fromDisk = await reopenedOwner.snapshot()
        if (fingerprint(fromDisk) !== plan.expected) {
          if (job.mayPublish()) {
            setStorageCheck({
              ok: false,
              detail: 'what came back after reopening the database is not what was restored',
            })
          }
          return unconfirmed(
            'The restore was written and checked, and then reading the database again gave something else. Nothing was undone, and you should look before restoring anything over it.',
            `expected ${plan.expected}, reopened ${fingerprint(fromDisk)}`,
          )
        }

        if (job.mayPublish()) {
          setSnapshot(fromDisk)
          setStorageCheck({
            ok: true,
            detail: `reopened the database and read back ${countOf(fromDisk.records.length, 'record', 'records')}, identical`,
          })
        }
        return outcome
      } catch (caught) {
        if (job.isCurrent()) setError(describe(caught))
        /*
         * Which of the two honest answers this is depends on whether the
         * write had already landed. `applied` is set the moment `restoreInto`
         * returns a success, so a throw from the reopen path can no longer be
         * reported as "nothing was attempted" — which is what it used to say,
         * and is the opposite of what happened.
         */
        return applied.current
          ? unconfirmed(
              'The restore was written and checked, and then the app could not read the database again. Nothing was undone.',
              describe(caught),
            )
          : notAttempted(describe(caught))
      } finally {
        applied.current = false
        if (job.isCurrent()) setBusy(false)
      }
    },
    [clock, projection, forgetShown],
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

  /*
   * What has already been put in front of the owner today — AUD-0025.
   *
   * Session-scoped and non-durable on purpose. D-107's rule is that nothing
   * about the transport may enter the identity of the thing transported, and
   * the same reasoning applies here in a smaller way: this is a fact about
   * *screens*, not about the owner's life, and it must not be able to reach a
   * backup, a fingerprint or an export. Rebuilding it per session is enough for
   * the thing it is for, which is within-day repetition.
   *
   * A ref rather than state, because noting a render must not itself cause one:
   * the decision is recomputed when the clock moves, and the entry is stamped
   * with the moment it was shown at, so the move on screen is never penalised
   * for being on screen right now.
   */
  const noteShown = useCallback(
    (move: string) => {
      const dayId = localDayIdAt(now, zone)
      const key = `${move}|${dayId}`
      const held = shownLedger.current.get(key)
      if (held !== undefined && held.at === now) return
      const entry: ShownMove = { move, dayId, at: now, count: (held?.count ?? 0) + 1 }
      shownLedger.current.set(key, entry)
      setShown([...shownLedger.current.values()])
      /*
       * And the same row, upserted — AUD-0025.
       *
       * A `put` on a fixed key rather than an append, which is the audit's own
       * condition: *"an upsert per render is fine, an append is not."* Not
       * awaited, because noting a render must not make the render wait, and a
       * write that fails leaves the session's own count exactly as it was.
       */
      void shownStore.current.note(entry)
    },
    [now, zone],
  )

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
    create,
    clear,
    verifyStorage,
    documentJson: () => snapshotToJson(snapshot, now),
    ownerSnapshot,
    ownerMoment,
    canRestore: source === 'owner',
    restoreOwner,
    shown,
    noteShown,
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
