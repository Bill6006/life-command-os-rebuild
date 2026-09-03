import { describe, expect, it } from 'vitest'
import { CONCEPT, createConceptRegistry, type ConceptDefinition } from '../../src/domain/concepts'
import { coreDomains, DOMAIN } from '../../src/domain/domains'
import { newRecordId, type EntityId } from '../../src/domain/ids'
import { describeUnknown, unknown, type UnknownReason } from '../../src/domain/knowledge'
import { PRIVACY_CLASSES } from '../../src/domain/privacy'
import { recordToWire } from '../../src/domain/wire'
import { instant, type Instant } from '../../src/domain/time'
import { conceptId } from '../../src/domain/windows'
import { composeExport } from '../../src/features/export/compose'
import { SELECT_ALL, type ExportSectionId } from '../../src/features/export/sections'
import { assembleTimeline } from '../../src/features/timeline/timelineEntries'
import { decide } from '../../src/intelligence/engine'
import { insightsFor } from '../../src/intelligence/insights'
import { assembleSituation } from '../../src/intelligence/situation'
import { snapshotFromWire, type SnapshotWire } from '../../src/memory/snapshot'
import type { StoreSnapshot } from '../../src/memory/store'
import { buildView } from '../../src/memory/view'
import { createKit } from '../../src/synthetic/kit'
import { SCENARIOS, scenarioById } from '../../src/synthetic/scenarios'
import { COMPOSED_AT, COMPOSED_ZONE, TEST_APP } from './exportHarness'

/**
 * Phase 82, round 4 — what a document may say, and what it may say it does not
 * know.
 *
 * Two findings in one function, and they are not the same defect.
 *
 * **QA-82-007.** `diagnosticsSection` was the only section builder that ignored
 * the `ExportHeader` it was handed. Every other one asks the header what this
 * document is allowed to describe; this one read the store. With Private /
 * Sexual Health left out, the same history composed `19 records` where the
 * history without the private record composes `18`, and printed `Recent
 * private pattern — never answered`, which names the withheld area and states
 * that nothing is known in it. D-098 calls that participation, and calls it
 * the part of a private record that stays sensitive after the detail is
 * withheld. Diagnostics is reached by **Select all**, so the leak was on by
 * default for anyone who pressed one button.
 *
 * **QA-82-008.** The same loop printed `never answered` for every unknown,
 * discarding `Knowledge.reason`. Four of the six reasons sit on top of an
 * answer the record actually holds. A soreness reading given at 06:41 and
 * withdrawn at 06:55 produced one document that said `Withdrew an earlier
 * entry` under the recent record and `Soreness or pain — never answered` under
 * what the app does not know.
 *
 * ## How these are written, and why
 *
 * The privacy guards are **paired histories**: two stores differing by exactly
 * one private thing, composed with the private section off, asserted to
 * produce the same document. That is a property of the whole artefact rather
 * than of the section that happened to leak, so it covers the header, the
 * trace, the issue list and whatever section is added next — none of which the
 * defect was found in, and any of which could carry it.
 *
 * And each guard is exercised against a **second member of its class**, which
 * is the lesson DEF-0094 cost a round to learn: `family.child-here-now` was the
 * only derived concept, so an exclusion written against its id passed
 * everything. `private-health.recent-pattern` is likewise the only private
 * concept today. So the private cases below invent a second one, and invent a
 * private-classed concept filed under **Home** — which a fix written against
 * the private *domain* alone would still leak, exactly as a fix written
 * against one id would.
 */

// ---------------------------------------------------------------------------
// Composing, with a registry the test may extend
// ---------------------------------------------------------------------------

interface Moment {
  readonly now: Instant
  readonly zone: ReturnType<typeof scenarioMoment>['zone']
  readonly weekStartsOn: 1
}

function scenarioMoment(id: string) {
  const scenario = scenarioById(id)
  if (scenario === undefined) throw new Error(`no scenario "${id}"`)
  return { now: scenario.now, zone: scenario.zone, weekStartsOn: 1 as const, scenario }
}

function snapshotOf(document: SnapshotWire): StoreSnapshot {
  const loaded = snapshotFromWire(document)
  expect(loaded.loaded, 'the document should load').toBe(true)
  if (!loaded.loaded) throw new Error('unreachable')
  return loaded.snapshot
}

function loadedSnapshot(id: string): StoreSnapshot {
  return snapshotOf(scenarioMoment(id).scenario.build())
}

function composeText(
  snapshot: StoreSnapshot,
  moment: Moment,
  sections: readonly ExportSectionId[] = SELECT_ALL,
  concepts?: ReturnType<typeof createConceptRegistry>,
): string {
  const context = {
    now: moment.now,
    zone: moment.zone,
    weekStartsOn: moment.weekStartsOn,
    domains: coreDomains,
    ...(concepts === undefined ? {} : { concepts }),
  }
  const view = buildView(snapshot, context)
  const situation = assembleSituation(view, context)
  return composeExport({
    sections,
    situation,
    decision: decide(view, context),
    insights: insightsFor(situation),
    timeline: assembleTimeline(situation),
    source: 'laboratory',
    app: TEST_APP,
    composedAt: { at: COMPOSED_AT, zone: COMPOSED_ZONE },
  }).text
}

/** The lines one document has and the other does not, both ways round. */
function difference(left: string, right: string): readonly string[] {
  const a = left.split('\n')
  const b = right.split('\n')
  return [
    ...a.filter((line) => !b.includes(line)).map((line) => `only with: ${line}`),
    ...b.filter((line) => !a.includes(line)).map((line) => `only without: ${line}`),
  ]
}

/** A private record, taken from the one library history that holds one. */
function aPrivateRecord() {
  const snapshot = loadedSnapshot('quiet-fortnight')
  const record = snapshot.records.find((entry) => entry.privacy === 'private')
  expect(record, 'quiet-fortnight should still hold exactly one private record').toBeDefined()
  return record!
}

// ---------------------------------------------------------------------------
// QA-82-007 — an excluded area is excluded from the diagnostics too
// ---------------------------------------------------------------------------

describe('QA-82-007 — a private-off document says nothing about the private area', () => {
  it('composes the same document with the private record and without it', () => {
    /*
     * The finding's own reproduction, as a property rather than as two
     * expected strings. Anything the withheld record changes about the
     * document is a disclosure of it, whichever section carries the change.
     */
    const snapshot = loadedSnapshot('quiet-fortnight')
    const moment = scenarioMoment('quiet-fortnight')
    const withoutIt: StoreSnapshot = {
      ...snapshot,
      records: snapshot.records.filter((record) => record.privacy !== 'private'),
    }
    expect(snapshot.records.length - withoutIt.records.length).toBe(1)

    expect(
      difference(composeText(snapshot, moment), composeText(withoutIt, moment)),
      'the withheld record is observable from the document that withheld it',
    ).toEqual([])
  })

  it('holds for every history in the library, not only the one that has a private record', () => {
    /*
     * The same property, everywhere, with the private record **injected** into
     * histories that have none. One fixture holding one private observation is
     * a thin thing to rest a privacy contract on.
     */
    const donor = aPrivateRecord()
    const leaks: string[] = []

    for (const scenario of SCENARIOS) {
      const snapshot = snapshotOf(scenario.build())
      const moment = { now: scenario.now, zone: scenario.zone, weekStartsOn: 1 as const }
      const plain = snapshot.records.filter((record) => record.privacy !== 'private')
      const injected: StoreSnapshot = {
        ...snapshot,
        records: [
          ...plain,
          {
            ...donor,
            occurredAt: instant(scenario.now - 7_200_000),
            recordedAt: instant(scenario.now - 7_200_000),
          },
        ],
      }
      const found = difference(
        composeText(injected, moment),
        composeText({ ...snapshot, records: plain }, moment),
      )
      for (const line of found) leaks.push(`${scenario.id}: ${line}`)
    }

    expect(leaks, 'a withheld record changed a document that promised not to mention it').toEqual(
      [],
    )
  })

  it('counts no private entity, and no unreadable row that says it is private', () => {
    /*
     * Two siblings of the count the finding names, neither of which the
     * library reaches. An entity is a subject rather than an entry, and an
     * unreadable row is the one thing whose area is genuinely unknown — so the
     * row is trusted **only to withhold**: a row claiming to be private is not
     * counted, and one saying nothing about its area still is, because
     * dropping that would hide a storage fault behind a privacy promise.
     */
    const base = scenarioMoment('quiet-fortnight')
    const kit = createKit('qa82r4-entity', base.zone, '2026-01-01T00:00:00.000Z')
    const snapshot = loadedSnapshot('quiet-fortnight')

    const withEntity: StoreSnapshot = {
      ...snapshot,
      entities: [
        ...snapshot.entities,
        kit.entity({
          kind: 'person',
          label: 'A subject in the withheld area',
          domain: DOMAIN.privateHealth,
          privacy: 'private',
          createdAt: instant(base.now - 86_400_000),
        }),
      ],
    }
    expect(
      difference(composeText(withEntity, base), composeText(snapshot, base)),
      'a private entity was counted in a document that leaves the area out',
    ).toEqual([])

    const wire = base.scenario.build()
    const withBrokenPrivateRow = snapshotOf({
      ...wire,
      records: [...wire.records, { id: 'broken-private', privacy: 'private', value: 42 }],
    })
    expect(withBrokenPrivateRow.malformed.length).toBe(1)
    expect(
      difference(composeText(withBrokenPrivateRow, base), composeText(snapshot, base)),
      'an unreadable row that says it is private was counted anyway',
    ).toEqual([])

    const withBrokenOrdinaryRow = snapshotOf({
      ...wire,
      records: [...wire.records, { id: 'broken-ordinary', value: 42 }],
    })
    expect(
      composeText(withBrokenOrdinaryRow, base),
      'a row nobody can read cannot be placed in an area, and must still be counted',
    ).toContain('1 unreadable row')
  })

  it('reports no tangle that only a withheld record is in', () => {
    /*
     * This exists because the reintroduction that removes the issue filter
     * **passed** against every guard above it.
     *
     * No library history has a supersession problem involving a private
     * record, so the issue list could be left reading the whole history and
     * nothing noticed. That is DEF-0094's shape one field over: a guard that
     * would not see the second member of its class, found by running the
     * mutation rather than by reading the test.
     *
     * The ids in an issue line are opaque, and they are not the disclosure.
     * The line's existence is: it says there is an entry in the area the
     * document has just promised to be silent about.
     */
    const base = scenarioMoment('quiet-fortnight')
    const snapshot = loadedSnapshot('quiet-fortnight')
    const donor = aPrivateRecord()
    const plain = snapshot.records.filter((record) => record.privacy !== 'private')

    const tangled = {
      ...donor,
      supersedes: newRecordId((count) => new Uint8Array(count).fill(7)),
    }
    const withTangle: StoreSnapshot = { ...snapshot, records: [...plain, tangled] }
    const view = buildView(withTangle, base)
    expect(
      view.history.issues.map((issue) => issue.problem),
      'the constructed case should reach the issue list',
    ).toContain('dangling-supersedes')

    expect(
      difference(composeText(withTangle, base), composeText({ ...snapshot, records: plain }, base)),
      'a withheld record was reported through the entry it fails to replace',
    ).toEqual([])
  })

  it('names no private concept, and not merely the one private concept there is', () => {
    /*
     * DEF-0094's lesson, applied to privacy. `private-health.recent-pattern`
     * is the only private concept today, so a fix written against its id or
     * its label passes every assertion above this one.
     */
    const base = scenarioMoment('settled-evening')
    const snapshot = loadedSnapshot('settled-evening')
    const second = conceptId('made.up-private')
    const definition: ConceptDefinition = {
      id: second,
      label: 'A second private matter',
      domain: DOMAIN.privateHealth,
      freshness: { unit: 'durable' },
      privacy: 'private',
      ask: { materialToDecision: false, askWhenStale: false },
      purpose: 'a concept invented by a fixture',
    }
    const text = composeText(
      snapshot,
      base,
      SELECT_ALL,
      createConceptRegistry().extendedWith([definition]),
    )
    expect(text, 'a second private concept was named in a private-off document').not.toContain(
      'A second private matter',
    )
  })

  it('withholds a private concept filed outside the private area', () => {
    /*
     * And the mutation a domain-only fix survives. A concept carries two
     * privacy facts — the area it belongs to and its own class — and either
     * is enough. Written against the domain alone, every assertion about the
     * private *area* still passes while this leaks.
     */
    const base = scenarioMoment('settled-evening')
    const snapshot = loadedSnapshot('settled-evening')
    const elsewhere = conceptId('made.up-private-elsewhere')
    const text = composeText(
      snapshot,
      base,
      SELECT_ALL,
      createConceptRegistry().extendedWith([
        {
          id: elsewhere,
          label: 'A private matter filed elsewhere',
          domain: DOMAIN.home,
          freshness: { unit: 'durable' },
          privacy: 'private',
          ask: { materialToDecision: false, askWhenStale: false },
          purpose: 'a concept invented by a fixture',
        },
      ]),
    )
    expect(
      text,
      'a private-classed concept in an ordinary area was named in a private-off document',
    ).not.toContain('A private matter filed elsewhere')
  })

  it('still says the counts, and still says what it is not counting', () => {
    /*
     * The half an over-broad fix would break. Diagnostics exists so somebody
     * can review how the app is tuned; a section that answered the privacy
     * finding by reporting nothing would honour the exclusion by destroying
     * the thing being excluded from.
     */
    const text = composeText(loadedSnapshot('quiet-fortnight'), scenarioMoment('quiet-fortnight'))
    expect(text).toMatch(/- Store: \d+ records?, \d+ entit/)
    expect(text).toMatch(/- Records still standing after corrections: \d+/)
    expect(text).toMatch(/- Local days covered: \d+; local weeks: \d+/)
    expect(text).toContain('Things the app knows it does not know:')
    // Stated before the figures, not after them — D-098's other half.
    const qualifier = text.indexOf('Every count below is of the part of the record')
    expect(qualifier, 'the exclusion should be declared inside diagnostics').toBeGreaterThan(-1)
    expect(qualifier).toBeLessThan(text.indexOf('- Records still standing after corrections:'))
  })

  it('gives all of it back when the owner asks for it deliberately', () => {
    /*
     * The exclusion is the owner's choice, and turning it on must restore the
     * detail *and* the metadata. A repair that withheld private facts from the
     * owner's own document would be the opposite defect.
     */
    const snapshot = loadedSnapshot('quiet-fortnight')
    const base = scenarioMoment('quiet-fortnight')
    const off = composeText(snapshot, base)
    const on = composeText(snapshot, base, [...SELECT_ALL, 'private'])

    expect(on).toContain('## Private / Sexual Health')
    expect(on).toContain('Recent private pattern')
    expect(on).toContain(`- Store: ${snapshot.records.length} records`)
    expect(off).not.toContain(`- Store: ${snapshot.records.length} records`)
    expect(off).not.toContain('Recent private pattern')
    // And with it on, the qualifier has nothing to qualify.
    expect(on).not.toContain('Every count below is of the part of the record')
  })

  it('leaves the owner’s own raw memory alone', () => {
    /*
     * The repair QA explicitly forbade. Discretion is a display decision and
     * never a storage decision (section 11): the private record is still in
     * the store, still resolves, and still reaches the fact layer. What
     * changed is one document's account of it.
     */
    const snapshot = loadedSnapshot('quiet-fortnight')
    const base = scenarioMoment('quiet-fortnight')
    const view = buildView(snapshot, base)
    expect(snapshot.records.some((record) => record.privacy === 'private')).toBe(true)
    expect(view.facts.get(CONCEPT.privatePattern)?.knowledge.state).not.toBe('unknown')
  })
})

// ---------------------------------------------------------------------------
// QA-82-008 — not knowing has six reasons, and they are not one sentence
// ---------------------------------------------------------------------------

describe('QA-82-008 — the document says why it does not know', () => {
  const REASONS: readonly UnknownReason[] = [
    'never-observed',
    'retracted',
    'contradicted',
    'lapsed',
    'not-applicable',
    'malformed',
  ]

  it('reads every reason as a different thing', () => {
    const read = REASONS.map((reason) => describeUnknown(unknown(reason)))
    expect(new Set(read).size, 'two reasons share one sentence').toBe(REASONS.length)
    // Only the one that means it may say it.
    for (const reason of REASONS) {
      const sentence = describeUnknown(unknown(reason))
      expect(sentence.includes('never answered')).toBe(reason === 'never-observed')
    }
  })

  it('keeps the specifics the fact layer left, and the future-only note', () => {
    expect(describeUnknown(unknown('contradicted', '2 records disagree at the same moment'))).toBe(
      'answered more than once, and nothing separates the answers (2 records disagree at the same moment)',
    )
    // A concept whose only record is dated tomorrow genuinely has never been
    // answered, and the note is what stops that reading as an empty life.
    const text = composeText(loadedSnapshot('mostly-unknown'), scenarioMoment('mostly-unknown'))
    expect(text).toContain(
      'Cash buffer — never answered (the only records for this are in the future)',
    )
  })

  it('never calls a withdrawn answer one that was never given', () => {
    /*
     * The finding's exact reproduction. `mostly-unknown` states soreness at
     * 06:41 and withdraws it at 06:55; the document that prints the withdrawal
     * called the same concept never answered five sections later.
     */
    const text = composeText(loadedSnapshot('mostly-unknown'), scenarioMoment('mostly-unknown'))
    expect(text).toContain('Withdrew an earlier entry')
    expect(text).toContain('Soreness or pain — answered once, and the answer was withdrawn')
    expect(text).not.toContain('Soreness or pain — never answered')
  })

  it('never says it of any library history, for any reason but the one', () => {
    /*
     * The class, over every scenario and every concept: a document may say
     * "never answered" only where the fact layer says `never-observed`.
     */
    const offenders: string[] = []
    for (const scenario of SCENARIOS) {
      const snapshot = snapshotOf(scenario.build())
      const moment = { now: scenario.now, zone: scenario.zone, weekStartsOn: 1 as const }
      const view = buildView(snapshot, moment)
      const reasons = new Map<string, UnknownReason>()
      for (const entry of view.facts.inState('unknown')) {
        if (entry.knowledge.state === 'unknown') {
          reasons.set(entry.definition.label, entry.knowledge.reason)
        }
      }
      for (const line of composeText(snapshot, moment).split('\n')) {
        const found = /^- (.+?) — never answered/.exec(line)
        if (found === null) continue
        const reason = reasons.get(found[1]!.trim())
        if (reason !== undefined && reason !== 'never-observed') {
          offenders.push(`${scenario.id}: "${line.trim()}" is ${reason}`)
        }
      }
    }
    expect(offenders, 'a document rewrote a reason as never having been asked').toEqual([])
  })

  it('reaches contradicted, lapsed and malformed through real records', () => {
    /*
     * Three reasons the library never produces, built the way the fact layer
     * actually reaches them rather than by handing it a `Knowledge` — a test
     * that injects the state proves the sentence and not the path to it.
     */
    const base = scenarioMoment('mostly-unknown')
    const snapshot = loadedSnapshot('mostly-unknown')
    const soreness = snapshot.records.find(
      (record) => record.kind === 'observation' && record.concept === CONCEPT.soreness,
    )
    expect(soreness).toBeDefined()
    if (soreness === undefined || soreness.kind !== 'observation') throw new Error('unreachable')

    const contradicted: StoreSnapshot = {
      ...snapshot,
      records: [
        soreness,
        {
          ...soreness,
          id: `${soreness.id}b` as typeof soreness.id,
          value: { type: 'scale', value: 2, of: 5 },
        },
      ],
    }
    const lapsed: StoreSnapshot = {
      ...snapshot,
      records: [
        {
          ...soreness,
          kind: 'context',
          durability: 'situational',
          validFrom: soreness.occurredAt,
          validUntil: instant(base.now - 60_000),
        } as never,
      ],
    }
    const wire = base.scenario.build()
    const malformed = snapshotOf({
      ...wire,
      records: [{ ...recordToWire(soreness), value: { type: 'not-a-value' } }],
    })
    expect(malformed.malformed.length).toBe(1)

    const cases = [
      ['contradicted', contradicted, 'answered more than once, and nothing separates the answers'],
      ['lapsed', lapsed, 'answered for a period that has since ended'],
      ['malformed', malformed, 'unreadable'],
    ] as const

    for (const [reason, store, sentence] of cases) {
      const view = buildView(store, base)
      const knowledge = view.facts.knowledgeFor(CONCEPT.soreness)
      expect(knowledge.state, `${reason}: the fact layer should reach it`).toBe('unknown')
      if (knowledge.state !== 'unknown') throw new Error('unreachable')
      expect(knowledge.reason).toBe(reason)
      const text = composeText(store, base)
      expect(text, `${reason}: the document should read it as itself`).toContain(
        `Soreness or pain — ${sentence}`,
      )
      expect(text).not.toContain('Soreness or pain — never answered')
    }
  })

  it('leaves the honest unknown list full', () => {
    /*
     * The half an over-broad fix would break, and the one that would be
     * silent: fewer questions asked, and an export that reads as a life with
     * no gaps in it. Naming a reason must not remove a line.
     */
    const snapshot = loadedSnapshot('mostly-unknown')
    const moment = scenarioMoment('mostly-unknown')
    const view = buildView(snapshot, moment)
    const answerable = view.facts
      .inState('unknown')
      .filter((entry) => entry.definition.privacy !== 'private')

    const text = composeText(snapshot, moment)
    expect(answerable.length).toBeGreaterThan(5)
    for (const entry of answerable) {
      expect(text, `${entry.definition.label} fell out of the unknown list`).toContain(
        `- ${entry.definition.label} — `,
      )
    }
  })

  it('says the same thing on Insights as in the document', () => {
    /*
     * The sibling QA did not name, found by asking who else turns "no
     * evidence" into a sentence. `coverageCards` reads `lastEvidenceAt`, which
     * is undefined for **every** unknown reason and not only for the one that
     * means nobody ever asked — so a standing concept the owner answered and
     * withdrew, inside an area quiet for some other reason, read there as one
     * he had never been asked about.
     *
     * The library never reaches it: an area is only neglected through a stale
     * standing concept, and the domains that have one have only one. So the
     * case is built — career is already quiet in `career-gone-quiet`, and a
     * second standing career concept is invented, stated, and withdrawn.
     */
    const base = scenarioMoment('career-gone-quiet')
    const invented = conceptId('made.up-standing-career')
    const registry = createConceptRegistry().extendedWith([
      {
        id: invented,
        label: 'A second career matter',
        domain: DOMAIN.career,
        freshness: { unit: 'local-days', days: 7 },
        privacy: 'normal',
        standing: true,
        ask: { materialToDecision: false, askWhenStale: true },
        purpose: 'a concept invented by a fixture',
      },
    ])

    const kit = createKit('qa82r4-career', base.zone, '2026-01-01T00:00:00.000Z')
    const stated = kit.record(
      'observation',
      { occurredAt: instant(base.now - 3_600_000), domains: [DOMAIN.career] },
      { concept: invented, value: { type: 'text', value: 'subnetting' }, method: 'self-report' },
    )
    const withdrawn = kit.record(
      'correction',
      { occurredAt: instant(base.now - 1_800_000), domains: [DOMAIN.career] },
      { corrects: stated.id, reason: 'Tapped the wrong row' },
    )
    const wire = base.scenario.build()
    const snapshot = snapshotOf({
      ...wire,
      records: [...wire.records, recordToWire(stated), recordToWire(withdrawn)],
    })

    const context = { ...base, domains: coreDomains, concepts: registry }
    const view = buildView(snapshot, context)
    const situation = assembleSituation(view, context)

    const knowledge = view.facts.knowledgeFor(invented)
    expect(knowledge.state).toBe('unknown')
    expect(knowledge.state === 'unknown' && knowledge.reason).toBe('retracted')

    const lines = insightsFor(situation)
      .insights.flatMap((card) => card.evidence?.included ?? [])
      .map((line) => line.text)
    const mine = lines.filter((text) => text.startsWith('A second career matter'))
    expect(mine, 'the constructed case should reach the coverage card').not.toEqual([])
    expect(mine).toContain('A second career matter — answered once, and the answer was withdrawn')
    expect(mine).not.toContain('A second career matter — never answered')
  })
})

// ---------------------------------------------------------------------------
// The registry the guards above rest on
// ---------------------------------------------------------------------------

describe('the facts these guards are written against', () => {
  it('still has exactly one private concept, which is why the second is invented', () => {
    /*
     * If a second private concept is ever registered, the invented ones above
     * stop being the only members of their class and this line should be
     * revisited — but the guards keep working either way, which is the point
     * of writing them against the class rather than the id.
     */
    const registered = createConceptRegistry()
      .all()
      .filter((definition) => definition.privacy === 'private')
    expect(registered.map((definition) => definition.id)).toEqual([CONCEPT.privatePattern])
  })

  it('names every privacy class, so a new one cannot be quietly ordinary', () => {
    expect([...PRIVACY_CLASSES]).toEqual([
      'normal',
      'sensitive',
      'private',
      'child-family-sensitive',
    ])
  })

  it('has no entity the export would have to guess about', () => {
    // `SemanticEntity` carries both facts the concept predicate reads, so the
    // entity count can be scoped the same way rather than by a second rule.
    const entity = loadedSnapshot('quiet-fortnight').entities[0]
    expect(entity).toBeDefined()
    expect(typeof entity!.privacy).toBe('string')
    expect(typeof entity!.domain).toBe('string')
    expect(entity!.id as EntityId).toBeDefined()
  })
})
