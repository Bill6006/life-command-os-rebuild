import { useCallback, useMemo, useRef, useState } from 'react'
import { Panel, Screen } from '../../components/ui'
import type { LifeDomainId } from '../../domain/domains'
import type { FactValue, GoalStatus } from '../../domain/records'
import { localDayIdAt, localDaysBetween, systemClock } from '../../domain/time'
import type { ConceptId } from '../../domain/windows'
import {
  contextCorrectionRecord,
  coverageInterpretationRecord,
  domainStatusCorrectionRecord,
  factCorrectionRecord,
  goalCorrectionRecord,
} from '../../intelligence/corrections'
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
  type DomainGoal,
  type DomainPageData,
  type LifePage,
  type RecentChange,
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

  const situation = useMemo<Situation | undefined>(() => {
    if (!memory.ready || memory.snapshot.records.length === 0) return undefined
    return assembleSituation(memory.view, {
      now: memory.now,
      zone: memory.zone,
      weekStartsOn: memory.weekStartsOn,
    })
  }, [memory.ready, memory.snapshot, memory.view, memory.now, memory.zone, memory.weekStartsOn])

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
        <Panel title="Goals here">
          {data.goals.map((goal) => (
            <div key={goal.source} className="domain-goal">
              <p className="domain-goal__statement">
                {goal.statement}{' '}
                {goal.origin === undefined ? null : (
                  <span
                    className="origin-badge"
                    data-testid="domain-origin"
                    title={goal.origin.detail}
                  >
                    {goal.origin.label}
                  </span>
                )}
              </p>
              <div className="domain-goal__actions">
                <button
                  type="button"
                  className="domain-option"
                  disabled={busy || goal.record === undefined}
                  onClick={() => correctGoal(goal, 'achieved')}
                >
                  Done
                </button>
                <button
                  type="button"
                  className="domain-option"
                  disabled={busy || goal.record === undefined}
                  onClick={() => correctGoal(goal, 'abandoned')}
                >
                  No longer this
                </button>
              </div>
            </div>
          ))}
        </Panel>
      )}

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
        <div className="domain-correction">
          <input
            type="text"
            className="domain-input"
            value={draft}
            placeholder="What's changed"
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
          <div className="domain-correction">
            <input
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
              {reading.question.options.map((option: QuestionOption) => (
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
      ) : (
        <button type="button" className="domain-linkish" disabled={disabled} onClick={onOpen}>
          {known ? 'Not right?' : 'Add this'}
        </button>
      )}
    </div>
  )
}
