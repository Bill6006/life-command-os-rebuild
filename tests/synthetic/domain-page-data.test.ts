import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { entityRef } from '../../src/domain/entities'
import { addLocalDays } from '../../src/domain/time'
import { assembleDomainPageData, pageBySlug } from '../../src/features/life/domainPages'
import { assembleSituation } from '../../src/intelligence/situation'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { createKit } from '../../src/synthetic/kit'
import { loadScenario } from './harness'

/**
 * `assembleDomainPageData` against real synthetic histories rather than a
 * hand-built fixture — the same guard section 60 asks for elsewhere: a
 * function the domain pages depend on should be proven against a history the
 * running app could actually produce.
 */

describe('a domain page reads the same situation Now and Life were built from', () => {
  it('shows the quiet learning topic, its own coverage, and the live goal', () => {
    const loaded = loadScenario('career-gone-quiet')
    const situation = loaded.decision().situation
    const page = pageBySlug('career')
    if (page === undefined) throw new Error('career page missing')

    const data = assembleDomainPageData(situation, page)

    expect(data.coverage).toHaveLength(1)
    expect(data.coverage[0]?.status).toBe('stale')

    // 49 days past a 14-day freshness window: the app still says what it last
    // heard, and flags it as out of date rather than pretending it is current.
    const topic = data.readings.find((entry) => entry.concept === CONCEPT.learningTopic)
    expect(topic?.state).toBe('stale')
    expect(topic?.outOfDate).toBe(true)
    expect(topic?.text.toLowerCase()).toContain('subnetting')

    expect(data.goals.some((goal) => goal.statement.includes('CCNA'))).toBe(true)
  })

  it('names both domains on the shared Health & Recovery page', () => {
    const loaded = loadScenario('running-on-empty')
    const situation = loaded.decision().situation
    const page = pageBySlug('health-recovery')
    if (page === undefined) throw new Error('health-recovery page missing')

    const data = assembleDomainPageData(situation, page)

    expect(data.coverage.map((entry) => entry.domain).sort()).toEqual(
      [DOMAIN.health, DOMAIN.sleep].sort(),
    )
    expect(data.readings.some((entry) => entry.domain === DOMAIN.health)).toBe(true)
    expect(data.readings.some((entry) => entry.domain === DOMAIN.sleep)).toBe(true)
  })

  it('reads an unheard-of domain without inventing anything', () => {
    const loaded = loadScenario('durable-custody')
    const situation = loaded.decision().situation
    const page = pageBySlug('faith')
    if (page === undefined) throw new Error('faith page missing')

    const data = assembleDomainPageData(situation, page)

    expect(data.goals).toEqual([])
    expect(data.recentChanges).toEqual([])
    for (const reading of data.readings) expect(reading.state).toBe('unknown')
  })

  it('lets the durable custody arrangement read through on its own page', () => {
    const loaded = loadScenario('durable-custody')
    const situation = loaded.decision().situation
    const page = pageBySlug('fatherhood')
    if (page === undefined) throw new Error('fatherhood page missing')

    const data = assembleDomainPageData(situation, page)
    const arrangement = data.readings.find((entry) => entry.concept === CONCEPT.custodyArrangement)
    expect(arrangement?.state).toBe('explicit')
  })

  it('names the subject a completion or an outcome was about, in "recently"', () => {
    /*
     * DEF-0028, found on the Android gate: "Said what a suggestion here was
     * worth" four times running, on a page whose whole history is about one
     * place. The subject was one lookup away and nothing was following it.
     *
     * The rule this asserts is the one the defect was about — **every line
     * about an episode names what the episode was about** — rather than the
     * exact sentences the repair happened to produce. Phase 6 changed those
     * sentences: an outcome row now states the answer as well as the subject,
     * because on Timeline the old wording was most of the screen. An assertion
     * on the old strings would have failed for an improvement, which is the
     * failure mode DEF-0020's own repair records ("an exact-string assertion
     * proves a string is stable, not that it is right").
     */
    const loaded = loadScenario('what-worked')
    const situation = loaded.decision().situation
    const page = pageBySlug('home')
    if (page === undefined) throw new Error('home page missing')

    const data = assembleDomainPageData(situation, page)

    const episodeLines = data.recentChanges.filter((entry) =>
      /suggestion here|clearing the kitchen/i.test(entry.text),
    )
    expect(episodeLines.length, 'no episode lines on a month about one place').toBeGreaterThan(0)
    for (const entry of episodeLines) {
      expect(entry.text, entry.text).toContain('the kitchen')
    }

    // And the generic form appears nowhere, since the subject resolves here.
    for (const entry of data.recentChanges) {
      expect(entry.text.includes('a suggestion here.'), entry.text).toBe(false)
    }
  })

  it('never claims a domain has nothing out of date while a reading on the same page is tagged out of date — QA-M1', () => {
    // homeFriction's own freshness window is 3 days (AUD-0005); three times
    // that, floored at a week, is 9 — so a reading 7 days old is genuinely past
    // its own window (`stale`, "out of date" on its row) without yet being
    // neglected at the domain level (`quiet`, not `stale`). Both readings
    // are honest; the old copy asserted a blanket "nothing has gone out of
    // date" that the row directly underneath it contradicted.
    const kit = createKit('m1', 'America/Denver', '2026-01-01T00:00:00Z')
    const now = kit.local('2026-07-14', '19:00')
    const sevenDaysAgo = addLocalDays(now, -7, kit.zone)

    const homeFriction = kit.record(
      'observation',
      { occurredAt: sevenDaysAgo, domains: [DOMAIN.home] },
      {
        concept: CONCEPT.homeFriction,
        value: { type: 'text', value: 'kitchen counter' },
        method: 'self-report',
      },
    )
    const matters = kit.record(
      'preference',
      { occurredAt: sevenDaysAgo, domains: [DOMAIN.home] },
      { about: entityRef('place', 'the kitchen'), stance: 'prefers', statement: 'a clear counter' },
    )

    const loaded = snapshotFromWire(
      kit.document({ records: [homeFriction, matters], entities: [], exportedAt: now }),
    )
    expect(loaded.loaded).toBe(true)
    const view = buildView(loaded.snapshot, { now, zone: kit.zone })
    const situation = assembleSituation(view, { now, zone: kit.zone, weekStartsOn: 1 })

    const page = pageBySlug('home')
    if (page === undefined) throw new Error('home page missing')
    const data = assembleDomainPageData(situation, page)

    expect(data.coverage[0]?.status).toBe('quiet')
    const friction = data.readings.find((entry) => entry.concept === CONCEPT.homeFriction)
    expect(friction?.state).toBe('stale')
    expect(friction?.outOfDate).toBe(true)

    const summary = data.coverage[0]?.summary ?? ''
    expect(summary.toLowerCase()).not.toContain('nothing here has gone out of date')
    expect(summary.toLowerCase()).not.toContain('nothing here')
  })

  it('puts a same-moment correction after the thing it corrects, in "recently"', () => {
    /*
     * The audit, reading Life on the deployed Preview: *"Energy 3 of 5"*, then
     * a walk, then *"Energy 2 of 5"* — the correction of the first reading,
     * printed two rows below it and underneath an event that happened after
     * both. A list of what has been happening, in an order in which it did not
     * happen (DEF-0050).
     *
     * A correction is *always* about the same moment as the thing it corrects,
     * so `occurredAt` alone can never separate them. Only `recordedAt` can, and
     * `compareRecordOrder` is where that rule already lives — Timeline has used
     * it since it was written, and this is the same list of the same records.
     */
    const kit = createKit('ord', 'America/Denver', '2026-01-01T00:00:00Z')
    const now = kit.local('2026-07-14', '21:00')
    const evening = kit.local('2026-07-14', '18:00')

    const energy = (step: number, recordedAt: number) =>
      kit.record(
        'observation',
        { occurredAt: evening, recordedAt: recordedAt as typeof evening, domains: [DOMAIN.health] },
        {
          concept: CONCEPT.energy,
          value: { type: 'scale', value: step, of: 5 },
          method: 'self-report',
        },
      )

    // Said at 18:01, corrected at 18:20 — both *about* six o'clock.
    const first = energy(3, kit.local('2026-07-14', '18:01'))
    const corrected = energy(2, kit.local('2026-07-14', '18:20'))

    const loaded = snapshotFromWire(
      // Deliberately written newest-first, so nothing can pass by accident of
      // the order the records happen to arrive in.
      kit.document({ records: [corrected, first], entities: [], exportedAt: now }),
    )
    expect(loaded.loaded).toBe(true)
    const view = buildView(loaded.snapshot, { now, zone: kit.zone })
    const situation = assembleSituation(view, { now, zone: kit.zone, weekStartsOn: 1 })

    const page = pageBySlug('health-recovery')
    if (page === undefined) throw new Error('health-recovery page missing')
    const rows = assembleDomainPageData(situation, page).recentChanges

    const correctedRow = rows.findIndex((row) => row.id === corrected.id)
    const firstRow = rows.findIndex((row) => row.id === first.id)
    expect(correctedRow, 'the corrected reading is not in the list').toBeGreaterThanOrEqual(0)
    expect(firstRow, 'the reading it replaced is not in the list').toBeGreaterThanOrEqual(0)
    expect(
      correctedRow,
      'the correction printed below the reading it replaced, newest first',
    ).toBeLessThan(firstRow)
  })

  it('never says an area is up to date while a reading on the same page is not', () => {
    /*
     * QA-C7, and the same class as QA-M1 above one status along. `current`
     * means *something has come in recently* — it says nothing about whether
     * what the app believes is still good, and the audit found "Fresh — up to
     * date on what matters" sitting directly above a belief the app had itself
     * marked out of date (DEF-0051).
     *
     * A reading four days past its own seven-day window, in a domain that heard
     * from him this morning: both readings are honest, and the summary must not
     * flatten them into one claim.
     */
    const kit = createKit('c7', 'America/Denver', '2026-01-01T00:00:00Z')
    const now = kit.local('2026-07-14', '19:00')

    const stale = kit.record(
      'observation',
      { occurredAt: addLocalDays(now, -5, kit.zone), domains: [DOMAIN.home] },
      {
        concept: CONCEPT.homeFriction,
        value: { type: 'text', value: 'kitchen counter' },
        method: 'self-report',
      },
    )
    // Something standing and current, so the domain itself reads `current`.
    const held = kit.record(
      'preference',
      { occurredAt: addLocalDays(now, -1, kit.zone), domains: [DOMAIN.home] },
      { about: entityRef('place', 'the kitchen'), stance: 'prefers', statement: 'a clear counter' },
    )

    const loaded = snapshotFromWire(
      kit.document({ records: [stale, held], entities: [], exportedAt: now }),
    )
    expect(loaded.loaded).toBe(true)
    const view = buildView(loaded.snapshot, { now, zone: kit.zone })
    const situation = assembleSituation(view, { now, zone: kit.zone, weekStartsOn: 1 })

    const page = pageBySlug('home')
    if (page === undefined) throw new Error('home page missing')
    const data = assembleDomainPageData(situation, page)

    expect(data.coverage[0]?.status, 'this fixture is meant to read as current').toBe('current')
    const friction = data.readings.find((entry) => entry.concept === CONCEPT.homeFriction)
    expect(friction?.outOfDate, 'the fixture no longer holds an out-of-date reading').toBe(true)

    const summary = (data.coverage[0]?.summary ?? '').toLowerCase()
    expect(summary, 'the app claims a whole area is current').not.toMatch(/is current/)
    expect(summary, 'the app claims everything here is up to date').not.toMatch(/up to date/)
    // What it may say is what it actually knows: that something came in.
    expect(summary).toMatch(/has come in/)
  })
})
