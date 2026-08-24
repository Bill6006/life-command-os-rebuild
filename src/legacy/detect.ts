import { isPlainObject } from '../domain/validation'
import { BACKUP_FORMAT } from '../memory/backup'
import { SNAPSHOT_FORMAT } from '../memory/snapshot'
import {
  ANCESTOR_MARKERS_REQUIRED,
  ANCESTOR_MARKER_KEYS,
  ANCESTOR_SCHEMA_FAMILY,
  LEGACY_BACKUP_VERSION,
  readLegacyEnvelope,
  type LegacyBackupEnvelope,
} from './format'

/**
 * Deciding what a file is before anyone commits to reading it (canonical plan
 * section 53 — "legacy detector").
 *
 * ## Read-only, and provably so
 *
 * Detection takes a string and returns a verdict. It has no store, no
 * passphrase and no way to reach either, so it is safe to point at a file
 * nobody is sure about — which is the only reason having a detector separate
 * from an importer is worth anything.
 *
 * ## Reasons, never booleans
 *
 * Every refusal names what was wrong. A boolean makes "this is the wrong file"
 * and "this is the right file, damaged" the same answer, and the owner's next
 * question is always *why not*, which a boolean cannot answer.
 *
 * ## Four verdicts, because four things actually turn up
 *
 * The owner has a folder with backups in it. What he picks will be one of:
 *
 *   - the previous generation's encrypted backup — the thing this phase exists
 *     to read;
 *   - **this app's own backup**, whose format marker differs from the legacy
 *     one by a single punctuation mark (`life-command-os/backup` against
 *     `life-command-os.backup`). Sending him away with "that is not a legacy
 *     export" would be true and useless: he has picked a real backup of his own
 *     life and the right answer is *Restore is the panel above*;
 *   - the generation before the previous one, the single-HTML application. This
 *     build does not import it, and that is a decision rather than an oversight
 *     — see the verdict's own note;
 *   - something else entirely.
 */

export type LegacyFormatId =
  'legacy-backup' | 'own-backup' | 'own-snapshot' | 'ancestor-export' | 'unrecognised'

export type Detection =
  | {
      readonly ok: true
      readonly format: 'legacy-backup'
      readonly envelope: LegacyBackupEnvelope
      /** Always true for this format. Stated rather than assumed — see below. */
      readonly needsPassphrase: boolean
    }
  | {
      readonly ok: false
      readonly format: Exclude<LegacyFormatId, 'legacy-backup'>
      /** One ordinary sentence. The owner reads this. */
      readonly problem: string
      /** The structural detail, behind inspection (section 36). */
      readonly detail: string | undefined
    }

function refuse(
  format: Exclude<LegacyFormatId, 'legacy-backup'>,
  problem: string,
  detail?: string,
): Detection {
  return { ok: false, format, problem, detail }
}

interface AncestorSignature {
  readonly found: readonly string[]
  readonly missing: readonly string[]
  readonly schemaFamilyMatches: boolean
}

function ancestorSignatureOf(root: Record<string, unknown>): AncestorSignature {
  const found = ANCESTOR_MARKER_KEYS.filter((key) => Object.hasOwn(root, key))
  const settings = root['settings']
  const version = isPlainObject(settings) ? settings['schemaVersion'] : undefined
  return {
    found,
    missing: ANCESTOR_MARKER_KEYS.filter((key) => !found.includes(key)),
    schemaFamilyMatches: typeof version === 'string' && version.startsWith(ANCESTOR_SCHEMA_FAMILY),
  }
}

export function detectLegacyFile(text: string): Detection {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    return refuse(
      'unrecognised',
      'That file is not readable as JSON, so nothing could be read from it.',
      error instanceof Error ? error.message : String(error),
    )
  }

  if (!isPlainObject(parsed)) {
    return refuse(
      'unrecognised',
      'A backup is expected to be a single JSON object, and this is not one.',
      Array.isArray(parsed) ? 'the document is an array' : `the document is ${typeof parsed}`,
    )
  }

  /*
   * This app's own artefacts first, and deliberately so.
   *
   * The two backup markers differ by one character, so whichever is checked
   * second is the one whose near-miss reads as an unrecognised file. Checking
   * ours first means the worst outcome of the collision is a correct answer
   * pointing at the wrong panel, rather than a wrong answer about a real backup.
   */
  if (parsed['format'] === BACKUP_FORMAT) {
    return refuse(
      'own-backup',
      'That is a backup of this app, not of the old one. Put it back with Restore, above.',
      `format "${BACKUP_FORMAT}" is this app's own backup; the old app wrote "life-command-os.backup"`,
    )
  }

  if (parsed['format'] === SNAPSHOT_FORMAT) {
    return refuse(
      'own-snapshot',
      'That is a history document from this app’s test laboratory, not an old backup.',
      `format "${SNAPSHOT_FORMAT}"`,
    )
  }

  const envelope = readLegacyEnvelope(parsed)
  if (envelope !== undefined) {
    if (envelope.formatVersion > LEGACY_BACKUP_VERSION) {
      return refuse(
        'unrecognised',
        'That backup was written in a newer format than this build knows how to read.',
        `formatVersion ${String(envelope.formatVersion)}; this build reads ${String(LEGACY_BACKUP_VERSION)}`,
      )
    }
    if (!envelope.encrypted) {
      /*
       * The old format has no unencrypted branch — its own schema pins the flag
       * to `true`. A file claiming otherwise has been edited, and an importer
       * that shrugged and looked for plaintext would be one that could be
       * talked into reading an attacker's records as the owner's.
       */
      return refuse(
        'unrecognised',
        'That file claims to be an old backup but says it is not encrypted, which that format never was.',
        'encrypted flag is not true',
      )
    }
    return { ok: true, format: 'legacy-backup', envelope, needsPassphrase: true }
  }

  /*
   * The generation before the previous one.
   *
   * Recognised and named, and **not imported**. Two reasons, and the first is
   * the one that matters: mapping it would mean a second complete set of claims
   * about a second data model, written by reading somebody else's reader for it
   * rather than the format itself. Section 30's critical rule is about exactly
   * that kind of enthusiasm.
   *
   * The second is that this history is very likely already inside a legacy
   * backup: the previous generation built its own importer for this format, and
   * anything brought across then is in its records now.
   *
   * Whether the owner wants it read directly anyway is his decision, not this
   * build's assumption, and the handoff asks him.
   */
  if (parsed['format'] === undefined) {
    const signature = ancestorSignatureOf(parsed)
    if (signature.schemaFamilyMatches && signature.found.length >= ANCESTOR_MARKERS_REQUIRED) {
      return refuse(
        'ancestor-export',
        'That is an export from the single-page app that came before the old one. This build does not read it — anything brought forward from it is already inside an old backup.',
        `schema family ${ANCESTOR_SCHEMA_FAMILY}, ${String(signature.found.length)} of ${String(ANCESTOR_MARKER_KEYS.length)} sections present`,
      )
    }
    if (signature.found.length > 0 || signature.schemaFamilyMatches) {
      return refuse(
        'unrecognised',
        'That file resembles an old export but not closely enough to be sure what it is.',
        `${String(signature.found.length)} of ${String(ANCESTOR_MARKER_KEYS.length)} expected sections${signature.missing.length > 0 ? ` (missing ${signature.missing.join(', ')})` : ''}, schema family ${signature.schemaFamilyMatches ? 'matches' : 'does not match'}`,
      )
    }
  }

  return refuse(
    'unrecognised',
    'That is not a backup from the old app.',
    typeof parsed['format'] === 'string'
      ? `format "${parsed['format']}" is not one this build recognises`
      : 'the document carries no format marker and no recognised structure',
  )
}
