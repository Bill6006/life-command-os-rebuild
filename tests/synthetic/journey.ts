import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'
import { expect } from 'vitest'
import type { LifeDomainId } from '../../src/domain/domains'
import type { IsoWeekday } from '../../src/domain/time'
import type { EntityKind, EntityRef } from '../../src/domain/entities'
import { newRecordId, type RecordId } from '../../src/domain/ids'
import {
  RECORD_KINDS,
  type CanonicalRecord,
  type FactValue,
  type GoalRecord,
  type RecordKind,
} from '../../src/domain/records'
import {
  addLocalDays,
  localDayIdAt,
  systemClock,
  type Instant,
  type LocalDayId,
  type TimeZoneId,
} from '../../src/domain/time'
import type { ConceptId } from '../../src/domain/windows'
import {
  contextCorrectionRecord,
  coverageInterpretationRecord,
  domainStatusCorrectionRecord,
  factCorrectionRecord,
  goalCorrectionRecord,
  beliefCorrectionRecord,
  forbidRecord,
  liftVetoRecord,
  permissionRecord,
  redateEventRecord,
  withdrawEventRecord,
} from '../../src/intelligence/corrections'
import { checkInRecord, checkInSettingRecord } from '../../src/intelligence/checkIn'
import { decide, type Decision } from '../../src/intelligence/engine'
import { growthAnswerRecords, growthStageRecord } from '../../src/intelligence/growth'
import { nextGuideStep, type GuideStep } from '../../src/intelligence/guide'
import {
  availableActions,
  nextResumable,
  planLifecycle,
  resumableToday,
  type LifecycleAction,
  type ResumableMove,
} from '../../src/intelligence/lifecycle'
import {
  nextDueOutcome,
  outcomeRecord,
  type OutcomeAnswer,
  type PendingOutcome,
} from '../../src/intelligence/outcomes'
import { answerRecord, questionFor } from '../../src/intelligence/questions'
import { assembleSituation, type ShownMove, type Situation } from '../../src/intelligence/situation'
import { startThreadRecord, threadOfferFor } from '../../src/intelligence/threads'
import {
  assembleDomainPageData,
  pageBySlug,
  type DomainPageData,
} from '../../src/features/life/domainPages'
import {
  commitmentWindowRecord,
  removeCommitmentWindowRecord,
  reviseCommitmentWindowRecord,
} from '../../src/intelligence/commitments'
import {
  authoringRecords,
  destinationRecords,
  destinationRef,
  milestoneFor,
  setMilestoneAside,
  proposeAuthoring,
  proposeDestination,
  relationshipEventRecord,
  reviseDestinationRecord,
  type AuthoringDraft,
  type AuthoringProposal,
  type AuthoringResult,
  type DestinationDraft,
} from '../../src/intelligence/authoring'
import {
  blockerQuestionFor,
  blockerStatement,
  standingBlockerRecords,
  type BlockerCause,
  type BlockerDecision,
} from '../../src/intelligence/blockers'
import {
  courseReflectionRecord,
  nextCourseReflection,
  readProgress,
  type CourseReflection,
  type ProgressReading,
} from '../../src/intelligence/progress'
import {
  discoveryAgenda,
  discoveryResponseRecord,
  type DiscoveryAgenda,
} from '../../src/intelligence/discovery'
import {
  aimReadingRecord,
  proposeInterpretedDestination,
  readAimIn,
  readingFor,
  withdrawAimReading,
  type AimReading,
} from '../../src/intelligence/interpret'
import { describeRecord } from '../../src/features/history/describe'
import { createMemoryStore } from '../../src/memory/memoryStore'
import { snapshotFromWire } from '../../src/memory/snapshot'
import type { StoreSnapshot } from '../../src/memory/store'
import { buildView, type MemoryView } from '../../src/memory/view'
import { scenarioById } from '../../src/synthetic/scenarios'

/**
 * The ordinary-use instrument — routing 83, package 83.0, D-161, F38.
 *
 * ## What this is for
 *
 * Every gate in this campaign so far is green against fixtures authored by the
 * same process that wrote the code. An independent reader with a browser then
 * found forty-four things that 1,332 unit tests, 501 browser assertions, a
 * 93-check Android gate and twelve rounds of independent QA did not — and the
 * largest single class of them was **objects that are easy to encounter in a
 * fixture and impossible to introduce as an owner**.
 *
 * A fixture cannot see that, because it starts on the far side of the part that
 * fails. So this does not build a history; it **uses the app**. It opens a
 * near-empty store and drives it with the gestures an owner actually has, and
 * where the journey cannot go on it says so rather than reaching for a record
 * builder no surface calls.
 *
 * ## The one rule that makes it an instrument rather than another fixture
 *
 * **Every gesture below is the surface's own call, with the surface's own
 * arguments.** `answerGuide` builds the record `NowScreen.answerGuide` builds;
 * `act` calls `planLifecycle` exactly as `NowScreen.act` does; `correctFact`
 * reproduces `DomainPage.correctConcept`, including its durable/situational
 * branch. Nothing here writes a record kind that no owner-facing control emits.
 *
 * `OWNER_ROUTES` is the same claim as a table, and `recordKindsWithNoOwnerRoute`
 * turns it into an assertion: if a record kind is not reachable from a control,
 * an ordinary journey that needs one cannot proceed, and that is a finding
 * rather than a gap in this file.
 */

// ---------------------------------------------------------------------------
// Which record kinds an owner can actually produce
// ---------------------------------------------------------------------------

export interface OwnerRoute {
  readonly id: string
  /** The screen the control is on. */
  readonly surface: 'now' | 'life' | 'domain-page' | 'insights' | 'check-in' | 'more'
  /** What the owner taps, in the words on the button. */
  readonly gesture: string
  /** The builder the surface calls, so this table can be checked against source. */
  readonly builder: string
  /**
   * What must already be in the store before this control is on a screen.
   *
   * This is the field that makes the table honest. "Date and pieces" writes a
   * `goal` record, so a table with only `writes` in it would report `goal` as
   * reachable — and it is not: the control corrects a goal that is already
   * there, and there is no control that makes the first one. Needs turn the
   * table into a reachability question with an answer.
   */
  readonly needs: {
    readonly records?: readonly RecordKind[]
    readonly entities?: readonly EntityKind[]
  }
  readonly writes: readonly RecordKind[]
}

/**
 * Every control on an owner-facing screen that appends to the record.
 *
 * **This claim is checked rather than asserted — QA-83-003.** It said "every"
 * and was compiled by reading four files; there are five, and it missed the
 * course controls on Life and the belief correction on Insights. A claim of
 * exhaustiveness that nothing can falsify is a comment, and this one was
 * sitting above a green test called "keeps the route table honest" that
 * compared the table against nothing at all.
 *
 * `everyBuilderReachedFromAFeature()` now reads `src/features/**` and returns
 * the record builders the screens actually call; the guard in
 * `ordinary-use-journey.test.ts` fails when one of them is missing from here.
 * The table is still written by hand, because what each control *needs* cannot
 * be read off a call site — but it can no longer be quietly incomplete.
 *
 * `More / Data` is deliberately absent: import and restore replace the store
 * from a file rather than authoring anything, and a capability only reachable
 * by hand-writing JSON is precisely what D-161 says does not count.
 */
export const OWNER_ROUTES: readonly OwnerRoute[] = [
  {
    id: 'guide-answer',
    surface: 'now',
    gesture: 'one of the guide’s answers',
    builder: 'questions.answerRecord',
    needs: {},
    writes: ['observation'],
  },
  /*
   * Routing 94's two, and they are the whole of what the check-in can write.
   *
   * The reading needs nothing in the store at all, which is the point of it: an
   * empty history was being asked **one question a day** before this phase
   * because the guide's gate correctly found nothing worth asking, and a ritual
   * that also needed a prior record would have inherited the same problem one
   * layer up.
   */
  {
    id: 'check-in-reading',
    surface: 'check-in',
    gesture: 'one of a reading’s five anchors',
    builder: 'checkIn.checkInRecord',
    needs: {},
    writes: ['observation'],
  },
  {
    id: 'check-in-setting',
    surface: 'more',
    gesture: 'a depth or a frequency, on More',
    builder: 'checkIn.checkInSettingRecord',
    needs: {},
    writes: ['check-in-setting'],
  },
  {
    id: 'lifecycle',
    surface: 'now',
    gesture: 'Start it / Done / Something else / Can’t right now / Not today',
    builder: 'lifecycle.planLifecycle',
    // A move has to be on screen, and the cheapest move in the catalogue — a
    // walk — needs a capacity reading and no strain, both of which are
    // observations the guide can produce.
    needs: { records: ['observation'] },
    writes: [
      'action-recommendation',
      'action-start',
      'action-completion',
      'action-decline',
      'action-unable-now',
    ],
  },
  {
    id: 'thread-pause',
    surface: 'now',
    gesture: 'Not today, on a move that belongs to a course',
    builder: 'lifecycle.planLifecycle → threads.setThreadStateRecord',
    needs: { records: ['thread', 'action-decline'] },
    writes: ['thread'],
  },
  {
    id: 'outcome',
    surface: 'now',
    gesture: 'the result follow-up',
    builder: 'outcomes.outcomeRecord',
    needs: { records: ['action-completion'] },
    writes: ['outcome'],
  },
  {
    id: 'growth-answer',
    surface: 'now',
    gesture: 'Yes, she has got this',
    builder: 'growth.growthAnswerRecords',
    needs: { entities: ['development-skill'] },
    writes: ['domain-update', 'coverage-update'],
  },
  {
    id: 'belief-correction',
    surface: 'now',
    gesture: 'Not how it went',
    builder: 'corrections.beliefCorrectionRecord',
    // Only offered where the explanation rests on something learned, which
    // takes a completed episode with an answered outcome behind it.
    needs: { records: ['outcome'] },
    writes: ['belief-correction'],
  },
  {
    id: 'veto',
    surface: 'now',
    gesture: 'Stop suggesting this',
    builder: 'corrections.forbidRecord',
    needs: { records: ['action-decline'] },
    writes: ['preference'],
  },
  {
    id: 'thread-state',
    surface: 'life',
    gesture: 'Stop this / Pick this up again',
    builder: 'threads.setThreadStateRecord',
    // Missed by the first table and found by QA-83-003. It is the one control
    // on Life that writes anything other than the day's shape, and it is the
    // finding's own example of why "every" needed a guard under it.
    needs: { records: ['thread'] },
    writes: ['thread'],
  },
  {
    id: 'insights-belief-correction',
    surface: 'insights',
    gesture: 'That is not right',
    builder: 'corrections.beliefCorrectionRecord',
    /*
     * The same builder as Now's control and a different control — QA-83-003.
     *
     * Listing it once under Now would have been the table describing the
     * *builder* rather than the owner's route to it, and the two have different
     * preconditions: Now's needs a decision that rests on something learned,
     * this one needs a card on Insights, which includes the association
     * findings Now never states.
     */
    needs: { records: ['outcome'] },
    writes: ['belief-correction'],
  },
  {
    id: 'thread-start',
    surface: 'now',
    gesture: 'Yes, keep going',
    builder: 'threads.startThreadRecord',
    // The recovery run is offered beside a recovery move, and a recovery move
    // needs only short nights — so this one is reachable from answers alone.
    // The study schedule and the growth ladder are not, because the moves that
    // carry them need an entity nothing can create.
    needs: { records: ['observation'] },
    writes: ['thread'],
  },
  {
    id: 'fact-correction',
    surface: 'domain-page',
    gesture: 'Not right?',
    builder: 'corrections.factCorrectionRecord / contextCorrectionRecord',
    needs: {},
    writes: ['explicit-fact', 'context'],
  },
  {
    id: 'domain-status',
    surface: 'domain-page',
    gesture: 'Something’s changed',
    builder: 'corrections.domainStatusCorrectionRecord',
    needs: {},
    writes: ['domain-update'],
  },
  {
    id: 'coverage-review',
    surface: 'domain-page',
    gesture: 'I’ve been keeping on top of this',
    builder: 'corrections.coverageInterpretationRecord',
    needs: {},
    writes: ['coverage-update'],
  },
  /*
   * The same two controls, on the screen that raises the flag — AUD-0038(a).
   *
   * Two entries rather than one with two surfaces, because this table asks per
   * screen and the whole finding was that the response lived on a different
   * screen from the flag. A table that recorded "reachable somewhere" would
   * have called the broken loop reachable, which it was — two taps away, on the
   * page section 8 exists so the owner does not have to patrol.
   *
   * They need a stale area to be drawn at all: the panel renders only for a
   * `coverage` limiter, so `needs` names the observation that makes an area go
   * quiet rather than leaving the precondition unstated.
   */
  {
    id: 'now-domain-status',
    surface: 'now',
    gesture: 'Something’s changed, under “Out of date” on Now',
    builder: 'corrections.domainStatusCorrectionRecord',
    needs: { records: ['observation'] },
    writes: ['domain-update'],
  },
  {
    id: 'now-coverage-review',
    surface: 'now',
    gesture: 'I’ve been keeping on top of this, under “Out of date” on Now',
    builder: 'corrections.coverageInterpretationRecord',
    needs: { records: ['observation'] },
    writes: ['coverage-update'],
  },
  {
    id: 'goal-correction',
    surface: 'domain-page',
    gesture: 'Done / No longer this / Date and pieces',
    builder: 'corrections.goalCorrectionRecord',
    // `DomainPage.correctGoal` returns early when `goal.record` is undefined.
    // The control corrects a goal; nothing originates one.
    needs: { records: ['goal'] },
    writes: ['goal'],
  },
  {
    id: 'growth-stage',
    surface: 'domain-page',
    gesture: 'where a skill has got to',
    builder: 'growth.growthStageRecord',
    needs: { entities: ['development-skill'] },
    writes: ['domain-update'],
  },
  {
    id: 'lift-veto',
    surface: 'domain-page',
    gesture: 'Lift this',
    builder: 'corrections.liftVetoRecord',
    needs: { records: ['preference'] },
    writes: ['correction'],
  },
  {
    id: 'day-shape',
    surface: 'life',
    gesture: 'the school-day and working-hours clocks',
    builder:
      'commitments.commitmentWindowRecord, reviseCommitmentWindowRecord, removeCommitmentWindowRecord',
    needs: {},
    writes: ['commitment-window'],
  },

  // -------------------------------------------------------------------------
  // Routing 84 — what an owner can now bring into being
  // -------------------------------------------------------------------------

  {
    id: 'destination',
    surface: 'domain-page',
    gesture: 'Say what you are aiming at',
    builder: 'authoring.destinationRecords',
    /*
     * Nothing. That is the whole of package 1's claim and the reason it is
     * first: the longest-horizon thing in the model is reachable from an empty
     * store, by typing one sentence.
     */
    needs: {},
    // The milestone is a goal, and in Career it is also the learning topic the
    // study generator has always needed and never had.
    writes: ['destination', 'goal', 'explicit-fact'],
  },
  {
    id: 'milestone',
    surface: 'domain-page',
    gesture: 'Fill that in, on a destination with nothing next',
    builder: 'authoring.milestoneFor',
    /*
     * Its own row and its own builder, and the reason is a defect it prevents.
     * Naming the next step through `destinationRecords` writes a **second**
     * `destination` record carrying the same aim, and `resolveDestinations`
     * walks records — so one aspiration appears twice on the owner's own page,
     * with half its milestones under each.
     */
    needs: { records: ['destination'] },
    writes: ['goal', 'explicit-fact'],
  },
  {
    id: 'destination-revise',
    surface: 'domain-page',
    gesture: 'Fill that in',
    builder: 'authoring.reviseDestinationRecord',
    needs: { records: ['destination'] },
    writes: ['destination'],
  },
  {
    id: 'aim-reading',
    surface: 'domain-page',
    gesture: 'File it in <area> instead, on the aspiration form',
    builder: 'interpret.aimReadingRecord',
    /*
     * Nothing, and that is the point of routing 91 — the reading is made from
     * the words as he types them, so the row it writes is reachable in the same
     * gesture that creates the destination it is a sibling of.
     */
    needs: {},
    writes: ['destination', 'aim-reading'],
  },
  {
    id: 'aim-reading-withdraw',
    surface: 'domain-page',
    gesture: 'Put it back in <area>, on a destination that carries a reading',
    builder: 'interpret.withdrawAimReading, authoring.setMilestoneAside',
    /*
     * The whole consequence chain, not only the row — QA-91-002.
     *
     * Withdrawal sets every live milestone under the aim aside as well, so it
     * writes a superseding `goal`. A route that named only the reading builder
     * would have described a gesture with half its effects.
     */
    needs: { records: ['aim-reading'] },
    writes: ['aim-reading', 'destination', 'goal'],
  },
  {
    id: 'aim-reading-reconsider',
    surface: 'domain-page',
    gesture: 'File it in <area>, on a destination whose words still name one',
    builder: 'interpret.aimReadingRecord, authoring.setMilestoneAside',
    /*
     * The route back after declining — QA-91-001. The offer is made from the
     * words each time the object is rendered, so it needs only the destination.
     */
    needs: { records: ['destination'] },
    writes: ['aim-reading', 'destination', 'goal'],
  },
  {
    id: 'authoring',
    surface: 'domain-page',
    gesture: 'Tell the app about something',
    builder: 'authoring.authoringRecords',
    /*
     * The single highest-leverage item in the adjudication, and it needs
     * nothing. Six kinds through one control: a goal and a domain-update for
     * the four that become entities, a commitment-window for an obligation with
     * times on it, a commitment for one with only a day.
     */
    needs: {},
    writes: ['goal', 'domain-update', 'commitment-window', 'commitment'],
  },
  {
    id: 'relationship-event',
    surface: 'domain-page',
    gesture: 'Something happened',
    builder: 'authoring.relationshipEventRecord',
    // A person has to exist first, and now one can.
    needs: { entities: ['person'] },
    writes: ['relationship-event'],
  },
  {
    id: 'blocker',
    surface: 'now',
    gesture: 'What got in the way?',
    builder: 'blockers.standingBlockerRecords',
    // Only asked after the owner has said he cannot do something.
    needs: { records: ['action-unable-now'] },
    writes: ['constraint'],
  },
  {
    id: 'milestone-reached',
    surface: 'domain-page',
    gesture: 'Done, on a milestone',
    builder: 'corrections.goalCorrectionRecord',
    /*
     * The same builder as `goal-correction` and the same screen, and it is
     * listed once — this is a state on a control already in the table rather
     * than a second control. The row exists so the reader sees where a
     * milestone's *reached* state comes from, and `writes` adds nothing new.
     */
    needs: { records: ['goal'] },
    writes: ['goal'],
  },
  {
    id: 'course-reflection',
    surface: 'domain-page',
    gesture: 'how much of a finished course is left',
    builder: 'progress.courseReflectionRecord',
    needs: { records: ['thread'] },
    writes: ['outcome'],
  },
  {
    id: 'withdraw-event',
    surface: 'domain-page',
    gesture: 'This did not happen',
    builder: 'corrections.withdrawEventRecord',
    needs: { records: ['action-completion'] },
    writes: ['correction'],
  },
  {
    id: 'redate-event',
    surface: 'domain-page',
    gesture: 'It was a different day',
    builder: 'corrections.redateEventRecord',
    /*
     * It supersedes an entry with the same entry, dated correctly — so it can
     * only ever produce a kind that was already reachable, and `writes` says
     * exactly that rather than claiming a new route.
     */
    needs: { records: ['action-completion'] },
    writes: ['action-completion'],
  },
  {
    id: 'permission',
    surface: 'domain-page',
    gesture: 'Allow Private / Sexual Health to influence recommendations',
    builder: 'corrections.permissionRecord',
    needs: {},
    writes: ['permission'],
  },
  {
    id: 'discovery',
    surface: 'insights',
    gesture: 'the second agenda’s question, answered or left',
    builder: 'discovery.discoveryResponseRecord',
    needs: {},
    writes: ['discovery-response'],
  },
  {
    id: 'discovery-answer',
    surface: 'insights',
    gesture: 'answering the second agenda',
    builder:
      'authoring.destinationRecords, authoring.milestoneFor, authoring.authoringRecords, authoring.reviseDestinationRecord, interpret.aimReadingRecord',
    /*
     * The same builders as the domain page's controls and a different control,
     * which is what the per-screen rule is for — QA-83-003's second finding
     * exactly. Two screens calling one builder are two controls.
     */
    needs: {},
    writes: [
      'destination',
      'aim-reading',
      'goal',
      'explicit-fact',
      'commitment',
      'commitment-window',
    ],
  },
]

/**
 * Record kinds nothing in the product writes, and which are therefore not
 * evidence of a missing owner control.
 *
 * Two, and both are the schema being wider than the app. `decision` is reserved
 * and emitted by nothing; `imported-legacy-record` is what the legacy importer
 * quarantines a foreign row as, which is a file arriving rather than an owner
 * saying something.
 *
 * **It stayed at two through routing 84**, which is worth saying: the four
 * kinds that had no route — `constraint`, `goal`, `commitment` and
 * `relationship-event` — were closed by building controls for them, not by
 * moving them onto this list.
 */
export const NOT_OWNER_AUTHORED: readonly RecordKind[] = ['decision', 'imported-legacy-record']

/**
 * Entity kinds an owner can bring into being — routing 84, package 3.
 *
 * It was empty, and the emptiness was the largest single finding in the
 * owner-use review: no control on any screen called `createEntity`, so the only
 * entities that existed without an import were `STANDING_ENTITIES` — the five
 * routines the engine is allowed to name for itself.
 *
 * Eight now, and every one of them comes from the same control. Five are the
 * authorable kinds that become entities (`obligation` becomes a span of the
 * week rather than a thing in the world, so it has none), and three are what a
 * destination makes: the destination itself, and the domain-appropriate work
 * entity its milestone becomes — a learning topic in Career, a financial goal
 * in Money, a routine in Health.
 */
export const OWNER_CREATABLE_ENTITY_KINDS: readonly EntityKind[] = [
  'goal',
  'routine',
  'person',
  'place',
  'skill',
  'destination',
  'learning-topic',
  'financial-goal',
]

/**
 * Which record kinds an ordinary owner can reach, from a store with nothing in
 * it, by tapping.
 *
 * A fixpoint rather than a list: a route fires once everything it needs is
 * reachable, and what it writes becomes reachable in turn. Two consequences
 * fall out of it rather than being asserted — `outcome` is reachable because a
 * completion is, and `goal` is not, because the only control that writes one
 * needs one.
 */
export function reachableRecordKinds(): ReadonlySet<RecordKind> {
  const reachable = new Set<RecordKind>()
  const creatable = new Set<EntityKind>(OWNER_CREATABLE_ENTITY_KINDS)
  let grew = true
  while (grew) {
    grew = false
    for (const route of OWNER_ROUTES) {
      if ((route.needs.records ?? []).some((kind) => !reachable.has(kind))) continue
      if ((route.needs.entities ?? []).some((kind) => !creatable.has(kind))) continue
      for (const kind of route.writes) {
        if (reachable.has(kind)) continue
        reachable.add(kind)
        grew = true
      }
    }
  }
  return reachable
}

/**
 * The record kinds an owner has no route to at all.
 *
 * Computed rather than listed, so adding a control to a screen narrows it
 * automatically and removing one widens it. A kind that appears here is a shape
 * of fact the app can read, reason over and render — and that only a fixture,
 * an import or a restore can put into the store.
 */
export function recordKindsWithNoOwnerRoute(): readonly RecordKind[] {
  const reachable = reachableRecordKinds()
  return RECORD_KINDS.filter((kind) => !reachable.has(kind) && !NOT_OWNER_AUTHORED.includes(kind))
}
// ---------------------------------------------------------------------------
// The journey, and where it stops
// ---------------------------------------------------------------------------

/** The eight steps D-161 names, in order. */
export const JOURNEY_STEPS = [
  'unknown-aspiration',
  'discovery',
  'object-creation',
  'real-action',
  'interruption',
  'concrete-outcome',
  'correction',
  'changed-recommendation',
] as const

export type JourneyStep = (typeof JOURNEY_STEPS)[number]

export interface JourneyStop {
  readonly step: JourneyStep
  /** What an ordinary owner was trying to do, in his words rather than the code's. */
  readonly trying: string
  /** Whether the journey got past this step through an ordinary control. */
  readonly proceeded: boolean
  /**
   * The control that carried it, or the reason there is none.
   *
   * Never a guess: on a step that proceeded this names the route in
   * `OWNER_ROUTES` that carried it, and on one that did not it names what was
   * looked for and what was found instead.
   */
  readonly note: string
}

// ---------------------------------------------------------------------------
// The app, driven the way the owner drives it
// ---------------------------------------------------------------------------

export interface GestureResult {
  /** Whether the control existed and the record was accepted. */
  readonly done: boolean
  readonly note: string
  readonly written: number
}

export interface JourneyApp {
  readonly zone: TimeZoneId
  now(): Instant
  dayId(): LocalDayId
  /** Look at Now and count what was on it, the way a surface does — AUD-0025. */
  visit(): Decision
  /** What has been put in front of him today, as the engine will read it. */
  shown(): readonly ShownMove[]
  records(): number
  snapshot(): StoreSnapshot
  view(): MemoryView
  situation(): Situation
  decision(): Decision
  guide(): GuideStep
  domainPage(slug: string): DomainPageData
  /** Move the owner-local clock. Nothing is written; the history is re-read. */
  travelDays(days: number): void
  travelMinutes(minutes: number): void
  travelTo(at: Instant): void
  /** Tap one of the guide's answers. `option` is its id, or the first one. */
  answerGuide(option?: string): Promise<GestureResult>
  /** Tap a lifecycle control on the move currently on Now. */
  act(action: LifecycleAction, reason?: string): Promise<GestureResult>
  /** Answer the result follow-up, if one is due. */
  answerOutcome(answer: OutcomeAnswer): Promise<GestureResult>
  /**
   * Give the reading the app asked for instead of a grade — D-089.
   *
   * `NowScreen` wires the reading step of the result panel straight to
   * `answerGuide`, because what it is asking for is a fact rather than an
   * opinion about a move. This does the same, from the same option list.
   */
  answerReading(option?: string): Promise<GestureResult>
  pendingOutcome(): PendingOutcome | undefined
  /** Correct a fact from its own row on a domain page. */
  correctFact(concept: ConceptId, value: FactValue): Promise<GestureResult>
  /** Append records the way the surfaces do, for a gesture with no helper here. */
  append(records: readonly CanonicalRecord[]): Promise<GestureResult>
  /**
   * Introduce something, the way the authoring control does — routing 84.
   *
   * Entities first and records second, which is the order `MemoryProvider.create`
   * writes them in and the order matters: a record whose subject is not in the
   * index yet is a renderer with nothing to name, and D-018 makes that a
   * refusal to say anything rather than a fallback word.
   */
  appendAuthored(result: AuthoringResult): Promise<GestureResult>

  // -------------------------------------------------------------------------
  // Routing 84's own gestures, each the surface's own call
  // -------------------------------------------------------------------------

  /**
   * Say what he is aiming at, the way the domain page's control does.
   *
   * `askedIn` is the page the form was on, and it is what makes this the
   * control rather than the builder: the panel reads the words against the area
   * he is standing in, and where the reading names somewhere else and he takes
   * the offer, `draft.domain` is that somewhere and a derived sibling row goes
   * in beside the aim (routing 91). Left out, this is routing 84's gesture
   * exactly.
   */
  nameDestination(draft: DestinationDraft, askedIn?: LifeDomainId): Promise<GestureResult>
  /** What the domain page's aspiration form would read in those words. */
  destinationReading(askedIn: LifeDomainId, aim: string): AimReading | undefined
  /**
   * Take a reading back, the way the destination's own row does — routing 91.
   *
   * **One gesture, the whole chain**, because that is what one press does there
   * after QA-91-002: the reading is withdrawn, the aim goes back to the area the
   * question was asked in, **and every milestone under it is re-filed with it**.
   * The first version of this helper stopped after the first two records, which
   * is exactly the half-gesture that let the money move survive a withdrawal
   * while two tests called it reversible.
   */
  withdrawReading(destination: EntityRef): Promise<GestureResult>
  /**
   * Take an offer the card was declined, from the object's own row — QA-91-001.
   *
   * The route back that did not exist. Same shape as the withdrawal and the
   * same builders, in the other direction.
   */
  acceptReading(destination: EntityRef): Promise<GestureResult>
  /** Introduce a goal, routine, person, place, skill or obligation. */
  introduce(draft: AuthoringDraft): Promise<GestureResult>
  /** Name the next step on a destination that already exists. */
  addMilestone(
    destination: EntityRef,
    domain: LifeDomainId,
    statement: string,
  ): Promise<GestureResult>
  /** What the second agenda would ask next, if anything. */
  agenda(): DiscoveryAgenda
  /**
   * What the card would show him before he pressed anything — D-188.
   *
   * `undefined` where the shape has no proposal of its own, which is how the
   * surface decides too.
   */
  discoveryProposal(said: string, takeOffer?: boolean): AuthoringProposal | undefined
  /**
   * What the card read in those words — routing 91.
   *
   * The reading itself rather than the sentence about it, so a test can assert
   * on {@link AimReading.input} — the digest the interpreter was handed — which
   * is what acceptance test 8 asks for and what no amount of reading rendered
   * copy can establish.
   */
  discoveryReading(said: string): AimReading | undefined
  /**
   * Answer whatever the second agenda is asking, the way Insights does.
   *
   * **Every shape, not only a destination.** It used to run
   * `proposeDestination` whatever was being asked, so answering the next-step
   * question would have written a second aspiration — the instrument modelling
   * a control that does not exist, while the card beside it branched on four
   * shapes. `Discovery.tsx`'s own `build` is what this mirrors, branch for
   * branch.
   *
   * `takeOffer` is the owner pressing *File it in … instead*. Left out, the aim
   * is filed where the question was, which is what the card does until he says
   * otherwise.
   */
  answerDiscovery(said: string, takeOffer?: boolean): Promise<GestureResult>
  /** Leave it, the way "Not now" does. */
  skipDiscovery(): Promise<GestureResult>
  /** Whether the app would ask what was in the way, and why either way. */
  blockerFor(): BlockerDecision | undefined
  /** Say what was in the way, the way Now's control does. */
  sayWhatBlocked(cause: BlockerCause): Promise<GestureResult>
  /** Something left half-finished today that the screen offers back. */
  resumable(): ResumableMove | undefined
  /** Pick it back up, through the state machine's own transition. */
  resume(action: LifecycleAction): Promise<GestureResult>
  /** Withdraw an entry, the way the correction control does. */
  withdraw(record: RecordId, reason: string): Promise<GestureResult>
  /** Move an entry to the day it happened. */
  redate(record: RecordId, to: LocalDayId): Promise<GestureResult>
  /** What the app can say about progress here, sorted onto its six rungs. */
  progress(domains: readonly LifeDomainId[]): ProgressReading
  /** Start the course being offered beside the move on Now, if one is. */
  startCourse(): Promise<GestureResult>
  /** The question a finished course is being asked, if any. */
  courseQuestion(): CourseReflection | undefined
  /** Answer it, the way the domain page's control does. */
  answerCourse(answer: OutcomeAnswer, domain: LifeDomainId): Promise<GestureResult>
  /**
   * Answer the agenda's weekly-commitment question the way Insights does.
   *
   * The surface's own call, with the surface's own arguments — which is the
   * rule this whole file exists to keep, and the rule the first proof of gate
   * item 4 broke by reaching for the generic authoring builder instead.
   */
  answerAgendaCommitment(
    name: string,
    startsAt: number,
    weekday: IsoWeekday,
  ): Promise<GestureResult>
  /** Every entry on this history, worded the way every surface words it. */
  describeEvents(): readonly string[]
}

/**
 * Open one of the library's histories and use it.
 *
 * The document goes through `snapshotFromWire` and into a real
 * `createMemoryStore`, so every append takes the path a tap takes — including
 * `planAppend`'s all-or-nothing rule, which is what makes a rejected gesture
 * visible here rather than silently half-applied.
 */
export async function openJourney(scenarioId: string): Promise<JourneyApp> {
  const scenario = scenarioById(scenarioId)
  if (scenario === undefined) throw new Error(`No synthetic scenario called "${scenarioId}"`)

  const loaded = snapshotFromWire(scenario.build())
  expect(loaded.loaded, `${scenarioId} should load`).toBe(true)

  const store = createMemoryStore(loaded.snapshot)
  let held = await store.snapshot()
  let at = scenario.now
  const zone = scenario.zone

  /**
   * What has already been put in front of him today — AUD-0025.
   *
   * The ledger is the **surface's**, and it reaches the engine as an argument
   * (D-043): `src/intelligence/` is pure and clock-free, so a runner that wants
   * to reproduce four visits to one day has to keep one the way
   * `MemoryProvider` does. Without it every visit looked like the first, and the
   * one owner-contract item about repeating itself could not be walked at all.
   *
   * A count per (move, owner-local day), incremented once per **distinct
   * moment** — the same rule `noteShown` follows, and the reason the contract
   * says to advance the clock between visits.
   */
  const shownLedger = new Map<string, ShownMove>()

  /**
   * Today's rows and no others, which is what a reader actually gets.
   *
   * `openShownStore` drops every other day when it is read, so the provider hands
   * the engine one day's counts however long the phone sat closed. A runner that
   * kept them all would be reasoning from a ledger no surface can produce, and
   * the one contract item about repeating itself would be walked against the
   * wrong shape.
   */
  const todaysShown = (): readonly ShownMove[] => {
    const dayId = localDayIdAt(at, zone)
    return [...shownLedger.values()].filter((entry) => entry.dayId === dayId)
  }

  const moment = () => ({
    now: at,
    zone,
    weekStartsOn: 1 as const,
    shown: todaysShown(),
  })
  const view = () => buildView(held, moment())
  const situation = () => assembleSituation(view(), moment())
  const decision = () => decide(view(), moment())

  /** What `NowScreen` does the moment a move is rendered — AUD-0025. */
  const noteShown = (move: string): void => {
    const dayId = localDayIdAt(at, zone)
    const key = `${move}|${dayId}`
    const held = shownLedger.get(key)
    if (held !== undefined && held.at === at) return
    shownLedger.set(key, { move, dayId, at, count: (held?.count ?? 0) + 1 })
  }

  /*
   * The real clock, not the moment being reasoned about — D-037.
   *
   * `recordedAt` is what separates two events in one session, and every surface
   * passes `systemClock().now()` for it. A runner that passed the scenario's
   * own instant would collapse the two, and "the answer you gave last" would
   * fall through to a record id that carries no meaning by design.
   */
  /** The moment every routing-84 gesture is written at, the way a surface does. */
  const authoringMoment = () => ({ now: at, zone, recordedAt: systemClock().now() })

  /**
   * The `goal` records under one aim that the app is still acting on.
   *
   * From the resolved destination rather than by scanning for `milestoneOf`, so
   * the instrument and the page agree about what a milestone of this aim is —
   * and skipping the reached and the already-set-aside, because there is nothing
   * to stop suggesting about either. `DomainPage.liveMilestonesOf` is what this
   * mirrors, condition for condition.
   */
  const liveMilestonesUnder = (destination: EntityRef): readonly GoalRecord[] => {
    const found = situation().direction.destinations.find(
      (entry) => entry.destination.id === destination.id,
    )
    const out: GoalRecord[] = []
    for (const milestone of found?.milestones ?? []) {
      if (milestone.reached || milestone.setAside) continue
      const record = view().history.byId(milestone.goal.source)
      if (record !== undefined && record.kind === 'goal') out.push(record)
    }
    return out
  }

  const write = async (records: readonly CanonicalRecord[], note: string) => {
    if (records.length === 0) return { done: false, note, written: 0 }
    const result = await store.append(records)
    held = await store.snapshot()
    if (result.rejected.length > 0) {
      return { done: false, note: `${note} — rejected: ${result.rejected[0]!.problem}`, written: 0 }
    }
    return { done: true, note, written: result.appended }
  }

  return {
    zone,
    now: () => at,
    dayId: () => localDayIdAt(at, zone),
    /**
     * Look at Now, and count what was on it — AUD-0025.
     *
     * A visit rather than a read: `decision()` alone leaves no trace, and the
     * repetition rule is about how many separate times a move has been **put in
     * front of him**. Advancing the clock between visits is what makes two of
     * them two.
     */
    visit() {
      const current = decide(view(), moment())
      const shown = current.evaluation?.candidate.id
      if (shown !== undefined) noteShown(shown)
      return current
    },
    shown: () => todaysShown(),
    records: () => held.records.length,
    snapshot: () => held,
    view,
    situation,
    decision,
    guide: () => nextGuideStep(view(), moment()),
    domainPage(slug) {
      const page = pageBySlug(slug)
      if (page === undefined) throw new Error(`No Life page called "${slug}"`)
      return assembleDomainPageData(situation(), page)
    },
    travelDays(days) {
      at = addLocalDays(at, days, zone)
    },
    travelMinutes(minutes) {
      at = (at + minutes * 60_000) as Instant
    },
    travelTo(next) {
      at = next
    },

    async answerGuide(option) {
      const step = nextGuideStep(view(), moment())
      if (step.kind !== 'question' || step.question === undefined) {
        return { done: false, note: `the guide is not asking — ${step.because}`, written: 0 }
      }
      const chosen =
        option === undefined
          ? step.question.options[0]
          : step.question.options.find((entry) => entry.id === option)
      if (chosen === undefined) {
        return { done: false, note: `no answer called "${option ?? ''}"`, written: 0 }
      }
      return write(
        [
          answerRecord(step.question.spec, chosen, {
            now: at,
            zone,
            recordedAt: systemClock().now(),
          }),
        ],
        `answered "${step.question.prompt}" with "${chosen.label}"`,
      )
    },

    async act(action, reason) {
      const current = decision()
      const explanation = current.explanation
      if (explanation === undefined || current.kind !== 'move') {
        return { done: false, note: 'there is no move on Now to act on', written: 0 }
      }
      const allowed = availableActions(current.state ?? 'shown')
      if (!allowed.includes(action)) {
        return {
          done: false,
          note: `"${action}" is not offered — the move reads as ${current.state ?? 'shown'}`,
          written: 0,
        }
      }
      const planned = planLifecycle({
        view: view(),
        situation: current.situation,
        semantics: explanation.semantics,
        action,
        recordedAt: systemClock().now(),
        ...(reason === undefined ? {} : { reason }),
      })
      if (planned.noChange !== undefined) {
        return { done: false, note: `nothing to write — ${planned.noChange}`, written: 0 }
      }
      return write(planned.records, `tapped "${action}" on "${explanation.rendered.sentence}"`)
    },

    pendingOutcome() {
      return nextDueOutcome(view(), moment(), situation().entities)
    },

    async answerOutcome(answer) {
      const pending = nextDueOutcome(view(), moment(), situation().entities)
      if (pending === undefined) {
        return { done: false, note: 'no result is being asked about', written: 0 }
      }
      const question = pending.questions[0]
      if (question === undefined) {
        return { done: false, note: 'the result follow-up has no question left', written: 0 }
      }
      return write(
        [
          outcomeRecord(pending.episode, question.aspect, answer, {
            now: at,
            zone,
            recordedAt: systemClock().now(),
          }),
        ],
        `answered "${question.prompt}"`,
      )
    },

    async answerReading(option) {
      const pending = nextDueOutcome(view(), moment(), situation().entities)
      if (pending?.reading === undefined) {
        return { done: false, note: 'no reading is being asked for', written: 0 }
      }
      const spec = questionFor(pending.reading)
      if (spec === undefined) {
        return { done: false, note: `nothing can ask for "${pending.reading}"`, written: 0 }
      }
      const options = spec.options(situation())
      const chosen =
        option === undefined ? options[0] : options.find((entry) => entry.id === option)
      if (chosen === undefined) {
        return { done: false, note: `no answer called "${option ?? ''}"`, written: 0 }
      }
      return write(
        [answerRecord(spec, chosen, { now: at, zone, recordedAt: systemClock().now() })],
        `gave the reading "${spec.prompt(situation())}" as "${chosen.label}"`,
      )
    },

    async correctFact(concept, value) {
      const current = situation()
      const definition = current.concepts.definitionFor(concept)
      const record =
        definition.freshness.unit === 'durable'
          ? contextCorrectionRecord(
              { concept, value, durability: 'durable' },
              { now: at, zone, recordedAt: systemClock().now() },
            )
          : factCorrectionRecord(concept, value, {
              now: at,
              zone,
              recordedAt: systemClock().now(),
            })
      return write([record], `corrected "${definition.label}"`)
    },

    append: (records) => write(records, 'appended'),

    async appendAuthored(result) {
      if (result.entities.length === 0 && result.records.length === 0) {
        return { done: false, note: 'the draft could not be built', written: 0 }
      }
      await store.putEntities(result.entities)
      held = await store.snapshot()
      return write(result.records, `introduced ${result.created?.id ?? 'something'}`)
    },

    destinationReading(askedIn, aim) {
      return aim.trim() === '' ? undefined : readAimIn(aim.trim(), askedIn, situation())
    },

    async withdrawReading(destination) {
      const previous = readingFor(view(), destination, at)
      if (previous === undefined) {
        return { done: false, note: 'nothing was read about this aim', written: 0 }
      }
      const record = view().history.byId(previous.reads)
      if (record === undefined || record.kind !== 'destination') {
        return { done: false, note: 'the reading points at no aim', written: 0 }
      }
      const moment = authoringMoment()
      return write(
        [
          withdrawAimReading(previous, moment),
          reviseDestinationRecord(record, { domain: previous.askedIn }, moment),
          ...liveMilestonesUnder(destination).map((goal) => setMilestoneAside(goal, moment)),
        ],
        `took back the reading of "${record.aim}"`,
      )
    },

    async acceptReading(destination) {
      const found = situation().direction.destinations.find(
        (entry) => entry.destination.id === destination.id,
      )
      if (found === undefined) return { done: false, note: 'no such aim', written: 0 }
      if (readingFor(view(), destination, at) !== undefined) {
        return { done: false, note: 'a reading already stands here', written: 0 }
      }
      const reading = readAimIn(found.aim, found.domain, situation())
      const into = reading.offer
      if (into === undefined) {
        return { done: false, note: 'these words name nowhere else', written: 0 }
      }
      const record = view().history.byId(found.source)
      if (record === undefined || record.kind !== 'destination') {
        return { done: false, note: 'the aim has no record', written: 0 }
      }
      const moment = authoringMoment()
      return write(
        [
          reviseDestinationRecord(record, { domain: into }, moment),
          aimReadingRecord(reading, into, destination, record.id, moment),
          ...liveMilestonesUnder(destination).map((goal) => setMilestoneAside(goal, moment)),
        ],
        `took the offer on "${found.aim}"`,
      )
    },

    async nameDestination(draft, askedIn) {
      const moment = authoringMoment()
      const built = destinationRecords(draft, situation(), moment)
      if (built.records.length === 0) {
        return { done: false, note: 'the destination could not be built', written: 0 }
      }
      const from = askedIn ?? draft.domain
      const reading =
        draft.aim.trim() === '' ? undefined : readAimIn(draft.aim.trim(), from, situation())
      const source = built.records[0]
      const records =
        reading === undefined || from === draft.domain || source === undefined
          ? built.records
          : [
              ...built.records,
              aimReadingRecord(
                reading,
                draft.domain,
                built.created ?? destinationRef(draft.aim.trim()),
                source.id,
                moment,
              ),
            ]
      await store.putEntities(built.entities)
      held = await store.snapshot()
      return write(records, `said he is aiming at "${draft.aim}"`)
    },

    async introduce(draft) {
      const proposal = proposeAuthoring(draft, situation())
      if (proposal.problems.length > 0) {
        return { done: false, note: proposal.problems.join('; '), written: 0 }
      }
      const built = authoringRecords(draft, situation(), authoringMoment())
      await store.putEntities(built.entities)
      held = await store.snapshot()
      return write(built.records, `introduced a ${draft.kind}: "${draft.name}"`)
    },

    async addMilestone(destination, domain, statement) {
      const built = milestoneFor(destination, domain, statement, situation(), authoringMoment())
      if (built.records.length === 0) {
        return { done: false, note: 'the milestone could not be built', written: 0 }
      }
      await store.putEntities(built.entities)
      held = await store.snapshot()
      return write(built.records, `named "${statement}" as the next step`)
    },

    agenda: () => discoveryAgenda(situation(), { now: at, zone, weekStartsOn: 1 }),

    discoveryReading(said) {
      const asked = discoveryAgenda(situation(), { now: at, zone, weekStartsOn: 1 }).prompt
      if (asked === undefined || asked.shape !== 'destination' || said.trim() === '') {
        return undefined
      }
      return readAimIn(said.trim(), asked.domain, situation())
    },

    discoveryProposal(said, takeOffer) {
      const asked = discoveryAgenda(situation(), { now: at, zone, weekStartsOn: 1 }).prompt
      if (asked === undefined || asked.shape !== 'destination') return undefined
      if (said.trim() === '') {
        return proposeDestination({ aim: said.trim(), domain: asked.domain }, situation())
      }
      const reading = readAimIn(said.trim(), asked.domain, situation())
      const into = takeOffer === true ? (reading.offer ?? asked.domain) : asked.domain
      return proposeInterpretedDestination({ aim: said.trim(), domain: into }, reading, situation())
    },

    async answerDiscovery(said, takeOffer) {
      const asked = discoveryAgenda(situation(), { now: at, zone, weekStartsOn: 1 }).prompt
      if (asked === undefined) return { done: false, note: 'nothing is being asked', written: 0 }
      const moment = authoringMoment()
      const trimmed = said.trim()
      if (trimmed === '') return { done: false, note: 'nothing was typed', written: 0 }

      /*
       * The four shapes the card actually branches on, in its own order.
       *
       * A destination goes through the proposal (D-188); a next step goes
       * through `milestoneFor`, because re-running the destination builder
       * would write a second aspiration carrying the same aim; a baseline and a
       * *what would count* revise the record they belong to.
       */
      let built: AuthoringResult | undefined
      if (asked.shape === 'destination') {
        const reading = readAimIn(trimmed, asked.domain, situation())
        const into = takeOffer === true ? (reading.offer ?? asked.domain) : asked.domain
        const proposed = proposeInterpretedDestination(
          { aim: trimmed, domain: into },
          reading,
          situation(),
        )
        if (proposed.problems.length > 0) {
          return { done: false, note: proposed.problems.join('; '), written: 0 }
        }
        const made = destinationRecords({ aim: said, domain: into }, situation(), moment)
        const source = made.records[0]
        built =
          into === asked.domain || source === undefined
            ? made
            : {
                ...made,
                records: [
                  ...made.records,
                  aimReadingRecord(
                    reading,
                    into,
                    made.created ?? destinationRef(trimmed),
                    source.id,
                    moment,
                  ),
                ],
              }
      } else if (asked.shape === 'milestone') {
        const destination = asked.destination
        if (destination === undefined) {
          return { done: false, note: 'the question names no destination', written: 0 }
        }
        built = milestoneFor(destination.destination, asked.domain, trimmed, situation(), moment)
      } else {
        const held_ =
          asked.destination === undefined
            ? undefined
            : view().history.byId(asked.destination.source)
        if (held_ === undefined || held_.kind !== 'destination') {
          return { done: false, note: 'the question names no destination record', written: 0 }
        }
        built = {
          entities: [],
          records: [
            reviseDestinationRecord(
              held_,
              asked.shape === 'baseline' ? { baseline: trimmed } : { evidence: [trimmed] },
              moment,
            ),
          ],
          created: undefined,
        }
      }

      if (built === undefined || built.records.length === 0) {
        return { done: false, note: 'the answer produced nothing', written: 0 }
      }
      await store.putEntities(built.entities)
      held = await store.snapshot()
      return write(
        [
          ...built.records,
          discoveryResponseRecord(asked, 'answered', built.records[0]?.id, moment),
        ],
        `answered "${asked.prompt}"`,
      )
    },

    async skipDiscovery() {
      const asked = discoveryAgenda(situation(), { now: at, zone, weekStartsOn: 1 }).prompt
      if (asked === undefined) return { done: false, note: 'nothing is being asked', written: 0 }
      return write(
        [discoveryResponseRecord(asked, 'skipped', undefined, authoringMoment())],
        `left "${asked.prompt}"`,
      )
    },

    /*
     * About the move he just said he could not do, not about whatever came
     * next — which is what `NowScreen` does.
     *
     * The refused move leaves the screen immediately, because a move blocked in
     * this block is out of the running for it (AUD-0023). So the question has
     * to be about the move he pressed, and the surface holds it in session
     * state for exactly that reason. Here the same thing is read from the
     * record: the most recently settled unfinished move of today.
     */
    blockerFor() {
      const current = situation()
      const semantics =
        resumableToday(view(), current)[0]?.semantics ?? decision().explanation?.semantics
      if (semantics === undefined) return undefined
      return blockerQuestionFor(
        current,
        semantics,
        current.entities.labelFor(semantics.target.object) ?? 'this',
      )
    },

    async sayWhatBlocked(cause) {
      const current = situation()
      const found = resumableToday(view(), current)[0]
      if (found === undefined) {
        return { done: false, note: 'nothing was recorded as not fitting', written: 0 }
      }
      const semantics = found.semantics
      const moveName = current.entities.labelFor(semantics.target.object) ?? 'this'
      const moment = authoringMoment()
      let written: CanonicalRecord | undefined
      for (const record of view().history.effective) {
        if (record.kind !== 'action-unable-now') continue
        if (record.recommendation !== found.episode.recommendation) continue
        if (written === undefined || record.recordedAt > written.recordedAt) written = record
      }
      if (written === undefined || written.kind !== 'action-unable-now') {
        return { done: false, note: 'no inability record to attach a reason to', written: 0 }
      }
      return write(
        [
          {
            ...written,
            id: newRecordId(),
            recordedAt: moment.recordedAt,
            blocker: blockerStatement(cause, moveName),
            supersedes: written.id,
          },
          ...standingBlockerRecords(cause, semantics, moveName, semantics.domain, moment),
        ],
        `said what was in the way: ${cause}`,
      )
    },

    resumable: () => nextResumable(view(), situation(), undefined),

    async resume(action) {
      const found = nextResumable(view(), situation(), undefined)
      if (found === undefined) {
        return { done: false, note: 'nothing is offered back', written: 0 }
      }
      if (!found.actions.includes(action)) {
        return {
          done: false,
          note: `"${action}" is not offered on a move that reads as ${found.state}`,
          written: 0,
        }
      }
      const planned = planLifecycle({
        view: view(),
        situation: situation(),
        semantics: found.semantics,
        action,
        recordedAt: systemClock().now(),
      })
      if (planned.noChange !== undefined) {
        return { done: false, note: `nothing to write — ${planned.noChange}`, written: 0 }
      }
      return write(planned.records, `picked it back up with "${action}"`)
    },

    withdraw: (record, reason) =>
      write([withdrawEventRecord(record, reason, authoringMoment())], 'withdrew an entry'),

    redate(record, to) {
      const found = view().history.byId(record)
      if (found === undefined) {
        return Promise.resolve({ done: false, note: 'no such entry', written: 0 })
      }
      return write([redateEventRecord(found, to, authoringMoment())], 'moved an entry')
    },

    progress: (domains) => readProgress(situation(), domains),

    async answerAgendaCommitment(name, startsAt, weekday) {
      const asked = discoveryAgenda(situation(), {
        now: at,
        zone,
        weekStartsOn: 1,
      }).outstanding.find((prompt) => prompt.shape === 'obligation')
      if (asked === undefined) {
        return { done: false, note: 'the agenda is not asking about the week', written: 0 }
      }
      const moment = authoringMoment()
      const built = authoringRecords(
        {
          kind: 'obligation',
          name,
          domain: asked.domain,
          startsAt,
          endsAt: startsAt + 60,
          weekdays: [weekday],
        },
        situation(),
        moment,
      )
      if (built.records.length === 0) {
        return { done: false, note: 'the answer built nothing', written: 0 }
      }
      return write(
        [
          ...built.records,
          discoveryResponseRecord(asked, 'answered', built.records[0]?.id, moment),
        ],
        `answered "${asked.prompt}"`,
      )
    },

    describeEvents() {
      const current = situation()
      const context = {
        entities: current.entities,
        history: current.view.history,
        concepts: current.concepts,
        domains: current.domains,
        policy: { surface: 'inspection' as const, revealPrivate: false },
      }
      const out: string[] = []
      for (const record of current.view.history.effective) {
        const described = describeRecord(record, context)
        if (described !== undefined) out.push(described.text)
      }
      return out
    },

    async startCourse() {
      const current = decision()
      const target = current.explanation?.semantics.target
      if (target === undefined) return { done: false, note: 'no move on screen', written: 0 }
      const offer = threadOfferFor(
        current.situation.threads,
        target,
        current.situation.entities.labelFor(target.object) ?? '',
        // The span the offer is for — AUD-0009. `NowScreen` passes the same
        // reading, and a recovery run with nothing behind it is not offered at
        // all rather than offered at a length nobody decided.
        current.situation.capacity.recoveryNights,
      )
      if (offer === undefined) return { done: false, note: 'no course is offered', written: 0 }
      return write(
        [
          startThreadRecord(
            {
              kind: offer.kind,
              subject: offer.subject,
              subjectLabel: offer.subjectLabel,
              domain: offer.domain,
              steps: offer.steps,
              intent: offer.intent,
            },
            { now: at, zone, recordedAt: systemClock().now() },
          ),
        ],
        `started the ${offer.kind}`,
      )
    },

    courseQuestion: () => nextCourseReflection(situation()),

    async answerCourse(answer, domain) {
      const asked = nextCourseReflection(situation())
      if (asked === undefined) {
        return { done: false, note: 'no course is being asked about', written: 0 }
      }
      return write(
        [courseReflectionRecord(asked, answer, domain, authoringMoment())],
        `answered "${asked.prompt}"`,
      )
    },
  }
}

/*
 * Imported so the route table above is checked by the compiler rather than by
 * a reader: a builder that is renamed or deleted fails the build here, and the
 * table stops being a claim about source that source can quietly leave behind.
 */
export const ROUTE_BUILDERS = {
  answerRecord,
  checkInRecord,
  checkInSettingRecord,
  authoringRecords,
  destinationRecords,
  milestoneFor,
  reviseDestinationRecord,
  relationshipEventRecord,
  standingBlockerRecords,
  courseReflectionRecord,
  withdrawEventRecord,
  redateEventRecord,
  permissionRecord,
  discoveryResponseRecord,
  planLifecycle,
  outcomeRecord,
  growthAnswerRecords,
  beliefCorrectionRecord,
  forbidRecord,
  startThreadRecord,
  threadOfferFor,
  factCorrectionRecord,
  contextCorrectionRecord,
  domainStatusCorrectionRecord,
  coverageInterpretationRecord,
  goalCorrectionRecord,
  growthStageRecord,
  liftVetoRecord,
  commitmentWindowRecord,
  reviseCommitmentWindowRecord,
  removeCommitmentWindowRecord,
} as const

// ---------------------------------------------------------------------------
// What the screens actually call — QA-83-003
// ---------------------------------------------------------------------------

const ROOT = join(import.meta.dirname, '..', '..')

/**
 * Every record builder an owner-facing screen calls.
 *
 * The half of `OWNER_ROUTES` that can be checked. What a control *needs*
 * before it appears is a reading of the screen and stays hand-written; **which
 * builders the screens call is a fact about the files**, and a table claiming
 * to list every control can be held to it.
 *
 * The first version of the table said "every" and was compiled by reading four
 * files. There are five, and it missed the course controls on Life and the
 * belief correction on Insights — with a green test above it called "keeps the
 * route table honest" that compared the table against nothing at all.
 */
export interface ReachedBuilder {
  readonly builder: string
  /** Repository-relative, so a failure names the file to go and read. */
  readonly file: string
  /** The screen it is on, which is what makes the check per-control. */
  readonly surface: OwnerRoute['surface'] | 'not-a-control'
}

export function everyBuilderReachedFromAFeature(): readonly ReachedBuilder[] {
  const builders = everyRecordBuilder()
  const out: ReachedBuilder[] = []
  const seen = new Set<string>()

  for (const file of filesUnder(join(ROOT, 'src', 'features'))) {
    const relative = relativeToRoot(file)
    const code = withoutComments(readFileSync(file, 'utf8'))
    for (const match of code.matchAll(/([A-Za-z0-9_]+)\s*\(/g)) {
      const builder = match[1]
      if (builder === undefined || !builders.has(builder)) continue
      const key = `${relative}|${builder}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ builder, file: relative, surface: surfaceOf(relative) })
    }
  }
  return out.sort((a, b) => `${a.file}${a.builder}`.localeCompare(`${b.file}${b.builder}`))
}

/**
 * Which screen a file is, so the guard is about controls rather than builders.
 *
 * A per-builder check cannot see QA-83-003's second finding: `beliefCorrectionRecord`
 * was already listed under Now, so the Insights control that calls the same
 * builder was invisible to any check that only asked whether the *symbol*
 * appeared somewhere in the table. Two screens, one builder, two controls.
 */
function surfaceOf(file: string): ReachedBuilder['surface'] {
  if (file.includes('/now/')) return 'now'
  if (file.includes('/insights/')) return 'insights'
  if (file.endsWith('/DomainPage.tsx')) return 'domain-page'
  if (file.includes('/life/')) return 'life'
  // Routing 94's two, and they are two screens rather than one feature: the
  // ritual is its own destination, and the control that sizes it is a panel on
  // More, where every other setting in the app lives. Filing the panel under
  // `/checkin/` would have made this function say a control was on a screen the
  // owner cannot reach it from.
  if (file.includes('/checkin/')) return 'check-in'
  if (file.includes('/more/')) return 'more'
  // `MemoryProvider` writes derived outcomes on its own; see `NOT_A_CONTROL`.
  return 'not-a-control'
}

function relativeToRoot(file: string): string {
  return file.slice(ROOT.length).split(sep).join('/')
}

/**
 * Builders a feature calls that are **not** owner controls.
 *
 * One, and it is deliberate and documented where it happens. `MemoryProvider`
 * writes the outcomes a history already implies — the morning sleep reading
 * after an early night is the answer to a question the app would otherwise ask
 * — and it resolves D-043 rather than ignoring it: the ids are derived from the
 * episode, so there is at most one derived row per episode ever.
 *
 * Named here rather than filtered out silently, because a write nobody taps is
 * exactly the thing an instrument about *ordinary owner use* has to be honest
 * about not covering.
 */
export const NOT_A_CONTROL: readonly string[] = ['derivedOutcomeRecords']

/**
 * The one return type that is a set of records rather than a record.
 *
 * Named rather than pattern-matched, because "anything ending in `Result`" would
 * pick up half the codebase. A second bundle type is an edit here, with a
 * sentence saying why — the same discipline `ALLOWED_READERS` keeps.
 */
const BUNDLE = 'AuthoringResult'

/** Every record builder the app defines, found by what it returns and takes. */
function everyRecordBuilder(): ReadonlySet<string> {
  const out = new Set<string>()
  for (const layer of ['intelligence', 'domain', 'memory']) {
    for (const file of filesUnder(join(ROOT, 'src', layer))) {
      for (const name of buildersDeclaredIn(readFileSync(file, 'utf8'))) out.add(name)
    }
  }
  return out
}

/**
 * The exported functions in one file that build a record.
 *
 * Two conditions, and both are declarations rather than conventions.
 *
 * **It returns a record, or a bundle of them.** Not "its name ends in Record" —
 * `describeRecord`, `describeThreadRecord`, `isWithheldRecord` and
 * `sourcesOfRecords` all read records and build none, and a first draft of this
 * reported every one of them. `Record<string, unknown>` is excluded by the same
 * test: TypeScript's utility type is not a canonical record, and `isPlainObject`
 * is not a builder.
 *
 * **`AuthoringResult` is the bundle, and it had to be named** — routing 84. A
 * control that brings a semantic entity into being returns entities *and*
 * records together, because they are one act (an entity written after the
 * record that names it is a renderer with nothing to say). A reader that only
 * recognised a return type ending in `Record` could not see either of the two
 * highest-leverage controls in the phase — which is D-179's own failure mode,
 * in the guard D-179 was written for: the claim stayed green because the shape
 * it could not read was the shape that arrived.
 *
 * **And it takes a moment.** `standingCommitments(situation): readonly
 * CommitmentWindowRecord[]` returns records and builds none — it filters rows
 * already in the history. A return type says what comes out; a moment says the
 * rows are new. Every builder here takes one, because a record it invents needs
 * an `occurredAt` and a zone, and no reader does.
 *
 * The reading itself is {@link declaredIn}, whose parameter list is balanced
 * rather than pattern-matched: a lazy regex crossing from one `export function`
 * to the next reported `questionFor`, `describePremise` and `daysSincePractice`
 * as builders, having found some later function's return annotation.
 */
function buildersDeclaredIn(text: string): readonly string[] {
  return declaredIn(
    text,
    (returned, parameters) =>
      (/Record$/.test(returned) || returned === BUNDLE) && takesAMoment(parameters),
  )
}

/**
 * The exported functions in one file matching a test on what they declare.
 *
 * Lifted out of {@link buildersDeclaredIn} unchanged when the addendum's guard
 * needed the same reader for a different return type.
 */
function declaredIn(
  text: string,
  accept: (returned: string, parameters: string) => boolean,
): readonly string[] {
  const out: string[] = []
  const declarations = /export function ([A-Za-z0-9_]+)\s*\(/g

  for (const match of text.matchAll(declarations)) {
    const name = match[1]
    if (name === undefined || match.index === undefined) continue

    const open = match.index + match[0].length - 1
    const close = closingParenAfter(text, open)
    if (close === undefined) continue

    const returns = /^\s*:\s*(?:readonly\s+)?([A-Za-z0-9_]+)\s*(<)?/.exec(text.slice(close + 1))
    if (returns === null) continue
    if (returns[2] === '<') continue
    if (!accept(returns[1] ?? '', text.slice(open, close))) continue

    out.push(name)
  }
  return out
}

function takesAMoment(parameters: string): boolean {
  return /\bmoment\b|Moment\b/.test(parameters)
}

// ---------------------------------------------------------------------------
// Nothing is brought into being without being proposed first — D-188
// ---------------------------------------------------------------------------

/**
 * **The blocker-host inventory was here, and is deliberately gone — QA-84-018.**
 *
 * It found hosts by the literal JSX tag — `BlockerQuestion`, `BlockersPanel`,
 * `ResumePanel` — and Round 8 defeated it in two lines:
 *
 *     import { BlockerQuestion as Surface } from './DomainPanels'
 *     export function WrappedBlockerHost(props) { return <Surface {...props} /> }
 *
 * A list of imports would have gone the same way, and so would a list of prop
 * types: **a component can be named anything**, and every enumeration this phase
 * built on how one is spelled has been wrong.
 *
 * Round 8 named the alternative — *"the proof must stop claiming exhaustive host
 * discovery"* — so it stopped. What replaces it is in `phase84.spec.ts`: a walk
 * of **every screen the owner can reach**, read off the app's own navigation,
 * compared against the same screens before a move was blocked. A screen cannot
 * be aliased. See **D-198**.
 */

/**
 * A place that takes a described record and puts it in front of the owner.
 *
 * QA-84-014, D-196. D-195 catalogued what a **describer returns**, and a surface
 * can take that value and compose one more sentence from the same record before
 * anything reaches a screen. QA's mutation did exactly that, inside
 * `assembleTimeline`:
 *
 *     text: record.kind === 'action-unable-now'
 *       ? `${described.text} The app will choose something better next time.`
 *       : described.text,
 *
 * The promise rendered on an ordinary Timeline row and 118 tests passed. The
 * describer inventory could not see it, because `assembleTimeline` takes a
 * `Situation` — the record is local data inside it — and the catalogue was
 * asked about the honest value the describer returned rather than the value the
 * owner read.
 *
 * **A sink cannot hide.** Whatever else it takes, it has to import
 * `describeRecord` to have a described record at all, so importing it is what
 * this looks for. A fourth sink is discovered the moment it exists.
 */
export interface RecordTextSink {
  readonly file: string
}

export function recordTextSinksInSource(): readonly RecordTextSink[] {
  const out: RecordTextSink[] = []
  for (const file of filesUnder(join(ROOT, 'src', 'features'))) {
    const relative = relativeToRoot(file)
    // The describer itself is where the value is made, not a place that reads it.
    if (relative.endsWith('/history/describe.ts')) continue
    const code = withoutComments(readFileSync(file, 'utf8'))
    if (!/import\s*\{[^}]*\bdescribeRecord\b[^}]*\}/.test(code)) continue
    out.push({ file: relative })
  }
  return out.sort((a, b) => a.file.localeCompare(b.file))
}

/**
 * A function that turns a record into words the owner reads — QA-84-013, D-195.
 *
 * D-194 closed the catalogue over the three React panels that *take* a
 * blocker-path type, and Round 4's repair record declared the rest of the path —
 * Timeline, the domain page's "Recently", the correction list and the export —
 * a boundary it had not closed. Round 5 walked through it: changing the shared
 * lifecycle frame for an `action-unable-now` to *"The app will choose something
 * better next time"* rendered that promise to the owner while 431 tests passed.
 *
 * **Declaring a boundary is not closing one**, and the enumeration that matters
 * here is not of components but of **describers**: functions that take a
 * `CanonicalRecord` and produce something a person reads. There are three, they
 * are the funnel every one of those four surfaces goes through, and a fourth
 * fails this until somebody classifies it.
 */
export interface RecordTextFunction {
  readonly file: string
  readonly fn: string
}

export function recordTextFunctionsInSource(): readonly RecordTextFunction[] {
  const out: RecordTextFunction[] = []
  for (const layer of ['features', 'domain', 'intelligence', 'memory']) {
    for (const file of filesUnder(join(ROOT, 'src', layer))) {
      const code = withoutComments(readFileSync(file, 'utf8'))
      for (const match of code.matchAll(/export function ([A-Za-z0-9_]+)\s*\(/g)) {
        const name = match[1]
        if (name === undefined || match.index === undefined) continue
        const open = match.index + match[0].length - 1
        const close = closingParenAfter(code, open)
        if (close === undefined) continue
        if (!/\bCanonicalRecord\b/.test(code.slice(open, close))) continue
        out.push({ file: relativeToRoot(file), fn: name })
      }
    }
  }
  return out.sort((a, b) => `${a.file}${a.fn}`.localeCompare(`${b.file}${b.fn}`))
}

/**
 * The ones that take a record and give the owner no words for it.
 *
 * Named with the reason rather than filtered out silently, because the entry is
 * the cost of the exemption: a fourth function that reads a record and says
 * something about it has to be argued for here, in front of whoever reads the
 * diff. That is exactly what did not happen when `describeRecord` grew a
 * sentence for an `action-unable-now` and no blocker guard could see it.
 */
export const NOT_OWNER_TEXT: readonly { readonly fn: string; readonly why: string }[] = [
  {
    fn: 'isWithheldRecord',
    why: 'answers whether a section withholds it — a boolean, not a sentence',
  },
  {
    fn: 'evidenceSourceOf',
    why: 'returns the provenance source, which `originOf` is what renders',
  },
  { fn: 'isOwnerStated', why: 'a boolean about who wrote it' },
  { fn: 'bearsConcept', why: 'a type guard over the record kinds that carry a concept' },
  { fn: 'recordToWire', why: 'serialises for the file format; nothing reads it on a screen' },
  { fn: 'recordFromWire', why: 'parses the file format' },
  { fn: 'validateRecord', why: 'answers whether it is well formed' },
  { fn: 'compareRecordOrder', why: 'orders two records; produces no words' },
  { fn: 'sortRecords', why: 'orders a list; produces no words' },
  { fn: 'isCorrectableEvent', why: 'a boolean about whether a correction control is offered' },
  { fn: 'redateEventRecord', why: 'builds a correction record; its words are the owner’s reason' },
  { fn: 'planAppend', why: 'decides what an append does to the store' },
  { fn: 'conceptsMentionedBy', why: 'returns concept ids' },
  { fn: 'resolveHistory', why: 'resolves supersession and retraction; returns records' },
  { fn: 'recordFingerprint', why: 'a hash for deduplication' },
]

/**
 * A component that renders blocker copy of its own — QA-84-012, D-194.
 *
 * D-193 called `APPROVED_BLOCKER_COPY` closed, and it was closed over
 * `blockers.ts` and no further. Three components compose owner-visible blocker
 * copy in JSX — a panel title, a paragraph, an accessible name, two state
 * sentences, an interpolated note — and none of it could enter a check that
 * collects the return values of `blockerQuestionFor`.
 *
 * **The enumeration of surfaces has to be structural too**, or the next
 * component that renders a blocker is invisible in the same way. So the
 * surfaces are derived from what they *take*: a component whose props include a
 * blocker-path type renders blocker copy, and
 * `blocker-copy.test.tsx` asserts that the set it renders is exactly this set.
 */
const BLOCKER_PROP_TYPES = ['StandingBlocker', 'BlockerDecision', 'ResumableMove'] as const

export interface BlockerSurface {
  readonly file: string
  readonly component: string
  /** The blocker-path type in its props, so a failure says why it qualified. */
  readonly takes: string
}

export function blockerSurfacesInSource(): readonly BlockerSurface[] {
  const out: BlockerSurface[] = []
  for (const file of filesUnder(join(ROOT, 'src', 'features'))) {
    if (!file.endsWith('.tsx')) continue
    const code = withoutComments(readFileSync(file, 'utf8'))
    /*
     * A component is `function Name({ … }: { … })`, and what it takes is in the
     * type block after the destructuring. Read to the end of that block rather
     * than a fixed number of lines: a prop list is as long as it is.
     */
    for (const match of code.matchAll(/(?:export\s+)?function ([A-Z][A-Za-z0-9_]*)\s*\(\{/g)) {
      const name = match[1]
      if (name === undefined || match.index === undefined) continue
      const open = code.indexOf('}: {', match.index)
      if (open === -1) continue
      const close = closingBraceAfter(code, open + 3)
      if (close === undefined) continue
      const props = code.slice(open, close)
      const takes = BLOCKER_PROP_TYPES.find((type) => new RegExp(`\\b${type}\\b`).test(props))
      if (takes === undefined) continue
      out.push({ file: relativeToRoot(file), component: name, takes })
    }
  }
  return out.sort((a, b) => `${a.file}${a.component}`.localeCompare(`${b.file}${b.component}`))
}

/** The index of the brace that closes the one at `open`. */
function closingBraceAfter(text: string, open: number): number | undefined {
  let depth = 0
  for (let index = open; index < text.length; index += 1) {
    const char = text[index]
    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return index + 1
    }
  }
  return undefined
}

/**
 * A screen that decides it has nothing to offer because the store is empty.
 *
 * QA-84-007's class, read off the tree. `LifeScreen` and `DomainPage` both
 * assembled their situation behind
 *
 *     if (!memory.ready || memory.snapshot.records.length === 0) return undefined
 *
 * and the second half of that condition is not a readiness check — it is a
 * judgement that an empty history means an empty page. It switched off every
 * control that exists so the owner can write the first record, on the two
 * screens those controls live on, which is why a first-run Now offering only
 * the QA laboratory was the *whole* of what the product offered.
 *
 * `InsightsScreen` never had it. That is the shape of the rule: readiness is a
 * reason to wait, a record count is not.
 */
export interface RecordCountGate {
  readonly file: string
  readonly guard: string
}

export function screensGatedOnRecordCount(): readonly RecordCountGate[] {
  const out: RecordCountGate[] = []
  for (const file of filesUnder(join(ROOT, 'src', 'features'))) {
    const code = withoutComments(readFileSync(file, 'utf8'))
    if (!code.includes('assembleSituation(')) continue
    /*
     * The **store's** emptiness, not any array's. `Discovery.tsx` checks
     * `built.records.length === 0` before writing, which is a different claim
     * and a correct one: nothing is recorded as answered that produced nothing.
     */
    for (const match of code.matchAll(
      /(?:memory\.)?snapshot\.records\.length\s*(?:===|<=?)\s*0/g,
    )) {
      out.push({ file: relativeToRoot(file), guard: match[0] })
    }
  }
  return out.sort((a, b) => a.file.localeCompare(b.file))
}

/**
 * The shape a propose-and-confirm control returns, named the way `BUNDLE` is.
 *
 * A second proposal type is an edit here with a sentence saying why — the same
 * discipline `ALLOWED_READERS` and `BUNDLE` keep, and for the same reason: a
 * pattern like *"anything ending in Proposal"* would make the guard weaker
 * every time somebody named a type conveniently.
 */
const PROPOSAL = 'AuthoringProposal'

/**
 * A screen that brings something into being, and what it shows first.
 *
 * `builds` is the {@link BUNDLE} builders it calls — the controls that write an
 * entity and the records naming it as one act. `proposes` is the functions
 * returning a {@link PROPOSAL} it calls: what the app understood, what it will
 * create, and what it is **not** assuming.
 */
export interface AuthoringSurface {
  readonly file: string
  readonly surface: ReachedBuilder['surface']
  readonly builds: readonly string[]
  readonly proposes: readonly string[]
}

/**
 * Files whose confirmation is genuinely somewhere else, and where.
 *
 * One, and it is the container/panel split rather than a bypass: `DomainPage`
 * receives an `AuthoringDraft` from `DomainPanels`, which composed the proposal,
 * rendered it, and disabled its own confirm button until `problems` was empty.
 * The page only writes what that form handed it.
 *
 * Named here rather than filtered out silently, because the entry is the cost of
 * the exemption: a second surface writing without proposing has to be argued for
 * in this table, in front of whoever is reading the diff — which is precisely
 * what did not happen when `Discovery.tsx` started calling `destinationRecords`
 * directly.
 */
export const PROPOSES_ELSEWHERE: readonly { readonly file: string; readonly why: string }[] = [
  {
    file: '/src/features/life/DomainPage.tsx',
    why: 'the page writes the draft DomainPanels’ AuthoringPanel and DestinationPanel already proposed and confirmed',
  },
]

/**
 * Every feature file that writes an authored bundle, and what it proposed.
 *
 * The owner addendum's guard, and it is a source instrument rather than a
 * comment because the thing it protects is an absence: `Discovery.tsx` never
 * imported `proposeAuthoring`, and nothing anywhere said so. A test that reads
 * the tree can say so, and says it again the next time somebody adds a screen.
 *
 * What it proves: no surface calls a builder that brings something into being
 * without also composing a proposal. What it does not prove: that the proposal
 * is the one shown on the branch that writes — that is what the behavioural
 * tests in `destination-and-discovery.test.ts` are for, and the two together are
 * the claim.
 */
export function everyAuthoringSurface(): readonly AuthoringSurface[] {
  const bundles = new Set<string>()
  const proposals = new Set<string>()
  for (const layer of ['intelligence', 'domain', 'memory']) {
    for (const file of filesUnder(join(ROOT, 'src', layer))) {
      const text = readFileSync(file, 'utf8')
      for (const name of declaredIn(
        text,
        (returned, parameters) => returned === BUNDLE && takesAMoment(parameters),
      )) {
        bundles.add(name)
      }
      for (const name of declaredIn(text, (returned) => returned === PROPOSAL)) proposals.add(name)
    }
  }

  const out: AuthoringSurface[] = []
  for (const file of filesUnder(join(ROOT, 'src', 'features'))) {
    const code = withoutComments(readFileSync(file, 'utf8'))
    const builds = new Set<string>()
    const proposes = new Set<string>()
    for (const match of code.matchAll(/([A-Za-z0-9_]+)\s*\(/g)) {
      const called = match[1]
      if (called === undefined) continue
      if (bundles.has(called)) builds.add(called)
      if (proposals.has(called)) proposes.add(called)
    }
    if (builds.size === 0) continue
    out.push({
      file: relativeToRoot(file),
      surface: surfaceOf(relativeToRoot(file)),
      builds: [...builds].sort(),
      proposes: [...proposes].sort(),
    })
  }
  return out.sort((a, b) => a.file.localeCompare(b.file))
}

/** The index of the parenthesis that closes the one at `open`. */
function closingParenAfter(text: string, open: number): number | undefined {
  let depth = 0
  for (let index = open; index < text.length; index += 1) {
    const char = text[index]
    if (char === '(') depth += 1
    else if (char === ')') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return undefined
}

function filesUnder(dir: string): readonly string[] {
  const out: string[] = []
  const walk = (current: string): void => {
    for (const name of readdirSync(current)) {
      const full = join(current, name)
      if (statSync(full).isDirectory()) {
        walk(full)
        continue
      }
      if (name.endsWith('.ts') || name.endsWith('.tsx')) out.push(full)
    }
  }
  walk(dir)
  return out
}

/**
 * Source with comments removed.
 *
 * The same shape `architecture-guards.test.ts` uses, and for the same reason:
 * several of the files being scanned explain in prose exactly which builder
 * they no longer call.
 */
function withoutComments(text: string): string {
  let out = ''
  let index = 0
  while (index < text.length) {
    const two = text.slice(index, index + 2)
    if (two === '//') {
      const end = text.indexOf('\n', index)
      index = end === -1 ? text.length : end
      continue
    }
    if (two === '/*') {
      const end = text.indexOf('*/', index + 2)
      index = end === -1 ? text.length : end + 2
      continue
    }
    out += text[index] ?? ''
    index += 1
  }
  return out
}
