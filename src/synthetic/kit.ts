import { createRecordFactory, SYNTHETIC_PROVENANCE, type RecordFactory } from '../domain/build'
import { createEntity, type CreateEntityInput, type SemanticEntity } from '../domain/entities'
import { sequentialRecordIds } from '../domain/ids'
import type { CanonicalRecord } from '../domain/records'
import {
  civilDateFromDayId,
  instantAtLocal,
  instantToIso,
  parseInstant,
  parseLocalDayId,
  parseLocalTimeOfDay,
  timeZone,
  type Instant,
  type TimeZoneId,
  type WeekStartDay,
} from '../domain/time'
import { entityToWire, recordToWire } from '../domain/wire'
import { SNAPSHOT_FORMAT, type SnapshotWire } from '../memory/snapshot'

/**
 * Tools for writing synthetic histories (canonical plan section 31).
 *
 * Two rules shape this file.
 *
 * No real owner data, ever — section 39. Everything a scenario contains is
 * invented. First names are used only where the plan allows them and only
 * because a nameless child makes the fatherhood scenarios unreadable.
 *
 * A scenario is a JSON document, not an in-memory object graph. Loading one
 * goes through exactly the same parser as a file the owner pastes into the QA
 * editor, so a scenario that works cannot be relying on a path real data would
 * never take — which is the failure section 60 records as "test fixtures must
 * not accidentally make hardcoded logic look correct".
 */

export interface ScenarioKit {
  readonly zone: TimeZoneId
  /** An absolute instant from an ISO string. */
  at(iso: string): Instant
  /** An owner-local wall-clock moment: `local('2026-03-07', '20:00')`. */
  local(dayId: string, timeOfDay: string): Instant
  readonly record: RecordFactory
  entity(input: Omit<CreateEntityInput, 'createdAt'> & { createdAt?: Instant }): SemanticEntity
  document(parts: DocumentParts): SnapshotWire
}

export interface DocumentParts {
  readonly records: readonly CanonicalRecord[]
  readonly entities: readonly SemanticEntity[]
  readonly exportedAt: Instant
  /** Deliberately broken rows, written into the document exactly as given. */
  readonly brokenRecordRows?: readonly unknown[]
  readonly brokenEntityRows?: readonly unknown[]
}

export function createKit(idPrefix: string, zoneId: string, createdAt: string): ScenarioKit {
  const zone = timeZone(zoneId)
  const nextId = sequentialRecordIds(idPrefix)
  const record = createRecordFactory({ zone, provenance: SYNTHETIC_PROVENANCE, nextId })

  const at = (iso: string): Instant => {
    const parsed = parseInstant(iso)
    if (parsed === undefined) throw new RangeError(`Scenario "${idPrefix}": bad instant ${iso}`)
    return parsed
  }

  const local = (dayId: string, timeOfDay: string): Instant => {
    const day = parseLocalDayId(dayId)
    const time = parseLocalTimeOfDay(timeOfDay)
    if (day === undefined || time === undefined) {
      throw new RangeError(`Scenario "${idPrefix}": bad local time ${dayId} ${timeOfDay}`)
    }
    const [hour, minute] = time.split(':')
    return instantAtLocal(
      { ...civilDateFromDayId(day), hour: Number(hour), minute: Number(minute), second: 0 },
      zone,
    )
  }

  const birth = at(createdAt)

  return {
    zone,
    at,
    local,
    record,
    entity: (input) => createEntity({ ...input, createdAt: input.createdAt ?? birth }),
    document: (parts) => ({
      format: SNAPSHOT_FORMAT,
      schemaVersion: 1,
      exportedAt: instantToIso(parts.exportedAt),
      records: [...parts.records.map(recordToWire), ...(parts.brokenRecordRows ?? [])],
      entities: [...parts.entities.map(entityToWire), ...(parts.brokenEntityRows ?? [])],
      malformed: [],
    }),
  }
}

export interface Scenario {
  readonly id: string
  readonly title: string
  /** One owner-readable line about what this history is. */
  readonly summary: string
  /** What it demonstrates — the gate item, where there is one. */
  readonly proves: string
  readonly zone: TimeZoneId
  /** Where the QA lab's clock starts. Time travel moves from here. */
  readonly now: Instant
  readonly weekStartsOn?: WeekStartDay
  /** Other timezones this scenario is meant to be read from. */
  readonly alternateZones?: readonly TimeZoneId[]
  build(): SnapshotWire
}
