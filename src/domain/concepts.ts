import { DOMAIN, type LifeDomainId } from './domains'
import type { AskPolicy } from './knowledge'
import type { PrivacyClass } from './privacy'
import type { ProvenanceSource } from './records'
import {
  conceptId,
  freshnessWindow,
  type ConceptId,
  type FreshnessHorizon,
  type FreshnessWindow,
} from './windows'

/**
 * Concepts — the things the system can know about (canonical plan section 8).
 *
 * "Freshness is concept-specific, not one universal number of days." Current
 * sleep goes stale overnight. A custody arrangement does not go stale at all.
 * Putting the horizon on the concept rather than in a global constant is what
 * makes that true, and putting the ask policy beside it is what stops the app
 * asking about something it already knows or does not need.
 *
 * This is a starting registry, not a catalogue of everything the product will
 * ever track. Section 4.5 — do not collect data merely because a field exists.
 */

/**
 * How much a reading of this concept, from this source, is worth (D-059).
 *
 * 0–1, and it is one number answering one question: **how far should a reading
 * from here move what we believe about this?** The fact layer spends it as the
 * confidence of an inference; `learning.ts` spends it as a term in the weight
 * of an outcome. Both are the same question, so both read the same table.
 *
 * The owner's decision is that there is **no standing hierarchy of sources**. A
 * watch measuring hours slept may beat his recollection of hours slept; a
 * financial record of a balance may beat his estimate of it; a model's guess at
 * how he feels should be weaker than him saying how he feels. Ranking by source
 * alone is the mistake section 8 already forbids one layer down — "freshness is
 * concept-specific, not one universal number of days" is the identical argument
 * about a different property.
 *
 * **What this never decides.** Reliability governs how far a reading moves a
 * belief. It never governs whether the reading may pass itself off as something
 * it is not: a derived or model reading resolves to `inferred` however reliable
 * it is, and its provenance stays visible everywhere it surfaces (D-014).
 */
export type SourceReliability = Partial<Record<ProvenanceSource, number>>

/**
 * What a source is worth when a concept has nothing particular to say.
 *
 * Deliberately conservative, and deliberately not a ranking anyone should read
 * meaning into: it is the fallback for concepts nobody has thought about yet,
 * and any concept with a reason may override any entry.
 *
 * `synthetic` sits with the owner because a fixture stands in for whatever it
 * describes. Discounting it would make every scenario in the laboratory learn
 * more slowly than the running app, so the QA lab would stop demonstrating the
 * product. `legacy-import` is low for a different reason: section 30 keeps
 * imported history from silently driving decisions, and this is the second
 * fence rather than the first.
 */
export const DEFAULT_SOURCE_RELIABILITY: Record<ProvenanceSource, number> = {
  owner: 1,
  synthetic: 1,
  device: 0.8,
  derived: 0.6,
  model: 0.35,
  'legacy-import': 0.5,
}

export interface ConceptDefinition {
  readonly id: ConceptId
  readonly label: string
  readonly domain: LifeDomainId
  readonly freshness: FreshnessHorizon
  readonly privacy: PrivacyClass
  readonly ask: AskPolicy
  /**
   * What a reading of this is used *for*, in the words the owner reads —
   * AUD-0040.
   *
   * The fact ledger prints "… — for whether she is here today" under each row,
   * and until this field existed the sentence lived in `assembleSituation`
   * beside a hand-written read. That is the asymmetry AUD-0040 is about: adding
   * a concept to this registry was cheap and giving it a *read* was a code
   * change, so eleven domains had pages and seven had brains. Moving the
   * purpose here is what lets the situation walk the registry instead of a
   * list, and it is why a new concept is now visible to the brain the moment it
   * is registered rather than when somebody remembers to add a line.
   *
   * **`{when}` is substituted with the stretch of day being decided.** A
   * purpose that names an hour has to name the right one — AUD-0002's rule
   * about owner-facing strings, arriving in the one place that was exempt from
   * it because it was not a string anybody thought of as owner-facing.
   * `tests/unit/registries.test.ts` fails the build on an unsubstituted
   * placeholder, and on a purpose that reads as a label rather than as a use.
   */
  readonly purpose: string
  /**
   * Whether losing this reading means the area is less understood (section 8).
   *
   * The coverage engine tracks "meaningful sub-areas", and most of what the
   * guide asks about is not one. "How much time have you got tonight?" goes
   * stale every four hours by design and says nothing whatever about the
   * owner's career; a week of not answering it is not neglect, it is Tuesday.
   * Counting it would put every domain permanently in the red and teach the
   * owner to ignore the one signal section 63 exists to give him.
   *
   * A standing concept is one where a gap is a gap: what he is studying, what
   * the house is like, what the money situation is, how he has been sleeping.
   *
   * **The default is false**, so a new concept contributes nothing to coverage
   * until somebody decides it should — section 4.5, applied to the registry
   * itself.
   */
  readonly standing?: boolean
  /**
   * Whether a run of readings of this is worth reporting over time (D-089).
   *
   * **A different question from `standing`, and conflating them was QA-A1's
   * smaller half.** `standing` asks whether a gap here is a gap in the app's
   * understanding of an area, and it is deliberately false for everything the
   * owner reports about right now: energy goes stale in six hours by design,
   * and counting it as coverage would put every domain permanently in the red
   * (D-061). Insights' trajectory card then gated on `standing`, which meant
   * **no subjective dimension the owner can actually report could produce a
   * trend or be learned from at all** — they were collected, spent as
   * similarity features, and never read as evidence.
   *
   * So this asks the question that was actually being asked: is a series of
   * these readings a thing worth showing the owner, and worth comparing before
   * and after an action? True for how he feels and how he slept; false for how
   * much time he has tonight, which is noise with a timestamp.
   *
   * **It names the shape, because it is a claim that has to be satisfiable
   * (R3-B3).** It was a boolean, and `emotionalState` carried it while its
   * readings are free text — which `numericValue` discards before any scale,
   * direction, trajectory or before-and-after comparison exists. So the concept
   * was declared tracked, said to participate, and could not: nothing checked
   * that the machinery could read what the concept actually holds.
   *
   * Saying *how* a reading becomes a number is what makes the claim checkable.
   * A concept whose values cannot be read as a number is not a dimension that
   * can be tracked, whatever anyone writes in the registry, and
   * `tests/unit/registries.test.ts` now fails the build for the mismatch.
   *
   * Absent, for the same reason `standing`'s default is false: a new concept
   * earns a place on a surface by somebody deciding it should have one.
   */
  readonly tracked?: TrackedReading
  /**
   * Whether being wrong about this is worse than asking about it — D-111.
   *
   * The share rule in `guide.ts` measures the fraction of a question's answers
   * that would switch the decision. The *value* of a question is the expected
   * reduction in loss, which depends on how bad it is to be wrong, and those two
   * diverge exactly where it matters: on the default history the app's own probe
   * read *"3 of 4 could change the answer, and none on enough of their answers
   * to be worth a tap"*, and it then recommended a 25-minute walk to a man it
   * had not asked about pain. One in three answers to "anything sore?" stops it.
   * A one-in-three chance of prescribing exertion to someone who is quite sore
   * is worth one tap.
   *
   * **Narrow, and the narrowness is the decision.** It applies to concepts
   * marked here rather than to any question that feels important; it applies
   * only when an answer would flip the recommendation toward *less* action, so
   * it is never a licence to ask in order to justify doing more; and the daily
   * cap is unchanged. D-036's share rule remains the default for everything
   * else, and its regression remains in force.
   *
   * Two concepts qualify today, and both for the same reason: the app cannot
   * infer either from how he seems. Nothing measures whether a shoulder hurts,
   * and self-rated sleepiness under-reports the impairment of chronic sleep
   * restriction (Van Dongen et al., *Sleep* 26(2):117–126, 2003).
   */
  readonly consequential?: boolean
  /**
   * Where this concept disagrees with the default table, and why.
   *
   * Absent means the defaults are fine. An entry here is a claim about this
   * concept that somebody had to defend, which is the point of putting it
   * beside `freshness` rather than in a global ladder.
   */
  readonly reliability?: SourceReliability
  /**
   * Whether the app works this out rather than being told it — QA-82-001.
   *
   * No record ever carries a derived concept. `assembleSituation` computes it
   * from concepts that *are* recorded, plus whatever else the situation knows,
   * and hands it to the surfaces along with everything else the decision read.
   *
   * **It exists so that a reading and the record under it can stop pretending
   * to be one thing.** The custody arrangement answers whose day it is; a
   * school day answers whether she is in the room; and while those were one
   * concept, every surface that walks this registry — the fact ledger, the
   * domain page, the export — printed the standing arrangement as the answer
   * to *is she here right now*, which was false for six and a half hours of
   * every weekday.
   *
   * Three things follow from the flag, and each is a rule somewhere else:
   *
   * - **Never asked.** There is no question spec, and `guide.ts` cannot ask
   *   what has none. The owner cannot answer a conclusion on the app's behalf.
   * - **Never counted as coverage.** Nothing writes a record for it, so
   *   measuring how long it has been since one would report permanent neglect
   *   of a fact the owner has no way to supply — DEF-0015's failure, arriving
   *   from a new direction (`coverage.ts`).
   * - **Never corrected directly.** The domain page shows it read-only and
   *   points at the fact it rests on, because a correction typed here would
   *   read as changing the arrangement and would write a record nothing reads.
   */
  readonly derived?: boolean
}

/**
 * How a reading of a tracked concept becomes a number.
 *
 * Exactly the value shapes `numericValue` can read. A scale carries its own
 * top, so 4-of-5 and 8-of-10 are the same reading; a number and a duration are
 * already quantities. Text and an entity reference are neither, and a concept
 * that holds one of those is not a dimension with a scale and a direction — it
 * is something the owner says, which is a different and equally real thing.
 */
export type TrackedReading = 'scale' | 'number' | 'duration'

const HOURS = 3_600_000

function elapsedHours(hours: number): FreshnessHorizon {
  return { unit: 'elapsed', ms: hours * HOURS }
}

function localDays(days: number): FreshnessHorizon {
  return { unit: 'local-days', days }
}

const DURABLE: FreshnessHorizon = { unit: 'durable' }

/**
 * True of the local day it was recorded on, rather than for N hours — AUD-0005.
 *
 * The night that has just ended is the same night at ten in the morning as it
 * was at half past six. It stops being the answer when the next night has
 * happened, and the next night is on the other side of midnight.
 */
const THIS_LOCAL_DAY: FreshnessHorizon = { unit: 'this-local-day' }

/** True of the part of the day it was recorded in, and gone at its boundary. */
const THIS_BLOCK: FreshnessHorizon = { unit: 'this-block' }

export const CONCEPT = {
  sleepHours: conceptId('sleep.hours-last-night'),
  sleepQuality: conceptId('sleep.quality-last-night'),
  energy: conceptId('energy.current'),
  soreness: conceptId('health.soreness'),
  /**
   * Whether a child is with the owner. Scenario G-002 lives on this concept:
   * a durable arrangement answers it indefinitely, and a temporary exception
   * such as travel overrides it for a window without erasing it.
   */
  childPresent: conceptId('family.child-present'),
  /** Worked out, never recorded — see `ConceptDefinition.derived`. */
  childHere: conceptId('family.child-here-now'),
  custodyArrangement: conceptId('family.custody-arrangement'),
  learningTopic: conceptId('career.current-learning-topic'),
  usableTimeTonight: conceptId('career.usable-time-tonight'),
  cashBuffer: conceptId('money.cash-buffer-state'),
  socialEnergy: conceptId('social.energy'),
  homeFriction: conceptId('home.friction'),
  privatePattern: conceptId('private-health.recent-pattern'),
  weeklyFocus: conceptId('direction.weekly-focus'),
  emotionalState: conceptId('emotional.current-state'),
  faithPractice: conceptId('faith.practice-recent'),
}

export const CORE_CONCEPTS: readonly ConceptDefinition[] = [
  {
    id: CONCEPT.sleepHours,
    purpose: 'how much sleep last night',
    label: 'Hours slept last night',
    domain: DOMAIN.sleep,
    /*
     * AUD-0005, and the reproduction that named it: at 06:30 the situation line
     * read "Wednesday early morning, 8 hours of sleep"; at 10:00 the same day it
     * read "Wednesday morning". Same value, same night, and the app had lost its
     * best morning fact at the hour it most needed it — which is what left the
     * morning with a named recovery limiter and no recovery move (AUD-0003).
     *
     * `local-days: 1` counted forward from whenever the reading happened to be
     * taken. This is true of the day it describes, which is what the concept
     * actually is.
     */
    freshness: THIS_LOCAL_DAY,
    standing: true,
    tracked: 'number',
    privacy: 'normal',
    ask: { materialToDecision: true, askWhenStale: true },
    // Recommending effort to someone severely short of rest — D-111.
    consequential: true,
    /*
     * The case D-059 is named for, and the one place the owner is outranked.
     *
     * A watch measures a duration. A person estimates the moment they fell
     * asleep, which is by definition the one moment of the night they were not
     * awake for — so a morning recollection is a reconstruction of a boundary
     * rather than a reading of a quantity. It is still good evidence, and it is
     * not the better of the two.
     *
     * `derived` is high here because deriving a night's sleep is arithmetic
     * over a measured quantity rather than a guess about a person. That is the
     * number the morning-after sleep matcher spends, and it is high for that
     * reason and not because derived evidence is generally trustworthy — see
     * `energy` immediately below, where the same source is worth half as much.
     */
    reliability: { device: 1, owner: 0.85, derived: 0.8, model: 0.3 },
  },
  {
    id: CONCEPT.sleepQuality,
    purpose: 'how the night actually went',
    label: 'Sleep quality last night',
    domain: DOMAIN.sleep,
    // The same night, and therefore the same window as the hours it describes.
    freshness: THIS_LOCAL_DAY,
    tracked: 'scale',
    privacy: 'normal',
    /*
     * A fifth wrong declaration, found by measuring rather than by reading —
     * AUD-0041.
     *
     * The audit enumerated the registry by hand and found four. Re-running the
     * decision with and without each reading, on every history in the library,
     * found this one too: **nothing anywhere reads sleep quality.** The hours
     * are read by `assembleCapacity` and drive the whole recovery model; how
     * the night *felt* is collected, shown, trended on Insights, and consulted
     * by no generator, no dimension and no filter.
     *
     * It is not corrected by inventing a reader. What it honestly is today is a
     * reading the owner gives and the app reports back to him over time, which
     * is a real thing for a concept to be — `tracked: 'scale'` is the claim
     * that is true of it — and this flag is the claim that was not. Saying so
     * also stops the app spending a daily question on it: `shouldAsk` gates on
     * this field, so the guide was entitled to ask about a reading that could
     * not change anything it does.
     *
     * The reader belongs with AUD-0009's recovery work, which is routing 93's,
     * and this flag is what will have to change back when it lands.
     */
    ask: { materialToDecision: false, askWhenStale: true },
    // How a night *felt* is the owner's to report. A watch scoring it is
    // inferring an experience from movement, which is the weaker claim — the
    // opposite ordering to hours slept, on the same device, in the same domain.
    reliability: { owner: 1, device: 0.6, derived: 0.45, model: 0.25 },
  },
  {
    id: CONCEPT.energy,
    purpose: 'how much is left today',
    label: 'Current energy',
    domain: DOMAIN.health,
    freshness: elapsedHours(6),
    tracked: 'scale',
    privacy: 'normal',
    ask: { materialToDecision: true, askWhenStale: true },
    // "A model's inference about how he feels should generally be weaker than
    // him saying how he feels" — D-059, almost word for word. A readiness score
    // is a proxy for a thing the owner can simply be asked.
    reliability: { owner: 1, device: 0.5, derived: 0.4, model: 0.2 },
  },
  {
    id: CONCEPT.soreness,
    purpose: 'whether the body is asking for a break',
    label: 'Soreness or pain',
    domain: DOMAIN.health,
    freshness: elapsedHours(12),
    tracked: 'scale',
    privacy: 'normal',
    ask: { materialToDecision: true, askWhenStale: true },
    // Recommending exertion to a body in pain — D-111, and the case it is
    // named for. This is the single most likely way the app gives genuinely
    // bad advice.
    consequential: true,
    // Nothing measures whether a shoulder hurts.
    reliability: { owner: 1, device: 0.35, derived: 0.3, model: 0.2 },
  },
  {
    id: CONCEPT.childPresent,
    purpose: 'whether she is in your care {when}',
    /*
     * What the record stores, said in the words it stores it in — QA-82-001.
     *
     * This was "Child with the owner", and the guide asks it as *"Is Adaya with
     * you today?"* — both of which are about the day. What the app then did
     * with the answer was treat it as a claim about the room, and the label was
     * how that reading reached every generic surface: the fact ledger and the
     * Fatherhood page printed "Child with the owner — yes" at ten past ten on a
     * Wednesday, beside a school day the same screen showed running until three.
     *
     * "In the owner's care" is the answer the owner actually gave. She is in
     * his care all day on a day that is his, including the hours she spends at
     * school, and that is what makes the record durable and never worth
     * re-asking. Whether she is in the room is {@link CONCEPT.childHere}.
     */
    label: 'Child in the owner’s care today',
    domain: DOMAIN.fatherhood,
    // A one-off observation of tonight is good for tonight. The standing
    // answer comes from a durable context record, whose currency is its own
    // validity window rather than a clock — which is what stops the app asking
    // about a settled arrangement every evening (G-002).
    freshness: localDays(1),
    privacy: 'child-family-sensitive',
    ask: { materialToDecision: true, askWhenStale: true },
    reliability: { owner: 1, device: 0.4, derived: 0.5, model: 0.15 },
  },
  {
    id: CONCEPT.childHere,
    purpose: 'whether she is in the room {when}',
    /*
     * The other half of the same question, and the reason it is a second row
     * rather than a better sentence on the first — QA-82-001.
     *
     * A person reading the Fatherhood page is entitled to both answers: the
     * arrangement he gave, which he can correct, and the reading the app is
     * actually deciding on, which he cannot — it is a conclusion, not a fact
     * about him. Collapsing them into one row is what produced the defect
     * twice: once as a recommendation to spend half an hour with a daughter who
     * was at school, and once as an inspection surface still saying she was
     * with him after the recommendation had been repaired.
     */
    label: 'Child here right now',
    domain: DOMAIN.fatherhood,
    derived: true,
    // Worked out from this moment, so it is never anything but current.
    freshness: localDays(1),
    // The same class as the arrangement it narrows: this is about a child.
    privacy: 'child-family-sensitive',
    // Never. There is no question spec for it and there must not be one — the
    // owner does not answer the app's own conclusions.
    ask: { materialToDecision: false, askWhenStale: false },
  },
  {
    id: CONCEPT.custodyArrangement,
    purpose: 'whose days are whose',
    label: 'Custody arrangement',
    domain: DOMAIN.fatherhood,
    freshness: DURABLE,
    standing: true,
    privacy: 'child-family-sensitive',
    ask: { materialToDecision: false, askWhenStale: false },
    // An arrangement is a thing the owner knows and nothing else does.
    reliability: { owner: 1, derived: 0.25, device: 0.15, model: 0.1 },
  },
  {
    id: CONCEPT.learningTopic,
    purpose: 'what is being studied',
    label: 'Current learning topic',
    domain: DOMAIN.career,
    freshness: localDays(14),
    standing: true,
    privacy: 'normal',
    ask: { materialToDecision: true, askWhenStale: true },
    reliability: { owner: 1, derived: 0.7, device: 0.5, model: 0.45 },
  },
  {
    id: CONCEPT.usableTimeTonight,
    purpose: 'how much time there is',
    /*
     * The label, and only the label — AUD-0002.
     *
     * The stored id stays `career.usable-time-tonight`, because renaming a
     * concept id is a migration and belongs with AUD-0006 rather than in a copy
     * pass. What was owner-visible was the label, on the evidence panel and on
     * the Career page, and it named an evening at every hour of the day.
     */
    label: 'Usable time now',
    domain: DOMAIN.career,
    /*
     * Free minutes in *this* part of the day, so it expires with the part of
     * the day rather than four hours after it was said — AUD-0005. An answer
     * given at half past five about the evening is not still an answer at ten,
     * and an answer given at ten in the morning has nothing to say about the
     * afternoon.
     */
    freshness: THIS_BLOCK,
    privacy: 'normal',
    ask: { materialToDecision: true, askWhenStale: true },
    // A calendar is genuinely good at this, and is still not the whole evening.
    reliability: { owner: 1, device: 0.75, derived: 0.75, model: 0.3 },
  },
  {
    id: CONCEPT.cashBuffer,
    purpose: 'how much room there is if something goes wrong',
    label: 'Cash buffer',
    domain: DOMAIN.money,
    freshness: localDays(30),
    standing: true,
    tracked: 'number',
    privacy: 'sensitive',
    ask: { materialToDecision: false, askWhenStale: true },
    // The second case D-059 names: a financial record of a balance beats an
    // estimate of it, and this is the only concept in the registry where the
    // owner sits below three other sources.
    reliability: { device: 0.95, derived: 0.9, owner: 0.6, model: 0.35 },
  },
  {
    id: CONCEPT.socialEnergy,
    purpose: 'whether company sounds good',
    label: 'Social energy',
    domain: DOMAIN.social,
    freshness: elapsedHours(8),
    tracked: 'scale',
    privacy: 'normal',
    /*
     * It gates the social generator outright, and said it decided nothing —
     * AUD-0041.
     *
     * `socialCandidates` returns `[]` unless this reads 0.6 or better, so the
     * whole social domain is silent without it. The declaration was `false`,
     * which is the flag saying the exact opposite of what the code does, and
     * because `materialToDecision` is what `shouldAsk` gates on, the app was
     * also declining to spend a question on the one reading that unlocks an
     * entire area. Measured now rather than declared:
     * `tests/synthetic/reach-material.test.ts` re-runs the decision without
     * this reading and with it, on every history in the library.
     */
    ask: { materialToDecision: true, askWhenStale: true },
    reliability: { owner: 1, device: 0.35, derived: 0.3, model: 0.2 },
  },
  {
    id: CONCEPT.homeFriction,
    purpose: 'what is getting in the way at home',
    label: 'Home friction',
    domain: DOMAIN.home,
    /*
     * Three days, not seven — AUD-0005, and the other half of the pair.
     *
     * The audit put these two side by side: last night's sleep expired
     * mid-morning while "the kitchen table is buried again" stayed current for
     * a week. The second is the more perishable of the two by a long way — he
     * clears the table without telling the app — and it was the one that
     * persisted, so the app was asserting a state of a room from a reading old
     * enough to be about a different week.
     *
     * Three days rather than a number nearer zero because friction in a house
     * is a standing condition rather than an event: a table that was buried on
     * Monday is usually still buried on Tuesday, and asking every evening is
     * section 4.5's failure in the other direction. What goes is the fourth day
     * onwards, where the honest state is "ask" rather than "assert".
     *
     * The audit's other option — retiring it on a completed `reset-space` —
     * is the better mechanism and is deliberately not done here: it needs the
     * app to write a derived fact about a room from an outcome answer, which is
     * new behaviour rather than a corrected claim.
     */
    freshness: localDays(3),
    standing: true,
    privacy: 'normal',
    /*
     * It gates the home generator and supplies the `constraint-active`
     * explanation, and said it decided nothing — AUD-0041.
     *
     * The same shape as `socialEnergy` immediately above: `homeCandidates`
     * returns nothing while this is unknown, and the sentence the owner reads
     * when a home move wins is this reading, rendered. Two of the four
     * declarations the audit found wrong, both wrong in the direction that
     * suppresses a question about something that decides an area.
     */
    ask: { materialToDecision: true, askWhenStale: true },
    reliability: { owner: 1, derived: 0.45, device: 0.3, model: 0.25 },
  },
  {
    id: CONCEPT.privatePattern,
    purpose: 'what has been going on here lately',
    label: 'Recent private pattern',
    domain: DOMAIN.privateHealth,
    freshness: localDays(7),
    standing: true,
    privacy: 'private',
    // Section 11: the owner navigates here deliberately. The app does not open
    // a check-in with an unsolicited private question.
    ask: { materialToDecision: false, askWhenStale: false },
    // Section 11 also forbids the app deciding what any of this means. A model
    // concluding something here would be doing exactly that.
    reliability: { owner: 1, derived: 0.4, device: 0.2, model: 0.15 },
  },
  {
    id: CONCEPT.weeklyFocus,
    purpose: 'what this week is pointed at',
    label: 'Weekly direction',
    domain: DOMAIN.direction,
    freshness: localDays(7),
    standing: true,
    privacy: 'normal',
    ask: { materialToDecision: true, askWhenStale: true },
    // A direction is something the owner sets. Nothing else gets to set it.
    reliability: { owner: 1, derived: 0.3, device: 0.2, model: 0.2 },
  },
  {
    id: CONCEPT.emotionalState,
    purpose: 'how you have been feeling',
    label: 'Current emotional state',
    domain: DOMAIN.emotional,
    freshness: elapsedHours(8),
    /*
     * Deliberately **not** tracked, and that is the honest state of it (R3-B3,
     * D-091 invariant 6).
     *
     * Its readings are free text — "flat" — so there is no scale, no direction
     * and nothing two of them can be compared along. Marking it tracked did not
     * give it those; it only made the app claim a participation the machinery
     * discarded one line later, in `numericValue`.
     *
     * The answer was never to invent a scale for it. Mood, stress, confidence
     * and motivation are four different things, and one number standing in for
     * all four is the wellness score the owner rules out.
     *
     * ## The open question is closed — correction 3.15
     *
     * This paragraph used to end *"which dimensions exist here is his to say,
     * and until he says… Open question for the owner."* **D-166 answered it on
     * 2026-08-27**, and the comment went on describing a live question in the
     * exact place a later reader would come to find out whether it was still
     * one. The six dimensions the owner named are separate concepts in this
     * registry, each independently unknown, and **nothing anywhere composites
     * them** — that is the whole point of six rather than one.
     *
     * ## What this concept still is
     *
     * The words he types, kept as he typed them. It coexists with the six
     * (D-166 requires that), it is shown on its page as he said it, and it is
     * not pretended to be a trend.
     *
     * ## And what it stopped claiming — AUD-0041, AUD-0011(c)
     *
     * `materialToDecision: true` with **no question in the catalogue and no
     * reader anywhere** is the failure §13B names by name: the app held three
     * positions on one concept and showed the owner the two that contradict —
     * the Emotional page inviting him to add it, the registry saying an answer
     * matters, and the Life screen saying nothing is asking him to. Measured
     * against the decision path, no reading of this moves anything, so the flag
     * now says so. It is the honest half of AUD-0011(c) rather than the half
     * that wires free text into a score.
     */
    privacy: 'sensitive',
    ask: { materialToDecision: false, askWhenStale: false },
    reliability: { owner: 1, device: 0.4, derived: 0.35, model: 0.2 },
  },
  {
    id: CONCEPT.faithPractice,
    purpose: 'how this part of life has been going',
    label: 'Recent faith practice',
    domain: DOMAIN.faith,
    freshness: localDays(7),
    standing: true,
    privacy: 'sensitive',
    ask: { materialToDecision: false, askWhenStale: true },
    reliability: { owner: 1, derived: 0.5, device: 0.35, model: 0.2 },
  },
]

export interface ConceptRegistry {
  all(): readonly ConceptDefinition[]
  get(concept: ConceptId): ConceptDefinition | undefined
  definitionFor(concept: ConceptId): ConceptDefinition
  freshnessFor(concept: ConceptId): FreshnessWindow
  /** How far a reading of this concept from this source may move a belief. */
  reliabilityFor(concept: ConceptId, source: ProvenanceSource): number
  extendedWith(extra: readonly ConceptDefinition[]): ConceptRegistry
}

/** The same lookup, for callers holding a definition rather than a registry. */
export function reliabilityOf(definition: ConceptDefinition, source: ProvenanceSource): number {
  return definition.reliability?.[source] ?? DEFAULT_SOURCE_RELIABILITY[source]
}

/**
 * A concept nobody registered is still a concept.
 *
 * Synthetic fixtures invent concepts on purpose, and a legacy import will
 * eventually bring in ones this version has never heard of. Refusing to resolve
 * them would make an inspectable oddity into a crash, so an unregistered
 * concept gets a cautious definition instead: a short horizon, no question
 * budget, the more discreet privacy class, and no reliability opinion at all —
 * which leaves the conservative defaults, because nobody has argued otherwise.
 */
export function fallbackConcept(concept: ConceptId): ConceptDefinition {
  return {
    id: concept,
    label: concept,
    domain: DOMAIN.direction,
    freshness: elapsedHours(24),
    privacy: 'sensitive',
    ask: { materialToDecision: false, askWhenStale: false },
    // Honest about the whole of it: nobody registered this, so nobody has said
    // what it is for either. The fact ledger prints the sentence, so it says
    // that rather than inventing a use for a concept the app does not know.
    purpose: 'something recorded that this version does not have a use for',
  }
}

export function createConceptRegistry(
  concepts: readonly ConceptDefinition[] = CORE_CONCEPTS,
): ConceptRegistry {
  const byId = new Map<ConceptId, ConceptDefinition>(
    concepts.map((definition) => [definition.id, definition]),
  )
  const ordered = [...byId.values()]

  const definitionFor = (concept: ConceptId): ConceptDefinition =>
    byId.get(concept) ?? fallbackConcept(concept)

  return {
    all: () => ordered,
    get: (concept) => byId.get(concept),
    definitionFor,
    freshnessFor: (concept) => freshnessWindow(concept, definitionFor(concept).freshness),
    reliabilityFor: (concept, source) => reliabilityOf(definitionFor(concept), source),
    extendedWith: (extra) => createConceptRegistry([...ordered, ...extra]),
  }
}

export const coreConcepts: ConceptRegistry = createConceptRegistry()
