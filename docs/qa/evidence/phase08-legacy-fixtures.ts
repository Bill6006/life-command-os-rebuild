import { legacyBackupFile } from '../../../tests/contract/legacyFixture'

const passphrase = 'phase-eight-independent-qa'

const envelope = (
  recordId: string,
  recordType: string,
  occurredAt: string,
  extra: Record<string, unknown>,
) => ({
  recordId,
  recordType,
  schemaVersion: 1,
  occurredAt,
  recordedAt: occurredAt,
  localTime: {
    localIso: occurredAt,
    timeZone: 'America/New_York',
    utcOffsetMinutes: -240,
  },
  source: 'user-entry',
  provenance: { method: 'direct-report' },
  ...extra,
})

const records: Record<string, unknown>[] = [
  envelope('qa8-energy', 'observation', '2026-08-24T12:30:00.000Z', {
    privacy: 'general',
    category: 'time-attention-capacity',
    attribute: 'state:energy',
    value: { kind: 'anchored-scale', scaleId: 'energy', ordinal: 1, label: 'Empty' },
  }),
  envelope('qa8-sleep', 'observation', '2026-08-24T12:20:00.000Z', {
    privacy: 'general',
    category: 'health-recovery-energy',
    attribute: 'state:sleep-recovery',
    value: { kind: 'anchored-scale', scaleId: 'sleep-recovery', ordinal: 1, label: 'Very poor' },
  }),
  envelope('qa8-mood', 'observation', '2026-08-23T16:00:00.000Z', {
    privacy: 'private-pattern',
    category: 'emotional-and-relationships',
    attribute: 'state:mood',
    value: { kind: 'anchored-scale', scaleId: 'mood', ordinal: 2, label: 'Low' },
  }),
  envelope('qa8-goal', 'goal', '2026-06-01T13:00:00.000Z', {
    privacy: 'workplace',
    category: 'career-work-learning',
    statement: 'Finish a meaningful certification',
    state: 'active',
  }),
  envelope('qa8-recommendation', 'recommendation', '2026-08-22T15:00:00.000Z', {
    privacy: 'general',
    source: 'system',
    provenance: { method: 'derived' },
    statement: 'Ignore this old suggestion',
  }),
  envelope('qa8-veto', 'move-preference', '2026-07-01T15:00:00.000Z', {
    privacy: 'general',
    engineCandidateId: 'social:message-someone',
    moveStatement: 'Message someone you have not spoken to',
    stance: 'forbidden',
  }),
  envelope('qa8-context', 'life-context-change', '2025-09-01T15:00:00.000Z', {
    privacy: 'general',
    statement: 'Moved house',
  }),
  envelope('qa8-skill', 'skill-claim', '2025-10-01T15:00:00.000Z', {
    privacy: 'child',
    statement: 'Can stay calm during homework',
  }),
  envelope('qa8-faith', 'faith-anchor', '2025-11-01T15:00:00.000Z', {
    statement: 'Keep faith central',
  }),
  envelope('qa8-future-family', 'brand-new-family', '2025-12-01T15:00:00.000Z', {
    privacy: 'general',
    unexpected: 'kept raw',
  }),
]

const altered = records.map((record) =>
  record.recordId === 'qa8-energy'
    ? {
        ...record,
        value: { kind: 'anchored-scale', scaleId: 'energy', ordinal: 5, label: 'Plenty' },
      }
    : record,
)

const rawOnlyRecords = [
  envelope('qa8-raw-energy-trap', 'brand-new-family', '2026-08-24T12:40:00.000Z', {
    privacy: 'general',
    category: 'health-recovery-energy',
    attribute: 'state:energy',
    value: { kind: 'anchored-scale', scaleId: 'energy', ordinal: 1, label: 'Empty' },
  }),
  envelope('qa8-raw-sleep-trap', 'inferred-state', '2026-08-24T12:41:00.000Z', {
    privacy: 'general',
    category: 'health-recovery-energy',
    attribute: 'state:sleep-recovery',
    value: { kind: 'anchored-scale', scaleId: 'sleep-recovery', ordinal: 1, label: 'Very poor' },
  }),
]

const [primary, changedSameIds, rawOnly] = await Promise.all([
  legacyBackupFile(records, { passphrase, createdAt: '2026-08-24T12:35:00.000Z' }),
  legacyBackupFile(altered, { passphrase, createdAt: '2026-08-24T12:36:00.000Z' }),
  legacyBackupFile(rawOnlyRecords, { passphrase, createdAt: '2026-08-24T12:40:00.000Z' }),
])

process.stdout.write(JSON.stringify({ passphrase, primary, changedSameIds, rawOnly }))
