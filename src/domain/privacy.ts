/**
 * Privacy classification (canonical plan sections 11 and 39).
 *
 * The plan asks for privacy metadata at minimum covering normal, sensitive,
 * private and child/family-sensitive, and is explicit about two things that
 * pull in opposite directions: normal surfaces should not casually expose
 * explicit private detail, and it must never be technically impossible to
 * export the private domain. Both are honoured here — discretion is a display
 * decision, never a storage decision. Nothing is dropped on the way in.
 */

export const PRIVACY_CLASSES = ['normal', 'sensitive', 'private', 'child-family-sensitive'] as const

export type PrivacyClass = (typeof PRIVACY_CLASSES)[number]

export function isPrivacyClass(value: unknown): value is PrivacyClass {
  return typeof value === 'string' && (PRIVACY_CLASSES as readonly string[]).includes(value)
}

/**
 * How much discretion a shared surface owes this class.
 *
 * This is a display ordering, not a judgement about importance. Fatherhood
 * outranks a normal note because a child's detail deserves care, and the
 * private domain outranks everything because section 11 says explicit private
 * detail should not appear on Now or Timeline unasked.
 */
const DISCRETION_RANK: Record<PrivacyClass, number> = {
  normal: 0,
  sensitive: 1,
  'child-family-sensitive': 2,
  private: 3,
}

export function mostSensitive(classes: readonly PrivacyClass[]): PrivacyClass {
  let winner: PrivacyClass = 'normal'
  for (const candidate of classes) {
    if (DISCRETION_RANK[candidate] > DISCRETION_RANK[winner]) winner = candidate
  }
  return winner
}

export type DisplaySurface = 'primary' | 'inspection' | 'export'

export interface DisplayPolicy {
  readonly surface: DisplaySurface
  /**
   * The owner has asked to see private detail on this surface. Section 4.3 —
   * the owner decides what they see, so this is never inferred.
   */
  readonly revealPrivate: boolean
}

export const DISCREET_PRIMARY: DisplayPolicy = { surface: 'primary', revealPrivate: false }
export const FULL_EXPORT: DisplayPolicy = { surface: 'export', revealPrivate: true }

/**
 * Whether the detail of something in this class may be rendered.
 *
 * A `false` here means "show that it exists, not what it says" — never "drop
 * it". A surface that silently omits the row would tell the owner their
 * history is thinner than it is.
 */
export function mayShowDetail(privacy: PrivacyClass, policy: DisplayPolicy): boolean {
  if (policy.surface === 'export') return true
  if (privacy === 'private') return policy.revealPrivate
  return true
}

/** Stands in for withheld detail so the row still reads as a real entry. */
export function discreetPlaceholder(privacy: PrivacyClass): string {
  return privacy === 'private' ? 'Private entry' : 'Withheld'
}

// ---------------------------------------------------------------------------
// What the private area promises, and why the sentence lives here — F30
// ---------------------------------------------------------------------------

/**
 * The Private page's own description of the discretion it gets.
 *
 * It read **"Yours to enter. Nothing here appears anywhere else."** and that
 * was not true. `mayShowDetail` withholds the *detail* of a private record from
 * a primary surface and `discreetPlaceholder` stands in for it — deliberately,
 * because a surface that dropped the row would tell the owner his history is
 * thinner than it is. So Timeline carries a dated row reading **"Private
 * entry"**: the words are concealed and the fact that something was entered,
 * and when, is not. Concealing the sentence is not concealing the entry.
 *
 * Plan section 11 gives two ways out — withhold the existence and timing too,
 * or say what the promise actually covers — and this is the second. The first
 * would mean dropping the row from Timeline, which is the participation-leak
 * repair the *export* needed (`compose.ts`) and the opposite of what the
 * owner's own screen needs: he already knows what is in his private area, and a
 * record that hides rows from him is a record he cannot trust the length of.
 *
 * **The sentence lives beside the policy it describes, and that is the point.**
 * It was written in `domainPages.ts` and the behaviour was decided here, two
 * files apart, and they disagreed for four phases without anything noticing.
 * A change to `mayShowDetail` or `discreetPlaceholder` is now a change to a
 * promise sitting in the same file, and `tests/synthetic/private-promise.test.ts`
 * reads this constant from one end and renders a private record from the other.
 *
 * It says nothing about export, because export is not this page's behaviour and
 * the Data screen states its own. It says nothing about influence either: that
 * is D-167's permission, it is off by default, and it is routing 84's.
 */
export const PRIVATE_PAGE_PROMISE =
  'Yours to enter. The words stay on this page — Timeline shows that an entry exists and when, never what it says.'
