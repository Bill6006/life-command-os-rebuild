import { CONCEPT } from '../domain/concepts'
import { DOMAIN, type LifeDomainId } from '../domain/domains'
import type { SemanticEntity } from '../domain/entities'
import type { ActionVerb } from '../domain/recommendation'
import type { ConceptId } from '../domain/windows'

/**
 * What the app can actually do to refresh an area it has stopped hearing about.
 *
 * Its own module because two things need the same answer and used to guess it
 * separately — QA-82-014, D-155. `coverage.ts` decides whether to tell the
 * owner that an action will bring an area back; `candidates.ts` is what has to
 * produce that action. The first asked "does this area have a subject in it?"
 * and the second asked "do I have a move for this domain, and a subject of the
 * right kind?", and those are not the same question. Life promised Health,
 * Social and Fatherhood a move that no table here has ever contained.
 *
 * So the table is the capability, and both sides read it rather than each
 * modelling it. Adding a row is the only way to add a promise, and removing one
 * removes the promise in the same commit.
 *
 * **It relaxes nothing that DEF-0006 tightened.** The moves make no claim about
 * how the owner feels: clearing a room, going back over a topic, dealing with a
 * money item. Movement and the social moves are deliberately absent, because
 * "there is capacity for it" and "you are up for people" are claims about the
 * body and the mood, and a quiet fortnight is not evidence of either. A stale
 * area is a reason to find something out; it is not a reason to pretend to know
 * something.
 *
 * The absence of a row is therefore a deliberate answer, not a gap waiting to
 * be filled. QA-82-014 is repaired by making the route tell the truth about
 * that absence — never by inventing a movement or a social move to cover it.
 *
 * And the subject is always the owner's own (D-021). A domain with nothing
 * named in it produces nothing here, which is why coverage falls through to a
 * question or to the Life signal in that case rather than inventing a subject.
 */
export interface RefreshingMove {
  readonly domain: LifeDomainId
  readonly kind: SemanticEntity['kind']
  readonly verb: ActionVerb
  readonly leansOn: readonly ConceptId[]
  readonly because: string
}

const REFRESHING_MOVES: readonly RefreshingMove[] = [
  {
    domain: DOMAIN.home,
    kind: 'place',
    verb: 'reset-space',
    leansOn: [CONCEPT.homeFriction],
    because: 'nothing has come in about the house for a while, and this would',
  },
  {
    domain: DOMAIN.career,
    kind: 'learning-topic',
    verb: 'recall-practice',
    leansOn: [CONCEPT.learningTopic],
    because: 'nothing has come in about the studying for a while, and this would',
  },
  {
    domain: DOMAIN.money,
    kind: 'financial-goal',
    verb: 'handle-money-item',
    leansOn: [CONCEPT.cashBuffer],
    because: 'nothing has come in about the money for a while, and this would',
  },
]

/** The move that would refresh this domain, or nothing if the app has none. */
export function refreshingMoveFor(domain: LifeDomainId): RefreshingMove | undefined {
  return REFRESHING_MOVES.find((entry) => entry.domain === domain)
}

/** Every domain the app can refresh by proposing something, for enumeration. */
export function domainsWithRefreshingMove(): readonly LifeDomainId[] {
  return REFRESHING_MOVES.map((entry) => entry.domain)
}
