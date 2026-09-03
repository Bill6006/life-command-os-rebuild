import type { ConceptRegistry } from '../domain/concepts'
import type { DomainRegistry } from '../domain/domains'
import { renderRecommendation } from '../domain/recommendation'
import {
  blockOf,
  civilDateFromDayId,
  DAY_BLOCKS,
  DEFAULT_WEEK_START,
  instantAtLocal,
  localDateTimeAt,
  localDayIdAt,
  type DayBlock,
  type Instant,
  type LocalDayId,
  type TimeZoneId,
  type WeekStartDay,
} from '../domain/time'
import type { DecisionContext } from '../domain/records'
import type { StoreSnapshot } from '../memory/store'
import { buildView, type MemoryView } from '../memory/view'
import {
  localAdvisor,
  nudgeBoundFor,
  situationNotes,
  validateAdvice,
  type CandidateDigest,
  type SemanticAdvisor,
} from './advisor'
import { arbitrate, type NoActionReason, type Selection } from './arbitrate'
import { lastRefusalInBlock, refusalsInBlock } from './constraints'
import { generateCandidates, type Candidate } from './candidates'
import { growthSuggestions, type GrowthSuggestion } from './growth'
import { applyConstraints, type Rejection } from './constraints'
import { evaluateAll, withDimension, type Evaluation } from './evaluate'
import { explain, type Explanation } from './explain'
import { describeEvidenceMix, similarity } from './learning'
import { openEpisode, type MoveState } from './lifecycle'
import { profileFor } from './moves'
import { outcomeWindowFor } from './outcomes'
import { answerRecord, GUIDE_PROVENANCE, QUESTIONS } from './questions'
import { couldMatterNow } from './reach'
import {
  assembleSituation,
  type ShownMove,
  type Situation,
  type SituationMoment,
} from './situation'
import { blockNoun, hereNowWord, horizonWord } from './vocabulary'
import type {
  DecisionTrace,
  EpisodeTrace,
  LearningTrace,
  ProposedMove,
  RankedMove,
  Swing,
} from './trace'

/**
 * How many times the owner may say no in one block before the app stops asking.
 *
 * Two would make it sulky and four is not listening. Section 4.3 distinguishes
 * disagreement from inability and the app honours each individually; this is
 * the response to the *pattern*, which is the thing it had none of.
 */
export const REFUSALS_BEFORE_STOPPING = 3

/**
 * How many refusals in one block before the app stops offering and asks —
 * AUD-0023, QA-81-004.
 *
 * This lived in `guide.ts` and governed only the bar a question had to clear,
 * which left the escalation half-built: the guide relaxed its standard while
 * the engine went on offering a third move, so a history with no counterfactual
 * question fell straight through to "Spend the next 30 minutes with Adaya,
 * phone away" and "Nothing else worth asking right now". Two refusals answered
 * with a third guess is not an escalation.
 *
 * Both halves now read the same number, and it belongs here because the engine
 * is where "stop offering" happens.
 */
export const REFUSALS_BEFORE_ASKING = 2

/**
 * The engine (canonical plan sections 17.1 and 17.2).
 *
 * One entry point, one pipeline, one decision. Everything a surface needs comes
 * back from `decide`, and there is no other way to obtain a recommendation:
 * `tests/unit/architecture-guards.test.ts` fails the build if anything under
 * `src/features/` imports the generator, the evaluator or the arbiter directly.
 * That is section 17.2 made structural — a Life page cannot grow its own brain
 * because there is nowhere for it to get one.
 *
 * Nothing here reads a clock. The moment is an argument, which is what makes
 * the QA laboratory's time travel work on the real engine rather than on a
 * special mode of it, and what lets every scenario below be replayed exactly.
 */

export type ArchitectureId = 'deterministic' | 'hybrid'

export const ARCHITECTURES: readonly ArchitectureId[] = ['deterministic', 'hybrid']

export interface DecideOptions {
  readonly architecture?: ArchitectureId
  readonly advisor?: SemanticAdvisor
  /**
   * Work out what would change the answer, by re-running the decision under
   * each plausible answer. Off by default: it is real work, and only the
   * inspector and the guide need it.
   */
  readonly probe?: boolean
}

export interface DecisionMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  readonly weekStartsOn?: WeekStartDay
  /** What the surface has already shown today — AUD-0025. Data, never a lookup. */
  readonly shown?: readonly ShownMove[]
  readonly domains?: DomainRegistry
  readonly concepts?: ConceptRegistry
}

export interface NoAction {
  readonly reason: NoActionReason
  /** Owner-facing. A valid rest state reads differently from a thin history. */
  readonly headline: string
  readonly detail: string
}

export interface Decision {
  /**
   * `hold` is the fifth state — AUD-0024.
   *
   * Not a move and not no-action: the app has something worth doing and is
   * saying this is the wrong hour for it. Those are different sentences and
   * Phase 9 designs them separately, which is why the state exists now rather
   * than after the visual phase.
   */
  readonly kind: 'move' | 'hold' | 'no-action'
  readonly architecture: ArchitectureId
  readonly situation: Situation
  readonly explanation: Explanation | undefined
  readonly evaluation: Evaluation | undefined
  /** Where the chosen move stands, if it has been in front of the owner before. */
  readonly state: MoveState | undefined
  readonly noAction: NoAction | undefined
  /**
   * The part of today a held move is being kept for — AUD-0024.
   *
   * Set only on a `hold`, and always a block that is later than this one and
   * inside the same owner-local day. The app has no model of tomorrow and must
   * not acquire one by naming it.
   */
  readonly heldUntil: DayBlock | undefined
  /**
   * Why later rather than now — QA-82-002.
   *
   * The arbiter's own grounds, carried through unchanged, and empty on every
   * decision that is not a hold. It exists because a held decision's evidence
   * panel was answering a question nobody asked: it listed what the *move*
   * rested on, when the thing on screen was the app declining to offer that
   * move yet. The grounds are written where the deferral is made
   * (`arbitrate.ts`), so there is one account of it and the panel quotes it.
   */
  readonly heldBecause: readonly string[]
  /**
   * Growth areas the evidence says have moved on, as questions (section 9).
   *
   * Not part of the decision and deliberately alongside it. Section 9 asks the
   * app to be able to say "she seems more comfortable doing this on her own —
   * update this growth area?" after enough evidence, and the only place it can
   * say anything to the owner is beside the move he is already reading.
   */
  readonly growth: readonly GrowthSuggestion[]
  readonly trace: DecisionTrace
}

function momentOf(moment: DecisionMoment): SituationMoment {
  return {
    now: moment.now,
    zone: moment.zone,
    weekStartsOn: moment.weekStartsOn ?? DEFAULT_WEEK_START,
    ...(moment.shown === undefined ? {} : { shown: moment.shown }),
    ...(moment.domains === undefined ? {} : { domains: moment.domains }),
    ...(moment.concepts === undefined ? {} : { concepts: moment.concepts }),
  }
}

// ---------------------------------------------------------------------------
// The hybrid seat
// ---------------------------------------------------------------------------

function digestOf(evaluations: readonly Evaluation[], situation: Situation): CandidateDigest[] {
  return evaluations.map((evaluation) => ({
    id: evaluation.candidate.id,
    verb: evaluation.candidate.semantics.target.verb,
    domain: evaluation.candidate.semantics.domain,
    subject: situation.entities.labelFor(evaluation.candidate.semantics.subject) ?? '',
    score: evaluation.score,
  }))
}

function takeAdvice(
  evaluations: readonly Evaluation[],
  situation: Situation,
  advisor: SemanticAdvisor,
): { readonly evaluations: readonly Evaluation[]; readonly notes: readonly string[] } {
  const candidates: readonly Candidate[] = evaluations.map((evaluation) => evaluation.candidate)

  let reply
  try {
    reply = advisor.advise({
      block: situation.block,
      limiter: situation.limiter?.summary,
      notes: situationNotes(situation),
      candidates: digestOf(evaluations, situation),
    })
  } catch (caught) {
    // An advisor that throws is an advisor that is not consulted. It must never
    // be able to stop the owner getting a decision.
    return {
      evaluations,
      notes: [`${advisor.id} failed and was ignored — ${describeError(caught)}`],
    }
  }

  /*
   * How far the advice may reach, from the field it is about — AUD-0039.
   *
   * Measured on the deterministic ranking, before any nudge is applied, so the
   * bound is a property of what the rules concluded rather than of what the
   * advisor would like them to have concluded.
   */
  const bound = nudgeBoundFor(evaluations.map((evaluation) => evaluation.score))
  const { nudges, refused } = validateAdvice(reply, candidates, bound)
  const byCandidate = new Map(nudges.map((nudge) => [nudge.candidate, nudge]))

  const notes: string[] = []
  for (const rejection of refused) {
    notes.push(
      `${advisor.id} said something unusable about ${rejection.candidate}: ${rejection.problem}`,
    )
  }
  for (const nudge of nudges) {
    notes.push(
      `${advisor.id} moved ${nudge.candidate} by ${nudge.adjustment.toFixed(2)} — ${nudge.because}`,
    )
  }
  if (nudges.length === 0 && refused.length === 0) notes.push(`${advisor.id} had nothing to add`)

  return {
    evaluations: evaluations.map((evaluation) => {
      const nudge = byCandidate.get(evaluation.candidate.id)
      return withDimension(evaluation, {
        name: 'advisor',
        value: nudge === undefined ? 0 : nudge.adjustment,
        weight: 0.5,
        note: nudge === undefined ? 'nothing to add' : nudge.because,
      })
    }),
    notes,
  }
}

function capitalise(text: string): string {
  return text.length === 0 ? text : `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

function describeError(caught: unknown): string {
  return caught instanceof Error ? caught.message : String(caught)
}

// ---------------------------------------------------------------------------
// What would change the answer
// ---------------------------------------------------------------------------

/** Deterministic, so the same probe produces the same trace every time. */
const PROBE_RECORD_ID = 'PR0BE00000000000000000000' as never

function chosenIdOf(decision: Decision): string {
  return decision.evaluation?.candidate.id ?? `nothing (${decision.noAction?.reason ?? 'unknown'})`
}

/**
 * Re-run the decision under each plausible answer and see where it lands.
 *
 * This is the measurement behind two separate promises: the inspector's "what
 * would change the answer" (section 31), and the guide's rule that a question is
 * only worth asking if the answer could materially change the recommendation
 * (section 12). Both need the same thing, so both get it from here rather than
 * from two rules that would eventually disagree.
 *
 * The probe answers go in as real records through the real parser and the real
 * fact layer. Nothing is stored — the snapshot is a copy.
 */
export function probeSwings(
  view: MemoryView,
  moment: DecisionMoment,
  options: DecideOptions,
  actual: Decision,
): readonly Swing[] {
  const swings: Swing[] = []
  const inner: DecideOptions = { ...options, probe: false }
  const actualChoice = chosenIdOf(actual)

  for (const question of QUESTIONS) {
    const entry = view.facts.get(question.concept)
    if (entry === undefined || !entry.worthAsking) continue
    /*
     * And only where a consumer of it could fire in this situation — §13B.
     *
     * Two things at once, and `reach.ts` says which is which. For every concept
     * that shipped before routing 92 this is always true, so the probe set is
     * exactly what it was and the pre-filter cannot change a selection. For the
     * concepts routing 92 added it is the consumer precondition: a question is
     * worth a tap only where the thing that would read the answer can act, and
     * *"a concept may ship as askable only when an actual consumer exists that
     * makes at least one possible answer capable of materially changing a
     * decision"* is the rule it implements.
     *
     * It is also the performance half. The verified cost is about 21 full
     * `buildView + decide` evaluations per guide render, and a naive Tier 1 +
     * Tier 2 expansion takes it to about 50 — with the worst case as the common
     * case, because a reading that is unknown is always worth asking about and
     * an emotional reading is unknown almost always by design.
     */
    if (
      !couldMatterNow(
        entry.definition,
        actual.situation,
        actual.evaluation?.candidate.semantics.target.verb,
      )
    ) {
      continue
    }

    const outcomes: { answer: string; wouldChoose: string; easier: boolean }[] = []
    for (const option of question.options(actual.situation)) {
      const record = answerRecord(
        question,
        option,
        { now: moment.now, zone: moment.zone },
        PROBE_RECORD_ID,
      )
      const snapshot: StoreSnapshot = {
        ...view.snapshot,
        records: [...view.snapshot.records, record],
      }
      const probed = decide(
        buildView(snapshot, {
          now: moment.now,
          zone: moment.zone,
          ...(moment.weekStartsOn === undefined ? {} : { weekStartsOn: moment.weekStartsOn }),
        }),
        moment,
        inner,
      )
      outcomes.push({
        answer: option.label,
        wouldChoose: chosenIdOf(probed),
        easier: asksLessThan(probed, actual),
      })
    }

    const distinct = new Set(outcomes.map((outcome) => outcome.wouldChoose))
    swings.push({
      concept: question.concept,
      label: entry.definition.label,
      changesTheAnswer: distinct.size > 1 || !distinct.has(actualChoice),
      outcomes,
    })
  }

  return swings
}

/**
 * Whether one answer would leave the app asking less of the owner than it is.
 *
 * Ordered by what a move *demands*, which is the property the whole arbitration
 * turns on and the one that is not learned: no action asks least, then a
 * restorative move, then a light one, then an effortful one. A probe that lands
 * on nothing is the easiest outcome there is.
 */
function asksLessThan(probed: Decision, actual: Decision): boolean {
  const cost = (decision: Decision): number => {
    const verb = decision.evaluation?.candidate.semantics.target.verb
    if (verb === undefined) return 0
    const demand = profileFor(verb).demand
    return demand === 'restorative' ? 1 : demand === 'light' ? 2 : 3
  }
  return cost(probed) < cost(actual)
}

// ---------------------------------------------------------------------------
// The block sweep — AUD-0008
// ---------------------------------------------------------------------------

/**
 * One representative hour inside each day block.
 *
 * The instrument the whole-app audit asked for, and the reason it asked: the
 * scenario library was thirteen evenings and no morning that could decide, so
 * every claim the app makes about the hour was checked at the one hour it was
 * written for. A sweep re-runs *the same history* at five different moments and
 * puts the five answers next to each other, which is the cheapest possible
 * defence against a whole class of temporal wrongness — one press surfaces a
 * limiter that says "tonight" at nine in the morning, a recovery limiter with
 * no recovery move behind it, and a fact that has quietly expired since
 * breakfast.
 *
 * Midpoints rather than edges. An edge is where a boundary bug lives and a
 * midpoint is where the owner lives, and this is the owner's instrument; the
 * boundary arithmetic has its own tests in `tests/unit/time.test.ts`.
 * `late-night` covers two ranges and is swept at the late end, because that is
 * the one a person is awake for — the small hours are covered by the
 * half-hourly regression sweep rather than by this control.
 */
export const SWEEP_HOUR: Record<DayBlock, { readonly hour: number; readonly minute: number }> = {
  'early-morning': { hour: 5, minute: 30 },
  morning: { hour: 9, minute: 30 },
  afternoon: { hour: 15, minute: 0 },
  evening: { hour: 20, minute: 0 },
  'late-night': { hour: 23, minute: 0 },
}

export interface SweptBlock {
  readonly block: DayBlock
  readonly at: Instant
  /** The owner-local wall clock this was decided at, for the row's label. */
  readonly timeOfDay: string
  readonly decision: Decision
}

/**
 * The same history, decided at every block of one owner-local day.
 *
 * Clock-free like everything else here: the day is taken from the moment it is
 * given, and each block's instant is resolved through the same local-time
 * arithmetic a scenario uses. Nothing is written and nothing is travelled to —
 * the caller's own clock is untouched, so the laboratory can show five answers
 * without moving the one on screen.
 */
export function sweepDayBlocks(
  view: MemoryView,
  moment: DecisionMoment,
  options: DecideOptions = {},
): readonly SweptBlock[] {
  const zone = moment.zone
  const dayId: LocalDayId = localDayIdAt(moment.now, zone)
  const date = civilDateFromDayId(dayId)
  const inner: DecideOptions = { ...options, probe: false }

  return DAY_BLOCKS.map((block) => {
    const { hour, minute } = SWEEP_HOUR[block]
    const at = instantAtLocal({ ...date, hour, minute, second: 0 }, zone)
    const swept: DecisionMoment = { ...moment, now: at }
    const built = buildView(view.snapshot, {
      now: at,
      zone,
      ...(moment.weekStartsOn === undefined ? {} : { weekStartsOn: moment.weekStartsOn }),
    })
    return {
      block,
      at,
      timeOfDay: localDateTimeAt(at, zone).timeOfDay,
      decision: decide(built, swept, inner),
    }
  })
}

// ---------------------------------------------------------------------------

function proposedRows(
  candidates: readonly Candidate[],
  situation: Situation,
): readonly ProposedMove[] {
  return candidates.map((candidate) => ({
    id: candidate.id,
    generator: candidate.generator,
    verb: candidate.semantics.target.verb,
    domain: candidate.semantics.domain,
    subject:
      situation.entities.labelFor(candidate.semantics.subject) ?? candidate.semantics.subject.id,
    because: candidate.proposedBecause,
  }))
}

function rankingRows(selection: Selection, situation: Situation): readonly RankedMove[] {
  return selection.ranked.map((evaluation) => {
    const rendered = renderRecommendation(
      evaluation.candidate.semantics,
      situation.entities,
      situation.block,
    )
    return {
      id: evaluation.candidate.id,
      sentence: rendered.ok ? rendered.rendered.sentence : 'could not be put into words',
      minutes: evaluation.candidate.semantics.target.minutes,
      score: evaluation.score,
      confidence: evaluation.confidence,
      dimensions: evaluation.dimensions,
      cautions: evaluation.cautions,
    }
  })
}

/**
 * A move the owner has started stays on screen until they settle it.
 *
 * Section 19 lists "continue" as a valid decision and section 6 asks Now to be
 * able to show an active recommendation state. Both point at the same thing,
 * and it is a real problem rather than a nicety: every lifecycle event
 * recomputes the decision, so tapping **Start** on clearing the kitchen
 * immediately makes clearing the kitchen a recently-offered move and can hand
 * the top spot to something else — the owner looks up from the sink and the app
 * is suggesting a walk.
 *
 * This is deliberately not a score. Giving the in-flight move a bonus large
 * enough to win would be a number chosen to force an outcome, and it would
 * still lose on some evening nobody tested. Saying it outright, in one place,
 * with a note in the trace, is the honest version — and it keeps the ranking
 * underneath it truthful about what the engine would otherwise have picked.
 *
 * It only overrides a candidate that is still on offer. A walk started at seven
 * and remembered at midnight is not something to still be recommending.
 */
function continuing(selection: Selection, situation: Situation): Selection {
  const started = situation.recentMoves.filter(
    (prior) => prior.state === 'started' && localDayIdOf(prior.at, situation) === situation.dayId,
  )
  if (started.length === 0) return selection

  for (const prior of started) {
    const found = selection.ranked.find(
      (evaluation) =>
        evaluation.candidate.semantics.target.verb === prior.semantics.target.verb &&
        evaluation.candidate.semantics.target.object.id === prior.semantics.target.object.id,
    )
    if (found === undefined) continue
    if (found === selection.chosen) return selection

    const reordered = [found, ...selection.ranked.filter((evaluation) => evaluation !== found)]
    const next = reordered[1]

    return {
      ...selection,
      chosen: found,
      noAction: undefined,
      ranked: reordered,
      // Recomputed, not carried: the margin belongs to the pair actually on
      // screen, and promoting a move that was under way changes both halves of
      // it. A stale one would make Now call a wide gap a close call (AUD-0033).
      margin: next === undefined ? undefined : found.score - next.score,
      notes: [
        ...selection.notes,
        `${found.candidate.id} is already under way, so it stays in front of what would otherwise have been chosen`,
      ],
    }
  }

  return selection
}

function localDayIdOf(at: Instant, situation: Situation): string {
  return localDayIdAt(at, situation.zone)
}

/**
 * What the owner's own outcomes did to each surviving candidate.
 *
 * Built from the same index the evaluator read, rather than recomputed — a
 * trace assembled by a second pass over the same inputs is a plausible story
 * about a decision rather than the decision's own working.
 */
function learningRows(selection: Selection, situation: Situation): readonly LearningTrace[] {
  return selection.ranked.map((evaluation) => {
    const verb = evaluation.candidate.semantics.target.verb
    const prior = profileFor(verb)
    const effect = situation.learning.effectFor(verb, situation.context)
    const followThrough = situation.learning.followThroughFor(verb, situation.context)
    const appetite = situation.learning.appetiteFor(verb, situation.context)
    const result = situation.learning.resultFor(verb, situation.context)
    const friction = situation.learning.frictionFor(verb, situation.context)

    return {
      candidate: evaluation.candidate.id,
      verb,
      moved: effect.moved,
      startedAt: { now: prior.now, tomorrow: prior.tomorrow },
      landedAt: { now: effect.now, tomorrow: effect.tomorrow },
      samples: effect.samples,
      pull: effect.pull,
      evidence: effect.evidence,
      evidenceMix: describeEvidenceMix(effect.evidence),
      summary: effect.summary,
      corrected: effect.corrected,
      followThrough: {
        rate: followThrough.rate,
        samples: followThrough.samples,
        note: followThrough.note,
        evidence: followThrough.evidence,
      },
      appetite: {
        turnedDown: appetite.turnedDown,
        samples: appetite.samples,
        note: appetite.note,
        evidence: appetite.evidence,
      },
      result: {
        reached: result.reached,
        samples: result.samples,
        note: result.note,
        evidence: result.evidence,
      },
      friction: {
        started: prior.friction,
        landed: friction.friction,
        samples: friction.samples,
        note: friction.note,
        evidence: friction.evidence,
      },
    }
  })
}

/** Every episode in the history, and how much this evening resembles it. */
function episodeRows(situation: Situation): readonly EpisodeTrace[] {
  return situation.learning.episodes.map((episode) => {
    // The block the episode was decided in, not the one being read in: a line
    // about last Tuesday evening is about that evening.
    const rendered = renderRecommendation(
      episode.semantics,
      situation.entities,
      episode.context?.block,
    )
    const window = outcomeWindowFor(episode, situation.zone)
    const given = episode.outcomes.length

    return {
      recommendation: episode.recommendation,
      sentence: rendered.ok ? rendered.rendered.sentence : 'could not be put into words',
      dayId: episode.dayId,
      state: episode.state,
      outcome:
        given > 0
          ? `${given} answer(s) given`
          : window === undefined
            ? 'no result to ask about'
            : situation.at < window.earliest
              ? 'not due yet'
              : situation.at > window.latest
                ? 'the window closed unanswered'
                : 'due now',
      context:
        episode.context === undefined ? 'nothing recorded' : describeContext(episode.context),
      resembles: episode.context === undefined ? 0 : similarity(episode.context, situation.context),
    }
  })
}

function describeContext(context: DecisionContext): string {
  const parts = [
    context.block.replace('-', ' '),
    context.weekend ? 'weekend' : 'weekday',
    `strain ${context.strain}`,
  ]
  if (context.childPresent !== undefined)
    parts.push(context.childPresent ? 'she was here' : 'alone')
  if (context.usableMinutes !== undefined) parts.push(`${context.usableMinutes} minutes`)
  return parts.join(', ')
}

/**
 * Where **today's** occurrence of the chosen move stands — D-160.
 *
 * An action has a stable identity and each time it is put in front of the owner
 * is a separate occurrence with its own date and state, and no surface may
 * resolve one through the other.
 *
 * This used to match `(verb, object.id)` across `situation.recentMoves` with no
 * day filter, and `recentMoves` is a **three-day** window
 * (`situation.ts`, `addLocalDays(moment.now, -3, zone)`). So a walk completed
 * on the 22nd supplied the state of a freshly generated walk on the 25th:
 * `TRANSITIONS.completed` is `[]` and `NowScreen` disables every action not in
 * `availableActions(state)`, which left the product's single most important
 * interaction reading **"Where this stands — Done"** with all five controls
 * inert, on a suggestion the owner had never seen. That is F43, and E02 and
 * E31 are what it looks like from a browser.
 *
 * **The window is not what changed, and must not be.** `recent-duplication`
 * and learning both need to see beyond today — the same move offered three
 * evenings running is a worse move on the third evening. What changed is the
 * match.
 *
 * It resolves through `openEpisode`, which is the function `planLifecycle`
 * already uses to decide what a tap would do. Filtering `recentMoves` by day
 * would have produced the same answer today and left two definitions of "this
 * move, on this day" to drift apart; with one, the state the screen shows and
 * the transition a tap would take cannot disagree.
 *
 * **And not from later today either.** `learning.episodes` is every episode in
 * the record, and `view.history.effective` is not filtered by the moment — the
 * callers do that, each in its own words (`assembleTimeline`, `recentChanges`,
 * `growthStandingFor`). `recentMoves` did it with the upper bound of its
 * window, and this is the same bound stated on its own: a state the owner has
 * not set yet is not a state to show him, and under time travel an episode
 * later on the same owner-local day is exactly that.
 */
function stateOfChosen(evaluation: Evaluation, situation: Situation): MoveState {
  const target = evaluation.candidate.semantics.target
  const sofar = situation.learning.episodes.filter((episode) => episode.shownAt <= situation.at)
  const today = openEpisode(sofar, target, situation.dayId)
  return today?.state ?? 'shown'
}

/**
 * What is left to say when a limiter is visible and nothing was proposed.
 *
 * Nine hours short of rest at nine in the morning used to read: the shortfall
 * named in the line above the decision, and underneath it "there is plenty of
 * history here, and none of it says how tonight is going". Both halves came
 * from the same run. The history was saying exactly how the day was going —
 * what was empty was the catalogue, because every recovery move belongs to an
 * hour that had not arrived yet.
 *
 * So when the engine can name what is in the way, it does not get to claim the
 * history is silent. The limiter is already on screen above this, so these say
 * only the part it does not: that nothing on offer would move it.
 */
function nothingForThisLimiter(situation: Situation): string | undefined {
  switch (situation.limiter?.kind) {
    case 'recovery':
      // When rest is what is short, the next thing that can help is the next
      // night — so in the evening that is the morning, and before it that is
      // tonight. Naming the wrong one of the two was the shape of AUD-0001.
      return horizonWord(situation.block) === 'tonight'
        ? 'Nothing here would help much before the morning.'
        : 'Nothing here would help much until you can actually rest.'
    case 'capacity':
      return 'Nothing here is worth asking of a sore body.'
    case 'time':
      return 'Nothing here would fit the time left.'
    case 'coverage':
      // The limiter line above already says which area has gone quiet and for
      // how long. This says the only part it does not: that the app has nothing
      // to suggest which would bring anything back, which is the honest answer
      // and is different from the area not mattering.
      return `Nothing here would bring anything back about it ${horizonWord(situation.block)}.`
    default:
      return undefined
  }
}

/**
 * Saying nothing, in the ways it can be true.
 *
 * Section 36 — a degraded state must not read like a confident answer, and a
 * real rest night must not read like a broken one. `nothing-proposed` splits
 * three ways because the cases underneath it are nothing alike: a store with no
 * history in it, a store with a fortnight of it that cannot suggest anything
 * without knowing how the owner is right now, and one that can see perfectly
 * well what is wrong and has nothing suited to the hour. Telling someone with
 * two weeks of records that there is "too little here" is simply false, and so
 * is telling someone whose sleep debt is printed above the sentence that
 * nothing here says how the day is going.
 *
 * **Exported so that every branch can be read at every block** — QA-81-007. The
 * late-night no-action screen said *"Nothing on the list is worth tonight it
 * would cost."* for as long as this state has existed, and every sweep over it
 * passed, because the sweeps checked which time words appeared rather than
 * whether the sentence was a sentence. A copy catalogue this small should be
 * held as a table of finished lines, and it cannot be unless it can be called.
 */
/**
 * Whether the owner has told the app anything since he last said no.
 *
 * Deliberately narrow: an answer to a question, inside the same block, no
 * earlier than the refusal that stopped the offers. Anything looser and an
 * unrelated record from earlier in the evening would look like a reply.
 *
 * At-or-after rather than strictly after, because the clock is not always
 * moving. The QA laboratory pins a moment and drives the whole sequence at it,
 * so the refusal and the answer to the question it raised carry the identical
 * timestamp; under a strict comparison the reply would not count and the
 * escalation could never be answered on the one surface it is tested on. A
 * guide answer is only ever written in response to a question, and the app only
 * asks this question once it has stopped offering, so a tie is a reply.
 *
 * **`probeSwings` depends on this, and the escalation depends on `probeSwings`.**
 * A probe is a copy of the snapshot with one answer appended at the moment being
 * decided; this function is what makes that answer count, which is what lets the
 * probe land on a move rather than on the same silence. Tighten the comparison
 * and every counterfactual after the second refusal collapses to "nothing would
 * change" — the guide would go quiet at precisely the moment it is there for,
 * and the app would stop offering without ever asking. That is half the defect
 * QA-81-004 reported, restored.
 */
function answeredAfterLastRefusal(view: MemoryView, situation: Situation): boolean {
  const since = lastRefusalInBlock(situation)
  if (since === undefined) return false

  for (const record of view.history.effective) {
    if (record.provenance.writtenBy !== GUIDE_PROVENANCE.writtenBy) continue
    if (record.occurredAt < since) continue
    if (localDayIdAt(record.occurredAt, situation.zone) !== situation.dayId) continue
    if (blockOf(record.occurredAt, situation.zone) !== situation.block) continue
    return true
  }
  return false
}

export function noActionCopy(
  reason: NoActionReason,
  situation: Situation,
  rejected: readonly Rejection[] = [],
): { readonly headline: string; readonly detail: string } {
  switch (reason) {
    case 'nothing-worth-doing':
      return {
        headline: `Nothing needs to move ${horizonWord(situation.block)}.`,
        detail: `Nothing on the list is worth ${blockNoun(situation.block)} it would cost. That is a real answer.`,
      }
    case 'everything-ruled-out':
      /*
       * Why they were ruled out, when the reason is only that he has seen them.
       *
       * "None of them suit where you actually are" is a claim about the hour and
       * the body. When every candidate was held back because it has already been
       * on screen twice today (QA-81-003), that sentence is simply false: they
       * suit fine, and he has read them already. The repair for one falsehood
       * has no business introducing another.
       */
      if (rejected.length > 0 && rejected.every((row) => row.reason === 'just-covered')) {
        return {
          headline: 'Nothing new for today.',
          detail:
            'Everything this history has to suggest has already been in front of you today, and tomorrow starts again.',
        }
      }
      /*
       * The same fact, on an hour that also ruled some things out.
       *
       * The branch above required *every* rejection to be repetition, and that
       * `every` turned out to be the fragile part: the moment one more move
       * refused the late night — `recall-practice`, found by the widened
       * tournament rubric in Phase 82 — a screen that had been saying "these
       * have already been in front of you" started saying "none of them suit
       * where you actually are" instead. Which is the falsehood QA-81-006 was
       * repaired for, arriving through a change three files away.
       *
       * So the rule is stated as what it always meant: **if anything was
       * withheld for having been seen, that is the fact worth saying**, and the
       * hour is mentioned rather than blamed. The condition is now about the
       * presence of the reason rather than about the absence of every other
       * one, which is what stops the next unrelated change breaking it.
       */
      if (rejected.some((row) => row.reason === 'just-covered')) {
        return {
          headline: `Nothing new ${horizonWord(situation.block)}.`,
          detail: `What would have helped has already been in front of you today, and the rest is wrong for ${blockNoun(situation.block)}.`,
        }
      }
      /*
       * The answer was withheld, not withdrawn — QA-81-006.
       *
       * "None of them suit where you actually are" is false the other way round
       * here: one of them suited exactly, and the app is holding it back because
       * he has read it twice today. Saying the situation ruled everything out
       * would blame the evening for a decision about repetition.
       */
      if (rejected.some((row) => row.reason === 'not-instead-of-that')) {
        return {
          headline: `Nothing to add ${horizonWord(situation.block)}.`,
          detail:
            'What is short has one answer here, and it has already been in front of you today. Everything else here works against it.',
        }
      }
      return {
        headline: `Nothing fits ${horizonWord(situation.block)}.`,
        detail: 'There were things worth doing and none of them suit where you actually are.',
      }
    case 'not-landing':
      /*
       * Two refusals in a row, answered with a question rather than a guess —
       * AUD-0023, QA-81-004.
       *
       * What this replaces is a third suggestion. The audit's sequence is two
       * `Can't right now` presses on "A week pointed at the house", and what
       * followed them was "Spend the next 30 minutes with Adaya, phone away" —
       * the app's third guess at an hour it had already been wrong about twice,
       * and the one guess of the three that costs him something to refuse.
       *
       * The detail does not promise a question, because the guide may not have
       * one worth asking; when it does, it renders directly beneath this. What
       * is promised is the thing the app can actually keep: it has stopped
       * guessing, and the block turning over is the way back.
       */
      return {
        headline: 'This is not landing.',
        detail:
          'Twice now, so the next thing worth doing is not another suggestion. Nothing further until this part of the day is over.',
      }
    case 'enough-for-now':
      /*
       * Three refusals in a row, answered — AUD-0023.
       *
       * The screen this replaces is the one the audit found: the same move
       * coming back badged "You said not right now", and a fourth press
       * changing nothing at all. Section 4.3 gives the owner the right to
       * postpone, to say can't-now and to ask for something else, and the app
       * honoured each of those individually while having no response to the
       * pattern. This is the response.
       *
       * The way back is a real one and is named: the block turns over, and
       * nothing here is a veto — that is a separate thing he can choose
       * (AUD-0050) and it is not what three taps mean.
       */
      return {
        headline: 'Nothing then.',
        detail:
          'Three passes in a row is an answer. Nothing more will be put in front of you until this part of the day is over.',
      }
    case 'enough-done-today':
      /*
       * F11 — completion needs closure, not another available task.
       *
       * The distinction this makes is the one the review is about. "Nothing new
       * for today" is a statement about the app's list. This is a statement
       * about his day, and it is the only sentence in the catalogue that says
       * something happened. It names no count — what was done is on Timeline,
       * and a number here would be the app grading an evening.
       */
      return {
        headline: 'That is enough for today.',
        detail:
          'You did what there was, and the rest has already been in front of you. Nothing more needs to move today.',
      }
    case 'nothing-in-reach':
      /*
       * AUD-0034, and D-038's line drawn carefully.
       *
       * "Nothing to suggest just yet" reads as the app not being ready, and it
       * was what a rested man got at seven in the morning and what a father got
       * on the three evenings his daughter is away. "Just yet" implies
       * something is coming; nothing is. And the honest sentence is not "I have
       * nothing to suggest" — it is that there is nothing *here* the app knows
       * how to help with, which is a different admission and a more useful one.
       *
       * What it must not say is that the evening is quiet. That would be
       * asserting an absence from ignorance, which is exactly D-038's error.
       *
       * **And it must not say "evening" at nine in the morning** — QA-81-007's
       * class, found by rendering this catalogue at every block rather than by
       * sweeping the states the library happens to reach. The sentence written
       * to stop the app calling the evening quiet was itself calling every hour
       * the evening, in the one phase whose first gate item forbids exactly
       * that. The last hour it was read at is the one it was written for.
       */
      return {
        headline: 'Nothing here to push you toward.',
        detail: `The picture is current. None of the areas this app can act in has anything in it right now, which is about its reach rather than about ${hereNowWord(situation.block)}.`,
      }
    case 'nothing-proposed': {
      if (situation.view.history.all.length === 0) {
        return {
          headline: 'Not enough to go on yet.',
          detail: 'There is no history here at all, so anything said now would be invented.',
        }
      }
      const limited = nothingForThisLimiter(situation)
      if (limited !== undefined) {
        return { headline: 'Nothing worth starting right now.', detail: limited }
      }
      /*
       * What the branch above it counted, and nothing more — F39, D-153.
       *
       * This said **"There is plenty of history here"** on any non-empty
       * store, and the review read it on four records. "Plenty" is a claim
       * about the size of the whole record, and the only quantity anything
       * here measured is the one directly above: whether there is any history
       * at all. D-153 is the rule — a reading of one moment may not be worded
       * as a claim about the whole record — and round 8 named it without
       * sweeping this instance.
       *
       * No count replaces it, because no count would mean anything here.
       * `history.all` includes rows that have been superseded and retracted,
       * so a number taken from it would need explaining before it could be
       * read, and a quantity that needs a footnote is worse than none. What
       * the owner needs from this sentence is not the size of his record: it
       * is that the silence is about **now** rather than about how little the
       * app has been told, which is the second clause and is what the state
       * actually establishes.
       */
      return {
        headline: 'Nothing to suggest just yet.',
        detail: `There is history here, and none of it says how ${horizonWord(situation.block)} is going. One answer below is usually enough.`,
      }
    }
  }
}

/**
 * Whether the app can actually see this moment, or only the history behind it.
 *
 * The split AUD-0034 asks for. "There is history here, and none of it says how
 * today is going" is true and useful when the readings have all aged out; it is
 * simply false when three of them came in this morning.
 *
 * ## Counted over the readings that decide — routing 92
 *
 * It counted every known row in the fact list, and that was the same set right
 * up until AUD-0040 made the fact list the true one. The situation used to
 * assemble nine hand-written reads; it now reads every registered concept, so a
 * fortnight of sleep readings and a settled custody arrangement could push the
 * count past the threshold with nothing whatever known about the hour being
 * decided.
 *
 * The browser gate caught it exactly where it shows: on a fortnight of sleep
 * readings and nothing about how he feels, Now said *"the picture is current"*
 * **while the guide underneath it was asking how much energy he had left.** One
 * screen, one moment, two claims that cannot both be true — QA-82-015's class,
 * arriving from a new direction.
 *
 * So it counts the concepts a decision actually turns on. `materialToDecision`
 * is measured rather than declared since AUD-0041, which is what makes that set
 * meaningful: a custody arrangement and a faith practice are correctly
 * non-decisional, and knowing them is not the same as being able to see
 * tonight.
 */
const ENOUGH_TO_SEE_BY = 3

function currentPictureExists(situation: Situation): boolean {
  const known = situation.considered.filter(
    (fact) =>
      fact.state !== 'unknown' &&
      situation.concepts.definitionFor(fact.concept).ask.materialToDecision,
  ).length
  return known >= ENOUGH_TO_SEE_BY
}

/**
 * Whether the silence is a finished day rather than an empty list — F11.
 *
 * Both halves are required and neither is inferred. **Everything that survived
 * was held back for having already been on screen** — not for the hour, not for
 * the body, not because nothing was worth doing — and **at least one move was
 * completed today**. Either without the other is a different silence, and the
 * catalogue has a sentence for each of them already.
 *
 * A part-done evening does not count. He said himself that he did not finish,
 * and telling him he has done enough would be the app contradicting him.
 */
function finishedForToday(
  reason: NoActionReason,
  situation: Situation,
  rejected: readonly Rejection[],
): boolean {
  if (reason !== 'everything-ruled-out') return false
  if (rejected.length === 0) return false
  if (!rejected.every((row) => row.reason === 'just-covered')) return false
  return situation.recentMoves.some(
    (prior) =>
      prior.state === 'completed' && localDayIdAt(prior.at, situation.zone) === situation.dayId,
  )
}

export function decide(
  view: MemoryView,
  moment: DecisionMoment,
  options: DecideOptions = {},
): Decision {
  const architecture: ArchitectureId = options.architecture ?? 'deterministic'
  const situation = assembleSituation(view, momentOf(moment))

  const proposed = generateCandidates(situation)
  const { kept, rejected } = applyConstraints(proposed, situation)

  let evaluations = evaluateAll(kept, situation)
  const notes: string[] = []

  if (architecture === 'hybrid') {
    const advised = takeAdvice(evaluations, situation, options.advisor ?? localAdvisor)
    evaluations = advised.evaluations
    notes.push(...advised.notes)
  }

  const selection = continuing(arbitrate(evaluations, situation, rejected.length), situation)
  notes.push(...selection.notes)

  let explanation: Explanation | undefined
  let noAction: NoAction | undefined
  let state: MoveState | undefined
  let heldUntil: DayBlock | undefined
  let heldBecause: readonly string[] = []

  /*
   * The app reads the room before it reads the ranking — AUD-0023.
   *
   * Deliberately after arbitration rather than instead of it: the trace still
   * shows what would have been chosen, so the inspector can say what the owner
   * turned down without the owner being shown a fourth thing to turn down.
   */
  const refusals = refusalsInBlock(situation)

  /*
   * And whether anything has been heard since — AUD-0023, QA-81-004.
   *
   * The escalation is "stop offering and ask", which is only an escalation if
   * answering does something. Two refusals mean something the app cannot see is
   * in the way; an answer is the owner making it visible, and a picture that
   * changed deserves a fresh look rather than the same silence. It is also what
   * keeps the third refusal reachable: without it, stopping at two would leave
   * nothing to refuse a third time and `enough-for-now` could never be reached.
   *
   * A guide answer only, because that is what the app asked for. Logging a walk
   * is not an answer to "what is in the way".
   */
  const heard = answeredAfterLastRefusal(view, situation)

  if (refusals >= REFUSALS_BEFORE_STOPPING) {
    noAction = { reason: 'enough-for-now', ...noActionCopy('enough-for-now', situation) }
    notes.push(`${refusals} refusals in this block, so nothing further was offered`)
  } else if (refusals >= REFUSALS_BEFORE_ASKING && !heard) {
    noAction = { reason: 'not-landing', ...noActionCopy('not-landing', situation) }
    notes.push(`${refusals} refusals in this block, so the app stopped offering and asked instead`)
  } else if (selection.deferred !== undefined) {
    /*
     * Not this, because it will go better later — AUD-0024.
     *
     * The arbiter decided; this composes the sentence, exactly as it composes
     * the no-action copy from a reason the arbiter chose. Nothing here selects
     * anything: `heldForLater` is inside `arbitrate.ts` for the same reason
     * every other selection is.
     *
     * The move's own subject and object are kept, so the sentence names the
     * thing being held rather than talking about deferral in the abstract. The
     * block passed to the renderer is the one it is being held **for**, which
     * is the only place in the app where that is true and is commented at the
     * template.
     */
    const held = selection.deferred
    /*
     * No runner-up, and the absence is copy rather than an oversight.
     *
     * "Chosen over" is true of a move that was picked. Nothing was picked here:
     * the app is not doing the held move and it is not doing the runner-up
     * either, so a row saying it was chosen over something would be describing
     * a contest that did not happen. The trace still carries the whole ranking.
     */
    const result = explain(held.evaluation, undefined, situation, undefined, [], true)
    if (result.ok) {
      const base = held.evaluation.candidate.semantics
      /*
       * The held move's own semantics, with the verb changed.
       *
       * Not a new object built beside them: `explanation.semantics` is what
       * every surface renders from, and a pair where the sentence and the
       * semantics disagree is exactly what `no-hidden-genericity.test.ts` fails
       * the build over — the renderer has to stay the only way words are made.
       * The subject, the domain and the evidence are the held move's, because
       * they are what the app is holding.
       */
      /*
       * What is being held, said in full, and then why later is better.
       *
       * The held move's own reason must not survive: "Adaya is here, and that
       * window closes on its own" is an argument for doing it **now**, and
       * printing it under a sentence that says to wait is the app contradicting
       * itself in two lines. So the reason is composed from what the deferral
       * actually rests on — the move, the block that suits it, and the block
       * that does not.
       */
      const reason = `${result.explanation.rendered.sentence} ${capitalise(
        blockNoun(held.until),
      )} has the room, and ${blockNoun(situation.block)} does not.`
      const semantics = {
        ...base,
        target: { verb: 'hold' as const, object: base.target.object },
        whyNow: { ...base.whyNow, summary: reason },
      }
      const rendered = renderRecommendation(semantics, situation.entities, held.until)
      if (rendered.ok) {
        heldUntil = held.until
        heldBecause = held.because
        explanation = { ...result.explanation, semantics, rendered: rendered.rendered }
      }
    }
    if (heldUntil === undefined) {
      // A hold that could not be put into words is a defect, not an answer —
      // D-018's rule, and the same fall-through a chosen move takes.
      noAction = {
        reason: 'nothing-worth-doing',
        ...noActionCopy('nothing-worth-doing', situation),
      }
      notes.push('the held move could not be put into words')
    }
  } else if (selection.chosen === undefined) {
    const proposed = selection.noAction ?? 'nothing-worth-doing'
    const base: NoActionReason =
      proposed === 'nothing-proposed' && currentPictureExists(situation)
        ? 'nothing-in-reach'
        : proposed
    /*
     * And whether the honest word for this silence is that he is finished —
     * F11, F13.
     *
     * Deliberately the last step and deliberately narrow. It changes no
     * decision: `base` is the reason the arbiter actually reached, and this
     * only asks whether a truer sentence is available for it. The condition is
     * that everything left was withheld for having already been seen **and**
     * something was actually completed today, which is the difference between
     * an empty list and a finished day.
     */
    const reason: NoActionReason = finishedForToday(base, situation, rejected)
      ? 'enough-done-today'
      : base
    noAction = { reason, ...noActionCopy(reason, situation, rejected) }
  } else {
    /*
     * The whole ranking, so a move that shares the occasion can be found —
     * AUD-0022. The runner-up alone is not enough: the move that is part of the
     * same half hour is not always the one that came second.
     */
    const result = explain(
      selection.chosen,
      selection.ranked[1],
      situation,
      selection.margin,
      selection.ranked,
    )
    if (result.ok) {
      explanation = result.explanation
      state = stateOfChosen(selection.chosen, situation)
    } else {
      // A move that survived the filter and then could not be put into words is
      // a defect, not a recommendation. Saying nothing is the correct behaviour
      // — D-018 exists precisely so this cannot become a vague sentence.
      noAction = {
        reason: 'everything-ruled-out',
        ...noActionCopy('everything-ruled-out', situation, rejected),
      }
      notes.push(`the chosen move could not be put into words — ${result.problems.join(', ')}`)
    }
  }

  const decision: Decision = {
    kind: noAction !== undefined ? 'no-action' : heldUntil !== undefined ? 'hold' : 'move',
    architecture,
    situation,
    explanation,
    evaluation:
      noAction !== undefined
        ? undefined
        : heldUntil !== undefined
          ? selection.deferred?.evaluation
          : selection.chosen,
    state,
    noAction,
    heldUntil,
    heldBecause,
    growth: growthSuggestions(situation),
    trace: {
      architecture,
      at: situation.at,
      zone: situation.zone,
      dayId: situation.dayId,
      weekId: situation.weekId,
      block: situation.block,
      facts: situation.considered,
      limiter: situation.limiter,
      direction: {
        weekly: situation.direction.weekly,
        category:
          situation.direction.weekly.state === 'set'
            ? situation.direction.weekly.category
            : undefined,
        goals: situation.direction.goals.map((goal) => ({
          statement: goal.statement,
          domain: goal.domain,
        })),
      },
      proposed: proposedRows(proposed, situation),
      rejected,
      ranking: rankingRows(selection, situation),
      learning: learningRows(selection, situation),
      episodes: episodeRows(situation),
      chosen:
        noAction === undefined
          ? (selection.deferred?.evaluation ?? selection.chosen)?.candidate.id
          : undefined,
      noAction: noAction?.reason,
      notes,
      wouldChange: [],
    },
  }

  if (options.probe !== true) return decision
  return {
    ...decision,
    trace: { ...decision.trace, wouldChange: probeSwings(view, moment, options, decision) },
  }
}
