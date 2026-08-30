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
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as acorn from 'acorn'
import * as esbuild from 'esbuild'
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
function stringsIn(source) {
  const found = new Set()
  const seen = new Set()

  const add = (value) => {
    if (typeof value === 'string' && value !== '') found.add(value)
  }

  /**
   * The literal pieces of an expression, in source order — or null.
   *
   * **The list below is the language's, not a guess — D-203.** Round 12 joined
   * three shapes and called it *every literal composition*; Round 13 handed
   * four literals to a helper and walked through the gap. Following the helper
   * is not the answer, because a helper can reorder or rewrite its arguments
   * and an evaluator that chases user functions is the interpreter-inside-a-
   * guard D-197 forbids.
   *
   * What is enumerable is the set of constructs in which JavaScript writes an
   * **ordered sequence of expressions**, and it is short:
   *
   * - `'a' + 'b'` — a `+` chain
   * - `` `a${x}b` `` — a template's quasis
   * - `['a', 'b']` — an array literal
   * - `{ a: 'x', b: 'y' }` — an object literal's values
   * - `('a', 'b')` — a sequence expression
   * - `f('a', 'b')` and `new C('a', 'b')` — an argument list (in `walk`)
   * - `const a = 'x', b = 'y'` — one declaration statement (in `walk`)
   *
   * JSX needs no entry: both inputs reach this as function calls, because the
   * bundle is built and the source is transformed before it is parsed.
   *
   * Every element must itself yield pieces, so one non-literal makes the whole
   * group silent rather than producing a partial sentence that was never on
   * anybody's screen.
   */
  const piecesOf = (node) => {
    if (node === null || typeof node !== 'object') return null
    if (node.type === 'Literal' && typeof node.value === 'string') return [node.value]
    if (node.type === 'TemplateLiteral') {
      return node.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw ?? '')
    }
    if (node.type === 'BinaryExpression' && node.operator === '+') {
      const left = piecesOf(node.left)
      const right = piecesOf(node.right)
      return left === null || right === null ? null : [...left, ...right]
    }
    if (node.type === 'SequenceExpression') {
      const parts = []
      for (const element of node.expressions) {
        const piece = piecesOf(element)
        if (piece === null) return null
        parts.push(...piece)
      }
      return parts
    }
    if (node.type === 'ObjectExpression') {
      const parts = []
      for (const property of node.properties) {
        if (property.type !== 'Property') return null
        const piece = piecesOf(property.value)
        if (piece === null) return null
        parts.push(...piece)
      }
      return parts
    }
    if (node.type === 'ArrayExpression') {
      const parts = []
      for (const element of node.elements) {
        const piece = piecesOf(element)
        if (piece === null) return null
        parts.push(...piece)
      }
      return parts
    }
    return null
  }

  const walk = (node) => {
    if (node === null || typeof node !== 'object' || seen.has(node)) return
    seen.add(node)
    if (Array.isArray(node)) {
      for (const child of node) walk(child)
      return
    }

    const pieces = piecesOf(node)
    if (pieces !== null && pieces.length > 1) {
      add(pieces.join(' '))
      add(pieces.join(''))
    }

    /*
     * An argument list is an ordered group of literals too — QA-84-038.
     *
     * Round 13 handed four literals to a local helper that reduced them with
     * spaces. Every argument was a literal and the result was a sentence, but
     * nothing here followed the call. **Following the call is not the fix** —
     * a helper can do anything, and an evaluator that chases user functions is
     * the interpreter-inside-a-guard D-197 forbids. What is enumerable is the
     * set of constructs in which the language writes an ordered sequence of
     * expressions, and an argument list is one of them, exactly as an array
     * literal is. Every argument must yield pieces, so `f(x, 'a')` stays quiet.
     */
    if (node.type === 'VariableDeclaration' && node.declarations.length > 1) {
      const parts = []
      let literal = true
      for (const declarator of node.declarations) {
        const piece = declarator.init === null ? null : piecesOf(declarator.init)
        if (piece === null) {
          literal = false
          break
        }
        parts.push(...piece)
      }
      if (literal && parts.length > 1) {
        add(parts.join(' '))
        add(parts.join(''))
      }
    }

    if (node.type === 'CallExpression' || node.type === 'NewExpression') {
      const parts = []
      let literal = true
      for (const argument of node.arguments ?? []) {
        const piece = piecesOf(argument)
        if (piece === null) {
          literal = false
          break
        }
        parts.push(...piece)
      }
      if (literal && parts.length > 1) {
        add(parts.join(' '))
        add(parts.join(''))
      }
    }
    if (node.type === 'Literal' && typeof node.value === 'string') add(node.value)
    if (node.type === 'TemplateLiteral') {
      for (const quasi of node.quasis) add(quasi.value.cooked ?? quasi.value.raw ?? '')
    }

    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'start' || key === 'end' || key === 'loc' || key === 'range') {
        continue
      }
      walk(node[key])
    }
  }

  walk(acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'module' }))
  return found
}

/**
 * Every string a stylesheet renders — QA-84-033, D-202.
 *
 * `content` puts words on the screen exactly as a text node does, and Round 12
 * shipped the promise in a `::marker` rule. The scan read only the JavaScript
 * chunk, so the sentence was in neither half of D-201. Stylesheets ship, so
 * stylesheets are read: every `content:` declaration in every CSS chunk.
 */
function contentIn(css) {
  const found = new Set()
  for (const match of css.matchAll(/content\s*:\s*([^;}]+)/g)) {
    const raw = (match[1] ?? '').trim()
    for (const piece of raw.matchAll(/"([^"]*)"|'([^']*)'/g)) {
      const value = piece[1] ?? piece[2] ?? ''
      if (value !== '') found.add(value)
    }
  }
  return found
}

const SEPARATOR = String.fromCharCode(92)
const WHITESPACE = new RegExp(SEPARATOR + 's+', 'g')

/**
 * Where each approved sentence is allowed to live — QA-84-034, and **how it is
 * allowed to get there** — QA-84-037.
 *
 * An approval is an exception to a rule, and Round 12 showed that an exception
 * written as *these words are fine* travels: the sentence about a restore was
 * moved verbatim onto an ordinary screen it had nothing to do with, and the
 * scan let it through, because the scan only ever knew the words. **An approval
 * is only honest where it was reasoned about.**
 *
 * Round 13 then showed that pinning the *literal* is not enough either. More
 * built an approved sentence out of two fragments that are each innocent —
 * neither is the approved text, so the literal pin saw nothing — and the joiner
 * dutifully assembled the approved words in a place where `this` names a
 * blocker and the promise is false. **Approval was checked against how a
 * sentence is written; removal happened to what a sentence becomes.**
 *
 * So the same extractor that reads the bundle now reads the source, and a file
 * *produces* an approved sentence when any string it can compose carries those
 * words — written whole or assembled. Both directions still fail:
 *
 * - a file that can produce the sentence and is not listed is a **transplant**;
 * - a listed file that can no longer produce it is a **stale approval**, and an
 *   exception nothing needs is a hole waiting for the sentence to come back.
 *
 * One extractor, two inputs, deliberately. A second implementation for source
 * would drift from the one that reads the bundle, and the whole claim is that
 * the two agree about what a composition is.
 */
function sourceFiles(dir) {
  const found = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const at = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...sourceFiles(at))
    else if (/[.]tsx?$/.test(entry.name)) found.push(at.split(SEPARATOR).join('/'))
  }
  return found
}

function flattened(text) {
  return String(text ?? '')
    .replace(WHITESPACE, ' ')
    .trim()
}

/**
 * What each source file can put together, read with the bundle's own rules.
 *
 * `acorn` does not parse TypeScript or JSX, so each file is stripped to plain
 * JavaScript by **esbuild** — the transform Vite already builds this product
 * with, now declared rather than borrowed transitively, for the reason acorn
 * was declared in D-201.
 */
function composableBySourceFile() {
  const byFile = new Map()
  for (const file of sourceFiles('src')) {
    const source = readFileSync(file, 'utf8')
    const { code } = esbuild.transformSync(source, {
      loader: file.endsWith('.tsx') ? 'tsx' : 'ts',
      format: 'esm',
      target: 'esnext',
    })
    byFile.set(file, [...stringsIn(code)].map(flattened))
  }
  return byFile
}

function approvalsAwayFromHome() {
  const wrong = []
  const composable = composableBySourceFile()

  for (const approved of APPROVED_FUTURE_COPY) {
    const pin = flattened(approved.pin ?? approved.text)
    const producing = [...composable.entries()]
      .filter(([, strings]) => strings.some((value) => value.includes(pin)))
      .map(([file]) => file)

    for (const file of producing) {
      if (!approved.in.includes(file)) wrong.push({ pin, file, why: 'is not approved to say it' })
    }
    for (const file of approved.in) {
      if (!producing.includes(file)) wrong.push({ pin, file, why: 'can no longer say it' })
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

  const wrong = approvalsAwayFromHome()
  if (wrong.length > 0) {
    console.error(
      `${wrong.length} approved sentence(s) are not where they were approved.\n` +
        'An approval covers a sentence in the file it was reasoned about, and nowhere else.\n',
    )
    for (const { pin, file, why } of wrong) {
      console.error(`  - ${file} ${why}: ${JSON.stringify(pin.slice(0, 120))}`)
    }
    process.exit(1)
  }

  const files = readdirSync(ASSETS).filter((name) => name.endsWith('.js'))
  const shipped = files.filter((name) => !name.startsWith(LABORATORY))
  if (shipped.length === 0) {
    console.error(`No owner-facing bundle found in ${ASSETS}. Run npm run build first.`)
    process.exit(1)
  }

  const strings = new Set()
  for (const name of shipped) {
    for (const value of stringsIn(readFileSync(join(ASSETS, name), 'utf8'))) strings.add(value)
  }

  /*
   * Every stylesheet, the laboratory's included — deliberately unlike the
   * script chunks above. Excluding a chunk of code is safe because nothing
   * outside it reads it; excluding a stylesheet is not, because CSS is global
   * and a rule shipped for the laboratory still applies to the product's
   * elements. The cost is that honest laboratory copy in a `content` string
   * would have to be approved. That is the direction to be wrong in.
   */
  const sheets = readdirSync(ASSETS).filter((name) => name.endsWith('.css'))
  if (sheets.length === 0) {
    console.error(`No stylesheet found in ${ASSETS}. The scan would not see rendered CSS text.`)
    process.exit(1)
  }
  for (const name of sheets) {
    for (const value of contentIn(readFileSync(join(ASSETS, name), 'utf8'))) strings.add(value)
  }

  if (strings.size < 1000) {
    console.error(`Only ${strings.size} strings were read — the scan is not seeing the bundle.`)
    process.exit(1)
  }

  const offenders = []
  for (const value of strings) {
    const left = withoutApprovedFutureCopy(withoutApprovedNonPromises(value))
    for (const claim of adaptationClaimsOnAnyScreen(left)) {
      offenders.push({ claim, value })
    }
  }

  if (offenders.length > 0) {
    console.error(
      `${offenders.length} shipped string(s) claim the app will change what it offers.\n` +
        'Approve one in APPROVED_FUTURE_COPY, with the reason, or change the copy.\n',
    )
    for (const { claim, value } of offenders.slice(0, 40)) {
      console.error(`  - “${claim}”\n    in: ${JSON.stringify(value.slice(0, 160))}`)
    }
    process.exit(1)
  }

  console.log(
    `Rendered copy scan clean — ${strings.size} shipped strings across ` +
      `${shipped.length} script chunk(s) and ${sheets.length} stylesheet(s).`,
  )
}

main()
