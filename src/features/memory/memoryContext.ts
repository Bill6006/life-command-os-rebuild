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

export const MemoryContext = createContext<MemoryContextValue | undefined>(undefined)

export function useMemory(): MemoryContextValue {
  const value = useContext(MemoryContext)
  if (value === undefined) throw new Error('useMemory must be used inside a MemoryProvider')
  return value
}
