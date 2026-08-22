import type { ActiveGoal } from '../../intelligence/situation'
import { DOMAIN, type LifeDomainId } from '../../domain/domains'
import type { EntityIndex } from '../../domain/entities'
import type { RecordId } from '../../domain/ids'
import type { DisplayPolicy } from '../../domain/privacy'
import { matchKnowledge, type Knowledge, type KnowledgeState } from '../../domain/knowledge'
import {
  compareRecordOrder,
  describeFactValue,
  type CanonicalRecord,
  type FactValue,
  type GoalRecord,
} from '../../domain/records'
import type { Instant } from '../../domain/time'
import type { ConceptId } from '../../domain/windows'
import type { DomainCoverage, Situation } from '../../intelligence/situation'
import { questionFor, type QuestionSpec } from '../../intelligence/questions'
import { describeRecord } from '../history/describe'

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
 * Which kinds of entry a domain page's "Recently" panel shows.
 *
 * Unchanged from Phase 5, and deliberately narrower than Timeline's. The owner
 * deferred rebuilding this panel to match the whole-life surface — it serves a
 * narrower, faster purpose — so what is shared with Timeline is the *wording*
 * of a line (`describeRecord`), not which lines a panel is interested in. One
 * definition of how a record reads; two decisions about what to read.
 */
const RECENT_KINDS: ReadonlySet<CanonicalRecord['kind']> = new Set([
  'observation',
  'explicit-fact',
  'context',
  'goal',
  'domain-update',
  'coverage-update',
  'action-completion',
  'action-decline',
  'action-unable-now',
  'outcome',
  'relationship-event',
  'commitment',
  'preference',
])

function recentChanges(
  situation: Situation,
  domains: readonly LifeDomainId[],
  limit = 8,
): readonly RecentChange[] {
  /*
   * A domain page is inspection, and the private page is the one place explicit
   * private detail belongs (section 11's manual-entry-first rule).
   *
   * Reading the policy off the page's own domains rather than showing
   * everything closes a hole nothing in the library currently reaches: a record
   * carrying both `home` and `private-health` would appear on the Home page,
   * and Phase 5 rendered every matched record's detail unconditionally. No
   * shipped history has such a record, so nothing observable changes — but the
   * rule is now the same one Timeline obeys rather than an accident of how the
   * fixtures happen to be tagged.
   */
  const policy: DisplayPolicy = {
    surface: 'inspection',
    revealPrivate: domains.includes(DOMAIN.privateHealth),
  }
  const context = {
    entities: situation.entities,
    history: situation.view.history,
    concepts: situation.concepts,
    policy,
  }

  const matching = situation.view.history.effective.filter(
    (record) =>
      record.occurredAt <= situation.at &&
      RECENT_KINDS.has(record.kind) &&
      record.domains.some((d) => domains.includes(d)),
  )
  /*
   * Canonical order, newest first — `occurredAt`, then `recordedAt`, then id.
   *
   * Sorting on `occurredAt` alone leaves two records about the same moment in
   * whatever order they happen to arrive in, and a correction is *always*
   * about the same moment as the thing it corrects. So "energy 3 of 5" could
   * print above the correction that replaced it and below the walk that came
   * after both, and the list read as a sequence of events that never happened
   * (DEF-0050). Timeline has used `compareRecordOrder` since it was written;
   * this is the same list of the same records, and there is only one right
   * order for them.
   */
  const sorted = [...matching].sort((a, b) => -compareRecordOrder(a, b))

  const out: RecentChange[] = []
  for (const record of sorted) {
    const described = describeRecord(record, context)
    if (described === undefined) continue
    out.push({ id: record.id, at: record.occurredAt, text: described.text })
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
