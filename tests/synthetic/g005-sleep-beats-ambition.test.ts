import { describe, expect, it } from 'vitest'
import { DOMAIN } from '../../src/domain/domains'
import { isUsable } from '../../src/domain/knowledge'
import { chosenDomain, loadScenario, orphanPronounsIn, reasonOf, sentenceOf } from './harness'

/**
 * G-005 — sleep beats ambition.
 *
 * > Input: severe sleep deficit and a career goal.
 * > Expected: career does not automatically win; sleep/recovery can be the
 * > recommendation.
 *
 * The trap in this scenario is that it is trivially passable. An engine with
 * `if (tired) return sleep` written into it would satisfy every word above,
 * and would be exactly the hardcode the plan spends section 60 warning about.
 *
 * So the unit under test here is the **pair**. Two scenarios are built from one
 * function and differ in nothing but three nights of sleep and one energy
 * reading. Both carry the same live career goal, the same topic that went badly
 * yesterday, and — deliberately — a weekly direction that says career. If the
 * engine gets both of them right, the sleep numbers are the thing doing the
 * work, and nothing else could be.
 */

const tired = loadScenario('running-on-empty')
const rested = loadScenario('rested-and-behind')

describe('G-005 — the pair is the test', () => {
  it('differs in nothing but sleep and energy', () => {
    // If this ever fails, the two scenarios have drifted apart and every
    // conclusion below becomes a comparison of two different lives.
    const shapeOf = (records: readonly { kind: string; concept?: string }[]) =>
      records
        .map((record) => `${record.kind}:${record.concept ?? ''}`)
        .sort()
        .join('|')

    const tiredShape = shapeOf(tired.snapshot.records as never)
    const restedShape = shapeOf(rested.snapshot.records as never)
    expect(tiredShape).toBe(restedShape)

    const tiredHours = numbersFor(tired.snapshot.records, 'sleep.hours-last-night')
    const restedHours = numbersFor(rested.snapshot.records, 'sleep.hours-last-night')
    expect(tiredHours).toEqual([4.5, 4.25, 5])
    expect(restedHours).toEqual([7.5, 7.75, 8])
  })

  it('both weeks are pointed at career, on purpose', () => {
    for (const loaded of [tired, rested]) {
      const direction = loaded.decision().trace.direction
      expect(direction.category, loaded.scenario.id).toBe(DOMAIN.career)
    }
  })
})

describe('G-005 — three broken nights', () => {
  const decision = tired.decision()

  it('reads recovery as what is actually in the way', () => {
    expect(decision.situation.limiter?.kind).toBe('recovery')
    const strain = decision.situation.capacity.strain
    expect(isUsable(strain) && strain.value).toBe('severe')
  })

  it('does not let the career goal win', () => {
    expect(decision.kind).toBe('move')
    expect(chosenDomain(decision)).toBe(DOMAIN.sleep)
    expect(chosenDomain(decision)).not.toBe(DOMAIN.career)
  })

  it('names the thing it is asking to put down', () => {
    // Section 4.6 — a specific ordinary sentence beats an elegant generic one.
    // "Take tonight as recovery" says nothing about this owner's evening.
    const sentence = sentenceOf(decision) ?? ''
    expect(sentence).toContain('subnetting')
    expect(orphanPronounsIn(sentence)).toEqual([])
  })

  it('says how far down, in hours, rather than that rest matters', () => {
    const reason = reasonOf(decision) ?? ''
    expect(reason).toMatch(/\d/)
    expect(reason.toLowerCase()).toContain('down')
    expect(orphanPronounsIn(reason)).toEqual([])
  })

  it('shows what it chose against', () => {
    // Section 6 asks Now to be able to show the relevant tradeoff. There is a
    // real one here: the career move it declined is still a good move.
    expect(decision.explanation?.instead ?? '').toContain('subnetting')
  })

  it('rules out the heavy career moves and records why', () => {
    const reasons = decision.trace.rejected.map((row) => `${row.candidate}:${row.reason}`)
    expect(reasons).toContain('career/review-weak-topic/learning-topic:subnetting:too-strained')
    expect(reasons).toContain('career/hands-on-lab/learning-topic:subnetting:too-strained')
    for (const rejection of decision.trace.rejected) {
      expect(rejection.explanation.length, rejection.candidate).toBeGreaterThan(0)
    }
  })
})

describe('G-005 — the same week, properly slept', () => {
  const decision = rested.decision()

  it('finds nothing in the way', () => {
    expect(decision.situation.limiter).toBeUndefined()
  })

  it('lets the career move win after all', () => {
    expect(decision.kind).toBe('move')
    expect(chosenDomain(decision)).toBe(DOMAIN.career)
  })

  it('proposes no recovery move at all, rather than ranking one low', () => {
    // Nothing suggests rest, so nothing about rest is proposed. A candidate
    // that exists and loses is a different claim from one that never applied.
    const sleepMoves = decision.trace.proposed.filter((row) => row.domain === DOMAIN.sleep)
    expect(sleepMoves).toEqual([])
  })

  it('reaches a different sentence and a different reason from the tired week', () => {
    expect(sentenceOf(decision)).not.toBe(sentenceOf(tired.decision()))
    expect(reasonOf(decision)).not.toBe(reasonOf(tired.decision()))
  })
})

function numbersFor(records: readonly unknown[], concept: string): readonly number[] {
  const out: number[] = []
  for (const record of records) {
    const row = record as { concept?: string; value?: { type?: string; value?: number } }
    if (row.concept !== concept) continue
    if (row.value?.type === 'number' && typeof row.value.value === 'number')
      out.push(row.value.value)
  }
  return out
}
