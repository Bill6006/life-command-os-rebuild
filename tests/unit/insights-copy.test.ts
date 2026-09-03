import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ACTION_VERBS } from '../../src/domain/recommendation'
import {
  everyPatternHeadline,
  MEASURED_ASPECTS,
  measuresSentenceFor,
  MIN_FOR_A_RATE,
  patternNameFor,
  type MeasuredAspect,
} from '../../src/intelligence/insights'
import { PATIENCE } from '../../src/intelligence/learning'
import { ORPHAN_PRONOUNS } from '../synthetic/harness'

/**
 * The Insights vocabulary, checked as a class rather than by example.
 *
 * Every copy table in `insights.ts` is keyed on something that can grow — an
 * action verb, an insight kind, a measured aspect — and the failure mode for
 * all three is the same: somebody adds an entry, one table is not updated, and
 * a card renders `undefined` on whichever history happens to contain it. These
 * sweeps fail the build instead of waiting for that history.
 *
 * They are sweeps rather than string assertions on purpose. DEF-0020's own
 * repair records why: the two tests that asserted the exact broken strings are
 * the reason nothing caught it, because an exact-string assertion proves a
 * string is stable and not that it is right.
 */

const SOURCE = readFileSync(
  join(import.meta.dirname, '..', '..', 'src', 'intelligence', 'insights.ts'),
  'utf8',
)

const SUBJECT = 'Clearing the kitchen'

function orphansIn(sentence: string): readonly string[] {
  const words = sentence.toLowerCase().match(/[a-z']+/g) ?? []
  return [...new Set(words.filter((word) => (ORPHAN_PRONOUNS as readonly string[]).includes(word)))]
}

describe('the four things a number may measure', () => {
  it('is exactly the four facts DEF-0020 separated', () => {
    expect([...MEASURED_ASPECTS].sort()).toEqual(
      ['comfort', 'direct-result', 'downstream-effect', 'follow-through'].sort(),
    )
  })

  it('names no aspect that would mean several of them at once', () => {
    /*
     * The defect this prevents is a fifth entry, not a wrong fourth one.
     * DEF-0020 was four facts collapsing into one carrier; section 51 forbids
     * the same collapse inside a percentage. An aspect called "success",
     * "overall" or "effectiveness" would be that carrier, and it would look
     * entirely reasonable in a diff.
     */
    for (const aspect of MEASURED_ASPECTS as readonly string[]) {
      for (const word of ['success', 'overall', 'effectiveness', 'score', 'total']) {
        expect(aspect.includes(word), `"${aspect}" reads as a merged statistic`).toBe(false)
      }
    }
  })

  it('takes more evidence to print a figure than to move a belief', () => {
    // The justification for the threshold, asserted rather than left in a
    // comment: `PATIENCE` is where observation starts outweighing the starting
    // belief, and a figure the app is willing to *show* should rest on more.
    expect(MIN_FOR_A_RATE).toBeGreaterThan(PATIENCE)
  })
})

describe('every table covers everything it is keyed on', () => {
  it('names a pattern for every action verb, with and without an object', () => {
    for (const verb of ACTION_VERBS) {
      const named = patternNameFor(verb, 'the kitchen')
      const unnamed = patternNameFor(verb, undefined)
      expect(named, `no pattern name for "${verb}"`).toBeTruthy()
      expect(unnamed, `no fallback pattern name for "${verb}"`).toBeTruthy()
      expect(named).not.toContain('undefined')
      expect(unnamed).not.toContain('undefined')
      // Section 4.6: a name that loses the subject when one exists is the
      // generic language the plan asks the app not to settle for.
      expect(orphansIn(unnamed), `"${unnamed}" reaches for a pronoun`).toEqual([])
    }
  })

  it('handles every measured aspect in all three places it has to be handled', () => {
    for (const aspect of MEASURED_ASPECTS) {
      const occurrences = SOURCE.split(`case '${aspect}':`).length - 1
      // `tallyFor` counts it, `measuresSentence` names it, `headlineFor` says it.
      expect(occurrences, `"${aspect}" is not handled in all three places`).toBeGreaterThanOrEqual(
        3,
      )
    }
  })

  it('leads with meaning rather than with registry order', () => {
    /*
     * Found by reading a card. With follow-through listed first, a pattern with
     * equal evidence on two aspects led with "could actually be done 4 times
     * out of 4" under a headline reading "has worked every time it has come up"
     * — a sentence about whether it worked, over a figure that says nothing
     * whatever about whether it worked. That is DEF-0020's collapse arriving
     * through the choice of which number to show, so the order is asserted.
     */
    const preference = /const RATE_PREFERENCE: readonly MeasuredAspect\[\] = \[([^\]]+)\]/.exec(
      SOURCE,
    )
    expect(preference).not.toBeNull()
    const listed = [...(preference?.[1] ?? '').matchAll(/'([^']+)'/g)].map(
      (match) => match[1] as MeasuredAspect,
    )
    expect([...listed].sort()).toEqual([...MEASURED_ASPECTS].sort())
    expect(listed[listed.length - 1]).toBe('follow-through')
  })
})

describe('the sentence a card leads with', () => {
  const headlines = everyPatternHeadline(SUBJECT)

  it('covers every aspect at every band', () => {
    expect(headlines.length).toBeGreaterThanOrEqual(MEASURED_ASPECTS.length * 4)
    for (const aspect of MEASURED_ASPECTS) {
      expect(headlines.some((entry) => entry.aspect === aspect)).toBe(true)
    }
  })

  it('always names the subject and never reaches for a pronoun', () => {
    /*
     * Containment rather than a prefix, since D-089. Three of the four aspects
     * are tallies of the owner's own judgment and now say so — "You usually say
     * clearing the kitchen makes a difference" — which moves the subject into
     * the middle of the sentence. The rule being protected was never that the
     * subject comes first; it is that the sentence names it and reaches for no
     * pronoun instead.
     */
    for (const { sentence } of headlines) {
      expect(
        sentence.toLowerCase().includes(SUBJECT.toLowerCase()),
        `"${sentence}" loses its subject`,
      ).toBe(true)
      const withoutSubject = sentence.toLowerCase().split(SUBJECT.toLowerCase()).join(' ')
      expect(orphansIn(withoutSubject), `"${sentence}"`).toEqual([])
    }
  })

  it('says whose judgment a figure is, on every aspect the owner grades', () => {
    /*
     * QA-A1, in the copy layer. "How often clearing the kitchen made a
     * difference afterwards — 67% — 8 of 12" asserts an observed fact about the
     * world over a count of the occasions the owner *said* so. Section 51's
     * percentage rule did not catch it: it requires a figure to name the
     * quantity it measures, not to name who inferred it.
     *
     * Follow-through is the one exception and it is deliberate — whether a move
     * could be done at all is read from what he did, not from anything he was
     * asked to assess — so it is asserted as an exception rather than skipped.
     */
    const GRADED: readonly MeasuredAspect[] = ['downstream-effect', 'direct-result', 'comfort']
    const owned = /\byou\b/i

    for (const { aspect, sentence } of headlines) {
      const isGraded = GRADED.includes(aspect)
      expect(
        owned.test(sentence),
        isGraded
          ? `"${sentence}" reads as an observed fact over a tally of his own answers`
          : `"${sentence}" claims he judged something he did not`,
      ).toBe(isGraded)
    }

    for (const aspect of GRADED) {
      expect(
        measuresSentenceFor(aspect, SUBJECT),
        `the figure for ${aspect} does not say whose judgment it is`,
      ).toMatch(owned)
    }
    expect(measuresSentenceFor('follow-through', SUBJECT)).not.toMatch(owned)
  })

  it('never claims one aspect in another one’s words', () => {
    /*
     * The heart of DEF-0020 in the copy layer. Follow-through says whether a
     * move *could be done*; it says nothing about whether it worked, whether it
     * got there, or how it felt. A headline that borrowed one aspect's verb for
     * another's figure would be a generic success statistic written out in
     * words instead of printed as a percentage.
     */
    const owned: Record<MeasuredAspect, readonly RegExp[]> = {
      'follow-through': [/blocked/i, /happen/i],
      'direct-result': [/all the way/i],
      'downstream-effect': [/difference/i],
      comfort: [/easy/i, /hard work/i],
    }

    for (const { aspect, sentence } of headlines) {
      const mine = owned[aspect]
      expect(
        mine.some((pattern) => pattern.test(sentence)),
        `"${sentence}" does not say anything about ${aspect}`,
      ).toBe(true)

      for (const [other, patterns] of Object.entries(owned) as [MeasuredAspect, RegExp[]][]) {
        if (other === aspect) continue
        for (const pattern of patterns) {
          expect(
            pattern.test(sentence),
            `"${sentence}" is a ${aspect} figure wearing ${other}'s words`,
          ).toBe(false)
        }
      }
    }
  })
})

describe('a run of numbers describes itself and explains nothing', () => {
  it('states no cause on a trajectory', () => {
    /*
     * Section 68 — "avoid causal language when only association exists" — and
     * section 51's own "association must not be written as causal certainty".
     * A trajectory is a description of readings; the moment it says "because"
     * it is an assertion the app cannot support from a series.
     */
    const trajectory = SOURCE.slice(
      SOURCE.indexOf('function trajectoryCards'),
      SOURCE.indexOf('function lifeSeasonCards'),
    )
    /*
     * Matched on the *shape* of the sentence rather than on the name of the
     * binding it interpolates — AUD-0029 renamed that binding when the
     * arithmetic moved to `trajectory.ts`, and a guard keyed on `held.label`
     * would have gone quietly to zero matches. The `expect` below is what
     * caught it; the pattern is what stops the next rename doing the same.
     */
    const headlines = [...trajectory.matchAll(/`\$\{[A-Za-z][\w.]*\.label\}: [^`]+`/g)].map(
      (match) => match[0],
    )
    expect(headlines.length).toBeGreaterThan(0)
    for (const headline of headlines) {
      expect(/\bbecause\b|\bcaused?\b|\bdue to\b|\bleads? to\b/i.test(headline)).toBe(false)
    }
  })
})
