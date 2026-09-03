import { createRecordFactory } from '../domain/build'
import type { LifeDomainId } from '../domain/domains'
import { newRecordId, type RecordId } from '../domain/ids'
import type { RecommendationSemantics } from '../domain/recommendation'
import type { CanonicalRecord, ConstraintRecord, Provenance } from '../domain/records'
import { endOfLocalDay, localDayIdAt, type Instant, type TimeZoneId } from '../domain/time'
import { CONCEPT } from '../domain/concepts'
import { conceptId, type ConceptId } from '../domain/windows'
import { profileFor, type MoveProfile } from './moves'
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
 * walk at nine in the evening is a worse question than no question. Seven are
 * the review's own list — time, place, fatigue, responsibility, pain, equipment,
 * unexpected interruption — and the eighth is the owner's, from real use. Every
 * one of them is a fact about the evening rather than about him.
 *
 * `standing` is the half that makes gate item 5 provable. Three of the eight are
 * about the world rather than about tonight: not having the kit, not being where
 * the thing happens, and being the only person able to watch somebody. Those
 * become a **`constraint` record** — durable, visible on the domain page, and
 * correctable from there — and the other five are recorded on the episode as
 * what was in the way on that occasion.
 *
 * **A durable record is not an enforced one** (D-187). Nothing in the engine
 * reads a blocker constraint, and no string on this path may suggest otherwise.
 */
export const BLOCKER_CAUSES = [
  'no-time',
  'not-here',
  'too-tired',
  'someone-needs-me',
  /**
   * He cannot leave — somebody is in his care and there is nobody else.
   *
   * The owner's own case, hit on the deployed build: Now offered a walk while
   * his daughter was asleep upstairs and there was no one to watch her. The
   * seven causes had nothing for it. `someone-needs-me` is the near miss and it
   * is wrong twice over — nobody needed his **time**, he was not free to leave —
   * and it is `standing: false`, so it wrote no durable record at all. The app
   * learned one canned string on one episode and forgot it.
   *
   * **It is not a refusal and not a dislike** (D-045). Nothing may read it as
   * either, and nothing does: it reaches `owner-preference` through no path.
   */
  'must-stay',
  /**
   * The same fact, bounded — S2 Tier 1's *"a bounded `until` on a constraint"*.
   *
   * §5.2 records the gap precisely: *"While she is asleep"* has no
   * representation, and **no blocker path sets `ConstraintRecord.until`**. The
   * field has existed since Phase 1 and nothing has ever written it.
   *
   * It is a second button rather than a second question. D-164 allows **one**
   * compact question about what was in the way, so the bound travels with the
   * answer instead of following it: he says he cannot leave, and says in the
   * same tap whether that is tonight or until he says otherwise. One is a fact
   * about an evening and the other is a fact about his life, and the app has no
   * business guessing which he meant.
   */
  'must-stay-tonight',
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
  'must-stay': {
    id: 'must-stay',
    label: 'Can’t leave — someone’s in my care',
    /*
     * What was recorded, and nothing about what will follow from it — D-187.
     *
     * The temptation here is one clause: *"so the app will stop suggesting
     * things that mean going out."* It would be false. `applyConstraints` never
     * reads `situation.constraints`, and `cautionsFor` matches a constraint's
     * concept against a candidate's `leansOn`, which never contains a
     * `blocker.*` concept — so nothing acts on this, deliberately
     * (`constraints.ts` says so in as many words).
     *
     * Making it act is F08's blocker aggregation, adjudicated to later
     * Validity: it needs a supervision concept the registry does not have, a
     * candidate attribute for *requires leaving the house* that nothing has, and
     * a reversal of that non-enforcement decision. Capturing it honestly now is
     * what makes that possible; promising it now is what would make the app's
     * promises decorative.
     */
    statement: (move) => `${move} means leaving, and I could not — someone was in my care.`,
    standing: true,
  },
  'must-stay-tonight': {
    id: 'must-stay-tonight',
    label: 'Can’t leave tonight — someone’s in my care',
    /*
     * The same sentence with the bound in it, and nothing about what follows —
     * D-187. What is recorded is what he said; the app does not promise here.
     */
    statement: (move) => `${move} means leaving, and I could not tonight — someone was in my care.`,
    standing: true,
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

/**
 * The concept a standing blocker constrains, so a later one can match it.
 *
 * **Supervision is the exception, and it is the whole of C21's concept half.**
 * Every other cause is about one move — not having the kit for *this*, not
 * being where *this* happens — so it is scoped to the object and says nothing
 * about anything else. *"I could not leave"* is not about the walk. It is a
 * fact about the owner's evening that applies to every move that means going
 * out, and scoping it to the object was what left it unable to reach anything:
 * the constraint named `blocker.must-stay.routine:a-walk`, which is a concept
 * the registry had never heard of and no other move could ever match.
 *
 * So it resolves to {@link CONCEPT.mustStay}, which has a registry home, a
 * privacy class, a freshness horizon and a reader. That is the difference
 * between a record and a concept, and it is the difference D-187 was waiting
 * for.
 */
export function blockerConcept(cause: BlockerCause, semantics: RecommendationSemantics): ConceptId {
  // Both supervision answers are the same fact and resolve to the same concept.
  // What differs between them is how long it stands, which is the record's
  // `until` rather than a second thing to be known about the owner.
  if (cause === 'must-stay' || cause === 'must-stay-tonight') return CONCEPT.mustStay
  return conceptId(`blocker.${cause}.${semantics.target.object.id}`)
}

/**
 * What the app does with an answer about the world — D-164's extension, D-274.
 *
 * One clause, appended to both notes rather than written twice, because two
 * copies of a promise are two things to keep true. It says the **condition**
 * — an answer about the world rather than about tonight — instead of naming a
 * button, because the owner has not pressed one yet and five of the eight
 * causes are about the evening and change nothing.
 *
 * *"Keeps this move off"* rather than *"the app will offer something that fits"*:
 * the first is what `applyConstraints` does and the second is a claim about a
 * future recommendation that nothing makes.
 */
const STANDING_ANSWERS_KEEP_IT_OFF =
  'An answer about the world rather than about tonight also keeps this move off until you take it back.'

const REPEATED_NOTE =
  'This is kept with the evening it happened on, and shown on the area it belongs to.'

const ADAPTABLE_NOTE =
  'This is kept on the area it belongs to, where you can take it back. It is never read as you not wanting to.'

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
      /*
       * What is recorded, where, and — since routing 93 — what follows from it.
       *
       * This said *"so the app can stop putting it in front of you at the wrong
       * moment"*, which was a promise nothing kept: no reader anywhere consulted
       * a blocker constraint (QA-84-010, D-192). The sentence was removed and
       * the promise with it.
       *
       * **C21's enforcement half has landed (D-274), so the second half is true
       * now and saying nothing about it has become the defect.** D-164's own
       * reconciliation says so in as many words: it extends from *"asked when
       * the answer has a use"* to *"and the use is delivered"*, and *"when
       * something does act on a blocker, silence about it becomes a different
       * defect."*
       *
       * The clause names the condition rather than the button, because the owner
       * has not picked one yet and five of the eight causes are about the
       * evening rather than about the world. Those still write nothing standing
       * and still change nothing about what is offered, which is exactly what
       * the sentence says.
       */
      note: `${REPEATED_NOTE} ${STANDING_ANSWERS_KEEP_IT_OFF}`,
      options: Object.values(BLOCKER_OPTIONS),
    }
  }

  if (profile.demand === 'restorative') {
    return {
      ask: false,
      because: 'nothing-would-change',
      /*
       * Why it is not asking, without a claim about later — QA-84-011, D-193.
       *
       * This said *"there is nothing the app would do differently"*, which is
       * true and is still a statement about what the app would do. D-187's rule
       * is that this path says what is recorded and not what follows from it,
       * and a denial of a future change is as much a claim about the future as
       * an assertion of one. The reason it is silent is a fact about **the move
       * that was offered**, which is a fact about now.
       */
      detail:
        'This was a restful thing rather than an effortful one, and there is nothing here worth asking about.',
    }
  }

  return {
    ask: true,
    because: 'adaptable',
    prompt: 'What got in the way?',
    /*
     * The string QA read off the deployed build — QA-84-010 — and the clause
     * routing 93 was allowed to put back.
     *
     * What was removed was *"so the app can offer something that fits next
     * time"*: the exact future adaptation D-187 forbids, promised on the screen
     * D-187 is about. The second sentence stayed because it is true and is the
     * point — an inability is not a preference (D-045).
     *
     * The third is new and is the one C21's enforcement earns (D-274). It is not
     * the old promise wearing better words: the old one said the app would offer
     * *something else*, which nothing does; this says the blocked move **stays
     * off**, which `applyConstraints` now does, on the closed list of standing
     * causes, until he takes it back from the area's own page.
     */
    note: `${ADAPTABLE_NOTE} ${STANDING_ANSWERS_KEEP_IT_OFF}`,
    options: Object.values(BLOCKER_OPTIONS),
  }
}

/**
 * A standing constraint about this move that is still in force.
 *
 * Supervision is matched only against a move that means going out — the same
 * asymmetry `blockerConcept` creates one function up. A man who cannot leave
 * the house can still wind down in it, and telling him the app already knows
 * what is in the way of an indoor move would be answering a question nobody
 * asked.
 */
export function standingBlockerFor(
  situation: Situation,
  semantics: RecommendationSemantics,
  profile: MoveProfile = profileFor(semantics.target.verb),
): { readonly description: string; readonly source: RecordId } | undefined {
  for (const cause of BLOCKER_CAUSES) {
    if (!BLOCKER_OPTIONS[cause].standing) continue
    if (
      (cause === 'must-stay' || cause === 'must-stay-tonight') &&
      profile.requiresLeaving !== true
    ) {
      continue
    }
    const concept = blockerConcept(cause, semantics)
    const found = situation.constraints.find(
      (constraint) =>
        constraint.concept === concept &&
        /*
         * And the area it was recorded about — DEF-0168.
         *
         * The concept is scoped to the **object** and not to the move, and one
         * object can be the subject of moves in two areas. *"Take tonight as
         * recovery — no subnetting session"* is a **sleep** move whose object is
         * a career topic, so *"I haven't got what I need"* about reviewing
         * subnetting was removing the move that says not to review subnetting —
         * the app refusing to let him rest because he could not study.
         *
         * Supervision is exempt and has to be: *"I could not leave"* is a fact
         * about his evening rather than about an area, and it is matched by
         * `requiresLeaving` above rather than by a noun.
         */
        (cause === 'must-stay' ||
          cause === 'must-stay-tonight' ||
          constraint.domains.length === 0 ||
          constraint.domains.includes(semantics.domain)),
    )
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
  /*
   * And supervision is bounded to the day it was said on — S2 Tier 1's
   * *"a bounded `until` on a constraint"*, and the half §5.2 records as having
   * no representation at all: *"While she is asleep"* had nowhere to live, and
   * **no blocker path set `ConstraintRecord.until`**.
   *
   * The bound is the end of the owner-local day, and it is not a guess about
   * how long she sleeps. It is the honest ceiling on what one tap may claim:
   * *"someone is in my care"* is a fact about tonight, and turning it into a
   * standing fact about his life from one press would be the thing D-164
   * forbids inferring. He can still take it back sooner — the domain page
   * carries "Not true any more" for every standing blocker — and if it is true
   * again tomorrow the app will be told again, which costs one tap and claims
   * nothing it was not told.
   *
   * The other two standing causes keep no bound. Not having the kit and not
   * being where the thing happens are facts about the world that do not end at
   * midnight, and giving them one would quietly delete something the owner said
   * without him asking.
   */
  /*
   * The bound the owner chose, and only where he chose one.
   *
   * `must-stay` stands until he lifts it, exactly as it did before this phase;
   * `must-stay-tonight` ends with the owner-local day. Nothing is bounded on
   * his behalf: turning *"someone is in my care"* into a standing fact about
   * his life from one press, or quietly deleting it at midnight, are both the
   * app deciding something he did not say.
   */
  const until =
    cause === 'must-stay-tonight'
      ? endOfLocalDay(localDayIdAt(moment.now, moment.zone), moment.zone)
      : undefined

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
      ...(until === undefined ? {} : { until }),
    },
  )
  return [record]
}

/** The words that go on the episode, whichever cause he picked. */
export function blockerStatement(cause: BlockerCause, moveName: string): string {
  return BLOCKER_OPTIONS[cause].statement(moveName)
}
