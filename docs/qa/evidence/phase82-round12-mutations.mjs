/** Independent Round 12 replay of all eighteen Round 11 repair mutations. */
import assert from 'node:assert/strict'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'

const EXPECTED_HEAD = 'db1b55674bf5efc85a5a3c3315ea3f498958e2d8'
const root = resolve(process.argv[2] ?? '')
assert.match(basename(root), /^lco-phase82-round12-/)

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
  coverage: resolve(root, 'src/intelligence/coverage.ts'),
  standing: resolve(root, 'src/features/life/standing.ts'),
}
const originals = new Map(Object.values(files).map((file) => [file, readFileSync(file, 'utf8')]))
const suites = [
  'tests/synthetic/qa-82-round-11.test.ts',
  'tests/synthetic/qa-82-round-10.test.ts',
  'tests/synthetic/qa-82-round-9.test.ts',
  'tests/synthetic/g007-coverage-freshness.test.ts',
  'tests/unit/adaptive-guide.test.ts',
  'tests/synthetic/export-honesty.test.ts',
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

const questionRoute = `  if (concepts.some((entry) => entry.askable && questionFor(entry.concept) !== undefined)) {
    return 'a-question'
  }`
const episodeLoop = `  for (const episode of collectEpisodes(view, moment.zone)) {
    const window = outcomeWindowFor(episode, moment.zone)
    // Nothing to wait for, or the moment for asking has already passed.
    if (window === undefined || moment.now > window.latest) continue
    out.add(episode.semantics.domain)
  }`

const mutations = [
  {
    name: 'question route goes back to standing concepts only',
    file: files.coverage,
    find: `refresh: routeFor(status, conceptRows, coming.has(domain.id), canAct.has(domain.id)),`,
    replacement: `refresh: routeFor(status, standing, coming.has(domain.id), canAct.has(domain.id)),`,
  },
  {
    name: 'question route requires a neglected standing fact',
    file: files.coverage,
    find: questionRoute,
    replacement: `  if (
    concepts.some(
      (entry) =>
        entry.neglected && entry.askable && questionFor(entry.concept) !== undefined,
    )
  ) {
    return 'a-question'
  }`,
  },
  {
    name: 'question route stops checking the catalogue',
    file: files.coverage,
    find: questionRoute,
    replacement: `  if (concepts.some((entry) => entry.askable)) {
    return 'a-question'
  }`,
  },
  {
    name: 'question route stops checking askability',
    file: files.coverage,
    find: questionRoute,
    replacement: `  if (concepts.some((entry) => questionFor(entry.concept) !== undefined)) {
    return 'a-question'
  }`,
  },
  {
    name: 'question row receives the action sentence',
    file: files.standing,
    find: `  return coverage.refresh === 'a-question'
    ? 'A question will cover it.'
    : 'Something worth doing here may come up on Now.'`,
    replacement: `  return 'Something worth doing here may come up on Now.'`,
  },
  {
    name: 'Life denies the question route',
    file: files.standing,
    find: `    case 'needs-review':
      return {`,
    replacement: `    case 'a-question':
    case 'needs-review':
      return {`,
  },
  {
    name: 'a started action counts as evidence arriving',
    file: files.coverage,
    find: episodeLoop,
    replacement: `  for (const episode of collectEpisodes(view, moment.zone)) {
    if (episode.state === 'started') {
      out.add(episode.semantics.domain)
      continue
    }
    const window = outcomeWindowFor(episode, moment.zone)
    if (window === undefined || moment.now > window.latest) continue
    out.add(episode.semantics.domain)
  }`,
  },
  {
    name: 'the result window never closes',
    file: files.coverage,
    find: `    if (window === undefined || moment.now > window.latest) continue`,
    replacement: `    if (window === undefined) continue`,
  },
  {
    name: 'the completed-episode route is dropped',
    file: files.coverage,
    find: episodeLoop,
    replacement: `  for (const episode of collectEpisodes(view, moment.zone)) {
    const window = outcomeWindowFor(episode, moment.zone)
    if (window === undefined || moment.now > window.latest) continue
  }`,
  },
]

const baseline = focused()
assert.equal(baseline.status, 0, `${baseline.stdout}\n${baseline.stderr}`)
const baselineSummary = `${baseline.stdout}\n${baseline.stderr}`.match(
  /Tests\s+\d+ passed \(\d+\)/,
)?.[0]
console.log(`PASS new-mutation baseline: ${baselineSummary ?? 'focused suites green'}`)

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
console.log(`PASS: ${detected}/${mutations.length} Round 11 mutations detected; clone restored`)

// Reuse the independently published Round 11 reconstruction for the earlier
// nine. Only its immutable head and disposable-clone guard move forward.
const priorPath = resolve(root, 'docs/qa/evidence/phase82-round11-mutations.mjs')
const priorSource = readFileSync(priorPath, 'utf8')
  .replace('95363ff6569c146ed4952ad433a7a2a58ab38602', EXPECTED_HEAD)
  .replace('lco-phase82-round11-mutations-', 'lco-phase82-round12-')
const runner = resolve(tmpdir(), `phase82-round12-prior-${process.pid}.mjs`)
writeFileSync(runner, priorSource)
try {
  const prior = run(process.execPath, [runner, root])
  assert.equal(prior.status, 0, `${prior.stdout}\n${prior.stderr}`)
  process.stdout.write(prior.stdout)
} finally {
  rmSync(runner, { force: true })
}
assert.equal(run(git, ['status', '--porcelain']).stdout.trim(), '')
console.log('PASS: all 18 reintroductions detected in the disposable exact-head clone')
