import type { ConceptRegistry } from '../domain/concepts'
import type { DomainRegistry } from '../domain/domains'
import { renderRecommendation } from '../domain/recommendation'
import {
  DEFAULT_WEEK_START,
  type Instant,
  type TimeZoneId,
  type WeekStartDay,
} from '../domain/time'
import type { StoreSnapshot } from '../memory/store'
import { buildView, type MemoryView } from '../memory/view'
import {
  localAdvisor,
  situationNotes,
  validateAdvice,
  type CandidateDigest,
  type SemanticAdvisor,
} from './advisor'
import { arbitrate, type NoActionReason, type Selection } from './arbitrate'
import { generateCandidates, type Candidate } from './candidates'
import { applyConstraints } from './constraints'
import { evaluateAll, withDimension, type Evaluation } from './evaluate'
import { explain, type Explanation } from './explain'
import { answerRecord, QUESTIONS } from './questions'
import {
  assembleSituation,
  type MoveState,
  type Situation,
  type SituationMoment,
} from './situation'
import type { DecisionTrace, ProposedMove, RankedMove, Swing } from './trace'

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
  readonly kind: 'move' | 'no-action'
  readonly architecture: ArchitectureId
  readonly situation: Situation
  readonly explanation: Explanation | undefined
  readonly evaluation: Evaluation | undefined
  /** Where the chosen move stands, if it has been in front of the owner before. */
  readonly state: MoveState | undefined
  readonly noAction: NoAction | undefined
  readonly trace: DecisionTrace
}

function momentOf(moment: DecisionMoment): SituationMoment {
  return {
    now: moment.now,
    zone: moment.zone,
    weekStartsOn: moment.weekStartsOn ?? DEFAULT_WEEK_START,
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

  const { nudges, refused } = validateAdvice(reply, candidates)
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

    const outcomes: { answer: string; wouldChoose: string }[] = []
    for (const option of question.options) {
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
      outcomes.push({ answer: option.label, wouldChoose: chosenIdOf(probed) })
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
    const rendered = renderRecommendation(evaluation.candidate.semantics, situation.entities)
    return {
      id: evaluation.candidate.id,
      sentence: rendered.ok ? rendered.rendered.sentence : 'could not be put into words',
      score: evaluation.score,
      confidence: evaluation.confidence,
      dimensions: evaluation.dimensions,
      cautions: evaluation.cautions,
    }
  })
}

function stateOfChosen(evaluation: Evaluation, situation: Situation): MoveState {
  const target = evaluation.candidate.semantics.target
  let latest: { at: Instant; state: MoveState } | undefined
  for (const prior of situation.recentMoves) {
    if (prior.semantics.target.verb !== target.verb) continue
    if (prior.semantics.target.object.id !== target.object.id) continue
    if (latest === undefined || prior.at > latest.at) latest = { at: prior.at, state: prior.state }
  }
  return latest?.state ?? 'shown'
}

/**
 * Saying nothing, in the four ways it can be true.
 *
 * Section 36 — a degraded state must not read like a confident answer, and a
 * real rest night must not read like a broken one. `nothing-proposed` splits
 * because the two cases underneath it are nothing alike: a store with no
 * history in it, and a store with a fortnight of it that cannot suggest
 * anything without knowing how the owner is right now. Telling someone with two
 * weeks of records that there is "too little here" is simply false, and it is
 * the kind of false that makes an app look like it has lost the data.
 */
function noActionCopy(
  reason: NoActionReason,
  situation: Situation,
): { readonly headline: string; readonly detail: string } {
  switch (reason) {
    case 'nothing-worth-doing':
      return {
        headline: 'Nothing needs to move tonight.',
        detail: 'Nothing on the list is worth the evening it would cost. That is a real answer.',
      }
    case 'everything-ruled-out':
      return {
        headline: 'Nothing fits tonight.',
        detail: 'There were things worth doing and none of them suit where you actually are.',
      }
    case 'nothing-proposed':
      return situation.view.history.all.length === 0
        ? {
            headline: 'Not enough to go on yet.',
            detail: 'There is no history here at all, so anything said now would be invented.',
          }
        : {
            headline: 'Nothing to suggest just yet.',
            detail:
              'There is plenty of history here, and none of it says how tonight is going. One answer below is usually enough.',
          }
  }
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

  const selection = arbitrate(evaluations, situation, rejected.length)
  notes.push(...selection.notes)

  let explanation: Explanation | undefined
  let noAction: NoAction | undefined
  let state: MoveState | undefined

  if (selection.chosen === undefined) {
    const reason = selection.noAction ?? 'nothing-worth-doing'
    noAction = { reason, ...noActionCopy(reason, situation) }
  } else {
    const result = explain(selection.chosen, selection.ranked[1], situation)
    if (result.ok) {
      explanation = result.explanation
      state = stateOfChosen(selection.chosen, situation)
    } else {
      // A move that survived the filter and then could not be put into words is
      // a defect, not a recommendation. Saying nothing is the correct behaviour
      // — D-018 exists precisely so this cannot become a vague sentence.
      noAction = {
        reason: 'everything-ruled-out',
        ...noActionCopy('everything-ruled-out', situation),
      }
      notes.push(`the chosen move could not be put into words — ${result.problems.join(', ')}`)
    }
  }

  const decision: Decision = {
    kind: noAction === undefined ? 'move' : 'no-action',
    architecture,
    situation,
    explanation,
    evaluation: noAction === undefined ? selection.chosen : undefined,
    state,
    noAction,
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
      chosen: noAction === undefined ? selection.chosen?.candidate.id : undefined,
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
