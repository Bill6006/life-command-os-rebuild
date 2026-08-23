/**
 * A count, worded so it reads (canonical plan section 61).
 *
 * "1 entries" is the shape this exists to stop. It survived every automated
 * check on this phase — a test asserting `1 entries` is exactly as green as one
 * asserting `1 entry` — and was found by reading the screen on a phone, which
 * is what section 61's rules are for.
 *
 * Deliberately not a general pluraliser. It takes both words, because English
 * plurals are irregular often enough that a rule would be wrong somewhere and
 * silently wrong everywhere else.
 */
export function countOf(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}
