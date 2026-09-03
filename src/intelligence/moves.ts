import { CONCEPT } from '../domain/concepts'
import type { ActionVerb } from '../domain/recommendation'
import type { OutcomeAspect } from '../domain/records'
import type { DayBlock } from '../domain/time'
import type { ConceptId } from '../domain/windows'

/**
 * What each kind of move is expected to cost and buy
 * (canonical plan sections 19 and 20).
 *
 * These are **priors**, and Phase 3 is the phase that stopped them being the
 * last word. Section 20 is explicit that the app learns from observed outcomes
 * rather than from having generated a recommendation, and `learning.ts` now
 * folds what actually happened to this owner into `now` and `tomorrow` before
 * the evaluator sees them. What is left here is the starting belief — what to
 * think about a lab at 23:00 before anything has been tried — and a prior is
 * exactly the right shape for that: it decides the first evening and matters
 * less with every outcome after it.
 *
 * Writing them down in one table rather than scattering them through the
 * evaluator as conditions is what made them replaceable, which was the point of
 * doing it that way.
 *
 * `demand` is the property most of the arbitration turns on, and it is not
 * learned: it is what the move *asks of you*, which does not change because an
 * evening went well. A restorative move relieves a recovery limiter; an
 * effortful one competes with it. That is the whole mechanism behind scenario
 * G-005, and note what it is not: there is no rule anywhere that says sleep
 * beats career. There is a rule that says an effortful move fits badly when
 * recovery is the limiter, and a reading of the situation that decides whether
 * recovery is the limiter.
 */

export type Demand = 'restorative' | 'light' | 'effortful'

/**
 * When the result of a move can honestly be judged (section 20).
 *
 * "Sleep/recovery actions may need next-morning evaluation", and asking how a
 * recovery night went at 23:05 would collect an answer about intent rather than
 * about effect. `sameBlockMinutes` is how long to wait before the question is
 * worth asking at all; `nextMorning` moves the question to the following day
 * instead, because that is when the answer exists.
 */
export interface OutcomeTiming {
  readonly when: OutcomeHorizon
  /** Minutes after the move is finished, for a same-block judgement. */
  readonly after: number
  /**
   * How many owner-local days later a `multi-day` judgement opens.
   *
   * Required for `multi-day` and meaningless for the rest — the horizon carries
   * its own count so that *"judge this in three days"* and *"judge this in ten"*
   * are one enum value with a number rather than two enum values, which is how
   * an enum turns into a calendar.
   */
  readonly afterDays?: number
}

/**
 * When the effect of a move can honestly be judged — S1a.
 *
 * ## What was there, and why two values were not enough
 *
 * `same-block | next-morning`, read by eight call sites. It is genuinely
 * absent, genuinely unowned and small: a widened union, a migration rule, and
 * the consumers taught to read it. C8 — sleep and recovery over longer horizons
 * — is the acceptance case, and it is the one horizon-dependent capability with
 * existing evidence behind it.
 *
 * ## And why it stops at weekly
 *
 * `monthly` and `seasonal` are **refused as outcome-judgement horizons**, and
 * the refusal is the whole of the bound. A move whose effect can only be judged
 * in a month cannot be settled by a lifecycle keyed to a day — `openEpisode`
 * keys on `(target, dayId)` — and there is no evidence supply that would ever
 * score it: at six tracked concepts and one derived path, a monthly outcome is
 * a question asked into silence.
 *
 * Monthly and seasonal belong to **reading the record** — S1b, AUD-0029 — not
 * to **judging a move**. That distinction is why this type is named for the
 * judgement rather than for the span, and `tests/synthetic/reach-horizon.test.ts`
 * fails the build if a value that names one of them is ever added here.
 *
 * ## The migration rule, which is the actual risk
 *
 * **No existing value is reinterpreted, and no existing derivation changes.**
 * Widening an enum is trivial; the danger is that a wider horizon silently
 * invalidates conclusions drawn at the narrow one. So `same-block` and
 * `next-morning` mean exactly what they meant, every profile that had one still
 * has it, and D-064's four conditions for the morning reading produce
 * byte-identical output before and after — proved by replaying the whole
 * shipped scenario library under both enums rather than argued.
 */
export const OUTCOME_HORIZONS = ['same-block', 'next-morning', 'multi-day', 'weekly'] as const

export type OutcomeHorizon = (typeof OUTCOME_HORIZONS)[number]

const SOON: OutcomeTiming = { when: 'same-block', after: 20 }
const IN_THE_MORNING: OutcomeTiming = { when: 'next-morning', after: 0 }

/**
 * The horizons no profile uses yet, and the reason that is not a gap.
 *
 * S1a is vocabulary work: the union, the window, the migration rule and the
 * consumers. What *uses* `multi-day` and `weekly` is AUD-0009 — recovery is
 * always judged as one night when the evidence says several — and that is
 * routing 93's, deliberately, because it is a conclusion drawn from evidence
 * rather than a horizon to draw it over.
 *
 * Shipping the vocabulary without a consumer would normally be the
 * inert-declaration defect this phase exists to remove. It is not one here for
 * a reason that is checkable rather than asserted: the horizon is **not a
 * concept**, it declares nothing about the owner, it creates no question and it
 * cannot go stale. What it has to be is *readable* — and
 * `tests/synthetic/reach-horizon.test.ts` proves every consumer handles all
 * four by running a profile at each horizon through every one of them.
 */
export const DEFERRED_HORIZONS: readonly OutcomeHorizon[] = ['multi-day', 'weekly']

/**
 * Which kinds of evidence this move can actually produce, in the order asked.
 *
 * DEF-0020. A single better/same/worse judgement stood in for four different
 * facts, so a question about whether the kitchen got cleared was answered with
 * "About the same". What decides the list here is one test:
 *
 * > **Does the sentence name an end state, or only an activity?**
 *
 * "Clearing the kitchen" names an end state that fifteen minutes may not reach,
 * so the result is a separate fact from the attempt. "Recalling subnetting"
 * names an activity — Done is the whole of it, and what is left to learn is
 * what the session was worth, which is `effect`.
 *
 * Most moves produce one kind of evidence. Three produce two. Section 4.5 — do
 * not collect data merely because a field exists, and two taps is the most a
 * follow-up may cost.
 */
export type MoveAspects = readonly OutcomeAspect[]

export interface MoveProfile {
  readonly demand: Demand
  /** Expected value in the block it happens in, 0–1. Learning moves this. */
  readonly now: number
  /** Expected value the following day, 0–1. Learning moves this. */
  readonly tomorrow: number
  /** How much effort it takes to get started, 0–1. Higher is harder. */
  readonly friction: number
  /**
   * How long this move takes, in minutes, when it has a natural size.
   *
   * This is the size of the thing being suggested, not a guess about the
   * owner's evening — "ten minutes of recall" is what recall practice is. A
   * move with no natural size leaves it out rather than inventing one, which is
   * why `ActionTarget.minutes` is optional in the first place.
   */
  readonly size: number | undefined
  /** Blocks this move naturally belongs in. */
  readonly suits: readonly DayBlock[]
  /** Blocks where it is simply the wrong thing to suggest. */
  readonly refuses: readonly DayBlock[]
  /** When its result can honestly be asked about. */
  readonly outcome: OutcomeTiming
  /** Which kinds of evidence it can produce, in the order they are asked. */
  readonly aspects: MoveAspects
  /**
   * Whether doing this means going out — C21's candidate attribute, AUD-0045.
   *
   * A property of the **object** rather than of the verb, which is why it is
   * optional here and filled in by `routines.ts`: `move` covers a walk in the
   * park and a set of press-ups on the bedroom floor, and nothing in the model
   * could tell them apart. Until it could, a supervision constraint —
   * *"can't leave, someone's in my care"* — had nothing to bite on, which is
   * exactly what D-187 records as the reason the capture was inert.
   *
   * Absent means the app has not been told, and that is read as *no* rather
   * than as unknown for one narrow reason: this only ever removes a move, and
   * treating silence as "might mean going out" would suppress indoor moves the
   * owner never said anything about. The failure direction matters and this is
   * the safe one.
   */
  readonly requiresLeaving?: boolean
  /**
   * What an outcome about this move is a reading *of* (D-059).
   *
   * Reliability is a property of a source and a concept together, so learning
   * cannot weight an outcome without knowing which concept it speaks to. "How
   * much did winding down do for your sleep?" is a reading about sleep, and a
   * derived answer to it is worth what the registry says a derived reading of
   * sleep is worth — which is a great deal more than a derived reading of how
   * somebody feels.
   *
   * Undefined where the honest answer is that the outcome is about the move
   * itself rather than about anything in the concept registry. Those fall back
   * to the default table, which is the same as the behaviour before this
   * existed.
   */
  readonly measures?: ConceptId
  /**
   * The observable state dimension this move is expected to move (D-089).
   *
   * **Distinct from `measures`, and the distinction is the whole of QA-A1.**
   * `measures` says what an *outcome record about this move* is a reading of,
   * so reliability can be weighed per source and per concept (D-059). It is a
   * property of the answer. `affects` names a concept the app can read
   * independently, before and after, on evenings with this move and on
   * evenings without it — so the relationship can be worked out instead of
   * asked for.
   *
   * Where this is set, the app **asks for the reading rather than the grade**:
   * "how much energy have you got left?" instead of "how much did the walk do
   * for you?". That is D-069's rule — ask for the reading, not the verdict —
   * generalized off the one concept it was written for.
   *
   * **Set only where it is defensible, and deliberately absent elsewhere.**
   * A learning topic is an entity, not a state; home friction is free text; and
   * nothing in the registry honestly says what unhurried time with a daughter
   * moves. Inventing a mapping to fill those in would be collecting data
   * because a field exists (section 4.5) and asserting a relationship nobody
   * can observe. Where it is absent the attribution question is kept, and is
   * then shown as the owner's own view rather than as a measurement.
   */
  readonly affects?: ConceptId
}

const ALL_DAY: readonly DayBlock[] = ['morning', 'afternoon', 'evening']

export const MOVE_PROFILES: Record<ActionVerb, MoveProfile> = {
  'recall-practice': {
    demand: 'light',
    now: 0.5,
    tomorrow: 0.3,
    friction: 0.25,
    size: 10,
    suits: ALL_DAY,
    /*
     * Not at eleven at night — found by the widened tournament rubric,
     * AUD-0039(b).
     *
     * This was the only move in the table that refused no hour at all, and it
     * reads as an oversight rather than a decision: every sibling that suits
     * the same three blocks refuses the late night, and the reason is the same
     * for all of them. A ten-minute recall session is light, so `protection`
     * has nothing to say about it, and the deferral path has nowhere to defer
     * to once the last block of the day has started — so the only thing that
     * could have stopped it was this line, and it was empty.
     *
     * The rubric found it because it was widened to ask "does it get the hour
     * right" at every hour rather than at the one each history was written for,
     * which is precisely the class AUD-0039 says the old rubric could not
     * detect.
     */
    refuses: ['late-night'],
    outcome: SOON,
    aspects: ['effect'],
    measures: CONCEPT.learningTopic,
  },
  'review-weak-topic': {
    demand: 'effortful',
    now: 0.55,
    tomorrow: 0.35,
    friction: 0.4,
    size: 20,
    suits: ['morning', 'afternoon', 'evening'],
    refuses: ['late-night'],
    outcome: SOON,
    aspects: ['effect'],
    measures: CONCEPT.learningTopic,
  },
  'hands-on-lab': {
    demand: 'effortful',
    now: 0.6,
    tomorrow: 0.45,
    friction: 0.7,
    size: 45,
    suits: ['morning', 'afternoon'],
    refuses: ['late-night', 'early-morning'],
    outcome: SOON,
    aspects: ['result'],
    measures: CONCEPT.learningTopic,
  },
  'protect-sleep': {
    demand: 'restorative',
    now: 0.3,
    tomorrow: 0.9,
    friction: 0.15,
    size: undefined,
    suits: ['evening', 'late-night'],
    refuses: ['morning', 'afternoon', 'early-morning'],
    // Whether an early night worked is a question with no answer until morning.
    outcome: IN_THE_MORNING,
    aspects: ['effect'],
    measures: CONCEPT.sleepHours,
    affects: CONCEPT.sleepHours,
  },
  'wind-down': {
    demand: 'restorative',
    now: 0.35,
    tomorrow: 0.85,
    friction: 0.2,
    size: undefined,
    suits: ['evening', 'late-night'],
    refuses: ['morning', 'afternoon', 'early-morning'],
    outcome: IN_THE_MORNING,
    aspects: ['effect'],
    measures: CONCEPT.sleepHours,
    affects: CONCEPT.sleepHours,
  },
  recover: {
    demand: 'restorative',
    now: 0.25,
    tomorrow: 0.9,
    friction: 0.1,
    size: undefined,
    suits: ['evening', 'late-night', 'afternoon'],
    refuses: ['morning', 'early-morning'],
    outcome: IN_THE_MORNING,
    aspects: ['effect'],
    measures: CONCEPT.sleepHours,
    affects: CONCEPT.sleepHours,
  },
  'ease-off': {
    demand: 'restorative',
    now: 0.45,
    tomorrow: 0.6,
    friction: 0.1,
    size: undefined,
    suits: ['afternoon'],
    // Not the evening: `protect-sleep` is the better sentence after six, and
    // two recovery moves competing for one evening is one wording too many.
    refuses: ['early-morning', 'morning', 'evening', 'late-night'],
    outcome: SOON,
    aspects: ['effect'],
    measures: CONCEPT.energy,
    affects: CONCEPT.energy,
  },
  'lighten-the-day': {
    demand: 'restorative',
    /*
     * Worth less right now than easing off in the afternoon and more tomorrow,
     * because that is what it is: the afternoon's version lowers the bar for
     * the hours that are left, and this one protects a whole day that has not
     * been spent yet — including the night at the end of it.
     */
    now: 0.4,
    tomorrow: 0.75,
    friction: 0.1,
    size: undefined,
    suits: ['early-morning', 'morning'],
    // Not the afternoon: `ease-off` is the better sentence after noon, and two
    // recovery moves competing for one day is one wording too many (DEF-0016's
    // own reasoning, applied to the block on the other side of it).
    refuses: ['afternoon', 'evening', 'late-night'],
    /*
     * "Did today stay light?" has no answer at twenty past nine in the morning.
     * It has one the next morning, which is the window `protect-sleep` and
     * `wind-down` already use for the same reason.
     */
    outcome: IN_THE_MORNING,
    aspects: ['effect'],
    measures: CONCEPT.energy,
    affects: CONCEPT.energy,
  },
  'time-with': {
    demand: 'light',
    now: 0.8,
    tomorrow: 0.4,
    friction: 0.15,
    size: 30,
    suits: ['morning', 'afternoon', 'evening'],
    refuses: ['late-night'],
    outcome: SOON,
    aspects: ['effect'],
  },
  'growth-opportunity': {
    demand: 'light',
    now: 0.6,
    tomorrow: 0.5,
    friction: 0.3,
    size: undefined,
    suits: ['morning', 'afternoon', 'evening'],
    refuses: ['late-night', 'early-morning'],
    outcome: SOON,
    aspects: ['result'],
  },
  'reach-out': {
    demand: 'light',
    now: 0.45,
    tomorrow: 0.25,
    friction: 0.25,
    size: undefined,
    suits: ALL_DAY,
    refuses: ['late-night'],
    // A message sent is not a conversation had. Give the other person an hour.
    outcome: { when: 'same-block', after: 60 },
    aspects: ['result', 'comfort'],
    measures: CONCEPT.socialEnergy,
  },
  'start-conversation': {
    demand: 'effortful',
    now: 0.5,
    tomorrow: 0.3,
    friction: 0.6,
    size: undefined,
    suits: ['afternoon', 'evening'],
    refuses: ['late-night', 'early-morning'],
    outcome: SOON,
    aspects: ['result', 'comfort'],
    measures: CONCEPT.socialEnergy,
  },
  'reset-space': {
    demand: 'light',
    now: 0.4,
    tomorrow: 0.55,
    friction: 0.35,
    size: 15,
    suits: ['morning', 'afternoon', 'evening'],
    refuses: ['late-night'],
    outcome: SOON,
    aspects: ['result', 'effect'],
    measures: CONCEPT.homeFriction,
  },
  'handle-money-item': {
    demand: 'effortful',
    now: 0.4,
    tomorrow: 0.5,
    friction: 0.55,
    size: 15,
    suits: ['morning', 'afternoon'],
    refuses: ['late-night', 'early-morning'],
    outcome: SOON,
    aspects: ['result'],
    measures: CONCEPT.cashBuffer,
  },
  move: {
    demand: 'effortful',
    now: 0.5,
    tomorrow: 0.5,
    friction: 0.45,
    size: 25,
    suits: ['morning', 'afternoon', 'evening'],
    refuses: ['late-night'],
    outcome: SOON,
    aspects: ['effect'],
    measures: CONCEPT.energy,
    affects: CONCEPT.energy,
  },
  hold: {
    demand: 'restorative',
    now: 0.05,
    tomorrow: 0.1,
    friction: 0,
    size: undefined,
    suits: ['morning', 'afternoon', 'evening', 'late-night', 'early-morning'],
    refuses: [],
    outcome: IN_THE_MORNING,
    aspects: [],
  },
}

export function profileFor(verb: ActionVerb): MoveProfile {
  return MOVE_PROFILES[verb]
}
