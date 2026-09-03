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

// ---------------------------------------------------------------------------
// What the app may reason from — D-167, F30, package 6
// ---------------------------------------------------------------------------

/**
 * The standing permissions the owner controls.
 *
 * One, and the owner wrote it himself: **"Allow Private / Sexual Health to
 * influence recommendations"**, default **off**. It is neither of the two
 * options the audit framed — not "section 11 wins behind a structural barrier"
 * and not "the registry wins, inspect-and-record" — but a third: *the registry
 * may win, when and only when the owner has said so*.
 *
 * ## Domain-level, not per entry
 *
 * D-167 is explicit. Per-entry consent is burden without a demonstrated
 * benefit, and section 4.5 governs. If later evidence shows one control is not
 * enough, that is a decision somebody makes in writing.
 *
 * ## What "off" means, structurally
 *
 * Not "the engine politely declines to look". `createFactReader` cannot read a
 * private concept at all while this is off — the reading resolves to
 * `unknown` with reason `withheld`, and nothing downstream can distinguish it
 * from a fact nobody has ever supplied, because there is nothing to
 * distinguish. That is what makes *"a private reading can be stored without
 * being reasoned from"* a property of the code rather than a promise about it.
 *
 * ## And what "on" does not mean
 *
 * It does not put an intimate reading on a screen. When the permission is on,
 * the value becomes legible to the decision layer and the **rendered** reading
 * stays `discreetPlaceholder` everywhere — the structural discretion guard
 * D-167 names as a precondition rather than a substitute for consent. Nothing
 * in this phase makes a recommendation from private evidence: that is
 * AUD-0040's, in the later Reach package, and this is the permission it will
 * have to ask.
 */
export const PERMISSIONS = [
  {
    id: 'private-influence',
    label: 'Allow Private / Sexual Health to influence recommendations',
    /** What it does, in view while he decides — D-176. */
    note: 'Off by default. While it is off, what you enter here is stored and shown on this page and the app cannot read it when it works out what to suggest. Turning it off later stops any future use; it never rewrites what is already recorded.',
    /** The record's statement when granted and when not. */
    granted: 'Private / Sexual Health may influence recommendations',
    withheld: 'Private / Sexual Health does not influence recommendations',
    /** The privacy class this permission unlocks for reasoning. */
    covers: 'private',
  },
] as const

export type PermissionId = (typeof PERMISSIONS)[number]['id']

export function isPermissionId(value: unknown): value is PermissionId {
  return typeof value === 'string' && PERMISSIONS.some((entry) => entry.id === value)
}

export interface PermissionState {
  /** Whether the owner has granted this. Absent means no, because it is. */
  granted(permission: PermissionId): boolean
}

/**
 * Nothing granted.
 *
 * The default everywhere, and the default that matters: a permission nobody
 * gave is one that was not given, so the safe state needs no record to exist.
 */
export const NO_PERMISSIONS: PermissionState = { granted: () => false }

/**
 * Whether the decision layer may read a fact of this class.
 *
 * `normal`, `sensitive` and `child-family-sensitive` have always been readable
 * and stay so — the app has reasoned from sleep, from money and from a child's
 * skills since Phase 1, and section 11's concern is the private domain
 * specifically. `private` is the one class that waits for the owner's word.
 *
 * Deliberately a different function from {@link mayShowDetail}, in the same
 * file, for the reason D-175 gives: the promise and the policy live together,
 * and these are two different promises. One is about what a surface may print;
 * this is about what the engine may know.
 */
export function mayReasonFrom(privacy: PrivacyClass, permissions: PermissionState): boolean {
  if (privacy !== 'private') return true
  return permissions.granted('private-influence')
}

/** The permission entry, for a surface that renders the control. */
export function permissionDefinition(id: PermissionId): (typeof PERMISSIONS)[number] {
  const found = PERMISSIONS.find((entry) => entry.id === id)
  // The list is a literal and the id type is derived from it, so this cannot
  // miss. The throw is the compiler's assertion made visible at runtime rather
  // than a case anybody has to handle.
  if (found === undefined) throw new RangeError(`No permission called "${id}"`)
  return found
}

// ---------------------------------------------------------------------------
// The boundary as one place rather than seven — routing 91, package 91.3
// ---------------------------------------------------------------------------

/**
 * Whether the app may raise material of this class **of its own accord**.
 *
 * ## The finding this closes
 *
 * `ROUTING_91_BRIEF.md` section 4 item 6 records that the private boundary was
 * *"not yet a single chokepoint"*: {@link mayReasonFrom} is the reasoning check
 * and is real, but six further sites excluded private material by comparing a
 * privacy value to the string `'private'` in place —
 * `coverage.ts` twice, `insights.ts` four times. Every one of them was correct.
 * The problem is that each was a **convention** re-decided at the call site, so
 * *"private material is never raised unasked"* was a claim about six lines
 * rather than a property of the code, and a seventh site would have been written
 * the same way with nothing noticing.
 *
 * ## Why this is a different question from {@link mayReasonFrom}
 *
 * The two are deliberately separate functions and neither may be substituted for
 * the other.
 *
 * - {@link mayReasonFrom} asks **"may the engine know this?"** and the owner's
 *   permission answers it (D-167). It is the one the interpreter uses.
 * - This asks **"may the app bring this up when nobody asked?"** and the answer
 *   is no, permission or not. Coverage nagging about a silent private area, a
 *   trajectory card about a private reading, an evidence row naming one — those
 *   are section 11's *display discretion* concern, and D-167 is explicit that
 *   granting the permission does **not** put an intimate reading on a screen.
 *
 * So this takes no {@link PermissionState} argument, and that absence is the
 * design: a caller who wanted to make it permission-aware would have to change
 * this function, in this file, beside the sentence saying why it is not.
 *
 * Whether the owner may *look* at his own private material on its own page is a
 * third question again, and {@link mayShowDetail} answers it.
 */
export function mayRaiseUnasked(privacy: PrivacyClass): boolean {
  return privacy !== 'private'
}

/**
 * Whether a document the owner scoped may describe material of this class —
 * correction 3.11, the last of the sites.
 *
 * ## The fourth question, and why it is a fourth function
 *
 * There are four separate questions about a privacy class and each has its own
 * answer in this file:
 *
 * - **May the engine know this?** — {@link mayReasonFrom}, and the owner's
 *   permission answers it (D-167).
 * - **May the app bring it up unasked?** — {@link mayRaiseUnasked}, and the
 *   answer is no whatever the permission says.
 * - **May the owner see the detail here?** — {@link mayShowDetail}, which is
 *   about the surface he is looking at.
 * - **May a document he is composing describe it?** — this. It is the one
 *   question where the answer depends on something the owner *chose for this
 *   document* rather than on a standing setting, which is why it takes the
 *   choice as an argument and nothing else does.
 *
 * ## What it closes
 *
 * Correction 3.11 counted the sites that decided the private class in place and
 * found five. Routing 91's package 91.3 closed the four in `coverage.ts` and
 * `insights.ts` by making {@link mayRaiseUnasked} the chokepoint. The three
 * left were in the export composer, and they were left because they are a
 * different question — which is a reason to name the question, not a reason to
 * keep answering it in three places.
 *
 * `tests/unit/architecture-guards.test.ts` now fails the build if the string
 * `'private'` is compared to a privacy class anywhere but this file.
 */
export function mayDescribeInDocument(privacy: PrivacyClass, includesPrivate: boolean): boolean {
  return includesPrivate || privacy !== 'private'
}

/** Whether this belongs to the private section specifically. */
export function belongsToPrivateSection(privacy: PrivacyClass): boolean {
  return privacy === 'private'
}
