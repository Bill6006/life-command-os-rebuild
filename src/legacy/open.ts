import { legacyDigest, decryptLegacyPayload, type LegacyDecryptFailure } from './crypto'
import { detectLegacyFile, type Detection } from './detect'
import {
  LEGACY_BACKUP_FORMAT,
  LEGACY_PAYLOAD_VERSION,
  readLegacyPayload,
  type LegacyBackupEnvelope,
  type LegacyPayload,
} from './format'

/**
 * Opening a legacy backup, in the order the checks depend on each other.
 *
 * Everything is checked before anything is written, and nothing here can write:
 * this module takes a string and a passphrase and returns rows. The previous
 * generation established the same ordering for its own restore and it was
 * right — a file that fails at the last record is refused with the owner's
 * history exactly as it was, because his history was never opened.
 *
 * The stages, each with its own refusal because the owner's next move differs
 * by which one it is:
 *
 *   1. it is a file this build recognises (`detect.ts`);
 *   2. it decrypts — which is also the authenticity check, since AES-GCM will
 *      not decrypt a file whose ciphertext *or crypto parameters* were altered;
 *   3. the payload has the shape the old format promises;
 *   4. the contents match the digest the old application wrote over them;
 *   5. the count inside the ciphertext matches what is actually there.
 *
 * ## What is deliberately not checked here
 *
 * Whether any individual row is a valid legacy record. That is not this layer's
 * question, and refusing a whole file because one row is unreadable would be
 * refusing an owner his history over a single bad byte. Unreadable rows are
 * counted in the inventory and reported; see `plan.ts`.
 */

export type OpenRefusalStage = 'detect' | 'decrypt' | 'payload' | 'integrity' | 'count'

export interface OpenRefusal {
  readonly stage: OpenRefusalStage
  /** One ordinary sentence. The owner reads this. */
  readonly problem: string
  /** The technical detail, behind inspection (section 36). */
  readonly detail: string | undefined
}

export interface OpenedLegacyBackup {
  readonly createdAt: string
  readonly storageSchemaVersion: number
  readonly digest: string
  /** Untyped rows, exactly as the file held them. */
  readonly rows: readonly unknown[]
}

export type OpenResult =
  | { readonly ok: true; readonly backup: OpenedLegacyBackup }
  | { readonly ok: false; readonly refusal: OpenRefusal }

function refuse(stage: OpenRefusalStage, problem: string, detail?: string): OpenResult {
  return { ok: false, refusal: { stage, problem, detail } }
}

function decryptProblem(failure: LegacyDecryptFailure): OpenRefusal {
  switch (failure.kind) {
    case 'no-subtle-crypto':
      return {
        stage: 'decrypt',
        problem:
          'This browser will not do the decryption an old backup needs. Try again over ' +
          'https, or on another browser.',
        detail: 'crypto.subtle is unavailable in this context',
      }
    case 'unsupported-crypto-version':
      return {
        stage: 'decrypt',
        problem: 'That backup was encrypted by a version of the old app this build cannot open.',
        detail: `crypto version ${String(failure.found)}`,
      }
    case 'unsupported-parameters':
      return {
        stage: 'decrypt',
        problem: 'That backup declares encryption settings this build cannot use.',
        detail: failure.detail,
      }
    case 'wrong-passphrase-or-damaged':
      return {
        stage: 'decrypt',
        problem:
          'That passphrase did not work, or the file has been altered since it was made. ' +
          'Nothing has been changed.',
        /*
         * Deliberately one failure for two causes. Telling them apart would say
         * to anybody holding the file when a guess had got close, and would
         * tell the owner nothing he could do differently.
         */
        detail: 'the file did not authenticate under that passphrase',
      }
  }
}

/**
 * Describes a file without the passphrase.
 *
 * Everything here comes from the plaintext envelope, which is why the old
 * format has one. It exists so the owner can see what he has picked before
 * typing a passphrase into it.
 */
export interface LegacyPreview {
  readonly createdAt: string
  readonly approximateRecordCount: number
  readonly kdf: string
  readonly iterations: number
  readonly cipher: string
}

export function previewOf(envelope: LegacyBackupEnvelope): LegacyPreview {
  return {
    createdAt: envelope.createdAt,
    approximateRecordCount: envelope.approximateRecordCount,
    kdf: `${envelope.crypto.kdf}-${envelope.crypto.kdfHash}`,
    iterations: envelope.crypto.iterations,
    cipher: `${envelope.crypto.cipher}-${String(envelope.crypto.keyBits)}`,
  }
}

/** The detection step on its own, so a file can be identified before a passphrase. */
export function identify(text: string): Detection {
  return detectLegacyFile(text)
}

export async function openLegacyBackup(text: string, passphrase: string): Promise<OpenResult> {
  const detected = detectLegacyFile(text)
  if (!detected.ok) {
    return refuse('detect', detected.problem, detected.detail)
  }

  const { envelope } = detected
  const decrypted = await decryptLegacyPayload(
    envelope.crypto,
    envelope.ciphertextBase64,
    passphrase,
  )
  if (!decrypted.ok) {
    return { ok: false, refusal: decryptProblem(decrypted.failure) }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(decrypted.plaintext)
  } catch (error) {
    return refuse(
      'payload',
      'That backup opened, but what is inside it is not readable.',
      error instanceof Error ? error.message : String(error),
    )
  }

  const payload: LegacyPayload | undefined = readLegacyPayload(parsed)
  if (payload === undefined) {
    return refuse(
      'payload',
      'That backup opened, but its contents are not in the shape that format promises.',
      'the payload is missing its records array or its integrity block',
    )
  }

  if (payload.payloadVersion > LEGACY_PAYLOAD_VERSION) {
    return refuse(
      'payload',
      'That backup holds a newer kind of contents than this build knows how to read.',
      `payload version ${String(payload.payloadVersion)}; this build reads ${String(LEGACY_PAYLOAD_VERSION)}`,
    )
  }

  if (payload.integrity.algorithm !== 'SHA-256') {
    return refuse(
      'integrity',
      'That backup was checked with something this build does not know how to verify.',
      `algorithm "${payload.integrity.algorithm}"`,
    )
  }

  /*
   * The digest is over `JSON.stringify(records)` exactly as the old application
   * computed it — over the records array alone, not over the whole payload.
   * Reproducing that is the point: a check this build invented would pass files
   * the old one would have refused, which is a check that proves nothing.
   */
  const actual = await legacyDigest(JSON.stringify(payload.records))
  if (actual === undefined) {
    return refuse(
      'integrity',
      'This browser will not compute the check an old backup needs.',
      'crypto.subtle.digest is unavailable in this context',
    )
  }
  if (actual !== payload.integrity.digest) {
    return refuse(
      'integrity',
      'That backup opened, but its contents do not match its own checksum. It is damaged.',
      `checksum ${payload.integrity.digest}, contents ${actual}`,
    )
  }

  if (payload.recordCount !== payload.records.length) {
    return refuse(
      'count',
      `That backup says it holds ${String(payload.recordCount)} entries but contains ${String(payload.records.length)}. It is damaged.`,
      'the count inside the ciphertext is the authority and disagrees with the contents',
    )
  }

  return {
    ok: true,
    backup: {
      createdAt: envelope.createdAt,
      storageSchemaVersion: payload.storageSchemaVersion,
      digest: payload.integrity.digest,
      rows: payload.records,
    },
  }
}

/**
 * The **format** every archived row records as its origin — and nothing about
 * the file it happened to arrive in (QA-08-002).
 *
 * It used to be `life-command-os.backup@2026-08-24T12:35:00Z`, with the
 * backup's own creation time appended, and that turned out to be a defect with
 * a large blast radius. `legacyFormat` is part of an archived record's content,
 * so it is part of that record's fingerprint, so it is what the importer
 * compares when deciding whether a row it has seen before still says the same
 * thing. Taking a **new** backup of the same append-first history therefore
 * changed every archived row — and the import reported six unchanged rows as
 * having "already been brought across once and now say something different",
 * drowning the one row that genuinely had changed.
 *
 * The general rule, and it is why the parameter is now unused rather than the
 * function deleted: **nothing about the transport may enter the identity of the
 * thing transported.** When the file was written is a fact about the file. The
 * row's own moment is already on the row, and which row it is is already in the
 * derived record id.
 *
 * It takes no argument now, and that is the honest signature: there is nothing
 * about a particular file that belongs in it. A parameter kept "for future
 * use" would be a place for the same defect to grow back.
 */
export function legacyFormatLabel(): string {
  return LEGACY_BACKUP_FORMAT
}
