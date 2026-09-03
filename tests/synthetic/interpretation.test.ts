import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep, posix } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DOMAIN, coreDomains, type LifeDomainId } from '../../src/domain/domains'
import {
  NO_PERMISSIONS,
  mayRaiseUnasked,
  mayReasonFrom,
  type PermissionState,
} from '../../src/domain/privacy'
import { evidenceSourceOf, isOwnerStated } from '../../src/domain/records'
import { milestoneEntityKind, milestoneQuestion } from '../../src/intelligence/authoring'
import { generateCandidates } from '../../src/intelligence/candidates'
import { assembleSituation } from '../../src/intelligence/situation'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { describeDestination, missingParts } from '../../src/intelligence/destinations'
import { outstandingPrompts } from '../../src/intelligence/discovery'
import {
  READABLE_AREAS,
  aimReadingRecord,
  describeOffer,
  describeReading,
  interpreterInput,
  readAim,
  readingFor,
} from '../../src/intelligence/interpret'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { openJourney, type JourneyApp } from './journey'

/**
 * Routing 91 — semantic capture and clarification, against the record.
 *
 * ## What this file is, and what it is not
 *
 * It is the **synthetic** half of the phase's gate: byte-identity across the
 * whole copy library, `provenance: 'derived'` on every derived row, the digest
 * assertion that private material never reaches the interpreter, the
 * adversarial phrases, and the null case. `tests/browser/phase91.spec.ts` is the
 * other half, and neither substitutes for the other (`PRODUCT_ADJUDICATION_2.md`
 * §6.1): synthetic proves the engine reasons correctly over evidence,
 * ordinary-owner proves the evidence can be created at all.
 *
 * ## Every negative here has a positive beside it — D-238
 *
 * Routing 90 spent three QA rounds on instrument defects, and its second
 * corollary is that *a negative claim needs an instrument that could have
 * returned a positive*. This phase is full of negatives — *no derived record
 * was written*, *no private text reached the interpreter*, *no clarification is
 * offered*. So each of them is written as a **pair**: the same probe, on the
 * same store, in the state where it must find something, and then in the state
 * where it must not.
 */

const CAREER_PROMPT = 'aspiration.career'
const AIM = 'More money'

/** The near-empty history D-161 starts from: one reading, and nothing else. */
async function firstEvening(): Promise<JourneyApp> {
  const app = await openJourney('the-first-evening')
  expect(app.agenda().prompt?.id, 'the first question is the Career aspiration').toBe(CAREER_PROMPT)
  return app
}

function kindsOn(app: JourneyApp): readonly string[] {
  return app.snapshot().records.map((record) => record.kind)
}

function aimReadings(app: JourneyApp) {
  return app.snapshot().records.filter((record) => record.kind === 'aim-reading')
}

function destinationRecordsOn(app: JourneyApp) {
  return app.snapshot().records.filter((record) => record.kind === 'destination')
}

// ---------------------------------------------------------------------------
// The eight CASE A acceptance tests — ROUTING_91_BRIEF.md section 3
// ---------------------------------------------------------------------------

describe('CASE A 1 — “More money” under the Career question names Money', () => {
  it('reads Money out of the words, and the word that named it', async () => {
    const app = await firstEvening()
    const reading = app.discoveryReading(AIM)

    expect(reading?.askedIn, 'the question was about Career').toBe(DOMAIN.career)
    expect(reading?.names.map((area) => area.domain)).toEqual([DOMAIN.money])
    expect(reading?.names[0]?.by, 'and it says which word did it').toEqual(['money'])
    expect(reading?.elsewhere).toBe(DOMAIN.money)
  })

  it('offers to file it there and files it in Career until he says so', async () => {
    const app = await firstEvening()
    const reading = app.discoveryReading(AIM)!
    const offer = describeOffer(reading, (id) => coreDomains.labelFor(id))

    expect(offer?.keep).toBe('Keep it in Career & Learning')
    expect(offer?.options.map((option) => option.label)).toEqual([
      'File it in Money & Financial Resilience instead',
    ])
    expect(offer?.asking, 'a settled reading is not asking anything').toBe(false)

    /*
     * The default is the app having changed nothing — the brief's rule 4.
     *
     * Answering without taking the offer is the ordinary press of "That is it",
     * and what it writes is what routing 84 wrote.
     */
    await app.answerDiscovery(AIM)
    expect(destinationRecordsOn(app)[0]?.domains).toEqual([DOMAIN.career])
  })

  it('files it in Money when he takes the offer, and never before', async () => {
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    expect(destinationRecordsOn(app)[0]?.domains).toEqual([DOMAIN.money])
  })

  it('offers nothing where the area he was asked about leads on the words', async () => {
    /*
     * Manufacturing a doubt is the same fault as asserting a reading, pointing
     * the other way.
     *
     * These words mention money once and are about Career three times over. The
     * honest answer is that nothing else was named strongly enough to be worth
     * a question — so there is no reading line, no option row, and the aim is
     * filed where it was asked without anyone being asked anything.
     */
    const app = await firstEvening()
    const reading = app.discoveryReading('Get qualified and study for the exams so I earn more')!

    expect(reading.names.map((area) => area.domain)).toEqual([DOMAIN.career, DOMAIN.money])
    expect(reading.offer).toBeUndefined()
    expect(reading.elsewhere).toBeUndefined()
    expect(reading.undecided, 'the app is not uncertain here').toBe(false)
    expect(describeReading(reading, (id) => coreDomains.labelFor(id))).toBeUndefined()
    expect(
      reading.unknowns,
      'and it still says what the words did not settle about the money half',
    ).toEqual(['how much', 'by when'])
  })

  it('offers nothing at all where two areas other than the asked one tie', async () => {
    /*
     * The half a reintroduction found missing.
     *
     * With one candidate the offer is the question; with two there is no single
     * question to put, and picking one by registry order would be resolving an
     * ambiguity by alphabet — which is the thing the tie-break refusal exists to
     * stop and which nothing was holding it to.
     */
    const app = await firstEvening()
    const reading = app.discoveryReading('Get fit and get out of debt')!

    expect(reading.names.map((area) => area.domain).sort()).toEqual(
      [DOMAIN.health, DOMAIN.money].sort(),
    )
    expect(reading.offer, 'two candidates, so no option row').toBeUndefined()
    expect(reading.elsewhere).toBeUndefined()
    expect(reading.undecided).toBe(true)
    expect(reading.unknowns[0]).toBe('which area this belongs to')
    expect(describeOffer(reading, (id) => coreDomains.labelFor(id))).toBeUndefined()
    expect(describeReading(reading, (id) => coreDomains.labelFor(id))).toBe(
      'These words point at Health & Physical Capacity and Money & Financial Resilience — the app has not decided which.',
    )
  })

  it('says it has not decided where two areas are named equally', async () => {
    /*
     * The *"or asks which"* half of acceptance test 1, and the reason `offer`
     * and `elsewhere` are two fields: there is no confident reading here, and
     * there is still exactly one question worth putting.
     */
    const app = await firstEvening()
    const reading = app.discoveryReading('Get properly qualified so I can earn more')!

    expect(reading.names.map((area) => area.domain).sort()).toEqual(
      [DOMAIN.career, DOMAIN.money].sort(),
    )
    expect(reading.undecided, 'neither area leads').toBe(true)
    expect(reading.elsewhere, 'so nothing is read as being about somewhere else').toBeUndefined()
    expect(reading.offer, 'and the one question left is which of the two').toBe(DOMAIN.money)
    expect(reading.unknowns[0]).toBe('which area this belongs to')
  })
})

describe('CASE A 2 — the words survive, and a derived meaning is a separate row', () => {
  it('stores the aim byte-identically, on both branches', async () => {
    for (const takeOffer of [false, true]) {
      const app = await firstEvening()
      await app.answerDiscovery(AIM, takeOffer)
      const stored = destinationRecordsOn(app)[0]
      expect(stored?.kind === 'destination' ? stored.aim : undefined).toBe(AIM)
    }
  })

  it('writes the reading as its own row, pointing at the row that holds his words', async () => {
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)

    const aim = destinationRecordsOn(app)[0]!
    const [read, ...rest] = aimReadings(app)
    expect(rest, 'one reading, not one per word').toEqual([])
    expect(read?.kind === 'aim-reading' ? read.reads : undefined).toBe(aim.id)
    expect(read?.kind === 'aim-reading' ? read.named : undefined).toBe(DOMAIN.money)
    expect(read?.kind === 'aim-reading' ? read.askedIn : undefined).toBe(DOMAIN.career)
  })

  it('marks it derived, so nothing downstream can read it as something he said', async () => {
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    const read = aimReadings(app)[0]!

    expect(read.provenance.source).toBe('derived')
    expect(evidenceSourceOf(read)).toBe('derived')
    expect(isOwnerStated(read), 'he did not say this; the app worked it out').toBe(false)

    // The positive beside it: the row holding his words is his.
    const aim = destinationRecordsOn(app)[0]!
    expect(isOwnerStated(aim)).toBe(true)
  })
})

describe('CASE A 3 — ambiguity is declared rather than resolved', () => {
  it('names an amount, a horizon and income-versus-savings for a two-word aim', async () => {
    const app = await firstEvening()
    expect(app.discoveryReading(AIM)?.unknowns).toEqual([
      'how much',
      'by when',
      'whether this is about earning more or keeping more of it',
    ])
  })

  it('drops each one as the words answer it, rather than listing it regardless', async () => {
    /*
     * What makes this a reading and not a canned list.
     *
     * Each unknown is here because a predicate over the text returned false, so
     * a phrase that answers one loses it — and a phrase that answers all three
     * has an empty list, which is the whole of the null case below.
     */
    const app = await firstEvening()
    expect(app.discoveryReading('More money')?.unknowns).toContain('how much')
    expect(app.discoveryReading('£3000 more')?.unknowns).not.toContain('how much')
    expect(app.discoveryReading('More money')?.unknowns).toContain('by when')
    expect(app.discoveryReading('More money by December')?.unknowns).not.toContain('by when')
    expect(app.discoveryReading('More money')?.unknowns).toContain(
      'whether this is about earning more or keeping more of it',
    )
    expect(app.discoveryReading('Earn more')?.unknowns).not.toContain(
      'whether this is about earning more or keeping more of it',
    )
    expect(app.discoveryReading('Save £3000 by December')?.unknowns).toEqual([])
  })

  it('carries the words-half above the object-half in the proposal it renders', async () => {
    const app = await firstEvening()
    const proposal = app.discoveryProposal(AIM, true)!

    expect(proposal.unknowns.slice(0, 3)).toEqual([
      'how much',
      'by when',
      'whether this is about earning more or keeping more of it',
    ])
    expect(proposal.unknowns, 'and D-188’s three are still all there').toEqual(
      expect.arrayContaining([
        'what the next step towards it is',
        'where you are starting from',
        'what would count as getting somewhere',
      ]),
    )
  })

  it('says out loud that the aim is going somewhere other than the question', async () => {
    const app = await firstEvening()
    expect(app.discoveryProposal(AIM, true)?.creates).toContain(
      'it in Money & Financial Resilience rather than Career & Learning, which is where the question was',
    )
    expect(
      app.discoveryProposal(AIM, false)?.creates,
      'and says nothing of the sort when it is not',
    ).not.toContain(
      'it in Money & Financial Resilience rather than Career & Learning, which is where the question was',
    )
  })
})

describe('CASE A 4 — exactly one follow-up, and it is the area’s own question', () => {
  it('asks for a money thing after the reading, and for a next step without one', async () => {
    const read = await firstEvening()
    await read.answerDiscovery(AIM, true)
    expect(read.agenda().prompt?.prompt).toBe(
      'What is the money thing you would deal with first, towards “More money”?',
    )

    const kept = await firstEvening()
    await kept.answerDiscovery(AIM)
    expect(kept.agenda().prompt?.prompt).toBe('What would be the next step towards “More money”?')
  })

  it('puts one question, not three, with three unknowns outstanding', async () => {
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    const about = app.agenda().outstanding.filter((prompt) => prompt.destination?.aim === AIM)

    expect(about, 'one prompt about this aim').toHaveLength(1)

    const read = aimReadings(app)[0]
    expect(read?.kind).toBe('aim-reading')
    expect(
      read?.kind === 'aim-reading' ? read.unknowns : undefined,
      'while three things about it are on the record as not concluded',
    ).toHaveLength(3)
  })

  it('does not raise the weekly budget to make room for it', async () => {
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    expect(app.agenda().budget).toBe(2)
    await app.answerDiscovery('Clear the credit card')
    expect(app.agenda().askedThisWeek).toBe(2)
    expect(app.agenda().prompt, 'and the week is spent, exactly as before').toBeUndefined()
  })

  it('asks the question whose answer becomes the kind of thing that area consumes', () => {
    /*
     * Correction 3.6, closed where it can be checked.
     *
     * `milestoneEntityKind` decides what the answer becomes and
     * `milestoneQuestion` decides what he is asked for; keying both on one table
     * is what stops the pair drifting the way QA-84-008's Health confirmation
     * drifted from the generator it described.
     */
    expect(milestoneEntityKind(DOMAIN.money)).toBe('financial-goal')
    expect(milestoneQuestion(DOMAIN.money, 'X')).toContain('money thing')
    expect(milestoneEntityKind(DOMAIN.career)).toBe('learning-topic')
    expect(milestoneQuestion(DOMAIN.career, 'X')).toContain('learning or working on')
    expect(milestoneEntityKind(DOMAIN.health)).toBe('routine')
    expect(milestoneQuestion(DOMAIN.health, 'X')).toContain('actually do')
    expect(milestoneEntityKind(DOMAIN.faith)).toBe('goal')
    expect(milestoneQuestion(DOMAIN.faith, 'X')).toBe('What would be the next step towards “X”?')
  })
})

describe('CASE A 5 — declining costs nothing', () => {
  it('leaves the aim stored and writes no derived row of any kind', async () => {
    const app = await firstEvening()
    await app.answerDiscovery(AIM)

    expect(destinationRecordsOn(app)).toHaveLength(1)
    expect(aimReadings(app), 'nothing was derived').toEqual([])
    expect(
      app.snapshot().records.filter((record) => record.provenance.source === 'derived'),
      'and no row anywhere claims a non-owner author',
    ).toEqual([])
    expect(
      [...kindsOn(app)].sort(),
      'three records and no fourth — sorted, because two written in one moment have no order',
    ).toEqual(['destination', 'discovery-response', 'observation'])
  })

  it('and the same probe finds one the moment he accepts', async () => {
    /*
     * The positive control for the negative above — D-238.
     *
     * *"No derived record was written"* is worth nothing from a probe that
     * could not have found one. This is the same probe, on the same history,
     * one press different.
     */
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    expect(aimReadings(app)).toHaveLength(1)
    expect(
      app.snapshot().records.filter((record) => record.provenance.source === 'derived'),
    ).toHaveLength(1)
  })
})

describe('CASE A 6 — Now produces a move it did not produce before', () => {
  it('says nothing about money on a bare aim, however it is filed', async () => {
    for (const takeOffer of [false, true]) {
      const app = await firstEvening()
      await app.answerDiscovery(AIM, takeOffer)
      const decision = app.decision()
      expect(
        decision.evaluation?.candidate.semantics.domain,
        'correction 3.6: a destination with no milestone reaches no generator',
      ).toBeUndefined()
      expect(decision.noAction?.headline).toBeTruthy()
    }
  })

  it('offers a money move once the clarification is answered — the Money arm', async () => {
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    await app.answerDiscovery('Clear the credit card')

    const decision = app.decision()
    expect(decision.evaluation?.candidate.semantics.domain).toBe(DOMAIN.money)
    expect(decision.explanation?.rendered.sentence).toBe('Deal with Clear the credit card today.')
  })

  it('offers a career move on the same words when the reading is declined', async () => {
    /*
     * The control arm, and the point of the whole phase in one assertion.
     *
     * Same words, same store, same two presses — and the only difference is
     * whether he agreed with the reading. Declining sends *"More money"* down
     * the route routing 84 built, where the next step becomes what he is
     * studying. Neither arm is broken; they are different, and the difference
     * is the interpretation.
     */
    const app = await firstEvening()
    await app.answerDiscovery(AIM)
    await app.answerDiscovery('Clear the credit card')

    const decision = app.decision()
    expect(decision.evaluation?.candidate.semantics.domain).toBe(DOMAIN.career)
    expect(decision.explanation?.rendered.sentence).toContain('recalling Clear the credit card')
  })

  it('offers a career move from the Money page in the second area — the Career arm', async () => {
    /*
     * §6.3's *"(f) proved in two domains"*, and on the other authoring surface.
     *
     * The aspiration form on the Money page, a differently-shaped phrase, and a
     * different resolved area — so the interpreter is not one hard-coded case
     * and the seam is not on one screen.
     */
    const app = await firstEvening()
    const aim = 'Get qualified enough to be worth more'
    expect(app.destinationReading(DOMAIN.money, aim)?.offer).toBe(DOMAIN.career)

    await app.nameDestination({ aim, domain: DOMAIN.career }, DOMAIN.money)
    expect(app.agenda().prompt?.prompt).toBe(
      'What would you be learning or working on, towards “Get qualified enough to be worth more”?',
    )
    await app.answerDiscovery('Cloud engineering')

    const decision = app.decision()
    expect(decision.evaluation?.candidate.semantics.domain).toBe(DOMAIN.career)
    expect(decision.explanation?.rendered.sentence).toContain('Cloud engineering')
  })
})

describe('CASE A 7 — a cross-domain reading is confirmable and reversible', () => {
  it('is a reading the history stops carrying once it is taken back', async () => {
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)

    const destination = app.situation().direction.destinations[0]!.destination
    expect(
      readingFor(app.view(), destination, app.now()),
      'it stands before he takes it back',
    ).toBeDefined()

    const previous = aimReadings(app)[0]!
    await app.withdrawReading(destination)

    expect(
      readingFor(app.view(), destination, app.now()),
      'and does not afterwards',
    ).toBeUndefined()
    expect(
      app.snapshot().records.some((row) => row.id === previous.id),
      'while the row he agreed to is still on the record, unedited',
    ).toBe(true)
  })

  it('puts the aim back in the area the question was asked in, with his words untouched', async () => {
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    expect(app.situation().direction.destinations[0]?.domain).toBe(DOMAIN.money)

    await app.withdrawReading(app.situation().direction.destinations[0]!.destination)

    const back = app.situation().direction.destinations
    expect(back, 'one aim, not two').toHaveLength(1)
    expect(back[0]?.domain).toBe(DOMAIN.career)
    expect(back[0]?.aim, 'and it still reads exactly as he typed it').toBe(AIM)
  })

  it('respects a skip of the clarification after the reading is taken back', async () => {
    /*
     * Why the question keeps one id through both wordings — D-163.
     *
     * He was asked for a money thing and left it. Taking the reading back
     * changes how the app would word the question; it does not un-ask it. Two
     * ids would have meant nothing was settled against the plain wording, so
     * the same question would have arrived again in different clothes — which
     * is the shape of nag *"always skippable, and a skip is respected"* exists
     * to forbid.
     */
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    expect(app.agenda().prompt?.prompt).toContain('money thing')

    await app.skipDiscovery()
    expect(
      app.agenda().outstanding.find((prompt) => prompt.destination?.aim === AIM),
      'left, and not put again',
    ).toBeUndefined()

    await app.withdrawReading(app.situation().direction.destinations[0]!.destination)
    expect(
      app.agenda().outstanding.find((prompt) => prompt.destination?.aim === AIM),
      'and still not put again after the reading is withdrawn',
    ).toBeUndefined()
  })

  it('asks the un-read question about it again, in D-188’s own words', async () => {
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    expect(
      app.agenda().outstanding.find((prompt) => prompt.destination?.aim === AIM)?.prompt,
    ).toContain('money thing')

    await app.withdrawReading(app.situation().direction.destinations[0]!.destination)
    expect(app.agenda().outstanding.find((prompt) => prompt.destination?.aim === AIM)?.prompt).toBe(
      'What would be the next step towards “More money”?',
    )
  })
})

describe('CASE A 8 — private material never reaches the interpreter', () => {
  it('keeps a private name out of the digest, and the same probe finds a Money one', async () => {
    /*
     * Asserted on the digest, not on rendered copy — the brief's own wording.
     *
     * Two things the owner named, differing in exactly one property: the area
     * they are in, and therefore the privacy class they inherit. The probe finds
     * one and not the other, on one store, in one assertion pair.
     */
    const app = await firstEvening()
    await app.introduce({ kind: 'goal', name: 'Trelanwick', domain: DOMAIN.money })
    await app.introduce({ kind: 'goal', name: 'Kesterholt', domain: DOMAIN.privateHealth })

    const open = app.discoveryReading('Sort out Trelanwick')!
    expect(open.input.digest.map((source) => source.text)).toContain('Trelanwick')
    expect(
      open.names.map((area) => area.domain),
      'and it is read',
    ).toEqual([DOMAIN.money])

    const shut = app.discoveryReading('Sort out Kesterholt')!
    expect(shut.input.digest.map((source) => source.text)).not.toContain('Kesterholt')
    expect(shut.input.withheld, 'and the count says something was kept out').toBe(1)
    expect(shut.names, 'so nothing was read from it').toEqual([])
  })

  it('lets the same name through when the owner grants the permission', async () => {
    /*
     * The other half of the pair, and the one that proves the boundary is the
     * permission rather than a coincidence of this store.
     */
    const app = await firstEvening()
    await app.introduce({ kind: 'goal', name: 'Kesterholt', domain: DOMAIN.privateHealth })

    const withheld = interpreterInput(
      'Sort out Kesterholt',
      DOMAIN.career,
      app.situation().entities.all(),
      NO_PERMISSIONS,
    )
    expect(withheld.digest.map((source) => source.text)).not.toContain('Kesterholt')
    expect(withheld.withheld).toBe(1)

    const granted: PermissionState = { granted: () => true }
    const allowed = interpreterInput(
      'Sort out Kesterholt',
      DOMAIN.career,
      app.situation().entities.all(),
      granted,
    )
    expect(allowed.digest.map((source) => source.text)).toContain('Kesterholt')
    expect(allowed.withheld).toBe(0)
  })

  it('reads nothing but the words he typed on a store with nothing named in it', async () => {
    const app = await firstEvening()
    const reading = app.discoveryReading(AIM)!
    expect(reading.input.digest.map((source) => source.from)).toEqual(['typed'])
    expect(reading.input.digest[0]?.text).toBe(AIM)
  })

  it('never reads back the engine’s own vocabulary as something he named', async () => {
    /*
     * `STANDING_ENTITIES` are the five routines the engine may name for itself —
     * *a walk*, *winding down*. Reading one of those out of his words would be
     * the app quoting itself as evidence about his life.
     */
    const app = await firstEvening()
    const reading = app.discoveryReading('Go for a walk every evening')!
    expect(reading.input.digest.map((source) => source.text)).not.toContain('a walk')
    expect(
      reading.names[0]?.byOwnThing,
      'Health is named by the word, not by the engine’s own routine',
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// The synthetic contract — PRODUCT_ADJUDICATION_2.md §6.3
// ---------------------------------------------------------------------------

describe('91 synthetic — the words survive every phrase in the library', () => {
  /**
   * Every aim any shipped history holds, plus the adversarial ones.
   *
   * The library's own aspirations are what a real store contains; the rest are
   * the shapes §6.3 names by hand — empty, whitespace, a single character,
   * thousands of characters, mixed-domain and contradictory.
   */
  /*
   * **The library holds no `destination` record at all**, which is worth stating
   * rather than working around: routing 84 shipped the object and the shipped
   * histories predate it, so there is no corpus of stored *aims* to draw on.
   *
   * What the library does hold is the owner's own phrases in the two shapes
   * closest to an aim — every goal statement, and the label of every thing he
   * has named. Those are what a real store contains and what he would plausibly
   * type into this box, so those are what the byte-identity claim is made over.
   */
  const rows = (scenario: (typeof SCENARIOS)[number]) =>
    scenario.build().records as readonly ({ kind?: string; statement?: string } | null)[]

  const LIBRARY_AIMS = [
    ...SCENARIOS.flatMap((scenario) =>
      rows(scenario)
        .filter((record) => record !== null && record.kind === 'goal')
        .map((record) => record?.statement ?? ''),
    ),
    ...SCENARIOS.flatMap((scenario) =>
      (scenario.build().entities as readonly ({ label?: string } | null)[])
        .filter((entity) => entity !== null)
        .map((entity) => entity?.label ?? ''),
    ),
  ].filter((aim) => aim !== '')

  const ADVERSARIAL = [
    'x',
    'money',
    'MONEY',
    '  More money  ',
    'More money, more running, more studying',
    'Earn more and save more',
    'Not about money at all',
    '£',
    '“quoted”',
    'a'.repeat(4000),
    `${'money '.repeat(500)}`,
  ]

  it('is looking at real owner phrases, and at more than a handful of them', () => {
    expect(LIBRARY_AIMS.length, 'the library has owner phrases in it').toBeGreaterThan(30)
    expect(
      SCENARIOS.flatMap(rows).filter((record) => record?.kind === 'destination'),
      'and none of them is a destination, which is why goals and labels stand in',
    ).toEqual([])
  })

  it('reads every one of them without editing, throwing or reordering the words', () => {
    for (const aim of [...LIBRARY_AIMS, ...ADVERSARIAL, '', '   ', '\t\n']) {
      for (const askedIn of READABLE_AREAS) {
        const reading = readAim(interpreterInput(aim, askedIn, [], NO_PERMISSIONS))
        expect(reading.words, `"${aim.slice(0, 40)}" came back changed`).toBe(aim)
        expect(reading.askedIn).toBe(askedIn)
        expect(reading.offer, 'an offer is never the area that was asked').not.toBe(askedIn)
        for (const area of reading.names) {
          expect(READABLE_AREAS).toContain(area.domain)
          expect(area.by.length, 'an area is never named by nothing').toBeGreaterThan(0)
        }
      }
    }
  })

  it('stores a sample of them byte-identically through the whole write path', async () => {
    for (const aim of LIBRARY_AIMS.slice(0, 8)) {
      const app = await firstEvening()
      await app.answerDiscovery(aim, true)
      const stored = destinationRecordsOn(app)[0]
      expect(stored?.kind === 'destination' ? stored.aim : undefined).toBe(aim)
    }
  })

  it('asks about none of the library the plan itself wrote', () => {
    /*
     * The live risk in D-257, measured rather than asserted.
     *
     * Reading less means asking more, and asking too much would be a worse
     * product even though it is a safer one. So: of every owner phrase in the
     * plan's own scenario library, **not one** is turned into a question. The
     * confirmation path is reached by denials whose scope cannot be shown, and
     * ordinary aspirations are not denials.
     *
     * If that ever stops being true, the closed set has been drawn too tightly
     * and this test is where it shows.
     */
    const asking = LIBRARY_AIMS.filter(
      (aim) => readAim(interpreterInput(aim, DOMAIN.career, [], NO_PERMISSIONS)).scopeUnresolved,
    )
    expect(asking, 'no ordinary owner phrase is turned into a question').toEqual([])
    expect(LIBRARY_AIMS.length, 'and the library is worth measuring over').toBeGreaterThan(15)
  })

  it('reads a very long phrase without naming an area from a fragment of a word', () => {
    const reading = readAim(interpreterInput('a'.repeat(4000), DOMAIN.career, [], NO_PERMISSIONS))
    expect(reading.names).toEqual([])
    expect(reading.unknowns).toEqual([])
  })

  it('reads nothing out of an empty or whitespace phrase', () => {
    for (const nothing of ['', '   ', '\t\n']) {
      const reading = readAim(interpreterInput(nothing, DOMAIN.career, [], NO_PERMISSIONS))
      expect(reading.names).toEqual([])
      expect(reading.offer).toBeUndefined()
      expect(reading.undecided).toBe(false)
      expect(describeReading(reading, (id) => coreDomains.labelFor(id))).toBeUndefined()
    }
  })

  it('is case-insensitive about the word and exact about the stored phrase', () => {
    const shouted = readAim(interpreterInput('MORE MONEY', DOMAIN.career, [], NO_PERMISSIONS))
    expect(shouted.elsewhere).toBe(DOMAIN.money)
    expect(shouted.words, 'and his capitals are his').toBe('MORE MONEY')
  })

  it('names no area from a word inside another word', () => {
    /*
     * The failure routing 90 was caught by: `invalidating` contains `dating`.
     * Here `concert` contains `cert` and `learn` contains `earn`.
     */
    for (const phrase of ['A concert every month', 'Learn to be patient']) {
      const reading = readAim(interpreterInput(phrase, DOMAIN.health, [], NO_PERMISSIONS))
      expect(
        reading.names.map((area) => area.domain),
        phrase,
      ).not.toContain(DOMAIN.money)
    }
    // And the positive: the words themselves are read when they stand alone.
    expect(
      readAim(interpreterInput('Earn more', DOMAIN.health, [], NO_PERMISSIONS)).elsewhere,
    ).toBe(DOMAIN.money)
  })
})

describe('91 synthetic — the null case offers nothing at all', () => {
  it('reads an unambiguous same-area phrase and says nothing about it', async () => {
    const app = await firstEvening()
    const reading = app.discoveryReading('Get promoted to senior engineer by the summer')!

    expect(reading.names.map((area) => area.domain)).toEqual([DOMAIN.career])
    expect(reading.elsewhere, 'nowhere else is named').toBeUndefined()
    expect(reading.offer, 'so there is nothing to offer').toBeUndefined()
    expect(reading.undecided).toBe(false)
    expect(reading.unknowns, 'and the words answered every question about them').toEqual([])
    expect(describeReading(reading, (id) => coreDomains.labelFor(id))).toBeUndefined()
    expect(describeOffer(reading, (id) => coreDomains.labelFor(id))).toBeUndefined()
  })

  it('writes no derived row for it, and asks D-188’s own next question', async () => {
    const app = await firstEvening()
    await app.answerDiscovery('Get promoted to senior engineer by the summer')

    expect(aimReadings(app)).toEqual([])
    expect(app.agenda().prompt?.prompt).toBe(
      'What would be the next step towards “Get promoted to senior engineer by the summer”?',
    )
  })

  it('and the same journey on a read phrase does offer one', async () => {
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    expect(aimReadings(app)).toHaveLength(1)
    expect(app.agenda().prompt?.prompt).toContain('money thing')
  })
})

describe('91 synthetic — the clarification takes the slot rather than adding one', () => {
  it('asks one question about the aim either way, and it is the same shape', async () => {
    /*
     * D-184's slot, and what actually changes in it.
     *
     * The claim is **not** that the two agendas are the same length — they are
     * not, and for a reason worth naming: filing the aim in Money leaves Career
     * with nothing named, and the Career question has already been asked and
     * settled, so it is not put again. What is the same is the number of
     * questions about *this aim*, and its shape.
     */
    const read = await firstEvening()
    await read.answerDiscovery(AIM, true)
    const kept = await firstEvening()
    await kept.answerDiscovery(AIM)

    const about = (app: JourneyApp) =>
      app.agenda().outstanding.filter((prompt) => prompt.destination?.aim === AIM)

    expect(about(read)).toHaveLength(1)
    expect(about(kept)).toHaveLength(1)
    expect(about(read)[0]?.shape).toBe('milestone')
    expect(about(kept)[0]?.shape).toBe('milestone')
    expect(about(read)[0]?.prompt).not.toBe(about(kept)[0]?.prompt)
  })

  it('puts the clarification first, so the offer it just made is the next thing', async () => {
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    expect(app.agenda().prompt?.destination?.aim).toBe(AIM)

    const kept = await firstEvening()
    await kept.answerDiscovery(AIM)
    expect(
      kept.agenda().prompt?.destination?.aim,
      'and where nothing was read, the order is the one routing 84 shipped',
    ).toBe(AIM)
  })

  it('emits at most one prompt per destination across the whole library', async () => {
    for (const scenario of SCENARIOS) {
      const app = await openJourney(scenario.id)
      const perAim = new Map<string, number>()
      for (const prompt of outstandingPrompts(app.situation())) {
        const aim = prompt.destination?.aim
        if (aim === undefined) continue
        perAim.set(aim, (perAim.get(aim) ?? 0) + 1)
      }
      for (const [aim, count] of perAim) {
        expect(count, `${scenario.id}: "${aim}" is asked about ${count} times at once`).toBe(1)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// QA Round 1 — the four findings, each as the class behind it
// ---------------------------------------------------------------------------

describe('QA-91-001 — a declined reading can be reconsidered from the object', () => {
  it('still reads the same area out of the words after the aim is stored', async () => {
    /*
     * The engine half of the finding, and the deeper of the two.
     *
     * `destinationRecords` writes an entity whose **label is the aim**, so
     * reading *"More money"* again found a thing the owner had "named" in
     * Career called *More money* — and a named thing outranks every word in the
     * table. The app cited its own record of his sentence as evidence about
     * that sentence, and the offer vanished the moment it was declined.
     */
    const app = await firstEvening()
    expect(app.destinationReading(DOMAIN.career, AIM)?.offer).toBe(DOMAIN.money)

    await app.answerDiscovery(AIM)
    expect(
      app.destinationReading(DOMAIN.career, AIM)?.offer,
      'the same words, read again once the aim exists',
    ).toBe(DOMAIN.money)
  })

  it('names a career thing he owns while never naming the aim itself', async () => {
    /*
     * The positive beside the negative: excluding destinations must not exclude
     * the owner's real named things, which are the whole reason the digest
     * carries labels at all.
     */
    const app = await firstEvening()
    await app.introduce({ kind: 'skill', name: 'Subnetting', domain: DOMAIN.career })
    await app.answerDiscovery(AIM)

    const reading = app.destinationReading(DOMAIN.health, 'Get better at Subnetting')!
    expect(reading.names.map((area) => area.domain)).toEqual([DOMAIN.career])
    expect(reading.names[0]?.byOwnThing, 'and it is his own thing that named it').toBe(true)
    expect(
      reading.input.digest.map((source) => source.text),
      'while the aim itself is not offered back as evidence',
    ).not.toContain(AIM)
  })

  it('walks decline, redo and accept in one store, and Now changes at the end', async () => {
    /*
     * §6.3's own sequence, which could not be performed at all before this
     * repair. It is one test because it is one owner and one store: the finding
     * was invisible precisely because decline and accept lived in two.
     */
    const app = await firstEvening()

    await app.answerDiscovery(AIM)
    expect(aimReadings(app), 'declining wrote nothing').toEqual([])
    expect(app.situation().direction.destinations[0]?.domain).toBe(DOMAIN.career)

    const destination = app.situation().direction.destinations[0]!.destination
    const redone = await app.acceptReading(destination)
    expect(redone.done, redone.note).toBe(true)

    expect(app.situation().direction.destinations[0]?.domain).toBe(DOMAIN.money)
    expect(aimReadings(app), 'and now there is exactly one derived row').toHaveLength(1)
    expect(app.agenda().prompt?.prompt).toContain('money thing')

    await app.answerDiscovery('Clear the credit card')
    expect(app.decision().evaluation?.candidate.semantics.domain).toBe(DOMAIN.money)
  })

  it('offers nothing to reconsider once a reading already stands', async () => {
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    const again = await app.acceptReading(app.situation().direction.destinations[0]!.destination)
    expect(again.done, 'one reading, not two').toBe(false)
    expect(aimReadings(app)).toHaveLength(1)
  })

  it('offers nothing to reconsider where the words name nowhere else', async () => {
    const app = await firstEvening()
    await app.answerDiscovery('Get promoted to senior engineer by the summer')
    const nothing = await app.acceptReading(app.situation().direction.destinations[0]!.destination)
    expect(nothing.done).toBe(false)
    expect(aimReadings(app)).toEqual([])
  })
})

describe('QA-91-002 — taking a reading back takes back what it caused', () => {
  it('sets the next step aside, and Now stops acting on the old area', async () => {
    /*
     * Round 1's version of this test asserted that the milestone **moved** with
     * the aim, and it passed. QA-91-005 is what moving it actually produced:
     * *"Build a small lab with Clear the credit card rather than reading about
     * Clear the credit card."* The entity kind is meaning, not filing, so
     * undoing an interpretation by substituting another one is not undoing it.
     * The contract this now holds is the corrected one.
     */
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    await app.answerDiscovery('Clear the credit card')
    expect(
      generateCandidates(app.situation()).some(
        (candidate) => candidate.semantics.domain === DOMAIN.money,
      ),
      'the positive first: a money move is on offer while the reading stands',
    ).toBe(true)

    await app.withdrawReading(app.situation().direction.destinations[0]!.destination)

    expect(app.situation().direction.destinations[0]?.domain).toBe(DOMAIN.career)
    expect(
      generateCandidates(app.situation()).filter(
        (candidate) => candidate.semantics.domain === DOMAIN.money,
      ),
      'no money move survives the withdrawal',
    ).toEqual([])
  })

  it('invents no meaning in the area the aim moved to — QA-91-005', async () => {
    /*
     * The half that matters most, and the one Round 1 got backwards. Asserted
     * as an absence **about the subject**, so a career move about anything else
     * would not satisfy it: what may not exist is a move that treats *"Clear the
     * credit card"* as something to study.
     */
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    await app.answerDiscovery('Clear the credit card')
    await app.withdrawReading(app.situation().direction.destinations[0]!.destination)

    const about = generateCandidates(app.situation()).filter((candidate) =>
      candidate.semantics.target.object.id.includes('clear-the-credit-card'),
    )
    expect(about, 'nothing is proposed about it in any area').toEqual([])
    expect(
      app
        .situation()
        .entities.all()
        .filter((entity) => entity.kind === 'learning-topic'),
      'and no study object was invented for it',
    ).toEqual([])
  })

  it('keeps his own sentence, and says the step was set aside rather than reached', async () => {
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    await app.answerDiscovery('Clear the credit card')
    await app.withdrawReading(app.situation().direction.destinations[0]!.destination)

    const destination = app.situation().direction.destinations[0]!
    expect(destination.aim).toBe(AIM)
    expect(destination.milestones).toHaveLength(1)
    expect(destination.milestones[0]?.goal.statement, 'his words, untouched').toBe(
      'Clear the credit card',
    )
    expect(destination.milestones[0]?.setAside).toBe(true)
    expect(destination.milestones[0]?.reached, 'set aside is not reached').toBe(false)
    expect(destination.next, 'and it is not what is next either').toBeUndefined()
  })

  it('says it has no next step, and leaves the control to name one — without asking again', async () => {
    /*
     * The app asks rather than guessing — but it does not ask **again**.
     *
     * The question about this aim's next step was put once and answered, and a
     * settled prompt stays settled (D-163: *an answer is remembered and not
     * re-asked*). Re-opening it because the owner took something back would be
     * the agenda pestering him for changing his mind. What must be true instead
     * is that the app **admits** it has no next step and leaves the ordinary
     * control to name one — which is the destination's own *Fill that in*, on
     * the page the aim lives on.
     */
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    await app.answerDiscovery('Clear the credit card')
    await app.withdrawReading(app.situation().direction.destinations[0]!.destination)

    const destination = app.situation().direction.destinations[0]!
    expect(destination.next, 'nothing is next').toBeUndefined()
    expect(missingParts(destination), 'and the app says so').toContain('what the next step is')
    expect(describeDestination(destination).next, 'in the words the page renders').toBe(
      'Nothing is named as the next step yet.',
    )
    expect(
      app.agenda().outstanding.find((prompt) => prompt.destination?.aim === AIM),
      'and the agenda does not put the settled question again',
    ).toBeUndefined()
  })

  it('supersedes rather than deletes, so the money milestone stays legible', async () => {
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    await app.answerDiscovery('Clear the credit card')
    const before = app.snapshot().records.filter((record) => record.kind === 'goal')
    expect(before).toHaveLength(1)

    await app.withdrawReading(app.situation().direction.destinations[0]!.destination)
    const after = app.snapshot().records.filter((record) => record.kind === 'goal')
    expect(after, 'two rows, the earlier one still there').toHaveLength(2)
    expect(after.some((record) => record.id === before[0]!.id)).toBe(true)
  })

  it('leaves a money entity no open goal names unable to reach Now', async () => {
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    await app.answerDiscovery('Clear the credit card')
    await app.withdrawReading(app.situation().direction.destinations[0]!.destination)

    expect(
      app
        .situation()
        .entities.all()
        .some((entity) => entity.kind === 'financial-goal'),
      'the entity is still in the index',
    ).toBe(true)
    expect(
      generateCandidates(app.situation()).filter(
        (candidate) => candidate.semantics.domain === DOMAIN.money,
      ),
      'and it reaches nothing',
    ).toEqual([])
  })

  it('narrows the money generator without changing the one history that has a goal', () => {
    /*
     * **This asserted an emptiness and the emptiness was the finding.** The
     * claim was that no shipped history holds a `financial-goal` at all, which
     * was true and was exactly AUD-0012: money existed only as a page, the
     * generator's precondition was unreachable, and the QA laboratory could not
     * even show that it could not. Routing 92 added `money-item-due`, so the
     * emptiness is gone and the property it was standing in for has to be
     * asserted directly.
     *
     * The property is that the narrowing — an **active goal** naming the entity,
     * rather than any record referring to it — does not remove a money move
     * from a history where the goal is genuinely open. That is what the
     * tournament instrument could not tolerate being moved (D-137, D-138) and
     * it is now measurable rather than vacuous.
     */
    const withGoal = SCENARIOS.filter((scenario) => {
      const entities = scenario.build().entities as readonly ({ kind?: string } | null)[]
      return entities.some((entity) => entity !== null && entity.kind === 'financial-goal')
    })
    expect(
      withGoal.map((scenario) => scenario.id),
      'money is dormant in the library again — AUD-0012 undone',
    ).toEqual(['money-item-due'])

    for (const scenario of withGoal) {
      const loaded = snapshotFromWire(scenario.build())
      expect(loaded.loaded).toBe(true)
      if (!loaded.loaded) throw new Error('unreachable')
      const moment = { now: scenario.now, zone: scenario.zone, weekStartsOn: 1 as const }
      const situation = assembleSituation(buildView(loaded.snapshot, moment), moment)
      expect(
        generateCandidates(situation)
          .filter((candidate) => candidate.semantics.domain === DOMAIN.money)
          .map((candidate) => candidate.semantics.target.verb),
        `${scenario.id}: the open goal reaches no money move`,
      ).toContain('handle-money-item')
    }
  })
})

describe('QA-91-006 — a started consequence does not outlive the reading', () => {
  it('stops proposing the money move even after it has been started', async () => {
    /*
     * Round 1's narrowing asked whether **any** effective record still referred
     * to the entity, and an `action-recommendation` and an `action-start` are
     * records. So starting the move and then withdrawing left it live and *Under
     * way* on Now. **A record of having been offered something is not a reason
     * to offer it again**, and what makes a money item open is an active goal.
     */
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    await app.answerDiscovery('Clear the credit card')

    const started = await app.act('start')
    expect(started.done, started.note).toBe(true)
    expect(
      app.snapshot().records.filter((record) => record.kind === 'action-start'),
      'the positive first: the lifecycle rows this finding is about exist',
    ).toHaveLength(1)

    await app.withdrawReading(app.situation().direction.destinations[0]!.destination)

    expect(
      generateCandidates(app.situation()).filter(
        (candidate) => candidate.semantics.domain === DOMAIN.money,
      ),
      'the started move is not proposed again',
    ).toEqual([])
    expect(app.decision().evaluation?.candidate.semantics.domain).not.toBe(DOMAIN.money)
  })

  it('keeps what he actually did on the record', async () => {
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    await app.answerDiscovery('Clear the credit card')
    await app.act('start')
    await app.withdrawReading(app.situation().direction.destinations[0]!.destination)

    expect(
      app.snapshot().records.filter((record) => record.kind === 'action-start'),
      'truthful history is preserved; only the current offer is withdrawn',
    ).toHaveLength(1)
  })

  it('does not offer a set-aside move back to be picked up', async () => {
    /*
     * The same class through the other door. A move left part-done is offered
     * back on Now, and offering back something the app has stopped suggesting
     * would be the withdrawn interpretation arriving from the lifecycle instead
     * of the generator.
     */
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    await app.answerDiscovery('Clear the credit card')
    await app.act('start')
    await app.act('part-done')
    expect(app.resumable(), 'the positive first: it is offered back').toBeDefined()

    await app.withdrawReading(app.situation().direction.destinations[0]!.destination)
    expect(app.resumable(), 'and not after the reading is taken back').toBeUndefined()
  })

  it('goes on offering an unfinished move that no goal set aside', async () => {
    /*
     * The bound on that rule. It may only ever silence a subject some goal
     * names; a routine the engine proposed for itself is untouched.
     */
    const app = await openJourney('the-first-evening')
    for (let taps = 0; taps < 3; taps += 1) {
      const step = app.guide()
      if (step.kind !== 'question') break
      await app.answerGuide()
    }
    if (app.decision().evaluation === undefined) return
    await app.act('start')
    await app.act('part-done')
    expect(app.resumable(), 'nothing here belongs to a goal at all').toBeDefined()
  })
})

describe('QA-91-003 — a token is read for its role, not for its presence', () => {
  const read = (phrase: string, askedIn = DOMAIN.career) =>
    readAim(interpreterInput(phrase, askedIn, [], NO_PERMISSIONS))

  it('and still names it where the owner negates the thing rather than the topic', () => {
    /*
     * The pair that makes the rule a rule rather than a patch. *"No more debt"*
     * is negated and is squarely about money — he wants none of the debt, not
     * none of the subject. A window rule around any negator would have taken
     * this away, which is why only a negation of **aboutness** counts.
     */
    for (const phrase of ['No more debt', 'Never go overdrawn again', 'Stop wasting money']) {
      expect(
        read(phrase).names.map((area) => area.domain),
        phrase,
      ).toEqual([DOMAIN.money])
    }
  })

  it('stops a denial at the clause it belongs to', () => {
    const both = read('Not about money, but about the qualification')
    expect(
      both.names.map((area) => area.domain),
      'the denial does not swallow the sentence',
    ).toEqual([DOMAIN.career])
  })

  it('reads a four-digit year as a horizon and not as an amount', () => {
    const dated = read('More money by 2027')
    expect(dated.unknowns).toContain('how much')
    expect(dated.unknowns, 'the year answered when').not.toContain('by when')
  })

  it('reads an ordinary number as an amount and not as a year', () => {
    const sum = read('Save 3000 by December')
    expect(sum.unknowns, 'three thousand is a sum').not.toContain('how much')
    expect(sum.unknowns).not.toContain('by when')

    const both = read('Save £3000 by 2027')
    expect(both.unknowns).toEqual([])
  })

  it('lets one denial govern both objects it coordinates — QA-91-007', () => {
    /*
     * `and` was ending a denied span, so *"Not about money and debt"* read as a
     * denial of money followed by a fresh claim about debt. One negation is
     * governing two coordinated objects and it denies both.
     */
    for (const phrase of ['Not about money and debt', 'Nothing to do with salary and savings']) {
      const denied = read(phrase)
      expect(denied.names, phrase).toEqual([])
      expect(denied.offer, phrase).toBeUndefined()
    }
  })

  it('and lets a contrastive assert an area it has just denied', () => {
    /*
     * What the contrastive terminator is actually for, found by reintroducing
     * it and watching nothing fail.
     *
     * Once a denial cancels by **area**, a contrast that turns to a *different*
     * area needs no help — Career was never Money. The terminator earns its
     * place on the case where the contrast stays inside the denied area: he says
     * it is not about the salary but is about the pension, and both are Money.
     * Without the turn, the area rule would cancel the pension too and the app
     * would abstain from a sentence that names its subject plainly.
     */
    expect(
      read('Not about the salary, but about the pension').names.map((area) => area.domain),
      'the contrast asserts an area the denial had just cancelled',
    ).toEqual([DOMAIN.money])
    expect(
      read('Not about the salary though the pension matters').names.map((area) => area.domain),
    ).toEqual([DOMAIN.money])
  })

  it('and still denies a different area that is coordinated straight on to it', () => {
    /*
     * The bound in the other direction. *"Not about money or fitness"* denies
     * both, because the second is joined to the first with nothing between them
     * — which is what a coordination is, and what a comma is not.
     */
    expect(read('Not about money or fitness').names, 'both denied').toEqual([])
    expect(read('Not about money and the gym').names).toEqual([])
  })

  it('leaves a comma-separated list of ordinary negatives alone', () => {
    /*
     * No denial of aboutness anywhere in it, so nothing here is governed at
     * all: he is negating three things and every one of them is about money.
     */
    expect(read('No debt, no savings, no salary').names.map((area) => area.domain)).toEqual([
      DOMAIN.money,
    ])
  })

  it('and still ends one at a real clause boundary', () => {
    /*
     * The other half of the pair. Widening what continues a denial must not
     * widen what a denial swallows: a contrastive clause turns the sentence
     * around and the denial stops there.
     */
    expect(
      read('Not about money, but about the qualification').names.map((area) => area.domain),
    ).toEqual([DOMAIN.career])
    expect(
      read('Not about money though I want the qualification').names.map((area) => area.domain),
    ).toEqual([DOMAIN.career])
  })

  it('leaves ordinary negation alone where it coordinates too', () => {
    /*
     * The case a wider rule would have broken. *"No more debt and less
     * spending"* negates the things rather than the topic, twice over, and is
     * squarely about money.
     */
    expect(read('No more debt and less spending').names.map((area) => area.domain)).toEqual([
      DOMAIN.money,
    ])
  })

  it('reads the day and month of a written date as date parts — QA-91-007', () => {
    /*
     * A four-digit year was exempt from being an amount and the rest of a date
     * was not, so *"before 03/15/2027"* reported the amount as settled from a
     * `03` and a `15`. Both shapes, and both directions of the pair.
     */
    for (const phrase of [
      'More money before 03/15/2027',
      'More money before 15-03-2027',
      'More money before 2027-03-15',
      'More money before March 15, 2027',
      'More money before 15 March 2027',
      // A two-digit year, which no `YEAR` match can rescue: only the date shape
      // itself says this is a date, in both directions.
      'More money before 03/15/27',
    ]) {
      const dated = read(phrase)
      expect(dated.unknowns, `${phrase}: the amount is still unknown`).toContain('how much')
      expect(dated.unknowns, `${phrase}: the date answered when`).not.toContain('by when')
    }
  })

  it('reads a range and an ordinal quarter as dates — QA-91-011', () => {
    /*
     * Classification rather than deletion.
     *
     * Removing matched date shapes worked exactly as far as the shape list
     * reached: an ordinal quarter says a date without spelling `Q3`, and a range
     * has two ends of which only one carries the date's own grammar. Numbers are
     * classified now, and a number joined immediately to a date by a range
     * connector is a date because that is what a range is.
     */
    for (const phrase of [
      'More money by the 3rd quarter of 2027',
      'More money by quarter 3 of 2027',
      'More money between March 15th and 17th, 2027',
      'More money from the 15th to the 17th of March 2027',
      'More money by March 15–17, 2027',
      'More money between 03/15 and 03/17/2027',
    ]) {
      const dated = read(phrase)
      expect(dated.unknowns, `${phrase}: the amount is still unknown`).toContain('how much')
      expect(dated.unknowns, `${phrase}: the date answered when`).not.toContain('by when')
    }
  })

  it('and still reads a sum that merely happens to sit near a month word', () => {
    /*
     * *"Save 15 by March"* is a sum and a horizon, not a date: nothing joins the
     * number to the month, so neither is taken for the other.
     */
    expect(read('Save 15 by March').unknowns).toEqual([])
  })

  it('and still reads a real sum beside a real date', () => {
    for (const phrase of ['Save £3000 by 03/15/2027', 'Save 3000 by March 15, 2027']) {
      expect(read(phrase).unknowns, phrase).toEqual([])
    }
  })

  it('reads a bare number as a sum when no date is anywhere near it', () => {
    const sum = read('Save 3000')
    expect(sum.unknowns, 'three thousand is a sum').not.toContain('how much')
    expect(sum.unknowns, 'and nothing said when').toContain('by when')
  })

  it('holds the two apart on the phrase that carries only a year', () => {
    /*
     * The exact inversion QA found: a digit anywhere counted as an amount while
     * the horizon table knew month names and no years, so one token answered
     * the wrong question and left the right one open.
     */
    const only = read('More money by 2027')
    const neither = read('More money')
    expect(neither.unknowns).toContain('how much')
    expect(neither.unknowns).toContain('by when')
    expect(only.unknowns).toContain('how much')
    expect(only.unknowns).not.toContain('by when')
  })

  // -------------------------------------------------------------------------
  // Round 5 — the two questions, asked of the structure rather than of a list

  it('reads a punctuated coordination as one denied list — QA-91-012', () => {
    /*
     * Round 4 read a comma as the end of a denial, so the *"or fitness"* half of
     * an ordinary list became a fresh claim about health. A comma separates the
     * items of a list at least as often as it ends one; what says the list is
     * still running is the coordinator.
     */
    for (const phrase of [
      'Not about money, or fitness',
      'Not about money, fitness, or certification',
      'Not about money, debt, or savings',
    ]) {
      expect(read(phrase).names, phrase).toEqual([])
    }
  })

  it('denies an asyndetic list too, because a denial runs until the sentence turns', () => {
    /*
     * Round 5 declared the opposite as a deliberate bound, and QA-91-014 ruled
     * it wrong: terse owner prose drops the conjunction, and *"not about money,
     * fitness, certification"* means none of the three. Absence of a spoken
     * coordinator is not absence of coordination.
     *
     * With reach doing the work there is no coordinator to look for. Everything
     * up to the point where the sentence turns is denied.
     */
    expect(read('Not about money, fitness, certification').names).toEqual([])
    expect(read('Not about money, debt, savings').names).toEqual([])
  })

  it('and reads a date-shaped number as a sum when an amount unit governs it', () => {
    /*
     * The same instrument from the other side. A year is a shape; *dollars* and
     * a currency symbol are evidence, and evidence wins. The horizon then stays
     * honestly open, which is the part the old rule had backwards.
     */
    for (const phrase of ['Save $2027', 'Save 2027 dollars']) {
      const sum = read(phrase)
      expect(sum.unknowns, `${phrase}: the sum is settled`).not.toContain('how much')
      expect(sum.unknowns, `${phrase}: and nothing said when`).toContain('by when')
    }
    expect(read('Save 2027 dollars by March').unknowns, 'and both, once a month is named').toEqual(
      [],
    )
  })

  it('keeps a unit from reaching across a preposition to a number it does not govern', () => {
    /*
     * The pair that makes adjacency the rule rather than proximity. *"17 next
     * month"* is a date because the unit governs the number; *"17 by March"* is
     * a sum with a deadline, and the only difference is what stands between.
     */
    expect(read('More money from 15 to 17 next month').unknowns).toContain('how much')
    expect(read('Save 15 to 17 by March').unknowns, 'a sum with a deadline').toEqual([])
    expect(read('Save 17 by March 15').unknowns, 'a sum and a written day').toEqual([])
  })

  // -------------------------------------------------------------------------
  // Round 7 — a form is evidence only where it does that form's job

  it('and still reads a noun phrase that merely ends in an inflection', () => {
    /*
     * The reverse, and the reason the rule is about position rather than shape.
     * *"savings goals for 2027"* ends in `-s` and takes a prepositional phrase,
     * which is what a noun does; a predicate's complement is not a bare `for`.
     */
    for (const phrase of [
      'Not about money and my savings goals for 2027',
      'Not about money and fitness classes on Tuesdays',
      'Not about money and physical fitness',
    ]) {
      expect(read(phrase).names, phrase).toEqual([])
    }
  })

  it('reads a closed-class form only where it does that form’s job', () => {
    /*
     * The whole of QA-91-016 in one rule. `being` is non-finite, `May` and `IT`
     * are a month and an acronym the tokeniser lowercased into syntax, and `you`
     * here is an item in a list rather than the subject of anything. Each form
     * needs what its role requires, and none of these has it.
     */
    for (const phrase of [
      'Not about money or fitness being the issue',
      'Not about money or May certification goals',
      // ...and again with no capital to lean on, which is how owners often type.
      'not about money or may certification goals',
      'Not about money or IT certification',
      'Not about money, you, or fitness',
      // A comma after the pronoun, with the next item not a coordinator.
      'Not about money, you, fitness, or certification',
    ]) {
      expect(read(phrase).names, phrase).toEqual([])
    }
  })

  it('names the bound: a predicate with no inflection and no complement', () => {
    /*
     * Declared rather than left to be found, and narrower than Round 6's, which
     * QA overturned. What is still invisible is a bare predicate carrying
     * neither the third-person inflection nor a prepositional complement —
     * *"fitness counts"* — so the denial reaches over it and names one area
     * fewer. That errs toward saying less, and it is the only bound left here.
     */
    expect(read('Not about money and fitness counts').names).toEqual([])
  })

  it('and still stops where a preposition really does put the number in time', () => {
    /*
     * The reverse. `by`, `before` and `until` always put what follows them in a
     * time slot; `at`, `on` and `in` do it only when something temporal follows,
     * which is the whole difference between *"on March 15"* and *"at least
     * 3000"*.
     */
    for (const phrase of ['Save 3000 on March 15', 'Save 3000 in March', 'Save 17 by March 15']) {
      expect(read(phrase).unknowns, phrase).toEqual([])
    }
    const untyped = read('More money by 17')
    expect(untyped.unknowns, 'a deadline slot types nothing').toContain('how much')
    expect(untyped.unknowns).toContain('by when')
  })

  it('reads an ascending two-part date from the slot it stands in', () => {
    /*
     * `3-15` and `12.31` ascend and carry no leading zero, so the digits alone
     * cannot separate them from a range. A preposition that puts what follows it
     * in time is not introducing a range of sums, and that settles it.
     */
    for (const phrase of ['More money by 3-15', 'More money by 12.31']) {
      const dated = read(phrase)
      expect(dated.unknowns, `${phrase}: the amount is still unknown`).toContain('how much')
      expect(dated.unknowns, `${phrase}: the date answered when`).not.toContain('by when')
    }
  })

  it('and still reads the same digits as a range outside that slot', () => {
    for (const phrase of ['Save 2000-3000 by March', 'Save 15-17 by March', 'Save 2.5 by March']) {
      expect(read(phrase).unknowns, phrase).toEqual([])
    }
  })

  it('and still reads a unit that is pointed at a moment, or at neither', () => {
    /*
     * Two reverses in one. A unit standing straight after the number or pointed
     * by a deictic is a moment; and a unit that is the complement of something
     * else — *"at the end of March"* — is neither a moment for this number nor a
     * rate dividing it, which is what keeps that deadline readable.
     */
    expect(read('More money from 15 to 17 next month').unknowns).toContain('how much')
    expect(read('More money in 6 months').unknowns).toContain('how much')
    expect(read('Save 3000 at the end of March').unknowns, 'a deadline, not a wage').toEqual([])
  })

  it('reads a written date from its punctuation, and a range from its arity', () => {
    /*
     * A slash is never a range, so a slashed chain is a date however long it is.
     * A hyphen is ambiguous, and the evidence that separates the two readings is
     * how many numbers are punctuated together: two are the ends of a range,
     * three are a written date.
     */
    for (const phrase of [
      'More money before 15-03-2027',
      'More money by 2027/03/15',
      'More money by 15/03',
    ]) {
      const dated = read(phrase)
      expect(dated.unknowns, `${phrase}: the amount is still unknown`).toContain('how much')
      expect(dated.unknowns, `${phrase}: the date answered when`).not.toContain('by when')
    }
    expect(read('Save 2000-3000 by March').unknowns, 'two, hyphenated, is a range').toEqual([])
    expect(
      read('Save 3000 between 03/15 and 03/17/2027').unknowns,
      'a sum beside two dates',
    ).toEqual([])
  })

  it('denies an item that carries its own modifier — QA-91-014', () => {
    /*
     * Round 5 read the text **between** two markers, so `physical` broke the run
     * and Health was named from a word inside the denial. A modifier belongs to
     * its item; it is not evidence that the list has ended.
     *
     * Two-item and three-item forms both, because the three-item one used to
     * survive by accident: a later coordinator triggered an abstention that
     * named nothing, which looks the same from outside and was not the same.
     */
    for (const phrase of [
      'Not about money and physical fitness',
      'Not about money or professional certification',
      'Not about money, physical fitness, or certification',
    ]) {
      expect(read(phrase).names, phrase).toEqual([])
    }
  })

  it('reads a share counted in a temporal unit as a quantity', () => {
    /*
     * *Two months of salary* is a sum expressed in months, and the evidence is
     * the same evidence the fraction rule already reads: what stands after *of*.
     * A unit between the number and the *of* does not change the question.
     */
    for (const phrase of ['Save 2 months of salary by March', 'Save 2 weeks of pay by March']) {
      expect(read(phrase).unknowns, phrase).toEqual([])
    }
  })

  it('and reads a share of a period as the date it is', () => {
    /*
     * The reverse, which is what keeps the rule above from swallowing ordinary
     * dates. The complement of *of* says which reading it is — a unit in *"the
     * 15th of March"*, and a year in *"the 3rd quarter of 2027"*, which is a
     * shape rather than a word and has to be read as one.
     */
    for (const phrase of [
      'More money by the 3rd quarter of 2027',
      'More money by the 15th of March',
    ]) {
      const dated = read(phrase)
      expect(dated.unknowns, `${phrase}: the amount is still unknown`).toContain('how much')
      expect(dated.unknowns, `${phrase}: the date answered when`).not.toContain('by when')
    }
  })

  // -------------------------------------------------------------------------
  // Round 6 — the denial reads clauses, and the number reads its phrase

  it('keeps a relative clause inside the denial it describes', () => {
    /*
     * The other side of the same rule, and the one that stops it running away:
     * *"money that I earn"* has a subject and a verb in it and is still one
     * denial. Ending the denial there would assert `earn` and name the very area
     * the owner denied.
     */
    expect(read('Not about money that I earn').names).toEqual([])
    expect(read('Nothing to do with the salary which I am paid').names).toEqual([])
  })

  it('governs a number across an ordinary modifier — QA-91-015', () => {
    /*
     * Round 5 whitelisted the seven words a unit could reach across, and two
     * everyday ones broke it: `number` between a unit and its number, and `US`
     * between a number and its unit. Both sit inside one noun phrase.
     */
    expect(read('More money by week number 3 of 2027').unknowns, 'a week is not a sum').toContain(
      'how much',
    )
    const sum = read('Save 2027 US dollars')
    expect(sum.unknowns, 'and dollars are not a year').not.toContain('how much')
    expect(sum.unknowns, 'with nothing said about when').toContain('by when')
  })

  it('and still refuses to govern across a preposition, which starts a phrase', () => {
    /*
     * The reverse. Widening governance to any nearby word would make every sum
     * with a deadline into a date, so what ends the reach is a closed class:
     * a preposition, a coordinator or a finite verb.
     */
    for (const phrase of ['Save 15 to 17 by March', 'Save 17 by March 15']) {
      expect(read(phrase).unknowns, phrase).toEqual([])
    }
  })

  it('keeps a sum and a deadline apart when a temporal preposition relates them', () => {
    /*
     * `until` means *up to the time of*. It relates a quantity to a deadline and
     * cannot join two sums, so it is not a range connector and the date does not
     * propagate backwards into the amount.
     */
    for (const phrase of ['Save 3000 until 15 March', 'Save 3000 until March 15']) {
      expect(read(phrase).unknowns, phrase).toEqual([])
    }
  })

  it('reads a two-part written date from its digits rather than its arity', () => {
    /*
     * Counting the parts said both of these were amount ranges. The evidence is
     * inside the digits: a leading zero is how a date field is written and not
     * how a sum is, and a pair that descends cannot be the ends of a range.
     */
    for (const phrase of ['More money by 31.12', 'More money by 03-15']) {
      const dated = read(phrase)
      expect(dated.unknowns, `${phrase}: the amount is still unknown`).toContain('how much')
      expect(dated.unknowns, `${phrase}: the date answered when`).not.toContain('by when')
    }
  })

  it('and still reads an ascending pair of plain numbers as the range it is', () => {
    for (const phrase of ['Save 2000-3000 by March', 'Save 15-17 by March']) {
      expect(read(phrase).unknowns, phrase).toEqual([])
    }
  })

  it('reads currency on either side of the number, and the genitive both ways', () => {
    /*
     * Two asymmetries QA found in one instrument: `saysHowMuch` saw a currency
     * symbol anywhere while the span rule saw it only in front, and the share
     * rule read *of* but not the possessive that means the same thing.
     */
    for (const phrase of ['Save 2027€', 'Save $2027']) {
      const sum = read(phrase)
      expect(sum.unknowns, `${phrase}: the sum is settled`).not.toContain('how much')
      expect(sum.unknowns, `${phrase}: and nothing said when`).toContain('by when')
    }
    for (const phrase of [
      "Save 2 months' salary by March",
      'Save 2 months of salary by March',
      // And with no marker at all, which is how it is most often written.
      'Save 2 months salary by March',
    ]) {
      expect(read(phrase).unknowns, phrase).toEqual([])
    }
  })

  it('reads an ordinal that modifies a noun as neither a date nor a sum', () => {
    /*
     * *"my 2nd salary payment"* says which payment. Round 5 let the suffix alone
     * establish a date, so the app claimed a deadline the owner never gave.
     */
    const which = read('Save my 2nd salary payment')
    expect(which.unknowns, 'no deadline was stated').toContain('by when')
    expect(which.unknowns, 'and no amount either').toContain('how much')
  })

  it('leaves both facts open for a number nothing in the phrase has typed', () => {
    /*
     * Round 5 defaulted every untyped number to a quantity, and QA was right
     * that this is too broad: in *"more money by 17"* the number could be a day,
     * a sum or an age. Nothing says, so nothing is concluded.
     */
    const untyped = read('More money by 17')
    expect(untyped.unknowns, 'no amount was established').toContain('how much')
    expect(untyped.unknowns, 'and no date either').toContain('by when')
  })

  it('and still reads a bare number the verb governs as the sum it is', () => {
    /*
     * The reverse, and the reason the rule above is about governance rather than
     * about shape. *"Save 3000"* has a money marker in front of it inside the
     * same phrase and no temporal preposition between; *"more money by 17"* has
     * the same marker and a `by`, which is the whole difference.
     */
    const sum = read('Save 3000')
    expect(sum.unknowns, 'the sum is settled').not.toContain('how much')
    expect(sum.unknowns, 'and nothing said when').toContain('by when')
  })

  it('reads a rate as a rate rather than as a date', () => {
    /*
     * *"50000 a year"* is a wage and *"17 next month"* is a deadline, and the
     * article is the whole of the difference. A rate says how often, not when.
     */
    for (const phrase of ['Earn 50000 a year', 'Save 100 a week']) {
      expect(read(phrase).unknowns, `${phrase}: the sum is settled`).not.toContain('how much')
    }
    expect(read('More money from 15 to 17 next month').unknowns).toContain('how much')
  })

  // -------------------------------------------------------------------------
  // Round 8 — the architecture: read what is closed, ask about the rest
  //
  // These replace twenty-two fixtures from Rounds 2 to 7. Each of those
  // asserted an auto-conclusion in a case the instrument can no longer show,
  // and D-257 stops making those conclusions rather than making them better.

  it('concludes where the words carry no denial at all', () => {
    /*
     * The overwhelming majority of what an owner types, and the case in which
     * nothing can be apportioned wrongly because nothing is apportioned.
     */
    for (const phrase of ['More money', 'Get certified', 'Save 3000 by March']) {
      const reading = read(phrase)
      expect(reading.names.length, phrase).toBeGreaterThan(0)
      expect(reading.scopeUnresolved, `${phrase}: nothing to resolve`).toBe(false)
    }
  })

  it('concludes a denial with one marker in its reach', () => {
    /*
     * *"Not about money"* has nothing to apportion either, and punctuation and
     * contrastives end a reach unambiguously — the two boundaries no round of
     * QA has ever broken.
     */
    expect(read('Not about money').names).toEqual([])
    expect(read('Not about salary, but pension is the goal').names.map((a) => a.domain)).toEqual([
      DOMAIN.money,
    ])
    for (const phrase of [
      'Not about money; fitness is the real goal',
      'Not about money: fitness is the goal',
    ]) {
      expect(
        read(phrase).names.map((area) => area.domain),
        phrase,
      ).toEqual([DOMAIN.health])
    }
  })

  it('concludes a list that is a list and nothing but a list', () => {
    /*
     * Only list material between the markers, and only list material after the
     * last of them. There is one reading available, so it is taken.
     */
    for (const phrase of [
      'Not about money, or fitness',
      'Not about money, fitness, or certification',
      'Not about money, fitness, certification',
      'Not about money, debt, or savings',
    ]) {
      const reading = read(phrase)
      expect(reading.names, phrase).toEqual([])
      expect(reading.scopeUnresolved, `${phrase}: a list is closed`).toBe(false)
    }
  })

  it('asks where it cannot show the scope, instead of guessing — QA-91-018', () => {
    /*
     * The architecture in one test. Every one of these was read by some earlier
     * round and broken by a later one: a trailing predicate, an imperative, a
     * clause with no punctuation in front of it, a contact relative, a month
     * that looks like a modal. Eight rounds say the instrument cannot tell them
     * apart, so it stops trying and puts the question.
     */
    for (const phrase of [
      'Not about money and fitness counts',
      'Not about money and prioritize fitness',
      'Not about money and fitness is the real goal',
      'Not about money I earn',
      'not about money or may professional certification',
      'Not about money and fitness classes weekly',
    ]) {
      const reading = read(phrase)
      expect(reading.scopeUnresolved, `${phrase}: the scope is not shown`).toBe(true)
      expect(reading.undecided, `${phrase}: so it is undecided`).toBe(true)
      expect(reading.unknowns, `${phrase}: and the owner is asked`).toContain(
        'which area this belongs to',
      )
    }
  })

  it('and names nothing out of a scope it could not read', () => {
    /*
     * The half that separates this from Round 5's abstention, which QA rejected
     * for withholding silently. Nothing is named, nothing is offered as a
     * settled reading, and nothing derived can be written — but the question is
     * raised, which is what makes it an abstention rather than a quiet guess.
     */
    for (const phrase of ['Not about money and fitness counts', 'Not about money I earn']) {
      const reading = read(phrase)
      expect(reading.names, `${phrase}: no area is claimed`).toEqual([])
      expect(reading.elsewhere, `${phrase}: and no reading stands`).toBeUndefined()
    }
  })

  it('still puts one question and never two', () => {
    /*
     * The one-question budget survives the change: an unresolved scope offers a
     * single candidate where there is one, and offers nothing where the owner
     * would have to be shown a picker.
     */
    const one = read('Not about money I earn')
    expect(one.offer, 'one candidate, one offer').toBe(DOMAIN.money)

    const many = read('Not about money and fitness counts')
    expect(many.offer, 'two candidates are not a picker').toBeUndefined()
    expect(
      many.unknowns.filter((unknown) => unknown === 'which area this belongs to'),
      'and the question is asked once',
    ).toHaveLength(1)
  })

  it('reads a number the evidence beside it settles — QA-91-019', () => {
    /*
     * Adjacency, or nothing. A currency symbol, an amount unit, the money word
     * whose object the number is, a unit touching it, a written date, or a slot
     * only a time can fill.
     */
    for (const phrase of [
      'Save 3000 by March',
      'Save £3000 by 2027',
      'Earn 50000 next year',
      'Save 3000 this March',
    ]) {
      expect(read(phrase).unknowns, phrase).toEqual([])
    }
    for (const phrase of [
      'More money by 2027',
      'More money in 6 months',
      'More money by 15 Mar 2027',
      'More money by 2027/03/15',
    ]) {
      const dated = read(phrase)
      expect(dated.unknowns, `${phrase}: no amount was stated`).toContain('how much')
      expect(dated.unknowns, `${phrase}: but the date answers when`).not.toContain('by when')
    }
    const sum = read('Save 2027 dollars')
    expect(sum.unknowns, 'the unit settles the sum').not.toContain('how much')
    expect(sum.unknowns, 'and nothing said when').toContain('by when')

    // The unit standing as the only evidence there is, and the symbol likewise.
    expect(
      read('More money, around 5000 euros').unknowns,
      'the unit alone settles the sum',
    ).not.toContain('how much')
    expect(
      read('More money, around 5000€').unknowns,
      'and so does the symbol, with no money word in front of it',
    ).not.toContain('how much')
  })

  it('and a horizon word touching a number belongs to that number', () => {
    /*
     * *"2 months salary"* is a sum measured in months, not a deadline, and
     * `saysWhen` used to read `months` off the horizon table regardless. A
     * horizon word against a number takes that number's role; only a
     * free-standing one answers *by when* on its own.
     */
    for (const phrase of ['Save 2 months salary', 'Save 3 years rent']) {
      const measured = read(phrase)
      expect(measured.unknowns, `${phrase}: the sum is settled`).not.toContain('how much')
      expect(measured.unknowns, `${phrase}: and no deadline was given`).toContain('by when')
    }
    expect(read('Save 2 months salary by March').unknowns, 'a real deadline still lands').toEqual(
      [],
    )
  })

  it('leaves a fact open where nothing beside the number settles it', () => {
    /*
     * The numeric half of the same judgement. A number with a modifier between
     * it and its unit, a share, a scalar bound — every one of those was read by
     * some round and broken by the next, so none is read now.
     */
    const untyped = read('More money by 17')
    expect(untyped.unknowns, 'no amount was established').toContain('how much')
    expect(untyped.unknowns, 'and no date either').toContain('by when')

    // QA-91-021 overturned the two phrases that used to sit here: a scalar bound
    // and a share of a salary are amounts the owner supplied, and asking again
    // was a redundant question rather than an honest abstention. They are now
    // asserted the other way round, in the test below this one.
    expect(read('More money by 17').unknowns, 'a number nothing types').toContain('how much')
  })

  // -------------------------------------------------------------------------
  // Round 9 — the question is a control, and the number is read from its
  // construction rather than from whatever is touching it

  it('puts an answerable question on every unresolved branch — QA-91-020', () => {
    /*
     * `scopeUnresolved` and an unknown string are state, not an interaction.
     * QA-91-020 found the surface drawing no control at all where the words
     * left two candidates, or left only the area that was asked about — which
     * is Round 5's silent abstention with a label on it.
     *
     * Every branch now carries what the owner would be choosing from, so the
     * row can be drawn: two outside candidates, one, and none at all.
     */
    const label = (id: LifeDomainId) => coreDomains.labelFor(id)
    for (const [phrase, askedIn] of [
      ['Not about money and fitness is the real goal', DOMAIN.career],
      ['Not about money and fitness counts', DOMAIN.career],
      ['Not about certification and learning matters', DOMAIN.career],
      ['Not about money I earn', DOMAIN.career],
      ['Not about money I earn', DOMAIN.money],
    ] as const) {
      const reading = readAim(interpreterInput(phrase, askedIn, [], NO_PERMISSIONS))
      const row = describeOffer(reading, label)
      const where = `${phrase} @${askedIn}`

      expect(reading.scopeUnresolved, `${where}: the scope is not shown`).toBe(true)
      expect(row, `${where}: so there is a row to answer through`).toBeDefined()
      expect(row!.options.length, `${where}: with at least one answer on it`).toBeGreaterThan(0)
      expect(row!.asking, `${where}: and it says it is still asking`).toBe(true)
      expect(reading.names, `${where}: while nothing is claimed`).toEqual([])
    }
  })

  it('and never offers back the area the question was asked in', () => {
    /*
     * The asked area is the *keep* side of the row and never an answer on it.
     * Offering it as though it were an inferred alternative would be the app
     * proposing what the owner already did.
     */
    for (const askedIn of [DOMAIN.career, DOMAIN.money, DOMAIN.health]) {
      const reading = readAim(
        interpreterInput('Not about money and fitness counts', askedIn, [], NO_PERMISSIONS),
      )
      expect(reading.candidates, `asked in ${askedIn}`).not.toContain(askedIn)
    }
  })

  it('and a settled reading carries one answer and is not asking', () => {
    /*
     * The reverse: a reading that did resolve keeps the shape it always had —
     * one alternative, no question pending — so the row does not start
     * announcing doubt the words do not support.
     */
    const settled = readAim(interpreterInput('More money', DOMAIN.career, [], NO_PERMISSIONS))
    const row = describeOffer(settled, (id) => coreDomains.labelFor(id))
    expect(settled.scopeUnresolved).toBe(false)
    expect(row?.options).toHaveLength(1)
    expect(row?.asking, 'nothing is pending').toBe(false)
  })

  it('reads a temporal unit that is measuring or dividing, not dating — QA-91-021', () => {
    /*
     * Adjacency is not proof that a temporal word is a deadline. *"2 months
     * salary"* measures money in months, *"per calendar year"* divides an
     * amount over a year, and Round 8 read a deadline out of both — the second
     * from a word that was not even touching the number.
     */
    for (const phrase of [
      'A deposit of 2 months salary',
      'A goal of 3 years rent',
      'Earn 50000 per calendar year',
      'Earn 50000 every calendar year',
      'Save 2 full months salary',
    ]) {
      const measured = read(phrase)
      expect(measured.unknowns, `${phrase}: the size is stated`).not.toContain('how much')
      expect(measured.unknowns, `${phrase}: and no deadline is`).toContain('by when')
    }
  })

  it('and still reads a unit something has placed in time', () => {
    /*
     * The reverse, and the reason the rule is about placement rather than
     * distance. A preposition, a deictic, or a day word standing on its own all
     * put a unit at a moment; a determiner may sit between.
     */
    for (const phrase of [
      'Save 3000 by March',
      'Save 3000 this March',
      'Earn 50000 next year',
      'Save 2 months salary by March',
      'Get promoted to senior engineer by the summer',
    ]) {
      expect(read(phrase).unknowns, `${phrase}: something placed it`).not.toContain('by when')
    }
  })

  it('does not ask again for an amount the owner has already given', () => {
    /*
     * The too-narrow half. A scalar bound, a complement and a share of a salary
     * are all amounts plainly supplied, and Round 8's one-token adjacency asked
     * for them a second time. A confirmation the owner has already answered is
     * not caution, it is a tax.
     */
    for (const phrase of [
      'Save at least 3000 by March',
      'Save up to 3000 by March',
      'Salary of 50000 by March',
      'Save a 3rd of my salary by December',
    ]) {
      expect(read(phrase).unknowns, phrase).toEqual([])
    }
  })

  it('and still asks where the money word governs no amount of its own', () => {
    /*
     * The reverse of that reach. A money word does not carry across a
     * preposition that puts what follows it in time, across another number, or
     * across a comma — and an ordinal picking out a noun is not a size.
     */
    expect(read('More money by 17').unknowns, 'a deadline slot types nothing').toContain('how much')
    expect(
      read('More money from 15 to 17 next month').unknowns,
      'a range is not the money word’s own amount',
    ).toContain('how much')
    expect(
      read('Save my 2nd salary payment').unknowns,
      'an ordinal picks a payment rather than sizing one',
    ).toContain('how much')
  })

  it('asks nothing redundant of ordinary money phrases either', () => {
    /*
     * The confirmation burden, measured on a denominator that exercises the
     * numeric roles — which the plan's own library does not.
     *
     * QA-91-021's point was not that four phrases were wrong; it was that four
     * of four ordinary finance sentences asked for an amount the owner had just
     * supplied, and a fallback with that rate is not tolerable as the product's
     * general behaviour. So these are the shapes an owner actually types about
     * money, and none of them may ask about a fact it can already see.
     */
    const settled = [
      'Save 3000 by March',
      'Save at least 3000 by March',
      'Save up to 3000 by March',
      'Salary of 50000 by March',
      'Save a 3rd of my salary by December',
      'Save £3000 by 2027',
      'Save 2027 dollars by March',
      'Earn 50000 next year',
      'Save 3000 this March',
      'Save 2 months salary by March',
      'Save 10 percent of my salary by March',
      'Clear 5000 of debt by December',
    ]

    const asking = settled.filter((phrase) => read(phrase).unknowns.includes('how much'))
    expect(asking, 'the amount is on the screen already').toEqual([])
    expect(settled.length, 'and the measure is worth making').toBeGreaterThan(10)
  })

  it('and still asks where an ordinary money phrase really does leave it open', () => {
    /*
     * The reverse, so the test above cannot be satisfied by concluding
     * everything. Each of these genuinely omits the amount, and each is asked
     * about rather than guessed at.
     */
    for (const phrase of ['More money by March', 'More money by 17', 'More money in 6 months']) {
      expect(read(phrase).unknowns, phrase).toContain('how much')
    }
  })
})

// ---------------------------------------------------------------------------
// 91.3 — the private boundary as a property rather than a convention
// ---------------------------------------------------------------------------

const ROOT = join(import.meta.dirname, '..', '..')

function filesIn(dir: string): readonly string[] {
  const out: string[] = []
  const walk = (current: string): void => {
    for (const name of readdirSync(current)) {
      const full = join(current, name)
      if (statSync(full).isDirectory()) {
        walk(full)
        continue
      }
      if (name.endsWith('.ts') || name.endsWith('.tsx')) out.push(full)
    }
  }
  walk(join(ROOT, dir))
  return out
}

function repoPath(file: string): string {
  return relative(ROOT, file).split(sep).join(posix.sep)
}

describe('91.3 — the private boundary is one place, and the meaning layer goes through it', () => {
  it('is looking at the meaning layer, and at more than a file or two', () => {
    expect(filesIn('src/intelligence').length).toBeGreaterThan(20)
  })

  it('leaves no comparison against the private class anywhere under src/intelligence', () => {
    /*
     * Package 91.3, as a property.
     *
     * Seven sites decided this in place: `situation.ts` twice — one of them the
     * reasoning check that is D-167 and is right — and `coverage.ts` and
     * `insights.ts` between them another five, each excluding private material
     * permission-blind. Every one was correct and every one was a convention
     * re-decided at the call site. They now go through `mayReasonFrom`,
     * `mayRaiseUnasked` or `mayShowDetail`, and this is what stops an eighth
     * being written the old way.
     */
    const offenders = filesIn('src/intelligence')
      .filter((file) => /['"]private['"]/.test(readFileSync(file, 'utf8')))
      .map(repoPath)

    expect(
      offenders,
      'the meaning layer asks privacy.ts what it may do, and does not decide it in place',
    ).toEqual([])
  })

  it('bites on a comparison written the old way', () => {
    /*
     * A guard over an absence goes green on an empty directory too. This is
     * what tells the two apart — D-238's first corollary, applied to a sweep.
     */
    const pretend = "if (definition.privacy === 'private') continue"
    expect(/['"]private['"]/.test(pretend)).toBe(true)
    expect(
      filesIn('src/intelligence').some((file) => readFileSync(file, 'utf8').includes(pretend)),
    ).toBe(false)
  })

  it('keeps the two questions apart: what may be reasoned from, and what may be raised', () => {
    /*
     * The two are separate functions on purpose, and neither may stand in for
     * the other. One moves with the owner's permission; the other never does,
     * because D-167 is explicit that granting the permission does not put an
     * intimate reading on a screen.
     */
    const granted: PermissionState = { granted: () => true }

    expect(mayReasonFrom('private', NO_PERMISSIONS), 'the engine may not know it').toBe(false)
    expect(mayReasonFrom('private', granted), 'until he says so').toBe(true)

    for (const permissions of [NO_PERMISSIONS, granted]) {
      expect(mayReasonFrom('sensitive', permissions), 'and the other classes never waited').toBe(
        true,
      )
    }

    expect(mayRaiseUnasked('private'), 'and raising it unasked is never allowed').toBe(false)
    expect(mayRaiseUnasked('sensitive')).toBe(true)
    expect(mayRaiseUnasked('child-family-sensitive')).toBe(true)
    expect(mayRaiseUnasked('normal')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// The record, and what it says on the surfaces that read it
// ---------------------------------------------------------------------------

describe('91 — the derived row reads as a conclusion with its grounds', () => {
  it('says which area, from which words, and is taggable as the app’s own sentence', async () => {
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    expect(app.describeEvents()).toContain(
      'Read this as being about Money & Financial Resilience — from “money”.',
    )
  })

  it('says so in the other direction once it is taken back', async () => {
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    await app.withdrawReading(app.situation().direction.destinations[0]!.destination)
    expect(app.describeEvents()).toContain(
      'Took back reading this as being about Money & Financial Resilience.',
    )
  })

  it('carries both areas on the row, so it is legible from either page', async () => {
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    const read = aimReadings(app)[0]!
    expect([...read.domains].sort()).toEqual([DOMAIN.career, DOMAIN.money].sort())
  })

  it('never carries a number', async () => {
    /*
     * D-162, on the one object in this phase a confidence could have been
     * attached to. The payload is areas, his own words, and sentences.
     */
    const app = await firstEvening()
    await app.answerDiscovery(AIM, true)
    const read = aimReadings(app)[0] as unknown as Record<string, unknown>
    for (const [key, value] of Object.entries(read)) {
      if (key === 'schemaVersion' || key === 'occurredAt' || key === 'recordedAt') continue
      expect(typeof value, `${key} is a number on a reading`).not.toBe('number')
    }
  })
})

describe('91 — a reading is built from the same shape wherever it is built', () => {
  it('points at the destination it was read from, whichever surface wrote it', async () => {
    const insights = await firstEvening()
    await insights.answerDiscovery(AIM, true)

    const page = await firstEvening()
    await page.nameDestination({ aim: AIM, domain: DOMAIN.money }, DOMAIN.career)

    for (const app of [insights, page]) {
      const read = aimReadings(app)[0]!
      const aim = destinationRecordsOn(app)[0]!
      expect(read.kind === 'aim-reading' ? read.reads : undefined).toBe(aim.id)
      expect(read.provenance.writtenBy).toBe('interpret')
    }
  })

  it('builds the record from the reading rather than from a second reading of the words', () => {
    const reading = readAim(interpreterInput(AIM, DOMAIN.career, [], NO_PERMISSIONS))
    const record = aimReadingRecord(
      reading,
      DOMAIN.money,
      { id: 'destination:more-money' as never, kind: 'destination' },
      'REC' as never,
      { now: 1 as never, zone: 'UTC' as never, recordedAt: 1 as never },
    )
    expect(record.words).toEqual(['money'])
    expect(record.unknowns).toEqual(reading.unknowns)
    expect(record.named).toBe(DOMAIN.money)
    expect(record.askedIn).toBe(DOMAIN.career)
  })
})

describe('91 — what the interpreter may name is bounded, deliberately', () => {
  it('names only the three areas an aspiration can be filed in', () => {
    expect([...READABLE_AREAS].sort()).toEqual(
      [DOMAIN.career, DOMAIN.health, DOMAIN.money].sort() as readonly LifeDomainId[],
    )
  })

  it('reads nothing from a phrase about an area it cannot act in', () => {
    /*
     * *"Be someone she is proud of"* is about Fatherhood, and this phase is not
     * routing 94. The honest answer is that nothing is named — the aim is filed
     * where the question was, no reading is written, and the app does not
     * pretend to have understood.
     */
    const reading = readAim(
      interpreterInput('Be someone she is proud of', DOMAIN.career, [], NO_PERMISSIONS),
    )
    expect(reading.names).toEqual([])
    expect(reading.offer).toBeUndefined()
  })
})
