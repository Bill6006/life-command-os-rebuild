import { describe, expect, it } from 'vitest'
import { createRecordFactory } from '../../src/domain/build'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { sequentialRecordIds } from '../../src/domain/ids'
import type { CanonicalRecord } from '../../src/domain/records'
import { instant, type Instant } from '../../src/domain/time'
import { decide } from '../../src/intelligence/engine'
import { buildView } from '../../src/memory/view'
import { chosenId, loadScenario, reasonOf, sentenceOf } from './harness'

/**
 * Section 53's fourth gate, and its third, proved against a whole evening.
 *
 * > imported raw legacy records cannot silently drive decisions;
 * > current app behaviour remains correct with no legacy data present.
 *
 * `tests/contract/legacy-quarantine.test.ts` proves an archived row answers no
 * concept. That is the floor. This is the ceiling: a real scenario, decided
 * end to end, and then decided again with a pile of imported archive rows
 * dropped into the same history — rows that describe the same evening, in the
 * same domains, carrying values that would change the answer if anything read
 * them.
 *
 * The recommendation, the sentence and the reason must be **identical**, not
 * merely similar. A comparison that allowed "close enough" would pass the
 * defect it exists to catch, since a legacy row nudging a score by a tenth is
 * exactly how imported history would start driving decisions quietly.
 *
 * The second gate — "no legacy data present" — is proved by the whole rest of
 * this repository, which runs with none. What it needs stating here is the
 * direction of the claim: the app that decided before this phase and the app
 * that decides after it are the same app, and the way to show that is to
 * demonstrate the decision does not move.
 */

const nextId = sequentialRecordIds('LEGI')

/**
 * Which way the imported rows pull.
 *
 * Two, and the reason is the whole difficulty of writing this test honestly.
 * No single set of values disturbs every scenario: a reading of "you are fine
 * and you have all evening" moves an evening that was going to rest and leaves
 * one that was already going to study exactly where it was, and the opposite
 * reading does the reverse. A fixture with one pull therefore produces a
 * matrix in which some cells could not have failed whatever the code did —
 * which is precisely the trap Phase 7 shipped three of.
 *
 * So every scenario is run against both, and the reintroduction check was done
 * against both: replacing these rows with plain observations of the same values
 * fails at least one pull for **every** scenario in the list.
 *
 * An earlier version combined them into one set — best energy with worst
 * soreness — and they cancelled, which is worse than either alone.
 */
const PULLS = ['restful', 'strained'] as const
type Pull = (typeof PULLS)[number]

/**
 * Imported rows that would be loud if anything were listening.
 *
 * Each carries a payload that is a perfectly good reading of a concept the
 * engine reads on every decision, plus a learned belief and a recommendation
 * from the old catalogue for good measure.
 */
function importedArchive(at: Instant, pull: Pull): readonly CanonicalRecord[] {
  const record = createRecordFactory({
    zone: 'America/Denver' as never,
    provenance: {
      source: 'legacy-import',
      writtenBy: 'legacy-map-2026-08-A',
      note: 'old record test',
    },
    nextId,
  })

  const payloads = [
    {
      domain: DOMAIN.health,
      raw: {
        recordType: 'observation',
        attribute: 'state:energy',
        concept: CONCEPT.energy,
        value: { type: 'scale', value: pull === 'restful' ? 5 : 1, of: 5 },
        method: 'self-report',
      },
    },
    {
      domain: DOMAIN.career,
      raw: {
        recordType: 'observation',
        attribute: 'context:available-minutes',
        concept: CONCEPT.usableTimeTonight,
        value: { type: 'duration', minutes: pull === 'restful' ? 240 : 10 },
        method: 'self-report',
      },
    },
    {
      domain: DOMAIN.health,
      raw: {
        recordType: 'observation',
        attribute: 'state:pain-interference',
        concept: CONCEPT.soreness,
        value: { type: 'scale', value: pull === 'restful' ? 1 : 5 },
        method: 'self-report',
      },
    },
    {
      domain: DOMAIN.direction,
      raw: {
        recordType: 'learned-belief',
        statement: 'Studying always goes better after a walk',
        status: 'held',
      },
    },
    {
      domain: DOMAIN.direction,
      raw: {
        recordType: 'recommendation',
        statement: 'Ten minutes of subnetting',
        engineCandidateId: 'career:study',
      },
    },
  ]

  return payloads.map((entry, index) =>
    record(
      'imported-legacy-record',
      {
        occurredAt: instant(at - (index + 1) * 60_000),
        domains: [entry.domain],
        privacy: 'sensitive',
      },
      { legacyFormat: 'life-command-os.backup@test', raw: entry.raw },
    ),
  )
}

/*
 * Five shapes rather than one: an evening that chooses study, one that is rested
 * and behind, a settled one, one where almost nothing is known, and one where
 * the right answer is to recommend nothing at all.
 *
 * The last matters most. A no-action decision is the easiest to disturb — it
 * rests on the absence of evidence, and imported rows are evidence-shaped.
 *
 * **What the reintroduction showed, per cell.** Replacing the archive rows with
 * plain observations of the same values fails all four assertions on at least
 * one pull for **every** scenario here. `running-on-empty` was in this list and
 * was removed: its decision is severe enough that neither pull moved it, so its
 * three decision assertions could not have failed whatever the code did, and a
 * test that cannot fail reads as evidence either way.
 */
const SCENARIOS = [
  'subnetting-struggle',
  'rested-and-behind',
  'settled-evening',
  'mostly-unknown',
  'quiet-fortnight',
]

const CASES = SCENARIOS.flatMap((id) => PULLS.map((pull) => ({ id, pull })))

describe.each(CASES)(
  'an evening decided with and without imported history — $id, $pull',
  ({ id, pull }) => {
    const loaded = loadScenario(id)
    const before = loaded.decision()

    const withLegacy = {
      ...loaded.snapshot,
      records: [...loaded.snapshot.records, ...importedArchive(loaded.scenario.now, pull)],
    }
    const after = decide(
      buildView(withLegacy, { now: loaded.scenario.now, zone: loaded.scenario.zone }),
      { now: loaded.scenario.now, zone: loaded.scenario.zone },
    )

    it('chooses exactly the same thing', () => {
      expect(chosenId(after)).toBe(chosenId(before))
    })

    it('says exactly the same words', () => {
      expect(sentenceOf(after)).toBe(sentenceOf(before))
      expect(reasonOf(after)).toBe(reasonOf(before))
    })

    it('rests on exactly the same reasoning, dimension by dimension', () => {
      /*
       * Not only the same conclusion — the same arithmetic under it. A decision
       * that reached the same answer by a different route would mean the imported
       * rows had been read and happened not to change the winner this time, which
       * is a coincidence rather than a guarantee.
       *
       * `dimensions` and `score` rather than a summary: a legacy row nudging one
       * dimension by a tenth without flipping the ranking is exactly the shape
       * this has to catch, and only the numbers show it.
       */
      expect(after.evaluation?.dimensions).toEqual(before.evaluation?.dimensions)
      expect(after.evaluation?.score).toBe(before.evaluation?.score)
      expect(after.evaluation?.confidence).toEqual(before.evaluation?.confidence)
      expect(after.noAction?.reason).toBe(before.noAction?.reason)
    })

    it('counts the imported rows as history, because they are', () => {
      // Inert is not invisible. The owner's history genuinely got longer, and an
      // import that hid its own work would be worse than one that drove decisions.
      const view = buildView(withLegacy, { now: loaded.scenario.now, zone: loaded.scenario.zone })
      expect(view.summary.byKind.get('imported-legacy-record')).toBe(5)
      expect(view.summary.total).toBe(loaded.view().summary.total + 5)
    })
  },
)
