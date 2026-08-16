import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { entityRef } from '../../src/domain/entities'
import { blockOf, timeZone, type DayBlock, type Instant } from '../../src/domain/time'
import { generateCandidates, type Candidate } from '../../src/intelligence/candidates'
import { applyConstraints } from '../../src/intelligence/constraints'
import { profileFor } from '../../src/intelligence/moves'
import { assembleSituation } from '../../src/intelligence/situation'
import { buildView } from '../../src/memory/view'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { createKit } from '../../src/synthetic/kit'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { decideOn } from './harness'

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

  it('never leaves a strained afternoon or evening with nothing', () => {
    // Every half hour from noon to midnight. Recovery is the limiter at all of
    // them, and from the afternoon onward there is always something to say.
    for (let minutes = 12 * 60; minutes < 24 * 60; minutes += 30) {
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
    // now no refusal to have nothing behind.
    for (const time of ['13:00', '15:30', '17:45', '19:00', '22:30']) {
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
    for (const time of ['06:30', '09:00', '11:30']) {
      const decision = decideOn(nineHoursDown(), at('2026-04-15', time), ZONE)
      expect(decision.situation.limiter?.kind, time).toBe('recovery')
      expect(decision.noAction?.detail, time).not.toMatch(/none of it says/i)
      expect(decision.noAction?.detail, time).toBe('Nothing here would help much before tonight.')
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
