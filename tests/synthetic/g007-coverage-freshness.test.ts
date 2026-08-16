import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { entityRef } from '../../src/domain/entities'
import { addLocalDays, timeZone, type Instant } from '../../src/domain/time'
import { decide, type Decision } from '../../src/intelligence/engine'
import { assembleSituation, type Situation } from '../../src/intelligence/situation'
import { nextGuideStep } from '../../src/intelligence/guide'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { createKit } from '../../src/synthetic/kit'
import { scenarioById, SCENARIOS } from '../../src/synthetic/scenarios'
import { chosenDomain, loadScenario, orphanPronounsIn } from './harness'

/**
 * G-007 — coverage freshness.
 *
 * > Input: owner has not manually opened a domain for weeks.
 * > Expected: the app recognizes whether evidence is still sufficient; if
 * > stale, it creates a natural refresh path; the domain does not silently
 * > remain frozen.
 *
 * Three claims, and the third is the one section 63 turns into a rule: a domain
 * may be quiet, stable or low priority, and must not silently remain based on
 * months-old assumptions while the interface implies the app is current.
 *
 * The scenario is built so only one thing has gone quiet. Sleep, energy,
 * soreness and the evening are all answered today; the CCNA goal is live; and
 * nothing about the studying has come in since late May. An app with nothing to
 * say here is doing exactly what section 63 forbids.
 */

const ZONE = timeZone('America/Denver')
const scenario = loadScenario('career-gone-quiet')
const decision = scenario.decision()
const situation = decision.situation

function coverageOf(at: Instant): Situation['coverage'] {
  return assembleSituation(scenario.viewAt(at), { now: at, zone: ZONE, weekStartsOn: 1 }).coverage
}

// ---------------------------------------------------------------------------

describe('G-007 — the app works out whether what it knows is still enough', () => {
  it('calls the quiet area stale and everything current current', () => {
    const career = situation.coverage.get(DOMAIN.career)
    expect(career?.status).toBe('stale')
    expect(situation.coverage.get(DOMAIN.sleep)?.status).toBe('current')
    expect(situation.coverage.get(DOMAIN.health)?.status).toBe('current')
  })

  it('knows how long it has been, rather than only that it has been', () => {
    const career = situation.coverage.get(DOMAIN.career)
    // 2026-05-26 to 2026-07-14.
    expect(career?.daysSinceEvidence).toBe(49)
  })

  it('says so in words that are about what the app was told, not about his life', () => {
    const career = situation.coverage.get(DOMAIN.career)
    expect(career?.summary).toContain('Nothing has come in about')
    expect(career?.summary).toContain('career')
    expect(orphanPronounsIn(career?.summary ?? '')).toEqual([])
  })

  it('names it as the one area most worth doing something about', () => {
    expect(situation.coverage.mostNeglected?.domain).toBe(DOMAIN.career)
  })

  it('leaves an area he has never mentioned alone', () => {
    // Section 4.4 — missing data is not failure — and G-009's rule applied to
    // an area. Never having been told is not the same as being told and
    // watching it expire, and only the second is worth a signal.
    const faith = situation.coverage.get(DOMAIN.faith)
    expect(faith?.status).toBe('unheard')
    expect(faith?.matters).toBe(false)
    expect(situation.coverage.neglected.map((entry) => entry.domain)).toEqual([DOMAIN.career])
  })
})

describe('G-007 — a natural refresh path exists', () => {
  it('does not fall through to asking the owner to go and look', () => {
    // `needs-review` is section 8's last resort, and reaching it here would
    // mean the four things it prefers had all failed.
    expect(situation.coverage.get(DOMAIN.career)?.refresh).toBe('an-action')
  })

  it('proposes a move that would bring something back about it', () => {
    const proposed = decision.trace.proposed.filter((move) => move.domain === DOMAIN.career)
    expect(proposed.length).toBeGreaterThan(0)
    expect(proposed.some((move) => move.generator === 'coverage')).toBe(true)
  })

  it('proposes it because the area has gone quiet, and says so', () => {
    const proposed = decision.trace.proposed.find((move) => move.generator === 'coverage')
    expect(proposed?.because).toContain('nothing has come in')
    expect(proposed?.subject).toBe('subnetting')
  })

  it('keeps the subject, so the refresh is about the thing and not about the area', () => {
    const ranked = decision.trace.ranking.find((row) => row.id.startsWith('coverage/'))
    expect(ranked).toBeDefined()
    expect(ranked?.sentence.toLowerCase()).toContain('subnetting')
    expect(orphanPronounsIn(ranked?.sentence ?? '')).toEqual([])
  })

  it('asks no extra question to get there', () => {
    // Section 8 puts an action above a question, and section 12 fails outright
    // on too many. A coverage engine that generates questions is the most
    // likely thing yet built to break that, so this is checked directly.
    const step = nextGuideStep(scenario.view(), { now: scenario.scenario.now, zone: ZONE })
    expect(step.kind).toBe('settled')
  })
})

describe('G-007 — the domain does not silently remain frozen', () => {
  it('reaches the owner, either as the move or as the line above it', () => {
    const named =
      chosenDomain(decision) === DOMAIN.career ||
      (decision.explanation?.limiter ?? '').toLowerCase().includes('career')
    expect(named, 'the owner is told nothing about the quiet area').toBe(true)
  })

  it('treats the silence as a limiter, and the weakest of the four', () => {
    expect(situation.limiter?.kind).toBe('coverage')
    expect(situation.limiter?.domain).toBe(DOMAIN.career)
  })

  it('claims no more certainty about it than it has', () => {
    // What the app has been told, it is sure of. Whether that matters tonight
    // is a judgement, and the number says which of the two this is.
    expect(situation.limiter?.certainty).toBeLessThan(0.7)
  })

  it('never lets the quiet area outrank an actual constraint', () => {
    // Recovery, capacity and time all come first. A man nine hours short of
    // rest has a recovery problem whatever the app has not heard about lately.
    const strained = loadScenario('running-on-empty').decision()
    expect(strained.situation.limiter?.kind).toBe('recovery')
  })

  it('offers the refresh as the alternative, in words about what is known', () => {
    // The walk wins this evening and the studying is what it was chosen over.
    // "Better supported by what is known" is the honest phrase for it: the app
    // has a reading of his body from an hour ago and nothing about the CCNA
    // since May, and that difference is the whole of why the walk is ahead.
    expect(decision.explanation?.instead?.toLowerCase()).toContain('subnetting')
    expect(decision.explanation?.limiter).toContain('career')
  })

  /**
   * The rule underneath the ranking, asserted rather than left to a comment.
   *
   * A quiet area is the app's blind spot and is not in the way of anything, so
   * `bottleneck-fit` says nothing about it in either direction. The first
   * version gave a move in the quiet area a healthy bonus and it proposed
   * clearing a kitchen over an evening with the owner's daughter, on the
   * strength of not knowing what the kitchen looked like — and the explanation
   * would have read "answers what is actually in the way".
   */
  it('never lets a move claim to answer what is in the way when nothing is', () => {
    for (const row of decision.trace.ranking) {
      const bottleneck = row.dimensions.find((entry) => entry.name === 'bottleneck-fit')
      expect(bottleneck?.value, row.id).toBe(0)
    }
    expect(decision.explanation?.insteadBecause).not.toBe('Answers what is actually in the way.')
  })

  /**
   * "Stale important areas eventually surface naturally" — the eventually.
   *
   * The same seven-week silence, on an evening with nothing else on offer. The
   * walk needs a reading of the body (D-032) and there is none here, so the
   * only live candidate is the one the quiet area produced — and it wins, and
   * the sentence is about subnetting rather than about coverage.
   */
  it('wins outright on an evening with nothing else in it', () => {
    const quieter = decideWithoutCapacity()
    expect(quieter.evaluation?.candidate.generator).toBe('coverage')
    expect(quieter.explanation?.rendered.sentence.toLowerCase()).toContain('subnetting')
    expect(quieter.explanation?.rendered.reason.toLowerCase()).toContain('subnetting')
    expect(orphanPronounsIn(quieter.explanation?.rendered.reason ?? '')).toEqual([])
  })
})

describe('G-007 — ignoring Life for a realistic period does not freeze anything', () => {
  /*
   * The gate's own wording: "the owner can ignore Life pages for a realistic
   * synthetic period without the system silently freezing."
   *
   * So the same history is read at a fortnight, a month, two months and three
   * months, and at every one of them the app has to still know what it does and
   * does not know. What must never happen is the reverse: everything quietly
   * reading as current because nobody looked.
   */
  const AT = [14, 30, 60, 90]

  it('keeps noticing, at every distance', () => {
    for (const days of AT) {
      const at = addLocalDays(scenario.scenario.now, days, ZONE)
      const career = coverageOf(at).get(DOMAIN.career)
      expect(career?.status, `${days} days on`).toBe('stale')
      expect(career?.daysSinceEvidence ?? 0, `${days} days on`).toBeGreaterThan(days)
    }
  })

  it('never quietly reports a quiet area as current', () => {
    for (const days of AT) {
      const at = addLocalDays(scenario.scenario.now, days, ZONE)
      const coverage = coverageOf(at)
      for (const domain of coverage.domains) {
        if (domain.status !== 'current') continue
        // Current has to mean something was actually heard, and recently. The
        // quantity is "anything at all" rather than "standing evidence",
        // because a domain the registry models only with momentary readings —
        // health has energy and soreness and nothing else — is properly
        // current when he answered both this evening.
        expect(domain.daysSinceHeard ?? 999, `${domain.domain} at ${days} days`).toBeLessThan(28)
      }
    }
  })

  it('still has somewhere to send the evidence from, months later', () => {
    for (const days of AT) {
      const at = addLocalDays(scenario.scenario.now, days, ZONE)
      expect(coverageOf(at).get(DOMAIN.career)?.refresh, `${days} days on`).not.toBe('needs-review')
    }
  })
})

describe('G-007 — every scenario in the library is honest about what it knows', () => {
  /*
   * The class rather than the case. Section 63 is a rule about the whole app,
   * so it is checked across every history the owner can load rather than on the
   * one written to demonstrate it.
   */
  it('never calls an area current when its standing evidence has expired', () => {
    for (const entry of SCENARIOS) {
      const loaded = loadScenario(entry.id)
      const state = assembleSituation(loaded.view(), {
        now: entry.now,
        zone: entry.zone,
        weekStartsOn: 1,
      }).coverage

      for (const domain of state.domains) {
        if (domain.status !== 'current') continue
        const expired = domain.concepts.filter((concept) => concept.neglected)
        expect(
          expired.map((concept) => concept.concept),
          `${entry.id} / ${domain.domain}`,
        ).toEqual([])
      }
    }
  })

  it('never raises the private domain of its own accord', () => {
    // Section 11: manual-entry-first, and the owner is not treated as though he
    // must answer unsolicited private questions during a normal check-in.
    for (const entry of SCENARIOS) {
      const loaded = loadScenario(entry.id)
      const state = assembleSituation(loaded.view(), {
        now: entry.now,
        zone: entry.zone,
        weekStartsOn: 1,
      }).coverage
      expect(state.mostNeglected?.domain, entry.id).not.toBe(DOMAIN.privateHealth)
    }
  })

  /**
   * The same claim, on a history built to break it.
   *
   * The sweep above passes on every scenario in the library and would also pass
   * if the private domain were simply never stale in any of them — which is
   * the vacuous regression DEF-0012's first attempt was. So this one arranges
   * the exact situation the rule is about: a private area the owner plainly
   * cares about, months quiet, alongside an ordinary one in the same state.
   */
  it('holds when the private domain really has gone quiet', () => {
    const state = privateAndHomeBothQuiet()
    expect(state.get(DOMAIN.privateHealth)?.status).toBe('stale')
    expect(state.neglected.map((entry) => entry.domain)).toContain(DOMAIN.privateHealth)
    // Reported, and never the thing the app brings up.
    expect(state.mostNeglected?.domain).toBe(DOMAIN.home)
  })

  /**
   * DEF-0015's failure, arriving from a new direction.
   *
   * A custody arrangement settled eighteen months ago is the oldest record in
   * the owner's history and is not stale by any reading: durable context does
   * not decay, and the fact layer says the concept resolves right now. Coverage
   * measuring the age of that record without asking the fact layer first would
   * call a settled arrangement neglect and start prodding him about it.
   */
  it('never calls a settled arrangement neglect, however old the record is', () => {
    const settled = loadScenario('durable-custody')
    const state = assembleSituation(settled.view(), {
      now: settled.scenario.now,
      zone: settled.scenario.zone,
      weekStartsOn: 1,
    }).coverage

    const fatherhood = state.get(DOMAIN.fatherhood)
    expect(fatherhood?.status).not.toBe('stale')
    expect(fatherhood?.concepts.filter((concept) => concept.neglected)).toEqual([])
    expect(state.mostNeglected).toBeUndefined()
  })

  /**
   * The invariant underneath that, stated directly and on a history that can
   * actually break it.
   *
   * `durable-custody` is protected three ways over — the arrangement's horizon
   * is durable, and the concept it answers is not a standing one — so it proves
   * the behaviour and not the rule. The rule is that **coverage never
   * contradicts the fact layer**: if a concept resolves to a usable value right
   * now, the area is covered and how old the record is does not enter into it.
   *
   * This builds the case where the two could disagree. A learning topic stated
   * as standing context is in force indefinitely (D-012), so it answers today
   * while being months older than the concept's own freshness horizon. Judging
   * it on age alone would call an owner who told the app what he is studying
   * neglectful of his own studying.
   */
  it('never calls a concept neglected while the fact layer still answers it', () => {
    const state = standingContextMonthsOld()
    const career = state.get(DOMAIN.career)
    const topic = career?.concepts.find((concept) => concept.concept === CONCEPT.learningTopic)

    expect(topic?.state, 'the fact layer should still answer this').toBe('explicit')
    expect(topic?.daysSince ?? 0, 'and the record should be well past its horizon').toBeGreaterThan(
      60,
    )
    expect(topic?.neglected).toBe(false)

    /*
     * The area is still reported quiet, and that is a different claim.
     *
     * Four months without a single study session is a coverage gap however
     * firmly the app knows which topic he named — the domain-level backstop is
     * about the area going silent rather than about any concept expiring. What
     * the rule forbids is the app contradicting itself: saying it knows what he
     * is studying and, in the next breath, that it does not.
     */
    expect(career?.status).toBe('stale')
    expect(career?.weakest, 'no sub-area is overdue — the silence is').toBeUndefined()
  })

  /**
   * Section 4.4 — missing data is not failure — as a status rather than a list.
   *
   * A domain the owner mentioned once and never returned to is quiet, not
   * neglected. The distinction is the difference between an app that reports
   * what it knows and one that grades him on how much he has fed it.
   */
  it('calls an area he never committed to quiet rather than stale', () => {
    const state = mentionedOnceAndNeverAgain()
    const faith = state.get(DOMAIN.faith)
    expect(faith?.matters).toBe(false)
    expect(faith?.status).toBe('quiet')
    expect(state.neglected.map((entry) => entry.domain)).not.toContain(DOMAIN.faith)
  })

  it('is on the QA screen for the owner to open', () => {
    expect(scenarioById('career-gone-quiet')).toBeDefined()
  })
})

// ---------------------------------------------------------------------------

/**
 * Two areas gone quiet at once, one of them private.
 *
 * Built here rather than added to the scenario library: D-041 keeps histories
 * the owner is handed on a phone to lives he recognises, and a fixture whose
 * whole purpose is a months-old private pattern is not one of them.
 */
function privateAndHomeBothQuiet(): Situation['coverage'] {
  const kit = createKit('CP', 'America/Denver', '2026-01-01T12:00:00Z')
  const now = kit.local('2026-07-14', '20:00')
  const kitchen = entityRef('place', 'the kitchen')
  const habit = entityRef('behavior', 'late-night scrolling')

  const place = kit.entity({
    kind: 'place',
    label: 'the kitchen',
    domain: DOMAIN.home,
    privacy: 'normal',
  })
  const behaviour = kit.entity({
    kind: 'behavior',
    label: 'late-night scrolling',
    domain: DOMAIN.privateHealth,
    privacy: 'private',
  })

  const friction = kit.record(
    'observation',
    { occurredAt: kit.local('2026-05-20', '18:00'), domains: [DOMAIN.home], entities: [kitchen] },
    {
      concept: CONCEPT.homeFriction,
      value: { type: 'text', value: 'the kitchen table is buried again' },
      method: 'self-report',
    },
  )

  const pattern = kit.record(
    'observation',
    {
      occurredAt: kit.local('2026-05-18', '23:40'),
      domains: [DOMAIN.privateHealth],
      entities: [habit],
    },
    {
      concept: CONCEPT.privatePattern,
      value: { type: 'text', value: 'three late nights this week' },
      method: 'self-report',
    },
  )

  const loaded = snapshotFromWire(
    kit.document({ entities: [place, behaviour], records: [friction, pattern], exportedAt: now }),
  )
  expect(loaded.loaded, 'the fixture should load').toBe(true)
  return assembleSituation(buildView(loaded.snapshot, { now, zone: ZONE }), {
    now,
    zone: ZONE,
    weekStartsOn: 1,
  }).coverage
}

/**
 * The same seven-week silence, with nothing known about the body.
 *
 * Built by removing two records from the scenario rather than by writing a
 * second history, so the only difference between this and the evening above is
 * the thing being tested.
 */
function decideWithoutCapacity(): Decision {
  const records = scenario.snapshot.records.filter(
    (record) =>
      !(
        record.kind === 'observation' &&
        (record.concept === CONCEPT.energy || record.concept === CONCEPT.soreness)
      ),
  )
  expect(records.length).toBe(scenario.snapshot.records.length - 2)
  return decide(
    buildView({ ...scenario.snapshot, records }, { now: scenario.scenario.now, zone: ZONE }),
    { now: scenario.scenario.now, zone: ZONE },
  )
}

/** A learning topic stated as standing context, four months ago. */
function standingContextMonthsOld(): Situation['coverage'] {
  const kit = createKit('CS', 'America/Denver', '2026-01-01T12:00:00Z')
  const now = kit.local('2026-07-14', '20:00')
  const subnetting = entityRef('learning-topic', 'subnetting')

  const topic = kit.entity({
    kind: 'learning-topic',
    label: 'subnetting',
    domain: DOMAIN.career,
    privacy: 'normal',
  })

  const standing = kit.record(
    'context',
    {
      occurredAt: kit.local('2026-03-01', '09:00'),
      domains: [DOMAIN.career],
      entities: [subnetting],
    },
    {
      concept: CONCEPT.learningTopic,
      value: { type: 'entity', value: subnetting },
      durability: 'situational',
      validFrom: kit.local('2026-03-01', '09:00'),
      validUntil: kit.local('2026-12-31', '23:00'),
    },
  )

  const loaded = snapshotFromWire(
    kit.document({ entities: [topic], records: [standing], exportedAt: now }),
  )
  expect(loaded.loaded, 'the fixture should load').toBe(true)
  return assembleSituation(buildView(loaded.snapshot, { now, zone: ZONE }), {
    now,
    zone: ZONE,
    weekStartsOn: 1,
  }).coverage
}

/** One observation about an area, months ago, and nothing else about it ever. */
function mentionedOnceAndNeverAgain(): Situation['coverage'] {
  const kit = createKit('CF', 'America/Denver', '2026-01-01T12:00:00Z')
  const now = kit.local('2026-07-14', '20:00')

  const once = kit.record(
    'observation',
    { occurredAt: kit.local('2026-03-02', '09:00'), domains: [DOMAIN.faith] },
    {
      concept: CONCEPT.faithPractice,
      value: { type: 'text', value: 'went on Sunday' },
      method: 'self-report',
    },
  )

  const loaded = snapshotFromWire(kit.document({ entities: [], records: [once], exportedAt: now }))
  expect(loaded.loaded, 'the fixture should load').toBe(true)
  return assembleSituation(buildView(loaded.snapshot, { now, zone: ZONE }), {
    now,
    zone: ZONE,
    weekStartsOn: 1,
  }).coverage
}
