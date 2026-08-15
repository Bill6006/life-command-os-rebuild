import type { RecordId } from '../domain/ids'
import type { CanonicalRecord } from '../domain/records'
import { recordFingerprint, type AppendRejection, type AppendResult } from './store'

/**
 * What an append should do, decided before anything is written.
 *
 * Both store implementations share this so they cannot drift apart on the
 * rules, and so the rules themselves are testable without a database:
 *
 *   - the same record arriving twice is skipped, which makes re-importing a
 *     file a no-op rather than a duplicate;
 *   - a different record wearing an id that is already taken is rejected, and
 *     rejecting one rejects the whole batch;
 *   - a batch that repeats an id internally is rejected for the same reason.
 *
 * Section 20's duplicate protection and section 29's "no false success" both
 * come down to this being all-or-nothing.
 */
export interface AppendPlan {
  readonly toWrite: readonly CanonicalRecord[]
  readonly result: AppendResult
}

export function planAppend(
  existing: ReadonlyMap<RecordId, string>,
  incoming: readonly CanonicalRecord[],
): AppendPlan {
  const rejected: AppendRejection[] = []
  const toWrite: CanonicalRecord[] = []
  const seen = new Map<RecordId, string>()
  let skipped = 0

  for (const record of incoming) {
    const fingerprint = recordFingerprint(record)
    const already = existing.get(record.id) ?? seen.get(record.id)

    if (already === undefined) {
      seen.set(record.id, fingerprint)
      toWrite.push(record)
      continue
    }

    if (already === fingerprint) {
      skipped += 1
      continue
    }

    rejected.push({
      id: record.id,
      problem: 'a different record already exists with this id — history is append-first',
    })
  }

  if (rejected.length > 0) {
    return { toWrite: [], result: { appended: 0, skipped: 0, rejected } }
  }

  return { toWrite, result: { appended: toWrite.length, skipped, rejected: [] } }
}
