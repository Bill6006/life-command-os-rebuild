/**
 * A legacy backup file, built the way the previous generation built one.
 *
 * ## Why this encrypts for real
 *
 * `src/legacy/crypto.ts` has no encryptor, deliberately — this app never writes
 * a legacy file, so an `encryptPayload` in production would be code whose only
 * possible future is being misused. The encryptor lives here instead, which is
 * the better arrangement for a second reason: the decryptor is then proved
 * against a genuinely encrypted, genuinely authenticated file rather than
 * against a mock of one. A mock would agree with whatever the reader did,
 * including the wrong thing.
 *
 * Every step below mirrors the old application's own `backupCrypto.ts` and
 * `portableBackup.ts`: the same primitives, the same parameters, the same
 * pipe-joined canonicalisation of the crypto metadata as additional
 * authenticated data, and the same digest taken over the records array alone.
 *
 * ## The iteration count
 *
 * The old application used 600,000 PBKDF2 iterations, and files in the wild
 * carry that number. Deriving a key at that cost takes the better part of a
 * second, which is fine once and ruinous forty times, so fixtures default to a
 * small count — the format stores the number and the reader honours whatever it
 * finds, so this changes nothing about what is being tested.
 *
 * `REAL_ITERATIONS` exists so that one test can prove the real parameter set
 * end to end. A reader that only ever saw cheap files would be a reader nobody
 * had checked against the owner's actual backup.
 */

export const REAL_ITERATIONS = 600_000
const FAST_ITERATIONS = 1_000
const KEY_BITS = 256

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

interface CryptoMeta {
  cryptoVersion: number
  kdf: string
  kdfHash: string
  iterations: number
  cipher: string
  keyBits: number
  saltBase64: string
  ivBase64: string
}

/** Byte for byte what the old application fed to AES-GCM as additional data. */
function authenticatedMetadata(meta: CryptoMeta): ArrayBuffer {
  const canonical = [
    String(meta.cryptoVersion),
    meta.kdf,
    meta.kdfHash,
    String(meta.iterations),
    meta.cipher,
    String(meta.keyBits),
    meta.saltBase64,
    meta.ivBase64,
  ].join('|')
  return new Uint8Array(new TextEncoder().encode(canonical)).buffer
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const material = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return globalThis.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: KEY_BITS },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function digestOf(value: string): Promise<string> {
  const hash = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export interface FixtureOptions {
  readonly passphrase: string
  readonly createdAt?: string
  readonly iterations?: number
  /** Overrides written into the envelope, for the adversarial cases. */
  readonly envelope?: Record<string, unknown>
  /** Overrides written into the payload before it is encrypted. */
  readonly payload?: Record<string, unknown>
}

/**
 * A complete legacy backup file as a JSON string.
 *
 * `serialiseRecords` matches the old application's: sorted by `recordId` so two
 * runs over the same data produce byte-identical output, since IndexedDB makes
 * no ordering promise across profiles. The digest is over that string, and the
 * records stored are the parse of it — which is what makes the reader's
 * `JSON.stringify(payload.records)` reproduce the same bytes.
 */
export async function legacyBackupFile(
  records: readonly Record<string, unknown>[],
  options: FixtureOptions,
): Promise<string> {
  const serialised = JSON.stringify(
    [...records].sort((a, b) => String(a['recordId']).localeCompare(String(b['recordId']))),
  )

  const payload = {
    payloadVersion: 1,
    storageSchemaVersion: 1,
    recordCount: records.length,
    integrity: { algorithm: 'SHA-256', digest: await digestOf(serialised) },
    records: JSON.parse(serialised) as unknown[],
    ...options.payload,
  }

  const iterations = options.iterations ?? FAST_ITERATIONS
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16))
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const meta: CryptoMeta = {
    cryptoVersion: 1,
    kdf: 'PBKDF2',
    kdfHash: 'SHA-256',
    iterations,
    cipher: 'AES-GCM',
    keyBits: KEY_BITS,
    saltBase64: toBase64(salt),
    ivBase64: toBase64(iv),
  }

  const key = await deriveKey(options.passphrase, salt, iterations)
  const ciphertext = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource, additionalData: authenticatedMetadata(meta) },
    key,
    new TextEncoder().encode(JSON.stringify(payload)),
  )

  return JSON.stringify(
    {
      format: 'life-command-os.backup',
      formatVersion: 2,
      createdAt: options.createdAt ?? '2026-08-01T09:00:00.000Z',
      encrypted: true,
      approximateRecordCount: records.length,
      crypto: meta,
      ciphertextBase64: toBase64(new Uint8Array(ciphertext)),
      ...options.envelope,
    },
    null,
    2,
  )
}

/* -------------------------------------------------------------------------- */
/* Legacy rows                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The old envelope, filled in.
 *
 * Written out as plain objects rather than through a builder, because these
 * describe *somebody else's* schema and a builder would be this repository
 * quietly claiming to own it. What matters is that every field a real export
 * carried is present, including the ones this app deliberately does not read.
 */
export function legacyEnvelope(
  recordId: string,
  recordType: string,
  occurredAt: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    recordId,
    recordType,
    schemaVersion: 1,
    occurredAt,
    recordedAt: occurredAt,
    localTime: {
      localIso: occurredAt,
      timeZone: 'America/Denver',
      utcOffsetMinutes: -360,
    },
    source: 'user-entry',
    provenance: { method: 'direct-report' },
    privacy: 'general',
    ...extra,
  }
}

export function legacyObservation(
  recordId: string,
  occurredAt: string,
  attribute: string,
  value: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return legacyEnvelope(recordId, 'observation', occurredAt, {
    category: 'time-attention-capacity',
    attribute,
    value,
    ...extra,
  })
}

/** The old five-point anchored scale, exactly as it was stored. */
export function anchoredScale(
  scaleId: string,
  ordinal: number,
  label: string,
  version = 1,
): Record<string, unknown> {
  return { kind: 'anchored-scale', scaleId, ordinal, label, scaleVersion: version }
}
