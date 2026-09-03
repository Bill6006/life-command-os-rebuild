import { DOMAIN } from '../../domain/domains'
import type { CanonicalRecord } from '../../domain/records'
import type { SemanticEntity } from '../../domain/entities'
import { isPlainObject, type MalformedRow } from '../../domain/validation'
import type { StoreSnapshot } from '../../memory/store'
import { belongsToPrivateSection } from '../../domain/privacy'

/**
 * The record a document is allowed to be composed from (D-150, QA-82-007).
 *
 * ## Why this is a store and not a filter on each section
 *
 * D-098 has said since Phase 7 that an excluded area is excluded from the
 * metadata as well as the detail. Four rounds running, that rule was
 * implemented in the sections somebody had thought about, and each round found
 * the ones nobody had: the coverage list, then the history rows, then the
 * diagnostics counts and the unknown labels and the timeline page and the
 * supersession list — and then Direction printing a private goal's own words,
 * Corrections printing the reason a private answer was withdrawn, Learning and
 * Insights publishing conclusions and occasion counts computed from private
 * readings, and the whole decision changing because a private observation
 * outranked a public one.
 *
 * A section is not the boundary. **The record the document is composed from
 * is.** Withheld here, once, every section is right without knowing privacy
 * exists — including the next one somebody writes, which is the part that has
 * never held.
 *
 * ## What "derived from a withheld record" means, and why it settles the hard case
 *
 * The hard case is a **current decision that rests on evidence the document may
 * not show**: a private reading of the owner's energy makes the app say "set
 * today up as a light day", and the reason, the limiter, the trace score and
 * the ranking all carry that reading's content in another form. Withholding
 * only the fact row leaves the conclusion standing with its evidence removed —
 * which is precisely what D-091 exists to prevent, one artefact further out.
 *
 * So a conclusion drawn from a withheld record is that record's content, and it
 * is withheld with it. The document is **a review of the record the owner chose
 * to share**, worked out by the app's own pipeline from exactly that record,
 * and it says so in its own first section rather than leaving the reader to
 * assume it is a photograph of the owner's screen.
 *
 * ## The one-way trust in an unreadable row
 *
 * A row that failed to parse cannot be placed in an area, so it is reported —
 * dropping it would hide a storage fault behind a privacy promise. A row whose
 * raw text *claims* the private area is withheld, and that claim is trusted in
 * one direction only: it can remove a row and can never add one, so a corrupt
 * row cannot force a real private entry to be disclosed. Round 5 found the
 * claim being read in one shape and not the other — records carry `domains`
 * and entities carry `domain`, and the singular went unread.
 */

/** Whether this record belongs to the area a private-off document withholds. */
export function isWithheldRecord(record: CanonicalRecord): boolean {
  return belongsToPrivateSection(record.privacy) || record.domains.includes(DOMAIN.privateHealth)
}

/** The same question of an entity, which carries the same two facts. */
export function isWithheldEntity(entity: SemanticEntity): boolean {
  return belongsToPrivateSection(entity.privacy) || entity.domain === DOMAIN.privateHealth
}

/**
 * Whether an unreadable row says of itself that it is in the withheld area.
 *
 * Read from `raw` because there is nowhere else to read it from. Both shapes,
 * because a row that failed validation may have been meant as either and the
 * one that went unread was the one QA reached for.
 */
export function claimsWithheld(row: MalformedRow): boolean {
  if (!isPlainObject(row.raw)) return false
  if (row.raw['privacy'] === 'private') return true
  // A record's areas are plural; an entity's is singular. Round 5's malformed
  // entity named `domain: private-health` and was counted anyway.
  if (row.raw['domain'] === DOMAIN.privateHealth) return true
  const domains = row.raw['domains']
  return Array.isArray(domains) && domains.includes(DOMAIN.privateHealth)
}

/**
 * The store this document may be composed from, or `undefined` when that is
 * the whole store.
 *
 * `undefined` rather than a copy is deliberate: it is the caller's signal that
 * there is nothing to withhold and therefore nothing to recompute, so the
 * overwhelmingly common history costs nothing and the objects the owner's own
 * screens are rendering from are passed straight through.
 */
export function withheldFrom(snapshot: StoreSnapshot): StoreSnapshot | undefined {
  const records = snapshot.records.filter((record) => !isWithheldRecord(record))
  const entities = snapshot.entities.filter((entity) => !isWithheldEntity(entity))
  const malformed = snapshot.malformed.filter((row) => !claimsWithheld(row))

  if (
    records.length === snapshot.records.length &&
    entities.length === snapshot.entities.length &&
    malformed.length === snapshot.malformed.length
  ) {
    return undefined
  }
  return { ...snapshot, records, entities, malformed }
}
