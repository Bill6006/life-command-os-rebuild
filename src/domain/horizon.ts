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

/** The part of the day as a plain noun phrase, for a sentence that needs one. */
export function blockNoun(block: DayBlock | undefined): string {
  switch (block) {
    case 'evening':
      return 'the evening'
    case 'late-night':
      return 'tonight'
    case 'afternoon':
      return 'the afternoon'
    case 'early-morning':
      return 'the early morning'
    case 'morning':
      return 'the morning'
    default:
      return 'the time you have'
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
