import { describe, expect, it } from 'vitest'
import { DOMAIN, type LifeDomainId } from '../../src/domain/domains'
import { instant, type Instant } from '../../src/domain/time'
import type { ConceptId } from '../../src/domain/windows'
import { standingFor } from '../../src/features/life/standing'
import { decide } from '../../src/intelligence/engine'
import { nextGuideStep } from '../../src/intelligence/guide'
import { collectEpisodes, planLifecycle } from '../../src/intelligence/lifecycle'
import { outcomeWindowFor } from '../../src/intelligence/outcomes'
import {
  answerRecord,
  questionFor,
  QUESTIONS,
  type QuestionOption,
} from '../../src/intelligence/questions'
import { assembleSituation, type DomainCoverage } from '../../src/intelligence/situation'
import { snapshotFromWire, type SnapshotWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { scenarioById, SCENARIOS } from '../../src/synthetic/scenarios'

/**
 * Phase 82, round 11 — the two promises beside the one round 10 repaired.
 *
 * D-155 said a route may not promise what no generator can produce. Round 11
 * found the same rule broken twice more, on the routes either side of it.
 *
 * **QA-82-015.** `routeFor` was handed `standing` — the concepts that are
 * durable facts — and asked whether any of them was `neglected && askable`.
 * `energy.current` is not a standing fact and can never be neglected, so an
 * area whose way back was a question about tonight's energy fell straight to
 * `needs-review`, and Life said *"Nothing the app can do on its own will bring
 * these back"* while Now was already asking exactly that question. One tap made
 * the area current.
 *
 * **QA-82-016.** `domainsWithEvidenceComing` accepted an `action-start` as well
 * as an `action-completion`, while its own comment said *finished* and
 * `outcomeWindowFor` returns nothing until the episode is `completed`. So
 * pressing **Start it** and going no further made Life say an answer was
 * already on its way for something that might never happen.
 */

const DAY = 86_400_000
const CLOCKS = [-2, -1, 0, 7, 14, 21, 28, 30, 35, 60, 90] as const
const DENIAL = 'Nothing the app can do on its own will bring these back.'
const ARRIVING = 'An answer is already on its way.'

interface Run {
  readonly coverage: readonly DomainCoverage[]
  readonly asking: LifeDomainId | undefined
  readonly askingAbout: ConceptId | undefined
  /** Areas with a finished episode whose result window is still open, here. */
  readonly awaiting: ReadonlySet<LifeDomainId>
}

function load(wire: SnapshotWire) {
  const loaded = snapshotFromWire(wire)
  expect(loaded.loaded, 'the history should load').toBe(true)
  if (!loaded.loaded) throw new Error('unreachable')
  return loaded.snapshot
}

function domainOfConcept(coverage: readonly DomainCoverage[], concept: ConceptId) {
  return coverage.find((entry) => entry.concepts.some((row) => row.concept === concept))?.domain
}

function runAt(wire: SnapshotWire, now: Instant, zone: string): Run {
  const moment = { now, zone: zone as never, weekStartsOn: 1 as const }
  const view = buildView(load(wire), moment)
  const coverage = assembleSituation(view, moment).coverage.domains
  const step = nextGuideStep(view, moment)
  const concept = step.question?.spec.concept

  /*
   * Which areas genuinely have an answer on its way, worked out here from the
   * episodes rather than from the route being tested.
   */
  const awaiting = new Set<LifeDomainId>()
  for (const episode of collectEpisodes(view, zone as never)) {
    if (episode.state !== 'completed') continue
    const window = outcomeWindowFor(episode, zone as never)
    if (window === undefined) continue
    // The same window test the route uses: the moment for asking has not passed.
    if (now > window.latest) continue
    awaiting.add(episode.semantics.domain)
  }

  return {
    coverage,
    asking: concept === undefined ? undefined : domainOfConcept(coverage, concept),
    askingAbout: concept,
    awaiting,
  }
}

function firstOption(question: { readonly options: readonly QuestionOption[] }): QuestionOption {
  const first = question.options[0]
  if (first === undefined) throw new Error('a question with no options')
  return first
}

function lifeLine(entry: DomainCoverage): string {
  const standing = standingFor(entry)
  return `${standing.word}. ${standing.note} ${standing.detail?.(entry) ?? ''}`
}

const CORPUS: readonly Run[] = SCENARIOS.flatMap((scenario) => {
  const wire = scenario.build()
  return CLOCKS.map((days) => runAt(wire, instant(scenario.now + days * DAY), scenario.zone))
})

describe('QA-82-015 — Life does not deny a route the app is using', () => {
  it('does not say nothing can be done while the guide is asking about that area', () => {
    /*
     * The invariant, over every scenario and clock. This is the contradiction
     * QA reproduced on the deployed build: two screens, one moment, opposite
     * claims.
     */
    const denials: string[] = []
    let asked = 0
    for (const run of CORPUS) {
      if (run.asking === undefined) continue
      asked += 1
      for (const entry of run.coverage) {
        if (entry.domain !== run.asking) continue
        if (entry.status !== 'stale') continue
        if (entry.refresh === 'needs-review' || lifeLine(entry).includes(DENIAL)) {
          denials.push(`${entry.domain} while asking ${String(run.askingAbout)}`)
        }
      }
    }
    expect(asked, 'the guide never asks anything, so this proves nothing').toBeGreaterThan(0)
    expect(denials).toEqual([])
  })

  it('reproduces A Thursday with nothing needing doing at +28 days', () => {
    const scenario = scenarioById('settled-evening')
    expect(scenario?.title).toBe('A Thursday with nothing needing doing')
    if (scenario === undefined) throw new Error('unreachable')
    const wire = scenario.build()
    const now = instant(scenario.now + 28 * DAY)
    const moment = { now, zone: scenario.zone, weekStartsOn: 1 as const }
    const snapshot = load(wire)
    const view = buildView(snapshot, moment)

    // The question genuinely reaches Now.
    const step = nextGuideStep(view, moment)
    expect(step.kind).toBe('question')
    expect(String(step.question?.spec.concept)).toContain('energy')

    const health = assembleSituation(view, moment).coverage.get(DOMAIN.health)
    expect(health?.status).toBe('stale')
    if (health === undefined) throw new Error('unreachable')
    expect(health.refresh).not.toBe('needs-review')
    expect(lifeLine(health)).not.toContain(DENIAL)

    // And the answer really does restore the area — which is what makes the
    // denial false rather than merely gloomy.
    const question = step.question
    if (question === undefined) throw new Error('unreachable')
    const answered = buildView(
      {
        ...snapshot,
        records: [...snapshot.records, answerRecord(question.spec, firstOption(question), moment)],
      },
      moment,
    )
    expect(assembleSituation(answered, moment).coverage.get(DOMAIN.health)?.status).toBe('current')
  })

  it('keeps a genuine no-route case, and it is the one round 10 repaired', () => {
    /*
     * The opposite error. `needs-review` has to survive, or this repair has
     * traded QA-82-014's lie for a friendlier one.
     *
     * **The subject moved and the point did not — AUD-0041.** This used to be
     * Social, on the ground that the fact layer would spend no question on it.
     * That was true and it was true for the wrong reason: `socialEnergy` was
     * declared non-decisional while it gates the entire social generator, so
     * the app was denying a route it had. Correcting the declaration gives
     * Social a real question and takes it out of this case.
     *
     * Money is the area that genuinely has neither. `moneyCandidates` needs a
     * `financial-goal` that no owner-reachable control creates and no shipped
     * history holds, and the Money page offers one line — "Cash buffer, not
     * known yet". That is AUD-0012, unrepaired at this point in the phase, and
     * it is exactly what `needs-review` is for: the app saying plainly that
     * nothing it can do on its own will bring an area back.
     */
    const denied = CORPUS.flatMap((run) =>
      run.coverage.filter((entry) => entry.status === 'stale' && entry.refresh === 'needs-review'),
    )
    for (const entry of denied) {
      expect(standingFor(entry).note, `${entry.domain}`).toBe(DENIAL)
      expect(
        entry.concepts.every((row) => !row.askable),
        `${entry.domain}: denied a route while a question is available`,
      ).toBe(true)
    }
    /*
     * And the count is stated rather than hoped for, because it is currently
     * **zero** and that is a finding rather than a pass.
     *
     * Correcting `socialEnergy` took Social out of this case, and the only
     * areas left with neither a move nor a question — Money, Emotional, Faith,
     * Private — have no record in any shipped history, so they read `unheard`
     * and never reach `stale`. The denial sentence therefore has no reachable
     * case in the library today: the guard above is a property with nothing to
     * hold, and saying so is better than a green test over an empty set.
     *
     * AUD-0012 is what restores one, later in this phase: a money history with
     * an ageing cash-buffer reading and no due item is exactly an area that has
     * run out of routes. This number moves to one when that scenario lands, and
     * until then a change in either direction fails here rather than passing
     * quietly.
     */
    expect(
      denied.length,
      'an area has run out of routes again — move this to the number and say which',
    ).toBe(0)
  })

  it('routes to a question only where the guide would consider one', () => {
    /*
     * The shared capability, asserted as the identical predicate rather than as
     * a comment claiming it — which is what went wrong last round. `engine.ts`
     * opens its swing analysis with `worthAsking` over `QUESTIONS`; this is
     * that filter, and every `a-question` row must satisfy it.
     */
    const catalogue = new Set<ConceptId>(QUESTIONS.map((entry) => entry.concept))
    let rows = 0
    const escapes: string[] = []
    for (const run of CORPUS) {
      for (const entry of run.coverage) {
        if (entry.refresh !== 'a-question') continue
        rows += 1
        const served = entry.concepts.some(
          (row) =>
            row.askable && catalogue.has(row.concept) && questionFor(row.concept) !== undefined,
        )
        if (!served) escapes.push(entry.domain)
      }
    }
    expect(rows, 'the route is never taken, so this proves nothing').toBeGreaterThan(0)
    expect(escapes).toEqual([])
  })

  it('says the question sentence wherever it takes the question route', () => {
    /*
     * The route and the words move together. QA's own probe pins this sentence,
     * and it is true of every row that reaches the route: answering the question
     * is what makes the area current — QA's round 11 check walks exactly that,
     * one answer at a time.
     */
    let lines = 0
    for (const run of CORPUS) {
      for (const entry of run.coverage) {
        if (entry.refresh !== 'a-question' || entry.status !== 'stale') continue
        lines += 1
        const standing = standingFor(entry)
        expect(standing.detail?.(entry) ?? '', `${entry.domain}`).toContain(
          'A question will cover it.',
        )
        expect(standing.note, `${entry.domain}`).not.toBe(DENIAL)
      }
    }
    expect(lines, 'no question line is rendered, so this proves nothing').toBeGreaterThan(0)
  })

  it('never asks a question the route would not have claimed', () => {
    // The same filter read from the other end: whatever the guide picks, the
    // area it belongs to is one this route would have named.
    for (const run of CORPUS) {
      if (run.askingAbout === undefined) continue
      expect(questionFor(run.askingAbout)).toBeTruthy()
      const owner = run.coverage.find((entry) => entry.domain === run.asking)
      expect(owner?.concepts.some((row) => row.concept === run.askingAbout && row.askable)).toBe(
        true,
      )
    }
  })
})

describe('QA-82-016 — starting something is not an answer arriving', () => {
  const found = scenarioById('what-worked')
  if (found === undefined) throw new Error('missing fixture')
  const scenario = found
  const now = instant(scenario.now + 30 * DAY)
  const moment = { now, zone: scenario.zone, weekStartsOn: 1 as const }

  function withLifecycle(action: 'start' | 'complete' | 'decline') {
    const snapshot = load(scenario.build())
    let records = snapshot.records
    let recommendation: string | undefined
    for (const step of action === 'complete' ? (['start', 'complete'] as const) : [action]) {
      const view = buildView({ ...snapshot, records }, moment)
      const decision = decide(view, moment)
      const candidate = decision.evaluation?.candidate
      if (candidate === undefined) throw new Error('no candidate to act on')
      const planned = planLifecycle({
        view,
        situation: decision.situation,
        semantics: candidate.semantics,
        action: step,
        recordedAt: now,
      })
      expect(planned.noChange, `${step} was refused`).toBeUndefined()
      records = [...records, ...planned.records]
      recommendation = planned.recommendation
    }
    const view = buildView({ ...snapshot, records }, moment)
    const episode = collectEpisodes(view, scenario.zone).find(
      (row) => row.recommendation === recommendation,
    )
    if (episode === undefined) throw new Error('no episode')
    return {
      episode,
      window: outcomeWindowFor(episode, scenario.zone),
      coverage: assembleSituation(view, moment).coverage.get(episode.semantics.domain),
      /** The history *with* the lifecycle in it — QA round 12. */
      snapshot: { ...snapshot, records },
    }
  }

  it('says nothing is on its way for a move that was started and left', () => {
    const started = withLifecycle('start')
    expect(started.episode.state).toBe('started')
    expect(started.window, 'a started episode has no result to wait for').toBeUndefined()
    const entry = started.coverage
    expect(entry?.status).toBe('stale')
    if (entry === undefined) throw new Error('unreachable')
    expect(entry.refresh).not.toBe('normal-life')
    expect(lifeLine(entry)).not.toContain(ARRIVING)
  })

  it('says it once the move is actually finished', () => {
    /*
     * The half a blunt fix would break. `normal-life` is section 8's first
     * preference and has to keep working, or the repair has simply deleted a
     * true sentence along with the false one.
     */
    const done = withLifecycle('complete')
    expect(done.episode.state).toBe('completed')
    expect(done.window, 'a finished episode has a result window').toBeTruthy()
    if (done.window === undefined) throw new Error('unreachable')
    expect(now <= done.window.latest).toBe(true)
    const entry = done.coverage
    if (entry === undefined) throw new Error('unreachable')
    expect(entry.refresh).toBe('normal-life')
    expect(standingFor(entry).note).toBe(ARRIVING)
  })

  it('stops saying it once the window has closed', () => {
    /*
     * Round 12 caught this one being vacuous. It rebuilt the fixture for the
     * later moment and so carried **none** of the lifecycle into it: there was
     * no completed episode there at all, and the route was not `normal-life`
     * for the trivial reason that nothing had ever been finished. It would have
     * passed just as happily if the window never closed.
     *
     * So the completed history goes forward with the clock, the episode is
     * asserted to still be there and still `completed`, and the route is proved
     * to disappear because the window closed rather than because the evidence
     * did.
     */
    const done = withLifecycle('complete')
    if (done.window === undefined) throw new Error('unreachable')
    const later = { ...moment, now: (done.window.latest + DAY) as Instant }
    const view = buildView(done.snapshot, later)

    const stillThere = collectEpisodes(view, scenario.zone).find(
      (row) => row.recommendation === done.episode.recommendation,
    )
    expect(stillThere?.state, 'the completed episode must survive the clock move').toBe('completed')
    if (stillThere === undefined) throw new Error('unreachable')
    const window = outcomeWindowFor(stillThere, scenario.zone)
    expect(window, 'it is still a finished episode; only its window has closed').toBeTruthy()
    if (window === undefined) throw new Error('unreachable')
    expect(later.now > window.latest, 'the clock must actually be past the window').toBe(true)

    const entry = assembleSituation(view, later).coverage.get(done.episode.semantics.domain)
    expect(entry?.refresh).not.toBe('normal-life')
    expect(entry === undefined ? '' : lifeLine(entry)).not.toContain(ARRIVING)
  })

  it('says nothing is on its way for a move that was refused', () => {
    const declined = withLifecycle('decline')
    expect(declined.episode.state).toBe('declined')
    expect(declined.window).toBeUndefined()
    expect(declined.coverage?.refresh).not.toBe('normal-life')
    expect(lifeLine(declined.coverage as DomainCoverage)).not.toContain(ARRIVING)
  })

  it('says it only where a finished episode is actually waiting', () => {
    /*
     * The invariant, over the corpus and over the constructed episode together.
     *
     * **This asserted a count, and the count moved.** It read *"the unmodified
     * fixtures reach `normal-life` zero times"*, which was true of the library
     * as it stood and was never the claim worth making: routing 92 added a
     * history with a finished walk in it (`friendship-gone-quiet`, where the
     * point is that the app has no business proposing a second one), and a
     * finished episode inside its result window is exactly the case this route
     * is *for*. A zero that a new fixture can break is a fact about the library
     * rather than a property of the route.
     *
     * So the property is asserted instead: wherever the route says an answer is
     * on its way, a finished episode really is waiting — worked out from the
     * episodes, not from the route.
     */
    const claims = CORPUS.flatMap((run) =>
      run.coverage
        .filter((entry) => entry.refresh === 'normal-life')
        .map((entry) => ({ domain: entry.domain, earned: run.awaiting.has(entry.domain) })),
    )
    expect(
      claims.filter((claim) => !claim.earned),
      'an area says an answer is on its way with no finished episode waiting',
    ).toEqual([])

    for (const [action, expected] of [
      ['start', false],
      ['complete', true],
      ['decline', false],
    ] as const) {
      const run = withLifecycle(action)
      const live = run.window !== undefined && now <= run.window.latest
      expect(live, `${action} should ${expected ? '' : 'not '}be waiting on a result`).toBe(
        expected,
      )
      expect(run.coverage?.refresh === 'normal-life', `${action} route`).toBe(expected)
    }
  })
})
