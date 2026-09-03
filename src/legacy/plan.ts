import type { SemanticEntity } from '../domain/entities'
import type { LocalDayId, TimeZoneId } from '../domain/time'
import { localDayIdAt } from '../domain/time'
import type { MalformedRow } from '../domain/validation'
import { sortRecords, type CanonicalRecord } from '../domain/records'
import { recordToWire } from '../domain/wire'
import { stableStringify, type StoreSnapshot } from '../memory/store'
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
  /** The audit trail. Cites decisions and plan sections; not for the screen. */
  readonly because: string
  /** The same decision in the owner's terms. See `FamilyRule.owner`. */
  readonly owner: string
}

export interface RefusalTally {
  readonly refusal: MapRefusal
  readonly rows: number
  /** One example sentence, so the count has a face. The audit trail's wording. */
  readonly example: string
  /** The same sentence in the owner's terms. This is what the screen renders. */
  readonly owner: string
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

/**
 * Two entries that say the same thing, from two different families — AUD-0038(c).
 *
 * ## The finding
 *
 * The deployed preview's Career page listed *"Finish a meaningful certification"*
 * **twice**, both badged Imported, twenty-three minutes apart, as two entities.
 * `north-star` and `goal` are separate `FAMILY_RULES` entries that each build a
 * `goal` record, and `legacyGoalEntity` keys identity on the **old record id**
 * — correctly, and for a stated reason: *"two goals worded identically a year
 * apart are two goals."*
 *
 * That reasoning is sound and is not replaced. What it does not cover is two
 * records of **different families** carrying the same statement, and there was
 * no pass afterwards that looked across families for one.
 *
 * ## What this is, and what it is not
 *
 * **Presentational.** It groups, it does not merge, and it changes nothing about
 * what the import writes. The audit is explicit: *"do not merge automatically,
 * and do not change the entity-identity rule"* — and the import review has been
 * through four QA rounds, so a grouping that altered a byte of what is written
 * would be the riskiest possible way to fix a display defect.
 *
 * **Exact statements only, after trimming and case.** Text-slugging two
 * differently worded goals into one is precisely the identity rule this refuses
 * to touch; what is grouped is the case the owner actually hit, which is the
 * same sentence twice.
 */
export interface DuplicateStatement {
  /** The statement, exactly as the first of them writes it. */
  readonly statement: string
  /** Which legacy families produced it, in the order they appear. */
  readonly families: readonly string[]
  /** How many entries carry it. Two or more, or it is not here. */
  readonly rows: number
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
  /**
   * The same statement arriving twice from two families — AUD-0038(c).
   *
   * Empty on every file that does not hold one, which is most. Read by the
   * review panel and by nothing that writes.
   */
  readonly sameStatement: readonly DuplicateStatement[]
  /**
   * What the archived families can and cannot do, in the owner's words —
   * AUD-0030(a).
   *
   * The report counted the archive and never said that the counted rows can
   * never think. *"Your outcome and skill history came across and will not
   * influence any recommendation"* is the sentence that was missing, and it is
   * section 65 and D-105 applied to the one screen where he is deciding whether
   * to bring twenty years across.
   *
   * Undefined where nothing was archived, because there is then no cost to
   * state and a sentence about an empty set is noise.
   */
  readonly archivedCost: string | undefined
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
  /**
   * Rows already here that an **earlier revision of the mapping rules** brought
   * across (QA-08-002).
   *
   * Its own count, and not a conflict. The file has not changed; this build
   * would read it differently from the build that imported it. Reporting that
   * as "now says something different" would blame his old history for a change
   * in this app, and reporting it as "already present" would hide a real
   * difference in what the app believes his history means.
   *
   * Nothing is rewritten either way — history is append-first, and a re-reading
   * is not an edit.
   */
  readonly reinterpreted: readonly { readonly id: string; readonly wasVersion: string }[]
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

/**
 * What an imported row actually is, with everything this build stamped on it
 * taken back off (QA-08-002).
 *
 * ## The defect, and why it is a class rather than a field
 *
 * A record's fingerprint covers all of it, and deciding whether a row the
 * importer has seen before "now says something different" used to compare
 * exactly that. But a record built from a legacy row is **two things joined**:
 * what the old application wrote, and what this build made of it. Only the
 * first can change without the file changing.
 *
 * The reported symptom was one field: the archive label carried the backup's
 * own creation time, so taking a **new** backup of the same append-first
 * history rewrote every archived row's fingerprint, and the importer called
 * six unchanged rows altered — drowning the one row that had genuinely
 * changed. That field is fixed at source (`legacyFormatLabel` is now the format
 * and nothing else), and fixing it there is not enough, because the class is:
 *
 * > **Nothing this build chose may take part in deciding whether the file
 * > changed.**
 *
 * Three things it chooses, and each would otherwise turn a re-import into a
 * screen of false conflicts:
 *
 *   - `provenance.writtenBy` — which mapping rules read the row. Revising a
 *     rule is a real difference and is reported separately below, but it is a
 *     difference in *this app*, not in his old history, and saying "the file
 *     now says something different" about it would be false.
 *   - `legacyFormat` — which file it arrived in. Belt and braces now.
 *   - `zone` — which clock this device was set to when a row that carried no
 *     zone of its own was read. Importing the same file after travelling is
 *     not the file changing.
 *
 * Everything else in the record comes from the row: its instants, its concept,
 * its value, its privacy, its raw payload, and the derived id that says which
 * old row it is.
 */
function legacyIdentity(record: CanonicalRecord): string {
  const wire = recordToWire(record) as Record<string, unknown>
  const provenance = { ...(wire['provenance'] as Record<string, unknown>) }
  provenance['writtenBy'] = '(this build)'
  return stableStringify({
    ...wire,
    provenance,
    zone: '(this device)',
    ...(wire['legacyFormat'] === undefined ? {} : { legacyFormat: '(this format)' }),
  })
}

/** Which mapping rules brought a stored row across, for the report below. */
function rulesVersionOf(record: CanonicalRecord): string {
  return record.provenance.writtenBy
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
  /*
   * Two indexes over the same records, because two different questions are
   * being asked. `known` is what the old file said, with this build's own
   * stamps removed — see `legacyIdentity`. `knownRules` is which rules read
   * it, which is a fact about this app and is reported separately.
   */
  const known = new Map(current.records.map((record) => [record.id, legacyIdentity(record)]))
  const knownRules = new Map(current.records.map((record) => [record.id, rulesVersionOf(record)]))
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
  const refusals = new Map<MapRefusal, { rows: number; example: string; owner: string }>()
  const unrecognisedFamilies = new Set<string>()

  const toAppend: CanonicalRecord[] = []
  const entities = new Map<string, SemanticEntity>()
  const conflicts: { id: string; legacyType: string }[] = []
  const reinterpreted: { id: string; wasVersion: string }[] = []
  let archived = 0
  let excluded = 0
  let alreadyPresent = 0
  let undecided = 0
  let firstDay: LocalDayId | undefined
  let lastDay: LocalDayId | undefined

  const consider = (record: CanonicalRecord, legacyType: string): void => {
    const existing = known.get(record.id)
    if (existing !== undefined) {
      if (existing !== legacyIdentity(record)) {
        conflicts.push({ id: record.id, legacyType })
        return
      }
      alreadyPresent += 1
      const wasVersion = knownRules.get(record.id)
      if (wasVersion !== undefined && wasVersion !== rulesVersionOf(record)) {
        reinterpreted.push({ id: record.id, wasVersion })
      }
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
        owner: effective.owner,
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
        owner: held?.owner ?? translated.ownerBecause,
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

  const sameStatement = duplicateStatements(toAppend)
  const archivedCost = costOfArchiving(families, archived)

  return {
    inventory: {
      rows: rows.length,
      unreadable,
      families,
      refusals: [...refusals.entries()]
        .map(([refusal, { rows: count, example, owner }]) => ({
          refusal,
          rows: count,
          example,
          owner,
        }))
        .sort((a, b) => b.rows - a.rows),
      unrecognisedFamilies: [...unrecognisedFamilies].sort(),
      firstDay,
      lastDay,
      sameStatement,
      archivedCost,
    },
    toAppend,
    entities: [...entities.values()],
    archived,
    excluded,
    alreadyPresent,
    conflicts,
    reinterpreted,
    unkeptStances: standingStances(legacy),
    undecided,
    note: MOVE_PREFERENCE_NOTE,
  }
}

/**
 * Goals that say the same thing, from more than one family — AUD-0038(c).
 *
 * Read off the records this import would **write**, after translation, because
 * that is where the two entities actually come from: `north-star` and `goal`
 * each build a `goal` record, and the entity identity is keyed on the old record
 * id by design.
 *
 * **It groups and never merges.** Nothing here changes `toAppend`, `entities` or
 * any id. The review panel shows the grouping and asks once; declining writes
 * exactly what today's import writes, byte for byte, which is the acceptance
 * item and the reason a display defect is repaired without touching a path that
 * has been through four QA rounds.
 */
function duplicateStatements(records: readonly CanonicalRecord[]): readonly DuplicateStatement[] {
  const byStatement = new Map<string, { statement: string; families: string[]; rows: number }>()

  for (const record of records) {
    if (record.kind !== 'goal') continue
    const statement = record.statement.trim()
    if (statement === '') continue
    const key = statement.toLocaleLowerCase()
    const held = byStatement.get(key) ?? { statement, families: [], rows: 0 }
    held.rows += 1
    /*
     * Which family it came from, read off the record's own provenance note
     * rather than re-derived. `translateRecord` stamps it, so the grouping cites
     * the same words the family list on the same screen does.
     */
    const from = record.provenance.note
    if (from !== undefined && !held.families.includes(from)) held.families.push(from)
    byStatement.set(key, held)
  }

  return [...byStatement.values()]
    .filter((entry) => entry.rows > 1)
    .map((entry) => ({ statement: entry.statement, families: entry.families, rows: entry.rows }))
    .sort((a, b) => (a.statement < b.statement ? -1 : 1))
}

/**
 * What the archived families cost him, in his own words — AUD-0030(a).
 *
 * ## The finding
 *
 * *"The import screen reports the four dispositions and their counts. Nothing on
 * it says: 'your outcome and skill history came across and will not influence
 * any recommendation.'"* Fifteen families are archived, and they are **every**
 * family that records what he did, what happened afterwards, what he answered,
 * what he preferred, and his daughter's entire recorded developmental history.
 *
 * The design decision is correct — D-101 is right that a concept with no honest
 * home must not be forced into a near-fit — and the audit's point is not that it
 * should change. It is that **the owner should be told what it costs**, because
 * he is deciding whether to bring twenty years across and the report counts the
 * archive without saying that the counted rows can never think.
 *
 * ## What this says, and what it does not
 *
 * It names the families and states the consequence in one sentence. It does not
 * apologise, it does not offer to do it differently, and it does not hint at
 * AUD-0030(b) — admitting closed historical episodes to `learning.ts` is a
 * separate decision (§13F declined it), and dangling it here would be the
 * screen promising something no decision supports.
 */
function costOfArchiving(families: readonly FamilyTally[], archived: number): string | undefined {
  if (archived === 0) return undefined
  const kept = families
    .filter((family) => family.disposition === 'archive' && family.rows > 0)
    .map((family) => family.legacyType)
    .sort()
  if (kept.length === 0) return undefined

  const named =
    kept.length === 1 ? kept[0] : `${kept.slice(0, -1).join(', ')} and ${kept[kept.length - 1]}`
  return `${named} came across whole and readable, and none of it will influence a recommendation. This app cannot tell what an entry from the old one meant well enough to reason from it, so those entries are kept as history and nothing else.`
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
