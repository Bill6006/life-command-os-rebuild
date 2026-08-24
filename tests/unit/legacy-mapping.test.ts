import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { coreConcepts } from '../../src/domain/concepts'
import { coreDomains } from '../../src/domain/domains'
import {
  ATTRIBUTE_RULES,
  DECLINED_ATTRIBUTES,
  FAMILY_RULES,
  MAPPING_RULES_VERSION,
  PRIVACY_BY_LEGACY_CLASS,
  UNKNOWN_FAMILY_RULE,
  attributeRuleFor,
  declinedOwnerReasonFor,
  declinedReasonFor,
  privacyForLegacyClass,
  ruleFor,
} from '../../src/legacy/mapping'

/**
 * The registry is a set of claims, and these are the checks that keep them
 * honest (canonical plan sections 30 and 53).
 *
 * Not one of these tests is about whether a mapping is *right* — that is a
 * judgement, and it is written down in each rule's own sentence. They are about
 * the ways a registry silently stops being a registry: a family quietly
 * dropping off it, a rule pointing at a concept nobody kept, a reason that says
 * nothing, or a `map` disposition with no code behind it.
 */

const ROOT = join(import.meta.dirname, '..', '..')

/**
 * Every record family the previous generation had, as of HEAD 45091d0.
 *
 * Written out here rather than imported, because it is a fact about **another
 * repository** at a known commit and this one cannot import from it. Copying it
 * is the point: if the old app ever grows a twenty-ninth family, this list does
 * not change by itself, and the import will report the new one as unrecognised
 * rather than pretending to have a rule for it.
 */
const LEGACY_FAMILIES: readonly string[] = [
  'observation',
  'observation-correction',
  'context-snapshot',
  'inferred-state',
  'trajectory',
  'north-star',
  'goal',
  'weekly-direction',
  'commitment',
  'candidate-action',
  'untreated-forecast',
  'intervention-effect-prediction',
  'recommendation',
  'execution',
  'outcome',
  'forecast-evaluation',
  'recommendation-effect-evaluation',
  'life-context-change',
  'question',
  'question-answer',
  'learned-belief',
  'guide-session',
  'domain-preference',
  'skill-claim',
  'milestone-observation',
  'surface-permission',
  'faith-anchor',
  'move-preference',
]

describe('every legacy family has a decision', () => {
  it('covers all twenty-eight, and invents none', () => {
    const covered = FAMILY_RULES.map((rule) => rule.legacyType).sort()
    expect(covered).toEqual([...LEGACY_FAMILIES].sort())
  })

  it('names each one exactly once', () => {
    const seen = new Set(FAMILY_RULES.map((rule) => rule.legacyType))
    expect(seen.size).toBe(FAMILY_RULES.length)
  })

  it('gives a real reason for every one', () => {
    // A registry whose reasons are "n/a" is a registry nobody can audit. The
    // bar is deliberately crude: it catches a placeholder, not a bad argument.
    for (const rule of FAMILY_RULES) {
      expect(rule.because.length, rule.legacyType).toBeGreaterThan(40)
      expect(rule.because, rule.legacyType).toMatch(/[.!?]$/)
    }
  })

  it('keeps section 59’s exclusions out of the mapped set', () => {
    // The five section 59 names that the old model actually had a family for.
    // Any of these turning up as `map` would be the old architecture returning
    // without a decision, which is the one thing this phase must not do.
    for (const excluded of [
      'recommendation',
      'untreated-forecast',
      'intervention-effect-prediction',
      'forecast-evaluation',
      'question',
      'surface-permission',
      'domain-preference',
    ]) {
      expect(ruleFor(excluded)?.disposition, excluded).toBe('excluded')
    }
  })

  it('maps only families the translator actually has a branch for', () => {
    /*
     * A `map` disposition with no branch would archive silently, which reads in
     * every report as a deliberate decision to preserve rather than as the
     * missing code it is. Read from the source rather than exercised, because
     * the failure being caught is a branch that does not exist.
     */
    const source = readFileSync(join(ROOT, 'src/legacy/translate.ts'), 'utf8')
    for (const rule of FAMILY_RULES) {
      if (rule.disposition !== 'map') continue
      expect(source, `${rule.legacyType} is mapped with no branch`).toContain(
        `case '${rule.legacyType}':`,
      )
    }
  })

  it('brings something across at all', () => {
    // A registry that archived everything would satisfy every other test here
    // and would make the phase a no-op with good manners.
    expect(FAMILY_RULES.filter((rule) => rule.disposition === 'map').length).toBeGreaterThan(0)
    expect(ATTRIBUTE_RULES.length).toBeGreaterThan(0)
  })
})

describe('attribute rules point at things that exist', () => {
  it('names a registered concept and a registered domain', () => {
    for (const rule of ATTRIBUTE_RULES) {
      expect(coreConcepts.get(rule.concept), rule.legacyAttribute).toBeDefined()
      expect(coreDomains.has(rule.domain), rule.legacyAttribute).toBe(true)
    }
  })

  it('files each reading in the domain its own concept belongs to', () => {
    // A reading mapped to a concept and filed under a different domain would
    // show on one domain page and answer a question on another.
    for (const rule of ATTRIBUTE_RULES) {
      expect(coreConcepts.definitionFor(rule.concept).domain, rule.legacyAttribute).toBe(
        rule.domain,
      )
    }
  })

  it('gives a scale rule a top, and gives nothing else one', () => {
    for (const rule of ATTRIBUTE_RULES) {
      if (rule.shape === 'scale') expect(rule.scaleOf, rule.legacyAttribute).toBeGreaterThan(1)
      else expect(rule.scaleOf, rule.legacyAttribute).toBeUndefined()
    }
  })

  it('does not map and decline the same attribute', () => {
    for (const declined of DECLINED_ATTRIBUTES) {
      expect(attributeRuleFor(declined.attribute), declined.attribute).toBeUndefined()
    }
  })

  it('keeps the four emotional scales apart, by name', () => {
    /*
     * D-091 invariant 6, held as a test rather than as a note. Mood, stress,
     * confidence and overwhelm are four constructs, and any future edit that
     * points two of them at one concept fails here rather than in a trend the
     * owner reads six months later.
     */
    for (const scale of ['state:mood', 'state:stress', 'state:confidence', 'state:overwhelm']) {
      expect(attributeRuleFor(scale), scale).toBeUndefined()
      expect(declinedReasonFor(scale), scale).toMatch(/four things|state:mood/)
    }
  })

  it('explains a declined attribute rather than only omitting it', () => {
    /*
     * A short reason is allowed when it is a cross-reference — several scales
     * are declined for one argument, and repeating that argument four times
     * would be four places for it to drift. What is not allowed is a short
     * reason pointing at nothing, which is a placeholder wearing a citation.
     */
    const named = new Set(DECLINED_ATTRIBUTES.map((entry) => entry.attribute))
    for (const declined of DECLINED_ATTRIBUTES) {
      const cited = /\bSame as ([\w:-]+)\.$/.exec(declined.because)
      if (cited === null) {
        expect(declined.because.length, declined.attribute).toBeGreaterThan(40)
        continue
      }
      expect(named.has(cited[1] ?? ''), `${declined.attribute} cites ${String(cited[1])}`).toBe(
        true,
      )
      expect(declinedReasonFor(cited[1] ?? ''), declined.attribute).not.toMatch(/\bSame as\b/)
    }
  })
})

/**
 * The registry's audit trail and the sentence the owner reads are two jobs.
 *
 * They were one string, and the import report rendered it verbatim. So the
 * screen told the owner about "D-091 invariant 6", "Section 59", "the
 * contortion section 30 forbids", a constant named `MOVE_PREFERENCE_NOTE`, and
 * what "the owner" had decided — about himself, in the third person. Every
 * automated check in this repository passed on it; it was found in one pass by
 * opening the deployed build and reading the panel.
 *
 * Sections 36 and 4.6: developer-facing language does not belong on an owner
 * surface, and the app speaks to him rather than about him. The sweep below is
 * over **every** entry rather than the ones already fixed, so the twenty-ninth
 * rule inherits the rule instead of having to remember it.
 */
describe('what the owner reads is not the audit trail', () => {
  /** Each pattern with what it is actually protecting against. */
  const DEVELOPER_LANGUAGE: readonly { readonly pattern: RegExp; readonly what: string }[] = [
    { pattern: /\bD-\d{3}\b/, what: 'a decision id' },
    { pattern: /\bsections?\s+\d+/i, what: 'a plan section number' },
    { pattern: /\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b/, what: 'an identifier from this codebase' },
    { pattern: /\binvariant\b/i, what: 'plan vocabulary' },
    { pattern: /\bcanonical\b/i, what: 'plan vocabulary' },
    { pattern: /\bdefect\b/i, what: 'developer vocabulary' },
    { pattern: /\bschema\b/i, what: 'developer vocabulary' },
    { pattern: /\brecord type\b/i, what: 'developer vocabulary' },
    { pattern: /\bprovenance\b/i, what: 'developer vocabulary' },
    { pattern: /\bquarantine/i, what: 'developer vocabulary' },
    { pattern: /\bdisposition\b/i, what: 'developer vocabulary' },
    /*
     * The app is talking **to** him. "The owner rules that out" on his own
     * screen is the app discussing him with somebody else while he reads.
     */
    { pattern: /\bthe owner\b/i, what: 'the third person, about the person reading it' },
    { pattern: /\bhe (?:rules|did not|would|says)\b/i, what: 'the third person' },
  ]

  /** Every string this phase can put in front of the owner. */
  function ownerFacing(): readonly { readonly where: string; readonly text: string }[] {
    return [
      ...FAMILY_RULES.map((rule) => ({ where: `family ${rule.legacyType}`, text: rule.owner })),
      { where: 'unrecognised family', text: UNKNOWN_FAMILY_RULE.owner },
      ...DECLINED_ATTRIBUTES.map((entry) => ({
        where: `declined ${entry.attribute}`,
        text: entry.owner,
      })),
    ]
  }

  it('is checking something', () => {
    // A sweep over an empty list passes and proves nothing.
    expect(ownerFacing().length).toBeGreaterThan(40)
  })

  it('carries no decision id, plan section, identifier or developer word', () => {
    const offenders: string[] = []
    for (const { where, text } of ownerFacing()) {
      for (const { pattern, what } of DEVELOPER_LANGUAGE) {
        const found = pattern.exec(text)
        if (found !== null) offenders.push(`${where}: ${what} — "${found[0]}"`)
      }
    }
    expect(offenders, 'owner-facing text may not read like the audit trail').toEqual([])
  })

  it('still keeps the audit trail, and keeps it different', () => {
    // The reasoning is not watered down to pass the sweep above — it moves.
    for (const rule of FAMILY_RULES) {
      expect(rule.owner, rule.legacyType).not.toBe(rule.because)
      expect(rule.owner.length, rule.legacyType).toBeGreaterThan(40)
    }
    // And at least some of it genuinely cites what it rests on, or the sweep
    // would be satisfiable by a registry that argued nothing anywhere.
    const citing = FAMILY_RULES.filter((rule) => /\bD-\d{3}\b|\bsection \d+/i.test(rule.because))
    expect(citing.length).toBeGreaterThan(3)
  })

  it('gives every declined attribute both, and keeps them apart', () => {
    for (const entry of DECLINED_ATTRIBUTES) {
      expect(declinedReasonFor(entry.attribute), entry.attribute).toBe(entry.because)
      expect(declinedOwnerReasonFor(entry.attribute), entry.attribute).toBe(entry.owner)
      expect(entry.owner, entry.attribute).not.toBe(entry.because)
    }
  })
})

describe('privacy fails closed', () => {
  it('treats an unclassified legacy row as sensitive rather than normal', () => {
    expect(privacyForLegacyClass(undefined)).toBe('sensitive')
    expect(privacyForLegacyClass('a-class-invented-later')).toBe('sensitive')
  })

  it('never turns a sensitive legacy class into a normal one', () => {
    for (const [legacyClass, mapped] of Object.entries(PRIVACY_BY_LEGACY_CLASS)) {
      if (legacyClass === 'general') continue
      expect(mapped, legacyClass).not.toBe('normal')
    }
  })

  it('keeps a child’s detail as a child’s detail', () => {
    expect(privacyForLegacyClass('child')).toBe('child-family-sensitive')
  })

  it('reserves the private class for what the old app also called private', () => {
    // `private` here means the private-health domain (section 11). Using it as
    // a general fallback would file a workplace note under that heading.
    const usingPrivate = Object.entries(PRIVACY_BY_LEGACY_CLASS)
      .filter(([, mapped]) => mapped === 'private')
      .map(([legacyClass]) => legacyClass)
    expect(usingPrivate).toEqual(['private-pattern'])
  })
})

describe('the rules version', () => {
  it('is stamped and shaped so two revisions sort', () => {
    expect(MAPPING_RULES_VERSION).toMatch(/^legacy-map-\d{4}-\d{2}-[A-Z]$/)
  })
})
