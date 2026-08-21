import type { LifeDomainId } from '../domain/domains'
import type { RecordId } from '../domain/ids'
import type { ActionVerb } from '../domain/recommendation'
import {
  bearsConcept,
  describeFactValue,
  evidenceSourceOf,
  type DecisionContext,
  type FactValue,
} from '../domain/records'
import {
  civilDateFromDayId,
  localDayIdAt,
  localDaysBetween,
  type Instant,
  type LocalDayId,
} from '../domain/time'
import type { Decision } from './engine'
import { describeDays } from './coverage'
import { beliefKey, comparableEpisodes, describeEvidenceMix, type EvidenceRef } from './learning'
import type { Episode } from './lifecycle'
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
import type { Situation } from './situation'
import type { ConceptId, FreshnessHorizon } from '../domain/windows'

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

/** Readings a trajectory needs before it will describe a direction. */
const TRAJECTORY_READINGS = 6
/**
 * How long a run of readings has to cover, in the concept's own windows.
 *
 * Concept-relative for the same reason freshness and neglect already are
 * (section 8, D-061): six days of nightly sleep readings is a fortnight's worth
 * of evidence about sleep, and six days of readings about a cash buffer is one
 * afternoon's worth of evidence about money. A fixed number of days would be
 * right for one of them and wrong for the other.
 */
const TRAJECTORY_SPAN_WINDOWS = 6
const TRAJECTORY_SPAN_FLOOR_DAYS = 7
/** How far the two halves must differ before a trajectory claims a direction. */
const TRAJECTORY_SHIFT = 0.15

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
  'stable-strength': 'Works for you',
  'repeated-friction': 'Keeps getting in the way',
  'move-effectiveness': 'What actually happens',
  'context-effect': 'Depends on the evening',
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
  readonly evidence: PatternEvidence
  /**
   * The belief this states, so the owner has something to disagree with
   * (section 62). Absent where the card reports a fact rather than a belief —
   * a coverage gap and a trajectory are readings of the record, not
   * conclusions to be corrected.
   */
  readonly belief: string | undefined
}

// ---------------------------------------------------------------------------
// Naming the pattern
// ---------------------------------------------------------------------------

/**
 * What a pattern about this verb is called, with the subject in it.
 *
 * DEF-0028's rule applied one level up: a card that says "a suggestion here"
 * four times is the generic language section 4.6 asks the app not to settle for
 * when the subject is known. The object is used where the sentence reads
 * naturally with it, and the fallback names the kind of move rather than
 * reaching for a pronoun.
 *
 * Written per verb rather than composed from a pattern, for the reason the
 * outcome prompts are: a template general enough to cover a lab, a daughter and
 * a night's sleep produces a sentence nobody would say out loud.
 */
const PATTERN_NAME: Record<ActionVerb, (object: string | undefined) => string> = {
  'recall-practice': (o) => (o === undefined ? 'Recall practice' : `Recall practice on ${o}`),
  'review-weak-topic': (o) =>
    o === undefined ? 'Going back over a weak topic' : `Going back over ${o}`,
  'hands-on-lab': (o) => (o === undefined ? 'Hands-on labs' : `Building a lab with ${o}`),
  'protect-sleep': () => 'Protecting your sleep',
  'wind-down': () => 'Winding down',
  recover: () => 'Taking a recovery night',
  'ease-off': () => 'Easing off for the rest of the day',
  'time-with': (o) => (o === undefined ? 'Unhurried time with someone' : `Time with ${o}`),
  // The skill label already carries whose it is — DEF-0027, which is why the
  // person is not named a second time here.
  'growth-opportunity': (o) => (o === undefined ? 'A chance to practise' : capitalise(o)),
  'reach-out': (o) => (o === undefined ? 'Reaching out' : `Reaching out to ${o}`),
  'start-conversation': (o) =>
    o === undefined ? 'Starting a conversation' : `Starting a conversation at ${o}`,
  'reset-space': (o) => (o === undefined ? 'Clearing a space' : `Clearing ${o}`),
  'handle-money-item': (o) => (o === undefined ? 'Dealing with a money job' : `Dealing with ${o}`),
  move: (o) => (o === undefined ? 'Getting some movement in' : `Getting out for ${o}`),
  hold: () => 'Holding off',
}

/**
 * What a pattern about this verb is called, given its object.
 *
 * Exported so the sweeps can walk the whole catalogue rather than sampling it —
 * the same reason `everyOutcomeQuestion` is exported from `outcomes.ts`. A
 * verb added without a name here would otherwise reach a card as `undefined`,
 * and would do it on whichever history happened to contain that verb.
 */
export function patternNameFor(verb: ActionVerb, object: string | undefined): string {
  return PATTERN_NAME[verb](object)
}

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

/** What each aspect's number measures, said in full beside every figure. */
function measuresSentence(aspect: MeasuredAspect, subject: string): string {
  const it = lowerFirst(subject)
  switch (aspect) {
    case 'follow-through':
      return `how often ${it} could actually be done when it came up`
    case 'direct-result':
      return `how often ${it} got all the way there`
    case 'downstream-effect':
      return `how often ${it} made a difference afterwards`
    case 'comfort':
      return `how often ${it} felt easy`
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
  if (episode.state === 'unable-now') return 'could not be done that evening'
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
    case 'downstream-effect':
      if (every) return `${subject} has made a difference every time.`
      if (share >= 60) return `${subject} usually makes a difference afterwards.`
      if (share >= 35) return `${subject} makes a difference about half the time.`
      return `${subject} has not made much difference.`
    case 'direct-result':
      if (every) return `${subject} has got all the way there every time.`
      if (share >= 60) return `${subject} usually gets all the way there.`
      if (share >= 35) return `${subject} gets all the way there about half the time.`
      return `${subject} rarely gets all the way there.`
    case 'comfort':
      if (share >= 75) return `${subject} has felt easy nearly every time.`
      if (share >= 40) return `${subject} feels easy about as often as not.`
      return `${subject} has felt like hard work more often than not.`
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
      evidence: evidenceFor(episodes, subject, {
        reasoning: [
          `Counted over every occasion ${lowerFirst(subject)} has come up, oldest first.`,
          'Each figure is about one thing only — how far it got, what it was worth afterwards, whether it could be done at all, or how it felt. They are never added together.',
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

function staleBeliefCard(
  verb: ActionVerb,
  episodes: readonly Episode[],
  situation: Situation,
): Built | undefined {
  const subject = patternName(verb, episodes, situation)
  const answered = episodes.filter((episode) => episode.outcomes.length > 0)
  if (answered.length < 2) return undefined

  const today = localDayIdAt(situation.at, situation.zone)
  const newest = answered.reduce((best, episode) =>
    episode.shownAt > best.shownAt ? episode : best,
  )
  const days = Math.max(0, localDaysBetween(newest.dayId, today))
  if (days < STALE_BELIEF_DAYS) return undefined

  return {
    rank: 65,
    insight: {
      id: `stale:${verb}`,
      kind: 'stale-assumption',
      eyebrow: EYEBROW['stale-assumption'],
      domain: domainOf(episodes),
      headline: `What the app thinks about ${lowerFirst(subject)} is ${describeDays(days)} old.`,
      detail: `The most recent thing you said about it was ${describeDay(newest.dayId)}. It is still being used when this comes up.`,
      confidence: confidenceFrom(answered.length, 0),
      evidence: evidenceFor(answered, subject, {
        reasoning: [
          'Old evidence is not thrown away — it counts for less as it ages, and never for nothing.',
          'This is here so an assumption from another part of the year is visible rather than silent.',
        ],
      }),
      belief: beliefKey('effect', verb),
    },
  }
}

// ---------------------------------------------------------------------------
// Coverage, trajectory and season — readings of the record rather than beliefs
// ---------------------------------------------------------------------------

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
  const quiet = situation.coverage.neglected.filter(
    (domain) => situation.domains.defaultPrivacyFor(domain.domain) !== 'private',
  )
  if (quiet.length === 0) return []

  const lines: EvidenceLine[] = []
  for (const domain of quiet) {
    for (const concept of domain.concepts) {
      if (!concept.standing) continue
      lines.push({
        record: (concept.evidence[0] ?? concept.concept) as RecordId,
        when: localDayIdAt(concept.lastEvidenceAt ?? situation.at, situation.zone),
        text:
          concept.lastEvidenceAt === undefined
            ? `${concept.label} — never answered`
            : `${concept.label} — last heard ${describeDays(concept.daysSince ?? 0)} ago`,
      })
    }
  }

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
        evidence,
        belief: undefined,
      },
    },
  ]
}

/** Six of this concept's own freshness windows, never under a week. */
function spanNeededFor(horizon: FreshnessHorizon): number {
  if (horizon.unit === 'durable') return Number.POSITIVE_INFINITY
  const days = horizon.unit === 'local-days' ? horizon.days : horizon.ms / 86_400_000
  return Math.max(TRAJECTORY_SPAN_FLOOR_DAYS, days * TRAJECTORY_SPAN_WINDOWS)
}

interface Reading {
  readonly at: Instant
  readonly dayId: LocalDayId
  readonly value: number
  readonly record: RecordId
}

function numericValue(value: FactValue): number | undefined {
  switch (value.type) {
    case 'number':
      return value.value
    case 'scale':
      return value.of === 0 ? undefined : value.value / value.of
    case 'duration':
      return value.minutes
    default:
      return undefined
  }
}

function unitOf(value: FactValue): string {
  if (value.type === 'number' && value.unit !== undefined) return ` ${value.unit}`
  if (value.type === 'duration') return ' min'
  return ''
}

/**
 * A measured quantity, moving or holding, over the record's own span.
 *
 * No percentage and no causal claim: this says what the readings did, and
 * section 68's rule about association is why it stops there. "You have been
 * sleeping about an hour less" is a description. "Because of X" would be an
 * assertion the app cannot support from a run of numbers.
 */
function trajectoryCards(situation: Situation): readonly Built[] {
  const byConcept = new Map<
    ConceptId,
    { readings: Reading[]; unit: string; label: string; spanNeeded: number }
  >()

  for (const record of situation.view.history.effective) {
    if (!bearsConcept(record)) continue
    if (record.occurredAt > situation.at) continue
    const definition = situation.concepts.definitionFor(record.concept)
    if (definition.standing !== true) continue
    if (definition.privacy === 'private') continue
    const value = numericValue(record.value)
    if (value === undefined) continue

    const held = byConcept.get(record.concept)
    const reading: Reading = {
      at: record.occurredAt,
      dayId: localDayIdAt(record.occurredAt, situation.zone),
      value,
      record: record.id,
    }
    if (held === undefined) {
      byConcept.set(record.concept, {
        readings: [reading],
        unit: unitOf(record.value),
        label: definition.label,
        spanNeeded: spanNeededFor(definition.freshness),
      })
    } else {
      held.readings.push(reading)
    }
  }

  const out: Built[] = []

  for (const [concept, held] of byConcept) {
    if (held.readings.length < TRAJECTORY_READINGS) continue
    const ordered = [...held.readings].sort((a, b) => a.at - b.at)
    const first = ordered[0]
    const last = ordered[ordered.length - 1]
    if (first === undefined || last === undefined) continue
    const span = localDaysBetween(first.dayId, last.dayId)
    if (span < held.spanNeeded) continue

    const cut = Math.floor(ordered.length / 2)
    const earlier = ordered.slice(0, cut)
    const later = ordered.slice(cut)
    const mean = (rows: readonly Reading[]): number =>
      rows.reduce((sum, row) => sum + row.value, 0) / rows.length
    const before = mean(earlier)
    const after = mean(later)
    const shift = before === 0 ? 0 : (after - before) / Math.abs(before)

    const round = (value: number): string => String(Math.round(value * 10) / 10)
    const direction: 'up' | 'down' | 'steady' =
      Math.abs(shift) < TRAJECTORY_SHIFT ? 'steady' : after > before ? 'up' : 'down'

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
        ? `${held.label}: steady around ${round(after)}${held.unit}.`
        : `${held.label}: about ${round(after)}${held.unit} lately, against ${round(before)}${held.unit} earlier.`

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
            text: `${describeDay(reading.dayId)} — ${round(reading.value)}${held.unit}`,
          })),
          includedTitle: 'Every reading',
          excluded: [],
          strongerIn: undefined,
          weakerIn: undefined,
          trend: `${round(before)}${held.unit} across the first ${earlier.length}, ${round(after)}${held.unit} across the last ${later.length}.`,
          mix: undefined,
          reasoning: [
            'Every reading of this in the record, oldest first, split in half by date.',
            'This says what the numbers did. It does not say what caused them.',
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
    if (record.privacy === 'private') continue

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
    const what = describeFactValue(record.value, (ref) => situation.entities.labelFor(ref))

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

  for (const [verb, episodes] of episodesByVerb(situation)) {
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
     * The age of the evidence is a different question from what it says, so
     * this one stands beside whichever card won rather than competing with it.
     */
    const cards = [whatHappens, staleBeliefCard(verb, episodes, situation)].filter(
      (card): card is Built => card !== undefined,
    )

    if (cards.length > 0) {
      built.push(...cards)
      continue
    }

    const subject = patternName(verb, episodes, situation)
    const best = ratesFor(episodes, subject).reduce<number>(
      (most, rate) => Math.max(most, rate.of),
      0,
    )
    const short = MIN_FOR_A_RATE - best
    gathering.push({
      subject,
      occasions: episodes.length,
      needs:
        best === 0
          ? 'nothing has come back about it yet'
          : short === 1
            ? 'one more occasion like these'
            : `${short} more occasions like these`,
    })
  }

  built.push(...coverageCards(situation))
  built.push(...trajectoryCards(situation))
  built.push(...lifeSeasonCards(situation))

  return {
    insights: built
      .sort((a, b) => b.rank - a.rank || a.insight.id.localeCompare(b.insight.id))
      .map((entry) => entry.insight),
    gathering: gathering.sort((a, b) => b.occasions - a.occasions),
  }
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
 * Where a move goes better, and which side of that tonight is on.
 *
 * The last clause is the one that matters. Without it the panel states a split
 * and leaves the reader to work out which half applies — and the half that
 * applies is exactly what explains why the app's own conclusion is more
 * cautious than the plain tally directly above it.
 */
function describeSplitForTonight(split: FoundSplit, context: DecisionContext): string {
  const strong = split.strongSide
  const weak = split.weakSide
  const answer = split.split.test(context)
  const tonight =
    answer === undefined ? '' : ` Tonight is ${answer ? split.split.label : split.split.opposite}.`

  return (
    `Across every occasion, not only the ones like tonight: ` +
    `${strong.rate.hit} of ${strong.rate.of} ${strong.label}, ` +
    `${weak.rate.hit} of ${weak.rate.of} ${weak.label}.${tonight}`
  )
}

export function evidenceForDecision(decision: Decision): DecisionEvidence | undefined {
  const explanation = decision.explanation
  const evaluation = decision.evaluation
  if (explanation === undefined || evaluation === undefined) return undefined

  const situation = decision.situation
  const verb = explanation.semantics.target.verb
  const subject = situation.entities.labelFor(explanation.semantics.target.object)
  const name = patternNameFor(verb, subject)

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
    const withheld = fact.privacy === 'private'
    /*
     * `ConsideredFact.reading` spells an absence as "not known — never-observed"
     * — the gap's own identifier, which is inspector language and belongs in
     * the QA trace rather than on Now (DEF-0007's class). The absence itself is
     * worth showing: a condition the app leaned on and does not know is part of
     * why it is hedging.
     */
    const reading = withheld
      ? 'Private entry'
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
  const split = strongestSplit(everyOccasion, name)

  return {
    move: explanation.rendered.sentence,
    conditions,
    comparable:
      alike.length === 0
        ? 'Nothing in the record is much like tonight yet.'
        : alike.length === 1
          ? `One evening in the record is like tonight — ${describeDay(alike[0]!.dayId)}.`
          : `${alike.length} evenings in the record are like tonight.`,
    window: windowOf(alike),
    rates: ratesFor(alike, name),
    counterexamples: [...counterexamples.values()],
    confidence: confidenceFrom(alike.length, counterexamples.size),
    concluded: explanation.restsOn,
    context: split === undefined ? undefined : describeSplitForTonight(split, situation.context),
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
      'The conditions listed are the ones the choice actually rested on, not everything the app knows about tonight.',
      'An evening counts as comparable on the same few things the app compares evenings on: the part of the day, how rested you are, whether it is a weekday, whether she is here, and roughly how much time there is.',
      'Each figure here measures one thing and says which. None of them are added together.',
    ],
  }
}
