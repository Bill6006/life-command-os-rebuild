import { isPlainObject } from '../domain/validation'

/**
 * The shapes the previous generation wrote, and the wall around them
 * (canonical plan section 30).
 *
 * ## Nothing in this file is canonical, and nothing here may become canonical
 * ## by assignment
 *
 * These are the old application's shapes, modelled exactly well enough to read
 * a file once and decide what it means. They are deliberately loose. A legacy
 * export is not trustworthy input, and a type that assumed it was would push
 * the failure downstream into a layer that cannot handle it — which is how the
 * old application's assumptions come back wearing the new one's clothes.
 *
 * `tests/unit/architecture-guards.test.ts` fails the build if anything outside
 * `src/legacy/` imports this file. That wall is the whole reason a legacy
 * reader can exist at all without section 30's critical rule being quietly
 * eroded one convenience import at a time.
 *
 * ## Why `unknown` rather than a schema
 *
 * A legacy field's value is genuinely unknown until it has been looked at.
 * Typing it as `string | number` would be a claim about somebody else's export
 * format, and the first row that disagreed would either throw or be silently
 * coerced. `unknown` forces every read through an explicit narrowing, which is
 * where the four-way presence distinction below actually gets made.
 */

/* -------------------------------------------------------------------------- */
/* Which file is which                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The previous generation's portable backup marker.
 *
 * **One character from this app's own.** The rebuild writes
 * `life-command-os/backup`; the old application wrote `life-command-os.backup`,
 * and the difference is a slash against a full stop. Two files whose format
 * markers differ by one punctuation mark will be in the same folder on the same
 * phone, and telling the owner "that is not a backup of this app" about the one
 * he is trying to bring across would be technically true and useless.
 *
 * So both are recognised by name, and each is sent to the surface that can
 * actually do something with it.
 */
export const LEGACY_BACKUP_FORMAT = 'life-command-os.backup'

/** The only envelope revision the previous generation ever shipped. */
export const LEGACY_BACKUP_VERSION = 2

/** The payload revision inside the ciphertext. */
export const LEGACY_PAYLOAD_VERSION = 1

/**
 * The generation *before* the previous one, recognised by shape.
 *
 * The single-HTML application. It carries no format marker of any kind — it was
 * never written to be imported by anything — so the only evidence available is
 * the set of top-level sections and the schema family the old settings object
 * stamped. These are **field names, not content**: nothing here encodes a
 * value, a date or anything owner-specific.
 *
 * This app does not import it. It recognises it so it can say what it is, which
 * is the difference between an answer and a shrug. See `detect.ts`.
 */
export const ANCESTOR_MARKER_KEYS = [
  'seed',
  'theme',
  'settings',
  'azure',
  'learning',
  'money',
  'days',
] as const

export const ANCESTOR_SCHEMA_FAMILY = 'v297-phase68'

/**
 * Six of seven, not all seven.
 *
 * An export missing one section — an area the owner never used — is still
 * unmistakably that format once the schema family matches, and demanding all
 * seven would fail to recognise a file for the wrong reason.
 */
export const ANCESTOR_MARKERS_REQUIRED = 6

/* -------------------------------------------------------------------------- */
/* The encrypted envelope                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The plaintext half of a legacy backup.
 *
 * The old application split the file deliberately: the envelope says what the
 * file is and how it was encrypted, and everything with content in it is inside
 * the ciphertext. That split is what lets this app describe a file — when it
 * was made, roughly how much is in it — before asking the owner for a
 * passphrase, and it is why a preview exists at all.
 *
 * `approximateRecordCount` is a hint and is named like one. The authoritative
 * count is inside the ciphertext, and a disagreement between the two is a
 * damaged file.
 */
export interface LegacyCryptoMetadata {
  readonly cryptoVersion: number
  readonly kdf: string
  readonly kdfHash: string
  readonly iterations: number
  readonly cipher: string
  readonly keyBits: number
  readonly saltBase64: string
  readonly ivBase64: string
}

export interface LegacyBackupEnvelope {
  readonly format: string
  readonly formatVersion: number
  readonly createdAt: string
  readonly encrypted: boolean
  readonly approximateRecordCount: number
  readonly crypto: LegacyCryptoMetadata
  readonly ciphertextBase64: string
}

/** What is inside the ciphertext, once it has decrypted. */
export interface LegacyPayload {
  readonly payloadVersion: number
  readonly storageSchemaVersion: number
  readonly recordCount: number
  readonly integrity: { readonly algorithm: string; readonly digest: string }
  /** Untyped on purpose. Each row is a legacy record and none is trusted. */
  readonly records: readonly unknown[]
}

function readMetadata(value: unknown): LegacyCryptoMetadata | undefined {
  if (!isPlainObject(value)) return undefined
  const text = (key: string): string | undefined =>
    typeof value[key] === 'string' && (value[key] as string).length > 0
      ? (value[key] as string)
      : undefined
  const count = (key: string): number | undefined =>
    typeof value[key] === 'number' && Number.isInteger(value[key])
      ? (value[key] as number)
      : undefined

  const kdf = text('kdf')
  const kdfHash = text('kdfHash')
  const cipher = text('cipher')
  const saltBase64 = text('saltBase64')
  const ivBase64 = text('ivBase64')
  const cryptoVersion = count('cryptoVersion')
  const iterations = count('iterations')
  const keyBits = count('keyBits')

  if (
    kdf === undefined ||
    kdfHash === undefined ||
    cipher === undefined ||
    saltBase64 === undefined ||
    ivBase64 === undefined ||
    cryptoVersion === undefined ||
    iterations === undefined ||
    keyBits === undefined
  ) {
    return undefined
  }

  return { cryptoVersion, kdf, kdfHash, iterations, cipher, keyBits, saltBase64, ivBase64 }
}

/**
 * Reads the envelope, or says nothing.
 *
 * Structural only. Whether the parameters are ones this build can *use* is
 * `crypto.ts`'s question and is answered with its own failure, because "this is
 * not a backup" and "this is a backup encrypted in a way I cannot open" are
 * different sentences and the owner's next move differs by which one it is.
 */
export function readLegacyEnvelope(input: unknown): LegacyBackupEnvelope | undefined {
  if (!isPlainObject(input)) return undefined
  if (input['format'] !== LEGACY_BACKUP_FORMAT) return undefined

  const formatVersion = input['formatVersion']
  const createdAt = input['createdAt']
  const approximate = input['approximateRecordCount']
  const ciphertext = input['ciphertextBase64']
  const meta = readMetadata(input['crypto'])

  if (typeof formatVersion !== 'number' || !Number.isInteger(formatVersion)) return undefined
  if (typeof createdAt !== 'string') return undefined
  if (typeof ciphertext !== 'string' || ciphertext.length === 0) return undefined
  if (meta === undefined) return undefined

  return {
    format: LEGACY_BACKUP_FORMAT,
    formatVersion,
    createdAt,
    encrypted: input['encrypted'] === true,
    approximateRecordCount:
      typeof approximate === 'number' && Number.isInteger(approximate) ? approximate : -1,
    crypto: meta,
    ciphertextBase64: ciphertext,
  }
}

export function readLegacyPayload(input: unknown): LegacyPayload | undefined {
  if (!isPlainObject(input)) return undefined
  const records = input['records']
  const integrity = input['integrity']
  if (!Array.isArray(records)) return undefined
  if (!isPlainObject(integrity)) return undefined

  const payloadVersion = input['payloadVersion']
  const storageSchemaVersion = input['storageSchemaVersion']
  const recordCount = input['recordCount']
  const algorithm = integrity['algorithm']
  const digest = integrity['digest']

  if (typeof payloadVersion !== 'number') return undefined
  if (typeof algorithm !== 'string' || typeof digest !== 'string') return undefined

  return {
    payloadVersion,
    storageSchemaVersion: typeof storageSchemaVersion === 'number' ? storageSchemaVersion : -1,
    recordCount: typeof recordCount === 'number' ? recordCount : -1,
    integrity: { algorithm, digest },
    records,
  }
}

/* -------------------------------------------------------------------------- */
/* One legacy record                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The envelope every legacy record carried.
 *
 * Read structurally rather than validated against the old schemas. This app
 * does not own those schemas, cannot keep a copy of them current, and does not
 * need to: what it needs from a row is which family it belongs to, when it
 * happened, and the whole of the rest of it kept intact.
 *
 * **`raw` is the entire original row, always.** Every mapped record keeps it,
 * not only the ones nothing could be made of. Section 30 asks that unknown
 * fields survive, and the honest way to satisfy that is to stop deciding which
 * fields are the unknown ones.
 */
export interface LegacyRecord {
  /** The old application's own uuid. This is what makes an import idempotent. */
  readonly recordId: string
  /** The old family name — `observation`, `learned-belief`, and so on. */
  readonly recordType: string
  readonly occurredAt: string | undefined
  readonly recordedAt: string | undefined
  readonly timeZone: string | undefined
  readonly source: string | undefined
  readonly provenanceMethod: string | undefined
  readonly privacy: string | undefined
  readonly supersedesRecordId: string | undefined
  /** Everything, exactly as it was written. Never narrowed, never dropped. */
  readonly raw: Readonly<Record<string, unknown>>
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

/**
 * Reads one row, or says why it could not.
 *
 * The bar is deliberately low: an identifier and a family name. Anything with
 * those two can be preserved and reported, and preserving a row this build does
 * not understand is the entire point of the archive. A row without them cannot
 * even be counted honestly, so it becomes a malformed row rather than a
 * silently discarded one.
 */
export function readLegacyRecord(input: unknown): LegacyRecord | undefined {
  if (!isPlainObject(input)) return undefined
  const recordId = optionalText(input['recordId'])
  const recordType = optionalText(input['recordType'])
  if (recordId === undefined || recordType === undefined) return undefined

  const localTime = isPlainObject(input['localTime']) ? input['localTime'] : undefined
  const provenance = isPlainObject(input['provenance']) ? input['provenance'] : undefined

  return {
    recordId,
    recordType,
    occurredAt: optionalText(input['occurredAt']),
    recordedAt: optionalText(input['recordedAt']),
    timeZone: localTime === undefined ? undefined : optionalText(localTime['timeZone']),
    source: optionalText(input['source']),
    provenanceMethod: provenance === undefined ? undefined : optionalText(provenance['method']),
    privacy: optionalText(input['privacy']),
    supersedesRecordId: optionalText(input['supersedesRecordId']),
    raw: input,
  }
}

/* -------------------------------------------------------------------------- */
/* How a value was present                                                     */
/* -------------------------------------------------------------------------- */

/**
 * How a value was present, which is four things and not two.
 *
 * These collapse so easily that the previous generation wrote its own rule
 * about them, and it was right to. A field the owner left blank, a field the
 * old app never wrote, a field it wrote as "unknown", and a field it wrote as
 * `0` are four distinct statements and only the last is a number. Every system
 * that has got this wrong turned "I did not answer" into "zero", and the zero
 * then became evidence.
 *
 * `0` and `false` are `present`. They are answers.
 */
export type Presence = 'present' | 'blank' | 'absent' | 'explicit-unknown'

export interface ReadValue {
  readonly presence: Presence
  /** Only ever set when `presence` is `present`. */
  readonly value?: unknown
}

/**
 * The words the old application used to mean "I looked and could not say".
 *
 * Named rather than pattern-matched. "Anything that looks uncertain" is
 * inference from shape, and the first legitimate answer that happened to read
 * like a hedge would be thrown away as a non-answer.
 */
const EXPLICIT_UNKNOWN_WORDS: readonly string[] = ['unknown', 'unsure', 'n/a', 'not recorded', '?']

export function readValue(values: Readonly<Record<string, unknown>>, key: string): ReadValue {
  if (!Object.hasOwn(values, key)) return { presence: 'absent' }

  const found = values[key]
  if (found === null || found === undefined) return { presence: 'blank' }
  if (typeof found === 'string') {
    const trimmed = found.trim()
    if (trimmed === '') return { presence: 'blank' }
    if (EXPLICIT_UNKNOWN_WORDS.includes(trimmed.toLowerCase())) {
      return { presence: 'explicit-unknown' }
    }
    return { presence: 'present', value: trimmed }
  }
  return { presence: 'present', value: found }
}

/** True when a legacy string is the old application's word for "I cannot say". */
export function isExplicitUnknown(text: string): boolean {
  return EXPLICIT_UNKNOWN_WORDS.includes(text.trim().toLowerCase())
}
