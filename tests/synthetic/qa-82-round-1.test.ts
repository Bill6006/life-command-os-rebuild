import { describe, expect, it } from 'vitest'
import { DOMAIN } from '../../src/domain/domains'
import {
  civilDateFromDayId,
  instantAtLocal,
  localDateTimeAt,
  type Instant,
  type TimeZoneId,
} from '../../src/domain/time'
import { CONCEPT, createConceptRegistry } from '../../src/domain/concepts'
import { conceptId } from '../../src/domain/windows'
import { assembleDomainPageData, pageForDomain } from '../../src/features/life/domainPages'
import type { Candidate } from '../../src/intelligence/candidates'
import { SCHEDULE_SEEDS, commitmentWindowRecord } from '../../src/intelligence/commitments'
import { applyConstraints } from '../../src/intelligence/constraints'
import { decide, type Decision } from '../../src/intelligence/engine'
import { describePremise } from '../../src/intelligence/explain'
import { composeExport } from '../../src/features/export/compose'
import { SELECT_ALL } from '../../src/features/export/sections'
import { assembleTimeline } from '../../src/features/timeline/timelineEntries'
import { evidenceForDecision, insightsFor } from '../../src/intelligence/insights'
import { profileFor } from '../../src/intelligence/moves'
import { assembleSituation } from '../../src/intelligence/situation'
import { TEST_APP } from './exportHarness'
import { isUsable } from '../../src/domain/knowledge'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import type { Scenario } from '../../src/synthetic/kit'
import {
  schoolMorning,
  SCENARIOS,
  SCHOOL_MORNING_NOW,
  SCHOOL_MORNING_ZONE,
} from '../../src/synthetic/scenarios'

/**
 * The three findings of the first independent QA round on Phase 82.
 *
 * Each one is here twice: once as the exact moment the report reproduced, and
 * once as the class it belongs to. The second is the one that matters. All
 * three findings survived a suite of 1,470 assertions, and in each case a test
 * was standing directly over the defect asserting something adjacent to it —
 * that two hours agreed about a field, that an evidence panel had a move in it,
 * that a dimension produced a note. D-108's rule in three fresh instances:
 * enumerate the space, assert the value rather than the container, and let a
 * reintroduction be what fails.
 */

const ZONE = SCHOOL_MORNING_ZONE

function at(time: string, zone: TimeZoneId, day: Instant): Instant {
  const [hour, minute] = time.split(':')
  return instantAtLocal(
    {
      ...civilDateFromDayId(localDateTimeAt(day, zone).dayId),
      hour: Number(hour ?? 0),
      minute: Number(minute ?? 0),
      second: 0,
    },
    zone,
  )
}

function schoolMorningAt(time: string): Decision {
  const loaded = snapshotFromWire(schoolMorning())
  expect(loaded.loaded, 'the school-morning document should load').toBe(true)
  // The fixture's own Wednesday, read at whatever hour the finding is about.
  const moment = { now: at(time, ZONE, SCHOOL_MORNING_NOW), zone: ZONE }
  return decide(buildView(loaded.snapshot, moment), moment)
}

/**
 * A complete review export, at an hour of the school-morning day.
 *
 * Composed through the real composer with every section selected, because the
 * finding is about two sections of one document disagreeing \u2014 reading either
 * one alone is how it survived.
 */
function exportTextAt(time: string): string {
  const loaded = snapshotFromWire(schoolMorning())
  const moment = { now: at(time, ZONE, SCHOOL_MORNING_NOW), zone: ZONE, weekStartsOn: 1 as const }
  const view = buildView(loaded.snapshot, moment)
  const situation = assembleSituation(view, moment)
  const composed = composeExport({
    sections: [...SELECT_ALL, 'private'],
    situation,
    decision: decide(view, moment),
    insights: insightsFor(situation),
    timeline: assembleTimeline(situation),
    source: 'owner',
    app: TEST_APP,
    composedAt: { at: moment.now, zone: ZONE },
  })
  return composed.text
}

function decideFor(scenario: Scenario, now: Instant): Decision {
  const loaded = snapshotFromWire(scenario.build())
  const moment = { now, zone: scenario.zone, weekStartsOn: scenario.weekStartsOn ?? 1 }
  return decide(buildView(loaded.snapshot, moment), moment)
}

// ---------------------------------------------------------------------------
// QA-82-001 — a standing arrangement is not a claim about the room
// ---------------------------------------------------------------------------

describe('QA-82-001 — whose week it is, and where she actually is', () => {
  /*
   * The report's own reproduction: Wednesday 10:00, inside a school day the
   * owner had entered himself. The premise said "Adaya is here", the headline
   * offered thirty unhurried minutes with her, and the same screen's Life page
   * showed the school window running 08:30 to 15:00.
   */
  it('does not say she is here during her own school day', () => {
    const inside = schoolMorningAt('10:00')

    expect(describePremise(inside.situation)).not.toContain('Adaya is here')
    // And it says something better than nothing: where she is, and until when.
    expect(describePremise(inside.situation)).toContain('Adaya’s school day is on until 15:00')
  })

  it('does not offer a move that needs her while she is at school', () => {
    const inside = schoolMorningAt('10:00')
    const needsHer = inside.trace.proposed.filter((entry) => entry.verb === 'time-with')
    expect(needsHer, 'nothing requiring her presence should be proposed at ten').toEqual([])
  })

  it('keeps the arrangement itself, and never re-asks it', () => {
    /*
     * The other half, and the one that would be easy to break while fixing the
     * first: the custody arrangement is durable, the owner answered it once,
     * and section 62 is explicit that the app must not go back to him. What
     * narrows is the reading of the room, never the record.
     */
    const inside = schoolMorningAt('10:00')
    expect(inside.situation.childPresent.state).toBe('explicit')
    expect(isUsable(inside.situation.childPresent) && inside.situation.childPresent.value).toBe(
      true,
    )
  })

  it('has her back the moment school is over', () => {
    const after = schoolMorningAt('16:00')
    expect(isUsable(after.situation.childHere) && after.situation.childHere.value).toBe(true)
    expect(describePremise(after.situation)).toContain('Adaya is here')
  })

  it('leaves the middle of her school day free for him, which was the point', () => {
    // The finding that made the window worth entering at all. Her span is hers;
    // it must not become five hours of his own time being reported as taken.
    const inside = schoolMorningAt('10:00')
    expect(inside.situation.limiter?.kind).not.toBe('time')
    expect(
      inside.situation.inHand.minutes.state === 'inferred'
        ? inside.situation.inHand.minutes.value
        : -1,
    ).toBe(300)
  })

  /**
   * The class: every surface, every hour, one reading.
   *
   * The finding was not "the headline was wrong at ten". It was that presence
   * had two meanings sharing one field, so **every** consumer of that field was
   * wrong for the six and a half hours a weekday differs from a weekend — the
   * generator, the filter, the premise, the evidence panel and the ranking, at
   * every minute of the span rather than at the one the report happened to
   * open.
   */
  it('agrees with itself about her at every hour of the school day', () => {
    const hours = ['07:00', '08:00', '08:29', '08:31', '10:00', '12:00', '14:59', '15:01', '18:00']
    const wrong: string[] = []

    for (const hour of hours) {
      const decision = schoolMorningAt(hour)
      const here = decision.situation.childHere
      const claimed = isUsable(here) && here.value

      const said: string[] = [describePremise(decision.situation)]
      if (decision.explanation !== undefined) {
        said.push(decision.explanation.rendered.sentence, decision.explanation.rendered.reason)
      }
      for (const row of decision.trace.ranking) said.push(row.sentence)
      for (const suggestion of decision.growth) said.push(suggestion.headline)

      /*
       * Read as a rule about the copy rather than as a list of sentences: any
       * surface saying she is here, at a moment the situation says she is not.
       */
      if (!claimed) {
        for (const text of said) {
          if (/\bAdaya is here\b/.test(text)) wrong.push(`${hour}: “${text}”`)
        }
        for (const entry of decision.trace.proposed) {
          if (entry.verb === 'time-with') wrong.push(`${hour}: proposed time-with`)
        }
      }
    }

    expect(wrong, 'a surface claimed her presence at an hour the situation denied it').toEqual([])
  })

  /**
   * The surfaces that walk the registry \u2014 QA-82-001, round 2.
   *
   * Round 1 repaired the decision path and stopped there, and the round 1
   * tests asserted exactly what had been repaired: the premise, the proposals,
   * the filter and the stored arrangement. Every generic surface \u2014 the QA
   * fact ledger, the Fatherhood page's "What the app currently believes", the
   * export \u2014 renders the concept registry, and at ten past ten on a Wednesday
   * they all still printed the durable custody record as the answer to
   * *whether she is here today*.
   *
   * So the rule is about the registry rather than about a screen: a fact the
   * app is showing the owner has to be labelled as the thing it stores, and
   * used for the thing it answers.
   */
  it('shows the arrangement and the reading as two different things', () => {
    const inside = schoolMorningAt('10:20')
    const facts = new Map(inside.situation.considered.map((fact) => [fact.concept, fact]))

    const arrangement = facts.get(CONCEPT.childPresent)
    expect(arrangement, 'the arrangement should still be considered').toBeDefined()
    // It still says yes, because it is still his day. What it must not do is
    // claim to be the answer to where she is.
    expect(arrangement!.reading).toContain('yes')
    expect(arrangement!.label.toLowerCase()).toContain('care')
    for (const purpose of arrangement!.usedFor) {
      expect(purpose, 'the arrangement may not be used for presence').not.toMatch(
        /\bis here\b|\bin the room\b/,
      )
    }

    const reading = facts.get(CONCEPT.childHere)
    expect(reading, 'the current reading should be on the ledger too').toBeDefined()
    expect(reading!.reading).toMatch(/^No \u2014/)
    // And it names the span, because "no" alone leaves him guessing why.
    expect(reading!.reading).toContain('school day is on until 15:00')
    // Sourced from both the arrangement and the span it was narrowed by.
    expect(reading!.sources.length).toBeGreaterThan(1)
  })

  it('puts the reading on the Fatherhood page beside the arrangement', () => {
    const inside = schoolMorningAt('10:20')
    const page = pageForDomain(DOMAIN.fatherhood)
    expect(page, 'fatherhood should have a page').toBeDefined()
    const rows = assembleDomainPageData(inside.situation, page!).readings

    const arrangement = rows.find((row) => row.concept === CONCEPT.childPresent)
    const reading = rows.find((row) => row.concept === CONCEPT.childHere)
    expect(arrangement, 'the arrangement row should be on the page').toBeDefined()
    expect(reading, 'the current reading should be on the page').toBeDefined()

    // The one he answered is correctable; the one the app worked out is not.
    expect(arrangement!.derived).toBe(false)
    expect(reading!.derived).toBe(true)
    expect(reading!.question).toBeUndefined()
    expect(reading!.text).toContain('school day is on until 15:00')
  })

  /**
   * The class: no owner-facing surface may claim she is here while the
   * situation says she is not.
   *
   * Swept over every hour of the window and over every string those surfaces
   * can produce, rather than over the two rows the report happened to open.
   */
  it('never shows a presence claim the decision does not hold', () => {
    const wrong: string[] = []
    const page = pageForDomain(DOMAIN.fatherhood)!

    for (const hour of ['08:31', '10:20', '12:00', '14:59']) {
      const decision = schoolMorningAt(hour)
      const here = decision.situation.childHere
      if (isUsable(here) && here.value) continue

      const said: string[] = []
      for (const fact of decision.situation.considered) {
        said.push(`${fact.label}: ${fact.reading} (for ${fact.usedFor.join(', ')})`)
      }
      for (const row of assembleDomainPageData(decision.situation, page).readings) {
        said.push(`${row.label}: ${row.text}`)
      }

      for (const text of said) {
        /*
         * A row that pairs a word meaning "now" with a word meaning "yes" is
         * the shape of the defect, wherever it is written. The arrangement is
         * allowed to say yes; it is not allowed to say yes about now.
         */
        if (/here (?:right )?now|is here|in the room/i.test(text) && /\byes\b/i.test(text)) {
          wrong.push(`${hour}: \u201c${text}\u201d`)
        }
      }
    }

    expect(wrong, 'a fact surface claimed her presence inside her school day').toEqual([])
  })

  it('never invents presence the record does not carry', () => {
    /*
     * The narrowing can only ever subtract. A history that has never said whose
     * week it is must still produce an unknown, because a school window is
     * evidence about her day and not about the arrangement — and an unknown is
     * a question for the guide, not an absence for the filter.
     */
    const invented: string[] = []
    for (const scenario of SCENARIOS) {
      const decision = decideFor(scenario, scenario.now)
      const stated = decision.situation.childPresent
      const here = decision.situation.childHere
      if (isUsable(here) && !isUsable(stated)) invented.push(`${scenario.id}: read from nothing`)
      if (isUsable(here) && isUsable(stated) && here.value && !stated.value) {
        invented.push(`${scenario.id}: turned an absence into a presence`)
      }
    }
    expect(invented, 'the narrowing may only ever subtract').toEqual([])
  })
})

// ---------------------------------------------------------------------------
// QA-82-005 \u2014 one document may not answer a question and disown it
// ---------------------------------------------------------------------------

describe('QA-82-005 \u2014 a worked-out fact is never something nobody answered', () => {
  /**
   * The report's own reproduction, on the surface it was found on.
   *
   * The review export printed "Child here right now \u2014 No \u2014 Adaya's school day
   * is on until 15:00" under *What it read to decide that*, and then, in the
   * same generated document, "Child here right now \u2014 never answered" under
   * *Things the app knows it does not know*. The document explicitly asks
   * another assistant to treat it as the source of truth, so a reader had no
   * way to tell which of the two statements governed.
   */
  it('does not say the app never answered something it worked out', () => {
    const text = exportTextAt('10:20')

    expect(text, 'the export should carry the current reading').toContain(
      'Child here right now \u2014 No \u2014 Adaya\u2019s school day is on until 15:00.',
    )
    expect(text, 'and must not also disown it').not.toContain(
      'Child here right now \u2014 never answered',
    )
  })

  /**
   * The class, and it is deliberately not about the `derived` flag.
   *
   * A document that states a reading for a concept and lists that same concept
   * as unanswered is contradicting itself, whatever produced the reading. Said
   * that way, the rule also covers the next derived concept, a concept whose
   * record is retracted mid-composition, and whatever else grows a second path
   * into the unknown list. `derived` is why it happened; self-contradiction is
   * what is forbidden.
   */
  it('never states a reading and lists the same concept as unanswered', () => {
    const contradictions: string[] = []

    for (const time of ['05:30', '08:20', '10:20', '16:00']) {
      const text = exportTextAt(time)
      /*
       * The label is everything before the first em dash on a fact line; the
       * value after it may contain more of them, which is why the match is
       * non-greedy and anchored on the state in brackets at the end.
       */
      const read = new Set(
        [...text.matchAll(/^- (.+?) — .*\((?:explicit|inferred|stale); for /gm)].map((found) =>
          found[1]!.trim(),
        ),
      )
      /*
       * Any unknown, not the one sentence there used to be \u2014 QA-82-008.
       *
       * `\u2014 never answered` was the only thing this section could say about an
       * unknown, so matching it was matching the class. It is now one of six,
       * and a guard still written against it would pass a document that stated
       * a reading and then called the same concept withdrawn.
       */
      const heading = 'Things the app knows it does not know:'
      const lines = text.split(String.fromCharCode(10))
      const start = lines.indexOf(heading)
      for (const line of start === -1 ? [] : lines.slice(start + 1)) {
        if (line === '') break
        const match = /^- (.+?) \u2014 /.exec(line)
        if (match === null) continue
        const label = match[1]!.trim()
        if (read.has(label))
          contradictions.push(`${time}: \u201c${label}\u201d both read and unanswered`)
      }
    }

    expect(contradictions, 'one document answered a question and disowned it').toEqual([])
  })

  /**
   * And the boundary itself, because the surfaces are the symptom.
   *
   * `coverage.ts` had its own exclusion and the export did not, which is the
   * shape of a defect that comes back: the next surface to walk raw fact state
   * would not know it needed one either. The one place that knows a concept
   * cannot be recorded is the layer that resolves records, so that is where it
   * is excluded \u2014 and this asserts it there rather than on any one screen.
   */
  it('never manufactures an unanswered fact for something no record can carry', () => {
    const offenders: string[] = []

    for (const scenario of SCENARIOS) {
      const decision = decideFor(scenario, scenario.now)
      const facts = decision.situation.view.facts
      for (const definition of decision.situation.concepts.all()) {
        if (definition.derived !== true) continue
        if (facts.get(definition.id) !== undefined) {
          offenders.push(`${scenario.id}: ${definition.id} has a raw fact entry`)
        }
        if (facts.inState('unknown').some((entry) => entry.definition.id === definition.id)) {
          offenders.push(`${scenario.id}: ${definition.id} is listed as unknown`)
        }
        if (facts.questions.some((entry) => entry.definition.id === definition.id)) {
          offenders.push(`${scenario.id}: ${definition.id} is something the guide would ask`)
        }
        for (const domain of decision.situation.coverage.domains) {
          if (domain.concepts.some((row) => row.concept === definition.id)) {
            offenders.push(`${scenario.id}: ${definition.id} is counted as coverage`)
          }
        }
      }
    }

    expect(offenders, 'a derived concept reached a surface that asks the owner for it').toEqual([])
  })

  it('excludes any derived concept, not the one that happens to exist', () => {
    /*
     * The hole the first version of this guard had, found by reintroducing a
     * narrower fix rather than by reading it.
     *
     * `family.child-here-now` is the only derived concept today, so an
     * exclusion written as `id !== 'family.child-here-now'` passes every
     * assertion above. That is the same mistake Round 2 caught in a different
     * costume: a guard that would not notice the second member of the class.
     *
     * So the rule is exercised against a registry with a second derived
     * concept invented for the purpose. Nothing records it either, and it must
     * be absent from the raw fact layer for the same reason.
     */
    const invented = conceptId('made.up-derived')
    const registry = createConceptRegistry().extendedWith([
      {
        id: invented,
        label: 'Something worked out',
        domain: DOMAIN.home,
        derived: true,
        freshness: { unit: 'durable' },
        privacy: 'normal',
        ask: { materialToDecision: false, askWhenStale: false },
        purpose: 'a concept invented by a fixture',
      },
    ])

    const loaded = snapshotFromWire(schoolMorning())
    const moment = {
      now: at('10:20', ZONE, SCHOOL_MORNING_NOW),
      zone: ZONE,
      weekStartsOn: 1 as const,
    }
    const view = buildView(loaded.snapshot, { ...moment, concepts: registry })

    expect(view.facts.get(invented), 'a second derived concept still got an entry').toBeUndefined()
    expect(
      view.facts.inState('unknown').map((entry) => entry.definition.id),
      'a second derived concept was listed as unanswered',
    ).not.toContain(invented)
    // And an ordinary invented concept is still seeded, so the exclusion is
    // about being derived rather than about being new.
    const ordinary = conceptId('made.up-ordinary')
    const alsoRegistry = createConceptRegistry().extendedWith([
      {
        id: ordinary,
        label: 'Something he could answer',
        domain: DOMAIN.home,
        freshness: { unit: 'durable' },
        privacy: 'normal',
        ask: { materialToDecision: false, askWhenStale: false },
        purpose: 'a concept invented by a fixture',
      },
    ])
    const alsoView = buildView(loaded.snapshot, { ...moment, concepts: alsoRegistry })
    expect(alsoView.facts.get(ordinary)?.knowledge.state).toBe('unknown')
  })

  it('still says the app has not heard about the things it genuinely has not', () => {
    /*
     * The other half, and the one an over-broad fix would break. Excluding a
     * concept from the unknown list is only safe because nothing can ever
     * answer it. Every concept the owner *can* answer must still appear when
     * nothing has been said about it \u2014 that list is what the guide asks from
     * and what the export means by "things the app knows it does not know".
     */
    const text = exportTextAt('10:20')
    expect(text).toContain('Things the app knows it does not know:')
    expect(text).toContain('Soreness or pain \u2014 never answered')

    const decision = schoolMorningAt('10:20')
    const unknown = decision.situation.view.facts.inState('unknown')
    expect(unknown.length, 'the honest unknowns are still there').toBeGreaterThan(5)
  })

  it('leaves a history with no child alone entirely', () => {
    /*
     * Round 3 confirmed this and it is asserted here so it stays true: with no
     * fatherhood person in the record there is no derived row anywhere, and the
     * durable arrangement is still a question the guide may ask.
     */
    const thin = SCENARIOS.find((scenario) => scenario.id === 'mostly-unknown')
    expect(thin, 'the near-empty history should be in the library').toBeDefined()
    const decision = decideFor(thin!, thin!.now)

    expect(
      decision.situation.considered.some((fact) => fact.concept === CONCEPT.childHere),
      'nothing to derive from, so nothing derived',
    ).toBe(false)
    expect(decision.situation.view.facts.get(CONCEPT.childHere)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// QA-82-002 — a held decision's evidence must answer the question it raised
// ---------------------------------------------------------------------------

describe('QA-82-002 — why later rather than now', () => {
  it('answers the deferral on the panel that exists to explain the decision', () => {
    const early = schoolMorningAt('05:40')
    expect(early.kind).toBe('hold')

    const evidence = evidenceForDecision(early)
    expect(evidence, 'a hold on screen must have an evidence panel').toBeDefined()
    expect(evidence!.deferral.length, 'the panel said nothing about the deferral').toBeGreaterThan(
      0,
    )

    const said = evidence!.deferral.join(' ')
    // The block it is being held for, named — not "later" in general.
    expect(said).toContain('morning')
    // And the room in it, because that is a condition the deferral rested on.
    expect(said).toMatch(/\bfree\b|\bnot spoken for\b|\broom\b/)
  })

  it('says nothing about a deferral where there was none', () => {
    const later = schoolMorningAt('10:00')
    expect(later.kind).not.toBe('hold')
    expect(evidenceForDecision(later)?.deferral ?? []).toEqual([])
  })

  /**
   * The class: a decision kind the panel does not answer for.
   *
   * The old invariant asked whether the panel had a move in it, which is true
   * of a hold and tells the reader nothing — the move is the thing the app is
   * declining to offer. The rule is the one section 51 actually states: the
   * panel explains **the decision on screen**, and a decision kind it has
   * nothing to say about is a "see evidence" button with nothing behind it.
   */
  it('answers for every decision kind the library can reach', () => {
    const missing: string[] = []
    const kinds = new Set<Decision['kind']>()

    for (const scenario of SCENARIOS) {
      for (const time of ['02:30', '05:40', '09:30', '15:00', '20:00', '23:00']) {
        const decision = decideFor(scenario, at(time, scenario.zone, scenario.now))
        kinds.add(decision.kind)
        const evidence = evidenceForDecision(decision)
        if (decision.kind === 'no-action') {
          // Correct, and stated: Now carries its own explanation for a night
          // with nothing on it, and a panel here would be a second one.
          if (evidence !== undefined) missing.push(`${scenario.id} ${time}: a panel on no-action`)
          continue
        }
        if (evidence === undefined) {
          missing.push(`${scenario.id} ${time}: ${decision.kind} with no panel`)
          continue
        }
        if (decision.kind === 'hold' && evidence.deferral.length === 0) {
          missing.push(`${scenario.id} ${time}: a hold that does not say why later`)
        }
        if (decision.kind === 'move' && evidence.deferral.length > 0) {
          missing.push(`${scenario.id} ${time}: a move explaining a deferral it did not make`)
        }
      }
    }

    expect(missing, 'a decision kind the evidence panel does not answer for').toEqual([])
    // And the enumeration is only worth anything if it reached the kinds.
    expect([...kinds].sort()).toEqual(['hold', 'move', 'no-action'])
  })

  it('holds it to somewhere, and never argues for doing it now', () => {
    /*
     * The contradiction the deferral copy exists to avoid, checked as a rule.
     * The held move's own reason ("that window closes on its own") is an
     * argument for acting immediately, and it must not reach this panel.
     */
    const found: string[] = []
    for (const scenario of SCENARIOS) {
      for (const time of ['02:30', '05:40', '09:30', '15:00', '20:00', '23:00']) {
        const decision = decideFor(scenario, at(time, scenario.zone, scenario.now))
        if (decision.kind !== 'hold') continue
        for (const line of evidenceForDecision(decision)?.deferral ?? []) {
          if (/\bright now\b|\bcloses on its own\b|\bdo it now\b/i.test(line)) {
            found.push(`${scenario.id} ${time}: argued for now — “${line}”`)
          }
          /*
           * And held to a place rather than to later in general. AUD-0024 is
           * explicit that "not now, later" is only credible about the next
           * stretch of the day; the arbiter enforces that structurally, and
           * this is the copy half of the same rule. Vague deferral language
           * here would describe a decision the app did not make.
           */
          if (
            /\ba later part of today\b|\blater on\b|\bsometime later\b|\bat some point\b/i.test(
              line,
            )
          ) {
            found.push(`${scenario.id} ${time}: deferred to nowhere — “${line}”`)
          }
        }
      }
    }
    expect(found, 'the deferral panel argued for now, or held to nowhere').toEqual([])
  })
})

// ---------------------------------------------------------------------------
// QA-82-003 — a note may not contradict the figure beside it
// ---------------------------------------------------------------------------

describe('QA-82-003 — a move that fits exactly', () => {
  it('does not say a ten-minute move will not fit in ten minutes', () => {
    /*
     * The report's own reproduction. Twenty past eight, ten minutes before the
     * school run, every move trimmed to ten minutes by the engine itself — and
     * the trace beside each one reading "would not fit before Adaya's school
     * day". A figure the app worked out, contradicted by a sentence the app
     * wrote, about the same move.
     */
    const tight = schoolMorningAt('08:20')
    const rows = tight.trace.ranking.filter(
      (row) => row.dimensions.find((d) => d.name === 'time-fit') !== undefined,
    )
    expect(rows.length, 'the tight hour should still rank something').toBeGreaterThan(0)

    for (const row of rows) {
      const note = row.dimensions.find((d) => d.name === 'time-fit')?.note ?? ''
      expect(note, `${row.id} was told it would not fit`).not.toContain('would not fit')
      expect(row.minutes, `${row.id} should have been trimmed to the ten minutes`).toBe(10)
    }
  })

  it('still says so when a move genuinely does not fit', () => {
    /*
     * The other side of the boundary, and the reason the repair is a boundary
     * rather than a deletion. Three minutes before the school run a move cannot
     * be trimmed any further — `sizeFor` floors it at five, because a
     * two-minute walk is not a thing to suggest — and the filter is comparing
     * against the free time the owner *stated* rather than against the run-up
     * to her school day. So a five-minute move reaches the evaluator with three
     * minutes to do it in, and there the sentence is true.
     */
    const tighter = schoolMorningAt('08:27')
    const rows = tighter.trace.ranking.filter((row) => (row.minutes ?? 0) > 3)
    expect(rows.length, 'a move that cannot be trimmed any further should rank').toBeGreaterThan(0)

    for (const row of rows) {
      const fit = row.dimensions.find((d) => d.name === 'time-fit')
      expect(fit?.note, `${row.id} should say it does not fit`).toContain('would not fit')
      // And count against the move rather than abstaining, which was the same
      // defect expressed in the number instead of in the words.
      expect(fit?.value ?? 0, `${row.id} overruns and should score below zero`).toBeLessThan(0)
    }
  })

  /**
   * The class: a band whose sentence is not true of its own range.
   *
   * The defect was not an off-by-one. One band was carrying two different facts
   * — "uses everything there is" and "does not fit at all" — and had to pick
   * one sentence for both, so the sentence was false across most of the range
   * that reached it. Checked here against the figures the dimension was given,
   * minute by minute through the approach to an obligation and then across the
   * whole library at every block. This is the assertion that fails the moment a
   * band and its words drift apart again.
   */
  it('never tells the owner a move will not fit when it does, at any hour', () => {
    const contradictions: string[] = []

    const check = (label: string, decision: Decision) => {
      const held = decision.situation.inHand.minutes
      if (!isUsable(held)) return
      for (const row of decision.trace.ranking) {
        const fit = row.dimensions.find((d) => d.name === 'time-fit')
        if (fit === undefined || row.minutes === undefined) continue

        const overruns = row.minutes > held.value
        const saysItDoesNot = /would not fit|is longer than/.test(fit.note)
        const where = `${label} ${row.id}: “${fit.note}” with ${row.minutes} of ${held.value}`
        if (saysItDoesNot && !overruns) contradictions.push(`${where} — said no, and it fits`)
        if (overruns && !saysItDoesNot) contradictions.push(`${where} — said yes, and it does not`)
        // The score has to agree with the words, or the ranking is saying one
        // thing while the trace beside it says another.
        if (overruns && fit.value >= 0) contradictions.push(`${where} — overruns and scores 0`)
      }
    }

    /*
     * Every minute of the approach to an obligation, because that is where the
     * bands are: the run-up to her school day walks `inHand` from thirty
     * minutes down to nothing and crosses all four of them on the way.
     */
    for (let minute = 0; minute <= 35; minute += 1) {
      const clock = `08:${String(minute).padStart(2, '0')}`
      check(clock, schoolMorningAt(clock))
    }

    for (const scenario of SCENARIOS) {
      for (const time of ['02:30', '05:40', '09:30', '15:00', '20:00', '23:00']) {
        check(`${scenario.id} ${time}`, decideFor(scenario, at(time, scenario.zone, scenario.now)))
      }
    }

    expect(contradictions, 'a time-fit note contradicted the figures it was given').toEqual([])
  })

  it('reaches all five bands, so none of them is a guard nobody checks', () => {
    /*
     * A band no test arrives at is a band that can say anything. The approach
     * to the school run is the one stretch of the library that crosses every
     * one of them, which is why the sweep above walks it minute by minute.
     *
     * Five, not four \u2014 QA-82-003 round 2. "Would use all the time" used to
     * cover everything from four-fifths of the window to all of it.
     */
    const notes = new Set<string>()
    for (let minute = 0; minute <= 35; minute += 1) {
      const clock = `08:${String(minute).padStart(2, '0')}`
      for (const row of schoolMorningAt(clock).trace.ranking) {
        const fit = row.dimensions.find((d) => d.name === 'time-fit')
        if (fit !== undefined) notes.add(fit.note)
      }
    }
    expect([...notes].sort()).toEqual([
      'fits',
      'fits comfortably',
      'would not fit before Adaya\u2019s school day',
      'would use all the time before Adaya\u2019s school day',
      'would use most of the time before Adaya\u2019s school day',
    ])
  })

  it('says "all" only when the move uses every minute there is', () => {
    /*
     * QA-82-003, round 2, and the reproduction the report gives.
     *
     * Eighteen minutes past eight: twelve minutes before her school day, and a
     * ten-minute recall session. `opportunity-cost` said it takes about 83
     * percent of what is left; `time-fit`, on the row directly above it, said
     * it would use all the time. Two of the app's own numbers about one move,
     * disagreeing in one glance.
     *
     * The round 1 test could not see it: it asked whether the four note
     * strings were reachable and whether "would not fit" agreed with an
     * overrun, and every one of those questions had the right answer.
     */
    const twelve = schoolMorningAt('08:18')
    expect(
      twelve.situation.inHand.minutes.state === 'inferred'
        ? twelve.situation.inHand.minutes.value
        : -1,
      'the fixture should leave twelve minutes at 08:18',
    ).toBe(12)

    const near = twelve.trace.ranking.find((row) => row.minutes === 10)
    expect(near, 'a ten-minute move should rank at 08:18').toBeDefined()
    const note = near!.dimensions.find((d) => d.name === 'time-fit')?.note ?? ''
    expect(note).toBe('would use most of the time before Adaya\u2019s school day')

    // And the move that genuinely takes all twelve still says so, on the same
    // screen, so the distinction is visible rather than merely correct.
    const exact = twelve.trace.ranking.find((row) => row.minutes === 12)
    expect(exact?.dimensions.find((d) => d.name === 'time-fit')?.note).toBe(
      'would use all the time before Adaya\u2019s school day',
    )
  })

  /**
   * The class, stated as the two dimensions agreeing rather than as a band
   * table \u2014 QA-82-003, round 2.
   *
   * The round 1 guard compared `time-fit`'s words with the minutes, which
   * caught "would not fit" and nothing else, because "all" was not a claim it
   * knew how to check. This compares the words with the **percentage the app
   * prints beside them**: whatever `opportunity-cost` says the move takes,
   * `time-fit`'s sentence has to be true of that share. It is the assertion
   * that would have failed on the deployed build.
   */
  it('never disagrees with the percentage printed beside it', () => {
    const contradictions: string[] = []

    const check = (label: string, decision: Decision) => {
      const held = decision.situation.inHand.minutes
      if (!isUsable(held)) return
      for (const row of decision.trace.ranking) {
        const fit = row.dimensions.find((d) => d.name === 'time-fit')
        const cost = row.dimensions.find((d) => d.name === 'opportunity-cost')
        if (fit === undefined || row.minutes === undefined) continue

        const percent = Number(/about (\d+) percent/.exec(cost?.note ?? '')?.[1] ?? Number.NaN)
        const where = `${label} ${row.id}: \u201c${fit.note}\u201d with ${row.minutes} of ${held.value}`

        /*
         * Each sentence, against the range it is allowed to be said in. Read
         * as a rule about meaning rather than as a table of strings: "all"
         * means every minute, "most" means more than half and not all, and
         * "not fit" means more than there is.
         */
        if (/would use all the time|would use the rest of/.test(fit.note)) {
          if (row.minutes !== held.value) contradictions.push(`${where} \u2014 said all, uses part`)
          if (!Number.isNaN(percent) && percent !== 100) {
            contradictions.push(`${where} \u2014 said all, beside ${percent}%`)
          }
        }
        if (/would use most of/.test(fit.note)) {
          if (row.minutes >= held.value) contradictions.push(`${where} \u2014 said most, uses all`)
          if (!Number.isNaN(percent) && percent >= 100) {
            contradictions.push(`${where} \u2014 said most, beside ${percent}%`)
          }
        }
        if (/would not fit|is longer than/.test(fit.note) && row.minutes <= held.value) {
          contradictions.push(`${where} \u2014 said no, and it fits`)
        }
        if (row.minutes > held.value) {
          if (!/would not fit|is longer than/.test(fit.note)) {
            contradictions.push(`${where} \u2014 overruns and does not say so`)
          }
          if (fit.value >= 0)
            contradictions.push(`${where} \u2014 overruns and scores ${fit.value}`)
        }
      }
    }

    // Every minute of the approach to an obligation, where the bands are, and
    // then the whole library at every block.
    for (let minute = 0; minute <= 35; minute += 1) {
      const clock = `08:${String(minute).padStart(2, '0')}`
      check(clock, schoolMorningAt(clock))
    }
    for (const scenario of SCENARIOS) {
      for (const time of ['02:30', '05:40', '09:30', '15:00', '20:00', '23:00']) {
        check(`${scenario.id} ${time}`, decideFor(scenario, at(time, scenario.zone, scenario.now)))
      }
    }

    expect(contradictions, 'a time-fit note contradicted the figures beside it').toEqual([])
  })
})

// ---------------------------------------------------------------------------
// The seed that made the whole of QA-82-001 reachable
// ---------------------------------------------------------------------------

describe('an owner-entered span says whose it is', () => {
  it('writes the person onto the school window', () => {
    /*
     * Without this the school day is a shape in the day with nobody in it, and
     * nothing downstream can work out that the person it takes away is the
     * person a move was about.
     */
    const decision = schoolMorningAt('10:00')
    const school = decision.situation.commitments.find((entry) => entry.whose === 'theirs')
    expect(school, 'the fixture should carry her school day').toBeDefined()
    expect(school!.about.length, 'a span of someone else\u2019s time names them').toBeGreaterThan(0)

    const child = decision.situation.entities
      .byKind('person')
      .find((entity) => entity.domain === DOMAIN.fatherhood)
    expect(school!.about.some((ref) => ref.id === child?.id)).toBe(true)
  })

  it('writes it on the path the owner actually takes', () => {
    /*
     * The fixture was hand-built and already named her, so it proved nothing
     * about the product: the school window a real owner has is the one the Life
     * screen writes when he answers the seed. That path did not name anybody
     * until QA-82-001, and no test would have noticed.
     */
    const situation = schoolMorningAt('10:00').situation
    const seed = SCHEDULE_SEEDS.find((entry) => entry.id === 'school-day')
    expect(seed, 'the school-day seed should exist').toBeDefined()

    const child = situation.entities
      .byKind('person')
      .find((entity) => entity.domain === DOMAIN.fatherhood)
    expect(seed!.about(situation).map((ref) => ref.id)).toEqual([child?.id])

    const written = commitmentWindowRecord(
      {
        label: seed!.label(situation),
        startsAt: seed!.startsAt,
        endsAt: seed!.endsAt,
        recurrence: { kind: 'weekly', days: [1, 2, 3, 4, 5] },
        whose: seed!.whose,
        domain: seed!.domain,
        knownFrom: 'recurring',
        about: seed!.about(situation),
      },
      { now: situation.at, zone: situation.zone },
    )
    expect(written.entities.map((entity) => entity.id)).toEqual([child?.id])
  })

  it('the working-hours seed names nobody, and that is an answer', () => {
    // It takes the owner, who is not a row in his own model. An empty list is
    // the honest state rather than a gap — and asserting it is what stops
    // somebody "fixing" it by inventing an entity for him.
    const situation = schoolMorningAt('10:00').situation
    const work = SCHEDULE_SEEDS.find((entry) => entry.id === 'working-hours')
    expect(work!.about(situation)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// The filter's own backstop, which the generator hides
// ---------------------------------------------------------------------------

describe('QA-82-001 — the filter refuses a move about someone who is out', () => {
  it('removes it, and says which span took her', () => {
    /*
     * Unreachable through the engine, and that is exactly why it is tested
     * here. The generator stops proposing a move about her before the filter
     * ever sees one, so the filter's own read of presence is a backstop no
     * end-to-end test can exercise — and a guard nothing reaches is a guard
     * that can say anything (D-108). A pasted history can carry any candidate.
     */
    const situation = schoolMorningAt('10:00').situation
    const child = situation.entities
      .byKind('person')
      .find((entity) => entity.domain === DOMAIN.fatherhood)
    expect(child, 'the fixture should carry her').toBeDefined()

    const her = { id: child!.id, kind: child!.kind }
    const move: Candidate = {
      id: 'test/time-with/adaya',
      generator: 'fatherhood',
      leansOn: [],
      resolves: [],
      profile: profileFor('time-with'),
      proposedBecause: 'a move about her, arriving while she is at school',
      semantics: {
        subject: her,
        domain: DOMAIN.fatherhood,
        target: { verb: 'time-with', object: her, minutes: 30 },
        whyNow: { trigger: 'opportunity-window', summary: '', evidence: [] },
        evidence: [],
      },
    }

    const { kept, rejected } = applyConstraints([move], situation)
    expect(kept).toEqual([])
    expect(rejected[0]?.reason).toBe('subject-not-available')
    // Naming the span is the difference between a fact he can act on and one he
    // already had. "She is not here" tells him nothing at ten on a Wednesday.
    expect(rejected[0]?.explanation).toBe('Adaya\u2019s school day is on until 15:00')
  })
})
