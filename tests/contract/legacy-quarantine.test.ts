import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { createRecordFactory, SYNTHETIC_PROVENANCE } from '../../src/domain/build'
import { DOMAIN } from '../../src/domain/domains'
import { sequentialRecordIds } from '../../src/domain/ids'
import { valueIfUsable } from '../../src/domain/knowledge'
import { bearsConcept, RECORD_KINDS } from '../../src/domain/records'
import { instant, timeZone, type Instant } from '../../src/domain/time'
import { parseRecords, recordToWire } from '../../src/domain/wire'
import { snapshotFromWire, SNAPSHOT_FORMAT } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'

/**
 * Legacy data is held at arm's length (canonical plan section 30).
 *
 * "Keep imported legacy records from silently driving intelligence until they
 * are explicitly mapped/approved." The records below carry a payload that is a
 * perfectly good observation — the same shape, the same concept, a plausible
 * value — and none of it becomes an answer. Preserved, visible, and inert.
 */

const ZONE = timeZone('America/Denver')
const nextId = sequentialRecordIds('LEG')
const record = createRecordFactory({ zone: ZONE, provenance: SYNTHETIC_PROVENANCE, nextId })

function at(iso: string): Instant {
  return instant(Date.parse(iso))
}

const NOW = at('2026-05-04T20:00:00Z')

/** A legacy payload that would resolve perfectly if anything looked at it. */
const legacyPayload = {
  concept: CONCEPT.sleepHours,
  value: { type: 'number', value: 9, unit: 'hours' },
  method: 'self-report',
  occurredAt: '2026-05-04T13:00:00Z',
}

function documentWith(rows: readonly unknown[]) {
  return {
    format: SNAPSHOT_FORMAT,
    schemaVersion: 1,
    exportedAt: '2026-05-04T20:00:00Z',
    records: rows,
    entities: [],
    malformed: [],
  }
}

describe('imported legacy records are preserved and inert', () => {
  const imported = record(
    'imported-legacy-record',
    { occurredAt: at('2026-05-04T13:00:00Z'), domains: [DOMAIN.sleep] },
    { legacyFormat: 'lcos-v3-export', raw: legacyPayload },
  )

  const loaded = snapshotFromWire(documentWith([recordToWire(imported)]))
  const view = buildView(loaded.snapshot, { now: NOW, zone: ZONE })

  it('loads without complaint', () => {
    expect(loaded.loaded).toBe(true)
    expect(loaded.snapshot.malformed).toEqual([])
    expect(loaded.snapshot.records).toHaveLength(1)
  })

  it('counts as history — it is not dropped', () => {
    expect(view.summary.total).toBe(1)
    expect(view.history.effective).toHaveLength(1)
    expect(view.summary.byKind.get('imported-legacy-record')).toBe(1)
  })

  it('answers nothing, however good its payload looks', () => {
    const sleep = view.facts.knowledgeFor(CONCEPT.sleepHours)
    expect(sleep.state).toBe('unknown')
    expect(valueIfUsable(sleep)).toBeUndefined()

    // Not one concept in the registry has been touched by it.
    for (const entry of view.facts.entries) {
      expect(entry.knowledge.state, entry.concept).toBe('unknown')
    }
  })

  it('cannot bear a concept at all — the type says so', () => {
    expect(bearsConcept(imported)).toBe(false)
    const bearing = RECORD_KINDS.filter((kind) =>
      bearsConcept({ kind } as unknown as Parameters<typeof bearsConcept>[0]),
    )
    expect([...bearing]).toEqual(['observation', 'explicit-fact', 'context'])
  })

  it('keeps its payload byte for byte, ready to be mapped later', () => {
    const stored = loaded.snapshot.records[0]
    expect(stored?.kind).toBe('imported-legacy-record')
    if (stored?.kind !== 'imported-legacy-record') return
    expect(stored.raw).toEqual(legacyPayload)
    expect(stored.legacyFormat).toBe('lcos-v3-export')

    const again = parseRecords([recordToWire(stored)])
    expect(again.records[0]).toEqual(stored)
  })

  it('does not shadow a real record for the same concept', () => {
    const real = record(
      'observation',
      { occurredAt: at('2026-05-04T13:00:00Z'), domains: [DOMAIN.sleep] },
      {
        concept: CONCEPT.sleepHours,
        value: { type: 'number', value: 6.25, unit: 'hours' },
        method: 'self-report',
      },
    )

    const mixed = snapshotFromWire(documentWith([recordToWire(imported), recordToWire(real)]))
    const both = buildView(mixed.snapshot, { now: NOW, zone: ZONE })

    // The real one decides. The legacy nine hours is not even a rival.
    expect(valueIfUsable(both.facts.knowledgeFor(CONCEPT.sleepHours))).toEqual({
      type: 'number',
      value: 6.25,
      unit: 'hours',
    })
    expect(both.summary.total).toBe(2)
  })
})
