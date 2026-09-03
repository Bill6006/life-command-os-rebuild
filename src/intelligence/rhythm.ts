import { confidence, inferred, unknown, type Knowledge } from '../domain/knowledge'
import type { RecordId } from '../domain/ids'
import type { WeekLoad } from '../domain/records'
import {
  addLocalDays,
  isoWeekdayOfDayId,
  localDayIdAt,
  type Instant,
  type IsoWeekday,
  type TimeZoneId,
} from '../domain/time'
import type { Episode } from './lifecycle'
import { profileFor } from './moves'

/**
 * A Tuesday is not a Saturday, and a heavy week is a heavy week — AUD-0007.
 *
 * ## The finding
 *
 * `similarity()` compared five coarse features: block, strain, a **`weekend`
 * boolean**, whether his daughter was there, and how many minutes he had. The
 * canonical plan's section 16 lists ten candidate factors and five were missing
 * — and the five missing are exactly the ones that would tell a light week from
 * a heavy one. The audit's own reproduction is three evenings six days apart,
 * one working and two weekend, producing the identical recommendation and the
 * identical explanation: *"Go back over subnetting — the part you keep
 * missing."*
 *
 * The brief's question — *does anything model "this is a bad week" or "this is
 * a heavy season"?* — answered **no**. The app could **tell** the owner a
 * season had changed and could not **reason** differently inside one.
 *
 * ## What this adds, and what it deliberately does not
 *
 * Two features, both derivable from what the record already holds, and **no new
 * owner input**:
 *
 * - **`dayOfWeek`**, so a Tuesday resembles a Tuesday more than it resembles a
 *   Saturday rather than all five weekdays collapsing into one boolean;
 * - **`load`**, a coarse three-level reading of the last seven days built from
 *   sleep shortfall, how many effortful moves were actually completed, and how
 *   many times he said he could not.
 *
 * Neither is a score about him. `load` names what it counted every time it is
 * rendered, and three levels is the resolution a person speaks in about a week —
 * it has been a heavy one, an ordinary one, or a light one.
 *
 * ## Why the weights are low, and why that is the finding rather than a hedge
 *
 * AUD-0007's stated risk is the one that matters: *"every added feature narrows
 * the comparable set, and the set is already often empty."* Two more features at
 * the weight of `block` would make "evenings like this one" mean *this exact
 * evening*, and the app would go back to saying **"Nothing in the record is much
 * like tonight yet · 0 occasions"** — the failure it is trying to repair,
 * arriving from the other side.
 *
 * So both are weight 0.5 against `block` and `strain` at 2, and
 * `tests/synthetic/rhythm-and-load.test.ts` asserts that comparable-set sizes do
 * not fall on the nine-month history.
 *
 * ## And an old record compares as unknown, never as agreement
 *
 * G-009's rule, and the reason this can ship at all. A recommendation written
 * before this phase carries neither field, and `knownMatch` answers 0.5 for a
 * missing one — *not a mismatch, and not a match either*. A record from March
 * does not suddenly resemble every Tuesday because nobody wrote its weekday
 * down.
 *
 * ## Where the sleep figure comes from, and why it is not computed here
 *
 * The shortfall arrives already measured. What counts as a full night is
 * `SLEEP_BASELINE_HOURS`, which lives beside the limiter that reads it, and a
 * second copy of that number here is precisely how two parts of one app come to
 * disagree about the same evening (AUD-0003's shape). This file classifies a
 * week; it does not decide what a night is.
 */

/*
 * The vocabulary itself is `domain/records.ts`'s, because it is stored on a
 * `DecisionContext` and has to mean the same thing next year as it does today.
 * What this file owns is which of the three a week was.
 */
export type { WeekLoad }

/** The span `load` reads. Seven days is "this week" as a person means it. */
export const LOAD_WINDOW_DAYS = 7

/** Rest already measured against the working baseline, over the load window. */
export interface RestOverWindow {
  readonly shortfallHours: number
  readonly nightsSeen: number
  readonly basis: readonly RecordId[]
}

/**
 * What the reading counted, carried so the sentence can name it.
 *
 * Section 22's rule about invented precision cuts both ways: a coarse level is
 * honest, and a coarse level with nothing behind it is a mood. Every figure here
 * is a count of rows in the record, and the copy that renders the level cites
 * them rather than asserting that a week was hard.
 */
export interface LoadEvidence {
  /** Hours short of the working baseline across the window. */
  readonly sleepShortfallHours: number
  /** Nights that contributed to that figure. */
  readonly nightsSeen: number
  /** Effortful moves the owner actually completed. */
  readonly effortfulDone: number
  /** Times he said he could not, whatever the move. */
  readonly couldNot: number
  readonly basis: readonly RecordId[]
}

export interface WeekLoadReading {
  readonly load: Knowledge<WeekLoad>
  readonly evidence: LoadEvidence
}

/**
 * The thresholds, written down rather than tuned into the arithmetic.
 *
 * Deliberately generous about calling a week heavy and stingy about calling one
 * light: *"this has been a heavy week"* is the humane sentence AUD-0007 says the
 * app cannot currently say, and *"the week has been light"* is one the owner
 * would resent being told on a week that did not feel light. So `heavy` needs
 * one strong signal and `light` needs the absence of every one of them.
 */
export const HEAVY_SHORTFALL_HOURS = 5
export const HEAVY_REFUSALS = 3
export const BUSY_EFFORTFUL_MOVES = 5
export const LIGHT_SHORTFALL_HOURS = 2

/**
 * How the week has gone, from what the record already holds.
 *
 * **Unknown when nothing speaks to it.** An empty week is not a light one —
 * G-009 — and a history the app has just been handed says nothing at all about
 * whether the last seven days were hard. That case returns `never-observed`, and
 * every consumer is written to cope with not knowing rather than being handed
 * "ordinary".
 */
export function readWeekLoad(
  rest: RestOverWindow,
  episodes: readonly Episode[],
  moment: { readonly now: Instant; readonly zone: TimeZoneId },
): WeekLoadReading {
  const from = addLocalDays(moment.now, -LOAD_WINDOW_DAYS, moment.zone)
  const basis: RecordId[] = [...rest.basis]

  let effortfulDone = 0
  let couldNot = 0
  let latest: Instant | undefined
  for (const episode of episodes) {
    const at = episode.settledAt
    if (at === undefined) continue
    if (at < from || at > moment.now) continue
    if (episode.state === 'completed') {
      if (profileFor(episode.semantics.target.verb).demand !== 'effortful') continue
      effortfulDone += 1
    } else if (episode.state === 'unable-now') {
      couldNot += 1
    } else {
      continue
    }
    basis.push(episode.recommendation)
    if (latest === undefined || at > latest) latest = at
  }

  const evidence: LoadEvidence = {
    sleepShortfallHours: Math.round(rest.shortfallHours * 10) / 10,
    nightsSeen: rest.nightsSeen,
    effortfulDone,
    couldNot,
    basis,
  }

  if (rest.nightsSeen === 0 && effortfulDone === 0 && couldNot === 0) {
    return {
      load: unknown('never-observed', 'nothing recorded in the last seven days'),
      evidence,
    }
  }

  /*
   * The level, from the three counts, in one place a reader can argue with.
   *
   * A week is heavy when the body is carrying a real shortfall, **or** when he
   * has repeatedly said he could not, **or** when he has been through a great
   * many effortful things. The third arm is the one worth defending: a week with
   * six labs and no sleep debt is still a heavy week, and treating "heavy" as a
   * synonym for "slept badly" would collapse this back into `strain`, which
   * already exists and already decides.
   */
  const heavy =
    evidence.sleepShortfallHours >= HEAVY_SHORTFALL_HOURS ||
    couldNot >= HEAVY_REFUSALS ||
    effortfulDone >= BUSY_EFFORTFUL_MOVES
  const light =
    !heavy &&
    evidence.sleepShortfallHours <= LIGHT_SHORTFALL_HOURS &&
    couldNot === 0 &&
    rest.nightsSeen > 0
  const load: WeekLoad = heavy ? 'heavy' : light ? 'light' : 'ordinary'

  return {
    load: inferred(
      load,
      latest ?? moment.now,
      // Follows how much of the week the record actually covers, and nothing
      // else. Two nights and one move is a reading; seven nights is a better
      // one.
      confidence(Math.min(0.8, 0.25 + 0.08 * (rest.nightsSeen + effortfulDone + couldNot))),
      basis,
    ),
    evidence,
  }
}

/**
 * The week's load in the owner's own register, or nothing.
 *
 * ## One sentence, and only the heavy one
 *
 * AUD-0007 asks for exactly one thing to be said out loud: *"the app gains the
 * ability to say the single most humane thing it currently cannot: that this
 * week has been hard and that is why it is asking for less."* So `heavy`
 * produces a sentence and the other two produce nothing at all.
 *
 * **"The week" rather than "this week"**, and the difference is G-001's guard
 * rather than taste. A bare demonstrative is a subject the reader has to supply
 * from context, and every card on Insights is read on its own — the audit wrote
 * the sentence as prose in a document, where the week was already the subject of
 * the paragraph above it. On a card it has to carry its own noun.
 *
 * **A light week is deliberately silent**, and that is the same discipline as
 * D-187's: a reading the app holds is not automatically a reading it announces.
 * *"The week has been light"* is not news, it is not useful, and a card that
 * appears every seven days saying so is the life-administration noise section 65
 * exists to prevent — it would teach the owner to stop reading the surface it
 * appears on. The light reading still does its work: it is a comparison feature
 * on {@link DecisionContext}, so a light week resembles other light weeks
 * whether or not anything is ever said about it.
 *
 * ## Never causal, and never a verdict
 *
 * *"About three hours short of rest, and twice you could not"* is a description
 * of the record. *"You are burnt out"* is a claim about a man, and section 4.4
 * forbids it. The count travels separately — {@link describeWeekLoadCount} — so
 * that the sentence itself stays the plain one the audit asked for and the
 * arithmetic sits underneath it where it can be argued with.
 */
export function describeWeekLoad(load: WeekLoad, evidence: LoadEvidence): string | undefined {
  if (load !== 'heavy') return undefined
  const parts: string[] = []
  if (evidence.sleepShortfallHours >= 1) {
    parts.push(`${describeShortfall(evidence.sleepShortfallHours)} short of rest`)
  }
  if (evidence.couldNot > 0) {
    parts.push(`${evidence.couldNot} ${evidence.couldNot === 1 ? 'time' : 'times'} you could not`)
  }
  if (parts.length === 0) return 'The week has been a heavy one.'
  return `The week has been a heavy one — ${joinClauses(parts)}.`
}

/**
 * Everything the reading counted, as one line under the sentence.
 *
 * Section 51's rule that a figure names what it measures, applied to three of
 * them at once. Each is a count of rows in the record and none of them is a
 * score: the owner can check every one against his own Timeline, which is what
 * makes the sentence above something he can disagree with.
 */
export function describeWeekLoadCount(evidence: LoadEvidence): string {
  const nights = `${evidence.nightsSeen} ${evidence.nightsSeen === 1 ? 'night' : 'nights'} of sleep recorded`
  const done =
    evidence.effortfulDone === 1
      ? '1 demanding move finished'
      : `${evidence.effortfulDone} demanding moves finished`
  const could =
    evidence.couldNot === 1
      ? 'once you said you could not'
      : `${evidence.couldNot} times you said you could not`
  return `Across the last seven days: ${nights}, ${done}, ${could}.`
}

function describeShortfall(hours: number): string {
  const rounded = Math.round(hours)
  if (rounded <= 1) return 'about an hour'
  return `about ${rounded} hours`
}

function joinClauses(parts: readonly string[]): string {
  if (parts.length === 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

/** The weekday a decision happened on, for the comparison. */
export function weekdayOf(at: Instant, zone: TimeZoneId): IsoWeekday {
  return isoWeekdayOfDayId(localDayIdAt(at, zone))
}
