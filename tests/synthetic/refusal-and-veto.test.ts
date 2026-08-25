import { describe, expect, it } from 'vitest'
import { entityRef } from '../../src/domain/entities'
import { sequentialRecordIds, type RecordId } from '../../src/domain/ids'
import type { CanonicalRecord } from '../../src/domain/records'
import {
  addLocalDays,
  blockOf,
  civilDateFromDayId,
  instantAtLocal,
  localDayIdAt,
  startOfLocalDay,
  timeZone,
  type Instant,
} from '../../src/domain/time'
import { forbidRecord, liftVetoRecord } from '../../src/intelligence/corrections'
import { decide, type Decision } from '../../src/intelligence/engine'
import { describePremise } from '../../src/intelligence/explain'
import { nextGuideStep, QUESTIONS_PER_DAY } from '../../src/intelligence/guide'
import { answerRecord } from '../../src/intelligence/questions'
import { planLifecycle } from '../../src/intelligence/lifecycle'
import { SHOWN_ENOUGH_TIMES_TODAY } from '../../src/intelligence/constraints'
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

/** The audit's hour: 19:30 on the day the scenario is set. */
function eveningOf(id: string): Instant {
  const loaded = loadScenario(id)
  const zone = loaded.scenario.zone
  const date = civilDateFromDayId(localDayIdAt(loaded.scenario.now, zone))
  return instantAtLocal({ ...date, hour: 19, minute: 30, second: 0 }, zone)
}

/** A day's worth of questions already answered, earlier and elsewhere. */
function spentQuestions(session: Session, zone = ZONE): readonly CanonicalRecord[] {
  const moment = { now: session.now, zone, weekStartsOn: 1 as const }
  const view = buildView(session.snapshot, moment)
  const asked = nextGuideStep(view, moment)
  if (asked.question === undefined) throw new Error('the guide is asking nothing to spend')
  const option = asked.question.options[0]
  if (option === undefined) throw new Error('a question with no answers')

  // In the morning, so they are spent for the day and not replies to anything
  // that happens this evening.
  const date = civilDateFromDayId(localDayIdAt(session.now, zone))
  return Array.from({ length: QUESTIONS_PER_DAY }, (_unused, index) =>
    answerRecord(
      asked.question!.spec,
      option,
      { now: instantAtLocal({ ...date, hour: 7, minute: index, second: 0 }, zone), zone },
      ids(),
    ),
  )
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

/** Answer whatever the guide is asking, the way the question buttons do. */
function answer(session: Session, zone = ZONE): Session {
  const moment = { now: session.now, zone, weekStartsOn: 1 as const, shown: session.shown }
  const step = nextGuideStep(buildView(session.snapshot, moment), moment)
  if (step.question === undefined) throw new Error('nothing on screen to answer')
  const option = step.question.options[0]
  if (option === undefined) throw new Error('a question with no answers')
  return {
    ...session,
    snapshot: withRecords(session.snapshot, [
      answerRecord(step.question.spec, option, { now: session.now, zone }, ids()),
    ]),
  }
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
    /*
     * Three refusals, by the only route to them there now is.
     *
     * Two refusals stop the offers (QA-81-004), so a third is only reachable if
     * something re-opens them — and the thing that re-opens them is the owner
     * answering the question the second refusal raised. That is not a
     * workaround for the test; it is the escalation working. An app that stops
     * at two and then treats an answer as nothing would have asked for no
     * reason.
     */
    let session = open('growth-evidence')
    for (let round = 0; round < 3; round += 1) {
      if (decideIn(session).kind !== 'move') session = answer(session)
      expect(decideIn(session).kind, `nothing to refuse at round ${round + 1}`).toBe('move')
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
     * The audit's own sequence, on the audit's own history — QA-81-004.
     *
     * "A week pointed at the house" at 19:30, `Can't right now` twice. What
     * followed used to be a third suggestion — "Spend the next 30 minutes with
     * Adaya, phone away", with "Nothing else worth asking right now" beneath it
     * — which is the app's third guess at an hour it had already been wrong
     * about twice, and the one of the three that costs him something to refuse.
     *
     * An earlier version of this test proved only `growth-mixed-evidence`,
     * where a question happened to be available anyway. It passed while the
     * deployed reproduction fell through.
     */
    let session = { ...open('week-pointed-at-home'), now: eveningOf('week-pointed-at-home') }
    const zone = ZONE
    const moment = { now: session.now, zone, weekStartsOn: 1 as const }

    expect(decideIn(session, zone).kind, 'the history stopped proposing anything').toBe('move')
    session = refuse(session, 'unable-now', zone)
    expect(decideIn(session, zone).kind, 'one refusal already stops it').toBe('move')
    session = refuse(session, 'unable-now', zone)

    const after = decideIn(session, zone)
    expect(after.kind, 'a third move was offered after two refusals').toBe('no-action')
    expect(after.noAction?.reason).toBe('not-landing')

    const asked = nextGuideStep(buildView(session.snapshot, moment), moment)
    expect(asked.kind, 'it stopped offering and asked nothing').toBe('question')
  })

  it('never offers a third move, on any history that can be refused twice', () => {
    /*
     * Swept, because one history is an anecdote and the fall-through was found
     * on a history the focused regression did not cover.
     */
    let reached = 0
    for (const scenario of SCENARIOS) {
      let session = open(scenario.id)
      const zone = scenario.zone
      if (decideIn(session, zone).kind !== 'move') continue
      session = refuse(session, 'unable-now', zone)
      if (decideIn(session, zone).kind !== 'move') continue
      session = refuse(session, 'unable-now', zone)

      reached += 1
      const after = decideIn(session, zone)
      expect(
        after.explanation?.rendered.sentence ?? after.kind,
        `${scenario.id} offered a third move after two refusals`,
      ).toBe('no-action')
      expect(after.noAction?.reason).toBe('not-landing')
    }
    expect(reached, 'no history can be refused twice, so this asserts nothing').toBeGreaterThan(0)
  })

  it('stops offering even when it has nothing left to ask', () => {
    /*
     * The honest fallback — AUD-0023's own words, and the half QA found
     * untested: "using an honest fallback if no existing question changes the
     * answer."
     *
     * Reached by spending the day's questions rather than by contriving a
     * history with none, because the daily cap is a real and ordinary way to
     * arrive here: three answers earlier in the day and the guide has nothing
     * further it is willing to ask, whatever the situation would support.
     *
     * What must hold is that the app still stops. A screen that falls back to a
     * third suggestion because it could not think of a question has learned
     * nothing from being told no twice.
     */
    const zone = ZONE
    let session = { ...open('week-pointed-at-home'), now: eveningOf('week-pointed-at-home') }
    session = refuse(session, 'unable-now', zone)
    session = refuse(session, 'unable-now', zone)
    // The day's questions, spent in the morning — so they are a cap and not a
    // reply to either of the refusals above.
    session = { ...session, snapshot: withRecords(session.snapshot, spentQuestions(session, zone)) }

    const moment = { now: session.now, zone, weekStartsOn: 1 as const }
    const step = nextGuideStep(buildView(session.snapshot, moment), moment)
    expect(step.kind, 'the cap is not biting, so this proves nothing').toBe('settled')

    const after = decideIn(session, zone)
    expect(after.kind, 'no question, so it offered a third move instead').toBe('no-action')
    expect(after.noAction?.reason).toBe('not-landing')
    // And the copy does not promise a question that is not there.
    expect(`${after.noAction?.headline} ${after.noAction?.detail}`).not.toMatch(/question|ask/i)
  })

  it('takes the answer as the reason to look again', () => {
    /*
     * Why asking is worth anything.
     *
     * The escalation is "stop offering and ask", and an app that asked and then
     * ignored the reply would be doing the more insulting version of the thing
     * the audit caught. An answer is the owner making visible the thing the app
     * could not see, and a changed picture earns a fresh look — which is also
     * the only route by which a third refusal exists at all.
     */
    const zone = ZONE
    let session = { ...open('week-pointed-at-home'), now: eveningOf('week-pointed-at-home') }
    session = refuse(session, 'unable-now', zone)
    session = refuse(session, 'unable-now', zone)
    expect(decideIn(session, zone).noAction?.reason).toBe('not-landing')

    session = answer(session, zone)
    const reopened = decideIn(session, zone)
    expect(reopened.kind, 'the answer changed nothing on screen').toBe('move')

    session = refuse(session, 'unable-now', zone)
    expect(decideIn(session, zone).noAction?.reason).toBe('enough-for-now')
  })

  it('starts again when the part of the day turns over', () => {
    // "Always a way back", and the way back is named in the copy: the block.
    let session = open('growth-evidence')
    for (let round = 0; round < 3; round += 1) {
      if (decideIn(session).kind !== 'move') session = answer(session)
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
  /**
   * The four hours of the audit's own sweep, owner-local.
   *
   * Local wall-clock rather than offsets from the scenario's `now`, because the
   * finding is about a morning, a mid-morning, an afternoon and an evening —
   * and an hour arithmetic away from `now` lands wherever `now` happens to be
   * on each of twenty-one histories, which is not the same claim.
   */
  const HOURS_OF_A_DAY = [
    { hour: 6, minute: 30 },
    { hour: 10, minute: 30 },
    { hour: 14, minute: 30 },
    { hour: 19, minute: 30 },
  ]

  /** What one history says across a day, with or without the ledger kept. */
  function acrossADay(id: string, keeping: boolean): readonly string[] {
    const loaded = loadScenario(id)
    const zone = loaded.scenario.zone
    const date = civilDateFromDayId(localDayIdAt(loaded.scenario.now, zone))
    let shown: readonly ShownMove[] = []
    const said: string[] = []

    for (const time of HOURS_OF_A_DAY) {
      const now = instantAtLocal({ ...date, ...time, second: 0 }, zone)
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
     * at 06:30, 10:30, 14:30 and 19:30. Nothing is written when a screen renders
     * (D-043, and rightly), so a move shown and ignored left no trace and scored
     * "+0.20 — not offered lately" four hours later.
     *
     * Held against the same history without the ledger, because a history that
     * varies across the day may simply be varying with the hour.
     *
     * **This is the audit's history, not a neighbouring one** (QA-81-003). The
     * first version of this test ran `rested-and-behind`, which varies on its
     * own by mid-afternoon; it passed while the reproduction it claimed to hold
     * still repeated the kitchen four times. A regression that reproduces
     * something adjacent to the defect is not a regression.
     */
    const kept = acrossADay('week-pointed-at-home', true)
    const without = acrossADay('week-pointed-at-home', false)

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

  it('does not tell him nothing suits when the truth is that he has read it', () => {
    /*
     * The falsehood the repair could have introduced.
     *
     * "There were things worth doing and none of them suit where you actually
     * are" is a claim about the hour and the body. Once a day can end with every
     * candidate held back for having already been on screen twice, that sentence
     * becomes false in exactly the histories the repair creates: they suit fine,
     * and he has read them. D-114 does not stop applying because the sentence is
     * a no-action state rather than a recommendation.
     */
    let reached = 0
    for (const scenario of SCENARIOS) {
      const loaded = loadScenario(scenario.id)
      const zone = loaded.scenario.zone
      const date = civilDateFromDayId(localDayIdAt(loaded.scenario.now, zone))
      let shown: readonly ShownMove[] = []

      for (const time of HOURS_OF_A_DAY) {
        const now = instantAtLocal({ ...date, ...time, second: 0 }, zone)
        const moment = { now, zone, weekStartsOn: 1 as const, shown }
        const decision = decide(buildView(loaded.snapshot, moment), moment)

        const onlyBecauseRead =
          decision.trace.rejected.length > 0 &&
          decision.trace.rejected.every((row) => row.reason === 'just-covered')
        if (decision.noAction !== undefined && onlyBecauseRead) {
          reached += 1
          expect(
            `${decision.noAction.headline} ${decision.noAction.detail}`,
            `${scenario.id} at ${time.hour}:00 blamed the hour for something he had already read`,
          ).not.toMatch(/suit where you actually are/i)
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
    expect(reached, 'no history ever runs out this way, so this asserts nothing').toBeGreaterThan(0)
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
          count: 1,
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

  it('takes a move off the table once showing it again would be repeating', () => {
    /*
     * Where the ledger's two halves meet, and why there are two.
     *
     * One showing marks a move down — that is the test above, and it is the
     * gentle half: the move stays on the table and can still win if the day
     * really does still point at it. `SHOWN_ENOUGH_TIMES_TODAY` is the hard
     * half, and it exists because marking down cannot promise an outcome. A
     * move whose lead is wider than this dimension's whole range at its current
     * weight goes on winning no matter how often it has been read, which is
     * precisely what the audit caught (QA-81-003).
     *
     * So the second showing is discounted and the third does not happen.
     */
    const loaded = loadScenario('week-pointed-at-home')
    const zone = loaded.scenario.zone
    const now = loaded.scenario.now
    const at = { now, zone, weekStartsOn: 1 as const }

    const plain = decide(buildView(loaded.snapshot, at), at)
    const move = plain.evaluation?.candidate.id
    expect(move, 'the history no longer proposes anything to repeat').toBeDefined()

    const twice = {
      ...at,
      shown: [
        {
          move: move!,
          dayId: plain.situation.dayId,
          at: (now - 3_600_000) as Instant,
          count: SHOWN_ENOUGH_TIMES_TODAY,
        },
      ],
    }
    const after = decide(buildView(loaded.snapshot, twice), twice)

    expect(after.evaluation?.candidate.id, 'the same move came back a third time').not.toBe(move)
    expect(
      after.trace.rejected.find((row) => row.candidate === move)?.explanation,
      'it was dropped for some other reason than having been read already',
    ).toMatch(/already on screen/i)
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
