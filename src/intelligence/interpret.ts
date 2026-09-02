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
 * What the owner denied, and what this file refuses to guess — QA-91-018.
 *
 * ## Eight rounds, and the judgement that ends them
 *
 * Rounds 1 to 7 each built a bounded instrument to decide how far a denial
 * reaches, and independent QA broke every one of them with ordinary English —
 * on both sides of whatever distinction that round had drawn. Round 8 ruled the
 * repair shape exhausted, and it is right. The evidence is not that any one rule
 * was badly chosen; it is that seven successive rules, each sound about the
 * phrases it was shown, were each undone within a round by a sentence no one
 * would call unusual.
 *
 * So this stops trying. **The instrument now reads only what is demonstrably
 * closed, and asks the owner about the rest** — through the seam that already
 * exists for exactly this, which is `undecided` and the one question it puts.
 *
 * ## What is demonstrably closed
 *
 * Four cases, and nothing else:
 *
 * 1. **No denial at all.** Every marker is asserted. Nothing can be got wrong,
 *    and this is the overwhelming majority of what an owner types.
 * 2. **A denial with one marker in reach.** *"Not about money"* — there is
 *    nothing to apportion.
 * 3. **A denial whose markers are separated by nothing but list material** —
 *    whitespace, commas, coordinators, determiners. *"Not about money, or
 *    fitness"* and *"not about money, fitness, certification"* are lists by the
 *    only reading available, so all of them are denied.
 * 4. **A reach ended by punctuation or a contrastive.** `;` `.` `!` `?` `:` a
 *    dash, or *but*, *though*, *rather*, *instead*, *however*, *yet*. These are
 *    lexical and unambiguous, and no round has ever broken one.
 *
 * Anything else — a modifier inside the list, a clause with no punctuation in
 * front of it, an imperative, a relative — is **unresolved**. The markers in
 * that reach are neither denied nor asserted, and the reading says so.
 *
 * ## Why this is not Round 5's abstention, which QA was right to reject
 *
 * Round 5 also withheld markers it could not place. QA rejected it because it
 * withheld **silently**: the reading simply named fewer areas, and the owner was
 * never told a judgement had been skipped. The difference here is the whole
 * point — an unresolved scope **raises the question**. `unknowns` carries *which
 * area this belongs to*, the offer row puts the candidates in front of the
 * owner, and nothing derived is written until the owner picks.
 *
 * That is a smaller promise than seven rounds of parsers made, and it is one
 * this file can actually keep.
 */
const COORDINATORS = ['and', 'or', 'nor']

/** What may stand between two items of a list without being one. */
const LIST_FILLER = [...COORDINATORS, 'the', 'a', 'an', 'my', 'our', 'your', 'any', 'some', 'all']

/** Every word any area is marked by, for asking whether a token is one. */
const MARKER_WORDS = new Set(Object.values(MARKERS).flat())

/**
 * How one denier's reach falls out: what it denies, and whether it could tell.
 *
 * `unresolved` is not a failure to compute. It is the instrument declining to
 * apportion markers between a denial and whatever follows it, on evidence that
 * eight rounds have shown does not settle the question.
 */
interface DenialReading {
  readonly denied: ReadonlySet<Mention>
  readonly unresolved: ReadonlySet<Mention>
}

/** Whether the text between two markers is list material and nothing else. */
function onlyListMaterial(between: string): boolean {
  const words = between.split(/[\s,]+/).filter((word) => word !== '')
  return words.every((word) => LIST_FILLER.includes(word))
}

function deniedMentions(haystack: string, all: readonly Mention[]): DenialReading {
  const denied = new Set<Mention>()
  const unresolved = new Set<Mention>()

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

      /*
       * A reach is closed when it is a list and nothing but a list.
       *
       * Only list material between the markers — and only list material after
       * the last of them, because a word trailing the final item is where a
       * predicate hides. *"and fitness"* is a denied item; *"and fitness
       * counts"* is a clause, and nothing between the markers can tell them
       * apart. So the second one is a question.
       */
      const listed =
        inside.every(
          (mention, index) =>
            index === 0 || onlyListMaterial(haystack.slice(inside[index - 1]!.to, mention.at)),
        ) && onlyListMaterial(haystack.slice(inside[inside.length - 1]!.to, until))
      for (const mention of inside) (listed ? denied : unresolved).add(mention)
    }
  }

  return { denied, unresolved }
}

/**
 * What a number in the phrase is **for**, where that can be shown — QA-91-019.
 *
 * ## The same judgement, on the same evidence
 *
 * Rounds 2 to 7 read a number's role from date shapes, then units, then units
 * plus a governance window, then units plus a phrase boundary, then units plus a
 * required complement. Each was broken within a round: `week number 3`,
 * `2027 US dollars`, `save 3000 until 15 March`, `at least 3000`, `earn 50000
 * next year`. The last of those is the plainest — a sum and a time in one
 * sentence, and every version so far has given one of them the other's role.
 *
 * So the reading is now **adjacency, or nothing**:
 *
 * - a **currency symbol** on the number, either side — `£3000`, `2027€`;
 * - an **amount unit** as the very next token, or fused to the number itself —
 *   `2027 dollars`, `50k`, `10%`;
 * - a **money marker** as the token immediately before — `save 3000`, `earn
 *   50000`, which is the verb whose object the number is;
 * - a **temporal unit or month** as the token immediately before or after, with
 *   nothing at all between — `March 15`, `week 3`, `in 6 months`;
 * - a **written date** — a slashed chain, or three numbers punctuated together;
 * - a **year or a punctuated pair** standing straight after *by*, *before* or
 *   *until*, which is a slot only a time can fill.
 *
 * Nothing else. A number with a modifier between it and its unit, a share, a
 * range, a scalar bound, a denomination — every one of those is **unresolved**,
 * and an unresolved number settles neither *how much* nor *by when*. The owner
 * is asked instead of guessed at.
 *
 * ## And a horizon word belongs to the number beside it
 *
 * `saysWhen` used to read a horizon word wherever it stood, which is how *"save
 * 2 months salary"* claimed a deadline it had not been given: `months` is the
 * unit of the amount, not a date. A horizon word **touching a number** takes
 * that number's role, and only a free-standing one answers *by when* on its own.
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

/** Units that name a stretch or a point of time. */
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
  ...MONTH_WORDS,
]

/** Units that name a quantity, whatever shape the number beside them has. */
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

/** Prepositions that put what follows them in a time slot, wherever they stand. */
const ALWAYS_TEMPORAL = ['by', 'before', 'after', 'until', 'till', 'during', 'since']

const CURRENCY = /[£$€]/

/** What a span is doing, where the evidence beside it shows that at all. */
type Role = 'date' | 'amount' | 'unresolved'

interface NumberToken {
  readonly at: number
  readonly raw: string
  readonly role: Role
}

interface Token {
  readonly at: number
  readonly raw: string
  readonly word: string
}

function tokensOf(text: string): readonly Token[] {
  return [...text.matchAll(/\S+/g)].map((match) => ({
    at: match.index,
    raw: match[0],
    word: match[0]
      .toLowerCase()
      .replace(/^[^a-z0-9£$€%/]+/, '')
      .replace(/[^a-z0-9£$€%/]+$/, ''),
  }))
}

const YEARISH = /^(?:19|20|21)\d{2}$/
const SLASHED = /^\d{1,4}\/\d{1,2}(?:\/\d{1,4})?$/
const THREE_PART = /^\d{1,4}[-.]\d{1,2}[-.]\d{1,4}$/
const PUNCTUATED_PAIR = /^\d{1,4}[-./]\d{1,4}$/

/** Whether a token is, or ends in, a unit of the given kind. */
function unitToken(token: Token | undefined, units: readonly string[]): boolean {
  if (token === undefined) return false
  const bare = token.word.replace(/^\d+/, '')
  return units.includes(token.word) || (bare !== '' && units.includes(bare))
}

/**
 * What can point a unit at one moment, and what spreads an amount over it.
 *
 * Both closed, and both needed, because QA-91-021 broke adjacency from each
 * side at once: *"per calendar year"* is a wage and *"this March"* is a
 * deadline, and neither is settled by what is touching the number.
 */
const POINT_DEICTICS = ['next', 'this', 'last', 'coming', 'following', 'previous']
const DISTRIBUTIVE = ['a', 'an', 'each', 'every', 'per']

/**
 * Where an amount's phrase ends, besides a temporal preposition or a comma.
 *
 * The copula, the auxiliaries, the modals and the subject pronouns — closed
 * classes, and used here only to stop a money word reaching across a clause
 * into a number that is not its object.
 */
const CLAUSE_WORDS = [
  'is',
  'are',
  'was',
  'were',
  'am',
  'has',
  'have',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'shall',
  'should',
  'can',
  'could',
  'may',
  'might',
  'must',
  'i',
  'we',
  'you',
  'he',
  'she',
  'they',
  'it',
]

/**
 * The function words a measured noun can never be.
 *
 * *"3rd quarter **of** 2027"* puts a preposition after the unit, not the thing
 * being measured, so it is a date rather than a size.
 */
const FUNCTION_WORDS = [
  ...CLAUSE_WORDS,
  ...DISTRIBUTIVE,
  ...POINT_DEICTICS,
  'of',
  'in',
  'on',
  'at',
  'for',
  'to',
  'with',
  'and',
  'or',
  'the',
  'my',
  'our',
  'your',
  // The degree words that sit on a quantity without changing whose it is.
  'least',
  'most',
  'up',
  'about',
  'around',
  'over',
  'under',
  'nearly',
  'roughly',
  'almost',
]

/**
 * What can place a horizon word in time.
 *
 * A preposition that puts what follows it somewhere, or a deictic that points
 * at one moment. `per`, `full` and a bare number are not among them, which is
 * the whole of QA-91-021's too-wide half.
 */
const PLACERS = [...ALWAYS_TEMPORAL, 'in', 'on', 'at', 'of', ...POINT_DEICTICS]

/** Determiners, which stand between a placer and the word it places. */
const ARTICLES = ['the', 'a', 'an', 'my', 'our', 'your']

/** Day words that name a day on their own, with no preposition to place them. */
const STANDALONE_DAYS = ['today', 'tonight', 'tomorrow', 'yesterday']

/** Every number in the phrase, with the role its construction actually shows. */
function numberTokens(text: string): readonly NumberToken[] {
  const tokens = tokensOf(text)
  const numbers: NumberToken[] = []

  for (let index = 0; index < tokens.length; index += 1) {
    const here = tokens[index]!
    if (!/\d/.test(here.word)) continue
    numbers.push({ at: here.at, raw: here.word, role: roleOf(tokens, index) })
  }

  return numbers
}

/**
 * A temporal unit that is **measuring something** rather than dating anything.
 *
 * *"2 months salary"* and *"3 years rent"* put a noun after the unit, and that
 * noun is what is being measured: the number counts months, and the months
 * measure money. *"in 6 months"* has nothing after the unit, and *"15 Mar 2027"*
 * has another number, so neither of those is a measure.
 */
function measured(tokens: readonly Token[], unit: number): boolean {
  // `2 months of salary` and `2 months salary` are one relation, two spellings.
  const next = tokens[unit + 1]?.word === 'of' ? tokens[unit + 2] : tokens[unit + 1]
  if (next === undefined || next.word === '') return false
  if (/\d/.test(next.word)) return false
  if (FUNCTION_WORDS.includes(next.word)) return false
  return !unitToken(next, TEMPORAL_UNITS)
}

/**
 * A unit touching the number that is telling the time rather than measuring.
 *
 * A rate never reaches here: *"50000 a year"* and *"per calendar year"* always
 * put a determiner between the number and the unit, so the unit is not touching
 * it at all. That is why the rate is read in {@link saysWhen}, where the
 * question is what **placed** the word — and why the guard that used to sit here
 * against a distributive was removed as unreachable rather than kept unproved.
 */
function datesTheNumber(tokens: readonly Token[], index: number): boolean {
  const before = index - 1
  if (unitToken(tokens[before], TEMPORAL_UNITS)) return true
  const after = index + 1
  if (!unitToken(tokens[after], TEMPORAL_UNITS)) return false
  return !measured(tokens, after)
}

/**
 * A money word governing the number, earlier in the same stretch of phrase.
 *
 * *"save at least 3000"*, *"salary of 50000"*, *"a 3rd of my salary"* — the
 * owner has plainly said how much, and Round 8's one-token adjacency asked him
 * again anyway. The reach stops where the amount's phrase does: at a
 * preposition that puts what follows it in time, at a clause, and at a comma.
 */
function moneyGoverns(tokens: readonly Token[], index: number): boolean {
  /*
   * An ordinal says which one, not how many — unless it is a share.
   *
   * *"my 2nd salary payment"* identifies a payment and *"a 3rd of my salary"*
   * is a size, and what separates them is the `of`. Without it the money word
   * in front governs a noun the ordinal is picking out, not an amount.
   */
  const here = tokens[index]!
  if (/^\d+(?:st|nd|rd|th)$/.test(here.word) && tokens[index + 1]?.word !== 'of') return false

  return reaches(tokens, index, -1) || reaches(tokens, index, 1)
}

/**
 * Walk one way from the number looking for the money word it belongs to.
 *
 * Both ways, because English puts it on either side: *"save 3000"* and *"5000
 * of debt"* are the same relation read from opposite ends. The walk stops where
 * the amount's phrase does — a preposition that puts what follows it in time, a
 * clause, a comma, or any word that is not one of the few that can stand
 * between a money word and its own amount. A guard against crossing another
 * number stood here too, and went: no phrase could be found where it changed
 * the reading, and unproved code goes.
 */
function reaches(tokens: readonly Token[], index: number, step: -1 | 1): boolean {
  for (let at = index + step; at >= 0 && at < tokens.length; at += step) {
    const token = tokens[at]!
    if (MARKER_WORDS.has(token.word)) return true
    if (ALWAYS_TEMPORAL.includes(token.word) || CLAUSE_WORDS.includes(token.word)) return false
    if (/[,;:]$/.test(token.raw)) return false
    if (!FUNCTION_WORDS.includes(token.word)) return false
  }
  return false
}

function roleOf(tokens: readonly Token[], index: number): Role {
  const here = tokens[index]!
  const before = tokens[index - 1]
  const after = tokens[index + 1]

  // An amount says so on the number itself, or in the unit beside it.
  if (CURRENCY.test(here.raw)) return 'amount'
  if (unitToken(after, AMOUNT_UNITS) || unitToken(here, AMOUNT_UNITS)) return 'amount'
  if (here.word.endsWith('%')) return 'amount'

  // A written date is written as one.
  if (SLASHED.test(here.word) || THREE_PART.test(here.word)) return 'date'

  // A unit touching the number dates it — unless that unit is doing other work.
  if (datesTheNumber(tokens, index)) return 'date'

  // A unit measuring a noun makes the number the size of that noun.
  if (unitToken(after, TEMPORAL_UNITS) && measured(tokens, index + 1)) return 'amount'

  // A slot only a time can fill takes a year or a punctuated pair.
  if (before !== undefined && ALWAYS_TEMPORAL.includes(before.word)) {
    if (YEARISH.test(here.word) || PUNCTUATED_PAIR.test(here.word)) return 'date'
  }

  // ...and last, the money word whose object this number is.
  if (moneyGoverns(tokens, index)) return 'amount'

  return 'unresolved'
}

/**
 * Whether the words say **how much**, on evidence rather than on a default.
 *
 * One path, not two. This used to answer *yes* for a currency symbol anywhere
 * in the phrase as well as asking the roles — and a reintroduction found the
 * second path was doing nothing the first did not already do. Two ways to one
 * fact agree until they disagree, which is the fault `saysWhen` was carrying
 * last round; it is not carried here.
 */
function saysHowMuch(text: string): boolean {
  return numberTokens(text).some((number) => number.role === 'amount')
}

/**
 * Whether the words say **by when**.
 *
 * Round 8 asked whether a horizon word was touching a number, and QA broke it
 * with one word of distance: *"per **calendar** year"* and *"2 **full** months
 * salary"* are a wage and a measure, and neither is a deadline.
 *
 * So a horizon word answers this only where something **places** it — a
 * preposition that puts what follows it in time, a deictic that points at one
 * moment, or a day word that names a day by itself. A unit with none of those
 * is measuring or dividing something, and is not an answer to *when*.
 */
function saysWhen(text: string): boolean {
  if (numberTokens(text).some((number) => number.role === 'date')) return true

  const tokens = tokensOf(text)
  return tokens.some((token, index) => {
    if (!HORIZON.includes(token.word)) return false
    if (STANDALONE_DAYS.includes(token.word)) return true
    // A determiner may stand between the placer and what it places: `by the summer`.
    let back = index - 1
    while (back >= 0 && ARTICLES.includes(tokens[back]!.word)) back -= 1
    const before = tokens[back]
    return before !== undefined && PLACERS.includes(before.word)
  })
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
  /**
   * The areas the question is between, which is what makes it answerable.
   *
   * QA-91-020: `scopeUnresolved` and an unknown string are **state**, not an
   * owner interaction. A reading that says it is asking has to carry what the
   * owner would be choosing from, or the surface has nothing to draw and the
   * abstention is Round 5's silent one with a label on it.
   *
   * One entry for a settled cross-area reading, and for an unresolved scope
   * every candidate other than the area he was asked about — falling back to
   * the other readable areas where the words name only that one, because the
   * denial may be denying it.
   */
  readonly candidates: readonly LifeDomainId[]
  /**
   * The words deny something, and this file cannot show which markers it covers.
   *
   * Set where a denial's reach holds markers the closed rules cannot apportion.
   * The reading then names none of them, {@link undecided} is true, and the
   * question goes to the owner — which is the whole of D-257. It is a separate
   * field from `undecided` because the two have different causes and a surface
   * may one day want to say which one it is looking at.
   */
  readonly scopeUnresolved: boolean
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
  const scope = deniedMentions(haystack, all)
  const asserted = all.filter(
    (mention) => !scope.denied.has(mention) && !scope.unresolved.has(mention),
  )

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

  /*
   * The candidates an unresolved scope puts in front of the owner.
   *
   * These are areas the words plainly name — the instrument's uncertainty is
   * about which side of a denial they fall on, not about whether they are
   * there. So they are the question, and they are never quietly asserted.
   */
  const unplaced: LifeDomainId[] = []
  for (const mention of scope.unresolved) {
    if (!unplaced.includes(mention.domain)) unplaced.push(mention.domain)
  }
  // The offer row is the cross-domain question and always has been, so the
  // area he was asked about is never the thing offered back to him.
  const elsewhereUnplaced = unplaced.filter((domain) => domain !== input.askedIn)

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

  /*
   * An unresolved scope is asked about, and asked about **first**.
   *
   * Round 5 withheld markers it could not place and said nothing, and QA was
   * right to reject that: an abstention nobody is told about is just a quieter
   * wrong answer. So where the scope is unresolved the reading declares itself
   * undecided, offers the single candidate where there is exactly one, and
   * writes nothing derived until the owner has picked.
   */
  const unresolved = unplaced.length > 0
  const offer = unresolved
    ? elsewhereUnplaced.length === 1
      ? elsewhereUnplaced[0]
      : undefined
    : topOthers.length === 1
      ? topOthers[0]?.domain
      : undefined
  const elsewhere = !unresolved && offer !== undefined && leaderRank > askedRank ? offer : undefined
  const undecided = unresolved || (contested && elsewhere === undefined)

  /*
   * What the owner would be choosing from, so that the question can be put.
   *
   * An unresolved scope always has something to ask: the areas the words name
   * besides the one he was asked about, or — where the words name only that
   * one — the other areas he could file it in, because what the instrument
   * could not settle is whether the denial covers the area he is standing on.
   */
  const elsewhereReadable = READABLE_AREAS.filter((domain) => domain !== input.askedIn)
  const candidates: readonly LifeDomainId[] = unresolved
    ? elsewhereUnplaced.length > 0
      ? elsewhereUnplaced
      : elsewhereReadable
    : offer === undefined
      ? []
      : [offer]

  return {
    words: typed,
    askedIn: input.askedIn,
    names: ordered,
    elsewhere,
    offer,
    undecided,
    scopeUnresolved: unresolved,
    candidates,
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

/**
 * The option row, in the words of the choice it actually is — rule 4.
 *
 * ## Why this is a list now
 *
 * It used to return one keep and one refile, which is the whole of a settled
 * cross-area reading: there is exactly one other area in the running. An
 * **unresolved** scope is not that shape — the words may name two other areas,
 * or only the one he was asked about — and QA-91-020 found the surface drawing
 * no row at all in both of those cases. A reading that claims to be asking, and
 * renders no control, is the silent abstention QA rejected at Round 5.
 *
 * So the row carries however many answers the question has. It is still **one
 * row and one question** — accommodation row B1's rule is that the owner is not
 * sent to a picker screen, not that a question may only ever have one answer.
 *
 * `answered` says whether the owner has chosen yet, which is what lets an
 * unresolved row show that it is still waiting rather than pre-selecting an
 * answer on his behalf.
 */
export interface OfferRow {
  readonly keep: string
  readonly options: readonly { readonly domain: LifeDomainId; readonly label: string }[]
  readonly asking: boolean
}

export function describeOffer(
  reading: AimReading,
  area: (id: LifeDomainId) => string,
): OfferRow | undefined {
  if (reading.candidates.length === 0) return undefined
  return {
    keep: `Keep it in ${area(reading.askedIn)}`,
    options: reading.candidates.map((domain) => ({
      domain,
      label: `File it in ${area(domain)} instead`,
    })),
    asking: reading.scopeUnresolved,
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
