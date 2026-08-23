import { describe, expect, it } from 'vitest'
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  backupFromJson,
  backupToJson,
  backupToWire,
  countsOf,
  fingerprint,
  type BackupApp,
} from '../../src/memory/backup'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { EMPTY_SNAPSHOT, type StoreSnapshot } from '../../src/memory/store'
import type { CanonicalRecord } from '../../src/domain/records'
import { instant, timeZone } from '../../src/domain/time'
import { SCENARIOS, scenarioById } from '../../src/synthetic/scenarios'

/**
 * A backup that does not come back is not a backup (canonical plan section 29).
 *
 * The claim under test is exact rather than approximate: the history that goes
 * into the file is the history that comes out of it, over **every** scenario in
 * the library rather than over one convenient one. The library is the point —
 * it holds a document with deliberate damage in it, a history nine months long,
 * one written across four timezones and one that is almost entirely silence,
 * and each of those is a different way for a serialiser to quietly lose
 * something.
 */

const APP: BackupApp = {
  commitSha: 'a'.repeat(40),
  commitShort: 'aaaaaaa',
  branch: 'main',
  target: 'preview',
  buildTime: '2026-01-01T00:00:00.000Z',
}

const AT = instant(Date.parse('2026-05-01T12:00:00Z'))

function snapshotFor(id: string): StoreSnapshot {
  const scenario = scenarioById(id)
  if (scenario === undefined) throw new Error(`no scenario "${id}"`)
  const loaded = snapshotFromWire(scenario.build())
  expect(loaded.loaded, `${id} should load`).toBe(true)
  return loaded.snapshot
}

describe('every scenario survives a backup and a restore unchanged', () => {
  for (const scenario of SCENARIOS) {
    it(`round-trips ${scenario.id}`, () => {
      const before = snapshotFor(scenario.id)
      const load = backupFromJson(backupToJson(before, { app: APP, createdAt: AT }))

      expect(load.ok, load.ok ? '' : load.refusal.problem).toBe(true)
      if (!load.ok) return

      expect(load.snapshot.records).toEqual(before.records)
      expect(load.snapshot.entities).toEqual(before.entities)
      expect(load.snapshot.malformed).toEqual(before.malformed)
      expect(load.snapshot.schemaVersion).toBe(before.schemaVersion)
      // And the fingerprint, which is what a restore actually checks.
      expect(fingerprint(load.snapshot)).toBe(fingerprint(before))
    })
  }

  it('round-trips an empty history without claiming it is damaged', () => {
    const load = backupFromJson(backupToJson(EMPTY_SNAPSHOT, { app: APP, createdAt: AT }))
    expect(load.ok).toBe(true)
    if (!load.ok) return
    expect(load.summary.counts).toEqual({ records: 0, entities: 0, malformed: 0 })
    expect(load.summary.firstDay).toBeUndefined()
  })

  it('keeps the rows it could not read, rather than dropping them', () => {
    // A backup that silently omitted the damage would tell the owner his
    // history is cleaner than it is, and lose whatever was in those rows.
    const before = snapshotFor('malformed-history')
    expect(before.malformed.length).toBeGreaterThan(0)

    const load = backupFromJson(backupToJson(before, { app: APP, createdAt: AT }))
    expect(load.ok).toBe(true)
    if (!load.ok) return
    expect(load.snapshot.malformed).toEqual(before.malformed)
    expect(load.summary.counts.malformed).toBe(before.malformed.length)
  })

  it('carries fields this schema version does not recognise', () => {
    // Section 30 — an unknown field must survive, or a restore taken on an
    // older build silently strips what a newer one wrote.
    const wire = {
      format: 'life-command-os/canonical',
      schemaVersion: 1,
      exportedAt: '2026-05-01T12:00:00.000Z',
      records: [
        {
          id: '01JABCDEFGHJKMNPQRSTVWXYZ2',
          schemaVersion: 1,
          kind: 'explicit-fact',
          occurredAt: '2026-04-30T09:00:00.000Z',
          recordedAt: '2026-04-30T09:00:00.000Z',
          zone: 'America/Denver',
          domains: ['health'],
          entities: [],
          privacy: 'normal',
          provenance: { source: 'owner', writtenBy: 'test' },
          concept: 'energy-now',
          value: { type: 'scale', value: 3, of: 5 },
          somethingFromTheFuture: { kept: true },
        },
      ],
      entities: [],
      malformed: [],
    }
    const parsed = snapshotFromWire(wire)
    expect(parsed.loaded).toBe(true)
    expect(parsed.snapshot.records[0]?.unrecognized).toEqual({
      somethingFromTheFuture: { kept: true },
    })

    const load = backupFromJson(backupToJson(parsed.snapshot, { app: APP, createdAt: AT }))
    expect(load.ok).toBe(true)
    if (!load.ok) return
    expect(load.snapshot.records[0]?.unrecognized).toEqual({
      somethingFromTheFuture: { kept: true },
    })
  })
})

describe('the envelope says what a restore needs to know before it writes', () => {
  const snapshot = snapshotFor('what-worked')

  it('names the build that wrote it, and when', () => {
    const load = backupFromJson(backupToJson(snapshot, { app: APP, createdAt: AT }))
    expect(load.ok).toBe(true)
    if (!load.ok) return
    expect(load.summary.app).toEqual(APP)
    expect(load.summary.createdAt).toBe('2026-05-01T12:00:00.000Z')
  })

  it('reports the span of the history and the areas in it', () => {
    const load = backupFromJson(backupToJson(snapshot, { app: APP, createdAt: AT }))
    expect(load.ok).toBe(true)
    if (!load.ok) return
    expect(load.summary.firstDay).toBeDefined()
    expect(load.summary.lastDay).toBeDefined()
    expect(load.summary.firstDay! <= load.summary.lastDay!).toBe(true)
    expect(load.summary.domains.length).toBeGreaterThan(0)
  })

  it('reports whether the private area is in the file', () => {
    // Section 11 — the owner must be able to see whether it is there, and the
    // answer must be a fact about the file rather than an assumption.
    const load = backupFromJson(backupToJson(snapshot, { app: APP, createdAt: AT }))
    expect(load.ok).toBe(true)
    if (!load.ok) return
    expect(load.summary.holdsPrivate).toBe(
      snapshot.records.some((record) => record.privacy === 'private'),
    )
  })

  it('dates the span by each record’s own zone rather than one chosen for it', () => {
    /*
     * A history that crossed a move or a trip has no single zone, and picking
     * one would date rows somewhere the owner has never been. Built here
     * rather than taken from the library, because none of the scenarios
     * currently mixes zones **within** its records — `across-timezones` varies
     * the zone the same history is *read* from, which is a different thing.
     */
    const zoned = {
      ...snapshotFor('quiet-fortnight'),
      records: [
        {
          ...(snapshotFor('quiet-fortnight').records[0] as CanonicalRecord),
          occurredAt: instant(Date.parse('2026-04-01T02:00:00Z')),
          zone: timeZone('Pacific/Auckland'),
        },
        {
          ...(snapshotFor('quiet-fortnight').records[1] as CanonicalRecord),
          occurredAt: instant(Date.parse('2026-04-01T02:00:00Z')),
          zone: timeZone('America/Denver'),
        },
      ],
    }

    const load = backupFromJson(backupToJson(zoned, { app: APP, createdAt: AT }))
    expect(load.ok).toBe(true)
    if (!load.ok) return
    // The same instant, in Auckland and in Denver, is two different days.
    expect(load.summary.firstDay).toBe('2026-03-31')
    expect(load.summary.lastDay).toBe('2026-04-01')
  })

  it('holds the counts and the fingerprint of what it actually contains', () => {
    const wire = backupToWire(snapshot, { app: APP, createdAt: AT })
    expect(wire.format).toBe(BACKUP_FORMAT)
    expect(wire.backupVersion).toBe(BACKUP_VERSION)
    expect(wire.integrity.checksum).toBe(fingerprint(snapshot))
    expect({
      records: wire.integrity.records,
      entities: wire.integrity.entities,
      malformed: wire.integrity.malformed,
    }).toEqual(countsOf(snapshot))
  })
})

describe('the fingerprint is over meaning, not over bytes', () => {
  const snapshot = snapshotFor('corrections')

  it('survives the file being reformatted', () => {
    // A transfer that re-indents JSON, or a text editor that rewrites the
    // newlines, has not damaged the history and must not be refused.
    const json = backupToJson(snapshot, { app: APP, createdAt: AT })
    const reformatted = `${JSON.stringify(JSON.parse(json))}`
    const load = backupFromJson(reformatted)
    expect(load.ok).toBe(true)
  })

  it('survives the keys being reordered', () => {
    const json = backupToJson(snapshot, { app: APP, createdAt: AT })
    const parsed = JSON.parse(json) as Record<string, unknown>
    const reversed = Object.fromEntries(Object.entries(parsed).reverse())
    expect(backupFromJson(JSON.stringify(reversed)).ok).toBe(true)
  })

  it('does not change when the same history is taken twice at different moments', () => {
    const first = backupToWire(snapshot, { app: APP, createdAt: AT })
    const later = backupToWire(snapshot, {
      app: APP,
      createdAt: instant(Date.parse('2026-09-09T09:09:09Z')),
    })
    expect(later.integrity.checksum).toBe(first.integrity.checksum)
    expect(later.createdAt).not.toBe(first.createdAt)
  })
})
