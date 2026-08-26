/** Independent mechanical reintroductions in an explicitly disposable clone. */
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = resolve(process.argv[2] ?? '')
assert.match(root, /[\\/]Temp[\\/]lco-phase82-round5-mutations-/)
const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' })
assert.equal(head.stdout.trim(), 'd8ec6eb00e43a39290a7be78fa8633fc574d4f59')
const paths = {
  compose: 'src/features/export/compose.ts',
  insights: 'src/intelligence/insights.ts',
  knowledge: 'src/domain/knowledge.ts',
}
const originals = Object.fromEntries(
  Object.entries(paths).map(([key, path]) => [key, readFileSync(join(root, path), 'utf8')]),
)
function replace(text, before, after) {
  const normalized = text.replaceAll('\r\n', '\n')
  assert.equal(
    normalized.split(before).length,
    2,
    `mutation anchor must occur exactly once: ${before}`,
  )
  return normalized.replace(before, after)
}
const mutations = [
  [
    'whole-store diagnostic counts',
    'compose',
    (text) => {
      text = replace(
        text,
        'const stored = describableRecords(snapshot.records, header)',
        'const stored = snapshot.records',
      )
      text = replace(
        text,
        'const standing = describableRecords(situation.view.history.effective, header)',
        'const standing = situation.view.history.effective',
      )
      return replace(
        text,
        'const displaced = describableRecords(situation.view.history.displaced, header)',
        'const displaced = situation.view.history.displaced',
      )
    },
  ],
  [
    'no unknown concept filter',
    'compose',
    (text) => replace(text, '.filter((entry) => mayDescribeConcept(entry.definition, header))', ''),
  ],
  [
    'area-only concept predicate',
    'compose',
    (text) =>
      replace(
        text,
        "(definition.privacy !== 'private' && mayName(definition.domain, header))",
        'mayName(definition.domain, header)',
      ),
  ],
  [
    'one-id concept predicate',
    'compose',
    (text) =>
      replace(
        text,
        "(definition.privacy !== 'private' && mayName(definition.domain, header))",
        "definition.id !== 'private-health.recent-pattern'",
      ),
  ],
  [
    'unscoped entity count',
    'compose',
    (text) => replace(text, 'const entities = header.privateIncluded', 'const entities = true'),
  ],
  [
    'count private malformed rows',
    'compose',
    (text) => replace(text, 'const unreadable = header.privateIncluded', 'const unreadable = true'),
  ],
  [
    'page before privacy filter',
    'compose',
    (text) => {
      text = replace(
        text,
        "showsRecord: (record) => record.privacy !== 'private'",
        'showsRecord: () => true',
      )
      return replace(
        text,
        'const days = timeline.days',
        'const days = header.privateIncluded ? timeline.days : timeline.days.map(day => ({ ...day, entries: day.entries.filter(entry => entry.domain !== DOMAIN.privateHealth && !entry.withheld) })).filter(day => day.entries.length > 0)',
      )
    },
  ],
  [
    'unscoped supersession issues',
    'compose',
    (text) => replace(text, 'const issues = header.privateIncluded', 'const issues = true'),
  ],
  [
    'export hard-coded unknown sentence',
    'compose',
    (text) => replace(text, 'describeUnknown(knowledge)', "'never answered'"),
  ],
  [
    'Insights hard-coded unknown sentence',
    'insights',
    (text) => replace(text, 'describeUnknown(concept.unknown)', "'never answered'"),
  ],
  [
    'drop unknown notes',
    'knowledge',
    (text) =>
      replace(
        text,
        'return state.note === undefined ? reads : `${reads} (${state.note})`',
        'return reads',
      ),
  ],
  [
    'retracted is never answered',
    'knowledge',
    (text) =>
      replace(
        text,
        "retracted: 'answered once, and the answer was withdrawn'",
        "retracted: 'never answered'",
      ),
  ],
]
const suites = [
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
assert.match(baseline.output, /391 passed/)
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
    if (!assertionFailed) missed += 1
  } finally {
    writeFileSync(path, originals[key])
  }
}
const status = spawnSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' })
assert.equal(status.stdout.trim(), '', status.stdout)
console.log(
  `RESTORED: clean disposable clone; ${mutations.length - missed}/${mutations.length} reintroductions caused assertion failures`,
)
if (missed > 0) process.exitCode = 1
