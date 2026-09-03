import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { entityRef } from '../../src/domain/entities'
import { blockOf, instant, timeZone, type DayBlock, type Instant } from '../../src/domain/time'
import { generateCandidates, type Candidate } from '../../src/intelligence/candidates'
import { applyConstraints } from '../../src/intelligence/constraints'
import { profileFor } from '../../src/intelligence/moves'
import { decide } from '../../src/intelligence/engine'
import { assembleSituation, type ShownMove } from '../../src/intelligence/situation'
import { buildView } from '../../src/memory/view'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { createKit } from '../../src/synthetic/kit'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { decideOn, loadScenario } from './harness'

/**
 * DEF-0016 — a strained late afternoon has nowhere to go.
 *
 * The reported line: a man nine hours short of sleep, reading his phone at a
 * quarter to six, told **"Nothing fits tonight."** and offered nothing at all.
 * Fifteen minutes later the same history says "Start winding down now and let
 * tonight be a recovery night."
 *
 * The class is wider than the hour: **a generator that offers only moves the
 * filter will certainly refuse.** `protect-sleep` refusing the afternoon is
 * correct — telling someone at five to start winding down for the night is
 * worse than saying nothing — so the fault was never the refusal. It was
 * proposing a certain refusal and having no alternative behind it.
 *
 * Two tests below, and they are deliberately different shapes. The first is the
 * reported case. The second is the class: swept over every generator, every
 * block and every scenario in the library, a generator that produces anything
 * must produce at least one thing the hour allows.
 */

const ZONE = timeZone('America/Denver')

/**
 * Nine hours down, no study topic, and an afternoon.
 *
 * Built here rather than added to the scenario library: it exists to hold one
 * defect's ground, and a history with nothing in it but sleep debt is not a
 * life the owner would recognise (D-041).
 */
function nineHoursDown(): ReturnType<typeof buildDocument> {
  return buildDocument()
}

function buildDocument() {
  const kit = createKit('DF', 'America/Denver', '2026-04-01T12:00:00Z')
  const nights = [4.5, 4.25, 5].map((value, offset) =>
    kit.record(
      'observation',
      { occurredAt: kit.local(`2026-04-${13 + offset}`, '07:00'), domains: [DOMAIN.sleep] },
      {
        concept: CONCEPT.sleepHours,
        value: { type: 'number', value, unit: 'hours' },
        method: 'self-report',
      },
    ),
  )

  const energy = kit.record(
    'observation',
    { occurredAt: kit.local('2026-04-15', '15:00'), domains: [DOMAIN.health] },
    { concept: CONCEPT.energy, value: { type: 'scale', value: 1, of: 5 }, method: 'self-report' },
  )

  return kit.document({
    entities: [],
    records: [...nights, energy],
    exportedAt: kit.local('2026-04-15', '17:45'),
  })
}

/**
 * Twelve minutes, a rested body, and nothing in the history to spend them on.
 *
 * The remaining route to DEF-0017's branch: a limiter the engine can name out
 * loud, and an empty catalogue underneath it. Nothing here is strained, so the
 * recovery generator correctly stays quiet, and no topic, place or person means
 * nothing else has a subject to be about.
 */
function noTimeLeft(saidAt: string) {
  const kit = createKit('DT', 'America/Denver', '2026-04-01T12:00:00Z')
  const nights = [7.5, 7.75, 8].map((value, offset) =>
    kit.record(
      'observation',
      { occurredAt: kit.local(`2026-04-${13 + offset}`, '07:00'), domains: [DOMAIN.sleep] },
      {
        concept: CONCEPT.sleepHours,
        value: { type: 'number', value, unit: 'hours' },
        method: 'self-report',
      },
    ),
  )

  const minutes = kit.record(
    'observation',
    // In the block it is about. How much time there is expires at the boundary
    // of the part of the day it was said in (AUD-0005), so a fixture that wants
    // the time limiter at nine in the morning has to answer in the morning.
    { occurredAt: kit.local('2026-04-15', saidAt), domains: [DOMAIN.direction] },
    {
      concept: CONCEPT.usableTimeTonight,
      value: { type: 'duration', minutes: 12 },
      method: 'self-report',
    },
  )

  return kit.document({
    entities: [],
    records: [...nights, minutes],
    exportedAt: kit.local('2026-04-15', '20:00'),
  })
}

function at(dayId: string, time: string): Instant {
  return createKit('DF', 'America/Denver', '2026-04-01T12:00:00Z').local(dayId, time)
}

describe('DEF-0016 — the late afternoon has a recovery move', () => {
  it('offers something at a quarter to six rather than nothing', () => {
    const decision = decideOn(nineHoursDown(), at('2026-04-15', '17:45'), ZONE)

    expect(decision.kind).toBe('move')
    expect(decision.explanation?.rendered.sentence).toBe(
      'Start easing off now — the rest of today can be a light one.',
    )
  })

  it('still says the right thing fifteen minutes later', () => {
    // The evening boundary is unchanged, and so is the move it belongs to.
    const decision = decideOn(nineHoursDown(), at('2026-04-15', '18:00'), ZONE)

    expect(decision.explanation?.rendered.sentence).toBe(
      'Start winding down now and let tonight be a recovery night.',
    )
  })

  it('never leaves a strained day with nothing, at any hour of it', () => {
    /*
     * **Midnight to midnight**, and the bound is the finding — AUD-0003.
     *
     * DEF-0016's own sweep started at noon, because the defect it was written
     * for was an afternoon one. Everything before noon went unasked, and before
     * noon the generator returned nothing at all: a man nine hours short of
     * rest was handed a study session under a line naming the shortfall. A
     * sweep that stops where the last defect stopped will only ever find the
     * last defect.
     */
    for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
      const hour = String(Math.floor(minutes / 60)).padStart(2, '0')
      const minute = String(minutes % 60).padStart(2, '0')
      const moment = at('2026-04-15', `${hour}:${minute}`)
      const decision = decideOn(nineHoursDown(), moment, ZONE)

      expect(decision.situation.limiter?.kind, `${hour}:${minute}`).toBe('recovery')
      expect(decision.kind, `${hour}:${minute} said ${decision.noAction?.headline ?? ''}`).toBe(
        'move',
      )
    }
  })

  it('reports no wrong-time-of-day refusal on the way there', () => {
    // The symptom the owner saw was a refusal with nothing behind it. There is
    // now no refusal to have nothing behind, at any hour.
    for (const time of ['01:00', '05:30', '09:00', '13:00', '15:30', '17:45', '19:00', '22:30']) {
      const decision = decideOn(nineHoursDown(), at('2026-04-15', time), ZONE)
      const refusals = decision.trace.rejected.filter((row) => row.reason === 'wrong-time-of-day')
      expect(
        refusals.map((row) => row.candidate),
        time,
      ).toEqual([])
    }
  })
})

// ---------------------------------------------------------------------------
// The class
// ---------------------------------------------------------------------------

const EVERY_BLOCK: readonly { readonly block: DayBlock; readonly time: string }[] = [
  { block: 'late-night', time: '02:30' },
  { block: 'early-morning', time: '05:30' },
  { block: 'morning', time: '09:00' },
  { block: 'afternoon', time: '15:00' },
  { block: 'evening', time: '20:00' },
  { block: 'late-night', time: '23:00' },
]

describe('the answer to a limiter is never removed by the hour alone', () => {
  /*
   * The class, stated as narrowly as it is actually true.
   *
   * A generator staying quiet is not the defect. A walk has no business being
   * suggested at midnight, and the movement generator proposing one and having
   * it refused costs nothing an owner can see — "Nothing fits tonight" at
   * eleven, with nothing pressing, is an honest sentence.
   *
   * The defect is narrower and worse: the engine can see what is in the way,
   * something is proposed *because* of it, and the hour removes all of it. Then
   * the owner is told nothing fits by an app that has just told them what is
   * wrong, which is the screen DEF-0016 produced.
   */
  it('holds across every scenario in the library, at every hour', () => {
    const offenders: string[] = []

    for (const scenario of SCENARIOS) {
      const loaded = snapshotFromWire(scenario.build())

      for (const { time } of EVERY_BLOCK) {
        const moment = movedTo(scenario.now, time, scenario.zone)
        const view = buildView(loaded.snapshot, { now: moment, zone: scenario.zone })
        const situation = assembleSituation(view, {
          now: moment,
          zone: scenario.zone,
          weekStartsOn: scenario.weekStartsOn ?? 1,
        })
        if (situation.limiter === undefined) continue

        // Only the moves that answer the limiter — the restorative ones. If any
        // of those were proposed, at least one has to survive the hour.
        const answers = generateCandidates(situation).filter(
          (candidate) => profileFor(candidate.semantics.target.verb).demand === 'restorative',
        )
        if (answers.length === 0) continue

        const survives = answers.some(
          (candidate) =>
            !profileFor(candidate.semantics.target.verb).refuses.includes(situation.block),
        )
        if (!survives) {
          offenders.push(
            `${scenario.id} at ${time} (${situation.block}): only ${answers
              .map((candidate) => candidate.semantics.target.verb)
              .join(', ')}`,
          )
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it('is looking at real hours', () => {
    // A sweep that never reaches a block proves nothing about that block.
    const reached = new Set(
      EVERY_BLOCK.map(({ time }) => blockOf(movedTo(at('2026-04-15', '12:00'), time, ZONE), ZONE)),
    )
    expect([...reached].sort()).toEqual([
      'afternoon',
      'early-morning',
      'evening',
      'late-night',
      'morning',
    ])
  })
})

describe('DEF-0017 — the app does not call its own history silent', () => {
  /*
   * Found while sweeping DEF-0016's siblings, and it is the same family as
   * DEF-0012: a sentence about the engine's own blindness, written as a finding
   * about the owner's life.
   *
   * At nine in the morning, nine hours short of rest, Now printed the shortfall
   * in the line above the decision and then said "there is plenty of history
   * here, and none of it says how tonight is going" underneath it. The history
   * was saying exactly how the day was going. What was empty was the catalogue:
   * every recovery move belongs to an hour that had not arrived.
   */
  it('says nothing about the history being silent when it can name the limiter', () => {
    /*
     * The branch DEF-0017 added, reached through the limiter that can still
     * empty the catalogue. Twelve minutes left and nothing that fits is an
     * honest state; claiming the history has not said how the day is going,
     * with the shortfall printed directly above, is not.
     *
     * The morning used to be this test's case and is no longer: the morning has
     * a move now (AUD-0003), which is the point.
     */
    for (const [saidAt, time] of [
      ['06:20', '06:30'],
      ['08:50', '09:00'],
      ['12:50', '13:00'],
      ['18:50', '19:00'],
    ]) {
      const decision = decideOn(noTimeLeft(saidAt ?? ''), at('2026-04-15', time ?? ''), ZONE)
      expect(decision.situation.limiter?.kind, time).toBe('time')
      expect(decision.kind, time).toBe('no-action')
      expect(decision.noAction?.detail, time).not.toMatch(/none of it says/i)
      expect(decision.noAction?.detail, time).toBe('Nothing here would fit the time left.')
    }
  })

  it('holds for every scenario and every hour, not only the morning', () => {
    const offenders: string[] = []

    for (const scenario of SCENARIOS) {
      const loaded = snapshotFromWire(scenario.build())
      for (const { time } of EVERY_BLOCK) {
        const moment = movedTo(scenario.now, time, scenario.zone)
        const decision = decideOn(scenario.build(), moment, scenario.zone)
        expect(loaded.loaded).toBe(true)
        if (decision.situation.limiter === undefined) continue
        if (decision.noAction === undefined) continue
        if (/none of it says/i.test(decision.noAction.detail)) {
          offenders.push(`${scenario.id} at ${time}: ${decision.noAction.detail}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it('still says the history is thin when the history really is thin', () => {
    // The branch that was right stays right: nothing known, nothing in the way,
    // and the app says the history has not told it how today is going.
    const kit = createKit('DH', 'America/Denver', '2026-04-01T12:00:00Z')
    const moment = kit.local('2026-04-15', '20:00')
    const nights = [7.5, 7.6, 7.7].map((value, offset) =>
      kit.record(
        'observation',
        { occurredAt: kit.local(`2026-04-${13 + offset}`, '07:00'), domains: [DOMAIN.sleep] },
        {
          concept: CONCEPT.sleepHours,
          value: { type: 'number', value, unit: 'hours' },
          method: 'self-report',
        },
      ),
    )

    const decision = decideOn(
      kit.document({ entities: [], records: nights, exportedAt: moment }),
      moment,
      ZONE,
    )
    expect(decision.situation.limiter).toBeUndefined()
    expect(decision.noAction?.detail).toMatch(/none of it says how tonight is going/)
  })
})

/** The same owner-local day as `day`, at a different wall-clock time. */
function movedTo(day: Instant, time: string, zone: ReturnType<typeof timeZone>): Instant {
  const [hour, minute] = time.split(':')
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(day))
  return createKit('DF', zone, '2026-04-01T12:00:00Z').local(
    parts,
    `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  )
}

describe('the filter keeps its backstop', () => {
  it('still refuses a move that arrives at the wrong hour', () => {
    // Removing a certain refusal from the generator must not remove the ability
    // to refuse — a pasted history can carry anything.
    const kit = createKit('DG', 'America/Denver', '2026-04-01T12:00:00Z')
    const moment = kit.local('2026-04-15', '23:30')
    const view = buildView(
      snapshotFromWire(kit.document({ entities: [], records: [], exportedAt: moment })).snapshot,
      {
        now: moment,
        zone: ZONE,
      },
    )
    const situation = assembleSituation(view, { now: moment, zone: ZONE, weekStartsOn: 1 })

    const walk = entityRef('routine', 'a walk')
    const midnightLab: Candidate = {
      id: 'test/hands-on-lab/x',
      generator: 'career',
      leansOn: [],
      resolves: [],
      profile: profileFor('hands-on-lab'),
      proposedBecause: 'a move from an hour that does not suit it',
      semantics: {
        subject: walk,
        domain: DOMAIN.career,
        target: { verb: 'hands-on-lab', object: walk },
        whyNow: { trigger: 'good-conditions', summary: '', evidence: [] },
        evidence: [],
      },
    }

    const { kept, rejected } = applyConstraints([midnightLab], situation)
    expect(kept).toEqual([])
    expect(rejected[0]?.reason).toBe('wrong-time-of-day')
  })
})

// ---------------------------------------------------------------------------
// AUD-0003 — the morning has an answer
// ---------------------------------------------------------------------------

/**
 * Sore, rested, and nothing sleep-shaped to say about it.
 *
 * The `capacity` limiter fires nowhere in the scenario library, so an invariant
 * about it swept over the library alone would be vacuous — it would pass by
 * never being asked. This is the history that asks: three full nights, a body
 * that hurts, and the app naming "the body is asking for an easier day" on the
 * screen.
 *
 * **Adaya is in it on purpose.** An earlier version held nothing but the sleep
 * and soreness readings, which meant no light move could be generated at all —
 * so the assertion that a sore body says nothing about a light move passed by
 * never meeting one, which is D-108's hole exactly. She is also the case QA
 * named: closing the capacity gap must not end with a sore, well-rested father
 * being told to ease off while half an hour with his daughter, phone away, sits
 * behind it marked down by a reading about his shoulder.
 */
function soreAndRested(hoursAgo: number) {
  const kit = createKit('DS', 'America/Denver', '2026-04-01T12:00:00Z')
  const adaya = entityRef('person', 'Adaya')

  const child = kit.entity({
    kind: 'person',
    label: 'Adaya',
    domain: DOMAIN.fatherhood,
    privacy: 'child-family-sensitive',
  })

  const custody = kit.record(
    'context',
    {
      occurredAt: kit.local('2026-04-01', '09:00'),
      domains: [DOMAIN.fatherhood],
      entities: [adaya],
    },
    {
      concept: CONCEPT.childPresent,
      value: { type: 'boolean', value: true },
      durability: 'durable',
      validFrom: kit.local('2026-04-01', '09:00'),
    },
  )

  const nights = [7.5, 7.75, 8].map((value, offset) =>
    kit.record(
      'observation',
      { occurredAt: kit.local(`2026-04-${13 + offset}`, '07:00'), domains: [DOMAIN.sleep] },
      {
        concept: CONCEPT.sleepHours,
        value: { type: 'number', value, unit: 'hours' },
        method: 'self-report',
      },
    ),
  )

  const sore = kit.record(
    'observation',
    {
      occurredAt: instant(at('2026-04-15', '20:00') - hoursAgo * 3_600_000),
      domains: [DOMAIN.health],
    },
    { concept: CONCEPT.soreness, value: { type: 'scale', value: 4, of: 5 }, method: 'self-report' },
  )

  return kit.document({
    entities: [child],
    records: [custody, ...nights, sore],
    exportedAt: at('2026-04-15', '20:00'),
  })
}

/** How long before the tested hour a reading has to be to still be current. */
function hoursBefore(time: string): number {
  const [hour] = time.split(':')
  return 20 - Number(hour ?? 20) + 0.25
}

describe('AUD-0003 — a named limiter has somewhere to go, at every hour', () => {
  it('stops prescribing a study session to a man nine hours short of rest', () => {
    /*
     * The reproduction, verbatim from the audit: "Three broken nights, and a
     * deadline", clock at 10:00 on a Tuesday. What the deployed build said was
     * *"RECALL PRACTICE — Spend 10 minutes recalling subnetting before you
     * reopen your notes"*, directly beneath *"Tuesday morning, 9 hours short on
     * sleep"* and *"What is in the way — About 9 hours short of rest"*.
     */
    const morning = loadScenario('morning-after-bad-nights')
    const decision = morning.decision()

    expect(decision.situation.block).toBe('morning')
    expect(decision.situation.limiter?.kind).toBe('recovery')
    expect(decision.kind).toBe('move')

    const verb = decision.explanation?.semantics.target.verb
    expect(verb, decision.explanation?.rendered.sentence).toBe('lighten-the-day')
    expect(profileFor(verb!).demand).toBe('restorative')
  })

  it('says only what it knows, and defers nothing to tomorrow', () => {
    /*
     * The wording rule the audit leads AUD-0003 with, and the reason it does:
     * the app has no model of what is coming (AUD-0004), so a morning move that
     * promised tomorrow would be the same confident wrongness the whole phase
     * exists to remove.
     */
    const spoken = [
      loadScenario('morning-after-bad-nights').decision(),
      decideOn(nineHoursDown(), at('2026-04-15', '09:00'), ZONE),
      decideOn(nineHoursDown(), at('2026-04-15', '05:30'), ZONE),
    ].flatMap((decision) => [
      decision.explanation?.rendered.sentence ?? '',
      decision.explanation?.rendered.reason ?? '',
    ])

    for (const line of spoken) {
      expect(line, 'a morning move that promised tomorrow').not.toMatch(/tomorrow/i)
      expect(line, 'a morning move that named the evening').not.toMatch(/tonight|this evening/i)
    }
  })

  it('offers something restorative wherever recovery or capacity is what is in the way', () => {
    /*
     * The invariant, and it is the thing to hold rather than any one sentence:
     * **when recovery or capacity is the dominant limiter, a recovery-compatible
     * option exists in every relevant day block.**
     *
     * It covers both kinds now. An earlier round of this phase held only
     * `recovery` and recorded the `capacity` half as a named gap; independent QA
     * read that as what it was — a test asserting the acceptance criterion is
     * false — and it was right to (QA-81-001). An invariant stated without an
     * exception does not acquire one by being documented.
     *
     * Swept over every scenario in the library at every block, and then over two
     * constructed histories at every block, because the library reaches
     * `recovery` at many hours and `capacity` at none: a sweep is only as wide
     * as the states it can reach.
     */
    const offenders: string[] = []

    const check = (label: string, document: ReturnType<typeof nineHoursDown>, moment: Instant) => {
      const decision = decideOn(document, moment, ZONE)
      const kind = decision.situation.limiter?.kind
      if (kind !== 'recovery' && kind !== 'capacity') return
      const restorative = generateCandidates(decision.situation).filter(
        (candidate) => profileFor(candidate.semantics.target.verb).demand === 'restorative',
      )
      if (restorative.length === 0) {
        offenders.push(`${label} (${kind}, ${decision.situation.block})`)
      }
    }

    for (const scenario of SCENARIOS) {
      const document = scenario.build()
      for (const { time } of EVERY_BLOCK) {
        check(`${scenario.id} at ${time}`, document, movedTo(scenario.now, time, scenario.zone))
      }
    }

    for (const { time } of EVERY_BLOCK) {
      check(`nine hours down at ${time}`, nineHoursDown(), at('2026-04-15', time))
      // The soreness reading is kept inside its own freshness window, so the
      // capacity limiter is actually raised at the hour being tested.
      check(`sore and rested at ${time}`, soreAndRested(hoursBefore(time)), at('2026-04-15', time))
    }

    expect(offenders, 'a limiter the app names with nothing behind it').toEqual([])
  })

  it('reaches the capacity limiter at all, so the sweep above is not vacuous', () => {
    // D-108: a guard that never meets the state it guards is not a guard, and
    // no history in the library reaches this one.
    const decision = decideOn(soreAndRested(1), at('2026-04-15', '20:00'), ZONE)
    expect(decision.situation.limiter?.kind).toBe('capacity')
    expect(decision.kind).toBe('move')
    expect(profileFor(decision.evaluation!.candidate.semantics.target.verb).demand).toBe(
      'restorative',
    )
  })

  it('does not conclude anything about a light move from a sore body', () => {
    /*
     * The reading that made closing the gap dangerous, fixed rather than routed
     * around — QA-81-001.
     *
     * `capacity-fit` spent soreness and sleep shortfall as one number, so with
     * rest in hand and a shoulder that hurts it marked a *light* move down by
     * the same reasoning it used for a strained night. Half an hour with his
     * daughter, phone away, asks a sore shoulder for nothing at all.
     */
    const decision = decideOn(soreAndRested(1), at('2026-04-15', '20:00'), ZONE)
    const light = generateCandidates(decision.situation).find(
      (candidate) => profileFor(candidate.semantics.target.verb).demand === 'light',
    )
    expect(light, 'the fixture no longer holds a light move to be wrong about').toBeDefined()

    const ranked = decision.trace.ranking.find((row) => row.id === light!.id)
    const fit = ranked?.dimensions.find((dimension) => dimension.name === 'capacity-fit')
    expect(fit?.value, 'a sore body was read as a reason against a light move').toBe(0)

    // And effort is still marked down, which is the whole point of asking.
    const effortful = generateCandidates(decision.situation).find(
      (candidate) => profileFor(candidate.semantics.target.verb).demand === 'effortful',
    )
    expect(effortful, 'the fixture no longer holds an effortful move either').toBeDefined()
    const row = decision.trace.ranking.find((entry) => entry.id === effortful!.id)
    const penalty = row?.dimensions.find((entry) => entry.name === 'capacity-fit')
    expect(penalty?.value ?? 0, 'a sore body stopped marking effort down').toBeLessThan(0)
  })
})

// ---------------------------------------------------------------------------
// QA-81-006 — the invariant survives the rule that competes with it
// ---------------------------------------------------------------------------

/**
 * What is in the way does not stop being in the way because he has read the
 * answer.
 *
 * Independent QA found this between two repairs that each worked. D-122 gave
 * the capacity limiter a move; D-124 stopped the app putting the same move on
 * screen more than twice a day. Neither was tested against the other, and the
 * interaction is the defect: once the recovery move had been read twice, the
 * filter removed it, the ranking was recomputed over what was left, and the
 * runner-up won. On "A morning after three bad nights" that runner-up is ten
 * minutes of subnetting recall — recommended at eleven at night to a man nine
 * hours short of sleep, by an app that had spent the same day saying "no
 * subnetting session" in the sentence above it.
 *
 * Nothing about his sleep changed between the three screens. The only thing
 * that changed was the app's record of what it had already displayed, and a
 * record of what has been displayed is not evidence about what is good for
 * him.
 *
 * The invariant these tests hold is therefore not "a restorative candidate
 * exists" — that is the generator's business and QA-81-001's. It is: **a rule
 * about repetition may stop the app speaking, and may not change what it
 * says.**
 */
describe('QA-81-006 — a listening rule does not get to change the answer', () => {
  /** The hours the audit reproduction walks, in order, in one session. */
  const SEQUENCE = [15, 20, 23]

  /** Replay one history across a day, keeping the ledger the surface keeps. */
  function acrossTheDay(id: string, hours: readonly number[]) {
    const scenario = SCENARIOS.find((entry) => entry.id === id)
    expect(scenario, `${id} is gone`).toBeDefined()

    const loaded = snapshotFromWire(scenario!.build())
    const steps: { hour: number; decision: ReturnType<typeof decideOn> }[] = []
    let shown: readonly ShownMove[] = []

    for (const hour of hours) {
      const now = movedTo(scenario!.now, `${String(hour).padStart(2, '0')}:00`, scenario!.zone)
      const moment = {
        now,
        zone: scenario!.zone,
        weekStartsOn: (scenario!.weekStartsOn ?? 1) as 1,
        shown,
      }
      const decision = decide(buildView(loaded.snapshot, moment), moment)
      steps.push({ hour, decision })

      const move = decision.evaluation?.candidate.id
      if (move === undefined) continue
      shown = [
        ...shown.filter((entry) => entry.move !== move),
        {
          move,
          dayId: decision.situation.dayId,
          at: now,
          count: (shown.find((entry) => entry.move === move)?.count ?? 0) + 1,
        },
      ]
    }
    return steps
  }

  it('does not prescribe the study session it spent the day declining', () => {
    /*
     * The exact reproduction: 15:00, 20:00, 23:00 on "A morning after three bad
     * nights", one uninterrupted session, no lifecycle action pressed.
     */
    const steps = acrossTheDay('morning-after-bad-nights', SEQUENCE)
    expect(steps.length, 'the sequence did not run').toBe(3)

    for (const step of steps) {
      expect(
        step.decision.situation.limiter?.kind,
        `${step.hour}:00 stopped naming a limiter`,
      ).toBe('recovery')
    }

    const [afternoon, evening, late] = steps
    for (const step of [afternoon!, evening!]) {
      const verb = step.decision.evaluation?.candidate.semantics.target.verb
      expect(verb, `${step.hour}:00 no longer offers anything`).toBeDefined()
      expect(profileFor(verb!).demand, `${step.hour}:00 stopped answering the limiter`).toBe(
        'restorative',
      )
    }

    // And the third hour, which is the one that was wrong. Whatever it says, it
    // is not allowed to be a move that does not answer what it has just named.
    const verb = late!.decision.evaluation?.candidate.semantics.target.verb
    if (verb !== undefined) {
      expect(
        profileFor(verb).demand,
        `23:00 recommended ${late!.decision.explanation?.rendered.sentence}`,
      ).toBe('restorative')
    }
    const spoken = `${late!.decision.explanation?.rendered.sentence ?? ''} ${
      late!.decision.noAction?.headline ?? ''
    } ${late!.decision.noAction?.detail ?? ''}`
    expect(spoken, 'the app recommended the thing it had been declining all day').not.toMatch(
      /recalling subnetting|subnetting session before/i,
    )
  })

  it('says why it has nothing rather than blaming the hour', () => {
    // The state the repair creates is a real no-action state, and D-114 does
    // not stop applying to it. "None of them suit where you actually are" would
    // be false: one of them suited exactly, and it is being held back.
    const steps = acrossTheDay('morning-after-bad-nights', SEQUENCE)
    const late = steps[steps.length - 1]!.decision
    expect(late.kind).toBe('no-action')
    expect(late.noAction?.detail, late.noAction?.detail).not.toMatch(/none of them suit/i)
    expect(late.noAction?.detail).toMatch(/already been in front of you/i)
  })

  it('holds across the library, at every hour of a kept day', () => {
    /*
     * The class. Swept with the ledger running, because the defect only exists
     * once something has been shown twice — a sweep that decides each hour from
     * a clean session cannot reach it, which is why every existing sweep was
     * green.
     */
    const offenders: string[] = []
    let reached = 0

    for (const scenario of SCENARIOS) {
      const loaded = snapshotFromWire(scenario.build())
      let shown: readonly ShownMove[] = []

      for (const { time } of EVERY_BLOCK) {
        const now = movedTo(scenario.now, time, scenario.zone)
        const moment = {
          now,
          zone: scenario.zone,
          weekStartsOn: (scenario.weekStartsOn ?? 1) as 1,
          shown,
        }
        const decision = decide(buildView(loaded.snapshot, moment), moment)
        const limiter = decision.situation.limiter

        const answering = decision.trace.proposed.filter(
          (proposed) => profileFor(proposed.verb).demand === 'restorative',
        )
        const withheld = answering.some((proposed) =>
          decision.trace.rejected.some(
            (row) => row.candidate === proposed.id && row.reason === 'just-covered',
          ),
        )

        if (withheld && (limiter?.kind === 'recovery' || limiter?.kind === 'capacity')) {
          // The state, counted whether or not anything won — saying nothing is
          // one of the correct outcomes, so a counter that only saw moves would
          // read zero the moment the repair worked.
          reached += 1
          if (decision.evaluation !== undefined) {
            const demand = profileFor(decision.evaluation.candidate.semantics.target.verb).demand
            if (demand !== 'restorative') {
              offenders.push(
                `${scenario.id} at ${time}: ${limiter.kind} still stands and it offered a ${demand} move — ${decision.explanation?.rendered.sentence}`,
              )
            }
          }
        }

        const move = decision.evaluation?.candidate.id
        if (move === undefined) continue
        shown = [
          ...shown.filter((entry) => entry.move !== move),
          {
            move,
            dayId: decision.situation.dayId,
            at: now,
            count: (shown.find((entry) => entry.move === move)?.count ?? 0) + 1,
          },
        ]
      }
    }

    expect(offenders).toEqual([])
    // Vacuity is the failure mode this whole finding is about: the sweep that
    // missed it did so by never reaching the state. If the withheld-answer
    // state stops being reachable, this test has stopped asserting anything.
    expect(
      reached,
      'no history ever reaches a withheld answer, so this sweep proves nothing',
    ).toBeGreaterThan(0)
  })

  it('leaves the rule alone where the answer is not what was withheld', () => {
    /*
     * The bound. The rule may only fire when the move taken off the table was
     * itself an answer to the limiter — otherwise every ordinary repetition
     * under a `time` or `coverage` limiter would blank the screen, which would
     * be a far worse defect than the one being repaired.
     */
    const scenario = SCENARIOS.find((entry) => entry.id === 'week-pointed-at-home')
    expect(scenario, 'the history this is bounded against is gone').toBeDefined()

    const loaded = snapshotFromWire(scenario!.build())
    const now = movedTo(scenario!.now, '19:30', scenario!.zone)
    const first = decide(buildView(loaded.snapshot, { now, zone: scenario!.zone }), {
      now,
      zone: scenario!.zone,
      weekStartsOn: 1,
    })
    const move = first.evaluation?.candidate.id
    expect(move, 'the history no longer proposes anything').toBeDefined()
    expect(
      profileFor(first.evaluation!.candidate.semantics.target.verb).demand,
      'this bound needs a move that does not answer a recovery limiter',
    ).not.toBe('restorative')

    const twice = {
      now,
      zone: scenario!.zone,
      weekStartsOn: 1 as const,
      // An hour earlier, because the ledger deliberately ignores an entry
      // stamped at the moment being decided — noting a render must not change
      // the render it is noting.
      shown: [
        { move: move!, dayId: first.situation.dayId, at: instant(now - 3_600_000), count: 2 },
      ],
    }
    const after = decide(buildView(loaded.snapshot, twice), twice)
    expect(after.kind, 'an ordinary repetition blanked the screen').toBe('move')
    expect(after.evaluation?.candidate.id).not.toBe(move)
  })
})
