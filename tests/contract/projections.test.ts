import { describe, expect, it } from 'vitest'
import { instant, timeZone, type Instant } from '../../src/domain/time'
import {
  createProjectionCache,
  factsProjection,
  historySummaryProjection,
  type CacheEntry,
} from '../../src/memory/projections'
import { snapshotFromWire, snapshotToWire, type Migration } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { scenarioById, SCENARIOS } from '../../src/synthetic/scenarios'
import type { StoreSnapshot } from '../../src/memory/store'

/**
 * Section 14: derived state must be rebuildable from canonical records, and a
 * corrupted cache must not corrupt lifetime history.
 */

function loadScenario(id: string): {
  snapshot: StoreSnapshot
  now: Instant
  zone: ReturnType<typeof timeZone>
} {
  const scenario = scenarioById(id)
  if (scenario === undefined) throw new Error(`no scenario ${id}`)
  const loaded = snapshotFromWire(scenario.build())
  expect(loaded.loaded).toBe(true)
  return { snapshot: loaded.snapshot, now: scenario.now, zone: scenario.zone }
}

describe('every projection is rebuildable from canonical records', () => {
  it('produces the same answer from a fresh cache as from a warm one', () => {
    for (const scenario of SCENARIOS) {
      const loaded = snapshotFromWire(scenario.build())
      const moment = { now: scenario.now, zone: scenario.zone }

      const cold = buildView(loaded.snapshot, moment)
      const cache = createProjectionCache()
      buildView(loaded.snapshot, moment, cache)
      const warm = buildView(loaded.snapshot, moment, cache)

      expect(cache.stats.hits, scenario.id).toBeGreaterThan(0)
      expect(JSON.stringify(warm.summary), scenario.id).toBe(JSON.stringify(cold.summary))
      expect(JSON.stringify(warm.facts.entries), scenario.id).toBe(
        JSON.stringify(cold.facts.entries),
      )
    }
  })

  it('rebuilds after the cache is thrown away entirely', () => {
    const { snapshot, now, zone } = loadScenario('quiet-fortnight')
    const cache = createProjectionCache()

    const before = buildView(snapshot, { now, zone }, cache)
    cache.clear()
    const after = buildView(snapshot, { now, zone }, cache)

    expect(JSON.stringify(after.summary)).toBe(JSON.stringify(before.summary))
  })

  it('rebuilds when the moment moves rather than serving yesterday', () => {
    const { snapshot, now, zone } = loadScenario('quiet-fortnight')
    const cache = createProjectionCache()

    buildView(snapshot, { now, zone }, cache)
    const later = buildView(snapshot, { now: instant(now + 86_400_000 * 30), zone }, cache)

    expect(cache.stats.discarded).toBeGreaterThan(0)
    expect(later.facts.at).not.toBe(now)
  })
})

describe('a corrupted cache is a non-event', () => {
  it('throws away an entry whose fingerprint does not match', () => {
    const { snapshot, now, zone } = loadScenario('quiet-fortnight')
    const backing = new Map<string, CacheEntry>()

    // Someone — a bad write, a stale persisted entry, a tampered store —
    // leaves nonsense behind under the right key.
    backing.set('history-summary@1', {
      fingerprint: 'not-the-right-fingerprint',
      value: { total: 999_999 },
    })

    const cache = createProjectionCache(backing)
    const view = buildView(snapshot, { now, zone }, cache)

    expect(view.summary.total).toBe(snapshot.records.length)
    expect(cache.stats.discarded).toBeGreaterThan(0)
  })

  it('cannot reach the canonical records at all', () => {
    const { snapshot, now, zone } = loadScenario('quiet-fortnight')
    const before = JSON.stringify(snapshotToWire(snapshot, now))

    const backing = new Map<string, CacheEntry>([
      ['facts@1', { fingerprint: 'wrong', value: null }],
      ['history-summary@1', { fingerprint: 'wrong', value: { total: -1 } }],
      ['relationships@1', { fingerprint: 'wrong', value: 'garbage' }],
    ])

    const cache = createProjectionCache(backing)
    buildView(snapshot, { now, zone }, cache)

    // The projections rebuilt, and lifetime history is byte-identical.
    expect(JSON.stringify(snapshotToWire(snapshot, now))).toBe(before)
  })

  it('can prove a cached value still agrees with a rebuild', () => {
    const { snapshot, now, zone } = loadScenario('subnetting-struggle')
    const cache = createProjectionCache()
    const view = buildView(snapshot, { now, zone }, cache)

    const check = cache.verify(historySummaryProjection, view.input)
    expect(check.wasCached).toBe(true)
    expect(check.agreed).toBe(true)

    const factsCheck = cache.verify(factsProjection, view.input)
    expect(factsCheck.agreed).toBe(true)
  })
})

describe('snapshots survive the document format', () => {
  it('round-trips every scenario through the wire and back', () => {
    for (const scenario of SCENARIOS) {
      const document = scenario.build()
      const first = snapshotFromWire(document)
      const again = snapshotFromWire(snapshotToWire(first.snapshot, scenario.now))

      expect(again.snapshot.records, scenario.id).toEqual(first.snapshot.records)
      expect(again.snapshot.entities, scenario.id).toEqual(first.snapshot.entities)
      expect(again.snapshot.malformed.length, scenario.id).toBe(first.snapshot.malformed.length)
    }
  })

  it('refuses a document written by a newer schema instead of guessing', () => {
    const { snapshot, now } = loadScenario('quiet-fortnight')
    const wire = { ...snapshotToWire(snapshot, now), schemaVersion: 99 }

    const loaded = snapshotFromWire(wire)
    expect(loaded.loaded).toBe(false)
    expect(loaded.snapshot.records).toEqual([])
    expect(loaded.issues[0]?.problem).toContain('newer version')
  })

  it('refuses an older schema it has no migration for', () => {
    const { snapshot, now } = loadScenario('quiet-fortnight')
    const wire = { ...snapshotToWire(snapshot, now), schemaVersion: 0 }

    const loaded = snapshotFromWire(wire)
    expect(loaded.loaded).toBe(false)
    expect(loaded.issues.at(-1)?.problem).toContain('no migration from schema 0')
  })

  it('runs the migrations it does have, in order', () => {
    const { snapshot, now } = loadScenario('quiet-fortnight')
    const wire = { ...snapshotToWire(snapshot, now), schemaVersion: -1 }

    const applied: string[] = []
    const migrations: readonly Migration[] = [
      {
        from: -1,
        to: 0,
        describe: 'first step',
        apply: (document) => {
          applied.push('first')
          return document
        },
      },
      {
        from: 0,
        to: 1,
        describe: 'second step',
        apply: (document) => {
          applied.push('second')
          return document
        },
      },
    ]

    const loaded = snapshotFromWire(wire, migrations)
    expect(loaded.loaded).toBe(true)
    expect(applied).toEqual(['first', 'second'])
    expect(loaded.migrationsApplied).toEqual(['first step', 'second step'])
    expect(loaded.snapshot.records).toHaveLength(snapshot.records.length)
  })

  it('notices a document that is not one of ours', () => {
    const loaded = snapshotFromWire({ records: [], entities: [] })
    expect(loaded.issues.some((issue) => issue.path === 'snapshot.format')).toBe(true)
  })
})
