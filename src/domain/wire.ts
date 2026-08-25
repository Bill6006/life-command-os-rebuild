import {
  createEntity,
  ENTITY_KINDS,
  ENTITY_RELATIONS,
  type EntityLink,
  type EntityRef,
  type SemanticEntity,
} from './entities'
import type { LifeDomainId } from './domains'
import { isEntityId, isRecordId, type EntityId, type RecordId } from './ids'
import { PRIVACY_CLASSES } from './privacy'
import {
  ACTION_VERBS,
  WHY_NOW_TRIGGERS,
  type ActionTarget,
  type RecommendationSemantics,
  type WhyNowContext,
} from './recommendation'
import {
  OUTCOME_ASPECTS,
  PROVENANCE_SOURCES,
  RECORD_KINDS,
  type CanonicalRecord,
  type DecisionContext,
  type FactValue,
  type Provenance,
  type RecordKind,
} from './records'
import { DAY_BLOCKS, instantToIso, parseTimeZone, type Instant, type TimeZoneId } from './time'
import {
  absorb,
  createReader,
  leftovers,
  note,
  raw,
  readBoolean,
  readEnum,
  readInstant,
  readNumber,
  readObject,
  readOptionalArray,
  readOptionalBoolean,
  readOptionalEnum,
  readOptionalInstant,
  readOptionalNumber,
  readOptionalObject,
  readOptionalString,
  readString,
  readStringArray,
  rejectExtras,
  type MalformedRow,
  type Reader,
} from './validation'
import type { ConceptId, DueWindow, ObservationWindow } from './windows'

/**
 * The JSON boundary (canonical plan sections 29, 30 and 31).
 *
 * Two promises are kept here. Canonical data round-trips without loss —
 * including fields this schema version has never heard of, which are carried
 * through verbatim. And a row that cannot be read becomes an inspectable
 * `MalformedRow` beside the rows that could, never an exception that takes the
 * whole file down with it.
 */

// ---------------------------------------------------------------------------
// Small readers
// ---------------------------------------------------------------------------

function readRecordId(reader: Reader, key: string): RecordId | undefined {
  const value = readString(reader, key)
  if (value === undefined) return undefined
  if (!isRecordId(value)) return note(reader, key, 'not a record id')
  return value
}

function readOptionalRecordId(reader: Reader, key: string): RecordId | undefined {
  if (reader.value[key] === undefined) return undefined
  return readRecordId(reader, key)
}

function readEntityRefFrom(reader: Reader, key: string): EntityRef | undefined {
  const nested = readObject(reader, key)
  if (nested === undefined) return undefined
  const id = readString(nested, 'id')
  const kind = readEnum(nested, 'kind', ENTITY_KINDS)
  rejectExtras(nested, 'an entity reference')
  absorb(reader, nested)
  if (id === undefined || kind === undefined) return undefined
  if (!isEntityId(id)) return note(reader, `${key}.id`, 'not an entity id')
  return { id, kind }
}

function readOptionalEntityRef(reader: Reader, key: string): EntityRef | undefined {
  if (reader.value[key] === undefined) return undefined
  return readEntityRefFrom(reader, key)
}

function readEntityRefList(reader: Reader, key: string): readonly EntityRef[] {
  const list = readOptionalArray(reader, key)
  if (list === undefined) return []
  const out: EntityRef[] = []
  for (const [position, entry] of list.entries()) {
    const nested = createReader(entry, `${reader.path}.${key}[${position}]`)
    if (nested === undefined) {
      note(reader, `${key}[${position}]`, 'expected an object')
      continue
    }
    const id = readString(nested, 'id')
    const kind = readEnum(nested, 'kind', ENTITY_KINDS)
    rejectExtras(nested, 'an entity reference')
    absorb(reader, nested)
    if (id === undefined || kind === undefined) continue
    if (!isEntityId(id)) {
      note(reader, `${key}[${position}].id`, 'not an entity id')
      continue
    }
    out.push({ id, kind })
  }
  return out
}

function readRecordIdList(reader: Reader, key: string): readonly RecordId[] {
  const list = readOptionalArray(reader, key)
  if (list === undefined) return []
  const out: RecordId[] = []
  for (const [position, entry] of list.entries()) {
    if (typeof entry !== 'string' || !isRecordId(entry)) {
      note(reader, `${key}[${position}]`, 'not a record id')
      continue
    }
    out.push(entry)
  }
  return out
}

function readDomains(reader: Reader, key: string): readonly LifeDomainId[] {
  const list = readStringArray(reader, key)
  return (list ?? []) as readonly LifeDomainId[]
}

function readConcept(reader: Reader, key: string): ConceptId | undefined {
  const value = readString(reader, key)
  return value === undefined ? undefined : (value as ConceptId)
}

function readFactValue(reader: Reader, key: string): FactValue | undefined {
  const nested = readObject(reader, key)
  if (nested === undefined) return undefined
  const type = readEnum(nested, 'type', [
    'number',
    'text',
    'boolean',
    'scale',
    'duration',
    'entity',
  ] as const)

  let parsed: FactValue | undefined
  switch (type) {
    case 'number': {
      const value = readNumber(nested, 'value')
      const unit = readOptionalString(nested, 'unit')
      if (value !== undefined) {
        parsed = unit === undefined ? { type, value } : { type, value, unit }
      }
      break
    }
    case 'text': {
      const value = readString(nested, 'value')
      if (value !== undefined) parsed = { type, value }
      break
    }
    case 'boolean': {
      const value = readBoolean(nested, 'value')
      if (value !== undefined) parsed = { type, value }
      break
    }
    case 'scale': {
      const value = readNumber(nested, 'value')
      const of = readNumber(nested, 'of')
      if (value !== undefined && of !== undefined) parsed = { type, value, of }
      break
    }
    case 'duration': {
      const minutes = readNumber(nested, 'minutes')
      if (minutes !== undefined) parsed = { type, minutes }
      break
    }
    case 'entity': {
      const value = readEntityRefFrom(nested, 'value')
      if (value !== undefined) parsed = { type, value }
      break
    }
    case undefined:
      break
  }

  rejectExtras(nested, 'a fact value')
  absorb(reader, nested)
  return parsed
}

function readObservationWindow(reader: Reader, key: string): ObservationWindow | undefined {
  const nested = readOptionalObject(reader, key)
  if (nested === undefined) return undefined
  const from = readInstant(nested, 'from')
  const to = readInstant(nested, 'to')
  raw(nested, 'kind')
  rejectExtras(nested, 'an observation window')
  absorb(reader, nested)
  if (from === undefined || to === undefined) return undefined
  return { kind: 'observation', from, to }
}

function readDueWindow(reader: Reader, key: string, required: boolean): DueWindow | undefined {
  const nested = required ? readObject(reader, key) : readOptionalObject(reader, key)
  if (nested === undefined) return undefined
  const earliest = readInstant(nested, 'earliest')
  const latest = readInstant(nested, 'latest')
  raw(nested, 'kind')
  rejectExtras(nested, 'a due window')
  absorb(reader, nested)
  if (earliest === undefined || latest === undefined) return undefined
  return { kind: 'due', earliest, latest }
}

function readProvenance(reader: Reader, key: string): Provenance | undefined {
  const nested = readObject(reader, key)
  if (nested === undefined) return undefined
  const source = readEnum(nested, 'source', PROVENANCE_SOURCES)
  const writtenBy = readString(nested, 'writtenBy')
  const detail = readOptionalString(nested, 'note')
  rejectExtras(nested, 'provenance')
  absorb(reader, nested)
  if (source === undefined || writtenBy === undefined) return undefined
  return detail === undefined ? { source, writtenBy } : { source, writtenBy, note: detail }
}

function readRecommendation(reader: Reader, key: string): RecommendationSemantics | undefined {
  const nested = readObject(reader, key)
  if (nested === undefined) return undefined

  const subject = readEntityRefFrom(nested, 'subject')
  const domain = readString(nested, 'domain') as LifeDomainId | undefined
  const relatedGoal = readOptionalEntityRef(nested, 'relatedGoal')
  const evidence = readRecordIdList(nested, 'evidence')

  const targetReader = readObject(nested, 'target')
  let target: ActionTarget | undefined
  if (targetReader !== undefined) {
    const verb = readEnum(targetReader, 'verb', ACTION_VERBS)
    const object = readEntityRefFrom(targetReader, 'object')
    const minutes = readOptionalNumber(targetReader, 'minutes')
    rejectExtras(targetReader, 'an action target')
    absorb(nested, targetReader)
    if (verb !== undefined && object !== undefined) {
      target = minutes === undefined ? { verb, object } : { verb, object, minutes }
    }
  }

  const whyReader = readObject(nested, 'whyNow')
  let whyNow: WhyNowContext | undefined
  if (whyReader !== undefined) {
    const trigger = readEnum(whyReader, 'trigger', WHY_NOW_TRIGGERS)
    const summary = readOptionalString(whyReader, 'summary')
    const whyEvidence = readRecordIdList(whyReader, 'evidence')
    rejectExtras(whyReader, 'a why-now context')
    absorb(nested, whyReader)
    if (trigger !== undefined) whyNow = { trigger, summary: summary ?? '', evidence: whyEvidence }
  }

  rejectExtras(nested, 'a recommendation')
  absorb(reader, nested)
  if (subject === undefined || domain === undefined || target === undefined) return undefined
  if (whyNow === undefined) return undefined

  return {
    subject,
    domain,
    target,
    whyNow,
    evidence,
    ...(relatedGoal === undefined ? {} : { relatedGoal }),
  }
}

/**
 * The context a recommendation was made in.
 *
 * Optional, because history written before this existed is still history. An
 * episode with no context recorded can still be counted; what it cannot do is
 * claim to resemble tonight, which is the honest consequence rather than a
 * limitation to work around.
 */
function readDecisionContext(reader: Reader, key: string): DecisionContext | undefined {
  const nested = readOptionalObject(reader, key)
  if (nested === undefined) return undefined

  const block = readEnum(nested, 'block', DAY_BLOCKS)
  const weekend = readBoolean(nested, 'weekend')
  const strain = readEnum(nested, 'strain', ['severe', 'moderate', 'none', 'unknown'] as const)
  const childPresent = readOptionalBoolean(nested, 'childPresent')
  const usableMinutes = readOptionalNumber(nested, 'usableMinutes')
  rejectExtras(nested, 'a decision context')
  absorb(reader, nested)

  if (block === undefined || weekend === undefined || strain === undefined) return undefined
  return {
    block,
    weekend,
    strain,
    ...(childPresent === undefined ? {} : { childPresent }),
    ...(usableMinutes === undefined ? {} : { usableMinutes }),
  }
}

function decisionContextOut(context: DecisionContext): Record<string, unknown> {
  return {
    block: context.block,
    weekend: context.weekend,
    strain: context.strain,
    ...(context.childPresent === undefined ? {} : { childPresent: context.childPresent }),
    ...(context.usableMinutes === undefined ? {} : { usableMinutes: context.usableMinutes }),
  }
}

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

/**
 * Read the fields specific to one kind.
 *
 * Issues land on the reader; a missing required field leaves the assembled
 * object incomplete, and the caller turns any issue at all into a malformed
 * row. Nothing here is allowed to invent a substitute value.
 */
function readPayload(reader: Reader, kind: RecordKind): Record<string, unknown> {
  switch (kind) {
    case 'observation':
      return {
        concept: readConcept(reader, 'concept'),
        value: readFactValue(reader, 'value'),
        method: readEnum(reader, 'method', ['self-report', 'device', 'derived'] as const),
        window: readObservationWindow(reader, 'window'),
      }
    case 'explicit-fact':
      return {
        concept: readConcept(reader, 'concept'),
        value: readFactValue(reader, 'value'),
      }
    case 'context':
      return {
        concept: readConcept(reader, 'concept'),
        value: readFactValue(reader, 'value'),
        durability: readEnum(reader, 'durability', ['durable', 'situational'] as const),
        validFrom: readInstant(reader, 'validFrom'),
        validUntil: readOptionalInstant(reader, 'validUntil'),
      }
    case 'constraint':
      return {
        concept: readConcept(reader, 'concept'),
        description: readString(reader, 'description'),
        until: readOptionalInstant(reader, 'until'),
      }
    case 'goal':
      return {
        goal: readEntityRefFrom(reader, 'goal'),
        statement: readString(reader, 'statement'),
        status: readEnum(reader, 'status', ['active', 'paused', 'achieved', 'abandoned'] as const),
        targetWindow: readDueWindow(reader, 'targetWindow', false),
        // Absent and empty are different answers — AUD-0021. A goal that has
        // never been broken into parts says nothing about coverage; one broken
        // into parts none of which are done says something quite specific.
        parts: reader.value.parts === undefined ? undefined : readEntityRefList(reader, 'parts'),
      }
    case 'commitment':
      return {
        statement: readString(reader, 'statement'),
        due: readDueWindow(reader, 'due', true),
        to: readOptionalEntityRef(reader, 'to'),
      }
    case 'preference':
      return {
        about: readEntityRefFrom(reader, 'about'),
        stance: readEnum(reader, 'stance', ['prefers', 'avoids', 'forbids'] as const),
        statement: readString(reader, 'statement'),
      }
    case 'decision':
      return {
        statement: readString(reader, 'statement'),
        chosen: readString(reader, 'chosen'),
        rejected: readStringArray(reader, 'rejected') ?? [],
      }
    case 'action-recommendation':
      return {
        recommendation: readRecommendation(reader, 'recommendation'),
        context: readDecisionContext(reader, 'context'),
      }
    case 'action-start':
      return { recommendation: readRecordId(reader, 'recommendation') }
    case 'action-completion':
      return {
        recommendation: readRecordId(reader, 'recommendation'),
        note: readOptionalString(reader, 'note'),
      }
    case 'action-decline':
      return {
        recommendation: readRecordId(reader, 'recommendation'),
        reason: readOptionalString(reader, 'reason'),
      }
    case 'action-unable-now':
      return {
        recommendation: readRecordId(reader, 'recommendation'),
        blocker: readOptionalString(reader, 'blocker'),
      }
    case 'outcome':
      return {
        about: readRecordId(reader, 'about'),
        aspect: readEnum(reader, 'aspect', OUTCOME_ASPECTS),
        observation: readFactValue(reader, 'observation'),
        sentiment: readOptionalEnum(reader, 'sentiment', ['better', 'same', 'worse'] as const),
        window: readObservationWindow(reader, 'window'),
      }
    case 'correction':
      return {
        corrects: readRecordId(reader, 'corrects'),
        reason: readString(reader, 'reason'),
        replacedBy: readOptionalRecordId(reader, 'replacedBy'),
      }
    case 'belief-correction':
      return {
        belief: readString(reader, 'belief'),
        stance: readEnum(reader, 'stance', ['reject', 'restore'] as const),
        reason: readString(reader, 'reason'),
      }
    case 'relationship-event':
      return {
        withEntity: readEntityRefFrom(reader, 'withEntity'),
        nature: readString(reader, 'nature'),
        quality: readOptionalEnum(reader, 'quality', ['positive', 'neutral', 'strained'] as const),
      }
    case 'domain-update':
      return {
        domain: readString(reader, 'domain'),
        summary: readString(reader, 'summary'),
      }
    case 'coverage-update':
      return {
        domain: readString(reader, 'domain'),
        evidenceStrength: readEnum(reader, 'evidenceStrength', [
          'strong',
          'moderate',
          'weak',
          'none',
        ] as const),
        subArea: readOptionalString(reader, 'subArea'),
      }
    case 'imported-legacy-record':
      return {
        legacyFormat: readString(reader, 'legacyFormat'),
        raw: raw(reader, 'raw'),
      }
  }
}

function withoutUndefined(source: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) out[key] = value
  }
  return out
}

// ---------------------------------------------------------------------------
// Records in
// ---------------------------------------------------------------------------

export interface ParsedRecords {
  readonly records: readonly CanonicalRecord[]
  readonly malformed: readonly MalformedRow[]
}

export type RecordParseResult =
  | { readonly ok: true; readonly record: CanonicalRecord }
  | { readonly ok: false; readonly row: MalformedRow }

export function parseRecord(input: unknown, index: number): RecordParseResult {
  const reader = createReader(input, `records[${index}]`)
  if (reader === undefined) {
    return {
      ok: false,
      row: {
        index,
        raw: input,
        issues: [{ path: `records[${index}]`, problem: 'expected an object' }],
      },
    }
  }

  const id = readRecordId(reader, 'id')
  const kind = readEnum(reader, 'kind', RECORD_KINDS)
  const schemaVersion = readNumber(reader, 'schemaVersion')
  const occurredAt = readInstant(reader, 'occurredAt')
  const recordedAt = readInstant(reader, 'recordedAt')
  const zoneText = readString(reader, 'zone')
  const domains = readDomains(reader, 'domains')
  const entities = readEntityRefList(reader, 'entities')
  const privacy = readEnum(reader, 'privacy', PRIVACY_CLASSES)
  const provenance = readProvenance(reader, 'provenance')
  const supersedes = readOptionalRecordId(reader, 'supersedes')

  let zone: TimeZoneId | undefined
  if (zoneText !== undefined) {
    zone = parseTimeZone(zoneText)
    if (zone === undefined) note(reader, 'zone', `unknown timezone "${zoneText}"`)
  }

  const payload = kind === undefined ? {} : readPayload(reader, kind)
  const unrecognized = leftovers(reader)

  if (
    reader.issues.length > 0 ||
    id === undefined ||
    kind === undefined ||
    schemaVersion === undefined ||
    occurredAt === undefined ||
    recordedAt === undefined ||
    zone === undefined ||
    privacy === undefined ||
    provenance === undefined
  ) {
    const row: MalformedRow = {
      index,
      raw: input,
      issues: reader.issues,
      ...(id === undefined ? {} : { id }),
    }
    return { ok: false, row }
  }

  const envelope = {
    id,
    schemaVersion,
    kind,
    occurredAt,
    recordedAt,
    zone,
    domains,
    entities,
    privacy,
    provenance,
    ...(supersedes === undefined ? {} : { supersedes }),
    ...(unrecognized === undefined ? {} : { unrecognized }),
  }

  // The only cast at this boundary. Every required field above was read and
  // type-checked, and any failure has already returned a malformed row.
  const record = { ...envelope, ...withoutUndefined(payload) } as unknown as CanonicalRecord
  return { ok: true, record }
}

export function parseRecords(input: unknown): ParsedRecords {
  if (!Array.isArray(input)) {
    return {
      records: [],
      malformed: [
        { index: 0, raw: input, issues: [{ path: 'records', problem: 'expected an array' }] },
      ],
    }
  }

  const records: CanonicalRecord[] = []
  const malformed: MalformedRow[] = []
  for (const [index, entry] of input.entries()) {
    const result = parseRecord(entry, index)
    if (result.ok) records.push(result.record)
    else malformed.push(result.row)
  }
  return { records, malformed }
}

// ---------------------------------------------------------------------------
// Entities in
// ---------------------------------------------------------------------------

export interface ParsedEntities {
  readonly entities: readonly SemanticEntity[]
  readonly malformed: readonly MalformedRow[]
}

export function parseEntity(
  input: unknown,
  index: number,
): { ok: true; entity: SemanticEntity } | { ok: false; row: MalformedRow } {
  const reader = createReader(input, `entities[${index}]`)
  if (reader === undefined) {
    return {
      ok: false,
      row: {
        index,
        raw: input,
        issues: [{ path: `entities[${index}]`, problem: 'expected an object' }],
      },
    }
  }

  const id = readString(reader, 'id')
  const kind = readEnum(reader, 'kind', ENTITY_KINDS)
  const label = readString(reader, 'label')
  const domain = readString(reader, 'domain')
  const privacy = readEnum(reader, 'privacy', PRIVACY_CLASSES)
  const createdAt = readInstant(reader, 'createdAt')
  const aliases = readStringArray(reader, 'aliases') ?? []
  const entityNote = readOptionalString(reader, 'note')

  const links: EntityLink[] = []
  const rawLinks = readOptionalArray(reader, 'links') ?? []
  for (const [position, entry] of rawLinks.entries()) {
    const nested = createReader(entry, `${reader.path}.links[${position}]`)
    if (nested === undefined) {
      note(reader, `links[${position}]`, 'expected an object')
      continue
    }
    const relation = readEnum(nested, 'relation', ENTITY_RELATIONS)
    const target = readString(nested, 'target')
    rejectExtras(nested, 'an entity link')
    absorb(reader, nested)
    if (relation === undefined || target === undefined) continue
    if (!isEntityId(target)) {
      note(reader, `links[${position}].target`, 'not an entity id')
      continue
    }
    links.push({ relation, target })
  }

  if (id !== undefined && !isEntityId(id)) note(reader, 'id', 'not an entity id')
  // A leftover field on an entity is a mistake rather than future-proofing:
  // entities are ours, not an import surface.
  rejectExtras(reader, 'an entity')

  if (
    reader.issues.length > 0 ||
    id === undefined ||
    kind === undefined ||
    label === undefined ||
    domain === undefined ||
    privacy === undefined ||
    createdAt === undefined
  ) {
    return {
      ok: false,
      row: { index, raw: input, issues: reader.issues, ...(id === undefined ? {} : { id }) },
    }
  }

  return {
    ok: true,
    entity: createEntity({
      id: id as EntityId,
      kind,
      label,
      domain: domain as LifeDomainId,
      privacy,
      createdAt,
      aliases,
      links,
      ...(entityNote === undefined ? {} : { note: entityNote }),
    }),
  }
}

export function parseEntities(input: unknown): ParsedEntities {
  if (!Array.isArray(input)) {
    return {
      entities: [],
      malformed: [
        { index: 0, raw: input, issues: [{ path: 'entities', problem: 'expected an array' }] },
      ],
    }
  }

  const entities: SemanticEntity[] = []
  const malformed: MalformedRow[] = []
  for (const [index, entry] of input.entries()) {
    const result = parseEntity(entry, index)
    if (result.ok) entities.push(result.entity)
    else malformed.push(result.row)
  }
  return { entities, malformed }
}

// ---------------------------------------------------------------------------
// Out
// ---------------------------------------------------------------------------

function instantOut(value: Instant): string {
  return instantToIso(value)
}

function factValueOut(value: FactValue): Record<string, unknown> {
  switch (value.type) {
    case 'number':
      return value.unit === undefined
        ? { type: 'number', value: value.value }
        : { type: 'number', value: value.value, unit: value.unit }
    case 'text':
      return { type: 'text', value: value.value }
    case 'boolean':
      return { type: 'boolean', value: value.value }
    case 'scale':
      return { type: 'scale', value: value.value, of: value.of }
    case 'duration':
      return { type: 'duration', minutes: value.minutes }
    case 'entity':
      return { type: 'entity', value: { id: value.value.id, kind: value.value.kind } }
  }
}

function refOut(ref: EntityRef): Record<string, unknown> {
  return { id: ref.id, kind: ref.kind }
}

function observationWindowOut(window: ObservationWindow): Record<string, unknown> {
  return { kind: 'observation', from: instantOut(window.from), to: instantOut(window.to) }
}

function dueWindowOut(window: DueWindow): Record<string, unknown> {
  return { kind: 'due', earliest: instantOut(window.earliest), latest: instantOut(window.latest) }
}

function recommendationOut(value: RecommendationSemantics): Record<string, unknown> {
  return {
    subject: refOut(value.subject),
    domain: value.domain,
    target: {
      verb: value.target.verb,
      object: refOut(value.target.object),
      ...(value.target.minutes === undefined ? {} : { minutes: value.target.minutes }),
    },
    whyNow: {
      trigger: value.whyNow.trigger,
      summary: value.whyNow.summary,
      evidence: [...value.whyNow.evidence],
    },
    evidence: [...value.evidence],
    ...(value.relatedGoal === undefined ? {} : { relatedGoal: refOut(value.relatedGoal) }),
  }
}

function payloadOut(record: CanonicalRecord): Record<string, unknown> {
  switch (record.kind) {
    case 'observation':
      return {
        concept: record.concept,
        value: factValueOut(record.value),
        method: record.method,
        ...(record.window === undefined ? {} : { window: observationWindowOut(record.window) }),
      }
    case 'explicit-fact':
      return { concept: record.concept, value: factValueOut(record.value) }
    case 'context':
      return {
        concept: record.concept,
        value: factValueOut(record.value),
        durability: record.durability,
        validFrom: instantOut(record.validFrom),
        ...(record.validUntil === undefined ? {} : { validUntil: instantOut(record.validUntil) }),
      }
    case 'constraint':
      return {
        concept: record.concept,
        description: record.description,
        ...(record.until === undefined ? {} : { until: instantOut(record.until) }),
      }
    case 'goal':
      return {
        goal: refOut(record.goal),
        statement: record.statement,
        status: record.status,
        ...(record.targetWindow === undefined
          ? {}
          : { targetWindow: dueWindowOut(record.targetWindow) }),
        ...(record.parts === undefined ? {} : { parts: record.parts.map(refOut) }),
      }
    case 'commitment':
      return {
        statement: record.statement,
        due: dueWindowOut(record.due),
        ...(record.to === undefined ? {} : { to: refOut(record.to) }),
      }
    case 'preference':
      return { about: refOut(record.about), stance: record.stance, statement: record.statement }
    case 'decision':
      return { statement: record.statement, chosen: record.chosen, rejected: [...record.rejected] }
    case 'action-recommendation':
      return {
        recommendation: recommendationOut(record.recommendation),
        ...(record.context === undefined ? {} : { context: decisionContextOut(record.context) }),
      }
    case 'action-start':
      return { recommendation: record.recommendation }
    case 'action-completion':
      return {
        recommendation: record.recommendation,
        ...(record.note === undefined ? {} : { note: record.note }),
      }
    case 'action-decline':
      return {
        recommendation: record.recommendation,
        ...(record.reason === undefined ? {} : { reason: record.reason }),
      }
    case 'action-unable-now':
      return {
        recommendation: record.recommendation,
        ...(record.blocker === undefined ? {} : { blocker: record.blocker }),
      }
    case 'outcome':
      return {
        about: record.about,
        aspect: record.aspect,
        observation: factValueOut(record.observation),
        ...(record.sentiment === undefined ? {} : { sentiment: record.sentiment }),
        ...(record.window === undefined ? {} : { window: observationWindowOut(record.window) }),
      }
    case 'correction':
      return {
        corrects: record.corrects,
        reason: record.reason,
        ...(record.replacedBy === undefined ? {} : { replacedBy: record.replacedBy }),
      }
    case 'belief-correction':
      return { belief: record.belief, stance: record.stance, reason: record.reason }
    case 'relationship-event':
      return {
        withEntity: refOut(record.withEntity),
        nature: record.nature,
        ...(record.quality === undefined ? {} : { quality: record.quality }),
      }
    case 'domain-update':
      return { domain: record.domain, summary: record.summary }
    case 'coverage-update':
      return {
        domain: record.domain,
        evidenceStrength: record.evidenceStrength,
        ...(record.subArea === undefined ? {} : { subArea: record.subArea }),
      }
    case 'imported-legacy-record':
      return { legacyFormat: record.legacyFormat, raw: record.raw }
  }
}

export function recordToWire(record: CanonicalRecord): Record<string, unknown> {
  return {
    // Unrecognised fields go first so a known field always wins a collision.
    ...(record.unrecognized ?? {}),
    id: record.id,
    schemaVersion: record.schemaVersion,
    kind: record.kind,
    occurredAt: instantOut(record.occurredAt),
    recordedAt: instantOut(record.recordedAt),
    zone: record.zone,
    domains: [...record.domains],
    entities: record.entities.map(refOut),
    privacy: record.privacy,
    provenance: {
      source: record.provenance.source,
      writtenBy: record.provenance.writtenBy,
      ...(record.provenance.note === undefined ? {} : { note: record.provenance.note }),
    },
    ...(record.supersedes === undefined ? {} : { supersedes: record.supersedes }),
    ...payloadOut(record),
  }
}

export function entityToWire(entity: SemanticEntity): Record<string, unknown> {
  return {
    id: entity.id,
    kind: entity.kind,
    label: entity.label,
    aliases: [...entity.aliases],
    domain: entity.domain,
    privacy: entity.privacy,
    links: entity.links.map((link) => ({ relation: link.relation, target: link.target })),
    createdAt: instantOut(entity.createdAt),
    ...(entity.note === undefined ? {} : { note: entity.note }),
  }
}
