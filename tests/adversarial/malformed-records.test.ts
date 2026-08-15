import { describe, expect, it } from 'vitest'
import { createRecordFactory, SYNTHETIC_PROVENANCE } from '../../src/domain/build'
import { DOMAIN } from '../../src/domain/domains'
import { sequentialRecordIds } from '../../src/domain/ids'
import { instant, timeZone, type Instant } from '../../src/domain/time'
import { parseRecords, recordToWire } from '../../src/domain/wire'
import { conceptId } from '../../src/domain/windows'

/**
 * Section 36: one unreadable record cannot blank a surface.
 *
 * The guarantee starts here, at the parser. Every bad shape below has to come
 * back as an inspectable row sitting beside the rows that parsed — never as a
 * thrown error, and never as a quietly dropped line.
 */

const ZONE = timeZone('America/Denver')
const nextId = sequentialRecordIds('BAD')
const record = createRecordFactory({ zone: ZONE, provenance: SYNTHETIC_PROVENANCE, nextId })

function at(iso: string): Instant {
  return instant(Date.parse(iso))
}

const T = at('2026-03-10T02:30:00Z')

function goodRecord() {
  return recordToWire(
    record(
      'observation',
      { occurredAt: T, domains: [DOMAIN.sleep] },
      {
        concept: conceptId('sleep.hours-last-night'),
        value: { type: 'number', value: 6 },
        method: 'self-report',
      },
    ),
  )
}

const badRows: readonly { readonly name: string; readonly row: unknown }[] = [
  { name: 'not an object', row: 'just a string' },
  { name: 'null', row: null },
  { name: 'an array', row: [1, 2, 3] },
  { name: 'empty', row: {} },
  { name: 'no id', row: { ...goodRecord(), id: undefined } },
  { name: 'an id of the wrong shape', row: { ...goodRecord(), id: 'nope' } },
  { name: 'an unknown kind', row: { ...goodRecord(), kind: 'telepathy' } },
  { name: 'an unparseable instant', row: { ...goodRecord(), occurredAt: 'last tuesday' } },
  { name: 'an unknown timezone', row: { ...goodRecord(), zone: 'Mars/Olympus' } },
  { name: 'an unknown privacy class', row: { ...goodRecord(), privacy: 'top-secret' } },
  { name: 'provenance that is a string', row: { ...goodRecord(), provenance: 'me' } },
  { name: 'a missing payload field', row: { ...goodRecord(), method: undefined } },
  { name: 'a payload field of the wrong type', row: { ...goodRecord(), concept: 42 } },
  {
    name: 'a fact value with no type',
    row: { ...goodRecord(), value: { value: 6 } },
  },
  {
    name: 'a fact value carrying an undeclared field',
    row: { ...goodRecord(), value: { type: 'number', value: 6, smuggled: true } },
  },
  {
    name: 'an entity reference with a bad id',
    row: { ...goodRecord(), entities: [{ id: 'Not An Id', kind: 'person' }] },
  },
  {
    name: 'an entity reference with an unknown kind',
    row: { ...goodRecord(), entities: [{ id: 'person:adaya', kind: 'unicorn' }] },
  },
  { name: 'a supersedes pointer that is a number', row: { ...goodRecord(), supersedes: 7 } },
]

describe('a malformed record is inspectable, not fatal', () => {
  it('never throws, whatever arrives', () => {
    for (const { name, row } of badRows) {
      expect(() => parseRecords([row]), name).not.toThrow()
    }
  })

  it('reports every bad shape as a malformed row with a reason', () => {
    for (const { name, row } of badRows) {
      const parsed = parseRecords([row])
      expect(parsed.records, `${name} should not have parsed`).toEqual([])
      expect(parsed.malformed, `${name} should be reported`).toHaveLength(1)
      expect(parsed.malformed[0]?.issues.length, `${name} needs a reason`).toBeGreaterThan(0)
      for (const issue of parsed.malformed[0]?.issues ?? []) {
        expect(issue.path, `${name} needs a path`).not.toBe('')
        expect(issue.problem, `${name} needs a problem`).not.toBe('')
      }
    }
  })

  it('keeps exactly what arrived, so a person can look at it', () => {
    const row: Record<string, unknown> = { ...goodRecord(), occurredAt: 'last tuesday' }
    const parsed = parseRecords([row])
    expect(parsed.malformed[0]?.raw).toEqual(row)
    expect(parsed.malformed[0]?.index).toBe(0)
    expect(parsed.malformed[0]?.id).toBe(row['id'])
  })

  it('lets the good rows through when one row is broken', () => {
    const rows = [goodRecord(), 'garbage', goodRecord(), { half: 'a record' }, goodRecord()]
    const parsed = parseRecords(rows)

    expect(parsed.records).toHaveLength(3)
    expect(parsed.malformed).toHaveLength(2)
    // The positions are the positions in the file, not in the surviving list.
    expect(parsed.malformed.map((row) => row.index)).toEqual([1, 3])
  })

  it('treats a file that is not a list as one malformed row, not a crash', () => {
    const parsed = parseRecords({ records: 'somewhere else' })
    expect(parsed.records).toEqual([])
    expect(parsed.malformed).toHaveLength(1)
    expect(parsed.malformed[0]?.issues[0]?.problem).toBe('expected an array')
  })

  it('collects several problems from one row instead of stopping at the first', () => {
    const parsed = parseRecords([{ ...goodRecord(), zone: 'Mars/Olympus', privacy: 'top-secret' }])
    expect(parsed.malformed[0]?.issues.length).toBeGreaterThanOrEqual(2)
  })

  it('does not let a bad row take a good one with it, even in a long history', () => {
    const rows: unknown[] = []
    for (let index = 0; index < 200; index += 1) {
      rows.push(index % 17 === 0 ? { broken: index } : goodRecord())
    }
    const parsed = parseRecords(rows)
    expect(parsed.records.length + parsed.malformed.length).toBe(200)
    expect(parsed.malformed).toHaveLength(12)
  })
})
