import { expect } from 'vitest'
import type { ActionRecommendationRecord } from '../../src/domain/records'
import type { Instant, TimeZoneId, WeekStartDay } from '../../src/domain/time'
import { snapshotFromWire } from '../../src/memory/snapshot'
import type { StoreSnapshot } from '../../src/memory/store'
import { buildView, type MemoryView } from '../../src/memory/view'
import type { Scenario } from '../../src/synthetic/kit'
import { scenarioById } from '../../src/synthetic/scenarios'

/**
 * Loading a golden scenario the long way round.
 *
 * The document goes through `snapshotFromWire`, which is the same parser a
 * pasted file uses. A golden scenario that took a shortcut into memory could
 * pass while the path real data takes was broken — the failure section 60
 * records as fixtures making hardcoded logic look correct.
 */

export interface LoadedScenario {
  readonly scenario: Scenario
  readonly snapshot: StoreSnapshot
  /** A view of the same history, from any moment and any timezone. */
  viewAt(now: Instant, zone?: TimeZoneId, weekStartsOn?: WeekStartDay): MemoryView
  /** A view at the moment the scenario is written around. */
  view(): MemoryView
}

export function loadScenario(id: string): LoadedScenario {
  const scenario = scenarioById(id)
  if (scenario === undefined) throw new Error(`No synthetic scenario called "${id}"`)

  const loaded = snapshotFromWire(scenario.build())
  expect(loaded.loaded, `${id} should load`).toBe(true)

  const viewAt = (now: Instant, zone?: TimeZoneId, weekStartsOn?: WeekStartDay): MemoryView =>
    buildView(loaded.snapshot, {
      now,
      zone: zone ?? scenario.zone,
      ...(weekStartsOn === undefined ? {} : { weekStartsOn }),
    })

  return {
    scenario,
    snapshot: loaded.snapshot,
    viewAt,
    view: () => viewAt(scenario.now),
  }
}

export function recommendationsIn(view: MemoryView): readonly ActionRecommendationRecord[] {
  return view.history.effective.filter(
    (record): record is ActionRecommendationRecord => record.kind === 'action-recommendation',
  )
}

/**
 * Words that must never stand in for a subject the system knows.
 *
 * Section 3: "The app never loses the noun and degrades into vague language
 * such as 'it' when the subject is known."
 */
export const ORPHAN_PRONOUNS = [
  'it',
  'its',
  "it's",
  'this',
  'that',
  'they',
  'them',
  'their',
  'those',
  'these',
  'thing',
  'stuff',
] as const

export function orphanPronounsIn(sentence: string): readonly string[] {
  const words = sentence.toLowerCase().match(/[a-z']+/g) ?? []
  return [...new Set(words.filter((word) => (ORPHAN_PRONOUNS as readonly string[]).includes(word)))]
}
