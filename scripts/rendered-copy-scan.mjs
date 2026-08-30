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

  /** The literal pieces of an expression, in source order, or null if it is not one. */
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
 * Where each approved sentence is allowed to live — QA-84-034.
 *
 * An approval is an exception to a rule, and Round 12 showed that an exception
 * written as *these words are fine* travels: the sentence about a restore was
 * moved verbatim onto an ordinary screen it had nothing to do with, and the
 * scan let it through, because the scan only ever knew the words. **An approval
 * is only honest where it was reasoned about.** So each entry names the source
 * files it may appear in, and this checks that claim in both directions:
 *
 * - the same words in a file that is not listed is a **transplant**, and fails;
 * - a listed file that no longer contains them is a **stale approval**, and
 *   fails too — an exception nothing needs is a hole waiting for the sentence
 *   to come back somewhere else.
 *
 * It reads source rather than the bundle deliberately. The built chunk has no
 * files in it, and *which module a string came from* is exactly what is being
 * checked.
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

function approvalsAwayFromHome() {
  const wrong = []
  const files = sourceFiles('src')
  const text = new Map(files.map((file) => [file, flattened(readFileSync(file, 'utf8'))]))

  for (const approved of APPROVED_FUTURE_COPY) {
    const pin = flattened(approved.pin ?? approved.text)
    const holding = files.filter((file) => text.get(file).includes(pin))
    for (const file of holding) {
      if (!approved.in.includes(file)) wrong.push({ pin, file, why: 'is not approved to say it' })
    }
    for (const file of approved.in) {
      if (!holding.includes(file)) wrong.push({ pin, file, why: 'no longer says it' })
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
