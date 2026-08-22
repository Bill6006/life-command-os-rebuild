import type { ConceptRegistry } from '../domain/concepts'
import type { RecordId } from '../domain/ids'
import type { ActionVerb } from '../domain/recommendation'
import { bearsConcept, type FactValue } from '../domain/records'
import { localDayIdAt, type Instant, type LocalDayId, type TimeZoneId } from '../domain/time'
import type { ConceptId, FreshnessHorizon } from '../domain/windows'
import type { MemoryView } from '../memory/view'
import type { Episode } from './lifecycle'
import { profileFor } from './moves'

/**
 * What actually followed an action, worked out rather than asked for (D-089).
 *
 * The defect this file exists to answer is QA-A1, and it is worth stating
 * plainly because everything below is shaped by it. The app used to ask *"How
 * much did a walk do for you?"* and offer **A real difference / Some difference
 * / Not much / Backfired**. That is the causal question the system exists to
 * answer, handed to the owner; his answer was stored as an outcome and counted
 * back to him as a percentage labelled *"how often it made a difference
 * afterwards"*. The denominator was a tally of opinions and the label asserted
 * an observed fact.
 *
 * So: the app reads the state itself, before and after, and compares it with
 * what happened on comparable occasions **when the action did not happen**.
 *
 * ## The one rule that makes this evidence rather than a story
 *
 * A **change pair** is two readings of the same concept, close enough together
 * to be about the same stretch of the day. Every pair in the history is found
 * by one rule, and then sorted into three groups by what happened between them:
 *
 * - the verb settled in between, and nothing else did → **with**;
 * - no completed episode at all settled in between → **without**;
 * - anything else settled in between → **left out**, and counted as left out.
 *
 * Both groups come from the same rule applied to the same history. That is what
 * makes the comparison a comparison. A figure built only from the occasions
 * that included a walk describes those evenings; it says nothing about walks.
 *
 * ## What this never does
 *
 * It never says an action caused anything, in either direction. It reports how
 * often a reading was higher afterwards, with the action and without it, and
 * the words for it are "has usually been higher" — never "improves". A reading
 * that is worse afterwards is a worse reading, not harm: that is D-066
 * generalized by D-089, and it is why nothing here has a good or a bad side.
 * `soreness` going up and `energy` going up are both reported as the reading
 * going up, in the concept's own words.
 *
 * It states nothing at all unless both groups clear {@link MIN_PAIRS} on their
 * own. Absence of evidence is a first-class answer, and the withheld state says
 * which side is missing.
 *
 * ## What it is not scoped by, and why
 *
 * Not by context band. A change pair on an evening with no decision has no
 * `DecisionContext` — nothing assembled one, because nothing was decided — so
 * banding the comparison group would mean inventing context for exactly the
 * occasions the comparison depends on. The claim is therefore *across the
 * record*, and the card says so in those words rather than borrowing "in
 * situations like tonight" from the belief machinery, which does band.
 *
 * Nothing here reads a clock, and nothing here decides.
 */

/** How many change pairs each side needs before anything is stated. */
export const MIN_PAIRS = 4

/** How far apart the two proportions must be before a direction is claimed. */
export const MATERIAL_GAP = 0.34

/**
 * The shortest gap worth calling a before and an after.
 *
 * Two readings a minute apart are one reading typed twice, and a move that
 * settled between them did not have time to be followed by anything.
 */
const MIN_GAP_MS = 20 * 60_000

/**
 * A numeric reading of a fact, for a rule that needs to compare two of them.
 *
 * Shared with `insights.ts` so a trajectory and an association agree about what
 * counts as a number. A scale carries its own top, so 4-of-5 and 8-of-10 are
 * the same reading — the same rule `ratioValue` already applies one layer down.
 */
export function numericValue(value: FactValue): number | undefined {
  switch (value.type) {
    case 'number':
      return value.value
    case 'scale':
      return value.of === 0 ? undefined : value.value / value.of
    case 'duration':
      return value.minutes
    default:
      return undefined
  }
}

/**
 * The longest gap that still counts as a before and an after, per concept.
 *
 * The concept's own freshness horizon, for the same reason every other window
 * in this system is concept-relative (section 8, D-061): two energy readings
 * nine hours apart are not a before and an after of the same evening, and two
 * sleep readings six hours apart are not two nights.
 */
export function maxGapFor(horizon: FreshnessHorizon): number | undefined {
  if (horizon.unit === 'durable') return undefined
  return horizon.unit === 'local-days' ? horizon.days * 86_400_000 : horizon.ms
}

interface Reading {
  readonly at: Instant
  readonly value: number
  readonly record: RecordId
}

/** One before-and-after, and what happened in between. */
export interface ChangePair {
  readonly dayId: LocalDayId
  readonly from: number
  readonly to: number
  readonly rose: boolean
  readonly at: Instant
  readonly records: readonly RecordId[]
}

export type AssociationDirection = 'higher' | 'lower' | 'no different'

export interface ObservedAssociation {
  readonly verb: ActionVerb
  readonly concept: ConceptId
  /** The concept's own label, so the sentence names what moved. */
  readonly label: string
  readonly with: readonly ChangePair[]
  readonly without: readonly ChangePair[]
  readonly roseWith: number
  readonly roseWithout: number
  /** Pairs discarded because something else happened in between. */
  readonly confounded: number
  readonly direction: AssociationDirection
  /** How much more often the reading rose with the action than without, −1…1. */
  readonly gap: number
  readonly window: { readonly from: LocalDayId; readonly to: LocalDayId } | undefined
  /** Set when nothing may be stated, and says exactly what is missing. */
  readonly withheld: string | undefined
}

export interface AssociationMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  readonly concepts: ConceptRegistry
}

function readingsOf(
  concept: ConceptId,
  view: MemoryView,
  moment: AssociationMoment,
): readonly Reading[] {
  const out: Reading[] = []
  for (const record of view.history.effective) {
    if (!bearsConcept(record)) continue
    if (record.concept !== concept) continue
    if (record.occurredAt > moment.now) continue
    const value = numericValue(record.value)
    if (value === undefined) continue
    out.push({ at: record.occurredAt, value, record: record.id })
  }
  return out.sort((a, b) => a.at - b.at)
}

/** Completed episodes, oldest first, with the moment they settled. */
function settlements(
  episodes: readonly Episode[],
  moment: AssociationMoment,
): readonly { readonly at: Instant; readonly verb: ActionVerb }[] {
  const out: { at: Instant; verb: ActionVerb }[] = []
  for (const episode of episodes) {
    if (episode.state !== 'completed') continue
    const at = episode.settledAt
    if (at === undefined || at > moment.now) continue
    out.push({ at, verb: episode.semantics.target.verb })
  }
  return out.sort((a, b) => a.at - b.at)
}

function windowOf(pairs: readonly ChangePair[]): ObservedAssociation['window'] {
  if (pairs.length === 0) return undefined
  const days = pairs.map((pair) => pair.dayId).sort()
  const from = days[0]
  const to = days[days.length - 1]
  return from === undefined || to === undefined ? undefined : { from, to }
}

/**
 * What has followed this move, across the record, against occasions without it.
 *
 * Every consecutive pair of readings inside the concept's own window is
 * classified once, by the same rule, and the two groups fall out of that. A
 * pair with some *other* completed move in between belongs to neither: it is
 * not evidence about this move and it is not a clean occasion without it, so it
 * is discarded and counted as discarded. That is the honest answer to "an
 * unrelated event fell between the action and the later observation" — the
 * alternative is to absorb it into one of the groups and never say so.
 */
export function associationFor(
  verb: ActionVerb,
  episodes: readonly Episode[],
  view: MemoryView,
  moment: AssociationMoment,
): ObservedAssociation | undefined {
  const concept = profileFor(verb).affects
  if (concept === undefined) return undefined

  const definition = moment.concepts.definitionFor(concept)
  const maxGap = maxGapFor(definition.freshness)
  if (maxGap === undefined) return undefined

  const readings = readingsOf(concept, view, moment)
  const settled = settlements(episodes, moment)

  const withAction: ChangePair[] = []
  const without: ChangePair[] = []
  let confounded = 0

  for (let index = 1; index < readings.length; index += 1) {
    const from = readings[index - 1]
    const to = readings[index]
    if (from === undefined || to === undefined) continue

    const gap = to.at - from.at
    if (gap < MIN_GAP_MS || gap > maxGap) continue

    const between = settled.filter((entry) => entry.at > from.at && entry.at <= to.at)
    const mine = between.filter((entry) => entry.verb === verb).length
    const others = between.length - mine

    // Anything else in the way makes the pair evidence about neither group.
    if (others > 0) {
      confounded += 1
      continue
    }

    const pair: ChangePair = {
      dayId: localDayIdAt(to.at, moment.zone),
      from: from.value,
      to: to.value,
      rose: to.value > from.value,
      at: to.at,
      records: [from.record, to.record],
    }
    if (mine > 0) withAction.push(pair)
    else without.push(pair)
  }

  const roseWith = withAction.filter((pair) => pair.rose).length
  const roseWithout = without.filter((pair) => pair.rose).length

  /*
   * Both sides, independently. A comparison with one side missing is not a
   * weaker comparison — it is not a comparison, and the honest report says
   * which half is absent rather than quietly reporting the half that exists.
   *
   * This is also the guard against selectively recorded state. If readings only
   * ever get entered after the evenings that went well, the occasions without
   * the move never accumulate a pair, and nothing is stated at all.
   */
  const short: string[] = []
  if (withAction.length < MIN_PAIRS) short.push(`${withAction.length} with it`)
  if (without.length < MIN_PAIRS) short.push(`${without.length} without it`)

  const base: Omit<ObservedAssociation, 'direction' | 'gap' | 'withheld'> = {
    verb,
    concept,
    label: definition.label,
    with: withAction,
    without,
    roseWith,
    roseWithout,
    confounded,
    window: windowOf([...withAction, ...without]),
  }

  if (short.length > 0) {
    return {
      ...base,
      direction: 'no different',
      gap: 0,
      withheld: `not enough to compare yet — ${short.join(', ')}, and ${MIN_PAIRS} of each is the least this can be said over`,
    }
  }

  const gap = roseWith / withAction.length - roseWithout / without.length
  return {
    ...base,
    direction: gap >= MATERIAL_GAP ? 'higher' : gap <= -MATERIAL_GAP ? 'lower' : 'no different',
    gap,
    withheld: undefined,
  }
}

/**
 * Every move the record can say something about, whether or not it says much.
 *
 * Includes the withheld ones deliberately: "nothing to compare yet, four with
 * it and one without" is a report, and hiding it would leave the owner unable
 * to tell the difference between the app having looked and found nothing and
 * the app not having looked.
 */
export function observedAssociations(
  episodes: readonly Episode[],
  view: MemoryView,
  moment: AssociationMoment,
): readonly ObservedAssociation[] {
  const verbs = new Set<ActionVerb>()
  for (const episode of episodes) {
    if (profileFor(episode.semantics.target.verb).affects === undefined) continue
    verbs.add(episode.semantics.target.verb)
  }

  const out: ObservedAssociation[] = []
  for (const verb of verbs) {
    const found = associationFor(verb, episodes, view, moment)
    if (found !== undefined) out.push(found)
  }
  return out.sort((a, b) => a.verb.localeCompare(b.verb))
}
