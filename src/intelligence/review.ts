import type { LifeDomainId } from '../domain/domains'
import type { RecordId } from '../domain/ids'
import {
  addLocalDaysToDayId,
  localDayIdAt,
  localDaysBetween,
  type LocalDayId,
} from '../domain/time'
import { BLOCKER_CAUSES, BLOCKER_OPTIONS, type BlockerCause } from './blockers'
import type { ActiveDestination } from './destinations'
import type { Episode } from './lifecycle'
import type { Situation } from './situation'

/**
 * What the record says about how it is going — F03, F08, F09, F31, F34, F44.
 *
 * ## Why these six are one module
 *
 * Each is the same shape of gap in a different place: **the app records
 * something faithfully and never reads it back at the scale it matters.** A
 * strategy that has not moved, an obstacle that keeps winning, an intention that
 * was carried and then forgotten, assumptions that have gone stale, a review the
 * owner has to run in his head, and a burden nobody counts.
 *
 * They are read together and rendered together — on **Insights and the relevant
 * domain pages** (D-169), which is where the evidence already is. **No
 * navigation tab, no weekly ritual.** A review the owner must perform is life
 * administration, and section 4.5 and section 65 both forbid it.
 *
 * ## The rule that governs all of it
 *
 * **It reports and never grades.** *"Nothing has moved on this since the second
 * of March"* is the record. *"You are falling behind"* is a verdict on a man,
 * and section 4.4 forbids it. Every reading here is a count of rows he can
 * check against his own Timeline, and none of them is a score.
 *
 * And it never proposes a replacement. F03 asks the app to notice that a
 * plausible action repeated faithfully can still be the wrong route; **choosing
 * a different route is routing 95's**, and saying so is this phase's.
 */

// ---------------------------------------------------------------------------
// F03 — a strategy that has not moved
// ---------------------------------------------------------------------------

/**
 * How long a milestone can go without evidence before it is worth saying so.
 *
 * A fortnight, which is the span the ordinary-owner contract names: *"set a
 * milestone, work at it for two weeks, then stop; confirm the app can say the
 * strategy is not moving."* Short enough to be about this month, long enough
 * that a quiet week is not a verdict.
 */
export const STALLED_AFTER_DAYS = 14

export interface StalledStrategy {
  readonly destination: EntityRefLike
  /** What he is aiming at, exactly as he wrote it. */
  readonly aim: string
  readonly domain: LifeDomainId
  /** The next step he named, where he named one. */
  readonly milestone: string | undefined
  /** Days since anything at all happened in this area. */
  readonly quietFor: number
  /** How many occasions the record does hold, so the sentence can be checked. */
  readonly attempts: number
  readonly since: LocalDayId
}

interface EntityRefLike {
  readonly id: string
  readonly kind: string
}

/**
 * Destinations the record has nothing recent about — F03.
 *
 * ## What "not moving" is allowed to mean
 *
 * **Nothing has been recorded in the area since the milestone was set**, for
 * longer than a fortnight. That is a statement about the record, and it is the
 * only one available: whether the *approach* is wrong is a judgement the app
 * cannot make, and F03's own proposal — distinguish insufficient evidence, poor
 * execution fit and lack of progress — needs a strategy model that is routing
 * 95's.
 *
 * **A reached milestone is never stalled**, whatever the dates say. Nor is one
 * he has set aside: he has already said what he thinks of it.
 *
 * **And a destination with no milestone under it is not stalled either.** It is
 * an aim without a next step, which is a different and already-named state —
 * `missingParts` says so on the domain page, and reporting it here as a stall
 * would be two sentences about one gap.
 */
export function stalledStrategies(
  destinations: readonly ActiveDestination[],
  episodes: readonly Episode[],
  today: LocalDayId,
): readonly StalledStrategy[] {
  const out: StalledStrategy[] = []

  for (const destination of destinations) {
    if (destination.state !== 'active') continue
    const next = destination.next
    if (next === undefined) continue
    if (next.reached || next.setAside) continue

    const inArea = episodes.filter(
      (episode) =>
        episode.semantics.domain === destination.domain &&
        localDaysBetween(next.goal.setDay, episode.dayId) >= 0,
    )
    const latest = inArea.reduce<LocalDayId | undefined>(
      (best, episode) =>
        best === undefined || localDaysBetween(best, episode.dayId) > 0 ? episode.dayId : best,
      undefined,
    )
    /*
     * Counted from the last thing that happened, or from the day the step was
     * named where nothing has. The second is the case F03 is actually about: a
     * milestone set and never worked at is not a strategy that stalled — it is
     * one that never started, and the sentence has to be able to say either.
     */
    const from = latest ?? next.goal.setDay
    const quietFor = localDaysBetween(from, today)
    if (quietFor < STALLED_AFTER_DAYS) continue

    out.push({
      destination: destination.destination,
      aim: destination.aim,
      domain: destination.domain,
      milestone: next.goal.statement,
      quietFor,
      attempts: inArea.length,
      since: from,
    })
  }

  return out
}

/**
 * What the app may say about a strategy that is not moving — F03.
 *
 * **Two facts and no verdict.** How long it has been, and how many occasions the
 * record does hold. A person reading it can draw the conclusion; the app stating
 * it would be *"you are falling behind"*, which section 4.4 forbids and which
 * F03 does not ask for.
 *
 * It never proposes a replacement. Continuing, adapting, replacing or retiring a
 * strategy is F03's later half and it is routing 95's — and offering one here
 * would be the app changing his plan on the strength of a fortnight's silence.
 */
export function describeStall(stalled: StalledStrategy): string {
  const attempted =
    stalled.attempts === 0
      ? 'Nothing has been recorded against it'
      : stalled.attempts === 1
        ? 'One occasion is recorded against it'
        : `${stalled.attempts} occasions are recorded against it`
  return `${stalled.quietFor} days since anything happened here. ${attempted}.`
}

// ---------------------------------------------------------------------------
// F08 — the same obstacle, across different moves
// ---------------------------------------------------------------------------

/** How many times one cause has to recur before it is worth naming. */
export const A_PATTERN_OF_BLOCKERS = 3

/** How far back a run of blockers is still about now. */
export const BLOCKER_WINDOW_DAYS = 28

export interface RecurringBlocker {
  readonly cause: BlockerCause
  /** What he said, in the words the closed list uses. */
  readonly label: string
  readonly times: number
  /** How many different moves it has stopped. Two or more is the finding. */
  readonly moves: number
  readonly evidence: readonly RecordId[]
}

/**
 * One obstacle defeating several moves — F08.
 *
 * ## The half C21's enforcement does not cover
 *
 * C21 removes a move a standing blocker is **about**. This is the other half of
 * F08: *"recognise that the same obstacle keeps defeating this plan"* — a cause
 * recurring **across different moves**, which no per-move rule can see.
 *
 * ## What it is allowed to conclude
 *
 * That it happened, how often, and across how many moves. Nothing about him.
 * F08's own words are the bound: *"aggregate blocker patterns without treating
 * inability as character"*, and D-045 keeps inability separate from decline and
 * from effect. Three times not having the kit is a fact about his equipment.
 *
 * **It proposes no changed setup.** F08 asks for *"a changed environment, a
 * smaller entry step, a different window"* and every one of those is a strategy
 * revision — routing 95's, and offering one on the strength of three taps would
 * be the app rearranging his life from a count.
 *
 * **Two moves at least.** One move blocked three times is `blockerQuestionFor`'s
 * case and it already asks about it; what makes this a *pattern* rather than a
 * repetition is that it is beating more than one thing.
 */
export function recurringBlockers(situation: Situation): readonly RecurringBlocker[] {
  const since = addLocalDaysToDayId(situation.dayId, -BLOCKER_WINDOW_DAYS)
  const byCause = new Map<BlockerCause, { moves: Set<string>; evidence: RecordId[] }>()

  for (const record of situation.view.history.effective) {
    if (record.kind !== 'action-unable-now') continue
    if (record.occurredAt > situation.at) continue
    // Four weeks, in owner-local days — an obstacle from the spring is not one
    // that keeps defeating this plan.
    if (localDaysBetween(since, localDayIdAt(record.occurredAt, situation.zone)) < 0) continue
    const statement = record.blocker
    if (statement === undefined) continue
    const cause = causeOf(statement)
    if (cause === undefined) continue
    const held = byCause.get(cause) ?? { moves: new Set<string>(), evidence: [] }
    for (const ref of record.entities) held.moves.add(ref.id)
    held.evidence.push(record.id)
    byCause.set(cause, held)
  }

  const out: RecurringBlocker[] = []
  for (const [cause, held] of byCause) {
    if (held.evidence.length < A_PATTERN_OF_BLOCKERS) continue
    if (held.moves.size < 2) continue
    out.push({
      cause,
      label: BLOCKER_OPTIONS[cause].label,
      times: held.evidence.length,
      moves: held.moves.size,
      evidence: held.evidence,
    })
  }
  return out.sort((a, b) => b.times - a.times)
}

/**
 * Which cause a stored statement came from.
 *
 * Matched against the closed list's own sentences rather than parsed, because
 * the statement **is** one of them: `blockerStatement` writes exactly what
 * `BLOCKER_OPTIONS` says, with the move's name in it. Anything that does not
 * match is something this version did not write and is left alone.
 */
function causeOf(statement: string): BlockerCause | undefined {
  for (const cause of BLOCKER_CAUSES) {
    const shape = BLOCKER_OPTIONS[cause].statement('')
    // The move's name is interpolated at the front for three of them, so the
    // tail is the part that identifies the cause.
    const tail = shape.trim()
    if (tail.length > 0 && statement.trim().endsWith(tail)) return cause
  }
  return undefined
}

/**
 * What the app may say about an obstacle that keeps winning — F08.
 *
 * A count and the causes' own words. No advice, and nothing about him.
 */
export function describeRecurring(blocker: RecurringBlocker): string {
  return `“${blocker.label}” has stopped ${blocker.moves} different moves, ${blocker.times} times in all.`
}

// ---------------------------------------------------------------------------
// F44 — what the app costs him, measured
// ---------------------------------------------------------------------------

export interface Burden {
  /** Questions answered in the window. */
  readonly answered: number
  /** Beliefs and facts he had to correct. */
  readonly corrections: number
  /** Moves he acted on, of any kind. */
  readonly acted: number
  /** How many days the window covers. */
  readonly overDays: number
}

/** The span burden is measured over. Four weeks: long enough to be a trend. */
export const BURDEN_WINDOW_DAYS = 28

/**
 * What using the app cost him, and what he got out of it — F44's measurable half.
 *
 * ## What F44 asks and what is refused
 *
 * *"Track whether input burden is falling and whether advice is increasingly
 * relevant. **Do not create a Life Score, engagement target, or unsupported
 * claim that the app caused improvement.**"* §6.5 scopes this to *"the
 * measurable half only"*, and this is where the line falls:
 *
 * - **Measured**: how many questions he answered, how many things he had to
 *   correct, how many moves he acted on. Three counts of rows in his own record.
 * - **Refused**: any ratio of them, any trend line, any claim that one caused
 *   another, and any single number standing for all three. A ratio of taps to
 *   actions is an engagement metric with a humane name, and *"advice is
 *   increasingly relevant"* is a claim about the app's own quality that only
 *   long-run owner outcomes could support — which F44 itself says the product
 *   does not have.
 *
 * So this counts, and the surface prints the three counts. Whether the burden is
 * falling is a question the owner can answer by reading them; the app asserting
 * it would be the system optimising compliance with itself, which is the whole
 * of what F44 warns about.
 */
export function burdenOver(situation: Situation): Burden {
  const since = addLocalDaysToDayId(situation.dayId, -BURDEN_WINDOW_DAYS)
  let answered = 0
  let corrections = 0
  let acted = 0

  for (const record of situation.view.history.effective) {
    if (record.occurredAt > situation.at) continue
    if (localDaysBetween(since, localDayIdAt(record.occurredAt, situation.zone)) < 0) continue
    switch (record.kind) {
      case 'observation':
        // Something he was asked and answered. A derived row is the app working
        // it out for itself, and counting it as burden would be the opposite of
        // the measurement.
        if (record.provenance.source === 'owner') answered += 1
        break
      case 'correction':
      case 'belief-correction':
        corrections += 1
        break
      case 'action-start':
      case 'action-completion':
        acted += 1
        break
      default:
        break
    }
  }

  return { answered, corrections, acted, overDays: BURDEN_WINDOW_DAYS }
}

/**
 * The three counts, as one line — F44.
 *
 * Three numbers next to each other and no arithmetic between them. The moment
 * one is divided by another it is a rate, and a rate about how much the app
 * costs him against how much he does is an engagement metric.
 */
export function describeBurden(burden: Burden): string {
  return `Over ${burden.overDays} days: ${burden.answered} questions answered, ${burden.corrections} things corrected, ${burden.acted} moves acted on.`
}
