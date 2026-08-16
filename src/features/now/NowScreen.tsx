import { useCallback, useMemo, useRef, useState } from 'react'
import { Panel, PrimarySurface, Row, Rows, Screen } from '../../components/ui'
import type { RecommendationSemantics } from '../../domain/recommendation'
import { localDateTimeAt, systemClock } from '../../domain/time'
import { beliefCorrectionRecord, describeBelief } from '../../intelligence/corrections'
import { decide } from '../../intelligence/engine'
import type { Explanation } from '../../intelligence/explain'
import { nextGuideStep } from '../../intelligence/guide'
import { growthAnswerRecords, type GrowthSuggestion } from '../../intelligence/growth'
import {
  availableActions,
  planLifecycle,
  type LifecycleAction,
  type MoveState,
} from '../../intelligence/lifecycle'
import {
  nextDueOutcome,
  outcomeRecord,
  type OutcomeAnswer,
  type OutcomeQuestion,
  type PendingOutcome,
} from '../../intelligence/outcomes'
import { answerRecord, type QuestionOption, type QuestionSpec } from '../../intelligence/questions'
import type { Situation } from '../../intelligence/situation'
import { isPreview, isProduction } from '../../platform/buildInfo'
import { hashForDestination } from '../../platform/routing'
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

const STATE_WORDS: Record<MoveState, string> = {
  shown: 'New tonight',
  started: 'Under way',
  completed: 'Done',
  declined: 'You passed on this',
  'unable-now': 'You said not right now',
}

const ACTION_WORDS: Record<LifecycleAction, string> = {
  start: 'Start it',
  complete: 'Done',
  decline: 'Not tonight',
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
  'try-another',
  'unable-now',
  'decline',
]

function EmptyNow() {
  return (
    <Screen title="Now">
      <PrimarySurface eyebrow="Nothing loaded" headline="There is no history here yet.">
        <p>
          The engine will not guess. With nothing to go on it says so, rather than offering
          something plausible about a life it knows nothing about.
        </p>
      </PrimarySurface>

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
    () => ({ now: memory.now, zone: memory.zone, weekStartsOn: memory.weekStartsOn }),
    [memory.now, memory.zone, memory.weekStartsOn],
  )

  const decision = useMemo(() => decide(memory.view, moment), [memory.view, moment])

  // The guide re-runs the decision under each possible answer, so it is real
  // work — worth doing once per history rather than once per render.
  const guide = useMemo(() => nextGuideStep(memory.view, moment), [memory.view, moment])

  const due = useMemo(
    () => nextDueOutcome(memory.view, moment, decision.situation.entities),
    [memory.view, moment, decision.situation.entities],
  )

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
        <Panel>
          <p className="note">Opening your history…</p>
        </Panel>
      </Screen>
    )
  }

  if (memory.snapshot.records.length === 0) return <EmptyNow />

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

  const act = (semantics: RecommendationSemantics, situation: Situation) => {
    return (action: LifecycleAction) => {
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
  ) => {
    append(() => [
      outcomeRecord(pending.episode, question.aspect, answer, {
        now: memory.now,
        zone: memory.zone,
        recordedAt: systemClock().now(),
      }),
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

  const local = localDateTimeAt(memory.now, memory.zone)
  const explanation = decision.explanation

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
        <OutcomePanel pending={due} disabled={busy} onAnswer={answerOutcome} />
      )}

      {explanation === undefined ? (
        <PrimarySurface
          eyebrow={decision.situation.limiter?.summary ?? 'Nothing pressing'}
          headline={decision.noAction?.headline ?? 'Nothing to suggest.'}
        >
          <p data-testid="now-reason">{decision.noAction?.detail}</p>
        </PrimarySurface>
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

          <MoveActions
            state={decision.state ?? 'shown'}
            disabled={busy}
            onAct={act(explanation.semantics, decision.situation)}
          />

          <DetailPanel
            explanation={explanation}
            state={decision.state}
            disabled={busy}
            onCorrect={correct}
          />
        </>
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

      <GuidePanel
        question={guide.kind === 'question' ? guide.question : undefined}
        disabled={busy}
        onAnswer={answerGuide}
      />

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
  disabled,
  onAnswer,
}: {
  pending: PendingOutcome
  disabled: boolean
  onAnswer: (pending: PendingOutcome, question: OutcomeQuestion, answer: OutcomeAnswer) => void
}) {
  const question: OutcomeQuestion | undefined = pending.questions[0]
  if (question === undefined) return null

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
            onClick={() => onAnswer(pending, question, answer)}
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
  state,
  disabled,
  onCorrect,
}: {
  explanation: Explanation
  state: MoveState | undefined
  disabled: boolean
  onCorrect: (belief: string) => void
}) {
  const rows = [
    explanation.limiter === undefined
      ? undefined
      : { label: 'What is in the way', value: explanation.limiter },
    explanation.instead === undefined
      ? undefined
      : { label: 'Chosen over', value: explanation.instead },
    explanation.insteadBecause === undefined
      ? undefined
      : { label: 'Why this one', value: explanation.insteadBecause },
    state === undefined || state === 'shown'
      ? undefined
      : { label: 'Where this stands', value: STATE_WORDS[state] },
  ].filter((row): row is { label: string; value: string } => row !== undefined)

  const belief = explanation.restsOnBelief
  const restsOn = explanation.restsOn

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
            // Short enough for a thumb, and named for anyone who cannot see
            // which sentence it sits under (sections 37 and D-039).
            aria-label={`Not how it went — correct ${describeBelief(belief)}`}
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
  return (
    <Panel title="Something that may have changed">
      <p className="now-question" data-testid="now-growth">
        {suggestion.headline} Worth calling that settled?
      </p>
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
