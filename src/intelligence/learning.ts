import type { RecordId } from '../domain/ids'
import { verbLabel, type ActionVerb } from '../domain/recommendation'
import type { DecisionContext, FactValue } from '../domain/records'
import {
  localDaysBetween,
  localDayIdAt,
  type DayBlock,
  type Instant,
  type TimeZoneId,
} from '../domain/time'
import type { MemoryView } from '../memory/view'
import { WANTED_SOMETHING_ELSE, type Episode } from './lifecycle'
import { profileFor } from './moves'
import { comfortFrictionOf, effectValueOf, resultValueOf } from './outcomes'

/**
 * Learning from what actually happened (canonical plan section 20).
 *
 * Section 20 is six sentences long and every one of them is a defect waiting to
 * be written. They are the specification for this file, so each is named where
 * it is implemented:
 *
 * 1. **A rejection is not "ineffective."** Declines reach `appetite` and cannot
 *    reach `effect`. Not by convention — the code paths do not meet, and a test
 *    proves a history of nothing but refusals moves no effect at all.
 * 2. **Unable-now is context evidence.** It reaches `followThrough`, which is a
 *    claim about whether this can be done in situations like this one, and says
 *    nothing about whether it works when it is.
 * 3. **One success is not proof.** Every learned number is the prior pulled
 *    toward what was observed by `n / (n + PATIENCE)`. One perfect match moves
 *    it a quarter of the way. Nothing here can be converted by a single evening.
 * 4. **Context similarity matters.** More than date proximity, so similarity is
 *    the weight and recency is a gentle multiplier on it — never the reverse.
 *    Below `RECOGNISABLE` an episode is not "a situation like this one" and does
 *    not count at all, because counting everything a little is how learning
 *    becomes an average.
 * 5. **Same-block and next-day effects can differ.** They are learned from
 *    different questions asked at different times: a move judged twenty minutes
 *    later moves `now`, a move judged the next morning moves `tomorrow`, and
 *    neither speaks for the other.
 * 6. **A learned effect must be reversible.** Nothing is stored. Every number
 *    here is recomputed from the whole history on every decision, so evidence
 *    that contradicts a belief pulls it back by the same arithmetic that
 *    established it — and the owner can put a stop to a belief outright
 *    (section 62), which is the watershed below.
 */

/** How much evidence it takes before observation outweighs the prior. */
export const PATIENCE = 3

/** Below this, an episode is not a situation like this one. */
export const RECOGNISABLE = 0.4

/** A refusal counts fully; asking for something else counts for less. */
const WANTED_ANOTHER_WEIGHT = 0.5

export type BeliefAspect = 'effect' | 'result' | 'follow-through' | 'appetite' | 'friction'

const BELIEF_ASPECTS: readonly BeliefAspect[] = [
  'effect',
  'result',
  'follow-through',
  'appetite',
  'friction',
]

/**
 * What the owner is disputing when they say a belief is wrong.
 *
 * Per move rather than per context band. The bands are machinery; what the
 * owner is looking at is a sentence about clearing a space, and "that is not
 * right" is a statement about clearing a space.
 */
export function beliefKey(aspect: BeliefAspect, verb: ActionVerb): string {
  return `${aspect}:${verb}`
}

export function parseBeliefKey(
  key: string,
): { readonly aspect: BeliefAspect; readonly verb: string } | undefined {
  const split = key.indexOf(':')
  if (split <= 0) return undefined
  const aspect = key.slice(0, split) as BeliefAspect
  if (!BELIEF_ASPECTS.includes(aspect)) return undefined
  return { aspect, verb: key.slice(split + 1) }
}

// ---------------------------------------------------------------------------
// Is this like tonight?
// ---------------------------------------------------------------------------

/** Blocks that shade into each other. Adjacency is half a match, not none. */
const NEIGHBOURS: Record<DayBlock, readonly DayBlock[]> = {
  'early-morning': ['late-night', 'morning'],
  morning: ['early-morning', 'afternoon'],
  afternoon: ['morning', 'evening'],
  evening: ['afternoon', 'late-night'],
  'late-night': ['evening', 'early-morning'],
}

const STRAIN_ORDER: Record<'severe' | 'moderate' | 'none', number> = {
  severe: 2,
  moderate: 1,
  none: 0,
}

function blockMatch(a: DayBlock, b: DayBlock): number {
  if (a === b) return 1
  return NEIGHBOURS[a].includes(b) ? 0.5 : 0
}

function strainMatch(a: DecisionContext['strain'], b: DecisionContext['strain']): number {
  // Not knowing is not a mismatch and is not a match either. Half is the honest
  // answer, and it is what stops an unrecorded context quietly resembling
  // everything (G-009's rule, applied to comparison rather than to values).
  if (a === 'unknown' || b === 'unknown') return 0.5
  if (a === b) return 1
  return Math.abs(STRAIN_ORDER[a] - STRAIN_ORDER[b]) === 1 ? 0.5 : 0
}

function knownMatch<T>(a: T | undefined, b: T | undefined): number {
  if (a === undefined || b === undefined) return 0.5
  return a === b ? 1 : 0
}

function minutesMatch(a: number | undefined, b: number | undefined): number {
  if (a === undefined || b === undefined) return 0.5
  return Math.max(0, 1 - Math.abs(a - b) / 90)
}

const SIMILARITY_WEIGHTS = {
  block: 2,
  strain: 2,
  weekend: 1,
  child: 1,
  minutes: 1,
} as const

/**
 * How much one evening resembles another, 0–1.
 *
 * Deliberately five coarse features rather than everything the situation knows.
 * A fingerprint fine enough to be unique matches nothing, and section 22
 * forbids inventing precision — a similarity of 0.6 here means "quite like it",
 * not a measurement.
 */
export function similarity(a: DecisionContext, b: DecisionContext): number {
  const parts = [
    [blockMatch(a.block, b.block), SIMILARITY_WEIGHTS.block],
    [strainMatch(a.strain, b.strain), SIMILARITY_WEIGHTS.strain],
    [a.weekend === b.weekend ? 1 : 0, SIMILARITY_WEIGHTS.weekend],
    [knownMatch(a.childPresent, b.childPresent), SIMILARITY_WEIGHTS.child],
    [minutesMatch(a.usableMinutes, b.usableMinutes), SIMILARITY_WEIGHTS.minutes],
  ] as const

  const total = parts.reduce((sum, [, weight]) => sum + weight, 0)
  return parts.reduce((sum, [value, weight]) => sum + value * weight, 0) / total
}

/**
 * How much a piece of evidence fades with age.
 *
 * Never below 0.6, and that floor is the point: section 16 says old evidence
 * from another life season "remains visible but may be less predictive", not
 * that it stops counting. Recency is allowed to break a tie between two similar
 * evenings and is not allowed to outrank similarity, which is section 20's
 * "context similarity matters" read literally.
 */
export function recencyFactor(days: number): number {
  return 0.6 + 0.4 * Math.exp(-Math.max(0, days) / 60)
}

// ---------------------------------------------------------------------------
// The beliefs
// ---------------------------------------------------------------------------

export interface WeightedEpisode {
  readonly episode: Episode
  readonly similarity: number
  readonly weight: number
}

export interface LearnedEffect {
  /** The prior, pulled toward what was observed. */
  readonly now: number
  readonly tomorrow: number
  /** Which of the two the evidence actually speaks to. */
  readonly moved: 'now' | 'tomorrow' | 'neither'
  /** Comparable episodes with an answered result. */
  readonly samples: number
  /** How far the observation pulled the prior, 0–1. */
  readonly pull: number
  readonly evidence: readonly RecordId[]
  /** Owner-facing, when there is enough to say anything. */
  readonly summary: string | undefined
  readonly corrected: boolean
}

/**
 * How far this move's intended end state actually gets, in situations like this.
 *
 * **Distinct from follow-through, and the distinction is the point of
 * DEF-0020.** Follow-through asks whether the move can be done at all here —
 * evidence about the *situation*, from unable-now. This asks whether doing it
 * reaches what it was for. Clearing the kitchen every time it is suggested and
 * only ever half-clearing it is perfect follow-through and a poor result, and
 * folding the two would have the app say "something usually gets in the way" of
 * an evening where nothing did.
 *
 * The prior is 1 — a move achieves its aim. So *achieved* sits at the prior and
 * says nothing, and only *partly* and *not at all* speak. That is what stops a
 * move with two measurable aspects collecting two positive rewards where a move
 * with one collects a single one: **the result can only ever count against.**
 */
export interface LearnedResult {
  /** 0–1: how far the intended end state gets, in situations like this. */
  readonly reached: number
  readonly samples: number
  readonly pull: number
  readonly evidence: readonly RecordId[]
  readonly note: string
  readonly corrected: boolean
}

/**
 * How hard this move actually feels to this owner, in situations like this.
 *
 * Section 10 asks the app to learn "how comfortable it felt" and "whether an
 * approach style was easier". Unlike result and follow-through, this is
 * **signed both ways**, and for a principled reason: their priors are ceilings,
 * so only failure is informative. Friction's prior is a middling estimate per
 * move, so "easier than we assumed" is real news about this owner.
 */
export interface LearnedFriction {
  /** 0–1, higher is harder. The move profile's friction, moved by experience. */
  readonly friction: number
  readonly samples: number
  readonly pull: number
  readonly evidence: readonly RecordId[]
  readonly note: string
  readonly corrected: boolean
}

export interface LearnedFollowThrough {
  /** 0–1: how often this could actually be done in situations like this. */
  readonly rate: number
  readonly samples: number
  readonly pull: number
  readonly evidence: readonly RecordId[]
  readonly note: string
  readonly corrected: boolean
}

export interface LearnedAppetite {
  /** 0–1: how often the owner passed on this in situations like this. */
  readonly turnedDown: number
  readonly samples: number
  readonly pull: number
  readonly evidence: readonly RecordId[]
  readonly note: string
  readonly corrected: boolean
}

export interface LearningIndex {
  readonly episodes: readonly Episode[]
  effectFor(verb: ActionVerb, context: DecisionContext): LearnedEffect
  resultFor(verb: ActionVerb, context: DecisionContext): LearnedResult
  followThroughFor(verb: ActionVerb, context: DecisionContext): LearnedFollowThrough
  appetiteFor(verb: ActionVerb, context: DecisionContext): LearnedAppetite
  frictionFor(verb: ActionVerb, context: DecisionContext): LearnedFriction
  /** Beliefs the owner has ruled out, and when. */
  readonly rejected: ReadonlyMap<string, Instant>
}

interface Moment {
  readonly now: Instant
  readonly zone: TimeZoneId
}

/**
 * The beliefs the owner has told the app to stop holding (section 62).
 *
 * The latest correction for a key wins, so a `restore` after a `reject` simply
 * removes the watershed. Append-first history needs no other undo.
 */
export function rejectedBeliefs(view: MemoryView): ReadonlyMap<string, Instant> {
  const latest = new Map<string, { at: Instant; stance: 'reject' | 'restore' }>()
  for (const record of view.history.effective) {
    if (record.kind !== 'belief-correction') continue
    const held = latest.get(record.belief)
    if (held === undefined || record.occurredAt >= held.at) {
      latest.set(record.belief, { at: record.occurredAt, stance: record.stance })
    }
  }

  const out = new Map<string, Instant>()
  for (const [key, held] of latest) {
    if (held.stance === 'reject') out.set(key, held.at)
  }
  return out
}

/**
 * Episodes of one kind of move that resemble the situation being decided.
 *
 * `after` is the watershed: when the owner has rejected a belief, everything
 * recorded up to that moment stops counting toward it and what happens
 * afterwards counts normally. Section 62 asks the app to stop reasserting a
 * corrected belief "unless new evidence genuinely supports revisiting it", and
 * that is what new evidence means here — evidence the owner has not already
 * seen and disagreed with. It needs no threshold nobody chose.
 */
function comparable(
  episodes: readonly Episode[],
  verb: ActionVerb,
  context: DecisionContext,
  moment: Moment,
  after: Instant | undefined,
): readonly WeightedEpisode[] {
  const today = localDayIdAt(moment.now, moment.zone)
  const out: WeightedEpisode[] = []

  for (const episode of episodes) {
    if (episode.semantics.target.verb !== verb) continue
    if (episode.shownAt > moment.now) continue
    if (after !== undefined && episode.shownAt <= after) continue

    const theirs = episode.context
    // An episode with no context recorded cannot claim to resemble tonight. It
    // is still history; it is not evidence about a situation.
    if (theirs === undefined) continue

    const howAlike = similarity(theirs, context)
    if (howAlike < RECOGNISABLE) continue

    const days = localDaysBetween(episode.dayId, today)
    out.push({ episode, similarity: howAlike, weight: howAlike * recencyFactor(days) })
  }

  return out
}

function shrink(prior: number, observed: number, n: number): { value: number; pull: number } {
  const pull = n / (n + PATIENCE)
  return { value: prior + (observed - prior) * pull, pull }
}

/**
 * One answered aspect of an episode, read as a number.
 *
 * Keyed on the aspect rather than on whether a sentiment happens to be present.
 * The old test — "it has a sentiment, so it is a result" — is what let four
 * kinds of evidence become one belief (DEF-0020).
 */
function answerOf(
  episode: Episode,
  aspect: 'result' | 'effect' | 'comfort',
  read: (value: FactValue) => number | undefined,
): { value: number; source: RecordId } | undefined {
  for (const outcome of episode.outcomes) {
    if (outcome.aspect !== aspect) continue
    const value = read(outcome.observation)
    if (value === undefined) continue
    return { value, source: outcome.id }
  }
  return undefined
}

function whenPhrase(block: DayBlock): string {
  return block === 'evening' || block === 'late-night' ? 'tonight' : 'today'
}

/**
 * What the app has learned, in one line the owner can disagree with.
 *
 * Section 61 gives the target almost word for word — "This has worked several
 * times in situations like tonight" — and the only change made to it is naming
 * the move, because losing the noun is the failure section 3 is about.
 */
function summarise(
  verb: ActionVerb,
  observed: number,
  samples: number,
  block: DayBlock,
): string | undefined {
  if (samples < 1) return undefined
  const move = verbLabel(verb).toLowerCase()
  const when = whenPhrase(block)
  const often = samples === 1 ? 'once' : samples < 4 ? 'a few times' : 'several times'

  if (observed >= 0.6) return `${capitalise(move)} has worked ${often} in situations like ${when}.`
  if (observed <= 0.3) {
    return samples === 1
      ? `${capitalise(move)} did not do much the one time in situations like ${when}.`
      : `${capitalise(move)} has not done much ${often} in situations like ${when}.`
  }
  return `${capitalise(move)} has made little difference in situations like ${when}.`
}

function capitalise(text: string): string {
  return text.length === 0 ? text : `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

// ---------------------------------------------------------------------------

export function buildLearning(
  episodes: readonly Episode[],
  view: MemoryView,
  moment: Moment,
): LearningIndex {
  const rejected = rejectedBeliefs(view)
  const cache = new Map<string, unknown>()

  const memo = <T>(key: string, build: () => T): T => {
    const held = cache.get(key)
    if (held !== undefined) return held as T
    const made = build()
    cache.set(key, made)
    return made
  }

  const cacheKey = (aspect: BeliefAspect, verb: ActionVerb, context: DecisionContext): string =>
    [
      aspect,
      verb,
      context.block,
      context.weekend,
      context.strain,
      context.childPresent ?? '?',
      context.usableMinutes ?? '?',
    ].join('|')

  const effectFor = (verb: ActionVerb, context: DecisionContext): LearnedEffect =>
    memo(cacheKey('effect', verb, context), () => {
      const profile = profileFor(verb)
      const after = rejected.get(beliefKey('effect', verb))
      const corrected = after !== undefined

      /*
       * Only completed episodes with an answered result.
       *
       * This is where section 20's first two rules are structural rather than
       * stated: a declined episode never reaches this filter, and neither does
       * an unable-now one. There is no branch here that could mistake either
       * for evidence that the move does not work, because neither is in the
       * set being looked at.
       */
      const contributing: { weight: number; value: number; source: RecordId }[] = []
      for (const found of comparable(episodes, verb, context, moment, after)) {
        if (found.episode.state !== 'completed') continue
        const answer = answerOf(found.episode, 'effect', effectValueOf)
        if (answer === undefined) continue
        contributing.push({ weight: found.weight, value: answer.value, source: answer.source })
      }

      const n = contributing.reduce((sum, entry) => sum + entry.weight, 0)
      if (n === 0) {
        return {
          now: profile.now,
          tomorrow: profile.tomorrow,
          moved: 'neither',
          samples: 0,
          pull: 0,
          evidence: [],
          summary: undefined,
          corrected,
        }
      }

      const observed = contributing.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / n

      // Which number the evidence speaks to is decided by when the question was
      // asked, not by preference: a move judged twenty minutes later says
      // something about that evening, and a move judged the next morning says
      // something about the morning. Neither answers for the other.
      const speaksTo = profile.outcome.when === 'next-morning' ? 'tomorrow' : 'now'
      const moved = shrink(speaksTo === 'now' ? profile.now : profile.tomorrow, observed, n)

      return {
        now: speaksTo === 'now' ? moved.value : profile.now,
        tomorrow: speaksTo === 'tomorrow' ? moved.value : profile.tomorrow,
        moved: speaksTo,
        samples: contributing.length,
        pull: moved.pull,
        evidence: contributing.map((entry) => entry.source),
        summary:
          moved.pull < 0.2
            ? undefined
            : summarise(verb, observed, contributing.length, context.block),
        corrected,
      }
    })

  const resultFor = (verb: ActionVerb, context: DecisionContext): LearnedResult =>
    memo(cacheKey('result', verb, context), () => {
      const after = rejected.get(beliefKey('result', verb))
      const corrected = after !== undefined

      const contributing: { weight: number; value: number; source: RecordId }[] = []
      for (const found of comparable(episodes, verb, context, moment, after)) {
        if (found.episode.state !== 'completed') continue
        const answer = answerOf(found.episode, 'result', resultValueOf)
        if (answer === undefined) continue
        contributing.push({ weight: found.weight, value: answer.value, source: answer.source })
      }

      const n = contributing.reduce((sum, entry) => sum + entry.weight, 0)
      if (n === 0) {
        return {
          reached: 1,
          samples: 0,
          pull: 0,
          evidence: [],
          note: 'no reason yet to think this falls short',
          corrected,
        }
      }

      const observed = contributing.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / n
      // The prior is 1: a move achieves what it is for until something says
      // otherwise. Achieving it therefore moves nothing, which is what keeps a
      // two-aspect move from being rewarded twice for one good evening.
      const moved = shrink(1, observed, n)

      return {
        reached: moved.value,
        samples: contributing.length,
        pull: moved.pull,
        evidence: contributing.map((entry) => entry.source),
        note:
          moved.value >= 1
            ? 'no reason yet to think this falls short'
            : moved.value < 0.6
              ? 'this rarely gets all the way there'
              : 'this does not always get all the way there',
        corrected,
      }
    })

  const frictionFor = (verb: ActionVerb, context: DecisionContext): LearnedFriction =>
    memo(cacheKey('friction', verb, context), () => {
      const prior = profileFor(verb).friction
      const after = rejected.get(beliefKey('friction', verb))
      const corrected = after !== undefined

      const contributing: { weight: number; value: number; source: RecordId }[] = []
      for (const found of comparable(episodes, verb, context, moment, after)) {
        const answer = answerOf(found.episode, 'comfort', comfortFrictionOf)
        if (answer === undefined) continue
        contributing.push({ weight: found.weight, value: answer.value, source: answer.source })
      }

      const n = contributing.reduce((sum, entry) => sum + entry.weight, 0)
      if (n === 0) {
        return {
          friction: prior,
          samples: 0,
          pull: 0,
          evidence: [],
          note: 'nothing said about how hard this is',
          corrected,
        }
      }

      const observed = contributing.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / n
      const moved = shrink(prior, observed, n)

      return {
        friction: moved.value,
        samples: contributing.length,
        pull: moved.pull,
        evidence: contributing.map((entry) => entry.source),
        note:
          moved.value > prior + 0.05
            ? 'harder for you than it looks'
            : moved.value < prior - 0.05
              ? 'easier for you than it looks'
              : 'about as hard as it looks',
        corrected,
      }
    })

  const followThroughFor = (verb: ActionVerb, context: DecisionContext): LearnedFollowThrough =>
    memo(cacheKey('follow-through', verb, context), () => {
      const after = rejected.get(beliefKey('follow-through', verb))
      const corrected = after !== undefined

      let managed = 0
      let blocked = 0
      const evidence: RecordId[] = []

      for (const found of comparable(episodes, verb, context, moment, after)) {
        const state = found.episode.state
        if (state === 'started' || state === 'completed') {
          managed += found.weight
          evidence.push(found.episode.recommendation)
        } else if (state === 'unable-now') {
          blocked += found.weight
          evidence.push(found.episode.recommendation)
        }
      }

      const n = managed + blocked
      if (n === 0) {
        return {
          rate: 1,
          samples: 0,
          pull: 0,
          evidence: [],
          note: 'nothing has stopped this before',
          corrected,
        }
      }

      // The prior is 1: assume a move can be done until something says it could
      // not. Section 20 — unable-now is evidence about the situation, and this
      // is the only place it lands.
      const moved = shrink(1, managed / n, n)
      const sampleCount = evidence.length
      return {
        rate: moved.value,
        samples: sampleCount,
        pull: moved.pull,
        evidence,
        note:
          blocked === 0
            ? 'nothing has stopped this before'
            : moved.value < 0.6
              ? 'something usually gets in the way of this'
              : 'this has been blocked before',
        corrected,
      }
    })

  const appetiteFor = (verb: ActionVerb, context: DecisionContext): LearnedAppetite =>
    memo(cacheKey('appetite', verb, context), () => {
      const after = rejected.get(beliefKey('appetite', verb))
      const corrected = after !== undefined

      let refused = 0
      let offered = 0
      const evidence: RecordId[] = []

      for (const found of comparable(episodes, verb, context, moment, after)) {
        offered += found.weight
        if (found.episode.state !== 'declined') continue
        // Asking for a different suggestion is not the same as refusing this
        // one, and counting them the same would turn "show me something else"
        // into a standing objection.
        const strength = found.episode.wantedAnother ? WANTED_ANOTHER_WEIGHT : 1
        refused += found.weight * strength
        evidence.push(found.episode.recommendation)
      }

      if (offered === 0) {
        return {
          turnedDown: 0,
          samples: 0,
          pull: 0,
          evidence: [],
          note: 'never been offered before in a situation like this',
          corrected,
        }
      }

      const moved = shrink(0, refused / offered, offered)
      return {
        turnedDown: moved.value,
        samples: evidence.length,
        pull: moved.pull,
        evidence,
        /*
         * Never "this does not work".
         *
         * Section 20's first rule. A refusal is the owner exercising the
         * sovereignty section 4.3 gives them, and reading it as a verdict on
         * the move would punish them for saying no — which is exactly the
         * mistake that makes an app feel like it is arguing with you.
         */
        note:
          evidence.length === 0
            ? 'nothing said either way'
            : evidence.length === 1
              ? 'passed on once before in a situation like this'
              : `passed on ${evidence.length} times before in situations like this`,
        corrected,
      }
    })

  return { episodes, effectFor, resultFor, followThroughFor, appetiteFor, frictionFor, rejected }
}

/** An empty index, for a history with nothing in it. */
export function noLearning(view: MemoryView, moment: Moment): LearningIndex {
  return buildLearning([], view, moment)
}

export { WANTED_SOMETHING_ELSE }
