import type { SemanticEntity } from '../domain/entities'
import type { LocalDayId, TimeZoneId } from '../domain/time'
import { localDayIdAt } from '../domain/time'
import type { MalformedRow } from '../domain/validation'
import { sortRecords, type CanonicalRecord } from '../domain/records'
import { recordFingerprint, type StoreSnapshot } from '../memory/store'
import { readLegacyRecord, type LegacyRecord } from './format'
import { MOVE_PREFERENCE_NOTE, ruleFor, UNKNOWN_FAMILY_RULE, type Disposition } from './mapping'
import { translateRecord, type MapRefusal, type TranslateOptions } from './translate'

/**
 * What an import would do, worked out before anything is written (canonical
 * plan section 53 — "mapping inventory", "preview/dry run", "duplicate
 * detection").
 *
 * ## The preview is the product, not a courtesy
 *
 * This phase writes a *re-interpretation* of the owner's history into the only
 * copy of it he has. Phase 7's restore replaced his records with a copy of his
 * records; this replaces nothing but adds rows that claim to mean what old rows
 * meant. If that claim is wrong, the wrongness is indistinguishable afterwards
 * from something he recorded himself.
 *
 * So the preview answers the questions that decide whether to go ahead, and it
 * answers all of them before the first byte is written: how many rows are in
 * the file, what each family became, which ones nothing was made of and **why**,
 * what is deliberately not coming, what is already here from a previous run,
 * and what the owner will have to say again himself.
 *
 * ## A dry run and a preview are the same object here
 *
 * Section 53 asks for both, and building two would mean two chances to
 * disagree. `planImport` performs the whole translation — every record that
 * would be written is actually built — and then does not write it. There is no
 * second code path that runs "for real", so there is nothing the preview can be
 * wrong about that the apply would get right.
 */

export interface FamilyTally {
  readonly legacyType: string
  readonly disposition: Disposition
  readonly rows: number
  /** How many produced a canonical record. Zero for everything but `map`. */
  readonly mapped: number
  readonly because: string
}

export interface RefusalTally {
  readonly refusal: MapRefusal
  readonly rows: number
  /** One example sentence, so the count has a face. */
  readonly example: string
}

/**
 * A standing decision the owner made that this import cannot keep.
 *
 * Listed by name rather than merely counted. See `MOVE_PREFERENCE_NOTE`: the
 * honest version of "I cannot keep this promise" names the promise.
 */
export interface UnkeptStance {
  readonly stance: string
  readonly move: string
}

export interface ImportInventory {
  readonly rows: number
  /** Rows that could not even be identified as records. Counted, never dropped. */
  readonly unreadable: number
  readonly families: readonly FamilyTally[]
  readonly refusals: readonly RefusalTally[]
  /** Families the file carried that this build has no rule for. */
  readonly unrecognisedFamilies: readonly string[]
  readonly firstDay: LocalDayId | undefined
  readonly lastDay: LocalDayId | undefined
}

export interface ImportPlan {
  readonly inventory: ImportInventory
  /** Canonical records this import would add. Already built, not described. */
  readonly toAppend: readonly CanonicalRecord[]
  readonly entities: readonly SemanticEntity[]
  /** Legacy rows kept whole and inert. Part of `toAppend`; counted separately. */
  readonly archived: number
  /** Rows section 59 excludes. Written nowhere, named in the report. */
  readonly excluded: number
  /**
   * Records a previous run of this same file already wrote.
   *
   * Not an error and not a warning. It is what makes the import re-runnable:
   * the ids are derived from the old record ids, so a second pass recognises
   * its own work exactly rather than by resemblance.
   */
  readonly alreadyPresent: number
  /**
   * Rows whose id is already here carrying **different** content.
   *
   * This should not happen. The old application's history was append-first, so
   * a row does not change after it is written; an id that has come back with a
   * different payload means the file has been edited or damaged since the
   * earlier import. The existing record wins and the incoming one is reported
   * rather than applied — an import may add to history and may not rewrite it.
   */
  readonly conflicts: readonly { readonly id: string; readonly legacyType: string }[]
  readonly unkeptStances: readonly UnkeptStance[]
  /** Rows the owner has to decide about before they can mean anything. */
  readonly undecided: number
  readonly note: string
}

function dayOf(record: CanonicalRecord): LocalDayId {
  return localDayIdAt(record.occurredAt, record.zone)
}

function stanceOf(record: LegacyRecord): UnkeptStance | undefined {
  if (record.recordType !== 'move-preference') return undefined
  const stance = record.raw['stance']
  const statement = record.raw['moveStatement']
  if (typeof stance !== 'string') return undefined
  /*
   * Only a live prohibition is listed. A `restored` stance is the owner taking
   * one back, and reading the chain's earlier `forbidden` out of context would
   * hand him back a rule he had already cancelled — which is worse than losing
   * it, because he would very likely re-state it.
   */
  if (stance !== 'forbidden') return undefined
  return {
    stance,
    move: typeof statement === 'string' && statement.trim() !== '' ? statement.trim() : 'unnamed',
  }
}

/**
 * Which stances are still standing at the end of the file.
 *
 * A `move-preference` chain is superseded by later stances for the same move,
 * so the answer is the **last** record per `engineCandidateId` and not every
 * `forbidden` that ever appeared. Ordered by `occurredAt` and then
 * `recordedAt`, which is the same order this app sorts its own history by.
 */
function standingStances(records: readonly LegacyRecord[]): readonly UnkeptStance[] {
  const latest = new Map<string, LegacyRecord>()
  for (const record of records) {
    if (record.recordType !== 'move-preference') continue
    const key = record.raw['engineCandidateId']
    if (typeof key !== 'string') continue
    const held = latest.get(key)
    if (held === undefined || order(record) >= order(held)) latest.set(key, record)
  }
  const out: UnkeptStance[] = []
  for (const record of latest.values()) {
    const stance = stanceOf(record)
    if (stance !== undefined) out.push(stance)
  }
  return out.sort((a, b) => (a.move < b.move ? -1 : a.move > b.move ? 1 : 0))
}

function order(record: LegacyRecord): string {
  return `${record.occurredAt ?? ''}|${record.recordedAt ?? ''}|${record.recordId}`
}

export interface PlanOptions extends TranslateOptions {
  readonly zone: TimeZoneId
}

/**
 * Read every row, translate every row, and write nothing.
 *
 * `current` is the store as it stands, and is used only to recognise records a
 * previous run already wrote. Passing it in rather than reading it here keeps
 * this function free of any store handle at all — which is what lets it be run
 * against a file nobody has committed to importing.
 */
export function planImport(
  rows: readonly unknown[],
  current: StoreSnapshot,
  options: PlanOptions,
): ImportPlan {
  const known = new Map(current.records.map((record) => [record.id, recordFingerprint(record)]))
  /*
   * Subjects the store already holds.
   *
   * Entities have to be filtered against the store for the same reason records
   * do, and forgetting it is not cosmetic: a second run of an already-imported
   * file produced nothing to append and still listed every goal's subject, so
   * the import did not register as the no-op it was. The screen offered to
   * bring across a file it had just reported as entirely already present, and
   * pressing it would have rewritten the whole store to change nothing.
   */
  const heldEntities = new Set(current.entities.map((entity) => entity.id))

  const legacy: LegacyRecord[] = []
  let unreadable = 0
  for (const row of rows) {
    const read = readLegacyRecord(row)
    if (read === undefined) unreadable += 1
    else legacy.push(read)
  }

  const tallies = new Map<string, { rule: FamilyTally; rows: number; mapped: number }>()
  const refusals = new Map<MapRefusal, { rows: number; example: string }>()
  const unrecognisedFamilies = new Set<string>()

  const toAppend: CanonicalRecord[] = []
  const entities = new Map<string, SemanticEntity>()
  const conflicts: { id: string; legacyType: string }[] = []
  let archived = 0
  let excluded = 0
  let alreadyPresent = 0
  let undecided = 0
  let firstDay: LocalDayId | undefined
  let lastDay: LocalDayId | undefined

  const consider = (record: CanonicalRecord, legacyType: string): void => {
    const existing = known.get(record.id)
    if (existing !== undefined) {
      if (existing === recordFingerprint(record)) alreadyPresent += 1
      else conflicts.push({ id: record.id, legacyType })
      return
    }
    toAppend.push(record)
    const day = dayOf(record)
    if (firstDay === undefined || day < firstDay) firstDay = day
    if (lastDay === undefined || day > lastDay) lastDay = day
  }

  for (const record of legacy) {
    const rule = ruleFor(record.recordType)
    if (rule === undefined) unrecognisedFamilies.add(record.recordType)
    const effective = rule ?? UNKNOWN_FAMILY_RULE

    const translated = translateRecord(record, options)

    const key = record.recordType
    const tally = tallies.get(key) ?? {
      rule: {
        legacyType: key,
        disposition: effective.disposition,
        rows: 0,
        mapped: 0,
        because: effective.because,
      },
      rows: 0,
      mapped: 0,
    }
    tally.rows += 1
    tally.mapped += translated.mapped.length > 0 ? 1 : 0
    tallies.set(key, tally)

    if (translated.refusal !== undefined) {
      const held = refusals.get(translated.refusal)
      refusals.set(translated.refusal, {
        rows: (held?.rows ?? 0) + 1,
        example: held?.example ?? translated.because,
      })
    }

    if (translated.disposition === 'excluded') {
      excluded += 1
      continue
    }
    if (translated.disposition === 'undecided') undecided += 1

    for (const built of translated.mapped) consider(built, record.recordType)
    for (const entity of translated.entities) {
      if (!heldEntities.has(entity.id)) entities.set(entity.id, entity)
    }
    if (translated.archived !== undefined) {
      archived += 1
      consider(translated.archived, record.recordType)
    }
  }

  const families = [...tallies.values()]
    .map(({ rule, rows, mapped }) => ({ ...rule, rows, mapped }))
    .sort((a, b) => (a.legacyType < b.legacyType ? -1 : 1))

  return {
    inventory: {
      rows: rows.length,
      unreadable,
      families,
      refusals: [...refusals.entries()]
        .map(([refusal, { rows: count, example }]) => ({ refusal, rows: count, example }))
        .sort((a, b) => b.rows - a.rows),
      unrecognisedFamilies: [...unrecognisedFamilies].sort(),
      firstDay,
      lastDay,
    },
    toAppend,
    entities: [...entities.values()],
    archived,
    excluded,
    alreadyPresent,
    conflicts,
    unkeptStances: standingStances(legacy),
    undecided,
    note: MOVE_PREFERENCE_NOTE,
  }
}

/**
 * The store as it would be once this plan had been applied.
 *
 * Built here rather than inside the apply, because it is the thing the
 * verification afterwards has to be checked against — and a snapshot computed
 * on one side of a write and re-computed on the other is two chances to differ.
 *
 * Malformed rows are carried through untouched. An import has nothing to say
 * about a row the store already could not read, and quietly tidying one away
 * would make the owner's history thinner as a side effect of an unrelated
 * operation.
 */
export function snapshotWith(current: StoreSnapshot, plan: ImportPlan): StoreSnapshot {
  const entities = new Map(current.entities.map((entity) => [entity.id, entity]))
  for (const entity of plan.entities) {
    // Existing wins. An import adds subjects it brought; it does not rename one
    // the owner has since edited here.
    if (!entities.has(entity.id)) entities.set(entity.id, entity)
  }
  const malformed: readonly MalformedRow[] = current.malformed
  return {
    schemaVersion: current.schemaVersion,
    /*
     * Canonically ordered, and this is not cosmetic.
     *
     * `restoreInto` verifies by fingerprinting what came back out of the store
     * and comparing it with the fingerprint of what went in, and
     * `snapshotToWire` serialises records in the order it is given them — so
     * the fingerprint is order-sensitive. A store returns its records sorted;
     * an unsorted merge going in therefore fingerprints differently from the
     * identical history coming out, and every import would report that what was
     * written is not what the file holds and roll itself back.
     *
     * Sorting here is also the right answer independently of that: D-091's
     * seventh invariant is that anything presenting history as a sequence
     * orders it canonically, and appending imported rows to the end would put
     * a decade-old reading after last night's.
     */
    records: sortRecords([...current.records, ...plan.toAppend]),
    entities: [...entities.values()],
    malformed,
  }
}
