import { describe, expect, it } from 'vitest'
import { timeZone } from '../../src/domain/time'
import { identify, openLegacyBackup, planImport } from '../../src/legacy'
import { authenticatedMetadata, decryptLegacyPayload } from '../../src/legacy/crypto'
import { EMPTY_SNAPSHOT } from '../../src/memory/store'
import {
  anchoredScale,
  legacyBackupFile,
  legacyEnvelope,
  legacyObservation,
  REAL_ITERATIONS,
} from '../contract/legacyFixture'

/**
 * Files that are wrong, damaged, or actively lying (canonical plan sections 26
 * and 30).
 *
 * An importer is the widest hole in an app that otherwise only reads what it
 * wrote itself. Everything here is a file that would be handed to it in the
 * ordinary course of a bad afternoon — a truncated download, the wrong
 * passphrase, a file someone edited to see what would happen — and the rule for
 * every one of them is the same: refuse with a reason, and write nothing.
 */

const ZONE = timeZone('America/Denver')
const PASSPHRASE = 'correct horse'

const ROW = legacyObservation(
  'obs-1',
  '2026-03-01T18:00:00.000Z',
  'state:energy',
  anchoredScale('energy', 4, 'Good'),
)

describe('the real parameters, end to end', () => {
  it('opens a file encrypted at the six hundred thousand iterations the old app used', async () => {
    /*
     * Every other test here uses a cheap iteration count, because the number is
     * stored in the file and the reader honours whatever it finds. This one
     * does not, and is the only test that proves the reader against the
     * parameter set the owner's actual backups carry. A reader checked only
     * against cheap files is a reader nobody has checked.
     */
    const file = await legacyBackupFile([ROW], {
      passphrase: PASSPHRASE,
      iterations: REAL_ITERATIONS,
    })
    const opened = await openLegacyBackup(file, PASSPHRASE)
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    expect(opened.backup.rows).toHaveLength(1)
    // The `30_000` here is gone for the same reason as `block-sweep`'s —
    // DEF-0169. It was six times the old default and is a quarter of the new
    // one, and a real key derivation at the owner's own iteration count is
    // exactly the shape that should inherit the longer ceiling rather than
    // opt out of it.
  })
})

describe('a file that will not open', () => {
  it('refuses the wrong passphrase without saying how wrong', async () => {
    const file = await legacyBackupFile([ROW], { passphrase: PASSPHRASE })
    const opened = await openLegacyBackup(file, 'correct hors')
    expect(opened.ok).toBe(false)
    if (opened.ok) return
    expect(opened.refusal.stage).toBe('decrypt')
    expect(opened.refusal.problem).toMatch(/Nothing has been changed/)
    // One failure for two causes, deliberately: a message that distinguished a
    // near-miss from a damaged file would say when a guess had got close.
    expect(opened.refusal.problem).toMatch(/did not work, or the file has been altered/)
  })

  it('refuses a truncated download', async () => {
    const file = await legacyBackupFile([ROW], { passphrase: PASSPHRASE })
    const opened = await openLegacyBackup(file.slice(0, Math.floor(file.length / 2)), PASSPHRASE)
    expect(opened.ok).toBe(false)
    if (opened.ok) return
    expect(opened.refusal.stage).toBe('detect')
  })

  it('refuses a file whose ciphertext has been edited', async () => {
    const file = await legacyBackupFile([ROW], { passphrase: PASSPHRASE })
    const parsed = JSON.parse(file) as Record<string, unknown>
    const cipher = parsed['ciphertextBase64'] as string
    parsed['ciphertextBase64'] = `${cipher.slice(0, -8)}AAAAAAAA`
    const opened = await openLegacyBackup(JSON.stringify(parsed), PASSPHRASE)
    expect(opened.ok).toBe(false)
    if (opened.ok) return
    expect(opened.refusal.stage).toBe('decrypt')
  })

  it('refuses a file weakened by editing its iteration count', async () => {
    /*
     * The crypto parameters are additional authenticated data, not merely
     * metadata. Somebody rewriting 600,000 to 1 does not get a cheaper key —
     * they get a file that will not authenticate, because the number they
     * changed is covered by the tag.
     */
    const file = await legacyBackupFile([ROW], {
      passphrase: PASSPHRASE,
      iterations: 4_000,
    })
    const parsed = JSON.parse(file) as { crypto: Record<string, unknown> }
    parsed.crypto['iterations'] = 1
    const opened = await openLegacyBackup(JSON.stringify(parsed), PASSPHRASE)
    expect(opened.ok).toBe(false)
    if (opened.ok) return
    expect(opened.refusal.stage).toBe('decrypt')
  })

  it('refuses an unsupported cipher with a sentence about parameters', async () => {
    const file = await legacyBackupFile([ROW], { passphrase: PASSPHRASE })
    const parsed = JSON.parse(file) as { crypto: Record<string, unknown> }
    parsed.crypto['cipher'] = 'AES-CBC'
    const opened = await openLegacyBackup(JSON.stringify(parsed), PASSPHRASE)
    expect(opened.ok).toBe(false)
    if (opened.ok) return
    // Not a decryption failure, which would read as a wrong passphrase and send
    // the owner off to find a password that was never the problem.
    expect(opened.refusal.problem).toMatch(/encryption settings this build cannot use/)
    expect(opened.refusal.detail).toMatch(/AES-CBC/)
  })

  it('refuses a file that claims not to be encrypted', async () => {
    const file = await legacyBackupFile([ROW], {
      passphrase: PASSPHRASE,
      envelope: { encrypted: false },
    })
    const detected = identify(file)
    expect(detected.ok).toBe(false)
    if (detected.ok) return
    expect(detected.detail).toMatch(/encrypted flag/)
  })
})

describe('a file that opens and should not be believed', () => {
  it('refuses contents that do not match their own checksum', async () => {
    const file = await legacyBackupFile([ROW], {
      passphrase: PASSPHRASE,
      payload: { integrity: { algorithm: 'SHA-256', digest: '0'.repeat(64) } },
    })
    const opened = await openLegacyBackup(file, PASSPHRASE)
    expect(opened.ok).toBe(false)
    if (opened.ok) return
    expect(opened.refusal.stage).toBe('integrity')
    expect(opened.refusal.problem).toMatch(/damaged/)
  })

  it('refuses a count that disagrees with the contents', async () => {
    const file = await legacyBackupFile([ROW], {
      passphrase: PASSPHRASE,
      payload: { recordCount: 41 },
    })
    const opened = await openLegacyBackup(file, PASSPHRASE)
    expect(opened.ok).toBe(false)
    if (opened.ok) return
    expect(opened.refusal.stage).toBe('count')
  })

  it('refuses a payload written by a newer version than this build reads', async () => {
    const file = await legacyBackupFile([ROW], {
      passphrase: PASSPHRASE,
      payload: { payloadVersion: 9 },
    })
    const opened = await openLegacyBackup(file, PASSPHRASE)
    expect(opened.ok).toBe(false)
    if (opened.ok) return
    expect(opened.refusal.stage).toBe('payload')
  })
})

describe('a file that opens with rubbish inside it', () => {
  it('counts rows it cannot identify rather than dropping them', async () => {
    const file = await legacyBackupFile(
      [
        ROW,
        { notARecord: true } as unknown as Record<string, unknown>,
        { recordId: 'x' } as unknown as Record<string, unknown>,
      ],
      { passphrase: PASSPHRASE },
    )
    const opened = await openLegacyBackup(file, PASSPHRASE)
    expect(opened.ok).toBe(true)
    if (!opened.ok) return

    const plan = planImport(opened.backup.rows, EMPTY_SNAPSHOT, {
      zone: ZONE,
      legacyFormat: 'test',
    })
    expect(plan.inventory.rows).toBe(3)
    expect(plan.inventory.unreadable).toBe(2)
    // The one good row still came across. A bad neighbour is not a reason to
    // refuse somebody their history.
    expect(plan.toAppend).toHaveLength(1)
  })

  it('will not place a row that carries no readable date', async () => {
    const undated = legacyEnvelope('undated-1', 'observation', '2026-03-01T18:00:00.000Z', {
      attribute: 'state:energy',
      value: anchoredScale('energy', 3, 'Functional'),
    })
    delete undated['occurredAt']
    delete undated['recordedAt']

    const file = await legacyBackupFile([undated], { passphrase: PASSPHRASE })
    const opened = await openLegacyBackup(file, PASSPHRASE)
    expect(opened.ok).toBe(true)
    if (!opened.ok) return

    const plan = planImport(opened.backup.rows, EMPTY_SNAPSHOT, {
      zone: ZONE,
      legacyFormat: 'test',
    })
    // Stamping it with the moment of the import would put a date on it that
    // nothing that happened ever had.
    expect(plan.toAppend).toHaveLength(0)
    expect(plan.inventory.refusals.map((entry) => entry.refusal)).toContain('no-timestamp')
  })

  it('survives a row whose timezone this runtime has never heard of', async () => {
    const row = legacyObservation(
      'obs-zone',
      '2026-03-01T18:00:00.000Z',
      'state:energy',
      anchoredScale('energy', 3, 'Functional'),
      {
        localTime: {
          localIso: '2026-03-01T11:00:00',
          timeZone: 'Mars/Olympus',
          utcOffsetMinutes: 0,
        },
      },
    )
    const file = await legacyBackupFile([row], { passphrase: PASSPHRASE })
    const opened = await openLegacyBackup(file, PASSPHRASE)
    expect(opened.ok).toBe(true)
    if (!opened.ok) return

    const plan = planImport(opened.backup.rows, EMPTY_SNAPSHOT, {
      zone: ZONE,
      legacyFormat: 'test',
    })
    expect(plan.toAppend).toHaveLength(1)
    expect(plan.toAppend[0]?.zone).toBe(ZONE)
  })

  it('does not let a legacy row name its own privacy down', async () => {
    /*
     * A file is not a trusted source of its own sensitivity. A row claiming a
     * class this build has never heard of gets the protective default, not the
     * permissive one — the direction of the failure is the whole point.
     */
    const row = legacyObservation(
      'obs-priv',
      '2026-03-01T18:00:00.000Z',
      'state:energy',
      anchoredScale('energy', 3, 'Functional'),
      { privacy: 'definitely-fine-to-share' },
    )
    const file = await legacyBackupFile([row], { passphrase: PASSPHRASE })
    const opened = await openLegacyBackup(file, PASSPHRASE)
    expect(opened.ok).toBe(true)
    if (!opened.ok) return

    const plan = planImport(opened.backup.rows, EMPTY_SNAPSHOT, {
      zone: ZONE,
      legacyFormat: 'test',
    })
    expect(plan.toAppend[0]?.privacy).toBe('sensitive')
  })
})

describe('the authenticated metadata is what the old app wrote', () => {
  it('is the eight fields, pipe-joined, in that order', () => {
    /*
     * Pinned deliberately, and it is the most destructive line in this
     * repository to change. Reordering these eight — even into something
     * tidier — makes every backup the owner has undecryptable, and the failure
     * would present as a wrong passphrase rather than as a code change.
     */
    const bytes = authenticatedMetadata({
      cryptoVersion: 1,
      kdf: 'PBKDF2',
      kdfHash: 'SHA-256',
      iterations: 600_000,
      cipher: 'AES-GCM',
      keyBits: 256,
      saltBase64: 'c2FsdA==',
      ivBase64: 'aXY=',
    })
    expect(new TextDecoder().decode(bytes)).toBe(
      '1|PBKDF2|SHA-256|600000|AES-GCM|256|c2FsdA==|aXY=',
    )
  })

  it('refuses a crypto version this build has never seen', async () => {
    const result = await decryptLegacyPayload(
      {
        cryptoVersion: 7,
        kdf: 'PBKDF2',
        kdfHash: 'SHA-256',
        iterations: 1000,
        cipher: 'AES-GCM',
        keyBits: 256,
        saltBase64: 'c2FsdA==',
        ivBase64: 'aXY=',
      },
      'AAAA',
      PASSPHRASE,
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.failure.kind).toBe('unsupported-crypto-version')
  })
})
