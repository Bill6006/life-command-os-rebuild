import { describe, expect, it } from 'vitest'
import { isUsable } from '../../src/domain/knowledge'
import type { Instant, TimeZoneId } from '../../src/domain/time'
import { WORTH_DOING } from '../../src/intelligence/arbitrate'
import type { SnapshotWire } from '../../src/memory/snapshot'
import { decideOn, loadScenario, orphanPronounsIn } from './harness'

/**
 * G-014 — no action is valid.
 *
 * > Input: current state is stable and no move has positive net value.
 * > Expected: the system can say nothing additional is needed.
 *
 * The trap in this one is passing it by accident. An engine that knows nothing
 * says nothing, and a test that only checks the words on screen cannot tell
 * that apart from an engine that considered the options and declined them. So
 * the assertions below are mostly about the *shape* of the silence: something
 * was proposed, it survived the filter, it was scored, and the score was the
 * reason.
 */

describe('G-014 — the system can say nothing is needed', () => {
  const loaded = loadScenario('settled-evening')
  const decision = loaded.decision()

  it('says so', () => {
    expect(decision.kind).toBe('no-action')
    expect(decision.noAction?.reason).toBe('nothing-worth-doing')
    expect(decision.noAction?.headline).toBe('Nothing needs to move tonight.')
  })

  it('reached it by considering something, not by having nothing', () => {
    // The difference between a rest state and a broken one, and the whole
    // reason this scenario carries a full picture rather than an empty history.
    expect(decision.trace.proposed.length).toBeGreaterThan(0)
    expect(decision.trace.ranking.length).toBeGreaterThan(0)
    expect(decision.trace.rejected).toEqual([])
  })

  it('scored what it considered, and the score is why', () => {
    const best = decision.trace.ranking[0]
    expect(best).toBeDefined()
    expect(best!.score).toBeLessThanOrEqual(WORTH_DOING)
    expect(decision.trace.notes.join(' ')).toContain('not worth asking for')
  })

  it('is not short of information', () => {
    // Stable, not silent. Sleep, energy, soreness and the time left are all
    // known, so "nothing needs to move" is a finding rather than a shrug.
    const capacity = decision.situation.capacity
    expect(isUsable(capacity.strain)).toBe(true)
    expect(isUsable(capacity.energy)).toBe(true)
    expect(isUsable(capacity.soreness)).toBe(true)
    expect(isUsable(decision.situation.usableMinutes)).toBe(true)
  })

  it('reads as a real answer rather than a failure', () => {
    // Section 36 — a degraded state must not look like a confident empty state,
    // and the converse: a real rest night must not read like a broken one.
    const detail = decision.noAction?.detail ?? ''
    expect(detail).toBe(
      'Nothing on the list is worth the evening it would cost. That is a real answer.',
    )
    expect(detail).not.toMatch(/error|missing|unknown|not enough/i)
    expect(orphanPronounsIn(decision.noAction?.headline ?? '')).toEqual([])
  })

  it('asks nothing, because nothing would change it', () => {
    // Section 12's requirement that a guide can ask zero questions, met by the
    // one case where it is most obviously right.
    expect(decision.trace.wouldChange.filter((swing) => swing.changesTheAnswer)).toEqual([])
  })
})

describe('G-014 — and it is the situation saying it, not the engine', () => {
  /*
   * The counterexample, and it is the same discipline G-005's pair uses: a
   * scenario where nothing is worth doing proves nothing on its own, because
   * "never suggest anything" would pass it too.
   *
   * Everything is held still except the evening's length. Fifteen minutes and
   * two walks that did nothing is a stable state; an hour changes the
   * arithmetic, and the same history has something to say again.
   */
  it('finds something to do when the evening is longer', () => {
    const loaded = loadScenario('settled-evening')
    const document = loaded.scenario.build()

    const stretched = {
      ...document,
      records: document.records.map((row) => {
        const record = row as Record<string, unknown>
        const value = record['value'] as Record<string, unknown> | undefined
        if (value?.['type'] !== 'duration') return row
        return { ...record, value: { type: 'duration', minutes: 90 } }
      }),
    }

    const withRoom = loadScenarioFrom(stretched, loaded.scenario.now, loaded.scenario.zone)
    expect(withRoom.kind).toBe('move')
  })
})

function loadScenarioFrom(document: SnapshotWire, now: Instant, zone: TimeZoneId) {
  return decideOn(document, now, zone)
}
