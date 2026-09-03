import { confidence, isUsable, type Confidence } from '../domain/knowledge'
import type { ConceptId } from '../domain/windows'
import { addLocalDays } from '../domain/time'
import { applicableAssociation } from './association'
import type { Candidate } from './candidates'
import type { LearnedEffect } from './learning'
import type { MoveProfile } from './moves'
import { blockNoun, hereNowWord, horizonWord } from './vocabulary'
import type { GoalHorizon } from './direction'
import { answersLimiter, type Situation } from './situation'
import { describeThreadPosition, threadFor } from './threads'
import type { Trajectory } from './trajectory'

/**
 * The candidate evaluator (canonical plan sections 17.1 step 7, and 19).
 *
 * Section 19 lists twenty things a move may be judged on and then says the
 * final algorithm is not predetermined and must be tested. What follows is
 * therefore a starting instrument rather than a claim: fourteen dimensions,
 * each producing a number in −1…1 and, more importantly, **a line of ordinary
 * language saying why**. The explanation the owner reads and the ranking the
 * inspector shows come from the same place, so the app cannot say one thing and
 * have decided another.
 *
 * Two properties matter more than the weights.
 *
 * **No dimension knows a domain's name.** There is no `if career` anywhere in
 * this file. A move is judged on what it demands, what it pays back, what it
 * costs and whether it addresses what is actually in the way. That is what
 * makes G-005 and G-008 pass for the right reason instead of by coincidence.
 *
 * **Not knowing costs something.** `uncertainty` is negative in proportion to
 * how much of what a move leans on is missing, so a move justified by a guess
 * ranks below one justified by evidence — and the guide gets a reason to ask.
 */

export type DimensionName =
  | 'bottleneck-fit'
  | 'direction-fit'
  | 'goal-fit'
  /**
   * Whether this move is the next step of a course already under way — AUD-0020.
   *
   * The nineteenth dimension, and the one the whole thread structure reaches a
   * decision through. It abstains — zero value at zero weight — for every move
   * that belongs to no live thread, which is nearly all of them, so a history
   * with no plan in it ranks exactly as it did before threads existed.
   */
  | 'thread-fit'
  /**
   * Whether this area's own readings have been drifting the wrong way for
   * weeks — AUD-0029, S1b.
   *
   * The twentieth dimension, and the app's first reasoning horizon longer than
   * a night. `insights.ts` has computed exactly this since Phase 6 and no
   * decision could read it; the audit's summary is that the trajectory cards
   * *"already produce exactly that, unconnected to any decision."*
   *
   * It abstains — zero value at zero weight — wherever the record does not
   * support a direction, wherever the direction is the good one, and wherever
   * the concept has no good direction to have. That is nearly always, so a
   * history with nothing to trend ranks exactly as it did before.
   */
  | 'trajectory-fit'
  | 'urgency'
  | 'immediate-benefit'
  | 'next-day-effect'
  | 'opportunity-cost'
  | 'friction'
  | 'time-fit'
  | 'capacity-fit'
  | 'context-fit'
  | 'recent-duplication'
  /**
   * Whether going over this again is too soon — AUD-0010, D-273.
   *
   * The twenty-first dimension, and it refines what `recent-duplication` could
   * only do bluntly: a flat three-day penalty over recorded moves is not a
   * spacing model, and spacing is the best-evidenced lever the product has.
   *
   * **Penalty only, and it abstains in every case but the one it is about.** It
   * says nothing when there is no topic, nothing when the topic has never been
   * gone over, and nothing once the gap has passed. "It has been long enough" is
   * not a reason to do something; the other dimensions decide that.
   */
  | 'spacing-fit'
  | 'owner-preference'
  /** Whether this can actually be done in situations like this one (section 20). */
  | 'follow-through'
  /** Whether doing it reaches what it was for (DEF-0020). Penalty-only. */
  | 'direct-result'
  /** What has actually followed it, against occasions without it (D-089). */
  | 'observed-change'
  | 'uncertainty'
  | 'protection'
  /** Only present under the hybrid architecture. Bounded by `MAX_NUDGE`. */
  | 'advisor'

export interface Dimension {
  readonly name: DimensionName
  /** −1 … 1. */
  readonly value: number
  readonly weight: number
  readonly note: string
  /**
   * The same finding in the owner's register, where there is one — AUD-0027.
   *
   * **Deliberately not `note`, and DEF-0040 is why.** `ConsideredFact.reading`
   * was written for the inspector, reused verbatim on the evidence panel, and
   * shipped "not known — never-observed" to the owner. `note` is diagnostics
   * copy: it names dimensions, quotes both sides of a comparison and says
   * "across the record". Shipping it raw would repeat that defect and breach
   * section 61's ban on confidence arithmetic.
   *
   * Absent on every dimension that has nothing an owner would want read out,
   * which is most of them: a dimension earns a sentence on Now by having one
   * worth saying, not by existing.
   */
  readonly phrase?: string
  /**
   * The concept the phrase rests on, so D-031 can be checked before it is said.
   *
   * "An explanation may only cite evidence the decision leaned on" — so the
   * permission travels with the sentence rather than being re-derived by
   * whoever renders it.
   */
  readonly restsOn?: ConceptId
}

export interface Evaluation {
  readonly candidate: Candidate
  readonly dimensions: readonly Dimension[]
  /** The weighted mean of the dimensions, so it stays inside −1 … 1. */
  readonly score: number
  readonly confidence: Confidence
  /** Owner-written constraints touching this move. Shown, never enforced. */
  readonly cautions: readonly string[]
}

const WEIGHTS: Record<DimensionName, number> = {
  'bottleneck-fit': 2.5,
  // Heavy enough that a stated direction actually decides an ordinary evening,
  // and light enough that it never outweighs what is genuinely in the way —
  // which is exactly what section 21 asks of it.
  'direction-fit': 1.8,
  'goal-fit': 1,
  /*
   * Below `bottleneck-fit`, and that ordering is a gate item rather than a
   * preference — AUD-0020 names it as the first mitigation and section 7's gate
   * asserts it directly.
   *
   * A plan may not out-argue what is actually in the way. A man nine hours
   * short of rest is nine hours short of rest whether or not he agreed three
   * weeks ago to a run of study sessions, and a thread that could beat the
   * recovery limiter would be the app nagging him with his own past intentions
   * — which is the failure mode AUD-0020 calls out about itself.
   *
   * Level with `goal-fit`, which is the honest comparison: a course under way
   * and a goal the move serves are the same kind of claim about direction, and
   * neither is a reading of tonight.
   */
  'thread-fit': 1,
  /*
   * Level with `goal-fit` and `thread-fit`, and below `bottleneck-fit` for the
   * same reason both of those are — AUD-0029, D-270.
   *
   * A six-week drift is a claim about a season, and what is actually in the way
   * tonight is a claim about tonight. A man nine hours short of rest is nine
   * hours short of rest whether or not his mood has been sliding since June, and
   * a dimension that could out-argue the recovery limiter would be the app
   * reading a trend at a body. It is a **positive-only** dimension, so this
   * weight is a ceiling on how much it can raise something and never a floor it
   * can drag anything to.
   */
  'trajectory-fit': 1,
  urgency: 1,
  'immediate-benefit': 1,
  'next-day-effect': 0.8,
  'opportunity-cost': 0.8,
  friction: 0.6,
  'time-fit': 0.8,
  'capacity-fit': 1.2,
  'context-fit': 0.8,
  'recent-duplication': 0.8,
  /*
   * Level with `recent-duplication`, which is the dimension it refines — D-273.
   *
   * AUD-0010's complaint about that one is that it is *"a blunt three-day
   * penalty over recorded moves, which is not a spacing model"*. This is the
   * same kind of claim about the same kind of fact, measured properly, so it
   * carries the same weight rather than a larger one. It is penalty-only, so the
   * weight is a ceiling on how far it can hold a move back and never a floor it
   * can lift one to.
   *
   * Deliberately **below** `thread-fit` at 1. A course the owner agreed to has to
   * be able to advance: if spacing could out-argue a live plan, a study schedule
   * would stall on its own second session and the app would be enforcing a gap
   * against a commitment he made.
   */
  'spacing-fit': 0.8,
  'owner-preference': 1,
  'follow-through': 0.9,
  'direct-result': 0.9,
  'observed-change': 0.9,
  uncertainty: 0.6,
  protection: 0.9,
  advisor: 0.5,
}

/**
 * Re-score an evaluation with one more dimension attached.
 *
 * Used by the hybrid architecture to fold in a validated advisor nudge without
 * giving anything outside this file the ability to write a score directly.
 */
export function withDimension(evaluation: Evaluation, dimension: Dimension): Evaluation {
  const dimensions = [...evaluation.dimensions, dimension]
  const totalWeight = dimensions.reduce((sum, entry) => sum + entry.weight, 0)
  return {
    ...evaluation,
    dimensions,
    score:
      totalWeight === 0
        ? 0
        : dimensions.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / totalWeight,
  }
}

const TRIGGER_URGENCY: Record<string, number> = {
  deficit: 0.8,
  'recent-struggle': 0.5,
  'opportunity-window': 0.5,
  'goal-behind': 0.4,
  'constraint-active': 0.4,
  'stale-evidence': 0.3,
  'good-conditions': 0.2,
  'nothing-better': 0,
}

function scaled(value: number): number {
  return Math.max(-1, Math.min(1, value))
}

// ---------------------------------------------------------------------------
// The dimensions
// ---------------------------------------------------------------------------

function bottleneckFit(situation: Situation, profile: MoveProfile, friction: number): Dimension {
  const limiter = situation.limiter
  if (limiter === undefined) {
    /*
     * Abstains — AUD-0035, and it is the heaviest of the three.
     *
     * "Nothing is in the way" is not a judgement about this move; it is the
     * absence of a judgement. At weight 2.5 it was contributing a fifth of the
     * whole instrument as zero on every evening with no limiter, dividing every
     * candidate's score by roughly 1.5 and compressing the field into noise —
     * an observed evening ranked 0.137 / 0.135 / 0.134, three candidates inside
     * three thousandths, decided by rounding.
     *
     * D-048 already established the rule for `follow-through` and recorded that
     * the older dimensions were left alone because re-cutting them means
     * re-running the tournament. This is the phase that can.
     */
    return {
      name: 'bottleneck-fit',
      value: 0,
      weight: 0,
      note: 'nothing in particular is in the way',
    }
  }

  /*
   * A life area that has gone quiet scores nothing here, either way.
   *
   * This dimension means "answers what is actually in the way", and a quiet
   * fortnight in one corner of the owner's life is not in the way of anything.
   * It is the app's own blind spot. The first version of this gave a move in
   * the quiet area a healthy bonus, and on the scenario built to demonstrate
   * exactly this case it produced "spend 15 minutes clearing the kitchen" on a
   * Saturday evening with the owner's daughter in the house — beating time with
   * her, on the strength of the app not knowing what the kitchen looks like.
   * That is DEF-0006's family: acting confidently from ignorance, with an
   * explanation that would have read "answers what is actually in the way".
   *
   * A stale area earns a candidate that would not otherwise exist, and that
   * candidate carries a low `stale-evidence` urgency. So it wins on an evening
   * with nothing better and loses to anything real, which is what "eventually
   * surface naturally" means. The owner is told either way: the limiter line
   * says what has gone quiet whenever the chosen move is not about it.
   */
  if (limiter.kind === 'coverage') {
    // Abstains for the same reason, and the comment above already says why a
    // quiet area is not in the way of anything: it is the app's own blind spot.
    return {
      name: 'bottleneck-fit',
      value: 0,
      weight: 0,
      note: 'nothing is in the way — an area has just gone quiet',
    }
  }

  if (limiter.kind === 'recovery' || limiter.kind === 'capacity') {
    // `answersLimiter` rather than the demand directly, because the filter now
    // protects whatever this branch rewards and the two must not drift apart.
    if (answersLimiter(limiter, profile)) {
      return {
        name: 'bottleneck-fit',
        value: 0.95,
        weight: WEIGHTS['bottleneck-fit'],
        note: `answers what is actually in the way — ${limiter.summary.toLowerCase()}`,
      }
    }
    if (profile.demand === 'effortful') {
      return {
        name: 'bottleneck-fit',
        value: -0.75,
        weight: WEIGHTS['bottleneck-fit'],
        note: 'asks for effort while recovery is the thing that is short',
      }
    }
    return {
      name: 'bottleneck-fit',
      value: -0.1,
      weight: WEIGHTS['bottleneck-fit'],
      note: 'neither helps nor hurts what is in the way',
    }
  }

  // A short evening: the cheapest useful thing wins — measured by how hard the
  // move has actually proved for this owner, not only by the table's guess.
  return {
    name: 'bottleneck-fit',
    value: scaled(0.6 - friction * 1.4),
    weight: WEIGHTS['bottleneck-fit'],
    note: limiter.summary.toLowerCase(),
  }
}

function directionFit(candidate: Candidate, situation: Situation): Dimension {
  const weekly = situation.direction.weekly
  const weight = WEIGHTS['direction-fit']

  if (weekly.state !== 'set') {
    const note =
      weekly.state === 'none'
        ? 'no direction set for this week'
        : weekly.state === 'expired'
          ? `“${weekly.wording}” belonged to an earlier week`
          : `“${weekly.wording}” does not name a life area, so it pulls nowhere`
    /*
     * Abstains — AUD-0035. A week with no direction set, a direction that
     * belonged to an earlier week, and a direction that names no life area are
     * all the same thing to a ranking: nothing to say. Scoring them as zero at
     * weight 1.8 marked every move down for the owner not having stated a
     * direction, which is not a fact about any move.
     */
    return { name: 'direction-fit', value: 0, weight: 0, note }
  }

  const matches = weekly.category === candidate.semantics.domain
  return {
    name: 'direction-fit',
    value: matches ? 1 : -0.3,
    weight,
    note: matches
      ? `this week is pointed at ${weekly.wording}`
      : `this week is pointed at ${weekly.wording}, and this is not that`,
  }
}

/**
 * How close the date is before a goal starts pulling harder — AUD-0046.
 *
 * A goal with two months to run and a goal with nine days to run are not the
 * same claim on a Tuesday evening, and until this phase the app could not tell
 * them apart: the horizon was in the schema, parsed and carried, and read by
 * nothing.
 *
 * A month, because that is the shortest span over which the app can watch the
 * work move — its own coverage windows run in weeks — and because a shorter
 * fuse would turn a date into a countdown, which is what section 4.4 forbids
 * doing with a personal goal.
 */
const GOAL_CLOSING_DAYS = 28

/** What a date inside the last month adds. Caps at 1 like everything else here. */
const CLOSING_PULL = 0.2

/** What a date still months away takes off. A goal is not tonight's business yet. */
const PATIENT = 0.8

/** How much a piece of the work that has already had a session is still worth. */
const PIECE_ALREADY_TOUCHED = 0.6

/**
 * What a candidate is worth to what the owner is aiming at.
 *
 * ## What this used to be, and what AUD-0021 changed
 *
 * The whole of it was domain membership: 1.0 when the candidate named the goal,
 * 0.6 when a goal merely existed in the same life area, 0 otherwise. "Pass the
 * CCNA before the winter" was a string that made career moves score 0.6 higher,
 * and there was no notion of what remained or how long there was.
 *
 * Two readings now sit on top of that, and **the case with neither is byte for
 * byte the old behaviour** — 1.0, 0.6, 0 — which is both findings' own
 * acceptance condition: an absent horizon must stay unknown rather than become
 * a default, and a goal with no parts must behave exactly as today.
 *
 * ## Coverage of the pieces
 *
 * A candidate whose object is one of the goal's named pieces is judged on
 * whether that piece has had a session. The piece nothing has happened on is
 * what the goal needs next; the one that has already had a session is still
 * worth something and is no longer the most useful thing to do. That is a
 * coverage statement rather than a score, which is what keeps section 22 intact
 * — the app never says how far along he is, it says which piece is untouched.
 *
 * ## Time remaining
 *
 * The date moves it in both directions, and both are the same reading. A goal
 * whose date is months out is not asking for this particular evening; one
 * inside its last month is. Deliberately modest either way: a horizon is a fact
 * about the goal, never a reason to override what is actually in the way.
 */
function goalFit(candidate: Candidate, situation: Situation): Dimension {
  const object = candidate.semantics.target.object
  const related = candidate.semantics.relatedGoal

  const named =
    related === undefined
      ? undefined
      : situation.direction.goals.find((entry) => entry.goal.id === related.id)
  const goal =
    named ?? situation.direction.goals.find((entry) => entry.domain === candidate.semantics.domain)

  if (goal === undefined) {
    // Abstains — AUD-0035. No goal in this area is a fact about the area rather
    // than about the move, and the move should not pay for it.
    return {
      name: 'goal-fit',
      value: 0,
      weight: 0,
      note: 'no active goal in this area',
    }
  }

  const piece = goal.parts.find((part) => part.ref.id === object.id)
  const statement = goal.statement.toLowerCase()

  const base =
    piece !== undefined
      ? piece.covered
        ? PIECE_ALREADY_TOUCHED
        : 1
      : named !== undefined
        ? 1
        : 0.6

  const note =
    piece !== undefined
      ? piece.covered
        ? `a piece of ${statement} that has already had a session`
        : `a piece of ${statement} with no session yet`
      : named !== undefined
        ? `serves ${statement}`
        : `sits under ${statement}`

  return {
    name: 'goal-fit',
    value: timed(base, goal.horizon),
    weight: WEIGHTS['goal-fit'],
    note: horizonNote(note, goal.horizon),
  }
}

/** The same value, read against the date the owner set — or unchanged, with none. */
function timed(base: number, horizon: GoalHorizon | undefined): number {
  if (horizon === undefined) return base
  if (horizon.passed || horizon.daysRemaining <= GOAL_CLOSING_DAYS)
    return scaled(base + CLOSING_PULL)
  return base * PATIENT
}

function horizonNote(note: string, horizon: GoalHorizon | undefined): string {
  if (horizon === undefined) return note
  if (horizon.passed) return `${note}, and the date you set has gone`
  if (horizon.daysRemaining <= GOAL_CLOSING_DAYS) return `${note}, and the date is close`
  return `${note}, and the date is still a way off`
}

/**
 * Whether this move is an occasion of a course already under way — AUD-0020.
 *
 * Two states, and the second is nearly every move.
 *
 * **It counts toward a live thread**, and scores full. A run of recovery nights
 * that has had one is asking for the second, and nothing else the app can say
 * about tonight carries that.
 *
 * **It belongs to no live thread**, and abstains at zero weight. D-048's rule:
 * a dimension with nothing to say must cost nothing to have. A history with no
 * course in it — every history until the owner starts one — ranks exactly as it
 * did before this dimension existed, which is what makes adding a nineteenth
 * dimension safe to do in the same phase as the re-cut.
 *
 * "Live" is doing the work in that sentence. A paused, finished, abandoned or
 * expired thread is still in the record and still on Life; what it stops doing
 * is pulling. That single condition is the whole of AUD-0020's anti-nagging
 * mitigation.
 */
function threadFit(candidate: Candidate, situation: Situation): Dimension {
  const thread = threadFor(situation.threads, candidate.semantics.target)

  if (thread === undefined) {
    return { name: 'thread-fit', value: 0, weight: 0, note: 'belongs to no course under way' }
  }

  return {
    name: 'thread-fit',
    value: 1,
    weight: WEIGHTS['thread-fit'],
    note: `${lowerFirst(thread.intent)} — ${lowerFirst(describeThreadPosition(thread))}`,
  }
}

/**
 * Whether this area has been drifting the wrong way — AUD-0029, S1b.
 *
 * ## What it reads
 *
 * `situation.trajectories`, which is the same computation the trajectory card
 * prints. One reading, two consumers, and no way for the screen and the ranking
 * to disagree about what the record has been doing.
 *
 * ## Why a direction is not enough, and this is the whole of the care
 *
 * Six weeks of falling readings is a fall whichever concept it is about, and
 * what it means is opposite for two concepts in the same registry: falling
 * sleep is a man getting worse and falling soreness is a shoulder getting
 * better. So the concept's own `sense` decides, it is required rather than
 * defaulted, and `registries.test.ts` fails the build for a tracked concept that
 * does not declare one. A concept whose readings have no good direction —
 * *"how much would company help"* — never speaks here at all.
 *
 * ## Positive only, and abstaining is the common case
 *
 * It raises an area the record says is sliding and it never marks one down.
 * *"This has been going well, so spend the evening elsewhere"* is a stronger
 * claim than the audit makes and has an obvious failure: the thing that was
 * working stops being offered and the gain is given back. The audit's own
 * wording is *"a domain whose state has been drifting down for weeks gains
 * urgency, and one that has been steady loses it"* — and in a weighted mean,
 * gaining nothing while a rival gains **is** losing it.
 *
 * Everything else abstains at zero weight: no readings, not enough of them, too
 * short a span, a steady run, a drift the good way, or a concept with no sense
 * to read. D-048's rule, and it is what makes a twentieth dimension safe to add
 * without re-cutting the instrument (AUD-0035, D-137).
 *
 * ## And it says nothing causal
 *
 * The note names what drifted and by how much. Nothing here claims the move
 * would reverse it — the app cannot know that, section 68 forbids saying it, and
 * the dimension is named for the *fit* between a move's area and a reading
 * rather than for a remedy.
 */
function trajectoryFit(candidate: Candidate, situation: Situation): Dimension {
  const abstain: Dimension = {
    name: 'trajectory-fit',
    value: 0,
    weight: 0,
    note: 'nothing in this area has been moving one way for long enough',
  }

  let worst: Trajectory | undefined
  for (const trajectory of situation.trajectories.values()) {
    if (trajectory.domain !== candidate.semantics.domain) continue
    const sense = situation.concepts.definitionFor(trajectory.concept).sense
    if (sense === undefined || sense === 'neither') continue
    if (trajectory.direction === 'steady') continue
    const wrongWay =
      sense === 'higher-is-better' ? trajectory.direction === 'down' : trajectory.direction === 'up'
    if (!wrongWay) continue
    if (worst === undefined || Math.abs(trajectory.shift) > Math.abs(worst.shift)) {
      worst = trajectory
    }
  }

  if (worst === undefined) return abstain

  /*
   * How far it has moved, capped, and coarse on purpose.
   *
   * A drift of a fifth is the smallest one the trajectory reading will call a
   * direction at all (`TRAJECTORY_SHIFT`), and one of a half is as much as this
   * is allowed to make of it. Section 22 forbids inventing precision, and a
   * proportional change read to three places would be exactly that — what is
   * being said is *"this has been going the wrong way for weeks"*, and the size
   * only decides how loudly.
   */
  const value = Math.min(1, Math.abs(worst.shift) / 0.5)

  return {
    name: 'trajectory-fit',
    value,
    weight: WEIGHTS['trajectory-fit'],
    note: `${lowerFirst(worst.label)} has been going the other way across ${worst.readings.length} readings`,
    phrase: `${lowerFirst(worst.label)} has been going the other way for a while`,
    restsOn: worst.concept,
  }
}

function urgency(candidate: Candidate): Dimension {
  const trigger = candidate.semantics.whyNow.trigger
  return {
    name: 'urgency',
    value: TRIGGER_URGENCY[trigger] ?? 0,
    weight: WEIGHTS.urgency,
    note: `raised by ${trigger.replace(/-/g, ' ')}`,
  }
}

/**
 * What this move is worth in the block it happens in.
 *
 * The number no longer comes from the profile table. It comes from
 * `learning.ts`, which starts at the profile's prior and pulls it toward what
 * actually happened to this owner in situations resembling this one — by
 * `n / (n + PATIENCE)`, so one good evening moves it a quarter of the way and
 * no single evening can convert it (section 20).
 *
 * Only outcomes reach here. A move the owner declined contributes nothing, and
 * a move they could not do contributes nothing, because those are answers to
 * different questions and `learning.ts` keeps them apart.
 */
function immediateBenefit(candidate: Candidate, situation: Situation): Dimension {
  const learned = learnedFor(candidate, situation)
  return {
    name: 'immediate-benefit',
    value: learned.now * 2 - 1,
    weight: WEIGHTS['immediate-benefit'],
    note: describeLearned(
      learned.now,
      learned.moved === 'now' ? learned : undefined,
      horizonWord(situation.block),
    ),
  }
}

function nextDayEffect(candidate: Candidate, situation: Situation): Dimension {
  const learned = learnedFor(candidate, situation)
  return {
    name: 'next-day-effect',
    value: learned.tomorrow * 2 - 1,
    weight: WEIGHTS['next-day-effect'],
    note: describeLearned(
      learned.tomorrow,
      learned.moved === 'tomorrow' ? learned : undefined,
      'tomorrow',
    ),
  }
}

/**
 * What the record shows has followed this move, against occasions without it.
 *
 * The only dimension in this file built from readings the app took rather than
 * from a judgment somebody supplied (D-089). It exists because removing the
 * causal question from the owner would otherwise have made the engine *worse*
 * at deciding: `immediate-benefit` would keep whatever the old attributions
 * taught it and learn nothing further.
 *
 * **It abstains rather than defaulting.** No observable state dimension, or not
 * enough of either group to compare, returns zero at zero weight — which is
 * D-048's rule, and is exactly what `uncertainty` does for a move whose unknowns
 * it has no business judging (D-072). A dimension with nothing to say must cost
 * nothing to have, or every move without evidence is quietly marked down for
 * not having any.
 *
 * The value is the *gap* between the two proportions, not either one of them.
 * How often energy rose after a walk is a fact about the owner's evenings; how
 * much more often it rose after a walk than without one is the only part that
 * is about walks.
 */
function observedChange(candidate: Candidate, situation: Situation): Dimension {
  const found = situation.learning.associationFor(candidate.semantics.target)

  /*
   * The band tonight actually falls in, not the whole record (D-091).
   *
   * Walks that helped on every weekday and on no weekend collapse to "no
   * different" across the record, and that collapsed figure is precisely what
   * must not decide a Tuesday. `applicableAssociation` returns the supported
   * band this moment is in, and nothing at all when the bands disagree and
   * tonight's is not supported — because the honest answer there is that the
   * app does not know about tonight.
   */
  const side =
    found === undefined ? undefined : applicableAssociation(found, situation.at, situation.zone)

  if (found === undefined || side === undefined) {
    return {
      name: 'observed-change',
      value: 0,
      weight: 0,
      note:
        found === undefined
          ? 'nothing observable is expected to move, so nothing is claimed'
          : found.disagree
            ? `what follows this depends on the kind of occasion, and there is not enough of one like ${hereNowWord(situation.block)}`
            : 'not enough on both sides to compare yet',
    }
  }

  const subject = situation.entities.labelFor(candidate.semantics.target.object)

  return {
    name: 'observed-change',
    // Already −1…1: the difference of two proportions.
    value: side.gap,
    weight: WEIGHTS['observed-change'],
    note: `${found.label.toLowerCase()} rose ${side.rosePresent} of ${side.present.length} times with it and ${side.roseAbsent} of ${side.absent.length} without, ${side.label}`,
    /*
     * The best sentence the app writes about the owner's own life — AUD-0027.
     *
     * It was computed, used to rank, and never shown to him. The screen said
     * "There is enough in the tank for a walk, and the evening suits it" while
     * this dimension carried, one layer down, a specific and comparative
     * statement made entirely of his own record. Section 4.6 is explicit that a
     * specific ordinary sentence beats an elegant generic one, and the specific
     * one already existed.
     *
     * Association, never cause (D-089, D-066): "has more often been higher
     * afterwards" is a statement about the record; "does you good" would be a
     * claim about the world that a comparison of two proportions cannot carry.
     * The counts stay in the evidence panel, which is the one place allowed to
     * print a figure with the sentence naming what it measures (D-084).
     */
    ...(subject === undefined || found.withheld !== undefined
      ? {}
      : {
          phrase: `${lowerFirst(found.label)} has more often been ${side.direction === 'lower' ? 'lower' : 'higher'} after ${subject} than without.`,
          restsOn: found.concept,
        }),
  }
}

function lowerFirst(text: string): string {
  return text.length === 0 ? text : `${text.charAt(0).toLowerCase()}${text.slice(1)}`
}

function learnedFor(candidate: Candidate, situation: Situation): LearnedEffect {
  return situation.learning.effectFor(candidate.semantics.target.verb, situation.context)
}

function describeLearned(value: number, from: LearnedEffect | undefined, when: string): string {
  const base = `worth something ${when} (${describeLevel(value)})`
  if (from === undefined || from.samples === 0) return `${base}, going on nothing but the usual`
  const times = from.samples === 1 ? 'once' : `${from.samples} times`
  return `${base}, after ${times} in situations like this one`
}

/**
 * Whether this can actually be done in situations like this one.
 *
 * Section 20: "unable-now is context evidence." This is the only dimension it
 * reaches, and what it says is a claim about the situation rather than about
 * the move — a lab that keeps getting interrupted on evenings like this is
 * still a good lab.
 *
 * **It only ever speaks against a move, and only when something has actually
 * got in the way.** The prior is that anything can be done, so a move that has
 * been managed every time sits *at* the prior — which is the absence of
 * evidence against it, not evidence for it. Scoring that positively let a move
 * with four completions beat one with no history at all on the strength of
 * "more likely to actually happen", which compares something known against
 * something unknown and calls the difference a finding. That is D-038's rule:
 * an absence may not be asserted from ignorance.
 *
 * So it abstains at zero weight unless a shortfall has been observed, and the
 * difference between abstaining and scoring zero is not cosmetic. The score is
 * a weighted mean, so a dimension contributing zero at full weight drags every
 * move toward the middle — which moved the `WORTH_DOING` bar the moment this
 * dimension was added and turned a walk that had been worth doing for two
 * phases into no action at all. A dimension with nothing to say must cost
 * nothing to have.
 *
 * The older dimensions predate this and still score zero at full weight for
 * their unknown cases. That is a wart rather than a principle: the weights were
 * tuned with them present, and re-cutting the whole instrument to fix it
 * belongs to a phase that can re-run the tournament afterwards.
 */
function followThrough(candidate: Candidate, situation: Situation): Dimension {
  const learned = situation.learning.followThroughFor(
    candidate.semantics.target.verb,
    situation.context,
  )
  if (learned.samples === 0 || learned.rate >= 1) {
    return { name: 'follow-through', value: 0, weight: 0, note: learned.note }
  }
  return {
    name: 'follow-through',
    value: scaled((learned.rate - 1) * 4),
    weight: WEIGHTS['follow-through'],
    note: learned.note,
  }
}

function opportunityCost(candidate: Candidate, situation: Situation): Dimension {
  const weight = WEIGHTS['opportunity-cost']
  const minutes = candidate.semantics.target.minutes
  // What is actually left, not what he said he had — AUD-0004. An hour with
  // twenty minutes of it before the school run is twenty minutes.
  const usable = situation.inHand.minutes
  const before = situation.inHand.before

  if (minutes === undefined) {
    return { name: 'opportunity-cost', value: 0, weight, note: 'takes no fixed block of time' }
  }
  if (!isUsable(usable) || usable.value <= 0) {
    return {
      name: 'opportunity-cost',
      value: 0,
      weight,
      note:
        before === undefined
          ? 'how much time there is is unknown'
          : `there is no time before ${before.label}`,
    }
  }

  const share = minutes / usable.value
  return {
    name: 'opportunity-cost',
    value: scaled(0.4 - share * 1.4),
    weight,
    note:
      before === undefined
        ? `takes about ${Math.round(share * 100)} percent of what is left`
        : `takes about ${Math.round(share * 100)} percent of what is left before ${before.label}`,
  }
}

/**
 * How hard this is to get started, as far as this owner has shown.
 *
 * The profile's number is where it begins; comfort answers move it. Unlike
 * result and follow-through this is **signed both ways**, and for a reason
 * rather than an oversight: their priors are ceilings, so only failure tells us
 * anything. Friction's prior is a middling guess per move, so "easier for you
 * than it looks" is real news about this owner and is allowed to count.
 */
function friction(candidate: Candidate, situation: Situation): Dimension {
  const learned = situation.learning.frictionFor(candidate.semantics.target.verb, situation.context)
  return {
    name: 'friction',
    value: scaled(1 - learned.friction * 2),
    weight: WEIGHTS.friction,
    note:
      learned.samples === 0
        ? learned.friction > 0.5
          ? 'hard to start'
          : 'easy to start'
        : learned.note,
  }
}

/**
 * Whether doing this actually reaches what it was for.
 *
 * **Distinct from follow-through**, and DEF-0020 turns on the distinction:
 * follow-through asks whether the move can happen here at all, from unable-now.
 * This asks whether it lands when it does. Clearing the kitchen every single
 * time and only ever half-clearing it is perfect follow-through and a poor
 * result, and folding them would have the app say "something usually gets in
 * the way" of an evening where nothing did.
 *
 * **Penalty-only, and that is what stops double counting.** The prior is that a
 * move achieves its aim, so *achieved* sits at the prior and abstains — a move
 * with both a result and an effect cannot collect two positive rewards for one
 * good evening, because its second aspect can only ever cost it. Same shape as
 * `follow-through` after DEF-0019, and the same reason: an absence may not be
 * asserted from ignorance.
 */
function directResult(candidate: Candidate, situation: Situation): Dimension {
  const learned = situation.learning.resultFor(candidate.semantics.target.verb, situation.context)
  if (learned.samples === 0 || learned.reached >= 1) {
    return { name: 'direct-result', value: 0, weight: 0, note: learned.note }
  }
  return {
    name: 'direct-result',
    value: scaled((learned.reached - 1) * 4),
    weight: WEIGHTS['direct-result'],
    note: learned.note,
  }
}

function timeFit(candidate: Candidate, situation: Situation): Dimension {
  const weight = WEIGHTS['time-fit']
  const block = situation.block
  const minutes = candidate.semantics.target.minutes
  // The smaller of what he said and what the day allows — AUD-0004.
  const usable = situation.inHand.minutes
  const before = situation.inHand.before

  if (minutes === undefined) {
    return { name: 'time-fit', value: 0.3, weight, note: 'fits whatever is left' }
  }
  if (!isUsable(usable)) {
    // Unknown time is not a penalty. It is a reason to ask, and the
    // uncertainty dimension already carries the cost of not knowing.
    return { name: 'time-fit', value: 0, weight, note: 'how much time there is is unknown' }
  }

  /*
   * Five bands, and every sentence is about the two figures rather than about
   * the ratio — QA-82-003, round 2.
   *
   * Round 1 split "does not fit" off the top of a band that used to say it
   * about a move that fitted exactly. It left a band that says *"would use all
   * the time before Adaya's school day"* for everything from four-fifths to
   * all of it — so at eighteen minutes past eight, with twelve minutes in hand,
   * a ten-minute move was told it would use all twelve while the dimension
   * printed directly beneath it said it takes about 83 percent. Two of the
   * app's own numbers, disagreeing on one row.
   *
   * The mistake was the shape of the repair rather than its direction. A band
   * is chosen by a ratio, and three of these sentences are claims about the
   * **minutes** — "all of it", "most of it", "more than there is". So the top
   * three bands are decided by comparing the two figures the sentence is about,
   * and only the two that genuinely are about proportion ("fits comfortably",
   * "fits") are decided by the share.
   *
   * The score judgement from round 1 is unchanged and deliberate: an exact fit
   * and a near fit are both worth nothing either way, and a move that cannot be
   * finished counts against. Only the words moved.
   */
  const left = usable.value
  if (minutes > left) {
    return {
      name: 'time-fit',
      value: -0.5,
      weight,
      note:
        before === undefined
          ? `is longer than what is left of ${blockNoun(block)}`
          : `would not fit before ${before.label}`,
    }
  }
  if (minutes === left) {
    return {
      name: 'time-fit',
      value: 0,
      weight,
      note:
        before === undefined
          ? `would use the rest of ${blockNoun(block)}`
          : `would use all the time before ${before.label}`,
    }
  }

  const share = left === 0 ? 1 : minutes / left
  if (share <= 0.5) return { name: 'time-fit', value: 1, weight, note: 'fits comfortably' }
  if (share <= 0.8) return { name: 'time-fit', value: 0.5, weight, note: 'fits' }
  return {
    name: 'time-fit',
    value: 0,
    weight,
    note:
      before === undefined
        ? `would use most of ${blockNoun(block)}`
        : `would use most of the time before ${before.label}`,
  }
}

function capacityFit(situation: Situation, profile: MoveProfile): Dimension {
  const weight = WEIGHTS['capacity-fit']
  const strain = situation.capacity.strain
  const soreness = situation.capacity.soreness

  if (!isUsable(strain)) {
    return {
      name: 'capacity-fit',
      value: 0,
      weight,
      note: 'nothing recent about sleep or energy',
    }
  }

  const sore = isUsable(soreness) && soreness.value >= 0.6
  if (strain.value === 'none' && !sore) {
    return {
      name: 'capacity-fit',
      value: profile.demand === 'effortful' ? 0.6 : 0.2,
      weight,
      note: 'there is capacity for this',
    }
  }

  /*
   * A sore body and a short night are different readings — QA-81-001.
   *
   * They were being spent as one number. With rest in hand and a shoulder that
   * hurts, this dimension marked a *light* move down by the same reasoning it
   * used for a strained night, so half an hour with his daughter, phone away,
   * scored as though it were asking something of a body that had nothing to
   * give. It is not: soreness is a reading about **exertion**, and it has
   * nothing to say about sitting with somebody.
   *
   * The consequence was visible the moment the capacity limiter gained a move
   * of its own: a sore, well-rested father with Adaya in the house was told to
   * start easing off, and "spend the next 30 minutes with Adaya, phone away"
   * came second. Section 10 protects that move from being merged or made
   * conditional; nothing protects it from being out-scored by a wrong reading,
   * which is what this was.
   *
   * So soreness alone speaks about what it knows about. Effort is still marked
   * down — that is the whole point of asking — a restorative move is still what
   * a sore body is asking for, and a light one is neither helped nor hindered.
   */
  if (strain.value === 'none') {
    if (profile.demand === 'effortful') {
      return {
        name: 'capacity-fit',
        value: -0.55,
        weight,
        note: 'more than a sore body should be asked for',
      }
    }
    if (profile.demand === 'restorative') {
      return {
        name: 'capacity-fit',
        value: 0.4,
        weight,
        note: 'this is what a sore body is asking for',
      }
    }
    return { name: 'capacity-fit', value: 0, weight, note: 'asks nothing of a sore body' }
  }

  const level = strain.value === 'severe' ? 1 : 0.55
  if (profile.demand === 'restorative') {
    return {
      name: 'capacity-fit',
      value: level,
      weight,
      note: 'this is what capacity is asking for',
    }
  }
  if (profile.demand === 'effortful') {
    return {
      name: 'capacity-fit',
      value: -level,
      weight,
      note: `more than the body has ${horizonWord(situation.block)}`,
    }
  }
  return { name: 'capacity-fit', value: -level * 0.3, weight, note: 'a stretch, but a small one' }
}

function contextFit(situation: Situation, profile: MoveProfile): Dimension {
  const suits = profile.suits.includes(situation.block)
  return {
    name: 'context-fit',
    value: suits ? 0.7 : -0.2,
    weight: WEIGHTS['context-fit'],
    note: suits
      ? `sits well in the ${situation.block.replace('-', ' ')}`
      : `an odd fit for the ${situation.block.replace('-', ' ')}`,
  }
}

function recentDuplication(candidate: Candidate, situation: Situation): Dimension {
  const weight = WEIGHTS['recent-duplication']
  const since = addLocalDays(situation.at, -3, situation.zone)
  let sameThing = 0
  let sameShape = 0

  for (const prior of situation.recentMoves) {
    if (prior.at < since) continue
    if (prior.semantics.target.verb !== candidate.semantics.target.verb) continue
    if (prior.semantics.target.object.id === candidate.semantics.target.object.id) sameThing += 1
    else sameShape += 1
  }

  /*
   * And the times it was shown and ignored — AUD-0025.
   *
   * Ignoring is a response, and it is the most common one. `recentMoves` is
   * built from recorded `action-recommendation` records, which is to say only
   * the moves the owner *responded to* — so a move shown at half past six and
   * left produced no trace at all, and at ten the same morning it scored "+0.20
   * — not offered lately". That is what produced the most visible repetition in
   * the product: the identical kitchen sentence at four separate hours of one
   * day.
   *
   * The ledger is the surface's, not the store's (D-043 is untouched), and it
   * only ever holds today.
   */
  const shownToday = (situation.shown ?? [])
    .filter((entry) => entry.move === candidate.id)
    .reduce((total, entry) => total + entry.count, 0)

  if (sameThing === 0 && sameShape === 0 && shownToday === 0) {
    return { name: 'recent-duplication', value: 0.2, weight, note: 'not offered lately' }
  }
  return {
    name: 'recent-duplication',
    value: scaled(-0.5 * sameThing - 0.2 * sameShape - 0.35 * shownToday),
    weight,
    note:
      shownToday > 0
        ? `already on screen ${shownToday === 1 ? 'once' : `${shownToday} times`} today`
        : sameThing > 0
          ? `offered ${sameThing === 1 ? 'once' : `${sameThing} times`} in the last few days`
          : 'something like this was offered recently',
  }
}

/**
 * What the owner wants, said outright or shown by repeatedly saying no.
 *
 * **This is the only dimension a decline can reach**, and that is section 20's
 * first rule made structural rather than promised: "a rejection is not
 * 'ineffective'". A refusal is the owner exercising the sovereignty section 4.3
 * gives them. It belongs beside their stated preferences, and it must not be
 * able to travel to `immediate-benefit`, where it would become a claim that the
 * move does not work.
 *
 * A stated preference still wins outright. Something the owner wrote down beats
 * something inferred from a run of taps.
 */
/**
 * Whether going over this again is too soon — AUD-0010, D-273.
 *
 * ## What it reads
 *
 * `situation.studySpacing`: an interval that is a share of the days until the
 * goal the owner set, a gap counted from his own last completed session on this
 * topic, and whether the two say it is due. The interval widens after sessions
 * that went well and comes back after one that did not, which is the expanding
 * half of the spacing evidence.
 *
 * ## Where it speaks, and where it says nothing
 *
 * It speaks on exactly one case: **this move is one of the study moves, on the
 * topic the spacing is about, and the gap has not passed.** Everything else
 * abstains at zero weight —
 *
 * - a move in another area, which is nearly every move;
 * - a topic the record has never held a session on, which is where every topic
 *   starts and where there is no gap to be inside;
 * - a gap that has passed, because *"it has been long enough"* is not a reason
 *   to do something and pretending otherwise would let spacing **promote** a
 *   move rather than hold one back.
 *
 * That last one is what makes it penalty-only, and it is the same shape
 * `direct-result` has for the same reason (D-048).
 *
 * ## And it never enforces a gap against a plan he agreed to
 *
 * Weighted below `thread-fit`. A live study schedule is precisely the case where
 * the next session is the point, and a spacing rule that could out-argue a
 * course the owner started would stall it on its own second occasion. Holding a
 * move back is not the same as refusing it.
 */
function spacingFit(candidate: Candidate, situation: Situation): Dimension {
  const abstain: Dimension = {
    name: 'spacing-fit',
    value: 0,
    weight: 0,
    note: 'nothing about when this was last gone over',
  }

  const spacing = situation.studySpacing
  if (spacing === undefined) return abstain
  if (spacing.daysSince === undefined) return abstain
  if (spacing.due) return abstain
  if (candidate.semantics.target.verb !== 'recall-practice') return abstain
  /*
   * And never against a course he agreed to — D-273.
   *
   * `thread-fit` is weighted above this so that a plan can advance, and that is
   * a weight rather than a rule. This is the rule: while a live course counts
   * this move toward itself, the app's opinion about timing does not get to
   * argue with the owner's own commitment at all.
   *
   * It is the mirror of AUD-0020's own mitigation. A plan may not out-argue what
   * is in the way tonight; and the app's preference about which day is best may
   * not out-argue a plan. Both are the same principle — what the owner said
   * outranks what the app worked out — applied from the two directions.
   *
   * It also settles a measurable cost. With this dimension arguing against a
   * live thread, `study-thread`'s field tightened enough that the guide found a
   * soreness question worth a tap where it had previously settled — a whole
   * extra question on the daily budget, spent because the app disagreed with a
   * course the owner had started.
   */
  if (threadFor(situation.threads, candidate.semantics.target) !== undefined) return abstain

  /*
   * How much of the gap is left, as the size of the mark-down.
   *
   * A session yesterday against a week's gap is most of the gap left and reads
   * as a real objection; a session six days into a week's gap is barely one.
   * Coarse on purpose — section 22 — and the note says both numbers so the
   * inspector can argue with the arithmetic rather than with the verdict.
   */
  const left = 1 - spacing.daysSince / spacing.intervalDays
  return {
    name: 'spacing-fit',
    value: -Math.min(1, Math.max(0, left)),
    weight: WEIGHTS['spacing-fit'],
    note: `${spacing.daysSince} of ${spacing.intervalDays} days since the last one${
      spacing.fromGoal ? ', on the goal’s own horizon' : ', with no date set to work back from'
    }`,
  }
}

function ownerPreference(candidate: Candidate, situation: Situation): Dimension {
  const weight = WEIGHTS['owner-preference']
  const refs = [candidate.semantics.subject.id, candidate.semantics.target.object.id]

  for (const preference of situation.preferences) {
    if (!refs.includes(preference.about.id)) continue
    if (preference.stance === 'avoids') {
      return { name: 'owner-preference', value: -0.7, weight, note: preference.statement }
    }
    if (preference.stance === 'prefers') {
      return { name: 'owner-preference', value: 0.6, weight, note: preference.statement }
    }
  }

  const appetite = situation.learning.appetiteFor(
    candidate.semantics.target.verb,
    situation.context,
  )
  if (appetite.samples > 0) {
    return {
      name: 'owner-preference',
      value: scaled(-appetite.turnedDown),
      weight,
      note: appetite.note,
    }
  }

  return { name: 'owner-preference', value: 0, weight, note: 'no stated preference either way' }
}

/**
 * What this move rests on that nobody has told us — and what it is here to ask.
 *
 * The second half is P4-1, and it is a rule about the whole class rather than
 * about one generator. A move proposed *because* an area has gone quiet cannot
 * also be marked down *because* that area has gone quiet: the same fact would
 * create the move and then sink it, and it did — on the evening built to
 * demonstrate a seven-week gap in the studying, the penalty came to twice the
 * margin that decided the evening.
 *
 * So a concept the candidate declares it is there to resolve is set aside, and
 * what is left is judged exactly as before. Note what setting aside is not:
 *
 * - **it is not a reward.** A move that resolves everything it rests on lands
 *   on the abstention below, at zero, not on the +0.4 a move earns for genuinely
 *   resting on known facts. Approving a move for the gap it was created by is
 *   the same error with the other sign;
 * - **it is not a licence.** `resolves` is narrowed to `leansOn` when the
 *   candidate is built, so nothing can excuse itself from an unknown it never
 *   touched;
 * - **it changes nothing for an ordinary move.** Every generator but the two
 *   that propose on stale evidence declares nothing, and a sweep over the whole
 *   scenario library asserts it.
 *
 * The abstention costs no weight, which is D-048's rule: a dimension with
 * nothing to say must cost nothing to have, because zero at full weight drags
 * every move toward the middle.
 */
function uncertainty(candidate: Candidate, situation: Situation): Dimension {
  const weight = WEIGHTS.uncertainty
  const settles = candidate.resolves
  const leaned = candidate.leansOn.filter((concept) => !settles.includes(concept))

  if (leaned.length === 0) {
    return {
      name: 'uncertainty',
      value: 0,
      weight: 0,
      note:
        settles.length === 0
          ? 'leans on nothing in particular'
          : 'nothing to say — this move is here to settle what it rests on',
    }
  }

  const missing = leaned.filter((concept) => !isUsable(situation.readings.get(concept)))
  if (missing.length === 0) {
    return { name: 'uncertainty', value: 0.4, weight, note: 'everything this rests on is known' }
  }

  const names = missing.map((concept) =>
    situation.concepts.definitionFor(concept).label.toLowerCase(),
  )
  return {
    name: 'uncertainty',
    value: scaled(-missing.length / leaned.length),
    weight,
    note: `resting on something unknown — ${names.join(', ')}`,
  }
}

function protection(situation: Situation, profile: MoveProfile): Dimension {
  const weight = WEIGHTS.protection
  const strain = situation.capacity.strain
  const late = situation.block === 'late-night'

  if (profile.demand === 'effortful' && late) {
    return { name: 'protection', value: -0.8, weight, note: 'this late it costs tomorrow' }
  }
  if (profile.demand === 'effortful' && isUsable(strain) && strain.value !== 'none') {
    return { name: 'protection', value: -0.5, weight, note: 'borrows against rest' }
  }
  if (profile.demand === 'restorative' && (late || situation.block === 'evening')) {
    return { name: 'protection', value: 0.5, weight, note: 'protects tomorrow' }
  }
  return { name: 'protection', value: 0, weight, note: 'costs no other area anything' }
}

function describeLevel(value: number): string {
  if (value >= 0.7) return 'a lot'
  if (value >= 0.45) return 'a fair amount'
  return 'a little'
}

// ---------------------------------------------------------------------------

function cautionsFor(candidate: Candidate, situation: Situation): readonly string[] {
  const notes: string[] = []
  for (const constraint of situation.constraints) {
    if (candidate.leansOn.includes(constraint.concept)) notes.push(constraint.description)
  }
  return notes
}

export function evaluateCandidate(candidate: Candidate, situation: Situation): Evaluation {
  // The candidate's own profile — AUD-0045, and the reason the audit calls
  // this a scoring-model change: `friction`, `time-fit`, `opportunity-cost`
  // and `capacity-fit` all read it.
  const profile = candidate.profile

  const dimensions: readonly Dimension[] = [
    bottleneckFit(
      situation,
      profile,
      situation.learning.frictionFor(candidate.semantics.target.verb, situation.context).friction,
    ),
    directionFit(candidate, situation),
    goalFit(candidate, situation),
    threadFit(candidate, situation),
    trajectoryFit(candidate, situation),
    urgency(candidate),
    immediateBenefit(candidate, situation),
    nextDayEffect(candidate, situation),
    opportunityCost(candidate, situation),
    friction(candidate, situation),
    timeFit(candidate, situation),
    capacityFit(situation, profile),
    contextFit(situation, profile),
    recentDuplication(candidate, situation),
    spacingFit(candidate, situation),
    ownerPreference(candidate, situation),
    followThrough(candidate, situation),
    directResult(candidate, situation),
    observedChange(candidate, situation),
    uncertainty(candidate, situation),
    protection(situation, profile),
  ]

  const totalWeight = dimensions.reduce((sum, dimension) => sum + dimension.weight, 0)
  const score =
    totalWeight === 0
      ? 0
      : dimensions.reduce((sum, dimension) => sum + dimension.value * dimension.weight, 0) /
        totalWeight

  const leaned = candidate.leansOn
  /*
   * The reading the decision actually had, not the one the store holds —
   * AUD-0040.
   *
   * These two lines are why the guard matters rather than being tidiness. A
   * concept the owner has not allowed the app to reason from resolves to
   * `withheld` in the situation and to its real value in `view.facts`, so
   * scoring confidence off the store would have counted a fact the decision was
   * structurally unable to see. Nothing leans on a private concept today; the
   * point is that nothing can start to without this being right.
   */
  const known = leaned.filter((concept) => isUsable(situation.readings.get(concept)))
  const share = leaned.length === 0 ? 0.5 : known.length / leaned.length

  return {
    candidate,
    dimensions,
    score,
    // Deliberately capped well below certainty. Nothing here has been checked
    // against an outcome yet, and section 22 forbids inventing precision.
    confidence: confidence(0.25 + share * 0.5),
    cautions: cautionsFor(candidate, situation),
  }
}

export function evaluateAll(
  candidates: readonly Candidate[],
  situation: Situation,
): readonly Evaluation[] {
  return candidates.map((candidate) => evaluateCandidate(candidate, situation))
}
