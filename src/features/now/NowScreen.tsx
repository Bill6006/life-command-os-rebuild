import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Panel, PrimarySurface, Row, Rows, Screen } from '../../components/ui'
import { newRecordId, type RecordId } from '../../domain/ids'
import type { LifeDomainId } from '../../domain/domains'
import type { CanonicalRecord } from '../../domain/records'
import type { MemoryView } from '../../memory/view'
import { renderRecommendation, type RecommendationSemantics } from '../../domain/recommendation'
import type { EntityIndex } from '../../domain/entities'
import { localDateTimeAt, systemClock, type DayBlock } from '../../domain/time'
import { entityRef } from '../../domain/entities'
import {
  beliefCorrectionRecord,
  coverageInterpretationRecord,
  describeBelief,
  domainStatusCorrectionRecord,
  forbidRecord,
} from '../../intelligence/corrections'
import {
  blockerQuestionFor,
  blockerStatement,
  standingBlockerRecords,
  type BlockerCause,
} from '../../intelligence/blockers'
import { decide, type Decision } from '../../intelligence/engine'
import { describePremise, type Explanation } from '../../intelligence/explain'
import { evidenceForDecision, type DecisionEvidence } from '../../intelligence/insights'
import { dueCheckIn, type DueCheckIn } from '../../intelligence/checkIn'
import { nextGuideStep } from '../../intelligence/guide'
import { growthAnswerRecords, type GrowthSuggestion } from '../../intelligence/growth'
import {
  availableActions,
  collectEpisodes,
  nextResumable,
  openEpisode,
  planLifecycle,
  readable,
  type Episode,
  type LifecycleAction,
  type MoveState,
  type ResumableMove,
} from '../../intelligence/lifecycle'
import {
  nextDueOutcome,
  outcomeRecord,
  settingQuestionFor,
  type OutcomeAnswer,
  type OutcomeQuestion,
  type PendingOutcome,
  type SettingOption,
} from '../../intelligence/outcomes'
import {
  answerRecord,
  questionFor,
  type QuestionOption,
  type QuestionSpec,
} from '../../intelligence/questions'
import { LIMITER_LABEL, type Situation } from '../../intelligence/situation'
import { startThreadRecord, threadOfferFor, type ThreadOffer } from '../../intelligence/threads'
import { hereNowWord, horizonWord } from '../../intelligence/vocabulary'
import { isPreview, isProduction } from '../../platform/buildInfo'
import { hashForDestination } from '../../platform/routing'
import {
  EvidenceConfidence,
  EvidenceLines,
  EvidenceNote,
  EvidenceRate,
} from '../evidence/EvidencePieces'
import { originResolver, type RecordOrigin } from '../history/origin'
import { BlockerQuestion, StandingControls } from '../life/DomainPanels'
import { useMemory } from '../memory/memoryContext'
import './NowScreen.css'

/**
 * Now — the proactive command surface (canonical plan sections 6 and 48).
 *
 * "Now is where the app comes to the owner." One move, why it, what it was
 * chosen over, where it stands, and — since Phase 3 — what to do about it.
 *
 * Section 6's list is what this screen may show and the order it shows it in:
 * the premise, one primary move, a concise reason, the tradeoff, the active
 * recommendation state, and a result follow-up when one is due. Nothing else.
 * The reasoning behind all of it is real, complete, and lives in the QA
 * inspector rather than here.
 *
 * ## Three things can be asked for, and only ever one at a time
 *
 * A result that is due beats everything: it is about something the owner
 * already did, it expires, and answering it is what makes the next decision
 * better. Below that, the lifecycle buttons for the move on screen. Below that,
 * the guide's one question — which only appears when an answer would land
 * somewhere different.
 */

/**
 * Where the move on screen stands.
 *
 * `shown` reads from the hour rather than assuming one — AUD-0002. "New
 * tonight" at half past eight in the morning was the app announcing the wrong
 * time of day inside a status label.
 */
function stateWord(state: MoveState, block: DayBlock): string {
  switch (state) {
    case 'shown':
      return `New ${horizonWord(block)}`
    case 'started':
      return 'Under way'
    case 'part-done':
      return 'Part done'
    case 'completed':
      return 'Done'
    case 'declined':
      return 'You passed on this'
    case 'unable-now':
      return 'You said not right now'
  }
}

/**
 * `decline` says **today** and not "tonight", and that is a concept rather
 * than a word — AUD-0002.
 *
 * The button is a same-day dismissal: `constraints.ts` holds a declined move
 * out for a local day, not for an evening. Naming it after the evening made a
 * morning tap read as a promise about a night that had not happened yet.
 */
const ACTION_WORDS: Record<LifecycleAction, string> = {
  start: 'Start it',
  complete: 'Done',
  /*
   * F10, and the second attempt at the words.
   *
   * The first was *"Got some of it done"*, and it contains **Done** — so a
   * browser computing accessible names finds two buttons in this row whose
   * names both match it, and a person scanning the row reads the shorter one
   * inside the longer one. Twenty-six browser assertions across three widths
   * said so before anybody had to have an opinion about it.
   *
   * This is what he would actually say, and it says it without saying the other
   * button's word.
   */
  'part-done': 'Only part of it',
  decline: 'Not today',
  'unable-now': "Can't right now",
  'try-another': 'Something else',
}

/**
 * The order the buttons read in, which is not the order the states list them.
 *
 * The thing the owner most often means comes first, and the two ways of saying
 * no sit together at the end so neither is the easy accident.
 */
const ACTION_ORDER: readonly LifecycleAction[] = [
  'start',
  'complete',
  // Beside **Done** rather than beside the two ways of saying no, because it is
  // a report of what happened and not a refusal — which is the distinction F10
  // says the product was collapsing.
  'part-done',
  'try-another',
  'unable-now',
  'decline',
]

/**
 * The `action-unable-now` record the owner has just written, so the blocker can
 * be attached to it.
 *
 * Superseding it rather than writing a second row is what keeps the episode
 * fold honest: `collectEpisodes` applies events in canonical order and a second
 * `action-unable-now` about the same recommendation would be a second event,
 * which is not what happened. He did one thing and then said why.
 */
function lastUnableNow(
  view: MemoryView,
  episode: Episode,
): Extract<CanonicalRecord, { kind: 'action-unable-now' }> | undefined {
  let found: Extract<CanonicalRecord, { kind: 'action-unable-now' }> | undefined
  for (const record of view.history.effective) {
    if (record.kind !== 'action-unable-now') continue
    if (record.recommendation !== episode.recommendation) continue
    if (found === undefined || record.recordedAt > found.recordedAt) found = record
  }
  return found
}

/**
 * Something left half-finished today, and the way back to it — F10.
 *
 * The controls are the state machine's own, which is what makes this a way back
 * rather than a second screen: `availableActions` on an `unable-now` episode
 * already allowed **started**, **completed** and **declined** before this phase,
 * and nothing offered them.
 */
/*
 * Exported so a gate can render it — QA-84-012, D-194.
 *
 * The catalogue that D-193 called closed was closed over `blockers.ts` and no
 * further. This panel composes blocker copy of its own in JSX — a title, two
 * state sentences, an interpolated note — and none of it could enter a check
 * that collects the return values of a function. What the owner receives is
 * rendered, so the check has to render.
 */
export function ResumePanel({
  resumable,
  entities,
  disabled,
  onAct,
}: {
  resumable: ResumableMove
  entities: EntityIndex
  disabled: boolean
  onAct: (action: LifecycleAction) => void
}) {
  const rendered = renderRecommendation(resumable.semantics, entities)
  // D-018: no subject, no sentence. A move whose object no longer resolves is
  // not offered back in vaguer words.
  if (!rendered.ok) return null

  return (
    <Panel title="Where you left off">
      <p className="now-resume__sentence" data-testid="resume-sentence">
        {rendered.rendered.sentence}
      </p>
      <p className="note" data-testid="resume-state">
        {/*
          Three states now, and the third is F09's.

          A move he pressed Start on and never marked finished is a carried
          intention with an open fate, and it used to fall off Now the moment
          something else was chosen. The `else` arm said "you said this did not
          fit at the time", which about a move he was in the middle of is
          simply false — so it gets its own sentence rather than the nearest
          one.
        */}
        {resumable.state === 'part-done'
          ? 'You got part of this done.'
          : resumable.state === 'started'
            ? 'You started this and did not mark it finished.'
            : 'You said this did not fit at the time.'}
        {resumable.blocker === undefined ? '' : ` ${resumable.blocker}`}
      </p>
      <div className="now-actions">
        {resumable.actions.map((action) => (
          <button
            key={action}
            type="button"
            className="now-act"
            disabled={disabled}
            data-testid={`resume-${action}`}
            onClick={() => onAct(action)}
          >
            {ACTION_WORDS[action]}
          </button>
        ))}
      </div>
      <p className="note">
        Nothing here is a nudge. It is on the screen because you started it, and it goes when the
        day does — {readable(resumable.state)} is a real place to leave something.
      </p>
    </Panel>
  )
}

/**
 * The first screen of a first run — QA-84-007, D-189.
 *
 * ## What it said, and why that was the whole product in one screen
 *
 * *"There is no history here yet"*, and then one control: **Open the QA
 * laboratory**. In production even that was hidden, so the first thing an
 * ordinary owner met was a screen with nothing on it at all. The abstention is
 * right and stays exactly as it was — the engine will not guess, and D-018 and
 * G-009 are why. What was wrong is that **abstaining from a recommendation was
 * treated as having nothing to offer**, and the two are not the same thing.
 *
 * ## So it names the ways on, and they are ordinary ones
 *
 * Both were already there and neither was reachable from here: the second
 * agenda on Insights asks what he is aiming at, and Life is where every area's
 * own page is. Nothing is invented to fill the screen — these are links to
 * controls that exist, and the headline still says the app knows nothing.
 */
function EmptyNow({ checkIn }: { checkIn: DueCheckIn | undefined }) {
  return (
    <Screen title="Now">
      <PrimarySurface eyebrow="Nothing loaded" headline="There is no history here yet.">
        <p>
          The engine will not guess. With nothing to go on it says so, rather than offering
          something plausible about a life it knows nothing about.
        </p>
      </PrimarySurface>

      {/*
        The check-in, on the one screen where it matters most — routing 94.

        **This was a defect the browser matrix found and nothing else could.**
        Every unit proof of the card ran against `dueCheckIn`, which is happy to
        answer on an empty store; the screen returns this component before it
        reaches the card, so on a history with nothing in it — the only history a
        new owner has — the ritual was reachable from More and from a typed hash
        and from nowhere he would look.

        That is the store the whole phase is about. It was measured at **one
        question a day**, and D-292's reason for building this before anything
        else is that *"every day without sampling is history the forecast will
        never have"*. Offering it below a paragraph about aspirations, on a
        screen that says there is nothing here, would have lost exactly the days
        the phase exists to stop losing.

        It goes **above** "where to start", because it is the shorter way in:
        three taps against a sentence he has to compose.
      */}
      {checkIn === undefined || checkIn.next === undefined ? null : (
        <Panel title={checkIn.label} testId="now-check-in">
          <p className="note" data-testid="now-check-in-note">
            {checkIn.totalCount - checkIn.answeredCount} of {checkIn.totalCount} readings still to
            answer. Nothing has to be answered before the rest of the app works.
          </p>
          <p>
            <a className="qa-link" href={hashForDestination('check-in')}>
              Open the check-in
            </a>
          </p>
        </Panel>
      )}

      <Panel title="Where to start">
        <p>
          Nothing here needs filling in before the app is useful. The quickest way in is to answer
          one thing about what you are aiming at — the app keeps your words exactly as you write
          them, and tells you what it will make of them before it makes anything.
        </p>
        <p>
          <a
            className="qa-link"
            href={hashForDestination('insights')}
            data-testid="empty-to-insights"
          >
            Answer one thing about you
          </a>
        </p>
        <p>
          <a className="qa-link" href={hashForDestination('life')} data-testid="empty-to-life">
            Or look at the areas of your life
          </a>
        </p>
      </Panel>

      {isProduction ? null : (
        <Panel title="Try a life on">
          <p>
            The QA laboratory has a dozen invented histories — a week of four-hour nights, a settled
            custody arrangement, a week pointed at the house, a month of what actually worked. Load
            one and come back here.
          </p>
          <p>
            <a className="qa-link" href={hashForDestination('qa')}>
              Open the QA laboratory
            </a>
          </p>
        </Panel>
      )}
    </Screen>
  )
}

export function NowScreen() {
  const memory = useMemory()
  const [working, setWorking] = useState(false)
  /*
   * Closed until asked for, and closed again whenever the decision changes.
   *
   * Section 51: Now stays action-first and uncluttered, and the evidence is a
   * "compact secondary entry point". Keying the panel to the move it belongs
   * to is what stops it staying open across a recomputation and showing the
   * evidence for a suggestion that is no longer the one on screen.
   */
  const [evidenceFor, setEvidenceFor] = useState<string | undefined>(undefined)

  /**
   * The move he most recently said no to, for as long as this screen is open.
   *
   * Session-local rather than derived, and deliberately so: a refusal is not a
   * veto (D-045, section 20), and nothing about it may be inferred from the
   * store. What the screen offers is a chance to say the stronger thing while
   * he is still thinking about the weaker one.
   */
  const [justRefused, setJustRefused] = useState<RecommendationSemantics | undefined>(undefined)
  /**
   * The first step of a growth answer, while the second is on screen — AUD-0017.
   *
   * Session state and nothing more: no record is written until both steps are
   * answered or the second is skipped, so a flow abandoned halfway leaves the
   * history exactly as it was rather than an occasion with a result and no
   * account of where it happened.
   */
  const [heldAnswer, setHeldAnswer] = useState<OutcomeAnswer | undefined>(undefined)

  /**
   * The move he has just said he cannot do, while the app asks what was in the
   * way — F07, D-164.
   *
   * Session state and nothing more, exactly like `justRefused` above and for
   * the same reason: the inability is already recorded, and this is the app
   * asking one optional question about it. Skipping the question leaves the
   * cause unknown, which D-164 says plainly is better than guessing at it.
   */
  const [blocked, setBlocked] = useState<RecommendationSemantics | undefined>(undefined)

  /**
   * The coverage response, open or closed — AUD-0038(a).
   *
   * Closed by default and closed again the moment it is used, because Now is
   * action-first: an area the app has not heard about is worth one line and two
   * links, not a form waiting on the screen he opens every evening.
   */
  const [coverageOpen, setCoverageOpen] = useState(false)
  const [coverageDraft, setCoverageDraft] = useState('')

  /*
   * A synchronous latch, deliberately a ref rather than state.
   *
   * Two taps a hundred milliseconds apart both read the same rendered state,
   * because React has not re-rendered between them. `busy` cannot stop the
   * second; a ref set during the first event handler can. The engine's own
   * guards make a duplicate harmless either way — the episode is keyed by what
   * it is about, so two records fold into one — but the cheapest place to stop
   * a double tap is before it becomes two records.
   */
  const inFlight = useRef(false)

  const moment = useMemo(
    () => ({
      now: memory.now,
      zone: memory.zone,
      weekStartsOn: memory.weekStartsOn,
      // What this session has already put on screen today — AUD-0025. It comes
      // down as data on the moment because the engine is pure and clock-free,
      // and reaching for a ledger from inside it would breach that invisibly.
      shown: memory.shown,
    }),
    [memory.now, memory.zone, memory.weekStartsOn, memory.shown],
  )

  const decision = useMemo(() => decide(memory.view, moment), [memory.view, moment])

  /*
   * Note that this move was put in front of him, and note it after the render.
   *
   * D-043 is untouched: nothing is written. This is the session's own count of
   * what has been on screen, and it is stamped with the moment it was shown at
   * — so the move currently up is never marked down for being up. It starts
   * counting against itself only once the clock has moved on, which is exactly
   * the case the audit reproduced: the identical sentence at 06:30, 10:00,
   * 14:00 and 19:00 of one day.
   */
  const onScreen = decision.evaluation?.candidate.id
  const { noteShown } = memory
  useEffect(() => {
    if (onScreen === undefined) return
    noteShown(onScreen)
  }, [onScreen, noteShown])

  // The guide re-runs the decision under each possible answer, so it is real
  // work — worth doing once per history rather than once per render.
  const guide = useMemo(() => nextGuideStep(memory.view, moment), [memory.view, moment])

  const due = useMemo(
    () => nextDueOutcome(memory.view, moment, decision.situation.entities),
    [memory.view, moment, decision.situation.entities],
  )

  // Whether a check-in is open and unfinished — routing 94. Cheap: it reads the
  // record log and the schedule, and decides nothing.
  const checkIn = useMemo(() => dueCheckIn(memory.view, moment), [memory.view, moment])

  const append = useCallback(
    (build: () => readonly Parameters<typeof memory.append>[0][number][]) => {
      if (inFlight.current) return
      inFlight.current = true
      setWorking(true)
      void memory.append(build()).finally(() => {
        inFlight.current = false
        setWorking(false)
      })
    },
    [memory],
  )

  if (!memory.ready) {
    return (
      <Screen title="Now">
        <Panel tone="quiet">
          <p className="note">Opening your history…</p>
        </Panel>
      </Screen>
    )
  }

  if (memory.snapshot.records.length === 0) return <EmptyNow checkIn={checkIn} />

  const busy = working || memory.busy

  const answerGuide = (spec: QuestionSpec, option: QuestionOption) => {
    // The answer is about the moment being asked about, and is written down
    // now. Under time travel those genuinely differ; within one session they
    // are what tells two answers apart.
    append(() => [
      answerRecord(spec, option, {
        now: memory.now,
        zone: memory.zone,
        recordedAt: systemClock().now(),
      }),
    ])
  }

  /*
   * Closing the coverage loop where it was opened — AUD-0038(a).
   *
   * The same two records the Life domain page writes, from the same two
   * functions. Nothing is interpreted here and nothing new is written: "I've
   * been keeping on top of this" is an interpretation of the owner's own
   * attention, and "something's changed" is his own sentence joining the
   * area's history.
   */
  const markCoverageReviewed = (domain: LifeDomainId) => {
    append(() => [
      coverageInterpretationRecord(domain, 'moderate', {
        now: memory.now,
        zone: memory.zone,
        recordedAt: systemClock().now(),
      }),
    ])
    setCoverageOpen(false)
    setCoverageDraft('')
  }

  const correctCoverageStatus = (domain: LifeDomainId, summary: string) => {
    const trimmed = summary.trim()
    if (trimmed === '') return
    append(() => [
      domainStatusCorrectionRecord(domain, trimmed, {
        now: memory.now,
        zone: memory.zone,
        recordedAt: systemClock().now(),
      }),
    ])
    setCoverageOpen(false)
    setCoverageDraft('')
  }

  const act = (semantics: RecommendationSemantics, situation: Situation) => {
    return (action: LifecycleAction) => {
      /*
       * Hold on to what he just said no to — AUD-0050.
       *
       * The refused move leaves the screen immediately, because a move refused
       * in this block is out of the running for it (AUD-0023). So the offer to
       * stop it for good has to be about the move he just pressed no on rather
       * than about whatever came next, and this is the only place that knows
       * which one that was.
       */
      if (action === 'decline' || action === 'unable-now' || action === 'try-another') {
        setJustRefused(semantics)
      }
      /*
       * And the one question D-164 allows, on the one action it is about.
       *
       * `unable-now` only. A decline is disagreement and a request for
       * something else is a request; neither is a fact about the evening, and
       * asking why after either would be the app arguing with him.
       */
      if (action === 'unable-now') setBlocked(semantics)
      append(() => {
        const planned = planLifecycle({
          view: memory.view,
          situation,
          semantics,
          action,
          recordedAt: systemClock().now(),
        })
        return planned.records
      })
    }
  }

  const answerOutcome = (
    pending: PendingOutcome,
    question: OutcomeQuestion,
    answer: OutcomeAnswer,
    setting?: SettingOption,
  ) => {
    append(() => [
      outcomeRecord(
        pending.episode,
        question.aspect,
        answer,
        {
          now: memory.now,
          zone: memory.zone,
          recordedAt: systemClock().now(),
        },
        undefined,
        /*
         * One record, written after both steps — AUD-0017.
         *
         * The occasion arrives with the answer rather than after it. Writing
         * the result on the first tap and the setting as a second record would
         * leave a window in which the occasion existed with no setting the
         * owner had in fact already given, and `growthSuggestions` reads the
         * setting off the result outcome.
         */
        answer.help === undefined
          ? undefined
          : setting?.setting === undefined
            ? { help: answer.help }
            : { help: answer.help, setting: setting.setting },
      ),
    ])
  }

  const correct = (belief: string) => {
    append(() => [
      beliefCorrectionRecord(belief, 'reject', 'The owner said this is not right', {
        now: memory.now,
        zone: memory.zone,
        recordedAt: systemClock().now(),
      }),
    ])
  }

  /*
   * "Stop suggesting this" — section 4.3's sixth action, AUD-0050.
   *
   * Behind the decline rather than beside it, and behind a confirmation, because
   * a veto is the most permanent thing the owner can do and the easiest to do by
   * accident on a phone. It is offered only once he has already refused this
   * move today, so it is never the first thing a thumb finds.
   *
   * Two scopes, and the wider one says what it is. Forbidding an area suppresses
   * *recommendations* from it and leaves the area in the model, in coverage and
   * on Life — section 4.1 forbids a domain-off switch, and this is not one.
   */
  const forbid = (semantics: RecommendationSemantics, scope: 'move' | 'area') => {
    const entities = decision.situation.entities
    const object = entities.labelFor(semantics.target.object) ?? 'this'
    const area = decision.situation.domains.labelFor(semantics.domain)
    append(() => [
      scope === 'move'
        ? forbidRecord(
            semantics.target.object,
            `Stop suggesting ${object}`,
            { now: memory.now, zone: memory.zone, recordedAt: systemClock().now() },
            [semantics.domain],
          )
        : forbidRecord(
            entityRef('life-domain', semantics.domain),
            `Stop suggesting anything from ${area}`,
            { now: memory.now, zone: memory.zone, recordedAt: systemClock().now() },
            [semantics.domain],
          ),
    ])
  }

  /*
   * Starting a course — AUD-0020.
   *
   * One tap, beside the move it would be the first occasion of. There is no
   * generic thread-creation control anywhere in the app: each of the three
   * kinds is offered in the one situation it answers, which is what keeps this
   * a strategic skeleton rather than a project-management subsystem.
   *
   * It writes a record and nothing else. What that record does to a decision
   * happens later, in the ranking, through `thread-fit` — a thread never
   * bypasses the arbiter.
   */
  const startThread = (offer: ThreadOffer) => {
    append(() => [
      startThreadRecord(
        {
          kind: offer.kind,
          subject: offer.subject,
          subjectLabel: offer.subjectLabel,
          domain: offer.domain,
          // The length he was shown, so the record says what he agreed to
          // rather than what the kind usually means — AUD-0009.
          steps: offer.steps,
          intent: offer.intent,
        },
        { now: memory.now, zone: memory.zone, recordedAt: systemClock().now() },
      ),
    ])
  }

  const answerGrowth = (suggestion: GrowthSuggestion, agreed: boolean) => {
    // Both answers are recorded, and both are read. Agreeing writes what
    // changed; "not yet" writes that the area was looked at by the person who
    // would know, which the coverage engine counts as coverage. A button that
    // records nothing anybody reads is D-029's mistake with a nicer label.
    append(() =>
      growthAnswerRecords(suggestion, agreed, {
        now: memory.now,
        zone: memory.zone,
        recordedAt: systemClock().now(),
      }),
    )
  }

  /**
   * What the owner said was in the way — F07, the field that did nothing.
   *
   * Two records at most: the inability is already written, so this supersedes
   * it with the same record carrying the blocker, and adds a `constraint` where
   * the cause is about the world rather than about tonight.
   */
  const answerBlocker = (semantics: RecommendationSemantics, cause: BlockerCause) => {
    const moveName = decision.situation.entities.labelFor(semantics.target.object) ?? 'this'
    const episode = openEpisode(
      collectEpisodes(memory.view, memory.zone),
      semantics.target,
      decision.situation.dayId,
    )
    const written = episode === undefined ? undefined : lastUnableNow(memory.view, episode)
    const moment = {
      now: memory.now,
      zone: memory.zone,
      recordedAt: systemClock().now(),
    }
    append(() => [
      ...(written === undefined
        ? []
        : [
            {
              ...written,
              id: newRecordId(),
              recordedAt: moment.recordedAt,
              blocker: blockerStatement(cause, moveName),
              supersedes: written.id,
            },
          ]),
      ...standingBlockerRecords(cause, semantics, moveName, semantics.domain, moment),
    ])
    setBlocked(undefined)
  }

  const local = localDateTimeAt(memory.now, memory.zone)
  const explanation = decision.explanation

  /*
   * Something started or interrupted today that has not been settled — F10.
   *
   * The stop routing 83's instrument found: "Can't right now" was recorded and
   * the move left the screen, with `TRANSITIONS` allowing the return and no
   * surface offering it. It is offered here rather than pushed back into the
   * ranking, because a move blocked in this block is genuinely out of the
   * running for it and what was missing is an **intention he already had**.
   */
  const resumable = nextResumable(memory.view, decision.situation, explanation?.semantics)
  const blockerDecision =
    blocked === undefined
      ? undefined
      : blockerQuestionFor(
          decision.situation,
          blocked,
          decision.situation.entities.labelFor(blocked.target.object) ?? 'this',
        )

  /*
   * Whether a course is worth offering beside this move.
   *
   * Worked out here rather than on the `Decision`, and the placement is the
   * point: `engine.ts` knows nothing about threads at all
   * (`tests/unit/architecture-guards.test.ts` fails the build if it learns), so
   * there is no way for a course to reach the chosen move except through the
   * ranking. An offer is a question on a screen, not a recommendation.
   */
  const threadOffer =
    explanation === undefined
      ? undefined
      : threadOfferFor(
          decision.situation.threads,
          explanation.semantics.target,
          explanation.rendered.subjectLabel,
          decision.situation.capacity.recoveryNights,
        )

  return (
    <Screen title="Now">
      {memory.travelled && !isProduction ? (
        <p className="now-travelled" data-testid="clock-moved">
          The clock is set to {local.dayId} {local.timeOfDay}.{' '}
          <button type="button" className="now-linkish" onClick={() => memory.returnToNow()}>
            Back to the real time
          </button>
        </p>
      ) : null}

      {/*
        A result that is due comes first.

        It is about something already done, it expires, and answering it is what
        makes the next decision better than the last one. Putting it under the
        recommendation would be putting the past behind the future on a screen
        the owner scrolls with one thumb.
      */}
      {due === undefined ? null : (
        <OutcomePanel
          pending={due}
          situation={decision.situation}
          disabled={busy}
          held={heldAnswer}
          onHeld={setHeldAnswer}
          onAnswer={answerOutcome}
          onReading={answerGuide}
        />
      )}

      {explanation === undefined ? (
        <>
          {/*
            The line that says where he is, in every state — AUD-0023, AUD-0034.

            It was rendered only when there was a move, so on the screens with
            the least on them — three passes in a row, or an evening the app has
            nothing for — the one piece of orientation the screen offers
            disappeared at the moment it was most needed. It is a statement about
            the situation rather than about the decision, and it is true whether
            or not there is one.
          */}
          <p className="now-premise" data-testid="now-premise">
            {describePremise(decision.situation)}
          </p>

          <PrimarySurface
            eyebrow={decision.situation.limiter?.summary ?? 'Nothing pressing'}
            headline={decision.noAction?.headline ?? 'Nothing to suggest.'}
          >
            <p data-testid="now-reason">{decision.noAction?.detail}</p>
          </PrimarySurface>
        </>
      ) : (
        <>
          <p className="now-premise" data-testid="now-premise">
            {explanation.premise}
          </p>

          <PrimarySurface
            eyebrow={explanation.rendered.verbLabel}
            headline={explanation.rendered.sentence}
          >
            <p data-testid="now-reason">{explanation.rendered.reason}</p>
          </PrimarySurface>

          {/*
            No buttons on a deferral — AUD-0024.

            There is nothing to start, nothing to finish and nothing to decline:
            the app is saying the move is right and the hour is not, and the way
            back is the hour arriving. Drawing the five lifecycle controls under
            it would ask him to act on a sentence whose whole content is that
            acting can wait.
          */}
          {decision.kind === 'hold' ? null : (
            <MoveActions
              state={decision.state ?? 'shown'}
              disabled={busy}
              onAct={act(explanation.semantics, decision.situation)}
            />
          )}

          <StopSuggesting
            refused={justRefused}
            entities={decision.situation.entities}
            area={
              justRefused === undefined
                ? ''
                : decision.situation.domains.labelFor(justRefused.domain)
            }
            block={decision.situation.block}
            disabled={busy}
            onForbid={(scope) => {
              if (justRefused === undefined) return
              forbid(justRefused, scope)
              setJustRefused(undefined)
            }}
            onDismiss={() => setJustRefused(undefined)}
          />

          <DetailPanel
            explanation={explanation}
            entities={decision.situation.entities}
            state={decision.state}
            block={decision.situation.block}
            disabled={busy}
            onCorrect={correct}
          />

          <EvidencePanel
            decision={decision}
            originFor={originResolver(memory.view.history)}
            open={evidenceFor === explanation.rendered.sentence}
            onToggle={() =>
              setEvidenceFor((held) =>
                held === explanation.rendered.sentence ? undefined : explanation.rendered.sentence,
              )
            }
          />
        </>
      )}

      {/*
        The response to the flag, on the screen that raised it — AUD-0038(a).

        Directly under the decision, because that is where the "Out of date"
        line is: as the primary surface's eyebrow when there is nothing to
        suggest, and as a row of the reasoning when there is. Section 8's whole
        point is that the owner should not have to patrol domain pages, and
        raising a gap here while keeping the response two taps away on Life was
        the loop left open.

        It draws only for a `coverage` limiter. The other three kinds are
        obstacles in the evening — a body short of rest, a night nearly over —
        and neither of these controls answers one of those. D-063: coverage is
        the app's own blind spot, not a fact about him, and it is the one
        limiter he can close by telling it something.
      */}
      {decision.situation.limiter?.kind !== 'coverage' ? null : (
        <div className="arrives">
          <Panel title={LIMITER_LABEL.coverage}>
            <p className="domain-coverage__summary" data-testid="now-coverage-summary">
              {decision.situation.limiter.summary}
            </p>
            <StandingControls
              label={decision.situation.domains.labelFor(decision.situation.limiter.domain)}
              inputId={`now-status-${decision.situation.limiter.domain}`}
              disabled={busy}
              open={coverageOpen}
              draft={coverageDraft}
              onOpen={() => setCoverageOpen(true)}
              onClose={() => {
                setCoverageOpen(false)
                setCoverageDraft('')
              }}
              onDraftChange={setCoverageDraft}
              onReviewed={() => markCoverageReviewed(decision.situation.limiter!.domain)}
              onSubmit={(summary) =>
                correctCoverageStatus(decision.situation.limiter!.domain, summary)
              }
            />
          </Panel>
        </div>
      )}

      {/*
        Something the evidence says has changed — section 9.

        Below the move and above the question, because it is neither. It is not
        what to do tonight and it is not something the engine needs an answer to
        in order to decide; it is a finding about his daughter that he is the
        only person who can confirm. Only ever one at a time, for the same
        reason the guide asks one question at a time.
      */}
      {decision.growth[0] === undefined ? null : (
        <GrowthPanel
          suggestion={decision.growth[0]}
          disabled={busy}
          onAnswer={(agreed) => answerGrowth(decision.growth[0]!, agreed)}
        />
      )}

      {/*
        Something worth keeping going — AUD-0020.

        Only when there is nothing about his daughter to answer first, and only
        one at a time, for the same reason the guide asks one question at a
        time: this screen is read with one thumb and a spare minute.
      */}
      {decision.growth[0] !== undefined || threadOffer === undefined ? null : (
        <ThreadOfferPanel
          offer={threadOffer}
          disabled={busy}
          onStart={() => startThread(threadOffer)}
        />
      )}

      {/*
        What was in the way, asked about the move he just pressed — F07, D-164.

        At the top level rather than inside the branch that draws the move,
        because the move he tapped **has left the screen** — a move refused or
        blocked in this block is out of the running for it (AUD-0023). Nested
        under the explanation it appeared only when something else happened to
        take its place, and vanished on exactly the evenings the app had nothing
        else to offer, which is where the answer is worth most.
      */}
      {blockerDecision === undefined || blocked === undefined ? null : (
        <BlockerQuestion
          decision={blockerDecision}
          disabled={busy}
          onAnswer={(cause) => answerBlocker(blocked, cause as BlockerCause)}
          onLeave={() => setBlocked(undefined)}
        />
      )}

      {/*
        Something you left half-finished today — F10.

        Below the move and below the question, because it is neither: it is not
        what to do next and it is not something the app needs an answer to. One
        at a time, like everything else on this screen.
      */}
      {resumable === undefined ? null : (
        <ResumePanel
          resumable={resumable}
          entities={decision.situation.entities}
          disabled={busy}
          onAct={(action) => act(resumable.semantics, decision.situation)(action)}
        />
      )}

      <GuidePanel
        question={guide.kind === 'question' ? guide.question : undefined}
        disabled={busy}
        onAnswer={answerGuide}
      />

      {/*
        A check-in is open — routing 94, and the only thing this phase puts on
        Now.

        **Below the guide's question rather than above it**, and the ordering is
        the decision. The guide asks what would change what he is told to do in
        the next hour; the check-in feeds a score and a history the forecast is
        built from later. When both are on the screen the one about tonight goes
        first, or the ritual quietly outranks the decision it exists to serve.

        It says nothing at all once the check-in is finished, which is the one
        place this phase gets to spend on not speaking. A card standing all
        evening after he has already answered is AUD-0025's repetition arriving
        through a new door.
      */}
      {checkIn === undefined || checkIn.next === undefined ? null : (
        <Panel title={checkIn.label} tone="quiet" testId="now-check-in">
          <p className="note" data-testid="now-check-in-note">
            {checkIn.totalCount - checkIn.answeredCount} of {checkIn.totalCount} readings still to
            answer.
          </p>
          <p>
            <a className="qa-link" href={hashForDestination('check-in')}>
              Open the check-in
            </a>
          </p>
        </Panel>
      )}

      {isProduction ? null : (
        <p className="note">
          {isPreview ? 'Preview build. ' : ''}Everything here is invented.{' '}
          <a className="qa-link" href={hashForDestination('qa')}>
            The QA laboratory
          </a>{' '}
          shows every fact, every move considered, what it learned and what would change this
          answer.
        </p>
      )}
    </Screen>
  )
}

/**
 * What the owner can do about the move on screen.
 *
 * Which buttons are *live* comes from the state machine rather than from a list
 * written here, so a transition that cannot be made cannot be tapped — pressing
 * **Done** twice is not a thing the screen lets you try.
 *
 * **Every button is always drawn, live or not**, and that is not a styling
 * preference. Removing one re-flows the row: tap **Start it** and **Done**
 * slides into the space under the finger that has not lifted yet, so a fast
 * double tap on "start this" records "I have done this". The engine would take
 * it — it is a legal transition and a plausible thing to have meant. Nothing
 * downstream can tell that apart from the truth. So the target does not move.
 */
function MoveActions({
  state,
  disabled,
  onAct,
}: {
  state: MoveState
  disabled: boolean
  onAct: (action: LifecycleAction) => void
}) {
  const allowed = availableActions(state)
  if (allowed.length === 0) return null

  return (
    <div className="now-actions" data-testid="now-actions">
      {ACTION_ORDER.map((action) => (
        <button
          key={action}
          type="button"
          className={
            action === 'start' || action === 'complete' ? 'now-act now-act--go' : 'now-act'
          }
          disabled={disabled || !allowed.includes(action)}
          onClick={() => onAct(action)}
        >
          {ACTION_WORDS[action]}
        </button>
      ))}
    </div>
  )
}

/**
 * The result of something the owner already did.
 *
 * One question at a time, the same discipline the guide follows, and the first
 * one is the renderer's own follow-up — so the subject that survived into the
 * recommendation survives into the question about it.
 */
function OutcomePanel({
  pending,
  situation,
  disabled,
  held,
  onHeld,
  onAnswer,
  onReading,
}: {
  pending: PendingOutcome
  situation: Situation
  disabled: boolean
  /** The first step's answer, while the second step is on screen — AUD-0017. */
  held: OutcomeAnswer | undefined
  onHeld: (answer: OutcomeAnswer | undefined) => void
  onAnswer: (
    pending: PendingOutcome,
    question: OutcomeQuestion,
    answer: OutcomeAnswer,
    setting?: SettingOption,
  ) => void
  onReading: (spec: QuestionSpec, option: QuestionOption) => void
}) {
  const entities = situation.entities
  /*
   * The reading comes first, and where there is one there is no grade (D-089).
   *
   * This used to ask "how much did a walk do for you?" and offer four levels of
   * difference. That is the causal question the system exists to answer, handed
   * to the owner — and his answer came back to him later as a percentage
   * labelled as an observed fact. Where the app can read the state itself, it
   * asks him for the reading and works the rest out.
   *
   * It is still one question. The count of things asked has not moved; what
   * changed is which one, and who does the thinking.
   */
  const reading = pending.reading === undefined ? undefined : questionFor(pending.reading)
  if (reading !== undefined) {
    return (
      <Panel title="Since then">
        <p className="now-question" data-testid="now-reading">
          {reading.prompt(situation)}
        </p>
        <div className="now-options">
          {reading.options(situation).map((option) => (
            <button
              key={option.id}
              type="button"
              className="now-option"
              disabled={disabled}
              onClick={() => onReading(reading, option)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Panel>
    )
  }

  const question: OutcomeQuestion | undefined = pending.questions[0]
  if (question === undefined) return null

  /*
   * And where it happened — AUD-0017, the load-bearing half.
   *
   * The claim the app was making about his daughter — "she handles this
   * independently now" — is about **generalisation**, and the evidence was
   * about **repetition**: three good goes at any interval, in any place, with
   * anyone. Three weeks apart at the same restaurant with her father at the
   * table supports "she can do this here, with me", and "independently now" is
   * what got written down.
   *
   * So answering a growth outcome is a two-step flow. That is an interaction
   * change rather than a label change, which is why it belongs before Phase 9
   * rather than after it.
   */
  const setting = held === undefined ? undefined : settingQuestionFor(pending.episode, entities)
  if (held !== undefined && setting !== undefined) {
    return (
      <Panel title="Earlier">
        <p className="now-question" data-testid="now-outcome-setting">
          {setting.prompt}
        </p>
        <div className="now-options">
          {setting.options.map((option) => (
            <button
              key={option.id}
              type="button"
              className="now-option"
              disabled={disabled}
              onClick={() => {
                onAnswer(pending, question, held, option)
                onHeld(undefined)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Panel>
    )
  }

  return (
    <Panel title="Earlier">
      <p className="now-question" data-testid="now-outcome">
        {question.prompt}
      </p>
      <div className="now-options">
        {question.answers.map((answer) => (
          <button
            key={answer.id}
            type="button"
            className="now-option"
            disabled={disabled}
            onClick={() => {
              // A growth answer opens the second step rather than writing. Every
              // other answer is one tap, exactly as it was.
              if (answer.help !== undefined && settingQuestionFor(pending.episode, entities)) {
                onHeld(answer)
                return
              }
              onAnswer(pending, question, answer)
            }}
          >
            {answer.label}
          </button>
        ))}
      </div>
    </Panel>
  )
}

/**
 * The rows under the decision, or nothing at all.
 *
 * Every row here is conditional, and on an evening with no limiter and only one
 * candidate all of them are absent — which rendered an empty bordered card with
 * padding under the recommendation. A panel with nothing in it is not a quiet
 * panel; it is a piece of furniture the owner has to work out.
 */
function DetailPanel({
  explanation,
  entities,
  state,
  block,
  disabled,
  onCorrect,
}: {
  explanation: Explanation
  /** So a correction can name what it is about, in every aspect (R3-B2). */
  entities: EntityIndex
  state: MoveState | undefined
  block: DayBlock
  disabled: boolean
  onCorrect: (belief: string) => void
}) {
  const rows = [
    /*
      Which course this belongs to — AUD-0020.

      First, and above the limiter, because it is the part of the reason the
      owner cannot work out from the sentence itself. A thread moves the
      ranking; **a hidden plan is worse than no plan**, so the app says which
      one and where in it, every time one applies.
    */
    explanation.partOf === undefined ? undefined : { label: 'Part of', value: explanation.partOf },
    /*
      One thing that is part of the same occasion — AUD-0022, F42.

      A row rather than a second card, and directly under the move it belongs
      to, because that is what it is about. Section 6's "Now must not become a
      feed of cards" holds: nothing new is rendered, and the clause is advisory —
      there is no control on it, no episode behind it and no follow-up question
      about it.
    */
    explanation.alongside === undefined
      ? undefined
      : { label: 'And while you are there', value: explanation.alongside },
    explanation.limiter === undefined
      ? undefined
      : { label: explanation.limiter.label, value: explanation.limiter.summary },
    explanation.instead === undefined
      ? undefined
      : { label: 'Chosen over', value: explanation.instead },
    explanation.insteadBecause === undefined
      ? undefined
      : { label: 'Why this one', value: explanation.insteadBecause },
    /*
      How close it was — AUD-0033.

      The arbiter already knew and said so only to the trace, so a hundredth of
      a point and a fifth of a point produced identical screens. It sits under
      "why this one" because that is the row it qualifies: the owner learns
      when the app is genuinely sure and when it is picking between near-equals,
      which is exactly what makes a recommendation easy to accept or easy to
      overrule.
    */
    explanation.closeCall === undefined
      ? undefined
      : { label: 'How close', value: explanation.closeCall },
    state === undefined || state === 'shown'
      ? undefined
      : { label: 'Where this stands', value: stateWord(state, block) },
  ].filter((row): row is { label: string; value: string } => row !== undefined)

  const belief = explanation.restsOnBelief
  const restsOn = explanation.restsOn
  const named = explanation.restsOnNamed

  if (rows.length === 0 && restsOn === undefined) return null

  return (
    <Panel>
      {rows.length === 0 ? null : (
        <Rows>
          {rows.map((row) => (
            <Row key={row.label} label={row.label} value={row.value} />
          ))}
        </Rows>
      )}

      {/*
        What the decision rests on, and a way to disagree with it.

        Section 62 requires a learned pattern to be correctable, and a belief
        the owner cannot see is a belief they cannot correct. This is the only
        place the learning is stated in words, so it is the only place the
        correction can honestly be offered — beside the decision it moved,
        rather than on a screen nobody visits.
      */}
      {restsOn === undefined || belief === undefined ? null : (
        <p className="now-rests" data-testid="now-rests-on">
          {restsOn}{' '}
          <button
            type="button"
            className="now-linkish"
            disabled={disabled}
            /*
              Short enough for a thumb, and named for anyone who cannot see
              which sentence it sits under (sections 37 and D-039).

              `restsOnNamed` rather than the key alone — QA-83-002. Read from
              the key, this said "correct what **move** does for you" under a
              card headed "Move for 25 minutes: a walk" and beside an evidence
              panel saying "getting out for a walk". It now says what the
              sentence directly above it says, because it is asking about the
              same thing.
            */
            aria-label={`Not how it went — correct ${describeBelief(belief, entities, named)}`}
            onClick={() => onCorrect(belief)}
          >
            Not how it went
          </button>
        </p>
      )}
    </Panel>
  )
}

/**
 * The evidence behind the move on screen (canonical plan section 51).
 *
 * Everything here comes from `evidenceForDecision`, which reads the decision's
 * own explanation, evaluation and trace. Nothing on this panel is recomputed
 * and nothing is a second opinion: section 51 forbids "a second analytics
 * engine, a second recommendation brain, or a parallel explanation truth", and
 * the way to honour that is for the panel to have no source of its own to
 * disagree from.
 *
 * **It is closed by default and it is the only thing this adds to Now.** One
 * link, at the bottom, under everything the screen already showed. The plan is
 * specific about this — Now must be able to expose the meaningful evidence
 * behind its choice *without cluttering Now* — so nothing above this line moved
 * to make room for it.
 *
 * There is no evidence panel on an evening with no move. A no-action evening
 * has its own explanation directly on the screen, and a "see evidence" link
 * over a decision that was not made would be a button with nothing behind it.
 */
function EvidencePanel({
  decision,
  open,
  onToggle,
  originFor,
}: {
  decision: Decision
  open: boolean
  onToggle: () => void
  /** Where each piece of evidence came from, when it was not the owner. */
  originFor: (record: RecordId) => RecordOrigin | undefined
}) {
  const evidence: DecisionEvidence | undefined = evidenceForDecision(decision)
  if (evidence === undefined) return null
  // AUD-0036: the trust surface stops describing a different day. The headings
  // read the hour from the same situation the decision was made in.
  const block = decision.situation.block

  return (
    <div className="now-evidence">
      <button
        type="button"
        className="ev-open"
        aria-expanded={open}
        // Named for anyone who cannot see which move it sits under (D-039).
        aria-label={
          open
            ? `Hide the evidence for: ${evidence.move}`
            : `See the evidence for: ${evidence.move}`
        }
        onClick={onToggle}
        data-testid="now-see-evidence"
      >
        {open ? 'Hide evidence' : 'See evidence'}
      </button>

      {!open ? null : (
        <div className="ev-detail" data-testid="now-evidence">
          {/*
            First, because on a held decision it is the question — QA-82-002.
            The owner opened this under a sentence saying to wait; what he wants
            is why not yet, and the conditions, counts and comparable occasions
            below are all about the move rather than about the hour.
          */}
          {evidence.deferral.length === 0 ? null : (
            <EvidenceNote title="Why later rather than now" testId="now-evidence-deferral">
              {evidence.deferral.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </EvidenceNote>
          )}

          {evidence.conditions.length === 0 ? null : (
            <EvidenceNote title={`What this rested on ${hereNowWord(block)}`}>
              {evidence.conditions.map((condition) => (
                <p key={condition.concept}>
                  {condition.label}: {condition.reading}
                </p>
              ))}
            </EvidenceNote>
          )}

          <EvidenceNote title={`Situations like ${hereNowWord(block)}`}>
            <p>{evidence.comparable}</p>
            {/*
              The unit is named, because the two numbers on this panel count
              different things: twelve occasions, and the twenty-four answers
              given about them. "Who said so: 24" under "12 occasions" reads as a
              contradiction, and it is not one.
            */}
            {evidence.mix === undefined ? null : (
              <p>Answers behind these figures: {evidence.mix}.</p>
            )}
          </EvidenceNote>

          {evidence.concluded === undefined ? null : (
            <EvidenceNote title="What the app took from them">
              <p>{evidence.concluded}</p>
              <p className="note">
                This leans hardest on the occasions most like {hereNowWord(block)}, so it can be
                more cautious than the plain count below.
              </p>
            </EvidenceNote>
          )}

          {evidence.rates.length === 0 ? null : (
            <div className="ev-block">
              <p className="ev-block__title">What happened those times</p>
              {evidence.rates.map((rate) => (
                <EvidenceRate key={rate.aspect} rate={rate} />
              ))}
            </div>
          )}

          {evidence.observed === undefined ? null : (
            <EvidenceNote title="What the record shows follows it">
              <p>{evidence.observed}</p>
              <p className="note">
                Worked out from readings rather than from anything you were asked to judge. It says
                what has followed what, not that one brought the other about.
              </p>
            </EvidenceNote>
          )}

          {evidence.context === undefined ? null : (
            <EvidenceNote title="Where it goes better">
              <p>{evidence.context}</p>
            </EvidenceNote>
          )}

          <EvidenceLines
            title="Occasions that went the other way"
            lines={evidence.counterexamples}
            originFor={originFor}
          />

          <EvidenceConfidence confidence={evidence.confidence} />

          <EvidenceNote title="How this was arrived at">
            {evidence.reasoning.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </EvidenceNote>
        </div>
      )}
    </div>
  )
}

/**
 * The sixth owner action, two taps behind the fifth — AUD-0050.
 *
 * It appears only after this move has already been refused today, which is what
 * keeps it away from a thumb aiming at "Not today", and it asks again before it
 * writes anything. A veto is permanent until he lifts it, and where he lifts it
 * is named here rather than left for him to find.
 */
function StopSuggesting({
  refused,
  entities,
  area,
  block,
  disabled,
  onForbid,
  onDismiss,
}: {
  refused: RecommendationSemantics | undefined
  entities: EntityIndex
  area: string
  block: DayBlock
  disabled: boolean
  onForbid: (scope: 'move' | 'area') => void
  onDismiss: () => void
}) {
  const [asking, setAsking] = useState(false)
  if (refused === undefined) return null

  const rendered = renderRecommendation(refused, entities, block)
  const move = rendered.ok ? rendered.rendered.sentence : undefined
  // D-018: no fallback wording. A move that cannot be named cannot be vetoed by
  // name either, and a control saying "stop suggesting it" is the "it" problem.
  if (move === undefined) return null

  if (!asking) {
    return (
      <p className="now-stop">
        <button
          type="button"
          className="now-linkish"
          disabled={disabled}
          aria-label={`Stop suggesting: ${move}`}
          onClick={() => setAsking(true)}
          data-testid="now-stop"
        >
          Stop suggesting that
        </button>
      </p>
    )
  }

  return (
    <Panel title="Stop suggesting that">
      <p className="now-question" data-testid="now-stop-confirm">
        {move} This stays off until you lift it, and you can lift it on the {area} page.
      </p>
      <div className="now-options">
        <button
          type="button"
          className="now-option"
          disabled={disabled}
          onClick={() => onForbid('move')}
          data-testid="now-stop-move"
        >
          Just this one
        </button>
        <button
          type="button"
          className="now-option"
          disabled={disabled}
          onClick={() => onForbid('area')}
          data-testid="now-stop-area"
        >
          Anything from {area}
        </button>
        <button
          type="button"
          className="now-option"
          onClick={() => {
            setAsking(false)
            onDismiss()
          }}
        >
          Cancel
        </button>
      </div>
      <p className="note">
        {area} stays in the app either way — it keeps its page, its coverage and its history. What
        stops is being asked to do something about it.
      </p>
    </Panel>
  )
}

/**
 * Something the app thinks has changed about her, offered as a question.
 *
 * Section 9's own flow, at its last step: "She seems more comfortable doing
 * this on her own. Update this growth area?" — and the owner confirms, rejects
 * or corrects. It is deliberately not phrased as a finding the app has already
 * acted on, because it has not: nothing is written until he answers, and what
 * gets written is whichever answer he gives.
 *
 * "Not yet" is not a dismissal, and it is not free. It records that the person
 * who would know has looked, which is real evidence about that area — so
 * saying no keeps the app from raising it again on the same three occasions,
 * without the app pretending anything changed.
 */
function GrowthPanel({
  suggestion,
  disabled,
  onAnswer,
}: {
  suggestion: GrowthSuggestion
  disabled: boolean
  onAnswer: (agreed: boolean) => void
}) {
  /*
   * Two different sentences, and conflating them is what AUD-0017 is about.
   *
   * A run of three in one place is not evidence of generalisation, so the app
   * does not ask whether to call it settled — it says what it sees and suggests
   * the thing that would actually settle it. That is a more useful sentence
   * than a hedged version of the question, and it is the one the finding asks
   * for in as many words.
   */
  if (suggestion.kind === 'widen-the-setting') {
    return (
      <Panel title="Something that may have changed">
        <p className="now-question" data-testid="now-growth">
          {suggestion.headline} Worth trying somewhere new before we call it.
        </p>
        {suggestion.occasionsSummary === undefined ? null : (
          <p className="note" data-testid="now-growth-evidence">
            {suggestion.occasionsSummary}
          </p>
        )}
        <div className="now-options">
          <button
            type="button"
            className="now-option"
            disabled={disabled}
            data-testid="now-growth-noted"
            onClick={() => onAnswer(false)}
          >
            Noted
          </button>
        </div>
      </Panel>
    )
  }

  return (
    <Panel title="Something that may have changed">
      <p className="now-question" data-testid="now-growth">
        {suggestion.headline} Worth calling that settled?
      </p>
      {/*
        The evidence under the claim, in his own words — AUD-0049.

        Everywhere else the app is careful about this: a learned belief carries
        a sample count, an association states its comparison group and refuses
        to speak below it, an insight card carries how sure it is. The claim
        about his daughter's development — the highest-stakes claim in the
        product — carried none of that, and was offered as a binary. What it
        carries now is ordinary evidence rather than a confidence label,
        because a badge attached to a sentence about a four-year-old is a score
        about a four-year-old whatever the word on it says.
      */}
      {suggestion.occasionsSummary === undefined ? null : (
        <p className="note" data-testid="now-growth-evidence">
          {suggestion.occasionsSummary}
        </p>
      )}
      <div className="now-options">
        <button
          type="button"
          className="now-option"
          disabled={disabled}
          onClick={() => onAnswer(true)}
        >
          Yes, she has got this
        </button>
        <button
          type="button"
          className="now-option"
          disabled={disabled}
          onClick={() => onAnswer(false)}
        >
          Not yet
        </button>
      </div>
    </Panel>
  )
}

function GuidePanel({
  question,
  disabled,
  onAnswer,
}: {
  question:
    | {
        readonly spec: QuestionSpec
        readonly prompt: string
        readonly options: readonly QuestionOption[]
      }
    | undefined
  disabled: boolean
  onAnswer: (spec: QuestionSpec, option: QuestionOption) => void
}) {
  if (question === undefined) {
    return (
      <p className="note" data-testid="now-settled">
        Nothing else worth asking right now.
      </p>
    )
  }

  return (
    <Panel title="One thing that would change this">
      <p className="now-question" data-testid="now-question">
        {question.prompt}
      </p>
      <div className="now-options">
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="now-option"
            disabled={disabled}
            onClick={() => onAnswer(question.spec, option)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </Panel>
  )
}

/**
 * A course the app could keep going, offered as a question — AUD-0020.
 *
 * The same shape and the same discipline as the growth panel above it: the app
 * proposes, the owner answers, and nothing is written until he does. What is
 * different is what a yes means — it changes what gets suggested over the next
 * days rather than recording something about the past — so the panel says what
 * the course actually is before he agrees to it, and Life is where he stops it.
 *
 * There is no "not now" button, and its absence is deliberate. Ignoring the
 * offer already means no; a second control would make declining a plan a thing
 * he has to do, which is the burden section 4.5 constrains.
 */
function ThreadOfferPanel({
  offer,
  disabled,
  onStart,
}: {
  offer: ThreadOffer
  disabled: boolean
  onStart: () => void
}) {
  return (
    <Panel title="Something worth keeping going">
      <p className="now-question" data-testid="now-thread-offer">
        {offer.offer}
      </p>
      <p className="note">{offer.intent}. You can stop it any time from Life.</p>
      <div className="now-options">
        <button
          type="button"
          className="now-option"
          disabled={disabled}
          data-testid="now-thread-start"
          onClick={onStart}
        >
          Yes, keep it going
        </button>
      </div>
    </Panel>
  )
}
