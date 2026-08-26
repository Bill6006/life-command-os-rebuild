import { describe, expect, it } from 'vitest'
import { coreDomains, DOMAIN } from '../../src/domain/domains'
import { LIFE_PAGES, pageForDomain, pageBySlug } from '../../src/features/life/domainPages'
import { everyStandingWord, GROUP_ORDER, standingFor } from '../../src/features/life/standing'
import type { CoverageStatus, DomainCoverage } from '../../src/intelligence/coverage'

/**
 * D-078 — eleven domains, ten baseline pages, and the pair that shares one.
 *
 * The model keeps eleven domains (canonical plan section 4.1); Phase 5 builds
 * ten pages (section 50) because Health & Physical Capacity and Sleep &
 * Recovery share one Health & Recovery page. The rule the decision states is
 * not "ten domains" and not "eleven pages" — it is that every registry domain
 * is reachable from exactly one page, none omitted, none duplicated, and the
 * shared page names both domains it covers.
 */

describe('D-078 — every registry domain is reachable from exactly one page', () => {
  it('has exactly ten pages', () => {
    expect(LIFE_PAGES).toHaveLength(10)
  })

  it('reaches every domain in the registry from exactly one page', () => {
    for (const domain of coreDomains.all()) {
      const matches = LIFE_PAGES.filter((page) => page.domains.includes(domain.id))
      expect(
        matches.map((page) => page.slug),
        `${domain.label} should be on exactly one page`,
      ).toHaveLength(1)
    }
  })

  it('never lists the same domain on two pages', () => {
    const seen = new Set<string>()
    const duplicates: string[] = []
    for (const page of LIFE_PAGES) {
      for (const domain of page.domains) {
        if (seen.has(domain)) duplicates.push(domain)
        seen.add(domain)
      }
    }
    expect(duplicates).toEqual([])
  })

  it('never lists a domain the registry does not have', () => {
    const known = new Set(coreDomains.all().map((domain) => domain.id))
    const unknown = LIFE_PAGES.flatMap((page) => page.domains).filter(
      (domain) => !known.has(domain),
    )
    expect(unknown).toEqual([])
  })

  it('names both domains Health & Recovery covers, and does not split them', () => {
    const health = pageForDomain(DOMAIN.health)
    const sleep = pageForDomain(DOMAIN.sleep)
    expect(health?.slug).toBe('health-recovery')
    expect(sleep?.slug).toBe('health-recovery')
    expect(health).toBe(sleep)
    expect(health?.domains).toEqual([DOMAIN.health, DOMAIN.sleep])
  })

  it('gives every other domain its own page', () => {
    const soloDomains = coreDomains
      .all()
      .map((domain) => domain.id)
      .filter((id) => id !== DOMAIN.health && id !== DOMAIN.sleep)

    for (const domain of soloDomains) {
      expect(pageForDomain(domain)?.domains, domain).toEqual([domain])
    }
  })

  it('finds a page by its slug, and finds nothing for a slug that does not exist', () => {
    expect(pageBySlug('health-recovery')?.title).toBe('Health & Recovery')
    expect(pageBySlug('nonsense')).toBeUndefined()
  })

  it('has a unique, url-safe slug per page', () => {
    const slugs = LIFE_PAGES.map((page) => page.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) expect(slug).toMatch(/^[a-z][a-z-]*[a-z]$/)
  })
})

/**
 * The word Life puts on a group of areas, and what that word is allowed to
 * claim (DEF-0051).
 *
 * `CoverageStatus` answers *how recently has anything come in about this?* It
 * does not answer *is what the app believes about it still good?* — and Life
 * said "Fresh — up to date on what matters" directly above a belief carrying
 * its own out-of-date line. Two different questions, one word, and no way for
 * the owner to tell they were not contradicting each other.
 *
 * Asserted as a rule about the copy rather than as its exact sentences, so an
 * improvement to the wording does not fail this: the invariant is that no
 * status word claims currency of *belief*, and that "nothing here is out of
 * date" is never asserted for a whole group.
 */
describe('the status word Life puts on a group of areas', () => {
  const coverage = (status: CoverageStatus): DomainCoverage => ({
    domain: DOMAIN.home,
    label: 'Home',
    status,
    strength: 'moderate',
    matters: true,
    sources: [],
    lastEvidenceAt: undefined,
    daysSinceEvidence: undefined,
    later: 0,
    daysSinceHeard: undefined,
    source: undefined,
    concepts: [],
    weakest: undefined,
    refresh: 'needs-review',
    summary: '',
  })

  it('never claims what the app believes is up to date', () => {
    for (const status of ['current', 'quiet', 'stale', 'unheard'] as const) {
      const standing = standingFor(coverage(status))
      const said = `${standing.word} ${standing.note}`.toLowerCase()
      expect(said, `${status}: "${said}"`).not.toMatch(/up to date/)
      expect(said, `${status}: "${said}"`).not.toMatch(/nothing out of date/)
      expect(said, `${status}: "${said}"`).not.toMatch(/nothing (?:here )?has gone out of date/)
    }
  })

  it('gives every word it can produce a place in the order Life renders', () => {
    /*
     * Life renders `GROUP_ORDER` and discards any group whose word is not in
     * it. That is right for a fixed layout and dangerous unchecked: renaming
     * "Fresh" to "Recent" left the order untouched and three of the eleven
     * areas silently stopped appearing on the screen — no error, no empty
     * group, just gone.
     */
    for (const word of everyStandingWord()) {
      expect(GROUP_ORDER, `"${word}" has no place in the order, so Life drops it`).toContain(word)
    }
  })

  it('says what "current" actually means, which is that something came in', () => {
    const standing = standingFor(coverage('current'))
    expect(`${standing.word} ${standing.note}`.toLowerCase()).toMatch(/come in/)
    // And it does not ask to be looked at, which is the other half of the word.
    expect(standing.attention).toBe(false)
  })
})
