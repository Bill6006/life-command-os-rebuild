import { isUsable } from '../domain/knowledge'
import type { RecommendationSemantics } from '../domain/recommendation'
import { localDayIdAt, type Instant } from '../domain/time'
import { profileFor } from './moves'
import type { Situation } from './situation'

/**
 * When and where, and never invented — AUD-0051.
 *
 * ## The finding
 *
 * Every action template names a verb, an object and sometimes a duration.
 * *"Spend 15 minutes clearing the kitchen."* Two carry a weak cue and the rest
 * carry none, so nothing names a moment, a trigger or a place.
 *
 * The audit calls this *"the best-evidenced single lever available to the
 * product"*: adding an if-then plan specifying **when, where and how**,
 * contingent on a cue, has a mean effect on goal attainment of *d* = 0.65 across
 * 94 independent studies and over 8,000 participants (Gollwitzer & Sheeran,
 * *Advances in Experimental Social Psychology* 38:69–119, 2006). It is also the
 * concrete version of the brief's *"not concrete enough to start"*: the sentence
 * is unambiguous about the action and silent about the moment, **and the moment
 * is where the plan fails**.
 *
 * The research is why a cue is worth having and lives here, in a comment and in
 * the decision log — never on a screen, never as a claim about him, and never
 * deciding a recommendation (§13C). What reaches the owner is a fact from his
 * own record.
 *
 * ## The one rule
 *
 * **An invented or wrong cue is worse than none.** The audit's example is exact:
 * *"when Adaya's in bed"* on an evening she is not there would be a serious
 * error, and it is precisely the confident wrongness section A of the audit is
 * full of. So a cue is composed from a **known** fact, resolved to a label the
 * owner himself supplied, or there is no cue — the sentence stays byte-identical
 * to what it says today, which is the acceptance item.
 *
 * ## The two the app actually has
 *
 * **A boundary ahead of him.** The next commitment window today, where the move
 * fits in the time before it. *"before the school run"* names a moment he will
 * definitely reach, and it is a deadline rather than an instruction.
 *
 * **A move he has just finished.** The audit calls this *"the strongest cue of
 * all, and it is already recorded"*. It is second here rather than first because
 * a boundary names a moment **ahead**; a finished move names one that has
 * already gone, so it can only ever mean *now*.
 *
 * The day block is deliberately not a third. Every sentence already carries the
 * hour through `horizon.ts`, and a cue repeating it would be the app saying the
 * same thing twice in one line.
 *
 * ## And a decline clears it
 *
 * There is nothing to clear. The cue is derived from the situation at the moment
 * of rendering, so a declined move that comes back later is re-rendered against
 * whatever is true then — which is the audit's *"let a decline clear it"* held
 * by there being no state to hold.
 */

/** How recently a finished move can still be the thing this comes after. */
const STILL_JUST_NOW_MINUTES = 180

/**
 * How much room a boundary has to leave before it is worth naming.
 *
 * A move that would use every minute before the school run is not a move to do
 * *before* the school run — it is one the clock is already in the way of, which
 * `time-fit` and the limiter are both about. Naming a deadline he would miss is
 * the confident wrongness this whole finding is about.
 */
const ROOM_TO_SPARE_MINUTES = 5

export interface Cue {
  /** The clause, ready to append. Never composed by a template. */
  readonly clause: string
  /** Which kind it is, so a guard can enumerate what may be said. */
  readonly from: 'a-boundary-ahead' | 'a-move-just-finished'
}

/**
 * The cue for this move, if the record honestly holds one.
 *
 * Returns nothing far more often than it returns something, and that is the
 * design. Every condition below removes a way of naming a moment the owner is
 * not actually going to reach.
 */
export function cueFor(situation: Situation, semantics: RecommendationSemantics): Cue | undefined {
  return boundaryAhead(situation, semantics) ?? justFinished(situation, semantics)
}

/**
 * A commitment window later today, where the move fits before it.
 *
 * `nextObligation` is already the next one that has not started, and
 * `minutesUntilNextObligation` is already the gap. What is added here is the
 * fit: a cue is only honest where doing the thing before that moment is
 * something he could actually do.
 */
function boundaryAhead(situation: Situation, semantics: RecommendationSemantics): Cue | undefined {
  const next = situation.nextObligation
  if (next === undefined) return undefined
  // Started already, so it is not a moment ahead of him.
  if (next.startsAt <= situation.at) return undefined
  // A window that runs past midnight is not a cue for today.
  if (localDayIdAt(next.startsAt, situation.zone) !== situation.dayId) return undefined

  const until = situation.minutesUntilNextObligation
  if (!isUsable(until)) return undefined

  const needs = semantics.target.minutes ?? profileFor(semantics.target.verb).size
  // A move with no natural size has no fit to check, so it gets no cue: the app
  // would be naming a deadline without knowing whether he could meet it.
  if (needs === undefined) return undefined
  if (until.value < needs + ROOM_TO_SPARE_MINUTES) return undefined

  return { clause: `before ${next.label}`, from: 'a-boundary-ahead' }
}

/**
 * Something he finished a moment ago, and it is not this.
 *
 * The strongest cue the audit names, and the narrowest here: within three hours,
 * today, completed rather than merely started, and a different move — *"after
 * your walk"* on the walk itself is the app cueing something off itself.
 */
function justFinished(situation: Situation, semantics: RecommendationSemantics): Cue | undefined {
  const since = (situation.at - STILL_JUST_NOW_MINUTES * 60_000) as Instant
  let latest: { at: Instant; label: string } | undefined

  for (const prior of situation.recentMoves) {
    if (prior.state !== 'completed') continue
    if (prior.at < since || prior.at > situation.at) continue
    if (localDayIdAt(prior.at, situation.zone) !== situation.dayId) continue
    if (prior.semantics.target.object.id === semantics.target.object.id) continue
    const label = situation.entities.labelFor(prior.semantics.target.object)
    // D-018: no name, no sentence. A cue about something the app can no longer
    // name is exactly the vague language section 3 forbids.
    if (label === undefined) continue
    if (latest === undefined || prior.at > latest.at) latest = { at: prior.at, label }
  }

  if (latest === undefined) return undefined
  return { clause: `after ${latest.label}`, from: 'a-move-just-finished' }
}

/*
 * **Nothing here changes the case of a label**, and the first draft did.
 *
 * A cue reads mid-sentence, so lower-casing the first letter looks like the
 * obvious tidy — and it turned *"Adaya's school day"*, which is the owner's own
 * words for it, into *"adaya's school day"* on the screen he reads every
 * morning. Labels come from him already cased the way he wrote them; a walk is
 * *"a walk"* because that is what he called it, and a person's name is a name.
 * D-018's rule about never paraphrasing a rendered thing covers its capitals.
 */
