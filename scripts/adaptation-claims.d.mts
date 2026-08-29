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

/** Whether a normalised export line is one of those shapes and nothing more. */
export function isApprovedExportShape(shape: string): boolean

/** Whitespace-insensitive membership of {@link APPROVED_BLOCKER_COPY}. */
export function isApprovedBlockerCopy(line: string): boolean

/** Whether rendered text contains copy the catalogue approves. */
export function containsApprovedBlockerCopy(text: string): boolean

/** Honest sentences the guard must leave alone. */
export const MUST_BE_ALLOWED: readonly string[]
