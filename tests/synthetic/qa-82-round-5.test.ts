import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { coreDomains, DOMAIN } from '../../src/domain/domains'
import { newRecordId } from '../../src/domain/ids'
import { instant } from '../../src/domain/time'
import { dueWindow } from '../../src/domain/windows'
import { entityToWire, recordToWire } from '../../src/domain/wire'
import { composeExport } from '../../src/features/export/compose'
import {
  claimsWithheld,
  isWithheldEntity,
  isWithheldRecord,
  withheldFrom,
} from '../../src/features/export/scope'
import { SELECT_ALL, type ExportSectionId } from '../../src/features/export/sections'
import { assembleTimeline } from '../../src/features/timeline/timelineEntries'
import { decide } from '../../src/intelligence/engine'
import { insightsFor } from '../../src/intelligence/insights'
import { assembleSituation } from '../../src/intelligence/situation'
import { snapshotFromWire, type SnapshotWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { createKit } from '../../src/synthetic/kit'
import { scenarioById } from '../../src/synthetic/scenarios'
import { COMPOSED_AT, COMPOSED_ZONE, TEST_APP } from './exportHarness'

/**
 * Phase 82, round 5 — what a document is composed from.
 *
 * Round 4 scoped the sections that had been looked at: the diagnostic counts,
 * the unknown labels, the timeline page and the supersession list. Round 5 read
 * four more and found the rule absent in all of them — Direction printing a
 * private goal's own words, Corrections printing why a private answer was
 * withdrawn, Learning and Insights publishing conclusions and occasion counts
 * computed from private readings — and then found the case no section filter
 * could ever have fixed: a private reading of the owner's energy outranks a
 * public one, and the suggestion, its reason, the limiter, the trace score and
 * the ranking all change. There is no filter over a finished decision that
 * unmakes it.
 *
 * So the boundary moved to the store the document is composed from (D-150), and
 * these are written against **that**: the property is that a private thing in
 * the store changes nothing about a document composed with the private section
 * off — whatever kind of thing it is, and whichever section would have carried
 * it.
 *
 * ## Why the cases are built rather than drawn from the library
 *
 * Round 4's guard injected an inert `privatePattern` observation into all 24
 * histories and asserted paired equality. It passed while all four of the
 * sections above leaked, because that record reaches none of them: it is not a
 * goal, not a correction, not a reading anything decides from, and not one side
 * of a learned relationship. **A paired-history property only covers the
 * sections the private data can actually reach**, which is the sharpest thing
 * Round 5 said and the reason the table below is a table of *kinds*.
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

function compose(
  wire: SnapshotWire,
  scenarioId: string,
  sections: readonly ExportSectionId[] = SELECT_ALL,
) {
  const scenario = fixture(scenarioId)
  const snapshot = parse(wire)
  const moment = {
    now: scenario.now,
    zone: scenario.zone,
    weekStartsOn: 1 as const,
    domains: coreDomains,
  }
  const view = buildView(snapshot, moment)
  const situation = assembleSituation(view, moment)
  return {
    snapshot,
    view,
    situation,
    text: composeExport({
      sections,
      situation,
      decision: decide(view, moment),
      insights: insightsFor(situation),
      timeline: assembleTimeline(situation),
      source: 'laboratory',
      app: TEST_APP,
      composedAt: { at: COMPOSED_AT, zone: COMPOSED_ZONE },
    }).text,
  }
}

/** The lines one document has and the other does not, both ways round. */
function difference(left: string, right: string): readonly string[] {
  const a = left.split(NEWLINE)
  const b = right.split(NEWLINE)
  return [
    ...a.filter((line) => !b.includes(line)).map((line) => `only with: ${line}`),
    ...b.filter((line) => !a.includes(line)).map((line) => `only without: ${line}`),
  ]
}

// ---------------------------------------------------------------------------
// The store each document is composed from
// ---------------------------------------------------------------------------

describe('QA-82-007 — a private thing in the store changes nothing about a private-off document', () => {
  const base = fixture('quiet-fortnight')
  const kit = createKit('qa82r5-regression', base.zone, '2026-01-01T00:00:00Z')
  const at = instant(base.now - 60_000)
  const original = base.build()
  const publicOnly: SnapshotWire = {
    ...original,
    records: parse(original)
      .records.filter((record) => !isWithheldRecord(record))
      .map(recordToWire),
  }
  const donor = parse(original).records.find((record) => isWithheldRecord(record))
  expect(donor, 'quiet-fortnight should still hold one private record').toBeDefined()

  const goalSubject = kit.entity({
    kind: 'goal',
    label: 'Private appointment follow-up',
    domain: DOMAIN.privateHealth,
    privacy: 'private',
  })

  /**
   * One private thing of each kind that reaches a different section.
   *
   * Each entry says which section carried it when it leaked, because that is
   * the part a reader needs in order to tell whether this table still covers
   * the document — a section added tomorrow needs a row here or an argument
   * that an existing row already reaches it.
   */
  const KINDS: readonly {
    readonly what: string
    readonly section: string
    readonly wire: () => SnapshotWire
  }[] = [
    {
      what: 'a goal, its subject and a commitment',
      section: 'Direction, goals and commitments',
      wire: () => ({
        ...publicOnly,
        entities: [...publicOnly.entities, entityToWire(goalSubject)],
        records: [
          ...publicOnly.records,
          recordToWire(
            kit.record(
              'goal',
              { occurredAt: at, domains: [DOMAIN.privateHealth], privacy: 'private' },
              {
                goal: { id: goalSubject.id, kind: goalSubject.kind },
                statement: 'Discuss the private appointment findings',
                status: 'active',
              },
            ),
          ),
          recordToWire(
            kit.record(
              'commitment',
              { occurredAt: at, domains: [DOMAIN.privateHealth], privacy: 'private' },
              {
                statement: 'Call about the private appointment results',
                due: dueWindow(at, instant(base.now + 3_600_000)),
              },
            ),
          ),
        ],
      }),
    },
    {
      what: 'a withdrawal of a private answer, and its reason',
      section: 'Where the app has been overruled',
      wire: () => ({
        ...publicOnly,
        records: [
          ...publicOnly.records,
          recordToWire(donor!),
          recordToWire(
            kit.record(
              'correction',
              { occurredAt: at, domains: [DOMAIN.privateHealth], privacy: 'private' },
              { corrects: donor!.id, reason: 'Private correction' },
            ),
          ),
        ],
      }),
    },
    {
      what: 'a supersession pointing at nothing',
      section: 'Diagnostics — records that contradict each other',
      wire: () => ({
        ...publicOnly,
        records: [
          ...publicOnly.records,
          recordToWire({
            ...donor!,
            supersedes: newRecordId((count) => new Uint8Array(count).fill(7)),
          }),
        ],
      }),
    },
    {
      what: 'a subject nothing else refers to',
      section: 'Diagnostics — the entity count',
      wire: () => ({
        ...publicOnly,
        entities: [...publicOnly.entities, entityToWire(goalSubject)],
      }),
    },
    /*
     * The next three carry **one** of the two privacy facts each.
     *
     * Everything above carries both, because the record factory derives a
     * class from an area and a fixture written by hand tends to set both — so
     * a predicate that reads only one of them passes all of it. These are the
     * second member of each half of the class, at document level rather than
     * only under the predicate's own unit test.
     */
    {
      what: 'a subject filed in an ordinary area but marked private',
      section: 'Diagnostics — the entity count',
      wire: () => ({
        ...publicOnly,
        entities: [
          ...publicOnly.entities,
          entityToWire(
            kit.entity({
              kind: 'goal',
              label: 'A private matter filed elsewhere',
              domain: DOMAIN.home,
              privacy: 'private',
            }),
          ),
        ],
      }),
    },
    {
      what: 'a subject in the private area that nobody marked private',
      section: 'Diagnostics — the entity count',
      wire: () => ({
        ...publicOnly,
        entities: [
          ...publicOnly.entities,
          entityToWire(
            kit.entity({
              kind: 'goal',
              label: 'An unmarked subject in the withheld area',
              domain: DOMAIN.privateHealth,
              privacy: 'normal',
            }),
          ),
        ],
      }),
    },
    {
      what: 'a record in the private area that nobody marked private',
      section: 'Recent record, and every count of it',
      wire: () => ({
        ...publicOnly,
        records: [
          ...publicOnly.records,
          recordToWire({
            ...kit.record(
              'observation',
              { occurredAt: at, domains: [DOMAIN.privateHealth] },
              {
                concept: CONCEPT.privatePattern,
                method: 'self-report',
                value: { type: 'text', value: 'an unmarked private entry' },
              },
            ),
            privacy: 'normal' as const,
          }),
        ],
      }),
    },
    {
      what: 'an unreadable entity naming the area in the singular',
      section: 'Recent record, and the unreadable count',
      wire: () => ({
        ...publicOnly,
        entities: [...publicOnly.entities, { id: 'broken', domain: DOMAIN.privateHealth }],
      }),
    },
    {
      what: 'an unreadable record naming the area in the plural',
      section: 'Recent record, and the unreadable count',
      wire: () => ({
        ...publicOnly,
        records: [...publicOnly.records, { id: 'broken', domains: [DOMAIN.privateHealth] }],
      }),
    },
    {
      what: 'an unreadable row that only says it is private',
      section: 'Recent record, and the unreadable count',
      wire: () => ({
        ...publicOnly,
        records: [...publicOnly.records, { id: 'broken', privacy: 'private' }],
      }),
    },
  ]

  const bare = compose(publicOnly, 'quiet-fortnight').text

  for (const { what, section, wire } of KINDS) {
    it(`is not changed by ${what}`, () => {
      expect(
        difference(compose(wire(), 'quiet-fortnight').text, bare),
        `it reached ${section}`,
      ).toEqual([])
    })
  }

  it('is not changed by a reading the decision would otherwise have used', () => {
    /*
     * The case no section filter could have answered, and the reason the
     * boundary is the store rather than the renderer.
     *
     * A private observation of an ordinary concept outranks the public one
     * beneath it, and then the suggestion changes from ten minutes with Adaya
     * to a light day. Filtering the fact row afterwards leaves the conclusion
     * standing with its evidence removed, which is worse than saying nothing:
     * it is exactly the shape D-091 exists to prevent, one artefact further
     * out.
     *
     * Note the privacy is on the **record**, not the concept, and its area is
     * Health. A rule written against the private *area* alone never sees it.
     */
    const school = fixture('school-morning')
    const wire = school.build()
    const quiet = kit.record(
      'observation',
      { occurredAt: instant(school.now - 1_000), domains: [DOMAIN.health], privacy: 'private' },
      { concept: CONCEPT.energy, method: 'self-report', value: { type: 'scale', value: 1, of: 5 } },
    )
    const withIt: SnapshotWire = { ...wire, records: [...wire.records, recordToWire(quiet)] }

    // The reading genuinely lands, or this proves nothing.
    const unscoped = buildView(parse(withIt), {
      now: school.now,
      zone: school.zone,
      weekStartsOn: 1 as const,
    })
    expect(unscoped.facts.knowledgeFor(CONCEPT.energy)).toMatchObject({
      state: 'explicit',
      value: { type: 'scale', value: 1, of: 5 },
    })

    expect(
      difference(compose(withIt, 'school-morning').text, compose(wire, 'school-morning').text),
      'a withheld reading reached the decision the document states',
    ).toEqual([])
  })

  it('is not changed by readings a relationship was learned from', () => {
    /*
     * And the conclusions, which are the same content counted. The occasion
     * figures, the date span and the trend are all statements about the
     * withheld readings; publishing them under a promise to say nothing about
     * that area is the participation leak with arithmetic in front of it.
     */
    const observed = fixture('observed-evenings')
    const records = parse(observed.build()).records.map((record) =>
      record.kind === 'observation' && record.concept === CONCEPT.energy
        ? { ...record, privacy: 'private' as const }
        : record,
    )
    expect(records.filter((record) => record.privacy === 'private').length).toBeGreaterThan(20)

    const withThem: SnapshotWire = { ...observed.build(), records: records.map(recordToWire) }
    const withoutThem: SnapshotWire = {
      ...observed.build(),
      records: records.filter((record) => record.privacy !== 'private').map(recordToWire),
    }

    const reached = compose(withThem, observed.id, ['private', ...SELECT_ALL])
    expect(
      reached.situation.learning.associations.length,
      'the relationship must actually be learned, or this proves nothing',
    ).toBeGreaterThan(0)

    expect(
      difference(compose(withThem, observed.id).text, compose(withoutThem, observed.id).text),
      'a conclusion computed from withheld readings reached the document',
    ).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// The other direction, which an over-broad fix breaks
// ---------------------------------------------------------------------------

describe('QA-82-007 — and the document still says everything it may', () => {
  const base = fixture('quiet-fortnight')
  const kit = createKit('qa82r5-opt-in', base.zone, '2026-01-01T00:00:00Z')
  const at = instant(base.now - 60_000)
  const original = base.build()
  const subject = kit.entity({
    kind: 'goal',
    label: 'Private appointment follow-up',
    domain: DOMAIN.privateHealth,
    privacy: 'private',
  })
  const withPlans: SnapshotWire = {
    ...original,
    entities: [...original.entities, entityToWire(subject)],
    records: [
      ...original.records,
      recordToWire(
        kit.record(
          'goal',
          { occurredAt: at, domains: [DOMAIN.privateHealth], privacy: 'private' },
          {
            goal: { id: subject.id, kind: subject.kind },
            statement: 'Discuss the private appointment findings',
            status: 'active',
          },
        ),
      ),
    ],
  }

  it('gives the private detail back when the owner asks for it deliberately', () => {
    const on = compose(withPlans, 'quiet-fortnight', [...SELECT_ALL, 'private']).text
    expect(on).toContain('Discuss the private appointment findings')
    expect(on).toContain('## Private / Sexual Health')
    expect(compose(withPlans, 'quiet-fortnight').text).not.toContain(
      'Discuss the private appointment findings',
    )
  })

  it('keeps the public record whole, and says what it was worked out from', () => {
    const text = compose(withPlans, 'quiet-fortnight').text
    // The public sections are all still there and still populated.
    expect(text).toMatch(/- Store: \d+ records?, \d+ entit/)
    expect(text).toContain('Things the app knows it does not know:')
    expect(text).toContain('Recent record')
    expect(text).toMatch(/- Records still standing after corrections: \d+/)
    // And the reader is told, before any of it, that the app itself reads more.
    const said = text.indexOf('Everything below is worked out from the part of the record')
    expect(said, 'the document should say what it was composed from').toBeGreaterThan(-1)
    expect(said).toBeLessThan(text.indexOf('## Where things stand'))
  })

  it('leaves the owner’s own record untouched', () => {
    /*
     * The repair QA forbade, asserted rather than promised. Discretion is a
     * display decision and never a storage decision (section 11): withholding
     * happens in a copy the composer makes, and the store it was made from
     * still holds everything.
     */
    const snapshot = parse(withPlans)
    expect(snapshot.records.some(isWithheldRecord)).toBe(true)
    expect(snapshot.entities.some(isWithheldEntity)).toBe(true)
    const scoped = withheldFrom(snapshot)
    expect(scoped, 'this history has something to withhold').toBeDefined()
    expect(snapshot.records.some(isWithheldRecord), 'the original was mutated').toBe(true)
  })

  it('still reports an unreadable row whose area nobody can know', () => {
    // The accepted exception, and the half of it that must not be lost: a row
    // that could not be placed in an area is a storage fault, not a private
    // one, and hiding it behind a privacy promise would be the other defect.
    const text = compose(
      { ...original, records: [...original.records, { id: 'broken', value: 42 }] },
      'quiet-fortnight',
    ).text
    expect(text).toContain('1 unreadable row')
  })
})

// ---------------------------------------------------------------------------
// The predicate itself, against a second member of each of its classes
// ---------------------------------------------------------------------------

describe('what counts as withheld reads both facts, in both shapes', () => {
  const base = fixture('quiet-fortnight')
  const kit = createKit('qa82r5-predicate', base.zone, '2026-01-01T00:00:00Z')
  const at = instant(base.now - 60_000)

  it('withholds on the class alone, and on the area alone', () => {
    /*
     * Two facts, either sufficient, and a fix written against one of them
     * passes every assertion about the other. Round 5's energy record is the
     * first shape — private class, ordinary area — and it is the one a rule
     * about the private *domain* never sees.
     */
    const byClass = kit.record(
      'observation',
      { occurredAt: at, domains: [DOMAIN.health], privacy: 'private' },
      { concept: CONCEPT.energy, method: 'self-report', value: { type: 'scale', value: 1, of: 5 } },
    )
    /*
     * The area-only shape has its class overridden after the factory, because
     * `kit.record` derives one from the other and would hand back a record
     * that is both. That is right for anything the app writes and says
     * nothing about what may arrive: a legacy import or a hand-edited backup
     * can carry an area without the matching class, and the predicate is what
     * decides whether that leaks.
     */
    const byArea = {
      ...kit.record(
        'observation',
        { occurredAt: at, domains: [DOMAIN.privateHealth] },
        {
          concept: CONCEPT.privatePattern,
          method: 'self-report',
          value: { type: 'text', value: 'something' },
        },
      ),
      privacy: 'normal' as const,
    }
    expect(isWithheldRecord(byClass)).toBe(true)
    expect(isWithheldRecord(byArea)).toBe(true)
    expect(byClass.domains, 'the first must not also name the area').not.toContain(
      DOMAIN.privateHealth,
    )

    expect(
      isWithheldEntity(
        kit.entity({ kind: 'goal', label: 'x', domain: DOMAIN.home, privacy: 'private' }),
      ),
    ).toBe(true)
    expect(
      isWithheldEntity(
        kit.entity({ kind: 'goal', label: 'x', domain: DOMAIN.privateHealth, privacy: 'normal' }),
      ),
    ).toBe(true)
    expect(
      isWithheldEntity(
        kit.entity({ kind: 'goal', label: 'x', domain: DOMAIN.home, privacy: 'normal' }),
      ),
    ).toBe(false)
  })

  it('reads an unreadable row’s claim in every shape it can arrive in', () => {
    /*
     * A record's areas are plural and an entity's is singular, and the
     * singular went unread — Round 5 reached it with a malformed entity saying
     * `domain: private-health`, which was counted anyway.
     */
    const row = (raw: unknown) => ({ index: 0, issues: [], raw })
    expect(claimsWithheld(row({ privacy: 'private' }))).toBe(true)
    expect(claimsWithheld(row({ domain: DOMAIN.privateHealth }))).toBe(true)
    expect(claimsWithheld(row({ domains: [DOMAIN.privateHealth] }))).toBe(true)
    // And the one-way trust: a row that says nothing about its area is still
    // reported, because nobody can place it.
    expect(claimsWithheld(row({ value: 42 }))).toBe(false)
    expect(claimsWithheld(row('not an object'))).toBe(false)
  })

  it('says there is nothing to withhold rather than copying the store', () => {
    /*
     * `undefined` is the signal that the objects the owner's own screens are
     * rendering may be used unchanged. A version that always returned a copy
     * would recompute the whole engine on every export, and — worse — would
     * make the document's decision a second run of the app even when the two
     * runs must be identical.
     */
    const clean = parse(fixture('school-morning').build())
    expect(clean.records.some(isWithheldRecord)).toBe(false)
    expect(withheldFrom(clean)).toBeUndefined()
  })
})
