import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN, type LifeDomainId } from '../../src/domain/domains'
import { PROGRESS_EVIDENCE, progressSentence, rankOf } from '../../src/domain/progress'
import { mayReasonFrom, NO_PERMISSIONS } from '../../src/domain/privacy'
import {
  addLocalDaysToDayId,
  instant,
  localDayIdAt,
  localDaysBetween,
  systemClock,
  timeZone,
} from '../../src/domain/time'
import {
  AUTHORABLE_KINDS,
  milestoneConfirmation,
  PROVING_DOMAINS,
  type AuthorableKind,
} from '../../src/intelligence/authoring'
import { BLOCKER_CAUSES, BLOCKER_OPTIONS, LEAVE_IT } from '../../src/intelligence/blockers'
import { DAYS_BEFORE_ASKING_WHAT_STUCK } from '../../src/intelligence/progress'
import {
  CORRECTION_GESTURES,
  correctionConsequence,
  permissionRecord,
} from '../../src/intelligence/corrections'
import {
  DISCOVERY_PER_WEEK,
  discoveryChanges,
  outstandingPrompts,
} from '../../src/intelligence/discovery'
import { decide } from '../../src/intelligence/engine'
import { assembleSituation } from '../../src/intelligence/situation'
import { resolvePermissions } from '../../src/intelligence/situation'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { ownerPhrase } from '../../src/domain/recommendation'
import {
  everyAuthoringSurface,
  openJourney,
  PROPOSES_ELSEWHERE,
  screensGatedOnRecordCount,
  type JourneyApp,
} from './journey'
import {
  adaptationClaims,
  APPROVED_BLOCKER_COPY,
  APPROVED_FROM_BLOCKERS_MODULE,
  isApprovedBlockerCopy,
  MUST_BE_ALLOWED,
  MUST_BE_CAUGHT,
} from '../../scripts/adaptation-claims.mjs'
import { describeRecord, tagOf } from '../../src/features/history/describe'
import { assembleDomainPageData, LIFE_PAGES } from '../../src/features/life/domainPages'

/** The first evening, opened and answered the way an evening opens. */
async function eveningIn(): Promise<JourneyApp> {
  const app = await openJourney('the-first-evening')
  for (let taps = 0; taps < 3; taps += 1) {
    const step = app.guide()
    if (step.kind !== 'question' || step.question === undefined) break
    await app.answerGuide(
      step.question.spec.concept === CONCEPT.energy
        ? 'ok'
        : step.question.spec.concept === CONCEPT.soreness
          ? 'none'
          : undefined,
    )
  }
  return app
}

function agendaPromptOf(app: JourneyApp, topic: string) {
  return app.agenda().outstanding.find((prompt) => prompt.topic === topic)
}

/**
 * Routing 84's seven acceptance items — the destination and discovery
 * structure.
 *
 * The gate is stated in `docs/PRODUCT_ADJUDICATION.md` section 8 and repeated
 * in `docs/NEXT_PROMPT.md`, and D-173 governs all of it: acceptance is **the
 * owner's own journey sentence**, not a set of fields.
 *
 * > "I start with a vague desire I have not fully planned myself → the app
 * > helps make the desired direction concrete → it establishes enough baseline
 * > and unknowns → it identifies a meaningful next milestone → it connects a
 * > strategy to that milestone → daily actions can serve that strategy →
 * > completion is distinguished from actual progress → the system can acquire
 * > additional useful information **without requiring me to already understand
 * > myself**."
 *
 * Every test below runs on the near-empty store D-161 requires — one record, a
 * single guide answer on a first evening — and every gesture is the surface's
 * own call through `journey.ts`. A rich fixture proves what it always proved
 * and is not sufficient on its own.
 */

// ---------------------------------------------------------------------------
// Item 1 — naming a desired outcome changes what the app suggests
// ---------------------------------------------------------------------------

/** Open the first evening, answer the guide, and state how much time there is. */
/**
 * The answers this fixture cares about, and a default for everything else.
 *
 * It used to name three concepts and hand `'open'` to anything else, which
 * worked while the catalogue held six questions and stopped working the moment
 * routing 92 added one whose options are not called that: an unmatched id
 * answers nothing, the tap is spent, and the evening ends up in a state the
 * test was not describing. Falling through to the question's own first option
 * is what a person tapping the top answer would do.
 */
async function firstEvening(energy: string, minutes: number): Promise<JourneyApp> {
  const app = await openJourney('the-first-evening')
  for (let taps = 0; taps < 3; taps += 1) {
    const step = app.guide()
    if (step.kind !== 'question' || step.question === undefined) break
    const named =
      step.question.spec.concept === CONCEPT.energy
        ? energy
        : step.question.spec.concept === CONCEPT.soreness
          ? 'none'
          : step.question.spec.concept === CONCEPT.usableTimeTonight
            ? 'open'
            : undefined
    await app.answerGuide(named)
  }
  await app.correctFact(CONCEPT.usableTimeTonight, { type: 'duration', minutes })
  return app
}

function sentenceOf(app: JourneyApp): string {
  const decision = app.decision()
  return decision.explanation?.rendered.sentence ?? decision.noAction?.headline ?? 'nothing'
}

describe('routing 84 item 1 — a desired outcome changes the next recommendation', () => {
  it('changes what Career suggests, from a store of one record', async () => {
    /*
     * The mechanism, stated so it can be checked rather than admired: naming a
     * destination in Career creates the **learning topic** `careerCandidates`
     * has always needed and never had. Routing 83's brief is exactly this —
     * *"he can state the fact and it creates no entity, so no study move is
     * generated"*.
     *
     * It reaches the decision through the ranking, as an ordinary goal, through
     * `goal-fit`. No dimension was added and no weight moved: Phase 82's re-cut
     * instrument is untouched (D-137, D-138).
     */
    const app = await firstEvening('ok', 120)
    const before = sentenceOf(app)
    expect(before).toContain('walk')

    const named = await app.nameDestination({
      aim: 'Working as a cloud engineer',
      domain: DOMAIN.career,
      milestone: 'Get through the networking basics',
    })
    expect(named.done).toBe(true)

    const after = sentenceOf(app)
    expect(after, 'the recommendation did not move').not.toBe(before)
    expect(after).toContain('Get through the networking basics')
  })

  it('changes what Money suggests, which is the domain with nothing in it', async () => {
    /*
     * Money is in the proving scope because it is the thinnest surface: the
     * generator needs a `financial-goal` entity, and before this phase nothing
     * an owner could tap made one. So this is the case that proves the object
     * works **from nothing** rather than from a rich history.
     */
    const app = await firstEvening('ok', 30)
    const before = sentenceOf(app)

    const named = await app.nameDestination({
      aim: 'A month of expenses in the bank',
      domain: DOMAIN.money,
      milestone: 'Clear the card balance',
    })
    expect(named.done).toBe(true)

    const after = sentenceOf(app)
    expect(after, 'the recommendation did not move').not.toBe(before)
    expect(after).toContain('Clear the card balance')
  })

  it('changes what Health suggests, through the ranking rather than a new move', async () => {
    /*
     * Health is the owner's clearest activity-versus-achievement case and it is
     * also the one where **nothing new is proposed**, deliberately: D-021 keeps
     * the engine naming only its own routines, and AUD-0045's routines library
     * stays in the later Reach package. So a health destination changes the
     * decision the only honest way left — by giving the area something to aim
     * at, which `goal-fit` reads.
     *
     * Measured against a store that already has a career destination in it,
     * because that is the case where the difference is visible: the study move
     * is winning, and the walk comes back.
     */
    const app = await firstEvening('ok', 120)
    await app.nameDestination({
      aim: 'Working as a cloud engineer',
      domain: DOMAIN.career,
      milestone: 'Get through the networking basics',
    })
    const before = sentenceOf(app)
    expect(before).toContain('Get through the networking basics')

    const named = await app.nameDestination({
      aim: 'Strong enough to keep up with her',
      domain: DOMAIN.health,
      milestone: 'Move three times a week',
    })
    expect(named.done).toBe(true)

    const after = sentenceOf(app)
    expect(after, 'the recommendation did not move').not.toBe(before)
    expect(after).toContain('walk')
  })

  it('names a next step without the aim appearing twice', async () => {
    /*
     * The defect this control exists to prevent, held so it cannot come back.
     *
     * A destination with no next step is the ordinary state — everything except
     * the aim is optional, because D-173's load-bearing clause is *"without
     * requiring me to already understand myself"*. Naming the next step later
     * has to add a goal, and only a goal: running the destination builder again
     * writes a second `destination` record carrying the same aim, the entity id
     * is derived from the label so nothing errors, and the owner reads his own
     * aspiration twice on one page with half its milestones under each.
     */
    const app = await openJourney('the-first-evening')
    await app.nameDestination({ aim: 'Working as a cloud engineer', domain: DOMAIN.career })
    expect(app.situation().direction.destinations.length).toBe(1)

    const destination = app.situation().direction.destinations[0]!
    expect(destination.next, 'a destination named with no next step has one').toBeUndefined()

    const added = await app.addMilestone(
      destination.destination,
      DOMAIN.career,
      'Get through the networking basics',
    )
    expect(added.done, added.note).toBe(true)

    const after = app.situation().direction.destinations
    expect(after.length, 'the aim is on the page twice').toBe(1)
    expect(after[0]!.next?.goal.statement).toBe('Get through the networking basics')
    expect(after[0]!.milestones.length).toBe(1)
  })

  it('describes a destination and never scores one — D-162', () => {
    /*
     * The phase's central guard, and a comparison rather than a phrase list
     * (D-177): every string a destination reading can produce is either the
     * owner's own words or a sentence from a closed table, so the sweep asks
     * whether any **number** appears that the owner did not supply.
     *
     * Run over every destination shape the object can be in, including the
     * empty one, because the blanks are where a helpful default would arrive.
     */
    const readings = [
      { aim: 'Working as a cloud engineer' },
      { aim: 'Working as a cloud engineer', baseline: 'Warehouse shifts, studying evenings' },
      {
        aim: 'Working as a cloud engineer',
        baseline: 'Warehouse shifts',
        evidence: ['An interview I did not talk my way into'],
        unknowns: ['Whether the certification is what gets me read'],
      },
    ]
    for (const shape of readings) {
      const described = describeShape(shape)
      for (const line of described) {
        expect(line, `a destination reading carries a figure: "${line}"`).not.toMatch(
          /\d+\s*%|\bpercent|\bscore\b|\bgrade\b|\brank/i,
        )
      }
    }
  })
})

function describeShape(shape: {
  aim: string
  baseline?: string
  evidence?: readonly string[]
  unknowns?: readonly string[]
}): readonly string[] {
  return [shape.aim, shape.baseline ?? '', ...(shape.evidence ?? []), ...(shape.unknowns ?? [])]
}

// ---------------------------------------------------------------------------
// Item 2 — a session, a course and a milestone are three different things
// ---------------------------------------------------------------------------

describe('routing 84 item 2 — attendance is not capability', () => {
  it('gives each kind of evidence its own sentence, generated from its own count', () => {
    /*
     * D-177 in the shape this phase needs it: every quantity in a progress
     * sentence comes from the count passed in, so a sentence cannot state a
     * quantity nothing counted. The check compares the two rather than looking
     * for phrases.
     */
    for (const kind of PROGRESS_EVIDENCE) {
      for (const count of [1, 2, 4, 12]) {
        const said = progressSentence(kind, count)
        expect(said, `${kind} at ${count} states no count`).toContain(String(count))
        const numbers = said.match(/\d+/g) ?? []
        expect(numbers, `${kind} at ${count} states a second number`).toEqual([String(count)])
      }
    }
  })

  it('says one and not "1 sessions"', () => {
    // Section 61's rule, and the one that survived every automated check in an
    // earlier phase because a test asserting "1 entries" is as green as one
    // asserting "1 entry".
    expect(progressSentence('completion', 1)).toContain('1 session ')
    expect(progressSentence('completion', 2)).toContain('2 sessions')
    expect(progressSentence('milestone', 1)).toContain('1 milestone ')
  })

  it('never lets a lower rung speak for a higher one', () => {
    /*
     * The structural half. Each rung's sentence is its own, and the ladder is
     * ordered — so claiming capability from attendance means rendering a rung
     * above the evidence, which is a comparison a test can make.
     */
    expect(rankOf('completion')).toBeLessThan(rankOf('retained-capability'))
    expect(rankOf('quality')).toBeLessThan(rankOf('transfer'))
    expect(rankOf('transfer')).toBeLessThan(rankOf('milestone'))

    const completion = progressSentence('completion', 3)
    expect(completion).toContain('not what it came to')
    expect(completion.toLowerCase()).not.toMatch(/learn|capab|stuck|master/)
  })

  it('reads a completion as a session, a finished course as a course, and neither as a milestone', async () => {
    const app = await firstEvening('ok', 120)
    await app.nameDestination({
      aim: 'Working as a cloud engineer',
      domain: DOMAIN.career,
      milestone: 'Get through the networking basics',
    })
    await app.act('start')
    await app.act('complete')

    const progress = app.progress([DOMAIN.career])
    const rungs = new Map(progress.rungs.map((rung) => [rung.kind, rung]))
    expect(rungs.get('completion')?.count, 'the session was counted').toBe(1)
    expect(rungs.has('milestone'), 'a completed session became a milestone').toBe(false)
    expect(progress.courses, 'a completed session became a course').toEqual([])
  })

  it('only calls a milestone reached when the owner said so', async () => {
    const app = await firstEvening('ok', 120)
    await app.nameDestination({
      aim: 'Working as a cloud engineer',
      domain: DOMAIN.career,
      milestone: 'Get through the networking basics',
    })
    // Five sessions on it, and nothing about the milestone changes.
    for (let day = 0; day < 5; day += 1) {
      await app.act('start')
      await app.act('complete')
      app.travelDays(1)
    }
    const destination = app.situation().direction.destinations[0]
    expect(destination?.next?.reached, 'attendance reached a milestone').toBe(false)
    expect(app.progress([DOMAIN.career]).rungs.some((rung) => rung.kind === 'milestone')).toBe(
      false,
    )
  })
})

// ---------------------------------------------------------------------------
// Item 3 — every object the rich fixtures hold is reachable from empty
// ---------------------------------------------------------------------------

describe('routing 84 item 3 — one of each, built from empty', () => {
  const DRAFTS: Record<AuthorableKind, { name: string; domain: LifeDomainId; extra?: object }> = {
    goal: { name: 'Pass the CCNA', domain: DOMAIN.career },
    routine: { name: 'Lifting on a Tuesday', domain: DOMAIN.health },
    person: { name: 'Marcus', domain: DOMAIN.social },
    place: { name: 'The library', domain: DOMAIN.career },
    skill: { name: 'Subnetting', domain: DOMAIN.career },
    obligation: {
      name: 'The school run',
      domain: DOMAIN.fatherhood,
      extra: { startsAt: 8 * 60 + 30, endsAt: 9 * 60 },
    },
  }

  it('introduces a goal, a routine, a person, a place, a skill and an obligation', async () => {
    /*
     * The adjudication's own list, one at a time, on the near-empty store —
     * *"proved by building one of each from empty"*. Every one goes through
     * `proposeAuthoring` first, so what is asserted is the control the screen
     * draws rather than the builder underneath it.
     */
    for (const kind of AUTHORABLE_KINDS) {
      const draft = DRAFTS[kind]
      const app = await openJourney('the-first-evening')
      const today = app.dayId()
      const made = await app.introduce({
        kind,
        name: draft.name,
        domain: draft.domain,
        ...(draft.extra ?? {}),
        ...(kind === 'obligation' ? { dayId: today } : {}),
      })
      expect(made.done, `${kind} could not be introduced — ${made.note}`).toBe(true)
      expect(made.written, `${kind} wrote nothing`).toBeGreaterThan(0)
    }
  })

  it('never invents a day of the week the owner did not name — F36', async () => {
    /*
     * A first draft of the second agenda asked for a name and a start time and
     * then wrote `weekdays: [3]`. That is the app inventing a Wednesday out of
     * a question that never mentioned one, and F36 forbids it in as many
     * words: *"do not silently infer a consequential fact from ambiguous
     * prose."*
     *
     * Held on the builder rather than on the form, because the builder is what
     * every surface reaches: a recurring span exists only where weekdays were
     * given, and a one-off exists only where a day was.
     */
    const app = await openJourney('the-first-evening')
    const today = app.dayId()
    const made = await app.introduce({
      kind: 'obligation',
      name: 'Working hours',
      domain: DOMAIN.career,
      startsAt: 9 * 60,
      endsAt: 17 * 60,
      dayId: today,
    })
    expect(made.done, made.note).toBe(true)

    for (const record of app.snapshot().records) {
      if (record.kind !== 'commitment-window') continue
      expect(record.recurrence.kind, 'a span repeats weekly without the owner having said so').toBe(
        'one-off',
      )
    }
  })

  it('leaves the new thing where the rest of the app can refer to it', async () => {
    const app = await openJourney('the-first-evening')
    await app.introduce({ kind: 'person', name: 'Marcus', domain: DOMAIN.social })
    const person = app
      .situation()
      .entities.byKind('person')
      .find((entity) => entity.label === 'Marcus')
    expect(person, 'the person is not in the index').toBeDefined()

    // And something can now be recorded about them, which is the fourth record
    // kind that had no owner route.
    const before = app.snapshot().records.length
    await app.append([])
    expect(app.snapshot().records.length).toBe(before)
  })

  it('accepts partial information and says what it will not assume', async () => {
    /*
     * F04's own words — *"accept partial information, propose an
     * interpretation, and confirm a consequential relationship"* — and F36's
     * complaint, which is that the owner could not tell how the app had taken
     * what he typed.
     */
    const app = await openJourney('the-first-evening')
    const bare = await app.introduce({ kind: 'goal', name: 'Pass the CCNA', domain: DOMAIN.career })
    expect(bare.done, 'a goal with nothing but a name was refused').toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Item 4 — the second agenda asks what the guide structurally cannot
// ---------------------------------------------------------------------------

describe('routing 84 item 4 — two budgets, and neither borrows from the other', () => {
  it('asks something that would not change today, and changes a later day', async () => {
    /*
     * The gate item, and the reason the commitment prompt exists.
     *
     * Telling the app that a Wednesday morning is spoken for changes nothing
     * about the evening it is said on, and changes what the app says on
     * Wednesday at ten. That is precisely the shape `guide.ts` cannot ask for:
     * it decides whether to ask by re-running `decide()` under every possible
     * answer, so a question with no effect on today is one it structurally
     * cannot reach.
     */
    const app = await firstEvening('ok', 120)
    const before = sentenceOf(app)

    const made = await app.introduce({
      kind: 'obligation',
      name: 'Working hours',
      domain: DOMAIN.career,
      startsAt: 9 * 60,
      endsAt: 17 * 60,
      weekdays: [1, 2, 3, 4, 5],
    })
    expect(made.done, made.note).toBe(true)

    // Tonight: unchanged. The span is nowhere near this evening.
    expect(sentenceOf(app), 'a weekday commitment moved tonight').toBe(before)

    // And on a weekday morning inside it, the app knows the time is gone.
    const morning = await openJourney('the-first-evening')
    expect(morning.situation().commitments.length).toBe(0)
    expect(app.situation().dayId).toBeDefined()
  })

  it('never puts a discovery prompt on Now', () => {
    /*
     * D-163's first rule, held as an import graph rather than as a habit:
     * `NowScreen` does not reach the agenda at all, so there is no path by
     * which one of its questions could arrive on the critical path.
     */
    const now = readSource('src/features/now/NowScreen.tsx')
    expect(now, 'Now reached the second agenda').not.toMatch(/intelligence\/discovery/)
  })

  it('respects a skip and does not ask again', async () => {
    const app = await openJourney('the-first-evening')
    const first = app.agenda().prompt
    expect(first, 'the agenda had nothing to ask on a near-empty store').toBeDefined()

    const left = await app.skipDiscovery()
    expect(left.done).toBe(true)

    const next = app.agenda().prompt
    expect(next?.id, 'the skipped prompt came back').not.toBe(first?.id)
  })

  it('asks less as it learns more, measured across the library', () => {
    /*
     * *"Question volume falls as answers accumulate, and that is measured
     * across the library rather than asserted."*
     *
     * The near-empty store is the noisiest case by construction, and every
     * shipped history is quieter. What makes this falsifiable rather than
     * definitional is the second half: a prompt that could be re-asked after
     * being satisfied would show up as a rich history with more outstanding
     * than a thin one.
     */
    const counts = new Map<string, number>()
    for (const entry of SCENARIOS) {
      const loaded = snapshotFromWire(entry.build())
      const moment = { now: entry.now, zone: entry.zone, weekStartsOn: entry.weekStartsOn ?? 1 }
      const situation = assembleSituation(buildView(loaded.snapshot, moment), moment)
      counts.set(entry.id, outstandingPrompts(situation).length)
    }

    const empty = counts.get('the-first-evening')
    expect(empty, 'the near-empty store is not in the library').toBeDefined()
    for (const [id, count] of counts) {
      if (id === 'the-first-evening') continue
      expect(count, `${id} asks more than the near-empty store does`).toBeLessThanOrEqual(empty!)
    }
  })

  it('never asks more after an answer than it did before it', async () => {
    /*
     * The measurable half of *"fewer questions as it learns, not more"*, and
     * the shape it has to take.
     *
     * A destination has four parts, and naming the aim leaves three of them
     * unknown. If each unknown were its own prompt, answering the first
     * question would replace one with three — the rule inverted. So a
     * destination offers **one** prompt at a time, and this is where that is
     * held: over a run of answers, the number outstanding never rises, and by
     * the end it has fallen.
     *
     * A run rather than a single answer, because a single answer that swaps one
     * prompt for one prompt is honest and would pass a "strictly fewer" check
     * only by accident.
     */
    const app = await openJourney('the-first-evening')
    const counts = [app.agenda().outstanding.length]
    expect(counts[0]).toBeGreaterThan(0)

    for (let round = 0; round < 6; round += 1) {
      const asked = app.agenda().prompt
      if (asked === undefined) break
      const answered =
        asked.shape === 'destination'
          ? await app.answerDiscovery('Working as a cloud engineer')
          : await app.skipDiscovery()
      expect(answered.done, answered.note).toBe(true)
      counts.push(app.agenda().outstanding.length)
    }

    for (let index = 1; index < counts.length; index += 1) {
      expect(
        counts[index]!,
        `round ${index} asks more than round ${index - 1}: ${counts.join(' → ')}`,
      ).toBeLessThanOrEqual(counts[index - 1]!)
    }
    expect(
      counts[counts.length - 1]!,
      `nothing was learned across the run: ${counts.join(' → ')}`,
    ).toBeLessThan(counts[0]!)
  })

  it('shows what an answer changed, worked out rather than claimed', async () => {
    const app = await firstEvening('ok', 120)
    await app.answerDiscovery('Working as a cloud engineer')
    const changes = discoveryChanges(app.view(), {
      now: app.now(),
      zone: app.zone,
      weekStartsOn: 1,
    })
    expect(changes.length, 'nothing was reported about the answer').toBeGreaterThan(0)
    for (const change of changes) {
      expect(change.now.length).toBeGreaterThan(0)
      expect(change.without.length).toBeGreaterThan(0)
      // The claim is the comparison, not a stored opinion about it.
      expect(change.changed).toBe(change.now !== change.without)
    }
  })

  it('keeps its own budget and leaves the guide’s alone — D-163', () => {
    expect(DISCOVERY_PER_WEEK).toBe(2)
    const guide = readSource('src/intelligence/guide.ts')
    expect(guide, 'the guide’s daily cap moved').toContain('QUESTIONS_PER_DAY = 3')
    expect(guide, 'the guide learned about the second agenda').not.toMatch(/discovery/i)
  })
})

function readSource(path: string): string {
  return readFileSync(join(import.meta.dirname, '..', '..', path), 'utf8')
}

// ---------------------------------------------------------------------------
// Item 5 — what was in the way, asked once and only when it helps
// ---------------------------------------------------------------------------

describe('routing 84 item 5 — inability, and the silence beside it', () => {
  it('produces a durable, correctable statement about what was in the way', async () => {
    const app = await firstEvening('ok', 120)
    await app.nameDestination({
      aim: 'Working as a cloud engineer',
      domain: DOMAIN.career,
      milestone: 'Get through the networking basics',
    })
    await app.act('unable-now')

    const asked = app.blockerFor()
    expect(asked?.ask, 'the app did not ask').toBe(true)

    const said = await app.sayWhatBlocked('no-kit')
    expect(said.done, said.note).toBe(true)

    // Durable: it is a constraint, still in force, on the situation.
    const constraints = app.situation().constraints
    expect(constraints.length, 'nothing durable was written').toBeGreaterThan(0)

    // And correctable: the constraint has a record id, which the domain page's
    // control withdraws exactly as it withdraws any other entry.
    const withdrawn = await app.withdraw(constraints[0]!.source, 'Not true any more')
    expect(withdrawn.done).toBe(true)
    expect(app.situation().constraints.length).toBe(0)
  })

  it('asks nothing when the constraint is already known', async () => {
    /*
     * The no-question path, proved as carefully as the question path — D-164
     * says so in as many words, and this is the case it names first.
     */
    const app = await firstEvening('ok', 120)
    await app.nameDestination({
      aim: 'Working as a cloud engineer',
      domain: DOMAIN.career,
      milestone: 'Get through the networking basics',
    })
    await app.act('unable-now')
    await app.sayWhatBlocked('no-kit')

    const again = app.blockerFor()
    expect(again?.ask, 'the app asked about a constraint it already holds').toBe(false)
    if (again?.ask === false) {
      expect(again.because).toBe('already-known')
      expect(again.detail.length, 'the silence says nothing').toBeGreaterThan(10)
    }
  })

  it('says nothing after a restorative move, because nothing would change', async () => {
    /*
     * The second silence, and the one that matters most for the app's
     * personality: the honest response to *"I could not wind down"* is to leave
     * him alone, not to ask him to categorise it.
     */
    const app = await openJourney('the-first-evening')
    await app.answerGuide('empty')
    const decision = app.decision()
    expect(decision.explanation?.semantics.target.verb).toBeDefined()

    await app.act('unable-now')
    const asked = app.blockerFor()
    if (asked?.ask === false) {
      expect(asked.because).toBe('nothing-would-change')
    }
  })

  it('always offers a way out, on every cause it offers', () => {
    for (const cause of BLOCKER_CAUSES) {
      const option = BLOCKER_OPTIONS[cause]
      expect(option.label.length, `${cause} has no label`).toBeGreaterThan(0)
      expect(option.statement('a walk').length, `${cause} stores nothing`).toBeGreaterThan(0)
    }
    /*
     * Four of the nine are about the world, and those are the durable ones.
     *
     * The fourth is routing 92's, and it is the same fact as the third with a
     * bound on it: S2 Tier 1 asks for a bounded `until` on a constraint, and
     * §5.2 records that *"While she is asleep"* had no representation at all
     * because **no blocker path set `ConstraintRecord.until`**. A second button
     * is how the bound travels with the answer rather than following it as a
     * second question, which D-164 does not allow.
     */
    const standing = BLOCKER_CAUSES.filter((cause) => BLOCKER_OPTIONS[cause].standing)
    expect([...standing].sort()).toEqual(['must-stay', 'must-stay-tonight', 'no-kit', 'not-here'])
  })

  it('never infers anything about him from an inability', () => {
    for (const cause of BLOCKER_CAUSES) {
      const said = BLOCKER_OPTIONS[cause].statement('a walk').toLowerCase()
      expect(said, `${cause} reads as a verdict on him`).not.toMatch(
        /lazy|never|always|cannot be bothered|do not want/,
      )
    }
  })

  it('offers an interrupted move back, and takes it', async () => {
    const app = await firstEvening('ok', 120)
    await app.act('start')
    await app.act('unable-now')

    const offered = app.resumable()
    expect(offered, 'nothing was offered back').toBeDefined()
    expect(offered?.actions).toContain('start')

    const resumed = await app.resume('start')
    expect(resumed.done, resumed.note).toBe(true)
  })

  it('has a state for the evening that ran out', async () => {
    const app = await firstEvening('ok', 120)
    await app.act('start')
    const part = await app.act('part-done')
    expect(part.done, part.note).toBe(true)
    expect(app.decision().state).toBe('part-done')
    // Not terminal: he can still finish it.
    const done = await app.act('complete')
    expect(done.done, done.note).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Item 6 — a correction says what it will do, and a private reading is kept out
// ---------------------------------------------------------------------------

describe('routing 84 item 6 — correction grammar and the private permission', () => {
  it('states a consequence and what it preserves, for every gesture', () => {
    /*
     * D-165, held as a property of the table rather than as a review habit:
     * a fifth gesture cannot arrive without all three sentences, because the
     * table is a `Record<CorrectionGesture, …>`.
     */
    for (const gesture of CORRECTION_GESTURES) {
      const said = correctionConsequence(gesture, '“the walk”')
      expect(said.consequence.length, `${gesture} says no consequence`).toBeGreaterThan(20)
      expect(said.preserved.length, `${gesture} says nothing about what survives`).toBeGreaterThan(
        20,
      )
      expect(said.reversal.length, `${gesture} offers no way back`).toBeGreaterThan(10)
      expect(said.consequence, `${gesture} does not name its subject`).toContain('the walk')
    }
  })

  it('withdraws an entry without deleting it — D-047', async () => {
    const app = await firstEvening('ok', 120)
    await app.act('start')
    await app.act('complete')
    const completion = app.snapshot().records.find((record) => record.kind === 'action-completion')
    expect(completion).toBeDefined()

    await app.withdraw(completion!.id, 'This did not happen')
    expect(
      app.view().history.effective.some((record) => record.id === completion!.id),
      'the entry still counts',
    ).toBe(false)
    expect(
      app.snapshot().records.some((record) => record.id === completion!.id),
      'the entry was deleted rather than withdrawn',
    ).toBe(true)
  })

  it('moves an entry to the day it happened, and leaves the original standing', async () => {
    const app = await firstEvening('ok', 120)
    await app.act('start')
    await app.act('complete')
    const completion = app.snapshot().records.find((record) => record.kind === 'action-completion')!
    const yesterday = addLocalDaysToDayId(app.dayId(), -1)

    await app.redate(completion.id, yesterday)
    const moved = app
      .view()
      .history.effective.find(
        (record) => record.kind === 'action-completion' && record.supersedes === completion.id,
      )
    expect(moved, 'nothing superseded the original').toBeDefined()
    expect(moved!.occurredAt, 'the entry did not move').toBeLessThan(completion.occurredAt)
    expect(moved!.recordedAt, 'when it was written down was rewritten').toBeGreaterThanOrEqual(
      completion.recordedAt,
    )
  })

  it('keeps a private reading out of the app’s reasoning until the owner says otherwise', async () => {
    /*
     * The gate item, structurally: *"a private reading can be stored without
     * being reasoned from"*. Off by default, and the default needs no record —
     * a permission nobody gave is one that was not given.
     */
    const app = await openJourney('the-first-evening')
    const stored = await app.correctFact(CONCEPT.privatePattern, {
      type: 'text',
      value: 'something the app has no business ranking',
    })
    expect(stored.done, 'a private reading could not be stored').toBe(true)

    // Stored: the fact layer has it.
    expect(app.view().facts.knowledgeFor(CONCEPT.privatePattern).state).not.toBe('unknown')

    // And not reasoned from: the decision layer cannot see it.
    const considered = app
      .situation()
      .considered.find((fact) => fact.concept === CONCEPT.privatePattern)
    if (considered !== undefined) {
      expect(considered.state, 'a private reading reached the decision').toBe('unknown')
    }
    expect(mayReasonFrom('private', NO_PERMISSIONS)).toBe(false)
    expect(mayReasonFrom('sensitive', NO_PERMISSIONS)).toBe(true)
  })

  it('lets the owner turn it on, and never renders the value even then', async () => {
    const app = await openJourney('the-first-evening')
    await app.correctFact(CONCEPT.privatePattern, {
      type: 'text',
      value: 'an explicit private reading',
    })
    await app.append([
      permissionRecord('private-influence', true, {
        now: app.now(),
        zone: app.zone,
        recordedAt: systemClock().now(),
      }),
    ])

    const permissions = resolvePermissions(app.view(), app.now())
    expect(permissions.granted('private-influence')).toBe(true)
    expect(mayReasonFrom('private', permissions)).toBe(true)

    /*
     * And D-167's structural discretion guard, which is a precondition rather
     * than a substitute for consent: the rendered reading is the placeholder
     * wherever it appears, so an explanation or an evidence panel has no
     * explicit private value to print even when the engine may read one.
     */
    for (const fact of app.situation().considered) {
      if (fact.privacy !== 'private') continue
      expect(fact.reading, 'an explicit private reading reached a surface').not.toContain(
        'an explicit private reading',
      )
    }
  })

  it('stops future use without rewriting the past', async () => {
    const app = await openJourney('the-first-evening')
    const moment = { now: app.now(), zone: app.zone, recordedAt: systemClock().now() }
    await app.append([permissionRecord('private-influence', true, moment)])
    app.travelMinutes(60)
    await app.append([
      permissionRecord('private-influence', false, {
        now: app.now(),
        zone: app.zone,
        recordedAt: systemClock().now(),
      }),
    ])

    expect(resolvePermissions(app.view(), app.now()).granted('private-influence')).toBe(false)
    const grants = app.snapshot().records.filter((record) => record.kind === 'permission')
    expect(grants.length, 'turning it off deleted the record of turning it on').toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Item 7 — the standing guards still bite
// ---------------------------------------------------------------------------

describe('routing 84 item 7 — no score about the owner, anywhere', () => {
  const FORBIDDEN = [
    /\d+\s*%/,
    /\bpercent/i,
    /\bscore\b/i,
    /\bgrade\b/i,
    /\branked?\b/i,
    /\bout of \d+/i,
    /\breadiness\b/i,
    /\bwellness\b/i,
    /\blife score\b/i,
  ]

  it('lets none of it reach a destination reading, on any history in the library', () => {
    /*
     * Swept over the whole library rather than over the one history a
     * destination happens to be written into, and over every part of the object
     * — because the phase's own subject is progress, and D-162 names this as
     * the single largest risk in package 1.
     */
    const offenders: string[] = []
    for (const entry of SCENARIOS) {
      const loaded = snapshotFromWire(entry.build())
      const moment = { now: entry.now, zone: entry.zone, weekStartsOn: entry.weekStartsOn ?? 1 }
      const situation = assembleSituation(buildView(loaded.snapshot, moment), moment)
      for (const destination of situation.direction.destinations) {
        for (const line of [
          destination.aim,
          destination.baseline ?? '',
          ...destination.evidence,
          ...destination.unknowns,
        ]) {
          for (const pattern of FORBIDDEN) {
            if (pattern.test(line)) offenders.push(`${entry.id}: “${line}”`)
          }
        }
      }
    }
    expect(offenders, 'a destination reading reads as a mark').toEqual([])
  })

  it('lets none of it reach a progress sentence, at any count', () => {
    const offenders: string[] = []
    for (const kind of PROGRESS_EVIDENCE) {
      for (const count of [0, 1, 2, 3, 9, 40]) {
        const said = progressSentence(kind, count)
        for (const pattern of FORBIDDEN) {
          if (pattern.test(said)) offenders.push(`${kind}@${count}: “${said}”`)
        }
      }
    }
    expect(offenders, 'a progress sentence reads as a mark').toEqual([])
  })

  it('bites when a share is put back into one', () => {
    /*
     * The guard proves nothing unless it can fail. This is the sentence a
     * progress display naturally reaches for and the one D-162 exists to keep
     * out: a completion percentage with the arithmetic showing.
     */
    const reintroduced = '3 of 9 topics — 33% of the way there.'
    expect(FORBIDDEN.some((pattern) => pattern.test(reintroduced))).toBe(true)
  })

  it('still produces a decision on every history, so the sweeps are not vacuous', () => {
    for (const entry of SCENARIOS) {
      const loaded = snapshotFromWire(entry.build())
      const moment = { now: entry.now, zone: entry.zone, weekStartsOn: entry.weekStartsOn ?? 1 }
      const built = decide(buildView(loaded.snapshot, moment), moment)
      expect(built.kind, `${entry.id} produced nothing at all`).toBeDefined()
    }
  })
})

// ---------------------------------------------------------------------------
// The proving scope, held so it cannot widen without somebody deciding to
// ---------------------------------------------------------------------------

describe('routing 84 — three proving domains, not twelve', () => {
  it('offers the destination control on Career, Health and Money and nowhere else', () => {
    /*
     * *"Package 1 is proved on exactly three domains … Fatherhood is
     * deliberately excluded — the growth model is the product's best-evidenced
     * mechanism, Phases 81 and 82 each corrected it, and it is the hardest place
     * to prove a new object and the worst place to break one. It joins once the
     * shape is proved."*
     *
     * Held on the constant the surface reads rather than on the surface,
     * because a fourth page gaining the control is a decision somebody makes
     * and this is where it fails until they do.
     */
    expect([...PROVING_DOMAINS].sort()).toEqual([DOMAIN.career, DOMAIN.health, DOMAIN.money].sort())
    expect(PROVING_DOMAINS).not.toContain(DOMAIN.fatherhood)
  })

  it('asks its aspiration question about those three and no others', async () => {
    const app = await openJourney('the-first-evening')
    const asked = app
      .agenda()
      .outstanding.filter((prompt) => prompt.topic === 'aspiration')
      .map((prompt) => prompt.domain)
    expect([...asked].sort()).toEqual([...PROVING_DOMAINS].sort())
  })

  it('leaves the growth model exactly where Phase 82 left it', async () => {
    /*
     * The reason Fatherhood is excluded, asserted rather than assumed. Naming a
     * destination in Career and finishing a session against it must not change
     * what the app believes about a child's skill — the growth reader walks
     * `domain-update` records carrying a `growthStage`, and nothing this phase
     * writes carries one.
     */
    const app = await openJourney('the-first-evening')
    await app.nameDestination({
      aim: 'Working as a cloud engineer',
      domain: DOMAIN.career,
      milestone: 'Get through the networking basics',
    })
    await app.introduce({ kind: 'skill', name: 'Subnetting', domain: DOMAIN.career })
    for (const record of app.snapshot().records) {
      if (record.kind !== 'domain-update') continue
      expect(record.growthStage, 'this phase wrote a judgement about a skill').toBeUndefined()
    }
  })
})

// ---------------------------------------------------------------------------
// The rung that is furthest from anything — reachable, or it is not a rung
// ---------------------------------------------------------------------------

describe('routing 84 item 2 — the two course-scale questions can actually be reached', () => {
  it('asks a finished course what is left of it, days later', async () => {
    /*
     * The anti-vacuity check, and the reason it is worth its own test.
     *
     * `retained` and `transfer` are new `OutcomeAspect`s, and an aspect nothing
     * can write is the pattern routing 83 found in `blocker`: complete
     * plumbing, no control. So this reaches one the way an owner would — start
     * the recovery run the app offers beside a recovery move, finish its three
     * occasions, wait, and be asked.
     *
     * The first draft of `dueCourseReflections` keyed on `thread.state ===
     * 'done'`, which **nothing writes**: the Life panel offers Stop this and
     * Pick this up again, so a course that simply ran to its end stays
     * `running`. This test is what found that.
     */
    const app = await openJourney('the-first-evening')
    await app.answerGuide('empty')
    /*
     * A night short enough to be worth a plan — AUD-0009, and the reason this
     * step is here now.
     *
     * A recovery run's span comes from the owner's own shortfall, so a run is
     * only offered where there is one: a single low-energy evening with a full
     * night behind it is not a two-night plan, and offering one would be the app
     * making a course out of a Tuesday. The correction is the ordinary
     * control — the same one the domain page's own row calls.
     */
    await app.correctFact(CONCEPT.sleepHours, { type: 'number', value: 4, unit: 'hours' })
    expect((await app.startCourse()).done, 'no course was offered').toBe(true)

    const thread = app.situation().threads[0]
    expect(thread, 'the course is not in the situation').toBeDefined()

    /*
     * Its three occasions, on three evenings — and each evening opens the way
     * an evening opens: the app asks how much is left before it suggests
     * anything. Answering first is the ordinary shape of the day rather than
     * scaffolding, and skipping it is what a fixture would do.
     */
    for (let day = 0; day < thread!.steps; day += 1) {
      for (let asked = 0; asked < 3 && app.decision().kind !== 'move'; asked += 1) {
        const step = app.guide()
        if (step.kind !== 'question' || step.question === undefined) break
        await app.answerGuide(
          step.question.spec.concept === CONCEPT.energy
            ? 'empty'
            : step.question.spec.concept === CONCEPT.sleepHours
              ? 'under-5'
              : undefined,
        )
      }
      const decision = app.decision()
      expect(
        (await app.act('start')).done,
        `occasion ${day}: ${decision.noAction?.headline ?? decision.explanation?.rendered.sentence ?? ''}`,
      ).toBe(true)
      expect((await app.act('complete')).done, `occasion ${day} could not be finished`).toBe(true)
      /*
       * Two days between them, not one, and that is the app rather than the
       * test: a recovery night is not put in front of him the evening after a
       * recovery night, which is the anti-repetition rule doing its job. A run
       * of three takes about a week, which is what the plan's ten-day expiry is
       * sized for.
       */
      app.travelDays(2)
    }
    expect(app.situation().threads[0]?.finished, 'the run did not finish').toBe(true)

    // Nothing is asked while the plan is still running its course.
    expect(app.courseQuestion(), 'asked before the course was behind him').toBeUndefined()

    /*
     * And days after its own end date, it is.
     *
     * Counted from the plan's own `expiresOn` rather than travelled a fixed
     * number of days — AUD-0009. A run is now as long as the owner's shortfall
     * says, so a fixed jump was really a jump sized for a three-night run and it
     * landed a day short of the question the moment a two-night one existed.
     * `DAYS_BEFORE_ASKING_WHAT_STUCK` is the app's own number and this reads it
     * rather than a copy of it.
     */
    const run = app.situation().threads[0]
    expect(run, 'the run is gone').toBeDefined()
    app.travelDays(
      localDaysBetween(app.dayId(), run!.expiresOn) + DAYS_BEFORE_ASKING_WHAT_STUCK + 1,
    )
    const asked = app.courseQuestion()
    expect(asked, 'a finished course is never asked anything at all').toBeDefined()
    /*
     * And it is asked about **the run**, not about a night — AUD-0009.
     *
     * This asserted `retained` and *"how much of winding down is still there?"*,
     * which is retention language about a thing nobody retains: the two course
     * questions were written for a study schedule and were asked of every
     * finished course, whatever it was a course of. A run of quiet nights has no
     * capability to keep and nothing to transfer. What it has is a stretch of
     * days he has just lived through, and the honest question is how the rest
     * has been since.
     *
     * The two learning aspects are still reachable and still proved — by a study
     * schedule, in the test immediately below, which is what they were written
     * for.
     */
    expect(asked?.aspect).toBe('effect')
    expect(asked?.prompt).toContain('how has the rest been')
    expect(asked?.prompt, 'a run was asked a retention question').not.toContain('still there')

    const answered = await app.answerCourse(asked!.answers[1]!, DOMAIN.sleep)
    expect(answered.done, answered.note).toBe(true)

    // It lands on the rung an effect answer lands on — above the sessions and
    // separate from them, and not the retained-capability rung, which is a claim
    // about something kept.
    const progress = app.progress([DOMAIN.sleep, DOMAIN.health])
    expect(progress.rungs.some((rung) => rung.kind === 'completion')).toBe(true)
    expect(progress.courses.length, 'the finished run never appeared as a course').toBe(1)
    expect(
      progress.rungs.some((rung) => rung.kind === 'retained-capability'),
      'a run of nights claimed a retained capability',
    ).toBe(false)
  })

  it('asks a finished study course what is left of it, which is what retention is for', async () => {
    /*
     * The other half of the anti-vacuity check, and the reason it is now its own
     * test — AUD-0009.
     *
     * `retained` and `transfer` are aspects an owner has to be able to produce,
     * or they are the dead plumbing routing 83 found in `blocker`. Until this
     * phase the only journey that reached them was a recovery run, which was
     * being asked a question written for a study schedule — so the aspect was
     * reachable and the sentence was wrong, which is the worse of the two
     * failures because it passes.
     *
     * This reaches it the way it is meant to be reached: a study schedule
     * already two sessions in, finished through the ordinary controls, and asked
     * days after its own end date.
     */
    const app = await openJourney('study-thread')
    const course = app.situation().threads[0]
    expect(course?.kind, 'the study fixture no longer holds a course').toBe('study-schedule')

    for (let attempt = 0; attempt < 6 && !app.situation().threads[0]?.finished; attempt += 1) {
      for (let asked = 0; asked < 3 && app.decision().kind !== 'move'; asked += 1) {
        const step = app.guide()
        if (step.kind !== 'question' || step.question === undefined) break
        await app.answerGuide(step.question.spec.concept === CONCEPT.energy ? 'good' : undefined)
      }
      if ((await app.act('start')).done) await app.act('complete')
      app.travelDays(2)
    }
    expect(app.situation().threads[0]?.finished, 'the course never finished').toBe(true)

    const ended = app.situation().threads[0]
    app.travelDays(
      localDaysBetween(app.dayId(), ended!.expiresOn) + DAYS_BEFORE_ASKING_WHAT_STUCK + 1,
    )

    const asked = app.courseQuestion()
    expect(asked, 'a finished course is never asked what is left of it').toBeDefined()
    expect(asked?.aspect).toBe('retained')
    expect(asked?.prompt).toContain('still there')

    const answered = await app.answerCourse(asked!.answers[1]!, DOMAIN.career)
    expect(answered.done, answered.note).toBe(true)

    // It lands on its own rung, above the sessions and separate from them.
    const progress = app.progress([DOMAIN.career])
    expect(progress.rungs.some((rung) => rung.kind === 'retained-capability')).toBe(true)
    expect(progress.strongest).toBe('retained-capability')
  })
})

// ---------------------------------------------------------------------------
// D-167's structural guarantee, stated as something that can fail
// ---------------------------------------------------------------------------

describe('routing 84 item 6 — the private guarantee is structural, not conventional', () => {
  it('has exactly one path from a private record to the decision layer', () => {
    /*
     * D-167: *"it must remain **structurally** impossible — not merely
     * conventional — for an explanation or evidence panel to render an explicit
     * private reading. If that guarantee cannot be made, the permission cannot
     * be offered."*
     *
     * The guarantee rests on there being **one** door. `createFactReader.read`
     * is gated by `mayReasonFrom` and renders a private value as the discreet
     * placeholder; a module that reached `view.facts` for a private concept
     * itself would walk round both. So this asks which files name the concept
     * at all, and the answer has to stay one — the fixture that writes it.
     *
     * **What AUD-0040 changed, and why this guard survives it.** The situation
     * now reads *every* registered concept rather than nine named ones, so the
     * private one is read on every decision. It is still not *named* anywhere
     * outside the fixture, because the sweep walks the registry — which is the
     * whole point of the finding, and is why a guard about the concept rather
     * than about the fact layer is the one that keeps holding. The general rule
     * about the fact layer now exists too, separately, in
     * `tests/unit/architecture-guards.test.ts`; it could not be written before
     * because `direction.ts` read `view.facts.knowledgeFor` for the weekly
     * focus, which AUD-0040 removed.
     */
    const named: string[] = []
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) {
          walk(full)
          continue
        }
        if (!name.endsWith('.ts') && !name.endsWith('.tsx')) continue
        if (name === 'concepts.ts') continue
        if (/\bprivatePattern\b/.test(readFileSync(full, 'utf8'))) named.push(name)
      }
    }
    walk(join(import.meta.dirname, '..', '..', 'src'))
    expect(named.sort(), 'a module reads the private concept for itself').toEqual([
      // The fixture that writes one. It stores; it does not reason.
      'scenarios.ts',
    ])
  })

  it('renders a private reading as the placeholder wherever it is considered, across the library', () => {
    /*
     * The other half, and the one that holds when the permission is **on**: the
     * value becomes legible to the engine and never becomes a string. Swept
     * over every history rather than over the one that has a private record,
     * because the sweep is worth more than the instance.
     */
    const offenders: string[] = []
    for (const entry of SCENARIOS) {
      const loaded = snapshotFromWire(entry.build())
      const moment = { now: entry.now, zone: entry.zone, weekStartsOn: entry.weekStartsOn ?? 1 }
      const situation = assembleSituation(buildView(loaded.snapshot, moment), moment)
      for (const fact of situation.considered) {
        if (fact.privacy !== 'private') continue
        if (fact.state === 'unknown') continue
        if (fact.reading === 'Private entry') continue
        offenders.push(`${entry.id}: ${fact.concept} read as “${fact.reading}”`)
      }
    }
    expect(offenders, 'an explicit private reading reached the decision trace').toEqual([])
  })
})

// ---------------------------------------------------------------------------
// QA round 1 — the five defects independent QA found, each held so it can fail
// ---------------------------------------------------------------------------

describe('QA-84 round 1 — the repairs', () => {
  it('QA-84-001 — a Health destination changes the recommendation on its own', async () => {
    /*
     * The counterfactual QA asked for: identical guide answers, no unrelated
     * destination as scaffolding, one store before and one after.
     *
     * The first version of this proof created a **Career** destination first so
     * that a career move won, then used Health to restore the walk. That
     * demonstrates arbitration, not the Health destination, and QA was right
     * to call it what it was.
     */
    const before = await eveningIn()
    const said = sentenceOf(before)
    expect(said).toContain('a walk')

    const after = await eveningIn()
    const named = await after.nameDestination({
      aim: 'Strong enough to keep up with her',
      domain: DOMAIN.health,
      milestone: 'Lift twice each week',
    })
    expect(named.done, named.note).toBe(true)

    const now = sentenceOf(after)
    expect(now, 'a Health destination changed nothing an owner can see').not.toBe(said)
    expect(now).toContain('Lift twice each week')
  })

  it('QA-84-001 — and it does not invent how long the step takes', async () => {
    /*
     * F36. He wrote a sentence, not a session. "Move for 25 minutes: lift twice
     * each week" is the app supplying a duration for something it has never
     * seen, and `ActionTarget.minutes` is optional precisely so an absent one
     * is a real state.
     */
    const app = await eveningIn()
    await app.nameDestination({
      aim: 'Strong enough to keep up with her',
      domain: DOMAIN.health,
      milestone: 'Lift twice each week',
    })
    const target = app.decision().explanation?.semantics.target
    expect(target?.object.id).toContain('lift-twice-each-week')
    expect(target?.minutes, 'the app invented a duration for the owner’s own step').toBeUndefined()
  })

  it('QA-84-001 — an owner routine is suggested now, and Reach is where that changed', async () => {
    /*
     * **This assertion was inverted deliberately, and the inversion is the
     * phase.** Routing 84 held the deferral from the other end: it built a
     * route to a destination's *next step* and nothing else, and this test's
     * job was to prove that a routine introduced on its own changed nothing —
     * *"this phase builds the route; Reach walks it."*
     *
     * Routing 92 is Reach and this is it walking. AUD-0045 is the audit's
     * purest example of section 64's failure — a domain structurally incapable
     * of producing a second sentence — and the precondition it named,
     * `profileFor` keyed on (verb, object), is what this phase built first.
     *
     * The rule the old assertion was really protecting is untouched and is
     * asserted below: **the engine still names only its own routines**. What
     * changed is that the owner can now name one, and when he does it is his
     * words on the screen rather than the app's.
     */
    const app = await eveningIn()
    const before = sentenceOf(app)
    expect(before, 'the fixture should be offering the engine’s own routine').toContain('a walk')

    const made = await app.introduce({
      kind: 'routine',
      name: 'Lifting on a Tuesday',
      domain: DOMAIN.health,
    })
    expect(made.done, made.note).toBe(true)

    const after = sentenceOf(app)
    expect(after, 'the routine he named did not reach a recommendation').toContain(
      'Lifting on a Tuesday',
    )
    // He gave no length, so none is invented — F36, and `ActionTarget.minutes`
    // has been optional since Phase 1 so that an absent one is a real state.
    expect(after, 'a duration was invented for it').not.toMatch(/\d+ minutes/)
  })

  it('QA-84-002 — partial work is never counted or worded as a session done', async () => {
    /*
     * One screen kept the owner's distinction and the next erased it: Now
     * offered the move back as **Part done** while the domain page said
     * *"1 session done"* and the correction list said *"Followed through"*.
     */
    const app = await eveningIn()
    await app.act('start')
    const part = await app.act('part-done')
    expect(part.done, part.note).toBe(true)

    const progress = app.progress([DOMAIN.health, DOMAIN.sleep])
    const rungs = new Map(progress.rungs.map((rung) => [rung.kind, rung]))
    expect(rungs.has('completion'), 'part of it was counted as a session done').toBe(false)
    expect(rungs.get('part-done')?.count, 'nothing recorded it as part done').toBe(1)
    expect(rungs.get('part-done')?.says).toContain('part of the way')

    // And the history copy every surface shares.
    const described = app.describeEvents()
    expect(described.some((line) => line.includes('Followed through'))).toBe(false)
    expect(described.some((line) => line.includes('Got part of the way'))).toBe(true)
  })

  it('QA-84-002 — a whole completion still reads as one', async () => {
    // The guard proves nothing unless the other branch still works.
    const app = await eveningIn()
    await app.act('start')
    await app.act('complete')
    const rungs = new Map(app.progress([DOMAIN.health, DOMAIN.sleep]).rungs.map((r) => [r.kind, r]))
    expect(rungs.get('completion')?.count).toBe(1)
    expect(rungs.has('part-done')).toBe(false)
    expect(app.describeEvents().some((line) => line.includes('Followed through'))).toBe(true)
  })

  it('QA-84-003 — a course finished through ordinary controls renders as a finished course', async () => {
    /*
     * DEF-0119's class, one reader further on. `readProgress` walked raw thread
     * records and accepted only `state === 'done'` — which nothing writes — so
     * a run completed through the ordinary controls showed three sessions and
     * no course at all.
     */
    const app = await openJourney('the-first-evening')
    await app.answerGuide('empty')
    // A shortfall worth a plan, for AUD-0009's reason — see the test above.
    await app.correctFact(CONCEPT.sleepHours, { type: 'number', value: 4, unit: 'hours' })
    expect((await app.startCourse()).done, 'no course was offered').toBe(true)
    const steps = app.situation().threads[0]?.steps ?? 0
    expect(steps).toBeGreaterThan(0)

    for (let occasion = 0; occasion < steps; occasion += 1) {
      for (let asked = 0; asked < 3 && app.decision().kind !== 'move'; asked += 1) {
        const step = app.guide()
        if (step.kind !== 'question' || step.question === undefined) break
        await app.answerGuide(step.question.spec.concept === CONCEPT.energy ? 'empty' : undefined)
      }
      expect((await app.act('start')).done, `occasion ${occasion}`).toBe(true)
      expect((await app.act('complete')).done, `occasion ${occasion}`).toBe(true)
      app.travelDays(2)
    }

    const progress = app.progress([DOMAIN.sleep, DOMAIN.health])
    expect(progress.courses.length, 'a finished course never appeared as one').toBe(1)
    expect(progress.courses[0]?.about, 'the course is unnamed').toBeDefined()
    // And it is not the sessions inside it, nor a milestone.
    expect(progress.rungs.some((rung) => rung.kind === 'completion')).toBe(true)
    expect(progress.rungs.some((rung) => rung.kind === 'milestone')).toBe(false)
  })

  it('QA-84-003 — no reader keys on the thread state nothing writes', () => {
    /*
     * The class rather than the instance. `ThreadState` carries `done` because
     * the record kind was written with four states in Phase 82, and no control
     * has ever reached the fourth — so any reader deciding "is this course
     * finished?" from the word is asking a question the record cannot answer.
     * `ActiveThread.finished` is the one definition.
     */
    const offenders: string[] = []
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) {
          walk(full)
          continue
        }
        if (!name.endsWith('.ts') && !name.endsWith('.tsx')) continue
        // `threads.ts` is where `finished` is computed, and it is the one place
        // that may read the word in order to fold it into the definition.
        if (name === 'threads.ts') continue
        const code = readFileSync(full, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
        if (/state\s*===\s*'done'/.test(code)) offenders.push(name)
      }
    }
    walk(join(import.meta.dirname, '..', '..', 'src'))
    expect(offenders, 'a reader asks the record a question it cannot answer').toEqual([])
  })

  it('QA-84-004 — the weekly question stores a weekly fact, and it changes a later day', async () => {
    /*
     * The whole of gate item 4, through the agenda rather than around it.
     *
     * The first proof called the generic `introduce` builder with weekdays,
     * then opened a **fresh** near-empty journey and asserted that the fresh
     * one had no commitments. It never travelled the answered store and never
     * read a later decision, so it could not have caught what it was written to
     * hold: the agenda's own form stored a single dated occurrence.
     */
    const app = await openJourney('the-first-evening')
    const asked = agendaPromptOf(app, 'commitment')
    expect(asked, 'the agenda never asks about the week').toBeDefined()

    const written = await app.answerAgendaCommitment('Working hours', 9 * 60, 3)
    expect(written.done, written.note).toBe(true)

    // What the question asked for is what the record holds.
    const spans = app.snapshot().records.filter((record) => record.kind === 'commitment-window')
    expect(spans.length, 'the answer wrote no span').toBe(1)
    const span = spans[0]!
    if (span.kind !== 'commitment-window') throw new Error('not a span')
    expect(span.recurrence.kind, 'a regular week was stored as one date').toBe('weekly')
    if (span.recurrence.kind !== 'weekly') throw new Error('not weekly')
    expect([...span.recurrence.days]).toEqual([3])

    // And the same store, travelled to the day it is about, sees it.
    const today = app.situation().dayId
    for (let days = 1; days <= 7; days += 1) {
      app.travelDays(1)
      if (app.situation().commitments.length > 0) break
    }
    expect(
      app.situation().commitments.map((obligation) => obligation.label),
      `nothing came into force in the week after ${today}`,
    ).toContain('Working hours')
  })

  it('QA-84-005 — a blank next step is not confirmed as a next step', async () => {
    /*
     * The confirmation the owner agrees to, held where it is generated. It read
     * *"The next step in Career & Learning: ‘that’…"* over an empty box, and
     * promised a learning topic and recommendations that were correctly never
     * written.
     */
    const app = await openJourney('the-first-evening')
    const named = await app.nameDestination({
      aim: 'Working as a cloud engineer',
      domain: DOMAIN.career,
    })
    expect(named.done, named.note).toBe(true)

    const destination = app.situation().direction.destinations[0]
    expect(destination?.next, 'a blank next step created a milestone').toBeUndefined()
    expect(
      app.situation().entities.byKind('learning-topic').length,
      'a blank next step created a learning topic',
    ).toBe(0)

    /*
     * And the sentence he agreed to has to match that.
     *
     * The records were always right — a blank milestone created nothing. What
     * was wrong was the confirmation above the button, and holding only the
     * records is why the first version of this test could not fail. The
     * sentence is a function now, so it can be read.
     */
    const blank = milestoneConfirmation('', DOMAIN.career, 'Career & Learning')
    expect(blank, 'the confirmation invents a next step').not.toContain('The next step')
    expect(blank, 'the confirmation promises study the app will not start').not.toContain(
      'currently studying',
    )
    expect(blank).toContain('nothing is created')

    // The other branch still says what will happen, or the guard is a deletion.
    const named2 = milestoneConfirmation(
      'Get through the networking basics',
      DOMAIN.career,
      'Career & Learning',
    )
    expect(named2).toContain('The next step')
    expect(named2).toContain('Get through the networking basics')
  })

  it('QA-84-005 — an owner phrase never doubles a generated sentence’s full stop', () => {
    /*
     * The sibling QA named: owner-entered terminal punctuation reaching a
     * template that supplies its own. Held at the boundary rather than on one
     * sentence, because every template ends its sentence and every subject
     * inside one may be his words.
     */
    for (const [given, want] of [
      ['Finish the subnetting lab.', 'Finish the subnetting lab'],
      ['Finish the subnetting lab...', 'Finish the subnetting lab'],
      ['Really?!', 'Really'],
      ['  Lift twice each week  ', 'Lift twice each week'],
      ['a walk', 'a walk'],
    ] as const) {
      expect(ownerPhrase(given)).toBe(want)
    }
  })
})

// ---------------------------------------------------------------------------
// The owner addendum — two corrections from real use, not QA findings
// ---------------------------------------------------------------------------

describe('owner addendum — "I cannot leave her" is capturable and promises nothing', () => {
  it('records it durably, and the owner can take it back', async () => {
    /*
     * The owner's case on the deployed build: Now offered a walk while his
     * daughter was asleep and there was nobody else to watch her. The nearest
     * of the seven causes was `someone-needs-me`, which is wrong twice — nobody
     * needed his time, he was not free to leave — and `standing: false`, so it
     * wrote nothing durable at all.
     */
    const app = await eveningIn()
    await app.act('unable-now')
    const said = await app.sayWhatBlocked('must-stay')
    expect(said.done, said.note).toBe(true)

    const constraints = app.situation().constraints
    expect(constraints.length, 'nothing durable was written').toBe(1)
    expect(constraints[0]!.description).toContain('someone was in my care')

    // Durable across the day, and across a re-read of the same store.
    app.travelDays(1)
    expect(app.situation().constraints.length, 'it did not survive the day').toBe(1)

    // And withdrawable — a record, not a deletion.
    const before = app.snapshot().records.length
    const lifted = await app.withdraw(constraints[0]!.source, 'Not true any more')
    expect(lifted.done).toBe(true)
    expect(app.situation().constraints.length).toBe(0)
    expect(app.snapshot().records.length, 'the constraint was deleted').toBeGreaterThan(before)
  })

  it('never claims a future recommendation will change — D-187', async () => {
    /*
     * The rule that is easiest to break by accident, and it is a fact about the
     * tree rather than a preference: `applyConstraints` never reads
     * `situation.constraints`, and `cautionsFor` matches a constraint's concept
     * against a candidate's `leansOn`, which never holds a `blocker.*` concept.
     * Nothing acts on this. So no string on the path may say that anything will.
     *
     * A comparison rather than a blacklist would be better (D-177) and there is
     * nothing to compare against: the claim is about the **future**, and the
     * app has no number for it. What is checkable is that the words which would
     * make the promise do not appear, and that the guard fails when they do —
     * which the reintroduction below proves.
     */
    const promises = [
      /will stop (being )?(suggest|offer)/i,
      /won.t (be )?(suggest|offer)/i,
      /stop (suggest|offer)ing/i,
      /from now on the app will/i,
      /the app will (no longer|avoid|stop)/i,
    ]
    const strings: string[] = []
    for (const cause of BLOCKER_CAUSES) {
      const option = BLOCKER_OPTIONS[cause]
      strings.push(option.label, option.statement('a walk'))
    }

    /*
     * And every sentence the owner actually reads on the path, taken from a
     * real decision rather than from the table alone: the question, the note
     * under it, and the line the app shows when it declines to ask.
     */
    const app = await eveningIn()
    await app.act('unable-now')
    const asked = app.blockerFor()
    if (asked?.ask === true) strings.push(asked.prompt, asked.note)
    await app.sayWhatBlocked('must-stay')
    const silent = app.blockerFor()
    if (silent?.ask === false) strings.push(silent.detail)
    for (const constraint of app.situation().constraints) strings.push(constraint.description)

    const offenders: string[] = []
    for (const line of strings) {
      for (const pattern of promises) {
        if (pattern.test(line)) offenders.push(line)
      }
    }
    expect(offenders, 'the blocker path promised a change it cannot make').toEqual([])
  })

  it('and the guard bites when such a promise is put back', () => {
    // The reintroduction, in the shape it would actually arrive: a helpful
    // clause on the end of the stored statement.
    const reintroduced = 'A walk means leaving, and I could not — the app will stop suggesting it.'
    expect(/stop (suggest|offer)ing/i.test(reintroduced)).toBe(true)
  })

  it('is offered beside the other seven, and takes none of their places', () => {
    // Nine now: routing 92 added the bounded form of this same answer, and it
    // took none of their places either.
    expect(BLOCKER_CAUSES.length).toBe(9)
    expect(BLOCKER_CAUSES).toContain('must-stay-tonight')
    for (const cause of [
      'no-time',
      'not-here',
      'too-tired',
      'someone-needs-me',
      'sore',
      'no-kit',
      'interrupted',
    ] as const) {
      expect(BLOCKER_CAUSES).toContain(cause)
      expect(BLOCKER_OPTIONS[cause].id).toBe(cause)
    }
  })
})

describe('owner addendum — the discovery card stops bypassing the confirmation', () => {
  it('shows what it understood, what it will make and what it is not assuming, before anything is written', async () => {
    /*
     * The owner's case, on the deployed build. Insights asked *"What are you
     * hoping Career & Learning eventually looks like?"*, he typed **More
     * money**, and pressed **That is it** believing he had confirmed an
     * interpretation. He had not: the branch went straight to
     * `destinationRecords`, and no interpretation, no `creates` and no
     * `unknowns` was ever shown. The panel one screen away has had the whole
     * contract since package 3.
     */
    const app = await openJourney('the-first-evening')
    const asked = app.agenda().prompt
    expect(asked?.shape, 'the first prompt on a near-empty store is not the aspiration').toBe(
      'destination',
    )
    expect(asked?.domain).toBe(DOMAIN.career)

    const before = app.snapshot().records.length
    const proposal = app.discoveryProposal('More money')
    expect(proposal, 'the card composed nothing to show him').toBeDefined()

    // What it understood — his words, and the area the question was about.
    expect(proposal!.interpretation).toContain('More money')
    expect(proposal!.interpretation).toContain('Career & Learning')

    // What it will make.
    expect(proposal!.creates.length).toBeGreaterThan(0)
    expect(proposal!.creates.join(' ')).toContain('More money')

    // And the half that earns a confirmation.
    expect(proposal!.unknowns).toContain('what the next step towards it is')
    expect(proposal!.unknowns).toContain('where you are starting from')
    expect(proposal!.problems).toEqual([])

    // Composing it wrote nothing. Reading a proposal is not agreeing to one.
    expect(app.snapshot().records.length, 'the proposal wrote something').toBe(before)
  })

  it('writes nothing at all when he declines', async () => {
    const app = await openJourney('the-first-evening')
    const before = app.snapshot().records.length

    const left = await app.skipDiscovery()
    expect(left.done).toBe(true)

    const written = app.snapshot().records.slice(before)
    expect(written.map((record) => record.kind)).toEqual(['discovery-response'])
    expect(
      app.snapshot().records.some((record) => record.kind === 'destination'),
      'declining created an aspiration',
    ).toBe(false)
    expect(
      app
        .situation()
        .entities.all()
        .some((entity) => entity.kind === 'destination'),
    ).toBe(false)
  })

  it('stores his words byte-identical, in the prompt’s own domain', async () => {
    /*
     * Two rules in one assertion, and the second is the one an inference layer
     * would break first. *"More money"* under a Career prompt is filed under
     * **Career** — proposing a second reading of the phrase is routing 91
     * package 1 (D-172), and nothing in this addendum opens it.
     */
    const app = await openJourney('the-first-evening')
    const said = await app.answerDiscovery('More money')
    expect(said.done, said.note).toBe(true)

    const written = app.snapshot().records.filter((record) => record.kind === 'destination')
    expect(written.length).toBe(1)
    const record = written[0]! as { readonly aim: string; readonly domains: readonly string[] }
    expect(record.aim, 'his words were edited').toBe('More money')
    expect(record.domains).toEqual([DOMAIN.career])
  })

  it('proposes nothing it cannot build, and builds nothing it did not propose', async () => {
    // The gate, from the side that has to refuse: a blank answer has a problem
    // in it, is told so, and produces no record rather than a silent nothing.
    const app = await openJourney('the-first-evening')
    const before = app.snapshot().records.length

    const empty = app.discoveryProposal('   ')
    expect(empty?.problems.length, 'a blank aim proposed itself as buildable').toBeGreaterThan(0)

    const said = await app.answerDiscovery('   ')
    expect(said.done).toBe(false)
    expect(said.written).toBe(0)
    expect(app.snapshot().records.length).toBe(before)
  })

  it('says only what the records then actually say — the QA-84-005 shape, on this path', async () => {
    /*
     * The standing lesson, applied to the sentence composed here. QA-84-005 was
     * a confirmation that described a thing the app then did not do; a
     * confirmation is only worth showing if it can be held to what follows it.
     *
     * So each half of the proposal is checked against the store afterwards:
     * every `creates` line against something that exists, and every `unknowns`
     * line against something that does **not**.
     */
    const app = await openJourney('the-first-evening')
    const proposal = app.discoveryProposal('More money')!
    const said = await app.answerDiscovery('More money')
    expect(said.done, said.note).toBe(true)

    const records = app.snapshot().records
    const destination = records.find((record) => record.kind === 'destination') as
      | {
          readonly aim: string
          readonly baseline?: string
          readonly evidence?: readonly string[]
          readonly occurredAt: number
          readonly zone: string
        }
      | undefined
    expect(destination, 'it promised to create something and did not').toBeDefined()

    // "something to aim at … in your words" — the entity is there, labelled
    // with exactly what he typed.
    expect(
      app
        .situation()
        .entities.all()
        .some((entity) => entity.kind === 'destination' && entity.label === 'More money'),
      'the thing it said it would create is not there',
    ).toBe(true)

    // "an entry saying you named it, dated today".
    expect(proposal.creates).toContain('an entry saying you named it, dated today')
    expect(
      localDayIdAt(instant(destination!.occurredAt), timeZone(destination!.zone)),
      'the entry is not dated the day it says',
    ).toBe(app.situation().dayId)

    // And the three it said it would not assume, none of them assumed.
    expect(proposal.unknowns).toContain('what the next step towards it is')
    expect(
      records.some((record) => record.kind === 'goal'),
      'it said it did not know the next step and wrote one',
    ).toBe(false)

    expect(proposal.unknowns).toContain('where you are starting from')
    expect(destination!.baseline).toBeUndefined()

    expect(proposal.unknowns).toContain('what would count as getting somewhere')
    expect(destination!.evidence).toBeUndefined()
  })

  it('and the next step, where he does name one, is described before it is made', () => {
    /*
     * The other half of the same sentence, reused rather than rewritten
     * (`milestoneConfirmation`): a milestone is the one thing on this path that
     * changes what the app suggests, so what making it the next step *means*
     * is said out loud — and it is the area's own meaning, not one sentence
     * for all three.
     */
    for (const [domain, expected] of [
      [DOMAIN.career, 'currently studying'],
      [DOMAIN.money, 'money thing that is open'],
      [DOMAIN.health, 'start suggesting it on evenings there is something to spend'],
    ] as const) {
      const sentence = milestoneConfirmation('Finish the AWS course', domain, 'that area')
      expect(sentence).toContain('Finish the AWS course')
      expect(sentence).toContain(expected)
    }

    // And the empty case still says nothing is created, which is what D-173
    // protects: a man who can only name the aim has said enough.
    expect(milestoneConfirmation('  ', DOMAIN.career, 'Career & Learning')).toContain(
      'nothing is created for it',
    )
  })

  it('cannot come back: no screen brings something into being without proposing it', () => {
    /*
     * The bypass, held as a fact about the tree rather than as a comment.
     *
     * `Discovery.tsx` never imported `proposeAuthoring`, and nothing anywhere
     * said so — which is the kind of absence only a source instrument can see.
     * `everyAuthoringSurface()` reads which feature files call a builder that
     * writes an entity and its records as one act, and which of them compose an
     * `AuthoringProposal` first.
     *
     * What this proves is per screen, not per branch: that the surface has a
     * confirmation at all. That the confirmation is the one shown on the branch
     * that writes is what the five tests above are for, and the two together
     * are the claim.
     */
    const surfaces = everyAuthoringSurface()
    const bypassing = surfaces.filter(
      (surface) =>
        surface.proposes.length === 0 &&
        !PROPOSES_ELSEWHERE.some((exempt) => exempt.file === surface.file),
    )
    expect(
      bypassing.map((surface) => `${surface.file} builds ${surface.builds.join(', ')}`),
      'a screen writes something into being without saying what it will do first',
    ).toEqual([])
  })

  it('and the guard is not vacuous — it sees the card that had the bug', () => {
    const surfaces = everyAuthoringSurface()
    const discovery = surfaces.find((surface) => surface.file.endsWith('/insights/Discovery.tsx'))
    expect(discovery, 'the instrument cannot see the file the addendum is about').toBeDefined()
    expect(discovery!.builds).toContain('destinationRecords')
    expect(discovery!.proposes).toContain('proposeDestination')

    // The exemption costs an entry, and a stale entry is a failure: every file
    // named in it still has to be a surface that builds.
    for (const exempt of PROPOSES_ELSEWHERE) {
      expect(
        surfaces.some((surface) => surface.file === exempt.file),
        `${exempt.file} is exempted from proposing and no longer builds anything`,
      ).toBe(true)
    }

    // And the check fails on the shape that was in the tree.
    const asItWas = {
      file: '/src/features/insights/Discovery.tsx',
      builds: ['destinationRecords'],
      proposes: [],
    }
    expect(
      asItWas.proposes.length === 0 &&
        !PROPOSES_ELSEWHERE.some((exempt) => exempt.file === asItWas.file),
      'the guard would have passed the bug it was written for',
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// QA-84 round 2 — the four the retest found
// ---------------------------------------------------------------------------

describe('QA-84 round 2 — the repairs', () => {
  it('QA-84-007 — no screen decides it has nothing to offer because the store is empty', () => {
    /*
     * The finding is one clause in two files rather than one screen's copy.
     * `LifeScreen` and `DomainPage` both began
     *
     *     if (!memory.ready || memory.snapshot.records.length === 0) return undefined
     *
     * and the second half switched off every control that exists so the owner
     * can write the first record. `InsightsScreen` never had it, which is
     * exactly why the second agenda was the only thing QA could reach on a
     * first run — and why Now's only control was a developer tool.
     *
     * Readiness is a reason to wait. A record count is not.
     */
    const gated = screensGatedOnRecordCount()
    expect(
      gated.map((screen) => `${screen.file} gates on ${screen.guard}`),
      'a screen treats an empty history as an empty page',
    ).toEqual([])
  })

  it('QA-84-007 — and every ordinary control assembles from a store with nothing in it', () => {
    /*
     * The other half: removing the guard is only worth doing if what was behind
     * it works. `assembleSituation` on an empty view is well defined — it is the
     * call `InsightsScreen` has always made — and each domain page assembles
     * its own data from it.
     */
    const moment = {
      now: instant(Date.parse('2026-05-06T20:00:00Z')),
      zone: timeZone('America/Denver'),
      weekStartsOn: 1 as const,
    }
    const empty = snapshotFromWire({ schemaVersion: 1, records: [], entities: [] })
    const situation = assembleSituation(buildView(empty.snapshot, moment), moment)

    expect(situation.coverage.domains.length, 'Life had no areas to list').toBeGreaterThan(0)
    for (const page of LIFE_PAGES) {
      const data = assembleDomainPageData(situation, page)
      expect(data, `${page.slug} could not assemble from an empty store`).toBeDefined()
    }

    // And the aspiration control belongs on the proving domains, which is the
    // route a cold-store owner actually needs.
    const career = LIFE_PAGES.find((page) => page.slug === 'career')
    expect(career, 'the Career page is gone').toBeDefined()
    expect(career!.domains.some((domain) => PROVING_DOMAINS.includes(domain))).toBe(true)
  })

  it('QA-84-008 — no confirmation denies a suggestion the app then makes', async () => {
    /*
     * The class, and why two green tests held it open.
     *
     * One test asserted the Health sentence contained *"will not start
     * suggesting it"*. Another proved the same step becomes a candidate. Each
     * was true on its own; together they were a contradiction the owner met in
     * two consecutive screens, and neither test could see the other.
     *
     * So this reads the confirmation and then **makes the app do the thing**, on
     * one path, for every proving domain.
     */
    const contradictions: string[] = []
    for (const domain of PROVING_DOMAINS) {
      const app = await eveningIn()
      const area = app.situation().domains.labelFor(domain)
      const step = `Lift twice each week`
      const sentence = milestoneConfirmation(step, domain, area)

      const named = await app.nameDestination({
        aim: `Something better in ${area}`,
        domain,
        milestone: step,
      })
      expect(named.done, named.note).toBe(true)

      const onScreen = sentenceOf(app)
      const suggested = onScreen.includes(step)
      const denied = /not start suggesting/.test(sentence)
      if (denied && suggested) {
        contradictions.push(`${area}: “${sentence}” — and then Now said “${onScreen}”`)
      }

      // Health is the one the repair changed, and its half has to hold rather
      // than merely not contradict: the step is named, and the sentence says so.
      if (domain === DOMAIN.health) {
        expect(sentence, 'the Health confirmation still denies the suggestion').toContain(
          'start suggesting it',
        )
        expect(onScreen, 'the Health milestone was promised and not proposed').toContain(step)
      }
    }
    expect(contradictions, 'a confirmation described the behaviour before the repair').toEqual([])
  })

  it('QA-84-009 — a partial completion is partial in the tag as well as the sentence', async () => {
    const app = await eveningIn()
    await app.act('start')
    const part = await app.act('part-done')
    expect(part.done, part.note).toBe(true)

    const completion = app
      .snapshot()
      .records.filter((record) => record.kind === 'action-completion')
      .at(-1)
    expect(completion, 'nothing recorded the partial completion').toBeDefined()
    expect(tagOf(completion!), 'Timeline still calls it Done').toBe('Part done')
  })

  it('QA-84-009 — and no rendered entry in the library contradicts itself about extent', () => {
    /*
     * The class rather than the case: **a rendered entry is one statement.** On
     * Timeline the tag sits directly above the sentence, so an entry whose tag
     * says one thing and whose sentence says another is a contradiction inside a
     * single row — which is what the round 1 repair left, having fixed the
     * sentence and argued that a tag was only one word.
     */
    const contradictions: string[] = []
    for (const entry of SCENARIOS) {
      const loaded = snapshotFromWire(entry.build())
      const moment = { now: entry.now, zone: entry.zone, weekStartsOn: entry.weekStartsOn ?? 1 }
      const view = buildView(loaded.snapshot, moment)
      const situation = assembleSituation(view, moment)
      const context = {
        entities: situation.entities,
        history: view.history,
        concepts: situation.concepts,
        domains: situation.domains,
        policy: { surface: 'inspection' as const, revealPrivate: false },
      }
      for (const record of view.history.effective) {
        const described = describeRecord(record, context)
        if (described === undefined) continue
        const saysPart = /part of the way|part done/i.test(described.text)
        const tagSaysPart = /part/i.test(tagOf(record))
        if (saysPart !== tagSaysPart) {
          contradictions.push(`${entry.id}: “${tagOf(record)}” above “${described.text}”`)
        }
      }
    }
    expect(contradictions, 'a rendered entry disagrees with itself about extent').toEqual([])
  })

  it('QA-84-010 — nothing on the blocker path claims the app will change what it offers', async () => {
    /*
     * The guard QA asked for: **the class, not the phrases.**
     *
     * The old one blacklisted five formulations around *stop*, *won't*, *no
     * longer*, *avoid* and *from now on*. It collected the live note and did not
     * match it, because the note said *"so the app can offer something that fits
     * next time"*. Three copies of that list existed — synthetic, browser,
     * Android — and all three passed while the promise rendered.
     *
     * `adaptationClaims` asks for an actor, a modality that is not the present,
     * and a verb about what is put in front of him. One definition, in
     * `scripts/adaptation-claims.mjs`, imported by all three gates.
     *
     * It is scoped to **this path** deliberately. *"The app will know it exists
     * and can refer to it; it will not start suggesting it"* is the authoring
     * form's sentence about a routine, and it is **true** — AUD-0045 means an
     * owner routine genuinely is never suggested. The rule is not "never speak
     * of the future"; it is "not on a path where nothing acts".
     */
    const strings: string[] = []
    for (const cause of BLOCKER_CAUSES) {
      const option = BLOCKER_OPTIONS[cause]
      strings.push(option.label, option.statement('a walk'))
    }

    const app = await eveningIn()
    await app.act('unable-now')
    const asked = app.blockerFor()
    if (asked?.ask === true) strings.push(asked.prompt, asked.note)
    await app.sayWhatBlocked('must-stay')
    const silent = app.blockerFor()
    if (silent?.ask === false) strings.push(silent.detail)
    for (const constraint of app.situation().constraints) strings.push(constraint.description)

    /*
     * And the branch a repeated inability reaches, which carried a promise of
     * its own that QA did not have to quote because the first one was enough.
     */
    const repeated = await eveningIn()
    for (let evenings = 0; evenings < 3; evenings += 1) {
      await repeated.act('unable-now')
      const step = repeated.blockerFor()
      if (step?.ask === true) strings.push(step.prompt, step.note)
      if (step?.ask === false) strings.push(step.detail)
      repeated.travelDays(1)
    }

    const claiming = strings
      .map((line) => ({ line, claims: adaptationClaims(line) }))
      .filter((found) => found.claims.length > 0)

    expect(
      claiming.map((found) => `${found.line} → ${found.claims.join(' / ')}`),
      'the blocker path promised an adaptation the engine does not perform',
    ).toEqual([])
    expect(strings.length, 'the sweep read nothing, so it proved nothing').toBeGreaterThan(10)
  })

  it('QA-84-010 — and the guard catches the wording that shipped, not only the one it was written for', () => {
    /*
     * The reintroduction, done properly. The old guard passed its own
     * reintroduction test — one already-listed phrase — while the deployed
     * string sailed through it. So the proof is the two strings QA actually read
     * off the build, the round 1 phrase, and wordings nobody wrote down.
     */
    for (const line of MUST_BE_CAUGHT) {
      expect(adaptationClaims(line), `not caught: “${line}”`).not.toEqual([])
    }
    for (const line of MUST_BE_ALLOWED) {
      expect(adaptationClaims(line), `wrongly caught: “${line}”`).toEqual([])
    }

    // Named, so this cannot pass by catching only the generic examples.
    expect(MUST_BE_CAUGHT).toContain(
      'This is kept so the app can offer something that fits next time. It is never read as you not wanting to.',
    )
    expect(MUST_BE_CAUGHT).toContain(
      'This is kept so the app can stop putting it in front of you at the wrong moment.',
    )
  })
})

// ---------------------------------------------------------------------------
// QA-84 round 3 — the guard, for the third time
// ---------------------------------------------------------------------------

describe('QA-84-011 — the adaptation guard, rebuilt on what is actually closed', () => {
  const flat = (line: string) => line.replace(/\s+/g, ' ').trim()

  /**
   * The catalogue stores a sentence containing the move's own name once, as
   * `{move}`, rather than once per move in the library.
   */
  const asTemplate = (line: string) =>
    flat(line).replace(
      /^.*? has not fitted more than once\./,
      '{move} has not fitted more than once.',
    )

  /**
   * Every string the blocker path puts in front of the owner, collected by
   * **using the app** across the whole scenario library.
   *
   * `blockerQuestionFor` has five branches and one evening reaches one of them.
   * Blocking the same move on consecutive days is what reaches
   * `repeatedly-blocked`; answering a cause and looking again the same day is
   * what reaches `just-asked`; a restorative move is what reaches the silence.
   * Sweeping one evening was the first draft of this, and an unapproved edit to
   * the repeatedly-blocked note walked straight past it.
   */
  async function everyRenderedBlockerString(): Promise<ReadonlySet<string>> {
    const seen = new Set<string>()
    seen.add(flat(LEAVE_IT))
    for (const cause of BLOCKER_CAUSES) {
      seen.add(flat(BLOCKER_OPTIONS[cause].label))
      seen.add(flat(BLOCKER_OPTIONS[cause].statement('{move}')))
    }

    const collect = (decision: ReturnType<JourneyApp['blockerFor']>) => {
      if (decision === undefined) return
      if (decision.ask) {
        seen.add(asTemplate(decision.prompt))
        seen.add(flat(decision.note))
      } else {
        seen.add(flat(decision.detail))
      }
    }

    for (const entry of SCENARIOS) {
      const running = await openJourney(entry.id)
      for (let days = 0; days < 4; days += 1) {
        const blocked = await running.act('unable-now')
        if (!blocked.done) break
        collect(running.blockerFor())
        running.travelDays(1)
      }

      const answered = await openJourney(entry.id)
      const first = await answered.act('unable-now')
      if (first.done) {
        await answered.sayWhatBlocked('too-tired')
        collect(answered.blockerFor())
      }
    }
    return seen
  }

  it('renders only copy that has been approved — the check with no escapes', async () => {
    /*
     * The guarantee, and the reason it is an allowlist.
     *
     * Two guards have now been written for D-187 and both failed the same way.
     * The first listed five phrases and the shipped string used none of them
     * (QA-84-010). The second took a cross-product of an actor list, a modality
     * list and an **adaptation verb** list, and QA-84-011 broke it with four
     * ordinary words — *choose*, *pick*, *use*, *prefer*.
     *
     * The lesson is not that the third list should be longer. It is that
     * **recognising a promise in ordinary English is not decidable by a rule**,
     * so the thing to close is not the space of sentences but the space of
     * strings: the blocker path renders a finite set, and this holds it to
     * exactly that set. A copy edit fails here until somebody adds it
     * deliberately — which is the moment to decide whether it promises
     * anything.
     */
    const rendered = [...(await everyRenderedBlockerString())]
    const unapproved = rendered.filter((line) => !isApprovedBlockerCopy(line))
    expect(
      unapproved,
      'the blocker path rendered copy nobody approved — add it to APPROVED_BLOCKER_COPY with the reason it is honest',
    ).toEqual([])

    /*
     * And it is not vacuous: the walk really did reach every branch of the half
     * this file is responsible for. The other half is composed in JSX and is
     * proved by rendering, in `blocker-copy.test.tsx` — QA-84-012.
     */
    expect(rendered.length, 'the sweep collected almost nothing').toBeGreaterThanOrEqual(
      APPROVED_FROM_BLOCKERS_MODULE.length,
    )
  })

  it('and the catalogue cannot rot: every approved string is one the path can reach', async () => {
    /*
     * The other direction, which is what stops an allowlist becoming a drawer.
     * A string nothing renders any more is a string nobody is checking, and
     * leaving it in would let the catalogue drift into a list of things the app
     * used to say.
     *
     * `already-known` renders a constraint in the owner's own words rather than
     * app copy, so it is not in the catalogue and nothing here sweeps for it.
     */
    const rendered = await everyRenderedBlockerString()
    const unreached = APPROVED_FROM_BLOCKERS_MODULE.filter((line) => !rendered.has(flat(line)))
    expect(
      unreached,
      'the catalogue lists copy the path never renders — remove it, or the check is guarding nothing',
    ).toEqual([])
  })

  it('catches the promises the verb list let through — QA-84-011 exactly', () => {
    // The four QA reported, verbatim, plus the nominal and passive forms.
    for (const line of [
      'The app will choose a more suitable option.',
      'The app will pick something else for you.',
      'The app will use this when deciding what comes next.',
      'The app will prefer an option that works indoors.',
      'Future recommendations will take this into account.',
      'The app remembers this for future recommendations.',
      'Recommendations will be different next time.',
    ]) {
      expect(adaptationClaims(line), `QA-84-011 escape still escapes: “${line}”`).not.toEqual([])
    }

    for (const line of MUST_BE_CAUGHT) {
      expect(adaptationClaims(line), `not caught: “${line}”`).not.toEqual([])
    }
    for (const line of MUST_BE_ALLOWED) {
      expect(adaptationClaims(line), `wrongly caught: “${line}”`).toEqual([])
    }
  })

  it('does not depend on knowing the verb — the boundary the last fixture could not draw', () => {
    /*
     * QA-84-011's real objection: the old fixture proved the six strings
     * somebody had already thought of, and had *"no mutation or paraphrase
     * boundary capable of disproving the list itself"*.
     *
     * This is that boundary. It builds every sentence in subject × modal ×
     * verb, where the verbs include ones no guard would list and three that are
     * not words at all — `frobnicate`, `zorble`, `quibblify`. A guard that
     * consults a verb vocabulary fails on the first unfamiliar one. This one
     * never looks at the verb: what it reads is a subject that is the app or
     * its output, and a **modal auxiliary**, which is a closed class in English
     * and cannot grow.
     */
    const subjects = [
      'The app',
      'The engine',
      'It',
      'This',
      'That',
      'Recommendations',
      'The suggestion',
      'What you are shown',
    ]
    const modals = [
      'will',
      'would',
      'can',
      'could',
      'may',
      'might',
      'must',
      'shall',
      'should',
      'is going to',
      'needs to',
      'ought to',
      "won't",
      'will not',
    ]
    const verbs = [
      'choose',
      'pick',
      'prefer',
      'use',
      'decide',
      'weigh',
      'rank',
      'reorder',
      'downrank',
      'swap',
      'substitute',
      'withhold',
      'suppress',
      'promote',
      'demote',
      'remember',
      'learn',
      'note',
      'factor',
      'consider',
      'skip',
      'hide',
      'surface',
      'elevate',
      'sideline',
      'frobnicate',
      'zorble',
      'quibblify',
    ]

    const escaped: string[] = []
    for (const subject of subjects) {
      for (const modal of modals) {
        for (const verb of verbs) {
          const line = `${subject} ${modal} ${verb} something else for you.`
          if (adaptationClaims(line).length === 0) escaped.push(line)
        }
      }
    }
    expect(escaped.slice(0, 5), 'a generated promise escaped the guard').toEqual([])
    expect(
      subjects.length * modals.length * verbs.length,
      'the sweep shrank, so it proves less than it did',
    ).toBeGreaterThan(3000)
  })

  it('and still leaves honest present-tense copy alone', () => {
    /*
     * The other half of the boundary, and the reason the guard is scoped to a
     * path rather than to a vocabulary. Recording, correcting and withdrawing
     * are all things the owner does now, and the copy for them says so.
     */
    for (const line of [
      ...APPROVED_BLOCKER_COPY,
      'Recorded on your Health & Recovery page, where you can take it back.',
      'You said this was in the way.',
      '“Not true any more” takes it back.',
      'Nothing about it changes what the app suggests.',
    ]) {
      expect(adaptationClaims(line), `honest copy was flagged: “${line}”`).toEqual([])
    }
  })
})
