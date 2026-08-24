import { CONCEPT } from '../domain/concepts'
import { DOMAIN, type LifeDomainId } from '../domain/domains'
import type { PrivacyClass } from '../domain/privacy'
import type { ConceptId } from '../domain/windows'

/**
 * What each legacy concept becomes, and what it deliberately does not
 * (canonical plan sections 30, 53 and 59).
 *
 * ## This file is the phase
 *
 * Everything else in `src/legacy/` is machinery: read a file, decrypt it, count
 * it, write it down atomically, undo it if it did not land. All of that is
 * bounded and most of it already existed. **This is the part that decides what
 * the owner's history means**, and section 30's critical rule is the whole of
 * it in one sentence:
 *
 * > Do not contort the new architecture to make legacy mapping easier.
 *
 * A legacy concept that does not map cleanly is preserved as archive data. It
 * is not forced into a canonical shape that nearly fits, and it is not dropped.
 *
 * ## Four dispositions, and why silence is not one of them
 *
 * The tempting shortcut is to map what is recognised and ignore the rest. That
 * makes "we decided not to bring this" and "we forgot about this" the same
 * outcome, and the second is a defect nobody can see. So every one of the
 * previous generation's twenty-eight record families appears below with a
 * disposition and a reason, and the import report states the count for each.
 *
 *   - **`map`** — the same act, in this app's vocabulary. Produces canonical
 *     records that participate in everything, because they are history.
 *   - **`archive`** — real, kept verbatim, mapped to nothing. It becomes an
 *     `imported-legacy-record`, which `tests/contract/legacy-quarantine.test.ts`
 *     already proves cannot answer a question however good its payload looks.
 *   - **`excluded`** — section 59 says this does not return. Recognised,
 *     counted, named in the report, and **not written at all**. The difference
 *     from `archive` is deliberate: an excluded concept is one the owner
 *     decided against, and keeping a copy of it in the store would be leaving
 *     it somewhere a later feature could read.
 *   - **`undecided`** — real history with no honest home in this app yet.
 *     Archived like the second, and additionally **flagged for the owner**,
 *     because the alternative is inventing a mapping he never agreed to.
 *
 * Uncertain is a state. Guessing is a defect.
 *
 * ## The version, and why it is stamped on every imported record
 *
 * A mapping rule is a claim about meaning, and claims get revised. Anything
 * imported under one revision has to stay tellable-apart from anything imported
 * under the next, or a later correction to a rule silently rewrites history
 * that was brought across correctly under the old one.
 */
export const MAPPING_RULES_VERSION = 'legacy-map-2026-08-A'

export type Disposition = 'map' | 'archive' | 'excluded' | 'undecided'

export interface FamilyRule {
  /** The previous generation's own name for this family. */
  readonly legacyType: string
  readonly disposition: Disposition
  /**
   * Why, for whoever reads this registry. The audit trail.
   *
   * It cites decisions, plan sections and the names of things in this file,
   * because that is what makes a claim about meaning checkable a year later.
   */
  readonly because: string
  /**
   * The same decision, for the owner, on his screen.
   *
   * **A separate field because these are two different jobs, and giving both
   * to one string was a real defect.** The audit trail was rendered verbatim
   * in the import report, so the screen told him about "D-091 invariant 6",
   * "Section 59", "the contortion section 30 forbids", a constant called
   * `MOVE_PREFERENCE_NOTE`, and what "the owner" had decided — about himself,
   * in the third person. Every automated check passed; a person reading the
   * screen found it in one pass, which is section 36 and section 4.6 exactly.
   *
   * So: second person, no decision ids, no section numbers, no identifiers
   * from this codebase, and no word that only means something to somebody who
   * has read the plan. `tests/unit/legacy-mapping.test.ts` fails the build for
   * any of those, over every entry rather than over the ones already fixed.
   */
  readonly owner: string
}

/* -------------------------------------------------------------------------- */
/* The twenty-eight families                                                   */
/* -------------------------------------------------------------------------- */

export const FAMILY_RULES: readonly FamilyRule[] = [
  /* ---------------------------------------------------------------- mapped */

  {
    legacyType: 'observation',
    owner:
      'Readings you took. They come across as readings where this app means the same thing by them, and are kept exactly as written where it does not.',
    disposition: 'map',
    because:
      'The owner reported a reading, which is the same act this app records. Only the ' +
      'attributes named in ATTRIBUTE_RULES map; the rest are archived rather than guessed.',
  },
  {
    legacyType: 'observation-correction',
    owner:
      'A correction you made to a reading. It comes across as the corrected reading, with the original still behind it in your history.',
    disposition: 'map',
    because:
      'A correction that carries a replacement value becomes a superseding observation, ' +
      'not a correction record — this app’s `correction` is a retraction with nothing to ' +
      'put back, and replacing is done by writing a new record with `supersedes` set.',
  },
  {
    legacyType: 'north-star',
    owner:
      'A long-horizon statement you wrote about where you were going. It comes across as a goal, with no deadline attached to it.',
    disposition: 'map',
    because:
      'A long-horizon statement the owner wrote about where he is going. It becomes an ' +
      'active goal with no target window, which claims exactly what the original did.',
  },
  {
    legacyType: 'goal',
    owner:
      'A goal comes across as a goal. One whose deadline had simply passed is kept as written instead, because there is no word here for that.',
    disposition: 'map',
    because:
      'The same concept in both models. An `expired` goal is archived instead: neither ' +
      '“abandoned” nor “paused” is true of a window that simply passed, and this app has ' +
      'no word for it.',
  },
  {
    legacyType: 'commitment',
    owner:
      'A commitment with a date comes across. One with no date is kept as written, so nothing puts you under a deadline you never set.',
    disposition: 'map',
    because:
      'The same concept. A commitment with no due date is archived — this app’s ' +
      'commitment requires a due window, and inventing one would put a deadline on ' +
      'something the owner never gave a deadline to.',
  },

  /* --------------------------------------------------------------- archive */

  {
    legacyType: 'context-snapshot',
    owner:
      'A note of how much you had left at one moment. Kept as written — what it measured is either the old app’s own scale or a reading this app does not follow over time.',
    disposition: 'archive',
    because:
      'Every part of it is either the old engine’s taxonomy — capacity bands, protected ' +
      'contexts — or a reading this app’s own registry declines to track over time. ' +
      'Importing it would add volume, not history.',
  },
  {
    legacyType: 'inferred-state',
    owner:
      'Something the old app worked out rather than something you told it. Kept as written; this app works things out from your own records instead of inheriting old conclusions.',
    disposition: 'archive',
    because:
      'Derived state from a retired engine. Reviving it would be importing the old ' +
      'architecture’s conclusions and calling them history.',
  },
  {
    legacyType: 'trajectory',
    owner:
      'The old app’s reading of which way something was going. Kept as written, for the same reason as anything else it concluded on its own.',
    disposition: 'archive',
    because: 'Derived. Same reason as inferred-state — this app re-derives from records.',
  },
  {
    legacyType: 'weekly-direction',
    owner:
      'A direction the old app proposed for a week. Kept as written — your answer to it is wrapped up inside the proposal, and lifting it out would be reading your decision off its packaging.',
    disposition: 'archive',
    because:
      'A derived proposal carrying the old engine’s confidence and reason trace. The ' +
      'owner’s response is inside it, wrapped in an evidence value; lifting the answer ' +
      'out of a proposal’s envelope would be reconstructing a decision from its packaging.',
  },
  {
    legacyType: 'candidate-action',
    owner:
      'Something the old app was still considering before it chose. Kept as written; it is not something that happened.',
    disposition: 'archive',
    because: 'The old engine’s working state before it chose. Not something that happened.',
  },
  {
    legacyType: 'execution',
    owner:
      'Whether you did something the old app suggested. Kept as written, because the suggestion it refers to is not coming across.',
    disposition: 'archive',
    because:
      'An execution is always the execution *of* a recommendation, and the recommendation ' +
      'is excluded by section 59. Evidence attached to nothing is not evidence.',
  },
  {
    legacyType: 'outcome',
    owner:
      'What came of something the old app suggested. Kept as written, with the rest of that episode.',
    disposition: 'archive',
    because:
      'Part of the same chain: an outcome is about an execution of a recommendation. It ' +
      'travels with the decision episode it belongs to, and that episode is archived whole.',
  },
  {
    legacyType: 'recommendation-effect-evaluation',
    owner:
      'The old app’s own view of whether its suggestions helped. Kept as written — the evidence underneath it is not coming across, so the conclusion cannot come with it.',
    disposition: 'archive',
    because:
      'The old engine’s learning over the old move catalogue. D-091 scopes a learned claim ' +
      'to the evidence under it, and that evidence is not coming across.',
  },
  {
    legacyType: 'question-answer',
    owner:
      'An answer you gave to one of the old app’s set questions. Kept as written — the question is what gave the answer its meaning, and the questions are not coming across.',
    disposition: 'archive',
    because:
      'The answer is the owner’s, and its meaning is the question’s prompt — which is a ' +
      'fixed guide questionnaire and excluded. An answer separated from its question is a ' +
      'value with no subject.',
  },
  {
    legacyType: 'learned-belief',
    owner:
      'Something the old app concluded about you. Kept as written; a conclusion needs the evidence under it, and that evidence is staying where it is.',
    disposition: 'archive',
    because:
      'D-091 invariant 1: a learned relationship is scoped to verb and object. The objects ' +
      'are the old catalogue’s, so the belief cannot arrive with its own scope, and a ' +
      'belief printed wider than its evidence is the defect D-091 exists for.',
  },
  {
    legacyType: 'guide-session',
    owner:
      'A record that a check-in happened. Kept as written — check-ins here are a different shape, and this app would read the old one as its own.',
    disposition: 'archive',
    because:
      'A record that a check-in ran, in the old guide’s kinds and depths. This app’s guide ' +
      'is a different shape and would read the old session as its own.',
  },
  {
    legacyType: 'skill-claim',
    owner:
      'What you would say out loud about a skill of yours. Kept exactly as written, because every place it could go here would turn it into a claim that it is true.',
    disposition: 'archive',
    because:
      'Explicitly not an assertion of truth — it is what the owner would say about himself. ' +
      'Every canonical kind that could hold it asserts something, so mapping it would add a ' +
      'claim the original refused to make.',
  },
  {
    legacyType: 'milestone-observation',
    owner:
      'An answer against a developmental checklist. Kept as written, together with which list it was and which version — those are what make the answer mean anything.',
    disposition: 'archive',
    because:
      'An answer against a developmental checklist is meaningless without which list and ' +
      'which revision. This app has no checklist registry, and archiving keeps the list id ' +
      'and version that a mapping would drop.',
  },
  {
    legacyType: 'faith-anchor',
    owner:
      'Something that matters to you, and what you do about it. Kept as written; the nearest thing here is a reading of the last week, which is a different statement.',
    disposition: 'archive',
    because:
      'A standing statement of what matters. The nearest concept here is “recent faith ' +
      'practice”, which is a reading of the last week — answering it with an anchor would ' +
      'be a claim from ignorance about whether anything happened.',
  },
  {
    legacyType: 'move-preference',
    owner:
      'A standing decision you made about a suggestion. Kept in your history — and if it is one this app cannot carry over as a live rule, it is named above so you can say it again.',
    disposition: 'archive',
    because: 'The one that most looks like it should map, and must not. See MOVE_PREFERENCE_NOTE.',
  },

  /* -------------------------------------------------------------- excluded */

  {
    legacyType: 'recommendation',
    owner: 'A suggestion from the old app’s list of moves. Left out: that list does not come back.',
    disposition: 'excluded',
    because:
      'Section 59 — the old move catalogue does not return as product truth. Importing ' +
      'these would make the old catalogue the object of every relationship this app learns.',
  },
  {
    legacyType: 'untreated-forecast',
    owner: 'The old hundred-point forecast. Left out; it does not come back.',
    disposition: 'excluded',
    because: 'Section 59 — Forecast 100 does not return.',
  },
  {
    legacyType: 'intervention-effect-prediction',
    owner: 'A prediction from the same forecasting machinery. Left out with the rest of it.',
    disposition: 'excluded',
    because: 'Section 59 — the same forecasting machinery, one step further in.',
  },
  {
    legacyType: 'forecast-evaluation',
    owner: 'A check on one of those forecasts. Left out with the rest of it.',
    disposition: 'excluded',
    because: 'Section 59 — an evaluation of a forecast that does not return.',
  },
  {
    legacyType: 'question',
    owner: 'One of the old app’s set questions. Left out: fixed questionnaires do not come back.',
    disposition: 'excluded',
    because: 'Section 59 — fixed guide questionnaires do not return.',
  },
  {
    legacyType: 'domain-preference',
    owner:
      'Switching an area of your life off. Left out — there is no such setting here, and every area stays part of the picture.',
    disposition: 'excluded',
    because:
      'Section 4.1 — whole-life model, no domain shutoff. This app has no state in which ' +
      'an area of the owner’s life is switched off, so there is nothing for the record to ' +
      'mean here.',
  },
  {
    legacyType: 'surface-permission',
    owner: 'The old privacy switches. Left out; they do not come back.',
    disposition: 'excluded',
    because: 'Section 59 — the old privacy toggle design does not return.',
  },

  /* ------------------------------------------------------------- undecided */

  {
    legacyType: 'life-context-change',
    owner:
      'Something that changed in your life — a move, a new job, a change at home. Kept exactly as written and waiting on you: it is a thing that happened rather than a reading of anything, and there is nowhere here it belongs yet.',
    disposition: 'undecided',
    because:
      'Real history — a move, a change in custody, a new job — with no canonical home. It ' +
      'is a narrative event, not a fact about a concept, and inventing a concept to hold ' +
      'free text is the contortion section 30 forbids. The owner decides whether these ' +
      'come across and against what.',
  },
]

/**
 * Why the most important-looking mapping in the registry is not made.
 *
 * A `move-preference` with the stance `forbidden` is section 4.3 in one record:
 * the owner told the old app never to suggest something. Losing it looks like
 * the worst thing this phase could do, and bringing it across is worse.
 *
 * It is keyed on `engineCandidateId` — `home:make-the-change` — which is *the
 * old generator's* candidate identity. This app's candidates have different
 * ids, and its vetoes match on an entity reference rather than a candidate
 * string. So an imported veto would match nothing: a preference record sitting
 * in history saying a move is forbidden, which the engine can never act on. An
 * inert veto is worse than no veto, because it looks kept.
 *
 * There are two ways to make it fire and both are the contortion:
 *
 *   - reshape this app's candidate identities to match the old catalogue's,
 *     which is section 59's first exclusion arriving through the back door;
 *   - widen the veto to the domain the old id was prefixed with, which would
 *     forbid **every move in an area of his life** because he once declined one
 *     move in it.
 *
 * So it is archived, and the import report **lists the forbidden moves by
 * name** so the owner can see exactly what he would need to say again. That is
 * the honest version of not being able to keep a promise: say which promise,
 * and to whom.
 */
export const MOVE_PREFERENCE_NOTE =
  'Standing decisions about moves are kept as archive and listed by name. They are keyed ' +
  'on the old app’s move identities, which do not exist here, so importing them would ' +
  'leave vetoes that look active and can never fire.'

const RULES_BY_TYPE = new Map(FAMILY_RULES.map((rule) => [rule.legacyType, rule]))

export function ruleFor(legacyType: string): FamilyRule | undefined {
  return RULES_BY_TYPE.get(legacyType)
}

/**
 * A family this build has never heard of.
 *
 * A backup written by a later version of the old app could carry one. It is
 * archived rather than refused, because a row this build cannot name is exactly
 * the row that must not be lost, and it is reported as unrecognised rather than
 * quietly counted among the deliberate archives.
 */
export const UNKNOWN_FAMILY_RULE: FamilyRule = {
  legacyType: '(unrecognised)',
  disposition: 'archive',
  owner:
    'An entry this version does not recognise. Kept exactly as written and named above, so it is visible rather than quietly filed away.',
  because:
    'This build has no rule for that family. It is kept exactly as written and named in ' +
    'the report, so an unrecognised kind is visible rather than silently archived.',
}

/* -------------------------------------------------------------------------- */
/* Attributes                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * How a legacy observation's value arrives.
 *
 * The old application's observed values are a discriminated union, and only
 * some members are readings this app has a shape for. `unsure` is deliberately
 * absent from every rule: it is the owner saying he looked and could not tell,
 * which is a real report and **not a value**. Mapping it to the text "unsure"
 * would put an answer where the owner put an absence, which is the blank-versus-
 * zero failure with better manners.
 */
export type ValueShape = 'scale' | 'text' | 'number' | 'duration'

export interface AttributeRule {
  /** The old application's attribute string, exactly. */
  readonly legacyAttribute: string
  readonly concept: ConceptId
  readonly domain: LifeDomainId
  readonly shape: ValueShape
  /** The top of the scale the old app used. Only for `shape: 'scale'`. */
  readonly scaleOf?: number
  readonly because: string
}

/**
 * The attributes that map, and nothing else.
 *
 * ## Small on purpose
 *
 * A large table is a large set of claims about somebody else's data model, and
 * every entry that is not needed is an entry that can be wrong. The previous
 * generation writes around sixty-four distinct attributes. Five are here.
 *
 * That ratio is the point rather than an embarrassment. The bulk of a recorded
 * life is readings, and these five carry the readings whose construct, scale
 * and direction are the same in both models. The rest are archived with the
 * reason stated in `DECLINED_ATTRIBUTES` — which is what section 53's "ambiguous
 * mappings remain explicit" asks for, made checkable.
 *
 * ## Every scale here is the old five-point anchored scale
 *
 * The previous generation's scales are all ordinal 1–5 with named anchors, so
 * `of: 5` is a fact about the source rather than a choice made here.
 */
export const ATTRIBUTE_RULES: readonly AttributeRule[] = [
  {
    legacyAttribute: 'state:energy',
    concept: CONCEPT.energy,
    domain: DOMAIN.health,
    shape: 'scale',
    scaleOf: 5,
    because:
      'Same construct, same direction, same subject: “Energy right now” against “Current ' +
      'energy”. Both are the owner saying how much he has, now.',
  },
  {
    legacyAttribute: 'state:sleep-recovery',
    concept: CONCEPT.sleepQuality,
    domain: DOMAIN.sleep,
    shape: 'scale',
    scaleOf: 5,
    because:
      '“Last night’s recovery” and “Sleep quality last night” are one reading of one ' +
      'night, taken the following morning, ordered the same way.',
  },
  {
    legacyAttribute: 'home:friction',
    concept: CONCEPT.homeFriction,
    domain: DOMAIN.home,
    shape: 'text',
    because:
      '“Did anything get in the way of what you sat down to do?” is what this app calls ' +
      'home friction. The answer was a chosen label and stays that label.',
  },
  {
    legacyAttribute: 'career:topic',
    concept: CONCEPT.learningTopic,
    domain: DOMAIN.career,
    shape: 'text',
    because:
      'What a study session was about is what this app means by the current learning ' +
      'topic, and the most recent one is the current one in both models.',
  },
  {
    legacyAttribute: 'faith:practice-done',
    concept: CONCEPT.faithPractice,
    domain: DOMAIN.faith,
    shape: 'text',
    because:
      'Whether the practice happened — “Did it”, “A shorter version”, “Did not this time” ' +
      '— is a reading of recent faith practice, which is the concept here.',
  },
]

/**
 * Attributes that were considered and deliberately not mapped.
 *
 * ## Why a list of non-mappings is worth maintaining
 *
 * Without it, an attribute nobody thought about and an attribute somebody
 * rejected for a reason look identical from the outside — both simply do not
 * appear in `ATTRIBUTE_RULES`. The report can then only say "unmapped", which
 * tells the owner nothing about whether anyone looked.
 *
 * These are the ones where the temptation was real. Each entry is a place where
 * a near-fit was available and taking it would have quietly rewritten what he
 * recorded.
 */
export const DECLINED_ATTRIBUTES: readonly {
  readonly attribute: string
  /** The audit trail. Cites decisions and sections; not for the screen. */
  readonly because: string
  /** The same decision in the owner's terms. See `FamilyRule.owner`. */
  readonly owner: string
}[] = [
  {
    attribute: 'state:mood',
    owner:
      'Mood, stress, confidence and how overwhelmed you felt are four different things. This app keeps one, and which ones it should keep is still yours to decide — so these are kept as written rather than folded into it.',
    because:
      'D-091 invariant 6 by name. Mood, stress, confidence and overwhelm are four things, ' +
      'and this app’s emotional state is one undivided dimension that is an open question ' +
      'for the owner. Pouring four scales into it is the wellness score he rules out.',
  },
  {
    attribute: 'state:stress',
    owner: 'Kept as written, with mood, for the same reason.',
    because: 'Same as state:mood.',
  },
  {
    attribute: 'state:confidence',
    owner: 'Kept as written, with mood, for the same reason.',
    because: 'Same as state:mood.',
  },
  {
    attribute: 'state:overwhelm',
    owner: 'Kept as written, with mood, for the same reason.',
    because: 'Same as state:mood.',
  },
  {
    attribute: 'state:physical-energy',
    owner:
      'The old app kept physical and mental energy apart on purpose. Folding them into one reading here would lose exactly the difference that made them worth splitting.',
    because:
      'The old app split physical from mental energy precisely because averaging them ' +
      'loses what would have chosen between them. Mapping both onto one energy concept ' +
      'would perform that averaging after the fact.',
  },
  {
    attribute: 'state:mental-energy',
    owner: 'Kept as written, with physical energy, for the same reason.',
    because: 'Same as state:physical-energy.',
  },
  {
    attribute: 'state:loneliness',
    owner:
      'Not the same thing as social energy — you can be lonely in a full house, and the two run in opposite directions.',
    because:
      'Not social energy. It is a present state that can be high in a full house, and ' +
      'the two run in opposite directions.',
  },
  {
    attribute: 'state:financial-pressure',
    owner:
      'How much money was on your mind, which is not how much money there was. Kept as written.',
    because:
      'The old app states outright that it is not a measure of how much money there is. ' +
      'This app’s cash buffer is a quantity, and a pressure reading is not one.',
  },
  {
    attribute: 'state:pain-interference',
    owner: 'Whether pain was in the way, which is not the same as how much of it there was.',
    because:
      'Interference, not intensity — whether it is in the way. This app’s soreness ' +
      'concept reads as presence and severity, and the two answer different questions.',
  },
  {
    attribute: 'state:readiness',
    owner: 'The old app’s own scale for what was possible that evening. Kept as written.',
    because: 'The old capacity taxonomy, which section 59 leaves behind.',
  },
  {
    attribute: 'state:retrieval-strength',
    owner: 'How much came back without looking it up. There is nothing here that means it yet.',
    because: 'How much came back without looking. There is no concept here for it yet.',
  },
  {
    attribute: 'context:available-minutes',
    owner:
      'How much time you had that evening. Kept as written — this app does not follow that over time, so bringing years of it across would add rows and nothing else.',
    because:
      'This app’s own registry declines to track usable time as a trend — it is noise ' +
      'with a timestamp, stale within hours by design. Importing years of it would add ' +
      'rows and no understanding.',
  },
  {
    attribute: 'sleep:bedtime',
    owner:
      'A bedtime is not a length of sleep. Working one out from the other would be this app inventing a reading you never took.',
    because:
      'A bedtime is not a duration. Deriving hours slept from bedtime and wake time ' +
      'would be this app computing a reading the old one never took, and presenting it ' +
      'as something the owner recorded.',
  },
  {
    attribute: 'sleep:wake-time',
    owner: 'Kept as written, with bedtime, for the same reason.',
    because: 'Same as sleep:bedtime.',
  },
  {
    attribute: 'father:together',
    owner: 'Time spent together is not the same fact as whether she was with you.',
    because:
      'Time spent together is not whether a child is present. Reading one as the other ' +
      'would answer a custody question with an evening’s activity.',
  },
  {
    attribute: 'legacy:note',
    owner:
      'A note the old app had itself carried forward from the app before it. Kept exactly as written.',
    because:
      'Already the old app’s own passthrough for the generation before it. Mapping it ' +
      'here would promote text that has been unmapped twice.',
  },
]

const ATTRIBUTES_BY_NAME = new Map(ATTRIBUTE_RULES.map((rule) => [rule.legacyAttribute, rule]))

export function attributeRuleFor(attribute: string): AttributeRule | undefined {
  return ATTRIBUTES_BY_NAME.get(attribute)
}

const DECLINED_BY_NAME = new Map(DECLINED_ATTRIBUTES.map((entry) => [entry.attribute, entry]))

/** Why an attribute was not mapped, when somebody actually decided it. */
export function declinedReasonFor(attribute: string): string | undefined {
  return DECLINED_BY_NAME.get(attribute)?.because
}

/** The same decision, in the owner's terms. See `FamilyRule.owner`. */
export function declinedOwnerReasonFor(attribute: string): string | undefined {
  return DECLINED_BY_NAME.get(attribute)?.owner
}

/* -------------------------------------------------------------------------- */
/* Privacy and filing                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The old application's privacy class, in this app's four.
 *
 * Both models classify at capture time and both treat an unclassified record as
 * the most protective thing they have. The classes are not the same set, so the
 * mapping has to be stated rather than assumed, and it has to fail closed.
 *
 * `private` is deliberately **not** the fallback. In this app that class means
 * the private health domain specifically (section 11), so using it for anything
 * unclassified would file a workplace note under a heading the owner reserves
 * for something else. `sensitive` is the honest protective default: withheld
 * from an export unless chosen, without claiming to be something it is not.
 */
export const PRIVACY_BY_LEGACY_CLASS: Readonly<Record<string, PrivacyClass>> = {
  general: 'normal',
  child: 'child-family-sensitive',
  'private-pattern': 'private',
  health: 'sensitive',
  money: 'sensitive',
  workplace: 'sensitive',
  relationship: 'sensitive',
  faith: 'sensitive',
  note: 'sensitive',
  location: 'sensitive',
}

/** Unclassified, or a class this build has never heard of. Fails closed. */
export const PRIVACY_FALLBACK: PrivacyClass = 'sensitive'

export function privacyForLegacyClass(legacyClass: string | undefined): PrivacyClass {
  if (legacyClass === undefined) return PRIVACY_FALLBACK
  return PRIVACY_BY_LEGACY_CLASS[legacyClass] ?? PRIVACY_FALLBACK
}

/**
 * Where an archived legacy row is filed, by the old category it was in.
 *
 * This is a **filing** decision, not a semantic one: an archived row answers
 * nothing whatever it is filed under, and the only consequence is which part of
 * the record Timeline shows it beside. That is why an ambiguous category can be
 * placed here where an ambiguous *reading* could not be.
 *
 * `time-attention-capacity` is deliberately absent. It was the old model's
 * catch-all — its own source calls having filed sleep and food there "a
 * category error waiting to compound" — and choosing a home for it here would
 * repeat the error rather than inherit it.
 */
export const DOMAIN_BY_LEGACY_CATEGORY: Readonly<Record<string, LifeDomainId>> = {
  'career-work-learning': DOMAIN.career,
  'health-recovery-energy': DOMAIN.health,
  'fatherhood-and-child': DOMAIN.fatherhood,
  'emotional-and-relationships': DOMAIN.emotional,
  'faith-and-meaning': DOMAIN.faith,
  'home-and-environment': DOMAIN.home,
  money: DOMAIN.money,
  'direction-and-commitments': DOMAIN.direction,
}

export function domainForLegacyCategory(category: string | undefined): LifeDomainId | undefined {
  if (category === undefined) return undefined
  return DOMAIN_BY_LEGACY_CATEGORY[category]
}
