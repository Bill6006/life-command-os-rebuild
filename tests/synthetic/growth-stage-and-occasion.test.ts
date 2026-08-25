import { describe, expect, it } from 'vitest'
import { DOMAIN } from '../../src/domain/domains'
import { entityRef } from '../../src/domain/entities'
import { sequentialRecordIds } from '../../src/domain/ids'
import type { DomainUpdateRecord } from '../../src/domain/records'
import { timeZone, type Instant } from '../../src/domain/time'
import { generateCandidates } from '../../src/intelligence/candidates'
import { decide, type Decision } from '../../src/intelligence/engine'
import {
  growthAnswerRecord,
  growthStageRecord,
  growthStandingFor,
  maintenanceProbeDue,
  SETTINGS_FOR_SETTLED,
} from '../../src/intelligence/growth'
import { settingQuestionFor } from '../../src/intelligence/outcomes'
import { assembleSituation, type Situation } from '../../src/intelligence/situation'
import { snapshotFromWire } from '../../src/memory/snapshot'
import type { StoreSnapshot } from '../../src/memory/store'
import { buildView } from '../../src/memory/view'
import { createKit, pastEpisodeRecords, type PastEpisode } from '../../src/synthetic/kit'
import { scenarioById } from '../../src/synthetic/scenarios'

/**
 * AUD-0015(a) and AUD-0017 — the growth model's data shape.
 *
 * Two findings that had to move together, because they change the same flow.
 *
 * **AUD-0015(a).** After "Yes, she has got this", the app wrote a free-text
 * summary, `development-skill` entities carried no status, and the candidate
 * generator enumerated every one of them unconditionally. So the owner's
 * strongest possible statement about his own daughter suppressed the
 * *suggestion* and not the *move*, and the app went on proposing a skill he had
 * told it she had. Section 62 forbids that in as many words.
 *
 * **AUD-0017.** An occasion recorded one number and no context, so the claim
 * "she handles this independently now" — a claim about generalisation — rested
 * on evidence about repetition. Three good goes three weeks apart at the same
 * restaurant with her father at the table supports "she can do this here, with
 * me" (Stokes & Baer, 1977), and "independently now" is what got written down.
 */

const ZONE = timeZone('America/Denver')
const ORDERING = entityRef('development-skill', 'ordering her own food')
const ADAYA = entityRef('person', 'Adaya')

const scenario = scenarioById('growth-evidence')
if (scenario === undefined) throw new Error('no growth-evidence scenario')

const NOW = scenario.now

function situationOf(snapshot: StoreSnapshot, now: Instant = NOW): Situation {
  const moment = { now, zone: ZONE, weekStartsOn: 1 as const }
  return assembleSituation(buildView(snapshot, moment), moment)
}

function baseline(): StoreSnapshot {
  const loaded = snapshotFromWire(scenario!.build())
  expect(loaded.loaded).toBe(true)
  return loaded.snapshot
}

function decideOn(snapshot: StoreSnapshot, now: Instant = NOW): Decision {
  const moment = { now, zone: ZONE }
  return decide(buildView(snapshot, moment), moment)
}

/** The same history, with the three occasions given whatever settings we like. */
function withSettings(settings: readonly PastEpisode['setting'][]): StoreSnapshot {
  const snapshot = baseline()
  const kit = createKit('GST', 'America/Denver', '2026-05-01T12:00:00Z')
  const kept = snapshot.records.filter(
    (record) =>
      !(
        record.kind === 'action-recommendation' ||
        record.kind === 'action-completion' ||
        record.kind === 'outcome'
      ),
  )
  const rebuilt = pastEpisodeRecords(
    kit,
    ['2026-06-06', '2026-06-13', '2026-06-20'].map((on, index) => ({
      verb: 'growth-opportunity' as const,
      object: ORDERING,
      subject: ORDERING,
      domain: DOMAIN.fatherhood,
      on,
      at: '12:30',
      context: {
        block: 'afternoon' as const,
        weekend: true,
        strain: 'none' as const,
        childPresent: true,
        usableMinutes: 120,
      },
      ending: 'completed' as const,
      result: 'all' as const,
      ...(settings[index] === undefined ? {} : { setting: settings[index] }),
    })),
    sequentialRecordIds('GSTE'),
  )
  return { ...snapshot, records: [...kept, ...rebuilt] }
}

// ---------------------------------------------------------------------------
// AUD-0017 — the occasion carries where it happened
// ---------------------------------------------------------------------------

describe('AUD-0017 — a claim about generalisation needs evidence about settings', () => {
  it('offers "settled" only when the run spans more than one place', () => {
    const spread = decideOn(withSettings(['somewhere-familiar', 'somewhere-new', 'somewhere-new']))
    expect(spread.growth[0]?.kind).toBe('settled')
    expect(spread.growth[0]?.headline).toContain('in more than one place')
    expect(spread.growth[0]?.statement).toContain('independently now')
  })

  it('says so instead when three good goes were all in one place', () => {
    /*
     * The finding's own wording: "Three times, all at the same place. Worth
     * trying somewhere new before we call it" — which is a genuinely useful
     * suggestion rather than a hedged version of the question.
     */
    const same = decideOn(
      withSettings(['somewhere-familiar', 'somewhere-familiar', 'somewhere-familiar']),
    )
    expect(same.growth[0]?.kind).toBe('widen-the-setting')
    expect(same.growth[0]?.headline).toContain('all in the same place')
    expect(same.growth[0]?.headline).not.toContain('more than one place')
  })

  it('does not claim they were in one place when it does not know where', () => {
    /*
     * D-038, on the one claim in the product that is about a child. Every
     * occasion recorded before this field existed happened somewhere, and the
     * app does not know where — so "all at the same place" would be asserting
     * exactly the fact it is short of.
     */
    const unknown = decideOn(withSettings([undefined, undefined, undefined]))
    expect(unknown.growth[0]?.kind).toBe('widen-the-setting')
    expect(unknown.growth[0]?.headline).toContain('does not say where')
    expect(unknown.growth[0]?.headline).not.toContain('same place')
  })

  it('still counts an occasion recorded before the setting existed', () => {
    // The finding's own acceptance condition: "existing single-value occasions
    // still parse and still count toward three."
    const unknown = decideOn(withSettings([undefined, undefined, undefined]))
    expect(unknown.growth[0]?.occasions).toBe(3)
    expect(unknown.growth[0]?.runLength).toBe(3)
  })

  it('counts two different places as two settings, and one place twice as one', () => {
    const cafe = entityRef('place', 'the cafe')
    const shop = entityRef('place', 'the shop')
    expect(SETTINGS_FOR_SETTLED).toBe(2)
    expect(decideOn(withSettings([cafe, shop, cafe])).growth[0]?.kind).toBe('settled')
    expect(decideOn(withSettings([cafe, cafe, cafe])).growth[0]?.kind).toBe('widen-the-setting')
  })

  it('treats a skipped setting as unknown rather than as familiar', () => {
    /*
     * AUD-0017 says this in as many words, and it is the difference between an
     * honest gap and an invented fact: two known settings plus one skip is a
     * spread, and one known setting plus two skips is not.
     */
    const cafe = entityRef('place', 'the cafe')
    const shop = entityRef('place', 'the shop')
    expect(decideOn(withSettings([cafe, shop, undefined])).growth[0]?.kind).toBe('settled')
    expect(decideOn(withSettings([cafe, undefined, undefined])).growth[0]?.kind).toBe(
      'widen-the-setting',
    )
  })
})

describe('AUD-0017 — answering a growth outcome is a two-step flow', () => {
  const situation = situationOf(baseline())

  it('asks for the setting on the growth verb and on nothing else', () => {
    const episodes = situation.learning.episodes
    const growth = episodes.find(
      (episode) => episode.semantics.target.verb === 'growth-opportunity',
    )
    expect(growth, 'the history should hold a growth episode').toBeDefined()
    if (growth === undefined) return

    const question = settingQuestionFor(growth, situation.entities)
    expect(question?.prompt).toBe('Where was Adaya?')
    // The two coarse answers and a way past, and the way past is not "familiar".
    expect(question?.options.map((option) => option.id)).toContain('new')
    expect(question?.options.map((option) => option.id)).toContain('familiar')
    expect(question?.options.find((option) => option.id === 'skip')?.setting).toBeUndefined()

    const other = episodes.find((episode) => episode.semantics.target.verb !== 'growth-opportunity')
    if (other !== undefined) {
      expect(settingQuestionFor(other, situation.entities)).toBeUndefined()
    }
  })

  it('names what the parent did rather than grading the child', () => {
    /*
     * Section 4.4 asks the framing to sit on the parent, and the scaffolding
     * construct is exactly that: the adult's assistance varies with the child's
     * competence and responsibility transfers as she masters each component
     * (Wood, Bruner & Ross, 1976). So the three answers name what he did.
     */
    const growth = situation.learning.episodes.find(
      (episode) => episode.semantics.target.verb === 'growth-opportunity',
    )
    if (growth === undefined) return
    const first = growth.outcomes[0]
    expect(first?.occasion?.help).toBe('on-her-own')
  })
})

// ---------------------------------------------------------------------------
// AUD-0015(a) — the owner's confirmation changes what the app does
// ---------------------------------------------------------------------------

describe('AUD-0015(a) — a settled skill stops being proposed', () => {
  function settle(): StoreSnapshot {
    const suggestion = decideOn(
      withSettings(['somewhere-familiar', 'somewhere-new', 'somewhere-new']),
    ).growth[0]
    expect(suggestion?.kind).toBe('settled')
    if (suggestion === undefined) throw new Error('no settled offer to agree to')
    return {
      ...withSettings(['somewhere-familiar', 'somewhere-new', 'somewhere-new']),
      records: [
        ...withSettings(['somewhere-familiar', 'somewhere-new', 'somewhere-new']).records,
        growthAnswerRecord(suggestion, true, { now: NOW, zone: ZONE }),
      ],
    }
  }

  it('was proposed before he answered, and is not after', () => {
    /*
     * The defect, reproduced as a difference. Before: the growth move is in the
     * catalogue. After "Yes, she has got this": it is not. Nothing else about
     * the history changes.
     */
    const before = withSettings(['somewhere-familiar', 'somewhere-new', 'somewhere-new'])
    const after = settle()

    const proposes = (snapshot: StoreSnapshot): boolean =>
      generateCandidates(situationOf(snapshot)).some(
        (candidate) => candidate.semantics.target.verb === 'growth-opportunity',
      )

    expect(proposes(before), 'the growth move was never proposed').toBe(true)
    expect(proposes(after), 'his answer changed nothing').toBe(false)
  })

  it('records the stage alongside the sentence he agreed to', () => {
    const record = decideOn(withSettings(['somewhere-familiar', 'somewhere-new', 'somewhere-new']))
      .growth[0]
    if (record === undefined) return
    const written = growthAnswerRecord(record, true, { now: NOW, zone: ZONE })
    expect(written.kind).toBe('domain-update')
    if (written.kind !== 'domain-update') return
    // Both halves. The sentence is what he agreed to and is unchanged; the
    // stage is the part the generator can read.
    expect(written.summary).toContain('independently now')
    expect(written.growthStage).toEqual({ skill: ORDERING, stage: 'settled' })
  })

  it('is never permanent, and one record puts it back', () => {
    /*
     * The finding's own risk note, and it is the reason the field is a stage
     * rather than a flag: regression is real in children, and the app must
     * never make "settled" permanent.
     */
    const settled = settle()
    expect(growthStandingFor(situationOf(settled), ORDERING).stage).toBe('settled')

    const back = {
      ...settled,
      records: [
        ...settled.records,
        growthStageRecord(ORDERING, 'ordering her own food', DOMAIN.fatherhood, 'practising', {
          now: (NOW + 60_000) as Instant,
          zone: ZONE,
        }),
      ],
    }
    // Read a minute later, because the reversal happened a minute later: a
    // record dated after the moment being decided does not apply to it, which
    // is what lets a history be replayed at an earlier hour.
    const after = (NOW + 60_000) as Instant
    expect(growthStandingFor(situationOf(back, after), ORDERING).stage).toBe('practising')
    expect(
      generateCandidates(situationOf(back, after)).some(
        (candidate) => candidate.semantics.target.verb === 'growth-opportunity',
      ),
      'putting it back did not make it proposable again',
    ).toBe(true)
  })

  it('comes round as an occasional check, at expanding intervals', () => {
    /*
     * Not silence: the app stops *proposing* a settled skill and keeps a way of
     * noticing a regression, which is what the maintenance literature
     * recommends after mastery and is a different sentence.
     *
     * **The interval runs from her last go, not from his answer**, because that
     * is what the sentence says — "she hasn't ordered for herself in a couple of
     * months". Her last occasion here is 2026-06-20 and the history stands on
     * 2026-07-11, so twenty-one days have already passed when he settles it.
     *
     * Both ends are asserted, and then the doubling, because "expanding" is a
     * claim about the shape rather than about one date.
     */
    const settled = settle()
    const day = 86_400_000
    const due = (days: number, snapshot: StoreSnapshot = settled): boolean =>
      maintenanceProbeDue(situationOf(snapshot, (NOW + days * day) as Instant), ORDERING)

    expect(due(10), 'asked again a month after she last did it').toBe(false)
    expect(due(38), 'asked again one day under the first interval').toBe(false)
    expect(due(39), 'never asked again at all').toBe(true)

    // And once a probe has actually happened, the next one is twice as far off.
    const probed: StoreSnapshot = {
      ...settled,
      records: [
        ...settled.records,
        ...pastEpisodeRecords(
          createKit('GSTP', 'America/Denver', '2026-05-01T12:00:00Z'),
          [
            {
              verb: 'growth-opportunity' as const,
              object: ORDERING,
              subject: ORDERING,
              domain: DOMAIN.fatherhood,
              on: '2026-08-20',
              at: '12:30',
              context: {
                block: 'afternoon' as const,
                weekend: true,
                strain: 'none' as const,
                childPresent: true,
                usableMinutes: 120,
              },
              ending: 'completed' as const,
              result: 'all' as const,
              setting: 'somewhere-new' as const,
            },
          ],
          sequentialRecordIds('GSTP'),
        ),
      ],
    }

    // 2026-08-20 is forty days after the history's own moment, so the second
    // interval closes 120 days after that rather than 60.
    expect(due(159, probed), 'the second interval did not widen').toBe(false)
    expect(due(160, probed)).toBe(true)
  })

  it('says something different when it does come round', () => {
    const settled = settle()
    const later = decideOn(settled, (NOW + 90 * 86_400_000) as Instant)
    const growth = later.trace.ranking.find((row) => row.id.includes('growth-opportunity'))
    expect(growth, 'the maintenance probe never reached the ranking').toBeDefined()

    const decision = decideOn(settled, (NOW + 90 * 86_400_000) as Instant)
    const reason =
      decision.explanation?.semantics.target.verb === 'growth-opportunity'
        ? decision.explanation.rendered.reason
        : undefined
    if (reason !== undefined) {
      expect(reason).toContain('worth a look')
      expect(reason).not.toContain('she can lead')
    }
  })
})

// ---------------------------------------------------------------------------
// Gate item 6 — the Phase 81 copy guard still bites
// ---------------------------------------------------------------------------

describe('nothing package 5 added grades the child', () => {
  it('says counts and settings and never a mark', () => {
    /*
     * The gate item, checked over the sentences this package actually
     * introduced. `tests/synthetic/g003-growth-evidence.test.ts` sweeps the
     * whole library for the same patterns and is the guard that must still
     * bite; this is the same rule applied to the new copy while it is being
     * written.
     */
    const forbidden = [/%/, /\bpercent/i, /\bscore\b/i, /\brate\b/i, /\bgrade\b/i, /\branked?\b/i]
    const lines: string[] = []
    for (const settings of [
      ['somewhere-familiar', 'somewhere-new', 'somewhere-new'],
      ['somewhere-familiar', 'somewhere-familiar', 'somewhere-familiar'],
      [undefined, undefined, undefined],
    ] as const) {
      const suggestion = decideOn(withSettings([...settings])).growth[0]
      if (suggestion === undefined) continue
      lines.push(suggestion.headline, suggestion.statement, suggestion.occasionsSummary ?? '')
    }
    const settled = growthStageRecord(
      ORDERING,
      'ordering her own food',
      DOMAIN.fatherhood,
      'settled',
      { now: NOW, zone: ZONE },
    ) as DomainUpdateRecord
    lines.push(settled.summary)

    const offenders = lines.filter((line) => forbidden.some((pattern) => pattern.test(line)))
    expect(offenders, 'a claim about a child that reads as a mark').toEqual([])
    expect(lines.length, 'nothing was swept').toBeGreaterThan(3)
  })

  it('still names her and the skill in everything it says', () => {
    for (const settings of [
      ['somewhere-familiar', 'somewhere-new', 'somewhere-new'],
      [undefined, undefined, undefined],
    ] as const) {
      const suggestion = decideOn(withSettings([...settings])).growth[0]
      expect(suggestion?.headline).toContain('Adaya')
      expect(suggestion?.headline).toContain('ordering her own food')
    }
    expect(ADAYA.kind).toBe('person')
  })
})
