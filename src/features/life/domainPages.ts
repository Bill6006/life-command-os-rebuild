import type { ActiveGoal } from '../../intelligence/situation'
import { DOMAIN, type LifeDomainId } from '../../domain/domains'
import type { EntityIndex } from '../../domain/entities'
import type { RecordId } from '../../domain/ids'
import { matchKnowledge, type Knowledge, type KnowledgeState } from '../../domain/knowledge'
import {
  describeFactValue,
  type CanonicalRecord,
  type FactValue,
  type GoalRecord,
} from '../../domain/records'
import type { Instant } from '../../domain/time'
import type { ConceptId } from '../../domain/windows'
import type { DomainCoverage, Situation } from '../../intelligence/situation'
import { questionFor, type QuestionSpec } from '../../intelligence/questions'

/**
 * The ten baseline Life pages (canonical plan section 50, D-078).
 *
 * The intelligence model keeps eleven domains (section 4.1); this registry has
 * ten entries because Health & Recovery names both of the two the engine
 * already reads together — hours slept, energy, soreness and recovery are one
 * `Capacity` reading, not two. Every other domain maps one page to one domain
 * under looser, warmer naming.
 *
 * `tests/unit/life-pages.test.ts` asserts the rule D-078 actually states: every
 * domain in the registry is reachable from exactly one page here, none omitted,
 * none duplicated.
 */
export interface LifePage {
  readonly slug: string
  readonly title: string
  readonly lede: string
  readonly domains: readonly LifeDomainId[]
}

export const LIFE_PAGES: readonly LifePage[] = [
  {
    slug: 'health-recovery',
    title: 'Health & Recovery',
    lede: 'Sleep, energy, soreness and how much the body has to give — read together, because the app already reads them together.',
    domains: [DOMAIN.health, DOMAIN.sleep],
  },
  {
    slug: 'fatherhood',
    title: 'Fatherhood / Adaya',
    lede: 'What the app understands about time with her, and what she is working on.',
    domains: [DOMAIN.fatherhood],
  },
  {
    slug: 'career',
    title: 'Career & Learning',
    lede: 'What is being studied, and how it is going.',
    domains: [DOMAIN.career],
  },
  {
    slug: 'money',
    title: 'Money',
    lede: 'Cash resilience and the current direction, not a running ledger.',
    domains: [DOMAIN.money],
  },
  {
    slug: 'social',
    title: 'Social & Relationships',
    lede: 'Whether company has been on the table lately.',
    domains: [DOMAIN.social],
  },
  {
    slug: 'emotional',
    title: 'Emotional Health',
    lede: 'How things have been, in the app’s own plain words.',
    domains: [DOMAIN.emotional],
  },
  {
    slug: 'faith',
    title: 'Faith & Meaning',
    lede: 'Recent practice, as the owner defines it.',
    domains: [DOMAIN.faith],
  },
  {
    slug: 'home',
    title: 'Home & Environment',
    lede: 'Small friction the app has noticed, and what has been done about it.',
    domains: [DOMAIN.home],
  },
  {
    slug: 'private',
    title: 'Private / Sexual Health',
    lede: 'Yours to enter. Nothing here appears anywhere else.',
    domains: [DOMAIN.privateHealth],
  },
  {
    slug: 'direction',
    title: 'Long-Range Direction',
    lede: 'This week’s focus, and what it is aimed at.',
    domains: [DOMAIN.direction],
  },
]

export function pageBySlug(slug: string): LifePage | undefined {
  return LIFE_PAGES.find((page) => page.slug === slug)
}

export function pageForDomain(domain: LifeDomainId): LifePage | undefined {
  return LIFE_PAGES.find((page) => page.domains.includes(domain))
}

// ---------------------------------------------------------------------------
// Reading what the app currently understands
// ---------------------------------------------------------------------------

export interface ConceptReading {
  readonly concept: ConceptId
  readonly label: string
  readonly domain: LifeDomainId
  readonly state: KnowledgeState
  readonly standing: boolean
  /** What to print. Never invented — matches the four knowledge states exactly. */
  readonly text: string
  /** Whether the reading is the last one the app had, past its own window. */
  readonly outOfDate: boolean
  /** A closed set of options to correct this with, where one is defined. */
  readonly question: QuestionSpec | undefined
}

function readingText(knowledge: Knowledge<FactValue>, entities: EntityIndex): string {
  const labelFor = (ref: Parameters<EntityIndex['labelFor']>[0]) => entities.labelFor(ref)
  return matchKnowledge(knowledge, {
    explicit: (known) => describeFactValue(known.value, labelFor),
    inferred: (known) => describeFactValue(known.value, labelFor),
    stale: (known) => describeFactValue(known.value, labelFor),
    unknown: () => 'Not known yet.',
  })
}

function conceptReadings(situation: Situation, domains: readonly LifeDomainId[]): ConceptReading[] {
  const out: ConceptReading[] = []
  for (const definition of situation.concepts.all()) {
    if (!domains.includes(definition.domain)) continue
    const entry = situation.view.facts.get(definition.id)
    const knowledge = entry?.knowledge
    out.push({
      concept: definition.id,
      label: definition.label,
      domain: definition.domain,
      state: knowledge?.state ?? 'unknown',
      standing: definition.standing === true,
      text: knowledge === undefined ? 'Not known yet.' : readingText(knowledge, situation.entities),
      outOfDate: knowledge?.state === 'stale',
      question: questionFor(definition.id),
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// Goals in this domain
// ---------------------------------------------------------------------------

export interface DomainGoal extends ActiveGoal {
  /** The full record, so a correction can supersede exactly what it replaces. */
  readonly record: GoalRecord | undefined
}

function goalsFor(situation: Situation, domains: readonly LifeDomainId[]): readonly DomainGoal[] {
  return situation.direction.goals
    .filter((goal) => domains.includes(goal.domain))
    .map((goal) => {
      const found = situation.view.history.byId(goal.source)
      return { ...goal, record: found?.kind === 'goal' ? found : undefined }
    })
}

// ---------------------------------------------------------------------------
// Recent changes — the last few things that updated the app's understanding
// of this domain. Timeline (Phase 6) is the whole-life chronological surface;
// this is the same idea narrowed to one area, built from the records
// `coverage.ts` already counts as meaningful evidence about it.
// ---------------------------------------------------------------------------

export interface RecentChange {
  readonly id: RecordId
  readonly at: Instant
  readonly text: string
}

/**
 * What a lifecycle or outcome record was about, in the owner's own words.
 *
 * `action-completion`, `action-decline`, `action-unable-now` and `outcome`
 * all point at the `action-recommendation` they belong to rather than
 * carrying a subject of their own, so without this a "recently" line can only
 * say "a suggestion here" — true, and exactly the generic language section
 * 4.6 asks the app not to settle for when the subject is known. Resolving it
 * costs one lookup and never invents a subject it cannot find: an
 * unresolvable reference is silently absent rather than shown as a broken one
 * (the reading is still true without it, only less specific).
 */
function subjectOf(
  recommendation: RecordId,
  history: Situation['view']['history'],
  entities: EntityIndex,
): string | undefined {
  const found = history.byId(recommendation)
  if (found === undefined || found.kind !== 'action-recommendation') return undefined
  return entities.labelFor(found.recommendation.target.object)
}

function describeChange(
  record: CanonicalRecord,
  entities: EntityIndex,
  history: Situation['view']['history'],
): string | undefined {
  const labelFor = (ref: Parameters<EntityIndex['labelFor']>[0]) => entities.labelFor(ref)
  const about = (base: string, recommendation: RecordId): string => {
    const subject = subjectOf(recommendation, history, entities)
    if (subject === undefined) return base
    // The full stop belongs at the end of the whole sentence, not stranded
    // before the em dash that names the subject.
    const withoutFullStop = base.endsWith('.') ? base.slice(0, -1) : base
    return `${withoutFullStop} — ${subject}.`
  }

  switch (record.kind) {
    case 'observation':
    case 'explicit-fact':
      return describeFactValue(record.value, labelFor)
    case 'context':
      return record.durability === 'situational'
        ? `${describeFactValue(record.value, labelFor)} — for now`
        : describeFactValue(record.value, labelFor)
    case 'goal':
      return `Goal: ${record.statement}${record.status === 'active' ? '' : ` (${record.status})`}`
    case 'domain-update':
      return record.summary
    case 'coverage-update':
      return 'Reviewed — the owner has looked at this.'
    case 'action-completion':
      return about('Followed through on a suggestion here.', record.recommendation)
    case 'action-decline':
      return about('Passed on a suggestion here.', record.recommendation)
    case 'action-unable-now':
      return about("Said a suggestion here didn't fit at the time.", record.recommendation)
    case 'outcome':
      return about(
        record.aspect === 'result'
          ? 'Said how far a suggestion here got.'
          : record.aspect === 'effect'
            ? 'Said what a suggestion here was worth.'
            : 'Said how a suggestion here felt.',
        record.about,
      )
    case 'relationship-event':
      return record.nature
    case 'commitment':
      return `Commitment: ${record.statement}`
    case 'preference':
      return record.statement
    default:
      return undefined
  }
}

function recentChanges(
  situation: Situation,
  domains: readonly LifeDomainId[],
  limit = 8,
): readonly RecentChange[] {
  const matching = situation.view.history.effective.filter(
    (record) =>
      record.occurredAt <= situation.at && record.domains.some((d) => domains.includes(d)),
  )
  const sorted = [...matching].sort((a, b) => b.occurredAt - a.occurredAt)

  const out: RecentChange[] = []
  for (const record of sorted) {
    const text = describeChange(record, situation.entities, situation.view.history)
    if (text === undefined) continue
    out.push({ id: record.id, at: record.occurredAt, text })
    if (out.length >= limit) break
  }
  return out
}

// ---------------------------------------------------------------------------

export interface DomainPageData {
  readonly page: LifePage
  readonly coverage: readonly DomainCoverage[]
  readonly readings: readonly ConceptReading[]
  readonly goals: readonly DomainGoal[]
  readonly recentChanges: readonly RecentChange[]
}

export function assembleDomainPageData(situation: Situation, page: LifePage): DomainPageData {
  const coverage = page.domains
    .map((domain) => situation.coverage.get(domain))
    .filter((entry): entry is DomainCoverage => entry !== undefined)

  return {
    page,
    coverage,
    readings: conceptReadings(situation, page.domains),
    goals: goalsFor(situation, page.domains),
    recentChanges: recentChanges(situation, page.domains),
  }
}
