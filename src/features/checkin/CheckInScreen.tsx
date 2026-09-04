import { useCallback, useMemo, useRef, useState } from 'react'
import { Panel, Screen } from '../../components/ui'
import { dayMinuteLabel } from '../../domain/schedule'
import { isUsable } from '../../domain/knowledge'
import { systemClock } from '../../domain/time'
import {
  checkInBudget,
  checkInRecord,
  dueCheckIn,
  nextCheckInOpensAt,
} from '../../intelligence/checkIn'
import { assembleSituation } from '../../intelligence/situation'
import { stateScore, type StateDimension } from '../../intelligence/state'
import type { ReadingAnchor, ReadingSpec } from '../../intelligence/readings'
import { hashForDestination } from '../../platform/routing'
import { useMemory } from '../memory/memoryContext'
import './CheckInScreen.css'

/**
 * The check-in — routing 94, D-285 / D-286 / D-293.
 *
 * ## The rule this screen exists to satisfy, and it is not the readings
 *
 * The owner's previous app *"asked but never learned"*: 7 to 19 questions a
 * block, data piling up, nothing coming back. **Dense sampling alone reproduces
 * that failure with better typography**, and this phase cannot deliver the
 * learning that would answer it — the effect measurement is routing 95 and the
 * forecast is 97.
 *
 * What it can do is refuse to make the asking feel free. So the same screen he
 * answers on is the screen that shows what he answered and what it comes to, at
 * the moment he finishes, with no navigation in between. **What he can see today
 * for what he answered today is the minimum**, and it is deliberately the whole
 * of what is claimed.
 *
 * ## What is on it and in what order
 *
 * One reading at a time while a check-in is open — the same discipline the guide
 * follows, and for the same reason. Then the state reading, then every dimension
 * with the words he actually tapped, then what the check-in has cost him today
 * against what a whole day of it comes to.
 *
 * ## What is not on it
 *
 * No adjective on the score, no band, no face, no colour that means better, and
 * no bar. D-287 is explicit that the number stays a reading only while it never
 * acquires a quality word, and a bar is a quality word drawn instead of
 * written — which is the identical finding D-291 reaches about a progress bar on
 * a different screen. A reading shows its position as *3 of 5* and stops.
 */

/** How a reading is shown once it has been given: the words, not a number. */
function ReadingRow({ dimension }: { dimension: StateDimension }) {
  const known = isUsable(dimension.knowledge)
  return (
    <div className="checkin-reading" data-testid="checkin-reading">
      <span className="checkin-reading__name">{dimension.definition.label}</span>
      {known && dimension.label !== undefined ? (
        <span className="checkin-reading__answer">
          {dimension.label}
          {dimension.at === undefined ? null : (
            <span className="checkin-reading__place">
              {' '}
              — {dimension.at} of {dimension.of}
            </span>
          )}
        </span>
      ) : (
        <span className="checkin-reading__unknown">Not answered</span>
      )}
      {dimension.uncountedBecause === undefined ? null : (
        <span className="checkin-reading__aside">
          Outside the figure — {dimension.uncountedBecause}
        </span>
      )}
    </div>
  )
}

/**
 * The figure, the sentence that says what it measures, and the count it is over
 * — rendered together, because section 51's rule is that they arrive together.
 *
 * Not a per-cent sign, and that is not a workaround. Exactly one component in
 * the app may print one, it takes a whole `MeasuredRate`, and this is not that
 * quantity. *62 out of 100* says the identical thing and says its denominator
 * out loud, which is what the rule is actually for.
 */
function StateReading({ reading }: { reading: ReturnType<typeof stateScore> }) {
  if (reading.score === undefined) {
    return (
      <Panel title="Where you are" tone="quiet">
        <p className="note" data-testid="checkin-score-unknown">
          Nothing has been read recently enough to say. A check-in is how that changes.
        </p>
      </Panel>
    )
  }

  return (
    <Panel title="Where you are" testId="checkin-score">
      <p className="checkin-score" data-testid="checkin-score-figure">
        <span className="checkin-score__figure">{reading.score}</span>
        <span className="checkin-score__of">out of 100</span>
      </p>
      <p className="note" data-testid="checkin-score-basis">
        From {reading.from} of the {reading.of} readings it is made of — {reading.measures}.
      </p>
      <p className="note" data-testid="checkin-score-weighting">
        {reading.weighting}
      </p>
    </Panel>
  )
}

export function CheckInScreen() {
  const memory = useMemory()
  const [working, setWorking] = useState(false)
  const inFlight = useRef(false)

  const moment = useMemo(() => ({ now: memory.now, zone: memory.zone }), [memory.now, memory.zone])

  /*
   * The score reads the situation's readings rather than the store — AUD-0040.
   *
   * One extra assembly on a screen that is opened three times a day, and it buys
   * the door D-167's permission is applied at. `decide()` is deliberately not
   * called: nothing on this screen is a recommendation, and running the whole
   * pipeline to render a reading would put a decision behind a surface that
   * makes none.
   */
  const readings = useMemo(
    () =>
      memory.ready
        ? assembleSituation(memory.view, {
            now: memory.now,
            zone: memory.zone,
            weekStartsOn: memory.weekStartsOn,
          }).readings
        : undefined,
    [memory.ready, memory.view, memory.now, memory.zone, memory.weekStartsOn],
  )

  const due = useMemo(
    () => (memory.ready ? dueCheckIn(memory.view, moment) : undefined),
    [memory.ready, memory.view, moment],
  )
  const reading = useMemo(
    () => (readings === undefined ? undefined : stateScore(readings)),
    [readings],
  )
  const budget = useMemo(
    () => (memory.ready ? checkInBudget(memory.view, moment) : undefined),
    [memory.ready, memory.view, moment],
  )
  const opensAt = useMemo(
    () => (memory.ready ? nextCheckInOpensAt(memory.view, moment) : undefined),
    [memory.ready, memory.view, moment],
  )

  const answer = useCallback(
    (spec: ReadingSpec, anchor: ReadingAnchor) => {
      if (inFlight.current) return
      inFlight.current = true
      setWorking(true)
      void memory
        .append([
          // What it is about is the moment being asked about; when it was
          // written down is now. Within one check-in the second is what tells
          // three answers a minute apart from each other.
          checkInRecord(spec, anchor, {
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

  if (!memory.ready || reading === undefined || budget === undefined) {
    return (
      <Screen title="Check-in">
        <Panel tone="quiet">
          <p className="note">Opening your history…</p>
        </Panel>
      </Screen>
    )
  }

  const busy = working || memory.busy
  const next = due?.next

  return (
    <Screen
      title="Check-in"
      lede="A fixed set of readings, three times a day. Skip any of them and they stay unanswered rather than guessed at."
    >
      {next !== undefined && due !== undefined ? (
        <Panel title={due.label} testId="checkin-open">
          <p className="checkin-progress" data-testid="checkin-progress">
            {due.answeredCount} of {due.totalCount} answered
          </p>
          <p className="checkin-question" data-testid="checkin-question">
            {next.prompt}
          </p>
          <div className="checkin-anchors">
            {next.anchors.map((anchor) => (
              <button
                key={anchor.id}
                type="button"
                className="checkin-anchor"
                disabled={busy}
                onClick={() => answer(next, anchor)}
              >
                {anchor.label}
              </button>
            ))}
          </div>
          <p className="note">
            Leave the rest if you would rather. An unanswered reading stays unanswered.
          </p>
        </Panel>
      ) : due !== undefined ? (
        <Panel title={due.label} testId="checkin-done">
          <p className="note" data-testid="checkin-done-note">
            All {due.totalCount} answered.
            {opensAt === undefined
              ? ' That is the last one today.'
              : ` The next one opens at ${dayMinuteLabel(opensAt)}.`}
          </p>
        </Panel>
      ) : (
        <Panel title="Nothing open" tone="quiet" testId="checkin-closed">
          <p className="note" data-testid="checkin-closed-note">
            {opensAt === undefined
              ? 'The check-ins for today have closed.'
              : `The next check-in opens at ${dayMinuteLabel(opensAt)}.`}
          </p>
        </Panel>
      )}

      <StateReading reading={reading} />

      <Panel title="Every reading">
        <div className="checkin-readings">
          {reading.dimensions.map((dimension) => (
            <ReadingRow key={String(dimension.concept)} dimension={dimension} />
          ))}
        </div>
        <p className="note" data-testid="checkin-readings-note">
          Each one on its own, alongside the figure rather than underneath it.
        </p>
      </Panel>

      <Panel title="What the check-in has asked" tone="quiet">
        <p className="note" data-testid="checkin-budget">
          {budget.answered} of {budget.perDay} readings today, at the depth and frequency you set.
        </p>
        <p className="note">
          Counted on its own. Questions the app asks to work out what to suggest are a separate
          count, with a separate limit.
        </p>
        <p className="note">
          <a className="qa-link" href={hashForDestination('more')}>
            Change how much it asks
          </a>
        </p>
      </Panel>
    </Screen>
  )
}
