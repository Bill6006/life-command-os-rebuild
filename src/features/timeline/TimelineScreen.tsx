import { useMemo, useState } from 'react'
import { Panel, Screen } from '../../components/ui'
import { localTimeOfDayAt } from '../../domain/time'
import { assembleSituation } from '../../intelligence/situation'
import { useMemory } from '../memory/memoryContext'
import { assembleTimeline, TIMELINE_PAGE, type TimelineData } from './timelineEntries'
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
        <Panel>
          <p className="note">Opening your history…</p>
        </Panel>
      </Screen>
    )
  }

  const nothingReadable = data.total === 0
  const damaged = data.unreadable.length + data.tangled.length

  return (
    <Screen title="Timeline" lede="Everything that happened, in the order it happened.">
      {nothingReadable ? (
        <Panel title={damaged === 0 ? 'Nothing here yet' : 'Nothing readable here'}>
          {damaged === 0 ? (
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
                      {entry.text}
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
              That is the whole record — {data.total} {data.total === 1 ? 'entry' : 'entries'}.
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
            {data.unreadable.map((row) => (
              <li key={`bad-${row.index}`}>
                <span className="tl-damaged__where">
                  Row {row.index + 1}
                  {row.id === undefined ? '' : ` (${row.id})`}
                </span>
                <span className="tl-damaged__why">{row.problem}</span>
              </li>
            ))}
            {data.tangled.map((row) => (
              <li key={`tangled-${row.id ?? row.index}`}>
                <span className="tl-damaged__where">{row.id ?? 'An entry'}</span>
                <span className="tl-damaged__why">{row.problem}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </Screen>
  )
}
