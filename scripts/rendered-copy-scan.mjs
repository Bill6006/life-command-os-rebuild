/**
 * Every string the built app can put in front of the owner — D-201.
 *
 * ## Why this exists at all
 *
 * Eleven rounds of independent QA attacked the whole-app copy guarantee, and
 * eight of them found the same shape of hole: the guard explored some set of
 * states and called it every state. Routes, then routes plus presses, then
 * frames, then timings. Round 11 closed the argument by finding two holes that
 * **cannot** be closed by exploring harder:
 *
 * - **QA-84-027** — the promise was behind *type `show`, then press*. A sweep
 *   that presses every button never supplies the word, and no sweep can guess
 *   it. The reachable-state space is not enumerable.
 * - **QA-84-031** — the promise arrived a second after the screen looked
 *   settled. Any settle window can be outlasted by a longer timer.
 *
 * **So the completeness claim stops being about states.** Whatever state the
 * owner reaches, and whenever it arrives, the words on the screen came from a
 * string in the bundle that ships. That set is finite, it is knowable exactly,
 * and it does not care how the state was reached or how late it appeared.
 *
 * ## What this does and does not establish
 *
 * It establishes that **no string the app ships makes an unapproved claim that
 * what it offers will change**. It runs over the built bundle, parsed with a
 * real parser — `acorn`, the one the toolchain already uses — because a
 * hand-written tokenizer over minified JavaScript is the half-written parser
 * D-197 forbids, and the first draft of this proved it: it mis-read three
 * fragments of React's own code as product copy.
 *
 * **It reads literal composition, and it stops at data — D-202.** Round 12 put
 * a promise in four adjacent literals and this scan called them four innocent
 * strings, so it now joins `+` chains, template quasis and array elements and
 * classifies the joined forms too. What it still cannot see is a sentence whose
 * middle comes from the engine: `'The app will ' + verb + ' next time'` is two
 * strings here and one sentence on the screen, and no parser can know what
 * `verb` will be.
 *
 * That remainder is what the browser sweeps are for, and it is why they stay —
 * **but D-201 was wrong to imply the two halves meet.** A runtime composition
 * in a state no sweep reaches is in neither, and D-202 says so rather than
 * claiming a whole-app guarantee that is not one. Neither half is a sample of
 * the other, and this comment says which is which so nobody has to guess later.
 *
 * The QA laboratory's chunk is excluded, for the reason `#/qa` is excluded from
 * the route crawl: `QA_AVAILABLE` is `!isProduction`, so it is not code the
 * product ships to the owner. The check below fails if that stops being true.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as acorn from 'acorn'
import { build } from 'vite'
import { MANIFEST } from './release-manifest.mjs'
import {
  APPROVED_FUTURE_COPY,
  adaptationClaimsOnAnyScreen,
  couldCloseAClaim,
  couldOpenAClaim,
  LONGEST_CLOSER,
  LONGEST_OPENER,
  withoutApprovedNonPromises,
  withoutApprovedFutureCopy,
} from './adaptation-claims.mjs'

const LABORATORY = 'QaScreen'
const SHIPPED = 'dist'

/**
 * Every string a module ships, and every sentence its adjacent literals make —
 * QA-84-032, D-202.
 *
 * Round 11 read literals one at a time. Round 12 wrote the promise as
 *
 *     ['The app', 'will choose', 'something better', 'next time.'].join(' ')
 *
 * where every piece is innocent, and put it behind a state the press sweep does
 * not reach. Neither half saw it. **Pieces that sit together in one expression
 * are written together and read together**, so they are classified together as
 * well: an array of strings, a chain of `+`, and a template's own quasis are
 * each joined and offered to the classifier alongside their parts.
 *
 * The join is deliberately generous — a space between pieces — because that is
 * what `join(' ')` and ordinary prose concatenation produce, and a guard that
 * assumed the tighter form would miss the looser one.
 *
 * **What this still does not see** is a sentence assembled from values rather
 * than from neighbouring literals: `pieces.map(f).join('')` over data. That is
 * named in D-202 rather than implied, because assembling it needs to know what
 * the data is, which is running the program.
 */
function stringsIn(source) {
  const found = new Map()
  const seen = new Set()
  const structural = new Set(['type', 'start', 'end', 'loc', 'range'])

  const record = (value, from, joined = false) => {
    if (typeof value !== 'string' || value === '') return
    let known = found.get(value)
    if (known === undefined) {
      known = { at: new Set(), joined: false, pieces: new Set() }
      found.set(value, known)
    }
    if (joined) {
      known.joined = true
      /*
       * What it was joined from — QA-84-060. A join whose pieces are each real
       * copy in a real module may legitimately straddle two of them; a join
       * whose pieces nobody can place was made after the modules were, and is
       * the shape a render-time plugin leaves behind.
       */
      for (const piece of from) known.pieces.add(piece.text)
    }
  }

  /**
   * The literal pieces of an expression, in source order — or null.
   *
   * **This stopped being a list of constructs — D-204.** Round 12 joined three
   * shapes and called it *every literal composition*. Round 13 handed four
   * literals to a helper and walked through the gap, so the shapes became
   * seven and the claim became *every ordered group the language writes down*.
   * Round 14 then wrote the four literals as **computed property names**,
   * which is an eighth. A list that has been short three times is not going to
   * be complete on the fourth guess.
   *
   * So the grouping is read off the **tree** instead. `walk` joins each run of
   * adjacent children that yield pieces, at every node, whatever that node is;
   * this function only says what a single expression contributes. Nothing here
   * enumerates a construct, so nothing here can omit one.
   *
   * Two rules make the runs meaningful rather than noise:
   *
   * - **a non-string literal contributes nothing and breaks nothing.** `0` in
   *   `{['The app']: 0}` is not a word, and it is not a reason to stop reading.
   * - **anything the guard cannot evaluate breaks the run.** An identifier or a
   *   call is a value this cannot know, so the words on either side of it were
   *   never provably adjacent on a screen.
   *
   * A property's key counts only when it is **computed**: `{ title: 'x' }`
   * names a field, `{ ['The app']: 0 }` writes a word.
   */
  const piecesOf = (node) => {
    if (node === null || typeof node !== 'object') return null
    if (node.type === 'Literal') {
      return typeof node.value === 'string' ? [{ text: node.value, at: node }] : []
    }
    if (node.type === 'TemplateLiteral') {
      return node.quasis.map((quasi) => ({
        text: quasi.value.cooked ?? quasi.value.raw ?? '',
        at: quasi,
      }))
    }
    if (node.type === 'BinaryExpression' && node.operator === '+') {
      const left = piecesOf(node.left)
      const right = piecesOf(node.right)
      return left === null || right === null ? null : [...left, ...right]
    }
    if (node.type === 'Property') {
      /*
       * A **string** key is a word; a name is not — QA-84-044.
       *
       * The first version of this asked whether the key was `computed`, which
       * is a question about source that the bundle has already answered:
       * `{ ['The app']: 0 }` ships as `{ "The app": 0 }`, and the distinction
       * the check relied on was compiled away before it ever looked. What
       * survives minification is whether the key is a string at all, so that
       * is what is asked. `{ title: x }` names a field and says nothing.
       */
      const key = node.key.type === 'Identifier' && !node.computed ? [] : piecesOf(node.key)
      const value = piecesOf(node.value)
      return key === null || value === null ? null : [...key, ...value]
    }
    const ordered =
      node.type === 'ArrayExpression'
        ? node.elements
        : node.type === 'ObjectExpression'
          ? node.properties
          : node.type === 'SequenceExpression'
            ? node.expressions
            : node.type === 'CallExpression' || node.type === 'NewExpression'
              ? node.arguments
              : null
    if (ordered !== null) {
      const calling = node.type === 'CallExpression' || node.type === 'NewExpression'
      const parts = []
      for (const [index, element] of ordered.entries()) {
        const piece = piecesOf(element)
        if (piece === null) return null
        /*
         * A built element's **type** sits in a call's first argument, and it is
         * what is being made rather than anything anybody reads. Marking it
         * here rather than matching the word anywhere keeps the drop honest:
         * copy that legitimately says *"a table"* or *"the code"* is not a
         * type, so it stays in the sentence.
         */
        parts.push(
          ...piece.map((part) => (calling && index === 0 ? { ...part, type: true } : part)),
        )
      }
      return parts
    }
    return null
  }

  /** A node's own child nodes, in the order they were written. */
  const childrenOf = (node) => {
    const out = []
    for (const key of Object.keys(node)) {
      if (structural.has(key)) continue
      const value = node[key]
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== null && typeof item === 'object' && typeof item.type === 'string') {
            out.push(item)
          }
        }
      } else if (value !== null && typeof value === 'object' && typeof value.type === 'string') {
        out.push(value)
      }
    }
    return out.sort((first, second) => first.start - second.start)
  }

  const joinRun = (whole) => {
    // An element's type is what is being built, not what is read — QA-84-047.
    const run = whole.filter((piece) => !(piece.type === true && HTML_ELEMENTS.has(piece.text)))
    if (run.length < 2) return
    record(run.map((piece) => piece.text).join(' '), run, true)
    record(run.map((piece) => piece.text).join(''), run, true)

    /*
     * And the pairs that could actually form one — QA-84-051, QA-84-056.
     *
     * The whole-run join assumes every piece renders. Round 16 called a helper
     * that dropped its second argument, with the dropped one long enough to
     * push a subject and its verb apart; Round 17 did it again and **split the
     * subject** across `'The '` and `'app '`, so neither piece opened a claim
     * on its own and no pair was built at all.
     *
     * **Widening the classifier's window is the wrong answer** — unbounded, it
     * convicts the private-permission note, which joins an honest sentence
     * about now to an honest sentence about a setting. What is true is that any
     * two stretches of a run might end up beside each other, because what
     * happens to the pieces between them is a computation this does not
     * evaluate.
     *
     * So an opener is the **shortest run of adjacent pieces ending here** that
     * can open a claim, and a closer the shortest run starting here that can
     * close one. Neither search is capped by a number chosen for it: nothing in
     * the vocabulary is longer than its longest phrase, and the phrase must be
     * contiguous, so a window wider than that can never newly match.
     */
    const openers = []
    for (let to = 0; to < run.length; to += 1) {
      let text = ''
      for (let from = to; from >= 0; from -= 1) {
        text = `${run[from]?.text ?? ''}${text}`
        if (couldOpenAClaim(text)) {
          openers.push({ to, text, pieces: run.slice(from, to + 1) })
          break
        }
        if (text.length > LONGEST_OPENER) break
      }
    }

    const closers = []
    for (let from = 0; from < run.length; from += 1) {
      let text = ''
      for (let to = from; to < run.length; to += 1) {
        text = `${text}${run[to]?.text ?? ''}`
        if (couldCloseAClaim(text)) {
          closers.push({ from, text, pieces: run.slice(from, to + 1) })
          break
        }
        if (text.length > LONGEST_CLOSER) break
      }
    }

    for (const opener of openers) {
      for (const closer of closers) {
        if (closer.from <= opener.to + 1) continue
        const both = [...opener.pieces, ...closer.pieces]
        record(`${opener.text} ${closer.text}`, both, true)
        record(`${opener.text}${closer.text}`, both, true)
      }
    }
  }

  const walk = (node) => {
    if (node === null || typeof node !== 'object' || seen.has(node)) return
    seen.add(node)
    if (Array.isArray(node)) {
      for (const child of node) walk(child)
      return
    }

    const whole = piecesOf(node)
    if (whole !== null) joinRun(whole)

    /*
     * The same type position, seen from the other direction. `piecesOf` marks a
     * call's first argument; this loop walks a node's children, where that
     * argument arrives as an ordinary child and would keep its element name.
     * Round 16 showed why that matters: the leftover name was the only thing
     * catching a laundered transplant, which is protection by noise, and Round
     * 15 established that noise is not protection.
     */
    const typePosition =
      node.type === 'CallExpression' || node.type === 'NewExpression'
        ? node.arguments?.[0]
        : undefined
    let run = []
    for (const child of childrenOf(node)) {
      const pieces = piecesOf(child)
      if (pieces === null) {
        joinRun(run)
        run = []
        continue
      }
      run.push(
        ...(child === typePosition ? pieces.map((part) => ({ ...part, type: true })) : pieces),
      )
    }
    joinRun(run)

    if (node.type === 'Literal' && typeof node.value === 'string') {
      record(node.value, [{ text: node.value, at: node }])
    }
    if (node.type === 'TemplateLiteral') {
      for (const quasi of node.quasis) {
        const text = quasi.value.cooked ?? quasi.value.raw ?? ''
        record(text, [{ text, at: quasi }])
      }
    }

    for (const child of childrenOf(node)) walk(child)
  }

  walk(acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'module', locations: true }))
  return found
}

/**
 * Every string a stylesheet renders — QA-84-033, and what it renders them **as**
 * — QA-84-059.
 *
 * `content` puts words on the screen exactly as a text node does, and Round 12
 * shipped a promise in a `::marker` rule. Round 18 then wrote one value as four
 * adjacent strings —
 *
 *     content: 'The app ' 'will choose ' 'something better ' 'next time.';
 *
 * — which is not four values. **CSS concatenates adjacent strings**, and the
 * browser's computed content was the whole sentence, while this read four
 * innocent fragments. So a declaration's fragments are joined in order, exactly
 * as the browser joins them, and the composed value is what gets classified.
 * The fragments are still recorded on their own, because either can be the
 * thing somebody wrote.
 */
function contentIn(css) {
  const found = new Map()
  const keep = (value) => {
    if (value !== '') found.set(value, { at: new Set(), joined: false, pieces: new Set() })
  }
  for (const match of css.matchAll(/content\s*:\s*([^;}]+)/g)) {
    const raw = (match[1] ?? '').trim()
    const pieces = []
    for (const piece of raw.matchAll(/"([^"]*)"|'([^']*)'/g)) {
      const value = piece[1] ?? piece[2] ?? ''
      pieces.push(value)
      keep(value)
    }
    if (pieces.length > 1) keep(pieces.join(''))
  }
  return found
}

const HTML_ELEMENTS = new Set(
  (
    'a abbr address area article aside audio b base bdi bdo big blockquote body br button ' +
    'canvas caption cite code col colgroup data datalist dd del details dfn dialog div dl dt ' +
    'em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr ' +
    'html i iframe img input ins kbd keygen label legend li link main map mark menu menuitem ' +
    'meta meter nav noscript object ol optgroup option output p param picture pre progress q ' +
    'rp rt ruby s samp script section select slot small source span strong style sub summary ' +
    'sup table tbody td template textarea tfoot th thead time title tr track u ul var video wbr'
  ).split(' '),
)

const SEPARATOR = String.fromCharCode(92)
const WHITESPACE = new RegExp(SEPARATOR + 's+', 'g')

function flattened(text) {
  return String(text ?? '')
    .replace(WHITESPACE, ' ')
    .trim()
}

/** A module id from the build graph, as a path in this repository. */
function repoPath(source) {
  let at = String(source).split(SEPARATOR).join('/')
  const root = process.cwd().split(SEPARATOR).join('/')
  if (at.toLowerCase().startsWith(root.toLowerCase() + '/')) at = at.slice(root.length + 1)
  while (at.startsWith('../')) at = at.slice(3)
  return at.startsWith('./') ? at.slice(2) : at
}

/**
 * Where each approved sentence is allowed to live — and where it **actually
 * came from**, which is not the same question — QA-84-041, QA-84-042, D-204.
 *
 * Round 12 pinned approvals to source files by looking for the literal. Round
 * 13 built one out of fragments, so the pin became *what a file can compose*,
 * read out of `src` with the bundle's own extractor. Round 14 broke that twice
 * in one round, and both breaks are the same mistake:
 *
 * - it read `src/**` and matched on the **extension**, so an approved sentence
 *   imported from a `.js` module beside the repository shipped with no origin
 *   the check could see;
 * - it asked what a file **can** compose, so a dead `void ['…', '…']` the
 *   bundler deletes kept a stale approval alive for a sentence that no longer
 *   ships at all.
 *
 * **Both stop being possible when provenance is read from what shipped.** The
 * built chunk carries a sourcemap, so every string in it can be traced to the
 * module it came from — no extension filter, no `src` assumption, and nothing
 * that was compiled away. `@jridgewell/trace-mapping` does the tracing, the
 * mapper Vite already builds this product with, declared for the reason acorn
 * was declared in D-201.
 *
 * Three ways to fail, and they are different sentences on purpose:
 *
 * - a module that ships the words and is not listed is a **transplant**;
 * - a listed module that no longer ships them is a **stale approval**;
 * - and an approval whose sentence is not in the bundle at all is **dead**,
 *   which is the case Round 14 could keep alive with a discarded expression.
 */
/**
 * Where each approved sentence is allowed to live, and where each shipped
 * occurrence of it actually came from — D-207.
 *
 * This question has been answered four different ways and broken four times.
 * D-203 read `src` and asked what a file *could* compose; Round 14 imported an
 * approved sentence from a `.js` module beside the repository. D-204 traced the
 * built chunk's sourcemap; Round 15 rewrote the map. D-205 corroborated the map
 * against the files on disk and against its own positions; Round 16 made all of
 * those statements agree on the wrong module. D-206 walked the app's relative
 * imports from the repository; Round 17 added a **Vite alias**, which that walk
 * does not resolve, and then forged the one thing left to catch it.
 *
 * Every one of those is the same mistake: **a second account of what the build
 * did.** A resolver written here is not the resolver that built the app, and a
 * map is the build talking about itself.
 *
 * So the build is asked to hand over its own graph. Vite is run in process,
 * and Rollup's output gives, for every chunk, the **rendered code of each
 * module in it**. That is not an account of provenance — it is the shipped
 * bytes, already grouped by the module they came from, by the tool that put
 * them there. An alias, a conditional export, a plugin-generated module: all of
 * them arrive here resolved, because the thing that resolved them is what
 * produced this.
 *
 * Two consequences worth stating:
 *
 * - **"can compose" is gone.** A module is a producer of a sentence when its
 *   *rendered* code carries it, so a literal the bundler dropped is not
 *   production, and a sentence that ships has a producer by construction rather
 *   than by pairing two separate facts (QA-84-055).
 * - **stylesheets are in the graph too.** Vite lists every `.css` module of a
 *   chunk, and a `content:` string in the emitted stylesheet is attributed to
 *   the graph stylesheet that carries it. A shipped `content:` nobody can place
 *   fails, rather than being copy with no owner.
 *
 * The coverage claim still comes from the whole chunk: every string in the
 * finished file is classified, whether or not any module accounts for it. What
 * the modules add is **which** module, for the strings where that matters.
 */
/**
 * Whether the build this scan just made is the build that shipped — D-207.
 *
 * Running Vite in process is what makes the module graph available, and it is
 * also a build **made for the guard**. If it diverged from the deployed one —
 * by mode, by environment, by plugin order — the owner would be reading copy
 * this never saw, and nothing here would notice. So it is compared against
 * `dist/`, which is what `npm run verify` built a moment earlier and what the
 * deploy publishes.
 *
 * The outputs are paired by **content**, not by name. A first version paired
 * them by stripping the hash off the filename and immediately mis-read
 * `index-C3-1N9fH.js`, because a content hash can contain a dash of its own.
 * Pairing by what the files say needs no such rule, and is the thing being
 * claimed anyway.
 *
 * **Every emitted output is compared, not only the script chunks — QA-84-058.**
 * The first version of this walked chunks alone, and Round 18 wrote a plugin
 * whose `generateBundle` hook looked at `isWrite`: on the guard's in-process
 * build the stylesheet was harmless, and on the writing build that produced
 * `dist/` it said something else entirely. A tie that covers one kind of asset
 * is not build identity, it is script identity.
 *
 * Two things are masked, and only two: the **content-hash filenames** chunks
 * use to refer to each other, and the **build stamp** the product embeds. Both
 * differ between any two builds of identical source, neither is copy, and the
 * second is what makes the first differ. The pairing must be one to one, so a
 * chunk that shipped and was not built here fails as loudly as the reverse.
 */
function settled(text) {
  return String(text)
    .replace(/[/][/]# sourceMappingURL=.*$/m, '')
    .replace(/-[A-Za-z0-9_-]{8}[.](js|css)/g, '-HASH.$1')
    .replace(/[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:[.][0-9]+)?Z/g, 'WHEN')
    .trimEnd()
}

function shippedFiles(dir, prefix = '') {
  const found = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const at = join(dir, entry.name)
    const name = `${prefix}${entry.name}`
    if (entry.isDirectory()) found.push(...shippedFiles(at, `${name}/`))
    /*
     * The release manifest describes the build; it is not part of it — D-211.
     * Rollup did not emit it, so pairing outputs with the tree would report it
     * as a file that shipped and was not built. It carries no copy, and what
     * checks *it* is `release-integrity.mjs`, against the live site.
     */
    else if (name !== MANIFEST) found.push([name, settled(readFileSync(at, 'utf8'))])
  }
  return found
}

function differsFromShipped(built) {
  const onDisk = new Map(shippedFiles(SHIPPED))

  const complaints = []
  for (const item of built) {
    const mine = settled(item.type === 'chunk' ? item.code : item.source)
    const match = [...onDisk.entries()].find(([, shipped]) => shipped === mine)
    if (match === undefined) {
      complaints.push(`${item.fileName} is not any of the files that shipped`)
      continue
    }
    onDisk.delete(match[0])
  }
  for (const file of onDisk.keys()) {
    complaints.push(`${file} shipped and this build did not produce it`)
  }
  return complaints
}

async function shippedByModule() {
  /*
   * The project's own options, with only `write` turned off — QA-84-058.
   *
   * Anything overridden here is a way for this build to differ from the one
   * that shipped, and the comparison below would then be comparing two
   * different things. `write` is the one exception, because the point is to
   * read the graph without touching what the deploy publishes; every output is
   * still compared to what is on disk, sourcemaps included.
   */
  const bundled = await build({ logLevel: 'silent', build: { write: false } })
  const outputs = Array.isArray(bundled) ? bundled : [bundled]

  const shipped = new Map()
  const stylesheets = new Set()
  const built = []
  let chunks = 0
  let sheets = 0

  const remember = (from, origin) => {
    for (const [value, found] of from) {
      let known = shipped.get(value)
      if (known === undefined) {
        known = { at: new Set(), joined: false, pieces: new Set() }
        shipped.set(value, known)
      }
      if (found.joined) known.joined = true
      for (const piece of found.pieces) known.pieces.add(piece)
      if (origin !== null) known.at.add(origin)
      for (const already of found.at) known.at.add(already)
    }
  }

  for (const one of outputs) {
    for (const item of one.output) {
      built.push(item)
      const laboratory = item.fileName.includes(LABORATORY)
      if (item.type === 'chunk') {
        /*
         * Stylesheets are collected from **every** chunk, the laboratory's
         * included, because the emitted CSS is read the same way — D-202. Only
         * the laboratory's *code* is skipped, for the reason  is skipped
         * by the route crawl.
         */
        for (const [id] of Object.entries(item.modules)) {
          if (id.endsWith('.css')) stylesheets.add(repoPath(id))
        }
        if (laboratory) continue
        chunks += 1
        // The finished file, for coverage: nothing in it goes unclassified.
        remember(stringsIn(item.code), null)
        // And each module's own rendered bytes, for provenance.
        for (const [id, rendered] of Object.entries(item.modules)) {
          const code = rendered?.code
          if (typeof code !== 'string' || code === '') continue
          remember(stringsIn(code), repoPath(id))
        }
        continue
      }

      if (!item.fileName.endsWith('.css')) continue
      sheets += 1
      /*
       * A source stylesheet is read with the **same rule** as the emitted one —
       * QA-84-059. Asking whether its text contains the value would miss a
       * declaration written as adjacent strings, which is the very thing the
       * browser composes; running `contentIn` over the source instead means
       * both sides are asked the same question.
       */
      const carries = new Map(
        [...stylesheets]
          .filter((sheet) => existsSync(sheet))
          .map((sheet) => [sheet, contentIn(readFileSync(sheet, 'utf8'))]),
      )

      const unplaced = []
      for (const [value] of contentIn(String(item.source))) {
        const from = [...carries.entries()]
          .filter(([, said]) => said.has(value))
          .map(([sheet]) => sheet)
        if (from.length === 0) unplaced.push(value)
        for (const sheet of from) {
          remember(new Map([[value, { at: new Set(), joined: false, pieces: new Set() }]]), sheet)
        }
        if (from.length === 0) {
          remember(new Map([[value, { at: new Set(), joined: false, pieces: new Set() }]]), null)
        }
      }
      if (unplaced.length > 0) {
        console.error(`${item.fileName} renders text no stylesheet in the module graph carries:`)
        for (const value of unplaced.slice(0, 10)) console.error(`  - ${JSON.stringify(value)}`)
        console.error('Copy nobody can place is copy nobody approved.')
        process.exit(1)
      }
    }
  }

  const complaints = differsFromShipped(built)
  if (complaints.length > 0) {
    for (const complaint of complaints) console.error(`${complaint}.`)
    console.error('This scan builds the app to read its module graph, and that build must be')
    console.error('the one that shipped. Run npm run build first; if it was, the two differ.')
    process.exit(1)
  }

  return { shipped, chunks, sheets, stylesheets }
}

/**
 * Which module each approved sentence ships from, and whether that was allowed.
 *
 * Three ways to fail, and they say different things: a module that ships the
 * words and is not listed is a **transplant**; a listed module that no longer
 * ships them is a **stale approval**; and a sentence in the bundle that no
 * module accounts for is **unplaced**, which is the case Round 17 made by
 * putting the words in a stylesheet while the approved module merely still
 * contained them.
 */
function approvalsAwayFromHome(shipped) {
  const wrong = []
  for (const approved of APPROVED_FUTURE_COPY) {
    const pin = flattened(approved.pin ?? approved.text)

    let ships = false
    let unplaced = false
    const producing = new Set()
    for (const [text, known] of shipped) {
      if (!flattened(text).includes(pin)) continue
      ships = true
      /*
       * A **literal** that ships must have come from a module. A **join** is
       * this guard's own construction over the finished chunk, and one whose
       * pieces sit in two different modules belongs to neither — so an unplaced
       * join is allowed **only when every piece it was made from is itself
       * placed**.
       *
       * Round 18 is why that second half exists: a `renderChunk` plugin wrote
       * the approved sentence into the chunk after the modules were attributed,
       * as two literals nobody could place, and the join of them borrowed its
       * approval from the honest occurrence in another module entirely. A join
       * made of nothing anybody wrote is not a join across modules; it is copy
       * that arrived after them.
       */
      if (known.at.size === 0) {
        const fromNowhere =
          !known.joined ||
          [...known.pieces].some((piece) => (shipped.get(piece)?.at.size ?? 0) === 0)
        if (fromNowhere) unplaced = true
      }
      for (const origin of known.at) producing.add(origin)
    }

    if (!ships) {
      wrong.push({ pin, file: approved.in.join(', '), why: 'is not in the bundle at all' })
      continue
    }
    if (unplaced) {
      wrong.push({ pin, file: '(no module in the build graph)', why: 'also ships it' })
    }
    for (const origin of producing) {
      if (!approved.in.includes(origin)) {
        wrong.push({ pin, file: origin, why: 'ships it without approval' })
      }
    }
    for (const file of approved.in) {
      if (!producing.has(file)) wrong.push({ pin, file, why: 'no longer ships it' })
    }
  }
  return wrong
}

async function main() {
  const routing = readFileSync(join('src', 'platform', 'routing.ts'), 'utf8')
  if (!routing.includes('QA_AVAILABLE = !isProduction')) {
    console.error(
      'The QA laboratory is no longer production-gated, so its chunk may not be excluded here.',
    )
    process.exit(1)
  }

  if (!existsSync(SHIPPED)) {
    console.error(`No ${SHIPPED} to compare against. Run npm run build first.`)
    process.exit(1)
  }

  const { shipped, chunks, sheets, stylesheets } = await shippedByModule()

  if (chunks === 0) {
    console.error('The build produced no owner-facing chunk.')
    process.exit(1)
  }
  if (sheets === 0) {
    console.error('The build produced no stylesheet, so the scan would not see rendered CSS text.')
    process.exit(1)
  }
  if (stylesheets.size === 0) {
    console.error('No stylesheet is in the module graph, so no CSS text could be placed.')
    process.exit(1)
  }
  if (shipped.size < 1000) {
    console.error(`Only ${shipped.size} strings were read — the scan is not seeing the bundle.`)
    process.exit(1)
  }

  const placed = [...shipped.values()].filter((known) => known.at.size > 0).length
  if (placed < shipped.size / 2) {
    console.error(`Only ${placed} of ${shipped.size} strings could be placed in a module.`)
    console.error('Provenance is the whole approval check, so this is a failure, not a warning.')
    process.exit(1)
  }

  const wrong = approvalsAwayFromHome(shipped)
  if (wrong.length > 0) {
    console.error(
      `${wrong.length} approved sentence(s) are not where they were approved.\n` +
        'An approval covers a sentence in the module it was reasoned about, and nowhere else.\n',
    )
    for (const { pin, file, why } of wrong) {
      console.error(`  - ${file} ${why}: ${JSON.stringify(pin.slice(0, 120))}`)
    }
    process.exit(1)
  }

  const offenders = []
  for (const [value, known] of shipped) {
    const left = withoutApprovedFutureCopy(withoutApprovedNonPromises(value))
    for (const claim of adaptationClaimsOnAnyScreen(left)) {
      offenders.push({ claim, value, origins: known.at })
    }
  }

  if (offenders.length > 0) {
    console.error(
      `${offenders.length} shipped string(s) claim the app will change what it offers.\n` +
        'Approve one in APPROVED_FUTURE_COPY, with the reason, or change the copy.\n',
    )
    for (const { claim, value, origins } of offenders.slice(0, 40)) {
      const from = origins.size === 0 ? 'no module in the graph' : [...origins].join(', ')
      console.error(
        `  - “${claim}”\n    in: ${JSON.stringify(value.slice(0, 160))}\n    from: ${from}`,
      )
    }
    process.exit(1)
  }

  console.log(
    `Rendered copy scan clean — ${shipped.size} shipped strings (${placed} placed in a module) ` +
      `across ${chunks} script chunk(s) and ${sheets} stylesheet(s).`,
  )
}

await main()
