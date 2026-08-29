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
 * **It does not see a sentence assembled at runtime** from pieces that are each
 * innocent — `'The app will ' + verb + ' next time'` is three strings here and
 * one sentence on the screen. That is exactly what the browser sweeps are for,
 * and it is why they stay. Static covers every state; dynamic covers
 * composition. Neither is a sample of the other, and this comment says which is
 * which so nobody has to guess later.
 *
 * The QA laboratory's chunk is excluded, for the reason `#/qa` is excluded from
 * the route crawl: `QA_AVAILABLE` is `!isProduction`, so it is not code the
 * product ships to the owner. The check below fails if that stops being true.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as acorn from 'acorn'
import {
  adaptationClaimsOnAnyScreen,
  withoutApprovedNonPromises,
  withoutApprovedFutureCopy,
} from './adaptation-claims.mjs'

const ASSETS = 'dist/assets'
const LABORATORY = 'QaScreen'

/** Every string literal and template piece in a module, from its syntax tree. */
function stringsIn(source) {
  const found = new Set()
  const seen = new Set()

  const walk = (node) => {
    if (node === null || typeof node !== 'object' || seen.has(node)) return
    seen.add(node)
    if (Array.isArray(node)) {
      for (const child of node) walk(child)
      return
    }
    if (node.type === 'Literal' && typeof node.value === 'string') found.add(node.value)
    if (node.type === 'TemplateLiteral') {
      for (const quasi of node.quasis) found.add(quasi.value.cooked ?? quasi.value.raw ?? '')
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

function main() {
  const routing = readFileSync(join('src', 'platform', 'routing.ts'), 'utf8')
  if (!routing.includes('QA_AVAILABLE = !isProduction')) {
    console.error(
      'The QA laboratory is no longer production-gated, so its chunk may not be excluded here.',
    )
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
    `Rendered copy scan clean — ${strings.size} shipped strings across ${shipped.length} chunk(s).`,
  )
}

main()
