import { useCallback, useEffect, useMemo, useState } from 'react'
import { Panel, Row, Rows, Screen } from '../../components/ui'
import { coreDomains } from '../../domain/domains'
import { countOf } from '../../domain/counts'
import { localDateTimeAt, type TimeZoneId } from '../../domain/time'
import { decide } from '../../intelligence/engine'
import { insightsFor } from '../../intelligence/insights'
import { assembleSituation } from '../../intelligence/situation'
import {
  backupFilename,
  backupFromJson,
  backupToJson,
  countsOf,
  type BackupLoad,
} from '../../memory/backup'
import { planRestore, type RestoreOutcome, type RestorePlan } from '../../memory/restore'
import type { StoreSnapshot } from '../../memory/store'
import { REBUILD_PHASE, runningBuild } from '../../platform/buildInfo'
import { composeExport, type ComposedExport } from '../export/compose'
import {
  EXPORT_SECTIONS,
  SELECT_ALL,
  orderSelection,
  type ExportSectionId,
} from '../export/sections'
import { useMemory } from '../memory/memoryContext'
import { assembleTimeline } from '../timeline/timelineEntries'
import { ImportPanel } from './ImportPanel'
import { readRemembered, writeRemembered } from './rememberedSelection'
import { copyText, downloadText, readFile } from './transfer'
import './DataScreen.css'
import { belongsToPrivateSection } from '../../domain/privacy'

/**
 * Data — exports, backup and restore (canonical plan sections 29 and 52).
 *
 * Three things live here and they are deliberately three, because they answer
 * three different questions and mixing them is how an owner ends up handing an
 * assistant his whole history or restoring a review document over his life.
 *
 * **An export** is a description, composed of chosen sections, meant to be
 * read. It is allowed to leave things out.
 *
 * **A backup** is the file his life comes back from. Nothing is chosen and
 * nothing is left out, the private domain included.
 *
 * **A restore** replaces everything he has with the contents of one of those
 * files, so it is the only thing on this screen that is not reversible by
 * doing it again — and it is built as three separate presses: choose a file,
 * check it, then apply it, with the whole preview between the second and the
 * third.
 *
 * **An import** is the fourth, and it is a different act again (section 30). A
 * restore puts back a copy of his own records; an import adds rows that claim
 * to mean what the previous generation's rows meant. It lives in its own panel
 * for that reason — the two are one press apart on one screen, and confusing
 * them would mean either replacing a life with an old one or adding a
 * translation of one to it.
 *
 * Everything produced here is also shown in a selectable field on the screen.
 * A copy can be refused and a download can be lost; a person reading text can
 * always get it out.
 */

const JSON_TYPE = 'application/json'
const TEXT_TYPE = 'text/markdown'

/**
 * A moment, in the owner's own terms.
 *
 * Not the ISO string. A backup's `createdAt` is an instant on the wire and
 * "2026-08-23T06:04:04.513Z" on a phone screen is developer vocabulary, which
 * section 36 puts behind inspection rather than on the surface. Read in the
 * zone the app is currently using rather than the browser's, so it agrees with
 * every other date on screen — including under time travel.
 */
function momentIn(iso: string, zone: TimeZoneId): string {
  const at = Date.parse(iso)
  if (Number.isNaN(at)) return iso
  const local = localDateTimeAt(at as Parameters<typeof localDateTimeAt>[0], zone)
  return `${local.dayId} at ${local.timeOfDay}`
}

/**
 * Enough of a fingerprint to tell two files apart, and no more.
 *
 * The whole digest is sixty-four characters and is what the refusal detail
 * prints when two of them actually have to be compared. On the preview the
 * owner's question is only "is this the same file as the other one", and a
 * short prefix answers it without filling a phone screen with hex.
 */
function shortFingerprint(value: string): string {
  return `${value.slice(0, 12)}…`
}

type Notice = { readonly tone: 'ok' | 'warn'; readonly text: string } | undefined

interface BackupState {
  readonly json: string
  readonly filename: string
  readonly counts: ReturnType<typeof countsOf>
  readonly takenAt: string
}

export function DataScreen() {
  const memory = useMemory()
  const { view, now, zone, weekStartsOn, source } = memory

  const [selection, setSelection] = useState<readonly ExportSectionId[]>(() => readRemembered())
  const [exportNotice, setExportNotice] = useState<Notice>(undefined)
  const [backup, setBackup] = useState<BackupState | undefined>(undefined)
  const [backupNotice, setBackupNotice] = useState<Notice>(undefined)
  const [candidate, setCandidate] = useState<string>('')
  const [checked, setChecked] = useState<BackupLoad | undefined>(undefined)
  const [plan, setPlan] = useState<RestorePlan | undefined>(undefined)
  const [outcome, setOutcome] = useState<RestoreOutcome | undefined>(undefined)

  useEffect(() => {
    writeRemembered(selection)
  }, [selection])

  const moment = useMemo(() => ({ now, zone, weekStartsOn }), [now, zone, weekStartsOn])

  /*
   * The same objects the owner's own screens render.
   *
   * Not a second reading of the history: `assembleSituation` is what Now
   * decided from, `insightsFor` is what Insights shows, `assembleTimeline` is
   * what Timeline shows. An export that computed its own would be a second
   * brain with no surface, and the first time it disagreed with Now nobody
   * would find out.
   */
  const composed: ComposedExport = useMemo(() => {
    const situation = assembleSituation(view, { ...moment, domains: coreDomains })
    return composeExport({
      sections: selection,
      situation,
      decision: decide(view, moment),
      insights: insightsFor(situation),
      timeline: assembleTimeline(situation),
      source,
      app: {
        commitShort: runningBuild.commitShort,
        commitSha: runningBuild.commitSha,
        target: runningBuild.target,
        buildTime: runningBuild.buildTime,
        phaseNumber: REBUILD_PHASE.number,
        phaseTitle: REBUILD_PHASE.title,
        phaseSummary: REBUILD_PHASE.summary,
      },
      // When this was composed is a fact about now, in his own zone — not
      // about the history being described (QA-07-005's class).
      composedAt: memory.ownerMoment(),
    })
  }, [view, moment, selection, source, memory])

  const toggle = (id: ExportSectionId) => {
    setExportNotice(undefined)
    setSelection((current) =>
      orderSelection(
        current.includes(id) ? current.filter((held) => held !== id) : [...current, id],
      ),
    )
  }

  const copy = async (text: string, what: string, set: (notice: Notice) => void) => {
    const done = await copyText(text)
    set(
      done
        ? { tone: 'ok', text: `${what} copied.` }
        : {
            tone: 'warn',
            text: `This browser would not let the app use the clipboard. The ${what.toLowerCase()} is in the field below — select it and copy it.`,
          },
    )
  }

  const takeBackup = useCallback(async () => {
    setBackupNotice(undefined)
    try {
      const snapshot: StoreSnapshot = await memory.ownerSnapshot()
      /*
       * His records, and his clock (QA-07-005).
       *
       * `now` and `zone` are what the screen is being read under, and a
       * loaded scenario sets both. Taking the records from the owner store
       * and the moment from the laboratory produced an August backup filed,
       * stamped and previewed as February — correct contents under a date
       * that would send him to the wrong file when it mattered.
       */
      const moment = memory.ownerMoment()
      const json = backupToJson(snapshot, {
        app: {
          commitSha: runningBuild.commitSha,
          commitShort: runningBuild.commitShort,
          branch: runningBuild.branch,
          target: runningBuild.target,
          buildTime: runningBuild.buildTime,
        },
        createdAt: moment.at,
      })
      setBackup({
        json,
        filename: backupFilename(moment.at, moment.zone, runningBuild.commitShort),
        counts: countsOf(snapshot),
        takenAt: momentIn(new Date(moment.at).toISOString(), moment.zone),
      })
    } catch (error) {
      setBackupNotice({
        tone: 'warn',
        text: `Your history could not be read, so nothing was written — ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }, [memory])

  const check = useCallback(
    async (text: string) => {
      setOutcome(undefined)
      const load = backupFromJson(text)
      setChecked(load)
      if (!load.ok) {
        setPlan(undefined)
        return
      }
      try {
        const current = await memory.ownerSnapshot()
        setPlan(planRestore(load.snapshot, load.summary, current))
      } catch {
        // The file is fine; this device's store is not. Say which.
        setPlan(undefined)
        setChecked({
          ok: false,
          refusal: {
            stage: 'structure',
            problem:
              'That backup reads correctly, but your current history could not be read, so there is nothing to compare it against.',
            detail: undefined,
          },
        })
      }
    },
    [memory],
  )

  const apply = useCallback(async () => {
    if (plan === undefined) return
    setOutcome(await memory.restoreOwner(plan))
  }, [memory, plan])

  const privateSelected = selection.includes('private')

  return (
    <Screen
      title="Data"
      lede="Compose a review to hand to an assistant, take a backup of everything, put one back, or bring the old app’s history across."
    >
      {source === 'laboratory' ? (
        <p className="data-warning" data-testid="data-laboratory-notice">
          A test history is on screen, so an export composed now describes that and says so. A
          backup still takes your own records, and restoring and importing are unavailable until you
          put the test history away.
        </p>
      ) : null}

      <Panel title="Review export">
        <p>
          Choose what goes in. The document begins with a prompt for whichever assistant reads it,
          so the whole thing can be pasted in one go.
        </p>

        <ul className="data-sections">
          {EXPORT_SECTIONS.map((section) => {
            const on = selection.includes(section.id)
            return (
              <li key={section.id}>
                <label
                  className={
                    belongsToPrivateSection(section.privacy)
                      ? 'data-section data-section--private'
                      : 'data-section'
                  }
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(section.id)}
                    data-testid={`section-${section.id}`}
                  />
                  <span className="data-section__text">
                    <span className="data-section__title">{section.title}</span>
                    <span className="data-section__summary">{section.summary}</span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>

        <div className="data-actions">
          <button
            type="button"
            onClick={() => {
              setExportNotice(undefined)
              // Select all deliberately does not reach the private section.
              setSelection(
                orderSelection([...SELECT_ALL, ...(privateSelected ? ['private' as const] : [])]),
              )
            }}
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => {
              setExportNotice(undefined)
              setSelection([])
            }}
          >
            Clear
          </button>
        </div>

        <p
          className={privateSelected ? 'data-private data-private--on' : 'data-private'}
          data-testid="private-state"
        >
          {privateSelected
            ? 'Private / Sexual Health is included in this export.'
            : 'Private / Sexual Health is left out of this export.'}
        </p>

        <Rows>
          <Row
            label="App build"
            value={`${runningBuild.commitShort} · ${runningBuild.target}`}
            mono
          />
          <Row
            label="Record covers"
            value={
              composed.header.firstDay === undefined
                ? 'nothing recorded'
                : `${composed.header.firstDay} to ${composed.header.lastDay}, ${countOf(composed.header.records, 'entry', 'entries')}`
            }
          />
          <Row
            label="Life areas in it"
            value={
              composed.header.domains.length === 0
                ? 'none'
                : composed.header.domains.map((id) => coreDomains.labelFor(id)).join(', ')
            }
          />
          <Row
            label="Sections chosen"
            value={selection.length === 0 ? 'none' : String(selection.length)}
          />
        </Rows>

        <div className="data-actions">
          <button
            type="button"
            onClick={() => void copy(composed.text, 'The export', setExportNotice)}
          >
            Copy the export
          </button>
          <button
            type="button"
            onClick={() => void copy(composed.prompt, 'The prompt', setExportNotice)}
          >
            Copy the prompt
          </button>
          <button
            type="button"
            onClick={() =>
              setExportNotice(
                downloadText(
                  composed.text,
                  `life-command-os-review-${composed.header.composedAt}.md`,
                  TEXT_TYPE,
                )
                  ? { tone: 'ok', text: 'The export was saved as a file.' }
                  : {
                      tone: 'warn',
                      text: 'This browser would not save the file. The export is in the field below.',
                    },
              )
            }
          >
            Save as a file
          </button>
        </div>

        {exportNotice === undefined ? null : (
          <p
            className={exportNotice.tone === 'ok' ? 'data-ok' : 'data-warning'}
            data-testid="export-notice"
          >
            {exportNotice.text}
          </p>
        )}

        <textarea
          className="data-text"
          aria-label="The export"
          data-testid="export-text"
          readOnly
          spellCheck={false}
          value={composed.text}
        />
      </Panel>

      <Panel title="Backup">
        <p>
          Everything, exactly as it is kept — every entry, the private area included, and any row
          the app could not read. This is the file your history comes back from, so nothing is left
          out of it and there is nothing to choose.
        </p>
        <p className="note">
          It is taken from your own records whichever history is on screen, and it carries a
          fingerprint of its own contents so a damaged copy can be told from a complete one.
        </p>

        <div className="data-actions">
          <button type="button" onClick={() => void takeBackup()} disabled={memory.busy}>
            Take a backup
          </button>
          {backup === undefined ? null : (
            <>
              <button
                type="button"
                onClick={() =>
                  setBackupNotice(
                    downloadText(backup.json, backup.filename, JSON_TYPE)
                      ? { tone: 'ok', text: `Saved as ${backup.filename}.` }
                      : {
                          tone: 'warn',
                          text: 'This browser would not save the file. The backup is in the field below.',
                        },
                  )
                }
              >
                Save as a file
              </button>
              <button
                type="button"
                onClick={() => void copy(backup.json, 'The backup', setBackupNotice)}
              >
                Copy it
              </button>
            </>
          )}
        </div>

        {backupNotice === undefined ? null : (
          <p
            className={backupNotice.tone === 'ok' ? 'data-ok' : 'data-warning'}
            data-testid="backup-notice"
          >
            {backupNotice.text}
          </p>
        )}

        {backup === undefined ? null : (
          <>
            <Rows>
              <Row label="Entries" value={String(backup.counts.records)} />
              <Row label="Things it knows about" value={String(backup.counts.entities)} />
              <Row label="Rows it could not read" value={String(backup.counts.malformed)} />
              <Row label="Taken" value={backup.takenAt} />
              <Row label="Filename" value={backup.filename} mono />
            </Rows>
            <textarea
              className="data-text"
              aria-label="The backup"
              data-testid="backup-text"
              readOnly
              spellCheck={false}
              value={backup.json}
            />
          </>
        )}
      </Panel>

      <Panel title="Restore">
        <p>
          Putting a backup back replaces everything currently recorded. The file is checked first
          and you are shown what it holds; nothing is written until you press the last button.
        </p>

        {memory.canRestore ? null : (
          <p className="data-warning" data-testid="restore-blocked">
            A test history is on screen. Press <strong>Show mine</strong> at the top of the app
            first — a restore replaces your own records, and which history is about to be replaced
            should never be in doubt.
          </p>
        )}

        <label className="data-field">
          <span>Choose a backup file</span>
          <input
            type="file"
            accept="application/json,.json"
            data-testid="restore-file"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file === undefined) return
              void (async () => {
                const read = await readFile(file)
                if ('problem' in read) {
                  setChecked({
                    ok: false,
                    refusal: {
                      stage: 'parse',
                      problem: 'That file could not be read from this device.',
                      detail: read.problem,
                    },
                  })
                  return
                }
                setCandidate(read.text)
                await check(read.text)
              })()
            }}
          />
        </label>

        <label className="data-field">
          <span>Or paste one</span>
          <textarea
            className="data-text data-text--input"
            data-testid="restore-paste"
            spellCheck={false}
            value={candidate}
            onChange={(event) => {
              setCandidate(event.target.value)
              setChecked(undefined)
              setPlan(undefined)
              setOutcome(undefined)
            }}
          />
        </label>

        <div className="data-actions">
          <button
            type="button"
            data-testid="restore-check"
            disabled={candidate.trim().length === 0}
            onClick={() => void check(candidate)}
          >
            Check this backup
          </button>
        </div>

        {checked === undefined || checked.ok ? null : (
          <div className="data-refusal" data-testid="restore-refusal">
            <p className="data-warning">{checked.refusal.problem}</p>
            <p className="note">Nothing was changed.</p>
            {checked.refusal.detail === undefined ? null : (
              <details className="data-detail">
                <summary>What exactly is wrong</summary>
                <pre>{checked.refusal.detail}</pre>
              </details>
            )}
          </div>
        )}

        {plan === undefined ? null : (
          <div className="data-plan" data-testid="restore-plan">
            <p className="data-ok">
              That backup reads correctly and holds everything it says it holds.
            </p>
            <Rows>
              <Row label="Written" value={momentIn(plan.summary.createdAt, zone)} />
              <Row
                label="By build"
                value={`${plan.summary.app.commitShort} · ${plan.summary.app.target}`}
                mono
              />
              <Row
                label="Covers"
                value={
                  plan.summary.firstDay === undefined
                    ? 'nothing recorded'
                    : `${plan.summary.firstDay} to ${plan.summary.lastDay}`
                }
              />
              <Row
                label="Life areas"
                value={
                  plan.summary.domains.length === 0
                    ? 'none'
                    : plan.summary.domains.map((id) => coreDomains.labelFor(id)).join(', ')
                }
              />
              <Row
                label="Private area"
                value={
                  plan.summary.holdsPrivate ? 'Included in this file' : 'Nothing recorded in it'
                }
              />
              <Row
                label="It will restore"
                value={`${countOf(plan.incoming.records, 'entry', 'entries')}, ${countOf(plan.incoming.entities, 'thing it knows about', 'things it knows about')}, ${countOf(plan.incoming.malformed, 'unreadable row', 'unreadable rows')}`}
              />
              <Row
                label="It will replace"
                value={`${countOf(plan.current.records, 'entry', 'entries')}, ${countOf(plan.current.entities, 'thing it knows about', 'things it knows about')}, ${countOf(plan.current.malformed, 'unreadable row', 'unreadable rows')}`}
              />
              <Row label="Fingerprint" value={shortFingerprint(plan.expected)} mono />
            </Rows>
            {plan.summary.migrationsApplied.length === 0 ? null : (
              <p className="note">
                Brought forward from an older format: {plan.summary.migrationsApplied.join('; ')}
              </p>
            )}
            <div className="data-actions">
              <button
                type="button"
                className="data-danger"
                data-testid="restore-apply"
                disabled={!memory.canRestore || memory.busy}
                onClick={() => void apply()}
              >
                Replace everything with this backup
              </button>
            </div>
          </div>
        )}

        {outcome === undefined ? null : outcome.ok ? (
          <div className="data-outcome" data-testid="restore-done">
            <p className="data-ok">
              Restored and checked: the store now holds{' '}
              {countOf(outcome.verification.counts.records, 'entry', 'entries')}, exactly as the
              backup does.
            </p>
            <p className="note">
              {countOf(outcome.replaced.records, 'entry', 'entries')}{' '}
              {outcome.replaced.records === 1 ? 'was' : 'were'} replaced. The fingerprint the app
              read back matches the one in the file.
            </p>
          </div>
        ) : (
          <div
            className="data-outcome"
            data-testid={outcome.stage === 'confirm' ? 'restore-unconfirmed' : 'restore-failed'}
          >
            <p className="data-warning">{outcome.problem}</p>
            <p className="note">
              {outcome.stage === 'confirm'
                ? /*
                   * Applied, verified once, and not confirmable afterwards.
                   *
                   * Deliberately its own sentence rather than either of the
                   * two above. "Nothing was lost" would be a guess, and
                   * "nothing was written" would be false — the backup is
                   * very probably on disk and the app simply cannot see it.
                   * Telling him to restore again would be the one instruction
                   * that could actually cost him something.
                   */
                  'The backup was written and checked once, so it is probably there. What the app cannot do is read the database again to confirm it. Close the app and open it again to see what is actually stored — and do not restore anything else over this until you have.'
                : outcome.stage === 'not-attempted'
                  ? 'Nothing was read and nothing was written.'
                  : outcome.rolledBack && outcome.rollbackVerified
                    ? 'Your history was put back and checked. Nothing has been lost, and you can try the same file again.'
                    : outcome.rolledBack
                      ? 'Your history was written back, but the check on it did not pass. Do not close this screen — take a backup now before doing anything else.'
                      : 'Your history could not be written back. Do not close this screen — take a backup now before doing anything else.'}
            </p>
            {outcome.detail === undefined ? null : (
              <details className="data-detail">
                <summary>What exactly happened</summary>
                <pre>
                  {outcome.detail}
                  {outcome.rollbackDetail === undefined ? '' : `\n${outcome.rollbackDetail}`}
                </pre>
              </details>
            )}
          </div>
        )}

        {memory.storageCheck === undefined ? null : (
          <p
            className={memory.storageCheck.ok ? 'data-ok' : 'data-warning'}
            data-testid="restore-storage-check"
          >
            {memory.storageCheck.detail}
          </p>
        )}
      </Panel>

      <ImportPanel />
    </Screen>
  )
}
