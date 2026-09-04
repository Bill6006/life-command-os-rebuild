import { useCallback, useMemo, useRef, useState } from 'react'
import { Panel } from '../../components/ui'
import {
  CHECK_IN_DEPTHS,
  CHECK_IN_FREQUENCIES,
  CHECK_IN_OPENS_AT,
  readingsPerDay,
  SLOTS_AT_FREQUENCY,
  type CheckInDepth,
  type CheckInFrequency,
  type CheckInSettings,
} from '../../domain/checkIn'
import { dayMinuteLabel } from '../../domain/schedule'
import { systemClock } from '../../domain/time'
import { checkInSettings, checkInSettingRecord } from '../../intelligence/checkIn'
import { askForReminders, reminderPermission } from '../../platform/reminders'
import { useMemory } from '../memory/memoryContext'
import './CheckInSettingsPanel.css'

/**
 * Depth and frequency, as two controls — D-285.
 *
 * ## Why they are two and not one
 *
 * The owner asked for *"depth and frequency as two separate levels"*, and they
 * answer different questions: how much is asked at once, and how often being
 * asked happens at all. One combined level would make cutting the interruptions
 * cost him the breadth of every reading, and those are exactly the two things he
 * asked to be able to trade separately.
 *
 * ## The trade is stated on the control, because D-285 says it has to be
 *
 * Not as a warning and not as a nudge. A plain sentence, in his own terms, next
 * to the thing it is about — *fewer readings will not produce the best results*.
 * He is entitled to choose the smaller one knowing that; what he is not entitled
 * to is finding it out in three months when a forecast is thin.
 *
 * ## And the default is where the app starts, not where it stays
 *
 * Nothing here is pre-selected by this panel: the selection is read from the
 * record, and with no record it is D-293's shipped `full` and `three`.
 */

const DEPTH_LABEL: Record<CheckInDepth, string> = {
  full: 'Everything',
  shorter: 'What changes within a day',
  fewest: 'The fewest',
}

const DEPTH_DETAIL: Record<CheckInDepth, string> = {
  full: 'Thirteen readings in the morning, five at each of the others.',
  shorter: 'The five that move within a day, plus how you slept. The slower ones are left out.',
  fewest: 'Mood, irritation and hunger, plus how you slept.',
}

const FREQUENCY_LABEL: Record<CheckInFrequency, string> = {
  three: 'Three times a day',
  two: 'Twice a day',
  one: 'Once a day',
}

/**
 * What the reminder can and cannot do, in the words the owner reads.
 *
 * No service worker is registered anywhere in this app — More says so on its own
 * panel — so a reminder is only possible while a tab is open. Saying that here
 * is cheaper than him missing a morning and concluding the reminder is broken.
 */
const REMINDER_LIMIT =
  'A reminder only appears while this app is open in a tab or a window. Nothing appears when it is closed.'

/** The one sentence D-285 requires, kept in one place so it reads the same everywhere. */
export const DEPTH_TRADE = 'Fewer readings will not produce the best results.'

function describe(settings: CheckInSettings): string {
  const slots = SLOTS_AT_FREQUENCY[settings.frequency]
  const at = slots.map((slot) => dayMinuteLabel(CHECK_IN_OPENS_AT[slot])).join(', ')
  return `${DEPTH_LABEL[settings.depth]}, ${FREQUENCY_LABEL[settings.frequency].toLowerCase()} — ${readingsPerDay(settings)} readings a day, at ${at}`
}

export function CheckInSettingsPanel() {
  const memory = useMemory()
  const [working, setWorking] = useState(false)
  const [permission, setPermission] = useState(() => reminderPermission())
  const inFlight = useRef(false)

  const current = useMemo(
    () => (memory.ready ? checkInSettings(memory.view) : undefined),
    [memory.ready, memory.view],
  )

  const choose = useCallback(
    (next: CheckInSettings) => {
      if (inFlight.current) return
      inFlight.current = true
      setWorking(true)
      void memory
        .append([
          checkInSettingRecord(next, describe(next), {
            now: memory.now,
            zone: memory.zone,
            recordedAt: systemClock().now(),
          }),
        ])
        .finally(() => {
          inFlight.current = false
          setWorking(false)
        })
    },
    [memory],
  )

  if (current === undefined) return null

  const busy = working || memory.busy

  return (
    <>
      <Panel title="How much the check-in asks" testId="checkin-settings">
        <p className="note" data-testid="checkin-settings-current">
          {describe(current)}
        </p>

        <h3 className="checkin-setting__heading">How much at a time</h3>
        <div className="checkin-setting__options">
          {CHECK_IN_DEPTHS.map((depth) => (
            <button
              key={depth}
              type="button"
              className="checkin-setting__option"
              aria-pressed={current.depth === depth}
              disabled={busy}
              data-testid={`checkin-depth-${depth}`}
              onClick={() => choose({ ...current, depth })}
            >
              <span className="checkin-setting__label">{DEPTH_LABEL[depth]}</span>
              <span className="checkin-setting__detail">{DEPTH_DETAIL[depth]}</span>
              <span className="checkin-setting__count">
                {readingsPerDay({ ...current, depth })} readings a day
              </span>
            </button>
          ))}
        </div>
        <p className="note" data-testid="checkin-depth-trade">
          {DEPTH_TRADE}
        </p>

        <h3 className="checkin-setting__heading">How often</h3>
        <div className="checkin-setting__options">
          {CHECK_IN_FREQUENCIES.map((frequency) => (
            <button
              key={frequency}
              type="button"
              className="checkin-setting__option"
              aria-pressed={current.frequency === frequency}
              disabled={busy}
              data-testid={`checkin-frequency-${frequency}`}
              onClick={() => choose({ ...current, frequency })}
            >
              <span className="checkin-setting__label">{FREQUENCY_LABEL[frequency]}</span>
              <span className="checkin-setting__detail">
                {SLOTS_AT_FREQUENCY[frequency]
                  .map((slot) => dayMinuteLabel(CHECK_IN_OPENS_AT[slot]))
                  .join(', ')}
              </span>
              <span className="checkin-setting__count">
                {readingsPerDay({ ...current, frequency })} readings a day
              </span>
            </button>
          ))}
        </div>
        <p className="note">
          The morning stays whatever you choose here — it is the only one that reads how you slept.
        </p>
      </Panel>

      <Panel title="Check-in reminders" tone="quiet" testId="checkin-reminders">
        <p className="note" data-testid="checkin-reminder-state">
          {permission === 'granted'
            ? 'Reminders are on for this browser.'
            : permission === 'denied'
              ? 'This browser is blocking reminders. Its own site settings are where that changes.'
              : permission === 'unsupported'
                ? 'This browser has no reminders to offer.'
                : 'Reminders are off.'}
        </p>
        <p className="note">{REMINDER_LIMIT}</p>
        {permission === 'default' ? (
          <button
            type="button"
            className="checkin-setting__ask"
            disabled={busy}
            data-testid="checkin-reminder-ask"
            onClick={() => {
              void askForReminders().then(setPermission)
            }}
          >
            Turn on check-in reminders
          </button>
        ) : null}
      </Panel>
    </>
  )
}
