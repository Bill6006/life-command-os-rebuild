#!/usr/bin/env node
/**
 * Whether what is **served** is what was **verified** — QA-84-064, D-211.
 *
 * The deployment proved itself by reading `commitSha` out of the served
 * `build-info.json`. Round 19 mutated the artifact after the gate and before
 * publication — a visible rule appended to the app stylesheet — and that check
 * still said the deployed SHA matched, because the field it reads is one the
 * mutation had no reason to touch.
 *
 * So this reads the bytes instead. Every file the verified build produced is
 * fetched from the live site and hashed, and every digest must be the one the
 * manifest recorded when the gates passed.
 *
 *   node scripts/release-integrity.mjs <base-url> [--manifest dist/release-manifest.json]
 *
 * ## What it establishes, and what it does not
 *
 * It establishes that the host is serving the bytes named in the manifest it is
 * given. Run with the manifest from the verified artifact — the one the gate
 * produced, before any publication step — it establishes that publication
 * changed nothing.
 *
 * **It does not defend against a step that rewrites the manifest as well.**
 * Nothing inside a job can, because that step could equally rewrite this
 * script. What closes that is *where the manifest comes from*: the deploy job
 * takes it from a separate artifact rather than from the tree it publishes, and
 * anybody — QA, the owner — can run this from outside CI against the artifact
 * the gate uploaded. A check that only ever runs beside the thing it checks is
 * the shape of the problem, not the fix.
 */
import { readFileSync } from 'node:fs'
import { digestOf, digestOfFiles, MANIFEST } from './release-manifest.mjs'

function parseArguments(argv) {
  let base = null
  let manifest = `dist/${MANIFEST}`
  for (let at = 0; at < argv.length; at += 1) {
    const value = argv[at]
    if (value === '--manifest') {
      at += 1
      manifest = argv[at] ?? manifest
    } else if (base === null) {
      base = value
    }
  }
  return { base, manifest }
}

async function fetchBytes(url) {
  const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${process.pid}`, {
    headers: { 'Cache-Control': 'no-cache' },
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  return Buffer.from(await response.arrayBuffer())
}

async function main() {
  const { base, manifest: at } = parseArguments(process.argv.slice(2))
  if (base === null) {
    console.error('Usage: release-integrity.mjs <base-url> [--manifest <path>]')
    process.exit(1)
  }
  const root = base.endsWith('/') ? base : `${base}/`

  const verified = JSON.parse(readFileSync(at, 'utf8'))
  const names = Object.keys(verified.files ?? {})
  if (names.length === 0) {
    console.error(`${at} names no files, so it establishes nothing.`)
    process.exit(1)
  }

  /*
   * The manifest must agree with itself first. A single rewritten entry with
   * the digest left alone is the cheapest forgery there is, and it costs one
   * line to refuse it.
   */
  if (digestOfFiles(verified.files) !== verified.digest) {
    console.error(`${at} does not agree with its own digest.`)
    process.exit(1)
  }

  const wrong = []

  /*
   * And the site must be serving that manifest, not another one. If publication
   * rewrote the tree *and* its manifest, this is what says so — provided the
   * manifest given here came from the verified artifact rather than from the
   * tree being checked.
   */
  try {
    const served = await fetchBytes(`${root}${MANIFEST}`)
    if (digestOf(served) !== digestOf(readFileSync(at))) {
      wrong.push(`${MANIFEST} — the site serves a different manifest from the verified one`)
    }
  } catch (error) {
    wrong.push(`${MANIFEST} — could not be fetched (${error?.message ?? error})`)
  }

  for (const name of names) {
    try {
      const bytes = await fetchBytes(`${root}${name}`)
      const digest = digestOf(bytes)
      if (digest !== verified.files[name]) {
        wrong.push(
          `${name} — served ${digest.slice(0, 12)}, verified ${verified.files[name].slice(0, 12)}`,
        )
      }
    } catch (error) {
      wrong.push(`${name} — could not be fetched (${error?.message ?? error})`)
    }
  }

  if (wrong.length > 0) {
    console.error(`${wrong.length} file(s) served are not the files that were verified.`)
    console.error('A commit identifier names what was built; these are what is being served.\n')
    for (const complaint of wrong.slice(0, 40)) console.error(`  - ${complaint}`)
    process.exit(1)
  }

  console.log(
    `Release integrity clean — ${names.length} files served byte for byte as verified ` +
      `(${String(verified.commitSha).slice(0, 7)}).`,
  )
}

await main()
