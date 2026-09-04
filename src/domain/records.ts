import type { LifeDomainId } from './domains'
import type { EntityRef } from './entities'
import { describeDuration } from './horizon'
import type { RecordId } from './ids'
import { discreetPlaceholder, mayShowDetail, DISCREET_PRIMARY, type PrivacyClass } from './privacy'
import type { ActionVerb, RecommendationSemantics } from './recommendation'
import type { DayBlock, Instant, IsoWeekday, LocalDayId, TimeZoneId } from './time'
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
  /**
   * What the owner is trying to become — F01, D-162.
   *
   * The record kind the product did not have. Every object before this one is
   * scoped to today or to a bounded three-step course: a `goal` is a statement
   * with a date and some pieces, a `thread` is two to four occasions, an
   * `observation` is a reading that goes stale. None of them can hold *stronger,
   * employable, closer to her* — so the app could represent what to do next and
   * could not represent what any of it was for, which is why it could not
   * represent progress and could not represent a strategy that fails.
   *
   * **Described, never scored.** D-162 is this record's central guard and it is
   * enforced by the shape rather than by care: every field here is either the
   * owner's own words or a state from a closed list. There is no number on it,
   * so there is nothing for a percentage to be computed from.
   *
   * A destination is revised by writing another one with `supersedes` set,
   * exactly as a goal is. What the owner wrote first stays legible after he
   * changes his mind about it, which is the whole reason an aspiration is worth
   * storing rather than inferring.
   */
  'destination',
  /**
   * What the app read in the words the owner typed — routing 91, D-242.
   *
   * A **sibling** of the destination record, never a replacement for it. His
   * words are stored byte-identical in the `destination` row and are not
   * touched here; this row says what the app worked out from them — which area
   * they name, which words named it, and what they did not say. D-143's rule
   * applied to interpretation: what the app was told and what it worked out are
   * two rows, and the second one states what it rests on.
   *
   * **It is only ever written after the owner agrees**, so a reading he
   * declined leaves no trace of any kind, and it carries
   * `provenance.source: 'derived'` so nothing downstream can mistake it for
   * something he said.
   *
   * Withdrawn by writing another one with `withdrawn` set and `supersedes`
   * pointing at it, exactly as a destination is revised. The reading he took
   * back stays legible in Timeline; what changes is what the app reads.
   */
  'aim-reading',
  'commitment',
  /**
   * A named obligation with a place in the owner's day — AUD-0004.
   *
   * Distinct from `commitment`, which is a promise with a due window: this is a
   * span of the day that is already spoken for. The school run, working hours,
   * a handover. Nothing in the engine could see one before this phase, so 07:15
   * with twenty minutes before the school run and 11:00 with the house quiet
   * were the same morning and got the same answer.
   */
  'commitment-window',
  /**
   * A named course of action over days or weeks — AUD-0020.
   *
   * The one structure the audit calls its highest-leverage change. Every
   * recommendation before this was a fresh function of the situation:
   * `decide()` had no way to express "this, then that", "we are three weeks
   * into a push" or "this is not working, try something else". Recovery was
   * always one night, study had no schedule, growth had no next rung, and the
   * same sentence could repeat for nine evenings — six separate findings, and
   * one missing structure.
   *
   * A thread does not decide. It is one more input to the same pipeline.
   */
  'thread',
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
  /**
   * A standing permission the owner has given or taken back — D-167.
   *
   * One control governs whether Private / Sexual Health may influence ordinary
   * cross-domain reasoning, and it is **off** until he says otherwise. It is a
   * record rather than a setting because a permission is a thing he said, with
   * a date on it: turning it off later stops future use without falsifying,
   * rewriting or deleting what was reasoned from while it was on.
   */
  'permission',
  /**
   * What came of a question asked to understand the owner over time — F02, D-163.
   *
   * The second agenda's own memory, and it exists so a skip is respected.
   * Answering writes whatever record the answer is — a destination, a
   * constraint, a commitment window — and this alongside it, naming the prompt
   * and what it produced. Skipping writes only this. Either way the prompt is
   * not put again, which is the difference between an agenda and a
   * questionnaire.
   *
   * **Nothing is written when a prompt is rendered** (D-043). This record is
   * the owner acting, never the app displaying.
   */
  'discovery-response',
  /**
   * How much the check-in asks, and how often — D-285, routing 94.
   *
   * A record rather than a setting, for the reason `permission` is one: it is a
   * thing the owner said, with a date on it. Three things follow, and the third
   * is why it is not a key in a preferences store.
   *
   * - **Changing it later does not falsify what came before.** A week answered
   *   at `full` was answered at `full`, and the record says so.
   * - **It is his, so it exports, backs up and restores** with the rest of his
   *   history, and he can see it on Timeline like anything else he told the app.
   * - **Reading density is a covariate of every series this phase starts.** A
   *   fortnight with fewer readings in it is a fortnight the owner changed a
   *   setting, not a fortnight he changed. D-288's forecast is built on those
   *   series, and a store that could not tell those two apart would hand it a
   *   pattern that is about the app.
   *
   * The latest one wins. There is no delete, and no record at all reads as
   * {@link DEFAULT_CHECK_IN_SETTINGS} — D-293's shipped default.
   */
  'check-in-setting',
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
    /**
     * The named pieces of work this goal is made of — AUD-0021.
     *
     * Optional, and the model has to work with none of them. Most goals will
     * never have any, and a goal with an empty list must behave exactly as it
     * did before this field existed: what parts buy is the ability to say
     * *"four of nine topics have had a session"*, and where there are no parts
     * the honest thing is to say less rather than to guess at a denominator.
     *
     * References rather than strings, because the pieces already exist as
     * entities — a certification's topics are `learning-topic` entities the
     * career generator is already studying — and a second, looser name for the
     * same thing is section 13.4's whole complaint.
     *
     * **Counts, never a percentage.** Section 22 forbids a life score and
     * "44%" about a man's certification is one with a friendlier face.
     */
    readonly parts?: readonly EntityRef[]
    /**
     * The destination this goal is a milestone of — F01, F05.
     *
     * Absent on an ordinary goal, and an ordinary goal must behave exactly as
     * it did before this field existed. Where it is present the goal **is** the
     * milestone: what is next on the way to something larger, in the owner's
     * own words, with its own date and its own pieces.
     *
     * A second record kind for a milestone was written and thrown away. A
     * milestone is a named objective with a horizon and named work in it, which
     * is what a goal already is — and D-178's rule is that one thing has one
     * name in the layer every surface reads. What changes with this field is the
     * **word on screen** and what may be concluded from finishing it, not the
     * shape of the record.
     */
    readonly milestoneOf?: EntityRef
  }
>

export const DESTINATION_STATES = ['active', 'paused', 'reached', 'set-aside'] as const

export type DestinationState = (typeof DESTINATION_STATES)[number]

export function isDestinationState(value: unknown): value is DestinationState {
  return typeof value === 'string' && (DESTINATION_STATES as readonly string[]).includes(value)
}

/**
 * What the owner is trying to become, and what would show it — F01, F35, D-162.
 *
 * Four parts, and every one of them is either his words or a state from a
 * closed list:
 *
 * - `aim` — what he is aiming at.
 * - `baseline` — where he is now, as he describes it. Not a measurement.
 * - `evidence` — what would count as having got somewhere.
 * - `unknowns` — what he does not know yet, kept rather than guessed at.
 *
 * What is **next** is deliberately not a field here: it is a `goal` carrying
 * `milestoneOf`, because what is next is a thing with a date and some work in
 * it, and that is what a goal already is.
 *
 * **There is no number on this record and there must never be one.** D-162
 * forbids a score, a percentage, a share, a rate, a rank, a grade, a completion
 * bar or a readiness figure about the owner, and a phase whose whole subject is
 * progress is where one arrives looking reasonable. The defence is structural:
 * there is nothing here that can be divided by anything else.
 */
export type DestinationRecord = Record_<
  'destination',
  {
    readonly destination: EntityRef
    /** What he is aiming at, rendered exactly as he wrote it. */
    readonly aim: string
    readonly state: DestinationState
    /** Where he is now, in his words. Absent is a real answer and stays one. */
    readonly baseline?: string
    /** What would count as having got somewhere. Never a threshold. */
    readonly evidence?: readonly string[]
    /** What he does not know yet. Kept, because an unknown is a fact. */
    readonly unknowns?: readonly string[]
  }
>

/**
 * What the app read in the owner's own words — routing 91.
 *
 * Every field is either one of his words, an area id, or a sentence naming what
 * the words did not say. There is no confidence number and no score: D-162
 * binds here as everywhere, and an interpretation with a number on it would be
 * the first thing on this product a percentage could be computed from.
 */
export type AimReadingRecord = Record_<
  'aim-reading',
  {
    /** The destination whose words were read. */
    readonly destination: EntityRef
    /** The record holding his words — the row this one is a sibling of. */
    readonly reads: RecordId
    /** The area the words name. */
    readonly named: LifeDomainId
    /** The area the question that drew the words was about. */
    readonly askedIn: LifeDomainId
    /** The words that named the area, exactly as he typed them. */
    readonly words: readonly string[]
    /** What the words did not say. Never empty for a reading that was offered. */
    readonly unknowns: readonly string[]
    /** Set on the row that takes an earlier reading back. */
    readonly withdrawn?: boolean
  }
>

export type CommitmentRecord = Record_<
  'commitment',
  { readonly statement: string; readonly due: DueWindow; readonly to?: EntityRef }
>

/**
 * How the app came to know about an obligation — AUD-0004.
 *
 * **Carried from the start even though only two of the three can occur**, and
 * that is the whole reason the field exists now rather than later. Owner-entered
 * commitments, recurring ones and calendar-derived ones are the same shape at
 * different reliabilities; writing the shape without the provenance would mean
 * that adding a trusted schedule source later is a redesign of the record
 * rather than an adapter in front of it.
 *
 * - `owner-entered` — he typed this one, about this day.
 * - `recurring` — he told the app the shape of an ordinary week, once.
 * - `calendar` — nothing produces one yet. It is here so that when something
 *   does, everything downstream already knows the difference.
 */
export const COMMITMENT_WINDOW_SOURCES = ['owner-entered', 'recurring', 'calendar'] as const

export type CommitmentWindowSource = (typeof COMMITMENT_WINDOW_SOURCES)[number]

export function isCommitmentWindowSource(value: unknown): value is CommitmentWindowSource {
  return (
    typeof value === 'string' && (COMMITMENT_WINDOW_SOURCES as readonly string[]).includes(value)
  )
}

/**
 * When an obligation happens, as a rhythm rather than as a list of instants.
 *
 * A school term is a weekly shape, not two hundred separate rows, and storing
 * it as instants would make "what time does her school day start" unanswerable
 * the moment the term rolled over. `one-off` is the other real case — a
 * handover, an appointment — and it names an owner-local day rather than an
 * instant for the same reason `RecordEnvelope` derives the local day rather than
 * storing it (section 15).
 */
export type CommitmentRecurrence =
  | { readonly kind: 'one-off'; readonly on: LocalDayId }
  | { readonly kind: 'weekly'; readonly days: readonly IsoWeekday[] }

/**
 * A span of the owner's day that is already spoken for — AUD-0004.
 *
 * The audit's clean answer to the brief's question — *does a recommendation
 * ever consider WHEN, not just WHETHER?* — was **no**, and this is the missing
 * half. Five fixed blocks from wall-clock minutes model the shape of a day and
 * nothing about *this* owner's day: at 07:15 with the school run in twenty
 * minutes and at 11:00 with the house quiet, the engine saw the same morning.
 *
 * Minutes into the owner-local day rather than instants, because that is what
 * the fact is: her school day starts at half past eight, on every day it starts
 * at all. An instant would be one occurrence of a rhythm, and would need
 * re-deriving every time the rhythm was read.
 */
export type CommitmentWindowRecord = Record_<
  'commitment-window',
  {
    /** What the owner calls it. Rendered exactly, never paraphrased. */
    readonly label: string
    /** Minutes into the owner-local day it begins. */
    readonly startsAt: number
    /** Minutes into the owner-local day it ends. Always after `startsAt`. */
    readonly endsAt: number
    readonly recurrence: CommitmentRecurrence
    /**
     * Whose time the span actually takes.
     *
     * The distinction is not a nicety, and getting it wrong would make the
     * whole record worse than nothing. **`mine`** is a span the owner is not
     * free in — his working hours. **`theirs`** is a span somebody *else* is
     * occupied for, and it shapes his day at its edges rather than in its
     * middle: a school day means he has to be somewhere at half past eight and
     * somewhere at three, and the five hours between them are the freest he
     * gets all week. Treating that as time he is busy would have the app go
     * quiet at precisely the hours it should be speaking.
     */
    readonly whose: 'mine' | 'theirs'
    readonly knownFrom: CommitmentWindowSource
  }
>

/**
 * The three courses of action the app knows how to run — AUD-0020.
 *
 * **Bounded to exactly three, with no generic creation control**, and the bound
 * is what keeps this a strategic skeleton rather than a project-management
 * subsystem. Each one answers a finding the audit raised separately: a recovery
 * run because recovery was always one night (AUD-0009), a study schedule
 * because studying had none (AUD-0010), and a growth ladder because a
 * developmental skill had no next rung (AUD-0015a).
 *
 * A fourth belongs to a phase that decides to add one, in writing.
 */
export const THREAD_KINDS = ['recovery-run', 'study-schedule', 'growth-ladder'] as const

export type ThreadKind = (typeof THREAD_KINDS)[number]

export function isThreadKind(value: unknown): value is ThreadKind {
  return typeof value === 'string' && (THREAD_KINDS as readonly string[]).includes(value)
}

export const THREAD_STATES = ['running', 'paused', 'done', 'abandoned'] as const

export type ThreadState = (typeof THREAD_STATES)[number]

/**
 * A course of action the owner can see and stop — AUD-0020.
 *
 * **A hidden plan is worse than no plan**, which is why every field here is
 * something a surface can render: what it is about, what it is for, how many
 * occasions it expects, and when it gives up on its own.
 *
 * ## Why the moves are stored rather than looked up
 *
 * The kind already implies them, and a table keyed on the kind would be shorter.
 * But a thread outlives a release: a record written this month and read next
 * year must still mean what it meant, and a table that changed underneath it
 * would silently re-scope a plan the owner agreed to. The same reasoning as
 * `DecisionContext` — what the app could see is written down at the time and
 * never re-derived.
 *
 * ## State changes are new records
 *
 * Pausing, finishing or abandoning a thread writes a new `thread` record with
 * `supersedes` set, exactly as a goal correction does. Nothing is edited, and
 * the course the owner set out on stays legible after he stops it.
 */
export type ThreadRecord = Record_<
  'thread',
  {
    readonly thread: ThreadKind
    /** What it is about: a topic, a skill, the life area rest belongs to. */
    readonly subject: EntityRef
    /** What it is for, in the owner's register. Rendered exactly. */
    readonly intent: string
    /** How many occasions the plan expects. Small — two to four. */
    readonly steps: number
    /** Which moves count toward it. Anything else is not part of this thread. */
    readonly moves: readonly ActionVerb[]
    readonly state: ThreadState
    /**
     * The owner-local day it stops applying, whatever has happened by then.
     *
     * **A thread must expire on its own**, and AUD-0020 names the risk this
     * answers: a plan that outlives its usefulness becomes nagging, and this
     * app's whole personality depends on not nagging. The date is set when the
     * thread starts and never extended.
     */
    readonly expiresOn: LocalDayId
  }
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
 * How heavy a week has been, in the resolution a person speaks in — AUD-0007.
 *
 * The vocabulary lives here, with the record shape that stores it, rather than
 * with the reading that produces it. A record written this month and read next
 * year has to still mean what it meant, and `intelligence/rhythm.ts` — which
 * decides *which* of the three a week was — is free to be re-cut without
 * re-scoping every decision the owner already acted on. It is the same
 * reasoning `ThreadRecord` gives for storing its own `moves` list.
 */
export type WeekLoad = 'light' | 'ordinary' | 'heavy'

export const WEEK_LOADS = ['light', 'ordinary', 'heavy'] as const

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
  /**
   * Which day of the week it was, 1 for Monday — AUD-0007.
   *
   * `weekend` above collapses five working evenings into one another, so a
   * Tuesday resembled a Thursday exactly as much as it resembled another
   * Tuesday. The audit's reproduction is three evenings six days apart — one
   * working, two weekend — answered with the identical sentence three times.
   *
   * **Absent on every record written before routing 93**, and that absence is
   * load-bearing: `similarity` treats a missing weekday as unknown rather than
   * as agreement, so nothing in the existing history quietly starts resembling
   * a Tuesday (G-009).
   */
  readonly dayOfWeek?: IsoWeekday
  /**
   * How heavy the last seven days had been — AUD-0007.
   *
   * Three levels, derived from what the record already held: rest against the
   * working baseline, effortful moves actually completed, and times he said he
   * could not. No new question, and no number about a man.
   *
   * Written down at the moment of the decision like everything else here, and
   * never re-derived: re-reading "was that a heavy week?" from today's history
   * would answer with everything written since.
   */
  readonly load?: WeekLoad
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
  {
    readonly recommendation: RecordId
    readonly note?: string
    /**
     * Whether the whole of it happened, or part of it — F10.
     *
     * Absent means the whole of it, so every completion written before this
     * field existed means exactly what it always meant. `partial` is the
     * evening real life actually has: fifteen of the twenty-five minutes, half
     * the kitchen, two of the three questions — an attempt that got somewhere
     * and is not finished.
     *
     * It is still a completion. The attempt was carried out, which is the only
     * thing a completion has ever claimed, and learning reads it as one. What
     * changes is the **state** the episode is left in and therefore the word on
     * the card: `part-done` is not `done`, and it can still be finished.
     */
    readonly extent?: 'full' | 'partial'
  }
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
export const OUTCOME_ASPECTS = [
  'result',
  'effect',
  'comfort',
  /**
   * Whether the capability is still there later — F05.
   *
   * Asked about a **course**, not about a session, and days after it finished
   * rather than at the end of it. Three completed study sessions say the
   * sessions happened; whether any of it stuck is a different observation with
   * a different window, and the review's complaint is precisely that the
   * product had one word for both.
   */
  'retained',
  /**
   * Whether it has been used anywhere real — F05.
   *
   * The furthest thing a person can honestly report about their own learning
   * without being asked to grade himself: not *do you know it* but *have you
   * used it*. It is the last rung of the progress ladder and the only one that
   * is about the world rather than about the record.
   */
  'transfer',
] as const

export type OutcomeAspect = (typeof OUTCOME_ASPECTS)[number]

export function isOutcomeAspect(value: unknown): value is OutcomeAspect {
  return typeof value === 'string' && (OUTCOME_ASPECTS as readonly string[]).includes(value)
}

/**
 * How much the adult did, on one occasion — AUD-0017.
 *
 * **Not an invention: it is the scaffolding construct itself.** The adult
 * provides assistance pitched slightly ahead of the child's current competence
 * and transfers responsibility for each component as she masters it (Wood,
 * Bruner & Ross, *Journal of Child Psychology and Psychiatry* 17(2):89–100,
 * 1976). So recording it is recording the thing that actually changes as she
 * develops, which is why it earns the tap it costs (section 4.5).
 *
 * It is also the one reading here that describes what *he* did rather than what
 * she managed, which is where section 4.4 asks the framing to sit.
 */
export const HELP_LEVELS = ['on-her-own', 'a-small-prompt', 'needed-me'] as const

export type HelpLevel = (typeof HELP_LEVELS)[number]

export function isHelpLevel(value: unknown): value is HelpLevel {
  return typeof value === 'string' && (HELP_LEVELS as readonly string[]).includes(value)
}

/**
 * Where an occasion happened, coarsely — AUD-0017.
 *
 * A place the app already knows about, or one of two coarse answers for the
 * places it does not. Three occasions three weeks apart at the same restaurant
 * with her father at the table supports "she can do this here, with me" and not
 * "independently now" — and generalisation across settings is the thing that
 * has to be programmed and probed rather than inferred from a run in one
 * context (Stokes & Baer, 1977).
 *
 * **A skipped answer is absent, never `somewhere-familiar`.** AUD-0017 says so
 * in as many words, and it is G-009's rule about a child: unknown is unknown,
 * and the safe reading of it is the one that asserts less.
 */
export type OccasionSetting =
  | { readonly kind: 'place'; readonly place: EntityRef }
  | { readonly kind: 'somewhere-new' }
  | { readonly kind: 'somewhere-familiar' }

export interface OccasionContext {
  readonly help: HelpLevel
  /** Absent where he skipped it, which is a real answer and stays one. */
  readonly setting?: OccasionSetting
}

export type OutcomeRecord = Record_<
  'outcome',
  {
    readonly about: RecordId
    readonly aspect: OutcomeAspect
    readonly observation: FactValue
    /**
     * What else was true of this occasion — AUD-0017.
     *
     * Present on a growth result and absent everywhere else. `observation` is a
     * single `FactValue` and there was nowhere to put "where" or "with how much
     * help", so the occasion could not carry them and the app could not tell a
     * child who is *emerging* from one who is *consistent*.
     *
     * Optional, and existing occasions must not be back-filled: an occasion
     * recorded before this field existed happened somewhere, and the app does
     * not know where.
     */
    readonly occasion?: OccasionContext
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

export const GROWTH_STAGES = ['practising', 'settled'] as const

export type GrowthStage = (typeof GROWTH_STAGES)[number]

export function isGrowthStage(value: unknown): value is GrowthStage {
  return typeof value === 'string' && (GROWTH_STAGES as readonly string[]).includes(value)
}

export type DomainUpdateRecord = Record_<
  'domain-update',
  {
    readonly domain: LifeDomainId
    readonly summary: string
    /**
     * The owner's judgement about where a skill of his daughter's has got to —
     * AUD-0015(a).
     *
     * The record kind already existed and already carried his answer as a
     * free-text summary; what it could not carry was anything the **candidate
     * generator** could read. So "Yes, she has got this" suppressed the
     * suggestion and not the move, and the app went on proposing a skill he had
     * told it she had — which breaches section 62 in as many words.
     *
     * Structured alongside the sentence rather than instead of it: the summary
     * is what he agreed to and stays exactly as it was written.
     *
     * **Never permanent.** Regression is real in children, so the same field
     * carries `practising` and one tap puts it back.
     */
    readonly growthStage?: { readonly skill: EntityRef; readonly stage: GrowthStage }
  }
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
 * One standing permission, as the owner last left it — D-167.
 *
 * `granted` is the whole payload, and the default is that there is no record at
 * all — which reads as **off**, because a permission nobody gave is one that
 * was not given. Turning it off writes `granted: false` rather than deleting
 * anything: history is append-first, and what was reasoned from while it was on
 * stays true of the moment it happened.
 */
export type PermissionRecord = Record_<
  'permission',
  { readonly permission: string; readonly granted: boolean; readonly statement: string }
>

export const DISCOVERY_DISPOSITIONS = ['answered', 'skipped'] as const

export type DiscoveryDisposition = (typeof DISCOVERY_DISPOSITIONS)[number]

/**
 * What the owner did with a discovery prompt — F02, D-163.
 *
 * The second agenda's memory. `answered` carries the record the answer became,
 * so the agenda can go back and say **what the answer changed** — which is one
 * of D-163's four rules and the one an agenda cannot fake.
 *
 * `skipped` carries nothing, and that is the point: a skip is respected, the
 * prompt is not put again, and an unanswered question leaves the thing unknown
 * rather than guessed at.
 *
 * **Nothing is written when a prompt is rendered** (D-043). This record is the
 * owner acting, never the app displaying.
 */
export type DiscoveryResponseRecord = Record_<
  'discovery-response',
  {
    /** The prompt's stable id, so an answer and a skip are both remembered. */
    readonly prompt: string
    readonly disposition: DiscoveryDisposition
    /** What the answer became, when it became something. */
    readonly produced?: RecordId
  }
>

/**
 * Legacy data held at arm's length.
 *
 * Section 30: imported legacy records must not silently drive intelligence
 * until they are explicitly mapped and approved. Nothing in this phase resolves
 * a fact from one, and `tests/contract` proves it.
 */
/**
 * The depth and frequency the owner set the check-in to — D-285.
 *
 * Two fields because they are two controls. D-285's words are *"depth (how many
 * readings per check-in) and frequency (how many check-ins a day) as two
 * separate controls"*, and collapsing them into one level here would make the
 * screen's separation cosmetic.
 *
 * `statement` is what he was told the choice meant, kept beside the choice. It
 * is the same discipline as `PermissionRecord.statement`: a setting the owner
 * changed a year ago is only readable later if the words he was reading at the
 * time are readable too.
 */
export type CheckInSettingRecord = Record_<
  'check-in-setting',
  {
    readonly depth: string
    readonly frequency: string
    readonly statement: string
  }
>

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
  | DestinationRecord
  | AimReadingRecord
  | CommitmentRecord
  | CommitmentWindowRecord
  | ThreadRecord
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
  | PermissionRecord
  | DiscoveryResponseRecord
  | CheckInSettingRecord
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
    /*
     * The same words the premise uses — AUD-0038(b).
     *
     * This said "60 min" while the line at the top of Now said the same
     * quantity as a phrase, on the same evening, about the same fact. The
     * audit's finding is one formatter; this is the third of the three surfaces
     * that needed it, and the one that fixed where the formatter had to live.
     *
     * **Display only, and `factValuesEqual` no longer reads it.** Two durations
     * a minute apart now render the same phrase, and comparing facts by their
     * rendered words would have made that a claim that nothing had changed.
     */
    case 'duration':
      return describeDuration(value.minutes)
    case 'entity': {
      if (labelFor === undefined) return value.value.id
      return labelFor(value.value) ?? `${value.value.id} (missing)`
    }
  }
}

/**
 * The same renderer, with the discretion attached — AUD-0040's precondition.
 *
 * ## What this closes
 *
 * AUD-0040 makes `assembleSituation` read every concept in the registry rather
 * than nine named ones, and the audit is explicit that **this change is what
 * creates the private-data exposure**: the moment the private pattern is read,
 * its rendered value is one call to {@link describeFactValue} away from an
 * explanation or an evidence panel. The audit asks for a guard that makes that
 * *structurally impossible rather than conventional* — not six call sites each
 * remembering to check.
 *
 * So there is one renderer that knows about privacy, and
 * `tests/unit/architecture-guards.test.ts` fails the build if anything under
 * `src/intelligence/` calls {@link describeFactValue} outside this function. A
 * new explanation clause cannot render a reading without coming through here,
 * and coming through here means the class decides.
 *
 * **It is not a filter.** A withheld value still produces a row and a sentence
 * — {@link discreetPlaceholder} — because a surface that dropped the line would
 * tell the owner his history is thinner than it is (D-175). Concealing the
 * words is not concealing the entry.
 *
 * `DISCREET_PRIMARY` is the policy every decision-layer surface is under: Now,
 * the evidence panel, the explanation, Insights and Timeline are all primary
 * surfaces, and the two places that are not — the Private page itself and the
 * full export — read the store directly and state their own policy.
 */
export function discreetly(
  privacy: PrivacyClass,
  value: FactValue,
  labelFor?: (ref: EntityRef) => string | undefined,
): string {
  if (!mayShowDetail(privacy, DISCREET_PRIMARY)) return discreetPlaceholder(privacy)
  return describeFactValue(value, labelFor)
}

export function factValuesEqual(a: FactValue, b: FactValue): boolean {
  if (a.type !== b.type) return false
  if (a.type === 'entity' && b.type === 'entity') {
    return a.value.id === b.value.id && a.value.kind === b.value.kind
  }
  /*
   * Durations compare by the number, not by the sentence — routing 90.
   *
   * Equality used to be "these render the same", which was true while a
   * duration rendered its own minute count. It stopped being true the moment
   * ninety-one minutes and ninety-four minutes both became "an hour and a
   * half": two genuinely different readings would have compared equal, and a
   * change the owner made would have been recorded as no change at all.
   *
   * A *display* change must never move what the app believes. This is the line
   * that keeps that true.
   */
  if (a.type === 'duration' && b.type === 'duration') return a.minutes === b.minutes
  return describeFactValue(a) === describeFactValue(b)
}
