import type { LifeDomainId } from './domains'
import type { EntityRef } from './entities'
import type { RecordId } from './ids'
import type { PrivacyClass } from './privacy'
import type { RecommendationSemantics } from './recommendation'
import type { Instant, TimeZoneId } from './time'
import type { ConceptId, DueWindow, ObservationWindow } from './windows'

/**
 * Canonical records (canonical plan sections 13.1 and 13.2).
 *
 * History is append-first. Nothing here is ever edited in place: a correction
 * is a new record that supersedes an old one, and the old one stays exactly as
 * it was written. That is what makes lifetime history survivable — the worst a
 * mistake can do is add a row.
 *
 * The envelope stores an instant and the owner's timezone. It deliberately does
 * not store a local day or a local week identifier: those are derived, so they
 * cannot drift out of agreement with the instant they came from, and a week
 * identifier can never be mistaken for a stored point in time (section 15).
 */

export const CANONICAL_SCHEMA_VERSION = 1

export const RECORD_KINDS = [
  'observation',
  'explicit-fact',
  'context',
  'constraint',
  'goal',
  'commitment',
  'preference',
  'decision',
  'action-recommendation',
  'action-start',
  'action-completion',
  'action-decline',
  'action-unable-now',
  'outcome',
  'correction',
  'relationship-event',
  'domain-update',
  'coverage-update',
  'imported-legacy-record',
] as const

export type RecordKind = (typeof RECORD_KINDS)[number]

export function isRecordKind(value: unknown): value is RecordKind {
  return typeof value === 'string' && (RECORD_KINDS as readonly string[]).includes(value)
}

export const PROVENANCE_SOURCES = [
  'owner',
  'derived',
  'device',
  'synthetic',
  'legacy-import',
  'model',
] as const

export type ProvenanceSource = (typeof PROVENANCE_SOURCES)[number]

export function isProvenanceSource(value: unknown): value is ProvenanceSource {
  return typeof value === 'string' && (PROVENANCE_SOURCES as readonly string[]).includes(value)
}

export interface Provenance {
  readonly source: ProvenanceSource
  /** What actually wrote it: a fixture name, a QA action, an app version. */
  readonly writtenBy: string
  readonly note?: string
}

/**
 * A value a concept can hold.
 *
 * Typed rather than `unknown`, so the inspector can render it, validation can
 * check it, and nothing has to guess whether 7 means hours or a rating.
 */
export type FactValue =
  | { readonly type: 'number'; readonly value: number; readonly unit?: string }
  | { readonly type: 'text'; readonly value: string }
  | { readonly type: 'boolean'; readonly value: boolean }
  | { readonly type: 'scale'; readonly value: number; readonly of: number }
  | { readonly type: 'duration'; readonly minutes: number }
  | { readonly type: 'entity'; readonly value: EntityRef }

export const FACT_VALUE_TYPES = [
  'number',
  'text',
  'boolean',
  'scale',
  'duration',
  'entity',
] as const

export interface RecordEnvelope {
  readonly id: RecordId
  readonly schemaVersion: number
  readonly kind: RecordKind
  /** When the thing happened. */
  readonly occurredAt: Instant
  /** When it was written down — later than `occurredAt` whenever the owner catches up. */
  readonly recordedAt: Instant
  /** The owner's timezone at the time. Local day and week are derived from it. */
  readonly zone: TimeZoneId
  readonly domains: readonly LifeDomainId[]
  readonly entities: readonly EntityRef[]
  readonly privacy: PrivacyClass
  readonly provenance: Provenance
  /** The record this one replaces. The replaced record is never edited. */
  readonly supersedes?: RecordId
  /**
   * Fields this schema version does not understand, kept verbatim.
   *
   * Section 30 requires unknown fields to survive a legacy import, and a
   * round-trip that quietly drops what it cannot read is a round-trip that
   * loses history.
   */
  readonly unrecognized?: Readonly<Record<string, unknown>>
}

type Record_<K extends RecordKind, P> = RecordEnvelope & { readonly kind: K } & P

export type ObservationMethod = 'self-report' | 'device' | 'derived'

export type ObservationRecord = Record_<
  'observation',
  {
    readonly concept: ConceptId
    readonly value: FactValue
    readonly method: ObservationMethod
    readonly window?: ObservationWindow
  }
>

export type ExplicitFactRecord = Record_<
  'explicit-fact',
  { readonly concept: ConceptId; readonly value: FactValue }
>

/**
 * Something true about the owner's situation.
 *
 * `durable` is the case section 8 protects: a settled custody arrangement is
 * not re-asked nightly. A `situational` context with a validity window is how
 * a temporary exception — travel, a schedule change — overrides a durable one
 * for a while without erasing it.
 */
export type ContextRecord = Record_<
  'context',
  {
    readonly concept: ConceptId
    readonly value: FactValue
    readonly durability: 'durable' | 'situational'
    readonly validFrom: Instant
    readonly validUntil?: Instant
  }
>

export type ConstraintRecord = Record_<
  'constraint',
  { readonly concept: ConceptId; readonly description: string; readonly until?: Instant }
>

export type GoalStatus = 'active' | 'paused' | 'achieved' | 'abandoned'

export type GoalRecord = Record_<
  'goal',
  {
    readonly goal: EntityRef
    readonly statement: string
    readonly status: GoalStatus
    readonly targetWindow?: DueWindow
  }
>

export type CommitmentRecord = Record_<
  'commitment',
  { readonly statement: string; readonly due: DueWindow; readonly to?: EntityRef }
>

export type PreferenceRecord = Record_<
  'preference',
  {
    readonly about: EntityRef
    /** `forbids` is section 4.3's explicit veto on a recommendation family. */
    readonly stance: 'prefers' | 'avoids' | 'forbids'
    readonly statement: string
  }
>

export type DecisionRecord = Record_<
  'decision',
  { readonly statement: string; readonly chosen: string; readonly rejected: readonly string[] }
>

export type ActionRecommendationRecord = Record_<
  'action-recommendation',
  { readonly recommendation: RecommendationSemantics }
>

export type ActionStartRecord = Record_<'action-start', { readonly recommendation: RecordId }>

export type ActionCompletionRecord = Record_<
  'action-completion',
  { readonly recommendation: RecordId; readonly note?: string }
>

/** Disagreement. Section 20 — a decline is not evidence that the move is useless. */
export type ActionDeclineRecord = Record_<
  'action-decline',
  { readonly recommendation: RecordId; readonly reason?: string }
>

/** Inability, which is a fact about the situation rather than about the move. */
export type ActionUnableNowRecord = Record_<
  'action-unable-now',
  { readonly recommendation: RecordId; readonly blocker?: string }
>

export type OutcomeRecord = Record_<
  'outcome',
  {
    readonly about: RecordId
    readonly observation: FactValue
    readonly sentiment?: 'better' | 'same' | 'worse'
    readonly window?: ObservationWindow
  }
>

/**
 * A retraction, with a reason.
 *
 * Replacing a record is done by writing a new one with `supersedes` set. This
 * kind exists for the other case: the owner says an entry was wrong and there
 * is nothing to put in its place.
 */
export type CorrectionRecord = Record_<
  'correction',
  { readonly corrects: RecordId; readonly reason: string; readonly replacedBy?: RecordId }
>

export type RelationshipEventRecord = Record_<
  'relationship-event',
  {
    readonly withEntity: EntityRef
    readonly nature: string
    readonly quality?: 'positive' | 'neutral' | 'strained'
  }
>

export type DomainUpdateRecord = Record_<
  'domain-update',
  { readonly domain: LifeDomainId; readonly summary: string }
>

export type EvidenceStrength = 'strong' | 'moderate' | 'weak' | 'none'

export type CoverageUpdateRecord = Record_<
  'coverage-update',
  {
    readonly domain: LifeDomainId
    readonly evidenceStrength: EvidenceStrength
    readonly subArea?: string
  }
>

/**
 * Legacy data held at arm's length.
 *
 * Section 30: imported legacy records must not silently drive intelligence
 * until they are explicitly mapped and approved. Nothing in this phase resolves
 * a fact from one, and `tests/contract` proves it.
 */
export type ImportedLegacyRecord = Record_<
  'imported-legacy-record',
  { readonly legacyFormat: string; readonly raw: unknown }
>

export type CanonicalRecord =
  | ObservationRecord
  | ExplicitFactRecord
  | ContextRecord
  | ConstraintRecord
  | GoalRecord
  | CommitmentRecord
  | PreferenceRecord
  | DecisionRecord
  | ActionRecommendationRecord
  | ActionStartRecord
  | ActionCompletionRecord
  | ActionDeclineRecord
  | ActionUnableNowRecord
  | OutcomeRecord
  | CorrectionRecord
  | RelationshipEventRecord
  | DomainUpdateRecord
  | CoverageUpdateRecord
  | ImportedLegacyRecord

/** Records that can answer "what is the value of this concept right now?". */
export type ConceptBearingRecord = ObservationRecord | ExplicitFactRecord | ContextRecord

export function bearsConcept(record: CanonicalRecord): record is ConceptBearingRecord {
  return (
    record.kind === 'observation' || record.kind === 'explicit-fact' || record.kind === 'context'
  )
}

/**
 * The canonical order of history.
 *
 * When it happened, then when it was written, then the id. The id tiebreak
 * carries no meaning — it exists so that two records written in the same
 * millisecond sort the same way on every device and in every rebuild, which is
 * what makes a projection reproducible.
 */
export function compareRecordOrder(a: CanonicalRecord, b: CanonicalRecord): number {
  if (a.occurredAt !== b.occurredAt) return a.occurredAt - b.occurredAt
  if (a.recordedAt !== b.recordedAt) return a.recordedAt - b.recordedAt
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

export function sortRecords(records: readonly CanonicalRecord[]): readonly CanonicalRecord[] {
  return [...records].sort(compareRecordOrder)
}

export function describeFactValue(value: FactValue): string {
  switch (value.type) {
    case 'number':
      return value.unit === undefined ? String(value.value) : `${value.value} ${value.unit}`
    case 'text':
      return value.value
    case 'boolean':
      return value.value ? 'yes' : 'no'
    case 'scale':
      return `${value.value} of ${value.of}`
    case 'duration':
      return `${value.minutes} min`
    case 'entity':
      return value.value.id
  }
}

export function factValuesEqual(a: FactValue, b: FactValue): boolean {
  if (a.type !== b.type) return false
  if (a.type === 'entity' && b.type === 'entity') {
    return a.value.id === b.value.id && a.value.kind === b.value.kind
  }
  return describeFactValue(a) === describeFactValue(b)
}
