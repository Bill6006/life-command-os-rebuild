/**
 * A digest of every byte the verified build produced — QA-84-064, D-211.
 *
 * ## Why a commit identifier was not enough
 *
 * The deploy job downloaded the artifact the gate had verified, published it,
 * and then proved the deployment by reading `commitSha` out of the served
 * `build-info.json`. Round 19 put a step between the download and the publish
 * that appended a visible rule to the app stylesheet. No source byte and no
 * verified `dist/` byte had changed when the gates ran, `build-info.json` was
 * untouched, and the verifier said **"Deployed SHA matches"** over a site that
 * was now saying something the engine cannot do.
 *
 * **A commit identifier names what was built. It says nothing about what is
 * served.** Anything after the gate can decorate around it, because the field
 * it checks is one the decoration has no reason to touch.
 *
 * ## What this writes
 *
 * A SHA-256 for every file in the built tree, and a digest over that list. It
 * is written **inside** the artifact, so it travels with the bytes it
 * describes and is published with them; `release-integrity.mjs` then compares
 * what a host actually serves against it, file by file.
 *
 * Nothing here is a timestamp or a clock. Two runs over identical bytes must
 * produce identical manifests, or the comparison it exists for would be
 * comparing runs rather than releases.
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BUILT = 'dist'

/** The manifest describes the release; it is not part of the app it describes. */
export const MANIFEST = 'release-manifest.json'

const SEPARATOR = String.fromCharCode(92)

function filesIn(dir, prefix = '') {
  const found = []
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : 1,
  )) {
    const at = join(dir, entry.name)
    const name = `${prefix}${entry.name}`
    if (entry.isDirectory()) found.push(...filesIn(at, `${name}/`))
    else if (name !== MANIFEST) found.push(name.split(SEPARATOR).join('/'))
  }
  return found
}

export function digestOf(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

/** The digest of the list itself, so a rewritten entry cannot pass alone. */
export function digestOfFiles(files) {
  const lines = Object.keys(files)
    .sort()
    .map((name) => `${name} ${files[name]}`)
    .join('\n')
  return digestOf(lines)
}

function main() {
  const files = {}
  for (const name of filesIn(BUILT)) {
    files[name] = digestOf(readFileSync(join(BUILT, name)))
  }

  const count = Object.keys(files).length
  if (count === 0) {
    console.error(`No files in ${BUILT}. Run npm run build first.`)
    process.exit(1)
  }

  let commitSha = 'unknown'
  try {
    commitSha = String(JSON.parse(readFileSync(join(BUILT, 'build-info.json'), 'utf8')).commitSha)
  } catch {
    console.error(`No readable ${BUILT}/build-info.json, so the manifest could not name a release.`)
    process.exit(1)
  }

  const manifest = { commitSha, files, digest: digestOfFiles(files) }
  writeFileSync(join(BUILT, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`Release manifest written — ${count} files, digest ${manifest.digest.slice(0, 12)}.`)
}

if (process.argv[1]?.endsWith('release-manifest.mjs')) main()
