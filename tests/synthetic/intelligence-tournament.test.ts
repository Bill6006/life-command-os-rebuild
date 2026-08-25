import { describe, expect, it } from 'vitest'
import { DOMAIN, type LifeDomainId } from '../../src/domain/domains'
import { sequentialRecordIds } from '../../src/domain/ids'
import {
  ARCHITECTURES,
  decide,
  sweepDayBlocks,
  type ArchitectureId,
  type SweptBlock,
} from '../../src/intelligence/engine'
import { planLifecycle } from '../../src/intelligence/lifecycle'
import { profileFor } from '../../src/intelligence/moves'
import type { Scenario } from '../../src/synthetic/kit'
import { buildView } from '../../src/memory/view'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { orphanPronounsIn } from './harness'

/**
 * The intelligence tournament (canonical plan section 18).
 *
 * > Choose the simplest architecture that clearly produces better decisions on
 * > the agreed synthetic test suite. Do not select an architecture because it
 * > sounds more advanced.
 *
 * Two architectures are compared on every profile the owner can tap:
 *
 *   **deterministic** — resolved facts, transparent rules, a ranking that can
 *   be read line by line, nothing that needs a network.
 *
 *   **hybrid** — the same pipeline, with a semantic advisor between ranking and
 *   choosing. The advisor reads the free text the rules cannot parse and may
 *   nudge a move by a bounded amount with a stated reason. It cannot add a
 *   move, remove one, phrase anything, or write a fact.
 *
 * The rubric below is fixed before either architecture runs, and every item is
 * something that can be checked rather than felt. What it deliberately does not
 * measure is how sophisticated an approach sounds.
 *
 * The result is recorded in `docs/DECISION_LOG.md`. The last test here is a
 * guard on that decision: if the hybrid ever scores strictly higher, this
 * fails, and the selection has to be made again rather than inherited.
 */

interface Expectation {
  readonly id: string
  /** The life area the decision should land in, where the scenario states one. */
  readonly domain?: LifeDomainId
  /** A word the owner should see, because the history contains it. */
  readonly names?: string
  /** Whether a move is expected at all. */
  readonly moves: boolean
}

const EXPECTED: readonly Expectation[] = [
  { id: 'running-on-empty', domain: DOMAIN.sleep, names: 'subnetting', moves: true },
  { id: 'rested-and-behind', domain: DOMAIN.career, names: 'subnetting', moves: true },
  { id: 'week-pointed-at-home', domain: DOMAIN.home, names: 'kitchen', moves: true },
  { id: 'subnetting-struggle', domain: DOMAIN.career, names: 'subnetting', moves: true },
  { id: 'durable-custody', domain: DOMAIN.fatherhood, names: 'Adaya', moves: true },
  /*
   * These four carry sleep readings and nothing about how the owner feels.
   *
   * They expected a move until the owner's phone test asked what evidence the
   * walk was winning on. The answer was none worth having: strain can be worked
   * out from sleep alone, which was enough to fire the movement generator on a
   * history that knew nothing about energy or soreness. Saying nothing and
   * asking one question is the honest answer, and one tap turns each of them
   * into a walk with a reason that is actually about the walk.
   */
  { id: 'mostly-unknown', moves: false },
  { id: 'corrections', moves: false },
  { id: 'malformed-history', moves: false },
  { id: 'quiet-fortnight', moves: false },
  { id: 'across-timezones', moves: false },
  /*
   * A month of history read three weeks later. Every reading in it has aged
   * out — and the custody arrangement has not, because durable context does not
   * expire. So the one thing the app can still act on is the one thing that was
   * never a reading, which is the point of the scenario.
   */
  { id: 'gone-quiet', domain: DOMAIN.fatherhood, names: 'Adaya', moves: true },
]

interface Card {
  readonly profile: string
  readonly chosen: string
  readonly sentence: string
  readonly reason: string
  readonly points: number
  readonly outOf: number
  readonly missed: readonly string[]
}

function scoreOne(architecture: ArchitectureId, expectation: Expectation): Card {
  const scenario = SCENARIOS.find((entry) => entry.id === expectation.id)
  if (scenario === undefined) throw new Error(`no scenario "${expectation.id}"`)

  const loaded = snapshotFromWire(scenario.build())
  const moment = { now: scenario.now, zone: scenario.zone }
  const decision = decide(buildView(loaded.snapshot, moment), moment, { architecture })
  const again = decide(buildView(loaded.snapshot, moment), moment, { architecture })

  const sentence = decision.explanation?.rendered.sentence ?? ''
  const reason = decision.explanation?.rendered.reason ?? ''
  const chosen = decision.evaluation?.candidate.id ?? `nothing:${decision.noAction?.reason ?? '?'}`
  const missed: string[] = []
  let points = 0
  let outOf = 0

  const check = (name: string, ok: boolean): void => {
    outOf += 1
    if (ok) points += 1
    else missed.push(name)
  }

  check(
    'decides the right kind of thing',
    decision.kind === (expectation.moves ? 'move' : 'no-action'),
  )
  check(
    'says the same thing twice',
    chosen === (again.evaluation?.candidate.id ?? `nothing:${again.noAction?.reason ?? '?'}`),
  )
  check('explains itself', decision.kind === 'no-action' || reason.length > 0)
  check('keeps the noun', decision.kind === 'no-action' || orphanPronounsIn(sentence).length === 0)
  check(
    'says something particular',
    decision.kind === 'no-action' || /\d/.test(reason) || reason.length > 30,
  )

  if (expectation.domain !== undefined) {
    check(
      `lands in ${expectation.domain}`,
      decision.evaluation?.candidate.semantics.domain === expectation.domain,
    )
  }
  if (expectation.names !== undefined) {
    check(
      `names ${expectation.names}`,
      sentence.toLowerCase().includes(expectation.names.toLowerCase()),
    )
  }

  /*
   * The three the audit added — AUD-0039(b).
   *
   * The original rubric measured things the deterministic layer is already good
   * at: decides the right kind of thing, reaches the same answer twice, explains
   * itself, keeps the noun, lands in the expected life area. It contained
   * nothing a model would be uniquely good at and rules uniquely bad at — which
   * is exactly the class this audit is full of — so "no difference" was weak
   * evidence of equivalence rather than strong evidence.
   *
   * These three are the classes the audit found by reading the deployed build:
   * a five-hour morning treated as one moment, the identical sentence at four
   * separate hours of one day, and an approach that is never abandoned. They
   * are checked on the same histories at every hour rather than at the one hour
   * each was written for, which is what makes them able to fail.
   */
  const day = sweepDayBlocks(buildView(loaded.snapshot, moment), moment, { architecture })

  check('gets the hour right', day.every(suitsItsOwnHour))
  check('does not repeat itself across the day', saysSomethingNew(day))
  check('notices when an approach is not landing', stopsAfterRefusals(scenario, architecture))

  return { profile: expectation.id, chosen, sentence, reason, points, outOf, missed }
}

/**
 * Whether the app offered a move the hour actually suits — AUD-0039(b).
 *
 * Not "was it allowed": the filter already removes what a block refuses. This
 * is the stronger question the audit asks, and the one a deep-work task on a
 * school morning fails: a move that is merely *tolerated* by the hour should be
 * held for an hour that suits it, or not offered.
 *
 * Saying nothing passes, and so does a deferral. Both are the app declining to
 * put the wrong thing in the wrong hour, which is the behaviour being measured.
 */
function suitsItsOwnHour(swept: SweptBlock): boolean {
  const decision = swept.decision
  if (decision.kind !== 'move') return true
  const verb = decision.evaluation?.candidate.semantics.target.verb
  if (verb === undefined) return false
  return profileFor(verb).suits.includes(swept.block)
}

/**
 * Whether the day contains more than one answer — AUD-0039(b).
 *
 * Counted over the hours the app actually offers something. A history it has
 * nothing to say about says nothing at every hour, and that is one honest
 * answer repeated rather than the defect: the audit's complaint is about four
 * *suggestions* being the same sentence, not about a near-empty store being
 * consistently empty.
 */
function saysSomethingNew(day: readonly SweptBlock[]): boolean {
  const spoken = day
    .filter((swept) => swept.decision.kind === 'move' || swept.decision.kind === 'hold')
    .map((swept) => swept.decision.explanation?.rendered.sentence ?? '?')
  if (spoken.length <= 1) return true
  return new Set(spoken).size > 1
}

/**
 * Whether the app stops when an approach is plainly not landing — AUD-0039(b).
 *
 * Three refusals in one block, and the question is whether anything changes.
 * The audit's own example is a topic still un-reviewed six days later with the
 * same sentence offered every evening: nothing said "this is the third time",
 * nothing escalated, nothing gave up.
 *
 * A history that offers nothing to refuse passes: there is no approach to
 * abandon, which is a different state and not a failure.
 */
function stopsAfterRefusals(scenario: Scenario, architecture: ArchitectureId): boolean {
  const loaded = snapshotFromWire(scenario.build())
  const moment = { now: scenario.now, zone: scenario.zone }
  let snapshot = loaded.snapshot
  let first: string | undefined

  for (let round = 0; round < 3; round += 1) {
    const view = buildView(snapshot, moment)
    const decision = decide(view, moment, { architecture })
    const explanation = decision.explanation
    if (explanation === undefined) return true
    if (first === undefined) first = explanation.rendered.sentence

    const planned = planLifecycle({
      view,
      situation: decision.situation,
      semantics: explanation.semantics,
      action: 'decline',
      recordedAt: (moment.now + (round + 1) * 1000) as typeof moment.now,
      nextId: sequentialRecordIds(`TRN${round}`),
    })
    snapshot = { ...snapshot, records: [...snapshot.records, ...planned.records] }
  }

  const after = decide(buildView(snapshot, moment), moment, { architecture })
  // Either it has stopped offering, or it is offering something else. What it
  // may not do is come back with the same sentence a fourth time.
  return after.explanation?.rendered.sentence !== first
}

function runFor(architecture: ArchitectureId): readonly Card[] {
  return EXPECTED.map((expectation) => scoreOne(architecture, expectation))
}

const results = new Map<ArchitectureId, readonly Card[]>(
  ARCHITECTURES.map((architecture) => [architecture, runFor(architecture)]),
)

function totalFor(architecture: ArchitectureId): { points: number; outOf: number } {
  const cards = results.get(architecture) ?? []
  return {
    points: cards.reduce((sum, card) => sum + card.points, 0),
    outOf: cards.reduce((sum, card) => sum + card.outOf, 0),
  }
}

const disagreements = EXPECTED.filter((expectation) => {
  const deterministic = results
    .get('deterministic')
    ?.find((card) => card.profile === expectation.id)
  const hybrid = results.get('hybrid')?.find((card) => card.profile === expectation.id)
  return deterministic?.chosen !== hybrid?.chosen
})

describe('the tournament', () => {
  it('runs every profile through both architectures', () => {
    for (const architecture of ARCHITECTURES) {
      expect(results.get(architecture)?.length, architecture).toBe(EXPECTED.length)
    }
  })

  it('prints the table the decision was made from', () => {
    const lines: string[] = ['', 'Intelligence tournament — golden synthetic profiles', '']
    lines.push(
      `| Profile | ${ARCHITECTURES.map((a) => a).join(' | ')} | chose the same |`,
      `| --- | ${ARCHITECTURES.map(() => '---').join(' | ')} | --- |`,
    )
    for (const expectation of EXPECTED) {
      const cells = ARCHITECTURES.map((architecture) => {
        const card = results.get(architecture)?.find((entry) => entry.profile === expectation.id)
        return `${card?.points ?? 0}/${card?.outOf ?? 0}`
      })
      const same = disagreements.some((entry) => entry.id === expectation.id) ? 'no' : 'yes'
      lines.push(`| ${expectation.id} | ${cells.join(' | ')} | ${same} |`)
    }
    lines.push(
      `| **total** | ${ARCHITECTURES.map((a) => {
        const total = totalFor(a)
        return `**${total.points}/${total.outOf}**`
      }).join(' | ')} | |`,
    )
    lines.push('')
    for (const architecture of ARCHITECTURES) {
      for (const card of results.get(architecture) ?? []) {
        if (card.missed.length > 0)
          lines.push(`${architecture} · ${card.profile}: ${card.missed.join('; ')}`)
      }
    }
    console.log(lines.join('\n'))

    expect(lines.length).toBeGreaterThan(0)
  })

  it('has a deterministic baseline that gets everything right', () => {
    const cards = results.get('deterministic') ?? []
    for (const card of cards) {
      expect(card.missed, `${card.profile}: ${card.sentence}`).toEqual([])
    }
  })

  it('is reproducible — the same history decides the same way twice', () => {
    for (const architecture of ARCHITECTURES) {
      for (const card of results.get(architecture) ?? []) {
        expect(card.missed, `${architecture} ${card.profile}`).not.toContain(
          'says the same thing twice',
        )
      }
    }
  })
})

describe('the decision this tournament produced', () => {
  /**
   * Recorded as D-024. The rule from section 18 is "the simplest architecture
   * that **clearly** produces better decisions" — so a tie goes to the simpler
   * one, and this is the test that will notice if that stops being true.
   */
  it('shows the hybrid scoring no better than the deterministic baseline', () => {
    const simple = totalFor('deterministic')
    const complex = totalFor('hybrid')

    expect(
      complex.points,
      `the hybrid now scores ${complex.points}/${complex.outOf} against ${simple.points}/${simple.outOf} — the architecture choice in DECISION_LOG.md D-024 has to be made again`,
    ).toBeLessThanOrEqual(simple.points)
  })

  it('is not a comparison against an advisor that never spoke', () => {
    /*
     * The result "they agreed everywhere" is only worth something if the
     * advisor actually had opinions to be overruled by. On at least one profile
     * it reads the free text, forms a judgement, and has it applied — and still
     * lands where the rules already were. That is the finding: on this suite
     * the semantic reading agrees with the deterministic ranking, so it earns
     * no decisions and buys nothing.
     */
    const spoke = SCENARIOS.filter((scenario) => {
      const loaded = snapshotFromWire(scenario.build())
      const moment = { now: scenario.now, zone: scenario.zone }
      const decision = decide(buildView(loaded.snapshot, moment), moment, {
        architecture: 'hybrid',
      })
      return decision.trace.notes.some((note) => note.includes('moved'))
    })

    expect(spoke.length, 'the advisor never produced a single applied nudge').toBeGreaterThan(0)
  })

  it('keeps the hybrid path working, so the choice can be revisited', () => {
    // Selecting the baseline is not the same as deleting the alternative. The
    // hybrid still runs, still passes its guardrails, and still produces sound
    // decisions — it simply does not produce better ones yet.
    const cards = results.get('hybrid') ?? []
    expect(cards.every((card) => card.points >= card.outOf - 1)).toBe(true)
  })

  it('records where the two disagreed, if anywhere', () => {
    // Not an assertion about the count — a place for it to be visible when it
    // changes. A disagreement is the interesting case and should be looked at.
    console.log(
      disagreements.length === 0
        ? 'tournament: the two architectures agreed on every profile'
        : `tournament: they disagreed on ${disagreements.map((entry) => entry.id).join(', ')}`,
    )
    expect(disagreements.length).toBeLessThanOrEqual(EXPECTED.length)
  })
})
