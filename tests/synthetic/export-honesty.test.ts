import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createConceptRegistry } from '../../src/domain/concepts'
import { coreDomains, DOMAIN } from '../../src/domain/domains'
import { discreetPlaceholder } from '../../src/domain/privacy'
import { localDayIdAt } from '../../src/domain/time'
import { SELECT_ALL, type ExportSectionId } from '../../src/features/export/sections'
import type { HistorySource } from '../../src/features/memory/projection'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { instant, timeZone } from '../../src/domain/time'
import { decide } from '../../src/intelligence/engine'
import { insightsFor } from '../../src/intelligence/insights'
import { assembleSituation } from '../../src/intelligence/situation'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { assembleTimeline } from '../../src/features/timeline/timelineEntries'
import { composeExport } from '../../src/features/export/compose'
import { COMPOSED_AT, COMPOSED_ZONE, composeFor, contextFor, TEST_APP } from './exportHarness'

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

/** A line break, named, because a literal one inside a generated patch does not survive. */
const NEWLINE = String.fromCharCode(10)

const EVERY_SECTION: readonly ExportSectionId[] = [...SELECT_ALL, 'private']

const EVERYTHING = SCENARIOS.map((scenario) => ({
  id: scenario.id,
  text: compose(scenario.id, EVERY_SECTION).text,
}))

/** The same library, composed the way **Select all** composes it. */
const EVERY_HISTORY_PRIVATE_OFF = SCENARIOS.map((scenario) => ({
  id: scenario.id,
  text: compose(scenario.id, SELECT_ALL).text,
}))

/**
 * Every concept the document lists as not known, whatever the reason — QA-82-008.
 *
 * This was a match on the single sentence `— never answered`, which was the
 * only one the section could produce and is now one of six. Read as a rule
 * about that sentence, the guard would have quietly stopped covering the five
 * new ones on the day they arrived, which is the shape of a regression that
 * decays into decoration. So the block is found by its heading and read to the
 * blank line that ends it.
 */
function unknownLabelsIn(text: string): readonly string[] {
  const lines = text.split(NEWLINE)
  const start = lines.indexOf('Things the app knows it does not know:')
  if (start === -1) return []
  const labels: string[] = []
  for (const line of lines.slice(start + 1)) {
    if (line === '') break
    const found = /^- (.+?) \u2014 /.exec(line)
    if (found !== null) labels.push(found[1]!.trim())
  }
  return labels
}

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

describe('QA-07-002 — the first line says whose life this is', () => {
  /*
   * The document's opening sentence is an identity claim, and it was written
   * once for the owner and reused for both. A synthetic export opened with
   * "you are reviewing one person's own record of his life… he is the owner of
   * everything below" and disclosed that it was invented only further down,
   * under a heading nobody has reached yet.
   *
   * The old assertion — that "not a real person" appears *somewhere* — passed
   * on exactly that document. Where the claim appears is the finding.
   */
  function firstClaim(text: string): string {
    const line = text.split('\n').find((entry) => entry.trim() !== '' && !entry.startsWith('#'))
    expect(line, 'the document should open with something').toBeDefined()
    return line ?? ''
  }

  it('opens a synthetic export by saying it is not a real person', () => {
    const text = compose('quiet-fortnight', SELECT_ALL, 'laboratory').text
    expect(firstClaim(text)).toContain('not a real person')
  })

  it('never claims ownership of a synthetic life, anywhere', () => {
    const text = compose('quiet-fortnight', SELECT_ALL, 'laboratory').text
    expect(text).not.toContain('He is the owner of everything below')
    expect(text).not.toMatch(/reviewing one person’s own record of his life/)
  })

  it('discloses the synthetic source before anything else it says', () => {
    // Order is the whole point: a later correction does not repair an
    // instruction already given.
    const text = compose('quiet-fortnight', SELECT_ALL, 'laboratory').text
    const disclosure = text.indexOf('not a real person')
    const anythingElse = text.indexOf('Work through the headings below')
    expect(disclosure).toBeGreaterThan(-1)
    expect(disclosure).toBeLessThan(anythingElse)
  })

  it('still opens an owner export as the owner’s own record', () => {
    const text = compose('quiet-fortnight', SELECT_ALL, 'owner').text
    expect(firstClaim(text)).toContain('own record of his life')
    expect(text).not.toContain('not a real person')
  })

  for (const { id } of EVERYTHING) {
    it(`opens coherently on ${id}, both ways round`, () => {
      expect(firstClaim(compose(id, SELECT_ALL, 'laboratory').text)).toContain('not a real person')
      expect(firstClaim(compose(id, SELECT_ALL, 'owner').text)).not.toContain('not a real person')
    })
  }
})

describe('QA-07-003 — leaving the private area out leaves out that it exists', () => {
  /*
   * `quiet-fortnight` holds one private record. With the private section off,
   * the document said "Nothing from that area is below" and then reported the
   * area as current, moderately evidenced and last heard three days ago — which
   * is the participation fact a private record's discretion exists to protect,
   * disclosed under an explicit promise not to.
   *
   * Detail was never the whole of it. Whether there is anything there at all is
   * the part that leaks.
   */
  /*
   * The area's names, **and the placeholder that stands in for a withheld
   * entry**.
   *
   * The list started as the first three and let a reintroduction through: a
   * dated Timeline row reading "Noted: Private entry" names no domain and
   * discloses the whole of what the exclusion protects — that there is
   * something there, and when. A placeholder is not a redaction if its
   * presence is the fact.
   */
  /*
   * The area's names, the placeholder that stands in for a withheld entry,
   * **and the label of every private concept in the registry** — QA-82-007.
   *
   * The list started as the first three and let a reintroduction through: a
   * dated Timeline row reading "Noted: Private entry" names no domain and
   * discloses the whole of what the exclusion protects — that there is
   * something there, and when. A placeholder is not a redaction if its
   * presence is the fact.
   *
   * It then let a second one through for the same reason one size larger.
   * Diagnostics listed `Recent private pattern — never answered`, which names
   * neither the domain nor the placeholder and states, of the area the
   * document has just said it will be silent about, that nothing is known in
   * it. The labels are read from the registry rather than written down here,
   * so a private concept added tomorrow is covered by this guard on the day it
   * is added.
   */
  const PRIVATE_WORDS = [
    /Private \/ Sexual Health/,
    /private-health/,
    /private \/ sexual health/i,
    new RegExp(discreetPlaceholder('private')),
    ...createConceptRegistry()
      .all()
      .filter((definition) => definition.privacy === 'private')
      .map((definition) => new RegExp(definition.label)),
  ]

  it('names the private area nowhere in the document when it is left out', () => {
    const composed = compose('quiet-fortnight', SELECT_ALL)
    expect(composed.header.privateIncluded).toBe(false)

    /*
     * Saying "this area is left out" is not a leak — it is the disclosure that
     * stops the silence reading as an empty life. Everything else is.
     */
    const declaring =
      /leaves out|left out|whether anything has been recorded|whether there are any/i
    const leaks = composed.text
      .split(NEWLINE)
      .filter((line) => !declaring.test(line))
      .filter((line) => PRIVATE_WORDS.some((pattern) => pattern.test(line)))

    expect(leaks, 'the private area is named outside its own exclusion notice').toEqual([])
  })

  it('keeps the private area out of the header’s life areas', () => {
    const composed = compose('quiet-fortnight', SELECT_ALL)
    expect(composed.header.domains).not.toContain(DOMAIN.privateHealth)
  })

  /*
   * And on every history, not on the one that happens to hold a private record.
   *
   * `quiet-fortnight` is the only fixture with a private entry, so this suite's
   * whole privacy contract rested on a history where the private fact is
   * **known**. Its label therefore never reached the unknown list, and the leak
   * QA-82-007 found was invisible to a scan that only ever read this document.
   * The other twenty-three are where it lived.
   */
  for (const { id, text } of EVERY_HISTORY_PRIVATE_OFF) {
    it(`says nothing about the private area on ${id}`, () => {
      const declaring =
        /leaves out|left out|whether anything has been recorded|whether there are any|may describe/i
      const leaks = text
        .split(NEWLINE)
        .filter((line) => !declaring.test(line))
        .filter((line) => PRIVATE_WORDS.some((pattern) => pattern.test(line)))
      expect(leaks, 'the private area is named outside its own exclusion notice').toEqual([])
    })
  }

  it('states that the exclusion covers whether anything is recorded there', () => {
    // Otherwise the silence reads as an empty area rather than a withheld one.
    const composed = compose('quiet-fortnight', SELECT_ALL)
    expect(composed.text).toMatch(/including whether anything has been recorded in it/i)
    expect(composed.prompt).toMatch(/and also whether there are any/i)
  })

  it('names it, in full, once it is deliberately included', () => {
    const composed = compose('quiet-fortnight', [...SELECT_ALL, 'private'])
    expect(composed.header.privateIncluded).toBe(true)
    expect(composed.header.domains).toContain(DOMAIN.privateHealth)
    expect(composed.text).toContain('## Private / Sexual Health')
    // And the coverage row comes back, because it is no longer withheld.
    expect(composed.text).toMatch(/Private \/ Sexual Health — /)
  })
})

describe('QA-07-004 — the header describes the document, not the store', () => {
  it('reports nothing at all when nothing is chosen', () => {
    /*
     * The reported contradiction: "No sections were chosen, so this document
     * contains nothing about the owner" printed directly under a row saying
     * the record covered nineteen entries across four life areas. Both were
     * composed from the same object and only one was about the document.
     */
    const composed = compose('quiet-fortnight', [])
    expect(composed.header.records).toBe(0)
    expect(composed.header.domains).toEqual([])
    expect(composed.header.firstDay).toBeUndefined()
    expect(composed.text).toContain('No sections were chosen')
    /*
     * And no section body claims a life area, because there is no section body
     * at all. Checked over what the sections rendered rather than over the
     * whole file: the prompt and the About block legitimately name the private
     * area in order to say it was left out, and saying so is the disclosure,
     * not the leak.
     */
    expect(composed.text).not.toContain('Life areas with entries:')
    expect(composed.text).not.toContain('## Where things stand')
  })

  it('narrows to the sections that were chosen', () => {
    const everything = compose('quiet-fortnight', SELECT_ALL)
    const narrow = compose('quiet-fortnight', ['corrections'])
    expect(narrow.header.records).toBeLessThan(everything.header.records)
  })

  it('widens back out when a section that summarises everything is chosen', () => {
    // Coverage, learning, insights and diagnostics really are computed over the
    // whole record, so they honestly put the whole record in scope.
    const narrow = compose('quiet-fortnight', ['corrections'])
    const wide = compose('quiet-fortnight', ['corrections', 'coverage'])
    expect(wide.header.records).toBeGreaterThan(narrow.header.records)
  })

  it('never counts a record the document is not allowed to mention', () => {
    const withPrivate = compose('quiet-fortnight', [...SELECT_ALL, 'private'])
    const without = compose('quiet-fortnight', SELECT_ALL)
    expect(withPrivate.header.records).toBeGreaterThan(without.header.records)
  })
})

describe('QA-07-005 — a document is dated when it was composed', () => {
  it('uses the composing moment rather than the history’s own clock', () => {
    /*
     * A scenario sets the clock to whatever evening it is about. "Composed on"
     * is a fact about now, and reading it off the situation produced an August
     * artefact stamped February — the class this shares with the backup
     * filename QA found.
     */
    const composed = compose('quiet-fortnight', SELECT_ALL)
    const scenarioDay = localDayIdAt(contextFor('quiet-fortnight').moment.now, COMPOSED_ZONE)
    expect(composed.header.composedAt).toBe(localDayIdAt(COMPOSED_AT, COMPOSED_ZONE))
    expect(composed.header.composedAt).not.toBe(scenarioDay)
  })
})

describe('QA-07-008 — a sentence ends once', () => {
  const DOUBLED = /[.!?][.!?]/

  for (const { id, text } of EVERYTHING) {
    it(`ends every sentence once on ${id}`, () => {
      const offenders = text
        .split('\n')
        // Markdown rules and the ellipsis a shortened fingerprint ends in are
        // not sentences.
        .filter((line) => !line.startsWith('---'))
        .filter((line) => DOUBLED.test(line))
      expect(offenders, `${id} doubles a terminator`).toEqual([])
    })
  }

  it('is exercised against a headline that already carries its own full stop', () => {
    // The reported case: an app-written headline joined to a fragment this
    // file wrote. Without a history that produces one, the sweep above proves
    // nothing about the join.
    const noAction = EVERYTHING.filter(({ text }) =>
      text.includes('The app is suggesting nothing right now'),
    )
    expect(noAction.length, 'no scenario produces a no-action sentence').toBeGreaterThan(0)
    for (const { id, text } of noAction) {
      expect(text, `${id}`).not.toMatch(/right now: [^\n]*\.\./)
    }
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

  /**
   * And never disowns something it has just stated \u2014 QA-82-005.
   *
   * The assertion above is why this file gave a false green: it asked whether
   * an unknown section existed, which is true of a document that also
   * contradicts itself. On the deployed build the review export printed
   * *"Child here right now \u2014 No \u2014 Adaya's school day is on until 15:00"* under
   * what it read to decide, and *"Child here right now \u2014 never answered"* under
   * what it does not know, in one generated document that asks its reader to
   * treat it as the source of truth.
   *
   * Read as a rule about the document rather than about the concept that
   * caused it: whatever a section states a reading for, no later section may
   * list as unanswered.
   */
  for (const { id, text } of EVERYTHING) {
    it(`never answers a question and disowns it on ${id}`, () => {
      const read = new Set(
        [...text.matchAll(/^- (.+?) \u2014 .*\((?:explicit|inferred|stale); for /gm)].map((found) =>
          found[1]!.trim(),
        ),
      )
      const disowned = unknownLabelsIn(text).filter((label) => read.has(label))
      expect(disowned, 'stated as read, and listed as unknown').toEqual([])
    })
  }
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
    composedAt: { at: COMPOSED_AT, zone: COMPOSED_ZONE },
  })
}
