import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { instant } from '../../src/domain/time'
import { PROGRESS_EVIDENCE } from '../../src/domain/progress'
import { decide } from '../../src/intelligence/engine'
import {
  insightsFor,
  staleBeliefCards,
  STALE_BELIEFS_BEFORE_GROUPING,
  type StaleBelief,
} from '../../src/intelligence/insights'
import { describeDays } from '../../src/intelligence/coverage'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { loadScenario } from './harness'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/**
 * The repairs for independent QA Round 1 — QA-90-002 and QA-90-003.
 *
 * Round 1's three blockers were all found in places the phase's own tests were
 * green over, and QA said so directly: two of the three were **false greens in
 * regressions I wrote**. So each test here is written to fail on the shipped
 * defect first, and each is proved by putting the defect back.
 *
 * QA-90-001 is a behaviour on a rendered screen and its regression is in
 * `tests/browser/phase90-round1.spec.ts`, where a browser can answer it.
 */

// ---------------------------------------------------------------------------
// QA-90-003 — every legal grouped cardinality is truthful
// ---------------------------------------------------------------------------

const WORD_VALUE: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
}

/** Every number a sentence states, whether written as a word or as digits. */
function numbersIn(text: string): readonly number[] {
  const out: number[] = []
  for (const match of text.matchAll(/\d+/g)) out.push(Number(match[0]))
  for (const match of text.matchAll(/\b[a-z]+\b/gi)) {
    const value = WORD_VALUE[match[0]!.toLowerCase()]
    if (value !== undefined) out.push(value)
  }
  return out
}

/** A stale belief with a chosen age, built from the production type. */
function belief(subject: string, days: number): StaleBelief {
  return {
    card: {
      rank: 65,
      insight: {
        id: `stale:${subject}`,
        kind: 'stale-assumption',
        eyebrow: 'GOING ON OLD EVIDENCE',
        domain: undefined,
        headline: `What the app thinks about ${subject} is ${describeDays(days)} old.`,
        detail: 'The most recent thing you said about it was a while ago.',
        confidence: undefined,
        sources: [],
        evidence: {
          comparable: 2,
          window: undefined,
          counted: undefined,
          rates: [],
          counterexamples: [],
          included: [],
          includedTitle: undefined,
          excluded: [],
          excludedTitle: undefined,
          strongerIn: undefined,
          weakerIn: undefined,
          trend: undefined,
          mix: undefined,
          reasoning: [],
        },
        belief: undefined,
      },
    },
    subject,
    days,
    domain: undefined,
  }
}

describe('QA-90-003 — a grouped card states the count it actually grouped', () => {
  /**
   * Subjects with no digit and no number word in them, and ages far enough
   * apart that the oldest and youngest are unambiguous.
   *
   * The names matter: a fixture subject called "subject 1" puts a number into
   * the sentence under test, and the assertion below would then be reading the
   * fixture rather than the product. The first draft of this test did exactly
   * that and reported six failures that were all its own.
   */
  const SUBJECTS = [
    'clearing the kitchen',
    'building a lab',
    'getting out for a walk',
    'reaching out to your sister',
    'the reading habit',
    'stretching before bed',
    'the budget review',
    'practising scales',
  ] as const

  const group = (size: number): readonly StaleBelief[] =>
    Array.from({ length: size }, (_, index) => belief(SUBJECTS[index]!, 60 + index * 31))

  it('groups at exactly three, and not at two', () => {
    expect(STALE_BELIEFS_BEFORE_GROUPING).toBe(3)
    expect(staleBeliefCards(group(2))).toHaveLength(2)
    expect(staleBeliefCards(group(3))).toHaveLength(1)
  })

  it('states no number it did not group, at any legal size', () => {
    /*
     * The rule, and it is deliberately not "the reasoning contains the right
     * literal".
     *
     * The shipped defect was a sentence reading *"four cards saying the same
     * thing about four different subjects"* under a headline reading *"3 things
     * the app is still going on"* — the card contradicting its own count at the
     * very first legal branch. A test that checked the headline, or that
     * checked size four, stays green over that. So this reads **every sentence
     * the card renders** and requires every number in it to be one the card is
     * entitled to say: the number grouped, or one of the real ages it reports.
     */
    const offenders: string[] = []
    for (let size = STALE_BELIEFS_BEFORE_GROUPING; size <= 8; size += 1) {
      const entries = group(size)
      const cards = staleBeliefCards(entries)
      expect(cards, `${size} beliefs group into one card`).toHaveLength(1)
      const insight = cards[0]!.insight

      /*
       * Two rules, because the two parts are entitled to different numbers.
       *
       * The headline and the detail **report ages** — "two months old or more",
       * "the oldest, at five months" — so they may state the count or a real
       * age. The reasoning states no age at all, so the only number it may
       * contain is the number grouped.
       *
       * The looser rule alone is not enough, and finding that out is why the
       * split exists: at size three the real ages are two, three and four
       * months, so a hard-coded "four" is inside the permitted set and the
       * defect passes. A test whose fixture accidentally licenses the bug is
       * the same failure this whole round is about.
       */
      const ages = new Set<number>([size])
      for (const entry of entries)
        for (const value of numbersIn(describeDays(entry.days))) ages.add(value)

      for (const sentence of [insight.headline, insight.detail]) {
        for (const stated of numbersIn(sentence)) {
          if (!ages.has(stated)) offenders.push(`${size}: “${sentence}” states ${stated}`)
        }
      }
      for (const sentence of insight.evidence.reasoning) {
        for (const stated of numbersIn(sentence)) {
          if (stated !== size) {
            offenders.push(`${size}: reasoning “${sentence}” states ${stated}`)
          }
        }
      }
      expect(insight.evidence.comparable, `${size}: comparable`).toBe(size)
    }
    expect(offenders, 'a grouped card stated a number it did not group').toEqual([])
  })

  it('explains the grouping with the number it grouped, at the boundary', () => {
    // The exact branch Round 1 reproduced: three, not four.
    const reasoning = staleBeliefCards(group(3))[0]!.insight.evidence.reasoning.join(' ')
    expect(reasoning).toContain('3 cards')
    expect(reasoning, 'the boundary case may not say four').not.toMatch(/\bfour\b/i)
  })

  it('holds on every grouped card the shipped library can actually reach', () => {
    /*
     * The branch above is production code called with production types; this is
     * the same invariant on cards the app really renders, so the repair cannot
     * be true only where a test constructs it.
     */
    const offenders: string[] = []
    let seen = 0
    for (const scenario of SCENARIOS) {
      const loaded = loadScenario(scenario.id)
      const later = instant(scenario.now + 200 * 86_400_000)
      const decision = decide(loaded.viewAt(later), { now: later, zone: scenario.zone })
      for (const insight of insightsFor(decision.situation).insights) {
        if (insight.id !== 'stale:several') continue
        seen += 1
        const grouped = Number(/^(\d+)\s+things/.exec(insight.headline)?.[1] ?? Number.NaN)
        expect(grouped, `${scenario.id}: the headline names a count`).toBeGreaterThanOrEqual(
          STALE_BELIEFS_BEFORE_GROUPING,
        )
        expect(insight.evidence.comparable, `${scenario.id}: comparable agrees`).toBe(grouped)
        for (const sentence of insight.evidence.reasoning) {
          for (const stated of numbersIn(sentence)) {
            if (stated !== grouped) offenders.push(`${scenario.id}: “${sentence}” states ${stated}`)
          }
        }
      }
    }
    expect(seen, 'the library reaches a grouped card at all').toBeGreaterThan(0)
    expect(offenders, 'a rendered grouped card disagrees with its own count').toEqual([])
  })
})

describe('QA-90-003, the class — a card that opens with a count states the one it computed', () => {
  it('holds for every card kind the library renders, at two moments each', () => {
    /*
     * The finding one step out.
     *
     * QA-90-003 was a grouped stale-belief card whose explanation stated a
     * cardinality it had not computed. The **class** is any card that opens by
     * counting a set it assembled — the coverage card says "4 areas have gone
     * quiet", this one says "3 things the app is still going on" — and the
     * invariant that ties the sentence to the arithmetic is already on the
     * object: `evidence.comparable` is the size of the set the card is about.
     *
     * So: wherever a headline begins with a number, that number is the one the
     * card counted. This is a rule about every card kind rather than a second
     * test of the one that was wrong, which is the difference between fixing a
     * defect and closing the class it belongs to.
     */
    const offenders: string[] = []
    let counted = 0
    for (const scenario of SCENARIOS) {
      const loaded = loadScenario(scenario.id)
      for (const days of [0, 200]) {
        const at = instant(scenario.now + days * 86_400_000)
        const situation = decide(loaded.viewAt(at), { now: at, zone: scenario.zone }).situation
        for (const insight of insightsFor(situation).insights) {
          const opens = /^(\d+)\s+\w+/.exec(insight.headline)
          if (opens === null) continue
          counted += 1
          const stated = Number(opens[1])
          if (insight.evidence.comparable !== stated) {
            offenders.push(
              `${scenario.id}@+${days}d ${insight.id}: says ${stated}, counted ${insight.evidence.comparable}`,
            )
          }
        }
      }
    }
    expect(counted, 'the library renders counting headlines at all').toBeGreaterThan(0)
    expect(offenders, 'a card opened with a number it had not counted').toEqual([])
  })
})

// ---------------------------------------------------------------------------
// QA-90-002 — the object-kind vocabulary is closed in both directions
// ---------------------------------------------------------------------------

describe('QA-90-002 — every declared object kind is a kind the product uses', () => {
  const ui = readFileSync(join(ROOT, 'src/components/ui.tsx'), 'utf8')

  const declared = (): readonly string[] => {
    const block = /export type ObjectKindName =([\s\S]*?)\n\n/.exec(ui)
    expect(block, 'ui.tsx declares the union').not.toBeNull()
    return [...block![1]!.matchAll(/'([a-z-]+)'/g)].map((match) => match[1]!)
  }

  const featureFiles = (): readonly string[] => {
    const out: string[] = []
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) {
          walk(full)
          continue
        }
        if (name.endsWith('.tsx') || name.endsWith('.ts')) out.push(full)
      }
    }
    walk(join(ROOT, 'src', 'features'))
    return out
  }

  it('reads a union with every kind in it', () => {
    expect(declared().length).toBeGreaterThan(4)
    expect(declared()).toContain('session')
  })

  it('uses each one somewhere an owner can see it', () => {
    /*
     * D-193's rule, applied to a vocabulary rather than to copy: **nothing
     * rendered that is not declared, nothing declared that is not rendered.**
     *
     * Round 1 found the half that was missing. `session` was declared in the
     * union, described in the design record, named in the acceptance criterion
     * — and used by no surface, because every progress rung was rendered as
     * generic `evidence`. A vocabulary whose members resolve to one word is a
     * label, and the test that was supposed to catch it asserted only that the
     * markers on screen were styled alike.
     */
    const used = new Set<string>()
    for (const file of featureFiles()) {
      const text = readFileSync(file, 'utf8')
      for (const match of text.matchAll(/ObjectKind kind="([a-z-]+)"/g)) used.add(match[1]!)
      // The rungs resolve their kind through an exhaustive table.
      for (const match of text.matchAll(/^\s{2}'?([a-z-]+)'?:\s*'([a-z-]+)',$/gm)) {
        if (PROGRESS_EVIDENCE.includes(match[1]! as never)) used.add(match[2]!)
      }
    }
    const unused = declared().filter((kind) => !used.has(kind))
    expect(unused, 'a kind is declared and never shown to anyone').toEqual([])
  })

  it('maps each progress rung to a kind, exhaustively', () => {
    /*
     * The table is a `Record<ProgressEvidence, ObjectKindName>` rather than a
     * switch with a default, so an eighth rung is a compile error instead of a
     * rung that silently inherits the generic marker. A default is exactly how
     * "Sessions done" came to be labelled Evidence.
     */
    const panels = readFileSync(join(ROOT, 'src/features/life/DomainPanels.tsx'), 'utf8')
    expect(panels).toContain('const RUNG_KIND: Record<ProgressEvidence, ObjectKindName>')
    for (const rung of PROGRESS_EVIDENCE) {
      const key = /^[a-z]+$/.test(rung) ? rung : `'${rung}'`
      expect(panels, `${rung} has a kind`).toMatch(new RegExp(`\\n\\s{2}${key}: '[a-z-]+',`))
    }
    // The two rungs that are one of section 54's three named objects.
    expect(panels).toMatch(/\n\s{2}completion: 'session',/)
    expect(panels).toMatch(/\n\s{2}milestone: 'milestone',/)
  })
})
