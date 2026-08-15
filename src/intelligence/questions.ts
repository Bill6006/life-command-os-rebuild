import { createRecordFactory } from '../domain/build'
import { CONCEPT, coreConcepts } from '../domain/concepts'
import { DOMAIN } from '../domain/domains'
import { newRecordId, type RecordId } from '../domain/ids'
import type { FactValue, ObservationRecord, Provenance } from '../domain/records'
import type { Instant, TimeZoneId } from '../domain/time'
import type { ConceptId } from '../domain/windows'
import type { Situation } from './situation'

/**
 * The things the guide is allowed to ask (canonical plan sections 12 and 4.5).
 *
 * A deliberately short list. "The app should not collect data merely because a
 * field exists" — so a concept only appears here if a tapped answer could
 * plausibly change what the owner is told to do tonight. Everything else the
 * system knows, it works out from history.
 *
 * The options are closed and few, because this is a phone and the owner is
 * standing up. Ranges rather than numbers, and the value stored is the middle
 * of the range the owner picked — an honest reading of a coarse answer rather
 * than a precise-looking number nobody actually reported.
 *
 * The order below is the order the guide prefers when two questions would both
 * change the answer: capacity first, then time, then the people involved.
 */

export interface QuestionOption {
  readonly id: string
  readonly label: string
  readonly value: FactValue
}

export interface QuestionSpec {
  readonly concept: ConceptId
  /** Written fresh each time so it can name whoever it is actually about. */
  prompt(situation: Situation): string
  readonly options: readonly QuestionOption[]
}

function scale(value: number): FactValue {
  return { type: 'scale', value, of: 5 }
}

export const QUESTIONS: readonly QuestionSpec[] = [
  {
    concept: CONCEPT.sleepHours,
    prompt: () => 'How much sleep did you actually get?',
    options: [
      {
        id: 'under-5',
        label: 'Under 5 hours',
        value: { type: 'number', value: 4.5, unit: 'hours' },
      },
      { id: 'about-6', label: 'About 6', value: { type: 'number', value: 6, unit: 'hours' } },
      { id: 'about-7', label: 'Seven or so', value: { type: 'number', value: 7, unit: 'hours' } },
      { id: 'full', label: 'A full night', value: { type: 'number', value: 8, unit: 'hours' } },
    ],
  },
  {
    concept: CONCEPT.energy,
    prompt: () => 'How much have you got left?',
    options: [
      { id: 'empty', label: 'Running on empty', value: scale(1) },
      { id: 'low', label: 'Low', value: scale(2) },
      { id: 'ok', label: 'Enough', value: scale(3) },
      { id: 'good', label: 'Plenty', value: scale(4) },
    ],
  },
  {
    concept: CONCEPT.usableTimeTonight,
    prompt: () => 'How much time have you got?',
    options: [
      { id: 'sliver', label: '15 minutes', value: { type: 'duration', minutes: 15 } },
      { id: 'half-hour', label: 'Half an hour', value: { type: 'duration', minutes: 30 } },
      { id: 'hour', label: 'An hour', value: { type: 'duration', minutes: 60 } },
      { id: 'open', label: 'The evening is clear', value: { type: 'duration', minutes: 120 } },
    ],
  },
  {
    concept: CONCEPT.childPresent,
    // G-002: this is only ever asked when nothing already answers it. A settled
    // arrangement answers it indefinitely, so the question never comes up.
    prompt: (situation) => {
      const child = situation.entities
        .byKind('person')
        .find((entity) => entity.domain === DOMAIN.fatherhood)
      return child === undefined
        ? 'Is your daughter with you tonight?'
        : `Is ${child.label} with you tonight?`
    },
    options: [
      { id: 'yes', label: 'Yes', value: { type: 'boolean', value: true } },
      { id: 'no', label: 'Not tonight', value: { type: 'boolean', value: false } },
    ],
  },
  {
    concept: CONCEPT.soreness,
    prompt: () => 'Anything sore or holding you back?',
    options: [
      { id: 'none', label: 'Nothing', value: scale(0) },
      { id: 'some', label: 'A bit stiff', value: scale(2) },
      { id: 'lots', label: 'Quite sore', value: scale(4) },
    ],
  },
  {
    concept: CONCEPT.socialEnergy,
    prompt: () => 'Up for people tonight?',
    options: [
      { id: 'no', label: 'Rather not', value: scale(1) },
      { id: 'maybe', label: 'Could go either way', value: scale(3) },
      { id: 'yes', label: 'Yes', value: scale(4) },
    ],
  },
]

export function questionFor(concept: ConceptId): QuestionSpec | undefined {
  return QUESTIONS.find((question) => question.concept === concept)
}

export interface AnswerMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
}

/**
 * The owner said it, and the guide is what wrote it down.
 *
 * Distinguishing the guide from other owner input is what lets the guide count
 * how much it has already asked for today without counting everything the owner
 * has ever typed.
 */
export const GUIDE_PROVENANCE: Provenance = { source: 'owner', writtenBy: 'guide' }

/**
 * An answer, as a canonical record.
 *
 * Section 60 records the failure this prevents: "guide answers must land in the
 * state the decision engine reads". They land the only way anything lands here
 * — as an appended observation, resolved by the same fact layer as everything
 * else. There is no side channel between the guide and the engine.
 */
export function answerRecord(
  question: QuestionSpec,
  option: QuestionOption,
  moment: AnswerMoment,
  id: RecordId = newRecordId(),
): ObservationRecord {
  const build = createRecordFactory({ zone: moment.zone, provenance: GUIDE_PROVENANCE })
  // The concept decides which domain the answer belongs to and how discreetly
  // it is held — an answer about a child is child-family-sensitive whether or
  // not whoever wrote the question remembered that.
  const definition = coreConcepts.definitionFor(question.concept)
  return build(
    'observation',
    {
      occurredAt: moment.now,
      id,
      domains: [definition.domain],
      privacy: definition.privacy,
    },
    { concept: question.concept, value: option.value, method: 'self-report' },
  )
}
