import type { EntityRef } from '../domain/entities'
import type { RecordId } from '../domain/ids'
import { localDaysBetween, type LocalDayId } from '../domain/time'
import type { GoalHorizon } from './direction'
import type { Episode } from './lifecycle'
import { effectValueOf } from './outcomes'

/**
 * When going over something again would be worth doing — AUD-0010.
 *
 * ## The finding
 *
 * `careerCandidates` proposed recall practice, weak-topic review and a lab
 * whenever a current learning topic existed. **Nothing read when the topic was
 * last practised, and nothing read when the exam was.** `recall-practice` had no
 * spacing model at all, so the audit's reproduction is the identical sentence on
 * a Tuesday, a Saturday and a Sunday: *"Go back over subnetting — the part you
 * keep missing."*
 *
 * The audit calls spacing *"the best-evidenced lever in the whole app"* and notes
 * that it was unused while the app already held everything it needed: a stated
 * goal with a horizon the owner set.
 *
 * ## Where the number comes from, and where it does not
 *
 * **From his own goal.** The interval is a share of the days until the thing he
 * said he was working towards, and if he has not said when, there is a
 * conservative default and no pretence otherwise.
 *
 * The share itself — roughly a seventh of the remaining span — is the design
 * choice, and it is grounded the way every design choice in this codebase is
 * grounded: in a comment and a decision-log entry, never on a screen and never
 * as a claim about him. The largest synthesis of distributed practice puts the
 * useful gap at roughly 10–20% of the retention interval (Cepeda, Pashler, Vul,
 * Wixted & Rohrer, *Psychological Bulletin* 132(3):354–380, 2006; Cepeda, Vul,
 * Rohrer, Wixted & Pashler, *Psychological Science* 19(11):1095–1102, 2008).
 * That is exactly the standing this codebase gives `SLEEP_BASELINE_HOURS` — a
 * working number with a citation behind it, applied to the owner's own figures —
 * and §13C's bound is untouched: no prior is rendered, no prior decides, and
 * nothing here becomes a finding about him.
 *
 * ## And it widens as the topic goes well
 *
 * The audit asks for the interval to *"expand as the topic succeeds"*, which is
 * the other half of the spacing evidence and the half that keeps this from being
 * a fixed timetable. What counts as going well is the owner's own `effect`
 * answers, which is the only thing the app has that is about this topic rather
 * than about study in general.
 *
 * ## What it is not
 *
 * It is not a forecast, a schedule the owner has to keep, or a claim that a
 * particular gap will work for him. It decides one thing: whether *going over it
 * again* is the move worth putting on a screen today, or whether the honest
 * answer is that he did it recently. §6.5 puts forecasting outside this phase and
 * nothing here reaches for it.
 */

/**
 * How much of the remaining span a gap should be.
 *
 * A seventh, which sits inside the 10–20% band the synthesis reports and is the
 * roundest number in it. Section 22 forbids inventing precision, and a share
 * carried to two decimals would be exactly that: what is being said is *"leave
 * it a few days when the exam is months out, and a day or so when it is next
 * week"*.
 */
export const SPACING_SHARE = 1 / 7

/** With no horizon, the gap the app uses and says nothing more about. */
export const DEFAULT_INTERVAL_DAYS = 3

/** The gap never closes to nothing and never opens past a fortnight. */
export const SHORTEST_INTERVAL_DAYS = 1
export const LONGEST_INTERVAL_DAYS = 14

/**
 * An `effect` answer at or above this counts as the topic having gone well.
 *
 * `EFFECT_VALUE` runs `[0, 0.15, 0.5, 0.85]` — backfired, not much, some, real —
 * so this is *some or real*, and *not much* is what puts the gap back. That is
 * the honest reading of retrieval going well: a session he got something out of
 * is one the next gap may be longer after, and a session that did almost nothing
 * is not.
 */
const WENT_WELL = 0.5

export interface Spacing {
  /** How many days the gap should be, from his goal or from the default. */
  readonly intervalDays: number
  /** Days since the last completed session on this topic. Undefined if never. */
  readonly daysSince: number | undefined
  /** Whether going over it again is worth putting on a screen today. */
  readonly due: boolean
  /** Whether the interval came from a horizon he set, or from the default. */
  readonly fromGoal: boolean
  /** The session it is counting from, so a sentence can cite it. */
  readonly since: RecordId | undefined
}

/**
 * The base gap, from the goal's own horizon.
 *
 * A goal already past its date gets the shortest gap rather than a negative one:
 * the span it was measured against has run out, and stretching the interval on a
 * deadline that has gone by would be the arithmetic deciding something the
 * situation plainly does not.
 */
export function intervalFor(horizon: GoalHorizon | undefined): {
  readonly days: number
  readonly fromGoal: boolean
} {
  if (horizon === undefined) return { days: DEFAULT_INTERVAL_DAYS, fromGoal: false }
  if (horizon.passed) return { days: SHORTEST_INTERVAL_DAYS, fromGoal: true }
  const share = Math.round(horizon.daysRemaining * SPACING_SHARE)
  return {
    days: Math.min(LONGEST_INTERVAL_DAYS, Math.max(SHORTEST_INTERVAL_DAYS, share)),
    fromGoal: true,
  }
}

/**
 * How the topic has been going, as a count of sessions that landed well.
 *
 * Counted since the most recent session that did **not** land well, so a run of
 * good ones widens the gap and one bad one puts it back. That is the shape of
 * the expanding-interval finding and it is also the honest reading of his own
 * answers: a topic he has just struggled with is not one to leave longer.
 *
 * An unanswered session counts as neither. Silence is not a verdict (G-009), and
 * a session he simply never graded should not widen a gap on his behalf.
 */
function goodRunOn(episodes: readonly Episode[]): number {
  let run = 0
  for (const episode of episodes) {
    const effect = episode.outcomes.find((outcome) => outcome.aspect === 'effect')
    if (effect === undefined) continue
    const value = effectValueOf(effect.observation)
    if (value === undefined) continue
    if (value < WENT_WELL) return run
    run += 1
  }
  return run
}

export interface SpacingInput {
  readonly episodes: readonly Episode[]
  readonly topic: EntityRef
  readonly today: LocalDayId
  readonly horizon: GoalHorizon | undefined
  /** Which moves count as having gone over it. */
  readonly moves: readonly string[]
}

/**
 * When this topic was last gone over, and whether it is worth going over again.
 *
 * **Never practised is due**, and that is not the same as overdue. A topic the
 * record has nothing about is one the app has no reason to hold back on, which
 * is the state every topic starts in.
 */
export function spacingFor(input: SpacingInput): Spacing {
  const base = intervalFor(input.horizon)

  const onTopic = input.episodes
    .filter(
      (episode) =>
        episode.state === 'completed' &&
        episode.semantics.target.object.id === input.topic.id &&
        input.moves.includes(episode.semantics.target.verb),
    )
    // Newest first, because both the gap and the run are counted backwards from
    // today rather than forwards from whenever he started.
    .sort((a, b) => b.shownAt - a.shownAt)

  const latest = onTopic[0]
  if (latest === undefined) {
    return {
      intervalDays: base.days,
      daysSince: undefined,
      due: true,
      fromGoal: base.fromGoal,
      since: undefined,
    }
  }

  /*
   * Half the base gap for each session that went well, and back to the base
   * after one that did not.
   *
   * Half rather than a whole, because doubling on a single good session is a
   * long way to move on one answer — the same discipline `assessStrain` follows
   * when it refuses to let one tap on a scale reach `severe`. A run of three
   * good sessions still reaches the fortnight cap, which is as far as this is
   * ever allowed to go.
   */
  const widened = Math.min(
    LONGEST_INTERVAL_DAYS,
    Math.round(base.days * (1 + 0.5 * goodRunOn(onTopic))),
  )
  const daysSince = Math.max(0, localDaysBetween(latest.dayId, input.today))

  return {
    intervalDays: widened,
    daysSince,
    due: daysSince >= widened,
    fromGoal: base.fromGoal,
    since: latest.recommendation,
  }
}

/**
 * When he last went over it, in the owner's register — or nothing.
 *
 * **A fact and never an instruction.** *"Leave it a few days"* is the app telling
 * a man what to do with his own week; *"you went over subnetting yesterday"* is
 * the record, and the app's opinion about it is already expressed by not putting
 * the move on the screen. Section 4.6, and D-187's discipline about saying what
 * is recorded rather than what follows from it.
 *
 * Nothing at all when it has never been gone over — there is no gap to name, and
 * *"you have never done this"* is a sentence nobody needs to read.
 */
export function describeLastSession(spacing: Spacing, topic: string): string | undefined {
  const days = spacing.daysSince
  if (days === undefined) return undefined
  if (days === 0) return `You went over ${topic} earlier today.`
  if (days === 1) return `You went over ${topic} yesterday.`
  return `You went over ${topic} ${days} days ago.`
}
