/** Independent Round 10 evidence. Synthetic input only; never writes a store. */
import assert from 'node:assert/strict'
import { instant, type Instant } from '../../../src/domain/time'
import { composeExport } from '../../../src/features/export/compose'
import { DEFAULT_SELECTION } from '../../../src/features/export/sections'
import { standingFor } from '../../../src/features/life/standing'
import { assembleTimeline } from '../../../src/features/timeline/timelineEntries'
import { decide } from '../../../src/intelligence/engine'
import { insightsFor } from '../../../src/intelligence/insights'
import { assembleSituation } from '../../../src/intelligence/situation'
import { snapshotFromWire, type SnapshotWire } from '../../../src/memory/snapshot'
import { buildView } from '../../../src/memory/view'
import { scenarioById, SCENARIOS } from '../../../src/synthetic/scenarios'

const DAY = 86_400_000
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

function fixture(id: string) {
  const found = scenarioById(id)
  assert.ok(found, `missing fixture ${id}`)
  return found
}

function parse(wire: SnapshotWire) {
  const loaded = snapshotFromWire(wire)
  assert.ok(loaded.loaded, 'constructed history should load')
  return loaded.snapshot
}

function at(wire: SnapshotWire, now: Instant, zone: ReturnType<typeof fixture>['zone']) {
  const snapshot = parse(wire)
  const before = JSON.stringify(snapshot)
  const moment = { now, zone, weekStartsOn: 1 as const }
  const view = buildView(snapshot, moment)
  const situation = assembleSituation(view, moment)
  const decision = decide(view, moment)
  const text = composeExport({
    sections: DEFAULT_SELECTION,
    situation,
    decision,
    insights: insightsFor(situation),
    timeline: assembleTimeline(situation),
    source: 'laboratory',
    app: {
      commitShort: '9bda989',
      commitSha: '9bda98957a4d7f740c52a40b36a29fde6de636e9',
      target: 'preview',
      buildTime: '2026-08-26T23:22:12.084Z',
      phaseNumber: 8,
      phaseTitle: 'Legacy migration',
      phaseSummary: 'Independent synthetic Round 10 evidence',
    },
    composedAt: { at: instant(Date.parse('2026-08-27T00:00:00Z')), zone },
  }).text
  assert.equal(JSON.stringify(snapshot), before, 'composition mutated its source snapshot')
  return { decision, situation, text }
}

function section(text: string, heading: string): string {
  const start = text.indexOf(`## ${heading}`)
  assert.notEqual(start, -1, `missing ${heading}`)
  const rest = text.slice(start)
  const end = rest.indexOf('\n## ', 1)
  return end === -1 ? rest : rest.slice(0, end)
}

const damaged = fixture('malformed-history')
const damagedWire = damaged.build()
const damagedEarlier = at(damagedWire, instant(damaged.now - 7 * DAY), damaged.zone)
const damagedNormal = at(damagedWire, damaged.now, damaged.zone)
const damagedLater = at(damagedWire, instant(damaged.now + 7 * DAY), damaged.zone)

check('the complete repaired Coverage bullets agree at the earlier clock', () => {
  const body = section(damagedEarlier.text, 'How well each area is understood')
  for (const entry of damagedEarlier.situation.coverage.domains.filter((row) => row.later > 0)) {
    const line = body.split('\n').find((row) => row.includes(entry.label))
    assert.ok(line, `${entry.label} is absent`)
    assert.match(line, /nothing heard yet/i)
    assert.match(line, /later than it/i)
    assert.doesNotMatch(line, /nothing heard at all|ever come in/i)
  }
})

check('Life keeps later-only and never-record areas honest without making either current', () => {
  const areas = damagedEarlier.situation.coverage.domains
  const later = areas.filter((entry) => entry.later > 0)
  const never = areas.filter((entry) => entry.status === 'unheard' && entry.later === 0)
  assert.ok(later.length > 0)
  assert.ok(never.length > 0)
  for (const entry of later) {
    const standing = standingFor(entry)
    assert.equal(standing.word, 'Nothing here yet')
    assert.match(standing.detail?.(entry) ?? '', /later than the moment on screen/i)
    assert.doesNotMatch(standing.note, /never|have not mentioned/i)
  }
  for (const entry of never) {
    assert.equal(standingFor(entry).detail, undefined)
    assert.match(entry.summary, /ever come in/i)
  }
})

check('moving through the damaged history consumes only the records whose time has arrived', () => {
  for (const domain of ['sleep', 'home'] as const) {
    const earlier = damagedEarlier.situation.coverage.get(domain)
    const normal = damagedNormal.situation.coverage.get(domain)
    const later = damagedLater.situation.coverage.get(domain)
    assert.ok(earlier && normal && later)
    assert.ok(earlier.later > 0)
    assert.equal(normal.later, 0)
    assert.equal(later.later, 0)
    assert.equal(earlier.status, 'unheard')
    assert.notEqual(normal.status, 'unheard')
    assert.notEqual(later.status, 'unheard')
  }
})

check('a partly later area is heard and does not use the all-later copy', () => {
  const sleepRows = (damagedWire.records as readonly unknown[]).filter((row) => {
    if (row === null || typeof row !== 'object') return false
    return (row as { concept?: string }).concept?.startsWith('sleep.') === true
  })
  assert.ok(sleepRows.length >= 2, 'fixture needs at least two sleep rows')
  const before = {
    ...(sleepRows[0] as Record<string, unknown>),
    occurredAt: '2026-03-31T12:00:00Z',
    recordedAt: '2026-03-31T12:00:00Z',
  }
  const after = {
    ...(sleepRows[1] as Record<string, unknown>),
    occurredAt: '2026-04-03T12:00:00Z',
    recordedAt: '2026-04-03T12:00:00Z',
  }
  const mixedWire: SnapshotWire = { ...damagedWire, entities: [], records: [before, after] }
  const mixed = at(mixedWire, instant(Date.parse('2026-04-01T19:00:00Z')), damaged.zone)
  const sleep = mixed.situation.coverage.get('sleep')
  assert.ok(sleep)
  assert.equal(sleep.later, 1)
  assert.notEqual(sleep.status, 'unheard')
  assert.doesNotMatch(sleep.summary, /later than it|ever come in/i)
  const line = section(mixed.text, 'How well each area is understood')
    .split('\n')
    .find((row) => row.includes('Sleep & Recovery'))
  assert.ok(line)
  assert.match(line, /last heard/i)
  assert.doesNotMatch(line, /nothing heard|later than it|ever come in/i)
})

const routeEscapes: string[] = []
for (const scenario of SCENARIOS) {
  const wire = scenario.build()
  for (const days of [0, 7, 14, 21, 30, 60, 90]) {
    const now = instant(scenario.now + days * DAY)
    const run = at(wire, now, scenario.zone)
    const target = run.situation.coverage.mostNeglected
    if (target?.refresh !== 'an-action') continue
    const reaches = run.decision.trace.proposed.some(
      (move) => move.generator === 'coverage' && move.domain === target.domain,
    )
    if (!reaches) {
      const sameDomain = run.decision.trace.proposed
        .filter((move) => move.domain === target.domain)
        .map((move) => `${move.generator}/${move.verb}`)
      routeEscapes.push(
        `${scenario.id} +${days}d / ${target.domain}; same-domain proposals ${JSON.stringify(sameDomain)}`,
      )
    }
  }
}

check('an-action refresh routes have a move that can actually reach the arbiter', () => {
  console.log(`an-action routes without a coverage move: ${JSON.stringify(routeEscapes)}`)
  assert.deepEqual(routeEscapes, [])
})

check('current, quiet and stale Life copy stays within what each coarse status proves', () => {
  const seen = new Set<string>()
  for (const scenario of SCENARIOS) {
    for (const days of [0, 7, 14, 21, 30, 60, 90]) {
      const run = at(scenario.build(), instant(scenario.now + days * DAY), scenario.zone)
      for (const coverage of run.situation.coverage.domains) {
        if (coverage.status === 'unheard') continue
        const standing = standingFor(coverage)
        seen.add(`${coverage.status}/${coverage.refresh}`)
        const whole = `${standing.word}. ${standing.note} ${standing.detail?.(coverage) ?? ''}`
        if (coverage.status === 'current') {
          assert.ok(
            coverage.daysSinceHeard !== undefined,
            `${scenario.id} +${days}d ${coverage.domain}: current without anything heard`,
          )
          assert.doesNotMatch(whole, /up to date|nothing .*out of date/i)
        }
        if (coverage.status === 'quiet') {
          assert.doesNotMatch(
            whole,
            /\bnever\b|\balways\b|\ball\b/i,
            `${scenario.id} +${days}d ${coverage.domain}: ${whole}`,
          )
        }
        if (coverage.status === 'stale') {
          assert.ok(
            standing.detail?.(coverage),
            `${scenario.id} +${days}d ${coverage.domain}: stale without its reason`,
          )
        }
      }
    }
  }
  console.log(`coarse states reached: ${JSON.stringify([...seen].sort())}`)
  assert.ok(
    [...seen].some((entry) => entry.startsWith('current/')),
    'current was not reached',
  )
  assert.ok(
    [...seen].some((entry) => entry.startsWith('quiet/')),
    'quiet was not reached',
  )
  assert.ok(
    [...seen].some((entry) => entry.startsWith('stale/')),
    'stale was not reached',
  )
})

console.log(JSON.stringify({ passed, failed: failures, count: failures.length }, null, 2))
if (failures.length > 0) process.exitCode = 1
