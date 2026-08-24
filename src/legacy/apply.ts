import { countsOf, fingerprint } from '../memory/backup'
import { planRestore, restoreInto, type RestoreOutcome, type RestorePlan } from '../memory/restore'
import type { CanonicalStore, StoreSnapshot } from '../memory/store'
import { snapshotWith, type ImportPlan } from './plan'

/**
 * Writing an import down, and undoing it if it did not land (canonical plan
 * section 30 — "backup current state; apply atomically; verify; rollback").
 *
 * ## This is Phase 7's machinery, not a second copy of it
 *
 * Section 30 asks for snapshot, atomic apply, verify and rollback. That is
 * exactly what `restoreInto` already is, down to the outcome type that keeps
 * "nothing was written", "everything was written and checked" and "something
 * was written, it was wrong, and the old history is back" as three different
 * sentences rather than one boolean.
 *
 * So an import is expressed as the thing it actually is: **the current history
 * plus some records**, applied as one transaction. `restoreInto` holds the
 * current snapshot, writes the merged one in a single `replaceAll`, reads it
 * back, fingerprints it, and puts the old history back if the fingerprint does
 * not match. Every guarantee section 30 asks for is that function's, unchanged,
 * and there is no second implementation to drift from it.
 *
 * The one thing worth being precise about, because the word "restore" appears
 * throughout the outcome's own prose: what is being undone on a failure is the
 * *import*, and what comes back is the owner's history exactly as it was a
 * moment earlier. That is the same operation `restoreInto` performs; only the
 * reason for performing it differs. `describeImportOutcome` below is what turns
 * its sentences into ones about an import.
 *
 * ## Why it is not `append`
 *
 * `CanonicalStore.append` is all-or-nothing and idempotent, and for the records
 * alone it would do. It cannot carry the entities an imported goal refers to in
 * the same transaction, and an import that wrote its records and then failed to
 * write their subjects would leave goals pointing at nothing — visible to the
 * owner as his own history with the names taken out. One transaction over the
 * whole store is the only shape in which that cannot happen.
 */

export interface ImportOutcome {
  readonly outcome: RestoreOutcome
  /** How many records were added. Zero on every failure. */
  readonly added: number
}

/**
 * True when applying this plan would write the store and change nothing.
 *
 * Re-importing a file that has already been imported reaches this, and it is
 * the normal case rather than an error: the ids are derived, so a second pass
 * recognises its own work and has nothing left to add. Rewriting the whole
 * store anyway would risk a real history for a transaction with no content.
 *
 * Exported because **two callers have to agree about it** — the store-level
 * `applyImport` below, and the owner surface, which goes through the provider's
 * restore path rather than through this function. One predicate consulted twice
 * is a decision made once; two `length === 0` checks in two files is the same
 * decision made twice and free to drift.
 */
export function importChangesNothing(plan: ImportPlan): boolean {
  return plan.toAppend.length === 0 && plan.entities.length === 0
}

/**
 * The plan a restore would take, for an import.
 *
 * This is the join between this phase and Phase 7, and it is deliberately the
 * only one. `applyImport` uses it; so does the owner surface, which hands it
 * straight to the provider's `restoreOwner` in order to inherit the whole
 * ladder that already exists there — write to the owner's store and no other,
 * publish the snapshot and the clock together, reopen the database and read it
 * back, and report an unconfirmed result rather than a false success.
 *
 * Reimplementing any of that for imports would have meant a second copy of the
 * most carefully argued code in the repository, differing at first only in the
 * wording of its errors.
 */
export function importRestorePlan(current: StoreSnapshot, plan: ImportPlan): RestorePlan {
  const merged = snapshotWith(current, plan)
  return planRestore(merged, summaryFor(merged), current)
}

/**
 * Apply a plan the owner has already seen.
 *
 * Takes a plan rather than a file, for the same reason `restoreOwner` does:
 * by the time anything is written, the translation has already happened once
 * and been shown. Nothing is re-derived here, so there is nothing the preview
 * could have been right about and the apply wrong.
 */
export async function applyImport(
  store: CanonicalStore,
  current: StoreSnapshot,
  plan: ImportPlan,
): Promise<ImportOutcome> {
  if (importChangesNothing(plan)) {
    return {
      outcome: {
        ok: true,
        verification: {
          expected: fingerprint(current),
          found: fingerprint(current),
          counts: countsOf(current),
        },
        replaced: countsOf(current),
        snapshot: current,
      },
      added: 0,
    }
  }

  const outcome = await restoreInto(store, importRestorePlan(current, plan))
  return { outcome, added: outcome.ok ? plan.toAppend.length : 0 }
}

/**
 * The summary `planRestore` wants, filled in for an import.
 *
 * `planRestore` was built for a backup file and takes the summary that file
 * carried. An import has no such envelope, and inventing an `app` block
 * claiming a commit and a build time would be putting this app's identity on
 * the previous generation's records. So the fields that describe a file say
 * plainly that there is no file: the summary is used for the preview, and the
 * import has its own and better one in `ImportPlan`.
 */
function summaryFor(merged: StoreSnapshot): Parameters<typeof planRestore>[1] {
  const counts = countsOf(merged)
  return {
    createdAt: 'legacy import',
    app: {
      commitSha: 'legacy-import',
      commitShort: 'legacy',
      branch: 'legacy-import',
      target: 'legacy-import',
      buildTime: 'legacy-import',
    },
    integrity: {
      algorithm: 'sha-256/stable-json',
      checksum: fingerprint(merged),
      ...counts,
    },
    schemaVersion: merged.schemaVersion,
    migrationsApplied: [],
    firstDay: undefined,
    lastDay: undefined,
    domains: [],
    holdsPrivate: merged.records.some((record) => record.privacy === 'private'),
    counts,
  }
}

/**
 * The outcome in the owner's terms, as a sentence about an import.
 *
 * `restoreInto`'s own sentences are written for a restore, and on this screen
 * they would be alarming and wrong: "your history is exactly as it was" is a
 * reassurance after a failed restore and a *failure report* after a failed
 * import. The three states are the same three; only the words change.
 */
export function describeImportOutcome(result: ImportOutcome): {
  readonly tone: 'ok' | 'warn'
  readonly text: string
  readonly detail: string | undefined
} {
  const { outcome, added } = result
  if (outcome.ok) {
    return {
      tone: 'ok',
      text:
        added === 0
          ? 'Nothing to bring across — everything in that file is already here.'
          : `Brought ${String(added)} ${added === 1 ? 'entry' : 'entries'} across, and read them back to check.`,
      detail: outcome.verification.found,
    }
  }

  if (outcome.applied && !outcome.rolledBack) {
    return {
      tone: 'warn',
      text: `${outcome.problem} The entries were written and checked once, and nothing was undone — look before importing anything else.`,
      detail: outcome.detail,
    }
  }

  return {
    tone: 'warn',
    text: outcome.rollbackVerified
      ? `${outcome.problem} Nothing was added, and your history is exactly as it was.`
      : `${outcome.problem} Putting your history back did not complete — look before doing anything else.`,
    detail: outcome.rollbackDetail ?? outcome.detail,
  }
}
