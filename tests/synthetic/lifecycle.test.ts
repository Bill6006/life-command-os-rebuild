import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { entityRef } from '../../src/domain/entities'
import { sequentialRecordIds, type RecordId } from '../../src/domain/ids'
import type { RecommendationSemantics } from '../../src/domain/recommendation'
import type { CanonicalRecord } from '../../src/domain/records'
import { instant, timeZone, type Instant } from '../../src/domain/time'
import { decide, type Decision } from '../../src/intelligence/engine'
import {
  availableActions,
  collectEpisodes,
  planLifecycle,
  WANTED_SOMETHING_ELSE,
  type LifecycleAction,
} from '../../src/intelligence/lifecycle'
import {
  answeredAspects,
  dueOutcomes,
  nextDueOutcome,
  nextOutcomeDueAt,
  outcomeQuestionsFor,
  outcomeRecord,
  outcomeWindowFor,
} from '../../src/intelligence/outcomes'
import { planAppend } from '../../src/memory/append'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { recordFingerprint, type StoreSnapshot } from '../../src/memory/store'
import { buildView } from '../../src/memory/view'
import { createKit } from '../../src/synthetic/kit'

/**
 * The recommendation lifecycle, end to end (canonical plan section 48).
 *
 * Section 66 lists the slice this phase completes: show a move, let the owner
 * accept, decline or say can't-now, record the outcome, learn from it, alter
 * the next decision. What follows walks that loop with the same functions Now
 * calls, through the same store, so nothing here can pass on a path the owner
 * never takes.
 */

const ZONE = timeZone('America/Denver')
const KITCHEN = entityRef('place', 'the kitchen')

/** An ordinary evening with a cluttered kitchen and an hour to spend. */
function tonight(at = '19:30') {
  const kit = createKit('LC', 'America/Denver', '2026-04-01T12:00:00Z')
  const now = kit.local('2026-05-19', at)

  const place = kit.entity({
    kind: 'place',
    label: 'the kitchen',
    domain: DOMAIN.home,
    privacy: 'normal',
  })

  const records = [
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-05-18', '18:00'), domains: [DOMAIN.home], entities: [KITCHEN] },
      {
        concept: CONCEPT.homeFriction,
        value: { type: 'text', value: 'the kitchen table is buried again' },
        method: 'self-report',
      },
    ),
    ...[7.5, 7.75, 8].map((value, offset) =>
      kit.record(
        'observation',
        { occurredAt: kit.local(`2026-05-${17 + offset}`, '07:00'), domains: [DOMAIN.sleep] },
        {
          concept: CONCEPT.sleepHours,
          value: { type: 'number', value, unit: 'hours' },
          method: 'self-report',
        },
      ),
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-05-19', '18:00'), domains: [DOMAIN.health] },
      { concept: CONCEPT.energy, value: { type: 'scale', value: 3, of: 5 }, method: 'self-report' },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-05-19', '19:00'), domains: [DOMAIN.direction] },
      {
        concept: CONCEPT.usableTimeTonight,
        value: { type: 'duration', minutes: 60 },
        method: 'self-report',
      },
    ),
  ]

  const loaded = snapshotFromWire(kit.document({ entities: [place], records, exportedAt: now }))
  expect(loaded.loaded).toBe(true)
  return { kit, now, snapshot: loaded.snapshot }
}

interface Session {
  readonly snapshot: StoreSnapshot
  readonly now: Instant
  decision(): Decision
  /** What Now does when a button is tapped: plan, append, re-read. */
  tap(action: LifecycleAction): Session
  /**
   * The same, on the card that was on screen rather than the current best.
   *
   * A surface acts on the move it drew. Between drawing it and the finger
   * landing, the engine may prefer something else — so the semantics travel
   * with the button rather than being looked up again when it is pressed.
   */
  tapOnCard(semantics: RecommendationSemantics, action: LifecycleAction): Session
  /** The move currently on screen, as a card a button could be attached to. */
  card(): RecommendationSemantics
  /** Two taps planned against the same stale view, then both written. */
  doubleTap(action: LifecycleAction): Session
}

function session(snapshot: StoreSnapshot, now: Instant, tick = 0): Session {
  const nextId = sequentialRecordIds(`LT${String(tick).padStart(2, '0')}`)
  const view = () => buildView(snapshot, { now, zone: ZONE })
  const decision = () => decide(view(), { now, zone: ZONE })

  const card = (): RecommendationSemantics => {
    const semantics = decision().evaluation?.candidate.semantics
    expect(semantics, 'nothing on screen to act on').toBeDefined()
    if (semantics === undefined) throw new Error('nothing on screen to act on')
    return semantics
  }

  const plan = (
    action: LifecycleAction,
    recordedAt: Instant,
    ids: () => RecordId,
    onCard?: RecommendationSemantics,
  ) => {
    const current = decision()
    const semantics = onCard ?? card()
    return planLifecycle({
      view: view(),
      situation: current.situation,
      semantics,
      action,
      recordedAt,
      nextId: ids,
    })
  }

  return {
    snapshot,
    now,
    decision,
    tap: (action) => {
      const planned = plan(action, instant(now + (tick + 1) * 60_000), nextId)
      return session(withRecords(snapshot, planned.records), now, tick + 1)
    },
    card,
    tapOnCard: (semantics, action) => {
      const planned = plan(action, instant(now + (tick + 1) * 60_000), nextId, semantics)
      return session(withRecords(snapshot, planned.records), now, tick + 1)
    },
    doubleTap: (action) => {
      /*
       * The real race, not a simulation of it.
       *
       * Both taps are planned against the same view — which is exactly what
       * happens when the second lands before the first append has come back —
       * and then both are written. The guard cannot be "the surface remembers",
       * because in this sequence the surface has not been told anything yet.
       */
      const first = plan(action, instant(now + 60_000), sequentialRecordIds('LTA'))
      const second = plan(action, instant(now + 60_100), sequentialRecordIds('LTB'))
      return session(
        withRecords(withRecords(snapshot, first.records), second.records),
        now,
        tick + 2,
      )
    },
  }
}

/**
 * Appending the way the store appends.
 *
 * Through `planAppend`, which is the rule both store implementations share —
 * so the idempotency that stops a double tap writing twice is part of what is
 * being tested here rather than something the test arranges for itself.
 */
function withRecords(snapshot: StoreSnapshot, records: readonly CanonicalRecord[]): StoreSnapshot {
  const fingerprints = new Map(
    snapshot.records.map((record) => [record.id, recordFingerprint(record)]),
  )
  const plan = planAppend(fingerprints, records)
  expect(plan.result.rejected, 'the store refused a lifecycle record').toEqual([])
  return { ...snapshot, records: [...snapshot.records, ...plan.toWrite] }
}

const CLEAR_THE_KITCHEN = 'home/reset-space/place:the-kitchen'

function episodesIn(snapshot: StoreSnapshot, now: Instant) {
  return collectEpisodes(buildView(snapshot, { now, zone: ZONE }), ZONE)
}

// ---------------------------------------------------------------------------

describe('nothing is written until the owner acts', () => {
  it('records no episode merely for having shown one', () => {
    /*
     * D-029's argument, kept after the buttons arrived. A history that grew a
     * row every time a screen rendered would be unreadable within a week, and
     * every one of those rows would be an episode nothing ever happened to.
     */
    const { snapshot, now } = tonight()
    expect(episodesIn(snapshot, now)).toEqual([])
    expect(session(snapshot, now).decision().evaluation?.candidate.id).toBe(CLEAR_THE_KITCHEN)
  })

  it('writes the offering and the event together on the first tap', () => {
    const { snapshot, now } = tonight()
    const started = session(snapshot, now).tap('start')

    const episodes = episodesIn(started.snapshot, now)
    expect(episodes).toHaveLength(1)
    expect(episodes[0]?.state).toBe('started')
    // And what the app could see at the time, kept for later comparison.
    expect(episodes[0]?.context?.block).toBe('evening')
    expect(episodes[0]?.context?.usableMinutes).toBe(60)
    expect(episodes[0]?.context?.strain).toBe('none')
  })

  it('fabricates no start for a move the owner simply reports as done', () => {
    // Tapping "Done" without having tapped "Start" is an ordinary evening. A
    // start record for something that never happened would be a lie in history.
    const { snapshot, now } = tonight()
    const done = session(snapshot, now).tap('complete')

    const episodes = episodesIn(done.snapshot, now)
    expect(episodes[0]?.state).toBe('completed')
    expect(episodes[0]?.startedAt).toBeUndefined()
    expect(done.snapshot.records.some((record) => record.kind === 'action-start')).toBe(false)
  })
})

describe('a double tap creates no duplicate episode', () => {
  /*
   * Section 60 lists this by name among the failures carried forward: "double
   * taps must not create duplicate episodes/actions".
   *
   * Three things stop it, and the order matters. The episode is identified by
   * what it is about rather than by the record that created it, so two records
   * fold into one episode — that alone makes a duplicate episode unrepresentable.
   * The recommendation carries an id derived from the episode key, so the second
   * tap writes a byte-identical row the store already knows to skip. And the
   * state machine refuses a transition to a state the episode is already in, so
   * the second event is not planned at all once the first is visible.
   */
  it('folds two simultaneous taps into one episode', () => {
    const { snapshot, now } = tonight()
    const tapped = session(snapshot, now).doubleTap('start')

    expect(episodesIn(tapped.snapshot, now)).toHaveLength(1)
    expect(episodesIn(tapped.snapshot, now)[0]?.state).toBe('started')
  })

  it('writes the offering exactly once', () => {
    const { snapshot, now } = tonight()
    const tapped = session(snapshot, now).doubleTap('start')

    const offerings = tapped.snapshot.records.filter(
      (record) => record.kind === 'action-recommendation',
    )
    expect(offerings).toHaveLength(1)
  })

  it('plans nothing at all once the first tap is visible', () => {
    // The slower double tap: the view has caught up, and the state machine is
    // what refuses. `noChange` is a note, not an error — the event is already
    // recorded, which is what the owner wanted.
    const { snapshot, now } = tonight()
    const started = session(snapshot, now).tap('start')
    const current = started.decision()

    const again = planLifecycle({
      view: buildView(started.snapshot, { now, zone: ZONE }),
      situation: current.situation,
      semantics: current.evaluation!.candidate.semantics,
      action: 'start',
      recordedAt: instant(now + 300_000),
    })

    expect(again.records).toEqual([])
    expect(again.noChange).toBe('already started')
  })

  it('holds for every action, not only start', () => {
    for (const action of ['start', 'complete', 'decline', 'unable-now', 'try-another'] as const) {
      const { snapshot, now } = tonight()
      const tapped = session(snapshot, now).doubleTap(action)
      expect(episodesIn(tapped.snapshot, now), action).toHaveLength(1)
    }
  })
})

describe('the states the owner can actually be in', () => {
  it('lets a decline be followed by doing it anyway', () => {
    // Saying "not tonight" and then doing it is an ordinary evening. An app
    // that refused to record the second half would be wrong about the owner's
    // life in order to be tidy about its own state machine.
    const { snapshot, now } = tonight()
    const start = session(snapshot, now)
    const kitchen = start.card()
    const changed = start.tap('decline').tapOnCard(kitchen, 'complete')

    const episodes = episodesIn(changed.snapshot, now)
    expect(episodes).toHaveLength(1)
    expect(episodes[0]?.state).toBe('completed')
  })

  it('treats an inability as something that can pass', () => {
    const { snapshot, now } = tonight()
    const start = session(snapshot, now)
    const kitchen = start.card()
    const later = start.tap('unable-now').tapOnCard(kitchen, 'start')
    expect(episodesIn(later.snapshot, now)[0]?.state).toBe('started')
  })

  it('makes done the end of it', () => {
    const { snapshot, now } = tonight()
    const done = session(snapshot, now).tap('complete')
    expect(availableActions('completed')).toEqual([])

    const current = done.decision()
    // The move is settled, so the engine has moved on and there is nothing of
    // this shape left to tap. That is the recomputation, not an absence.
    expect(current.evaluation?.candidate.id).not.toBe(CLEAR_THE_KITCHEN)
  })

  it('offers only the transitions that make sense from here', () => {
    expect(availableActions('shown')).toContain('start')
    expect(availableActions('started')).not.toContain('start')
    expect(availableActions('started')).toContain('complete')
    expect(availableActions('declined')).toContain('complete')
  })
})

describe('every event recomputes the decision', () => {
  it('moves on to the next best move when one is declined', () => {
    const { snapshot, now } = tonight()
    const before = session(snapshot, now)
    expect(before.decision().evaluation?.candidate.id).toBe(CLEAR_THE_KITCHEN)

    const after = before.tap('decline')
    expect(after.decision().evaluation?.candidate.id).not.toBe(CLEAR_THE_KITCHEN)
    expect(after.decision().kind).toBe('move')
  })

  it('records asking for something else as a request, not a refusal', () => {
    const { snapshot, now } = tonight()
    const another = session(snapshot, now).tap('try-another')

    const episode = episodesIn(another.snapshot, now)[0]
    expect(episode?.state).toBe('declined')
    expect(episode?.wantedAnother).toBe(true)
    expect(episode?.declineReason).toBe(WANTED_SOMETHING_ELSE)
    // And something else is on offer, which is the point of the button.
    expect(another.decision().evaluation?.candidate.id).not.toBe(CLEAR_THE_KITCHEN)
  })

  it('leaves a started move on screen with its state showing', () => {
    const { snapshot, now } = tonight()
    const started = session(snapshot, now).tap('start')
    const current = started.decision()

    expect(current.evaluation?.candidate.id).toBe(CLEAR_THE_KITCHEN)
    expect(current.state).toBe('started')
  })
})

// ---------------------------------------------------------------------------
// Outcome windows
// ---------------------------------------------------------------------------

describe('a result is asked for when there is one to give', () => {
  function completed(at = '19:30') {
    const { snapshot, now } = tonight(at)
    const done = session(snapshot, now).tap('complete')
    const view = buildView(done.snapshot, { now, zone: ZONE })
    const episode = collectEpisodes(view, ZONE)[0]
    expect(episode).toBeDefined()
    return { snapshot: done.snapshot, now, view, episode: episode! }
  }

  it('is not due the moment the move is finished', () => {
    const { episode, now, view } = completed()
    const window = outcomeWindowFor(episode, ZONE)
    expect(window).toBeDefined()
    expect(window!.earliest).toBeGreaterThan(now)
    expect(
      dueOutcomes(view, { now, zone: ZONE }, view.entities).map(
        (entry) => entry.episode.recommendation,
      ),
    ).toEqual([])
  })

  it('is due once enough time has passed', () => {
    const { episode, snapshot, now } = completed()
    const window = outcomeWindowFor(episode, ZONE)!
    const later = instant(window.earliest + 60_000)
    const view = buildView(snapshot, { now: later, zone: ZONE })

    const due = dueOutcomes(view, { now: later, zone: ZONE }, view.entities)
    expect(due).toHaveLength(1)
    expect(due[0]?.episode.recommendation).toBe(episode.recommendation)
    expect(now).toBeLessThan(later)
  })

  it('closes rather than asking about something too old to remember', () => {
    const { episode, snapshot } = completed()
    const window = outcomeWindowFor(episode, ZONE)!
    const muchLater = instant(window.latest + 60_000)
    const view = buildView(snapshot, { now: muchLater, zone: ZONE })

    expect(dueOutcomes(view, { now: muchLater, zone: ZONE }, view.entities)).toEqual([])
  })

  it('waits for the morning on a move that can only be judged then', () => {
    /*
     * Section 20: "sleep/recovery actions may need next-morning evaluation."
     * Asking at 23:05 whether an early night worked would collect an answer
     * about intent, and an answer about intent recorded as an outcome is worse
     * than no answer at all — it looks exactly like evidence.
     */
    const kit = createKit('LN', 'America/Denver', '2026-04-01T12:00:00Z')
    const finishedAt = kit.local('2026-05-19', '22:30')
    const episode = {
      recommendation: 'X' as RecordId,
      semantics: {
        subject: entityRef('life-domain', 'sleep'),
        domain: DOMAIN.sleep,
        target: { verb: 'protect-sleep' as const, object: entityRef('routine', 'winding down') },
        whyNow: { trigger: 'deficit' as const, summary: '', evidence: [] },
        evidence: [],
      },
      context: undefined,
      dayId: kit.local('2026-05-19', '00:00') as never,
      shownAt: finishedAt,
      state: 'completed' as const,
      startedAt: undefined,
      settledAt: finishedAt,
      declineReason: undefined,
      blocker: undefined,
      outcomes: [],
      wantedAnother: false,
    }

    const window = outcomeWindowFor(episode, ZONE)!
    expect(window.earliest).toBe(kit.local('2026-05-20', '05:00'))
    expect(window.earliest).toBeGreaterThan(finishedAt + 6 * 3_600_000)
  })

  it('judges a late-night wind-down by the morning it led to', () => {
    // Finishing at half past midnight is finishing last night, so the morning
    // that judges it is this one rather than tomorrow's.
    const kit = createKit('LN', 'America/Denver', '2026-04-01T12:00:00Z')
    const finishedAt = kit.local('2026-05-20', '00:30')
    const window = outcomeWindowFor(
      {
        recommendation: 'X' as RecordId,
        semantics: {
          subject: entityRef('life-domain', 'sleep'),
          domain: DOMAIN.sleep,
          target: { verb: 'wind-down' as const, object: entityRef('routine', 'winding down') },
          whyNow: { trigger: 'deficit' as const, summary: '', evidence: [] },
          evidence: [],
        },
        context: undefined,
        dayId: 'x' as never,
        shownAt: finishedAt,
        state: 'completed',
        startedAt: undefined,
        settledAt: finishedAt,
        declineReason: undefined,
        blocker: undefined,
        outcomes: [],
        wantedAnother: false,
      },
      ZONE,
    )!

    expect(window.earliest).toBe(kit.local('2026-05-20', '05:00'))
  })

  it('tells a surface when to wake up, without reading a clock to do it', () => {
    const { episode, snapshot, now } = completed()
    const view = buildView(snapshot, { now, zone: ZONE })
    const when = nextOutcomeDueAt(view, { now, zone: ZONE }, view.entities)

    expect(when).toBe(outcomeWindowFor(episode, ZONE)?.earliest)
    expect(when).toBeGreaterThan(now)
  })

  it('asks nothing about a move that was declined', () => {
    const { snapshot, now } = tonight()
    const passed = session(snapshot, now).tap('decline')
    const view = buildView(passed.snapshot, { now: instant(now + 7_200_000), zone: ZONE })
    expect(dueOutcomes(view, { now: instant(now + 7_200_000), zone: ZONE }, view.entities)).toEqual(
      [],
    )
  })
})

describe('the semantic subject survives through the follow-up', () => {
  /*
   * The gate item, and G-001's rule reaching one screen further than it did.
   * The question is the renderer's own follow-up, composed from the same
   * structure that produced the recommendation — so it cannot lose the noun
   * without the recommendation losing it too.
   */
  it('names the kitchen in the question about the kitchen', () => {
    const { snapshot, now } = tonight()
    const done = session(snapshot, now).tap('complete')
    const later = instant(now + 3 * 3_600_000)
    const view = buildView(done.snapshot, { now: later, zone: ZONE })

    const pending = nextDueOutcome(view, { now: later, zone: ZONE }, view.entities)
    expect(pending).toBeDefined()
    // The direct result, asked as a graded question because it has graded
    // answers. "Did the kitchen get cleared?" against four levels of difference
    // was DEF-0020.
    expect(pending?.questions[0]?.aspect).toBe('result')
    expect(pending?.questions[0]?.prompt).toBe('How much of the kitchen got cleared?')
  })

  it('records the answer against the move it was about', () => {
    const { snapshot, now } = tonight()
    const done = session(snapshot, now).tap('complete')
    const later = instant(now + 3 * 3_600_000)
    let view = buildView(done.snapshot, { now: later, zone: ZONE })

    const pending = nextDueOutcome(view, { now: later, zone: ZONE }, view.entities)!
    const question = pending.questions[0]!
    const record = outcomeRecord(pending.episode, question.aspect, question.answers[0]!, {
      now: later,
      zone: ZONE,
    })

    const after = withRecords(done.snapshot, [record])
    view = buildView(after, { now: later, zone: ZONE })
    const episode = collectEpisodes(view, ZONE)[0]!

    expect(episode.outcomes).toHaveLength(1)
    expect(episode.outcomes[0]?.about).toBe(episode.recommendation)
    expect(episode.outcomes[0]?.aspect).toBe('result')
    // A result carries no sentiment. Only an effect answer does.
    expect(episode.outcomes[0]?.sentiment).toBeUndefined()
    expect(answeredAspects(episode).has('result')).toBe(true)

    // Answering "Completely" leaves the effect question, which is the second
    // thing this move has to say and a different fact from the first.
    const left = dueOutcomes(view, { now: later, zone: ZONE }, view.entities)
    expect(left[0]?.questions.map((question) => question.aspect)).toEqual(['effect'])
  })

  it('asks the effect once the result says the move landed', () => {
    const { snapshot, now } = tonight()
    const done = session(snapshot, now).tap('complete')
    const later = instant(now + 3 * 3_600_000)
    const view = buildView(done.snapshot, { now: later, zone: ZONE })

    const pending = nextDueOutcome(view, { now: later, zone: ZONE }, view.entities)!
    expect(pending.questions.map((question) => question.aspect)).toEqual(['result', 'effect'])
  })

  it('asks no effect question when the result says it never landed', () => {
    /*
     * The short-circuit, and it is not a nicety. "How much did clearing the
     * kitchen do for the evening?" on an evening when the kitchen was never
     * cleared has no honest answer, and whichever one the owner picked would be
     * recorded as evidence about clearing kitchens. It also saves a tap on the
     * evening they least want to be asked twice.
     */
    const { snapshot, now } = tonight()
    const done = session(snapshot, now).tap('complete')
    const later = instant(now + 3 * 3_600_000)
    let view = buildView(done.snapshot, { now: later, zone: ZONE })

    const pending = nextDueOutcome(view, { now: later, zone: ZONE }, view.entities)!
    const result = pending.questions[0]!
    const notAtAll = result.answers[result.answers.length - 1]!
    expect(notAtAll.label).toBe('Not at all')

    const after = withRecords(done.snapshot, [
      outcomeRecord(pending.episode, result.aspect, notAtAll, { now: later, zone: ZONE }),
    ])
    view = buildView(after, { now: later, zone: ZONE })

    expect(dueOutcomes(view, { now: later, zone: ZONE }, view.entities)).toEqual([])

    // And the effect belief learned nothing from an evening that never happened.
    const decision = decide(view, { now: later, zone: ZONE })
    const learned = decision.trace.learning.find((row) => row.verb === 'reset-space')
    expect(learned?.samples ?? 0).toBe(0)
  })

  it('asks how it felt as well, but only where feeling is the point', () => {
    // Section 10 and G-004: comfort and result both, for a social move. Nothing
    // else gets a second question — two taps is the most a follow-up may cost.
    const kit = createKit('LS', 'America/Denver', '2026-04-01T12:00:00Z')
    const gym = entityRef('place', 'the gym')
    const episode = {
      recommendation: 'X' as RecordId,
      semantics: {
        subject: gym,
        domain: DOMAIN.social,
        target: { verb: 'start-conversation' as const, object: gym },
        whyNow: { trigger: 'good-conditions' as const, summary: '', evidence: [] },
        evidence: [],
      },
      context: undefined,
      dayId: 'x' as never,
      shownAt: kit.local('2026-05-19', '18:00'),
      state: 'completed' as const,
      startedAt: undefined,
      settledAt: kit.local('2026-05-19', '18:00'),
      declineReason: undefined,
      blocker: undefined,
      outcomes: [],
      wantedAnother: false,
    }

    const entities = buildView(
      snapshotFromWire(
        kit.document({
          entities: [
            kit.entity({
              kind: 'place',
              label: 'the gym',
              domain: DOMAIN.social,
              privacy: 'normal',
            }),
          ],
          records: [],
          exportedAt: kit.local('2026-05-19', '20:00'),
        }),
      ).snapshot,
      { now: kit.local('2026-05-19', '20:00'), zone: ZONE },
    ).entities

    const questions = outcomeQuestionsFor(episode, entities)
    expect(questions.map((question) => question.aspect)).toEqual(['result', 'comfort'])
    expect(questions[0]?.prompt).toBe('How much of a conversation happened at the gym?')
    expect(questions[1]?.prompt).toBe('How did starting a conversation at the gym feel?')
    /*
     * Neither carries a sentiment. Only an effect answer does, and this move
     * has no effect aspect — whether the evening lifted afterwards is a third
     * question nobody is being asked, because two taps is the most a follow-up
     * may cost (section 4.5).
     */
    for (const question of questions) {
      expect(question.answers.every((answer) => answer.sentiment === undefined)).toBe(true)
    }
  })
})
