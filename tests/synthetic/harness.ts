import { expect } from 'vitest'
import type { ActionRecommendationRecord, DecisionContext } from '../../src/domain/records'
import type { Instant, TimeZoneId, WeekStartDay } from '../../src/domain/time'
import { decide, type Decision, type DecideOptions } from '../../src/intelligence/engine'
import { snapshotFromWire, type SnapshotWire } from '../../src/memory/snapshot'
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
  /** What the engine makes of it, at the moment the scenario is written around. */
  decision(options?: DecideOptions): Decision
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
    decision: (options) =>
      decide(viewAt(scenario.now), { now: scenario.now, zone: scenario.zone }, options),
  }
}

/**
 * Load a hand-built document rather than a registered scenario.
 *
 * The variants a golden test needs — the same evening with one fact changed —
 * are not things the owner should find on the QA screen, so they are built by
 * the test and loaded through the same parser as everything else.
 */
export function decideOn(
  document: SnapshotWire,
  now: Instant,
  zone: TimeZoneId,
  options?: DecideOptions,
): Decision {
  const loaded = snapshotFromWire(document)
  expect(loaded.loaded, 'the document should load').toBe(true)
  return decide(buildView(loaded.snapshot, { now, zone }), { now, zone }, options)
}

/** What was chosen, as an id, or a note that nothing was. */
export function chosenId(decision: Decision): string {
  return decision.evaluation?.candidate.id ?? `nothing:${decision.noAction?.reason ?? 'unknown'}`
}

export function chosenDomain(decision: Decision): string | undefined {
  return decision.evaluation?.candidate.semantics.domain
}

export function sentenceOf(decision: Decision): string | undefined {
  return decision.explanation?.rendered.sentence
}

export function reasonOf(decision: Decision): string | undefined {
  return decision.explanation?.rendered.reason
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

// ---------------------------------------------------------------------------
// Histories with a past in them
// ---------------------------------------------------------------------------

/**
 * Re-exported rather than redefined.
 *
 * The scenario library needs to build past episodes too, so the builder lives
 * beside the kit and there is exactly one definition of what a written-down
 * episode looks like. Two would eventually disagree, and the one the tests used
 * would be the one that was wrong.
 */
export { pastEpisodeRecords, type PastEpisode } from '../../src/synthetic/kit'

/** An evening, described the way a recommendation record describes one. */
export function evening(overrides: Partial<DecisionContext> = {}): DecisionContext {
  return { block: 'evening', weekend: false, strain: 'none', usableMinutes: 60, ...overrides }
}
