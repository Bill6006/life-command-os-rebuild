import type { DomainRegistry, LifeDomainId } from '../domain/domains'
import type { EntityIndex, EntityRef } from '../domain/entities'
import type { RecordId } from '../domain/ids'
import { basisOf, type Knowledge } from '../domain/knowledge'
import type { DueWindow } from '../domain/windows'
import {
  isSameLocalWeek,
  localDayIdAt,
  localDaysBetween,
  localWeekIdAt,
  type Instant,
  type LocalDayId,
  type LocalWeekId,
  type TimeZoneId,
  type WeekStartDay,
} from '../domain/time'
import type { FactValue, GoalRecord, GoalStatus } from '../domain/records'
import type { MemoryView } from '../memory/view'
import { resolveDestinations, type ActiveDestination } from './destinations'
import { entityValue, textValue } from './values'

/**
 * Direction — what the owner is aiming at this week and beyond
 * (canonical plan sections 17.1 and 21).
 *
 * Section 21 is unusually specific about the failures this has to avoid, and
 * every one of them is a real defect from the previous generation: a non-career
 * direction mislabelled as career, a direction that carries no semantic
 * category, a custom wording that stops being visible, and a week that never
 * ends.
 *
 * So three rules hold here.
 *
 * **The category comes from the data or it does not exist.** A direction that
 * names an entity gets that entity's life domain. A direction stored as free
 * text is categorised only when the text unambiguously names a domain.
 * Anything else is `uncategorised` — never career, never a default. There is no
 * fallback domain in this file, and scenario G-008 is the test that says so.
 *
 * **The owner's wording survives.** Whatever the owner called it is carried
 * through unchanged, including when the category could not be worked out.
 *
 * **A week ends at the owner's week boundary.** Not seven days after it was
 * set. The direction record is compared against the owner-local week the
 * decision is being made in, using the owner's own week start.
 */

export type WeeklyDirection =
  | {
      readonly state: 'set'
      readonly category: LifeDomainId
      readonly wording: string
      readonly weekId: LocalWeekId
      readonly setAt: Instant
      readonly source: RecordId
    }
  | {
      /** Stated, but nothing in it names a life domain. It pulls arbitration nowhere. */
      readonly state: 'uncategorised'
      readonly wording: string
      readonly weekId: LocalWeekId
      readonly setAt: Instant
      readonly source: RecordId
    }
  | {
      /** Belonged to an earlier owner-local week. Kept visible, no longer in force. */
      readonly state: 'expired'
      readonly wording: string
      readonly weekId: LocalWeekId
      readonly setAt: Instant
      readonly source: RecordId
    }
  | { readonly state: 'none' }

/**
 * One named piece of a goal, and whether the record holds a session about it.
 *
 * "Covered" is deliberately the weakest claim the evidence supports: something
 * about this piece has actually happened and been written down. It is not
 * "mastered", it is not "finished", and it never becomes a share of a whole —
 * the app says *four of nine topics have had a session* and stops there
 * (section 22, AUD-0021).
 */
export interface GoalPart {
  readonly ref: EntityRef
  readonly covered: boolean
}

/**
 * How much time a goal has left, when the owner has said — AUD-0046.
 *
 * `GoalRecord.targetWindow` has existed, parsed, serialised and reached
 * `ActiveGoal` since Phase 1, and nothing read it. This is the reading.
 *
 * Undefined means the owner has not given the goal a date, which is a real
 * state and stays one: an absent horizon is never a default (G-009), so a goal
 * without one behaves exactly as it did before this existed.
 */
export interface GoalHorizon {
  readonly window: DueWindow
  /** The owner-local day the window closes on. */
  readonly dueDay: LocalDayId
  /** Whole owner-local days until the latest end of the window. Negative once past. */
  readonly daysRemaining: number
  readonly passed: boolean
}

export interface ActiveGoal {
  readonly goal: EntityRef
  readonly statement: string
  readonly domain: LifeDomainId
  readonly source: RecordId
  /**
   * Where the goal stands, carried rather than filtered away — F05.
   *
   * `DirectionState.goals` is still only the active ones and every reader of it
   * behaves exactly as it did. What this buys is the other question: a
   * milestone that has been **reached** is the one piece of progress evidence
   * the owner supplies directly, and a list that dropped it could only ever
   * describe what is still outstanding.
   */
  readonly status: GoalStatus
  /** The destination this is a milestone of, where it is one — F01. */
  readonly milestoneOf: EntityRef | undefined
  readonly targetWindow: DueWindow | undefined
  /** The owner-local day the goal was set on, so its span can be measured. */
  readonly setDay: LocalDayId
  /** The horizon, read rather than merely carried — AUD-0046. */
  readonly horizon: GoalHorizon | undefined
  /** The named pieces, with what the record says about each. Empty is normal. */
  readonly parts: readonly GoalPart[]
}

/**
 * Whether something actually measures this goal as behind — AUD-0046.
 *
 * The trigger `goal-behind` used to be raised whenever a career goal merely
 * existed, and `evaluate.ts` pays it `urgency 0.4` — so every career
 * recommendation carried an urgency premium justified by a claim nothing
 * checked. There is even an owner-facing template for it: *"X is behind where
 * you wanted."* This is the check that has to pass before any of that is said.
 *
 * **The measurement is the trajectory, and it invents no pace.** The app knows
 * when the goal was set, when the owner said it should be done by, and how many
 * of its named pieces have had a session. A goal is behind when less of the
 * work has moved than of the time: at the halfway point of a certification with
 * nine topics, four done sits on the line and none done does not. There is no
 * tuned constant here because there is nothing to tune — both quantities are
 * the owner's own.
 *
 * **Both halves are required, and their absence is not a default.** Without a
 * horizon there is no date to be behind of; without parts there is no work to
 * be behind on. Where either is missing the trigger is simply not raised, which
 * is what the app should have been doing all along and is G-009's rule applied
 * to a claim rather than to a reading.
 *
 * **The comparison never reaches a surface.** It is a ratio, and a ratio about
 * a man's own certification is a completion percentage with the arithmetic
 * hidden (section 22, AUD-0021). What the owner reads is
 * {@link describeGoalTrajectory} — counts of pieces and a date, and nothing
 * that grades him.
 */
export function goalIsBehind(goal: ActiveGoal): boolean {
  const horizon = goal.horizon
  if (horizon === undefined) return false
  if (goal.parts.length === 0) return false

  const covered = goal.parts.filter((part) => part.covered).length
  if (covered === goal.parts.length) return false
  if (horizon.passed) return true

  const total = localDaysBetween(goal.setDay, horizon.dueDay)
  // A goal whose date is the day it was set has no span to be behind within,
  // and dividing by it would manufacture one.
  if (total <= 0) return false
  const gone = total - horizon.daysRemaining
  if (gone <= 0) return false

  return covered * total < gone * goal.parts.length
}

/**
 * The goal's trajectory in ordinary words, or nothing to say.
 *
 * Counts and a stretch of time. No share, no percentage, no "on track" verdict
 * — AUD-0021 is explicit that a "4 of 9" reading is one short step from a
 * completion percentage, which is a score by another name, so the sentence
 * names the pieces and the date and lets the owner draw the line himself.
 *
 * Undefined where there is nothing measured to report, rather than a sentence
 * about the absence: a goal with no parts and no date is a statement the owner
 * wrote down, and the app has nothing to add to it.
 */
export function describeGoalTrajectory(goal: ActiveGoal): string | undefined {
  const parts: string[] = []

  if (goal.parts.length > 0) {
    const covered = goal.parts.filter((part) => part.covered).length
    parts.push(
      covered === 0
        ? `None of the ${goal.parts.length} pieces has had a session yet.`
        : `${covered} of ${goal.parts.length} pieces have had a session.`,
    )
  }

  const horizon = goal.horizon
  if (horizon !== undefined) parts.push(describeHorizon(horizon))

  return parts.length === 0 ? undefined : parts.join(' ')
}

/**
 * How far off the date is, without calling a passed one a failure.
 *
 * Section 4.4 forbids framing a missed goal as failure, and AUD-0046 says so
 * again for this field in particular: the copy must be able to say a goal is
 * close to its date without saying he is behind on his life. So a date that has
 * gone by is reported as a date that has gone by.
 */
function describeHorizon(horizon: GoalHorizon): string {
  const days = horizon.daysRemaining
  if (horizon.passed) {
    const over = Math.abs(days)
    if (over === 0) return 'The date you set is today.'
    if (over < 14) return `The date you set was ${over === 1 ? 'a day' : `${over} days`} ago.`
    return `The date you set was ${Math.round(over / 7)} weeks ago.`
  }
  if (days === 0) return 'The date you set is today.'
  if (days === 1) return 'The date you set is tomorrow.'
  if (days < 14) return `The date you set is ${days} days out.`
  return `The date you set is ${Math.round(days / 7)} weeks out.`
}

export interface DirectionState {
  readonly weekly: WeeklyDirection
  readonly goals: readonly ActiveGoal[]
  /**
   * What the owner is trying to become, with its milestones — F01, D-162.
   *
   * A third horizon beside the week and the goal, and the longest one the model
   * has ever held. It carries no number and pulls no dimension of its own: what
   * a destination changes about tonight it changes **through its milestone**,
   * which is an ordinary goal and is ranked as one. That is not a shortcut — it
   * is the only wiring that leaves Phase 82's re-cut instrument untouched
   * (D-137, D-138) while still letting an aspiration reach a decision.
   */
  readonly destinations: readonly ActiveDestination[]
  /** Domains the owner is currently pointed at, most direct first. */
  readonly emphasised: readonly LifeDomainId[]
}

/**
 * Match free text against the domain registry.
 *
 * Only an unambiguous name counts: the domain's own id, or its full label. A
 * near-miss returns nothing, which is what keeps "Adaya" or "get out more" from
 * being filed under whichever domain happens to be first in the list.
 */
export function domainFromText(text: string, domains: DomainRegistry): LifeDomainId | undefined {
  const wanted = text.trim().toLowerCase()
  if (wanted === '') return undefined
  for (const domain of domains.all()) {
    if (domain.id.toLowerCase() === wanted) return domain.id
    if (domain.label.toLowerCase() === wanted) return domain.id
  }
  return undefined
}

interface DirectionMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  readonly weekStartsOn: WeekStartDay
}

function categoryOf(
  value: FactValue,
  entities: EntityIndex,
  domains: DomainRegistry,
): { readonly category: LifeDomainId | undefined; readonly wording: string } {
  const asEntity = entityValue(value)
  if (asEntity !== undefined) {
    const entity = entities.resolve(asEntity)
    // The entity carries both halves: its domain is the semantic category, and
    // its label is what the owner called this week.
    if (entity === undefined) return { category: undefined, wording: asEntity.id }
    return { category: entity.domain, wording: entity.label }
  }

  const asText = textValue(value)
  if (asText !== undefined) return { category: domainFromText(asText, domains), wording: asText }

  return { category: undefined, wording: '' }
}

/**
 * The week's direction, from the reading the decision already took — AUD-0040.
 *
 * The reading arrives as an argument rather than being fetched, and the reason
 * is the finding rather than style: `assembleSituation` read `weeklyFocus` and
 * this function read it again a few lines later, from the same store, through a
 * different door. Two reads of one fact is two answers waiting to disagree —
 * and the second one would not have gone through the permission check, so a
 * concept the owner had not allowed the app to reason from would have been
 * legible here and withheld everywhere else.
 */
export function resolveWeeklyDirection(
  view: MemoryView,
  moment: DirectionMoment,
  domains: DomainRegistry,
  knowledge: Knowledge<FactValue>,
): WeeklyDirection {
  // Stale is still a direction that was set; whether it is in force is a week
  // question, answered below. Only "we never had one" ends here.
  if (knowledge.state === 'unknown') return { state: 'none' }

  // The record that actually produced the answer, not every record that
  // mentioned the concept — the trace has to point at the right row.
  const source = basisOf(knowledge)[0]
  if (source === undefined) return { state: 'none' }

  const setAt = knowledge.observedAt
  const weekId = localWeekIdAt(setAt, moment.zone, moment.weekStartsOn)
  const { category, wording } = categoryOf(knowledge.value, view.entities, domains)
  const common = { wording, weekId, setAt, source }

  if (!isSameLocalWeek(setAt, moment.now, moment.zone, moment.weekStartsOn)) {
    return { state: 'expired', ...common }
  }
  if (category === undefined) return { state: 'uncategorised', ...common }
  return { state: 'set', category, ...common }
}

/**
 * Which of a goal's pieces the record holds a session about — AUD-0021.
 *
 * A session is a completion or an answered outcome naming that piece: both
 * carry the move's subject and object on the envelope, so a recall session
 * about subnetting names subnetting whichever of the two it happens to be. An
 * observation about a piece does not count — knowing something about a topic is
 * not the same as having sat down with it, and the sentence the owner reads
 * says "have had a session".
 *
 * Records after the moment being decided are excluded, so replaying a history
 * at an earlier hour reports what was true then rather than what is true now.
 */
function coveredParts(view: MemoryView, at: Instant): ReadonlySet<string> {
  const covered = new Set<string>()
  for (const record of view.history.effective) {
    if (record.occurredAt > at) continue
    if (record.kind !== 'action-completion' && record.kind !== 'outcome') continue
    for (const ref of record.entities) covered.add(ref.id)
  }
  return covered
}

function horizonOf(
  window: DueWindow | undefined,
  moment: DirectionMoment,
): GoalHorizon | undefined {
  if (window === undefined) return undefined
  const today = localDayIdAt(moment.now, moment.zone)
  const due = localDayIdAt(window.latest, moment.zone)
  const daysRemaining = localDaysBetween(today, due)
  return { window, dueDay: due, daysRemaining, passed: daysRemaining < 0 }
}

/**
 * Every goal in the record, whatever state it is in.
 *
 * Split out from {@link activeGoals} rather than inlined into it, because two
 * different questions were being answered by one filter. What may pull a
 * decision is the **active** goals, and that is unchanged. What a destination
 * is made of is all of them: a milestone the owner has marked reached is the
 * clearest progress evidence in the product, and dropping it here would leave a
 * destination able to describe only what is still outstanding.
 */
export function allGoals(view: MemoryView, moment: DirectionMoment): readonly ActiveGoal[] {
  const goals: ActiveGoal[] = []
  const covered = coveredParts(view, moment.now)
  for (const record of view.history.effective) {
    if (record.kind !== 'goal') continue
    const goal = record as GoalRecord
    if (goal.occurredAt > moment.now) continue
    const domain = goal.domains[0] ?? view.entities.resolve(goal.goal)?.domain
    if (domain === undefined) continue
    goals.push({
      goal: goal.goal,
      statement: goal.statement,
      domain,
      source: goal.id,
      status: goal.status,
      milestoneOf: goal.milestoneOf,
      targetWindow: goal.targetWindow,
      setDay: localDayIdAt(goal.occurredAt, moment.zone),
      horizon: horizonOf(goal.targetWindow, moment),
      parts: (goal.parts ?? []).map((ref) => ({ ref, covered: covered.has(ref.id) })),
    })
  }
  return goals
}

export function activeGoals(view: MemoryView, moment: DirectionMoment): readonly ActiveGoal[] {
  return allGoals(view, moment).filter((goal) => goal.status === 'active')
}

export function resolveDirection(
  view: MemoryView,
  moment: DirectionMoment,
  domains: DomainRegistry,
  weeklyFocus: Knowledge<FactValue>,
): DirectionState {
  const weekly = resolveWeeklyDirection(view, moment, domains, weeklyFocus)
  const everyGoal = allGoals(view, moment)
  const goals = everyGoal.filter((goal) => goal.status === 'active')
  const destinations = resolveDestinations(view, moment, everyGoal)

  const emphasised: LifeDomainId[] = []
  if (weekly.state === 'set') emphasised.push(weekly.category)
  for (const goal of goals) if (!emphasised.includes(goal.domain)) emphasised.push(goal.domain)
  /*
   * A destination points at its area too, and it points last.
   *
   * Behind the week and behind the goals, because it is the least urgent claim
   * of the three: a man is aiming at something for years and at a goal for
   * months. It says which areas are his, not which is tonight's.
   */
  for (const destination of destinations) {
    if (destination.state !== 'active') continue
    if (!emphasised.includes(destination.domain)) emphasised.push(destination.domain)
  }

  return { weekly, goals, destinations, emphasised }
}
