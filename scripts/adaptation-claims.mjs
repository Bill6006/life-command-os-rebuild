/**
 * Does this sentence claim the app will change what it offers? — QA-84-010, D-192.
 *
 * ## Why this exists, and why it is not another list of phrases
 *
 * D-187 says the blocker path may record what was in the way and may not say
 * what will follow from it, because nothing follows from it: `applyConstraints`
 * never reads `situation.constraints`, and `cautionsFor` matches a constraint's
 * concept against a candidate's `leansOn`, which never holds a `blocker.*`
 * concept.
 *
 * The guard written for that rule blacklisted five formulations built around
 * *stop*, *won't*, *no longer*, *avoid* and *from now on*. It **collected the
 * live string** and did not match it, because the string on the deployed build
 * said
 *
 *     This is kept so the app can offer something that fits next time.
 *
 * and a second one said *"so the app can stop putting it in front of you at the
 * wrong moment"* — a promise built from words the list did not contain. Three
 * separate narrower copies of that same list existed, in the synthetic suite,
 * the browser suite and the Android gate, and all three passed while the promise
 * rendered. **That is what a phrase blacklist is: a record of the wordings
 * somebody already thought of.**
 *
 * ## The class, stated as a rule
 *
 * A claim of future recommendation adaptation has three parts, and this asks for
 * all three rather than for a sentence:
 *
 * 1. **an actor** — the app, or an unnamed *it* doing the app's work;
 * 2. **a modality** that is not the present — *can*, *could*, *will*, *would*,
 *    *is going to*, *from now on*, *next time*, *in future*, *later*, *again*;
 * 3. **an adaptation verb** — something about what is put in front of him:
 *    suggest, offer, propose, recommend, put, show, bring up, fit, avoid, skip,
 *    stop, change, adapt, adjust, tailor, take into account, work around.
 *
 * The cross product is a few hundred formulations from three short lists, and it
 * catches wordings nobody wrote down — which is the whole difference between a
 * guard about a class and a guard about the cases somebody remembered.
 *
 * ## What it deliberately allows
 *
 * **Denials, and they need no exemption.** *"There is nothing the app would do
 * differently, so it is leaving it"* is the sentence the silent branch exists to
 * say, and it passes because it contains no adaptation verb at all — it is about
 * doing nothing. The first draft of this guard *did* carry a list of negators
 * that cancelled a match, and that list immediately let through *"the app will
 * no longer put this in front of you"*, because it read the *no* in *no longer*
 * as a denial. **A negated promise is still a promise**, and dropping the
 * exemption made the rule both simpler and stricter.
 *
 * **The present tense.** *"This is kept"*, *"it is recorded here"*, *"you can
 * take it back"* — all fine, and all about what is true now.
 *
 * ## Where it lives, and why here rather than in a test file
 *
 * One definition, imported by all three gates. It is plain ESM under `scripts/`
 * for exactly one reason: `scripts/android-gate.mjs` is a node script that
 * cannot import TypeScript, and the finding was that the three gates had drifted
 * into three different rules. A guard that says different things in different
 * places is not a guard.
 */

/** Who the sentence says is acting. Unnamed `it` counts — the copy uses both. */
const ACTORS = ['the app', 'it', 'this', 'the engine', 'now']

/** Anything that is not the present. A promise is always about a later moment. */
const MODALITIES = [
  'can',
  'could',
  'will',
  'would',
  "won't",
  'will not',
  'is going to',
  'going to',
  'shall',
  'may',
  'might',
  'starts to',
  'start to',
  'stops',
  'from now on',
  'next time',
  'in future',
  'in the future',
  'later',
  'again',
  'another time',
  'going forward',
]

/** What the claim is about: the thing the app puts in front of him. */
const ADAPTATION_VERBS = [
  'suggest',
  'suggests',
  'suggesting',
  'offer',
  'offers',
  'offering',
  'propose',
  'proposes',
  'proposing',
  'recommend',
  'recommends',
  'recommending',
  'put',
  'puts',
  'putting',
  'show',
  'shows',
  'showing',
  'bring',
  'brings',
  'bringing',
  'ask',
  'asks',
  'asking',
  'fit',
  'fits',
  'fitting',
  'avoid',
  'avoids',
  'avoiding',
  'skip',
  'skips',
  'skipping',
  'stop',
  'stops',
  'stopping',
  'change',
  'changes',
  'changing',
  'adapt',
  'adapts',
  'adapting',
  'adjust',
  'adjusts',
  'adjusting',
  'tailor',
  'tailors',
  'tailoring',
  'work around',
  'works around',
  'take into account',
  'takes into account',
]

const WORD = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')

/**
 * Every window in `text` that names an actor and then, close behind it, a
 * modality and an adaptation verb.
 *
 * "Close behind" is a bounded lookahead rather than a parse: the copy on these
 * paths is one or two short sentences, and a window wide enough to cross from
 * one claim into an unrelated one would report a promise nobody made.
 */
const WINDOW = 60

/**
 * The claims of future adaptation in a piece of owner-visible copy.
 *
 * Returns the offending fragments, so a failure names what it found rather than
 * only that it found something.
 */
export function adaptationClaims(text) {
  if (typeof text !== 'string' || text.trim() === '') return []
  const lower = text.toLowerCase()
  const found = []

  for (const actor of ACTORS) {
    const at = new RegExp(`\\b${WORD(actor)}\\b`, 'g')
    for (const match of lower.matchAll(at)) {
      const start = match.index ?? 0
      const window = lower.slice(start, start + WINDOW)

      const modality = MODALITIES.find((word) => new RegExp(`\\b${WORD(word)}\\b`).test(window))
      if (modality === undefined) continue

      const verb = ADAPTATION_VERBS.find((word) => new RegExp(`\\b${WORD(word)}\\b`).test(window))
      if (verb === undefined) continue

      found.push(text.slice(start, start + WINDOW).trim())
    }
  }
  return [...new Set(found)]
}

/** Whether any owner-visible string in `strings` claims future adaptation. */
export function claimingStrings(strings) {
  const out = []
  for (const line of strings) {
    const claims = adaptationClaims(line)
    if (claims.length > 0) out.push({ line, claims })
  }
  return out
}

/**
 * The wordings this guard must catch, and the ones it must not.
 *
 * Exported so the guard is proved against them from every gate rather than
 * asserted about. The first two are **the strings that actually shipped** —
 * QA-84-010 read them off the deployed build — and the third is the round 1
 * reintroduction, which the old blacklist did catch and which must keep failing.
 */
export const MUST_BE_CAUGHT = [
  'This is kept so the app can offer something that fits next time. It is never read as you not wanting to.',
  'This is kept so the app can stop putting it in front of you at the wrong moment.',
  'A walk means leaving, and I could not — the app will stop suggesting it.',
  'From now on the app will avoid this.',
  'The app will no longer put this in front of you.',
  'It will suggest something that fits better next time.',
]

/** And the honest sentences, which must survive the guard untouched. */
export const MUST_BE_ALLOWED = [
  'There is nothing the app would do differently, so it is leaving it.',
  'This is kept with the evening it happened on. It is never read as you not wanting to.',
  'A walk means leaving, and I could not — someone was in my care.',
  'Recorded on your Health & Recovery page, where you can take it back.',
  'You said this was in the way. Nothing about it changes what the app suggests.',
]
