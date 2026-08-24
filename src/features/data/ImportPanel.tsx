import { useCallback, useState } from 'react'
import { Panel, Row, Rows } from '../../components/ui'
import { countOf } from '../../domain/counts'
import type { TimeZoneId } from '../../domain/time'
import {
  identify,
  importChangesNothing,
  importRestorePlan,
  legacyFormatLabel,
  openLegacyBackup,
  planImport,
  previewOf,
  type Detection,
  type ImportPlan,
  type LegacyPreview,
  type MapRefusal,
  type OpenRefusal,
} from '../../legacy'
import type { RestoreOutcome } from '../../memory/restore'
import { useMemory } from '../memory/memoryContext'
import { readFile } from './transfer'

/**
 * Bringing the old app's history across (canonical plan sections 30 and 53).
 *
 * ## Four presses, and the third one is the point
 *
 * Choose a file, say what it is; type the passphrase, read it; look at what it
 * would do; bring it across. The third press is where the whole phase lives.
 * Phase 7's restore replaced the owner's records with a copy of his records —
 * if that went wrong he could see it had. This adds rows that **claim to mean
 * what old rows meant**, and a wrong claim is indistinguishable afterwards from
 * something he wrote himself. So nothing is written until he has seen, in
 * ordinary words: what came across, what was kept but not interpreted, what is
 * deliberately not coming and why, and what he will have to say again himself.
 *
 * ## The passphrase
 *
 * It is asked for because there is no other door. The old application has one
 * complete data-out path and it is encrypted with no plaintext branch, and the
 * old application may not be modified to add one. It is held in this component
 * only, for the length of one read, and is never stored, never logged, never
 * put in an export and never carried into a record.
 */

type Stage =
  | { readonly kind: 'idle' }
  | { readonly kind: 'identified'; readonly detection: Detection }
  | { readonly kind: 'refused'; readonly refusal: OpenRefusal }
  | { readonly kind: 'planned'; readonly plan: ImportPlan; readonly preview: LegacyPreview }

const REFUSAL_LABELS: Record<MapRefusal, string> = {
  'attribute-not-mapped': 'No rule covers what it recorded',
  'attribute-declined': 'Deliberately not brought across',
  'explicitly-unsure': 'You said you could not tell',
  'value-shape': 'Recorded as something this app cannot hold',
  'missing-required': 'Missing something this app needs',
  'no-equivalent-state': 'No word here for what it says',
  'no-timestamp': 'No date to place it on',
}

function momentIn(iso: string, zone: TimeZoneId): string {
  const at = Date.parse(iso)
  if (Number.isNaN(at)) return iso
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: zone,
  }).format(at)
}

export function ImportPanel() {
  const memory = useMemory()
  const [text, setText] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [stage, setStage] = useState<Stage>({ kind: 'idle' })
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<RestoreOutcome | undefined>(undefined)
  const [added, setAdded] = useState(0)

  const reset = useCallback(() => {
    setStage({ kind: 'idle' })
    setOutcome(undefined)
    setAdded(0)
  }, [])

  const look = useCallback(
    (candidate: string) => {
      reset()
      if (candidate.trim() === '') return
      setStage({ kind: 'identified', detection: identify(candidate) })
    },
    [reset],
  )

  const read = useCallback(async () => {
    /*
     * The envelope comes from the stage rather than from re-reading the text.
     *
     * This button only exists once a file has been identified, so the envelope
     * that was recognised is already here — and using it means the preview
     * describes the file that was actually read. Re-parsing would be a second
     * copy of one fact, which is how a preview ends up describing a different
     * file from the one it is a preview of, and would need a throw for a case
     * that cannot happen.
     */
    if (stage.kind !== 'identified' || !stage.detection.ok) return
    const preview = previewOf(stage.detection.envelope)

    setBusy(true)
    setOutcome(undefined)
    try {
      const opened = await openLegacyBackup(text, passphrase)
      if (!opened.ok) {
        setStage({ kind: 'refused', refusal: opened.refusal })
        return
      }
      const current = await memory.ownerSnapshot()
      const plan = planImport(opened.backup.rows, current, {
        zone: memory.ownerMoment().zone,
        legacyFormat: legacyFormatLabel(opened.backup),
      })
      setStage({ kind: 'planned', plan, preview })
    } finally {
      // Held for one read and no longer. Nothing else on this screen, and
      // nothing in any record it writes, ever sees it again.
      setPassphrase('')
      setBusy(false)
    }
  }, [memory, passphrase, stage, text])

  const bring = useCallback(async () => {
    if (stage.kind !== 'planned') return
    setBusy(true)
    try {
      const current = await memory.ownerSnapshot()
      /*
       * Straight to the provider's restore path, which is the same transaction
       * a backup goes through: the owner's store and no other, published with
       * the clock, reopened afterwards and read back. Building a second write
       * path for imports would have meant a second copy of the most carefully
       * argued code here, differing at first only in its error messages.
       */
      const result = await memory.restoreOwner(importRestorePlan(current, stage.plan))
      setAdded(result.ok ? stage.plan.toAppend.length : 0)
      setOutcome(result)
    } finally {
      setBusy(false)
    }
  }, [memory, stage])

  const nothingToDo = stage.kind === 'planned' && importChangesNothing(stage.plan)

  return (
    <Panel title="Bring the old app’s history across">
      <p>
        A backup from the previous version of this app can be read here. Its entries are translated
        where this app means the same thing by them, kept exactly as written where it does not, and
        left out entirely where you decided against the idea.
      </p>
      <p className="note">
        The old app only ever wrote encrypted backups, so this needs the passphrase you used when
        you made the file. It is used once, to open the file, and is not kept.
      </p>

      {memory.canRestore ? null : (
        <p className="data-warning" data-testid="import-blocked">
          A test history is on screen. Press <strong>Show mine</strong> at the top of the app first
          — this writes into your own history, and which history is being written to should never be
          in doubt.
        </p>
      )}

      <label className="data-field">
        <span>Choose an old backup file</span>
        <input
          type="file"
          accept="application/json,.json"
          data-testid="import-file"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file === undefined) return
            void (async () => {
              const read = await readFile(file)
              if ('problem' in read) {
                setStage({
                  kind: 'refused',
                  refusal: {
                    stage: 'detect',
                    problem: 'That file could not be read from this device.',
                    detail: read.problem,
                  },
                })
                return
              }
              setText(read.text)
              look(read.text)
            })()
          }}
        />
      </label>

      <label className="data-field">
        <span>Or paste one</span>
        <textarea
          className="data-text data-text--input"
          data-testid="import-paste"
          spellCheck={false}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            reset()
          }}
        />
      </label>

      <div className="data-actions">
        <button
          type="button"
          data-testid="import-identify"
          disabled={text.trim().length === 0}
          onClick={() => look(text)}
        >
          What is this file?
        </button>
      </div>

      {stage.kind === 'identified' && !stage.detection.ok ? (
        <div className="data-refusal" data-testid="import-refusal">
          <p className="data-warning">{stage.detection.problem}</p>
          <p className="note">Nothing was changed.</p>
          {stage.detection.detail === undefined ? null : (
            <details className="data-detail">
              <summary>What exactly it is</summary>
              <pre>{stage.detection.detail}</pre>
            </details>
          )}
        </div>
      ) : null}

      {stage.kind === 'refused' ? (
        <div className="data-refusal" data-testid="import-refusal">
          <p className="data-warning">{stage.refusal.problem}</p>
          <p className="note">Nothing was changed.</p>
          {stage.refusal.detail === undefined ? null : (
            <details className="data-detail">
              <summary>What exactly is wrong</summary>
              <pre>{stage.refusal.detail}</pre>
            </details>
          )}
        </div>
      ) : null}

      {stage.kind === 'identified' && stage.detection.ok ? (
        <div data-testid="import-recognised">
          <p className="data-ok">
            That is a backup from the old app, made{' '}
            {momentIn(stage.detection.envelope.createdAt, memory.zone)}.
          </p>
          <Rows>
            <Row
              label="Entries it says it holds"
              value={String(stage.detection.envelope.approximateRecordCount)}
            />
            <Row
              label="Encryption"
              value={`${stage.detection.envelope.crypto.cipher}-${String(stage.detection.envelope.crypto.keyBits)}`}
              mono
            />
          </Rows>

          <label className="data-field">
            <span>The passphrase for that backup</span>
            <input
              type="password"
              autoComplete="off"
              data-testid="import-passphrase"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
            />
          </label>

          <div className="data-actions">
            <button
              type="button"
              data-testid="import-read"
              disabled={busy || passphrase.length === 0}
              onClick={() => void read()}
            >
              Read this backup
            </button>
          </div>
        </div>
      ) : null}

      {stage.kind === 'planned' ? <ImportReport plan={stage.plan} preview={stage.preview} /> : null}

      {stage.kind === 'planned' && outcome === undefined ? (
        <div className="data-actions">
          <button
            type="button"
            data-testid="import-apply"
            disabled={busy || !memory.canRestore || nothingToDo}
            onClick={() => void bring()}
          >
            {nothingToDo ? 'Nothing left to bring across' : 'Bring it across'}
          </button>
        </div>
      ) : null}

      {outcome === undefined ? null : (
        <div className="data-outcome" data-testid="import-outcome">
          {outcome.ok ? (
            <>
              <p className="data-ok">
                Brought {countOf(added, 'entry', 'entries')} across, and read them back to check.
              </p>
              <p className="note">
                They are in your history now, dated when they happened rather than today.
              </p>
            </>
          ) : (
            <>
              <p className="data-warning">{outcome.problem}</p>
              <p className="note">
                {outcome.applied && !outcome.rolledBack
                  ? 'The entries were written and checked once, and nothing was undone. Look before importing anything else.'
                  : outcome.rollbackVerified
                    ? 'Nothing was added, and your history is exactly as it was.'
                    : 'Putting your history back did not complete. Look before doing anything else.'}
              </p>
              {outcome.detail === undefined ? null : (
                <details className="data-detail">
                  <summary>What exactly happened</summary>
                  <pre>{outcome.detail}</pre>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </Panel>
  )
}

function ImportReport({ plan, preview }: { plan: ImportPlan; preview: LegacyPreview }) {
  const mapped = plan.toAppend.length - plan.archived
  const brought = plan.toAppend.length

  return (
    <div className="data-plan" data-testid="import-report">
      <h3>What this would do</h3>
      <Rows>
        <Row label="Entries in the file" value={String(plan.inventory.rows)} />
        <Row label="Brought across as your history" value={String(Math.max(mapped, 0))} />
        <Row label="Kept exactly as written, not interpreted" value={String(plan.archived)} />
        <Row label="Left out on purpose" value={String(plan.excluded)} />
        {plan.alreadyPresent === 0 ? null : (
          <Row label="Already here from an earlier run" value={String(plan.alreadyPresent)} />
        )}
        {plan.inventory.unreadable === 0 ? null : (
          <Row
            label="Rows that could not be read at all"
            value={String(plan.inventory.unreadable)}
          />
        )}
        <Row
          label="Covering"
          value={
            plan.inventory.firstDay === undefined
              ? 'nothing new'
              : `${plan.inventory.firstDay} to ${plan.inventory.lastDay ?? plan.inventory.firstDay}`
          }
        />
        <Row label="Made with" value={`${preview.kdf}, ${preview.cipher}`} mono />
      </Rows>

      {plan.conflicts.length === 0 ? null : (
        <p className="data-warning" data-testid="import-conflicts">
          {countOf(plan.conflicts.length, 'entry', 'entries')} in that file{' '}
          {plan.conflicts.length === 1 ? 'has' : 'have'} already been brought across once and now
          say something different. Your history is not rewritten by an import, so those are left
          exactly as they are.
        </p>
      )}

      {plan.unkeptStances.length === 0 ? null : (
        <div data-testid="import-unkept">
          <h4>Things you will have to say again</h4>
          <p>
            You told the old app never to suggest these. That instruction is kept in your history,
            but it cannot be carried over as a live rule — it names moves by the old app’s own
            identifiers, and nothing here would ever match them.
          </p>
          <ul>
            {plan.unkeptStances.map((stance) => (
              <li key={stance.move}>{stance.move}</li>
            ))}
          </ul>
        </div>
      )}

      {plan.undecided === 0 ? null : (
        <p className="note" data-testid="import-undecided">
          {countOf(plan.undecided, 'entry', 'entries')} {plan.undecided === 1 ? 'is' : 'are'} real
          history with no home in this app yet. {plan.undecided === 1 ? 'It is' : 'They are'} kept
          exactly as written until you decide what {plan.undecided === 1 ? 'it' : 'they'} should
          mean here.
        </p>
      )}

      {plan.inventory.refusals.length === 0 ? null : (
        <details className="data-detail" data-testid="import-refusal-detail">
          <summary>Why some entries were kept rather than translated</summary>
          <ul>
            {plan.inventory.refusals.map((entry) => (
              <li key={entry.refusal}>
                <strong>{REFUSAL_LABELS[entry.refusal]}</strong> —{' '}
                {countOf(entry.rows, 'entry', 'entries')}. {entry.example}
              </li>
            ))}
          </ul>
        </details>
      )}

      <details className="data-detail" data-testid="import-families">
        <summary>Every kind of entry in that file, and what became of it</summary>
        <ul>
          {plan.inventory.families.map((family) => (
            <li key={family.legacyType}>
              <strong>{family.legacyType}</strong> — {countOf(family.rows, 'entry', 'entries')},{' '}
              {family.disposition === 'map'
                ? 'translated where the meaning is the same'
                : family.disposition === 'excluded'
                  ? 'left out on purpose'
                  : family.disposition === 'undecided'
                    ? 'kept, and waiting on your decision'
                    : 'kept exactly as written'}
              . {family.because}
            </li>
          ))}
        </ul>
        {plan.inventory.unrecognisedFamilies.length === 0 ? null : (
          <p className="note">
            This build has no rule for {plan.inventory.unrecognisedFamilies.join(', ')}, so{' '}
            {plan.inventory.unrecognisedFamilies.length === 1 ? 'it is' : 'they are'} kept exactly
            as written.
          </p>
        )}
      </details>

      <p className="note">
        Nothing has been written yet. {brought === 0 ? 'There is nothing new to write.' : ''}
      </p>
    </div>
  )
}
