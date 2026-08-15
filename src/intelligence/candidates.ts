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
import { profileFor } from './moves'
import type { Situation } from './situation'
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

export type GeneratorId = 'sleep' | 'career' | 'fatherhood' | 'home' | 'social' | 'health' | 'money'

export interface Candidate {
  /** Deterministic, so a trace can be compared across runs. */
  readonly id: string
  readonly generator: GeneratorId
  readonly semantics: RecommendationSemantics
  /** Concepts this move leans on. Drives uncertainty scoring and the guide. */
  readonly leansOn: readonly ConceptId[]
  /** One line for the trace: why this was proposed at all. */
  readonly proposedBecause: string
}

export const SLEEP_SUBJECT: EntityRef = entityRef('life-domain', 'sleep')
export const WINDING_DOWN: EntityRef = entityRef('routine', 'winding down')
export const A_WALK: EntityRef = entityRef('routine', 'a walk')

function target(verb: ActionVerb, object: EntityRef, minutes: number | undefined): ActionTarget {
  return minutes === undefined ? { verb, object } : { verb, object, minutes }
}

/** A move's own length, trimmed to fit the evening when the evening is known. */
function sizeFor(verb: ActionVerb, situation: Situation): number | undefined {
  const natural = profileFor(verb).size
  if (natural === undefined) return undefined
  if (!isUsable(situation.usableMinutes)) return natural
  const available = situation.usableMinutes.value
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
}

function candidate(input: CandidateInput, situation: Situation): Candidate {
  const semantics: RecommendationSemantics = {
    subject: input.subject,
    domain: input.domain,
    target: target(input.verb, input.object, sizeFor(input.verb, situation)),
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

function goalRefFor(situation: Situation, domain: LifeDomainId): EntityRef | undefined {
  return situation.direction.goals.find((goal) => goal.domain === domain)?.goal
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
  if (!isUsable(strain) || strain.value === 'none') return []
  if (situation.block === 'morning' || situation.block === 'early-morning') return []

  const evidence = [...basisOf(strain), ...basisOf(situation.capacity.sleepDebtHours)]
  const leansOn: readonly ConceptId[] = [CONCEPT.sleepHours, CONCEPT.energy]

  // One move, not two. When there is a specific thing tonight would otherwise
  // be spent on, naming it is the better sentence — section 4.6, a specific
  // ordinary sentence beats an elegant generic one. Proposing both "wind down"
  // and "no subnetting session tonight" is proposing the same evening twice and
  // leaving the arbiter to pick between wordings.
  const topic = resolvedEntity(situation.learningTopic, situation)
  if (topic !== undefined) {
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
        verb: situation.block === 'late-night' ? 'wind-down' : 'protect-sleep',
        object: WINDING_DOWN,
        trigger: 'deficit',
        evidence,
        leansOn,
        proposedBecause: 'there is a running shortfall of rest',
      },
      situation,
    ),
  ]
}

/** Career and learning. Needs a topic the owner is actually on. */
const careerCandidates: Generator = (situation) => {
  const topic = resolvedEntity(situation.learningTopic, situation)
  if (topic === undefined) return []

  const ref: EntityRef = { id: topic.id, kind: topic.kind }
  const goal = goalRefFor(situation, DOMAIN.career)
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
        trigger:
          rough.length > 0
            ? 'recent-struggle'
            : goal === undefined
              ? 'nothing-better'
              : 'goal-behind',
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
        trigger: goal === undefined ? 'good-conditions' : 'goal-behind',
        proposedBecause: 'building something is the proof a topic is actually held',
      },
      situation,
    ),
  )

  return out
}

/** Fatherhood. Nothing here fires unless she is actually here. */
const fatherhoodCandidates: Generator = (situation) => {
  const present = situation.childPresent
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
    out.push(
      candidate(
        {
          generator: 'fatherhood',
          subject: skillRef,
          domain: DOMAIN.fatherhood,
          verb: 'growth-opportunity',
          object: skillRef,
          trigger: 'opportunity-window',
          evidence,
          leansOn: [CONCEPT.childPresent],
          proposedBecause: 'there is a growth area with a natural chance to practise it',
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

  return [
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
}

/** Money. Needs a goal that exists, never a generic "check your budget". */
const moneyCandidates: Generator = (situation) => {
  const goal = firstOfKind(situation, 'financial-goal')
  if (goal === undefined) return []

  const ref: EntityRef = { id: goal.id, kind: goal.kind }
  const cash = situation.view.facts.knowledgeFor(CONCEPT.cashBuffer)
  return [
    candidate(
      {
        generator: 'money',
        subject: ref,
        domain: DOMAIN.money,
        verb: 'handle-money-item',
        object: ref,
        trigger: isUsable(cash) ? 'goal-behind' : 'stale-evidence',
        evidence: basisOf(cash),
        leansOn: [CONCEPT.cashBuffer],
        proposedBecause: 'this one is open and keeps being carried forward',
      },
      situation,
    ),
  ]
}

const GENERATORS: readonly Generator[] = [
  sleepCandidates,
  careerCandidates,
  fatherhoodCandidates,
  homeCandidates,
  socialCandidates,
  healthCandidates,
  moneyCandidates,
]

export function generateCandidates(situation: Situation): readonly Candidate[] {
  const out: Candidate[] = []
  const seen = new Set<string>()
  for (const generate of GENERATORS) {
    for (const produced of generate(situation)) {
      if (seen.has(produced.id)) continue
      seen.add(produced.id)
      out.push(produced)
    }
  }
  return out
}
