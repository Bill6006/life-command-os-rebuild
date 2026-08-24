import { createRecordFactory, type RecordFactory } from '../domain/build'
import { DOMAIN, type LifeDomainId } from '../domain/domains'
import type { EntityRef, SemanticEntity } from '../domain/entities'
import { derivedRecordId, entityId, type RecordId } from '../domain/ids'
import type { PrivacyClass } from '../domain/privacy'
import type { CanonicalRecord, FactValue, GoalStatus, Provenance } from '../domain/records'
import { instant, timeZone, type Instant, type TimeZoneId } from '../domain/time'
import { isPlainObject } from '../domain/validation'
import { dueWindow } from '../domain/windows'
import { isExplicitUnknown, type LegacyRecord } from './format'
import {
  attributeRuleFor,
  declinedOwnerReasonFor,
  declinedReasonFor,
  domainForLegacyCategory,
  privacyForLegacyClass,
  ruleFor,
  MAPPING_RULES_VERSION,
  UNKNOWN_FAMILY_RULE,
  type AttributeRule,
  type Disposition,
} from './mapping'

/**
 * Turning legacy rows into this app's records, or deciding not to.
 *
 * The registry in `mapping.ts` says what each family means. This file applies
 * it, and everything it does is a consequence of two rules:
 *
 * **Nothing is lost.** A row that maps keeps every field this app did not
 * consume, in `unrecognized`. A row that does not map is kept whole, in an
 * `imported-legacy-record`. Only an *excluded* family is not written, and it is
 * counted and named in the report rather than dropped in silence.
 *
 * **Nothing is invented.** Where a value could be derived — hours slept from a
 * bedtime and a wake time, an energy reading from a capacity band — it is not.
 * A reading this app computed is not a reading the owner recorded, and once it
 * is in the store nothing downstream can tell the difference.
 *
 * ## Ids are derived, which is what makes an import idempotent
 *
 * Every record this file produces takes its id from the legacy row's own
 * identifier and what it became. Run the same file through twice and the second
 * pass produces byte-identical records, which `CanonicalStore.append` already
 * treats as a no-op (D-015). Section 53's "idempotency" therefore needs no
 * bookkeeping table and no import ledger: it falls out of the ids.
 *
 * It also means duplicate detection is exact rather than heuristic. Two rows
 * are the same row when the old application said they were, not when they look
 * similar — and "looks similar" is how an import merges two things the owner
 * kept apart on purpose.
 */

/** What every record produced here says about where it came from. */
export function legacyProvenance(legacyId: string): Provenance {
  return {
    source: 'legacy-import',
    /*
     * The rules version rather than "the importer". Which rules were in force
     * is the thing anybody looking at an imported record six months later
     * actually needs, because a rule's *meaning* can change and a record
     * imported under the old meaning has to stay tellable apart.
     */
    writtenBy: MAPPING_RULES_VERSION,
    note: `old record ${legacyId}`,
  }
}

/**
 * Envelope keys this app consumes when it maps a row.
 *
 * Everything else the legacy row carried is kept in `unrecognized`, so a field
 * a later version of the old application invented survives an import it was
 * never designed for. Naming the consumed keys rather than the preserved ones
 * is what makes that true by default: forgetting to add a key here preserves
 * one field too many, which is recoverable, rather than losing one, which is not.
 */
const CONSUMED_KEYS: readonly string[] = [
  'recordId',
  'recordType',
  'schemaVersion',
  'occurredAt',
  'recordedAt',
  'localTime',
  'source',
  'provenance',
  'privacy',
  'supersedesRecordId',
]

function preservedFieldsOf(
  raw: Readonly<Record<string, unknown>>,
  alsoConsumed: readonly string[],
): { readonly unrecognized?: Readonly<Record<string, unknown>> } {
  const kept: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (CONSUMED_KEYS.includes(key) || alsoConsumed.includes(key)) continue
    kept[key] = value
  }
  // Spread rather than returned as `T | undefined`: under
  // `exactOptionalPropertyTypes` an explicit `unrecognized: undefined` is not
  // the same as an absent one, and a record carrying the key with nothing in it
  // would round-trip differently from one that never had it.
  return Object.keys(kept).length === 0 ? {} : { unrecognized: kept }
}

/* -------------------------------------------------------------------------- */
/* Reading a legacy value                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Why a row that belongs to a mapped family still did not map.
 *
 * Every one of these is a place where a near-fit was available. Named
 * separately so the report can say which, because "unmapped" covers a field
 * nobody understood and a field this app deliberately would not guess at, and
 * the owner's confidence in the import depends on knowing which he is looking at.
 */
export type MapRefusal =
  /** The attribute is not in the registry and nobody has decided about it. */
  | 'attribute-not-mapped'
  /** The attribute was considered and deliberately declined. */
  | 'attribute-declined'
  /** The owner looked and could not say. A real report, and not a value. */
  | 'explicitly-unsure'
  /** The value's shape is not one the mapped concept can hold. */
  | 'value-shape'
  /** A field this app requires was not in the row. */
  | 'missing-required'
  /** A state this app has no word for — an expired goal, for instance. */
  | 'no-equivalent-state'
  /** The row carried no usable timestamp, so it cannot be placed in history. */
  | 'no-timestamp'

export interface Translated {
  readonly disposition: Disposition
  /** The canonical records this row became. Empty for archive and excluded. */
  readonly mapped: readonly CanonicalRecord[]
  /**
   * Subjects the mapped records refer to.
   *
   * A goal record points at a goal entity, and a reference with nothing behind
   * it renders as an id and the word "missing". Producing the entity alongside
   * the record is what keeps an imported goal readable as the sentence the
   * owner wrote rather than as a dangling pointer.
   */
  readonly entities: readonly SemanticEntity[]
  /** Set when the row is preserved whole rather than mapped. */
  readonly archived: CanonicalRecord | undefined
  /** Set when a mappable family declined this particular row. */
  readonly refusal: MapRefusal | undefined
  /** One sentence, for whoever reads the registry. The audit trail. */
  readonly because: string
  /**
   * The same sentence for the owner, on his screen.
   *
   * Two fields for the same reason `FamilyRule` has two: the audit trail cites
   * decisions and plan sections, and the import report printed it to him
   * verbatim. See the note on `FamilyRule.owner`.
   */
  readonly ownerBecause: string
}

function readInstantOrUndefined(value: string | undefined): Instant | undefined {
  if (value === undefined) return undefined
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? undefined : instant(parsed)
}

function readZone(value: string | undefined, fallback: TimeZoneId): TimeZoneId {
  if (value === undefined) return fallback
  try {
    return timeZone(value)
  } catch {
    // A zone this runtime does not know is a zone no date can be read in. The
    // owner's current zone is a better answer than throwing away the record.
    return fallback
  }
}

/**
 * One legacy observed value, in this app's terms — or nothing.
 *
 * The union members that carry no quantity are not coerced into one. In
 * particular `unsure` produces nothing at all: the old application's own note
 * on it is that it is "a real first-hand report, not missing data", and this
 * app has no shape for that, so the row is archived where it stays readable as
 * what it was.
 */
function factValueFor(value: unknown, rule: AttributeRule): FactValue | undefined {
  if (!isPlainObject(value)) return undefined
  const kind = value['kind']

  if (kind === 'unsure') return undefined

  if (rule.shape === 'scale') {
    if (kind !== 'anchored-scale') return undefined
    const ordinal = value['ordinal']
    if (typeof ordinal !== 'number' || !Number.isFinite(ordinal)) return undefined
    return { type: 'scale', value: ordinal, of: rule.scaleOf ?? 5 }
  }

  if (rule.shape === 'number') {
    if (kind === 'quantity') {
      const amount = value['amount']
      const unit = value['unit']
      if (typeof amount !== 'number' || !Number.isFinite(amount)) return undefined
      return typeof unit === 'string' && unit.length > 0
        ? { type: 'number', value: amount, unit }
        : { type: 'number', value: amount }
    }
    if (kind === 'count') {
      const count = value['count']
      if (typeof count !== 'number' || !Number.isFinite(count)) return undefined
      return { type: 'number', value: count }
    }
    return undefined
  }

  if (rule.shape === 'duration') {
    if (kind !== 'duration') return undefined
    const minutes = value['minutes']
    if (typeof minutes !== 'number' || !Number.isFinite(minutes)) return undefined
    return { type: 'duration', minutes }
  }

  // Text.
  const text = kind === 'state' ? value['state'] : kind === 'note' ? value['text'] : undefined
  if (typeof text !== 'string' || text.trim() === '') return undefined
  /*
   * "Unsure" chosen from a list is the same statement as the `unsure` variant,
   * arriving through a different door — the old application offered it as an
   * option on choice prompts as well as as its own value kind. Letting it
   * through as text would file "I could not say" as the answer to the question.
   */
  if (isExplicitUnknown(text)) return undefined
  return { type: 'text', value: text.trim() }
}

/* -------------------------------------------------------------------------- */
/* Translating                                                                 */
/* -------------------------------------------------------------------------- */

export interface TranslateOptions {
  /** The owner's zone, used only where a row carries none of its own. */
  readonly zone: TimeZoneId
  /** Names the file in every archived record, so its origin stays readable. */
  readonly legacyFormat: string
}

const GOAL_STATES: Readonly<Record<string, GoalStatus>> = {
  active: 'active',
  achieved: 'achieved',
  abandoned: 'abandoned',
  paused: 'paused',
}

function archiveOf(
  record: LegacyRecord,
  options: TranslateOptions,
  at: Instant,
  zone: TimeZoneId,
  domains: readonly LifeDomainId[],
  privacy: PrivacyClass,
): CanonicalRecord {
  const factory: RecordFactory = createRecordFactory({
    zone,
    provenance: legacyProvenance(record.recordId),
  })
  return factory(
    'imported-legacy-record',
    {
      id: derivedRecordId('legacy-archive', record.recordId),
      occurredAt: at,
      recordedAt: readInstantOrUndefined(record.recordedAt) ?? at,
      zone,
      domains,
      privacy,
    },
    { legacyFormat: options.legacyFormat, raw: record.raw },
  )
}

/**
 * One legacy row, translated or refused.
 *
 * The order below is the order the decisions actually depend on each other: a
 * row that cannot be placed in time cannot become anything, a family this build
 * has no rule for is archived before anyone reads its fields, and an excluded
 * family stops before a record of any kind is built.
 */
export function translateRecord(record: LegacyRecord, options: TranslateOptions): Translated {
  const rule = ruleFor(record.recordType) ?? UNKNOWN_FAMILY_RULE
  const zone = readZone(record.timeZone, options.zone)
  const occurredAt = readInstantOrUndefined(record.occurredAt)
  const recordedAt = readInstantOrUndefined(record.recordedAt)
  const category = typeof record.raw['category'] === 'string' ? record.raw['category'] : undefined
  const domain = domainForLegacyCategory(category)
  const privacy = privacyForLegacyClass(record.privacy)

  if (rule.disposition === 'excluded') {
    return {
      disposition: 'excluded',
      mapped: [],
      entities: [],
      archived: undefined,
      refusal: undefined,
      because: rule.because,
      ownerBecause: rule.owner,
    }
  }

  /*
   * A row with no readable timestamp cannot be placed in history at all, and
   * stamping it with the moment of the import would put a date on it that
   * nothing that happened ever had. It is archived at `recordedAt` where there
   * is one, and refused where there is neither.
   */
  const at = occurredAt ?? recordedAt
  if (at === undefined) {
    return {
      disposition: 'archive',
      mapped: [],
      entities: [],
      archived: undefined,
      refusal: 'no-timestamp',
      because:
        'The row carries no readable date, so it cannot be placed in history without ' +
        'this app inventing one.',
      ownerBecause:
        'There is no readable date on it, so there is nowhere in your history to put it ' +
        'without this app inventing one.',
    }
  }

  const archive = (
    refusal: MapRefusal | undefined,
    because: string,
    ownerBecause: string = rule.owner,
  ): Translated => ({
    disposition: rule.disposition === 'undecided' ? 'undecided' : 'archive',
    mapped: [],
    entities: [],
    archived: archiveOf(record, options, at, zone, domain === undefined ? [] : [domain], privacy),
    refusal,
    because,
    ownerBecause,
  })

  if (rule.disposition !== 'map') return archive(undefined, rule.because)

  const factory: RecordFactory = createRecordFactory({
    zone,
    provenance: legacyProvenance(record.recordId),
  })

  const envelope = (id: RecordId, domains: readonly LifeDomainId[], supersedes?: RecordId) => ({
    id,
    occurredAt: at,
    recordedAt: recordedAt ?? at,
    zone,
    domains,
    privacy,
    ...(supersedes === undefined ? {} : { supersedes }),
  })

  switch (record.recordType) {
    case 'observation':
    case 'observation-correction': {
      const attribute = record.raw['attribute']
      if (typeof attribute !== 'string') {
        return archive(
          'missing-required',
          'The row names no attribute, so it reads as nothing.',
          'It does not say what it was a reading of, so there is nothing to read it as.',
        )
      }

      const attributeRule = attributeRuleFor(attribute)
      if (attributeRule === undefined) {
        const declined = declinedReasonFor(attribute)
        return declined === undefined
          ? archive(
              'attribute-not-mapped',
              `No rule covers “${attribute}”. It is kept exactly as written.`,
              `Nothing here covers what “${attribute}” recorded, so it is kept exactly as written.`,
            )
          : archive('attribute-declined', declined, declinedOwnerReasonFor(attribute) ?? rule.owner)
      }

      const value = factValueFor(record.raw['value'], attributeRule)
      if (value === undefined) {
        const raw = record.raw['value']
        const kind = isPlainObject(raw) ? raw['kind'] : undefined
        return kind === 'unsure'
          ? archive(
              'explicitly-unsure',
              'The owner looked and could not say. That is a report, not a reading, and ' +
                'this app has no value that means it.',
              'You looked and could not say. That is worth keeping and it is not a reading, ' +
                'so it is kept exactly as written rather than turned into one.',
            )
          : archive(
              'value-shape',
              `“${attribute}” was recorded as something other than a ${attributeRule.shape}, ` +
                'so mapping it would change what it says.',
              `“${attribute}” was written down as something this app cannot hold, so bringing ` +
                'it across would change what it says.',
            )
      }

      /*
       * A correction becomes a superseding observation rather than a
       * `correction` record. See the registry's note: this app replaces by
       * writing a new record with `supersedes` set, and its `correction` kind
       * means the other thing — a retraction with nothing to put in its place.
       */
      const supersedes =
        record.recordType === 'observation-correction' && record.supersedesRecordId !== undefined
          ? derivedRecordId('legacy-map', record.supersedesRecordId, 'observation')
          : undefined

      const built = factory(
        'observation',
        {
          ...envelope(
            derivedRecordId('legacy-map', record.recordId, 'observation'),
            [attributeRule.domain],
            supersedes,
          ),
          ...preservedFieldsOf(record.raw, ['category', 'attribute', 'value']),
        },
        {
          concept: attributeRule.concept,
          value,
          /*
           * Always self-report, whatever the old row's method said.
           *
           * `evidenceSourceOf` already makes provenance win for anything not
           * owner-written, so an imported row reads as `legacy-import`
           * everywhere it surfaces regardless of this field. What `method`
           * still decides is reliability, and claiming `device` for a reading
           * whose measuring device this app has never seen would spend a
           * confidence it has not earned.
           */
          method: 'self-report',
        },
      )
      return {
        disposition: 'map',
        mapped: [built],
        entities: [],
        archived: undefined,
        refusal: undefined,
        because: attributeRule.because,
        ownerBecause: rule.owner,
      }
    }

    case 'north-star': {
      const statement = record.raw['statement']
      if (typeof statement !== 'string' || statement.trim() === '') {
        return archive('missing-required', 'The row carries no statement.', 'It says nothing.')
      }
      const subject = legacyGoalEntity(
        record.recordId,
        statement.trim(),
        DOMAIN.direction,
        at,
        privacy,
      )
      const built = factory(
        'goal',
        {
          ...envelope(derivedRecordId('legacy-map', record.recordId, 'goal'), [DOMAIN.direction]),
          entities: [refOf(subject)],
          ...preservedFieldsOf(record.raw, ['statement']),
        },
        {
          goal: refOf(subject),
          statement: statement.trim(),
          /*
           * Active, and with no target window. A north star had a `horizon`
           * that was free text by the old model's own description — "the user
           * owns this definition; the system never scores it" — so turning it
           * into a dated window would put a deadline on something written
           * precisely to avoid having one. The horizon text is preserved.
           */
          status: 'active',
        },
      )
      return {
        disposition: 'map',
        mapped: [built],
        entities: [subject],
        archived: undefined,
        refusal: undefined,
        because: rule.because,
        ownerBecause: rule.owner,
      }
    }

    case 'goal': {
      const statement = record.raw['statement']
      const state = record.raw['state']
      if (typeof statement !== 'string' || statement.trim() === '') {
        return archive('missing-required', 'The row carries no statement.', 'It says nothing.')
      }
      if (typeof state !== 'string') {
        return archive(
          'missing-required',
          'The row carries no state.',
          'It does not say whether it was still going.',
        )
      }
      const status = GOAL_STATES[state]
      if (status === undefined) {
        return archive(
          'no-equivalent-state',
          `This app has no word for a goal that is “${state}”. Calling it abandoned or ` +
            'paused would each say something the owner did not.',
          'There is no word here for a goal whose deadline simply passed. Calling it ' +
            'abandoned or paused would each say something you did not.',
        )
      }
      const home = domain ?? DOMAIN.direction
      const subject = legacyGoalEntity(record.recordId, statement.trim(), home, at, privacy)
      const built = factory(
        'goal',
        {
          ...envelope(derivedRecordId('legacy-map', record.recordId, 'goal'), [home]),
          entities: [refOf(subject)],
          ...preservedFieldsOf(record.raw, ['statement', 'state', 'category']),
        },
        { goal: refOf(subject), statement: statement.trim(), status },
      )
      return {
        disposition: 'map',
        mapped: [built],
        entities: [subject],
        archived: undefined,
        refusal: undefined,
        because: rule.because,
        ownerBecause: rule.owner,
      }
    }

    case 'commitment': {
      const statement = record.raw['statement']
      const dueAt = readInstantOrUndefined(
        typeof record.raw['dueAt'] === 'string' ? record.raw['dueAt'] : undefined,
      )
      if (typeof statement !== 'string' || statement.trim() === '') {
        return archive('missing-required', 'The row carries no statement.', 'It says nothing.')
      }
      if (dueAt === undefined) {
        return archive(
          'missing-required',
          'The commitment has no due date, and this app’s commitments have one. Inventing ' +
            'a deadline would put the owner under a promise he did not make.',
          'It has no date on it, and commitments here have one. Making a date up would put ' +
            'you under a deadline you never set.',
        )
      }
      const built = factory(
        'commitment',
        {
          ...envelope(
            derivedRecordId('legacy-map', record.recordId, 'commitment'),
            domain === undefined ? [] : [domain],
          ),
          ...preservedFieldsOf(record.raw, ['statement', 'dueAt', 'category']),
        },
        /*
         * A point deadline, expressed as a window with no width. The old model
         * carried a single instant and this app carries a range, so the honest
         * translation is the narrowest range that means the same date — not a
         * span invented around it to look more forgiving than the owner was.
         */
        { statement: statement.trim(), due: dueWindow(dueAt, dueAt) },
      )
      return {
        disposition: 'map',
        mapped: [built],
        entities: [],
        archived: undefined,
        refusal: undefined,
        because: rule.because,
        ownerBecause: rule.owner,
      }
    }

    default:
      // Unreachable while every `map` family is handled above, and
      // `tests/unit/legacy-mapping.test.ts` fails the build if one is added
      // without a branch here rather than letting it archive silently.
      return archive(undefined, rule.because)
  }
}

function refOf(entity: SemanticEntity): EntityRef {
  return { id: entity.id, kind: entity.kind }
}

/**
 * The subject a legacy goal is about.
 *
 * Its identity comes from the **old record id**, not from the statement's
 * words. Two goals worded identically a year apart are two goals, and slugging
 * the text would silently merge them into one subject carrying one history —
 * which is the "it" problem section 13.4 exists to prevent, arriving through an
 * importer instead of through a pronoun.
 *
 * The label is the owner's own sentence, unedited, because that is the string
 * every surface will read out.
 */
function legacyGoalEntity(
  legacyId: string,
  statement: string,
  domain: LifeDomainId,
  createdAt: Instant,
  privacy: PrivacyClass,
): SemanticEntity {
  return {
    id: entityId('goal', `legacy ${legacyId}`),
    kind: 'goal',
    label: statement,
    aliases: [],
    domain,
    privacy,
    links: [],
    createdAt,
  }
}
