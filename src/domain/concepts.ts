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
   * Which way is the good way for a reading of this to move — AUD-0029.
   *
   * Required wherever `tracked` is set and meaningless without it: a series that
   * cannot be read as a number has no direction, so it can have no sense either.
   * See {@link ReadingSense} for why there is no default.
   */
  readonly sense?: ReadingSense
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

/**
 * Which way is the good way for a reading of this to move — AUD-0029.
 *
 * ## Why a direction is not a valence
 *
 * A trajectory says what a run of numbers did. Six weeks of falling readings is
 * a fall whichever concept it is about, and what it *means* is opposite for two
 * concepts sitting next to each other in the same registry: falling sleep is a
 * man getting worse, and falling soreness is a shoulder getting better. A
 * dimension that read the direction and not the sense would have raised the
 * urgency of every area where the owner was recovering.
 *
 * ## And why it may not have a default
 *
 * DEF-0156's class, and it is the freshest lesson in the campaign: a boolean on
 * a concept that nothing verifies is wrong in four cases of fifteen and nobody
 * notices for a phase. So this has **no default**. Every concept that declares
 * `tracked` must declare a sense, `tests/unit/registries.test.ts` fails the
 * build where one does not, and `neither` is a real answer rather than an
 * absence — *"how much company would help"* is a want, and wanting company more
 * is not a man doing worse.
 */
export const READING_SENSES = ['higher-is-better', 'higher-is-worse', 'neither'] as const

export type ReadingSense = (typeof READING_SENSES)[number]

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
  /**
   * How much of *this part of the day* is actually free — AUD-0006.
   *
   * The concept the audit calls the worst naming seam in the model. It was
   * `career.usable-time-tonight`: not a career fact — it gates whether he can
   * spend thirty minutes with his daughter — not about the evening — it is read
   * at half past six in the morning — and filed on the Career page, so his route
   * to correcting how much time he has ran through the wrong life area.
   *
   * `time.` is a namespace of its own because the quantity belongs to no domain,
   * and AUD-0004 has already made *time before the next obligation* a second,
   * distinct quantity that will want the same namespace.
   */
  freeNow: conceptId('time.free-now'),
  /**
   * The id it was stored under, kept readable — AUD-0006's migration rule.
   *
   * **Add-new plus alias-old, never a rewrite of history** (plan section 30,
   * D-101). Every observation the owner has ever given about his free time
   * carries this id, and a rename in place would either orphan them or edit
   * what he said. {@link SUPERSEDED_CONCEPTS} is the alias table and
   * `resolveFacts` reads through it, so an old record and a new one answer the
   * same question and there is exactly one belief behind them.
   */
  usableTimeTonight: conceptId('career.usable-time-tonight'),
  cashBuffer: conceptId('money.cash-buffer-state'),
  socialEnergy: conceptId('social.energy'),
  homeFriction: conceptId('home.friction'),
  privatePattern: conceptId('private-health.recent-pattern'),
  weeklyFocus: conceptId('direction.weekly-focus'),
  emotionalState: conceptId('emotional.current-state'),
  faithPractice: conceptId('faith.practice-recent'),

  // -------------------------------------------------------------------------
  // D-166's six emotional dimensions — routing 92, S2 Tier 1
  // -------------------------------------------------------------------------
  /**
   * Six, and never one — D-166, approved 2026-08-27.
   *
   * The owner's rule, in his words: distinct, independently unknown, **never
   * composited**, not all asked on any day, with free text coexisting. That is
   * why {@link CONCEPT.emotionalState} is still here beside them: the sentence
   * he types is a different thing from a reading on a scale, and neither
   * replaces the other.
   *
   * **They land in different routing packages, and approval of the vocabulary
   * was not approval to create unreachable questions** (§13B). Each one ships
   * askable only where a consumer exists that some possible answer could move —
   * so two are asked here and four are readable, correctable and silent. The
   * roadmap for the other four is written on each definition rather than in a
   * plan somebody has to find.
   */
  mood: conceptId('emotional.mood'),
  stress: conceptId('emotional.stress'),
  motivation: conceptId('emotional.motivation'),
  confidence: conceptId('emotional.confidence'),
  /** Loneliness / social-connection need. Asked here, via AUD-0013. */
  needForCompany: conceptId('emotional.need-for-company'),
  /** Mental overload. Asked here, via the capacity limiter. */
  overwhelm: conceptId('emotional.overwhelm'),

  // -------------------------------------------------------------------------
  // S2 Tier 1 and Tier 2 — the rest of routing 92's vocabulary
  // -------------------------------------------------------------------------
  /**
   * Whether the owner is free to leave — the audit's supervision / egress
   * concept, and the owner's own CASE B.
   *
   * D-187 already captures *"can't leave — someone's in my care"* as a blocker
   * cause, and it had no registry home, so the constraint it wrote named a
   * concept the registry had never heard of and nothing could match it against
   * a move. This is the home it needed.
   */
  mustStay: conceptId('context.must-stay'),
  /** Whether movement has already happened today. Worked out, never asked. */
  trainedToday: conceptId('health.trained-today'),
  /** How hard work has been pulling. One scale, once a day. */
  workStrain: conceptId('work.strain'),
  /** Who is around, read from the relationship graph rather than asked. */
  peoplePresent: conceptId('context.people-present'),

  // -------------------------------------------------------------------------
  // D-293's three new concepts — routing 94, the check-in
  // -------------------------------------------------------------------------
  /**
   * Eight emotional dimensions, not six — D-293 amends D-166.
   *
   * D-166's list was owner-stated, so changing it is a decision rather than an
   * addition, and the two below are recorded with the reason each arrived.
   *
   * **Irritation was his own word and he named it first**, unprompted, in his
   * opening description of the loop: *"sleep? 6 hours, mood? 5 out of 10,
   * irritated? 9/10, hungry? 5/10."* **It is not a variant of stress and must
   * not be mapped onto it.** Stress is pressure arriving from outside; this is
   * how much of it is coming back out at whoever is nearest, and a man can be
   * under no pressure at all and still be snapping.
   */
  irritation: conceptId('emotional.irritation'),
  /**
   * How well attention is holding — and the one dimension with a warning on it.
   *
   * **Focus was not the owner's word.** It arrived through the previous
   * conversation's own grouping of the dimensions, which he then selected as a
   * block, and he asked for it knowing that. D-293 records why that matters:
   * **it is the dimension most likely to prove an effect of energy and mood
   * rather than a cause.** When D-287's learned weights arrive, the eight are
   * not to be treated as peers without checking this one.
   */
  focus: conceptId('emotional.focus'),
  /**
   * How hungry he is — and **not** an emotional dimension (D-293).
   *
   * It was one of the owner's original four and it was lost inside a grouping
   * that sent it to the morning only. It swings within a day more than almost
   * anything else on the list, so it is read at every check-in, and it is filed
   * under Health because that is what it is about.
   */
  hunger: conceptId('health.hunger'),
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
    // More sleep is more rest. The whole recovery model rests on it.
    sense: 'higher-is-better',
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
    // A better night is a better night.
    sense: 'higher-is-better',
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
     *
     * **It has landed, and the flag has moved back — routing 93, D-271.**
     * `assessStrain` reads it as the fourth signal under the rule energy and
     * work strain already follow: eight hours of broken sleep is not eight
     * hours of rest, the hours alone cannot say so, and it raises the assessment
     * from `none` while never on its own making it severe.
     * `tests/synthetic/reach-material.test.ts` is what says the flag is right
     * again; nothing here is trusted on its own word.
     */
    ask: { materialToDecision: true, askWhenStale: true },
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
    // More in the tank is more in the tank.
    sense: 'higher-is-better',
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
    // A shoulder hurting more is a shoulder doing worse — and this is the arm that makes a bare direction unusable, because falling soreness is a man recovering.
    sense: 'higher-is-worse',
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
    id: CONCEPT.freeNow,
    purpose: 'how much time there is',
    /*
     * The label was corrected first, and now the rest of it — AUD-0002, then
     * AUD-0006.
     *
     * The copy pass fixed what was owner-visible: it named an evening at every
     * hour of the day. What it deliberately left was the id and the filing,
     * because renaming a concept is a migration rather than a copy change. This
     * is that migration: the id says what the quantity is, the domain is no
     * longer Career, and the old id still resolves through
     * {@link SUPERSEDED_CONCEPTS}.
     *
     * Filed under Direction because the audit's own suggestion is *"the
     * Now/Direction surface, or a small 'How your day is set up' group"*, and
     * Direction is the page that already carries how the day is shaped. It is
     * not a claim that free time is an identity question; it is the least wrong
     * home the eleven-domain registry has, and it is a great deal less wrong
     * than filing it under what he is studying.
     */
    label: 'Usable time now',
    domain: DOMAIN.direction,
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
    // More months of runway is more room.
    sense: 'higher-is-better',
    privacy: 'sensitive',
    /*
     * The audit's third wrong declaration, and the one that could not be
     * corrected until money had a history — AUD-0041, AUD-0012.
     *
     * It gates the money generator, and the generator's caution is right in
     * principle: *"needs a goal that exists, never a generic check your
     * budget."* What was wrong is that the precondition was unreachable — **no
     * shipped history held a financial goal at all** — so the measurement in
     * `reach-material.test.ts` correctly said no reading of this changed
     * anything, and the flag correctly said so too. `money-item-due` is the
     * history that makes it false, and this is the flag following the
     * measurement rather than the other way round.
     *
     * **Material and not askable, deliberately.** AUD-0012 suggests a question
     * when a due date is near; §13B's lock is that daily push burden must not
     * increase, and this phase measured what a new question costs. The cash
     * buffer is corrected on the Money page, the way a learning topic is named
     * on Career and a week's direction is set on Life — and the domain reaches
     * a decision without it, which is what AUD-0012 was actually about.
     */
    ask: { materialToDecision: true, askWhenStale: true },
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
    // Feeling more like people is a better week than feeling less like them.
    sense: 'higher-is-better',
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

  // ---------------------------------------------------------------------------
  // D-166's six emotional dimensions — routing 92
  //
  // Distinct, independently unknown, never composited, not all asked on any
  // day, free text coexisting. Two are askable here because two have consumers;
  // the other four are readable, correctable and silent, and each says on its
  // own definition what would have to exist before it could be asked.
  //
  // **Every one of them carries `tracked: 'scale'`, and that was a decision
  // rather than a default.** `trajectoryCards` gates on `tracked`, so a scale
  // here produces a trajectory card *per dimension* once a dimension has enough
  // readings of its own — six possible cards where there was one untrackable
  // free-text field. That is not a violation: six separate cards is the
  // opposite of a composite and is the whole value of making the dimensions
  // distinct. It is a new owner-facing claim per dimension arriving as a side
  // effect of a schema choice, so it is written down here, the copy is the
  // dimension's own label in the card's existing "Label: reading" shape, and
  // `tests/synthetic/reach-dimensions.test.ts` proves that no path anywhere
  // sums or averages across the six.
  // ---------------------------------------------------------------------------
  {
    id: CONCEPT.mood,
    purpose: 'how you have been feeling in yourself',
    label: 'Mood',
    domain: DOMAIN.emotional,
    freshness: elapsedHours(8),
    tracked: 'scale',
    // Plainly.
    sense: 'higher-is-better',
    privacy: 'sensitive',
    /*
     * **Not askable in routing 92** — §13B, in as many words.
     *
     * Nothing decides differently for a mood reading, and a question whose
     * answer changes nothing is a tap the owner pays for forever. The dimension
     * exists so the Emotional page can show it as unknown and he can record one
     * if he wants to; what it does not have is a consumer, and §13B's rule is
     * that a concept ships askable only when one exists.
     *
     * What would change this: a consumer some possible answer could move. Not a
     * mood-based ranking — that is the wellness score by another route.
     */
    ask: { materialToDecision: false, askWhenStale: false },
    reliability: { owner: 1, device: 0.3, derived: 0.3, model: 0.15 },
  },
  {
    id: CONCEPT.stress,
    purpose: 'how much pressure you have been under',
    label: 'Stress',
    domain: DOMAIN.emotional,
    freshness: elapsedHours(8),
    tracked: 'scale',
    // Plainly, and it is one of the four scales D-166 keeps apart rather than summing.
    sense: 'higher-is-worse',
    privacy: 'sensitive',
    /*
     * **Routing 92 only if an honest friction / opportunity-cost consumer is
     * demonstrated** — §13B. None was, and this records why rather than
     * shipping the question and hoping.
     *
     * The available consumer is the `friction` dimension, and the claim it
     * would rest on — *stress makes getting started harder* — is a causal
     * statement about this owner that nothing in the record measures. Section
     * 68 forbids exactly that where only association exists, and there is not
     * even association here yet. The other candidate, `opportunity-cost`, reads
     * time, and stress is not time.
     *
     * There is a second reason and it is the sharper one: `work.strain` is
     * wired to `capacity.strain` in this phase, and routing stress there too
     * would be two readings of pressure feeding one number — a composite by
     * accident, which is the thing D-166 exists to prevent.
     */
    ask: { materialToDecision: false, askWhenStale: false },
    reliability: { owner: 1, device: 0.3, derived: 0.3, model: 0.15 },
  },
  {
    id: CONCEPT.motivation,
    purpose: 'how much you have felt like getting going',
    label: 'Motivation',
    domain: DOMAIN.emotional,
    freshness: elapsedHours(8),
    tracked: 'scale',
    // Wanting to is better than not wanting to.
    sense: 'higher-is-better',
    privacy: 'sensitive',
    /*
     * **Routing 92 only if an honest capacity / friction consumer is
     * demonstrated** — §13B. The same answer as stress, for a related reason.
     *
     * The tempting consumer is `friction`, and the argument for it is better
     * than stress's: how hard it feels to get started is not a causal claim
     * about him, it is the same quantity that dimension already estimates, from
     * his own mouth — D-089's *ask for the reading, not the verdict*. What stops
     * it here is that `friction` is also where the **learned** friction of a
     * verb lives, and folding a whole-person reading into a per-move belief
     * would make every learned friction figure partly a mood reading with no way
     * to tell the two apart afterwards.
     *
     * That is a real consumer waiting for a place to put it rather than a
     * refusal, and the place is the capacity work at routing 94.
     */
    ask: { materialToDecision: false, askWhenStale: false },
    reliability: { owner: 1, device: 0.3, derived: 0.3, model: 0.15 },
  },
  {
    id: CONCEPT.confidence,
    purpose: 'how sure of yourself you have been feeling',
    label: 'Confidence',
    domain: DOMAIN.emotional,
    freshness: localDays(7),
    tracked: 'scale',
    // Plainly.
    sense: 'higher-is-better',
    privacy: 'sensitive',
    /*
     * **Deferred to routing 94 / F25** — §13B. The consumer belongs with the
     * progression work: confidence is a reading about how somebody is doing at
     * something over months, and the machinery that could act on it is the
     * domain-progression model that does not exist yet.
     *
     * It is here rather than absent because D-166 approved six distinct
     * dimensions and the Emotional page has to be able to show all six as
     * independently unknown. A dimension that exists and says nothing is
     * honest; a dimension the owner is told about and cannot see is not.
     */
    ask: { materialToDecision: false, askWhenStale: false },
    reliability: { owner: 1, device: 0.3, derived: 0.3, model: 0.15 },
  },
  {
    id: CONCEPT.needForCompany,
    purpose: 'whether being around people would help {when}',
    label: 'Need for company',
    domain: DOMAIN.emotional,
    /*
     * Slower than the rest, and deliberately. Mood and mental load are about
     * this part of today; wanting people about is a thing that holds for days,
     * and re-asking it every eight hours would be the questionnaire section 4.5
     * forbids, wearing a caring expression.
     */
    freshness: localDays(3),
    tracked: 'scale',
    // **The reason `neither` exists.** This is a want rather than a state: wanting company more is not a man doing worse, and it is not him doing better either. A drift here is a fact about what would help, and nothing about how he is.
    sense: 'neither',
    privacy: 'sensitive',
    /*
     * It decides, and it is not asked — and both halves are deliberate.
     *
     * **What it decides.** AUD-0013's social-demand path proposes a reach-out
     * to somebody the record has not heard about in months, and a standing
     * reading that company would not help is what holds that back. Suppress
     * only: it can never create the move, never order people, and never reach a
     * sentence — the same discipline AUD-0047 puts on the relationship graph's
     * quality signal, for the same reason.
     *
     * **Why there is no question.** Its consumer is live only while social
     * energy is unknown, and in exactly that situation the guide already holds
     * *"up for people tonight?"* — the more direct question about the same
     * evening. Adding a second one there is the tap section 4.5 forbids. So the
     * reading is given on the Emotional page, the way a learning topic is given
     * on Career and a week's direction is set on Life. §13B's rule is that a
     * concept ships **askable** only with a consumer; it does not say every
     * consumer earns a question.
     *
     * **Loneliness is not diagnosed and is not named.** The label is what he
     * would say about it, the reading is a scale he sets, and nothing anywhere
     * turns it into a statement about him.
     */
    ask: { materialToDecision: true, askWhenStale: true },
    reliability: { owner: 1, device: 0.2, derived: 0.3, model: 0.15 },
  },
  {
    id: CONCEPT.overwhelm,
    purpose: 'how much is on your mind {when}',
    label: 'Mental load',
    domain: DOMAIN.emotional,
    freshness: elapsedHours(8),
    tracked: 'scale',
    // More on his mind is more in the way.
    sense: 'higher-is-worse',
    privacy: 'sensitive',
    /*
     * Askable, and its consumer is the capacity limiter — §13B names it.
     *
     * The limiter is what Now renders as *"What is in the way"*, and it has
     * always been able to say a body is short of rest or asking for an easier
     * day. It has never been able to say the obvious third thing: that there is
     * too much in his head to start something effortful. That is a limiter in
     * exactly the sense the other three are — it obstructs an evening — and it
     * is the one an owner would notice missing.
     *
     * **It is a limiter, not a score.** It answers *what is in the way*; it does
     * not rank moves, does not sum with strain, and does not become a finding
     * about him.
     */
    ask: { materialToDecision: true, askWhenStale: true },
    reliability: { owner: 1, device: 0.2, derived: 0.3, model: 0.15 },
  },

  // ---------------------------------------------------------------------------
  // S2 Tier 1 and Tier 2 — the rest of routing 92's vocabulary
  // ---------------------------------------------------------------------------
  {
    id: CONCEPT.mustStay,
    purpose: 'whether you are free to leave {when}',
    label: 'Free to leave',
    /*
     * Filed under Home rather than Fatherhood, and the reason is that it is not
     * always about a child. *"Someone's in my care"* is the owner's own wording
     * and it covers a sleeping daughter, a parent, anyone. Filing it under
     * Fatherhood would put a fact about his evening on a page about her, and
     * would give it a child-sensitive class it does not always deserve.
     */
    domain: DOMAIN.home,
    /*
     * True of the day it was said on, and lifted by hand rather than by a clock.
     * The record underneath is a `constraint` with an optional `until`, so a
     * bounded one — *"while she is asleep"* — expires on its own and an
     * unbounded one stands until *"Not true any more"*.
     */
    freshness: THIS_LOCAL_DAY,
    privacy: 'normal',
    /*
     * Worked out from the constraints in force, never asked and never stored as
     * an observation — see {@link ConceptDefinition.derived}. The owner says it
     * once, in the words D-187 already captures, when a move he could not do
     * asks him what was in the way.
     */
    derived: true,
    ask: { materialToDecision: false, askWhenStale: false },
  },
  {
    id: CONCEPT.trainedToday,
    purpose: 'whether movement has already happened {when}',
    label: 'Movement today',
    domain: DOMAIN.health,
    freshness: THIS_LOCAL_DAY,
    privacy: 'normal',
    /*
     * **Derived, not asked** — §5.2's own words, and the cheapest observe-first
     * path in the product. A completed movement episode today *is* the answer;
     * asking a man whether he went for the walk the app watched him finish is
     * the failure section 4.5 names.
     */
    derived: true,
    ask: { materialToDecision: false, askWhenStale: false },
  },
  {
    id: CONCEPT.workStrain,
    purpose: 'how hard work has been pulling {when}',
    label: 'How work has been',
    /*
     * Career, because that is where the owner would look for it and there is no
     * separate work domain — and AUD-0006 is the standing warning about
     * inventing one namespace for a reading and filing it under another.
     */
    domain: DOMAIN.career,
    // One scale, once a day. The day it is about is the day it is good for.
    freshness: THIS_LOCAL_DAY,
    tracked: 'scale',
    // A day pulling harder is a day pulling harder.
    sense: 'higher-is-worse',
    privacy: 'normal',
    /*
     * Wired to the consumer that already exists — §13B, and that is the whole of
     * why it needs no selector redesign. `capacity.strain` is read by
     * `applyConstraints` and by the capacity limiter, and it is currently worked
     * out from sleep shortfall and energy alone. A day that took everything out
     * of him is the largest unmodelled driver of an evening, and it arrives
     * nowhere.
     */
    ask: { materialToDecision: true, askWhenStale: true },
    /*
     * D-111's narrow exception, and this is the third concept to earn it.
     *
     * The rule is *being wrong about this is worse than asking about it*, and
     * it is bounded three ways in `guide.ts`: only a concept marked here, only
     * where an answer would flip the recommendation toward **less** action, and
     * only where the standing move is effortful. Both existing members qualify
     * because the app cannot infer them from how he seems — nothing measures
     * whether a shoulder hurts.
     *
     * Nothing measures a day either. Proposing a forty-five-minute lab to a man
     * who has just been through a day that took everything out of him is the
     * same harm as proposing exertion to a body in pain, and it is the harm the
     * whole of AUD-0003 is about. Without this the question can never be asked:
     * one of three answers moves the assessment, D-036's share rule wants half,
     * and a concept that is material and unaskable is the `emotionalState`
     * failure arriving from the other side.
     *
     * The bound is what makes it narrow. It is asked only where the app was
     * about to ask something effortful of him.
     */
    consequential: true,
    // A calendar knows how full a day was and not how hard it was.
    reliability: { owner: 1, device: 0.3, derived: 0.35, model: 0.15 },
  },
  {
    id: CONCEPT.peoplePresent,
    purpose: 'who has been around lately',
    label: 'People around',
    domain: DOMAIN.social,
    freshness: localDays(7),
    /*
     * The social domain's default, and worth stating: this is reach over a graph
     * the app already builds, and the graph carries a quality signal on every
     * interaction. **Quality may only ever suppress and never rank**
     * (AUD-0047), and nothing about a named person is evaluated on any screen.
     */
    privacy: 'normal',
    /*
     * Not new capture. AUD-0047 records that `memory/projections.ts` folds every
     * relationship event into a graph and **only the QA laboratory reads it** —
     * so this is a reading of something the record already holds, which is what
     * Reach means.
     */
    derived: true,
    ask: { materialToDecision: false, askWhenStale: false },
  },

  // -------------------------------------------------------------------------
  // D-293's three, and the one thing all three have in common
  // -------------------------------------------------------------------------
  /*
   * **None of them is askable by the guide, and that is not an oversight.**
   *
   * §13B's rule is that a concept ships askable only where a consumer exists
   * that some possible answer could move, and none of these has one: nothing in
   * tonight's recommendation branches on how irritable he is. D-293 satisfies
   * the rule from the other side and says so in as many words — **the consumer
   * of every check-in reading is the state score and the history the forecast
   * will be built on**, not a branch in today's decision.
   *
   * That is precisely the second budget D-286 creates, and it is why these
   * three do not have to justify themselves to `probeSwings`. The ritual reads
   * them; the guide never asks them; the two counts never pool.
   */
  {
    id: CONCEPT.irritation,
    purpose: 'how much is coming back out at whoever is nearest',
    label: 'Irritation',
    // The same window as mood and stress: it is a reading about now that stops
    // answering for now by the end of the block after next.
    freshness: elapsedHours(8),
    domain: DOMAIN.emotional,
    tracked: 'scale',
    // Snapping at everything is not a better day than nothing getting to him.
    sense: 'higher-is-worse',
    privacy: 'sensitive',
    ask: { materialToDecision: false, askWhenStale: false },
    reliability: { owner: 1, device: 0.2, derived: 0.3, model: 0.15 },
  },
  {
    id: CONCEPT.focus,
    purpose: 'how well attention has been holding',
    label: 'Focus',
    freshness: elapsedHours(8),
    domain: DOMAIN.emotional,
    tracked: 'scale',
    // Holding a thought is better than losing it, whatever later turns out to
    // cause which. The sense is about the reading; D-293's warning is about the
    // weights, and they are different questions.
    sense: 'higher-is-better',
    privacy: 'sensitive',
    ask: { materialToDecision: false, askWhenStale: false },
    reliability: { owner: 1, device: 0.3, derived: 0.3, model: 0.15 },
  },
  {
    id: CONCEPT.hunger,
    purpose: 'how hungry you are',
    label: 'Hunger',
    /*
     * Six hours, which is the shortest window in the registry beside energy's.
     *
     * D-293's argument for reading it three times a day is that it swings
     * within a day more than almost anything else on the list, and a freshness
     * horizon longer than the gap between check-ins would make the midday
     * reading answer for the evening — which is the one thing a dimension read
     * three times a day must not do.
     */
    freshness: elapsedHours(6),
    domain: DOMAIN.health,
    tracked: 'scale',
    // Starving is not a better state than not hungry.
    sense: 'higher-is-worse',
    privacy: 'normal',
    ask: { materialToDecision: false, askWhenStale: false },
    reliability: { owner: 1, device: 0.3, derived: 0.3, model: 0.15 },
  },
]

/**
 * Concept ids that have been renamed, and what they resolve to now — AUD-0006.
 *
 * The whole of the migration rule in one table. A stored record keeps the id it
 * was written with — nothing rewrites history (plan section 30, D-101) — and
 * `resolveFacts` reads through this so that an answer given last year and one
 * given today are the same belief rather than two half-empty ones.
 *
 * **It is one-way and it is not a synonym list.** A record may carry a
 * superseded id; nothing may write one. `tests/unit/registries.test.ts` fails
 * the build if a superseded id ever appears in the registry as a concept in its
 * own right, and `tests/contract/round-trip.test.ts` restores a backup written
 * before the rename and asserts one belief comes out.
 */
export const SUPERSEDED_CONCEPTS: ReadonlyMap<ConceptId, ConceptId> = new Map([
  [CONCEPT.usableTimeTonight, CONCEPT.freeNow],
])

/** The id this record's concept resolves to today. */
export function currentConcept(concept: ConceptId): ConceptId {
  return SUPERSEDED_CONCEPTS.get(concept) ?? concept
}

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
