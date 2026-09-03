import { isUsable, type Knowledge } from '../domain/knowledge'

/**
 * Recovery as a run of nights rather than a nightly re-guess — AUD-0009, C8.
 *
 * ## The finding
 *
 * With strain severe, the app proposed exactly one move for tonight — *"Take
 * tonight as recovery — no subnetting session"* — and the next evening
 * re-derived it from scratch. **Nothing recorded that a recovery had been
 * begun, and nothing tracked a multi-night deficit being repaid.**
 *
 * The audit's framing is the one that matters, and it is the whole of what this
 * file does:
 *
 * > **What the owner's own record says** is that he is 9 hours down over three
 * > nights; **what the research says in general** is that one night will not
 * > clear that; **what the system should infer by combining them** is a
 * > two-or-three-night plan, not a nightly re-guess.
 *
 * ## Where the span comes from, and where it does not
 *
 * **From his own record.** The number of nights is arithmetic over the
 * shortfall he reported, and nothing else. That matters because §13C is
 * explicit that a research prior *"may not determine recommendations"* — so the
 * research is what justifies building a run at all (it is in this comment, and
 * in the decision log, which is where the codebase has always put it), and the
 * owner's own hours are what decide how long one is.
 *
 * Nothing on any screen cites a study, and nothing predicts what the run will
 * do for him. *"Two quiet nights would clear most of this"* is a forecast about
 * a body, section 4.4 and D-038 both refuse it, and §6.5 puts forecasting
 * outside this phase entirely. What the app says is what it counted.
 *
 * ## Why two or three and never more
 *
 * A bound rather than a formula. A shortfall of thirty hours does not imply a
 * ten-night plan — it implies a man in trouble, and a ten-night plan is the
 * nagging AUD-0020 names as its own biggest risk. Three is also the number
 * `recovery-run` has always used and the number D-070 uses for a growth ladder,
 * so a run is never a new claim about how many occasions make a course.
 *
 * ## And how the night went finally decides something
 *
 * Eight hours of broken sleep is not eight hours of rest. `assessStrain` reads
 * sleep quality directly (D-271, DEF-0156), and it reaches the span here as
 * well: a run of poor nights is a longer run than the hours alone would ask
 * for. That is the reader the registry has been carrying a note about since
 * routing 92.
 */

/**
 * One night's worth of shortfall.
 *
 * A bad night is roughly two hours under the working baseline, so this is the
 * line between *"last night was short"* and *"this is more than one night's
 * worth"* — which is exactly where AUD-0009 says a run starts to be the honest
 * shape.
 */
export const ONE_NIGHT_SHORT_HOURS = 2

/** Above this, the shortfall is deep enough that two nights is not the answer. */
export const DEEP_SHORTFALL_HOURS = 6

/** A night he would call bad. The same end of the same scale `assessStrain` reads. */
export const POOR_NIGHT = 0.3

export const SHORTEST_RUN = 2
export const LONGEST_RUN = 3

/**
 * How many quiet nights the record implies, or nothing.
 *
 * `undefined` where one night is the honest answer — a single short night is a
 * single short night, and offering a plan for it would be the app making a
 * course out of a Tuesday.
 *
 * **Unknown is not a run.** A shortfall the app cannot read produces no span at
 * all rather than a default one (G-009): a plan the owner is offered has to rest
 * on something he told the app.
 */
export function nightsToRepay(
  debtHours: Knowledge<number>,
  quality: Knowledge<number>,
): number | undefined {
  if (!isUsable(debtHours)) return undefined
  if (debtHours.value < ONE_NIGHT_SHORT_HOURS) return undefined
  const deep = debtHours.value >= DEEP_SHORTFALL_HOURS
  const poor = isUsable(quality) && quality.value <= POOR_NIGHT
  return deep || poor ? LONGEST_RUN : SHORTEST_RUN
}

/**
 * The span, in the words a person uses for a small count.
 *
 * Words rather than digits for the same reason `describeThreadPosition` uses
 * them: these are small counts inside a sentence, and "a run of 3 recovery
 * nights" reads as a form field (section 4.6).
 */
export function describeNights(count: number): string {
  switch (count) {
    case 1:
      return 'one quiet night'
    case 2:
      return 'two quiet nights'
    case 3:
      return 'three quiet nights'
    default:
      return `${count} quiet nights`
  }
}

/**
 * What the app offers, with the span in it.
 *
 * The generic offer was *"Make this a run of recovery nights?"* — a course of
 * unstated length, which is the one thing a plan may not be if the owner is
 * meant to agree to it knowing what he is agreeing to. This names the number
 * before he taps, and the number came from his own hours.
 */
export function describeRecoveryOffer(nights: number): string {
  return `Make this ${describeNights(nights)} in a row?`
}
