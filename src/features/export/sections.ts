import type { PrivacyClass } from '../../domain/privacy'

/**
 * What an AI-review export can be made of (canonical plan section 52).
 *
 * The unit of choice is a **section**, not a domain, and that is a decision
 * worth stating because section 52 could be read either way. A domain-by-domain
 * chooser would let the owner build a document that contradicts itself — the
 * learned relationships kept, the history they were learned from dropped — and
 * an assistant reading it would have no way to tell that a claim's evidence had
 * been removed from under it. A section is a coherent thing to include or
 * leave out: what the app currently reasons from, what it has worked out, what
 * it has been told, what it thinks it does not know.
 *
 * Which domains appear is then **reported** rather than chosen, from the
 * records actually in the document. That satisfies section 52's "current
 * selected domains" with something checkable instead of a second control that
 * could disagree with the contents.
 *
 * ## The private section
 *
 * Section 11 is explicit and pulls both ways at once: explicit private detail
 * should not appear on ordinary surfaces unasked, and it must never be
 * technically impossible to export. So the private section exists, is off by
 * default, is never included by **Select all**, and the composer states in the
 * document itself whether it is in or out. The owner turns it on deliberately
 * or it is not there — and either way the export says which, because an export
 * silent about it would leave a reader unable to tell a life with nothing
 * private in it from a document with the private part removed.
 */

export const EXPORT_SECTION_IDS = [
  'overview',
  'now',
  'direction',
  'coverage',
  'learning',
  'insights',
  'history',
  'corrections',
  'private',
  'diagnostics',
] as const

export type ExportSectionId = (typeof EXPORT_SECTION_IDS)[number]

export function isExportSectionId(value: unknown): value is ExportSectionId {
  return typeof value === 'string' && (EXPORT_SECTION_IDS as readonly string[]).includes(value)
}

export interface ExportSection {
  readonly id: ExportSectionId
  /** The heading, in the document and on the chooser. */
  readonly title: string
  /** One line saying what is in it, so a choice is an informed one. */
  readonly summary: string
  readonly privacy: PrivacyClass
  /** Whether a first-time export includes it. */
  readonly byDefault: boolean
  /**
   * Whether **Select all** reaches it.
   *
   * False for exactly one section, and the exception is the point of the
   * field: a control labelled "select all" that quietly turns on the private
   * domain would be the app deciding to share it on the owner's behalf.
   */
  readonly inSelectAll: boolean
}

export const EXPORT_SECTIONS: readonly ExportSection[] = [
  {
    id: 'overview',
    title: 'Where things stand',
    summary: 'The build, the span of the record, and which life areas it touches.',
    privacy: 'normal',
    byDefault: true,
    inSelectAll: true,
  },
  {
    id: 'now',
    title: 'What the app is saying now',
    summary: 'The current suggestion, why it was chosen, and what it read to choose it.',
    privacy: 'normal',
    byDefault: true,
    inSelectAll: true,
  },
  {
    id: 'direction',
    title: 'Direction, goals and commitments',
    summary: 'This week’s direction, active goals, and what has been promised.',
    privacy: 'normal',
    byDefault: true,
    inSelectAll: true,
  },
  {
    id: 'coverage',
    title: 'How well each area is understood',
    summary: 'Where the record is current, where it has gone quiet, and how stale.',
    privacy: 'normal',
    byDefault: true,
    inSelectAll: true,
  },
  {
    id: 'learning',
    title: 'What has been observed to follow what',
    summary: 'Relationships found in the record, with the comparable occasions behind each.',
    privacy: 'normal',
    byDefault: true,
    inSelectAll: true,
  },
  {
    id: 'insights',
    title: 'What has been worked out',
    summary: 'The readings currently on Insights, and what is still being gathered.',
    privacy: 'normal',
    byDefault: true,
    inSelectAll: true,
  },
  {
    id: 'history',
    title: 'Recent record',
    summary: 'The most recent entries, in order, as they read on Timeline.',
    privacy: 'normal',
    byDefault: true,
    inSelectAll: true,
  },
  {
    id: 'corrections',
    /*
     * Passive, and deliberately so.
     *
     * This string has two readers: the owner, who picks the section on Data,
     * and whoever he hands the document to, where it is a heading. It said
     * "Where **the owner** has overruled the app", which is the app discussing
     * him in the third person on his own screen (sections 4.6 and 36) — found
     * by the Phase 8 sweep that holds the import panel to exactly that rule,
     * and fixed here rather than exempted, because a rule with a carve-out for
     * the place it was first broken is not a rule.
     *
     * "You" would read correctly on Data and ambiguously in the document,
     * where an assistant could reasonably take it to mean itself. Naming
     * neither party is right for both.
     */
    title: 'Where the app has been overruled',
    summary: 'Conclusions rejected, and suggestions withdrawn.',
    privacy: 'normal',
    byDefault: true,
    inSelectAll: true,
  },
  {
    id: 'private',
    title: 'Private / Sexual Health',
    summary: 'Entries in the private domain, in full. Off unless you turn it on.',
    privacy: 'private',
    byDefault: false,
    inSelectAll: false,
  },
  {
    id: 'diagnostics',
    title: 'Diagnostics',
    summary:
      'Storage, unreadable rows and engine internals. Including this asks for a review of how the app itself is tuned.',
    privacy: 'normal',
    byDefault: false,
    inSelectAll: true,
  },
]

export function sectionById(id: ExportSectionId): ExportSection {
  const found = EXPORT_SECTIONS.find((section) => section.id === id)
  // Unreachable by the type, and an exception here would be a blank screen.
  if (found === undefined) throw new Error(`unknown section id "${id}"`)
  return found
}

export const DEFAULT_SELECTION: readonly ExportSectionId[] = EXPORT_SECTIONS.filter(
  (section) => section.byDefault,
).map((section) => section.id)

export const SELECT_ALL: readonly ExportSectionId[] = EXPORT_SECTIONS.filter(
  (section) => section.inSelectAll,
).map((section) => section.id)

/** Selection in registry order, whatever order it was chosen in. */
export function orderSelection(selection: readonly ExportSectionId[]): readonly ExportSectionId[] {
  const chosen = new Set(selection)
  return EXPORT_SECTIONS.filter((section) => chosen.has(section.id)).map((section) => section.id)
}
