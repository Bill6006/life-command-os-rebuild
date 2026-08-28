import { CONCEPT } from '../domain/concepts'
import { DOMAIN, type LifeDomainId } from '../domain/domains'
import { entityRef, type EntityRef, type SemanticEntity } from '../domain/entities'
import type { RecordId } from '../domain/ids'
import { basisOf, isUsable, type Knowledge } from '../domain/knowledge'
import type { FactValue } from '../domain/records'
import type {
  ActionTarget,
  ActionVerb,
  RecommendationSemantics,
  WhyNowTrigger,
} from '../domain/recommendation'
import type { ConceptId } from '../domain/windows'
import { goalIsBehind, type ActiveGoal } from './direction'
import { growthStandingFor, maintenanceProbeDue, practiceEvidenceHasAged } from './growth'
import { profileFor } from './moves'
import { refreshingMoveFor } from './refreshing'
import { SORE_ENOUGH_TO_EASE_OFF, type Situation } from './situation'
import { entityValue } from './values'

/**
 * Candidate generation (canonical plan section 17.1, step 5).
 *
 * "Produces realistic possible actions." Two rules decide what counts as
 * realistic here.
 *
 * **A candidate must have a real subject.** Every generator below starts from
 * something in the owner's own history — the topic they are studying, the
 * person who is here tonight, the room that keeps getting cluttered — or from
 * the engine's own small vocabulary of routines. A generator that cannot find a
 * subject produces nothing rather than something vague. That is section 13.4
 * enforced at the source instead of patched at the renderer.
 *
 * **Generators do not decide.** Section 17.2: domain modules contribute facts,
 * interpretation, constraints and candidates, and one arbitration path decides.
 * Nothing in this file scores, ranks or filters. Each generator's only job is to
 * say "this would be a sensible thing to do, and here is why I thought so".
 */

export type GeneratorId =
  | 'sleep'
  | 'career'
  | 'fatherhood'
  | 'home'
  | 'social'
  | 'health'
  | 'money'
  /** Section 8's third preference: an action that produces evidence. */
  | 'coverage'

export interface Candidate {
  /** Deterministic, so a trace can be compared across runs. */
  readonly id: string
  readonly generator: GeneratorId
  readonly semantics: RecommendationSemantics
  /** Concepts this move leans on. Drives uncertainty scoring and the guide. */
  readonly leansOn: readonly ConceptId[]
  /**
   * Concepts this move exists in order to find something out about.
   *
   * Always a subset of `leansOn`, and almost always empty: an ordinary move
   * rests on what is known and settles nothing. It is not empty for a move
   * proposed *because* something has gone quiet, and that is the whole point of
   * the field — `uncertainty` has nothing to say about a concept the move is
   * there to resolve.
   *
   * Without it the same silence both created the move and marked it down, and
   * the penalty was the larger of the two: on the evening built to demonstrate
   * a seven-week gap in the studying, the score gap was 0.027 and the
   * uncertainty differential 0.054. Section 8's third refresh route was
   * cancelling itself, and the screen read as circular — nothing has come in
   * about your studying, so here is a walk, because it is better supported by
   * what is known.
   *
   * **Declaring a concept here buys silence, never approval.** The dimension
   * abstains; it does not turn positive. Rewarding a move for the gap it was
   * created by would be the same error wearing the other sign.
   */
  readonly resolves: readonly ConceptId[]
  /** One line for the trace: why this was proposed at all. */
  readonly proposedBecause: string
}

export const SLEEP_SUBJECT: EntityRef = entityRef('life-domain', 'sleep')
export const WINDING_DOWN: EntityRef = entityRef('routine', 'winding down')
export const A_WALK: EntityRef = entityRef('routine', 'a walk')
export const EASING_OFF: EntityRef = entityRef('routine', 'easing off')
export const A_LIGHT_DAY: EntityRef = entityRef('routine', 'a light day')

function target(verb: ActionVerb, object: EntityRef, minutes: number | undefined): ActionTarget {
  return minutes === undefined ? { verb, object } : { verb, object, minutes }
}

/** A move's own length, trimmed to fit the evening when the evening is known. */
function sizeFor(verb: ActionVerb, situation: Situation): number | undefined {
  const natural = profileFor(verb).size
  if (natural === undefined) return undefined
  // Trimmed to what is actually left rather than to what the owner said —
  // AUD-0004. "Spend 45 minutes on a lab" twenty minutes before the school run
  // is the sentence the audit found and the one an obligation makes impossible.
  const inHand = situation.inHand.minutes
  if (!isUsable(inHand)) return natural
  const available = inHand.value
  if (available <= 0) return natural
  return Math.max(5, Math.min(natural, Math.floor(available)))
}

interface CandidateInput {
  readonly generator: GeneratorId
  readonly subject: EntityRef
  readonly domain: LifeDomainId
  readonly verb: ActionVerb
  readonly object: EntityRef
  readonly trigger: WhyNowTrigger
  readonly evidence: readonly RecordId[]
  readonly leansOn: readonly ConceptId[]
  readonly proposedBecause: string
  readonly relatedGoal?: EntityRef
  /** Concepts this move exists to find something out about. Rarely any. */
  readonly resolves?: readonly ConceptId[]
  /**
   * That the app does not know how long this one takes — QA-84-001.
   *
   * `sizeFor` gives every move its verb's natural size, trimmed to what is in
   * hand, and that is right for the app's own routines: a walk is twenty-five
   * minutes because the catalogue says so. It is wrong for a step the **owner**
   * named — he wrote a sentence, not a session, and "Move for 25 minutes: lift
   * twice each week" is the app inventing a duration for something it has never
   * seen. F36 forbids exactly that, and `ActionTarget.minutes` is already
   * optional so that an absent one is a real state (G-009).
   */
  readonly durationUnknown?: boolean
}

function candidate(input: CandidateInput, situation: Situation): Candidate {
  const semantics: RecommendationSemantics = {
    subject: input.subject,
    domain: input.domain,
    target: target(
      input.verb,
      input.object,
      input.durationUnknown === true ? undefined : sizeFor(input.verb, situation),
    ),
    // The summary is left empty here. The explanation generator writes it from
    // the facts that were actually used, which is what stops every profile
    // getting the same sentence (section 64).
    whyNow: { trigger: input.trigger, summary: '', evidence: input.evidence },
    ...(input.relatedGoal === undefined ? {} : { relatedGoal: input.relatedGoal }),
    evidence: input.evidence,
  }

  return {
    id: `${input.generator}/${input.verb}/${input.object.id}`,
    generator: input.generator,
    semantics,
    leansOn: input.leansOn,
    // Narrowed to what the move actually rests on, so a generator cannot claim
    // to settle something it never touches.
    resolves: (input.resolves ?? []).filter((concept) => input.leansOn.includes(concept)),
    proposedBecause: input.proposedBecause,
  }
}

// ---------------------------------------------------------------------------
// Finding the owner's own subjects
// ---------------------------------------------------------------------------

function resolvedEntity(
  knowledge: Knowledge<FactValue>,
  situation: Situation,
): SemanticEntity | undefined {
  if (!isUsable(knowledge)) return undefined
  const ref = entityValue(knowledge.value)
  return ref === undefined ? undefined : situation.entities.resolve(ref)
}

function firstOfKind(
  situation: Situation,
  kind: SemanticEntity['kind'],
  domain?: LifeDomainId,
): SemanticEntity | undefined {
  for (const entity of situation.entities.byKind(kind)) {
    if (domain === undefined || entity.domain === domain) return entity
  }
  return undefined
}

/** Outcome records that went badly for a subject, most recent first. */
function roughOutcomesFor(situation: Situation, subject: EntityRef): readonly RecordId[] {
  const found: { readonly id: RecordId; readonly at: number }[] = []
  for (const record of situation.view.history.effective) {
    if (record.kind !== 'outcome') continue
    if (record.sentiment !== 'worse') continue
    if (!record.entities.some((ref) => ref.id === subject.id)) continue
    found.push({ id: record.id, at: record.occurredAt })
  }
  return found.sort((a, b) => b.at - a.at).map((entry) => entry.id)
}

function activeGoalFor(situation: Situation, domain: LifeDomainId): ActiveGoal | undefined {
  return situation.direction.goals.find((goal) => goal.domain === domain)
}

/**
 * Whether the app may say a goal is behind — AUD-0046.
 *
 * The trigger used to be raised by the *existence* of a goal, and `evaluate.ts`
 * pays it `urgency 0.4`, so every career recommendation carried an urgency
 * premium justified by a claim nothing checked. `goalIsBehind` is the check:
 * it needs both a horizon the owner set and named pieces of work, and it
 * returns false where either is missing rather than guessing.
 *
 * There is one rule and one helper because two generators raise this trigger,
 * and both were raising it from something that is not behind-ness — the career
 * one from a goal existing, the money one from the cash buffer being known.
 */
function behindOn(situation: Situation, domain: LifeDomainId): boolean {
  const goal = activeGoalFor(situation, domain)
  return goal !== undefined && goalIsBehind(goal)
}

// ---------------------------------------------------------------------------
// The generators
// ---------------------------------------------------------------------------

type Generator = (situation: Situation) => readonly Candidate[]

/**
 * Recovery.
 *
 * Only proposed when there is evidence of strain — this generator does not fire
 * on a good night, which is half of why G-005's counterexample comes out
 * differently. When there is something effortful in play, the move that names
 * it wins the right to be proposed: "no subnetting session tonight" says
 * something about this owner's evening that "wind down" does not.
 */
const sleepCandidates: Generator = (situation) => {
  const strain = situation.capacity.strain
  const soreness = situation.capacity.soreness
  const strained = isUsable(strain) && strain.value !== 'none'
  /*
   * A body asking for an easier day is a limiter, and this is the generator
   * that answers it — QA-81-001.
   *
   * AUD-0003 leads with an invariant and the invariant names `capacity`
   * alongside `recovery`: *when recovery or capacity is the dominant limiter, a
   * recovery-compatible option must exist in every relevant day block.* The
   * same finding's implementation note says to gate the new verb on strain
   * "exactly as the existing sleep generator does", which is guidance about the
   * verb rather than a licence to leave half the invariant false. Independent QA
   * read it that way and was right to.
   *
   * `findLimiter` raises the capacity limiter at exactly this reading, so the
   * two share one threshold: a limiter the app names on screen while the
   * generator that would answer it stays quiet is DEF-0016's whole shape.
   */
  const sore = isUsable(soreness) && soreness.value >= SORE_ENOUGH_TO_EASE_OFF
  if (!strained && !sore) return []

  const evidence = [
    ...basisOf(strain),
    ...basisOf(situation.capacity.sleepDebtHours),
    ...(sore ? basisOf(soreness) : []),
  ]
  const leansOn: readonly ConceptId[] = sore
    ? [CONCEPT.sleepHours, CONCEPT.energy, CONCEPT.soreness]
    : [CONCEPT.sleepHours, CONCEPT.energy]

  /*
   * The right recovery move for the hour — DEF-0016, and then AUD-0003.
   *
   * The afternoon used to get `protect-sleep`, which the filter then refused as
   * a wrong-time-of-day move, so a man nine hours short of sleep at a quarter
   * to six was told "Nothing fits tonight" and offered nothing. DEF-0016 added
   * `ease-off` and swept every half hour **from noon to midnight**.
   *
   * The morning was never swept, and before noon this generator returned
   * nothing at all. So on a morning where strain was severe the only candidates
   * in existence were career moves; the filter removed the two heaviest as too
   * strained, and the survivor was recommended. The screen named a nine-hour
   * shortfall and then prescribed a study session — scenario G-005 holding in
   * the evening and failing in the half of the day nobody looked at.
   *
   * The general rule this leaves, and the one the regression checks: a
   * generator does not offer a move the hour rules out, and it does not fall
   * silent at an hour that has a move of its own.
   */
  const morning = situation.block === 'morning' || situation.block === 'early-morning'
  const verb: ActionVerb = morning
    ? 'lighten-the-day'
    : situation.block === 'late-night'
      ? 'wind-down'
      : situation.block === 'afternoon'
        ? 'ease-off'
        : 'protect-sleep'

  /*
   * One move, not two. When there is a specific thing tonight would otherwise
   * be spent on, naming it is the better sentence — section 4.6, a specific
   * ordinary sentence beats an elegant generic one. Proposing both "wind down"
   * and "no subnetting session tonight" is proposing the same evening twice and
   * leaving the arbiter to pick between wordings.
   *
   * The morning does not take this route. `recover` is about giving an evening
   * over to rest, which is not something nine in the morning can offer, so the
   * morning keeps its own move and names the competing topic in the reason
   * instead — where it can be said without claiming the day is already spent.
   */
  const topic = resolvedEntity(situation.learningTopic, situation)
  if (topic !== undefined && !morning) {
    return [
      candidate(
        {
          generator: 'sleep',
          subject: SLEEP_SUBJECT,
          domain: DOMAIN.sleep,
          verb: 'recover',
          object: { id: topic.id, kind: topic.kind },
          trigger: 'deficit',
          evidence,
          leansOn: [...leansOn, CONCEPT.learningTopic],
          proposedBecause: 'the thing competing for tonight is the study session',
        },
        situation,
      ),
    ]
  }

  return [
    candidate(
      {
        generator: 'sleep',
        subject: SLEEP_SUBJECT,
        domain: DOMAIN.sleep,
        verb,
        object: RECOVERY_OBJECT[verb] ?? WINDING_DOWN,
        trigger: 'deficit',
        evidence,
        /*
         * The morning may name what today would otherwise have gone on, and it
         * may do so only when the topic is actually known. DEF-0006's rule is
         * that an explanation cites what the decision leaned on, so the
         * permission and the fact have to arrive together or the sentence is
         * rationalising the winner after the fact.
         */
        leansOn: morning && topic !== undefined ? [...leansOn, CONCEPT.learningTopic] : leansOn,
        proposedBecause: strained
          ? 'there is a running shortfall of rest'
          : 'the body is asking for an easier day',
      },
      situation,
    ),
  ]
}

/** The routine each recovery verb is about. */
const RECOVERY_OBJECT: Partial<Record<ActionVerb, EntityRef>> = {
  'ease-off': EASING_OFF,
  'lighten-the-day': A_LIGHT_DAY,
  'wind-down': WINDING_DOWN,
  'protect-sleep': WINDING_DOWN,
}

/** Career and learning. Needs a topic the owner is actually on. */
const careerCandidates: Generator = (situation) => {
  const topic = resolvedEntity(situation.learningTopic, situation)
  if (topic === undefined) return []

  const ref: EntityRef = { id: topic.id, kind: topic.kind }
  const goal = activeGoalFor(situation, DOMAIN.career)?.goal
  // Only when something actually measures behind-ness — AUD-0046.
  const behind = behindOn(situation, DOMAIN.career)
  const rough = roughOutcomesFor(situation, ref)
  const evidence = [...basisOf(situation.learningTopic), ...rough]
  const leansOn: readonly ConceptId[] = [CONCEPT.learningTopic, CONCEPT.usableTimeTonight]
  const out: Candidate[] = []

  const base = {
    generator: 'career' as const,
    subject: ref,
    domain: DOMAIN.career,
    object: ref,
    evidence,
    leansOn,
    ...(goal === undefined ? {} : { relatedGoal: goal }),
  }

  if (rough.length > 0) {
    out.push(
      candidate(
        {
          ...base,
          verb: 'review-weak-topic',
          trigger: 'recent-struggle',
          proposedBecause: 'the last attempt at this went badly',
        },
        situation,
      ),
    )
  }

  out.push(
    candidate(
      {
        ...base,
        verb: 'recall-practice',
        trigger: rough.length > 0 ? 'recent-struggle' : behind ? 'goal-behind' : 'nothing-better',
        proposedBecause: 'retrieval is what moves a topic, and this is the current one',
      },
      situation,
    ),
  )

  out.push(
    candidate(
      {
        ...base,
        verb: 'hands-on-lab',
        trigger: behind ? 'goal-behind' : 'good-conditions',
        proposedBecause: 'building something is the proof a topic is actually held',
      },
      situation,
    ),
  )

  return out
}

/** Fatherhood. Nothing here fires unless she is actually here. */
const fatherhoodCandidates: Generator = (situation) => {
  /*
   * Whether she is actually here, not whose week it is — QA-82-001.
   *
   * This read the standing arrangement and called it presence, so on a Wednesday
   * at ten o'clock — inside a school day the owner had told the app about — it
   * went on proposing thirty unhurried minutes with her. `childHere` is the same
   * arrangement narrowed by her own day, and it can only ever subtract: an
   * unknown arrangement stays unknown and this generator stays quiet, exactly
   * as before.
   */
  const present = situation.childHere
  if (!isUsable(present) || !present.value) return []

  const child = firstOfKind(situation, 'person', DOMAIN.fatherhood)
  if (child === undefined) return []

  const childRef: EntityRef = { id: child.id, kind: child.kind }
  const evidence = basisOf(present)
  const out: Candidate[] = [
    candidate(
      {
        generator: 'fatherhood',
        subject: childRef,
        domain: DOMAIN.fatherhood,
        verb: 'time-with',
        object: childRef,
        trigger: 'opportunity-window',
        evidence,
        leansOn: [CONCEPT.childPresent, CONCEPT.usableTimeTonight],
        proposedBecause: 'she is here and the evening has room in it',
      },
      situation,
    ),
  ]

  // A growth area only becomes a move when the model knows whose it is —
  // the renderer walks the entity's own link rather than accepting a name.
  for (const skill of situation.entities.byKind('development-skill')) {
    if (situation.entities.linked(skill.id, 'about-person')?.id !== child.id) continue
    const skillRef: EntityRef = { id: skill.id, kind: skill.kind }
    /*
     * Why this is being suggested, and it is two different reasons.
     *
     * Section 8: "a child's developmental skill may need periodic evidence."
     * When the last occasion was a fortnight ago the honest answer is that the
     * app's picture of where she is has aged, and `stale-evidence` says so —
     * which is also what makes that trigger reachable for something other than
     * a cash buffer. When she practised it on Tuesday, this is simply a chance
     * that is open now, which is a different sentence and a different urgency.
     */
    /*
     * A settled skill is not proposed — AUD-0015(a).
     *
     * This enumerated every `development-skill` unconditionally, so the owner's
     * confirmation that his daughter had got something changed nothing at all:
     * the suggestion beside the decision went quiet and the move kept coming
     * back. Section 62 in as many words — "the app should preserve the
     * correction and stop reasserting the old belief unless new evidence
     * genuinely supports revisiting it".
     *
     * What is left is an occasional check at expanding intervals, which is what
     * the maintenance literature recommends after mastery and is a different
     * sentence rather than the same one at a lower rate.
     */
    const standing = growthStandingFor(situation, skillRef)
    if (standing.stage === 'settled' && !maintenanceProbeDue(situation, skillRef)) continue

    const probing = standing.stage === 'settled'
    const aged = practiceEvidenceHasAged(situation, skillRef)
    out.push(
      candidate(
        {
          generator: 'fatherhood',
          subject: skillRef,
          domain: DOMAIN.fatherhood,
          verb: 'growth-opportunity',
          object: skillRef,
          trigger: probing ? 'stale-evidence' : aged ? 'stale-evidence' : 'opportunity-window',
          evidence,
          leansOn: [CONCEPT.childPresent],
          proposedBecause: probing
            ? 'this one is settled, and it has been a long while since it came up'
            : aged
              ? 'nothing has come in about this growth area for a while'
              : 'there is a growth area with a natural chance to practise it',
        },
        situation,
      ),
    )
  }

  return out
}

/** Home. Needs a room, not a mood. */
const homeCandidates: Generator = (situation) => {
  if (!isUsable(situation.homeFriction)) return []
  const place = firstOfKind(situation, 'place', DOMAIN.home)
  if (place === undefined) return []

  const ref: EntityRef = { id: place.id, kind: place.kind }
  return [
    candidate(
      {
        generator: 'home',
        subject: ref,
        domain: DOMAIN.home,
        verb: 'reset-space',
        object: ref,
        trigger: 'constraint-active',
        evidence: basisOf(situation.homeFriction),
        leansOn: [CONCEPT.homeFriction, CONCEPT.usableTimeTonight],
        proposedBecause: 'a small friction here costs the next few evenings',
      },
      situation,
    ),
  ]
}

/**
 * Social.
 *
 * Section 10 — no quotas and no streaks. This proposes a specific natural move
 * when the conditions are actually there, and proposes nothing otherwise.
 */
const socialCandidates: Generator = (situation) => {
  const energy = situation.socialEnergy
  if (!isUsable(energy) || energy.value < 0.6) return []

  const evidence = basisOf(energy)
  const out: Candidate[] = []

  const place = firstOfKind(situation, 'place', DOMAIN.social)
  if (place !== undefined) {
    const ref: EntityRef = { id: place.id, kind: place.kind }
    out.push(
      candidate(
        {
          generator: 'social',
          subject: ref,
          domain: DOMAIN.social,
          verb: 'start-conversation',
          object: ref,
          trigger: 'good-conditions',
          evidence,
          leansOn: [CONCEPT.socialEnergy],
          proposedBecause: 'the conditions for this are unusually good right now',
        },
        situation,
      ),
    )
  }

  const person = firstOfKind(situation, 'person', DOMAIN.social)
  if (person !== undefined) {
    const ref: EntityRef = { id: person.id, kind: person.kind }
    out.push(
      candidate(
        {
          generator: 'social',
          subject: ref,
          domain: DOMAIN.social,
          verb: 'reach-out',
          object: ref,
          trigger: 'good-conditions',
          evidence,
          leansOn: [CONCEPT.socialEnergy],
          proposedBecause: 'this is someone worth not losing touch with',
        },
        situation,
      ),
    )
  }

  return out
}

/**
 * Movement. Only when the body has something to spend.
 *
 * "There is capacity for it" is a claim about how the owner feels, and three
 * good nights of sleep is not evidence of it. Strain can be worked out from
 * sleep alone, which was enough to make this generator fire on a history that
 * knew nothing about energy or soreness — and an effortful twenty-five minutes
 * proposed on that basis is a guess wearing a recommendation's clothes.
 * So it now needs a real capacity reading, and stays quiet without one.
 */
const healthCandidates: Generator = (situation) => {
  const strain = situation.capacity.strain
  if (!isUsable(strain) || strain.value !== 'none') return []
  if (!isUsable(situation.capacity.energy) && !isUsable(situation.capacity.soreness)) return []

  const out: Candidate[] = [
    candidate(
      {
        generator: 'health',
        subject: A_WALK,
        domain: DOMAIN.health,
        verb: 'move',
        object: A_WALK,
        trigger: 'good-conditions',
        evidence: basisOf(strain),
        leansOn: [CONCEPT.energy, CONCEPT.soreness],
        proposedBecause: 'there is capacity for it and it pays back tomorrow',
      },
      situation,
    ),
  ]

  /*
   * And the next step he named himself, where he has named one — QA-84-001.
   *
   * ## What this fixes
   *
   * A destination in Health changed nothing an owner could see. Career and
   * Money each gain a candidate the thin store did not have, because their
   * generators consume an owner-named object — a `learning-topic`, a
   * `financial-goal`. Health's consumed nothing the owner could create, so
   * naming an aspiration there moved a score by 0.04 and no word on the screen.
   *
   * ## Why this is not AUD-0045's routines library
   *
   * It is bound to **the next milestone of an active destination**, and to
   * nothing else. An owner routine introduced through the authoring control is
   * still never suggested; a routine that is not a destination's next step is
   * still never suggested; and there is no ranking over the owner's routines
   * anywhere. *"This phase builds the route; Reach walks it"* — a destination's
   * own next step is the route, and one step of it is not a library.
   *
   * ## And it is squarely inside D-021
   *
   * *"Every other subject a recommendation can be about must already exist in
   * the owner's history, or the move is not proposed."* This subject exists
   * because he created it, exactly as the home generator's `place` and the
   * money generator's `financial-goal` do. The engine invents nothing.
   *
   * ## No minutes
   *
   * `move` renders "Move for N minutes: X" with a duration and "Get some
   * movement in: X" without one. The app has no idea how long his next step
   * takes — he wrote a sentence, not a session — and inventing a number for it
   * is the precision F36 forbids. So it is proposed with none.
   */
  const next = nextMilestoneIn(situation, DOMAIN.health)
  if (next !== undefined) {
    out.push(
      candidate(
        {
          generator: 'health',
          subject: next.goal,
          domain: DOMAIN.health,
          verb: 'move',
          object: next.goal,
          trigger: 'good-conditions',
          evidence: basisOf(strain),
          leansOn: [CONCEPT.energy, CONCEPT.soreness],
          relatedGoal: next.goal,
          durationUnknown: true,
          proposedBecause: 'it is the step he named towards what he is aiming at',
        },
        situation,
      ),
    )
  }

  return out
}

/**
 * The next milestone of an active destination in this area, if it has one.
 *
 * Deliberately narrow, and every clause of it is load-bearing: an **active**
 * destination, its **next** step — the first one not yet reached — and only
 * where the subject actually resolves, because a move about an entity the index
 * has lost renders nothing (D-018) and should not be proposed at all.
 */
function nextMilestoneIn(situation: Situation, domain: LifeDomainId): ActiveGoal | undefined {
  for (const destination of situation.direction.destinations) {
    if (destination.domain !== domain) continue
    if (destination.state !== 'active') continue
    const next = destination.next
    if (next === undefined) continue
    if (situation.entities.labelFor(next.goal.goal) === undefined) continue
    return next.goal
  }
  return undefined
}

/** Money. Needs a goal that exists, never a generic "check your budget". */
const moneyCandidates: Generator = (situation) => {
  const goal = firstOfKind(situation, 'financial-goal')
  if (goal === undefined) return []

  const ref: EntityRef = { id: goal.id, kind: goal.kind }
  const cash = situation.view.facts.knowledgeFor(CONCEPT.cashBuffer)
  const known = isUsable(cash)
  return [
    candidate(
      {
        generator: 'money',
        subject: ref,
        domain: DOMAIN.money,
        verb: 'handle-money-item',
        object: ref,
        /*
         * Not `goal-behind` merely because the buffer is known — AUD-0046.
         *
         * This raised behind-ness whenever the cash buffer had a reading, which
         * is a fact about what the app has been told rather than about the
         * goal. Knowing the balance is not evidence that the goal is slipping,
         * and the urgency premium was being paid for it anyway.
         */
        trigger: behindOn(situation, DOMAIN.money)
          ? 'goal-behind'
          : known
            ? 'nothing-better'
            : 'stale-evidence',
        evidence: basisOf(cash),
        leansOn: [CONCEPT.cashBuffer],
        // When the buffer is unknown, dealing with the item is how the app
        // finds out — so the not-knowing may not also count against it.
        ...(known ? {} : { resolves: [CONCEPT.cashBuffer] }),
        proposedBecause: 'this one is open and keeps being carried forward',
      },
      situation,
    ),
  ]
}

/**
 * Moves that bring back an area the app has stopped hearing about.
 *
 * Section 8's third preference: "create a useful action that naturally produces
 * evidence." It comes third for a reason — after using what normal life is
 * already producing and after cautious inference — so this fires only when
 * coverage has already decided that neither of those will do.
 *
 * The table itself lives in `refreshing.ts` because the coverage engine has to
 * read the same one. It used to guess at this file's capability and guessed
 * wrong — QA-82-014, D-155.
 */
const coverageCandidates: Generator = (situation) => {
  /*
   * Every area the route promised an action for, not only the most neglected.
   *
   * This asked `coverage.mostNeglected` alone, and Life makes its promise on
   * every `an-action` row on the page. Two rows carrying "Something worth doing
   * here may come up on Now" while one of them was never offered to the arbiter
   * is the same defect as the one QA reported, one rank further down the list —
   * and when the most neglected area was one of the domains with no move at
   * all, the whole route went silent and the areas that did have a move got
   * nothing either.
   *
   * `coverage.neglected` is `stale` and `matters`, in registry order. The route
   * has already excluded the domains the app may not raise of its own accord,
   * so nothing here has to remember that separately.
   */
  const promised = situation.coverage.neglected.filter((entry) => entry.refresh === 'an-action')

  const out: Candidate[] = []
  for (const quiet of promised) {
    const shape = refreshingMoveFor(quiet.domain)
    /*
     * Both of these are the route's own preconditions read back. They cannot
     * fail while `routeFor` and this generator read one table — which is the
     * point of the table — and `tests/synthetic/qa-82-round-10.test.ts` proves
     * it across every scenario, clock and domain rather than trusting it.
     */
    if (shape === undefined) continue
    const subject = firstOfKind(situation, shape.kind, shape.domain)
    if (subject === undefined) continue

    const ref: EntityRef = { id: subject.id, kind: subject.kind }
    out.push(
      candidate(
        {
          generator: 'coverage',
          subject: ref,
          domain: shape.domain,
          verb: shape.verb,
          object: ref,
          trigger: 'stale-evidence',
          evidence: quiet.weakest?.evidence ?? [],
          leansOn: shape.leansOn,
          // The whole reason this move exists. Whatever it rests on that has
          // gone quiet is what it is here to bring back, so `uncertainty` says
          // nothing about it — the same fact may not create a move and then
          // sink it.
          resolves: shape.leansOn,
          proposedBecause: shape.because,
        },
        situation,
      ),
    )
  }
  return out
}

const GENERATORS: readonly Generator[] = [
  sleepCandidates,
  careerCandidates,
  fatherhoodCandidates,
  homeCandidates,
  socialCandidates,
  healthCandidates,
  moneyCandidates,
  // Last, so that a generator with live evidence gets to propose the move
  // first and the coverage one is deduplicated away rather than the reverse.
  coverageCandidates,
]

export function generateCandidates(situation: Situation): readonly Candidate[] {
  const out: Candidate[] = []
  const seen = new Set<string>()
  for (const generate of GENERATORS) {
    for (const produced of generate(situation)) {
      // By what the move *is*, not by which generator thought of it. Two
      // generators reaching the same move is agreement, not two options, and
      // offering the owner one sentence twice is the failure section 6 calls a
      // feed of generic cards.
      const key = `${produced.semantics.target.verb}/${produced.semantics.target.object.id}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(produced)
    }
  }
  return out
}
