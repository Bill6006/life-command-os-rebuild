import { createContext, useContext } from 'react'
import type { CanonicalRecord } from '../../domain/records'
import type { Instant, TimeZoneId, WeekStartDay } from '../../domain/time'
import type { ValidationIssue } from '../../domain/validation'
import type { StoreBackend, StoreSnapshot } from '../../memory/store'
import type { MemoryView } from '../../memory/view'

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
 * This is on the context rather than kept inside the laboratory screen because
 * the surfaces that most need to say it are the ones furthest from QA: a person
 * looking at Now is entitled to know whether he is looking at his own evening.
 */
export type HistorySource = 'owner' | 'laboratory'

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
   * Empty the laboratory and give the owner his own history back.
   *
   * Deliberately not "clear everything": it cannot reach the owner's records
   * from here, and the name used to promise that it could.
   */
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

export const MemoryContext = createContext<MemoryContextValue | undefined>(undefined)

export function useMemory(): MemoryContextValue {
  const value = useContext(MemoryContext)
  if (value === undefined) throw new Error('useMemory must be used inside a MemoryProvider')
  return value
}
