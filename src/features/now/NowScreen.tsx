import { useCallback, useMemo, useRef, useState } from 'react'
import { Panel, PrimarySurface, Row, Rows, Screen } from '../../components/ui'
import type { RecordId } from '../../domain/ids'
import type { RecommendationSemantics } from '../../domain/recommendation'
import { localDateTimeAt, systemClock, type DayBlock } from '../../domain/time'
import { beliefCorrectionRecord, describeBelief } from '../../intelligence/corrections'
import { decide, type Decision } from '../../intelligence/engine'
import type { Explanation } from '../../intelligence/explain'
import { evidenceForDecision, type DecisionEvidence } from '../../intelligence/insights'
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
import {
  answerRecord,
  questionFor,
  type QuestionOption,
  type QuestionSpec,
} from '../../intelligence/questions'
import type { Situation } from '../../intelligence/situation'
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
   * Closed until asked for, and closed again whenever the decision changes.
   *
   * Section 51: Now stays action-first and uncluttered, and the evidence is a
   * "compact secondary entry point". Keying the panel to the move it belongs
   * to is what stops it staying open across a recomputation and showing the
   * evidence for a suggestion that is no longer the one on screen.
   */
  const [evidenceFor, setEvidenceFor] = useState<string | undefined>(undefined)

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
        <OutcomePanel
          pending={due}
          situation={decision.situation}
          disabled={busy}
          onAnswer={answerOutcome}
          onReading={answerGuide}
        />
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
  situation,
  disabled,
  onAnswer,
  onReading,
}: {
  pending: PendingOutcome
  situation: Situation
  disabled: boolean
  onAnswer: (pending: PendingOutcome, question: OutcomeQuestion, answer: OutcomeAnswer) => void
  onReading: (spec: QuestionSpec, option: QuestionOption) => void
}) {
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
  block,
  disabled,
  onCorrect,
}: {
  explanation: Explanation
  state: MoveState | undefined
  block: DayBlock
  disabled: boolean
  onCorrect: (belief: string) => void
}) {
  const rows = [
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
