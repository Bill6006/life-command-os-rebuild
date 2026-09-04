import { describe, expect, it } from 'vitest'
import {
  blockOf,
  civilDateFromDayId,
  DAY_BLOCKS,
  instantAtLocal,
  localDateTimeAt,
  type DayBlock,
  type Instant,
  type TimeZoneId,
} from '../../src/domain/time'
import { decide, sweepDayBlocks, type Decision } from '../../src/intelligence/engine'
import { nextGuideStep } from '../../src/intelligence/guide'
import { evidenceForDecision, insightsFor } from '../../src/intelligence/insights'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import type { Scenario } from '../../src/synthetic/kit'
import { SCENARIOS } from '../../src/synthetic/scenarios'

/**
 * The instrument, and the class it exists to catch — AUD-0001, AUD-0002,
 * AUD-0008, AUD-0036.
 *
 * The whole-app audit reproduced this on the deployed build at 08:40 on a
 * Tuesday morning: the line describing the situation read *"Tuesday morning"*
 * and the limiter directly beneath it read *"Only about 10 minutes left
 * tonight."* Two components of one decision disagreed about what time it was,
 * in one glance, on the most-read screen in the product.
 *
 * It survived 57 test files and 1,199 assertions for a reason worth writing
 * down: **thirteen of the eighteen scenarios were set in the evening, none in
 * the early morning, and the one morning fixture was the near-empty history
 * that produces no move at all.** Nothing in the library ever asked the engine
 * to decide before noon. The instrument agreed with the code about what time it
 * was, so neither of them was ever wrong in front of a test.
 *
 * Three things are asserted here, and they are deliberately different shapes.
 *
 * 1. **The library can see the whole day.** Every block is some fixture's own
 *    clock, and every block is one the library can produce a decision in.
 * 2. **Nothing asserts the evening outside the evening.** Swept over every
 *    scenario at every block, over every owner-visible string a decision can
 *    put on a screen — the recommendation, the reason, the premise, the
 *    limiter, the no-action states, the guide's question *and its answer
 *    labels*, the growth suggestion, the whole evidence panel and every
 *    Insights card.
 * 3. **The sweep control itself works**, because a control that silently
 *    decided the same moment five times would look exactly like a passing one.
 *
 * Written as a rule about what the copy may not claim, never as a list of
 * strings: an exact-string assertion proves a string is stable rather than
 * right, and it fails for improvements.
 */

/**
 * Six moments, not five: `late-night` covers midnight to four **and** ten to
 * midnight, and those are different lives. A sweep that only ever visited the
 * late end would leave the small hours untested while reporting full coverage.
 */
const EVERY_BLOCK: readonly { readonly block: DayBlock; readonly time: string }[] = [
  { block: 'late-night', time: '02:30' },
  { block: 'early-morning', time: '05:30' },
  { block: 'morning', time: '09:30' },
  { block: 'afternoon', time: '15:00' },
  { block: 'evening', time: '20:00' },
  { block: 'late-night', time: '23:00' },
]

/** The blocks in which naming the evening is a true statement. */
const EVENING_BLOCKS: readonly DayBlock[] = ['evening', 'late-night']

/**
 * What the copy may not claim, as patterns rather than as sentences.
 *
 * `evenings` in the plural is deliberately absent: "occasions like this one"
 * replaced the singular claims, and a sentence about *past* evenings as a class
 * ("on evenings at the weekend") is a description of the record rather than an
 * assertion about now. What is banned is the app telling the owner that the
 * moment he is in is the evening when it is not.
 */
const CLAIMS_THE_EVENING: readonly RegExp[] = [
  /\btonight\b/i,
  /\bthis evening\b/i,
  /\bthe evening\b/i,
  /\bevery evening\b/i,
]

function movedTo(day: Instant, time: string, zone: TimeZoneId): Instant {
  const [hour, minute] = time.split(':')
  const local = localDateTimeAt(day, zone)
  return instantAtLocal(
    {
      ...civilDateFromDayId(local.dayId),
      hour: Number(hour ?? 0),
      minute: Number(minute ?? 0),
      second: 0,
    },
    zone,
  )
}

function momentOf(scenario: Scenario, at: Instant) {
  return { now: at, zone: scenario.zone, weekStartsOn: scenario.weekStartsOn ?? 1 }
}

function decideAt(scenario: Scenario, at: Instant): Decision {
  const loaded = snapshotFromWire(scenario.build())
  const moment = momentOf(scenario, at)
  return decide(buildView(loaded.snapshot, moment), moment)
}

/**
 * Every string this decision can put in front of the owner.
 *
 * Assembled from the objects the surfaces actually render rather than from a
 * list of files, so a new sentence on any of those surfaces is swept the day it
 * is written. The QA laboratory is out of scope on purpose: its job is the
 * machinery, and section 10 of the audit says so.
 */
function ownerVisibleStrings(decision: Decision): readonly string[] {
  const out: (string | undefined)[] = []
  const situation = decision.situation
  const explanation = decision.explanation

  if (explanation !== undefined) {
    out.push(
      explanation.premise,
      explanation.rendered.sentence,
      explanation.rendered.reason,
      explanation.rendered.followUp,
      explanation.rendered.verbLabel,
      explanation.limiter?.label,
      explanation.limiter?.summary,
      explanation.instead,
      explanation.insteadBecause,
      explanation.restsOn,
    )
  }

  out.push(decision.noAction?.headline, decision.noAction?.detail)
  out.push(situation.limiter?.label, situation.limiter?.summary)

  for (const suggestion of decision.growth) {
    out.push(suggestion.headline, suggestion.statement)
  }

  const evidence = evidenceForDecision(decision)
  if (evidence !== undefined) {
    out.push(evidence.move, evidence.comparable, evidence.concluded, evidence.observed)
    out.push(evidence.context, evidence.mix, evidence.confidence.word, evidence.confidence.because)
    out.push(...evidence.deferral)
    for (const condition of evidence.conditions) out.push(condition.label, condition.reading)
    for (const rate of evidence.rates) out.push(rate.measures, rate.withheld)
    for (const line of evidence.counterexamples) out.push(line.text)
    out.push(...evidence.reasoning)
  }

  const report = insightsFor(situation)
  for (const insight of report.insights) {
    out.push(insight.eyebrow, insight.headline, insight.detail)
    out.push(insight.confidence?.word, insight.confidence?.because)
  }
  for (const line of report.gathering) out.push(line.subject, line.needs)

  return out.filter((text): text is string => typeof text === 'string' && text.length > 0)
}

// ---------------------------------------------------------------------------
// 1. The library can see the whole day — AUD-0008
// ---------------------------------------------------------------------------

describe('the scenario library covers the whole day', () => {
  const nativeBlocks = new Set(SCENARIOS.map((scenario) => blockOf(scenario.now, scenario.zone)))

  it('sets at least one history in every block', () => {
    // The gap that made every finding in section A invisible: no fixture at all
    // sat in the early morning, so no test ever asked what the app says there.
    const missing = DAY_BLOCKS.filter((block) => !nativeBlocks.has(block))
    expect(missing, 'a block no fixture sits in is a block nothing is asked about').toEqual([])
  })

  it('can decide in every block', () => {
    const undecidable = DAY_BLOCKS.filter(
      (block) =>
        !SCENARIOS.some((scenario) => {
          const time = EVERY_BLOCK.find((entry) => entry.block === block)?.time ?? '20:00'
          return decideAt(scenario, movedTo(scenario.now, time, scenario.zone)).kind === 'move'
        }),
    )
    expect(undecidable, 'a block with no history that decides proves nothing').toEqual([])
  })

  it('decides at its own clock in the morning and the early morning', () => {
    /*
     * The finding itself, narrowed to what it actually said. The one morning
     * fixture in the library was "One answer, and a lot of silence" — the
     * near-empty history — so an auditor looking at a morning saw the app
     * declining to speak, and had to already know to go looking at ten o'clock
     * with a richer life loaded. That is why the reason to move the clock was
     * not visible anywhere.
     */
    for (const block of ['early-morning', 'morning'] as const) {
      const decides = SCENARIOS.filter(
        (scenario) =>
          blockOf(scenario.now, scenario.zone) === block &&
          decideAt(scenario, scenario.now).kind === 'move',
      )
      expect(
        decides.map((scenario) => scenario.id),
        `${block} has no decidable fixture`,
      ).not.toEqual([])
    }
  })

  it('holds a growth history that does not go one way', () => {
    /*
     * AUD-0048's blind spot. No scenario contained a failed or partial growth
     * occasion, so nothing ever asked what the app says about a child whose
     * record alternates — and what it said was "3 times running".
     */
    const mixed = SCENARIOS.filter((scenario) => {
      const decision = decideAt(scenario, scenario.now)
      return decision.situation.learning.episodes.some(
        (episode) =>
          episode.semantics.target.verb === 'growth-opportunity' &&
          episode.outcomes.some(
            (outcome) =>
              outcome.aspect === 'result' &&
              outcome.observation.type === 'scale' &&
              outcome.observation.value < outcome.observation.of,
          ),
      )
    })
    expect(mixed.map((scenario) => scenario.id)).not.toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 2. Nothing asserts the evening outside the evening — AUD-0001, 0002, 0036
// ---------------------------------------------------------------------------

describe('the app never asserts the evening outside the evening', () => {
  it('holds across every scenario, at every block', () => {
    const offenders: string[] = []

    for (const scenario of SCENARIOS) {
      for (const { time } of EVERY_BLOCK) {
        const at = movedTo(scenario.now, time, scenario.zone)
        const decision = decideAt(scenario, at)
        if (EVENING_BLOCKS.includes(decision.situation.block)) continue

        for (const text of ownerVisibleStrings(decision)) {
          for (const claim of CLAIMS_THE_EVENING) {
            if (claim.test(text)) {
              offenders.push(`${scenario.id} at ${time} (${decision.situation.block}): “${text}”`)
            }
          }
        }
      }
    }

    expect(offenders, 'a sentence that is specific about the wrong time of day').toEqual([])
  })

  it('reaches the guide’s question and its answer labels', () => {
    /*
     * The interaction, not only the prose. At 07:30 the app asked how much time
     * there was and offered **"The evening is clear"** as an answer about a
     * morning — a label the owner reads and presses, which no sweep over
     * explanation text would ever have seen.
     */
    const offenders: string[] = []

    for (const scenario of SCENARIOS) {
      const loaded = snapshotFromWire(scenario.build())
      for (const { time } of EVERY_BLOCK) {
        const at = movedTo(scenario.now, time, scenario.zone)
        const moment = momentOf(scenario, at)
        const step = nextGuideStep(buildView(loaded.snapshot, moment), moment)
        if (EVENING_BLOCKS.includes(step.decision.situation.block)) continue
        if (step.question === undefined) continue

        const spoken = [
          step.question.prompt,
          ...step.question.options.map((option) => option.label),
        ]
        for (const text of spoken) {
          for (const claim of CLAIMS_THE_EVENING) {
            if (claim.test(text)) offenders.push(`${scenario.id} at ${time}: “${text}”`)
          }
        }
      }
    }

    expect(offenders, 'an answer about the evening, offered about a morning').toEqual([])
    /*
     * The guide re-runs the whole pipeline under every possible answer, so this
     * is 126 full probes. It is worth the seconds: the question labels are the
     * half of the class no sweep over explanation text would ever have seen.
     *
     * **The `30_000` that used to sit on this line is gone — DEF-0169.** It was
     * written when the default was five seconds and meant *give this one six
     * times longer*. The default is now 120 seconds, so the same number had
     * quietly become *give this one four times less*, and this test was the one
     * failing a suite that had been raised specifically to stop it failing. A
     * per-test override that is smaller than the default is not an override, it
     * is a cap nobody wrote on purpose.
     */
  })

  it('still says the evening when it is the evening', () => {
    /*
     * The other half, and the reason this is not a find-and-replace. Section 4.6
     * asks for the specific ordinary sentence over the elegant generic one, so a
     * sweep that removed the word everywhere would pass the test above and make
     * the product worse. At eight in the evening the app still says so.
     */
    const said = new Set<string>()
    for (const scenario of SCENARIOS) {
      const at = movedTo(scenario.now, '20:00', scenario.zone)
      const decision = decideAt(scenario, at)
      for (const text of ownerVisibleStrings(decision)) {
        if (/\btonight\b/i.test(text) || /\bthis evening\b/i.test(text)) said.add(text)
      }
    }
    expect([...said], 'the evening lost its own word').not.toEqual([])
  })

  it('is looking at real hours', () => {
    // A sweep that never reaches a block proves nothing about that block.
    const scenario = SCENARIOS[0]
    if (scenario === undefined) throw new Error('no scenarios')
    const reached = new Set(
      EVERY_BLOCK.map(({ time }) =>
        blockOf(movedTo(scenario.now, time, scenario.zone), scenario.zone),
      ),
    )
    expect([...reached].sort()).toEqual([
      'afternoon',
      'early-morning',
      'evening',
      'late-night',
      'morning',
    ])
  })
})

// ---------------------------------------------------------------------------
// 3. The sweep control — AUD-0008
// ---------------------------------------------------------------------------

describe('the block sweep re-runs one history at five different moments', () => {
  const scenario = SCENARIOS.find((entry) => entry.id === 'morning-after-bad-nights')
  if (scenario === undefined) throw new Error('the morning fixture is missing')

  const loaded = snapshotFromWire(scenario.build())
  const moment = momentOf(scenario, scenario.now)
  const swept = sweepDayBlocks(buildView(loaded.snapshot, moment), moment)

  it('covers every block exactly once', () => {
    expect(swept.map((row) => row.block)).toEqual([...DAY_BLOCKS])
  })

  it('decides each row in the block it claims', () => {
    // A control that quietly decided the same moment five times would render
    // five identical rows and look exactly like a working one.
    for (const row of swept) {
      expect(blockOf(row.at, scenario.zone), row.block).toBe(row.block)
      expect(row.decision.situation.block, row.block).toBe(row.block)
    }
  })

  it('stays on one owner-local day', () => {
    const days = new Set(swept.map((row) => localDateTimeAt(row.at, scenario.zone).dayId))
    expect([...days]).toEqual([localDateTimeAt(scenario.now, scenario.zone).dayId])
  })

  it('does not all say the same thing', () => {
    // The point of the control is that the answers differ by the hour. If they
    // never do, the app is not reading the hour and the sweep would say so.
    const answers = new Set(
      swept.map(
        (row) =>
          row.decision.explanation?.rendered.sentence ?? row.decision.noAction?.headline ?? '',
      ),
    )
    expect(answers.size).toBeGreaterThan(1)
  })
})
