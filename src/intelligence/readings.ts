import { CONCEPT } from '../domain/concepts'
import type { FactValue } from '../domain/records'
import type { ConceptId } from '../domain/windows'

/**
 * The check-in's readings, and the words the owner taps to give one — D-293.
 *
 * ## Why this is a separate catalogue from `questions.ts`
 *
 * `QUESTIONS` is what the **guide** may ask, and every entry there has to earn
 * its place under D-036's share rule: a question that could not change tonight's
 * recommendation is a tap the owner pays for and gets nothing back. That gate is
 * correct and it is also what starved the store — measured 2026-09-03 at **one
 * question a day**, three days running, because a candidate set of one cannot be
 * re-ranked, so nothing was worth asking, so nothing was ever recorded.
 *
 * D-286's answer is two budgets with two rules. This is the second one. A
 * reading here is justified by *"it would strengthen the data"* rather than by
 * *"it would change today's answer"*, its consumer is the state score and the
 * history the forecast will be built on, and it is **exempt from the swing rule
 * and counted separately** — never pooled with the guide's, or the ritual eats
 * the useful questions or the reverse.
 *
 * ## Five anchors, every time, and why the scale is not eleven points
 *
 * `FactValue`'s `scale` carries its own `of`, so 0–10 was representable and was
 * considered. It is refused for two reasons that are about data quality rather
 * than about screen space.
 *
 * **Nobody can write eleven distinct meaningful words for irritation**, and
 * nobody can tell 6/10 from 7/10 on a Tuesday morning. A bare number on a long
 * scale is answered by feel, and the feel drifts.
 *
 * **A labelled anchor is repeatable.** *"A bit snappy"* means the same thing on
 * Tuesday and on Friday. A bare 7 means whatever the owner's relationship with
 * the number 7 is that morning, and **that drift is noise in the exact series
 * the forecast is built on**.
 *
 * Five for every reading, and the same count for all of them, so the score
 * averages over one denominator rather than over a mixture.
 *
 * ## The rule every anchor below has to meet, and the owner set it
 *
 * > *"For mood, **good** is not helpful enough for me. I don't really know what
 * > good means."*
 *
 * **An anchor describes a state he can recognise in himself. It does not name a
 * point on a scale.** *Good*, *Moderate*, *High* and *4 out of 5* are the same
 * failure: they say where he is on a line without saying what being there feels
 * like, so he invents the meaning fresh each time and the meaning he invents
 * moves with his mood about the number.
 *
 * **The test is mechanical: could he pick between two adjacent anchors without
 * knowing which one is higher?** If the only thing separating them is intensity
 * of the same vague word, they are not anchors and they are rewritten.
 *
 * **And one shape is not applied to all thirteen.** *"Starving"* needs no gloss;
 * the dash-clause form is for the abstract dimensions — mood, focus, motivation,
 * confidence — where a bare adjective says nothing at all. Where the owner gave
 * the word himself it is kept as he said it.
 *
 * ## What a value means, and the one rule that constrains it
 *
 * **A stored reading's meaning never changes.** Section 30 and D-101 say history
 * is not rewritten, and a scale point is history: an `energy.current` record
 * holding `4 of 5` was written when 4 meant *Plenty*, and it still means
 * *Plenty*. So where a concept already ships an option set, **the values it
 * already uses keep their words and the new anchors fill the values that were
 * never written** — which is why energy's fifth anchor is above *Plenty* rather
 * than inserted below it, and why nothing here renumbers anything.
 */

export interface ReadingAnchor {
  readonly id: string
  /** What the owner taps. A state he can recognise, never a point on a scale. */
  readonly label: string
  readonly value: FactValue
}

export interface ReadingSpec {
  readonly concept: ConceptId
  /**
   * Fixed, not written fresh per block — and the difference from `QuestionSpec`
   * is deliberate.
   *
   * AUD-0002's rule is that an owner-facing string names the stretch of day it
   * is actually about, and the guide's prompts take the situation because the
   * guide can fire at any hour. A check-in reading is about **right now**, at
   * every one of its three moments, so a prompt that says *now* is true at all
   * of them and there is no hour for it to get wrong.
   */
  readonly prompt: string
  readonly anchors: readonly ReadingAnchor[]
}

/** Every reading is on the same five-point scale, so the score averages cleanly. */
export const ANCHORS_PER_READING = 5

function scale(value: number): FactValue {
  return { type: 'scale', value, of: ANCHORS_PER_READING }
}

function hours(value: number): FactValue {
  return { type: 'number', value, unit: 'hours' }
}

/**
 * Energy's five, shared with the guide's own question — one definition, two
 * surfaces.
 *
 * **This is a change to a shipped owner-facing question and it is recorded as
 * one rather than treated as tidying.** `CONCEPT.energy` shipped four options,
 * the score needs one denominator for every reading, and four against five is a
 * mixed denominator. So the question the owner has been answering since routing
 * 82 gains a fifth answer and two of the four gain a clause.
 *
 * **What did not change is what any of the four already means.** *Running on
 * empty* is still 1, *Low* is still 2, *Enough* is still 3 and *Plenty* is still
 * 4; every energy record ever written still reads as the words it was written
 * with. The fifth anchor is above *Plenty*, which is the only place a new point
 * can go without moving one that already carries history.
 *
 * *Low*, *Enough* and *Plenty* gained a clause because bare they say **how
 * much** and never **of what**, which is the failure the anchor rule is about.
 * *Running on empty* is left exactly as it shipped, because it already names
 * something a person recognises rather than grading it.
 */
export const ENERGY_ANCHORS: readonly ReadingAnchor[] = [
  { id: 'empty', label: 'Running on empty', value: scale(1) },
  { id: 'low', label: 'Low — pushing to keep going', value: scale(2) },
  { id: 'ok', label: 'Enough — for what is in front of me', value: scale(3) },
  { id: 'good', label: 'Plenty — the day is covered', value: scale(4) },
  { id: 'spare', label: 'Buzzing — I need to burn some off', value: scale(5) },
]

/**
 * The thirteen, in the order a check-in shows them.
 *
 * **The order is not D-293's, and D-293 specifies membership rather than
 * sequence.** The five that a midday or evening check-in reads come first, so
 * every check-in is the opening of the same ritual rather than a different one,
 * and a shorter check-in is visibly the same thing with less of it. Then the
 * night, which only the morning reads. Then the dimensions that barely move
 * between lunch and dinner, which is D-293's own reason for the two sizes.
 */
export const CHECK_IN_READINGS: readonly ReadingSpec[] = [
  // -------------------------------------------------------------------------
  // The five that move within a day — read at every check-in
  // -------------------------------------------------------------------------
  {
    concept: CONCEPT.mood,
    prompt: 'How are you in yourself right now?',
    /*
     * The owner's own worked example of a set that passes, kept as he approved
     * it. *"Good"* was the anchor he rejected and every one of these five names
     * something instead of grading it.
     */
    anchors: [
      { id: 'heavy', label: 'Heavy — everything is effort', value: scale(1) },
      { id: 'flat', label: 'Flat — nothing wrong, nothing good', value: scale(2) },
      { id: 'level', label: 'Level — getting on with it', value: scale(3) },
      { id: 'lifted', label: 'Lifted — things feel easier', value: scale(4) },
      { id: 'bright', label: 'Bright — actively enjoying it', value: scale(5) },
    ],
  },
  {
    concept: CONCEPT.irritation,
    /*
     * His own words at four of the five points — *Fine*, *A bit snappy*,
     * *Short-tempered*, *Snapping at everything* — with one anchor added
     * between the last two, because a five-point scale needs a fifth and the
     * gap between being short with people and snapping at them is the one a
     * person actually lives in.
     */
    prompt: 'How much is getting to you?',
    anchors: [
      { id: 'fine', label: 'Fine — nothing is getting to me', value: scale(1) },
      { id: 'snappy', label: 'A bit snappy', value: scale(2) },
      { id: 'short', label: 'Short-tempered — small things are landing hard', value: scale(3) },
      { id: 'gritting', label: 'Gritting my teeth to stay civil', value: scale(4) },
      { id: 'snapping', label: 'Snapping at everything', value: scale(5) },
    ],
  },
  {
    concept: CONCEPT.energy,
    prompt: 'How much energy have you got right now?',
    anchors: ENERGY_ANCHORS,
  },
  {
    concept: CONCEPT.hunger,
    /*
     * His four, with one anchor added. *Starving* is left short on purpose —
     * a gloss on it would be explaining a word that explains itself, and the
     * dash-clause form is for the abstract dimensions rather than for all
     * thirteen.
     */
    prompt: 'How hungry are you?',
    anchors: [
      { id: 'none', label: 'Not hungry', value: scale(1) },
      { id: 'peckish', label: 'Peckish', value: scale(2) },
      { id: 'hungry', label: 'Hungry', value: scale(3) },
      { id: 'distracted', label: 'Hungry enough to be distracted', value: scale(4) },
      { id: 'starving', label: 'Starving', value: scale(5) },
    ],
  },
  {
    concept: CONCEPT.stress,
    /*
     * Pressure arriving from outside, which is what keeps this a different
     * reading from irritation beside it and from mental load below it. D-293 is
     * explicit that irritation is not a variant of stress; these anchors are
     * where that has to be true or the two series measure one thing twice.
     */
    prompt: 'How much pressure are you under?',
    anchors: [
      { id: 'none', label: 'Nothing pressing', value: scale(1) },
      { id: 'some', label: 'A few things on the clock', value: scale(2) },
      { id: 'pushed', label: 'Pushed — working to keep up', value: scale(3) },
      { id: 'tight', label: 'Wound tight — shoulders and jaw', value: scale(4) },
      { id: 'urgent', label: 'Everything is urgent at once', value: scale(5) },
    ],
  },

  // -------------------------------------------------------------------------
  // The night — the morning reads it, and nothing else can
  // -------------------------------------------------------------------------
  {
    concept: CONCEPT.sleepHours,
    /*
     * The four bands the guide already offers, plus one above them. Hours are a
     * quantity rather than a scale, so the anchor rule does not bite here the
     * way it does on mood: a number is the recognisable thing, and *"about 6"*
     * is not a grade of anything.
     *
     * The four existing values are untouched for the reason at the top of this
     * file — 4.5, 6, 7 and 8 were written into history meaning what they say.
     */
    prompt: 'How much sleep did you actually get?',
    anchors: [
      { id: 'under-5', label: 'Under 5 hours', value: hours(4.5) },
      { id: 'about-6', label: 'About 6', value: hours(6) },
      { id: 'about-7', label: 'Seven or so', value: hours(7) },
      { id: 'full', label: 'A full night', value: hours(8) },
      { id: 'nine-plus', label: 'Nine or more', value: hours(9) },
    ],
  },
  {
    concept: CONCEPT.sleepQuality,
    /*
     * Never asked before this phase — the concept has always been readable and
     * correctable with no question spec anywhere — so all five values are free
     * and nothing here has to work around a shipped meaning.
     */
    prompt: 'How was the night?',
    anchors: [
      { id: 'broken', label: 'Broken — awake more than asleep', value: scale(1) },
      { id: 'restless', label: 'Restless — kept surfacing', value: scale(2) },
      { id: 'unrested', label: 'Slept, but it did not feel like rest', value: scale(3) },
      { id: 'solid', label: 'Solid, with a rough patch', value: scale(4) },
      { id: 'through', label: 'Straight through — woke up rested', value: scale(5) },
    ],
  },

  // -------------------------------------------------------------------------
  // The dimensions that barely move between lunch and dinner — morning only
  // -------------------------------------------------------------------------
  {
    concept: CONCEPT.overwhelm,
    /*
     * The guide asks this too, with three answers rather than five, and that is
     * left exactly as it is. Its three are cut to what `assessStrain`'s single
     * threshold can use — an option set finer than its consumer is a longer
     * question, not a richer one — while a reading has no threshold to fit and
     * wants the resolution.
     *
     * **The two sets sit on one scale and agree at the values they share.** 1 is
     * *Not much* on both, 4 is *quite a bit* on both, 5 is *More than I can
     * hold* on both. What the guide never writes is 2 or 3, so a history of both
     * has a gap rather than a contradiction — worth knowing when the forecast is
     * built on the series, and recorded here rather than discovered there.
     */
    prompt: 'How much have you got on your mind?',
    anchors: [
      { id: 'clear', label: 'Not much on my mind', value: scale(1) },
      { id: 'few', label: 'A few things, none of them pressing', value: scale(2) },
      { id: 'rechecking', label: 'A list I keep having to re-check', value: scale(3) },
      { id: 'crowded', label: 'Quite a bit — crowding out everything else', value: scale(4) },
      { id: 'over', label: 'More than I can hold', value: scale(5) },
    ],
  },
  {
    concept: CONCEPT.motivation,
    prompt: 'How much do you feel like getting going?',
    anchors: [
      { id: 'none', label: 'Nothing in me wants to start', value: scale(1) },
      { id: 'dragging', label: 'Dragging — every start takes a shove', value: scale(2) },
      { id: 'listed', label: 'I will do what is on the list', value: scale(3) },
      { id: 'keen', label: 'Keen — looking forward to getting going', value: scale(4) },
      { id: 'straining', label: 'Straining at the leash', value: scale(5) },
    ],
  },
  {
    concept: CONCEPT.confidence,
    prompt: 'How sure of yourself do you feel?',
    anchors: [
      { id: 'doubting', label: 'Doubting everything I do', value: scale(1) },
      { id: 'second-guessing', label: 'Second-guessing myself', value: scale(2) },
      { id: 'familiar', label: 'Fine on the familiar, unsure on the new', value: scale(3) },
      { id: 'sure', label: 'Sure of myself — no hesitation', value: scale(4) },
      { id: 'anything', label: 'I could take on anything today', value: scale(5) },
    ],
  },
  {
    concept: CONCEPT.focus,
    /*
     * The second of the owner's two worked examples, kept as he approved it.
     * *Very low · Low · Medium · High · Very high* is the set it replaced, and
     * every one of those five is a point on a line rather than a state.
     */
    prompt: 'How is your attention holding?',
    anchors: [
      { id: 'scattered', label: 'Scattered — cannot hold a thought', value: scale(1) },
      { id: 'drifting', label: 'Drifting — keep losing the thread', value: scale(2) },
      { id: 'patchy', label: 'Patchy — fine in bursts', value: scale(3) },
      { id: 'working', label: 'Working — getting there with effort', value: scale(4) },
      { id: 'locked', label: 'Locked in — time disappears', value: scale(5) },
    ],
  },
  {
    concept: CONCEPT.needForCompany,
    /*
     * D-293 calls this reading **loneliness**, and the concept it is stored on
     * is `emotional.need-for-company`, whose own registry entry has always read
     * *"Loneliness / social-connection need"*. They are one thing under two
     * names and a fourth new concept is not created for the second name —
     * D-293 names three, and a fourth would be the seventh item this phase is
     * told to stop at.
     *
     * **Its registry sense is `neither`, and that is why the score leaves it
     * out.** Wanting company more is not a man doing worse and not a man doing
     * better, so there is no *at its best* for it to contribute to a ceiling of
     * 100. The reading is still taken and still shown; it is the score it
     * cannot honestly enter.
     */
    prompt: 'How much would company help right now?',
    anchors: [
      { id: 'glad-alone', label: 'Glad of my own company', value: scale(1) },
      { id: 'fine-alone', label: 'Fine on my own', value: scale(2) },
      { id: 'would-take', label: 'I would take company if it turned up', value: scale(3) },
      { id: 'wanting', label: 'I have been wanting someone to talk to', value: scale(4) },
      { id: 'missing', label: 'Properly missing people', value: scale(5) },
    ],
  },
  {
    concept: CONCEPT.socialEnergy,
    /*
     * The guide's own question is *"Up for people tonight?"* with three answers
     * at 1, 3 and 4, and it stays exactly as it is. The two anchors added here
     * are at 2 and 5 — the values the guide never writes — so *Rather not*,
     * *Could go either way* and *Yes* keep the points they have always held.
     *
     * Beside the reading above it, and the distinction is real: that one asks
     * whether he is missing people, this one asks whether he has anything left
     * to give them. A man can be lonely and unable to face anyone.
     */
    prompt: 'Are you up for people right now?',
    anchors: [
      { id: 'no', label: 'Rather not — I want to be left alone', value: scale(1) },
      { id: 'one', label: 'One person I know well, and no more', value: scale(2) },
      { id: 'maybe', label: 'Could go either way', value: scale(3) },
      { id: 'yes', label: 'Happy to see people', value: scale(4) },
      { id: 'seeking', label: 'Actively want people around', value: scale(5) },
    ],
  },
]

export function readingFor(concept: ConceptId): ReadingSpec | undefined {
  return CHECK_IN_READINGS.find((reading) => reading.concept === concept)
}
