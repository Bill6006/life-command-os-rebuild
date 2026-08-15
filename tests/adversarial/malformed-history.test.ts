import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { valueIfUsable } from '../../src/domain/knowledge'
import { snapshotFromWire } from '../../src/memory/snapshot'
import { buildView } from '../../src/memory/view'
import { scenarioById } from '../../src/synthetic/scenarios'

/**
 * A damaged file, loaded end to end.
 *
 * Section 36: one unreadable record cannot blank the shell. Section 26: a
 * corrupt row must never create a phantom actionable item. This walks a
 * document with five broken record rows and one broken entity through the same
 * path a pasted file takes, and checks that everything downstream still works.
 */

function load() {
  const scenario = scenarioById('malformed-history')
  if (scenario === undefined) throw new Error('missing scenario')
  const loaded = snapshotFromWire(scenario.build())
  return {
    scenario,
    loaded,
    view: buildView(loaded.snapshot, { now: scenario.now, zone: scenario.zone }),
  }
}

describe('a history with damage in it', () => {
  it('loads rather than refusing the file', () => {
    const { loaded } = load()
    expect(loaded.loaded).toBe(true)
  })

  it('keeps every readable record', () => {
    const { loaded } = load()
    expect(loaded.snapshot.records).toHaveLength(5)
    expect(loaded.snapshot.entities).toHaveLength(0)
  })

  it('reports every unreadable one, with a reason and the row itself', () => {
    const { loaded } = load()
    // Five broken record rows and one broken entity.
    expect(loaded.snapshot.malformed).toHaveLength(6)

    for (const row of loaded.snapshot.malformed) {
      expect(row.issues.length).toBeGreaterThan(0)
      expect(row.raw).toBeDefined()
      for (const issue of row.issues) {
        expect(issue.path).not.toBe('')
        expect(issue.problem).not.toBe('')
      }
    }
  })

  it('still answers the questions the good rows can answer', () => {
    const { view } = load()
    const sleep = view.facts.knowledgeFor(CONCEPT.sleepHours)
    expect(sleep.state).toBe('explicit')
    expect(valueIfUsable(sleep)).toEqual({ type: 'number', value: 7, unit: 'hours' })
  })

  it('builds every projection without one of them going blank', () => {
    const { view, loaded } = load()

    expect(view.summary.total).toBe(loaded.snapshot.records.length)
    expect(view.summary.malformed).toBe(loaded.snapshot.malformed.length)
    expect(view.summary.byLocalDay.size).toBeGreaterThan(0)
    expect(view.facts.entries.length).toBeGreaterThan(0)
    expect(view.relationships.nodes).toEqual([])
    expect(view.relationships.edges).toEqual([])
  })

  it('creates no phantom actions from a corrupt row', () => {
    const { view } = load()
    const actionable = view.history.effective.filter((record) => record.kind.startsWith('action-'))
    expect(actionable).toEqual([])
  })

  it('can say which concept a broken row was about, when the row says so', () => {
    const { view, loaded } = load()

    // One of the broken rows names a concept but is missing everything else.
    const named = loaded.snapshot.malformed.filter(
      (row) =>
        typeof row.raw === 'object' &&
        row.raw !== null &&
        (row.raw as { concept?: unknown }).concept === CONCEPT.sleepHours,
    )
    expect(named.length).toBeGreaterThan(0)

    // …and it does not become an answer. The good rows still decide.
    expect(view.facts.knowledgeFor(CONCEPT.sleepHours).state).toBe('explicit')
  })

  it('marks a concept unknown-because-malformed when nothing readable mentions it', () => {
    const scenario = scenarioById('malformed-history')
    if (scenario === undefined) throw new Error('missing scenario')

    const document = scenario.build()
    const onlyBroken = {
      ...document,
      records: [{ kind: 'observation', concept: CONCEPT.emotionalState }],
    }

    const loaded = snapshotFromWire(onlyBroken)
    const view = buildView(loaded.snapshot, { now: scenario.now, zone: scenario.zone })

    const knowledge = view.facts.knowledgeFor(CONCEPT.emotionalState)
    expect(knowledge.state).toBe('unknown')
    if (knowledge.state === 'unknown') expect(knowledge.reason).toBe('malformed')
  })

  it('survives damage scattered through a long history', () => {
    const scenario = scenarioById('quiet-fortnight')
    if (scenario === undefined) throw new Error('missing scenario')

    const document = scenario.build()
    const damaged = {
      ...document,
      records: document.records.flatMap((row, index) =>
        index % 4 === 0 ? [row, { corrupted: index }] : [row],
      ),
    }

    const loaded = snapshotFromWire(damaged)
    const view = buildView(loaded.snapshot, { now: scenario.now, zone: scenario.zone })

    expect(loaded.snapshot.records).toHaveLength(document.records.length)
    expect(loaded.snapshot.malformed.length).toBeGreaterThan(3)
    expect(view.summary.total).toBe(document.records.length)
    expect(view.facts.knowledgeFor(CONCEPT.sleepHours).state).not.toBe('unknown')
  })
})
