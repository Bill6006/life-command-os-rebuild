/**
 * Bringing the previous generation's history across (canonical plan sections
 * 30 and 53).
 *
 * The one entry point. Everything a surface needs is re-exported here so that
 * `src/features/` imports one module rather than seven — and, more usefully, so
 * that `format.ts` and `mapping.ts` can stay behind the wall
 * `tests/unit/architecture-guards.test.ts` enforces. A legacy *shape* reaching
 * normal runtime is the single failure that would make this whole exercise
 * worse than not importing at all: the old application's assumptions would come
 * back wearing the new one's clothes.
 *
 * Read in this order:
 *
 *   - `mapping.ts` — what each legacy concept becomes and what it deliberately
 *     does not. This is the phase; everything else is machinery.
 *   - `detect.ts` — which of four things the owner has actually picked.
 *   - `crypto.ts` — why a passphrase is not optional.
 *   - `open.ts` — every check, before anything is written.
 *   - `plan.ts` — the inventory and the dry run, which are one object.
 *   - `translate.ts` — the registry applied, row by row.
 *   - `apply.ts` — Phase 7's transaction, reused rather than rebuilt.
 */

export { identify, openLegacyBackup, previewOf, legacyFormatLabel } from './open'
export type { LegacyPreview, OpenedLegacyBackup, OpenRefusal, OpenResult } from './open'
export type { Detection, LegacyFormatId } from './detect'
export { planImport, snapshotWith } from './plan'
export type { FamilyTally, ImportInventory, ImportPlan, RefusalTally, UnkeptStance } from './plan'
export {
  applyImport,
  describeImportOutcome,
  importChangesNothing,
  importRestorePlan,
} from './apply'
export type { ImportOutcome } from './apply'
export { MAPPING_RULES_VERSION, FAMILY_RULES, ATTRIBUTE_RULES } from './mapping'
export type { Disposition } from './mapping'
export type { MapRefusal } from './translate'
