import { describe, expect, it } from 'vitest'
import { DOMAIN } from '../../src/domain/domains'
import { entityRef } from '../../src/domain/entities'
import type { ThreadRecord } from '../../src/domain/records'
import { instant, type Instant } from '../../src/domain/time'
import { decide, type Decision } from '../../src/intelligence/engine'
import { planLifecycle } from '../../src/intelligence/lifecycle'
import { assembleSituation } from '../../src/intelligence/situation'
import {
  describeThreadPosition,
  setThreadStateRecord,
  startThreadRecord,
  THREAD_SHAPES,
  threadFor,
  threadOfferFor,
} from '../../src/intelligence/threads'
import { backupFromJson, backupToJson } from '../../src/memory/backup'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import {
  runningThread,
  THREAD_NOW,
  THREAD_ZONE,
  type ThreadScenarioOptions,
} from '../../src/synthetic/scenarios'

/**
 * AUD-0020 — a move in a plan rather than a fresh guess.
 *
 * `decide()` was a pure function of the situation, and continuity existed in
 * three narrow places, none of which is a plan: a three-day duplication
 * penalty, a count of refusals, and learned per-verb priors. Nothing could
 * express *this, then that* or *we are three weeks into a push*, and the audit's
 * judgement is that six of its own findings are that one missing structure.
 *
 * The instrument below holds one Wednesday evening still and varies exactly one
 * thing at a time: how far into the course, what state it is in, whether it has
 * run out, and — for the gate's second item — whether the owner's body has
 * something to say about it.
 */

const ZONE = THREAD_ZONE
const SUBNETTING = entityRef('learning-topic', 'subnetting')
const RECALL = 'career/recall-practice/learning-topic:subnetting'

function decideWith(options: ThreadScenarioOptions = {}): Decision {
  const loaded = snapshotFromWire(runningThread(options))
  expect(loaded.loaded, 'the thread document should load').toBe(true)
  const moment = { now: THREAD_NOW, zone: ZONE }
  return decide(buildView(loaded.snapshot, moment), moment)
}

function situationWith(options: ThreadScenarioOptions = {}) {
  const loaded = snapshotFromWire(runningThread(options))
  const moment = { now: THREAD_NOW, zone: ZONE, weekStartsOn: 1 as const }
  return assembleSituation(buildView(loaded.snapshot, moment), moment)
}

function threadFitOf(decision: Decision, id = RECALL): { value: number; weight: number } {
  const row = decision.trace.ranking.find((entry) => entry.id === id)
  expect(row, `${id} was not ranked`).toBeDefined()
  const dimension = row?.dimensions.find((entry) => entry.name === 'thread-fit')
  expect(dimension, 'no thread-fit dimension').toBeDefined()
  return { value: dimension?.value ?? Number.NaN, weight: dimension?.weight ?? Number.NaN }
}

// ---------------------------------------------------------------------------
// Gate item 2 — a dominant limiter overrides a thread
// ---------------------------------------------------------------------------

describe('a thread never beats what is actually in the way', () => {
  it('loses to a recovery limiter on the same evening it would otherwise win', () => {
    /*
     * The gate item, on a real evening rather than on the weights table. The
     * only difference between these two decisions is three nights of sleep: the
     * course is identical, two sessions in and running in both.
     *
     * This is AUD-0020's own first mitigation. A plan that could out-argue a
     * body needing rest would be the app nagging the owner with intentions he
     * had three weeks ago, which is the failure the finding names about its own
     * structure.
     */
    const rested = decideWith({ strain: 'none' })
    const short = decideWith({ strain: 'severe' })

    expect(rested.evaluation?.candidate.id).toBe(RECALL)
    expect(short.situation.limiter?.kind).toBe('recovery')
    expect(short.evaluation?.candidate.semantics.target.verb).toBe('recover')

    // And the thread was live and pulling on the losing move, so this is an
    // override rather than an absence.
    expect(threadFitOf(short).value).toBe(1)
    expect(
      threadFor(short.situation.threads, { verb: 'recall-practice', object: SUBNETTING }),
    ).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// What a thread does to a decision, and when it stops
// ---------------------------------------------------------------------------

describe('a course under way changes the ranking, and only while it is live', () => {
  it('scores a move that counts toward it, and abstains on everything else', () => {
    const decision = decideWith()
    expect(threadFitOf(decision)).toEqual({ value: 1, weight: 1 })

    const walk = threadFitOf(decision, 'health/move/routine:a-walk')
    // Abstains at zero weight — D-048. A dimension with nothing to say must
    // cost nothing to have, which is what lets a nineteenth dimension be added
    // without moving every score in every history that has no threads in it.
    expect(walk).toEqual({ value: 0, weight: 0 })
  })

  const stopped: readonly { readonly what: string; readonly options: ThreadScenarioOptions }[] = [
    { what: 'stopped by the owner', options: { state: 'abandoned' } },
    { what: 'paused after a decline', options: { state: 'paused' } },
    { what: 'finished', options: { state: 'done' } },
    // Started forty days ago against a twenty-eight-day course.
    { what: 'run out of time on its own', options: { startedDaysAgo: 40 } },
    { what: 'already had all three occasions', options: { sessionsDone: 3 } },
  ]

  for (const { what, options } of stopped) {
    it(`stops pulling once it is ${what}`, () => {
      /*
       * Enumerated rather than sampled — D-108. "A thread expires on its own"
       * is five separate conditions, and a sweep covering one of them is not a
       * weaker version of the claim; it is a different and smaller one.
       */
      expect(threadFitOf(decideWith(options))).toEqual({ value: 0, weight: 0 })
    })
  }

  it('is still on Life after it stops, rather than quietly vanishing', () => {
    // A course that disappeared would leave him unable to tell whether the app
    // dropped it or he did.
    for (const { options } of stopped) {
      const situation = situationWith(options)
      expect(situation.threads, JSON.stringify(options)).toHaveLength(1)
      expect(situation.threads[0]?.live).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// Gate item 3, second half — it explains why it is active
// ---------------------------------------------------------------------------

describe('a thread is never a hidden reason', () => {
  it('says which course the move belongs to and where in it', () => {
    const decision = decideWith({ sessionsDone: 1 })
    expect(decision.explanation?.partOf).toBe(
      'Three sessions on subnetting — second of three. One to go.',
    )
  })

  it('changes what it says as the course runs', () => {
    /*
     * The four-evening sweep AUD-0020 asks for, as four points on the same
     * course. The clause has to move: a plan that said the same thing on every
     * evening of a three-session push would be the nine-identical-evenings
     * defect with a plan attached to it.
     */
    const said = [0, 1, 2].map(
      (sessionsDone) => decideWith({ sessionsDone }).explanation?.partOf ?? '',
    )
    expect(new Set(said).size, said.join(' | ')).toBe(3)
    expect(said[0]).toContain('first of three')
    expect(said[1]).toContain('second of three')
    expect(said[2]).toContain('third of three')
    expect(said[2]).toContain('The last one.')
  })

  it('says nothing at all when the move belongs to no live course', () => {
    expect(decideWith({ state: 'abandoned' }).explanation?.partOf).toBeUndefined()
  })

  it('counts occasions and never renders a share of them', () => {
    /*
     * Section 22. A progress bar over a man's study week is a score about his
     * week whatever the intent, and "67% through" is one with the arithmetic
     * showing.
     */
    const forbidden = [/%/, /\bpercent/i, /\bscore\b/i, /\d+\s*\/\s*\d+/]
    for (const sessionsDone of [0, 1, 2, 3]) {
      const situation = situationWith({ sessionsDone })
      const thread = situation.threads[0]
      if (thread === undefined) continue
      for (const line of [thread.intent, describeThreadPosition(thread)]) {
        for (const pattern of forbidden) {
          expect(pattern.test(line), `“${line}”`).toBe(false)
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Gate item 3, first half — stopped in one tap, and stopped by a decline
// ---------------------------------------------------------------------------

describe('a thread can be stopped', () => {
  it('is stopped by one record that supersedes the running one', () => {
    const situation = situationWith()
    const thread = situation.threads[0]
    expect(thread).toBeDefined()
    if (thread === undefined) return

    const previous = situation.view.history.byId(thread.source)
    expect(previous?.kind).toBe('thread')
    if (previous === undefined || previous.kind !== 'thread') return

    const stop = setThreadStateRecord(thread, 'abandoned', previous, {
      now: situation.at,
      zone: ZONE,
    })
    expect(stop.state).toBe('abandoned')
    // Superseded rather than edited: the course he set out on stays legible
    // after he stops it (section 13.1).
    expect(stop.supersedes).toBe(previous.id)
    expect(stop.intent).toBe(previous.intent)
  })

  it('is paused by declining one of its moves, and by nothing else', () => {
    /*
     * AUD-0020's own mitigation: "any decline of a thread move must be able to
     * end the thread". Paused rather than abandoned, because a decline is
     * disagreement with tonight and not a verdict on the plan (section 20).
     *
     * The three actions are enumerated, because the difference between them is
     * the point. `unable-now` is a fact about the evening and `try-another` is
     * a request for a different suggestion; neither is him saying the course is
     * wrong, and either of them ending a plan would be the app reading a
     * refusal as a verdict — the mistake `learning.ts` takes care to avoid one
     * file over.
     */
    const situation = situationWith()
    const chosen = decideWith().explanation?.semantics
    expect(chosen?.target.verb).toBe('recall-practice')
    if (chosen === undefined) return

    const plan = (action: 'decline' | 'unable-now' | 'try-another') =>
      planLifecycle({
        view: situation.view,
        situation,
        semantics: chosen,
        action,
        recordedAt: situation.at,
      }).records.filter((record): record is ThreadRecord => record.kind === 'thread')

    const declined = plan('decline')
    expect(declined).toHaveLength(1)
    expect(declined[0]?.state).toBe('paused')
    expect(declined[0]?.supersedes).toBe(situation.threads[0]?.source)

    expect(plan('unable-now')).toEqual([])
    expect(plan('try-another')).toEqual([])
  })

  it('writes nothing about threads when the move belongs to none', () => {
    // The ordinary case, which is nearly every decline the app will ever see.
    const situation = situationWith({ state: 'abandoned' })
    const chosen = decideWith({ state: 'abandoned' }).explanation?.semantics
    if (chosen === undefined) return
    const records = planLifecycle({
      view: situation.view,
      situation,
      semantics: chosen,
      action: 'decline',
      recordedAt: situation.at,
    }).records
    expect(records.filter((record) => record.kind === 'thread')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Starting one, and the bound on what can be started
// ---------------------------------------------------------------------------

describe('there are exactly three courses and no way to invent a fourth', () => {
  it('is the three AUD-0020 names, enumerated by name', () => {
    expect(THREAD_SHAPES.map((shape) => shape.kind)).toEqual([
      'recovery-run',
      'study-schedule',
      'growth-ladder',
    ])
  })

  it('offers nothing when a course already covers the subject', () => {
    const situation = situationWith()
    expect(
      threadOfferFor(
        situation.threads,
        { verb: 'recall-practice', object: SUBNETTING },
        'subnetting',
      ),
    ).toBeUndefined()
  })

  it('offers nothing again once the owner has stopped one', () => {
    // He has already answered this. Asking again on the strength of the same
    // subject is the nagging the whole structure is fenced against.
    const situation = situationWith({ state: 'abandoned' })
    expect(
      threadOfferFor(
        situation.threads,
        { verb: 'recall-practice', object: SUBNETTING },
        'subnetting',
      ),
    ).toBeUndefined()
  })

  it('offers one where nothing covers the subject yet', () => {
    const offer = threadOfferFor([], { verb: 'recall-practice', object: SUBNETTING }, 'subnetting')
    expect(offer?.kind).toBe('study-schedule')
    expect(offer?.intent).toBe('Three sessions on subnetting')
  })

  it('offers nothing for a move that belongs to no course at all', () => {
    expect(
      threadOfferFor([], { verb: 'reset-space', object: entityRef('place', 'the kitchen') }, 'x'),
    ).toBeUndefined()
  })

  it('sets the date it gives up on when it starts, from the kind', () => {
    const AT: Instant = instant(Date.parse('2026-09-16T02:00:00Z'))
    const started = startThreadRecord(
      {
        kind: 'recovery-run',
        subject: SUBNETTING,
        subjectLabel: 'subnetting',
        domain: DOMAIN.sleep,
      },
      { now: AT, zone: ZONE },
    )
    expect(started.state).toBe('running')
    expect(started.steps).toBe(3)
    // Ten days for a recovery run, from the owner-local day it began.
    expect(started.expiresOn).toBe('2026-09-25')
  })
})

// ---------------------------------------------------------------------------
// The contract test the finding asks for
// ---------------------------------------------------------------------------

describe('a thread survives a backup and a restore', () => {
  it('comes back running, with the same moves and the same date', () => {
    const before = snapshotFromWire(runningThread())
    const load = backupFromJson(
      backupToJson(before.snapshot, {
        app: {
          commitSha: 'a'.repeat(40),
          commitShort: 'aaaaaaa',
          branch: 'main',
          target: 'preview',
          buildTime: '2026-01-01T00:00:00.000Z',
        },
        createdAt: THREAD_NOW,
      }),
    )
    expect(load.ok, load.ok ? '' : load.refusal.problem).toBe(true)
    if (!load.ok) return

    const thread = load.snapshot.records.find(
      (record): record is ThreadRecord => record.kind === 'thread',
    )
    // The values, not the container — D-108. A restored thread whose moves came
    // back empty would satisfy `toBeDefined()` and would silently stop pulling.
    expect(thread?.thread).toBe('study-schedule')
    expect(thread?.steps).toBe(3)
    expect(thread?.moves).toEqual(['recall-practice', 'review-weak-topic', 'hands-on-lab'])
    expect(thread?.state).toBe('running')
    expect(thread?.expiresOn).toBe('2026-10-04')

    // And it still means the same thing after the trip.
    const moment = { now: THREAD_NOW, zone: ZONE, weekStartsOn: 1 as const }
    const situation = assembleSituation(buildView(load.snapshot, moment), moment)
    expect(situation.threads[0]?.live).toBe(true)
    expect(situation.threads[0]?.done).toBe(2)
  })
})
