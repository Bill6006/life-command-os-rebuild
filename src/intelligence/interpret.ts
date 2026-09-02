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
 * a same-origin `build-info.json` read. Everything here is a table, a word
 * boundary, one clause-scoped denial and one test of what a number is; it runs
 * in-process, and it is deterministic — the same words give the same reading on
 * every device, forever, which is what makes a test of it worth anything.
 *
 * **And it is not a parser, which is the bound it is held to.** QA round 1 found
 * it counting tokens without the role that gives them meaning: *"Not about money
 * at all"* named Money, and `2027` was read as an amount while the horizon stayed
 * unknown (QA-91-003, D-247). What that bought is two more questions it knows how
 * to ask of a token — is this denied, and is this a year — and nothing else. A
 * phrase it cannot read still names nothing, offers nothing and writes nothing,
 * and **abstaining is the ordinary outcome rather than the failure case**.
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
    /*
     * A destination is never evidence about words — QA-91-001.
     *
     * `destinationRecords` writes an entity whose **label is the aim**, so the
     * moment *"More money"* is stored, reading those same words again finds a
     * thing the owner *"named"* in Career called *More money* — and an
     * owner-named thing outranks every word in the table. The app was citing
     * its own record of his sentence as independent evidence about that
     * sentence, which named the area the aim was already filed in and drowned
     * the reading that had just been offered. The visible effect was that
     * declining consumed the offer for good.
     *
     * By kind rather than by comparing the label to the phrase, because
     * comparing strings would also throw away the honest case where he types
     * the exact name of a skill he has. D-188's own argument is the reason this
     * is the right cut: a person, a place and a routine are things he **has**;
     * a destination is what they are **for**, and it is not a thing in the
     * world for words to be about.
     */
    if (entity.kind === 'destination') continue
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
    // The participle beside its noun, which is how a person says it — the
    // probe for QA-91-010 found *"getting certified"* naming nothing at all,
    // with no denial in the sentence. A gap in the lexicon rather than in the
    // scope instrument, and it is listed here because that is what this table
    // is for.
    'certified',
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

/**
 * Where the owner says the words are **not** about something — QA-91-003.
 *
 * ## The finding, and why the obvious fix is wrong
 *
 * *"Not about money at all"* named Money and offered to file it there: the
 * interpreter counted the token and never asked what the sentence did with it.
 * The obvious repair — cancel a marker that has a negator anywhere near it —
 * breaks the ordinary case immediately. **"No more debt"** is negated and *is*
 * about money: he wants none of the debt, not none of the subject.
 *
 * So what is recognised here is narrow and is the only shape that actually
 * denies the subject: a negation of **aboutness**. *Not about X*, *nothing to
 * do with X*. Everything else — *no more*, *never*, *stop* — negates the thing
 * rather than the topic, and is left alone.
 *
 * ## What a denial governs, and the four rounds it took to ask the right question
 *
 * The first three versions all asked *"where does the denied span end?"* and
 * answered with a boundary: first `and`, then commas, then commas qualified by a
 * closed list of words a clause might begin with. QA-91-010 broke the third the
 * same way the first two broke — *"Not about money, certification is the real
 * goal"* begins its clause with a noun, and nouns cannot be enumerated. **A
 * fifth list would have failed at the next ordinary subject.**
 *
 * The question was wrong. A denial of aboutness is about a **topic**, and in
 * this interpreter a topic is an area. *"It is not about money"* says nothing
 * whatever about fitness, wherever the sentence goes next and whatever it starts
 * that clause with. So the scope is not a span of characters to be terminated —
 * it is **an area to be cancelled**:
 *
 * 1. A denial names the area of the first marker that follows it.
 * 2. Inside its reach it cancels markers **of that area**.
 * 3. It cancels a marker of a *different* area only where that marker is
 *    directly coordinated with the last thing cancelled — no comma between them
 *    — because *"not about money or fitness"* really does deny both.
 * 4. Its reach ends at a contrastive conjunction or at sentence-ending
 *    punctuation, so *"not about the salary, but about the pension"* can still
 *    assert an area it has just denied.
 *
 * **This deletes a closed list rather than extending one.** There is no list of
 * subject words any more, and there is nothing to extend at the next grammar
 * form: a noun, a gerund, a colon, a question mark and an exclamation all work
 * for the same reason, which is that none of them is Money.
 *
 * ## The bound, said plainly
 *
 * A denial and a same-area assertion in one sentence with no contrastive word —
 * *"Not about money, savings is what I mean"* — is read as denying both, and the
 * interpreter abstains. That is a false negative, and it is the direction this
 * file errs in everywhere: an unread phrase names nothing, offers nothing and
 * writes nothing.
 */
const DENIERS = [
  'not about',
  'nothing to do with',
  'not to do with',
  "isn't about",
  'is not about',
  'not really about',
  'never about',
]

/**
 * What ends a denial, and what merely continues it — QA-91-007, QA-91-008.
 *
 * ## Two rounds, two halves of the same question
 *
 * The first version ended a denied span at `and`, which reads *"Not about money
 * and debt"* as a denial of money followed by a fresh claim about debt. It is
 * not: one negation governs two coordinated objects and denies both. So `and`
 * and `or` continue a denial.
 *
 * QA-91-008 found the same fault wearing punctuation. **Every comma ended the
 * span**, so *"Not about money, debt, or savings"* denied only the money and
 * then read *debt* and *savings* as positive evidence for it. A comma between
 * coordinated items is not a clause boundary; it is the same list with a
 * different separator.
 *
 * ## And why the obvious fix is wrong in the other direction
 *
 * Making every comma continue a denial reverses the defect rather than removing
 * it: *"Not about money, it's about the qualification"* would deny the Career
 * half too, and the app would abstain from a sentence that says plainly what it
 * is about.
 *
 * So a comma ends a denial **only when a clause actually starts after it** —
 * a contrastive conjunction, or a subject pronoun. Both lists are closed and
 * short, and neither is a list of phrases: what they recognise is the grammar
 * that turns a sentence, not the words somebody remembered. Punctuation that
 * genuinely ends a sentence — a full stop, a semicolon, a dash — always ends a
 * denial, and so does a contrastive conjunction with no comma in front of it.
 *
 * **The bound, said plainly.** A sentence that resumes a positive claim with no
 * punctuation and no opener — *"Not about money savings or a pension fund"* —
 * is denied to the end and names nothing. That is a false negative, and it is
 * the direction this file errs in everywhere: an unread phrase names nothing,
 * offers nothing and writes nothing, and abstaining is the ordinary outcome
 * rather than the failure case.
 */
const CONTRASTIVE = ['but', 'though', 'rather', 'instead', 'however', 'yet']

/** Punctuation that ends a sentence, and therefore ends a denial's reach. */
const SENTENCE_END = [';', '.', '!', '?', ':', '—', '–']

/** How far a denial can reach, before any question of what it cancels. */
function reachOfDenial(rest: string): number {
  for (let at = 0; at < rest.length; at += 1) {
    const char = rest[at]
    if (char !== undefined && SENTENCE_END.includes(char)) return at
    if (char === '-' && rest[at - 1] === ' ' && rest[at + 1] === ' ') return at
    if (char === ' ') {
      const from = rest.slice(at + 1)
      if (
        CONTRASTIVE.some((word) => new RegExp(String.raw`^` + word + String.raw`\b`).test(from))
      ) {
        return at
      }
    }
  }
  return rest.length
}

/** One occurrence of one marker, with where it sits and what it names. */
interface Mention {
  readonly domain: LifeDomainId
  readonly word: string
  readonly at: number
  readonly to: number
  readonly byOwnThing: boolean
}

/**
 * Every marker in the phrase, in the order a reader meets them.
 *
 * Position is what the denial instrument needs and what the old one threw away:
 * `hits` returned words, so the only question that could be asked afterwards was
 * *"is this word inside a span?"*. Carrying the offsets lets the denial ask the
 * question it actually has, which is *which of these did he deny*.
 */
function mentions(haystack: string, digest: readonly InterpreterSource[]): readonly Mention[] {
  const found: Mention[] = []

  const add = (domain: LifeDomainId, word: string, byOwnThing: boolean) => {
    const pattern = new RegExp(String.raw`\b` + escape(word) + String.raw`\b`, 'g')
    for (;;) {
      const match = pattern.exec(haystack)
      if (match === null) break
      found.push({ domain, word, at: match.index, to: match.index + match[0].length, byOwnThing })
    }
  }

  for (const source of digest) {
    if (source.from !== 'named-thing') continue
    const domain = source.domain
    if (domain === undefined || !READABLE_AREAS.includes(domain)) continue
    add(domain, source.text.toLowerCase(), true)
  }
  for (const domain of READABLE_AREAS) {
    for (const word of MARKERS[domain] ?? []) {
      if (!haystack.includes(word)) continue
      add(domain, word, false)
    }
  }

  return found.sort((left, right) => left.at - right.at)
}

/**
 * The mentions the owner denied — QA-91-012.
 *
 * ## What the last two versions used instead of evidence
 *
 * Round 3 asked whether a comma stood between two markers. Round 4 asked whether
 * a comma stood between them **and** whether they named the same area. Both are
 * proxies for the thing that actually matters, and QA broke the second from both
 * sides in one round: *"Not about money, or fitness"* is one punctuated
 * coordination and was read as two, while *"Not about money because fitness is
 * the real goal"* is a denial followed by a clause and was read as one. **A
 * comma can sit inside a list, and a clause can begin without one.**
 *
 * ## What coordination actually looks like
 *
 * A coordinated list is joined by **coordinators** — *and*, *or*, *nor* — with
 * commas as separators between the items. That is the evidence, and it is what
 * is read here:
 *
 * 1. From the first marker after the denier, walk the markers in order. Two are
 *    in the same run only when the text between them is nothing but list
 *    material: whitespace, commas, coordinators and determiners. Anything else —
 *    a verb, a subordinator, a pronoun, a noun — ends the run, because a run of
 *    list material is what a list is made of.
 * 2. The list ends with the item the **last coordinator introduces**. In
 *    *"A, B, or C"* that is C, so all three are denied; in *"A and B, C is the
 *    goal"* it is B, so C is outside and is asserted.
 * 3. With no coordinator anywhere in the run, the denial covers its first marker
 *    alone — which is what *"not about money"* means on its own.
 *
 * **Area is no longer consulted at all.** Round 4 needed it because it had no
 * way to tell a list from a clause; with coordination read directly, the area
 * rule is redundant and is gone. So is the comma test.
 *
 * ## The bound, said plainly
 *
 * An asyndetic list — *"not about money, debt, savings"* with no *and* or *or*
 * anywhere — is read as denying only the first item, and the rest are asserted.
 * That is the direction this file errs in everywhere: it declines to conclude
 * from evidence it has not got, rather than treating a comma as though it were
 * a conjunction.
 */
const COORDINATORS = ['and', 'or', 'nor']

/** What may stand in front of an item without being one. */
const DETERMINERS = ['the', 'a', 'an', 'my', 'our', 'any', 'some']

/** Words that can sit inside a list without ending it. */
const LIST_FILLER = [...COORDINATORS, ...DETERMINERS]

/**
 * Whether the text between two markers is nothing but list material, and
 * whether a coordinator was part of it.
 */
function listLink(between: string): { readonly links: boolean; readonly coordinates: boolean } {
  const words = between.split(/[\s,]+/).filter((word) => word !== '')
  const links = words.every((word) => LIST_FILLER.includes(word))
  return { links, coordinates: links && words.some((word) => COORDINATORS.includes(word)) }
}

/**
 * Whether a coordinator introduces what comes next, across determiners only.
 *
 * *", or certification"* is a coordinator introducing an item. *"and I want
 * fitness"* is a coordinator followed by a clause, and the words in between are
 * what say so.
 */
function introducedByCoordinator(between: string): boolean {
  const words = between.split(/[\s,]+/).filter((word) => word !== '')
  let end = words.length
  while (end > 0 && DETERMINERS.includes(words[end - 1]!)) end -= 1
  return end > 0 && COORDINATORS.includes(words[end - 1]!)
}

interface DenialReading {
  readonly denied: ReadonlySet<Mention>
  /**
   * Mentions inside a denial whose place in it could not be established.
   *
   * Neither denied nor asserted: the instrument saw a list it could not follow
   * and declines to say which side of the denial these fall on.
   */
  readonly unstructured: ReadonlySet<Mention>
}

function deniedMentions(haystack: string, all: readonly Mention[]): DenialReading {
  const denied = new Set<Mention>()
  const unstructured = new Set<Mention>()

  for (const denier of DENIERS) {
    let from = 0
    for (;;) {
      const at = haystack.indexOf(denier, from)
      if (at === -1) break
      const after = at + denier.length
      const until = after + reachOfDenial(haystack.slice(after))
      from = after

      const inside = all.filter((mention) => mention.at >= after && mention.at < until)
      if (inside.length === 0) continue

      // The run, and how far the coordination in it actually reaches.
      const run: Mention[] = [inside[0]!]
      let lastCoordinated = 0
      for (let index = 1; index < inside.length; index += 1) {
        const link = listLink(haystack.slice(inside[index - 1]!.to, inside[index]!.at))
        if (!link.links) break
        run.push(inside[index]!)
        if (link.coordinates) lastCoordinated = run.length - 1
      }

      for (let index = 0; index <= lastCoordinated; index += 1) denied.add(run[index]!)

      /*
       * And where the run stopped short of a coordinator, say nothing.
       *
       * *"Not about money, physical fitness, or certification"* is plainly one
       * list, and the run stops at `physical` because a modifier is not list
       * material. The `or` past the end of the run is the evidence that the list
       * did not stop where the instrument did.
       *
       * Reading those mentions as **asserted** would name two areas the owner
       * has just denied, which is the worse of the two mistakes. So they are
       * neither denied nor asserted: nothing is read from them at all, and a
       * phrase with nothing left over names no area, offers nothing and writes
       * no derived row — which is what abstaining looks like here.
       *
       * **And the bound, which is the price of it.** A clause that reaches a
       * coordinated pair — *"not about money, my real goal is fitness or
       * certification"* — breaks the run and carries an `or` past the break, so
       * the two asserted areas are withheld rather than named. That is a
       * reading lost, not a reading invented: the instrument goes quiet where it
       * cannot follow the sentence, and it never contradicts the owner.
       */
      let unfollowable = -1
      for (let index = run.length; index < inside.length; index += 1) {
        const between = haystack.slice(inside[index - 1]!.to, inside[index]!.at)
        if (introducedByCoordinator(between)) unfollowable = index
      }
      for (let index = run.length; index <= unfollowable; index += 1) {
        unstructured.add(inside[index]!)
      }
    }
  }

  return { denied, unstructured }
}

/**
 * What a number in the phrase is **for** — QA-91-013.
 *
 * ## Three versions of the same mistake
 *
 * Round 2 deleted matched date shapes and asked whether a digit was left. Round
 * 3 added shapes. Round 4 kept the shapes, called membership of the list a
 * *role*, propagated it across range connectors and defaulted everything else to
 * an amount. QA broke the third from both sides at once: an unlisted date became
 * money — *"by week 3 of 2027"* — and a date-shaped sum became time — *"save
 * 2027 dollars"*. **Membership of a surface-form list is not a role.**
 *
 * ## The evidence a role is actually read from
 *
 * A number's role is written next to it, in units:
 *
 * - an **amount unit** — a currency symbol, *dollars*, *k*, *percent* — makes it
 *   an amount, whatever shape it has. `2027 dollars` is a sum.
 * - a **temporal unit** — *week*, *month*, *quarter*, a month's name or its
 *   abbreviation, an ordinal suffix — makes it a date, whether or not anybody
 *   listed the form. `week 3` and `15 Mar` are dates.
 * - a **partitive** — an ordinal or a fraction followed by *of* something that
 *   is not itself temporal — makes it a quantity. `a 3rd of my salary` is not
 *   the third of the month.
 *
 * Units have to be **adjacent** to count, across nothing but list punctuation
 * and a closed set of connectors (*the*, *of*, *next*, *this*, *last*). That is
 * what separates *"17 next month"*, where the unit governs the number, from
 * *"17 by March"*, where it does not.
 *
 * ## Two weaker readings, and why they are marked as weaker
 *
 * A four-digit number in 1900–2199 **looks** like a year, and a number with no
 * unit at all is ordinarily a quantity. Both are read, and both are marked
 * `inferred`, because a guess may not be propagated: a connector carries a role
 * across a range only from a span whose role came from a unit. That is what
 * stops *"between 2027 and 3000"* becoming a date range on the strength of one
 * endpoint's shape.
 *
 * ## The bound, said plainly
 *
 * A number with no unit near it and no date shape is read as a quantity. That is
 * a default and it is named as one — but it is the last step rather than the
 * first, and it is what a number is when nothing says otherwise. Where the
 * evidence is genuinely absent the app still says so: `unknowns` carries *how
 * much* or *by when*, and nothing derived is written.
 */
const MONTH_NAMES = [
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
]

/** The same lexicon abbreviated, which is how a date is usually written short. */
const MONTH_WORDS = [...MONTH_NAMES, ...MONTH_NAMES.map((month) => month.slice(0, 3)), 'sept']

/** Units that make the number beside them a point or span of time. */
const TEMPORAL_UNITS = [
  'week',
  'weeks',
  'month',
  'months',
  'year',
  'years',
  'quarter',
  'quarters',
  'day',
  'days',
  'w',
  'q',
  ...MONTH_WORDS,
]

/** Units that make the number beside them a quantity, whatever shape it has. */
const AMOUNT_UNITS = [
  'dollar',
  'dollars',
  'pound',
  'pounds',
  'euro',
  'euros',
  'k',
  'grand',
  'percent',
  'pc',
]

/**
 * The words a unit may reach across, and nothing else.
 *
 * *"17 next month"* is governed by its unit and *"17 by March"* is not, and this
 * closed set is the whole of that difference. `by`, `to`, `for` and every other
 * preposition are deliberately absent: they introduce a separate phrase.
 */
const UNIT_LINK = ['the', 'of', 'next', 'this', 'last', 'each', 'every']

const RANGE_JOIN = ['–', '—', '-', 'to', 'and', 'through', 'until', 'thru']

function anyOf(words: readonly string[]): string {
  return words.map((word) => escape(word)).join('|')
}

const TOUCHES_BEFORE = new RegExp(
  String.raw`\b(${anyOf(TEMPORAL_UNITS)})\b[\s,\-]*(?:(?:${anyOf(UNIT_LINK)})[\s,\-]*)*$`,
)
const TOUCHES_AFTER = new RegExp(
  String.raw`^[\s,\-]*(?:(?:${anyOf(UNIT_LINK)})[\s,\-]*)*\b(${anyOf(TEMPORAL_UNITS)})\b`,
)
const AMOUNT_AFTER = new RegExp(String.raw`^[\s,\-]*\b(${anyOf(AMOUNT_UNITS)})\b`)
/**
 * A share taken *of* something, reached across a fraction's other half.
 *
 * `1/3 of my salary` has to be recognisable from the `1` as well as from the
 * `3`, or the first half of the fraction is left reading as a date.
 */
const PARTITIVE = new RegExp(
  String.raw`^(?:[/.]\d{1,2})?(?:st|nd|rd|th)?(?:\s+(?:${anyOf(TEMPORAL_UNITS)}))?\s+of\b`,
)

/**
 * Whether what follows *of* is itself a period of time.
 *
 * A share is only a quantity when it is a share of something untemporal. *A 3rd
 * of my salary* is a quantity; *the 3rd quarter of 2027* and *the 15th of March*
 * are dates, and the complement is what says so — a unit in one and a year in
 * the other, which is a shape rather than a word and so has to be read as one.
 */
function temporal(rest: string): boolean {
  return TOUCHES_AFTER.test(rest) || /^[\s,-]*(?:19|20|21)\d{2}\b/.test(rest)
}

type Role = 'date' | 'amount'

interface NumberSpan {
  readonly at: number
  readonly to: number
  role: Role
  /** `established` came from a unit; `inferred` is a shape or the default. */
  strength: 'established' | 'inferred'
}

const YEARISH = /^(?:19|20|21)\d{2}$/

/** Every number in the phrase, with the evidence for what it is doing there. */
function numberSpans(text: string): readonly NumberSpan[] {
  const spans: NumberSpan[] = []
  const digits = /\d+/g

  for (;;) {
    const match = digits.exec(text)
    if (match === null) break
    const at = match.index
    const to = at + match[0].length
    const before = text.slice(Math.max(0, at - 28), at)
    const after = text.slice(to, to + 28)

    /*
     * A fraction or an ordinal share taken *of* something untemporal is a
     * quantity — the third of a salary is not the third of a month.
     *
     * It is asked only where no temporal unit governs the number already.
     * `week 3 of 2027` is a date whose *of* introduces the year rather than a
     * share of anything, and that ordering is the whole difference between the
     * third of a salary and the third week of a year.
     */
    const share = PARTITIVE.exec(after)
    const partitive =
      share !== null && !TOUCHES_BEFORE.test(before) && !temporal(after.slice(share[0].length))

    // A unit is evidence and a shape is not, so the units are asked first.
    if (AMOUNT_AFTER.test(after) || /[£$€]\s*$/.test(before)) {
      spans.push({ at, to, role: 'amount', strength: 'established' })
      continue
    }
    if (partitive) {
      spans.push({ at, to, role: 'amount', strength: 'established' })
      continue
    }
    if (
      TOUCHES_BEFORE.test(before) ||
      TOUCHES_AFTER.test(after) ||
      /^(?:st|nd|rd|th)\b/.test(after)
    ) {
      spans.push({ at, to, role: 'date', strength: 'established' })
      continue
    }
    spans.push({
      at,
      to,
      role: YEARISH.test(match[0]) ? 'date' : 'amount',
      strength: 'inferred',
    })
  }

  writtenDates(text, spans)
  settleRanges(text, spans)
  return spans
}

/** The separators a written date is punctuated with, and nothing else. */
const DATE_PUNCTUATION = ['/', '-', '.']

/**
 * Numbers punctuated together into one written date.
 *
 * `03/15`, `15-03-2027` and `2027.03.15` are dates because of how they are
 * **punctuated**, not because anyone wrote those three orderings down. Two
 * things are read: the separator has to be immediate — one character, no spaces
 * — and the whole chain has to use the same one.
 *
 * A slash is never a range, so a slashed chain is a date at any length. A hyphen
 * and a full stop are ambiguous — `2000-3000` is a range and `15-03-2027` is a
 * date — so for those the evidence is **arity**: two numbers are the ends of a
 * range, three punctuated together are a date. That is the difference itself,
 * rather than a rule about which numbers look like years.
 *
 * A span whose role a unit already established is left alone, so `1/3 of my
 * salary` stays the quantity the partitive made it.
 */
function writtenDates(text: string, spans: NumberSpan[]): void {
  for (let index = 0; index < spans.length;) {
    const separator = text.slice(spans[index]!.to, spans[index + 1]?.at)
    if (!DATE_PUNCTUATION.includes(separator)) {
      index += 1
      continue
    }

    let end = index + 1
    while (end + 1 < spans.length && text.slice(spans[end]!.to, spans[end + 1]!.at) === separator) {
      end += 1
    }

    if (separator === '/' || end - index >= 2) {
      for (let part = index; part <= end; part += 1) {
        const span = spans[part]!
        if (span.strength === 'established') continue
        span.role = 'date'
        span.strength = 'established'
      }
    }
    index = end + 1
  }
}

const JOINED = new RegExp(
  String.raw`^(?:st|nd|rd|th)?[\s]*(?:${anyOf(RANGE_JOIN)})[\s]*(?:(?:${anyOf(UNIT_LINK)})[\s]*)*$`,
)

/**
 * The two ends of a range hold the same kind of thing.
 *
 * **A guess is never propagated.** An established role crosses the connector; two
 * inferred ones settle between themselves, and they settle as a quantity unless
 * both ends could be years — which is what keeps *"between 2027 and 3000"* a
 * pair of sums rather than a pair of dates.
 */
function settleRanges(text: string, spans: NumberSpan[]): void {
  for (let settled = false; !settled;) {
    settled = true
    for (let index = 1; index < spans.length; index += 1) {
      const left = spans[index - 1]!
      const right = spans[index]!
      if (!JOINED.test(text.slice(left.to, right.at))) continue

      const established = [left, right].filter((span) => span.strength === 'established')
      if (established.length === 1) {
        const known = established[0]!
        const other = known === left ? right : left
        if (other.role !== known.role) {
          other.role = known.role
          settled = false
        }
        continue
      }
      if (established.length > 0) continue

      const bothCouldBeYears = [left, right].every((span) =>
        YEARISH.test(text.slice(span.at, span.to)),
      )
      const role: Role = bothCouldBeYears ? left.role : 'amount'
      for (const span of [left, right]) {
        if (span.role === role) continue
        span.role = role
        settled = false
      }
    }
  }
}

/**
 * Whether the words say **how much**.
 *
 * A currency symbol is an amount wherever it stands. Otherwise it is whether any
 * number in the phrase was read as one.
 */
function saysHowMuch(text: string): boolean {
  if (/[£$€]/.test(text)) return true
  return numberSpans(text).some((span) => span.role === 'amount')
}

/** Whether the words say **by when**, in a word or in a number read as a date. */
function saysWhen(text: string): boolean {
  return hits(text, HORIZON).length > 0 || numberSpans(text).some((span) => span.role === 'date')
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

  /*
   * What he mentioned, then what he denied, then what is left.
   *
   * Three passes rather than one filter, because the denial instrument needs to
   * see the mentions **in order and with their positions** to answer *which area
   * did he deny*. `assertedHits` could only ever answer *is this word inside a
   * span*, which is the question four rounds of boundary repairs were stuck on.
   */
  const all = mentions(haystack, input.digest)
  const { denied, unstructured } = deniedMentions(haystack, all)
  const asserted = all.filter((mention) => !denied.has(mention) && !unstructured.has(mention))

  const byArea = new Map<LifeDomainId, { own: string[]; words: string[] }>()
  for (const mention of asserted) {
    const held = byArea.get(mention.domain) ?? { own: [], words: [] }
    const into = mention.byOwnThing ? held.own : held.words
    // The owner's own capitals for a thing he named; the table's word otherwise.
    const said = mention.byOwnThing
      ? (input.digest.find(
          (source) => source.from === 'named-thing' && source.text.toLowerCase() === mention.word,
        )?.text ?? mention.word)
      : mention.word
    if (!into.includes(said)) into.push(said)
    byArea.set(mention.domain, held)
  }

  const names: NamedArea[] = []
  for (const domain of READABLE_AREAS) {
    const held = byArea.get(domain)
    if (held === undefined) continue
    // A thing he named beats a word from the table, and where he named one the
    // table's words are not also listed as evidence for the same area.
    if (held.own.length > 0) names.push({ domain, by: held.own, byOwnThing: true })
    else if (held.words.length > 0) names.push({ domain, by: held.words, byOwnThing: false })
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
  if (!saysWhen(haystack)) out.push('by when')

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
