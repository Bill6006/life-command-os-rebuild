import type { ActionVerb } from '../domain/recommendation'
import type { DayBlock } from './situation'

/**
 * What each kind of move costs and buys (canonical plan sections 19 and 20).
 *
 * These are **priors, not learned effects.** Section 20 is explicit that the app
 * learns from observed outcomes rather than from having generated a
 * recommendation, and Phase 3 is where a completed move starts changing these
 * numbers for this owner. Until then the engine needs some starting belief
 * about whether a lab at 23:00 is a good idea, and writing that belief down in
 * one table — rather than scattering it through the evaluator as conditions —
 * is what makes it reviewable and, later, replaceable.
 *
 * `demand` is the property most of the arbitration turns on. A restorative move
 * relieves a recovery limiter; an effortful one competes with it. That is the
 * whole mechanism behind scenario G-005, and note what it is not: there is no
 * rule anywhere that says sleep beats career. There is a rule that says an
 * effortful move fits badly when recovery is the limiter, and a reading of the
 * situation that decides whether recovery is the limiter.
 */

export type Demand = 'restorative' | 'light' | 'effortful'

export interface MoveProfile {
  readonly demand: Demand
  /** Expected value in the block it happens in, 0–1. */
  readonly now: number
  /** Expected value the following day, 0–1. */
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
  },
  'review-weak-topic': {
    demand: 'effortful',
    now: 0.55,
    tomorrow: 0.35,
    friction: 0.4,
    size: 20,
    suits: ['morning', 'afternoon', 'evening'],
    refuses: ['late-night'],
  },
  'hands-on-lab': {
    demand: 'effortful',
    now: 0.6,
    tomorrow: 0.45,
    friction: 0.7,
    size: 45,
    suits: ['morning', 'afternoon'],
    refuses: ['late-night', 'early-morning'],
  },
  'protect-sleep': {
    demand: 'restorative',
    now: 0.3,
    tomorrow: 0.9,
    friction: 0.15,
    size: undefined,
    suits: ['evening', 'late-night'],
    refuses: ['morning', 'afternoon', 'early-morning'],
  },
  'wind-down': {
    demand: 'restorative',
    now: 0.35,
    tomorrow: 0.85,
    friction: 0.2,
    size: undefined,
    suits: ['evening', 'late-night'],
    refuses: ['morning', 'afternoon', 'early-morning'],
  },
  recover: {
    demand: 'restorative',
    now: 0.25,
    tomorrow: 0.9,
    friction: 0.1,
    size: undefined,
    suits: ['evening', 'late-night', 'afternoon'],
    refuses: ['morning', 'early-morning'],
  },
  'time-with': {
    demand: 'light',
    now: 0.8,
    tomorrow: 0.4,
    friction: 0.15,
    size: 30,
    suits: ['morning', 'afternoon', 'evening'],
    refuses: ['late-night'],
  },
  'growth-opportunity': {
    demand: 'light',
    now: 0.6,
    tomorrow: 0.5,
    friction: 0.3,
    size: undefined,
    suits: ['morning', 'afternoon', 'evening'],
    refuses: ['late-night', 'early-morning'],
  },
  'reach-out': {
    demand: 'light',
    now: 0.45,
    tomorrow: 0.25,
    friction: 0.25,
    size: undefined,
    suits: ALL_DAY,
    refuses: ['late-night'],
  },
  'start-conversation': {
    demand: 'effortful',
    now: 0.5,
    tomorrow: 0.3,
    friction: 0.6,
    size: undefined,
    suits: ['afternoon', 'evening'],
    refuses: ['late-night', 'early-morning'],
  },
  'reset-space': {
    demand: 'light',
    now: 0.4,
    tomorrow: 0.55,
    friction: 0.35,
    size: 15,
    suits: ['morning', 'afternoon', 'evening'],
    refuses: ['late-night'],
  },
  'handle-money-item': {
    demand: 'effortful',
    now: 0.4,
    tomorrow: 0.5,
    friction: 0.55,
    size: 15,
    suits: ['morning', 'afternoon'],
    refuses: ['late-night', 'early-morning'],
  },
  move: {
    demand: 'effortful',
    now: 0.5,
    tomorrow: 0.5,
    friction: 0.45,
    size: 25,
    suits: ['morning', 'afternoon', 'evening'],
    refuses: ['late-night'],
  },
  hold: {
    demand: 'restorative',
    now: 0.05,
    tomorrow: 0.1,
    friction: 0,
    size: undefined,
    suits: ['morning', 'afternoon', 'evening', 'late-night', 'early-morning'],
    refuses: [],
  },
}

export function profileFor(verb: ActionVerb): MoveProfile {
  return MOVE_PROFILES[verb]
}
