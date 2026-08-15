import { isEntityRefShape, type EntityRef } from '../domain/entities'
import { matchKnowledge, unknown, type Knowledge } from '../domain/knowledge'
import type { FactValue } from '../domain/records'

/**
 * Reading a stored fact as the kind of thing a rule needs.
 *
 * A concept holds a `FactValue`, which is deliberately typed rather than loose
 * — but a rule that wants hours still has to get hours out of it. The one thing
 * that must not happen here is a shape mismatch quietly becoming a number: a
 * scale of 4-out-of-5 read as "4 hours" would be a fact the owner never stated.
 *
 * So every reader returns `Knowledge`, and a value of the wrong shape resolves
 * to unknown with a reason. Unknown stays unknown (G-009); it never becomes a
 * zero on the way through a conversion.
 */

function wrongShape(value: FactValue): Knowledge<never> {
  return unknown('not-applicable', `stored as ${value.type}, which this cannot read`)
}

export function narrowKnowledge<T>(
  knowledge: Knowledge<FactValue>,
  convert: (value: FactValue) => T | undefined,
): Knowledge<T> {
  return matchKnowledge<FactValue, Knowledge<T>>(knowledge, {
    explicit: (known) => {
      const value = convert(known.value)
      return value === undefined ? wrongShape(known.value) : { ...known, value }
    },
    inferred: (known) => {
      const value = convert(known.value)
      return value === undefined ? wrongShape(known.value) : { ...known, value }
    },
    stale: (known) => {
      const value = convert(known.value)
      return value === undefined ? wrongShape(known.value) : { ...known, value }
    },
    unknown: (known) => known,
  })
}

const HOUR_UNITS = new Set(['hour', 'hours', 'h', 'hr', 'hrs'])
const MINUTE_UNITS = new Set(['minute', 'minutes', 'min', 'mins', 'm'])

export function hoursValue(value: FactValue): number | undefined {
  if (value.type === 'duration') return value.minutes / 60
  if (value.type !== 'number') return undefined
  if (value.unit === undefined || HOUR_UNITS.has(value.unit.toLowerCase())) return value.value
  if (MINUTE_UNITS.has(value.unit.toLowerCase())) return value.value / 60
  return undefined
}

export function minutesValue(value: FactValue): number | undefined {
  if (value.type === 'duration') return value.minutes
  if (value.type !== 'number') return undefined
  if (value.unit === undefined) return undefined
  const unit = value.unit.toLowerCase()
  if (MINUTE_UNITS.has(unit)) return value.value
  if (HOUR_UNITS.has(unit)) return value.value * 60
  return undefined
}

/**
 * A 0–1 reading of something the owner rated.
 *
 * A scale carries its own top, so 4-of-5 and 8-of-10 mean the same thing. A
 * bare number is only accepted when it is already inside 0–1, because a "7"
 * with no scale attached could mean anything.
 */
export function ratioValue(value: FactValue): number | undefined {
  if (value.type === 'scale') return value.of === 0 ? undefined : value.value / value.of
  if (value.type === 'number' && value.unit === undefined && value.value >= 0 && value.value <= 1) {
    return value.value
  }
  return undefined
}

export function booleanValue(value: FactValue): boolean | undefined {
  return value.type === 'boolean' ? value.value : undefined
}

export function textValue(value: FactValue): string | undefined {
  return value.type === 'text' ? value.value : undefined
}

export function entityValue(value: FactValue): EntityRef | undefined {
  if (value.type !== 'entity') return undefined
  return isEntityRefShape(value.value) ? value.value : undefined
}
