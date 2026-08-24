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
  /** Why, in one sentence. This is the audit trail and it appears in the report. */
  readonly because: string
}

/* -------------------------------------------------------------------------- */
/* The twenty-eight families                                                   */
/* -------------------------------------------------------------------------- */

export const FAMILY_RULES: readonly FamilyRule[] = [
  /* ---------------------------------------------------------------- mapped */

  {
    legacyType: 'observation',
    disposition: 'map',
    because:
      'The owner reported a reading, which is the same act this app records. Only the ' +
      'attributes named in ATTRIBUTE_RULES map; the rest are archived rather than guessed.',
  },
  {
    legacyType: 'observation-correction',
    disposition: 'map',
    because:
      'A correction that carries a replacement value becomes a superseding observation, ' +
      'not a correction record — this app’s `correction` is a retraction with nothing to ' +
      'put back, and replacing is done by writing a new record with `supersedes` set.',
  },
  {
    legacyType: 'north-star',
    disposition: 'map',
    because:
      'A long-horizon statement the owner wrote about where he is going. It becomes an ' +
      'active goal with no target window, which claims exactly what the original did.',
  },
  {
    legacyType: 'goal',
    disposition: 'map',
    because:
      'The same concept in both models. An `expired` goal is archived instead: neither ' +
      '“abandoned” nor “paused” is true of a window that simply passed, and this app has ' +
      'no word for it.',
  },
  {
    legacyType: 'commitment',
    disposition: 'map',
    because:
      'The same concept. A commitment with no due date is archived — this app’s ' +
      'commitment requires a due window, and inventing one would put a deadline on ' +
      'something the owner never gave a deadline to.',
  },

  /* --------------------------------------------------------------- archive */

  {
    legacyType: 'context-snapshot',
    disposition: 'archive',
    because:
      'Every part of it is either the old engine’s taxonomy — capacity bands, protected ' +
      'contexts — or a reading this app’s own registry declines to track over time. ' +
      'Importing it would add volume, not history.',
  },
  {
    legacyType: 'inferred-state',
    disposition: 'archive',
    because:
      'Derived state from a retired engine. Reviving it would be importing the old ' +
      'architecture’s conclusions and calling them history.',
  },
  {
    legacyType: 'trajectory',
    disposition: 'archive',
    because: 'Derived. Same reason as inferred-state — this app re-derives from records.',
  },
  {
    legacyType: 'weekly-direction',
    disposition: 'archive',
    because:
      'A derived proposal carrying the old engine’s confidence and reason trace. The ' +
      'owner’s response is inside it, wrapped in an evidence value; lifting the answer ' +
      'out of a proposal’s envelope would be reconstructing a decision from its packaging.',
  },
  {
    legacyType: 'candidate-action',
    disposition: 'archive',
    because: 'The old engine’s working state before it chose. Not something that happened.',
  },
  {
    legacyType: 'execution',
    disposition: 'archive',
    because:
      'An execution is always the execution *of* a recommendation, and the recommendation ' +
      'is excluded by section 59. Evidence attached to nothing is not evidence.',
  },
  {
    legacyType: 'outcome',
    disposition: 'archive',
    because:
      'Part of the same chain: an outcome is about an execution of a recommendation. It ' +
      'travels with the decision episode it belongs to, and that episode is archived whole.',
  },
  {
    legacyType: 'recommendation-effect-evaluation',
    disposition: 'archive',
    because:
      'The old engine’s learning over the old move catalogue. D-091 scopes a learned claim ' +
      'to the evidence under it, and that evidence is not coming across.',
  },
  {
    legacyType: 'question-answer',
    disposition: 'archive',
    because:
      'The answer is the owner’s, and its meaning is the question’s prompt — which is a ' +
      'fixed guide questionnaire and excluded. An answer separated from its question is a ' +
      'value with no subject.',
  },
  {
    legacyType: 'learned-belief',
    disposition: 'archive',
    because:
      'D-091 invariant 1: a learned relationship is scoped to verb and object. The objects ' +
      'are the old catalogue’s, so the belief cannot arrive with its own scope, and a ' +
      'belief printed wider than its evidence is the defect D-091 exists for.',
  },
  {
    legacyType: 'guide-session',
    disposition: 'archive',
    because:
      'A record that a check-in ran, in the old guide’s kinds and depths. This app’s guide ' +
      'is a different shape and would read the old session as its own.',
  },
  {
    legacyType: 'skill-claim',
    disposition: 'archive',
    because:
      'Explicitly not an assertion of truth — it is what the owner would say about himself. ' +
      'Every canonical kind that could hold it asserts something, so mapping it would add a ' +
      'claim the original refused to make.',
  },
  {
    legacyType: 'milestone-observation',
    disposition: 'archive',
    because:
      'An answer against a developmental checklist is meaningless without which list and ' +
      'which revision. This app has no checklist registry, and archiving keeps the list id ' +
      'and version that a mapping would drop.',
  },
  {
    legacyType: 'faith-anchor',
    disposition: 'archive',
    because:
      'A standing statement of what matters. The nearest concept here is “recent faith ' +
      'practice”, which is a reading of the last week — answering it with an anchor would ' +
      'be a claim from ignorance about whether anything happened.',
  },
  {
    legacyType: 'move-preference',
    disposition: 'archive',
    because: 'The one that most looks like it should map, and must not. See MOVE_PREFERENCE_NOTE.',
  },

  /* -------------------------------------------------------------- excluded */

  {
    legacyType: 'recommendation',
    disposition: 'excluded',
    because:
      'Section 59 — the old move catalogue does not return as product truth. Importing ' +
      'these would make the old catalogue the object of every relationship this app learns.',
  },
  {
    legacyType: 'untreated-forecast',
    disposition: 'excluded',
    because: 'Section 59 — Forecast 100 does not return.',
  },
  {
    legacyType: 'intervention-effect-prediction',
    disposition: 'excluded',
    because: 'Section 59 — the same forecasting machinery, one step further in.',
  },
  {
    legacyType: 'forecast-evaluation',
    disposition: 'excluded',
    because: 'Section 59 — an evaluation of a forecast that does not return.',
  },
  {
    legacyType: 'question',
    disposition: 'excluded',
    because: 'Section 59 — fixed guide questionnaires do not return.',
  },
  {
    legacyType: 'domain-preference',
    disposition: 'excluded',
    because:
      'Section 4.1 — whole-life model, no domain shutoff. This app has no state in which ' +
      'an area of the owner’s life is switched off, so there is nothing for the record to ' +
      'mean here.',
  },
  {
    legacyType: 'surface-permission',
    disposition: 'excluded',
    because: 'Section 59 — the old privacy toggle design does not return.',
  },

  /* ------------------------------------------------------------- undecided */

  {
    legacyType: 'life-context-change',
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
  readonly because: string
}[] = [
  {
    attribute: 'state:mood',
    because:
      'D-091 invariant 6 by name. Mood, stress, confidence and overwhelm are four things, ' +
      'and this app’s emotional state is one undivided dimension that is an open question ' +
      'for the owner. Pouring four scales into it is the wellness score he rules out.',
  },
  { attribute: 'state:stress', because: 'Same as state:mood.' },
  { attribute: 'state:confidence', because: 'Same as state:mood.' },
  { attribute: 'state:overwhelm', because: 'Same as state:mood.' },
  {
    attribute: 'state:physical-energy',
    because:
      'The old app split physical from mental energy precisely because averaging them ' +
      'loses what would have chosen between them. Mapping both onto one energy concept ' +
      'would perform that averaging after the fact.',
  },
  { attribute: 'state:mental-energy', because: 'Same as state:physical-energy.' },
  {
    attribute: 'state:loneliness',
    because:
      'Not social energy. It is a present state that can be high in a full house, and ' +
      'the two run in opposite directions.',
  },
  {
    attribute: 'state:financial-pressure',
    because:
      'The old app states outright that it is not a measure of how much money there is. ' +
      'This app’s cash buffer is a quantity, and a pressure reading is not one.',
  },
  {
    attribute: 'state:pain-interference',
    because:
      'Interference, not intensity — whether it is in the way. This app’s soreness ' +
      'concept reads as presence and severity, and the two answer different questions.',
  },
  {
    attribute: 'state:readiness',
    because: 'The old capacity taxonomy, which section 59 leaves behind.',
  },
  {
    attribute: 'state:retrieval-strength',
    because: 'How much came back without looking. There is no concept here for it yet.',
  },
  {
    attribute: 'context:available-minutes',
    because:
      'This app’s own registry declines to track usable time as a trend — it is noise ' +
      'with a timestamp, stale within hours by design. Importing years of it would add ' +
      'rows and no understanding.',
  },
  {
    attribute: 'sleep:bedtime',
    because:
      'A bedtime is not a duration. Deriving hours slept from bedtime and wake time ' +
      'would be this app computing a reading the old one never took, and presenting it ' +
      'as something the owner recorded.',
  },
  { attribute: 'sleep:wake-time', because: 'Same as sleep:bedtime.' },
  {
    attribute: 'father:together',
    because:
      'Time spent together is not whether a child is present. Reading one as the other ' +
      'would answer a custody question with an evening’s activity.',
  },
  {
    attribute: 'legacy:note',
    because:
      'Already the old app’s own passthrough for the generation before it. Mapping it ' +
      'here would promote text that has been unmapped twice.',
  },
]

const ATTRIBUTES_BY_NAME = new Map(ATTRIBUTE_RULES.map((rule) => [rule.legacyAttribute, rule]))

export function attributeRuleFor(attribute: string): AttributeRule | undefined {
  return ATTRIBUTES_BY_NAME.get(attribute)
}

const DECLINED_BY_NAME = new Map(
  DECLINED_ATTRIBUTES.map((entry) => [entry.attribute, entry.because]),
)

/** Why an attribute was not mapped, when somebody actually decided it. */
export function declinedReasonFor(attribute: string): string | undefined {
  return DECLINED_BY_NAME.get(attribute)
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
