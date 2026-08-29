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
  // The eight causes he can choose between.
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
  'Sore',
  'The body was not up to it.',
  "Haven't got what I need",
  '{move} needs something I have not got.',
  'Something came up',
  'Something came up.',

  // The two questions, and the notes under them.
  'What got in the way?',
  'This is kept on the area it belongs to, where you can take it back. It is never read as you not wanting to.',
  '{move} has not fitted more than once. What is getting in the way?',
  'This is kept with the evening it happened on, and shown on the area it belongs to.',
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
  'Nothing here is a nudge. It is on the screen because you started it, and it goes when the day does — {state} is a real place to leave something.',

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
  'A walk means leaving, and I could not — someone was in my care.',
  'Recorded on your Health & Recovery page, where you can take it back.',
  'You have already said what was in the way today.',
  'This was a restful thing rather than an effortful one, and there is nothing here worth asking about.',
  'The body was not up to it.',
  'Not where I can do it',
  '“Not true any more” takes it back.',
]
