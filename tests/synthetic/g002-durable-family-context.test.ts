import { describe, expect, it } from 'vitest'
import { CONCEPT } from '../../src/domain/concepts'
import { valueIfUsable } from '../../src/domain/knowledge'
import { instantAtLocal, type Instant } from '../../src/domain/time'
import { loadScenario } from './harness'

/**
 * G-002 — durable family context.
 *
 * Input: a durable full-custody context is already known. Expected: the guide
 * does not repeatedly ask whether Adaya is with the owner, and a temporary
 * exception can still override the durable context.
 *
 * The scenario carries a standing arrangement from 2025 and three evenings away
 * in June 2026. Time travel is how the test walks through them.
 */

describe('G-002 — a settled arrangement answers for itself', () => {
  const loaded = loadScenario('durable-custody')
  const zone = loaded.scenario.zone

  const evening = (dayId: string): Instant => {
    const [year, month, day] = dayId.split('-').map(Number)
    return instantAtLocal(
      { year: year ?? 0, month: month ?? 1, day: day ?? 1, hour: 19, minute: 0, second: 0 },
      zone,
    )
  }

  const presenceAt = (dayId: string) =>
    loaded.viewAt(evening(dayId)).facts.knowledgeFor(CONCEPT.childPresent)

  it('knows she is with him, without anyone asking again', () => {
    const view = loaded.view()
    const presence = view.facts.knowledgeFor(CONCEPT.childPresent)

    expect(presence.state).toBe('explicit')
    expect(valueIfUsable(presence)).toEqual({ type: 'boolean', value: true })

    const entry = view.facts.get(CONCEPT.childPresent)
    expect(entry?.worthAsking).toBe(false)
    expect(view.facts.questions.map((question) => question.concept)).not.toContain(
      CONCEPT.childPresent,
    )
  })

  it('is still not asking eighteen months later', () => {
    // Nothing new has come in. A durable context does not decay into a
    // question just because time passed (section 8).
    const future = loaded.viewAt(evening('2027-12-20'))
    const presence = future.facts.knowledgeFor(CONCEPT.childPresent)

    expect(presence.state).toBe('explicit')
    expect(valueIfUsable(presence)).toEqual({ type: 'boolean', value: true })
    expect(future.facts.get(CONCEPT.childPresent)?.worthAsking).toBe(false)
  })

  it('never asks about the arrangement itself', () => {
    for (const dayId of ['2026-06-15', '2026-06-21', '2026-06-24']) {
      const view = loaded.viewAt(evening(dayId))
      expect(view.facts.get(CONCEPT.custodyArrangement)?.worthAsking, dayId).toBe(false)
      expect(view.facts.knowledgeFor(CONCEPT.custodyArrangement).state, dayId).toBe('explicit')
    }
  })

  it('lets a temporary exception win while it lasts', () => {
    const before = presenceAt('2026-06-19')
    const during = presenceAt('2026-06-21')
    const after = presenceAt('2026-06-24')

    expect(valueIfUsable(before)).toEqual({ type: 'boolean', value: true })
    // Away with her grandmother — narrower than the standing arrangement.
    expect(during.state).toBe('explicit')
    expect(valueIfUsable(during)).toEqual({ type: 'boolean', value: false })
    // …and the arrangement is simply back once the trip ends.
    expect(valueIfUsable(after)).toEqual({ type: 'boolean', value: true })
  })

  it('does not turn the exception into a question either', () => {
    const during = loaded.viewAt(evening('2026-06-21'))
    expect(during.facts.get(CONCEPT.childPresent)?.worthAsking).toBe(false)
  })

  it('changes nothing about what was written down', () => {
    // The exception is a new record. The durable context is untouched, and the
    // whole history is the same at every moment the test looked at.
    const contexts = loaded.snapshot.records.filter((record) => record.kind === 'context')
    expect(contexts).toHaveLength(3)

    const durable = contexts.filter(
      (record) => record.kind === 'context' && record.durability === 'durable',
    )
    expect(durable).toHaveLength(2)

    for (const dayId of ['2026-06-15', '2026-06-21', '2026-06-24', '2027-12-20']) {
      const view = loaded.viewAt(evening(dayId))
      expect(view.history.all, dayId).toHaveLength(loaded.snapshot.records.length)
      expect(view.history.displaced, dayId).toEqual([])
    }
  })

  it('keeps the child’s detail on the family-sensitive side of the line', () => {
    const view = loaded.view()
    const presence = view.snapshot.records.find(
      (record) => record.kind === 'context' && record.concept === CONCEPT.childPresent,
    )
    expect(presence?.privacy).toBe('child-family-sensitive')
  })
})
