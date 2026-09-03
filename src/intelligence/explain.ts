import type { EntityIndex, EntityRef } from '../domain/entities'
import { isUsable, type Confidence } from '../domain/knowledge'
import { discreetly, type OutcomeRecord } from '../domain/records'
import {
  renderRecommendation,
  verbLabel,
  type RecommendationSemantics,
  type RenderedRecommendation,
} from '../domain/recommendation'
import { CONCEPT } from '../domain/concepts'
import { DOMAIN } from '../domain/domains'
import type { ConceptId } from '../domain/windows'
import {
  addLocalDays,
  localDateTimeAt,
  localDayIdAt,
  minutesIntoDay,
  type DayBlock,
  type Instant,
  type IsoWeekday,
  type TimeZoneId,
} from '../domain/time'
import { CLOSE_ENOUGH_TO_MENTION } from './arbitrate'
import { describeGoalTrajectory } from './direction'
import { daysSincePractice, growthStandingFor } from './growth'
import { alongsideOf } from './alongside'
import { cueFor } from './cue'
import { WORTH_DOING } from './arbitrate'
import { describeThreadPosition, threadFor } from './threads'
import type { DimensionName, Evaluation } from './evaluate'
import { beliefKey } from './learning'
import { describeHours, endsAtClock, SORE_ENOUGH_TO_EASE_OFF, type Situation } from './situation'
import { entityValue } from './values'
import { blockNoun, describeDuration, horizonWord } from './vocabulary'

/**
 * The explanation generator (canonical plan section 17.1 step 9, and 61).
 *
 * Section 61 is the specification: concise, specific, ordinary, direct, warm.
 * No research-report language, no internal type names, no confidence
 * arithmetic, no generic encouragement, no therapy voice, no moral judgement.
 * Its own example is the target — not "moderate evidence, 7 comparable
 * observations" but "this has worked several times in situations like tonight".
 *
 * The reason is composed from the facts that actually drove the decision rather
 * than from a template keyed on the move. That is deliberate and it is what
 * section 64 asks for: two people with different histories should not be able
 * to receive the same sentence, because the sentence is made of their numbers,
 * their topic, their evening. If this file ever starts producing the same
 * paragraph for everyone, the intelligence behind it has stopped mattering.
 */

const WEEKDAYS: Record<IsoWeekday, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
}

const BLOCK_WORDS = {
  'early-morning': 'early morning',
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
  'late-night': 'late night',
} as const

/** The last hour of the afternoon, which is not what a person calls it. */
const LATE_AFTERNOON_FROM = 17 * 60

/**
 * What to call the part of the day the owner is in.
 *
 * **Display only.** The evening begins at 18:00 for every purpose the engine
 * has — which moves are eligible, which suit the hour, what protects tomorrow —
 * and none of that moves because of this function. Telling someone at five to
 * start winding down for the night would be worse than the thing being fixed
 * here.
 *
 * What is fixed is the word. "Saturday afternoon" at a quarter to six is
 * defensible by the clock and by the daylight, and is not what the owner read
 * when they looked at their phone. The last hour before the boundary reads as
 * the late afternoon it is, and nothing else changes.
 */
function blockWord(situation: Situation): string {
  if (situation.block !== 'afternoon') return BLOCK_WORDS[situation.block]
  const minutes = minutesIntoDay(localDateTimeAt(situation.at, situation.zone).timeOfDay)
  return minutes >= LATE_AFTERNOON_FROM ? 'late afternoon' : 'afternoon'
}

function weekdayOf(at: Instant, zone: TimeZoneId): string {
  return WEEKDAYS[localDateTimeAt(at, zone).isoWeekday]
}

function whenPhrase(at: Instant, situation: Situation): string {
  const day = localDateTimeAt(at, situation.zone).dayId
  if (day === situation.dayId) return 'today'
  // A calendar question, so it moves by local days rather than by 24 hours —
  // otherwise "yesterday" is wrong twice a year.
  if (day === localDayIdAt(addLocalDays(situation.at, -1, situation.zone), situation.zone)) {
    return 'yesterday'
  }
  return weekdayOf(at, situation.zone)
}

/**
 * Where the owner is, in one line.
 *
 * Section 6 calls this the current premise. It is assembled from what is
 * actually known — a clause is missing rather than hedged when the fact behind
 * it is missing, because "energy unknown" on a home screen is the app talking
 * about itself.
 */
export function describePremise(situation: Situation): string {
  const clauses: string[] = []
  const local = localDateTimeAt(situation.at, situation.zone)
  clauses.push(`${WEEKDAYS[local.isoWeekday]} ${blockWord(situation)}`)

  const debt = situation.capacity.sleepDebtHours
  const lastNight = situation.capacity.lastNightHours
  if (isUsable(debt) && debt.value >= 1) {
    clauses.push(`${describeHours(debt.value)} short on sleep`)
  } else if (isUsable(lastNight)) {
    clauses.push(`${describeHours(lastNight.value)} of sleep`)
  }

  const usable = situation.usableMinutes
  if (isUsable(usable)) clauses.push(`about ${describeDuration(usable.value)} free`)

  /*
   * Whether she is here — QA-82-001, and the line the finding was written
   * about.
   *
   * This read the standing arrangement, so a Wednesday at ten in the morning
   * said "Adaya is here" while the owner's own school window said she was in a
   * classroom. The premise is the sentence the owner checks the app against; a
   * premise he can see out of the window is wrong about is worse than no
   * premise. `childHere` is the arrangement narrowed by her own day.
   *
   * When a span is what took her out, the premise says which one. "Adaya is at
   * school until 15:00" is a fact he can act on; "she is not here" is a fact he
   * already had.
   */
  const child = situation.childHere
  const person = situation.entities
    .byKind('person')
    .find((entity) => entity.domain === DOMAIN.fatherhood)
  const her = person === undefined ? 'she' : person.label
  const elsewhere = situation.childElsewhere
  if (isUsable(child) && child.value) {
    clauses.push(`${her} is here`)
  } else if (elsewhere !== undefined) {
    clauses.push(`${elsewhere.label} is on until ${endsAtClock(elsewhere, situation.zone)}`)
  }

  return `${clauses.join(', ')}.`
}

/** The most recent thing that went wrong for this subject, if there is one. */
function lastRoughOutcome(
  situation: Situation,
  semantics: RecommendationSemantics,
): OutcomeRecord | undefined {
  let latest: OutcomeRecord | undefined
  for (const record of situation.view.history.effective) {
    if (record.kind !== 'outcome') continue
    if (record.sentiment !== 'worse') continue
    if (!record.entities.some((ref) => ref.id === semantics.subject.id)) continue
    if (latest === undefined || record.occurredAt > latest.occurredAt) latest = record
  }
  return latest
}

/**
 * Whether the reason is allowed to cite a fact at all.
 *
 * **The reason may only cite evidence the decision actually leaned on.**
 *
 * Without this rule the explanation reaches for whichever particular is nearest
 * and produces something that sounds like reasoning and is not. The case that
 * proved it: a walk winning on an ordinary morning, explained as "you are an
 * hour and a half down, which is not enough to sit still for" — a sleep figure,
 * on a move whose evidence is energy and soreness, where the shortfall
 * contributed nothing to it winning and would if anything argue the other way.
 * That is rationalising the winner after the fact, and it is worse than saying
 * less, because it invites the owner to trust a chain of reasoning that was
 * never used.
 *
 * The premise is deliberately not held to this. "Monday morning, an hour short
 * on sleep" is a true statement about the situation rather than a claim about
 * why this move won, and describing where the owner is does not require having
 * decided from it.
 */
function leanedOn(evaluation: Evaluation, concept: ConceptId): boolean {
  return evaluation.candidate.leansOn.includes(concept)
}

/**
 * The part of the day, when it is genuinely one of the reasons this won.
 *
 * Read off the ranking rather than assumed: `context-fit` is positive only when
 * the move actually suits this block, so a lab at midnight cannot claim the
 * hour is on its side. Same discipline as `leanedOn`, applied to a dimension
 * instead of a fact.
 */
function hourThatSuits(evaluation: Evaluation, situation: Situation): string | undefined {
  const fit = evaluation.dimensions.find((dimension) => dimension.name === 'context-fit')
  return fit !== undefined && fit.value > 0 ? blockWord(situation) : undefined
}

/**
 * Why this, now — in the owner's own particulars.
 *
 * Each branch reaches for a real value: how many hours, which topic, what went
 * wrong and when. A branch that cannot find a particular it is entitled to cite
 * says less rather than borrowing one from somewhere else.
 */
export function composeReason(
  evaluation: Evaluation,
  situation: Situation,
  entities: EntityIndex,
): string {
  /*
   * The clauses below take no noun — QA-81-002.
   *
   * They used to be handed one `object` string, taken from the winning
   * candidate's `target.object`, and they wrote it into sentences that assumed
   * it named the winning *move*. For most verbs those are the same thing. For
   * `recover` they are opposites: its object is the study session being put
   * down, so the app said **"The week is pointed at the CCNA push, and
   * subnetting still looks like the better call"** while recommending that
   * subnetting be skipped — with the subnetting move listed directly underneath
   * as the one it had been chosen over.
   *
   * The class is wider than the sentence: **a composed clause that names an
   * entity it did not derive from the thing the clause is about.** The repair is
   * to stop handing these a noun that can name the wrong thing. Each is now
   * written from what it can derive for itself — the week's own wording, and
   * what the situation says is short — and names nothing else.
   *
   * They also stop announcing a verdict. Section 6 asks Now to show the relevant
   * trade-off and AUD-0026 asks for the app arguing its case; "X is the better
   * call" is the opposite of an argument, and it is the construction that made
   * the defect possible.
   */
  return (
    `${observedClause(evaluation) ?? whyNow(evaluation, situation, entities)}` +
    `${learnedBandClause(evaluation, situation)}` +
    `${directionClause(evaluation, situation)}` +
    `${costClause(evaluation, situation)}`
  )
}

/**
 * How sure an inference has to be before it may be spoken as a fact — AUD-0032.
 *
 * A builder decision, written down because it is a number that governs what the
 * app is willing to assert. Below it the sentence says where the reading came
 * from; at or above it the reading stands on its own. Two of five at fifty per
 * cent is the case that named the rule.
 */
export const SPOKEN_AS_FACT = 0.7

function isGuess(known: { state: string; confidence?: Confidence }): boolean {
  return known.state === 'inferred' && (known.confidence ?? 1) < SPOKEN_AS_FACT
}

/**
 * How much of the score a dimension has to have moved before it may speak.
 *
 * `observed-change` carries weight 0.9, so a gap of a fifth clears this and a
 * gap of a twentieth does not. The bar exists so that a dimension which barely
 * touched the ranking cannot present itself as the reason.
 */
const MATERIALLY_MOVED_IT = 0.2

/**
 * The owner's own record, said out loud — AUD-0027.
 *
 * The app computed *"current energy rose 11 of 14 times with it and 4 of 14
 * without"*, ranked the move with it, and then told him "There is enough in the
 * tank for a walk, and the evening suits it". The specific sentence existed one
 * layer down and never reached the screen it was about.
 *
 * `whyNow` switches on the candidate's trigger, which is set at generation time
 * before anything is scored — so it can only ever say why a move was
 * *proposed*, never why it *won*. This is the one place a winning dimension
 * gets to answer instead, and it is bounded on three sides:
 *
 * - it must have materially moved the score, not merely have a value;
 * - it must rest on a concept in the winning candidate's `leansOn`, which is
 *   D-031 and DEF-0006's rule, unwidened;
 * - it must carry a `phrase` written for the owner rather than a `note` written
 *   for the inspector, which is DEF-0040's rule.
 *
 * **The refusal half of AUD-0027 is deliberately not shipped**, and the audit
 * says which half to drop if either is in doubt. Surfacing "you have passed on
 * this fourteen times" needs D-031 widened from *concepts in `leansOn`* to
 * *concepts in `leansOn` plus dimensions that materially moved the score* — an
 * amendment to a Blocker's fix — and the audit calls that sentence the riskiest
 * copy it proposes, with no wording it is willing to endorse. See D-114.
 */
function observedClause(evaluation: Evaluation): string | undefined {
  for (const dimension of evaluation.dimensions) {
    if (dimension.phrase === undefined || dimension.restsOn === undefined) continue
    if (dimension.value <= 0) continue
    if (dimension.value * dimension.weight < MATERIALLY_MOVED_IT) continue
    if (!leanedOn(evaluation, dimension.restsOn)) continue
    return capitalise(dimension.phrase)
  }
  return undefined
}

/**
 * That the shortfall is more than one night's, where it is — AUD-0009.
 *
 * ## What this says, and what it deliberately does not
 *
 * The finding's own proposed sentence is *"Two quiet nights would clear most of
 * this. Tonight is the first."* The second half is already on the screen and the
 * first half is a **forecast about a body**: it predicts what a run of nights
 * will do for him, which D-038 refuses outright and which §6.5 puts outside this
 * phase entirely. What is left, and what is worth saying, is the arithmetic over
 * his own record that the offer beneath rests on — *"the shortfall is more than
 * one night's worth"*. It is a statement about a number he supplied, and it
 * names its own subject rather than reaching for a demonstrative, which is
 * G-001's rule and the reason it is not the audit's word-for-word sentence.
 *
 * ## And it goes quiet once a run is under way
 *
 * `Explanation.partOf` already renders *"Three quiet nights in a row — second of
 * three. One to go."* as its own row above the limiter, and has since routing
 * 84. Saying the span twice on one screen is DEF-0022's class — two true
 * sentences about one thing, in one place, that a reader has to reconcile — so
 * this speaks only while there is no live run to speak for it.
 */
function moreThanOneNightClause(evaluation: Evaluation, situation: Situation): string {
  if (situation.capacity.recoveryNights === undefined) return ''
  const thread = threadFor(situation.threads, evaluation.candidate.semantics.target)
  if (thread !== undefined && thread.kind === 'recovery-run') return ''
  return " The shortfall is more than one night's worth."
}

/**
 * What the owner's own outcomes say about this move, when they disagree with it.
 *
 * AUD-0028(b). The learned band was rendered as a separate advisory line and
 * never reached the reason, so the screen said *"The kitchen table is buried
 * again — and it costs you the start of every evening"* directly above *"Reset
 * a space has made little difference in situations like tonight"*. Both from one
 * run, each individually true, and no way for a reader to reconcile them —
 * DEF-0022, DEF-0033 and DEF-0039's class for the fourth time.
 *
 * Only the two lower bands, and one clause. Hedging on every middling belief
 * would make the app sound unsure of everything, which is the opposite failure
 * and just as real.
 */
function learnedBandClause(evaluation: Evaluation, situation: Situation): string {
  const learned = situation.learning.effectFor(
    evaluation.candidate.semantics.target.verb,
    situation.context,
  )
  if (learned.summary === undefined) return ''
  if (learned.now > LITTLE_DIFFERENCE) return ''
  /*
   * No noun, and no pronoun either.
   *
   * A clause that says "it" and never says what "it" is about is the failure
   * section 3 describes (DEF-0001); a clause handed a noun it did not derive is
   * QA-81-002. Saying neither is available here, and it is the more accurate
   * sentence anyway: what the ranking established is that nothing else that
   * survived the filter fits better, which is a statement about the field
   * rather than about any particular alternative.
   */
  /*
   * And the quantity is counted rather than assumed — QA-83-001.
   *
   * This read "The last few times made little difference" on a history whose
   * own evidence panel said "One occasion in the record" and "1 occasion". A
   * plural over a count of one, in the phase whose second acceptance item is
   * that no owner-visible sentence asserts a quantity the app did not count.
   *
   * The count is `learned.samples`, which is the number of comparable episodes
   * this belief was actually built from, and the words are the ones
   * `learning.ts` already uses for the same quantity — one vocabulary for one
   * number, rather than two files each rounding it their own way.
   */
  return ` ${howOften(learned.samples)} made little difference, and nothing else here fits better.`
}

/**
 * How many comparable occasions there were, in words — QA-83-001.
 *
 * The same three bands `summarise` uses, phrased for the front of a clause.
 * Anything that states a quantity here has to come from this function, so the
 * sweep in `quantity-agrees.test.ts` has one place to hold to a count.
 */
function howOften(samples: number): string {
  if (samples <= 1) return 'The one time before'
  if (samples < 4) return 'The last few times'
  return 'The last several times'
}

/** The top of the band `learning.ts` calls "has made little difference". */
const LITTLE_DIFFERENCE = 0.6

/**
 * What the choice cost, when it cost something — AUD-0026.
 *
 * Section 6 lists "relevant tradeoff" among the ten things Now should be able to
 * show, and it was one of three on that list it could not. "Chosen over: a walk"
 * plus "Worth more tonight" is a comparison, not a trade-off: the app never said
 * *this is the evening you were going to study, and I am asking you to sleep
 * instead* — not even in the scenario built to demonstrate exactly that, where
 * `direction-fit` scored −0.30 and the screen said none of it.
 *
 * One clause, and it reads as a considered trade rather than an apology. The
 * owner's sovereignty (section 4.3) is better served by an owner who can see
 * what he is being asked to give up.
 */
function costClause(evaluation: Evaluation, situation: Situation): string {
  const against = (name: DimensionName): boolean => {
    const dimension = evaluation.dimensions.find((entry) => entry.name === name)
    if (dimension === undefined) return false
    return dimension.value * dimension.weight <= -MATERIALLY_MOVED_IT
  }

  /*
   * Both halves, and the second half is never a verdict on the first.
   *
   * A trade-off is what was set against what overruled it. The clause used to
   * complete itself with the *rejected* move — "and subnetting still looks like
   * the better call" — under a recommendation to put subnetting down, because
   * it was handed the chosen semantics' object and that object is the thing
   * being set aside (QA-81-002). Nothing here names an alternative any more.
   *
   * What completes it instead is what the app actually read. When a limiter is
   * firing, that is the honest and specific half. When none is, the cost still
   * stands on its own — the week is pointed somewhere and this hour is not
   * going there — and saying so is what AUD-0026 asked for. Silence in that
   * case would have been a second defect wearing the first one's clothes: the
   * one history built to demonstrate a trade-off would show none.
   */
  const short = whatIsShort(situation)
  const overruling = short ?? 'this is time away from it'

  const weekly = situation.direction.weekly
  if (against('direction-fit') && weekly.state === 'set') {
    return ` The week is pointed at ${weekly.wording}, and ${overruling}.`
  }
  if (against('goal-fit')) {
    return ` The goal you set does not move, and ${overruling}.`
  }
  if (against('protection')) return ' Tomorrow pays a little.'
  return ''
}

/**
 * What the situation says is actually short, in the words the clause needs.
 *
 * The other half of a trade-off: the app is overruling something the owner set,
 * and the honest reason is the thing it is reading rather than the arithmetic
 * that followed from it.
 *
 * Coverage is deliberately absent. A life area nobody has mentioned for seven
 * weeks is not a reason to overrule this week's direction, and D-063 already
 * establishes it as the weakest limiter there is.
 */
function whatIsShort(situation: Situation): string | undefined {
  switch (situation.limiter?.kind) {
    case 'recovery':
      return 'rest is what is short'
    case 'capacity':
      return 'the body is asking for less'
    case 'time':
      return 'there is not much of the day left'
    default:
      return undefined
  }
}

/**
 * The week's direction, said out loud when it is the reason this won.
 *
 * Section 21 requires the owner's own wording to stay visible, and section 64
 * caught the cost of leaving it silent: two histories that differed in whether
 * a direction was set at all were receiving word-for-word the same reason,
 * because the one thing that distinguished them was never spoken. It appears
 * only when the direction actually pulled this move to the front, which keeps
 * it from becoming a line that shows up under everything.
 */
function directionClause(evaluation: Evaluation, situation: Situation): string {
  const weekly = situation.direction.weekly
  if (weekly.state !== 'set') return ''
  if (weekly.category !== evaluation.candidate.semantics.domain) return ''
  return ` This week is about ${weekly.wording}.`
}

function whyNow(evaluation: Evaluation, situation: Situation, entities: EntityIndex): string {
  const semantics = evaluation.candidate.semantics
  const subject = entities.labelFor(semantics.subject) ?? ''
  const object = entities.labelFor(semantics.target.object) ?? subject

  /*
   * The growth move answers for itself — AUD-0015(b) and AUD-0016.
   *
   * Two defects met here, and both came from one table being keyed on the
   * trigger alone while the candidates under it have different kinds of
   * subject.
   *
   * The `opportunity-window` branch below is written for a *person*: "Adaya is
   * here and there are about 120 minutes. That window closes on its own." When
   * a growth candidate carried that trigger the subject was the **skill**, and
   * the app said *"Ordering her own food is here and there are about 120
   * minutes"* — a sentence that destroys trust in one reading, because it is
   * obviously machine-generated about a child.
   *
   * The `stale-evidence` branch is worse for being accurate: *"Nothing has come
   * in about ordering her own food for a while"* is the app telling a father to
   * put his daughter in a testing situation because **its own data is old**.
   * Section 8's "a child's developmental skill may need periodic evidence" is a
   * *coverage* rule, and coverage was allowed to become the *motive*. Coverage
   * may still raise the candidate — the urgency is unchanged — and the sentence
   * now names the opportunity rather than the record, framed on the parent
   * (section 4.4).
   */
  if (semantics.target.verb === 'growth-opportunity') {
    const person = entities.linked(semantics.subject.id, 'about-person')?.label
    /*
     * A settled skill coming round again is a different sentence — AUD-0015(a).
     *
     * The finding asks for an occasional maintenance probe at expanding
     * intervals after mastery, and is explicit that it "is a different
     * sentence": the app is not proposing that she work on this, it is
     * noticing that a thing she has had for a while has not come up lately.
     * Wording it like the ordinary opportunity would make the owner's own
     * confirmation look as though it had changed nothing, which is the defect.
     */
    if (growthStandingFor(situation, semantics.subject).stage === 'settled') {
      const days = daysSincePractice(situation, semantics.subject)
      const gap = days === undefined ? 'a while' : describeGap(days)
      return person === undefined
        ? `${capitalise(object)} has not come up in ${gap} — worth a look?`
        : `${person} has not done ${object} in ${gap} — worth a look?`
    }
    if (person !== undefined) {
      return `${person} is here, and this is one she can lead if there is room for it.`
    }
    return `There is room for ${object} to be led rather than done for her.`
  }

  switch (semantics.whyNow.trigger) {
    case 'deficit': {
      const debt = situation.capacity.sleepDebtHours
      const nights = situation.capacity.nightsSeen

      /*
       * What today would otherwise have gone on, named — AUD-0003.
       *
       * The morning move's own sentence is about the shape of a day rather than
       * about any one thing in it, so the particular lives here: section 4.6's
       * specific ordinary sentence, and the audit's own wording for this case.
       *
       * It defers nothing. "Today is not the day for it" is a statement about
       * today; the app has no model of what is coming (AUD-0004), so naming
       * tomorrow here would be the confident wrongness this phase exists to
       * remove. Only when the decision actually leaned on the topic, which is
       * DEF-0006's rule and is why the generator adds the concept and this
       * clause's permission together.
       */
      const studying = studiedSubject(evaluation, situation, entities)
      const instead = studying === undefined ? '' : ` Today is not the day for ${studying}.`

      if (leanedOn(evaluation, CONCEPT.sleepHours) && isUsable(debt) && debt.value >= 1) {
        const span = nights <= 1 ? 'last night' : `the last ${nights} nights`
        /*
         * And where this sits in the run — AUD-0009.
         *
         * The finding is that *"the following evening the app has no memory
         * that last night was supposed to be a recovery night, and re-derives
         * the same sentence"*. This is the memory: a live recovery run puts its
         * own position into the sentence the owner reads, so the second night
         * says something the first one did not.
         *
         * **It says where he is and never what will happen.** The audit's own
         * proposed wording — *"Two quiet nights would clear most of this"* — is
         * a forecast about a body, and §6.5 puts forecasting outside this phase
         * while D-038 refuses the claim outright. *"Second of three quiet
         * nights"* is a count of what he agreed to and what the record holds.
         */
        const run = moreThanOneNightClause(evaluation, situation)
        return semantics.target.verb === 'recover'
          ? `You are ${describeHours(debt.value)} down over ${span}.${run} ${capitalise(object)} will still be there tomorrow.`
          : `You are ${describeHours(debt.value)} down over ${span}.${run}${instead}`
      }

      /*
       * A sore body with a full night behind it reaches this branch with no
       * shortfall to name, and "rest is the thing running short" is not what
       * the app read — it read the reading the capacity limiter is raised from.
       */
      const soreness = situation.capacity.soreness
      if (
        leanedOn(evaluation, CONCEPT.soreness) &&
        isUsable(soreness) &&
        soreness.value >= SORE_ENOUGH_TO_EASE_OFF
      ) {
        return `The body is asking for less than usual.${instead}`
      }

      const energy = situation.capacity.energy
      if (isUsable(energy)) {
        return `There is not much left in the tank ${horizonWord(situation.block)}.${instead}`
      }
      return `Rest is the thing running short.${instead}`
    }

    case 'recent-struggle': {
      const outcome = lastRoughOutcome(situation, semantics)
      if (outcome !== undefined) {
        // Named first, then what actually happened. An earlier version opened
        // with the date and quoted the note, which read well and never once
        // said what it was about — the failure in section 3, arriving through
        // composed prose rather than through a template.
        /*
         * Through the one renderer that consults the class — AUD-0040's
         * discretion guard. An outcome carries its own privacy, and a rough
         * evening in the private area is exactly the sentence section 11 says
         * must not turn up on Now.
         */
        const detail = discreetly(outcome.privacy, outcome.observation, (ref) =>
          entities.labelFor(ref),
        )
        return `${capitalise(subject)} went badly ${whenPhrase(outcome.occurredAt, situation)} — ${lowerFirst(detail)}.`
      }
      return `${capitalise(subject)} did not go well last time.`
    }

    case 'goal-behind': {
      const goal = situation.direction.goals.find(
        (entry) => entry.goal.id === semantics.relatedGoal?.id,
      )
      if (goal === undefined) return `${capitalise(object)} is the part that needs the reps.`
      /*
       * The clause that makes the app's best sentence true — AUD-0046.
       *
       * "Pass the CCNA before the winter — and subnetting is the weak part" was
       * an excellent sentence resting on nothing: the deadline lived inside the
       * owner's own wording, and the typed field holding it was empty two
       * layers down and read by nobody. This trigger can now only be raised
       * where a horizon and a set of pieces actually measure behind-ness
       * (`goalIsBehind`), so the sentence may finally say what the measurement
       * was.
       *
       * Counts and a stretch of time, never a share — section 22, and AUD-0021
       * in as many words: "4 of 9" is one short step from a completion
       * percentage, which is a score about a man's life by another name.
       */
      const trajectory = describeGoalTrajectory(goal)
      const head = `${capitalise(goal.statement)} — and ${object} is the weak part.`
      return trajectory === undefined ? head : `${head} ${trajectory}`
    }

    case 'opportunity-window': {
      /*
       * And an evening she is unusually away is a different sentence entirely —
       * AUD-0019.
       *
       * **It names the evening and never the absence.** *"She's away tonight"*
       * is the wording the audit itself flags as one that can land badly, and
       * section 4.4 forbids framing parenting time as lost productivity — so the
       * inverse framing, an empty house read as a productivity window, is the
       * same mistake facing the other way. What is said is that the hours are
       * his, which is a fact about the evening.
       */
      if (situation.awayUnusually) {
        /*
         * Named from the block rather than typed — AUD-0002. The audit's own
         * example of this sentence is an evening one, and the trip that makes it
         * true covers whole days: *"the evening is yours"* at two in the
         * afternoon is the 113-occurrence defect arriving in a sentence written
         * to repair a different one.
         *
         * No pronoun, either. *"…and it does not come round often"* reads well
         * and G-001 is right about it: on a card read on its own, "it" is a noun
         * the reader has to supply.
         */
        return `${capitalise(blockNoun(situation.block))} is yours.`
      }

      const usable = situation.usableMinutes
      const time = isUsable(usable)
        ? ` and there are about ${Math.round(usable.value)} minutes`
        : ''
      /*
       * And what they last did, where the record holds it — AUD-0019(b).
       *
       * The finding's first half is *"the app says the same sentence every
       * single evening, with no memory of yesterday, no reference to what they
       * did"*. This is that reference, and it is the owner's own words about his
       * own evening — a `relationship-event` he wrote, rendered discreetly
       * because it is about a child (section 11).
       *
       * **Nothing is varied for the sake of variety.** Where the record holds no
       * such evening the sentence is exactly what it was, because inventing one
       * would be worse than repeating a true one. That is a real bound on what
       * this finding could be closed to, and it is stated in D-276 rather than
       * left as a gap somebody discovers.
       */
      const last = lastTimeTogether(situation, semantics.subject)
      const memory = last === undefined ? '' : ` Last time: ${lowerFirst(finished(last))}`
      return `${capitalise(subject)} is here${time}. That window closes on its own.${memory}`
    }

    case 'constraint-active': {
      const friction = situation.homeFriction
      if (isUsable(friction)) {
        /*
         * What the owner wrote, and nothing added to it — AUD-0028.
         *
         * This used to end "— and it costs you the start of every evening",
         * which is a causal claim about his own life with nothing behind it:
         * the app has never measured what the kitchen costs him, and on the
         * nine-month history it had twelve occasions pointing the other way
         * while printing "reset a space has made little difference" one line
         * below. Section 68 and D-066/D-089 forbid causal language where only
         * association exists, and a constant clause cannot be falsified by
         * evidence because no evidence reaches it.
         *
         * The stored value is whatever the owner wrote and may already be a
         * whole sentence, so it stands on its own rather than being run into a
         * clause neither of you said.
         */
        const detail = discreetly(
          situation.concepts.definitionFor(CONCEPT.homeFriction).privacy,
          friction.value,
          (ref) => entities.labelFor(ref),
        )
        return `${capitalise(detail)}.`
      }
      return `${capitalise(object)} is the small friction making the rest harder.`
    }

    case 'good-conditions': {
      /*
       * Only what this move actually won on.
       *
       * Two clauses have come out of here. The sleep shortfall went first: it
       * produced "you are an hour and a half down, which is not enough to sit
       * still for" on a move whose evidence is energy and soreness. "Nothing
       * more pressing is in the way" went second, and it is the subtler of the
       * two — it reads as a finding about the owner's life when it is a
       * statement about how little the engine could see. On the evening it was
       * caught there was exactly one candidate, and everything else the app
       * might have weighed was unknown or months stale.
       *
       * What is left is what the ranking can support: the reading the owner
       * gave, and the part of the day, which is a real contributor and is
       * checked here rather than assumed.
       */
      const hour = hourThatSuits(evaluation, situation)
      const energy = situation.capacity.energy
      if (leanedOn(evaluation, CONCEPT.energy) && isUsable(energy)) {
        /*
         * A guess is spoken as a guess — AUD-0032.
         *
         * `isUsable` collapses `known` and `inferred`, and the phrasing read it
         * that way: on the default history the belief store reported *"Current
         * energy — 2 of 5 · inferred, 50%"* while Now said, flatly, "There is
         * enough in the tank for a walk, and the afternoon suits it". Two of
         * five is the second-lowest reading on the scale, the confidence was a
         * coin flip, and the sentence carried no hedge at all.
         *
         * Section 18's guardrail — never turn low confidence into confident
         * language — is written as something a *model* must not do, and the
         * deterministic layer was doing it. `Knowledge` carries four states
         * precisely so they can be told apart (D-014); this reads them.
         *
         * Not every inference: over-hedging every sentence would be worse than
         * the defect. Only an inference below {@link SPOKEN_AS_FACT}, and it
         * names what the inference rests on rather than hedging into mush.
         */
        const guessing = isGuess(energy)
        if (energy.value >= 0.7 && !guessing) {
          return hour === undefined
            ? `Energy is good.`
            : `Energy is good, and the ${hour} suits ${object}.`
        }
        if (guessing) {
          return hour === undefined
            ? `Going on how the last few days have gone, there should be enough for ${object}.`
            : `Going on how the last few days have gone, there should be enough for ${object}, and the ${hour} suits it.`
        }
        return hour === undefined
          ? `There is enough in the tank for ${object}.`
          : `There is enough in the tank for ${object}, and the ${hour} suits it.`
      }

      const soreness = situation.capacity.soreness
      if (leanedOn(evaluation, CONCEPT.soreness) && isUsable(soreness) && soreness.value <= 0.3) {
        if (isGuess(soreness)) {
          return `Nothing in the record says anything is sore, so ${object} looks fine.`
        }
        return hour === undefined
          ? `Nothing is sore.`
          : `Nothing is sore, and the ${hour} suits ${object}.`
      }

      return `Conditions suit ${object} right now.`
    }

    case 'stale-evidence':
      return `Nothing has come in about ${object} for a while.`

    /*
     * The trigger that means the app has nothing particular to point at.
     *
     * It used to render *"Nothing else is pressing, and X pays back tomorrow"*,
     * which is DEF-0012's exact class wearing a third set of clothes: an
     * absence asserted from ignorance. "Nothing else is pressing" reads as a
     * finding about the owner's life and is a statement about how little the
     * engine could see — the same sentence, in the same file, that was removed
     * from the `good-conditions` branch and from the walk's reason before it.
     *
     * It survived because no scenario in the library reached it. Phase 82's
     * thread history is the first one with a career move and no career goal,
     * and it printed the sentence on the first run. `tests/synthetic/
     * no-hidden-genericity.test.ts` now enumerates which triggers the library
     * actually reaches, so the next unreached branch is named rather than
     * quietly trusted.
     *
     * What is left claims nothing about what else exists. The subject being
     * open is a fact from the record; whether anything else was pressing is not
     * a question this trigger was ever answering.
     */
    case 'nothing-better':
      return `${capitalise(object)} is the one you have open.`
  }
}

/**
 * The topic today would otherwise have gone on, when the app may say so.
 *
 * Three things have to be true and each one is a separate rule: the move is the
 * morning's recovery move, the decision leaned on the topic (DEF-0006), and the
 * topic actually resolves to something with a name (D-018). A missing name
 * produces nothing rather than a sentence about "it".
 */
function studiedSubject(
  evaluation: Evaluation,
  situation: Situation,
  entities: EntityIndex,
): string | undefined {
  if (evaluation.candidate.semantics.target.verb !== 'lighten-the-day') return undefined
  if (!leanedOn(evaluation, CONCEPT.learningTopic)) return undefined
  const topic = situation.learningTopic
  if (!isUsable(topic)) return undefined
  const ref = entityValue(topic.value)
  return ref === undefined ? undefined : entities.labelFor(ref)
}

function capitalise(text: string): string {
  return text.length === 0 ? text : `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

/**
 * How long it has been, in the words a person uses.
 *
 * Coarse on purpose. "Sixty-three days" about a child's skill is the record's
 * own arithmetic read out loud; "a couple of months" is what the owner would
 * say, and section 22 forbids inventing precision either way.
 */
function describeGap(days: number): string {
  if (days < 45) return 'a few weeks'
  if (days < 75) return 'a couple of months'
  const months = Math.round(days / 30)
  return months >= 12 ? 'over a year' : `${months} months`
}

function lowerFirst(text: string): string {
  return text.length === 0 ? text : `${text.charAt(0).toLowerCase()}${text.slice(1)}`
}

/**
 * The one thing that separated the winner from the next best move.
 *
 * Section 6 asks Now to be able to show the relevant tradeoff, and the owner's
 * version of the same request is sharper: if walking beats studying, resting or
 * doing nothing, the reason should make that understandable. So this is taken
 * from the arbitration rather than written to fit it — the dimension where the
 * winner most out-scored the runner-up, in a short phrase.
 *
 * These read as statements about the winning move on purpose. None of them
 * contains a pronoun: the row sits beside the move it beat, and "it" there is
 * genuinely ambiguous about which of the two is meant.
 */
/**
 * Three of these name the hour, so all of them are written from it — AUD-0002.
 *
 * The three that matter — "worth more tonight", "costs less of the evening",
 * "fits what the body has tonight" — are among the most-read four words on the
 * whole screen, and at half past nine in the morning all three were false. The
 * table takes the block rather than three of its entries doing so, because a
 * table where some rows are functions and some are strings is a table somebody
 * adds the wrong kind of row to.
 */
export const AHEAD_BECAUSE: Record<DimensionName, (block: DayBlock) => string> = {
  'bottleneck-fit': () => 'Answers what is actually in the way.',
  'direction-fit': () => 'Closer to what the week is about.',
  'goal-fit': () => 'Serves the goal you set.',
  'thread-fit': () => 'The next step of something already under way.',
  // A reading of the record over weeks, said as a reading — AUD-0029. Not
  // "would turn it around", which is a claim about what the move will do and
  // one a run of numbers cannot support (section 68).
  'trajectory-fit': () => 'In the area the record says has been sliding.',
  urgency: () => 'The more pressing of the two.',
  'immediate-benefit': (block) => `Worth more ${horizonWord(block)}.`,
  'next-day-effect': () => 'Pays back more tomorrow.',
  'opportunity-cost': (block) => `Costs less of ${blockNoun(block)}.`,
  friction: () => 'Easier to start.',
  'time-fit': () => 'Fits the time you have.',
  'capacity-fit': (block) => `Fits what the body has ${horizonWord(block)}.`,
  'context-fit': () => 'Better suited to the hour.',
  'recent-duplication': () => 'The other one came up recently.',
  // A fact about the record and never an instruction — AUD-0010. "Leave it a
  // few days" is the app telling a man what to do with his own week.
  'spacing-fit': () => 'The other one was gone over more recently.',
  'owner-preference': () => 'Closer to what you have said you want.',
  'follow-through': () => 'More likely to actually happen.',
  'direct-result': () => 'More likely to get all the way there.',
  // Association, never cause (D-089). "What usually follows" is a
  // statement about the record; "what it does for you" would be a claim
  // about the world that a comparison of two proportions cannot support.
  'observed-change': () => 'What usually follows it looks better in the record.',
  uncertainty: () => 'Better supported by what is known.',
  protection: () => 'The other one would borrow against tomorrow.',
  advisor: () => 'What you wrote about the last attempt points here.',
}

export interface Explanation {
  /** The semantics with the composed reason written into them. */
  readonly semantics: RecommendationSemantics
  readonly rendered: RenderedRecommendation
  readonly premise: string
  /**
   * What the app has to say about the situation beyond the move itself, with
   * the label that honestly describes it.
   *
   * The label travels with the summary because it depends on the limiter kind:
   * a body that needs rest is in the way, a life area nobody has mentioned for
   * seven weeks is not. Two parallel fields would drift apart the first time
   * somebody rendered one without the other.
   */
  readonly limiter: { readonly label: string; readonly summary: string } | undefined
  /** The move this was chosen over, when there was a real contest. */
  readonly instead: string | undefined
  /** Why it beat that one — the dimension that most separated them. */
  readonly insteadBecause: string | undefined
  /**
   * Said out loud when the decision was close — AUD-0033.
   *
   * `arbitrate` already knew: a gap inside {@link CLOSE_ENOUGH_TO_MENTION}
   * pushed a note reading "close — … 0.002 behind", and the note went only to
   * the trace. So a 0.002 margin and a 0.2 margin produced identical screens,
   * and the app presented a near-tie with exactly the confidence of a clear
   * win. The information was computed, correct, and thrown away at the surface.
   *
   * Absent when the margin is wide, and absent when there was no contest at
   * all: a single candidate is not a close call, it is the only call.
   */
  readonly closeCall: string | undefined
  /**
   * What the owner's own outcomes contributed, when they contributed enough to
   * be worth saying. Absent on a move nothing has been learned about yet.
   */
  readonly restsOn: string | undefined
  /** The belief `restsOn` states, so the owner has something to disagree with. */
  readonly restsOnBelief: string | undefined
  /**
   * What that belief is about, in the app's one name for an action —
   * QA-83-002.
   *
   * The key is verb-scoped and must stay so: rejecting `effect:move` rejects
   * what the app concluded about moving, not about walks. But the *word* on the
   * button was `verbLabel`, which produced "correct what move does for you"
   * under a card headed "a walk" — a word for a template's eyebrow standing in
   * for the name of a thing. This is what the pooled evidence is actually
   * about, named to one object only where the pooled episodes agree on one.
   *
   * Present wherever `restsOnBelief` is.
   */
  readonly restsOnNamed: string | undefined
  /**
   * Which course this move belongs to, and where in it — AUD-0020.
   *
   * **A thread must never be a hidden reason.** It moves the ranking, so the
   * owner has to be able to see it at the moment he is deciding whether to do
   * the thing: *"Three recovery nights in a row — second of three. One to go."*
   * The alternative is an app that quietly weights a suggestion because of
   * something he agreed to three weeks ago and does not mention it, which is
   * the failure AUD-0020 names about its own structure.
   *
   * Absent on every move that belongs to no live course, which is nearly all of
   * them.
   */
  readonly partOf: string | undefined
  /**
   * One thing that is part of the same occasion — AUD-0022, F42.
   *
   * A clause rather than a second card, and at most one. *"Spend the next 30
   * minutes with Adaya, phone away"* and *"give Adaya a chance at ordering her
   * own food"* are one outing, and the app ranked them 0.218 and 0.140 and
   * presented the loser as a thing that had been beaten.
   *
   * **Advisory, and it creates nothing.** No second episode, no second outcome
   * question, no second lifecycle. If he goes out and she does not order for
   * herself, the primary move is still completable and nothing records a
   * failure. Section 6's *"Now must not become a feed of cards"* holds because
   * nothing new is rendered.
   */
  readonly alongside: string | undefined
  /**
   * The moment named in the sentence, where one was — AUD-0051.
   *
   * Carried beside the sentence it is already inside, so a guard can ask *which
   * fact this came from* without reading the sentence back with a regex. The
   * copy scan and the block sweep both need that: a cue is the one part of a
   * rendered move that comes from the situation rather than from the catalogue,
   * and the rule about it — **known facts only, never invented** — is about
   * where it came from rather than about how it reads.
   */
  readonly cue: { readonly clause: string; readonly from: string } | undefined
}

/** The dimension the winner most out-scored the runner-up on, as a phrase. */
function aheadBecause(
  chosen: Evaluation,
  runnerUp: Evaluation,
  block: DayBlock,
): string | undefined {
  const theirs = new Map(runnerUp.dimensions.map((entry) => [entry.name, entry]))
  let best: { name: DimensionName; gap: number; value: number } | undefined

  for (const mine of chosen.dimensions) {
    const other = theirs.get(mine.name)
    if (other === undefined) continue
    const gap = mine.value * mine.weight - other.value * other.weight
    if (gap <= 0) continue
    if (best === undefined || gap > best.gap) {
      best = { name: mine.name, gap, value: mine.value }
    }
  }

  if (best === undefined) return undefined

  // Winning on the bottleneck happens two ways, and they are not the same
  // claim. A restorative move addresses what is short; a light one wins by
  // asking less of it. Saying the second "answers what is in the way" would be
  // the explanation flattering the decision.
  if (best.name === 'bottleneck-fit' && best.value <= 0) {
    return 'Asks less of what is short right now.'
  }

  return AHEAD_BECAUSE[best.name](block)
}

/**
 * What they last did together, in the owner's own words — AUD-0019(b).
 *
 * The most recent `relationship-event` naming this subject, rendered through
 * `discreetly` because the entity is child-family-sensitive and the sentence
 * reaches Now. Nothing is composed here: the owner typed *"read two chapters
 * before bed"* and that is what comes back.
 *
 * Bounded to the last fortnight. *"Last time"* about something from March is not
 * a memory of the last time; it is the app reaching for a sentence.
 */
const A_RECENT_EVENING_DAYS = 14

/**
 * A sentence the owner wrote, ended so the app's own does not run on.
 *
 * Section 61 asks for finished sentences, and what goes in here is whatever he
 * typed — *"Read two chapters before bed"* has no full stop, because nobody
 * punctuates a note to themselves. Adding one where he did not is the smallest
 * possible edit and it is not a paraphrase: the words are his, and a stop is not
 * a word.
 */
function finished(text: string): string {
  return /[.?!]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`
}

function lastTimeTogether(situation: Situation, subject: EntityRef): string | undefined {
  const since = addLocalDays(situation.at, -A_RECENT_EVENING_DAYS, situation.zone)
  let latest: { at: number; nature: string } | undefined
  for (const record of situation.view.history.effective) {
    if (record.kind !== 'relationship-event') continue
    if (record.withEntity.id !== subject.id) continue
    if (record.occurredAt > situation.at || record.occurredAt < since) continue
    if (latest === undefined || record.occurredAt > latest.at) {
      latest = { at: record.occurredAt, nature: record.nature }
    }
  }
  if (latest === undefined) return undefined
  return discreetly(
    situation.entities.resolve(subject)?.privacy ?? 'child-family-sensitive',
    { type: 'text', value: latest.nature },
    (ref) => situation.entities.labelFor(ref),
  )
}

/** The course a move belongs to, as one line, or nothing — AUD-0020. */
function partOfThread(
  situation: Situation,
  semantics: RecommendationSemantics,
): string | undefined {
  const thread = threadFor(situation.threads, semantics.target)
  if (thread === undefined) return undefined
  return `${thread.intent} — ${lowerFirst(describeThreadPosition(thread))}`
}

export type ExplanationResult =
  | { readonly ok: true; readonly explanation: Explanation }
  | { readonly ok: false; readonly problems: readonly string[] }

export function explain(
  chosen: Evaluation,
  runnerUp: Evaluation | undefined,
  situation: Situation,
  margin?: number,
  /**
   * Everything that survived, so a compatible runner-up can be found — AUD-0022.
   *
   * The whole ranking rather than the runner-up alone, because the move that
   * shares the occasion is not always the one that came second: on the audit's
   * own evening a walk could sit between them. Optional, so every existing
   * caller and every test that composes an explanation by hand behaves exactly
   * as it did.
   */
  ranked: readonly Evaluation[] = [],
  /**
   * Whether this move is being held for a later part of today — AUD-0024.
   *
   * It suppresses the cue, and the reason is that the two sentences contradict
   * each other. *"The morning suits this better than the early morning"* and
   * *"— before the school run"* are the app deferring a move and naming a
   * deadline for it in the same breath, which is the confident wrongness
   * AUD-0051 is careful about arriving through the one door AUD-0024 opened.
   */
  held = false,
): ExplanationResult {
  const entities = situation.entities
  const base = chosen.candidate.semantics
  const semantics: RecommendationSemantics = {
    ...base,
    whyNow: { ...base.whyNow, summary: composeReason(chosen, situation, entities) },
  }

  /*
   * And when, where the record honestly holds a moment — AUD-0051.
   *
   * Composed from the situation here rather than reached for by a template: a
   * template has no situation to read and would have to guess, and *"when
   * Adaya's in bed"* on an evening she is not there is the exact error the
   * finding names. `cueFor` returns nothing far more often than it returns
   * something.
   */
  const cue = held ? undefined : cueFor(situation, semantics)
  const rendered = renderRecommendation(semantics, entities, situation.block, cue?.clause)
  if (!rendered.ok) {
    return { ok: false, problems: rendered.issues.map((issue) => issue.problem) }
  }

  /*
   * What it was chosen over, and why.
   *
   * Any real runner-up now, not only one in a different life area — the second
   * subnetting move is as much a tradeoff as a walk would be, and an earlier
   * version silently dropped it for sharing a domain with the winner.
   */
  let instead: string | undefined
  let insteadBecause: string | undefined
  let closeCall: string | undefined
  if (runnerUp !== undefined) {
    const other = renderRecommendation(runnerUp.candidate.semantics, entities, situation.block)
    if (other.ok) {
      instead = other.rendered.sentence
      insteadBecause = aheadBecause(chosen, runnerUp, situation.block)
      if (margin !== undefined && margin <= CLOSE_ENOUGH_TO_MENTION) {
        // Named, because the row sits beside "Chosen over" and "the other one"
        // there is genuinely ambiguous about which of the two is meant — the
        // same reason none of the `AHEAD_BECAUSE` phrases contains a pronoun.
        const other = verbLabel(runnerUp.candidate.semantics.target.verb).toLowerCase()
        closeCall = `Close call — ${other} was nearly it.`
      }
    }
  }

  /*
   * What is in the way, but only when the move is not already the answer to it.
   *
   * When recovery is the limiter and the move is recovery, the reason has just
   * said so in the owner's own numbers — printing "about 9 hours short of rest"
   * underneath "you are 9 hours down over the last 3 nights" is section 61's
   * repeated boilerplate, on the one screen with the least room for it. The
   * limiter earns its line when the app chose something that does not address
   * it, which is exactly when the owner would want to know.
   *
   * The trace keeps the limiter either way; this is a decision about Now.
   */
  const limiter = situation.limiter
  const alreadySaid = limiter !== undefined && limiter.domain === semantics.domain

  /*
   * What the owner's own outcomes contributed, shown where they were used.
   *
   * Section 62 requires a learned pattern to be correctable, and a belief the
   * owner cannot see is a belief they cannot correct. Putting it beside the
   * decision it moved — rather than on a screen of its own that nobody visits —
   * is what makes the correction reachable at the moment it occurs to them.
   *
   * It appears only when the learning actually moved something. A line saying
   * "this rests on nothing yet" would be the app talking about itself, which is
   * what DEF-0005 removed from this screen once already.
   */
  const learned = situation.learning.effectFor(semantics.target.verb, situation.context)

  return {
    ok: true,
    explanation: {
      semantics,
      rendered: rendered.rendered,
      premise: describePremise(situation),
      limiter:
        alreadySaid || limiter === undefined
          ? undefined
          : { label: limiter.label, summary: limiter.summary },
      instead,
      insteadBecause,
      closeCall,
      restsOn: learned.summary,
      restsOnBelief:
        learned.summary === undefined ? undefined : beliefKey('effect', semantics.target.verb),
      restsOnNamed: learned.summary === undefined ? undefined : learned.named,
      partOf: partOfThread(situation, semantics),
      alongside: alongsideClause(chosen, ranked, situation),
      cue,
    },
  }
}

/**
 * The one thing that is part of the same occasion, as a clause — AUD-0022.
 *
 * The runner-up's **own rendered sentence** goes into it, so the owner reads the
 * words the app would have used had that move won on its own. Composing a
 * paraphrase here would be D-018's failure on the half of a sentence nobody
 * would otherwise check.
 *
 * Nothing at all where the move cannot be said. A clause naming a subject that
 * no longer resolves is exactly the vague language section 3 forbids, and the
 * honest answer is one sentence rather than one and a half.
 */
function alongsideClause(
  chosen: Evaluation,
  ranked: readonly Evaluation[],
  situation: Situation,
): string | undefined {
  const found = alongsideOf(chosen, ranked, WORTH_DOING, situation.entities)
  if (found === undefined) return undefined
  const rendered = renderRecommendation(
    found.evaluation.candidate.semantics,
    situation.entities,
    situation.block,
  )
  if (!rendered.ok) return undefined
  return found.pair.clause(rendered.rendered.sentence)
}
