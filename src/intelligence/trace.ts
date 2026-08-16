import type { LifeDomainId } from '../domain/domains'
import type { RecordId } from '../domain/ids'
import type { Confidence } from '../domain/knowledge'
import type { ActionVerb } from '../domain/recommendation'
import type { DayBlock, Instant, LocalDayId, LocalWeekId, TimeZoneId } from '../domain/time'
import type { ConceptId } from '../domain/windows'
import type { Rejection } from './constraints'
import type { Dimension } from './evaluate'
import type { NoActionReason } from './arbitrate'
import type { MoveState } from './lifecycle'
import type { ConsideredFact, Limiter } from './situation'
import type { WeeklyDirection } from './direction'

/**
 * The decision trace (canonical plan sections 31 and 35).
 *
 * Section 35 lists what the QA inspector must be able to show for every
 * recommendation: the facts considered and whether each was explicit or
 * inferred, the active context, the candidate list, what was filtered and why,
 * the selected candidate, the ranking dimensions, uncertainty, the semantic
 * subject, and what influenced the decision.
 *
 * It is all here, and it is produced by the run rather than reconstructed
 * afterwards. A trace assembled by a second pass over the same inputs is a
 * plausible story about a decision; this one is the decision's own working.
 *
 * This is developer and QA information. None of it is daily owner copy — the
 * words the owner reads come from the explanation generator.
 */

export interface ProposedMove {
  readonly id: string
  readonly generator: string
  readonly verb: ActionVerb
  readonly domain: LifeDomainId
  /** The subject as it would be named out loud, not as an identifier. */
  readonly subject: string
  readonly because: string
}

export interface RankedMove {
  readonly id: string
  readonly sentence: string
  readonly score: number
  readonly confidence: Confidence
  readonly dimensions: readonly Dimension[]
  readonly cautions: readonly string[]
}

/**
 * One thing that, answered differently, would lead somewhere else.
 *
 * Section 31 asks the inspector to show "what would change the answer". This is
 * measured rather than asserted: the decision is re-run with each answer in
 * place, through the same pipeline, and what comes back is compared.
 */
export interface Swing {
  readonly concept: ConceptId
  readonly label: string
  readonly changesTheAnswer: boolean
  readonly outcomes: readonly {
    readonly answer: string
    readonly wouldChoose: string
  }[]
}

/**
 * What this owner's own outcomes did to one candidate (section 35, and 48).
 *
 * The phase brief asks that the inspector be able to show "which learning
 * influenced a decision and how much of it there was", and both halves are
 * here on purpose. `samples` is how much there was. `pull` is how far it moved
 * the starting belief — with one comparable evening that is a quarter, which is
 * section 20's "one success is not proof" expressed as a number somebody can
 * read off the screen and check.
 *
 * The three aspects are kept apart in the trace because they are kept apart in
 * the reasoning. A run of refusals shows up under `appetite` and nowhere else,
 * so an inspector can see directly that a decline never became a claim about
 * whether the move works.
 */
export interface LearningTrace {
  readonly candidate: string
  readonly verb: ActionVerb
  /** Which of tonight and tomorrow the evidence actually speaks to. */
  readonly moved: 'now' | 'tomorrow' | 'neither'
  readonly startedAt: { readonly now: number; readonly tomorrow: number }
  readonly landedAt: { readonly now: number; readonly tomorrow: number }
  readonly samples: number
  readonly pull: number
  readonly evidence: readonly RecordId[]
  readonly summary: string | undefined
  /** True when the owner has told the app to stop holding this belief. */
  readonly corrected: boolean
  readonly followThrough: { readonly rate: number; readonly samples: number; readonly note: string }
  readonly appetite: {
    readonly turnedDown: number
    readonly samples: number
    readonly note: string
  }
}

/** One suggestion, and everything that became of it. */
export interface EpisodeTrace {
  readonly recommendation: RecordId
  readonly sentence: string
  readonly dayId: LocalDayId
  readonly state: MoveState
  /** Whether a result was ever given, and when one is next due. */
  readonly outcome: string
  readonly context: string
  /** How much this evening resembles that one, 0–1. */
  readonly resembles: number
}

export interface DirectionTrace {
  readonly weekly: WeeklyDirection
  /** The semantic category actually stored, or nothing. Never a default. */
  readonly category: LifeDomainId | undefined
  readonly goals: readonly { readonly statement: string; readonly domain: LifeDomainId }[]
}

export interface DecisionTrace {
  readonly architecture: string
  readonly at: Instant
  readonly zone: TimeZoneId
  readonly dayId: LocalDayId
  readonly weekId: LocalWeekId
  readonly block: DayBlock
  readonly facts: readonly ConsideredFact[]
  readonly limiter: Limiter | undefined
  readonly direction: DirectionTrace
  readonly proposed: readonly ProposedMove[]
  readonly rejected: readonly Rejection[]
  readonly ranking: readonly RankedMove[]
  /** One row per surviving candidate — what the owner's outcomes did to it. */
  readonly learning: readonly LearningTrace[]
  /** Every episode the history holds, however it ended. */
  readonly episodes: readonly EpisodeTrace[]
  readonly chosen: string | undefined
  readonly noAction: NoActionReason | undefined
  readonly notes: readonly string[]
  readonly wouldChange: readonly Swing[]
}
