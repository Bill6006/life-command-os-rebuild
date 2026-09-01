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

/**
 * The owner-facing time vocabulary — AUD-0002, D-110.
 *
 * Re-exported rather than written out twice. The definitions live in
 * `src/domain/horizon.ts` because `domain/recommendation.ts` composes the move
 * sentences and may not import this layer; everything above the domain reads
 * them from here, which is the module the audit named and the one an
 * intelligence or surface file would look in. Two doors, one definition — the
 * same arrangement `memoryContext.ts` uses for `HistorySource`, and for the
 * same reason: two copies stay identical right up until they do not.
 */
export {
  blockNoun,
  describeDuration,
  hereNowWord,
  horizonWord,
  restOfWord,
  withinPhrase,
} from '../domain/horizon'

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
  // And the morning's, which is a third thing again — AUD-0003. Easing off is
  // lowering the bar for the hours that are left; this is deciding what goes
  // into a day that has not started.
  createEntity({
    kind: 'routine',
    label: 'a light day',
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

const STANDING_IDS = new Set(STANDING_ENTITIES.map((entity) => entity.id))

/**
 * Whether this is one of his, rather than one of the engine's — routing 91.
 *
 * The index a decision renders against holds both, deliberately, and everything
 * that renders a move needs both. The **interpreter** needs only the first: the
 * whole reason a named thing beats a word from a table is that it came from
 * him, and *"a walk"* is the engine's own word for its own suggestion. Reading
 * that back as though he had named it would be the app quoting itself as
 * evidence about his life.
 */
export function isOwnerNamed(entity: SemanticEntity): boolean {
  return !STANDING_IDS.has(entity.id)
}
