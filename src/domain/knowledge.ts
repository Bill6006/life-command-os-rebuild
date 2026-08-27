import type { Branded } from './branded'
import type { RecordId } from './ids'
import { freshUntil, type FreshnessWindow } from './windows'
import type { Instant, TimeZoneId } from './time'

/**
 * What the system knows, and how well (canonical plan sections 3, 12 and 17.1).
 *
 * Scenario G-009 is the reason this file exists: a field that has never been
 * answered must not become a zero, an average or a default. So there is no
 * `valueOr(fallback)` here and there never will be. The only ways out of a
 * `Knowledge<T>` are `matchKnowledge`, which makes you handle the unknown case,
 * and `valueIfUsable`, which hands back `undefined` — an absence you have to
 * notice, not a number you can quietly add up.
 *
 * Four states, because the QA inspector has to tell them apart (section 31):
 *
 *   explicit  directly observed — the owner said so, or a device measured it
 *   inferred  we worked it out, with a confidence and the records behind it
 *   stale     we knew it once, and its freshness window has passed
 *   unknown   we do not know, and we say which flavour of not knowing
 *
 * Stale is a separate state rather than a flag because the alternative — a
 * value with `fresh: false` that reads fine if you forget to check — is how
 * months-old assumptions end up presented as current (section 63).
 */

export type Confidence = Branded<number, 'Confidence'>

export function confidence(value: number): Confidence {
  if (!Number.isFinite(value)) throw new RangeError(`Confidence must be finite, got ${value}`)
  return Math.min(1, Math.max(0, value)) as Confidence
}

export type UnknownReason =
  /** Nothing has ever spoken to this. */
  | 'never-observed'
  /** The owner withdrew what we had, and put nothing in its place. */
  | 'retracted'
  /** Records disagree and none of them wins. */
  | 'contradicted'
  /** Only a bounded context spoke to this, and its window has closed. */
  | 'lapsed'
  /** The concept does not apply in this situation. */
  | 'not-applicable'
  /** The only rows that mention it could not be read. */
  | 'malformed'
  /**
   * There is an answer and the owner has not allowed it to be reasoned from —
   * D-167.
   *
   * The seventh, and D-149 anticipated the shape of adding one: a new reason is
   * a compile error in this file rather than a seventh thing that silently
   * reads as never having been asked. It is emphatically **not**
   * `never-observed` — the record holds the answer, the Private page shows it,
   * and the engine cannot see it. Saying "never answered" about it would be the
   * app lying about the owner's own history in order to keep a promise it is
   * already keeping honestly.
   */
  | 'withheld'

export interface Explicit<T> {
  readonly state: 'explicit'
  readonly value: T
  readonly observedAt: Instant
  readonly source: RecordId
}

export interface Inferred<T> {
  readonly state: 'inferred'
  readonly value: T
  readonly observedAt: Instant
  readonly confidence: Confidence
  readonly basis: readonly RecordId[]
}

export interface Stale<T> {
  readonly state: 'stale'
  /** The last thing we knew. Believable history, not a current answer. */
  readonly value: T
  readonly observedAt: Instant
  readonly staleSince: Instant
  readonly window: FreshnessWindow
  readonly wasInferred: boolean
  readonly basis: readonly RecordId[]
}

export interface Unknown {
  readonly state: 'unknown'
  readonly reason: UnknownReason
  readonly note?: string
}

export type Knowledge<T> = Explicit<T> | Inferred<T> | Stale<T> | Unknown

export type KnowledgeState = Knowledge<unknown>['state']

export function explicit<T>(value: T, observedAt: Instant, source: RecordId): Explicit<T> {
  return { state: 'explicit', value, observedAt, source }
}

export function inferred<T>(
  value: T,
  observedAt: Instant,
  howSure: Confidence,
  basis: readonly RecordId[],
): Inferred<T> {
  return { state: 'inferred', value, observedAt, confidence: howSure, basis }
}

export function unknown(reason: UnknownReason, note?: string): Unknown {
  return note === undefined ? { state: 'unknown', reason } : { state: 'unknown', reason, note }
}

/**
 * How not knowing reads out loud, in one place — QA-82-008.
 *
 * `UnknownReason` exists because the six ways of not knowing are not the same
 * thing, and the QA inspector has to tell them apart (section 31). The review
 * export threw the distinction away: it printed **“never answered”** for every
 * entry in `facts.inState('unknown')`, so a soreness reading the owner gave at
 * 06:41 and withdrew at 06:55 left a document saying, of the same concept and
 * in the same breath as “Withdrew an earlier entry”, that he had never been
 * asked. Four of the six reasons are a claim about *now* on top of an answer
 * that exists in the record; only `never-observed` is a claim about the whole
 * history, and that is the one sentence the export was using for all of them.
 *
 * **A `Record` rather than a function per caller**, so a seventh reason is a
 * compile error here instead of a seventh thing that silently reads as never
 * having been asked. That is the shape of the defect: the fallback was the
 * whole behaviour.
 *
 * The note carries the specifics where `resolveFacts` left any — which records
 * disagreed, that the only rows were unreadable, that the only records for this
 * are still in the future. That last one is why the phrases are about *being
 * answered* rather than about the record holding nothing: a concept whose only
 * record is dated tomorrow has genuinely never been answered, and the note is
 * what stops that reading as a life with nothing in it.
 */
const UNKNOWN_READS: Record<UnknownReason, string> = {
  'never-observed': 'never answered',
  retracted: 'answered once, and the answer was withdrawn',
  contradicted: 'answered more than once, and nothing separates the answers',
  lapsed: 'answered for a period that has since ended',
  'not-applicable': 'does not apply here',
  malformed: 'unreadable',
  withheld: 'answered, and kept out of the app’s reasoning by your own setting',
}

export function describeUnknown(state: Unknown): string {
  const reads = UNKNOWN_READS[state.reason]
  return state.note === undefined ? reads : `${reads} (${state.note})`
}

export function staleFrom<T>(
  known: Explicit<T> | Inferred<T>,
  staleSince: Instant,
  window: FreshnessWindow,
): Stale<T> {
  return {
    state: 'stale',
    value: known.value,
    observedAt: known.observedAt,
    staleSince,
    window,
    wasInferred: known.state === 'inferred',
    basis: known.state === 'inferred' ? known.basis : [known.source],
  }
}

export interface KnowledgeHandlers<T, R> {
  explicit: (known: Explicit<T>) => R
  inferred: (known: Inferred<T>) => R
  stale: (known: Stale<T>) => R
  unknown: (known: Unknown) => R
}

/** Every state must be handled. That is the whole point. */
export function matchKnowledge<T, R>(
  knowledge: Knowledge<T>,
  handlers: KnowledgeHandlers<T, R>,
): R {
  switch (knowledge.state) {
    case 'explicit':
      return handlers.explicit(knowledge)
    case 'inferred':
      return handlers.inferred(knowledge)
    case 'stale':
      return handlers.stale(knowledge)
    case 'unknown':
      return handlers.unknown(knowledge)
  }
}

/** Explicit or inferred: safe to reason from right now. */
export function isUsable<T>(knowledge: Knowledge<T>): knowledge is Explicit<T> | Inferred<T> {
  return knowledge.state === 'explicit' || knowledge.state === 'inferred'
}

export function valueIfUsable<T>(knowledge: Knowledge<T>): T | undefined {
  return isUsable(knowledge) ? knowledge.value : undefined
}

/** Includes stale. For showing history and for explaining what we used to think. */
export function lastKnownValue<T>(knowledge: Knowledge<T>): T | undefined {
  return knowledge.state === 'unknown' ? undefined : knowledge.value
}

export function basisOf<T>(knowledge: Knowledge<T>): readonly RecordId[] {
  switch (knowledge.state) {
    case 'explicit':
      return [knowledge.source]
    case 'inferred':
    case 'stale':
      return knowledge.basis
    case 'unknown':
      return []
  }
}

export function mapKnowledge<T, U>(
  knowledge: Knowledge<T>,
  transform: (value: T) => U,
): Knowledge<U> {
  switch (knowledge.state) {
    case 'explicit':
      return { ...knowledge, value: transform(knowledge.value) }
    case 'inferred':
      return { ...knowledge, value: transform(knowledge.value) }
    case 'stale':
      return { ...knowledge, value: transform(knowledge.value) }
    case 'unknown':
      return knowledge
  }
}

/**
 * Age a piece of knowledge against its freshness window.
 *
 * Durable knowledge never arrives here as stale, which is what stops the app
 * asking about a settled custody arrangement every evening (section 8).
 */
export function applyFreshness<T>(
  knowledge: Knowledge<T>,
  now: Instant,
  window: FreshnessWindow,
  zone: TimeZoneId,
): Knowledge<T> {
  if (!isUsable(knowledge)) return knowledge
  const deadline = freshUntil(knowledge.observedAt, window, zone)
  if (deadline === undefined || now < deadline) return knowledge
  return staleFrom(knowledge, deadline, window)
}

// ---------------------------------------------------------------------------
// Aggregation that cannot manufacture a number
// ---------------------------------------------------------------------------

export function usableValues<T>(items: readonly Knowledge<T>[]): readonly T[] {
  const out: T[] = []
  for (const item of items) if (isUsable(item)) out.push(item.value)
  return out
}

/** A count of how many things we know. Zero here is a true answer. */
export function countUsable<T>(items: readonly Knowledge<T>[]): number {
  return usableValues(items).length
}

/**
 * A deliberately coarse ladder, not a model.
 *
 * The plan says the system must not invent precision, and a tidy formula over
 * a sample count would be exactly that. Phase 2's evaluator replaces this with
 * something earned from outcomes; nothing in Phase 1 makes a decision from it.
 */
export function confidenceFromSampleCount(samples: number): Confidence {
  if (samples <= 0) return confidence(0)
  if (samples === 1) return confidence(0.2)
  if (samples === 2) return confidence(0.35)
  if (samples <= 4) return confidence(0.5)
  if (samples <= 9) return confidence(0.65)
  return confidence(0.8)
}

function aggregate(
  items: readonly Knowledge<number>[],
  reduce: (values: readonly number[]) => number,
): Knowledge<number> {
  const usable = items.filter(isUsable)
  const first = usable[0]
  // No samples means we do not know. It does not mean zero, and it does not
  // mean the average of nothing. This is G-009 in two lines.
  if (first === undefined) return unknown('never-observed')

  let observedAt = first.observedAt
  const basis: RecordId[] = []
  const values: number[] = []
  for (const item of usable) {
    values.push(item.value)
    if (item.observedAt > observedAt) observedAt = item.observedAt
    for (const source of basisOf(item)) basis.push(source)
  }

  // An aggregate is something we worked out, so it is inferred even when every
  // input was the owner speaking directly.
  return inferred(reduce(values), observedAt, confidenceFromSampleCount(values.length), basis)
}

export function averageOfUsable(items: readonly Knowledge<number>[]): Knowledge<number> {
  return aggregate(items, (values) => values.reduce((a, b) => a + b, 0) / values.length)
}

export function sumOfUsable(items: readonly Knowledge<number>[]): Knowledge<number> {
  return aggregate(items, (values) => values.reduce((a, b) => a + b, 0))
}

export function latestUsable<T>(items: readonly Knowledge<T>[]): Knowledge<T> {
  let best: Explicit<T> | Inferred<T> | undefined
  for (const item of items) {
    if (!isUsable(item)) continue
    if (best === undefined || item.observedAt > best.observedAt) best = item
  }
  return best ?? unknown('never-observed')
}

// ---------------------------------------------------------------------------
// Asking
// ---------------------------------------------------------------------------

export interface AskPolicy {
  /** Whether not knowing this could actually change a decision (section 12). */
  readonly materialToDecision: boolean
  /** Whether a lapsed answer is worth re-asking, or history is enough. */
  readonly askWhenStale: boolean
}

/**
 * Whether the system should spend a question on this.
 *
 * Known things are never re-asked — that is scenario G-002, and section 4.5's
 * promise that the app needs less input as it learns more. Unknown things are
 * asked about only when the answer could change what happens next, which is the
 * other half of G-009.
 */
export function shouldAsk<T>(knowledge: Knowledge<T>, policy: AskPolicy): boolean {
  if (!policy.materialToDecision) return false
  return matchKnowledge(knowledge, {
    explicit: () => false,
    inferred: () => false,
    stale: () => policy.askWhenStale,
    unknown: (state) => state.reason !== 'not-applicable',
  })
}
