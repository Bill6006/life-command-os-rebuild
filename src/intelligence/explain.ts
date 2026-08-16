import type { EntityIndex } from '../domain/entities'
import { isUsable } from '../domain/knowledge'
import { describeFactValue, type OutcomeRecord } from '../domain/records'
import {
  renderRecommendation,
  type RecommendationSemantics,
  type RenderedRecommendation,
} from '../domain/recommendation'
import { CONCEPT } from '../domain/concepts'
import { DOMAIN } from '../domain/domains'
import type { ConceptId } from '../domain/windows'
import {
  addLocalDays,
  localDateTimeAt,
  localDayIdAt,
  minutesIntoDay,
  type Instant,
  type IsoWeekday,
  type TimeZoneId,
} from '../domain/time'
import type { DimensionName, Evaluation } from './evaluate'
import { beliefKey } from './learning'
import { describeHours, type Situation } from './situation'

/**
 * The explanation generator (canonical plan section 17.1 step 9, and 61).
 *
 * Section 61 is the specification: concise, specific, ordinary, direct, warm.
 * No research-report language, no internal type names, no confidence
 * arithmetic, no generic encouragement, no therapy voice, no moral judgement.
 * Its own example is the target — not "moderate evidence, 7 comparable
 * observations" but "this has worked several times in situations like tonight".
 *
 * The reason is composed from the facts that actually drove the decision rather
 * than from a template keyed on the move. That is deliberate and it is what
 * section 64 asks for: two people with different histories should not be able
 * to receive the same sentence, because the sentence is made of their numbers,
 * their topic, their evening. If this file ever starts producing the same
 * paragraph for everyone, the intelligence behind it has stopped mattering.
 */

const WEEKDAYS: Record<IsoWeekday, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
}

const BLOCK_WORDS = {
  'early-morning': 'early morning',
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
  'late-night': 'late night',
} as const

/** The last hour of the afternoon, which is not what a person calls it. */
const LATE_AFTERNOON_FROM = 17 * 60

/**
 * What to call the part of the day the owner is in.
 *
 * **Display only.** The evening begins at 18:00 for every purpose the engine
 * has — which moves are eligible, which suit the hour, what protects tomorrow —
 * and none of that moves because of this function. Telling someone at five to
 * start winding down for the night would be worse than the thing being fixed
 * here.
 *
 * What is fixed is the word. "Saturday afternoon" at a quarter to six is
 * defensible by the clock and by the daylight, and is not what the owner read
 * when they looked at their phone. The last hour before the boundary reads as
 * the late afternoon it is, and nothing else changes.
 */
function blockWord(situation: Situation): string {
  if (situation.block !== 'afternoon') return BLOCK_WORDS[situation.block]
  const minutes = minutesIntoDay(localDateTimeAt(situation.at, situation.zone).timeOfDay)
  return minutes >= LATE_AFTERNOON_FROM ? 'late afternoon' : 'afternoon'
}

function weekdayOf(at: Instant, zone: TimeZoneId): string {
  return WEEKDAYS[localDateTimeAt(at, zone).isoWeekday]
}

function whenPhrase(at: Instant, situation: Situation): string {
  const day = localDateTimeAt(at, situation.zone).dayId
  if (day === situation.dayId) return 'today'
  // A calendar question, so it moves by local days rather than by 24 hours —
  // otherwise "yesterday" is wrong twice a year.
  if (day === localDayIdAt(addLocalDays(situation.at, -1, situation.zone), situation.zone)) {
    return 'yesterday'
  }
  return weekdayOf(at, situation.zone)
}

/**
 * Where the owner is, in one line.
 *
 * Section 6 calls this the current premise. It is assembled from what is
 * actually known — a clause is missing rather than hedged when the fact behind
 * it is missing, because "energy unknown" on a home screen is the app talking
 * about itself.
 */
export function describePremise(situation: Situation): string {
  const clauses: string[] = []
  const local = localDateTimeAt(situation.at, situation.zone)
  clauses.push(`${WEEKDAYS[local.isoWeekday]} ${blockWord(situation)}`)

  const debt = situation.capacity.sleepDebtHours
  const lastNight = situation.capacity.lastNightHours
  if (isUsable(debt) && debt.value >= 1) {
    clauses.push(`${describeHours(debt.value)} short on sleep`)
  } else if (isUsable(lastNight)) {
    clauses.push(`${describeHours(lastNight.value)} of sleep`)
  }

  const usable = situation.usableMinutes
  if (isUsable(usable)) clauses.push(`about ${Math.round(usable.value)} minutes free`)

  const child = situation.childPresent
  if (isUsable(child) && child.value) {
    const person = situation.entities
      .byKind('person')
      .find((entity) => entity.domain === DOMAIN.fatherhood)
    clauses.push(person === undefined ? 'she is here' : `${person.label} is here`)
  }

  return `${clauses.join(', ')}.`
}

/** The most recent thing that went wrong for this subject, if there is one. */
function lastRoughOutcome(
  situation: Situation,
  semantics: RecommendationSemantics,
): OutcomeRecord | undefined {
  let latest: OutcomeRecord | undefined
  for (const record of situation.view.history.effective) {
    if (record.kind !== 'outcome') continue
    if (record.sentiment !== 'worse') continue
    if (!record.entities.some((ref) => ref.id === semantics.subject.id)) continue
    if (latest === undefined || record.occurredAt > latest.occurredAt) latest = record
  }
  return latest
}

/**
 * Whether the reason is allowed to cite a fact at all.
 *
 * **The reason may only cite evidence the decision actually leaned on.**
 *
 * Without this rule the explanation reaches for whichever particular is nearest
 * and produces something that sounds like reasoning and is not. The case that
 * proved it: a walk winning on an ordinary morning, explained as "you are an
 * hour and a half down, which is not enough to sit still for" — a sleep figure,
 * on a move whose evidence is energy and soreness, where the shortfall
 * contributed nothing to it winning and would if anything argue the other way.
 * That is rationalising the winner after the fact, and it is worse than saying
 * less, because it invites the owner to trust a chain of reasoning that was
 * never used.
 *
 * The premise is deliberately not held to this. "Monday morning, an hour short
 * on sleep" is a true statement about the situation rather than a claim about
 * why this move won, and describing where the owner is does not require having
 * decided from it.
 */
function leanedOn(evaluation: Evaluation, concept: ConceptId): boolean {
  return evaluation.candidate.leansOn.includes(concept)
}

/**
 * The part of the day, when it is genuinely one of the reasons this won.
 *
 * Read off the ranking rather than assumed: `context-fit` is positive only when
 * the move actually suits this block, so a lab at midnight cannot claim the
 * hour is on its side. Same discipline as `leanedOn`, applied to a dimension
 * instead of a fact.
 */
function hourThatSuits(evaluation: Evaluation, situation: Situation): string | undefined {
  const fit = evaluation.dimensions.find((dimension) => dimension.name === 'context-fit')
  return fit !== undefined && fit.value > 0 ? blockWord(situation) : undefined
}

/**
 * Why this, now — in the owner's own particulars.
 *
 * Each branch reaches for a real value: how many hours, which topic, what went
 * wrong and when. A branch that cannot find a particular it is entitled to cite
 * says less rather than borrowing one from somewhere else.
 */
export function composeReason(
  evaluation: Evaluation,
  situation: Situation,
  entities: EntityIndex,
): string {
  return `${whyNow(evaluation, situation, entities)}${directionClause(evaluation, situation)}`
}

/**
 * The week's direction, said out loud when it is the reason this won.
 *
 * Section 21 requires the owner's own wording to stay visible, and section 64
 * caught the cost of leaving it silent: two histories that differed in whether
 * a direction was set at all were receiving word-for-word the same reason,
 * because the one thing that distinguished them was never spoken. It appears
 * only when the direction actually pulled this move to the front, which keeps
 * it from becoming a line that shows up under everything.
 */
function directionClause(evaluation: Evaluation, situation: Situation): string {
  const weekly = situation.direction.weekly
  if (weekly.state !== 'set') return ''
  if (weekly.category !== evaluation.candidate.semantics.domain) return ''
  return ` This week is about ${weekly.wording}.`
}

function whyNow(evaluation: Evaluation, situation: Situation, entities: EntityIndex): string {
  const semantics = evaluation.candidate.semantics
  const subject = entities.labelFor(semantics.subject) ?? ''
  const object = entities.labelFor(semantics.target.object) ?? subject

  switch (semantics.whyNow.trigger) {
    case 'deficit': {
      const debt = situation.capacity.sleepDebtHours
      const nights = situation.capacity.nightsSeen
      if (leanedOn(evaluation, CONCEPT.sleepHours) && isUsable(debt) && debt.value >= 1) {
        const span = nights <= 1 ? 'last night' : `the last ${nights} nights`
        return semantics.target.verb === 'recover'
          ? `You are ${describeHours(debt.value)} down over ${span}. ${capitalise(object)} will still be there tomorrow.`
          : `You are ${describeHours(debt.value)} down over ${span}.`
      }
      const energy = situation.capacity.energy
      if (isUsable(energy)) return 'There is not much left in the tank tonight.'
      return 'Rest is the thing running short.'
    }

    case 'recent-struggle': {
      const outcome = lastRoughOutcome(situation, semantics)
      if (outcome !== undefined) {
        // Named first, then what actually happened. An earlier version opened
        // with the date and quoted the note, which read well and never once
        // said what it was about — the failure in section 3, arriving through
        // composed prose rather than through a template.
        const detail = describeFactValue(outcome.observation, (ref) => entities.labelFor(ref))
        return `${capitalise(subject)} went badly ${whenPhrase(outcome.occurredAt, situation)} — ${lowerFirst(detail)}.`
      }
      return `${capitalise(subject)} did not go well last time.`
    }

    case 'goal-behind': {
      const goal = situation.direction.goals.find(
        (entry) => entry.goal.id === semantics.relatedGoal?.id,
      )
      if (goal !== undefined)
        return `${capitalise(goal.statement)} — and ${object} is the weak part.`
      return `${capitalise(object)} is the part that needs the reps.`
    }

    case 'opportunity-window': {
      const usable = situation.usableMinutes
      const time = isUsable(usable)
        ? ` and there are about ${Math.round(usable.value)} minutes`
        : ''
      return `${capitalise(subject)} is here${time}. That window closes on its own.`
    }

    case 'constraint-active': {
      const friction = situation.homeFriction
      if (isUsable(friction)) {
        // The stored value is whatever the owner wrote, which may already be a
        // whole sentence. Joining it to a clause would produce something
        // neither of you said, so it is set off rather than run together.
        const detail = describeFactValue(friction.value, (ref) => entities.labelFor(ref))
        return `${capitalise(detail)} — and it costs you the start of every evening.`
      }
      return `${capitalise(object)} is the small friction making the rest harder.`
    }

    case 'good-conditions': {
      /*
       * Only what this move actually won on.
       *
       * Two clauses have come out of here. The sleep shortfall went first: it
       * produced "you are an hour and a half down, which is not enough to sit
       * still for" on a move whose evidence is energy and soreness. "Nothing
       * more pressing is in the way" went second, and it is the subtler of the
       * two — it reads as a finding about the owner's life when it is a
       * statement about how little the engine could see. On the evening it was
       * caught there was exactly one candidate, and everything else the app
       * might have weighed was unknown or months stale.
       *
       * What is left is what the ranking can support: the reading the owner
       * gave, and the part of the day, which is a real contributor and is
       * checked here rather than assumed.
       */
      const hour = hourThatSuits(evaluation, situation)
      const energy = situation.capacity.energy
      if (leanedOn(evaluation, CONCEPT.energy) && isUsable(energy)) {
        if (energy.value >= 0.7) {
          return hour === undefined
            ? `Energy is good.`
            : `Energy is good, and the ${hour} suits ${object}.`
        }
        return hour === undefined
          ? `There is enough in the tank for ${object}.`
          : `There is enough in the tank for ${object}, and the ${hour} suits it.`
      }

      const soreness = situation.capacity.soreness
      if (leanedOn(evaluation, CONCEPT.soreness) && isUsable(soreness) && soreness.value <= 0.3) {
        return hour === undefined
          ? `Nothing is sore.`
          : `Nothing is sore, and the ${hour} suits ${object}.`
      }

      return `Conditions suit ${object} right now.`
    }

    case 'stale-evidence':
      return `Nothing has come in about ${object} for a while.`

    case 'nothing-better':
      return `Nothing else is pressing, and ${object} pays back tomorrow.`
  }
}

function capitalise(text: string): string {
  return text.length === 0 ? text : `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

function lowerFirst(text: string): string {
  return text.length === 0 ? text : `${text.charAt(0).toLowerCase()}${text.slice(1)}`
}

/**
 * The one thing that separated the winner from the next best move.
 *
 * Section 6 asks Now to be able to show the relevant tradeoff, and the owner's
 * version of the same request is sharper: if walking beats studying, resting or
 * doing nothing, the reason should make that understandable. So this is taken
 * from the arbitration rather than written to fit it — the dimension where the
 * winner most out-scored the runner-up, in a short phrase.
 *
 * These read as statements about the winning move on purpose. None of them
 * contains a pronoun: the row sits beside the move it beat, and "it" there is
 * genuinely ambiguous about which of the two is meant.
 */
export const AHEAD_BECAUSE: Record<DimensionName, string> = {
  'bottleneck-fit': 'Answers what is actually in the way.',
  'direction-fit': 'Closer to what the week is about.',
  'goal-fit': 'Serves the goal you set.',
  urgency: 'The more pressing of the two.',
  'immediate-benefit': 'Worth more tonight.',
  'next-day-effect': 'Pays back more tomorrow.',
  'opportunity-cost': 'Costs less of the evening.',
  friction: 'Easier to start.',
  'time-fit': 'Fits the time you have.',
  'capacity-fit': 'Fits what the body has tonight.',
  'context-fit': 'Better suited to the hour.',
  'recent-duplication': 'The other one came up recently.',
  'owner-preference': 'Closer to what you have said you want.',
  'follow-through': 'More likely to actually happen.',
  'direct-result': 'More likely to get all the way there.',
  uncertainty: 'Better supported by what is known.',
  protection: 'The other one would borrow against tomorrow.',
  advisor: 'What you wrote about the last attempt points here.',
}

export interface Explanation {
  /** The semantics with the composed reason written into them. */
  readonly semantics: RecommendationSemantics
  readonly rendered: RenderedRecommendation
  readonly premise: string
  /**
   * What the app has to say about the situation beyond the move itself, with
   * the label that honestly describes it.
   *
   * The label travels with the summary because it depends on the limiter kind:
   * a body that needs rest is in the way, a life area nobody has mentioned for
   * seven weeks is not. Two parallel fields would drift apart the first time
   * somebody rendered one without the other.
   */
  readonly limiter: { readonly label: string; readonly summary: string } | undefined
  /** The move this was chosen over, when there was a real contest. */
  readonly instead: string | undefined
  /** Why it beat that one — the dimension that most separated them. */
  readonly insteadBecause: string | undefined
  /**
   * What the owner's own outcomes contributed, when they contributed enough to
   * be worth saying. Absent on a move nothing has been learned about yet.
   */
  readonly restsOn: string | undefined
  /** The belief `restsOn` states, so the owner has something to disagree with. */
  readonly restsOnBelief: string | undefined
}

/** The dimension the winner most out-scored the runner-up on, as a phrase. */
function aheadBecause(chosen: Evaluation, runnerUp: Evaluation): string | undefined {
  const theirs = new Map(runnerUp.dimensions.map((entry) => [entry.name, entry]))
  let best: { name: DimensionName; gap: number; value: number } | undefined

  for (const mine of chosen.dimensions) {
    const other = theirs.get(mine.name)
    if (other === undefined) continue
    const gap = mine.value * mine.weight - other.value * other.weight
    if (gap <= 0) continue
    if (best === undefined || gap > best.gap) {
      best = { name: mine.name, gap, value: mine.value }
    }
  }

  if (best === undefined) return undefined

  // Winning on the bottleneck happens two ways, and they are not the same
  // claim. A restorative move addresses what is short; a light one wins by
  // asking less of it. Saying the second "answers what is in the way" would be
  // the explanation flattering the decision.
  if (best.name === 'bottleneck-fit' && best.value <= 0) {
    return 'Asks less of what is short right now.'
  }

  return AHEAD_BECAUSE[best.name]
}

export type ExplanationResult =
  | { readonly ok: true; readonly explanation: Explanation }
  | { readonly ok: false; readonly problems: readonly string[] }

export function explain(
  chosen: Evaluation,
  runnerUp: Evaluation | undefined,
  situation: Situation,
): ExplanationResult {
  const entities = situation.entities
  const base = chosen.candidate.semantics
  const semantics: RecommendationSemantics = {
    ...base,
    whyNow: { ...base.whyNow, summary: composeReason(chosen, situation, entities) },
  }

  const rendered = renderRecommendation(semantics, entities)
  if (!rendered.ok) {
    return { ok: false, problems: rendered.issues.map((issue) => issue.problem) }
  }

  /*
   * What it was chosen over, and why.
   *
   * Any real runner-up now, not only one in a different life area — the second
   * subnetting move is as much a tradeoff as a walk would be, and an earlier
   * version silently dropped it for sharing a domain with the winner.
   */
  let instead: string | undefined
  let insteadBecause: string | undefined
  if (runnerUp !== undefined) {
    const other = renderRecommendation(runnerUp.candidate.semantics, entities)
    if (other.ok) {
      instead = other.rendered.sentence
      insteadBecause = aheadBecause(chosen, runnerUp)
    }
  }

  /*
   * What is in the way, but only when the move is not already the answer to it.
   *
   * When recovery is the limiter and the move is recovery, the reason has just
   * said so in the owner's own numbers — printing "about 9 hours short of rest"
   * underneath "you are 9 hours down over the last 3 nights" is section 61's
   * repeated boilerplate, on the one screen with the least room for it. The
   * limiter earns its line when the app chose something that does not address
   * it, which is exactly when the owner would want to know.
   *
   * The trace keeps the limiter either way; this is a decision about Now.
   */
  const limiter = situation.limiter
  const alreadySaid = limiter !== undefined && limiter.domain === semantics.domain

  /*
   * What the owner's own outcomes contributed, shown where they were used.
   *
   * Section 62 requires a learned pattern to be correctable, and a belief the
   * owner cannot see is a belief they cannot correct. Putting it beside the
   * decision it moved — rather than on a screen of its own that nobody visits —
   * is what makes the correction reachable at the moment it occurs to them.
   *
   * It appears only when the learning actually moved something. A line saying
   * "this rests on nothing yet" would be the app talking about itself, which is
   * what DEF-0005 removed from this screen once already.
   */
  const learned = situation.learning.effectFor(semantics.target.verb, situation.context)

  return {
    ok: true,
    explanation: {
      semantics,
      rendered: rendered.rendered,
      premise: describePremise(situation),
      limiter:
        alreadySaid || limiter === undefined
          ? undefined
          : { label: limiter.label, summary: limiter.summary },
      instead,
      insteadBecause,
      restsOn: learned.summary,
      restsOnBelief:
        learned.summary === undefined ? undefined : beliefKey('effect', semantics.target.verb),
    },
  }
}
