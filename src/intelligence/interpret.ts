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
 * The mentions the owner denied, by the area each denial is about.
 *
 * The three rules of the header, in the order they apply. Nothing here looks at
 * what a clause starts with, because nothing here needs to: what is cancelled is
 * an area, and an area the denial did not name survives whatever follows it.
 */
function deniedMentions(haystack: string, all: readonly Mention[]): ReadonlySet<Mention> {
  const denied = new Set<Mention>()

  for (const denier of DENIERS) {
    let from = 0
    for (;;) {
      const at = haystack.indexOf(denier, from)
      if (at === -1) break
      const after = at + denier.length
      const until = after + reachOfDenial(haystack.slice(after))
      from = after

      const inside = all.filter((mention) => mention.at >= after && mention.at < until)
      const about = inside[0]?.domain
      if (about === undefined) continue

      let last: Mention | undefined
      for (const mention of inside) {
        const sameArea = mention.domain === about
        // A different area is denied too where it is coordinated straight on to
        // the last thing denied — *not about money or fitness* — and not where a
        // comma has ended the list the denial was reading.
        const coordinated = last !== undefined && !haystack.slice(last.to, mention.at).includes(',')
        if (!sameArea && !coordinated) continue
        denied.add(mention)
        last = mention
      }
    }
  }

  return denied
}

/**
 * What a number in the phrase is **for** — QA-91-011.
 *
 * ## Why this replaces deleting shapes
 *
 * The previous three versions removed matched date patterns from the text and
 * then asked whether any digit was left. That works exactly as far as the list
 * of patterns reaches, and QA broke it twice: an **ordinal quarter** expresses a
 * date without spelling `Q3`, and a **range** has two endpoints of which only
 * one carries the date's own grammar. Adding a regex for each would have moved
 * the boundary a fifth time without answering the question underneath it, which
 * is *which number here is a horizon and which is a sum*.
 *
 * So numbers are found first and **classified**. Every digit run in the phrase
 * becomes a span with a role, and the roles are decided by structure:
 *
 * - a number written inside a date form — slashed, month-adjacent, quarter,
 *   ordinal, or a plausible year — is a **date**;
 * - a number joined to a date **immediately** by a range connector is a date
 *   too, because that is what a range is;
 * - everything else is an **amount**, which is what a number ordinarily is.
 *
 * ## What that buys over the old shape list
 *
 * The range rule is *propagation between spans* rather than a pattern, so it
 * covers `15th and 17th`, `15th to the 17th` and `15–17` without knowing any of
 * them; and *"Save 3000 between March 15th and 17th"* keeps its amount, because
 * `3000` is not immediately joined to anything with a date role.
 *
 * ## The bound
 *
 * A number in a date form nobody has written down here reads as an amount, and
 * the app then says it does not know the horizon rather than inventing one.
 * That is the safe direction: `unknowns` names what was not concluded, and
 * nothing derived is written from it.
 */
const MONTH_WORDS =
  'january|february|march|april|may|june|july|august|september|october|november|december'

/** The connectors that make two numbers the ends of one range. */
const RANGE_JOIN = '–|—|-|to|and|through|until|thru'

/**
 * Forms in which a number is written as part of a date, each a closed shape.
 *
 * These no longer have to be exhaustive over date grammar, because they only
 * have to catch **one** end of a range for the propagation below to carry the
 * other. That is the difference between a list that must cover a language and a
 * list that must cover a construction.
 */
const DATE_FORMS: readonly RegExp[] = [
  // 03/15/2027, 15-03-2027, 2027-03-15, and the bare 03/15 of a range
  /\b\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?\b/g,
  /\b\d{4}[/.-]\d{1,2}[/.-]\d{1,2}\b/g,
  /\b\d{1,2}-\d{1,2}-\d{2,4}\b/g,
  // March 15, March the 15th, 15 March, the 15th of March
  new RegExp(String.raw`\b(?:${MONTH_WORDS})\b\s+(?:the\s+)?\d{1,2}(?:st|nd|rd|th)?\b`, 'g'),
  new RegExp(
    String.raw`\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:the\s+)?(?:${MONTH_WORDS})\b`,
    'g',
  ),
  // Q3, quarter 3, and the 3rd quarter
  /\bq[1-4]\b/g,
  /\bquarters?\s+\d{1,2}\b/g,
  /\b\d{1,2}(?:st|nd|rd|th)\s+quarter\b/g,
  // An ordinal names a position rather than a quantity, wherever it stands.
  /\b\d{1,2}(?:st|nd|rd|th)\b/g,
  // A plausible year.
  /\b(?:19|20|21)\d{2}\b/g,
]

interface NumberSpan {
  readonly at: number
  readonly to: number
  role: 'date' | 'amount'
}

/**
 * Every number in the phrase, with what it is for.
 *
 * Ranges are settled after the forms rather than inside them: two spans joined
 * by nothing but a range connector are the ends of one thing, so if either is a
 * date both are. Run to a fixed point, so `15 to 17 to 19` settles all three.
 */
function numberSpans(text: string): readonly NumberSpan[] {
  const dated: [number, number][] = []
  for (const form of DATE_FORMS) {
    const pattern = new RegExp(form.source, 'g')
    for (;;) {
      const match = pattern.exec(text)
      if (match === null) break
      dated.push([match.index, match.index + match[0].length])
    }
  }

  const spans: NumberSpan[] = []
  const digits = /\d+/g
  for (;;) {
    const match = digits.exec(text)
    if (match === null) break
    const at = match.index
    const to = at + match[0].length
    const inside = dated.some(([from, until]) => at >= from && to <= until)
    spans.push({ at, to, role: inside ? 'date' : 'amount' })
  }

  const joined = new RegExp(
    String.raw`^\s*(?:st|nd|rd|th)?\s*(?:${RANGE_JOIN})\s*(?:the\s+)?$`,
    'i',
  )
  for (let settled = false; !settled;) {
    settled = true
    for (let index = 1; index < spans.length; index += 1) {
      const left = spans[index - 1]!
      const right = spans[index]!
      if (left.role === right.role) continue
      if (!joined.test(text.slice(left.to, right.at))) continue
      if (left.role === 'date') right.role = 'date'
      else left.role = 'date'
      settled = false
    }
  }

  return spans
}

/**
 * Whether the words say **how much**, which no part of a date does.
 *
 * A currency symbol is always an amount. Otherwise it is whether any number in
 * the phrase was classified as one — so a sum standing beside a horizon still
 * settles the amount, and a horizon standing alone still leaves it open.
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
  const denied = deniedMentions(haystack, all)
  const asserted = all.filter((mention) => !denied.has(mention))

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
