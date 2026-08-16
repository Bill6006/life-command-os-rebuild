import { parseInstant, type Instant } from './time'

/**
 * Reading data from outside without throwing (canonical plan sections 26, 29
 * and 36).
 *
 * "Malformed records must not blank the app." A parser that throws on the first
 * bad row makes that impossible to honour, because the caller loses the good
 * rows along with the bad one. So nothing here throws: every reader records an
 * issue and returns `undefined`, the caller collects what parsed, and what did
 * not parse is kept verbatim as an inspectable row rather than discarded.
 */

export interface ValidationIssue {
  readonly path: string
  readonly problem: string
}

export interface MalformedRow {
  /** Position in the incoming array, so a person can find it in the file. */
  readonly index: number
  readonly issues: readonly ValidationIssue[]
  /** Exactly what arrived. Never normalised, never trimmed. */
  readonly raw: unknown
  /** The identifier we could read, if any. Enough to talk about the row. */
  readonly id?: string
}

export interface Reader {
  readonly value: Readonly<Record<string, unknown>>
  readonly path: string
  readonly issues: ValidationIssue[]
  readonly consumed: Set<string>
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function createReader(value: unknown, path: string): Reader | undefined {
  if (!isPlainObject(value)) return undefined
  return { value, path, issues: [], consumed: new Set() }
}

export function note(reader: Reader, key: string, problem: string): undefined {
  reader.issues.push({ path: key === '' ? reader.path : `${reader.path}.${key}`, problem })
  return undefined
}

export function raw(reader: Reader, key: string): unknown {
  reader.consumed.add(key)
  return reader.value[key]
}

function missing(reader: Reader, key: string, expected: string): undefined {
  const present = reader.value[key]
  return note(
    reader,
    key,
    present === undefined
      ? `missing ${expected}`
      : `expected ${expected}, got ${typeName(present)}`,
  )
}

function typeName(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

export function readString(reader: Reader, key: string): string | undefined {
  const value = raw(reader, key)
  if (typeof value !== 'string' || value === '') return missing(reader, key, 'a non-empty string')
  return value
}

export function readOptionalString(reader: Reader, key: string): string | undefined {
  const value = raw(reader, key)
  if (value === undefined) return undefined
  if (typeof value !== 'string') return missing(reader, key, 'a string')
  return value
}

export function readNumber(reader: Reader, key: string): number | undefined {
  const value = raw(reader, key)
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return missing(reader, key, 'a finite number')
  }
  return value
}

export function readOptionalNumber(reader: Reader, key: string): number | undefined {
  const value = raw(reader, key)
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return missing(reader, key, 'a finite number')
  }
  return value
}

export function readBoolean(reader: Reader, key: string): boolean | undefined {
  const value = raw(reader, key)
  if (typeof value !== 'boolean') return missing(reader, key, 'a boolean')
  return value
}

export function readOptionalBoolean(reader: Reader, key: string): boolean | undefined {
  const value = raw(reader, key)
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') return missing(reader, key, 'a boolean')
  return value
}

export function readInstant(reader: Reader, key: string): Instant | undefined {
  const value = raw(reader, key)
  const parsed = parseInstant(value)
  if (parsed === undefined) return missing(reader, key, 'an ISO-8601 instant')
  return parsed
}

export function readOptionalInstant(reader: Reader, key: string): Instant | undefined {
  const value = raw(reader, key)
  if (value === undefined) return undefined
  const parsed = parseInstant(value)
  if (parsed === undefined) return missing(reader, key, 'an ISO-8601 instant')
  return parsed
}

export function readEnum<T extends string>(
  reader: Reader,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const value = raw(reader, key)
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    return missing(reader, key, `one of ${allowed.join(', ')}`)
  }
  return value as T
}

export function readOptionalEnum<T extends string>(
  reader: Reader,
  key: string,
  allowed: readonly T[],
): T | undefined {
  if (reader.value[key] === undefined) return undefined
  return readEnum(reader, key, allowed)
}

export function readArray(reader: Reader, key: string): readonly unknown[] | undefined {
  const value = raw(reader, key)
  if (!Array.isArray(value)) return missing(reader, key, 'an array')
  return value
}

export function readOptionalArray(reader: Reader, key: string): readonly unknown[] | undefined {
  const value = raw(reader, key)
  if (value === undefined) return undefined
  if (!Array.isArray(value)) return missing(reader, key, 'an array')
  return value
}

export function readStringArray(reader: Reader, key: string): readonly string[] | undefined {
  const value = readOptionalArray(reader, key)
  if (value === undefined) return undefined
  const out: string[] = []
  for (const [position, entry] of value.entries()) {
    if (typeof entry !== 'string') {
      note(reader, `${key}[${position}]`, `expected a string, got ${typeName(entry)}`)
      continue
    }
    out.push(entry)
  }
  return out
}

/** A nested reader whose issue paths hang off this one. */
export function readObject(reader: Reader, key: string): Reader | undefined {
  const value = raw(reader, key)
  const nested = createReader(value, `${reader.path}.${key}`)
  if (nested === undefined) return missing(reader, key, 'an object')
  return nested
}

export function readOptionalObject(reader: Reader, key: string): Reader | undefined {
  if (reader.value[key] === undefined) return undefined
  return readObject(reader, key)
}

export function absorb(reader: Reader, nested: Reader | undefined): void {
  if (nested === undefined) return
  for (const issue of nested.issues) reader.issues.push(issue)
}

/**
 * Complain about anything unread inside a nested structure.
 *
 * Unrecognised fields are carried through at the top level of a record, where
 * a future schema or a legacy import might legitimately put them. Inside a
 * provenance block or an entity reference they are a mistake, and the honest
 * response is a visible issue rather than a value that disappears on the next
 * round-trip.
 */
export function rejectExtras(reader: Reader, what: string): void {
  for (const key of Object.keys(reader.value)) {
    if (!reader.consumed.has(key)) note(reader, key, `unexpected field on ${what}`)
  }
}

/**
 * Everything the parser did not ask for.
 *
 * Kept so that a round-trip through this version loses nothing it did not
 * understand — which is what section 30 requires of an eventual legacy import,
 * and what makes "canonical data round-trips without loss" a real claim rather
 * than a claim about the fields we happen to know today.
 */
export function leftovers(reader: Reader): Record<string, unknown> | undefined {
  const extra: Record<string, unknown> = {}
  let found = false
  for (const key of Object.keys(reader.value)) {
    if (reader.consumed.has(key)) continue
    extra[key] = reader.value[key]
    found = true
  }
  return found ? extra : undefined
}
