import { createRecordFactory } from '../domain/build'
import { coreConcepts, type ConceptRegistry } from '../domain/concepts'
import { DOMAIN, type LifeDomainId } from '../domain/domains'
import type { EntityIndex, EntityRef } from '../domain/entities'
import { newRecordId, type RecordId } from '../domain/ids'
import { permissionDefinition, type PermissionId } from '../domain/privacy'
import { patternNameFor, verbLabel, type ActionVerb } from '../domain/recommendation'
import type {
  BeliefCorrectionRecord,
  CanonicalRecord,
  ContextRecord,
  CorrectionRecord,
  PreferenceRecord,
  CoverageUpdateRecord,
  DomainUpdateRecord,
  EvidenceStrength,
  ExplicitFactRecord,
  FactValue,
  GoalRecord,
  GoalStatus,
  PermissionRecord,
} from '../domain/records'
import {
  civilDateFromDayId,
  instantAtLocal,
  localDateTimeAt,
  type Instant,
  type LocalDayId,
  type TimeZoneId,
} from '../domain/time'
import type { ConceptId, DueWindow } from '../domain/windows'
import { actionScopeParts } from './association'
import { parseBeliefKey } from './learning'

/**
 * The owner disagreeing with something the app worked out or holds (section 62).
 *
 * The write side of `learning.ts`, and its own file for a reason the boundary
 * cares about: a surface is allowed to record what the owner did and is not
 * allowed to read how a move is ranked. Recording a correction is the first
 * thing; the belief it corrects is the second. Keeping them apart is what lets
 * Now offer the button without being able to reach the arithmetic behind it.
 *
 * Section 62 lists eight kinds that must be correctable: facts, context,
 * inferred patterns, goals, direction, coverage interpretation, domain status,
 * learned preference. Phase 4 could honestly offer only the last two — a
 * learned effect and a learned preference — through `beliefCorrectionRecord`,
 * because Now was the only surface that could see a decision to disagree with.
 *
 * Phase 5 adds the other six, and every one of them writes a record kind that
 * already existed (sections 13.1 and 13.2) rather than inventing a new one:
 *
 * - **facts** and **direction** are the same case — an `explicit-fact` for the
 *   concept, dated now, which the fact layer already resolves ahead of
 *   anything older at the same scope (`src/memory/facts.ts`). The weekly
 *   direction is simply a fact about `CONCEPT.weeklyFocus`, so correcting it is
 *   `factCorrectionRecord` with that concept — no separate function, because
 *   there is no separate mechanism.
 * - **context** is a `context` record with its own durability and validity
 *   window, so a corrected arrangement can be durable or a stated exception
 *   without disturbing what it overrides (D-012).
 * - **goals** supersede the record they replace, the same way any correction
 *   to a non-concept-bearing record has to: there is no "latest wins" for a
 *   goal, so leaving the old row unsuperseded would show both.
 * - **coverage interpretation** and **domain status** write a `coverage-update`
 *   or `domain-update` — exactly what `growth.ts` already writes for a growth
 *   answer, and exactly what the coverage engine already reads as meaningful
 *   evidence about the area (`coverage.ts`'s `evidenceByDomain`). A domain page
 *   offering "this is current, I have been keeping on top of it" is the general
 *   case of the growth suggestion's "not yet".
 *
 * Nothing here decides anything, which is why this stays open to surfaces
 * (`docs/ARCHITECTURE_BOUNDARIES.md`). Every function below only shapes a
 * record; whether it changes what the owner is told next is entirely up to the
 * same read paths that already governed these record kinds before this file
 * existed.
 */

/** Who wrote a correction down, for records this file builds. */
const LIFE_PAGE_PROVENANCE = { source: 'owner', writtenBy: 'life' } as const

export interface CorrectionMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  /** The real clock, distinct from the moment being reasoned about (D-037). */
  readonly recordedAt?: Instant
}

/**
 * A correction, as a canonical record.
 *
 * Like everything else it lands as an appended record and is read back through
 * the same history fold. There is deliberately no separate table of things the
 * owner has vetoed — a second store of truth is how a correction gets quietly
 * lost in a restore, which is the failure section 29 exists to prevent.
 */
export function beliefCorrectionRecord(
  belief: string,
  stance: 'reject' | 'restore',
  reason: string,
  moment: CorrectionMoment,
  id: RecordId = newRecordId(),
): BeliefCorrectionRecord {
  const build = createRecordFactory({
    zone: moment.zone,
    provenance: { source: 'owner', writtenBy: 'now' },
  })
  return build(
    'belief-correction',
    {
      occurredAt: moment.now,
      ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
      id,
    },
    { belief, stance, reason },
  )
}

/**
 * "Stop suggesting this" — section 4.3's sixth owner action, AUD-0050.
 *
 * Section 4.3 is a non-negotiable product principle and it lists **explicitly
 * forbid a recommendation family** among the things the owner can do. The
 * enforcement has always been complete — `vetoFor` in `constraints.ts` handles
 * the domain-level case and cites section 4.3 by name — and no control anywhere
 * in the product could produce the record it enforces. The interface offered
 * five of the six actions, and the one it could not express was *stop*.
 *
 * A decline is deliberately not this. `owner-preference` treats a refusal as
 * the owner exercising sovereignty rather than as a verdict on the move
 * (`learning.ts`), so the move comes back with a slightly lower score — which
 * is right for a decline, and is why fourteen refusals in the record still ended
 * with the app suggesting the same walk.
 *
 * Nothing here decides anything: it shapes a record, and `vetoFor` was already
 * reading it.
 */
export function forbidRecord(
  about: EntityRef,
  statement: string,
  moment: CorrectionMoment,
  domains: readonly LifeDomainId[] = [],
  id: RecordId = newRecordId(),
): PreferenceRecord {
  const build = createRecordFactory({ zone: moment.zone, provenance: LIFE_PAGE_PROVENANCE })
  return build(
    'preference',
    {
      occurredAt: moment.now,
      ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
      id,
      ...(domains.length === 0 ? {} : { domains }),
      entities: [about],
    },
    { about, stance: 'forbids', statement },
  )
}

/**
 * Lifting one, which is the half that makes the first half safe.
 *
 * A veto is the most permanent thing the owner can do and the easiest to do by
 * accident on a phone, so **a veto he cannot find again is worse than none**.
 * It is a retraction rather than a second preference: he is withdrawing the
 * entry, not stating a milder one, and `correction` is the kind that exists for
 * exactly the case where there is nothing to put in its place.
 */
export function liftVetoRecord(
  veto: RecordId,
  moment: CorrectionMoment,
  id: RecordId = newRecordId(),
): CorrectionRecord {
  const build = createRecordFactory({ zone: moment.zone, provenance: LIFE_PAGE_PROVENANCE })
  return build(
    'correction',
    {
      occurredAt: moment.now,
      ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
      id,
    },
    { corrects: veto, reason: 'The owner lifted this' },
  )
}

/**
 * What to call a belief out loud, so a correction says what it is about.
 *
 * D-039's rule, applied to a third kind of owner-facing sentence: a question
 * names what it is about, and so must a button that withdraws something. "That
 * is not right" on its own could be about anything on the screen.
 *
 * `entities` is optional only because a key is sometimes described where no
 * index exists. Every owner-facing surface has one and must pass it: without
 * it, an association correction can only name its verb (R3-B2).
 *
 * `named` is the same argument one aspect over — QA-83-002. R3-B2 repaired the
 * association branch and left the five verb-scoped aspects on `verbLabel`, so
 * the button under a card headed *"Move for 25 minutes: a walk"* read *"correct
 * what **move** does for you"*. The comment below is the reason, and it applies
 * here unchanged: the identity survived in the key and died on the way to the
 * screen.
 *
 * **It is a name, not a narrowing.** The key stays verb-scoped and so does what
 * the correction rejects; what changes is that the sentence says what the
 * pooled evidence is about, which is `learning.ts`'s `named` and is one object
 * only where the pooled episodes agree on one. Where no caller supplies it, the
 * app's own generic name for the action is used — *"getting some movement in"*
 * rather than *"move"*, which was never a word for anything.
 */
function lowerFirst(text: string): string {
  return text.length === 0 ? text : `${text.charAt(0).toLowerCase()}${text.slice(1)}`
}

export function describeBelief(key: string, entities?: EntityIndex, named?: string): string {
  const parsed = parseBeliefKey(key)
  if (parsed === undefined) return key

  /*
   * An association key carries an action scope, not a verb (R3-B2).
   *
   * `move/routine:a-walk` and `move/routine:a-bike-ride` are two beliefs about
   * two different things, and the key keeps them apart — but this sentence is
   * what the owner actually reads, on Timeline, months later. Naming the verb
   * there produces "stop assuming what the app has worked out follows moving",
   * which fits the bike ride he never disputed. The correction was scoped and
   * its description was not, which is the identity invariant surviving in the
   * key and dying on the way to the screen.
   *
   * So the object gets named, from the scope, whenever an entity index is at
   * hand — and every owner-facing caller has one. A family scope names several
   * actions deliberately and says so.
   */
  if (parsed.aspect === 'association') {
    const parts = actionScopeParts(parsed.verb)
    if (parts === undefined) return 'what the app has worked out about this'
    if ('family' in parts) return `what the app has worked out follows ${parts.family.label}`

    const label = entities?.labelFor(parts.object)
    return label === undefined
      ? `what the app has worked out follows ${verbLabel(parts.verb).toLowerCase()}`
      : `what the app has worked out follows ${label}`
  }

  const move = lowerFirst(named ?? patternNameFor(parsed.verb as ActionVerb, undefined))
  switch (parsed.aspect) {
    case 'effect':
      return `what ${move} does for you`
    case 'result':
      return `how far ${move} usually gets`
    case 'follow-through':
      return `whether ${move} tends to happen`
    case 'appetite':
      return `whether you want ${move}`
    case 'friction':
      return `how hard ${move} is for you`
  }
}

// ---------------------------------------------------------------------------
// Facts and direction — the fact layer already prefers the newest record at
// the highest scope, so correcting either is nothing more than stating the
// truth again, now (src/memory/facts.ts, `resolveOne`).
// ---------------------------------------------------------------------------

/**
 * The owner stating what a concept actually is, overriding what the app
 * currently reads.
 *
 * This is also how the weekly direction is corrected: pass
 * `CONCEPT.weeklyFocus` and a `text` or `entity` value. There is no separate
 * "direction correction" function because `resolveWeeklyDirection` reads the
 * same fact layer as everything else — a corrected direction is simply the
 * newest fact about that concept.
 */
export function factCorrectionRecord(
  concept: ConceptId,
  value: FactValue,
  moment: CorrectionMoment,
  concepts: ConceptRegistry = coreConcepts,
  id: RecordId = newRecordId(),
): ExplicitFactRecord {
  const definition = concepts.definitionFor(concept)
  const build = createRecordFactory({ zone: moment.zone, provenance: LIFE_PAGE_PROVENANCE })
  return build(
    'explicit-fact',
    {
      occurredAt: moment.now,
      ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
      id,
      domains: [definition.domain],
      privacy: definition.privacy,
    },
    { concept, value },
  )
}

export interface ContextCorrectionInput {
  readonly concept: ConceptId
  readonly value: FactValue
  readonly durability: 'durable' | 'situational'
  /** Situational only. Absent means the exception is open-ended. */
  readonly validUntil?: Instant
}

/**
 * The owner correcting a standing arrangement, or stating a temporary
 * exception to one.
 *
 * A `durable` correction answers a concept indefinitely, the way full custody
 * does (G-002). A `situational` one overrides it for a window without erasing
 * it — D-012's rule, which is what lets the owner say "she is with her mother
 * this week" without having to restate the arrangement itself afterwards.
 */
export function contextCorrectionRecord(
  input: ContextCorrectionInput,
  moment: CorrectionMoment,
  concepts: ConceptRegistry = coreConcepts,
  id: RecordId = newRecordId(),
): ContextRecord {
  const definition = concepts.definitionFor(input.concept)
  const build = createRecordFactory({ zone: moment.zone, provenance: LIFE_PAGE_PROVENANCE })
  return build(
    'context',
    {
      occurredAt: moment.now,
      ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
      id,
      domains: [definition.domain],
      privacy: definition.privacy,
    },
    {
      concept: input.concept,
      value: input.value,
      durability: input.durability,
      validFrom: moment.now,
      ...(input.validUntil === undefined ? {} : { validUntil: input.validUntil }),
    },
  )
}

// ---------------------------------------------------------------------------
// Goals — there is no "latest wins" for a goal the way there is for a
// concept, so a correction has to supersede the record it replaces or the old
// statement would still read as active alongside the new one.
// ---------------------------------------------------------------------------

export interface GoalCorrectionInput {
  /** The goal record being corrected, exactly as it reads in effective history. */
  readonly previous: GoalRecord
  readonly statement: string
  readonly status: GoalStatus
  /**
   * When the owner wants it done by — AUD-0046.
   *
   * Three states rather than two, and the third is why this is not simply an
   * optional field: `undefined` means "leave whatever is there alone", and
   * `null` means "he has taken the date off". Collapsing them would make
   * clearing a horizon impossible through the only control that can set one.
   */
  readonly targetWindow?: DueWindow | null
  /** The named pieces of work — AUD-0021. Same three states, same reason. */
  readonly parts?: readonly EntityRef[] | null
}

function carriedForward<T>(given: T | null | undefined, previous: T | undefined): T | undefined {
  if (given === null) return undefined
  return given ?? previous
}

// Omitted rather than written as `undefined`: an optional field that is present
// and empty round-trips differently from one that is absent, and `parts: []` is
// a goal broken into no pieces rather than a goal that was never broken up.
function withHorizon(window: DueWindow | undefined) {
  return window === undefined ? {} : { targetWindow: window }
}

function withParts(parts: readonly EntityRef[] | undefined) {
  return parts === undefined ? {} : { parts }
}

/**
 * The owner correcting a goal's wording or standing — done, paused, no longer
 * theirs, or restated.
 *
 * Written as a new `goal` record that supersedes the one it replaces (section
 * 13.1). `activeGoals` in `direction.ts` reads `history.effective`, so the
 * superseded row stops counting the moment this one is appended; nothing about
 * the old statement is edited or lost, only displaced (D-015).
 */
export function goalCorrectionRecord(
  input: GoalCorrectionInput,
  moment: CorrectionMoment,
  id: RecordId = newRecordId(),
): GoalRecord {
  const build = createRecordFactory({ zone: moment.zone, provenance: LIFE_PAGE_PROVENANCE })
  return build(
    'goal',
    {
      occurredAt: moment.now,
      ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
      id,
      domains: input.previous.domains,
      entities: input.previous.entities,
      privacy: input.previous.privacy,
      supersedes: input.previous.id,
    },
    {
      goal: input.previous.goal,
      statement: input.statement,
      status: input.status,
      ...withHorizon(carriedForward(input.targetWindow, input.previous.targetWindow)),
      ...withParts(carriedForward(input.parts, input.previous.parts)),
      /*
       * And it stays a milestone of whatever it was a milestone of — F01.
       *
       * Carried forward unconditionally, with no way to change it through this
       * control. Marking a milestone reached is the single most important thing
       * this control does in routing 84, and a correction that quietly turned
       * it back into an ordinary goal would take the reached step off the
       * destination it belongs to at the exact moment it mattered.
       */
      ...(input.previous.milestoneOf === undefined
        ? {}
        : { milestoneOf: input.previous.milestoneOf }),
    },
  )
}

// ---------------------------------------------------------------------------
// Coverage interpretation and domain status — both are ordinary evidence
// about an area, in the same two record kinds `growth.ts` already writes for
// a growth answer. `coverage.ts`'s `evidenceByDomain` counts either one as
// meaningful the moment it is appended, which is what lets a domain page
// correction change what Life reports without any new machinery.
// ---------------------------------------------------------------------------

/**
 * The owner disagreeing with how stale the app has judged an area to be —
 * "this is current, I have been keeping on top of it" — without necessarily
 * having a new fact to report.
 *
 * The general case of the growth suggestion's "not yet" answer
 * (`growthAnswerRecord`): both write a `coverage-update`, and both are read by
 * the coverage engine as the area having just been looked at by the person who
 * would know.
 */
export function coverageInterpretationRecord(
  domain: LifeDomainId,
  evidenceStrength: EvidenceStrength,
  moment: CorrectionMoment,
  subArea?: string,
  id: RecordId = newRecordId(),
): CoverageUpdateRecord {
  const build = createRecordFactory({ zone: moment.zone, provenance: LIFE_PAGE_PROVENANCE })
  return build(
    'coverage-update',
    {
      occurredAt: moment.now,
      ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
      id,
      domains: [domain],
    },
    { domain, evidenceStrength, ...(subArea === undefined ? {} : { subArea }) },
  )
}

/**
 * The owner correcting the app's overall understanding of a domain — a
 * sentence replacing whatever the app currently believes about the area as a
 * whole.
 *
 * The general case of a growth suggestion's "yes" answer: both write a
 * `domain-update`, and both are read by the coverage engine as meaningful
 * evidence about that area (`coverage.ts`, `mattersToOwner` and
 * `evidenceByDomain`).
 */
export function domainStatusCorrectionRecord(
  domain: LifeDomainId,
  summary: string,
  moment: CorrectionMoment,
  id: RecordId = newRecordId(),
): DomainUpdateRecord {
  const build = createRecordFactory({ zone: moment.zone, provenance: LIFE_PAGE_PROVENANCE })
  return build(
    'domain-update',
    {
      occurredAt: moment.now,
      ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
      id,
      domains: [domain],
    },
    { domain, summary },
  )
}

// ---------------------------------------------------------------------------
// The correction grammar — F32, D-165, package 6
// ---------------------------------------------------------------------------

/**
 * The four things "that's not right" can mean.
 *
 * The review watched one gesture do all four jobs: *"Not how it went"*
 * immediately suppressed a conclusion with no scope shown and no visible way
 * back, and a corrected energy reading left two readings on screen with nothing
 * marking one as superseded. The owner needs to repair the memory without
 * becoming a database operator, and without invalidating a much broader
 * conclusion than he intended.
 *
 * D-165: each gesture **says what it will change before it changes it**.
 */
export const CORRECTION_GESTURES = [
  /** This did not happen. */
  'event',
  /** It happened, on a different day. */
  'event-timing',
  /** What the app currently believes is wrong. */
  'current-fact',
  /** What the app worked out from several things is wrong. */
  'learned-interpretation',
] as const

export type CorrectionGesture = (typeof CORRECTION_GESTURES)[number]

/**
 * What a gesture will do, said before it acts.
 *
 * `preserved` is the half that makes this a grammar rather than a warning. The
 * owner's hesitation is not about whether the app will do something — it is
 * about how far it will reach, and every one of these four reaches exactly as
 * far as its own sentence says and no further.
 */
export interface CorrectionConsequence {
  readonly gesture: CorrectionGesture
  /** What this changes. */
  readonly consequence: string
  /** What it deliberately leaves alone. */
  readonly preserved: string
  /** Whether there is a way back, and what it is. */
  readonly reversal: string
}

/**
 * The consequence of each gesture, in the owner's terms.
 *
 * A `Record<CorrectionGesture, …>` so a fifth gesture cannot arrive without a
 * sentence — D-179. Every one of the four is generated from this table and from
 * nowhere else, which is what makes "each correction gesture states its
 * consequence before it acts" a property a test can hold rather than a habit a
 * reviewer has to notice.
 */
const CONSEQUENCE: Record<CorrectionGesture, (subject: string) => CorrectionConsequence> = {
  event: (subject) => ({
    gesture: 'event',
    consequence: `${subject} stops counting as something that happened.`,
    preserved:
      'The entry stays in your history, marked as withdrawn. Nothing else about that day changes.',
    reversal: 'Recording it again puts it back.',
  }),
  'event-timing': (subject) => ({
    gesture: 'event-timing',
    consequence: `${subject} moves to the day it actually happened.`,
    preserved:
      'What it says is unchanged, and the original entry stays in your history underneath it.',
    reversal: 'Moving it again is the same gesture.',
  }),
  'current-fact': (subject) => ({
    gesture: 'current-fact',
    consequence: `${subject} becomes what the app reads from now on.`,
    preserved:
      'The earlier reading stays in your history as what was true then. It is superseded, not deleted.',
    reversal: 'Correcting it again supersedes this one in turn.',
  }),
  'learned-interpretation': (subject) => ({
    gesture: 'learned-interpretation',
    consequence: `The app stops concluding ${subject}, from now on.`,
    preserved:
      'Everything you actually recorded stays exactly as it is. What stops is the conclusion drawn from it, and only from here forward — D-047.',
    reversal: 'You can let it go back to what it had learned.',
  }),
}

export function correctionConsequence(
  gesture: CorrectionGesture,
  subject: string,
): CorrectionConsequence {
  return CONSEQUENCE[gesture](subject)
}

/**
 * Withdrawing something the record says happened — F32.
 *
 * Routing 83's instrument stopped here: *"nothing withdraws a completion"*, and
 * `liftVetoRecord` was the only writer of a `correction` record in the product.
 * The mechanism was complete — `resolveHistory` retracts on a `correction` with
 * no `replacedBy` and has since Phase 1 — and there was no control.
 *
 * Nothing is deleted. The entry stays, marked withdrawn, which is what makes a
 * mis-tap survivable in a record meant to last a lifetime.
 */
export function withdrawEventRecord(
  event: RecordId,
  reason: string,
  moment: CorrectionMoment,
  id: RecordId = newRecordId(),
): CorrectionRecord {
  const build = createRecordFactory({ zone: moment.zone, provenance: LIFE_PAGE_PROVENANCE })
  return build(
    'correction',
    {
      occurredAt: moment.now,
      ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
      id,
    },
    { corrects: event, reason },
  )
}

/**
 * Moving an entry to the day it actually happened — F32.
 *
 * The second of the three things routing 83 found no route to. It is a
 * supersession rather than an edit: the same record, dated correctly, with the
 * original left standing underneath it exactly as written.
 *
 * `occurredAt` moves and `recordedAt` does not — that is the whole distinction
 * the envelope has carried since Phase 1 and the reason this is expressible at
 * all. When it happened has been corrected; when it was written down has not,
 * and rewriting that would be the app lying about its own memory.
 *
 * **Backfilling an entry that was never recorded is deliberately not here.**
 * D-165 puts authoring a historical event in the later Reach package with
 * AUD-0050's retraction half, and the grammar precedes the authoring surface
 * rather than waiting for it.
 */
export function redateEventRecord(
  event: CanonicalRecord,
  to: LocalDayId,
  moment: CorrectionMoment,
  id: RecordId = newRecordId(),
): CanonicalRecord {
  const local = localDateTimeAt(event.occurredAt, event.zone)
  const moved = instantAtLocal(
    {
      ...civilDateFromDayId(to),
      hour: local.hour,
      minute: local.minute,
      second: local.second,
    },
    event.zone,
  )
  return {
    ...event,
    id,
    occurredAt: moved,
    // When it was written down is a fact about the app's memory and is not
    // being corrected. Only the day it is about has moved.
    recordedAt: moment.recordedAt ?? event.recordedAt,
    supersedes: event.id,
  }
}

/**
 * Which entries an owner may correct as **events**.
 *
 * The things that either happened or did not: what he did, what came of it, and
 * what he told the app about somebody. A reading is corrected as a current
 * fact, which is a different gesture with a different consequence, and a
 * conclusion is corrected as a learned interpretation.
 */
export const CORRECTABLE_EVENT_KINDS: readonly CanonicalRecord['kind'][] = [
  'action-start',
  'action-completion',
  'action-decline',
  'action-unable-now',
  'outcome',
  'relationship-event',
  'domain-update',
]

export function isCorrectableEvent(record: CanonicalRecord): boolean {
  return CORRECTABLE_EVENT_KINDS.includes(record.kind)
}

// ---------------------------------------------------------------------------
// The private permission — D-167, F30, package 6
// ---------------------------------------------------------------------------

/**
 * The owner granting or withdrawing a standing permission.
 *
 * A record rather than a setting, for the reason every other decision in this
 * product is a record: a permission is a thing he said, with a date on it, and
 * a settings object would be a second store of truth that a restore could
 * quietly lose (section 29).
 *
 * The statement is taken from the permission's own definition rather than
 * composed here, so what Timeline shows and what the control promises are the
 * same sentence — D-175's rule, applied to a permission instead of to a
 * discretion promise.
 */
export function permissionRecord(
  permission: PermissionId,
  granted: boolean,
  moment: CorrectionMoment,
  id: RecordId = newRecordId(),
): PermissionRecord {
  const definition = permissionDefinition(permission)
  const build = createRecordFactory({ zone: moment.zone, provenance: LIFE_PAGE_PROVENANCE })
  return build(
    'permission',
    {
      occurredAt: moment.now,
      ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
      id,
      domains: [DOMAIN.privateHealth],
      /*
       * `sensitive`, not `private`.
       *
       * What he permitted is not itself an intimate fact, and classing it
       * `private` would hide the row that says what the app is allowed to do
       * behind the very setting it governs. The Data screen and Timeline are
       * entitled to show that a permission changed and when.
       */
      privacy: 'sensitive',
    },
    {
      permission,
      granted,
      statement: granted ? definition.granted : definition.withheld,
    },
  )
}
