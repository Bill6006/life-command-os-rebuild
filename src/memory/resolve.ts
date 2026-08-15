import type { RecordId } from '../domain/ids'
import { sortRecords, type CanonicalRecord } from '../domain/records'

/**
 * Which records still speak for themselves (canonical plan sections 13.1 and 62).
 *
 * History is append-first, so nothing is ever removed. What changes is which
 * records are still *effective*: a record is displaced when a later one
 * supersedes it, or when a correction retracts it. Chains fall out of that for
 * free — if C supersedes B and B supersedes A, only C is left standing.
 *
 * A correction the owner writes must stop the old belief being reasserted
 * (section 62), and it must do so without rewriting the past.
 */

export type SupersessionProblem =
  'dangling-supersedes' | 'dangling-correction' | 'supersession-cycle'

export interface SupersessionIssue {
  readonly record: RecordId
  readonly target: RecordId
  readonly problem: SupersessionProblem
}

export interface ResolvedHistory {
  /** Everything, in canonical order. Nothing is ever dropped from here. */
  readonly all: readonly CanonicalRecord[]
  readonly effective: readonly CanonicalRecord[]
  readonly displaced: readonly CanonicalRecord[]
  /** Displaced record -> the record that replaced it. */
  readonly displacedBy: ReadonlyMap<RecordId, RecordId>
  /** Retracted record -> the correction that withdrew it, with no replacement. */
  readonly retractedBy: ReadonlyMap<RecordId, RecordId>
  readonly issues: readonly SupersessionIssue[]
  byId(id: RecordId): CanonicalRecord | undefined
}

export function resolveHistory(records: readonly CanonicalRecord[]): ResolvedHistory {
  const all = sortRecords(records)
  const byId = new Map<RecordId, CanonicalRecord>()
  for (const record of all) byId.set(record.id, record)

  const displacedBy = new Map<RecordId, RecordId>()
  const retractedBy = new Map<RecordId, RecordId>()
  const issues: SupersessionIssue[] = []
  const supersedes = new Map<RecordId, RecordId>()

  for (const record of all) {
    if (record.supersedes !== undefined) {
      supersedes.set(record.id, record.supersedes)
      if (!byId.has(record.supersedes)) {
        issues.push({
          record: record.id,
          target: record.supersedes,
          problem: 'dangling-supersedes',
        })
      } else {
        displacedBy.set(record.supersedes, record.id)
      }
    }

    if (record.kind === 'correction') {
      if (!byId.has(record.corrects)) {
        issues.push({
          record: record.id,
          target: record.corrects,
          problem: 'dangling-correction',
        })
        continue
      }
      displacedBy.set(record.corrects, record.id)
      if (record.replacedBy === undefined) retractedBy.set(record.corrects, record.id)
    }
  }

  // A cycle is contradictory data, not a chain. Every record in one is held
  // back from reasoning and reported, rather than one of them being picked.
  const inCycle = findCycles(supersedes)
  for (const id of inCycle) {
    const target = supersedes.get(id)
    if (target !== undefined) issues.push({ record: id, target, problem: 'supersession-cycle' })
    displacedBy.set(id, id)
  }

  const effective: CanonicalRecord[] = []
  const displaced: CanonicalRecord[] = []
  for (const record of all) {
    if (displacedBy.has(record.id)) displaced.push(record)
    else effective.push(record)
  }

  return {
    all,
    effective,
    displaced,
    displacedBy,
    retractedBy,
    issues,
    byId: (id) => byId.get(id),
  }
}

function findCycles(edges: ReadonlyMap<RecordId, RecordId>): ReadonlySet<RecordId> {
  const found = new Set<RecordId>()
  const settled = new Set<RecordId>()

  for (const start of edges.keys()) {
    if (settled.has(start)) continue

    const path: RecordId[] = []
    const onPath = new Set<RecordId>()
    let current: RecordId | undefined = start

    while (current !== undefined && !settled.has(current)) {
      if (onPath.has(current)) {
        // Everything from the first sighting onwards is inside the loop.
        const from = path.indexOf(current)
        for (const id of path.slice(from)) found.add(id)
        break
      }
      path.push(current)
      onPath.add(current)
      current = edges.get(current)
    }

    for (const id of path) settled.add(id)
  }

  return found
}
