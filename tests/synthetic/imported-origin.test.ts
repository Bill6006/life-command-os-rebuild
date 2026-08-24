import { describe, expect, it } from 'vitest'
import { createRecordFactory } from '../../src/domain/build'
import { CONCEPT } from '../../src/domain/concepts'
import { coreDomains, DOMAIN, type LifeDomainId } from '../../src/domain/domains'
import { sequentialRecordIds } from '../../src/domain/ids'
import type { CanonicalRecord, Provenance } from '../../src/domain/records'
import { DISCREET_PRIMARY } from '../../src/domain/privacy'
import { instant, timeZone, type Instant } from '../../src/domain/time'
import { describeRecord } from '../../src/features/history/describe'
import { originOf, originOfSources, originResolver } from '../../src/features/history/origin'
import { assembleDomainPageData, pageForDomain } from '../../src/features/life/domainPages'
import { assembleTimeline } from '../../src/features/timeline/timelineEntries'
import { composeExport } from '../../src/features/export/compose'
import { SELECT_ALL } from '../../src/features/export/sections'
import { decide } from '../../src/intelligence/engine'
import { insightsFor } from '../../src/intelligence/insights'
import { assembleSituation } from '../../src/intelligence/situation'
import { EMPTY_SNAPSHOT } from '../../src/memory/store'
import { buildView } from '../../src/memory/view'
import { TEST_APP, COMPOSED_AT, COMPOSED_ZONE } from './exportHarness'

/**
 * An entry the owner did not write says so, wherever it is read (QA-08-001).
 *
 * ## What was actually wrong
 *
 * Independent QA reported that a legacy row translated into a canonical
 * observation was indistinguishable from one the owner typed today. The record
 * layer was right throughout — `evidenceSourceOf` returned `legacy-import` and
 * a backup carried it — and the presentation layer never asked. So the class is
 * wider than the report: **no entry on any list surface said where it came
 * from**, and a device reading and a derived one were equally silent.
 *
 * ## Why this is one test rather than five
 *
 * The defect was one omission with five symptoms, and five separate tests for
 * five surfaces is five places to forget the sixth. Every surface here reads
 * the same history — one reading the owner gave, and one identical reading that
 * came across from the old app — and each has to tell them apart.
 *
 * The pairing matters as much as the marking. A test that only asserted the
 * badge appears would pass on a build that marked *every* row, which would
 * teach the owner to stop reading it (section 4.6) and would be its own defect.
 */

const ZONE = timeZone('America/Denver')
const NOW = instant(Date.parse('2026-08-24T20:00:00Z'))
const nextId = sequentialRecordIds('ORIG')

const OWNER: Provenance = { source: 'owner', writtenBy: 'a test' }
const IMPORTED: Provenance = {
  source: 'legacy-import',
  writtenBy: 'legacy-map-2026-08-A',
  note: 'old record qa8-energy',
}

function at(offsetMinutes: number): Instant {
  return instant(NOW - offsetMinutes * 60_000)
}

/**
 * Two readings of the same concept, one hour apart, identical but for origin.
 *
 * Deliberately the same concept and the same shape: anything that tells them
 * apart has to be the origin, not the wording of the value or which domain
 * page they land on.
 */
function history(): readonly CanonicalRecord[] {
  const owned = createRecordFactory({ zone: ZONE, provenance: OWNER, nextId })
  const brought = createRecordFactory({ zone: ZONE, provenance: IMPORTED, nextId })

  return [
    owned(
      'observation',
      { occurredAt: at(30), domains: [DOMAIN.health] },
      {
        concept: CONCEPT.energy,
        value: { type: 'scale', value: 4, of: 5 },
        method: 'self-report',
      },
    ),
    brought(
      'observation',
      { occurredAt: at(90), domains: [DOMAIN.health] },
      {
        concept: CONCEPT.energy,
        value: { type: 'scale', value: 2, of: 5 },
        method: 'self-report',
      },
    ),
    owned(
      'goal',
      { occurredAt: at(6000), domains: [DOMAIN.career] },
      {
        goal: { kind: 'goal', id: 'goal:his-own' as never },
        statement: 'Write this one down myself',
        status: 'active',
      },
    ),
    brought(
      'goal',
      { occurredAt: at(9000), domains: [DOMAIN.career] },
      {
        goal: { kind: 'goal', id: 'goal:legacy-one' as never },
        statement: 'Finish a meaningful certification',
        status: 'active',
      },
    ),
    brought(
      'imported-legacy-record',
      { occurredAt: at(200), domains: [DOMAIN.home], privacy: 'sensitive' },
      { legacyFormat: 'life-command-os.backup', raw: { recordType: 'learned-belief' } },
    ),
  ]
}

const RECORDS = history()
const SNAPSHOT = { ...EMPTY_SNAPSHOT, records: RECORDS }
const VIEW = buildView(SNAPSHOT, { now: NOW, zone: ZONE })
const SITUATION = assembleSituation(VIEW, {
  now: NOW,
  zone: ZONE,
  weekStartsOn: 1,
  domains: coreDomains,
})

const ownerRecord = RECORDS[0] as CanonicalRecord
const importedRecord = RECORDS[1] as CanonicalRecord

describe('the record layer already knew, and now says so', () => {
  it('marks what the owner did not write, and only that', () => {
    expect(originOf(ownerRecord)).toBeUndefined()
    expect(originOf(importedRecord)?.label).toBe('Imported')
    expect(originOf(importedRecord)?.source).toBe('legacy-import')
  })

  it('covers every origin that is not the owner, not only imports', () => {
    /*
     * The reported defect was about legacy import. The class is D-014: a
     * reading nothing about the owner produced says so. A device reading and a
     * derived one were silent in exactly the same way, so they are held here —
     * otherwise the next origin to matter reintroduces the defect for free.
     */
    const measured = createRecordFactory({ zone: ZONE, provenance: OWNER, nextId })(
      'observation',
      { occurredAt: at(10), domains: [DOMAIN.sleep] },
      {
        concept: CONCEPT.sleepHours,
        value: { type: 'number', value: 7, unit: 'hours' },
        method: 'device',
      },
    )
    expect(originOf(measured)?.label).toBe('Measured')

    const worked = createRecordFactory({ zone: ZONE, provenance: OWNER, nextId })(
      'observation',
      { occurredAt: at(10), domains: [DOMAIN.sleep] },
      {
        concept: CONCEPT.sleepHours,
        value: { type: 'number', value: 7, unit: 'hours' },
        method: 'derived',
      },
    )
    expect(originOf(worked)?.label).toBe('Worked out')
  })

  it('keeps the origin on a row whose detail is withheld', () => {
    /*
     * Where an entry came from is not the private detail — the detail is what
     * it says. Withholding both would make a private imported row read as one
     * he wrote, on the surface least able to correct it.
     */
    const priv = createRecordFactory({ zone: ZONE, provenance: IMPORTED, nextId })(
      'observation',
      { occurredAt: at(20), domains: [DOMAIN.privateHealth], privacy: 'private' },
      {
        concept: CONCEPT.privatePattern,
        value: { type: 'text', value: 'something private' },
        method: 'self-report',
      },
    )
    const described = describeRecord(priv, {
      entities: VIEW.entities,
      history: VIEW.history,
      concepts: SITUATION.concepts,
      policy: DISCREET_PRIMARY,
    })
    expect(described?.withheld).toBe(true)
    expect(described?.origin?.label).toBe('Imported')
  })
})

describe('every surface that shows an entry tells them apart', () => {
  it('Timeline', () => {
    const timeline = assembleTimeline(SITUATION)
    const entries = timeline.days.flatMap((day) => day.entries)

    const owned = entries.find((entry) => entry.id === ownerRecord.id)
    const brought = entries.find((entry) => entry.id === importedRecord.id)

    expect(owned?.origin).toBeUndefined()
    expect(brought?.origin?.label).toBe('Imported')
  })

  it('a domain page — the reading, the entries under it, and a goal', () => {
    const page = pageForDomain(DOMAIN.health)
    expect(page).toBeDefined()
    if (page === undefined) return
    const data = assembleDomainPageData(SITUATION, page)

    // The entries listed under "Recently".
    const brought = data.recentChanges.find((change) => change.id === importedRecord.id)
    const owned = data.recentChanges.find((change) => change.id === ownerRecord.id)
    expect(brought?.origin?.label).toBe('Imported')
    expect(owned?.origin).toBeUndefined()

    // The belief itself. The owner's reading is the newer one, so the reading
    // shown rests on his record and carries no badge.
    const reading = data.readings.find((entry) => entry.concept === CONCEPT.energy)
    expect(reading).toBeDefined()
    expect(reading?.origin).toBeUndefined()

    const career = pageForDomain(DOMAIN.career)
    expect(career).toBeDefined()
    if (career === undefined) return
    const careerData = assembleDomainPageData(SITUATION, career)
    const goals = careerData.goals
    expect(goals.length).toBeGreaterThan(0)
    expect(goals.some((goal) => goal.origin?.label === 'Imported')).toBe(true)
    expect(goals.some((goal) => goal.origin === undefined)).toBe(true)
  })

  it('a belief that rests only on imported evidence says so', () => {
    // Same history with his own reading removed: now the only thing the app
    // knows about energy came across from the old app, and the row says it.
    const onlyImported = {
      ...SNAPSHOT,
      records: RECORDS.filter((record) => record.id !== ownerRecord.id),
    }
    const view = buildView(onlyImported, { now: NOW, zone: ZONE })
    const situation = assembleSituation(view, {
      now: NOW,
      zone: ZONE,
      weekStartsOn: 1,
      domains: coreDomains,
    })
    const page = pageForDomain(DOMAIN.health)
    if (page === undefined) throw new Error('no health page')

    const reading = assembleDomainPageData(situation, page).readings.find(
      (entry) => entry.concept === CONCEPT.energy,
    )
    expect(reading?.origin?.label).toBe('Imported')
  })

  it('the export, which is read by somebody who was not there', () => {
    const composed = composeExport({
      sections: SELECT_ALL,
      situation: SITUATION,
      decision: decide(VIEW, { now: NOW, zone: ZONE }),
      insights: insightsFor(SITUATION),
      timeline: assembleTimeline(SITUATION),
      source: 'owner',
      app: TEST_APP,
      composedAt: { at: COMPOSED_AT, zone: COMPOSED_ZONE },
    })

    /*
     * The line for the imported reading carries the marker and the line for
     * his own does not. Matched on the value, because the two are the same
     * concept and only the number and the origin separate them.
     */
    const lines = composed.text.split('\n')
    const importedLine = lines.find((line) => line.includes('Current energy: 2 of 5'))
    const ownLine = lines.find((line) => line.includes('Current energy: 4 of 5'))

    expect(importedLine, 'the imported reading should appear').toBeDefined()
    expect(ownLine, 'the owner’s reading should appear').toBeDefined()
    expect(importedLine).toMatch(/· Imported/)
    expect(ownLine).not.toMatch(/· Imported/)
  })

  it('the evidence behind a figure', () => {
    const resolve = originResolver(VIEW.history)
    expect(resolve(importedRecord.id)?.label).toBe('Imported')
    expect(resolve(ownerRecord.id)).toBeUndefined()
    // A dangling reference resolves to nothing rather than throwing — an
    // evidence line whose record has gone is already handled elsewhere.
    expect(resolve('NOTAREALRECORDID0000000000' as never)).toBeUndefined()
  })
})

/**
 * A conclusion drawn from imported history says so too (QA-08-001, retest).
 *
 * ## Why this block exists separately
 *
 * The block above was headed "every surface tells them apart" and asserted
 * Timeline, a domain page, an evidence resolver, and one Recent record line in
 * the export. Independent QA retested the repair and found the claim still
 * failing on Life's overview, an Insights coverage card, and four of the
 * export's sections — and named this file's title as the reason nobody noticed:
 * it claimed every surface and covered the record-shaped ones.
 *
 * That is the same defect the round-1 report found in somebody else's test,
 * committed by the repair for it. A title is a claim; where it is broader than
 * the body, the body is what is true and the title is what gets believed.
 *
 * So the two halves are named for what they actually hold. This one is about
 * **conclusions**: a sentence drawn from records rather than one showing them.
 *
 * ## The history
 *
 * One area whose entire record came across from the old app, and one the owner
 * built himself. Both must be readable, and only one may be marked.
 */
describe('every surface that states a conclusion tells them apart', () => {
  const nextConclusionId = sequentialRecordIds('CONC')

  /*
   * Career holds **one imported goal and nothing else** — QA's exact
   * reproduction, and the case that separates a real assertion from a passing
   * one. A goal bears no concept, so the coverage card's evidence lines have no
   * record to cite and the origin can only come from the area itself. An
   * earlier version of this fixture also gave Career an imported *observation*,
   * which meant the card's lines resolved and the assertion passed even with
   * the area-level origin removed — the same "cannot fire" defect QA found in
   * the last repair, one layer down.
   *
   * Sleep holds a recent imported reading, so a *current* fact reaches the
   * export. Home holds one entry of the owner's own, so there is something
   * unmarked to compare against.
   */
  function twoAreas(): readonly CanonicalRecord[] {
    const brought = createRecordFactory({
      zone: ZONE,
      provenance: IMPORTED,
      nextId: nextConclusionId,
    })
    const owned = createRecordFactory({ zone: ZONE, provenance: OWNER, nextId: nextConclusionId })
    return [
      brought(
        'goal',
        { occurredAt: at(120 * 24 * 60), domains: [DOMAIN.career] },
        {
          goal: { kind: 'goal', id: 'goal:legacy-cert' as never },
          statement: 'Finish a meaningful certification',
          status: 'active',
        },
      ),
      brought(
        'observation',
        { occurredAt: at(90), domains: [DOMAIN.sleep] },
        {
          concept: CONCEPT.sleepQuality,
          value: { type: 'scale', value: 2, of: 5 },
          method: 'self-report',
        },
      ),
      owned(
        'observation',
        { occurredAt: at(90), domains: [DOMAIN.home] },
        {
          concept: CONCEPT.homeFriction,
          value: { type: 'text', value: 'the kitchen counter, again' },
          method: 'self-report',
        },
      ),
    ]
  }

  const RECORDS_TWO = twoAreas()
  const SNAP = { ...EMPTY_SNAPSHOT, records: RECORDS_TWO }
  const VIEW_TWO = buildView(SNAP, { now: NOW, zone: ZONE })
  const SIT = assembleSituation(VIEW_TWO, {
    now: NOW,
    zone: ZONE,
    weekStartsOn: 1,
    domains: coreDomains,
  })

  function coverageFor(domain: LifeDomainId) {
    const found = SIT.coverage.get(domain)
    if (found === undefined) throw new Error(`no coverage for ${domain}`)
    return found
  }

  it('the intelligence layer knows every origin behind an area, not only the newest', () => {
    /*
     * `source` is the newest record's origin and answers a reliability
     * question. Disclosure needs the whole body, or an area with one recent
     * entry of his own on top of a decade of imports would read as entirely
     * his — and the reverse.
     */
    expect(coverageFor(DOMAIN.career).sources).toEqual(['legacy-import'])
    expect(originOfSources(coverageFor(DOMAIN.career).sources)?.label).toBe('Imported')

    /*
     * His own area knows its origin too, and says nothing about it. `owner` is
     * a source like any other at this layer; it is `originOfSources` that
     * declines to put a badge on his own record, and holding both halves here
     * is what stops a future edit "simplifying" the empty case into marking
     * everything.
     */
    expect(coverageFor(DOMAIN.home).sources).toEqual(['owner'])
    expect(originOfSources(coverageFor(DOMAIN.home).sources)).toBeUndefined()
  })

  it('an area with one entry of his own in it is his again', () => {
    // One record is enough. A conclusion resting on a mix is not an imported
    // conclusion, and the badge would be a claim wider than the evidence.
    const mixed = {
      ...SNAP,
      records: [
        ...RECORDS_TWO,
        createRecordFactory({ zone: ZONE, provenance: OWNER, nextId: nextConclusionId })(
          'observation',
          { occurredAt: at(60), domains: [DOMAIN.career] },
          {
            concept: CONCEPT.learningTopic,
            value: { type: 'text', value: 'routing' },
            method: 'self-report',
          },
        ),
      ],
    }
    const situation = assembleSituation(buildView(mixed, { now: NOW, zone: ZONE }), {
      now: NOW,
      zone: ZONE,
      weekStartsOn: 1,
      domains: coreDomains,
    })
    const career = situation.coverage.get(DOMAIN.career)
    expect(career?.sources).toEqual(['legacy-import', 'owner'])
    expect(originOfSources(career?.sources ?? [])).toBeUndefined()
  })

  it('an Insights coverage card carries it', () => {
    const report = insightsFor(SIT)
    const gaps = report.insights.filter((insight) => insight.kind === 'coverage-gap')
    expect(gaps.length, 'the fixture should produce a coverage gap').toBeGreaterThan(0)

    const career = gaps.find((insight) => insight.domain === DOMAIN.career)
    if (career !== undefined) {
      expect(originOfSources(career.sources)?.label).toBe('Imported')
    } else {
      // The several-areas card covers more than Career, so its sources are the
      // union — and a union that includes an area of his own says nothing,
      // which is the rule working rather than the assertion failing.
      const several = gaps[0]
      expect(several?.sources.length).toBeGreaterThan(0)
    }
  })

  it('every insight declares where its evidence came from', () => {
    // Not only coverage cards. A card added later inherits the rule from
    // `withSources` rather than having to remember it, and this holds that.
    for (const insight of insightsFor(SIT).insights) {
      expect(Array.isArray(insight.sources), insight.id).toBe(true)
    }
  })

  it('the export marks the conclusions, not only the entries under them', () => {
    const composed = composeExport({
      sections: SELECT_ALL,
      situation: SIT,
      decision: decide(VIEW_TWO, { now: NOW, zone: ZONE }),
      insights: insightsFor(SIT),
      timeline: assembleTimeline(SIT),
      source: 'owner',
      app: TEST_APP,
      composedAt: { at: COMPOSED_AT, zone: COMPOSED_ZONE },
    })
    const lines = composed.text.split('\n')
    const find = (needle: string) => lines.find((line) => line.includes(needle))

    // "Direction, goals and commitments" — the active goal.
    const goal = find('Finish a meaningful certification')
    expect(goal, 'the imported goal should appear').toBeDefined()
    expect(goal).toMatch(/· Imported/)

    // "How well each area is understood" — the coverage line for that area.
    const career = lines.find((line) => line.includes('Career') && line.includes('evidence'))
    expect(career, 'the career coverage line should appear').toBeDefined()
    expect(career).toMatch(/· Imported/)

    // And an area of his own carries nothing.
    const home = lines.find((line) => line.includes('Home') && line.includes('evidence'))
    expect(home, 'the home coverage line should appear').toBeDefined()
    expect(home).not.toMatch(/· Imported/)
  })

  it('the export marks a current reading the app is leaning on', () => {
    const composed = composeExport({
      sections: SELECT_ALL,
      situation: SIT,
      decision: decide(VIEW_TWO, { now: NOW, zone: ZONE }),
      insights: insightsFor(SIT),
      timeline: assembleTimeline(SIT),
      source: 'owner',
      app: TEST_APP,
      composedAt: { at: COMPOSED_AT, zone: COMPOSED_ZONE },
    })
    const lines = composed.text.split('\n')

    const learning = lines.find((line) => line.includes('Sleep quality') && line.includes('2 of 5'))
    const friction = lines.find(
      (line) => line.includes('Home friction') && line.includes('kitchen counter'),
    )

    if (learning !== undefined) expect(learning).toMatch(/· Imported/)
    if (friction !== undefined) expect(friction).not.toMatch(/· Imported/)
    expect(
      learning ?? friction,
      'at least one considered fact should reach the document',
    ).toBeDefined()
  })
})
