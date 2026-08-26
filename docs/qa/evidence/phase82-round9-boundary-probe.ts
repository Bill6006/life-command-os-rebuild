/** Independent Round 9 evidence. Synthetic input only; never writes a store. */
import assert from 'node:assert/strict'
import { instant } from '../../../src/domain/time'
import { composeExport } from '../../../src/features/export/compose'
import { DEFAULT_SELECTION } from '../../../src/features/export/sections'
import { standingFor } from '../../../src/features/life/standing'
import { assembleTimeline } from '../../../src/features/timeline/timelineEntries'
import { decide } from '../../../src/intelligence/engine'
import { insightsFor } from '../../../src/intelligence/insights'
import { assembleSituation } from '../../../src/intelligence/situation'
import { snapshotFromWire } from '../../../src/memory/snapshot'
import { buildView } from '../../../src/memory/view'
import { scenarioById } from '../../../src/synthetic/scenarios'

const fixture = scenarioById('malformed-history')
assert.ok(fixture)
const loaded = snapshotFromWire(fixture.build())
assert.ok(loaded.loaded)

const DAY = 86_400_000
const earlier = instant(fixture.now - 7 * DAY)
const later = instant(fixture.now + 7 * DAY)
const failures: string[] = []
let passed = 0

function check(name: string, operation: () => void) {
  try {
    operation()
    passed += 1
    console.log(`PASS: ${name}`)
  } catch (error) {
    failures.push(name)
    console.log(
      `FAIL: ${name}: ${(error instanceof Error ? error.message : String(error)).split('\n')[0]}`,
    )
  }
}

function at(now: typeof earlier) {
  const before = JSON.stringify(loaded.snapshot)
  const moment = { now, zone: fixture.zone, weekStartsOn: 1 as const }
  const view = buildView(loaded.snapshot, moment)
  const situation = assembleSituation(view, moment)
  const timeline = assembleTimeline(situation)
  const insights = insightsFor(situation)
  const text = composeExport({
    sections: DEFAULT_SELECTION,
    situation,
    decision: decide(view, moment),
    insights,
    timeline,
    source: 'laboratory',
    app: {
      commitShort: 'c81de7e',
      commitSha: 'c81de7e4ada09cd2740e348cf62db3bb433d5f42',
      target: 'preview',
      buildTime: '2026-08-26T19:54:49.164Z',
      phaseNumber: 8,
      phaseTitle: 'Legacy migration',
      phaseSummary: 'Independent synthetic Round 9 evidence',
    },
    composedAt: { at: instant(Date.parse('2026-08-26T20:30:00Z')), zone: fixture.zone },
  }).text
  assert.equal(JSON.stringify(loaded.snapshot), before, 'composition mutated its source snapshot')
  return { situation, timeline, text }
}

function section(text: string, heading: string): string {
  const start = text.indexOf(`## ${heading}`)
  assert.notEqual(start, -1, `missing ${heading}`)
  const rest = text.slice(start)
  const end = rest.indexOf('\n## ', 1)
  return end === -1 ? rest : rest.slice(0, end)
}

const before = at(earlier)
const after = at(later)
const withLater = before.situation.coverage.domains.filter((entry) => entry.later > 0)
const neverHeard = before.situation.coverage.domains.filter(
  (entry) => entry.status === 'unheard' && entry.later === 0,
)

check('the repaired Timeline keeps later readable entries and damaged rows separate', () => {
  assert.equal(before.timeline.total, 0)
  assert.equal(before.timeline.later, 5)
  assert.equal(before.timeline.unreadable.length, 6)
})

check('Coverage summaries distinguish not-yet from never', () => {
  assert.deepEqual(withLater.map((entry) => entry.domain).sort(), ['home', 'sleep'])
  for (const entry of withLater) {
    assert.match(entry.summary, /at this point/)
    assert.match(entry.summary, /later than it/)
    assert.doesNotMatch(entry.summary, /ever come in/)
    assert.equal(entry.lastEvidenceAt, undefined, 'future data became current evidence')
  }
})

check('the complete Coverage line does not deny the later entries it counts', () => {
  const coverage = section(before.text, 'How well each area is understood')
  for (const entry of withLater) {
    const line = coverage.split('\n').find((candidate) => candidate.includes(entry.label))
    assert.ok(line, `${entry.label} is missing`)
    console.log(`${entry.label} coverage = ${line}`)
    assert.doesNotMatch(line, /nothing heard at all/i)
  }
})

check('Life actually reaches the mixed unheard group at the earlier clock', () => {
  const group = before.situation.coverage.domains.filter(
    (entry) => standingFor(entry).word === 'Nothing here yet',
  )
  assert.ok(
    group.some((entry) => entry.later > 0),
    'no later area reached the group',
  )
  assert.ok(
    group.some((entry) => entry.later === 0),
    'no genuinely untouched area reached the group',
  )
  console.log(`Life Nothing here yet = ${group.map((entry) => entry.label).join('; ')}`)
})

check('Life does not say later-record areas were never mentioned', () => {
  for (const entry of withLater) {
    const standing = standingFor(entry)
    console.log(`${entry.label} Life = ${standing.word} / ${standing.note}`)
    assert.doesNotMatch(standing.note, /have not mentioned/i)
  }
})

check('a genuinely untouched area keeps the truthful absolute', () => {
  assert.ok(neverHeard.length > 0)
  for (const entry of neverHeard) {
    assert.match(entry.summary, /Nothing has ever come in about/)
  }
})

check('moving beyond the fixture consumes the later count and changes the two areas', () => {
  for (const domain of ['sleep', 'home'] as const) {
    const entry = after.situation.coverage.domains.find((candidate) => candidate.domain === domain)
    assert.ok(entry)
    assert.equal(entry.later, 0)
    assert.notEqual(entry.status, 'unheard')
  }
})

check('Direction, Learning and Insights keep their moment-scoped empty language', () => {
  assert.match(section(before.text, 'Direction, goals and commitments'), /direction: none set/i)
  const learning = section(before.text, 'What has been observed to follow what')
  assert.match(learning, /does not support stating one/)
  assert.match(learning, /rather than as "there is nothing to find"/)
  assert.match(section(before.text, 'What has been worked out'), /Nothing currently rises/)
})

console.log(JSON.stringify({ passed, failed: failures, count: failures.length }, null, 2))
if (failures.length > 0) process.exitCode = 1
