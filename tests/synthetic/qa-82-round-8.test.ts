import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { coreDomains } from '../../src/domain/domains'
import { recordToWire } from '../../src/domain/wire'
import { composeExport } from '../../src/features/export/compose'
import {
  DEFAULT_SELECTION,
  SELECT_ALL,
  type ExportSectionId,
} from '../../src/features/export/sections'
import { assembleTimeline, type TimelineData } from '../../src/features/timeline/timelineEntries'
import { decide } from '../../src/intelligence/engine'
import { insightsFor } from '../../src/intelligence/insights'
import { assembleSituation, type Situation } from '../../src/intelligence/situation'
import { snapshotFromWire, type SnapshotWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { scenarioById } from '../../src/synthetic/scenarios'
import { COMPOSED_AT, COMPOSED_ZONE, TEST_APP } from './exportHarness'

/**
 * Phase 82, round 8 — three ways one silence was still being over-read.
 *
 * Round 7 stopped an empty display being read as an empty store. Round 8 walked
 * the same reproduction and the empty paths D-152 named, and found the class
 * three more times — once in the repair itself.
 *
 * - **QA-82-010.** The new later-history sentence said *"nothing has been lost
 *   and nothing is unreadable"*, unconditionally, and on the fixture it was
 *   written for it sat directly above six rows whose reason is *"could not be
 *   read"*. Reassuring the owner about entries that are merely ahead of him is
 *   right; doing it in words that deny the panel underneath is the same defect
 *   pointing the other way.
 * - **QA-82-011.** With the clock a week back from a fixture's own dates,
 *   Coverage said *"Nothing has ever come in about sleep & recovery"* in a
 *   document that also reported five later entries and named their 5–8 April
 *   span. Excluding future records from evidence is right; **ever** is a claim
 *   about the whole record made from a reading of one moment.
 * - **QA-82-012.** Two records in a replacement cycle parse perfectly and are
 *   held back from reasoning. Timeline listed both; Recent record's fault block
 *   walked only `unreadable`, so the ordinary document said nothing at all and
 *   Diagnostics — off by default — was the only place they appeared.
 *
 * ## What these assert, and why they are shaped this way
 *
 * QA's sharpest observation about the round 7 tests is that they proved future
 * count, damaged count and coordinates as **separate facts** and never read the
 * combined sentence. So these read whole section bodies and compare the words
 * against the other words in the same document, rather than checking that some
 * container is non-empty.
 */

const NEWLINE = String.fromCharCode(10)

function fixture(id: string) {
  const found = scenarioById(id)
  if (found === undefined) throw new Error(`no scenario "${id}"`)
  return found
}

function parse(wire: SnapshotWire) {
  const loaded = snapshotFromWire(wire)
  expect(loaded.loaded, 'the constructed document should load').toBe(true)
  if (!loaded.loaded) throw new Error('unreachable')
  return loaded.snapshot
}

const base = fixture('quiet-fortnight')
const original = base.build()
const MOMENT = { now: base.now, zone: base.zone, weekStartsOn: 1 as const }
const CONTEXT = { ...MOMENT, domains: coreDomains }

function situationOf(wire: SnapshotWire): Situation {
  return assembleSituation(buildView(parse(wire), CONTEXT), CONTEXT)
}

function timelineOf(wire: SnapshotWire): TimelineData {
  return assembleTimeline(situationOf(wire))
}

function composeText(
  wire: SnapshotWire,
  sections: readonly ExportSectionId[] = DEFAULT_SELECTION,
): string {
  const built = buildView(parse(wire), CONTEXT)
  const situation = assembleSituation(built, CONTEXT)
  return composeExport({
    sections,
    situation,
    decision: decide(built, CONTEXT),
    insights: insightsFor(situation),
    timeline: assembleTimeline(situation),
    source: 'laboratory',
    app: TEST_APP,
    composedAt: { at: COMPOSED_AT, zone: COMPOSED_ZONE },
  }).text
}

/** One section's whole body, so a claim cannot be satisfied from elsewhere. */
function section(text: string, heading: string): string {
  const start = text.indexOf(`## ${heading}`)
  if (start === -1) return ''
  const rest = text.slice(start)
  const end = rest.indexOf(`${NEWLINE}## `, 1)
  return end === -1 ? rest : rest.slice(0, end)
}

const publicRows = parse(original)
  .records.filter((record) => record.privacy !== 'private')
  .map(recordToWire)

/** Two readable records that each claim to replace the other. */
const CYCLE: SnapshotWire = (() => {
  const [first, second] = publicRows.slice(0, 2) as [
    Record<string, unknown>,
    Record<string, unknown>,
  ]
  return {
    ...original,
    entities: [],
    records: [
      { ...first, supersedes: second['id'] },
      { ...second, supersedes: first['id'] },
    ],
  }
})()

/** Readable records that all sit after the moment, plus damaged rows. */
const LATER_WITH_DAMAGE: SnapshotWire = {
  ...original,
  entities: [],
  records: [
    ...publicRows.map((row) => ({
      ...(row as Record<string, unknown>),
      occurredAt: '2030-01-01T00:00:00Z',
      recordedAt: '2030-01-01T00:00:00Z',
    })),
    { id: 'broken-public-record', value: 42 },
  ],
}

describe('QA-82-012 — a row read perfectly and held back is still a fault', () => {
  it('reaches the timeline as a tangle rather than as an unreadable row', () => {
    const data = timelineOf(CYCLE)
    expect(data.total, 'both records are held back from reasoning').toBe(0)
    expect(data.later).toBe(0)
    expect(data.unreadable, 'nothing failed to parse').toEqual([])
    expect(data.tangled.length).toBe(2)
    expect(data.tangled[0]!.problem).toMatch(/replace the other/)
  })

  for (const [how, sections] of [
    ['the default selection', DEFAULT_SELECTION],
    ['Select all', SELECT_ALL],
    ['a deliberate private opt-in', [...SELECT_ALL, 'private'] as const],
  ] as const) {
    it(`reports both of them in Recent record with ${how}`, () => {
      const body = section(composeText(CYCLE, sections), 'Recent record')
      expect(body).not.toBe('')
      expect(body, 'the fault itself').toMatch(/replace the other/)
      expect(body, 'and what kind of trouble it is').toMatch(/problem/i)
      // Two records in the cycle, so two lines, not one summarised away.
      expect(body.split(NEWLINE).filter((line) => /replace the other/.test(line))).toHaveLength(2)
    })
  }

  it('is not satisfied by Diagnostics, which the default document does not carry', () => {
    expect(DEFAULT_SELECTION).not.toContain('diagnostics')
    const text = composeText(CYCLE, DEFAULT_SELECTION)
    expect(text, 'no Diagnostics section at all').not.toContain('## Diagnostics')
    expect(section(text, 'Recent record')).toMatch(/replace the other/)
  })

  it('invents no date and no entry for them', () => {
    /*
     * The half QA named as not being asked for: a tangled row is not history
     * that happened, and dressing it as one would be worse than omitting it.
     */
    const body = section(composeText(CYCLE), 'Recent record')
    expect(body).toContain('There are no entries to show here.')
    expect(body, 'no day heading').not.toMatch(/\*\*.+\*\* \(\d{4}-\d{2}-\d{2}\)/)
    expect(body, 'no entry count').not.toMatch(/The most recent \d+ entr/)
  })

  it('says nothing about it in a history that has no tangle', () => {
    // The over-broad direction: a clean history must not grow a fault section.
    const body = section(composeText({ ...original, records: publicRows }), 'Recent record')
    expect(body).not.toMatch(/replace the other/)
    expect(body).not.toMatch(/could not resolve/i)
  })
})

describe('QA-82-010 — the later-history sentence claims nothing about the rows below it', () => {
  it('does not deny a fault it is rendered above', () => {
    /*
     * The screen's own words, read together rather than as separate facts —
     * which is exactly what the round 7 guards did not do. The source is read
     * because this sentence is JSX and its two halves are chosen apart.
     */
    const screen = readFileSync('src/features/timeline/TimelineScreen.tsx', 'utf8')
    expect(screen, 'an absolute claim about readability').not.toMatch(
      /nothing is\s*\n?\s*unreadable/,
    )
    expect(screen, 'the reassurance itself should survive').toMatch(/None of it has been lost/)
  })

  it('still has both facts to say', () => {
    const data = timelineOf(LATER_WITH_DAMAGE)
    expect(data.total, 'nothing at or before the moment').toBe(0)
    expect(data.later, 'and history waiting ahead of it').toBeGreaterThan(0)
    expect(data.unreadable.length, 'and a real fault below').toBeGreaterThan(0)
  })

  it('says both in the document too, without either denying the other', () => {
    const body = section(composeText(LATER_WITH_DAMAGE), 'Recent record')
    expect(body).toMatch(/happened at or before the moment it describes/)
    expect(body).toMatch(/later than that/)
    expect(body).toContain('- A record — could not be read')
    expect(body, 'no absolute claim about the store').not.toMatch(/nothing is unreadable/i)
  })
})

describe('QA-82-011 — Coverage does not call later history history that never came', () => {
  it('counts what is later without letting it become current evidence', () => {
    const coverage = situationOf(LATER_WITH_DAMAGE).coverage
    const withLater = coverage.domains.filter((entry) => entry.later > 0)
    expect(withLater.length, 'the constructed history should reach some area').toBeGreaterThan(0)
    for (const entry of withLater) {
      // The correct rule, preserved: future data is not evidence about now.
      expect(
        entry.lastEvidenceAt,
        `${entry.domain} treated a later record as current`,
      ).toBeUndefined()
      expect(entry.summary, `${entry.domain} said "ever"`).not.toMatch(/ever come in/)
      expect(entry.summary).toMatch(/at this point/)
      expect(entry.summary).toMatch(/later than it/)
    }
  })

  it('still says "ever" when nothing has ever come in', () => {
    /*
     * The half an over-broad fix would break. A history that genuinely holds
     * nothing in an area must keep the absolute, because there it is true and
     * it is the sentence that tells him the app is not hiding a gap.
     */
    const coverage = situationOf({ ...original, entities: [], records: [] }).coverage
    const silent = coverage.domains.filter(
      (entry) => entry.later === 0 && entry.status === 'unheard',
    )
    expect(silent.length).toBeGreaterThan(0)
    for (const entry of silent) {
      expect(entry.summary).toMatch(/Nothing has ever come in about/)
    }
  })

  it('does not contradict the record span in the same document', () => {
    /*
     * The cross-line comparison QA said no test made. One document, two
     * sentences: the header names a span of entries, and Coverage may not then
     * say nothing ever came in about the areas those entries are in.
     */
    const text = composeText(LATER_WITH_DAMAGE, SELECT_ALL)
    const covered = section(text, 'How well each area is understood')
    expect(covered).not.toBe('')
    const areasWithLater = situationOf(LATER_WITH_DAMAGE)
      .coverage.domains.filter((entry) => entry.later > 0)
      .map((entry) => entry.label)
    expect(areasWithLater.length).toBeGreaterThan(0)
    for (const label of areasWithLater) {
      const line = covered.split(NEWLINE).find((row) => row.includes(label))
      expect(line, `${label} is missing from the coverage list`).toBeTruthy()
      expect(line, `${label} said nothing ever came in`).not.toMatch(/ever come in/)
    }
  })

  it('leaves an area with current evidence alone', () => {
    // Nothing about the ordinary path changes: an area that has been heard from
    // still reads as it did.
    const coverage = situationOf({ ...original, records: publicRows }).coverage
    const heard = coverage.domains.filter((entry) => entry.lastEvidenceAt !== undefined)
    expect(heard.length).toBeGreaterThan(0)
    for (const entry of heard) {
      expect(entry.later).toBe(0)
      expect(entry.summary).not.toMatch(/at this point/)
    }
  })
})
