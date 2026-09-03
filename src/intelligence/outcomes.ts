import { createRecordFactory } from '../domain/build'
import type { EntityIndex } from '../domain/entities'
import { newRecordId, type RecordId } from '../domain/ids'
import { renderRecommendation, type ActionVerb } from '../domain/recommendation'
import {
  bearsConcept,
  factValuesEqual,
  type FactValue,
  type HelpLevel,
  type OccasionContext,
  type OccasionSetting,
  type OutcomeAspect,
  type OutcomeRecord,
  type Provenance,
} from '../domain/records'
import {
  addLocalDaysToDayId,
  civilDateFromDayId,
  endOfLocalDay,
  startOfLocalDay,
  instantAtLocal,
  localDateTimeAt,
  type Instant,
  type TimeZoneId,
} from '../domain/time'
import type { ConceptId, DueWindow } from '../domain/windows'
import type { MemoryView } from '../memory/view'
import { collectEpisodes, type Episode } from './lifecycle'
import { profileFor, type OutcomeTiming } from './moves'

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
/** A week, in days, so `weekly` says seven in one place. */
const DAYS_IN_A_WEEK = 7

/**
 * How long a deferred outcome question stays open.
 *
 * The same seven days a course reflection stays open for, from the same
 * argument: a phone picked up a few evenings later still catches it, and after
 * that the answer is a reconstruction rather than a memory. Held here beside
 * the window it shapes; `progress.ts` holds the reflections' own copy of it,
 * and `tests/synthetic/reach-horizon.test.ts` asserts the two agree.
 */
const REFLECTION_OPEN_FOR_DAYS = 7

export function outcomeWindowFor(episode: Episode, zone: TimeZoneId): DueWindow | undefined {
  if (episode.state !== 'completed') return undefined
  const settled = episode.settledAt
  if (settled === undefined) return undefined
  return windowForTiming(settled, profileFor(episode.semantics.target.verb).outcome, zone)
}

/**
 * The window itself, from a moment and a horizon — S1a.
 *
 * Separated from {@link outcomeWindowFor} so that the horizon can be tested at
 * every value the union holds rather than only at the two the shipped
 * catalogue happens to declare. `multi-day` and `weekly` have no profile yet —
 * their consumer is AUD-0009 at routing 93 — and a widened enum whose new
 * values nothing can exercise is exactly the inert declaration this phase
 * exists to stop shipping.
 */
export function windowForTiming(
  settled: Instant,
  timing: OutcomeTiming,
  zone: TimeZoneId,
): DueWindow {
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

  /*
   * The longer horizons, built on the shape that already works — S1a.
   *
   * `CourseReflection` opens a question three days after a course ends and
   * another at ten, keyed on an owner-local day and open for seven. That is a
   * proven multi-day deferred-question mechanism with owner-facing copy that
   * has been through QA, and D-178's rule — *one name for a thing, in the layer
   * every surface can reach* — says to generalise it rather than to build a
   * second one. So these open on a day rather than at an instant, and stay open
   * for the same week a reflection does.
   *
   * `weekly` is `multi-day` with the count fixed at seven, and it is a separate
   * value rather than `afterDays: 7` because *"judge this after a week"* is a
   * claim about the kind of thing the move is, and a number is not.
   */
  if (timing.when === 'multi-day' || timing.when === 'weekly') {
    const days = timing.when === 'weekly' ? DAYS_IN_A_WEEK : (timing.afterDays ?? DAYS_IN_A_WEEK)
    const opensOn = addLocalDaysToDayId(localDateTimeAt(settled, zone).dayId, days)
    return {
      kind: 'due',
      earliest: atLocalHour(startOfLocalDay(opensOn, zone), zone, 0, MORNING_HOUR),
      latest: endOfLocalDay(addLocalDaysToDayId(opensOn, REFLECTION_OPEN_FOR_DAYS), zone),
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
  /**
   * A state reading the app wants instead of a judgment (D-089).
   *
   * When this is set, the surface asks the registry's own question for the
   * concept — "how much energy have you got left?" — and writes an ordinary
   * observation. It is not an outcome and it is not about the move: it is a
   * reading of how the owner is, taken at a moment that happens to be after
   * something. What the two readings mean together is the app's job to work
   * out (`association.ts`), and asking him to do that instead is QA-A1.
   *
   * Never set at the same time as an effect question. A move that declares an
   * observable state dimension is never graded by its owner.
   */
  readonly reading: ConceptId | undefined
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
    const reading = stateReadingDueFor(episode, view, moment.zone)
    // An episode with nothing to grade may still have a reading to take.
    if (questions.length === 0 && reading === undefined) continue
    out.push({ episode, window, questions, reading })
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
    const wanted =
      unansweredQuestions(
        episode,
        entities,
        readingAwaitedBy(episode, view, moment.zone) !== undefined,
      ).length > 0 || stateReadingDueFor(episode, view, moment.zone) !== undefined
    if (!wanted) continue
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
  /**
   * The scaffolding level this label states — AUD-0017.
   *
   * Only on the growth result, where "how far did she get" and "how much did I
   * do" are the same question asked from the two ends. Storing it explicitly
   * rather than deriving it from the scale step is what stops a later reader
   * inferring an answer the owner never gave: the step is a coarse ordinal and
   * the help level is a named thing, and the two are only equal because these
   * three buttons were written to make them equal.
   */
  readonly help?: HelpLevel
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
  'lighten-the-day': {
    // Asked the following morning, which is why it is in the past tense and
    // about a whole day rather than about the hours after it.
    effect: {
      prompt: ({ object }) => `How much did ${object} do for yesterday?`,
      answers: EFFECT_ANSWERS,
    },
  },
  'time-with': {
    effect: {
      prompt: ({ object }) => `How much did the time with ${object} do for you both?`,
      answers: EFFECT_ANSWERS,
    },
  },
  /*
   * The one question that changed shape in Phase 82 — AUD-0017.
   *
   * It used to ask how far she got, against "All the way / Part of the way /
   * Not today". Those are answers about *her*, and section 4.4 asks the framing
   * to sit on the parent — which is exactly what the scaffolding construct
   * does: the adult's assistance varies with the child's competence, and
   * responsibility transfers as she masters each component (Wood, Bruner &
   * Ross, 1976).
   *
   * So the three answers name what **he** did. The scale underneath is
   * unchanged, step for step, which is what lets every occasion recorded before
   * this phase still parse and still count toward three.
   */
  'growth-opportunity': {
    result: {
      prompt: ({ object, person }) => `How did ${person ?? ''} get on with ${object}?`,
      answers: [
        { id: 'all', label: 'On her own', observation: scale(2, RESULT_STEPS), help: 'on-her-own' },
        {
          id: 'part',
          label: 'With a small prompt',
          observation: scale(1, RESULT_STEPS),
          help: 'a-small-prompt',
        },
        { id: 'none', label: 'Needed me', observation: scale(0, RESULT_STEPS), help: 'needed-me' },
      ],
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
  /*
   * The `next-morning` condition is gone — AUD-0042.
   *
   * It was doing two jobs. *"This outcome is judged in the morning"* and *"this
   * outcome can be observed rather than asked"* became one condition, and they
   * are not the same: a same-block outcome can be observed too, and what it
   * needs is a reading taken afterwards **inside its own window** rather than a
   * horizon that happens to be tomorrow's.
   *
   * The window check below is what replaces it, and it always was the real
   * condition: `outcomeWindowFor` already knows when this move can be judged, at
   * whichever horizon it declares.
   */
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

  /*
   * And nothing is waited for that will not be asked.
   *
   * A reading from *outside* the window can still leave the concept currently
   * known — an answer given at half past four is about the night before last,
   * and is fresh until tomorrow. In that case the guide will not ask (it does
   * not ask for what it already has, which is DEF-0005), so holding this
   * question back would hold it back forever: no reading, no question, and a
   * window that closes with nothing collected.
   *
   * The rule this file is enforcing is a swap, not a suppression. If the better
   * question is not going to be asked, the ordinary one stands.
   */
  return view.facts.get(measures)?.worthAsking === true ? measures : undefined
}

/**
 * The state reading this episode's window wants, if the guide will not ask.
 *
 * The mirror of `readingAwaitedBy`, and between them they make sure exactly one
 * thing is asked. `readingAwaitedBy` covers the case where the guide is going
 * to ask for the reading anyway — sleep hours, every morning — and the outcome
 * card simply holds back. This covers the other half: `energy` goes stale in
 * six hours, so an hour after a walk the app already has a current reading and
 * the guide has no reason to ask for another. But a *second* reading at a later
 * moment is not the same fact; it is the after to the before, and it is the
 * only way the relationship can be observed rather than asked for.
 *
 * That is the distinction the guide's own staleness rule cannot make, which is
 * why this asks rather than trying to talk the guide into it. DEF-0005's rule
 * — never state a number and ask for it in the same breath — is not violated:
 * what is being asked for is a reading of *now*, and the app is not showing one
 * for now.
 */
export function stateReadingDueFor(
  episode: Episode,
  view: MemoryView,
  zone: TimeZoneId,
): ConceptId | undefined {
  const affects = profileFor(episode.semantics.target.verb).affects
  if (affects === undefined) return undefined

  const window = outcomeWindowFor(episode, zone)
  if (window === undefined) return undefined

  // Already in. Nothing to ask.
  for (const record of view.history.effective) {
    if (!bearsConcept(record)) continue
    if (record.concept !== affects) continue
    if (record.occurredAt >= window.earliest && record.occurredAt <= window.latest) return undefined
  }

  // The guide is going to ask for this anyway — one question, not two.
  if (view.facts.get(affects)?.worthAsking === true) return undefined

  return affects
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

  /*
   * D-089, and it is the whole of QA-A1's repair on the asking side.
   *
   * A move that declares an observable state dimension is never graded by its
   * owner. "How much did a walk do for you?" asks him for the walk's
   * contribution against an unstated counterfactual — the causal question the
   * system exists to answer — and the four answers grade it. Where the app can
   * read the state itself, it reads it.
   *
   * This subsumes `awaiting` rather than replacing it: every verb
   * `readingAwaitedBy` fires for declares `affects` too, so the older rule is
   * now the special case it always was. Both are kept because they say
   * different things — one is "a better question is coming", the other is "this
   * question is not ours to ask".
   */
  const observes = profileFor(episode.semantics.target.verb).affects !== undefined

  return outcomeQuestionsFor(episode, entities).filter((question) => {
    if (answered.has(question.aspect)) return false
    if (stopped && question.aspect === 'effect') return false
    // Held back while a better question is available for the same fact.
    if (awaiting && question.aspect === 'effect') return false
    if (observes && question.aspect === 'effect') return false
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
  /**
   * What else was true of the occasion — AUD-0017.
   *
   * Last, and optional, because it applies to one verb. It arrives with the
   * answer rather than after it: the setting is the second step of one flow,
   * and writing it as a separate record afterwards would leave a window where
   * the occasion existed with a setting the owner had already given.
   */
  occasion?: OccasionContext,
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
      ...(occasion === undefined ? {} : { occasion }),
    },
  )
}

/**
 * What the owner picked, in the words the button used.
 *
 * A surface reporting an outcome has the record's `observation` — a step on a
 * scale — and needs the sentence that step was offered as. Reading it back out
 * of the same table the button was rendered from is not a convenience: DEF-0020's
 * own repair found a level labelled "A little" on screen being reported back as
 * "a fair amount" in the trace, and recorded the rule as "the words on the
 * button and the words in the trace have to mean the same thing".
 *
 * Per verb, because the answers are. "Not at all" is what a half-cleared
 * kitchen gets; "Nothing back" is what an unanswered message gets, and neither
 * sentence would survive being written for the other.
 */
export function outcomeAnswerLabel(
  verb: ActionVerb,
  aspect: OutcomeAspect,
  observation: FactValue,
): string | undefined {
  const question = OUTCOME_QUESTIONS[verb][aspect]
  if (question === undefined) return undefined
  return question.answers.find((answer) => factValuesEqual(answer.observation, observation))?.label
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

// ---------------------------------------------------------------------------
// The second step — AUD-0017
// ---------------------------------------------------------------------------

/**
 * How many of the owner's own places the setting question offers.
 *
 * Three, and then the two coarse answers and a way past. The point of the
 * question is generalisation across settings, not an accurate address, and a
 * list of every place the app has ever heard of would turn one tap into a
 * scroll on the flow the owner is most likely to be halfway through a
 * restaurant for (section 4.5).
 */
const PLACES_OFFERED = 3

export interface SettingOption {
  readonly id: string
  readonly label: string
  /** Absent on the way past. A skipped setting is unknown, never "familiar". */
  readonly setting: OccasionSetting | undefined
}

export interface SettingQuestion {
  readonly prompt: string
  readonly options: readonly SettingOption[]
}

/**
 * Where the occasion happened, asked as one extra tap — AUD-0017.
 *
 * The load-bearing half of the finding, and it is an interaction change rather
 * than a label change: answering a growth outcome becomes a two-step flow, and
 * Phase 9 has to design it. It exists because the claim the app was making —
 * "she handles this independently now" — is about **generalisation**, and the
 * evidence was about **repetition**. Three good occasions three weeks apart at
 * the same restaurant with her father at the table supports "she can do this
 * here, with me" (Stokes & Baer, 1977).
 *
 * Only the growth verb has one. Where the answer would mean nothing, asking for
 * it would be collecting data because a field exists.
 */
export function settingQuestionFor(
  episode: Episode,
  entities: EntityIndex,
): SettingQuestion | undefined {
  if (episode.semantics.target.verb !== 'growth-opportunity') return undefined
  const person = entities.linked(episode.semantics.subject.id, 'about-person')?.label

  const places = entities.byKind('place').slice(0, PLACES_OFFERED)
  return {
    prompt: person === undefined ? 'Where was this?' : `Where was ${person}?`,
    options: [
      ...places.map((place) => ({
        id: place.id,
        label: place.label,
        setting: { kind: 'place' as const, place: { id: place.id, kind: place.kind } },
      })),
      { id: 'new', label: 'Somewhere new', setting: { kind: 'somewhere-new' as const } },
      {
        id: 'familiar',
        label: 'Somewhere familiar',
        setting: { kind: 'somewhere-familiar' as const },
      },
      // Skippable, and a skipped setting is recorded as unknown rather than as
      // the safer-sounding answer — AUD-0017 says so in as many words.
      { id: 'skip', label: 'Rather not say', setting: undefined },
    ],
  }
}

/** The scaffolding level an answer names, where it names one. */
export function helpLevelOf(answer: OutcomeAnswer): HelpLevel | undefined {
  return answer.help
}
