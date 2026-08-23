import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SELECT_ALL, type ExportSectionId } from '../../src/features/export/sections'
import type { HistorySource } from '../../src/features/memory/projection'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { coreDomains } from '../../src/domain/domains'
import { instant, timeZone } from '../../src/domain/time'
import { decide } from '../../src/intelligence/engine'
import { insightsFor } from '../../src/intelligence/insights'
import { assembleSituation } from '../../src/intelligence/situation'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { assembleTimeline } from '../../src/features/timeline/timelineEntries'
import { composeExport } from '../../src/features/export/compose'
import { composeFor, contextFor, TEST_APP } from './exportHarness'

/**
 * D-091, applied to a document rather than to a screen.
 *
 * Everything the app has learned to state carefully on screen is stated again
 * here, to a reader who cannot see the evidence underneath it and who will
 * reason confidently from whatever it is handed. That makes the export the
 * easiest place in the app to lose the whole invariant set at once — a
 * summary is exactly the kind of writing that rounds "four of six comparable
 * evenings" up to "usually".
 *
 * So the same rules bite here:
 *
 * - a figure never appears without the quantity it counts (section 51);
 * - an abstention is written down rather than left out (D-091 invariant 2);
 * - association is never worded as cause (D-089, D-066);
 * - the document says whose history it is (D-091 invariant 8);
 * - and the composer cannot reach anything that decides, so it can only
 *   report what the owner's own surfaces already say.
 */

function compose(
  scenarioId: string,
  sections: readonly ExportSectionId[] = SELECT_ALL,
  source: HistorySource = 'owner',
) {
  return composeFor(scenarioId, sections, source)
}

const EVERY_SECTION: readonly ExportSectionId[] = [...SELECT_ALL, 'private']

const EVERYTHING = SCENARIOS.map((scenario) => ({
  id: scenario.id,
  text: compose(scenario.id, EVERY_SECTION).text,
}))

describe('a figure never reaches the document without what it measures', () => {
  for (const { id, text } of EVERYTHING) {
    it(`prints no bare figure on ${id}`, () => {
      // A per-cent sign is the shape a bare figure takes. The export states
      // counts against what they are over instead, in words.
      expect(text).not.toContain('%')
    })
  }

  it('states a count against the occasions it is over', () => {
    const text = compose('observed-evenings').text
    const counts = [...text.matchAll(/(\d+) of (\d+) —/g)]
    expect(counts.length, 'this scenario should produce at least one count').toBeGreaterThan(0)
    for (const found of counts) {
      const line = text.slice(found.index, text.indexOf('\n', found.index))
      // Whatever follows the dash has to name what is being counted.
      expect(line.split('—')[1]?.trim().length ?? 0).toBeGreaterThan(8)
    }
  })
})

describe('the document reads as English', () => {
  /*
   * "1 entries" is what this is for. It survived the whole automated gate on
   * this phase — an assertion expecting `1 entries` is exactly as green as one
   * expecting `1 entry` — and was found by reading the screen on a phone.
   * Section 61's copy rules are only worth anything if something checks them.
   */
  const DISAGREEMENTS = [
    /\b1 entries\b/,
    /\b1 records\b/,
    /\b1 entities\b/,
    /\b1 occasions\b/,
    /\b1 comparable occasions\b/,
    /\b1 pairs\b/,
    /\b1 days\b/,
    /\b1 unreadable rows\b/,
  ]

  for (const { id, text } of EVERYTHING) {
    it(`agrees a count with its noun on ${id}`, () => {
      for (const pattern of DISAGREEMENTS) {
        expect(pattern.test(text), `${id}: ${pattern.source}`).toBe(false)
      }
    })
  }

  it('never falls back to the "(s)" that hides the question', () => {
    // A developer surface may write "3 pair(s)". A document a person reads may
    // not — it is the shape of a sentence nobody decided how to word.
    for (const { id, text } of EVERYTHING) {
      expect(text.includes('(s)'), `${id} writes a count as "(s)"`).toBe(false)
    }
  })

  it('says "1 entry" on a history that holds exactly one', () => {
    /*
     * Built here rather than taken from the library, and that is the whole
     * point: **no scenario in the library holds exactly one record**, so every
     * sweep above passes over the header without ever reading a one. The
     * defect this test exists for lived in that gap — a phone showed "1
     * entries" while a full green suite said nothing.
     */
    const composed = composeOneRecord()
    expect(composed.header.records).toBe(1)
    expect(composed.text).toContain('1 entry')
    expect(composed.text).not.toContain('1 entries')
  })

  it('is exercised against a history that actually holds one of something', () => {
    // The assertions above are worth nothing if no scenario ever produces a
    // count of one. This is what makes them a test rather than a hope.
    const withOne = EVERYTHING.filter(({ text }) => /\b1 [a-z]/.test(text))
    expect(withOne.length, 'no scenario produces a count of one').toBeGreaterThan(0)
  })
})

describe('the document says what it does not know', () => {
  it('reports an abstention rather than leaving the line out', () => {
    /*
     * D-091 invariant 2. A relationship the app declined to state is a
     * finding: it means the record has not enough of one side to compare. An
     * export that simply omitted those lines would present a life in which
     * every question had an answer.
     */
    const text = compose('quiet-fortnight').text
    expect(text).toMatch(/not enough|does not support stating|nothing stated|still being gathered/i)
  })

  it('says an empty life area is empty rather than saying nothing about it', () => {
    const text = compose('mostly-unknown').text
    expect(text).toMatch(/none|nothing/i)
  })

  it('carries the things the app knows it does not know, under diagnostics', () => {
    const text = compose('mostly-unknown', ['diagnostics']).text
    expect(text).toContain('Things the app knows it does not know')
  })
})

describe('association is not worded as cause', () => {
  const causal = [/\bcauses?\b/i, /\bcaused\b/i, /\bcausing\b/i, /\bimproves?\b/i, /\bboosts?\b/i]

  for (const { id, text } of EVERYTHING) {
    it(`says nothing causal on ${id}`, () => {
      for (const pattern of causal) {
        expect(pattern.test(text), `${id}: ${pattern.source}`).toBe(false)
      }
    })
  }

  it('names the comparison the finding rests on', () => {
    const text = compose('observed-evenings').text
    if (!text.includes('has more often been higher')) return
    expect(text).toMatch(/comparable occasions without it/i)
  })
})

describe('the document says whose history it is', () => {
  it('names the owner’s own record when that is what was composed', () => {
    expect(compose('what-worked', SELECT_ALL, 'owner').text).toContain(
      'Source: the owner’s own record',
    )
  })

  it('says outright that a synthetic history is not a real person', () => {
    /*
     * D-091 invariant 8, one artefact further out. The laboratory is
     * inspectable from every surface, so it can be composed from — and a
     * document built from a fixture, handed to an assistant with nothing
     * saying so, is a synthetic life presented as a real one.
     */
    const text = compose('what-worked', SELECT_ALL, 'laboratory').text
    expect(text).toContain('This is not a real person’s record.')
    expect(text).toContain('QA laboratory')
  })

  for (const { id } of EVERYTHING) {
    it(`states a source on ${id}, whichever it is`, () => {
      expect(compose(id, EVERY_SECTION).text).toMatch(/^- Source: /m)
    })
  }
})

describe('the composer reports rather than reasons', () => {
  it('cannot reach anything that decides', () => {
    /*
     * The structural half of "no second brain". `compose.ts` may read the
     * situation, the decision and the insights report — the objects the
     * owner's own screens render — and may not reach the generator, the
     * filter, the evaluator, the arbiter, the advisor or the learning index.
     * If it could, an export could state a figure the arbitration never saw,
     * and the first time the two disagreed nobody would find out.
     */
    const code = readFileSync(
      join(import.meta.dirname, '..', '..', 'src', 'features', 'export', 'compose.ts'),
      'utf8',
    )
    for (const module of [
      'candidates',
      'constraints',
      'evaluate',
      'arbitrate',
      'advisor',
      'moves',
      'learning',
      'association',
    ]) {
      expect(code, `compose.ts imports ${module}`).not.toMatch(
        new RegExp(`from '[^']*intelligence/${module}'`),
      )
    }
  })

  it('prints the decision the engine actually made', () => {
    const { loaded, moment } = contextFor('running-on-empty')
    const decision = decide(loaded.view(), moment)
    const text = compose('running-on-empty', ['now']).text
    if (decision.explanation === undefined) {
      expect(text).toContain('suggesting nothing right now')
    } else {
      expect(text).toContain(decision.explanation.rendered.sentence)
      expect(text).toContain(decision.explanation.rendered.reason)
    }
  })

  it('prints the limiter the situation actually holds', () => {
    const { situation } = contextFor('running-on-empty')
    const text = compose('running-on-empty', ['now']).text
    if (situation.limiter === undefined) {
      expect(text).toContain('nothing in particular')
    } else {
      expect(text).toContain(situation.limiter.summary)
    }
  })
})

describe('the header describes the document rather than promising something about it', () => {
  it('reports the areas actually in the record, not a chosen list', () => {
    const { loaded } = contextFor('what-worked')
    const inRecord = new Set<string>()
    for (const record of loaded.view().history.effective) {
      for (const domain of record.domains) inRecord.add(domain)
    }
    const composed = compose('what-worked')
    expect([...composed.header.domains].sort()).toEqual([...inRecord].sort())
  })

  it('reports the span of the record from the record', () => {
    const composed = compose('long-run')
    expect(composed.header.firstDay).toBeDefined()
    expect(composed.header.lastDay).toBeDefined()
    expect(composed.header.firstDay! <= composed.header.lastDay!).toBe(true)
    expect(composed.text).toContain(`${composed.header.firstDay} to ${composed.header.lastDay}`)
  })

  it('says the record is empty rather than printing an empty range', () => {
    const composed = compose('mostly-unknown')
    if (composed.header.records === 0) {
      expect(composed.text).toContain('this history is empty')
    } else {
      expect(composed.text).toContain(`${composed.header.records} entries`)
    }
  })
})

/**
 * One record, and nothing else.
 *
 * Composed the long way — through the same parser, view, situation and
 * composer the app uses — so what it proves is what the owner would read.
 */
function composeOneRecord() {
  const zone = timeZone('America/Denver')
  const at = instant(Date.parse('2026-04-30T21:00:00Z'))
  const wire = {
    format: 'life-command-os/canonical',
    schemaVersion: 1,
    exportedAt: '2026-04-30T21:00:00.000Z',
    records: [
      {
        id: '01JQWN0NE3NTRY000000000000',
        schemaVersion: 1,
        kind: 'observation',
        occurredAt: '2026-04-30T20:00:00.000Z',
        recordedAt: '2026-04-30T20:00:00.000Z',
        zone: 'America/Denver',
        domains: ['home'],
        entities: [],
        privacy: 'normal',
        provenance: { source: 'owner', writtenBy: 'a test' },
        concept: 'home.friction',
        value: { type: 'text', value: 'the kitchen counter, again' },
        method: 'self-report',
      },
    ],
    entities: [],
    malformed: [],
  }

  const loaded = snapshotFromWire(wire)
  expect(loaded.loaded, 'the one-record document should load').toBe(true)
  expect(loaded.snapshot.records).toHaveLength(1)

  const moment = { now: at, zone, weekStartsOn: 1 as const }
  const view = buildView(loaded.snapshot, moment)
  const situation = assembleSituation(view, { ...moment, domains: coreDomains })

  return composeExport({
    sections: SELECT_ALL,
    situation,
    decision: decide(view, moment),
    insights: insightsFor(situation),
    timeline: assembleTimeline(situation),
    source: 'owner',
    app: TEST_APP,
    at,
  })
}
