import { describe, expect, it } from 'vitest'
import { DOMAIN, type LifeDomainId } from '../../src/domain/domains'
import {
  weekPointedAt,
  WEEK_POINTED_AT_NOW,
  WEEK_POINTED_AT_ZONE,
  type WeekDirectionOptions,
} from '../../src/synthetic/scenarios'
import { chosenDomain, chosenId, decideOn, loadScenario, sentenceOf } from './harness'

/**
 * G-008 — a non-career weekly direction.
 *
 * > Input: current weekly direction is home, fatherhood, health, or another
 * > non-career domain.
 * > Expected: stored semantic category matches; arbitration uses the real
 * > direction; no hardcoded career value.
 *
 * The scenario holds one evening still and offers four genuinely live options —
 * a room worth clearing, a daughter who is here, a topic that is behind, and
 * the capacity for a walk — then changes nothing but the direction. What gets
 * chosen follows it. That is a stronger claim than "the home direction produces
 * a home move", which a single hardcoded mapping would also satisfy.
 *
 * The last two cases are the ones that matter most. A direction that names no
 * life area must pull nowhere rather than quietly landing on career, and a
 * direction from last week must stop counting at the owner-local week boundary
 * rather than seven days after it was written.
 */

function decideWith(options: WeekDirectionOptions) {
  return decideOn(weekPointedAt(options), WEEK_POINTED_AT_NOW, WEEK_POINTED_AT_ZONE)
}

const noDirection = decideWith({})

/** What `direction-fit` contributed to whatever was chosen. */
function decision0Fit(decision: ReturnType<typeof decideWith>): number | undefined {
  const top = decision.trace.ranking[0]
  return top?.dimensions.find((dimension) => dimension.name === 'direction-fit')?.value
}

describe('G-008 — the category is stored, not guessed', () => {
  it('carries the life area and the owner’s own words for it', () => {
    const decision = decideWith({ direction: { named: DOMAIN.home, wording: 'a calmer house' } })
    const weekly = decision.trace.direction.weekly

    expect(weekly.state).toBe('set')
    expect(decision.trace.direction.category).toBe(DOMAIN.home)
    expect(weekly.state === 'set' ? weekly.wording : '').toBe('a calmer house')
  })

  it('is what the scenario on the QA screen actually contains', () => {
    const decision = loadScenario('week-pointed-at-home').decision()
    expect(decision.trace.direction.category).toBe(DOMAIN.home)
    expect(chosenDomain(decision)).toBe(DOMAIN.home)
    expect(sentenceOf(decision)).toContain('kitchen')
  })
})

describe('G-008 — arbitration follows the real direction', () => {
  it('lands on time with his daughter when no direction is set', () => {
    /*
     * Stated first because everything below is measured against it, and it
     * moved in Phase 82 — AUD-0035.
     *
     * The baseline used to be the career rep, and it was there partly by
     * artefact: `goal-fit` returned zero **at full weight** for every move in
     * an area with no goal, so the fatherhood move was marked down for the
     * owner not having set a goal about his daughter. That is not a fact about
     * the move, and the dimension now abstains.
     *
     * What is left is the honest reading of this evening: she is here, there is
     * an hour, and rest is in hand. The two are within a hundredth of each
     * other — which is what makes this history a good instrument for the
     * direction, and is why the app says out loud that it was close.
     */
    expect(chosenDomain(noDirection)).toBe(DOMAIN.fatherhood)
  })

  const cases: readonly { readonly domain: LifeDomainId; readonly wording: string }[] = [
    { domain: DOMAIN.home, wording: 'a calmer house' },
    { domain: DOMAIN.career, wording: 'the CCNA push' },
    { domain: DOMAIN.health, wording: 'moving every day' },
  ]

  for (const { domain, wording } of cases) {
    it(`a week pointed at ${domain} chooses a ${domain} move instead of the baseline`, () => {
      const decision = decideWith({ direction: { named: domain, wording } })
      expect(decision.kind).toBe('move')
      expect(chosenDomain(decision)).toBe(domain)
      expect(chosenDomain(decision)).not.toBe(chosenDomain(noDirection))
    })
  }

  it('does the work even where the winner is the one it was already going to be', () => {
    /*
     * The case the loop above cannot make: a week pointed at fatherhood chooses
     * the same move as no week at all, so "it changed the answer" proves
     * nothing. What it changed is the *margin* — the direction is a reason
     * rather than a coincidence, and the app is no longer picking between
     * near-equals.
     */
    const pointed = decideWith({
      direction: { named: DOMAIN.fatherhood, wording: 'more time with Adaya' },
    })
    expect(chosenDomain(pointed)).toBe(DOMAIN.fatherhood)

    const marginOf = (decision: ReturnType<typeof decideWith>): number => {
      const ranked = decision.trace.ranking
      return (ranked[0]?.score ?? 0) - (ranked[1]?.score ?? 0)
    }
    expect(marginOf(pointed)).toBeGreaterThan(marginOf(noDirection))

    const fit = decision0Fit(pointed)
    expect(fit, 'the direction contributed nothing to the winner').toBe(1)
  })

  it('reaches four different answers from one history', () => {
    // The strongest claim in the file, and the one a single hardcoded mapping
    // could not satisfy: one evening, four directions, four different moves.
    const chosen = [...cases, { domain: DOMAIN.fatherhood, wording: 'more time with Adaya' }].map(
      ({ domain, wording }) => chosenId(decideWith({ direction: { named: domain, wording } })),
    )
    expect(new Set(chosen).size).toBe(4)
  })
})

describe('G-008 — nothing falls back to career', () => {
  const uncategorised = decideWith({ direction: { text: 'get out of my own way' } })

  it('stores no category for a direction that names no life area', () => {
    const weekly = uncategorised.trace.direction.weekly
    expect(weekly.state).toBe('uncategorised')
    expect(uncategorised.trace.direction.category).toBeUndefined()
    // The owner's words survive even though the category could not be worked
    // out — section 21, custom wording must remain visible.
    expect(weekly.state === 'uncategorised' ? weekly.wording : '').toBe('get out of my own way')
  })

  it('pulls no candidate in any direction at all', () => {
    // The precise claim, and the one that does not depend on which move happens
    // to win: an uncategorised direction contributes nothing to any score. A
    // fallback category would show up here as a non-zero pull on every move.
    for (const row of uncategorised.trace.ranking) {
      const fit = row.dimensions.find((dimension) => dimension.name === 'direction-fit')
      expect(fit?.value, row.id).toBe(0)
    }
  })

  it('reaches exactly the answer it would have reached with no direction', () => {
    expect(chosenId(uncategorised)).toBe(chosenId(noDirection))
  })

  it('still reads a direction written as the plain name of a life area', () => {
    const decision = decideWith({ direction: { text: 'home' } })
    expect(decision.trace.direction.category).toBe(DOMAIN.home)
    expect(chosenDomain(decision)).toBe(DOMAIN.home)
  })
})

describe('G-008 — a week ends at the week boundary', () => {
  it('stops counting a direction set in the previous owner-local week', () => {
    const stale = decideWith({
      direction: { named: DOMAIN.home, wording: 'a calmer house' },
      setLastWeek: true,
    })

    expect(stale.trace.direction.weekly.state).toBe('expired')
    expect(stale.trace.direction.category).toBeUndefined()
    expect(chosenId(stale)).toBe(chosenId(noDirection))
  })

  it('keeps the expired wording visible rather than deleting it', () => {
    const stale = decideWith({
      direction: { named: DOMAIN.home, wording: 'a calmer house' },
      setLastWeek: true,
    })
    const weekly = stale.trace.direction.weekly
    expect(weekly.state === 'expired' ? weekly.wording : '').toBe('a calmer house')
  })

  it('is a week boundary and not seven days', () => {
    // Six days earlier, but the Monday before — so it has expired, where a
    // rolling seven-day horizon would still call it current.
    const stale = decideWith({
      direction: { named: DOMAIN.home, wording: 'a calmer house' },
      setLastWeek: true,
    })
    const weekly = stale.trace.direction.weekly
    expect(weekly.state).toBe('expired')
    expect(weekly.state === 'expired' ? weekly.weekId : '').not.toBe(stale.trace.weekId)
  })
})
