import { coreConcepts, type ConceptDefinition } from '../domain/concepts'
import { isUsable, type Knowledge } from '../domain/knowledge'
import type { FactValue } from '../domain/records'
import type { ConceptId } from '../domain/windows'
import { CHECK_IN_READINGS, ANCHORS_PER_READING } from './readings'
import type { ConceptReadings } from './situation'

/**
 * The 0–100 state reading — D-287.
 *
 * ## What this is allowed to be, and what it may never become
 *
 * D-166 forbade a composite **wellness score** and named `emotional.score` as
 * *"the wellness score arriving through the back door"*. D-287 amends it, and
 * the amendment turns on a real distinction rather than on a rewording: what is
 * built here is a **state reading** — how he is right now, recomputed at every
 * check-in, closer to a thermometer than a report card.
 *
 * **The line is thin and D-287 says exactly where it is.** *"You are at 62"* is
 * a reading. *"A good day"*, *"a bad week"*, *"falling behind"* — any quality
 * adjective at all — is the thing D-166 refused, and the distinction survives
 * only while the number stays a reading. So this module produces a number and a
 * denominator and **no adjective, no band, no label and no verdict**, and
 * `tests/synthetic/state-score.test.ts` fails the build if one appears on any
 * surface that renders it.
 *
 * Section 4.4 is untouched: nothing here grades him as a person.
 *
 * ## Equal weights, and the screen says so
 *
 * D-287 approves **learned** weights and D-287 also says what has to be true
 * first: *"nine dimensions over a few weeks will overfit and will discover that
 * Thursdays matter… until the bar D-290 sets for chains is met, the honest
 * default is equal weighting, stated on screen as equal weighting."* D-290's bar
 * is not specified yet and no chain and no weight ships before it is. So every
 * dimension below counts the same, the screen says that in words, and
 * `LEARNED_WEIGHTS_NEED_A_BAR` is the reason written where the code is rather
 * than in a document somebody has to find.
 *
 * ## Which dimensions, and the rule is mechanical
 *
 * Every reading the check-in takes **about how he is now** that the registry
 * can read as a scale with a direction. Three exclusions fall out of that
 * sentence rather than being chosen:
 *
 * - **Loneliness.** `emotional.need-for-company` declares `sense: 'neither'`,
 *   and its registry comment is the reason: *"this is a want rather than a
 *   state: wanting company more is not a man doing worse, and it is not him
 *   doing better either."* A dimension with no better end cannot contribute to
 *   a ceiling that means *every dimension at its best*. It is read, it is shown,
 *   and it is not scored.
 * - **Hours slept.** A quantity, not a scale, and the only way to give it a
 *   ceiling is to pick a target — which is a norm, and a norm about the owner
 *   is the object §13G is about.
 * - **How the night went.** A scale with a direction, and still out, because it
 *   is a reading about **last night** rather than about now. Putting it in would
 *   make the score partly a measurement of a moment that has already finished,
 *   and it would put one of the strongest candidate *causes* of a good day
 *   inside the number that good day is measured by — which is the circularity
 *   D-290 warns about, arriving a phase early.
 *
 * Both sleep readings are still taken every morning and are still shown beside
 * the score. What they are not is terms in it.
 *
 * ## And a partial score is honest, where an invented one is not
 *
 * A dimension with no fresh reading is **left out and counted out loud** —
 * *"from 9 of the 10 readings it is made of"*. G-009 forbids the alternative:
 * an unanswered reading does not become a zero, an average, a carried-over value
 * from this morning or anything else. The owner's own rule governs — questions
 * are for facts, and the forecast, which is not in this phase, is the only place
 * the app may assume.
 *
 * With nothing fresh at all there is no score, rather than a score of nought.
 */

/**
 * Why the weights are equal, quoted where the arithmetic is.
 *
 * D-287 approves learned weights and D-290 sets the bar they need. Neither has
 * shipped, and a weight that arrives before its bar is the *"confident nonsense
 * by volume"* D-290 names as the single most likely way for this app to become
 * untrustworthy.
 */
export const LEARNED_WEIGHTS_NEED_A_BAR =
  'Every reading counts the same. Learning which ones matter needs more history than this.'

/**
 * How the score is made, in the words the screen puts under it.
 *
 * Section 51's rule is that a figure never reaches a screen without the quantity
 * it measures and the count it is over. The figure, its sentence and its
 * denominator are produced here together, so a caller that renders the number
 * has the other two in its hand and printing the number alone takes deliberate
 * effort.
 */
const STATE_SCORE_MEASURES = 'your readings at this check-in, against the best each can be'

export interface StateDimension {
  readonly concept: ConceptId
  readonly definition: ConceptDefinition
  readonly knowledge: Knowledge<FactValue>
  /** The anchor he tapped, when there is a fresh one. Never re-worded. */
  readonly label: string | undefined
  /** Where the reading sits, and out of how many. Never rendered as a bar. */
  readonly at: number | undefined
  readonly of: number
  /** Whether this one is a term in the score, and why not when it is not. */
  readonly counted: boolean
  readonly uncountedBecause: string | undefined
}

export interface StateScore {
  /** 0–100, or `undefined` when nothing fresh has been read. */
  readonly score: number | undefined
  /** How many dimensions the figure is over, and how many it could have been. */
  readonly from: number
  readonly of: number
  readonly measures: string
  readonly weighting: string
  /** Every dimension the check-in reads, scored or not, in ritual order. */
  readonly dimensions: readonly StateDimension[]
}

/**
 * Why a reading the check-in takes is not a term in the score.
 *
 * Each is a property of the concept rather than a judgement about it, and each
 * is stated on screen beside the reading — a dimension quietly missing from a
 * total is how a number stops being checkable.
 */
const NOT_SCORED_BECAUSE = {
  want: 'a want rather than a state — there is no best end to it',
  quantity: 'hours are a quantity, and a best number of them would be a target',
  lastNight: 'about last night rather than about now',
} as const

/**
 * Which check-in readings are terms in the score, worked out from the registry.
 *
 * Nothing is listed by hand. A reading counts when the registry says it is a
 * scale with a direction, and the two sleep readings are named out because they
 * are about a different moment — which is the only exclusion that is not already
 * a fact the registry holds, and so the only one written down here.
 */
const ABOUT_LAST_NIGHT: readonly string[] = ['sleep.hours-last-night', 'sleep.quality-last-night']

function exclusionFor(definition: ConceptDefinition): string | undefined {
  if (ABOUT_LAST_NIGHT.includes(String(definition.id))) {
    return definition.tracked === 'scale'
      ? NOT_SCORED_BECAUSE.lastNight
      : NOT_SCORED_BECAUSE.quantity
  }
  if (definition.tracked !== 'scale') return NOT_SCORED_BECAUSE.quantity
  if (definition.sense === 'neither' || definition.sense === undefined)
    return NOT_SCORED_BECAUSE.want
  return undefined
}

/**
 * One reading as a share of its own best, 0 to 1.
 *
 * The bottom anchor is 1 rather than 0 on every reading this phase writes, so a
 * five-point scale spans four steps and the worst answer is 0 rather than a
 * fifth of the way up. Clamped, because a reading written by an older build or
 * a device may sit outside the anchors and a share above 1 would let one
 * dimension pull the whole figure past its own ceiling.
 */
function shareOfBest(value: FactValue, sense: ConceptDefinition['sense']): number | undefined {
  if (value.type !== 'scale') return undefined
  const steps = value.of - 1
  if (steps <= 0) return undefined
  const raw = (value.value - 1) / steps
  const clamped = Math.min(1, Math.max(0, raw))
  return sense === 'higher-is-worse' ? 1 - clamped : clamped
}

function anchorLabel(concept: ConceptId, value: FactValue): string | undefined {
  const reading = CHECK_IN_READINGS.find((entry) => entry.concept === concept)
  if (reading === undefined) return undefined
  return reading.anchors.find((anchor) => sameValue(anchor.value, value))?.label
}

function sameValue(a: FactValue, b: FactValue): boolean {
  if (a.type !== b.type) return false
  if (a.type === 'scale' && b.type === 'scale') return a.value === b.value && a.of === b.of
  if (a.type === 'number' && b.type === 'number') return a.value === b.value
  return false
}

/**
 * The state reading, from whatever is fresh right now.
 *
 * ## It takes the situation's readings and never the store — AUD-0040
 *
 * `view.facts.knowledgeFor` is one call away and is the wrong call, for the
 * reason that guard exists: `createFactReader` is where D-167's permission is
 * applied, so a module reading the store for itself sees a private value the
 * rest of the layer is structurally unable to see. **None of the dimensions
 * below is private today**, and that is exactly the kind of fact that stops
 * being true in a later phase without anybody rechecking this file. Going
 * through the one door means the score cannot be the place a privacy promise
 * turns out to have been about six lines.
 *
 * ## And it reads beliefs rather than check-in rows
 *
 * A reading given at a check-in, a reading the guide asked for and a correction
 * the owner made on a domain page are **one belief** by the time they arrive
 * here. That is what *stored as ordinary observation records* buys, and it is
 * why nothing in this file knows that check-ins exist.
 */
export function stateScore(readings: ConceptReadings): StateScore {
  const dimensions: StateDimension[] = []
  const shares: number[] = []
  let couldCount = 0

  for (const reading of CHECK_IN_READINGS) {
    const definition = coreConcepts.definitionFor(reading.concept)
    const knowledge = readings.get(reading.concept)
    const because = exclusionFor(definition)
    const fresh = isUsable(knowledge) ? knowledge.value : undefined
    const share =
      because === undefined && fresh !== undefined
        ? shareOfBest(fresh, definition.sense)
        : undefined

    if (because === undefined) couldCount += 1
    if (share !== undefined) shares.push(share)

    dimensions.push({
      concept: reading.concept,
      definition,
      knowledge,
      label: fresh === undefined ? undefined : anchorLabel(reading.concept, fresh),
      at: fresh !== undefined && fresh.type === 'scale' ? fresh.value : undefined,
      of: ANCHORS_PER_READING,
      counted: share !== undefined,
      uncountedBecause: because,
    })
  }

  return {
    score: shares.length === 0 ? undefined : scoreFrom(shares),
    from: shares.length,
    of: couldCount,
    measures: STATE_SCORE_MEASURES,
    weighting: LEARNED_WEIGHTS_NEED_A_BAR,
    dimensions,
  }
}

/**
 * The one place the dimensions are combined, and the only place in the codebase
 * that is allowed to — D-287 amending D-166.
 *
 * `tests/synthetic/reach-dimensions.test.ts` still fails the build if any other
 * line in `src/` gathers two or more of the emotional dimensions and reduces
 * them, and this function is the single named exemption. The narrowing is
 * deliberate and it is what the exemption is worth: the guard that used to say
 * *nowhere* now says *here and nowhere else*, so the composite the owner
 * approved is visible in one function that a reader can check, and the one he
 * refused is still impossible to write by accident anywhere else.
 */
function scoreFrom(shares: readonly number[]): number {
  const total = shares.reduce((sum, share) => sum + share, 0)
  return Math.round((total / shares.length) * 100)
}
