import type { RecordId } from '../../domain/ids'
import { evidenceSourceOf, type CanonicalRecord, type ProvenanceSource } from '../../domain/records'
import type { ResolvedHistory } from '../../memory/resolve'

/**
 * Where an entry came from, in the owner's words (D-014, and QA-08-001).
 *
 * ## The defect this exists for, and why it was wider than it was reported
 *
 * Independent QA found that a legacy row translated into a canonical
 * observation became indistinguishable from one the owner typed today —
 * on Timeline, on a domain page, in Insights and in an export. The record
 * layer was right the whole time: `evidenceSourceOf` returned `legacy-import`
 * and the stored row carried it. **The presentation layer simply never asked.**
 *
 * `describeRecord` returned a kind, a sentence and a withheld flag, and every
 * surface rendered those three. So the reported defect was not "imports lose
 * their origin". It was that **no entry on any list surface said where it came
 * from**, and a legacy import is merely the first origin that both matters
 * enormously and actually occurs in the owner's real history. A device reading
 * and a derived one were equally silent, and D-014 asks for all of them.
 *
 * So the answer is one function with one vocabulary, and every surface that
 * shows an entry or a reading shows what it returns.
 *
 * ## The owner is the default, and says nothing
 *
 * `undefined` for anything the owner wrote himself. Marking his own entries
 * would put a badge on almost every row in his history and teach him to stop
 * reading the one that matters — section 4.6, and the same argument that keeps
 * a coverage signal meaningful by not firing on everything.
 *
 * `synthetic` never reaches here: `evidenceSourceOf` resolves a fixture through
 * the method it stands in for, so a scenario's watch reading reads as a watch
 * reading. Whose history is on screen is the shell's job to say (D-091's eighth
 * invariant), not this one's.
 */

export interface RecordOrigin {
  /** Never `owner` and never `synthetic`. */
  readonly source: ProvenanceSource
  /** One short word the owner reads. */
  readonly label: string
  /** What it means, for the places that have room to say. */
  readonly detail: string
}

/**
 * The four origins that are not the owner.
 *
 * Deliberately short. These sit beside a date and a sentence on a list, and a
 * clause there would crowd out the entry itself; the longer form is for the
 * one surface with room for it.
 */
const ORIGINS: Readonly<Record<string, { label: string; detail: string }>> = {
  'legacy-import': {
    label: 'Imported',
    detail: 'Brought across from the previous version of this app.',
  },
  device: {
    label: 'Measured',
    detail: 'Read from a device rather than reported.',
  },
  derived: {
    label: 'Worked out',
    detail: 'Worked out from other entries rather than reported.',
  },
  model: {
    label: 'From a model',
    detail: 'Proposed by a model rather than reported.',
  },
}

export function originOf(record: CanonicalRecord): RecordOrigin | undefined {
  const source = evidenceSourceOf(record)
  const found = ORIGINS[source]
  if (found === undefined) return undefined
  return { source, label: found.label, detail: found.detail }
}

/**
 * The origin behind a reading, when every record under it agrees.
 *
 * A belief on a domain page rests on one record or on several. Saying
 * "Imported" over a reading that is half imported and half his own would be a
 * claim wider than the evidence — D-091's first invariant, applied to a badge
 * — so a mixed basis says nothing, and the entries themselves say it
 * individually where the owner can see which is which.
 */
export function originOfAll(records: readonly CanonicalRecord[]): RecordOrigin | undefined {
  if (records.length === 0) return undefined
  const first = originOf(records[0] as CanonicalRecord)
  if (first === undefined) return undefined
  for (const record of records.slice(1)) {
    if (originOf(record)?.source !== first.source) return undefined
  }
  return first
}

/**
 * The origin behind a **conclusion**, from the distinct sources under it.
 *
 * The aggregate half of the same rule (QA-08-001's retest). A belief, a
 * coverage state, an insight card and an export summary are each a sentence
 * about a body of evidence rather than about one record, and the intelligence
 * layer already knows which origins that body holds — `DomainCoverage.sources`,
 * `Insight.sources`. This turns that into the word the owner reads.
 *
 * One source, and not the owner's, or nothing. A conclusion drawn from a mix
 * is not an imported conclusion, and a badge over it would be a claim wider
 * than the evidence — the same rule `originOfAll` applies to records, applied
 * where a sentence is drawn rather than shown.
 */
export function originOfSources(sources: readonly ProvenanceSource[]): RecordOrigin | undefined {
  if (sources.length !== 1) return undefined
  const only = sources[0]
  if (only === undefined) return undefined
  const found = ORIGINS[only]
  if (found === undefined) return undefined
  return { source: only, label: found.label, detail: found.detail }
}

/**
 * Where one piece of evidence came from (QA-08-001).
 *
 * Built from the history rather than carried on `EvidenceLine`, because origin
 * is a presentation concern and `insights.ts` is the brain. The line already
 * carries the record id it rests on, which is all the resolution needs.
 */
export function originResolver(
  history: ResolvedHistory,
): (record: RecordId) => RecordOrigin | undefined {
  return (id) => {
    const found = history.byId(id)
    return found === undefined ? undefined : originOf(found)
  }
}
