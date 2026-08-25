import { createRecordFactory, SYNTHETIC_PROVENANCE, type RecordFactory } from '../domain/build'
import type { LifeDomainId } from '../domain/domains'
import {
  createEntity,
  type CreateEntityInput,
  type EntityRef,
  type SemanticEntity,
} from '../domain/entities'
import { sequentialRecordIds, type RecordId } from '../domain/ids'
import type { ActionVerb, RecommendationSemantics } from '../domain/recommendation'
import type {
  CanonicalRecord,
  DecisionContext,
  OccasionContext,
  Provenance,
} from '../domain/records'
import {
  civilDateFromDayId,
  instantAtLocal,
  instantToIso,
  localDayIdAt,
  parseInstant,
  parseLocalDayId,
  parseLocalTimeOfDay,
  timeZone,
  type Instant,
  type TimeZoneId,
  type WeekStartDay,
} from '../domain/time'
import { recommendationIdFor, WANTED_SOMETHING_ELSE } from '../intelligence/lifecycle'
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

// ---------------------------------------------------------------------------
// Histories with a past in them
// ---------------------------------------------------------------------------

/**
 * One suggestion that already happened.
 *
 * Written the way the running app writes it — the same record shapes, the same
 * derived recommendation id, the same decision context — so a history the
 * engine learns from cannot be one it could never have produced. Section 60's
 * warning about fixtures making hardcoded logic look correct applies with
 * particular force to learning, where the fixture *is* the evidence.
 */
export interface PastEpisode {
  readonly verb: ActionVerb
  readonly object: EntityRef
  readonly subject?: EntityRef
  readonly domain: LifeDomainId
  /** Owner-local day, `YYYY-MM-DD`. */
  readonly on: string
  readonly at?: string
  readonly context: DecisionContext
  readonly ending: 'shown' | 'started' | 'completed' | 'declined' | 'unable-now' | 'try-another'
  /**
   * What became of it, per aspect. Only meaningful on a completed episode.
   *
   * Three separate facts, because they are three separate facts (DEF-0020):
   * how far the intended end state got, what it was worth afterwards, and how
   * it felt.
   */
  readonly result?: 'all' | 'part' | 'none'
  /**
   * Where a growth occasion happened — AUD-0017.
   *
   * Only meaningful on a `growth-opportunity` result. Absent means the owner
   * skipped the second step, which is a real state and the one every occasion
   * recorded before this phase is in.
   */
  readonly setting?: 'somewhere-new' | 'somewhere-familiar' | EntityRef
  readonly effect?: 'real' | 'some' | 'little' | 'harm'
  readonly comfort?: 'easy' | 'awkward' | 'hard'
}

const RESULT_STEP = { all: 2, part: 1, none: 0 } as const
const HELP_FOR_RESULT = {
  all: 'on-her-own',
  part: 'a-small-prompt',
  none: 'needed-me',
} as const

function occasionFor(
  result: 'all' | 'part' | 'none',
  setting: PastEpisode['setting'],
): OccasionContext {
  const help = HELP_FOR_RESULT[result]
  if (setting === undefined) return { help }
  if (typeof setting === 'string') return { help, setting: { kind: setting } }
  return { help, setting: { kind: 'place', place: setting } }
}
const EFFECT_STEP = { real: 3, some: 2, little: 1, harm: 0 } as const
const EFFECT_SENTIMENT = {
  real: 'better',
  some: 'better',
  little: 'same',
  harm: 'worse',
} as const
const COMFORT_STEP = { easy: 2, awkward: 1, hard: 0 } as const

const LIFECYCLE_PROVENANCE: Provenance = { source: 'owner', writtenBy: 'now' }

export function pastEpisodeRecords(
  kit: ScenarioKit,
  seeds: readonly PastEpisode[],
  nextId: () => RecordId,
): readonly CanonicalRecord[] {
  const records: CanonicalRecord[] = []
  const build = createRecordFactory({
    zone: kit.zone,
    provenance: LIFECYCLE_PROVENANCE,
    nextId,
  })

  for (const seed of seeds) {
    const when = kit.local(seed.on, seed.at ?? '19:30')
    const subject = seed.subject ?? seed.object
    const semantics: RecommendationSemantics = {
      subject,
      domain: seed.domain,
      target: { verb: seed.verb, object: seed.object },
      whyNow: { trigger: 'good-conditions', summary: '', evidence: [] },
      evidence: [],
    }

    const recommendation = recommendationIdFor(semantics.target, localDayIdAt(when, kit.zone))
    const envelope = {
      occurredAt: when,
      domains: [seed.domain],
      entities: [subject, seed.object],
    }

    records.push(
      build(
        'action-recommendation',
        { ...envelope, id: recommendation },
        { recommendation: semantics, context: seed.context },
      ),
    )

    const settled = { ...envelope, recordedAt: (when + 60_000) as Instant, id: nextId() }
    switch (seed.ending) {
      case 'shown':
        break
      case 'started':
        records.push(build('action-start', settled, { recommendation }))
        break
      case 'completed':
        records.push(build('action-completion', settled, { recommendation }))
        break
      case 'declined':
        records.push(build('action-decline', settled, { recommendation }))
        break
      case 'try-another':
        records.push(
          build('action-decline', settled, {
            recommendation,
            reason: WANTED_SOMETHING_ELSE,
          }),
        )
        break
      case 'unable-now':
        records.push(build('action-unable-now', settled, { recommendation }))
        break
    }

    if (seed.result !== undefined && seed.ending === 'completed') {
      // No sentiment. A result of "none" is not a bad outcome about the topic,
      // and flagging it as one would fire the weak-topic generator on an
      // evening that says nothing about the topic.
      records.push(
        build(
          'outcome',
          { ...envelope, occurredAt: (when + 85 * 60_000) as Instant, id: nextId() },
          {
            about: recommendation,
            aspect: 'result',
            observation: { type: 'scale', value: RESULT_STEP[seed.result], of: 2 },
            /*
             * The occasion's own context — AUD-0017.
             *
             * The help level follows the result step, because these three
             * buttons were written to make them the same answer: "on her own"
             * is what "all the way" means once the sentence is framed on the
             * parent (section 4.4).
             */
            ...(seed.verb === 'growth-opportunity'
              ? { occasion: occasionFor(seed.result, seed.setting) }
              : {}),
          },
        ),
      )
    }

    if (seed.effect !== undefined && seed.ending === 'completed') {
      records.push(
        build(
          'outcome',
          { ...envelope, occurredAt: (when + 90 * 60_000) as Instant, id: nextId() },
          {
            about: recommendation,
            aspect: 'effect',
            observation: { type: 'scale', value: EFFECT_STEP[seed.effect], of: 3 },
            sentiment: EFFECT_SENTIMENT[seed.effect],
          },
        ),
      )
    }

    if (seed.comfort !== undefined) {
      records.push(
        build(
          'outcome',
          { ...envelope, occurredAt: (when + 95 * 60_000) as Instant, id: nextId() },
          {
            about: recommendation,
            aspect: 'comfort',
            observation: { type: 'scale', value: COMFORT_STEP[seed.comfort], of: 2 },
          },
        ),
      )
    }
  }

  return records
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
