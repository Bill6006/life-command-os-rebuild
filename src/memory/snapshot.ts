import { CANONICAL_SCHEMA_VERSION, sortRecords } from '../domain/records'
import { instantToIso, type Instant } from '../domain/time'
import { isPlainObject, type MalformedRow, type ValidationIssue } from '../domain/validation'
import { entityToWire, parseEntities, parseRecords, recordToWire } from '../domain/wire'
import type { StoreSnapshot } from './store'

/**
 * The whole store as one document (canonical plan sections 29 and 30).
 *
 * This is the shape a synthetic scenario is written in, the shape the QA editor
 * shows, and the shape a backup will eventually take. It carries its schema
 * version so a future format can be migrated forward explicitly rather than
 * guessed at, and it carries malformed rows too — a file that quietly drops the
 * rows it could not read is not a backup.
 */

export const SNAPSHOT_FORMAT = 'life-command-os/canonical'

export interface SnapshotWire {
  readonly format: string
  readonly schemaVersion: number
  readonly exportedAt: string
  readonly records: readonly unknown[]
  readonly entities: readonly unknown[]
  readonly malformed: readonly unknown[]
}

export interface Migration {
  readonly from: number
  readonly to: number
  readonly describe: string
  apply(wire: Record<string, unknown>): Record<string, unknown>
}

/**
 * Empty, and that is the point.
 *
 * Version 1 is the first canonical schema, so there is nothing to migrate from
 * yet. The runner exists now so that the first real migration is a data change
 * rather than an architecture change — and so it can be tested before anything
 * depends on it.
 */
export const MIGRATIONS: readonly Migration[] = []

export interface SnapshotLoad {
  readonly snapshot: StoreSnapshot
  readonly issues: readonly ValidationIssue[]
  readonly migrationsApplied: readonly string[]
  /** False when the document was refused outright rather than partly read. */
  readonly loaded: boolean
}

export function snapshotToWire(snapshot: StoreSnapshot, exportedAt: Instant): SnapshotWire {
  return {
    format: SNAPSHOT_FORMAT,
    schemaVersion: snapshot.schemaVersion,
    exportedAt: instantToIso(exportedAt),
    records: snapshot.records.map(recordToWire),
    entities: snapshot.entities.map(entityToWire),
    malformed: snapshot.malformed.map(malformedToWire),
  }
}

function malformedToWire(row: MalformedRow): Record<string, unknown> {
  return {
    index: row.index,
    issues: row.issues.map((issue) => ({ path: issue.path, problem: issue.problem })),
    raw: row.raw,
    ...(row.id === undefined ? {} : { id: row.id }),
  }
}

function malformedFromWire(value: unknown, position: number): MalformedRow {
  if (!isPlainObject(value)) {
    return {
      index: position,
      raw: value,
      issues: [{ path: `malformed[${position}]`, problem: 'expected an object' }],
    }
  }

  const issues: ValidationIssue[] = []
  const rawIssues = value['issues']
  if (Array.isArray(rawIssues)) {
    for (const entry of rawIssues) {
      if (!isPlainObject(entry)) continue
      issues.push({
        path: typeof entry['path'] === 'string' ? entry['path'] : `malformed[${position}]`,
        problem: typeof entry['problem'] === 'string' ? entry['problem'] : 'unreadable',
      })
    }
  }

  const id = value['id']
  return {
    index: typeof value['index'] === 'number' ? value['index'] : position,
    raw: value['raw'],
    issues:
      issues.length > 0 ? issues : [{ path: `malformed[${position}]`, problem: 'unreadable' }],
    ...(typeof id === 'string' ? { id } : {}),
  }
}

export function snapshotFromWire(
  input: unknown,
  migrations: readonly Migration[] = MIGRATIONS,
): SnapshotLoad {
  const empty: StoreSnapshot = {
    schemaVersion: CANONICAL_SCHEMA_VERSION,
    records: [],
    entities: [],
    malformed: [],
  }

  if (!isPlainObject(input)) {
    return {
      snapshot: empty,
      issues: [{ path: 'snapshot', problem: 'expected an object' }],
      migrationsApplied: [],
      loaded: false,
    }
  }

  const issues: ValidationIssue[] = []
  const format = input['format']
  if (format !== SNAPSHOT_FORMAT) {
    issues.push({
      path: 'snapshot.format',
      problem: `expected "${SNAPSHOT_FORMAT}", got ${JSON.stringify(format) ?? 'nothing'}`,
    })
  }

  const declared = input['schemaVersion']
  let version = typeof declared === 'number' && Number.isInteger(declared) ? declared : undefined
  if (version === undefined) {
    issues.push({ path: 'snapshot.schemaVersion', problem: 'missing or not a whole number' })
    version = CANONICAL_SCHEMA_VERSION
  }

  if (version > CANONICAL_SCHEMA_VERSION) {
    // Reading a newer file by guessing is how a restore reports a success it
    // cannot deliver (section 29). Refuse, and say what would be needed.
    return {
      snapshot: empty,
      issues: [
        ...issues,
        {
          path: 'snapshot.schemaVersion',
          problem: `written by a newer version (schema ${version}, this build understands ${CANONICAL_SCHEMA_VERSION})`,
        },
      ],
      migrationsApplied: [],
      loaded: false,
    }
  }

  let working: Record<string, unknown> = { ...input }
  const migrationsApplied: string[] = []
  while (version < CANONICAL_SCHEMA_VERSION) {
    const step = migrations.find((migration) => migration.from === version)
    if (step === undefined) {
      return {
        snapshot: empty,
        issues: [
          ...issues,
          { path: 'snapshot.schemaVersion', problem: `no migration from schema ${version}` },
        ],
        migrationsApplied,
        loaded: false,
      }
    }
    working = step.apply(working)
    migrationsApplied.push(step.describe)
    version = step.to
  }

  const parsedRecords = parseRecords(working['records'] ?? [])
  const parsedEntities = parseEntities(working['entities'] ?? [])

  const carried = Array.isArray(working['malformed'])
    ? working['malformed'].map(malformedFromWire)
    : []

  return {
    snapshot: {
      schemaVersion: version,
      // Canonical order, not the order the document happened to list them in,
      // so a snapshot compares equal to itself however it was written out.
      records: sortRecords(parsedRecords.records),
      entities: parsedEntities.entities,
      // Rows that failed on the way in join the rows that were already known
      // to be bad. Both are inspectable; neither is silently discarded.
      malformed: [...carried, ...parsedRecords.malformed, ...parsedEntities.malformed],
    },
    issues,
    migrationsApplied,
    loaded: true,
  }
}

export function snapshotFromJson(
  text: string,
  migrations: readonly Migration[] = MIGRATIONS,
): SnapshotLoad {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    return {
      snapshot: {
        schemaVersion: CANONICAL_SCHEMA_VERSION,
        records: [],
        entities: [],
        malformed: [],
      },
      issues: [
        {
          path: 'snapshot',
          problem: `not valid JSON — ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      migrationsApplied: [],
      loaded: false,
    }
  }
  return snapshotFromWire(parsed, migrations)
}

export function snapshotToJson(snapshot: StoreSnapshot, exportedAt: Instant): string {
  return `${JSON.stringify(snapshotToWire(snapshot, exportedAt), null, 2)}\n`
}
