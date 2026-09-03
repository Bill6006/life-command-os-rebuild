/**
 * Does this sentence claim the app will change what it offers? — D-193.
 *
 * ## Three attempts, and why the first two failed the same way
 *
 * D-187 says the blocker path may record what was in the way and may not say
 * what will follow from it, because nothing follows from it: `applyConstraints`
 * never reads `situation.constraints`, and `cautionsFor` matches a constraint's
 * concept against a candidate's `leansOn`, which never holds a `blocker.*`
 * concept.
 *
 * **The first guard listed five phrases** — *stop*, *won't*, *no longer*,
 * *avoid*, *from now on* — and the deployed build said *"so the app can offer
 * something that fits next time"*. The guard collected that string into its
 * sweep and did not match it. QA-84-010.
 *
 * **The second guard took a cross-product** of an actor list, a modality list
 * and an *adaptation verb* list, and called that the semantic class. It is not.
 * QA-84-011 broke it in four words:
 *
 *     The app will choose a more suitable option.
 *     The app will pick something else for you.
 *     The app will use this when deciding what comes next.
 *     The app will prefer an option that works indoors.
 *
 * Every one is a plain promise. Every one returned `[]`, solely because
 * *choose*, *pick*, *use* and *prefer* were not in the list. QA's sentence for
 * it is the one that lands: *"the old guards listed remembered phrases; the
 * replacement takes a cross-product of remembered words and calls that the
 * semantic class."*
 *
 * ## What is different this time, stated so it can be attacked
 *
 * **There is no verb list.** That is the change. What a promise is *about* —
 * choosing, picking, preferring, offering, remembering, some verb nobody has
 * thought of — is unbounded, and any list of it is a list of what somebody
 * remembered. What is *not* unbounded is the grammar that makes a sentence a
 * claim about a later moment:
 *
 * 1. **A modal auxiliary is a closed class in English.** *can, could, may,
 *    might, must, shall, should, will, would*, their negations and
 *    contractions, and the semi-modals *going to*, *have to*, *need to*,
 *    *ought to*. There is no tenth modal waiting to be discovered.
 * 2. **Forward deixis is a small closed set**: *next time*, *later*, *in
 *    future*, *from now on*, *again*, *going forward*, *what comes next*.
 *
 * So a claim is: **the app, or its output, as the thing being spoken about,
 * plus one of those two.** The verb between them is not consulted, which is
 * precisely why *choose*, *pick* and *prefer* now fail — and why a verb nobody
 * has invented yet will fail too.
 *
 * ## And what this still cannot do, said plainly
 *
 * **It cannot decide entailment.** *"The app learns from this"* implies a future
 * adaptation and contains no modal and no forward deixis, so this returns `[]`
 * for it. Any classifier of ordinary English will have such escapes, and a guard
 * that claimed otherwise would be the third version of the same mistake.
 *
 * **So this is not the guarantee. {@link APPROVED_BLOCKER_COPY} is.** The blocker
 * path renders a *closed set* of strings, enumerated there, and the synthetic
 * gate asserts that the set it actually renders is exactly that set. A new or
 * edited string fails the gate until somebody adds it deliberately, in a diff,
 * with the reason it is honest — which is the moment to think about what it
 * promises. That check has no escapes at all, because it is an allowlist over a
 * finite set rather than an attempt to recognise a promise.
 *
 * **This classifier is the net over the catalogue**, and it runs in the browser
 * and Android gates as well, where only rendered text is available and an exact
 * match is not possible.
 *
 * ## Where it lives
 *
 * Plain ESM under `scripts/` for one reason: `scripts/android-gate.mjs` cannot
 * import TypeScript, and QA-84-010's finding was that three gates had drifted
 * into three different rules. One definition, three importers.
 */

/**
 * What the sentence is speaking about, when what it says is a promise.
 *
 * The app itself, the unnamed *it* the copy uses for it, and **its output** —
 * QA-84-011's *"Future recommendations will take this into account"* and
 * *"Recommendations will be different next time"* name no app at all.
 */
const SUBJECTS = [
  'the app',
  'the engine',
  'it',
  'this',
  'that',
  'recommendation',
  'recommendations',
  'suggestion',
  'suggestions',
  /*
   * And its output named without naming it — *"what you are shown will be
   * different"*. A nominalisation of the same thing, which is why it belongs
   * here rather than in a list of its own.
   */
  'what you are shown',
  'what you are offered',
  'what is offered',
  'what it offers',
  'what it suggests',
  'what you see',
]

/**
 * The modal auxiliaries, which are a closed class.
 *
 * This is the load-bearing claim of the whole guard: English has nine modals and
 * a handful of semi-modals, and that is the complete list. A promise about the
 * app's later behaviour is grammatically obliged to use one of them, or to place
 * itself in the future by deixis ({@link LATER}).
 */
const MODALS = [
  'will',
  "won't",
  'will not',
  "'ll",
  'would',
  "wouldn't",
  'would not',
  'can',
  "can't",
  'cannot',
  'can not',
  'could',
  "couldn't",
  'could not',
  'may',
  'might',
  'must',
  'shall',
  'should',
  "shouldn't",
  'should not',
  'is going to',
  'are going to',
  'going to',
  'has to',
  'have to',
  'needs to',
  'need to',
  'ought to',
]

/** Forward deixis: a later occasion, named without a modal. */
const LATER = [
  'next time',
  'later',
  'in future',
  'in the future',
  'future',
  'from now on',
  'from then on',
  'going forward',
  'another time',
  'what comes next',
  'comes next',
  'again',
  'afterwards',
  'tomorrow',
  'the next one',
]

const escaped = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')

/**
 * How close a modal has to sit behind its subject to be that subject's modal.
 *
 * Two words, which allows an adverb or a negator — *the app will never*, *it
 * would not* — and no more. Widening it is how the honest sentence *"where you
 * can take it back"* becomes a false positive: **you** are the one who can, and
 * the *it* four words earlier is an object rather than the thing acting.
 */
const ADJACENT = 2

function words(text) {
  return text
    .toLowerCase()
    .split(/[^a-z']+/)
    .filter(Boolean)
}

/**
 * The claims of future recommendation adaptation in one owner-visible string.
 *
 * Returns the offending fragments, so a failure names what it found rather than
 * only that it found something.
 */
export function adaptationClaims(text) {
  if (typeof text !== 'string' || text.trim() === '') return []
  const lower = text.toLowerCase()
  const found = []

  const hasLater = LATER.some((later) => new RegExp(`\\b${escaped(later)}\\b`).test(lower))

  for (const subject of SUBJECTS) {
    for (const match of lower.matchAll(new RegExp(`\\b${escaped(subject)}\\b`, 'g'))) {
      const start = match.index ?? 0
      const fragment = () => text.slice(start, start + 70).trim()

      /*
       * A later occasion named anywhere in the same string, with the app or its
       * output somewhere in it, is a claim about that occasion whether or not a
       * modal appears — *"the app remembers this for future recommendations"*.
       */
      if (hasLater) {
        found.push(fragment())
        continue
      }

      // Otherwise the modal has to be this subject's own.
      if (modalRightAfter(lower, start + match[0].length)) found.push(fragment())
    }
  }

  /*
   * And a later occasion can be the subject itself — *"the next one will be
   * easier"*, *"next time it is shorter"*. No app is named, and the claim is
   * still about what the app does then.
   */
  for (const later of LATER) {
    for (const match of lower.matchAll(new RegExp(`\\b${escaped(later)}\\b`, 'g'))) {
      const start = match.index ?? 0
      if (modalRightAfter(lower, start + match[0].length)) {
        found.push(text.slice(start, start + 70).trim())
      }
    }
  }

  return [...new Set(found)]
}

/** Whether a modal auxiliary sits within {@link ADJACENT} words of `from`. */
function modalRightAfter(lower, from) {
  const window = words(lower.slice(from))
    .slice(0, ADJACENT + 1)
    .join(' ')
  return MODALS.some((modal) => new RegExp(`\\b${escaped(modal)}\\b`).test(window))
}

/**
 * The same class, calibrated for **every screen** rather than the blocker path.
 *
 * QA-84-016 and QA-84-018 pushed the check off the blocker path and onto every
 * route in the app, because every identifier for "the blocker path" this phase
 * has tried — the prop type, the import, the JSX tag, the transition — turned out
 * to be something a writer can simply not do. A screen the owner can reach is not
 * avoidable.
 *
 * **But {@link adaptationClaims} is calibrated for short, controlled copy.** Run
 * over the whole product it flags honest sentences — *"the app cannot work out on
 * its own"*, *"what the app may reason from"* — because its subjects include a
 * bare `it` and its modals include ability (*can*, *may*). On the blocker path
 * that breadth is right; everywhere it is noise, and **narrowing the shared rule
 * until the noise went away would be tuning a guard to pass**, which is the
 * failure this phase keeps finding.
 *
 * So this is a second calibration, not a replacement, and the difference is
 * principled: **a named subject and futurity**. The app or its output by name —
 * never a pronoun — and a modal that places the sentence later (*will*, *won't*,
 * *going to*) or forward deixis. Ability is not futurity: *"the app cannot read
 * it"* says what is true now.
 *
 * Every wording in {@link MUST_BE_CAUGHT} is still caught by it.
 */
const NAMED_SUBJECTS = [
  'the app',
  'the engine',
  'recommendation',
  'recommendations',
  'suggestion',
  'suggestions',
  'what you are shown',
  'what you are offered',
  'what is offered',
  'what it offers',
  'what it suggests',
]

const FUTURE_MODALS = [
  "won't",
  'will not',
  'will',
  "'ll",
  'is going to',
  'are going to',
  'going to',
]

/**
 * Whether a fragment could begin, or finish, a claim about the future — D-206.
 *
 * These are for `rendered-copy-scan.mjs`, which builds compositions out of
 * literals and has to decide which of them are worth putting side by side. The
 * whole-composition join assumes every piece renders; Round 16 called a helper
 * that dropped one of its arguments, and the dropped text pushed the subject
 * and its verb outside the window `adaptationClaimsOnAnyScreen` needs.
 *
 * **The answer is not a wider window.** Unbounded, that rule convicts the
 * private-permission note, which joins an honest sentence about now to an
 * honest sentence about a setting. What is true is that any two pieces might
 * end up beside each other, and these two predicates say which pairs could
 * possibly matter — so the scan can test all of them without testing all pairs.
 */
/**
 * How far back, and how far forward, an opener or a closer can reach — D-207.
 *
 * Round 17 wrote the subject as two pieces, `'The '` and `'app '`, so neither
 * piece opened a claim on its own and no pair was ever built. An opener may
 * therefore be **assembled** from adjacent pieces — but assembling without a
 * bound is the square of the run again.
 *
 * The bound is not a guess: nothing in the vocabulary is longer than its
 * longest phrase, and the phrase has to be contiguous in the rendered text, so
 * a window wider than that can never newly open or close a claim. These are
 * the lengths of the vocabulary itself, with room for the spacing between
 * pieces.
 */
export const LONGEST_OPENER = Math.max(...NAMED_SUBJECTS.map((subject) => subject.length)) + 8

export const LONGEST_CLOSER =
  Math.max(...FUTURE_MODALS.map((modal) => modal.length), ...LATER.map((later) => later.length)) + 8

export function couldOpenAClaim(text) {
  const lower = String(text ?? '').toLowerCase()
  return NAMED_SUBJECTS.some((subject) => new RegExp(`\\b${escaped(subject)}\\b`).test(lower))
}

export function couldCloseAClaim(text) {
  const lower = String(text ?? '').toLowerCase()
  return (
    FUTURE_MODALS.some((modal) => new RegExp(`\\b${escaped(modal)}\\b`).test(lower)) ||
    LATER.some((later) => new RegExp(`\\b${escaped(later)}\\b`).test(lower))
  )
}

export function adaptationClaimsOnAnyScreen(text) {
  if (typeof text !== 'string' || text.trim() === '') return []
  const lower = text.toLowerCase()
  const found = []

  for (const subject of NAMED_SUBJECTS) {
    for (const match of lower.matchAll(new RegExp(`\\b${escaped(subject)}\\b`, 'g'))) {
      const start = match.index ?? 0
      const fragment = text.slice(start, start + 70).trim()
      /*
       * The deixis has to be **near** the subject, exactly as the modal is.
       *
       * Unbounded, a paragraph is enough to convict: the private permission
       * note says the app cannot read an entry, and two clauses later that
       * turning the setting off stops any future use — one honest sentence
       * about now and one about a setting, joined only by sharing a
       * paragraph. The modal branch was already adjacency-bounded, so this
       * makes the rule consistent rather than looser.
       */
      const near = lower.slice(start, start + 70)
      if (LATER.some((later) => new RegExp(`\\b${escaped(later)}\\b`).test(near))) {
        found.push(fragment)
        continue
      }
      const window = words(lower.slice(start + match[0].length))
        .slice(0, ADJACENT + 1)
        .join(' ')
      if (FUTURE_MODALS.some((modal) => new RegExp(`\\b${escaped(modal)}\\b`).test(window))) {
        found.push(fragment)
      }
    }
  }

  /*
   * And a later occasion as the subject itself — *"the next one will be
   * easier"* — which names no app and is still about what it will do.
   */
  for (const later of LATER) {
    for (const match of lower.matchAll(new RegExp(`\\b${escaped(later)}\\b`, 'g'))) {
      const start = match.index ?? 0
      const window = words(lower.slice(start + match[0].length))
        .slice(0, ADJACENT + 1)
        .join(' ')
      if (FUTURE_MODALS.some((modal) => new RegExp(`\\b${escaped(modal)}\\b`).test(window))) {
        found.push(text.slice(start, start + 70).trim())
      }
    }
  }

  return [...new Set(found)]
}

/** Whether any owner-visible string in `strings` makes such a claim. */
export function claimingStrings(strings) {
  const out = []
  for (const line of strings) {
    const claims = adaptationClaims(line)
    if (claims.length > 0) out.push({ line, claims })
  }
  return out
}

/**
 * Every string the blocker path can put in front of the owner — the guarantee.
 *
 * A closed set, and the synthetic gate asserts that what the path actually
 * renders is **exactly** this set: nothing here that is not rendered, nothing
 * rendered that is not here. So a copy edit fails the gate until it is added
 * deliberately, which is the moment somebody has to decide whether the new
 * sentence promises anything.
 *
 * That is the check with no escapes. {@link adaptationClaims} cannot have that
 * property, because recognising a promise in ordinary English is not decidable
 * by a rule — and two rounds of QA findings are what it cost to say so rather
 * than write a third word list.
 *
 * `{move}` stands where the move's own name goes, so a statement is listed once
 * rather than once per move.
 */
export const APPROVED_FROM_BLOCKERS_MODULE = [
  // The nine causes he can choose between.
  'No time',
  'There was not enough time.',
  'Not where I can do it',
  '{move} needs somewhere I was not.',
  'Too tired',
  'There was nothing left in the tank.',
  'Someone needed me',
  'Somebody else needed the time.',
  'Can’t leave — someone’s in my care',
  '{move} means leaving, and I could not — someone was in my care.',
  /*
   * The same fact with the bound in it — S2 Tier 1's bounded `until`, routing
   * 92. It is a second button rather than a second question, and both sentences
   * say what was recorded and nothing about what follows from it (D-187).
   */
  'Can’t leave tonight — someone’s in my care',
  '{move} means leaving, and I could not tonight — someone was in my care.',
  'Sore',
  'The body was not up to it.',
  "Haven't got what I need",
  '{move} needs something I have not got.',
  'Something came up',
  'Something came up.',

  /*
   * The two questions, and the notes under them.
   *
   * **Both notes gained a clause in routing 93, and it is the one D-187 forbade
   * until C21's enforcement existed.** The old promise was *"so the app can
   * offer something that fits next time"* — a claim about a future
   * recommendation that nothing makes, and nothing makes it now either. What
   * these say is that the blocked move **stays off**, which `applyConstraints`
   * does, for the closed list of standing causes, until he takes it back from
   * the area's own page. D-164's reconciliation is explicit that once something
   * acts on a blocker, saying nothing about it becomes its own defect.
   */
  'What got in the way?',
  'This is kept on the area it belongs to, where you can take it back. It is never read as you not wanting to. An answer about the world rather than about tonight also keeps this move off until you take it back.',
  '{move} has not fitted more than once. What is getting in the way?',
  'This is kept with the evening it happened on, and shown on the area it belongs to. An answer about the world rather than about tonight also keeps this move off until you take it back.',
  'Just leave it',

  // And the three silences, each of which says why it is silent.
  'You have already said what was in the way today.',
  'This was a restful thing rather than an effortful one, and there is nothing here worth asking about.',
]

/**
 * And the copy the **surfaces** compose — QA-84-012, D-194.
 *
 * Everything above is assembled in `blockers.ts`, and for one round that was
 * mistaken for the whole path. It is not: `BlockersPanel` writes a title, a
 * paragraph and an accessible name in JSX; `ResumePanel` writes a title, two
 * state sentences and an interpolated note. All of it is owner-visible, none of
 * it could enter a check that collects the return values of a function, and a
 * promise written into any of it would have rendered on a green gate.
 *
 * **The two halves are separate because they are reached differently.** The
 * first is proved by walking the scenario library through `blockerQuestionFor`;
 * this one is proved by **rendering the components** and reading what comes out,
 * in `blocker-copy.test.tsx`. A single list would leave each check unable to say
 * which entries it is responsible for, and an unreachable entry in one half
 * would be excused by the other.
 *
 * `{move}` is the move's own name, `{statement}` a stored cause from the first
 * half, `{recommendation}` the move sentence (guarded by G-001 and its own
 * catalogue), and `{state}` the word for where a move was left.
 */
export const APPROVED_FROM_SURFACES = [
  // The standing panel on a domain page.
  'Things you said were in the way',
  /*
   * The row itself is the stored cause, rendered verbatim — his words, filed
   * under their own template above. The panel adds nothing to it, and that is
   * the point of the row.
   */
  '{statement}',
  'These are about the world rather than about one evening, so the app keeps them until you say otherwise. Nothing here is read as you not wanting to.',
  'Not true any more',
  'Not true any more: {statement}',

  // The way back to a move that was left — Now's resume panel.
  'Where you left off',
  '{recommendation}',
  'You said this did not fit at the time.',
  'You said this did not fit at the time. {statement}',
  'You got part of this done.',
  'You got part of this done. {statement}',
  /*
   * The third resume state — F09, routing 93.
   *
   * A move he pressed Start on and never marked finished is a carried intention
   * with an open fate. The `else` arm said *"you said this did not fit at the
   * time"*, which about a move he was in the middle of is false, so the state
   * gets its own sentence. It promises nothing: what it says is what the record
   * holds.
   */
  'You {state} this and did not mark it finished.',
  'Nothing here is a nudge. It is on the screen because you started it, and it goes when the day does — {state} is a real place to leave something.',
  /*
   * The same sentence with **both** occurrences substituted — routing 93, F09.
   *
   * The normaliser replaces the rendered state word with `{state}` so one
   * catalogue entry can stand for three panels, and the note happens to contain
   * the literal word *started*. On the state that is literally `started`, both
   * are replaced and the line no longer matches the entry above.
   *
   * It is one string in the product either way; two entries is the price of a
   * normaliser that cannot tell an interpolated word from a written one, and it
   * is cheaper than rewording a sentence that has been through QA to dodge its
   * own placeholder.
   */
  'Nothing here is a nudge. It is on the screen because you {state} it, and it goes when the day does — {state} is a real place to leave something.',

  // The lifecycle controls that panel offers, which are on the path too.
  'Start it',
  'Done',
  'Only part of it',
  'Not today',
  "Can't right now",
  'Something else',
]

/**
 * And what a **record** reads as, wherever it is read — QA-84-013, D-195.
 *
 * The third half, and the boundary the round 4 repair *declared* rather than
 * closed. `describeRecord` turns an `action-unable-now` into a sentence, and
 * Timeline, the domain page's "Recently", the correction list and the export all
 * render that one sentence. Round 5 changed its lifecycle frame to *"The app
 * will choose something better next time"* and 431 tests passed while the owner
 * read the promise.
 *
 * The records the blocker path writes are the recommendation it was about, the
 * inability itself, the standing constraint it can become, and the correction
 * that withdraws one. `{object}` is the move as history names it, `{reason}` the
 * owner's own words for taking something back.
 */
export const APPROVED_FROM_RECORDS = [
  // The move the inability was about.
  'Suggested',

  // The inability, and the form it takes when the move no longer resolves.
  'Not then',
  'Did not fit at the time — {object}.',
  "Said a suggestion here didn't fit at the time.",

  // The durable fact it can become.
  'Limit',

  // And taking that back.
  'Withdrawn',
  'Withdrew an earlier entry — {reason}',
]

/**
 * The shapes an export line may have around a record's sentence — QA-84-015.
 *
 * The export is the one sink that legitimately composes: a bullet, sometimes a
 * date, sometimes the tag, sometimes an origin. D-196 said the scaffolding "is
 * not itself a sentence" and the check asked whether the leftover was **longer
 * than sixty characters**, which is not the same claim. Round 7 inserted
 * *"This needs special care."* — twenty-four characters — before every exported
 * history sentence, and 331 tests passed.
 *
 * So the scaffolding is permitted **exactly**, the way the copy is: normalise a
 * line by putting `{text}`, `{tag}`, `{day}` and `{origin}` back, and the result
 * must be one of these. There is no length in it and nothing is inferred from
 * how short an addition happens to be.
 */
export const APPROVED_EXPORT_SCAFFOLDS = [
  '- {text}',
  '- {tag}: {text}',
  '- {day} · {tag}: {text}',
  '- {day} — {text}',
  '- {text} · {origin}',
  '- {tag}: {text} · {origin}',
  '- {day} · {tag}: {text} · {origin}',
  '- {day} — {text} · {origin}',
]

/** Whether an export line is one of those shapes and nothing more. */
export function isApprovedExportShape(shape) {
  const flat = String(shape).replace(/\s+/g, ' ').trim()
  return APPROVED_EXPORT_SCAFFOLDS.some((approved) => approved.replace(/\s+/g, ' ').trim() === flat)
}

/**
 * And what appears **elsewhere in the app** once a move has been blocked —
 * QA-84-016, D-198.
 *
 * Not blocker copy, and labelled so. Blocking a move writes records, and records
 * change what other screens have to say: Now has no move left to offer, Timeline
 * has two more rows and a new total, Insights has one more occasion to count, the
 * domain page grows a correction control because there is now something to
 * correct.
 *
 * **It is here because the check that closes QA-84-016 is a whole-screen
 * comparison**, and a whole-screen comparison sees all of it. Round 7 claimed a
 * parent's blocker copy "arrives with the surface and leaves with it"; Round 8
 * disproved that — `ResumePanel` stays after the question is dismissed, so
 * copy keyed to it sat in both snapshots and the subtraction removed it. The
 * only sound comparison is against the screens **before the block**, and that
 * one brings this along with it.
 *
 * **The cost is real and is the reason this list is separate.** An unrelated
 * edit to Now's no-action sentence or to an Insights count will fail the blocker
 * gate until it is approved here. That is a tax on other work, accepted because
 * the alternative — the one Round 8 broke twice — is a guard that names some
 * feature of the blocker path and is wrong about it.
 */
export const APPROVED_WHEN_A_MOVE_IS_BLOCKED = [
  // Now, which has nothing left to offer this evening.
  'Nothing pressing',
  'Nothing new for today.',
  'Nothing else worth asking right now.',
  'Everything this history has to suggest has already been in front of you today, and tomorrow starts again.',

  /*
   * And the state a supervision blocker now reaches — routing 92, C21.
   *
   * Saying *"I could not leave"* about a walk removes the walk, because a
   * candidate that requires leaving does not fit a situation where he cannot
   * (D-262). On a history whose only move means going out, what is left is a
   * real no-action state, and this is the sentence the catalogue already has
   * for it.
   *
   * **It says nothing about what the app will do next**, which is the rule this
   * scan exists to enforce (D-187): "there were things worth doing and none of
   * them suit where you actually are" is a description of this evening, and
   * every word of it was true before the blocker path could reach it.
   */
  'Nothing fits tonight.',
  'There were things worth doing and none of them suit where you actually are.',

  // Timeline, which has more rows and says so.
  '— replaced an earlier entry',
  'That is the whole record — {n} entries.',

  // Insights, which has one more occasion to count and still will not guess.
  'Still gathering',
  'Getting out for {move}',
  '{n} so far — {n} more occasions like these',
  'Current energy after {object}',
  '{n} so far — not enough to compare yet — {n} with it, {n} recorded without it, and {n} of each is the least this can be said over.',

  /*
   * The domain page's reading rows, which carry a value the owner gave.
   *
   * `readingText` (`domainPages.ts`) sends a scale fact through
   * `describeFactValue`, which renders it bare — "3 of 5" — and the row is a
   * leaf element whenever there is no origin badge beside it. A reading
   * recorded on the way to blocking a move therefore lands in the difference.
   * It is a number he reported, not a sentence the app composed.
   */
  '{n} of {n}',

  /*
   * Data, which now has a record to say the size of.
   *
   * Beside the composed review it states what that document covers. It arrived
   * with QA-84-019: Data is a screen the owner can reach and the crawl had
   * never visited it. The document itself is subtracted before this list is
   * consulted and guarded section by section in the synthetic suite; this is
   * the screen's own sentence about it.
   */
  '{day} to {day}, {n} entries',

  // The domain page, which now has something to correct.
  'Something here wrong?',
  'Nothing is deleted. An entry you withdraw stays in your history, marked as withdrawn.',
  'Correct: Did not fit at the time — {object}.',

  /*
   * And what the domain page is now in the middle of working out — AUD-0043.
   *
   * Blocking a move writes records, and one more occasion can be what takes a
   * belief from "nothing yet" to "in progress" — so the panel that answers
   * canonical section 7's eighth question appears in the difference for exactly
   * the reason this whole list exists.
   *
   * **Both lines make no claim about the owner**, which is why they are approved
   * here rather than being a defect: the title names what the *app* is doing,
   * and the sentence under it says that none of it is settled and none of it is
   * being used as though it were. The gathering lines themselves are already
   * approved above, under Insights, because they are the same lines.
   */
  'What the app is working out here',
  'Nothing here is settled, and none of it is being used as though it were.',
]

/** Whether a line is copy the app shows elsewhere once a move is blocked. */
export function isApprovedWhenBlocked(line) {
  const flat = (text) => String(text).replace(/\s+/g, ' ').trim()
  const wanted = flat(line)
  return APPROVED_WHEN_A_MOVE_IS_BLOCKED.some((approved) => flat(approved) === wanted)
}

/**
 * Sentences the app-wide rule flags that are not promises of adaptation.
 *
 * Round 9 opened this with one entry and called it
 * `APPROVED_PRODUCT_DESCRIPTION`. Round 10 pressed buttons and reached two more
 * honest sentences, neither of them a product description, so the list is named
 * for what it holds: **copy the net catches and D-187 does not forbid.**
 *
 * It is a list rather than a smarter rule, and that is the point. Each of these
 * needs a different piece of understanding to dismiss — negation, tense, what an
 * adverb attaches to — and every one of those is a parser inside a guard, which
 * is the mistake D-197 recorded. **The rule stays blunt and the exceptions stay
 * visible.**
 *
 * The cost is declared: editing any of these sentences fails the gate until the
 * new wording is approved here. That is when somebody is most likely to promise
 * something the engine does not do.
 */
export const APPROVED_NOT_A_PROMISE = [
  /*
   * `REBUILD_PHASE.summary` — the product's description of itself since Phase 8,
   * rendered on More and included in the Overview export. Flagged on *"watches
   * what happens **afterwards**"*: sequence, not futurity, and the deixis
   * belongs to "what happens" rather than to anything the app says it will do.
   */
  'The app decides, explains itself, watches what happens afterwards, learns from it, and ' +
    'notices when a life area has gone quiet rather than carrying on as though a months-old ' +
    'picture were today' +
    String.fromCharCode(8217) +
    's.',

  /*
   * Now, when it has nothing to go on. Flagged on *"The engine **will** not
   * guess"* — a named subject and a future modal, and a **negation**: it is a
   * promise to do nothing, which is the opposite of promising a recommendation
   * will change. Reached only by pressing into the empty state, which is why
   * nine rounds never saw it.
   */
  'The engine will not guess. With nothing to go on it says so, rather than offering ' +
    'something plausible about a life it knows nothing about.',

  /*
   * A record describer, on Timeline. Flagged on *"the app" … "another time"* —
   * a named subject and forward deixis. It describes **what already happened**:
   * the owner left a question, and the sentence is the record of that, not an
   * undertaking about the next one.
   */
  'Left one of the app' + String.fromCharCode(8217) + 's questions for another time.',
]

/**
 * The line with those sentences taken out of it.
 *
 * Removal rather than a whitelist, so a promise written **beside** an approved
 * sentence is still classified — the same shape as
 * `containsApprovedBlockerCopy`.
 */
export function withoutApprovedNonPromises(line) {
  const flat = String(line ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  let left = flat
  for (const approved of APPROVED_NOT_A_PROMISE) {
    left = left.split(approved.replace(/\s+/g, ' ').trim()).join(' ')
  }
  return left
}

/**
 * What the app says about its own future, that D-187 does not forbid — D-201,
 * and **where each sentence is allowed to say it** — D-202.
 *
 * The scan in `rendered-copy-scan.mjs` reads **every string the built app can
 * render**, so for the first time the app-wide rule meets all of the product's
 * copy at once rather than whatever a sweep happened to reach. Seventeen
 * shipped sentences trip it, and every one is honest. They fall into three
 * kinds, and the kind is the reason:
 *
 * - **Promises to do nothing.** *"it will not start suggesting it"*, *"will
 *   never decide you have got there"*, *"will not invent one"*, *"will not
 *   assume"*. A negated future is the opposite of the claim D-187 forbids, and
 *   telling one from the other needs to parse negation.
 * - **Confirmations of behaviour the engine actually has.** Naming a next step
 *   really does make the engine propose it — that is QA-84-001's repair, built
 *   in this phase and covered by acceptance item 1. Refusing to let the app say
 *   so would make the confirmation dishonest in the other direction.
 * - **Statements about a backup or a restore.** What the app will do with a
 *   file, which is not a recommendation at all.
 *
 * **The cost is the largest this module carries, and it is the point.** Any new
 * or edited sentence anywhere in the product that speaks about what the app
 * will do fails this gate until somebody writes down why it is honest. That is
 * a tax on ordinary copy work, accepted because the alternative — eight rounds
 * of it — was a guarantee that read as whole-app and was not.
 *
 * **And an approval is a claim about a place, not about words — QA-84-034.**
 * Round 12 moved the milestone sentence verbatim under a panel titled *A
 * blocker*, where `this` names the blocker and the promise is false, and this
 * list waved it through because all it knew was the text. So each entry names
 * the source files it may live in, and `rendered-copy-scan.mjs` checks that
 * claim in both directions. Two entries are **joined** forms, produced by the
 * composition rule rather than written anywhere, so they carry a `pin` — the
 * piece that does appear in source — to be looked for instead.
 */
export const APPROVED_FUTURE_COPY = [
  // Promises to do nothing.
  {
    text: '”. The app will know it exists and can refer to it; it will not start suggesting it.',
    in: ['src/intelligence/authoring.ts'],
  },
  {
    text: 'This is kept as what would count. The app will never decide you have got there.',
    in: ['src/features/life/DomainPanels.tsx'],
  },
  {
    text:
      'This is kept as what would count. The app will never decide you have got there — it ' +
      'holds what you said would show it.',
    in: ['src/intelligence/discovery.ts'],
  },
  {
    text: 'Leave it empty and the app will not invent one.',
    in: ['src/features/life/DomainPanels.tsx'],
  },
  /*
   * Still rendered by the authoring panel, and no longer by either aspiration
   * surface — QA-91-004.
   *
   * The confirmation used to put every unknown in one sentence behind this
   * lead-in. Six of them made a seven-line comma-run on a 360-wide phone, so
   * the two aspiration surfaces now name the halves — *these words do not say*
   * and *the app has not been told* — and render each as a list. Neither of
   * those is a claim about a later moment, so neither needs approving here.
   * `Discovery.tsx` therefore no longer ships this string, and the placement
   * check would fail if that file were left on the list.
   */
  {
    text: 'The app will not assume ',
    in: ['src/features/life/DomainPanels.tsx'],
  },

  // Confirmations of behaviour the engine has, built and covered by D-173 item 1.
  {
    text:
      '”. The app will treat this as what you are currently studying, and start suggesting ' +
      'work on it.',
    in: ['src/intelligence/authoring.ts'],
  },
  {
    text:
      '”. The app will treat this as the money thing that is open, and start suggesting you ' +
      'deal with it.',
    in: ['src/intelligence/authoring.ts'],
  },
  {
    text:
      '”. The app will treat this as what you are working towards, and start suggesting it on ' +
      'evenings there is something to spend on it.',
    in: ['src/intelligence/authoring.ts'],
  },
  {
    text:
      'This becomes a milestone with its own date, and the app will start suggesting work ' +
      'towards it.',
    in: ['src/features/life/DomainPanels.tsx', 'src/intelligence/discovery.ts'],
  },
  {
    text: 'a span the app will work around, or a promise with a date on it',
    in: ['src/intelligence/authoring.ts'],
  },

  /*
   * The consequence a correction states before it acts. Found for the first
   * time by the composition rule added for QA-84-032: the two quasis of a
   * template join into this, which is why the joined form does not appear in
   * source and the pin is the piece that does. It is a promise to **stop**
   * concluding something, which the withdrawal really does.
   */
  {
    text: 'The app stops concluding , from now on.',
    pin: 'The app stops concluding ',
    in: ['src/intelligence/corrections.ts'],
  },
  {
    text: 'The app stops concluding  , from now on.',
    pin: 'The app stops concluding ',
    in: ['src/intelligence/corrections.ts'],
  },

  // What a backup or a restore does with a file.
  {
    text:
      'The restore was written and checked, and then the app could not read the database ' +
      'again. Nothing was undone.',
    in: ['src/features/memory/MemoryProvider.tsx'],
  },
  {
    text:
      'The backup was written and checked once, so it is probably there. What the app cannot ' +
      'do is read the database again to confirm it. Close the app and open it again to see ' +
      'what is actually stored — and do not restore anything else over this until you have.',
    in: ['src/features/data/DataScreen.tsx'],
  },
  {
    text: 'The app will try to bring these back on its own.',
    in: ['src/features/life/standing.ts'],
  },
  {
    text: ' becomes what the app reads from now on.',
    in: ['src/intelligence/corrections.ts'],
  },
  {
    text: 'This replaces what the app has here, and is what it reads from now on.',
    in: ['src/features/life/DomainPage.tsx'],
  },
]

/**
 * Those removed, so anything written beside one is still classified.
 *
 * Removal is by text; **where** each sentence is allowed to live is checked
 * separately, by `rendered-copy-scan.mjs`, against the `in` field above.
 */
export function withoutApprovedFutureCopy(line) {
  const flat = (text) =>
    String(text ?? '')
      .replace(/\s+/g, ' ')
      .trim()
  let left = flat(line)
  for (const approved of APPROVED_FUTURE_COPY) {
    left = left.split(flat(approved.text)).join(' ')
  }
  return left
}

/** Every string the blocker path can put in front of the owner. */
export const APPROVED_BLOCKER_COPY = [
  ...APPROVED_FROM_BLOCKERS_MODULE,
  ...APPROVED_FROM_SURFACES,
  ...APPROVED_FROM_RECORDS,
]

/** Whitespace-insensitive membership, so wrapping in a template cannot matter. */
export function isApprovedBlockerCopy(line) {
  const flat = (text) => String(text).replace(/\s+/g, ' ').trim()
  const wanted = flat(line)
  return APPROVED_BLOCKER_COPY.some((approved) => flat(approved) === wanted)
}

/**
 * Whether a rendered blob contains copy from the catalogue.
 *
 * The browser and Android gates read whole panels rather than the values in
 * `blockers.ts`, so an exact match is not available to them. What is available
 * is the positive half: the panel has to contain something the catalogue
 * approves. Together with {@link adaptationClaims} over the same blob, that is
 * the rendered-side form of the two checks the synthetic gate makes exactly.
 */
export function containsApprovedBlockerCopy(text) {
  if (typeof text !== 'string') return false
  const flat = String(text).replace(/\s+/g, ' ').trim()
  return APPROVED_BLOCKER_COPY.some((approved) => {
    const wanted = approved.replace(/\s+/g, ' ').trim()
    if (wanted.includes('{move}')) return false
    return flat.includes(wanted)
  })
}

/**
 * The wordings this guard must catch, and the ones it must not.
 *
 * Exported so every gate proves the guard against them rather than asserting
 * about it. The list is **evidence, not the rule** — QA-84-011's objection to
 * the last version was precisely that its fixture proved the strings somebody
 * had already thought of. What disproves the rule itself is the generated sweep
 * in `destination-and-discovery.test.ts`, which builds subject × modal ×
 * *arbitrary* verb — invented words included — and requires every one to be
 * caught. A guard with a verb list in it fails that sweep on the first
 * unfamiliar word.
 */
export const MUST_BE_CAUGHT = [
  // The two that shipped — QA-84-010 read them off the deployed build.
  'This is kept so the app can offer something that fits next time. It is never read as you not wanting to.',
  'This is kept so the app can stop putting it in front of you at the wrong moment.',
  // The round 1 reintroduction.
  'A walk means leaving, and I could not — the app will stop suggesting it.',
  // The seven QA-84-011 broke the verb list with.
  'The app will choose a more suitable option.',
  'The app will pick something else for you.',
  'The app will use this when deciding what comes next.',
  'The app will prefer an option that works indoors.',
  'Future recommendations will take this into account.',
  'The app remembers this for future recommendations.',
  'Recommendations will be different next time.',
  // And wordings nobody has written down.
  'From now on the app will avoid this.',
  'The app will no longer put this in front of you.',
  'It will suggest something that fits better next time.',
  'The engine ought to weigh this next time.',
  'That would change what you are shown.',
  // The two the generated sweep found before this list did.
  'What you are shown will be different.',
  'The next one will be easier.',
]

/** And the honest sentences, which must survive the guard untouched. */
export const MUST_BE_ALLOWED = [
  'This is kept with the evening it happened on, and shown on the area it belongs to.',
  'This is kept on the area it belongs to, where you can take it back. It is never read as you not wanting to.',
  /*
   * And the clause C21's enforcement earned — routing 93, D-274.
   *
   * It survives the classifier because it is not a claim about a **future
   * recommendation**: the subject is this move, the tense is present, and what
   * it describes is a filter that runs now. That is the distinction the whole
   * guard is drawn around, and it is worth one entry here so that a future
   * rewrite of the classifier has to keep it.
   */
  'An answer about the world rather than about tonight also keeps this move off until you take it back.',
  'A walk means leaving, and I could not — someone was in my care.',
  'Recorded on your Health & Recovery page, where you can take it back.',
  'You have already said what was in the way today.',
  'This was a restful thing rather than an effortful one, and there is nothing here worth asking about.',
  'The body was not up to it.',
  'Not where I can do it',
  '“Not true any more” takes it back.',
]

/**
 * What the owner reads as one sentence — QA-84-020, D-199.
 *
 * **This runs in the browser**, and it is passed to `evaluate()` rather than
 * called here, so it must stay self-contained: no imports, no closure over
 * anything in this module.
 *
 * Every collector in this repository used to take elements with **no element
 * children** and read their text. Round 9 defeated that with two lines:
 *
 *     <p><span>The app</span> <span>will choose something better next time.</span></p>
 *
 * The owner reads one sentence. The guard read *"The app"* — a named subject
 * with no futurity — and *"will choose something better next time."* — futurity
 * with no named subject — and both are honest on their own. **A classifier is
 * only as good as the unit it is given**, and a leaf node is not a unit of
 * meaning; it is a unit of markup.
 *
 * So the unit is the element the browser lays out as one run of text: an
 * element none of whose descendants is a block. That is read from
 * `getComputedStyle`, which is what the browser actually did, rather than from
 * a list of tags somebody would have to keep — a `<div>` set to `inline` reads
 * as one sentence and a `<span>` set to `block` does not, and only the computed
 * value knows which.
 *
 * Leaves still come through: a leaf has no descendants, so it trivially
 * qualifies. This strictly widens what is checked.
 */
export function readingUnits(root) {
  const out = []
  const flat = (text) =>
    String(text ?? '')
      .replace(/\s+/g, ' ')
      .trim()
  const isInline = (element) => {
    const display = getComputedStyle(element).display
    return display.startsWith('inline') || display === 'contents' || display.startsWith('ruby')
  }

  /*
   * Where a string came from, which is the only sound way to subtract one —
   * QA-84-024, D-200.
   *
   * Round 9 removed the composed review from the catalogue check by deleting
   * every screen line **equal to** a line of the export. Round 10 rendered
   * *"This needs special care."* on Data and put the same words in the
   * document, and the ordinary sentence vanished with the generated one.
   * **Provenance is not a property of a string.** A unit is part of the
   * composed review when the element it was read from is inside the control
   * that holds it, and never because two strings match.
   */
  /*
   * The composed review is a **control's own value**, not a subtree —
   * QA-84-029.
   *
   * Round 10 asked `closest('[data-testid="export-text"]')`, so anything under
   * an ancestor carrying that marker counted as generated. Round 11 moved the
   * marker onto a wrapper holding the textarea *and* an ordinary paragraph, and
   * the paragraph inherited a provenance it never had. **DOM containment is not
   * composition provenance.** What the composer produced is exactly the string
   * the control holds, so only that string is generated: the element must carry
   * the marker itself, and the text must be its own `value`.
   */
  const isComposedControl = (element) =>
    typeof element.getAttribute === 'function' &&
    element.getAttribute('data-testid') === 'export-text' &&
    typeof element.value === 'string'

  const push = (text, element, generated = false) => {
    const value = flat(text)
    if (value !== '') out.push({ text: value, generated })
  }

  for (const element of [root, ...root.querySelectorAll('*')]) {
    /*
     * Everything the browser renders as words, not everything in `textContent`
     * — QA-84-023, D-200.
     *
     * A `placeholder` is on the screen and is not text content, and Round 10
     * put the prohibited sentence in one. The same is true of `title`, of an
     * image's `alt`, of what a text control currently holds, and of anything a
     * stylesheet inserts through `content`. These are the attributes the
     * **browser** turns into words for the owner; they are enumerated because
     * HTML enumerates them, not because somebody guessed which ones mattered.
     */
    push(element.getAttribute('aria-label'), element)
    push(element.getAttribute('placeholder'), element)
    push(element.getAttribute('title'), element)
    push(element.getAttribute('alt'), element)
    if (typeof element.value === 'string' && element.type !== 'password') {
      const composed = isComposedControl(element)
      for (const part of element.value.split('\n')) push(part, element, composed)
    }
    /*
     * Every pseudo-element that can carry `content` — QA-84-033.
     *
     * Round 12 put the promise in a `::marker` rule. `content` renders words
     * from `::before`, `::after` and `::marker` alike, so all three are asked;
     * the list is the CSS specification's, not a guess about which ones matter.
     */
    for (const pseudo of ['::before', '::after', '::marker']) {
      const content = getComputedStyle(element, pseudo).content
      if (typeof content === 'string' && content !== 'none' && content !== 'normal') {
        push(content.replace(/^["']|["']$/g, ''), element)
      }
    }

    // A container of blocks is not a sentence; its blocks are.
    if ([...element.querySelectorAll('*')].some((child) => !isInline(child))) continue

    /*
     * Split on newlines, because a `<textarea>` or `<pre>` can hold a whole
     * composed document in one text node. The owner reads those as separate
     * lines, so they are separate units, and a proximity window never reads
     * the end of one line against the start of the next.
     */
    for (const part of String(element.textContent ?? '').split('\n')) {
      push(part, element, isComposedControl(element))
    }
  }

  const seen = new Set()
  const units = []
  for (const unit of out) {
    const key = `${unit.generated ? 'G' : 'P'}|${unit.text}`
    if (seen.has(key)) continue
    seen.add(key)
    units.push(unit)
  }
  return units
}
