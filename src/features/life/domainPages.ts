import type { ActiveGoal } from '../../intelligence/situation'
import { DOMAIN, type LifeDomainId } from '../../domain/domains'
import type { EntityIndex, EntityKind, EntityRef } from '../../domain/entities'
import type { AimReadingRecord, GrowthStage } from '../../domain/records'
import type { RecordId } from '../../domain/ids'
import { PRIVATE_PAGE_PROMISE, type DisplayPolicy } from '../../domain/privacy'
import {
  basisOf,
  matchKnowledge,
  type Knowledge,
  type KnowledgeState,
} from '../../domain/knowledge'
import {
  compareRecordOrder,
  describeFactValue,
  type CanonicalRecord,
  type DestinationRecord,
  type FactValue,
  type GoalRecord,
} from '../../domain/records'
import { localDayIdAt, type Instant, type LocalDayId } from '../../domain/time'
import {
  describeDestination,
  destinationsIn,
  type ActiveDestination,
  type DestinationReading,
} from '../../intelligence/destinations'
import { isCorrectableEvent } from '../../intelligence/corrections'
import { readingFor } from '../../intelligence/interpret'
import { insightsFor, type GatheringLine } from '../../intelligence/insights'
import { readProgress, type ProgressReading } from '../../intelligence/progress'
import type { ConceptId } from '../../domain/windows'
import {
  describeGoalTrajectory,
  type DomainCoverage,
  type Situation,
} from '../../intelligence/situation'
import { daysSincePractice, growthStandingFor } from '../../intelligence/growth'
import { questionFor, type QuestionSpec } from '../../intelligence/questions'
import { describeRecord } from '../history/describe'
import { originOf, originOfAll, type RecordOrigin } from '../history/origin'

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
    /*
     * The promise the behaviour can keep — F30, plan section 11.
     *
     * It said "Nothing here appears anywhere else" while Timeline rendered a
     * dated "Private entry" row. The sentence is now next to the policy that
     * decides what a primary surface may show, in `domain/privacy.ts`, so the
     * two cannot drift apart again without somebody editing both.
     */
    lede: PRIVATE_PAGE_PROMISE,
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
  /**
   * Where the reading came from, when every record under it agrees
   * (QA-08-001).
   *
   * The knowledge state already says whether something worked it out, and that
   * is a different question: an imported reading resolves as `inferred`
   * because this app did not watch it happen, which reads on screen as the app
   * having concluded something. It did not — the owner reported it, in the old
   * app, two years ago. Both facts belong on the row.
   *
   * Undefined where the basis is mixed. A badge over a belief that is half his
   * and half imported would be a claim wider than the evidence, and the
   * entries underneath say it individually.
   */
  readonly origin: RecordOrigin | undefined
  /**
   * Whether the app worked this out rather than being told it — QA-82-001.
   *
   * A derived row is read-only. Offering "Not right?" on a conclusion invites
   * the owner to correct a thing that is not his to correct: the correction
   * would write a record nothing reads, and on this page it would read as
   * changing the arrangement underneath. So the row says what it rests on
   * instead, and the correctable row is the one directly above it.
   */
  readonly derived: boolean
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

    /*
     * A derived reading comes from the decision, not from the store —
     * QA-82-001.
     *
     * `view.facts` only knows what a record said, so a concept nothing records
     * resolves to `unknown` here and this page would print "Not known yet."
     * about a reading the app is actively deciding on. The situation already
     * carries it, with the sources it rests on, because the decision read it.
     */
    if (definition.derived === true) {
      const worked = situation.considered.find((fact) => fact.concept === definition.id)
      if (worked === undefined) continue
      out.push({
        concept: definition.id,
        label: definition.label,
        domain: definition.domain,
        state: worked.state,
        standing: false,
        text: worked.reading,
        outOfDate: false,
        // Never correctable, and never asked. See `ConceptDefinition.derived`.
        question: undefined,
        origin: originOfAll(
          worked.sources.flatMap((id) => {
            const found = situation.view.history.byId(id)
            return found === undefined ? [] : [found]
          }),
        ),
        derived: true,
      })
      continue
    }

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
      origin:
        knowledge === undefined
          ? undefined
          : originOfAll(
              basisOf(knowledge).flatMap((id) => {
                const found = situation.view.history.byId(id)
                return found === undefined ? [] : [found]
              }),
            ),
      derived: false,
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// Goals in this domain
// ---------------------------------------------------------------------------

/** One named piece of a goal, ready to render. */
export interface GoalPartRow {
  readonly ref: EntityRef
  readonly label: string
  readonly covered: boolean
}

/**
 * The kinds of entity that can be a piece of a goal — AUD-0021.
 *
 * A closed list, because "add a part" against every entity in the store would
 * let a person become a piece of a certification. These are the five kinds that
 * name a body of work: the topics of a course, the skills behind a trade, a
 * project, a work item, a money goal.
 */
const PART_KINDS: readonly EntityKind[] = [
  'learning-topic',
  'skill',
  'project',
  'work-item',
  'financial-goal',
]

export interface DomainGoal extends ActiveGoal {
  /** The full record, so a correction can supersede exactly what it replaces. */
  readonly record: GoalRecord | undefined
  /** Where it came from, when the owner did not write it (QA-08-001). */
  readonly origin: RecordOrigin | undefined
  /**
   * What the app can say about how this is going, or nothing — AUD-0021.
   *
   * Counts of pieces and the date the owner set. Never a share, never a verdict
   * — section 22 forbids a life score and "62% of the way to the CCNA" is one
   * with the arithmetic showing.
   */
  readonly trajectory: string | undefined
  readonly parts: readonly GoalPartRow[]
  /** Pieces in this area the goal has not been broken into yet. */
  readonly couldBeParts: readonly { readonly ref: EntityRef; readonly label: string }[]
}

function goalsFor(situation: Situation, domains: readonly LifeDomainId[]): readonly DomainGoal[] {
  return situation.direction.goals
    .filter((goal) => domains.includes(goal.domain))
    .map((goal) => {
      const found = situation.view.history.byId(goal.source)
      const named = new Set(goal.parts.map((part) => part.ref.id))
      const couldBeParts: { ref: EntityRef; label: string }[] = []
      for (const kind of PART_KINDS) {
        for (const entity of situation.entities.byKind(kind)) {
          if (!domains.includes(entity.domain)) continue
          if (named.has(entity.id)) continue
          couldBeParts.push({ ref: { id: entity.id, kind: entity.kind }, label: entity.label })
        }
      }
      return {
        ...goal,
        record: found?.kind === 'goal' ? found : undefined,
        origin: found === undefined ? undefined : originOf(found),
        trajectory: describeGoalTrajectory(goal),
        parts: goal.parts.map((part) => ({
          ref: part.ref,
          label: situation.entities.labelFor(part.ref) ?? part.ref.id,
          covered: part.covered,
        })),
        couldBeParts,
      }
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
  /** Where it came from, when the owner did not write it (QA-08-001). */
  readonly origin: RecordOrigin | undefined
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
    domains: situation.domains,
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
    out.push({
      id: record.id,
      at: record.occurredAt,
      text: described.text,
      origin: described.origin,
    })
    if (out.length >= limit) break
  }
  return out
}

// ---------------------------------------------------------------------------

/**
 * A standing "stop suggesting this", and where to lift it — AUD-0050.
 *
 * A veto is the most permanent thing the owner can do, so **a veto he cannot
 * find again is worse than none**. It is listed on the page for the area it was
 * filed under, which is where somebody looking for a rule about that area would
 * look.
 */
export interface StandingVeto {
  readonly record: RecordId
  /** What he said, in his own words as the control wrote them. */
  readonly statement: string
  /** Whether it stops one thing or everything from an area. */
  readonly scope: 'move' | 'area'
  readonly at: Instant
}

/**
 * A development skill and where the owner says it has got to — AUD-0015(a).
 *
 * On the page rather than only inside the engine, because the finding's own
 * risk note is about this: a stage is a stored judgement about a child and must
 * be correctable in one tap and reversible. A belief he cannot find is a belief
 * he cannot correct.
 */
export interface DomainSkill {
  readonly ref: EntityRef
  readonly label: string
  readonly stage: GrowthStage
  readonly domain: LifeDomainId
  /** How long since she last had a go, in owner-local days. */
  readonly daysSince: number | undefined
}

/**
 * A standing constraint the owner supplied when something did not fit — F07.
 *
 * Two of the seven blocker causes are facts about the world rather than about
 * one evening, and those become `constraint` records. They are listed here for
 * the same reason a veto is: **a belief the owner cannot find is a belief he
 * cannot correct**, and this one was produced by a single tap on a card that is
 * long gone by the time it starts mattering.
 */
export interface StandingBlocker {
  readonly record: RecordId
  readonly description: string
  readonly at: Instant
}

/**
 * A destination, ready to render — F01, F35, D-162.
 *
 * The five parts the review asked for, plus the record so a revision can
 * supersede exactly what it replaces. **No number reaches this interface**, and
 * that is the shape of D-162's guard rather than a note about it: there is
 * nothing here that could be divided by anything else.
 */
export interface DomainDestination {
  readonly destination: ActiveDestination
  readonly reading: DestinationReading
  readonly record: DestinationRecord | undefined
  readonly origin: RecordOrigin | undefined
  /**
   * What the app read in his words, where it read anything — routing 91.
   *
   * A **sibling** of `record` and never folded into it. The page renders the
   * two as two rows for D-143's reason: what he was told and what the app
   * worked out are different claims with different authors, and a page that
   * merged them would be printing the app's conclusion in his voice.
   */
  readonly interpretation: AimReadingRecord | undefined
}

/**
 * An entry on this page the owner can say was wrong — F32.
 *
 * Only what either happened or did not: what he did, what came of it, what he
 * said about somebody. A reading is corrected from its own row above, which is
 * a different gesture with a different consequence, and a conclusion is
 * corrected where it is stated.
 */
export interface CorrectableEvent {
  readonly id: RecordId
  readonly at: Instant
  readonly dayId: LocalDayId
  readonly text: string
  readonly kind: CanonicalRecord['kind']
}

export interface DomainPageData {
  readonly page: LifePage
  readonly coverage: readonly DomainCoverage[]
  /** What the owner is trying to become here — F01, F35, package 1. */
  readonly destinations: readonly DomainDestination[]
  readonly readings: readonly ConceptReading[]
  readonly goals: readonly DomainGoal[]
  /** What the record actually shows, sorted onto the six rungs — F05. */
  readonly progress: ProgressReading
  readonly skills: readonly DomainSkill[]
  readonly vetoes: readonly StandingVeto[]
  /** What the owner said was in the way, when it was about the world — F07. */
  readonly blockers: readonly StandingBlocker[]
  readonly recentChanges: readonly RecentChange[]
  /** Entries here that can be withdrawn or re-dated — F32, package 6. */
  readonly correctable: readonly CorrectableEvent[]
  /**
   * What the app is in the middle of working out about this area — AUD-0043.
   *
   * Canonical section 7 lists eight questions a domain page should answer and
   * this was the only one no page answered anywhere. It is also the one the
   * pages are best placed to answer: a father opening Fatherhood sees what the
   * app *believes* about his daughter and not what it is three occasions into
   * deciding about her — which is the thing he would most want to correct while
   * it is still forming, and which he can currently only find on Insights among
   * everything else.
   *
   * **Read, never recomputed.** These are `insightsFor`'s own gathering lines,
   * filtered by the domain each already carries. The coverage precedent forbids
   * a second reading for a good reason: two computations over one history
   * eventually disagree and the owner cannot tell which screen is lying.
   */
  readonly gathering: readonly GatheringLine[]
}

function skillsFor(situation: Situation, domains: readonly LifeDomainId[]): readonly DomainSkill[] {
  const out: DomainSkill[] = []
  for (const entity of situation.entities.byKind('development-skill')) {
    if (!domains.includes(entity.domain)) continue
    const ref: EntityRef = { id: entity.id, kind: entity.kind }
    out.push({
      ref,
      label: entity.label,
      stage: growthStandingFor(situation, ref).stage,
      domain: entity.domain,
      daysSince: daysSincePractice(situation, ref),
    })
  }
  return out
}

function vetoesFor(
  situation: Situation,
  domains: readonly LifeDomainId[],
): readonly StandingVeto[] {
  const out: StandingVeto[] = []
  for (const record of situation.view.history.effective) {
    if (record.kind !== 'preference') continue
    if (record.stance !== 'forbids') continue
    if (!record.domains.some((domain) => domains.includes(domain))) continue
    out.push({
      record: record.id,
      statement: record.statement,
      scope: record.about.kind === 'life-domain' ? 'area' : 'move',
      at: record.occurredAt,
    })
  }
  return out.sort((a, b) => b.at - a.at)
}

function destinationsFor(
  situation: Situation,
  domains: readonly LifeDomainId[],
): readonly DomainDestination[] {
  return destinationsIn(situation.direction.destinations, domains).map((destination) => {
    const found = situation.view.history.byId(destination.source)
    return {
      destination,
      reading: describeDestination(destination),
      record: found?.kind === 'destination' ? found : undefined,
      origin: found === undefined ? undefined : originOf(found),
      interpretation: readingFor(situation.view, destination.destination, situation.at),
    }
  })
}

function blockersFor(
  situation: Situation,
  domains: readonly LifeDomainId[],
): readonly StandingBlocker[] {
  const out: StandingBlocker[] = []
  for (const record of situation.view.history.effective) {
    if (record.kind !== 'constraint') continue
    if (record.occurredAt > situation.at) continue
    if (record.until !== undefined && record.until <= situation.at) continue
    if (!record.domains.some((domain) => domains.includes(domain))) continue
    out.push({ record: record.id, description: record.description, at: record.occurredAt })
  }
  return out.sort((a, b) => b.at - a.at)
}

/**
 * How many entries the correction list offers at once.
 *
 * A handful, in the same spirit as "Recently": a correction surface listing a
 * lifetime is the database viewer section 59 and F04 both refuse. Nothing is
 * unreachable because of it — the list is the most recent entries, which is
 * where a mis-tap is.
 */
const CORRECTABLE_LIMIT = 6

function correctableFor(
  situation: Situation,
  domains: readonly LifeDomainId[],
): readonly CorrectableEvent[] {
  const policy: DisplayPolicy = {
    surface: 'inspection',
    revealPrivate: domains.includes(DOMAIN.privateHealth),
  }
  const context = {
    entities: situation.entities,
    history: situation.view.history,
    concepts: situation.concepts,
    domains: situation.domains,
    policy,
  }
  const matching = situation.view.history.effective.filter(
    (record) =>
      record.occurredAt <= situation.at &&
      isCorrectableEvent(record) &&
      record.domains.some((domain) => domains.includes(domain)),
  )
  const sorted = [...matching].sort((a, b) => -compareRecordOrder(a, b))

  const out: CorrectableEvent[] = []
  for (const record of sorted) {
    const described = describeRecord(record, context)
    if (described === undefined) continue
    out.push({
      id: record.id,
      at: record.occurredAt,
      dayId: localDayIdAt(record.occurredAt, situation.zone),
      text: described.text,
      kind: record.kind,
    })
    if (out.length >= CORRECTABLE_LIMIT) break
  }
  return out
}

export function assembleDomainPageData(situation: Situation, page: LifePage): DomainPageData {
  const coverage = page.domains
    .map((domain) => situation.coverage.get(domain))
    .filter((entry): entry is DomainCoverage => entry !== undefined)

  return {
    page,
    coverage,
    destinations: destinationsFor(situation, page.domains),
    readings: conceptReadings(situation, page.domains),
    goals: goalsFor(situation, page.domains),
    progress: readProgress(situation, page.domains),
    skills: skillsFor(situation, page.domains),
    vetoes: vetoesFor(situation, page.domains),
    blockers: blockersFor(situation, page.domains),
    recentChanges: recentChanges(situation, page.domains),
    correctable: correctableFor(situation, page.domains),
    gathering: gatheringFor(situation, page.domains),
  }
}

/**
 * The gathering lines that belong to this page.
 *
 * A filter over `insightsFor(situation).gathering` and nothing else. It is
 * deliberately not a rebuild from `situation.learning`: `domainPages.ts` is a
 * thin feature-local grouping that decides nothing (`ARCHITECTURE_BOUNDARIES.md`
 * is explicit), and the moment this file learned to work out for itself what is
 * in progress it would be a second intelligence with its own opinion.
 *
 * A line with no area is dropped rather than shown on every page. It has no
 * page to belong to, and putting it on all of them would be worse than leaving
 * it where it already reads correctly.
 */
function gatheringFor(
  situation: Situation,
  domains: readonly LifeDomainId[],
): readonly GatheringLine[] {
  return insightsFor(situation).gathering.filter(
    (line) => line.domain !== undefined && domains.includes(line.domain),
  )
}
