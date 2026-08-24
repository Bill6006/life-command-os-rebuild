import { countsOf, fingerprint, type BackupCounts, type BackupSummary } from './backup'
import type { CanonicalStore, StoreSnapshot } from './store'

/**
 * Putting a backup back (canonical plan section 29).
 *
 * Section 29 asks for six things and this file is each of them in order:
 * validate before apply, preview, atomic apply, post-apply verification,
 * rollback on failure, and no false success. The reason they have to be six
 * separate steps rather than one `replaceAll` is that every one of them can
 * fail on its own, and each failure leaves the owner's history in a different
 * place. A single boolean return would flatten "nothing was written",
 * "everything was written and checked", and "something was written, it was
 * wrong, and the old history is back" into one word — and that last state is
 * the one he most needs told apart from the other two.
 *
 * ## What is atomic here, and what is not
 *
 * `replaceAll` is one IndexedDB transaction: every object store is cleared and
 * rewritten inside it, and it commits whole or aborts whole. So the *write* is
 * atomic and there is no state in which half the records are the backup's and
 * half are the old ones.
 *
 * The **restore** is a larger thing than the write, and it is atomic by a
 * different mechanism: the old history is read out first and held, and if
 * anything after that point goes wrong it is written back. That is a
 * compensating action rather than a transaction, which is worth being precise
 * about — if the rollback write itself fails, the owner is left with a store
 * that holds neither history intact, and the only honest thing to do is say so
 * loudly with both fingerprints. `rollbackVerified` exists for that sentence.
 *
 * ## Verification compares meaning, not a promise
 *
 * The store is read back after the write and fingerprinted, and that
 * fingerprint is compared with the one computed from the document. A read-back
 * that merely counted rows would pass a restore that wrote every record with a
 * field missing.
 */

export type RestoreStage =
  /**
   * Not attempted at all.
   *
   * The store was not touched and nothing was read. Kept apart from every
   * other stage because "the app declined to start" and "the app started and
   * put everything back" are different sentences to an owner deciding what to
   * do next.
   */
  | 'not-attempted'
  /** Reading the current history out, so there is something to go back to. */
  | 'hold-current'
  /** The single transactional write. */
  | 'apply'
  /** Reading the store back to see what actually landed. */
  | 'verify'
  /**
   * Reading it again from a connection that did not exist when it was written.
   *
   * The last thing a backup actually promises, and the one stage where a
   * failure must **not** be rolled back. By the time this runs the write has
   * committed and been read back and fingerprinted, so the restored history is
   * very probably on disk — QA proved it was — and undoing it would destroy a
   * good restore on the strength of a database that would not reopen. So this
   * stage reports an honest *unconfirmed* result instead: applied, verified
   * once, not confirmed after reopening, and not undone.
   */
  | 'confirm'

export interface RestoreVerification {
  readonly expected: string
  readonly found: string
  readonly counts: BackupCounts
}

export type RestoreOutcome =
  | {
      readonly ok: true
      /** What the store holds now, read back rather than assumed. */
      readonly verification: RestoreVerification
      /** What was there before, in case the owner wants it named. */
      readonly replaced: BackupCounts
      readonly snapshot: StoreSnapshot
    }
  | {
      readonly ok: false
      readonly stage: RestoreStage
      readonly problem: string
      readonly detail: string | undefined
      /**
       * True when the backup's contents were written and verified at least
       * once before something later went wrong.
       *
       * The difference between "your history is untouched" and "the restore
       * happened and the app cannot confirm it" is the whole reason this field
       * exists. Section 29 forbids a false success; it equally forbids a
       * failure report that talks somebody out of a restore that worked.
       */
      readonly applied: boolean
      /** True when the previous history was written back. */
      readonly rolledBack: boolean
      /**
       * True when the written-back history was read back and matched.
       *
       * `rolledBack` without `rollbackVerified` is the one state this app must
       * never report as merely "restore failed".
       */
      readonly rollbackVerified: boolean
      readonly rollbackDetail: string | undefined
    }

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Applied and verified once, and not confirmable afterwards.
 *
 * Deliberately **not** rolled back, and the reason is in the `confirm` stage's
 * own note: the write committed and matched its fingerprint before this ran,
 * so undoing it would trade a restore that probably worked for one that
 * certainly did not happen. The owner is told exactly that, and told not to
 * run it again until he has looked.
 */
export function unconfirmed(problem: string, detail: string | undefined): RestoreOutcome {
  return {
    ok: false,
    stage: 'confirm',
    problem,
    detail,
    applied: true,
    rolledBack: false,
    rollbackVerified: false,
    rollbackDetail: undefined,
  }
}

/** A restore that was declined before anything was read or written. */
export function notAttempted(problem: string): RestoreOutcome {
  return {
    ok: false,
    stage: 'not-attempted',
    problem,
    detail: undefined,
    applied: false,
    rolledBack: false,
    rollbackVerified: false,
    rollbackDetail: undefined,
  }
}

/**
 * What the owner is about to do, worked out before anything is written.
 *
 * Section 29's "preview when useful" — and it is useful every time, because
 * the questions it answers are the ones that decide whether to go ahead:
 * how much is coming in, how much is being replaced, which days it covers,
 * and whether the private domain is in it.
 */
export interface RestorePlan {
  readonly snapshot: StoreSnapshot
  readonly summary: BackupSummary
  readonly incoming: BackupCounts
  readonly current: BackupCounts
  /** The fingerprint the store must have once this has been applied. */
  readonly expected: string
}

export function planRestore(
  snapshot: StoreSnapshot,
  summary: BackupSummary,
  current: StoreSnapshot,
): RestorePlan {
  return {
    snapshot,
    summary,
    incoming: countsOf(snapshot),
    current: countsOf(current),
    expected: fingerprint(snapshot),
  }
}

/**
 * Apply a checked plan, verify it, and put the old history back if it did not
 * land.
 *
 * The store handle is the caller's: this function does not open, close or
 * choose one. Which store a restore writes to is a decision about whose
 * history is whose (D-091's eighth invariant), and it is made one layer up
 * where both stores are known.
 */
export async function restoreInto(
  store: CanonicalStore,
  plan: RestorePlan,
): Promise<RestoreOutcome> {
  let held: StoreSnapshot
  try {
    held = await store.snapshot()
  } catch (caught) {
    // Nothing has been written, and nothing will be: without a copy of the
    // current history there is nothing to go back to, and a restore with no
    // way back is not a restore this app offers.
    return {
      ok: false,
      stage: 'hold-current',
      problem: 'Your current history could not be read, so nothing was changed.',
      detail: describe(caught),
      applied: false,
      rolledBack: false,
      rollbackVerified: false,
      rollbackDetail: undefined,
    }
  }

  const rollback = async (): Promise<{ done: boolean; verified: boolean; detail?: string }> => {
    try {
      await store.replaceAll(held)
    } catch (caught) {
      return { done: false, verified: false, detail: describe(caught) }
    }
    try {
      const back = await store.snapshot()
      const same = fingerprint(back) === fingerprint(held)
      return {
        done: true,
        verified: same,
        ...(same ? {} : { detail: 'what came back is not what was there before' }),
      }
    } catch (caught) {
      return { done: true, verified: false, detail: describe(caught) }
    }
  }

  try {
    await store.replaceAll(plan.snapshot)
  } catch (caught) {
    const back = await rollback()
    return {
      ok: false,
      stage: 'apply',
      applied: false,
      problem: back.verified
        ? 'The restore could not be written, and your history is exactly as it was.'
        : 'The restore could not be written, and putting your history back did not complete.',
      detail: describe(caught),
      rolledBack: back.done,
      rollbackVerified: back.verified,
      rollbackDetail: back.detail,
    }
  }

  let landed: StoreSnapshot
  try {
    landed = await store.snapshot()
  } catch (caught) {
    const back = await rollback()
    return {
      ok: false,
      stage: 'verify',
      applied: true,
      problem: back.verified
        ? 'The restore could not be checked, so it was undone and your history is as it was.'
        : 'The restore could not be checked, and putting your history back did not complete.',
      detail: describe(caught),
      rolledBack: back.done,
      rollbackVerified: back.verified,
      rollbackDetail: back.detail,
    }
  }

  const found = fingerprint(landed)
  if (found !== plan.expected) {
    const back = await rollback()
    return {
      ok: false,
      stage: 'verify',
      applied: true,
      problem: back.verified
        ? 'What was written is not what the backup holds, so it was undone and your history is as it was.'
        : 'What was written is not what the backup holds, and putting your history back did not complete.',
      detail: `expected ${plan.expected}, found ${found}`,
      rolledBack: back.done,
      rollbackVerified: back.verified,
      rollbackDetail: back.detail,
    }
  }

  return {
    ok: true,
    verification: { expected: plan.expected, found, counts: countsOf(landed) },
    replaced: countsOf(held),
    snapshot: landed,
  }
}
