import { useMemo, useState, type ReactNode } from 'react'
import { Panel, Row, Rows, Screen } from '../../components/ui'
import { coreDomains } from '../../domain/domains'
import type { EntityIndex } from '../../domain/entities'
import { matchKnowledge, type Knowledge, type KnowledgeState } from '../../domain/knowledge'
import {
  discreetPlaceholder,
  mayShowDetail,
  type DisplayPolicy,
  type PrivacyClass,
} from '../../domain/privacy'
import { describeFactValue, type FactValue } from '../../domain/records'
import { renderRecommendation } from '../../domain/recommendation'
import {
  addLocalDays,
  civilDateFromDayId,
  instant,
  instantToIso,
  localDateTimeAt,
  localDayIdAt,
  localWeekIdAt,
  parseLocalDayId,
  parseTimeZone,
  resolveLocal,
  type Instant,
  type TimeZoneId,
  type WeekStartDay,
} from '../../domain/time'
import {
  ARCHITECTURES,
  decide,
  sweepDayBlocks,
  type ArchitectureId,
} from '../../intelligence/engine'
import { REBUILD_PHASE } from '../../platform/buildInfo'
import { nextGuideStep } from '../../intelligence/guide'
import { questionFor } from '../../intelligence/questions'
import type { ConceptId } from '../../domain/windows'
import { SCENARIOS } from '../../synthetic/scenarios'
import { useMemory } from '../memory/memoryContext'
import './QaScreen.css'

/** Whether the guide has a question that could actually produce this answer. */
function isAskable(entry: { readonly concept: ConceptId }): boolean {
  return questionFor(entry.concept) !== undefined
}

/**
 * The QA laboratory (canonical plan sections 31 and 35).
 *
 * "QA is a first-class product-development surface. It is not a hidden
 * emergency hack." Everything on this screen reads the real canonical store
 * through the real projections and the real engine, so what it shows is what
 * the owner is being told — and section 35's list is the contract it fills:
 * facts considered and how each was known, the active context, the candidates,
 * what was filtered and why, the ranking with its dimensions, the chosen move,
 * its uncertainty, its semantic subject, and what would change the answer.
 *
 * The clock and the store live above this screen now, so travelling in time
 * here moves Now too. That is the point: a scenario is worth loading because
 * you can then go and look at what the engine makes of it.
 *
 * This screen never appears in a production build; it lives behind More, is
 * loaded on demand, and its route resolves to Now when the target is
 * production.
 */

const ZONE_CHOICES = [
  'Pacific/Auckland',
  'Australia/Sydney',
  'Europe/London',
  'UTC',
  'America/New_York',
  'America/Denver',
  'America/Los_Angeles',
]

const WEEK_STARTS: readonly { readonly value: WeekStartDay; readonly label: string }[] = [
  { value: 1, label: 'Monday (ISO)' },
  { value: 7, label: 'Sunday' },
  { value: 6, label: 'Saturday' },
]

const STATE_LABELS: Record<KnowledgeState, string> = {
  explicit: 'Known',
  inferred: 'Inferred',
  stale: 'Stale',
  unknown: 'Unknown',
}

interface ValueContext {
  readonly privacy: PrivacyClass
  readonly policy: DisplayPolicy
  readonly entities: EntityIndex
  readonly zone: TimeZoneId
}

function valueText(value: FactValue, context: ValueContext): string {
  if (!mayShowDetail(context.privacy, context.policy)) return discreetPlaceholder(context.privacy)
  // An entity value reads as the thing it names, which is the point of holding
  // a reference rather than a phrase.
  return describeFactValue(value, (ref) => context.entities.labelFor(ref))
}

function describeKnowledge(knowledge: Knowledge<FactValue>, context: ValueContext): string {
  return matchKnowledge(knowledge, {
    explicit: (known) => valueText(known.value, context),
    inferred: (known) =>
      `${valueText(known.value, context)} · inferred, ${Math.round(known.confidence * 100)}%`,
    stale: (known) =>
      `${valueText(known.value, context)} · stale since ${localDayIdAt(known.staleSince, context.zone)}`,
    unknown: (known) =>
      `not known — ${known.reason}${known.note === undefined ? '' : ` (${known.note})`}`,
  })
}

function Collapsible({
  title,
  count,
  children,
  open,
}: {
  title: string
  count?: number
  children: ReactNode
  open?: boolean
}) {
  return (
    <details className="qa-block" open={open ?? false}>
      <summary className="qa-block__summary">
        <span>{title}</span>
        {count === undefined ? null : <span className="qa-block__count">{count}</span>}
      </summary>
      <div className="qa-block__body">{children}</div>
    </details>
  )
}

export function QaScreen() {
  const memory = useMemory()
  const [revealPrivate, setRevealPrivate] = useState(false)
  const [draft, setDraft] = useState('')
  const [resolution, setResolution] = useState<'exact' | 'gap' | 'ambiguous'>('exact')
  const [architecture, setArchitecture] = useState<ArchitectureId>('deterministic')

  const policy: DisplayPolicy = { surface: 'inspection', revealPrivate }
  const { now, zone, weekStartsOn, view } = memory

  const moment = useMemo(() => ({ now, zone, weekStartsOn }), [now, zone, weekStartsOn])

  // Probing runs the whole decision again under each possible answer, which is
  // why it is asked for here and nowhere else.
  const decision = useMemo(
    () => decide(view, moment, { architecture, probe: true }),
    [view, moment, architecture],
  )
  const guide = useMemo(
    () => nextGuideStep(view, moment, { architecture }),
    [view, moment, architecture],
  )

  const local = localDateTimeAt(now, zone)
  const weekId = localWeekIdAt(now, zone, weekStartsOn)

  const zones = useMemo(() => [...new Set<string>([zone, ...ZONE_CHOICES])].sort(), [zone])

  const travelTo = (target: Instant) => {
    memory.travelTo(target)
    // The DST note belongs to the wall-clock time that was typed, not to the
    // clock in general. Leaving it up after moving away would claim a time
    // does not exist when it plainly does.
    setResolution('exact')
  }

  const setExactLocal = (input: string) => {
    // `datetime-local` gives a wall-clock time with no zone. Placing it on the
    // real timeline is exactly the operation DST makes interesting, so the
    // resolution is shown rather than hidden.
    const [datePart, timePart] = input.split('T')
    const dayId = parseLocalDayId(datePart ?? '')
    if (dayId === undefined || timePart === undefined) return
    const [hour, minute] = timePart.split(':')
    const resolved = resolveLocal(
      {
        ...civilDateFromDayId(dayId),
        hour: Number(hour ?? 0),
        minute: Number(minute ?? 0),
        second: 0,
      },
      zone,
    )
    memory.travelTo(resolved.at)
    setResolution(resolved.resolution)
  }

  const facts = view.facts
  const trace = decision.trace

  return (
    <Screen
      eyebrow={`Phase ${REBUILD_PHASE.number}`}
      title="QA"
      lede="Synthetic histories, a clock you can move, and the whole of how a decision was reached."
    >
      <Panel title="Synthetic scenarios">
        <div className="qa-scenarios">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              className={
                memory.loadedLabel === scenario.id
                  ? 'qa-scenario qa-scenario--active'
                  : 'qa-scenario'
              }
              disabled={memory.busy}
              onClick={() => {
                const document = scenario.build()
                memory.setZone(scenario.zone)
                memory.setWeekStartsOn(scenario.weekStartsOn ?? 1)
                travelTo(scenario.now)
                setDraft(`${JSON.stringify(document, null, 2)}\n`)
                void memory.loadDocument(JSON.stringify(document), scenario.id)
              }}
            >
              <span className="qa-scenario__title">{scenario.title}</span>
              <span className="qa-scenario__summary">{scenario.summary}</span>
              <span className="qa-scenario__proves">{scenario.proves}</span>
            </button>
          ))}
        </div>
        <div className="qa-actions">
          {/* It cannot reach the owner's own records, and the old name said it
              could. Emptying the laboratory is what puts his history back. */}
          <button type="button" onClick={() => void memory.clear()} disabled={memory.busy}>
            Empty the laboratory
          </button>
        </div>
      </Panel>

      <Panel title="Where the clock is">
        <Rows>
          <Row label="Owner-local" value={`${local.dayId} ${local.timeOfDay}`} />
          <Row label="Local week" value={weekId} />
          <Row label="Real instant" value={instantToIso(now)} mono />
        </Rows>

        <div className="qa-travel">
          <button type="button" onClick={() => travelTo(addLocalDays(now, -7, zone))}>
            −1 week
          </button>
          <button type="button" onClick={() => travelTo(addLocalDays(now, -1, zone))}>
            −1 day
          </button>
          <button type="button" onClick={() => travelTo(instant(now - 3_600_000))}>
            −1 hour
          </button>
          <button type="button" onClick={() => travelTo(instant(now + 3_600_000))}>
            +1 hour
          </button>
          <button type="button" onClick={() => travelTo(addLocalDays(now, 1, zone))}>
            +1 day
          </button>
          <button type="button" onClick={() => travelTo(addLocalDays(now, 7, zone))}>
            +1 week
          </button>
        </div>

        <label className="qa-field">
          <span>Travel to</span>
          <input
            type="datetime-local"
            value={`${local.dayId}T${local.timeOfDay}`}
            onChange={(event) => setExactLocal(event.target.value)}
          />
        </label>

        {resolution === 'exact' ? null : (
          <p className="qa-warning" data-testid="dst-note">
            {resolution === 'gap'
              ? 'That wall-clock time does not exist here — the clocks jump over it. Moved to just after the gap.'
              : 'That wall-clock time happens twice here. Using the first one.'}
          </p>
        )}

        <label className="qa-field">
          <span>Timezone</span>
          <select
            value={zone}
            onChange={(event) => {
              const next = parseTimeZone(event.target.value)
              if (next !== undefined) memory.setZone(next)
            }}
          >
            {zones.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
        </label>

        <label className="qa-field">
          <span>Week starts</span>
          <select
            value={weekStartsOn}
            onChange={(event) => memory.setWeekStartsOn(Number(event.target.value) as WeekStartDay)}
          >
            {WEEK_STARTS.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        </label>

        <label className="qa-field qa-field--inline">
          <input
            type="checkbox"
            checked={revealPrivate}
            onChange={(event) => setRevealPrivate(event.target.checked)}
          />
          <span>Show private detail</span>
        </label>
      </Panel>

      <Panel title="The decision">
        <label className="qa-field">
          <span>Architecture</span>
          <select
            value={architecture}
            onChange={(event) => setArchitecture(event.target.value as ArchitectureId)}
          >
            {ARCHITECTURES.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
        </label>

        {decision.explanation === undefined ? (
          <p className="qa-warning" data-testid="qa-no-action">
            {decision.noAction?.headline} — {decision.noAction?.reason}
          </p>
        ) : (
          <div className="qa-recommendation">
            <p className="qa-recommendation__sentence" data-testid="qa-decision-sentence">
              {decision.explanation.rendered.sentence}
            </p>
            <p className="note">{decision.explanation.rendered.reason}</p>
            <Rows>
              <Row label="Subject" value={decision.explanation.rendered.subjectLabel} />
              <Row label="Situation" value={decision.explanation.premise} />
              {/* From the situation rather than the explanation: Now hides the
                  limiter when the chosen move already answers it, and the trace
                  should show what was read either way. */}
              <Row
                label="Limiter"
                value={decision.situation.limiter?.summary ?? 'nothing in particular'}
              />
              <Row label="Follow-up" value={decision.explanation.rendered.followUp} />
            </Rows>
          </div>
        )}

        <Rows>
          <Row label="Part of day" value={trace.block} />
          <Row label="Weekly direction" value={describeDirection(trace)} />
          <Row label="Guide" value={guide.because} />
        </Rows>
      </Panel>

      <BlockSweepPanel view={view} moment={moment} architecture={architecture} />

      <Collapsible title="Facts considered" count={trace.facts.length} open>
        <Rows testId="qa-facts">
          {trace.facts.map((fact) => (
            <Row
              key={fact.concept}
              label={`${fact.label} · ${STATE_LABELS[fact.state].toLowerCase()}`}
              value={
                mayShowDetail(fact.privacy, policy)
                  ? `${fact.reading} — for ${fact.usedFor.join(', ')}`
                  : `${discreetPlaceholder(fact.privacy)} — for ${fact.usedFor.join(', ')}`
              }
            />
          ))}
        </Rows>
      </Collapsible>

      <Collapsible title="Moves considered" count={trace.proposed.length}>
        {trace.proposed.length === 0 ? (
          <p className="note">Nothing in this history suggested a move.</p>
        ) : (
          <Rows>
            {trace.proposed.map((move) => (
              <Row key={move.id} label={move.id} value={`${move.subject} — ${move.because}`} />
            ))}
          </Rows>
        )}
      </Collapsible>

      <Collapsible title="Ruled out" count={trace.rejected.length}>
        {trace.rejected.length === 0 ? (
          <p className="note">Everything proposed fitted.</p>
        ) : (
          <Rows>
            {trace.rejected.map((rejection) => (
              <Row
                key={`${rejection.candidate}-${rejection.reason}`}
                label={rejection.candidate}
                value={`${rejection.reason} — ${rejection.explanation}`}
              />
            ))}
          </Rows>
        )}
      </Collapsible>

      <Collapsible title="Ranking" count={trace.ranking.length}>
        {trace.ranking.length === 0 ? (
          <p className="note">Nothing survived to be ranked.</p>
        ) : (
          trace.ranking.map((row) => (
            <details
              key={row.id}
              className="qa-rank"
              open={row.id === trace.chosen}
              data-chosen={row.id === trace.chosen ? 'yes' : undefined}
            >
              <summary className="qa-rank__summary">
                <span className="qa-rank__score">{row.score.toFixed(3)}</span>
                <span>{row.sentence}</span>
              </summary>
              <Rows>
                {row.dimensions.map((dimension) => (
                  <Row
                    key={dimension.name}
                    label={`${dimension.name} ×${dimension.weight}`}
                    value={`${dimension.value >= 0 ? '+' : ''}${dimension.value.toFixed(2)} — ${dimension.note}`}
                  />
                ))}
              </Rows>
              {row.cautions.length === 0 ? null : (
                <p className="qa-warning">{row.cautions.join(' · ')}</p>
              )}
            </details>
          ))
        )}
        {trace.notes.length === 0 ? null : (
          <ul className="qa-malformed__issues" data-testid="qa-notes">
            {trace.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
      </Collapsible>

      {/*
        What this owner's own outcomes did to each move, and how much of it
        there was (sections 35 and 48).

        The three aspects are shown apart because they are kept apart in the
        reasoning: a run of refusals appears under "passed on" and nowhere else,
        so it is visible here that a decline never became a claim about whether
        the move works. `pull` is the number worth reading — with one comparable
        evening it is a quarter, which is section 20's "one success is not
        proof" as something checkable rather than promised.
      */}
      <Collapsible title="What it has learned" count={trace.learning.length}>
        {trace.learning.length === 0 ? (
          <p className="note">Nothing survived to learn about.</p>
        ) : (
          trace.learning.map((row) => (
            <details
              key={row.candidate}
              className="qa-rank"
              open={row.candidate === trace.chosen}
              data-chosen={row.candidate === trace.chosen ? 'yes' : undefined}
            >
              <summary className="qa-rank__summary">
                <span className="qa-rank__score">{row.samples}</span>
                <span>{row.summary ?? `${row.verb} — nothing earned yet`}</span>
              </summary>
              <Rows>
                <Row
                  label="Worth tonight"
                  value={`${row.startedAt.now.toFixed(2)} → ${row.landedAt.now.toFixed(2)}${
                    row.moved === 'now' ? '' : ' (unchanged — judged the next morning)'
                  }`}
                />
                <Row
                  label="Worth tomorrow"
                  value={`${row.startedAt.tomorrow.toFixed(2)} → ${row.landedAt.tomorrow.toFixed(2)}${
                    row.moved === 'tomorrow' ? '' : ' (unchanged — judged the same evening)'
                  }`}
                />
                <Row
                  label="Comparable results"
                  value={
                    row.samples === 0
                      ? 'none'
                      : `${row.samples}, pulling the starting belief ${Math.round(row.pull * 100)} percent of the way`
                  }
                />
                {/*
                  Where the evidence came from, beside how much of it there is.
                  "3 comparable results" could be three things the owner said,
                  three things the app worked out, or a mix, and he cannot judge
                  whether to correct a belief without knowing which.
                */}
                {row.evidenceMix === undefined ? null : (
                  <Row label="Who said so" value={row.evidenceMix} />
                )}
                <Row
                  label="Could it happen"
                  value={`${row.followThrough.samples === 0 ? 'never tested' : `${Math.round(row.followThrough.rate * 100)} percent`} — ${row.followThrough.note}`}
                />
                <Row
                  label="Does it land"
                  value={`${row.result.samples === 0 ? 'never asked' : `${Math.round(row.result.reached * 100)} percent, over ${row.result.samples}`} — ${row.result.note}`}
                />
                <Row
                  label="How hard it is"
                  value={`${row.friction.started.toFixed(2)} → ${row.friction.landed.toFixed(2)}${row.friction.samples === 0 ? '' : `, over ${row.friction.samples}`} — ${row.friction.note}`}
                />
                <Row label="Passed on" value={row.appetite.note} />
                {row.corrected ? (
                  <Row label="Corrected" value="the owner has ruled this belief out" />
                ) : null}
              </Rows>
              {row.evidence.length === 0 ? null : (
                <p className="note">
                  Evidence:{' '}
                  {row.evidence
                    .map((ref) => `${ref.record} (${ref.source}, worth ${ref.reliability})`)
                    .join(', ')}
                </p>
              )}
            </details>
          ))
        )}
      </Collapsible>

      <Collapsible title="Episodes" count={trace.episodes.length}>
        {trace.episodes.length === 0 ? (
          <p className="note">Nothing has been acted on yet.</p>
        ) : (
          <Rows>
            {trace.episodes.map((episode) => (
              <Row
                key={episode.recommendation}
                label={`${episode.dayId} · ${episode.state}`}
                value={`${episode.sentence} — ${episode.outcome}; ${episode.context}; resembles tonight ${Math.round(episode.resembles * 100)} percent`}
              />
            ))}
          </Rows>
        )}
      </Collapsible>

      <Collapsible title="What would change the answer" count={trace.wouldChange.length}>
        {trace.wouldChange.length === 0 ? (
          <p className="note">Nothing left that could move it.</p>
        ) : (
          trace.wouldChange.map((swing) => (
            <div key={swing.concept} className="qa-group" data-changes={swing.changesTheAnswer}>
              <h3 className="qa-group__title">
                {swing.label}
                <span className="qa-block__count">
                  {swing.changesTheAnswer ? 'changes it' : 'no'}
                </span>
              </h3>
              <Rows>
                {swing.outcomes.map((outcome) => (
                  <Row key={outcome.answer} label={outcome.answer} value={outcome.wouldChoose} />
                ))}
              </Rows>
            </div>
          ))
        )}
      </Collapsible>

      <Panel title="Storage">
        <Rows>
          <Row label="Backend" value={memory.backend} />
          <Row label="Durable" value={memory.durable ? 'Yes' : 'No — nothing is being kept'} />
          <Row label="Records" value={String(memory.snapshot.records.length)} />
          <Row label="Entities" value={String(memory.snapshot.entities.length)} />
          <Row label="Unreadable rows" value={String(memory.snapshot.malformed.length)} />
        </Rows>
        <div className="qa-actions">
          <button type="button" onClick={() => void memory.verifyStorage()} disabled={memory.busy}>
            Reopen and verify
          </button>
        </div>
        {memory.storageCheck === undefined ? null : (
          <p
            className={memory.storageCheck.ok ? 'qa-ok' : 'qa-warning'}
            data-testid="storage-check"
          >
            {memory.storageCheck.ok ? 'Came back intact: ' : 'Did not come back intact: '}
            {memory.storageCheck.detail}
          </p>
        )}
        {memory.error === undefined ? null : <p className="qa-warning">{memory.error}</p>}
      </Panel>

      <Collapsible title="What the system believes" count={facts.entries.length}>
        {(['explicit', 'inferred', 'stale', 'unknown'] as const).map((state) => {
          const entries = facts.inState(state)
          if (entries.length === 0) return null
          return (
            <div key={state} className="qa-group" data-state={state}>
              <h3 className="qa-group__title">
                {STATE_LABELS[state]} <span className="qa-block__count">{entries.length}</span>
              </h3>
              <Rows>
                {entries.map((entry) => (
                  <Row
                    key={entry.concept}
                    label={entry.definition.label}
                    value={describeKnowledge(entry.knowledge, {
                      privacy: entry.definition.privacy,
                      policy,
                      entities: view.entities,
                      zone,
                    })}
                  />
                ))}
              </Rows>
            </div>
          )
        })}
      </Collapsible>

      {/*
        Two lists, because they were one and the one said something untrue —
        AUD-0041.

        `facts.questions` is every concept the app would like an answer to. The
        guide can only ask what the `QUESTIONS` catalogue holds, so a concept
        that is material and has no entry there was being reported as something
        the app would ask about while nothing could ever put it on screen. That
        is the third of the app's three positions on `emotionalState` — the
        registry saying an answer matters, the page inviting one, and the guide
        never asking — and it is not fixed by hiding the row. The rest are real
        and are supplied by naming the thing on its own page: a learning topic
        and a week's direction are not multiple-choice answers.
      */}
      <Collapsible title="What it would ask" count={facts.questions.filter(isAskable).length}>
        {facts.questions.filter(isAskable).length === 0 ? (
          <p className="note">Nothing worth asking right now.</p>
        ) : (
          <Rows>
            {facts.questions.filter(isAskable).map((entry) => (
              <Row
                key={entry.concept}
                label={entry.definition.label}
                value={coreDomains.labelFor(entry.definition.domain)}
              />
            ))}
          </Rows>
        )}
      </Collapsible>

      <Collapsible
        title="Wanted, and named rather than asked"
        count={facts.questions.filter((entry) => !isAskable(entry)).length}
      >
        {facts.questions.filter((entry) => !isAskable(entry)).length === 0 ? (
          <p className="note">Nothing outstanding that has to be typed.</p>
        ) : (
          <Rows>
            {facts.questions
              .filter((entry) => !isAskable(entry))
              .map((entry) => (
                <Row
                  key={entry.concept}
                  label={entry.definition.label}
                  value={`${coreDomains.labelFor(entry.definition.domain)} — on its own page`}
                />
              ))}
          </Rows>
        )}
      </Collapsible>

      <Collapsible title="Recommendations in history" count={recommendationsOf(view).length}>
        {recommendationsOf(view).length === 0 ? (
          <p className="note">No recommendation in this history.</p>
        ) : (
          recommendationsOf(view).map((record) => {
            const rendered = renderRecommendation(
              record.recommendation,
              view.entities,
              record.context?.block,
            )
            if (!rendered.ok) {
              return (
                <div key={record.id} className="qa-warning" data-testid="recommendation-broken">
                  Cannot be shown — {rendered.issues.map((issue) => issue.problem).join(', ')}
                </div>
              )
            }
            return (
              <div key={record.id} className="qa-recommendation">
                <p className="qa-recommendation__sentence" data-testid="recommendation-sentence">
                  {rendered.rendered.sentence}
                </p>
                <p className="note">{rendered.rendered.reason}</p>
                <Rows>
                  <Row label="Subject" value={rendered.rendered.subjectLabel} />
                  <Row label="Move" value={rendered.rendered.verbLabel} />
                  <Row label="Follow-up" value={rendered.rendered.followUp} />
                  <Row label="Evidence" value={String(record.recommendation.evidence.length)} />
                </Rows>
              </div>
            )
          })
        )}
      </Collapsible>

      <Collapsible title="Entities" count={view.entities.all().length}>
        {view.entities.all().length === 0 ? (
          <p className="note">No entities in this history.</p>
        ) : (
          <Rows>
            {view.entities.all().map((entity) => (
              <Row key={entity.id} label={entity.label} value={`${entity.kind} · ${entity.id}`} />
            ))}
          </Rows>
        )}
      </Collapsible>

      <Collapsible
        title="Relationships"
        count={view.relationships.edges.length + view.relationships.events.length}
      >
        {view.relationships.edges.length === 0 && view.relationships.events.length === 0 ? (
          <p className="note">Nothing connected yet.</p>
        ) : (
          <Rows>
            {view.relationships.edges.map((edge) => (
              <Row
                key={`${edge.from}-${edge.relation}-${edge.to}`}
                label={edge.relation}
                value={`${edge.from} → ${edge.to}`}
              />
            ))}
            {view.relationships.events.map((event) => (
              <Row key={event.source} label={event.entity} value={event.nature} />
            ))}
          </Rows>
        )}
        {view.relationships.dangling.length === 0 ? null : (
          <p className="qa-warning">
            {view.relationships.dangling.length} link(s) point at an entity that is not here.
          </p>
        )}
      </Collapsible>

      <Collapsible title="Unreadable rows" count={memory.snapshot.malformed.length}>
        {memory.snapshot.malformed.length === 0 ? (
          <p className="note">Every row parsed.</p>
        ) : (
          <ul className="qa-malformed" data-testid="malformed-rows">
            {memory.snapshot.malformed.map((row) => (
              <li key={`${row.index}-${row.id ?? 'anonymous'}`} className="qa-malformed__row">
                <div className="qa-malformed__head">
                  row {row.index}
                  {row.id === undefined ? '' : ` · ${row.id}`}
                </div>
                <ul className="qa-malformed__issues">
                  {row.issues.map((issue) => (
                    <li key={`${issue.path}-${issue.problem}`}>
                      {issue.path}: {issue.problem}
                    </li>
                  ))}
                </ul>
                <pre className="qa-raw">{JSON.stringify(row.raw, null, 2)}</pre>
              </li>
            ))}
          </ul>
        )}
      </Collapsible>

      <Collapsible title="History" count={view.summary.total}>
        <Rows>
          <Row label="Records" value={String(view.summary.total)} />
          <Row label="Still standing" value={String(view.summary.effective)} />
          <Row label="Replaced or withdrawn" value={String(view.summary.displaced)} />
          <Row label="Local days covered" value={String(view.summary.byLocalDay.size)} />
          <Row label="Local weeks covered" value={String(view.summary.byLocalWeek.size)} />
        </Rows>
        {view.history.issues.length === 0 ? null : (
          <ul className="qa-malformed__issues">
            {view.history.issues.map((issue) => (
              <li key={`${issue.record}-${issue.problem}`}>
                {issue.problem}: {issue.record} → {issue.target}
              </li>
            ))}
          </ul>
        )}
      </Collapsible>

      <Collapsible title="The document" count={memory.snapshot.records.length}>
        <p className="note">
          Paste any synthetic history here and load it. A row that cannot be read is reported above
          rather than losing the rows around it.
        </p>
        <textarea
          className="qa-editor"
          aria-label="Synthetic history JSON"
          spellCheck={false}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="qa-actions">
          <button
            type="button"
            disabled={memory.busy}
            onClick={() => void memory.loadDocument(draft)}
          >
            Load this
          </button>
          <button type="button" onClick={() => setDraft(memory.documentJson())}>
            Fill from current
          </button>
        </div>
        {memory.issues.length === 0 ? null : (
          <ul className="qa-malformed__issues" data-testid="document-issues">
            {memory.issues.map((issue) => (
              <li key={`${issue.path}-${issue.problem}`}>
                {issue.path}: {issue.problem}
              </li>
            ))}
          </ul>
        )}
      </Collapsible>
    </Screen>
  )
}

/**
 * The same history, decided at all five blocks of one day — AUD-0008.
 *
 * The audit's own words for why this exists: to find the morning defects an
 * auditor had to know to move the clock to ten, and nothing in the laboratory
 * said so. One press answers the question the library could not ask — *does
 * this history still make sense at nine in the morning?* — and puts the five
 * answers where they can be read against each other.
 *
 * It does not move the clock. The rows are computed from the same store at five
 * other moments, so the decision above them is still the one being inspected,
 * and pressing this cannot lose the state somebody is halfway through
 * examining. It is behind a press rather than always open because it is five
 * more runs of the whole pipeline.
 */
function BlockSweepPanel({
  view,
  moment,
  architecture,
}: {
  view: ReturnType<typeof useMemory>['view']
  moment: { now: Instant; zone: TimeZoneId; weekStartsOn: WeekStartDay }
  architecture: ArchitectureId
}) {
  const [open, setOpen] = useState(false)

  const swept = useMemo(
    () => (open ? sweepDayBlocks(view, moment, { architecture }) : undefined),
    [open, view, moment, architecture],
  )

  return (
    <Panel title="The whole day">
      <p className="note">
        The same history, decided at every block of {localDayIdAt(moment.now, moment.zone)}. Nothing
        is written and the clock does not move.
      </p>
      <div className="qa-actions">
        <button type="button" onClick={() => setOpen((shown) => !shown)} data-testid="qa-sweep">
          {open ? 'Hide the block sweep' : 'Sweep the day'}
        </button>
      </div>

      {swept === undefined ? null : (
        <div className="qa-sweep" data-testid="qa-sweep-rows">
          {swept.map((row) => (
            <div
              key={row.block}
              className="qa-sweep__row"
              data-block={row.block}
              data-kind={row.decision.kind}
            >
              <p className="qa-sweep__when">
                {row.block.replace('-', ' ')} · {row.timeOfDay}
              </p>
              <p className="qa-sweep__move">
                {row.decision.explanation?.rendered.sentence ??
                  row.decision.noAction?.headline ??
                  'nothing'}
              </p>
              <p className="qa-sweep__note">
                {row.decision.explanation?.rendered.reason ?? row.decision.noAction?.detail ?? ''}
              </p>
              <p className="qa-sweep__note">
                In the way: {row.decision.situation.limiter?.summary ?? 'nothing in particular'}
              </p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

function describeDirection(trace: { direction: { weekly: { state: string } } }): string {
  const weekly = trace.direction.weekly as {
    state: string
    wording?: string
    weekId?: string
  }
  if (weekly.state === 'none') return 'none set'
  return `${weekly.state} · “${weekly.wording ?? ''}” (${weekly.weekId ?? ''})`
}

function recommendationsOf(view: ReturnType<typeof useMemory>['view']) {
  return view.history.effective.filter((record) => record.kind === 'action-recommendation')
}
