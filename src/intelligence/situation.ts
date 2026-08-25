import { CONCEPT, coreConcepts, type ConceptRegistry } from '../domain/concepts'
import { coreDomains, DOMAIN, type DomainRegistry, type LifeDomainId } from '../domain/domains'
import type { EntityIndex, EntityRef } from '../domain/entities'
import type { RecordId } from '../domain/ids'
import {
  basisOf,
  confidence,
  inferred,
  isUsable,
  unknown,
  type Confidence,
  type Knowledge,
} from '../domain/knowledge'
import {
  bearsConcept,
  describeFactValue,
  type CommitmentWindowSource,
  type DecisionContext,
  type FactValue,
} from '../domain/records'
import { occursOn } from '../domain/schedule'
import type { PrivacyClass } from '../domain/privacy'
import type { RecommendationSemantics } from '../domain/recommendation'
import {
  addLocalDays,
  blockOf,
  civilDateFromDayId,
  instantAtLocal,
  localDateTimeAt,
  localDayIdAt,
  localWeekIdAt,
  type DayBlock,
  type Instant,
  type LocalDayId,
  type LocalWeekId,
  type TimeZoneId,
  type WeekStartDay,
} from '../domain/time'
import type { ConceptId } from '../domain/windows'
import type { MemoryView } from '../memory/view'
import { assembleCoverage, type CoverageState } from './coverage'
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
import { booleanValue, hoursValue, minutesValue, narrowKnowledge, ratioValue } from './values'
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

export interface Capacity {
  readonly lastNightHours: Knowledge<number>
  readonly sleepDebtHours: Knowledge<number>
  readonly nightsSeen: number
  readonly energy: Knowledge<number>
  readonly soreness: Knowledge<number>
  readonly strain: Knowledge<Strain>
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

export interface ActiveConstraint {
  readonly concept: ConceptId
  readonly description: string
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
  readonly childPresent: Knowledge<boolean>
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
  readonly homeFriction: Knowledge<FactValue>
  readonly learningTopic: Knowledge<FactValue>
  readonly direction: DirectionState
  /** How well each life area is currently understood (section 8). */
  readonly coverage: CoverageState
  readonly limiter: Limiter | undefined
  readonly preferences: readonly OwnerPreference[]
  readonly constraints: readonly ActiveConstraint[]
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
  considered(): readonly ConsideredFact[]
}

function createFactReader(
  view: MemoryView,
  entities: EntityIndex,
  concepts: ConceptRegistry,
): FactReader {
  const seen = new Map<ConceptId, { entry: ConsideredFact; usedFor: string[] }>()

  return {
    read(concept, usedFor) {
      const knowledge = view.facts.knowledgeFor(concept)
      const existing = seen.get(concept)
      if (existing !== undefined) {
        if (!existing.usedFor.includes(usedFor)) existing.usedFor.push(usedFor)
        return knowledge
      }

      const definition = concepts.definitionFor(concept)
      const usedForList = [usedFor]
      seen.set(concept, {
        usedFor: usedForList,
        entry: {
          concept,
          label: definition.label,
          domain: definition.domain,
          privacy: definition.privacy,
          state: knowledge.state,
          reading:
            knowledge.state === 'unknown'
              ? `not known — ${knowledge.reason}`
              : describeFactValue(knowledge.value, (ref) => entities.labelFor(ref)),
          usedFor: usedForList,
          sources: basisOf(knowledge),
        },
      })
      return knowledge
    },
    considered: () => [...seen.values()].map((held) => held.entry),
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

function assembleCapacity(view: MemoryView, moment: SituationMoment, reader: FactReader): Capacity {
  const lastNightHours = narrowKnowledge(
    reader.read(CONCEPT.sleepHours, 'how much sleep last night'),
    hoursValue,
  )
  const energy = narrowKnowledge(reader.read(CONCEPT.energy, 'how much is left today'), ratioValue)
  const soreness = narrowKnowledge(
    reader.read(CONCEPT.soreness, 'whether the body is asking for a break'),
    ratioValue,
  )

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
    strain: assessStrain(sleepDebtHours, energy, nights.length),
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
  nightsSeen: number,
): Knowledge<Strain> {
  const debtHours = isUsable(debt) ? debt.value : undefined
  const energyLevel = isUsable(energy) ? energy.value : undefined

  if (debtHours === undefined && energyLevel === undefined) {
    return unknown('never-observed', 'nothing recent about sleep or energy')
  }

  const basis = [...basisOf(debt), ...basisOf(energy)]
  const observedAt = isUsable(debt)
    ? debt.observedAt
    : isUsable(energy)
      ? energy.observedAt
      : undefined
  if (observedAt === undefined) return unknown('never-observed')

  let level: Strain = 'none'
  if (debtHours !== undefined) {
    if (debtHours >= 5) level = 'severe'
    else if (debtHours >= 2.5) level = 'moderate'
  }
  if (energyLevel !== undefined && energyLevel <= 0.3 && level === 'none') level = 'moderate'

  const signals = (debtHours === undefined ? 0 : 1) + (energyLevel === undefined ? 0 : 1)
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
  strain: Knowledge<Strain>,
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

function collectConstraints(view: MemoryView, now: Instant): readonly ActiveConstraint[] {
  const constraints: ActiveConstraint[] = []
  for (const record of view.history.effective) {
    if (record.kind !== 'constraint') continue
    if (record.until !== undefined && record.until <= now) continue
    if (record.occurredAt > now) continue
    constraints.push({
      concept: record.concept,
      description: record.description,
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
  const reader = createFactReader(view, entities, concepts)

  // Worked out before anything is read, because what a fact is *for* is worded
  // from the hour — AUD-0001. The seam the audit found was exactly this: the
  // block was assembled after the limiter that needed it.
  const block = blockOf(moment.now, moment.zone)

  const capacity = assembleCapacity(view, moment, reader)
  const usableMinutes = narrowKnowledge(
    reader.read(CONCEPT.usableTimeTonight, 'how much time there is'),
    minutesValue,
  )
  const childPresent = narrowKnowledge(
    reader.read(CONCEPT.childPresent, `whether she is here ${horizonWord(block)}`),
    booleanValue,
  )
  const socialEnergy = narrowKnowledge(
    reader.read(CONCEPT.socialEnergy, 'whether company sounds good'),
    ratioValue,
  )
  const homeFriction = reader.read(CONCEPT.homeFriction, 'what is getting in the way at home')
  const learningTopic = reader.read(CONCEPT.learningTopic, 'what is being studied')
  reader.read(CONCEPT.weeklyFocus, 'what this week is pointed at')

  const local = localDateTimeAt(moment.now, moment.zone)

  // What the day already has in it, before anything is decided about it.
  const commitments = collectObligations(view, moment)
  const until = untilNextObligation(commitments, moment.now)
  const inHand = timeInHand(usableMinutes, until.minutes, until.binding)

  // One pass over history for both: the duplication check reads the recent end
  // of it, and learning reads all of it against the situation being decided.
  const episodes = collectEpisodes(view, moment.zone)
  const isWeekend = local.isoWeekday >= 6

  const coverage = assembleCoverage(view, entities, {
    now: moment.now,
    zone: moment.zone,
    domains,
    concepts,
  })

  return {
    at: moment.now,
    zone: moment.zone,
    dayId: local.dayId,
    weekId: localWeekIdAt(moment.now, moment.zone, moment.weekStartsOn),
    weekStartsOn: moment.weekStartsOn,
    block,
    isWeekend,
    context: contextFor(block, isWeekend, capacity.strain, childPresent, inHand.minutes),
    capacity,
    usableMinutes,
    commitments,
    nextObligation: until.next,
    minutesUntilNextObligation: until.minutes,
    inHand,
    childPresent,
    socialEnergy,
    homeFriction,
    learningTopic,
    direction: resolveDirection(view, moment, domains),
    coverage,
    threads: activeThreads(view, episodes, { now: moment.now, zone: moment.zone }),
    limiter: findLimiter(capacity, inHand, coverage, block),
    preferences: collectPreferences(view),
    constraints: collectConstraints(view, moment.now),
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
    }),
    considered: reader.considered(),
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
