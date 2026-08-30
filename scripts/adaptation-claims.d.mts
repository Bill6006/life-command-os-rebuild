/**
 * Types for {@link ./adaptation-claims.mjs}.
 *
 * The module itself is plain ESM because `scripts/android-gate.mjs` is a node
 * script that cannot import TypeScript, and QA-84-010's finding was that the
 * three gates had each grown their own narrower copy of the rule. One
 * definition, three importers — and this file is what lets the two TypeScript
 * importers see it as something other than `any`.
 */

/** The claims of future recommendation adaptation in one owner-visible string. */
export function adaptationClaims(text: string): readonly string[]

/**
 * The same class, calibrated for every screen: a **named** subject and
 * **futurity**, never ability. Narrower than {@link adaptationClaims}, which
 * stays broad on the blocker path where the copy is short and controlled.
 */
export const LONGEST_OPENER: number

export const LONGEST_CLOSER: number

export function couldOpenAClaim(text: string): boolean

export function couldCloseAClaim(text: string): boolean

export function adaptationClaimsOnAnyScreen(text: string): readonly string[]

/** The strings among `strings` that make such a claim, with the fragments found. */
export function claimingStrings(
  strings: readonly string[],
): readonly { readonly line: string; readonly claims: readonly string[] }[]

/** Wordings the guard must catch, including the ones that actually shipped. */
export const MUST_BE_CAUGHT: readonly string[]

/**
 * Every string the blocker path can put in front of the owner — the closed set
 * the synthetic gate holds it to. This, rather than the classifier, is what has
 * no escapes.
 */
export const APPROVED_BLOCKER_COPY: readonly string[]

/** The half assembled in `blockers.ts`, proved by walking the scenario library. */
export const APPROVED_FROM_BLOCKERS_MODULE: readonly string[]

/** The half the surfaces compose in JSX, proved by rendering them. */
export const APPROVED_FROM_SURFACES: readonly string[]

/** The half a record reads as, wherever it is read, proved by describing one. */
export const APPROVED_FROM_RECORDS: readonly string[]

/** The shapes an export line may have around a record's sentence. */
export const APPROVED_EXPORT_SCAFFOLDS: readonly string[]

/** Copy other screens show once a move has been blocked. Not blocker copy. */
export const APPROVED_WHEN_A_MOVE_IS_BLOCKED: readonly string[]

/** Whether a line is one of those. */
export function isApprovedWhenBlocked(line: string): boolean

/** Whether a normalised export line is one of those shapes and nothing more. */
export function isApprovedExportShape(shape: string): boolean

/** Whitespace-insensitive membership of {@link APPROVED_BLOCKER_COPY}. */
export function isApprovedBlockerCopy(line: string): boolean

/** Whether rendered text contains copy the catalogue approves. */
export function containsApprovedBlockerCopy(text: string): boolean

/** Honest sentences the guard must leave alone. */
export const MUST_BE_ALLOWED: readonly string[]

/**
 * What the owner reads as one sentence, collected in the browser.
 *
 * Pass it to `evaluate()`; it is self-contained on purpose.
 */
export interface ReadingUnit {
  readonly text: string
  /** True when this string came from inside the composed review control. */
  readonly generated: boolean
}

export function readingUnits(root: Element): ReadingUnit[]

/** Sentences the app-wide rule flags that are not promises of adaptation. */
export const APPROVED_NOT_A_PROMISE: readonly string[]

/** Those removed, so anything written beside one is still classified. */
export function withoutApprovedNonPromises(line: string): string

/** What the app says about its own future that D-187 does not forbid. */
export interface ApprovedFutureCopy {
  /** The sentence, as it is classified and removed. */
  readonly text: string
  /** A shorter anchor to look for in source, when `text` is a joined form. */
  readonly pin?: string
  /** The source files this sentence is allowed to live in, and no others. */
  readonly in: readonly string[]
}

export const APPROVED_FUTURE_COPY: readonly ApprovedFutureCopy[]

/** Those removed, so anything written beside one is still classified. */
export function withoutApprovedFutureCopy(line: string): string
