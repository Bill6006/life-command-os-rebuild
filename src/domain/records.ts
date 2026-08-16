import type { LifeDomainId } from './domains'
import type { EntityRef } from './entities'
import type { RecordId } from './ids'
import type { PrivacyClass } from './privacy'
import type { RecommendationSemantics } from './recommendation'
import type { DayBlock, Instant, TimeZoneId } from './time'
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
  'belief-correction',
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

/**
 * Where a reading actually came from, as one answer (D-059).
 *
 * Two fields carry part of this and neither carries all of it. `provenance`
 * says who wrote the row down — which for a scenario is the fixture and for a
 * guide answer is the owner. An observation's `method` says how the reading was
 * obtained. Reliability is a question about the second, so a synthetic fixture
 * standing in for a watch reading has to read as a watch reading rather than as
 * "synthetic", or every scenario in the laboratory would be judged on how it
 * was typed instead of on what it represents.
 *
 * `provenance` still wins when it names an origin the owner did not: derived,
 * device, model and legacy-import are all claims that something other than a
 * person produced the row, and a record may not talk its way out of one.
 */
export function evidenceSourceOf(record: CanonicalRecord): ProvenanceSource {
  const written = record.provenance.source
  if (written !== 'owner' && written !== 'synthetic') return written
  if (record.kind !== 'observation') return 'owner'
  switch (record.method) {
    case 'device':
      return 'device'
    case 'derived':
      return 'derived'
    case 'self-report':
      return 'owner'
  }
}

/** True when the owner said it, rather than something concluding it for them. */
export function isOwnerStated(record: CanonicalRecord): boolean {
  return evidenceSourceOf(record) === 'owner'
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

/**
 * What the system could see when it made a recommendation.
 *
 * Section 16 asks that historical comparison consider relevant context rather
 * than only date proximity, and that is impossible to do honestly after the
 * fact. Re-deriving "what was tonight like?" from today's history would answer
 * with everything written since, including the outcome itself — so the context
 * is written down at the moment the decision is acted on, and never revised.
 *
 * Coarse on purpose. Section 22 forbids inventing precision, and a fingerprint
 * fine enough to be unique is a fingerprint that matches nothing.
 */
export interface DecisionContext {
  readonly block: DayBlock
  readonly weekend: boolean
  /** How much the body was asking for. `unknown` is a real answer (G-009). */
  readonly strain: 'severe' | 'moderate' | 'none' | 'unknown'
  /** Undefined means nobody knew, which is not the same as "no". */
  readonly childPresent?: boolean
  readonly usableMinutes?: number
}

export type ActionRecommendationRecord = Record_<
  'action-recommendation',
  {
    readonly recommendation: RecommendationSemantics
    /** Absent on recommendations written before the context was recorded. */
    readonly context?: DecisionContext
  }
>

export type ActionStartRecord = Record_<'action-start', { readonly recommendation: RecordId }>

/**
 * **The attempt was carried out. Not that it worked.**
 *
 * This is the definition the whole learning layer rests on, and its absence was
 * DEF-0020. "Done" means the owner did the thing the sentence asked for; it
 * says nothing about whether the intended end state was reached. Fifteen
 * minutes clearing the kitchen can be done in full and leave the kitchen half
 * clear; a recall session can be completed and recall little; winding down can
 * happen and sleep still be bad.
 *
 * Whether the intended result occurred is a separate observation with its own
 * window — an `outcome` carrying `aspect: 'result'`. Section 20 lists
 * `completed` and `outcome observed` as different states, and they are.
 */
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

/**
 * What an outcome is an observation *of* (DEF-0020).
 *
 * Three, and they answer different questions about the same episode:
 *
 * - `result` — did the intended end state occur? Distinct from completion,
 *   which only says the attempt was made.
 * - `effect` — what was it worth? The downstream change, if any.
 * - `comfort` — how did it feel? Only where the subjective experience is
 *   itself the fact worth having (section 10).
 *
 * Phase 3 collapsed all three into one better/same/worse judgement, which asked
 * questions its own answers could not answer and taught one belief from four
 * kinds of evidence. Whose result it is needs no fourth aspect: the subject
 * carries that, so "how did Adaya do" is a `result` about a development skill
 * that links to her.
 */
export const OUTCOME_ASPECTS = ['result', 'effect', 'comfort'] as const

export type OutcomeAspect = (typeof OUTCOME_ASPECTS)[number]

export function isOutcomeAspect(value: unknown): value is OutcomeAspect {
  return typeof value === 'string' && (OUTCOME_ASPECTS as readonly string[]).includes(value)
}

export type OutcomeRecord = Record_<
  'outcome',
  {
    readonly about: RecordId
    readonly aspect: OutcomeAspect
    readonly observation: FactValue
    /**
     * Only an `effect` observation carries one, and the restriction matters:
     * `roughOutcomesFor` reads `sentiment === 'worse'` to decide that a topic
     * went badly, so a result of "none of it" wearing that flag would fire the
     * weak-topic generator on an evening that says nothing about the topic.
     */
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

/**
 * The owner disagreeing with something the system worked out.
 *
 * Section 62 requires that a learned pattern, a learned preference or an
 * inferred belief can be corrected, and that the app then "stops reasserting
 * the old belief unless new evidence genuinely supports revisiting it".
 *
 * A correction is not a fact about a record, which is why this is not a
 * `correction`: there is no single row to retract. A learned belief rests on
 * several outcomes at once, and retracting them one at a time would also throw
 * away what the owner actually observed. So the correction names the belief and
 * acts as a watershed — everything recorded up to that moment stops counting
 * toward it, and what happens afterwards counts normally. That is what "unless
 * new evidence genuinely supports revisiting it" means in practice, without
 * inventing a threshold nobody chose.
 *
 * `restore` exists because the owner may change their mind, and because
 * append-first history has no other way to undo.
 */
export type BeliefCorrectionRecord = Record_<
  'belief-correction',
  {
    /** Which belief. Opaque here: the intelligence layer composes and reads it. */
    readonly belief: string
    readonly stance: 'reject' | 'restore'
    readonly reason: string
  }
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
  | BeliefCorrectionRecord
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

/**
 * A fact value as text.
 *
 * Pass `labelFor` and an entity value reads as the thing it names rather than
 * as an identifier. Without a resolver — or when the reference is broken — the
 * id is shown and said to be missing, because an inspector that hides a
 * dangling reference behind a tidy blank is worse than one that shows the id.
 */
export function describeFactValue(
  value: FactValue,
  labelFor?: (ref: EntityRef) => string | undefined,
): string {
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
    case 'entity': {
      if (labelFor === undefined) return value.value.id
      return labelFor(value.value) ?? `${value.value.id} (missing)`
    }
  }
}

export function factValuesEqual(a: FactValue, b: FactValue): boolean {
  if (a.type !== b.type) return false
  if (a.type === 'entity' && b.type === 'entity') {
    return a.value.id === b.value.id && a.value.kind === b.value.kind
  }
  return describeFactValue(a) === describeFactValue(b)
}
