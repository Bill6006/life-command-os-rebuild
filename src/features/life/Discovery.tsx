import { useCallback, useMemo, useRef, useState } from 'react'
import { Panel } from '../../components/ui'
import { systemClock } from '../../domain/time'
import {
  authoringRecords,
  dayFromInput,
  destinationRecords,
  minutesFromClock,
  reviseDestinationRecord,
} from '../../intelligence/authoring'
import {
  discoveryAgenda,
  discoveryChanges,
  discoveryResponseRecord,
  type DiscoveryPrompt,
} from '../../intelligence/discovery'
import type { Situation } from '../../intelligence/situation'
import { useMemory } from '../memory/memoryContext'

/**
 * The second information agenda, on the surface it belongs on — F02, D-163.
 *
 * ## Why it is here and not on Now
 *
 * D-163's first rule: *never on Now's critical path*. Now is where the app
 * comes to the owner with one thing to do, and a question whose answer will not
 * change what that thing is has no business interrupting it. Life is where he
 * comes to see what the app understands, which is exactly what this is asking
 * to improve — and D-169 puts the review loop on the same surfaces for the same
 * reason.
 *
 * ## What it asks, and what makes that different from the guide
 *
 * The guide can only ask a question whose answer would move tonight's
 * recommendation; that is a property of how it decides to ask, and it is
 * correct. This one asks about the things that would not: what he is aiming at,
 * where he is starting from, what would count, what takes a regular chunk of
 * his week. **Two a week**, always skippable, never repeated, and each one
 * lands as an object the rest of the app already understands.
 *
 * ## And it shows what the answers changed
 *
 * The rule an agenda cannot fake, and the reason the response record carries
 * what it produced. `discoveryChanges` replays the decision without the record
 * an answer produced and reports the difference — including when the difference
 * is nothing, because a question worth asking need not have moved tonight.
 */
export function Discovery({ situation }: { situation: Situation }) {
  const memory = useMemory()
  const [working, setWorking] = useState(false)
  const [draft, setDraft] = useState('')
  const [second, setSecond] = useState('')
  const [showing, setShowing] = useState(false)
  const inFlight = useRef(false)

  const agenda = useMemo(
    () =>
      discoveryAgenda(situation, {
        now: memory.now,
        zone: memory.zone,
        weekStartsOn: memory.weekStartsOn,
      }),
    [situation, memory.now, memory.zone, memory.weekStartsOn],
  )

  const changes = useMemo(
    () =>
      showing
        ? discoveryChanges(memory.view, {
            now: memory.now,
            zone: memory.zone,
            weekStartsOn: memory.weekStartsOn,
          })
        : [],
    [showing, memory.view, memory.now, memory.zone, memory.weekStartsOn],
  )

  const run = useCallback((work: () => Promise<void>) => {
    if (inFlight.current) return
    inFlight.current = true
    setWorking(true)
    void work().finally(() => {
      inFlight.current = false
      setWorking(false)
    })
  }, [])

  const busy = working || memory.busy
  const prompt = agenda.prompt

  const moment = () => ({
    now: memory.now,
    zone: memory.zone,
    recordedAt: systemClock().now(),
  })

  /**
   * A skip, respected.
   *
   * One record and nothing else, and the prompt is not put again. The thing it
   * was asking about is still authorable directly from its own domain page, so
   * respecting the skip costs him nothing at all — which is what makes
   * "always skippable" honest rather than a delay.
   */
  const skip = (asked: DiscoveryPrompt) => {
    run(async () => {
      await memory.append([discoveryResponseRecord(asked, 'skipped', undefined, moment())])
      setDraft('')
      setSecond('')
    })
  }

  /**
   * An answer, as the object it actually is.
   *
   * The agenda has no record shape of its own: an aspiration becomes a
   * `destination`, a next step becomes a milestone, a commitment becomes a span
   * of the week. The `discovery-response` goes alongside carrying the id of
   * what it produced, which is what lets the agenda say later what the answer
   * changed.
   */
  const answer = (asked: DiscoveryPrompt) => {
    const said = draft.trim()
    if (said === '') return
    run(async () => {
      const at = moment()
      if (asked.shape === 'destination') {
        const built = destinationRecords({ aim: said, domain: asked.domain }, situation, at)
        await memory.create(built)
        await memory.append([discoveryResponseRecord(asked, 'answered', built.records[0]?.id, at)])
      } else if (asked.shape === 'milestone') {
        const built = destinationRecords(
          {
            aim: asked.destination?.aim ?? said,
            domain: asked.domain,
            milestone: said,
          },
          situation,
          at,
        )
        await memory.create(built)
        await memory.append([discoveryResponseRecord(asked, 'answered', built.records[1]?.id, at)])
      } else if (asked.shape === 'obligation') {
        const startsAt = minutesFromClock(second)
        const built = authoringRecords(
          {
            kind: 'obligation',
            name: said,
            domain: asked.domain,
            ...(startsAt === undefined ? {} : { startsAt, endsAt: startsAt + 60 }),
            ...(dayFromInput(second) === undefined ? {} : { dayId: dayFromInput(second)! }),
            weekdays: [3],
          },
          situation,
          at,
        )
        await memory.create(built)
        await memory.append([discoveryResponseRecord(asked, 'answered', built.records[0]?.id, at)])
      } else {
        const record = asked.destination
          ? memory.view.history.byId(asked.destination.source)
          : undefined
        if (record === undefined || record.kind !== 'destination') return
        const revised = reviseDestinationRecord(
          record,
          asked.shape === 'baseline' ? { baseline: said } : { evidence: [said] },
          at,
        )
        await memory.append([revised, discoveryResponseRecord(asked, 'answered', revised.id, at)])
      }
      setDraft('')
      setSecond('')
    })
  }

  return (
    <Panel title="Getting to know you">
      {prompt === undefined ? (
        <p className="note" data-testid="discovery-quiet">
          {agenda.because}.
        </p>
      ) : (
        <div className="domain-correction" data-testid="discovery-prompt">
          <label className="domain-correction__prompt" htmlFor="discovery-answer">
            {prompt.prompt}
          </label>
          <p className="note">{prompt.note}</p>
          <input
            id="discovery-answer"
            type="text"
            className="domain-input"
            value={draft}
            disabled={busy}
            data-testid="discovery-answer"
            onChange={(event) => setDraft(event.target.value)}
          />
          {prompt.shape === 'obligation' ? (
            <>
              <label className="domain-correction__prompt" htmlFor="discovery-when">
                What time does it start?
              </label>
              <p className="note">
                Exact times if you have them. The app works around the span rather than guessing at
                it.
              </p>
              <input
                id="discovery-when"
                type="time"
                className="domain-input"
                value={second}
                disabled={busy}
                data-testid="discovery-when"
                onChange={(event) => setSecond(event.target.value)}
              />
            </>
          ) : null}
          <div className="domain-correction__actions">
            <button
              type="button"
              className="domain-option"
              disabled={busy || draft.trim() === ''}
              data-testid="discovery-save"
              onClick={() => answer(prompt)}
            >
              That is it
            </button>
            <button
              type="button"
              className="domain-correction__cancel"
              disabled={busy}
              data-testid="discovery-skip"
              onClick={() => skip(prompt)}
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {agenda.answered === 0 ? null : (
        <>
          <button
            type="button"
            className="domain-linkish"
            disabled={busy}
            data-testid="discovery-changes-open"
            onClick={() => setShowing((held) => !held)}
          >
            {showing ? 'Hide what those answers changed' : 'What did those answers change?'}
          </button>
          {!showing ? null : (
            <ul className="domain-recent" data-testid="discovery-changes">
              {changes.map((change) => (
                <li key={change.prompt} className="domain-recent__row">
                  <span className="domain-recent__text">
                    {change.changed
                      ? `Because of that answer the app now says “${change.now}” — without it, “${change.without}”.`
                      : `That answer has not changed what the app suggests yet. It still says “${change.now}”.`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Panel>
  )
}
