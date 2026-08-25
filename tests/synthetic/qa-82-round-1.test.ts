import { describe, expect, it } from 'vitest'
import { DOMAIN } from '../../src/domain/domains'
import {
  civilDateFromDayId,
  instantAtLocal,
  localDateTimeAt,
  type Instant,
  type TimeZoneId,
} from '../../src/domain/time'
import type { Candidate } from '../../src/intelligence/candidates'
import { SCHEDULE_SEEDS, commitmentWindowRecord } from '../../src/intelligence/commitments'
import { applyConstraints } from '../../src/intelligence/constraints'
import { decide, type Decision } from '../../src/intelligence/engine'
import { describePremise } from '../../src/intelligence/explain'
import { evidenceForDecision } from '../../src/intelligence/insights'
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

  it('reaches all four bands, so none of them is a guard nobody checks', () => {
    /*
     * A band no test arrives at is a band that can say anything. The approach
     * to the school run is the one stretch of the library that crosses every
     * one of them, which is why the sweep above walks it minute by minute.
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
    ])
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
