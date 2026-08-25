import type { ConceptRegistry } from '../domain/concepts'
import type { EntityRef } from '../domain/entities'
import { entityIdKind, isEntityId, type RecordId } from '../domain/ids'
import type { ActionTarget, ActionVerb } from '../domain/recommendation'
import { bearsConcept, type CanonicalRecord, type FactValue } from '../domain/records'
import {
  blockOf,
  localDateTimeAt,
  localDayIdAt,
  type Instant,
  type LocalDayId,
  type TimeZoneId,
} from '../domain/time'
import { approximateHorizonMs, type ConceptId, type FreshnessHorizon } from '../domain/windows'
import type { MemoryView } from '../memory/view'
import { targetKey, type Episode } from './lifecycle'
import { profileFor } from './moves'

/**
 * What actually followed an action, worked out rather than asked for (D-089),
 * and scoped so that the sentence means what it says (D-091).
 *
 * The first version of this file answered QA-A1 — the app had been asking the
 * owner *"How much did a walk do for you?"* and counting his answers back as
 * measurements. An independent cold-use audit then found four ways the answer
 * was still wrong, and every one of them is a claim being made wider than its
 * evidence:
 *
 * - **it was keyed on the verb.** Four walks followed by higher energy and four
 *   bike rides followed by lower energy share the `move` verb, so the two were
 *   averaged and the result printed as a finding about *a walk*.
 * - **it read the whole record.** Walks that helped every weekday and helped on
 *   no weekend collapsed to "no different", and that collapsed figure was what
 *   reached the ranking on a Tuesday.
 * - **it treated silence as absence.** An evening with no episode recorded went
 *   into the "without a walk" group, so *we do not know* was counted as
 *   evidence that he did not walk.
 * - **it noticed only other recommendations.** Four difficult conversations
 *   recorded between a walk and the later reading confounded nothing, and the
 *   card said "no occasion had to be left out for something else happening in
 *   between" — a claim about the world, from a check of one record kind.
 *
 * ## The four rules that replace them
 *
 * **Identity.** A relationship is scoped to the semantic action — verb *and*
 * object — not to the verb. Aggregating two objects requires an entry in
 * {@link ACTION_FAMILIES}, which is a deliberate act with a name on it.
 *
 * **Exposure.** A pair is *with* the action when a completed episode of that
 * exact target settled between the readings, and *without* it only when the
 * record positively says so: the move was put in front of him and he declined
 * it or could not do it. Everything else is **unknown**, belongs to neither
 * group, and is counted and reported as unknown. Missing evidence is not
 * negative evidence.
 *
 * **Context.** Every pair carries the coarse context of its own moment, and the
 * relationship is computed per band as well as across the record. Where two
 * supported bands materially disagree, the whole-record figure is not allowed
 * to drive a recommendation: {@link applicableAssociation} returns the band
 * tonight actually falls in, or nothing.
 *
 * **Confounding.** {@link CONFOUNDING_KINDS} names the recorded classes that
 * make a pair uninterpretable, and the copy says only what was checked. The app
 * cannot know about anything the owner did not record, and it must not imply
 * that it can.
 *
 * ## What this still never does
 *
 * It never says an action caused anything, in either direction. A reading that
 * is lower afterwards is a lower reading, not harm — D-066 generalized by
 * D-089 — which is why nothing here has a good side or a bad side. It states
 * nothing at all unless both groups clear {@link MIN_PAIRS} on their own.
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
 * Action objects that may honestly be pooled, and there are none (D-091).
 *
 * The audit's reproduction is the argument for the table existing and for it
 * being empty: a walk and a bike ride are both the `move` verb, they were
 * pooled, and the pooled result was printed as a finding about *a walk*. Two
 * objects are interchangeable only if somebody decides they are, in writing,
 * with a reason — so aggregation is an entry here rather than the default.
 *
 * Adding one is a claim that the owner's own two subjects are the same thing
 * for the purposes of a learned relationship. Nothing in the starting registry
 * is, and `tests/unit/architecture-guards.test.ts` fails the build if an entry
 * appears without a `because`.
 */
export interface ActionFamily {
  readonly id: string
  readonly label: string
  readonly members: readonly string[]
  readonly because: string
}

export const ACTION_FAMILIES: readonly ActionFamily[] = []

/** Which scope a pair of episodes shares, for the purposes of a relationship. */
export function actionScopeOf(target: ActionTarget): string {
  const family = ACTION_FAMILIES.find((entry) => entry.members.includes(targetKey(target)))
  return family === undefined ? targetKey(target) : `family:${family.id}`
}

/**
 * The action a scope names, read back out of it (D-091 invariant 1).
 *
 * A scope is written by {@link actionScopeOf} and then stored — inside a
 * correction record, which outlives the screen that produced it. Anything
 * describing that record later has to be able to say *which* action it was
 * about, and the only honest source is the scope itself. Without this, a
 * correction about a walk gets described by its verb, and "the app has stopped
 * assuming this about moving" fits the bike ride the owner never disputed.
 *
 * A family scope resolves to its label instead: it names several actions on
 * purpose, and pretending it names one would be the same defect inverted.
 */
export function actionScopeParts(
  scope: string,
):
  | { readonly verb: ActionVerb; readonly object: EntityRef }
  | { readonly family: ActionFamily }
  | undefined {
  const family = ACTION_FAMILIES.find((entry) => scope === `family:${entry.id}`)
  if (family !== undefined) return { family }

  const cut = scope.indexOf('/')
  if (cut <= 0) return undefined
  const verb = scope.slice(0, cut) as ActionVerb
  const id = scope.slice(cut + 1)
  if (!isEntityId(id)) return undefined
  return { verb, object: { id, kind: entityIdKind(id) as EntityRef['kind'] } }
}

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
  return approximateHorizonMs(horizon)
}

/**
 * Recorded classes that make a before-and-after uninterpretable (D-091).
 *
 * Not "everything that could possibly matter" — the app has no way to know
 * about a phone call it was never told about, and pretending otherwise is the
 * overclaim the audit found. What it can do is name the classes it *does*
 * hold, check those, and say that is what it checked.
 *
 * A reading is deliberately not on the list. An energy or soreness observation
 * falling between two others is the ordinary business of a day, not an event.
 */
export const CONFOUNDING_KINDS: readonly CanonicalRecord['kind'][] = [
  /** Something recorded about a person — the audit's own reproduction. */
  'relationship-event',
  /** Circumstances changed: travel, an arrangement, an exception. */
  'context',
  /** A limit came into force. */
  'constraint',
  /** Something changed about a whole area of his life. */
  'domain-update',
  /** A decision he recorded making. */
  'decision',
]

interface Reading {
  readonly at: Instant
  readonly value: number
  readonly record: RecordId
}

/** Whether the record says the action happened, did not happen, or is silent. */
export type Exposure = 'present' | 'absent' | 'unknown'

/** One before-and-after, what happened in between, and when it was. */
export interface ChangePair {
  readonly dayId: LocalDayId
  readonly from: number
  readonly to: number
  readonly rose: boolean
  readonly at: Instant
  readonly exposure: Exposure
  /** The coarse context of the pair's own moment, for banding. */
  readonly weekend: boolean
  readonly evening: boolean
  readonly records: readonly RecordId[]
}

export type AssociationDirection = 'higher' | 'lower' | 'no different'

/** One side of a context split, or the whole record read as one. */
export interface AssociationSide {
  readonly label: string
  readonly present: readonly ChangePair[]
  readonly absent: readonly ChangePair[]
  readonly rosePresent: number
  readonly roseAbsent: number
  readonly direction: AssociationDirection
  /** How much more often the reading rose with the action than without, −1…1. */
  readonly gap: number
  /** Both groups clear `MIN_PAIRS` on their own. */
  readonly supported: boolean
}

export interface AssociationSplit {
  readonly id: string
  readonly yes: AssociationSide
  readonly no: AssociationSide
  /** Both sides supported, and they materially disagree. */
  readonly disagree: boolean
}

export interface ObservedAssociation {
  /** Verb and object, or an explicit family — never the verb alone (D-091). */
  readonly scope: string
  readonly verb: ActionVerb
  readonly object: EntityRef
  readonly concept: ConceptId
  /** The concept's own label, so the sentence names what moved. */
  readonly label: string
  /** The whole record, read as one. */
  readonly overall: AssociationSide
  /** Splits where both sides are supported. */
  readonly splits: readonly AssociationSplit[]
  /** True when some supported split materially disagrees with itself. */
  readonly disagree: boolean
  /** Pairs discarded because something else recorded fell in between. */
  readonly confounded: number
  /** Pairs the record cannot place either way. Never a comparison group. */
  readonly unknownExposure: number
  readonly window: { readonly from: LocalDayId; readonly to: LocalDayId } | undefined
  /** Set when nothing may be stated, and says exactly what is missing. */
  readonly withheld: string | undefined
}

export interface AssociationMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  readonly concepts: ConceptRegistry
}

// ---------------------------------------------------------------------------
// Reading the record
// ---------------------------------------------------------------------------

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

interface Settlement {
  readonly at: Instant
  readonly scope: string
  readonly done: boolean
  /** He was asked and said no, or could not — positive evidence of absence. */
  readonly refused: boolean
}

/** Every episode that reached a settled state, oldest first. */
function settlements(
  episodes: readonly Episode[],
  moment: AssociationMoment,
): readonly Settlement[] {
  const out: Settlement[] = []
  for (const episode of episodes) {
    const at = episode.settledAt
    if (at === undefined || at > moment.now) continue
    const state = episode.state
    if (state !== 'completed' && state !== 'declined' && state !== 'unable-now') continue
    out.push({
      at,
      scope: actionScopeOf(episode.semantics.target),
      done: state === 'completed',
      refused: state !== 'completed',
    })
  }
  return out.sort((a, b) => a.at - b.at)
}

/** Recorded events, other than readings, that fall between two readings. */
function eventsIn(view: MemoryView, from: Instant, to: Instant): number {
  let count = 0
  for (const record of view.history.effective) {
    if (record.occurredAt <= from || record.occurredAt > to) continue
    if (!CONFOUNDING_KINDS.includes(record.kind)) continue
    count += 1
  }
  return count
}

// ---------------------------------------------------------------------------
// Sides and splits
// ---------------------------------------------------------------------------

function sideOf(label: string, pairs: readonly ChangePair[]): AssociationSide {
  const present = pairs.filter((pair) => pair.exposure === 'present')
  const absent = pairs.filter((pair) => pair.exposure === 'absent')
  const rosePresent = present.filter((pair) => pair.rose).length
  const roseAbsent = absent.filter((pair) => pair.rose).length
  const supported = present.length >= MIN_PAIRS && absent.length >= MIN_PAIRS
  const gap = supported ? rosePresent / present.length - roseAbsent / absent.length : 0

  return {
    label,
    present,
    absent,
    rosePresent,
    roseAbsent,
    direction: !supported
      ? 'no different'
      : gap >= MATERIAL_GAP
        ? 'higher'
        : gap <= -MATERIAL_GAP
          ? 'lower'
          : 'no different',
    gap,
    supported,
  }
}

/**
 * The coarse context bands a relationship is read in.
 *
 * Deliberately the two features derivable from an instant alone. The rest of
 * `similarity`'s features — how rested he is, whether she is here, how much
 * time there is — need the fact layer as of that moment, and an occasion when
 * nothing was decided has no assembled context at all. Banding on those would
 * mean inventing context for exactly the occasions the comparison depends on;
 * banding on these two does not, and they are what the audit's own
 * reproduction turns on.
 */
const BANDS: readonly {
  readonly id: string
  readonly label: string
  readonly opposite: string
  yes(pair: ChangePair): boolean
}[] = [
  {
    id: 'weekend',
    label: 'at the weekend',
    opposite: 'on a weekday',
    yes: (pair) => pair.weekend,
  },
  {
    id: 'evening',
    label: 'in the evening',
    opposite: 'earlier in the day',
    yes: (pair) => pair.evening,
  },
]

// ---------------------------------------------------------------------------

/**
 * What has followed this action, across the record and by context.
 *
 * `after` is the watershed a correction sets: everything up to that moment
 * stops counting toward this relationship and what happens afterwards counts
 * normally. Section 62's rule, and D-091's correctability invariant — history
 * is preserved and the interpretation is what gets corrected.
 */
export function associationFor(
  target: ActionTarget,
  episodes: readonly Episode[],
  view: MemoryView,
  moment: AssociationMoment,
  after?: Instant,
): ObservedAssociation | undefined {
  const concept = profileFor(target.verb).affects
  if (concept === undefined) return undefined

  const definition = moment.concepts.definitionFor(concept)
  const maxGap = maxGapFor(definition.freshness)
  if (maxGap === undefined) return undefined

  const scope = actionScopeOf(target)
  const readings = readingsOf(concept, view, moment)
  const settled = settlements(episodes, moment)

  const pairs: ChangePair[] = []
  let confounded = 0
  let unknownExposure = 0

  for (let index = 1; index < readings.length; index += 1) {
    const from = readings[index - 1]
    const to = readings[index]
    if (from === undefined || to === undefined) continue

    const gap = to.at - from.at
    if (gap < MIN_GAP_MS || gap > maxGap) continue
    if (after !== undefined && to.at <= after) continue

    const between = settled.filter((entry) => entry.at > from.at && entry.at <= to.at)
    const mine = between.filter((entry) => entry.scope === scope)
    const otherDone = between.filter((entry) => entry.scope !== scope && entry.done).length

    /*
     * Anything else the record knows about makes the pair evidence about
     * neither group — another completed action, or one of the recorded event
     * classes D-091 names. Absorbing it into either side would be the app
     * choosing which story to tell; discarding it silently would be the same
     * choice made quietly, so it is counted and said out loud.
     */
    if (otherDone > 0 || eventsIn(view, from.at, to.at) > 0) {
      confounded += 1
      continue
    }

    /*
     * Exposure, and this is the rule the audit's third finding is about.
     *
     * *Present* is a completed episode of this exact action. *Absent* requires
     * the record to say so — the move was put in front of him and he declined
     * it or said he could not. Silence is **unknown**: an evening with nothing
     * recorded is not evidence that he did not go for a walk, and counting it
     * as one manufactures the comparison group the whole finding rests on.
     */
    const exposure: Exposure = mine.some((entry) => entry.done)
      ? 'present'
      : mine.some((entry) => entry.refused)
        ? 'absent'
        : 'unknown'

    if (exposure === 'unknown') {
      unknownExposure += 1
      continue
    }

    const local = localDateTimeAt(to.at, moment.zone)
    const block = blockOf(to.at, moment.zone)
    pairs.push({
      dayId: localDayIdAt(to.at, moment.zone),
      from: from.value,
      to: to.value,
      rose: to.value > from.value,
      at: to.at,
      exposure,
      weekend: local.isoWeekday >= 6,
      evening: block === 'evening' || block === 'late-night',
      records: [from.record, to.record],
    })
  }

  const overall = sideOf('across the record', pairs)

  const splits: AssociationSplit[] = []
  for (const band of BANDS) {
    const yes = sideOf(band.label, pairs.filter(band.yes))
    const no = sideOf(
      band.opposite,
      pairs.filter((pair) => !band.yes(pair)),
    )
    if (!yes.supported || !no.supported) continue
    splits.push({
      id: band.id,
      yes,
      no,
      disagree: Math.abs(yes.gap - no.gap) >= MATERIAL_GAP,
    })
  }

  const window = windowOf(pairs)
  const base = {
    scope,
    verb: target.verb,
    object: target.object,
    concept,
    label: definition.label,
    overall,
    splits,
    disagree: splits.some((split) => split.disagree),
    confounded,
    unknownExposure,
    window,
  }

  /*
   * Both groups, independently, and unknown exposure named separately.
   *
   * A comparison with one side missing is not a weaker comparison — it is not a
   * comparison. And the reason a side is thin matters to the owner: "nothing in
   * the record says whether it happened on 30 evenings" is a different message
   * from "it has only come up twice", and the first is the one that tells him
   * the app is not guessing.
   */
  if (!overall.supported && !base.disagree) {
    const short: string[] = []
    if (overall.present.length < MIN_PAIRS) short.push(`${overall.present.length} with it`)
    if (overall.absent.length < MIN_PAIRS)
      short.push(`${overall.absent.length} recorded without it`)
    const silent =
      unknownExposure === 0
        ? ''
        : ` ${unknownExposure} more ${unknownExposure === 1 ? 'occasion is' : 'occasions are'} left out because nothing in the record says whether it happened.`
    return {
      ...base,
      withheld: `not enough to compare yet — ${short.join(', ')}, and ${MIN_PAIRS} of each is the least this can be said over.${silent}`,
    }
  }

  return { ...base, withheld: undefined }
}

function windowOf(pairs: readonly ChangePair[]): ObservedAssociation['window'] {
  if (pairs.length === 0) return undefined
  const days = pairs.map((pair) => pair.dayId).sort()
  const from = days[0]
  const to = days[days.length - 1]
  return from === undefined || to === undefined ? undefined : { from, to }
}

/**
 * The reading that actually applies to a given moment (D-091).
 *
 * Where two supported bands materially disagree — walks that helped every
 * weekday and helped on no weekend — the whole-record figure describes an
 * evening that never happened, and it is precisely the figure that must not
 * reach a recommendation. So the applicable reading is the band this moment
 * falls in, and if that band is not supported the answer is nothing at all.
 *
 * Where nothing disagrees, the whole record is the honest scope and says so.
 */
export function applicableAssociation(
  found: ObservedAssociation,
  at: Instant,
  zone: TimeZoneId,
): AssociationSide | undefined {
  const block = blockOf(at, zone)
  const here: ChangePair = {
    dayId: localDayIdAt(at, zone),
    from: 0,
    to: 0,
    rose: false,
    at,
    exposure: 'unknown',
    weekend: localDateTimeAt(at, zone).isoWeekday >= 6,
    evening: block === 'evening' || block === 'late-night',
    records: [],
  }

  for (const split of found.splits) {
    if (!split.disagree) continue
    const band = BANDS.find((entry) => entry.id === split.id)
    if (band === undefined) continue
    const side = band.yes(here) ? split.yes : split.no
    return side.supported ? side : undefined
  }

  return found.overall.supported ? found.overall : undefined
}

/**
 * Every action the record can say something about, whether or not it says much.
 *
 * Keyed on the semantic action rather than the verb, so two objects sharing a
 * verb are two entries — which is the whole of D-091's identity invariant.
 * Withheld entries are included deliberately: "nothing to compare yet, four
 * with it and one recorded without" is a report, and hiding it would leave the
 * owner unable to tell the difference between the app having looked and found
 * nothing and the app not having looked.
 */
export function observedAssociations(
  episodes: readonly Episode[],
  view: MemoryView,
  moment: AssociationMoment,
  rejected?: ReadonlyMap<string, Instant>,
): readonly ObservedAssociation[] {
  const targets = new Map<string, ActionTarget>()
  for (const episode of episodes) {
    const target = episode.semantics.target
    if (profileFor(target.verb).affects === undefined) continue
    targets.set(actionScopeOf(target), target)
  }

  const out: ObservedAssociation[] = []
  for (const [scope, target] of targets) {
    const found = associationFor(target, episodes, view, moment, rejected?.get(scope))
    if (found !== undefined) out.push(found)
  }
  return out.sort((a, b) => a.scope.localeCompare(b.scope))
}
