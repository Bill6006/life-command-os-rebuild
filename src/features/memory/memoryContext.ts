import { createContext, useContext } from 'react'
import type { CanonicalRecord } from '../../domain/records'
import type { AuthoringResult } from '../../intelligence/authoring'
import type { Instant, TimeZoneId, WeekStartDay } from '../../domain/time'
import type { ValidationIssue } from '../../domain/validation'
import type { RestoreOutcome, RestorePlan } from '../../memory/restore'
import type { StoreBackend, StoreSnapshot } from '../../memory/store'
import type { ShownMove } from '../../intelligence/situation'
import type { MemoryView } from '../../memory/view'
import type { HistorySource } from './projection'

/**
 * What every surface can see and do (canonical plan sections 14 and 31).
 *
 * Split from the provider only because a module that exports both a component
 * and a hook loses fast refresh. The interesting part is what is *not* here:
 * there is no way to write a fact directly, and no way to obtain a
 * recommendation. Records go in as records; decisions come from the engine.
 */

export interface StorageCheck {
  readonly ok: boolean
  readonly detail: string
}

/**
 * Whose history is on screen (R3-B1).
 *
 * The laboratory and the owner keep separate databases, because a synthetic
 * fixture is not a version of his life and must never be written over it. Every
 * surface reads whichever is active, so a scenario can still be inspected from
 * Now, Timeline, Insights, Life and a domain page — which is the whole point of
 * the laboratory — and the owner's own history is still there, untouched, when
 * the fixture is put away.
 *
 * It reaches surfaces through the context rather than through the laboratory
 * screen because the surfaces that most need to say it are the ones furthest
 * from QA: a person looking at Now is entitled to know whether he is looking at
 * his own evening.
 *
 * Declared in `projection.ts` and re-exported here, not written out twice. The
 * two copies were identical, which is exactly how they stay identical right up
 * until they do not — DEF-0053's class, on the type this time rather than on a
 * word.
 */
export type { HistorySource } from './projection'

export interface MemoryContextValue {
  readonly ready: boolean
  readonly busy: boolean
  readonly backend: StoreBackend | 'opening'
  readonly durable: boolean
  readonly snapshot: StoreSnapshot
  readonly view: MemoryView
  readonly issues: readonly ValidationIssue[]
  readonly loadedLabel: string | undefined
  /** Whose history the surfaces are reading. */
  readonly source: HistorySource
  readonly error: string | undefined
  readonly storageCheck: StorageCheck | undefined

  loadDocument(json: string, label?: string): Promise<void>
  append(records: readonly CanonicalRecord[]): Promise<void>
  /**
   * Introduce something the app can then refer to — F04, routing 84 package 3.
   *
   * The one write path that brings a **semantic entity** into being. Before
   * this phase there was none: no control under `src/features` called
   * `createEntity`, so the subject of a goal, a topic, a person, a place or a
   * skill could only arrive through a file — which is the largest single class
   * of finding in the owner-use review.
   *
   * Deliberately separate from {@link append} rather than an extra argument on
   * it. An entity is not a record: it has no envelope, no provenance and no
   * place in history, and folding the two into one call would make every
   * existing caller carry a parameter it can never use.
   *
   * **Entities are written first.** A record whose subject is not in the index
   * yet is a renderer with nothing to name, and D-018 makes that a refusal to
   * say anything rather than a fallback word — so for the moment between the
   * two writes, the safe order is the one where the name exists and nothing
   * refers to it yet.
   */
  create(authored: AuthoringResult): Promise<void>
  /**
   * Empty the laboratory and give the owner his own history back.
   *
   * Deliberately not "clear everything": it cannot reach the owner's records
   * from here, and the name used to promise that it could.
   */
  clear(): Promise<void>
  verifyStorage(): Promise<void>
  documentJson(): string

  /**
   * The owner's own store, read fresh from disk (canonical plan section 29).
   *
   * Deliberately **not** `snapshot`. `snapshot` is whatever history is on
   * screen, which while a fixture is loaded is the laboratory's — and a backup
   * of a synthetic life, filed under the owner's name and restored six months
   * later, is D-091's eighth invariant with the worst possible consequence. A
   * backup is of his own records, always, whatever he happens to be looking
   * at. It is read through the store rather than taken from React state for
   * the same reason `verifyStorage` reopens: a backup should be of what is
   * actually kept.
   */
  ownerSnapshot(): Promise<StoreSnapshot>

  /**
   * The real moment, for an artefact about the owner's own records.
   *
   * Deliberately not `now` and `zone`, for the same reason `ownerSnapshot` is
   * not `snapshot`: those are the clock the **screen** is being read under, and
   * loading a synthetic scenario sets them to whatever evening that scenario is
   * about. A backup taken in August while a February fixture was on screen was
   * stamped, filed and previewed as February (QA-07-005) — the records were
   * correctly his, and every date attached to them was the laboratory's.
   *
   * A backup's own moment is a fact about when it was taken, so it comes from
   * the system clock, always, whatever is being displayed.
   */
  ownerMoment(): { readonly at: Instant; readonly zone: TimeZoneId }

  /**
   * Whether a restore may run right now.
   *
   * False while a test history is on screen. A restore replaces the owner's
   * only copy of his own history, and the one thing that must never be in
   * doubt at that moment is which history is about to be replaced. Putting the
   * laboratory away is one press, and it is the same press the shell already
   * offers.
   */
  readonly canRestore: boolean

  /**
   * Apply a checked plan to the owner's store, verify it, and roll back if it
   * did not land.
   *
   * Takes a plan rather than a document: validation and the preview happen
   * before this is called, so by the time anything is written the owner has
   * already seen what he is about to do.
   */
  restoreOwner(plan: RestorePlan): Promise<RestoreOutcome>

  /**
   * Moves this session has already put on screen today — AUD-0025.
   *
   * **Not history, and deliberately not durable.** D-043 settled that nothing
   * is written when a screen renders, and every reason it gives still holds: a
   * row per render would be unreadable within a week, would poison the
   * duplication check, and would become learning evidence about an evening
   * nothing happened in. What was missing was something cheaper — ignoring a
   * suggestion is a response, and the most common one, and the app could not
   * count it at all. So it repeated itself: the identical kitchen sentence at
   * four separate hours of one day.
   *
   * It lives here because the surface is what knows a screen was rendered, and
   * it travels down to the engine as an argument on the moment. It never
   * reaches the store, the backup, the content fingerprint or Timeline.
   */
  readonly shown: readonly ShownMove[]
  /** Record that a move is on screen at the current moment. Idempotent. */
  noteShown(move: string): void

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

export const MemoryContext = createContext<MemoryContextValue | undefined>(undefined)

export function useMemory(): MemoryContextValue {
  const value = useContext(MemoryContext)
  if (value === undefined) throw new Error('useMemory must be used inside a MemoryProvider')
  return value
}
