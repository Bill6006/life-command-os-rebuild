/** Independent Round 10 replay of the builder's eight Round 9 mutations. */
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const EXPECTED_HEAD = '9bda98957a4d7f740c52a40b36a29fde6de636e9'
const root = resolve(process.argv[2] ?? '')
assert.match(basename(root), /^lco-phase82-round10-mutations-/)

function run(command, args) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024,
  })
}

const git = process.platform === 'win32' ? 'git.exe' : 'git'
assert.equal(run(git, ['rev-parse', 'HEAD']).stdout.trim(), EXPECTED_HEAD)
assert.equal(run(git, ['status', '--porcelain']).stdout.trim(), '')

const files = {
  compose: resolve(root, 'src/features/export/compose.ts'),
  coverage: resolve(root, 'src/intelligence/coverage.ts'),
  standing: resolve(root, 'src/features/life/standing.ts'),
}
const originals = new Map(Object.values(files).map((file) => [file, readFileSync(file, 'utf8')]))
const suites = [
  'tests/synthetic/qa-82-round-9.test.ts',
  'tests/synthetic/qa-82-round-8.test.ts',
  'tests/synthetic/qa-82-round-7.test.ts',
  'tests/synthetic/export-honesty.test.ts',
  'tests/synthetic/g007-coverage-freshness.test.ts',
  'tests/unit/life-pages.test.ts',
  'tests/unit/architecture-guards.test.ts',
]

function focused() {
  return run(process.execPath, [
    resolve(root, 'node_modules/vitest/vitest.mjs'),
    'run',
    ...suites,
    '--reporter=dot',
  ])
}

function mutate(file, find, replacement) {
  const source = originals.get(file)
  assert.ok(source)
  const first = source.indexOf(find)
  assert.notEqual(first, -1, `mutation target missing: ${find.slice(0, 90)}`)
  assert.equal(source.indexOf(find, first + 1), -1, 'mutation target was not unique')
  writeFileSync(file, source.replace(find, replacement))
}

const baseline = focused()
assert.equal(baseline.status, 0, `${baseline.stdout}\n${baseline.stderr}`)
const baselineSummary = `${baseline.stdout}\n${baseline.stderr}`.match(
  /Tests\s+\d+ passed \(\d+\)/,
)?.[0]
console.log(`PASS baseline: ${baselineSummary ?? 'focused suites green'}`)

const heardBlock = `    const heard =
      domain.daysSinceHeard !== undefined
        ? \`last heard \${countOf(domain.daysSinceHeard, 'day', 'days')} ago\`
        : domain.later > 0
          ? 'nothing heard yet'
          : 'nothing heard at all'`

const mutations = [
  {
    name: 'the complete bullet prefix returns to the old absolute',
    file: files.compose,
    find: heardBlock,
    replacement: `    const heard =
      domain.daysSinceHeard === undefined
        ? 'nothing heard at all'
        : \`last heard \${countOf(domain.daysSinceHeard, 'day', 'days')} ago\``,
  },
  {
    name: 'a truly untouched area loses its absolute',
    file: files.compose,
    find: heardBlock,
    replacement: heardBlock.replace(": 'nothing heard at all'", ": 'nothing heard yet'"),
  },
  {
    name: 'the later count disappears from the coverage sentence',
    file: files.coverage,
    find: "? `Nothing has come in about ${label.toLowerCase()} at this point. ${countOf(later, 'entry', 'entries')} here ${later === 1 ? 'is' : 'are'} later than it.`",
    replacement: '? `Nothing has come in about ${label.toLowerCase()} at this point.`',
  },
  {
    name: 'later-only areas are again told they were never mentioned',
    file: files.standing,
    find: `    const untouched: Standing = {
      word: ahead.word,
      attention: false,
      note: ahead.note,
    }`,
    replacement: `    const untouched: Standing = {
      word: ahead.word,
      attention: false,
      note: 'Nothing here at the moment on screen, and nothing is asking you for it.',
    }
    ahead.note = 'You have not mentioned these, and nothing is asking you to.'`,
  },
  {
    name: 'the old absolute note returns for the whole Life group',
    file: files.standing,
    find: "note: 'Nothing here at the moment on screen, and nothing is asking you for it.',",
    replacement: "note: 'You have not mentioned these, and nothing is asking you to.',",
  },
  {
    name: 'later-only areas lose their explanatory line',
    file: files.standing,
    find: '    return coverage.later > 0 ? ahead : untouched',
    replacement: '    return untouched',
  },
  {
    name: 'every unheard area grows an explanatory line',
    file: files.standing,
    find: '    return coverage.later > 0 ? ahead : untouched',
    replacement: '    return ahead',
  },
  {
    name: 'one Life group gets two notes and depends on registry order',
    file: files.standing,
    find: '      note: ahead.note,',
    replacement: "      note: 'No record is available for these areas.',",
  },
]

let detected = 0
try {
  for (const mutation of mutations) {
    mutate(mutation.file, mutation.find, mutation.replacement)
    const result = focused()
    const output = `${result.stdout}\n${result.stderr}`
    const invalid = /Failed to load|Unhandled Error|Transform failed|SyntaxError|TypeError:/i.test(
      output,
    )
    if (result.status !== 0 && !invalid) {
      detected += 1
      const summary = output.match(/Tests\s+\d+ failed \| \d+ passed \(\d+\)/)?.[0]
      console.log(`PASS mutation detected: ${mutation.name} — ${summary ?? 'assertion failure'}`)
    } else {
      console.log(
        `FAIL mutation not proved: ${mutation.name} — exit ${String(result.status)}, invalid ${String(invalid)}`,
      )
    }
    writeFileSync(mutation.file, originals.get(mutation.file))
  }
} finally {
  for (const [file, source] of originals) writeFileSync(file, source)
}

assert.equal(detected, mutations.length)
assert.equal(run(git, ['status', '--porcelain']).stdout.trim(), '')
console.log(
  `PASS: ${detected}/${mutations.length} Round 9 repair mutations detected; clone restored`,
)
