import { useCallback, useMemo, useRef, useState } from 'react'
import { Panel } from '../../components/ui'
import { systemClock } from '../../domain/time'
import {
  authoringRecords,
  dayFromInput,
  destinationRecords,
  milestoneFor,
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
 * ## Why it is here, and the two places it is not
 *
 * **Not Now.** D-163's first rule is *never on Now's critical path*: Now is
 * where the app comes to the owner with one thing to do, and a question whose
 * answer will not change what that thing is has no business interrupting it.
 *
 * **Not Life either, and that was measured rather than argued.** It started
 * there, and `shell.spec.ts` holds Life to about a screen and a half on a
 * 360-wide phone — the budget section 7 spent Phase 5 winning back from a
 * screen that was homework. A panel took it to 2.24; one closed line and one
 * link, with no panel around them, still left it at 1.91. Life has no room, and
 * shaving a sentence until a measured constraint stops complaining is the move
 * the constraint exists to stop.
 *
 * **Insights is where it belongs on its own merits.** D-169 puts the review
 * loop on Insights and the domain pages; F02 asks for a *"what I understand / am
 * working out"* state distinct from the pre-recommendation guide; and AUD-0043
 * already puts a working-out panel here. A question about what the app does not
 * understand sits on the screen about what it does.
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
  const [third, setThird] = useState('')
  const [showing, setShowing] = useState(false)
  /**
   * Closed until tapped, like every other control on a Life surface.
   *
   * The first version rendered the question, its note and its box permanently,
   * and Life went from a screen and a half to two and a quarter on a 360-wide
   * phone — the exact wall section 7 spent Phase 5 removing, put back by the
   * panel whose own decision forbids becoming *"an onboarding questionnaire, a
   * domain maintenance chore"*. `shell.spec.ts` measures the height and said so.
   *
   * The closed line also says nothing about **which** area it is about, which
   * is the other thing that broke: the prompt names the area, and Life already
   * names every area exactly once.
   */
  const [open, setOpen] = useState(false)
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
      setOpen(false)
      setDraft('')
      setSecond('')
      setThird('')
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
  /**
   * What an answer becomes, per shape.
   *
   * Separated from the writing below so that **nothing is recorded as answered
   * that produced nothing**. A `discovery-response` says the prompt is settled
   * and stops it being asked again; writing one beside an empty result would
   * lose the question and the answer in the same gesture.
   */
  const build = (asked: DiscoveryPrompt, said: string, at: ReturnType<typeof moment>) => {
    if (asked.shape === 'destination') {
      return destinationRecords({ aim: said, domain: asked.domain }, situation, at)
    }
    if (asked.shape === 'milestone') {
      const destination = asked.destination
      if (destination === undefined) return undefined
      /*
       * `milestoneFor`, not the destination builder: the destination already
       * exists, and re-running it would write a second record carrying the same
       * aim — one aspiration appearing twice on his own page.
       */
      return milestoneFor(destination.destination, asked.domain, said, situation, at)
    }
    if (asked.shape === 'obligation') {
      const startsAt = minutesFromClock(second)
      const day = dayFromInput(third)
      /*
       * Both, or neither — F36, and the thing this control got wrong first.
       *
       * A first draft asked for a name and a time and then wrote `weekdays: [3]`,
       * which is the app inventing a Wednesday out of a question that never
       * mentioned one. *"Do not silently infer a consequential fact from
       * ambiguous prose"* is F36 in as many words, and a day of the week the
       * owner never said is exactly that.
       */
      if (startsAt === undefined || day === undefined) return undefined
      return authoringRecords(
        {
          kind: 'obligation',
          name: said,
          domain: asked.domain,
          startsAt,
          endsAt: startsAt + 60,
          dayId: day,
        },
        situation,
        at,
      )
    }
    const record =
      asked.destination === undefined
        ? undefined
        : memory.view.history.byId(asked.destination.source)
    if (record === undefined || record.kind !== 'destination') return undefined
    const revised = reviseDestinationRecord(
      record,
      asked.shape === 'baseline' ? { baseline: said } : { evidence: [said] },
      at,
    )
    return { entities: [], records: [revised], created: undefined }
  }

  const answer = (asked: DiscoveryPrompt) => {
    const said = draft.trim()
    if (said === '') return
    run(async () => {
      const at = moment()
      const built = build(asked, said, at)
      if (built === undefined || built.records.length === 0) return
      if (built.entities.length > 0) await memory.create(built)
      else await memory.append(built.records)
      /*
       * The produced record is the **first** one, which is what the agenda goes
       * back to when it says what the answer changed. For a destination that is
       * the destination; for a milestone it is the goal; for a revision it is
       * the superseding record.
       */
      await memory.append([discoveryResponseRecord(asked, 'answered', built.records[0]?.id, at)])
      setOpen(false)
      setDraft('')
      setSecond('')
      setThird('')
    })
  }

  /*
   * Nothing to ask and nothing answered is nothing to show.
   *
   * Life's first rule is that the owner should not need to visit it for routine
   * maintenance, and a panel reporting that it has no questions is the app
   * talking about itself on the one screen that exists to talk about him.
   */
  if (prompt === undefined && agenda.answered === 0) return null

  return (
    <Panel title="Getting to know you">
      {prompt === undefined ? (
        <p className="note" data-testid="discovery-quiet">
          Nothing the app is trying to work out just now.
        </p>
      ) : !open ? (
        /*
         * One line and one link, and nothing else.
         *
         * The closed state is measured: `shell.spec.ts` holds Life to about a
         * screen and a half on a 360-wide phone, and every sentence and every
         * button here is counted against that. **Not now** is not offered until
         * the question is, because skipping a question you have not read is not
         * a skip — and D-163's "always skippable" is about the question rather
         * than about the offer of one.
         */
        <p className="note" data-testid="discovery-closed">
          One answer would help the app know you better.{' '}
          <button
            type="button"
            className="domain-linkish"
            disabled={busy}
            data-testid="discovery-open"
            onClick={() => setOpen(true)}
          >
            What is it?
          </button>
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
                The app works around the span you give it. It will not guess at one.
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
              <label className="domain-correction__prompt" htmlFor="discovery-day">
                Which day?
              </label>
              <p className="note">
                One day. A weekly shape is the Day shape control below, which asks it properly.
              </p>
              <input
                id="discovery-day"
                type="date"
                className="domain-input"
                value={third}
                disabled={busy}
                data-testid="discovery-day"
                onChange={(event) => setThird(event.target.value)}
              />
            </>
          ) : null}
          <div className="domain-correction__actions">
            <button
              type="button"
              className="domain-option"
              disabled={
                busy ||
                draft.trim() === '' ||
                (prompt.shape === 'obligation' && (second === '' || third === ''))
              }
              data-testid="discovery-save"
              onClick={() => answer(prompt)}
            >
              That is it
            </button>
            <button
              type="button"
              className="domain-correction__cancel"
              disabled={busy}
              data-testid="discovery-leave"
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
