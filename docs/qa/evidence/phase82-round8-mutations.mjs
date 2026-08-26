/** Independent Round 8 mutation proof. Runs only in a pinned disposable clone. */
import assert from 'node:assert/strict'
import { basename, resolve } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const EXPECTED_HEAD = 'd3df449dcb651250f9362573d7f0ded832258606'
const root = resolve(process.argv[2] ?? '')
assert.match(basename(root), /^lco-phase82-round8-mutations-/)

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
  timeline: resolve(root, 'src/features/timeline/timelineEntries.ts'),
}
const originals = new Map(Object.values(files).map((file) => [file, readFileSync(file, 'utf8')]))
const suites = [
  'tests/synthetic/qa-82-round-7.test.ts',
  'tests/synthetic/qa-82-round-6.test.ts',
  'tests/synthetic/qa-82-round-5.test.ts',
  'tests/synthetic/qa-82-round-4.test.ts',
  'tests/synthetic/export-honesty.test.ts',
  'tests/synthetic/qa-82-round-1.test.ts',
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
  assert.notEqual(first, -1, `mutation target missing: ${find.slice(0, 80)}`)
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
    name: 'return before reporting damage',
    file: files.compose,
    find: '  const days = timeline.days\n\n  if (days.length > 0) {',
    replacement:
      '  const days = timeline.days\n\n  if (days.length === 0) return [NOTHING_HERE]\n\n  if (days.length > 0) {',
  },
  {
    name: 'report damaged rows only below readable rows',
    file: files.compose,
    find: '  if (timeline.unreadable.length > 0) {',
    replacement: '  if (days.length > 0 && timeline.unreadable.length > 0) {',
  },
  {
    name: 'call later history an undifferentiated empty display',
    file: files.compose,
    find: '  } else if (timeline.later > 0) {',
    replacement: '  } else if (false && timeline.later > 0) {',
  },
  {
    name: 'leave the damaged empty state unstated',
    file: files.compose,
    find: "    lines.push('There are no entries to show here.', '')",
    replacement: "    lines.push('')",
  },
  {
    name: 'disclose withholding in the neutral empty sentence',
    file: files.compose,
    find: "    lines.push('There are no entries to show here.', '')",
    replacement:
      "    lines.push('There are no entries to show here, and some were left out of this document.', '')",
  },
  {
    name: 'count damaged rows as future entries',
    file: files.timeline,
    find: '  const later = situation.view.history.effective.filter(\n    (record) => record.occurredAt > situation.at && describeRecord(record, context) !== undefined,\n  ).length',
    replacement:
      '  const later =\n    situation.view.history.effective.filter(\n      (record) => record.occurredAt > situation.at && describeRecord(record, context) !== undefined,\n    ).length + situation.view.snapshot.malformed.length',
  },
  {
    name: 'never count future entries',
    file: files.timeline,
    find: '  const later = situation.view.history.effective.filter(',
    replacement: '  const later = 0 * situation.view.history.effective.filter(',
  },
  {
    name: 'give a truly empty store the nonempty neutral state',
    file: files.compose,
    find: '  } else if (timeline.unreadable.length > 0 || timeline.tangled.length > 0) {',
    replacement: '  } else {',
  },
]

let detected = 0
try {
  for (const mutation of mutations) {
    mutate(mutation.file, mutation.find, mutation.replacement)
    const result = focused()
    const output = `${result.stdout}\n${result.stderr}`
    const invalid = /Failed to load|Unhandled Error|Transform failed|SyntaxError/i.test(output)
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
  `PASS: ${detected}/${mutations.length} Round 8 repair mutations detected; clone restored`,
)
