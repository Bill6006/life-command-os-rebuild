import { createRecordFactory } from '../domain/build'
import type { EntityIndex } from '../domain/entities'
import { newRecordId, type RecordId } from '../domain/ids'
import { renderRecommendation, type ActionVerb } from '../domain/recommendation'
import {
  bearsConcept,
  type FactValue,
  type OutcomeAspect,
  type OutcomeRecord,
  type Provenance,
} from '../domain/records'
import {
  addLocalDaysToDayId,
  civilDateFromDayId,
  endOfLocalDay,
  instantAtLocal,
  localDateTimeAt,
  type Instant,
  type TimeZoneId,
} from '../domain/time'
import type { ConceptId, DueWindow } from '../domain/windows'
import type { MemoryView } from '../memory/view'
import { collectEpisodes, type Episode } from './lifecycle'
import { profileFor } from './moves'

/**
 * Outcome windows and outcome capture (canonical plan section 20).
 *
 * > Sleep/recovery actions may need next-morning evaluation.
 *
 * That one line is the whole reason the windows exist. Asking at 23:05 whether
 * an early night worked would collect an answer about intent, and an answer
 * about intent recorded as an outcome is worse than no answer at all — it looks
 * exactly like evidence and is not.
 *
 * ## Three kinds of evidence, and one question at a time — DEF-0020
 *
 * The first version of this file asked one question per episode and offered one
 * answer set: better, same or worse. It produced "Did the kitchen get cleared?"
 * answered with "About the same", because the prompt came from the renderer's
 * conversational follow-up while the answers came from the learning model, and
 * nothing required the two to be about the same thing.
 *
 * Underneath the mismatched copy was a collapse. **Completion, direct result,
 * downstream effect and comfort are four different facts**, and the app can
 * only learn what it asks about:
 *
 * - **completion** is the lifecycle event — the attempt was carried out;
 * - **result** is whether the intended end state occurred, which fifteen
 *   minutes of clearing may not reach;
 * - **effect** is what it was worth afterwards;
 * - **comfort** is how it felt, where the experience is itself the fact.
 *
 * Which of these a move can produce is declared beside its profile, by one
 * test: does the sentence name an end state, or only an activity? They are
 * asked in that order, one at a time, and **a result of "not at all" ends the
 * sequence** — asking how the evening went after clearing the kitchen, on an
 * evening when the kitchen was never cleared, would teach the app something
 * false about clearing kitchens.
 *
 * ## Nothing here reads a clock
 *
 * "A result is now due" is a comparison, not an event. `dueOutcomes(view,
 * moment)` is a pure function of the moment it is given, and `nextOutcomeDueAt`
 * exists so the surface can set one timer rather than polling: the kernel works
 * out *when*, and the UI is the only thing that knows what time it really is.
 *
 * ## An expiry, because a stale question collects a made-up answer
 *
 * Every window closes. Asking on Thursday how Tuesday's walk went is asking
 * someone to invent something, and section 20's "outcome unknown" is a real and
 * acceptable state.
 */

export const OUTCOME_PROVENANCE: Provenance = { source: 'owner', writtenBy: 'now' }

/** When the morning after a move begins, owner-local. */
const MORNING_HOUR = 5

/** Late-night belongs to the evening before it, so its morning is the same day. */
const STILL_LAST_NIGHT_BEFORE_HOUR = 4

function atLocalHour(at: Instant, zone: TimeZoneId, addDays: number, hour: number): Instant {
  const local = localDateTimeAt(at, zone)
  const day = addLocalDaysToDayId(local.dayId, addDays)
  return instantAtLocal({ ...civilDateFromDayId(day), hour, minute: 0, second: 0 }, zone)
}

/**
 * When this episode's result can be asked about, and until when.
 *
 * Undefined when there is nothing to ask about yet: an episode is only worth a
 * question once the owner says the attempt happened. A move that was declined
 * has no result, and one that was started and never finished is still a
 * lifecycle question — Now already has the buttons for it, so asking a second
 * time in a different shape would be nagging.
 */
export function outcomeWindowFor(episode: Episode, zone: TimeZoneId): DueWindow | undefined {
  if (episode.state !== 'completed') return undefined
  const settled = episode.settledAt
  if (settled === undefined) return undefined

  const timing = profileFor(episode.semantics.target.verb).outcome

  if (timing.when === 'next-morning') {
    const local = localDateTimeAt(settled, zone)
    // Finishing at half past midnight is finishing last night, so the morning
    // that judges it is this one rather than tomorrow's.
    const days = local.hour < STILL_LAST_NIGHT_BEFORE_HOUR ? 0 : 1
    const earliest = atLocalHour(settled, zone, days, MORNING_HOUR)
    return {
      kind: 'due',
      earliest,
      latest: endOfLocalDay(localDateTimeAt(earliest, zone).dayId, zone),
    }
  }

  const earliest = (settled + timing.after * 60_000) as Instant
  // Through the end of the following owner-local day: long enough that a phone
  // picked up the next evening still catches it, short enough that the answer
  // is still a memory rather than a reconstruction.
  const local = localDateTimeAt(earliest, zone)
  return {
    kind: 'due',
    earliest,
    latest: endOfLocalDay(addLocalDaysToDayId(local.dayId, 1), zone),
  }
}

export interface PendingOutcome {
  readonly episode: Episode
  readonly window: DueWindow
  /** The questions still unanswered, in the order they should be asked. */
  readonly questions: readonly OutcomeQuestion[]
}

/**
 * Episodes whose result is due now and has not been given, oldest first.
 *
 * Oldest first so a backlog clears in the order it happened, which is also the
 * order the owner remembers it in.
 */
export function dueOutcomes(
  view: MemoryView,
  moment: { readonly now: Instant; readonly zone: TimeZoneId },
  entities: EntityIndex,
): readonly PendingOutcome[] {
  const out: PendingOutcome[] = []

  for (const episode of collectEpisodes(view, moment.zone)) {
    const window = outcomeWindowFor(episode, moment.zone)
    if (window === undefined) continue
    if (moment.now < window.earliest || moment.now > window.latest) continue

    const questions = unansweredQuestions(
      episode,
      entities,
      readingAwaitedBy(episode, view, moment.zone) !== undefined,
    )
    if (questions.length === 0) continue
    out.push({ episode, window, questions })
  }

  return out.sort((a, b) => a.window.earliest - b.window.earliest)
}

/** The one to put on screen, or nothing. */
export function nextDueOutcome(
  view: MemoryView,
  moment: { readonly now: Instant; readonly zone: TimeZoneId },
  entities: EntityIndex,
): PendingOutcome | undefined {
  return dueOutcomes(view, moment, entities)[0]
}

/**
 * When the next window opens, for a surface that wants to wake up for it.
 *
 * The engine says when; the surface is the only thing allowed to compare that
 * to a real clock.
 */
export function nextOutcomeDueAt(
  view: MemoryView,
  moment: { readonly now: Instant; readonly zone: TimeZoneId },
  entities: EntityIndex,
): Instant | undefined {
  let soonest: Instant | undefined

  for (const episode of collectEpisodes(view, moment.zone)) {
    const window = outcomeWindowFor(episode, moment.zone)
    if (window === undefined) continue
    if (window.earliest <= moment.now) continue
    if (moment.now > window.latest) continue
    if (
      unansweredQuestions(
        episode,
        entities,
        readingAwaitedBy(episode, view, moment.zone) !== undefined,
      ).length === 0
    ) {
      continue
    }
    if (soonest === undefined || window.earliest < soonest) soonest = window.earliest
  }

  return soonest
}

// ---------------------------------------------------------------------------
// What an answer is worth
// ---------------------------------------------------------------------------

/**
 * Answers are stored as the step the owner picked, not as the number it is
 * currently worth.
 *
 * The record says which of four things they said; the tables below say what
 * that is worth today. Storing the worth instead would freeze this phase's
 * calibration into history, so re-tuning the scale would silently mean
 * something different for old evenings than for new ones.
 */
export const RESULT_STEPS = 2
export const EFFECT_STEPS = 3
export const COMFORT_STEPS = 2

/** How far the intended end state got. Prior is 1 — a move achieves its aim. */
export const RESULT_VALUE: readonly number[] = [0, 0.5, 1]

/**
 * What an effect answer is worth, on the same 0–1 scale as a move profile.
 *
 * **Absolute worth, not a comparison.** The first version used "Better than
 * usual / About the same / Worse" against absolute values, so one tap meaning
 * "it made no difference" pulled a move with a 0.8 prior down, left one at 0.4
 * exactly where it was, and pushed one at 0.05 up. A relative judgement written
 * into an absolute scale moves different moves in different directions.
 *
 * Four steps rather than three because harm is not the same evidence as no
 * help: a walk that aggravated soreness and a walk that did nothing much should
 * not teach the same thing. The scale has no room below zero, so the ranking
 * treats harm as worthless — but the record keeps them apart, which is what
 * lets the owner see the difference and correct it.
 */
export const EFFECT_VALUE: readonly number[] = [0, 0.15, 0.5, 0.85]

/** How hard it felt, as friction: higher is harder, same scale as the profile. */
export const COMFORT_FRICTION: readonly number[] = [0.85, 0.45, 0.1]

function stepOf(value: FactValue, of: number): number | undefined {
  if (value.type !== 'scale' || value.of !== of) return undefined
  if (!Number.isInteger(value.value) || value.value < 0 || value.value > of) return undefined
  return value.value
}

export function resultValueOf(observation: FactValue): number | undefined {
  const step = stepOf(observation, RESULT_STEPS)
  return step === undefined ? undefined : RESULT_VALUE[step]
}

export function effectValueOf(observation: FactValue): number | undefined {
  const step = stepOf(observation, EFFECT_STEPS)
  return step === undefined ? undefined : EFFECT_VALUE[step]
}

export function comfortFrictionOf(observation: FactValue): number | undefined {
  const step = stepOf(observation, COMFORT_STEPS)
  return step === undefined ? undefined : COMFORT_FRICTION[step]
}

// ---------------------------------------------------------------------------
// The questions
// ---------------------------------------------------------------------------

export interface OutcomeAnswer {
  readonly id: string
  readonly label: string
  readonly observation: FactValue
  /**
   * Present on an effect answer and absent on the other two, and the
   * restriction is load-bearing rather than tidy: `roughOutcomesFor` treats a
   * `worse` sentiment as "this topic went badly", so a *result* of "not at all"
   * wearing that flag would fire the weak-topic generator on an evening that
   * says nothing whatever about the topic.
   */
  readonly sentiment?: 'better' | 'same' | 'worse'
}

export interface OutcomeQuestion {
  readonly aspect: OutcomeAspect
  readonly prompt: string
  readonly answers: readonly OutcomeAnswer[]
}

function scale(step: number, of: number): FactValue {
  return { type: 'scale', value: step, of }
}

/**
 * The four levels an effect can land on.
 *
 * `sentiment` summarises the direction for readers that only need three: it
 * helped, it did nothing, it hurt. "Not much" is `same` because that is exactly
 * what it means — no change — and calling it `worse` would make every flat
 * evening look like a bad one.
 */
const EFFECT_ANSWERS: readonly OutcomeAnswer[] = [
  {
    id: 'real',
    label: 'A real difference',
    observation: scale(3, EFFECT_STEPS),
    sentiment: 'better',
  },
  {
    id: 'some',
    label: 'Some difference',
    observation: scale(2, EFFECT_STEPS),
    sentiment: 'better',
  },
  { id: 'little', label: 'Not much', observation: scale(1, EFFECT_STEPS), sentiment: 'same' },
  { id: 'harm', label: 'Backfired', observation: scale(0, EFFECT_STEPS), sentiment: 'worse' },
]

const COMFORT_ANSWERS: readonly OutcomeAnswer[] = [
  { id: 'easy', label: 'Easy', observation: scale(2, COMFORT_STEPS) },
  { id: 'awkward', label: 'A bit awkward', observation: scale(1, COMFORT_STEPS) },
  { id: 'hard', label: 'Hard work', observation: scale(0, COMFORT_STEPS) },
]

function resultAnswers(all: string, part: string, none: string): readonly OutcomeAnswer[] {
  return [
    { id: 'all', label: all, observation: scale(2, RESULT_STEPS) },
    { id: 'part', label: part, observation: scale(1, RESULT_STEPS) },
    { id: 'none', label: none, observation: scale(0, RESULT_STEPS) },
  ]
}

const HOW_FAR = resultAnswers('Completely', 'Partly', 'Not at all')

interface Parts {
  readonly subject: string
  readonly object: string
  readonly person: string | undefined
}

interface AspectQuestion {
  prompt(parts: Parts): string
  readonly answers: readonly OutcomeAnswer[]
}

/**
 * What to ask about each move, per aspect.
 *
 * Two rules hold across the whole table, and both are swept rather than
 * remembered. **Every prompt names its subject** — D-039's rule, which G-001
 * applies to recommendations and nothing applied to questions until now. And
 * **no prompt is a yes/no question**, because every answer set here is graded:
 * "Did the kitchen get cleared?" offered against four levels of difference is
 * the defect this table exists to remove.
 *
 * The prompts are written per verb rather than composed from a pattern. A
 * pattern general enough to cover a lab, a daughter and a night's sleep would
 * produce a sentence nobody would say out loud, which is section 4.6's whole
 * point: a specific ordinary sentence beats an elegant generic one.
 */
const OUTCOME_QUESTIONS: Record<ActionVerb, Partial<Record<OutcomeAspect, AspectQuestion>>> = {
  'recall-practice': {
    effect: {
      prompt: ({ object }) => `How much did the session do for ${object}?`,
      answers: EFFECT_ANSWERS,
    },
  },
  'review-weak-topic': {
    effect: {
      prompt: ({ object }) => `How much did going back over ${object} help?`,
      answers: EFFECT_ANSWERS,
    },
  },
  'hands-on-lab': {
    result: {
      prompt: ({ object }) => `How much of the ${object} lab came together?`,
      answers: HOW_FAR,
    },
  },
  'protect-sleep': {
    effect: {
      prompt: ({ object }) => `How much did ${object} do for your sleep?`,
      answers: EFFECT_ANSWERS,
    },
  },
  'wind-down': {
    effect: {
      prompt: ({ object }) => `How much did ${object} do for your sleep?`,
      answers: EFFECT_ANSWERS,
    },
  },
  recover: {
    effect: {
      prompt: ({ object }) => `How much did skipping ${object} do for your rest?`,
      answers: EFFECT_ANSWERS,
    },
  },
  'ease-off': {
    effect: {
      prompt: ({ object }) => `How much did ${object} do for the rest of the day?`,
      answers: EFFECT_ANSWERS,
    },
  },
  'time-with': {
    effect: {
      prompt: ({ object }) => `How much did the time with ${object} do for you both?`,
      answers: EFFECT_ANSWERS,
    },
  },
  'growth-opportunity': {
    result: {
      prompt: ({ object, person }) => `How far did ${person ?? ''} get with ${object}?`,
      // "Not today" rather than "Did not manage": section 4.4 — the app does
      // not grade a five-year-old, and the owner should not have to either.
      answers: resultAnswers('All the way', 'Part of the way', 'Not today'),
    },
  },
  'reach-out': {
    result: {
      prompt: ({ object }) => `What came back from ${object}?`,
      answers: resultAnswers('A proper reply', 'A brief one', 'Nothing back'),
    },
    comfort: {
      prompt: ({ object }) => `How did reaching out to ${object} feel?`,
      answers: COMFORT_ANSWERS,
    },
  },
  'start-conversation': {
    result: {
      prompt: ({ object }) => `How much of a conversation happened at ${object}?`,
      answers: resultAnswers('A real one', 'A few words', 'None at all'),
    },
    comfort: {
      prompt: ({ object }) => `How did starting a conversation at ${object} feel?`,
      answers: COMFORT_ANSWERS,
    },
  },
  'reset-space': {
    result: {
      prompt: ({ object }) => `How much of ${object} got cleared?`,
      answers: HOW_FAR,
    },
    effect: {
      prompt: ({ object }) => `How much did clearing ${object} do for the evening?`,
      answers: EFFECT_ANSWERS,
    },
  },
  'handle-money-item': {
    result: {
      prompt: ({ object }) => `How much of ${object} got dealt with?`,
      answers: HOW_FAR,
    },
  },
  move: {
    effect: {
      prompt: ({ object }) => `How much did ${object} do for you?`,
      answers: EFFECT_ANSWERS,
    },
  },
  hold: {},
}

/**
 * What to ask about an episode, in order, skipping anything already answered.
 *
 * A recommendation whose subject no longer resolves produces no question at
 * all, for the same reason it produces no sentence (D-018).
 */
export function outcomeQuestionsFor(
  episode: Episode,
  entities: EntityIndex,
): readonly OutcomeQuestion[] {
  const semantics = episode.semantics
  const rendered = renderRecommendation(semantics, entities)
  if (!rendered.ok) return []

  const subject = entities.labelFor(semantics.subject)
  const object = entities.labelFor(semantics.target.object)
  if (subject === undefined || object === undefined) return []

  const parts: Parts = {
    subject,
    object,
    person: entities.linked(semantics.subject.id, 'about-person')?.label,
  }

  const table = OUTCOME_QUESTIONS[semantics.target.verb]
  const out: OutcomeQuestion[] = []
  for (const aspect of profileFor(semantics.target.verb).aspects) {
    const question = table[aspect]
    if (question === undefined) continue
    out.push({ aspect, prompt: question.prompt(parts), answers: question.answers })
  }
  return out
}

/** Which aspects this episode has an answer for. */
export function answeredAspects(episode: Episode): ReadonlySet<OutcomeAspect> {
  return new Set(episode.outcomes.map((outcome) => outcome.aspect))
}

/**
 * Whether the intended end state was reached, if the owner has said.
 *
 * Undefined means unanswered, which is different from `0` — nobody has said the
 * kitchen is still buried, they have said nothing.
 */
export function resultReached(episode: Episode): number | undefined {
  for (const outcome of episode.outcomes) {
    if (outcome.aspect !== 'result') continue
    return resultValueOf(outcome.observation)
  }
  return undefined
}

/**
 * Whether this episode's effect is one the app would rather work out.
 *
 * Section 8 puts evidence normal life produces above asking, and the morning
 * after an early night there is a better question available than the one this
 * file would otherwise put on screen. "How much did winding down do for your
 * sleep?" asks the owner to grade something; "how much sleep did you actually
 * get?" asks him a fact, and the grade falls out of the answer.
 *
 * So when a reading would settle this and the reading is not in yet, the
 * effect question is held back — and `guide.ts` asks for the reading instead.
 * This does not raise the number of things asked for: it swaps one for a
 * better one, which is what "adaptive question selection" is supposed to mean.
 *
 * The reading having *arrived* is a different case and is handled elsewhere:
 * `derived.ts` writes the answer, and there is nothing left to ask.
 */
export function readingAwaitedBy(
  episode: Episode,
  view: MemoryView,
  zone: TimeZoneId,
): ConceptId | undefined {
  const profile = profileFor(episode.semantics.target.verb)
  const measures = profile.measures
  if (measures === undefined) return undefined
  if (profile.outcome.when !== 'next-morning') return undefined
  if (!profile.aspects.includes('effect')) return undefined

  const window = outcomeWindowFor(episode, zone)
  if (window === undefined) return undefined

  for (const record of view.history.effective) {
    if (!bearsConcept(record)) continue
    if (record.concept !== measures) continue
    if (record.occurredAt < window.earliest || record.occurredAt > window.latest) continue
    // The reading is in, so nothing is being waited for.
    return undefined
  }
  return measures
}

function unansweredQuestions(
  episode: Episode,
  entities: EntityIndex,
  awaiting: boolean,
): readonly OutcomeQuestion[] {
  const answered = answeredAspects(episode)
  /*
   * A result of "not at all" ends the sequence.
   *
   * "How much did clearing the kitchen do for the evening?" on an evening when
   * the kitchen was never cleared has no honest answer, and whichever one the
   * owner picked would be recorded as evidence about clearing kitchens. It also
   * saves a tap on the evening they least want to be asked twice.
   */
  const reached = resultReached(episode)
  const stopped = reached === 0

  return outcomeQuestionsFor(episode, entities).filter((question) => {
    if (answered.has(question.aspect)) return false
    if (stopped && question.aspect === 'effect') return false
    // Held back while a better question is available for the same fact.
    if (awaiting && question.aspect === 'effect') return false
    return true
  })
}

export interface OutcomeMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  /** The real clock, distinct from the moment being reasoned about (D-037). */
  readonly recordedAt?: Instant
}

/**
 * An answer, as a canonical record.
 *
 * Section 60: "written data must have a read path". This lands as an outcome
 * against the recommendation it is about, resolved by the same history fold as
 * every other record, and read back by `learning.ts`. There is no side channel.
 */
export function outcomeRecord(
  episode: Episode,
  aspect: OutcomeAspect,
  answer: OutcomeAnswer,
  moment: OutcomeMoment,
  id: RecordId = newRecordId(),
): OutcomeRecord {
  const build = createRecordFactory({ zone: moment.zone, provenance: OUTCOME_PROVENANCE })
  const semantics = episode.semantics
  return build(
    'outcome',
    {
      occurredAt: moment.now,
      ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
      id,
      domains: [semantics.domain],
      entities: [semantics.subject, semantics.target.object],
    },
    {
      about: episode.recommendation,
      aspect,
      observation: answer.observation,
      ...(answer.sentiment === undefined ? {} : { sentiment: answer.sentiment }),
    },
  )
}

/** Every question the catalogue can produce, for the class-wide sweeps. */
export function everyOutcomeQuestion(): readonly {
  readonly verb: ActionVerb
  readonly aspect: OutcomeAspect
  readonly question: AspectQuestion
}[] {
  const out: { verb: ActionVerb; aspect: OutcomeAspect; question: AspectQuestion }[] = []
  for (const [verb, table] of Object.entries(OUTCOME_QUESTIONS)) {
    for (const [aspect, question] of Object.entries(table)) {
      out.push({
        verb: verb as ActionVerb,
        aspect: aspect as OutcomeAspect,
        question: question as AspectQuestion,
      })
    }
  }
  return out
}
