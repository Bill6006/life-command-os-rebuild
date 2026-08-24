import { beforeAll, describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { DOMAIN } from '../../src/domain/domains'
import { valueIfUsable } from '../../src/domain/knowledge'
import { evidenceSourceOf } from '../../src/domain/records'
import { timeZone } from '../../src/domain/time'
import {
  applyImport,
  identify,
  importChangesNothing,
  legacyFormatLabel,
  openLegacyBackup,
  planImport,
  snapshotWith,
  type ImportPlan,
  type OpenedLegacyBackup,
} from '../../src/legacy'
import { createMemoryStore } from '../../src/memory/memoryStore'
import { EMPTY_SNAPSHOT, type StoreSnapshot } from '../../src/memory/store'
import { buildView } from '../../src/memory/view'
import { anchoredScale, legacyBackupFile, legacyEnvelope, legacyObservation } from './legacyFixture'

/**
 * Bringing the previous generation's history across (canonical plan sections
 * 30 and 53).
 *
 * Section 53's gate, item by item, against a file that is genuinely encrypted
 * and genuinely decrypted:
 *
 *   - legacy import does not change the recommendation engine architecture;
 *   - ambiguous mappings remain explicit;
 *   - imported raw legacy records cannot silently drive decisions;
 *   - current app behaviour remains correct with no legacy data present.
 *
 * The last of those is proved elsewhere and everywhere: every other suite in
 * this repository runs with no legacy data, and none of them was changed by
 * this phase. `tests/synthetic/legacy-absent.test.ts` states it directly.
 */

const ZONE = timeZone('America/Denver')
const PASSPHRASE = 'the owner’s actual passphrase'

/** One of each family that matters, plus the traps. */
const ROWS: readonly Record<string, unknown>[] = [
  // Maps: same construct, same scale, same direction.
  legacyObservation('obs-energy-1', '2026-03-01T18:00:00.000Z', 'state:energy', {
    ...anchoredScale('energy', 4, 'Good'),
  }),
  // Maps, and carries a field this build has never heard of.
  legacyObservation(
    'obs-energy-2',
    '2026-03-02T18:00:00.000Z',
    'state:energy',
    anchoredScale('energy', 2, 'Low'),
    { somethingNewerWrote: { note: 'from a later build' } },
  ),
  // Considered and declined: four scales are not one emotional quantity.
  legacyObservation(
    'obs-mood',
    '2026-03-01T18:05:00.000Z',
    'state:mood',
    anchoredScale('mood', 5, 'Very good'),
  ),
  // The owner looked and could not say. A report, not a reading.
  legacyObservation('obs-unsure', '2026-03-03T18:00:00.000Z', 'state:energy', {
    kind: 'unsure',
    about: 'how much I had left',
  }),
  // Nobody has decided about this attribute at all.
  legacyObservation('obs-unknown-attr', '2026-03-04T18:00:00.000Z', 'career:barrier', {
    kind: 'note',
    text: 'the lab kept dropping',
  }),
  // A real goal.
  legacyEnvelope('goal-1', 'goal', '2026-02-01T12:00:00.000Z', {
    statement: 'Pass the CCNA',
    category: 'career-work-learning',
    state: 'active',
    privacy: 'workplace',
  }),
  // A state this app has no word for.
  legacyEnvelope('goal-expired', 'goal', '2026-01-01T12:00:00.000Z', {
    statement: 'Finish the loft',
    category: 'home-and-environment',
    state: 'expired',
  }),
  // Section 59, three times over.
  legacyEnvelope('rec-1', 'recommendation', '2026-03-01T19:00:00.000Z', {
    statement: 'Ten minutes of subnetting',
  }),
  legacyEnvelope('forecast-1', 'untreated-forecast', '2026-03-01T19:00:00.000Z', {
    horizonDays: 100,
  }),
  legacyEnvelope('question-1', 'question', '2026-03-01T19:00:00.000Z', {
    prompt: 'How did you sleep?',
  }),
  // The most important-looking mapping in the registry, and the one that must
  // not be made. Forbidden, then restored — the chain matters.
  legacyEnvelope('stance-1', 'move-preference', '2026-02-10T12:00:00.000Z', {
    engineCandidateId: 'health:meditate',
    moveStatement: 'Sit quietly for ten minutes',
    stance: 'forbidden',
  }),
  legacyEnvelope('stance-2', 'move-preference', '2026-02-20T12:00:00.000Z', {
    engineCandidateId: 'health:meditate',
    moveStatement: 'Sit quietly for ten minutes',
    stance: 'restored',
  }),
  legacyEnvelope('stance-3', 'move-preference', '2026-02-11T12:00:00.000Z', {
    engineCandidateId: 'social:message-someone',
    moveStatement: 'Message someone you have not spoken to',
    stance: 'forbidden',
  }),
  // Real history with no home here. Archived and flagged.
  legacyEnvelope('context-change-1', 'life-context-change', '2026-02-15T12:00:00.000Z', {
    summary: 'Moved house',
    affectedCategories: ['home-and-environment'],
    effectiveFrom: '2026-02-15T12:00:00.000Z',
  }),
  // A family a later version of the old app invented.
  legacyEnvelope('mystery-1', 'something-new-entirely', '2026-03-05T12:00:00.000Z', {
    whatever: true,
  }),
]

let file: string
let opened: OpenedLegacyBackup
let plan: ImportPlan

beforeAll(async () => {
  file = await legacyBackupFile(ROWS, { passphrase: PASSPHRASE })
  const result = await openLegacyBackup(file, PASSPHRASE)
  if (!result.ok) throw new Error(`fixture would not open: ${result.refusal.problem}`)
  opened = result.backup
  plan = planImport(opened.rows, EMPTY_SNAPSHOT, {
    zone: ZONE,
    legacyFormat: legacyFormatLabel(opened),
  })
})

describe('a legacy backup is recognised before a passphrase is asked for', () => {
  it('says what it is, and that it needs one', () => {
    const detected = identify(file)
    expect(detected.ok).toBe(true)
    if (!detected.ok) return
    expect(detected.format).toBe('legacy-backup')
    expect(detected.needsPassphrase).toBe(true)
    expect(detected.envelope.approximateRecordCount).toBe(ROWS.length)
  })

  it('tells this app’s own backup apart from the old one’s', () => {
    // The two format markers differ by a single character. A person with both
    // in a folder needs to be sent to the right panel, not told his own backup
    // is not a backup.
    const ours = JSON.stringify({ format: 'life-command-os/backup', backupVersion: 1 })
    const detected = identify(ours)
    expect(detected.ok).toBe(false)
    if (detected.ok) return
    expect(detected.format).toBe('own-backup')
    expect(detected.problem).toMatch(/Restore/)
  })

  it('names the generation before the previous one rather than shrugging', () => {
    const ancestor = JSON.stringify({
      seed: {},
      theme: {},
      settings: { schemaVersion: 'v297-phase68.3' },
      azure: {},
      learning: {},
      money: {},
      days: {},
    })
    const detected = identify(ancestor)
    expect(detected.ok).toBe(false)
    if (detected.ok) return
    expect(detected.format).toBe('ancestor-export')
    expect(detected.problem).toMatch(/single-page app/)
  })
})

describe('what the file actually became', () => {
  it('read every row it was given', () => {
    expect(opened.rows).toHaveLength(ROWS.length)
    expect(plan.inventory.rows).toBe(ROWS.length)
    expect(plan.inventory.unreadable).toBe(0)
  })

  it('brought the readings whose meaning is the same in both models', () => {
    const energy = plan.toAppend.filter(
      (record) => record.kind === 'observation' && record.concept === CONCEPT.energy,
    )
    expect(energy).toHaveLength(2)
    expect(energy[0]).toMatchObject({
      kind: 'observation',
      value: { type: 'scale', value: 4, of: 5 },
      method: 'self-report',
      domains: [DOMAIN.health],
    })
  })

  it('kept a field a later version of the old app wrote', () => {
    const carried = plan.toAppend.find(
      (record) => record.provenance.note === 'old record obs-energy-2',
    )
    expect(carried?.unrecognized).toEqual({
      somethingNewerWrote: { note: 'from a later build' },
    })
  })

  it('brought a goal, with the owner’s own sentence as its subject', () => {
    const goal = plan.toAppend.find((record) => record.kind === 'goal')
    expect(goal).toMatchObject({ kind: 'goal', statement: 'Pass the CCNA', status: 'active' })
    if (goal?.kind !== 'goal') return
    const subject = plan.entities.find((entity) => entity.id === goal.goal.id)
    expect(subject?.label).toBe('Pass the CCNA')
    // The old class was `workplace`, which is not this app's `normal`.
    expect(goal.privacy).toBe('sensitive')
  })
})

describe('ambiguous mappings remain explicit — section 53’s gate', () => {
  const reasonFor = (refusal: string): string | undefined =>
    plan.inventory.refusals.find((entry) => entry.refusal === refusal)?.example

  it('declines four emotional scales rather than pouring them into one', () => {
    expect(reasonFor('attribute-declined')).toMatch(/four things/)
  })

  it('keeps “I could not say” as a report rather than as a reading', () => {
    expect(reasonFor('explicitly-unsure')).toMatch(/report, not a reading/)
  })

  it('separates an attribute nobody decided about from one that was declined', () => {
    // Both are unmapped. Only one had somebody look at it, and an owner's
    // confidence in the import depends on being able to tell which.
    expect(reasonFor('attribute-not-mapped')).toMatch(/career:barrier/)
    expect(reasonFor('attribute-declined')).not.toMatch(/career:barrier/)
  })

  it('has no word for an expired goal, and says so instead of choosing one', () => {
    expect(reasonFor('no-equivalent-state')).toMatch(/abandoned or paused/)
    const statements = plan.toAppend.flatMap((record) =>
      record.kind === 'goal' ? [record.statement] : [],
    )
    expect(statements).not.toContain('Finish the loft')
  })

  it('reports every family it saw, with a reason for each', () => {
    for (const family of plan.inventory.families) {
      expect(family.because.length, family.legacyType).toBeGreaterThan(20)
    }
    const seen = new Set(plan.inventory.families.map((family) => family.legacyType))
    expect(seen).toContain('recommendation')
    expect(seen).toContain('move-preference')
  })

  it('names a family this build has never heard of rather than filing it quietly', () => {
    expect(plan.inventory.unrecognisedFamilies).toEqual(['something-new-entirely'])
  })
})

describe('section 59 exclusions are counted and not written', () => {
  it('writes nothing at all for them', () => {
    expect(plan.excluded).toBe(3)
    const raw = plan.toAppend.flatMap((record) =>
      record.kind === 'imported-legacy-record' ? [record.raw] : [],
    )
    const types = raw.map((row) => (row as { recordType?: string }).recordType)
    expect(types).not.toContain('recommendation')
    expect(types).not.toContain('untreated-forecast')
    expect(types).not.toContain('question')
  })

  it('still says out loud that they were seen', () => {
    const excluded = plan.inventory.families.filter((family) => family.disposition === 'excluded')
    expect(excluded.map((family) => family.legacyType).sort()).toEqual([
      'question',
      'recommendation',
      'untreated-forecast',
    ])
  })
})

describe('a standing decision this import cannot keep is named, not lost', () => {
  it('lists only the stance that was still standing', () => {
    // `health:meditate` was forbidden and then restored. Handing that back
    // would give the owner a rule he had already cancelled.
    expect(plan.unkeptStances).toEqual([
      { stance: 'forbidden', move: 'Message someone you have not spoken to' },
    ])
  })

  it('creates no preference record that could never fire', () => {
    expect(plan.toAppend.some((record) => record.kind === 'preference')).toBe(false)
  })

  it('keeps the stances themselves, so nothing is destroyed by not being kept', () => {
    const archivedTypes = plan.toAppend.flatMap((record) =>
      record.kind === 'imported-legacy-record'
        ? [(record.raw as { recordType?: string }).recordType]
        : [],
    )
    expect(archivedTypes.filter((type) => type === 'move-preference')).toHaveLength(3)
  })
})

describe('imported raw legacy records cannot silently drive decisions', () => {
  /*
   * Two hours after the last energy reading in the file. Energy goes stale in
   * six by design, so a moment days later would resolve to `stale` and this
   * test would pass for the wrong reason — it would be proving that an import
   * answers nothing, which is exactly what it must not prove.
   */
  const viewOf = (snapshot: StoreSnapshot) =>
    buildView(snapshot, { now: Date.parse('2026-03-02T20:00:00Z') as never, zone: ZONE })

  it('the archived rows answer no concept, and the mapped ones answer their own', () => {
    const view = viewOf(snapshotWith(EMPTY_SNAPSHOT, plan))

    // The mapped energy readings do answer, because they are history.
    expect(valueIfUsable(view.facts.knowledgeFor(CONCEPT.energy))).toEqual({
      type: 'scale',
      value: 2,
      of: 5,
    })

    // Nothing archived reaches a concept. `state:mood` was in the file with a
    // perfectly good anchored scale on it, and no concept has been touched.
    expect(view.facts.knowledgeFor(CONCEPT.emotionalState).state).toBe('unknown')
    expect(view.facts.knowledgeFor(CONCEPT.socialEnergy).state).toBe('unknown')
    expect(view.facts.knowledgeFor(CONCEPT.cashBuffer).state).toBe('unknown')
  })

  it('every imported record says it was imported, wherever it surfaces', () => {
    for (const record of plan.toAppend) {
      expect(record.provenance.source, record.id).toBe('legacy-import')
      expect(evidenceSourceOf(record), record.id).toBe('legacy-import')
    }
  })

  it('stamps which rules were in force, so a later revision is tellable apart', () => {
    for (const record of plan.toAppend) {
      expect(record.provenance.writtenBy).toMatch(/^legacy-map-/)
    }
  })
})

describe('the same file twice changes nothing the second time', () => {
  it('recognises its own work exactly rather than by resemblance', () => {
    const after = snapshotWith(EMPTY_SNAPSHOT, plan)
    const again = planImport(opened.rows, after, {
      zone: ZONE,
      legacyFormat: legacyFormatLabel(opened),
    })

    expect(again.toAppend).toHaveLength(0)
    expect(again.alreadyPresent).toBe(plan.toAppend.length)
    expect(again.conflicts).toEqual([])

    /*
     * And it registers as a no-op, which is a separate claim from having
     * nothing to append.
     *
     * `entities` used to be collected without checking the store, so a second
     * pass over an already-imported file produced an empty `toAppend` and a
     * full list of subjects — and the screen, reading only the second, offered
     * to bring across a file it had just reported as entirely already here.
     * Pressing it would have rewritten the whole store to change nothing.
     */
    expect(again.entities).toHaveLength(0)
    expect(importChangesNothing(again)).toBe(true)
  })

  it('is idempotent through the store, not only through the plan', async () => {
    const store = createMemoryStore()
    const first = await applyImport(store, EMPTY_SNAPSHOT, plan)
    expect(first.outcome.ok).toBe(true)
    expect(first.added).toBe(plan.toAppend.length)

    const current = await store.snapshot()
    const second = planImport(opened.rows, current, {
      zone: ZONE,
      legacyFormat: legacyFormatLabel(opened),
    })
    const applied = await applyImport(store, current, second)
    expect(applied.added).toBe(0)
    expect((await store.snapshot()).records).toHaveLength(current.records.length)
  })

  it('refuses to rewrite a record it already wrote, if the file has changed', async () => {
    const edited = ROWS.map((row) =>
      row['recordId'] === 'obs-energy-1'
        ? { ...row, value: anchoredScale('energy', 1, 'Drained') }
        : row,
    )
    const tampered = await legacyBackupFile(edited, { passphrase: PASSPHRASE })
    const reopened = await openLegacyBackup(tampered, PASSPHRASE)
    expect(reopened.ok).toBe(true)
    if (!reopened.ok) return

    const after = snapshotWith(EMPTY_SNAPSHOT, plan)
    const conflicting = planImport(reopened.backup.rows, after, {
      zone: ZONE,
      legacyFormat: legacyFormatLabel(reopened.backup),
    })

    // History is append-first. An import may add to it and may not rewrite it.
    expect(conflicting.conflicts).toHaveLength(1)
    expect(conflicting.conflicts[0]?.legacyType).toBe('observation')
    expect(conflicting.toAppend).toHaveLength(0)
  })
})

describe('nothing is added when the write cannot be verified', () => {
  it('puts the history back and says the import did not happen', async () => {
    const store = createMemoryStore()
    const before = await store.snapshot()

    // A store whose write silently loses the last record — the shape of every
    // partial-write failure, and the one a count-only verification would pass.
    const lossy = {
      ...store,
      replaceAll: async (snapshot: StoreSnapshot) =>
        store.replaceAll({ ...snapshot, records: snapshot.records.slice(0, -1) }),
    }

    const result = await applyImport(lossy, before, plan)
    expect(result.outcome.ok).toBe(false)
    expect(result.added).toBe(0)
    if (result.outcome.ok) return
    expect(result.outcome.stage).toBe('verify')
    expect(result.outcome.rolledBack).toBe(true)
    expect(result.outcome.rollbackVerified).toBe(true)
  })
})
