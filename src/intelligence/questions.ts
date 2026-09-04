import { createRecordFactory } from '../domain/build'
import { CONCEPT, coreConcepts } from '../domain/concepts'
import { DOMAIN } from '../domain/domains'
import { newRecordId, type RecordId } from '../domain/ids'
import type { FactValue, ObservationRecord, Provenance } from '../domain/records'
import type { Instant, TimeZoneId } from '../domain/time'
import type { ConceptId } from '../domain/windows'
import { ENERGY_ANCHORS } from './readings'
import type { Situation } from './situation'
import { horizonWord, restOfWord } from './vocabulary'

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
  /**
   * Written fresh for the same reason the prompt is — AUD-0002.
   *
   * At 07:30 the app asked how much time there was and offered **"The evening
   * is clear"** as an answer about a morning. An option label is a sentence the
   * owner reads and presses, so it is under exactly the same rule as every
   * other owner-facing string: it names the stretch of day he is actually in.
   *
   * The *values* never move. Which answers exist, how many there are and what
   * each one stores are fixed — only the words change — so the share rule in
   * `guide.ts` and D-036's regression measure the same thing they always did.
   */
  options(situation: Situation): readonly QuestionOption[]
}

function scale(value: number): FactValue {
  return { type: 'scale', value, of: 5 }
}

function capitalise(text: string): string {
  return text.length === 0 ? text : `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

export const QUESTIONS: readonly QuestionSpec[] = [
  {
    concept: CONCEPT.sleepHours,
    prompt: () => 'How much sleep did you actually get?',
    options: () => [
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
    // Named, because the owner asked what it meant. The registry has always
    // called this "Current energy"; the question was the one place that never
    // said so, and a prompt made entirely of interrogative filler — "how much
    // have you got left?" — could have been about time, sleep or patience.
    // Section 3's rule about not losing the noun is not only about
    // recommendations.
    prompt: () => 'How much energy have you got left?',
    /*
     * The check-in's five, not a fourth set of words for one question —
     * routing 94.
     *
     * `energy.current` shipped four options here and the check-in needs five,
     * because a score averaging over a mixed denominator is not a score. Two
     * ways to give that were available and only one of them is honest: a
     * separate five for the ritual would have put two different answer sets for
     * one concept in front of the owner in one day, and the second one he met
     * would read as the app having changed its mind about what it was asking.
     *
     * So there is one definition and both surfaces read it. **This is a change
     * to a shipped owner-facing question** — a fifth answer, and a clause on two
     * of the four — and `readings.ts` carries the note about what did and did
     * not change, including that every value already written still means the
     * words it was written with.
     */
    options: () => ENERGY_ANCHORS,
  },
  {
    concept: CONCEPT.freeNow,
    prompt: () => 'How much time have you got?',
    options: (situation) => [
      { id: 'sliver', label: '15 minutes', value: { type: 'duration', minutes: 15 } },
      { id: 'half-hour', label: 'Half an hour', value: { type: 'duration', minutes: 30 } },
      { id: 'hour', label: 'An hour', value: { type: 'duration', minutes: 60 } },
      {
        id: 'open',
        // The label the audit caught at half past seven in the morning.
        label: `${capitalise(restOfWord(situation.block))} is clear`,
        value: { type: 'duration', minutes: 120 },
      },
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
      const when = horizonWord(situation.block)
      return child === undefined
        ? `Is your daughter with you ${when}?`
        : `Is ${child.label} with you ${when}?`
    },
    options: (situation) => [
      { id: 'yes', label: 'Yes', value: { type: 'boolean', value: true } },
      {
        id: 'no',
        label: `Not ${horizonWord(situation.block)}`,
        value: { type: 'boolean', value: false },
      },
    ],
  },
  {
    concept: CONCEPT.soreness,
    prompt: () => 'Anything sore or holding you back?',
    options: () => [
      { id: 'none', label: 'Nothing', value: scale(0) },
      { id: 'some', label: 'A bit stiff', value: scale(2) },
      { id: 'lots', label: 'Quite sore', value: scale(4) },
    ],
  },
  {
    concept: CONCEPT.socialEnergy,
    prompt: (situation) => `Up for people ${horizonWord(situation.block)}?`,
    options: () => [
      { id: 'no', label: 'Rather not', value: scale(1) },
      { id: 'maybe', label: 'Could go either way', value: scale(3) },
      { id: 'yes', label: 'Yes', value: scale(4) },
    ],
  },
  /*
   * Two of D-166's six dimensions, and only two — §13B.
   *
   * The vocabulary is approved for six and the rule is that a concept ships
   * askable **only with its consumer**. Mental load has one — the capacity
   * limiter, which is what Now renders as "What is in the way" — and it is the
   * one dimension routing 92 asks about.
   *
   * Wanting company has a consumer too, and still has no question, and the
   * reason is worth writing down rather than discovering later. Its consumer is
   * AUD-0013's social-demand path, which is live **only while social energy is
   * unknown** — and in exactly that situation the guide already holds *"up for
   * people tonight?"*, which is the more direct question about the same
   * evening. A second question there is a tap that buys nothing, and the app is
   * not allowed to ask one. So the reading is given on the Emotional page like
   * a learning topic is given on Career, and what it does is hold a reach-out
   * back rather than create one.
   *
   * Mood, stress, motivation and confidence have no consumer here at all, so
   * they are readable, correctable and never asked. Each says so on its own
   * definition in the registry.
   *
   * Neither question is asked because the reading is stale. Both go through the
   * same probe as everything else: the guide re-runs the decision under each
   * answer and asks only where the answers land somewhere different.
   */
  {
    concept: CONCEPT.overwhelm,
    /*
     * What is on his mind, not what is wrong with him. "How overwhelmed are
     * you?" invites him to accept a word about himself before he has said
     * anything; this asks about the load, which is the thing he can actually
     * report and the thing the limiter is about.
     */
    prompt: () => 'How much have you got on your mind?',
    /*
     * Three answers, two of which reach the limiter, and that is deliberate
     * rather than convenient.
     *
     * The consumer has one threshold — `LOADED_ENOUGH_TO_LIMIT` — so an option
     * set with only one answer above it produces a question D-036's share rule
     * can never let through: one answer in three is exactly the shape it
     * refuses, and a concept that is material and permanently unaskable is the
     * `emotionalState` failure arriving from the other side. The honest fix is
     * not an exception; it is a scale whose middle means what the limiter
     * treats it as. "Quite a bit" is a lot on somebody's mind, and the app's
     * response to it — preferring something restorative — is mild and
     * reversible.
     */
    options: () => [
      { id: 'clear', label: 'Not much', value: scale(1) },
      { id: 'some', label: 'Quite a bit', value: scale(4) },
      { id: 'lots', label: 'More than I can hold', value: scale(5) },
    ],
  },
  {
    concept: CONCEPT.workStrain,
    // One scale, once a day — §5.2's Tier 2 entry, and the largest unmodelled
    // driver of an evening. It reads into `capacity.strain`, beside the sleep
    // shortfall and the energy reading that are already there.
    prompt: () => 'How hard has work been pulling today?',
    /*
     * Three, and the third is why — §13B's *"keep new answer sets to the
     * smallest semantically honest size"*.
     *
     * The first draft had four, with "Heavy" and "It took everything" beside
     * each other. `assessStrain` has one threshold, so both did exactly the same
     * thing: the app would have collected a distinction it throws away one line
     * later, which is a tap spent on nothing. An option set finer than its
     * consumer can use is not a richer question, it is a longer one.
     */
    options: () => [
      { id: 'easy', label: 'Nothing much', value: scale(1) },
      { id: 'normal', label: 'Ordinary day', value: scale(3) },
      { id: 'heavy', label: 'It took everything', value: scale(5) },
    ],
  },
]

export function questionFor(concept: ConceptId): QuestionSpec | undefined {
  return QUESTIONS.find((question) => question.concept === concept)
}

export interface AnswerMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  /**
   * When the answer was written down, if that differs from what it is about.
   *
   * The envelope has always distinguished the two, and guide answers were
   * collapsing them: the moment being asked about is fixed for the whole
   * session, so three taps a minute apart all claimed to have been recorded at
   * the same instant. Canonical order then fell through to the record id, which
   * carries no meaning by design — leaving "the answer you gave last"
   * genuinely unanswerable, and a rule that depended on it quietly wrong.
   */
  readonly recordedAt?: Instant
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
      ...(moment.recordedAt === undefined ? {} : { recordedAt: moment.recordedAt }),
      id,
      domains: [definition.domain],
      privacy: definition.privacy,
    },
    { concept: question.concept, value: option.value, method: 'self-report' },
  )
}
