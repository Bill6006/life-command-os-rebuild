/** Independent Round 9 mutation proof. Runs only in a pinned disposable clone. */
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const EXPECTED_HEAD = 'c81de7e4ada09cd2740e348cf62db3bb433d5f42'
const root = resolve(process.argv[2] ?? '')
assert.match(basename(root), /^lco-phase82-round9-mutations-/)

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
  screen: resolve(root, 'src/features/timeline/TimelineScreen.tsx'),
  coverage: resolve(root, 'src/intelligence/coverage.ts'),
}
const originals = new Map(Object.values(files).map((file) => [file, readFileSync(file, 'utf8')]))
const suites = [
  'tests/synthetic/qa-82-round-8.test.ts',
  'tests/synthetic/qa-82-round-7.test.ts',
  'tests/synthetic/qa-82-round-6.test.ts',
  'tests/synthetic/qa-82-round-5.test.ts',
  'tests/synthetic/qa-82-round-4.test.ts',
  'tests/synthetic/export-honesty.test.ts',
  'tests/synthetic/g007-coverage-freshness.test.ts',
  'tests/unit/architecture-guards.test.ts',
  'tests/synthetic/timeline.test.ts',
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

const mutations = [
  {
    name: 'tangled rows are never reported',
    file: files.compose,
    find: '  if (timeline.tangled.length > 0) {',
    replacement: '  if (false && timeline.tangled.length > 0) {',
  },
  {
    name: 'tangled rows are reported only below readable entries',
    file: files.compose,
    find: '  if (timeline.tangled.length > 0) {',
    replacement: '  if (days.length > 0 && timeline.tangled.length > 0) {',
  },
  {
    name: 'the tangled list is collapsed to one row',
    file: files.compose,
    find: '    for (const row of timeline.tangled) {',
    replacement: '    for (const row of timeline.tangled.slice(0, 1)) {',
  },
  {
    name: 'the tangle heading no longer names the problem',
    file: files.compose,
    find: 'Rows that were read without trouble but have a problem the app could not resolve: they disagree about what replaces what, so none of them is used.',
    replacement: 'Rows that were read without trouble:',
  },
  {
    name: 'the later panel denies the damaged rows below it',
    file: files.screen,
    find: 'all of it is later than the moment on screen. None of it has been lost; move forward\n              and it is there.',
    replacement:
      'all of it is later than the moment on screen. Nothing has been lost and nothing is\n              unreadable; move forward and it is there.',
  },
  {
    name: 'Coverage says ever about a reading that is merely later',
    file: files.coverage,
    find: "return later > 0\n        ? `Nothing has come in about ${label.toLowerCase()} at this point. ${countOf(later, 'entry', 'entries')} here ${later === 1 ? 'is' : 'are'} later than it.`\n        : `Nothing has ever come in about ${label.toLowerCase()}.`",
    replacement: 'return `Nothing has ever come in about ${label.toLowerCase()}.`',
  },
  {
    name: 'Coverage never counts later records in an area',
    file: files.coverage,
    find: '  return { meaningful: out, heardAt: heard, laterAt: later, heardSources }',
    replacement:
      '  return { meaningful: out, heardAt: heard, laterAt: new Map<LifeDomainId, number>(), heardSources }',
  },
  {
    name: 'a later reading becomes current evidence',
    file: files.coverage,
    find: '      for (const domain of record.domains) later.set(domain, (later.get(domain) ?? 0) + 1)\n      continue',
    replacement:
      '      for (const domain of record.domains) later.set(domain, (later.get(domain) ?? 0) + 1)',
  },
  {
    name: 'a never-heard area loses its truthful absolute',
    file: files.coverage,
    find: ': `Nothing has ever come in about ${label.toLowerCase()}.`',
    replacement:
      ': `Nothing has come in about ${label.toLowerCase()} at this point. Nothing here is later than it.`',
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
