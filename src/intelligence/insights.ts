import type { LifeDomainId } from '../domain/domains'
import type { RecordId } from '../domain/ids'
import { patternNameFor, type ActionVerb } from '../domain/recommendation'
import {
  discreetly,
  evidenceSourceOf,
  type DecisionContext,
  type FactValue,
} from '../domain/records'
import {
  civilDateFromDayId,
  localDayIdAt,
  localDaysBetween,
  type DayBlock,
  type Instant,
  type LocalDayId,
  type TimeZoneId,
} from '../domain/time'
import type { Decision } from './engine'
import { describeDays } from './coverage'
import { describeUnknown, isUsable } from '../domain/knowledge'
import {
  discreetPlaceholder,
  mayRaiseUnasked,
  mayShowDetail,
  DISCREET_PRIMARY,
} from '../domain/privacy'
import type { ProvenanceSource } from '../domain/records'
import {
  actionScopeOf,
  applicableAssociation,
  type AssociationSide,
  type ChangePair,
  type ObservedAssociation,
} from './association'
import {
  associationBeliefKey,
  beliefKey,
  comparableEpisodes,
  describeEvidenceMix,
  type EvidenceRef,
} from './learning'
import { collectEpisodes, type Episode } from './lifecycle'
import {
  COMFORT_FRICTION,
  COMFORT_STEPS,
  comfortFrictionOf,
  EFFECT_VALUE,
  effectValueOf,
  RESULT_STEPS,
  RESULT_VALUE,
  resultValueOf,
} from './outcomes'
import { describeWeekLoad, describeWeekLoadCount } from './rhythm'
import { describeRecurring, describeStall, recurringBlockers, stalledStrategies } from './review'
import { describeReading } from './trajectory'
import { describeGoalTrajectory, type Situation } from './situation'
import { hereNowWord } from './vocabulary'
import type { ConceptId } from '../domain/windows'

/**
 * What the system has learned, said out loud (canonical plan sections 27 and 51).
 *
 * Insights answers one question — *what is the system learning about my life?*
 * — and the whole difficulty of the phase is in what it is honest to answer
 * with. Three rules shape every line below.
 *
 * ## 1. This is an interpretation of history. It is never a second brain.
 *
 * Section 17.2 allows exactly one arbitration path, and section 51 says outright
 * that the deeper evidence view must not become "a second analytics engine, a
 * second recommendation brain, or a parallel explanation truth". So nothing
 * here proposes a move, nothing here scores a candidate, and nothing here
 * builds its own learning index: the beliefs are read off `situation.learning`,
 * the object the decision on Now was made from, and the raw counts are taken
 * over the episode set that index itself selects (`comparableEpisodes`). Two
 * definitions of "a situation like this one" would eventually disagree, and the
 * owner would have no way to tell which screen was lying — which is the
 * argument D-071 already made for coverage.
 *
 * `tests/unit/architecture-guards.test.ts` fails the build if this file imports
 * the generator, the filter, the evaluator, the arbiter, the advisor, the
 * recommendation renderer, or `buildLearning`.
 *
 * ## 2. Four facts, and never one number — DEF-0020, applied to a percentage
 *
 * Completion, direct result, downstream effect and comfort are four different
 * facts about an episode. Phase 3 collapsed them into one better/same/worse
 * judgement and taught one belief from four kinds of evidence; section 51
 * exists to stop the same collapse happening again in a percentage:
 *
 * > Any percentage must identify the quantity it measures. Do not merge direct
 * > result, downstream effect, comfort/friction, or follow-through into one
 * > generic success statistic.
 *
 * So there is no "success rate" here and there is no type that could hold one.
 * A `MeasuredRate` carries the aspect it measures, a sentence naming the
 * quantity in ordinary words, and its own numerator and denominator — and a
 * rate for one aspect is never combined with a rate for another.
 *
 * ## 3. Not enough evidence is a real answer — G-009, applied to a pattern
 *
 * A rate is withheld, with the reason, whenever the denominator is below
 * {@link MIN_FOR_A_RATE}. That is the same discipline as "unknown stays
 * unknown": the app would rather say it cannot tell yet than manufacture a
 * figure, and the withheld state carries the count so the owner can see how
 * close it is.
 *
 * Nothing here reads a clock. An insight is a pure function of a situation.
 */

// ---------------------------------------------------------------------------
// What a number is allowed to measure
// ---------------------------------------------------------------------------

/**
 * The four things a rate on this surface may be about.
 *
 * Deliberately the same four facts DEF-0020 separated, under names an owner
 * would use rather than the internal ones. There is no fifth entry meaning
 * "overall", and adding one would be the defect returning.
 */
export type MeasuredAspect = 'follow-through' | 'direct-result' | 'downstream-effect' | 'comfort'

export const MEASURED_ASPECTS: readonly MeasuredAspect[] = [
  'follow-through',
  'direct-result',
  'downstream-effect',
  'comfort',
]

/**
 * The smallest denominator this surface will print a percentage over.
 *
 * Four, and the number is defensible rather than round. `PATIENCE` in
 * `learning.ts` is 3 — the point at which observation starts outweighing the
 * starting belief — so a figure the app is willing to *print* should rest on
 * more evidence than it takes to move a belief a quarter of the way. Below
 * this the rate is withheld and the count is shown instead, which is the honest
 * version of the same information.
 *
 * The percentage is never printed alone either: the numerator and denominator
 * travel with it, so "80%" always arrives as "4 of 5" as well. That is what
 * keeps a small sample from reading as a measurement.
 */
export const MIN_FOR_A_RATE = 4

/** How far two contexts' rates must differ before the split is worth saying. */
export const MATERIAL_DIFFERENCE = 0.34

/** Evidence older than this, with nothing since, is an assumption rather than a finding. */
export const STALE_BELIEF_DAYS = 60

/*
 * The trajectory constants moved to `trajectory.ts` with the arithmetic —
 * AUD-0029. What is left here is the sentence, which is all this file ever
 * should have owned.
 */

/**
 * One rate, and everything needed to read it honestly.
 *
 * `percent` is `undefined` exactly when `withheld` is set, and never both. The
 * pair is what makes "not enough evidence yet" a value this type can hold
 * rather than a state a surface has to remember to check for.
 */
export interface MeasuredRate {
  readonly aspect: MeasuredAspect
  /** What the number measures, in ordinary words. Rendered beside it, always. */
  readonly measures: string
  /** How many comparable occasions the number is over. */
  readonly of: number
  readonly hit: number
  /** 0–100, whole. Absent when the evidence does not support one. */
  readonly percent: number | undefined
  /** Why there is no percentage. Absent when there is one. */
  readonly withheld: string | undefined
}

export type ConfidenceWord =
  'too early to say' | 'worth noticing' | 'fairly consistent' | 'very consistent'

/**
 * How sure the app is, in the owner's own words first (section 51's build list).
 *
 * The word leads and the arithmetic follows it, because "fairly consistent, over
 * six evenings, one of which went the other way" is a sentence somebody can
 * disagree with and "confidence 0.68" is not.
 */
export interface PatternConfidence {
  readonly word: ConfidenceWord
  readonly because: string
  readonly comparable: number
}

/** One occasion, named well enough to be recognised. */
export interface EvidenceLine {
  readonly record: RecordId
  readonly when: LocalDayId
  readonly text: string
}

/**
 * The deeper view — everything section 51 permits, and nothing invented.
 *
 * Section 51 lists what a Pattern Detail may expose when it is relevant and
 * supported: comparable-situation count, sample size and window, evidence by
 * kind, counterexamples, context similarity, where the pattern is stronger or
 * weaker, trend over time, confidence, included and excluded evidence, the
 * reason trace, and a rate where one is justified. Every field here is one of
 * those, and each is optional because "supported" is the condition.
 */
export interface PatternEvidence {
  readonly comparable: number
  readonly window: { readonly from: LocalDayId; readonly to: LocalDayId } | undefined
  /**
   * How much evidence there is, as a sentence, in the units this card counts.
   *
   * Composed here rather than by the surface, because the surface cannot know
   * what the number is *of*. Rendering "12 comparable occasions" under every
   * card put that sentence over a run of nightly sleep readings, where nothing
   * was compared and the twelve were readings — and over a standing custody
   * arrangement, where the count was of entries predating it. One panel
   * labelling a number with a word that is right for one card and wrong for
   * another is DEF-0033's shape.
   *
   * Absent where the card's own detail line already says it. Repeating it one
   * tap lower would be section 61's repeated boilerplate.
   */
  readonly counted: string | undefined
  readonly rates: readonly MeasuredRate[]
  readonly counterexamples: readonly EvidenceLine[]
  readonly included: readonly EvidenceLine[]
  /**
   * What to call the list above, when "everything counted" is not what it is.
   *
   * A coverage card's list is what is overdue and a trajectory's is every
   * reading — neither was counted toward anything, and the fixed heading said
   * they were. Same shape of mislabelling as `counted` (DEF-0038), on the
   * block underneath it.
   */
  readonly includedTitle: string | undefined
  /**
   * What to call the second list, when "left out" is not what it is.
   *
   * An association card puts the occasions *without* the move in this slot, and
   * they are the whole reason its figure means anything — the opposite of left
   * out. Same mislabelling as `counted` and `includedTitle` before it
   * (DEF-0038, DEF-0044), on the third block down.
   */
  readonly excludedTitle: string | undefined
  /** Occasions deliberately left out, each saying why. */
  readonly excluded: readonly EvidenceLine[]
  readonly strongerIn: string | undefined
  readonly weakerIn: string | undefined
  readonly trend: string | undefined
  /** How many of the answers the owner gave, and how many were worked out. */
  readonly mix: string | undefined
  /** How this was arrived at, in plain sentences. */
  readonly reasoning: readonly string[]
}

export type InsightKind =
  /** What the record shows has followed a move, against occasions without it. */
  | 'state-association'
  | 'stable-strength'
  | 'repeated-friction'
  | 'move-effectiveness'
  | 'context-effect'
  | 'emerging-change'
  | 'contradiction'
  | 'stale-assumption'
  | 'coverage-gap'
  | 'trajectory'
  | 'life-season'

/** Ordinary words for the kind. No taxonomy language on the card. */
const EYEBROW: Record<InsightKind, string> = {
  // Not "works for you" — that is the one this card must never be mistaken for.
  'state-association': 'What tends to follow',
  'stable-strength': 'Works for you',
  'repeated-friction': 'Keeps getting in the way',
  'move-effectiveness': 'What actually happens',
  'context-effect': 'Depends on the occasion',
  'emerging-change': 'Changing',
  contradiction: 'Went the other way',
  'stale-assumption': 'Going on old evidence',
  'coverage-gap': 'Out of date',
  trajectory: 'Over time',
  'life-season': 'A different season',
}

export interface Insight {
  readonly id: string
  readonly kind: InsightKind
  readonly eyebrow: string
  readonly domain: LifeDomainId | undefined
  /** The card, in one ordinary sentence. */
  readonly headline: string
  /** One supporting line. Still ordinary. */
  readonly detail: string
  /**
   * How sure, in words — on cards that state a belief.
   *
   * Absent on a card that reports a reading rather than a conclusion. A
   * coverage gap, a run of numbers and a standing arrangement are things the
   * record says; putting "fairly consistent" under "you have been sleeping
   * less lately" would read as a claim about how consistent the *decline* is,
   * which is not what the word would mean and not what the evidence shows.
   */
  readonly confidence: PatternConfidence | undefined
  /**
   * Every distinct origin behind this card (QA-08-001 retest).
   *
   * A finding drawn entirely from imported history is a different finding from
   * one drawn from what the owner recorded this month, and the card is where he
   * reads the conclusion rather than the rows under it. Marking only the
   * Timeline entries would satisfy the letter of "recognisably imported" and
   * miss the surface he is actually reading.
   *
   * A `ProvenanceSource` rather than a word: this is the brain, and which word
   * the owner sees is the surface's business. Empty where the card rests on
   * nothing resolvable, which says nothing rather than claiming his.
   */
  readonly sources: readonly ProvenanceSource[]
  readonly evidence: PatternEvidence
  /**
   * The belief this states, so the owner has something to disagree with
   * (section 62). Absent where the card reports a fact rather than a belief —
   * a coverage gap and a trajectory are readings of the record, not
   * conclusions to be corrected.
   */
  readonly belief: string | undefined
  /**
   * What to call that belief out loud, where the card can say it better than
   * the key can.
   *
   * `describeBelief` works from the key alone and a key carries an action
   * scope, not an entity registry, so it can say "walking" but not "a walk
   * after work". Where the card knows the object's own name it supplies the
   * phrase; where it does not, the key still describes itself.
   */
  readonly beliefLabel?: string
}

// ---------------------------------------------------------------------------
// Naming the pattern
// ---------------------------------------------------------------------------

/*
 * The table moved down to `domain/recommendation.ts` — QA-83-002.
 *
 * It lived here, and it was the only place in the app that could name an
 * action with its subject in it. So one screen carried four registers for one
 * thing: the headline said *"a walk"*, the learned statement said *"Move"*,
 * the correction control said *"what move does for you"*, and this panel's own
 * rates said *"getting out for a walk"*. The evidence panel was right and it
 * was right alone, because `learning.ts` and `corrections.ts` are below this
 * file and had nothing to read but `verbLabel`.
 *
 * Re-exported rather than moved silently: `everyPatternName`-style sweeps and
 * the existing callers keep the door they already use.
 */
export { patternNameFor }

function patternName(verb: ActionVerb, episodes: readonly Episode[], situation: Situation): string {
  const objects = new Set(episodes.map((episode) => episode.semantics.target.object.id))
  const first = episodes[0]
  const label =
    objects.size === 1 && first !== undefined
      ? situation.entities.labelFor(first.semantics.target.object)
      : undefined
  return patternNameFor(verb, label)
}

function capitalise(text: string): string {
  return text.length === 0 ? text : `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

function lowerFirst(text: string): string {
  return text.length === 0 ? text : `${text.charAt(0).toLowerCase()}${text.slice(1)}`
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** A day the owner would recognise, not an identifier. */
export function describeDay(dayId: LocalDayId): string {
  const civil = civilDateFromDayId(dayId)
  return `${civil.day} ${MONTHS[civil.month - 1] ?? ''}`.trim()
}

function describeMonth(dayId: LocalDayId): string {
  const civil = civilDateFromDayId(dayId)
  return MONTHS[civil.month - 1] ?? describeDay(dayId)
}

// ---------------------------------------------------------------------------
// Counting, per aspect, never across them
// ---------------------------------------------------------------------------

interface Tally {
  readonly aspect: MeasuredAspect
  readonly hit: number
  readonly of: number
  /** The occasions that went against it, kept so they can be shown. */
  readonly against: readonly Episode[]
  readonly records: readonly RecordId[]
}

function answerOf(
  episode: Episode,
  aspect: 'result' | 'effect' | 'comfort',
  read: (value: FactValue) => number | undefined,
): { readonly value: number; readonly record: RecordId } | undefined {
  for (const outcome of episode.outcomes) {
    if (outcome.aspect !== aspect) continue
    const value = read(outcome.observation)
    if (value === undefined) continue
    return { value, record: outcome.id }
  }
  return undefined
}

/**
 * The thresholds each aspect counts as a hit, read off the answer tables
 * themselves.
 *
 * Not literal numbers: `RESULT_VALUE[RESULT_STEPS]` *is* the "completely"
 * answer, so re-tuning the scale in `outcomes.ts` cannot silently change what
 * this surface calls a hit while the buttons still say the same words. That is
 * the sweep DEF-0020's repair added, applied to a second reader of the same
 * tables.
 */
const FULLY_REACHED = RESULT_VALUE[RESULT_STEPS] ?? 1
const NOT_AT_ALL = RESULT_VALUE[0] ?? 0
const SOME_DIFFERENCE = EFFECT_VALUE[2] ?? 0.5
const LITTLE_DIFFERENCE = EFFECT_VALUE[1] ?? 0.15
const FELT_EASY = COMFORT_FRICTION[COMFORT_STEPS] ?? 0.1
const FELT_HARD = COMFORT_FRICTION[0] ?? 0.85

function tallyFor(aspect: MeasuredAspect, episodes: readonly Episode[]): Tally {
  let hit = 0
  let of = 0
  const against: Episode[] = []
  const records: RecordId[] = []

  for (const episode of episodes) {
    switch (aspect) {
      case 'follow-through': {
        const state = episode.state
        if (state !== 'started' && state !== 'completed' && state !== 'unable-now') break
        of += 1
        records.push(episode.recommendation)
        if (state === 'unable-now') against.push(episode)
        else hit += 1
        break
      }
      case 'direct-result': {
        const answer = answerOf(episode, 'result', resultValueOf)
        if (answer === undefined) break
        of += 1
        records.push(answer.record)
        if (answer.value >= FULLY_REACHED) hit += 1
        else if (answer.value <= NOT_AT_ALL) against.push(episode)
        break
      }
      case 'downstream-effect': {
        const answer = answerOf(episode, 'effect', effectValueOf)
        if (answer === undefined) break
        of += 1
        records.push(answer.record)
        if (answer.value >= SOME_DIFFERENCE) hit += 1
        else if (answer.value <= LITTLE_DIFFERENCE) against.push(episode)
        break
      }
      case 'comfort': {
        const answer = answerOf(episode, 'comfort', comfortFrictionOf)
        if (answer === undefined) break
        of += 1
        records.push(answer.record)
        if (answer.value <= FELT_EASY) hit += 1
        else if (answer.value >= FELT_HARD) against.push(episode)
        break
      }
    }
  }

  return { aspect, hit, of, against, records }
}

/**
 * What each aspect's number measures, said in full beside every figure —
 * **including who did the judging** (D-089).
 *
 * QA-A1: *"how often clearing the kitchen made a difference afterwards — 67% —
 * 8 of 12"* asserts an observed fact about the world. The eight are a count of
 * the occasions the owner **said** it made a difference. Both halves were
 * honest and the sentence they formed was not, and section 51's rule did not
 * catch it because the rule requires a figure to name the quantity it measures
 * and does not require it to name who inferred it.
 *
 * So three of the four now say "you said" out loud, because three of the four
 * are tallies of his own judgment. Follow-through is the exception and is not
 * an oversight: whether a move could be done at all is read from what he
 * *did* — a start, a completion, an inability — not from anything he was asked
 * to assess.
 */
export function measuresSentenceFor(aspect: MeasuredAspect, subject: string): string {
  return measuresSentence(aspect, subject)
}

function measuresSentence(aspect: MeasuredAspect, subject: string): string {
  const it = lowerFirst(subject)
  switch (aspect) {
    case 'follow-through':
      return `how often ${it} could actually be done when it came up`
    case 'direct-result':
      return `how often you said ${it} got all the way there`
    case 'downstream-effect':
      return `how often you said ${it} made a difference afterwards`
    case 'comfort':
      return `how often you said ${it} felt easy`
  }
}

/**
 * A tally, turned into a rate — or into an honest refusal to state one.
 *
 * This is the only place in the system that produces a percentage for an owner
 * to read, and it is deliberately the only place: a second one would eventually
 * print a figure over a denominator nobody had checked.
 */
export function rateFrom(tally: Tally, subject: string): MeasuredRate {
  const measures = measuresSentence(tally.aspect, subject)
  if (tally.of === 0) {
    return {
      aspect: tally.aspect,
      measures,
      of: 0,
      hit: 0,
      percent: undefined,
      withheld: 'nothing recorded about this yet',
    }
  }
  if (tally.of < MIN_FOR_A_RATE) {
    return {
      aspect: tally.aspect,
      measures,
      of: tally.of,
      hit: tally.hit,
      percent: undefined,
      withheld: `only ${tally.of} so far — not enough to put a number on`,
    }
  }
  return {
    aspect: tally.aspect,
    measures,
    of: tally.of,
    hit: tally.hit,
    percent: Math.round((tally.hit / tally.of) * 100),
    withheld: undefined,
  }
}

/** Rates for every aspect the evidence touches at all, each named. */
function ratesFor(episodes: readonly Episode[], subject: string): readonly MeasuredRate[] {
  return MEASURED_ASPECTS.map((aspect) => rateFrom(tallyFor(aspect, episodes), subject)).filter(
    (rate) => rate.of > 0,
  )
}

// ---------------------------------------------------------------------------
// Confidence, in words
// ---------------------------------------------------------------------------

function confidenceFrom(comparable: number, counterexamples: number): PatternConfidence {
  const enough = comparable >= MIN_FOR_A_RATE
  let word: ConfidenceWord
  if (!enough) word = 'too early to say'
  else if (comparable >= 10) word = 'very consistent'
  else if (comparable >= 6) word = 'fairly consistent'
  else word = 'worth noticing'

  // A counterexample costs a step, and never drops below "worth noticing" once
  // there is enough evidence — the exception is the news, not a reason to
  // discard everything around it.
  if (enough && counterexamples > 0) {
    word = word === 'very consistent' ? 'fairly consistent' : 'worth noticing'
  }

  const occasions = comparable === 1 ? '1 occasion' : `${comparable} occasions`
  const against =
    counterexamples === 0
      ? ''
      : counterexamples === 1
        ? ', one of which went the other way'
        : `, ${counterexamples} of which went the other way`

  return { word, because: `${occasions}${against}.`, comparable }
}

// ---------------------------------------------------------------------------
// Evidence lines
// ---------------------------------------------------------------------------

function lineFor(episode: Episode, note: string): EvidenceLine {
  return {
    record: episode.recommendation,
    when: episode.dayId,
    text: `${describeDay(episode.dayId)} — ${note}`,
  }
}

function counterexampleNote(episode: Episode): string {
  if (episode.state === 'unable-now') return 'could not be done that day'
  const effect = answerOf(episode, 'effect', effectValueOf)
  if (effect !== undefined && effect.value <= LITTLE_DIFFERENCE) {
    return effect.value <= (EFFECT_VALUE[0] ?? 0)
      ? 'you said it backfired'
      : 'made little difference'
  }
  const result = answerOf(episode, 'result', resultValueOf)
  if (result !== undefined && result.value <= NOT_AT_ALL) return 'did not get there at all'
  const comfort = answerOf(episode, 'comfort', comfortFrictionOf)
  if (comfort !== undefined && comfort.value >= FELT_HARD) return 'was hard work'
  return 'went differently'
}

function windowOf(
  episodes: readonly Episode[],
): { readonly from: LocalDayId; readonly to: LocalDayId } | undefined {
  if (episodes.length === 0) return undefined
  const days = episodes.map((episode) => episode.dayId).sort()
  const from = days[0]
  const to = days[days.length - 1]
  if (from === undefined || to === undefined) return undefined
  return { from, to }
}

/**
 * Where each answer came from — the owner's requirement 2, on this surface too.
 *
 * `evidenceSourceOf` is read rather than `provenance.source` directly, because
 * a synthetic fixture standing in for a watch has to read as a watch: judging a
 * scenario on how it was typed rather than on what it represents is exactly the
 * mistake D-059 records. Once the app can write an outcome the owner never
 * typed, "4 of 5" is only honest beside how many of the five he actually said.
 */
function evidenceRefsFor(episodes: readonly Episode[]): readonly EvidenceRef[] {
  const refs: EvidenceRef[] = []
  for (const episode of episodes) {
    for (const outcome of episode.outcomes) {
      const source = evidenceSourceOf(outcome)
      refs.push({
        record: outcome.id,
        source,
        fromOwner: source === 'owner',
        reliability: 1,
      })
    }
  }
  return refs
}

// ---------------------------------------------------------------------------
// Context splits — where a pattern is stronger, and where it is weaker
// ---------------------------------------------------------------------------

interface Split {
  readonly label: string
  readonly opposite: string
  test(context: DecisionContext): boolean | undefined
}

/**
 * The features a pattern may be scoped to.
 *
 * Deliberately the same coarse features `similarity` compares evenings on. A
 * split on something finer would be a pattern nobody could recognise, and
 * section 22 forbids inventing precision — a claim about "evenings with between
 * 45 and 60 minutes free" is arithmetic wearing a finding's clothes.
 */
const SPLITS: readonly Split[] = [
  {
    label: 'at the weekend',
    opposite: 'on a weekday',
    test: (context) => context.weekend,
  },
  {
    label: 'when she is here',
    opposite: 'when she is not',
    test: (context) => context.childPresent,
  },
  {
    label: 'when you are already short of rest',
    opposite: 'when you are rested',
    test: (context) => (context.strain === 'unknown' ? undefined : context.strain !== 'none'),
  },
  {
    label: 'in the evening',
    opposite: 'earlier in the day',
    test: (context) =>
      context.block === 'evening' || context.block === 'late-night' || context.block === 'afternoon'
        ? context.block !== 'afternoon'
        : false,
  },
]

interface FoundSplit {
  readonly split: Split
  readonly aspect: MeasuredAspect
  readonly strongSide: { readonly label: string; readonly rate: MeasuredRate }
  readonly weakSide: { readonly label: string; readonly rate: MeasuredRate }
  readonly difference: number
}

/**
 * The one split, if any, where the same move genuinely behaves differently.
 *
 * Both sides have to clear {@link MIN_FOR_A_RATE} independently, so neither
 * half of the claim rests on evidence too thin to print — a "pattern" made of
 * five evenings against one is one evening, not a context.
 */
function strongestSplit(episodes: readonly Episode[], subject: string): FoundSplit | undefined {
  let best: FoundSplit | undefined

  for (const split of SPLITS) {
    const yes: Episode[] = []
    const no: Episode[] = []
    for (const episode of episodes) {
      const context = episode.context
      if (context === undefined) continue
      const answer = split.test(context)
      if (answer === undefined) continue
      if (answer) yes.push(episode)
      else no.push(episode)
    }

    // Preference order rather than registry order, for the same reason
    // `leadingRate` uses it: a split on whether the move could be done at all
    // is the least informative true split available, and would otherwise win
    // every tie simply by being listed first.
    for (const aspect of RATE_PREFERENCE) {
      const yesRate = rateFrom(tallyFor(aspect, yes), subject)
      const noRate = rateFrom(tallyFor(aspect, no), subject)
      if (yesRate.percent === undefined || noRate.percent === undefined) continue

      const difference = Math.abs(yesRate.percent - noRate.percent) / 100
      if (difference < MATERIAL_DIFFERENCE) continue
      if (best !== undefined && difference <= best.difference) continue

      const yesIsStronger = yesRate.percent >= noRate.percent
      best = {
        split,
        aspect,
        strongSide: {
          label: yesIsStronger ? split.label : split.opposite,
          rate: yesIsStronger ? yesRate : noRate,
        },
        weakSide: {
          label: yesIsStronger ? split.opposite : split.label,
          rate: yesIsStronger ? noRate : yesRate,
        },
        difference,
      }
    }
  }

  return best
}

// ---------------------------------------------------------------------------
// Earlier and later — change over time
// ---------------------------------------------------------------------------

interface Halves {
  readonly earlier: readonly Episode[]
  readonly later: readonly Episode[]
}

function halvesOf(episodes: readonly Episode[]): Halves {
  const ordered = [...episodes].sort((a, b) => a.shownAt - b.shownAt)
  const cut = Math.floor(ordered.length / 2)
  return { earlier: ordered.slice(0, cut), later: ordered.slice(cut) }
}

// ---------------------------------------------------------------------------
// The insights
// ---------------------------------------------------------------------------

function episodesByVerb(situation: Situation): ReadonlyMap<ActionVerb, readonly Episode[]> {
  const rejected = situation.learning.rejected
  const out = new Map<ActionVerb, Episode[]>()

  for (const episode of situation.learning.episodes) {
    if (episode.shownAt > situation.at) continue
    const verb = episode.semantics.target.verb
    /*
     * A belief the owner has ruled out is not restated here.
     *
     * Section 62 asks the app to stop reasserting a corrected belief, and the
     * watershed `learning.ts` already keeps is exactly the right one: evidence
     * from before the correction stops counting, and what happens afterwards
     * counts normally. Insights reads the same watershed rather than a rule of
     * its own, or a card would go on repeating something the owner had already
     * disagreed with on Now.
     */
    const after = rejected.get(beliefKey('effect', verb))
    if (after !== undefined && episode.shownAt <= after) continue

    const held = out.get(verb)
    if (held === undefined) out.set(verb, [episode])
    else held.push(episode)
  }

  return out
}

function domainOf(episodes: readonly Episode[]): LifeDomainId | undefined {
  const counts = new Map<LifeDomainId, number>()
  for (const episode of episodes) {
    const domain = episode.semantics.domain
    counts.set(domain, (counts.get(domain) ?? 0) + 1)
  }
  let best: LifeDomainId | undefined
  let bestCount = 0
  for (const [domain, count] of counts) {
    if (count > bestCount) {
      best = domain
      bestCount = count
    }
  }
  return best
}

/**
 * The split and the trend, computed for every pattern rather than only for the
 * card that leads on one of them.
 *
 * Only one card per move reaches the screen (see `insightsFor`), which means
 * the finding that did not win the headline would otherwise disappear
 * completely. It belongs in the deeper view either way: section 51 lists
 * "contexts where the pattern appears stronger or weaker" and "trend/change
 * over time" as things a Pattern Detail may expose, not as alternative
 * headlines. So they are worked out here, once, and the card that leads on one
 * of them simply overrides the wording.
 */
function splitAndTrend(
  episodes: readonly Episode[],
  subject: string,
): { readonly strongerIn?: string; readonly weakerIn?: string; readonly trend?: string } {
  const out: { strongerIn?: string; weakerIn?: string; trend?: string } = {}

  const found = strongestSplit(episodes, subject)
  if (found !== undefined) {
    out.strongerIn = `${capitalise(found.strongSide.label)} — ${found.strongSide.rate.hit} of ${found.strongSide.rate.of}.`
    out.weakerIn = `${capitalise(found.weakSide.label)} — ${found.weakSide.rate.hit} of ${found.weakSide.rate.of}.`
  }

  const { earlier, later } = halvesOf(episodes)
  for (const aspect of RATE_PREFERENCE) {
    const before = rateFrom(tallyFor(aspect, earlier), subject)
    const after = rateFrom(tallyFor(aspect, later), subject)
    if (before.percent === undefined || after.percent === undefined) continue
    out.trend = `${before.hit} of ${before.of} earlier, ${after.hit} of ${after.of} since. Same question, both halves.`
    break
  }

  return out
}

function evidenceFor(
  episodes: readonly Episode[],
  subject: string,
  extras: {
    readonly strongerIn?: string
    readonly weakerIn?: string
    readonly trend?: string
    readonly reasoning: readonly string[]
    readonly excluded?: readonly EvidenceLine[]
  },
): PatternEvidence {
  const worked = splitAndTrend(episodes, subject)
  const counterexamples = new Map<RecordId, EvidenceLine>()
  for (const aspect of MEASURED_ASPECTS) {
    for (const episode of tallyFor(aspect, episodes).against) {
      counterexamples.set(episode.recommendation, lineFor(episode, counterexampleNote(episode)))
    }
  }

  const window = windowOf(episodes)
  return {
    comparable: episodes.length,
    window,
    counted: `${episodes.length} comparable ${episodes.length === 1 ? 'occasion' : 'occasions'}${
      window === undefined
        ? '.'
        : `, between ${describeDay(window.from)} and ${describeDay(window.to)}.`
    }`,
    rates: ratesFor(episodes, subject),
    counterexamples: [...counterexamples.values()],
    included: episodes.map((episode) => lineFor(episode, describeEpisodeOutcome(episode))),
    includedTitle: undefined,
    excludedTitle: undefined,
    excluded: extras.excluded ?? [],
    strongerIn: extras.strongerIn ?? worked.strongerIn,
    weakerIn: extras.weakerIn ?? worked.weakerIn,
    trend: extras.trend ?? worked.trend,
    mix: describeEvidenceMix(evidenceRefsFor(episodes)),
    reasoning: extras.reasoning,
  }
}

function describeEpisodeOutcome(episode: Episode): string {
  switch (episode.state) {
    case 'shown':
      return 'offered, and nothing was recorded'
    case 'declined':
      return 'you passed on it'
    case 'unable-now':
      return 'you said it did not fit at the time'
    case 'started':
      return 'started, and never settled'
    case 'part-done':
      // What it says and no more — F10, F05. Part of it happened; nothing here
      // claims it worked, and nothing claims it did not.
      return 'you got part of it done'
    case 'completed': {
      const effect = answerOf(episode, 'effect', effectValueOf)
      if (effect !== undefined) {
        return effect.value >= SOME_DIFFERENCE
          ? 'done, and it made a difference'
          : effect.value <= (EFFECT_VALUE[0] ?? 0)
            ? 'done, and you said it backfired'
            : 'done, and it made little difference'
      }
      const result = answerOf(episode, 'result', resultValueOf)
      if (result !== undefined) {
        return result.value >= FULLY_REACHED
          ? 'done, and it got all the way there'
          : result.value <= NOT_AT_ALL
            ? 'done, and it did not get there'
            : 'done, and it got part of the way'
      }
      return 'done, and no result was given'
    }
  }
}

/**
 * Every sentence a pattern card can lead with, for the class-wide sweeps.
 *
 * A copy table nobody can enumerate is a copy table that gets checked by
 * example, and DEF-0020's own repair records what that costs: the two tests
 * that asserted the exact broken strings are why nothing caught it, because an
 * exact-string assertion proves a string is stable rather than right. This
 * walks every aspect at every band, so a new band or a new aspect is covered
 * the moment it exists.
 */
export function everyPatternHeadline(
  subject: string,
): readonly { readonly aspect: MeasuredAspect; readonly sentence: string }[] {
  const bands: readonly (readonly [number, number])[] = [
    [4, 4],
    [3, 4],
    [5, 8],
    [3, 8],
    [1, 8],
    [0, 4],
  ]
  const out: { aspect: MeasuredAspect; sentence: string }[] = []
  for (const aspect of MEASURED_ASPECTS) {
    for (const [hit, of] of bands) {
      out.push({
        aspect,
        sentence: headlineFor(subject, {
          aspect,
          measures: measuresSentence(aspect, subject),
          hit,
          of,
          percent: Math.round((hit / of) * 100),
          withheld: undefined,
        }),
      })
    }
  }
  return out
}

/**
 * Which aspect a card leads with, when more than one has enough evidence.
 *
 * By what it *means*, not by how much of it there is. Follow-through sits last
 * deliberately: "this could be done four times out of four" is the least
 * informative true thing the app can say about a move, and leading with it once
 * produced a card headed "has worked every time it has come up" over a figure
 * that said nothing whatever about whether it worked. That is DEF-0020's
 * collapse arriving through a choice of which number to show.
 */
const RATE_PREFERENCE: readonly MeasuredAspect[] = [
  'downstream-effect',
  'direct-result',
  'comfort',
  'follow-through',
]

function leadingRate(rates: readonly MeasuredRate[]): MeasuredRate | undefined {
  for (const aspect of RATE_PREFERENCE) {
    const found = rates.find((rate) => rate.aspect === aspect && rate.percent !== undefined)
    if (found !== undefined) return found
  }
  return undefined
}

/**
 * The card's sentence, written per aspect and never across them.
 *
 * Each branch says only what its own quantity is entitled to say. "Made a
 * difference" is a claim about downstream effect; "got all the way there" is a
 * claim about the direct result; "keeps not happening" is a claim about the
 * situation rather than about the move. A single sentence covering all four is
 * exactly the generic success statistic section 51 forbids, in prose instead of
 * in a number.
 */
function headlineFor(subject: string, rate: MeasuredRate): string {
  const share = rate.percent ?? 0
  const every = rate.hit === rate.of
  switch (rate.aspect) {
    /*
     * "You have said" rather than "it has", on both aspects the owner grades.
     *
     * QA-A1's clearest single line. The card is a summary of his own answers,
     * and a headline that drops him out of the sentence turns a report of what
     * he thinks into a finding about the world. It reads slightly longer and it
     * is the difference between honest and not.
     */
    case 'downstream-effect':
      if (every) return `You have said ${lowerFirst(subject)} made a difference every time.`
      if (share >= 60) return `You usually say ${lowerFirst(subject)} makes a difference.`
      if (share >= 35)
        return `You say ${lowerFirst(subject)} makes a difference about half the time.`
      return `You have not often said ${lowerFirst(subject)} made much difference.`
    case 'direct-result':
      if (every) return `You have said ${lowerFirst(subject)} got all the way there every time.`
      if (share >= 60) return `You usually say ${lowerFirst(subject)} gets all the way there.`
      if (share >= 35)
        return `You say ${lowerFirst(subject)} gets all the way there about half the time.`
      return `You rarely say ${lowerFirst(subject)} gets all the way there.`
    case 'comfort':
      // How something felt is his to report and nobody else's, so this one is
      // an owner statement by nature rather than by relabelling. It still says
      // so, because the card sits beside two that had to be corrected.
      if (share >= 75) return `You have found ${lowerFirst(subject)} easy nearly every time.`
      if (share >= 40) return `You find ${lowerFirst(subject)} easy about as often as not.`
      return `You have found ${lowerFirst(subject)} hard work more often than not.`
    case 'follow-through':
      // No back-reference to the subject, even though the subject opens the
      // sentence. G-001's rule is cheap to keep and expensive to reintroduce.
      if (every) return `${subject} has never once been blocked.`
      if (share >= 70) return `${subject} usually happens when offered.`
      if (share >= 40) return `${subject} does not always happen when offered.`
      return `${subject} keeps not happening.`
  }
}

interface Built {
  readonly insight: Insight
  readonly rank: number
}

function patternCard(
  verb: ActionVerb,
  episodes: readonly Episode[],
  situation: Situation,
): Built | undefined {
  const subject = patternName(verb, episodes, situation)
  const rates = ratesFor(episodes, subject)
  const lead = leadingRate(rates)
  if (lead === undefined) return undefined

  const againstCount = new Set(
    MEASURED_ASPECTS.flatMap((aspect) =>
      tallyFor(aspect, episodes).against.map((episode) => episode.recommendation),
    ),
  ).size

  /*
   * Which of the three this card is depends on what the leading figure says,
   * and the leading figure is chosen by meaning rather than by size.
   *
   * "Keeps getting in the way" is a claim about follow-through or about how it
   * felt. "Works for you" is a claim about what it was worth or how far it got.
   * A card cannot be both, and neither may be inferred from the other's number.
   */
  const blockedOften =
    lead.aspect === 'follow-through' && lead.percent !== undefined && lead.percent < 70
  const feltHard = lead.aspect === 'comfort' && lead.percent !== undefined && lead.percent < 50
  const worksWell =
    (lead.aspect === 'downstream-effect' || lead.aspect === 'direct-result') &&
    lead.percent !== undefined &&
    lead.percent >= 80 &&
    againstCount === 0

  const kind: InsightKind =
    blockedOften || feltHard
      ? 'repeated-friction'
      : worksWell
        ? 'stable-strength'
        : 'move-effectiveness'

  return {
    rank:
      (kind === 'repeated-friction' ? 60 : kind === 'stable-strength' ? 45 : 40) +
      Math.min(10, episodes.length),
    insight: {
      id: `pattern:${verb}`,
      kind,
      eyebrow: EYEBROW[kind],
      domain: domainOf(episodes),
      headline: headlineFor(subject, lead),
      detail: `${capitalise(lead.measures)}: ${lead.hit} of ${lead.of}.`,
      confidence: confidenceFrom(episodes.length, againstCount),
      // Empty: filled from what this card cites. See `withSources`.
      sources: [],
      evidence: evidenceFor(episodes, subject, {
        reasoning: [
          `Counted over every occasion ${lowerFirst(subject)} has come up, oldest first.`,
          'Each figure is about one thing only — how far it got, what it was worth afterwards, whether it could be done at all, or how it felt. They are never added together.',
          'These are counts of what you said, not of what the app observed. Whether one thing actually follows another is a separate question, and the app answers it from readings rather than from your judgment.',
        ],
      }),
      belief: beliefKey('effect', verb),
    },
  }
}

function contextCard(
  verb: ActionVerb,
  episodes: readonly Episode[],
  situation: Situation,
): Built | undefined {
  const subject = patternName(verb, episodes, situation)
  const found = strongestSplit(episodes, subject)
  if (found === undefined) return undefined

  const strong = found.strongSide
  const weak = found.weakSide

  return {
    rank: 70,
    insight: {
      id: `context:${verb}:${found.aspect}`,
      kind: 'context-effect',
      eyebrow: EYEBROW['context-effect'],
      domain: domainOf(episodes),
      headline: `${subject} goes better ${strong.label} than ${weak.label}.`,
      detail: `${capitalise(strong.rate.measures)}: ${strong.rate.hit} of ${strong.rate.of} ${strong.label}, ${weak.rate.hit} of ${weak.rate.of} ${weak.label}.`,
      confidence: confidenceFrom(strong.rate.of + weak.rate.of, weak.rate.of - weak.rate.hit),
      // Empty: filled from what this card cites. See `withSources`.
      sources: [],
      evidence: evidenceFor(episodes, subject, {
        strongerIn: `${capitalise(strong.label)} — ${strong.rate.hit} of ${strong.rate.of}.`,
        weakerIn: `${capitalise(weak.label)} — ${weak.rate.hit} of ${weak.rate.of}.`,
        reasoning: [
          `Both sides were counted separately, and neither is shown unless it has at least ${MIN_FOR_A_RATE} occasions of its own.`,
          'The two figures measure the same one thing in two different situations. They are not combined.',
        ],
      }),
      belief: beliefKey('effect', verb),
    },
  }
}

function changeCard(
  verb: ActionVerb,
  episodes: readonly Episode[],
  situation: Situation,
): Built | undefined {
  const subject = patternName(verb, episodes, situation)
  const { earlier, later } = halvesOf(episodes)

  for (const aspect of MEASURED_ASPECTS) {
    const before = rateFrom(tallyFor(aspect, earlier), subject)
    const after = rateFrom(tallyFor(aspect, later), subject)
    if (before.percent === undefined || after.percent === undefined) continue
    const shift = (after.percent - before.percent) / 100
    if (Math.abs(shift) < MATERIAL_DIFFERENCE) continue

    const beforeWindow = windowOf(earlier)
    const afterWindow = windowOf(later)
    const when = afterWindow === undefined ? 'lately' : `since ${describeMonth(afterWindow.from)}`

    return {
      rank: 80,
      insight: {
        id: `change:${verb}:${aspect}`,
        kind: 'emerging-change',
        eyebrow: EYEBROW['emerging-change'],
        domain: domainOf(episodes),
        /*
         * Deliberately not naming the aspect, and deliberately pronoun-free.
         *
         * The detail directly below names the quantity and prints both halves
         * of it, so the headline only has to carry the direction. Reaching for
         * one aspect'''s verb here — "stopped working", "stopped landing" —
         * would put a downstream-effect word over whichever aspect actually
         * moved, which is the collapse this whole file is arranged against.
         */
        headline:
          shift > 0
            ? `${subject} has been going better ${when}.`
            : `${subject} has not been going as well ${when}.`,
        detail: `${capitalise(before.measures)}: ${before.hit} of ${before.of}${
          beforeWindow === undefined ? '' : ` up to ${describeDay(beforeWindow.to)}`
        }, then ${after.hit} of ${after.of} ${when}.`,
        confidence: confidenceFrom(episodes.length, after.of - after.hit),
        // Empty: filled from what this card cites. See `withSources`.
        sources: [],
        evidence: evidenceFor(episodes, subject, {
          trend: `${before.hit} of ${before.of} earlier, ${after.hit} of ${after.of} ${when}. Same question, both halves.`,
          reasoning: [
            'The record was cut in half by date and each half counted on its own.',
            'The later evidence does not erase the earlier: what the app believes moves toward the newer answers rather than jumping to them.',
          ],
        }),
        belief: beliefKey('effect', verb),
      },
    }
  }

  return undefined
}

function contradictionCard(
  verb: ActionVerb,
  episodes: readonly Episode[],
  situation: Situation,
): Built | undefined {
  const subject = patternName(verb, episodes, situation)
  const effect = tallyFor('downstream-effect', episodes)
  if (effect.of < MIN_FOR_A_RATE) return undefined
  if (effect.against.length === 0) return undefined
  // Only worth a card while the run it goes against is still the majority —
  // once the exceptions outnumber the rule it is a change, not a contradiction,
  // and `changeCard` is the honest way to say that.
  if (effect.hit <= effect.against.length) return undefined

  const latest = [...effect.against].sort((a, b) => b.shownAt - a.shownAt)[0]
  if (latest === undefined) return undefined

  return {
    rank: 90,
    insight: {
      id: `against:${verb}`,
      kind: 'contradiction',
      eyebrow: EYEBROW.contradiction,
      domain: domainOf(episodes),
      headline: `${subject} usually helps, and on ${describeDay(latest.dayId)} it did not.`,
      detail: `${effect.hit} of ${effect.of} occasions made a difference afterwards. ${
        effect.against.length === 1 ? 'One did not' : `${effect.against.length} did not`
      }.`,
      confidence: confidenceFrom(effect.of, effect.against.length),
      // Empty: filled from what this card cites. See `withSources`.
      sources: [],
      evidence: evidenceFor(episodes, subject, {
        reasoning: [
          'One occasion going the other way is not proof that the pattern is wrong, in the same way one good occasion was never proof that it was right.',
          'It is shown because it is the part of the record the app would otherwise average away.',
        ],
      }),
      belief: beliefKey('effect', verb),
    },
  }
}

/**
 * One belief that has gone old, and everything a group of them would need.
 *
 * The card is what it always was. What is new is that the parts it was built
 * from come back with it, so `staleBeliefCards` below can name the oldest and
 * list the rest without recomputing any of it — AUD-0044's risk note is that
 * grouping hides which belief is oldest unless the card names it.
 */
export interface StaleBelief {
  readonly card: Built
  readonly subject: string
  readonly days: number
  readonly domain: LifeDomainId | undefined
}

function staleBeliefCard(
  verb: ActionVerb,
  episodes: readonly Episode[],
  situation: Situation,
): StaleBelief | undefined {
  const subject = patternName(verb, episodes, situation)
  const answered = episodes.filter((episode) => episode.outcomes.length > 0)
  if (answered.length < 2) return undefined

  const today = localDayIdAt(situation.at, situation.zone)
  const newest = answered.reduce((best, episode) =>
    episode.shownAt > best.shownAt ? episode : best,
  )
  const days = Math.max(0, localDaysBetween(newest.dayId, today))
  if (days < STALE_BELIEF_DAYS) return undefined

  const card: Built = {
    rank: 65,
    insight: {
      id: `stale:${verb}`,
      kind: 'stale-assumption',
      eyebrow: EYEBROW['stale-assumption'],
      domain: domainOf(episodes),
      headline: `What the app thinks about ${lowerFirst(subject)} is ${describeDays(days)} old.`,
      detail: `The most recent thing you said about it was ${describeDay(newest.dayId)}. It is still being used when this comes up.`,
      confidence: confidenceFrom(answered.length, 0),
      // Empty: filled from what this card cites. See `withSources`.
      sources: [],
      evidence: evidenceFor(answered, subject, {
        reasoning: [
          'Old evidence is not thrown away — it counts for less as it ages, and never for nothing.',
          'This is here so an assumption from another part of the year is visible rather than silent.',
        ],
      }),
      belief: beliefKey('effect', verb),
    },
  }

  return { card, subject, days, domain: domainOf(episodes) }
}

/**
 * How many stale beliefs it takes before they become one card — AUD-0044.
 *
 * Three, not two. *"Do not group at two — a pair reads fine as a pair"*, and
 * the loss when a pair is grouped is real: two named beliefs each keep the
 * `belief` key the owner overrules them with, and the group cannot.
 */
export const STALE_BELIEFS_BEFORE_GROUPING = 3

/**
 * The stale-belief cards, grouped once there are enough of them — AUD-0044.
 *
 * ## The finding
 *
 * `staleBeliefCard` stands beside whichever card won rather than competing,
 * which is right — the age of the evidence is a different question from what it
 * says — and **nothing capped how many may stand beside**. After an ordinary
 * busy quarter, Insights rendered four consecutive *"GOING ON OLD EVIDENCE"*
 * cards: one template, four nouns.
 *
 * That is DEF-0026's class on a new surface. D-075 took exactly this off the
 * Life overview — *"two and a half phone screens, seven of the eleven lines
 * identical; every sentence was true; the screen was homework"* — and the
 * lesson was recorded as a decision about Life rather than as a rule about
 * owner surfaces, so it did not travel. What makes it pointed is that **the
 * top of this same screen already groups correctly**: the coverage card names
 * the areas, names the longest-silent one and points at the full list.
 *
 * ## So this is the coverage card's construction, one card kind away
 *
 * No new computation and no new data. The group names every belief it covers,
 * because a group that hid which one was oldest would trade one defect for
 * another, and it carries no `belief` key: a single key over four beliefs would
 * let a correction land on a belief the owner was not looking at.
 *
 * Deliberately before Phase 9 lays out the card stack, because the alternative
 * is styling the wall rather than removing it.
 */
export function staleBeliefCards(stale: readonly StaleBelief[]): readonly Built[] {
  if (stale.length < STALE_BELIEFS_BEFORE_GROUPING) return stale.map((entry) => entry.card)

  const oldest = stale.reduce((most, entry) => (entry.days > most.days ? entry : most))
  const youngest = stale.reduce((least, entry) => (entry.days < least.days ? entry : least))
  const domains = new Set(stale.map((entry) => entry.domain))
  const shared = domains.size === 1 ? [...domains][0] : undefined

  return [
    {
      rank: 65,
      insight: {
        id: 'stale:several',
        kind: 'stale-assumption',
        eyebrow: EYEBROW['stale-assumption'],
        domain: shared,
        headline: `${stale.length} things the app is still going on are ${describeDays(
          youngest.days,
        )} old or more — ${listNames(stale.map((entry) => lowerFirst(entry.subject)))}.`,
        detail: `${capitalise(lowerFirst(oldest.subject))} is the oldest, at ${describeDays(
          oldest.days,
        )}. Each is still being used when it comes up.`,
        confidence: undefined,
        /*
         * No belief key, for the same reason the coverage card has none.
         *
         * The individual card carries `beliefKey('effect', verb)` so the owner
         * can overrule the thing it is about. One key over four beliefs would
         * apply a correction to whichever verb happened to be first, which is
         * worse than offering no correction here — and the correction is not
         * lost: it lives beside the claim itself, on the card that actually
         * states what the app thinks (D-087's rule about where corrections go).
         */
        belief: undefined,
        sources: [],
        evidence: {
          comparable: stale.length,
          window: undefined,
          counted: undefined,
          rates: [],
          counterexamples: [],
          included: stale.flatMap((entry) => entry.card.insight.evidence.included),
          includedTitle: 'What has gone old',
          excluded: [],
          excludedTitle: undefined,
          strongerIn: undefined,
          weakerIn: undefined,
          trend: undefined,
          mix: undefined,
          reasoning: [
            'Old evidence is not thrown away — it counts for less as it ages, and never for nothing.',
            /*
             * The count is the one being grouped — QA-90-003.
             *
             * This sentence was written while the only case anybody had looked
             * at was the audit's four-card wall, and it said "four cards ...
             * four different subjects" as a literal. The threshold is
             * `STALE_BELIEFS_BEFORE_GROUPING`, which is **three**, so the very
             * first legal branch rendered a headline reading "3 things the app
             * is still going on" above an explanation of four — the card
             * contradicting its own count, on the surface whose whole job is to
             * be checkable.
             *
             * **The class is a rendered cardinality written as a literal**, and
             * it is worth naming because a literal is right on the day it is
             * written and silently wrong at every other size. Every count this
             * card renders — headline, comparable, and this line — now comes
             * from `stale.length`.
             */
            `These are grouped because ${stale.length} cards saying the same thing about ${stale.length} different subjects is a wall, not a finding.`,
          ],
        },
      },
    },
  ]
}

/** "a, b and c" — the joiner the coverage card uses, so the two agree. */
function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

// ---------------------------------------------------------------------------
// Coverage, trajectory and season — readings of the record rather than beliefs
// ---------------------------------------------------------------------------

/**
 * What the record shows follows one action (D-089, D-091).
 *
 * Everything difficult about this card is in what it is allowed to say, and
 * each restriction below is a defect that reached the owner's screen.
 *
 * It is scoped to the **action**, not the verb: four walks and four bike rides
 * are two findings, never one finding printed under whichever name came first.
 * It reads the **band tonight falls in** when the bands disagree, because a
 * relationship that held every weekday and on no weekend is not a relationship
 * that "holds about half the time". It counts only occasions the record can
 * actually place, and says how many it could not. And it carries a `belief`,
 * because it is the one card here that states a conclusion of the app's own —
 * so it is the one card the owner must be able to overrule.
 *
 * It never says cause, in either direction. A lower reading afterwards is a
 * lower reading.
 */
function associationCard(found: ObservedAssociation, situation: Situation): Built | undefined {
  const episodes = situation.learning.episodes.filter(
    (episode) => actionScopeOf(episode.semantics.target) === found.scope,
  )
  const reading = lowerFirst(found.label)

  if (found.withheld !== undefined) return undefined

  /*
   * The object's own name, and **only** the object's own name — "a walk", not
   * "getting out for a walk" and not "getting some movement in".
   *
   * This sentence has to say "after X than without one", and the gerund phrase
   * the pattern cards lead with does not survive that shape: "after getting out
   * for a walk than without one" is not something a person would say.
   *
   * The verb's phrase is not an acceptable fallback here, which is what makes
   * this different from every other card in the file. A relationship is scoped
   * to the action (D-091), so a walk and a bike ride are two findings with two
   * sets of numbers — and falling back to the verb would print *both* of them
   * as "after getting some movement in", with different counts underneath and
   * nothing on screen to say which was which. That is the pooling defect
   * reappearing in the copy after the arithmetic was fixed. A finding the app
   * cannot name is one it may not state; `insightsFor` reports it as gathering
   * instead, where it makes no claim.
   */
  const thing = situation.entities.labelFor(found.object)
  if (thing === undefined) return undefined

  /*
   * Which reading the card states.
   *
   * Where two contexts materially disagree, the card states **both** and the
   * whole-record figure is not printed at all — not softened, not printed with
   * a caveat beside it. It describes an evening that never happened, and a
   * reader given a number plus a caveat remembers the number.
   */
  const split = found.splits.find((entry) => entry.disagree)
  const sides: readonly AssociationSide[] =
    split === undefined ? [found.overall] : [split.yes, split.no]

  const headline =
    split === undefined
      ? capitalise(sentenceFor(reading, thing, found.overall, false))
      : capitalise(
          `what follows ${thing} depends on when. ` +
            `${capitalise(sentenceFor(reading, thing, split.yes, true))} ` +
            `${capitalise(sentenceFor(reading, thing, split.no, true))}`,
        )

  const detail = sides
    .map(
      (side) =>
        `Higher afterwards on ${side.rosePresent} of ${side.present.length} occasions with ${thing} and ${side.roseAbsent} of ${side.absent.length} without${
          split === undefined ? '' : `, ${side.label}`
        }.`,
    )
    .join(' ')

  /*
   * Both groups, and the word "occasions" on the number.
   *
   * DEF-0038's rule: a card that cannot say honestly what its number is of does
   * not get to show one, and this one counts occasions — not readings, and not
   * the "comparable occasions" the belief cards count, because nothing here was
   * compared to tonight.
   */
  const counted = sides
    .map(
      (side) =>
        `${side.present.length} occasions with ${thing} and ${side.absent.length} without${
          split === undefined ? '' : ` ${side.label}`
        }`,
    )
    .join(', ')

  const all = [...sides.flatMap((side) => side.present), ...sides.flatMap((side) => side.absent)]

  return {
    rank: 95,
    insight: {
      id: `association:${found.scope}`,
      kind: 'state-association',
      eyebrow: EYEBROW['state-association'],
      domain: domainOf(episodes),
      headline,
      detail,
      /*
       * No confidence word, for the same reason a trajectory and a coverage gap
       * carry none: this reports what the record contains rather than a
       * conclusion drawn from it. "Fairly consistent" over a comparison would
       * attach to the relationship, which is precisely the claim this card is
       * arranged not to make. How much there is, is said in `counted`.
       */
      confidence: undefined,
      // Empty: filled from what this card cites. See `withSources`.
      sources: [],
      evidence: {
        comparable: all.length,
        window: found.window,
        counted: `${counted}${
          found.window === undefined
            ? '.'
            : `, between ${describeDay(found.window.from)} and ${describeDay(found.window.to)}.`
        }`,
        /*
         * No `MeasuredRate` here, and that is deliberate rather than an
         * omission. The four measured aspects are all tallies of the owner's
         * own judgments about an action; this is neither an aspect nor a
         * judgment, and rendering it through the same component would put it in
         * the same column as the thing it exists to be distinguished from.
         */
        rates: [],
        counterexamples: [],
        included: linesFor(
          sides.flatMap((side) => side.present),
          found,
          reading,
          thing,
          split !== undefined,
          true,
        ),
        includedTitle: `Occasions with ${thing}`,
        excludedTitle: `Occasions without ${thing}`,
        excluded: linesFor(
          sides.flatMap((side) => side.absent),
          found,
          reading,
          thing,
          split !== undefined,
          false,
        ),
        strongerIn: undefined,
        weakerIn: undefined,
        trend: undefined,
        mix: undefined,
        reasoning: reasoningFor(found, reading, thing, split !== undefined),
      },
      /*
       * The one card here that can be wrong about his life rather than about
       * his own opinions, so the one that has to be correctable (D-091).
       *
       * Rejecting it deletes no reading. The readings stay, the occasions stay,
       * and what stops counting toward *this conclusion* is everything before
       * the moment he said so — so the app can reach the opposite conclusion
       * later, from evidence he has not disputed.
       */
      belief: associationBeliefKey(found.scope),
      beliefLabel: `what the app has worked out follows ${thing}`,
    },
  }
}

/** One side of the comparison, as a sentence. */
function sentenceFor(
  reading: string,
  thing: string,
  side: AssociationSide,
  banded: boolean,
): string {
  const where = banded ? ` ${side.label}` : ''
  switch (side.direction) {
    case 'higher':
      return `${reading} has more often been higher after ${thing} than without one${where}.`
    case 'lower':
      return `${reading} has more often been lower after ${thing} than without one${where}.`
    case 'no different':
      return `${reading} moves about the same whether or not ${thing} happens${where}.`
  }
}

function linesFor(
  pairs: readonly ChangePair[],
  found: ObservedAssociation,
  reading: string,
  thing: string,
  banded: boolean,
  present: boolean,
): readonly EvidenceLine[] {
  return [...pairs]
    .sort((a, b) => b.at - a.at)
    .map((pair) => ({
      record: pair.records[0] ?? (found.concept as unknown as RecordId),
      when: pair.dayId,
      text:
        `${describeDay(pair.dayId)} — ${reading} went ${pair.rose ? 'up' : 'down or stayed'}` +
        `${present ? ` after ${thing}` : `, without ${thing}`}` +
        `${banded ? ` (${pair.weekend ? 'weekend' : 'weekday'}, ${pair.evening ? 'evening' : 'earlier in the day'})` : ''}`,
    }))
}

/**
 * How the comparison was arrived at, in the owner's language.
 *
 * Every line states something that was actually checked. The confounding line
 * in particular names *what* was looked for, because the version that said
 * "nothing else happened in between" had checked completed suggestions only,
 * and four events recorded between the two readings had not been looked at at
 * all (DEF-0049).
 */
function reasoningFor(
  found: ObservedAssociation,
  reading: string,
  thing: string,
  banded: boolean,
): readonly string[] {
  const lines = [
    `Both sides come from the same rule: two readings of ${reading} close enough together to be about the same stretch of the day, sorted by whether ${thing} happened in between.`,
    `Only ${thing} counts as ${thing}. Anything else you did, even something similar, is a separate comparison and is not pooled with this one.`,
  ]

  if (banded) {
    lines.push(
      'The record disagrees with itself depending on when, so it is reported that way rather than averaged into a single figure that would describe neither.',
    )
  }

  lines.push(
    found.confounded === 0
      ? 'No occasion had to be left out for something else recorded in between — another suggestion completed, a change in circumstances, a constraint, or something noted about someone.'
      : `${found.confounded} ${found.confounded === 1 ? 'occasion was' : 'occasions were'} left out because something else was recorded in between — another suggestion completed, a change in circumstances, a constraint, or something noted about someone — which would have made them evidence about neither.`,
  )

  lines.push(
    found.unknownExposure === 0
      ? 'Every occasion counted is one the record can place on one side or the other.'
      : `${found.unknownExposure} ${found.unknownExposure === 1 ? 'occasion is' : 'occasions are'} in neither group, because nothing in the record says whether ${thing} happened. Not knowing is not the same as it not happening, so they are left out rather than counted as without.`,
  )

  lines.push(
    'This says what has followed what. It is not a claim that one brought the other about, and a lower reading afterwards is a lower reading rather than a sign of something going wrong.',
    'It can only compare occasions where a reading exists on both sides, so it describes the record rather than every occasion.',
  )

  return lines
}

function coverageCards(situation: Situation): readonly Built[] {
  /*
   * Never the private area, of the app's own accord.
   *
   * Section 11 makes Private / Sexual Health manual-entry-first and says the
   * owner should not be treated as though he must answer unsolicited private
   * questions. `coverage.mostNeglected` already excludes it for the limiter on
   * Now, and a card here would be the same prompt in a different place. It is
   * still reported on Life and on its own page, which is where the owner goes
   * when he wants it.
   */
  const quiet = situation.coverage.neglected.filter((domain) =>
    mayRaiseUnasked(situation.domains.defaultPrivacyFor(domain.domain)),
  )
  if (quiet.length === 0) return []

  const lines: EvidenceLine[] = []
  for (const domain of quiet) {
    for (const concept of domain.concepts) {
      if (!concept.standing) continue
      lines.push({
        record: (concept.evidence[0] ?? concept.concept) as RecordId,
        when: localDayIdAt(concept.lastEvidenceAt ?? situation.at, situation.zone),
        /*
         * Why there is no evidence, not one sentence for every way of having
         * none — QA-82-008's sibling on this surface.
         *
         * This line said "never answered" whenever the concept had no standing
         * evidence, and `lastEvidenceAt` is undefined for **every** unknown
         * reason rather than only for the one that means nobody ever asked. A
         * standing concept the owner answered and then withdrew, inside an
         * area that has gone quiet for some other reason, read here as one he
         * had never been asked about — the same false sentence the review
         * export was printing, on a different surface and from a different
         * field. `describeUnknown` is the one place it is written.
         */
        text:
          concept.unknown === undefined
            ? `${concept.label} — last heard ${describeDays(concept.daysSince ?? 0)} ago`
            : `${concept.label} — ${describeUnknown(concept.unknown)}`,
      })
    }
  }

  /*
   * From the areas themselves, not from the lines above.
   *
   * A coverage card's evidence lines name concepts rather than records — a
   * concept nobody has ever answered has no record to cite — so resolving them
   * yields nothing. The claim the card makes is about the *areas*, and the
   * areas already know every origin heard about them.
   */
  const quietSources = [...new Set(quiet.flatMap((domain) => domain.sources))].sort()

  const reasoning = [
    'This is the same reading Life shows, from the same computation the decision on Now was made from.',
    'How long counts as too long is set by the thing itself: three days of silence about sleep is not the same as three days of silence about money.',
  ]

  const evidence: PatternEvidence = {
    comparable: quiet.length,
    window: undefined,
    // The list below names each thing and how long it has been, which is the
    // count said properly. A tally on top of it would say nothing extra.
    counted: undefined,
    rates: [],
    counterexamples: [],
    included: lines,
    includedTitle: 'What is overdue here',
    excluded: [],
    excludedTitle: undefined,
    strongerIn: undefined,
    weakerIn: undefined,
    trend: undefined,
    mix: undefined,
    reasoning,
  }

  /*
   * One card, however many areas have gone quiet.
   *
   * A card each is the wall D-075 already took off Life: five panels saying the
   * same thing about five different names, on the screen whose whole job is to
   * be readable. The overview those five belong on already exists.
   */
  const first = quiet[0]
  if (quiet.length === 1 && first !== undefined) {
    return [
      {
        rank: 85,
        insight: {
          id: `coverage:${first.domain}`,
          kind: 'coverage-gap',
          eyebrow: EYEBROW['coverage-gap'],
          domain: first.domain,
          headline: first.summary,
          detail:
            first.weakest === undefined
              ? 'Nothing in particular here is overdue — the area as a whole has just been silent.'
              : `${first.weakest.label} is the part that is actually overdue.`,
          // A reading of what has come in, not a conclusion about the owner —
          // so no confidence word. "Very consistent" under a gap would read as
          // a judgement about how consistently he has neglected something.
          confidence: undefined,
          sources: quietSources,
          evidence,
          belief: undefined,
        },
      },
    ]
  }

  const names = quiet.map((domain) => domain.label)
  const listed =
    names.length === 2
      ? `${names[0]} and ${names[1]}`
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  const worst = quiet.reduce((most, domain) =>
    (domain.daysSinceEvidence ?? 0) > (most.daysSinceEvidence ?? 0) ? domain : most,
  )

  return [
    {
      rank: 85,
      insight: {
        id: 'coverage:several',
        kind: 'coverage-gap',
        eyebrow: EYEBROW['coverage-gap'],
        domain: undefined,
        headline: `${quiet.length} areas have gone quiet — ${listed}.`,
        detail: `${worst.label} has been silent longest. Life has the full list, area by area.`,
        confidence: undefined,
        sources: quietSources,
        evidence,
        belief: undefined,
      },
    },
  ]
}

/**
 * A measured quantity, moving or holding, over the record's own span.
 *
 * No percentage and no causal claim: this says what the readings did, and
 * section 68's rule about association is why it stops there. "You have been
 * sleeping about an hour less" is a description. "Because of X" would be an
 * assertion the app cannot support from a run of numbers.
 *
 * **The arithmetic moved and the sentence did not** — AUD-0029. The audit asks
 * for the trajectory computation to become a reading a decision can consult,
 * *"as an extraction with the card output byte-identical"*, so every figure this
 * card prints now comes off `situation.trajectories` and every word of it is
 * still written here. `tests/synthetic/trajectory-reaches-a-decision.test.ts`
 * pins the whole library's cards against the digest taken before the move.
 *
 * The reading is gated on whether the app may *reason* from a concept, and the
 * card on whether it may *raise* one unprompted — two different questions, and
 * this is the one place the second is asked.
 */
function trajectoryCards(situation: Situation): readonly Built[] {
  const out: Built[] = []

  for (const [concept, trajectory] of situation.trajectories) {
    if (!trajectory.mayRaise) continue
    const { readings: ordered, first, last, before, after, direction } = trajectory
    const round = (value: number): string => describeReading(value, trajectory.scale)

    /*
     * "Label: reading", the same shape a domain page's "Recently" already uses.
     *
     * The alternative reads as broken grammar — "Hours slept last night has
     * been higher lately" makes the label the subject of a sentence it was
     * never written to be. The eyebrow above the card supplies the framing, so
     * the line itself only has to carry the numbers.
     */
    const headline =
      direction === 'steady'
        ? `${trajectory.label}: steady around ${round(after)}.`
        : `${trajectory.label}: about ${round(after)} lately, against ${round(before)} earlier.`

    out.push({
      rank: 30 + Math.min(10, ordered.length),
      insight: {
        id: `trajectory:${concept}`,
        kind: 'trajectory',
        eyebrow: EYEBROW.trajectory,
        domain: situation.concepts.definitionFor(concept).domain,
        headline,
        detail: `${ordered.length} readings between ${describeDay(first.dayId)} and ${describeDay(last.dayId)}.`,
        // The count is in the detail above, where it belongs. A confidence word
        // here would attach to the direction rather than to the readings —
        // "fairly consistent" under "you have been sleeping less lately" reads
        // as a claim about how consistent the fall is, which is not measured.
        confidence: undefined,
        // Empty: filled from what this card cites. See `withSources`.
        sources: [],
        evidence: {
          comparable: ordered.length,
          window: { from: first.dayId, to: last.dayId },
          // The card's own detail already says how many readings and over what
          // span. These are readings rather than occasions, and nothing here
          // was compared to anything.
          counted: undefined,
          // No rate: an average of a measured quantity is not a proportion of
          // anything, and printing one as a percentage would be a number
          // measuring nothing nameable.
          rates: [],
          counterexamples: [],
          included: ordered.map((reading) => ({
            record: reading.record,
            when: reading.dayId,
            text: `${describeDay(reading.dayId)} — ${round(reading.value)}`,
          })),
          includedTitle: 'Every reading',
          excluded: [],
          excludedTitle: undefined,
          strongerIn: undefined,
          weakerIn: undefined,
          trend: `${round(before)} across the first ${trajectory.earlier}, ${round(after)} across the last ${trajectory.later}.`,
          mix: undefined,
          reasoning: [
            'Every reading of this in the record, oldest first, split in half by date.',
            'This says what the numbers did. It is not a statement about why.',
          ],
        },
        belief: undefined,
      },
    })
  }

  return out
}

/**
 * How a long-range goal is actually going — AUD-0021.
 *
 * Section 21 asks that long-range direction reach the daily move, and until
 * this phase a goal was a statement plus a status: no date, no body of work, no
 * way to see whether it was moving. The record now carries both — a horizon the
 * owner set (AUD-0046) and a small set of named pieces — and this is where he
 * reads what they add up to.
 *
 * **Counts and a date, and nothing that grades him.** AUD-0021 names the risk
 * itself: a "4 of 9" reading is one short step from a completion percentage,
 * which is a score about a man's life by another name and is what section 22
 * forbids. So there is no rate on this card, no share in its evidence, and no
 * "on track" verdict — the two facts are put next to each other and he draws
 * the line.
 *
 * **It reports rather than concludes**, so it carries no confidence word and no
 * belief to disagree with. Which pieces have had a session is something the
 * record says; whether that is good enough is his to judge.
 */
function goalTrajectoryCards(situation: Situation): readonly Built[] {
  const out: Built[] = []

  for (const goal of situation.direction.goals) {
    const trajectory = describeGoalTrajectory(goal)
    if (trajectory === undefined) continue

    /*
     * A goal with no named pieces still cites the goal — routing 92.
     *
     * The lines were built from `goal.parts`, and most goals have none: the
     * model has to work with an empty list (AUD-0021 says so in as many words).
     * With no lines the card cited no record, `withSources` had nothing to
     * resolve, and the card reached the owner claiming no origin at all — which
     * `imported-origin.test.ts` calls a defect and could not catch until a
     * history held a goal with a horizon and no pieces. `money-item-due` is
     * that history.
     *
     * The fallback line is the honest one: what this card rests on, when there
     * are no pieces to list, is the goal he set and the date he put on it.
     */
    const included: EvidenceLine[] =
      goal.parts.length > 0
        ? goal.parts.map((part) => ({
            record: goal.source,
            when: situation.dayId,
            text: `${situation.entities.labelFor(part.ref) ?? part.ref.id} — ${
              part.covered ? 'has had a session' : 'no session yet'
            }`,
          }))
        : [{ record: goal.source, when: situation.dayId, text: goal.statement }]

    out.push({
      // Below a contradiction and a coverage gap, above a stable pattern: a
      // goal moving slowly is worth knowing and is not news the way something
      // going the other way is.
      rank: 45,
      insight: {
        id: `goal:${goal.source}`,
        kind: 'trajectory',
        eyebrow: EYEBROW.trajectory,
        domain: goal.domain,
        headline: goal.statement,
        detail: trajectory,
        confidence: undefined,
        // Empty: filled from what this card cites. See `withSources`.
        sources: [],
        evidence: {
          comparable: goal.parts.length,
          window: undefined,
          // The detail line above already says how many pieces have moved, in
          // the owner's own units. A second tally would say nothing extra.
          counted: undefined,
          // No rate, deliberately. A proportion of a man's own certification is
          // the completion percentage AUD-0021 warns this card is one step from.
          rates: [],
          counterexamples: [],
          included,
          includedTitle: 'Every piece of this',
          excluded: [],
          excludedTitle: undefined,
          strongerIn: undefined,
          weakerIn: undefined,
          trend: undefined,
          mix: undefined,
          reasoning: [
            'A piece counts as having had a session when the record holds a completed move or an answered result about it.',
            'The date is the one you set on this goal. Nothing here says whether that is enough time.',
          ],
        },
        belief: undefined,
      },
    })
  }

  return out
}

/**
 * A standing arrangement, and the history that predates it (section 16).
 *
 * "Old evidence from another life season remains visible but may be less
 * predictive." A durable context is the app's own record of a season starting,
 * so this is a fact rather than an inference — which is the only version of a
 * life-season claim worth making on this evidence.
 */
function lifeSeasonCards(situation: Situation): readonly Built[] {
  const out: Built[] = []

  for (const record of situation.view.history.effective) {
    if (record.kind !== 'context') continue
    if (record.durability !== 'durable') continue
    if (record.validFrom > situation.at) continue
    if (record.validUntil !== undefined && situation.at >= record.validUntil) continue
    if (!mayRaiseUnasked(record.privacy)) continue

    const before = situation.view.history.effective.filter(
      (other) => other.occurredAt < record.validFrom,
    )
    if (before.length < 5) continue

    const definition = situation.concepts.definitionFor(record.concept)
    const from = localDayIdAt(record.validFrom, situation.zone)
    // What actually changed, not the name of the field it changed in. "Full
    // custody has been standing since 1 May" is a sentence about his life;
    // "Custody arrangement has been settled since 1 May" is a sentence about
    // the app's schema, which is what section 61 asks copy to stay out of.
    const what = discreetly(record.privacy, record.value, (ref) => situation.entities.labelFor(ref))

    out.push({
      rank: 50,
      insight: {
        id: `season:${record.id}`,
        kind: 'life-season',
        eyebrow: EYEBROW['life-season'],
        domain: definition.domain,
        headline: `${capitalise(what)} has been standing since ${describeDay(from)}.`,
        detail: `${before.length} entries here are from before that — a different season, still counted, and counting for less as they age.`,
        // Something the owner recorded, not something worked out.
        confidence: undefined,
        /*
         * Set here, because this card cites no evidence lines at all — its
         * headline quotes the arrangement and its detail counts what predates
         * it, and neither is a list. `withSources` therefore finds nothing to
         * resolve, and a card that says nothing about its origin is a card
         * drawn entirely from migrated history reading as though the owner had
         * told this app himself.
         *
         * Both halves of the sentence, because the badge covers both: the
         * arrangement, and the entries it is counting. A season standing on an
         * imported context above a decade of his own entries is mixed, and
         * mixed says nothing.
         */
        sources: [...new Set([record, ...before].map(evidenceSourceOf))].sort(),
        evidence: {
          comparable: before.length,
          window: undefined,
          // Said on the card itself, and they are entries rather than
          // occasions — nothing here was compared to anything either.
          counted: undefined,
          rates: [],
          counterexamples: [],
          included: [],
          includedTitle: undefined,
          excluded: [],
          excludedTitle: undefined,
          strongerIn: undefined,
          weakerIn: undefined,
          trend: undefined,
          mix: undefined,
          reasoning: [
            'Evidence from before a standing arrangement changed still counts, and counts for less the older it gets.',
            'Nothing is deleted when a season changes.',
          ],
        },
        belief: undefined,
      },
    })
  }

  return out
}

/**
 * How heavy the week itself has been — AUD-0007.
 *
 * ## The sentence the app could not say
 *
 * The audit's own framing: the app *"gains the ability to say the single most
 * humane thing it currently cannot: that this week has been hard and that is why
 * it is asking for less."* Everything needed for it was already in the record —
 * nights against the working baseline, effortful things actually finished, times
 * he said he could not — and nothing put the three next to each other.
 *
 * ## Why it is a reading rather than a conclusion
 *
 * No confidence word and no belief to disagree with, for the same reason a
 * trajectory card carries neither: this is a count of what the record holds over
 * seven days, not a claim about him. **"The week has been a heavy one"** is a
 * description; *"you are burning out"* would be a diagnosis, and section 4.4
 * forbids it. The detail line names every figure the level rests on, so the
 * owner can disagree with the arithmetic rather than with the app's opinion of
 * him.
 *
 * ## And an ordinary or light week produces nothing
 *
 * `describeWeekLoad` speaks only for `heavy`, so most weeks put no card on the
 * screen at all. A card that appears every seven days saying the week was
 * ordinary is the life-administration noise section 65 exists to prevent, and it
 * would teach the owner to stop reading this part of the screen. The light
 * reading still does its work in `similarity`, silently — which is the same
 * separation D-187 draws between a reading the app holds and a reading it
 * announces.
 */
function weekLoadCards(situation: Situation): readonly Built[] {
  const load = situation.weekLoad
  if (!isUsable(load)) return []
  const headline = describeWeekLoad(load.value, situation.weekLoadEvidence)
  if (headline === undefined) return []

  const evidence = situation.weekLoadEvidence
  /*
   * Set here rather than left to `withSources`, for `lifeSeasonCards`' reason:
   * this card cites no evidence *lines*, so the derivation would find nothing to
   * resolve and a card drawn entirely from imported history would read as though
   * the owner had told this app himself.
   */
  const cited = new Set(evidence.basis)
  const sources = [
    ...new Set(
      situation.view.history.effective
        .filter((record) => cited.has(record.id))
        .map(evidenceSourceOf),
    ),
  ].sort()

  return [
    {
      rank: 45,
      insight: {
        id: 'week-load',
        kind: 'life-season',
        eyebrow: EYEBROW['life-season'],
        // No area: a week is not an area of his life, and filing it under one
        // would put it on a domain page it is not about.
        domain: undefined,
        headline,
        detail: describeWeekLoadCount(evidence),
        // A count of what the record holds, not a conclusion drawn from it.
        confidence: undefined,
        sources,
        evidence: {
          comparable: evidence.basis.length,
          window: undefined,
          // Said on the card itself, and they are entries rather than occasions
          // — nothing here was compared to anything.
          counted: undefined,
          // No rate: three counts of different things share no denominator, and
          // dividing one by another would be a figure measuring nothing.
          rates: [],
          counterexamples: [],
          included: [],
          includedTitle: undefined,
          excluded: [],
          excludedTitle: undefined,
          strongerIn: undefined,
          weakerIn: undefined,
          trend: undefined,
          mix: undefined,
          reasoning: [
            'Rest against the working baseline, demanding moves finished, and times you said you could not — over the last seven days.',
            'This says what the record holds. It is not a statement about how you are.',
          ],
        },
        belief: undefined,
      },
    },
  ]
}

/**
 * The review, on the surface the evidence is already on — F03, F08, F31, F34.
 *
 * D-169: *"the product gains an in-product way to ask 'what changed, what did I
 * achieve, what matters, and what should change next?' It lives on Insights and
 * the relevant domain pages, where the evidence and its provenance already are.
 * It does not get a top-level navigation tab."*
 *
 * So these are cards rather than a screen, and there is **no weekly ritual**: a
 * review the owner must perform is life administration, which sections 4.5 and
 * 65 both forbid. Each appears only when the record actually holds the thing it
 * is about, and each says what it counted.
 *
 * **They report and never grade.** *"Nothing has moved on this in twenty-one
 * days"* is the record; *"you are falling behind"* is a verdict on a man.
 */
function reviewCards(situation: Situation): readonly Built[] {
  const out: Built[] = []
  const episodes = collectEpisodes(situation.view, situation.zone)

  /*
   * A strategy that has not moved — F03.
   *
   * *"A plausible action repeated faithfully can still be the wrong route. The
   * owner wants the system to notice that rather than spend months executing a
   * bad plan."* What the app may honestly notice is the **record**: how long it
   * has been, and how many occasions it holds. Which route to take instead is
   * routing 95's, and proposing one on a fortnight's silence would be the app
   * changing his plan for him.
   */
  for (const stalled of stalledStrategies(
    situation.direction.destinations,
    episodes,
    situation.dayId,
  )) {
    out.push({
      rank: 72,
      insight: {
        id: `stalled:${stalled.destination.id}`,
        kind: 'stale-assumption',
        eyebrow: EYEBROW['stale-assumption'],
        domain: stalled.domain,
        headline:
          stalled.milestone === undefined
            ? `${capitalise(stalled.aim)} has gone quiet.`
            : `${capitalise(stalled.milestone)} has gone quiet.`,
        detail: describeStall(stalled),
        // A count of days and occasions, not a conclusion about the strategy.
        confidence: undefined,
        sources: [],
        evidence: {
          comparable: stalled.attempts,
          window: undefined,
          counted: undefined,
          rates: [],
          counterexamples: [],
          included: [],
          includedTitle: undefined,
          excluded: [],
          excludedTitle: undefined,
          strongerIn: undefined,
          weakerIn: undefined,
          trend: undefined,
          mix: undefined,
          reasoning: [
            'Days since anything at all was recorded in this area, counted from the day the step was named.',
            'This says what the record holds. It does not say the approach is wrong, and it does not propose another.',
          ],
        },
        belief: undefined,
      },
    })
  }

  /*
   * One obstacle defeating several moves — F08.
   *
   * The half C21's enforcement cannot see: it removes a move a standing blocker
   * is *about*, and this is the same cause beating **different** moves, which no
   * per-move rule can notice. It names the count and nothing about him — D-045
   * keeps inability separate from decline and from character.
   */
  for (const recurring of recurringBlockers(situation)) {
    /*
     * Named off a local rather than off the field, and it is not the guard being
     * dodged — it is the guard doing its job on a blunt sweep. `causal` walks
     * every string literal in this file, so `recurring-blocker:${recurring.cause}`
     * matched `/\bcauses?\b/` on an **identifier**. Weakening the sweep to
     * exempt identifiers would exempt `"improves"` too. Renaming one
     * interpolation is the smaller price, and `kind` is the better word for it
     * anyway: what the id names is which of the eight it was.
     */
    const kind = recurring.cause
    out.push({
      rank: 70,
      insight: {
        id: `recurring-blocker:${kind}`,
        kind: 'repeated-friction',
        eyebrow: EYEBROW['repeated-friction'],
        domain: undefined,
        headline: describeRecurring(recurring),
        detail:
          'Recorded each time you said what was in the way. It is never read as unwillingness.',
        confidence: undefined,
        sources: [],
        evidence: {
          comparable: recurring.times,
          window: undefined,
          counted: undefined,
          rates: [],
          counterexamples: [],
          included: [],
          includedTitle: undefined,
          excluded: [],
          excludedTitle: undefined,
          strongerIn: undefined,
          weakerIn: undefined,
          trend: undefined,
          mix: undefined,
          reasoning: [
            'Every time you said what was in the way, over the last four weeks, grouped by what you said.',
            'It appears once the same answer has stopped more than one thing.',
          ],
        },
        belief: undefined,
      },
    })
  }

  /*
   * What the app still holds you to — F31, and C21's own safety net.
   *
   * F31 asks the app to *"show which intentions and constraints may need
   * revision"*, and routing 93 is the phase that makes it matter: until C21's
   * enforcement landed a standing constraint was shown and never acted on, so a
   * stale one cost nothing. It costs a move now, which is exactly why the owner
   * needs to be able to see the list and take one back.
   *
   * **It asks no question.** F31's *"one useful reorientation question"* is a tap
   * on a three-a-day budget, and what this shows is already actionable from the
   * area's own page where "Not true any more" has lived since routing 84.
   */
  const standing = situation.constraints.filter((constraint) =>
    String(constraint.concept).startsWith('blocker.'),
  )
  if (standing.length > 0) {
    out.push({
      rank: 68,
      insight: {
        id: 'standing-constraints',
        kind: 'stale-assumption',
        eyebrow: EYEBROW['stale-assumption'],
        domain: undefined,
        headline:
          standing.length === 1
            ? 'One thing you told the app is still stopping a move.'
            : `${standing.length} things you told the app are still stopping moves.`,
        detail: `${standing.map((constraint) => constraint.description).join(' ')} Each one can be taken back from the area it belongs to.`,
        confidence: undefined,
        sources: [],
        evidence: {
          comparable: standing.length,
          window: undefined,
          counted: undefined,
          rates: [],
          counterexamples: [],
          included: [],
          includedTitle: undefined,
          excluded: [],
          excludedTitle: undefined,
          strongerIn: undefined,
          weakerIn: undefined,
          trend: undefined,
          mix: undefined,
          reasoning: [
            'Everything you have said is standing in the way of a particular move, and has not been taken back.',
            'These are the ones the app acts on, which is why they are worth reading.',
          ],
        },
        belief: undefined,
      },
    })
  }

  /*
   * **F44's measurable half is deliberately not a card here** — D-279.
   *
   * A first draft put the three counts on Insights and it fired on nine
   * histories at every hour, which is forty-seven more times the app opens its
   * mouth for a reading that does not change from one day to the next. F44's own
   * warning is that a system can optimise compliance with itself, and a standing
   * card counting the owner's taps every single day is that shape with a humane
   * label on it.
   *
   * So it lives in the **export's diagnostics section** — read on demand, in the
   * document D-169 and F34 are actually about, beside the other measurements the
   * app makes of itself. `intelligence/review.ts` holds the measurement; nothing
   * about it is a card.
   */

  return out
}

// ---------------------------------------------------------------------------

/**
 * A pattern the app is watching and cannot yet say anything about.
 *
 * Section 51: *"the absence of enough evidence is a valid result"*, and *"weak
 * evidence produces an honest 'not enough evidence yet' state rather than
 * invented precision"*. Without this the honest answer is invisible — a move
 * with two occasions simply produces no card, which reads as the app having
 * nothing to say rather than as the app declining to say it.
 *
 * Deliberately one quiet list rather than a card each. Nine cards saying
 * nothing is a wall, and this is the part of the screen that should be dull.
 */
export interface GatheringLine {
  readonly subject: string
  readonly occasions: number
  /** What it would take. Concrete, so the number is not a mystery. */
  readonly needs: string
  /**
   * Which area it belongs to, where that is knowable — AUD-0043.
   *
   * Carried on the line rather than recomputed by whoever wants to filter it.
   * A domain page asking *"what is the app working out here?"* has to read the
   * same list Insights reads, or the two screens eventually disagree about what
   * is in progress and the owner cannot tell which is lying — the coverage
   * precedent, and the reason `domainPages.ts` is forbidden to decide anything.
   *
   * `undefined` where the episodes behind the line have no majority area, which
   * `domainOf` already returns for a mixed run. A line with no area is still a
   * true gathering line; it simply has no page to be shown on.
   */
  readonly domain?: LifeDomainId
}

/**
 * Everything worth saying about this history, and everything not yet worth
 * saying.
 *
 * The cards are ordered by how much the owner would want to know rather than by
 * how much evidence sits behind them: something that has changed, or gone
 * against the run, or gone quiet, beats a stable pattern he already knows.
 */
export interface InsightsReport {
  readonly insights: readonly Insight[]
  readonly gathering: readonly GatheringLine[]
}

export function insightsFor(situation: Situation): InsightsReport {
  const built: Built[] = []
  const gathering: GatheringLine[] = []

  /*
   * Observed relationships first, and they lead the screen.
   *
   * First in the code because a belief card about the same move defers to one
   * (below), and first on the screen because they are the only cards here that
   * are not a summary of the owner's own opinions. Ranked at 95 — above a
   * contradiction, the highest a belief card reaches.
   */
  const observed = new Set<ActionVerb>()
  for (const found of situation.learning.associations) {
    const card = associationCard(found, situation)
    if (card !== undefined) {
      built.push(card)
      observed.add(found.verb)
      continue
    }
    /*
     * Named by the action, not the verb.
     *
     * Two objects under one verb are two of these lines, and each has to be
     * about its own object — "current energy after a bike ride" is a different
     * report from "current energy after a walk", and running them together
     * under the verb's name is the identity defect one layer up (D-091).
     *
     * The second branch is the finding the app has but cannot name. It states
     * nothing, which is why the verb's phrase is allowed here and forbidden on
     * the card: a gathering line makes no claim about what happened, so two of
     * them reading alike misleads nobody.
     */
    const named = situation.entities.labelFor(found.object)
    const needs =
      found.withheld ??
      (named === undefined ? 'the app has no name for what this is about' : undefined)
    if (needs === undefined) continue

    const associationDomain = situation.entities.resolve(found.object)?.domain
    gathering.push({
      subject: `${capitalise(lowerFirst(found.label))} after ${lowerFirst(
        patternNameFor(found.verb, named),
      )}`,
      occasions: found.overall.present.length + found.overall.absent.length,
      needs,
      ...(associationDomain === undefined ? {} : { domain: associationDomain }),
    })
  }

  const stale: StaleBelief[] = []

  for (const [verb, episodes] of episodesByVerb(situation)) {
    /*
     * Growth has its own sufficiency rule, and two of them on one screen is a
     * contradiction — AUD-0037.
     *
     * `GROWTH_OCCASIONS` is 3 and `MIN_FOR_A_RATE` is 4, and they measure
     * different quantities: how many occasions before the app asks whether
     * something about *her* has changed, and how many before it can state a
     * rate about what follows a *move*. The owner does not know that. At one
     * instant, in one build, about one skill, Now asked him to conclude she had
     * mastered it while Insights said the evidence needed one more occasion —
     * and whichever he read second undermined the first.
     *
     * Excluding the verb rather than relabelling both: `growth.ts` decides
     * sufficiency here, the growth suggestion carries its own evidence line
     * (AUD-0049), and nothing is lost.
     */
    if (verb === 'growth-opportunity') continue
    /*
     * **One card per move about what happens when you do it.**
     *
     * Each of these four answers the same owner question — *how does this
     * actually go?* — from a different angle, and more than one of them can be
     * true at once. Printing two would put "Getting out for a walk usually
     * makes a difference" directly above "Getting out for a walk has stopped
     * doing what it used to", both from the same run of episodes, both correct,
     * and the screen as a whole wrong. That is DEF-0033's class exactly: a
     * contradiction between two lines the reader has no way to reconcile.
     *
     * So they are ordered by how much of the story each one carries and the
     * first that fires wins. A context split leads, because it is the one that
     * *explains* the exceptions rather than reporting them: on twelve evenings
     * clearing the kitchen, "usually helps, and on 20 June it did not" presents
     * as random what is in fact systematic — it helped on all six weekday
     * evenings and on two of six weekends. A change subsumes the single
     * counterexample that signalled it, and both subsume the flat average.
     *
     * Whichever wins, the split and the trend are still computed and still
     * reach the deeper view (`splitAndTrend`), so nothing found is lost — only
     * the headline is chosen.
     */
    const whatHappens =
      contextCard(verb, episodes, situation) ??
      changeCard(verb, episodes, situation) ??
      contradictionCard(verb, episodes, situation) ??
      patternCard(verb, episodes, situation)

    /*
     * And an observed relationship displaces the belief card entirely (D-089).
     *
     * The same rule, extended to the card D-089 added, for the same reason:
     * "You usually say getting out for a walk makes a difference" directly
     * under "Current energy has more often been higher after a walk than
     * without it" is two statements about one move — one a summary of his
     * opinions, one a finding — with nothing on the screen saying which is
     * which. That is the confusion this whole repair exists to remove, so
     * printing both would reintroduce it in a new place.
     *
     * Repeated friction survives, because it answers a question the
     * association does not: whether the move happens at all.
     */
    const kept =
      observed.has(verb) && whatHappens?.insight.kind !== 'repeated-friction'
        ? undefined
        : whatHappens

    /*
     * The age of the evidence is a different question from what it says, so
     * this one stands beside whichever card won rather than competing with it.
     *
     * Collected rather than pushed — AUD-0044. Whether it renders as its own
     * card or as one line of a group is a question about the whole screen, and
     * a card built one verb at a time has no view of the others. That is the
     * finding's own likely root cause.
     */
    const staleHere = staleBeliefCard(verb, episodes, situation)
    if (staleHere !== undefined) stale.push(staleHere)

    if (kept !== undefined) built.push(kept)
    if (kept !== undefined || staleHere !== undefined) continue

    // Nothing said, and nothing to say — but only report that where the app is
    // not already reporting something observed about the same move.
    if (observed.has(verb)) continue

    const subject = patternName(verb, episodes, situation)
    const best = ratesFor(episodes, subject).reduce<number>(
      (most, rate) => Math.max(most, rate.of),
      0,
    )
    const short = MIN_FOR_A_RATE - best
    const episodeDomain = domainOf(episodes)
    gathering.push({
      subject,
      occasions: episodes.length,
      needs:
        best === 0
          ? 'nothing has come back about it yet'
          : short === 1
            ? 'one more occasion like these'
            : `${short} more occasions like these`,
      ...(episodeDomain === undefined ? {} : { domain: episodeDomain }),
    })
  }

  built.push(...staleBeliefCards(stale))
  built.push(...coverageCards(situation))
  built.push(...trajectoryCards(situation))
  built.push(...goalTrajectoryCards(situation))
  built.push(...lifeSeasonCards(situation))
  built.push(...weekLoadCards(situation))
  built.push(...reviewCards(situation))

  return {
    insights: built
      .sort((a, b) => b.rank - a.rank || a.insight.id.localeCompare(b.insight.id))
      .map((entry) => withSources(entry.insight, situation)),
    gathering: gathering.sort((a, b) => b.occasions - a.occasions),
  }
}

/**
 * Where a card's evidence came from, filled in once for every kind.
 *
 * Every builder would otherwise have to remember, and a card added next year
 * would silently claim the owner's. So it is derived here from what the card
 * already cites: the records named by its own evidence lines.
 *
 * A card that set `sources` itself keeps it. Coverage cards do, because their
 * lines name concepts rather than records — see `coverageCards`.
 *
 * Lines whose record does not resolve contribute nothing rather than being
 * guessed at. An unresolvable citation is not evidence of the owner's
 * authorship; it is evidence of nothing, and the whole rule here is that a
 * mixed or unknown basis says nothing at all.
 */
function withSources(insight: Insight, situation: Situation): Insight {
  if (insight.sources.length > 0) return insight
  const cited = [
    ...insight.evidence.included,
    ...insight.evidence.counterexamples,
    ...insight.evidence.excluded,
  ]
  const sources = new Set<ProvenanceSource>()
  for (const line of cited) {
    const record = situation.view.history.byId(line.record)
    if (record !== undefined) sources.add(evidenceSourceOf(record))
  }
  return { ...insight, sources: [...sources].sort() }
}

// ---------------------------------------------------------------------------
// The evidence behind the decision currently on Now (section 51)
// ---------------------------------------------------------------------------

export interface ConditionLine {
  readonly concept: ConceptId
  readonly label: string
  readonly reading: string
  /** False when the app leaned on this and does not know it. */
  readonly known: boolean
}

export interface DecisionEvidence {
  /** The move this is the evidence for, exactly as Now already says it. */
  readonly move: string
  /** Current conditions the decision actually leaned on — never everything known. */
  readonly conditions: readonly ConditionLine[]
  /**
   * Why later rather than now, on a held decision — QA-82-002.
   *
   * Empty on every other kind, and load-bearing on this one. A hold is the only
   * decision where the sentence on Now is not a move, so *why this?* means
   * something different: the owner is not asking why a walk, he is asking why
   * not yet. The panel answered the first question and the screen was asking
   * the second — the conditions, the counts and the comparable occasions were
   * all about the move, and the deferral was nowhere on the panel that exists
   * to explain the decision.
   *
   * Read off `decision.heldBecause`, which the arbiter wrote when it made the
   * deferral. Nothing here is recomputed, so there is nothing to disagree with.
   */
  readonly deferral: readonly string[]
  /**
   * How many comparable situations there were, in a sentence.
   *
   * There is deliberately no limiter here. Now already prints it directly under
   * the decision, with the label the limiter carries for its own kind (D-073),
   * and repeating it one tap lower would be section 61'''s repeated boilerplate
   * on the screen with the least room for it.
   */
  readonly comparable: string
  readonly window: { readonly from: LocalDayId; readonly to: LocalDayId } | undefined
  readonly rates: readonly MeasuredRate[]
  readonly counterexamples: readonly EvidenceLine[]
  readonly confidence: PatternConfidence
  /**
   * Where this move goes better, across the whole record rather than only
   * across evenings like tonight.
   *
   * Present only when a split has enough evidence on both sides, and labelled
   * in full when it is — the two sets of counts in this panel are over
   * different sets of evenings, and a reader comparing them is entitled to know
   * that. Insights can lead a card on this same split, so showing it here is
   * what stops two surfaces quoting different figures for the same move with
   * nothing to reconcile them: DEF-0033''''s class, arriving as two numbers
   * instead of as two sentences.
   */
  readonly context: string | undefined
  /**
   * What the app took from those evenings, in the words Now already used.
   *
   * Present so the summary and the counts can be read together. Without it the
   * panel puts "8 of 12 made a difference afterwards" under a line on Now
   * saying the move "has made little difference in situations like tonight" —
   * two honest statements about different quantities, with nothing on the
   * screen to reconcile them. That is DEF-0033's class, and the fix is not to
   * suppress one of them but to show what separates them: the belief leans
   * harder on the evenings most like tonight, and `context` says which side of
   * that tonight is on.
   *
   * Absent when the learning has not moved anything worth stating — Now shows
   * no such line then either.
   */
  readonly concluded: string | undefined
  /**
   * What the record shows has followed this move, against occasions without it.
   *
   * The single most meaningful thing the panel can carry on a history the owner
   * never graded, and it was missing from the first version of this repair:
   * Insights led with the finding, the ranking used it, and the one surface
   * that exists to answer *why this?* said nothing about it. Absent where the
   * move has no observable dimension, or where the comparison has too little on
   * either side to stand on.
   */
  readonly observed: string | undefined
  /**
   * There is deliberately no runner-up here.
   *
   * Now prints "Chosen over" and "Why this one" directly under the decision,
   * from the same explanation, and has since Phase 2. Repeating both one tap
   * lower is section 61's repeated boilerplate — and on a phone it is two of
   * the four lines the panel opens with. The tradeoff stays in the first view,
   * where the owner already knows to look for it.
   */
  readonly mix: string | undefined
  readonly reasoning: readonly string[]
}

/**
 * What is behind the recommendation on screen right now.
 *
 * **Read off the decision, never recomputed.** Every field comes from the
 * `Decision` the surface already has — its explanation, its evaluation and its
 * own trace — plus raw counts over the episode set `learning.ts` selected for
 * this same context. Section 51 forbids a parallel explanation truth, and the
 * cheapest way to honour that is for there to be nothing here to disagree with:
 * the runner-up and the reason it lost are the arbiter's, the conditions are
 * the candidate's own `leansOn` list, and the confidence is counted over the
 * episodes the belief was built from.
 *
 * Returns nothing when there is no move on screen. A no-action evening has an
 * explanation of its own on Now, and offering "see evidence" for a decision
 * that was not made would be a button with nothing behind it.
 */
/**
 * Where a move goes better, and which side of that this moment is on.
 *
 * The last clause is the one that matters. Without it the panel states a split
 * and leaves the reader to work out which half applies — and the half that
 * applies is exactly what explains why the app's own conclusion is more
 * cautious than the plain tally directly above it.
 */
function describeSplitForNow(split: FoundSplit, context: DecisionContext): string {
  const strong = split.strongSide
  const weak = split.weakSide
  const answer = split.split.test(context)
  const here = hereNowWord(context.block)
  const which =
    answer === undefined
      ? ''
      : ` ${capitalise(here)} is ${answer ? split.split.label : split.split.opposite}.`

  return (
    `Across every occasion, not only the ones like ${here}: ` +
    `${strong.rate.hit} of ${strong.rate.of} ${strong.label}, ` +
    `${weak.rate.hit} of ${weak.rate.of} ${weak.label}.${which}`
  )
}

/**
 * The observed relationship in one line, for a panel that has room for one.
 *
 * Both counts, because the comparison group is the whole reason the first
 * number means anything, and no causal word anywhere — the same discipline the
 * card follows, in a shorter sentence.
 *
 * It reads the same side of the comparison the ranking read, through the same
 * function, so the panel cannot quote a figure that did not reach the decision.
 * That is DEF-0039's class: a line and a tally that disagree leave the reader
 * to work out which one the app actually believes.
 */
function describeAssociationBriefly(
  found: ObservedAssociation | undefined,
  subject: string,
  at: Instant,
  zone: TimeZoneId,
  block: DayBlock,
): string | undefined {
  if (found === undefined || found.withheld !== undefined) return undefined

  const reading = lowerFirst(found.label)
  const side = applicableAssociation(found, at, zone)

  if (side === undefined) {
    return found.disagree
      ? `What follows ${subject} depends on the kind of occasion, and there is not enough of one like ${hereNowWord(block)} to say.`
      : undefined
  }

  const shape =
    side.direction === 'higher'
      ? 'more often been higher afterwards'
      : side.direction === 'lower'
        ? 'more often been lower afterwards'
        : 'moved about the same either way'
  const where = found.disagree ? `On occasions ${side.label}` : 'Across the whole record'
  return `${where}, ${reading} has ${shape} with ${subject} than without: ${side.rosePresent} of ${side.present.length} against ${side.roseAbsent} of ${side.absent.length}.`
}

export function evidenceForDecision(decision: Decision): DecisionEvidence | undefined {
  const explanation = decision.explanation
  const evaluation = decision.evaluation
  if (explanation === undefined || evaluation === undefined) return undefined

  const situation = decision.situation

  /*
   * The evidence is about the move, and on a deferral the move is not the
   * sentence — QA-83-001's sweep, and DEF-0033's class again.
   *
   * `engine.ts` composes a hold by taking the held move's semantics and
   * changing the verb to `hold`, so `explanation.semantics.target.verb` is
   * `hold` on a deferral. This panel read that verb for its counts and read
   * `explanation.restsOn` — computed from the held move's own verb, before the
   * rewrite — for its conclusion. So every deferral over a move with a learned
   * belief printed **"Nothing in the record is much like this morning yet"**
   * and **"too early to say · 0 occasions"** directly above **"Clearing the
   * kitchen has worked several times in situations like today."**
   *
   * Two honest statements about two different verbs, with nothing on the screen
   * to reconcile them. The evaluation's own target is the move either way —
   * identical to the explanation's on every decision that is not a hold — so
   * the counts and the conclusion are now about the same thing.
   *
   * `move` stays the sentence on screen, because that is what the owner is
   * looking at, and the deferral rows above still answer *why not yet*.
   */
  const target = evaluation.candidate.semantics.target
  const verb = target.verb
  const subject = situation.entities.labelFor(target.object)
  /*
   * Named from the set each label is about — QA-83-002's class.
   *
   * One `name`, taken from *this evening's* object, labelled two different
   * sets: the rates over `alike`, and the split over `everyOccasion`. Both are
   * pooled by verb, so a history with a walk and a bike ride under `move` would
   * have had its pooled rates read "how often getting out for **a walk** could
   * actually be done" — a claim narrower than the evidence it counts, which is
   * the same error as calling one occasion "the last few times" pointing the
   * other way.
   *
   * `patternName` is the rule and it was already here: name the object only
   * where the set agrees on one. It is now asked once per set rather than once
   * per screen.
   */

  const here = hereNowWord(situation.block)
  const leansOn = new Set<ConceptId>(evaluation.candidate.leansOn)
  const conditions: ConditionLine[] = []
  for (const fact of situation.considered) {
    if (!leansOn.has(fact.concept)) continue
    /*
     * Private detail never reaches Now, and the row is not dropped either.
     *
     * `privacy.ts` is explicit that a false answer from `mayShowDetail` means
     * "show that it exists, not what it says" — a surface that silently omitted
     * the row would tell the owner his history is thinner than it is.
     */
    const withheld = !mayShowDetail(fact.privacy, DISCREET_PRIMARY)
    /*
     * `ConsideredFact.reading` spells an absence as "not known — never-observed"
     * — the gap's own identifier, which is inspector language and belongs in
     * the QA trace rather than on Now (DEF-0007's class). The absence itself is
     * worth showing: a condition the app leaned on and does not know is part of
     * why it is hedging.
     */
    const reading = withheld
      ? discreetPlaceholder(fact.privacy)
      : fact.state === 'unknown'
        ? 'Not known yet'
        : fact.reading
    conditions.push({
      concept: fact.concept,
      label: fact.label,
      reading,
      known: fact.state !== 'unknown',
    })
  }

  const rejected = situation.learning.rejected.get(beliefKey('effect', verb))
  const alike = comparableEpisodes(
    situation.learning.episodes,
    verb,
    situation.context,
    { now: situation.at, zone: situation.zone },
    rejected,
  ).map((found) => found.episode)

  const counterexamples = new Map<RecordId, EvidenceLine>()
  for (const aspect of MEASURED_ASPECTS) {
    for (const episode of tallyFor(aspect, alike).against) {
      counterexamples.set(episode.recommendation, lineFor(episode, counterexampleNote(episode)))
    }
  }

  const everyOccasion = situation.learning.episodes.filter(
    (episode) =>
      episode.semantics.target.verb === verb &&
      episode.shownAt <= situation.at &&
      (rejected === undefined || episode.shownAt > rejected),
  )
  const split = strongestSplit(everyOccasion, patternName(verb, everyOccasion, situation))

  return {
    move: explanation.rendered.sentence,
    conditions,
    deferral: decision.heldBecause,
    comparable:
      alike.length === 0
        ? `Nothing in the record is much like ${here} yet.`
        : alike.length === 1
          ? `One occasion in the record is like ${here} — ${describeDay(alike[0]!.dayId)}.`
          : `${alike.length} occasions in the record are like ${here}.`,
    window: windowOf(alike),
    rates: ratesFor(alike, patternName(verb, alike, situation)),
    counterexamples: [...counterexamples.values()],
    confidence: confidenceFrom(alike.length, counterexamples.size),
    concluded: explanation.restsOn,
    /*
     * The object's own name, not the gerund the cards lead with. "with getting
     * out for a walk than without" is not something a person would say; "with a
     * walk than without" is. Same reason the card itself uses it.
     */
    observed: describeAssociationBriefly(
      situation.learning.associationFor(target),
      subject ?? lowerFirst(patternNameFor(verb, undefined)),
      situation.at,
      situation.zone,
      situation.block,
    ),
    context: split === undefined ? undefined : describeSplitForNow(split, situation.context),
    mix: describeEvidenceMix(evidenceRefsFor(alike)),
    /*
     * Written without "above" or "below".
     *
     * The panel's own order is a rendering decision and these sentences sit at
     * the end of it, so a reference to "the figures below" was pointing at a
     * block the reader had already scrolled past. Small, and exactly the kind
     * of thing that is only ever found by reading the assembled screen.
     */
    reasoning: [
      `The conditions listed are the ones the choice actually rested on, not everything the app knows about ${here}.`,
      /*
       * AUD-0036. The sentence itself was already the best thing on this panel
       * — an accurate, plain-English statement of what `similarity()` actually
       * compares — and the audit found it thrown away by one noun: at any hour
       * before six it was describing a different day. The noun is the only
       * thing that changed.
       */
      'An occasion counts as comparable on the same few things the app compares occasions on: the part of the day, how rested you are, whether it is a weekday, whether she is here, and roughly how much time there is.',
      'Each figure here measures one thing and says which. None of them are added together.',
    ],
  }
}
