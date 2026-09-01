import { createRecordFactory } from '../domain/build'
import { DOMAIN, type LifeDomainId } from '../domain/domains'
import type { EntityRef, SemanticEntity } from '../domain/entities'
import { newRecordId, type RecordId } from '../domain/ids'
import { mayReasonFrom, type PermissionState, type PrivacyClass } from '../domain/privacy'
import type { AimReadingRecord, Provenance } from '../domain/records'
import type { Instant, TimeZoneId } from '../domain/time'
import type { MemoryView } from '../memory/view'
import {
  PROVING_DOMAINS,
  proposeDestination,
  type AuthoringProposal,
  type DestinationDraft,
} from './authoring'
import type { Situation } from './situation'
import { isOwnerNamed } from './vocabulary'

/**
 * Reading the words the owner types — routing 91, package 91.1.
 *
 * ## The finding this answers, in one sentence
 *
 * *"Nothing anywhere reads owner text for meaning."* `ROUTING_91_BRIEF.md`
 * section 2 verified it against the tree: `advisor.ts` scans the app's **own**
 * generated wording, `corrections.ts` lowercases one character for grammar,
 * `coverage.ts` lowercases a domain label for a sentence. The whole of
 * interpretation was `const aim = draft.aim.trim()`, and the domain came from
 * the prompt that was asked rather than from anything the words said. So the
 * owner typed *"More money"* under the Career question and the app filed a
 * Career string.
 *
 * ## What this is not
 *
 * **Not a model, and not a network call.** D-025 blocks the call to a model, not
 * interpretation, and the brief's finding stands: the only `fetch` in `src/` is
 * a same-origin `build-info.json` read. Everything here is a table and a word
 * boundary, it runs in-process, and it is deterministic — the same words give
 * the same reading on every device, forever, which is what makes a test of it
 * worth anything.
 *
 * **Not inference over history.** A reading is a function of *these words* and
 * of the things the owner has already named. It never looks at what he did last
 * month; that is routing 97 and it is held by D-172.
 *
 * **Not a score.** D-162. There is no confidence number here, no strength
 * percentage and nothing that could be turned into one — a reading either names
 * an area or it does not, and where two areas are named equally the reading says
 * it has not decided rather than picking by a decimal place.
 *
 * ## The seven rules, and where each is kept
 *
 * 1. **Proposed, never asserted.** Nothing in this file writes anything.
 *    {@link proposeInterpretedDestination} returns the same `AuthoringProposal`
 *    every other authoring path returns, and the surface writes only after the
 *    owner has agreed.
 * 2. **His wording survives byte-identically.** {@link AimReading.words} is the
 *    string it was given, untouched. Matching happens on a lower-cased *copy*
 *    that never leaves this file, and the aim that reaches
 *    `destinationRecords` is the owner's own string.
 * 3. **A derived meaning is a sibling row.** `aim-reading` is its own record
 *    kind with `provenance.source: 'derived'`, pointing at the record holding
 *    his words (D-143). It never replaces it and never edits it.
 * 4. **Cross-domain meaning is proposed or clarified, never assumed.** The
 *    reading produces an *offer* — {@link AimReading.elsewhere} — and the aim is
 *    filed where he was asked unless he takes it.
 * 5. **Unknowns are explicit.** {@link AimReading.unknowns} is what the words did
 *    not say, and each entry is there because a predicate over the words
 *    returned false rather than because a table listed it.
 * 6. **The private boundary is D-167's.** {@link interpreterInput} is the only
 *    door into this file, and what it may put behind that door is decided by
 *    `mayReasonFrom` — the same function the decision layer uses. With the
 *    permission off, a private thing's name is not in the digest, and
 *    {@link InterpreterInput.withheld} counts what was kept out so a test can
 *    prove the probe would have found it.
 * 7. **No score.** See above.
 */

// ---------------------------------------------------------------------------
// What the interpreter is allowed to see
// ---------------------------------------------------------------------------

/**
 * One piece of owner text the interpreter was handed.
 *
 * A record of what went **in**, which is a different thing from what came out
 * and is the only honest way to check a negative. Acceptance test 8 asks for
 * *"no private text reaches the interpreter, proved by asserting the digest's
 * contents rather than by reading copy"* — this is that digest, and it is a
 * value the product itself carries rather than something a test reconstructs.
 */
export interface InterpreterSource {
  /** `typed` is what he just wrote; `named-thing` is something he named before. */
  readonly from: 'typed' | 'named-thing'
  /** The text itself, exactly as it is stored. */
  readonly text: string
  /** The area it belongs to, where it belongs to one. */
  readonly domain: LifeDomainId | undefined
  readonly privacy: PrivacyClass
}

export interface InterpreterInput {
  /** The area the question that drew the words was about. */
  readonly askedIn: LifeDomainId
  /** Everything the interpreter may read, and nothing else. */
  readonly digest: readonly InterpreterSource[]
  /**
   * How many of the owner's own named things the permission kept out.
   *
   * **The positive control, built into the product** — D-238's second corollary.
   * *"A negative claim needs an instrument that could have returned a
   * positive."* A test asserting that no private name is in `digest` proves
   * nothing on a store that has no private names in it; this number is
   * non-zero exactly when there was something to exclude, so the same assertion
   * can be run twice — permission off and permission on — and the two answers
   * differ. It is a count of things withheld and never any of their text.
   */
  readonly withheld: number
}

/**
 * The shortest name worth matching against.
 *
 * Two characters would match a person called *Jo* inside *job*, and a
 * word-boundary search is not enough on its own to make a very short label
 * useful — it is enough to make it dangerous. Three is where a label starts
 * being a name rather than a fragment.
 */
const SHORTEST_NAME = 3

/**
 * What the interpreter may read, assembled at the one door into this file.
 *
 * The owner's own named things are here because they are the strongest signal
 * available and the only one that is about *him*: *"Finish the CCNA"* names
 * Career because the CCNA is a learning topic he created, not because a table
 * of words guessed it. `vocabulary.ts`'s rule is untouched — the engine may name
 * its own routines and may never name the owner's life — because nothing here
 * names anything. It recognises what he has already named.
 *
 * **And this is where D-167 lands.** A private entity's label is a thing he
 * wrote in his private area, so it is exactly what the permission governs, and
 * the check is `mayReasonFrom` rather than a comparison written here: one
 * boundary, in `privacy.ts`, with this as a caller.
 */
export function interpreterInput(
  words: string,
  askedIn: LifeDomainId,
  entities: readonly SemanticEntity[],
  permissions: PermissionState,
): InterpreterInput {
  const digest: InterpreterSource[] = [
    { from: 'typed', text: words, domain: askedIn, privacy: 'normal' },
  ]
  let withheld = 0

  for (const entity of entities) {
    if (!isOwnerNamed(entity)) continue
    if (entity.label.trim().length < SHORTEST_NAME) continue
    if (!mayReasonFrom(entity.privacy, permissions)) {
      withheld += 1
      continue
    }
    digest.push({
      from: 'named-thing',
      text: entity.label,
      domain: entity.domain,
      privacy: entity.privacy,
    })
  }

  return { askedIn, digest, withheld }
}

// ---------------------------------------------------------------------------
// The words that name an area
// ---------------------------------------------------------------------------

/**
 * The areas a reading may name, and why it is these three.
 *
 * The same three the aspiration question is asked in and the same three a
 * destination control is offered in (`PROVING_DOMAINS`). Naming a fourth would
 * be an offer the product cannot honour: there is no aspiration prompt in Faith,
 * no destination control on its page, and no generator that could turn one into
 * anything on Now. **Widening this is routing 92's, and 94's** — the phase brief
 * is explicit that no vocabulary may be widened here beyond what the interpreter
 * itself needs.
 */
export const READABLE_AREAS: readonly LifeDomainId[] = PROVING_DOMAINS

/**
 * The words that name an area, per area.
 *
 * A table rather than a cleverness, for the reason every other table in this
 * codebase is one: what it recognises is legible, arguable and testable, and a
 * word nobody thought of is a missing row rather than a mystery. Each entry is
 * matched on a **word boundary** against a lower-cased copy of what he typed —
 * so *"earnings"* matches `earn` only because `earn` is listed with its own
 * forms, and *"learn"* never matches it.
 *
 * Deliberately conservative. A word that names two areas at once — *work*,
 * *training* — is in neither list, because a marker that fires on both sides
 * adds noise to the one decision this table exists to make.
 */
const MARKERS: Readonly<Record<string, readonly string[]>> = {
  [DOMAIN.money]: [
    'money',
    'cash',
    'salary',
    'salaries',
    'wage',
    'wages',
    'income',
    'earn',
    'earns',
    'earning',
    'earnings',
    'save',
    'saves',
    'saving',
    'savings',
    'debt',
    'debts',
    'loan',
    'loans',
    'mortgage',
    'rent',
    'bill',
    'bills',
    'budget',
    'budgets',
    'budgeting',
    'afford',
    'overdraft',
    'pension',
    'invest',
    'investing',
    'investment',
    'investments',
    'financial',
    'financially',
    'finances',
    'skint',
    'broke',
    'payrise',
    'overdrawn',
  ],
  [DOMAIN.career]: [
    'job',
    'jobs',
    'career',
    'careers',
    'promotion',
    'promoted',
    'qualification',
    'qualifications',
    'qualified',
    'certification',
    'certifications',
    'certificate',
    'cert',
    'certs',
    'degree',
    'diploma',
    'apprenticeship',
    'course',
    'courses',
    'study',
    'studying',
    'studies',
    'revise',
    'revision',
    'learn',
    'learning',
    'skill',
    'skills',
    'employable',
    'employed',
    'employment',
    'employer',
    'interview',
    'interviews',
    'exam',
    'exams',
    'hired',
    'hiring',
    'promotable',
  ],
  [DOMAIN.health]: [
    'fit',
    'fitter',
    'fitness',
    'gym',
    'lift',
    'lifting',
    'run',
    'runs',
    'running',
    'walk',
    'walks',
    'walking',
    'jog',
    'jogging',
    'swim',
    'swimming',
    'cycle',
    'cycling',
    'workout',
    'workouts',
    'exercise',
    'exercising',
    'cardio',
    'strong',
    'stronger',
    'strength',
    'stamina',
    'muscle',
    'muscles',
    'healthy',
    'healthier',
    'health',
    'mobility',
    'knees',
    'injury',
    'weight',
    '5k',
    '10k',
    'marathon',
    'pressups',
    'pushups',
  ],
}

/** The markers that separate *earning more* from *keeping more of it*. */
const EARNING_SIDE = ['earn', 'earns', 'earning', 'earnings', 'salary', 'wage', 'wages', 'income']
const KEEPING_SIDE = [
  'save',
  'saves',
  'saving',
  'savings',
  'debt',
  'debts',
  'budget',
  'budgets',
  'budgeting',
  'overdraft',
  'overdrawn',
  'afford',
]

/** The markers that separate *the work* from *the qualification*. */
const WORK_SIDE = ['job', 'jobs', 'promotion', 'promoted', 'interview', 'interviews', 'employer']
const STUDY_SIDE = [
  'qualification',
  'qualifications',
  'qualified',
  'certification',
  'certifications',
  'certificate',
  'cert',
  'certs',
  'degree',
  'diploma',
  'course',
  'courses',
  'study',
  'studying',
  'exam',
  'exams',
]

/** Health words that are something to **do** rather than something to **be**. */
const DOING_SIDE = [
  'gym',
  'lift',
  'lifting',
  'run',
  'runs',
  'running',
  'walk',
  'walks',
  'walking',
  'jog',
  'jogging',
  'swim',
  'swimming',
  'cycle',
  'cycling',
  'workout',
  'workouts',
  'exercise',
  'exercising',
  'cardio',
  'marathon',
  '5k',
  '10k',
  'pressups',
  'pushups',
]

/** Enough of a date for the app to stop saying it does not know when. */
const HORIZON = [
  'today',
  'tonight',
  'tomorrow',
  'week',
  'weeks',
  'month',
  'months',
  'year',
  'years',
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
  'summer',
  'autumn',
  'winter',
  'spring',
  'christmas',
]

function escape(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * The word-boundary matcher for one word, built once.
 *
 * This runs on every keystroke in the aspiration box, over every marker in the
 * table and every thing the owner has named. Compiling a pattern per word per
 * keystroke is the kind of cost that is invisible on the near-empty store the
 * tests use and is typing lag on a real one, so the patterns are cached by the
 * word they came from — which is a closed set for the table and a slowly
 * growing one for his own names.
 */
const PATTERNS = new Map<string, RegExp>()

function pattern(word: string): RegExp {
  const held = PATTERNS.get(word)
  if (held !== undefined) return held
  const made = new RegExp(String.raw`\b` + escape(word) + String.raw`\b`)
  PATTERNS.set(word, made)
  return made
}

/**
 * Whether one of these words is in the text, as a word.
 *
 * `\b` on both sides, because a substring search reported a twelfth domain as
 * *built* in routing 90 for exactly this reason: `invalidating` contains
 * `dating`. Here it would be worse than a false report — *learn* inside
 * *learning* is fine and wanted, but *cert* inside *concert* is a career
 * reading of an evening out.
 */
function hits(text: string, words: readonly string[]): readonly string[] {
  const found: string[] = []
  for (const word of words) {
    // The cheap test first: a boundary match is a subset of a substring match,
    // and on a store with a few hundred named things the substring check is
    // what keeps the expensive one off nearly every word.
    if (!text.includes(word)) continue
    if (pattern(word).test(text)) found.push(word)
  }
  return found
}

/** A number, in figures or as a currency amount. */
function saysHowMuch(text: string): boolean {
  return /\d/.test(text) || /[£$€]/.test(text)
}

// ---------------------------------------------------------------------------
// The reading
// ---------------------------------------------------------------------------

/** One area the words name, and what named it. */
export interface NamedArea {
  readonly domain: LifeDomainId
  /** The words that named it, in the order they appear in the table. */
  readonly by: readonly string[]
  /** True when it was one of the owner's own named things that named it. */
  readonly byOwnThing: boolean
}

export interface AimReading {
  /**
   * The string this file was handed, byte for byte.
   *
   * Nothing here trims it, lower-cases it, reorders it or edits it: matching
   * happens on a lower-cased copy that never leaves this module. A surface that
   * trims before it asks — every one of them does, because that is what gets
   * stored — is handing over the string it will store, which is the string this
   * has to be identical to.
   */
  readonly words: string
  readonly askedIn: LifeDomainId
  /** Every area the words name, strongest first. Empty is an ordinary answer. */
  readonly names: readonly NamedArea[]
  /**
   * The area the words are read as being about, when one is clearly ahead.
   *
   * Never the area he was asked about — this is the cross-domain reading and
   * nothing else. Set only when exactly one other area leads, and leads the
   * asked area too. Two areas naming the words equally leaves this undefined
   * and {@link undecided} true, because picking between them by registry order
   * would be resolving an ambiguity by alphabet.
   */
  readonly elsewhere: LifeDomainId | undefined
  /**
   * The area on the offer row, which is not always {@link elsewhere}.
   *
   * When the words name the asked area **and** one other equally, there is no
   * confident reading and there is still exactly one sensible question to put:
   * *this one, or that one?* That is acceptance test 1's second half — *"names
   * Money, **or asks which**"* — and it is why the offer and the reading are
   * two fields. Undefined when two areas other than the asked one tie, because
   * then there is no single question either.
   */
  readonly offer: LifeDomainId | undefined
  /** The words point at more than one area and none of them wins. */
  readonly undecided: boolean
  /** What the words did not say. */
  readonly unknowns: readonly string[]
  /** What the interpreter was handed, for a test that needs to assert on it. */
  readonly input: InterpreterInput
}

/**
 * What the words name, and what they leave open.
 *
 * ## The order of the two signals, and why it is this order
 *
 * A thing the owner has already named beats a word from the table, always. The
 * table is the app's guess about English; a `learning-topic` called *CCNA* is
 * the owner's own statement about his life, and where the two disagree the one
 * that came from him wins. That is section 4.6's preference for specificity
 * expressed as a precedence rule rather than as an intention.
 *
 * ## Why an empty reading is a normal answer
 *
 * *"Be someone she is proud of"* names none of the three areas, and the honest
 * thing is to say so: the aim is filed where he was asked, no reading is
 * written, no clarification is invented, and nothing pretends to have
 * understood. Half of what this function does is decline.
 */
export function readAim(input: InterpreterInput): AimReading {
  const typed = input.digest.find((source) => source.from === 'typed')?.text ?? ''
  const haystack = typed.toLowerCase()

  const byOwnThing = new Map<LifeDomainId, string[]>()
  for (const source of input.digest) {
    if (source.from !== 'named-thing') continue
    const domain = source.domain
    if (domain === undefined || !READABLE_AREAS.includes(domain)) continue
    if (hits(haystack, [source.text.toLowerCase()]).length === 0) continue
    const held = byOwnThing.get(domain)
    if (held === undefined) byOwnThing.set(domain, [source.text])
    else if (!held.includes(source.text)) held.push(source.text)
  }

  const names: NamedArea[] = []
  for (const domain of READABLE_AREAS) {
    const own = byOwnThing.get(domain)
    if (own !== undefined) {
      names.push({ domain, by: own, byOwnThing: true })
      continue
    }
    const found = hits(haystack, MARKERS[domain] ?? [])
    if (found.length > 0) names.push({ domain, by: found, byOwnThing: false })
  }

  /*
   * Strength, with no number attached to it — D-162.
   *
   * Ordering is not scoring: nothing here is stored, rendered or comparable
   * across two different readings. It is a sort key that exists for the length
   * of this function, and the only question it answers is *"is one of these
   * clearly ahead of the others?"*.
   */
  const rank = (area: NamedArea) => (area.byOwnThing ? 1000 : 0) + area.by.length
  const ordered = [...names].sort((left, right) => rank(right) - rank(left))

  const others = ordered.filter((area) => area.domain !== input.askedIn)
  const asked = ordered.find((area) => area.domain === input.askedIn)
  const leader = others[0]

  /*
   * One question, or none — never two.
   *
   * `offer` is the area a re-file row would name, and it exists only where
   * there is a single candidate to name. Where two areas other than the asked
   * one are named equally, there is no one question to put, so nothing is
   * offered and the draw is declared in `unknowns` instead. That is the whole
   * of accommodation row B1's *"one option row, not a picker screen"*, decided
   * here rather than by a surface truncating a list.
   */
  const askedRank = asked === undefined ? 0 : rank(asked)
  const leaderRank = leader === undefined ? 0 : rank(leader)

  /*
   * And nothing is asked at all where the area he was asked about leads.
   *
   * *"Get qualified and study for the exams so I earn more"* under the Career
   * question mentions money once and is about Career three times over. Offering
   * to re-file it, or saying the app *"has not decided which"*, would be
   * manufacturing a doubt the words do not support — which is the same fault as
   * asserting a reading, pointing the other way.
   */
  const contested = leader !== undefined && leaderRank >= askedRank
  const topOthers = contested ? others.filter((area) => rank(area) === leaderRank) : []
  const offer = topOthers.length === 1 ? topOthers[0]?.domain : undefined
  const elsewhere = offer !== undefined && leaderRank > askedRank ? offer : undefined
  const undecided = contested && elsewhere === undefined

  return {
    words: typed,
    askedIn: input.askedIn,
    names: ordered,
    elsewhere,
    offer,
    undecided,
    unknowns: unknownsFrom(haystack, ordered, undecided),
    input,
  }
}

/**
 * What the words did not say, worked out from the words.
 *
 * Every entry is here because a predicate over the text returned false, which
 * is what makes this a reading rather than a canned list: *"Save £3,000 by
 * Christmas"* names Money and leaves **nothing** on this list, while *"More
 * money"* leaves all three. Acceptance test 3's own examples — an amount, a
 * horizon, income versus savings — are the three money rows below, and they are
 * the three that fire for the two words the gate is written about.
 */
function unknownsFrom(
  haystack: string,
  names: readonly NamedArea[],
  undecided: boolean,
): readonly string[] {
  const out: string[] = []

  /*
   * Which area, first, because it is the one that changes what everything else
   * means. Declared rather than resolved — the brief's rule 4 and acceptance
   * test 3 are the same rule seen from two sides.
   */
  if (undecided) out.push('which area this belongs to')
  if (names.length === 0) return out

  const named = new Set(names.map((area) => area.domain))
  const said = (words: readonly string[]) => hits(haystack, words).length > 0

  /*
   * An amount, a horizon, and then the discrimination the area turns on.
   *
   * The order is acceptance test 3's own — *"an amount, a horizon, income
   * versus savings"* — because a list of what was not concluded is read top
   * down and the two that are true of almost any aim belong above the one that
   * is specific to this one.
   */
  if (named.has(DOMAIN.money) && !saysHowMuch(haystack)) out.push('how much')
  if (!said(HORIZON)) out.push('by when')

  if (named.has(DOMAIN.money) && !said(EARNING_SIDE) && !said(KEEPING_SIDE)) {
    out.push('whether this is about earning more or keeping more of it')
  }

  if (named.has(DOMAIN.career) && !said(WORK_SIDE) && !said(STUDY_SIDE)) {
    out.push('whether this is about the work or about the qualification')
  }

  if (named.has(DOMAIN.health) && !said(DOING_SIDE)) {
    out.push('what you would actually be doing')
  }

  return out
}

// ---------------------------------------------------------------------------
// What the owner reads before he agrees
// ---------------------------------------------------------------------------

/**
 * The sentence naming what the words sound like, or nothing.
 *
 * Composed here rather than in the surface's JSX, which is QA-84-005's standing
 * lesson: *a sentence a surface builds inline is a sentence no test can hold to
 * what is actually written.* It is also the sentence that has to stay honest
 * about its own confidence, and the two shapes below are the two states this
 * file can actually be in — a clear reading, and a genuine draw.
 */
export function describeReading(
  reading: AimReading,
  area: (id: LifeDomainId) => string,
): string | undefined {
  const elsewhere = reading.elsewhere
  if (elsewhere !== undefined) {
    return `These words sound like they are about ${area(elsewhere)}, from ${listOf(
      quoted(reading.names.find((named) => named.domain === elsewhere)?.by ?? []),
    )}.`
  }
  if (reading.undecided) {
    return `These words point at ${listOf(
      reading.names.map((named) => area(named.domain)),
    )} — the app has not decided which.`
  }
  /*
   * The null case says nothing, and that is the point.
   *
   * An unambiguous phrase in the area it was asked about produces no reading
   * line, no offer and no clarification — the synthetic contract's own null
   * case. A sentence here saying *"these words are about Career, which is what
   * was asked"* would be the app narrating its own agreement, on a card whose
   * whole budget is one question.
   */
  return undefined
}

/** The two option rows, in the words of the choice they actually are — rule 4. */
export function describeOffer(
  reading: AimReading,
  area: (id: LifeDomainId) => string,
): { readonly keep: string; readonly refile: string } | undefined {
  const offer = reading.offer
  if (offer === undefined) return undefined
  return {
    keep: `Keep it in ${area(reading.askedIn)}`,
    refile: `File it in ${area(offer)} instead`,
  }
}

function quoted(words: readonly string[]): readonly string[] {
  return words.map((word) => `“${word}”`)
}

function listOf(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]!}`
}

/**
 * The reading for what the owner is typing right now, from the situation.
 *
 * The one convenience door, so that no surface assembles the digest itself and
 * quietly hands the interpreter something the permission excludes.
 */
export function readAimIn(words: string, askedIn: LifeDomainId, situation: Situation): AimReading {
  return readAim(interpreterInput(words, askedIn, situation.entities.all(), situation.permissions))
}

// ---------------------------------------------------------------------------
// The second producer of an AuthoringProposal — the brief's rule 1
// ---------------------------------------------------------------------------

/**
 * What naming an aspiration will do, when the words were read — routing 91.
 *
 * ## Why this is a second producer rather than a change to the first
 *
 * `proposeDestination` is D-188's, it is the contract every destination-authoring
 * surface already renders, and it deliberately *does not read the words*: its own
 * comment says so, and says whose job that is. Widening it would mean the one
 * function that promises to keep the aim in the prompt's own domain no longer
 * does, and every caller would inherit interpretation without asking for it.
 *
 * So this **composes** it. The interpretation sentence, the creates list and the
 * structural unknowns are D-188's, unchanged and still held by its own suite;
 * what this adds is what the words said, what they did not say, and — where the
 * owner took the offer — the plain statement that the aim is being filed
 * somewhere other than where he was asked.
 *
 * ## What is never in here
 *
 * A moved aim. `draft.domain` is where it will be filed, and it is the owner's
 * answer to the offer rather than the reading's conclusion: a surface that has
 * not been told otherwise passes `reading.askedIn`, which is the brief's rule 4
 * expressed as a default rather than as a warning in a comment.
 */
export function proposeInterpretedDestination(
  draft: DestinationDraft,
  reading: AimReading,
  situation: Situation,
): AuthoringProposal {
  const base = proposeDestination(draft, situation)
  const area = (id: LifeDomainId) => situation.domains.labelFor(id)
  const creates = [...base.creates]

  /*
   * The re-file said out loud, in the confirmation, before it happens.
   *
   * F04's rule is *"propose an interpretation, and confirm a consequential
   * relationship"*, and filing an answer to the Career question under Money is
   * as consequential as this card gets — it decides which page the aim appears
   * on and what kind of thing its next step becomes. So it is a line in
   * `creates`, which is the list the owner reads before he presses the button,
   * rather than something he finds out by not finding his aim where he put it.
   */
  if (draft.domain !== reading.askedIn) {
    creates.push(
      `it in ${area(draft.domain)} rather than ${area(reading.askedIn)}, which is where the question was`,
    )
  }

  /*
   * What the words did not say, before what the object does not have.
   *
   * The order is meaning. The first list is about *these words* and is the new
   * thing this phase can say; the second is D-188's, about the destination as
   * an object, and is the same for every aim ever typed. A reader who stops
   * after three items has still read the half that came from what he wrote.
   */
  const unknowns = [...reading.unknowns]
  for (const entry of base.unknowns) if (!unknowns.includes(entry)) unknowns.push(entry)

  return { ...base, creates, unknowns }
}

// ---------------------------------------------------------------------------
// The sibling row — the brief's rule 3, D-143
// ---------------------------------------------------------------------------

/**
 * Written by the app, and saying so — D-143, D-059.
 *
 * `source: 'derived'` is not decoration: `evidenceSourceOf` returns it unchanged
 * for a non-observation record, `isOwnerStated` is false for it, and every
 * surface that separates what he said from what the app worked out reads one of
 * those two. A reading written as `owner` would be the app putting words in his
 * mouth in the one field that exists to stop exactly that.
 */
export const INTERPRETATION_PROVENANCE: Provenance = { source: 'derived', writtenBy: 'interpret' }

export interface InterpretationMoment {
  readonly now: Instant
  readonly zone: TimeZoneId
  readonly recordedAt: Instant
  readonly nextId?: () => RecordId
}

/**
 * The row that says what the app read, beside the row that holds his words.
 *
 * It carries `reads` — the id of the destination record — so the sibling
 * relationship is a field rather than a convention, and `words` and `unknowns`
 * so the conclusion arrives with its grounds. D-143's closing rule is that *a
 * conclusion shown without its grounds is the app asking to be trusted*, and
 * this record is the storage shape of that sentence.
 */
export function aimReadingRecord(
  reading: AimReading,
  named: LifeDomainId,
  destination: EntityRef,
  reads: RecordId,
  moment: InterpretationMoment,
): AimReadingRecord {
  const build = createRecordFactory({
    zone: moment.zone,
    provenance: INTERPRETATION_PROVENANCE,
    ...(moment.nextId === undefined ? {} : { nextId: moment.nextId }),
  })
  const areas = [named, reading.askedIn].filter(
    (domain, index, all) => all.indexOf(domain) === index,
  )
  return build(
    'aim-reading',
    {
      occurredAt: moment.now,
      recordedAt: moment.recordedAt,
      id: moment.nextId?.() ?? newRecordId(),
      domains: areas,
      entities: [destination],
    },
    {
      destination,
      reads,
      named,
      askedIn: reading.askedIn,
      words: reading.names.find((area) => area.domain === named)?.by ?? [],
      unknowns: reading.unknowns,
    },
  )
}

/**
 * Taking a reading back, which supersedes it rather than deleting it.
 *
 * Acceptance test 7 asks for a cross-domain link that is *confirmable and
 * reversible*. Reversible here means what it means everywhere else in this
 * product: another record, pointing at the one it replaces, with the earlier one
 * still legible on Timeline. Nothing is edited and nothing disappears — what
 * changes is what the app reads from here on.
 */
export function withdrawAimReading(
  previous: AimReadingRecord,
  moment: InterpretationMoment,
): AimReadingRecord {
  const build = createRecordFactory({
    zone: moment.zone,
    provenance: INTERPRETATION_PROVENANCE,
    ...(moment.nextId === undefined ? {} : { nextId: moment.nextId }),
  })
  return build(
    'aim-reading',
    {
      occurredAt: moment.now,
      recordedAt: moment.recordedAt,
      id: moment.nextId?.() ?? newRecordId(),
      domains: [...previous.domains],
      entities: [...previous.entities],
      privacy: previous.privacy,
      supersedes: previous.id,
    },
    {
      destination: previous.destination,
      reads: previous.reads,
      named: previous.named,
      askedIn: previous.askedIn,
      words: [...previous.words],
      unknowns: [...previous.unknowns],
      withdrawn: true,
    },
  )
}

/**
 * The reading that stands for a destination right now, or nothing.
 *
 * `history.effective` has already dropped anything superseded, so a withdrawn
 * reading arrives here as the withdrawal row and is answered with `undefined`.
 * One function, because three surfaces and the discovery agenda all need the
 * same answer and three searches through the history would eventually be three
 * answers (D-178's discipline, applied to a lookup).
 */
export function readingFor(
  view: MemoryView,
  destination: EntityRef,
  now: Instant,
): AimReadingRecord | undefined {
  let found: AimReadingRecord | undefined
  for (const record of view.history.effective) {
    if (record.kind !== 'aim-reading') continue
    if (record.destination.id !== destination.id) continue
    if (record.occurredAt > now) continue
    found = record
  }
  return found === undefined || found.withdrawn === true ? undefined : found
}
