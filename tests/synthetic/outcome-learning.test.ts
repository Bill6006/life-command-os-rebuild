import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { entityRef } from '../../src/domain/entities'
import { sequentialRecordIds } from '../../src/domain/ids'
import type { CanonicalRecord, DecisionContext } from '../../src/domain/records'
import { timeZone, type Instant } from '../../src/domain/time'
import { decide, type Decision } from '../../src/intelligence/engine'
import {
  beliefKey,
  PATIENCE,
  RECOGNISABLE,
  recencyFactor,
  similarity,
} from '../../src/intelligence/learning'
import { LIFECYCLE_PROVENANCE } from '../../src/intelligence/lifecycle'
import { profileFor } from '../../src/intelligence/moves'
import { createRecordFactory } from '../../src/domain/build'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { createKit } from '../../src/synthetic/kit'
import { evening, pastEpisodeRecords, type PastEpisode } from './harness'

/**
 * Section 20 — outcome learning.
 *
 * > The app learns from **observed outcomes**, not from recommendation
 * > generation alone.
 *
 * Six rules follow that sentence in the plan, and every one of them is a defect
 * waiting to be written. Each has its own `describe` below, quoting the rule it
 * holds, because a rule with no test that fails when it is broken is a comment.
 */

const ZONE = timeZone('America/Denver')
const KITCHEN = entityRef('place', 'the kitchen')
const A_WALK = entityRef('routine', 'a walk')

/** Tonight: an ordinary Tuesday evening with an hour in it and rest in hand. */
const TONIGHT = '2026-05-19'
const AT = '19:30'

interface HistoryInput {
  readonly past?: readonly PastEpisode[]
  readonly extra?: (kit: ReturnType<typeof createKit>) => readonly CanonicalRecord[]
  readonly prefix?: string
}

/**
 * One evening, with whatever past is put behind it.
 *
 * Everything except the past is held still: the same friction, the same energy,
 * the same hour. Whatever changes between two of these is doing the work, which
 * is the same discipline G-005's pair uses.
 */
function history(input: HistoryInput = {}): Decision {
  const kit = createKit(input.prefix ?? 'OL', 'America/Denver', '2026-04-01T12:00:00Z')
  const nextId = sequentialRecordIds(`${input.prefix ?? 'OL'}X`)
  const now = kit.local(TONIGHT, AT)

  const place = kit.entity({
    kind: 'place',
    label: 'the kitchen',
    domain: DOMAIN.home,
    privacy: 'normal',
  })

  const friction = kit.record(
    'observation',
    { occurredAt: kit.local('2026-05-18', '18:00'), domains: [DOMAIN.home], entities: [KITCHEN] },
    {
      concept: CONCEPT.homeFriction,
      value: { type: 'text', value: 'the kitchen table is buried again' },
      method: 'self-report',
    },
  )

  const nights = [7.5, 7.75, 8].map((value, offset) =>
    kit.record(
      'observation',
      { occurredAt: kit.local(`2026-05-${17 + offset}`, '07:00'), domains: [DOMAIN.sleep] },
      {
        concept: CONCEPT.sleepHours,
        value: { type: 'number', value, unit: 'hours' },
        method: 'self-report',
      },
    ),
  )

  const energy = kit.record(
    'observation',
    { occurredAt: kit.local(TONIGHT, '18:00'), domains: [DOMAIN.health] },
    { concept: CONCEPT.energy, value: { type: 'scale', value: 3, of: 5 }, method: 'self-report' },
  )

  const time = kit.record(
    'observation',
    { occurredAt: kit.local(TONIGHT, '19:00'), domains: [DOMAIN.direction] },
    {
      concept: CONCEPT.usableTimeTonight,
      value: { type: 'duration', minutes: 60 },
      method: 'self-report',
    },
  )

  const document = kit.document({
    entities: [place],
    records: [
      friction,
      ...nights,
      energy,
      time,
      ...pastEpisodeRecords(kit, input.past ?? [], nextId),
      ...(input.extra?.(kit) ?? []),
    ],
    exportedAt: now,
  })

  const loaded = snapshotFromWire(document)
  expect(loaded.loaded, 'the history should load').toBe(true)
  return decide(buildView(loaded.snapshot, { now, zone: ZONE }), { now, zone: ZONE })
}

function dimensionOf(decision: Decision, candidate: string, name: string): number {
  const row = decision.trace.ranking.find((entry) => entry.id === candidate)
  const found = row?.dimensions.find((entry) => entry.name === name)
  expect(found, `${candidate} has no ${name}`).toBeDefined()
  return found?.value ?? 0
}

function learningOf(decision: Decision, candidate: string) {
  const row = decision.trace.learning.find((entry) => entry.candidate === candidate)
  expect(row, `no learning row for ${candidate}`).toBeDefined()
  return row
}

const CLEAR_THE_KITCHEN = 'home/reset-space/place:the-kitchen'
const GO_FOR_A_WALK = 'health/move/routine:a-walk'

/** Comparable evenings, spread far enough back not to trip the duplication check. */
function clearedTheKitchen(
  days: readonly number[],
  ending: PastEpisode['ending'],
  effect?: PastEpisode['effect'],
  context: DecisionContext = evening(),
  result?: PastEpisode['result'],
): readonly PastEpisode[] {
  return days.map((day) => ({
    verb: 'reset-space' as const,
    object: KITCHEN,
    domain: DOMAIN.home,
    on: `2026-05-${String(day).padStart(2, '0')}`,
    context,
    ending,
    ...(effect === undefined ? {} : { effect }),
    ...(result === undefined ? {} : { result }),
  }))
}

function dimensionWeight(decision: Decision, candidate: string, name: string): number {
  const row = decision.trace.ranking.find((entry) => entry.id === candidate)
  const found = row?.dimensions.find((entry) => entry.name === name)
  expect(found, `${candidate} has no ${name}`).toBeDefined()
  return found?.weight ?? -1
}

function positiveDimensions(decision: Decision, candidate: string): readonly string[] {
  const row = decision.trace.ranking.find((entry) => entry.id === candidate)
  return (row?.dimensions ?? [])
    .filter((entry) => entry.weight > 0 && entry.value > 0)
    .map((entry) => entry.name)
}

// ---------------------------------------------------------------------------

describe('a completed action changes later reasoning', () => {
  const cold = history()
  const warm = history({ past: clearedTheKitchen([5, 8, 12], 'completed', 'real') })

  it('proposes the same things either way', () => {
    // The history differs in what happened, not in what is available. Anything
    // that moves below is the outcomes moving it.
    expect(cold.trace.proposed.map((row) => row.id).sort()).toEqual(
      warm.trace.proposed.map((row) => row.id).sort(),
    )
  })

  it('rates the move higher after it has actually worked', () => {
    expect(dimensionOf(warm, CLEAR_THE_KITCHEN, 'immediate-benefit')).toBeGreaterThan(
      dimensionOf(cold, CLEAR_THE_KITCHEN, 'immediate-benefit'),
    )
  })

  it('leaves the move it learnt nothing about exactly where it was', () => {
    expect(dimensionOf(warm, GO_FOR_A_WALK, 'immediate-benefit')).toBe(
      dimensionOf(cold, GO_FOR_A_WALK, 'immediate-benefit'),
    )
  })

  it('changes which move wins', () => {
    /*
     * The gate item: a completed action demonstrably changes later reasoning.
     *
     * On this evening the kitchen wins on the priors alone. A fortnight in
     * which walking left the owner better four times and clearing the kitchen
     * did nothing for them three times changes the answer — and nothing else
     * about the two histories differs, so that is the outcomes doing it rather
     * than the fixture.
     *
     * It takes a fortnight rather than an evening on purpose. `PATIENCE` is 3,
     * so a single comparable result moves a belief a quarter of the way and no
     * further (D-046). A demonstration that flipped on one outcome would be
     * demonstrating a bug.
     */
    const walked = history({
      prefix: 'OW',
      past: [
        ...[2, 5, 8, 12].map((day) => ({
          verb: 'move' as const,
          object: A_WALK,
          domain: DOMAIN.health,
          on: `2026-05-${String(day).padStart(2, '0')}`,
          context: evening(),
          ending: 'completed' as const,
          effect: 'real' as const,
        })),
        ...clearedTheKitchen([3, 7, 11], 'completed', 'harm'),
      ],
    })

    expect(cold.evaluation?.candidate.id).toBe(CLEAR_THE_KITCHEN)
    expect(walked.evaluation?.candidate.id).toBe(GO_FOR_A_WALK)
    expect(walked.explanation?.rendered.sentence).toContain('a walk')
  })

  it('says out loud what it is resting on, and names what it is about', () => {
    /*
     * This asserted _"**Reset a space** has worked a few times…"_ until QA-83-002.
     *
     * "Reset a space" is `verbLabel` — the eyebrow word on a recommendation
     * card — and it was the only name the learning layer could reach, because
     * the table that names an action with its subject in it lived in
     * `insights.ts`, above it. So the belief sentence and the button that
     * corrects it said one thing while the headline and the evidence panel said
     * another, on one screen.
     *
     * The count is untouched and so is the belief's scope: what changed is the
     * noun. Every episode behind this belief is the same kitchen, which is the
     * condition under which the object may be named at all.
     */
    expect(warm.explanation?.restsOn).toBe(
      'Clearing the kitchen has worked a few times in situations like tonight.',
    )
    expect(warm.explanation?.restsOnNamed).toBe('Clearing the kitchen')
    expect(cold.explanation?.restsOn).toBeUndefined()
  })

  it('shows the inspector how much learning there was', () => {
    const row = learningOf(warm, CLEAR_THE_KITCHEN)
    expect(row?.samples).toBe(3)
    expect(row?.pull).toBeGreaterThan(0)
    expect(row?.evidence).toHaveLength(3)
    expect(row?.startedAt.now).toBe(profileFor('reset-space').now)
    expect(row?.landedAt.now).toBeGreaterThan(profileFor('reset-space').now)
  })
})

describe('a move with two aspects is not rewarded twice — DEF-0020', () => {
  /*
   * `reset-space` is the only move that produces both a direct result and a
   * downstream effect, which makes it the one place double counting could
   * happen. One good evening produces two answers — the kitchen got cleared,
   * and the evening went better — and if both fed positive dimensions, a move
   * with a decomposable outcome would out-rank an identical move with a simple
   * one. That advantage would come from the taxonomy, not from the world.
   *
   * What stops it: the prior for a direct result is that a move achieves what
   * it is for, so **achieving it sits at the prior and says nothing**. The
   * result can only ever count against. Same rule as `follow-through` after
   * DEF-0019, and the same reason — an absence may not be asserted from
   * ignorance.
   */
  const landed = history({
    prefix: 'OD',
    past: clearedTheKitchen([5, 8, 12], 'completed', 'real', evening(), 'all'),
  })

  it('reads both answers', () => {
    const row = learningOf(landed, CLEAR_THE_KITCHEN)
    expect(row?.samples).toBe(3)
    expect(row?.result.samples).toBe(3)
    expect(row?.result.reached).toBe(1)
  })

  it('takes no credit at all for having landed', () => {
    // The whole of the double-counting guard, in one assertion: a dimension
    // that abstains contributes nothing to a weighted mean, including to its
    // denominator.
    expect(dimensionWeight(landed, CLEAR_THE_KITCHEN, 'direct-result')).toBe(0)
  })

  it('counts one good evening once', () => {
    const positives = positiveDimensions(landed, CLEAR_THE_KITCHEN)
    expect(positives).toContain('immediate-benefit')
    expect(positives).not.toContain('direct-result')
  })

  it('scores exactly as it would if the result had never been asked', () => {
    // Held still except for the result answers. If landing were rewarded, the
    // two would differ — which is what the mutation test reintroduces.
    const effectOnly = history({
      prefix: 'OD',
      past: clearedTheKitchen([5, 8, 12], 'completed', 'real'),
    })
    const withResult = landed.trace.ranking.find((row) => row.id === CLEAR_THE_KITCHEN)
    const without = effectOnly.trace.ranking.find((row) => row.id === CLEAR_THE_KITCHEN)
    expect(withResult?.score).toBe(without?.score)
  })

  it('counts against the move when it only half lands', () => {
    // The other direction, so the dimension is not merely inert.
    const halfLanded = history({
      prefix: 'OH',
      past: clearedTheKitchen([5, 8, 12], 'completed', 'real', evening(), 'part'),
    })
    expect(dimensionOf(halfLanded, CLEAR_THE_KITCHEN, 'direct-result')).toBeLessThan(0)
    expect(dimensionWeight(halfLanded, CLEAR_THE_KITCHEN, 'direct-result')).toBeGreaterThan(0)
    expect(learningOf(halfLanded, CLEAR_THE_KITCHEN)?.result.reached).toBeLessThan(1)

    // And it is a claim about landing, not about being blocked. Nothing ever
    // got in the way on these evenings.
    expect(learningOf(halfLanded, CLEAR_THE_KITCHEN)?.followThrough.rate).toBe(1)
  })
})

describe('comfort is learned as friction, and only as friction', () => {
  /*
   * Section 10 asks the app to learn how comfortable something felt. Unlike
   * result and follow-through this is signed both ways, and for a principled
   * reason: their priors are ceilings, so only failure is informative.
   * Friction's prior is a middling guess per move, so "easier for you than it
   * looks" is real news.
   */
  const reached = (comfort: 'easy' | 'awkward' | 'hard') =>
    history({
      prefix: comfort === 'easy' ? 'CE' : 'CH',
      past: [5, 8, 12].map((day) => ({
        verb: 'reset-space' as const,
        object: KITCHEN,
        domain: DOMAIN.home,
        on: `2026-05-${String(day).padStart(2, '0')}`,
        context: evening(),
        ending: 'completed' as const,
        comfort,
      })),
    })

  it('makes a move that felt easy cheaper to start', () => {
    const easy = reached('easy')
    expect(dimensionOf(easy, CLEAR_THE_KITCHEN, 'friction')).toBeGreaterThan(
      dimensionOf(history(), CLEAR_THE_KITCHEN, 'friction'),
    )
    expect(learningOf(easy, CLEAR_THE_KITCHEN)?.friction.landed).toBeLessThan(
      profileFor('reset-space').friction,
    )
  })

  it('makes a move that felt like hard work dearer', () => {
    const hard = reached('hard')
    expect(learningOf(hard, CLEAR_THE_KITCHEN)?.friction.landed).toBeGreaterThan(
      profileFor('reset-space').friction,
    )
  })

  it('says nothing about whether the move works', () => {
    // The separation, asserted rather than assumed: comfort is not an effect.
    const hard = reached('hard')
    expect(learningOf(hard, CLEAR_THE_KITCHEN)?.samples).toBe(0)
    expect(dimensionOf(hard, CLEAR_THE_KITCHEN, 'immediate-benefit')).toBe(
      dimensionOf(history(), CLEAR_THE_KITCHEN, 'immediate-benefit'),
    )
  })

  it('leaves the immutable prior where it was', () => {
    const hard = reached('hard')
    expect(learningOf(hard, CLEAR_THE_KITCHEN)?.friction.started).toBe(
      profileFor('reset-space').friction,
    )
    expect(profileFor('reset-space').friction).toBe(0.35)
  })
})

describe('a rejection is not evidence that the move is ineffective', () => {
  /*
   * Section 20's first rule, and the one an app gets wrong by being reasonable:
   * the owner keeps saying no, so the app quietly concludes the move does not
   * work and stops offering it — having learned nothing except that it was
   * ignored.
   *
   * The separation here is structural rather than careful. Declines are only
   * ever read by `appetiteFor`, which only ever reaches `owner-preference`.
   * There is no branch that could route one to `immediate-benefit`, so this
   * cannot be broken by an edit that forgets the rule.
   */
  const refused = history({ past: clearedTheKitchen([5, 8, 12], 'declined') })
  const cold = history()

  it('moves nothing about how well the move works', () => {
    expect(dimensionOf(refused, CLEAR_THE_KITCHEN, 'immediate-benefit')).toBe(
      dimensionOf(cold, CLEAR_THE_KITCHEN, 'immediate-benefit'),
    )
    expect(dimensionOf(refused, CLEAR_THE_KITCHEN, 'next-day-effect')).toBe(
      dimensionOf(cold, CLEAR_THE_KITCHEN, 'next-day-effect'),
    )
    expect(learningOf(refused, CLEAR_THE_KITCHEN)?.samples).toBe(0)
  })

  it('records it as what it is — the owner saying no', () => {
    expect(dimensionOf(refused, CLEAR_THE_KITCHEN, 'owner-preference')).toBeLessThan(0)
    const row = learningOf(refused, CLEAR_THE_KITCHEN)
    expect(row?.appetite.samples).toBe(3)
    expect(row?.appetite.note).toBe('passed on 3 times before in situations like this')
  })

  it('never says a refused move does not work', () => {
    for (const row of refused.trace.learning) {
      expect(row.appetite.note).not.toMatch(/work|help|effective/i)
    }
  })

  it('counts asking for something else for less than a refusal', () => {
    const another = history({ past: clearedTheKitchen([5, 8, 12], 'try-another') })
    expect(dimensionOf(another, CLEAR_THE_KITCHEN, 'owner-preference')).toBeGreaterThan(
      dimensionOf(refused, CLEAR_THE_KITCHEN, 'owner-preference'),
    )
    expect(dimensionOf(another, CLEAR_THE_KITCHEN, 'owner-preference')).toBeLessThan(0)
  })
})

describe('unable-now is evidence about the situation', () => {
  /*
   * Section 20's second rule. "I can't right now" says something about the
   * evening — she is still awake, the call ran over — and nothing whatever
   * about whether the move is any good. It has one destination.
   */
  const blocked = history({ past: clearedTheKitchen([5, 8, 12], 'unable-now') })
  const cold = history()

  it('says nothing about how well the move works', () => {
    expect(dimensionOf(blocked, CLEAR_THE_KITCHEN, 'immediate-benefit')).toBe(
      dimensionOf(cold, CLEAR_THE_KITCHEN, 'immediate-benefit'),
    )
    expect(learningOf(blocked, CLEAR_THE_KITCHEN)?.samples).toBe(0)
  })

  it('says nothing about whether the owner wants it', () => {
    // A decline and an inability are different things, and this is the pair
    // that proves the code treats them differently rather than saying so.
    expect(dimensionOf(blocked, CLEAR_THE_KITCHEN, 'owner-preference')).toBe(0)
  })

  it('lowers how likely it is to actually happen on an evening like this', () => {
    expect(dimensionOf(blocked, CLEAR_THE_KITCHEN, 'follow-through')).toBeLessThan(0)
    expect(learningOf(blocked, CLEAR_THE_KITCHEN)?.followThrough.rate).toBeLessThan(1)
  })

  it('costs nothing at all when nothing has ever been blocked', () => {
    // A dimension with no evidence must not drag the score toward the middle:
    // adding one that did turned a walk that had been worth doing into no
    // action, purely by widening the denominator.
    const row = cold.trace.ranking.find((entry) => entry.id === CLEAR_THE_KITCHEN)
    const dimension = row?.dimensions.find((entry) => entry.name === 'follow-through')
    expect(dimension?.weight).toBe(0)
  })
})

describe('one success is not proof', () => {
  /*
   * Section 20's third rule. The arithmetic is `n / (n + PATIENCE)`, so a
   * single comparable evening moves the starting belief a quarter of the way
   * and no further. That is a deliberate number and it is worth being able to
   * read off the trace.
   */
  const prior = profileFor('reset-space').now
  const once = history({ past: clearedTheKitchen([8], 'completed', 'real') })
  const often = history({ past: clearedTheKitchen([5, 6, 8, 9, 12, 13], 'completed', 'real') })

  it('moves the belief a little, not all the way', () => {
    const row = learningOf(once, CLEAR_THE_KITCHEN)
    expect(row?.samples).toBe(1)
    expect(row?.pull).toBeLessThan(0.3)
    expect(row?.landedAt.now).toBeGreaterThan(prior)
    // Nowhere near what one good evening on its own would suggest.
    expect(row?.landedAt.now).toBeLessThan(0.6)
  })

  it('moves it further as the evidence piles up', () => {
    const one = learningOf(once, CLEAR_THE_KITCHEN)
    const many = learningOf(often, CLEAR_THE_KITCHEN)
    expect(many?.pull ?? 0).toBeGreaterThan(one?.pull ?? 0)
    expect(many?.landedAt.now ?? 0).toBeGreaterThan(one?.landedAt.now ?? 0)
  })

  it('never reaches the observation outright', () => {
    // Even six comparable evenings leave the prior with a say, which is what
    // makes a seventh contradictory one able to pull it back.
    expect(learningOf(often, CLEAR_THE_KITCHEN)?.landedAt.now).toBeLessThan(0.85)
  })

  it('is the patience the constant says it is', () => {
    // One perfectly comparable evening, weighted at very nearly 1.
    const row = learningOf(once, CLEAR_THE_KITCHEN)
    const weight = row?.pull ?? 0
    const implied = (weight * PATIENCE) / (1 - weight)
    expect(implied).toBeGreaterThan(0.7)
    expect(implied).toBeLessThanOrEqual(1)
  })
})

describe('context similarity matters more than date proximity', () => {
  /*
   * Section 20's fourth rule, and the one that separates this from a running
   * average. "What worked in situations like this one" is a different question
   * from "what worked recently", and when they disagree the first one wins.
   */
  /*
   * The two comparisons below carry a weekday and a week's load because every
   * context the app writes now carries them — AUD-0007. The claims are the ones
   * this file has always made; what changed is that the fixture is a picture of
   * a real record again. `evening()` without them is history from before this
   * phase, and the comparison it gets is asserted in
   * `tests/synthetic/rhythm-and-load.test.ts`, which is where the new features
   * are the subject rather than the backdrop.
   */
  const RECORDED = { dayOfWeek: 3, load: 'ordinary' } as const

  it('scores a like evening above an unlike one', () => {
    const tonight = evening(RECORDED)
    const alike = evening(RECORDED)
    const different = evening({
      block: 'morning',
      strain: 'severe',
      usableMinutes: 15,
      weekend: true,
      dayOfWeek: 6,
      load: 'heavy',
    })

    expect(similarity(tonight, alike)).toBeGreaterThan(0.9)
    expect(similarity(tonight, different)).toBeLessThan(RECOGNISABLE)
  })

  it('does not call two evenings alike on the strength of shared ignorance', () => {
    // Neither of these recorded whether she was there. That is not a match, and
    // it is not a mismatch either — G-009's rule, applied to comparison rather
    // than to values. Two evenings that actually agree score higher.
    const neitherKnows = similarity(evening(RECORDED), evening(RECORDED))
    const bothKnow = similarity(
      evening({ ...RECORDED, childPresent: true }),
      evening({ ...RECORDED, childPresent: true }),
    )

    expect(neitherKnows).toBeLessThan(1)
    expect(bothKnow).toBe(1)
    expect(bothKnow).toBeGreaterThan(neitherKnows)
  })

  it('lets an old similar evening outweigh a recent unlike one', () => {
    // Two months ago and exactly like tonight, against yesterday and nothing
    // like it. The old one counts and the recent one does not count at all.
    const old = recencyFactor(60) * 1
    const recent = recencyFactor(1) * 0.3
    expect(old).toBeGreaterThan(recent)
  })

  it('ignores an evening that is nothing like this one', () => {
    const unlike = history({
      past: clearedTheKitchen(
        [5, 8, 12],
        'completed',
        'real',
        evening({ block: 'morning', strain: 'severe', usableMinutes: 15 }),
      ),
    })
    expect(learningOf(unlike, CLEAR_THE_KITCHEN)?.samples).toBe(0)
    expect(unlike.explanation?.restsOn).toBeUndefined()
  })

  it('never lets old evidence stop counting entirely', () => {
    // Section 16: old evidence "remains visible but may be less predictive".
    // The floor is what keeps a life season from being deleted.
    expect(recencyFactor(3650)).toBeGreaterThan(0.5)
    expect(recencyFactor(0)).toBe(1)
  })

  it('treats a context nobody recorded as no evidence about tonight', () => {
    // An episode with no context cannot claim to resemble anything. It is still
    // history; it is not evidence about a situation.
    const noContext = history({
      extra: (kit) => {
        const nextId = sequentialRecordIds('OLNC')
        const build = createRecordFactory({
          zone: kit.zone,
          provenance: LIFECYCLE_PROVENANCE,
          nextId,
        })
        const when = kit.local('2026-05-08', '19:30')
        const recommendation = build(
          'action-recommendation',
          { occurredAt: when, domains: [DOMAIN.home], entities: [KITCHEN] },
          {
            recommendation: {
              subject: KITCHEN,
              domain: DOMAIN.home,
              target: { verb: 'reset-space', object: KITCHEN },
              whyNow: { trigger: 'good-conditions', summary: '', evidence: [] },
              evidence: [],
            },
          },
        )
        return [
          recommendation,
          build(
            'action-completion',
            { occurredAt: when, domains: [DOMAIN.home] },
            { recommendation: recommendation.id },
          ),
          build(
            'outcome',
            { occurredAt: (when + 3_600_000) as Instant, domains: [DOMAIN.home] },
            {
              about: recommendation.id,
              aspect: 'effect',
              observation: { type: 'scale', value: 3, of: 3 },
              sentiment: 'better',
            },
          ),
        ]
      },
    })

    expect(learningOf(noContext, CLEAR_THE_KITCHEN)?.samples).toBe(0)
  })
})

describe('same-block and next-day effects can differ', () => {
  /*
   * Section 20's fifth rule, and it falls out of asking at the right time
   * rather than being asserted. A move judged twenty minutes later has said
   * something about that evening. A move judged the next morning has said
   * something about the morning. Neither answers for the other, so neither is
   * allowed to move the other's number.
   */
  it('moves only the number the question was about', () => {
    const warm = history({ past: clearedTheKitchen([5, 8, 12], 'completed', 'real') })
    const row = learningOf(warm, CLEAR_THE_KITCHEN)
    const prior = profileFor('reset-space')

    expect(profileFor('reset-space').outcome.when).toBe('same-block')
    expect(row?.moved).toBe('now')
    expect(row?.landedAt.now).not.toBe(prior.now)
    expect(row?.landedAt.tomorrow).toBe(prior.tomorrow)
  })

  it('moves the other one for a move judged the next morning', () => {
    // A recovery night cannot be judged at 23:05, so what it teaches is about
    // tomorrow — and that is where it lands.
    expect(profileFor('protect-sleep').outcome.when).toBe('next-morning')
    expect(profileFor('wind-down').outcome.when).toBe('next-morning')
    expect(profileFor('recover').outcome.when).toBe('next-morning')
  })
})

describe('a learned effect is reversible', () => {
  /*
   * Section 20's sixth rule. Nothing is stored: every number is recomputed from
   * the whole history on every decision, so contradicting evidence pulls a
   * belief back by the same arithmetic that built it. There is no cached
   * conclusion to go stale, which is the only way "reversible" is ever true in
   * practice.
   */
  const helped = history({ past: clearedTheKitchen([5, 6, 8], 'completed', 'real') })
  const thenDidNot = history({
    past: [
      ...clearedTheKitchen([5, 6, 8], 'completed', 'real'),
      ...clearedTheKitchen([12, 13, 14], 'completed', 'harm'),
    ],
  })

  it('pulls the belief back when later evenings disagree', () => {
    expect(learningOf(thenDidNot, CLEAR_THE_KITCHEN)?.landedAt.now).toBeLessThan(
      learningOf(helped, CLEAR_THE_KITCHEN)?.landedAt.now ?? 1,
    )
  })

  it('stops claiming the move works', () => {
    expect(helped.explanation?.restsOn).toMatch(/has worked/)
    const row = learningOf(thenDidNot, CLEAR_THE_KITCHEN)
    expect(row?.summary ?? '').not.toMatch(/has worked/)
  })

  it('goes below the starting belief when the evidence keeps going', () => {
    const alwaysWorse = history({
      past: clearedTheKitchen([5, 6, 8, 12, 13, 14], 'completed', 'harm'),
    })
    expect(learningOf(alwaysWorse, CLEAR_THE_KITCHEN)?.landedAt.now).toBeLessThan(
      profileFor('reset-space').now,
    )
  })
})

// ---------------------------------------------------------------------------
// Section 62 — the owner corrects a learned belief
// ---------------------------------------------------------------------------

describe('the owner can correct a learned belief', () => {
  /*
   * Section 62: the app "should preserve the correction and stop reasserting
   * the old belief unless new evidence genuinely supports revisiting it".
   *
   * A learned belief is not one row, so a correction cannot retract one — and
   * retracting the outcomes underneath it would throw away what the owner
   * actually observed, which is worse than the belief. So the correction is a
   * watershed: everything the owner has already seen and disagreed with stops
   * counting, and what happens afterwards counts normally. That is what "new
   * evidence" means here, and it needs no threshold nobody chose.
   */
  const learned = clearedTheKitchen([5, 6, 8], 'completed', 'real')

  function correctedOn(day: string, stance: 'reject' | 'restore') {
    return (kit: ReturnType<typeof createKit>): readonly CanonicalRecord[] => {
      const build = createRecordFactory({
        zone: kit.zone,
        provenance: { source: 'owner', writtenBy: 'now' },
        nextId: sequentialRecordIds(`OLC${stance.charAt(0).toUpperCase()}`),
      })
      return [
        build(
          'belief-correction',
          { occurredAt: kit.local(day, '21:00'), domains: [DOMAIN.home] },
          {
            belief: beliefKey('effect', 'reset-space'),
            stance,
            reason: 'That is not what happened',
          },
        ),
      ]
    }
  }

  it('stops asserting the belief once the owner says it is wrong', () => {
    const before = history({ past: learned })
    const after = history({ past: learned, extra: correctedOn('2026-05-15', 'reject') })

    expect(before.explanation?.restsOn).toBeDefined()
    expect(after.explanation?.restsOn).toBeUndefined()
    expect(learningOf(after, CLEAR_THE_KITCHEN)?.samples).toBe(0)
    expect(learningOf(after, CLEAR_THE_KITCHEN)?.corrected).toBe(true)
  })

  it('puts the belief back where the starting one was', () => {
    const after = history({ past: learned, extra: correctedOn('2026-05-15', 'reject') })
    expect(learningOf(after, CLEAR_THE_KITCHEN)?.landedAt.now).toBe(profileFor('reset-space').now)
  })

  it('still counts what happens after the correction', () => {
    const andThen = history({
      past: [...learned, ...clearedTheKitchen([16, 17], 'completed', 'real')],
      extra: correctedOn('2026-05-15', 'reject'),
    })
    // The two evenings after the correction, and neither of the three before it.
    expect(learningOf(andThen, CLEAR_THE_KITCHEN)?.samples).toBe(2)
  })

  it('lets the owner change their mind back', () => {
    const restored = history({
      past: learned,
      extra: (kit) => [
        ...correctedOn('2026-05-15', 'reject')(kit),
        ...correctedOn('2026-05-16', 'restore')(kit),
      ],
    })
    expect(learningOf(restored, CLEAR_THE_KITCHEN)?.samples).toBe(3)
    expect(learningOf(restored, CLEAR_THE_KITCHEN)?.corrected).toBe(false)
  })

  it('offers the owner the belief it is actually resting on', () => {
    const warm = history({ past: learned })
    expect(warm.explanation?.restsOnBelief).toBe('effect:reset-space')
  })

  it('touches no other belief', () => {
    const both = history({
      past: [
        ...learned,
        {
          verb: 'move',
          object: A_WALK,
          domain: DOMAIN.health,
          on: '2026-05-09',
          context: evening(),
          ending: 'completed',
          effect: 'real',
        },
      ],
      extra: correctedOn('2026-05-15', 'reject'),
    })

    expect(learningOf(both, CLEAR_THE_KITCHEN)?.samples).toBe(0)
    expect(learningOf(both, GO_FOR_A_WALK)?.samples).toBe(1)
  })
})
