/** Independent mechanical reintroductions, only in an explicitly disposable clone. */
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = resolve(process.argv[2] ?? '')
assert.match(root, /[\\/]Temp[\\/]lco-phase82-round6-mutations-/)
const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' })
assert.equal(head.stdout.trim(), 'c583a91af126bd9a6e8c273d0fd978372b22c50c')
const paths = { compose: 'src/features/export/compose.ts', scope: 'src/features/export/scope.ts' }
const originals = Object.fromEntries(
  Object.entries(paths).map(([key, path]) => [key, readFileSync(join(root, path), 'utf8')]),
)
function replace(text, before, after) {
  const normalized = text.replaceAll('\r\n', '\n')
  assert.equal(normalized.split(before).length, 2, `unique mutation anchor: ${before}`)
  return normalized.replace(before, after)
}
const mutations = [
  [
    'caller objects again',
    'compose',
    (text) =>
      replace(
        text,
        'withheld === undefined ? request : composedFrom(request, withheld)',
        'request',
      ),
  ],
  [
    'caller decision',
    'compose',
    (text) =>
      replace(
        text,
        'decision: decide(view, moment, { architecture: decision.architecture })',
        'decision: request.decision',
      ),
  ],
  [
    'caller timeline',
    'compose',
    (text) => replace(text, 'timeline: assembleTimeline(scoped)', 'timeline: request.timeline'),
  ],
  [
    'caller insights',
    'compose',
    (text) => replace(text, 'insights: insightsFor(scoped)', 'insights: request.insights'),
  ],
  [
    'record class alone',
    'scope',
    (text) =>
      replace(
        text,
        "record.privacy === 'private' || record.domains.includes(DOMAIN.privateHealth)",
        "record.privacy === 'private'",
      ),
  ],
  [
    'record area alone',
    'scope',
    (text) =>
      replace(
        text,
        "record.privacy === 'private' || record.domains.includes(DOMAIN.privateHealth)",
        'record.domains.includes(DOMAIN.privateHealth)',
      ),
  ],
  [
    'entity class alone',
    'scope',
    (text) =>
      replace(
        text,
        "entity.privacy === 'private' || entity.domain === DOMAIN.privateHealth",
        "entity.privacy === 'private'",
      ),
  ],
  [
    'entity area alone',
    'scope',
    (text) =>
      replace(
        text,
        "entity.privacy === 'private' || entity.domain === DOMAIN.privateHealth",
        'entity.domain === DOMAIN.privateHealth',
      ),
  ],
  [
    'keep all entities',
    'scope',
    (text) =>
      replace(
        text,
        'snapshot.entities.filter((entity) => !isWithheldEntity(entity))',
        'snapshot.entities',
      ),
  ],
  [
    'keep all malformed',
    'scope',
    (text) =>
      replace(
        text,
        'snapshot.malformed.filter((row) => !claimsWithheld(row))',
        'snapshot.malformed',
      ),
  ],
  [
    'unreadable plural only',
    'scope',
    (text) =>
      replace(
        replace(text, "  if (row.raw['privacy'] === 'private') return true\n", ''),
        "  if (row.raw['domain'] === DOMAIN.privateHealth) return true\n",
        '',
      ),
  ],
  [
    'unreadable singular only',
    'scope',
    (text) =>
      replace(
        replace(text, "  if (row.raw['privacy'] === 'private') return true\n", ''),
        '  return Array.isArray(domains) && domains.includes(DOMAIN.privateHealth)',
        '  return false',
      ),
  ],
  [
    'withhold all malformed',
    'scope',
    (text) => replace(text, 'snapshot.malformed.filter((row) => !claimsWithheld(row))', '[]'),
  ],
  [
    'no divergence disclosure',
    'compose',
    (text) =>
      replace(
        text,
        'Everything below is worked out from the part of the record in this document. The app reads the whole record, so where the area left out matters, what it is saying on his own screen can differ from what is here.',
        'The selected sections are below.',
      ),
  ],
]
const suites = [
  'tests/synthetic/qa-82-round-5.test.ts',
  'tests/synthetic/qa-82-round-4.test.ts',
  'tests/synthetic/export-honesty.test.ts',
  'tests/synthetic/qa-82-round-1.test.ts',
  'tests/unit/architecture-guards.test.ts',
  'tests/synthetic/timeline.test.ts',
  'tests/synthetic/insights.test.ts',
]
function run() {
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', ...suites], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
    maxBuffer: 8_000_000,
  })
  return {
    status: result.status,
    output: `${result.stdout ?? ''}\n${result.stderr ?? ''}`.replace(/\u001b\[[0-9;]*m/g, ''),
  }
}
const baseline = run()
console.log('BASELINE', baseline.status, baseline.output.match(/Tests\s+[^\n]+/)?.[0])
assert.equal(baseline.status, 0, baseline.output)
assert.match(baseline.output, /410 passed/)
let missed = 0
for (const [name, key, mutate] of mutations) {
  const path = join(root, paths[key])
  try {
    writeFileSync(path, mutate(originals[key]))
    const result = run()
    const summary = result.output.match(/Tests\s+[^\n]+/)?.[0]
    const assertionFailed =
      result.status === 1 &&
      /Tests\s+\d+ failed/.test(result.output) &&
      !/Failed Suites|Unhandled Error/.test(result.output)
    console.log(`${assertionFailed ? 'KILLED' : 'UNPROVEN'}: ${name}: ${summary ?? result.output}`)
    if (['record class alone', 'entity class alone', 'entity area alone'].includes(name)) {
      const documentFailure = result.output
        .split('\n')
        .find((line) => /FAIL .*qa-82-round-5.*is not changed by/.test(line))
      console.log(`DOCUMENT-LEVEL: ${documentFailure ?? 'NOT PROVEN'}`)
      if (!documentFailure) missed += 1
    }
    if (!assertionFailed) missed += 1
  } finally {
    writeFileSync(path, originals[key])
  }
}
const status = spawnSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' })
assert.equal(status.stdout.trim(), '', status.stdout)
console.log(
  `RESTORED: clean disposable clone; ${mutations.length} reintroductions, ${missed} unproven checks`,
)
if (missed > 0) process.exitCode = 1
