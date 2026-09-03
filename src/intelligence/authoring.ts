import { createRecordFactory } from '../domain/build'
import { CONCEPT } from '../domain/concepts'
import { DOMAIN, type LifeDomainId } from '../domain/domains'
import {
  createEntity,
  entityRef,
  type EntityKind,
  type EntityLink,
  type EntityRef,
  type SemanticEntity,
} from '../domain/entities'
import { newRecordId, type RecordId } from '../domain/ids'
import type {
  CanonicalRecord,
  DestinationRecord,
  DestinationState,
  GoalRecord,
  Provenance,
} from '../domain/records'
import {
  civilDateFromDayId,
  instantAtLocal,
  localTimeOfDay,
  minutesIntoDay,
  parseLocalDayId,
  type Instant,
  type IsoWeekday,
  type LocalDayId,
  type TimeZoneId,
} from '../domain/time'
import { dueWindow } from '../domain/windows'
import { goalCorrectionRecord } from './corrections'
import { ROUTINE_OUTDOORS, ROUTINE_SIZE } from './routines'
import type { Situation } from './situation'

/**
 * Owner authoring — one way to introduce a thing the app can then refer to
 * (F04, F19, F36, package 3).
 *
 * ## The finding this answers, in one sentence
 *
 * *"Important objects are easier to encounter in fixtures than to introduce as
 * an owner."* Routing 83's instrument turned that into a fact rather than an
 * opinion: **no control anywhere under `src/features` called `createEntity`**,
 * and `constraint`, `goal`, `commitment` and `relationship-event` had no owner
 * route at all. The rich histories are full of goals, routines, people, places,
 * skills and obligations, and every one of them arrived through a file.
 *
 * ## One pattern, not seven forms
 *
 * The adjudication asks for **one generic create-and-confirm pattern** for a
 * goal, a routine, a person, a place, a skill and an obligation — and
 * explicitly refuses an entity-management dashboard. So this module has one
 * shape:
 *
 * 1. the owner says what kind of thing it is and what it is called;
 * 2. {@link proposeAuthoring} says back what the app understood, what it will
 *    create, and **what it is still not assuming**;
 * 3. {@link authoringRecords} builds it, once he confirms.
 *
 * Step 2 is the part that is not decoration. E13 recorded the owner typing into
 * a box with no way to tell whether the app had taken the answer as a current
 * fact, a standing constraint, an aspiration or an event — F36's whole
 * complaint. An interpretation he can read before he agrees to it is the
 * difference between capture and guessing.
 *
 * ## Precision where he has it — F36
 *
 * Every optional field here is a place the owner may be exact and is never made
 * to be: minutes rather than four buttons, a named day rather than "soon". An
 * absent one stays absent. *"I slept 6.75 hours yesterday"* and *"about six
 * last night"* are not interchangeable data, and neither is invented from the
 * other.
 *
 * ## What this deliberately is not
 *
 * It is not a routines **library** (AUD-0045 stays in the later Reach package):
 * introducing a routine makes the object exist and makes it nameable, and
 * nothing here generates a recommendation from one. This phase builds the
 * route; Reach walks it. It is also not a thread-creation control — D-133
 * bounds courses to three kinds with no generic creation, and that stands.
 */

/**
 * The six things an ordinary owner can bring into being.
 *
 * The list is the adjudication's, exactly: goal, routine, person, place, skill,
 * obligation. It is closed, and the closedness is the design — an authoring
 * surface over every entity kind in the schema would be the dashboard section
 * 59 excludes, and would let a person become a piece of a certification.
 *
 * A **destination** is authored through the same pattern and is deliberately
 * not in this list: it is what the six are *for*, it is offered where an
 * aspiration belongs rather than beside a name box, and it has its own shape
 * (F01). {@link destinationRecords} is its builder.
 */
export const AUTHORABLE_KINDS = [
  'goal',
  'routine',
  'person',
  'place',
  'skill',
  'obligation',
] as const

export type AuthorableKind = (typeof AUTHORABLE_KINDS)[number]

export function isAuthorableKind(value: unknown): value is AuthorableKind {
  return typeof value === 'string' && (AUTHORABLE_KINDS as readonly string[]).includes(value)
}

/**
 * What an owner-facing form can hand over.
 *
 * Two required fields and the rest optional, because F04's own words are
 * *"accept partial information"*. A draft with nothing but a kind and a name is
 * a complete, honest draft; every other field is a place he may be precise and
 * is never required to be.
 */
export interface AuthoringDraft {
  readonly kind: AuthorableKind
  /** What he calls it, rendered exactly and never paraphrased. */
  readonly name: string
  readonly domain: LifeDomainId
  /** Anything he wants to add, in his words. Stored, never parsed. */
  readonly detail?: string
  /** The day a goal or an obligation is aimed at, where he named one. */
  readonly dayId?: LocalDayId
  /** Minutes into the owner-local day an obligation begins. */
  readonly startsAt?: number
  /** Minutes into the owner-local day it ends. */
  readonly endsAt?: number
  /** The days of the week it happens on, where it is a weekly shape. */
  readonly weekdays?: readonly IsoWeekday[]
  /** The destination this goal is a milestone of, where it is one. */
  readonly milestoneOf?: EntityRef
  /** Who or what it is about — a skill belongs to a person, a routine to a place. */
  readonly about?: EntityRef
  /**
   * How long a routine takes, where he said — AUD-0045.
   *
   * The audit offers two ways to make a second movement routine safe and this
   * is the safer: *"restrict the first version to routines the owner sizes
   * himself."* The precondition it names is that `profileFor` becomes keyed on
   * (verb, object), because `size`, `demand` and `friction` are read by six
   * different rules and a 25-minute walk and a 90-minute gym session sharing
   * one profile would make all six wrong.
   *
   * Optional, like everything else on a draft. A routine with no size behaves
   * exactly as an unsized move already does — the sentence names no duration,
   * because `ActionTarget.minutes` has been optional since Phase 1 so that an
   * absent one is a real state rather than a zero (G-009, F36).
   */
  readonly minutes?: number
  /**
   * Whether doing it means going out — C21's candidate attribute.
   *
   * The other half of the supervision pair. `A_WALK` was an undifferentiated
   * routine and nothing distinguished an indoor move from an outdoor one, so a
   * constraint saying *"I could not leave"* had nothing to bite on.
   */
  readonly requiresLeaving?: boolean
}

/**
 * What can be proposed, which is the six plus the thing the six are for.
 *
 * Not `AuthorableKind` itself — see {@link proposeDestination}. A destination
 * shares the propose-and-confirm **pattern** and is not a member of that
 * category, and the four exhaustive tables keyed on `AuthorableKind` stay at
 * six rows because of it.
 */
export type ProposableKind = AuthorableKind | 'destination'

/**
 * What the app will do with a draft, said before it does it.
 *
 * Every field here is meant to be rendered. `interpretation` is the sentence
 * the owner agrees to; `creates` is what will exist afterwards; `unknowns` is
 * the half that matters most and the half a form usually leaves out — the
 * things the app is **not** going to assume from what he typed.
 */
export interface AuthoringProposal {
  readonly kind: ProposableKind
  readonly interpretation: string
  readonly creates: readonly string[]
  readonly unknowns: readonly string[]
  /** Why the draft cannot be built. Empty means it can. */
  readonly problems: readonly string[]
}

/** Which entity kind each authorable thing becomes. */
const ENTITY_FOR: Record<AuthorableKind, EntityKind | undefined> = {
  goal: 'goal',
  routine: 'routine',
  person: 'person',
  place: 'place',
  skill: 'skill',
  // An obligation is a span of the owner's day rather than a thing in the
  // world. It has no entity, and inventing one so the table looks uniform would
  // put a row in the graph that nothing could ever link to.
  obligation: undefined,
}

/**
 * What each kind is, in the words the owner reads before he agrees.
 *
 * A table rather than a chain of branches, so a seventh authorable kind is a
 * compile error here rather than a form that silently falls through to
 * somebody else's sentence — D-179's shape, applied to copy.
 */
const INTERPRETATION: Record<AuthorableKind, (name: string, area: string) => string> = {
  goal: (name, area) => `A goal in ${area}: “${name}”. Something you are working towards.`,
  routine: (name, area) =>
    `Something you do in ${area}: “${name}”. The app will know it exists and can refer to it; it will not start suggesting it.`,
  person: (name) => `A person: ${name}. Things can be about them from now on.`,
  place: (name, area) => `A place in ${area}: ${name}. Things can happen there from now on.`,
  skill: (name, area) => `Something being learned or worked on in ${area}: “${name}”.`,
  obligation: (name) =>
    `Something in your week: “${name}”. With times on it the app works around the span; with only a day it is a promise with a date on it.`,
}

/**
 * What the app is not going to assume, per kind.
 *
 * This is the half of a confirmation that earns it. Saying *"a goal in Career:
 * pass the CCNA"* back to somebody tells him nothing he did not just type;
 * telling him the app has not decided when, or what it is made of, tells him
 * exactly where he still has a say.
 */
const NOT_ASSUMED: Record<AuthorableKind, readonly string[]> = {
  goal: ['when it should be done by', 'what it is made of'],
  routine: ['how often you do it', 'how long it takes', 'where it happens'],
  person: ['how close you are', 'how often you see them'],
  place: ['how long it takes to get there', 'what you do there'],
  skill: ['how good you are at it', 'whether it is going well'],
  obligation: ['whether it repeats', 'whether it can move'],
}

export function proposeAuthoring(draft: AuthoringDraft, situation: Situation): AuthoringProposal {
  const name = draft.name.trim()
  const area = situation.domains.labelFor(draft.domain)
  const problems: string[] = []

  if (name === '') problems.push('It needs a name — the app renders what you call it, exactly.')
  if (draft.kind === 'obligation') {
    /*
     * Two shapes, and the owner picks by what he actually knows — F36.
     *
     * With times it is a **span of the day**: the school run, working hours,
     * a handover, and the engine works around it. With only a day it is a
     * **promise with a date on it** — "call the school back on Friday" — which
     * is a different record kind and a different thing. Requiring times for
     * both would make the app demand a precision he has not got, which is
     * exactly what F36 says not to do; inventing them would be worse.
     */
    const from = draft.startsAt
    const to = draft.endsAt
    if (from !== undefined && to !== undefined && to <= from) {
      problems.push('It has to end after it starts.')
    }
    if (from !== undefined && to === undefined) problems.push('Say what time it ends.')
    if (to !== undefined && from === undefined) problems.push('Say what time it starts.')
    if (draft.dayId === undefined && (draft.weekdays ?? []).length === 0) {
      problems.push('Say which day it is on, or which days of the week it happens.')
    }
  }

  const entityKind = ENTITY_FOR[draft.kind]
  const creates: string[] = []
  if (entityKind !== undefined) creates.push(`a ${entityKind} the app can name: ${name}`)
  for (const line of RECORDS_MADE[draft.kind]) creates.push(line)

  return {
    kind: draft.kind,
    interpretation: INTERPRETATION[draft.kind](name, area),
    creates,
    // Only the ones he has not already answered. A confirmation that lists
    // "when it should be done by" under a date he just typed reads as though
    // the app did not take it.
    unknowns: NOT_ASSUMED[draft.kind].filter((unknown) => !alreadySupplied(draft, unknown)),
    problems,
  }
}

/** What goes into the record, per kind, in the owner's terms. */
const RECORDS_MADE: Record<AuthorableKind, readonly string[]> = {
  goal: ['an entry saying you set it, dated today'],
  routine: ['an entry saying you told the app about it'],
  person: ['an entry saying you told the app about them'],
  place: ['an entry saying you told the app about it'],
  skill: ['an entry saying you told the app about it'],
  obligation: ['a span the app will work around, or a promise with a date on it'],
}

function alreadySupplied(draft: AuthoringDraft, unknown: string): boolean {
  if (unknown === 'when it should be done by') return draft.dayId !== undefined
  if (unknown === 'whether it repeats') return (draft.weekdays ?? []).length > 0
  return false
}

export interface AuthoringMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  readonly recordedAt: Instant
  readonly nextId?: () => RecordId
}

/**
 * What an authoring gesture writes.
 *
 * Entities and records travel together because they are one act: the record
 * refers to the entity by reference, and a reference with nothing behind it is
 * a renderer that has to reach for "it" — which D-018 forbids at the one place
 * a sentence could go wrong. The surface writes the entities first for the same
 * reason.
 */
export interface AuthoringResult {
  readonly entities: readonly SemanticEntity[]
  readonly records: readonly CanonicalRecord[]
  /** The thing that now exists, for whatever wants to refer to it next. */
  readonly created: EntityRef | undefined
}

export const AUTHORING_PROVENANCE: Provenance = { source: 'owner', writtenBy: 'authoring' }

export function authoringRecords(
  draft: AuthoringDraft,
  situation: Situation,
  moment: AuthoringMoment,
): AuthoringResult {
  const proposal = proposeAuthoring(draft, situation)
  if (proposal.problems.length > 0) return { entities: [], records: [], created: undefined }

  const name = draft.name.trim()
  const build = createRecordFactory({
    zone: moment.zone,
    provenance: AUTHORING_PROVENANCE,
    ...(moment.nextId === undefined ? {} : { nextId: moment.nextId }),
  })
  const envelope = (entities: readonly EntityRef[]) => ({
    occurredAt: moment.now,
    recordedAt: moment.recordedAt,
    id: moment.nextId?.() ?? newRecordId(),
    domains: [draft.domain],
    entities,
  })

  if (draft.kind === 'obligation') {
    const startsAt = draft.startsAt
    const endsAt = draft.endsAt
    const weekdays = draft.weekdays ?? []

    if (startsAt === undefined || endsAt === undefined) {
      /*
       * A promise with a date on it, which is what a `commitment` is.
       *
       * The whole owner-local day he named, because "by Friday" means Friday
       * rather than midnight at the start of it — the same reading
       * `setGoalHorizon` takes of a goal's date, for the same reason.
       */
      const date = civilDateFromDayId(draft.dayId!)
      return {
        entities: [],
        records: [
          build('commitment', envelope([]), {
            statement: name,
            due: dueWindow(
              instantAtLocal({ ...date, hour: 0, minute: 0, second: 0 }, moment.zone),
              instantAtLocal({ ...date, hour: 23, minute: 59, second: 59 }, moment.zone),
            ),
          }),
        ],
        created: undefined,
      }
    }

    const recurrence =
      weekdays.length > 0
        ? ({ kind: 'weekly', days: weekdays } as const)
        : ({ kind: 'one-off', on: draft.dayId! } as const)
    return {
      entities: [],
      records: [
        build('commitment-window', envelope([]), {
          label: name,
          startsAt,
          endsAt,
          recurrence,
          // His own time, because he is the one saying it is spoken for. A
          // span somebody *else* is occupied for is what the Day shape
          // control is for, and it asks the question differently.
          whose: 'mine',
          knownFrom: weekdays.length > 0 ? 'recurring' : 'owner-entered',
        }),
      ],
      created: undefined,
    }
  }

  const entityKind = ENTITY_FOR[draft.kind]!
  const links: EntityLink[] = []
  if (draft.about !== undefined) {
    links.push({
      relation: entityKind === 'skill' || entityKind === 'routine' ? 'about-person' : 'part-of',
      target: draft.about.id,
    })
  }
  if (draft.kind === 'goal' && draft.milestoneOf !== undefined) {
    links.push({ relation: 'supports-goal', target: draft.milestoneOf.id })
  }

  const entity = createEntity({
    kind: entityKind,
    label: name,
    domain: draft.domain,
    privacy: situation.domains.defaultPrivacyFor(draft.domain),
    createdAt: moment.now,
    ...(draft.detail === undefined || draft.detail.trim() === ''
      ? {}
      : { note: draft.detail.trim() }),
    ...(links.length === 0 ? {} : { links }),
  })
  const ref: EntityRef = { id: entity.id, kind: entity.kind }

  if (draft.kind === 'goal') {
    const window =
      draft.dayId === undefined
        ? undefined
        : (() => {
            const date = civilDateFromDayId(draft.dayId)
            return dueWindow(
              instantAtLocal({ ...date, hour: 0, minute: 0, second: 0 }, moment.zone),
              instantAtLocal({ ...date, hour: 23, minute: 59, second: 59 }, moment.zone),
            )
          })()
    return {
      entities: [entity],
      records: [
        build('goal', envelope([ref]), {
          goal: ref,
          statement: name,
          status: 'active',
          ...(window === undefined ? {} : { targetWindow: window }),
          ...(draft.milestoneOf === undefined ? {} : { milestoneOf: draft.milestoneOf }),
        }),
      ],
      created: ref,
    }
  }

  /*
   * Everything else: the entity, and an entry saying he told the app about it.
   *
   * A `domain-update` rather than an `explicit-fact`, and the reason is what
   * each one *reads* as. An explicit fact carries a concept, and a concept the
   * registry has never heard of renders on Timeline as its own id — so the row
   * for the evening he named the gym would have said `direction.introduced:
   * The gym`. A domain update carries a sentence, which is what this is: the
   * owner told the app something true about an area of his life.
   *
   * It counts as evidence about that area, and it should. Section 8's coverage
   * engine exists to notice when an area has gone quiet, and *"I go to the gym
   * on Tuesdays"* is not silence. What it deliberately does not do is move a
   * standing concept: nothing here claims to know how often, how long, or how
   * it is going, and {@link proposeAuthoring} said so before he agreed.
   */
  /*
   * And a routine's own shape, where he gave one — AUD-0045.
   *
   * Two `explicit-fact` rows with the routine attached, carrying the size and
   * whether it means going out. They are deliberately **not** registry
   * concepts: the registry answers what the app can know about the *owner*, and
   * how long a swim takes is a property of an object. Registering them would
   * put "Routine size" on the Health page as a fact about him, have coverage
   * measure how long it had been since he last said it, and make one global
   * reading stand for every routine at once — the last of which is simply
   * wrong. `routines.ts` reads them per object, from the records, which is the
   * same shape a sleep shortfall is read in and for the same reason.
   */
  const shape =
    draft.kind !== 'routine'
      ? []
      : [
          ...(draft.minutes === undefined
            ? []
            : [
                build('explicit-fact', envelope([ref]), {
                  concept: ROUTINE_SIZE,
                  value: { type: 'duration' as const, minutes: draft.minutes },
                }),
              ]),
          ...(draft.requiresLeaving === undefined
            ? []
            : [
                build('explicit-fact', envelope([ref]), {
                  concept: ROUTINE_OUTDOORS,
                  value: { type: 'boolean' as const, value: draft.requiresLeaving },
                }),
              ]),
        ]

  return {
    entities: [entity],
    records: [
      build('domain-update', envelope([ref]), {
        domain: draft.domain,
        summary: INTRODUCED_SENTENCE[draft.kind](name),
      }),
      ...shape,
    ],
    created: ref,
  }
}

/**
 * The line that goes in the record when something is introduced.
 *
 * A table for the same reason {@link INTERPRETATION} is one: this sentence ends
 * up on Timeline and in an export, where it is the whole of what a reader has,
 * and a seventh kind falling through to somebody else's wording is the class of
 * defect D-179 is about.
 */
const INTRODUCED_SENTENCE: Record<AuthorableKind, (name: string) => string> = {
  goal: (name) => `Set a goal: ${name}.`,
  routine: (name) => `Told the app about something you do: ${name}.`,
  person: (name) => `Told the app about someone: ${name}.`,
  place: (name) => `Told the app about a place: ${name}.`,
  skill: (name) => `Told the app about something being worked on: ${name}.`,
  obligation: (name) => `Told the app about a part of the day: ${name}.`,
}

// ---------------------------------------------------------------------------
// Destinations — the same pattern, for the thing the six are for
// ---------------------------------------------------------------------------

export interface DestinationDraft {
  readonly aim: string
  readonly domain: LifeDomainId
  readonly baseline?: string
  readonly evidence?: readonly string[]
  readonly unknowns?: readonly string[]
  /** The first milestone, where he has one in mind. Optional on purpose. */
  readonly milestone?: string
  readonly milestoneBy?: LocalDayId
}

/**
 * What naming an aspiration writes — F01, D-162, D-173.
 *
 * Three things at most, and each of them is a thing that already exists in the
 * model: an entity so it can be referred to, a `destination` record holding the
 * four parts, and — where he named one — a `goal` carrying `milestoneOf`, which
 * is what a milestone is.
 *
 * **The milestone is why the recommendation changes.** A destination pulls no
 * dimension of its own and must not: Phase 82 re-cut the instrument and
 * re-baselined the tournament, and D-137/D-138 protect both. What reaches
 * tonight is the milestone, ranked exactly as every other goal is, through
 * `goal-fit` — and for Career and Money the entity it creates is also what the
 * candidate generators have always needed and never had.
 *
 * D-173's load-bearing clause is *"without requiring me to already understand
 * myself"*, which is why everything except the aim is optional. A man who can
 * only say *"I want to be employable"* has said enough.
 */
export function destinationRecords(
  draft: DestinationDraft,
  situation: Situation,
  moment: AuthoringMoment,
  state: DestinationState = 'active',
): AuthoringResult {
  const aim = draft.aim.trim()
  if (aim === '') return { entities: [], records: [], created: undefined }

  const build = createRecordFactory({
    zone: moment.zone,
    provenance: AUTHORING_PROVENANCE,
    ...(moment.nextId === undefined ? {} : { nextId: moment.nextId }),
  })

  const entity = createEntity({
    kind: 'destination',
    label: aim,
    domain: draft.domain,
    privacy: situation.domains.defaultPrivacyFor(draft.domain),
    createdAt: moment.now,
  })
  const ref: EntityRef = { id: entity.id, kind: entity.kind }

  const entities: SemanticEntity[] = [entity]
  const records: CanonicalRecord[] = [
    build(
      'destination',
      {
        occurredAt: moment.now,
        recordedAt: moment.recordedAt,
        id: moment.nextId?.() ?? newRecordId(),
        domains: [draft.domain],
        entities: [ref],
      },
      {
        destination: ref,
        aim,
        state,
        ...(draft.baseline === undefined || draft.baseline.trim() === ''
          ? {}
          : { baseline: draft.baseline.trim() }),
        ...(draft.evidence === undefined || draft.evidence.length === 0
          ? {}
          : { evidence: draft.evidence }),
        ...(draft.unknowns === undefined || draft.unknowns.length === 0
          ? {}
          : { unknowns: draft.unknowns }),
      },
    ),
  ]

  const milestone = draft.milestone?.trim()
  if (milestone !== undefined && milestone !== '') {
    const built = milestoneRecords(milestone, draft, ref, situation, moment)
    entities.push(...built.entities)
    records.push(...built.records)
  }

  return { entities, records, created: ref }
}

/**
 * A milestone for a destination that already exists.
 *
 * Its own entry point, and the reason is a defect it prevents rather than
 * tidiness. Naming the next step on an existing aspiration through
 * {@link destinationRecords} would write a **second `destination` record**
 * carrying the same aim: the entity id is derived from the label so the entity
 * is written over itself harmlessly, but `resolveDestinations` walks records,
 * so the owner would see one aim twice on his own page, each with half the
 * milestones under it.
 *
 * The destination is not touched. What is next is a goal, and adding one is
 * adding a goal.
 */
export function milestoneFor(
  destination: EntityRef,
  domain: LifeDomainId,
  statement: string,
  situation: Situation,
  moment: AuthoringMoment,
  by?: LocalDayId,
): AuthoringResult {
  const named = statement.trim()
  if (named === '') return { entities: [], records: [], created: undefined }
  return milestoneRecords(
    named,
    { aim: '', domain, ...(by === undefined ? {} : { milestoneBy: by }) },
    destination,
    situation,
    moment,
  )
}

/**
 * What a milestone is made of, in the area it belongs to — F01, F04, gate 1.
 *
 * ## Why the entity kind depends on the domain
 *
 * A milestone is a named objective *and* the body of work behind it, and in
 * this product those are the same sentence. The candidate generators have
 * always needed the second half and never had it: `careerCandidates` returns
 * nothing without a `learning-topic` the owner is actually on, `moneyCandidates`
 * returns nothing without a `financial-goal`. Routing 83's instrument found
 * exactly that — the owner can say *"Cloud engineering (AWS)"* and it creates no
 * entity, **so no study move is generated, no goal can name it as a piece, and
 * no course can take it as a subject**.
 *
 * So the milestone's entity is the kind that area's work actually is, and the
 * goal record points at it. That is what makes naming an aspiration change what
 * the app suggests, and it changes it **through the ranking** — the milestone is
 * an ordinary goal and `goal-fit` reads it as one. No dimension is added, no
 * weight moves, and Phase 82's re-cut instrument is untouched (D-137, D-138).
 *
 * ## And the owner is told, before he agrees
 *
 * {@link describeMilestone} is the sentence the confirmation shows. F04's rule
 * is *"propose an interpretation, and confirm a consequential relationship"* —
 * making the next step the thing the app studies is consequential, so it is
 * said out loud rather than inferred quietly.
 */
const MILESTONE_ENTITY: Partial<Record<string, EntityKind>> = {
  [DOMAIN.career]: 'learning-topic',
  [DOMAIN.money]: 'financial-goal',
  [DOMAIN.health]: 'routine',
}

export function milestoneEntityKind(domain: LifeDomainId): EntityKind {
  return MILESTONE_ENTITY[domain] ?? 'goal'
}

/**
 * What naming an aspiration will do, said before it does it — D-188.
 *
 * ## Why this is not `proposeAuthoring`
 *
 * `proposeAuthoring` is keyed on `AuthorableKind`, which is six kinds, and a
 * destination is not one of them. That set answers *"what can the owner bring
 * into being?"* and its members are things he has — a person, a place, a
 * routine. A destination is what those are **for**. Sharing the
 * propose-and-confirm pattern is the point; sharing the enum would mean
 * `ENTITY_FOR` having to say what kind of thing in the world a destination is,
 * which is the question the closed set exists to avoid answering.
 *
 * So: the same {@link AuthoringProposal} shape, its own function, and the
 * six-kind exhaustiveness untouched.
 *
 * ## What the discovery card was doing instead
 *
 * Writing the record straight from the box. The owner typed *"More money"* into
 * the Career prompt, pressed **That is it**, and believed he had confirmed an
 * interpretation — while the panel one screen away has had the whole contract
 * since package 3 and the surface he actually used had none of it. Same class
 * as QA-84-005, one surface across: there the confirmation was wrong, here
 * there was no confirmation at all.
 *
 * ## What it does not do
 *
 * Read the words. The aim is stored byte-identical to what he typed, in the
 * prompt's own domain — *"More money"* under a Career prompt stays Career.
 *
 * **That question is answered now, and it is answered somewhere else.** Routing
 * 91 built `interpret.proposeInterpretedDestination`, which **composes** this
 * function and adds what the words said and what they left open (D-240). This
 * one is unchanged and still does not read anything: a caller that wants a
 * reading asks for one, and every caller that does not gets D-188's contract
 * exactly as it was written.
 */
export function proposeDestination(
  draft: DestinationDraft,
  situation: Situation,
): AuthoringProposal {
  const aim = draft.aim.trim()
  const area = situation.domains.labelFor(draft.domain)
  const problems: string[] = []
  if (aim === '') {
    problems.push(
      'It needs something to aim at. The app keeps your words exactly as you write them.',
    )
  }

  const creates: string[] = [
    `something to aim at in ${area}, in your words: “${aim}”`,
    'an entry saying you named it, dated today',
  ]

  /*
   * The next step, where a form offered him one, in the words that say what
   * making it the next step will mean.
   *
   * {@link milestoneConfirmation} rather than a second sentence with the same
   * job — it is the one place that already knows a milestone becomes the thing
   * the app studies in Career, the money thing that is open in Money, and
   * neither of those in Health.
   */
  const milestone = draft.milestone?.trim() ?? ''
  if (milestone !== '') creates.push(milestoneConfirmation(milestone, draft.domain, area))

  /*
   * And the half that earns a confirmation: what it is **not** taking from
   * what he typed.
   *
   * The bare aim is the ordinary case and the one D-173 exists to protect — a
   * man who can only say *"I want to be employable"* has said enough — so the
   * blanks are named rather than filled.
   */
  const unknowns: string[] = []
  if (milestone === '') unknowns.push('what the next step towards it is')
  if (draft.baseline === undefined || draft.baseline.trim() === '') {
    unknowns.push('where you are starting from')
  }
  if ((draft.evidence ?? []).length === 0) unknowns.push('what would count as getting somewhere')

  return {
    kind: 'destination',
    interpretation: `Something you are aiming at in ${area}: “${aim}”. Kept in your words, never scored, and yours to change or drop.`,
    creates,
    unknowns,
    problems,
  }
}

/**
 * The sentence the owner agrees to before a destination is written — QA-84-005.
 *
 * Here rather than in the panel's JSX, and that placement is the repair. The
 * confirmation was composed inline as `describeMilestone(milestone || 'that', …)`,
 * so leaving the optional next step empty — the ordinary case, and the one
 * D-173 exists to protect — produced *"The next step in Career & Learning:
 * ‘that’. The app will treat this as what you are currently studying, and start
 * suggesting work on it."* Nothing of the sort was written, correctly.
 *
 * A sentence a surface composes is a sentence no test can read. This one is a
 * function of what the owner has typed, so it can be held to what will actually
 * happen — which is what `destination-and-discovery.test.ts` does, and what
 * caught nothing while the sentence lived in a template literal.
 */
export function milestoneConfirmation(
  milestone: string,
  domain: LifeDomainId,
  area: string,
): string {
  const named = milestone.trim()
  if (named === '') {
    return 'Leave this empty and nothing is created for it. You can name the next step later, from this page.'
  }
  return describeMilestone(named, domain, area)
}

/**
 * What making this the next step will mean, said before it is made.
 *
 * ## The Health sentence was true when it was written and false when it shipped
 *
 * QA-84-008. It said *"the app will know it is what you are working towards; it
 * will not start suggesting it"* — an accurate description of the behaviour
 * QA-84-001 then went and changed. `healthCandidates` proposes a Health
 * destination's next milestone, which is the whole of that repair, so within one
 * round the owner was told the app would not suggest the step and then shown it
 * suggested, in the next screen, on the same evening.
 *
 * **The class is not "a stale string".** It is *a confirmation that describes an
 * engine behaviour*, which has to be re-read every time that behaviour moves —
 * and there is no compiler edge between `candidates.ts` and this sentence. What
 * closes it is a test that reads the confirmation and then makes the app do the
 * thing, on one path, rather than two tests each holding one half.
 *
 * ## Why the Health wording is still not the Career wording
 *
 * `healthCandidates` returns nothing at all unless the body has something to
 * spend — no usable strain reading, or any strain at all, and the generator is
 * silent. Saying it will simply "start suggesting" the step would overclaim in
 * the other direction on a run of bad nights, so the sentence carries the
 * condition the generator actually applies.
 *
 * **And it is still not AUD-0045.** A routine the owner introduces through the
 * authoring control is never suggested; a routine that is not a destination's
 * next step is never suggested. This sentence is only ever composed for a
 * destination's next step, which is the one thing that is.
 */
export function describeMilestone(name: string, domain: LifeDomainId, area: string): string {
  const kind = milestoneEntityKind(domain)
  if (kind === 'learning-topic') {
    return `The next step in ${area}: “${name}”. The app will treat this as what you are currently studying, and start suggesting work on it.`
  }
  if (kind === 'financial-goal') {
    return `The next step in ${area}: “${name}”. The app will treat this as the money thing that is open, and start suggesting you deal with it.`
  }
  if (kind === 'routine') {
    return `The next step in ${area}: “${name}”. The app will treat this as what you are working towards, and start suggesting it on evenings there is something to spend on it.`
  }
  return `The next step in ${area}: “${name}”.`
}

/**
 * The question whose answer becomes the next step, in the area's own terms —
 * routing 91, package 91.2.
 *
 * ## The gap this closes, named exactly
 *
 * Correction 3.6: `MILESTONE_ENTITY` is what makes a destination reach Now, and
 * it is written by {@link milestoneRecords} — **not** by
 * {@link destinationRecords}. So a destination with no milestone creates a
 * `destination` entity that no generator consumes, in any area, and a bare aim
 * changes nothing at all. The phase had two ways out: make the bare aim reach
 * Now by some other route, or make the clarification reach a milestone.
 *
 * **It is the clarification, and the reason is that a bare aim has nothing to
 * act on.** *"More money"* names no work. A generator that produced a move from
 * it would have to invent the work — which is `vocabulary.ts`'s one prohibition
 * (*the engine may name its own routines; it may never name the owner's life*)
 * and F36's precision rule in the same breath. What the app can honestly do is
 * ask **one** concrete question and let his answer be the work.
 *
 * ## Why it is keyed on the same table the entity is
 *
 * {@link milestoneEntityKind} decides what the answer becomes, and this decides
 * what he is asked for. Keying both on one table is QA-84-008's standing lesson:
 * the Health confirmation was accurate when it was written and false when it
 * shipped, because the sentence and the behaviour it described lived where no
 * compiler edge joined them. Here the question, the entity and
 * {@link describeMilestone} are three readings of one row.
 */
export function milestoneQuestion(domain: LifeDomainId, aim: string): string {
  const kind = milestoneEntityKind(domain)
  if (kind === 'learning-topic')
    return `What would you be learning or working on, towards “${aim}”?`
  if (kind === 'financial-goal')
    return `What is the money thing you would deal with first, towards “${aim}”?`
  if (kind === 'routine') return `What would you actually do, towards “${aim}”?`
  return `What would be the next step towards “${aim}”?`
}

function milestoneRecords(
  name: string,
  draft: DestinationDraft,
  destination: EntityRef,
  situation: Situation,
  moment: AuthoringMoment,
): AuthoringResult {
  const kind = milestoneEntityKind(draft.domain)
  const build = createRecordFactory({
    zone: moment.zone,
    provenance: AUTHORING_PROVENANCE,
    ...(moment.nextId === undefined ? {} : { nextId: moment.nextId }),
  })

  const entity = createEntity({
    kind,
    label: name,
    domain: draft.domain,
    privacy: situation.domains.defaultPrivacyFor(draft.domain),
    createdAt: moment.now,
    links: [{ relation: 'supports-goal', target: destination.id }],
  })
  const ref: EntityRef = { id: entity.id, kind: entity.kind }
  const envelope = () => ({
    occurredAt: moment.now,
    recordedAt: moment.recordedAt,
    id: moment.nextId?.() ?? newRecordId(),
    domains: [draft.domain],
    entities: [ref],
  })

  const window =
    draft.milestoneBy === undefined
      ? undefined
      : (() => {
          const date = civilDateFromDayId(draft.milestoneBy)
          return dueWindow(
            instantAtLocal({ ...date, hour: 0, minute: 0, second: 0 }, moment.zone),
            instantAtLocal({ ...date, hour: 23, minute: 59, second: 59 }, moment.zone),
          )
        })()

  const records: CanonicalRecord[] = [
    build('goal', envelope(), {
      goal: ref,
      statement: name,
      status: 'active',
      ...(window === undefined ? {} : { targetWindow: window }),
      milestoneOf: destination,
    }),
  ]

  /*
   * And in Career, the fact the study generator has always read — the brief's
   * step 3, closed exactly where it stopped.
   *
   * `careerCandidates` resolves `career.current-learning-topic` to an **entity**
   * and returns nothing when it cannot. The owner could already state the topic
   * as text; what he could not do was create the thing the text was about. This
   * is the same fact he could always write, now pointing at something.
   */
  if (kind === 'learning-topic') {
    records.push(
      build('explicit-fact', envelope(), {
        concept: CONCEPT.learningTopic,
        value: { type: 'entity', value: ref },
      }),
    )
  }

  return { entities: [entity], records, created: ref }
}

/**
 * Set a next step aside because the aim moved areas — QA-91-005.
 *
 * ## What the first repair got wrong, and it was the interesting kind of wrong
 *
 * Round 1 **re-typed** the milestone into the area the aim was moving to, so
 * that a `financial-goal` became a `learning-topic`. The reasoning was that the
 * app should undo its own classification. What it actually did was invent a new
 * one: the entity kind is not filing, it is **meaning**, and the career
 * generator duly proposed *"Build a small lab with Clear the credit card rather
 * than reading about Clear the credit card."* Undoing an interpretation by
 * substituting another interpretation is not undoing it.
 *
 * ## What it does instead
 *
 * Nothing to the words and nothing to the meaning. The step he named in answer
 * to the old area's question is **set aside**: the `goal` record is superseded
 * with its statement byte-identical, its `milestoneOf` intact and its status no
 * longer active, so the app stops suggesting it and the record still says he
 * named it. It is the same shape the owner's own *"No longer this"* gesture
 * writes, through the same builder, because it is the same act.
 *
 * `paused` rather than `abandoned`: he has not given up on clearing the credit
 * card. What ended is the question it was the answer to.
 *
 * ## And the agenda asks again, in the new area's own words
 *
 * A set-aside milestone is not a destination's `next` (`destinations.ts`), so
 * the one outstanding question about this aim comes back — and the resolved
 * area now words it. If the answer is the same sentence he can type it again,
 * and it becomes the kind of object that area actually consumes. **The app asks
 * rather than guessing**, which is the whole difference between this and the
 * repair it replaces.
 */
export function setMilestoneAside(previous: GoalRecord, moment: AuthoringMoment): GoalRecord {
  return goalCorrectionRecord(
    { previous, statement: previous.statement, status: 'paused' },
    { now: moment.now, zone: moment.zone, recordedAt: moment.recordedAt },
    moment.nextId?.() ?? newRecordId(),
  )
}

/**
 * A revision of a destination, superseding the record it replaces.
 *
 * Nothing is edited and nothing is deleted — the earlier wording stays exactly
 * as he wrote it, which is the whole reason an aspiration is worth storing
 * rather than inferred. The same shape `goalCorrectionRecord` uses, for the
 * same reason.
 */
export function reviseDestinationRecord(
  previous: DestinationRecord,
  changes: {
    readonly aim?: string
    readonly state?: DestinationState
    readonly baseline?: string | null
    readonly evidence?: readonly string[]
    readonly unknowns?: readonly string[]
    /**
     * Which area it is filed in — routing 91, and only the owner moves it.
     *
     * Reached by exactly one gesture: taking back a reading he had agreed to,
     * which puts the aim back in the area the question was asked in. There is
     * no control anywhere that moves a destination the app was never told to
     * move, and the brief's rule 4 is what says there may not be one.
     */
    readonly domain?: LifeDomainId
  },
  moment: AuthoringMoment,
  id?: RecordId,
): DestinationRecord {
  const build = createRecordFactory({
    zone: moment.zone,
    provenance: AUTHORING_PROVENANCE,
    ...(moment.nextId === undefined ? {} : { nextId: moment.nextId }),
  })
  const baseline =
    changes.baseline === undefined ? previous.baseline : (changes.baseline ?? undefined)
  const evidence = changes.evidence ?? previous.evidence
  const unknowns = changes.unknowns ?? previous.unknowns

  return build(
    'destination',
    {
      occurredAt: moment.now,
      recordedAt: moment.recordedAt,
      ...(id === undefined ? {} : { id }),
      domains: changes.domain === undefined ? [...previous.domains] : [changes.domain],
      entities: [...previous.entities],
      privacy: previous.privacy,
      supersedes: previous.id,
    },
    {
      destination: previous.destination,
      aim:
        changes.aim?.trim() === undefined || changes.aim.trim() === ''
          ? previous.aim
          : changes.aim.trim(),
      state: changes.state ?? previous.state,
      ...(baseline === undefined ? {} : { baseline }),
      ...(evidence === undefined || evidence.length === 0 ? {} : { evidence }),
      ...(unknowns === undefined || unknowns.length === 0 ? {} : { unknowns }),
    },
  )
}

/**
 * Something that happened with somebody — F19, and the fourth record kind that
 * had no owner route.
 *
 * Deliberately small, and deliberately about a person the owner has already
 * introduced. There is no free-form "log an event" control anywhere in this
 * product and this is not one: it names a person from the graph, takes the
 * owner's own sentence, and stores it as what it is.
 *
 * `quality` is not asked. AUD-0047's rule is that a quality signal may only
 * suppress and never rank, and asking a man to grade an evening with his
 * daughter on a three-point scale is the kind of question section 4.5 refuses —
 * so the field stays absent, which is a real state and stays one.
 */
export function relationshipEventRecord(
  person: EntityRef,
  nature: string,
  domain: LifeDomainId,
  moment: AuthoringMoment,
): CanonicalRecord {
  const build = createRecordFactory({
    zone: moment.zone,
    provenance: AUTHORING_PROVENANCE,
    ...(moment.nextId === undefined ? {} : { nextId: moment.nextId }),
  })
  return build(
    'relationship-event',
    {
      occurredAt: moment.now,
      recordedAt: moment.recordedAt,
      id: moment.nextId?.() ?? newRecordId(),
      domains: [domain],
      entities: [person],
    },
    { withEntity: person, nature: nature.trim() },
  )
}

/**
 * Where each proving domain's first destination sits, for the discovery agenda.
 *
 * **Three, and only three** — Career, Health and Money. The adjudication is
 * explicit that Fatherhood is outside the proving scope: the growth model is
 * the product's best-evidenced mechanism, Phases 81 and 82 each corrected it,
 * and it is the hardest place to prove a new object and the worst place to
 * break one. It joins once the shape is proved.
 */
export const PROVING_DOMAINS: readonly LifeDomainId[] = [DOMAIN.career, DOMAIN.health, DOMAIN.money]

/** Minutes into the day, for a surface that has an `HH:MM` string. */
export function minutesFromClock(text: string): number | undefined {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim())
  if (match === null) return undefined
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return undefined
  return minutesIntoDay(localTimeOfDay(hour, minute))
}

/** A day id from an `<input type="date">` value, or nothing. */
export function dayFromInput(text: string): LocalDayId | undefined {
  return parseLocalDayId(text.trim())
}

/** A ref to a destination by the name it was given, for tests and fixtures. */
export function destinationRef(aim: string): EntityRef {
  return entityRef('destination', aim)
}
