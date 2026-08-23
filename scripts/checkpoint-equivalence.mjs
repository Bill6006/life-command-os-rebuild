#!/usr/bin/env node
/**
 * Whether the deployed bundle can still be claimed to be a named checkpoint's
 * (canonical plan section 33, and DEF-0061).
 *
 * This repository's CI redeploys the Preview on **every** push to `main` —
 * including a documentation-only one — and `build-info.json` always reports
 * the SHA of whatever commit was actually pushed. A "pin the checkpoint"
 * commit that writes prose referencing an earlier product commit therefore
 * makes the deployed SHA disagree with that prose the moment it is pushed,
 * because pushing it is what moves the deployed SHA past it.
 *
 * DEF-0061 is what happens when a handoff asserts literal SHA equality against
 * that earlier commit as a blocking precondition: independent QA correctly
 * refuses to proceed, because the string genuinely does not match, and no
 * product testing happens at all. The mistake was never the mismatch — a
 * docs-only commit changing nothing the browser downloads is not a reason to
 * distrust a deploy — the mistake was asserting exact-string equality as the
 * check instead of asserting the thing that is actually true: that nothing
 * bundle-relevant changed.
 *
 * So this checks that instead. It is deliberately conservative about what
 * counts as bundle-relevant, and deliberately narrow about what it does not
 * try to solve: it says nothing about whether the product code at the older
 * SHA was itself correct, only whether the newer deployed SHA still serves
 * the same bytes.
 *
 *   node scripts/checkpoint-equivalence.mjs <product-sha> [--ref HEAD]
 *
 * Exits 0 and prints what changed (documentation, test and tooling paths
 * only) when the bundle is unchanged; exits 1 and names the offending paths
 * otherwise.
 */
import { execFileSync } from 'node:child_process'

const [productSha, ...rest] = process.argv.slice(2)
if (productSha === undefined) {
  console.error('usage: node scripts/checkpoint-equivalence.mjs <product-sha> [--ref <ref>]')
  process.exit(2)
}

const refFlagIndex = rest.indexOf('--ref')
const ref = refFlagIndex === -1 ? 'HEAD' : (rest[refFlagIndex + 1] ?? 'HEAD')

/**
 * What actually reaches `dist/`.
 *
 * Deliberately does not include `scripts/`, `.github/`, `tests/` or `docs/` —
 * changing a release script, a CI workflow, a test, or a decision log entry
 * cannot alter one byte of what Vite emits. It is conservative the other way:
 * anything not obviously irrelevant is treated as bundle-relevant, so a config
 * file this list has not been taught about fails safe rather than passing
 * silently.
 */
function isBundleRelevant(path) {
  if (path.startsWith('src/')) return true
  if (path.startsWith('public/')) return true
  return [
    'index.html',
    'vite.config.ts',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.node.json',
  ].includes(path)
}

function changedPaths(from, to) {
  const raw = execFileSync('git', ['diff', '--name-only', `${from}..${to}`], {
    encoding: 'utf8',
  })
  return raw.split('\n').filter((line) => line.length > 0)
}

const changed = changedPaths(productSha, ref)
const bundleRelevant = changed.filter(isBundleRelevant)

if (bundleRelevant.length > 0) {
  console.error(
    `Product code has changed between ${productSha} and ${ref} — the deployed bundle may differ:`,
  )
  for (const path of bundleRelevant) console.error(`  - ${path}`)
  console.error('\nDo not claim the deployed build is equivalent to the named checkpoint.')
  process.exit(1)
}

console.log(
  changed.length === 0
    ? `No files changed between ${productSha} and ${ref}.`
    : `${changed.length} file(s) changed between ${productSha} and ${ref}, none of them bundle-relevant:`,
)
for (const path of changed) console.log(`  - ${path}`)
console.log(
  `\nBundle-equivalent: the deployed build at ${ref} serves the same bytes as ${productSha}.`,
)
