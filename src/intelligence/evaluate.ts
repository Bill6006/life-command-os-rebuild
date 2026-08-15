import { confidence, isUsable, type Confidence } from '../domain/knowledge'
import { addLocalDays } from '../domain/time'
import type { Candidate } from './candidates'
import { profileFor, type MoveProfile } from './moves'
import type { Situation } from './situation'

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
  | 'urgency'
  | 'immediate-benefit'
  | 'next-day-effect'
  | 'opportunity-cost'
  | 'friction'
  | 'time-fit'
  | 'capacity-fit'
  | 'context-fit'
  | 'recent-duplication'
  | 'owner-preference'
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
  urgency: 1,
  'immediate-benefit': 1,
  'next-day-effect': 0.8,
  'opportunity-cost': 0.8,
  friction: 0.6,
  'time-fit': 0.8,
  'capacity-fit': 1.2,
  'context-fit': 0.8,
  'recent-duplication': 0.8,
  'owner-preference': 1,
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

function bottleneckFit(situation: Situation, profile: MoveProfile): Dimension {
  const limiter = situation.limiter
  if (limiter === undefined) {
    return {
      name: 'bottleneck-fit',
      value: 0,
      weight: WEIGHTS['bottleneck-fit'],
      note: 'nothing in particular is in the way',
    }
  }

  if (limiter.kind === 'recovery' || limiter.kind === 'capacity') {
    if (profile.demand === 'restorative') {
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

  // A short evening: the cheapest useful thing wins.
  return {
    name: 'bottleneck-fit',
    value: scaled(0.6 - profile.friction * 1.4),
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
    return { name: 'direction-fit', value: 0, weight, note }
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

function goalFit(candidate: Candidate, situation: Situation): Dimension {
  const weight = WEIGHTS['goal-fit']
  const related = candidate.semantics.relatedGoal
  if (related !== undefined) {
    const goal = situation.direction.goals.find((entry) => entry.goal.id === related.id)
    if (goal !== undefined) {
      return { name: 'goal-fit', value: 1, weight, note: `serves ${goal.statement.toLowerCase()}` }
    }
  }

  const sameDomain = situation.direction.goals.find(
    (goal) => goal.domain === candidate.semantics.domain,
  )
  if (sameDomain !== undefined) {
    return {
      name: 'goal-fit',
      value: 0.6,
      weight,
      note: `sits under ${sameDomain.statement.toLowerCase()}`,
    }
  }

  return { name: 'goal-fit', value: 0, weight, note: 'no active goal in this area' }
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

function immediateBenefit(profile: MoveProfile): Dimension {
  return {
    name: 'immediate-benefit',
    // Priors, not measured effects. Phase 3 replaces these with outcomes.
    value: profile.now * 2 - 1,
    weight: WEIGHTS['immediate-benefit'],
    note: `worth something tonight (${describeLevel(profile.now)})`,
  }
}

function nextDayEffect(profile: MoveProfile): Dimension {
  return {
    name: 'next-day-effect',
    value: profile.tomorrow * 2 - 1,
    weight: WEIGHTS['next-day-effect'],
    note: `worth something tomorrow (${describeLevel(profile.tomorrow)})`,
  }
}

function opportunityCost(candidate: Candidate, situation: Situation): Dimension {
  const weight = WEIGHTS['opportunity-cost']
  const minutes = candidate.semantics.target.minutes
  const usable = situation.usableMinutes

  if (minutes === undefined) {
    return { name: 'opportunity-cost', value: 0, weight, note: 'takes no fixed block of time' }
  }
  if (!isUsable(usable) || usable.value <= 0) {
    return { name: 'opportunity-cost', value: 0, weight, note: 'how much time there is is unknown' }
  }

  const share = minutes / usable.value
  return {
    name: 'opportunity-cost',
    value: scaled(0.4 - share * 1.4),
    weight,
    note: `takes about ${Math.round(share * 100)} percent of what is left`,
  }
}

function friction(profile: MoveProfile): Dimension {
  return {
    name: 'friction',
    value: scaled(1 - profile.friction * 2),
    weight: WEIGHTS.friction,
    note: profile.friction > 0.5 ? 'hard to start' : 'easy to start',
  }
}

function timeFit(candidate: Candidate, situation: Situation): Dimension {
  const weight = WEIGHTS['time-fit']
  const minutes = candidate.semantics.target.minutes
  const usable = situation.usableMinutes

  if (minutes === undefined) {
    return { name: 'time-fit', value: 0.3, weight, note: 'fits whatever is left' }
  }
  if (!isUsable(usable)) {
    // Unknown time is not a penalty. It is a reason to ask, and the
    // uncertainty dimension already carries the cost of not knowing.
    return { name: 'time-fit', value: 0, weight, note: 'how much time there is is unknown' }
  }

  const share = usable.value === 0 ? 2 : minutes / usable.value
  if (share <= 0.5) return { name: 'time-fit', value: 1, weight, note: 'fits comfortably' }
  if (share <= 0.8) return { name: 'time-fit', value: 0.5, weight, note: 'fits' }
  return { name: 'time-fit', value: 0, weight, note: 'would use most of the evening' }
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
    return { name: 'capacity-fit', value: -level, weight, note: 'more than the body has tonight' }
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

  if (sameThing === 0 && sameShape === 0) {
    return { name: 'recent-duplication', value: 0.2, weight, note: 'not offered lately' }
  }
  return {
    name: 'recent-duplication',
    value: scaled(-0.5 * sameThing - 0.2 * sameShape),
    weight,
    note:
      sameThing > 0
        ? `offered ${sameThing === 1 ? 'once' : `${sameThing} times`} in the last few days`
        : 'something like this was offered recently',
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
  return { name: 'owner-preference', value: 0, weight, note: 'no stated preference either way' }
}

function uncertainty(candidate: Candidate, situation: Situation): Dimension {
  const weight = WEIGHTS.uncertainty
  const leaned = candidate.leansOn
  if (leaned.length === 0) {
    return { name: 'uncertainty', value: 0, weight, note: 'leans on nothing in particular' }
  }

  const missing = leaned.filter((concept) => !isUsable(situation.view.facts.knowledgeFor(concept)))
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
  const profile = profileFor(candidate.semantics.target.verb)

  const dimensions: readonly Dimension[] = [
    bottleneckFit(situation, profile),
    directionFit(candidate, situation),
    goalFit(candidate, situation),
    urgency(candidate),
    immediateBenefit(profile),
    nextDayEffect(profile),
    opportunityCost(candidate, situation),
    friction(profile),
    timeFit(candidate, situation),
    capacityFit(situation, profile),
    contextFit(situation, profile),
    recentDuplication(candidate, situation),
    ownerPreference(candidate, situation),
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
  const known = leaned.filter((concept) => isUsable(situation.view.facts.knowledgeFor(concept)))
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
