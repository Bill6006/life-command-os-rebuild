import { useCallback, useMemo, useRef, useState } from 'react'
import { Panel, Screen } from '../../components/ui'
import { DOMAIN, type LifeDomainId } from '../../domain/domains'
import type { EntityRef } from '../../domain/entities'
import type { FactValue, GoalStatus, GrowthStage } from '../../domain/records'
import type { RecordId } from '../../domain/ids'
import {
  civilDateFromDayId,
  instantAtLocal,
  localDayIdAt,
  localDaysBetween,
  parseLocalDayId,
  systemClock,
  type TimeZoneId,
} from '../../domain/time'
import { dueWindow, type ConceptId } from '../../domain/windows'
import {
  contextCorrectionRecord,
  coverageInterpretationRecord,
  domainStatusCorrectionRecord,
  factCorrectionRecord,
  goalCorrectionRecord,
  liftVetoRecord,
  permissionRecord,
  redateEventRecord,
  withdrawEventRecord,
} from '../../intelligence/corrections'
import {
  authoringRecords,
  destinationRecords,
  milestoneFor,
  relationshipEventRecord,
  reviseDestinationRecord,
  type AuthoringDraft,
  type DestinationDraft,
} from '../../intelligence/authoring'
import {
  courseReflectionRecord,
  nextCourseReflection,
  type CourseReflection,
} from '../../intelligence/progress'
import type { OutcomeAnswer } from '../../intelligence/outcomes'
import {
  AuthoringPanel,
  BlockersPanel,
  CorrectionsPanel,
  DestinationPanel,
  PeoplePanel,
  PermissionPanel,
  ProgressPanel,
} from './DomainPanels'
import { growthStageRecord } from '../../intelligence/growth'
import type { QuestionOption } from '../../intelligence/questions'
import {
  assembleSituation,
  type DomainCoverage,
  type Situation,
} from '../../intelligence/situation'
import { hashForDestination } from '../../platform/routing'
import { useMemory } from '../memory/memoryContext'
import {
  assembleDomainPageData,
  type ConceptReading,
  type CorrectableEvent,
  type DomainDestination,
  type DomainGoal,
  type DomainPageData,
  type DomainSkill,
  type LifePage,
  type RecentChange,
  type StandingBlocker,
} from './domainPages'
import './DomainPage.css'

/**
 * A domain page (canonical plan section 50).
 *
 * Section 50's gate is a person on a phone answering five questions about one
 * area: what does the app believe, why, what changed, whether it is fresh, and
 * how to correct it. The first four are `assembleDomainPageData` read straight
 * — this component's job is the fifth, and only the fifth: every correction
 * control below is closed until tapped, because a page that opens with a form
 * for every row is exactly the static questionnaire dump section 59 excludes.
 *
 * A correction here writes one of the record kinds `corrections.ts` builds
 * (section 62) and nothing more. There is no second brain: the reading, the
 * coverage and the goals are the same `Situation` Now was built from, and the
 * correction is read back through the same paths that already governed these
 * records before this page existed.
 */

function describeAge(days: number): string {
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  const weeks = Math.round(days / 7)
  if (weeks < 9) return `${weeks} weeks ago`
  const months = Math.round(days / 30)
  return months <= 1 ? 'over a month ago' : `${months} months ago`
}

export function DomainPage({ page }: { page: LifePage }) {
  const memory = useMemory()
  const [working, setWorking] = useState(false)
  const inFlight = useRef(false)

  const [openConcept, setOpenConcept] = useState<ConceptId | undefined>(undefined)
  const [conceptDraft, setConceptDraft] = useState('')
  const [openStatus, setOpenStatus] = useState<LifeDomainId | undefined>(undefined)
  const [statusDraft, setStatusDraft] = useState('')
  const [openGoal, setOpenGoal] = useState<RecordId | undefined>(undefined)

  /*
   * A store with nothing in it still has a situation — QA-84-007, D-189.
   *
   * This read `!memory.ready || memory.snapshot.records.length === 0`, and the
   * second half was the defect. `assembleSituation` on an empty view is
   * perfectly well defined — `InsightsScreen` has always called it that way,
   * which is why the second agenda was the **only** thing an owner could reach
   * on a first run. The record count was standing in for "there is nothing to
   * say", and it also switched off every control that exists so he can write
   * the first record.
   *
   * What is empty is the **report**, not the page. The panels below already
   * say nothing when they have nothing: `DestinationPanel` renders its own
   * "nothing named yet" line, `ProgressPanel` returns null on empty rungs, and
   * `AuthoringPanel` never needed a history at all.
   */
  const situation = useMemo<Situation | undefined>(() => {
    if (!memory.ready) return undefined
    return assembleSituation(memory.view, {
      now: memory.now,
      zone: memory.zone,
      weekStartsOn: memory.weekStartsOn,
    })
  }, [memory.ready, memory.view, memory.now, memory.zone, memory.weekStartsOn])

  const data = useMemo<DomainPageData | undefined>(
    () => (situation === undefined ? undefined : assembleDomainPageData(situation, page)),
    [situation, page],
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

  const liftVeto = (record: RecordId) => {
    append(() => [
      liftVetoRecord(record, {
        now: memory.now,
        zone: memory.zone,
        recordedAt: systemClock().now(),
      }),
    ])
  }

  if (!memory.ready) {
    return (
      <Screen title={page.title}>
        <Panel>
          <p className="note">Opening your history…</p>
        </Panel>
      </Screen>
    )
  }

  if (situation === undefined || data === undefined) {
    return (
      <Screen title={page.title} lede={page.lede}>
        <Panel title="Nothing loaded">
          <p>With no history loaded there is nothing this page can report yet.</p>
        </Panel>
      </Screen>
    )
  }

  const busy = working || memory.busy

  const correctConcept = (concept: ConceptId, value: FactValue) => {
    const definition = situation.concepts.definitionFor(concept)
    const moment = {
      now: memory.now,
      zone: memory.zone,
      recordedAt: systemClock().now(),
    }
    // Durable concepts (a custody arrangement, and nothing else in the
    // starting registry) are represented as durable context so a later
    // situational exception can still override them (D-012). Everything else
    // is a fact, correctable the same way tonight's guide answer is.
    const record =
      definition.freshness.unit === 'durable'
        ? contextCorrectionRecord({ concept, value, durability: 'durable' }, moment)
        : factCorrectionRecord(concept, value, moment)
    append(() => [record])
    setOpenConcept(undefined)
    setConceptDraft('')
  }

  const markReviewed = (domain: LifeDomainId) => {
    append(() => [
      coverageInterpretationRecord(domain, 'moderate', {
        now: memory.now,
        zone: memory.zone,
        recordedAt: systemClock().now(),
      }),
    ])
  }

  const correctStatus = (domain: LifeDomainId, summary: string) => {
    const trimmed = summary.trim()
    if (trimmed === '') return
    append(() => [
      domainStatusCorrectionRecord(domain, trimmed, {
        now: memory.now,
        zone: memory.zone,
        recordedAt: systemClock().now(),
      }),
    ])
    setOpenStatus(undefined)
    setStatusDraft('')
  }

  const setSkillStage = (skill: DomainSkill, stage: GrowthStage) => {
    append(() => [
      growthStageRecord(skill.ref, skill.label, skill.domain, stage, {
        now: memory.now,
        zone: memory.zone,
        recordedAt: systemClock().now(),
      }),
    ])
  }

  const correctGoal = (goal: DomainGoal, status: GoalStatus) => {
    const previous = goal.record
    if (previous === undefined) return
    append(() => [
      goalCorrectionRecord(
        { previous, statement: goal.statement, status },
        { now: memory.now, zone: memory.zone, recordedAt: systemClock().now() },
      ),
    ])
  }

  /**
   * The one date control the horizon has ever had — AUD-0046.
   *
   * `GoalRecord.targetWindow` has parsed, serialised and round-tripped since
   * Phase 1, and no surface could write it: the deadline in "Pass the CCNA
   * before the winter" lived inside the owner's own sentence while the typed
   * field for it sat empty. This is where he puts it, and taking it off again
   * is the same control — an absent horizon has to stay reachable, because it
   * is the honest state for most goals and the app must never default one.
   *
   * The span is the whole owner-local day he named. A due window is a stretch
   * of time rather than an instant (section 15), and "by the 30th" means the
   * 30th rather than midnight at the start of it.
   */
  const setGoalHorizon = (goal: DomainGoal, dayId: string | undefined) => {
    const previous = goal.record
    if (previous === undefined) return
    const day = dayId === undefined ? undefined : parseLocalDayId(dayId)
    if (dayId !== undefined && day === undefined) return
    const date = day === undefined ? undefined : civilDateFromDayId(day)
    append(() => [
      goalCorrectionRecord(
        {
          previous,
          statement: goal.statement,
          status: 'active',
          targetWindow:
            date === undefined
              ? null
              : dueWindow(
                  instantAtLocal({ ...date, hour: 0, minute: 0, second: 0 }, memory.zone),
                  instantAtLocal({ ...date, hour: 23, minute: 59, second: 59 }, memory.zone),
                ),
        },
        { now: memory.now, zone: memory.zone, recordedAt: systemClock().now() },
      ),
    ])
    setOpenGoal(undefined)
  }

  /** The named pieces a goal is made of — AUD-0021. Adding one, or taking it off. */
  const setGoalParts = (goal: DomainGoal, parts: readonly EntityRef[]) => {
    const previous = goal.record
    if (previous === undefined) return
    append(() => [
      goalCorrectionRecord(
        { previous, statement: goal.statement, status: 'active', parts },
        { now: memory.now, zone: memory.zone, recordedAt: systemClock().now() },
      ),
    ])
    setOpenGoal(undefined)
  }

  /*
   * The moment every gesture on this page is written at — D-037.
   *
   * The moment being reasoned about, and the real clock beside it. Under time
   * travel those genuinely differ, and within one session the second is what
   * tells two gestures apart.
   */
  const authoringMoment = () => ({
    now: memory.now,
    zone: memory.zone,
    recordedAt: systemClock().now(),
  })

  /**
   * Naming what he is trying to become — F01, package 1.
   *
   * The entity and the record travel together through `create`, because a goal
   * whose subject is not in the index is a renderer with nothing to name.
   */
  const nameDestination = (draft: DestinationDraft) => {
    if (inFlight.current) return
    inFlight.current = true
    setWorking(true)
    void memory.create(destinationRecords(draft, situation, authoringMoment())).finally(() => {
      inFlight.current = false
      setWorking(false)
    })
  }

  const reviseDestination = (
    entry: DomainDestination,
    changes: {
      baseline?: string
      evidence?: readonly string[]
      unknowns?: readonly string[]
    },
  ) => {
    const previous = entry.record
    if (previous === undefined) return
    append(() => [reviseDestinationRecord(previous, changes, authoringMoment())])
  }

  /**
   * The next step, as the milestone it is — a goal that names its destination.
   *
   * `milestoneFor` rather than `destinationRecords`: the destination already
   * exists, and re-running the destination builder would write a second record
   * carrying the same aim, which reads on this page as the owner aiming at one
   * thing twice.
   */
  const addMilestone = (entry: DomainDestination, statement: string) => {
    if (statement.trim() === '') return
    if (inFlight.current) return
    inFlight.current = true
    setWorking(true)
    void memory
      .create(
        milestoneFor(
          entry.destination.destination,
          entry.destination.domain,
          statement,
          situation,
          authoringMoment(),
        ),
      )
      .finally(() => {
        inFlight.current = false
        setWorking(false)
      })
  }

  /**
   * Introducing a goal, a routine, a person, a place, a skill or an obligation
   * — F04, package 3.
   *
   * The single highest-leverage item in the adjudication, and it is one call:
   * this is the first control in the product that brings a semantic entity into
   * being.
   */
  const createThing = (draft: AuthoringDraft) => {
    if (inFlight.current) return
    inFlight.current = true
    setWorking(true)
    void memory.create(authoringRecords(draft, situation, authoringMoment())).finally(() => {
      inFlight.current = false
      setWorking(false)
    })
  }

  const liftBlocker = (blocker: StandingBlocker) => {
    append(() => [
      withdrawEventRecord(blocker.record, 'The owner said this is no longer true', {
        now: memory.now,
        zone: memory.zone,
        recordedAt: systemClock().now(),
      }),
    ])
  }

  const withdrawEvent = (event: CorrectableEvent) => {
    append(() => [
      withdrawEventRecord(event.id, 'The owner said this did not happen', {
        now: memory.now,
        zone: memory.zone,
        recordedAt: systemClock().now(),
      }),
    ])
  }

  const redateEvent = (event: CorrectableEvent, dayId: string) => {
    const day = parseLocalDayId(dayId)
    const record = memory.view.history.byId(event.id)
    if (day === undefined || record === undefined) return
    append(() => [
      redateEventRecord(record, day, {
        now: memory.now,
        zone: memory.zone,
        recordedAt: systemClock().now(),
      }),
    ])
  }

  const setPermission = (granted: boolean) => {
    append(() => [
      permissionRecord('private-influence', granted, {
        now: memory.now,
        zone: memory.zone,
        recordedAt: systemClock().now(),
      }),
    ])
  }

  const answerReflection = (reflection: CourseReflection, answer: OutcomeAnswer) => {
    append(() => [
      courseReflectionRecord(reflection, answer, page.domains[0]!, {
        now: memory.now,
        zone: memory.zone,
        recordedAt: systemClock().now(),
      }),
    ])
  }

  const recordEvent = (person: EntityRef, nature: string) => {
    if (nature.trim() === '') return
    append(() => [relationshipEventRecord(person, nature, page.domains[0]!, authoringMoment())])
  }

  const reflection = nextCourseReflection(situation)

  /*
   * The people this area knows about, from the graph rather than from a list.
   *
   * Only the owner's own: `situation.entities` folds in the engine's five
   * standing routines, and none of them is a person, so nothing here can
   * surface the app's own furniture as somebody he knows.
   */
  const people = page.domains.flatMap((domain) =>
    situation.entities
      .byKind('person')
      .filter((entity) => entity.domain === domain)
      .map((entity) => ({ ref: { id: entity.id, kind: entity.kind }, label: entity.label })),
  )

  const byDomain = new Map<LifeDomainId, ConceptReading[]>()
  for (const reading of data.readings) {
    const held = byDomain.get(reading.domain)
    if (held === undefined) byDomain.set(reading.domain, [reading])
    else held.push(reading)
  }

  const today = localDayIdAt(situation.at, situation.zone)

  return (
    <Screen title={page.title} lede={page.lede}>
      <p>
        <a className="domain-linkish" href={hashForDestination('life')}>
          ← Back to Life
        </a>
      </p>

      {data.coverage.map((coverage) => (
        <CoveragePanel
          key={coverage.domain}
          coverage={coverage}
          showLabel={page.domains.length > 1}
          disabled={busy}
          open={openStatus === coverage.domain}
          draft={openStatus === coverage.domain ? statusDraft : ''}
          onOpen={() => {
            setOpenStatus(coverage.domain)
            setStatusDraft('')
          }}
          onClose={() => setOpenStatus(undefined)}
          onDraftChange={setStatusDraft}
          onReviewed={() => markReviewed(coverage.domain)}
          onSubmit={(summary) => correctStatus(coverage.domain, summary)}
        />
      ))}

      {page.domains.includes(DOMAIN.privateHealth) ? (
        <PermissionPanel
          granted={situation.permissions.granted('private-influence')}
          disabled={busy}
          onSet={setPermission}
        />
      ) : null}

      <DestinationPanel
        data={data}
        area={situation.domains.labelFor(page.domains[0]!)}
        disabled={busy}
        onName={nameDestination}
        onRevise={reviseDestination}
        onMilestone={addMilestone}
      />

      <Panel title="What the app currently believes">
        {page.domains.map((domain) => {
          const readings = byDomain.get(domain) ?? []
          if (readings.length === 0) return null
          return (
            <div key={domain} className="domain-concept-group">
              {page.domains.length > 1 ? (
                <p className="domain-concept-group__heading">
                  {situation.domains.labelFor(domain)}
                </p>
              ) : null}
              {readings.map((reading) => (
                <ConceptRow
                  key={reading.concept}
                  reading={reading}
                  situation={situation}
                  disabled={busy}
                  open={openConcept === reading.concept}
                  draft={openConcept === reading.concept ? conceptDraft : ''}
                  onOpen={() => {
                    setOpenConcept(reading.concept)
                    setConceptDraft('')
                  }}
                  onClose={() => setOpenConcept(undefined)}
                  onDraftChange={setConceptDraft}
                  onSubmit={(value) => correctConcept(reading.concept, value)}
                />
              ))}
            </div>
          )
        })}
      </Panel>

      {data.goals.length === 0 ? null : (
        <Panel
          title={
            data.goals.every((goal) => goal.milestoneOf !== undefined) ? 'On the way' : 'Goals here'
          }
        >
          {data.goals.map((goal) => (
            <GoalRow
              key={goal.source}
              goal={goal}
              zone={situation.zone}
              disabled={busy}
              open={openGoal === goal.source}
              onOpen={() => setOpenGoal(goal.source)}
              onClose={() => setOpenGoal(undefined)}
              onStatus={(status) => correctGoal(goal, status)}
              onHorizon={(dayId) => setGoalHorizon(goal, dayId)}
              onParts={(parts) => setGoalParts(goal, parts)}
            />
          ))}
        </Panel>
      )}

      <ProgressPanel
        data={data}
        reflection={reflection}
        disabled={busy}
        onReflect={answerReflection}
      />

      <AuthoringPanel
        situation={situation}
        domain={page.domains[0]!}
        disabled={busy}
        onCreate={createThing}
      />

      <PeoplePanel people={people} disabled={busy} onEvent={recordEvent} />

      <BlockersPanel blockers={data.blockers} disabled={busy} onLift={liftBlocker} />

      {data.skills.length === 0 ? null : (
        <Panel title="What she is working on">
          {/*
            A stored judgement about a child, and the tap that takes it back —
            AUD-0015(a).

            Section 62 asks that a correction stick and that the app stop
            reasserting the old belief. What it could not do before this phase
            was hold the belief at all: "Yes, she has got this" wrote a sentence
            nobody read, so the move kept coming back. It is held now, which
            makes the other half compulsory — regression is real in children,
            and **settled must never be permanent**.
          */}
          <p className="note">
            Anything settled stops being suggested, and comes round occasionally as a check. Nothing
            here is fixed — put it back the moment it stops being true.
          </p>
          {data.skills.map((skill) => (
            <div key={skill.ref.id} className="domain-skill" data-testid="domain-skill">
              <p className="domain-skill__name">{skill.label}</p>
              <p className="domain-skill__stage">
                {skill.stage === 'settled' ? 'Settled' : 'Being worked on'}
                {skill.daysSince === undefined
                  ? ' — nothing in the record yet'
                  : ` — last go ${describeAge(skill.daysSince)}`}
              </p>
              <button
                type="button"
                className="domain-linkish"
                disabled={busy}
                aria-label={
                  skill.stage === 'settled'
                    ? `Working on it again: ${skill.label}`
                    : `Settled: ${skill.label}`
                }
                data-testid="domain-skill-stage"
                onClick={() =>
                  setSkillStage(skill, skill.stage === 'settled' ? 'practising' : 'settled')
                }
              >
                {skill.stage === 'settled' ? 'Working on it again' : 'She has got this'}
              </button>
            </div>
          ))}
        </Panel>
      )}

      {data.vetoes.length === 0 ? null : (
        <Panel title="Things you have stopped">
          {/*
            Listed and liftable — AUD-0050.

            Section 4.3 gives the owner the right to forbid a recommendation
            family, and the enforcement for it has always been complete and
            unreachable. Now that it is reachable, the other half matters more
            than the first: a veto he cannot find again is worse than none, and
            "the area is still here" has to be said out loud because section 4.1
            forbids a domain-off switch and this is not one.
          */}
          <p className="note">
            Nothing here is switched off. These areas keep their pages, their coverage and their
            history — what has stopped is being asked to do something about them.
          </p>
          {data.vetoes.map((veto) => (
            <div key={veto.record} className="domain-veto" data-testid="domain-veto">
              <p className="domain-veto__statement">{veto.statement}</p>
              <button
                type="button"
                className="domain-correction__cancel"
                disabled={busy}
                aria-label={`Lift: ${veto.statement}`}
                onClick={() => liftVeto(veto.record)}
                data-testid="domain-veto-lift"
              >
                Start suggesting it again
              </button>
            </div>
          ))}
        </Panel>
      )}

      <CorrectionsPanel
        events={data.correctable}
        disabled={busy}
        onWithdraw={withdrawEvent}
        onRedate={redateEvent}
      />

      {data.recentChanges.length === 0 ? null : (
        <Panel title="Recently">
          <ul className="domain-recent">
            {data.recentChanges.map((change: RecentChange) => (
              <li key={change.id} className="domain-recent__row">
                <span className="domain-recent__text">
                  {change.text}{' '}
                  {change.origin === undefined ? null : (
                    <span
                      className="origin-badge"
                      data-testid="domain-origin"
                      title={change.origin.detail}
                    >
                      {change.origin.label}
                    </span>
                  )}
                </span>
                <span className="domain-recent__age">
                  {describeAge(
                    Math.max(0, localDaysBetween(localDayIdAt(change.at, situation.zone), today)),
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </Screen>
  )
}

/**
 * One goal, with the two things that turn a statement into a tracked objective.
 *
 * ## Why the controls are closed until tapped
 *
 * The same rule as every other correction on this page: a page that opens with
 * a form for every row is the static questionnaire dump section 59 excludes. A
 * goal reads as a sentence, its trajectory reads as a sentence, and the date
 * and the pieces are behind one link.
 *
 * ## What the trajectory may and may not say
 *
 * Counts of pieces and the date the owner set — AUD-0021, and the risk it names
 * in as many words: a "4 of 9" reading is one short step from a completion
 * percentage, which is a score about a man's life by another name. So there is
 * no share, no bar, no "on track" verdict and no arithmetic on this row. What
 * the ranking does with the same two facts is a separate question and stays
 * inside the engine.
 */
function GoalRow({
  goal,
  zone,
  disabled,
  open,
  onOpen,
  onClose,
  onStatus,
  onHorizon,
  onParts,
}: {
  goal: DomainGoal
  zone: TimeZoneId
  disabled: boolean
  open: boolean
  onOpen: () => void
  onClose: () => void
  onStatus: (status: GoalStatus) => void
  onHorizon: (dayId: string | undefined) => void
  onParts: (parts: readonly EntityRef[]) => void
}) {
  const editable = goal.record !== undefined
  const dueOn = goal.horizon === undefined ? '' : localDayIdAt(goal.horizon.window.latest, zone)

  return (
    <div className="domain-goal">
      {/*
        A milestone reads as one — F01, F05, gate item 2.

        The word is the whole of the difference on this row and it is not
        decoration: a milestone belongs to something larger and reaching it is
        not the same event as finishing a goal that stands on its own. What is
        underneath is one record kind, deliberately (D-178).
      */}
      {goal.milestoneOf === undefined ? null : (
        <p className="domain-goal__kind" data-testid="domain-milestone">
          {goal.status === 'achieved' ? 'Milestone — reached' : 'Milestone'}
        </p>
      )}
      <p className="domain-goal__statement">
        {goal.statement}{' '}
        {goal.origin === undefined ? null : (
          <span className="origin-badge" data-testid="domain-origin" title={goal.origin.detail}>
            {goal.origin.label}
          </span>
        )}
      </p>

      {goal.trajectory === undefined ? null : (
        <p className="domain-goal__trajectory" data-testid="domain-goal-trajectory">
          {goal.trajectory}
        </p>
      )}

      {goal.parts.length === 0 ? null : (
        <ul className="domain-goal__parts" data-testid="domain-goal-parts">
          {goal.parts.map((part) => (
            <li key={part.ref.id} className="domain-goal__part">
              <span className="domain-goal__part-name">{part.label}</span>
              <span className="domain-goal__part-state">
                {part.covered ? 'has had a session' : 'no session yet'}
              </span>
              {!open ? null : (
                <button
                  type="button"
                  className="domain-linkish"
                  disabled={disabled || !editable}
                  aria-label={`Remove ${part.label}`}
                  onClick={() =>
                    onParts(
                      goal.parts
                        .filter((entry) => entry.ref.id !== part.ref.id)
                        .map((entry) => entry.ref),
                    )
                  }
                >
                  Not part of this
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <div className="domain-correction" data-testid="domain-goal-edit">
          <label className="domain-correction__prompt" htmlFor={`goal-date-${goal.source}`}>
            When do you want this done by?
          </label>
          <input
            id={`goal-date-${goal.source}`}
            type="date"
            className="domain-input"
            defaultValue={dueOn}
            disabled={disabled || !editable}
            data-testid="domain-goal-date"
            onChange={(event) =>
              event.target.value === '' ? undefined : onHorizon(event.target.value)
            }
          />
          <div className="domain-correction__actions">
            {goal.horizon === undefined ? null : (
              <button
                type="button"
                className="domain-linkish"
                disabled={disabled || !editable}
                data-testid="domain-goal-clear-date"
                onClick={() => onHorizon(undefined)}
              >
                No date on this
              </button>
            )}
          </div>

          {goal.couldBeParts.length === 0 ? null : (
            <>
              <p className="domain-correction__prompt">What is this made of?</p>
              <div className="domain-options">
                {goal.couldBeParts.map((option) => (
                  <button
                    key={option.ref.id}
                    type="button"
                    className="domain-option"
                    disabled={disabled || !editable}
                    onClick={() => onParts([...goal.parts.map((part) => part.ref), option.ref])}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <button type="button" className="domain-linkish" disabled={disabled} onClick={onClose}>
            Done editing
          </button>
        </div>
      ) : (
        <div className="domain-goal__actions">
          <button
            type="button"
            className="domain-option"
            disabled={disabled || !editable}
            onClick={() => onStatus('achieved')}
          >
            Done
          </button>
          <button
            type="button"
            className="domain-option"
            disabled={disabled || !editable}
            onClick={() => onStatus('abandoned')}
          >
            No longer this
          </button>
          <button
            type="button"
            className="domain-linkish"
            disabled={disabled || !editable}
            data-testid="domain-goal-open"
            onClick={onOpen}
          >
            Date and pieces
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function CoveragePanel({
  coverage,
  showLabel,
  disabled,
  open,
  draft,
  onOpen,
  onClose,
  onDraftChange,
  onReviewed,
  onSubmit,
}: {
  coverage: DomainCoverage
  showLabel: boolean
  disabled: boolean
  open: boolean
  draft: string
  onOpen: () => void
  onClose: () => void
  onDraftChange: (value: string) => void
  onReviewed: () => void
  onSubmit: (summary: string) => void
}) {
  // Matches Life's own grouping (LifeScreen.tsx, D-075): only a stale area is
  // asking for anything. "Quiet" already reads as calm and unflagged there —
  // offering a correction for it here would ask the owner to confirm
  // something the app never doubted.
  const canCorrect = coverage.status === 'stale'
  /*
   * QA-B2. A domain can be stale because nothing has been heard about it at
   * all (`goneQuiet`), or because one specific standing concept has gone
   * past its own window (`coverage.weakest`, which is only ever set when
   * that is true — see `pickWeakest` in coverage.ts). The two buttons below
   * write domain-level evidence: a review happened, or something changed, in
   * the owner's own words. Neither carries a `concept` to resolve against,
   * so neither can move the specific fact the sentence above is actually
   * about — offering them as if they could is the defect. When a concept is
   * the cause, the honest and capable action is the "Not right?" control on
   * that concept's own row, so this points there instead of offering a
   * button that would look like it worked and would not.
   */
  const concept = coverage.weakest

  return (
    <Panel title={showLabel ? coverage.label : 'How this stands'}>
      <p className="domain-coverage__summary">{coverage.summary}</p>

      {!canCorrect ? null : concept !== undefined ? (
        <p className="domain-coverage__pointer">
          <strong>{concept.label}</strong> is what is actually overdue here — answering it below is
          what will settle this.
        </p>
      ) : open ? (
        /*
         * A name, and a stated expectation — F40.
         *
         * This was a bare `<input type="text">` with `placeholder="What's
         * changed"` and nothing else: no accessible name for anyone using
         * assistive technology, and for everyone else no statement of what the
         * app wanted or what it would do with the answer. A placeholder is not
         * a label — it is a hint that disappears the moment there is anything
         * in the box.
         *
         * The label names the area, because a page can carry two of these
         * (health and sleep share one), and the note says where the answer
         * goes. `aria-label` would have satisfied a checker; a visible label
         * satisfies the owner too, which is the half F40 is actually about.
         */
        <div className="domain-correction">
          <label className="domain-correction__prompt" htmlFor={`domain-status-${coverage.domain}`}>
            What has changed in {coverage.label}?
          </label>
          <p className="domain-correction__note">
            In your own words. It joins this area’s history as something you told the app, and it is
            what brings the picture back up to date.
          </p>
          <input
            id={`domain-status-${coverage.domain}`}
            type="text"
            className="domain-input"
            value={draft}
            disabled={disabled}
            onChange={(event) => onDraftChange(event.target.value)}
          />
          <div className="domain-correction__actions">
            <button
              type="button"
              className="domain-option"
              disabled={disabled || draft.trim() === ''}
              onClick={() => onSubmit(draft)}
            >
              Save
            </button>
            <button type="button" className="domain-linkish" disabled={disabled} onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="domain-correction__actions">
          <button type="button" className="domain-linkish" disabled={disabled} onClick={onReviewed}>
            I've been keeping on top of this
          </button>
          <button type="button" className="domain-linkish" disabled={disabled} onClick={onOpen}>
            Something's changed
          </button>
        </div>
      )}
    </Panel>
  )
}

function ConceptRow({
  reading,
  situation,
  disabled,
  open,
  draft,
  onOpen,
  onClose,
  onDraftChange,
  onSubmit,
}: {
  reading: ConceptReading
  situation: Situation
  disabled: boolean
  open: boolean
  draft: string
  onOpen: () => void
  onClose: () => void
  onDraftChange: (value: string) => void
  onSubmit: (value: FactValue) => void
}) {
  const known = reading.state !== 'unknown'

  return (
    <div className="domain-reading">
      <p className="domain-reading__label">{reading.label}</p>
      <p
        className={
          reading.outOfDate
            ? 'domain-reading__value domain-reading__value--stale'
            : 'domain-reading__value'
        }
      >
        {reading.text}
        {reading.outOfDate ? ' — out of date' : ''}{' '}
        {reading.origin === undefined ? null : (
          <span className="origin-badge" data-testid="domain-origin" title={reading.origin.detail}>
            {reading.origin.label}
          </span>
        )}
      </p>

      {open ? (
        reading.question === undefined ? (
          /*
           * The same repair, on the row that had not even a placeholder — F40.
           *
           * A concept with no closed set of answers gets a free-text box, and
           * the box arrived with no name at all: the reading it replaces is two
           * lines above it and nothing connected the two. The label names the
           * reading and says what kind of answer the app wants, and the note
           * says what happens to it — which is the difference between "add
           * this" and "this becomes what the app believes".
           */
          <div className="domain-correction">
            <label className="domain-correction__prompt" htmlFor={`concept-${reading.concept}`}>
              {reading.label}, in your own words
            </label>
            <p className="domain-correction__note">
              {known
                ? 'This replaces what the app has here, and is what it reads from now on.'
                : 'The app has nothing here yet. What you write becomes what it reads from now on.'}
            </p>
            <input
              id={`concept-${reading.concept}`}
              type="text"
              className="domain-input"
              value={draft}
              disabled={disabled}
              onChange={(event) => onDraftChange(event.target.value)}
            />
            <div className="domain-correction__actions">
              <button
                type="button"
                className="domain-option"
                disabled={disabled || draft.trim() === ''}
                onClick={() => onSubmit({ type: 'text', value: draft.trim() })}
              >
                Save
              </button>
              <button
                type="button"
                className="domain-linkish"
                disabled={disabled}
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="domain-correction">
            <p className="domain-correction__prompt">{reading.question.prompt(situation)}</p>
            <div className="domain-options">
              {reading.question.options(situation).map((option: QuestionOption) => (
                <button
                  key={option.id}
                  type="button"
                  className="domain-option"
                  disabled={disabled}
                  onClick={() => onSubmit(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button type="button" className="domain-linkish" disabled={disabled} onClick={onClose}>
              Cancel
            </button>
          </div>
        )
      ) : reading.derived ? (
        /*
         * A conclusion, so there is nothing to correct here — QA-82-001.
         *
         * The row above it is the one he answered and the one he can change,
         * and saying so is the difference between a read-only row and a row
         * that looks broken. Correcting this one would write a record nothing
         * reads and would read, on this page, as changing the arrangement.
         */
        <p className="domain-reading__note" data-testid="domain-reading-derived">
          Worked out from what you have told the app.
        </p>
      ) : (
        <button type="button" className="domain-linkish" disabled={disabled} onClick={onOpen}>
          {known ? 'Not right?' : 'Add this'}
        </button>
      )}
    </div>
  )
}
