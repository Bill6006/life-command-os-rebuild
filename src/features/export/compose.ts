import { countOf } from '../../domain/counts'
import { DOMAIN, type LifeDomainId } from '../../domain/domains'
import { FULL_EXPORT, type DisplayPolicy } from '../../domain/privacy'
import type { CanonicalRecord } from '../../domain/records'
import { localDayIdAt, type Instant, type LocalDayId, type TimeZoneId } from '../../domain/time'
import type { Decision } from '../../intelligence/engine'
import type { InsightsReport } from '../../intelligence/insights'
import type { Situation } from '../../intelligence/situation'
import { describeRecord, tagFor, type DescribeContext } from '../history/describe'
import type { RecordOrigin } from '../history/origin'
import type { HistorySource } from '../memory/memoryContext'
import type { TimelineData } from '../timeline/timelineEntries'
import { handoffPrompt } from './handoffPrompt'
import { orderSelection, sectionById, type ExportSectionId } from './sections'

/**
 * The AI-review export (canonical plan section 52).
 *
 * One text document: the handoff prompt first, then a header saying what this
 * document is and is not, then the chosen sections. Plain text with light
 * Markdown, because the receiving end is an assistant in a chat box and the
 * only formats that survive a copy and a paste on a phone are the ones with no
 * attachments in them.
 *
 * ## The composer's whole job is not overstating
 *
 * D-091 governs this file as much as it governs the screens: the document
 * carries the app's conclusions to a reader who cannot see the evidence
 * underneath them, so every figure travels with what it counts and every
 * abstention is written down rather than omitted. A section that has nothing
 * to say **says that** — an empty heading tells the reader the app looked and
 * found nothing, where a missing heading tells them nothing at all and lets
 * them assume the area is fine.
 *
 * Nothing here computes a relationship, a rate or a belief. Everything stated
 * is read off the situation, the decision and the insights report — the same
 * objects the owner's own screens render — so the export cannot say something
 * the app does not already say to his face. That is deliberate: an export that
 * did its own arithmetic would be a second brain with no surface, and the
 * first time it disagreed with Now, nobody would find out.
 *
 * ## Whose history it is
 *
 * The header states the source, always. The laboratory can be inspected from
 * every surface, so it can be composed from too — that is how this composer
 * gets exercised against ten different lives — and a document built from a
 * fixture that did not say so would be a synthetic life handed to an assistant
 * as a real one. It is the same rule as the notice in the app shell (D-091's
 * eighth invariant), one artefact further out.
 */

export interface ExportRequest {
  readonly sections: readonly ExportSectionId[]
  readonly situation: Situation
  readonly decision: Decision
  readonly insights: InsightsReport
  readonly timeline: TimelineData
  readonly source: HistorySource
  readonly app: ExportApp
  /**
   * When this document is being composed, and in whose terms.
   *
   * Deliberately its own field rather than reused from the situation's clock.
   * The situation's clock is the history's — a synthetic scenario sets it to
   * whatever evening it is about — and "composed on" is a fact about now
   * (QA-07-005).
   */
  readonly composedAt: { readonly at: Instant; readonly zone: TimeZoneId }
}

/** Which build composed the document. Reported, never guessed. */
export interface ExportApp {
  readonly commitShort: string
  readonly commitSha: string
  readonly target: string
  readonly buildTime: string
  readonly phaseNumber: number
  readonly phaseTitle: string
  readonly phaseSummary: string
}

export interface ExportHeader {
  readonly composedAt: LocalDayId
  readonly source: HistorySource
  readonly app: ExportApp
  readonly firstDay: LocalDayId | undefined
  readonly lastDay: LocalDayId | undefined
  readonly records: number
  readonly domains: readonly LifeDomainId[]
  readonly sections: readonly ExportSectionId[]
  readonly privateIncluded: boolean
  readonly diagnosticsIncluded: boolean
}

export interface ComposedExport {
  readonly text: string
  /** The prompt on its own, for the Copy Prompt action. */
  readonly prompt: string
  readonly header: ExportHeader
}

const NOTHING_HERE = '_Nothing in the record for this._'

function heading(text: string): string {
  return `## ${text}`
}

/**
 * One sentence, ending in exactly one full stop.
 *
 * `noAction.headline` is already a sentence and already carries its own
 * terminator, so appending one produced "Nothing to suggest just yet.." in a
 * document that leaves the device (QA-07-008). Anything composed by joining a
 * fragment the app wrote to a fragment this file wrote has the same hazard,
 * and the answer is to make the join ask rather than assume.
 */
function sentence(text: string): string {
  const trimmed = text.trim()
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function bullet(text: string): string {
  return `- ${text}`
}

/**
 * A count with the thing it counts, never on its own.
 *
 * The rule the evidence component holds on screen, held here for the same
 * reason: "4 of 6" alone is a number an assistant will confidently interpret
 * as whatever it needs to be.
 */
function overOccasions(hit: number, of: number, measures: string): string {
  return `${hit} of ${of} — ${measures}`
}

function dayRange(records: readonly CanonicalRecord[]): {
  first: LocalDayId | undefined
  last: LocalDayId | undefined
} {
  let first: LocalDayId | undefined
  let last: LocalDayId | undefined
  for (const record of records) {
    const day = localDayIdAt(record.occurredAt, record.zone)
    if (first === undefined || day < first) first = day
    if (last === undefined || day > last) last = day
  }
  return { first, last }
}

function domainsOf(records: readonly CanonicalRecord[]): readonly LifeDomainId[] {
  const seen = new Set<LifeDomainId>()
  for (const record of records) for (const domain of record.domains) seen.add(domain)
  return [...seen].sort()
}

/**
 * Which records the chosen sections actually draw on (QA-07-004).
 *
 * The header used to describe the whole stored history regardless of what was
 * selected, which produced a document that said "No sections were chosen, so
 * this contains nothing about the owner" directly under a row reporting
 * nineteen entries across four life areas. Both sentences were composed from
 * the same object and only one of them was about the document.
 *
 * The rule is deliberately coarse, because a precise provenance set would be a
 * second thing to keep in step with the sections themselves:
 *
 * - Sections that **summarise the whole record** — coverage, what has been
 *   observed, what has been worked out, diagnostics — put the whole record in
 *   scope, because that is honestly what they are computed over.
 * - The narrower sections contribute their own records.
 * - Nothing at all is in scope when nothing is chosen.
 *
 * And then privacy is applied to the result rather than to each section
 * separately (QA-07-003): unless the private section was deliberately chosen,
 * no private record is in scope, so no private record can reach the range, the
 * count, or the list of life areas. A document that says the private area is
 * left out may not name it in the header two lines later.
 */
const SUMMARISES_EVERYTHING: readonly ExportSectionId[] = [
  'coverage',
  'learning',
  'insights',
  'diagnostics',
]

export function recordsInScope(
  request: ExportRequest,
  chosen: readonly ExportSectionId[],
): readonly CanonicalRecord[] {
  const all = request.situation.view.history.effective
  const includesPrivate = chosen.includes('private')
  const allowed = (record: CanonicalRecord): boolean =>
    includesPrivate || record.privacy !== 'private'

  if (chosen.length === 0) return []
  if (chosen.some((id) => SUMMARISES_EVERYTHING.includes(id))) return all.filter(allowed)

  const wanted = new Set<CanonicalRecord>()
  for (const record of all) {
    if (!allowed(record)) continue
    if (
      chosen.includes('now') &&
      request.situation.considered.some((fact) => fact.sources.includes(record.id))
    ) {
      wanted.add(record)
      continue
    }
    if (
      chosen.includes('direction') &&
      (record.kind === 'goal' || record.kind === 'commitment' || record.kind === 'decision')
    ) {
      wanted.add(record)
      continue
    }
    if (
      chosen.includes('corrections') &&
      (record.kind === 'correction' || record.kind === 'belief-correction')
    ) {
      wanted.add(record)
      continue
    }
    if (chosen.includes('private') && record.privacy === 'private') {
      wanted.add(record)
      continue
    }
    if (
      chosen.includes('history') &&
      request.timeline.days.some((day) => day.entries.some((entry) => entry.id === record.id))
    ) {
      wanted.add(record)
    }
  }
  return [...wanted]
}

/**
 * Whether a life area may be named in this document at all.
 *
 * Section 11 makes discretion a display decision, and this is the display
 * decision one level up from a row: with the private section left out, the
 * document withholds not only the private entries but the fact that there are
 * any. Reporting "Private / Sexual Health — current, last heard 3 days ago"
 * under a header saying the area is left out discloses participation, which is
 * the part of a private record that is sensitive even when its detail is not.
 */
function mayName(domain: LifeDomainId, header: ExportHeader): boolean {
  return header.privateIncluded || domain !== DOMAIN.privateHealth
}

function describeContext(situation: Situation, policy: DisplayPolicy): DescribeContext {
  return {
    entities: situation.entities,
    history: situation.view.history,
    concepts: situation.concepts,
    policy,
  }
}

// ---------------------------------------------------------------------------
// The sections
// ---------------------------------------------------------------------------

function overviewSection(request: ExportRequest, header: ExportHeader): readonly string[] {
  const { situation, app } = request
  const lines = [
    bullet(`App build: ${app.commitShort} (${app.target}), built ${app.buildTime}`),
    bullet(`Engine: rebuild stage ${app.phaseNumber} — ${app.phaseTitle}`),
    bullet(`Composed: ${header.composedAt}, owner-local`),
    bullet(`Owner timezone: ${situation.zone}; week starts on day ${situation.weekStartsOn}`),
    bullet(
      header.firstDay === undefined
        ? 'Record covers: nothing — this history is empty'
        : `Record covers: ${header.firstDay} to ${header.lastDay}, ${countOf(header.records, 'entry', 'entries')}`,
    ),
    bullet(
      header.domains.length === 0
        ? 'Life areas with entries: none'
        : `Life areas with entries: ${header.domains.join(', ')}`,
    ),
    bullet(
      `Sections in this document: ${header.sections.map((id) => sectionById(id).title).join('; ')}`,
    ),
    bullet(
      header.privateIncluded
        ? 'Private / Sexual Health: included, deliberately'
        : 'Private / Sexual Health: left out of this document',
    ),
    '',
    'What this app is: it keeps a canonical record of one person’s life, works out what is currently most worth doing, explains why, watches what happened afterwards and learns from it.',
    '',
    app.phaseSummary,
  ]
  return lines
}

function nowSection(request: ExportRequest): readonly string[] {
  const { decision, situation } = request
  const lines: string[] = []

  if (decision.explanation === undefined) {
    lines.push(
      `The app is suggesting nothing right now: ${sentence(decision.noAction?.headline ?? 'no move stood out')}`,
      decision.noAction?.detail ?? '',
    )
  } else {
    const rendered = decision.explanation.rendered
    lines.push(
      `Suggestion: **${rendered.sentence}**`,
      '',
      bullet(`Why: ${rendered.reason}`),
      bullet(`Subject: ${rendered.subjectLabel}`),
      bullet(`Situation read: ${decision.explanation.premise}`),
      bullet(`Follow-up: ${rendered.followUp}`),
    )
  }

  lines.push(
    '',
    situation.limiter === undefined
      ? bullet('Most in the way: nothing in particular that the record can point at')
      : bullet(
          `Most in the way (${situation.limiter.label.toLowerCase()}): ${situation.limiter.summary}`,
        ),
    bullet(`Part of day: ${situation.block}${situation.isWeekend ? ', weekend' : ''}`),
  )

  if (situation.considered.length > 0) {
    lines.push('', 'What it read to decide that:')
    for (const fact of situation.considered) {
      lines.push(
        bullet(`${fact.label} — ${fact.reading} (${fact.state}; for ${fact.usedFor.join(', ')})`),
      )
    }
  }

  if (situation.constraints.length > 0) {
    lines.push('', 'Standing limits it honoured:')
    for (const constraint of situation.constraints) lines.push(bullet(constraint.description))
  }

  if (situation.preferences.length > 0) {
    lines.push('', 'Stated preferences it honoured:')
    for (const preference of situation.preferences) {
      lines.push(bullet(`${preference.stance}: ${preference.statement}`))
    }
  }

  return lines
}

function directionSection(request: ExportRequest): readonly string[] {
  const { situation } = request
  const weekly = situation.direction.weekly
  const lines: string[] = []

  if (weekly.state === 'none') lines.push(bullet('This week’s direction: none set.'))
  else if (weekly.state === 'set') {
    lines.push(
      bullet(`This week’s direction: “${weekly.wording}” (${weekly.category}, ${weekly.weekId})`),
    )
  } else if (weekly.state === 'uncategorised') {
    lines.push(
      bullet(
        `This week’s direction: “${weekly.wording}” (${weekly.weekId}) — it names no life area, so it pulls the reasoning nowhere.`,
      ),
    )
  } else {
    lines.push(
      bullet(
        `Last direction set: “${weekly.wording}” (${weekly.weekId}) — that week has passed and it is no longer in force.`,
      ),
    )
  }

  if (situation.direction.goals.length === 0) lines.push(bullet('Active goals: none recorded.'))
  else {
    lines.push('', 'Active goals:')
    for (const goal of situation.direction.goals) {
      lines.push(bullet(`${goal.statement} (${goal.domain})`))
    }
  }

  const commitments = situation.view.history.effective.filter(
    (record) => record.kind === 'commitment',
  )
  if (commitments.length === 0) lines.push('', bullet('Commitments: none recorded.'))
  else {
    lines.push('', 'Commitments:')
    const context = describeContext(situation, FULL_EXPORT)
    for (const record of commitments) {
      const described = describeRecord(record, context)
      if (described !== undefined) lines.push(bullet(withOrigin(described.text, described.origin)))
    }
  }

  return lines
}

function coverageSection(request: ExportRequest, header: ExportHeader): readonly string[] {
  const { situation } = request
  const lines = [
    'How well the app currently understands each area. This is about the record, not about the life: “out of date” means nothing has come in lately, and is a gap in what the app has been told.',
    '',
  ]
  // The private area is named here only if it was deliberately included. Its
  // status, freshness and evidence strength are all facts about whether there
  // are private entries, which is the thing the exclusion exists to withhold.
  for (const domain of situation.coverage.domains.filter((entry) =>
    mayName(entry.domain, header),
  )) {
    const heard =
      domain.daysSinceHeard === undefined
        ? 'nothing heard at all'
        : `last heard ${countOf(domain.daysSinceHeard, 'day', 'days')} ago`
    lines.push(
      bullet(
        `${domain.label} — ${domain.status}, evidence ${domain.strength}; ${heard}. ${domain.summary}`,
      ),
    )
  }
  if (lines.length === 2) lines.push(NOTHING_HERE)
  if (!header.privateIncluded) {
    lines.push(
      '',
      'One area is missing from the list above on purpose: Private / Sexual Health was left out of this document, so nothing is said about it here — including whether anything has been recorded in it.',
    )
  }
  return lines
}

function learningSection(request: ExportRequest): readonly string[] {
  const { situation } = request
  const found = situation.learning.associations
  if (found.length === 0) {
    return [
      'The app has looked for relationships between what was done and what followed, and the record does not support stating one. Read that as "there is not enough here to compare", rather than as "there is nothing to find".',
    ]
  }

  const lines = [
    'What the record shows has followed an action, against comparable occasions where the same action did not happen. These are things the record shows happening together — one following the other is not the same as one bringing the other about, and nothing below claims it is.',
    '',
  ]

  for (const association of found) {
    if (association.withheld !== undefined) {
      lines.push(
        bullet(
          `${association.scope} → ${association.label}: nothing stated. ${association.withheld}`,
        ),
      )
      continue
    }
    const side = association.overall
    lines.push(
      bullet(
        `${association.scope} → ${association.label}: ${side.direction}. ` +
          `${overOccasions(side.rosePresent, side.present.length, `occasions with it where ${association.label} read higher afterwards`)}; ` +
          `${overOccasions(side.roseAbsent, side.absent.length, 'comparable occasions without it')}.`,
      ),
    )
    if (association.window !== undefined) {
      lines.push(`  - Over ${association.window.from} to ${association.window.to}.`)
    }
    if (association.confounded > 0) {
      lines.push(
        `  - ${countOf(association.confounded, 'pair', 'pairs')} set aside because something else recorded fell in between.`,
      )
    }
    if (association.unknownExposure > 0) {
      lines.push(
        `  - ${countOf(association.unknownExposure, 'occasion', 'occasions')} the record cannot place either way. These count toward neither side.`,
      )
    }
    if (association.disagree) {
      lines.push(
        '  - Two supported contexts disagree, so no single whole-record reading is stated for this.',
      )
    }
  }

  if (situation.learning.rejected.size > 0) {
    lines.push(
      '',
      `The owner has ruled out ${situation.learning.rejected.size} of the app’s own conclusions. Evidence from before each rejection stops counting toward it.`,
    )
  }

  return lines
}

function insightsSection(request: ExportRequest): readonly string[] {
  const { insights } = request
  const lines: string[] = []

  if (insights.insights.length === 0) lines.push('Nothing currently rises to a stated reading.')
  for (const insight of insights.insights) {
    lines.push(bullet(`**${insight.eyebrow}** — ${insight.headline}`))
    lines.push(`  - ${insight.detail}`)
    if (insight.confidence !== undefined) {
      lines.push(`  - How sure: ${insight.confidence.word} — ${insight.confidence.because}`)
    }
    for (const rate of insight.evidence.rates) {
      lines.push(
        `  - ${rate.withheld === undefined ? overOccasions(rate.hit, rate.of, rate.measures) : `${rate.measures}: ${rate.withheld}`}`,
      )
    }
    if (insight.evidence.window !== undefined) {
      lines.push(
        `  - Over ${insight.evidence.window.from} to ${insight.evidence.window.to}, ${countOf(insight.evidence.comparable, 'comparable occasion', 'comparable occasions')}.`,
      )
    }
  }

  if (insights.gathering.length > 0) {
    lines.push('', 'Still being gathered — the app has looked and there is not enough behind it:')
    for (const line of insights.gathering) {
      lines.push(
        bullet(
          `${line.subject}: ${countOf(line.occasions, 'occasion', 'occasions')} so far. ${line.needs}`,
        ),
      )
    }
  }

  return lines
}

/**
 * The origin, as a suffix on a line (QA-08-001).
 *
 * The export is the one surface where the reader is **not** the owner, so it is
 * the surface least able to tell an imported reading from one he typed this
 * morning — he at least remembers his own week. An assistant asked to reason
 * about his life from this document would otherwise read a two-year-old
 * migrated observation as something recorded today.
 *
 * Composed here rather than folded into `described.text`, because the text is
 * what the entry *says* and this is where it came from; joining them would put
 * the origin inside the sentence a correction later quotes back.
 */
function withOrigin(text: string, origin: RecordOrigin | undefined): string {
  return origin === undefined ? text : `${text} · ${origin.label}`
}

function historySection(request: ExportRequest, header: ExportHeader): readonly string[] {
  const { timeline } = request
  const lines: string[] = []

  /*
   * A withheld row is still a row (QA-07-003, one layer down).
   *
   * Timeline keeps the private entry and replaces its detail with a
   * placeholder, and on **his own screen** that is right: dropping it would
   * tell him his history is thinner than it is, and he already knows what is
   * in it. In a document that leaves the device saying nothing from that area
   * is below, a dated line reading "Noted: Private entry" says there is
   * something there and when — which is the participation fact the exclusion
   * exists to withhold, disclosed under a promise not to.
   *
   * So here, and only here, the row goes as well as the detail. Nothing is
   * being hidden from the reader by doing it: the document states plainly
   * that the area was left out, and that statement is what makes the silence
   * readable instead of misleading.
   */
  const days = header.privateIncluded
    ? timeline.days
    : timeline.days
        .map((day) => ({
          ...day,
          entries: day.entries.filter(
            (entry) => entry.domain !== DOMAIN.privateHealth && !entry.withheld,
          ),
        }))
        .filter((day) => day.entries.length > 0)

  if (days.length === 0) return [NOTHING_HERE]

  const shown = days.reduce((total, day) => total + day.entries.length, 0)
  lines.push(
    header.privateIncluded
      ? `The most recent ${countOf(shown, 'entry', 'entries')}, newest first. Detail from the private domain reads as a placeholder here; the private section below is where it appears in full.`
      : `The most recent ${countOf(shown, 'entry', 'entries')}, newest first, with the private area left out as stated above.`,
    '',
  )

  for (const day of days) {
    lines.push(`**${day.label}** (${day.dayId})`)
    for (const entry of day.entries) {
      lines.push(bullet(withOrigin(`${entry.tag}: ${entry.text}`, entry.origin)))
    }
    lines.push('')
  }

  if (timeline.unreadable.length > 0) {
    lines.push('Rows that could not be read, kept rather than dropped:')
    for (const row of timeline.unreadable) lines.push(bullet(`${row.where} — ${row.problem}`))
  }

  return lines
}

function correctionsSection(request: ExportRequest): readonly string[] {
  const { situation } = request
  const context = describeContext(situation, FULL_EXPORT)
  const records = situation.view.history.effective.filter(
    (record) => record.kind === 'correction' || record.kind === 'belief-correction',
  )

  if (records.length === 0) {
    return [
      'The owner has overruled nothing the app has concluded. Worth reading as a fact about the record rather than as agreement.',
    ]
  }

  const lines = [
    'Where the owner has disagreed with the app. History under each of these is preserved; what changes is how it is interpreted from that point on.',
    '',
  ]
  for (const record of records) {
    const described = describeRecord(record, context)
    if (described === undefined) continue
    lines.push(
      bullet(
        withOrigin(
          `${localDayIdAt(record.occurredAt, record.zone)} — ${described.text}`,
          described.origin,
        ),
      ),
    )
  }
  return lines
}

function privateSection(request: ExportRequest): readonly string[] {
  const { situation } = request
  const context = describeContext(situation, FULL_EXPORT)
  const records = situation.view.history.effective.filter((record) => record.privacy === 'private')

  if (records.length === 0) {
    return [
      'Included deliberately, and there is nothing recorded in this area. That is an empty area, not a withheld one.',
    ]
  }

  const lines = [
    'Included deliberately by the owner, in full and without discretion applied. Ordinary health information.',
    '',
  ]
  for (const record of records) {
    const described = describeRecord(record, context)
    if (described === undefined) continue
    lines.push(
      bullet(
        withOrigin(
          `${localDayIdAt(record.occurredAt, record.zone)} · ${tagFor(record.kind)}: ${described.text}`,
          described.origin,
        ),
      ),
    )
  }
  return lines
}

function diagnosticsSection(request: ExportRequest): readonly string[] {
  const { situation, decision, app } = request
  const trace = decision.trace
  const snapshot = situation.view.snapshot

  const lines = [
    bullet(`Build: ${app.commitSha} (${app.target}), built ${app.buildTime}`),
    bullet(`Architecture used for this decision: ${decision.architecture}`),
    bullet(
      `Store: ${countOf(snapshot.records.length, 'record', 'records')}, ${countOf(snapshot.entities.length, 'entity', 'entities')}, ${countOf(snapshot.malformed.length, 'unreadable row', 'unreadable rows')}, schema ${snapshot.schemaVersion}`,
    ),
    bullet(`Records still standing after corrections: ${situation.view.summary.effective}`),
    bullet(`Replaced or withdrawn: ${situation.view.summary.displaced}`),
    bullet(
      `Local days covered: ${situation.view.summary.byLocalDay.size}; local weeks: ${situation.view.summary.byLocalWeek.size}`,
    ),
    '',
    'How tonight’s decision was reached:',
    bullet(`Moves proposed: ${trace.proposed.length}`),
    bullet(`Ruled out: ${trace.rejected.length}`),
    bullet(`Ranked: ${trace.ranking.length}`),
  ]

  for (const rejection of trace.rejected) {
    lines.push(`  - ${rejection.candidate}: ${rejection.reason} — ${rejection.explanation}`)
  }

  if (trace.notes.length > 0) {
    lines.push('', 'Notes the engine left about this run:')
    for (const note of trace.notes) lines.push(bullet(note))
  }

  const unknown = situation.view.facts.inState('unknown')
  if (unknown.length > 0) {
    lines.push('', 'Things the app knows it does not know:')
    for (const entry of unknown) {
      lines.push(bullet(`${entry.definition.label} — never answered`))
    }
  }

  if (situation.view.history.issues.length > 0) {
    lines.push('', 'Records that contradict each other about what replaces what:')
    for (const issue of situation.view.history.issues) {
      lines.push(bullet(`${issue.problem}: ${issue.record} → ${issue.target}`))
    }
  }

  return lines
}

const BUILDERS: Record<
  ExportSectionId,
  (request: ExportRequest, header: ExportHeader) => readonly string[]
> = {
  overview: overviewSection,
  now: nowSection,
  direction: directionSection,
  coverage: coverageSection,
  learning: learningSection,
  insights: insightsSection,
  history: historySection,
  corrections: correctionsSection,
  private: privateSection,
  diagnostics: diagnosticsSection,
}

// ---------------------------------------------------------------------------
// The document
// ---------------------------------------------------------------------------

export function composeExport(request: ExportRequest): ComposedExport {
  const chosen = orderSelection(request.sections)
  /*
   * What this document draws on, not what the store happens to hold.
   *
   * See `recordsInScope`. Everything in the header below is a fact about the
   * document the owner is about to hand somebody, so all of it is computed
   * from the scope rather than from the whole history.
   */
  const records = recordsInScope(request, chosen)
  const range = dayRange(records)

  const header: ExportHeader = {
    // The real moment this was composed, in the owner's real zone — a fact
    // about the act of composing, not about the history being described, so a
    // laboratory clock does not date it (QA-07-005's class).
    composedAt: localDayIdAt(request.composedAt.at, request.composedAt.zone),
    source: request.source,
    app: request.app,
    firstDay: range.first,
    lastDay: range.last,
    records: records.length,
    domains: domainsOf(records),
    sections: chosen,
    privateIncluded: chosen.includes('private'),
    diagnosticsIncluded: chosen.includes('diagnostics'),
  }

  const prompt = handoffPrompt({
    source: request.source,
    diagnosticsIncluded: header.diagnosticsIncluded,
    privateIncluded: header.privateIncluded,
  })

  const lines: string[] = [
    '# Life Command OS — review export',
    '',
    prompt.trimEnd(),
    '',
    '---',
    '',
    heading('About this document'),
    '',
    bullet(
      request.source === 'laboratory'
        ? 'Source: a synthetic test history loaded into the app’s QA laboratory. **This is not a real person’s record.**'
        : 'Source: the owner’s own record, from this device.',
    ),
    bullet(
      `Sections chosen: ${chosen.length === 0 ? 'none' : chosen.map((id) => sectionById(id).title).join('; ')}`,
    ),
    bullet(
      header.privateIncluded
        ? 'The Private / Sexual Health section is included.'
        : 'The Private / Sexual Health section is left out.',
    ),
    bullet(
      header.diagnosticsIncluded
        ? 'Diagnostics are included, so a review of how the app itself is tuned is asked for above.'
        : 'Diagnostics are left out, so this is a review of the life rather than of the app.',
    ),
    '',
  ]

  if (chosen.length === 0) {
    lines.push(
      'No sections were chosen, so this document contains nothing about the owner. Choose at least one section and compose it again.',
      '',
    )
  }

  for (const id of chosen) {
    const section = sectionById(id)
    lines.push(heading(section.title), '')
    const body = BUILDERS[id](request, header).filter((line, index, all) => {
      // Collapse the runs of blank lines a section's own conditionals leave.
      return !(line === '' && all[index - 1] === '')
    })
    lines.push(...(body.length === 0 ? [NOTHING_HERE] : body), '')
  }

  return { text: `${lines.join('\n').trimEnd()}\n`, prompt, header }
}
