import { CONCEPT } from './concepts'
import type { ConceptId } from './windows'

/**
 * What a check-in is, when it happens, and how much of it there is — D-285,
 * D-293.
 *
 * It lives in `domain/` for the same reason `schedule.ts` does: the shape of the
 * ritual is a fact about what a check-in *means*, and it is needed above and
 * below the intelligence layer — the engine works out whether one is due, the
 * screen draws it, and the settings panel names the levels. One definition, so a
 * panel offering three check-ins a day and an engine expecting two can never
 * disagree about what the owner chose.
 *
 * Clock-free, like everything else here. A minute-of-day is arithmetic; what
 * time it is now is an argument somebody else supplies.
 */

/**
 * The three moments, in the owner's words for them.
 *
 * They are not `DayBlock`s and must not be confused with them. A block is a
 * decision boundary the whole engine shares — *the evening begins at 18:00 for
 * every purpose the engine has* — and a slot is one scheduled appointment
 * inside a block. The scheduled minutes below sit inside their blocks so that a
 * reading recorded at a check-in lands in the block a later comparison expects,
 * and `blockOf` remains the only thing that says which block that is.
 */
export const CHECK_IN_SLOTS = ['morning', 'midday', 'evening'] as const

export type CheckInSlot = (typeof CHECK_IN_SLOTS)[number]

/**
 * When each one opens, as minutes into the owner-local day.
 *
 * Eight, one and eight: after the morning has actually started, around the
 * middle of the working day, and late enough in the evening that the day has
 * something in it to report. Each sits inside its own `DayBlock` — 08:00 in
 * `morning`, 13:00 in `afternoon`, 20:00 in `evening` — so a reading's block is
 * the one a reader would guess from its hour.
 */
export const CHECK_IN_OPENS_AT: Record<CheckInSlot, number> = {
  morning: 8 * 60,
  midday: 13 * 60,
  evening: 20 * 60,
}

/** What the owner is asked to call it, on screen. */
export const CHECK_IN_SLOT_LABEL: Record<CheckInSlot, string> = {
  morning: 'Morning check-in',
  midday: 'Midday check-in',
  evening: 'Evening check-in',
}

/**
 * How many check-ins a day — D-285's second control, and it is separate from
 * depth on purpose.
 *
 * The owner asked for depth and frequency *"as two separate levels"*, and they
 * answer different questions: how much is asked at once, and how often being
 * asked happens at all. One control combining them would make cutting the
 * interruptions cost him the breadth of every reading, which is the trade he
 * asked to be able to make separately.
 */
export const CHECK_IN_FREQUENCIES = ['three', 'two', 'one'] as const

export type CheckInFrequency = (typeof CHECK_IN_FREQUENCIES)[number]

export function isCheckInFrequency(value: unknown): value is CheckInFrequency {
  return typeof value === 'string' && (CHECK_IN_FREQUENCIES as readonly string[]).includes(value)
}

/**
 * Which slots each frequency keeps.
 *
 * **The morning is the one that never goes**, at any frequency, because it is
 * the only check-in that can read the night and the only one that carries the
 * dimensions D-293 says barely move between lunch and dinner. Dropping it would
 * leave a day with no reading of sleep at all, and sleep is the strongest driver
 * the record already knows about.
 */
export const SLOTS_AT_FREQUENCY: Record<CheckInFrequency, readonly CheckInSlot[]> = {
  three: ['morning', 'midday', 'evening'],
  two: ['morning', 'evening'],
  one: ['morning'],
}

/**
 * How much is asked at each one — D-285's first control.
 *
 * ## The default is `full`, and choosing it was the decision
 *
 * D-285 records the reason in the builder's caution the owner accepted: *"most
 * people never open settings, and the owner will live with the shipped default
 * on exactly the days he is too tired to change it… do not let it be the
 * safe-looking low one."* A builder who ships `fewest` to be kind re-creates the
 * starvation the whole decision exists to end, measured at one question a day.
 *
 * D-293 named the default and it is `full`: thirteen readings in the morning,
 * five at midday and five in the evening. **Twenty-three a day, against the one
 * a new store was asked before this phase.**
 *
 * ## And the levels below it cut from the slow end
 *
 * D-293's own argument for the two check-in sizes is the rule the depths follow:
 * *"asking a slow dimension three times a day does not produce three readings;
 * it produces one reading and two taps the owner stopped thinking about."* So
 * what a shorter check-in loses is the dimensions that barely move, and what it
 * keeps is what a reading at this hour can actually measure.
 */
export const CHECK_IN_DEPTHS = ['full', 'shorter', 'fewest'] as const

export type CheckInDepth = (typeof CHECK_IN_DEPTHS)[number]

export function isCheckInDepth(value: unknown): value is CheckInDepth {
  return typeof value === 'string' && (CHECK_IN_DEPTHS as readonly string[]).includes(value)
}

export interface CheckInSettings {
  readonly depth: CheckInDepth
  readonly frequency: CheckInFrequency
}

/** What the app starts at, not where it stays — D-285, D-293. */
export const DEFAULT_CHECK_IN_SETTINGS: CheckInSettings = { depth: 'full', frequency: 'three' }

/**
 * The five that move within a day, read at every check-in at every depth but
 * the smallest — D-293's own list, in the order the ritual shows them.
 */
const MOVES_WITHIN_A_DAY: readonly ConceptId[] = [
  CONCEPT.mood,
  CONCEPT.irritation,
  CONCEPT.energy,
  CONCEPT.hunger,
  CONCEPT.stress,
]

/** Last night, and only the morning can read it. */
const THE_NIGHT: readonly ConceptId[] = [CONCEPT.sleepHours, CONCEPT.sleepQuality]

/** The ones D-293 says barely move between lunch and dinner. */
const BARELY_MOVES: readonly ConceptId[] = [
  CONCEPT.overwhelm,
  CONCEPT.motivation,
  CONCEPT.confidence,
  CONCEPT.focus,
  CONCEPT.needForCompany,
  CONCEPT.socialEnergy,
]

/**
 * The four the owner named himself, and why `fewest` is exactly them.
 *
 * His first description of the loop, unprompted and before anybody offered him a
 * list: *"sleep? 6 hours, mood? 5 out of 10, irritated? 9/10, hungry?
 * 5/10."* That is the best evidence on record about which readings he would
 * still answer on a day he had cut the check-in to the bone, and it is a
 * quotation rather than a builder's preference — which is the whole reason this
 * level is drawn here and not somewhere that felt balanced.
 *
 * **Energy is not lost by dropping it here**, and that is what having two
 * budgets buys. `energy.current` is `materialToDecision`, so the guide still
 * asks it whenever the answer would change what he is told to do — under its own
 * rule, out of its own count. The check-in giving something up does not blind
 * the app to it.
 */
const HE_NAMED_THESE: readonly ConceptId[] = [CONCEPT.mood, CONCEPT.irritation, CONCEPT.hunger]

/**
 * What one check-in asks, given the slot and the depth.
 *
 * Always in the catalogue's order, so a shorter check-in reads as the same
 * ritual with less of it rather than as a different screen.
 */
export function readingsAt(slot: CheckInSlot, depth: CheckInDepth): readonly ConceptId[] {
  const morning = slot === 'morning'
  switch (depth) {
    case 'full':
      // D-293's default, exactly: thirteen and five.
      return morning ? [...MOVES_WITHIN_A_DAY, ...THE_NIGHT, ...BARELY_MOVES] : MOVES_WITHIN_A_DAY
    case 'shorter':
      // Everything that moves within a day, plus the night. Seven and five.
      return morning ? [...MOVES_WITHIN_A_DAY, ...THE_NIGHT] : MOVES_WITHIN_A_DAY
    case 'fewest':
      // The four he named himself. Five and three.
      return morning ? [...HE_NAMED_THESE, ...THE_NIGHT] : HE_NAMED_THESE
  }
}

/**
 * How many readings a whole day of check-ins asks for, at a given setting.
 *
 * The number the settings control puts beside each level, so the trade is a
 * figure the owner can compare rather than an adjective he has to interpret.
 */
export function readingsPerDay(settings: CheckInSettings): number {
  return SLOTS_AT_FREQUENCY[settings.frequency].reduce(
    (total, slot) => total + readingsAt(slot, settings.depth).length,
    0,
  )
}

/**
 * When a slot stops being the one that is due: when the next one opens, and at
 * the end of the day for the last.
 *
 * **A missed check-in is missed, and nothing is inferred from it** (G-009). This
 * window is only about which check-in the app is currently offering; a slot that
 * closes unanswered writes nothing at all, and no value is back-filled into it
 * later from the readings either side.
 */
function checkInWindow(
  slot: CheckInSlot,
  frequency: CheckInFrequency,
): { readonly opensAt: number; readonly closesAt: number } | undefined {
  const slots = SLOTS_AT_FREQUENCY[frequency]
  const index = slots.indexOf(slot)
  if (index === -1) return undefined
  const next = slots[index + 1]
  return {
    opensAt: CHECK_IN_OPENS_AT[slot],
    closesAt: next === undefined ? 24 * 60 : CHECK_IN_OPENS_AT[next],
  }
}

/** Which check-in a given minute of the owner's day falls inside, if any. */
export function slotAtMinute(minute: number, frequency: CheckInFrequency): CheckInSlot | undefined {
  for (const slot of SLOTS_AT_FREQUENCY[frequency]) {
    const window = checkInWindow(slot, frequency)
    if (window === undefined) continue
    if (minute >= window.opensAt && minute < window.closesAt) return slot
  }
  return undefined
}
