import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'
import { expect } from 'vitest'
import type { EntityKind } from '../../src/domain/entities'
import {
  RECORD_KINDS,
  type CanonicalRecord,
  type FactValue,
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
} from '../../src/intelligence/corrections'
import { decide, type Decision } from '../../src/intelligence/engine'
import { growthAnswerRecords, growthStageRecord } from '../../src/intelligence/growth'
import { nextGuideStep, type GuideStep } from '../../src/intelligence/guide'
import {
  availableActions,
  planLifecycle,
  type LifecycleAction,
} from '../../src/intelligence/lifecycle'
import {
  nextDueOutcome,
  outcomeRecord,
  type OutcomeAnswer,
  type PendingOutcome,
} from '../../src/intelligence/outcomes'
import { answerRecord, questionFor } from '../../src/intelligence/questions'
import { assembleSituation, type Situation } from '../../src/intelligence/situation'
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
  readonly surface: 'now' | 'life' | 'domain-page' | 'insights'
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
]

/**
 * Record kinds nothing in the product writes, and which are therefore not
 * evidence of a missing owner control.
 *
 * Two, and both are the schema being wider than the app. `decision` is reserved
 * and emitted by nothing; `imported-legacy-record` is what the legacy importer
 * quarantines a foreign row as, which is a file arriving rather than an owner
 * saying something.
 */
export const NOT_OWNER_AUTHORED: readonly RecordKind[] = ['decision', 'imported-legacy-record']

/**
 * Entity kinds an owner can bring into being.
 *
 * Empty, and there is nothing to compute: no control on any screen calls
 * `createEntity`, and the only entities that exist without an import are
 * `STANDING_ENTITIES` — the five routines the engine is allowed to name for
 * itself. This constant exists so the walk below has somewhere honest to read
 * it from, and so that an authoring control arriving later changes one line.
 */
export const OWNER_CREATABLE_ENTITY_KINDS: readonly EntityKind[] = []

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

  const moment = () => ({ now: at, zone, weekStartsOn: 1 as const })
  const view = () => buildView(held, moment())
  const situation = () => assembleSituation(view(), moment())
  const decision = () => decide(view(), moment())

  /*
   * The real clock, not the moment being reasoned about — D-037.
   *
   * `recordedAt` is what separates two events in one session, and every surface
   * passes `systemClock().now()` for it. A runner that passed the scenario's
   * own instant would collapse the two, and "the answer you gave last" would
   * fall through to a record id that carries no meaning by design.
   */
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
  }
}

/*
 * Imported so the route table above is checked by the compiler rather than by
 * a reader: a builder that is renamed or deleted fails the build here, and the
 * table stops being a claim about source that source can quietly leave behind.
 */
export const ROUTE_BUILDERS = {
  answerRecord,
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
 * **It returns a record.** Not "its name ends in Record" — `describeRecord`,
 * `describeThreadRecord`, `isWithheldRecord` and `sourcesOfRecords` all read
 * records and build none, and a first draft of this reported every one of them.
 * `Record<string, unknown>` is excluded by the same test: TypeScript's utility
 * type is not a canonical record, and `isPlainObject` is not a builder.
 *
 * **And it takes a moment.** `standingCommitments(situation): readonly
 * CommitmentWindowRecord[]` returns records and builds none — it filters rows
 * already in the history. A return type says what comes out; a moment says the
 * rows are new. Every builder here takes one, because a record it invents needs
 * an `occurredAt` and a zone, and no reader does.
 *
 * The parameter list is balanced rather than pattern-matched: a lazy regex
 * crossing from one `export function` to the next reported `questionFor`,
 * `describePremise` and `daysSincePractice` as builders, having found some
 * later function's return annotation.
 */
function buildersDeclaredIn(text: string): readonly string[] {
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
    if (!/Record$/.test(returns[1] ?? '')) continue
    if (!/\bmoment\b|Moment\b/.test(text.slice(open, close))) continue

    out.push(name)
  }
  return out
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
