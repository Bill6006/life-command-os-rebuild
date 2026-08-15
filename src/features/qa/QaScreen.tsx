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
  systemClock,
  type Instant,
  type TimeZoneId,
  type WeekStartDay,
} from '../../domain/time'
import { buildView } from '../../memory/view'
import { SCENARIOS } from '../../synthetic/scenarios'
import { useMemoryLab } from './useMemoryLab'
import './QaScreen.css'

/**
 * The QA laboratory (canonical plan section 31).
 *
 * "QA is a first-class product-development surface. It is not a hidden
 * emergency hack." Everything on this screen reads the real canonical store
 * through the real projections, so what it shows is what the engine will see —
 * and the whole point of building it before Phase 2 is that the reasoning has
 * somewhere to be inspected the moment it exists.
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
  const lab = useMemoryLab()
  const clock = useMemo(() => systemClock(), [])

  const [zone, setZone] = useState<TimeZoneId>(clock.zone())
  const [now, setNow] = useState<Instant>(() => clock.now())
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStartDay>(1)
  const [revealPrivate, setRevealPrivate] = useState(false)
  const [draft, setDraft] = useState('')
  const [resolution, setResolution] = useState<'exact' | 'gap' | 'ambiguous'>('exact')

  const policy: DisplayPolicy = { surface: 'inspection', revealPrivate }

  const view = useMemo(
    () => buildView(lab.snapshot, { now, zone, weekStartsOn }),
    [lab.snapshot, now, zone, weekStartsOn],
  )

  const local = localDateTimeAt(now, zone)
  const weekId = localWeekIdAt(now, zone, weekStartsOn)

  const zones = useMemo(() => {
    const all = new Set<string>([clock.zone(), ...ZONE_CHOICES])
    return [...all].sort()
  }, [clock])

  const travelTo = (target: Instant) => {
    setNow(target)
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
    setNow(resolved.at)
    setResolution(resolved.resolution)
  }

  const facts = view.facts
  const byState = (state: KnowledgeState) => facts.inState(state)

  return (
    <Screen
      eyebrow="Phase 1"
      title="QA"
      lede="Synthetic histories, a clock you can move, and everything the system currently believes."
    >
      <Panel title="Synthetic scenarios">
        <div className="qa-scenarios">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              className={
                lab.loadedScenarioId === scenario.id
                  ? 'qa-scenario qa-scenario--active'
                  : 'qa-scenario'
              }
              disabled={lab.busy}
              onClick={() => {
                setZone(scenario.zone)
                travelTo(scenario.now)
                setWeekStartsOn(scenario.weekStartsOn ?? 1)
                setDraft(`${JSON.stringify(scenario.build(), null, 2)}\n`)
                void lab.loadScenario(scenario.id)
              }}
            >
              <span className="qa-scenario__title">{scenario.title}</span>
              <span className="qa-scenario__summary">{scenario.summary}</span>
              <span className="qa-scenario__proves">{scenario.proves}</span>
            </button>
          ))}
        </div>
        <div className="qa-actions">
          <button type="button" onClick={() => void lab.clear()} disabled={lab.busy}>
            Clear everything
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
          <p className="qa-warning">
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
              if (next !== undefined) setZone(next)
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
            onChange={(event) => setWeekStartsOn(Number(event.target.value) as WeekStartDay)}
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

      <Panel title="Storage">
        <Rows>
          <Row label="Backend" value={lab.backend} />
          <Row label="Durable" value={lab.durable ? 'Yes' : 'No — nothing is being kept'} />
          <Row label="Records" value={String(lab.snapshot.records.length)} />
          <Row label="Entities" value={String(lab.snapshot.entities.length)} />
          <Row label="Unreadable rows" value={String(lab.snapshot.malformed.length)} />
        </Rows>
        <div className="qa-actions">
          <button type="button" onClick={() => void lab.verifyStorage()} disabled={lab.busy}>
            Reopen and verify
          </button>
        </div>
        {lab.storageCheck === undefined ? null : (
          <p className={lab.storageCheck.ok ? 'qa-ok' : 'qa-warning'} data-testid="storage-check">
            {lab.storageCheck.ok ? 'Came back intact: ' : 'Did not come back intact: '}
            {lab.storageCheck.detail}
          </p>
        )}
        {lab.error === undefined ? null : <p className="qa-warning">{lab.error}</p>}
      </Panel>

      <Collapsible title="What the system believes" count={facts.entries.length} open>
        {(['explicit', 'inferred', 'stale', 'unknown'] as const).map((state) => {
          const entries = byState(state)
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

      <Collapsible title="What it would ask" count={facts.questions.length}>
        {facts.questions.length === 0 ? (
          <p className="note">Nothing worth asking right now.</p>
        ) : (
          <Rows>
            {facts.questions.map((entry) => (
              <Row
                key={entry.concept}
                label={entry.definition.label}
                value={coreDomains.labelFor(entry.definition.domain)}
              />
            ))}
          </Rows>
        )}
      </Collapsible>

      <Collapsible title="Recommendations" count={recommendationsOf(view).length}>
        {recommendationsOf(view).length === 0 ? (
          <p className="note">No recommendation in this history.</p>
        ) : (
          recommendationsOf(view).map((record) => {
            const rendered = renderRecommendation(record.recommendation, view.entities)
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

      <Collapsible title="Unreadable rows" count={lab.snapshot.malformed.length}>
        {lab.snapshot.malformed.length === 0 ? (
          <p className="note">Every row parsed.</p>
        ) : (
          <ul className="qa-malformed" data-testid="malformed-rows">
            {lab.snapshot.malformed.map((row) => (
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

      <Collapsible title="The document" count={lab.snapshot.records.length}>
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
          <button type="button" disabled={lab.busy} onClick={() => void lab.loadJson(draft)}>
            Load this
          </button>
          <button type="button" onClick={() => setDraft(lab.documentJson(now))}>
            Fill from current
          </button>
        </div>
        {lab.issues.length === 0 ? null : (
          <ul className="qa-malformed__issues" data-testid="document-issues">
            {lab.issues.map((issue) => (
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

function recommendationsOf(view: ReturnType<typeof buildView>) {
  return view.history.effective.filter((record) => record.kind === 'action-recommendation')
}
