import { useMemo, useState } from 'react'
import { Panel, Screen } from '../../components/ui'
import { localTimeOfDayAt } from '../../domain/time'
import { assembleSituation } from '../../intelligence/situation'
import { useMemory } from '../memory/memoryContext'
import {
  assembleTimeline,
  describeExtent,
  TIMELINE_LEDE,
  TIMELINE_PAGE,
  type TimelineData,
} from './timelineEntries'
import './TimelineScreen.css'

/**
 * Timeline (canonical plan section 26).
 *
 * The chronological truth surface, and the one primary destination with
 * nothing on it to press. That is deliberate rather than unfinished: section 26
 * requires that Timeline "never create phantom actionable items from corrupt
 * data", and a surface with no actions on it at all cannot, whatever arrives in
 * the store. Corrections live where the app makes a claim — beside the decision
 * on Now, and on the domain page for the area. This is the record.
 *
 * Two things are worth reading closely.
 *
 * **What is not here.** No filters. Section 51 asks for them "if actually
 * needed, not by default", and on every history in the library the day headings
 * plus a growing page do the job a filter would. A control nobody needs is a
 * control that has to be maintained and understood.
 *
 * **Rows the app could not read.** They are reported, once, at the bottom,
 * without dates and without being sorted in among real history — because they
 * have no date and no meaning, and giving them the shape of an entry is how a
 * corrupt row starts looking like something the app understood.
 */
export function TimelineScreen() {
  const memory = useMemory()
  const [limit, setLimit] = useState(TIMELINE_PAGE)

  const data = useMemo<TimelineData | undefined>(() => {
    if (!memory.ready) return undefined
    const situation = assembleSituation(memory.view, {
      now: memory.now,
      zone: memory.zone,
      weekStartsOn: memory.weekStartsOn,
    })
    return assembleTimeline(situation, limit)
  }, [memory.ready, memory.view, memory.now, memory.zone, memory.weekStartsOn, limit])

  const zone = memory.zone

  if (!memory.ready || data === undefined) {
    return (
      <Screen title="Timeline">
        <Panel tone="quiet">
          <p className="note">Opening your history…</p>
        </Panel>
      </Screen>
    )
  }

  const nothingToShow = data.total === 0
  const damaged = data.unreadable.length + data.tangled.length
  /*
   * There is history here; none of it has happened yet — QA-82-009.
   *
   * `total` counts entries at or before the moment on screen, so a history
   * whose entries are all later reports zero — and this screen read that zero
   * as *nothing could be read*. Move the laboratory clock a week back from a
   * file that also has damage in it and the app told the owner his file was
   * the problem, over five records that had parsed perfectly and were simply
   * dated later than where he had moved to.
   *
   * Three empty states, three different things to say. Blaming the file is
   * only one of them, and it is the one that is hardest to argue with.
   */
  const onlyLater = nothingToShow && data.later > 0

  return (
    <Screen title="Timeline" lede={TIMELINE_LEDE}>
      {nothingToShow ? (
        <Panel
          title={
            onlyLater
              ? 'Nothing yet at this point'
              : damaged === 0
                ? 'Nothing here yet'
                : 'Nothing readable here'
          }
        >
          {onlyLater ? (
            /*
             * The claim is about the later entries, not about the store —
             * QA-82-009's repair, corrected by QA-82-010.
             *
             * The first version of this said "nothing has been lost and nothing
             * is unreadable", unconditionally, and on the fixture it was written
             * for it sat directly above six rows whose reason is "could not be
             * read". Reassuring the owner about the entries that are simply
             * ahead of him is right; doing it in words that deny the fault panel
             * underneath is the same defect this sentence was added to fix,
             * pointing the other way.
             */
            <p>
              There is history here — {data.later} {data.later === 1 ? 'entry' : 'entries'} — but
              all of it is later than the moment on screen. None of it has been lost; move forward
              and it is there.
              {damaged === 0 ? '' : ' The rows below are a separate matter.'}
            </p>
          ) : damaged === 0 ? (
            <p>
              Once there is a history — an answer, a suggestion, what came of it — this is where it
              accumulates, oldest at the bottom.
            </p>
          ) : (
            /*
             * Section 36: a fallback must not look like a confident empty
             * state. An empty Timeline over a file full of damage is not "you
             * have no history", and saying so would be the app being tidy about
             * a failure.
             *
             * It must not be a confident *blame* either, which is the other
             * half and is QA-82-009: this sentence is only true once nothing
             * readable exists at any moment, so `onlyLater` is checked before
             * it rather than after.
             */
            <p>
              Nothing in what was loaded could be read. That is a problem with the file rather than
              an empty history — the rows are listed below exactly as they arrived.
            </p>
          )}
        </Panel>
      ) : (
        <>
          {data.days.map((day) => (
            <section key={day.dayId} className="tl-day" data-testid={`tl-day-${day.dayId}`}>
              <h2 className="tl-day__label">{day.label}</h2>
              <ol className="tl-entries">
                {day.entries.map((entry) => (
                  <li key={entry.id} className="tl-entry">
                    <span className="tl-entry__when">{localTimeOfDayAt(entry.at, zone)}</span>
                    <span className="tl-entry__tag">{entry.tag}</span>
                    <span
                      className={
                        entry.withheld ? 'tl-entry__text tl-entry__text--held' : 'tl-entry__text'
                      }
                    >
                      {entry.text}{' '}
                      {entry.origin === undefined ? null : (
                        <span
                          className="origin-badge"
                          data-testid="tl-origin"
                          title={entry.origin.detail}
                        >
                          {entry.origin.label}
                        </span>
                      )}
                      {entry.replacedSomething ? (
                        <span className="tl-entry__note"> — replaced an earlier entry</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ))}

          {data.shown < data.total ? (
            <button
              type="button"
              className="tl-more"
              onClick={() => setLimit((held) => held + TIMELINE_PAGE)}
            >
              Show earlier ({data.total - data.shown} more)
            </button>
          ) : (
            <p className="note" data-testid="tl-end">
              {describeExtent(data)}
            </p>
          )}
        </>
      )}

      {damaged === 0 ? null : (
        <Panel
          title={damaged === 1 ? 'One row could not be read' : `${damaged} rows have problems`}
        >
          {/*
            Isolated and reported, never silently dropped (sections 26 and 36).
            Nothing here is actionable and nothing here is dated: these rows have
            no meaning the app could put in order.
          */}
          <p className="note">
            These are kept exactly as they arrived and are not used for anything. Everything above
            is unaffected.
          </p>
          <ul className="tl-damaged" data-testid="tl-damaged">
            {[...data.unreadable, ...data.tangled].map((row, index) => (
              <li key={`${row.where}-${index}`}>
                <span className="tl-damaged__where">{row.where}</span>
                <span className="tl-damaged__why">{row.problem}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </Screen>
  )
}
