import { DOMAIN } from '../domain/domains'
import {
  createEntity,
  createEntityIndex,
  type EntityIndex,
  type SemanticEntity,
} from '../domain/entities'
import { instant } from '../domain/time'

/**
 * The few things the engine is allowed to name by itself.
 *
 * A recommendation without a resolvable subject renders nothing (D-018), which
 * means a move like "start winding down" needs an entity behind the words. The
 * rule this file follows is narrow on purpose:
 *
 * > **the engine may name its own routines; it may never name the owner's
 * > life.**
 *
 * "Winding down" and "a walk" are the engine's vocabulary for its own suggested
 * routines. Subnetting, Adaya, the kitchen, the CCNA — those come from the
 * owner's own history or the move is not proposed at all. That line is what
 * stops section 64's failure from creeping in through the back door: an engine
 * that could invent subjects would happily give two very different people the
 * same well-formed, entirely generic sentence.
 *
 * These are not canonical records and are never written to the store. They
 * exist only in the index used to render a decision.
 */

const ALWAYS = instant(0)

export const STANDING_ENTITIES: readonly SemanticEntity[] = [
  createEntity({
    kind: 'life-domain',
    label: 'sleep',
    domain: DOMAIN.sleep,
    privacy: 'normal',
    createdAt: ALWAYS,
  }),
  createEntity({
    kind: 'routine',
    label: 'winding down',
    domain: DOMAIN.sleep,
    privacy: 'normal',
    createdAt: ALWAYS,
  }),
  createEntity({
    kind: 'routine',
    label: 'a walk',
    domain: DOMAIN.health,
    privacy: 'normal',
    createdAt: ALWAYS,
  }),
  // The afternoon's version of winding down, and deliberately its own routine
  // rather than a re-worded one: easing off is lowering the bar for the rest of
  // today, and winding down is going to bed.
  createEntity({
    kind: 'routine',
    label: 'easing off',
    domain: DOMAIN.sleep,
    privacy: 'normal',
    createdAt: ALWAYS,
  }),
]

/**
 * The index a decision is rendered against.
 *
 * The owner's entities are added last, so a real entity always wins over a
 * standing one that happens to share an id.
 */
export function decisionEntities(owned: readonly SemanticEntity[]): EntityIndex {
  return createEntityIndex([...STANDING_ENTITIES, ...owned])
}
