import type { ConceptDefinition } from '../../domain/concepts'
import { countOf } from '../../domain/counts'
import { DOMAIN, type LifeDomainId } from '../../domain/domains'
import { describeUnknown } from '../../domain/knowledge'
import {
  belongsToPrivateSection,
  FULL_EXPORT,
  mayDescribeInDocument,
  type DisplayPolicy,
} from '../../domain/privacy'
import type { CanonicalRecord, CommitmentWindowRecord } from '../../domain/records'
import { describeCommitmentWindow } from '../../domain/schedule'
import {
  localDayIdAt,
  localWeekIdAt,
  type Instant,
  type LocalDayId,
  type TimeZoneId,
} from '../../domain/time'
import { decide, type Decision } from '../../intelligence/engine'
import { insightsFor, type InsightsReport } from '../../intelligence/insights'
import { assembleSituation, type Situation } from '../../intelligence/situation'
import { burdenOver, describeBurden } from '../../intelligence/review'
import type { RecordId } from '../../domain/ids'
import { evidenceSourceOf, type ProvenanceSource } from '../../domain/records'
import { describeRecord, tagOf, type DescribeContext } from '../history/describe'
import { originOfSources, type RecordOrigin } from '../history/origin'
import type { HistorySource } from '../memory/memoryContext'
import { assembleTimeline, type TimelineData } from '../timeline/timelineEntries'
import type { StoreSnapshot } from '../../memory/store'
import { buildView } from '../../memory/view'
import { handoffPrompt } from './handoffPrompt'
import { withheldFrom } from './scope'
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
    mayDescribeInDocument(record.privacy, includesPrivate)

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
      (record.kind === 'goal' ||
        record.kind === 'commitment' ||
        record.kind === 'commitment-window' ||
        record.kind === 'decision')
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
    if (chosen.includes('private') && belongsToPrivateSection(record.privacy)) {
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

/**
 * Whether a concept may be named in this document at all — QA-82-007.
 *
 * `mayName` asks the question of a life area, which is the shape the leak took
 * and **not** the shape of the rule. A concept carries two privacy facts and
 * either of them is enough to withhold it: the area it belongs to, and its own
 * class. Reading only the domain would have been Round 3's mistake in new
 * clothes — a private-classed concept filed under Home leaks its label and its
 * knowledge state while every assertion about the private *area* still passes.
 *
 * It is deliberately not written against the one private concept that exists
 * today. That is the narrow-by-id fix DEF-0094 caught, and it passed
 * everything until the guard was given a second member of the class.
 */
function mayDescribeConcept(definition: ConceptDefinition, header: ExportHeader): boolean {
  return (
    mayDescribeInDocument(definition.privacy, header.privateIncluded) &&
    (header.privateIncluded || mayName(definition.domain, header))
  )
}

function describeContext(situation: Situation, policy: DisplayPolicy): DescribeContext {
  return {
    entities: situation.entities,
    history: situation.view.history,
    concepts: situation.concepts,
    domains: situation.domains,
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

function nowSection(request: ExportRequest, header: ExportHeader): readonly string[] {
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

  /*
   * Under the document's own scope, like every other section — AUD-0040.
   *
   * The fact list was nine hand-written reads and none of them was private or
   * outside a named area, so it never needed the rule the rest of this file
   * uses. A registry-driven situation reads everything, so it does: a document
   * the owner scoped to two areas must not describe a third in the section that
   * says what the app read.
   */
  const read = situation.considered.filter((fact) =>
    mayDescribeConcept(situation.concepts.definitionFor(fact.concept), header),
  )
  if (read.length > 0) {
    lines.push('', 'What it read to decide that:')
    for (const fact of read) {
      lines.push(
        bullet(
          fromSources(
            `${fact.label} — ${fact.reading} (${fact.state}; for ${fact.usedFor.join(', ')})`,
            sourcesOfRecords(situation, fact.sources),
          ),
        ),
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
      lines.push(
        bullet(
          fromSources(
            `${goal.statement} (${goal.domain})`,
            sourcesOfRecords(situation, [goal.source]),
          ),
        ),
      )
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

  /*
   * What is already spoken for in the day — AUD-0004.
   *
   * Its own list rather than folded in with the promises above, because they
   * are different objects and a reviewer reading this needs to be able to tell
   * them apart: a commitment is something the owner said he would do, and an
   * obligation is a stretch of the day that is not his to spend.
   */
  const obligations = situation.view.history.effective.filter(
    (record): record is CommitmentWindowRecord => record.kind === 'commitment-window',
  )
  if (obligations.length === 0) lines.push('', bullet('Standing in the day: nothing recorded.'))
  else {
    lines.push('', 'Standing in the day:')
    for (const record of obligations) {
      lines.push(bullet(`${describeCommitmentWindow(record)} (${record.knownFrom})`))
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
    /*
     * The prefix on this bullet, and the summary after it, are one sentence —
     * QA-82-011, reopened.
     *
     * Round 8 repaired `domain.summary` and left this alone, so the rendered
     * line read *"nothing heard at all. Nothing has come in about sleep &
     * recovery at this point. 4 entries here are later than it."* — the two
     * halves of one bullet contradicting each other, which is worse than the
     * absolute on its own was.
     *
     * `daysSinceHeard` is undefined for an area whose only records are later
     * than the moment, exactly as it is for one that has never been heard from,
     * so it cannot tell them apart. `later` is the fact D-153 added for this,
     * and it is read here as well as there.
     */
    const heard =
      domain.daysSinceHeard !== undefined
        ? `last heard ${countOf(domain.daysSinceHeard, 'day', 'days')} ago`
        : domain.later > 0
          ? 'nothing heard yet'
          : 'nothing heard at all'
    lines.push(
      bullet(
        fromSources(
          `${domain.label} — ${domain.status}, evidence ${domain.strength}; ${heard}. ${domain.summary}`,
          domain.sources,
        ),
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
    lines.push(bullet(fromSources(`**${insight.eyebrow}** — ${insight.headline}`, insight.sources)))
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

/**
 * The same suffix, for a line that states a **conclusion** rather than an entry
 * (QA-08-001's retest).
 *
 * Four sections of this document are summaries — what the app currently
 * believes, which goals are active, how well each area is understood, and what
 * has been worked out. Each is drawn from records rather than showing them, so
 * marking the Recent record rows underneath left the conclusions above reading
 * as though they came from what the owner told this app. That is the half of
 * the class the first repair missed.
 */
function fromSources(text: string, sources: readonly ProvenanceSource[]): string {
  return withOrigin(text, originOfSources(sources))
}

/** The origins behind a set of records, for a conclusion that cites ids. */
function sourcesOfRecords(
  situation: ExportRequest['situation'],
  ids: readonly RecordId[],
): readonly ProvenanceSource[] {
  const found = new Set<ProvenanceSource>()
  for (const id of ids) {
    const record = situation.view.history.byId(id)
    if (record !== undefined) found.add(evidenceSourceOf(record))
  }
  return [...found].sort()
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
  /*
   * And the page is already the document's — QA-82-007.
   *
   * This filtered `timeline.days` after `assembleTimeline` had chosen forty
   * entries from the whole history, so a withheld record consumed a slot and
   * the section rendered thirty-nine. Two library histories lost a whole day
   * off the end that way: the withheld record was observable from the length
   * of a list that never mentioned it, which is the same participation leak
   * one layer up from the row. `composeExport` now asks for a page of what
   * this document may show, so there is nothing left here to take out.
   */
  const days = timeline.days

  if (days.length > 0) {
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
  } else if (timeline.later > 0) {
    /*
     * There is history here; none of it has happened yet — QA-82-009.
     *
     * This section used to return `NOTHING_HERE` the moment it had no rows,
     * which is a claim about the record and was false in three different ways
     * at once: entries dated after the moment, entries withheld from this
     * document, and a store whose only rows could not be read. Each of those is
     * a different thing to tell a reader, and the third one took the damage
     * report down with it.
     */
    lines.push(
      `Nothing in this document happened at or before the moment it describes. ${countOf(timeline.later, 'entry', 'entries')} in the record ${timeline.later === 1 ? 'is' : 'are'} later than that.`,
      '',
    )
  } else if (timeline.unreadable.length > 0 || timeline.tangled.length > 0) {
    /*
     * Deliberately silent about **why** there is nothing to show.
     *
     * A store whose only rows are damaged and a store whose readable rows were
     * all withheld reach this line together, and they must read the same: the
     * document has already said, unconditionally, that the excluded area is
     * excluded down to whether anything is recorded in it, and a sentence here
     * that distinguished the two would take that back. What follows says what
     * arrived and could not be read, which is the part that is this document's
     * to report either way.
     */
    lines.push('There are no entries to show here.', '')
  }

  /*
   * Reported whether or not there were rows above it — QA-82-009.
   *
   * The early return this used to sit behind meant a history with damage and
   * nothing displayable said only "Nothing in the record for this", which is
   * the opposite of true: there is something in the record and the app could
   * not read it. Diagnostics still counted the rows when it was selected, and
   * it is off by default, so the ordinary document mentioned the damage
   * nowhere at all.
   */
  if (timeline.unreadable.length > 0) {
    /*
     * Named by what they are rather than by where they sit — QA-82-007, round 6.
     *
     * `UnreadableRow.where` is "Record row 19", a coordinate into the owner's
     * file, and this document does not describe his whole file. With an area
     * left out, the difference between row 19 and row 22 is a count of what was
     * withheld — disclosed by a line whose text mentions none of it, and which
     * the scoped store could not reach because the number is metadata the
     * retained row brought with it.
     *
     * Left out in **both** directions rather than only when something is
     * withheld, because a position in a file the reader does not have was never
     * worth much to them, and one rule is easier to keep than two. The owner's
     * own Timeline still shows it, which is where somebody who has the file
     * goes to find the row.
     */
    lines.push(
      'Rows that could not be read, kept rather than dropped. Where each one sits in the file is on the owner’s own screen rather than here: this document does not describe the whole file, so a position in it would be a number this reader cannot use and, where anything is left out, a count of what is missing.',
      '',
    )
    for (const row of timeline.unreadable) {
      lines.push(bullet(`${row.kind === 'entity' ? 'An entity' : 'A record'} — ${row.problem}`))
    }
  }

  /*
   * And the rows that were read perfectly and cannot be used — QA-82-012.
   *
   * A record that says it replaces something absent, or two that each claim to
   * replace the other, parse fine and are then held back from reasoning by
   * `resolveHistory`. They are a storage fault by any reading the owner cares
   * about, and this section reported none of them: the block above walks
   * `unreadable`, and a history whose only trouble is a supersession cycle has
   * an empty one. Timeline showed both lists from the start; the document
   * showed one, and Diagnostics — which is off by default — was the only place
   * the other appeared.
   *
   * Kept separate from the unreadable list rather than merged into it, because
   * they are different things to tell somebody: one is a row the app could not
   * read, the other is a row it read and cannot trust.
   */
  if (timeline.tangled.length > 0) {
    lines.push(
      '',
      'Rows that were read without trouble but have a problem the app could not resolve: they disagree about what replaces what, so none of them is used.',
      '',
    )
    for (const row of timeline.tangled) {
      lines.push(bullet(`An entry — ${row.problem}`))
    }
  }

  // A section with nothing at all in it says so rather than being absent, which
  // is D-091's second invariant: an abstention is written down.
  if (lines.length === 0) return [NOTHING_HERE]

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
  const records = situation.view.history.effective.filter((record) =>
    belongsToPrivateSection(record.privacy),
  )

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
          `${localDayIdAt(record.occurredAt, record.zone)} · ${tagOf(record)}: ${described.text}`,
          described.origin,
        ),
      ),
    )
  }
  return lines
}

function diagnosticsSection(request: ExportRequest, header: ExportHeader): readonly string[] {
  const { situation, decision, app } = request
  const trace = decision.trace
  const snapshot = situation.view.snapshot

  /*
   * Diagnostics is inside the document, so the document's exclusion reaches it
   * — QA-82-007.
   *
   * Every other section takes this `header` and asks what it is allowed to
   * describe. This one took only the request and read the store: whole-store
   * counts, and `facts.inState('unknown')` in full. With Private / Sexual
   * Health left out, one library history disclosed the withheld record twice
   * over — `19 records` where the same history without it says `18`, and
   * `Recent private pattern — never answered`, which names the area and states
   * that nothing is known in it. Both are participation, which D-098 calls the
   * part of a private record that stays sensitive after the detail is
   * withheld. Diagnostics is reached by **Select all** and is not consent to
   * include the private section.
   *
   * The qualifier goes **before** the figures rather than after them, because
   * that is the other half of D-098: a document is read in order, and a
   * correction arriving later does not repair a count already given.
   */
  /*
   * Counted straight off the store, because the store is already the one this
   * document may describe (`withheldFrom`). Round 4 filtered each figure here
   * and Round 5 showed why that could never be enough: the figures were only
   * four of the places a withheld record reached. What is left is the count of
   * what is actually in front of the composer.
   */
  const stored = snapshot.records
  const standing = situation.view.history.effective
  const displaced = situation.view.history.displaced
  const entities = snapshot.entities
  const unreadable = snapshot.malformed

  const days = new Set(stored.map((record) => localDayIdAt(record.occurredAt, situation.zone)))
  const weeks = new Set(
    stored.map((record) =>
      localWeekIdAt(record.occurredAt, situation.zone, situation.weekStartsOn),
    ),
  )

  const lines = [
    bullet(`Build: ${app.commitSha} (${app.target}), built ${app.buildTime}`),
    bullet(`Architecture used for this decision: ${decision.architecture}`),
  ]

  if (!header.privateIncluded) {
    lines.push(
      '',
      'Every count below is of the part of the record this document may describe. Private / Sexual Health was left out, so nothing here counts it, names anything in it, or says whether anything is recorded in it at all.',
      '',
    )
  }

  /*
   * What the app has cost him, and what he did — F44's measurable half, D-279.
   *
   * Three counts side by side and **no arithmetic between them**. §6.5 scopes
   * F44 to the measurable half only, and F44's own warning is why: a ratio of
   * taps to actions is an engagement metric with a humane name, and a single
   * number for all three is the Life Score it refuses outright.
   *
   * Here rather than on a card, because a standing count that does not change
   * from one day to the next is not news, and an app that reports on its own use
   * every morning is the system optimising compliance with itself. Whether the
   * burden is falling is a question he can answer by reading them; the app
   * asserting it is the thing F44 warns against.
   */
  const burden = burdenOver(situation)

  lines.push(
    bullet(
      `Store: ${countOf(stored.length, 'record', 'records')}, ${countOf(entities.length, 'entity', 'entities')}, ${countOf(unreadable.length, 'unreadable row', 'unreadable rows')}, schema ${snapshot.schemaVersion}`,
    ),
    bullet(describeBurden(burden)),
    bullet(`Records still standing after corrections: ${standing.length}`),
    bullet(`Replaced or withdrawn: ${displaced.length}`),
    bullet(`Local days covered: ${days.size}; local weeks: ${weeks.size}`),
    '',
    'How this decision was reached:',
    bullet(`Moves proposed: ${trace.proposed.length}`),
    bullet(`Ruled out: ${trace.rejected.length}`),
    bullet(`Ranked: ${trace.ranking.length}`),
  )

  for (const rejection of trace.rejected) {
    lines.push(`  - ${rejection.candidate}: ${rejection.reason} — ${rejection.explanation}`)
  }

  if (trace.notes.length > 0) {
    lines.push('', 'Notes the engine left about this run:')
    for (const note of trace.notes) lines.push(bullet(note))
  }

  /*
   * And why each one is not known, rather than one sentence for six —
   * QA-82-008.
   *
   * `describeUnknown` is the only place that sentence is written, so the next
   * surface to list an unknown cannot invent a seventh way of saying it, and a
   * seventh `UnknownReason` is a compile error rather than one more thing that
   * silently reads as never having been asked.
   */
  const unknown = situation.view.facts
    .inState('unknown')
    .filter((entry) => mayDescribeConcept(entry.definition, header))
  if (unknown.length > 0) {
    lines.push('', 'Things the app knows it does not know:')
    for (const entry of unknown) {
      const knowledge = entry.knowledge
      // Narrowing, not a filter: `inState('unknown')` already decided this.
      if (knowledge.state !== 'unknown') continue
      lines.push(bullet(`${entry.definition.label} — ${describeUnknown(knowledge)}`))
    }
  }

  // Resolved from the same store, so a tangle involving a withheld record is
  // not in this list to begin with.
  const issues = situation.view.history.issues
  if (issues.length > 0) {
    lines.push('', 'Records that contradict each other about what replaces what:')
    for (const issue of issues) {
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

/**
 * The same objects, worked out again from the record this document may
 * describe — D-150, QA-82-007.
 *
 * **This is the only place the composer runs anything that decides**, and the
 * exception is the rule's own logic rather than a hole in it. The rule exists
 * so the export cannot say something by a means the app does not use: it is
 * the app's pipeline here, in the app's order, from a store with one thing
 * taken out of it. What it must never become is a second way of reaching a
 * conclusion, and it has not.
 *
 * Round 4 scoped four renderers and Round 5 found four more, plus the case no
 * renderer could have fixed: a private reading of the owner's energy outranks
 * a public one, and then the suggestion, its reason, the limiter, the trace
 * score and the ranking all carry that reading in another form. There is no
 * filter over a finished decision that unmakes it.
 *
 * `shown` is deliberately not carried across. A session note may not enter an
 * artefact that leaves the device (D-107, and the guard in
 * `architecture-guards.test.ts` that keeps every export ignorant of it), and
 * the surfaces that compose exports do not pass one.
 */
function composedFrom(request: ExportRequest, store: StoreSnapshot): ExportRequest {
  const { situation, decision } = request
  const moment = {
    now: situation.at,
    zone: situation.zone,
    weekStartsOn: situation.weekStartsOn,
    domains: situation.domains,
    concepts: situation.concepts,
  }
  const view = buildView(store, moment)
  const scoped = assembleSituation(view, moment)
  return {
    ...request,
    situation: scoped,
    // The architecture the owner's own screen used, so the only difference
    // between the two runs is the record they read.
    decision: decide(view, moment, { architecture: decision.architecture }),
    insights: insightsFor(scoped),
    timeline: assembleTimeline(scoped),
  }
}

export function composeExport(request: ExportRequest): ComposedExport {
  const chosen = orderSelection(request.sections)
  const privateIncluded = chosen.includes('private')

  /*
   * What this document is composed from — QA-82-007, and the boundary D-150
   * settles.
   *
   * Not a filter on each section: four rounds of filtering the sections
   * somebody had thought about, and every round found the ones nobody had.
   * The record the document is composed from is the boundary, so a section
   * cannot get this wrong and a section added tomorrow cannot either.
   *
   * `withheldFrom` returns `undefined` when there is nothing to withhold,
   * which is almost every history: then these are the objects the owner's own
   * screens are rendering, passed straight through and not computed twice.
   */
  const withheld = privateIncluded ? undefined : withheldFrom(request.situation.view.snapshot)
  const scoped: ExportRequest = withheld === undefined ? request : composedFrom(request, withheld)

  /*
   * What this document draws on, not what the store happens to hold.
   *
   * See `recordsInScope`. Everything in the header below is a fact about the
   * document the owner is about to hand somebody, so all of it is computed
   * from the scope rather than from the whole history.
   */
  const records = recordsInScope(scoped, chosen)
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
    privateIncluded,
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
    /*
     * And what that means for everything below it — D-150.
     *
     * The exclusion reaches the record this document is composed from, not
     * only the rows it prints, because a conclusion drawn from a withheld
     * record is that record's content in another form. So the app's own screen
     * can be saying something else at this moment, and a reader who is not
     * told that would take this for a photograph of it.
     *
     * Printed whenever the section is off, whether or not the owner has
     * anything recorded in that area — an unconditional sentence discloses
     * nothing, and a conditional one would say there is something there.
     */
    ...(header.privateIncluded
      ? []
      : [
          bullet(
            'Everything below is worked out from the part of the record in this document. The app reads the whole record, so where the area left out matters, what it is saying on his own screen can differ from what is here.',
          ),
        ]),
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
    const body = BUILDERS[id](scoped, header).filter((line, index, all) => {
      // Collapse the runs of blank lines a section's own conditionals leave.
      return !(line === '' && all[index - 1] === '')
    })
    lines.push(...(body.length === 0 ? [NOTHING_HERE] : body), '')
  }

  return { text: `${lines.join('\n').trimEnd()}\n`, prompt, header }
}
