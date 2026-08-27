import { describe, expect, it } from 'vitest'
import {
  civilDateFromDayId,
  DAY_BLOCKS,
  instantAtLocal,
  localDayIdAt,
  type DayBlock,
  type Instant,
} from '../../src/domain/time'
import { decide } from '../../src/intelligence/engine'
import {
  availableActions,
  collectEpisodes,
  openEpisode,
  type MoveState,
} from '../../src/intelligence/lifecycle'
import type { Situation } from '../../src/intelligence/situation'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { SCENARIOS, scenarioById } from '../../src/synthetic/scenarios'
import { THREE_DAYS_SINCE_ID } from '../../src/synthetic/journeys'
import { openJourney } from './journey'

/**
 * D-160 — a move's identity is what learning pools on; a state belongs to one
 * occurrence on one day.
 *
 * F43, and it was confirmed with the mechanism located before a line was
 * written: `stateOfChosen` matched `(verb, object.id)` across
 * `situation.recentMoves` with no day filter, and `recentMoves` is a three-day
 * window. A walk completed on the 22nd therefore settled a freshly generated
 * walk on the 25th — `TRANSITIONS.completed` is `[]`, `NowScreen` disables
 * every action not in `availableActions(state)`, and the card read **"Where
 * this stands — Done"** with all five controls inert.
 *
 * Four things are proved here, and the third and fourth are the ones that stop
 * this becoming a repair that breaks something else.
 *
 * 1. An earlier day's completion does not settle today's move.
 * 2. **Today's** completion still does — a guard that never fires is not a
 *    guard, it is a deletion.
 * 3. `recentMoves` still spans three days, so `recent-duplication` and learning
 *    see exactly what they saw before. The window was correct for what it was
 *    built for; the match was not.
 * 4. Reintroducing the old match, faithfully, brings the defect back — so the
 *    fixture and the assertion above it are actually load-bearing.
 */

/** An hour that is unambiguously inside each block, in the owner's own zone. */
const HOUR_IN: Record<DayBlock, number> = {
  'early-morning': 5,
  morning: 9,
  afternoon: 15,
  evening: 20,
  'late-night': 23,
}

function readIt(scenarioId: string, at?: Instant) {
  const scenario = scenarioById(scenarioId)
  if (scenario === undefined) throw new Error(`no scenario "${scenarioId}"`)
  const loaded = snapshotFromWire(scenario.build())
  expect(loaded.loaded).toBe(true)
  const now = at ?? scenario.now
  const moment = { now, zone: scenario.zone, weekStartsOn: 1 as const }
  return { scenario, decision: decide(buildView(loaded.snapshot, moment), moment) }
}

/**
 * The match exactly as it stood before the repair.
 *
 * Copied from `engine.ts` at `87e2057` rather than approximated: same source
 * (`situation.recentMoves`), same key (`verb` and `object.id`), same tiebreak
 * (the latest `at` wins), same fallback (`shown`). A reintroduction that is not
 * faithful proves nothing about the guard above it.
 */
function stateOfChosenBeforeTheRepair(
  situation: Situation,
  target: { readonly verb: string; readonly object: { readonly id: string } },
): MoveState {
  let latest: { at: Instant; state: MoveState } | undefined
  for (const prior of situation.recentMoves) {
    if (prior.semantics.target.verb !== target.verb) continue
    if (prior.semantics.target.object.id !== target.object.id) continue
    if (latest === undefined || prior.at > latest.at) latest = { at: prior.at, state: prior.state }
  }
  return latest?.state ?? 'shown'
}

describe('D-160 — a completion on an earlier day does not settle today', () => {
  it('reads a freshly generated walk as new, three days after one was finished', () => {
    const { decision } = readIt(THREE_DAYS_SINCE_ID)

    expect(decision.kind, 'the history should still produce a walk').toBe('move')
    expect(decision.explanation?.rendered.sentence).toContain('a walk')
    expect(decision.state, 'today’s occurrence has never been touched').toBe('shown')
  })

  it('leaves all five controls live on it', () => {
    const { decision } = readIt(THREE_DAYS_SINCE_ID)

    // D-052 — every button is always drawn; this is about which of them are
    // live, which is `availableActions` and nothing on the screen.
    expect([...availableActions(decision.state ?? 'shown')].sort()).toEqual([
      'complete',
      'decline',
      'start',
      'try-another',
      'unable-now',
    ])
  })

  it('has the earlier completion in the record and in the three-day window', () => {
    const scenario = scenarioById(THREE_DAYS_SINCE_ID)!
    const loaded = snapshotFromWire(scenario.build())
    const moment = { now: scenario.now, zone: scenario.zone, weekStartsOn: 1 as const }
    const view = buildView(loaded.snapshot, moment)
    const situation = decide(view, moment).situation

    const today = localDayIdAt(scenario.now, scenario.zone)
    const completed = collectEpisodes(view, scenario.zone).filter(
      (episode) => episode.state === 'completed',
    )

    expect(completed.length, 'the fixture must contain exactly one completion').toBe(1)
    expect(completed[0]!.dayId, 'and it must be on an earlier day').not.toBe(today)

    /*
     * The window is untouched, and this is the assertion that says so.
     *
     * `recentMoves` still carries the 22nd's episode on the 25th, which is what
     * `recent-duplication` and the ignoring-is-a-response rule in `evaluate.ts`
     * read. Narrowing the window would have made this pass by making the
     * evidence disappear, which is the repair D-160 forbids.
     */
    const inWindow = situation.recentMoves.filter(
      (prior) => localDayIdAt(prior.at, scenario.zone) !== today,
    )
    expect(inWindow.length, 'the older occurrence must still be visible to learning').toBe(1)
    expect(inWindow[0]!.state).toBe('completed')
  })

  it('still settles today’s move when today is when it was finished', async () => {
    const app = await openJourney('the-first-evening')
    await app.answerGuide('ok')
    await app.answerGuide('none')

    expect(app.decision().state).toBe('shown')
    expect((await app.act('start')).done).toBe(true)
    expect(app.decision().state, 'a start today is today’s state').toBe('started')
    expect((await app.act('complete')).done).toBe(true)

    const settled = collectEpisodes(app.view(), app.zone).filter(
      (episode) => episode.dayId === app.dayId() && episode.state === 'completed',
    )
    expect(settled.length, 'today’s occurrence is completed').toBe(1)
    expect(
      availableActions('completed'),
      'and a completed occurrence really does have nothing left to do',
    ).toEqual([])
  })

  it('comes back the moment the old match is reintroduced', () => {
    const scenario = scenarioById(THREE_DAYS_SINCE_ID)!
    const loaded = snapshotFromWire(scenario.build())
    const moment = { now: scenario.now, zone: scenario.zone, weekStartsOn: 1 as const }
    const decision = decide(buildView(loaded.snapshot, moment), moment)

    const target = decision.evaluation?.candidate.semantics.target
    expect(target, 'the fixture must reach a move for this to prove anything').toBeDefined()

    const wouldHaveBeen = stateOfChosenBeforeTheRepair(decision.situation, target!)

    expect(wouldHaveBeen, 'the old match still reads the 22nd’s completion').toBe('completed')
    expect(availableActions(wouldHaveBeen), 'and would leave every control inert').toEqual([])
    expect(decision.state, 'while the repaired path reads today').toBe('shown')
  })
})

describe('D-160 — the class, swept', () => {
  /**
   * Every history, at every block: the state on screen is today's episode.
   *
   * The instance was one function. The class is _any_ surface resolving "where
   * does this stand" through something other than this day's occurrence, and
   * the only way to know there is not a second one is to ask every history the
   * library holds at every hour rather than the hours the fixtures happen to be
   * written at. That is the shape `no-action-copy.test.ts` established for copy,
   * applied to a state.
   */
  it('never shows a state today’s occurrence does not have', () => {
    for (const scenario of SCENARIOS) {
      const loaded = snapshotFromWire(scenario.build())
      expect(loaded.loaded, `${scenario.id} should load`).toBe(true)
      const date = civilDateFromDayId(localDayIdAt(scenario.now, scenario.zone))

      for (const block of DAY_BLOCKS) {
        const now = instantAtLocal(
          { ...date, hour: HOUR_IN[block], minute: 0, second: 0 },
          scenario.zone,
        )
        const moment = { now, zone: scenario.zone, weekStartsOn: 1 as const }
        const view = buildView(loaded.snapshot, moment)
        const decision = decide(view, moment)
        const target = decision.evaluation?.candidate.semantics.target
        if (decision.kind !== 'move' || target === undefined) continue

        const today = openEpisode(
          collectEpisodes(view, scenario.zone),
          target,
          localDayIdAt(now, scenario.zone),
        )
        expect(decision.state, `${scenario.id} at ${block}`).toBe(today?.state ?? 'shown')
      }
    }
  })
})
