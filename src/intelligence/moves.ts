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
  readonly when: 'same-block' | 'next-morning'
  /** Minutes after the move is finished, for a same-block judgement. */
  readonly after: number
}

const SOON: OutcomeTiming = { when: 'same-block', after: 20 }
const IN_THE_MORNING: OutcomeTiming = { when: 'next-morning', after: 0 }

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
    refuses: [],
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
