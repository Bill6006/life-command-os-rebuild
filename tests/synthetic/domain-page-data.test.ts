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
    // Found on the Android gate: "Said what a suggestion here was worth" four
    // times running, on a page whose whole history is about one place. The
    // subject is one lookup away — the record just was not resolving it.
    const loaded = loadScenario('what-worked')
    const situation = loaded.decision().situation
    const page = pageBySlug('home')
    if (page === undefined) throw new Error('home page missing')

    const data = assembleDomainPageData(situation, page)

    const completions = data.recentChanges.filter((entry) =>
      entry.text.startsWith('Followed through on a suggestion here'),
    )
    const outcomes = data.recentChanges.filter((entry) =>
      entry.text.startsWith('Said what a suggestion here was worth'),
    )
    expect(completions.length).toBeGreaterThan(0)
    expect(outcomes.length).toBeGreaterThan(0)
    for (const entry of [...completions, ...outcomes]) {
      expect(entry.text, entry.text).toContain('the kitchen')
    }
  })

  it('never claims a domain has nothing out of date while a reading on the same page is tagged out of date — QA-M1', () => {
    // homeFriction's own freshness window is 7 days; three times that,
    // floored at a week, is 21 — so a reading 10 days old is genuinely past
    // its own window (`stale`, "out of date" on its row) without yet being
    // neglected at the domain level (`quiet`, not `stale`). Both readings
    // are honest; the old copy asserted a blanket "nothing has gone out of
    // date" that the row directly underneath it contradicted.
    const kit = createKit('m1', 'America/Denver', '2026-01-01T00:00:00Z')
    const now = kit.local('2026-07-14', '19:00')
    const tenDaysAgo = addLocalDays(now, -10, kit.zone)

    const homeFriction = kit.record(
      'observation',
      { occurredAt: tenDaysAgo, domains: [DOMAIN.home] },
      {
        concept: CONCEPT.homeFriction,
        value: { type: 'text', value: 'kitchen counter' },
        method: 'self-report',
      },
    )
    const matters = kit.record(
      'preference',
      { occurredAt: tenDaysAgo, domains: [DOMAIN.home] },
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
})
