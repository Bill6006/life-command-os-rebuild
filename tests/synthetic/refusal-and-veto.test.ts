import { describe, expect, it } from 'vitest'
import { entityRef } from '../../src/domain/entities'
import { sequentialRecordIds, type RecordId } from '../../src/domain/ids'
import type { CanonicalRecord } from '../../src/domain/records'
import {
  addLocalDays,
  blockOf,
  localDayIdAt,
  startOfLocalDay,
  timeZone,
  type Instant,
} from '../../src/domain/time'
import { forbidRecord, liftVetoRecord } from '../../src/intelligence/corrections'
import { decide, type Decision } from '../../src/intelligence/engine'
import { describePremise } from '../../src/intelligence/explain'
import { nextGuideStep } from '../../src/intelligence/guide'
import { planLifecycle } from '../../src/intelligence/lifecycle'
import type { ShownMove } from '../../src/intelligence/situation'
import { snapshotFromWire } from '../../src/memory/snapshot'
import type { StoreSnapshot } from '../../src/memory/store'
import { buildView } from '../../src/memory/view'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { loadScenario } from './harness'

/**
 * The interaction the app had no answer to — AUD-0023, AUD-0025, AUD-0034,
 * AUD-0050.
 *
 * Four findings, one screen, and one root: **the app honoured every owner
 * action individually and had no response to the pattern of them.**
 *
 * Section 4.3 gives the owner six things he can do, and the interface offered
 * five. Declining rotated to the next candidate and, when the candidates ran
 * out, re-showed one he had already refused — badged "You said not right now",
 * with no button that did anything. Ignoring a suggestion left no trace at all,
 * so the same sentence came back at four separate hours of one day. And the
 * sixth action — *stop suggesting this* — had a complete enforcement path and
 * no control anywhere that could reach it.
 */

const ZONE = timeZone('America/Denver')
const ids = sequentialRecordIds('RV')

function withRecords(snapshot: StoreSnapshot, records: readonly CanonicalRecord[]): StoreSnapshot {
  return { ...snapshot, records: [...snapshot.records, ...records] }
}

interface Session {
  readonly snapshot: StoreSnapshot
  readonly now: Instant
  readonly shown: readonly ShownMove[]
}

function open(id: string): Session {
  const loaded = loadScenario(id)
  return { snapshot: loaded.snapshot, now: loaded.scenario.now, shown: [] }
}

function decideIn(session: Session, zone = ZONE): Decision {
  const moment = { now: session.now, zone, weekStartsOn: 1 as const, shown: session.shown }
  return decide(buildView(session.snapshot, moment), moment)
}

/** Refuse whatever is on screen, the way the lifecycle buttons do. */
function refuse(session: Session, action: 'decline' | 'unable-now', zone = ZONE): Session {
  const decision = decideIn(session, zone)
  const semantics = decision.explanation?.semantics
  if (semantics === undefined) throw new Error('nothing on screen to refuse')
  const planned = planLifecycle({
    view: buildView(session.snapshot, { now: session.now, zone, weekStartsOn: 1 }),
    situation: decision.situation,
    semantics,
    action,
    recordedAt: session.now,
  })
  return { ...session, snapshot: withRecords(session.snapshot, planned.records) }
}

// ---------------------------------------------------------------------------
// AUD-0023 — the decline loop
// ---------------------------------------------------------------------------

describe('AUD-0023 — repeated refusals are read as a pattern', () => {
  it('never puts a move back after it has been refused in this block', () => {
    /*
     * The reproduction: "Three times running", 17:00. Can't right now ×1 → the
     * walk. ×2 → the growth opportunity. ×3 → **back to** "Spend the next 30
     * minutes with Adaya, phone away", badged "You said not right now". ×4 →
     * identical screen, no change.
     *
     * `settledRecently` held a *decline* for a day and held an *unable-now* for
     * nothing at all, so the rotation could walk back onto its own first move.
     */
    let session = open('growth-evidence')
    const seen: string[] = []

    for (let round = 0; round < 3; round += 1) {
      const decision = decideIn(session)
      const move = decision.evaluation?.candidate.id
      if (move === undefined) break
      expect(seen, `offered ${move} twice in one block`).not.toContain(move)
      seen.push(move)
      session = refuse(session, 'unable-now')

      /*
       * And out of the running, not merely behind the next one.
       *
       * Asserted on the filter rather than on the winner, because with three
       * candidates and a stop at three refusals the rotation cannot wrap round
       * far enough for the winner alone to show it. The jam was a *ranking* that
       * still contained a move the owner had explicitly declined.
       */
      const after = decideIn(session)
      const held = after.trace.rejected.filter((row) => row.reason === 'just-covered')
      expect(
        held.map((row) => row.candidate),
        `${move} is still in the running`,
      ).toContain(move)
      expect(after.trace.ranking.map((row) => row.id)).not.toContain(move)
    }

    expect(seen.length, 'the fixture should offer more than one move').toBeGreaterThan(1)
  })

  it('stops after the third refusal, and says so', () => {
    let session = open('growth-evidence')
    for (let round = 0; round < 3; round += 1) {
      if (decideIn(session).kind !== 'move') break
      session = refuse(session, 'unable-now')
    }

    const decision = decideIn(session)
    expect(decision.kind).toBe('no-action')
    expect(decision.noAction?.reason).toBe('enough-for-now')
    // A real sentence rather than a jammed screen, and it says what happens next.
    expect(decision.noAction?.headline).toMatch(/nothing then/i)
    expect(decision.noAction?.detail).toMatch(/part of the day/i)
  })

  it('asks after the second refusal rather than offering a third suggestion', () => {
    /*
     * Three refusals in a row is the clearest signal a person can send without
     * typing, and the right reading of the second one is not "here is a third
     * suggestion" — it is that something the app cannot see is in the way,
     * which is precisely what a question is for.
     */
    let session = open('growth-mixed-evidence')
    const moment = { now: session.now, zone: ZONE, weekStartsOn: 1 as const }

    const before = nextGuideStep(buildView(session.snapshot, moment), moment)
    expect(before.kind, 'the fixture already asks, so this proves nothing').toBe('settled')

    session = refuse(session, 'unable-now')
    session = refuse(session, 'unable-now')

    const after = nextGuideStep(buildView(session.snapshot, moment), moment)
    expect(after.kind).toBe('question')
  })

  it('starts again when the part of the day turns over', () => {
    // "Always a way back", and the way back is named in the copy: the block.
    let session = open('growth-evidence')
    for (let round = 0; round < 3; round += 1) {
      if (decideIn(session).kind !== 'move') break
      session = refuse(session, 'unable-now')
    }
    expect(decideIn(session).noAction?.reason).toBe('enough-for-now')

    const later: Session = { ...session, now: (session.now + 4 * 3_600_000) as Instant }
    expect(blockOf(later.now, ZONE)).not.toBe(blockOf(session.now, ZONE))
    expect(decideIn(later).noAction?.reason).not.toBe('enough-for-now')
  })
})

// ---------------------------------------------------------------------------
// AUD-0025 — ignoring is a response
// ---------------------------------------------------------------------------

describe('AUD-0025 — the app stops repeating itself within a day', () => {
  /** One owner-local day, at the hours the audit actually swept. */
  const HOURS_OF_A_DAY = [-13, -9.5, -5.5, 0]

  /** What one history says across a day, with or without the ledger kept. */
  function acrossADay(id: string, keeping: boolean): readonly string[] {
    const loaded = loadScenario(id)
    const zone = loaded.scenario.zone
    let shown: readonly ShownMove[] = []
    const said: string[] = []

    for (const hours of HOURS_OF_A_DAY) {
      const now = (loaded.scenario.now + hours * 3_600_000) as Instant
      const moment = { now, zone, weekStartsOn: 1 as const, shown }
      const decision = decide(buildView(loaded.snapshot, moment), moment)
      const move = decision.evaluation?.candidate.id
      if (move === undefined) continue
      said.push(move)
      if (!keeping) continue
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
    return said
  }

  it('stops giving the same answer at four hours of one day', () => {
    /*
     * "A week pointed at the house", Wednesday: the identical kitchen sentence
     * at 06:30, 10:00, 14:00 and 19:00. Nothing is written when a screen renders
     * (D-043, and rightly), so a move shown and ignored left no trace and scored
     * "+0.20 — not offered lately" four hours later.
     *
     * Held against the same history without the ledger, because a history that
     * varies across the day may simply be varying with the hour.
     */
    const kept = acrossADay('rested-and-behind', true)
    const without = acrossADay('rested-and-behind', false)

    expect(new Set(without).size, 'the history varies on its own, so this proves nothing').toBe(1)
    expect(new Set(kept).size, kept.join(' -> ')).toBeGreaterThan(1)
  })

  it('breaks the repetition on more histories than it leaves alone', () => {
    // Swept, because one history is an anecdote. What is asserted is the
    // direction: keeping the ledger never makes a day more repetitive, and on
    // several histories it makes it less.
    let improved = 0
    for (const scenario of SCENARIOS) {
      const kept = new Set(acrossADay(scenario.id, true)).size
      const without = new Set(acrossADay(scenario.id, false)).size
      expect(kept, `${scenario.id} repeats more with the ledger kept`).toBeGreaterThanOrEqual(
        without,
      )
      if (kept > without) improved += 1
    }
    expect(improved, 'the ledger changed nothing anywhere').toBeGreaterThan(0)
  })

  it('never calls a move fresh once it has been on screen today', () => {
    /*
     * The defect underneath the repetition, and the part of it that is a false
     * statement rather than a ranking preference: `recent-duplication` was
     * *rewarding* a move for a freshness it did not have.
     *
     * Whether the penalty is large enough to move the winner on any particular
     * history is a question about the weight of this dimension against the
     * others, which is AUD-0035's, and is deliberately not answered here.
     */
    const loaded = loadScenario('week-pointed-at-home')
    const zone = loaded.scenario.zone
    const now = loaded.scenario.now
    const plain = decide(buildView(loaded.snapshot, { now, zone, weekStartsOn: 1 }), {
      now,
      zone,
      weekStartsOn: 1,
    })
    const move = plain.evaluation?.candidate.id
    expect(move).toBeDefined()

    const seenBefore = decide(buildView(loaded.snapshot, { now, zone, weekStartsOn: 1 }), {
      now,
      zone,
      weekStartsOn: 1,
      shown: [
        {
          move: move!,
          dayId: plain.situation.dayId,
          at: (now - 3_600_000) as Instant,
          count: 3,
        },
      ],
    })

    const before = plain.evaluation?.dimensions.find((entry) => entry.name === 'recent-duplication')
    const after = seenBefore.trace.ranking
      .find((row) => row.id === move)
      ?.dimensions.find((entry) => entry.name === 'recent-duplication')

    expect(before?.note).toMatch(/not offered lately/i)
    expect(after?.note).toMatch(/already on screen/i)
    expect(after?.value ?? 0).toBeLessThan(before?.value ?? 0)
  })

  it('does not mark a move down for being on screen right now', () => {
    // The entry is stamped with the moment it was shown at, and the situation
    // only ever reads entries strictly earlier than the moment being decided.
    // Otherwise noting a render would change the render.
    const loaded = loadScenario('week-pointed-at-home')
    const zone = loaded.scenario.zone
    const now = loaded.scenario.now
    const first = decide(buildView(loaded.snapshot, { now, zone, weekStartsOn: 1 }), {
      now,
      zone,
      weekStartsOn: 1,
    })
    const move = first.evaluation?.candidate.id
    expect(move).toBeDefined()

    const again = decide(buildView(loaded.snapshot, { now, zone, weekStartsOn: 1 }), {
      now,
      zone,
      weekStartsOn: 1,
      shown: [{ move: move!, dayId: first.situation.dayId, at: now, count: 1 }],
    })
    expect(again.evaluation?.candidate.id).toBe(move)
  })

  it('ignores a ledger entry from another day', () => {
    const loaded = loadScenario('week-pointed-at-home')
    const zone = loaded.scenario.zone
    const now = loaded.scenario.now
    const yesterday = addLocalDays(now, -1, zone)
    const plain = decide(buildView(loaded.snapshot, { now, zone, weekStartsOn: 1 }), {
      now,
      zone,
      weekStartsOn: 1,
    })
    const move = plain.evaluation?.candidate.id

    const stale = decide(buildView(loaded.snapshot, { now, zone, weekStartsOn: 1 }), {
      now,
      zone,
      weekStartsOn: 1,
      shown: [
        {
          move: move!,
          dayId: localDayIdAt(yesterday, zone),
          at: yesterday,
          count: 9,
        },
      ],
    })
    // A ledger that outlived its day cannot bite: the situation keeps only
    // today's entries, so yesterday's repetition is not held against a move.
    expect(stale.situation.shown).toEqual([])
    expect(stale.evaluation?.candidate.id).toBe(move)
  })
})

// ---------------------------------------------------------------------------
// AUD-0050 — the sixth owner action
// ---------------------------------------------------------------------------

describe('AUD-0050 — the owner can stop a recommendation family', () => {
  const forbidding = (session: Session, about: ReturnType<typeof entityRef>, domain: string) =>
    withRecords(session.snapshot, [
      forbidRecord(
        about,
        `Stop suggesting ${about.id}`,
        { now: session.now, zone: ZONE },
        [domain as never],
        ids(),
      ),
    ])

  it('removes the move from the ranking, with the reason it was removed', () => {
    const session = open('week-pointed-at-home')
    const before = decideIn(session)
    const object = before.evaluation?.candidate.semantics.target.object
    expect(object).toBeDefined()

    const after = decideIn({
      ...session,
      snapshot: forbidding(session, object!, before.evaluation!.candidate.semantics.domain),
    })

    expect(after.evaluation?.candidate.semantics.target.object.id).not.toBe(object!.id)
    expect(after.trace.rejected.some((row) => row.reason === 'forbidden')).toBe(true)
  })

  it('forbids a whole area without switching the area off — section 4.1', () => {
    /*
     * A domain-level veto is close to the domain-off switch section 4.1
     * forbids, and the difference is the whole of it: recommendations stop, and
     * the area keeps its place in the model, in coverage and on Life.
     */
    const session = open('week-pointed-at-home')
    const before = decideIn(session)
    const domain = before.evaluation!.candidate.semantics.domain

    const after = decideIn({
      ...session,
      snapshot: forbidding(session, entityRef('life-domain', domain), domain),
    })

    for (const row of after.trace.ranking) {
      expect(row.id.startsWith(`${domain}/`), `${row.id} survived an area veto`).toBe(false)
    }
    expect(after.situation.coverage.get(domain as never), 'the area left coverage').toBeDefined()
  })

  it('is listed where the owner would look, and lifting it brings the move back', () => {
    const session = open('week-pointed-at-home')
    const before = decideIn(session)
    const object = before.evaluation!.candidate.semantics.target.object
    const domain = before.evaluation!.candidate.semantics.domain

    const veto = forbidRecord(
      object,
      `Stop suggesting ${object.id}`,
      { now: session.now, zone: ZONE },
      [domain],
      ids(),
    )
    const vetoed: Session = { ...session, snapshot: withRecords(session.snapshot, [veto]) }
    expect(decideIn(vetoed).situation.preferences.map((entry) => entry.source)).toContain(veto.id)

    const lifted: Session = {
      ...vetoed,
      snapshot: withRecords(vetoed.snapshot, [
        liftVetoRecord(veto.id as RecordId, { now: session.now, zone: ZONE }, ids()),
      ]),
    }

    expect(decideIn(lifted).situation.preferences.map((entry) => entry.source)).not.toContain(
      veto.id,
    )
    expect(decideIn(lifted).evaluation?.candidate.semantics.target.object.id).toBe(object.id)
  })

  it('is not what a decline means', () => {
    // `owner-preference` treats a refusal as sovereignty rather than a verdict
    // (D-045, section 20), so the move comes back with a slightly lower score.
    // A veto is a different thing the owner chooses, not an inference from taps.
    const session = refuse(open('week-pointed-at-home'), 'decline')
    expect(decideIn(session).situation.preferences).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// AUD-0034 — the no-action states
// ---------------------------------------------------------------------------

describe('AUD-0034 — silence that sounds like judgement rather than incapacity', () => {
  it('never says "just yet" when the picture is current', () => {
    /*
     * "Nothing to suggest just yet" reads as the app not being ready, and it
     * was what a rested man got at seven in the morning. "Just yet" implies
     * something is coming; nothing is.
     */
    const offenders: string[] = []
    for (const scenario of SCENARIOS) {
      const loaded = snapshotFromWire(scenario.build())
      const moment = { now: scenario.now, zone: scenario.zone, weekStartsOn: 1 as const }
      const decision = decide(buildView(loaded.snapshot, moment), moment)
      if (decision.noAction?.reason !== 'nothing-in-reach') continue
      if (/just yet/i.test(decision.noAction.headline)) offenders.push(scenario.id)
    }
    expect(offenders).toEqual([])
  })

  it('says the limit is its own reach rather than that the evening is quiet', () => {
    /*
     * D-038's line. The new branch must not claim the evening is quiet when the
     * truth is that the app has no vocabulary for it — that is asserting an
     * absence from ignorance, which is the error this whole phase is about.
     */
    /*
     * Swept across the day rather than at each fixture's own clock, because the
     * two cases the audit names — a rested seven in the morning, and the
     * evenings his daughter is away — are hours the library does not natively
     * sit at. A guard that only ever visits the fixture's own moment is a guard
     * that never meets the state it is about.
     */
    const reached = SCENARIOS.flatMap((scenario) =>
      [2, 5, 9, 15, 20, 23].map((hour) => {
        const at = (startOfLocalDay(localDayIdAt(scenario.now, scenario.zone), scenario.zone) +
          hour * 3_600_000) as Instant
        const moment = { now: at, zone: scenario.zone, weekStartsOn: 1 as const }
        return decide(buildView(snapshotFromWire(scenario.build()).snapshot, moment), moment)
      }),
    ).filter((decision) => decision.noAction?.reason === 'nothing-in-reach')

    expect(reached.length, 'nothing reaches the branch, so nothing is tested').toBeGreaterThan(0)
    for (const decision of reached) {
      expect(decision.noAction?.detail).toMatch(/reach/i)
      expect(decision.noAction?.detail).not.toMatch(/quiet|nothing needs doing/i)
    }
  })

  it('keeps the old sentence for a history that really is thin', () => {
    const kit = loadScenario('mostly-unknown')
    const moment = { now: kit.scenario.now, zone: kit.scenario.zone, weekStartsOn: 1 as const }
    const decision = decide(buildView(kit.snapshot, moment), moment)
    expect(decision.kind).toBe('no-action')
    expect(decision.noAction?.reason).not.toBe('nothing-in-reach')
  })

  it('describes where he is in every no-action state', () => {
    /*
     * The situation line disappeared entirely in the states with the least on
     * them, so the one piece of orientation the screen offers vanished at the
     * moment it was most needed. It is a statement about the situation rather
     * than about the decision, and it is true whether or not there is one.
     */
    for (const scenario of SCENARIOS) {
      const loaded = snapshotFromWire(scenario.build())
      const moment = { now: scenario.now, zone: scenario.zone, weekStartsOn: 1 as const }
      const decision = decide(buildView(loaded.snapshot, moment), moment)
      if (decision.kind !== 'no-action') continue
      // `describePremise` is what Now renders in this state now, and it is the
      // same function the move state uses.
      expect(describePremise(decision.situation), scenario.id).not.toBe('')
    }
  })
})
