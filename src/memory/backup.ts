import { sha256Hex } from '../domain/checksum'
import type { LifeDomainId } from '../domain/domains'
import {
  instant,
  instantToIso,
  localDayIdAt,
  type Instant,
  type LocalDayId,
  type TimeZoneId,
} from '../domain/time'
import { isPlainObject, type ValidationIssue } from '../domain/validation'
import {
  snapshotFromWire,
  snapshotToWire,
  MIGRATIONS,
  type Migration,
  type SnapshotWire,
} from './snapshot'
import { stableStringify, type StoreSnapshot } from './store'
import { belongsToPrivateSection } from '../domain/privacy'

/**
 * A full backup, and the reading of one (canonical plan section 29).
 *
 * A backup is not an AI-review export and the two are deliberately different
 * artefacts. The export is a description of what the app currently believes,
 * written for a person or an assistant to read, and it is allowed to leave
 * things out because leaving things out is the point of choosing sections. A
 * backup is the opposite: it is the file the owner's whole recorded life comes
 * back from, so **nothing may be omitted for any reason** — not the private
 * domain, not a row that failed to parse, not a field this schema version does
 * not recognise. Section 29, in as many words: "no silent omission of records
 * required for restoration."
 *
 * That is why the document is a `SnapshotWire` inside an envelope rather than
 * a new serialisation. `snapshotToWire` already carries malformed rows and
 * `recordToWire` already carries `unrecognized`; a second writer would be a
 * second place for a field to be forgotten.
 *
 * ## What the envelope adds
 *
 * The snapshot alone cannot answer the questions a restore has to answer
 * before it writes anything:
 *
 * - **Which app wrote this**, so the owner can see he is restoring from the
 *   build he thinks he is, and so a file from a much older build is
 *   recognisable as one.
 * - **When**, in his own words rather than as an instant.
 * - **What it should contain** — counts and a content fingerprint. A file
 *   truncated by a failed download parses perfectly well as JSON and restores
 *   a shorter life. The counts catch that, and the fingerprint catches an
 *   edit that keeps the counts.
 *
 * ## The fingerprint is over meaning, not over bytes
 *
 * `stableStringify` sorts keys, and the snapshot is re-sorted into canonical
 * record order on the way in, so the same history fingerprints the same
 * however the file was formatted — re-indented, keys reordered by a tool,
 * newlines rewritten by a transfer. What it does not survive is a changed,
 * added or removed record, which is exactly the distinction wanted: a restore
 * should refuse a damaged file and accept a reformatted one.
 *
 * `exportedAt` is deliberately excluded from the fingerprint. It says when the
 * file was written, not what is in it, and including it would mean the same
 * history taken twice fingerprinted differently — which would make the
 * fingerprint useless for the one comparison that matters, "did what I wrote
 * come back".
 */

export const BACKUP_FORMAT = 'life-command-os/backup'

/** The envelope's own version, separate from the canonical schema version. */
export const BACKUP_VERSION = 1

export const CHECKSUM_ALGORITHM = 'sha-256/stable-json'

/** Which build wrote the file. Passed in — the memory layer knows no platform. */
export interface BackupApp {
  readonly commitSha: string
  readonly commitShort: string
  readonly branch: string
  readonly target: string
  readonly buildTime: string
}

export interface BackupIntegrity {
  readonly algorithm: string
  readonly checksum: string
  readonly records: number
  readonly entities: number
  readonly malformed: number
}

export interface BackupWire {
  readonly format: string
  readonly backupVersion: number
  readonly createdAt: string
  readonly app: BackupApp
  readonly integrity: BackupIntegrity
  readonly snapshot: SnapshotWire
}

/**
 * The content fingerprint of a snapshot.
 *
 * `instant(0)` rather than a real moment: `snapshotToWire` needs an
 * `exportedAt` and this function must not depend on one. See the note above.
 */
export function fingerprint(snapshot: StoreSnapshot): string {
  const wire = snapshotToWire(snapshot, instant(0))
  return sha256Hex(
    stableStringify({
      schemaVersion: wire.schemaVersion,
      records: wire.records,
      entities: wire.entities,
      malformed: wire.malformed,
    }),
  )
}

export interface BackupCounts {
  readonly records: number
  readonly entities: number
  readonly malformed: number
}

export function countsOf(snapshot: StoreSnapshot): BackupCounts {
  return {
    records: snapshot.records.length,
    entities: snapshot.entities.length,
    malformed: snapshot.malformed.length,
  }
}

export function backupToWire(
  snapshot: StoreSnapshot,
  options: { readonly app: BackupApp; readonly createdAt: Instant },
): BackupWire {
  const counts = countsOf(snapshot)
  return {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    createdAt: instantToIso(options.createdAt),
    app: options.app,
    integrity: { algorithm: CHECKSUM_ALGORITHM, checksum: fingerprint(snapshot), ...counts },
    snapshot: snapshotToWire(snapshot, options.createdAt),
  }
}

export function backupToJson(
  snapshot: StoreSnapshot,
  options: { readonly app: BackupApp; readonly createdAt: Instant },
): string {
  return `${JSON.stringify(backupToWire(snapshot, options), null, 2)}\n`
}

/**
 * A filename an owner can tell apart from another one.
 *
 * Dated in his own local terms and carrying the short commit, because the two
 * questions asked of a backup file six months later are "when is this from"
 * and "which build wrote it".
 */
export function backupFilename(at: Instant, zone: TimeZoneId, commitShort: string): string {
  return `life-command-os-backup-${localDayIdAt(at, zone)}-${commitShort}.json`
}

// ---------------------------------------------------------------------------
// Reading one back
// ---------------------------------------------------------------------------

/**
 * Where a refusal happened.
 *
 * Named rather than collapsed into one message because the owner's next move
 * differs by stage: a `parse` failure means the file is not the file he thinks
 * it is, a `schema` refusal means this build cannot read it and a newer one
 * might, and an `integrity` refusal means the file is damaged and another copy
 * is worth looking for.
 */
export type BackupRefusalStage = 'parse' | 'format' | 'schema' | 'structure' | 'integrity'

export interface BackupRefusal {
  readonly stage: BackupRefusalStage
  /** One ordinary sentence. The owner reads this. */
  readonly problem: string
  /** The technical detail, behind inspection (section 36). */
  readonly detail: string | undefined
}

export interface BackupSummary {
  readonly createdAt: string
  readonly app: BackupApp
  readonly integrity: BackupIntegrity
  readonly schemaVersion: number
  readonly migrationsApplied: readonly string[]
  /** Days the history spans, by each record's own zone. Absent when empty. */
  readonly firstDay: LocalDayId | undefined
  readonly lastDay: LocalDayId | undefined
  readonly domains: readonly LifeDomainId[]
  /** Whether the file carries anything from the private domain (section 11). */
  readonly holdsPrivate: boolean
  readonly counts: BackupCounts
}

export type BackupLoad =
  | {
      readonly ok: true
      readonly snapshot: StoreSnapshot
      readonly summary: BackupSummary
      /**
       * Rows the document itself could not fully account for.
       *
       * Non-fatal by construction: a malformed row is carried into the store as
       * a malformed row, because a restore that dropped what it could not read
       * would hand back a thinner life than the one that was backed up.
       */
      readonly issues: readonly ValidationIssue[]
    }
  | { readonly ok: false; readonly refusal: BackupRefusal }

const UNKNOWN_APP: BackupApp = {
  commitSha: 'unknown',
  commitShort: 'unknown',
  branch: 'unknown',
  target: 'unknown',
  buildTime: 'unknown',
}

function appFromWire(value: unknown): BackupApp {
  if (!isPlainObject(value)) return UNKNOWN_APP
  const read = (key: string): string => {
    const found = value[key]
    return typeof found === 'string' && found.length > 0 ? found : 'unknown'
  }
  return {
    commitSha: read('commitSha'),
    commitShort: read('commitShort'),
    branch: read('branch'),
    target: read('target'),
    buildTime: read('buildTime'),
  }
}

function daysOf(snapshot: StoreSnapshot): {
  first: LocalDayId | undefined
  last: LocalDayId | undefined
} {
  let first: LocalDayId | undefined
  let last: LocalDayId | undefined
  for (const record of snapshot.records) {
    // Each record's own zone, not one chosen here: a history that crossed a
    // move or a trip has no single zone, and picking one would date rows in
    // somewhere the owner has never been.
    const day = localDayIdAt(record.occurredAt, record.zone)
    if (first === undefined || day < first) first = day
    if (last === undefined || day > last) last = day
  }
  return { first, last }
}

function domainsOf(snapshot: StoreSnapshot): readonly LifeDomainId[] {
  const seen = new Set<LifeDomainId>()
  for (const record of snapshot.records) for (const domain of record.domains) seen.add(domain)
  return [...seen].sort()
}

function holdsPrivate(snapshot: StoreSnapshot): boolean {
  return snapshot.records.some((record) => belongsToPrivateSection(record.privacy))
}

export function summaryOf(
  snapshot: StoreSnapshot,
  envelope: {
    readonly createdAt: string
    readonly app: BackupApp
    readonly integrity: BackupIntegrity
    readonly migrationsApplied: readonly string[]
  },
): BackupSummary {
  const days = daysOf(snapshot)
  return {
    createdAt: envelope.createdAt,
    app: envelope.app,
    integrity: envelope.integrity,
    schemaVersion: snapshot.schemaVersion,
    migrationsApplied: envelope.migrationsApplied,
    firstDay: days.first,
    lastDay: days.last,
    domains: domainsOf(snapshot),
    holdsPrivate: holdsPrivate(snapshot),
    counts: countsOf(snapshot),
  }
}

function refuse(stage: BackupRefusalStage, problem: string, detail?: string): BackupLoad {
  return { ok: false, refusal: { stage, problem, detail } }
}

export function backupFromWire(
  input: unknown,
  migrations: readonly Migration[] = MIGRATIONS,
): BackupLoad {
  if (!isPlainObject(input)) {
    return refuse(
      'format',
      'That file is not a backup of this app.',
      'the document is not an object',
    )
  }

  if (input['format'] !== BACKUP_FORMAT) {
    return refuse(
      'format',
      'That file is not a backup of this app.',
      `expected format "${BACKUP_FORMAT}", found ${JSON.stringify(input['format']) ?? 'nothing'}`,
    )
  }

  const backupVersion = input['backupVersion']
  if (typeof backupVersion !== 'number' || !Number.isInteger(backupVersion)) {
    return refuse(
      'format',
      'That backup does not say which version it is.',
      'backupVersion missing',
    )
  }
  if (backupVersion > BACKUP_VERSION) {
    // Refusing rather than guessing. Section 29 — no false success.
    return refuse(
      'schema',
      'That backup was written by a newer version of the app than this one. Update, then restore.',
      `backupVersion ${backupVersion}; this build understands ${BACKUP_VERSION}`,
    )
  }

  const load = snapshotFromWire(input['snapshot'], migrations)
  if (!load.loaded) {
    const first = load.issues[0]
    const schemaProblem = load.issues.some((issue) => issue.path === 'snapshot.schemaVersion')
    return refuse(
      schemaProblem ? 'schema' : 'structure',
      schemaProblem
        ? 'This build cannot read that backup’s format.'
        : 'That backup could not be read.',
      load.issues.map((issue) => `${issue.path}: ${issue.problem}`).join('; ') ||
        first?.problem ||
        'unreadable',
    )
  }

  const declared = input['integrity']
  if (!isPlainObject(declared)) {
    return refuse(
      'integrity',
      'That backup carries no integrity record, so there is no way to tell whether it is complete.',
      'integrity missing',
    )
  }

  const integrity: BackupIntegrity = {
    algorithm: typeof declared['algorithm'] === 'string' ? declared['algorithm'] : 'unknown',
    checksum: typeof declared['checksum'] === 'string' ? declared['checksum'] : '',
    records: typeof declared['records'] === 'number' ? declared['records'] : -1,
    entities: typeof declared['entities'] === 'number' ? declared['entities'] : -1,
    malformed: typeof declared['malformed'] === 'number' ? declared['malformed'] : -1,
  }

  const counts = countsOf(load.snapshot)
  const mismatched = (
    [
      ['records', integrity.records, counts.records],
      ['entities', integrity.entities, counts.entities],
      ['unreadable rows', integrity.malformed, counts.malformed],
    ] as const
  ).filter(([, declaredCount, actual]) => declaredCount !== actual)

  if (mismatched.length > 0) {
    return refuse(
      'integrity',
      'That backup is incomplete — it does not hold everything it says it holds.',
      mismatched.map(([what, said, found]) => `${what}: says ${said}, holds ${found}`).join('; '),
    )
  }

  if (integrity.algorithm !== CHECKSUM_ALGORITHM) {
    return refuse(
      'integrity',
      'That backup was checked with something this build does not know how to verify.',
      `algorithm "${integrity.algorithm}"; this build verifies "${CHECKSUM_ALGORITHM}"`,
    )
  }

  const actual = fingerprint(load.snapshot)
  if (actual !== integrity.checksum) {
    /*
     * A migration legitimately changes the content, so it legitimately changes
     * the fingerprint. Saying so is better than either silently skipping the
     * check on migrated files or refusing every one of them.
     */
    if (load.migrationsApplied.length === 0) {
      return refuse(
        'integrity',
        'That backup has been changed or damaged since it was written.',
        `checksum ${integrity.checksum}, contents fingerprint ${actual}`,
      )
    }
  }

  return {
    ok: true,
    snapshot: load.snapshot,
    summary: summaryOf(load.snapshot, {
      createdAt: typeof input['createdAt'] === 'string' ? input['createdAt'] : 'unknown',
      app: appFromWire(input['app']),
      integrity,
      migrationsApplied: load.migrationsApplied,
    }),
    issues: load.issues,
  }
}

export function backupFromJson(
  text: string,
  migrations: readonly Migration[] = MIGRATIONS,
): BackupLoad {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    return refuse(
      'parse',
      'That file is not readable as JSON — it may have been truncated or is not a backup.',
      error instanceof Error ? error.message : String(error),
    )
  }
  return backupFromWire(parsed, migrations)
}
