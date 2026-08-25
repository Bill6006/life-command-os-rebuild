import { useState } from 'react'
import { Panel } from '../../components/ui'
import type { RecordId } from '../../domain/ids'
import type { CommitmentWindowRecord } from '../../domain/records'
import { describeRecurrence, dayMinuteLabel } from '../../domain/schedule'
import { systemClock, type IsoWeekday } from '../../domain/time'
import {
  commitmentWindowRecord,
  removeCommitmentWindowRecord,
  reviseCommitmentWindowRecord,
  standingCommitments,
  unansweredSeeds,
  WEEKDAYS,
  type ScheduleSeed,
} from '../../intelligence/commitments'
import type { Situation } from '../../intelligence/situation'
import { useMemory } from '../memory/memoryContext'

/**
 * How the owner's day is already spoken for — AUD-0004.
 *
 * The app's five day blocks are clock arithmetic. They model the shape of *a*
 * day and nothing about *his*: at 07:15 with the school run in twenty minutes
 * and at 11:00 with the house quiet, the engine saw the same morning and gave
 * the same answer. This is the surface that fixes that, and it is deliberately
 * the smallest one that can.
 *
 * **Two questions, on Life, asked once.** Section 4.5 constrains input burden
 * and AUD-0004 names the mitigation itself: ask twice, durably, never re-ask —
 * the shape the custody arrangement already uses. So there is no general "add
 * an event" form here. A calendar is a different product; what changes what
 * should be suggested at seven in the morning is the school day and the working
 * day, and those are the two the app knows by name.
 *
 * **It never appears on Now.** An unanswered seed costs the owner nothing: the
 * app simply does not know about his mornings, which is the state it has been
 * in all along. He finds this when he comes to look at the model, which is what
 * section 7 says Life is for.
 */

interface Draft {
  readonly startsAt: number
  readonly endsAt: number
  readonly everyDay: boolean
}

function parseClock(value: string): number | undefined {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (match === null) return undefined
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return undefined
  return hour * 60 + minute
}

const EVERY_DAY: readonly IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7]

export function DayShape({ situation }: { situation: Situation }) {
  const memory = useMemory()
  const [openSeed, setOpenSeed] = useState<string | undefined>(undefined)
  const [openWindow, setOpenWindow] = useState<RecordId | undefined>(undefined)
  const [draft, setDraft] = useState<Draft>({ startsAt: 0, endsAt: 0, everyDay: false })
  const [busy, setBusy] = useState(false)

  const standing = standingCommitments(situation)
  const seeds = unansweredSeeds(situation)

  const append = (build: () => readonly Parameters<typeof memory.append>[0][number][]) => {
    if (busy) return
    setBusy(true)
    void memory.append(build()).finally(() => setBusy(false))
  }

  const moment = () => ({
    now: memory.now,
    zone: memory.zone,
    recordedAt: systemClock().now(),
  })

  const startSeed = (seed: ScheduleSeed) => {
    setOpenWindow(undefined)
    setOpenSeed(seed.id)
    setDraft({ startsAt: seed.startsAt, endsAt: seed.endsAt, everyDay: false })
  }

  const saveSeed = (seed: ScheduleSeed) => {
    if (draft.endsAt <= draft.startsAt) return
    append(() => [
      commitmentWindowRecord(
        {
          label: seed.label(situation),
          startsAt: draft.startsAt,
          endsAt: draft.endsAt,
          recurrence: { kind: 'weekly', days: draft.everyDay ? EVERY_DAY : WEEKDAYS },
          whose: seed.whose,
          domain: seed.domain,
          // Who it takes away, so the engine can tell that it is her — QA-82-001.
          about: seed.about(situation),
          // He described the shape of an ordinary week, once. Not this
          // particular day, and not a schedule the app was handed.
          knownFrom: 'recurring',
        },
        moment(),
      ),
    ])
    setOpenSeed(undefined)
  }

  const startEdit = (record: CommitmentWindowRecord) => {
    setOpenSeed(undefined)
    setOpenWindow(record.id)
    setDraft({
      startsAt: record.startsAt,
      endsAt: record.endsAt,
      everyDay: record.recurrence.kind === 'weekly' && record.recurrence.days.length === 7,
    })
  }

  const saveEdit = (record: CommitmentWindowRecord) => {
    if (draft.endsAt <= draft.startsAt) return
    append(() => [
      reviseCommitmentWindowRecord(
        record,
        {
          label: record.label,
          startsAt: draft.startsAt,
          endsAt: draft.endsAt,
          recurrence:
            record.recurrence.kind === 'one-off'
              ? record.recurrence
              : { kind: 'weekly', days: draft.everyDay ? EVERY_DAY : WEEKDAYS },
          whose: record.whose,
          domain: record.domains[0] ?? situation.domains.all()[0]!.id,
          knownFrom: record.knownFrom,
        },
        moment(),
      ),
    ])
    setOpenWindow(undefined)
  }

  const remove = (record: CommitmentWindowRecord) => {
    append(() => [removeCommitmentWindowRecord(record.id, moment())])
    setOpenWindow(undefined)
  }

  const disabled = busy || memory.busy

  /*
   * One line, whichever place it is read in — AUD-0004.
   *
   * The two seeds are an aside rather than a form. Built once so the line the
   * owner reads at the bottom of Life and the line he reads inside the panel
   * are the same line, rather than two that drift.
   */
  const invitation = (
    <span data-testid="day-shape-seeds">
      The app reads the clock and nothing else about your day. Tell it about{' '}
      {seeds.map((seed, index) => (
        <span key={seed.id}>
          {index === 0 ? '' : ' or '}
          <button
            type="button"
            className="domain-linkish"
            disabled={disabled}
            data-testid={`day-shape-tell-${seed.id}`}
            onClick={() => startSeed(seed)}
          >
            {seed.invite(situation)}
          </button>
        </span>
      ))}
      .
    </span>
  )

  const open = openSeed === undefined ? undefined : seeds.find((seed) => seed.id === openSeed)

  /*
   * A panel when there is something to report, and a line when there is not —
   * D-075.
   *
   * Life is a report, and on a history where the app knows nothing about the
   * owner's day there is nothing to report: what is left is an invitation, and
   * an invitation with a heading and a bordered card around it is the wall this
   * screen was rebuilt to stop being. So the chrome arrives with the content.
   */
  if (standing.length === 0 && open === undefined) {
    if (seeds.length === 0) return null
    return <p className="note">{invitation}</p>
  }

  return (
    <Panel title="How your day is set up">
      {standing.length === 0 ? null : (
        <ul className="life-commitments" data-testid="day-shape-list">
          {standing.map((record) => (
            <li key={record.id} className="life-commitment">
              <p className="life-commitment__what">
                {record.label} — {dayMinuteLabel(record.startsAt)} to{' '}
                {dayMinuteLabel(record.endsAt)}, {describeRecurrence(record.recurrence)}
              </p>

              {openWindow === record.id ? (
                <div className="life-commitment__form">
                  <ClockPair draft={draft} disabled={disabled} onChange={setDraft} />
                  <div className="life-commitment__actions">
                    <button
                      type="button"
                      className="domain-option"
                      disabled={disabled || draft.endsAt <= draft.startsAt}
                      onClick={() => saveEdit(record)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="domain-linkish"
                      disabled={disabled}
                      data-testid="day-shape-remove"
                      onClick={() => remove(record)}
                    >
                      Not in my day
                    </button>
                    <button
                      type="button"
                      className="domain-linkish"
                      disabled={disabled}
                      onClick={() => setOpenWindow(undefined)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="domain-linkish"
                  disabled={disabled}
                  aria-label={`Change ${record.label}`}
                  onClick={() => startEdit(record)}
                >
                  Not right?
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {open === undefined ? null : (
        <div className="life-commitment__form" data-testid={`day-shape-seed-${open.id}`}>
          <p className="life-commitment__what">{open.prompt(situation)}</p>
          <ClockPair draft={draft} disabled={disabled} onChange={setDraft} />
          <div className="life-commitment__actions">
            <button
              type="button"
              className="domain-option"
              disabled={disabled || draft.endsAt <= draft.startsAt}
              onClick={() => saveSeed(open)}
            >
              Save
            </button>
            <button
              type="button"
              className="domain-linkish"
              disabled={disabled}
              onClick={() => setOpenSeed(undefined)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/*
        The invitation, as one line rather than a block each — D-075.

        Life is a report and this is the one thing on it the owner is asked to
        add, so it has to read as an aside. The first version gave each of the
        two seeds a heading, a prompt and a control of its own, and put two
        thirds of a phone screen of homework on the page whose whole complaint
        was being homework.
      */}
      {seeds.length === 0 ? null : <p className="note">{invitation}</p>}
    </Panel>
  )
}

/**
 * Two times and how often, and nothing else.
 *
 * Every field here is one the owner already knows the answer to without
 * checking anything, which is the burden test AUD-0004 sets. There is no
 * per-weekday picker: a school term and a working week are weekdays, and the
 * one variation worth having is "every day", for the parent whose arrangement
 * does not stop at Friday.
 */
function ClockPair({
  draft,
  disabled,
  onChange,
}: {
  draft: Draft
  disabled: boolean
  onChange: (next: Draft) => void
}) {
  return (
    <div className="life-commitment__clocks">
      <label className="life-commitment__clock">
        <span>Starts</span>
        <input
          type="time"
          className="domain-input"
          value={dayMinuteLabel(draft.startsAt)}
          disabled={disabled}
          data-testid="day-shape-starts"
          onChange={(event) => {
            const parsed = parseClock(event.target.value)
            if (parsed !== undefined) onChange({ ...draft, startsAt: parsed })
          }}
        />
      </label>
      <label className="life-commitment__clock">
        <span>Ends</span>
        <input
          type="time"
          className="domain-input"
          value={dayMinuteLabel(draft.endsAt)}
          disabled={disabled}
          data-testid="day-shape-ends"
          onChange={(event) => {
            const parsed = parseClock(event.target.value)
            if (parsed !== undefined) onChange({ ...draft, endsAt: parsed })
          }}
        />
      </label>
      <label className="life-commitment__clock">
        <input
          type="checkbox"
          checked={draft.everyDay}
          disabled={disabled}
          data-testid="day-shape-every-day"
          onChange={(event) => onChange({ ...draft, everyDay: event.target.checked })}
        />
        <span>Every day, not only weekdays</span>
      </label>
    </div>
  )
}
