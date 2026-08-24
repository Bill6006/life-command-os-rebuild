import type { LegacyCryptoMetadata } from './format'

/**
 * Opening the previous generation's encrypted backup.
 *
 * ## Why this file has to exist
 *
 * The old application has exactly one complete data-out path, and it is
 * encrypted with no plaintext branch — `encrypted: z.literal(true)` in its own
 * schema. Its other export is a readable markdown summary that says on its face
 * that it is lossy and not for recovery, so it is not a migration source.
 *
 * That leaves two ways to read the owner's history: this, or a change to the
 * old application to make it write something else. **The second is forbidden**
 * — owner decision D-001 protects that tree absolutely — so the passphrase is
 * not one option among several. It is the only door, and saying so plainly is
 * more useful to the owner than offering him a choice that does not exist.
 *
 * ## Nothing here is invented
 *
 * Every primitive is a Web Crypto standard used the way the old application
 * used it: PBKDF2-HMAC-SHA-256 to turn the passphrase into a key, AES-256-GCM
 * to decrypt and authenticate. There is no custom cipher and no hand-rolled
 * anything. This is a *reader for a documented format*, which is the one thing
 * a compatible implementation is allowed to be.
 *
 * ## Decrypt only
 *
 * There is deliberately no encryptor. This app never writes a legacy file — it
 * has its own backup format — so an `encryptPayload` here would be code with no
 * caller whose only possible future is being misused. The test fixture builds
 * its own, which is better: it proves this decryptor against a genuinely
 * encrypted file rather than against a mock of one.
 *
 * ## The metadata is authenticated, not merely read
 *
 * The old application passed its crypto parameters to AES-GCM as additional
 * authenticated data, in a fixed field order rather than through
 * `JSON.stringify` — key order is not part of the JSON data model, and a
 * reordering would make every existing backup unreadable. That canonicalisation
 * is reproduced byte for byte below. It is not decoration: a file edited to
 * claim a thousand iterations instead of six hundred thousand does not yield a
 * weaker key here, it yields a decryption failure.
 */

/** What the old application shipped, and the only version it ever shipped. */
export const LEGACY_CRYPTO_VERSION = 1
const LEGACY_KEY_BITS = 256

export type LegacyDecryptFailure =
  /** The runtime has no Web Crypto. Not the owner's fault and not the file's. */
  | { readonly kind: 'no-subtle-crypto' }
  | { readonly kind: 'unsupported-crypto-version'; readonly found: number }
  | { readonly kind: 'unsupported-parameters'; readonly detail: string }
  /**
   * A wrong passphrase and a damaged file are deliberately one failure.
   *
   * Telling them apart would tell somebody holding the file when they had
   * guessed close, and would tell the owner nothing he could act on
   * differently. The old application made the same call and it was right.
   */
  | { readonly kind: 'wrong-passphrase-or-damaged' }

export type LegacyDecryptResult =
  | { readonly ok: true; readonly plaintext: string }
  | { readonly ok: false; readonly failure: LegacyDecryptFailure }

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

/**
 * The exact bytes the old application fed to AES-GCM as additional data.
 *
 * Field order fixed here, matching `authenticatedMetadata` in the previous
 * generation's `backupCrypto.ts`. Changing the order of these eight values —
 * even to something tidier — makes every backup the owner has undecryptable,
 * which is the single most destructive edit anybody could make to this file.
 */
export function authenticatedMetadata(meta: LegacyCryptoMetadata): ArrayBuffer {
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

/** True when this runtime can open a legacy backup at all. */
export function subtleCryptoAvailable(): boolean {
  return typeof globalThis.crypto?.subtle?.decrypt === 'function'
}

/**
 * Whether the parameters are ones this build can use.
 *
 * Split out so a file encrypted in a way this build cannot open is refused with
 * a sentence about parameters, rather than through a failed decryption that
 * reads exactly like a wrong passphrase. That distinction is the difference
 * between "try the other passphrase" and "this needs a different build".
 */
export function unsupportedParameters(meta: LegacyCryptoMetadata): string | undefined {
  if (meta.kdf !== 'PBKDF2') return `key derivation "${meta.kdf}"`
  if (meta.kdfHash !== 'SHA-256') return `key derivation hash "${meta.kdfHash}"`
  if (meta.cipher !== 'AES-GCM') return `cipher "${meta.cipher}"`
  if (meta.keyBits !== LEGACY_KEY_BITS) return `key length ${String(meta.keyBits)}`
  if (!Number.isInteger(meta.iterations) || meta.iterations < 1) {
    return `iteration count ${String(meta.iterations)}`
  }
  return undefined
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
    { name: 'AES-GCM', length: LEGACY_KEY_BITS },
    false,
    ['decrypt'],
  )
}

export async function decryptLegacyPayload(
  meta: LegacyCryptoMetadata,
  ciphertextBase64: string,
  passphrase: string,
): Promise<LegacyDecryptResult> {
  if (!subtleCryptoAvailable()) {
    return { ok: false, failure: { kind: 'no-subtle-crypto' } }
  }

  if (meta.cryptoVersion !== LEGACY_CRYPTO_VERSION) {
    return {
      ok: false,
      failure: { kind: 'unsupported-crypto-version', found: meta.cryptoVersion },
    }
  }

  const unsupported = unsupportedParameters(meta)
  if (unsupported !== undefined) {
    return { ok: false, failure: { kind: 'unsupported-parameters', detail: unsupported } }
  }

  try {
    const key = await deriveKey(passphrase, fromBase64(meta.saltBase64), meta.iterations)
    const plaintext = await globalThis.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: fromBase64(meta.ivBase64) as BufferSource,
        additionalData: authenticatedMetadata(meta),
      },
      key,
      fromBase64(ciphertextBase64) as BufferSource,
    )
    return { ok: true, plaintext: new TextDecoder().decode(plaintext) }
  } catch {
    // The authentication tag failed, or the base64 would not decode. Either
    // way the file cannot be trusted, and nothing has been written anywhere.
    return { ok: false, failure: { kind: 'wrong-passphrase-or-damaged' } }
  }
}

/**
 * SHA-256 of a string, hex, through Web Crypto.
 *
 * Deliberately **not** `src/domain/checksum.ts`. That one exists so a restore
 * can check its own file synchronously in any environment; this one has to
 * agree byte for byte with what the old application computed, and the only way
 * to be sure of that is to use the same primitive it used. Two hashes for two
 * different promises, and conflating them would mean an integrity check that
 * passes here and would have failed there.
 */
export async function legacyDigest(value: string): Promise<string | undefined> {
  if (typeof globalThis.crypto?.subtle?.digest !== 'function') return undefined
  const hash = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
