import { DOMAIN, type LifeDomainId } from './domains'
import { entityId, isEntityId, type EntityId } from './ids'
import type { PrivacyClass } from './privacy'
import type { Instant } from './time'

/**
 * Semantic entities (canonical plan section 13.3).
 *
 * These are the stable things the system talks about. An entity exists so that
 * "subnetting" is one subject with one identity across every record, every
 * correction and every recommendation — rather than a phrase that happens to
 * appear in some free text and has to be guessed at again on each render.
 *
 * Entities are uniform and relationships between them are edges. A development
 * skill is `about-person` a child; a learning topic is `part-of` a broader one;
 * a project `supports-goal`. Modelling those as links rather than as bespoke
 * fields per kind is what gives the QA inspector a relationship graph for free,
 * and what lets the renderer walk from a skill to the person it belongs to
 * instead of reaching for a pronoun.
 */

export const ENTITY_KINDS = [
  'person',
  'relationship',
  'goal',
  /**
   * What the owner is trying to become — F01.
   *
   * Its own kind rather than a `goal`, because the two are different lengths of
   * thing and collapsing them is the finding. A goal is a statement with a date
   * on it; a destination is what the goals are for, it has no date, and it is
   * the only object in the model that can still be true in three years.
   *
   * A goal that names one through `milestoneOf` is a milestone of it, and that
   * is the whole of the relationship: `supports-goal` from the milestone's own
   * entity says the same thing on the graph, for the inspector.
   */
  'destination',
  'project',
  'skill',
  'learning-topic',
  'responsibility',
  'routine',
  'place',
  'work-item',
  'financial-goal',
  'health-concern',
  'development-skill',
  'behavior',
  'life-domain',
] as const

export type EntityKind = (typeof ENTITY_KINDS)[number]

export function isEntityKind(value: unknown): value is EntityKind {
  return typeof value === 'string' && (ENTITY_KINDS as readonly string[]).includes(value)
}

export type EntityRelation =
  /** A development skill belongs to a person. */
  | 'about-person'
  /** Subnetting is part of networking. */
  | 'part-of'
  /** A relationship's participants. */
  | 'party'
  /** A project or topic serves a goal. */
  | 'supports-goal'
  /** A routine happens somewhere. */
  | 'located-at'
  /** A health concern concerns someone. */
  | 'concerns'

export const ENTITY_RELATIONS: readonly EntityRelation[] = [
  'about-person',
  'part-of',
  'party',
  'supports-goal',
  'located-at',
  'concerns',
]

export function isEntityRelation(value: unknown): value is EntityRelation {
  return typeof value === 'string' && (ENTITY_RELATIONS as readonly string[]).includes(value)
}

export interface EntityLink {
  readonly relation: EntityRelation
  readonly target: EntityId
}

export interface SemanticEntity {
  readonly id: EntityId
  readonly kind: EntityKind
  /**
   * How the app names this out loud — exactly this, never a paraphrase.
   * The special acceptance in section 46 comes down to this string surviving
   * from the record that created it to the sentence the owner reads.
   */
  readonly label: string
  /** Other names for the same thing, so "VLANs" and "VLAN trunking" agree. */
  readonly aliases: readonly string[]
  readonly domain: LifeDomainId
  readonly privacy: PrivacyClass
  readonly links: readonly EntityLink[]
  readonly createdAt: Instant
  readonly note?: string
}

/**
 * A reference to an entity, carrying its kind.
 *
 * The kind travels with the reference so that a dangling pointer is still
 * legible in the inspector, and so a reference to the wrong kind of thing is
 * something the system can notice rather than something it renders.
 */
export interface EntityRef {
  readonly id: EntityId
  readonly kind: EntityKind
}

export function entityRef(kind: EntityKind, name: string): EntityRef {
  return { id: entityId(kind, name), kind }
}

export function refTo(entity: SemanticEntity): EntityRef {
  return { id: entity.id, kind: entity.kind }
}

export function sameRef(a: EntityRef, b: EntityRef): boolean {
  return a.id === b.id && a.kind === b.kind
}

export function isEntityRefShape(value: unknown): value is EntityRef {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as { id?: unknown; kind?: unknown }
  return isEntityId(candidate.id) && isEntityKind(candidate.kind)
}

export interface CreateEntityInput {
  readonly kind: EntityKind
  readonly label: string
  readonly domain: LifeDomainId
  readonly privacy: PrivacyClass
  readonly createdAt: Instant
  readonly aliases?: readonly string[]
  readonly links?: readonly EntityLink[]
  readonly note?: string
  /** Override the derived id when a fixture needs a specific one. */
  readonly id?: EntityId
}

export function createEntity(input: CreateEntityInput): SemanticEntity {
  return {
    id: input.id ?? entityId(input.kind, input.label),
    kind: input.kind,
    label: input.label,
    aliases: input.aliases ?? [],
    domain: input.domain,
    privacy: input.privacy,
    links: input.links ?? [],
    createdAt: input.createdAt,
    ...(input.note === undefined ? {} : { note: input.note }),
  }
}

export interface IncomingLink {
  readonly from: EntityId
  readonly relation: EntityRelation
}

export interface EntityIndex {
  all(): readonly SemanticEntity[]
  get(id: EntityId): SemanticEntity | undefined
  resolve(ref: EntityRef): SemanticEntity | undefined
  /**
   * The label to print, or nothing.
   *
   * There is no fallback string here on purpose. A renderer that cannot find
   * the subject must fail loudly rather than reach for "it" — that is scenario
   * G-001, enforced at the one place a sentence could go wrong.
   */
  labelFor(ref: EntityRef): string | undefined
  byKind(kind: EntityKind): readonly SemanticEntity[]
  byDomain(domain: LifeDomainId): readonly SemanticEntity[]
  /** The first entity reached by following `relation` out of `id`. */
  linked(id: EntityId, relation: EntityRelation): SemanticEntity | undefined
  linksFrom(id: EntityId): readonly EntityLink[]
  linksTo(id: EntityId): readonly IncomingLink[]
  /** References that point at an entity this index does not have. */
  danglingLinks(): readonly { readonly from: EntityId; readonly link: EntityLink }[]
  /** Match a written name against labels and aliases. */
  findByName(name: string): SemanticEntity | undefined
}

export function createEntityIndex(entities: readonly SemanticEntity[]): EntityIndex {
  const byId = new Map<EntityId, SemanticEntity>()
  for (const entity of entities) byId.set(entity.id, entity)
  const ordered = [...byId.values()]

  const incoming = new Map<EntityId, IncomingLink[]>()
  for (const entity of ordered) {
    for (const link of entity.links) {
      const list = incoming.get(link.target)
      if (list) list.push({ from: entity.id, relation: link.relation })
      else incoming.set(link.target, [{ from: entity.id, relation: link.relation }])
    }
  }

  const byName = new Map<string, SemanticEntity>()
  for (const entity of ordered) {
    for (const name of [entity.label, ...entity.aliases]) {
      const key = name.trim().toLowerCase()
      if (key !== '' && !byName.has(key)) byName.set(key, entity)
    }
  }

  const resolve = (ref: EntityRef): SemanticEntity | undefined => {
    const found = byId.get(ref.id)
    // A reference that names the wrong kind is a broken reference, not a near
    // miss to be papered over.
    return found?.kind === ref.kind ? found : undefined
  }

  return {
    all: () => ordered,
    get: (id) => byId.get(id),
    resolve,
    labelFor: (ref) => resolve(ref)?.label,
    byKind: (kind) => ordered.filter((entity) => entity.kind === kind),
    byDomain: (domain) => ordered.filter((entity) => entity.domain === domain),
    linked: (id, relation) => {
      const target = byId.get(id)?.links.find((link) => link.relation === relation)?.target
      return target === undefined ? undefined : byId.get(target)
    },
    linksFrom: (id) => byId.get(id)?.links ?? [],
    linksTo: (id) => incoming.get(id) ?? [],
    danglingLinks: () => {
      const broken: { from: EntityId; link: EntityLink }[] = []
      for (const entity of ordered) {
        for (const link of entity.links) {
          if (!byId.has(link.target)) broken.push({ from: entity.id, link })
        }
      }
      return broken
    },
    findByName: (name) => byName.get(name.trim().toLowerCase()),
  }
}

export const EMPTY_ENTITY_INDEX: EntityIndex = createEntityIndex([])

/** The entity that stands for a life domain, so records can point at one. */
export function lifeDomainEntity(
  domain: LifeDomainId,
  label: string,
  createdAt: Instant,
): SemanticEntity {
  return createEntity({
    kind: 'life-domain',
    label,
    domain,
    privacy: 'normal',
    createdAt,
    id: entityId('life-domain', domain),
  })
}

export const DEFAULT_ENTITY_DOMAIN = DOMAIN.direction
