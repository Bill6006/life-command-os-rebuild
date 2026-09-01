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
    expect(offer?.refile).toBe('File it in Money & Financial Resilience instead')

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
