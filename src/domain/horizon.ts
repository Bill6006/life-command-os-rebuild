import type { DayBlock } from './time'

/**
 * What to call the stretch of time the owner is actually in — AUD-0002, D-110.
 *
 * The audit found the word `tonight` or `evening` **113 times across 29 source
 * files**, and reproduced the consequence on the deployed build at 08:40 on a
 * Tuesday: the line describing the situation read "Tuesday morning" and the
 * limiter directly beneath it read "Only about 10 minutes left tonight". The
 * guide offered "The evening is clear" as an answer about a morning. The
 * evidence panel — the one surface whose whole job is to be checkable —
 * described "situations like tonight" throughout.
 *
 * None of those was a hard question. Each was a word typed at the point of use,
 * so the assumption was made 113 separate times and could only be unmade 113
 * times. This file is the one place it is made now.
 *
 * **This is display only, and D-040's separation is the reason it can be.** The
 * evening begins at 18:00 for every purpose the engine has — which moves are
 * eligible, which suit the hour, what protects tomorrow — and none of that
 * moves because of anything here. Only the word moves.
 *
 * **Every function is total, and an unknown block is never the evening.** A
 * caller that cannot say which part of the day it is in is a caller that may
 * not claim the evening: the fallbacks below are the ones that stay true at any
 * hour. That is the same discipline as G-009's — unknown is unknown, and the
 * safe reading of it is the one that asserts less.
 *
 * It lives in `domain/` rather than in `intelligence/vocabulary.ts` for one
 * structural reason: `domain/recommendation.ts` composes the move sentences and
 * may not import the intelligence layer (`tests/unit/architecture-guards.test.ts`
 * fails the build on it). `vocabulary.ts` re-exports these under the name the
 * audit gave them, so there is one definition and two doors to it, rather than
 * two definitions.
 */

/**
 * The span a claim covers: "tonight" in the evening, "today" the rest of the
 * time.
 *
 * Promoted from `learning.ts`, where it was private and correct, and where the
 * audit found it already doing exactly this job for the learned-belief line.
 */
export function horizonWord(block: DayBlock | undefined): 'tonight' | 'today' {
  return block === 'evening' || block === 'late-night' ? 'tonight' : 'today'
}

/**
 * The moment the owner is standing in, as a person would name it.
 *
 * Distinct from {@link horizonWord}: "this has worked in situations like
 * tonight" is about a span, and "this morning" is about where he is. Late night
 * gets "tonight" rather than "this late night", which nobody says.
 */
export function hereNowWord(block: DayBlock | undefined): string {
  switch (block) {
    case 'evening':
      return 'this evening'
    case 'late-night':
      return 'tonight'
    case 'afternoon':
      return 'this afternoon'
    case 'early-morning':
    case 'morning':
      return 'this morning'
    default:
      return 'right now'
  }
}

/**
 * The part of the day as a bare noun phrase, for a sentence that needs one.
 *
 * **Bare** is the contract, and it is load-bearing — QA-81-007. Every caller
 * drops this into a frame that expects a noun it can put a preposition in front
 * of or a clause after: "worth ⟨this⟩ it would cost", "most of ⟨this⟩", "before
 * ⟨this⟩ gets away", "⟨This⟩ is limited". Two arms used to break that.
 *
 * `late-night` returned "tonight", which is an adverb rather than a noun
 * phrase, and the no-action screen at half past eleven read *"Nothing on the
 * list is worth tonight it would cost."* The default arm returned "the time you
 * have", which is a noun phrase but not a bare one — it already carries a
 * relative clause, so the same frame produced *"worth the time you have it
 * would cost"*.
 *
 * The fix is the contract rather than the two sentences: every arm is now a
 * determiner and at most two words, and `no-action-copy.test.ts` holds that
 * shape against every block. `hereNowWord` and `horizonWord` are where an
 * adverb belongs, and `withinPhrase` already reaches for "tonight" itself.
 */
export function blockNoun(block: DayBlock | undefined): string {
  switch (block) {
    case 'evening':
      return 'the evening'
    case 'late-night':
      return 'the night'
    case 'afternoon':
      return 'the afternoon'
    case 'early-morning':
      return 'the early morning'
    case 'morning':
      return 'the morning'
    default:
      return 'the time'
  }
}

/** What is left of the part of the day the owner is in. */
export function restOfWord(block: DayBlock | undefined): string {
  switch (block) {
    case 'evening':
      return 'the rest of the evening'
    case 'late-night':
      return 'the rest of tonight'
    case 'afternoon':
      return 'the rest of the afternoon'
    case 'early-morning':
    case 'morning':
      return 'the rest of the morning'
    default:
      return 'the rest of today'
  }
}

/**
 * Where a remaining quantity is remaining *of*.
 *
 * "Only about ten minutes left **tonight**" and "only about ten minutes left
 * **in the morning**" are the same sentence with the same meaning, and the
 * preposition is the only thing that differs — which is exactly the kind of
 * detail that gets typed by hand and then gets typed wrong.
 */
export function withinPhrase(block: DayBlock | undefined): string {
  return block === 'evening' || block === 'late-night' ? 'tonight' : `in ${blockNoun(block)}`
}

/**
 * A stretch of time, in the unit a person would use for it — AUD-0038(b).
 *
 * ## The finding
 *
 * The premise on Now read *"Saturday late afternoon, 8 hours of sleep, about
 * 120 minutes free, Adaya is here."* A hundred and twenty minutes is a
 * machine's unit; a person says "a couple of hours". The app already knew this
 * in one place — `arbitrate.ts` had a private `freeTime` that switched to hours
 * above ninety minutes — and the premise, written in a different file at a
 * different time, did not. Two renderings of one quantity, disagreeing on the
 * same evening.
 *
 * ## So there is one of it, and it is here
 *
 * D-178's rule is one name for a thing, in the layer every surface can reach,
 * and the audit's implementation scope named `vocabulary.ts`, which re-exports
 * it. The definition is **here** for the reason at the top of this file: the
 * domain layer may not import the intelligence layer, and `describeFactValue`
 * in `domain/records.ts` carried a third rendering of its own — a fact panel
 * reading *"Usable time now — 60 min"* while the premise said the same
 * quantity in words. Two doors, one definition; a formatter that lived in
 * `intelligence/` would have left that third one exactly where it was.
 *
 * ## What it is not
 *
 * It is not a rounding of the owner's own stated figure into vagueness. Below
 * ninety minutes the count survives, because "forty minutes" is how the owner
 * would say forty minutes and blurring it would lose information he supplied.
 * The change is above ninety, where the count is the thing that stopped
 * sounding like a person, and it is a *display* function: nothing in
 * `DecisionContext` moves, no move becomes eligible or ineligible, and the
 * arithmetic underneath is untouched. Section 22's no-score rule is unaffected
 * — a duration names what it measures and the owner supplied it (D-084).
 */
const HOUR_WORDS: Record<number, string> = {
  1: 'one',
  2: 'two',
  3: 'three',
  4: 'four',
  5: 'five',
  6: 'six',
  7: 'seven',
  8: 'eight',
  9: 'nine',
}

export function describeDuration(minutes: number): string {
  const whole = Math.round(minutes)
  if (whole < 90) return `${whole} minutes`

  // Half-hours, because that is the resolution a person speaks in above an hour.
  const hours = Math.round(whole / 30) / 2
  const full = Math.floor(hours)
  const half = hours - full >= 0.5

  if (full === 1 && half) return 'an hour and a half'
  // "A couple of hours" is what two hours is called, and the audit says so.
  if (full === 2 && !half) return 'a couple of hours'

  const word = HOUR_WORDS[full] ?? String(full)
  if (!half) return `${word} hours`
  return `${word} and a half hours`
}
