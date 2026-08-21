import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { assembleDomainPageData, pageBySlug } from '../../src/features/life/domainPages'
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
})
