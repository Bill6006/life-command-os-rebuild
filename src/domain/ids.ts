import type { Branded } from './branded'

/**
 * Stable identifiers (canonical plan section 13.1).
 *
 * Record ids are opaque. They deliberately encode nothing — not a timestamp,
 * not a kind — because an id that carries meaning eventually disagrees with the
 * fields that carry the same meaning, and then two sources of truth exist for
 * one fact. Ordering is expressed separately and explicitly by
 * `compareRecordOrder` in `records.ts`.
 *
 * Entity ids are the opposite: deterministic and legible, so the same real
 * subject resolves to the same entity across imports, fixtures and corrections.
 * That determinism is what keeps "subnetting" attached to one entity instead of
 * quietly becoming three.
 */

export type RecordId = Branded<string, 'RecordId'>
export type EntityId = Branded<string, 'EntityId'>

/** Crockford base32: no I, L, O or U, so ids survive being read aloud or retyped. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const RECORD_ID_LENGTH = 26
const RECORD_ID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/
const ENTITY_ID_PATTERN = /^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9-]*$/

/** Injectable so tests can produce byte-for-byte reproducible fixtures. */
export type RandomBytes = (count: number) => Uint8Array

export const cryptoRandomBytes: RandomBytes = (count) => {
  const bytes = new Uint8Array(count)
  globalThis.crypto.getRandomValues(bytes)
  return bytes
}

export function newRecordId(random: RandomBytes = cryptoRandomBytes): RecordId {
  const bytes = random(RECORD_ID_LENGTH)
  let out = ''
  for (let i = 0; i < RECORD_ID_LENGTH; i += 1) {
    // charAt rather than indexing: it is typed as string, so this needs no
    // non-null assertion under noUncheckedIndexedAccess.
    out += ALPHABET.charAt((bytes[i] ?? 0) % ALPHABET.length)
  }
  return out as RecordId
}

export function isRecordId(value: unknown): value is RecordId {
  return typeof value === 'string' && RECORD_ID_PATTERN.test(value)
}

/**
 * A counter-backed id source. Fixtures and tests want ids that are stable
 * across runs; production wants ids that cannot collide across devices.
 */
export function sequentialRecordIds(prefix: string): () => RecordId {
  const base = prefix
    .toUpperCase()
    .replace(/[^0-9A-HJKMNP-TV-Z]/g, '0')
    .slice(0, 8)
  let next = 0
  return () => {
    next += 1
    const body = `${base}${String(next).padStart(RECORD_ID_LENGTH - base.length, '0')}`
    return body.slice(0, RECORD_ID_LENGTH) as RecordId
  }
}

export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * `entityId('learning-topic', 'Subnetting')` -> `learning-topic:subnetting`.
 *
 * The kind travels inside the id so a dangling reference is still readable in
 * the QA inspector, and so an entity of the wrong kind is visible rather than
 * silently accepted.
 */
export function entityId(kind: string, name: string): EntityId {
  const slug = slugify(name)
  if (slug === '') {
    throw new RangeError(`Cannot build an entity id from an empty name (kind "${kind}")`)
  }
  return `${slugify(kind)}:${slug}` as EntityId
}

export function isEntityId(value: unknown): value is EntityId {
  return typeof value === 'string' && ENTITY_ID_PATTERN.test(value)
}

export function entityIdKind(id: EntityId): string {
  return id.slice(0, id.indexOf(':'))
}
