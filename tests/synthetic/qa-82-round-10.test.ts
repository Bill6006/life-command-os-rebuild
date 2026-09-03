import { describe, expect, it } from 'vitest'
import {
  coreDomains,
  DOMAIN,
  type DomainRegistry,
  type LifeDomainId,
} from '../../src/domain/domains'
import { instant, type Instant } from '../../src/domain/time'
import { standingFor } from '../../src/features/life/standing'
import { decide } from '../../src/intelligence/engine'
import { domainsWithRefreshingMove, refreshingMoveFor } from '../../src/intelligence/refreshing'
import { assembleSituation, type DomainCoverage } from '../../src/intelligence/situation'
import { snapshotFromWire, type SnapshotWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { scenarioById, SCENARIOS } from '../../src/synthetic/scenarios'

/**
 * Phase 82, round 10 — a route may not promise what no generator can produce.
 *
 * `routeFor` chose `an-action` whenever the stale domain had **any** entity in
 * it, and `coverageCandidates` needs a move for that *domain* and a subject of
 * that move's own *kind*. It has three: a place in Home, a learning topic in
 * Career, a financial goal in Money. Social has people and places and goals in
 * it and no move at all, so Life said
 *
 *     Going quiet. The app will try to bring these back on its own.
 *     Social & Relationships ... Something worth doing here may come up on Now.
 *
 * on a screen whose own decision trace said **Moves considered 0** — QA-82-014.
 *
 * ## Why the green suites did not see it
 *
 * The G-007 test reaches `an-action` in Career, which is one of the three
 * supported domains, and stops there. Nothing enumerated the domains that can
 * *receive* the route and asked whether the generator could serve each one. So
 * the whole suite and the whole browser matrix stayed green while Health,
 * Social and Fatherhood escaped it.
 *
 * These tests are that enumeration. They are written against the **rendered
 * Life sentence** as well as the route field, because round 9's lesson (D-154)
 * was that a guard on the field the repair touched proves nothing about the
 * line the owner reads.
 */

const DAY = 86_400_000
const CLOCKS = [0, 7, 14, 21, 30, 60, 90] as const
/** The sentence that promises an app-owned action, verbatim from `standing.ts`. */
const PROMISE = 'Something worth doing here may come up on Now.'

interface Run {
  readonly scenario: string
  readonly days: number
  readonly coverage: readonly DomainCoverage[]
  /** Everything proposed in the area, whichever generator thought of it. */
  readonly proposals: readonly { readonly domain: LifeDomainId; readonly verb: string }[]
  /** Only what the coverage generator itself produced. */
  readonly refreshes: readonly { readonly domain: LifeDomainId; readonly verb: string }[]
}

function runAt(
  wire: SnapshotWire,
  now: Instant,
  zone: string,
  domains?: DomainRegistry,
): Omit<Run, 'scenario' | 'days'> {
  const loaded = snapshotFromWire(wire)
  expect(loaded.loaded, 'the history should load').toBe(true)
  if (!loaded.loaded) throw new Error('unreachable')
  const moment = {
    now,
    zone: zone as never,
    weekStartsOn: 1 as const,
    ...(domains === undefined ? {} : { domains }),
  }
  const view = buildView(loaded.snapshot, moment)
  const situation = assembleSituation(view, moment)
  const decision = decide(view, moment)
  return {
    coverage: situation.coverage.domains,
    /*
     * Every proposal in the area, whichever generator thought of it — routing
     * 92.
     *
     * This filtered to the coverage generator, and that was equivalent right up
     * until a domain had a generator of its own with something to say.
     * `generateCandidates` dedupes by `verb/object` and runs the coverage
     * generator **last** precisely so that a generator with live evidence wins
     * the proposal — its own comment says *"two generators reaching the same
     * move is agreement, not two options"*. So on `money-item-due` the money
     * generator proposes the move, the coverage duplicate is folded away, and a
     * filter on the coverage generator reported that Life had promised
     * something nothing offered.
     *
     * The promise Life makes is *"something worth doing here may come up on
     * Now"*, which is about the area rather than about which module thought of
     * it. That is what is counted.
     */
    proposals: decision.trace.proposed.map((move) => ({
      domain: move.domain,
      verb: String(move.verb),
    })),
    refreshes: decision.trace.proposed
      .filter((move) => move.generator === 'coverage')
      .map((move) => ({ domain: move.domain, verb: String(move.verb) })),
  }
}

/** Every scenario at every clock — the enumeration the repair has to survive. */
const CORPUS: readonly Run[] = SCENARIOS.flatMap((scenario) => {
  const wire = scenario.build()
  return CLOCKS.map((days) => ({
    scenario: scenario.id,
    days,
    ...runAt(wire, instant(scenario.now + days * DAY), scenario.zone),
  }))
})

function promised(run: Run): readonly DomainCoverage[] {
  return run.coverage.filter((entry) => entry.status === 'stale' && entry.refresh === 'an-action')
}

function lifeLine(entry: DomainCoverage): string {
  const standing = standingFor(entry)
  return `${standing.word}. ${standing.note} ${standing.detail?.(entry) ?? ''}`
}

describe('QA-82-014 — every area promised an action is offered one', () => {
  it('enumerates a corpus that actually reaches the route', () => {
    // Non-vacuity first: an invariant nothing satisfies proves nothing.
    const rows = CORPUS.flatMap((run) => promised(run))
    expect(rows.length, 'no area is routed to an-action anywhere').toBeGreaterThan(0)
    const domains = new Set(rows.map((entry) => entry.domain))
    expect(domains.size, 'only one domain reaches the route').toBeGreaterThan(1)
    expect(CORPUS.length).toBe(SCENARIOS.length * CLOCKS.length)
  })

  it('offers a same-domain move for every area it promises one for', () => {
    /*
     * The invariant itself, across every scenario, clock and domain — not only
     * the single most-neglected area, which is where QA found it and is one
     * rank shallower than the defect goes.
     */
    const escapes: string[] = []
    for (const run of CORPUS) {
      for (const entry of promised(run)) {
        const reaches = run.proposals.some((move) => move.domain === entry.domain)
        if (!reaches) escapes.push(`${run.scenario} +${run.days}d / ${entry.domain}`)
      }
    }
    expect(escapes).toEqual([])
  })

  it('never says the sentence on a page where no move was proposed', () => {
    /*
     * The consumer, in the words the owner reads. D-154: a guard on the field
     * the repair touched proves nothing about the rendered line.
     */
    const escapes: string[] = []
    let said = 0
    for (const run of CORPUS) {
      for (const entry of run.coverage) {
        if (!lifeLine(entry).includes(PROMISE)) continue
        said += 1
        if (!run.proposals.some((move) => move.domain === entry.domain)) {
          escapes.push(`${run.scenario} +${run.days}d / ${entry.domain}`)
        }
      }
    }
    expect(said, 'the promise is never rendered, so this proves nothing').toBeGreaterThan(0)
    expect(escapes).toEqual([])
  })
})

describe('QA-82-014 — the reported reproduction, and its siblings', () => {
  it('tells the truth on A Saturday with people in it, five weeks on', () => {
    const scenario = scenarioById('social-opening')
    expect(scenario).toBeTruthy()
    if (scenario === undefined) throw new Error('unreachable')
    const run = runAt(scenario.build(), instant(scenario.now + 35 * DAY), scenario.zone)
    const social = run.coverage.find((entry) => entry.domain === DOMAIN.social)
    expect(social?.status, 'the reproduction needs Social to have gone quiet').toBe('stale')
    if (social === undefined) throw new Error('unreachable')

    // The trap that produced the defect is still present: Social has plenty of
    // subjects in it. What it has never had is a move.
    expect(refreshingMoveFor(DOMAIN.social)).toBeUndefined()
    expect(social.refresh).not.toBe('an-action')
    expect(lifeLine(social)).not.toContain(PROMISE)
    expect(run.proposals.filter((move) => move.domain === DOMAIN.social)).toEqual([])
    /*
     * And it says a true thing instead of the false one — but not the same true
     * thing it used to, and the change is AUD-0041.
     *
     * QA-82-014's defect was a promise that *"something worth doing here may
     * come up on Now"* in an area with no move behind it. Every clause above is
     * that finding and every one still holds: Social has no refreshing move, is
     * not routed to an action, and proposes nothing.
     *
     * What moved is the *other* route. This used to read "Nothing the app can
     * do on its own will bring these back", and that was false for a reason
     * nobody had noticed: the way back is a question about social energy, the
     * guide has had that question since Phase 2, and the only thing stopping it
     * was `socialEnergy` declaring `materialToDecision: false` — a declaration
     * the audit found wrong and this phase measures rather than believes. The
     * denial was the registry's mistake reaching the owner as a statement about
     * his life.
     *
     * `qa-82-round-11.test.ts` keeps the genuine no-route case, on Money, which
     * is the area that really has neither a move nor a question (AUD-0012).
     */
    expect(standingFor(social).note).toBe('The app will try to bring these back on its own.')
    expect(social.refresh).toBe('a-question')
  })

  for (const [domain, cases] of [
    [
      DOMAIN.health,
      [
        ['what-worked', 30],
        ['settled-evening', 60],
        ['observed-evenings', 90],
      ],
    ],
    [
      DOMAIN.fatherhood,
      [
        ['quiet-fortnight', 30],
        ['quiet-fortnight', 60],
        ['quiet-fortnight', 90],
      ],
    ],
    [
      DOMAIN.social,
      [
        ['long-run', 7],
        ['long-run', 60],
        ['social-opening', 90],
      ],
    ],
  ] as const) {
    it(`makes no promise it cannot keep in ${domain}`, () => {
      expect(refreshingMoveFor(domain)).toBeUndefined()
      for (const [id, days] of cases) {
        const scenario = scenarioById(id)
        if (scenario === undefined) throw new Error(`no scenario ${id}`)
        const run = runAt(scenario.build(), instant(scenario.now + days * DAY), scenario.zone)
        const entry = run.coverage.find((row) => row.domain === domain)
        expect(entry, `${id} +${days}d has no ${domain} row`).toBeTruthy()
        if (entry === undefined) throw new Error('unreachable')
        expect(entry.refresh, `${id} +${days}d`).not.toBe('an-action')
        expect(lifeLine(entry), `${id} +${days}d`).not.toContain(PROMISE)
      }
    })
  }
})

describe('QA-82-014 — the opposite errors are refused too', () => {
  it('does not invent a move for a domain the app has none for', () => {
    /*
     * The tempting fix, and the wrong one. "There is capacity for it" and "you
     * are up for people" are claims about the body and the mood, and a quiet
     * fortnight is evidence of neither (DEF-0006). The route was made honest
     * about the absence rather than the table made permissive.
     */
    const supported = new Set<LifeDomainId>(domainsWithRefreshingMove())
    expect([...supported].sort()).toEqual([DOMAIN.career, DOMAIN.home, DOMAIN.money].sort())
    for (const run of CORPUS) {
      for (const move of run.refreshes) {
        expect(supported.has(move.domain), `${run.scenario} +${run.days}d: ${move.domain}`).toBe(
          true,
        )
      }
    }
  })

  it('keeps every supported direction reaching the arbiter', () => {
    // No route was quietly deleted to make the invariant above pass.
    const reached = new Map<LifeDomainId, Set<string>>()
    for (const run of CORPUS) {
      for (const move of run.refreshes) {
        const verbs = reached.get(move.domain) ?? new Set<string>()
        verbs.add(move.verb)
        reached.set(move.domain, verbs)
      }
    }
    expect([...(reached.get(DOMAIN.home) ?? [])]).toEqual(['reset-space'])
    expect([...(reached.get(DOMAIN.career) ?? [])]).toEqual(['recall-practice'])
  })

  it('will not promise an action for a domain the app may never raise', () => {
    /*
     * Private / Sexual Health is manual-entry first (section 11) and is never
     * raised by the app of its own accord, so an action is not the route by
     * which it comes back. A row added to the table for a private domain would
     * be a promise Now is forbidden to keep, and this is what would say so.
     */
    for (const domain of domainsWithRefreshingMove()) {
      expect(coreDomains.defaultPrivacyFor(domain), domain).not.toBe('private')
    }
    for (const run of CORPUS) {
      const entry = run.coverage.find((row) => row.domain === DOMAIN.privateHealth)
      expect(entry?.refresh, `${run.scenario} +${run.days}d`).not.toBe('an-action')
    }
  })

  it('refuses the route on a domain that has a move but may not be raised', () => {
    /*
     * The check above is about today's table; this one is about the branch that
     * would catch tomorrow's. Nothing private has a move right now, so removing
     * the privacy test from the route changes no behaviour and no assertion —
     * a guard nothing can reach is not a guard. The registry is extensible by
     * design (section 4.1), so this reclassifies Home as private and asks the
     * same history the same question: it still has its place, it still has its
     * move, and it must still not be told an action is coming.
     */
    const scenario = scenarioById('week-pointed-at-home')
    if (scenario === undefined) throw new Error('unreachable')
    const wire = scenario.build()
    const now = instant(scenario.now + 90 * DAY)

    const asNormal = runAt(wire, now, scenario.zone)
    expect(
      asNormal.coverage.find((entry) => entry.domain === DOMAIN.home)?.refresh,
      'the fixture must reach the route, or reclassifying it proves nothing',
    ).toBe('an-action')

    const privately = coreDomains.extendedWith([
      { id: DOMAIN.home, label: 'Home & Environment', defaultPrivacy: 'private' },
    ])
    const asPrivate = runAt(wire, now, scenario.zone, privately)
    const home = asPrivate.coverage.find((entry) => entry.domain === DOMAIN.home)
    expect(home?.status).toBe('stale')
    if (home === undefined) throw new Error('unreachable')
    expect(home.refresh).not.toBe('an-action')
    expect(lifeLine(home)).not.toContain(PROMISE)
    expect(asPrivate.refreshes.filter((move) => move.domain === DOMAIN.home)).toEqual([])
  })
})

describe('QA-82-014 — a subject of the wrong kind is not a subject', () => {
  it('does not promise Home a move when the only thing named there is not a place', () => {
    /*
     * The half of the defect the scenario corpus cannot show. Home *does* have
     * a move, so a domain check alone still passes here; what the generator
     * actually needs is a `place`, and the old route asked for neither. This
     * strips the places out of a history that has one and leaves the other Home
     * entity standing, which is exactly what `hasSubject` used to accept.
     */
    const scenario = scenarioById('week-pointed-at-home')
    expect(scenario).toBeTruthy()
    if (scenario === undefined) throw new Error('unreachable')
    const original = scenario.build()
    const rows = original.entities as readonly Record<string, unknown>[]
    const kept = rows.filter((row) => !(row['domain'] === DOMAIN.home && row['kind'] === 'place'))
    expect(kept.length, 'the fixture should have had a place in Home').toBeLessThan(rows.length)
    expect(
      kept.some((row) => row['domain'] === DOMAIN.home),
      'something must still be named in Home, or this proves nothing',
    ).toBe(true)

    const run = runAt(
      { ...original, entities: kept },
      instant(scenario.now + 90 * DAY),
      scenario.zone,
    )
    const home = run.coverage.find((entry) => entry.domain === DOMAIN.home)
    expect(home?.status, 'Home should have gone quiet by then').toBe('stale')
    if (home === undefined) throw new Error('unreachable')
    expect(home.refresh).not.toBe('an-action')
    expect(lifeLine(home)).not.toContain(PROMISE)
    expect(run.refreshes.filter((move) => move.domain === DOMAIN.home)).toEqual([])
  })

  it('still promises Home a move while the place is there', () => {
    // The same history, unmodified: the repair must not have cost Home its move.
    const scenario = scenarioById('week-pointed-at-home')
    if (scenario === undefined) throw new Error('unreachable')
    const run = runAt(scenario.build(), instant(scenario.now + 90 * DAY), scenario.zone)
    const home = run.coverage.find((entry) => entry.domain === DOMAIN.home)
    expect(home?.status).toBe('stale')
    expect(home?.refresh).toBe('an-action')
    if (home === undefined) throw new Error('unreachable')
    expect(lifeLine(home)).toContain(PROMISE)
    expect(run.refreshes.some((move) => move.domain === DOMAIN.home)).toBe(true)
  })
})
