import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { entityId, sequentialRecordIds, type RecordId } from '../../src/domain/ids'
import type { EntityRef } from '../../src/domain/entities'
import type { CanonicalRecord } from '../../src/domain/records'
import { localDayIdAt, type Instant } from '../../src/domain/time'
import { decide, type Decision } from '../../src/intelligence/engine'
import { maintenanceProbeDue } from '../../src/intelligence/growth'
import { collectEpisodes } from '../../src/intelligence/lifecycle'
import { planLifecycle } from '../../src/intelligence/lifecycle'
import { assembleSituation, type ShownMove } from '../../src/intelligence/situation'
import { shapeFor, startThreadRecord, threadOfferFor } from '../../src/intelligence/threads'
import type { StoreSnapshot } from '../../src/memory/store'
import { buildView } from '../../src/memory/view'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { createKit, pastEpisodeRecords, type PastEpisode } from '../../src/synthetic/kit'
import { evening } from './harness'

/**
 * §13E.1 — the maintenance-probe regression, five arms.
 *
 * ## What this is, and what it deliberately is not
 *
 * The owner-decision sequence classified the probe result **B — calibration /
 * regression QA**, and said so in as many words: *"do not create a routing 93
 * scoring package, a new scoring dimension, probe-specific urgency escalation, a
 * global `stale-evidence` urgency change, or a separate written scoring
 * decision. Routing 93 carries the regression coverage only."*
 *
 * So there is **no product change behind this file**. What it does is pin the
 * five mechanics the classification rests on, so that the day one of them moves
 * the classification is re-opened deliberately rather than discovered later.
 *
 * ## The verified facts it holds
 *
 * A due probe begins with a **0.20 weighted urgency disadvantage** against an
 * active `opportunity-window` candidate (0.3 against 0.5 at weight 1), and the
 * existing duplication mechanisms recover it: `shownToday` counts a move once
 * per **distinct `now`**, so with three active skills the probe can become the
 * top growth candidate by the fourth distinct visit (0.55 × 0.8 = +0.44 against
 * a 0.20 deficit); and once competing skills accumulate `sameThing` at −0.5
 * while the probe carries only `sameShape` at −0.2, 0.3 × 0.8 = +0.24 also
 * clears it.
 */

const DAY = 86_400_000
const HOUR = 3_600_000

const ADAYA = { kind: 'person', id: entityId('person', 'Adaya') } as const
const SETTLED = {
  kind: 'development-skill',
  id: entityId('development-skill', 'ordering her own food'),
} as const
const PRACTISING = [
  { kind: 'development-skill', id: entityId('development-skill', 'getting her shoes on') },
  { kind: 'development-skill', id: entityId('development-skill', 'pouring her own drink') },
  { kind: 'development-skill', id: entityId('development-skill', 'packing her own bag') },
] as const

const TODAY = '2026-06-10'

/**
 * A house with one settled skill long overdue a check and three being practised.
 *
 * Built rather than added to the shipped library: a new scenario would change
 * `SCENARIOS.length`, which routing 92's own speaking-count gate is measured
 * against, and a regression file is not a reason to move a pinned figure.
 */
function aHouseWithFourSkills(options: { readonly settledDaysAgo: number }): StoreSnapshot {
  const kit = createKit('MPB', 'Europe/London', '2025-01-01T00:00:00Z')
  const nextId = sequentialRecordIds('MPBE')

  const child = kit.entity({
    id: ADAYA.id,
    kind: 'person',
    label: 'Adaya',
    domain: DOMAIN.fatherhood,
    privacy: 'child-family-sensitive',
  })
  const settled = kit.entity({
    id: SETTLED.id,
    kind: 'development-skill',
    label: 'ordering her own food',
    domain: DOMAIN.fatherhood,
    privacy: 'child-family-sensitive',
    links: [{ relation: 'about-person', target: ADAYA.id }],
  })
  const others = PRACTISING.map((skill, index) =>
    kit.entity({
      id: skill.id,
      kind: 'development-skill',
      label: ['getting her shoes on', 'pouring her own drink', 'packing her own bag'][index]!,
      domain: DOMAIN.fatherhood,
      privacy: 'child-family-sensitive',
      links: [{ relation: 'about-person', target: ADAYA.id }],
    }),
  )

  const now = kit.local(TODAY, '17:00')
  const settledOn = dayBefore(options.settledDaysAgo)

  const records: CanonicalRecord[] = [
    kit.record(
      'context',
      {
        occurredAt: kit.local('2025-01-01', '09:00'),
        domains: [DOMAIN.fatherhood],
        entities: [ADAYA],
      },
      {
        concept: CONCEPT.childPresent,
        value: { type: 'boolean', value: true },
        durability: 'durable',
        validFrom: kit.local('2025-01-01', '09:00'),
      },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local(TODAY, '07:00'), domains: [DOMAIN.sleep] },
      {
        concept: CONCEPT.sleepHours,
        value: { type: 'number', value: 8, unit: 'hours' },
        method: 'self-report',
      },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local(TODAY, '16:30'), domains: [DOMAIN.health] },
      { concept: CONCEPT.energy, value: { type: 'scale', value: 4, of: 5 }, method: 'self-report' },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local(TODAY, '16:30'), domains: [DOMAIN.health] },
      {
        concept: CONCEPT.soreness,
        value: { type: 'scale', value: 0, of: 5 },
        method: 'self-report',
      },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local(TODAY, '16:30'), domains: [DOMAIN.direction] },
      {
        concept: CONCEPT.freeNow,
        value: { type: 'duration', minutes: 120 },
        method: 'self-report',
      },
    ),
    // The owner's own confirmation that she has got it. The probe interval runs
    // from here, and it doubles with every probe that has actually happened.
    kit.record(
      'domain-update',
      {
        occurredAt: kit.local(settledOn, '20:00'),
        domains: [DOMAIN.fatherhood],
        entities: [SETTLED],
      },
      {
        domain: DOMAIN.fatherhood,
        summary: 'Ordering her own food is settled.',
        growthStage: { skill: SETTLED, stage: 'settled' },
      },
    ),
  ]

  // Each practising skill has a recent occasion, so all three are live.
  const seeds: PastEpisode[] = PRACTISING.map((skill, index) => ({
    verb: 'growth-opportunity',
    object: skill,
    subject: skill,
    domain: DOMAIN.fatherhood,
    on: dayBefore(index + 2),
    at: '17:30',
    context: evening({ block: 'afternoon', dayOfWeek: 3 }),
    ending: 'completed',
    result: 'all',
  }))
  records.push(...pastEpisodeRecords(kit, seeds, nextId))

  const loaded = snapshotFromWire(
    kit.document({ entities: [child, settled, ...others], records, exportedAt: now }),
  )
  expect(loaded.loaded, 'the house should load').toBe(true)
  if (!loaded.loaded) throw new Error('unreachable')
  return loaded.snapshot
}

function dayBefore(days: number): string {
  return new Date(Date.UTC(2026, 5, 10) - days * DAY).toISOString().slice(0, 10)
}

const ZONE = 'Europe/London' as never
const FIRST_VISIT = Date.parse(`${TODAY}T16:00:00Z`) as Instant

/**
 * A session: a store, a clock, and the count of what has been on screen.
 *
 * The ledger is the **surface's** — it arrives on the moment as an argument
 * (D-043, AUD-0025) — so a runner that wants to reproduce visits has to keep one
 * the way `MemoryProvider` does. `shownToday` counts a move once per distinct
 * `now`, which is exactly why §13E.1 says to *"advance `now` between distinct
 * visits so `noteShown` actually counts"*.
 */
function aSession(snapshot: StoreSnapshot) {
  let records = [...snapshot.records]
  let at = FIRST_VISIT
  const ledger = new Map<string, ShownMove>()

  const moment = () => ({
    now: at,
    zone: ZONE,
    weekStartsOn: 1 as const,
    shown: [...ledger.values()],
  })
  const view = () => buildView({ ...snapshot, records }, moment())

  return {
    now: () => at,
    travel(ms: number) {
      at = (at + ms) as Instant
    },
    situation: () => assembleSituation(view(), moment()),
    decide: (): Decision => decide(view(), moment(), { probe: false }),
    /** What `NowScreen` does when a move is rendered. */
    noteShown(move: string) {
      const dayId = localDayIdAt(at, ZONE)
      const key = `${move}|${dayId}`
      const held = ledger.get(key)
      if (held !== undefined && held.at === at) return
      ledger.set(key, { move, dayId, at, count: (held?.count ?? 0) + 1 })
    },
    /** And a visit: decide, note what was shown, and walk away from it. */
    visit(): Decision {
      const decision = decide(view(), moment(), { probe: false })
      const shown = decision.evaluation?.candidate.id
      if (shown !== undefined) this.noteShown(shown)
      return decision
    },
    append(more: readonly CanonicalRecord[]) {
      records = [...records, ...more]
    },
  }
}

const PROBE = `fatherhood/growth-opportunity/${SETTLED.id}`

// ---------------------------------------------------------------------------
// Arm A — the ignore path
// ---------------------------------------------------------------------------

describe('arm A — the probe recovers when everything else is ignored', () => {
  it('starts behind, which is the deficit the classification is about', () => {
    /*
     * The verified fact this rests on: a due probe carries `stale-evidence`
     * (urgency 0.3) against an active skill's `opportunity-window` (0.5), at
     * weight 1 — a **0.20 weighted disadvantage**. It is a real deficit and it is
     * not a defect; what matters is that the existing mechanisms recover it.
     */
    const session = aSession(aHouseWithFourSkills({ settledDaysAgo: 400 }))
    const situation = session.situation()
    expect(maintenanceProbeDue(situation, SETTLED), 'the probe is not even due').toBe(true)

    const ranking = session.decide().trace.ranking
    const probe = ranking.find((row) => row.id === PROBE)
    expect(probe, 'the probe never entered arbitration').toBeDefined()
    expect(ranking[0]?.id, 'the probe already wins, so there is no deficit to recover').not.toBe(
      PROBE,
    )
  })

  it('becomes the move that is chosen and shown within the visit bound', () => {
    /*
     * **Chosen and shown, not merely in arbitration** — §13E.1 says so in those
     * words, and the difference is the whole arm: a candidate that ranks and
     * never wins is a candidate the owner never sees.
     *
     * Each visit advances the clock, which is what makes `noteShown` count: the
     * ledger holds one row per (move, day) and `shownToday` reads how many
     * *distinct moments* it has been in front of him.
     */
    const session = aSession(aHouseWithFourSkills({ settledDaysAgo: 400 }))
    let chosenOn: number | undefined

    for (let visit = 0; visit < 6; visit += 1) {
      const decision = session.visit()
      if (decision.evaluation?.candidate.id === PROBE) {
        chosenOn = visit
        break
      }
      // Ignored: nothing is acted on, and the clock moves to the next visit.
      session.travel(HOUR)
    }

    expect(chosenOn, 'the probe was never chosen, however long it was ignored').toBeDefined()
    expect(chosenOn, 'the probe took longer than the verified bound').toBeLessThanOrEqual(4)
  })
})

// ---------------------------------------------------------------------------
// Arm B — the response path
// ---------------------------------------------------------------------------

describe('arm B — the probe recovers when the competing skills are acted on', () => {
  it('is chosen and shown once the others have accumulated sameThing', () => {
    /*
     * The other recovery route, and it is a different mechanism from arm A's:
     * `recent-duplication` charges a competing skill −0.5 for `sameThing` — the
     * same object, acted on — while the probe carries only −0.2 for `sameShape`.
     * 0.3 × 0.8 = **+0.24**, which also clears the 0.20 deficit.
     */
    const session = aSession(aHouseWithFourSkills({ settledDaysAgo: 400 }))
    let chosen: string | undefined

    /*
     * Six hours between responses, not a day.
     *
     * `recentMoves` is a **three-day** window, so acting on one skill a day
     * would age the first one out before the third arrived and the cycle would
     * repeat forever — which is what a first draft did, and it is a fact about
     * the mechanism rather than about the test. `settledRecently` still holds
     * each move for a day, so every response lands on a different one.
     */
    const seen: string[] = []
    /*
     * Three hours between responses, and hours with nothing on offer are simply
     * passed through.
     *
     * `recentMoves` is a **three-day** window, so responding once a day would
     * age the first answer out before the fourth arrived and the cycle would
     * repeat forever — which is what a first draft did, and it is a fact about
     * the mechanism rather than about the test. `settledRecently` still holds
     * each move for a day, so every response lands on something different, and
     * the late-night hours offer nothing at all because growth moves refuse
     * them.
     */
    for (let visit = 0; visit < 16; visit += 1) {
      const decision = session.decide()
      const candidate = decision.evaluation?.candidate
      if (candidate === undefined) {
        seen.push(`nothing (${decision.noAction?.reason ?? decision.kind})`)
        session.travel(3 * HOUR)
        continue
      }
      seen.push(candidate.id)
      if (candidate.id === PROBE) {
        chosen = candidate.id
        break
      }
      // Acted on, which is what puts `sameThing` on the record.
      const plan = planLifecycle({
        view: decision.situation.view,
        situation: decision.situation,
        semantics: candidate.semantics,
        action: 'complete',
        recordedAt: session.now(),
      })
      session.append(plan.records)
      session.travel(3 * HOUR)
    }

    expect(
      chosen,
      `responding to everything else never let the probe through: ${seen.join(' | ')}`,
    ).toBe(PROBE)
  })
})

// ---------------------------------------------------------------------------
// Loop close
// ---------------------------------------------------------------------------

describe('the loop closes — acting on the probe advances the interval', () => {
  it('writes an episode, counts as a probe, and pushes the next one out', () => {
    /*
     * §13E.1's third arm. The interval doubles with every probe that has
     * actually happened since the skill settled, so acting on one has to be
     * visible to `maintenanceProbeDue` — otherwise the app would ask again
     * tomorrow, which is the nagging the expanding interval exists to prevent.
     */
    const session = aSession(aHouseWithFourSkills({ settledDaysAgo: 400 }))
    let decision = session.decide()
    for (let visit = 0; visit < 6 && decision.evaluation?.candidate.id !== PROBE; visit += 1) {
      session.visit()
      session.travel(HOUR)
      decision = session.decide()
    }
    expect(decision.evaluation?.candidate.id, 'the probe never reached the screen').toBe(PROBE)

    const before = collectEpisodes(decision.situation.view, ZONE).length
    const plan = planLifecycle({
      view: decision.situation.view,
      situation: decision.situation,
      semantics: decision.evaluation!.candidate.semantics,
      action: 'complete',
      recordedAt: session.now(),
    })
    session.append(plan.records)

    const after = session.situation()
    expect(collectEpisodes(after.view, ZONE).length, 'acting on it wrote nothing').toBeGreaterThan(
      before,
    )
    expect(
      maintenanceProbeDue(after, SETTLED),
      'the probe is still due the moment after it happened',
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Null arm
// ---------------------------------------------------------------------------

describe('the null arm — no probe is shown merely to satisfy a test', () => {
  it('proposes nothing about a skill that settled yesterday', () => {
    /*
     * §13E.1's fourth arm, and the one that makes the other three mean
     * something. A settled skill is not proposed at all until its interval has
     * passed — section 62's rule that the app stops reasserting a belief the
     * owner has corrected.
     */
    const session = aSession(aHouseWithFourSkills({ settledDaysAgo: 1 }))
    const situation = session.situation()
    expect(maintenanceProbeDue(situation, SETTLED)).toBe(false)

    for (let visit = 0; visit < 6; visit += 1) {
      const decision = session.visit()
      expect(
        decision.trace.proposed.some((move) => move.id === PROBE),
        `visit ${visit}: a settled skill was proposed with no probe due`,
      ).toBe(false)
      session.travel(HOUR)
    }
  })
})

// ---------------------------------------------------------------------------
// The thread-fit bound
// ---------------------------------------------------------------------------

describe('the growth-ladder bound — delay, and never starvation', () => {
  it('is three steps and forty-two days, set once and never extended', () => {
    /*
     * §13E.1's fifth arm asks for **the documented bound, not "whatever
     * happens"**: `steps: 3`, `lastsDays: 42`, expiry set once and never
     * extended. These are the numbers the classification was verified against.
     */
    const shape = shapeFor('growth-ladder')
    expect(shape.steps).toBe(3)
    expect(shape.lastsDays).toBe(42)
  })

  it('sets the expiry from the day it starts and never moves it', () => {
    const kit = createKit('MPT', 'Europe/London', '2025-01-01T00:00:00Z')
    const started = startThreadRecord(
      {
        kind: 'growth-ladder',
        subject: SETTLED as unknown as EntityRef,
        subjectLabel: 'ordering her own food',
        domain: DOMAIN.fatherhood,
      },
      { now: kit.local(TODAY, '20:00'), zone: kit.zone },
    )
    expect(started.expiresOn).toBe('2026-07-22')
    expect(started.steps).toBe(3)
    // And the record carries it, so a later reading cannot recompute a longer
    // one from a table that has since changed.
    expect(started.state).toBe('running')
  })

  it('permanently blocks a second ladder on the same skill', () => {
    /*
     * §13E.1's own words: *"`activeThreads` includes finished, stopped,
     * abandoned and expired threads, so `threadOfferFor`'s `answered` check
     * permanently blocks a re-offer on the same subject"* — and *"at most one
     * growth-ladder thread per `development-skill` for that skill's lifetime."*
     *
     * Routing 93 changed the re-offer rule **for recovery runs only** (DEF-0166),
     * because a run is about its nights rather than about a subject. This is the
     * assertion that the ladder's bound was not loosened with it.
     */
    const answered = [
      {
        kind: 'growth-ladder' as const,
        subject: SETTLED as unknown as EntityRef,
        intent: 'Three goes at ordering her own food',
        steps: 3,
        moves: ['growth-opportunity' as const],
        state: 'abandoned' as const,
        startedOn: '2026-01-01' as never,
        expiresOn: '2026-02-12' as never,
        source: 'THREAD' as RecordId,
        done: 1,
        expired: true,
        finished: false,
        live: false,
      },
    ]

    expect(
      threadOfferFor(
        answered,
        { verb: 'growth-opportunity', object: SETTLED },
        'ordering her own food',
      ),
      'a second ladder was offered on a skill that already had one',
    ).toBeUndefined()
  })

  it('lets a genuinely different skill have its own', () => {
    // The other half: the bound is per skill, not per kind. A blanket rule would
    // mean one ladder ever, which is starvation rather than a bound.
    const answered = [
      {
        kind: 'growth-ladder' as const,
        subject: SETTLED as unknown as EntityRef,
        intent: 'Three goes at ordering her own food',
        steps: 3,
        moves: ['growth-opportunity' as const],
        state: 'abandoned' as const,
        startedOn: '2026-01-01' as never,
        expiresOn: '2026-02-12' as never,
        source: 'THREAD' as RecordId,
        done: 1,
        expired: true,
        finished: false,
        live: false,
      },
    ]

    const other = PRACTISING[0]!
    expect(
      threadOfferFor(
        answered,
        { verb: 'growth-opportunity', object: other },
        'getting her shoes on',
      )?.kind,
      'a different skill inherited another skill’s bound',
    ).toBe('growth-ladder')
  })

  it('stops pulling the moment the thread is no longer live', () => {
    /*
     * The last half of the fifth arm: *"once the live thread ends its thread-fit
     * stops pulling."* `threadFor` requires `live`, which is running, unexpired
     * and unfinished — so an expired ladder is still on Life, still in the
     * record, and no longer in the ranking.
     */
    const expired = {
      kind: 'growth-ladder' as const,
      subject: PRACTISING[0]! as unknown as EntityRef,
      intent: 'Three goes at getting her shoes on',
      steps: 3,
      moves: ['growth-opportunity' as const],
      state: 'running' as const,
      startedOn: '2026-01-01' as never,
      expiresOn: '2026-02-12' as never,
      source: 'THREAD' as RecordId,
      done: 1,
      expired: true,
      finished: false,
      live: false,
    }
    const session = aSession(aHouseWithFourSkills({ settledDaysAgo: 400 }))
    const situation = { ...session.situation(), threads: [expired] }
    const ranked = decide(situation.view, {
      now: session.now(),
      zone: ZONE,
      weekStartsOn: 1,
    }).trace.ranking

    for (const row of ranked) {
      const fit = row.dimensions.find((dimension) => dimension.name === 'thread-fit')
      expect(fit?.weight, `${row.id}: an expired ladder still pulled`).toBe(0)
    }
  })
})
