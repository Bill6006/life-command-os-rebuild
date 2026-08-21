import { describe, expect, it } from 'vitest'
import { coreDomains, DOMAIN } from '../../src/domain/domains'
import { LIFE_PAGES, pageForDomain, pageBySlug } from '../../src/features/life/domainPages'

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
