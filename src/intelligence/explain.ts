import type { EntityIndex } from '../domain/entities'
import { isUsable } from '../domain/knowledge'
import { describeFactValue, type OutcomeRecord } from '../domain/records'
import {
  renderRecommendation,
  type RecommendationSemantics,
  type RenderedRecommendation,
} from '../domain/recommendation'
import { DOMAIN } from '../domain/domains'
import {
  addLocalDays,
  localDateTimeAt,
  localDayIdAt,
  type Instant,
  type IsoWeekday,
  type TimeZoneId,
} from '../domain/time'
import type { Evaluation } from './evaluate'
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
  clauses.push(`${WEEKDAYS[local.isoWeekday]} ${BLOCK_WORDS[situation.block]}`)

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
 * Why this, now — in the owner's own particulars.
 *
 * Each branch reaches for a real value: how many hours, which topic, what went
 * wrong and when. A branch that cannot find its particulars falls back to the
 * next most specific thing it has rather than to a pleasant generality.
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
      if (isUsable(debt) && debt.value >= 1) {
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
      // Reach for whichever particular is actually known. A line that reads the
      // same for everyone is the failure section 64 names, and "conditions are
      // decent" reads the same for everyone.
      const energy = situation.capacity.energy
      if (isUsable(energy) && energy.value >= 0.7) {
        return `Energy is good and nothing more pressing is in the way.`
      }
      const debt = situation.capacity.sleepDebtHours
      if (isUsable(debt) && debt.value >= 1) {
        return `You are ${describeHours(debt.value)} down, which is not enough to sit still for.`
      }
      const lastNight = situation.capacity.lastNightHours
      if (isUsable(lastNight)) {
        return `${capitalise(describeHours(lastNight.value))} behind you and nothing more pressing.`
      }
      return `Nothing more pressing is in the way, and ${object} is the cheap one.`
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

export interface Explanation {
  /** The semantics with the composed reason written into them. */
  readonly semantics: RecommendationSemantics
  readonly rendered: RenderedRecommendation
  readonly premise: string
  /** What is in the way, in ordinary words. Absent when nothing is. */
  readonly limiter: string | undefined
  /** The move this was chosen over, when there was a real contest. */
  readonly instead: string | undefined
  /** Named only when not knowing it could change the answer. */
  readonly unknown: string | undefined
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

  let instead: string | undefined
  if (runnerUp !== undefined && runnerUp.candidate.semantics.domain !== semantics.domain) {
    const other = renderRecommendation(runnerUp.candidate.semantics, entities)
    if (other.ok) instead = other.rendered.sentence
  }

  // Named only when the gap could actually change the answer — section 12 asks
  // for missing information to be surfaced when it is material, and not
  // otherwise. A home screen listing everything the app does not know is a home
  // screen about the app.
  const missing = chosen.candidate.leansOn
    .filter((concept) => !isUsable(situation.view.facts.knowledgeFor(concept)))
    .map((concept) => situation.concepts.definitionFor(concept).label.toLowerCase())

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

  return {
    ok: true,
    explanation: {
      semantics,
      rendered: rendered.rendered,
      premise: describePremise(situation),
      limiter: alreadySaid ? undefined : limiter?.summary,
      instead,
      unknown: missing.length === 0 ? undefined : missing.join(', '),
    },
  }
}
