import { createRecordFactory } from '../domain/build'
import type { LifeDomainId } from '../domain/domains'
import { newRecordId, type RecordId } from '../domain/ids'
import type { RecommendationSemantics } from '../domain/recommendation'
import type { CanonicalRecord, ConstraintRecord, Provenance } from '../domain/records'
import { localDayIdAt, type Instant, type TimeZoneId } from '../domain/time'
import { conceptId, type ConceptId } from '../domain/windows'
import { profileFor } from './moves'
import type { Situation } from './situation'

/**
 * What was in the way — F07, D-164, package 5.
 *
 * ## The field that existed and did nothing
 *
 * `action-unable-now` has carried an optional `blocker` since Phase 3. It is
 * plumbed to `planLifecycle`'s `reason` and stored on the episode, and routing
 * 83's instrument found the other half: **no surface wrote it and nothing read
 * it**. So "Can't right now" recorded that the owner could not, and threw away
 * the only thing that would have let the app do anything about it. That is
 * AUD-0050's pattern one record kind further on — complete plumbing, no
 * control.
 *
 * ## The rule, and why the silent path is the harder half
 *
 * D-164: the app may ask **one** compact optional question about what was in
 * the way, gated on whether the answer has a credible path to a better decision
 * or a useful future understanding — **not** on a refusal count. And *"the
 * no-question path is proved as carefully as the question path. Sometimes the
 * intelligent response is silence, and an app that asks after every tap has
 * failed this decision rather than implemented it."*
 *
 * So {@link blockerQuestionFor} never returns `undefined`. It returns a
 * decision that either asks or explicitly declines to, each carrying the reason
 * from a closed list — which is what makes the silence something a test can
 * hold rather than an absence a test can only fail to notice.
 *
 * ## What must never be inferred from an inability
 *
 * Dislike, a verdict on the move, lack of commitment, a permanent veto, or
 * anything about the owner's character. D-045 keeps inability separate from
 * decline and from effect, and nothing here touches that. A blocker is a fact
 * about the situation.
 */

/**
 * The causes the app offers, and what each one is about.
 *
 * A closed list, because a free-text box asking a man why he could not go for a
 * walk at nine in the evening is a worse question than no question. The seven
 * are the review's own list — time, place, fatigue, responsibility, pain,
 * equipment, unexpected interruption — and every one of them is a fact about
 * the evening rather than about him.
 *
 * `standing` is the half that makes gate item 5 provable. Two of the seven are
 * about the world rather than about tonight: not having the kit, and not being
 * where the thing happens. Those become a **`constraint` record** — durable,
 * visible on the domain page, and correctable from there — and the other five
 * are recorded on the episode as what was in the way on that occasion.
 */
export const BLOCKER_CAUSES = [
  'no-time',
  'not-here',
  'too-tired',
  'someone-needs-me',
  'sore',
  'no-kit',
  'interrupted',
] as const

export type BlockerCause = (typeof BLOCKER_CAUSES)[number]

export interface BlockerOption {
  readonly id: BlockerCause
  readonly label: string
  /** The words stored on the record, in the first person, as he said it. */
  readonly statement: (move: string) => string
  /** Whether this is a fact about the world rather than about tonight. */
  readonly standing: boolean
}

/**
 * What each cause is called and what it stores.
 *
 * A `Record<BlockerCause, …>` so an eighth cause is a compile error here rather
 * than a button with no sentence behind it — D-179's shape.
 */
export const BLOCKER_OPTIONS: Record<BlockerCause, BlockerOption> = {
  'no-time': {
    id: 'no-time',
    label: 'No time',
    statement: () => 'There was not enough time.',
    standing: false,
  },
  'not-here': {
    id: 'not-here',
    label: 'Not where I can do it',
    statement: (move) => `${move} needs somewhere I was not.`,
    standing: true,
  },
  'too-tired': {
    id: 'too-tired',
    label: 'Too tired',
    statement: () => 'There was nothing left in the tank.',
    standing: false,
  },
  'someone-needs-me': {
    id: 'someone-needs-me',
    label: 'Someone needed me',
    statement: () => 'Somebody else needed the time.',
    standing: false,
  },
  sore: {
    id: 'sore',
    label: 'Sore',
    statement: () => 'The body was not up to it.',
    standing: false,
  },
  'no-kit': {
    id: 'no-kit',
    label: "Haven't got what I need",
    statement: (move) => `${move} needs something I have not got.`,
    standing: true,
  },
  interrupted: {
    id: 'interrupted',
    label: 'Something came up',
    statement: () => 'Something came up.',
    standing: false,
  },
}

/** The concept a standing blocker constrains, so a later one can match it. */
export function blockerConcept(cause: BlockerCause, semantics: RecommendationSemantics): ConceptId {
  return conceptId(`blocker.${cause}.${semantics.target.object.id}`)
}

export type BlockerAskReason =
  /** Knowing which of these it was would change what the app offers instead. */
  | 'adaptable'
  /** The same move has been blocked before and nobody has said why. */
  | 'repeatedly-blocked'

export type BlockerSilenceReason =
  /** A standing constraint already says what is in the way, and it still holds. */
  | 'already-known'
  /** He has already been asked about this move today. */
  | 'just-asked'
  /** Nothing the answer could say would change anything the app does. */
  | 'nothing-would-change'

export interface BlockerAsk {
  readonly ask: true
  readonly because: BlockerAskReason
  readonly prompt: string
  /** What the app will do with the answer, in view while he answers — D-176. */
  readonly note: string
  readonly options: readonly BlockerOption[]
}

export interface BlockerSilence {
  readonly ask: false
  readonly because: BlockerSilenceReason
  /** What the app already knows, or why the question would buy nothing. */
  readonly detail: string
}

export type BlockerDecision = BlockerAsk | BlockerSilence

/**
 * How many times a move may be blocked before the app is entitled to ask.
 *
 * One. The second time is not a refusal count in D-164's sense — the rule bars
 * gating on *how often he says no*, which is about disagreement. This is about
 * the same **inability** recurring with nobody having said what it was, which
 * is precisely the case where the answer has a use.
 */
const BLOCKED_BEFORE_ASKING = 1

/** "Just leave it" is always available, so this is never the whole of it. */
export const LEAVE_IT = 'Just leave it'

/**
 * Whether to ask what was in the way, and why either way.
 *
 * Read the order: **the reasons not to ask are checked first**, because D-164's
 * do-not-ask list is the operative half. An app that asked whenever it could
 * think of a use would ask after every tap.
 */
export function blockerQuestionFor(
  situation: Situation,
  semantics: RecommendationSemantics,
  moveName: string,
): BlockerDecision {
  const known = standingBlockerFor(situation, semantics)
  if (known !== undefined) {
    return {
      ask: false,
      because: 'already-known',
      detail: known.description,
    }
  }

  if (askedToday(situation, semantics)) {
    return {
      ask: false,
      because: 'just-asked',
      detail: 'You have already said what was in the way today.',
    }
  }

  /*
   * Would knowing change anything? — D-164's first ask-condition, and the one
   * that keeps this from being a form.
   *
   * A move the app has more than one way to adapt is one where the answer
   * lands somewhere: a shorter version, a different hour, an easier thing, or
   * a standing fact that stops it being offered in the wrong place again. A
   * restorative move has none of those — the honest response to "I could not
   * wind down" is to leave him alone, not to ask him to categorise it.
   */
  const profile = profileFor(semantics.target.verb)
  const blockedBefore = timesBlocked(situation, semantics)

  if (blockedBefore > BLOCKED_BEFORE_ASKING) {
    return {
      ask: true,
      because: 'repeatedly-blocked',
      prompt: `${moveName} has not fitted more than once. What is getting in the way?`,
      note: 'This is kept so the app can stop putting it in front of you at the wrong moment.',
      options: Object.values(BLOCKER_OPTIONS),
    }
  }

  if (profile.demand === 'restorative') {
    return {
      ask: false,
      because: 'nothing-would-change',
      detail: 'There is nothing the app would do differently, so it is leaving it.',
    }
  }

  return {
    ask: true,
    because: 'adaptable',
    prompt: 'What got in the way?',
    note: 'This is kept so the app can offer something that fits next time. It is never read as you not wanting to.',
    options: Object.values(BLOCKER_OPTIONS),
  }
}

/** A standing constraint about this move that is still in force. */
export function standingBlockerFor(
  situation: Situation,
  semantics: RecommendationSemantics,
): { readonly description: string; readonly source: RecordId } | undefined {
  for (const cause of BLOCKER_CAUSES) {
    if (!BLOCKER_OPTIONS[cause].standing) continue
    const concept = blockerConcept(cause, semantics)
    const found = situation.constraints.find((constraint) => constraint.concept === concept)
    if (found !== undefined) return { description: found.description, source: found.source }
  }
  return undefined
}

/** How many times this move has been recorded as not fitting, ever. */
function timesBlocked(situation: Situation, semantics: RecommendationSemantics): number {
  let count = 0
  for (const prior of situation.recentMoves) {
    if (prior.state !== 'unable-now') continue
    if (prior.semantics.target.object.id !== semantics.target.object.id) continue
    if (prior.semantics.target.verb !== semantics.target.verb) continue
    count += 1
  }
  return count
}

/** Whether a reason for this move has already been given today. */
function askedToday(situation: Situation, semantics: RecommendationSemantics): boolean {
  const today = situation.dayId
  for (const record of situation.view.history.effective) {
    if (record.kind !== 'action-unable-now') continue
    if (record.blocker === undefined) continue
    if (localDayIdAt(record.occurredAt, situation.zone) !== today) continue
    if (record.entities.some((ref) => ref.id === semantics.target.object.id)) return true
  }
  return false
}

export const BLOCKER_PROVENANCE: Provenance = { source: 'owner', writtenBy: 'now' }

export interface BlockerMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  readonly recordedAt: Instant
  readonly nextId?: () => RecordId
}

/**
 * The durable half of an answer — gate item 5.
 *
 * Two of the seven causes are facts about the world rather than about tonight,
 * and those become a `constraint` record: **durable**, listed on the domain
 * page for the area, and correctable from there like anything else the app
 * believes. The other five are already on the episode, where they belong — a
 * tired evening is not a standing fact about a man.
 *
 * Empty for the five, and that emptiness is the point. Writing a standing
 * constraint from "too tired" would turn one bad evening into a permanent claim
 * about him, which is the first thing D-164 forbids inferring.
 */
export function standingBlockerRecords(
  cause: BlockerCause,
  semantics: RecommendationSemantics,
  moveName: string,
  domain: LifeDomainId,
  moment: BlockerMoment,
): readonly CanonicalRecord[] {
  const option = BLOCKER_OPTIONS[cause]
  if (!option.standing) return []

  const build = createRecordFactory({
    zone: moment.zone,
    provenance: BLOCKER_PROVENANCE,
    ...(moment.nextId === undefined ? {} : { nextId: moment.nextId }),
  })
  const record: ConstraintRecord = build(
    'constraint',
    {
      occurredAt: moment.now,
      recordedAt: moment.recordedAt,
      id: moment.nextId?.() ?? newRecordId(),
      domains: [domain],
      entities: [semantics.target.object],
    },
    {
      concept: blockerConcept(cause, semantics),
      description: option.statement(moveName),
    },
  )
  return [record]
}

/** The words that go on the episode, whichever cause he picked. */
export function blockerStatement(cause: BlockerCause, moveName: string): string {
  return BLOCKER_OPTIONS[cause].statement(moveName)
}
