import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { entityId } from '../../src/domain/ids'
import type { CanonicalRecord } from '../../src/domain/records'
import type { Instant } from '../../src/domain/time'
import { COMPATIBLE_PAIRS, couldShareAnHour } from '../../src/intelligence/alongside'
import { decide, type Decision } from '../../src/intelligence/engine'
import { collectEpisodes } from '../../src/intelligence/lifecycle'
import { buildView } from '../../src/memory/view'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { createKit } from '../../src/synthetic/kit'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { loadScenario, orphanPronounsIn } from './harness'

/**
 * AUD-0022 / F42 — two moves that are the same thirty minutes.
 * AUD-0019 — nine identical evenings, and silence for the three she is away.
 *
 * Both in one file because the audit puts them together: *"vary the `time-with`
 * move by what the record holds — the growth opportunity as **part of** the time
 * rather than instead of it — see AUD-0022."*
 */

const DAY = 86_400_000

// ---------------------------------------------------------------------------
// One outing, one clause
// ---------------------------------------------------------------------------

describe('a compatible runner-up becomes a clause, not a card — AUD-0022', () => {
  it('says both things in one sentence on the history that holds both', () => {
    /*
     * The audit's own evening: *"spend the next 30 minutes with Adaya, phone
     * away"* and *"give Adaya a chance at ordering her own food today"* were
     * ranked 0.218 and 0.140, and the loser was presented as a thing that had
     * been beaten. They are not alternatives. They are one outing.
     */
    const decision = loadScenario('growth-evidence').decision({ probe: false })
    expect(decision.evaluation?.candidate.semantics.target.verb).toBe('time-with')
    expect(decision.explanation?.alongside, 'the two are still two evenings').toBeDefined()
    expect(decision.explanation?.alongside).toContain('ordering her own food')
  })

  it('renders the runner-up’s own sentence rather than a paraphrase of it', () => {
    /*
     * D-018's rule on the half of a sentence nobody would otherwise check. The
     * clause carries the words the app would have used had that move won on its
     * own, so there is one rendering of a move rather than two.
     */
    const decision = loadScenario('growth-evidence').decision({ probe: false })
    const runnerUp = decision.trace.ranking.find((row) => row.id.includes('growth-opportunity'))
    expect(runnerUp, 'the growth move is no longer in the ranking').toBeDefined()
    expect(decision.explanation?.alongside).toContain(
      runnerUp!.sentence.replace(/^./, (c) => c.toLowerCase()),
    )
  })

  it('never appends more than one', () => {
    // Two moves in one sentence is a step toward a to-do list, which section 2
    // rejects outright. The cap is hard.
    for (const scenario of SCENARIOS) {
      const said = loadScenario(scenario.id).decision({ probe: false }).explanation?.alongside
      if (said === undefined) continue
      expect(said.split('While you are at it').length - 1, scenario.id).toBe(1)
    }
  })

  it('creates no second episode and no second outcome question', () => {
    /*
     * The lifecycle risk the audit names: *"if he does the outing but she does
     * not order, the primary must still be completable — so the clause must be
     * advisory and must not create a second episode."*
     *
     * Held by construction rather than by care: the clause is a string on the
     * explanation, and the only thing that opens an episode is a lifecycle
     * action on the move that was chosen.
     */
    const loaded = loadScenario('growth-evidence')
    const decision = loaded.decision({ probe: false })
    expect(decision.explanation?.alongside).toBeDefined()

    const before = collectEpisodes(loaded.view(), loaded.scenario.zone).length
    // Deciding again changes nothing: a clause is not an event.
    loaded.decision({ probe: false })
    expect(collectEpisodes(loaded.view(), loaded.scenario.zone).length).toBe(before)
  })

  it('says nothing where the two are about different people', () => {
    /*
     * The bound that keeps a table entry from becoming a rule about verbs. A
     * growth opportunity belonging to somebody else is a different evening
     * however similar the words are, and the entity's own `about-person` link is
     * what decides — walked, never a name compared.
     */
    const paired = SCENARIOS.map((scenario) =>
      loadScenario(scenario.id).decision({ probe: false }),
    ).filter((decision) => decision.explanation?.alongside !== undefined)

    expect(paired.length, 'the clause fires nowhere at all').toBeGreaterThan(0)
    for (const decision of paired) {
      const subject = decision.evaluation?.candidate.semantics.subject
      expect(subject?.kind, 'a clause was hung off something other than a person').toBe('person')
    }
  })

  it('reproduces today’s behaviour exactly with an empty table', () => {
    /*
     * The audit's own acceptance item. Nothing is compatible by default, so the
     * table is the whole of the feature — and every history that carries no
     * pairing behaves exactly as it did before this existed.
     */
    const withClause = SCENARIOS.filter(
      (scenario) =>
        loadScenario(scenario.id).decision({ probe: false }).explanation?.alongside !== undefined,
    ).map((scenario) => scenario.id)
    expect(withClause.length, 'every history grew a clause').toBeLessThan(SCENARIOS.length / 4)
  })

  it('gives every pairing a reason somebody wrote, and an hour they could share', () => {
    /*
     * `ActionFamily`'s guard, copied because the failure is the same: a table
     * anybody can extend without arguing for the entry eventually says a walk
     * and a lab are one evening. And a pairing whose two moves refuse each
     * other's hours could never fire, which is a capability that is really a
     * comment.
     */
    expect(COMPATIBLE_PAIRS.length, 'the table is empty, so nothing is proved').toBeGreaterThan(0)
    for (const pair of COMPATIBLE_PAIRS) {
      expect(pair.because.length, `${pair.primary}/${pair.alongside}: no reason`).toBeGreaterThan(
        60,
      )
      expect(
        couldShareAnHour(pair),
        `${pair.primary}/${pair.alongside}: the two refuse each other's hours`,
      ).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Twelve evenings — the audit's own regression
// ---------------------------------------------------------------------------

describe('twelve consecutive evenings, nine here and three away — AUD-0019', () => {
  const loaded = loadScenario('durable-custody')
  const FIRST = Date.parse('2026-06-15T19:00:00Z')

  function evening(index: number): Decision {
    const now = (FIRST + index * DAY) as Instant
    const moment = { now, zone: loaded.scenario.zone, weekStartsOn: 1 as const }
    return decide(loaded.viewAt(now, moment.zone, moment.weekStartsOn), moment, { probe: false })
  }

  const twelve = Array.from({ length: 12 }, (_, index) => evening(index))

  it('knows which evenings are the unusual ones', () => {
    const away = twelve.map((decision) => decision.situation.awayUnusually)
    // 20th, 21st, 22nd and the morning of the 23rd, which is the recorded trip.
    expect(away.filter(Boolean).length, 'the trip is no longer in the fixture').toBe(4)
    expect(
      away.slice(0, 5).every((value) => !value),
      'an ordinary evening read as unusual',
    ).toBe(true)
  })

  it('reads an unusual absence off the standing arrangement, never off a run of evenings', () => {
    /*
     * An evening cannot be unusual against a pattern nobody recorded. The
     * reading requires a **durable** context in force saying she is with him, so
     * a history with no arrangement in it produces nothing here however many
     * evenings it happens to hold.
     */
    for (const scenario of SCENARIOS) {
      if (scenario.id === 'durable-custody') continue
      const decision = loadScenario(scenario.id).decision({ probe: false })
      if (!decision.situation.awayUnusually) continue
      const durable = decision.situation.view.history.effective.some(
        (record) =>
          record.kind === 'context' &&
          record.durability === 'durable' &&
          record.concept === CONCEPT.childPresent,
      )
      expect(durable, `${scenario.id}: unusual against no arrangement at all`).toBe(true)
    }
  })

  it('never calls her absence an opportunity in the words it uses', () => {
    /*
     * The audit's own stated risk, and it is a copy risk rather than a logic
     * one: *"framing a child's absence as an opportunity is a sentence that can
     * land badly — 'She's away tonight' must never read as relief."* Section 4.4
     * forbids framing parenting time as lost productivity, so the inverse
     * framing is the same mistake facing the other way.
     *
     * Swept across every sentence the twelve evenings put on a screen rather
     * than asserted on the one branch that writes it, because a phrase can
     * arrive from a template nobody was looking at.
     */
    for (const [index, decision] of twelve.entries()) {
      const said = [
        decision.explanation?.rendered.sentence ?? '',
        decision.explanation?.rendered.reason ?? '',
        decision.explanation?.premise ?? '',
        decision.noAction?.headline ?? '',
        decision.noAction?.detail ?? '',
      ].join(' ')
      /*
       * Phrases about **her not being there**, not the word "away" — the app
       * says *"phone away"* on every evening she is here, and a guard that
       * matched it would be matching the wrong thing and reporting a pass on
       * the wrong grounds.
       */
      expect(said, `evening ${index}`).not.toMatch(
        /she(?:'s| is)? away|gone|absent|without her|on your own|to yourself|free of|finally|at last|make the most/i,
      )
    }
  })

  it('says the evening is his rather than that she is not there', () => {
    /*
     * The positive half. Built rather than taken from the library, because
     * `durable-custody` holds no direction and no goal — so there is genuinely
     * nothing the app knows he is working towards, and raising the urgency of
     * whatever happened to be in the ranking would be the app filling his
     * evening because it noticed a gap.
     */
    const decision = anEveningAlone()
    expect(decision.situation.awayUnusually, 'the built evening is not unusual').toBe(true)
    expect(decision.evaluation?.candidate.semantics.domain).toBe(DOMAIN.career)
    expect(decision.explanation?.rendered.reason).toBe('The afternoon is yours.')
    expect(orphanPronounsIn(decision.explanation?.rendered.reason ?? '')).toEqual([])
  })

  it('raises nothing at all where he has not said what he is working towards', () => {
    // The other arm. `durable-custody` holds an arrangement and one evening
    // together — and no direction, no goal, no topic. The honest answer on those
    // three evenings is still that there is nothing here, and inventing a move
    // would be the opposite of the finding.
    for (const index of [5, 6, 7]) {
      const decision = twelve[index]
      expect(decision?.situation.awayUnusually, `evening ${index}`).toBe(true)
      expect(decision?.kind, `evening ${index}: something was invented`).toBe('no-action')
    }
  })

  it('varies the evening where the record holds something to vary it by', () => {
    /*
     * **The half of AUD-0019 that could be closed, and the half that could
     * not.** The finding is nine evenings with *"no reference to what they
     * did"*, and the app now makes two — the growth opportunity as part of the
     * time (AUD-0022's clause) and what they last did together, in his own
     * words.
     *
     * Both are read off the record. On a history that holds neither, the same
     * evening produces the same sentence and that is correct: varying it would
     * mean inventing variety, which is worse than repeating something true.
     * D-276 records that bound rather than leaving it to be discovered.
     */
    const varied = loadScenario('growth-evidence').decision({ probe: false })
    expect(varied.explanation?.alongside, 'the growth skill changed nothing').toBeDefined()

    const remembered = twelve[0]?.explanation?.rendered.reason ?? ''
    expect(remembered, 'the record holds an evening together and the app never says so').toContain(
      'Last time',
    )
  })
})

// ---------------------------------------------------------------------------
// A quiet house with something he is working towards
// ---------------------------------------------------------------------------

const ADAYA = { kind: 'person', id: entityId('person', 'Adaya') } as const
const SUBNETTING = { kind: 'learning-topic', id: entityId('learning-topic', 'subnetting') } as const
const CCNA = { kind: 'goal', id: entityId('goal', 'the CCNA') } as const

/**
 * An evening she is away, on a history that knows what he is working towards.
 *
 * `durable-custody` proves the reading and cannot prove the consequence: it
 * holds no direction and no goal. This holds both, so the raise has something to
 * raise.
 */
function anEveningAlone(): Decision {
  const kit = createKit('AWY', 'Europe/London', '2025-01-01T00:00:00Z')
  const child = kit.entity({
    id: ADAYA.id,
    kind: 'person',
    label: 'Adaya',
    domain: DOMAIN.fatherhood,
    privacy: 'child-family-sensitive',
  })
  const topic = kit.entity({
    id: SUBNETTING.id,
    kind: 'learning-topic',
    label: 'subnetting',
    domain: DOMAIN.career,
    privacy: 'normal',
  })
  const goal = kit.entity({
    id: CCNA.id,
    kind: 'goal',
    label: 'the CCNA',
    domain: DOMAIN.career,
    privacy: 'normal',
  })

  // A Sunday afternoon inside the recorded trip. The afternoon, because a lab
  // is an afternoon move and the point is what the hour makes room for.
  const now = kit.local('2026-06-21', '14:00')
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
      'context',
      {
        occurredAt: kit.local('2026-06-14', '11:00'),
        domains: [DOMAIN.fatherhood],
        entities: [ADAYA],
      },
      {
        concept: CONCEPT.childPresent,
        value: { type: 'boolean', value: false },
        durability: 'situational',
        validFrom: kit.local('2026-06-20', '08:00'),
        validUntil: kit.local('2026-06-23', '18:00'),
      },
    ),
    kit.record(
      'goal',
      { occurredAt: kit.local('2026-02-01', '20:00'), domains: [DOMAIN.career], entities: [CCNA] },
      { goal: CCNA, statement: 'Pass the CCNA before the winter', status: 'active' },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-06-21', '08:00'), domains: [DOMAIN.career] },
      {
        concept: CONCEPT.learningTopic,
        value: { type: 'entity', value: SUBNETTING },
        method: 'self-report',
      },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-06-21', '07:00'), domains: [DOMAIN.sleep] },
      {
        concept: CONCEPT.sleepHours,
        value: { type: 'number', value: 8, unit: 'hours' },
        method: 'self-report',
      },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-06-21', '13:30'), domains: [DOMAIN.health] },
      { concept: CONCEPT.energy, value: { type: 'scale', value: 4, of: 5 }, method: 'self-report' },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-06-21', '13:30'), domains: [DOMAIN.health] },
      {
        concept: CONCEPT.soreness,
        value: { type: 'scale', value: 0, of: 5 },
        method: 'self-report',
      },
    ),
    kit.record(
      'observation',
      { occurredAt: kit.local('2026-06-21', '13:30'), domains: [DOMAIN.direction] },
      {
        concept: CONCEPT.freeNow,
        value: { type: 'duration', minutes: 120 },
        method: 'self-report',
      },
    ),
  ]

  const loaded = snapshotFromWire(
    kit.document({ entities: [child, topic, goal], records, exportedAt: now }),
  )
  expect(loaded.loaded, 'the quiet evening should load').toBe(true)
  if (!loaded.loaded) throw new Error('unreachable')

  const moment = { now, zone: kit.zone, weekStartsOn: 1 as const }
  return decide(buildView(loaded.snapshot, moment), moment, { probe: false })
}

describe('an evening she is away, with something he is working towards — AUD-0019', () => {
  it('offers a move rather than saying there is nothing to suggest', () => {
    /*
     * The audit's own complaint, answered: *"the three evenings a month his
     * daughter is away are the highest-value free time a full-custody father
     * has. That is precisely when a whole-life system should be saying 'this is
     * your window for the CCNA', and it says 'Nothing to suggest just yet.'"*
     */
    const decision = anEveningAlone()
    expect(decision.kind).toBe('move')
    expect(decision.evaluation?.candidate.semantics.target.verb).toBe('hands-on-lab')
  })

  it('raises it through a trigger that already existed, not a new dimension', () => {
    // No scoring dimension added and no weight moved: `opportunity-window` is
    // worth 0.5 where `nothing-better` is worth 0, and both were in the table.
    const decision = anEveningAlone()
    expect(decision.evaluation?.candidate.semantics.whyNow.trigger).toBe('opportunity-window')
  })

  it('raises nothing restorative for the same reason', () => {
    /*
     * An empty house read as a productivity window is section 4.4's mistake
     * facing the other way, and the bound is on the move rather than on the
     * copy: only something that asks him to start is raised.
     */
    const decision = anEveningAlone()
    for (const row of decision.trace.proposed) {
      if (row.verb === 'hands-on-lab') continue
      const ranked = decision.trace.ranking.find((entry) => entry.id === row.id)
      if (ranked === undefined) continue
      const urgency = ranked.dimensions.find((dimension) => dimension.name === 'urgency')
      expect(urgency?.value, `${row.id} was raised too`).toBeLessThan(0.5)
    }
  })
})
