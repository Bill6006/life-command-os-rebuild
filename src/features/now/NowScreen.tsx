import { useMemo, useState } from 'react'
import { Panel, PrimarySurface, Row, Rows, Screen } from '../../components/ui'
import { localDateTimeAt } from '../../domain/time'
import { decide } from '../../intelligence/engine'
import { nextGuideStep } from '../../intelligence/guide'
import { answerRecord, type QuestionOption, type QuestionSpec } from '../../intelligence/questions'
import type { MoveState } from '../../intelligence/situation'
import { isPreview, isProduction } from '../../platform/buildInfo'
import { hashForDestination } from '../../platform/routing'
import { useMemory } from '../memory/memoryContext'
import './NowScreen.css'

/**
 * Now — the proactive command surface (canonical plan section 6).
 *
 * "Now is where the app comes to the owner." One move, why it, what it costs,
 * what it was chosen over, and what is still unknown. Not a wall of scores, not
 * a dashboard of every life area, not a research explanation — the reasoning
 * behind all of this is real and is available in full, and it is available in
 * the QA inspector rather than here.
 *
 * The guide lives on this screen rather than on a page of its own, which is
 * section 12's requirement that the flow does not send the owner around the
 * app. It appears only when an answer would actually change what is on screen,
 * so it is either worth a tap or it is not there.
 */

const STATE_WORDS: Record<MoveState, string> = {
  shown: 'New tonight',
  started: 'Started',
  completed: 'Done',
  declined: 'You passed on this',
  'unable-now': 'You said not right now',
}

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
            The QA laboratory has ten invented histories — a week of four-hour nights, a settled
            custody arrangement, a week pointed at the house. Load one and come back here.
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
  const [answering, setAnswering] = useState(false)

  const moment = useMemo(
    () => ({ now: memory.now, zone: memory.zone, weekStartsOn: memory.weekStartsOn }),
    [memory.now, memory.zone, memory.weekStartsOn],
  )

  const decision = useMemo(() => decide(memory.view, moment), [memory.view, moment])

  // The guide re-runs the decision under each possible answer, so it is real
  // work — worth doing once per history rather than once per render.
  const guide = useMemo(() => nextGuideStep(memory.view, moment), [memory.view, moment])

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

  const answer = (spec: QuestionSpec, option: QuestionOption) => {
    setAnswering(true)
    void memory
      .append([answerRecord(spec, option, { now: memory.now, zone: memory.zone })])
      .finally(() => setAnswering(false))
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

          <Panel>
            <Rows>
              {explanation.limiter === undefined ? null : (
                <Row label="What is in the way" value={explanation.limiter} />
              )}
              {decision.evaluation?.candidate.semantics.target.minutes === undefined ? null : (
                <Row
                  label="Time"
                  value={`about ${decision.evaluation.candidate.semantics.target.minutes} minutes`}
                />
              )}
              {explanation.instead === undefined ? null : (
                <Row label="Instead of" value={explanation.instead} />
              )}
              {explanation.unknown === undefined ? null : (
                <Row label="Still unknown" value={explanation.unknown} />
              )}
              <Row label="Where this stands" value={STATE_WORDS[decision.state ?? 'shown']} />
            </Rows>
          </Panel>
        </>
      )}

      <GuidePanel
        question={guide.kind === 'question' ? guide.question : undefined}
        disabled={answering || memory.busy}
        onAnswer={answer}
      />

      {isProduction ? null : (
        <p className="note">
          {isPreview ? 'Preview build. ' : ''}Everything here is invented.{' '}
          <a className="qa-link" href={hashForDestination('qa')}>
            The QA laboratory
          </a>{' '}
          shows every fact, every move considered, and what would change this answer.
        </p>
      )}
    </Screen>
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
