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
import { originalPositionFor, TraceMap } from '@jridgewell/trace-mapping'
import {
  APPROVED_FUTURE_COPY,
  adaptationClaimsOnAnyScreen,
  withoutApprovedNonPromises,
  withoutApprovedFutureCopy,
} from './adaptation-claims.mjs'

const ASSETS = 'dist/assets'
const LABORATORY = 'QaScreen'

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
function stringsIn(source, originAt = () => null) {
  const found = new Map()
  const seen = new Set()
  const structural = new Set(['type', 'start', 'end', 'loc', 'range'])

  const record = (value, from) => {
    if (typeof value !== 'string' || value === '') return
    let origins = found.get(value)
    if (origins === undefined) {
      origins = new Set()
      found.set(value, origins)
    }
    for (const node of from) {
      const origin = originAt(node)
      if (origin !== null) origins.add(origin)
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
            : null
    if (ordered !== null) {
      const parts = []
      for (const element of ordered) {
        const piece = piecesOf(element)
        if (piece === null) return null
        parts.push(...piece)
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

  const joinRun = (run) => {
    if (run.length < 2) return
    const nodes = run.map((piece) => piece.at)
    record(run.map((piece) => piece.text).join(' '), nodes)
    record(run.map((piece) => piece.text).join(''), nodes)
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

    let run = []
    for (const child of childrenOf(node)) {
      const pieces = piecesOf(child)
      if (pieces === null) {
        joinRun(run)
        run = []
        continue
      }
      run.push(...pieces)
    }
    joinRun(run)

    if (node.type === 'Literal' && typeof node.value === 'string') record(node.value, [node])
    if (node.type === 'TemplateLiteral') {
      for (const quasi of node.quasis) {
        record(quasi.value.cooked ?? quasi.value.raw ?? '', [quasi])
      }
    }

    for (const child of childrenOf(node)) walk(child)
  }

  walk(acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'module', locations: true }))
  return found
}

/**
 * Every string a stylesheet renders — QA-84-033.
 *
 * `content` puts words on the screen exactly as a text node does, and Round 12
 * shipped the promise in a `::marker` rule. Stylesheets ship, so stylesheets
 * are read: every `content:` declaration in every CSS chunk. Their origin is
 * the stylesheet itself — CSS is not built from modules the way the script
 * chunk is, and pretending otherwise would be a provenance nobody checked.
 */
function contentIn(css, name) {
  const found = new Map()
  for (const match of css.matchAll(/content\s*:\s*([^;}]+)/g)) {
    const raw = (match[1] ?? '').trim()
    for (const piece of raw.matchAll(/"([^"]*)"|'([^']*)'/g)) {
      const value = piece[1] ?? piece[2] ?? ''
      if (value !== '') found.set(value, new Set([name]))
    }
  }
  return found
}

const SEPARATOR = String.fromCharCode(92)
const WHITESPACE = new RegExp(SEPARATOR + 's+', 'g')

function flattened(text) {
  return String(text ?? '')
    .replace(WHITESPACE, ' ')
    .trim()
}

/** A sourcemap source, as a path in this repository. */
function repoPath(source) {
  let at = String(source).split(SEPARATOR).join('/')
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
function approvalsAwayFromHome(shipped) {
  const wrong = []
  for (const approved of APPROVED_FUTURE_COPY) {
    const pin = flattened(approved.pin ?? approved.text)
    const producing = new Set()
    let ships = false
    let untraceable = false
    for (const [text, origins] of shipped) {
      if (!flattened(text).includes(pin)) continue
      ships = true
      if (origins.size === 0) untraceable = true
      for (const origin of origins) producing.add(origin)
    }

    if (!ships) {
      wrong.push({ pin, file: approved.in.join(', '), why: 'is not in the bundle at all' })
      continue
    }
    /*
     * An origin nobody could read is not an origin that agrees.
     *
     * A handful of shipped strings trace to nothing, which is fine for copy the
     * rule already clears. It is not fine for an **approved** sentence: if the
     * words can arrive from a position the map cannot place, the approved home
     * still ships them and this would pass while knowing nothing about where
     * the second copy came from.
     */
    if (untraceable) {
      wrong.push({ pin, file: '(a module the sourcemap could not place)', why: 'also ships it' })
    }
    for (const origin of producing) {
      if (!approved.in.includes(origin))
        wrong.push({ pin, file: origin, why: 'did not have approval to say it' })
    }
    for (const file of approved.in) {
      if (!producing.has(file)) wrong.push({ pin, file, why: 'no longer ships it' })
    }
  }
  return wrong
}

function main() {
  const routing = readFileSync(join('src', 'platform', 'routing.ts'), 'utf8')
  if (!routing.includes('QA_AVAILABLE = !isProduction')) {
    console.error(
      'The QA laboratory is no longer production-gated, so its chunk may not be excluded here.',
    )
    process.exit(1)
  }

  const files = readdirSync(ASSETS).filter((name) => name.endsWith('.js'))
  const chunks = files.filter((name) => !name.startsWith(LABORATORY))
  if (chunks.length === 0) {
    console.error(`No owner-facing bundle found in ${ASSETS}. Run npm run build first.`)
    process.exit(1)
  }

  /*
   * Every shipped string, and the module it came from.
   *
   * The sourcemap is not optional — without it every origin is unknown, the
   * approval check silently has nothing to compare, and this would report a
   * clean run while checking nothing. So a chunk without a map is a failure,
   * not a fallback (D-186: read the gate's own status, and do not let a gate
   * pass by having nothing to say).
   */
  const shipped = new Map()
  const remember = (from) => {
    for (const [value, origins] of from) {
      let known = shipped.get(value)
      if (known === undefined) {
        known = new Set()
        shipped.set(value, known)
      }
      for (const origin of origins) known.add(origin)
    }
  }

  for (const name of chunks) {
    const at = join(ASSETS, `${name}.map`)
    if (!existsSync(at)) {
      console.error(`${name} ships without a sourcemap, so no string in it can be traced to the`)
      console.error('module that produced it. The build must emit sourcemaps for this to check')
      console.error('anything at all.')
      process.exit(1)
    }
    const tracer = new TraceMap(JSON.parse(readFileSync(at, 'utf8')))
    const originAt = (node) => {
      if (node === null || typeof node !== 'object' || node.loc === undefined) return null
      const found = originalPositionFor(tracer, {
        line: node.loc.start.line,
        column: node.loc.start.column,
      })
      return found.source === null || found.source === undefined ? null : repoPath(found.source)
    }
    remember(stringsIn(readFileSync(join(ASSETS, name), 'utf8'), originAt))
  }

  const sheets = readdirSync(ASSETS).filter((name) => name.endsWith('.css'))
  if (sheets.length === 0) {
    console.error(`No stylesheet found in ${ASSETS}. The scan would not see rendered CSS text.`)
    process.exit(1)
  }
  for (const name of sheets) remember(contentIn(readFileSync(join(ASSETS, name), 'utf8'), name))

  if (shipped.size < 1000) {
    console.error(`Only ${shipped.size} strings were read — the scan is not seeing the bundle.`)
    process.exit(1)
  }

  const traced = [...shipped.values()].filter((origins) => origins.size > 0).length
  if (traced < shipped.size / 2) {
    console.error(`Only ${traced} of ${shipped.size} strings could be traced to a module.`)
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
  for (const [value, origins] of shipped) {
    const left = withoutApprovedFutureCopy(withoutApprovedNonPromises(value))
    for (const claim of adaptationClaimsOnAnyScreen(left)) {
      offenders.push({ claim, value, origins })
    }
  }

  if (offenders.length > 0) {
    console.error(
      `${offenders.length} shipped string(s) claim the app will change what it offers.\n` +
        'Approve one in APPROVED_FUTURE_COPY, with the reason, or change the copy.\n',
    )
    for (const { claim, value, origins } of offenders.slice(0, 40)) {
      const from = origins.size === 0 ? 'an untraceable module' : [...origins].join(', ')
      console.error(
        `  - “${claim}”\n    in: ${JSON.stringify(value.slice(0, 160))}\n    from: ${from}`,
      )
    }
    process.exit(1)
  }

  console.log(
    `Rendered copy scan clean — ${shipped.size} shipped strings (${traced} traced to a module) ` +
      `across ${chunks.length} script chunk(s) and ${sheets.length} stylesheet(s).`,
  )
}

main()
