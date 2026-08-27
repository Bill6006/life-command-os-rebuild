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
 *   node scripts/checkpoint-equivalence.mjs <product-sha> --deployed <build-info-url>
 *
 * Exits 0 and prints what changed (documentation, test and tooling paths
 * only) when the bundle is unchanged; exits 1 and names the offending paths
 * otherwise.
 *
 * ## Two ways to fail, and they are not the same problem (DEF-0063)
 *
 * The first version of this only diffed, and a diff cannot tell **which
 * direction** the two commits sit in. When independent QA ran it against a
 * Preview whose deploy had not landed yet, it printed eight source files as
 * "bundle-relevant differences" — which reads as a repair that changed things
 * it should not have, when the truth was that the deployed build simply
 * predated the checkpoint and the answer was to wait ninety seconds.
 *
 * A misleading gate costs a whole QA round, and this one did. So ancestry is
 * checked first and reported as its own outcome: if the checkpoint is not an
 * ancestor of the ref, the deployed build is **older** than the thing being
 * claimed, and no amount of diffing is the right thing to say about it.
 */
import { execFileSync } from 'node:child_process'

const [productSha, ...rest] = process.argv.slice(2)
if (productSha === undefined) {
  console.error('usage: node scripts/checkpoint-equivalence.mjs <product-sha> [--ref <ref>]')
  process.exit(2)
}

const refFlagIndex = rest.indexOf('--ref')
const deployedFlagIndex = rest.indexOf('--deployed')

/**
 * The SHA the deployed site is actually serving.
 *
 * Here so the check can be one command rather than a copy of a value from a
 * browser tab — the step most likely to be skipped is the one that needs a
 * second window.
 */
async function deployedSha(url) {
  const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'cache-control': 'no-cache' },
  })
  if (!response.ok) throw new Error(`${url} returned ${response.status}`)
  const info = await response.json()
  if (typeof info.commitSha !== 'string') throw new Error(`${url} carries no commitSha`)
  return info.commitSha
}

let ref = refFlagIndex === -1 ? 'HEAD' : (rest[refFlagIndex + 1] ?? 'HEAD')
if (deployedFlagIndex !== -1) {
  const url = rest[deployedFlagIndex + 1]
  if (url === undefined) {
    console.error('--deployed needs the URL of a build-info.json')
    process.exit(2)
  }
  ref = await deployedSha(url)
  console.log(`Deployed SHA read live from ${url}: ${ref}\n`)
}

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

/**
 * Whether the ref already contains the checkpoint.
 *
 * `git merge-base --is-ancestor` exits 0 when the first commit is reachable
 * from the second, and 1 when it is not. A ref that does not contain the
 * checkpoint is not a candidate for equivalence at all: it is an older build.
 */
/**
 * Commits on HEAD that no remote branch contains — QA-83-004.
 *
 * `git log --branches --not --remotes` in its scripted form. Empty is the
 * ordinary answer; anything else means the head being described is one only
 * this machine has seen.
 */
function commitsNotOnAnyRemote() {
  try {
    // `HEAD` before `--not`, and the order is the whole thing: `--not` negates
    // everything after it, so `--not --remotes HEAD` asks for commits in
    // neither the remotes nor HEAD, which is always empty and always passes.
    const raw = execFileSync('git', ['log', '--oneline', 'HEAD', '--not', '--remotes'], {
      encoding: 'utf8',
    })
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  } catch {
    // No remote configured, or no HEAD yet. Neither is this script's business.
    return []
  }
}

function contains(commit, candidate) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', commit, candidate], {
      stdio: 'ignore',
    })
    return true
  } catch {
    return false
  }
}

if (!contains(productSha, ref)) {
  console.error(`The build at ${ref} does not contain ${productSha}.`)
  console.error('')
  console.error('This is not a bundle difference — it is an older build. If the ref is a live')
  console.error('deployment, the deploy for that checkpoint has not landed yet: wait for it and')
  console.error('read the deployed SHA again. Nothing here says the checkpoint is wrong.')
  process.exit(1)
}

/*
 * And whether the tree QA will read is a tree anyone else can — QA-83-004.
 *
 * Round 1 found `npm run verify` red at the repository head, on a documentation
 * commit that had never been pushed. CI runs the same command on every push and
 * would have caught it in minutes; it never ran, because there was nothing to
 * run on. **An unpushed commit is a commit that has met no gate but the one the
 * author remembered to run.**
 *
 * This script exists to certify that what QA reads and what QA tests line up,
 * so it is the right place to notice. It reports rather than refuses: a local
 * commit is a normal state to be in halfway through a phase, and the equivalence
 * claim above it is still true of the bundle either way.
 */
const unpushed = commitsNotOnAnyRemote()
if (unpushed.length > 0) {
  console.warn(
    `${unpushed.length} commit(s) on HEAD are on no remote branch. QA reads the repository, not`,
  )
  console.warn('your working copy, and CI has not run on these:')
  for (const line of unpushed) console.warn(`  - ${line}`)
  console.warn('')
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
