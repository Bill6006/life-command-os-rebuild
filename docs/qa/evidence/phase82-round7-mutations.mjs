/** Mechanical reintroductions in a disposable exact-HEAD clone, never the working repository. */
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(process.argv[2] ?? '')
assert.match(root, /[\\/]Temp[\\/]lco-phase82-round7-mutations-/)
const sha = '4403a3f9d9106d1c09a439e9c4d7b23292b3ea1e'
assert.equal(
  spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim(),
  sha,
)
const here = dirname(fileURLToPath(import.meta.url))
function replace(text, before, after) {
  const normalized = text.replaceAll('\r\n', '\n')
  assert.equal(normalized.split(before).length, 2, `unique mechanical anchor: ${before}`)
  return normalized.replace(before, after)
}

// Preserve the earlier artifact exactly. Derive its 14 independent mutations,
// pin the new clone, add this round's tests and four additional export mutations.
let runner = readFileSync(join(here, 'phase82-round6-mutations.mjs'), 'utf8')
runner = replace(runner, 'lco-phase82-round6-mutations-', 'lco-phase82-round7-mutations-')
runner = replace(runner, 'c583a91af126bd9a6e8c273d0fd978372b22c50c', sha)
runner = replace(
  runner,
  'const suites = [',
  "const suites = [\n  'tests/synthetic/qa-82-round-6.test.ts',",
)
runner = replace(runner, '/410 passed/', '/422 passed/')
const extra = [
  [
    'original coordinate in export',
    "`${row.kind === 'entity' ? 'An entity' : 'A record'} — ${row.problem}`",
    '`${row.where} — ${row.problem}`',
  ],
  [
    'survivors renumbered in export',
    "`${row.kind === 'entity' ? 'An entity' : 'A record'} — ${row.problem}`",
    "`${row.kind === 'entity' ? 'Entity' : 'Record'} row ${timeline.unreadable.indexOf(row) + 1} — ${row.problem}`",
  ],
  [
    'every damaged row called a record',
    "`${row.kind === 'entity' ? 'An entity' : 'A record'} — ${row.problem}`",
    '`A record — ${row.problem}`',
  ],
  [
    'coordinate explanation absent',
    'Rows that could not be read, kept rather than dropped. Where each one sits in the file is on the owner’s own screen rather than here: this document does not describe the whole file, so a position in it would be a number this reader cannot use and, where anything is left out, a count of what is missing.',
    'Rows that could not be read, kept rather than dropped:',
  ],
]
const additions = extra
  .map(
    ([name, before, after]) =>
      `[${JSON.stringify(name)}, 'compose', text => replace(text, ${JSON.stringify(before)}, ${JSON.stringify(after)})],`,
  )
  .join('\n')
runner = replace(runner, 'const mutations = [', `const mutations = [\n${additions}`)
const generated = `${root}.runner.mjs`
assert.equal(
  spawnSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).stdout.trim(),
  '',
)
try {
  writeFileSync(generated, runner)
  const result = spawnSync(process.execPath, [generated, root], {
    encoding: 'utf8',
    maxBuffer: 8_000_000,
  })
  console.log(result.stdout)
  console.error(result.stderr)
  assert.equal(result.status, 0, 'one of the 18 unit-level reintroductions was unproven')
} finally {
  // Exact generated sibling only, never a recursive cleanup.
  unlinkSync(generated)
}

function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 8_000_000,
    env: { ...process.env, LCOS_TARGET: 'preview', NO_COLOR: '1' },
  })
  return {
    status: result.status,
    output: `${result.stdout ?? ''}\n${result.stderr ?? ''}`.replace(/\u001b\[[0-9;]*m/g, ''),
  }
}
function build() {
  for (const args of [
    ['node_modules/typescript/bin/tsc', '-b'],
    ['node_modules/vite/bin/vite.js', 'build'],
  ]) {
    const result = run(args)
    assert.equal(result.status, 0, result.output)
  }
}
const browserArgs = [
  'node_modules/@playwright/test/cli.js',
  'test',
  'tests/browser/timeline-insights.spec.ts',
  '--project=mobile-small',
  '--grep=reports the rows it could not read',
  '--retries=0',
]
build()
const browserBaseline = run(browserArgs)
console.log('BROWSER BASELINE', browserBaseline.status, browserBaseline.output)
assert.equal(browserBaseline.status, 0)
assert.match(browserBaseline.output, /1 passed/)
const screenPath = join(root, 'src/features/timeline/TimelineScreen.tsx')
const originalScreen = readFileSync(screenPath, 'utf8')
try {
  writeFileSync(
    screenPath,
    replace(
      originalScreen,
      '<span className="tl-damaged__where">{row.where}</span>',
      '<span className="tl-damaged__where">An unreadable row</span>',
    ),
  )
  build()
  const result = run(browserArgs)
  console.log('OWNER COORDINATE MUTATION', result.status, result.output)
  assert.equal(result.status, 1)
  assert.match(result.output, /1 failed/)
  assert.match(result.output, /expect\(received\)\.toMatch\(expected\)/)
  assert.doesNotMatch(result.output, /ERR_ABORTED|Test timeout|Cannot find module/)
} finally {
  writeFileSync(screenPath, originalScreen)
  build()
}
assert.equal(
  spawnSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' }).stdout.trim(),
  '',
)
console.log(
  'RESTORED: 19 independent reintroductions killed; clean disposable clone and restored bundle.',
)
