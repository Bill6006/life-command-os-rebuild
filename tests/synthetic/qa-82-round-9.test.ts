import { describe, expect, it } from 'vitest'
import { coreDomains } from '../../src/domain/domains'
import { recordToWire } from '../../src/domain/wire'
import { composeExport } from '../../src/features/export/compose'
import { GROUP_ORDER, standingFor } from '../../src/features/life/standing'
import {
  DEFAULT_SELECTION,
  SELECT_ALL,
  type ExportSectionId,
} from '../../src/features/export/sections'
import { assembleTimeline } from '../../src/features/timeline/timelineEntries'
import { decide } from '../../src/intelligence/engine'
import { insightsFor } from '../../src/intelligence/insights'
import {
  assembleSituation,
  type DomainCoverage,
  type Situation,
} from '../../src/intelligence/situation'
import { snapshotFromWire, type SnapshotWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { scenarioById } from '../../src/synthetic/scenarios'
import { COMPOSED_AT, COMPOSED_ZONE, TEST_APP } from './exportHarness'

/**
 * Phase 82, round 9 — the same sentence, on the rest of its consumers.
 *
 * Round 8 gave `DomainCoverage` a `later` count and taught its `summary` to say
 * *at this point* instead of *ever*. Two other things say the same thing about
 * the same projection and neither was changed:
 *
 * - **QA-82-011, reopened.** `coverageSection` builds one bullet as
 *   `label — status, evidence strength; HEARD. SUMMARY`, and derives `HEARD`
 *   from `daysSinceHeard === undefined` alone. So the repaired summary was
 *   appended to an unrepaired prefix and the rendered line read *"nothing heard
 *   at all. Nothing has come in about sleep & recovery at this point. 4 entries
 *   here are later than it."* — the two halves of one sentence contradicting
 *   each other, which is worse than the absolute was on its own.
 * - **QA-82-013.** Life's `standingFor` mapped every `unheard` area to one
 *   standing without reading `later`, so *"You have not mentioned these"* was
 *   said over an area the owner had mentioned four times, on a clock he had
 *   moved behind his own records.
 *
 * ## Why the round 8 guards did not see either
 *
 * They asserted `entry.summary` — the half that was repaired — and the
 * whole-document check rejected only `ever come in`, so the older absolute in
 * the same bullet passed straight through. And `life-pages.test.ts` builds
 * every coverage value with `later: 0`, so Life's `unheard` branch had never
 * been rendered with a later record at all.
 *
 * So these assert the **rendered bullet** and the **rendered note**, not the
 * field each was built from.
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
const CONTEXT = { now: base.now, zone: base.zone, weekStartsOn: 1 as const, domains: coreDomains }

function situationOf(wire: SnapshotWire): Situation {
  return assembleSituation(buildView(parse(wire), CONTEXT), CONTEXT)
}

function composeText(
  wire: SnapshotWire,
  sections: readonly ExportSectionId[] = SELECT_ALL,
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

/** Every readable record dated after the moment, so areas go `unheard` with `later`. */
const ONLY_LATER: SnapshotWire = {
  ...original,
  entities: [],
  records: publicRows.map((row) => ({
    ...(row as Record<string, unknown>),
    occurredAt: '2030-01-01T00:00:00Z',
    recordedAt: '2030-01-01T00:00:00Z',
  })),
}

const NOTHING_AT_ALL: SnapshotWire = { ...original, entities: [], records: [] }

function withLater(wire: SnapshotWire): readonly DomainCoverage[] {
  return situationOf(wire).coverage.domains.filter((entry) => entry.later > 0)
}

describe('QA-82-011 — the whole Coverage bullet agrees with itself', () => {
  it('reaches areas that are unheard only because their records are later', () => {
    const areas = withLater(ONLY_LATER)
    expect(areas.length, 'the constructed history should reach some area').toBeGreaterThan(0)
    for (const entry of areas) {
      expect(entry.status).toBe('unheard')
      expect(
        entry.daysSinceHeard,
        'the field the prefix was built from cannot tell them apart',
      ).toBeUndefined()
    }
  })

  for (const [how, sections] of [
    ['Select all', SELECT_ALL],
    ['the default selection', DEFAULT_SELECTION],
    ['a deliberate private opt-in', [...SELECT_ALL, 'private'] as const],
  ] as const) {
    it(`says nothing absolute anywhere on that bullet with ${how}`, () => {
      /*
       * The whole rendered line, not the field it was built from. This is what
       * the round 8 guards read past: they checked `entry.summary` and the
       * document for `ever come in`, and the older absolute sat in the prefix.
       */
      const covered = section(composeText(ONLY_LATER, sections), 'How well each area is understood')
      expect(covered).not.toBe('')
      for (const entry of withLater(ONLY_LATER)) {
        const line = covered.split(NEWLINE).find((row) => row.includes(entry.label))
        expect(line, `${entry.label} is missing from the coverage list`).toBeTruthy()
        expect(line, `${entry.label} still says nothing was heard at all`).not.toMatch(
          /nothing heard at all/i,
        )
        expect(line, `${entry.label} still says ever`).not.toMatch(/ever come in/i)
        // And it still carries both halves of the truth.
        expect(line).toMatch(/nothing heard yet/i)
        expect(line).toMatch(/later than it/)
      }
    })
  }

  it('keeps the absolute where nothing has ever arrived', () => {
    // The half an over-broad fix would break: an area with no record at any
    // moment must keep the sentence that tells him the app is not hiding a gap.
    const covered = section(composeText(NOTHING_AT_ALL), 'How well each area is understood')
    expect(covered).toMatch(/nothing heard at all/i)
    expect(covered).toMatch(/Nothing has ever come in about/)
    expect(covered).not.toMatch(/nothing heard yet/i)
  })

  it('leaves an area that has actually been heard from alone', () => {
    const covered = section(
      composeText({ ...original, records: publicRows }),
      'How well each area is understood',
    )
    expect(covered).toMatch(/last heard \d+ days? ago/)
    expect(covered).not.toMatch(/nothing heard yet/i)
  })
})

describe('QA-82-013 — Life does not tell him he never mentioned something he did', () => {
  it('keeps the group word, which is a claim about the moment', () => {
    /*
     * "Nothing here yet" is moment-scoped and true of both kinds of area, so
     * the two stay in one group. What had to change is the note, which was not.
     */
    for (const entry of withLater(ONLY_LATER)) {
      expect(standingFor(entry).word).toBe('Nothing here yet')
    }
    expect(GROUP_ORDER).toContain('Nothing here yet')
  })

  it('says nothing about never having mentioned them', () => {
    const areas = withLater(ONLY_LATER)
    expect(areas.length).toBeGreaterThan(0)
    for (const entry of areas) {
      const standing = standingFor(entry)
      expect(standing.note, `${entry.label}`).not.toMatch(/have not mentioned/i)
      expect(standing.note, `${entry.label}`).not.toMatch(/never/i)
    }
  })

  it('gives those areas a line of their own that says why', () => {
    for (const entry of withLater(ONLY_LATER)) {
      const detail = standingFor(entry).detail?.(entry)
      expect(detail, `${entry.label} has nothing to say for itself`).toBeTruthy()
      expect(detail).toMatch(/later than the moment on screen/)
      expect(detail).toMatch(new RegExp(`^${entry.later} entr`))
    }
  })

  it('leaves a genuinely untouched area with no line, and the compact list intact', () => {
    /*
     * The cost the repair must not pay. A group grows the per-area layout as
     * soon as any of its areas has a detail, and on an ordinary history at an
     * ordinary clock nothing is later — so the seven-area list stays one line.
     */
    const untouched = situationOf(NOTHING_AT_ALL).coverage.domains.filter(
      (entry) => entry.status === 'unheard' && entry.later === 0,
    )
    expect(untouched.length).toBeGreaterThan(0)
    for (const entry of untouched) {
      const standing = standingFor(entry)
      expect(standing.word).toBe('Nothing here yet')
      expect(
        standing.detail?.(entry),
        `${entry.label} grew a line it does not need`,
      ).toBeUndefined()
    }
  })

  it('says the same note for every area in the group, whichever kind it is', () => {
    /*
     * The screen takes one note per group, from whichever area reached it
     * first. Two different notes in one group would make the page depend on
     * registry order, which is the kind of thing that reads as a flicker rather
     * than as a defect.
     */
    const mixed = [
      ...withLater(ONLY_LATER),
      ...situationOf(NOTHING_AT_ALL).coverage.domains.filter(
        (entry) => entry.status === 'unheard' && entry.later === 0,
      ),
    ]
    const notes = new Set(mixed.map((entry) => standingFor(entry).note))
    expect(notes.size, 'one group, one note').toBe(1)
    expect([...notes][0]).toMatch(/at the moment on screen/)
  })

  it('moves them out of the group once the moment catches up', () => {
    // The whole point of the distinction: these are not permanently empty.
    const after = situationOf({ ...original, records: publicRows }).coverage.domains
    for (const entry of after) {
      expect(entry.later).toBe(0)
    }
    expect(after.some((entry) => entry.status !== 'unheard')).toBe(true)
  })
})
