import { CONCEPT } from '../domain/concepts'
import { coreDomains, type DomainRegistry, type LifeDomainId } from '../domain/domains'
import type { EntityIndex, EntityRef } from '../domain/entities'
import type { RecordId } from '../domain/ids'
import { basisOf, type Knowledge } from '../domain/knowledge'
import type { DueWindow } from '../domain/windows'
import {
  isSameLocalWeek,
  localWeekIdAt,
  type Instant,
  type LocalWeekId,
  type TimeZoneId,
  type WeekStartDay,
} from '../domain/time'
import type { FactValue, GoalRecord } from '../domain/records'
import type { MemoryView } from '../memory/view'
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

export interface ActiveGoal {
  readonly goal: EntityRef
  readonly statement: string
  readonly domain: LifeDomainId
  readonly source: RecordId
  readonly targetWindow: DueWindow | undefined
}

export interface DirectionState {
  readonly weekly: WeeklyDirection
  readonly goals: readonly ActiveGoal[]
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

export function resolveWeeklyDirection(
  view: MemoryView,
  moment: DirectionMoment,
  domains: DomainRegistry = coreDomains,
): WeeklyDirection {
  const knowledge: Knowledge<FactValue> = view.facts.knowledgeFor(CONCEPT.weeklyFocus)
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

export function activeGoals(view: MemoryView): readonly ActiveGoal[] {
  const goals: ActiveGoal[] = []
  for (const record of view.history.effective) {
    if (record.kind !== 'goal') continue
    const goal = record as GoalRecord
    if (goal.status !== 'active') continue
    const domain = goal.domains[0] ?? view.entities.resolve(goal.goal)?.domain
    if (domain === undefined) continue
    goals.push({
      goal: goal.goal,
      statement: goal.statement,
      domain,
      source: goal.id,
      targetWindow: goal.targetWindow,
    })
  }
  return goals
}

export function resolveDirection(
  view: MemoryView,
  moment: DirectionMoment,
  domains: DomainRegistry = coreDomains,
): DirectionState {
  const weekly = resolveWeeklyDirection(view, moment, domains)
  const goals = activeGoals(view)

  const emphasised: LifeDomainId[] = []
  if (weekly.state === 'set') emphasised.push(weekly.category)
  for (const goal of goals) if (!emphasised.includes(goal.domain)) emphasised.push(goal.domain)

  return { weekly, goals, emphasised }
}
