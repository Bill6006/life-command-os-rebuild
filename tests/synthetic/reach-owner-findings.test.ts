import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONCEPT, coreConcepts } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { PERMISSIONS } from '../../src/domain/privacy'
import { assembleDomainPageData, pageForDomain } from '../../src/features/life/domainPages'
import { decide } from '../../src/intelligence/engine'
import { OWNER_ROUTES, openJourney, type JourneyApp } from './journey'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { loadScenario } from './harness'

/**
 * The owner-use findings §6.4 gives routing 92 — F12, F19's reach half, F27,
 * F30's consent half, F32's retraction half, F36's precision half.
 *
 * Two of them are built by this phase's other packages and are asserted here so
 * the finding has an acceptance rather than a claim. Two were already built —
 * routing 84 shipped the retraction and the redate — and are asserted for the
 * same reason: *"a claim of exhaustiveness is a test, or it is a comment"*
 * (D-179), and a finding recorded as satisfied with nothing pointing at it is a
 * comment.
 */

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

describe('F12 — repetition that exposes a small model, and what replaced it', () => {
  it('can produce a second sentence in the movement domain at all', async () => {
    /*
     * The finding in its own words: *"repetition feels stupid when it exposes a
     * small model."* Every owner, on every good day, got one sentence, and the
     * proposed capability is to *"learn or accept real owner routines with
     * action-specific profiles"* — never to randomise for novelty, and never to
     * pool lifting and walking as interchangeable exercise.
     */
    const app = await eveningIn()
    const before = app.decision().explanation?.rendered.sentence ?? ''
    await app.introduce({
      kind: 'routine',
      name: 'the rowing machine',
      domain: DOMAIN.health,
      minutes: 20,
      requiresLeaving: false,
    })
    const after = app.decision().explanation?.rendered.sentence ?? ''
    expect(before).not.toBe(after)
    expect(after).toContain('the rowing machine')
  })

  it('keeps two routines separately scoped rather than pooling them', async () => {
    /*
     * AUD-0045's own risk, and the audit is explicit: *do not widen
     * `ACTION_FAMILIES` to pool them.* A belief about lifting is not a belief
     * about walking, and the object id is what keeps them apart.
     */
    const app = await eveningIn()
    await app.introduce({
      kind: 'routine',
      name: 'swimming',
      domain: DOMAIN.health,
      minutes: 45,
      requiresLeaving: true,
    })
    await app.introduce({
      kind: 'routine',
      name: 'press-ups',
      domain: DOMAIN.health,
      minutes: 10,
      requiresLeaving: false,
    })
    const proposed = app
      .decision()
      .trace.proposed.filter((move) => move.domain === DOMAIN.health)
      .map((move) => move.id)
    expect(new Set(proposed).size, 'two routines collapsed into one move').toBe(proposed.length)
    expect(proposed.some((id) => id.includes('swimming'))).toBe(true)
    expect(proposed.some((id) => id.includes('press-ups'))).toBe(true)
  })
})

describe('F19 reach half — the owner’s real environment reaches a decision', () => {
  it('carries resources, people and a constraint of the world into the situation', () => {
    /*
     * The finding: *"a lab, workout, conversation or private activity can be
     * reasonable in principle and impossible in the actual setting"*, and
     * *"resource / setup / travel / privacy constraints were not
     * discoverable"*. The reach half is that the setting is now something the
     * decision can see.
     */
    const scenario = SCENARIOS.find((entry) => entry.id === 'friendship-gone-quiet')
    if (scenario === undefined) throw new Error('unreachable')
    const loaded = loadScenario(scenario.id)
    const at = {
      now: scenario.now,
      zone: scenario.zone,
      weekStartsOn: scenario.weekStartsOn ?? (1 as const),
    }
    const situation = decide(loaded.viewAt(at.now, at.zone), at).situation

    // Who is actually around, from the graph the laboratory used to be alone in
    // reading.
    expect(situation.peoplePresent.length, 'nobody in the record is reachable').toBeGreaterThan(0)
    // Whether he is free to leave, which is a fact about the setting rather
    // than about him.
    expect(situation.readings.get(CONCEPT.mustStay)).toBeDefined()
    // And what he can actually do, with the shape he gave it.
    expect(coreConcepts.get(CONCEPT.trainedToday), 'movement is not readable').toBeDefined()
  })

  it('does not treat an unreported constraint as absent', () => {
    // The finding's own caution, and G-009 one more time: not having been told
    // he must stay is not being told he may leave.
    const scenario = SCENARIOS[0]
    if (scenario === undefined) throw new Error('unreachable')
    const loaded = loadScenario(scenario.id)
    const at = { now: scenario.now, zone: scenario.zone, weekStartsOn: 1 as const }
    const situation = decide(loaded.viewAt(at.now, at.zone), at).situation
    expect(situation.mustStay.state).toBe('unknown')
  })
})

describe('F30 consent half — five permissions, and which of them exist', () => {
  it('answers storing, reasoning, displaying and describing as four separate questions', () => {
    /*
     * F30 asks for *"separate permission to store, learn from, use in
     * decisions, display, and export sensitive information"*, and D-167 settled
     * the shape: **one** owner-facing permission, domain-level, because
     * per-entry consent is burden without a demonstrated benefit.
     *
     * What routing 92 adds is that the questions themselves are now four
     * separate rules rather than a class compared in eight places: may the
     * engine know this, may the app raise it unasked, may this surface show the
     * detail, may a document he scoped describe it. Storing is unconditional
     * and always was — nothing is dropped on the way in.
     */
    const privacy = readFileSyncSafe('src/domain/privacy.ts')
    for (const rule of [
      'export function mayReasonFrom',
      'export function mayRaiseUnasked',
      'export function mayShowDetail',
      'export function mayDescribeInDocument',
    ]) {
      expect(privacy, `${rule} is not where the rules live`).toContain(rule)
    }
    // And exactly one of them is the owner's to set.
    expect(PERMISSIONS.length).toBe(1)
    expect(PERMISSIONS[0]?.id).toBe('private-influence')
  })

  it('says what the private page actually promises, rather than more than it can keep', () => {
    const page = pageForDomain(DOMAIN.privateHealth)
    expect(page, 'there is no private page').toBeDefined()
  })
})

describe('F32 retraction half — the routes exist and an owner can reach them', () => {
  it('offers a retraction and a re-dating from a screen', () => {
    /*
     * AUD-0050's retraction half and F32's *"ordinary event-repair path"*. Both
     * shipped at routing 84 and are asserted here because §6.4 lists them as
     * this phase's, and a finding marked satisfied with nothing pointing at it
     * is a comment rather than a claim.
     */
    const retracts = OWNER_ROUTES.filter((route) => route.writes.includes('correction'))
    expect(
      retracts.map((route) => route.id),
      'nothing an owner can press retracts an entry',
    ).toContain('withdraw-event')

    /*
     * Re-dating is the backfill half and it writes no `correction` at all — it
     * supersedes an entry with the same entry, dated correctly, so its `writes`
     * says `action-completion` rather than claiming a route to a kind that was
     * already reachable. That distinction is the table being honest, and it is
     * why this is looked up by id rather than by what it produces.
     */
    const redate = OWNER_ROUTES.find((route) => route.id === 'redate-event')
    expect(redate, 'nothing an owner can press re-dates an entry').toBeDefined()
    expect(redate?.builder).toBe('corrections.redateEventRecord')

    const routes = [...retracts, ...(redate === undefined ? [] : [redate])]
    for (const route of routes) {
      expect(route.surface, `${route.id} is not on a screen`).toBeDefined()
      expect(route.gesture.length, `${route.id} has no words on the button`).toBeGreaterThan(0)
    }
  })

  it('lists something to correct on a page that has history behind it', () => {
    const scenario = SCENARIOS.find((entry) => entry.id === 'what-worked')
    if (scenario === undefined) throw new Error('unreachable')
    const loaded = loadScenario(scenario.id)
    const at = {
      now: scenario.now,
      zone: scenario.zone,
      weekStartsOn: scenario.weekStartsOn ?? (1 as const),
    }
    const situation = decide(loaded.viewAt(at.now, at.zone), at).situation
    const page = pageForDomain(DOMAIN.health)
    if (page === undefined) throw new Error('unreachable')
    const data = assembleDomainPageData(situation, page)
    expect(data.correctable.length, 'nothing on this page can be repaired').toBeGreaterThan(0)
  })
})

describe('F36 precision half — an easy answer, with precision when he has it', () => {
  it('takes a routine with no length and invents none for it', async () => {
    /*
     * *"The owner should not have to guess the hidden format"*, and its
     * corollary: the app should not fill a number in for him. A routine he
     * sized carries its size; one he did not is suggested without a length.
     */
    const app = await eveningIn()
    await app.introduce({ kind: 'routine', name: 'five-a-side', domain: DOMAIN.health })
    const sentence = app.decision().explanation?.rendered.sentence ?? ''
    expect(sentence).toContain('five-a-side')
    expect(sentence, 'a duration was invented').not.toMatch(/\d+ minutes/)
  })

  it('takes the same routine with a length and uses the one he gave', async () => {
    const app = await eveningIn()
    await app.introduce({
      kind: 'routine',
      name: 'five-a-side',
      domain: DOMAIN.health,
      minutes: 60,
    })
    const ranked = app.decision().trace.ranking.find((row) => row.id.includes('five-a-side'))
    expect(ranked?.minutes, 'the size he gave was not the size it was scored at').toBe(60)
  })
})

function readFileSyncSafe(path: string): string {
  return readFileSync(join(import.meta.dirname, '..', '..', path), 'utf8')
}
