import { describe, expect, it } from 'vitest'
import { DOMAIN } from '../../src/domain/domains'
import { entityRef } from '../../src/domain/entities'
import { sequentialRecordIds } from '../../src/domain/ids'
import type { DecisionContext } from '../../src/domain/records'
import { assembleSituation } from '../../src/intelligence/situation'
import {
  insightsFor,
  MEASURED_ASPECTS,
  MIN_FOR_A_RATE,
  type Insight,
  type MeasuredRate,
} from '../../src/intelligence/insights'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { createKit, pastEpisodeRecords, type PastEpisode } from '../../src/synthetic/kit'
import { SCENARIOS } from '../../src/synthetic/scenarios'
import { loadScenario, ORPHAN_PRONOUNS } from './harness'

/**
 * Insights against real synthetic histories (canonical plan sections 27 and 51).
 *
 * Two kinds of test live here and they do different jobs.
 *
 * The **sweeps** walk every scenario in the library and hold every card
 * produced to the rules that govern a number on this surface — a defensible
 * denominator, a named quantity, no merged statistic, no research language.
 * They are the reason a new scenario or a new insight kind cannot introduce a
 * dishonest figure one history at a time.
 *
 * The **claims** are the phase gate's own list, each proved on a history built
 * for it: context changes what a pattern means, later evidence can reverse an
 * earlier one, a counterexample demonstrably changes a card, and weak evidence
 * produces an honest "not enough yet" rather than a manufactured figure.
 */

function everyCard(): readonly { readonly scenario: string; readonly insight: Insight }[] {
  const out: { scenario: string; insight: Insight }[] = []
  for (const scenario of SCENARIOS) {
    const situation = loadScenario(scenario.id).decision().situation
    for (const insight of insightsFor(situation).insights) {
      out.push({ scenario: scenario.id, insight })
    }
  }
  return out
}

function everyRate(): readonly {
  readonly scenario: string
  readonly insight: Insight
  readonly rate: MeasuredRate
}[] {
  const out: { scenario: string; insight: Insight; rate: MeasuredRate }[] = []
  for (const { scenario, insight } of everyCard()) {
    for (const rate of insight.evidence.rates) out.push({ scenario, insight, rate })
  }
  return out
}

function orphansIn(sentence: string): readonly string[] {
  const words = sentence.toLowerCase().match(/[a-z']+/g) ?? []
  return [...new Set(words.filter((word) => (ORPHAN_PRONOUNS as readonly string[]).includes(word)))]
}

// ---------------------------------------------------------------------------
// The sweeps
// ---------------------------------------------------------------------------

describe('every number on this surface, across the whole library', () => {
  const rates = everyRate()

  it('has some to check', () => {
    expect(rates.length).toBeGreaterThan(8)
  })

  it('names what it measures, every time', () => {
    for (const { scenario, insight, rate } of rates) {
      expect(
        rate.measures.length,
        `${scenario} / ${insight.id}: a figure with nothing saying what it measures`,
      ).toBeGreaterThan(10)
      expect(MEASURED_ASPECTS).toContain(rate.aspect)
    }
  })

  it('prints a percentage only over a defensible denominator', () => {
    /*
     * The gate line, asserted directly: "no percentage appears anywhere without
     * a defensible sample and a named measured aspect".
     */
    for (const { scenario, insight, rate } of rates) {
      if (rate.percent === undefined) continue
      expect(
        rate.of,
        `${scenario} / ${insight.id}: ${rate.percent}% over ${rate.of}`,
      ).toBeGreaterThanOrEqual(MIN_FOR_A_RATE)
      expect(rate.hit).toBeLessThanOrEqual(rate.of)
      expect(rate.percent).toBe(Math.round((rate.hit / rate.of) * 100))
    }
  })

  it('either states a figure or says why not, and never both or neither', () => {
    for (const { scenario, insight, rate } of rates) {
      const has = rate.percent !== undefined
      const explains = rate.withheld !== undefined
      expect(has !== explains, `${scenario} / ${insight.id}: ${JSON.stringify(rate)}`).toBe(true)
    }
  })

  it('withholds a figure with a reason a person can act on', () => {
    const withheld = rates.filter((entry) => entry.rate.withheld !== undefined)
    expect(withheld.length).toBeGreaterThan(0)
    for (const { rate } of withheld) {
      expect(rate.of).toBeLessThan(MIN_FOR_A_RATE)
      expect(rate.withheld).toMatch(/not enough|nothing recorded/i)
    }
  })

  it('never folds two aspects into one denominator', () => {
    /*
     * DEF-0020's rule, held structurally rather than by wording. Within one
     * card each aspect is counted separately, so two aspects sharing a
     * numerator and denominator by accident would mean one tally had been
     * reused for another aspect's question.
     */
    for (const { scenario, insight } of everyCard()) {
      const seen = new Set<string>()
      for (const rate of insight.evidence.rates) {
        expect(seen.has(rate.aspect), `${scenario} / ${insight.id}: ${rate.aspect} twice`).toBe(
          false,
        )
        seen.add(rate.aspect)
      }
    }
  })
})

describe('every card, read as a person would', () => {
  const cards = everyCard()

  it('produces some, on the histories that have evidence in them', () => {
    expect(cards.length).toBeGreaterThan(5)
    expect(new Set(cards.map((entry) => entry.scenario)).size).toBeGreaterThan(2)
  })

  it('never loses its subject', () => {
    for (const { scenario, insight } of cards) {
      // Coverage and trajectory headlines are the coverage engine's own
      // sentence and a "Label: reading" line; both name their subject by
      // construction and neither is composed here.
      if (insight.kind === 'coverage-gap' || insight.kind === 'trajectory') continue
      expect(orphansIn(insight.headline), `${scenario}: "${insight.headline}"`).toEqual([])
    }
  })

  it('uses no research language on the card itself', () => {
    /*
     * Section 27 — "translate technical evidence into normal language", and
     * "do not display research machinery by default"; section 61 rules out
     * research-report language and internal type names outright. The deeper
     * view may carry counts and windows; the card may not carry the machinery.
     */
    const machinery =
      /\bconfidence interval\b|\bp-?value\b|\bcorrelat|\bstatistical|\bsignifican|\bsample size\b|\bn ?= ?\d|\bstd\b|\bvariance\b|\bregression\b|\bprior\b|\bposterior\b/i
    for (const { scenario, insight } of cards) {
      expect(machinery.test(insight.headline), `${scenario}: "${insight.headline}"`).toBe(false)
      expect(machinery.test(insight.detail), `${scenario}: "${insight.detail}"`).toBe(false)
    }
  })

  it('states no merged success figure anywhere in its copy', () => {
    const merged = /\bsuccess rate\b|\boverall rate\b|\boverall success\b|\beffectiveness score\b/i
    for (const { scenario, insight } of cards) {
      for (const text of [insight.headline, insight.detail, ...insight.evidence.reasoning]) {
        expect(merged.test(text), `${scenario}: "${text}"`).toBe(false)
      }
    }
  })

  it('puts no machine identifier where a person expects a date', () => {
    /*
     * DEF-0029's class, found the same way it was: by reading the rendered
     * screen rather than by an assertion. The deeper view showed "12 comparable
     * occasions, between 2026-01-08 and 2026-11-12" — a local day id, which is
     * an identifier, on the one surface whose whole job is to be readable.
     *
     * Swept over every owner-facing string an insight can produce, so a new
     * card composing a sentence from a `dayId` fails here rather than on
     * whichever history happens to reach it.
     */
    const dayId = new RegExp(String.raw`\d{4}-\d{2}-\d{2}`)
    for (const { scenario, insight } of cards) {
      const text = [
        insight.eyebrow,
        insight.headline,
        insight.detail,
        insight.confidence?.because ?? '',
        insight.evidence.counted ?? '',
        insight.evidence.strongerIn ?? '',
        insight.evidence.weakerIn ?? '',
        insight.evidence.trend ?? '',
        insight.evidence.mix ?? '',
        ...insight.evidence.reasoning,
        ...insight.evidence.included.map((line) => line.text),
        ...insight.evidence.excluded.map((line) => line.text),
        ...insight.evidence.counterexamples.map((line) => line.text),
        ...insight.evidence.rates.map((rate) => `${rate.measures} ${rate.withheld ?? ''}`),
      ]
      for (const line of text) {
        expect(dayId.test(line), `${scenario} / ${insight.id}: "${line}"`).toBe(false)
      }
    }
  })

  it('says what a count is of, in the units that card actually counts', () => {
    /*
     * The other half of DEF-0038. One shared panel rendering "N comparable
     * occasions" put that sentence over a run of nightly sleep readings — where
     * nothing was compared and the twelve were readings — and over a standing
     * arrangement, where the count was of entries predating it. A card that
     * cannot say honestly what its number is of does not get to show one.
     *
     * Three shapes now, since D-089 added a card that counts two groups rather
     * than one: a belief card counts comparable occasions, an observed
     * relationship counts occasions with the move and occasions without it, and
     * a card that reports a reading counts nothing.
     */
    for (const { scenario, insight } of cards) {
      const counted = insight.evidence.counted
      const where = `${scenario} / ${insight.kind}`

      if (insight.kind === 'state-association') {
        // Two groups, both named. What it must never say is one number.
        expect(counted, `${where}: no count on a comparison`).toBeDefined()
        expect(counted, where).toMatch(/occasions with /)
        expect(counted, where).toMatch(/ without/)
        // Never the belief cards' units: nothing here was compared to tonight.
        expect(counted, where).not.toMatch(/comparable/)
        continue
      }

      const compares =
        insight.kind !== 'trajectory' &&
        insight.kind !== 'life-season' &&
        insight.kind !== 'coverage-gap'
      expect(
        counted !== undefined,
        `${where}: ${compares ? 'no count' : 'a count of nothing comparable'}`,
      ).toBe(compares)
      if (counted === undefined) continue
      expect(counted, where).toMatch(/comparable occasions?/)
    }
  })

  it('carries a confidence word only where it states a belief', () => {
    for (const { scenario, insight } of cards) {
      const reading =
        insight.kind === 'coverage-gap' ||
        insight.kind === 'trajectory' ||
        insight.kind === 'life-season' ||
        // D-089: an observed relationship reports what the record contains. A
        // confidence word would attach to the relationship, which is the one
        // claim that card is arranged not to make.
        insight.kind === 'state-association'
      expect(
        insight.confidence === undefined,
        `${scenario} / ${insight.kind}: confidence word on a ${reading ? 'reading' : 'belief'}`,
      ).toBe(reading)
    }
  })

  it('offers a way to disagree with every belief it states', () => {
    // Section 62: a learned pattern must be correctable, and a belief the owner
    // cannot see is a belief he cannot correct. Every card that concludes
    // something carries the belief key Now's own correction already writes.
    for (const { scenario, insight } of cards) {
      if (insight.confidence === undefined) continue
      expect(insight.belief, `${scenario} / ${insight.id}`).toMatch(/^effect:/)
    }
  })

  it('says the same thing about a move only once', () => {
    /*
     * DEF-0033's class. Two cards about the same move, both true, both from the
     * same episodes, put a contradiction on one screen that the reader has no
     * way to reconcile — "usually makes a difference" directly above "has
     * stopped doing what it used to".
     */
    for (const scenario of SCENARIOS) {
      const situation = loadScenario(scenario.id).decision().situation
      const found = insightsFor(situation).insights
      const perMove = new Map<string, string[]>()
      for (const insight of found) {
        if (insight.belief === undefined) continue
        if (insight.kind === 'stale-assumption') continue
        const held = perMove.get(insight.belief) ?? []
        held.push(insight.kind)
        perMove.set(insight.belief, held)
      }
      for (const [belief, kinds] of perMove) {
        expect(kinds, `${scenario.id}: two cards about ${belief}`).toHaveLength(1)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// The gate's own claims
// ---------------------------------------------------------------------------

describe('what the app has read, rather than what it was told', () => {
  const situation = loadScenario('observed-evenings').decision().situation
  const found = insightsFor(situation).insights

  it('reports a trend over a dimension the owner reports about himself', () => {
    /*
     * The trajectory card gated on `standing`, and `standing` is false for
     * every such dimension by design (D-061) — so energy, soreness, mood,
     * social energy and sleep quality were collected, spent on deciding which
     * evenings resembled tonight, and never once reported. QA-A1's smaller
     * half, and nothing asserted it either way until this.
     */
    const trends = found.filter((insight) => insight.kind === 'trajectory')
    expect(trends.length, 'no state dimension produced a trend').toBeGreaterThan(0)
    expect(
      trends.some((insight) => /current energy/i.test(insight.headline)),
      'energy is still locked out of being read over time',
    ).toBe(true)
  })

  it('prints a reading in the terms the owner gave it in', () => {
    /*
     * Found by reading the card. A scale is compared as a ratio so 4-of-5 and
     * 8-of-10 are the same reading — right for the arithmetic, and it reached
     * the screen as **"Current energy: steady around 0.5"**. He answered
     * "Enough"; the app showed him a number he has never seen.
     */
    const trends = found.filter((insight) => insight.kind === 'trajectory')
    for (const insight of trends) {
      const lines = [insight.headline, insight.evidence.trend ?? '']
      for (const line of lines) {
        if (line === '') continue
        expect(/\b0\.\d+\b/.test(line), `"${line}" prints a ratio where a reading belongs`).toBe(
          false,
        )
      }
      if (/energy|soreness/i.test(insight.headline)) {
        expect(insight.headline, insight.headline).toMatch(/\d of \d/)
      }
    }
  })

  it('makes one statement per move, counting the observed one', () => {
    /*
     * D-086 extended to the card D-089 added. "You usually say getting out for
     * a walk makes a difference" directly under "Current energy has more often
     * been higher after a walk than without one" is two statements about one
     * move — one a summary of his opinions, one a finding — with nothing saying
     * which is which. Grouping by belief key could not see it, because the
     * observed card deliberately carries no belief.
     */
    for (const scenario of SCENARIOS) {
      const each = insightsFor(loadScenario(scenario.id).decision().situation).insights
      const perVerb = new Map<string, string[]>()
      for (const insight of each) {
        const verb = /^(?:pattern|context|change|against|association):([a-z-]+)/.exec(insight.id)
        if (verb === null) continue
        const held = perVerb.get(verb[1] ?? '') ?? []
        held.push(insight.kind)
        perVerb.set(verb[1] ?? '', held)
      }
      for (const [verb, kinds] of perVerb) {
        const both =
          kinds.includes('state-association') &&
          kinds.some((kind) => kind !== 'state-association' && kind !== 'repeated-friction')
        expect(both, `${scenario.id}: two statements about ${verb} — ${kinds.join(', ')}`).toBe(
          false,
        )
      }
    }
  })
})

describe('a long history, where context changes what a pattern means', () => {
  const situation = loadScenario('long-run').decision().situation
  const found = insightsFor(situation).insights

  it('says which kind of evening the move actually works on', () => {
    const context = found.find((insight) => insight.kind === 'context-effect')
    expect(context, 'no context-specific insight on the long history').toBeDefined()
    expect(context?.headline).toContain('Clearing the kitchen')
    expect(context?.headline).toMatch(/weekday/)
    expect(context?.headline).toMatch(/weekend/)
  })

  it('keeps both sides above the threshold a figure needs on its own', () => {
    const context = found.find((insight) => insight.kind === 'context-effect')
    const stronger = context?.evidence.strongerIn ?? ''
    const weaker = context?.evidence.weakerIn ?? ''
    // "6 of 6" and "2 of 6" — both denominators printed, both defensible.
    for (const line of [stronger, weaker]) {
      const counts = /(\d+) of (\d+)/.exec(line)
      expect(counts, `no counts in "${line}"`).not.toBeNull()
      expect(Number(counts?.[2])).toBeGreaterThanOrEqual(MIN_FOR_A_RATE)
    }
  })

  it('does not let the flat average across contexts stand as the story', () => {
    /*
     * Eight of twelve is true and describes an evening that never happened: six
     * weekday evenings that all helped and six weekend ones that mostly did
     * not. The card that leads has to be the one that separates them.
     */
    const kitchen = found.filter((insight) => insight.belief === 'effect:reset-space')
    expect(kitchen).toHaveLength(1)
    expect(kitchen[0]?.kind).toBe('context-effect')
  })
})

describe('later evidence reversing an earlier pattern', () => {
  const situation = loadScenario('long-run').decision().situation
  const found = insightsFor(situation).insights

  it('reports the walk as having changed rather than as steady', () => {
    const walk = found.filter((insight) => insight.belief === 'effect:move')
    expect(walk).toHaveLength(1)
    expect(walk[0]?.kind).toBe('emerging-change')
    expect(walk[0]?.headline).toMatch(/has not been going as well/)
  })

  it('shows both halves of the same question rather than one number', () => {
    const walk = found.find((insight) => insight.belief === 'effect:move')
    expect(walk?.evidence.trend).toMatch(/earlier/)
    expect(walk?.evidence.trend).toMatch(/since/)
    expect(walk?.evidence.trend).toMatch(/[Ss]ame question/)
  })

  it('keeps the counterexamples visible rather than averaging them away', () => {
    const walk = found.find((insight) => insight.belief === 'effect:move')
    expect(walk?.evidence.counterexamples.length).toBe(3)
    expect(walk?.evidence.counterexamples.some((line) => /backfired/.test(line.text))).toBe(true)
  })
})

describe('an inability is evidence about the evening, never about the move', () => {
  const situation = loadScenario('long-run').decision().situation
  const found = insightsFor(situation).insights

  it('reports four blocked labs as follow-through and not as a verdict', () => {
    const lab = found.find((insight) => insight.belief === 'effect:hands-on-lab')
    expect(lab?.kind).toBe('repeated-friction')
    expect(lab?.headline).toMatch(/keeps not happening/)
    // Section 20's second rule, held on the surface as well as in the kernel:
    // nothing here may read as "labs do not work".
    expect(lab?.headline).not.toMatch(/difference|all the way|worked/i)
    const followThrough = lab?.evidence.rates.find((rate) => rate.aspect === 'follow-through')
    expect(followThrough?.hit).toBe(2)
    expect(followThrough?.of).toBe(6)
  })

  it('withholds the result figure it does not have enough of', () => {
    const lab = found.find((insight) => insight.belief === 'effect:hands-on-lab')
    const result = lab?.evidence.rates.find((rate) => rate.aspect === 'direct-result')
    expect(result?.percent).toBeUndefined()
    expect(result?.withheld).toMatch(/only 2 so far/)
  })
})

describe('a result and a comfort that disagree stay apart', () => {
  const situation = loadScenario('long-run').decision().situation
  const found = insightsFor(situation).insights

  it('reports both, each over its own denominator', () => {
    const reachOut = found.find((insight) => insight.belief === 'effect:reach-out')
    const result = reachOut?.evidence.rates.find((rate) => rate.aspect === 'direct-result')
    const comfort = reachOut?.evidence.rates.find((rate) => rate.aspect === 'comfort')
    expect(result?.hit).toBe(2)
    expect(comfort?.hit).toBe(1)
    expect(result?.measures).not.toBe(comfort?.measures)
    // The two figures answer different questions about the same five episodes,
    // and nothing anywhere adds them together.
    expect(result?.of).toBe(comfort?.of)
    expect(result?.percent).not.toBe(comfort?.percent)
  })
})

describe('weak evidence produces an honest answer rather than a figure', () => {
  it('says what it is watching and what it would take', () => {
    const situation = loadScenario('what-worked').decision().situation
    const report = insightsFor(situation)

    const walk = report.gathering.find((line) => /walk/.test(line.subject))
    expect(walk, 'two walks produced neither a card nor a line').toBeDefined()
    expect(walk?.occasions).toBe(2)
    expect(walk?.needs).toMatch(/2 more occasions/)

    // And no card was manufactured from those two.
    expect(report.insights.some((insight) => insight.belief === 'effect:move')).toBe(false)
  })

  it('says nothing at all about a move with one occasion and no result', () => {
    const situation = loadScenario('subnetting-struggle').decision().situation
    const report = insightsFor(situation)
    expect(report.insights.filter((insight) => insight.belief !== undefined)).toEqual([])
    expect(report.gathering.some((line) => /nothing has come back/.test(line.needs))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// A counterexample, added to a real history
// ---------------------------------------------------------------------------

/**
 * The same month, with one evening that went the other way.
 *
 * The gate asks that an insight "demonstrably changes when a counterexample is
 * added", and the honest way to show it is to add one to a history the library
 * already ships rather than to build a pair of fixtures that differ in whatever
 * way makes the point. `what-worked` has four evenings clearing the kitchen and
 * all four helped; this is the fifth.
 */
function kitchenPlusOne(harm: boolean) {
  const kit = createKit('CX', 'America/Denver', '2026-02-01T12:00:00Z')
  const nextId = sequentialRecordIds('CXX')
  const kitchen = entityRef('place', 'the kitchen')
  const now = kit.local('2026-02-20', '19:30')
  const anEvening: DecisionContext = {
    block: 'evening',
    weekend: false,
    strain: 'none',
    usableMinutes: 60,
  }

  const seeds: PastEpisode[] = [2, 6, 10, 14].map((day) => ({
    verb: 'reset-space' as const,
    object: kitchen,
    domain: DOMAIN.home,
    on: `2026-02-${String(day).padStart(2, '0')}`,
    context: anEvening,
    ending: 'completed' as const,
    effect: 'real' as const,
  }))

  if (harm) {
    seeds.push({
      verb: 'reset-space',
      object: kitchen,
      domain: DOMAIN.home,
      on: '2026-02-17',
      context: anEvening,
      ending: 'completed',
      effect: 'harm',
    })
  }

  const place = kit.entity({
    kind: 'place',
    label: 'the kitchen',
    domain: DOMAIN.home,
    privacy: 'normal',
  })

  const document = kit.document({
    entities: [place],
    records: [...pastEpisodeRecords(kit, seeds, nextId)],
    exportedAt: now,
  })

  const loaded = snapshotFromWire(document)
  expect(loaded.loaded).toBe(true)
  const situation = assembleSituation(buildView(loaded.snapshot, { now, zone: kit.zone }), {
    now,
    zone: kit.zone,
    weekStartsOn: 1,
  })
  const found = insightsFor(situation).insights
  return found.find((insight) => insight.belief === 'effect:reset-space')
}

describe('one counterexample, and what it changes', () => {
  const before = kitchenPlusOne(false)
  const after = kitchenPlusOne(true)

  it('starts as a pattern that has held every time', () => {
    expect(before?.kind).toBe('stable-strength')
    expect(before?.headline).toMatch(/made a difference every time/)
    expect(before?.evidence.counterexamples).toEqual([])
    const effect = before?.evidence.rates.find((rate) => rate.aspect === 'downstream-effect')
    expect(effect?.hit).toBe(4)
    expect(effect?.of).toBe(4)
    expect(effect?.percent).toBe(100)
  })

  it('changes the card, the figure and the confidence when one evening goes the other way', () => {
    expect(after).toBeDefined()
    expect(after?.kind).not.toBe(before?.kind)
    expect(after?.headline).not.toBe(before?.headline)

    const effect = after?.evidence.rates.find((rate) => rate.aspect === 'downstream-effect')
    expect(effect?.hit).toBe(4)
    expect(effect?.of).toBe(5)
    expect(effect?.percent).toBe(80)

    expect(after?.evidence.counterexamples).toHaveLength(1)
    expect(after?.evidence.counterexamples[0]?.text).toMatch(/backfired/)
    expect(after?.confidence?.because).toMatch(/went the other way/)
  })

  it('weakens the belief rather than discarding it', () => {
    // Section 51's pattern-quality rules: one counterexample is not disproof,
    // in the same way one success was never proof. The pattern is still there
    // and the exception is on the card with it.
    expect(after?.headline).toMatch(/Clearing the kitchen/)
    expect(after?.detail).toMatch(/4 of 5/)
  })
})
