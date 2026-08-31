import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { instant } from '../../src/domain/time'
import { describeDuration } from '../../src/intelligence/vocabulary'
import {
  insightsFor,
  STALE_BELIEFS_BEFORE_GROUPING,
  type Insight,
} from '../../src/intelligence/insights'
import { describePremise } from '../../src/intelligence/explain'
import { assembleDomainPageData, LIFE_PAGES } from '../../src/features/life/domainPages'
import { decide } from '../../src/intelligence/engine'
import { loadScenario } from './harness'
import { SCENARIOS } from '../../src/synthetic/scenarios'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/**
 * The four audit findings routing 90 was assigned — AUD-0038(a), AUD-0038(b),
 * AUD-0043 and AUD-0044.
 *
 * Each is written the way the standing test rule asks for: **a rule about what
 * the screen may not do**, rather than an exact string that a reword would turn
 * green while the defect stood. AUD-0044 says so in its own words — *"write it
 * as a rule about what the screen may not do — repeat one template N times"*.
 */

describe('AUD-0038(b) — a duration is said the way a person says it', () => {
  it('keeps the count below an hour and a half, where the count is how he would say it', () => {
    expect(describeDuration(20)).toBe('20 minutes')
    expect(describeDuration(45)).toBe('45 minutes')
    expect(describeDuration(89)).toBe('89 minutes')
  })

  it('stops counting minutes above it', () => {
    expect(describeDuration(90)).toBe('an hour and a half')
    expect(describeDuration(120)).toBe('a couple of hours')
    expect(describeDuration(150)).toBe('two and a half hours')
    expect(describeDuration(180)).toBe('three hours')
    expect(describeDuration(300)).toBe('five hours')
  })

  it('says no number of minutes anywhere above the threshold', () => {
    /*
     * The rule, rather than the five cases above.
     *
     * "About 120 minutes free" was the finding. A formatter that fixed 120 and
     * 300 and left 210 saying "210 minutes" would pass a table of examples and
     * put the defect back on an ordinary Saturday.
     */
    const offenders: string[] = []
    for (let minutes = 90; minutes <= 720; minutes += 1) {
      const said = describeDuration(minutes)
      if (/\bminutes?\b/.test(said)) offenders.push(`${minutes} → ${said}`)
    }
    expect(offenders, 'no machine unit survives above an hour and a half').toEqual([])
  })

  it('is the only duration formatter the surfaces reach for', () => {
    /*
     * One formatter, in the layer every surface can reach — D-178.
     *
     * The finding was two renderings of one quantity in two files. Fixing the
     * premise and leaving `arbitrate.ts` with a private copy would have fixed
     * the sentence the audit quoted and left the disagreement in place.
     */
    const arbitrate = readFileSync(join(ROOT, 'src/intelligence/arbitrate.ts'), 'utf8')
    const explain = readFileSync(join(ROOT, 'src/intelligence/explain.ts'), 'utf8')
    for (const [name, text] of [
      ['arbitrate.ts', arbitrate],
      ['explain.ts', explain],
    ] as const) {
      expect(text, `${name} composes no duration of its own`).not.toMatch(/`\$\{[^`]*\}\s*minutes/)
      expect(text, `${name} goes through the shared formatter`).toContain('describeDuration')
    }
  })

  it('never puts a raw minute count in the premise, on any history', () => {
    const offenders: string[] = []
    for (const scenario of SCENARIOS) {
      const premise = describePremise(loadScenario(scenario.id).decision().situation)
      const match = /(\d+)\s+minutes\s+free/.exec(premise)
      if (match !== null && Number(match[1]) >= 90) {
        offenders.push(`${scenario.id}: ${premise}`)
      }
    }
    expect(offenders, 'a premise counts minutes only where a person would').toEqual([])
  })
})

describe('AUD-0038(a) — the flag and its response are on the same screen', () => {
  const now = readFileSync(join(ROOT, 'src/features/now/NowScreen.tsx'), 'utf8')
  const page = readFileSync(join(ROOT, 'src/features/life/DomainPage.tsx'), 'utf8')

  it('draws the two standing controls on Now', () => {
    expect(now).toContain('StandingControls')
  })

  it('writes the same two records the Life page writes, from the same two builders', () => {
    /*
     * The audit's own test requirement, and it is about records rather than
     * about buttons: *"assert the controls appear and write the same records as
     * the Life page."* A second pair of builders that happened to produce
     * something similar would satisfy a screenshot and not this.
     */
    for (const builder of ['coverageInterpretationRecord', 'domainStatusCorrectionRecord']) {
      expect(now, `Now writes ${builder}`).toContain(builder)
      expect(page, `the Life page writes ${builder}`).toContain(builder)
    }
  })

  it('draws them from one component, so the two screens cannot drift apart', () => {
    /*
     * The finding's sibling in the same audit entry is two files disagreeing
     * about a hundred and twenty minutes. Copying the markup onto Now would
     * have closed this loop and opened that one.
     */
    const panels = readFileSync(join(ROOT, 'src/features/life/DomainPanels.tsx'), 'utf8')
    expect(panels).toContain('export function StandingControls')
    for (const surface of [now, page]) {
      expect(surface).not.toContain("I've been keeping on top of this")
    }
    expect(panels).toContain("I've been keeping on top of this")
  })

  it('offers them only where the app is actually out of date', () => {
    /*
     * Not a nag. The panel is bound to a `coverage` limiter, which is the app's
     * own blind spot (D-063) and the only one of the four kinds these controls
     * can answer — a body short of rest is not settled by "something's changed".
     */
    expect(now).toContain("limiter?.kind !== 'coverage'")
  })
})

describe('AUD-0043 — a domain page says what the app is working out here', () => {
  it('carries the area on the gathering line rather than making a page work it out', () => {
    /*
     * The coverage precedent, and it is the reason this is one line of data
     * rather than a filter written on a page: two computations over one history
     * eventually disagree, and the owner cannot tell which screen is lying.
     */
    const pages = readFileSync(join(ROOT, 'src/features/life/domainPages.ts'), 'utf8')
    expect(pages).toContain('insightsFor(situation).gathering')
    expect(pages, 'the page filters; it does not decide').not.toMatch(
      /function gatheringFor[\s\S]*situation\.learning/,
    )
  })

  it('shows on the page a line that Insights shows on the same history', () => {
    const found: string[] = []
    for (const scenario of SCENARIOS) {
      const situation = loadScenario(scenario.id).decision().situation
      const global = insightsFor(situation).gathering
      for (const page of LIFE_PAGES) {
        const data = assembleDomainPageData(situation, page)
        for (const line of data.gathering) {
          // Identity, not similarity: the page shows one of the report's own lines.
          expect(global, `${scenario.id} / ${page.slug}`).toContainEqual(line)
          found.push(`${scenario.id}/${page.slug}`)
        }
      }
    }
    expect(found.length, 'the library reaches this panel at all').toBeGreaterThan(0)
  })

  it('is absent rather than empty where nothing is being worked out', () => {
    /*
     * DEF-0013's precedent, and section 7's rule that these pages stay dull. A
     * panel that rendered an empty list on every area every day would be the
     * homework D-075 took off Life, arriving on eleven pages instead of one.
     */
    const page = readFileSync(join(ROOT, 'src/features/life/DomainPage.tsx'), 'utf8')
    expect(page).toContain('data.gathering.length === 0 ? null')
  })

  it('offers nothing to press, because it is not a task', () => {
    const page = readFileSync(join(ROOT, 'src/features/life/DomainPage.tsx'), 'utf8')
    const start = page.indexOf('What the app is working out here')
    const end = page.indexOf('{data.goals.length === 0', start)
    expect(start, 'the panel is on the page').toBeGreaterThan(-1)
    expect(page.slice(start, end)).not.toContain('<button')
  })
})

describe('AUD-0044 — one card, however many beliefs have gone old', () => {
  /**
   * Every card on every history in the library, at the moment each is written
   * around and at a moment two months past its own last outcome.
   *
   * The second reading is the finding's own reproduction: *"any date more than
   * two months past the history's last outcome — which is an ordinary thing to
   * happen after a busy quarter"*.
   */
  function everyStack(): readonly { readonly where: string; readonly cards: readonly Insight[] }[] {
    const out: { where: string; cards: readonly Insight[] }[] = []
    for (const scenario of SCENARIOS) {
      const loaded = loadScenario(scenario.id)
      out.push({ where: scenario.id, cards: insightsFor(loaded.decision().situation).insights })

      /*
       * The same history, two hundred days on.
       *
       * Through `decide`, so the situation is the one Now would assemble rather
       * than one this test composed — a stale-belief card that only appeared
       * under a hand-built situation would prove nothing about the screen.
       */
      const later = instant(scenario.now + 200 * 86_400_000)
      const decision = decide(loaded.viewAt(later), { now: later, zone: scenario.zone })
      out.push({
        where: `${scenario.id} @ +200 days`,
        cards: insightsFor(decision.situation).insights,
      })
    }
    return out
  }

  it('never repeats one template down the screen', () => {
    /*
     * The rule, and it is deliberately not "no more than three stale cards".
     *
     * DEF-0026 was one row per domain, seven of eleven lines identical, every
     * sentence true. What makes that a defect is the repetition, not the count,
     * so this asks the question the owner's eye asks: **does this screen say the
     * same thing more than twice with the noun changed?**
     */
    const offenders: string[] = []
    for (const { where, cards } of everyStack()) {
      const byKind = new Map<string, number>()
      for (const card of cards) {
        if (card.kind !== 'stale-assumption') continue
        byKind.set(card.kind, (byKind.get(card.kind) ?? 0) + 1)
      }
      for (const [kind, count] of byKind) {
        if (count >= STALE_BELIEFS_BEFORE_GROUPING) offenders.push(`${where}: ${count} × ${kind}`)
      }
    }
    expect(offenders, 'a screen may not repeat one template').toEqual([])
  })

  it('names every belief it covers when it groups', () => {
    /*
     * The risk the audit named: grouping hides which belief is oldest unless
     * the card says so. The coverage card solves it by naming the longest-silent
     * one and pointing at the full list; this does the same.
     */
    let grouped = 0
    for (const { cards } of everyStack()) {
      for (const card of cards) {
        if (card.id !== 'stale:several') continue
        grouped += 1
        expect(card.headline, 'the group lists what it covers').toMatch(/ and /)
        expect(card.detail, 'and names the oldest').toContain('oldest')
        expect(card.evidence.included.length, 'the deeper view carries the detail').toBeGreaterThan(
          0,
        )
        /*
         * No belief key on a group — a single key over four beliefs would let a
         * correction land on one the owner was not looking at.
         */
        expect(card.belief, 'a group is not something to overrule').toBeUndefined()
      }
    }
    expect(grouped, 'the library reaches the grouped card at all').toBeGreaterThan(0)
  })

  it('leaves a pair as a pair', () => {
    // "Do not group at two — a pair reads fine as a pair."
    expect(STALE_BELIEFS_BEFORE_GROUPING).toBe(3)
  })
})
