import { describe, expect, it } from 'vitest'
import { createRecordFactory, SYNTHETIC_PROVENANCE } from '../../src/domain/build'
import { DOMAIN } from '../../src/domain/domains'
import { sequentialRecordIds } from '../../src/domain/ids'
import type { CanonicalRecord } from '../../src/domain/records'
import { instant, timeZone, type Instant } from '../../src/domain/time'
import { createMemoryStore } from '../../src/memory/memoryStore'
import { resolveHistory } from '../../src/memory/resolve'
import { recordFingerprint, stableStringify } from '../../src/memory/store'
import { conceptId } from '../../src/domain/windows'
import { CONCEPT } from '../../src/domain/concepts'

const ZONE = timeZone('America/Denver')
const nextId = sequentialRecordIds('ST')
const record = createRecordFactory({ zone: ZONE, provenance: SYNTHETIC_PROVENANCE, nextId })

function at(iso: string): Instant {
  return instant(Date.parse(iso))
}

function sleepRecord(hours: number, iso: string): CanonicalRecord {
  return record(
    'observation',
    { occurredAt: at(iso), domains: [DOMAIN.sleep] },
    {
      concept: CONCEPT.sleepHours,
      value: { type: 'number', value: hours, unit: 'hours' },
      method: 'self-report',
    },
  )
}

describe('append is append-first and all-or-nothing', () => {
  it('writes what it is given', async () => {
    const store = createMemoryStore()
    const result = await store.append([
      sleepRecord(6, '2026-05-01T13:00:00Z'),
      sleepRecord(7, '2026-05-02T13:00:00Z'),
    ])

    expect(result).toEqual({ appended: 2, skipped: 0, rejected: [] })
    expect((await store.snapshot()).records).toHaveLength(2)
  })

  it('treats the identical record arriving twice as a no-op', async () => {
    const store = createMemoryStore()
    const night = sleepRecord(6, '2026-05-01T13:00:00Z')

    await store.append([night])
    const second = await store.append([night])

    expect(second).toEqual({ appended: 0, skipped: 1, rejected: [] })
    expect((await store.snapshot()).records).toHaveLength(1)
  })

  it('refuses a different record wearing an id that is taken', async () => {
    const store = createMemoryStore()
    const night = sleepRecord(6, '2026-05-01T13:00:00Z')
    await store.append([night])

    const impostor = { ...night, ...sleepRecord(9, '2026-05-01T13:00:00Z'), id: night.id }
    const result = await store.append([impostor])

    expect(result.appended).toBe(0)
    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]?.id).toBe(night.id)

    const stored = (await store.snapshot()).records
    expect(stored).toHaveLength(1)
    expect(stored[0]).toEqual(night)
  })

  it('writes nothing at all when one record in a batch is rejected', async () => {
    const store = createMemoryStore()
    const night = sleepRecord(6, '2026-05-01T13:00:00Z')
    await store.append([night])

    const good = sleepRecord(7, '2026-05-02T13:00:00Z')
    const bad = { ...sleepRecord(9, '2026-05-01T13:00:00Z'), id: night.id }
    const result = await store.append([good, bad])

    expect(result.rejected).toHaveLength(1)
    // The good record in the same batch was not written either.
    expect((await store.snapshot()).records).toHaveLength(1)
  })

  it('catches an id repeated inside one batch', async () => {
    const store = createMemoryStore()
    const night = sleepRecord(6, '2026-05-01T13:00:00Z')
    const clash = { ...sleepRecord(8, '2026-05-01T13:00:00Z'), id: night.id }

    const result = await store.append([night, clash])
    expect(result.rejected).toHaveLength(1)
    expect((await store.snapshot()).records).toEqual([])
  })

  it('has no way to change or remove a record', () => {
    const store = createMemoryStore()
    expect(Object.keys(store).sort()).toEqual([
      'append',
      'backend',
      'clear',
      'close',
      'durable',
      'putEntities',
      'putMalformed',
      'replaceAll',
      'snapshot',
    ])
  })

  it('says out loud that the in-memory fallback is not durable', () => {
    expect(createMemoryStore().durable).toBe(false)
  })
})

describe('fingerprints', () => {
  it('does not care what order the keys arrived in', () => {
    expect(stableStringify({ a: 1, b: [2, { c: 3, d: 4 }] })).toBe(
      stableStringify({ b: [2, { d: 4, c: 3 }], a: 1 }),
    )
  })

  it('changes when the content changes', () => {
    const a = sleepRecord(6, '2026-05-01T13:00:00Z')
    const b = { ...a, ...sleepRecord(7, '2026-05-01T13:00:00Z'), id: a.id }
    expect(recordFingerprint(a)).not.toBe(recordFingerprint(b))
  })
})

describe('supersession', () => {
  const first = sleepRecord(5, '2026-05-04T13:00:00Z')
  const better = record(
    'observation',
    { occurredAt: at('2026-05-04T13:00:00Z'), domains: [DOMAIN.sleep], supersedes: first.id },
    {
      concept: CONCEPT.sleepHours,
      value: { type: 'number', value: 6.75, unit: 'hours' },
      method: 'self-report',
    },
  )

  it('leaves the replaced record in history and out of reasoning', () => {
    const history = resolveHistory([first, better])
    expect(history.all).toHaveLength(2)
    expect(history.effective).toEqual([better])
    expect(history.displacedBy.get(first.id)).toBe(better.id)
  })

  it('follows a chain to the last record standing', () => {
    const third = record(
      'observation',
      { occurredAt: at('2026-05-04T13:00:00Z'), domains: [DOMAIN.sleep], supersedes: better.id },
      {
        concept: CONCEPT.sleepHours,
        value: { type: 'number', value: 7, unit: 'hours' },
        method: 'self-report',
      },
    )
    const history = resolveHistory([first, better, third])
    expect(history.effective).toEqual([third])
  })

  it('reports a pointer at a record that is not there', () => {
    const orphan = record(
      'observation',
      {
        occurredAt: at('2026-05-05T13:00:00Z'),
        domains: [DOMAIN.sleep],
        supersedes: sleepRecord(1, '2026-01-01T00:00:00Z').id,
      },
      {
        concept: CONCEPT.sleepHours,
        value: { type: 'number', value: 8, unit: 'hours' },
        method: 'self-report',
      },
    )
    const history = resolveHistory([orphan])
    expect(history.issues[0]?.problem).toBe('dangling-supersedes')
    // The record itself is still usable — a bad pointer is not a bad record.
    expect(history.effective).toEqual([orphan])
  })

  it('holds back both halves of a cycle instead of picking one', () => {
    const a = sleepRecord(6, '2026-05-06T13:00:00Z')
    const b = sleepRecord(7, '2026-05-07T13:00:00Z')
    const cycleA = { ...a, supersedes: b.id }
    const cycleB = { ...b, supersedes: a.id }

    const history = resolveHistory([cycleA, cycleB])
    expect(history.effective).toEqual([])
    expect(history.issues.filter((issue) => issue.problem === 'supersession-cycle')).toHaveLength(2)
  })

  it('records a retraction separately from a replacement', () => {
    const mood = record(
      'observation',
      { occurredAt: at('2026-05-04T18:00:00Z'), domains: [DOMAIN.emotional] },
      {
        concept: conceptId('emotional.current-state'),
        value: { type: 'text', value: 'flat' },
        method: 'self-report',
      },
    )
    const withdrawn = record(
      'correction',
      { occurredAt: at('2026-05-04T18:30:00Z'), domains: [DOMAIN.emotional] },
      { corrects: mood.id, reason: 'wrong day' },
    )

    const history = resolveHistory([mood, withdrawn])
    expect(history.effective).toEqual([withdrawn])
    expect(history.retractedBy.get(mood.id)).toBe(withdrawn.id)
  })
})
