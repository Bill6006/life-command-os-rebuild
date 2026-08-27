/** Independent Round 11 replay of the builder's nine Round 10 mutations. */
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const EXPECTED_HEAD = '95363ff6569c146ed4952ad433a7a2a58ab38602'
const root = resolve(process.argv[2] ?? '')
assert.match(basename(root), /^lco-phase82-round11-mutations-/)

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
  candidates: resolve(root, 'src/intelligence/candidates.ts'),
  coverage: resolve(root, 'src/intelligence/coverage.ts'),
  refreshing: resolve(root, 'src/intelligence/refreshing.ts'),
  standing: resolve(root, 'src/features/life/standing.ts'),
}
const originals = new Map(Object.values(files).map((file) => [file, readFileSync(file, 'utf8')]))
const suites = [
  'tests/synthetic/qa-82-round-10.test.ts',
  'tests/synthetic/qa-82-round-9.test.ts',
  'tests/synthetic/qa-82-round-8.test.ts',
  'tests/synthetic/g007-coverage-freshness.test.ts',
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

const homeMove = `  {
    domain: DOMAIN.home,
    kind: 'place',
    verb: 'reset-space',
    leansOn: [CONCEPT.homeFriction],
    because: 'nothing has come in about the house for a while, and this would',
  },
`
const careerMove = `  {
    domain: DOMAIN.career,
    kind: 'learning-topic',
    verb: 'recall-practice',
    leansOn: [CONCEPT.learningTopic],
    because: 'nothing has come in about the studying for a while, and this would',
  },
`
const tableTail = `  {
    domain: DOMAIN.money,
    kind: 'financial-goal',
    verb: 'handle-money-item',
    leansOn: [CONCEPT.cashBuffer],
    because: 'nothing has come in about the money for a while, and this would',
  },
]`

const mutations = [
  {
    name: 'the route goes back to any named subject in the domain',
    file: files.coverage,
    find: `  const out = new Set<LifeDomainId>()
  for (const domain of domains.all()) {
    if (domains.defaultPrivacyFor(domain.id) === 'private') continue
    const move = refreshingMoveFor(domain.id)
    if (move === undefined) continue
    if (named.get(domain.id)?.has(move.kind) !== true) continue
    out.add(domain.id)
  }
  return out`,
    replacement: `  const out = new Set<LifeDomainId>()
  for (const entity of entities.all()) out.add(entity.domain)
  return out`,
  },
  {
    name: 'the route checks the domain but not the required subject kind',
    file: files.coverage,
    find: `    if (named.get(domain.id)?.has(move.kind) !== true) continue`,
    replacement: `    if ((named.get(domain.id)?.size ?? 0) === 0) continue`,
  },
  {
    name: 'the route stops excluding domains the app may never raise',
    file: files.coverage,
    find: `    if (domains.defaultPrivacyFor(domain.id) === 'private') continue`,
    replacement: `    if (false && domains.defaultPrivacyFor(domain.id) === 'private') continue`,
  },
  {
    name: 'the generator serves only the most-neglected area again',
    file: files.candidates,
    find: `  const promised = situation.coverage.neglected.filter((entry) => entry.refresh === 'an-action')`,
    replacement: `  const promised =
    situation.coverage.mostNeglected?.refresh === 'an-action'
      ? [situation.coverage.mostNeglected]
      : []`,
  },
  {
    name: 'a social move is invented to cover the gap',
    file: files.refreshing,
    find: tableTail,
    replacement: tableTail.replace(
      '\n]',
      `
  {
    domain: DOMAIN.social,
    kind: 'place',
    verb: 'start-conversation',
    leansOn: [CONCEPT.socialEnergy],
    because: 'nothing has come in about social life for a while, and this would',
  },
]`,
    ),
  },
  {
    name: 'a move is added for the domain the app may never raise',
    file: files.refreshing,
    find: tableTail,
    replacement: tableTail.replace(
      '\n]',
      `
  {
    domain: DOMAIN.privateHealth,
    kind: 'behavior',
    verb: 'move',
    leansOn: [CONCEPT.privatePattern],
    because: 'nothing has come in about private health for a while, and this would',
  },
]`,
    ),
  },
  {
    name: 'the supported Home direction is dropped',
    file: files.refreshing,
    find: homeMove,
    replacement: '',
  },
  {
    name: 'the supported Career direction is dropped',
    file: files.refreshing,
    find: careerMove,
    replacement: '',
  },
  {
    name: 'Life says the action sentence on needs-review',
    file: files.standing,
    find: `    case 'needs-review':
      return {
        word: 'Needs a check-in',
        attention: true,
        note: 'Nothing the app can do on its own will bring these back.',
        detail: (entry) => entry.summary,
      }
`,
    replacement: '',
  },
]

const baseline = focused()
assert.equal(baseline.status, 0, `${baseline.stdout}\n${baseline.stderr}`)
const baselineSummary = `${baseline.stdout}\n${baseline.stderr}`.match(
  /Tests\s+\d+ passed \(\d+\)/,
)?.[0]
console.log(`PASS baseline: ${baselineSummary ?? 'focused suites green'}`)

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
  `PASS: ${detected}/${mutations.length} Round 10 repair mutations detected; clone restored`,
)
