import { describe, expect, it } from 'vitest'
import { createProjection } from '../../src/features/memory/projection'

/**
 * R4-B1 — the rule that decides which work may touch the screen.
 *
 * The defect it exists to prevent, in the owner's words: he pressed **Show
 * mine**, was told nothing of his had been changed, and got an empty Timeline
 * that stayed empty until he reloaded. His records were safe in their own
 * database the whole time. What reached the screen was a snapshot of the
 * laboratory, taken by an append that had started before he pressed anything
 * and finished after the laboratory was emptied.
 *
 * These are written as **sequences** rather than as states, because the defect
 * is entirely about order. Round 4's browser regression could not hold this:
 * it failed three-for-three focused and passed three-hundred-for-three-hundred
 * in the full suite, on identical code. A test that reports the truth only
 * when the scheduler happens to cooperate is worse than no test, because it
 * reads as evidence either way. Nothing here waits for anything.
 */

describe('only the newest work may put a history on the screen', () => {
  it('lets work publish when nothing has happened since', () => {
    const projection = createProjection('owner')
    const job = projection.beginHere()
    expect(job.mayPublish()).toBe(true)
  })

  it('is the owner’s return that wins, not the append that was already running', () => {
    /*
     * The reported sequence, exactly. An append against the laboratory is in
     * flight; the owner presses Show mine; the laboratory is emptied and his
     * history shown; the append then finishes.
     */
    const projection = createProjection('laboratory')

    const derivedAppend = projection.beginHere()
    expect(derivedAppend.against).toBe('laboratory')

    const showMine = projection.begin('laboratory')
    expect(projection.show('owner', showMine)).toBe(true)

    expect(
      derivedAppend.mayPublish(),
      'the append published the store it was working against, which had just been emptied',
    ).toBe(false)
    expect(projection.source).toBe('owner')
  })

  it('keeps the owner’s history published against anything still landing', () => {
    // The delayed half of the same failure: not merely wrong for an instant,
    // but wrong until a reload, because nothing put it right afterwards.
    const projection = createProjection('laboratory')
    const stale = projection.beginHere()
    const ret = projection.begin('laboratory')
    projection.show('owner', ret)

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(stale.mayPublish(), `stale work published on attempt ${attempt + 1}`).toBe(false)
    }
    expect(projection.source).toBe('owner')
  })

  it('will not let a load the owner walked away from pull him back', () => {
    /*
     * The other direction, and the reason `show` takes the job. A scenario
     * load is slow — it replaces the store with a hundred-odd records. If the
     * owner leaves before it lands, it must not switch the screen back to the
     * laboratory he has just left.
     */
    const projection = createProjection('owner')

    const load = projection.begin('laboratory')
    const leave = projection.begin('laboratory')
    expect(projection.show('owner', leave)).toBe(true)

    expect(projection.show('laboratory', load), 'an abandoned load moved the screen').toBe(false)
    expect(projection.source).toBe('owner')
    expect(load.mayPublish()).toBe(false)
  })

  it('lets the newest work move the screen and then speak for it', () => {
    // The ordinary path still has to work: load a fixture, show it, publish it.
    const projection = createProjection('owner')
    const load = projection.begin('laboratory')
    expect(projection.show('laboratory', load)).toBe(true)
    expect(load.mayPublish()).toBe(true)
    expect(projection.source).toBe('laboratory')
  })

  it('will not let the work that moved the screen publish what it read', () => {
    /*
     * The state the source half of the check exists for, and it is reachable:
     * `clear` reads the **laboratory** — that is the store it empties — and
     * then shows the **owner**. It is still the newest work, so staleness says
     * nothing; what stops it publishing an empty laboratory snapshot is that
     * the screen no longer shows the laboratory.
     *
     * The owner's own snapshot is published through `show` returning true,
     * which is a different question and is asserted above.
     */
    const projection = createProjection('laboratory')
    const leaving = projection.begin('laboratory')

    expect(projection.show('owner', leaving)).toBe(true)
    expect(leaving.isCurrent(), 'nothing newer has been asked for').toBe(true)
    expect(
      leaving.mayPublish(),
      'the work that emptied the laboratory published the laboratory',
    ).toBe(false)
  })

  it('stops older work over the same store, not only across a switch', () => {
    /*
     * Two appends over one store, resolving out of order. The second is the
     * one the owner asked for last, so the first may not overwrite it — the
     * same rule, with no source change anywhere near it.
     */
    const projection = createProjection('owner')
    const first = projection.beginHere()
    const second = projection.beginHere()

    expect(first.mayPublish(), 'the older append was still allowed to publish').toBe(false)
    expect(second.mayPublish()).toBe(true)
  })

  it('says nothing about work that never came back', () => {
    // A job abandoned mid-flight leaves the screen alone rather than blanking
    // it: staleness withholds, it does not publish an empty result.
    const projection = createProjection('laboratory')
    const abandoned = projection.beginHere()
    const newer = projection.beginHere()

    expect(abandoned.mayPublish()).toBe(false)
    expect(newer.mayPublish()).toBe(true)
    expect(projection.source, 'a stale job changed what is on screen').toBe('laboratory')
  })
})
