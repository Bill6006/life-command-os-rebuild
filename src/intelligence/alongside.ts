import type { EntityIndex, EntityRef } from '../domain/entities'
import type { ActionVerb } from '../domain/recommendation'
import type { Evaluation } from './evaluate'
import { profileFor } from './moves'

/**
 * Two moves that are the same thirty minutes — AUD-0022, F42.
 *
 * ## The finding
 *
 * `arbitrate()` sorts and returns `ranked[0]`. There is no notion of two
 * candidates being compatible, complementary, or **literally the same
 * activity**. So *"spend the next 30 minutes with Adaya, phone away"* and *"give
 * Adaya a chance at ordering her own food today"* were ranked 0.218 and 0.140,
 * and the loser was presented as a thing that had been beaten. They are not
 * alternatives. They are one outing.
 *
 * The audit's own reading of why: *"section 17.2's 'one arbitration path
 * decides' was implemented as 'one arbitration path returns one candidate'. The
 * constraint is real and right; the cardinality was an implementation choice,
 * not a requirement."*
 *
 * ## What this is allowed to be, and the four bounds
 *
 * **One primary move.** The arbiter still chooses one, through the same
 * function, ranked the same way. Nothing here decides anything.
 *
 * **One appended clause, never two.** Two moves in one sentence is a step toward
 * a to-do list, which section 2 rejects outright. The cap is hard and
 * `tests/synthetic/alongside.test.ts` holds it.
 *
 * **No second episode and no second outcome question.** The clause is
 * *advisory*. If he goes out and she does not order for herself, the primary
 * move is still completable and nothing anywhere records a failure — which is
 * the lifecycle risk the audit names, and the reason this returns a sentence
 * rather than a candidate.
 *
 * **An empty table reproduces today's behaviour exactly.** Nothing is compatible
 * by default. A pairing is a claim about two activities being one, and a claim
 * has to be written down by somebody with a reason, which is `ActionFamily`'s
 * shape and the reason it is copied here.
 */

/**
 * A pairing, and the sentence that joins them.
 *
 * `because` is not documentation. It is the assertion that these two really are
 * one occasion, and `tests/unit/registries.test.ts` fails the build on an entry
 * without one — the same guard `ActionFamily` carries, for the same reason: a
 * table of pairings anybody can extend without arguing for the entry is a table
 * that eventually says a walk and a lab are the same evening.
 */
export interface CompatiblePair {
  /** The move that wins. The clause hangs off its sentence. */
  readonly primary: ActionVerb
  /** The move that is part of the same occasion. */
  readonly alongside: ActionVerb
  /** Why these two are one occasion rather than two. Written, not implied. */
  readonly because: string
  /**
   * How the two moves have to be related before they are one occasion.
   *
   * A named relation rather than a predicate, so a table entry cannot quietly
   * widen what counts as *the same evening*. Two values, and the second exists
   * because the pairing the audit names needs it: a growth opportunity's subject
   * is the **skill**, and the skill is linked to the person by `about-person`.
   * Matching on the subject alone would have found nothing, and dropping the
   * check would have paired unhurried time with Adaya to a skill belonging to
   * somebody else entirely.
   */
  readonly shares: 'the-subject' | 'someone-the-subject-is-about'
  /**
   * The clause, given the runner-up's own rendered sentence.
   *
   * Takes the sentence rather than composing one, so the owner reads the same
   * words the app would have used had the move won on its own — D-018's rule
   * about never paraphrasing a rendered move, applied to the half of a sentence
   * nobody would otherwise check.
   */
  clause(alongside: string): string
}

/**
 * The pairings, and there is one.
 *
 * Deliberately one. The audit asks for a table that is *"empty by default"* with
 * *"each entry justified in writing"*, and the one it names is the one an owner
 * actually hit: unhurried time with his daughter, and a chance for her to do
 * something for herself, are one outing rather than two claims on one evening.
 *
 * Everything else stays two things. A walk and a study session are two
 * activities however well they would fit in one evening, and saying otherwise
 * would be the to-do list arriving one pairing at a time.
 */
export const COMPATIBLE_PAIRS: readonly CompatiblePair[] = [
  {
    primary: 'time-with',
    alongside: 'growth-opportunity',
    because:
      'A growth opportunity is something she does during time they are already spending together — ' +
      'ordering her own food happens at the table they are both sitting at. Offering them as ' +
      'alternatives asks him to choose between being with her and letting her try something, which ' +
      'is not a choice the evening actually presents.',
    shares: 'someone-the-subject-is-about',
    clause: (alongside) => `While you are at it: ${lowerFirst(alongside)}`,
  },
]

function lowerFirst(text: string): string {
  return text.length === 0 ? text : `${text.charAt(0).toLowerCase()}${text.slice(1)}`
}

/**
 * The runner-up that is part of the same occasion, if there is one.
 *
 * Three conditions, and each removes a different way of getting this wrong.
 *
 * 1. **The pairing is written down.** No table entry, no clause.
 * 2. **It is worth doing on its own.** The audit's condition: *"where the
 *    runner-up is compatible with it and also scores above `WORTH_DOING`"*. A
 *    move the app would not have offered at all does not become worth mentioning
 *    by standing next to one it would.
 * 3. **It is about the same subject.** *"Give Adaya a chance to order for
 *    herself"* belongs beside time with **Adaya**, and beside nothing else. Two
 *    moves about two different people are two evenings whatever the table says.
 */
export function alongsideOf(
  chosen: Evaluation,
  ranked: readonly Evaluation[],
  worthDoing: number,
  entities: EntityIndex,
): { readonly evaluation: Evaluation; readonly pair: CompatiblePair } | undefined {
  const subject = chosen.candidate.semantics.subject
  for (const other of ranked) {
    if (other === chosen) continue
    if (other.score <= worthDoing) continue
    const pair = COMPATIBLE_PAIRS.find(
      (entry) =>
        entry.primary === chosen.candidate.semantics.target.verb &&
        entry.alongside === other.candidate.semantics.target.verb,
    )
    if (pair === undefined) continue
    if (!relates(pair, subject, other.candidate.semantics.subject, entities)) continue
    return { evaluation: other, pair }
  }
  return undefined
}

/** Whether the two subjects stand in the relation the pairing declares. */
function relates(
  pair: CompatiblePair,
  subject: EntityRef,
  other: EntityRef,
  entities: EntityIndex,
): boolean {
  if (pair.shares === 'the-subject') return other.id === subject.id
  /*
   * The entity's own link, walked rather than a name compared — the same
   * discipline `fatherhoodCandidates` follows when it decides whose skill a
   * growth opportunity is about. A skill belonging to somebody else is a
   * different evening however similar the words are.
   */
  return entities.linked(other.id, 'about-person')?.id === subject.id
}

/**
 * Whether a move could ever carry a clause, for a surface that wants to know.
 *
 * Read by the lifecycle guard rather than by a screen: what must never happen is
 * a second episode for the move in the clause, and the cheapest way to hold that
 * is for nothing outside this file to be able to turn a clause back into a
 * candidate.
 */
export function pairsWith(verb: ActionVerb): readonly ActionVerb[] {
  return COMPATIBLE_PAIRS.filter((pair) => pair.primary === verb).map((pair) => pair.alongside)
}

/** Every verb named in the table, so a guard can check the table is real. */
export function pairedVerbs(): readonly ActionVerb[] {
  return [
    ...new Set(COMPATIBLE_PAIRS.flatMap((pair) => [pair.primary, pair.alongside])),
  ] as readonly ActionVerb[]
}

/**
 * Whether the two moves in a pairing could genuinely share one occasion.
 *
 * A cheap sanity property rather than a deep one: two moves that refuse each
 * other's hours cannot be the same half hour, whatever anybody wrote in the
 * table. Read by the registry guard, so an entry that could never fire fails the
 * build rather than sitting there looking like a capability.
 */
export function couldShareAnHour(pair: CompatiblePair): boolean {
  const primary = profileFor(pair.primary)
  const alongside = profileFor(pair.alongside)
  return primary.suits.some((block) => alongside.suits.includes(block))
}
