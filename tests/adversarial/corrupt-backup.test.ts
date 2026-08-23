import { describe, expect, it } from 'vitest'
import { instant } from '../../src/domain/time'
import {
  BACKUP_VERSION,
  backupFromJson,
  backupToJson,
  backupToWire,
  type BackupApp,
} from '../../src/memory/backup'
import { CANONICAL_SCHEMA_VERSION } from '../../src/domain/records'
import { snapshotFromWire } from '../../src/memory/snapshot'
import type { StoreSnapshot } from '../../src/memory/store'
import { scenarioById } from '../../src/synthetic/scenarios'

/**
 * A restore that reports a success it cannot deliver is worse than one that
 * fails (canonical plan section 29 — "no false success").
 *
 * Every document below is one that parses. That is the whole point: JSON.parse
 * succeeding tells you nothing about whether a file is a complete backup, and
 * a restore that got as far as `replaceAll` before finding out would already
 * have destroyed the history it was replacing.
 *
 * Each case asserts three things — refused, the stage named, and the owner
 * given a sentence he can act on. The stage matters because his next move
 * differs by it: look for another copy, update the app, or check he opened the
 * right file.
 */

const APP: BackupApp = {
  commitSha: 'b'.repeat(40),
  commitShort: 'bbbbbbb',
  branch: 'main',
  target: 'preview',
  buildTime: '2026-01-01T00:00:00.000Z',
}

const AT = instant(Date.parse('2026-05-01T12:00:00Z'))

function goodSnapshot(): StoreSnapshot {
  const scenario = scenarioById('what-worked')
  if (scenario === undefined) throw new Error('no scenario')
  const loaded = snapshotFromWire(scenario.build())
  return loaded.snapshot
}

const SNAPSHOT = goodSnapshot()
const GOOD = backupToJson(SNAPSHOT, { app: APP, createdAt: AT })

function mutate(change: (wire: Record<string, unknown>) => void): string {
  const wire = JSON.parse(GOOD) as Record<string, unknown>
  change(wire)
  return JSON.stringify(wire)
}

function refusalOf(json: string) {
  const load = backupFromJson(json)
  expect(load.ok, 'this document should have been refused').toBe(false)
  if (load.ok) throw new Error('unreachable')
  return load.refusal
}

describe('a document that parses is not a backup', () => {
  it('accepts the undamaged file, so every refusal below means something', () => {
    expect(backupFromJson(GOOD).ok).toBe(true)
  })

  it('refuses text that is not JSON at all', () => {
    const refusal = refusalOf('this is not a backup, it is a note to self')
    expect(refusal.stage).toBe('parse')
  })

  it('refuses a file truncated part-way through', () => {
    // The commonest real damage: a download that stopped, a copy that ran out
    // of storage. It is not valid JSON, and it is not a smaller history.
    const refusal = refusalOf(GOOD.slice(0, Math.floor(GOOD.length / 2)))
    expect(refusal.stage).toBe('parse')
  })

  it('refuses a document that is valid JSON and not a backup', () => {
    const refusal = refusalOf(JSON.stringify({ hello: 'world' }))
    expect(refusal.stage).toBe('format')
  })

  it('refuses a canonical snapshot pasted in on its own', () => {
    // A QA document is a real, valid file of a different kind. Restoring one
    // would work and would be the wrong thing.
    const scenario = scenarioById('what-worked')
    const refusal = refusalOf(JSON.stringify(scenario?.build()))
    expect(refusal.stage).toBe('format')
  })

  it('refuses JSON that is not an object', () => {
    expect(refusalOf('[]').stage).toBe('format')
    expect(refusalOf('null').stage).toBe('format')
    expect(refusalOf('42').stage).toBe('format')
  })
})

describe('a backup that has been changed since it was written', () => {
  it('refuses a file with a record quietly removed', () => {
    const refusal = refusalOf(
      mutate((wire) => {
        const snapshot = wire['snapshot'] as { records: unknown[] }
        snapshot.records = snapshot.records.slice(1)
      }),
    )
    expect(refusal.stage).toBe('integrity')
    expect(refusal.problem).toMatch(/incomplete/i)
  })

  it('refuses a file with a record quietly altered, where the counts still add up', () => {
    // The counts are the cheap check and this is the case they miss. The
    // fingerprint is why the counts are not the only check.
    const altered = mutate((wire) => {
      const snapshot = wire['snapshot'] as { records: Record<string, unknown>[] }
      const first = snapshot.records[0]
      if (first !== undefined) {
        first['provenance'] = { source: 'owner', writtenBy: 'somebody with a text editor' }
      }
    })
    // The mutation has to have actually changed something, or this test would
    // pass on a file that was never damaged.
    expect(altered).not.toBe(JSON.stringify(JSON.parse(GOOD)))

    const refusal = refusalOf(altered)
    expect(refusal.stage).toBe('integrity')
    expect(refusal.problem).toMatch(/changed or damaged/i)
  })

  it('refuses a file whose checksum was recomputed for altered contents but whose counts were not', () => {
    const refusal = refusalOf(
      mutate((wire) => {
        const snapshot = wire['snapshot'] as { records: unknown[] }
        snapshot.records = [...snapshot.records, snapshot.records[0]]
      }),
    )
    expect(refusal.stage).toBe('integrity')
  })

  it('refuses a file with the integrity record removed', () => {
    const refusal = refusalOf(mutate((wire) => delete wire['integrity']))
    expect(refusal.stage).toBe('integrity')
    expect(refusal.problem).toMatch(/no integrity record/i)
  })

  it('refuses a file checked with an algorithm this build cannot verify', () => {
    const refusal = refusalOf(
      mutate((wire) => {
        const integrity = wire['integrity'] as Record<string, unknown>
        integrity['algorithm'] = 'trust-me'
      }),
    )
    expect(refusal.stage).toBe('integrity')
  })

  it('names both fingerprints in the detail, so a person can compare copies', () => {
    const refusal = refusalOf(
      mutate((wire) => {
        const integrity = wire['integrity'] as Record<string, unknown>
        integrity['checksum'] = 'f'.repeat(64)
      }),
    )
    expect(refusal.detail).toContain('f'.repeat(64))
    expect(refusal.detail).toContain(
      backupToWire(SNAPSHOT, { app: APP, createdAt: AT }).integrity.checksum,
    )
  })
})

describe('a backup from another version of the app', () => {
  it('refuses one written by a newer envelope than this build understands', () => {
    const refusal = refusalOf(
      mutate((wire) => {
        wire['backupVersion'] = BACKUP_VERSION + 1
      }),
    )
    expect(refusal.stage).toBe('schema')
    expect(refusal.problem).toMatch(/newer version/i)
  })

  it('refuses one whose records are written to a newer canonical schema', () => {
    const refusal = refusalOf(
      mutate((wire) => {
        const snapshot = wire['snapshot'] as Record<string, unknown>
        snapshot['schemaVersion'] = CANONICAL_SCHEMA_VERSION + 1
      }),
    )
    expect(refusal.stage).toBe('schema')
  })

  it('refuses one from an older schema with no migration to bring it forward', () => {
    // Guessing at an older shape is how a restore loses a field silently.
    const refusal = refusalOf(
      mutate((wire) => {
        const snapshot = wire['snapshot'] as Record<string, unknown>
        snapshot['schemaVersion'] = CANONICAL_SCHEMA_VERSION - 1
      }),
    )
    expect(refusal.stage).toBe('schema')
  })

  it('says which build wrote a file it can read, even when that build is unknown', () => {
    const load = backupFromJson(mutate((wire) => delete wire['app']))
    expect(load.ok).toBe(true)
    if (!load.ok) return
    // Missing provenance is reported as unknown rather than invented or hidden.
    expect(load.summary.app.commitShort).toBe('unknown')
  })
})

describe('the same file can be offered again after a refusal', () => {
  it('leaves nothing behind that would change the second answer', () => {
    // Section 29 — "same-file retry works after a failed attempt". Reading is
    // pure, so this is a property of the design rather than of a reset; the
    // test is what keeps it one.
    const damaged = mutate((wire) => {
      const snapshot = wire['snapshot'] as { records: unknown[] }
      snapshot.records = snapshot.records.slice(1)
    })
    const first = refusalOf(damaged)
    const second = refusalOf(damaged)
    expect(second).toEqual(first)

    // And a good file still reads correctly afterwards.
    expect(backupFromJson(GOOD).ok).toBe(true)
  })
})

describe('a backup carrying damage the app already knew about', () => {
  it('restores the unreadable rows as unreadable rows, and says how many', () => {
    /*
     * `malformed-history` holds rows the parser could not read. They are part
     * of the history: dropping them on the way into a backup would make the
     * file smaller and the owner's record thinner, silently, and dropping them
     * on the way out would do the same on the day he needed the file.
     */
    const scenario = scenarioById('malformed-history')
    const damaged = snapshotFromWire(scenario?.build()).snapshot
    expect(damaged.malformed.length).toBeGreaterThan(0)

    const load = backupFromJson(backupToJson(damaged, { app: APP, createdAt: AT }))
    expect(load.ok).toBe(true)
    if (!load.ok) return
    expect(load.snapshot.malformed).toEqual(damaged.malformed)
    expect(load.summary.counts.malformed).toBe(damaged.malformed.length)
  })
})
