import type { LifeDomainId } from '../domain/domains'
import type { EntityRef } from '../domain/entities'
import type { RecordId } from '../domain/ids'
import type { DestinationRecord, DestinationState } from '../domain/records'
import { localDayIdAt, type Instant, type LocalDayId, type TimeZoneId } from '../domain/time'
import type { MemoryView } from '../memory/view'
import type { ActiveGoal } from './direction'

/**
 * Destinations — what the owner is trying to become (F01, F35, D-162).
 *
 * ## Why this module exists at all
 *
 * The product could represent *what to do next* and could not represent *what
 * any of it was for*. Every object before this one is scoped to today or to a
 * bounded three-step course, and the review's central finding survived
 * verification against the tree: there was no `destination`, no `milestone` and
 * no `baseline` anywhere in `src/`. A system that cannot say what a man is
 * aiming at cannot say whether he is getting there, and cannot notice that a
 * plausible plan is the wrong one.
 *
 * ## The one guard that matters here
 *
 * **A destination is described, never scored** — D-162. Every reading this
 * module produces is either the owner's own words or a state from a closed
 * list, and there is no arithmetic anywhere in the file. That is deliberate and
 * it is structural: a phase whose whole subject is progress is exactly where a
 * percentage arrives looking reasonable, and the cheapest defence against one
 * is to have nothing to divide.
 *
 * ## A milestone is a goal
 *
 * What is next is a `goal` record carrying `milestoneOf`, not a second record
 * kind. A milestone is a named objective with a date and some work in it, which
 * is what a goal already is — and D-178's rule is that one thing has one name
 * in the layer every surface reads. What the field buys is the **word on
 * screen** and what may be concluded from finishing it: reaching a milestone is
 * not completing an action, and neither of them is finishing a course.
 */

export interface DestinationMilestone {
  readonly goal: ActiveGoal
  /**
   * Set aside because the aim moved areas — QA-91-005.
   *
   * A milestone is named in answer to a question the area asked, so moving the
   * aim leaves it belonging to a question that is no longer being put. It is not
   * reached and it is not still ahead; it is a third state, and it needs its own
   * word because *"still ahead"* about a step the app has stopped suggesting is
   * the screen disagreeing with the engine.
   */
  readonly setAside: boolean
  /**
   * Whether the owner has said this one is done.
   *
   * Read from the goal's own status and from nowhere else. **Never inferred
   * from what has been attended** — F05 is the finding, and a milestone that
   * marked itself reached because three sessions happened would be the exact
   * claim the review says the product must stop making.
   */
  readonly reached: boolean
}

export interface ActiveDestination {
  readonly destination: EntityRef
  /** What he is aiming at, exactly as he wrote it. */
  readonly aim: string
  readonly domain: LifeDomainId
  readonly state: DestinationState
  readonly source: RecordId
  readonly setDay: LocalDayId
  /** Where he says he is now. Undefined is a real answer and stays one. */
  readonly baseline: string | undefined
  readonly evidence: readonly string[]
  readonly unknowns: readonly string[]
  /** Every milestone named for it, in the order they were set. */
  readonly milestones: readonly DestinationMilestone[]
  /** The first one still to be reached, or nothing left named. */
  readonly next: DestinationMilestone | undefined
}

interface DestinationMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
}

/**
 * Every destination the record holds, with its milestones attached.
 *
 * Superseded records are already gone: `view.history.effective` is the resolved
 * history, so revising a destination leaves one row here and the earlier
 * wording stays legible underneath in Timeline. Records dated after the moment
 * being decided are excluded, so replaying a history at an earlier hour reports
 * what was true then — the same rule `activeGoals` follows for the same reason.
 */
export function resolveDestinations(
  view: MemoryView,
  moment: DestinationMoment,
  goals: readonly ActiveGoal[],
): readonly ActiveDestination[] {
  const out: ActiveDestination[] = []

  for (const record of view.history.effective) {
    if (record.kind !== 'destination') continue
    if (record.occurredAt > moment.now) continue
    const destination = record as DestinationRecord

    const domain = destination.domains[0] ?? view.entities.resolve(destination.destination)?.domain
    if (domain === undefined) continue

    const milestones = goals
      .filter((goal) => goal.milestoneOf?.id === destination.destination.id)
      .map((goal) => ({
        goal,
        reached: goal.status === 'achieved',
        setAside: goal.status !== 'active' && goal.status !== 'achieved',
      }))

    out.push({
      destination: destination.destination,
      aim: destination.aim,
      domain,
      state: destination.state,
      source: destination.id,
      setDay: localDayIdAt(destination.occurredAt, moment.zone),
      baseline: destination.baseline,
      evidence: destination.evidence ?? [],
      unknowns: destination.unknowns ?? [],
      milestones,
      /*
       * The first one still to be reached **and still live** — QA-91-005.
       *
       * A milestone set aside when the aim moved is not what is next: the app
       * has stopped suggesting it, and reporting it as the next step would make
       * the destination look like it has a way forward it does not have, and
       * would stop the agenda ever asking for a real one.
       */
      next: milestones.find((milestone) => !milestone.reached && !milestone.setAside),
    })
  }

  return out
}

/**
 * A destination in the five parts the review asked for — F01, F35.
 *
 * Aim, where he is now, what is next, what would count, and what is unknown.
 * Each is a sentence or nothing; there is no number, no bar and no verdict, and
 * a part the owner has not filled in reads as **not said yet** rather than as a
 * gap he is behind on (section 4.4).
 *
 * The absence sentences are here rather than on the surface, so the page and
 * the export cannot disagree about what an unstated baseline means — the same
 * reasoning D-175 applies to a promise, applied to a blank.
 */
export interface DestinationReading {
  readonly aim: string
  readonly baseline: string
  readonly next: string
  readonly evidence: readonly string[]
  readonly unknowns: readonly string[]
  /**
   * What is not known about this yet, said once.
   *
   * The list above is what the owner said he does not know. This is what the
   * **app** does not know, which is a different and more useful admission on a
   * surface whose whole job is to say what it understands.
   */
  readonly missing: readonly string[]
  /**
   * Which of the four parts the owner has actually said — routing 90, G-009.
   *
   * The surface needs this to typeset an absent part **as unstated**, in place,
   * rather than by leaving a row out and mentioning it in a footnote. A row
   * that is simply missing reads as a shorter destination; a row that says *not
   * said yet* reads as a question nobody has answered, which is what it is.
   *
   * It is a set of booleans and never a count. `stated` has no length, no
   * total and no order — there is deliberately nothing here a surface could
   * turn into "two of four", which is a completion figure and is what section
   * 22 and D-162 forbid about the owner. The four names are fixed, so a fifth
   * part would be a compile error rather than a silently uncounted one.
   */
  readonly stated: DestinationPartsStated
}

export interface DestinationPartsStated {
  readonly baseline: boolean
  readonly next: boolean
  readonly evidence: boolean
  readonly unknowns: boolean
}

const NOT_SAID_BASELINE = 'You have not said where you are starting from.'
const NOTHING_NEXT = 'Nothing is named as the next step yet.'
const NOT_SAID_EVIDENCE = 'You have not said what would count as getting somewhere.'
const NOT_SAID_UNKNOWNS = 'You have not said what you are unsure about.'

/**
 * What has been said and what has not, from one place.
 *
 * `missingParts` and `stated` are two readings of the same four conditions, and
 * two copies of them would eventually disagree — a page saying a part was
 * unstated above a sentence saying the app knew it. So the conditions are here
 * and both are derived from them.
 */
function statedParts(destination: ActiveDestination): DestinationPartsStated {
  return {
    baseline: destination.baseline !== undefined,
    next: destination.next !== undefined,
    evidence: destination.evidence.length > 0,
    unknowns: destination.unknowns.length > 0,
  }
}

export function describeDestination(destination: ActiveDestination): DestinationReading {
  const next = destination.next
  const stated = statedParts(destination)
  return {
    aim: destination.aim,
    baseline: destination.baseline ?? NOT_SAID_BASELINE,
    next: next === undefined ? NOTHING_NEXT : next.goal.statement,
    evidence: stated.evidence ? destination.evidence : [NOT_SAID_EVIDENCE],
    unknowns: stated.unknowns ? destination.unknowns : [NOT_SAID_UNKNOWNS],
    missing: missingParts(destination),
    stated,
  }
}

/**
 * The parts of a destination the app has not been told, named as questions.
 *
 * This is what the second agenda asks about (D-163) and what a domain page
 * offers to fill in, and computing it in one place is what keeps the two from
 * disagreeing about whether something is missing. It is deliberately a list of
 * **what is unknown**, never a count of how complete the object is: a
 * destination with one part filled in is not 25% of a destination.
 */
export function missingParts(destination: ActiveDestination): readonly string[] {
  const stated = statedParts(destination)
  const out: string[] = []
  if (!stated.baseline) out.push('where you are starting from')
  if (!stated.next) out.push('what the next step is')
  if (!stated.evidence) out.push('what would count as getting somewhere')
  if (!stated.unknowns) out.push('what you are unsure about')
  return out
}

/** The destinations for one life area, in the order they were set. */
export function destinationsIn(
  destinations: readonly ActiveDestination[],
  domains: readonly LifeDomainId[],
): readonly ActiveDestination[] {
  return destinations.filter((destination) => domains.includes(destination.domain))
}

/**
 * Whether a goal is a milestone of something rather than a goal on its own.
 *
 * One predicate, read by the domain page, the progress reading and the
 * instrument, so the word on screen cannot drift between them (D-178).
 */
export function isMilestone(goal: ActiveGoal): boolean {
  return goal.milestoneOf !== undefined
}
