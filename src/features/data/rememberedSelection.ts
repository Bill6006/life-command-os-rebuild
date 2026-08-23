import {
  DEFAULT_SELECTION,
  isExportSectionId,
  orderSelection,
  type ExportSectionId,
} from '../export/sections'

/**
 * The last set of sections the owner chose (canonical plan section 52 —
 * "remembered last selection if useful").
 *
 * `localStorage`, and that is allowed here for a reason worth stating rather
 * than assuming. Section 13.1 rules `localStorage` out as the **history**
 * store — it is not the authoritative lifetime record, it has no transactions,
 * and `tests/unit/architecture-guards.test.ts` fails the build if it appears
 * anywhere in the meaning or memory layers. This is not history. It is a UI
 * preference about which checkboxes were ticked last time, it is worth
 * nothing if it is lost, and losing it costs the owner four taps.
 *
 * Every read and write is wrapped, because `localStorage` throws rather than
 * returning nothing in private browsing and under a full quota. A remembered
 * selection is a convenience; a screen that will not render because a
 * convenience was unavailable is not.
 *
 * The private section is deliberately **not** remembered. Everything else is a
 * preference; that one is a decision to include the most sensitive thing the
 * app holds, and a decision made once on one evening should not silently apply
 * to every export afterwards. It is off at the start of every composition, and
 * turning it on is an act each time.
 */

const KEY = 'lcos:export-sections'

export function readRemembered(): readonly ExportSectionId[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw === null) return DEFAULT_SELECTION
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_SELECTION
    const known = parsed.filter(isExportSectionId).filter((id) => id !== 'private')
    // An empty remembered selection is a real choice — he cleared it and left.
    // An unreadable one is not, and falls back to the default.
    return orderSelection(known)
  } catch {
    return DEFAULT_SELECTION
  }
}

export function writeRemembered(selection: readonly ExportSectionId[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(selection.filter((id) => id !== 'private')))
  } catch {
    // Nothing to do and nothing worth saying: the next export starts from the
    // default, which is where it started this time.
  }
}
