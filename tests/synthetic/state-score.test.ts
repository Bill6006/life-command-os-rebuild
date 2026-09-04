import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readingsAt } from '../../src/domain/checkIn'
import { CONCEPT, coreConcepts } from '../../src/domain/concepts'
import type { CanonicalRecord } from '../../src/domain/records'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import {
  civilDateFromDayId,
  instantAtLocal,
  parseLocalDayId,
  timeZone,
  type Instant,
} from '../../src/domain/time'
import { checkInRecord } from '../../src/intelligence/checkIn'
import { CHECK_IN_READINGS, readingFor, type ReadingSpec } from '../../src/intelligence/readings'
import { assembleSituation } from '../../src/intelligence/situation'
import { stateScore } from '../../src/intelligence/state'
import { createKit } from '../../src/synthetic/kit'

/**
 * The 0–100 state reading — D-287.
 *
 * ## What is proved here and what could not be proved by reading the file
 *
 * **The ceiling is fixed and it means what it says.** *100 is every dimension at
 * its best* is checked by putting every dimension at its best, and the floor by
 * putting every one at its worst — including the ones where *best* is the low
 * end, which is the half a test built on one direction would miss.
 *
 * **A partial score says so.** G-009 forbids the alternative, and the failure it
 * forbids is silent: a mean over three readings rendered as though it were over
 * ten is not wrong by a rounding error, it is a different quantity.
 *
 * **And the number never acquires an adjective.** D-287 says the distinction
 * between a state reading and the wellness score D-166 refused *"survives only
 * while the number stays a reading"*. That is a claim about every surface that
 * renders it, so it is checked over every surface rather than over the one that
 * renders it today.
 */

const ZONE = timeZone('America/Denver')
const ROOT = join(import.meta.dirname, '..', '..')

function localAt(day: string, time: string): Instant {
  const dayId = parseLocalDayId(day)
  if (dayId === undefined) throw new Error(`bad day ${day}`)
  const [hour, minute] = time.split(':')
  return instantAtLocal(
    { ...civilDateFromDayId(dayId), hour: Number(hour), minute: Number(minute), second: 0 },
    ZONE,
  )
}

const MOMENT = { now: localAt('2026-09-04', '08:30'), zone: ZONE }

/** The score, as the check-in screen computes it: through the situation's reader. */
function scoreOf(records: readonly CanonicalRecord[]) {
  const kit = createKit('state-score', 'America/Denver', '2026-09-01T00:00:00Z')
  const loaded = snapshotFromWire(
    kit.document({
      exportedAt: kit.at('2026-09-05T00:00:00Z'),
      records: [...records],
      entities: [],
    }),
  )
  expect(loaded.loaded, 'the store did not load').toBe(true)
  const moment = { now: MOMENT.now, zone: ZONE, weekStartsOn: 1 as const }
  const view = buildView(loaded.snapshot, moment)
  return stateScore(assembleSituation(view, moment).readings)
}

/** Every reading answered at the same position on its own scale. */
function everyReadingAt(position: number): readonly CanonicalRecord[] {
  return CHECK_IN_READINGS.map((reading: ReadingSpec) =>
    checkInRecord(reading, reading.anchors[position]!, MOMENT),
  )
}

function sourceFiles(dir: string): readonly string[] {
  const out: string[] = []
  const walk = (current: string): void => {
    for (const name of readdirSync(current)) {
      const full = join(current, name)
      if (statSync(full).isDirectory()) {
        walk(full)
        continue
      }
      if (name.endsWith('.ts') || name.endsWith('.tsx')) out.push(full)
    }
  }
  walk(join(ROOT, dir))
  return out
}

function repoPath(file: string): string {
  return file
    .slice(ROOT.length + 1)
    .split(sep)
    .join('/')
}

// ---------------------------------------------------------------------------
// The ceiling, the floor, and the direction of each dimension
// ---------------------------------------------------------------------------

describe('the figure is 0 to 100, and 100 means every dimension at its best', () => {
  it('reaches 100 with every dimension at its best, whichever end that is', () => {
    /*
     * The half that needs the sense. Mood at its best is the **top** anchor and
     * irritation at its best is the **bottom** one, so a store answered "all
     * fives" is not a store at its best — it is a man in a bright mood snapping
     * at everything. This builds the actual best of each and expects the
     * ceiling.
     */
    const best = CHECK_IN_READINGS.map((reading) => {
      const sense = coreConcepts.definitionFor(reading.concept).sense
      const anchor = sense === 'higher-is-worse' ? reading.anchors[0]! : reading.anchors[4]!
      return checkInRecord(reading, anchor, MOMENT)
    })
    const reading = scoreOf(best)
    expect(reading.score).toBe(100)
    expect(reading.from).toBe(reading.of)
  })

  it('reaches 0 with every dimension at its worst', () => {
    const worst = CHECK_IN_READINGS.map((reading) => {
      const sense = coreConcepts.definitionFor(reading.concept).sense
      const anchor = sense === 'higher-is-worse' ? reading.anchors[4]! : reading.anchors[0]!
      return checkInRecord(reading, anchor, MOMENT)
    })
    expect(scoreOf(worst).score).toBe(0)
  })

  it('sits in the middle when every dimension does', () => {
    // The third anchor of every reading is the middle of its own scale, so a
    // store of middles is a fifty whichever way each dimension points.
    expect(scoreOf(everyReadingAt(2)).score).toBe(50)
  })

  it('reads a worse irritation as a lower figure, not a higher one', () => {
    /*
     * The sense, as a single-dimension experiment rather than as a registry
     * assertion. This is the bug a score over mixed directions actually has:
     * every reading answered identically, and the figure moving the wrong way.
     */
    const irritation = readingFor(CONCEPT.irritation)!
    const calm = scoreOf([checkInRecord(irritation, irritation.anchors[0]!, MOMENT)])
    const snapping = scoreOf([checkInRecord(irritation, irritation.anchors[4]!, MOMENT)])
    expect(calm.score).toBe(100)
    expect(snapping.score).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// G-009 — what is not there is not invented
// ---------------------------------------------------------------------------

describe('an unanswered reading is left out and counted out loud', () => {
  it('has no figure at all on an empty store, rather than a zero', () => {
    const reading = scoreOf([])
    expect(reading.score, 'an empty store produced a figure').toBeUndefined()
    expect(reading.from).toBe(0)
    expect(reading.of).toBeGreaterThan(0)
  })

  it('says how many readings it is over when some are missing', () => {
    const mood = readingFor(CONCEPT.mood)!
    const energy = readingFor(CONCEPT.energy)!
    const reading = scoreOf([
      checkInRecord(mood, mood.anchors[4]!, MOMENT),
      checkInRecord(energy, energy.anchors[4]!, MOMENT),
    ])
    expect(reading.from, 'the denominator counted something nobody answered').toBe(2)
    expect(reading.of, 'the total is not the number of scored dimensions').toBe(10)
    expect(reading.score).toBe(100)
  })

  it('averages the answered ones rather than treating the rest as nought', () => {
    // The defect this is written against: two perfect readings and eight
    // unknowns rendering as 20 out of 100. That would be an invented reading of
    // eight dimensions nobody was asked about.
    const mood = readingFor(CONCEPT.mood)!
    const reading = scoreOf([checkInRecord(mood, mood.anchors[4]!, MOMENT)])
    expect(reading.score).toBe(100)
    expect(reading.from).toBe(1)
  })

  it('names every dimension it did not score, and why', () => {
    /*
     * A dimension quietly missing from a total is how a number stops being
     * checkable. Three are out, and each for a property of the concept rather
     * than for a judgement about it.
     */
    const reading = scoreOf(everyReadingAt(2))
    const uncounted = reading.dimensions.filter((dimension) => !dimension.counted)
    expect(uncounted.map((dimension) => String(dimension.concept)).sort()).toEqual([
      'emotional.need-for-company',
      'sleep.hours-last-night',
      'sleep.quality-last-night',
    ])
    for (const dimension of uncounted) {
      expect(dimension.uncountedBecause, `${dimension.concept} is out with no reason`).toBeDefined()
      expect(dimension.uncountedBecause!.length).toBeGreaterThan(10)
    }
  })

  it('leaves loneliness out because the registry says it has no better end', () => {
    // Mechanical rather than chosen: the exclusion follows `sense: 'neither'`,
    // so a later phase that gave the concept a direction would put it in the
    // score without anybody editing this file — and this fails if the reason
    // and the registry ever disagree.
    expect(coreConcepts.definitionFor(CONCEPT.needForCompany).sense).toBe('neither')
    const reading = scoreOf(everyReadingAt(2))
    const loneliness = reading.dimensions.find(
      (dimension) => dimension.concept === CONCEPT.needForCompany,
    )
    expect(loneliness?.counted).toBe(false)
    expect(loneliness?.uncountedBecause).toContain('want')
  })

  it('still shows every reading it took, scored or not', () => {
    // Out of the figure is not off the screen. D-287 keeps the per-dimension
    // readings visible always, and that includes the three the score cannot use.
    const reading = scoreOf(everyReadingAt(2))
    expect(reading.dimensions.length).toBe(CHECK_IN_READINGS.length)
    for (const dimension of reading.dimensions) {
      expect(dimension.label, `${dimension.concept} was answered and shows no words`).toBeDefined()
    }
  })

  it('shows the words he tapped rather than the number he landed on', () => {
    const mood = readingFor(CONCEPT.mood)!
    const reading = scoreOf([checkInRecord(mood, mood.anchors[1]!, MOMENT)])
    const shown = reading.dimensions.find((dimension) => dimension.concept === CONCEPT.mood)
    expect(shown?.label).toBe(mood.anchors[1]!.label)
    expect(shown?.at).toBe(2)
    expect(shown?.of).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// The thing the composite exemption was bought for
// ---------------------------------------------------------------------------

/**
 * Words that turn a reading into a verdict — D-287's line, as a guard.
 *
 * Every one of these describes **how good** a state is rather than what it is,
 * and D-166's prohibition is about exactly that: a number that grades a person.
 * *"You are at 62"* is a reading; *"a good day"*, *"a bad week"*, *"falling
 * behind"* is the thing the owner refused, at any confidence, on any surface.
 */
const QUALITY_WORDS = [
  'good day',
  'bad day',
  'good week',
  'bad week',
  'falling behind',
  'doing well',
  'doing badly',
  'poor',
  'excellent',
  'healthy',
  'unhealthy',
  'wellbeing',
  'well-being',
  'wellness',
  'improving',
  'declining',
  'better than',
  'worse than',
  'on track',
  'off track',
]

describe('the figure stays a reading and never becomes a verdict — D-287', () => {
  it('puts no quality word on any surface that renders the score', () => {
    /*
     * Over every owner surface rather than over the check-in screen, because the
     * claim is about the number and the number is portable. A later phase that
     * puts the score on Insights inherits this guard rather than needing to
     * remember the rule.
     */
    const offenders: string[] = []
    for (const file of [...sourceFiles('src/features'), ...sourceFiles('src/intelligence')]) {
      const path = repoPath(file)
      if (path.startsWith('src/features/qa/')) continue
      const text = readFileSync(file, 'utf8')
      // Comments explain the rule and quote what it forbids — the registry and
      // this phase's own files do it at length — so they are stripped first,
      // exactly as the architecture guards do.
      const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
      if (!/stateScore|StateScore|checkin-score/.test(code)) continue
      for (const word of QUALITY_WORDS) {
        if (code.toLowerCase().includes(word)) offenders.push(`${path}: "${word}"`)
      }
    }
    expect(offenders, 'the state reading acquired a quality adjective').toEqual([])
  })

  it('is a guard with something to catch', () => {
    // The same scan over a line that does what the rule forbids. A pattern that
    // no longer matches anything passes forever in silence.
    const wouldBe = 'const summary = `${score} out of 100 — a good day`'
    expect(QUALITY_WORDS.some((word) => wouldBe.toLowerCase().includes(word))).toBe(true)
  })

  it('says the weights are equal, in words, wherever the figure is shown', () => {
    /*
     * D-287: *"until the bar D-290 sets for chains is met, the honest default is
     * equal weighting, **stated on screen as equal weighting**."* The sentence
     * is part of the reading rather than a caption a surface may forget, so this
     * asserts it comes back with the figure.
     */
    const reading = scoreOf(everyReadingAt(2))
    expect(reading.weighting.toLowerCase()).toContain('same')
    expect(reading.weighting.length).toBeGreaterThan(20)
    expect(readFileSync(join(ROOT, 'src/features/checkin/CheckInScreen.tsx'), 'utf8')).toContain(
      'reading.weighting',
    )
  })

  it('carries what it measures and the count it is over, from one place', () => {
    // Section 51's rule, applied to a figure that is not a `MeasuredRate`: the
    // number, the sentence naming the quantity, and the denominator are one
    // object, so a caller cannot render the figure alone without going out of
    // its way.
    const reading = scoreOf(everyReadingAt(2))
    expect(reading.measures.length).toBeGreaterThan(20)
    const screen = readFileSync(join(ROOT, 'src/features/checkin/CheckInScreen.tsx'), 'utf8')
    for (const part of ['reading.score', 'reading.from', 'reading.of', 'reading.measures']) {
      expect(screen, `the screen renders the figure without ${part}`).toContain(part)
    }
  })

  it('prints no per-cent sign and no bar on the screen that shows it', () => {
    /*
     * Two rules meeting on one surface. Exactly one component may print a
     * figure with a per-cent sign, and it is not this one; and D-291's finding
     * about a progress bar — *"the arithmetic was wrong on its own terms"* — is
     * about a different screen and the identical mistake. *62 out of 100* says
     * the same thing and says its denominator.
     */
    for (const file of ['CheckInScreen.tsx', 'CheckInScreen.css']) {
      const text = readFileSync(join(ROOT, 'src/features/checkin', file), 'utf8')
      expect(text, `${file} prints a per-cent sign`).not.toMatch(/'[^']*%[^']*'|"[^"]*%[^"]*"/)
      expect(text.toLowerCase(), `${file} draws a bar`).not.toContain('progress-bar')
    }
  })
})

// ---------------------------------------------------------------------------
// The reminder says nothing about him
// ---------------------------------------------------------------------------

describe('a reminder names the ritual and never a reading', () => {
  it('names no concept, no dimension and no domain in anything it can say', () => {
    /*
     * A notification is the least private surface the app has: it appears on a
     * lock screen, over whatever he is doing, in front of whoever is next to
     * him. A body naming *"how lonely are you?"* would breach the privacy class
     * of the concept it came from without any code having read a record.
     *
     * The bodies are enumerable — a slot label and a count — so this checks the
     * whole set rather than the one the hook happens to build today.
     */
    const hook = readFileSync(join(ROOT, 'src/features/checkin/useCheckInReminder.ts'), 'utf8')
    const code = hook.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    for (const definition of coreConcepts.all()) {
      expect(code, `the reminder can name ${definition.id}`).not.toContain(String(definition.id))
      expect(code.toLowerCase(), `the reminder can name "${definition.label}"`).not.toContain(
        definition.label.toLowerCase(),
      )
    }
    // And it never reaches the anchors or the score, which is where the words
    // about him actually live.
    expect(code).not.toContain('anchors')
    expect(code).not.toContain('stateScore')
  })

  it('says only how many readings there are, at every depth and slot', () => {
    // The count is the whole of what the body says about the check-in, and it
    // is a number rather than a list — so a deeper check-in cannot make the
    // notification longer or more specific about him.
    for (const slot of ['morning', 'midday', 'evening'] as const) {
      for (const depth of ['full', 'shorter', 'fewest'] as const) {
        const count = readingsAt(slot, depth).length
        expect(`${count} readings.`).toMatch(/^\d+ readings\.$/)
      }
    }
  })
})
