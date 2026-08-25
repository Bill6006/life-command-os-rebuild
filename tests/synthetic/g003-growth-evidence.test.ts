import { describe, expect, it } from 'vitest'
import { DOMAIN } from '../../src/domain/domains'
import { entityRef } from '../../src/domain/entities'
import { sequentialRecordIds } from '../../src/domain/ids'
import { timeZone } from '../../src/domain/time'
import { decide, type Decision } from '../../src/intelligence/engine'
import {
  daysSincePractice,
  GROWTH_OCCASIONS,
  growthAnswerRecord,
  growthSuggestions,
} from '../../src/intelligence/growth'
import { generateCandidates } from '../../src/intelligence/candidates'
import { composeReason } from '../../src/intelligence/explain'
import { insightsFor } from '../../src/intelligence/insights'
import { assembleSituation } from '../../src/intelligence/situation'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { createKit } from '../../src/synthetic/kit'
import { SCENARIOS, scenarioById } from '../../src/synthetic/scenarios'
import { loadScenario, orphanPronounsIn, pastEpisodeRecords, sentenceOf } from './harness'

/**
 * G-003 — Adaya growth evidence.
 *
 * > Input: a child growth skill has stale/limited evidence.
 * > Expected: the system can suggest a natural practice opportunity; outcome
 * > updates evidence; repeated evidence can produce a suggested growth-status
 * > update; no stage jump from one event.
 *
 * Four claims, and the fourth is the one with teeth. Section 9 states it
 * separately from the rest — "meaningful growth-stage changes should not be
 * silently invented from one event" — so the counterexamples below run the same
 * history with one occasion and with two, and both must produce nothing.
 */

const ZONE = timeZone('America/Denver')
const ORDERING = entityRef('development-skill', 'ordering her own food')
const ADAYA = entityRef('person', 'Adaya')

const scenario = loadScenario('growth-evidence')
const decision = scenario.decision()

function situationOf(view = scenario.view()) {
  return assembleSituation(view, {
    now: scenario.scenario.now,
    zone: ZONE,
    weekStartsOn: 1,
  })
}

// ---------------------------------------------------------------------------

describe('G-003 — a natural practice opportunity can be suggested', () => {
  it('proposes practising the growth area she is actually working on', () => {
    const proposed = decision.trace.proposed.filter((move) => move.verb === 'growth-opportunity')
    expect(proposed).toHaveLength(1)
    expect(proposed[0]?.subject).toBe('ordering her own food')
    expect(proposed[0]?.domain).toBe(DOMAIN.fatherhood)
  })

  it('names her and the skill, never a pronoun standing in for either', () => {
    const rendered = decision.trace.ranking.find((row) => row.id.includes('growth-opportunity'))
    expect(rendered).toBeDefined()
    expect(orphanPronounsIn(rendered?.sentence ?? '')).toEqual([])
    expect(rendered?.sentence.toLowerCase()).toContain('ordering her own food')
  })

  it('says the reason is that the evidence has aged, once a fortnight has passed', () => {
    // The last occasion was 2026-06-20 and the scenario stands on 2026-07-11.
    const proposed = decision.trace.proposed.find((move) => move.verb === 'growth-opportunity')
    expect(proposed?.because).toContain('for a while')
  })

  it('calls it an open opportunity instead when she practised it this week', () => {
    const recent = decideWithOccasions(['2026-07-04', '2026-07-08', '2026-07-10'], 'all')
    const proposed = recent.trace.proposed.find((move) => move.verb === 'growth-opportunity')
    expect(proposed?.because).not.toContain('for a while')
  })
})

describe('G-003 — the outcome updates the evidence', () => {
  it('holds three answered occasions, all of them finished', () => {
    const episodes = decision.trace.episodes.filter((episode) =>
      episode.sentence.toLowerCase().includes('ordering her own food'),
    )
    expect(episodes).toHaveLength(3)
    for (const episode of episodes) {
      expect(episode.state).toBe('completed')
      expect(episode.outcome).toContain('answer')
    }
  })

  it('reads them as results rather than as how the evening felt', () => {
    const situation = situationOf()
    const learned = situation.learning.resultFor('growth-opportunity', situation.context)
    expect(learned.samples).toBe(3)
    // Every one went all the way, so the belief sits at its prior and the
    // dimension says nothing — D-055's penalty-only rule, seen from the good
    // side. Evidence being present is not the same as evidence speaking.
    expect(learned.reached).toBe(1)
  })
})

describe('G-003 — repeated evidence proposes a growth-status update', () => {
  it('offers one, and names her and the skill in it', () => {
    expect(decision.growth).toHaveLength(1)
    const suggestion = decision.growth[0]
    expect(suggestion?.headline).toContain('Adaya')
    expect(suggestion?.headline).toContain('ordering her own food')
    expect(suggestion?.occasions).toBe(3)
  })

  /**
   * P4-5 — it has to read like something a person would say.
   *
   * "Adaya has managed ordering her own food **on her own** 3 times running"
   * says independently twice in eight words, because the skill label already
   * carries it. The app is making a claim about his daughter and asking him to
   * confirm it; a sentence he has to re-read is a sentence he will not trust.
   *
   * The rule, rather than the instance: no phrase in either sentence may say
   * the same thing the skill label has already said.
   */
  it('says independently once, in both sentences', () => {
    for (const suggestion of decision.growth) {
      for (const line of [suggestion.headline, suggestion.statement]) {
        const words: readonly string[] = line.toLowerCase().match(/[a-z']+/g) ?? []
        const saidTwice = words.filter(
          (word, index) =>
            words.indexOf(word) !== index &&
            ['own', 'independently', 'alone', 'herself'].includes(word),
        )
        expect(saidTwice, `"${line}" says it twice`).toEqual([])
      }
    }
  })

  it('reads as a whole sentence beside the question the panel asks', () => {
    // The panel appends "Worth calling that settled?", so the headline has to
    // be a finished sentence on its own rather than a fragment.
    const headline = decision.growth[0]?.headline ?? ''
    expect(headline).toMatch(/[.?!]$/)
    expect(headline.charAt(0)).toBe(headline.charAt(0).toUpperCase())
  })

  it('points at the skill and at the person it belongs to', () => {
    const suggestion = decision.growth[0]
    expect(suggestion?.skill.id).toBe(ORDERING.id)
    expect(suggestion?.person?.id).toBe(ADAYA.id)
  })

  it('cites the occasions it was drawn from', () => {
    expect(decision.growth[0]?.evidence).toHaveLength(3)
  })

  it('does not put the suggestion in place of the recommendation', () => {
    // It sits beside the decision. The evening still gets a move, and the
    // suggestion is not one — section 6 gives Now one primary move.
    expect(decision.kind).toBe('move')
    expect(sentenceOf(decision)).toBeDefined()
  })
})

describe('G-003 — no stage jump from one event', () => {
  it('proposes nothing from a single good occasion', () => {
    expect(decideWithOccasions(['2026-07-04'], 'all').growth).toHaveLength(0)
  })

  it('proposes nothing from two', () => {
    expect(decideWithOccasions(['2026-06-27', '2026-07-04'], 'all').growth).toHaveLength(0)
  })

  it('needs the third before it will say anything', () => {
    expect(
      decideWithOccasions(['2026-06-20', '2026-06-27', '2026-07-04'], 'all').growth,
    ).toHaveLength(1)
  })

  it('is the same threshold learning uses, rather than a second number', () => {
    expect(GROWTH_OCCASIONS).toBe(3)
  })

  it('proposes nothing when the occasions only went part of the way', () => {
    expect(
      decideWithOccasions(['2026-06-20', '2026-06-27', '2026-07-04'], 'part').growth,
    ).toHaveLength(0)
  })

  it('proposes nothing from three occasions that were never finished', () => {
    expect(
      decideWithOccasions(['2026-06-20', '2026-06-27', '2026-07-04'], 'all', 'started').growth,
    ).toHaveLength(0)
  })
})

describe('G-003 — the owner has the last word, and it is recorded', () => {
  it('stops suggesting once he has agreed', () => {
    const suggestion = decision.growth[0]
    expect(suggestion).toBeDefined()
    const answer = growthAnswerRecord(
      suggestion!,
      true,
      { now: scenario.scenario.now, zone: ZONE },
      sequentialRecordIds('ANS')(),
    )
    const after = buildView(
      { ...scenario.snapshot, records: [...scenario.snapshot.records, answer] },
      { now: scenario.scenario.now, zone: ZONE },
    )
    expect(growthSuggestions(situationOf(after))).toHaveLength(0)
  })

  it('stops suggesting when he says not yet, and records that he was asked', () => {
    const suggestion = decision.growth[0]
    const answer = growthAnswerRecord(
      suggestion!,
      false,
      { now: scenario.scenario.now, zone: ZONE },
      sequentialRecordIds('ANS')(),
    )
    expect(answer.kind).toBe('coverage-update')
    const after = buildView(
      { ...scenario.snapshot, records: [...scenario.snapshot.records, answer] },
      { now: scenario.scenario.now, zone: ZONE },
    )
    expect(growthSuggestions(situationOf(after))).toHaveLength(0)
  })

  it('writes what changed rather than a flag, when he agrees', () => {
    const answer = growthAnswerRecord(
      decision.growth[0]!,
      true,
      { now: scenario.scenario.now, zone: ZONE },
      sequentialRecordIds('ANS')(),
    )
    expect(answer.kind).toBe('domain-update')
    expect(answer.kind === 'domain-update' ? answer.summary : '').toContain('ordering her own food')
  })

  it('counts either answer as evidence about that area', () => {
    const answer = growthAnswerRecord(
      decision.growth[0]!,
      false,
      { now: scenario.scenario.now, zone: ZONE },
      sequentialRecordIds('ANS')(),
    )
    const after = buildView(
      { ...scenario.snapshot, records: [...scenario.snapshot.records, answer] },
      { now: scenario.scenario.now, zone: ZONE },
    )
    const coverage = situationOf(after).coverage.get(DOMAIN.fatherhood)
    expect(coverage?.daysSinceEvidence).toBe(0)
  })
})

describe('G-003 — the scenario the owner is handed is a life he recognises', () => {
  it('carries the custody arrangement, as his own does', () => {
    // D-041. A fixture that leaves out something the owner actually has makes
    // correct behaviour look broken, and costs more than the reverse.
    const situation = situationOf()
    expect(situation.childPresent.state).toBe('explicit')
  })

  it('never asks whether his daughter is with him', () => {
    const entry = scenario.view().facts.get(situationOf().concepts.all()[0]!.id)
    expect(entry).toBeDefined()
    const childEntry = scenario
      .view()
      .facts.entries.find((row) => row.definition.domain === DOMAIN.fatherhood)
    expect(childEntry?.worthAsking).toBe(false)
  })

  it('is on the QA screen for the owner to open', () => {
    expect(scenarioById('growth-evidence')).toBeDefined()
  })
})

// ---------------------------------------------------------------------------

/**
 * The same Saturday, with a different number of occasions behind it.
 *
 * Everything else is held still — same child, same arrangement, same sleep,
 * same evening — so whatever changes between two of these is doing the work.
 */
function decideWithOccasions(
  days: readonly string[],
  result: 'all' | 'part' | readonly ('all' | 'part')[],
  ending: 'completed' | 'started' = 'completed',
): Decision {
  const kit = createKit('GV', 'America/Denver', '2026-06-01T12:00:00Z')
  const nextId = sequentialRecordIds('GVX')
  const now = kit.local('2026-07-11', '17:00')

  const child = kit.entity({
    kind: 'person',
    label: 'Adaya',
    domain: DOMAIN.fatherhood,
    privacy: 'child-family-sensitive',
  })
  const skill = kit.entity({
    kind: 'development-skill',
    label: 'ordering her own food',
    domain: DOMAIN.fatherhood,
    privacy: 'child-family-sensitive',
    links: [{ relation: 'about-person', target: ADAYA.id }],
  })

  const present = kit.record(
    'context',
    {
      occurredAt: kit.local('2026-01-01', '09:00'),
      domains: [DOMAIN.fatherhood],
      entities: [ADAYA],
    },
    {
      concept: 'family.child-present' as never,
      value: { type: 'boolean', value: true },
      durability: 'durable',
      validFrom: kit.local('2026-01-01', '09:00'),
    },
  )

  const anAfternoon = {
    block: 'afternoon' as const,
    weekend: true,
    strain: 'none' as const,
    childPresent: true,
    usableMinutes: 120,
  }

  const past = pastEpisodeRecords(
    kit,
    days.map((on, index) => {
      // A sequence, when one is given. D-112's whole point is that the order
      // matters, so a helper that could only build "all of them the same" was a
      // helper that could not reach the defect.
      const went = Array.isArray(result) ? (result[index] ?? 'all') : (result as 'all' | 'part')
      return {
        verb: 'growth-opportunity' as const,
        object: entityRef('development-skill', 'ordering her own food'),
        subject: entityRef('development-skill', 'ordering her own food'),
        domain: DOMAIN.fatherhood,
        on,
        at: '12:30',
        context: anAfternoon,
        ending,
        ...(ending === 'completed' ? { result: went } : {}),
      }
    }),
    nextId,
  )

  const loaded = snapshotFromWire(
    kit.document({ entities: [child, skill], records: [present, ...past], exportedAt: now }),
  )
  expect(loaded.loaded, 'the variant should load').toBe(true)
  return decide(buildView(loaded.snapshot, { now, zone: ZONE }), { now, zone: ZONE })
}

// ---------------------------------------------------------------------------
// D-112 — the sequence, not the survivors
// ---------------------------------------------------------------------------

/** Six occasions of one skill, alternating, ending on a partial. */
const ALTERNATING = [
  '2026-06-06',
  '2026-06-09',
  '2026-06-13',
  '2026-06-16',
  '2026-06-20',
  '2026-06-23',
]
const ALTERNATED: readonly ('all' | 'part')[] = ['all', 'part', 'all', 'part', 'all', 'part']

describe('D-112 — the app reads the sequence rather than the survivors', () => {
  it('claims no run from occasions that were never twice in a row — AUD-0048', () => {
    /*
     * The reproduction, constructed by the audit and run on the deployed build:
     * six occasions of "ordering her own food", alternating all-the-way and
     * part-of-the-way, three of six, never twice in a row, and the most recent
     * one needing help. What the app said was **"Adaya has handled ordering her
     * own food 3 times running"**, offered for one-tap acceptance, while the
     * Fatherhood page displayed the alternating record on the next screen.
     */
    const decision = decideWithOccasions(ALTERNATING, ALTERNATED)
    expect(decision.growth).toHaveLength(0)
  })

  it('still says so when the run is real', () => {
    // The other half. A rule that never fires is not honesty, it is silence.
    const decision = decideWithOccasions(['2026-06-20', '2026-06-27', '2026-07-04'], 'all')
    expect(decision.growth).toHaveLength(1)
    expect(decision.growth[0]?.runLength).toBe(3)
  })

  it('lets the most recent contrary occasion hold it back on its own', () => {
    /*
     * D-112, in as many words. Three clean occasions and then one that needed a
     * hand is not three occasions plus noise — it is a run that ended, and the
     * app may not describe it as one that did not.
     */
    const ended = decideWithOccasions(
      ['2026-06-13', '2026-06-20', '2026-06-27', '2026-07-04'],
      ['all', 'all', 'all', 'part'],
    )
    expect(ended.growth).toHaveLength(0)

    // And the same four occasions the other way round do produce it, which is
    // what makes the previous line a statement about order rather than a
    // statement about how many.
    const recovered = decideWithOccasions(
      ['2026-06-13', '2026-06-20', '2026-06-27', '2026-07-04'],
      ['part', 'all', 'all', 'all'],
    )
    expect(recovered.growth).toHaveLength(1)
  })

  it('counts the occasions that went the other way instead of discarding them', () => {
    const decision = decideWithOccasions(
      ['2026-06-06', '2026-06-13', '2026-06-20', '2026-06-27', '2026-07-04'],
      ['part', 'part', 'all', 'all', 'all'],
    )
    const suggestion = decision.growth[0]
    expect(suggestion?.occasions, 'every attempted occasion is evidence').toBe(5)
    expect(suggestion?.cleared).toBe(3)
    expect(suggestion?.wentOtherWay).toBe(2)
  })

  it('says out loud how many went the other way — the gate item', () => {
    const decision = decideWithOccasions(
      ['2026-06-06', '2026-06-13', '2026-06-20', '2026-06-27', '2026-07-04'],
      ['part', 'part', 'all', 'all', 'all'],
    )
    const summary = decision.growth[0]?.occasionsSummary ?? ''
    expect(summary, 'the disconfirming occasions are invisible again').not.toBe('')
    expect(summary).toContain('2')
    // Said, not scored: a count of goes, and nothing that reads as a mark.
    expect(summary).not.toMatch(/%|percent|\brate\b|\bscore\b|out of/i)
  })

  it('says nothing at all about the ones that went the other way when there are none', () => {
    // Rather than announcing a zero about a four-year-old.
    const decision = decideWithOccasions(['2026-06-20', '2026-06-27', '2026-07-04'], 'all')
    expect(decision.growth[0]?.occasionsSummary).toBeUndefined()
  })

  it('carries a confidence, and never shows it — AUD-0049', () => {
    /*
     * Everywhere else the app is careful about this: a learned belief carries a
     * sample count, an association states its comparison group and refuses to
     * speak below it, a limiter carries a certainty. The claim about his
     * daughter's development carried nothing, and was offered as a binary —
     * which is what made "3 times running" possible in the first place.
     *
     * It exists, it is moved by the occasions that went the other way, and it
     * does not reach a surface: a badge attached to a sentence about a child is
     * a score about a child whatever word is on it (section 4.4, section 22).
     */
    const clean = decideWithOccasions(['2026-06-20', '2026-06-27', '2026-07-04'], 'all')
    const mixed = decideWithOccasions(
      ['2026-06-06', '2026-06-13', '2026-06-20', '2026-06-27', '2026-07-04'],
      ['part', 'part', 'all', 'all', 'all'],
    )

    const sure = clean.growth[0]?.confidence ?? 0
    const less = mixed.growth[0]?.confidence ?? 0
    expect(sure).toBeGreaterThan(0)
    expect(less, 'evidence against did not move it').toBeLessThan(sure)

    for (const decision of [clean, mixed]) {
      const spoken = [
        decision.growth[0]?.headline ?? '',
        decision.growth[0]?.occasionsSummary ?? '',
        decision.growth[0]?.statement ?? '',
      ]
      const value = String(decision.growth[0]?.confidence ?? '')
      for (const line of spoken) {
        expect(line, 'the confidence reached a surface').not.toContain(value.slice(0, 4))
        expect(line, 'a confidence word reached a surface').not.toMatch(
          /too early to say|worth noticing|fairly consistent|very consistent/i,
        )
      }
    }
  })

  it('lets no percentage, rank, grade or scale about her reach any surface', () => {
    /*
     * Swept over every growth sentence every history in the library can produce,
     * rather than over the two the fixtures happen to show. Written as what the
     * copy may not claim: the failure this guards is not a particular sentence,
     * it is the idea that a four-year-old has a score.
     */
    const forbidden = [
      /%/,
      /\bpercent/i,
      /\b\d+\s*(?:of|out of)\s*\d+\b/i,
      /\bscore\b/i,
      /\brate\b/i,
      /\bgrade\b/i,
      /\branked?\b/i,
      /\b\d+\s*\/\s*\d+\b/,
      /\bworth noticing\b/i,
      /\bfairly consistent\b/i,
      /\bvery consistent\b/i,
    ]

    const offenders: string[] = []
    for (const entry of SCENARIOS) {
      const loaded = snapshotFromWire(entry.build())
      const moment = { now: entry.now, zone: entry.zone, weekStartsOn: entry.weekStartsOn ?? 1 }
      const built = decide(buildView(loaded.snapshot, moment), moment)
      for (const suggestion of built.growth) {
        for (const line of [
          suggestion.headline,
          suggestion.occasionsSummary ?? '',
          suggestion.statement,
        ]) {
          for (const pattern of forbidden) {
            if (pattern.test(line)) offenders.push(`${entry.id}: “${line}”`)
          }
        }
      }
    }

    expect(offenders, 'a claim about a child that reads as a mark').toEqual([])
  })

  it('reaches a growth suggestion at all, so the sweep above is not vacuous', () => {
    const seen = SCENARIOS.filter((entry) => {
      const loaded = snapshotFromWire(entry.build())
      const moment = { now: entry.now, zone: entry.zone, weekStartsOn: entry.weekStartsOn ?? 1 }
      return decide(buildView(loaded.snapshot, moment), moment).growth.length > 0
    })
    expect(seen.map((entry) => entry.id)).not.toEqual([])
  })
})

// ---------------------------------------------------------------------------
// AUD-0014 — a decline is not practice
// ---------------------------------------------------------------------------

describe('AUD-0014 — saying no is not evidence about her', () => {
  it('does not let a refusal reset when she last practised', () => {
    /*
     * Reproduced live on the deployed build. Before: the probe listed the growth
     * candidate as *"nothing has come in about this growth area for a while"*.
     * The owner pressed **"Can't right now"** on that very move. Immediately
     * after: *"there is a growth area with a natural chance to practise it"*.
     * One refusal had reset the app's belief about when Adaya last practised.
     */
    const declined = decideWithOccasions(['2026-07-10'], 'all', 'started')
    const situation = declined.situation
    const skill = situation.entities.byKind('development-skill')[0]
    expect(skill, 'the variant should hold the skill').toBeDefined()

    const refusedYesterday = daysSincePractice(situation, {
      id: skill!.id,
      kind: skill!.kind,
    })
    // Started with no outcome is not an attempt the app can read, so it does
    // not count as practice and the skill reads as never practised.
    expect(refusedYesterday).toBeUndefined()
  })

  it('does let a finished occasion reset it', () => {
    const done = decideWithOccasions(['2026-07-10'], 'all')
    const situation = done.situation
    const skill = situation.entities.byKind('development-skill')[0]
    expect(daysSincePractice(situation, { id: skill!.id, kind: skill!.kind })).toBe(1)
  })

  it('keeps the honest reason when nothing has actually come in', () => {
    // The consequence the owner saw: the trigger flipped, and with it the
    // sentence, on the strength of him saying he could not do it.
    const declined = decideWithOccasions(['2026-07-10'], 'all', 'started')
    const proposed = declined.trace.proposed.find((move) => move.verb === 'growth-opportunity')
    expect(proposed?.because).toContain('for a while')
  })
})

// ---------------------------------------------------------------------------
// AUD-0015(b) and AUD-0016 — the sentence about her
// ---------------------------------------------------------------------------

describe('the growth move says something a father would recognise', () => {
  const reasonFor = (built: Decision): string => {
    const situation = built.situation
    const growth = built.trace.ranking.find((row) => row.id.includes('growth-opportunity'))
    expect(growth, 'the variant should rank a growth move').toBeDefined()
    const evaluation = built.evaluation
    // Compose the reason the way `explain.ts` does for whichever candidate this
    // is, rather than asserting against whatever happened to win.
    return composeReason(
      { ...evaluation!, candidate: candidateFor(built, 'growth-opportunity') },
      situation,
      situation.entities,
    )
  }

  it('never renders a skill through a sentence written for a person — AUD-0015(b)', () => {
    /*
     * Verbatim from Now, after a decline chain: *"Ordering her own food is here
     * and there are about 120 minutes. That window closes on its own."* The
     * explanation table was keyed on the trigger alone, and the
     * `opportunity-window` branch is written for somebody who walks into a room.
     */
    const recent = decideWithOccasions(['2026-07-04', '2026-07-08', '2026-07-10'], 'all')
    const reason = reasonFor(recent)
    expect(reason).not.toMatch(/is here and there are about/i)
    expect(reason).not.toMatch(/that window closes on its own/i)
    expect(reason.toLowerCase()).toContain('adaya')
  })

  it('does not give the age of its own records as the reason — AUD-0016', () => {
    /*
     * Verbatim from Now: *"Nothing has come in about ordering her own food for a
     * while."* That is an honest statement of the actual reason, which is what
     * makes it damning: the app is telling a father to put his daughter in a
     * testing situation because its own data is old. Section 8's "a child's
     * developmental skill may need periodic evidence" is a coverage rule, and
     * coverage had become the motive.
     */
    const aged = decideWithOccasions(['2026-06-01', '2026-06-08', '2026-06-15'], 'all')
    const reason = reasonFor(aged)
    expect(reason).not.toMatch(/nothing has come in/i)
    expect(reason).not.toMatch(/for a while/i)
  })

  it('keeps the record-age reason where it belongs, in the trace', () => {
    // Coverage may still raise the candidate. What changed is which of the two
    // sentences the owner reads.
    const aged = decideWithOccasions(['2026-06-01', '2026-06-08', '2026-06-15'], 'all')
    const proposed = aged.trace.proposed.find((move) => move.verb === 'growth-opportunity')
    expect(proposed?.because).toContain('for a while')
  })

  it('asks the father for something rather than asking the child for something', () => {
    const recent = decideWithOccasions(['2026-07-04', '2026-07-08', '2026-07-10'], 'all')
    const sentence =
      recent.trace.ranking.find((row) => row.id.includes('growth-opportunity'))?.sentence ?? ''
    expect(sentence).not.toMatch(/give .* a chance at/i)
    expect(sentence.toLowerCase()).toContain('take the lead')
  })
})

// ---------------------------------------------------------------------------
// AUD-0037 — two counters, one skill, one instant
// ---------------------------------------------------------------------------

describe('AUD-0037 — the two screens do not contradict each other about one skill', () => {
  it('leaves growth out of “still gathering”', () => {
    /*
     * `GROWTH_OCCASIONS` is 3 and `MIN_FOR_A_RATE` is 4, and they measure
     * different quantities. At one instant, about one skill, Now asked him to
     * conclude she had mastered it while Insights said the evidence needed one
     * more occasion. Whichever he read second undermined the first.
     */
    const offenders: string[] = []
    for (const entry of SCENARIOS) {
      const loaded = snapshotFromWire(entry.build())
      const moment = { now: entry.now, zone: entry.zone, weekStartsOn: entry.weekStartsOn ?? 1 }
      const built = decide(buildView(loaded.snapshot, moment), moment)
      const report = insightsFor(built.situation)
      for (const suggestion of built.growth) {
        const label = built.situation.entities.labelFor(suggestion.skill) ?? ''
        for (const line of report.gathering) {
          if (line.subject.toLowerCase().includes(label.toLowerCase())) {
            offenders.push(
              `${entry.id}: “${line.subject} — ${line.needs}” against “${suggestion.headline}”`,
            )
          }
        }
      }
    }
    expect(offenders, 'two sufficiency claims about one skill at one instant').toEqual([])
  })

  it('leaves it out whether or not a suggestion is standing', () => {
    // The exclusion is about the verb, not about whether Now happens to be
    // asking — otherwise the contradiction returns the moment he answers.
    const built = decideWithOccasions(['2026-07-04', '2026-07-08'], 'all')
    const report = insightsFor(built.situation)
    for (const line of report.gathering) {
      expect(line.subject.toLowerCase()).not.toContain('ordering her own food')
    }
  })
})

/** The candidate for one verb, as the engine ranked it. */
function candidateFor(built: Decision, verb: string) {
  const found = built.trace.ranking.find((row) => row.id.includes(verb))
  expect(found, `no ${verb} in the ranking`).toBeDefined()
  const situation = built.situation
  const candidate = generateCandidates(situation).find((entry) => entry.id === found!.id)
  expect(candidate, `no ${verb} among the candidates`).toBeDefined()
  return candidate!
}
