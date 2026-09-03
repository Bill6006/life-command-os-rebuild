import {
  CONCEPT,
  coreConcepts,
  type ConceptDefinition,
  type ConceptRegistry,
} from '../domain/concepts'
import { coreDomains, DOMAIN, type DomainRegistry, type LifeDomainId } from '../domain/domains'
import type { EntityIndex, EntityRef, SemanticEntity } from '../domain/entities'
import type { RecordId } from '../domain/ids'
import {
  basisOf,
  confidence,
  explicit,
  inferred,
  isUsable,
  mapKnowledge,
  unknown,
  type Confidence,
  type Knowledge,
} from '../domain/knowledge'
import {
  bearsConcept,
  discreetly,
  type CommitmentWindowSource,
  type DecisionContext,
  type FactValue,
} from '../domain/records'
import { occursOn } from '../domain/schedule'
import { mayReasonFrom, type PermissionState, type PrivacyClass } from '../domain/privacy'
import type { ActionVerb, RecommendationSemantics } from '../domain/recommendation'
import {
  addLocalDays,
  blockOf,
  civilDateFromDayId,
  DAY_BLOCKS,
  instantAtLocal,
  localDateTimeAt,
  localDayIdAt,
  localDaysBetween,
  localWeekIdAt,
  type DayBlock,
  type Instant,
  type IsoWeekday,
  type LocalDayId,
  type LocalWeekId,
  type TimeZoneId,
  type WeekStartDay,
} from '../domain/time'
import type { ConceptId } from '../domain/windows'
import type { MemoryView } from '../memory/view'
import { assembleCoverage, type CoverageState } from './coverage'
import { collectRoutines, type RoutineShape } from './routines'
import { nightsToRepay } from './recovery'
import { spacingFor, type Spacing } from './spacing'
import { LOAD_WINDOW_DAYS, readWeekLoad, type LoadEvidence, type WeekLoad } from './rhythm'
import { readTrajectories, type Trajectory } from './trajectory'
import {
  describeGoalTrajectory,
  resolveDirection,
  type ActiveGoal,
  type DirectionState,
  type GoalHorizon,
  type GoalPart,
} from './direction'
import { buildLearning, type LearningIndex } from './learning'
import { activeThreads, type ActiveThread } from './threads'
import { collectEpisodes, type Episode, type MoveState } from './lifecycle'
import type { MoveProfile } from './moves'
import {
  booleanValue,
  entityValue,
  hoursValue,
  minutesValue,
  narrowKnowledge,
  ratioValue,
} from './values'
import { decisionEntities, horizonWord, withinPhrase } from './vocabulary'

/**
 * The context assembler (canonical plan section 17.1, step 2).
 *
 * "Builds the current situation from durable and temporary context." Everything
 * here is derived from resolved facts plus the moment being asked about. There
 * is no clock in this file and no storage — a situation is a pure function of a
 * memory view and an instant, which is what lets the whole engine be tested,
 * time-travelled and replayed.
 *
 * Two habits run through it.
 *
 * **Every read is recorded.** The reader below logs each concept it touches and
 * what it was needed for, so the decision trace's list of considered facts is
 * produced by the act of considering them. A trace assembled separately would
 * eventually disagree with the reasoning it claims to describe.
 *
 * **Nothing manufactures a value.** Strain, usable time and capacity are all
 * `Knowledge`. When the evidence is not there, the answer is unknown with a
 * reason — never a zero, an average or a cautious default (G-009).
 */

export type { DayBlock }

/**
 * How much the body is asking for, as far as the evidence shows.
 *
 * Deliberately three coarse steps. Section 68 asks for reversible rules and no
 * invented precision, and a "sleep debt index" to two decimal places would be
 * exactly the false precision the plan warns about.
 */
export type Strain = 'severe' | 'moderate' | 'none'

/**
 * A working baseline for a night's sleep, not a diagnosis.
 *
 * The adult consensus recommendation is at least seven hours; 7.5 sits inside
 * the usual 7–9 band without pretending to know this owner's own need. Section
 * 68 — prefer reversible rules, and do not use causal language where only an
 * association exists. Phase 3's outcome learning is what should replace this
 * with something earned from what actually happens to this owner.
 */
export const SLEEP_BASELINE_HOURS = 7.5

/** How far back a running sleep shortfall is accumulated, in owner-local days. */
/**
 * When the body is asking for an easier day.
 *
 * Read by two places that must agree: this file raises the `capacity` limiter
 * at it, and `candidates.ts` proposes a recovery move at it. A limiter the app
 * names on screen while the generator that would answer it stays quiet is
 * DEF-0016's shape exactly, and two copies of one threshold is how that happens
 * without anybody deciding it (AUD-0003).
 */
export const SORE_ENOUGH_TO_EASE_OFF = 0.7

/**
 * How much has to be on his mind before it is what is in the way — D-166.
 *
 * The same shape and the same height as `SORE_ENOUGH_TO_EASE_OFF`, and for the
 * same reason: 4 of 5 is where a man stops describing a thing as background and
 * starts describing it as the problem. Set lower it would fire on an ordinary
 * Tuesday and the limiter would stop meaning anything; set higher it would only
 * ever catch the evenings he was not going to start anything on anyway.
 *
 * **It is a threshold on one reading, not a score.** Nothing sums it with
 * strain, nothing ranks by it, and it produces a sentence about what is in the
 * way rather than a number about him.
 */
export const LOADED_ENOUGH_TO_LIMIT = 0.7

export const SLEEP_DEBT_DAYS = 3

/**
 * Below this, the clock is what is in the way.
 *
 * Named rather than typed inline because AUD-0004 gave it a second reader: the
 * figure it is applied to is now the smaller of what the owner said and what
 * the day allows, and two copies of the threshold would eventually disagree
 * about which of the two counts as short.
 */
export const SHORT_ENOUGH_TO_LIMIT = 20

export interface ConsideredFact {
  readonly concept: ConceptId
  readonly label: string
  readonly domain: LifeDomainId
  readonly privacy: PrivacyClass
  readonly state: Knowledge<FactValue>['state']
  /** The value, or the flavour of not knowing. Withheld by surfaces if private. */
  readonly reading: string
  readonly usedFor: readonly string[]
  readonly sources: readonly RecordId[]
}

/**
 * What is actually in the way, in the order the situation is read.
 *
 * `coverage` is Phase 4's addition and it sits last on purpose. A man nine
 * hours short of rest has a recovery problem whatever the app has not heard
 * about lately, and a twenty-minute evening is a harder constraint than a quiet
 * fortnight. Stale coverage is a real limiter and the weakest of the four:
 * it is the app's own blind spot rather than a fact about the owner's night.
 */
export type LimiterKind = 'recovery' | 'capacity' | 'time' | 'coverage'

export interface Limiter {
  readonly kind: LimiterKind
  readonly domain: LifeDomainId
  /**
   * What to call this on screen, in the owner's words.
   *
   * It travels with the limiter rather than being chosen by whichever surface
   * happens to render it, because the honest label depends entirely on the
   * kind. "What is in the way" is right for a body that needs rest, a night
   * that is nearly over, a shoulder that hurts — things that genuinely obstruct
   * an evening. It is wrong for a quiet life area, which obstructs nothing: it
   * is the app's own blind spot, and D-063 says so in as many words. The
   * ranking already knew that and scored it zero; the screen was calling it an
   * obstacle anyway.
   *
   * Deliberately not one universal label either. Replacing "what is in the way"
   * with something vague enough to cover both would make it wrong for the three
   * kinds it was right for.
   */
  readonly label: string
  /** One ordinary line. No clinical language, no scores. */
  readonly summary: string
  readonly evidence: readonly RecordId[]
  readonly certainty: Confidence
}

/**
 * Whether a move answers what is in the way — QA-81-006.
 *
 * One definition, in one place, because there are now three callers and two of
 * them are in different layers: `bottleneckFit` scores it, `applyConstraints`
 * protects it, and the acceptance invariant sweeps for it. Two copies of this
 * rule would eventually disagree, and the way they would disagree is that the
 * filter would remove something the evaluator thought was the only good answer.
 *
 * Only `recovery` and `capacity` have an answer of this shape. `time` is
 * answered by fitting the time rather than by a kind of move, and `coverage` is
 * the app's own blind spot rather than an obstacle at all (D-063) — the
 * dimension scores it zero either way, so there is nothing here to protect.
 */
export function answersLimiter(limiter: Limiter | undefined, profile: MoveProfile): boolean {
  if (limiter === undefined) return false
  if (limiter.kind !== 'recovery' && limiter.kind !== 'capacity') return false
  return profile.demand === 'restorative'
}

/** What each kind of limiter is called where the owner reads it. */
export const LIMITER_LABEL: Record<LimiterKind, string> = {
  recovery: 'What is in the way',
  capacity: 'What is in the way',
  time: 'What is in the way',
  // Not an obstacle and not a judgement about him — a gap in what the app has
  // been told, named as one.
  coverage: 'Out of date',
}

/**
 * A stretch of the owner's day that is already spoken for — AUD-0004.
 *
 * Resolved to instants on the day being decided, from a `commitment-window`
 * record that stores a rhythm rather than a list of occurrences. The record is
 * the fact ("her school day runs 08:30 to 15:00 on weekdays"); this is what
 * that means about today.
 */
export interface Obligation {
  readonly label: string
  readonly startsAt: Instant
  readonly endsAt: Instant
  /** Whether the span takes the owner's own time, or shapes his day at its edges. */
  readonly whose: 'mine' | 'theirs'
  /**
   * Whose span it is, when the record says — QA-82-001.
   *
   * A `theirs` window names somebody else's hours, and until this was carried
   * the app had no way to ask *whose*. It matters because a person who is
   * occupied is a person who is not here: the standing arrangement says his
   * daughter is with him this week, and her school day says she is not with him
   * between half past eight and three.
   *
   * Empty where the owner entered a window without naming anybody. That stays
   * an honest gap rather than a guess (D-038) — an unattributed span of
   * somebody else's time says nothing about any particular person.
   */
  readonly about: readonly EntityRef[]
  /** Owner-entered, recurring, or from a schedule the app was given. */
  readonly knownFrom: CommitmentWindowSource
  readonly source: RecordId
}

/**
 * How much time there actually is, which is not the same as how much he said.
 *
 * The audit's example is 07:15 on a school morning: the owner has answered "an
 * hour" about the morning, and there are twenty minutes before the school run.
 * Both are true and only one of them is what he has. So this is the smaller of
 * the two, and it carries **which** of the two it is, so a sentence can say
 * *why* the time is short rather than only that it is.
 *
 * `before` is set only when the obligation is the binding constraint. Where the
 * owner's own answer is the shorter figure this is undefined, and the copy
 * above it stays the copy it always was.
 */
export interface TimeInHand {
  readonly minutes: Knowledge<number>
  readonly before: Obligation | undefined
}

/**
 * A part of today that has not happened yet, and how much of it is his.
 *
 * The half of AUD-0004 that makes AUD-0024 reachable. `hold` — the verb that
 * says *not this, because something better is coming later* — has been in the
 * vocabulary since Phase 1 with a full move profile and templates, and nothing
 * generated it, because deferring needs a model of later blocks and there was
 * not one. This is that model, and it is deliberately coarse: which blocks are
 * still ahead today, and how many minutes of each are not already spoken for.
 *
 * `free` is what stops the app deferring something into a block the owner does
 * not have. Naming a later block he is working through would be exactly the
 * confident wrongness the whole finding is about.
 */
export interface LaterBlock {
  readonly block: DayBlock
  readonly from: Instant
  readonly to: Instant
  /** Minutes of it not taken by an obligation of his own. */
  readonly free: number
}

export interface Capacity {
  readonly lastNightHours: Knowledge<number>
  readonly sleepDebtHours: Knowledge<number>
  readonly nightsSeen: number
  readonly energy: Knowledge<number>
  readonly soreness: Knowledge<number>
  /**
   * How hard the day itself has been pulling — S2 Tier 2, `work.strain`.
   *
   * Carried beside the others rather than folded into one number, for the same
   * reason `soreness` is: they are different facts about the same person and
   * the surfaces have to be able to tell the owner which one is in the way.
   * {@link Capacity.strain} is where they meet, and it is one reading with a
   * confidence rather than a total.
   */
  readonly workStrain: Knowledge<number>
  /**
   * How much is on his mind — D-166's mental-overload dimension.
   *
   * Deliberately **not** an input to {@link Capacity.strain}. Strain is a claim
   * about a body's capacity to spend effort, built on sleep shortfall and how
   * much is left in the tank; mental load is a different thing, and summing
   * them would be the wellness score D-166 exists to prevent. It is read by the
   * limiter, which is a statement about what is in the way rather than a number
   * anything is ranked by.
   */
  readonly overwhelm: Knowledge<number>
  /**
   * How the last night actually went — DEF-0156's reader, AUD-0009.
   *
   * Carried beside the hours rather than folded into them, because they are two
   * facts: eight hours of broken sleep is not eight hours of rest, and only one
   * of the two is a duration. {@link Capacity.strain} is where they meet.
   */
  readonly sleepQuality: Knowledge<number>
  readonly strain: Knowledge<Strain>
  /**
   * How many quiet nights the shortfall implies, or nothing — AUD-0009, C8.
   *
   * `undefined` where one night is the honest answer, and where the app cannot
   * read a shortfall at all. Two or three otherwise, from his own hours and his
   * own answers about how the nights went — never from a study, which §13C
   * forbids from determining a recommendation.
   *
   * It is a **span**, not a forecast. Nothing here says what the run will do
   * for him.
   */
  readonly recoveryNights: number | undefined
}

export interface OwnerPreference {
  readonly about: EntityRef
  readonly stance: 'prefers' | 'avoids' | 'forbids'
  readonly statement: string
  readonly source: RecordId
  /**
   * Which life areas it was filed under, so a Life page can list and lift it.
   *
   * A veto the owner cannot find again is worse than none (AUD-0050), and the
   * page that shows an area is where he would look for a rule about it.
   */
  readonly domains: readonly LifeDomainId[]
}

/**
 * When a named person was last actually in the record — AUD-0047.
 *
 * Built from `relationship-event` records, which carry an entity, a nature and
 * an optional `quality`. **Quality is carried and may only ever suppress.** It
 * may hold a suggestion back and it may never order people, label anyone as
 * good or bad for the owner, or reach an owner-visible sentence about a named
 * person. One strained interaction is not a strained relationship, so what is
 * carried is whether the **most recent** contact went badly rather than any
 * summary over the history of it.
 */
export interface ContactRecency {
  readonly entity: EntityRef
  readonly label: string
  readonly lastAt: Instant
  readonly daysSince: number
  readonly occasions: number
  /** Whether the last contact recorded went badly. Suppresses; never ranks. */
  readonly lastWasStrained: boolean
  readonly source: RecordId
}

export interface ActiveConstraint {
  readonly concept: ConceptId
  /**
   * The areas the constraint was recorded about — DEF-0168.
   *
   * Carried because C21's enforcement needs it. A standing blocker's concept is
   * `blocker.<cause>.<objectId>`, scoped to the **object** and not to the move,
   * and one object can be the subject of moves in two areas: *"take tonight as
   * recovery — no subnetting session"* is a **sleep** move whose object is a
   * career topic. Without the area, saying *"I haven't got what I need"* about
   * reviewing subnetting removed the move that says not to review subnetting.
   */
  readonly domains: readonly LifeDomainId[]
  readonly description: string
  /** When it was said. A derived reading of it has to be able to cite a moment. */
  readonly at: Instant
  readonly source: RecordId
}

export interface PriorMove {
  readonly semantics: RecommendationSemantics
  readonly at: Instant
  readonly source: RecordId
  readonly state: MoveState
}

export type { MoveState }

export interface Situation {
  readonly at: Instant
  readonly zone: TimeZoneId
  readonly dayId: LocalDayId
  readonly weekId: LocalWeekId
  readonly weekStartsOn: WeekStartDay
  readonly block: DayBlock
  readonly isWeekend: boolean
  /** The comparable shape of this moment, for learning and for the record. */
  readonly context: DecisionContext
  readonly capacity: Capacity
  /**
   * How heavy the last seven days have been — AUD-0007.
   *
   * A reading of the record rather than a question, and the app's answer to the
   * brief's *"does anything model 'this is a bad week'?"*, which was no. It goes
   * onto {@link Situation.context}, so an evening is compared to evenings in
   * weeks that were like it — and it produces at most one plain sentence, which
   * is the most humane thing the app could not previously say.
   *
   * **Nothing is ranked by it.** It is a comparison feature and a sentence; no
   * dimension reads it, and a heavy week does not make a move score higher or
   * lower. Turning "he has had a hard week" into a number that moves a
   * recommendation is the wellness score section 22 forbids.
   */
  readonly weekLoad: Knowledge<WeekLoad>
  /** What the week's reading counted, so a sentence can cite it. */
  readonly weekLoadEvidence: LoadEvidence
  /**
   * What each tracked reading has been doing over months — AUD-0029, S1b.
   *
   * The app's longest reasoning horizon was one night. `insights.ts` computed
   * exactly this and no decision could read it, which is the audit's own
   * summary: *"already produce exactly that, unconnected to any decision."*
   *
   * Keyed by concept, computed once, and read by two things that must not
   * disagree — the trajectory card, and `trajectory-fit` in the evaluator. It is
   * a **reading**, not a judgement: what the numbers did, never why.
   */
  readonly trajectories: ReadonlyMap<ConceptId, Trajectory>
  /** What the owner said he has. Unchanged, and no longer the whole story. */
  readonly usableMinutes: Knowledge<number>
  /** Everything spoken for on the owner-local day being decided, in order. */
  readonly commitments: readonly Obligation[]
  /** The next one that has not started yet — AUD-0004. */
  readonly nextObligation: Obligation | undefined
  /** How long until it. Zero while one is under way; unknown with none. */
  readonly minutesUntilNextObligation: Knowledge<number>
  /**
   * The smaller of what he said and what the day allows — AUD-0004.
   *
   * Everything that used to read `usableMinutes` reads this instead: the time
   * limiter, `time-fit`, `opportunity-cost` and the size a move is trimmed to.
   * `usableMinutes` stays exactly what it was — the owner's own answer — so the
   * two can be told apart wherever it matters.
   */
  readonly inHand: TimeInHand
  /** The parts of today still ahead, and how much of each is his — AUD-0004. */
  readonly laterToday: readonly LaterBlock[]
  /**
   * What the record says about whether she is with the owner.
   *
   * A standing arrangement, in every history the app has: a durable `context`
   * saying she is with him, asked once and never re-asked (G-002). It is the
   * answer to *whose week is this*, and it is **not** the answer to *is she in
   * the room right now* — see {@link Situation.childHere}.
   */
  readonly childPresent: Knowledge<boolean>
  /**
   * Whether she is actually here, this hour — QA-82-001.
   *
   * The two questions were one field, and the moment Phase 82 gave the app a
   * school day the two meanings visibly disagreed: at ten o'clock on a
   * Wednesday, inside a recorded 08:30-to-15:00 window, Now said *"Adaya is
   * here"* and offered thirty unhurried minutes with her. Both halves came from
   * the same durable boolean, and the fixture's own commentary called that hour
   * "once the house is quiet".
   *
   * So this is the standing arrangement narrowed by her own day: she is here
   * when the record says she is with him **and** no span of her own covers this
   * moment. The obligation is part of its basis, so the filter that removes a
   * move about her, and the evidence panel that explains why, both cite the
   * thing that actually decided it.
   *
   * **It never invents presence.** An unknown arrangement stays unknown and a
   * stated absence stays absent: an obligation can only ever take her out of
   * the room, never put her in it.
   */
  readonly childHere: Knowledge<boolean>
  /**
   * The span that took her out of the room, when one did — QA-82-001.
   *
   * Carried rather than re-derived, because three surfaces need it and a
   * fourth will: the filter says why the move was removed, the premise says
   * where she is, and the evidence panel cites the span the reading rests on.
   * Three separate searches through `commitments` would eventually name three
   * different spans.
   */
  readonly childElsewhere: Obligation | undefined
  /**
   * An evening she is away when she is usually here — AUD-0019.
   *
   * The finding is two failures with one cause, and this is the second: when
   * `childPresent` reads false the fatherhood generator returns nothing and
   * **no other generator is told that anything has changed**. So the three
   * evenings a month a full-custody father has to himself — the highest-value
   * free time he gets — read *"Nothing to suggest just yet."*
   *
   * True only where the record makes it unusual: a **durable** arrangement in
   * force saying she is with him, and a reading right now saying she is not. An
   * arrangement the app has never been told about produces nothing here, because
   * an evening cannot be unusual against a pattern nobody has recorded (G-009).
   *
   * **It is an opening, and it is never a relief.** Section 4.4 forbids framing
   * parenting time as lost productivity, and the inverse framing is the same
   * mistake facing the other way. What this changes is the urgency of things he
   * has said he is working towards, and what the app is allowed to say about it
   * is one clause naming the evening rather than the absence.
   */
  readonly awayUnusually: boolean
  /**
   * Courses of action under way, and the ones that have stopped — AUD-0020.
   *
   * Every thread in the record, not only the live ones: Life lists what has
   * been paused and what has expired, and a second read of the same history to
   * find them would be a second answer to the same question. `live` on each one
   * is what decides whether it pulls.
   */
  readonly threads: readonly ActiveThread[]
  readonly socialEnergy: Knowledge<number>
  /**
   * Whether being around people would help — D-166, via AUD-0013.
   *
   * A different question from {@link Situation.socialEnergy}, and keeping them
   * apart is the finding. Social energy is *do I feel like people right now*,
   * and the generator has only ever fired when he had already said yes — so the
   * domain could confirm an appetite he reported and never notice one he had
   * not. This is *would company help*, which is a thing a person can want
   * without feeling like it, and it is the only reading that lets the social
   * domain say something he did not already know.
   */
  readonly needForCompany: Knowledge<number>
  /**
   * Whether he is free to leave — S2 Tier 1's supervision concept, C21's half.
   *
   * Worked out from the constraints in force rather than asked. D-187 already
   * captures *"can't leave — someone's in my care"*; what it had nowhere to put
   * the answer was a concept, so the constraint it wrote named something the
   * registry had never heard of and no move could be matched against it.
   *
   * **Unknown is unknown** (G-009): no constraint means the app has not been
   * told he must stay, which is not the same as being told he may leave.
   */
  readonly mustStay: Knowledge<boolean>
  /**
   * Whether movement has already happened today — S2 Tier 2, and observed.
   *
   * From a completed movement episode on this owner-local day. Nothing is asked
   * and nothing new is stored: the app watched him finish it.
   */
  readonly trainedToday: Knowledge<boolean>
  /**
   * People the record has seen him with lately — AUD-0047, reach not capture.
   *
   * The relationship graph already exists and only the QA laboratory reads it.
   * This carries the part a decision can honestly use: who there is real
   * evidence of contact with, and when it last happened.
   */
  readonly peoplePresent: readonly ContactRecency[]
  /**
   * The movement routines the owner has named, with the shapes he gave them —
   * AUD-0045.
   *
   * On the situation because the candidate's profile is resolved from it, and
   * the audit's precondition is that the profile becomes keyed on (verb,
   * object) before a second routine can safely participate. Empty on every
   * history that has never named one, which is every history that shipped
   * before this phase — so nothing already in the library moves.
   */
  readonly routines: readonly RoutineShape[]
  readonly homeFriction: Knowledge<FactValue>
  readonly learningTopic: Knowledge<FactValue>
  /**
   * When the current topic was last gone over, and whether it is due — AUD-0010.
   *
   * `undefined` where there is no current topic to be about. The interval is a
   * share of the days until the goal he set, or a conservative default where he
   * has not said when — his own figures either way, never a population claim
   * (§13C).
   *
   * A reading on the situation rather than a lookup inside the generator, for
   * AUD-0040's reason: the trace lists what the decision read, and a generator
   * reaching round the situation for a fact is exactly the shortcut that made
   * *"Facts considered: 9"* stand against fifteen beliefs.
   */
  readonly studySpacing: Spacing | undefined
  readonly direction: DirectionState
  /** How well each life area is currently understood (section 8). */
  readonly coverage: CoverageState
  readonly limiter: Limiter | undefined
  readonly preferences: readonly OwnerPreference[]
  readonly constraints: readonly ActiveConstraint[]
  /**
   * What the owner has allowed the app to reason from — D-167.
   *
   * On the situation rather than reached for, because it decides what the
   * situation could read: a surface that wants to show the control needs the
   * same answer the fact reader used, and two reads of the same history is two
   * answers waiting to disagree.
   */
  readonly permissions: PermissionState
  readonly recentMoves: readonly PriorMove[]
  /**
   * Moves already put in front of the owner today, handed down by the surface.
   *
   * Read by `recent-duplication` and by nothing else. The architecture guard
   * fails the build if `learning.ts`, `insights.ts`, `association.ts` or the
   * Timeline reaches it: ignoring a suggestion is the most common response
   * there is, and it is not an outcome, not an episode, and not evidence about
   * whether a move works.
   */
  readonly shown: readonly ShownMove[]
  /** What this owner's own outcomes have taught the engine (section 20). */
  readonly learning: LearningIndex
  readonly considered: readonly ConsideredFact[]
  /**
   * Every registered concept, as this decision read it — AUD-0040.
   *
   * The named fields above are narrowed views of rows in here. Anything in the
   * decision layer that wants a reading takes it from this map, and the
   * architecture guard makes that the only way to get one.
   */
  readonly readings: ConceptReadings
  readonly entities: EntityIndex
  readonly domains: DomainRegistry
  readonly concepts: ConceptRegistry
  readonly view: MemoryView
}

/**
 * A move the surface has already put in front of the owner today — AUD-0025.
 *
 * **Plain data on the moment, and that placement is the whole design.** D-043
 * settled that nothing is written when a screen renders: a row per render would
 * be unreadable within a week, would poison the duplication check, and would
 * become learning evidence about an evening nothing happened in. That reasoning
 * is untouched and this is not a record — it is a session-scoped, non-durable
 * note the *surface* keeps and hands down, so it never reaches backup, Timeline
 * or the learning index.
 *
 * It arrives as an argument because `src/intelligence/` is pure and clock-free
 * (`docs/ARCHITECTURE_BOUNDARIES.md`): the moment is an argument so that time
 * travel reaches the engine rather than stopping at the screen that offers it,
 * and a lookup reached for from inside the engine would breach that invisibly —
 * it is not a directory violation, so the existing guard would not fire.
 */
export interface ShownMove {
  /** The candidate's own id, which is `generator/verb/object`. */
  readonly move: string
  readonly dayId: LocalDayId
  /** When it was last put on screen. */
  readonly at: Instant
  /** How many separate moments it has been put there. */
  readonly count: number
}

/**
 * Every concept the registry knows, as the decision read it — AUD-0040.
 *
 * ## The asymmetry this closes
 *
 * `assembleSituation` was a hand-written list of nine reads. Adding a concept
 * to the registry, giving it a domain page and giving it a coverage entry were
 * all registry-driven and cheap; giving it a **read** was a code change in this
 * file plus `Situation`'s interface plus every consumer. So the cheap half
 * tracked eleven domains and the expensive half stopped at seven, and the QA
 * laboratory reported *"Facts considered: 9"* against *"What the system
 * believes: 15"* — six beliefs the app held, absent from its own account of
 * what the decision rested on, and one of them (`cashBuffer`) had decided it.
 *
 * ## What it is, and what it is not
 *
 * It is the true set: one entry per registered concept, in registry order, read
 * once, through the same reader that records what each was used for. A concept
 * cannot be added to the registry now without being visible to the brain and to
 * the trace, which is what makes *"one brain, whole life"* structural rather
 * than dependent on somebody remembering to add a line.
 *
 * It is **not** a replacement for the named fields. `usableMinutes`,
 * `childPresent`, `capacity` and the rest are strongly typed, already narrowed,
 * and read on every hot path; they stay exactly what they were and are now
 * *derived from this map* rather than read separately. The audit asked for the
 * addition to be pure and for behaviour to change in a different commit, and
 * that is what this is.
 *
 * ## Reading it is how the decision layer reads a fact
 *
 * `tests/unit/architecture-guards.test.ts` fails the build if anything in
 * `src/intelligence/` other than this file resolves a concept from
 * `view.facts`. That single guard is what would have stopped the `cashBuffer`
 * shortcut, and it is what keeps the trace complete by construction: a
 * generator cannot decide from a fact the trace does not list, because the only
 * place it can get one is here.
 */
export interface ConceptReadings {
  /**
   * What is known about this concept, for the decision being made.
   *
   * An unregistered concept resolves through {@link ConceptRegistry.definitionFor}'s
   * cautious fallback rather than throwing, and is read on demand — synthetic
   * fixtures invent concepts on purpose and a legacy import will eventually
   * bring in ones this version has never heard of.
   */
  get(concept: ConceptId): Knowledge<FactValue>
  /** Every concept read, in registry order. */
  readonly concepts: readonly ConceptId[]
}

export interface SituationMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  readonly weekStartsOn: WeekStartDay
  /** What the surface has already shown today, if it is keeping count. */
  readonly shown?: readonly ShownMove[]
  readonly domains?: DomainRegistry
  readonly concepts?: ConceptRegistry
}

// ---------------------------------------------------------------------------
// Reading facts, and remembering that we did
// ---------------------------------------------------------------------------

interface FactReader {
  read(concept: ConceptId, usedFor: string): Knowledge<FactValue>
  /**
   * Record something the app worked out rather than something it was told —
   * QA-82-001.
   *
   * No record carries a derived concept, so `read` would resolve it to
   * `unknown` forever and the surfaces that list what the decision considered
   * would leave out the readings the decision actually turned on. The reading
   * text is supplied rather than rendered from the value, because a conclusion
   * is worth stating with the thing it rests on: "no — her school day is on
   * until 15:00" is the useful row, and "no" is not.
   */
  derive(
    concept: ConceptId,
    knowledge: Knowledge<FactValue>,
    reading: string,
    usedFor: string,
  ): void
  considered(): readonly ConsideredFact[]
}

function createFactReader(
  view: MemoryView,
  entities: EntityIndex,
  concepts: ConceptRegistry,
  permissions: PermissionState,
): FactReader {
  const seen = new Map<ConceptId, { entry: ConsideredFact; usedFor: string[] }>()

  return {
    read(concept, usedFor) {
      const definition = concepts.definitionFor(concept)
      /*
       * The structural half of D-167, and it is structural on purpose.
       *
       * The owner's permission is **off** until he says otherwise, and while it
       * is off the decision layer cannot read a private reading at all. Not
       * "reads it and declines to use it" — there is no value to be careless
       * with, and no path from here to a ranking, an explanation or an evidence
       * panel, because the thing that would travel down them does not exist.
       *
       * `withheld` rather than `never-observed`: the record holds the answer and
       * the Private page shows it. What is absent is permission, not evidence,
       * and the two must not read as the same thing.
       */
      const readable = mayReasonFrom(definition.privacy, permissions)
      const knowledge = readable
        ? view.facts.knowledgeFor(concept)
        : unknown('withheld', 'the owner has not allowed this to influence recommendations')

      /*
       * A reading the decision could not see is not a fact it considered —
       * AUD-0040's own exposure, caught by the export's honesty test.
       *
       * The audit says plainly that making the situation registry-driven is
       * **what creates the private-data exposure**: the moment every concept is
       * read, the private area's own reading lands in every decision's fact
       * list, and the list is printed by the QA ledger and by the export.
       * `export-honesty` failed the instant the sweep landed, with a
       * private-off document naming the private area in a line the owner never
       * asked for.
       *
       * The fix is not a filter at each of the surfaces that print it. It is
       * that the claim was false: while the permission is off the decision is
       * **structurally unable** to read this (D-167), so listing it among the
       * things the decision rested on is the app saying it weighed something it
       * could not see. Nothing is hidden by this — there was nothing there.
       *
       * Granting the permission puts the row back, discreetly: the reading
       * renders as `discreetPlaceholder` at the single site below, so the row
       * says the app read something here and never says what.
       */
      if (!readable) return knowledge

      const existing = seen.get(concept)
      if (existing !== undefined) {
        if (!existing.usedFor.includes(usedFor)) existing.usedFor.push(usedFor)
        return knowledge
      }

      const usedForList = [usedFor]
      seen.set(concept, {
        usedFor: usedForList,
        entry: {
          concept,
          label: definition.label,
          domain: definition.domain,
          privacy: definition.privacy,
          state: knowledge.state,
          /*
           * And the value never becomes a string, even when it may be read.
           *
           * D-167 requires that it stay **structurally** impossible for an
           * explanation or an evidence panel to render an explicit private
           * reading, and every one of them renders from this field. So a
           * private concept's reading is the placeholder here, at the one place
           * the rendering happens, rather than at each of the surfaces that
           * would have to remember.
           */
          reading:
            knowledge.state === 'unknown'
              ? `not known — ${knowledge.reason}`
              : discreetly(definition.privacy, knowledge.value, (ref) => entities.labelFor(ref)),
          usedFor: usedForList,
          sources: basisOf(knowledge),
        },
      })
      return knowledge
    },
    derive(concept, knowledge, reading, usedFor) {
      const definition = concepts.definitionFor(concept)
      seen.set(concept, {
        usedFor: [usedFor],
        entry: {
          concept,
          label: definition.label,
          domain: definition.domain,
          privacy: definition.privacy,
          state: knowledge.state,
          reading,
          usedFor: [usedFor],
          sources: basisOf(knowledge),
        },
      })
    },
    considered: () => [...seen.values()].map((held) => held.entry),
  }
}

/**
 * Every registered concept, read once, in registry order — AUD-0040.
 *
 * The whole of what replaced the hand-written list of nine reads. A `derived`
 * concept is skipped here on purpose: no record carries one, so reading it
 * would resolve `unknown` forever and put a permanently-blank row in the
 * decision's own account of itself. Those are worked out further down and
 * written back through {@link FactReader.derive}, which is why the map is
 * mutable while the situation is being assembled and readonly afterwards.
 *
 * `{when}` in a purpose is substituted with the stretch of day being decided,
 * so *"whether she is in your care tonight"* says tonight at eight and this
 * morning at eight.
 */
function readRegistry(
  concepts: ConceptRegistry,
  reader: FactReader,
  block: DayBlock,
): Map<ConceptId, Knowledge<FactValue>> {
  const readings = new Map<ConceptId, Knowledge<FactValue>>()
  for (const definition of concepts.all()) {
    if (definition.derived === true) continue
    readings.set(definition.id, reader.read(definition.id, purposeOf(definition, block)))
  }
  return readings
}

/** A concept's stated use, with the stretch of day filled in. */
function purposeOf(definition: ConceptDefinition, block: DayBlock): string {
  return definition.purpose.replace('{when}', horizonWord(block))
}

/**
 * The map the situation carries, over the readings taken while assembling it.
 *
 * A concept nobody registered still resolves — through the registry's own
 * cautious fallback — because a synthetic fixture inventing a concept is
 * ordinary and a decision layer that threw on one would turn an inspectable
 * oddity into a crash.
 */
function conceptReadings(
  taken: ReadonlyMap<ConceptId, Knowledge<FactValue>>,
  fallback: (concept: ConceptId) => Knowledge<FactValue>,
): ConceptReadings {
  return {
    get: (concept) => taken.get(concept) ?? fallback(concept),
    // Lazily, because the derived readings are written back after this is
    // built and a list snapshotted here would be missing them.
    get concepts() {
      return [...taken.keys()]
    },
  }
}

// ---------------------------------------------------------------------------
// The pieces
// ---------------------------------------------------------------------------

export { blockOf }

interface NightlyReading {
  readonly hours: number
  readonly at: Instant
  readonly source: RecordId
}

/**
 * Sleep readings inside the debt window.
 *
 * Read straight from canonical records rather than from the resolved current
 * value, because a running shortfall is a question about several nights and the
 * fact layer only ever answers about the latest one. Superseded and retracted
 * rows are already gone from `effective`, so a corrected night counts once.
 */
function nightsWithin(view: MemoryView, from: Instant, to: Instant): readonly NightlyReading[] {
  const nights: NightlyReading[] = []
  for (const record of view.history.effective) {
    if (!bearsConcept(record)) continue
    if (record.concept !== CONCEPT.sleepHours) continue
    if (record.occurredAt < from || record.occurredAt > to) continue
    const hours = hoursValue(record.value)
    if (hours === undefined) continue
    nights.push({ hours, at: record.occurredAt, source: record.id })
  }
  return nights
}

function assembleCapacity(
  view: MemoryView,
  moment: SituationMoment,
  readings: ConceptReadings,
): Capacity {
  // From the registry sweep rather than from three reads of its own — AUD-0040.
  // The purposes these used to carry are now on the concepts themselves, which
  // is what let the read move.
  const lastNightHours = narrowKnowledge(readings.get(CONCEPT.sleepHours), hoursValue)
  const energy = narrowKnowledge(readings.get(CONCEPT.energy), ratioValue)
  const soreness = narrowKnowledge(readings.get(CONCEPT.soreness), ratioValue)
  const workStrain = narrowKnowledge(readings.get(CONCEPT.workStrain), ratioValue)
  const overwhelm = narrowKnowledge(readings.get(CONCEPT.overwhelm), ratioValue)
  /*
   * How the night actually went — DEF-0156's reader, and AUD-0009's.
   *
   * Nothing read this. The hours drove the whole recovery model and how the
   * night *felt* was collected, shown, trended on Insights, and consulted by no
   * generator, no dimension and no filter — so `materialToDecision` was set
   * false with a note saying its reader belonged with this phase's recovery
   * work. This is that reader.
   */
  const sleepQuality = narrowKnowledge(readings.get(CONCEPT.sleepQuality), ratioValue)

  const from = addLocalDays(moment.now, -SLEEP_DEBT_DAYS, moment.zone)
  const nights = nightsWithin(view, from, moment.now)

  let sleepDebtHours: Knowledge<number> = unknown(
    'never-observed',
    'no nights recorded in the last few days',
  )
  if (nights.length > 0) {
    const shortfall = nights.reduce(
      (total, night) => total + Math.max(0, SLEEP_BASELINE_HOURS - night.hours),
      0,
    )
    const latest = nights.reduce((best, night) => (night.at > best.at ? night : best))
    sleepDebtHours = inferred(
      Math.round(shortfall * 10) / 10,
      latest.at,
      // Confidence follows the number of nights actually seen, and nothing else.
      confidence(Math.min(0.85, 0.35 + 0.2 * nights.length)),
      nights.map((night) => night.source),
    )
  }

  return {
    lastNightHours,
    sleepDebtHours,
    nightsSeen: nights.length,
    energy,
    soreness,
    workStrain,
    overwhelm,
    sleepQuality,
    strain: assessStrain(sleepDebtHours, energy, workStrain, sleepQuality, nights.length),
    recoveryNights: nightsToRepay(sleepDebtHours, sleepQuality),
  }
}

/**
 * How strained the owner is, from whatever evidence exists.
 *
 * Sleep shortfall leads because it is the signal with a real evidence base
 * behind it. A low self-reported energy reading can raise the assessment but
 * never on its own produce "severe" — one tap on a scale is not enough to claim
 * that much. With no usable evidence at all the answer is unknown, and a rule
 * downstream has to cope with not knowing rather than being handed "none".
 */
function assessStrain(
  debt: Knowledge<number>,
  energy: Knowledge<number>,
  work: Knowledge<number>,
  quality: Knowledge<number>,
  nightsSeen: number,
): Knowledge<Strain> {
  const debtHours = isUsable(debt) ? debt.value : undefined
  const energyLevel = isUsable(energy) ? energy.value : undefined
  const workLevel = isUsable(work) ? work.value : undefined
  const qualityLevel = isUsable(quality) ? quality.value : undefined

  if (
    debtHours === undefined &&
    energyLevel === undefined &&
    workLevel === undefined &&
    qualityLevel === undefined
  ) {
    return unknown('never-observed', 'nothing recent about sleep, energy or work')
  }

  const basis = [...basisOf(debt), ...basisOf(energy), ...basisOf(work), ...basisOf(quality)]
  const observedAt = isUsable(debt)
    ? debt.observedAt
    : isUsable(energy)
      ? energy.observedAt
      : isUsable(work)
        ? work.observedAt
        : isUsable(quality)
          ? quality.observedAt
          : undefined
  if (observedAt === undefined) return unknown('never-observed')

  let level: Strain = 'none'
  if (debtHours !== undefined) {
    if (debtHours >= 5) level = 'severe'
    else if (debtHours >= 2.5) level = 'moderate'
  }
  if (energyLevel !== undefined && energyLevel <= 0.3 && level === 'none') level = 'moderate'
  /*
   * A hard day raises the assessment and never on its own makes it severe —
   * S2 Tier 2, `work.strain`, under the rule the paragraph above already set
   * for energy.
   *
   * Sleep shortfall leads because it is the signal with a real evidence base
   * behind it. One tap on a scale is not enough to claim that much about
   * anybody, whichever scale it is, and this is the third reading to arrive
   * under that rule rather than an exception to it. The threshold is the same
   * as energy's read from the other end: 4 or 5 of 5 is a day he would describe
   * as heavy.
   */
  if (workLevel !== undefined && workLevel >= 0.7 && level === 'none') level = 'moderate'
  /*
   * And a night that was short **and** poor — DEF-0156, AUD-0009.
   *
   * The fourth reading to arrive under the rule the paragraph above sets, and
   * the one the registry has been waiting for: *"the hours are read by
   * `assembleCapacity` and drive the whole recovery model; how the night felt is
   * collected, shown, trended on Insights, and consulted by no generator, no
   * dimension and no filter."*
   *
   * Eight hours of broken sleep is not eight hours of rest, and the hours alone
   * cannot say so. Same threshold as energy read from the same end — 0 or 1 of
   * 5 is a night he would call bad — and the same ceiling: it raises the
   * assessment from `none` and never on its own makes it severe, because one tap
   * on a scale is not enough to claim that much about anybody.
   */
  if (qualityLevel !== undefined && qualityLevel <= 0.3 && level === 'none') level = 'moderate'

  const signals =
    (debtHours === undefined ? 0 : 1) +
    (energyLevel === undefined ? 0 : 1) +
    (workLevel === undefined ? 0 : 1) +
    (qualityLevel === undefined ? 0 : 1)
  const howSure = confidence(0.3 + 0.15 * signals + Math.min(0.25, 0.08 * nightsSeen))
  return inferred(level, observedAt, howSure, basis)
}

/**
 * Everything spoken for on one owner-local day — AUD-0004.
 *
 * Read from `history.effective`, so a corrected schedule supersedes the old one
 * the same way every other correction works, and filtered by `occurredAt` so a
 * commitment entered on Friday does not retroactively fill in Tuesday when a
 * scenario is replayed at Tuesday's hour.
 *
 * The rhythm is stored and the occurrence is derived. `occursOn` lives in
 * `domain/schedule.ts` so that the panel showing the school run and the engine
 * deciding there are twenty minutes before it can never disagree about which
 * days it happens on.
 */
function collectObligations(view: MemoryView, moment: SituationMoment): readonly Obligation[] {
  const dayId = localDayIdAt(moment.now, moment.zone)
  const date = civilDateFromDayId(dayId)
  const out: Obligation[] = []

  for (const record of view.history.effective) {
    if (record.kind !== 'commitment-window') continue
    if (record.occurredAt > moment.now) continue
    if (!occursOn(record.recurrence, dayId)) continue
    if (record.endsAt <= record.startsAt) continue
    out.push({
      label: record.label,
      startsAt: instantAtLocal(
        {
          ...date,
          hour: Math.floor(record.startsAt / 60),
          minute: record.startsAt % 60,
          second: 0,
        },
        moment.zone,
      ),
      endsAt: instantAtLocal(
        { ...date, hour: Math.floor(record.endsAt / 60), minute: record.endsAt % 60, second: 0 },
        moment.zone,
      ),
      whose: record.whose,
      about: record.entities,
      knownFrom: record.knownFrom,
      source: record.id,
    })
  }

  return out.sort((a, b) => a.startsAt - b.startsAt)
}

/**
 * How sure the app is about an obligation, by where it came from — AUD-0004.
 *
 * The provenance is carried from the start precisely so this can differ later
 * without a redesign. Today it barely does: a rhythm the owner described once
 * is slightly less certain about *this* day than something he entered about
 * this day, and a schedule the app was given would be more certain than either.
 * The point is that the difference has somewhere to live.
 */
const OBLIGATION_CERTAINTY: Record<CommitmentWindowSource, number> = {
  'owner-entered': 0.9,
  recurring: 0.8,
  calendar: 0.95,
}

/**
 * How long until the next thing that has to happen.
 *
 * **A span's edges are what constrain the day, and only a span of the owner's
 * own constrains its middle.** Working hours are time he does not have; his
 * daughter's school day is time he mostly does, bracketed by two moments he has
 * to be somewhere. Reading both the same way would have the app fall silent
 * between half past eight and three — the five hours a father with full custody
 * actually has — which is the opposite of the defect AUD-0004 is about.
 *
 * Zero is a real answer rather than a missing one: at half past nine on a
 * working morning there is no time at all, and saying so is more useful than
 * saying the app does not know.
 */
function untilNextObligation(
  obligations: readonly Obligation[],
  now: Instant,
): {
  readonly next: Obligation | undefined
  /** Whichever obligation the figure below is about — the one under way, or the next edge. */
  readonly binding: Obligation | undefined
  readonly minutes: Knowledge<number>
} {
  const occupying = obligations.find(
    (entry) => entry.whose === 'mine' && entry.startsAt <= now && now < entry.endsAt,
  )
  if (occupying !== undefined) {
    return {
      next: obligations.find((entry) => entry.startsAt > now),
      binding: occupying,
      minutes: inferred(0, now, confidence(OBLIGATION_CERTAINTY[occupying.knownFrom]), [
        occupying.source,
      ]),
    }
  }

  // Every edge still ahead: the start of anything not begun, and the end of
  // somebody else's span, which is the moment he has to collect her.
  let soonest: { readonly at: Instant; readonly of: Obligation } | undefined
  for (const entry of obligations) {
    const edges: Instant[] =
      entry.whose === 'theirs' ? [entry.startsAt, entry.endsAt] : [entry.startsAt]
    for (const edge of edges) {
      if (edge <= now) continue
      if (soonest === undefined || edge < soonest.at) soonest = { at: edge, of: entry }
    }
  }

  if (soonest === undefined) {
    return { next: undefined, binding: undefined, minutes: unknown('never-observed') }
  }
  return {
    next: soonest.of,
    binding: soonest.of,
    minutes: inferred(
      Math.max(0, Math.round((soonest.at - now) / 60_000)),
      now,
      confidence(OBLIGATION_CERTAINTY[soonest.of.knownFrom]),
      [soonest.of.source],
    ),
  }
}

/**
 * The smaller of what the owner said and what the day allows — AUD-0004.
 *
 * Neither reading is thrown away and neither is averaged with the other: the
 * app takes the one that binds, and remembers which it was so the sentence
 * above it can name the reason. An obligation only wins ties by being strictly
 * shorter, so a day with nothing coming reads exactly as it did before this
 * existed.
 */
function timeInHand(
  said: Knowledge<number>,
  until: Knowledge<number>,
  binding: Obligation | undefined,
): TimeInHand {
  if (!isUsable(until) || binding === undefined) return { minutes: said, before: undefined }
  if (isUsable(said) && said.value <= until.value) return { minutes: said, before: undefined }
  return { minutes: until, before: binding }
}

/**
 * The current reading, in a sentence rather than a word — QA-82-001.
 *
 * "no" is a true row and a useless one: the owner reading it on the Fatherhood
 * page has no way to tell whether the app thinks she is at her mother's, at
 * school, or simply has nothing recorded. Where a span took her out of the
 * room, the row names the span and when it ends, which is the fact he can act
 * on. Where nothing did, it says what it knows and no more.
 */
function presenceReading(
  here: Knowledge<boolean>,
  person: SemanticEntity,
  because: Obligation | undefined,
  zone: TimeZoneId,
): string {
  if (!isUsable(here)) return `Not known — nothing says whether ${person.label} is here.`
  if (here.value) return `Yes — ${person.label} is here.`
  if (because === undefined) return `No — ${person.label} is not here.`
  return `No — ${because.label} is on until ${endsAtClock(because, zone)}.`
}

/** When a span ends, on the owner's own clock. One definition, four readers. */
export function endsAtClock(obligation: Obligation, zone: TimeZoneId): string {
  return localDateTimeAt(obligation.endsAt, zone).timeOfDay
}

/**
 * Who, if anybody, is somewhere else right now — QA-82-001.
 *
 * Only a span of somebody else's time can take a person out of the room, and
 * only when the record says whose span it is. An obligation of the owner's own
 * says nothing about anybody but him, and an unattributed one says nothing
 * about anybody at all.
 */
function occupiedNow(obligations: readonly Obligation[], now: Instant): readonly Obligation[] {
  return obligations.filter(
    (entry) => entry.whose === 'theirs' && entry.startsAt <= now && now < entry.endsAt,
  )
}

/**
 * The standing arrangement, narrowed by her own day — QA-82-001.
 *
 * **It can only ever subtract.** An unknown arrangement stays unknown, a stated
 * absence stays absent, and no obligation can put somebody in the room. That
 * asymmetry is the whole safety of the reading: the worst it can do is make the
 * app quieter about her, and the thing it prevents is the app claiming she is
 * in a room she is at school from.
 *
 * The obligation joins the basis, so every surface that cites this reading —
 * the filter's reason, the evidence panel, the trace — names the school day
 * rather than the custody record it narrowed.
 */
function narrowedByTheirOwnDay(
  stated: Knowledge<boolean>,
  person: SemanticEntity | undefined,
  occupied: readonly Obligation[],
  now: Instant,
): { readonly knowledge: Knowledge<boolean>; readonly because: Obligation | undefined } {
  if (person === undefined) return { knowledge: stated, because: undefined }
  if (!isUsable(stated) || !stated.value) return { knowledge: stated, because: undefined }

  const elsewhere = occupied.find((entry) =>
    entry.about.some((ref) => ref.id === person.id && ref.kind === person.kind),
  )
  if (elsewhere === undefined) return { knowledge: stated, because: undefined }

  return {
    knowledge: inferred(false, now, confidence(OBLIGATION_CERTAINTY[elsewhere.knownFrom]), [
      ...basisOf(stated),
      elsewhere.source,
    ]),
    because: elsewhere,
  }
}

/**
 * The parts of today still ahead, with the obligations taken out of them.
 *
 * Only blocks that begin after this moment, and only within the same
 * owner-local day: `late-night` spans midnight at its far end, so it is
 * measured to the end of the day rather than into tomorrow. The app has no
 * model of tomorrow and must not acquire one by accident here (AUD-0003's own
 * warning about naming a day it cannot see).
 */
const BLOCK_STARTS_AT: Record<DayBlock, number> = {
  'late-night': 22 * 60,
  'early-morning': 4 * 60,
  morning: 7 * 60,
  afternoon: 12 * 60,
  evening: 18 * 60,
}

const BLOCK_ENDS_AT: Record<DayBlock, number> = {
  'late-night': 24 * 60,
  'early-morning': 7 * 60,
  morning: 12 * 60,
  afternoon: 18 * 60,
  evening: 22 * 60,
}

function collectLaterToday(
  obligations: readonly Obligation[],
  moment: SituationMoment,
): readonly LaterBlock[] {
  const dayId = localDayIdAt(moment.now, moment.zone)
  const date = civilDateFromDayId(dayId)
  const at = (minutes: number): Instant =>
    instantAtLocal(
      { ...date, hour: Math.floor(minutes / 60), minute: minutes % 60, second: 0 },
      moment.zone,
    )

  const out: LaterBlock[] = []
  for (const block of DAY_BLOCKS) {
    const from = at(BLOCK_STARTS_AT[block])
    if (from <= moment.now) continue
    const to = at(BLOCK_ENDS_AT[block])

    // Only his own obligations take minutes out of a block. A span of somebody
    // else's time shapes the day at its edges rather than in its middle —
    // her school day is the freest stretch of his week, not a busy one.
    let taken = 0
    for (const entry of obligations) {
      if (entry.whose !== 'mine') continue
      const overlap = Math.min(to, entry.endsAt) - Math.max(from, entry.startsAt)
      if (overlap > 0) taken += overlap
    }

    out.push({
      block,
      from,
      to,
      free: Math.max(0, Math.round((to - from) / 60_000 - taken / 60_000)),
    })
  }
  return out
}

/**
 * What is actually in the way right now (canonical plan section 19).
 *
 * Order matters and is deliberate: recovery outranks a sore body, which
 * outranks a short evening, because a recovery problem does not stop being the
 * limiter just because the evening also happens to be short. Nothing here reads
 * a domain preference — the limiter is a reading of the situation, not of what
 * the owner would like to be working on. That separation is what lets scenario
 * G-005 come out the way it does without "sleep wins" being written anywhere.
 *
 * Coverage is the fourth and the weakest, and it is last for the same reason
 * the other three are in the order they are: a life area nobody has mentioned
 * for six weeks is worth doing something about, and it is not worth doing
 * something about *instead* of sleeping when the owner is nine hours down.
 */
function findLimiter(
  capacity: Capacity,
  inHand: TimeInHand,
  coverage: CoverageState,
  block: DayBlock,
): Limiter | undefined {
  const strain = capacity.strain
  if (isUsable(strain) && strain.value !== 'none') {
    const debt = capacity.sleepDebtHours
    const shortfall = isUsable(debt) ? debt.value : undefined
    return {
      kind: 'recovery',
      label: LIMITER_LABEL.recovery,
      domain: DOMAIN.sleep,
      summary:
        shortfall === undefined
          ? 'Running low on rest.'
          : shortfall >= 5
            ? `About ${describeHours(shortfall)} short of rest over the last few nights.`
            : `Around ${describeHours(shortfall)} short of rest this week.`,
      evidence: basisOf(strain),
      // Strain is always worked out rather than stated, so it normally arrives
      // with its own confidence. A directly stated one would be near-certain.
      certainty: strain.state === 'inferred' ? strain.confidence : confidence(0.9),
    }
  }

  const soreness = capacity.soreness
  if (isUsable(soreness) && soreness.value >= SORE_ENOUGH_TO_EASE_OFF) {
    return {
      kind: 'capacity',
      label: LIMITER_LABEL.capacity,
      domain: DOMAIN.health,
      summary: `The body is asking for an easier ${block === 'evening' || block === 'late-night' ? 'night' : 'day'}.`,
      evidence: basisOf(soreness),
      certainty: confidence(0.55),
    }
  }

  /*
   * And the third thing that can be in the way — D-166's mental-overload
   * dimension, wired to the consumer §13B names for it.
   *
   * It sits below the body and above the clock, which is the honest order.
   * Nine hours short of rest is a harder fact than a full head, and a full head
   * is a harder fact than twenty minutes: a man with too much on his mind and
   * two free hours cannot start the lab either, and the app had no way to say
   * so. Every other limiter answers *what is in the way* and this is the one an
   * owner would notice missing.
   */
  const overwhelm = capacity.overwhelm
  if (isUsable(overwhelm) && overwhelm.value >= LOADED_ENOUGH_TO_LIMIT) {
    return {
      kind: 'capacity',
      label: LIMITER_LABEL.capacity,
      domain: DOMAIN.emotional,
      /*
       * What he said, said back. Not "you are overwhelmed" — that is a claim
       * about him, and section 4.4 forbids the failure framing. There is a lot
       * on his mind is a description of the reading he gave.
       */
      summary: `There is a lot on your mind ${withinPhrase(block)}.`,
      evidence: basisOf(overwhelm),
      certainty: confidence(0.55),
    }
  }

  const minutes = inHand.minutes
  if (isUsable(minutes) && minutes.value < SHORT_ENOUGH_TO_LIMIT) {
    /*
     * And what the time is short *of* — AUD-0004.
     *
     * "Only about 20 minutes left this morning" is true at 07:15 on a school
     * morning and tells the owner nothing he does not know. "Twenty minutes
     * before Adaya's school day" is the same reading with the reason in it, and
     * it is the sentence the app could not write at all until an obligation was
     * something it could see. It is said only when the obligation is what
     * binds; where his own answer is the shorter figure the line is unchanged.
     */
    const before = inHand.before
    return {
      kind: 'time',
      label: LIMITER_LABEL.time,
      domain: DOMAIN.direction,
      summary:
        before === undefined
          ? `Only about ${Math.round(minutes.value)} minutes left ${withinPhrase(block)}.`
          : minutes.value <= 0
            ? `${before.label} is under way.`
            : `About ${Math.round(minutes.value)} minutes before ${before.label}.`,
      evidence: basisOf(minutes),
      certainty: confidence(0.7),
    }
  }

  /*
   * Section 63, as a limiter.
   *
   * The engine has always had a `stale-evidence` trigger and nothing that could
   * reach it, because nothing noticed that a life area had gone quiet. This is
   * what notices. It fires only on an area the owner's own history shows
   * matters to him, only once the silence is long by that area's own standard,
   * and never on the private domain (section 11).
   *
   * The certainty is deliberately modest. "Nothing has come in about the house
   * for three weeks" is a claim about what the app has been told, which it can
   * be sure of; whether that matters tonight is a judgement, and the number
   * says which of the two this is.
   */
  const quiet = coverage.mostNeglected
  if (quiet !== undefined) {
    return {
      kind: 'coverage',
      label: LIMITER_LABEL.coverage,
      domain: quiet.domain,
      summary: quiet.summary,
      evidence: quiet.weakest?.evidence ?? [],
      certainty: confidence(0.5),
    }
  }

  return undefined
}

/**
 * When the current topic was last gone over, and whether it is due — AUD-0010.
 *
 * Undefined where there is no current topic, which is most histories. The
 * horizon comes from the career goal the owner set, and where he has not set a
 * date the interval falls back to a conservative default and says so — the
 * `fromGoal` flag on the reading, so nothing downstream can present a default as
 * a number derived from his own deadline.
 *
 * The moves that count are the three study verbs. A lab and a review are both
 * going over the topic; a walk is not, whatever else it did for him.
 */
const STUDY_MOVES: readonly ActionVerb[] = ['recall-practice', 'review-weak-topic', 'hands-on-lab']

function studySpacingFor(
  episodes: readonly Episode[],
  learningTopic: Knowledge<FactValue>,
  direction: DirectionState,
  entities: EntityIndex,
  today: LocalDayId,
): Spacing | undefined {
  const topic = isUsable(learningTopic) ? entityValue(learningTopic.value) : undefined
  if (topic === undefined) return undefined
  if (entities.resolve(topic) === undefined) return undefined
  const career = direction.goals.find((goal) => goal.domain === DOMAIN.career)
  return spacingFor({
    episodes,
    topic,
    today,
    horizon: career?.horizon,
    moves: STUDY_MOVES,
  })
}

/**
 * The situation, reduced to the few things worth comparing evenings on.
 *
 * Written onto a recommendation when the owner acts on it, and never revised —
 * so "was that evening like tonight?" is answered from what the app could see
 * at the time rather than from everything written since. Section 16 asks for
 * historical comparison to weigh context rather than date proximity, and this
 * is the context it weighs.
 */
function contextFor(
  block: DayBlock,
  isWeekend: boolean,
  // Which day it actually was — AUD-0007. `isWeekend` above collapses five
  // working evenings into each other, so a Tuesday resembled a Thursday exactly
  // as much as it resembled another Tuesday.
  isoWeekday: IsoWeekday,
  // How heavy the week around it had been — AUD-0007. Unknown stays out of the
  // record entirely rather than being written as "ordinary": a week nothing was
  // recorded in is not an ordinary week (G-009).
  weekLoad: Knowledge<WeekLoad>,
  strain: Knowledge<Strain>,
  // Whether she was actually there, not whose week it was — QA-82-001. Two
  // evenings resemble each other by who was in the house, and a standing
  // arrangement is not an answer to that.
  childPresent: Knowledge<boolean>,
  // The time actually in hand rather than the answer he gave — AUD-0004. Two
  // twenty-minute evenings resemble each other whether the twenty minutes came
  // from his own answer or from the school run, and that resemblance is what
  // this fingerprint is for.
  usableMinutes: Knowledge<number>,
): DecisionContext {
  return {
    block,
    weekend: isWeekend,
    // Stale counts as unknown here on purpose: a reading that has expired is not
    // a description of this evening, and letting it stand in for one is how a
    // month-old number quietly becomes today's context.
    strain: isUsable(strain) ? strain.value : 'unknown',
    ...(isUsable(childPresent) ? { childPresent: childPresent.value } : {}),
    ...(isUsable(usableMinutes) ? { usableMinutes: Math.round(usableMinutes.value) } : {}),
    dayOfWeek: isoWeekday,
    ...(isUsable(weekLoad) ? { load: weekLoad.value } : {}),
  }
}

export function describeHours(hours: number): string {
  const rounded = Math.round(hours * 2) / 2
  if (rounded < 1) return 'under an hour'
  if (rounded === 1) return 'an hour'
  if (Number.isInteger(rounded)) return `${rounded} hours`
  return `${rounded} hours`
}

function collectPreferences(view: MemoryView): readonly OwnerPreference[] {
  const preferences: OwnerPreference[] = []
  for (const record of view.history.effective) {
    if (record.kind !== 'preference') continue
    preferences.push({
      about: record.about,
      stance: record.stance,
      statement: record.statement,
      source: record.id,
      domains: record.domains,
    })
  }
  return preferences
}

/**
 * Which standing permissions are granted right now — D-167.
 *
 * The latest `permission` record for each id wins, and no record at all means
 * **not granted**. That is the safe default and it needs nothing written down:
 * a permission nobody gave is one that was not given.
 *
 * Turning one off writes `granted: false` rather than deleting anything, so the
 * record still says what was true while it was on — which is the fourth of
 * D-167's four simultaneous guarantees.
 */
export function resolvePermissions(view: MemoryView, now: Instant): PermissionState {
  const latest = new Map<string, { readonly at: Instant; readonly granted: boolean }>()
  for (const record of view.history.effective) {
    if (record.kind !== 'permission') continue
    if (record.occurredAt > now) continue
    const held = latest.get(record.permission)
    if (held === undefined || record.occurredAt >= held.at) {
      latest.set(record.permission, { at: record.occurredAt, granted: record.granted })
    }
  }
  return { granted: (permission) => latest.get(permission)?.granted === true }
}

/**
 * Whether a constraint in force says he cannot leave — S2 Tier 1, C21.
 *
 * D-187 captures the answer already; what it lacked was somewhere to put it.
 * The blocker writes a `constraint` record bearing {@link CONCEPT.mustStay},
 * and `collectConstraints` has always dropped one whose `until` has passed — so
 * a bounded supervision — *"while she is asleep"* — lifts itself and an
 * unbounded one stands until the owner says otherwise.
 *
 * **Unknown is unknown.** No constraint means nobody has said he must stay,
 * which G-009 forbids reading as being free to go.
 */
function readMustStay(constraints: readonly ActiveConstraint[]): Knowledge<boolean> {
  const found = constraints.find((constraint) => constraint.concept === CONCEPT.mustStay)
  if (found === undefined) {
    return unknown('never-observed', 'nothing says you cannot leave')
  }
  return explicit(true, found.at, found.source)
}

/**
 * Whether movement happened today, dated by when it happened.
 *
 * **By the completion, not by the day the move was offered** — D-160's rule,
 * which is about exactly this distinction one layer up. An episode's `dayId` is
 * the day the recommendation was made; a walk offered on Tuesday and finished
 * on Wednesday is Wednesday's movement, and reading the offer's day would make
 * it Tuesday's and would suppress a walk on the wrong day.
 */
function readTrainedToday(
  episodes: readonly Episode[],
  moment: SituationMoment,
  dayId: LocalDayId,
): { readonly knowledge: Knowledge<boolean>; readonly what: EntityRef | undefined } {
  for (const episode of episodes) {
    if (episode.state !== 'completed') continue
    if (episode.semantics.target.verb !== 'move') continue
    const finishedAt = episode.settledAt
    if (finishedAt === undefined) continue
    /*
     * And it has to have happened already — D-160, whose own guard caught this
     * one line after it was written.
     *
     * The QA laboratory reads a history from any hour, so a walk finished at
     * eight in the evening is in the record while the app is being read at nine
     * in the morning. Same day, and not yet true. A reading of *today* taken
     * from a record dated later today is the app telling the owner about
     * something he has not done.
     */
    if (finishedAt > moment.now) continue
    if (localDayIdAt(finishedAt, moment.zone) !== dayId) continue
    return {
      knowledge: explicit(true, finishedAt, episode.recommendation),
      what: episode.semantics.target.object,
    }
  }
  /*
   * And nothing else is claimed. An owner who cycled to work and never told the
   * app has still moved, so the honest reading is that the record does not
   * know rather than that he did not — G-009, on a concept where the tempting
   * default is obviously false.
   */
  return {
    knowledge: unknown('never-observed', 'nothing finished today says movement happened'),
    what: undefined,
  }
}

/**
 * How long ago each named person was actually in the record — AUD-0047.
 *
 * The projection exists and only the QA laboratory reads it. Everything here is
 * a fold of `relationship-event` records that already ship: no inference, no
 * summary judgement, and no person named who has no event behind them.
 *
 * `quality` travels because leaving it out would be worse, not better. Recency
 * alone would have the app nudge him toward somebody he has deliberately
 * stepped back from, and this field is the only thing that can prevent that.
 * It is carried as *"the last contact went badly"* rather than as a verdict on
 * the relationship, because one strained interaction is not a strained
 * relationship and the record does not support the wider claim.
 */
function collectContacts(
  view: MemoryView,
  entities: EntityIndex,
  moment: SituationMoment,
): readonly ContactRecency[] {
  const today = localDayIdAt(moment.now, moment.zone)
  const byEntity = new Map<
    string,
    { ref: EntityRef; lastAt: Instant; occasions: number; strained: boolean; source: RecordId }
  >()

  for (const event of view.relationships.events) {
    if (event.at > moment.now) continue
    const entity = view.entities.get(event.entity)
    if (entity === undefined) continue
    const ref: EntityRef = { id: entity.id, kind: entity.kind }
    const held = byEntity.get(entity.id)
    if (held === undefined) {
      byEntity.set(entity.id, {
        ref,
        lastAt: event.at,
        occasions: 1,
        strained: event.quality === 'strained',
        source: event.source,
      })
      continue
    }
    held.occasions += 1
    if (event.at > held.lastAt) {
      held.lastAt = event.at
      held.strained = event.quality === 'strained'
      held.source = event.source
    }
  }

  const out: ContactRecency[] = []
  for (const held of byEntity.values()) {
    const label = entities.labelFor(held.ref) ?? view.entities.get(held.ref.id)?.label
    // A person the index cannot name is one no sentence could mention, so it is
    // left out rather than carried as an identifier — D-018.
    if (label === undefined) continue
    out.push({
      entity: held.ref,
      label,
      lastAt: held.lastAt,
      daysSince: Math.max(0, localDaysBetween(localDayIdAt(held.lastAt, moment.zone), today)),
      occasions: held.occasions,
      lastWasStrained: held.strained,
      source: held.source,
    })
  }
  return out.sort((a, b) => b.lastAt - a.lastAt)
}

/**
 * Whether tonight is one of the few she is not here — AUD-0019.
 *
 * Read off the **durable** context rather than off the resolved value, and the
 * distinction is the whole reading. `childHere` already says she is not here;
 * what makes tonight *unusual* is that a standing arrangement says she normally
 * is, and the fact layer resolves a narrower situational record over that
 * durable one — so asking the resolved value would only ever get the answer
 * back.
 *
 * A durable record still in force, and nothing else. No inference from a run of
 * evenings: a fortnight where she happened to be here is not an arrangement, and
 * treating it as one would be the app deciding what his custody looks like.
 */
function unusuallyAway(
  view: MemoryView,
  childHere: Knowledge<boolean>,
  moment: SituationMoment,
): boolean {
  if (!isUsable(childHere) || childHere.value) return false
  for (const record of view.history.effective) {
    if (record.kind !== 'context') continue
    if (record.durability !== 'durable') continue
    if (record.concept !== CONCEPT.childPresent) continue
    if (record.occurredAt > moment.now) continue
    if (record.validFrom > moment.now) continue
    if (record.validUntil !== undefined && moment.now >= record.validUntil) continue
    if (booleanValue(record.value) === true) return true
  }
  return false
}

function collectConstraints(view: MemoryView, now: Instant): readonly ActiveConstraint[] {
  const constraints: ActiveConstraint[] = []
  for (const record of view.history.effective) {
    if (record.kind !== 'constraint') continue
    if (record.until !== undefined && record.until <= now) continue
    if (record.occurredAt > now) continue
    constraints.push({
      concept: record.concept,
      domains: record.domains,
      description: record.description,
      at: record.occurredAt,
      source: record.id,
    })
  }
  return constraints
}

/**
 * Moves already put in front of the owner recently, and what became of them.
 *
 * A thin projection of the episodes in `lifecycle.ts`, narrowed to the window
 * the duplication check in section 19 cares about: the same move offered three
 * evenings running is a worse move on the third evening. Everything the
 * lifecycle knows lives in one place and this reads it, rather than folding the
 * same records a second way and eventually disagreeing about what "declined"
 * means.
 */
function collectRecentMoves(
  episodes: readonly Episode[],
  from: Instant,
  to: Instant,
): readonly PriorMove[] {
  const moves: PriorMove[] = []
  for (const episode of episodes) {
    if (episode.shownAt < from || episode.shownAt > to) continue
    moves.push({
      semantics: episode.semantics,
      at: episode.shownAt,
      source: episode.recommendation,
      state: episode.state,
    })
  }
  return moves
}

// ---------------------------------------------------------------------------

export function assembleSituation(view: MemoryView, moment: SituationMoment): Situation {
  const domains = moment.domains ?? coreDomains
  const concepts = moment.concepts ?? coreConcepts
  // The owner's entities plus the engine's own small vocabulary of routines,
  // so a suggested wind-down has a subject without inventing one about them.
  const entities = decisionEntities(view.entities.all())
  /*
   * What the owner has allowed the app to reason from — D-167.
   *
   * Resolved before the first fact is read, because it decides whether some of
   * them may be read at all. It is off unless the record says otherwise, which
   * is why an empty history is the safe state rather than a state anything has
   * to remember to handle.
   */
  const permissions = resolvePermissions(view, moment.now)
  const reader = createFactReader(view, entities, concepts, permissions)

  // Worked out before anything is read, because what a fact is *for* is worded
  // from the hour — AUD-0001. The seam the audit found was exactly this: the
  // block was assembled after the limiter that needed it.
  const block = blockOf(moment.now, moment.zone)

  /*
   * Every concept the registry knows, read once — AUD-0040.
   *
   * This was nine hand-written reads and it is the whole finding: the registry
   * grew and the one list that was not registry-driven did not grow with it.
   * The named fields below are now narrowed views of rows in here rather than
   * separate reads, so *"Facts considered"* is the true set by construction and
   * a concept added to the registry is visible to the brain the moment it is
   * registered.
   *
   * The purposes that used to be written here travel on the concepts, which is
   * what let the read move. The one that named an hour — *"whether she is in
   * your care tonight"* — carries `{when}` and is filled in from the block.
   */
  const taken = readRegistry(concepts, reader, block)
  const readings = conceptReadings(taken, (concept) =>
    reader.read(concept, purposeOf(concepts.definitionFor(concept), block)),
  )

  const capacity = assembleCapacity(view, moment, readings)
  const usableMinutes = narrowKnowledge(readings.get(CONCEPT.freeNow), minutesValue)
  /*
   * The arrangement, read as the arrangement — QA-82-001.
   *
   * The purpose string reaches the owner: the fact ledger prints "… — for
   * whether she is here today" under each row. It used to say exactly that
   * about this record, which is how a durable custody answer went on being
   * presented as a claim about the room after the decision path had stopped
   * treating it as one. What this record answers is whose day it is, and the
   * sentence saying so now lives on the concept.
   */
  const childPresent = narrowKnowledge(readings.get(CONCEPT.childPresent), booleanValue)
  const socialEnergy = narrowKnowledge(readings.get(CONCEPT.socialEnergy), ratioValue)
  const needForCompany = narrowKnowledge(readings.get(CONCEPT.needForCompany), ratioValue)
  const homeFriction = readings.get(CONCEPT.homeFriction)
  const learningTopic = readings.get(CONCEPT.learningTopic)

  const local = localDateTimeAt(moment.now, moment.zone)

  // What the day already has in it, before anything is decided about it.
  const commitments = collectObligations(view, moment)
  const until = untilNextObligation(commitments, moment.now)
  const inHand = timeInHand(usableMinutes, until.minutes, until.binding)

  /*
   * And who is where — QA-82-001.
   *
   * The standing arrangement says whose week this is; her own day says whether
   * she is in the room. Worked out here, once, so that the generator, the
   * filter, the premise and the evidence panel cannot disagree about it.
   */
  const child = entities.byKind('person').find((entity) => entity.domain === DOMAIN.fatherhood)
  const elsewhere = narrowedByTheirOwnDay(
    childPresent,
    child,
    occupiedNow(commitments, moment.now),
    moment.now,
  )
  const childHere = elsewhere.knowledge

  /*
   * And it is written down where the owner can see it — QA-82-001, round 2.
   *
   * Round 1 moved the narrowed reading into the generator, the filter, the
   * premise and the learning context, and stopped there. Every surface that
   * walks the concept registry — the QA fact ledger, the Fatherhood page, the
   * export — went on printing the raw arrangement as the app's current belief
   * about where she was. Recording the reading here is what makes those
   * surfaces right without any of them having to know about school days.
   */
  if (child !== undefined) {
    const asFact = mapKnowledge(childHere, (value): FactValue => ({ type: 'boolean', value }))
    reader.derive(
      CONCEPT.childHere,
      asFact,
      presenceReading(childHere, child, elsewhere.because, moment.zone),
      purposeOf(concepts.definitionFor(CONCEPT.childHere), block),
    )
    // And into the map, so a consumer asking the registry what is known about
    // her presence gets the app's actual reading rather than the permanent
    // `unknown` a concept no record carries would otherwise resolve to.
    taken.set(CONCEPT.childHere, asFact)
  }

  // One pass over history for both: the duplication check reads the recent end
  // of it, and learning reads all of it against the situation being decided.
  const episodes = collectEpisodes(view, moment.zone)
  const isWeekend = local.isoWeekday >= 6

  /*
   * How the week itself has gone — AUD-0007.
   *
   * The rest half is measured here rather than in `rhythm.ts` because what
   * counts as a full night is `SLEEP_BASELINE_HOURS`, and a second copy of that
   * number in another file is exactly how two parts of one app come to disagree
   * about the same evening. `nightsWithin` is the same reader the sleep debt
   * uses, over a seven-day window instead of a three-day one.
   */
  const weekNights = nightsWithin(
    view,
    addLocalDays(moment.now, -LOAD_WINDOW_DAYS, moment.zone),
    moment.now,
  )
  const week = readWeekLoad(
    {
      shortfallHours: weekNights.reduce(
        (total, night) => total + Math.max(0, SLEEP_BASELINE_HOURS - night.hours),
        0,
      ),
      nightsSeen: weekNights.length,
      basis: weekNights.map((night) => night.source),
    },
    episodes,
    moment,
  )

  /*
   * The three readings the app works out for itself — S2 Tier 1 and Tier 2.
   *
   * Each one is *reach* rather than capture, which is what this phase is: the
   * supervision constraint is already written, the completed movement episode
   * is already recorded, and the relationship graph is already built. None of
   * them costs the owner a tap, and each is written back through
   * {@link FactReader.derive} so the fact ledger, the domain page and the
   * export show the app's own reading rather than a permanently blank row.
   */
  const routines = collectRoutines(view, DOMAIN.health, moment.now)
  const constraints = collectConstraints(view, moment.now)
  const mustStay = readMustStay(constraints)
  const trained = readTrainedToday(episodes, moment, local.dayId)
  const peoplePresent = collectContacts(view, entities, moment)

  reader.derive(
    CONCEPT.mustStay,
    mapKnowledge(mustStay, (value): FactValue => ({ type: 'boolean', value })),
    isUsable(mustStay)
      ? (constraints.find((entry) => entry.concept === CONCEPT.mustStay)?.description ??
          'You said you could not leave.')
      : 'not known — nothing says you cannot leave',
    purposeOf(concepts.definitionFor(CONCEPT.mustStay), block),
  )
  taken.set(
    CONCEPT.mustStay,
    mapKnowledge(mustStay, (value): FactValue => ({ type: 'boolean', value })),
  )

  reader.derive(
    CONCEPT.trainedToday,
    mapKnowledge(trained.knowledge, (value): FactValue => ({ type: 'boolean', value })),
    trained.what === undefined
      ? 'not known — nothing finished today says movement happened'
      : `yes — ${entities.labelFor(trained.what) ?? trained.what.id}`,
    purposeOf(concepts.definitionFor(CONCEPT.trainedToday), block),
  )
  taken.set(
    CONCEPT.trainedToday,
    mapKnowledge(trained.knowledge, (value): FactValue => ({ type: 'boolean', value })),
  )

  /*
   * And who has been around, as a count rather than as a list of names.
   *
   * The reading the fact ledger prints must not become a roll-call: section 11's
   * discretion argument is about a private area and AUD-0047's is about naming
   * a real person on a screen, and both point the same way here. The graph
   * itself is on the situation for the generator that needs it; what is
   * *rendered* is how many people the record has real contact evidence for.
   */
  const contactsKnowledge: Knowledge<FactValue> =
    peoplePresent.length === 0
      ? unknown('never-observed', 'no contact with anyone is recorded')
      : explicit(
          { type: 'number', value: peoplePresent.length },
          peoplePresent[0]!.lastAt,
          peoplePresent[0]!.source,
        )
  reader.derive(
    CONCEPT.peoplePresent,
    contactsKnowledge,
    peoplePresent.length === 0
      ? 'not known — no contact with anyone is recorded'
      : `${peoplePresent.length} ${peoplePresent.length === 1 ? 'person' : 'people'} with contact in the record`,
    purposeOf(concepts.definitionFor(CONCEPT.peoplePresent), block),
  )
  taken.set(CONCEPT.peoplePresent, contactsKnowledge)

  const coverage = assembleCoverage(view, entities, {
    now: moment.now,
    zone: moment.zone,
    domains,
    concepts,
  })

  /*
   * Resolved before the situation is assembled rather than inside the literal,
   * because the spacing reading needs the goal's own horizon — AUD-0010. Two
   * calls to `resolveDirection` would be two answers to one question, which is
   * the shape this whole file exists to avoid.
   */
  const direction = resolveDirection(view, moment, domains, readings.get(CONCEPT.weeklyFocus))

  return {
    at: moment.now,
    zone: moment.zone,
    dayId: local.dayId,
    weekId: localWeekIdAt(moment.now, moment.zone, moment.weekStartsOn),
    weekStartsOn: moment.weekStartsOn,
    block,
    isWeekend,
    context: contextFor(
      block,
      isWeekend,
      local.isoWeekday,
      week.load,
      capacity.strain,
      childHere,
      inHand.minutes,
    ),
    capacity,
    weekLoad: week.load,
    weekLoadEvidence: week.evidence,
    trajectories: readTrajectories(view, concepts, permissions, moment),
    usableMinutes,
    commitments,
    nextObligation: until.next,
    minutesUntilNextObligation: until.minutes,
    inHand,
    childPresent,
    childHere,
    childElsewhere: elsewhere.because,
    awayUnusually: unusuallyAway(view, childHere, moment),
    socialEnergy,
    needForCompany,
    mustStay,
    trainedToday: trained.knowledge,
    peoplePresent,
    routines,
    homeFriction,
    learningTopic,
    studySpacing: studySpacingFor(episodes, learningTopic, direction, entities, local.dayId),
    direction,
    coverage,
    laterToday: collectLaterToday(commitments, moment),
    threads: activeThreads(view, episodes, { now: moment.now, zone: moment.zone }),
    limiter: findLimiter(capacity, inHand, coverage, block),
    preferences: collectPreferences(view),
    constraints,
    permissions,
    shown: (moment.shown ?? []).filter(
      (entry) => entry.dayId === local.dayId && entry.at < moment.now,
    ),
    recentMoves: collectRecentMoves(
      episodes,
      addLocalDays(moment.now, -3, moment.zone),
      moment.now,
    ),
    learning: buildLearning(episodes, view, {
      now: moment.now,
      zone: moment.zone,
      concepts,
      // The decision index rather than the store's: a belief about a walk has
      // to be able to name it, and the engine's own routines resolve nowhere
      // else (QA-83-002).
      entities,
    }),
    considered: reader.considered(),
    readings,
    entities,
    domains,
    concepts,
    view,
  }
}

export type { ActiveGoal, DirectionState, GoalHorizon, GoalPart }
export type { ActiveThread }
/*
 * Re-exported so a Life page can read a goal's trajectory through the same door
 * it already reads the situation through — AUD-0021.
 *
 * `direction` is not on `OPEN_TO_SURFACES` and should not be: it resolves what
 * the owner is aiming at, which is part of how a move is ranked. What a surface
 * needs is the *sentence*, and there must be exactly one of those or the Career
 * page and the Insights card will drift into saying different things about the
 * same goal.
 */
export { describeGoalTrajectory }
export type { CoverageState, DomainCoverage, ConceptCoverage, RefreshRoute } from './coverage'
export { REFRESH_ROUTES } from './coverage'
