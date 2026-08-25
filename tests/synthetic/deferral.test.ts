import { describe, expect, it } from 'vitest'
import { ACTION_VERBS } from '../../src/domain/recommendation'
import { profileFor } from '../../src/intelligence/moves'
import { DAY_BLOCKS, type DayBlock, type Instant } from '../../src/domain/time'
import { decide, type Decision } from '../../src/intelligence/engine'
import { assembleSituation } from '../../src/intelligence/situation'
import { snapshotFromWire } from '../../src/memory/snapshot'
import type { StoreSnapshot } from '../../src/memory/store'
import { buildView } from '../../src/memory/view'
import { createKit } from '../../src/synthetic/kit'
import { schoolMorning, SCHOOL_MORNING_ZONE, SCENARIOS } from '../../src/synthetic/scenarios'
import { loadScenario } from './harness'

/**
 * AUD-0024 — the answer that is neither "do this" nor "do nothing".
 *
 * `hold` has been in `ACTION_VERBS` since Phase 1 with a full move profile and
 * its own action and follow-up templates, and no generator produced it. Section
 * 19 lists "wait" among valid decisions; what existed instead was
 * `nothing-worth-doing`, which means "nothing is good enough" rather than "not
 * now" — and only one of those is useful at half past five in the morning.
 *
 * It could not exist before this phase because deferring needs a model of later
 * blocks, and the app had none until AUD-0004 gave it one. Both halves are
 * exercised here: the block has to be real, and it has to be his.
 */

const ZONE = SCHOOL_MORNING_ZONE
const kit = createKit('SM', 'America/Denver', '2026-06-01T12:00:00Z')

function at(timeOfDay: string): Instant {
  return kit.local('2026-09-16', timeOfDay)
}

function decideAt(now: Instant, snapshot?: StoreSnapshot): Decision {
  const loaded = snapshot ?? snapshotFromWire(schoolMorning()).snapshot
  const moment = { now, zone: ZONE }
  return decide(buildView(loaded, moment), moment)
}

// ---------------------------------------------------------------------------
// Gate item 4 — it names a real later block, and cannot be returned without one
// ---------------------------------------------------------------------------

describe('a hold names a part of today that is actually coming', () => {
  const held = decideAt(at('05:30'))

  it('is its own state rather than a move or a silence', () => {
    // The fifth Now state. Phase 9 designs the no-action states, and four then
    // five means designing them twice — which is why this lands before it.
    expect(held.kind).toBe('hold')
    expect(held.noAction).toBeUndefined()
  })

  it('names a block that is later today and free', () => {
    expect(held.heldUntil).toBe('morning')

    const later = held.situation.laterToday.find((entry) => entry.block === held.heldUntil)
    expect(later, 'the named block is not in the rest of today').toBeDefined()
    expect(later?.from, 'the named block has already started').toBeGreaterThan(held.situation.at)
    expect(later?.free, 'the named block is not his').toBeGreaterThan(0)
  })

  it('says which move is being held, and which two blocks decided it', () => {
    /*
     * The held move's own reason must not survive. "Adaya is here, and that
     * window closes on its own" is an argument for doing it **now**, and
     * printing it under a sentence that says to wait would be the app
     * contradicting itself in two lines.
     */
    expect(held.explanation?.rendered.sentence).toBe('The morning suits Adaya better than now.')
    const reason = held.explanation?.rendered.reason ?? ''
    expect(reason).toContain('Spend the next 30 minutes with Adaya, phone away.')
    expect(reason).toContain('The morning has the room')
    expect(reason).toContain('the early morning does not')
    expect(reason).not.toContain('closes on its own')
  })

  it('cannot be returned when no later block suits the move', () => {
    /*
     * Ten o'clock: the same history, the same daughter, the same rested body.
     * `time-with` suits the morning it is already in, so there is nothing to
     * defer to and the app simply says it.
     */
    const now = decideAt(at('10:00'))
    expect(now.kind).toBe('move')
    expect(now.heldUntil).toBeUndefined()
  })

  it('cannot be returned in the last block of the day', () => {
    // Nothing is left to name, so `hold` is unreachable there by construction
    // rather than by a rule anybody has to remember.
    const night = decideAt(at('23:00'))
    expect(night.situation.laterToday).toEqual([])
    expect(night.kind).not.toBe('hold')
  })

  it('cannot be returned when the later block is minutes away', () => {
    /*
     * Twenty to seven, with the morning starting at seven. "Later" that is
     * twenty minutes off is not advice the owner can act on differently from
     * "now" — he would simply wait — and every block boundary becoming a
     * deferral opportunity is how `hold` would become the comfortable default
     * the finding warns about.
     */
    const nearly = decideAt(at('06:40'))
    expect(nearly.kind).toBe('move')
  })

  it('never reaches past the next block, and today no verb needs it to', () => {
    /*
     * The bound that stops a deferral becoming a plan for the owner's day —
     * and an honest note about how much of it is currently load-bearing.
     *
     * Without it, holding into *any* later block that suited produced "the
     * afternoon suits Adaya better than now" at twenty to seven in the morning:
     * the morning was rejected for being twenty minutes off, and the search
     * simply carried on down the day. That is not deferral; it is the app
     * planning his Saturday, and it is what
     * `cannot be returned when the later block is minutes away` above fails on.
     *
     * The second half of the bound — that the block must be the *next* one and
     * not merely the next suitable one — cannot currently be told apart from
     * the first, because no move in `MOVE_PROFILES` has a gap: for every verb
     * and every block it neither suits nor refuses, the following block either
     * suits it or is the end of the day. That is a property of the table rather
     * than a guarantee, so it is asserted here. A verb with a gap makes the two
     * rules diverge, and the failure lands on the line that says so instead of
     * on a screen at half past five.
     */
    const gaps: string[] = []
    for (const verb of ACTION_VERBS) {
      const profile = profileFor(verb)
      for (const [index, block] of DAY_BLOCKS.entries()) {
        if (profile.suits.includes(block) || profile.refuses.includes(block)) continue
        const next = DAY_BLOCKS[index + 1]
        if (next === undefined) continue
        if (profile.suits.includes(next)) continue
        const later = DAY_BLOCKS.slice(index + 2).some(
          (entry) => profile.suits.includes(entry) && !profile.refuses.includes(entry),
        )
        if (later) gaps.push(`${verb} at ${block}: skips ${next}`)
      }
    }
    expect(
      gaps,
      'a move can now be deferred past the next block — the two halves of the bound have come apart and need a test of their own',
    ).toEqual([])
  })

  it('cannot be returned into a block the owner is working through', () => {
    /*
     * AUD-0024 depends on AUD-0004 for exactly this. A deferral into a stretch
     * of day he does not have would be the same confident wrongness the
     * commitment window was added to remove, arriving through the door it
     * opened.
     */
    const loaded = snapshotFromWire(schoolMorning())
    const records = loaded.snapshot.records.map((record) =>
      record.kind === 'commitment-window'
        ? { ...record, label: 'work', whose: 'mine' as const, startsAt: 7 * 60, endsAt: 12 * 60 }
        : record,
    )
    const busy = decideAt(at('05:30'), { ...loaded.snapshot, records })

    const morning = busy.situation.laterToday.find((entry) => entry.block === 'morning')
    expect(morning?.free, 'the morning should be spoken for').toBe(0)
    expect(busy.kind).not.toBe('hold')
  })
})

// ---------------------------------------------------------------------------
// It is bounded, and the bound is structural
// ---------------------------------------------------------------------------

describe('a hold cannot become the app’s default answer', () => {
  it('happens at one hour of this day and at none of the others', () => {
    /*
     * The same history, swept across the whole day. AUD-0024 names the risk in
     * as many words — "`hold` could become a comfortable default" — so the
     * claim worth making is not that a deferral is possible but that it is
     * rare.
     */
    const kinds = new Map<string, string>()
    for (const time of ['05:30', '08:20', '10:00', '13:00', '19:00', '23:00']) {
      kinds.set(time, decideAt(at(time)).kind)
    }
    expect([...kinds].filter(([, kind]) => kind === 'hold').map(([time]) => time)).toEqual([
      '05:30',
    ])
  })

  it('is reached by exactly one history in the library, and is reached', () => {
    /*
     * Named rather than counted, and both halves matter. A state no scenario
     * reaches is a sentence nobody has read — which is how `nothing-better`
     * shipped an absence-from-ignorance for three phases — and a state every
     * scenario reaches would be the default this is fenced against.
     */
    const holding = SCENARIOS.filter(
      (scenario) => loadScenario(scenario.id).decision().kind === 'hold',
    )
    expect(holding.map((scenario) => scenario.id)).toEqual(['before-the-house-is-up'])
  })

  it('offers nothing to press, because there is nothing to act on', () => {
    // A deferral with a "Start it" button would ask the owner to act on a
    // sentence whose whole content is that acting can wait.
    const decision = decideAt(at('05:30'))
    expect(decision.state).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// The rest of today, which is what makes any of this possible
// ---------------------------------------------------------------------------

describe('the rest of today is read from the day, never assumed', () => {
  it('runs out as the day does, and never reaches into tomorrow', () => {
    const seen = new Map<DayBlock, readonly DayBlock[]>()
    for (const time of ['05:30', '10:00', '13:00', '19:00', '23:00']) {
      const situation = assembleSituation(
        buildView(snapshotFromWire(schoolMorning()).snapshot, { now: at(time), zone: ZONE }),
        { now: at(time), zone: ZONE, weekStartsOn: 1 },
      )
      seen.set(
        situation.block,
        situation.laterToday.map((entry) => entry.block),
      )
    }

    // Enumerated by block rather than checked for "gets shorter": the app has
    // no model of tomorrow and must not acquire one by accident here.
    expect(seen.get('early-morning')).toEqual(['morning', 'afternoon', 'evening', 'late-night'])
    expect(seen.get('morning')).toEqual(['afternoon', 'evening', 'late-night'])
    expect(seen.get('afternoon')).toEqual(['evening', 'late-night'])
    expect(seen.get('evening')).toEqual(['late-night'])
    expect(seen.get('late-night')).toEqual([])
    expect([...seen.keys()].sort()).toEqual([...DAY_BLOCKS].sort())
  })

  it('takes his own obligations out of a later block and leaves hers alone', () => {
    const shape = (whose: 'mine' | 'theirs'): number => {
      const loaded = snapshotFromWire(schoolMorning())
      const records = loaded.snapshot.records.map((record) =>
        record.kind === 'commitment-window' ? { ...record, whose } : record,
      )
      const moment = { now: at('05:30'), zone: ZONE, weekStartsOn: 1 as const }
      const situation = assembleSituation(
        buildView({ ...loaded.snapshot, records }, moment),
        moment,
      )
      return situation.laterToday.find((entry) => entry.block === 'morning')?.free ?? -1
    }

    // Her school day runs 08:30 to 12:00 through the morning block. As hers it
    // costs him nothing; as his it would take three and a half hours out of it.
    expect(shape('theirs')).toBe(300)
    expect(shape('mine')).toBe(90)
  })
})

// ---------------------------------------------------------------------------
// The verb the audit found declared and unreachable
// ---------------------------------------------------------------------------

describe('`hold` is no longer a verb nothing produces', () => {
  it('is in the catalogue, and something now generates it', () => {
    expect(ACTION_VERBS).toContain('hold')
    expect(decideAt(at('05:30')).explanation?.semantics.target.verb).toBe('hold')
  })

  it('names the block it is held for rather than the block it is said in', () => {
    /*
     * The one template where `block` means the block being held **for**. A
     * deferral whose sentence named the current hour would be the app
     * announcing the wrong time of day inside its own instruction, which is the
     * class `recover` was repaired for.
     */
    const decision = decideAt(at('05:30'))
    expect(decision.situation.block).toBe('early-morning')
    expect(decision.explanation?.rendered.sentence).toContain('The morning')
    expect(decision.explanation?.rendered.sentence).not.toContain('early morning')
  })
})
