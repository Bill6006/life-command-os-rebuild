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
