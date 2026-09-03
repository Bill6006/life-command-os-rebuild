import { useCallback, useMemo, useRef, useState } from 'react'
import { Panel, UnknownSet } from '../../components/ui'
import { systemClock } from '../../domain/time'
import {
  authoringRecords,
  destinationRecords,
  milestoneConfirmation,
  milestoneFor,
  destinationRef,
  minutesFromClock,
  proposeAuthoring,
  proposeDestination,
  reviseDestinationRecord,
  type AuthoringDraft,
  type AuthoringProposal,
} from '../../intelligence/authoring'
import {
  discoveryAgenda,
  discoveryChanges,
  discoveryResponseRecord,
  type DiscoveryPrompt,
} from '../../intelligence/discovery'
import {
  aimReadingRecord,
  describeOffer,
  describeReading,
  proposeInterpretedDestination,
  readAimIn,
} from '../../intelligence/interpret'
import type { LifeDomainId } from '../../domain/domains'
import type { Situation } from '../../intelligence/situation'
import type { IsoWeekday } from '../../domain/time'
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
/**
 * The seven days, in the owner's week order.
 *
 * ISO numbering, because that is what `CommitmentRecurrence` stores and what
 * `occursOn` reads — one numbering for the week, so a Monday means the same
 * thing in the form, in the record and in the engine.
 */
const WEEKDAYS: readonly { readonly value: string; readonly label: string }[] = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '7', label: 'Sunday' },
]

function weekdayFrom(value: string): IsoWeekday | undefined {
  const day = Number(value)
  if (!Number.isInteger(day) || day < 1 || day > 7) return undefined
  return day as IsoWeekday
}

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
  /**
   * The area the owner has chosen to file this in, where he has chosen one.
   *
   * Undefined means *where the question was*, which is the default and is the
   * brief's rule 4 written as a state rather than as a caution: nothing moves
   * unless he moves it. It is validated against the live reading below, so
   * editing the words after taking an offer cannot file the aim in an area the
   * new words do not name.
   */
  const [fileIn, setFileIn] = useState<LifeDomainId | undefined>(undefined)
  /** Whether he has answered the scope question, as against not yet. */
  const [answeredScope, setAnsweredScope] = useState(false)
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

  /**
   * What the obligation answer amounts to, built once — QA-84-004, D-188.
   *
   * The proposal and the record are made from the **same** draft, because a
   * confirmation composed from one object and a record written from another is
   * how a confirmation stops describing what happens.
   */
  const obligationDraft = (said: string): AuthoringDraft | undefined => {
    if (prompt === undefined) return undefined
    const startsAt = minutesFromClock(second)
    const weekday = weekdayFrom(third)
    if (startsAt === undefined || weekday === undefined) return undefined
    return {
      kind: 'obligation',
      name: said,
      domain: prompt.domain,
      startsAt,
      endsAt: startsAt + 60,
      weekdays: [weekday],
    }
  }

  /**
   * What the app will do, shown before it does it — the owner addendum, D-188.
   *
   * This card wrote the record straight from the box. The owner typed his aim
   * into *"What do you hope Career & Learning eventually looks like?"*, pressed
   * **That is it**, and believed he had confirmed an interpretation he was
   * never shown.
   *
   * Composed in `authoring.ts` rather than here, which is QA-84-005's standing
   * lesson: a sentence a surface builds inline is a sentence no test can hold
   * to what is actually written.
   */
  /**
   * What the words say, worked out as he types — routing 91, package 91.1.
   *
   * Recomputed from the text and from what he has already named, and from
   * nothing else. It is deterministic and in-process, so there is no request to
   * debounce and nothing to wait for; the offer appears under the box while the
   * box still has focus, which is the only moment at which *"is this about
   * money?"* is a question he can answer without effort.
   */
  const reading = useMemo(
    () =>
      prompt === undefined || prompt.shape !== 'destination' || draft.trim() === ''
        ? undefined
        : readAimIn(draft.trim(), prompt.domain, situation),
    [prompt, draft, situation],
  )

  /*
   * A choice only counts while it is still on offer.
   *
   * He can take the Money row and then keep typing, and the new words may name
   * something else or nothing. Filing the aim where the *previous* words pointed
   * would be the app acting on a reading it is no longer making — so the choice
   * is checked against the live offer rather than remembered.
   */
  // Any candidate the question is between, not only the single settled offer.
  const filedIn =
    fileIn !== undefined && (reading?.candidates ?? []).includes(fileIn) ? fileIn : undefined
  const area = (id: LifeDomainId) => situation.domains.labelFor(id)
  const offer = reading === undefined ? undefined : describeOffer(reading, area)
  const readingLine = reading === undefined ? undefined : describeReading(reading, area)

  const proposal: AuthoringProposal | undefined =
    prompt === undefined || draft.trim() === ''
      ? undefined
      : prompt.shape === 'destination' && reading !== undefined
        ? proposeInterpretedDestination(
            { aim: draft.trim(), domain: filedIn ?? prompt.domain },
            reading,
            situation,
          )
        : prompt.shape === 'destination'
          ? proposeDestination({ aim: draft.trim(), domain: prompt.domain }, situation)
          : prompt.shape === 'obligation'
            ? proposeAuthoring(
                obligationDraft(draft.trim()) ?? {
                  kind: 'obligation',
                  name: draft.trim(),
                  domain: prompt.domain,
                },
                situation,
              )
            : undefined

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
      setFileIn(undefined)
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
      /*
       * Nothing is written until the proposal says it can be — D-188.
       *
       * The same gate the domain page's form has had since package 3: a draft
       * with a problem in it builds nothing, and he is told what the problem
       * is rather than finding out from a record that never appeared.
       */
      const read = reading
      const into = filedIn ?? asked.domain
      const proposed =
        read === undefined
          ? proposeDestination({ aim: said, domain: into }, situation)
          : proposeInterpretedDestination({ aim: said, domain: into }, read, situation)
      if (proposed.problems.length > 0) return undefined
      const built = destinationRecords({ aim: said, domain: into }, situation, at)

      /*
       * The sibling row, and only when he took the offer — acceptance test 5.
       *
       * *"Declining costs nothing. Rejecting the interpretation leaves the aim
       * stored and produces no derived record."* So this is inside the branch
       * rather than beside it: keeping the aim where the question was writes
       * exactly what routing 84 wrote, byte for byte, and there is no row
       * anywhere saying the app had a thought about it.
       *
       * It goes **after** the destination and never before, because it carries
       * that record's id: what the app worked out points at what it was told,
       * which is the direction D-143 requires and the only direction that can
       * be checked.
       */
      const source = built.records[0]
      if (read === undefined || filedIn === undefined || source === undefined) return built
      return {
        ...built,
        records: [
          ...built.records,
          aimReadingRecord(read, filedIn, built.created ?? destinationRef(said), source.id, at),
        ],
      }
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
      /*
       * What the question asked for is what the record holds — QA-84-004.
       *
       * The question is *"Is there something that takes a regular chunk of your
       * week?"* and the first two drafts both stored something else. The first
       * invented `weekdays: [3]` from a form that never asked which day — the
       * app putting a Wednesday in his record out of nothing. The repair asked
       * for a **calendar date**, which stored a `one-off` span: no longer
       * invented, and no longer the regular week he was asked about either.
       *
       * A recurring question stores a recurring fact. The form asks which day
       * of the week, `authoringRecords` writes a `weekly` recurrence from it,
       * and the note no longer points at a Day-shape control that is not on
       * this screen.
       */
      const shaped = obligationDraft(said)
      if (shaped === undefined) return undefined
      if (proposeAuthoring(shaped, situation).problems.length > 0) return undefined
      return authoringRecords(shaped, situation, at)
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
      setFileIn(undefined)
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
          {prompt.prior === undefined ? null : (
            /*
             * Why it asked, when research is part of the reason — §13C.
             *
             * The permission's own condition: *"provenance must support
             * answering 'why did you ask me this?'"* So the claim is on the
             * card beside the question, in the words the prior is written in —
             * about people, with a citation — rather than as a fact about him.
             *
             * **Nothing here is a belief.** Skipping produces no inferred fact,
             * and his answer becomes the personal evidence; the prior does not
             * survive it, because the question it pointed at stops existing.
             */
            <p className="note" data-testid="discovery-prior">
              Why this one: {prompt.prior.claim} ({prompt.prior.citation}) — that is about people in
              general, not about you. Your own answer is the only thing kept here.
            </p>
          )}
          {prompt.shape !== 'milestone' ? null : (
            /*
             * What making this the next step will mean — F04, QA-84-005.
             *
             * A milestone is the one thing on this card that changes what the
             * app suggests, so it is said out loud rather than inferred
             * quietly, in the sentence `authoring.ts` composes for every other
             * surface that offers one.
             */
            <p className="note" data-testid="discovery-milestone-note">
              {milestoneConfirmation(
                draft,
                prompt.domain,
                situation.domains.labelFor(prompt.domain),
              )}
            </p>
          )}
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
                Which day of the week?
              </label>
              <p className="note">
                Kept as a part of every week, not as one date — which is what the question asked
                about. You can correct it on Life, where the rest of your week is.
              </p>
              <select
                id="discovery-day"
                className="domain-input"
                value={third}
                disabled={busy}
                data-testid="discovery-day"
                onChange={(event) => setThird(event.target.value)}
              >
                <option value="">Pick one</option>
                {WEEKDAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </>
          ) : null}
          {readingLine === undefined ? null : (
            /*
              What the words sound like, and the one choice that follows — the
              brief's rule 4 and accommodation row B1.

              **One option row inside the confirmation block, not a picker
              screen.** The app says what it read and offers to act on it. A
              settled reading keeps the aim where the question was until he says
              otherwise, so the default state of that control is the app having
              changed nothing.

              An **unresolved** scope carries as many answers as the question
              has, and pre-selects none of them: it is waiting, and B1's rule is
              that he is not sent to a picker screen rather than that a question
              may only ever have one answer (D-258, QA-91-020).
            */
            <div data-testid="discovery-reading">
              <p className="note">{readingLine}</p>
              {offer === undefined ? null : (
                <div className="domain-options">
                  <button
                    type="button"
                    className="domain-option"
                    aria-pressed={filedIn === undefined && (answeredScope || !offer.asking)}
                    disabled={busy}
                    data-testid="discovery-keep"
                    onClick={() => {
                      setFileIn(undefined)
                      setAnsweredScope(true)
                    }}
                  >
                    {offer.keep}
                  </button>
                  {offer.options.map((option) => (
                    <button
                      key={option.domain}
                      type="button"
                      className="domain-option"
                      aria-pressed={filedIn === option.domain}
                      disabled={busy}
                      data-testid={
                        offer.options.length === 1
                          ? 'discovery-refile'
                          : `discovery-refile-${option.domain}`
                      }
                      onClick={() => {
                        setFileIn(option.domain)
                        setAnsweredScope(true)
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {proposal === undefined ? null : (
            <div data-testid="discovery-proposal">
              <p className="domain-correction__prompt">{proposal.interpretation}</p>
              {proposal.creates.length === 0 ? null : (
                <ul className="domain-destination__list">
                  {proposal.creates.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
              <UnknownSet
                fromWords={reading?.unknowns ?? []}
                fromObject={proposal.unknowns.filter(
                  (line) => !(reading?.unknowns ?? []).includes(line),
                )}
                testId="discovery-unknowns"
              />
              {proposal.problems.map((problem) => (
                <p key={problem} className="note" data-testid="discovery-problem">
                  {problem}
                </p>
              ))}
            </div>
          )}

          <div className="domain-correction__actions">
            <button
              type="button"
              className="domain-option"
              disabled={
                busy ||
                draft.trim() === '' ||
                (proposal?.problems.length ?? 0) > 0 ||
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
