import { entityRef, type EntityRef, type SemanticEntity } from '../domain/entities'
import { DOMAIN } from '../domain/domains'
import type { RecordId } from '../domain/ids'
import { bearsConcept, type FactValue } from '../domain/records'
import type { Instant } from '../domain/time'
import { conceptId, type ConceptId } from '../domain/windows'
import type { MemoryView } from '../memory/view'
import type { Demand, MoveProfile } from './moves'

/**
 * The owner's own movement routines — AUD-0045, C20, F12.
 *
 * ## The finding
 *
 * `healthCandidates` hard-coded its subject: `subject: A_WALK, object: A_WALK`.
 * The entire Health & Physical Capacity domain had one verb and one object, so
 * every owner, on every good day, forever, got *"Move for 25 minutes: a walk."*
 * If he swims, cycles, lifts or plays five-a-side the app could not suggest it
 * and he could not tell it. The entity kind `routine` was declared in Phase 1
 * and appeared **nowhere in `src/features/`**: no surface created one.
 *
 * ## Why the precondition is the bulk of the work
 *
 * The audit is explicit that `profileFor(verb)` had to become keyed on **(verb,
 * object)** before a second routine could safely participate, and that this is
 * a scoring-model change rather than a UI one. The profile supplies `size`,
 * `demand` and `friction`; the constraint filter reads them for `no-time` and
 * `too-strained`, and the evaluator reads them for `friction`, `time-fit`,
 * `opportunity-cost` and `capacity-fit`. A 25-minute walk and a 90-minute gym
 * session sharing one profile would make all six wrong.
 *
 * The audit offers two ways out and this takes the safer: **restrict the first
 * version to routines the owner sizes himself.** He names it, says how long it
 * takes and whether it means going out, and those three answers are the whole
 * of the object's shape. Nothing is guessed at, nothing is inferred from the
 * label, and a routine with no size behaves exactly as an unsized move already
 * does — `ActionTarget.minutes` has been optional since Phase 1 precisely so
 * that an absent duration is a real state rather than a zero (G-009, F36).
 *
 * ## Why these are not registry concepts
 *
 * The concept registry answers *what the app can know about the owner*. How
 * long a routine takes is a property of an **object**, and the place object
 * properties live is {@link MoveProfile}. Registering them would put "Routine
 * size" on the Health page as though it were a fact about him, would have
 * coverage measure how long it had been since he last told the app how long a
 * swim takes, and would make one global reading stand for every routine at
 * once — the last of which is simply wrong.
 *
 * So they are read here, from the records that carry them, with the routine's
 * own entity attached. That is the same shape `nightsWithin` uses for a sleep
 * shortfall, and for the same reason: the fact layer answers about the latest
 * reading of a concept, and this is a question about several objects.
 */

/** How long this routine takes, as the owner said when he named it. */
export const ROUTINE_SIZE: ConceptId = conceptId('routine.size')

/** Whether doing it means going out. The other half of C21's supervision pair. */
export const ROUTINE_OUTDOORS: ConceptId = conceptId('routine.requires-leaving')

export interface RoutineShape {
  readonly ref: EntityRef
  readonly label: string
  /** Undefined where he did not say, which stays undefined rather than a guess. */
  readonly minutes: number | undefined
  readonly requiresLeaving: boolean
  readonly namedAt: Instant
  readonly sources: readonly RecordId[]
}

/**
 * Where the line between light and effortful sits, in minutes.
 *
 * Half an hour. It is the same boundary the existing catalogue already draws
 * without saying so — `time-with` is 30 minutes and light, `move` is 25 and
 * effortful, `hands-on-lab` is 45 and effortful — so this makes an existing
 * judgement explicit rather than inventing a new one. A routine the owner sizes
 * at an hour is not the same ask as one he sizes at fifteen minutes, and
 * `capacity-fit`, `too-strained` and `protection` all turn on which it is.
 */
const LONG_ENOUGH_TO_BE_EFFORTFUL = 30

/**
 * The routines the owner has named in an area, most recently named first.
 *
 * Read from `history.effective`, so a re-authored routine supersedes the old
 * shape the same way every other correction works, and a retracted one is
 * simply gone.
 */
export function collectRoutines(
  view: MemoryView,
  domain: (typeof DOMAIN)[keyof typeof DOMAIN],
  now: Instant,
): readonly RoutineShape[] {
  /*
   * The routines start from the **entities**, not from the attribute records.
   *
   * A routine he named and said nothing else about is still a routine, and
   * reading the size records first would have made it invisible — which is the
   * same shape of mistake as requiring a goal to have a date. F04's rule is
   * *"accept partial information"*, and here that means a name on its own is a
   * complete answer.
   *
   * `view.entities` is the store's index, so it holds what the owner created
   * and never the engine's own standing routines — a walk, winding down,
   * easing off, a light day live only in the decision index (D-021). That is
   * what keeps this from proposing the app's own vocabulary back to it as
   * though he had chosen it.
   */
  const shapes = new Map<
    string,
    { minutes: number | undefined; requiresLeaving: boolean; at: Instant; sources: RecordId[] }
  >()

  for (const record of view.history.effective) {
    if (!bearsConcept(record)) continue
    if (record.occurredAt > now) continue
    if (record.concept !== ROUTINE_SIZE && record.concept !== ROUTINE_OUTDOORS) continue
    const ref = record.entities.find((entity) => entity.kind === 'routine')
    if (ref === undefined) continue

    const entry = shapes.get(ref.id) ?? {
      minutes: undefined,
      requiresLeaving: false,
      at: record.occurredAt,
      sources: [] as RecordId[],
    }
    entry.sources.push(record.id)
    if (record.occurredAt > entry.at) entry.at = record.occurredAt
    if (record.concept === ROUTINE_SIZE) entry.minutes = minutesOf(record.value) ?? entry.minutes
    if (record.concept === ROUTINE_OUTDOORS) {
      entry.requiresLeaving = record.value.type === 'boolean' ? record.value.value : false
    }
    shapes.set(ref.id, entry)
  }

  /*
   * Milestones are not routines, however they are stored.
   *
   * `milestoneEntityKind(DOMAIN.health)` is `routine`, so *"Move three times a
   * week"* — a step towards a destination — is a `routine` entity in the health
   * domain and would arrive here looking exactly like something he does. It is
   * not: it is a goal, `nextMilestoneIn` already proposes it as one, and
   * counting it here would both suggest it twice and silence the fallback walk
   * for every owner who has ever named a health destination.
   */
  const milestones = new Set<string>()
  for (const record of view.history.effective) {
    if (record.kind !== 'goal') continue
    milestones.add(record.goal.id)
  }

  const out: RoutineShape[] = []
  for (const entity of view.entities.all()) {
    if (entity.kind !== 'routine') continue
    if (entity.domain !== domain) continue
    if (entity.createdAt > now) continue
    if (milestones.has(entity.id)) continue
    const shape = shapes.get(entity.id)
    out.push({
      ref: { id: entity.id, kind: entity.kind },
      label: entity.label,
      minutes: shape?.minutes,
      requiresLeaving: shape?.requiresLeaving ?? false,
      namedAt: shape === undefined ? entity.createdAt : shape.at,
      sources: shape?.sources ?? [],
    })
  }
  return out.sort((a, b) => b.namedAt - a.namedAt)
}

function minutesOf(value: FactValue): number | undefined {
  if (value.type === 'duration') return value.minutes
  if (value.type === 'number') return value.value
  return undefined
}

/**
 * The engine's own routines, whose shapes are not the owner's to give.
 *
 * `a walk` is the only one that means going out, and saying so here is the
 * other half of C21: a supervision constraint can only remove a move if
 * something distinguishes an indoor move from an outdoor one, and until now
 * nothing did.
 */
const STANDING_SHAPES: ReadonlyMap<string, { readonly requiresLeaving: boolean }> = new Map([
  [entityRef('routine', 'a walk').id, { requiresLeaving: true }],
])

/**
 * This move's profile, with whatever the object says about itself laid over it.
 *
 * The verb decides what kind of thing it is; the object decides how big it is
 * and whether it means leaving the house. Where the object says nothing, the
 * result is exactly the verb's profile — which is what every move in the
 * catalogue was before this existed, so nothing already shipped moves.
 */
export function shapeProfile(
  base: MoveProfile,
  object: EntityRef,
  routines: readonly RoutineShape[],
): MoveProfile {
  const standing = STANDING_SHAPES.get(object.id)
  if (standing !== undefined) return { ...base, requiresLeaving: standing.requiresLeaving }

  const named = routines.find((routine) => routine.ref.id === object.id)
  if (named === undefined) return base

  const demand: Demand =
    named.minutes === undefined
      ? base.demand
      : named.minutes >= LONG_ENOUGH_TO_BE_EFFORTFUL
        ? 'effortful'
        : 'light'

  return {
    ...base,
    size: named.minutes,
    demand,
    requiresLeaving: named.requiresLeaving,
  }
}

/** The routine entity behind a name the owner typed. */
export function routineEntityFor(label: string): EntityRef {
  return entityRef('routine', label)
}

export type { SemanticEntity }
