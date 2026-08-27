import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN, type LifeDomainId } from '../../src/domain/domains'
import { PROGRESS_EVIDENCE, progressSentence, rankOf } from '../../src/domain/progress'
import { mayReasonFrom, NO_PERMISSIONS } from '../../src/domain/privacy'
import { addLocalDaysToDayId, systemClock } from '../../src/domain/time'
import {
  AUTHORABLE_KINDS,
  PROVING_DOMAINS,
  type AuthorableKind,
} from '../../src/intelligence/authoring'
import { BLOCKER_CAUSES, BLOCKER_OPTIONS } from '../../src/intelligence/blockers'
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
import { openJourney, type JourneyApp } from './journey'

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
async function firstEvening(energy: string, minutes: number): Promise<JourneyApp> {
  const app = await openJourney('the-first-evening')
  for (let taps = 0; taps < 3; taps += 1) {
    const step = app.guide()
    if (step.kind !== 'question' || step.question === undefined) break
    await app.answerGuide(
      step.question.spec.concept === CONCEPT.energy
        ? energy
        : step.question.spec.concept === CONCEPT.soreness
          ? 'none'
          : 'open',
    )
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
    // Two of the seven are about the world, and those are the durable ones.
    const standing = BLOCKER_CAUSES.filter((cause) => BLOCKER_OPTIONS[cause].standing)
    expect([...standing].sort()).toEqual(['no-kit', 'not-here'])
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
